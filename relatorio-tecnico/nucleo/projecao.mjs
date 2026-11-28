/**
 * Transforma os envelopes publicáveis de uma equipe em `relatorio.json` e
 * `relatorio.html`. Uma projeção por equipe de cada vez; pedidos que chegam
 * durante uma projeção viram uma única projeção seguinte, com as situações do
 * pedido mais recente.
 */

const TERMINAIS = new Set(['pronto', 'falhou', 'tempo_esgotado'])

async function modulosReais() {
  const [relatorio, capturas, render, indice] = await Promise.all([
    import('../dominio/relatorio.mjs'),
    import('../pagina/capturas.mjs'),
    import('../pagina/render.mjs'),
    import('../pagina/indice.mjs'),
  ])
  return {
    montar: relatorio.montar,
    validarRelatorio: relatorio.validarRelatorio,
    criarEmbutidor: capturas.criarEmbutidor,
    renderizar: render.renderizar,
    renderizarIndice: indice.renderizarIndice,
  }
}

/**
 * @param {object} p
 * @param {import('../dominio/tipos.mjs').Rodada} p.rodada
 * @param {import('./registro.mjs').Registro} p.registro
 * @param {ReturnType<typeof import('./armazem.mjs').criarArmazem>} p.armazem
 * @param {() => Promise<Awaited<ReturnType<typeof modulosReais>>>} [p.modulos] substitui `dominio/` e `pagina/` em teste
 */
export function criarProjecao({ rodada, registro, armazem, modulos = modulosReais }) {
  // `montar` só chama `relatar` de quem está na lista com `relatar`: o agent entra sem.
  const etapas = registro.etapas.map((etapa) =>
    etapa.natureza === 'agente'
      ? { id: etapa.id, titulo: etapa.titulo, coluna: etapa.coluna }
      : { id: etapa.id, titulo: etapa.titulo, coluna: etapa.coluna, resumo: etapa.resumo, relatar: etapa.relatar },
  )

  /** @type {Map<string, {emCurso: Promise<boolean>, agendada: Promise<boolean>|null, situacoes: Record<string, string>}>} */
  const porEquipe = new Map()

  async function umaProjecao(equipe, situacoes) {
    try {
      const { montar, validarRelatorio, criarEmbutidor, renderizar } = await modulos()
      const doDisco = await armazem.lerPublicaveis(registro, equipe)
      // Envelope de chave antiga continua no disco enquanto a etapa roda de novo; ele não entra na página.
      const resultados = Object.fromEntries(Object.entries(doDisco).filter(([id]) => TERMINAIS.has(situacoes[id])))
      const relatorio = montar({ equipe, rodada, etapas, resultados, situacoes, agora: new Date() })
      validarRelatorio(relatorio)
      const html = await renderizar(relatorio, criarEmbutidor(armazem.pastaSaida(equipe)))
      await armazem.gravarRelatorio(equipe, relatorio, html)
      return true
    } catch (erro) {
      armazem.registrar(equipe, 'projecao', erro?.stack ?? String(erro))
      return false
    }
  }

  /**
   * @param {import('../dominio/tipos.mjs').Equipe} equipe
   * @param {Record<string, string>} situacoesDaEquipe
   * @returns {Promise<boolean>} false se a projeção falhou; o motivo fica em `logs/projecao.log`
   */
  function projetar(equipe, situacoesDaEquipe) {
    let estado = porEquipe.get(equipe.id)
    if (!estado) {
      estado = { emCurso: Promise.resolve(true), agendada: null, situacoes: situacoesDaEquipe }
      porEquipe.set(equipe.id, estado)
    }
    estado.situacoes = situacoesDaEquipe
    if (estado.agendada) return estado.agendada
    const agendada = estado.emCurso.then(() => {
      estado.agendada = null
      return umaProjecao(equipe, estado.situacoes)
    })
    estado.agendada = agendada
    estado.emCurso = agendada
    return agendada
  }

  /** @returns {Promise<boolean>} */
  async function projetarIndice() {
    try {
      const { renderizarIndice } = await modulos()
      const { html, json } = renderizarIndice(await armazem.lerRelatorios(), rodada)
      await armazem.gravarIndice(json, html)
      return true
    } catch (erro) {
      armazem.registrar(null, 'projecao', erro?.stack ?? String(erro))
      return false
    }
  }

  return { projetar, projetarIndice }
}
