/**
 * Todo link informado por uma equipe passa por aqui antes de ser aberto. Um
 * link de demo que aponta para `localhost` ou para a rede local faria o
 * harness capturar um serviço interno e publicar a imagem no relatório.
 */
import dns from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'

/**
 * `net.BlockList` também reconhece a forma IPv6 de um endereço IPv4
 * (`::ffff:7f00:1`), que é como a classe URL reescreve `[::ffff:127.0.0.1]`.
 */
const INTERNOS = new net.BlockList()
for (const [base, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3],
]) INTERNOS.addSubnet(base, bits, 'ipv4')
// ::/96, 64:ff9b::/96 e 2002::/16 carregam um IPv4 embutido que pode ser interno; ficam bloqueados inteiros.
for (const [base, bits] of [
  ['::', 96], ['64:ff9b::', 96], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
]) INTERNOS.addSubnet(base, bits, 'ipv6')

/**
 * @param {string} ip endereço IPv4 ou IPv6
 * @returns {boolean} true para loopback, rede privada, link-local, CGNAT, multicast, não especificado e texto que não é IP
 */
export function enderecoInterno(ip) {
  const familia = net.isIP(ip)
  if (familia === 0) return true
  return INTERNOS.check(ip, familia === 6 ? 'ipv6' : 'ipv4')
}

/**
 * O que dá para decidir sem consultar o DNS: esquema, credenciais, IP literal e nomes reservados.
 * @param {string} texto
 * @returns {{ok: true, url: URL, literal: boolean} | {ok: false, motivo: string}}
 */
function validarForma(texto) {
  let url
  try {
    url = new URL(String(texto).trim())
  } catch {
    return { ok: false, motivo: 'link inválido' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, motivo: 'o link não é http nem https' }
  if (url.username || url.password) return { ok: false, motivo: 'o link traz usuário ou senha' }

  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host)) {
    return enderecoInterno(host) ? { ok: false, motivo: 'o link aponta para um endereço interno' } : { ok: true, url, literal: true }
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, motivo: 'o link aponta para um endereço interno' }
  }
  return { ok: true, url, literal: false }
}

/**
 * Resolve o nome e recusa se qualquer endereço for interno.
 * @param {string} host
 * @param {(host: string, opcoes: {all: true}) => Promise<{address: string, family: number}[]>} consultar
 * @returns {Promise<{address: string, family: number}[]>}
 */
async function resolverPublico(host, consultar) {
  let enderecos
  try {
    enderecos = await consultar(host, { all: true })
  } catch {
    throw new Error(`o nome ${host} não resolve`)
  }
  if (enderecos.length === 0) throw new Error(`o nome ${host} não resolve`)
  if (enderecos.some((endereco) => enderecoInterno(endereco.address))) throw new Error('o link aponta para um endereço interno')
  return enderecos
}

/**
 * Para quem só precisa saber se o link pode ser aberto. Quem vai abrir o link
 * nesta máquina usa `buscarPublico`, que conecta no mesmo endereço que validou.
 * @param {string} texto
 * @returns {Promise<{ok: true, url: string} | {ok: false, motivo: string}>}
 */
export async function validarUrlPublica(texto) {
  const forma = validarForma(texto)
  if (!forma.ok) return forma
  if (!forma.literal) {
    try {
      await resolverPublico(forma.url.hostname, dns.lookup)
    } catch (erro) {
      return { ok: false, motivo: erro.message }
    }
  }
  return { ok: true, url: forma.url.href }
}

const MAXIMO_DE_SALTOS = 5
const MAXIMO_DE_BYTES = 8 * 1024 * 1024
const SEM_CORPO = new Set([204, 205, 304])

/**
 * Uma requisição GET cuja conexão só usa endereço que acabou de ser validado.
 * Validar o nome e depois deixar o cliente HTTP resolver de novo abriria espaço
 * para o DNS responder outro endereço na segunda consulta.
 */
function pedir(url, { signal, consultar }) {
  return new Promise((resolver, rejeitar) => {
    const falhar = (erro) => rejeitar(signal?.aborted ? signal.reason ?? erro : erro)
    const lookup = (host, opcoes, retorno) => {
      resolverPublico(host, consultar).then(
        (enderecos) => (opcoes.all ? retorno(null, enderecos) : retorno(null, enderecos[0].address, enderecos[0].family)),
        (erro) => retorno(erro),
      )
    }
    const modulo = url.protocol === 'https:' ? https : http
    const pedido = modulo.request(url, { method: 'GET', lookup, signal, headers: { 'user-agent': 'relatorio-tecnico', accept: '*/*' } }, (resposta) => {
      const pedacos = []
      let bytes = 0
      resposta.on('data', (pedaco) => {
        bytes += pedaco.length
        if (bytes > MAXIMO_DE_BYTES) pedido.destroy(new Error(`resposta maior que ${MAXIMO_DE_BYTES / 1024 / 1024} MB`))
        else pedacos.push(pedaco)
      })
      resposta.on('error', falhar)
      resposta.on('end', () => resolver({ status: resposta.statusCode ?? 0, cabecalhos: resposta.headers, corpo: Buffer.concat(pedacos) }))
    })
    pedido.on('error', falhar)
    pedido.end()
  })
}

function comoResponse({ status, cabecalhos, corpo }, url) {
  const headers = new Headers()
  for (const [nome, valor] of Object.entries(cabecalhos)) {
    for (const item of [valor].flat()) if (item !== undefined) headers.append(nome, item)
  }
  const resposta = new Response(SEM_CORPO.has(status) ? null : corpo, { status, headers })
  Object.defineProperty(resposta, 'url', { value: url })
  return resposta
}

/**
 * GET que valida o link e cada redirecionamento, e conecta só em endereço validado.
 * @param {string} url
 * @param {object} [opcoes]
 * @param {AbortSignal} [opcoes.signal]
 * @param {typeof dns.lookup} [opcoes.consultar]   consulta de DNS; trocável em teste
 * @param {typeof pedir} [opcoes.transporte]       quem faz a requisição de um salto; trocável em teste
 * @returns {Promise<Response>} lança se o link ou algum salto apontar para endereço interno
 */
export async function buscarPublico(url, { signal, consultar = dns.lookup, transporte = pedir } = {}) {
  let atual = url
  for (let salto = 0; salto <= MAXIMO_DE_SALTOS; salto += 1) {
    const forma = validarForma(atual)
    if (!forma.ok) throw new Error(`${forma.motivo}: ${atual}`)
    const bruta = await transporte(forma.url, { signal, consultar })
    const destino = bruta.cabecalhos.location
    if (bruta.status < 300 || bruta.status >= 400 || !destino) return comoResponse(bruta, forma.url.href)
    atual = new URL(destino, forma.url).href
  }
  throw new Error(`mais de ${MAXIMO_DE_SALTOS} redirecionamentos: ${url}`)
}
