import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'

import composicao from '../etapas/composicao.mjs'
import deploy, { medirDeploy } from '../etapas/deploy.mjs'
import fachada from '../etapas/fachada.mjs'
import segredos from '../etapas/segredos.mjs'
import submissao from '../etapas/submissao.mjs'
import { capturarPagina, configMcpNavegador, impressaoDigital } from '../ferramentas/navegador.mjs'
import { CONFIG } from '../config.mjs'

const PASTA_DE_CAPTURAS = path.join(os.homedir(), 'hack-ia-relatorios', 'teste-conteudo')

const letras = (n, semente) => Array.from({ length: n }, (_, i) => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(i * 7 + semente * 13) % 56]).join('')
const b64 = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url')

// Valores inventados, montados por partes para que nenhuma varredura veja um segredo neste arquivo.
const SEGREDOS = {
  'chave da Anthropic (sk-ant-)': ['sk-', 'ant-', 'api03-', letras(40, 1)].join(''),
  'chave no formato sk- (OpenAI e compatíveis)': ['sk-', 'proj-', letras(40, 2)].join(''),
  'chave de acesso da AWS (AKIA)': ['AK', 'IA', 'QZ7WPLM3RT9VBN2K'].join(''),
  'token do GitHub (ghp_)': ['gh', 'p_', letras(36, 3)].join(''),
  'token do GitHub (github_pat_)': ['github', '_pat_', letras(30, 4)].join(''),
  'chave de API do Google (AIza)': ['AI', 'za', letras(35, 5)].join(''),
  'token do Slack (xox)': ['xo', 'xb-', '48213907-', letras(24, 6)].join(''),
  'JWT de serviço do Supabase (service_role)': [b64({ alg: 'HS256', typ: 'JWT' }), b64({ iss: 'supabase', role: 'service_role', iat: 1 }), letras(43, 7)].join('.'),
}
const JWT_ANONIMO = [b64({ alg: 'HS256', typ: 'JWT' }), b64({ iss: 'supabase', role: 'anon', iat: 1 }), letras(43, 8)].join('.')
const SENHA_DO_ENV = `pg-${letras(18, 9)}`

const ARVORE = {
  'README.md': '# Projeto\n\nUm assistente.\n\n## Como rodar\n\n```\nnpm install\nnpm run dev\n```\n',
  'package.json': JSON.stringify({ dependencies: { '@anthropic-ai/sdk': '^1.0.0', react: '^19.0.0' }, devDependencies: { 'lovable-tagger': '^1.0.0' } }, null, 2),
  'servidor/package.json': JSON.stringify({ dependencies: { fastify: '^5.0.0', '@ai-sdk/openai': '^2.0.0' } }, null, 2),
  'a/b/c/d/package.json': JSON.stringify({ dependencies: { openai: '^5.0.0' } }),
  'api/requirements.txt': '# deps\nflask==3.0\nlangchain-openai>=0.2\n',
  'api/pyproject.toml': '[project]\nname = "api"\nkeywords = ["groq"]\ndependencies = [\n  "google-generativeai>=0.8",\n  "httpx",\n]\n\n[tool.poetry.dependencies]\npython = "^3.12"\nchromadb = "^0.5"\n',
  'go.mod': 'module exemplo\n\ngo 1.23\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.10.0\n)\n',
  'Cargo.toml': '[package]\nname = "x"\n\n[dependencies]\nserde = "1"\n\n[dependencies.tokio]\nversion = "1"\n',
  'Gemfile': "source 'https://rubygems.org'\ngem 'rails', '~> 8.0'\n",
  'src/ai/cliente.ts': "import Anthropic from '@anthropic-ai/sdk'\nconst URL_BASE = 'https://api.groq.com/openai/v1'\nexport const cliente = new Anthropic()\n",
  'src/ai/resposta.ts': `export function responder() {\n  return "Esta é uma resposta escrita à mão que não passa por nenhum modelo de linguagem."\n}\n`,
  'src/tela.tsx': 'export const Tela = () => <input placeholder="Digite aqui" />\n// TODO: ligar ao servidor\nconst usuarios = mockUsuarios()\n// vale para todo mundo\nexport const Selo = () => <span class="agente__placeholder" />\nconst rotulo = placeholder\n',
  'src/tela.test.tsx': '// TODO: escrever este teste\nconst dado = fakeDado()\n',
  'api/app.py': 'from langchain_openai import ChatOpenAI\nimport os\n\ndef rota():\n    raise NotImplementedError("not implemented")\n',
  'docs/arquitetura.md': '# Arquitetura\n\nTexto.\n',
  '.env.example': 'ANTHROPIC_API_KEY=\nPORTA=3000\n',
  'Dockerfile': 'FROM node:22\n',
  'docker-compose.yml': 'services: {}\n',
  '.lovable/config.json': '{}\n',
  '.env': `# banco\nDATABASE_URL=\nSENHA_DO_BANCO=${SENHA_DO_ENV}\n`,
  'config/chaves.ts': Object.values(SEGREDOS).map((valor, i) => `export const chave${i} = "${valor}"`).join('\n') + '\n',
  'config/chave.pem': ['-----BEGIN RSA ', 'PRIVATE KEY-----', `\n${letras(64, 10)}\n`].join(''),
  'config/exemplos.ts': `const a = "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"\nconst b = "sk-your-key-here-your-key-here"\nconst c = "sk-..."\nconst d = "${JWT_ANONIMO}"\n`,
  'node_modules/openai/index.js': "const chave = 'TODO'\n",
  'package-lock.json': '{"openai": "TODO"}\n',
  'logo.png': '\u0000\u0001\u0002',
}

