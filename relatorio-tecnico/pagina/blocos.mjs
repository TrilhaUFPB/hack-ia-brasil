/**
 * Os desenhos da página: um por `tipo` de bloco, um por forma de `Valor` e um
 * por tipo de evidência. Todo texto do relatório passa por `html`, que escapa
 * cada valor interpolado; só o que já é `Html` entra sem escape.
 */
import { ESTADO_DECLARACAO, ESTADO_ITEM } from '../dominio/estados.mjs'

export class Html {
  /** @param {string} texto */
  constructor(texto) {
    this.texto = texto
  }
  toString() {
    return this.texto
  }
}

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }

/** @param {unknown} texto @returns {string} */
export function esc(texto) {
  return String(texto).replace(/[&<>"'`]/g, (caractere) => ENTIDADES[caractere])
}

function interpolar(valor) {
  if (valor === null || valor === undefined || valor === false) return ''
  if (valor instanceof Html) return valor.texto
  if (Array.isArray(valor)) return valor.map(interpolar).join('')
  return esc(valor)
}

/**
 * Template de HTML. Escapa todo valor interpolado que não seja `Html`.
 * @param {TemplateStringsArray} partes
 * @param {...unknown} valores
 * @returns {Html}
 */
export function html(partes, ...valores) {
  let saida = partes[0]
  for (let i = 0; i < valores.length; i++) saida += interpolar(valores[i]) + partes[i + 1]
  return new Html(saida)
}

/** @param {unknown} url @returns {string|null} a URL, só se o esquema for http ou https */
export function linkSeguro(url) {
  if (typeof url !== 'string') return null
  try {
    const alvo = new URL(url.trim())
    return alvo.protocol === 'http:' || alvo.protocol === 'https:' ? alvo.href : null
  } catch {
    return null
  }
}

/** Link quando a URL é http(s); o mesmo conteúdo como texto quando não é. */
export function ligacao(url, conteudo, classe = '') {
  const destino = linkSeguro(url)
  if (!destino) return html`<span class="${classe}">${conteudo}</span>`
  return html`<a class="${classe}" href="${destino}" target="_blank" rel="noopener noreferrer">${conteudo}</a>`
}

const PENDENTE = { rotulo: 'em andamento', marcador: '…' }
const NAO_CONFERIDA = { rotulo: 'não conferida', marcador: '·' }

const DETALHE_DO_ESTADO = {
  verificado: (estado) => (estado.alcance ? `até o passo ${estado.alcance.ate} de ${estado.alcance.de}` : ''),
  falhou: (estado) => estado.erro ?? '',
  nao_testavel: (estado) => estado.motivo ?? '',
  nao_informado: () => '',
  em_andamento: () => '',
}

function etiqueta({ rotulo, marcador }) {
  return html`<span class="estado"><span class="marcador" aria-hidden="true">${marcador}</span>${rotulo}</span>`
}

const desconhecido = (chave) => ({ rotulo: String(chave), marcador: '?' })

/** @param {import('../dominio/estados.mjs').EstadoItem | import('../dominio/tipos.mjs').Pendente} estado */
export function estadoDeItem(estado) {
  const chave = estado?.estado
  const entrada = chave === 'em_andamento' ? PENDENTE : (ESTADO_ITEM[chave] ?? desconhecido(chave))
  return { etiqueta: etiqueta(entrada), rotulo: entrada.rotulo, marcador: entrada.marcador, detalhe: DETALHE_DO_ESTADO[chave]?.(estado) ?? '' }
}

/** @param {string|null|undefined} chave */
export function rotuloDeDeclaracao(chave) {
  return chave == null ? NAO_CONFERIDA : (ESTADO_DECLARACAO[chave] ?? desconhecido(chave))
}

function linhaDeEstado(titulo, estado) {
  return html`<p class="linha-estado">${titulo && html`<span class="apagado">${titulo}</span> `}${estado.etiqueta}${
    estado.detalhe && html` <span class="detalhe">${estado.detalhe}</span>`
  }</p>`
}

function trechoRecolhido(trecho) {
  if (!trecho) return ''
  return html`<details class="trecho"><summary>trecho</summary><pre>${trecho}</pre></details>`
}

function posicao(evidencia) {
  if (evidencia.linha == null) return evidencia.caminho
  const fim = evidencia.linha_fim != null && evidencia.linha_fim !== evidencia.linha ? `-${evidencia.linha_fim}` : ''
  return `${evidencia.caminho}:${evidencia.linha}${fim}`
}

const EVIDENCIAS = {
  arquivo: (evidencia) => html`${ligacao(evidencia.link, posicao(evidencia), 'mono')}${trechoRecolhido(evidencia.trecho)}`,
  formulario: (evidencia) =>
    html`<span class="mono">formulário · ${posicao(evidencia)}</span>${trechoRecolhido(evidencia.trecho)}`,
  captura: (evidencia, ctx) => {
    const imagem = ctx.capturas.get(evidencia.caminho)
    if (!imagem) return html`<span class="mono">captura · ${evidencia.caminho}</span>`
    return html`<label class="captura"><input type="checkbox" aria-label="Ampliar a captura ${evidencia.caminho}"><img src="${imagem}" alt="Captura de tela ${evidencia.caminho}" loading="lazy"><span class="mono">${evidencia.caminho}</span></label>`
  },
  url: (evidencia) => ligacao(evidencia.link ?? evidencia.caminho, evidencia.caminho, 'mono quebra'),
  log: (evidencia) => html`<span class="mono">log · ${posicao(evidencia)}</span>${trechoRecolhido(evidencia.trecho)}`,
}

/** @param {import('../dominio/tipos.mjs').Evidencia} evidencia @param {{capturas: Map<string, string>}} ctx */
export function desenharEvidencia(evidencia, ctx) {
  const desenho = EVIDENCIAS[evidencia?.tipo]
  return desenho ? desenho(evidencia, ctx) : html`<span class="mono">${evidencia?.caminho ?? ''}</span>`
}

function listaDeEvidencias(evidencias, ctx) {
  if (!evidencias?.length) return ''
  return html`<ul class="evidencias" aria-label="Evidências">${evidencias.map(
    (evidencia) => html`<li>${desenharEvidencia(evidencia, ctx)}</li>`,
  )}</ul>`
}

const numero = (valor) => (Number.isFinite(Number(valor)) ? Number(valor) : 0)

const VALORES = {
  texto: (valor) => html`<p class="valor">${valor}</p>`,
  numero: (valor) => html`<p class="valor mono">${valor.toLocaleString('pt-BR')}</p>`,
  serie: ({ serie }) => {
    const maximo = Math.max(1, ...serie.map(([, quantidade]) => numero(quantidade)))
    return html`<ol class="serie">${serie.map(
      ([rotulo, quantidade]) =>
        html`<li><span class="mono">${rotulo}</span><span class="barra"><span style="width:${(
          (numero(quantidade) / maximo) *
          100
        ).toFixed(1)}%"></span></span><span class="mono">${numero(quantidade).toLocaleString('pt-BR')}</span></li>`,
    )}</ol>`
  },
  tabela: ({ tabela }) =>
    html`<div class="rolagem"><table><thead><tr>${(tabela.colunas ?? []).map(
      (coluna) => html`<th scope="col">${coluna}</th>`,
    )}</tr></thead><tbody>${(tabela.linhas ?? []).map(
      (linha) =>
        html`<tr>${linha.map((celula) => html`<td class="${typeof celula === 'number' ? 'mono' : ''}">${celula}</td>`)}</tr>`,
    )}</tbody></table></div>`,
  lista: ({ lista }) => html`<ul class="lista">${lista.map((elemento) => html`<li>${elemento}</li>`)}</ul>`,
}

function formaDoValor(valor) {
  if (typeof valor === 'string') return 'texto'
  if (typeof valor === 'number') return 'numero'
  if (valor && typeof valor === 'object') {
    if (Array.isArray(valor.serie)) return 'serie'
    if (valor.tabela && typeof valor.tabela === 'object') return 'tabela'
    if (Array.isArray(valor.lista)) return 'lista'
  }
  return null
}

/** @param {import('../dominio/tipos.mjs').Valor} [valor] */
export function desenharValor(valor) {
  const forma = formaDoValor(valor)
  return forma ? VALORES[forma](valor) : ''
}

const campo = (titulo, texto) => (texto ? html`<div><dt>${titulo}</dt><dd>${texto}</dd></div>` : '')

const BLOCOS = {
  item: (bloco, ctx) => html`<article class="bloco">
