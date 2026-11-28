/**
 * O único lugar que inicia processos filhos. Entrega cada linha de saída a
 * `pulso`, que alimenta o log da etapa e o relógio de inatividade.
 */
import { spawn } from 'node:child_process'

const LIMITE_SAIDA = 4 * 1024 * 1024

/**
 * Variáveis do ambiente sem as da sessão do Claude que iniciou o harness.
 * @param {Record<string, string>} [extra]
 * @returns {Record<string, string>}
 */
export function ambienteLimpo(extra = {}) {
  const env = {}
  for (const [nome, valor] of Object.entries(process.env)) {
    if (!nome.startsWith('CLAUDE') && valor !== undefined) env[nome] = valor
  }
  return { ...env, ...extra }
}

/**
 * Roda um comando até o fim. Não rejeita por código de saída diferente de zero:
 * quem chama decide. Rejeita se o comando não existe ou se `sinal` abortar.
 * @param {string} comando
 * @param {string[]} args
 * @param {object} [opcoes]
 * @param {string} [opcoes.cwd]
 * @param {Record<string, string>} [opcoes.env]   substitui o ambiente; use `ambienteLimpo()`
 * @param {AbortSignal} [opcoes.sinal]
 * @param {string} [opcoes.entrada]               texto enviado ao stdin
 * @param {(linha: string) => void} [opcoes.pulso]
 * @returns {Promise<{codigo: number, stdout: string, stderr: string}>}
 */
export function rodar(comando, args, opcoes = {}) {
  const { cwd, env, sinal, entrada, pulso } = opcoes
  return new Promise((resolver, rejeitar) => {
    if (sinal?.aborted) return rejeitar(new Error(`abortado antes de iniciar: ${comando}`))
    const filho = spawn(comando, args, { cwd, env: env ?? ambienteLimpo(), stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const restos = { out: '', err: '' }

    const receber = (qual) => (pedaco) => {
      const texto = pedaco.toString('utf8')
      if (qual === 'out') stdout = (stdout + texto).slice(-LIMITE_SAIDA)
      else stderr = (stderr + texto).slice(-LIMITE_SAIDA)
      if (!pulso) return
      const linhas = (restos[qual] + texto).split('\n')
      restos[qual] = linhas.pop() ?? ''
      for (const linha of linhas) pulso(linha)
    }
    filho.stdout.on('data', receber('out'))
    filho.stderr.on('data', receber('err'))

    const abortar = () => {
      filho.kill('SIGTERM')
      setTimeout(() => filho.kill('SIGKILL'), 3000).unref()
    }
    sinal?.addEventListener('abort', abortar, { once: true })

    filho.on('error', (erro) => {
      sinal?.removeEventListener('abort', abortar)
      rejeitar(new Error(`não foi possível iniciar ${comando}: ${erro.message}`))
    })
    filho.on('close', (codigo) => {
      sinal?.removeEventListener('abort', abortar)
      if (pulso) for (const resto of [restos.out, restos.err]) if (resto) pulso(resto)
      if (sinal?.aborted) return rejeitar(new Error(`abortado: ${comando}`))
      resolver({ codigo: codigo ?? -1, stdout, stderr })
    })

    filho.stdin.on('error', () => {})
    filho.stdin.end(entrada ?? '')
  })
}

/**
 * Como `rodar`, mas lança se o código de saída não for zero.
 * @param {string} comando
 * @param {string[]} args
 * @param {Parameters<typeof rodar>[2]} [opcoes]
 * @returns {Promise<string>} stdout
 */
export async function rodarOuLancar(comando, args, opcoes) {
  const { codigo, stdout, stderr } = await rodar(comando, args, opcoes)
  if (codigo !== 0) {
    const fim = (stderr || stdout).trim().split('\n').slice(-5).join('\n')
    throw new Error(`${comando} ${args.slice(0, 3).join(' ')} saiu com código ${codigo}: ${fim}`)
  }
  return stdout
}
