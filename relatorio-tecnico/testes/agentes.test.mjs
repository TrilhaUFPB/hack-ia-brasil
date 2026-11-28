import { test } from 'node:test'
import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { lerResposta, montarChamada, rodarAgente } from '../ferramentas/claude.mjs'
import { soDePromessasConhecidas } from '../etapas/agentes/conferidas.mjs'
import { montarPrompt } from '../etapas/agentes/prompt.mjs'
import leitor from '../etapas/leitor.mjs'
import promessas from '../etapas/promessas.mjs'
import uso, { escolherAlvo, pastaDeCapturasNoNavegador } from '../etapas/uso.mjs'

const REAL = process.env.RT_AGENTES_REAL === '1'

const conferido = (afirmacoes, fatos = {}) => ({
  afirmacoes,
  descartadas: 0,
  motivos: {},
  fatos,
  doTipo: (tipo) => afirmacoes.filter((afirmacao) => afirmacao.tipo === tipo),
})

const evidencia = (caminho, resto = {}) => ({ tipo: 'arquivo', caminho, linha: 1, trecho: 'x', link: null, conferida: 'conferidor', ...resto })
const captura = (nome) => ({ tipo: 'captura', caminho: `capturas/uso/${nome}`, link: `capturas/uso/${nome}`, conferida: 'conferidor' })

const passo = (n, resultado, resto = {}) => ({
  id: `passo_uso-${n}`,
  tipo: 'passo_uso',
  dados: { n, acao: `ação ${n}`, observado: `tela ${n}`, resultado, erro: null, motivo: null, ...resto },
  evidencias: resultado === 'nao_testavel' ? [] : [captura(`passo-0${n}.png`)],
})

const pedidoBase = { prompt: 'texto do prompt', tipos: ['promessa'], ferramentas: ['Read', 'Glob', 'Grep'], cwd: '/tmp/codigo', modelo: 'haiku', orcamentoUsd: 0.3 }

const valorDe = (args, opcao) => args[args.indexOf(opcao) + 1]

test('o comando do claude leva as opções verificadas e o prompt pelo stdin', () => {
  const { comando, args, opcoes } = montarChamada({ ...pedidoBase, dirsExtras: ['/tmp/formulario'] })

  assert.equal(comando, 'claude')
  for (const opcao of ['-p', '--restricted', '--strict-mcp-config', '--no-session-persistence']) assert.ok(args.includes(opcao), opcao)
  assert.equal(valorDe(args, '--output-format'), 'json')
  assert.equal(valorDe(args, '--model'), 'haiku')
  assert.equal(valorDe(args, '--max-budget-usd'), '0.3')
  assert.equal(valorDe(args, '--tools'), 'Read,Glob,Grep')
  assert.equal(valorDe(args, '--add-dir'), '/tmp/formulario')
  assert.deepEqual(Object.keys(JSON.parse(valorDe(args, '--json-schema')).properties), ['promessa'])
  assert.ok(!args.includes('--mcp-config'))
  assert.ok(!args.includes('texto do prompt'))
  assert.equal(opcoes.entrada, 'texto do prompt')
  assert.equal(opcoes.cwd, '/tmp/codigo')
})

test('agent com navegador fica sem ferramentas de arquivo e só com o servidor MCP liberado', () => {
  const { args } = montarChamada({ ...pedidoBase, tipos: ['passo_uso'], ferramentas: [], mcp: { mcpServers: {} } }, '/tmp/mcp.json')

  assert.equal(valorDe(args, '--tools'), '')
  assert.equal(valorDe(args, '--mcp-config'), '/tmp/mcp.json')
  assert.equal(valorDe(args, '--allowedTools'), 'mcp__navegador')
})

test('o ambiente do agent não herda as variáveis da sessão do Claude', (t) => {
  process.env.CLAUDE_CODE_TESTE_RT = '1'
  process.env.CLAUDECODE_RT = '1'
  t.after(() => {
    delete process.env.CLAUDE_CODE_TESTE_RT
    delete process.env.CLAUDECODE_RT
  })

  const { opcoes } = montarChamada(pedidoBase)

  assert.deepEqual(Object.keys(opcoes.env).filter((nome) => nome.startsWith('CLAUDE')), [])
  assert.equal(opcoes.env.PATH, process.env.PATH)
})

