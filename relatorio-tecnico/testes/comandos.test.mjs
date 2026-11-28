import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { ErroDeUso, analisar } from '../comandos/argumentos.mjs'
import { publicar } from '../comandos/publicar.mjs'
import { rodar } from '../comandos/rodar.mjs'
import { status } from '../comandos/status.mjs'
import { criarArmazem } from '../nucleo/armazem.mjs'
import { criarTabela, desenharTabela } from '../nucleo/tabela.mjs'

const pastaTemporaria = (t) => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-teste-comandos-'))
  t.after(() => fsp.rm(pasta, { recursive: true, force: true }))
  return pasta
}

const coletor = () => {
  const linhas = []
  return { linhas, escrever: (linha) => linhas.push(linha), texto: () => linhas.join('\n') }
}

const EQUIPES = [
  { id: 'acai', nome: 'Açaí Digital', repo: null, resumo: 'resumo do açaí', descricao: 'descrição', demo: null, track: null, video: null },
  { id: 'beta', nome: 'Beta', repo: null, resumo: null, descricao: null, demo: null, track: null, video: null },
]

const REGISTRO = (() => {
  const etapas = [
    { id: 'corte', coluna: 'fatos' },
    { id: 'composicao', coluna: 'fatos' },
    { id: 'build', coluna: 'build' },
    { id: 'leitor', coluna: 'leitor' },
    { id: 'leitor.conferido', coluna: 'leitor' },
    { id: 'uso', coluna: 'uso' },
    { id: 'uso.conferido', coluna: 'uso' },
  ]
  return { etapas, porId: new Map(etapas.map((etapa) => [etapa.id, etapa])) }
})()

const RODADA = { modo: 'previa', janela: { inicio: 'a', fim: 'b' }, dirs: { trabalho: '/t', saida: '/s' }, equipes: EQUIPES, opcoes: { refazer: [], build: 'sem-deploy', somente: null } }

const OPCOES_DE_EXEMPLO = {
  csv: { tipo: 'texto' },
  modo: { tipo: 'escolha', valores: ['previa', 'final'], padrao: 'previa' },
  equipe: { tipo: 'texto', repetivel: true },
  agentes: { tipo: 'inteiro', padrao: 6 },
  fim: { tipo: 'instante' },
  previa: { tipo: 'marca' },
}

test('argumentos: lê valores, repetições, marcas e padrões', () => {
  const lido = analisar(['--csv', 'lista.csv', '--equipe', 'Um', '--equipe=Dois', '--agentes', '3', '--previa', '--fim', '2026-11-28T16:00:00-03:00'], OPCOES_DE_EXEMPLO)
  assert.deepEqual(lido, { csv: 'lista.csv', modo: 'previa', equipe: ['Um', 'Dois'], agentes: 3, fim: '2026-11-28T16:00:00-03:00', previa: true })
  assert.deepEqual(analisar([], OPCOES_DE_EXEMPLO), { csv: null, modo: 'previa', equipe: [], agentes: 6, fim: null, previa: false })
})

test('argumentos: recusa opção desconhecida e valor inválido com mensagem em português', () => {
  const casos = [
    [['--nada'], /Opção desconhecida: --nada/],
    [['--modo', 'rascunho'], /--modo aceita previa, final/],
    [['--agentes', 'muitos'], /--agentes precisa de um número inteiro/],
    [['--agentes', '0'], /--agentes precisa de um número inteiro/],
    [['--fim', 'amanhã'], /--fim precisa de data e hora/],
    [['--csv'], /--csv precisa de um valor/],
    [['--csv', '--modo', 'final'], /--csv precisa de um valor/],
    [['solto'], /Argumento solto/],
    [['--previa=sim'], /--previa não recebe valor/],
  ]
  for (const [argv, mensagem] of casos) {
    assert.throws(() => analisar(argv, OPCOES_DE_EXEMPLO), (erro) => erro instanceof ErroDeUso && mensagem.test(erro.message), argv.join(' '))
  }
})

