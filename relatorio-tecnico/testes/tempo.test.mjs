import assert from 'node:assert/strict'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { copiarCodigo, listarCommits, prepararClone } from '../ferramentas/git.mjs'
import { rodarOuLancar } from '../ferramentas/processo.mjs'
import { arquivosIguais, compararEquipes } from '../etapas/tempo/copia.mjs'
import { cortar, escolherCorte } from '../etapas/tempo/corte.mjs'
import { horarioDeBrasilia } from '../etapas/tempo/horario.mjs'
import { calcularLinhaDoTempo, ehCommitGrande } from '../etapas/tempo/linha.mjs'

const JANELA = { inicio: '2026-11-28T09:20:00-03:00', fim: '2026-11-28T16:00:00-03:00' }
const temEvidencia = fs.existsSync(fileURLToPath(new URL('../dominio/evidencia.mjs', import.meta.url)))

let raiz
let origem
/** @type {Record<string, string>} */
const sha = {}

const git = (dir, args, env = {}) =>
  rodarOuLancar('git', ['-C', dir, '-c', 'user.name=Equipe', '-c', 'user.email=equipe@exemplo.test', '-c', 'commit.gpgsign=false', ...args], {
    env: { ...process.env, ...env },
  })

async function commitar(dir, nome, data, arquivos) {
  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    await fsp.mkdir(path.dirname(path.join(dir, caminho)), { recursive: true })
    await fsp.writeFile(path.join(dir, caminho), conteudo)
  }
  await git(dir, ['add', '-A'])
  await git(dir, ['commit', '-q', '-m', nome], { GIT_AUTHOR_DATE: data, GIT_COMMITTER_DATE: data })
  return (await git(dir, ['rev-parse', 'HEAD'])).trim()
}

const linhas = (quantas, prefixo = 'linha') => Array.from({ length: quantas }, (_, i) => `${prefixo} ${i}\n`).join('')

const equipeDe = (id, url) => ({ id, nome: id, repo: url ? { dono: 'equipe', nome: id, url } : null })

const githubDeMentira = (atividade) => ({
  metadados: async () => ({ ramo_padrao: 'main' }),
  atividade: async () => atividade,
})

const push = (em, qual, tipo = 'push', ref = 'refs/heads/main') => ({ em, tipo, ref, sha: qual })

before(async () => {
  raiz = await fsp.mkdtemp(path.join(os.tmpdir(), 'rt-teste-tempo-'))
  origem = path.join(raiz, 'origem')
  await fsp.mkdir(origem)
  await git(origem, ['init', '-q', '-b', 'main'])
  sha.antes = await commitar(origem, 'antes da janela', '2026-11-28T08:00:00-03:00', { 'a.js': linhas(3) })
  sha.manha = await commitar(origem, 'manhã', '2026-11-28T10:00:00-03:00', { 'b.js': linhas(5), 'logo.png': Buffer.from([0, 1, 2, 0, 255, 0]) })
  sha.tarde = await commitar(origem, 'tarde', '2026-11-28T15:30:00-03:00', { 'a.js': linhas(2) + linhas(2, 'nova') })
  sha.depois = await commitar(origem, 'depois do fim', '2026-11-28T16:30:00-03:00', { 'c.js': linhas(1) })
})

after(async () => {
  await fsp.rm(raiz, { recursive: true, force: true })
})

