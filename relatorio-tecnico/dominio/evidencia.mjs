/**
 * Os construtores de `Evidencia`. Nenhum outro módulo monta esse objeto à mão:
 * ou um script nosso viu o alvo (`conferida: 'script'`), ou `conferirCitacao`
 * abriu o alvo citado por um agent e o trecho bateu (`conferida: 'conferidor'`).
 */
import fs from 'node:fs'
import path from 'node:path'

/** @typedef {import('./tipos.mjs').Evidencia} Evidencia */
/** @typedef {import('./tipos.mjs').Citacao} Citacao */
/** @typedef {import('./tipos.mjs').Fontes} Fontes */

const LIMITE_TRECHO = 600
const LINHAS_SEM_TRECHO = 5
const LIMITE_ARQUIVO = 8 * 1024 * 1024
const TEXTOS_DO_FORMULARIO = new Set(['descricao.md', 'resumo.md'])

const cortar = (texto) => (texto.length > LIMITE_TRECHO ? texto.slice(0, LIMITE_TRECHO) : texto)

export const normalizarEspacos = (texto) => String(texto ?? '').replace(/\s+/g, ' ').trim()

const inteiroPositivo = (valor) => (Number.isInteger(valor) && valor >= 1 ? valor : null)

const trechoDe = (citacao) => (typeof citacao.trecho === 'string' ? citacao.trecho.trim() : '')

/** @returns {Evidencia} */
function evidencia(tipo, caminho, { linha = null, linha_fim = null, trecho = null, link = null, conferida }) {
  return { tipo, caminho, linha, linha_fim: linha_fim !== null && linha_fim !== linha ? linha_fim : null, trecho: trecho === null ? null : cortar(trecho), link, conferida }
}

/**
 * Resolve um caminho relativo dentro de uma pasta, sem deixar escapar dela nem
 * por `..` nem por link simbólico: repositório de equipe é dado não confiável.
 * @returns {{relativo: string, absoluto: string}|null}
 */
function resolverDentro(pasta, caminho) {
  if (!pasta || typeof caminho !== 'string' || caminho.trim() === '' || caminho.includes('\0')) return null
  if (path.isAbsolute(caminho) || /^[a-zA-Z]:[\\/]/.test(caminho)) return null
  const partes = caminho.split(/[\\/]+/).filter((parte) => parte !== '' && parte !== '.')
  if (partes.length === 0 || partes.includes('..')) return null
  try {
    const raiz = fs.realpathSync(pasta)
    const absoluto = fs.realpathSync(path.join(raiz, ...partes))
    if (absoluto !== raiz && !absoluto.startsWith(raiz + path.sep)) return null
    return { relativo: partes.join('/'), absoluto }
  } catch {
    return null
  }
}

function lerTexto(absoluto) {
  try {
    const dados = fs.statSync(absoluto)
    if (!dados.isFile() || dados.size > LIMITE_ARQUIVO) return null
    return fs.readFileSync(absoluto, 'utf8')
  } catch {
    return null
  }
}

function linkDoGithub(fontes, relativo, linha, linha_fim) {
  if (!fontes?.repo?.dono || !fontes.repo.nome || !fontes.sha) return null
  const caminho = relativo.split('/').map(encodeURIComponent).join('/')
  const ancora = linha ? `#L${linha}${linha_fim && linha_fim !== linha ? `-L${linha_fim}` : ''}` : ''
  return `https://github.com/${fontes.repo.dono}/${fontes.repo.nome}/blob/${fontes.sha}/${caminho}${ancora}`
}

/**
 * Procura `trecho` em `texto` ignorando diferenças de espaço e devolve as linhas
 * reais onde ele está. Havendo mais de uma ocorrência, fica a mais próxima da
 * linha informada.
 * @returns {{linha: number, linha_fim: number}|null}
 */
