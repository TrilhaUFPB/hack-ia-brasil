import path from 'node:path'

export const PASTAS_IGNORADAS = new Set([
  '.git', 'node_modules', 'bower_components', 'vendor', 'dist', 'build', 'out', 'target', 'coverage',
  '.next', '.nuxt', '.svelte-kit', '.turbo', '.vercel', '.output', '.cache', '.parcel-cache',
  '__pycache__', '.venv', 'venv', 'env', '.tox', '.mypy_cache', '.pytest_cache', 'site-packages',
  'Pods', '.gradle', '.dart_tool', '.idea', '.vscode',
])

const ARQUIVOS_DE_TRAVA = new Set([
  'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock', 'bun.lockb', 'deno.lock',
  'Cargo.lock', 'poetry.lock', 'uv.lock', 'Pipfile.lock', 'pdm.lock', 'composer.lock', 'Gemfile.lock',
  'go.sum', 'mix.lock', 'pubspec.lock', 'Podfile.lock', 'packages.lock.json', 'flake.lock',
])

const GERADO = /(\.min\.(js|css)|\.map|\.snap|\.generated\.[a-z]+|\.g\.dart|\.pb\.go|_pb2(_grpc)?\.py|\.d\.ts|\.bundle\.js|\.lock)$/i

export const EXTENSOES_DE_CODIGO = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.vue', '.svelte', '.astro',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.kts', '.scala', '.swift', '.dart', '.php',
  '.c', '.h', '.cc', '.cpp', '.hpp', '.cs', '.m', '.mm', '.ex', '.exs', '.erl', '.clj', '.lua', '.r',
  '.sh', '.sql', '.html', '.css', '.scss', '.sass', '.less', '.sol', '.ipynb',
])

/** @param {string} caminho relativo à raiz do repositório, com `/` */
export function ehTravaOuGerado(caminho) {
  const segmentos = caminho.split('/')
  const nome = segmentos.at(-1)
  return ARQUIVOS_DE_TRAVA.has(nome) || GERADO.test(nome) || segmentos.slice(0, -1).some((s) => PASTAS_IGNORADAS.has(s))
}

/** @param {string} caminho relativo à raiz do repositório, com `/` */
export function ehCodigoFonte(caminho) {
  return EXTENSOES_DE_CODIGO.has(path.extname(caminho).toLowerCase()) && !ehTravaOuGerado(caminho)
}
