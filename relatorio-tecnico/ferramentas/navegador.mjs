import { createHash } from 'node:crypto'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { CONFIG } from '../config.mjs'
import { garantirRede, REDE_DO_NAVEGADOR } from './isolamento.mjs'
import { rodar } from './processo.mjs'
import { buscarPublico, validarUrlPublica } from './url-publica.mjs'

const LIMITE_REQUISICAO_MS = 20_000
const LIMITE_NAVEGACAO_MS = 30_000
const ESPERA_APOS_CARGA_MS = 1500
const MAXIMO_DE_RECURSOS = 30
const MARCA_RESULTADO = 'RT_RESULTADO '

/**
 * @param {object} opcoes
 * @param {string} opcoes.capturas  pasta absoluta sob o diretório do usuário; o colima só monta o que está lá
 * @param {string} [opcoes.rede]    'container:<nome>' para alcançar o localhost do projeto; sem ela, a rede isolada do navegador
 * @returns {{mcpServers: {navegador: {command: string, args: string[]}}}}
 */
export function configMcpNavegador({ capturas, rede }) {
  return {
    mcpServers: {
      navegador: {
        command: 'docker',
        args: [
          'run', '-i', '--rm', '--init', '--label', 'rt=1',
          '--network', rede ?? REDE_DO_NAVEGADOR,
          '-v', `${capturas}:/cap`, '-w', '/cap',
          CONFIG.imagens.navegador,
          '--isolated', '--viewport-size', '1280,800', '--image-responses', 'omit', '--output-dir', '/cap',
        ],
      },
    },
  }
}

const SCRIPT_DE_CAPTURA = `
const { chromium } = require("playwright");
(async () => {
  const [url, nome] = process.argv.slice(1);
  const r = { status: null, titulo: null, url_final: null, erro: null };
  let navegador;
  try {
    navegador = await chromium.launch({ channel: "chromium", args: ["--no-sandbox"] });
    const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } });
    const resposta = await pagina.goto(url, { waitUntil: "load", timeout: ${LIMITE_NAVEGACAO_MS} });
    r.status = resposta ? resposta.status() : null;
    await pagina.waitForTimeout(${ESPERA_APOS_CARGA_MS});
    r.titulo = (await pagina.title()) || null;
    r.url_final = pagina.url();
    await pagina.screenshot({ path: "/cap/" + nome });
  } catch (erro) {
    r.erro = String(erro && erro.message ? erro.message : erro).split("\\n")[0];
  } finally {
    if (navegador) await navegador.close().catch(() => {});
  }
  console.log(${JSON.stringify(MARCA_RESULTADO)} + JSON.stringify(r));
})();
`

/**
 * Abre a URL em um Chromium dentro de container e grava a tela em `arquivoDestino`.
 * Nunca lança por falha da página: o erro volta em `erro`.
 * Sem `rede`, só abre endereço público. Com `rede`, só abre o localhost do projeto.
 * @param {string} url
 * @param {string} arquivoDestino  caminho absoluto sob o diretório do usuário
 * @param {object} [opcoes]
 * @param {string} [opcoes.rede]
 * @param {AbortSignal} [opcoes.sinal]
 * @param {string} [opcoes.nome]   nome do container
 * @returns {Promise<{status: number|null, titulo: string|null, url_final: string|null, erro: string|null}>}
 */