describe('git', () => {
  test('lista os commits do mais antigo ao mais novo, com linhas por commit', async () => {
    const dir = path.join(raiz, 'trabalho', 'lista', 'repo')
    const { ramo } = await prepararClone({ url: origem, dir })
    assert.equal(ramo, 'main')
    const commits = await listarCommits({ dirRepo: dir, ref: 'origin/main' })

    assert.deepEqual(commits.map((c) => c.sha), [sha.antes, sha.manha, sha.tarde, sha.depois])
    assert.deepEqual(commits.map((c) => [c.adicionadas, c.removidas]), [[3, 0], [5, 0], [2, 1], [1, 0]])
    assert.deepEqual(commits[1].arquivos, [
      { caminho: 'b.js', adicionadas: 5, removidas: 0 },
      { caminho: 'logo.png', adicionadas: 0, removidas: 0 },
    ])
    assert.equal(commits[0].commit_em, '2026-11-28T08:00:00-03:00')
    assert.equal(commits[0].autor_em, '2026-11-28T08:00:00-03:00')
    assert.equal(commits[0].autor, 'Equipe')
    assert.equal(commits[2].mensagem, 'tarde')
    assert.deepEqual(commits[1].pais, [sha.antes])
  })

  test('copia a árvore do commit pedido e não refaz a cópia que já existe', async () => {
    const dir = path.join(raiz, 'trabalho', 'copia', 'repo')
    await prepararClone({ url: origem, dir })
    const destino = path.join(raiz, 'trabalho', 'copia', `codigo-${sha.manha}`)
    await copiarCodigo({ dirRepo: dir, sha: sha.manha, destino })

    assert.deepEqual((await fsp.readdir(destino)).sort(), ['a.js', 'b.js', 'logo.png'])
    assert.equal(await fsp.readFile(path.join(destino, 'a.js'), 'utf8'), linhas(3))
    assert.deepEqual((await fsp.readdir(path.dirname(destino))).sort(), [`codigo-${sha.manha}`, 'repo'])

    await fsp.writeFile(path.join(destino, 'marca'), 'x')
    await copiarCodigo({ dirRepo: dir, sha: sha.manha, destino })
    assert.equal(await fsp.readFile(path.join(destino, 'marca'), 'utf8'), 'x')
  })

  test('atualiza um clone que já existe', async () => {
    const remoto = path.join(raiz, 'remoto-que-cresce')
    await fsp.mkdir(remoto)
    await git(remoto, ['init', '-q', '-b', 'main'])
    await commitar(remoto, 'um', '2026-11-28T10:00:00-03:00', { 'a.js': 'a\n' })
    const dir = path.join(raiz, 'trabalho', 'cresce', 'repo')
    await prepararClone({ url: remoto, dir })
    const dois = await commitar(remoto, 'dois', '2026-11-28T11:00:00-03:00', { 'b.js': 'b\n' })

    await prepararClone({ url: remoto, dir })
    const commits = await listarCommits({ dirRepo: dir, ref: 'origin/main' })
    assert.equal(commits.at(-1).sha, dois)
    assert.equal(await fsp.readFile(path.join(dir, 'b.js'), 'utf8'), 'b\n')
  })
})

describe('escolha do commit de corte', () => {
  const atividade = [
    push('2026-11-28T16:30:00-03:00', 'd'),
    push('2026-11-28T16:00:00-03:00', 'c', 'force_push'),
    push('2026-11-28T15:59:00-03:00', 'x', 'push', 'refs/heads/outro'),
    push('2026-11-28T12:00:00-03:00', 'b', 'pr_merge'),
    push('2026-11-28T09:30:00-03:00', 'a', 'branch_creation'),
  ]

  test('vale o push que chegou exatamente no fim da janela', () => {
    assert.deepEqual(escolherCorte({ atividade, ramo: 'main', fim: JANELA.fim }), { sha: 'c', em: '2026-11-28T16:00:00-03:00' })
  })

  test('push depois do fim e push em outro branch não contam', () => {
    assert.deepEqual(escolherCorte({ atividade, ramo: 'main', fim: '2026-11-28T15:59:59-03:00' }), { sha: 'b', em: '2026-11-28T12:00:00-03:00' })
  })

  test('o primeiro push de um repositório novo conta', () => {
    assert.deepEqual(escolherCorte({ atividade, ramo: 'main', fim: '2026-11-28T10:00:00-03:00' }), { sha: 'a', em: '2026-11-28T09:30:00-03:00' })
  })

  test('com o fim no futuro vale o push mais recente', () => {
    assert.equal(escolherCorte({ atividade, ramo: 'main', fim: '2099-01-01T00:00:00-03:00' }).sha, 'd')
  })

  test('todos os pushes depois do fim: nada chegou', () => {
    assert.deepEqual(escolherCorte({ atividade, ramo: 'main', fim: '2026-11-28T09:00:00-03:00' }), { motivo: 'nada_ate_o_fim' })
  })

  test('lista vazia: sem atividade', () => {
    assert.deepEqual(escolherCorte({ atividade: [], ramo: 'main', fim: JANELA.fim }), { motivo: 'sem_atividade' })
  })
})

