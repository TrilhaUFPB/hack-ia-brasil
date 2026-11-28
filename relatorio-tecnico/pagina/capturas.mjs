/**
 * Transforma uma captura de tela da pasta de saída da equipe em data URI, para
 * a página não depender de outros arquivos.
 */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { rodar } from '../ferramentas/processo.mjs'

const LARGURA_MAXIMA = 1280
const TIPOS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function larguraDoPng(bytes) {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(ASSINATURA_PNG)) return null
  return bytes.readUInt32BE(16)
}

async function comprimir(arquivo, bytes) {
  const pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'rt-captura-'))
  const destino = path.join(pasta, 'captura.webp')
  try {
    const largura = larguraDoPng(bytes)
    const redimensionar = largura !== null && largura > LARGURA_MAXIMA ? ['-resize', String(LARGURA_MAXIMA), '0'] : []
    const { codigo } = await rodar('cwebp', ['-quiet', '-q', '80', ...redimensionar, arquivo, '-o', destino])
    return codigo === 0 ? await fs.readFile(destino) : null
  } catch {
    return null
  } finally {
    await fs.rm(pasta, { recursive: true, force: true })
  }
}

/**
 * @param {string} dirSaidaEquipe pasta de saída da equipe; só arquivos dentro dela são embutidos
 * @returns {(caminhoRelativo: string) => Promise<string|null>} data URI, ou null se o arquivo não existe ou está fora da pasta
 */
export function criarEmbutidor(dirSaidaEquipe) {
  /** @type {Map<string, Promise<string|null>>} */
  const cache = new Map()

  async function embutir(arquivo) {
    const bytes = await fs.readFile(arquivo)
    const webp = await comprimir(arquivo, bytes)
    if (webp) return `data:image/webp;base64,${webp.toString('base64')}`
    const tipo = TIPOS[path.extname(arquivo).toLowerCase()]
    return tipo ? `data:${tipo};base64,${bytes.toString('base64')}` : null
  }

  return async function embutirCaptura(caminhoRelativo) {
    if (typeof caminhoRelativo !== 'string' || caminhoRelativo === '') return null
    if (path.isAbsolute(caminhoRelativo) || caminhoRelativo.split(/[\\/]/).includes('..')) return null
    try {
      const raiz = await fs.realpath(dirSaidaEquipe)
      const arquivo = await fs.realpath(path.join(raiz, caminhoRelativo))
      if (!arquivo.startsWith(raiz + path.sep)) return null
      const dados = await fs.stat(arquivo)
      if (!dados.isFile()) return null
      const chave = `${arquivo}\0${dados.mtimeMs}`
      if (!cache.has(chave)) cache.set(chave, embutir(arquivo).catch(() => null))
      return await cache.get(chave)
    } catch {
      return null
    }
  }
}
