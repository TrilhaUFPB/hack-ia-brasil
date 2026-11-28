/**
 * Clone, cópia do código em um commit e lista de commits. Todo comando git daqui
 * recebe `-C <pasta dentro de trabalho/>`; nenhum toca o repositório do harness.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import { ambienteLimpo, rodar, rodarOuLancar } from './processo.mjs'

/**
 * @typedef {object} Commit
 * @property {string} sha
 * @property {string[]} pais
 * @property {string} autor_em    ISO 8601 com fuso
 * @property {string} commit_em   ISO 8601 com fuso
 * @property {string} autor
 * @property {string} mensagem    primeira linha
 * @property {number} adicionadas
 * @property {number} removidas
 * @property {{caminho: string, adicionadas: number, removidas: number}[]} arquivos   binário conta zero linhas
 */

const REGISTRO = '\x1e'
const CAMPO = '\x1f'

const ambiente = () => ambienteLimpo({ GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1' })

const git = (dir, args, opcoes = {}) =>
  rodarOuLancar('git', ['-C', dir, '-c', 'core.quotepath=false', ...args], { env: ambiente(), ...opcoes })

const existe = (caminho) => fsp.access(caminho).then(() => true, () => false)

/**
 * Clona em `dir`, ou atualiza o clone que já está lá, e deixa a árvore no branch
 * padrão remoto. Converge para o mesmo estado nas duas situações.
 * @param {object} p
 * @param {string} p.url
 * @param {string} p.dir                  `trabalho/<id>/repo`
 * @param {string|null} [p.ramo]          branch padrão, quando já se sabe pelo GitHub
 * @param {(linha: string) => void} [p.pulso]
 * @param {AbortSignal} [p.sinal]
 * @returns {Promise<{ramo: string|null}>} `ramo: null` quando o remoto não tem commit
 */
export async function prepararClone({ url, dir, ramo = null, pulso, sinal }) {
  const opcoes = { pulso, sinal }
  if (await existe(path.join(dir, '.git'))) {
    await git(dir, ['remote', 'set-url', 'origin', url], opcoes)
    await git(dir, ['fetch', '--all', '--prune', '--force', '--progress'], opcoes)
  } else {
    await fsp.rm(dir, { recursive: true, force: true })
    await fsp.mkdir(path.dirname(dir), { recursive: true })
    await rodarOuLancar('git', ['clone', '--progress', '--', url, dir], { env: ambiente(), ...opcoes })
  }

  let padrao = ramo
  if (!padrao) {
    await rodar('git', ['-C', dir, 'remote', 'set-head', 'origin', '--auto'], { env: ambiente(), sinal })
    const cabeca = await rodar('git', ['-C', dir, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], { env: ambiente(), sinal })
    padrao = cabeca.codigo === 0 ? cabeca.stdout.trim().replace(/^origin\//, '') : null
  }
  if (!padrao || !(await temCommit(dir, `origin/${padrao}`, { sinal }))) return { ramo: null }

  await git(dir, ['checkout', '--force', '--detach', `origin/${padrao}`], opcoes)
  return { ramo: padrao }
}

/**
 * @param {string} dir @param {string} ref @param {{sinal?: AbortSignal}} [opcoes]
 * @returns {Promise<boolean>}
 */
export async function temCommit(dir, ref, { sinal } = {}) {
  const { codigo } = await rodar('git', ['-C', dir, 'cat-file', '-e', `${ref}^{commit}`], { env: ambiente(), sinal })
  return codigo === 0
}

/**
 * Tenta trazer um commit que não está em nenhum branch, como o que um push
 * forçado deixou para trás. Devolve se o commit ficou disponível.
 * @param {string} dir @param {string} sha @param {{sinal?: AbortSignal}} [opcoes]
 */
export async function buscarCommit(dir, sha, { sinal } = {}) {
  if (await temCommit(dir, sha, { sinal })) return true
  await rodar('git', ['-C', dir, 'fetch', 'origin', sha], { env: ambiente(), sinal })
  return temCommit(dir, sha, { sinal })
}

/**
 * Grava a árvore do commit em `destino`. Extrai numa pasta temporária vizinha e
 * renomeia, então `destino` ou não existe ou está completo.
 * @param {object} p
 * @param {string} p.dirRepo
 * @param {string} p.sha
 * @param {string} p.destino   `trabalho/<id>/codigo-<sha>`
 * @param {AbortSignal} [p.sinal]
 * @returns {Promise<string>} `destino`
 */
export async function copiarCodigo({ dirRepo, sha, destino, sinal }) {
  if (await existe(destino)) return destino
  await fsp.mkdir(path.dirname(destino), { recursive: true })
  const temporaria = await fsp.mkdtemp(`${destino}.tmp-`)
  const pacote = `${temporaria}.tar`
  try {
    await git(dirRepo, ['archive', '--format=tar', `--output=${pacote}`, sha], { sinal })
    await rodarOuLancar('tar', ['-xf', pacote, '-C', temporaria], { sinal })
    await fsp.rename(temporaria, destino)
  } catch (erro) {
    if (!(await existe(destino))) throw erro
  } finally {
    await fsp.rm(pacote, { force: true })
    await fsp.rm(temporaria, { recursive: true, force: true })
  }
  return destino
}

/**
 * Commits alcançáveis a partir de `ref`, do mais antigo ao mais novo.
 * @param {object} p
 * @param {string} p.dirRepo
 * @param {string} p.ref       por exemplo `origin/main`
 * @param {AbortSignal} [p.sinal]
 * @returns {Promise<Commit[]>}
 */
export async function listarCommits({ dirRepo, ref, sinal }) {
  // `rodar` guarda só o fim de uma saída longa; um repositório com dependências
  // commitadas passaria do limite e perderia os commits mais antigos.
  const arquivo = path.join(dirRepo, '.git', `rt-commits-${process.pid}-${Date.now()}.log`)
  const formato = `${REGISTRO}%H${CAMPO}%P${CAMPO}%aI${CAMPO}%cI${CAMPO}%an${CAMPO}%s`
  try {
    await git(dirRepo, ['log', '--reverse', '--numstat', '--no-renames', `--format=${formato}`, `--output=${arquivo}`, ref, '--'], { sinal })
    return lerCommits(await fsp.readFile(arquivo, 'utf8'))
  } finally {
    await fsp.rm(arquivo, { force: true })
  }
}

/** @param {string} texto saída de `git log --numstat` no formato de `listarCommits` @returns {Commit[]} */
export function lerCommits(texto) {
  return texto.split(REGISTRO).slice(1).map((registro) => {
    const [cabecalho, ...linhas] = registro.split('\n')
    const [sha, pais, autor_em, commit_em, autor, mensagem] = cabecalho.split(CAMPO)
    const arquivos = []
    for (const linha of linhas) {
      const partes = linha.split('\t')
      if (partes.length < 3) continue
      arquivos.push({
        caminho: partes.slice(2).join('\t'),
        adicionadas: Number.parseInt(partes[0], 10) || 0,
        removidas: Number.parseInt(partes[1], 10) || 0,
      })
    }
    return {
      sha,
      pais: pais ? pais.split(' ') : [],
      autor_em,
      commit_em,
      autor,
      mensagem: mensagem ?? '',
      adicionadas: arquivos.reduce((soma, a) => soma + a.adicionadas, 0),
      removidas: arquivos.reduce((soma, a) => soma + a.removidas, 0),
      arquivos,
    }
  })
}
