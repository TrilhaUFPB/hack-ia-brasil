import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { setTimeout as esperar } from 'node:timers/promises'
import build from '../etapas/build.mjs'
import { detectarReceita, valoresFalsos } from '../etapas/build/receitas.mjs'
import { imagemExiste, nomesResolvidos, portasEmEscuta, subir, varrerOrfaos } from '../ferramentas/docker.mjs'
import { rodar } from '../ferramentas/processo.mjs'

const temporarias = []

/** @param {Record<string, string>} arquivos caminho relativo -> conteúdo */
async function arvore(arquivos) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rt-teste-build-'))
  temporarias.push(dir)
  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    await fs.mkdir(path.dirname(path.join(dir, caminho)), { recursive: true })
    await fs.writeFile(path.join(dir, caminho), conteudo)
  }
  return dir
}

const pacote = (scripts) => JSON.stringify({ name: 'projeto', scripts })

after(async () => {
  for (const dir of temporarias) await fs.rm(dir, { recursive: true, force: true })
})

describe('detectarReceita', () => {
  test('Dockerfile na raiz vence o package.json e sobe com o comando da imagem', async () => {
    const receita = await detectarReceita(await arvore({ Dockerfile: 'FROM node:22', 'package.json': pacote({ start: 'node a.js' }) }))
    assert.equal(receita.tipo, 'dockerfile')
    assert.equal(receita.subir, null)
    assert.equal(receita.pasta, '.')
  })

  test('npm sem trava: npm ci com npm install de reserva, build e start', async () => {
    const receita = await detectarReceita(await arvore({ 'package.json': pacote({ build: 'tsc', start: 'node dist/a.js', dev: 'nodemon' }) }))
    assert.deepEqual(receita, { tipo: 'node', instalar: ['npm ci || npm install'], compilar: ['npm run build'], subir: 'npm run start', pasta: '.', outras_pastas: [] })
  })

  test('o arquivo de trava escolhe o gerenciador', async () => {
    const casos = { 'pnpm-lock.yaml': 'pnpm run dev', 'yarn.lock': 'yarn run dev', 'bun.lockb': 'bun run dev', 'bun.lock': 'bun run dev' }
    for (const [trava, esperado] of Object.entries(casos)) {
      const receita = await detectarReceita(await arvore({ 'package.json': pacote({ dev: 'node a.js' }), [trava]: '' }))
      assert.equal(receita.subir, esperado, trava)
      assert.match(receita.instalar[0], new RegExp(`^${esperado.split(' ')[0]} install`), trava)
    }
  })

  test('sem start, sobe com preview só quando houve build', async () => {
    const comBuild = await detectarReceita(await arvore({ 'package.json': pacote({ build: 'vite build', preview: 'vite preview', dev: 'vite' }) }))
    assert.equal(comBuild.subir, 'npm run preview -- --host 0.0.0.0')
    const semBuild = await detectarReceita(await arvore({ 'package.json': pacote({ preview: 'vite preview', dev: 'vite' }) }))
    assert.equal(semBuild.subir, 'npm run dev -- --host 0.0.0.0')
    assert.deepEqual(semBuild.compilar, [])
  })

  test('next recebe -H 0.0.0.0, e só o npm leva o separador --', async () => {
    const npm = await detectarReceita(await arvore({ 'package.json': pacote({ build: 'next build', start: 'next start' }) }))
    assert.equal(npm.subir, 'npm run start -- -H 0.0.0.0')
    const pnpm = await detectarReceita(await arvore({ 'package.json': pacote({ dev: 'next dev' }), 'pnpm-lock.yaml': '' }))
    assert.equal(pnpm.subir, 'pnpm run dev -H 0.0.0.0')
  })

  test('package.json sem script de subida: instala e não tem comando', async () => {
    const receita = await detectarReceita(await arvore({ 'package.json': pacote({ test: 'node --test' }) }))
    assert.equal(receita.tipo, 'node')
    assert.equal(receita.subir, null)
  })

  test('Python: instalação por requirements.txt, uv.lock ou pip install .', async () => {
    const pip = await detectarReceita(await arvore({ 'requirements.txt': 'requests', 'main.py': 'print(1)' }))
    assert.deepEqual([pip.tipo, pip.instalar, pip.subir], ['python', ['pip install -r requirements.txt'], 'python main.py'])
    const uv = await detectarReceita(await arvore({ 'pyproject.toml': '[project]', 'uv.lock': '', 'app.py': 'print(1)' }))
    assert.deepEqual([uv.instalar, uv.subir], [['uv sync'], 'uv run python app.py'])
    const projeto = await detectarReceita(await arvore({ 'pyproject.toml': '[project]' }))
    assert.deepEqual([projeto.instalar, projeto.subir], [['pip install .'], null])
  })

  test('Python: streamlit, FastAPI e Flask são reconhecidos pelo conteúdo', async () => {
    const streamlit = await detectarReceita(await arvore({ 'requirements.txt': 'streamlit==1.40\n', 'streamlit_app.py': 'import streamlit' }))
    assert.equal(streamlit.subir, 'streamlit run streamlit_app.py --server.headless true --server.address 0.0.0.0')
    const fastapi = await detectarReceita(await arvore({ 'requirements.txt': 'fastapi', 'app/main.py': 'app = FastAPI()' }))
    assert.equal(fastapi.subir, 'uvicorn app.main:app --host 0.0.0.0 --port 8000')
    const flask = await detectarReceita(await arvore({ 'requirements.txt': 'flask', 'app.py': 'app = Flask(__name__)' }))
    assert.equal(flask.subir, 'flask --app app.py run --host 0.0.0.0')
  })

  test('sem manifesto na raiz, usa a primeira pasta conhecida e registra as outras', async () => {
    const receita = await detectarReceita(await arvore({ 'README.md': '', 'backend/requirements.txt': 'flask', 'frontend/package.json': pacote({ dev: 'vite' }), 'docs/package.json': '{}' }))
    assert.equal(receita.pasta, 'frontend')
    assert.equal(receita.tipo, 'node')
    assert.deepEqual(receita.outras_pastas, ['backend'])
  })

  test('nada reconhecido devolve null', async () => {
    assert.equal(await detectarReceita(await arvore({ 'README.md': '# oi', 'src/a.rs': '' })), null)
  })
})

