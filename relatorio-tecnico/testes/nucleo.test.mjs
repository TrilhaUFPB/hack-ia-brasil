import { test } from 'node:test'
import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { etapa, agente, exige, tolera } from '../nucleo/etapa.mjs'
import { carregarRegistro } from '../nucleo/registro.mjs'
import { criarArmazem } from '../nucleo/armazem.mjs'
import { criarExecucao, situacoesDoDisco } from '../nucleo/orquestrador.mjs'
import { criarProjecao } from '../nucleo/projecao.mjs'

const LIMITES = { scripts: 2, agentes: 2, containers: 2 }

globalThis.__rtTesteNucleo ??= new Map()
let fichas = 0

async function pastaTemporaria(t, nome) {
  const pasta = await fsp.mkdtemp(path.join(os.tmpdir(), `rt-teste-nucleo-${nome}-`))
  t.after(() => fsp.rm(pasta, { recursive: true, force: true }))
  return pasta
}

async function registroCom(t, etapas) {
  const pasta = await pastaTemporaria(t, 'etapas')
  for (const declarada of etapas) {
    const ficha = String(++fichas)
    globalThis.__rtTesteNucleo.set(ficha, declarada)
    await fsp.writeFile(path.join(pasta, `${declarada.id}.mjs`), `export default globalThis.__rtTesteNucleo.get('${ficha}')\n`)
  }
  return carregarRegistro(pasta)
}

async function bancada(t, { equipes = ['a', 'b'], opcoes = {} } = {}) {
  const raiz = await pastaTemporaria(t, 'dados')
  const dirs = { trabalho: path.join(raiz, 'trabalho'), saida: path.join(raiz, 'saida') }
  const rodada = {
    modo: 'previa',
    janela: { inicio: '2026-11-28T09:20:00-03:00', fim: '2026-11-28T16:00:00-03:00' },
    dirs,
    equipes: equipes.map((id) => ({ id, nome: id.toUpperCase(), repo: null, resumo: null, descricao: null, demo: null, track: null, video: null })),
    opcoes: { refazer: [], build: 'todos', somente: null, ...opcoes },
  }
  return { dirs, rodada, armazem: criarArmazem(dirs) }
}

async function executar(mesa, registro, extras = {}) {
  const pedidos = []
  const projecao = {
    projetar: async (equipe, situacoes) => void pedidos.push({ equipe: equipe.id, situacoes }),
    projetarIndice: async () => void pedidos.push({ indice: true }),
  }
  const execucao = criarExecucao({ rodada: mesa.rodada, registro, armazem: mesa.armazem, limites: LIMITES, projecao, carencia: 20, ...extras })
  await execucao.rodar()
  return { situacoes: execucao.situacoes(), pedidos }
}

const simples = (id, campos = {}) =>
  etapa({ id, titulo: id, coluna: 'fatos', fila: 'scripts', versao: 1, depende: {}, teto: { total: 2000 }, executar: async () => ({}), ...campos })

const dormir = (ms, sinal) =>
  new Promise((resolver, rejeitar) => {
    const relogio = setTimeout(resolver, ms)
    sinal?.addEventListener('abort', () => {
      clearTimeout(relogio)
      rejeitar(new Error('abortado'))
    }, { once: true })
  })

const existe = (caminho) => fsp.access(caminho).then(() => true, () => false)

