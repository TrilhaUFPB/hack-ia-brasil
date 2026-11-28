/**
 * A chamada não interativa do `claude`. Um agent recebe o prompt pelo stdin,
 * roda sem as configurações de quem iniciou o harness e devolve uma saída já
 * validada pelo CLI contra o schema dos tipos pedidos.
 */
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { achatar, esquemaPara } from '../dominio/afirmacao.mjs'
import { ambienteLimpo, rodar } from './processo.mjs'

const INTERVALO_DO_PULSO = 15_000
const SERVIDOR_MCP = 'navegador'

/**
 * @typedef {object} PedidoDeAgente
 * @property {string} prompt
 * @property {string[]} tipos            chaves de TIPOS_AFIRMACAO
 * @property {string[]} [ferramentas]    por exemplo ['Read', 'Glob', 'Grep']; vazio tira todas
 * @property {string} cwd
 * @property {string[]} [dirsExtras]     pastas legíveis além de `cwd`
 * @property {object} [mcp]              objeto de `configMcpNavegador`
 * @property {string} modelo
 * @property {number} [orcamentoUsd]
 * @property {AbortSignal} [sinal]
 * @property {(linha: string) => void} [pulso]
 */

/**
 * O comando exato, sem executar. `arquivoMcp` é o arquivo onde `pedido.mcp` foi gravado.
 * @param {PedidoDeAgente} pedido
 * @param {string|null} [arquivoMcp]
 * @returns {{comando: string, args: string[], opcoes: {cwd: string, env: Record<string, string>, entrada: string}}}
 */
export function montarChamada(pedido, arquivoMcp = null) {
  const { prompt, tipos, ferramentas = [], cwd, dirsExtras = [], mcp, modelo, orcamentoUsd } = pedido
  const args = [
    '-p', '--restricted', '--strict-mcp-config',
    '--output-format', 'json',
    '--json-schema', JSON.stringify(esquemaPara(tipos)),
    '--model', modelo,
    '--no-session-persistence',
  ]
  if (orcamentoUsd !== undefined) args.push('--max-budget-usd', String(orcamentoUsd))
  args.push('--tools', ferramentas.join(','))
  for (const dir of dirsExtras) args.push('--add-dir', dir)
  if (mcp) {
    if (!arquivoMcp) throw new Error('rodarAgente: pedido com mcp precisa do arquivo de configuração')
    args.push('--mcp-config', arquivoMcp, '--allowedTools', `mcp__${SERVIDOR_MCP}`)
  }
  return { comando: 'claude', args, opcoes: { cwd, env: ambienteLimpo(), entrada: prompt } }
}

/**
 * Lê o stdout do `claude --output-format json`.
 * @param {string} stdout
 * @returns {{saida: Record<string, any[]>, custoUsd: number|null, turnos: number|null} | null}
 *   null quando o stdout não é JSON; lança quando o agent terminou sem saída utilizável
 */
export function lerResposta(stdout) {
  let resposta
  try {
    resposta = JSON.parse(stdout)
  } catch {
    return null
  }
  if (resposta === null || typeof resposta !== 'object' || Array.isArray(resposta)) return null

  const { is_error: comErro, subtype: subtipo, structured_output: saida, result: resultado } = resposta
  if (comErro || subtipo !== 'success' || saida === undefined || saida === null) {
    const inicio = String(resultado ?? '').slice(0, 300)
    throw new Error(`agent terminou sem saída estruturada (${subtipo ?? 'sem subtype'}): ${inicio}`)
  }
  return { saida, custoUsd: resposta.total_cost_usd ?? null, turnos: resposta.num_turns ?? null }
}

const segundosDesde = (inicio) => Math.round((Date.now() - inicio) / 1000)

/**
 * Roda um agent até o fim e devolve o que ele afirmou, ainda sem conferência.
 * @param {PedidoDeAgente} pedido
 * @returns {Promise<import('../dominio/tipos.mjs').AfirmacaoBruta[]>}
 */
export async function rodarAgente(pedido) {
  const { tipos, mcp, sinal, pulso = () => {} } = pedido
  const dirMcp = mcp ? await fsp.mkdtemp(path.join(os.tmpdir(), 'rt-mcp-')) : null
  const arquivoMcp = dirMcp ? path.join(dirMcp, 'mcp.json') : null
  if (arquivoMcp) await fsp.writeFile(arquivoMcp, JSON.stringify(mcp))

  const { comando, args, opcoes } = montarChamada(pedido, arquivoMcp)
  const inicio = Date.now()
  const relogio = setInterval(() => pulso(`agent: ${segundosDesde(inicio)} s`), INTERVALO_DO_PULSO)
  try {
    for (const tentativa of [1, 2]) {
      const { codigo, stdout, stderr } = await rodar(comando, args, { ...opcoes, sinal })
      const resposta = lerResposta(stdout)
      if (resposta) {
        pulso(`agent: terminou em ${segundosDesde(inicio)} s, ${resposta.turnos ?? '?'} turnos, US$ ${resposta.custoUsd?.toFixed(4) ?? '?'}`)
        return achatar(resposta.saida, tipos)
      }
      const fim = (stderr || stdout).trim().slice(-300)
      if (tentativa === 2) throw new Error(`claude saiu com código ${codigo} e o stdout não é JSON: ${fim}`)
      pulso(`agent: stdout não é JSON (código ${codigo}); nova tentativa`)
    }
    throw new Error('inalcançável')
  } finally {
    clearInterval(relogio)
    if (dirMcp) await fsp.rm(dirMcp, { recursive: true, force: true })
  }
}