test('tabela: cada célula resume as etapas da coluna', () => {
  const texto = desenharTabela({
    rodada: RODADA,
    registro: REGISTRO,
    decorrido_ms: 125_000,
    situacoes: {
      acai: { corte: 'pronto', composicao: 'falhou', build: 'rodando', leitor: 'pronto', 'leitor.conferido': 'pronto', uso: 'tempo_esgotado', 'uso.conferido': 'aguardando', relatorio: 'pronto' },
      beta: { corte: 'pronto', composicao: 'pronto', build: 'pronto', leitor: 'pronto', 'leitor.conferido': 'pronto', uso: 'pronto', 'uso.conferido': 'tempo_esgotado' },
    },
  })
  const linhas = texto.split('\n')
  const celulas = (linha) => linha.split(/ {2,}/)

  assert.match(linhas[0], /Rodada previa · 2 equipes · decorrido 02m05s/)
  assert.deepEqual(celulas(linhas.find((linha) => linha.startsWith('Equipe'))), ['Equipe', 'Fatos', 'Build', 'Leitor', 'Uso', 'Conferidor', 'Relatório'])
  assert.deepEqual(celulas(linhas.find((linha) => linha.startsWith('Açaí Digital'))), ['Açaí Digital', 'falhou 1/2', 'rodando', 'pronto', 'tempo esgotado', 'aguardando', 'pronto'])
  assert.deepEqual(celulas(linhas.find((linha) => linha.startsWith('Beta'))), ['Beta', 'pronto', 'pronto', 'pronto', 'pronto', 'tempo esgotado 1/2', 'aguardando'])
})

test('tabela: equipe sem situações aparece aguardando e sem tempo decorrido quando não medido', () => {
  const texto = desenharTabela({ rodada: RODADA, registro: REGISTRO, situacoes: {} })
  assert.doesNotMatch(texto, /decorrido/)
  assert.match(texto, /Beta\s+aguardando\s+aguardando\s+aguardando\s+aguardando\s+aguardando\s+aguardando/)
})

test('tabela fora de terminal interativo: uma linha por mudança de situação', () => {
  const escrito = []
  const tabela = criarTabela({ rodada: RODADA, registro: REGISTRO, fluxo: { isTTY: false, write: (texto) => escrito.push(texto) } })
  tabela.atualizar({ acai: { corte: 'rodando', build: 'aguardando' } })
  tabela.atualizar({ acai: { corte: 'pronto', build: 'aguardando' } })
  tabela.atualizar({ acai: { corte: 'pronto', build: 'aguardando' } })
  tabela.encerrar()
  assert.equal(escrito.length, 2)
  assert.match(escrito[0], /Açaí Digital {2}corte: rodando\n$/)
  assert.match(escrito[1], /Açaí Digital {2}corte: pronto\n$/)
})

test('tabela em terminal interativo: redesenha no lugar e segura a taxa', () => {
  const escrito = []
  let relogio = 1000
  const tabela = criarTabela({ rodada: RODADA, registro: REGISTRO, agora: () => relogio, fluxo: { isTTY: true, columns: 200, write: (texto) => escrito.push(texto) } })
  tabela.atualizar({ acai: { corte: 'rodando' } })
  tabela.atualizar({ acai: { corte: 'pronto' } })
  assert.equal(escrito.length, 1, 'a segunda mudança dentro de 250 ms espera')
  relogio += 5000
  tabela.encerrar()
  assert.equal(escrito.length, 2)
  assert.ok(escrito[1].startsWith('\x1b[5A\x1b[0J'), 'volta as cinco linhas desenhadas antes')
  assert.match(escrito[1], /decorrido 00m05s/)
})

function substitutos({ dir, aoRodar = async () => {}, varrerOrfaos = async () => {}, aplicarIsolamento = async () => ({ ativo: true, detalhe: 'ok' }) }) {
  const chamadas = { criarExecucao: [], abortou: false }
  const modulos = {
    carregarCsv: async (origem) => `csv de ${origem}`,
    lerEquipes: () => EQUIPES,
    criarArmazem,
    varrerOrfaos,
    aplicarIsolamento,
    carregarRegistro: async () => REGISTRO,
    criarExecucao: (parametros) => {
      chamadas.criarExecucao.push(parametros)
      const situacoes = { acai: { corte: 'pronto', composicao: 'pronto', build: 'falhou', relatorio: 'pronto' }, beta: {} }
      return {
        rodar: async () => {
          parametros.aoMudar(situacoes)
          await aoRodar()
        },
        situacoes: () => situacoes,
        abortar: () => { chamadas.abortou = true },
      }
    },
  }
  const saida = coletor()
  const fluxo = { isTTY: false, write: () => {} }
  return { chamadas, saida, injetado: { modulos, escrever: saida.escrever, fluxo, aoInterromper: () => () => {} }, dir }
}

