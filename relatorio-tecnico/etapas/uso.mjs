import fsp from 'node:fs/promises'
import path from 'node:path'
import { CONFIG } from '../config.mjs'
import { estadoDeUso, falhou, naoTestavel, verificado } from '../dominio/estados.mjs'
import { rodarAgente } from '../ferramentas/claude.mjs'
import { subir } from '../ferramentas/docker.mjs'
import { configMcpNavegador, impressaoDigital } from '../ferramentas/navegador.mjs'
import { agente, exige, tolera, MINUTO } from '../nucleo/etapa.mjs'
import { fluxoDe, item, promessasDe, soDePromessasConhecidas } from './agentes/conferidas.mjs'
import { emLinhas, montarPrompt } from './agentes/prompt.mjs'
import { provedorNaLinha } from './conteudo/bibliotecas-ia.mjs'

const TIPOS = ['passo_uso', 'entrada_inesperada', 'promessa_no_uso', 'bloqueio']

/**
 * @typedef {{alvo: 'deploy', url: string}
 *   | {alvo: 'local'}
 *   | {alvo: null, motivo: string}} Alvo
 */

/**
 * O deploy tem preferência: é o que a equipe publicou.
 * @param {{responde?: boolean, url?: string|null}|null} deploy
 * @param {{subiu?: boolean, imagem?: string|null, pulada?: string}|null} build
 * @returns {Alvo}
 */
export function escolherAlvo(deploy, build) {
  if (deploy?.responde && deploy.url) return { alvo: 'deploy', url: deploy.url }
  if (build?.subiu && build.imagem) return { alvo: 'local' }

  const doDeploy = deploy?.url ? 'o deploy informado não respondeu' : 'nenhum deploy informado'
  const doBuild = !build ? 'a etapa de build não terminou' : build.pulada ? `o build não rodou (${build.pulada})` : 'o projeto não subiu em container'
  return { alvo: null, motivo: `${doDeploy}; ${doBuild}` }
}

const comandoDeSubir = (build) => build.comando_subir ?? build.receita?.subir ?? null

/**
 * A pasta de capturas como o servidor do navegador a enxerga. O servidor resolve
 * nome de arquivo relativo contra o diretório de quem o chamou, que não existe
 * dentro do container; por isso o agent recebe o caminho completo.
 * @param {{mcpServers: {navegador: {args: string[]}}}} mcp
 */
export function pastaDeCapturasNoNavegador(mcp) {
  const args = mcp.mcpServers?.navegador?.args ?? []
  const posicao = args.indexOf('--output-dir')
  if (posicao < 0 || !args[posicao + 1]) throw new Error('configMcpNavegador não informa --output-dir; o testador não sabe onde gravar capturas')
  return args[posicao + 1]
}

/**
 * Os comandos que o build usou, na ordem, para o jurado subir o projeto como o harness subiu.
 * @returns {string|null}
 */
function comandosParaSubir(build) {
  const receita = build?.receita
  const comandos = [...(receita?.instalar ?? []), ...(receita?.compilar ?? []), comandoDeSubir(build ?? {})].filter(Boolean)
  if (comandos.length === 0) return null
  const pasta = receita?.pasta && receita.pasta !== '.' ? `cd ${receita.pasta} && ` : ''
  return pasta + comandos.join(' && ')
}

/** @param {string[]} conexoes nomes de host que o container do projeto resolveu */
const provedoresDeIa = (conexoes) => [...new Set(conexoes.map((nome) => provedorNaLinha(nome, '')).filter(Boolean))].sort()

function estadoDoFluxo(conferido) {
  if (conferido.fatos.alvo === null) return naoTestavel(String(conferido.fatos.motivo))
  const passos = conferido.doTipo('passo_uso').map((passo) => passo.dados).sort((a, b) => a.n - b.n)
  if (passos.length === 0) return naoTestavel('o testador não registrou passos')

  const quebrado = passos.find((passo) => passo.resultado === 'falhou')
  if (quebrado) return falhou(quebrado.erro || `o passo ${quebrado.n} falhou`)

  const concluidos = passos.filter((passo) => passo.resultado === 'funcionou').length
  if (concluidos === passos.length) return verificado()
  if (concluidos === 0) return naoTestavel(passos[0].motivo || 'motivo não informado')
  return verificado({ ate: concluidos, de: passos.length })
}

