/**
 * Conduz cada par (etapa, equipe) uma vez por execução. Não existe arquivo de
 * estado: a situação de uma etapa vem do envelope em disco e do que está
 * rodando agora. `conduzir` primeiro conduz as dependências, calcula a chave,
 * compara com o envelope e só então executa dentro das filas.
 */
import { createHash } from 'node:crypto'
import { setMaxListeners } from 'node:events'
import path from 'node:path'
import { MINUTO } from './etapa.mjs'
import { criarFilas } from './filas.mjs'
import { criarProjecao } from './projecao.mjs'

/** @typedef {'aguardando'|'rodando'|'pronto'|'falhou'|'tempo_esgotado'} Situacao */
/** @typedef {Record<string, Record<string, Situacao>>} Situacoes */

const TERMINAIS = new Set(['pronto', 'falhou', 'tempo_esgotado'])
const RELOGIO_ZERADO = Object.freeze({ espera_ms: 0, preparo_ms: 0, execucao_ms: 0 })
const MOTIVO = { falhou: 'falhou', tempo_esgotado: 'tempo esgotado' }

function canonico(valor) {
  if (valor === undefined || typeof valor === 'function') return 'null'
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor) ?? 'null'
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`
  const chaves = Object.keys(valor).filter((chave) => valor[chave] !== undefined).sort()
  return `{${chaves.map((chave) => `${JSON.stringify(chave)}:${canonico(valor[chave])}`).join(',')}}`
}

const hash = (valor) => createHash('sha256').update(canonico(valor)).digest('hex')

const mapear = (objeto, fn) => Object.fromEntries(Object.entries(objeto).map(([chave, valor]) => [chave, fn(valor)]))

const estaPulada = (resultado) => resultado.saida != null && typeof resultado.saida === 'object' && 'pulada' in resultado.saida

function hashDoSelecionado(dependencia, resultado) {
  if (resultado.desfecho !== 'pronto') return null
  try {
    return hash(dependencia.seletor(resultado.saida))
  } catch {
    // Seletor escrito para a saída completa encontra `{pulada}`: para a chave, é como não ter a parte.
    return null
  }
}

function montarResultado(etapa, chave, desfecho, { saida = null, erro = null, parou_em = null, relogio = RELOGIO_ZERADO } = {}) {
  // A saída passa pelo JSON antes do hash para que o resultado em memória seja igual ao que se lê do disco depois.
  const comoNoDisco = JSON.parse(JSON.stringify(saida ?? null))
  return { etapa: etapa.id, chave, hash_saida: hash(comoNoDisco), desfecho, saida: comoNoDisco, erro, parou_em, relogio: { ...relogio } }
}

/**
 * @param {object} p
 * @param {import('../dominio/tipos.mjs').Rodada} p.rodada
 * @param {import('./registro.mjs').Registro} p.registro
 * @param {ReturnType<typeof import('./armazem.mjs').criarArmazem>} p.armazem
 * @param {Record<import('./etapa.mjs').Fila, number>} p.limites
 * @param {(situacoes: Situacoes) => void} [p.aoMudar]
 * @param {{projetar: (equipe: any, situacoes: Record<string, Situacao>) => Promise<boolean|void>, projetarIndice: () => Promise<unknown>}} [p.projecao]
 * @param {(saidaAgente: any, fontes: any) => Promise<any>} [p.conferir]   substitui `nucleo/conferidor.mjs` em teste
 * @param {number} [p.inatividadeDoPreparo]   teto de `recurso.abrir` sem `pulso`
 * @param {number} [p.carencia]   quanto esperar uma etapa abortada devolver o controle antes de seguir sem ela
 * @returns {{rodar: () => Promise<void>, situacoes: () => Situacoes, abortar: () => void}}
 */
export function criarExecucao({ rodada, registro, armazem, limites, aoMudar, projecao, conferir, inatividadeDoPreparo = 5 * MINUTO, carencia = 5000 }) {
  const filas = criarFilas(limites)
  const projetor = projecao ?? criarProjecao({ rodada, registro, armazem })
  const geral = new AbortController()
  setMaxListeners(0, geral.signal)

  const somente = rodada.opcoes?.somente ?? null
  const refazer = new Set(rodada.opcoes?.refazer ?? [])
  const noFiltro = (equipe) => equipe === null || somente === null || somente.includes(equipe.id)

  /** @type {Map<string, Promise<import('./etapa.mjs').Resultado<any>>>} */
  const conduzidas = new Map()
  /** @type {Map<string, Situacao>} */
  const situacaoDoPar = new Map()
  /** @type {Map<string, Situacao>} */
  const situacaoDoRelatorio = new Map()
  const projecoesPendentes = new Set()

  const donoDe = (etapa, equipe) => (etapa.escopo === 'rodada' ? null : equipe)
  const parDe = (etapa, equipe) => `${etapa.id}\u0000${donoDe(etapa, equipe)?.id ?? ''}`

  const situacoesDe = (equipe) =>
    Object.fromEntries(registro.etapas.map((etapa) => [etapa.id, situacaoDoPar.get(parDe(etapa, equipe)) ?? 'aguardando']))

  const situacoes = () =>
    Object.fromEntries(rodada.equipes.map((equipe) => [equipe.id, { ...situacoesDe(equipe), relatorio: situacaoDoRelatorio.get(equipe.id) ?? 'aguardando' }]))

  function avisar() {
    if (!aoMudar) return
    try {
      aoMudar(situacoes())
    } catch {
      // Quem desenha a tabela não pode derrubar a etapa que acabou de mudar.
    }
  }

  function marcar(etapa, equipe, situacao) {
    situacaoDoPar.set(parDe(etapa, equipe), situacao)
    avisar()
  }

  function pedirProjecao(equipe) {
    situacaoDoRelatorio.set(equipe.id, 'rodando')
    const pedido = Promise.resolve()
      .then(() => projetor.projetar(equipe, situacoesDe(equipe)))
      .then((gravou) => gravou !== false, () => false)
      .then((gravou) => {
        projecoesPendentes.delete(pedido)
        const completo = Object.values(situacoesDe(equipe)).every((situacao) => TERMINAIS.has(situacao))
        situacaoDoRelatorio.set(equipe.id, !gravou ? 'falhou' : completo ? 'pronto' : 'rodando')
        avisar()
      })
    projecoesPendentes.add(pedido)
  }

  async function concluir(etapa, equipe, resultado) {
    if (geral.signal.aborted) return resultado
    await armazem.gravar(etapa, equipe, resultado)
    marcar(etapa, equipe, resultado.desfecho)
    for (const afetada of donoDe(etapa, equipe) === null ? rodada.equipes : [equipe]) pedirProjecao(afetada)
    return resultado
  }

  function reaproveitar(etapa, equipe, resultado) {
    marcar(etapa, equipe, resultado.desfecho)
    return resultado
  }

  /** @returns {Promise<import('./etapa.mjs').Resultado<any>>} nunca rejeita */
  function conduzir(etapa, equipe) {
    const dono = donoDe(etapa, equipe)
    const par = parDe(etapa, dono)
    if (!conduzidas.has(par)) {
      conduzidas.set(
        par,
        umaVez(etapa, dono).catch((erro) => {
          marcar(etapa, dono, 'falhou')
          return montarResultado(etapa, '', 'falhou', { erro: `orquestrador: ${erro?.message ?? erro}` })
        }),
      )
    }
    return conduzidas.get(par)
  }

  async function resolverDependencias(etapa, equipe) {
    const resolvidas = await Promise.all(
      Object.entries(etapa.depende).map(async ([id, dependencia]) => {
        const alvo = registro.porId.get(id)
        if (alvo.escopo === 'rodada' || equipe !== null) return [id, { dependencia, unico: await conduzir(alvo, equipe) }]
        const porEquipe = await Promise.all(rodada.equipes.map(async (outra) => [outra.id, await conduzir(alvo, outra)]))
        return [id, { dependencia, todas: Object.fromEntries(porEquipe) }]
      }),
    )
    return Object.fromEntries(resolvidas)
  }

  async function umaVez(etapa, equipe) {
    if (!noFiltro(equipe)) {
      const doDisco = await armazem.ler(etapa, equipe)
      if (doDisco) return reaproveitar(etapa, equipe, doDisco)
      return montarResultado(etapa, '', 'falhou', { erro: 'fora do filtro' })
    }

    const dependencias = await resolverDependencias(etapa, equipe)
    const chave = hash({
      id: etapa.id,
      versao: etapa.versao,
      entradas: etapa.entradas ? etapa.entradas(equipe, rodada) : null,
      deps: mapear(dependencias, ({ dependencia, unico, todas }) =>
        unico ? hashDoSelecionado(dependencia, unico) : mapear(todas, (resultado) => hashDoSelecionado(dependencia, resultado)),
      ),
    })

    const ignoraEnvelope = etapa.volatil === true || refazer.has(etapa.id)
    const anterior = ignoraEnvelope ? null : await armazem.ler(etapa, equipe)
    const valido = anterior !== null && anterior.chave === chave

    for (const [id, { dependencia, unico }] of Object.entries(dependencias)) {
      if (dependencia.modo !== 'exige' || !unico || unico.desfecho === 'pronto') continue
      if (valido && anterior.desfecho === 'falhou') return reaproveitar(etapa, equipe, anterior)
      return concluir(etapa, equipe, montarResultado(etapa, chave, 'falhou', { erro: `dependência ${id}: ${unico.erro ?? MOTIVO[unico.desfecho]}` }))
    }

    const pastas = armazem.pastas(etapa, equipe)
    const controlador = new AbortController()
    const tentativa = { ultimoPulso: null, parcial: null, aoPulsar: () => {} }

    const ctx = {
      equipe,
      rodada,
      dep(id) {
        const resolvida = dependencias[id]
        if (!resolvida) throw new Error(`etapa ${etapa.id}: ${id} não está em depende`)
        if (!resolvida.unico) throw new Error(`etapa ${etapa.id}: ${id} tem um resultado por equipe; use ctx.depDeTodas`)
        return resolvida.unico
      },
      depDeTodas(id) {
        const resolvida = dependencias[id]
        if (!resolvida) throw new Error(`etapa ${etapa.id}: ${id} não está em depende`)
        if (!resolvida.todas) throw new Error(`etapa ${etapa.id}: ${id} tem um resultado só; use ctx.dep`)
        return resolvida.todas
      },
      recurso: undefined,
      sinal: controlador.signal,
      pulso(linha) {
        tentativa.ultimoPulso = String(linha)
        armazem.registrar(equipe, etapa.id, linha)
        tentativa.aoPulsar()
      },
      parcial(saida) {
        tentativa.parcial = saida
      },
      pastas,
      relativo: (caminhoAbsoluto) => path.relative(pastas.saida, caminhoAbsoluto),
      ...(conferir ? { conferir } : {}),
    }

    const motivoParaPular = etapa.pular ? etapa.pular(ctx) ?? null : null
    if (valido && !(estaPulada(anterior) && motivoParaPular === null)) {
      const semConferencia = anterior.desfecho !== 'pronto' || !etapa.valeAinda || estaPulada(anterior)
      const vale = semConferencia || (await Promise.resolve().then(() => etapa.valeAinda(anterior.saida)).catch(() => false))
      if (vale) return reaproveitar(etapa, equipe, anterior)
    }
    if (motivoParaPular !== null) return concluir(etapa, equipe, montarResultado(etapa, chave, 'pronto', { saida: { pulada: motivoParaPular } }))

    /**
     * Roda `fn` sob um teto. Depois de abortar, espera `carencia` para `fn`
     * devolver o controle e então segue sem ela.
     * @returns {Promise<{estado: 'ok'|'lancou'|'estourou'|'abortado', valor?: any, erro?: any}>}
     */
    function limitar(fn, teto) {
      return new Promise((resolver) => {
        let estourou = false
        let relogioTotal
        let relogioInatividade
        let relogioCarencia
        const disparar = () => {
          estourou = true
          controlador.abort()
        }
        const rearmar = () => {
          if (!('inatividade' in teto)) return
          clearTimeout(relogioInatividade)
          relogioInatividade = setTimeout(disparar, teto.inatividade)
        }
        const interrompido = () => (estourou ? 'estourou' : 'abortado')
        const terminar = (fim) => {
          clearTimeout(relogioTotal)
          clearTimeout(relogioInatividade)
          clearTimeout(relogioCarencia)
          tentativa.aoPulsar = () => {}
          controlador.signal.removeEventListener('abort', aoAbortar)
          resolver(fim)
        }
        const aoAbortar = () => {
          relogioCarencia = setTimeout(() => terminar({ estado: interrompido() }), carencia)
        }
        controlador.signal.addEventListener('abort', aoAbortar, { once: true })
        if ('total' in teto) relogioTotal = setTimeout(disparar, teto.total)
        tentativa.aoPulsar = rearmar
        rearmar()
        Promise.resolve()
          .then(fn)
          .then(
            (valor) => terminar(controlador.signal.aborted ? { estado: interrompido(), valor } : { estado: 'ok', valor }),
            (erro) => terminar(controlador.signal.aborted ? { estado: interrompido() } : { estado: 'lancou', erro }),
          )
      })
    }

    async function tentar(relogio) {
      let recursoAberto = false
      try {
        if (etapa.recurso) {
          const inicio = Date.now()
          const preparo = await limitar(() => etapa.recurso.abrir(ctx), { inatividade: inatividadeDoPreparo })
          relogio.preparo_ms = Date.now() - inicio
          // `abrir` que termina depois do aborto ainda entregou um recurso, e ele precisa ser fechado.
          recursoAberto = preparo.estado === 'ok' || preparo.valor !== undefined
          ctx.recurso = preparo.valor
          if (preparo.estado === 'lancou') return { desfecho: 'falhou', erro: `preparo: ${preparo.erro?.message ?? preparo.erro}` }
          if (preparo.estado === 'estourou') return { desfecho: 'tempo_esgotado', erro: 'preparo sem atividade' }
          if (preparo.estado === 'abortado') return { desfecho: 'falhou', erro: 'abortado' }
        }
        const inicio = Date.now()
        const execucao = await limitar(() => etapa.executar(ctx), etapa.teto)
        relogio.execucao_ms = Date.now() - inicio
        if (execucao.estado === 'ok') return { desfecho: 'pronto', saida: execucao.valor }
        if (execucao.estado === 'estourou') return { desfecho: 'tempo_esgotado', saida: tentativa.parcial, erro: 'tempo esgotado' }
        if (execucao.estado === 'abortado') return { desfecho: 'falhou', erro: 'abortado' }
        return { desfecho: 'falhou', erro: String(execucao.erro?.message ?? execucao.erro) }
      } finally {
        if (recursoAberto) {
          await Promise.resolve()
            .then(() => etapa.recurso.fechar(ctx.recurso))
            .catch((erro) => armazem.registrar(equipe, etapa.id, `recurso.fechar: ${erro?.message ?? erro}`))
        }
      }
    }

    const filasDaEtapa = typeof etapa.fila === 'function' ? etapa.fila({ equipe, rodada, dep: ctx.dep }) : etapa.fila
    const entrouNaFila = Date.now()
    return filas.em(filasDaEtapa, async () => {
      if (geral.signal.aborted) return montarResultado(etapa, chave, 'falhou', { erro: 'abortado' })
      const relogio = { espera_ms: Date.now() - entrouNaFila, preparo_ms: 0, execucao_ms: 0 }
      marcar(etapa, equipe, 'rodando')
      const aoAbortarTudo = () => controlador.abort()
      geral.signal.addEventListener('abort', aoAbortarTudo, { once: true })
      try {
        await armazem.prepararTentativa(etapa, equipe)
        const { desfecho, saida = null, erro = null } = await tentar(relogio)
        const resultado = montarResultado(etapa, chave, desfecho, { saida, erro, parou_em: desfecho === 'pronto' ? null : tentativa.ultimoPulso, relogio })
        if (geral.signal.aborted) {
          // Ctrl+C não deixa envelope: a etapa volta a `aguardando` e o próximo `rodar` a executa.
          marcar(etapa, equipe, 'aguardando')
          return resultado
        }
        return await concluir(etapa, equipe, resultado)
      } finally {
        geral.signal.removeEventListener('abort', aoAbortarTudo)
      }
    })
  }

  async function esvaziarProjecoes() {
    while (projecoesPendentes.size > 0) await Promise.all([...projecoesPendentes])
  }

  async function rodar() {
    const dentro = rodada.equipes.filter(noFiltro)
    const fora = rodada.equipes.filter((equipe) => !noFiltro(equipe))
    const paresDe = (equipes) => equipes.flatMap((equipe) => registro.etapas.map((etapa) => conduzir(etapa, equipe)))

    // As equipes fora do filtro só leem o disco; lidas antes, suas situações já estão certas quando uma etapa de escopo 'rodada' pedir a página delas.
    await Promise.all(paresDe(fora))
    await Promise.all([...paresDe(dentro), ...registro.etapas.filter((etapa) => etapa.escopo === 'rodada').map((etapa) => conduzir(etapa, null))])
    await esvaziarProjecoes()
    if (geral.signal.aborted) return
    for (const equipe of dentro) pedirProjecao(equipe)
    await esvaziarProjecoes()
    await Promise.resolve()
      .then(() => projetor.projetarIndice())
      .catch(() => {})
  }

  return { rodar, situacoes, abortar: () => geral.abort() }
}

/**
 * A situação de cada etapa pelo que já está em disco, sem executar nada e sem
 * recalcular chaves: um envelope de chave antiga ainda aparece com o desfecho dele.
 * @param {{rodada: import('../dominio/tipos.mjs').Rodada, registro: import('./registro.mjs').Registro, armazem: ReturnType<typeof import('./armazem.mjs').criarArmazem>}} p
 * @returns {Promise<Situacoes>}
 */
export async function situacoesDoDisco({ rodada, registro, armazem }) {
  const porEquipe = await Promise.all(
    rodada.equipes.map(async (equipe) => {
      const dasEtapas = await Promise.all(registro.etapas.map(async (etapa) => [etapa.id, (await armazem.ler(etapa, equipe))?.desfecho ?? 'aguardando']))
      const relatorio = (await armazem.temRelatorio(equipe)) ? 'pronto' : 'aguardando'
      return [equipe.id, { ...Object.fromEntries(dasEtapas), relatorio }]
    }),
  )
  return Object.fromEntries(porEquipe)
}
