import fs from 'node:fs'
import path from 'node:path'
import { CONFIG } from '../config.mjs'
import { criarTabela, resumirEquipe } from '../nucleo/tabela.mjs'
import { ErroDeUso, analisar, comCodigoDeSaida, dirsDe, paraComparar } from './argumentos.mjs'

const OPCOES = {
  csv: { tipo: 'texto' },
  modo: { tipo: 'escolha', valores: ['previa', 'final'] },
  equipe: { tipo: 'texto', repetivel: true },
  refazer: { tipo: 'texto', repetivel: true },
  dir: { tipo: 'texto' },
  inicio: { tipo: 'instante' },
  fim: { tipo: 'instante' },
  agentes: { tipo: 'inteiro', padrao: CONFIG.filas.agentes },
  containers: { tipo: 'inteiro', padrao: CONFIG.filas.containers },
  build: { tipo: 'escolha', valores: ['todos', 'sem-deploy', 'nenhum'] },
  'sem-isolamento': { tipo: 'marca' },
}

/** Importados na hora do uso: um módulo de outro escopo que não carrega não derruba a leitura dos argumentos. */
async function modulosReais() {
  const [csv, equipe, armazem, docker, registro, orquestrador, isolamento] = await Promise.all([
    import('../ferramentas/csv.mjs'),
    import('../dominio/equipe.mjs'),
    import('../nucleo/armazem.mjs'),
    import('../ferramentas/docker.mjs'),
    import('../nucleo/registro.mjs'),
    import('../nucleo/orquestrador.mjs'),
    import('../ferramentas/isolamento.mjs'),
  ])
  return {
    carregarCsv: csv.carregarCsv,
    lerEquipes: equipe.lerEquipes,
    criarArmazem: armazem.criarArmazem,
    varrerOrfaos: docker.varrerOrfaos,
    aplicarIsolamento: isolamento.aplicarIsolamento,
    carregarRegistro: registro.carregarRegistro,
    criarExecucao: orquestrador.criarExecucao,
  }
}

/**
 * Uma execução por pasta de dados. A limpeza de containers no início removeria
 * os containers de outra execução em curso.
 * @param {string} dirSaida
 * @returns {() => void} libera a trava
 */
function travarExecucao(dirSaida) {
  const arquivo = path.join(dirSaida, '.execucao.pid')
  fs.mkdirSync(dirSaida, { recursive: true })
  const anterior = Number(fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : NaN)
  if (Number.isInteger(anterior) && anterior !== process.pid && processoVivo(anterior)) {
    throw new ErroDeUso(`Já existe uma execução em andamento nesta pasta (processo ${anterior}). Espere terminar ou interrompa com Ctrl+C: nada se perde.`)
  }
  fs.writeFileSync(arquivo, String(process.pid))
  return () => fs.rmSync(arquivo, { force: true })
}

function processoVivo(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (erro) {
    return erro.code === 'EPERM'
  }
}

/** @returns {() => void} desfaz o registro */
function aoInterromperReal(tratar) {
  process.once('SIGINT', tratar)
  return () => process.removeListener('SIGINT', tratar)
}

/**
 * @param {import('../dominio/tipos.mjs').Equipe[]} equipes
 * @param {string[]} pedidas nomes ou ids vindos de `--equipe`
 * @returns {string[]|null} ids, ou null quando não há filtro
 */
function filtrarEquipes(equipes, pedidas) {
  if (pedidas.length === 0) return null
  const ids = pedidas.map((pedida) => {
    const alvo = paraComparar(pedida)
    const achada = equipes.find((equipe) => paraComparar(equipe.nome) === alvo || paraComparar(equipe.id) === alvo)
    if (!achada) {
      const disponiveis = equipes.map((equipe) => `  ${equipe.nome} (${equipe.id})`).join('\n')
      throw new ErroDeUso(`Nenhuma equipe corresponde a "${pedida}". Equipes disponíveis:\n${disponiveis}`)
    }
    return achada.id
  })
  return [...new Set(ids)]
}

function conferirRefazer(refazer, registro) {
  for (const id of refazer) {
    if (!registro.porId.has(id)) {
      throw new ErroDeUso(`--refazer: não existe a etapa "${id}". Etapas: ${registro.etapas.map((etapa) => etapa.id).join(', ')}.`)
    }
  }
}

/**
 * @param {string[]} argv
 * @param {object} [injetado]   substitutos para teste
 * @param {(linha: string) => void} [injetado.escrever]
 * @param {Awaited<ReturnType<typeof modulosReais>>} [injetado.modulos]
 * @param {(tratar: () => void) => () => void} [injetado.aoInterromper]
 * @param {Parameters<typeof criarTabela>[0]['fluxo']} [injetado.fluxo]
 * @returns {Promise<number>} código de saída
 */