describe('cortar', () => {
  const pasta = (nome) => path.join(raiz, 'trabalho', nome)

  test('usa o push até o fim da janela e entrega o código desse commit', async () => {
    const github = githubDeMentira([push('2026-11-28T16:31:00-03:00', sha.depois), push('2026-11-28T15:31:00-03:00', sha.tarde)])
    const saida = await cortar({ equipe: equipeDe('alfa', origem), janela: JANELA, pastaTrabalho: pasta('alfa'), github })

    assert.deepEqual(saida, {
      sha: sha.tarde,
      em: '2026-11-28T15:31:00-03:00',
      origem: 'push',
      codigo: path.join(pasta('alfa'), `codigo-${sha.tarde}`),
      dir_repo: path.join(pasta('alfa'), 'repo'),
      ramo: 'main',
      repo: { dono: 'equipe', nome: 'alfa', url: origem },
    })
    assert.deepEqual((await fsp.readdir(saida.codigo)).sort(), ['a.js', 'b.js', 'logo.png'])
    assert.equal(await fsp.readFile(path.join(saida.codigo, 'a.js'), 'utf8'), linhas(2) + linhas(2, 'nova'))
  })

  test('sem atividade do GitHub, usa a data do commit', async () => {
    const saida = await cortar({ equipe: equipeDe('beta', origem), janela: JANELA, pastaTrabalho: pasta('beta'), github: githubDeMentira([]) })
    assert.equal(saida.sha, sha.tarde)
    assert.equal(saida.origem, 'data_do_commit')
    assert.equal(saida.em, '2026-11-28T15:30:00-03:00')
  })

  test('atividade do GitHub com erro também cai na data do commit', async () => {
    const github = { metadados: async () => ({ ramo_padrao: 'main' }), atividade: async () => { throw new Error('limite de requisições') } }
    const saida = await cortar({ equipe: equipeDe('gama', origem), janela: JANELA, pastaTrabalho: pasta('gama'), github })
    assert.equal(saida.origem, 'data_do_commit')
  })

  test('lança quando nenhum push chegou até o fim', async () => {
    const github = githubDeMentira([push('2026-11-28T16:31:00-03:00', sha.depois)])
    await assert.rejects(
      cortar({ equipe: equipeDe('delta', origem), janela: JANELA, pastaTrabalho: pasta('delta'), github }),
      { message: 'nenhum commit chegou ao GitHub até 28/11 16:00' },
    )
  })

  test('lança quando nenhum commit tem data até o fim', async () => {
    const janela = { inicio: '2026-11-27T09:00:00-03:00', fim: '2026-11-27T16:00:00-03:00' }
    await assert.rejects(
      cortar({ equipe: equipeDe('epsilon', origem), janela, pastaTrabalho: pasta('epsilon'), github: githubDeMentira([]) }),
      { message: 'nenhum commit chegou ao GitHub até 27/11 16:00' },
    )
  })

  test('lança quando a equipe não informou repositório', async () => {
    await assert.rejects(
      cortar({ equipe: equipeDe('zeta', null), janela: JANELA, pastaTrabalho: pasta('zeta'), github: githubDeMentira([]) }),
      { message: 'repositório não informado ou link inválido' },
    )
  })

  test('lança com o sha quando o commit do push não está no clone', async () => {
    const sumido = 'a'.repeat(40)
    await assert.rejects(
      cortar({ equipe: equipeDe('eta', origem), janela: JANELA, pastaTrabalho: pasta('eta'), github: githubDeMentira([push('2026-11-28T15:00:00-03:00', sumido)]) }),
      (erro) => erro.message.includes(sumido) && erro.message.includes('não está no clone'),
    )
  })
})

