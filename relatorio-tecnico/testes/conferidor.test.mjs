import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { conferir } from '../nucleo/conferidor.mjs'

const CODIGO_DO_LAUDO = ['import PDFDocument from "pdfkit"', '', 'export function gerarLaudo(dados) {', '  const pdf = new PDFDocument()', '  return pdf', '}', ''].join('\n')

async function fontesDeTeste(t) {
  const raiz = await fs.mkdtemp(path.join(os.tmpdir(), 'rt-teste-dominio-conferidor-'))
  t.after(() => fs.rm(raiz, { recursive: true, force: true }))
  const fontes = {
    codigo: path.join(raiz, 'codigo'),
    repo: { dono: 'ana', nome: 'laudo' },
    sha: 'abc123',
    formulario: path.join(raiz, 'formulario'),
    saida: path.join(raiz, 'saida'),
  }
  await fs.mkdir(path.join(fontes.codigo, 'src'), { recursive: true })
  await fs.mkdir(fontes.formulario)
  await fs.mkdir(path.join(fontes.saida, 'capturas', 'uso'), { recursive: true })
  await fs.writeFile(path.join(fontes.codigo, 'src', 'laudo.js'), CODIGO_DO_LAUDO)
  await fs.writeFile(path.join(fontes.codigo, 'README.md'), '# Laudo Fácil\n\nO sistema **gera o laudo em PDF**\ncom um clique.\n')
  await fs.writeFile(path.join(fontes.formulario, 'descricao.md'), 'Usa o modelo Claude para resumir exames.\n')
  await fs.writeFile(path.join(raiz, 'segredo.txt'), 'senha do hospedeiro\n')
  await fs.symlink(path.join(raiz, 'segredo.txt'), path.join(fontes.codigo, 'atalho.txt'))
  await fs.writeFile(path.join(fontes.saida, 'capturas', 'uso', 'passo-1.png'), 'png')
  return fontes
}

const chamadaIa = (id, citacoes, dados = {}) => ({ id, tipo: 'chamada_ia', dados: { provedor: 'anthropic', ...dados }, citacoes })

test('trecho que existe passa com a linha corrigida para a real; trecho inventado é descartado', async (t) => {
  const fontes = await fontesDeTeste(t)

  const conferido = await conferir(
    {
      afirmacoes: [
        chamadaIa('chamada_ia-1', [{ tipo: 'arquivo', caminho: 'src/laudo.js', linha: 40, trecho: 'const pdf =   new PDFDocument()' }]),
        chamadaIa('chamada_ia-2', [{ tipo: 'arquivo', caminho: 'src/laudo.js', linha: 4, trecho: 'const pdf = new Anthropic()' }]),
        chamadaIa('chamada_ia-3', [{ tipo: 'arquivo', caminho: 'src/laudo.js', linha: 3, linha_fim: 40 }]),
        chamadaIa('chamada_ia-4', [{ tipo: 'arquivo', caminho: 'src/laudo.js', linha: 900 }]),
      ],
      fatos: { acoes: 12 },
    },
    fontes,
  )

  assert.deepEqual(conferido.afirmacoes.map((afirmacao) => afirmacao.id), ['chamada_ia-1', 'chamada_ia-3'])
  const [comTrecho, semTrecho] = conferido.afirmacoes
  assert.deepEqual(comTrecho.evidencias, [
    {
      tipo: 'arquivo',
      caminho: 'src/laudo.js',
      linha: 4,
      linha_fim: null,
      trecho: 'const pdf =   new PDFDocument()',
      link: 'https://github.com/ana/laudo/blob/abc123/src/laudo.js#L4',
      conferida: 'conferidor',
    },
  ])
  assert.equal('citacoes' in comTrecho, false)
  assert.equal(semTrecho.evidencias[0].trecho, 'export function gerarLaudo(dados) {\n  const pdf = new PDFDocument()\n  return pdf\n}')
  assert.deepEqual([semTrecho.evidencias[0].linha, semTrecho.evidencias[0].linha_fim], [3, 6])
  assert.equal(conferido.descartadas, 2)
  assert.deepEqual(conferido.motivos, { sem_prova: 2 })
  assert.deepEqual(conferido.fatos, { acoes: 12 })
})