test('rodar: grava a rodada e os formulários, executa e imprime as situações e o índice', async (t) => {
  const dir = pastaTemporaria(t)
  const { chamadas, saida, injetado } = substitutos({ dir })
  const codigo = await rodar(['--csv', 'lista.csv', '--modo', 'final', '--dir', dir, '--equipe', 'acai digital', '--refazer', 'uso', '--agentes', '2', '--build', 'nenhum'], injetado)

  assert.equal(codigo, 0, saida.texto())
  const rodada = JSON.parse(await fsp.readFile(path.join(dir, 'saida', 'rodada.json'), 'utf8'))
  assert.equal(rodada.modo, 'final')
  assert.deepEqual(rodada.opcoes, { refazer: ['uso'], build: 'nenhum', somente: ['acai'] })
  assert.deepEqual(rodada.dirs, { trabalho: path.join(dir, 'trabalho'), saida: path.join(dir, 'saida') })
  assert.equal(rodada.equipes.length, 2)
  assert.equal(await fsp.readFile(path.join(dir, 'trabalho', 'acai', 'formulario', 'resumo.md'), 'utf8'), 'resumo do açaí')
  assert.deepEqual(chamadas.criarExecucao[0].limites, { scripts: 16, agentes: 2, containers: 3 })
  assert.match(saida.texto(), /Açaí Digital: Fatos pronto · Build falhou · Leitor aguardando/)
  assert.equal(saida.linhas.at(-1), path.join(dir, 'saida', 'index.html'))
})

test('rodar: sem --csv reaproveita a rodada gravada, com o modo e a janela dela', async (t) => {
  const dir = pastaTemporaria(t)
  const primeira = substitutos({ dir })
  await rodar(['--csv', 'lista.csv', '--modo', 'final', '--dir', dir, '--fim', '2026-11-28T17:00:00-03:00'], primeira.injetado)

  const segunda = substitutos({ dir })
  segunda.injetado.modulos.carregarCsv = async () => assert.fail('não deveria ler CSV')
  const codigo = await rodar(['--dir', dir, '--equipe', 'BETA'], segunda.injetado)

  assert.equal(codigo, 0, segunda.saida.texto())
  const { rodada } = segunda.chamadas.criarExecucao[0]
  assert.equal(rodada.modo, 'final')
  assert.equal(rodada.janela.fim, '2026-11-28T17:00:00-03:00')
  assert.deepEqual(rodada.opcoes.somente, ['beta'])
})

test('rodar: erros de uso saem com código 2 e não executam nada', async (t) => {
  const dir = pastaTemporaria(t)
  const casos = [
    [['--dir', dir], /Não há rodada gravada.*Informe --csv/s],
    [['--csv', 'x', '--dir', dir, '--equipe', 'Gama'], /Nenhuma equipe corresponde a "Gama".*Açaí Digital \(acai\).*Beta \(beta\)/s],
    [['--csv', 'x', '--dir', dir, '--refazer', 'inexistente'], /não existe a etapa "inexistente"/],
    [['--csv', 'x', '--dir', dir, '--modo', 'teste'], /--modo aceita previa, final/],
    [['--csv', 'x', '--dir', dir, '--inicio', '2026-11-28T17:00:00-03:00'], /A janela termina/],
    [['--csv', 'x', '--dir', dir, '--velocidade', '9'], /Opção desconhecida: --velocidade/],
  ]
  for (const [argv, mensagem] of casos) {
    const { chamadas, saida, injetado } = substitutos({ dir })
    assert.equal(await rodar(argv, injetado), 2, argv.join(' '))
    assert.match(saida.texto(), mensagem)
    assert.equal(chamadas.criarExecucao.length, 0)
  }
  assert.equal(fs.existsSync(path.join(dir, 'saida', 'rodada.json')), false, 'erro de uso não grava rodada')
})

