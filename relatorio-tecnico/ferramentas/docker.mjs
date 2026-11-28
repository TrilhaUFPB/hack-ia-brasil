/**
 * Tudo que o harness pede ao Docker. Código de equipe só existe dentro dos
 * containers criados aqui: entra por `docker cp`, roda na rede da equipe, com
 * os limites de `CONFIG.container` e sem nenhuma variável da máquina.
 */
import { setTimeout as esperar } from 'node:timers/promises'
import { CONFIG } from '../config.mjs'
import { garantirRede as garantirRedeIsolada } from './isolamento.mjs'
import { ambienteLimpo, rodar, rodarOuLancar } from './processo.mjs'

const ROTULO = 'rt=1'
const SEM_SAIDA_MS = 120_000
const ESPERA_HTTP_MS = 20_000
const INTERVALO_MS = 1000
/** Acima disso ficam as portas efêmeras, entre elas a do DNS embutido do Docker. */
const MAIOR_PORTA = 30000
const PORTA_DNS = 53

/** @param {string} id */
export const nomesDe = (id) => ({
  rede: `rt-${id}`,
  projeto: `rt-${id}-projeto`,
  dns: `rt-${id}-dns`,
  build: `rt-${id}-build`,
})

const limites = () => ['--memory', CONFIG.container.memoria, '--cpus', CONFIG.container.cpus, '--pids-limit', CONFIG.container.pids]
const variaveis = (env = {}) => Object.entries(env).flatMap(([nome, valor]) => ['-e', `${nome}=${valor}`])
const linhasDe = (texto) => texto.split('\n').map((linha) => linha.trim()).filter(Boolean)

/** @param {string} tag @returns {Promise<boolean>} */
export async function imagemExiste(tag) {
  const { codigo } = await rodar('docker', ['image', 'inspect', tag])
  return codigo === 0
}

/** A rede da equipe fica dentro da faixa que o firewall isola da máquina e da rede local. */
const garantirRede = (id) => garantirRedeIsolada(nomesDe(id).rede)

/** Nunca lança: é chamada em limpeza. @param {string[]} nomes */
export async function remover(nomes) {
  if (nomes.length === 0) return
  await rodar('docker', ['rm', '-f', ...nomes]).catch(() => {})
}

/** Nunca lança. @param {string} id */
export async function desmontar(id) {
  const nomes = nomesDe(id)
  await remover([nomes.projeto, nomes.dns, nomes.build])
  await rodar('docker', ['network', 'rm', nomes.rede]).catch(() => {})
}

/**
 * Cria um container na rede da equipe, com os limites e o rótulo. Um container
 * anterior de mesmo nome é removido antes.
 * @param {{nome: string, id: string, imagem: string, comando?: string|null, env?: Record<string, string>, sinal?: AbortSignal}} opcoes
 */
export async function criarContainer({ nome, id, imagem, comando, env, sinal }) {
  await remover([nome])
  await garantirRede(id)
  await rodarOuLancar(
    'docker',
    ['run', '-d', '--init', '--name', nome, '--label', ROTULO, '--network', nomesDe(id).rede, ...limites(), ...variaveis(env), imagem, ...(comando ? ['sh', '-c', comando] : [])],
    { sinal },
  )
}

/** @param {string} nome @param {string} origem pasta na máquina @param {string} destino pasta no container */
export async function copiarPara(nome, origem, destino, { sinal } = {}) {
  await rodarOuLancar('docker', ['cp', `${origem}/.`, `${nome}:${destino}`], { sinal })
}

/** @param {string} nome @param {string} caminho @param {string} conteudo */
export async function gravarArquivo(nome, caminho, conteudo, { sinal } = {}) {
  await rodarOuLancar('docker', ['exec', '-i', nome, 'sh', '-c', 'cat > "$1"', 'sh', caminho], { sinal, entrada: conteudo })
}

/**
 * Roda um comando de shell dentro do container. Código de saída diferente de zero não lança.
 * @param {string} nome @param {string} comando
 * @param {{pasta: string, pulso?: (linha: string) => void, sinal?: AbortSignal}} opcoes
 */
