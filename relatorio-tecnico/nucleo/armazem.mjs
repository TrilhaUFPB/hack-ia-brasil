/**
 * O único módulo que conhece os caminhos em disco. Toda gravação vai para um
 * arquivo temporário e chega ao destino por rename, então quem lê nunca vê um
 * arquivo pela metade e uma queda no meio deixa só um `.tmp` que ninguém lê.
 */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

const DA_RODADA = '_rodada'

const idDe = (equipe) => (equipe == null ? DA_RODADA : typeof equipe === 'string' ? equipe : equipe.id)

async function gravarAtomico(destino, texto) {
  await fsp.mkdir(path.dirname(destino), { recursive: true })
  const temporario = `${destino}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  await fsp.writeFile(temporario, texto)
  await fsp.rename(temporario, destino)
}

async function lerJson(caminho) {
  try {
    return JSON.parse(await fsp.readFile(caminho, 'utf8'))
  } catch {
    return null
  }
}

/**
 * @param {{trabalho: string, saida: string}} dirs caminhos absolutos
 */
export function criarArmazem({ trabalho, saida }) {
  const pastasDeLogCriadas = new Set()

  const pastaSaida = (equipe) => path.join(saida, idDe(equipe))
  const pastaTrabalho = (equipe) => path.join(trabalho, idDe(equipe))
  const donoDe = (etapa, equipe) => (etapa.escopo === 'rodada' ? null : equipe)

  const caminhoDoEnvelope = (etapa, equipe) =>
    etapa.natureza === 'agente'
      ? path.join(pastaTrabalho(donoDe(etapa, equipe)), 'bruto', `${etapa.id}.json`)
      : path.join(pastaSaida(donoDe(etapa, equipe)), 'etapas', `${etapa.id}.json`)

  /** @returns {{capturas: string, logs: string, trabalho: string, saida: string}} */
  const pastas = (etapa, equipe) => {
    const dono = donoDe(etapa, equipe)
    return {
      capturas: path.join(pastaSaida(dono), 'capturas', etapa.id),
      logs: path.join(pastaSaida(dono), 'logs'),
      trabalho: pastaTrabalho(dono),
      saida: pastaSaida(dono),
    }
  }

  return {
    pastaSaida,
    pastaTrabalho,
    pastas,

    /** @returns {Promise<import('./etapa.mjs').Resultado<any>|null>} null se não existe ou não é JSON inteiro */
    ler: (etapa, equipe) => lerJson(caminhoDoEnvelope(etapa, equipe)),

    gravar: (etapa, equipe, resultado) => gravarAtomico(caminhoDoEnvelope(etapa, equipe), JSON.stringify(resultado, null, 2)),

    apagar: (etapa, equipe) => fsp.rm(caminhoDoEnvelope(etapa, equipe), { force: true }),

    async prepararTentativa(etapa, equipe) {
      const alvo = pastas(etapa, equipe)
      await fsp.rm(alvo.capturas, { recursive: true, force: true })
      await Promise.all([alvo.capturas, alvo.logs, alvo.trabalho].map((pasta) => fsp.mkdir(pasta, { recursive: true })))
    },

    /** Síncrono para que as linhas de um mesmo processo cheguem ao log na ordem. */
    registrar(equipe, nome, linha) {
      const pasta = path.join(pastaSaida(equipe), 'logs')
      if (!pastasDeLogCriadas.has(pasta)) {
        fs.mkdirSync(pasta, { recursive: true })
        pastasDeLogCriadas.add(pasta)
      }
      fs.appendFileSync(path.join(pasta, `${nome}.log`), `${new Date().toISOString()} ${linha}\n`)
    },

    /**
     * Envelopes publicáveis de uma equipe, mais os das etapas de escopo 'rodada'.
     * Nunca abre `trabalho/`.
     * @returns {Promise<Record<string, import('./etapa.mjs').Resultado<any>>>}
     */
    async lerPublicaveis(registro, equipe) {
      const publicaveis = registro.etapas.filter((etapa) => etapa.natureza !== 'agente')
      const lidos = await Promise.all(publicaveis.map(async (etapa) => [etapa.id, await lerJson(caminhoDoEnvelope(etapa, equipe))]))
      return Object.fromEntries(lidos.filter(([, resultado]) => resultado !== null))
    },

    gravarRodada: (rodada) => gravarAtomico(path.join(saida, 'rodada.json'), JSON.stringify(rodada, null, 2)),

    /** @returns {Promise<import('../dominio/tipos.mjs').Rodada|null>} */
    lerRodada: () => lerJson(path.join(saida, 'rodada.json')),

    async gravarFormulario(equipe) {
      const pasta = path.join(pastaTrabalho(equipe), 'formulario')
      await gravarAtomico(path.join(pasta, 'descricao.md'), equipe.descricao ?? '')
      await gravarAtomico(path.join(pasta, 'resumo.md'), equipe.resumo ?? '')
    },

    async gravarRelatorio(equipe, relatorio, html) {
      await gravarAtomico(path.join(pastaSaida(equipe), 'relatorio.json'), JSON.stringify(relatorio, null, 2))
      await gravarAtomico(path.join(pastaSaida(equipe), 'relatorio.html'), html)
    },

    temRelatorio: (equipe) => fsp.access(path.join(pastaSaida(equipe), 'relatorio.json')).then(() => true, () => false),

    /** @returns {Promise<import('../dominio/tipos.mjs').Relatorio[]>} em ordem de id da equipe */
    async lerRelatorios() {
      const entradas = await fsp.readdir(saida, { withFileTypes: true }).catch(() => [])
      const ids = entradas.filter((entrada) => entrada.isDirectory() && entrada.name !== DA_RODADA).map((entrada) => entrada.name).sort()
      const lidos = await Promise.all(ids.map((id) => lerJson(path.join(saida, id, 'relatorio.json'))))
      return lidos.filter((relatorio) => relatorio !== null)
    },

    async gravarIndice(json, html) {
      await gravarAtomico(path.join(saida, 'indice.json'), JSON.stringify(json, null, 2))
      await gravarAtomico(path.join(saida, 'index.html'), html)
    },
  }
}
