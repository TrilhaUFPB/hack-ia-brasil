import { test } from 'node:test'
import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const RAIZ = path.join(import.meta.dirname, '..')

async function arquivosMjs(pasta) {
  const entradas = await fsp.readdir(pasta, { withFileTypes: true, recursive: true }).catch(() => [])
  return entradas.filter((entrada) => entrada.isFile() && entrada.name.endsWith('.mjs')).map((entrada) => path.join(entrada.parentPath, entrada.name))
}

async function importacoesDe(arquivo) {
  const texto = await fsp.readFile(arquivo, 'utf8')
  const especificadores = [...texto.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"]+)\1/g)].map((achado) => achado[2])
  return especificadores.filter((especificador) => especificador.startsWith('.')).map((especificador) => path.resolve(path.dirname(arquivo), especificador))
}

async function violacoes(pastas, proibido) {
  const achadas = []
  for (const pasta of pastas) {
    for (const arquivo of await arquivosMjs(path.join(RAIZ, pasta))) {
      for (const alvo of await importacoesDe(arquivo)) {
        if (proibido(alvo)) achadas.push(`${path.relative(RAIZ, arquivo)} importa ${path.relative(RAIZ, alvo)}`)
      }
    }
  }
  return achadas
}

const dentroDe = (pasta) => (alvo) => alvo.startsWith(path.join(RAIZ, pasta) + path.sep)

test('etapas e página não importam o armazém', async () => {
  const armazem = path.join(RAIZ, 'nucleo', 'armazem.mjs')
  assert.deepEqual(await violacoes(['etapas', 'pagina'], (alvo) => alvo === armazem), [])
})

test('a página não importa do núcleo nem das etapas', async () => {
  assert.deepEqual(await violacoes(['pagina'], (alvo) => dentroDe('nucleo')(alvo) || dentroDe('etapas')(alvo)), [])
})

test('o leitor de imports enxerga import estático, dinâmico e de efeito', async (t) => {
  const pasta = await fsp.mkdtemp(path.join(os.tmpdir(), 'rt-teste-nucleo-fronteiras-'))
  t.after(() => fsp.rm(pasta, { recursive: true, force: true }))
  const arquivo = path.join(pasta, 'pagina', 'exemplo.mjs')
  await fsp.mkdir(path.dirname(arquivo))
  await fsp.writeFile(arquivo, "import { a } from '../nucleo/armazem.mjs'\nconst b = await import(\"../etapas/x.mjs\")\nimport './y.mjs'\nimport fs from 'node:fs'\n")
  assert.deepEqual(await importacoesDe(arquivo), [
    path.join(pasta, 'nucleo', 'armazem.mjs'),
    path.join(pasta, 'etapas', 'x.mjs'),
    path.join(pasta, 'pagina', 'y.mjs'),
  ])
})
