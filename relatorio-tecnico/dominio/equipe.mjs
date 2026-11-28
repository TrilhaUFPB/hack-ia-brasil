/**
 * Da planilha do formulário para `Equipe[]`. Campo ausente vira null; a leitura
 * nunca lança por causa de uma linha.
 */
import { analisarCsv } from '../ferramentas/csv.mjs'

/** @typedef {import('./tipos.mjs').Equipe} Equipe */

const normalizar = (texto) => String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * O cabeçalho do formulário é o título inteiro da pergunta. Cada campo fica com
 * a primeira coluna livre que casa; a ordem resolve cabeçalho que casaria com
 * dois campos (`nome` por último, porque "nome" aparece em outras perguntas).
 * @type {[string, ((cabecalho: string) => boolean)[]][]}
 */
const COLUNAS = [
  ['carimbo', [(c) => c.includes('carimbo') || c.includes('timestamp')]],
  ['repositorio', [(c) => c.includes('reposit')]],
  ['resumo', [(c) => c.includes('one-line') || c.includes('summary') || c.includes('resumo')]],
  ['descricao', [(c) => c.includes('descri')]],
  ['video', [(c) => c.includes('video') || c.includes('pitch')]],
  ['demo', [(c) => c.includes('demo')]],
  ['track', [(c) => c.includes('track') || c.includes('trilha')]],
  ['nome', [(c) => c.includes('nome do projeto'), (c) => c === 'nome', (c) => c.includes('nome')]],
]

function mapearColunas(cabecalhos) {
  const normalizados = cabecalhos.map(normalizar)
  const tomadas = new Set()
  const indices = {}
  for (const [campo, regras] of COLUNAS) {
    for (const regra of regras) {
      const indice = normalizados.findIndex((cabecalho, i) => !tomadas.has(i) && regra(cabecalho))
      if (indice === -1) continue
      indices[campo] = indice
      tomadas.add(indice)
      break
    }
  }
  return indices
}

const SEGMENTO_DONO = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/
const SEGMENTO_NOME = /^[A-Za-z0-9._-]+$/

/**
 * Reduz um link de repositório ao par dono e nome. Link para ramo, pasta ou
 * arquivo vira o repositório; link de perfil e qualquer outro endereço viram null.
 * @param {unknown} link
 * @returns {{dono: string, nome: string, url: string}|null}
 */
export function normalizarRepo(link) {
  if (typeof link !== 'string') return null
  const texto = link.trim()
  let caminho
  const ssh = /^(?:ssh:\/\/)?git@github\.com[:/](.+)$/i.exec(texto)
  const http = /^(?:https?:\/\/)?(?:www\.)?github\.com\/(.+)$/i.exec(texto)
  if (ssh) caminho = ssh[1]
  else if (http) caminho = http[1]
  else if (/^[^\s/:@]+\/[^\s/:@]+$/.test(texto)) caminho = texto
  else return null

  const [dono, nomeBruto] = caminho.split(/[?#]/)[0].split('/').filter(Boolean)
  const nome = nomeBruto?.replace(/\.git$/i, '')
  if (!dono || !nome || !SEGMENTO_DONO.test(dono) || !SEGMENTO_NOME.test(nome) || nome === '.' || nome === '..') return null
  return { dono, nome, url: `https://github.com/${dono}/${nome}` }
}

const slug = (texto) => normalizar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Planilha do Google em pt-BR grava `28/11/2026 14:32:10`. @returns {number} NaN quando não dá para ler */
function instante(carimbo) {
  if (!carimbo) return NaN
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(carimbo)
  if (br) return Date.UTC(+br[3], +br[2] - 1, +br[1], +(br[4] ?? 0), +(br[5] ?? 0), +(br[6] ?? 0))
  return Date.parse(carimbo)
}

/** A submissão mais recente de cada repositório vale; sem carimbo legível, a última linha. */
function maisRecentePorRepositorio(linhas) {
  const porRepositorio = new Map()
  const escolhidas = []
  for (const linha of linhas) {
    const chave = linha.repo ? `${linha.repo.dono}/${linha.repo.nome}`.toLowerCase() : null
    const anterior = chave === null ? undefined : porRepositorio.get(chave)
    if (anterior === undefined) {
      if (chave !== null) porRepositorio.set(chave, escolhidas.length)
      escolhidas.push(linha)
    } else if (!(instante(linha.carimbo) < instante(escolhidas[anterior].carimbo))) {
      escolhidas[anterior] = linha
    }
  }
  return escolhidas
}

function atribuirIds(linhas) {
  const vezes = new Map()
  for (const linha of linhas) vezes.set(slug(linha.nome), (vezes.get(slug(linha.nome)) ?? 0) + 1)

  const usados = new Set()
  return linhas.map((linha) => {
    const doNome = slug(linha.nome)
    const doRepositorio = linha.repo ? slug(`${linha.repo.dono}-${linha.repo.nome}`) : ''
    const base = (doNome !== '' && vezes.get(doNome) === 1 ? doNome : doRepositorio) || doNome || 'equipe'
    let id = base
    for (let n = 2; usados.has(id); n++) id = `${base}-${n}`
    usados.add(id)
    return id
  })
}

/**
 * Aceita o CSV de respostas do formulário e o CSV reduzido da prévia (`nome`,
 * `repositorio` e, se houver, `demo`).
 * @param {string} textoCsv
 * @returns {Equipe[]}
 */
export function lerEquipes(textoCsv) {
  const [cabecalhos, ...registros] = analisarCsv(textoCsv)
  if (!cabecalhos) return []
  const colunas = mapearColunas(cabecalhos)
  const campo = (registro, nome) => {
    const valor = colunas[nome] === undefined ? '' : (registro[colunas[nome]] ?? '').trim()
    return valor === '' ? null : valor
  }

  const linhas = registros
    .map((registro) => ({
      nome: campo(registro, 'nome'),
      repositorio: campo(registro, 'repositorio'),
      repo: normalizarRepo(campo(registro, 'repositorio')),
      resumo: campo(registro, 'resumo'),
      descricao: campo(registro, 'descricao'),
      demo: campo(registro, 'demo'),
      track: campo(registro, 'track'),
      video: campo(registro, 'video'),
      carimbo: campo(registro, 'carimbo'),
    }))
    .filter((linha) => linha.nome !== null || linha.repositorio !== null)
    .map((linha) => ({ ...linha, nome: linha.nome ?? (linha.repo ? `${linha.repo.dono}/${linha.repo.nome}` : linha.repositorio) }))

  const escolhidas = maisRecentePorRepositorio(linhas)
  const ids = atribuirIds(escolhidas)
  return escolhidas.map((linha, i) => ({
    id: ids[i],
    nome: linha.nome,
    repo: linha.repo,
    resumo: linha.resumo,
    descricao: linha.descricao,
    demo: linha.demo,
    track: linha.track,
    video: linha.video,
  }))
}
