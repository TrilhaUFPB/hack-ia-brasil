/** @typedef {'aguardando'|'rodando'|'pronto'|'falhou'|'tempo_esgotado'} Situacao */

export const COLUNAS_DA_TABELA = Object.freeze([
  { chave: 'fatos', titulo: 'Fatos' },
  { chave: 'build', titulo: 'Build' },
  { chave: 'leitor', titulo: 'Leitor' },
  { chave: 'uso', titulo: 'Uso' },
  { chave: 'conferidor', titulo: 'Conferidor' },
  { chave: 'relatorio', titulo: 'Relatório' },
])

const ROTULO = { aguardando: 'aguardando', rodando: 'rodando', pronto: 'pronto', falhou: 'falhou', tempo_esgotado: 'tempo esgotado' }
const LARGURA_DO_NOME = 28
const INTERVALO_DE_DESENHO = 250

/** @returns {Record<string, string[]>} ids de etapa (ou a chave `relatorio`) por coluna da tabela */
function etapasPorColuna(registro) {
  const porColuna = Object.fromEntries(COLUNAS_DA_TABELA.map(({ chave }) => [chave, []]))
  for (const etapa of registro.etapas) {
    porColuna[etapa.id.endsWith('.conferido') ? 'conferidor' : etapa.coluna].push(etapa.id)
  }
  porColuna.relatorio.push('relatorio')
  return porColuna
}

/** @param {Situacao[]} situacoes das etapas de uma coluna */
function resumirCelula(situacoes) {
  if (situacoes.length === 0) return '–'
  if (situacoes.includes('rodando')) return ROTULO.rodando
  for (const ruim of ['falhou', 'tempo_esgotado']) {
    const quantas = situacoes.filter((situacao) => situacao === ruim).length
    if (quantas > 0) return situacoes.length === 1 ? ROTULO[ruim] : `${ROTULO[ruim]} ${quantas}/${situacoes.length}`
  }
  return situacoes.every((situacao) => situacao === 'pronto') ? ROTULO.pronto : ROTULO.aguardando
}

/**
 * @param {{etapas: {id: string, coluna: string}[]}} registro
 * @param {Record<string, Situacao>} daEquipe
 * @returns {{titulo: string, texto: string}[]} uma célula por coluna, na ordem da tabela
 */
export function resumirEquipe(registro, daEquipe = {}) {
  const porColuna = etapasPorColuna(registro)
  return COLUNAS_DA_TABELA.map(({ chave, titulo }) => ({
    titulo,
    texto: resumirCelula(porColuna[chave].map((id) => daEquipe[id] ?? 'aguardando')),
  }))
}

function relogio(ms) {
  const segundos = Math.floor(ms / 1000)
  const doisDigitos = (n) => String(n).padStart(2, '0')
  const horas = Math.floor(segundos / 3600)
  const resto = `${doisDigitos(Math.floor((segundos % 3600) / 60))}m${doisDigitos(segundos % 60)}s`
  return horas > 0 ? `${horas}h${resto}` : resto
}

const cortar = (texto, largura) => (texto.length > largura ? `${texto.slice(0, largura - 1)}…` : texto)

/**
 * @param {object} p
 * @param {import('../dominio/tipos.mjs').Rodada} p.rodada
 * @param {{etapas: {id: string, coluna: string}[]}} p.registro
 * @param {Record<string, Record<string, Situacao>>} p.situacoes
 * @param {number} [p.decorrido_ms]   ausente em `status`, que não mede tempo
 * @returns {string}
 */
export function desenharTabela({ rodada, registro, situacoes, decorrido_ms }) {
  const quantas = rodada.equipes.length
  const cabecalho = [`Rodada ${rodada.modo}`, `${quantas} ${quantas === 1 ? 'equipe' : 'equipes'}`]
  if (decorrido_ms != null) cabecalho.push(`decorrido ${relogio(decorrido_ms)}`)

  const linhas = [
    ['Equipe', ...COLUNAS_DA_TABELA.map((coluna) => coluna.titulo)],
    ...rodada.equipes.map((equipe) => [
      cortar(equipe.nome, LARGURA_DO_NOME),
      ...resumirEquipe(registro, situacoes[equipe.id]).map((celula) => celula.texto),
    ]),
  ]
  const larguras = linhas[0].map((_, coluna) => Math.max(...linhas.map((linha) => linha[coluna].length)))
  const desenhadas = linhas.map((linha) => linha.map((celula, coluna) => celula.padEnd(larguras[coluna])).join('  ').trimEnd())
  return [cabecalho.join(' · '), '', ...desenhadas].join('\n')
}

/**
 * @param {object} p
 * @param {import('../dominio/tipos.mjs').Rodada} p.rodada
 * @param {{etapas: {id: string, coluna: string}[]}} p.registro
 * @param {{isTTY?: boolean, columns?: number, write: (texto: string) => unknown}} [p.fluxo]
 * @param {() => number} [p.agora]
 * @returns {{atualizar: (situacoes: Record<string, Record<string, Situacao>>) => void, encerrar: () => void}}
 */
export function criarTabela({ rodada, registro, fluxo = process.stdout, agora = Date.now }) {
  const inicio = agora()
  const nomes = new Map(rodada.equipes.map((equipe) => [equipe.id, equipe.nome]))
  let atuais = {}

  if (!fluxo.isTTY) {
    return {
      atualizar(situacoes) {
        const hora = new Date(agora()).toTimeString().slice(0, 8)
        for (const [idEquipe, daEquipe] of Object.entries(situacoes)) {
          for (const [idEtapa, situacao] of Object.entries(daEquipe)) {
            if ((atuais[idEquipe]?.[idEtapa] ?? 'aguardando') === situacao) continue
            fluxo.write(`${hora}  ${nomes.get(idEquipe) ?? idEquipe}  ${idEtapa}: ${ROTULO[situacao] ?? situacao}\n`)
          }
        }
        atuais = structuredClone(situacoes)
      },
      encerrar() {},
    }
  }

  let linhasDesenhadas = 0
  let ultimoDesenho = -Infinity
  let agendado = null

  const desenhar = () => {
    agendado = null
    ultimoDesenho = agora()
    const largura = fluxo.columns ?? 120
    // Linha maior que o terminal quebra em duas e desalinha o retorno do cursor.
    const linhas = desenharTabela({ rodada, registro, situacoes: atuais, decorrido_ms: agora() - inicio })
      .split('\n')
      .map((linha) => cortar(linha, largura - 1))
    const voltar = linhasDesenhadas > 0 ? `\x1b[${linhasDesenhadas}A` : ''
    fluxo.write(`${voltar}\x1b[0J${linhas.join('\n')}\n`)
    linhasDesenhadas = linhas.length
  }

  const pedirDesenho = () => {
    if (agendado) return
    const espera = ultimoDesenho + INTERVALO_DE_DESENHO - agora()
    if (espera <= 0) return desenhar()
    agendado = setTimeout(desenhar, espera)
    agendado.unref?.()
  }

  const relogioDoDecorrido = setInterval(pedirDesenho, 1000)
  relogioDoDecorrido.unref?.()

  return {
    atualizar(situacoes) {
      atuais = situacoes
      pedirDesenho()
    },
    encerrar() {
      clearInterval(relogioDoDecorrido)
      clearTimeout(agendado)
      desenhar()
    },
  }
}