test('duas equipes, três etapas encadeadas: tudo pronto, na ordem das dependências', async (t) => {
  const ordem = []
  const anotar = (id) => async (ctx) => {
    await dormir(5)
    ordem.push(`${ctx.equipe.id}:${id}`)
    return { id }
  }
  const registro = await registroCom(t, [
    simples('terceira', { depende: { segunda: exige() }, executar: async (ctx) => ({ ...(await anotar('terceira')(ctx)), veio: ctx.dep('segunda').saida.id }) }),
    simples('primeira', { executar: anotar('primeira') }),
    simples('segunda', { depende: { primeira: exige() }, executar: anotar('segunda') }),
  ])
  const mesa = await bancada(t)
  const { situacoes, pedidos } = await executar(mesa, registro)

  const tudoPronto = { primeira: 'pronto', segunda: 'pronto', terceira: 'pronto', relatorio: 'pronto' }
  assert.deepEqual(situacoes, { a: tudoPronto, b: tudoPronto })
  for (const equipe of ['a', 'b']) {
    assert.deepEqual(ordem.filter((linha) => linha.startsWith(equipe)), [`${equipe}:primeira`, `${equipe}:segunda`, `${equipe}:terceira`])
  }
  const envelope = await mesa.armazem.ler(registro.porId.get('terceira'), mesa.rodada.equipes[0])
  assert.equal(envelope.desfecho, 'pronto')
  assert.deepEqual(envelope.saida, { id: 'terceira', veio: 'segunda' })
  assert.deepEqual(pedidos.at(-1), { indice: true })
  assert.deepEqual(pedidos.findLast((pedido) => pedido.equipe === 'a').situacoes, { primeira: 'pronto', segunda: 'pronto', terceira: 'pronto' })
  assert.deepEqual(await situacoesDoDisco({ rodada: mesa.rodada, registro, armazem: mesa.armazem }), {
    a: { primeira: 'pronto', segunda: 'pronto', terceira: 'pronto', relatorio: 'aguardando' },
    b: { primeira: 'pronto', segunda: 'pronto', terceira: 'pronto', relatorio: 'aguardando' },
  })
})

test('rodar de novo não executa nada; subir a versão reexecuta a etapa, e a dependente só se a saída mudar', async (t) => {
  const execucoes = []
  const par = (versao, valor) => [
    simples('base', { versao, executar: async () => (execucoes.push('base'), { valor }) }),
    simples('derivada', { depende: { base: exige() }, executar: async (ctx) => (execucoes.push('derivada'), { dobro: ctx.dep('base').saida.valor * 2 }) }),
  ]
  const mesa = await bancada(t, { equipes: ['a'] })
  const derivada = async (registro) => (await mesa.armazem.ler(registro.porId.get('derivada'), mesa.rodada.equipes[0])).saida

  const original = await registroCom(t, par(1, 10))
  await executar(mesa, original)
  assert.deepEqual(execucoes, ['base', 'derivada'])

  await executar(mesa, original)
  assert.deepEqual(execucoes, ['base', 'derivada'])

  await executar(mesa, await registroCom(t, par(2, 10)))
  assert.deepEqual(execucoes, ['base', 'derivada', 'base'])

  const comOutraSaida = await registroCom(t, par(3, 21))
  await executar(mesa, comOutraSaida)
  assert.deepEqual(execucoes, ['base', 'derivada', 'base', 'base', 'derivada'])
  assert.deepEqual(await derivada(comOutraSaida), { dobro: 42 })
})

test('etapa que lança: quem exige falha sem rodar, quem tolera roda, a outra equipe segue', async (t) => {
  const execucoes = []
  const registro = await registroCom(t, [
    simples('quebra', {
      executar: async (ctx) => {
        if (ctx.equipe.id === 'a') throw new Error('disco cheio')
        return { ok: true }
      },
    }),
    simples('precisa', { depende: { quebra: exige() }, executar: async (ctx) => (execucoes.push(`${ctx.equipe.id}:precisa`), {}) }),
    simples('segue', { depende: { quebra: tolera() }, executar: async (ctx) => (execucoes.push(`${ctx.equipe.id}:segue`), { viu: ctx.dep('quebra').saida }) }),
  ])
  const mesa = await bancada(t)
  const { situacoes } = await executar(mesa, registro)
  const [a] = mesa.rodada.equipes
  const ler = (id) => mesa.armazem.ler(registro.porId.get(id), a)

  assert.deepEqual(situacoes.a, { quebra: 'falhou', precisa: 'falhou', segue: 'pronto', relatorio: 'pronto' })
  assert.deepEqual(situacoes.b, { quebra: 'pronto', precisa: 'pronto', segue: 'pronto', relatorio: 'pronto' })
  assert.equal((await ler('quebra')).erro, 'disco cheio')
  assert.equal((await ler('precisa')).erro, 'dependência quebra: disco cheio')
  assert.deepEqual((await ler('segue')).saida, { viu: null })
  assert.deepEqual(execucoes.sort(), ['a:segue', 'b:precisa', 'b:segue'])
})

