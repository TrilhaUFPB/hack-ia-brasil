/**
 * As duas tabelas de estado do relatório. Rótulo, marcador, enum do schema dos
 * agents e regra do conferidor derivam daqui.
 */

export const ESTADO_ITEM = Object.freeze({
  verificado: { rotulo: 'verificado', marcador: '●' },
  falhou: { rotulo: 'falhou', marcador: '✕' },
  nao_testavel: { rotulo: 'não foi possível testar', marcador: '◌' },
  nao_informado: { rotulo: 'não informado', marcador: '–' },
})

/**
 * `prova: 'codigo'` exige ao menos uma evidência de arquivo conferida.
 * `exige` lista os campos de texto que o agent precisa preencher nesse estado.
 */
export const ESTADO_DECLARACAO = Object.freeze({
  confirmada: { rotulo: 'confirmada', marcador: '●', prova: 'codigo', exige: [] },
  parcial: { rotulo: 'parcial', marcador: '◐', prova: 'codigo', exige: ['existe', 'falta'] },
  nao_encontrada: { rotulo: 'não encontrada', marcador: '○', prova: 'nenhuma', exige: ['onde_procurou'] },
  contradita: { rotulo: 'contradita', marcador: '≠', prova: 'codigo', exige: ['o_que_faz'] },
  nao_verificavel: { rotulo: 'não verificável pelo código', marcador: '?', prova: 'nenhuma', exige: [] },
})

export const RESULTADO_USO = Object.freeze(['funcionou', 'falhou', 'nao_testavel'])

/**
 * @typedef {{estado: 'verificado', alcance?: {ate: number, de: number}}
 *   | {estado: 'falhou', erro: string}
 *   | {estado: 'nao_testavel', motivo: string}
 *   | {estado: 'nao_informado'}} EstadoItem
 * @typedef {keyof typeof ESTADO_DECLARACAO} EstadoDeclaracao
 */

/** @param {{ate: number, de: number}} [alcance] "verificado até o passo N de M" @returns {EstadoItem} */
export const verificado = (alcance) => (alcance ? { estado: 'verificado', alcance } : { estado: 'verificado' })

/** @param {string} erro @returns {EstadoItem} */
export const falhou = (erro) => ({ estado: 'falhou', erro })

/** Só para bloqueio externo ou tempo esgotado. @param {string} motivo @returns {EstadoItem} */
export const naoTestavel = (motivo) => ({ estado: 'nao_testavel', motivo })

/** @returns {EstadoItem} */
export const naoInformado = () => ({ estado: 'nao_informado' })

/**
 * @param {'funcionou'|'falhou'|'nao_testavel'} resultado
 * @param {{erro?: string|null, motivo?: string|null}} [detalhe]
 * @returns {EstadoItem}
 */
export function estadoDeUso(resultado, detalhe = {}) {
  if (resultado === 'funcionou') return verificado()
  if (resultado === 'falhou') return falhou(detalhe.erro || 'falhou no uso')
  return naoTestavel(detalhe.motivo || 'motivo não informado')
}