test('a resposta do claude só vale com sucesso e saída estruturada', () => {
  const sucesso = { is_error: false, subtype: 'success', structured_output: { promessa: [] }, total_cost_usd: 0.01, num_turns: 3, result: '' }

  assert.deepEqual(lerResposta(JSON.stringify(sucesso)), { saida: { promessa: [] }, custoUsd: 0.01, turnos: 3 })
  assert.equal(lerResposta('Execution error'), null)
  assert.equal(lerResposta(''), null)
  assert.throws(() => lerResposta(JSON.stringify({ ...sucesso, is_error: true, subtype: 'error_max_budget_usd', result: 'orçamento' })), /error_max_budget_usd.*orçamento/)
  assert.throws(() => lerResposta(JSON.stringify({ ...sucesso, subtype: 'error_max_turns' })), /error_max_turns/)
  assert.throws(() => lerResposta(JSON.stringify({ ...sucesso, structured_output: undefined, result: 'texto solto' })), /texto solto/)
})

async function comClaudeFalso(t, roteiro) {
  const pasta = await fsp.mkdtemp(path.join(os.tmpdir(), 'rt-teste-agentes-'))
  const caminhoAntigo = process.env.PATH
  t.after(async () => {
    process.env.PATH = caminhoAntigo
    await fsp.rm(pasta, { recursive: true, force: true })
  })
  await fsp.writeFile(path.join(pasta, 'claude'), `#!/bin/sh\ncat > "${pasta}/stdin-$$"\necho x >> "${pasta}/chamadas"\n${roteiro}\n`, { mode: 0o755 })
  process.env.PATH = `${pasta}${path.delimiter}${caminhoAntigo}`
  return {
    pasta,
    chamadas: async () => (await fsp.readFile(path.join(pasta, 'chamadas'), 'utf8')).trim().split('\n').length,
    entradas: async () => Promise.all((await fsp.readdir(pasta)).filter((nome) => nome.startsWith('stdin-')).map((nome) => fsp.readFile(path.join(pasta, nome), 'utf8'))),
  }
}

const RESPOSTA_BOA = JSON.stringify({
  is_error: false,
  subtype: 'success',
  num_turns: 2,
  total_cost_usd: 0.002,
  result: '',
  structured_output: { promessa: [{ citacao: 'gera o laudo em PDF', classe: 'funcionalidade', citacoes: [{ tipo: 'arquivo', caminho: 'README.md', linha: 3, trecho: 'gera o laudo em PDF' }] }] },
})

test('rodarAgente tenta de novo uma vez quando o stdout não é JSON e devolve as afirmações achatadas', async (t) => {
  const falso = await comClaudeFalso(t, `if [ "$(wc -l < "$(dirname "$0")/chamadas")" -eq 1 ]; then echo "falha de rede"; exit 1; fi\necho '${RESPOSTA_BOA}'`)
  const pulsos = []

  const afirmacoes = await rodarAgente({ ...pedidoBase, cwd: falso.pasta, pulso: (linha) => pulsos.push(linha) })

  assert.equal(await falso.chamadas(), 2)
  assert.deepEqual(await falso.entradas(), ['texto do prompt', 'texto do prompt'])
  assert.deepEqual(afirmacoes, [{
    id: 'P1',
    tipo: 'promessa',
    dados: { citacao: 'gera o laudo em PDF', classe: 'funcionalidade' },
    citacoes: [{ tipo: 'arquivo', caminho: 'README.md', linha: 3, trecho: 'gera o laudo em PDF' }],
  }])
  assert.ok(pulsos.some((linha) => linha.includes('2 turnos') && linha.includes('0.0020')), pulsos.join(' | '))
})

test('rodarAgente desiste na segunda saída ilegível e não repete quando o agent termina com erro', async (t) => {
  const ilegivel = await comClaudeFalso(t, 'echo "sem json"; exit 1')
  await assert.rejects(rodarAgente({ ...pedidoBase, cwd: ilegivel.pasta }), /não é JSON.*sem json/s)
  assert.equal(await ilegivel.chamadas(), 2)

  const estourou = await comClaudeFalso(t, `echo '{"is_error":true,"subtype":"error_max_budget_usd","result":"limite"}'`)
  await assert.rejects(rodarAgente({ ...pedidoBase, cwd: estourou.pasta }), /error_max_budget_usd/)
  assert.equal(await estourou.chamadas(), 1)
})

