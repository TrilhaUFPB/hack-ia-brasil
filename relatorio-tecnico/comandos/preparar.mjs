import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG } from '../config.mjs'
import { rodar as rodarProcesso } from '../ferramentas/processo.mjs'
import { analisar, comCodigoDeSaida } from './argumentos.mjs'

const DIR_HARNESS = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const NODE_MINIMO = 22
const MEMORIA_MINIMA_GB = 8

/** @typedef {{ok: boolean, detalhe: string, fazer?: string}} Conferencia */

/** Comando ausente conta como código diferente de zero. */
async function tentar(comando, args, opcoes) {
  try {
    return await rodarProcesso(comando, args, opcoes)
  } catch (erro) {
    return { codigo: -1, stdout: '', stderr: erro.message }
  }
}

const primeiraLinha = (texto) => texto.trim().split('\n')[0] ?? ''

async function versaoDe(comando, args, fazer) {
  const { codigo, stdout, stderr } = await tentar(comando, args)
  return codigo === 0 ? { ok: true, detalhe: primeiraLinha(stdout || stderr) } : { ok: false, detalhe: 'não encontrado', fazer }
}

/**
 * @param {string} tag
 * @param {{comando: string[], cwd?: string}} providenciar   como obter a imagem quando falta
 * @param {(linha: string) => void} escrever
 * @returns {Promise<Conferencia>}
 */
async function imagem(tag, providenciar, escrever) {
  const existe = async () => (await tentar('docker', ['image', 'inspect', tag])).codigo === 0
  if (await existe()) return { ok: true, detalhe: tag }
  const [comando, ...args] = providenciar.comando
  const texto = providenciar.comando.join(' ')
  escrever(`      a imagem ${tag} não está na máquina; rodando ${texto}`)
  const { codigo, stderr } = await tentar(comando, args, { cwd: providenciar.cwd })
  if (codigo === 0 && (await existe())) return { ok: true, detalhe: `${tag} (obtida agora)` }
  return { ok: false, detalhe: `${tag}: ${primeiraLinha(stderr) || 'não foi possível obter'}`, fazer: `rode em ${providenciar.cwd ?? 'qualquer pasta'}: ${texto}` }
}

/**
 * Um item por linha da saída. `essencial: false` não muda o código de saída.
 * `exige` nomeia um item anterior sem o qual este não tem como ser conferido.
 * @type {{nome: string, essencial: boolean, exige?: string, conferir: (escrever: (linha: string) => void) => Promise<Conferencia>}[]}
 */
const ITENS = [
  {
    nome: `Node ${NODE_MINIMO} ou mais novo`,
    essencial: true,
    conferir: async () => {
      const maior = Number(process.versions.node.split('.')[0])
      return maior >= NODE_MINIMO
        ? { ok: true, detalhe: `v${process.versions.node}` }
        : { ok: false, detalhe: `v${process.versions.node}`, fazer: `instale o Node ${NODE_MINIMO} ou mais novo` }
    },
  },
  { nome: 'git', essencial: true, conferir: () => versaoDe('git', ['--version'], 'instale o git') },
  {
    nome: 'GitHub (gh)',
    essencial: true,
    conferir: async () => {
      const { codigo, stdout, stderr } = await tentar('gh', ['auth', 'status'])
      if (codigo === 0) {
        const conta = (stdout + stderr).split('\n').find((linha) => linha.includes('Logged in')) ?? 'autenticado'
        return { ok: true, detalhe: conta.replace(/^\W+/, '').trim() }
      }
      return { ok: false, detalhe: 'sem acesso', fazer: 'instale o gh e rode: gh auth login' }
    },
  },
  {
    nome: 'Docker',
    essencial: true,
    conferir: async () => {
      const { codigo, stdout } = await tentar('docker', ['info', '--format', '{{.MemTotal}} {{.NCPU}}'])
      if (codigo !== 0) return { ok: false, detalhe: 'não responde', fazer: 'inicie o Docker (colima start --cpu 8 --memory 16)' }
      const [bytes, nucleos] = stdout.trim().split(' ').map(Number)
      const gigas = bytes / 1024 ** 3
      const aviso = gigas < MEMORIA_MINIMA_GB ? `. Aviso: menos de ${MEMORIA_MINIMA_GB} GB; aumente a memória da máquina do Docker` : ''
      return { ok: true, detalhe: `${nucleos} núcleos, ${gigas.toFixed(1)} GB${aviso}` }
    },
  },
  { nome: 'Claude', essencial: true, conferir: () => versaoDe('claude', ['--version'], 'instale o Claude Code e faça login com: claude') },
  {
    nome: 'Imagem do navegador',
    essencial: true,
    exige: 'Docker',
    conferir: (escrever) => imagem(CONFIG.imagens.navegador, { comando: ['docker', 'pull', CONFIG.imagens.navegador] }, escrever),
  },
  {
    nome: 'Imagem base',
    essencial: true,
    exige: 'Docker',
    conferir: (escrever) =>
      imagem(
        CONFIG.imagens.base,
        { comando: ['docker', 'build', '-t', CONFIG.imagens.base, '-f', 'docker/base.Dockerfile', 'docker/'], cwd: DIR_HARNESS },
        escrever,
      ),
  },
  {
    nome: 'Isolamento de rede',
    essencial: true,
    exige: 'Imagem base',
    conferir: async () => {
      const { aplicarIsolamento } = await import('../ferramentas/isolamento.mjs')
      const { ativo, detalhe } = await aplicarIsolamento(CONFIG.imagens.base)
      return ativo ? { ok: true, detalhe } : { ok: false, detalhe, fazer: 'use o colima como Docker desta máquina (colima start --cpu 8 --memory 16)' }
    },
  },
  {
    nome: 'cwebp (opcional)',
    essencial: false,
    conferir: () => versaoDe('cwebp', ['-version'], 'sem ele as capturas ficam maiores; instale com: brew install webp'),
  },
]

/**
 * @param {string[]} argv
 * @param {{escrever?: (linha: string) => void}} [injetado]
 * @returns {Promise<number>} 1 se faltar algo essencial
 */
export function preparar(argv, { escrever = console.log } = {}) {
  return comCodigoDeSaida(async () => {
    analisar(argv, {})
    const faltando = new Set()
    let faltaEssencial = false
    for (const item of ITENS) {
      const conferencia =
        item.exige && faltando.has(item.exige)
          ? { ok: false, detalhe: `depende de ${item.exige}`, fazer: `resolva ${item.exige} e rode preparar.mjs de novo` }
          : await item.conferir(escrever)
      if (!conferencia.ok) {
        faltando.add(item.nome)
        if (item.essencial) faltaEssencial = true
      }
      const marca = conferencia.ok ? 'ok   ' : 'FALTA'
      const fazer = conferencia.fazer ? `. O que fazer: ${conferencia.fazer}` : ''
      escrever(`${marca} ${item.nome}: ${conferencia.detalhe}${fazer}`)
    }
    escrever(faltaEssencial ? 'Falta item essencial. Resolva e rode preparar.mjs de novo.' : 'Tudo pronto para rodar.')
    return faltaEssencial ? 1 : 0
  }, escrever)
}