<header><h3>${bloco.rotulo}</h3>${bloco.sinal && html`<span class="sinal">sinal a conferir</span>`}</header>
${linhaDeEstado('', estadoDeItem(bloco.estado))}
${desenharValor(bloco.valor)}
${bloco.obs && html`<p class="obs">${bloco.obs}</p>`}
${listaDeEvidencias(bloco.evidencias, ctx)}
</article>`,

  declaracao: (bloco, ctx) => html`<article class="bloco">
<blockquote>“${bloco.citacao ?? 'citação não registrada'}”</blockquote>
${bloco.fonte && html`<p class="fonte"><span class="apagado">Fonte</span> ${desenharEvidencia({ ...bloco.fonte, trecho: null }, ctx)}</p>`}
${html`<p class="linha-estado"><span class="apagado">No código</span> ${etiqueta(rotuloDeDeclaracao(bloco.estado))}</p>`}
${bloco.no_uso && linhaDeEstado('No uso', estadoDeItem(bloco.no_uso))}
${bloco.obs && html`<p class="obs">${bloco.obs}</p>`}
<dl class="campos">${campo('Existe', bloco.existe)}${campo('Falta', bloco.falta)}${campo('O que o código faz', bloco.o_que_faz)}${campo(
    'Onde foi procurado',
    bloco.onde_procurou?.length ? html`<span class="mono">${bloco.onde_procurou.join(' · ')}</span>` : '',
  )}</dl>
${listaDeEvidencias(bloco.evidencias, ctx)}
</article>`,

  passo: (bloco, ctx) => html`<article class="bloco passo">
<span class="mono numero" aria-hidden="true">${String(bloco.n ?? '').padStart(2, '0')}</span>
<div>
<h3>${bloco.acao}</h3>
${bloco.estado && linhaDeEstado('', estadoDeItem(bloco.estado))}
<dl class="campos">${campo('Esperado', bloco.esperado)}${campo('Observado', bloco.observado)}</dl>
${listaDeEvidencias(bloco.evidencias, ctx)}
</div>
</article>`,
}

/**
 * @param {import('../dominio/tipos.mjs').Bloco} bloco
 * @param {{capturas: Map<string, string>}} ctx   capturas já embutidas, por caminho
 * @returns {Html}
 */
export function desenharBloco(bloco, ctx) {
  const desenho = BLOCOS[bloco?.tipo]
  return desenho ? desenho(bloco, ctx) : html`<article class="bloco"><p class="mono">${bloco?.id ?? ''}</p></article>`
}
