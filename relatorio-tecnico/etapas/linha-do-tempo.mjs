import { evidenciaDeCommit } from '../dominio/evidencia.mjs'
import { verificado } from '../dominio/estados.mjs'
import { listarCommits } from '../ferramentas/git.mjs'
import { etapa, exige, MINUTO, tolera } from '../nucleo/etapa.mjs'
import { encurtar, horarioDeBrasilia, shaCurto } from './tempo/horario.mjs'
import { calcularLinhaDoTempo, ehCommitGrande } from './tempo/linha.mjs'

const EVIDENCIAS_POR_ITEM = 10
const BASE = { push: 'push no GitHub', data_do_commit: 'data do commit' }

const item = (id, rotulo, campos) => ({ tipo: 'item', id: `linha-do-tempo:${id}`, rotulo, estado: verificado(), evidencias: [], ...campos })

export default etapa({
  id: 'linha-do-tempo',
  titulo: 'Linha do tempo',
  coluna: 'fatos',
  fila: 'scripts',
  versao: 1,
  depende: {
    corte: exige((c) => ({ dir_repo: c.dir_repo, sha: c.sha, ramo: c.ramo, repo: c.repo })),
    github: tolera((g) => g?.pushes ?? null),
  },
  // O clone recebe commits novos sem que o commit de corte mude.
  volatil: true,
  entradas: (equipe, rodada) => rodada.janela,
  teto: { total: 2 * MINUTO },

  async executar(ctx) {
    const corte = ctx.dep('corte').saida
    const pushes = ctx.dep('github').saida?.pushes ?? []
    ctx.pulso('lendo o histórico de commits')
    const commits = await listarCommits({ dirRepo: corte.dir_repo, ref: `origin/${corte.ramo}`, sinal: ctx.sinal })
    return {
      repo: corte.repo,
      sha: corte.sha,
      horario_dos_pushes: pushes.length > 0,
      ...calcularLinhaDoTempo({ commits, sha: corte.sha, janela: ctx.rodada.janela, pushes }),
    }
  },

  relatar(saida) {
    const deCommit = (sha) => evidenciaDeCommit(saida.repo, sha)
    const tabelaDeCommits = (lista, horarioDe) => ({
      tabela: {
        colunas: ['Commit', 'Horário', 'Mensagem'],
        linhas: lista.map((c) => [shaCurto(c.sha), horarioDe(c), encurtar(c.mensagem)]),
      },
    })
    const foraDaJanela = (id, rotulo, lista) => item(id, rotulo, {
      valor: {
        tabela: {
          colunas: ['Commit', 'Horário', 'Horário usado', 'Mensagem'],
          linhas: lista.map((c) => [shaCurto(c.sha), horarioDeBrasilia(c.horario), BASE[c.base], encurtar(c.mensagem)]),
        },
      },
      evidencias: lista.slice(0, EVIDENCIAS_POR_ITEM).map((c) => deCommit(c.sha)),
      obs: lista.length > EVIDENCIAS_POR_ITEM ? `${lista.length} commits; evidência dos ${EVIDENCIAS_POR_ITEM} primeiros` : null,
      sinal: true,
    })

    const blocos = [item('total', 'Commits no branch padrão', {
      valor: saida.total,
      obs: saida.horario_dos_pushes
        ? `${saida.cobertos_por_push} de ${saida.total} com horário de push registrado pelo GitHub`
        : 'sem horário de push do GitHub; os horários vêm da data do commit',
    })]
    if (saida.primeiro) {
      blocos.push(item('primeiro', 'Primeiro commit', { valor: horarioDeBrasilia(saida.primeiro.em), evidencias: [deCommit(saida.primeiro.sha)] }))
      blocos.push(item('ultimo', 'Último commit', { valor: horarioDeBrasilia(saida.ultimo.em), evidencias: [deCommit(saida.ultimo.sha)] }))
    }
    const { antes, depois } = saida.fora_da_janela
    if (antes.length > 0) blocos.push(foraDaJanela('antes', 'Commits antes do início da janela', antes))
    if (depois.length > 0) blocos.push(foraDaJanela('depois', 'Commits depois do fim da janela', depois))
    if (saida.depois_do_corte.length > 0) {
      blocos.push(item('depois-do-corte', 'Commits depois do commit analisado', {
        valor: tabelaDeCommits(saida.depois_do_corte, (c) => horarioDeBrasilia(c.em)),
        evidencias: saida.depois_do_corte.slice(0, EVIDENCIAS_POR_ITEM).map((c) => deCommit(c.sha)),
        obs: 'não entram na análise do código',
        sinal: true,
      }))
    }

    const [maior] = saida.maiores
    if (maior) {
      blocos.push(item('maior', 'Maior commit', {
        valor: `${shaCurto(maior.sha)}, ${maior.adicionadas} linhas adicionadas em ${maior.arquivos} arquivos, de ${saida.total_adicionadas} no histórico`,
        evidencias: [deCommit(maior.sha)],
        obs: `${maior.adicionadas_fora_de_trava_e_gerados} linhas fora de arquivos de trava e gerados`,
        sinal: ehCommitGrande(maior, saida.total_adicionadas),
      }))
      blocos.push(item('maiores', 'Maiores commits em linhas adicionadas', {
        valor: {
          tabela: {
            colunas: ['Commit', 'Horário', 'Linhas adicionadas', 'Arquivos', 'Mensagem'],
            linhas: saida.maiores.map((c) => [shaCurto(c.sha), horarioDeBrasilia(c.em), c.adicionadas, c.arquivos, encurtar(c.mensagem)]),
          },
        },
        evidencias: saida.maiores.map((c) => deCommit(c.sha)),
      }))
    }
    if (saida.por_hora.length > 0) {
      blocos.push(item('volume', 'Commits por hora', { valor: { serie: saida.por_hora.map(([hora, commits]) => [hora, commits]) } }))
    }
    return { linha_do_tempo: blocos }
  },
})