test('estourar o teto total: tempo_esgotado com o parcial e o último pulso preservados', async (t) => {
  const registro = await registroCom(t, [
    simples('lenta', {
      teto: { total: 50 },
      executar: async (ctx) => {
        ctx.pulso('passo 1 de 3')
        ctx.parcial({ ate: 1 })
        await dormir(5000, ctx.sinal)
        return { ate: 3 }
      },
    }),
    simples('calada', { teto: { inatividade: 40 }, executar: async (ctx) => dormir(5000, ctx.sinal) }),
    simples('falante', {
      teto: { inatividade: 40 },
      executar: async (ctx) => {
        for (let volta = 0; volta < 5; volta += 1) {
          await dormir(20, ctx.sinal)
          ctx.pulso(`volta ${volta}`)
        }
        return { voltas: 5 }
      },
    }),
  ])
  const mesa = await bancada(t, { equipes: ['a'] })
  const { situacoes } = await executar(mesa, registro)
  const ler = (id) => mesa.armazem.ler(registro.porId.get(id), mesa.rodada.equipes[0])

  assert.deepEqual(situacoes.a, { lenta: 'tempo_esgotado', calada: 'tempo_esgotado', falante: 'pronto', relatorio: 'pronto' })
  const lenta = await ler('lenta')
  assert.deepEqual(lenta.saida, { ate: 1 })
  assert.equal(lenta.parou_em, 'passo 1 de 3')
  assert.deepEqual((await ler('falante')).saida, { voltas: 5 })
  assert.match(await fsp.readFile(path.join(mesa.dirs.saida, 'a', 'logs', 'lenta.log'), 'utf8'), /^\d{4}-\d\d-\d\dT\S+ passo 1 de 3\n$/)
})

test('etapa lenta de uma equipe não atrasa a outra', async (t) => {
  const ordem = []
  const registro = await registroCom(t, [
    simples('primeira', {
      executar: async (ctx) => {
        await dormir(ctx.equipe.id === 'a' ? 300 : 5)
        ordem.push(`${ctx.equipe.id}:primeira`)
        return {}
      },
    }),
    simples('segunda', { depende: { primeira: exige() }, executar: async (ctx) => (ordem.push(`${ctx.equipe.id}:segunda`), {}) }),
  ])
  await executar(await bancada(t), registro)
  assert.deepEqual(ordem, ['b:primeira', 'b:segunda', 'a:primeira', 'a:segunda'])
})

test('o limite da fila vale: nunca mais etapas rodando do que o limite', async (t) => {
  let rodando = 0
  let pico = 0
  const registro = await registroCom(t, [
    simples('medida', {
      executar: async () => {
        rodando += 1
        pico = Math.max(pico, rodando)
        await dormir(20)
        rodando -= 1
        return {}
      },
    }),
  ])
  await executar(await bancada(t, { equipes: ['a', 'b', 'c', 'd', 'e'] }), registro)
  assert.equal(pico, 2)
})

test('queda no meio da gravação: só o temporário pela metade em disco, a etapa reexecuta', async (t) => {
  let execucoes = 0
  const registro = await registroCom(t, [simples('unica', { executar: async () => ({ vez: ++execucoes }) })])
  const mesa = await bancada(t, { equipes: ['a'] })
  const pasta = path.join(mesa.dirs.saida, 'a', 'etapas')
  await fsp.mkdir(pasta, { recursive: true })
  await fsp.writeFile(path.join(pasta, 'unica.json.4242.deadbeef.tmp'), '{"etapa":"unica","chave":"abc","desfe')

  const { situacoes } = await executar(mesa, registro)
  assert.equal(situacoes.a.unica, 'pronto')
  assert.equal(execucoes, 1)
  assert.deepEqual(JSON.parse(await fsp.readFile(path.join(pasta, 'unica.json'), 'utf8')).saida, { vez: 1 })

  await fsp.writeFile(path.join(pasta, 'unica.json'), '{"etapa":"unica","chave":"abc","desfe')
  await executar(mesa, registro)
  assert.equal(execucoes, 2)

  await executar(mesa, registro)
  assert.equal(execucoes, 2)
})

