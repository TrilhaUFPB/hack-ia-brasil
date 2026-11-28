import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import zlib from 'node:zlib'

import { criarEmbutidor } from '../pagina/capturas.mjs'
import { renderizarIndice } from '../pagina/indice.mjs'
import { renderizar } from '../pagina/render.mjs'

const aqui = path.dirname(new URL(import.meta.url).pathname)
const lerFixture = async () => JSON.parse(await fs.readFile(path.join(decodeURIComponent(aqui), 'fixtures/relatorio-exemplo.json'), 'utf8'))

const ESTRUTURA_LOCAL = {
  PARTES: [
    { id: 'roteiro', titulo: 'Roteiro para repetir o teste' },
    { id: 'declaracoes', titulo: 'Declarações da equipe' },
    { id: 'nao_declarado', titulo: 'Usado e não declarado' },
    { id: 'uso', titulo: 'Teste de uso' },
    { id: 'ia', titulo: 'IA no código' },
    { id: 'linha_do_tempo', titulo: 'Linha do tempo' },
    { id: 'origem', titulo: 'Origem do código' },
    { id: 'arquitetura', titulo: 'Arquitetura' },
    { id: 'higiene', titulo: 'Higiene' },
  ],
  RESUMO: [
    { chave: 'deploy', titulo: 'Deploy' },
    { chave: 'build', titulo: 'Build' },
    { chave: 'fluxo', titulo: 'Fluxo principal' },
    { chave: 'ia', titulo: 'IA no código' },
  ],
}

/** Usa o domínio real quando o módulo já existe; a lista local só cobre a ausência dele. */
const estrutura = await import('../dominio/relatorio.mjs').then(
  ({ PARTES, RESUMO }) => (PARTES && RESUMO ? { PARTES, RESUMO } : ESTRUTURA_LOCAL),
  () => ESTRUTURA_LOCAL,
)

const semCapturas = async () => null

function png(largura, altura) {
  const pedaco = (tipo, dados) => {
    const corpo = Buffer.concat([Buffer.from(tipo), dados])
    const tamanho = Buffer.alloc(4)
    tamanho.writeUInt32BE(dados.length)
    const soma = Buffer.alloc(4)
    soma.writeUInt32BE(zlib.crc32(corpo))
    return Buffer.concat([tamanho, corpo, soma])
  }
  const cabecalho = Buffer.alloc(13)
  cabecalho.writeUInt32BE(largura, 0)
  cabecalho.writeUInt32BE(altura, 4)
  cabecalho.set([8, 2, 0, 0, 0], 8)
  const linha = Buffer.concat([Buffer.from([0]), Buffer.alloc(largura * 3, 0x55)])
  const pixels = Buffer.concat(Array.from({ length: altura }, () => linha))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', cabecalho),
    pedaco('IDAT', zlib.deflateSync(pixels)),
    pedaco('IEND', Buffer.alloc(0)),
  ])
}

test('renderizar mostra o projeto, os quatro quadros, um título por parte e a frase fixa', async () => {
  const relatorio = await lerFixture()
  const pagina = await renderizar(relatorio, semCapturas, { estrutura })

  assert.match(pagina, /^<!doctype html>/)
  assert.ok(pagina.includes('<h1>Triagem Clara</h1>'))
  assert.ok(pagina.includes('Prévia interna'))
  assert.equal(pagina.match(/<div class="quadro">/g).length, 4)
  for (const { titulo } of estrutura.RESUMO) assert.ok(pagina.includes(`<h3>${titulo}</h3>`), `quadro ${titulo}`)
  for (const { titulo } of estrutura.PARTES) assert.ok(pagina.includes(`<h2>${titulo}</h2>`), `parte ${titulo}`)
  assert.ok(pagina.includes('Este relatório registra fatos e evidências. Não dá nota e não substitui a avaliação dos jurados.'))
})