test('rodar: Docker fora do ar vira aviso e a rodada segue', async (t) => {
  const dir = pastaTemporaria(t)
  const { chamadas, saida, injetado } = substitutos({ dir, varrerOrfaos: async () => { throw new Error('daemon parado') } })
  assert.equal(await rodar(['--csv', 'x', '--dir', dir], injetado), 0)
  assert.match(saida.texto(), /Aviso: o Docker não respondeu \(daemon parado\)/)
  assert.equal(chamadas.criarExecucao.length, 1)
})

test('rodar: Ctrl+C aborta a execução e sai com código 130', async (t) => {
  const dir = pastaTemporaria(t)
  let interromper
  const { chamadas, saida, injetado } = substitutos({
    dir,
    aoRodar: async () => {
      interromper()
      throw new Error('abortado')
    },
  })
  injetado.aoInterromper = (tratar) => {
    interromper = tratar
    return () => {}
  }
  assert.equal(await rodar(['--csv', 'x', '--dir', dir], injetado), 130)
  assert.equal(chamadas.abortou, true)
  assert.match(saida.texto(), /Interrompido/)
})

test('status: sem rodada gravada avisa e sai com código 1', async (t) => {
  const dir = pastaTemporaria(t)
  const saida = coletor()
  assert.equal(await status(['--dir', dir], { escrever: saida.escrever }), 1)
  assert.match(saida.texto(), /Nenhuma rodada gravada em .*rodada\.json/)
})

test('status: com rodada gravada imprime a tabela do disco uma vez', async (t) => {
  const dir = pastaTemporaria(t)
  await criarArmazem({ trabalho: path.join(dir, 'trabalho'), saida: path.join(dir, 'saida') }).gravarRodada(RODADA)
  const saida = coletor()
  const modulos = {
    criarArmazem,
    carregarRegistro: async () => REGISTRO,
    situacoesDoDisco: async () => ({ acai: { corte: 'pronto', composicao: 'pronto' } }),
  }
  assert.equal(await status(['--dir', dir], { escrever: saida.escrever, modulos }), 0)
  assert.equal(saida.linhas.length, 1)
  assert.match(saida.texto(), /Açaí Digital\s+pronto\s+aguardando/)
})

function repositorioTemporario(t) {
  const repo = pastaTemporaria(t)
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' })
  git('init', '--quiet', '--initial-branch=main')
  git('config', 'user.name', 'Teste')
  git('config', 'user.email', 'teste@exemplo.invalid')
  git('config', 'commit.gpgsign', 'false')
  git('config', 'core.hooksPath', path.join(repo, '.sem-hooks'))
  fs.writeFileSync(path.join(repo, 'LEIA.md'), 'site\n')
  git('add', 'LEIA.md')
  git('commit', '--quiet', '-m', 'inicial')
  return { repo, git }
}

async function saidaComRelatorios(dir, modos) {
  const saida = path.join(dir, 'saida')
  for (const [id, modo] of Object.entries(modos)) {
    await fsp.mkdir(path.join(saida, id, 'etapas'), { recursive: true })
    await fsp.writeFile(path.join(saida, id, 'relatorio.json'), JSON.stringify({ equipe: { id }, geracao: { modo } }))
    await fsp.writeFile(path.join(saida, id, 'relatorio.html'), `<html>${id}</html>`)
    await fsp.writeFile(path.join(saida, id, 'etapas', 'corte.json'), '{}')
  }
  await fsp.writeFile(path.join(saida, 'indice.json'), '{"equipes":[]}')
  await fsp.writeFile(path.join(saida, 'index.html'), '<html>índice</html>')
  await fsp.writeFile(path.join(saida, 'rodada.json'), '{}')
}

