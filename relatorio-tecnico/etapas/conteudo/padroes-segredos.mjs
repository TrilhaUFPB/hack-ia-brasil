/**
 * Padrões da varredura de segredos. Cada padrão diz o tipo e a expressão; o
 * valor casado serve só para decidir se é exemplo e nunca sai deste módulo.
 */

const PADROES = [
  { tipo: 'chave da Anthropic (sk-ant-)', expressao: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { tipo: 'chave no formato sk- (OpenAI e compatíveis)', expressao: /\bsk-(?!ant-)[A-Za-z0-9_-]{20,}/g },
  { tipo: 'chave de acesso da AWS (AKIA)', expressao: /\bAKIA[0-9A-Z]{16}\b/g },
  { tipo: 'token do GitHub (ghp_)', expressao: /\bghp_[A-Za-z0-9]{36,}/g },
  { tipo: 'token do GitHub (github_pat_)', expressao: /\bgithub_pat_[A-Za-z0-9_]{22,}/g },
  { tipo: 'chave de API do Google (AIza)', expressao: /\bAIza[0-9A-Za-z_-]{35}/g },
  { tipo: 'token do Slack (xox)', expressao: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
  { tipo: 'chave privada (BEGIN PRIVATE KEY)', expressao: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, semFiltroDeExemplo: true },
  {
    tipo: 'JWT de serviço do Supabase (service_role)',
    expressao: /\beyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g,
    semFiltroDeExemplo: true,
    confirma: (achado) => {
      try {
        return JSON.parse(Buffer.from(achado[1], 'base64url').toString('utf8')).role === 'service_role'
      } catch {
        return false
      }
    },
  },
]

const MARCAS_DE_EXEMPLO = /x{3,}|your|seu|sua|change-?me|example|exemplo|placeholder|dummy|fake|test-?key|\.{3}|<|>|\*{3,}|0{8,}|1234567/i

/** @param {string} valor @returns {boolean} */
export function ehValorDeExemplo(valor) {
  return MARCAS_DE_EXEMPLO.test(valor) || new Set(valor).size < 8
}

/**
 * @param {string} linha
 * @returns {string[]} tipos de segredo que a linha contém, sem repetição
 */
export function tiposNaLinha(linha) {
  const tipos = new Set()
  for (const padrao of PADROES) {
    for (const achado of linha.matchAll(padrao.expressao)) {
      if (padrao.confirma && !padrao.confirma(achado)) continue
      if (!padrao.semFiltroDeExemplo && ehValorDeExemplo(achado[0])) continue
      tipos.add(padrao.tipo)
    }
  }
  return [...tipos]
}

export const TIPO_ENV_VERSIONADO = 'arquivo .env versionado com valores preenchidos'

const NOME_DE_ENV = /^\.env(\.[\w.-]+)?$/i
const ENV_DE_EXEMPLO = /example|sample|template|exemplo|dist|defaults?/i
const ATRIBUICAO = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/

/**
 * @param {string} caminho
 * @param {string[]} linhas
 * @returns {number|null} número da primeira linha com valor preenchido, se o arquivo é um `.env` que não é de exemplo
 */
export function linhaPreenchidaDeEnv(caminho, linhas) {
  const nome = caminho.split('/').pop() ?? ''
  if (!NOME_DE_ENV.test(nome) || ENV_DE_EXEMPLO.test(nome)) return null
  const indice = linhas.findIndex((linha) => {
    const valor = linha.match(ATRIBUICAO)?.[2].replace(/\s+#.*$/, '').replace(/^(['"])(.*)\1$/, '$2').trim()
    return Boolean(valor) && !MARCAS_DE_EXEMPLO.test(valor)
  })
  return indice === -1 ? null : indice + 1
}

/** @param {string[]} linhas @returns {string[]} */
export const chavesDeEnv = (linhas) => linhas.map((linha) => linha.match(ATRIBUICAO)?.[1]).filter(Boolean)