test('renderizar escreve os estados por rótulo e marca o que ainda não terminou', async () => {
  const relatorio = await lerFixture()
  const pagina = await renderizar(relatorio, semCapturas, { estrutura })

  assert.ok(pagina.includes('até o passo 2 de 4'))
  assert.ok(pagina.includes('1 confirmada · 1 parcial · 1 não encontrada · 1 contradita · 1 não verificável pelo código · 1 não conferida'))
  assert.ok(pagina.includes('sinal a conferir'))
  assert.ok(pagina.includes('não foi possível testar'))

  const parte = (id) => pagina.slice(pagina.indexOf(`id="parte-${id}"`)).split('</section>')[0]
  assert.ok(parte('origem').includes('em andamento'), 'parte vazia com etapa dona aguardando')
  assert.ok(parte('nao_declarado').includes('Nada registrado nesta parte'), 'parte vazia com etapa dona concluída')
  assert.ok(parte('nao_verificado').includes('a tela pede login com conta Google'))
  assert.ok(pagina.includes('3</span> afirmações descartadas por falta de prova'))

  const final = await renderizar({ ...relatorio, geracao: { ...relatorio.geracao, modo: 'final' } }, semCapturas, { estrutura })
  assert.ok(!final.includes('Prévia interna'))
})

test('renderizar escapa texto hostil e recusa link que não é http', async () => {
  const relatorio = await lerFixture()
  const ataque = '<script>alert(1)</script>'
  const aspas = '"><img src=x onerror=alert(1)>'
  relatorio.equipe.nome = ataque
  relatorio.equipe.resumo = aspas
  relatorio.equipe.demo = 'javascript:alert(1)'
  relatorio.equipe.repo = 'javascript:alert(1)'
  relatorio.geracao.etapas.build.titulo = ataque
  relatorio.declaracoes[0].citacao = ataque
  relatorio.declaracoes[0].obs = aspas
  relatorio.declaracoes[0].fonte.link = 'javascript:alert(1)'
  relatorio.declaracoes[0].evidencias[0].link = ' JavaScript:alert(1)'
  relatorio.declaracoes[0].evidencias[0].caminho = aspas
  relatorio.declaracoes[0].evidencias[0].trecho = `</pre>${ataque}`
  relatorio.declaracoes[0].evidencias[1].caminho = aspas
  relatorio.uso[0].evidencias[1].link = 'data:text/html,<script>alert(1)</script>'
  relatorio.linha_do_tempo[3].valor.tabela.linhas[0][3] = ataque
  relatorio.linha_do_tempo[2].valor.serie[0][0] = ataque
  relatorio.arquitetura[1].valor.lista[0] = ataque
  relatorio.nao_verificado[0].motivo = ataque
  relatorio.resumo.deploy = { estado: 'falhou', erro: ataque }
  relatorio.resumo.fluxo = { estado: ataque }
  relatorio.descartados.motivos = { [ataque]: 1 }

  const pagina = await renderizar(relatorio, async () => 'data:image/webp;base64,AAAA', { estrutura })

  assert.ok(!/<script/i.test(pagina), 'nenhuma tag script')
  assert.ok(!pagina.includes('<img src=x'), 'nenhuma tag injetada por atributo')
  assert.ok(!/href="\s*(javascript|data):/i.test(pagina), 'nenhum href com esquema recusado')
  assert.ok(!/\son\w+\s*=\s*alert/i.test(pagina.replace(/&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;/g, '')), 'nenhum manipulador de evento')
  assert.ok(pagina.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(pagina.includes('javascript:alert(1)'), 'o endereço recusado aparece como texto')
})

test('renderizar embute no máximo 24 capturas e mostra as demais pelo nome', async () => {
  const relatorio = await lerFixture()
  relatorio.uso = Array.from({ length: 30 }, (_, i) => ({
    tipo: 'passo',
    id: `uso:passo-${i}`,
    n: i + 1,
    acao: `passo ${i + 1}`,
    evidencias: [{ tipo: 'captura', caminho: `capturas/uso/lote-${i}.png`, link: null, conferida: 'conferidor' }],
  }))
  relatorio.roteiro = []
  relatorio.declaracoes = []
  const pedidos = []
  const pagina = await renderizar(
    relatorio,
    async (caminho) => {
      pedidos.push(caminho)
      return 'data:image/webp;base64,AAAA'
    },
    { estrutura },
  )

  assert.equal(pedidos.length, 24)
  assert.equal(pagina.match(/<img /g).length, 24)
  assert.ok(pagina.includes('captura · capturas/uso/lote-29.png'))
})

test('criarEmbutidor embute um PNG da pasta e recusa caminho fora dela', async (t) => {
  const raiz = await fs.mkdtemp(path.join(os.tmpdir(), 'rt-teste-pagina-'))
  t.after(() => fs.rm(raiz, { recursive: true, force: true }))
  const pasta = path.join(raiz, 'equipe')
  await fs.mkdir(path.join(pasta, 'capturas'), { recursive: true })
  await fs.writeFile(path.join(pasta, 'capturas/tela.png'), png(8, 6))
  await fs.writeFile(path.join(raiz, 'fora.png'), png(8, 6))
  await fs.symlink(path.join(raiz, 'fora.png'), path.join(pasta, 'capturas/atalho.png'))

  const embutir = criarEmbutidor(pasta)
  const imagem = await embutir('capturas/tela.png')
  assert.match(imagem, /^data:image\/(webp|png);base64,[A-Za-z0-9+/]+=*$/)
  assert.equal(await embutir('capturas/tela.png'), imagem)

  assert.equal(await embutir('../fora.png'), null)
  assert.equal(await embutir('capturas/../../fora.png'), null)
  assert.equal(await embutir(path.join(raiz, 'fora.png')), null)
  assert.equal(await embutir('capturas/atalho.png'), null)
  assert.equal(await embutir('capturas/nao-existe.png'), null)
})

test('criarEmbutidor reduz captura mais larga que 1280 pixels', async (t) => {
  const pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'rt-teste-pagina-'))
  t.after(() => fs.rm(pasta, { recursive: true, force: true }))
  await fs.writeFile(path.join(pasta, 'larga.png'), png(2000, 20))

  const imagem = await criarEmbutidor(pasta)('larga.png')
  if (!imagem.startsWith('data:image/webp')) return t.skip('cwebp ausente: o PNG original foi embutido')
  const webp = Buffer.from(imagem.split(',')[1], 'base64')
  const quadro = webp.indexOf('VP8 ')
  assert.ok(quadro > 0, 'WebP com perda')
  assert.equal(webp.readUInt16LE(quadro + 14) & 0x3fff, 1280)
})