export function executarNo(nome, comando, { pasta, pulso, sinal }) {
  return rodar('docker', ['exec', '-w', pasta, nome, 'sh', '-c', comando], { pulso, sinal })
}

export async function consolidar(nome, imagem, { pasta, sinal } = {}) {
  await rodarOuLancar('docker', ['commit', '--change', `WORKDIR ${pasta}`, nome, imagem], { sinal })
}

/**
 * Constrói a imagem com o Dockerfile da equipe. Código de saída diferente de zero não lança.
 * Os passos do Dockerfile são código da equipe, então rodam na rede isolada dela.
 * O BuildKit não aceita rede própria; o construtor clássico aceita.
 */
export async function construirImagem(dir, imagem, { id, pulso, sinal }) {
  const rede = await garantirRede(id)
  return rodar('docker', ['build', '--network', rede, '--label', ROTULO, '-t', imagem, dir], {
    pulso, sinal, env: ambienteLimpo({ DOCKER_BUILDKIT: '0' }),
  })
}

async function rodando(nome) {
  const { codigo, stdout } = await rodar('docker', ['inspect', '-f', '{{.State.Running}}', nome])
  return codigo === 0 && stdout.trim() === 'true'
}

/** @param {string} texto conteúdo de /proc/net/tcp e /proc/net/tcp6 @returns {number[]} */
export function portasEmEscuta(texto) {
  const portas = new Set()
  for (const linha of linhasDe(texto)) {
    const [, local, , estado] = linha.split(/\s+/)
    if (estado !== '0A') continue
    const porta = parseInt(local.split(':').pop(), 16)
    if (porta !== PORTA_DNS && porta <= MAIOR_PORTA) portas.add(porta)
  }
  return [...portas].sort((a, b) => a - b)
}

/** @param {string} texto saída do tcpdump com -vv @returns {string[]} nomes de host distintos */
export function nomesResolvidos(texto) {
  const nomes = new Set()
  for (const [, nome] of texto.matchAll(/q: (?:A|AAAA)\? (\S+?)\.(?=\s|$)/g)) nomes.add(nome.toLowerCase())
  return [...nomes]
}

/**
 * O auxiliar divide o espaço de rede com o projeto, então enxerga as mesmas
 * portas e o mesmo localhost sem depender do que a imagem da equipe traz.
 */
async function lerPortas(auxiliar, sinal) {
  const { codigo, stdout, stderr } = await rodar('docker', ['exec', auxiliar, 'sh', '-c', 'cat /proc/net/tcp /proc/net/tcp6 2>/dev/null'], { sinal })
  if (codigo !== 0 && !stdout) throw new Error(`não foi possível ler as portas pelo container ${auxiliar}: ${stderr.trim()}`)
  return portasEmEscuta(stdout)
}

async function respondeHttp(auxiliar, porta, sinal) {
  const { stdout } = await rodar('docker', ['exec', auxiliar, 'curl', '-s', '-o', '/dev/null', '-m', '3', '-w', '%{http_code}', `http://localhost:${porta}/`], { sinal })
  return stdout.trim() !== '' && stdout.trim() !== '000'
}

async function esperarPorta({ nomes, pulso, sinal }) {
  let ultimaLinha = Date.now()
  const fimDoLog = new AbortController()
  const encerrar = () => fimDoLog.abort()
  sinal?.addEventListener('abort', encerrar, { once: true })
  rodar('docker', ['logs', '-f', nomes.projeto], {
    sinal: fimDoLog.signal,
    pulso: (linha) => {
      ultimaLinha = Date.now()
      pulso(linha)
    },
  }).catch(() => {})

  try {
    let portas = []
    while (portas.length === 0) {
      if (!(await rodando(nomes.projeto))) return null
      portas = await lerPortas(nomes.dns, sinal)
      if (portas.length > 0) break
      if (Date.now() - ultimaLinha > SEM_SAIDA_MS) return null
      await esperar(INTERVALO_MS, undefined, { signal: sinal })
    }
    const limite = Date.now() + ESPERA_HTTP_MS
    while (Date.now() < limite && (await rodando(nomes.projeto))) {
      for (const porta of portas) if (await respondeHttp(nomes.dns, porta, sinal)) return porta
      await esperar(INTERVALO_MS, undefined, { signal: sinal })
      portas = (await lerPortas(nomes.dns, sinal).catch(() => [])).concat(portas).filter((porta, i, todas) => todas.indexOf(porta) === i)
    }
    return (await rodando(nomes.projeto)) ? portas[0] : null
  } finally {
    sinal?.removeEventListener('abort', encerrar)
    fimDoLog.abort()
  }
}

