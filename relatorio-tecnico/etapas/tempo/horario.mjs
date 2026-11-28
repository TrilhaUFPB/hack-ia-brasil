const PARTES = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** @param {string} iso @returns {Record<'day'|'month'|'hour'|'minute', string>} */
function partes(iso) {
  return Object.fromEntries(PARTES.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
}

/** @param {string} iso @returns {string} `dd/MM HH:mm` */
export function horarioDeBrasilia(iso) {
  const p = partes(iso)
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`
}

/** @param {string} iso @returns {string} `dd/MM HHh`, a hora cheia que contém o instante */
export function horaDeBrasilia(iso) {
  const p = partes(iso)
  return `${p.day}/${p.month} ${p.hour}h`
}

/** @param {string} sha */
export const shaCurto = (sha) => sha.slice(0, 7)

/** @param {string} texto @param {number} [limite] */
export const encurtar = (texto, limite = 80) => (texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto)