test('volátil reexecuta a cada execução; a dependente não, enquanto a parte selecionada não muda', async (t) => {
  const execucoes = []
  let visto = 0
  const registro = await registroCom(t, [
    simples('mundo', { volatil: true, executar: async () => (execucoes.push('mundo'), { sha: 'abc123', visto: ++visto }) }),
    simples('leitora', { depende: { mundo: exige((mundo) => mundo.sha) }, executar: async () => (execucoes.push('leitora'), {}) }),
  ])
  const mesa = await bancada(t, { equipes: ['a'] })
  await executar(mesa, registro)
  await executar(mesa, registro)
  await executar(mesa, registro)
  assert.deepEqual(execucoes, ['mundo', 'leitora', 'mundo', 'mundo'])
})

test('etapa de agent: bruto fica em trabalho/, a derivada .conferido publica o que o conferidor devolveu', async (t) => {
  const fontesVistas = []
  const conferir = async (saidaAgente, fontes) => {
    fontesVistas.push(fontes)
    return {
      afirmacoes: saidaAgente.afirmacoes.map(({ id, tipo, dados }) => ({ id, tipo, dados, evidencias: [] })),
      descartadas: 0,
      motivos: {},
      fatos: saidaAgente.fatos ?? {},
    }
  }
  const registro = await registroCom(t, [
    simples('corte', { executar: async () => ({ sha: 'abc123', codigo: '/copia/do/codigo', repo: { dono: 'time', nome: 'projeto' } }) }),
    agente({
      id: 'leitor',
      titulo: 'Leitor',
      coluna: 'leitor',
      fila: 'agentes',
      versao: 1,
      depende: {},
      teto: { total: 2000 },
      resumo: ['ia'],
      executar: async () => ({
        afirmacoes: [
          { id: 'componente-1', tipo: 'componente', dados: { nome: 'api' }, citacoes: [] },
          { id: 'chamada_ia-1', tipo: 'chamada_ia', dados: { provedor: 'x' }, citacoes: [] },
        ],
      }),
      relatar: (conferido, equipe) => ({ arquitetura: conferido.doTipo('componente').map((afirmacao) => ({ id: afirmacao.id, de: equipe.id })) }),
    }),
  ])
  const mesa = await bancada(t, { equipes: ['a'] })
  const [a] = mesa.rodada.equipes
  const { situacoes } = await executar(mesa, registro, { conferir })

  assert.deepEqual(situacoes.a, { corte: 'pronto', leitor: 'pronto', 'leitor.conferido': 'pronto', relatorio: 'pronto' })
  assert.equal(await existe(path.join(mesa.dirs.trabalho, 'a', 'bruto', 'leitor.json')), true)
  assert.equal(await existe(path.join(mesa.dirs.saida, 'a', 'etapas', 'leitor.json')), false)
  assert.deepEqual(Object.keys(await mesa.armazem.lerPublicaveis(registro, a)).sort(), ['corte', 'leitor.conferido'])

  const derivada = registro.porId.get('leitor.conferido')
  const conferido = (await mesa.armazem.ler(derivada, a)).saida
  assert.deepEqual(conferido.afirmacoes.map((afirmacao) => afirmacao.id), ['componente-1', 'chamada_ia-1'])
  assert.deepEqual(fontesVistas, [{
    codigo: '/copia/do/codigo',
    repo: { dono: 'time', nome: 'projeto' },
    sha: 'abc123',
    formulario: path.join(mesa.dirs.trabalho, 'a', 'formulario'),
    saida: path.join(mesa.dirs.saida, 'a'),
  }])
  assert.deepEqual(derivada.resumo, ['ia'])
  assert.deepEqual(derivada.relatar(conferido, a), { arquitetura: [{ id: 'componente-1', de: 'a' }] })
})

test('grafo inválido é rejeitado na carga', async (t) => {
  const leitor = () => agente({ id: 'leitor', titulo: 'Leitor', coluna: 'leitor', fila: 'agentes', versao: 1, depende: {}, teto: { total: 2000 }, executar: async () => ({ afirmacoes: [] }) })

  await assert.rejects(registroCom(t, [leitor(), simples('curiosa', { depende: { leitor: exige() } })]), /curiosa.*leitor\.conferido/)
  await registroCom(t, [leitor(), simples('correta', { depende: { 'leitor.conferido': exige() } })])
  await assert.rejects(registroCom(t, [simples('sozinha', { depende: { fantasma: exige() } })]), /fantasma/)
  await assert.rejects(registroCom(t, [simples('ida', { depende: { volta: exige() } }), simples('volta', { depende: { ida: tolera() } })]), /ciclo/)
  await assert.rejects(registroCom(t, [simples('uma', { resumo: ['build'] }), simples('outra', { resumo: ['build'] })]), /build/)
})

