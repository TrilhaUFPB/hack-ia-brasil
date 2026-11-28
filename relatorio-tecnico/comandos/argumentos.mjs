/**
 * Leitura da linha de comando. Cada comando declara suas opções em uma tabela
 * e recebe os valores já validados. Todo erro de uso sai daqui.
 */
import path from 'node:path'
import { CONFIG } from '../config.mjs'

/** Opção desconhecida ou valor inválido. O comando sai com código 2. */
export class ErroDeUso extends Error {}

/**
 * @typedef {object} Opcao
 * @property {'texto'|'escolha'|'inteiro'|'instante'|'marca'} tipo   `marca` não recebe valor
 * @property {string[]} [valores]     para `escolha`
 * @property {boolean} [repetivel]    o resultado é uma lista
 * @property {unknown} [padrao]
 */

const LEITORES = {
  texto: (valor) => valor,
  escolha: (valor, nome, opcao) => {
    if (!opcao.valores.includes(valor)) throw new ErroDeUso(`--${nome} aceita ${opcao.valores.join(', ')}. Recebeu "${valor}".`)
    return valor
  },
  inteiro: (valor, nome) => {
    if (!/^[1-9]\d*$/.test(valor)) throw new ErroDeUso(`--${nome} precisa de um número inteiro maior que zero. Recebeu "${valor}".`)
    return Number(valor)
  },
  instante: (valor, nome) => {
    if (Number.isNaN(Date.parse(valor))) {
      throw new ErroDeUso(`--${nome} precisa de data e hora em ISO 8601, como 2026-11-28T16:00:00-03:00. Recebeu "${valor}".`)
    }
    return valor
  },
}

/**
 * @param {string[]} argv            argumentos depois do nome do script
 * @param {Record<string, Opcao>} opcoes
 * @returns {Record<string, any>}    um valor por opção; ausente vira `padrao`, `[]` se repetível, `false` se marca, senão `null`
 */
export function analisar(argv, opcoes) {
  const lido = {}
  for (const [nome, opcao] of Object.entries(opcoes)) {
    lido[nome] = opcao.padrao ?? (opcao.repetivel ? [] : opcao.tipo === 'marca' ? false : null)
  }

  const fila = [...argv]
  while (fila.length > 0) {
    const argumento = fila.shift()
    if (!argumento.startsWith('--')) throw new ErroDeUso(`Argumento solto: "${argumento}". ${descrever(opcoes)}`)
    const [nome, colado] = separar(argumento.slice(2))
    const opcao = Object.hasOwn(opcoes, nome) ? opcoes[nome] : null
    if (!opcao) throw new ErroDeUso(`Opção desconhecida: --${nome}. ${descrever(opcoes)}`)

    if (opcao.tipo === 'marca') {
      if (colado !== null) throw new ErroDeUso(`--${nome} não recebe valor.`)
      lido[nome] = true
      continue
    }
    const bruto = colado ?? fila.shift()
    if (bruto === undefined || (colado === null && bruto.startsWith('--'))) throw new ErroDeUso(`--${nome} precisa de um valor.`)
    const valor = LEITORES[opcao.tipo](bruto, nome, opcao)
    if (opcao.repetivel) lido[nome] = [...lido[nome], valor]
    else lido[nome] = valor
  }
  return lido
}

function separar(texto) {
  const igual = texto.indexOf('=')
  return igual === -1 ? [texto, null] : [texto.slice(0, igual), texto.slice(igual + 1)]
}

const descrever = (opcoes) => `Opções aceitas: ${Object.keys(opcoes).map((nome) => `--${nome}`).join(', ')}.`

/**
 * Nome ou id de equipe em forma comparável: sem acento, sem espaço nas pontas, em minúsculas.
 * @param {string} texto
 */
export const paraComparar = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

/** @param {string|null} dir valor de `--dir` @returns {{trabalho: string, saida: string}} */
export function dirsDe(dir) {
  const raiz = path.resolve(dir ?? CONFIG.dirDados)
  return { trabalho: path.join(raiz, 'trabalho'), saida: path.join(raiz, 'saida') }
}

/**
 * Executa um comando e devolve o código de saída. Erro de uso vira código 2 com
 * a mensagem; qualquer outro erro vira código 1.
 * @param {() => Promise<number>} corpo
 * @param {(linha: string) => void} escrever
 */
export async function comCodigoDeSaida(corpo, escrever) {
  try {
    return await corpo()
  } catch (erro) {
    if (erro instanceof ErroDeUso) {
      escrever(erro.message)
      return 2
    }
    escrever(`Erro: ${erro?.message ?? erro}`)
    return 1
  }
}