function localizar(texto, trecho, linhaInformada) {
  const alvo = normalizarEspacos(trecho)
  if (alvo === '') return null

  let normalizado = ''
  const linhaDe = []
  let linhaAtual = 1
  let pendente = false
  for (const caractere of texto) {
    if (/\s/.test(caractere)) {
      if (caractere === '\n') linhaAtual++
      pendente = normalizado !== ''
      continue
    }
    if (pendente) {
      normalizado += ' '
      linhaDe.push(linhaAtual)
      pendente = false
    }
    for (let i = 0; i < caractere.length; i++) linhaDe.push(linhaAtual)
    normalizado += caractere
  }

  let melhor = null
  for (let indice = normalizado.indexOf(alvo); indice !== -1; indice = normalizado.indexOf(alvo, indice + 1)) {
    const achado = { linha: linhaDe[indice], linha_fim: linhaDe[indice + alvo.length - 1] }
    if (!linhaInformada) return achado
    if (!melhor || Math.abs(achado.linha - linhaInformada) < Math.abs(melhor.linha - linhaInformada)) melhor = achado
  }
  return melhor
}

/**
 * Para fato que um script nosso encontrou no código. Lê o trecho do disco.
 * @param {Fontes} fontes
 * @param {string} caminho relativo à raiz do código
 * @param {number|null} [linha]
 * @param {{linha_fim?: number|null, ocultarTrecho?: boolean}} [opcoes] `ocultarTrecho` para segredo: o valor nunca é gravado
 * @returns {Evidencia}
 */
export function evidenciaDeArquivo(fontes, caminho, linha = null, opcoes = {}) {
  const inicio = inteiroPositivo(linha)
  const fim = inicio ? Math.max(inicio, inteiroPositivo(opcoes.linha_fim) ?? inicio) : null
  const alvo = resolverDentro(fontes?.codigo, caminho)
  const relativo = alvo?.relativo ?? String(caminho)

  let trecho = null
  if (alvo && inicio && !opcoes.ocultarTrecho) {
    const texto = lerTexto(alvo.absoluto)
    if (texto !== null) trecho = texto.split('\n').slice(inicio - 1, fim).join('\n').replace(/\r/g, '') || null
  }
  return evidencia('arquivo', relativo, {
    linha: inicio,
    linha_fim: fim,
    trecho,
    link: linkDoGithub(fontes, relativo, inicio, fim),
    conferida: 'script',
  })
}

/** @param {string} url @returns {Evidencia} */
export function evidenciaDeUrl(url) {
  return evidencia('url', url, { link: url, conferida: 'script' })
}

/** @param {{dono: string, nome: string}} repo @param {string} sha @returns {Evidencia} */
export function evidenciaDeCommit(repo, sha) {
  return evidenciaDeUrl(`https://github.com/${repo.dono}/${repo.nome}/commit/${sha}`)
}

/** Para captura que o próprio script gravou. @param {string} caminhoRelativo à pasta de saída da equipe @returns {Evidencia} */
export function evidenciaDeCaptura(caminhoRelativo) {
  return evidencia('captura', caminhoRelativo, { link: caminhoRelativo, conferida: 'script' })
}

/** @param {string} caminhoRelativo à pasta de saída da equipe @param {number|null} [linha] @param {string|null} [trecho] @returns {Evidencia} */
export function evidenciaDeLog(caminhoRelativo, linha = null, trecho = null) {
  return evidencia('log', caminhoRelativo, { linha: inteiroPositivo(linha), trecho, link: caminhoRelativo, conferida: 'script' })
}

function conferirArquivo(citacao, fontes) {
  const alvo = resolverDentro(fontes?.codigo, citacao.caminho)
  const texto = alvo ? lerTexto(alvo.absoluto) : null
  if (texto === null) return null

  const trecho = trechoDe(citacao)
  if (trecho !== '') {
    const achado = localizar(texto, trecho, inteiroPositivo(citacao.linha))
    if (!achado) return null
    return evidencia('arquivo', alvo.relativo, {
      ...achado,
      trecho,
      link: linkDoGithub(fontes, alvo.relativo, achado.linha, achado.linha_fim),
      conferida: 'conferidor',
    })
  }

  const linhas = texto.split('\n')
  if (linhas.at(-1) === '') linhas.pop()
  const inicio = inteiroPositivo(citacao.linha)
  if (!inicio || inicio > linhas.length) return null
  const pedido = Math.max(inicio, inteiroPositivo(citacao.linha_fim) ?? inicio)
  const fim = Math.min(pedido, inicio + LINHAS_SEM_TRECHO - 1, linhas.length)
  return evidencia('arquivo', alvo.relativo, {
    linha: inicio,
    linha_fim: fim,
    trecho: linhas.slice(inicio - 1, fim).join('\n').replace(/\r/g, ''),
    link: linkDoGithub(fontes, alvo.relativo, inicio, fim),
    conferida: 'conferidor',
  })
}

