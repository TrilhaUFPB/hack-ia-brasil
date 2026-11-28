/**
 * Todo link informado por uma equipe passa por aqui antes de ser aberto. Um
 * link de demo que aponta para `localhost` ou para a rede local faria o
 * harness capturar um serviço interno e publicar a imagem no relatório.
 */
import dns from 'node:dns/promises'
import net from 'node:net'

const FAIXAS_V4_INTERNAS = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
]

const paraInteiro = (ip) => ip.split('.').reduce((acumulado, parte) => (acumulado << 8) + Number(parte), 0) >>> 0

function v4Interno(ip) {
  const valor = paraInteiro(ip)
  return FAIXAS_V4_INTERNAS.some(([base, bits]) => {
    const mascara = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return (valor & mascara) === (paraInteiro(base) & mascara)
  })
}

/**
 * @param {string} ip endereço IPv4 ou IPv6
 * @returns {boolean} true para loopback, rede privada, link-local, CGNAT, multicast e não especificado
 */
export function enderecoInterno(ip) {
  if (net.isIPv4(ip)) return v4Interno(ip)
  if (!net.isIPv6(ip)) return true
  const baixo = ip.toLowerCase()
  const mapeado = baixo.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapeado) return v4Interno(mapeado[1])
  if (baixo === '::' || baixo === '::1') return true
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(baixo)
}

/**
 * @param {string} texto
 * @returns {Promise<{ok: true, url: string} | {ok: false, motivo: string}>}
 */
export async function validarUrlPublica(texto) {
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
    return enderecoInterno(host) ? { ok: false, motivo: 'o link aponta para um endereço interno' } : { ok: true, url: url.href }
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, motivo: 'o link aponta para um endereço interno' }
  }
  let enderecos
  try {
    enderecos = await dns.lookup(host, { all: true })
  } catch {
    return { ok: false, motivo: `o nome ${host} não resolve` }
  }
  if (enderecos.length === 0) return { ok: false, motivo: `o nome ${host} não resolve` }
  if (enderecos.some((e) => enderecoInterno(e.address))) return { ok: false, motivo: 'o link aponta para um endereço interno' }
  return { ok: true, url: url.href }
}

const MAXIMO_DE_SALTOS = 5

/**
 * `fetch` que valida o link e cada redirecionamento antes de seguir.
 * @param {string} url
 * @param {RequestInit} [opcoes]
 * @returns {Promise<Response>} lança se algum salto apontar para endereço interno
 */
export async function buscarPublico(url, opcoes = {}) {
  let atual = url
  for (let salto = 0; salto <= MAXIMO_DE_SALTOS; salto += 1) {
    const validacao = await validarUrlPublica(atual)
    if (!validacao.ok) throw new Error(`${validacao.motivo}: ${atual}`)
    const resposta = await fetch(validacao.url, { ...opcoes, redirect: 'manual' })
    const destino = resposta.headers.get('location')
    if (resposta.status < 300 || resposta.status >= 400 || !destino) return resposta
    await resposta.body?.cancel()
    atual = new URL(destino, validacao.url).href
  }
  throw new Error(`mais de ${MAXIMO_DE_SALTOS} redirecionamentos: ${url}`)
}