test('valoresFalsos preenche cada chave, aponta URL para porta fechada e mantém PORT', () => {
  const { conteudo, chaves_falsas, env } = valoresFalsos('# comentário\nOPENAI_API_KEY=\nexport DATABASE_URL="postgres://x"\nMONGO_URI=\nPORT=8080\n\nlinha solta\n')
  assert.deepEqual(chaves_falsas, ['OPENAI_API_KEY', 'DATABASE_URL', 'MONGO_URI'])
  assert.deepEqual(env, { OPENAI_API_KEY: 'chave-falsa-rt', DATABASE_URL: 'http://localhost:9', MONGO_URI: 'http://localhost:9' })
  assert.equal(conteudo, 'OPENAI_API_KEY=chave-falsa-rt\nDATABASE_URL=http://localhost:9\nMONGO_URI=http://localhost:9\nPORT=8080\n')
})

test('portasEmEscuta lê /proc/net/tcp e ignora a 53, as efêmeras e o que não escuta', () => {
  const texto = [
    '  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode',
    '   0: 0100007F:0BB8 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 1 1',
    '   1: 0B00007F:8F3D 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 2 1',
    '   2: 00000000:0035 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 3 1',
    '   3: 0100007F:1F90 0100007F:D431 01 00000000:00000000 00:00000000 00000000     0        0 4 1',
    '   4: 00000000000000000000000000000000:1435 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 5 1',
  ].join('\n')
  assert.deepEqual(portasEmEscuta(texto), [3000, 5173])
})

