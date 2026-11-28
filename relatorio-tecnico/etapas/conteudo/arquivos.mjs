/**
 * O único percorredor da árvore de código de uma equipe. Só lê: nada do que
 * está na árvore é executado ou seguido para fora dela.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'

const PASTAS_IGNORADAS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'venv', '.venv', '__pycache__', 'vendor'])

const ARQUIVOS_DE_TRAVA = new Set([
  'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock', 'bun.lockb',
  'cargo.lock', 'poetry.lock', 'uv.lock', 'pipfile.lock', 'gemfile.lock', 'composer.lock', 'go.sum', 'deno.lock',
])

const EXTENSOES_BINARIAS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'icns', 'bmp', 'tiff', 'psd', 'pdf',
  'zip', 'gz', 'tgz', 'tar', 'rar', '7z', 'jar', 'war',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp3', 'mp4', 'mov', 'avi', 'wav', 'ogg', 'webm', 'm4a',
  'exe', 'dll', 'so', 'dylib', 'bin', 'class', 'pyc', 'wasm', 'o', 'a',
  'sqlite', 'sqlite3', 'db', 'parquet', 'pkl', 'onnx', 'pt', 'safetensors',
])

const TAMANHO_MAXIMO = 1024 * 1024

/** `codigo: true` marca linguagem em que uma linha pode ser chamada, pendência ou resposta fixa. */
const LINGUAGENS = {
  ts: ['TypeScript', true], tsx: ['TypeScript', true], mts: ['TypeScript', true], cts: ['TypeScript', true],
  js: ['JavaScript', true], jsx: ['JavaScript', true], mjs: ['JavaScript', true], cjs: ['JavaScript', true],
  py: ['Python', true], ipynb: ['Jupyter', true], go: ['Go', true], rs: ['Rust', true], rb: ['Ruby', true],
  java: ['Java', true], kt: ['Kotlin', true], swift: ['Swift', true], php: ['PHP', true], cs: ['C#', true],
  c: ['C', true], h: ['C', true], cpp: ['C++', true], cc: ['C++', true], hpp: ['C++', true],
  dart: ['Dart', true], ex: ['Elixir', true], exs: ['Elixir', true], scala: ['Scala', true], lua: ['Lua', true],
  vue: ['Vue', true], svelte: ['Svelte', true], astro: ['Astro', true], html: ['HTML', true], htm: ['HTML', true],
  sh: ['Shell', true], bash: ['Shell', true], zsh: ['Shell', true], sql: ['SQL', true],
  css: ['CSS', false], scss: ['CSS', false], sass: ['CSS', false], less: ['CSS', false],
  md: ['Markdown', false], mdx: ['Markdown', false], json: ['JSON', false],
  yml: ['YAML', false], yaml: ['YAML', false], toml: ['TOML', false],
}

const extensao = (caminho) => path.extname(caminho).slice(1).toLowerCase()

/** @param {string} caminho @returns {string|null} */
export const linguagemDe = (caminho) => LINGUAGENS[extensao(caminho)]?.[0] ?? null

/** @param {string} caminho @returns {boolean} */
export const ehCodigo = (caminho) => LINGUAGENS[extensao(caminho)]?.[1] === true

/** @param {string} caminho @returns {boolean} */
export const ehTeste = (caminho) =>
  /(^|\/)(tests?|testes|__tests__|__mocks__|spec|e2e|fixtures|cypress)\//i.test(caminho) ||
  /(\.|_|-)(test|spec)\.[a-z]+$/i.test(caminho) || /(^|\/)test_[^/]+\.py$/i.test(caminho)

/** @param {string} caminho @returns {number} */
export const profundidade = (caminho) => caminho.split('/').length - 1

function ignorado(nome) {
  const minusculo = nome.toLowerCase()
  return ARQUIVOS_DE_TRAVA.has(minusculo) || EXTENSOES_BINARIAS.has(extensao(minusculo)) ||
    minusculo.endsWith('.min.js') || minusculo.endsWith('.min.css') || minusculo.endsWith('.map')
}

/**
 * Arquivos de texto da árvore, em ordem alfabética de caminho. Deixa de fora
 * pastas de dependência e de saída de build, arquivos de trava, binários,
 * arquivos acima de 1 MB e ligações simbólicas.
 * @param {string} raiz
 * @returns {AsyncGenerator<{caminho: string, texto: string, linhas: string[]}>} `caminho` relativo à raiz, com `/`
 */
export async function* percorrer(raiz) {
  const pilha = ['']
  while (pilha.length > 0) {
    const relativa = pilha.pop()
    let entradas
    try {
      entradas = await fsp.readdir(path.join(raiz, relativa), { withFileTypes: true })
    } catch {
      continue
    }
    entradas.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    const subpastas = []
    for (const entrada of entradas) {
      const caminho = relativa ? `${relativa}/${entrada.name}` : entrada.name
      if (entrada.isDirectory()) {
        if (!PASTAS_IGNORADAS.has(entrada.name)) subpastas.push(caminho)
        continue
      }
      if (!entrada.isFile() || ignorado(entrada.name)) continue
      const absoluto = path.join(raiz, caminho)
      let conteudo
      try {
        if ((await fsp.stat(absoluto)).size > TAMANHO_MAXIMO) continue
        conteudo = await fsp.readFile(absoluto)
      } catch {
        continue
      }
      if (conteudo.subarray(0, 8000).includes(0)) continue
      const texto = conteudo.toString('utf8')
      yield { caminho, texto, linhas: texto.split('\n') }
    }
    pilha.push(...subpastas.reverse())
  }
}

/** @param {string} linha @returns {string} */
export const aparar = (linha) => linha.trim().slice(0, 200)
