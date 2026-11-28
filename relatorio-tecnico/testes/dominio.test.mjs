import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { achatar, descreverTipos, esquemaPara } from '../dominio/afirmacao.mjs'
import { lerEquipes, normalizarRepo } from '../dominio/equipe.mjs'
import { evidenciaDeArquivo, evidenciaDeCommit, conferirCitacao } from '../dominio/evidencia.mjs'
import { revisar } from '../dominio/linguagem.mjs'
import { analisarCsv, carregarCsv } from '../ferramentas/csv.mjs'

async function pastaTemporaria(t) {
  const pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'rt-teste-dominio-'))
  t.after(() => fs.rm(pasta, { recursive: true, force: true }))
  return pasta
}

test('esquemaPara: uma lista por tipo, com os campos do tipo e citacoes, sem anyOf', () => {
  const esquema = esquemaPara(['promessa', 'declaracao'])

  assert.deepEqual(esquema.required, ['promessa', 'declaracao'])
  assert.equal(esquema.additionalProperties, false)
  const promessa = esquema.properties.promessa.items
  assert.deepEqual(promessa.required, ['citacao', 'classe', 'citacoes'])
  assert.equal(promessa.additionalProperties, false)
  assert.deepEqual(promessa.properties.classe.enum, ['funcionalidade', 'tecnologia', 'resultado'])
  assert.deepEqual(promessa.properties.citacoes.items.required, ['tipo', 'caminho'])
  assert.deepEqual(Object.keys(promessa.properties.citacoes.items.properties), ['tipo', 'caminho', 'linha', 'linha_fim', 'trecho'])
  assert.ok(esquema.properties.declaracao.items.properties.onde_procurou)
  assert.ok(!JSON.stringify(esquema).includes('anyOf'))
  assert.throws(() => esquemaPara(['inexistente']), /inexistente/)
})

test('achatar: ida e volta com dois tipos, ids P1, P2 e declaracao-1', () => {
  const citacao = { tipo: 'arquivo', caminho: 'README.md', linha: 3, trecho: 'Gera o laudo em PDF' }
  const saida = {
    promessa: [
      { citacao: 'Gera o laudo em PDF', classe: 'funcionalidade', citacoes: [citacao] },
      { citacao: 'Usa o modelo X', classe: 'tecnologia', citacoes: [] },
    ],
    declaracao: [{ promessa: 'P1', estado: 'confirmada', citacoes: [citacao] }],
  }

  const afirmacoes = achatar(saida, ['promessa', 'declaracao'])

  assert.deepEqual(afirmacoes.map((afirmacao) => afirmacao.id), ['P1', 'P2', 'declaracao-1'])
  assert.deepEqual(afirmacoes[0], { id: 'P1', tipo: 'promessa', dados: { citacao: 'Gera o laudo em PDF', classe: 'funcionalidade' }, citacoes: [citacao] })
  assert.deepEqual(afirmacoes[2].dados, { promessa: 'P1', estado: 'confirmada' })
  assert.deepEqual(achatar(null, ['promessa']), [])
  assert.deepEqual(achatar({ promessa: 'texto solto' }, ['promessa']), [])
})

