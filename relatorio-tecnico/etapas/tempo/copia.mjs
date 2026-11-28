/** Arquivos de código com conteúdo igual entre equipes. Só correspondência exata. */
import crypto from 'node:crypto'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { ehCodigoFonte, PASTAS_IGNORADAS } from './arquivos.mjs'

export const MINIMO_DE_CARACTERES = 400
export const EQUIPES_PARA_SER_MODELO = 4
const TAMANHO_MAXIMO = 1024 * 1024

/** @param {string} texto */
export const normalizar = (texto) => texto.replace(/\s+/g, ' ').trim()

/**
 * @param {string} raiz pasta do código de uma equipe
 * @returns {Promise<Map<string, string[]>>} sha256 do conteúdo normalizado -> caminhos relativos
 */
export async function impressoesDoCodigo(raiz) {
  /** @type {Map<string, string[]>} */
  const impressoes = new Map()
  const pendentes = ['']
  while (pendentes.length > 0) {
    const relativa = pendentes.pop()
    const entradas = await fsp.readdir(path.join(raiz, relativa), { withFileTypes: true })
    for (const entrada of entradas) {
      const caminho = relativa ? `${relativa}/${entrada.name}` : entrada.name
      if (entrada.isDirectory()) {
        if (!PASTAS_IGNORADAS.has(entrada.name)) pendentes.push(caminho)
        continue
      }
      // `isFile` é falso para link simbólico: o conteúdo de fora da pasta nunca é lido.
      if (!entrada.isFile() || !ehCodigoFonte(caminho)) continue
      const absoluto = path.join(raiz, caminho)
      if ((await fsp.stat(absoluto)).size > TAMANHO_MAXIMO) continue
      const conteudo = normalizar(await fsp.readFile(absoluto, 'utf8'))
      if (conteudo.length < MINIMO_DE_CARACTERES) continue
      const hash = crypto.createHash('sha256').update(conteudo).digest('hex')
      impressoes.set(hash, [...(impressoes.get(hash) ?? []), caminho].sort())
    }
  }
  return impressoes
}

/**
 * @typedef {{arquivo: string, outra_equipe: string, arquivo_dela: string}} ArquivoIgual
 */

/**
 * @param {Record<string, Map<string, string[]>>} impressoesPorEquipe id da equipe -> impressões
 * @returns {Record<string, ArquivoIgual[]>} toda equipe comparada aparece, com lista vazia quando nada é igual
 */
export function arquivosIguais(impressoesPorEquipe) {
  /** @type {Map<string, string[]>} */
  const equipesPorHash = new Map()
  for (const [id, impressoes] of Object.entries(impressoesPorEquipe)) {
    for (const hash of impressoes.keys()) equipesPorHash.set(hash, [...(equipesPorHash.get(hash) ?? []), id])
  }

  /** @type {Record<string, ArquivoIgual[]>} */
  const porEquipe = Object.fromEntries(Object.keys(impressoesPorEquipe).map((id) => [id, []]))
  for (const [hash, ids] of equipesPorHash) {
    if (ids.length < 2 || ids.length >= EQUIPES_PARA_SER_MODELO) continue
    for (const id of ids) {
      for (const outra of ids) {
        if (outra === id) continue
        const arquivo_dela = impressoesPorEquipe[outra].get(hash)[0]
        for (const arquivo of impressoesPorEquipe[id].get(hash)) {
          porEquipe[id].push({ arquivo, outra_equipe: outra, arquivo_dela })
        }
      }
    }
  }
  for (const lista of Object.values(porEquipe)) {
    lista.sort((a, b) => a.arquivo.localeCompare(b.arquivo) || a.outra_equipe.localeCompare(b.outra_equipe))
  }
  return porEquipe
}

/**
 * @param {Record<string, string>} codigoPorEquipe id da equipe -> pasta do código no commit de corte
 * @param {(linha: string) => void} [pulso]
 */
export async function compararEquipes(codigoPorEquipe, pulso = () => {}) {
  /** @type {Record<string, Map<string, string[]>>} */
  const impressoes = {}
  for (const [id, codigo] of Object.entries(codigoPorEquipe)) {
    pulso(`lendo os arquivos de ${id}`)
    impressoes[id] = await impressoesDoCodigo(codigo)
  }
  return arquivosIguais(impressoes)
}