let codigo
let vazio
const fontesDe = (pasta) => ({ sha: 'a'.repeat(40), codigo: pasta, repo: { dono: 'equipe', nome: 'projeto', url: 'https://github.com/equipe/projeto' } })

function ctxDe(pasta, equipe = {}) {
  return {
    equipe: { id: 'equipe', nome: 'Equipe', resumo: null, descricao: null, demo: null, video: null, track: null, ...equipe },
    dep: () => ({ saida: fontesDe(pasta) }),
    pulso: () => {},
    parcial: () => {},
    sinal: new AbortController().signal,
    pastas: { capturas: path.join(PASTA_DE_CAPTURAS, `deploy-${process.pid}`) },
    relativo: (absoluto) => path.relative(PASTA_DE_CAPTURAS, absoluto),
  }
}

before(async () => {
  codigo = await fsp.mkdtemp(path.join(os.tmpdir(), 'rt-teste-conteudo-'))
  vazio = await fsp.mkdtemp(path.join(os.tmpdir(), 'rt-teste-conteudo-vazio-'))
  for (const [caminho, texto] of Object.entries(ARVORE)) {
    await fsp.mkdir(path.dirname(path.join(codigo, caminho)), { recursive: true })
    await fsp.writeFile(path.join(codigo, caminho), texto)
  }
  await fsp.writeFile(path.join(codigo, 'grande.ts'), `// TODO\n${'x'.repeat(1024 * 1024 + 10)}`)
  await fsp.writeFile(path.join(vazio, 'README.md'), '# Projeto\n\nUm parágrafo sobre a ideia.\n')
  await fsp.writeFile(path.join(vazio, 'main.go'), 'package main\n\nfunc main() {}\n')
})

after(async () => {
  await fsp.rm(codigo, { recursive: true, force: true })
  await fsp.rm(vazio, { recursive: true, force: true })
  await fsp.rm(path.join(PASTA_DE_CAPTURAS, `deploy-${process.pid}`), { recursive: true, force: true })
})

