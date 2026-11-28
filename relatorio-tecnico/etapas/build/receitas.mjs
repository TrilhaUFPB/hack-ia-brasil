/**
 * Como instalar, compilar e subir um projeto, decidido pelos arquivos que ele
 * traz. Só lê arquivos: nada do projeto é executado aqui.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * @typedef {object} Receita
 * @property {string} tipo            'dockerfile' | 'node' | 'python'
 * @property {string[]} instalar
 * @property {string[]} compilar
 * @property {string|null} subir      null: comando padrão da imagem (dockerfile) ou nenhum comando reconhecido
 * @property {string} pasta           relativa à raiz do código; '.' para a raiz
 * @property {string[]} outras_pastas pastas com manifesto que não foram escolhidas
 */

const PASTAS = ['frontend', 'web', 'client', 'app', 'backend', 'server', 'api']
const EXEMPLOS_DE_ENV = ['.env.example', '.env.sample', '.env.template']

const ler = (dir, nome) => fs.readFile(path.join(dir, nome), 'utf8').catch(() => null)
const existe = (dir, nome) => fs.access(path.join(dir, nome)).then(() => true, () => false)

async function algumExiste(dir, nomes) {
  for (const nome of nomes) if (await existe(dir, nome)) return true
  return false
}

/** `travas` vazio é o padrão. `separador` é o que o gerenciador exige antes de argumentos do script. */
const GERENCIADORES_NODE = [
  { travas: ['pnpm-lock.yaml'], instalar: ['pnpm install --no-frozen-lockfile'], rodar: 'pnpm run', separador: '' },
  { travas: ['yarn.lock'], instalar: ['yarn install'], rodar: 'yarn run', separador: '' },
  { travas: ['bun.lockb', 'bun.lock'], instalar: ['bun install'], rodar: 'bun run', separador: '' },
  { travas: [], instalar: ['npm ci || npm install'], rodar: 'npm run', separador: ' --' },
]

/** Servidores de desenvolvimento que só escutam em localhost sem o argumento. */
const ARGUMENTOS_DE_HOST = [
  { usa: /\bvite\b/, argumentos: '--host 0.0.0.0' },
  { usa: /\bnext\b/, argumentos: '-H 0.0.0.0' },
]

async function receitaDockerfile(dir) {
  if (!(await existe(dir, 'Dockerfile'))) return null
  return { tipo: 'dockerfile', instalar: ['docker build .'], compilar: [], subir: null }
}

async function receitaNode(dir) {
  const texto = await ler(dir, 'package.json')
  if (texto === null) return null
  let scripts = {}
  try {
    scripts = JSON.parse(texto).scripts ?? {}
  } catch {
    // package.json inválido: a instalação vai dizer o erro com as palavras do gerenciador
  }
  let gerenciador = GERENCIADORES_NODE.at(-1)
  for (const candidato of GERENCIADORES_NODE) {
    if (await algumExiste(dir, candidato.travas)) {
      gerenciador = candidato
      break
    }
  }
  const temBuild = typeof scripts.build === 'string'
  const script = ['start', ...(temBuild ? ['preview'] : []), 'dev'].find((nome) => typeof scripts[nome] === 'string')
  const host = script ? ARGUMENTOS_DE_HOST.find(({ usa }) => usa.test(scripts[script])) : undefined
  return {
    tipo: 'node',
    instalar: gerenciador.instalar,
    compilar: temBuild ? [`${gerenciador.rodar} build`] : [],
    subir: script ? `${gerenciador.rodar} ${script}${host ? `${gerenciador.separador} ${host.argumentos}` : ''}` : null,
  }
}

/** A primeira linha cujo manifesto (e trava, se pedida) existe decide. `prefixo` roda o comando no ambiente que a instalação criou. */
const INSTALADORES_PYTHON = [
  { manifesto: 'pyproject.toml', trava: 'uv.lock', instalar: ['uv sync'], prefixo: 'uv run ' },
  { manifesto: 'requirements.txt', instalar: ['pip install -r requirements.txt'], prefixo: '' },
  { manifesto: 'pyproject.toml', instalar: ['pip install .'], prefixo: '' },
]

const moduloDe = (arquivo) => arquivo.replace(/\.py$/, '').replaceAll('/', '.')