test('nomesResolvidos extrai nomes distintos das linhas do tcpdump', () => {
  const texto = [
    '    127.0.0.11.53 > 127.0.0.1.41000: [bad udp cksum] 1234 q: A? api.anthropic.com. 1/0/0 api.anthropic.com. A 160.79.104.10 (51)',
    '    127.0.0.11.53 > 127.0.0.1.41001: 1235 q: AAAA? api.anthropic.com. 0/0/0 (35)',
    '    127.0.0.11.53 > 127.0.0.1.41002: 1236 NXDomain q: A? Nao-Existe.example. 0/1/0 (99)',
  ].join('\n')
  assert.deepEqual(nomesResolvidos(texto), ['api.anthropic.com', 'nao-existe.example'])
})

const PREFIXO = `rt-teste-build-${process.pid}`
const equipeDeTeste = (sufixo) => ({ id: `teste-build-${process.pid}-${sufixo}`, nome: 'Teste' })
const SHA = 'abcdef0123456789abcdef0123456789abcdef01'

function ctxDeMentira(equipe, codigo, linhas = []) {
  return {
    equipe,
    rodada: { opcoes: { build: 'todos', refazer: [], somente: null } },
    dep: (id) => ({ corte: { saida: { sha: SHA, codigo } }, deploy: { saida: null } })[id],
    sinal: new AbortController().signal,
    pulso: (linha) => linhas.push(linha),
    parcial: () => {},
    pastas: { capturas: '', logs: '', trabalho: '' },
    relativo: (caminho) => caminho,
  }
}

async function comRotuloDoTeste(tipo) {
  const args = tipo === 'rede' ? ['network', 'ls'] : ['ps', '-a']
  const { stdout } = await rodar('docker', [...args, '--filter', 'label=rt=1', '--filter', `name=${PREFIXO}`, '--format', '{{.Names}}{{.Name}}'])
  return stdout.split('\n').filter(Boolean)
}

