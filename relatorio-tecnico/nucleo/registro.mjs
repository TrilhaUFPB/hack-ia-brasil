/**
 * O grafo de etapas. Cada `.mjs` direto na pasta de etapas é uma etapa; para
 * cada etapa de agent o registro acrescenta a derivada `<id>.conferido`, a
 * única que pode ler a saída bruta do agent.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { exige, tolera, MINUTO } from './etapa.mjs'

const DIR_ETAPAS = path.join(import.meta.dirname, '..', 'etapas')

/** @typedef {{etapas: import('./etapa.mjs').Etapa<any, any>[], porId: Map<string, import('./etapa.mjs').Etapa<any, any>>}} Registro */

function derivarConferido(agente, temCorte) {
  const depende = { [agente.id]: exige() }
  if (temCorte) depende.corte = tolera((corte) => corte.sha)

  return Object.freeze({
    id: `${agente.id}.conferido`,
    titulo: `${agente.titulo}: conferência`,
    coluna: 'conferidor',
    natureza: 'etapa',
    escopo: agente.escopo,
    fila: 'scripts',
    versao: 1,
    depende,
    teto: { total: 5 * MINUTO },
    resumo: agente.resumo,
    async executar(ctx) {
      const conferir = ctx.conferir ?? (await import('./conferidor.mjs')).conferir
      const corte = temCorte ? ctx.dep('corte').saida : null
      return conferir(ctx.dep(agente.id).saida, {
        codigo: corte?.codigo ?? null,
        repo: corte?.repo ?? null,
        sha: corte?.sha ?? null,
        formulario: path.join(ctx.pastas.trabalho, 'formulario'),
        saida: ctx.pastas.saida,
      })
    },
    relatar: agente.relatar
      ? (saida, equipe) => agente.relatar({ ...saida, doTipo: (tipo) => saida.afirmacoes.filter((afirmacao) => afirmacao.tipo === tipo) }, equipe)
      : undefined,
  })
}

function validarGrafo(etapas, porId) {
  for (const etapa of etapas) {
    for (const idDependencia of Object.keys(etapa.depende)) {
      const alvo = porId.get(idDependencia)
      if (!alvo) throw new Error(`etapa ${etapa.id}: depende de ${idDependencia}, que não existe`)
      if (alvo.natureza === 'agente' && etapa.id !== `${alvo.id}.conferido`) {
        throw new Error(`etapa ${etapa.id}: depende direto do agent ${alvo.id}; dependa de ${alvo.id}.conferido`)
      }
    }
  }

  const estado = new Map()
  const visitar = (etapa, caminho) => {
    if (estado.get(etapa.id) === 'fechada') return
    if (estado.get(etapa.id) === 'aberta') throw new Error(`ciclo de dependência: ${[...caminho, etapa.id].join(' -> ')}`)
    estado.set(etapa.id, 'aberta')
    for (const idDependencia of Object.keys(etapa.depende)) visitar(porId.get(idDependencia), [...caminho, etapa.id])
    estado.set(etapa.id, 'fechada')
  }
  for (const etapa of etapas) visitar(etapa, [])

  const donas = new Map()
  for (const etapa of etapas) {
    // O `resumo` de um agent pertence à derivada, que é quem chama `relatar`.
    if (etapa.natureza === 'agente') continue
    for (const chave of etapa.resumo ?? []) {
      if (donas.has(chave)) throw new Error(`resumo.${chave}: duas donas, ${donas.get(chave)} e ${etapa.id}`)
      donas.set(chave, etapa.id)
    }
  }
}

/**
 * @param {string} [dirEtapas]
 * @returns {Promise<Registro>}
 */
export async function carregarRegistro(dirEtapas = DIR_ETAPAS) {
  const entradas = await fsp.readdir(dirEtapas, { withFileTypes: true })
  const arquivos = entradas.filter((entrada) => entrada.isFile() && entrada.name.endsWith('.mjs')).map((entrada) => entrada.name).sort()

  const declaradas = []
  for (const arquivo of arquivos) {
    const modulo = await import(pathToFileURL(path.join(dirEtapas, arquivo)).href)
    const declarada = modulo.default
    if (!declarada?.id || !declarada.natureza) throw new Error(`etapas/${arquivo}: falta export default etapa({...}) ou agente({...})`)
    declaradas.push(declarada)
  }

  const temCorte = declaradas.some((etapa) => etapa.id === 'corte')
  const etapas = declaradas.flatMap((etapa) => (etapa.natureza === 'agente' ? [etapa, derivarConferido(etapa, temCorte)] : [etapa]))

  const porId = new Map()
  for (const etapa of etapas) {
    if (porId.has(etapa.id)) throw new Error(`etapa ${etapa.id}: id repetido`)
    porId.set(etapa.id, etapa)
  }
  validarGrafo(etapas, porId)
  return { etapas, porId }
}
