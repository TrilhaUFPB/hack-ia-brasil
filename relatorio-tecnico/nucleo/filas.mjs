/**
 * Três semáforos, um por fila. Quem precisa de mais de uma fila adquire sempre
 * na ordem de `FILAS`, o que impede espera circular.
 */
import { FILAS } from './etapa.mjs'

/**
 * @param {Record<import('./etapa.mjs').Fila, number>} limites
 * @returns {{em: <T>(filas: import('./etapa.mjs').Fila | import('./etapa.mjs').Fila[], fn: () => Promise<T>) => Promise<T>}}
 */
export function criarFilas(limites) {
  const estado = {}
  for (const nome of FILAS) {
    const limite = limites?.[nome]
    if (!Number.isInteger(limite) || limite < 1) throw new Error(`fila ${nome}: limite precisa ser inteiro maior que zero`)
    estado[nome] = { livres: limite, espera: [] }
  }

  const adquirir = (nome) => {
    const fila = estado[nome]
    if (fila.livres > 0) {
      fila.livres -= 1
      return Promise.resolve()
    }
    return new Promise((resolver) => fila.espera.push(resolver))
  }

  const liberar = (nome) => {
    const fila = estado[nome]
    const proximo = fila.espera.shift()
    if (proximo) proximo()
    else fila.livres += 1
  }

  async function em(filas, fn) {
    const pedidas = [].concat(filas)
    const desconhecida = pedidas.find((nome) => !FILAS.includes(nome))
    if (desconhecida !== undefined) throw new Error(`fila desconhecida: ${desconhecida}`)
    const adquiridas = []
    try {
      for (const nome of FILAS.filter((fila) => pedidas.includes(fila))) {
        await adquirir(nome)
        adquiridas.push(nome)
      }
      return await fn()
    } finally {
      for (const nome of adquiridas.reverse()) liberar(nome)
    }
  }

  return { em }
}
