import { evidenciaDeArquivo } from '../dominio/evidencia.mjs'
import { verificado } from '../dominio/estados.mjs'
import { etapa, exige, MINUTO } from '../nucleo/etapa.mjs'
import { aparar, ehCodigo, linguagemDe, percorrer, profundidade } from './conteudo/arquivos.mjs'
import { provedorDaBiblioteca, provedorNaLinha } from './conteudo/bibliotecas-ia.mjs'
import { chavesDeEnv } from './conteudo/padroes-segredos.mjs'

const MAXIMO_DE_CHAMADAS = 200
const CHAMADAS_NO_RELATORIO = 15
const PROFUNDIDADE_DE_MANIFESTO = 3

const NOME_DE_REQUISITO = /^[A-Za-z0-9][A-Za-z0-9._-]*/

const SECAO_SO_DE_LISTAS = /^(project\.optional-dependencies|dependency-groups)$/

function nomesEmSecoesToml(linhas, secaoDeTabela, comListas) {
  const nomes = []
  let secao = ''
  let emLista = false
  for (const linha of linhas) {
    const cabecalho = linha.match(/^\s*\[+([^\]]+)\]+/)
    if (cabecalho) {
      secao = cabecalho[1].trim()
      emLista = false
      const tabelaDeUm = secao.match(/^(?:.*\.)?(?:dev-|build-)?dependencies\.([\w.-]+)$/)
      if (tabelaDeUm && secaoDeTabela.test(secao.slice(0, -tabelaDeUm[1].length - 1))) nomes.push(tabelaDeUm[1])
      continue
    }
    const chave = linha.match(/^\s*([\w.-]+)\s*=/)?.[1]
    if (secaoDeTabela.test(secao) && chave) nomes.push(chave)
    if (!comListas) continue
    if (/^\s*[\w.-]+\s*=\s*\[/.test(linha)) emLista = SECAO_SO_DE_LISTAS.test(secao) || (secao === 'project' && /^\s*dependencies\s*=/.test(linha))
    if (emLista) {
      for (const [, requisito] of linha.matchAll(/["']([^"']+)["']/g)) {
        const nome = requisito.match(NOME_DE_REQUISITO)?.[0]
        if (nome) nomes.push(nome)
      }
      if (linha.includes(']')) emLista = false
    }
  }
  return nomes
}

