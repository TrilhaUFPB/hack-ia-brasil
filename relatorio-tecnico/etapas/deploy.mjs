import fsp from 'node:fs/promises'
import path from 'node:path'
import { evidenciaDeCaptura, evidenciaDeUrl } from '../dominio/evidencia.mjs'
import { falhou, naoInformado, verificado } from '../dominio/estados.mjs'
import { capturarPagina, impressaoDigital } from '../ferramentas/navegador.mjs'
import { buscarPublico } from '../ferramentas/url-publica.mjs'
import { etapa, MINUTO } from '../nucleo/etapa.mjs'

const LIMITE_REQUISICAO_MS = 20_000
const NOME_DA_CAPTURA = 'inicial.png'

const VAZIA = Object.freeze({
  informado: false, url: null, responde: false, status: null, tempo_ms: null,
  titulo: null, captura: null, impressao: null, erro: null,
})

function normalizarUrl(link) {
  const texto = link.trim()
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(texto) ? texto : `https://${texto}`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

const tituloDoHtml = (html) => html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1].replace(/\s+/g, ' ').trim() || null

const erroDeRede = (erro) => (erro.name === 'TimeoutError'
  ? `sem resposta em ${LIMITE_REQUISICAO_MS / 1000} s`
  : [erro.message, erro.cause?.code ?? erro.cause?.message].filter(Boolean).join(': '))

/**
 * @param {import('../nucleo/etapa.mjs').Ctx<never>} ctx
 * @param {{buscar?: typeof buscarPublico, capturar?: typeof capturarPagina, impressao?: typeof impressaoDigital}} [meios]
 *   o padrão recusa link que aponta para endereço interno
 */
export async function medirDeploy(ctx, { buscar = buscarPublico, capturar = capturarPagina, impressao = impressaoDigital } = {}) {
  const link = ctx.equipe.demo
  if (!link || !link.trim()) return { ...VAZIA }
  const url = normalizarUrl(link)
  if (!url) return { ...VAZIA, informado: true, url: link.trim(), erro: 'o link informado não é um endereço http válido' }
  const saida = { ...VAZIA, informado: true, url }

  ctx.pulso(`requisição a ${url}`)
  const inicio = performance.now()
  try {
    const resposta = await buscar(url, { signal: AbortSignal.any([ctx.sinal, AbortSignal.timeout(LIMITE_REQUISICAO_MS)]) })
    saida.tempo_ms = Math.round(performance.now() - inicio)
    saida.status = resposta.status
    saida.responde = resposta.status < 400
    saida.titulo = tituloDoHtml(await resposta.text().catch(() => ''))
  } catch (erro) {
    if (ctx.sinal.aborted) throw erro
    return { ...saida, erro: erroDeRede(erro) }
  }
  ctx.parcial({ ...saida })

  ctx.pulso('captura da tela inicial')
  const destino = path.join(ctx.pastas.capturas, NOME_DA_CAPTURA)
  const captura = await capturar(url, destino, { sinal: ctx.sinal })
  if (ctx.sinal.aborted) throw new Error('abortado durante a captura')
  const gravou = await fsp.stat(destino).then((s) => s.size > 0, () => false)
  if (gravou) saida.captura = ctx.relativo(destino)
  else ctx.pulso(`captura não gravada: ${captura.erro}`)
  saida.titulo = captura.titulo ?? saida.titulo
  ctx.parcial({ ...saida })

  ctx.pulso('impressão digital')
  saida.impressao = await impressao(url, { sinal: ctx.sinal }).catch((erro) => {
    ctx.pulso(`impressão digital não tirada: ${erro.message}`)
    return null
  })
  return saida
}

export default etapa({
  id: 'deploy',
  titulo: 'Deploy',
  coluna: 'fatos',
  fila: 'scripts',
  versao: 1,
  depende: {},
  entradas: (equipe) => ({ demo: equipe.demo }),
  volatil: true,
  teto: { total: 3 * MINUTO },
  resumo: ['deploy'],

  executar: (ctx) => medirDeploy(ctx),

  relatar(saida) {
    if (!saida.informado) {
      return {
        resumo: { deploy: naoInformado() },
        uso: [{ tipo: 'item', id: 'deploy:responde', rotulo: 'Deploy responde', estado: naoInformado(), evidencias: [] }],
      }
    }
    const estado = saida.responde ? verificado() : falhou(saida.status ? `HTTP ${saida.status}` : saida.erro ?? 'sem resposta')
    const item = {
      tipo: 'item', id: 'deploy:responde', rotulo: 'Deploy responde', estado,
      evidencias: [evidenciaDeUrl(saida.url), ...(saida.captura ? [evidenciaDeCaptura(saida.captura)] : [])],
    }
    if (saida.status) item.valor = `HTTP ${saida.status} em ${saida.tempo_ms} ms`
    return { resumo: { deploy: estado }, uso: [item] }
  },
})