test('recurso.abrir demorado não conta no teto de executar; fechar roda mesmo quando executar lança', async (t) => {
  const fechados = []
  const recurso = (nome) => ({
    abrir: async () => {
      await dormir(150)
      return { nome }
    },
    fechar: async (aberto) => void fechados.push(aberto.nome),
  })
  const registro = await registroCom(t, [
    simples('comporta', { teto: { total: 80 }, recurso: recurso('da comporta'), executar: async (ctx) => ({ usou: ctx.recurso.nome }) }),
    simples('estoura', {
      teto: { total: 80 },
      recurso: recurso('da que estoura'),
      executar: async () => {
        throw new Error('checagem quebrou')
      },
    }),
  ])
  const mesa = await bancada(t, { equipes: ['a'] })
  const { situacoes } = await executar(mesa, registro)
  const comporta = await mesa.armazem.ler(registro.porId.get('comporta'), mesa.rodada.equipes[0])

  assert.deepEqual(situacoes.a, { comporta: 'pronto', estoura: 'falhou', relatorio: 'pronto' })
  assert.deepEqual(comporta.saida, { usou: 'da comporta' })
  assert.ok(comporta.relogio.preparo_ms >= 140, `preparo_ms foi ${comporta.relogio.preparo_ms}`)
  assert.deepEqual(fechados.sort(), ['da comporta', 'da que estoura'])
})

test('equipe fora do filtro nunca executa; pular deixa a etapa pronta com o motivo', async (t) => {
  const execucoes = []
  const registro = await registroCom(t, [
    simples('coleta', { executar: async (ctx) => (execucoes.push(ctx.equipe.id), {}) }),
    simples('opcional', { depende: { coleta: exige() }, pular: (ctx) => (ctx.rodada.opcoes.build === 'nenhum' ? 'build desligado' : null), executar: async () => ({ rodou: true }) }),
  ])
  const mesa = await bancada(t, { opcoes: { somente: ['b'], build: 'nenhum' } })
  const { situacoes } = await executar(mesa, registro)

  assert.deepEqual(execucoes, ['b'])
  assert.deepEqual(situacoes.a, { coleta: 'aguardando', opcional: 'aguardando', relatorio: 'aguardando' })
  assert.deepEqual(situacoes.b, { coleta: 'pronto', opcional: 'pronto', relatorio: 'pronto' })
  assert.deepEqual((await mesa.armazem.ler(registro.porId.get('opcional'), mesa.rodada.equipes[1])).saida, { pulada: 'build desligado' })
})

test('etapa de escopo rodada executa uma vez e enxerga a dependência de todas as equipes', async (t) => {
  let execucoes = 0
  const registro = await registroCom(t, [
    simples('coleta', { executar: async (ctx) => ({ de: ctx.equipe.id }) }),
    simples('cruzamento', {
      escopo: 'rodada',
      depende: { coleta: tolera() },
      executar: async (ctx) => {
        execucoes += 1
        return { equipe: ctx.equipe, vistas: Object.values(ctx.depDeTodas('coleta')).map((resultado) => resultado.saida.de) }
      },
    }),
    simples('usa', { depende: { cruzamento: exige() }, executar: async (ctx) => ({ total: ctx.dep('cruzamento').saida.vistas.length }) }),
  ])
  const mesa = await bancada(t)
  const { situacoes } = await executar(mesa, registro)

  assert.equal(execucoes, 1)
  assert.equal(situacoes.a.cruzamento, 'pronto')
  assert.equal(situacoes.b.cruzamento, 'pronto')
  assert.deepEqual(JSON.parse(await fsp.readFile(path.join(mesa.dirs.saida, '_rodada', 'etapas', 'cruzamento.json'), 'utf8')).saida, { equipe: null, vistas: ['a', 'b'] })
  assert.deepEqual((await mesa.armazem.ler(registro.porId.get('usa'), mesa.rodada.equipes[1])).saida, { total: 2 })
})