test('renderizarIndice ordena por nome e não deixa o HTML do projeto passar', async () => {
  const base = await lerFixture()
  const com = (id, nome, horario) => ({ ...base, equipe: { ...base.equipe, id, nome }, geracao: { ...base.geracao, horario } })
  const relatorios = [
    com('zebra', 'Zebra', '2026-11-28T16:10:00-03:00'),
    com('agua', 'Água Viva', '2026-11-28T16:25:00-03:00'),
    com('mapa', '<script>alert(1)</script>mapa', '2026-11-28T16:05:00-03:00'),
  ]
  const { html, json } = renderizarIndice(relatorios, { modo: 'final' }, { resumo: estrutura.RESUMO })

  assert.deepEqual(json.equipes.map((equipe) => equipe.id), ['mapa', 'agua', 'zebra'])
  assert.equal(json.modo, 'final')
  assert.equal(json.gerado_em, '2026-11-28T16:25:00-03:00')
  assert.deepEqual(Object.keys(json.equipes[1]), ['id', 'nome', 'track', 'modo', 'horario', 'resumo', 'relatorio', 'dados'])
  assert.equal(json.equipes[1].relatorio, 'agua/relatorio.html')
  assert.equal(json.equipes[1].dados, 'agua/relatorio.json')

  assert.ok(html.indexOf('Água Viva') < html.indexOf('>Zebra<'))
  assert.ok(html.includes('href="agua/relatorio.html"'))
  assert.ok(!/<script/i.test(html))
  for (const { titulo } of estrutura.RESUMO) assert.ok(html.includes(`<th scope="col">${titulo}</th>`))
  assert.ok(!/nota|ranking|posição|pontos/i.test(html.replace(/<style>[\s\S]*<\/style>/, '')))
})