describe('linha do tempo', () => {
  let commits
  before(async () => {
    const dir = path.join(raiz, 'trabalho', 'linha', 'repo')
    await prepararClone({ url: origem, dir })
    commits = await listarCommits({ dirRepo: dir, ref: 'origin/main' })
  })

  test('sem pushes, classifica pela data do commit', () => {
    const linha = calcularLinhaDoTempo({ commits, sha: sha.tarde, janela: JANELA, pushes: [] })
    assert.equal(linha.total, 4)
    assert.equal(linha.primeiro.sha, sha.antes)
    assert.equal(linha.ultimo.sha, sha.depois)
    assert.deepEqual(linha.fora_da_janela.antes, [{ sha: sha.antes, horario: '2026-11-28T08:00:00-03:00', base: 'data_do_commit', mensagem: 'antes da janela' }])
    assert.deepEqual(linha.fora_da_janela.depois, [{ sha: sha.depois, horario: '2026-11-28T16:30:00-03:00', base: 'data_do_commit', mensagem: 'depois do fim' }])
    assert.deepEqual(linha.depois_do_corte.map((c) => c.sha), [sha.depois])
    assert.deepEqual(linha.por_hora, [['28/11 08h', 1, 3], ['28/11 10h', 1, 5], ['28/11 15h', 1, 2], ['28/11 16h', 1, 1]])
    assert.deepEqual(linha.maiores.map((c) => [c.sha, c.adicionadas]), [[sha.manha, 5], [sha.antes, 3], [sha.tarde, 2], [sha.depois, 1]])
  })

  test('o horário do push vale mais que a data do commit', () => {
    const pushes = [
      { em: '2026-11-28T17:10:00-03:00', sha: sha.depois },
      { em: '2026-11-28T16:05:00-03:00', sha: sha.tarde },
      { em: '2026-11-28T10:05:00-03:00', sha: sha.manha },
    ]
    const linha = calcularLinhaDoTempo({ commits, sha: sha.manha, janela: JANELA, pushes })
    assert.deepEqual(linha.fora_da_janela.antes, [])
    assert.deepEqual(linha.fora_da_janela.depois, [
      { sha: sha.tarde, horario: '2026-11-28T16:05:00-03:00', base: 'push', mensagem: 'tarde' },
      { sha: sha.depois, horario: '2026-11-28T17:10:00-03:00', base: 'push', mensagem: 'depois do fim' },
    ])
    assert.equal(linha.cobertos_por_push, 4)
    assert.deepEqual(linha.depois_do_corte.map((c) => c.sha), [sha.tarde, sha.depois])
  })

  test('commit grande: mais de 2.000 linhas fora de trava, ou mais de 60% do histórico', () => {
    const commit = (id, arquivos) => ({
      sha: id, pais: [], autor_em: JANELA.inicio, commit_em: JANELA.inicio, autor: 'x', mensagem: id, arquivos,
      adicionadas: arquivos.reduce((soma, a) => soma + a.adicionadas, 0), removidas: 0,
    })
    const maiorDe = (lista) => {
      const linha = calcularLinhaDoTempo({ commits: lista, sha: lista[0].sha, janela: JANELA, pushes: [] })
      return ehCommitGrande(linha.maiores[0], linha.total_adicionadas)
    }
    const pequenos = Array.from({ length: 10 }, (_, i) => commit(`p${i}`, [{ caminho: 'src/a.js', adicionadas: 1000, removidas: 0 }]))

    assert.equal(maiorDe(pequenos), false)
    assert.equal(maiorDe([...pequenos, commit('trava', [{ caminho: 'package-lock.json', adicionadas: 5000, removidas: 0 }])]), false)
    assert.equal(maiorDe([...pequenos, commit('codigo', [{ caminho: 'src/b.js', adicionadas: 2001, removidas: 0 }])]), true)
    assert.equal(maiorDe([commit('quase-tudo', [{ caminho: 'src/a.js', adicionadas: 70, removidas: 0 }]), commit('resto', [{ caminho: 'src/b.js', adicionadas: 30, removidas: 0 }])]), true)
  })

  test('horário no fuso de Brasília', () => {
    assert.equal(horarioDeBrasilia('2026-11-28T19:05:00Z'), '28/11 16:05')
    assert.equal(horarioDeBrasilia('2026-11-29T02:00:00Z'), '28/11 23:00')
  })
})