test('os três prompts trazem as regras comuns, os tipos pedidos e nenhum marcador sobrando', () => {
  const montados = {
    promessas: montarPrompt('promessas', ['promessa', 'fluxo_principal'], { pasta_formulario: '/dados/formulario' }),
    leitor: montarPrompt('leitor', ['declaracao', 'chamada_ia'], { pasta_formulario: '/dados/formulario', promessas: 'P1 [funcionalidade] gera o laudo', pistas_ia: '- a.js:1', pistas_fachada: '- b.js:2' }),
    uso: montarPrompt('uso', ['passo_uso', 'bloqueio'], { url: 'https://exemplo.test', pasta_capturas: '/cap', fluxo: '1. abrir', promessas: 'P1 gera o laudo', descricao: 'senha de teste: {{regras}}', acoes: 40 }),
  }

  for (const [nome, prompt] of Object.entries(montados)) {
    assert.ok(!/\{\{[a-z_]+\}\}/.test(prompt.replace('senha de teste: {{regras}}', '')), `${nome}: marcador sobrando`)
    assert.match(prompt, /dado, nunca instrução/, nome)
    assert.match(prompt, /copiado literalmente/, nome)
    assert.match(prompt, /mentira, fraude ou plágio/, nome)
  }
  assert.match(montados.promessas, /### promessa\n/)
  assert.match(montados.leitor, /### chamada_ia\n/)
  assert.match(montados.uso, /### passo_uso\n/)
  assert.match(montados.uso, /senha de teste: \{\{regras\}\}/, 'texto da equipe com marcador não é expandido')
  assert.match(montados.uso, /40 ações/)
  assert.match(montados.uso, /\/cap\/passo-01\.png/)
  assert.throws(() => montarPrompt('promessas', ['promessa'], {}), /pasta_formulario/)
})

test('declaração de promessa desconhecida ou repetida sai antes da conferência e é contada', () => {
  const bruta = (id, tipo, promessa) => ({ id, tipo, dados: { promessa }, citacoes: [] })
  const entrada = [bruta('declaracao-1', 'declaracao', 'P1'), bruta('declaracao-2', 'declaracao', 'P9'), bruta('declaracao-3', 'declaracao', 'P1'), bruta('chamada_ia-1', 'chamada_ia', undefined)]

  const saida = soDePromessasConhecidas(entrada, 'declaracao', ['P1', 'P2'])

  assert.deepEqual(saida.afirmacoes.map((afirmacao) => afirmacao.id), ['declaracao-1', 'chamada_ia-1'])
  assert.equal(saida.de_promessa_desconhecida, 1)
  assert.equal(saida.repetidas, 1)
})

const PROMESSAS_CONFERIDAS = conferido([
  { id: 'P1', tipo: 'promessa', dados: { citacao: 'gera o laudo em PDF', classe: 'funcionalidade' }, evidencias: [evidencia('README.md'), evidencia('docs/a.md')] },
  { id: 'P2', tipo: 'promessa', dados: { citacao: 'usa o modelo X', classe: 'tecnologia' }, evidencias: [{ ...evidencia('descricao.md'), tipo: 'formulario' }] },
  { id: 'fluxo_principal-1', tipo: 'fluxo_principal', dados: { descricao: 'enviar exame', passos: ['abrir', 'enviar'] }, evidencias: [evidencia('README.md')] },
])

const LEITOR_CONFERIDO = conferido([
  { id: 'declaracao-1', tipo: 'declaracao', dados: { promessa: 'P1', estado: 'parcial', observacao: 'gera HTML', existe: 'HTML', falta: 'PDF', onde_procurou: [] }, evidencias: [evidencia('src/laudo.js')] },
  { id: 'declaracao-2', tipo: 'declaracao', dados: { promessa: 'P2', estado: 'nao_encontrada', observacao: null, onde_procurou: ['src/'] }, evidencias: [] },
  { id: 'chamada_ia-1', tipo: 'chamada_ia', dados: { provedor: 'Anthropic', modelo: 'claude-x', finalidade: 'gera o laudo' }, evidencias: [evidencia('src/ia.js')] },
  { id: 'resposta_fixa-1', tipo: 'resposta_fixa', dados: { descricao: 'texto fixo na rota /laudo' }, evidencias: [evidencia('src/rota.js')] },
  { id: 'nao_declarado-1', tipo: 'nao_declarado', dados: { nome: 'Supabase', classe: 'servico' }, evidencias: [evidencia('src/db.js')] },
  { id: 'componente-1', tipo: 'componente', dados: { nome: 'API', papel: 'recebe exames', arquivos: ['src/api.js'] }, evidencias: [evidencia('src/api.js')] },
  { id: 'diferenca_arquitetura-1', tipo: 'diferenca_arquitetura', dados: { descrito: 'três serviços', encontrado: 'um processo' }, evidencias: [evidencia('README.md')] },
])

test('promessas relata um bloco por promessa, com a primeira evidência como fonte', () => {
  const { declaracoes, ...resto } = promessas.relatar(PROMESSAS_CONFERIDAS)

  assert.deepEqual(resto, {})
  assert.deepEqual(declaracoes, [
    { tipo: 'declaracao', id: 'P1', citacao: 'gera o laudo em PDF', fonte: evidencia('README.md'), classe: 'funcionalidade' },
    { tipo: 'declaracao', id: 'P2', citacao: 'usa o modelo X', fonte: { ...evidencia('descricao.md'), tipo: 'formulario' }, classe: 'tecnologia' },
  ])
})

test('leitor relata estado e evidências por promessa e distribui o resto nas partes', () => {
  const contribuicao = leitor.relatar(LEITOR_CONFERIDO)

  assert.deepEqual(contribuicao.declaracoes[0], {
    tipo: 'declaracao', id: 'P1', estado: 'parcial', evidencias: [evidencia('src/laudo.js')],
    obs: 'gera HTML', existe: 'HTML', falta: 'PDF', o_que_faz: null, onde_procurou: [],
  })
  assert.equal(contribuicao.declaracoes[1].estado, 'nao_encontrada')
  assert.deepEqual(contribuicao.declaracoes[1].onde_procurou, ['src/'])
  assert.deepEqual(contribuicao.ia.map((bloco) => [bloco.id, bloco.rotulo, bloco.valor ?? null, Boolean(bloco.sinal)]), [
    ['leitor:chamada_ia-1', 'Chamada a Anthropic', 'claude-x', false],
    ['leitor:resposta_fixa-1', 'Resposta fixa no código', null, true],
  ])
  assert.deepEqual(contribuicao.nao_declarado.map((bloco) => [bloco.rotulo, bloco.valor]), [['Supabase', 'servico']])
  assert.deepEqual(contribuicao.arquitetura.map((bloco) => bloco.id), ['leitor:componente-1', 'leitor:diferenca_arquitetura-1'])
  for (const bloco of [...contribuicao.ia, ...contribuicao.nao_declarado, ...contribuicao.arquitetura]) {
    assert.equal(bloco.tipo, 'item')
    assert.equal(bloco.evidencias.length, 1)
  }
})

test('resumo de IA: verificado com chamada no código, falhou sem nenhuma', () => {
  assert.deepEqual(leitor.relatar(LEITOR_CONFERIDO).resumo, { ia: { estado: 'verificado' } })
  const semChamada = conferido(LEITOR_CONFERIDO.afirmacoes.filter((afirmacao) => afirmacao.tipo !== 'chamada_ia'))
  assert.deepEqual(leitor.relatar(semChamada).resumo, { ia: { estado: 'falhou', erro: 'nenhuma chamada a modelo de IA encontrada no código' } })
})

const fluxoDe = (afirmacoes, fatos = { alvo: 'deploy', url: 'https://exemplo.test' }) => uso.relatar(conferido(afirmacoes, fatos)).resumo.fluxo

test('resumo do fluxo nos cinco casos', () => {
  assert.deepEqual(fluxoDe([], { alvo: null, motivo: 'nenhum deploy informado; o projeto não subiu em container' }),
    { estado: 'nao_testavel', motivo: 'nenhum deploy informado; o projeto não subiu em container' })
  assert.deepEqual(fluxoDe([]), { estado: 'nao_testavel', motivo: 'o testador não registrou passos' })
  assert.deepEqual(fluxoDe([passo(1, 'funcionou'), passo(2, 'falhou', { erro: 'erro 500 ao enviar' }), passo(3, 'falhou', { erro: 'outro' })]),
    { estado: 'falhou', erro: 'erro 500 ao enviar' })
  assert.deepEqual(fluxoDe([passo(1, 'funcionou'), passo(2, 'funcionou'), passo(3, 'nao_testavel', { motivo: 'tempo de teste esgotado' })]),
    { estado: 'verificado', alcance: { ate: 2, de: 3 } })
  assert.deepEqual(fluxoDe([passo(1, 'funcionou'), passo(2, 'funcionou')]), { estado: 'verificado' })
})

test('fluxo em que nenhum passo pôde ser executado fica como não testável, com o motivo do primeiro', () => {
  assert.deepEqual(fluxoDe([passo(1, 'nao_testavel', { motivo: 'login por terceiro' }), passo(2, 'nao_testavel', { motivo: 'login por terceiro' })]),
    { estado: 'nao_testavel', motivo: 'login por terceiro' })
})

const USO_CONFERIDO = conferido([
  passo(2, 'falhou', { erro: 'erro 500' }),
  passo(1, 'funcionou'),
  passo(3, 'funcionou'),
  passo(4, 'nao_testavel', { motivo: 'tempo de teste esgotado' }),
  { id: 'entrada_inesperada-1', tipo: 'entrada_inesperada', dados: { entrada: 'campo vazio', observado: 'mensagem de validação', resultado: 'funcionou' }, evidencias: [captura('inesperada-01.png')] },
  { id: 'bloqueio-1', tipo: 'bloqueio', dados: { item: 'login com Google', motivo: 'login por terceiro' }, evidencias: [] },
  { id: 'promessa_no_uso-1', tipo: 'promessa_no_uso', dados: { promessa: 'P1', resultado: 'falhou', erro: 'erro 500', motivo: null }, evidencias: [captura('passo-02.png')] },
], { alvo: 'local', url: 'http://localhost:3000', provedores_ia: ['Anthropic'] })

test('uso relata passos em ordem, entradas inesperadas e bloqueios; o roteiro só tem passos que funcionaram', () => {
  const contribuicao = uso.relatar(USO_CONFERIDO)

  assert.deepEqual(contribuicao.uso.map((bloco) => [bloco.tipo, bloco.id, bloco.estado.estado]), [
    ['passo', 'uso:passo-1', 'verificado'],
    ['passo', 'uso:passo-2', 'falhou'],
    ['passo', 'uso:passo-3', 'verificado'],
    ['passo', 'uso:passo-4', 'nao_testavel'],
    ['item', 'uso:entrada_inesperada-1', 'verificado'],
    ['item', 'uso:bloqueio-1', 'nao_testavel'],
  ])
  assert.deepEqual(contribuicao.uso[3].estado, { estado: 'nao_testavel', motivo: 'tempo de teste esgotado' })
  assert.deepEqual(contribuicao.roteiro.map((bloco) => [bloco.n, bloco.acao, bloco.esperado]), [[1, 'ação 1', 'tela 1'], [3, 'ação 3', 'tela 3']])
  assert.deepEqual(contribuicao.roteiro[0].evidencias, [captura('passo-01.png')])
  assert.deepEqual(contribuicao.ia.map((bloco) => bloco.valor), [{ lista: ['Anthropic'] }])
  assert.deepEqual(contribuicao.linha_do_tempo, [])
})

test('as três etapas contribuem para a mesma declaração sem escrever o mesmo campo', () => {
  const pedacos = [promessas.relatar(PROMESSAS_CONFERIDAS), leitor.relatar(LEITOR_CONFERIDO), uso.relatar(USO_CONFERIDO)]
    .map((contribuicao) => contribuicao.declaracoes.find((bloco) => bloco.id === 'P1'))

  const campos = pedacos.flatMap((pedaco) => Object.keys(pedaco).filter((campo) => campo !== 'tipo' && campo !== 'id'))
  assert.equal(new Set(campos).size, campos.length, `campo repetido entre etapas: ${campos.join(', ')}`)

  const fundida = Object.assign({}, ...pedacos)
  assert.equal(fundida.citacao, 'gera o laudo em PDF')
  assert.equal(fundida.estado, 'parcial')
  assert.deepEqual(fundida.no_uso, { estado: 'falhou', erro: 'erro 500' })
})

test('deploy com impressão digital diferente no teste vira sinal na linha do tempo', () => {
  const antes = { hash: 'aaa', recursos: 4, em: '2026-11-28T16:00:00-03:00' }
  const fatos = (depois) => ({ alvo: 'deploy', url: 'https://exemplo.test', impressao_do_deploy: antes, impressao_no_teste: depois })

  const [sinal] = uso.relatar(conferido([passo(1, 'funcionou')], fatos({ hash: 'bbb', recursos: 5, em: '2026-11-28T16:20:00-03:00' }))).linha_do_tempo
  assert.equal(sinal.sinal, true)
  assert.deepEqual(sinal.valor.tabela.linhas.map((linha) => linha.at(-1)), ['aaa', 'bbb'])

  assert.deepEqual(uso.relatar(conferido([passo(1, 'funcionou')], fatos({ ...antes }))).linha_do_tempo, [])
  assert.deepEqual(uso.relatar(conferido([passo(1, 'funcionou')], fatos(null))).linha_do_tempo, [])
})

test('alvo do teste: deploy que responde, senão instância local, senão nenhum com o motivo', () => {
  const build = { subiu: true, imagem: 'rt-x:1' }
  assert.deepEqual(escolherAlvo({ responde: true, url: 'https://exemplo.test' }, build), { alvo: 'deploy', url: 'https://exemplo.test' })
  assert.deepEqual(escolherAlvo({ responde: false, url: 'https://exemplo.test' }, build), { alvo: 'local' })
  assert.deepEqual(escolherAlvo(null, { subiu: false, imagem: null }), { alvo: null, motivo: 'nenhum deploy informado; o projeto não subiu em container' })
  assert.deepEqual(escolherAlvo({ responde: false, url: 'https://exemplo.test' }, null), { alvo: null, motivo: 'o deploy informado não respondeu; a etapa de build não terminou' })

  const dep = (saidas) => (id) => ({ saida: saidas[id] })
  assert.deepEqual(uso.fila({ dep: dep({ deploy: null, build }) }), ['containers', 'agentes'])
  assert.deepEqual(uso.fila({ dep: dep({ deploy: { responde: true, url: 'https://exemplo.test' }, build }) }), ['agentes'])
})

test('o testador descobre a pasta de capturas pelo que o servidor do navegador recebe', () => {
  assert.equal(pastaDeCapturasNoNavegador({ mcpServers: { navegador: { args: ['run', '-v', '/home/x:/cap', 'imagem', '--output-dir', '/cap'] } } }), '/cap')
  assert.throws(() => pastaDeCapturasNoNavegador({ mcpServers: { navegador: { args: ['run'] } } }), /--output-dir/)
})

test('sem alvo, o testador não chama agent e devolve o motivo', async () => {
  const saida = await uso.executar({ recurso: { alvo: null, motivo: 'nenhum deploy informado; o projeto não subiu em container' } })
  assert.deepEqual(saida, { afirmacoes: [], fatos: { alvo: null, motivo: 'nenhum deploy informado; o projeto não subiu em container' } })
})

test('real: agent de promessas lê README e formulário e cita linhas que existem', { skip: !REAL && 'defina RT_AGENTES_REAL=1' }, async (t) => {
  const pasta = await fsp.mkdtemp(path.join(os.tmpdir(), 'rt-teste-agentes-real-'))
  t.after(() => fsp.rm(pasta, { recursive: true, force: true }))
  const codigo = path.join(pasta, 'codigo')
  const formulario = path.join(pasta, 'formulario')
  await fsp.mkdir(codigo)
  await fsp.mkdir(formulario)
  await fsp.writeFile(path.join(codigo, 'README.md'), '# Laudo Fácil\n\nO Laudo Fácil gera o laudo do exame em PDF.\nUsa o modelo Claude para escrever o texto do laudo.\nNosso sonho é mudar a saúde no Brasil.\n')
  await fsp.writeFile(path.join(formulario, 'descricao.md'), 'O médico envia o exame e recebe o laudo em 10 segundos.\n')
  await fsp.writeFile(path.join(formulario, 'resumo.md'), '')
  const pulsos = []

  const afirmacoes = await rodarAgente({
    prompt: montarPrompt('promessas', ['promessa'], { pasta_formulario: formulario }),
    tipos: ['promessa'],
    ferramentas: ['Read', 'Glob', 'Grep'],
    cwd: codigo,
    dirsExtras: [formulario],
    modelo: 'haiku',
    orcamentoUsd: 0.3,
    pulso: (linha) => pulsos.push(linha),
  })

  t.diagnostic(pulsos.at(-1))
  t.diagnostic(JSON.stringify(afirmacoes))
  assert.ok(afirmacoes.length >= 2, 'pelo menos duas promessas')
  assert.ok(afirmacoes.every((afirmacao) => afirmacao.tipo === 'promessa' && /^P\d+$/.test(afirmacao.id)))
  assert.ok(afirmacoes.every((afirmacao) => !/sonho/.test(afirmacao.dados.citacao)), 'frase de visão fica de fora')
  const textos = { 'README.md': await fsp.readFile(path.join(codigo, 'README.md'), 'utf8'), 'descricao.md': await fsp.readFile(path.join(formulario, 'descricao.md'), 'utf8') }
  for (const { citacoes } of afirmacoes) {
    assert.ok(citacoes.length >= 1)
    for (const citacao of citacoes) {
      const linhas = textos[citacao.caminho]?.split('\n')
      assert.ok(linhas, `caminho desconhecido: ${citacao.caminho}`)
      assert.ok(linhas[citacao.linha - 1].includes(citacao.trecho.trim()), `trecho fora da linha ${citacao.linha}: ${citacao.trecho}`)
    }
  }
  assert.ok(afirmacoes.some(({ citacoes }) => citacoes.some((citacao) => citacao.tipo === 'formulario' && citacao.caminho === 'descricao.md')), 'cita o formulário')
})

test('real: agent com navegador grava a captura na pasta montada', { skip: !REAL && 'defina RT_AGENTES_REAL=1' }, async (t) => {
  const { configMcpNavegador } = await import('../ferramentas/navegador.mjs')
  const raiz = path.join(os.homedir(), 'hack-ia-relatorios', 'teste-agentes')
  await fsp.mkdir(raiz, { recursive: true })
  const capturas = await fsp.mkdtemp(path.join(raiz, 'capturas-'))
  t.after(() => fsp.rm(capturas, { recursive: true, force: true }))
  const mcp = configMcpNavegador({ capturas })
  const args = mcp.mcpServers.navegador.args
  args.splice(args.indexOf('run') + 1, 0, '--name', `rt-teste-agentes-navegador-${process.pid}`)
  const pulsos = []

  const afirmacoes = await rodarAgente({
    prompt: montarPrompt('uso', ['passo_uso'], {
      url: 'https://example.com',
      pasta_capturas: pastaDeCapturasNoNavegador(mcp),
      fluxo: '1. abrir a página inicial',
      promessas: 'Nenhuma promessa de funcionalidade foi extraída.',
      descricao: 'A equipe não enviou descrição.',
      acoes: 4,
    }),
    tipos: ['passo_uso'],
    ferramentas: [],
    cwd: capturas,
    mcp,
    modelo: 'haiku',
    orcamentoUsd: 0.5,
    pulso: (linha) => pulsos.push(linha),
  })

  t.diagnostic(pulsos.at(-1))
  t.diagnostic(JSON.stringify(afirmacoes))
  const primeiro = afirmacoes.find((afirmacao) => afirmacao.tipo === 'passo_uso' && afirmacao.dados.resultado === 'funcionou')
  assert.ok(primeiro, 'um passo que funcionou')
  const citacao = primeiro.citacoes.find((candidata) => candidata.tipo === 'captura')
  assert.equal(citacao?.caminho, 'passo-01.png')
  assert.ok((await fsp.stat(path.join(capturas, 'passo-01.png'))).size > 1000, 'a captura existe na pasta')
})
