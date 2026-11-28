/**
 * `index.html` e `indice.json` da rodada. Ordem alfabética de projeto: nada
 * aqui é ranking.
 */
import { estadoDeItem, html } from './blocos.mjs'
import { documento, horarioDeBrasilia } from './render.mjs'

const dominio = await import('../dominio/relatorio.mjs').catch((erro) => ({ erro }))

const MODOS = { previa: 'prévia', final: 'final' }

/**
 * @param {import('../dominio/tipos.mjs').Relatorio[]} relatorios
 * @param {import('../dominio/tipos.mjs').Rodada} rodada
 * @param {{resumo?: {chave: string, titulo: string}[]}} [opcoes]   `resumo` substitui `RESUMO` do domínio, para teste
 * @returns {{html: string, json: object}}
 */
export function renderizarIndice(relatorios, rodada, opcoes = {}) {
  const resumo = opcoes.resumo ?? dominio?.RESUMO
  if (!resumo) throw new Error(`renderizarIndice: RESUMO indisponível em dominio/relatorio.mjs: ${dominio.erro?.message ?? 'não exportado'}`)
  const emOrdem = [...relatorios].sort((a, b) => a.equipe.nome.localeCompare(b.equipe.nome, 'pt-BR', { sensitivity: 'base' }))
  const geradoEm = emOrdem.map((relatorio) => relatorio.geracao.horario).sort().at(-1) ?? null

  const json = {
    gerado_em: geradoEm,
    modo: rodada.modo,
    equipes: emOrdem.map((relatorio) => ({
      id: relatorio.equipe.id,
      nome: relatorio.equipe.nome,
      track: relatorio.equipe.track,
      modo: relatorio.geracao.modo,
      horario: relatorio.geracao.horario,
      resumo: relatorio.resumo,
      relatorio: `${relatorio.equipe.id}/relatorio.html`,
      dados: `${relatorio.equipe.id}/relatorio.json`,
    })),
  }

  const corpo = html`${rodada.modo === 'previa' && html`<div class="faixa" role="note">Prévia interna</div>`}
<main>
<header class="cabecalho">
<span class="apagado">Hack IA Brasil</span>
<h1>Relatórios técnicos</h1>
<p class="geracao">${MODOS[rodada.modo] ?? rodada.modo} · ${emOrdem.length} ${emOrdem.length === 1 ? 'projeto' : 'projetos'} em ordem alfabética${
    geradoEm && html` · atualizado em ${horarioDeBrasilia(geradoEm)} (Brasília)`
  }</p>
</header>
<div class="rolagem"><table>
<thead><tr><th scope="col">Projeto</th><th scope="col">Track</th>${resumo.map(({ titulo }) => html`<th scope="col">${titulo}</th>`)}<th scope="col">Gerado em</th></tr></thead>
<tbody>${emOrdem.map(
    (relatorio) => html`<tr>
<th scope="row"><a href="${encodeURIComponent(relatorio.equipe.id)}/relatorio.html">${relatorio.equipe.nome}</a></th>
<td>${relatorio.equipe.track ?? 'não informada'}</td>
${resumo.map(({ chave }) => html`<td>${estadoDeItem(relatorio.resumo?.[chave] ?? { estado: 'em_andamento' }).etiqueta}</td>`)}
<td class="mono">${horarioDeBrasilia(relatorio.geracao.horario)}</td>
</tr>`,
  )}</tbody>
</table></div>
</main>`

  return { html: documento('Relatórios técnicos · Hack IA Brasil', corpo), json }
}
