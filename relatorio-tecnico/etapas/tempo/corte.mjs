import path from 'node:path'
import * as githubReal from '../../ferramentas/github.mjs'
import { buscarCommit, copiarCodigo, listarCommits, prepararClone } from '../../ferramentas/git.mjs'
import { horarioDeBrasilia } from './horario.mjs'

// `branch_creation` entra porque o primeiro push de um repositório novo é
// registrado assim, e não como `push`.
const TIPOS_QUE_TRAZEM_COMMIT = new Set(['push', 'force_push', 'pr_merge', 'branch_creation'])

/**
 * @param {import('../../ferramentas/github.mjs').Atividade[]} atividade
 * @param {string} ramo
 * @returns {import('../../ferramentas/github.mjs').Atividade[]} os registros que levaram commit ao branch
 */
export function pushesDoRamo(atividade, ramo) {
  return atividade.filter((r) => r.ref === `refs/heads/${ramo}` && TIPOS_QUE_TRAZEM_COMMIT.has(r.tipo) && /[1-9a-f]/.test(r.sha ?? ''))
}

/**
 * O push mais recente no branch padrão que chegou até o fim da janela. Com o fim
 * no futuro, todo push registrado já satisfaz a condição.
 * @param {object} p
 * @param {import('../../ferramentas/github.mjs').Atividade[]} p.atividade
 * @param {string} p.ramo
 * @param {string} p.fim   ISO 8601
 * @returns {{sha: string, em: string} | {motivo: 'sem_atividade'|'nada_ate_o_fim'}}
 */
export function escolherCorte({ atividade, ramo, fim }) {
  const pushes = pushesDoRamo(atividade, ramo)
  if (pushes.length === 0) return { motivo: 'sem_atividade' }
  const limite = Date.parse(fim)
  const ateOFim = pushes.filter((r) => Date.parse(r.em) <= limite)
  if (ateOFim.length === 0) return { motivo: 'nada_ate_o_fim' }
  const ultimo = ateOFim.reduce((a, b) => (Date.parse(b.em) > Date.parse(a.em) ? b : a))
  return { sha: ultimo.sha, em: ultimo.em }
}

/**
 * @param {import('../../ferramentas/git.mjs').Commit[]} commits do mais antigo ao mais novo
 * @param {string} fim
 * @returns {{sha: string, em: string}|null} o commit mais novo com data de commit até o fim
 */
export function cortePelaDataDoCommit(commits, fim) {
  const limite = Date.parse(fim)
  const commit = commits.findLast((c) => Date.parse(c.commit_em) <= limite)
  return commit ? { sha: commit.sha, em: commit.commit_em } : null
}

/**
 * @param {object} p
 * @param {import('../../dominio/tipos.mjs').Equipe} p.equipe
 * @param {{inicio: string, fim: string}} p.janela
 * @param {string} p.pastaTrabalho   `trabalho/<id>`
 * @param {Pick<typeof githubReal, 'metadados'|'atividade'>} [p.github]
 * @param {(linha: string) => void} [p.pulso]
 * @param {AbortSignal} [p.sinal]
 */
export async function cortar({ equipe, janela, pastaTrabalho, github = githubReal, pulso = () => {}, sinal }) {
  const repo = equipe.repo
  if (!repo) throw new Error('repositório não informado ou link inválido')
  const nenhumCommit = () => new Error(`nenhum commit chegou ao GitHub até ${horarioDeBrasilia(janela.fim)}`)

  pulso(`lendo ${repo.dono}/${repo.nome} no GitHub`)
  const { ramo_padrao } = await github.metadados(repo, { sinal })

  const dir_repo = path.join(pastaTrabalho, 'repo')
  pulso('clonando ou atualizando o repositório')
  const { ramo } = await prepararClone({ url: repo.url, dir: dir_repo, ramo: ramo_padrao, pulso, sinal })
  if (!ramo) throw nenhumCommit()

  let registros = []
  try {
    registros = await github.atividade(repo, { sinal, pulso })
  } catch (erro) {
    if (sinal?.aborted) throw erro
    pulso(`atividade do GitHub indisponível, o corte usa a data do commit: ${erro.message}`)
  }

  let escolha = escolherCorte({ atividade: registros, ramo, fim: janela.fim })
  let origem = 'push'
  const listaCompleta = registros.length < githubReal.LIMITE_DE_ATIVIDADE
  if ('motivo' in escolha) {
    if (escolha.motivo === 'nada_ate_o_fim' && listaCompleta) throw nenhumCommit()
    const commits = await listarCommits({ dirRepo: dir_repo, ref: `origin/${ramo}`, sinal })
    const peloCommit = cortePelaDataDoCommit(commits, janela.fim)
    if (!peloCommit) throw nenhumCommit()
    escolha = peloCommit
    origem = 'data_do_commit'
  }

  if (!(await buscarCommit(dir_repo, escolha.sha, { sinal }))) {
    throw new Error(`o commit de corte ${escolha.sha} não está no clone; um push forçado pode tê-lo removido do GitHub`)
  }
  pulso(`commit de corte ${escolha.sha} (${origem})`)
  const codigo = await copiarCodigo({ dirRepo: dir_repo, sha: escolha.sha, destino: path.join(pastaTrabalho, `codigo-${escolha.sha}`), sinal })

  return { sha: escolha.sha, em: escolha.em, origem, codigo, dir_repo, ramo, repo: { dono: repo.dono, nome: repo.nome, url: repo.url } }
}