describe('composicao', () => {
  test('conta linguagens e ignora dependências instaladas, travas, binários e arquivos grandes', async () => {
    const saida = await composicao.executar(ctxDe(codigo))
    const porNome = Object.fromEntries(saida.linguagens.map((l) => [l.nome, l]))
    assert.equal(porNome.TypeScript.arquivos, 6)
    assert.equal(porNome.Python.arquivos, 1)
    assert.equal(porNome.JavaScript, undefined)
    assert.equal(porNome.Markdown.arquivos, 2)
    assert.deepEqual(saida.documentos, ['README.md', 'docs/arquitetura.md'])
    assert.equal(saida.readme, 'README.md')
    assert.equal(saida.dockerfile, 'Dockerfile')
    assert.equal(saida.compose, 'docker-compose.yml')
    assert.deepEqual(saida.env_exemplo, { caminho: '.env.example', chaves: ['ANTHROPIC_API_KEY', 'PORTA'] })
  })

  test('lê as dependências de cada manifesto até três pastas de profundidade', async () => {
    const saida = await composicao.executar(ctxDe(codigo))
    const nomes = Object.fromEntries(saida.dependencias.map((d) => [d.manifesto, d.nomes]))
    assert.deepEqual(nomes['package.json'], ['@anthropic-ai/sdk', 'react', 'lovable-tagger'])
    assert.deepEqual(nomes['api/requirements.txt'], ['flask', 'langchain-openai'])
    assert.deepEqual(nomes['api/pyproject.toml'], ['google-generativeai', 'httpx', 'chromadb'])
    assert.deepEqual(nomes['go.mod'], ['github.com/gin-gonic/gin'])
    assert.deepEqual(nomes['Cargo.toml'], ['serde', 'tokio'])
    assert.deepEqual(nomes['Gemfile'], ['rails'])
    assert.equal(nomes['a/b/c/d/package.json'], undefined)
  })

  test('aponta bibliotecas de IA e as linhas que importam ou citam provedores', async () => {
    const saida = await composicao.executar(ctxDe(codigo))
    assert.deepEqual(
      saida.ia.bibliotecas.map((b) => `${b.nome}|${b.provedor}|${b.manifesto}`).sort(),
      ['@ai-sdk/openai|OpenAI|servidor/package.json', '@anthropic-ai/sdk|Anthropic|package.json', 'chromadb|Chroma|api/pyproject.toml',
        'google-generativeai|Google|api/pyproject.toml', 'langchain-openai|LangChain|api/requirements.txt'],
    )
    assert.deepEqual(saida.ia.chamadas.map((c) => `${c.provedor}|${c.caminho}|${c.linha}`), [
      'LangChain|api/app.py|1', 'Anthropic|src/ai/cliente.ts|1', 'Groq|src/ai/cliente.ts|2',
    ])
    assert.equal(saida.ia.chamadas[1].trecho, "import Anthropic from '@anthropic-ai/sdk'")
  })

  test('relata linguagens na arquitetura e bibliotecas e chamadas na parte de IA, com evidências', async () => {
    const relato = composicao.relatar(await composicao.executar(ctxDe(codigo)))
    assert.equal(relato.arquitetura[0].rotulo, 'Linguagens e tamanho')
    assert.deepEqual(relato.arquitetura[0].valor.tabela.colunas, ['Linguagem', 'Arquivos', 'Linhas'])
    const [bibliotecas, chamadas] = relato.ia
    assert.equal(bibliotecas.rotulo, 'Bibliotecas de IA nas dependências')
    assert.ok(bibliotecas.valor.lista.includes('@anthropic-ai/sdk (Anthropic), em package.json'))
    const doPacote = bibliotecas.evidencias.find((e) => e.caminho === 'package.json')
    assert.match(doPacote.trecho, /@anthropic-ai\/sdk/)
    assert.equal(chamadas.rotulo, 'Pontos do código que citam provedores de IA')
    assert.deepEqual(chamadas.valor.tabela.linhas[2], ['Groq', 'src/ai/cliente.ts', 2])
    assert.equal(chamadas.evidencias.length, 3)
    assert.match(chamadas.evidencias[2].link, /github\.com\/equipe\/projeto\/blob\/a{40}\/src\/ai\/cliente\.ts#L2/)
  })

  test('sem IA no repositório, relata um item dizendo que nada foi encontrado', async () => {
    const relato = composicao.relatar(await composicao.executar(ctxDe(vazio)))
    assert.equal(relato.ia.length, 1)
    assert.match(relato.ia[0].rotulo, /^Nenhuma biblioteca de IA/)
  })
})

describe('segredos', () => {
  test('acha cada padrão e nunca grava o valor', async () => {
    const saida = await segredos.executar(ctxDe(codigo))
    const achados = saida.achados.map((a) => `${a.tipo}|${a.caminho}|${a.linha}`)
    Object.keys(SEGREDOS).forEach((tipo, indice) => assert.ok(achados.includes(`${tipo}|config/chaves.ts|${indice + 1}`), tipo))
    assert.ok(achados.includes('chave privada (BEGIN PRIVATE KEY)|config/chave.pem|1'))
    assert.ok(achados.includes('arquivo .env versionado com valores preenchidos|.env|3'))

    const gravado = JSON.stringify({ saida, relato: segredos.relatar(saida) })
    for (const valor of [...Object.values(SEGREDOS), SENHA_DO_ENV]) assert.ok(!gravado.includes(valor), 'valor de segredo na saída')
  })

  test('ignora valores de exemplo, o .env de exemplo e o JWT que não é de serviço', async () => {
    const saida = await segredos.executar(ctxDe(codigo))
    assert.deepEqual(saida.achados.filter((a) => a.caminho === 'config/exemplos.ts' || a.caminho === '.env.example'), [])
    assert.equal(saida.total, Object.keys(SEGREDOS).length + 2)
  })

  test('relata um item por achado, até dez, como sinal e com evidência sem trecho', async () => {
    const relato = segredos.relatar(await segredos.executar(ctxDe(codigo)))
    assert.equal(relato.higiene.length, 10)
    for (const item of relato.higiene) {
      assert.equal(item.sinal, true)
      assert.equal(item.evidencias.length, 1)
      assert.equal(item.evidencias[0].trecho, null)
    }
    assert.match(relato.higiene[0].valor, /^\.env, linha 3$/)
  })

  test('sem achados, relata que a varredura não encontrou segredos', async () => {
    const relato = segredos.relatar(await segredos.executar(ctxDe(vazio)))
    assert.deepEqual(relato.higiene.map((i) => i.rotulo), ['Nenhum segredo encontrado pelos padrões da varredura'])
  })
})

describe('submissao', () => {
  const estados = (relato) => Object.fromEntries(relato.higiene.map((i) => [i.id, i.estado.estado]))

  test('README com instruções e formulário preenchido ficam verificados', async () => {
    const saida = await submissao.executar(ctxDe(codigo, { descricao: 'Um assistente.', video: 'https://youtu.be/x', demo: 'https://exemplo.app' }))
    assert.deepEqual({ ...saida.readme, evidencia: null, evidencia_instrucoes: null },
      { existe: true, caminho: 'README.md', linhas: 11, instrucoes: true, evidencia: null, evidencia_instrucoes: null })
    assert.equal(saida.readme.evidencia_instrucoes.linha, 5)
    assert.deepEqual(estados(submissao.relatar(saida)), {
      'submissao:readme': 'verificado', 'submissao:instrucoes': 'verificado', 'submissao:descricao': 'verificado',
      'submissao:video': 'verificado', 'submissao:demo': 'verificado',
    })
  })

  test('README sem instruções e formulário vazio ficam não informados', async () => {
    const saida = await submissao.executar(ctxDe(vazio, { descricao: '  ' }))
    assert.equal(saida.readme.instrucoes, false)
    assert.deepEqual(estados(submissao.relatar(saida)), {
      'submissao:readme': 'verificado', 'submissao:instrucoes': 'nao_informado', 'submissao:descricao': 'nao_informado',
      'submissao:video': 'nao_informado', 'submissao:demo': 'nao_informado',
    })
  })

  test('sem README, o requisito fica não informado', async () => {
    const semReadme = await fsp.mkdtemp(path.join(os.tmpdir(), 'rt-teste-conteudo-sem-readme-'))
    try {
      const saida = await submissao.executar(ctxDe(semReadme))
      assert.equal(saida.readme.existe, false)
      assert.equal(estados(submissao.relatar(saida))['submissao:readme'], 'nao_informado')
    } finally {
      await fsp.rm(semReadme, { recursive: true, force: true })
    }
  })

  test('marcas de projeto gerado viram sinais na parte de origem', async () => {
    const saida = await submissao.executar(ctxDe(codigo))
    assert.deepEqual(saida.marcas.map((m) => `${m.marca}|${m.caminho}`).sort(), ['dependência lovable-tagger|package.json', 'pasta .lovable|.lovable/config.json'])
    const relato = submissao.relatar(saida)
    assert.equal(relato.origem.length, 2)
    assert.ok(relato.origem.every((item) => item.sinal === true && item.evidencias.length === 1))
  })

  test('reconhece o README padrão do create-next-app e do Vite', async () => {
    const pasta = await fsp.mkdtemp(path.join(os.tmpdir(), 'rt-teste-conteudo-modelo-'))
    try {
      await fsp.writeFile(path.join(pasta, 'README.md'), 'This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs).\n')
      await fsp.mkdir(path.join(pasta, 'web'))
      await fsp.writeFile(path.join(pasta, 'web', 'README.md'), '# React + TypeScript + Vite\n')
      const saida = await submissao.executar(ctxDe(pasta))
      assert.deepEqual(saida.marcas.map((m) => m.marca).sort(), ['README padrão do create-next-app', 'README padrão do modelo do Vite'])
    } finally {
      await fsp.rm(pasta, { recursive: true, force: true })
    }
  })
})

describe('fachada', () => {
  test('lista cada classe de ocorrência, fora de testes e sem o atributo placeholder', async () => {
    const { ocorrencias } = await fachada.executar(ctxDe(codigo))
    assert.deepEqual(ocorrencias.map((o) => `${o.classe}|${o.caminho}|${o.linha}`), [
      'resposta_fixa|src/ai/resposta.ts|2',
      'dado_de_exemplo|src/tela.tsx|3',
      'dado_de_exemplo|src/tela.tsx|6',
      'pendencia|api/app.py|5',
      'pendencia|src/tela.tsx|2',
    ])
    assert.equal(ocorrencias[1].trecho, 'const usuarios = mockUsuarios()')
    assert.equal(fachada.relatar, undefined)
  })
})

describe('navegador e deploy', () => {
  let servidor
  let base
  let script = 'console.log(1)'
  let pedidosRecebidos = 0
  const meiosLocais = {
    buscar: fetch,
    capturar: async () => ({ status: null, titulo: null, url_final: null, erro: 'sem captura neste teste' }),
    impressao: (url, opcoes) => impressaoDigital(url, { ...opcoes, buscar: fetch }),
  }

  before(async () => {
    servidor = http.createServer((pedido, resposta) => {
      pedidosRecebidos += 1
      const rotas = {
        '/': ['text/html', `<html><head><title>Demo  da equipe</title><link rel="stylesheet" href="/estilo.css"><link rel="icon" href="/icone.png"><script src="/app.js"></script><script src="https://cdn.exemplo.com/x.js"></script></head><body>${Date.now()}${Math.random()}</body></html>`],
        '/app.js': ['text/javascript', script],
        '/estilo.css': ['text/css', 'body{}'],
        '/simples': ['text/html', '<html><body>fixo</body></html>'],
      }
      const rota = rotas[pedido.url]
      resposta.writeHead(rota ? 200 : pedido.url === '/quebrado' ? 500 : 404, { 'content-type': rota?.[0] ?? 'text/plain' })
      resposta.end(rota?.[1] ?? 'erro')
    })
    await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver))
    base = `http://127.0.0.1:${servidor.address().port}`
  })

  after(() => new Promise((resolver) => servidor.close(resolver)))

  test('a impressão digital fica igual quando nada muda e muda quando um recurso muda', async () => {
    script = 'console.log(1)'
    const primeira = await impressaoDigital(`${base}/`, { buscar: fetch })
    const segunda = await impressaoDigital(`${base}/`, { buscar: fetch })
    assert.equal(primeira.recursos, 2)
    assert.match(primeira.hash, /^[0-9a-f]{64}$/)
    assert.equal(segunda.hash, primeira.hash)
    script = 'console.log(2)'
    assert.notEqual((await impressaoDigital(`${base}/`, { buscar: fetch })).hash, primeira.hash)
  })

  test('sem recursos de mesma origem, a impressão digital é a do HTML', async () => {
    const impressao = await impressaoDigital(`${base}/simples`, { buscar: fetch })
    assert.equal(impressao.recursos, 0)
    assert.equal((await impressaoDigital(`${base}/simples`, { buscar: fetch })).hash, impressao.hash)
  })

  test('a configuração do MCP monta a pasta de capturas, leva o rótulo e entra na rede pedida', () => {
    const semRede = configMcpNavegador({ capturas: '/Users/x/cap' }).mcpServers.navegador
    assert.equal(semRede.command, 'docker')
    assert.ok(semRede.args.join(' ').includes('--label rt=1'))
    assert.ok(semRede.args.join(' ').includes(`-v /Users/x/cap:/cap -w /cap ${CONFIG.imagens.navegador} --isolated`))
    assert.ok(semRede.args.join(' ').includes('--network rt-navegador'))
    const comRede = configMcpNavegador({ capturas: '/Users/x/cap', rede: 'container:rt-projeto' }).mcpServers.navegador
    assert.ok(comRede.args.join(' ').includes('--network container:rt-projeto'))
    assert.ok(comRede.args.indexOf('--network') < comRede.args.indexOf(CONFIG.imagens.navegador))
  })

  test('deploy sem link fica não informado', async () => {
    const saida = await deploy.executar(ctxDe(codigo, { demo: null }))
    assert.equal(saida.informado, false)
    assert.deepEqual(deploy.relatar(saida).resumo, { deploy: { estado: 'nao_informado' } })
  })

  test('deploy que responde fica verificado, com status, tempo, título e impressão digital', async () => {
    const saida = await medirDeploy(ctxDe(codigo, { demo: `${base}/` }), meiosLocais)
    assert.equal(saida.responde, true)
    assert.equal(saida.status, 200)
    assert.equal(saida.titulo, 'Demo da equipe')
    assert.equal(typeof saida.tempo_ms, 'number')
    assert.equal(saida.impressao.recursos, 2)
    const relato = deploy.relatar(saida)
    assert.deepEqual(relato.resumo, { deploy: { estado: 'verificado' } })
    assert.equal(relato.uso[0].rotulo, 'Deploy responde')
    assert.match(relato.uso[0].valor, /^HTTP 200 em \d+ ms$/)
    assert.equal(relato.uso[0].evidencias[0].tipo, 'url')
  })

  test('deploy com erro HTTP falha com o status', async () => {
    const saida = await medirDeploy(ctxDe(codigo, { demo: `${base}/quebrado` }), meiosLocais)
    assert.equal(saida.responde, false)
    assert.deepEqual(deploy.relatar(saida).resumo, { deploy: { estado: 'falhou', erro: 'HTTP 500' } })
  })

  test('deploy fora do ar falha com o erro de rede, sem lançar', async () => {
    const saida = await medirDeploy(ctxDe(codigo, { demo: 'http://127.0.0.1:1/' }), meiosLocais)
    assert.equal(saida.responde, false)
    assert.equal(saida.status, null)
    const { deploy: estado } = deploy.relatar(saida).resumo
    assert.equal(estado.estado, 'falhou')
    assert.match(estado.erro, /ECONNREFUSED|fetch failed/)
  })

  test('link de demo que aponta para esta máquina não é aberto', async () => {
    const antes = pedidosRecebidos
    const saida = await deploy.executar(ctxDe(codigo, { demo: `${base}/` }))
    assert.equal(pedidosRecebidos, antes, 'o servidor local não recebeu nenhum pedido')
    assert.equal(saida.responde, false)
    assert.equal(saida.captura, null)
    const { deploy: estado } = deploy.relatar(saida).resumo
    assert.equal(estado.estado, 'falhou')
    assert.match(estado.erro, /endereço interno/)
  })

  test('captura real de uma página pública grava o arquivo no disco', { timeout: 120_000 }, async () => {
    const destino = path.join(PASTA_DE_CAPTURAS, 'inicial.png')
    await fsp.rm(destino, { force: true })
    const resultado = await capturarPagina('https://theorbis.app/', destino, { nome: `rt-teste-conteudo-${process.pid}` })
    assert.equal(resultado.erro, null)
    assert.equal(resultado.status, 200)
    assert.ok(resultado.titulo)
    assert.match(resultado.url_final, /^https:\/\/(www\.)?theorbis\.app/)
    const cabecalho = (await fsp.readFile(destino)).subarray(0, 8)
    assert.deepEqual([...cabecalho], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  })

  test('captura de endereço que não responde devolve o erro em vez de lançar', { timeout: 120_000 }, async () => {
    const destino = path.join(PASTA_DE_CAPTURAS, `deploy-${process.pid}`, 'falha.png')
    const resultado = await capturarPagina('http://127.0.0.1:1/', destino, { nome: `rt-teste-conteudo-falha-${process.pid}` })
    assert.equal(resultado.status, null)
    assert.match(resultado.erro, /endereço interno/)
    await assert.rejects(fsp.stat(destino))
  })
})
