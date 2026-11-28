/** @typedef {import('../../dominio/tipos.mjs').Conferido} Conferido */
/** @typedef {import('../../dominio/tipos.mjs').AfirmacaoBruta} AfirmacaoBruta */

/**
 * @param {Conferido|null} conferido
 * @returns {{id: string, citacao: string, classe: string}[]}
 */
export function promessasDe(conferido) {
  return (conferido?.afirmacoes ?? [])
    .filter((afirmacao) => afirmacao.tipo === 'promessa')
    .map((afirmacao) => ({ id: afirmacao.id, citacao: String(afirmacao.dados.citacao), classe: String(afirmacao.dados.classe) }))
}

/**
 * @param {Conferido|null} conferido
 * @returns {{descricao: string|null, passos: string[]}|null}
 */
export function fluxoDe(conferido) {
  const fluxo = (conferido?.afirmacoes ?? []).find((afirmacao) => afirmacao.tipo === 'fluxo_principal')
  if (!fluxo) return null
  return { descricao: fluxo.dados.descricao ?? null, passos: /** @type {string[]} */ (fluxo.dados.passos ?? []) }
}

/**
 * Mantém, entre as afirmações de `tipo`, só a primeira de cada promessa conhecida.
 * As dos outros tipos passam intactas.
 * @param {AfirmacaoBruta[]} afirmacoes
 * @param {string} tipo
 * @param {string[]} idsDePromessa
 * @returns {{afirmacoes: AfirmacaoBruta[], de_promessa_desconhecida: number, repetidas: number}}
 */
export function soDePromessasConhecidas(afirmacoes, tipo, idsDePromessa) {
  const conhecidas = new Set(idsDePromessa)
  const vistas = new Set()
  let desconhecidas = 0
  let repetidas = 0
  const mantidas = afirmacoes.filter((afirmacao) => {
    if (afirmacao.tipo !== tipo) return true
    const promessa = String(afirmacao.dados.promessa)
    if (!conhecidas.has(promessa)) {
      desconhecidas += 1
      return false
    }
    if (vistas.has(promessa)) {
      repetidas += 1
      return false
    }
    vistas.add(promessa)
    return true
  })
  return { afirmacoes: mantidas, de_promessa_desconhecida: desconhecidas, repetidas }
}

/**
 * @param {string} id
 * @param {string} rotulo
 * @param {import('../../dominio/estados.mjs').EstadoItem} estado
 * @param {Partial<import('../../dominio/tipos.mjs').Item>} [resto]
 * @returns {import('../../dominio/tipos.mjs').Item}
 */
export const item = (id, rotulo, estado, resto = {}) => ({ tipo: 'item', id, rotulo, estado, evidencias: [], ...resto })