test('publicar --sem-push: copia relatórios e índice, cria um commit só com relatorios/', async (t) => {
  const dir = pastaTemporaria(t)
  const { repo, git } = repositorioTemporario(t)
  await saidaComRelatorios(dir, { acai: 'final', beta: 'final' })
  fs.writeFileSync(path.join(repo, 'outro.txt'), 'não é da publicação\n')
  git('add', 'outro.txt')

  const saida = coletor()
  const codigo = await publicar(['--sem-push', '--repo', repo, '--dir', dir], { escrever: saida.escrever, agora: () => new Date(2026, 10, 28, 15, 7) })

  assert.equal(codigo, 0, saida.texto())
  assert.equal(git('log', '-1', '--format=%s').trim(), 'chore(relatorios): publique a rodada final das 15h07')
  assert.deepEqual(git('show', '--name-only', '--format=', 'HEAD').trim().split('\n').sort(), [
    'relatorios/acai/relatorio.html',
    'relatorios/acai/relatorio.json',
    'relatorios/beta/relatorio.html',
    'relatorios/beta/relatorio.json',
    'relatorios/index.html',
    'relatorios/indice.json',
  ])
  assert.equal(fs.readFileSync(path.join(repo, 'relatorios', 'acai', 'relatorio.html'), 'utf8'), '<html>acai</html>')
  assert.equal(git('rev-list', '--count', 'HEAD').trim(), '2')
  assert.match(git('status', '--porcelain').trim(), /^A {2}outro\.txt$/, 'o que já estava no índice continua fora do commit')

  const repetida = coletor()
  assert.equal(await publicar(['--sem-push', '--repo', repo, '--dir', dir], { escrever: repetida.escrever }), 0)
  assert.match(repetida.texto(), /Sem mudanças/)
  assert.equal(git('rev-list', '--count', 'HEAD').trim(), '2', 'sem mudanças não cria commit')
})

test('publicar: fora da main recusa o push e não cria commit; na main envia para o remoto', async (t) => {
  const dir = pastaTemporaria(t)
  const { repo, git } = repositorioTemporario(t)
  const remoto = pastaTemporaria(t)
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', remoto])
  git('remote', 'add', 'origin', remoto)
  await saidaComRelatorios(dir, { acai: 'final' })

  git('switch', '-q', '-c', 'trabalho-em-curso')
  const recusa = coletor()
  assert.equal(await publicar(['--repo', repo, '--dir', dir], { escrever: recusa.escrever }), 1)
  assert.match(recusa.texto(), /branch trabalho-em-curso/)
  assert.equal(git('rev-list', '--count', 'HEAD').trim(), '1', 'nenhum commit foi criado no branch errado')

  git('switch', '-q', 'main')
  const envio = coletor()
  assert.equal(await publicar(['--repo', repo, '--dir', dir], { escrever: envio.escrever }), 0, envio.texto())
  assert.match(envio.texto(), /Enviado para origin\/main/)
  const noRemoto = execFileSync('git', ['-C', remoto, 'log', '-1', '--format=%s', 'main'], { encoding: 'utf8' }).trim()
  assert.match(noRemoto, /^chore\(relatorios\): publique a rodada final/)
})

test('publicar: recusa prévia sem --previa e aceita com ela', async (t) => {
  const dir = pastaTemporaria(t)
  const { repo, git } = repositorioTemporario(t)
  await saidaComRelatorios(dir, { acai: 'final', beta: 'previa' })

  const recusa = coletor()
  assert.equal(await publicar(['--sem-push', '--repo', repo, '--dir', dir], { escrever: recusa.escrever }), 1)
  assert.match(recusa.texto(), /Recusado: 1 de 2 relatórios são de prévia \(beta\)/)
  assert.equal(fs.existsSync(path.join(repo, 'relatorios')), false)
  assert.equal(git('rev-list', '--count', 'HEAD').trim(), '1')

  const aceita = coletor()
  assert.equal(await publicar(['--sem-push', '--previa', '--repo', repo, '--dir', dir], { escrever: aceita.escrever, agora: () => new Date(2026, 10, 28, 9, 30) }), 0, aceita.texto())
  assert.equal(git('log', '-1', '--format=%s').trim(), 'chore(relatorios): publique a rodada previa das 09h30')
})

test('publicar: sem relatórios sai com código 1; pasta que não é repositório sai com código 2', async (t) => {
  const dir = pastaTemporaria(t)
  const { repo } = repositorioTemporario(t)
  const vazio = coletor()
  assert.equal(await publicar(['--sem-push', '--repo', repo, '--dir', dir], { escrever: vazio.escrever }), 1)
  assert.match(vazio.texto(), /Nenhum relatório/)

  const semGit = coletor()
  assert.equal(await publicar(['--sem-push', '--repo', pastaTemporaria(t), '--dir', dir], { escrever: semGit.escrever }), 2)
  assert.match(semGit.texto(), /não está dentro de um repositório git/)
})
