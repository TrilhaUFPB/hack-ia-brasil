/**
 * `relatorio.html`: um arquivo autossuficiente por equipe. Informa e não julga:
 * sem nota, sem ordenação por qualidade, sem cor de semáforo.
 */
import { desenharBloco, estadoDeItem, html, Html, ligacao, linkSeguro, rotuloDeDeclaracao } from './blocos.mjs'
import { ESTILO, FONTES } from './estilo.mjs'

const LIMITE_DE_CAPTURAS = 24

export const FRASE_FIXA = 'Este relatório registra fatos e evidências. Não dá nota e não substitui a avaliação dos jurados.'

/** Etapas que contribuem com cada parte (tabela "Partes do relatório" do CONTRATO.md). */
const ETAPAS_DA_PARTE = {
  roteiro: ['uso'],
  declaracoes: ['promessas', 'leitor', 'uso'],
  nao_declarado: ['leitor'],
  uso: ['build', 'uso'],
  ia: ['leitor', 'composicao', 'uso'],
  linha_do_tempo: ['github', 'linha-do-tempo', 'uso'],
  origem: ['github', 'copia', 'submissao'],
  arquitetura: ['leitor', 'composicao'],
  higiene: ['segredos', 'submissao'],
}

const SITUACOES = {
  aguardando: 'aguardando',
  rodando: 'em andamento',
  pronto: 'concluída',
  falhou: 'não concluída',
  tempo_esgotado: 'tempo esgotado',
}

const PLURAL_DE_DECLARACAO = {
  confirmada: 'confirmadas',
  parcial: 'parciais',
  nao_encontrada: 'não encontradas',
  contradita: 'contraditas',
  nao_verificavel: 'não verificáveis pelo código',
  null: 'não conferidas',
}

const MODOS = { previa: 'prévia', final: 'final' }

const relogioDeBrasilia = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** @param {string|null|undefined} iso @returns {string} "28/11, 15:42" no fuso de Brasília */
export function horarioDeBrasilia(iso) {
  const data = new Date(iso ?? '')
  return Number.isNaN(data.getTime()) ? 'horário não informado' : relogioDeBrasilia.format(data)
}

function duracao(relogio) {
  if (!relogio || !Number.isFinite(relogio.execucao_ms)) return '–'
  const segundos = Math.round(relogio.execucao_ms / 1000)
  return segundos < 60 ? `${segundos} s` : `${Math.floor(segundos / 60)} min ${segundos % 60} s`
}

/** Documento HTML completo, com estilos embutidos e nenhum script. */
export function documento(titulo, corpo) {
  return html`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${titulo}</title>
${new Html(FONTES)}
<style>${new Html(ESTILO)}</style>
</head>
<body>
${corpo}
</body>
</html>
`.texto
}

async function embutirCapturas(relatorio, partes, embutir) {
  const caminhos = new Set()
  for (const { id } of partes) {
    for (const bloco of relatorio[id] ?? []) {
      for (const evidencia of [bloco.fonte, ...(bloco.evidencias ?? [])]) {
        if (evidencia?.tipo === 'captura' && typeof evidencia.caminho === 'string') caminhos.add(evidencia.caminho)
      }
    }
  }
  const capturas = new Map()
  for (const caminho of [...caminhos].slice(0, LIMITE_DE_CAPTURAS)) {
    const imagem = await embutir(caminho)
    if (imagem) capturas.set(caminho, imagem)
  }
  return capturas
}

function cabecalho(relatorio) {
  const { equipe, geracao } = relatorio
  const repositorio = linkSeguro(equipe.repo)
  const commit = geracao.commit
    ? ligacao(repositorio && `${repositorio.replace(/\/+$/, '')}/commit/${geracao.commit}`, `commit ${geracao.commit.slice(0, 10)}`)
    : 'commit não identificado'
  const enderecos = [
    ['Repositório', equipe.repo],
    ['Demo', equipe.demo],
    ['Vídeo do pitch', equipe.video],
  ]
  return html`<header class="cabecalho">
<span class="apagado">Relatório técnico · ${equipe.track ?? 'track não informada'}</span>
<h1>${equipe.nome}</h1>
${equipe.resumo && html`<p class="resumo-linha">${equipe.resumo}</p>`}
<p class="ligacoes">${enderecos.map(([rotulo, url]) =>
    url ? (linkSeguro(url) ? ligacao(url, rotulo) : html`<span>${rotulo}: ${url}</span>`) : html`<span>${rotulo}: não informado</span>`,
  )}</p>
<p class="geracao">${MODOS[geracao.modo] ?? geracao.modo} · gerado em ${horarioDeBrasilia(geracao.horario)} (Brasília) · ${commit}${
    geracao.commit_em && html` · enviado em ${horarioDeBrasilia(geracao.commit_em)}`
  }</p>
</header>`
}

function quadrosDoResumo(relatorio, resumo) {
  return html`<section class="quadros" aria-label="Resumo">${resumo.map(({ chave, titulo }) => {
    const estado = estadoDeItem(relatorio.resumo?.[chave] ?? { estado: 'em_andamento' })
    return html`<div class="quadro"><h3>${titulo}</h3>${estado.etiqueta}${
      estado.detalhe && html`<span class="detalhe">${estado.detalhe}</span>`
    }</div>`
  })}</section>`
}

