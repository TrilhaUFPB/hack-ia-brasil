/**
 * `status`: desenha a tabela de andamento a partir do disco, sem executar nada.
 */
import path from 'node:path'
import { desenharTabela } from '../nucleo/tabela.mjs'
import { analisar, comCodigoDeSaida, dirsDe } from './argumentos.mjs'

const OPCOES = { dir: { tipo: 'texto' } }

async function modulosReais() {
  const [armazem, registro, orquestrador] = await Promise.all([
    import('../nucleo/armazem.mjs'),
    import('../nucleo/registro.mjs'),
    import('../nucleo/orquestrador.mjs'),
  ])
  return {
    criarArmazem: armazem.criarArmazem,
    carregarRegistro: registro.carregarRegistro,
    situacoesDoDisco: orquestrador.situacoesDoDisco,
  }
}

/**
 * @param {string[]} argv
 * @param {{escrever?: (linha: string) => void, modulos?: Awaited<ReturnType<typeof modulosReais>>}} [injetado]
 * @returns {Promise<number>} código de saída
 */
export function status(argv, { escrever = console.log, modulos } = {}) {
  return comCodigoDeSaida(async () => {
    const opcoes = analisar(argv, OPCOES)
    const m = modulos ?? (await modulosReais())
    const dirs = dirsDe(opcoes.dir)
    const armazem = m.criarArmazem(dirs)

    const rodada = await armazem.lerRodada()
    if (!rodada) {
      escrever(`Nenhuma rodada gravada em ${path.join(dirs.saida, 'rodada.json')}. Comece com rodar.mjs --csv <arquivo ou link>.`)
      return 1
    }
    const registro = await m.carregarRegistro()
    const situacoes = await m.situacoesDoDisco({ rodada, registro, armazem })
    escrever(desenharTabela({ rodada, registro, situacoes }))
    return 0
  }, escrever)
}
