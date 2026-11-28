/**
 * Trava de linguagem: o relatório traz fato, evidência e estado. Texto de agent
 * com palavra de julgamento é recusado inteiro; quem chama decide o que fazer.
 */

/**
 * Sem acento e em minúsculas. Entrada terminada em `o` casa também o feminino
 * e os plurais; as demais casam o plural em `s`.
 */
const PALAVRAS_DE_JULGAMENTO = Object.freeze([
  'mentira', 'mentiu', 'fraude', 'fraudulento', 'enganoso',
  'plagio', 'plagiou', 'plagiado', 'desonesto',
  'otimo', 'excelente', 'pessimo', 'ruim', 'ruins', 'fraco', 'mediocre',
  'amador', 'amadora', 'amadores', 'preguicoso', 'incompetente', 'vergonhoso',
  'brilhante', 'incrivel', 'incriveis', 'impressionante', 'perfeito',
  'horrivel', 'horriveis', 'mal feito', 'bem feito',
  'infelizmente', 'felizmente',
])

const emMinusculasSemAcento = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

function padraoDe(palavra) {
  const corpo = palavra.split(' ').join('\\s+')
  return palavra.endsWith('o') ? `${corpo.slice(0, -1)}[oa]s?` : `${corpo}s?`
}

const PADRAO = new RegExp(`(?<![a-z0-9])(?:${PALAVRAS_DE_JULGAMENTO.map(padraoDe).join('|')})(?![a-z0-9])`, 'g')

/**
 * @param {unknown} texto
 * @returns {{ok: true} | {ok: false, palavras: string[]}}
 */
export function revisar(texto) {
  if (typeof texto !== 'string') return { ok: true }
  const achadas = emMinusculasSemAcento(texto).match(PADRAO)
  if (!achadas) return { ok: true }
  return { ok: false, palavras: [...new Set(achadas.map((achada) => achada.replace(/\s+/g, ' ')))] }
}