describe('com Docker', () => {
  const imagens = []
  after(async () => {
    await varrerOrfaos({ prefixo: PREFIXO })
    await rodar('docker', ['rm', '-f', `${PREFIXO}-sem-rotulo`])
    if (imagens.length > 0) await rodar('docker', ['rmi', '-f', ...imagens])
  })

  test('instala, sobe um servidor que só escuta em 127.0.0.1, registra o DNS e limpa tudo', async () => {
    const equipe = equipeDeTeste('ok')
    const codigo = await arvore({
      'package.json': pacote({ start: 'node servidor.js' }),
      '.env.example': 'CHAVE_DO_PROVEDOR=\nPORT=3000\n',
      'servidor.js': `
        const resolver = () => require('node:dns').lookup('rt-teste-build.example.com', () => {})
        resolver()
        setInterval(resolver, 1000)
        require('node:http')
          .createServer((_, resposta) => resposta.end(process.env.CHAVE_DO_PROVEDOR + ' ' + require('node:fs').readFileSync('.env', 'utf8')))
          .listen(3000, '127.0.0.1', () => console.log('escutando'))
      `,
    })
    const linhas = []
    const saida = await build.executar(ctxDeMentira(equipe, codigo, linhas))
    if (saida.imagem) imagens.push(saida.imagem)

    assert.equal(saida.erro, null)
    assert.deepEqual(
      { instalou: saida.instalou, compilou: saida.compilou, subiu: saida.subiu, porta: saida.porta, parou_em: saida.parou_em },
      { instalou: true, compilou: null, subiu: true, porta: 3000, parou_em: null },
    )
    assert.equal(saida.imagem, `rt-${equipe.id}:abcdef012345`)
    assert.equal(saida.comando_subir, 'npm run start')
    assert.deepEqual(saida.chaves_falsas, ['CHAVE_DO_PROVEDOR'])
    assert.deepEqual(saida.env, { CHAVE_DO_PROVEDOR: 'chave-falsa-rt', HOST: '0.0.0.0', HOSTNAME: '0.0.0.0', CI: '1' })
    assert.ok(linhas.includes('$ npm ci || npm install'), 'a saída dos comandos vai para o pulso')
    assert.equal(await build.valeAinda(saida), true)
    assert.deepEqual(await comRotuloDoTeste('container'), [], 'o build não deixa container')
    assert.deepEqual(await comRotuloDoTeste('rede'), [], 'o build não deixa rede')

    const contribuicao = build.relatar(saida, equipe)
    assert.deepEqual(contribuicao.resumo, { build: { estado: 'verificado' } })
    assert.deepEqual(contribuicao.uso.map((item) => [item.rotulo, item.estado.estado]), [
      ['Instalação', 'verificado'],
      ['Subida local', 'verificado'],
      ['Variáveis preenchidas com valor falso', 'nao_testavel'],
    ])

    const instancia = await subir({ imagem: saida.imagem, id: equipe.id, comando: saida.comando_subir, env: saida.env, pulso: () => {} })
    try {
      assert.equal(instancia.porta, 3000)
      assert.equal(instancia.url, 'http://localhost:3000')
      assert.equal(instancia.rede, `container:${instancia.nome}`)
      assert.ok(instancia.nome.startsWith('rt-teste-build-'))

      const vizinho = await rodar('docker', ['run', '--rm', '--label', 'rt=1', '--name', `${PREFIXO}-vizinho`, '--network', instancia.rede, 'rt-base:1', 'curl', '-s', instancia.url])
      assert.equal(vizinho.stdout, 'chave-falsa-rt CHAVE_DO_PROVEDOR=chave-falsa-rt\nPORT=3000\n', 'outro container na mesma rede acessa o localhost do projeto')

      const variaveis = (await rodar('docker', ['exec', instancia.nome, 'env'])).stdout
      assert.doesNotMatch(variaveis, /^(USER|HOME=\/Users|SHELL|TMPDIR)=/m, 'nenhuma variável da máquina entra no container')

      let conexoes = []
      for (let tentativa = 0; tentativa < 15 && conexoes.length === 0; tentativa++) {
        await esperar(1000)
        conexoes = await instancia.conexoes()
      }
      assert.deepEqual(conexoes, ['rt-teste-build.example.com'])
      assert.match(await instancia.log(), /escutando/)
    } finally {
      await instancia.parar()
    }
    assert.deepEqual(await comRotuloDoTeste('container'), [])
    assert.deepEqual(await comRotuloDoTeste('rede'), [])
  })

  test('instalação que quebra é saída normal, com as linhas do erro', async () => {
    const equipe = equipeDeTeste('quebra')
    const codigo = await arvore({
      'package.json': pacote({ start: 'node a.js', preinstall: 'echo dependencia-nativa-ausente >&2; exit 7' }),
    })
    const saida = await build.executar(ctxDeMentira(equipe, codigo))
    if (saida.imagem) imagens.push(saida.imagem)

    assert.equal(saida.parou_em, 'instalar')
    assert.equal(saida.instalou, false)
    assert.equal(saida.subiu, false)
    assert.match(saida.erro, /dependencia-nativa-ausente/)
    assert.match(saida.erro, /npm (error|ERR!)/)
    assert.ok(saida.erro.split('\n').length <= 15)
    assert.equal(await imagemExiste(saida.imagem), true, 'a imagem fica para o testador seguir o README à mão')

    const contribuicao = build.relatar(saida, equipe)
    assert.equal(contribuicao.resumo.build.estado, 'falhou')
    assert.match(contribuicao.resumo.build.erro, /^parou em instalar: /)
    assert.deepEqual(contribuicao.uso.map((item) => item.estado.estado), ['falhou', 'nao_testavel'])
    assert.deepEqual(await comRotuloDoTeste('container'), [])
    assert.deepEqual(await comRotuloDoTeste('rede'), [])
  })

  test('processo que termina sem abrir porta: parou em subir, com o log', async () => {
    const equipe = equipeDeTeste('morre')
    const codigo = await arvore({ 'requirements.txt': '', 'main.py': 'raise SystemExit("faltou configurar")' })
    const saida = await build.executar(ctxDeMentira(equipe, codigo))
    if (saida.imagem) imagens.push(saida.imagem)

    assert.deepEqual([saida.instalou, saida.subiu, saida.porta, saida.parou_em], [true, false, null, 'subir'])
    assert.match(saida.erro, /faltou configurar/)
  })

  test('Dockerfile da equipe: constrói a imagem e sobe com o comando dela e as chaves falsas', async () => {
    const equipe = equipeDeTeste('dockerfile')
    const codigo = await arvore({
      Dockerfile: 'FROM rt-base:1\nCOPY servidor.js .\nCMD ["node", "servidor.js"]\n',
      '.env.example': 'API_URL=\n',
      'servidor.js': `require('node:http').createServer((_, r) => r.end(process.env.API_URL)).listen(8080)`,
    })
    const saida = await build.executar(ctxDeMentira(equipe, codigo))
    if (saida.imagem) imagens.push(saida.imagem)

    assert.equal(saida.erro, null)
    assert.deepEqual([saida.receita.tipo, saida.instalou, saida.subiu, saida.porta, saida.comando_subir], ['dockerfile', true, true, 8080, null])
    assert.equal(saida.env.API_URL, 'http://localhost:9')
    assert.equal(await imagemExiste(saida.imagem), true)
    assert.deepEqual(await comRotuloDoTeste('container'), [])
    assert.deepEqual(await comRotuloDoTeste('rede'), [])
  })

  test('varrerOrfaos remove o que tem o rótulo e deixa o resto', async () => {
    const comRotulo = `${PREFIXO}-orfao`
    const semRotulo = `${PREFIXO}-sem-rotulo`
    await rodar('docker', ['network', 'create', '--label', 'rt=1', comRotulo])
    await rodar('docker', ['run', '-d', '--name', comRotulo, '--label', 'rt=1', '--network', comRotulo, 'rt-base:1', 'sleep', '60'])
    await rodar('docker', ['run', '-d', '--name', semRotulo, 'rt-base:1', 'sleep', '60'])

    await varrerOrfaos({ prefixo: PREFIXO })

    const { stdout } = await rodar('docker', ['ps', '-a', '--filter', `name=${PREFIXO}`, '--format', '{{.Names}}'])
    assert.deepEqual(stdout.split('\n').filter(Boolean), [semRotulo])
    assert.deepEqual(await comRotuloDoTeste('rede'), [])
  })

  test('pular e imagemExiste', async () => {
    const ctx = (opcao, responde) => ({ rodada: { opcoes: { build: opcao } }, dep: () => ({ saida: responde === null ? null : { responde } }) })
    assert.equal(build.pular(ctx('nenhum', false)), 'não executado: build desligado nesta rodada')
    assert.equal(build.pular(ctx('sem-deploy', true)), 'não executado nesta rodada: o deploy da equipe responde')
    assert.equal(build.pular(ctx('sem-deploy', false)), null)
    assert.equal(build.pular(ctx('sem-deploy', null)), null)
    assert.equal(build.pular(ctx('todos', true)), null)
    assert.equal(await build.valeAinda({ pulada: 'build desligado nesta rodada' }), true)
    assert.equal(await build.valeAinda({ imagem: 'rt-teste-build-nao-existe:1' }), false)
    assert.equal(await imagemExiste('rt-base:1'), true)
    assert.deepEqual(build.relatar({ pulada: 'o deploy da equipe responde' }), { resumo: { build: { estado: 'nao_testavel', motivo: 'o deploy da equipe responde' } } })
  })
})
