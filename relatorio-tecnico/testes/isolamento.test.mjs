import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { enderecoInterno, validarUrlPublica, buscarPublico } from '../ferramentas/url-publica.mjs'
import { aplicarIsolamento } from '../ferramentas/isolamento.mjs'
import { CONFIG } from '../config.mjs'

test('enderecoInterno separa endereços internos de públicos', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.5.2', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(enderecoInterno(ip), true, ip)
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '93.184.216.34', '2606:4700::1111']) {
    assert.equal(enderecoInterno(ip), false, ip)
  }
})

test('validarUrlPublica recusa esquema, credenciais e destinos internos', async () => {
  for (const link of ['javascript:alert(1)', 'file:///etc/passwd', 'ftp://exemplo.com', 'http://usuario:senha@exemplo.com', 'http://localhost:9000', 'http://127.0.0.1:3000', 'http://[::1]/', 'http://192.168.5.2:9000', 'http://169.254.169.254/latest', 'http://servico.internal/', 'nao e um link']) {
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