test('descreverTipos: traz descrição, campos e a prova de cada valor que a muda', () => {
  const texto = descreverTipos(['declaracao', 'chamada_ia'])

  assert.match(texto, /### declaracao/)
  assert.match(texto, /`onde_procurou` \(lista de textos, opcional\)/)
  assert.match(texto, /`estado` = confirmada: ao menos 1 citação de tipo arquivo/)
  assert.match(texto, /`estado` = nao_encontrada: nenhuma citação é exigida/)
  assert.match(texto, /`estado` = parcial exige preencher: existe, falta/)
  assert.match(texto, /### chamada_ia[\s\S]*ao menos 1 citação de tipo arquivo/)
})

test('analisarCsv: aspas com vírgula e quebra de linha, aspas dobradas, BOM e CRLF', () => {
  const linhas = analisarCsv('﻿a,"b, com vírgula","c\ncom quebra"\r\n"diz ""oi""",,fim\r\n\r\n')

  assert.deepEqual(linhas, [
    ['a', 'b, com vírgula', 'c\ncom quebra'],
    ['diz "oi"', '', 'fim'],
  ])
})

test('carregarCsv: lê arquivo e explica quando não consegue', async (t) => {
  const pasta = await pastaTemporaria(t)
  await fs.writeFile(path.join(pasta, 'equipes.csv'), 'nome,repositorio\nA,a/b\n')

  assert.equal(await carregarCsv(path.join(pasta, 'equipes.csv')), 'nome,repositorio\nA,a/b\n')
  await assert.rejects(carregarCsv(path.join(pasta, 'nao-existe.csv')), /nao-existe\.csv.*ENOENT/)
})

const CABECALHO_DO_FORMULARIO = [
  'Carimbo de data/hora',
  'Nome do projeto',
  'Link do repositório público (GitHub)',
  'One-line summary',
  '"Descrição do projeto\n(o que faz, pra quem é, o que foi construído no hackathon)"',
  'Link da demo ao vivo',
  'Track',
  '"Vídeo do pitch, 3 minutos\n(YouTube não listado, Loom ou Drive)"',
].join(',')

test('lerEquipes: planilha do formulário com cabeçalhos reais, repositório repetido e nome repetido', () => {
  const csv = [
    CABECALHO_DO_FORMULARIO,
    '28/11/2026 14:10:00,Laudo Fácil,https://github.com/ana/laudo,Laudos em PDF,"Gera laudos, com IA.\nLogin: demo / demo",https://laudo.app,Saúde,https://loom.com/v1',
    '28/11/2026 15:30:00,Laudo Fácil 2,https://github.com/ana/laudo/tree/main/web,Laudos em PDF v2,Versão nova,,,https://loom.com/v2',
    '28/11/2026 14:20:00,Atlas,git@github.com:bia/atlas.git,Mapas,Descrição,,Educação,',
    '28/11/2026 14:25:00,Atlas,https://github.com/caio/atlas-app.git,Outro,Descrição,,,',
    ',,,,,,,',
  ].join('\n')

  const equipes = lerEquipes(csv)

  assert.deepEqual(equipes.map((equipe) => equipe.id), ['laudo-facil-2', 'bia-atlas', 'caio-atlas-app'])
  assert.deepEqual(equipes[0], {
    id: 'laudo-facil-2',
    nome: 'Laudo Fácil 2',
    repo: { dono: 'ana', nome: 'laudo', url: 'https://github.com/ana/laudo' },
    resumo: 'Laudos em PDF v2',
    descricao: 'Versão nova',
    demo: null,
    track: null,
    video: 'https://loom.com/v2',
  })
  assert.equal(equipes[1].track, 'Educação')
  assert.equal(equipes[1].video, null)
})

test('lerEquipes: descrição com vírgula e quebra de linha chega inteira', () => {
  const csv = `${CABECALHO_DO_FORMULARIO}\n28/11/2026 14:10:00,Laudo,ana/laudo,Resumo,"Gera laudos, com IA.\nLogin: demo / demo",https://laudo.app,Saúde,https://loom.com/v1\n`

  const [equipe] = lerEquipes(csv)

  assert.equal(equipe.descricao, 'Gera laudos, com IA.\nLogin: demo / demo')
  assert.equal(equipe.demo, 'https://laudo.app')
})

test('lerEquipes: CSV reduzido da prévia, com linha sem repositório válido', () => {
  const equipes = lerEquipes('nome,repositorio,demo\nPuca,https://github.com/dono/puca,\n,dono/sem-nome,https://x.dev\nSó perfil,https://github.com/dono,\n')

  assert.deepEqual(equipes.map(({ id, nome, repo, demo }) => ({ id, nome, repo: repo?.url ?? null, demo })), [
    { id: 'puca', nome: 'Puca', repo: 'https://github.com/dono/puca', demo: null },
    { id: 'dono-sem-nome', nome: 'dono/sem-nome', repo: 'https://github.com/dono/sem-nome', demo: 'https://x.dev' },
    { id: 'so-perfil', nome: 'Só perfil', repo: null, demo: null },
  ])
  assert.deepEqual(lerEquipes(''), [])
})

test('normalizarRepo: formas aceitas e recusadas', () => {
  const esperado = { dono: 'dono', nome: 'meu.repo', url: 'https://github.com/dono/meu.repo' }
  for (const link of [
    'https://github.com/dono/meu.repo',
    'https://github.com/dono/meu.repo.git',
    'https://github.com/dono/meu.repo/tree/ramo/pasta',
    'http://www.github.com/dono/meu.repo/',
    'github.com/dono/meu.repo?tab=readme',
    'git@github.com:dono/meu.repo.git',
    ' dono/meu.repo ',
  ]) {
    assert.deepEqual(normalizarRepo(link), esperado, link)
  }
  for (const link of ['https://github.com/dono', 'https://gitlab.com/dono/repo', 'não tenho', '', null, 'https://github.com/dono/..']) {
    assert.equal(normalizarRepo(link), null, String(link))
  }
})

test('revisar: recusa palavra de julgamento sem diferenciar acento, caixa e flexão', () => {
  assert.deepEqual(revisar('A tela inicial lista os laudos.'), { ok: true })
  assert.deepEqual(revisar(null), { ok: true })
  assert.deepEqual(revisar('O tratamento de erro é PÉSSIMO e mal  feito.'), { ok: false, palavras: ['pessimo', 'mal feito'] })
  assert.equal(revisar('Uma solução ótima').ok, false)
  assert.equal(revisar('Infelizmente não sobe').ok, false)
  assert.equal(revisar('O arquivo arruimado.js e a função perfeitoide').ok, true)
})

test('evidenciaDeArquivo: lê o trecho, monta o link no commit e oculta segredo', async (t) => {
  const codigo = await pastaTemporaria(t)
  await fs.mkdir(path.join(codigo, 'src'))
  await fs.writeFile(path.join(codigo, 'src', 'a b.js'), 'um\ndois\ntres\nCHAVE=segredo\n')
  const fontes = { codigo, repo: { dono: 'ana', nome: 'laudo' }, sha: 'abc123' }

  assert.deepEqual(evidenciaDeArquivo(fontes, 'src/a b.js', 2, { linha_fim: 3 }), {
    tipo: 'arquivo',
    caminho: 'src/a b.js',
    linha: 2,
    linha_fim: 3,
    trecho: 'dois\ntres',
    link: 'https://github.com/ana/laudo/blob/abc123/src/a%20b.js#L2-L3',
    conferida: 'script',
  })
  const segredo = evidenciaDeArquivo(fontes, 'src/a b.js', 4, { ocultarTrecho: true })
  assert.equal(segredo.trecho, null)
  assert.equal(segredo.link, 'https://github.com/ana/laudo/blob/abc123/src/a%20b.js#L4')
  assert.equal(evidenciaDeCommit(fontes.repo, 'abc123').link, 'https://github.com/ana/laudo/commit/abc123')
})

test('conferirCitacao: captura, log, url e formulário', async (t) => {
  const raiz = await pastaTemporaria(t)
  const fontes = { codigo: null, repo: null, sha: null, formulario: path.join(raiz, 'formulario'), saida: path.join(raiz, 'saida') }
  await fs.mkdir(path.join(fontes.saida, 'capturas', 'uso'), { recursive: true })
  await fs.mkdir(path.join(fontes.saida, 'logs'))
  await fs.mkdir(fontes.formulario)
  await fs.writeFile(path.join(fontes.saida, 'capturas', 'uso', 'passo-1.png'), 'png')
  await fs.writeFile(path.join(fontes.saida, 'capturas', 'uso', 'vazia.png'), '')
  await fs.writeFile(path.join(fontes.saida, 'logs', 'build.log'), 'instalando\nerro: módulo ausente\n')
  await fs.writeFile(path.join(fontes.formulario, 'descricao.md'), 'Gera laudos,\ncom IA.\n')

  const captura = await conferirCitacao({ tipo: 'captura', caminho: 'capturas/uso/passo-1.png' }, fontes)
  assert.equal(captura.conferida, 'conferidor')
  assert.equal(captura.link, 'capturas/uso/passo-1.png')
  assert.equal((await conferirCitacao({ tipo: 'captura', caminho: 'passo-1.png' }, fontes)).caminho, 'capturas/uso/passo-1.png')
  assert.equal(await conferirCitacao({ tipo: 'captura', caminho: 'capturas/uso/vazia.png' }, fontes), null)
  assert.equal(await conferirCitacao({ tipo: 'captura', caminho: 'capturas/uso/outra.png' }, fontes), null)

  assert.equal((await conferirCitacao({ tipo: 'log', caminho: 'logs/build.log', trecho: 'erro: módulo ausente' }, fontes)).linha, 2)
  assert.equal(await conferirCitacao({ tipo: 'log', caminho: 'logs/build.log', trecho: 'erro inventado' }, fontes), null)

  assert.equal((await conferirCitacao({ tipo: 'url', caminho: 'https://exemplo.com/a' }, fontes)).link, 'https://exemplo.com/a')
  assert.equal(await conferirCitacao({ tipo: 'url', caminho: 'javascript:alert(1)' }, fontes), null)

  const formulario = await conferirCitacao({ tipo: 'formulario', caminho: 'descricao.md', trecho: 'Gera laudos, com IA.' }, fontes)
  assert.deepEqual([formulario.linha, formulario.linha_fim, formulario.link], [1, 2, null])
  assert.equal(await conferirCitacao({ tipo: 'formulario', caminho: 'descricao.md' }, fontes), null)
  assert.equal(await conferirCitacao({ tipo: 'formulario', caminho: 'outro.md', trecho: 'Gera laudos' }, fontes), null)
})

test('lerEquipes tira caracteres de controle do que vem do formulário', () => {
  const csv = 'nome,repositorio,descricao\n"Projeto\u001b[2J\u001b[1;31mFalso\u0007","https://github.com/dono/repo","linha um\nlinha\u001b[0m dois"\n'
  const [equipe] = lerEquipes(csv)
  assert.equal(/[\u0000-\u001f\u007f-\u009f]/.test(equipe.nome), false, 'o nome não leva caractere de controle para o terminal')
  assert.match(equipe.nome, /^Projeto.*Falso$/)
  assert.equal(equipe.descricao, 'linha um\nlinha[0m dois', 'a descrição mantém a quebra de linha e perde o ESC')
})
