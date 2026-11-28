import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { enderecoInterno, validarUrlPublica, buscarPublico } from '../ferramentas/url-publica.mjs'
import { aplicarIsolamento } from '../ferramentas/isolamento.mjs'
import { CONFIG } from '../config.mjs'

test('enderecoInterno separa endereços internos de públicos', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.5.2', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::', '::1', 'fd00::1', 'fe80::1', 'fec0::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:c0a8:502', '::7f00:1', '64:ff9b::7f00:1', '2002:c0a8:502::1', 'não é ip']) {
    assert.equal(enderecoInterno(ip), true, ip)
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '93.184.216.34', '2606:4700::1111']) {
    assert.equal(enderecoInterno(ip), false, ip)
  }
})

test('validarUrlPublica recusa esquema, credenciais e destinos internos', async () => {
  for (const link of ['http://[::ffff:127.0.0.1]:9000/', 'http://[::ffff:7f00:1]/', 'http://[0:0:0:0:0:ffff:c0a8:0502]/', 'http://0x7f.1/', 'http://2130706433/', 'javascript:alert(1)', 'file:///etc/passwd', 'ftp://exemplo.com', 'http://usuario:senha@exemplo.com', 'http://localhost:9000', 'http://127.0.0.1:3000', 'http://[::1]/', 'http://192.168.5.2:9000', 'http://169.254.169.254/latest', 'http://servico.internal/', 'nao e um link']) {
    const r = await validarUrlPublica(link)
    assert.equal(r.ok, false, link)
    assert.ok(r.motivo.length > 0)
  }
})

test('validarUrlPublica aceita um site público', async () => {
  const r = await validarUrlPublica('https://example.com/pagina?x=1')
  assert.deepEqual(r, { ok: true, url: 'https://example.com/pagina?x=1' })
})

test('buscarPublico recusa servidor local, mesmo sem redirecionamento', async () => {
  const servidor = http.createServer((_, resposta) => resposta.end('segredo interno')).listen(0, '127.0.0.1')
  await new Promise((pronto) => servidor.once('listening', pronto))
  const { port } = servidor.address()
  await assert.rejects(() => buscarPublico(`http://127.0.0.1:${port}/`), /endereço interno/)
  servidor.close()
})

test('com a regra aplicada, um container do harness alcança a internet e não alcança esta máquina', { timeout: 120_000 }, async () => {
  const resultado = await aplicarIsolamento(CONFIG.imagens.base)
  assert.equal(resultado.ativo, true, resultado.detalhe)
})

test('buscarPublico conecta só no endereço que validou: nome que resolve para dentro é recusado sem abrir conexão', async () => {
  let pedidos = 0
  const servidor = http.createServer((_, resposta) => { pedidos += 1; resposta.end('segredo interno') }).listen(0, '127.0.0.1')
  await new Promise((pronto) => servidor.once('listening', pronto))
  const { port } = servidor.address()
  const consultas = []
  const consultar = async (host) => { consultas.push(host); return [{ address: '127.0.0.1', family: 4 }] }
  await assert.rejects(() => buscarPublico(`http://demo-da-equipe.exemplo:${port}/`, { consultar }), /endereço interno/)
  assert.deepEqual(consultas, ['demo-da-equipe.exemplo'], 'uma consulta só, feita pela própria conexão')
  assert.equal(pedidos, 0)
  servidor.close()
})

test('buscarPublico recusa redirecionamento para endereço interno sem pedir o destino', async () => {
  const pedidos = []
  const transporte = async (url) => {
    pedidos.push(url.href)
    return { status: 302, cabecalhos: { location: 'http://[::ffff:127.0.0.1]:9000/painel' }, corpo: Buffer.alloc(0) }
  }
  await assert.rejects(() => buscarPublico('https://demo-da-equipe.exemplo/', { transporte }), /endereço interno/)
  assert.deepEqual(pedidos, ['https://demo-da-equipe.exemplo/'], 'só o primeiro salto foi pedido')
})

test('buscarPublico segue redirecionamento entre endereços públicos e para depois de cinco saltos', async () => {
  const transporteDeDois = async (url) => (url.pathname === '/fim'
    ? { status: 200, cabecalhos: { 'content-type': 'text/plain' }, corpo: Buffer.from('chegou') }
    : { status: 301, cabecalhos: { location: '/fim' }, corpo: Buffer.alloc(0) })
  const resposta = await buscarPublico('https://demo-da-equipe.exemplo/inicio', { transporte: transporteDeDois })
  assert.equal(resposta.url, 'https://demo-da-equipe.exemplo/fim')
  assert.equal(await resposta.text(), 'chegou')

  const semFim = async () => ({ status: 302, cabecalhos: { location: '/de-novo' }, corpo: Buffer.alloc(0) })
  await assert.rejects(() => buscarPublico('https://demo-da-equipe.exemplo/', { transporte: semFim }), /redirecionamentos/)
})

test('buscarPublico busca uma página pública e devolve status, corpo e endereço final', { timeout: 30_000 }, async () => {
  const resposta = await buscarPublico('https://example.com/')
  assert.equal(resposta.status, 200)
  assert.equal(resposta.url, 'https://example.com/')
  assert.match(await resposta.text(), /Example Domain/)
})