function emAndamento(relatorio, idDaParte) {
  const etapas = relatorio.geracao?.etapas ?? {}
  const pendentes = new Set(
    (relatorio.nao_verificado ?? []).filter(({ causa }) => causa === 'em_andamento').map(({ rotulo }) => rotulo),
  )
  return (ETAPAS_DA_PARTE[idDaParte] ?? [])
    .flatMap((id) => [etapas[id], etapas[`${id}.conferido`]])
    .some((etapa) => etapa && (etapa.situacao === 'aguardando' || etapa.situacao === 'rodando' || pendentes.has(etapa.titulo)))
}

function contagemDeDeclaracoes(declaracoes) {
  const total = new Map()
  for (const { estado } of declaracoes) total.set(estado ?? null, (total.get(estado ?? null) ?? 0) + 1)
  return [...total]
    .map(([estado, quantidade]) => `${quantidade} ${quantidade === 1 ? rotuloDeDeclaracao(estado).rotulo : (PLURAL_DE_DECLARACAO[estado] ?? rotuloDeDeclaracao(estado).rotulo)}`)
    .join(' · ')
}

function secaoDaParte(relatorio, { id, titulo }, ctx) {
  const blocos = relatorio[id] ?? []
  const conteudo = blocos.length
    ? html`${id === 'declaracoes' && html`<p class="contagem">${contagemDeDeclaracoes(blocos)}</p>`}${blocos.map((bloco) => desenharBloco(bloco, ctx))}`
    : html`<p class="vazio">${emAndamento(relatorio, id) ? 'em andamento' : 'Nada registrado nesta parte'}</p>`
  return html`<section class="parte" id="parte-${id}">
<header><h2>${titulo}</h2><span class="contagem">${blocos.length} ${blocos.length === 1 ? 'registro' : 'registros'}</span></header>
<div class="conteudo">${conteudo}</div>
</section>`
}

function secaoNaoVerificado(relatorio) {
  const itens = relatorio.nao_verificado ?? []
  return html`<section class="parte" id="parte-nao_verificado">
<header><h2>Não foi possível verificar</h2><span class="contagem">${itens.length} ${itens.length === 1 ? 'registro' : 'registros'}</span></header>
<div class="conteudo">${
    itens.length
      ? html`<ul class="nao-verificado">${itens.map(({ rotulo, motivo }) => html`<li><strong>${rotulo}</strong><p>${motivo}</p></li>`)}</ul>`
      : html`<p class="vazio">Nada registrado nesta parte</p>`
  }</div>
</section>`
}

function rodape(relatorio) {
  const etapas = Object.values(relatorio.geracao?.etapas ?? {})
  const descartados = relatorio.descartados ?? { total: 0, motivos: {} }
  const motivos = Object.entries(descartados.motivos ?? {})
  return html`<footer class="parte rodape" id="como-foi-gerado">
<header><h2>Como este relatório foi gerado</h2></header>
<div class="conteudo">
<div class="rolagem"><table>
<thead><tr><th scope="col">Etapa</th><th scope="col">Situação</th><th scope="col">Duração</th><th scope="col">Onde parou</th></tr></thead>
<tbody>${etapas.map(
    (etapa) => html`<tr><th scope="row">${etapa.titulo}</th><td>${SITUACOES[etapa.situacao] ?? etapa.situacao}</td><td class="mono">${duracao(
      etapa.relogio,
    )}</td><td>${etapa.parou_em ?? ''}${etapa.erro && html`<span class="detalhe">${etapa.erro}</span>`}</td></tr>`,
  )}</tbody>
</table></div>
<p><span class="mono">${descartados.total}</span> ${
    descartados.total === 1 ? 'afirmação descartada' : 'afirmações descartadas'
  } por falta de prova${motivos.length > 0 && html`: ${motivos.map(([motivo, quantidade]) => `${motivo} (${quantidade})`).join(', ')}`}.</p>
<p class="frase">${FRASE_FIXA}</p>
</div>
</footer>`
}

/**
 * @param {import('../dominio/tipos.mjs').Relatorio} relatorio
 * @param {(caminhoRelativo: string) => Promise<string|null>} embutir
 * @param {{estrutura?: {PARTES: {id: string, titulo: string}[], RESUMO: {chave: string, titulo: string}[]}}} [opcoes]
 *   `estrutura` substitui `dominio/relatorio.mjs`; existe para testar a página sem o domínio
 * @returns {Promise<string>} HTML autossuficiente
 */
export async function renderizar(relatorio, embutir, opcoes = {}) {
  const { PARTES, RESUMO } = opcoes.estrutura ?? (await import('../dominio/relatorio.mjs'))
  const ctx = { capturas: await embutirCapturas(relatorio, PARTES, embutir) }
  const previa = relatorio.geracao.modo === 'previa'
  return documento(
    `${relatorio.equipe.nome} · Relatório técnico`,
    html`${previa && html`<div class="faixa" role="note">Prévia interna</div>`}
<main>
${cabecalho(relatorio)}
${quadrosDoResumo(relatorio, RESUMO)}
<nav class="indice-partes" aria-label="Partes do relatório">${PARTES.map(
      ({ id, titulo }) => html`<a href="#parte-${id}">${titulo}<span class="mono">${(relatorio[id] ?? []).length}</span></a>`,
    )}<a href="#parte-nao_verificado">Não foi possível verificar<span class="mono">${(relatorio.nao_verificado ?? []).length}</span></a></nav>
${PARTES.map((parte) => secaoDaParte(relatorio, parte, ctx))}
${secaoNaoVerificado(relatorio)}
${rodape(relatorio)}
</main>`,
  )
}
