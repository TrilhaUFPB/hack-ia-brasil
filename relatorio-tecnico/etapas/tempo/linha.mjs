import { ehTravaOuGerado } from './arquivos.mjs'
import { horaDeBrasilia } from './horario.mjs'

export const LINHAS_DE_COMMIT_GRANDE = 2000
export const FRACAO_DE_COMMIT_GRANDE = 0.6

/**
 * Quando cada commit chegou ao GitHub: o horário do push mais antigo que o contém.
 * @param {import('../../ferramentas/git.mjs').Commit[]} commits
 * @param {{em: string, sha: string}[]} pushes
 * @returns {Map<string, string>} sha -> ISO; commit sem push que o cubra fica de fora
 */
export function chegadas(commits, pushes) {
  const porSha = new Map(commits.map((c) => [c.sha, c]))
  const chegou = new Map()
  const emOrdem = [...pushes].sort((a, b) => Date.parse(a.em) - Date.parse(b.em))
  for (const push of emOrdem) {
    const pilha = [push.sha]
    while (pilha.length > 0) {
      const sha = pilha.pop()
      const commit = porSha.get(sha)
      if (!commit || chegou.has(sha)) continue
      chegou.set(sha, push.em)
      pilha.push(...commit.pais)
    }
  }
  return chegou
}

/** @returns {Set<string>} o commit e todos os seus ancestrais */
function ancestrais(commits, sha) {
  const porSha = new Map(commits.map((c) => [c.sha, c]))
  const vistos = new Set()
  const pilha = [sha]
  while (pilha.length > 0) {
    const atual = pilha.pop()
    if (vistos.has(atual) || !porSha.has(atual)) continue
    vistos.add(atual)
    pilha.push(...porSha.get(atual).pais)
  }
  return vistos
}

const resumoDe = (c) => ({ sha: c.sha, em: c.commit_em, mensagem: c.mensagem })

/**
 * @param {object} p
 * @param {import('../../ferramentas/git.mjs').Commit[]} p.commits   do branch padrão, do mais antigo ao mais novo
 * @param {string} p.sha                                              commit de corte
 * @param {{inicio: string, fim: string}} p.janela
 * @param {{em: string, sha: string}[]} p.pushes                      vazio quando o GitHub não respondeu
 */
export function calcularLinhaDoTempo({ commits, sha, janela, pushes }) {
  const inicio = Date.parse(janela.inicio)
  const fim = Date.parse(janela.fim)
  const chegou = chegadas(commits, pushes)

  const antes = []
  const depois = []
  for (const c of commits) {
    const base = chegou.has(c.sha) ? 'push' : 'data_do_commit'
    const horario = chegou.get(c.sha) ?? c.commit_em
    const instante = Date.parse(horario)
    if (instante < inicio) antes.push({ sha: c.sha, horario, base, mensagem: c.mensagem })
    else if (instante > fim) depois.push({ sha: c.sha, horario, base, mensagem: c.mensagem })
  }

  const total_adicionadas = commits.reduce((soma, c) => soma + c.adicionadas, 0)
  const maiores = [...commits]
    .sort((a, b) => b.adicionadas - a.adicionadas)
    .slice(0, 5)
    .filter((c) => c.adicionadas > 0)
    .map((c) => ({
      ...resumoDe(c),
      adicionadas: c.adicionadas,
      removidas: c.removidas,
      arquivos: c.arquivos.length,
      adicionadas_fora_de_trava_e_gerados: c.arquivos.filter((a) => !ehTravaOuGerado(a.caminho)).reduce((soma, a) => soma + a.adicionadas, 0),
    }))

  const horas = new Map()
  for (const c of [...commits].sort((a, b) => Date.parse(a.commit_em) - Date.parse(b.commit_em))) {
    const hora = horaDeBrasilia(c.commit_em)
    const [quantos, linhas] = horas.get(hora) ?? [0, 0]
    horas.set(hora, [quantos + 1, linhas + c.adicionadas])
  }

  const noCorte = ancestrais(commits, sha)

  return {
    total: commits.length,
    primeiro: commits.length > 0 ? resumoDe(commits[0]) : null,
    ultimo: commits.length > 0 ? resumoDe(commits.at(-1)) : null,
    fora_da_janela: { antes, depois },
    cobertos_por_push: chegou.size,
    maiores,
    total_adicionadas,
    por_hora: [...horas].map(([hora, [quantos, linhas]]) => [hora, quantos, linhas]),
    depois_do_corte: commits.filter((c) => !noCorte.has(c.sha)).map(resumoDe),
  }
}

/**
 * @param {ReturnType<typeof calcularLinhaDoTempo>['maiores'][number]} maior
 * @param {number} total_adicionadas
 */
export function ehCommitGrande(maior, total_adicionadas) {
  return maior.adicionadas_fora_de_trava_e_gerados > LINHAS_DE_COMMIT_GRANDE
    || maior.adicionadas > FRACAO_DE_COMMIT_GRANDE * total_adicionadas
}