describe('cópia entre equipes', () => {
  const proprio = (nome) => `export function ${nome}() {\n${linhas(40, `  console.log('${nome}')`)}}\n`
  const compartilhado = proprio('compartilhado')
  const modelo = proprio('modeloDoFramework')
  const codigo = {}

  before(async () => {
    const arvores = {
      alfa: { 'src/regra.js': compartilhado, 'src/app.js': modelo, 'src/alfa.js': proprio('alfa'), 'curto.js': 'export const a = 1\n' },
      beta: { 'lib/copiado.js': compartilhado.replace(/\n/g, '\n\n   '), 'src/app.js': modelo, 'package-lock.json': compartilhado },
      gama: { 'src/app.js': modelo, 'src/gama.js': proprio('gama'), 'node_modules/x/regra.js': compartilhado, 'notas.md': compartilhado },
      delta: { 'src/app.js': modelo, 'curto.js': 'export const a = 1\n' },
    }
    for (const [id, arquivos] of Object.entries(arvores)) {
      codigo[id] = path.join(raiz, 'equipes', id)
      for (const [caminho, conteudo] of Object.entries(arquivos)) {
        await fsp.mkdir(path.dirname(path.join(codigo[id], caminho)), { recursive: true })
        await fsp.writeFile(path.join(codigo[id], caminho), conteudo)
      }
    }
  })

  test('aponta o arquivo igual em duas equipes e ignora o modelo presente em quatro', async () => {
    assert.deepEqual(await compararEquipes(codigo), {
      alfa: [{ arquivo: 'src/regra.js', outra_equipe: 'beta', arquivo_dela: 'lib/copiado.js' }],
      beta: [{ arquivo: 'lib/copiado.js', outra_equipe: 'alfa', arquivo_dela: 'src/regra.js' }],
      gama: [],
      delta: [],
    })
  })

  test('arquivo igual em três equipes aparece para as três', () => {
    const impressoes = Object.fromEntries(['a', 'b', 'c'].map((id) => [id, new Map([['h', [`${id}.js`]]])]))
    const iguais = arquivosIguais(impressoes)
    assert.deepEqual(iguais.a.map((i) => i.outra_equipe), ['b', 'c'])
    assert.equal(iguais.c.length, 2)
  })

  test('link simbólico para fora da pasta não é lido', async () => {
    const fora = path.join(raiz, 'fora.js')
    await fsp.writeFile(fora, compartilhado)
    const comLink = path.join(raiz, 'equipes', 'com-link')
    await fsp.mkdir(comLink, { recursive: true })
    await fsp.symlink(fora, path.join(comLink, 'link.js'))
    const iguais = await compararEquipes({ alfa: codigo.alfa, 'com-link': comLink })
    assert.deepEqual(iguais['com-link'], [])
  })
})

