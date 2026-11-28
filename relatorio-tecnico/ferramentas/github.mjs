/**
 * O que o GitHub registrou sobre um repositório, lido com `gh api`. O horário de
 * um push vem daqui porque a data de um commit é escrita por quem o criou.
 */
import { rodar } from './processo.mjs'

/** @typedef {{dono: string, nome: string}} Repo */

/**
 * @typedef {object} Metadados
 * @property {string} criado_em
 * @property {boolean} fork
 * @property {string|null} origem_do_fork   `dono/nome` do repositório de origem
 * @property {string} ramo_padrao
 * @property {boolean} privado
 * @property {string|null} homepage
 * @property {string|null} ultimo_push_em
 */

/**
 * @typedef {object} Atividade
 * @property {string} em      ISO 8601
 * @property {string} tipo    `push`, `force_push`, `pr_merge`, `branch_creation`, `branch_deletion`
 * @property {string} ref     por exemplo `refs/heads/main`
 * @property {string} sha     o `after` do registro
 */

export const LIMITE_DE_ATIVIDADE = 1000

const SEM_ACESSO = /HTTP 404|Not Found/

/** @param {Repo} repo */
const semAcesso = (repo) => new Error(`repositório sem acesso: ${repo.dono}/${repo.nome}`)

async function api(repo, args, sinal) {
  const { codigo, stdout, stderr } = await rodar('gh', ['api', ...args], { sinal })
  if (codigo === 0) return stdout
  if (SEM_ACESSO.test(stderr) || SEM_ACESSO.test(stdout)) throw semAcesso(repo)
  throw new Error(`gh api ${args.at(-1)} falhou: ${(stderr || stdout).trim().split('\n').at(-1)}`)
}

/**
 * @param {Repo} repo
 * @param {{sinal?: AbortSignal}} [opcoes]
 * @returns {Promise<Metadados>}
 */
export async function metadados(repo, { sinal } = {}) {
  const dados = JSON.parse(await api(repo, [`repos/${repo.dono}/${repo.nome}`], sinal))
  if (dados.private) throw semAcesso(repo)
  return {
    criado_em: dados.created_at,
    fork: Boolean(dados.fork),
    origem_do_fork: dados.parent?.full_name ?? null,
    ramo_padrao: dados.default_branch,
    privado: false,
    homepage: dados.homepage || null,
    ultimo_push_em: dados.pushed_at ?? null,
  }
}

/** @param {string} resposta saída de `gh api --include` @returns {{proxima: string|null, corpo: any}} */
function separarResposta(resposta) {
  const corte = resposta.search(/\r?\n\r?\n/)
  const cabecalhos = resposta.slice(0, corte)
  const proxima = /^link:.*<([^>]+)>;\s*rel="next"/im.exec(cabecalhos)?.[1] ?? null
  return { proxima, corpo: JSON.parse(resposta.slice(corte).trim()) }
}

/**
 * Atividade do repositório, da mais recente para a mais antiga, até
 * `LIMITE_DE_ATIVIDADE` registros. Lista com esse tamanho pode estar incompleta.
 * @param {Repo} repo
 * @param {{sinal?: AbortSignal, pulso?: (linha: string) => void}} [opcoes]
 * @returns {Promise<Atividade[]>}
 */
export async function atividade(repo, { sinal, pulso } = {}) {
  /** @type {Atividade[]} */
  const registros = []
  let endereco = `repos/${repo.dono}/${repo.nome}/activity?per_page=100`
  while (endereco && registros.length < LIMITE_DE_ATIVIDADE) {
    const { proxima, corpo } = separarResposta(await api(repo, ['--include', endereco], sinal))
    for (const r of corpo) {
      registros.push({ em: r.timestamp, tipo: r.activity_type, ref: r.ref, sha: r.after })
    }
    pulso?.(`atividade do GitHub: ${registros.length} registros`)
    endereco = proxima
  }
  return registros.slice(0, LIMITE_DE_ATIVIDADE)
}

/**
 * @param {Repo} repo
 * @param {{sinal?: AbortSignal}} [opcoes]
 * @returns {Promise<string[]>} nomes dos branches
 */
export async function ramos(repo, { sinal } = {}) {
  const saida = await api(repo, ['--paginate', '--jq', '.[].name', `repos/${repo.dono}/${repo.nome}/branches?per_page=100`], sinal)
  return saida.split('\n').filter(Boolean)
}