export async function capturarPagina(url, arquivoDestino, { rede, sinal, nome } = {}) {
  const vazio = { status: null, titulo: null, url_final: null, erro: null }
  try {
    const alvo = rede ? validarUrlLocal(url) : await validarUrlPublica(url)
    if (!alvo.ok) return { ...vazio, erro: alvo.motivo }
    if (!rede) await garantirRede(REDE_DO_NAVEGADOR)
    const pasta = path.dirname(arquivoDestino)
    await fsp.mkdir(pasta, { recursive: true })
    const { codigo, stdout, stderr } = await rodar('docker', [
      'run', '--rm', '--init', '--label', 'rt=1',
      ...(nome ? ['--name', nome] : []),
      '--network', rede ?? REDE_DO_NAVEGADOR,
      '-v', `${pasta}:/cap`, '-w', '/app', '--entrypoint', 'node',
      CONFIG.imagens.navegador,
      '-e', SCRIPT_DE_CAPTURA, alvo.url, path.basename(arquivoDestino),
    ], { sinal })
    const linha = stdout.split('\n').findLast((l) => l.startsWith(MARCA_RESULTADO))
    if (!linha) {
      const fim = (stderr || stdout).trim().split('\n').slice(-3).join(' | ')
      return { ...vazio, erro: `captura saiu com código ${codigo}: ${fim}` }
    }
    return { ...vazio, ...JSON.parse(linha.slice(MARCA_RESULTADO.length)) }
  } catch (erro) {
    return { ...vazio, erro: erro.message }
  }
}

/** Na rede de um projeto local, o único destino legítimo é o localhost do próprio projeto. */
function validarUrlLocal(texto) {
  try {
    const url = new URL(texto)
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    return local && url.protocol === 'http:' ? { ok: true, url: url.href } : { ok: false, motivo: 'na rede do projeto só é aberto http://localhost' }
  } catch {
    return { ok: false, motivo: 'link inválido' }
  }
}

const sha256 = (dado) => createHash('sha256').update(dado).digest('hex')

function sinalComLimite(sinal) {
  const limite = AbortSignal.timeout(LIMITE_REQUISICAO_MS)
  return sinal ? AbortSignal.any([sinal, limite]) : limite
}

const atributo = (marca, nome) => marca.match(new RegExp(`\\b${nome}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(1).find((v) => v !== undefined) ?? null

/**
 * Recursos de mesma origem em `<script src>` e `<link rel=stylesheet href>`.
 * @param {string} html
 * @param {string} urlBase
 * @returns {string[]} URLs absolutas, sem repetição, em ordem alfabética
 */
export function recursosDaPagina(html, urlBase) {
  const origem = new URL(urlBase).origin
  const achados = new Set()
  const juntar = (referencia) => {
    if (!referencia) return
    try {
      const alvo = new URL(referencia, urlBase)
      alvo.hash = ''
      if (alvo.origin === origem) achados.add(alvo.href)
    } catch {
      // referência malformada na página da equipe: não é recurso
    }
  }
  for (const [marca] of html.matchAll(/<script\b[^>]*>/gi)) juntar(atributo(marca, 'src'))
  for (const [marca] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (/\bstylesheet\b/i.test(atributo(marca, 'rel') ?? '')) juntar(atributo(marca, 'href'))
  }
  return [...achados].sort().slice(0, MAXIMO_DE_RECURSOS)
}

/**
 * Hash do conjunto de scripts e folhas de estilo de mesma origem que a página
 * carrega. Muda quando um recurso muda de endereço ou de conteúdo. O HTML fica
 * de fora quando há recursos, porque páginas servidas por framework trazem
 * valores que variam a cada requisição; sem nenhum recurso, o hash é do HTML.
 * @param {string} url
 * @param {{sinal?: AbortSignal, buscar?: typeof buscarPublico}} [opcoes]   `buscar` recusa endereço interno em cada salto
 * @returns {Promise<{hash: string, recursos: number, em: string}>}
 */
export async function impressaoDigital(url, { sinal, buscar = buscarPublico } = {}) {
  const resposta = await buscar(url, { signal: sinalComLimite(sinal) })
  const html = await resposta.text()
  const recursos = recursosDaPagina(html, resposta.url || url)
  const partes = await Promise.all(recursos.map(async (recurso) => {
    try {
      const r = await buscar(recurso, { signal: sinalComLimite(sinal) })
      return `${recurso} ${r.status} ${sha256(Buffer.from(await r.arrayBuffer()))}`
    } catch (erro) {
      if (sinal?.aborted) throw erro
      return `${recurso} erro`
    }
  }))
  const conjunto = partes.length > 0 ? partes.join('\n') : `html ${sha256(html)}`
  return { hash: sha256(conjunto), recursos: recursos.length, em: new Date().toISOString() }
}