export function rodar(argv, { escrever = console.log, modulos, aoInterromper = aoInterromperReal, fluxo = process.stdout } = {}) {
  return comCodigoDeSaida(async () => {
    const opcoes = analisar(argv, OPCOES)
    const m = modulos ?? (await modulosReais())
    const dirs = dirsDe(opcoes.dir)
    const armazem = m.criarArmazem(dirs)

    // Sem --csv a execução continua a rodada gravada, então modo, janela e build dela valem como padrão.
    const anterior = opcoes.csv ? null : await armazem.lerRodada()
    if (!opcoes.csv && !anterior) {
      throw new ErroDeUso(`Não há rodada gravada em ${path.join(dirs.saida, 'rodada.json')}. Informe --csv <arquivo ou link>.`)
    }
    const equipes = anterior ? anterior.equipes : m.lerEquipes(await m.carregarCsv(opcoes.csv))
    if (equipes.length === 0) throw new ErroDeUso(`Nenhuma equipe encontrada em ${opcoes.csv}.`)

    const janela = {
      inicio: opcoes.inicio ?? anterior?.janela.inicio ?? CONFIG.janela.inicio,
      fim: opcoes.fim ?? anterior?.janela.fim ?? CONFIG.janela.fim,
    }
    if (Date.parse(janela.fim) <= Date.parse(janela.inicio)) {
      throw new ErroDeUso(`A janela termina (${janela.fim}) antes de começar (${janela.inicio}).`)
    }

    const somente = filtrarEquipes(equipes, opcoes.equipe)
    const registro = await m.carregarRegistro()
    conferirRefazer(opcoes.refazer, registro)

    /** @type {import('../dominio/tipos.mjs').Rodada} */
    const rodada = {
      modo: opcoes.modo ?? anterior?.modo ?? 'previa',
      janela,
      dirs,
      equipes,
      opcoes: { refazer: opcoes.refazer, build: opcoes.build ?? anterior?.opcoes.build ?? 'sem-deploy', somente },
    }
    const liberar = travarExecucao(dirs.saida)
    try {
      return await executarRodada({ m, armazem, rodada, registro, opcoes, dirs, equipes, escrever, aoInterromper, fluxo })
    } finally {
      liberar()
    }
  }, escrever)
}

async function executarRodada({ m, armazem, rodada, registro, opcoes, dirs, equipes, escrever, aoInterromper, fluxo }) {
  await armazem.gravarRodada(rodada)
  await Promise.all(equipes.map((equipe) => armazem.gravarFormulario(equipe)))

  try {
    await m.varrerOrfaos()
  } catch (erro) {
    escrever(`Aviso: o Docker não respondeu (${erro.message}). Etapas que usam container vão falhar. Rode preparar.mjs para conferir.`)
  }

  // Sem a regra de firewall, um link de demo ou um projeto de equipe alcança esta máquina e a rede local.
  const isolamento = await m.aplicarIsolamento(CONFIG.imagens.base).catch((erro) => ({ ativo: false, detalhe: erro.message }))
  if (!isolamento.ativo && !opcoes['sem-isolamento']) {
    escrever(`Isolamento de rede inativo: ${isolamento.detalhe}.`)
    escrever('Sem ele, containers com código e páginas de equipes alcançam esta máquina e a rede local.')
    escrever('Rode preparar.mjs para ver o que falta, ou repita com --sem-isolamento para rodar assim mesmo.')
    return 1
  }
  if (!isolamento.ativo) escrever(`Aviso: rodando sem isolamento de rede (${isolamento.detalhe}).`)

  const tabela = criarTabela({ rodada, registro, fluxo })
  const execucao = m.criarExecucao({
    rodada,
    registro,
    armazem,
    limites: { scripts: CONFIG.filas.scripts, agentes: opcoes.agentes, containers: opcoes.containers },
    aoMudar: (situacoes) => tabela.atualizar(situacoes),
  })

  let interrompido = false
  const desfazer = aoInterromper(() => {
    interrompido = true
    execucao.abortar()
  })
  try {
    await execucao.rodar()
  } catch (erro) {
    if (!interrompido) throw erro
  } finally {
    desfazer()
    tabela.atualizar(execucao.situacoes())
    tabela.encerrar()
  }

  if (interrompido) {
    await m.varrerOrfaos().catch(() => {})
    escrever('Interrompido. Nada se perdeu: rode de novo para retomar.')
    return 130
  }

  const situacoes = execucao.situacoes()
  escrever('')
  for (const equipe of equipes) {
    const celulas = resumirEquipe(registro, situacoes[equipe.id]).map((celula) => `${celula.titulo} ${celula.texto}`)
    escrever(`${equipe.nome}: ${celulas.join(' · ')}`)
  }
  escrever(path.join(dirs.saida, 'index.html'))
  return 0
}