describe('relatar', { skip: temEvidencia ? false : 'dominio/evidencia.mjs ainda não existe' }, () => {
  const repo = { dono: 'equipe', nome: 'alfa', url: 'https://github.com/equipe/alfa' }
  const ids = (blocos) => blocos.map((b) => b.id)

  test('github: criação antes da janela, push forçado e fork são sinais', async () => {
    const { default: github } = await import('../etapas/github.mjs')
    const saida = {
      repo, criado_em: '2026-11-20T12:00:00Z', fork: true, origem_do_fork: 'outro/base', ramo_padrao: 'main',
      pushes: [push('2026-11-28T15:00:00-03:00', 'abcdef1234', 'force_push'), push('2026-11-28T14:00:00-03:00', 'b')],
      outros_ramos: [], inicio_da_janela: JANELA.inicio,
    }
    const contribuicao = github.relatar(saida, equipeDe('alfa', repo.url))
    assert.deepEqual(ids(contribuicao.linha_do_tempo), ['github:criado', 'github:push-forcado'])
    assert.equal(contribuicao.linha_do_tempo[0].valor, '20/11 09:00')
    assert.equal(contribuicao.linha_do_tempo[0].sinal, true)
    assert.deepEqual(contribuicao.linha_do_tempo[1].valor.tabela.linhas, [['28/11 15:00', 'main', 'abcdef1']])
    assert.equal(contribuicao.origem[0].valor, 'outro/base')
    assert.equal(contribuicao.origem[0].sinal, true)

    const semSinal = github.relatar({ ...saida, criado_em: '2026-11-28T13:00:00Z', fork: false, pushes: [] }, equipeDe('alfa', repo.url))
    assert.deepEqual(ids(semSinal.linha_do_tempo), ['github:criado'])
    assert.equal(semSinal.linha_do_tempo[0].sinal, false)
    assert.equal(semSinal.origem, undefined)
  })

  test('linha-do-tempo: commits fora da janela viram itens com sinal e evidência de commit', async () => {
    const { default: etapa } = await import('../etapas/linha-do-tempo.mjs')
    const dir = path.join(raiz, 'trabalho', 'relato', 'repo')
    await prepararClone({ url: origem, dir })
    const commits = await listarCommits({ dirRepo: dir, ref: 'origin/main' })
    const saida = { repo, sha: sha.tarde, horario_dos_pushes: false, ...calcularLinhaDoTempo({ commits, sha: sha.tarde, janela: JANELA, pushes: [] }) }
    const { linha_do_tempo } = etapa.relatar(saida, equipeDe('alfa', repo.url))
    const porId = Object.fromEntries(linha_do_tempo.map((b) => [b.id, b]))

    assert.equal(porId['linha-do-tempo:total'].valor, 4)
    assert.equal(porId['linha-do-tempo:primeiro'].valor, '28/11 08:00')
    assert.equal(porId['linha-do-tempo:antes'].sinal, true)
    assert.deepEqual(porId['linha-do-tempo:antes'].valor.tabela.linhas, [[sha.antes.slice(0, 7), '28/11 08:00', 'data do commit', 'antes da janela']])
    assert.equal(porId['linha-do-tempo:antes'].evidencias.length, 1)
    assert.ok(porId['linha-do-tempo:antes'].evidencias[0].link.endsWith(`/equipe/alfa/commit/${sha.antes}`))
    assert.equal(porId['linha-do-tempo:depois'].sinal, true)
    assert.equal(porId['linha-do-tempo:depois-do-corte'].sinal, true)
    assert.deepEqual(porId['linha-do-tempo:volume'].valor.serie[0], ['28/11 08h', 1])
  })

  test('copia: tabela com sinal quando há arquivo igual, item sem sinal quando não há', async () => {
    const { default: copia } = await import('../etapas/copia.mjs')
    const saida = {
      por_equipe: { alfa: [{ arquivo: 'src/regra.js', outra_equipe: 'beta', arquivo_dela: 'lib/copiado.js' }], gama: [] },
      evidencias: { alfa: [], gama: [] },
      nomes: { alfa: 'Alfa', beta: 'Equipe Beta', gama: 'Gama' },
    }
    const comIgual = copia.relatar(saida, equipeDe('alfa', repo.url)).origem[0]
    assert.equal(comIgual.sinal, true)
    assert.deepEqual(comIgual.valor.tabela.linhas, [['src/regra.js', 'Equipe Beta', 'lib/copiado.js']])

    const semIgual = copia.relatar(saida, equipeDe('gama', repo.url)).origem[0]
    assert.equal(semIgual.rotulo, 'Nenhum arquivo igual ao de outra equipe nesta rodada')
    assert.notEqual(semIgual.sinal, true)

    assert.deepEqual(copia.relatar(saida, equipeDe('sem-corte', null)), {})
  })
})