function conferirFormulario(citacao, fontes) {
  const nome = typeof citacao.caminho === 'string' ? citacao.caminho.replace(/^\.\//, '') : ''
  if (!TEXTOS_DO_FORMULARIO.has(nome)) return null
  const alvo = resolverDentro(fontes?.formulario, nome)
  const texto = alvo ? lerTexto(alvo.absoluto) : null
  if (texto === null) return null
  const trecho = trechoDe(citacao)
  const achado = localizar(texto, trecho, inteiroPositivo(citacao.linha))
  if (!achado) return null
  return evidencia('formulario', nome, { ...achado, trecho, conferida: 'conferidor' })
}

/**
 * O agent às vezes cita só o nome do arquivo que gravou. As capturas ficam em
 * `capturas/<etapa>/` e os logs em `logs/`, então o nome solto é procurado ali.
 */
function resolverNaSaida(fontes, tipo, caminho) {
  const direto = resolverDentro(fontes?.saida, caminho)
  if (direto || typeof caminho !== 'string' || /[\\/]/.test(caminho)) return direto
  if (tipo === 'log') return resolverDentro(fontes?.saida, `logs/${caminho}`)
  let etapas = []
  try {
    etapas = fs.readdirSync(path.join(fontes.saida, 'capturas'), { withFileTypes: true }).filter((entrada) => entrada.isDirectory())
  } catch {
    return null
  }
  for (const etapa of etapas) {
    const achado = resolverDentro(fontes.saida, `capturas/${etapa.name}/${caminho}`)
    if (achado) return achado
  }
  return null
}

function conferirNaSaida(citacao, fontes) {
  const alvo = resolverNaSaida(fontes, citacao.tipo, citacao.caminho)
  if (!alvo) return null
  try {
    const dados = fs.statSync(alvo.absoluto)
    if (!dados.isFile() || dados.size === 0) return null
  } catch {
    return null
  }

  const trecho = citacao.tipo === 'log' ? trechoDe(citacao) : ''
  if (trecho === '') return evidencia(citacao.tipo, alvo.relativo, { link: alvo.relativo, conferida: 'conferidor' })
  const texto = lerTexto(alvo.absoluto)
  const achado = texto === null ? null : localizar(texto, trecho, inteiroPositivo(citacao.linha))
  if (!achado) return null
  return evidencia('log', alvo.relativo, { ...achado, trecho, link: alvo.relativo, conferida: 'conferidor' })
}

function conferirUrl(citacao) {
  if (typeof citacao.caminho !== 'string') return null
  let url
  try {
    url = new URL(citacao.caminho.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  return evidencia('url', url.href, { link: url.href, conferida: 'conferidor' })
}

const CONFERENCIA = Object.freeze({
  arquivo: conferirArquivo,
  formulario: conferirFormulario,
  captura: conferirNaSaida,
  log: conferirNaSaida,
  url: conferirUrl,
})

/**
 * Abre o alvo de uma citação feita por um agent. Devolve a `Evidencia` com as
 * linhas reais, ou null se o alvo não existe ou o trecho não está nele.
 * @param {Citacao} citacao
 * @param {Fontes} fontes
 * @returns {Promise<Evidencia|null>}
 */
export async function conferirCitacao(citacao, fontes) {
  if (!citacao || typeof citacao !== 'object') return null
  const conferencia = Object.hasOwn(CONFERENCIA, citacao.tipo) ? CONFERENCIA[citacao.tipo] : null
  return conferencia ? conferencia(citacao, fontes) : null
}