test('caminho com .., absoluto ou por link simbólico para fora do código é recusado', async (t) => {
  const fontes = await fontesDeTeste(t)

  const conferido = await conferir(
    {
      afirmacoes: [
        chamadaIa('a', [{ tipo: 'arquivo', caminho: '../segredo.txt', linha: 1 }]),
        chamadaIa('b', [{ tipo: 'arquivo', caminho: 'src/../../segredo.txt', trecho: 'senha do hospedeiro' }]),
        chamadaIa('c', [{ tipo: 'arquivo', caminho: path.join(fontes.codigo, 'src', 'laudo.js'), linha: 1 }]),
        chamadaIa('d', [{ tipo: 'arquivo', caminho: 'atalho.txt', linha: 1 }]),
      ],
    },
    fontes,
  )

  assert.deepEqual(conferido.afirmacoes, [])
  assert.deepEqual(conferido.motivos, { sem_prova: 4 })
})

test('declaracao: confirmada sem citação de arquivo é descartada; nao_encontrada com onde_procurou passa', async (t) => {
  const fontes = await fontesDeTeste(t)
  const declaracao = (id, dados, citacoes = []) => ({ id, tipo: 'declaracao', dados: { promessa: 'P1', ...dados }, citacoes })
  const noCodigo = { tipo: 'arquivo', caminho: 'src/laudo.js', trecho: 'new PDFDocument()' }

  const conferido = await conferir(
    {
      afirmacoes: [
        declaracao('declaracao-1', { estado: 'confirmada' }),
        declaracao('declaracao-2', { estado: 'confirmada' }, [{ tipo: 'formulario', caminho: 'descricao.md', trecho: 'Usa o modelo Claude' }]),
        declaracao('declaracao-3', { estado: 'nao_encontrada', onde_procurou: ['src/', 'package.json'] }),
        declaracao('declaracao-4', { estado: 'nao_encontrada', onde_procurou: [] }),
        declaracao('declaracao-5', { estado: 'parcial', existe: 'gera o PDF' }, [noCodigo]),
        declaracao('declaracao-6', { estado: 'confirmada' }, [noCodigo]),
        declaracao('declaracao-7', { estado: 'aprovada' }, [noCodigo]),
      ],
    },
    fontes,
  )

  assert.deepEqual(conferido.afirmacoes.map((afirmacao) => afirmacao.id), ['declaracao-3', 'declaracao-6'])
  assert.deepEqual(conferido.afirmacoes[0].evidencias, [])
  assert.equal(conferido.afirmacoes[1].evidencias[0].linha, 4)
  assert.equal(conferido.descartadas, 5)
  assert.deepEqual(conferido.motivos, { sem_prova: 2, campo_do_estado: 2, campo_invalido: 1 })
})

test('promessa: a frase precisa estar literal na fonte citada, e a evidência aponta para onde ela está', async (t) => {
  const fontes = await fontesDeTeste(t)
  const promessa = (id, citacao, citacoes) => ({ id, tipo: 'promessa', dados: { citacao, classe: 'funcionalidade' }, citacoes })

  const conferido = await conferir(
    {
      afirmacoes: [
        promessa('P1', 'O sistema **gera o laudo em PDF** com um clique.', [{ tipo: 'arquivo', caminho: 'README.md', linha: 1, trecho: '# Laudo Fácil' }]),
        promessa('P2', 'O sistema gera laudos em PDF automaticamente', [{ tipo: 'arquivo', caminho: 'README.md', linha: 3, trecho: 'gera o laudo em PDF' }]),
        promessa('P3', 'Usa o modelo Claude para resumir exames.', [{ tipo: 'formulario', caminho: 'descricao.md', trecho: 'Usa o modelo Claude' }]),
        promessa('P4', 'Usa o modelo Claude para resumir exames.', []),
        promessa('P5', 'com um clique.', [{ tipo: 'arquivo', caminho: 'README.md' }]),
        promessa('P6', 'com um clique.', [{ tipo: 'arquivo', caminho: 'NAO-EXISTE.md', linha: 1 }]),
      ],
    },
    fontes,
  )

  assert.deepEqual(conferido.afirmacoes.map((afirmacao) => afirmacao.id), ['P1', 'P3', 'P5'])
  assert.equal(conferido.afirmacoes[2].evidencias[0].linha, 4)
  const [doReadme, doFormulario] = conferido.afirmacoes
  assert.deepEqual([doReadme.evidencias[0].linha, doReadme.evidencias[0].linha_fim], [3, 4])
  assert.equal(doReadme.evidencias[0].link, 'https://github.com/ana/laudo/blob/abc123/README.md#L3-L4')
  assert.equal(doFormulario.evidencias[0].tipo, 'formulario')
  assert.deepEqual(conferido.motivos, { citacao_nao_literal: 1, sem_prova: 2 })
})