function impressoesDiferem(fatos) {
  const antes = fatos.impressao_do_deploy
  const depois = fatos.impressao_no_teste
  return Boolean(antes?.hash && depois?.hash && antes.hash !== depois.hash)
}

export default agente({
  id: 'uso',
  titulo: 'Teste de uso',
  coluna: 'uso',
  fila: ({ dep }) => (escolherAlvo(dep('deploy').saida, dep('build').saida).alvo === 'local' ? ['containers', 'agentes'] : ['agentes']),
  versao: 2,
  depende: {
    'promessas.conferido': exige((conferido) => ({ promessas: promessasDe(conferido), fluxo: fluxoDe(conferido) })),
    // Só o hash entra na chave: o horário da medição muda a cada rodada e refaria o teste sem o deploy ter mudado.
    deploy: tolera((deploy) => (deploy ? { responde: deploy.responde, url: deploy.url, impressao: deploy.impressao?.hash ?? null } : null)),
    build: tolera((build) => (build ? { imagem: build.imagem, subiu: build.subiu, comando_subir: comandoDeSubir(build), env: build.env } : null)),
  },
  entradas: (equipe) => ({ descricao: equipe.descricao, acoes: CONFIG.acoesDoTestador }),
  teto: { total: 12 * MINUTO },
  resumo: ['fluxo'],

  recurso: {
    async abrir(ctx) {
      const build = ctx.dep('build').saida
      const alvo = escolherAlvo(ctx.dep('deploy').saida, build)
      if (alvo.alvo !== 'local') return alvo

      const instancia = await subir({
        imagem: build.imagem,
        id: ctx.equipe.id,
        comando: comandoDeSubir(build),
        env: build.env ?? {},
        pulso: ctx.pulso,
        sinal: ctx.sinal,
      })
      if (!instancia.url) return { alvo: null, motivo: 'o projeto subiu em container e nenhuma porta respondeu', instancia }
      return { alvo: 'local', url: instancia.url, instancia }
    },
    async fechar(recurso) {
      await recurso?.instancia?.parar()
    },
  },

  async executar(ctx) {
    const { alvo, url, motivo, instancia } = ctx.recurso
    if (alvo === null) return { afirmacoes: [], fatos: { alvo: null, motivo } }

    const conferido = ctx.dep('promessas.conferido').saida
    const promessas = promessasDe(conferido).filter((promessa) => promessa.classe === 'funcionalidade')
    const fluxo = fluxoDe(conferido)

    await fsp.mkdir(ctx.pastas.capturas, { recursive: true })
    const mcp = configMcpNavegador({ capturas: ctx.pastas.capturas, ...(instancia ? { rede: instancia.rede } : {}) })
    const prompt = montarPrompt('uso', TIPOS, {
      url,
      pasta_capturas: pastaDeCapturasNoNavegador(mcp),
      fluxo: fluxo
        ? emLinhas([fluxo.descricao ?? '', ...fluxo.passos.map((passo, indice) => `${indice + 1}. ${passo}`)].filter(Boolean), 'A equipe não descreve o fluxo de uso.')
        : 'A equipe não descreve o fluxo de uso.',
      promessas: emLinhas(promessas.map((promessa) => `${promessa.id} ${promessa.citacao}`), 'Nenhuma promessa de funcionalidade foi extraída.'),
      descricao: ctx.equipe.descricao ?? 'A equipe não enviou descrição.',
      acoes: CONFIG.acoesDoTestador,
    })
    const brutas = await rodarAgente({
      prompt,
      tipos: TIPOS,
      ferramentas: [],
      cwd: ctx.pastas.capturas,
      mcp,
      modelo: CONFIG.modelos.uso,
      orcamentoUsd: CONFIG.orcamentoUsd.uso,
      sinal: ctx.sinal,
      pulso: ctx.pulso,
    })

    const filtradas = soDePromessasConhecidas(brutas, 'promessa_no_uso', promessas.map((promessa) => promessa.id))
    // O agent cita a captura pelo nome que deu ao arquivo; o conferidor abre caminhos relativos à pasta da equipe.
    const afirmacoes = filtradas.afirmacoes.map((afirmacao) => ({
      ...afirmacao,
      citacoes: afirmacao.citacoes.map((citacao) =>
        citacao.tipo === 'captura'
          ? { ...citacao, caminho: ctx.relativo(path.join(ctx.pastas.capturas, path.basename(citacao.caminho))) }
          : citacao),
    }))

    const fatos = {
      alvo,
      url,
      promessas_no_uso_de_promessa_desconhecida: filtradas.de_promessa_desconhecida,
      promessas_no_uso_repetidas: filtradas.repetidas,
    }
    if (alvo === 'deploy') {
      fatos.impressao_do_deploy = ctx.dep('deploy').saida?.impressao ?? null
      fatos.impressao_no_teste = await impressaoDigital(url, { sinal: ctx.sinal }).catch((erro) => {
        ctx.pulso(`impressão digital no momento do teste falhou: ${erro.message}`)
        return null
      })
    } else {
      fatos.provedores_ia = provedoresDeIa(await instancia.conexoes())
      fatos.como_subir = comandosParaSubir(ctx.dep('build').saida)
    }
    return { afirmacoes, fatos }
  },

  relatar(conferido) {
    const passos = conferido.doTipo('passo_uso').toSorted((a, b) => a.dados.n - b.dados.n)
    const provedores = /** @type {string[]} */ (conferido.fatos.provedores_ia ?? [])
    const estadoDoPasso = (dados) => estadoDeUso(dados.resultado, { erro: dados.erro, motivo: dados.motivo })

    return {
      resumo: { fluxo: estadoDoFluxo(conferido) },

      uso: [
        ...passos.map(({ dados, evidencias }) => ({
          tipo: 'passo',
          id: `uso:passo-${dados.n}`,
          n: dados.n,
          acao: dados.acao,
          observado: dados.observado ?? null,
          estado: estadoDoPasso(dados),
          evidencias,
        })),
        ...conferido.doTipo('entrada_inesperada').map(({ id, dados, evidencias }) =>
          item(`uso:${id}`, `Entrada inesperada: ${dados.entrada}`, estadoDeUso(dados.resultado, { erro: dados.observado, motivo: dados.observado }), {
            obs: dados.observado ?? null,
            evidencias,
          })),
        ...conferido.doTipo('bloqueio').map(({ id, dados, evidencias }) =>
          item(`uso:${id}`, dados.item, naoTestavel(dados.motivo || 'bloqueio externo'), { evidencias })),
      ],

      roteiro: [
        ...(conferido.fatos.alvo === 'local' && conferido.fatos.como_subir && passos.some(({ dados }) => dados.resultado === 'funcionou')
          ? [{
              tipo: 'passo',
              id: 'uso:roteiro-0',
              n: 0,
              acao: `No repositório, suba o projeto: ${conferido.fatos.como_subir}`,
              esperado: `O projeto responde em ${conferido.fatos.url}`,
              evidencias: [],
            }]
          : []),
        ...passos
          .filter(({ dados }) => dados.resultado === 'funcionou')
          .map(({ dados, evidencias }) => ({
            tipo: 'passo',
            id: `uso:roteiro-${dados.n}`,
            n: dados.n,
            acao: dados.acao,
            esperado: dados.observado ?? null,
            evidencias,
          })),
      ],

      declaracoes: conferido.doTipo('promessa_no_uso').map(({ dados }) => ({
        tipo: 'declaracao',
        id: dados.promessa,
        no_uso: estadoDoPasso(dados),
      })),

      ia: provedores.length > 0
        ? [item('uso:provedores-no-teste', 'Provedores de IA contatados pelo projeto durante o teste', verificado(), { valor: { lista: provedores } })]
        : [],

      linha_do_tempo: impressoesDiferem(conferido.fatos)
        ? [item('uso:deploy-alterado', 'Deploy alterado entre a primeira medição e o teste de uso', verificado(), {
            valor: {
              tabela: {
                colunas: ['medição', 'horário', 'recursos', 'hash'],
                linhas: [
                  ['primeira', conferido.fatos.impressao_do_deploy.em, conferido.fatos.impressao_do_deploy.recursos, conferido.fatos.impressao_do_deploy.hash],
                  ['no teste', conferido.fatos.impressao_no_teste.em, conferido.fatos.impressao_no_teste.recursos, conferido.fatos.impressao_no_teste.hash],
                ],
              },
            },
            sinal: true,
          })]
        : [],
    }
  },
})