/** Em ordem. `dependencia` é procurada nos manifestos; `marca`, no conteúdo do arquivo. */
const SUBIDAS_PYTHON = [
  {
    dependencia: /streamlit/i,
    arquivos: ['app.py', 'main.py', 'streamlit_app.py'],
    comando: (arquivo) => `streamlit run ${arquivo} --server.headless true --server.address 0.0.0.0`,
  },
  { marca: /FastAPI\(/, arquivos: ['main.py', 'app.py', 'app/main.py'], comando: (arquivo) => `uvicorn ${moduloDe(arquivo)}:app --host 0.0.0.0 --port 8000` },
  { marca: /Flask\(/, arquivos: ['app.py', 'main.py'], comando: (arquivo) => `flask --app ${arquivo} run --host 0.0.0.0` },
  { arquivos: ['main.py', 'app.py'], comando: (arquivo) => `python ${arquivo}` },
]

async function subidaPython(dir, dependencias) {
  for (const { dependencia, marca, arquivos, comando } of SUBIDAS_PYTHON) {
    if (dependencia && !dependencia.test(dependencias)) continue
    for (const arquivo of arquivos) {
      const conteudo = await ler(dir, arquivo)
      if (conteudo !== null && (!marca || marca.test(conteudo))) return comando(arquivo)
    }
  }
  return null
}

async function receitaPython(dir) {
  for (const { manifesto, trava, instalar, prefixo } of INSTALADORES_PYTHON) {
    if (!(await existe(dir, manifesto)) || (trava && !(await existe(dir, trava)))) continue
    const dependencias = `${(await ler(dir, 'requirements.txt')) ?? ''}\n${(await ler(dir, 'pyproject.toml')) ?? ''}`
    const subir = await subidaPython(dir, dependencias)
    return { tipo: 'python', instalar, compilar: [], subir: subir === null ? null : prefixo + subir }
  }
  return null
}

/** A ordem é a precedência quando a pasta traz mais de um manifesto. */
const RECEITAS = [receitaDockerfile, receitaNode, receitaPython]

async function receitaDaPasta(dir) {
  for (const receita of RECEITAS) {
    const encontrada = await receita(dir)
    if (encontrada) return encontrada
  }
  return null
}

/**
 * @param {string} dirCodigo
 * @returns {Promise<Receita|null>} null: nenhum manifesto na raiz nem nas pastas conhecidas
 */
export async function detectarReceita(dirCodigo) {
  const encontradas = []
  for (const pasta of ['.', ...PASTAS]) {
    const receita = await receitaDaPasta(path.join(dirCodigo, pasta))
    if (receita) encontradas.push({ ...receita, pasta })
  }
  if (encontradas.length === 0) return null
  const [escolhida, ...outras] = encontradas
  return { ...escolhida, outras_pastas: outras.map((receita) => receita.pasta) }
}

/** A primeira regra que casa com o nome decide. `null` mantém o valor do exemplo. */
const VALORES_FALSOS = [
  { quando: (nome) => nome === 'PORT', valor: null },
  { quando: (nome) => /(URL|URI)$/.test(nome), valor: 'http://localhost:9' },
  { quando: () => true, valor: 'chave-falsa-rt' },
]

/**
 * @param {string} textoExemplo conteúdo de um `.env.example`
 * @returns {{conteudo: string, chaves_falsas: string[], env: Record<string, string>}}
 *   `conteudo` é o `.env` a gravar; `env` traz só as chaves que receberam valor falso
 */
export function valoresFalsos(textoExemplo) {
  const linhas = []
  const env = {}
  for (const linha of textoExemplo.split('\n')) {
    const achado = linha.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/)
    if (!achado) continue
    const [, nome, original] = achado
    const { valor } = VALORES_FALSOS.find((regra) => regra.quando(nome))
    if (valor === null) {
      if (original.trim()) linhas.push(`${nome}=${original.trim()}`)
      continue
    }
    env[nome] = valor
    linhas.push(`${nome}=${valor}`)
  }
  return { conteudo: `${linhas.join('\n')}\n`, chaves_falsas: Object.keys(env), env }
}

/**
 * @param {string} dir pasta da receita
 * @returns {Promise<ReturnType<typeof valoresFalsos>|null>} null: o projeto não traz exemplo de `.env`
 */
export async function lerEnvExemplo(dir) {
  for (const nome of EXEMPLOS_DE_ENV) {
    const texto = await ler(dir, nome)
    if (texto !== null) return valoresFalsos(texto)
  }
  return null
}