test('texto livre com palavra de julgamento vira null e a afirmação fica', async (t) => {
  const fontes = await fontesDeTeste(t)
  const citacoes = [{ tipo: 'arquivo', caminho: 'src/laudo.js', trecho: 'new PDFDocument()' }]

  const conferido = await conferir(
    {
      afirmacoes: [
        chamadaIa('chamada_ia-1', citacoes, { finalidade: 'Um uso péssimo do modelo', modelo: 'claude-x', opiniao: 'código amador' }),
        chamadaIa('chamada_ia-2', citacoes, { finalidade: 'Resume o exame' }),
      ],
    },
    fontes,
  )

  assert.equal(conferido.afirmacoes.length, 2)
  assert.deepEqual(conferido.afirmacoes[0].dados, { provedor: 'anthropic', modelo: 'claude-x', finalidade: null })
  assert.equal(conferido.afirmacoes[1].dados.finalidade, 'Resume o exame')
  assert.equal(conferido.descartadas, 0)
  assert.deepEqual(conferido.motivos, { linguagem: 1 })
})

test('passo de uso exige captura que existe; tipo desconhecido e campo obrigatório ausente são descartados', async (t) => {
  const fontes = await fontesDeTeste(t)
  const passo = (id, dados, citacoes) => ({ id, tipo: 'passo_uso', dados: { n: 1, acao: 'Abrir a página inicial', ...dados }, citacoes })

  const conferido = await conferir(
    {
      afirmacoes: [
        passo('passo_uso-1', { resultado: 'funcionou' }, [{ tipo: 'captura', caminho: 'capturas/uso/passo-1.png' }]),
        passo('passo_uso-2', { resultado: 'funcionou' }, [{ tipo: 'captura', caminho: 'capturas/uso/nao-gravada.png' }]),
        passo('passo_uso-3', { resultado: 'nao_testavel', motivo: 'exige login por terceiro' }, []),
        passo('passo_uso-4', {}, [{ tipo: 'captura', caminho: 'capturas/uso/passo-1.png' }]),
        { id: 'x-1', tipo: 'elogio', dados: { texto: 'muito bom' }, citacoes: [] },
      ],
    },
    fontes,
  )

  assert.deepEqual(conferido.afirmacoes.map((afirmacao) => afirmacao.id), ['passo_uso-1', 'passo_uso-3'])
  assert.deepEqual(conferido.motivos, { sem_prova: 1, campo_obrigatorio: 1, tipo_desconhecido: 1 })
})

test('saída nula ou sem afirmações devolve um Conferido vazio', async () => {
  const vazio = { afirmacoes: [], descartadas: 0, motivos: {}, fatos: {} }
  const fontes = { codigo: null, repo: null, sha: null }

  assert.deepEqual(await conferir(null, fontes), vazio)
  assert.deepEqual(await conferir({}, fontes), vazio)
  assert.deepEqual(await conferir({ fatos: { porta: 3000 } }, fontes), { ...vazio, fatos: { porta: 3000 } })
})