/**
 * @typedef {object} Instancia
 * @property {string} nome
 * @property {string} rede            `container:<nome>`, para o navegador entrar no mesmo localhost
 * @property {number|null} porta      null: o processo terminou ou ficou 120 s sem saída e sem porta
 * @property {string|null} url
 * @property {() => Promise<string[]>} conexoes   nomes de host resolvidos desde a subida
 * @property {() => Promise<string>} log          últimas 200 linhas
 * @property {() => Promise<void>} parar          remove container, auxiliar e rede; nunca lança
 */

/**
 * Sobe o projeto da equipe e espera uma porta escutar.
 * @param {object} opcoes
 * @param {string} opcoes.imagem
 * @param {string} opcoes.id
 * @param {string|null} [opcoes.comando]   null: o comando padrão da imagem
 * @param {Record<string, string>} [opcoes.env]
 * @param {(linha: string) => void} [opcoes.pulso]
 * @param {AbortSignal} [opcoes.sinal]
 * @returns {Promise<Instancia>}
 */
export async function subir({ imagem, id, comando, env, pulso = () => {}, sinal }) {
  const nomes = nomesDe(id)
  const parar = () => desmontar(id)
  try {
    await remover([nomes.dns])
    await criarContainer({ nome: nomes.projeto, id, imagem, comando, env, sinal })
    const auxiliar = await rodar(
      'docker',
      ['run', '-d', '--name', nomes.dns, '--label', ROTULO, '--network', `container:${nomes.projeto}`, ...limites(),
        '--cap-add', 'NET_RAW', '--cap-add', 'NET_ADMIN', CONFIG.imagens.base, 'tcpdump', '-l', '-n', '-vv', '-i', 'any', 'port 53'],
      { sinal },
    )
    if (auxiliar.codigo !== 0 && (await rodando(nomes.projeto))) {
      throw new Error(`o container auxiliar de DNS não iniciou: ${auxiliar.stderr.trim()}`)
    }
    const porta = await esperarPorta({ nomes, pulso, sinal })
    return {
      nome: nomes.projeto,
      rede: `container:${nomes.projeto}`,
      porta,
      url: porta === null ? null : `http://localhost:${porta}`,
      conexoes: async () => nomesResolvidos((await rodar('docker', ['logs', nomes.dns])).stdout),
      log: async () => (await rodar('sh', ['-c', 'docker logs --tail 200 "$1" 2>&1', 'sh', nomes.projeto])).stdout,
      parar,
    }
  } catch (erro) {
    await parar()
    throw erro
  }
}

/**
 * Remove containers e redes com o rótulo `rt=1`. Nada sem o rótulo é tocado.
 * @param {{prefixo?: string}} [opcoes]   restringe aos nomes que começam com o prefixo
 */
export async function varrerOrfaos({ prefixo } = {}) {
  const filtros = ['--filter', `label=${ROTULO}`, ...(prefixo ? ['--filter', `name=^${prefixo}`] : [])]
  const containers = linhasDe((await rodarOuLancar('docker', ['ps', '-aq', ...filtros])))
  await remover(containers)
  const redes = linhasDe(await rodarOuLancar('docker', ['network', 'ls', '-q', ...filtros]))
  if (redes.length > 0) await rodar('docker', ['network', 'rm', ...redes])
}
