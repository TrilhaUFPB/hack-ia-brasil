/**
 * O visual da página, no padrão do site do evento. Sem cor de semáforo: estado
 * se lê pelo marcador e pelo rótulo.
 */

export const FONTES =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Oxanium:wght@200;300;400;500;600&display=swap">'

export const ESTILO = `
:root {
  --fundo: #000;
  --bloco: #101011;
  --borda: rgb(255 255 255 / 0.15);
  --borda-fina: rgb(255 255 255 / 0.1);
  --texto: #fff;
  --texto-2: rgb(255 255 255 / 0.75);
  --texto-3: rgb(255 255 255 / 0.6);
  --raio: 14px;
  --fonte: "Oxanium", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--fundo); color: var(--texto); font-family: var(--fonte); font-size: 16px; line-height: 1.6; overflow-wrap: anywhere; }
main { max-width: 72rem; margin: 0 auto; padding: 0 1.25rem 4rem; }
a { color: inherit; text-decoration: underline; text-decoration-color: rgb(255 255 255 / 0.35); text-underline-offset: 4px; }
a:hover { text-decoration-color: #fff; }
a:focus-visible, summary:focus-visible, input:focus-visible + img { outline: 2px solid #fff; outline-offset: 3px; }
h1, h2, h3, p, ul, ol, dl, dd, blockquote, figure { margin: 0; }
ul, ol { padding: 0; list-style: none; }
.mono { font-family: var(--mono); font-size: 0.82em; font-variant-numeric: tabular-nums; }
.quebra { word-break: break-all; }
.apagado { color: var(--texto-3); font-family: var(--mono); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; }

.faixa { border-bottom: 1px solid var(--borda); padding: 0.6rem 1.25rem; text-align: center; font-family: var(--mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.25em; color: var(--texto-2); }
.cabecalho { padding: 3rem 0 2rem; }
.cabecalho .apagado { display: block; margin-bottom: 0.75rem; }
h1 { font-size: clamp(2.2rem, 7vw, 3.75rem); font-weight: 200; line-height: 1.05; letter-spacing: -0.02em; text-wrap: balance; }
.resumo-linha { margin-top: 1rem; max-width: 60ch; color: var(--texto-2); font-size: 1.05rem; }
.ligacoes { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; margin-top: 1.25rem; color: var(--texto-2); }
.geracao { margin-top: 1.25rem; color: var(--texto-3); font-family: var(--mono); font-size: 0.78rem; }

.quadros { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 0.75rem; }
.quadro, .bloco { background: var(--bloco); border: 1px solid var(--borda); border-radius: var(--raio); }
.quadro { padding: 1rem 1.1rem 1.1rem; min-width: 0; }
.quadro h3 { font-family: var(--mono); font-size: 0.7rem; font-weight: 400; text-transform: uppercase; letter-spacing: 0.2em; color: var(--texto-3); }
.quadro .estado { display: flex; align-items: baseline; gap: 0.5rem; margin-top: 0.6rem; font-size: 1.2rem; font-weight: 300; line-height: 1.25; white-space: normal; }
.quadro .detalhe { display: block; margin-top: 0.4rem; color: var(--texto-2); font-size: 0.9rem; line-height: 1.45; }

.indice-partes { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.25rem; font-size: 0.88rem; }
.indice-partes a { border: 1px solid var(--borda); border-radius: 999px; padding: 0.2rem 0.75rem; text-decoration: none; color: var(--texto-2); }
.indice-partes a:hover { color: #fff; border-color: rgb(255 255 255 / 0.4); }
.indice-partes .mono { color: var(--texto-3); margin-left: 0.35rem; }

.parte { display: grid; gap: 1.25rem; border-top: 1px solid var(--borda); padding: 2rem 0; margin-top: 2rem; scroll-margin-top: 1rem; }
.parte + .parte { margin-top: 0; }
.parte > header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem 0.9rem; align-content: start; }
h2 { font-size: 1.6rem; font-weight: 300; line-height: 1.2; letter-spacing: -0.01em; text-wrap: balance; }
.contagem { color: var(--texto-3); font-family: var(--mono); font-size: 0.78rem; }
.conteudo { display: grid; gap: 0.75rem; min-width: 0; }
.vazio { color: var(--texto-3); }
@media (min-width: 60rem) {
  main { padding: 0 2.5rem 6rem; }
  .parte { grid-template-columns: minmax(0, 1fr) minmax(0, 2.4fr); gap: 3rem; }
  .parte > header { flex-direction: column; gap: 0.4rem; }
}

.bloco { padding: 1rem 1.1rem; display: grid; gap: 0.6rem; min-width: 0; }
.bloco > header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.4rem 0.75rem; }
.bloco h3 { font-size: 1.05rem; font-weight: 500; line-height: 1.35; }
.bloco.passo { grid-template-columns: 2rem minmax(0, 1fr); align-items: baseline; }
.bloco.passo > div { display: grid; gap: 0.6rem; min-width: 0; }
.numero { color: var(--texto-3); }
blockquote { font-size: 1.1rem; font-weight: 300; line-height: 1.45; }
.estado { font-weight: 500; white-space: nowrap; }
.marcador { display: inline-block; min-width: 1.1em; margin-right: 0.3em; text-align: center; font-family: var(--mono); }
.linha-estado .detalhe, .obs, .valor { color: var(--texto-2); }
.linha-estado .apagado { margin-right: 0.4rem; }
.sinal { border: 1px solid rgb(255 255 255 / 0.4); border-radius: 999px; padding: 0.05rem 0.6rem; font-family: var(--mono); font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--texto-2); white-space: nowrap; }
.campos { display: grid; gap: 0.45rem; }
.campos:empty { display: none; }
.campos dt { font-family: var(--mono); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--texto-3); }
.campos dd { color: var(--texto-2); }
.lista { display: grid; gap: 0.25rem; color: var(--texto-2); }
.lista li { padding-left: 1rem; position: relative; }
.lista li::before { content: "·"; position: absolute; left: 0.2rem; color: var(--texto-3); }

.evidencias { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 0.5rem 1.25rem; border-top: 1px solid var(--borda-fina); padding-top: 0.7rem; color: var(--texto-2); }
.evidencias li { min-width: 0; max-width: 100%; }
.trecho { margin-top: 0.3rem; }
.trecho summary { cursor: pointer; font-family: var(--mono); font-size: 0.7rem; color: var(--texto-3); }
pre { margin: 0.4rem 0 0; padding: 0.7rem 0.8rem; max-width: 100%; overflow-x: auto; background: #000; border: 1px solid var(--borda-fina); border-radius: 8px; font-family: var(--mono); font-size: 0.76rem; line-height: 1.5; color: var(--texto-2); overflow-wrap: normal; }

.captura { display: inline-grid; gap: 0.3rem; cursor: zoom-in; }
.captura input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.captura img { display: block; width: 11rem; max-width: 100%; height: auto; border: 1px solid var(--borda); border-radius: 8px; background: #000; }
.captura .mono { color: var(--texto-3); font-size: 0.7rem; }
.captura input:checked + img { position: fixed; inset: 0; z-index: 10; width: 100vw; height: 100vh; max-width: none; padding: 1rem; object-fit: contain; border: 0; border-radius: 0; background: rgb(0 0 0 / 0.94); cursor: zoom-out; }

.serie { display: grid; gap: 0.3rem; }
.serie li { display: grid; grid-template-columns: 4.5rem minmax(0, 1fr) 3.5rem; align-items: center; gap: 0.6rem; color: var(--texto-2); }
.serie li > :last-child { text-align: right; }
.barra { display: block; height: 0.5rem; background: rgb(255 255 255 / 0.07); border-radius: 2px; }
.barra span { display: block; height: 100%; min-width: 1px; background: rgb(255 255 255 / 0.7); border-radius: 2px; }

.rolagem { max-width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; line-height: 1.55; }
thead { border-bottom: 1px solid rgb(255 255 255 / 0.2); color: var(--texto-3); }
th { font-weight: 400; }
thead th { padding: 0 1rem 0.5rem 0; white-space: nowrap; }
tbody tr + tr { border-top: 1px solid var(--borda-fina); }
tbody th, tbody td { padding: 0.7rem 1rem 0.7rem 0; vertical-align: top; color: var(--texto-2); }
tbody th { font-weight: 500; color: var(--texto); }
td .detalhe { display: block; color: var(--texto-3); font-size: 0.85em; }

.nao-verificado { display: grid; gap: 0; }
.nao-verificado li { display: grid; gap: 0.15rem; padding: 0.7rem 0; }
.nao-verificado li + li { border-top: 1px solid var(--borda-fina); }
.nao-verificado p { color: var(--texto-2); }
.rodape p { color: var(--texto-2); }
.rodape .frase { color: var(--texto); }
`
