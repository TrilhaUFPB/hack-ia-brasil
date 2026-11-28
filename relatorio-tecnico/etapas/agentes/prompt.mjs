/**
 * Monta o prompt de um agent a partir de `etapas/prompts/<nome>.md`. Os
 * marcadores `{{nome}}` são trocados em uma passada só, para que um texto de
 * equipe que contenha `{{...}}` nunca seja expandido.
 */
import fs from 'node:fs'
import path from 'node:path'
import { descreverTipos } from '../../dominio/afirmacao.mjs'

const DIR_PROMPTS = path.join(import.meta.dirname, '..', 'prompts')
const MARCADOR = /\{\{([a-z_]+)\}\}/g

const modelos = new Map()

function lerModelo(nome) {
  if (!modelos.has(nome)) modelos.set(nome, fs.readFileSync(path.join(DIR_PROMPTS, `${nome}.md`), 'utf8'))
  return modelos.get(nome)
}

/**
 * @param {'promessas'|'leitor'|'uso'} nome
 * @param {string[]} tipos                    entram no prompt como `{{tipos}}`
 * @param {Record<string, string|number>} valores
 * @returns {string}
 */
export function montarPrompt(nome, tipos, valores) {
  const todos = { ...valores, tipos: descreverTipos(tipos), regras: lerModelo('regras') }
  const usados = new Set()
  const prompt = lerModelo(nome).replace(MARCADOR, (_, marcador) => {
    if (!(marcador in todos)) throw new Error(`prompt ${nome}: marcador {{${marcador}}} sem valor`)
    usados.add(marcador)
    return String(todos[marcador])
  })
  const sobras = Object.keys(todos).filter((marcador) => !usados.has(marcador))
  if (sobras.length > 0) throw new Error(`prompt ${nome}: valor sem marcador no modelo: ${sobras.join(', ')}`)
  return prompt
}

/** @param {string[]} linhas @param {string} vazio */
export const emLinhas = (linhas, vazio) => (linhas.length > 0 ? linhas.join('\n') : vazio)
