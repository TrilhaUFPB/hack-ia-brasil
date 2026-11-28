import { evidenciaDeUrl } from '../dominio/evidencia.mjs'
import { verificado } from '../dominio/estados.mjs'
import { atividade, metadados, ramos } from '../ferramentas/github.mjs'
import { etapa, MINUTO } from '../nucleo/etapa.mjs'
import { horarioDeBrasilia, shaCurto } from './tempo/horario.mjs'

const semPrefixo = (ref) => ref.replace(/^refs\/heads\//, '')

export default etapa({
  id: 'github',
  titulo: 'Registro do GitHub',
  coluna: 'fatos',
  fila: 'scripts',
  versao: 1,
  depende: {},
  volatil: true,
  entradas: (equipe, rodada) => ({ repo: equipe.repo?.url ?? null, inicio: rodada.janela.inicio }),
  teto: { total: 2 * MINUTO },

  async executar(ctx) {
    const repo = ctx.equipe.repo
    if (!repo) throw new Error('repositório não informado ou link inválido')
    ctx.pulso(`lendo ${repo.dono}/${repo.nome} no GitHub`)
    const meta = await metadados(repo, { sinal: ctx.sinal })
    const registros = await atividade(repo, { sinal: ctx.sinal, pulso: ctx.pulso })
    const todosOsRamos = await ramos(repo, { sinal: ctx.sinal })
    return {
      repo: { dono: repo.dono, nome: repo.nome, url: repo.url },
      ...meta,
      pushes: registros.filter((r) => r.tipo !== 'branch_deletion').map(({ em, tipo, ref, sha }) => ({ em, tipo, ref, sha })),
      outros_ramos: todosOsRamos.filter((nome) => nome !== meta.ramo_padrao),
      inicio_da_janela: ctx.rodada.janela.inicio,
    }
  },

  relatar(saida) {
    const pagina = [evidenciaDeUrl(saida.repo.url)]
    const linha_do_tempo = [{
      tipo: 'item',
      id: 'github:criado',
      rotulo: 'Repositório criado',
      estado: verificado(),
      valor: horarioDeBrasilia(saida.criado_em),
      evidencias: pagina,
      sinal: Date.parse(saida.criado_em) < Date.parse(saida.inicio_da_janela),
    }]

    const forcados = saida.pushes.filter((p) => p.tipo === 'force_push')
    if (forcados.length > 0) {
      linha_do_tempo.push({
        tipo: 'item',
        id: 'github:push-forcado',
        rotulo: 'Push forçado',
        estado: verificado(),
        valor: {
          tabela: {
            colunas: ['Horário', 'Branch', 'Commit'],
            linhas: forcados.map((p) => [horarioDeBrasilia(p.em), semPrefixo(p.ref), shaCurto(p.sha)]),
          },
        },
        evidencias: pagina,
        sinal: true,
      })
    }

    if (!saida.fork) return { linha_do_tempo }
    return {
      linha_do_tempo,
      origem: [{
        tipo: 'item',
        id: 'github:fork',
        rotulo: 'Fork',
        estado: verificado(),
        valor: saida.origem_do_fork ?? 'repositório de origem não informado pelo GitHub',
        evidencias: saida.origem_do_fork ? [evidenciaDeUrl(`https://github.com/${saida.origem_do_fork}`)] : pagina,
        sinal: true,
      }],
    }
  },
})