const LEITORES_DE_MANIFESTO = [
  [/^package\.json$/, (texto) => {
    const pacote = JSON.parse(texto)
    return ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].flatMap((campo) => Object.keys(pacote[campo] ?? {}))
  }],
  [/^requirements[\w.-]*\.txt$/, (_, linhas) => linhas.map((linha) => linha.trim().match(NOME_DE_REQUISITO)?.[0]).filter(Boolean)],
  [/^pyproject\.toml$/, (_, linhas) => nomesEmSecoesToml(linhas, /^tool\.poetry(\.group\.[\w-]+)?\.(dev-)?dependencies$/, true).filter((nome) => nome !== 'python')],
  [/^go\.mod$/, (_, linhas) => linhas.map((linha) => linha.match(/^\s*(?:require\s+)?([\w.-]+\.[\w.-]+\/\S+)\s+v\d/)?.[1]).filter(Boolean)],
  [/^Cargo\.toml$/, (_, linhas) => nomesEmSecoesToml(linhas, /^(workspace\.|target\..+\.)?(dev-|build-)?dependencies$/, false)],
  [/^Gemfile$/, (_, linhas) => linhas.map((linha) => linha.match(/^\s*gem\s+['"]([^'"]+)/)?.[1]).filter(Boolean)],
]

function lerManifesto(arquivo) {
  const nome = arquivo.caminho.split('/').pop()
  const leitor = LEITORES_DE_MANIFESTO.find(([padrao]) => padrao.test(nome))?.[1]
  if (!leitor || profundidade(arquivo.caminho) > PROFUNDIDADE_DE_MANIFESTO) return null
  try {
    return [...new Set(leitor(arquivo.texto, arquivo.linhas))]
  } catch {
    return []
  }
}

const maisRaso = (atual, candidato) => (atual === null || profundidade(candidato) < profundidade(atual) ? candidato : atual)

const ENV_DE_EXEMPLO = /^\.env\.([\w.-]*)(example|sample|template)$/i
const COMPOSE = /^(docker-)?compose(\.[\w-]+)?\.ya?ml$/i

/**
 * @param {string} codigo  pasta do código no commit de corte
 * @returns {Promise<object>} a saída de `composicao` do CONTRATO.md, com a linha de cada biblioteca no manifesto
 */
export async function comporRepositorio(codigo) {
  const porLinguagem = new Map()
  const saida = {
    linguagens: [], arquivos: 0, linhas: 0, dependencias: [],
    ia: { bibliotecas: [], chamadas: [] },
    env_exemplo: null, dockerfile: null, compose: null, documentos: [], readme: null,
  }
  let caminhoDoEnv = null
  for await (const arquivo of percorrer(codigo)) {
    const { caminho, linhas } = arquivo
    const nome = caminho.split('/').pop()
    saida.arquivos += 1
    saida.linhas += linhas.length
    const linguagem = linguagemDe(caminho)
    if (linguagem) {
      const conta = porLinguagem.get(linguagem) ?? { nome: linguagem, arquivos: 0, linhas: 0 }
      conta.arquivos += 1
      conta.linhas += linhas.length
      porLinguagem.set(linguagem, conta)
    }

    const nomes = lerManifesto(arquivo)
    if (nomes) {
      saida.dependencias.push({ manifesto: caminho, nomes })
      for (const dependencia of nomes) {
        const provedor = provedorDaBiblioteca(dependencia)
        if (!provedor) continue
        const linha = linhas.findIndex((l) => l.includes(dependencia)) + 1
        saida.ia.bibliotecas.push({ nome: dependencia, provedor, manifesto: caminho, linha: linha || 1 })
      }
    }

    if (ehCodigo(caminho)) {
      linhas.forEach((linha, indice) => {
        if (saida.ia.chamadas.length >= MAXIMO_DE_CHAMADAS || linha.length > 2000) return
        const provedor = provedorNaLinha(linha, caminho)
        if (provedor) saida.ia.chamadas.push({ provedor, caminho, linha: indice + 1, trecho: aparar(linha) })
      })
    }

    if (ENV_DE_EXEMPLO.test(nome) && maisRaso(caminhoDoEnv, caminho) === caminho) {
      caminhoDoEnv = caminho
      saida.env_exemplo = { caminho, chaves: chavesDeEnv(linhas) }
    }
    if (/^Dockerfile$/i.test(nome)) saida.dockerfile = maisRaso(saida.dockerfile, caminho)
    if (COMPOSE.test(nome)) saida.compose = maisRaso(saida.compose, caminho)
    if (/\.mdx?$/i.test(nome)) saida.documentos.push(caminho)
    if (/^readme(\.(md|mdx|txt|rst))?$/i.test(nome)) saida.readme = maisRaso(saida.readme, caminho)
  }
  saida.linguagens = [...porLinguagem.values()].sort((a, b) => b.linhas - a.linhas)
  return saida
}

export default etapa({
  id: 'composicao',
  titulo: 'Composição do repositório',
  coluna: 'fatos',
  fila: 'scripts',
  versao: 1,
  depende: { corte: exige((c) => ({ sha: c.sha, codigo: c.codigo, repo: c.repo })) },
  teto: { total: 3 * MINUTO },

  async executar(ctx) {
    const fontes = ctx.dep('corte').saida
    ctx.pulso('percorrendo a árvore')
    const saida = await comporRepositorio(fontes.codigo)
    ctx.pulso(`${saida.arquivos} arquivos, ${saida.ia.chamadas.length} linhas que citam provedores`)
    // `relatar` é pura e não abre o disco: as evidências nascem aqui, com o código à mão.
    const evidencias = {
      bibliotecas: await Promise.all(saida.ia.bibliotecas.map((b) => evidenciaDeArquivo(fontes, b.manifesto, b.linha))),
      chamadas: await Promise.all(saida.ia.chamadas.slice(0, CHAMADAS_NO_RELATORIO).map((c) => evidenciaDeArquivo(fontes, c.caminho, c.linha))),
    }
    return { ...saida, evidencias }
  },

  relatar(saida) {
    const { bibliotecas, chamadas } = saida.ia
    const ia = []
    if (bibliotecas.length > 0) {
      ia.push({
        tipo: 'item', id: 'composicao:bibliotecas', rotulo: 'Bibliotecas de IA nas dependências', estado: verificado(),
        valor: { lista: bibliotecas.map((b) => `${b.nome} (${b.provedor}), em ${b.manifesto}`) },
        evidencias: saida.evidencias.bibliotecas.filter(Boolean),
      })
    }
    if (chamadas.length > 0) {
      const mostradas = chamadas.slice(0, CHAMADAS_NO_RELATORIO)
      ia.push({
        tipo: 'item', id: 'composicao:chamadas', rotulo: 'Pontos do código que citam provedores de IA', estado: verificado(),
        valor: { tabela: { colunas: ['Provedor', 'Caminho', 'Linha'], linhas: mostradas.map((c) => [c.provedor, c.caminho, c.linha]) } },
        evidencias: saida.evidencias.chamadas.filter(Boolean),
        obs: chamadas.length > mostradas.length ? `Mostrando ${mostradas.length} de ${chamadas.length} linhas encontradas.` : null,
      })
    }
    if (ia.length === 0) {
      ia.push({
        tipo: 'item', id: 'composicao:sem-ia', estado: verificado(), evidencias: [],
        rotulo: 'Nenhuma biblioteca de IA nas dependências e nenhuma linha de código que cite provedores de IA',
      })
    }
    return {
      arquitetura: [{
        tipo: 'item', id: 'composicao:linguagens', rotulo: 'Linguagens e tamanho', estado: verificado(), evidencias: [],
        valor: { tabela: { colunas: ['Linguagem', 'Arquivos', 'Linhas'], linhas: saida.linguagens.map((l) => [l.nome, l.arquivos, l.linhas]) } },
        obs: `${saida.arquivos} arquivos de texto e ${saida.linhas} linhas no total, sem contar dependências instaladas, arquivos de trava e binários.`,
      }],
      ia,
    }
  },
})