test('abortar não deixa envelope: a próxima execução retoma', async (t) => {
  let execucoes = 0
  const registro = await registroCom(t, [simples('demorada', { executar: async (ctx) => (execucoes += 1, await dormir(execucoes === 1 ? 5000 : 1, ctx.sinal), { vez: execucoes }) })])
  const mesa = await bancada(t, { equipes: ['a'] })
  const projecao = { projetar: async () => true, projetarIndice: async () => {} }
  const execucao = criarExecucao({ rodada: mesa.rodada, registro, armazem: mesa.armazem, limites: LIMITES, projecao, carencia: 20 })
  const rodando = execucao.rodar()
  await dormir(30)
  execucao.abortar()
  await rodando

  assert.equal(execucao.situacoes().a.demorada, 'aguardando')
  assert.equal(await mesa.armazem.ler(registro.porId.get('demorada'), mesa.rodada.equipes[0]), null)
  const { situacoes } = await executar(mesa, registro)
  assert.equal(situacoes.a.demorada, 'pronto')
  assert.equal(execucoes, 2)
})

test('projeção: em série por equipe, pedidos durante uma projeção viram uma só, e erro vai para o log', async (t) => {
  const registro = await registroCom(t, [simples('coleta', { relatar: () => ({}) })])
  const mesa = await bancada(t, { equipes: ['a'] })
  const [a] = mesa.rodada.equipes
  await executar(mesa, registro)

  const montagens = []
  let simultaneas = 0
  let quebrar = false
  const modulos = async () => ({
    montar: ({ equipe, resultados, situacoes, etapas }) => {
      if (quebrar) throw new Error('campo inválido: resumo.build')
      montagens.push(situacoes.coleta)
      return { equipe: { id: equipe.id }, etapas: etapas.map((uma) => uma.id), com: Object.keys(resultados), situacao: situacoes.coleta }
    },
    validarRelatorio: () => {},
    criarEmbutidor: () => async () => null,
    renderizar: async (relatorio) => {
      simultaneas += 1
      assert.equal(simultaneas, 1)
      await dormir(30)
      simultaneas -= 1
      return `<html>${relatorio.situacao}</html>`
    },
    renderizarIndice: (relatorios) => ({ html: '<html>indice</html>', json: { equipes: relatorios.map((relatorio) => relatorio.equipe.id) } }),
  })
  const projecao = criarProjecao({ rodada: mesa.rodada, registro, armazem: mesa.armazem, modulos })
  const lerRelatorio = async () => JSON.parse(await fsp.readFile(path.join(mesa.dirs.saida, 'a', 'relatorio.json'), 'utf8'))

  const primeira = projecao.projetar(a, { coleta: 'rodando' })
  await dormir(5)
  const durante = [projecao.projetar(a, { coleta: 'rodando' }), projecao.projetar(a, { coleta: 'rodando' }), projecao.projetar(a, { coleta: 'pronto' })]
  assert.deepEqual(await Promise.all([primeira, ...durante]), [true, true, true, true])
  assert.deepEqual(montagens, ['rodando', 'pronto'])
  assert.deepEqual(await lerRelatorio(), { equipe: { id: 'a' }, etapas: ['coleta'], com: ['coleta'], situacao: 'pronto' })
  assert.equal(await fsp.readFile(path.join(mesa.dirs.saida, 'a', 'relatorio.html'), 'utf8'), '<html>pronto</html>')

  assert.equal(await projecao.projetarIndice(), true)
  assert.deepEqual(JSON.parse(await fsp.readFile(path.join(mesa.dirs.saida, 'indice.json'), 'utf8')), { equipes: ['a'] })
  assert.equal(await fsp.readFile(path.join(mesa.dirs.saida, 'index.html'), 'utf8'), '<html>indice</html>')

  quebrar = true
  assert.equal(await projecao.projetar(a, { coleta: 'pronto' }), false)
  assert.match(await fsp.readFile(path.join(mesa.dirs.saida, 'a', 'logs', 'projecao.log'), 'utf8'), /campo inválido: resumo\.build/)
  assert.equal((await lerRelatorio()).situacao, 'pronto')
})
