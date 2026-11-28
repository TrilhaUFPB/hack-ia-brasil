import test from 'node:test'
import assert from 'node:assert/strict'

import { falhou, naoTestavel, verificado } from '../dominio/estados.mjs'
import { evidenciaDeCaptura, evidenciaDeUrl } from '../dominio/evidencia.mjs'
import { PARTES, RESUMO, montar, validarRelatorio } from '../dominio/relatorio.mjs'

const equipe = {
  id: 'laudo-facil',
  nome: 'Laudo Fácil',
  repo: { dono: 'ana', nome: 'laudo', url: 'https://github.com/ana/laudo' },
  resumo: 'Laudos em PDF',
  descricao: 'Gera laudos',
  demo: null,
  track: 'Saúde',
  video: null,
}
const rodada = { modo: 'previa', janela: { inicio: '2026-11-28T09:20:00-03:00', fim: '2026-11-28T16:00:00-03:00' }, equipes: [equipe] }
const agora = new Date('2026-11-28T18:05:00Z')
const relogio = { espera_ms: 1, preparo_ms: 2, execucao_ms: 3 }

const pronto = (etapa, saida) => ({ etapa, chave: 'c', hash_saida: 'h', desfecho: 'pronto', saida, erro: null, parou_em: null, relogio })
const semSucesso = (etapa, desfecho, erro, parou_em = null, saida = null) => ({ etapa, chave: 'c', hash_saida: 'h', desfecho, saida, erro, parou_em, relogio })

const fonte = evidenciaDeUrl('https://github.com/ana/laudo/blob/abc/README.md#L3')
const noCodigo = evidenciaDeUrl('https://github.com/ana/laudo/blob/abc/src/laudo.js#L4')
const captura = evidenciaDeCaptura('capturas/uso/passo-1.png')

const etapaDe = (id, relatar, resumo) => ({ id, titulo: `Etapa ${id}`, coluna: 'fatos', relatar, resumo })

function montarCom(etapas, resultados, situacoes = {}) {
  const todas = Object.fromEntries(etapas.map((etapa) => [etapa.id, resultados[etapa.id]?.desfecho ?? 'aguardando']))
  return montar({ equipe, rodada, etapas, resultados, situacoes: { ...todas, ...situacoes }, agora })
}

test('PARTES e RESUMO: ordem e títulos da página', () => {
  assert.deepEqual(PARTES.map((parte) => parte.id), ['roteiro', 'declaracoes', 'nao_declarado', 'uso', 'ia', 'linha_do_tempo', 'origem', 'arquitetura', 'higiene'])
  assert.deepEqual(PARTES.map((parte) => parte.titulo), [
    'Roteiro de 2 minutos', 'Declarações da equipe', 'Usado e não declarado', 'Teste de uso', 'Uso de IA',
    'Linha do tempo', 'Origem do código', 'Arquitetura', 'Submissão e segredos',
  ])
  assert.deepEqual(RESUMO, [
    { chave: 'deploy', titulo: 'Deploy' },
    { chave: 'build', titulo: 'Build' },
    { chave: 'fluxo', titulo: 'Fluxo principal' },
    { chave: 'ia', titulo: 'IA no código' },
  ])
})

test('três contribuições para a mesma declaração se fundem, em ordem natural de id', () => {
  const etapas = [
    { id: 'promessas', titulo: 'Promessas', coluna: 'leitor' },
    etapaDe('promessas.conferido', (saida) => ({
      declaracoes: saida.ids.map((id) => ({ tipo: 'declaracao', id, citacao: `frase ${id}`, fonte, classe: 'funcionalidade' })),
    })),
    etapaDe('leitor.conferido', () => ({
      resumo: { ia: verificado() },
      declaracoes: [{ tipo: 'declaracao', id: 'P2', estado: 'confirmada', evidencias: [noCodigo], obs: null }],
    }), ['ia']),
    etapaDe('uso.conferido', () => ({
      resumo: { fluxo: verificado({ ate: 2, de: 5 }) },
      declaracoes: [{ tipo: 'declaracao', id: 'P2', no_uso: falhou('erro 500 ao gerar'), evidencias: [captura] }],
    }), ['fluxo']),
  ]
  const resultados = {
    'promessas.conferido': pronto('promessas.conferido', { ids: ['P10', 'P2', 'P1'], afirmacoes: [], descartadas: 2, motivos: { sem_prova: 2 }, fatos: {} }),
    'leitor.conferido': pronto('leitor.conferido', { afirmacoes: [], descartadas: 3, motivos: { sem_prova: 1, linguagem: 4 }, fatos: {} }),
    'uso.conferido': pronto('uso.conferido', { afirmacoes: [], descartadas: 0, motivos: {}, fatos: {} }),
    corte: pronto('corte', { sha: 'abc123', em: '2026-11-28T15:58:00-03:00' }),
  }

  const relatorio = montarCom(etapas, resultados, { promessas: 'pronto' })

  assert.deepEqual(relatorio.declaracoes.map((declaracao) => declaracao.id), ['P1', 'P2', 'P10'])
  assert.deepEqual(relatorio.declaracoes[1], {
    estado: 'confirmada',
    no_uso: falhou('erro 500 ao gerar'),
    evidencias: [noCodigo, captura],
    tipo: 'declaracao',
    id: 'P2',
    citacao: 'frase P2',
    fonte,
    classe: 'funcionalidade',
    obs: null,
  })
  assert.equal(relatorio.declaracoes[0].estado, null)
  assert.deepEqual(relatorio.resumo.fluxo, verificado({ ate: 2, de: 5 }))
  assert.deepEqual(relatorio.descartados, { total: 5, motivos: { sem_prova: 3, linguagem: 4 } })
  assert.deepEqual(relatorio.nao_verificado, [])
  assert.deepEqual(relatorio.equipe, { id: 'laudo-facil', nome: 'Laudo Fácil', track: 'Saúde', repo: 'https://github.com/ana/laudo', demo: null, video: null, resumo: 'Laudos em PDF' })
  assert.deepEqual(
    { horario: relatorio.geracao.horario, modo: relatorio.geracao.modo, commit: relatorio.geracao.commit, commit_em: relatorio.geracao.commit_em },
    { horario: '2026-11-28T18:05:00.000Z', modo: 'previa', commit: 'abc123', commit_em: '2026-11-28T15:58:00-03:00' },
  )
  assert.deepEqual(relatorio.geracao.etapas['leitor.conferido'], { titulo: 'Etapa leitor.conferido', coluna: 'fatos', situacao: 'pronto', relogio, parou_em: null, erro: null })
  validarRelatorio(relatorio)
})

test('o mesmo campo vindo de duas etapas lança', () => {
  const etapas = [
    etapaDe('leitor.conferido', () => ({ declaracoes: [{ tipo: 'declaracao', id: 'P1', estado: 'confirmada' }] })),
    etapaDe('uso.conferido', () => ({ declaracoes: [{ tipo: 'declaracao', id: 'P1', estado: 'contradita' }] })),
  ]
  const resultados = { 'leitor.conferido': pronto('leitor.conferido', {}), 'uso.conferido': pronto('uso.conferido', {}) }

  assert.throws(() => montarCom(etapas, resultados), /declaracoes.*estado.*P1.*leitor\.conferido.*uso\.conferido/)

  const doisResumos = [etapaDe('deploy', () => ({ resumo: { deploy: verificado() } }), ['deploy']), etapaDe('build', () => ({ resumo: { deploy: verificado() } }))]
  assert.throws(() => montarCom(doisResumos, { deploy: pronto('deploy', {}), build: pronto('build', {}) }), /resumo\.deploy.*deploy.*build/)
})

test('etapa que falhou ou estourou o tempo vira nao_verificado, nunca falhou do projeto', () => {
  const etapas = [
    etapaDe('corte', () => ({})),
    etapaDe('build', () => ({ resumo: { build: verificado() } }), ['build']),
    etapaDe('deploy', (saida) => ({ resumo: { deploy: saida.responde ? verificado() : falhou('não respondeu') } }), ['deploy']),
    etapaDe('uso.conferido', () => ({}), ['fluxo']),
    etapaDe('segredos', () => ({})),
  ]
  const resultados = {
    corte: semSucesso('corte', 'falhou', 'repositório não acessível'),
    build: semSucesso('build', 'falhou', 'dependência corte: repositório não acessível'),
    deploy: semSucesso('deploy', 'tempo_esgotado', null, 'capturando a página', { responde: true }),
    'uso.conferido': semSucesso('uso.conferido', 'tempo_esgotado', null, 'passo 3'),
    segredos: semSucesso('segredos', 'falhou', 'varredura quebrou'),
  }

  const relatorio = montarCom(etapas, resultados)

  assert.deepEqual(relatorio.nao_verificado, [
    { rotulo: 'Etapa corte', motivo: 'repositório não acessível', causa: 'etapa_falhou' },
    { rotulo: 'Etapa deploy', motivo: 'tempo esgotado em: capturando a página', causa: 'tempo_esgotado' },
    { rotulo: 'Etapa uso.conferido', motivo: 'tempo esgotado em: passo 3', causa: 'tempo_esgotado' },
    { rotulo: 'Etapa segredos', motivo: 'varredura quebrou', causa: 'etapa_falhou' },
  ])
  assert.equal(relatorio.resumo.build.estado, 'nao_testavel')
  assert.deepEqual(relatorio.resumo.deploy, verificado())
  assert.equal(relatorio.resumo.fluxo.estado, 'nao_testavel')
  assert.equal(JSON.stringify([relatorio.resumo, ...PARTES.map((parte) => relatorio[parte.id])]).includes('"falhou"'), false)
  assert.equal(relatorio.geracao.etapas.build.situacao, 'falhou')
  assert.equal(relatorio.geracao.commit, null)
  validarRelatorio(relatorio)
})

test('etapa sem envelope vira Pendente no resumo que possui e em_andamento em nao_verificado', () => {
  const etapas = [
    { id: 'leitor', titulo: 'Leitor de código', coluna: 'leitor' },
    etapaDe('leitor.conferido', () => ({ resumo: { ia: verificado() } }), ['ia']),
    etapaDe('deploy', () => ({ resumo: { deploy: verificado() } }), ['deploy']),
  ]

  const relatorio = montarCom(etapas, { deploy: pronto('deploy', {}) }, { leitor: 'rodando' })

  assert.deepEqual(relatorio.resumo, {
    deploy: verificado(),
    build: { estado: 'nao_informado' },
    fluxo: { estado: 'nao_informado' },
    ia: { estado: 'em_andamento', etapa: 'leitor.conferido' },
  })
  assert.deepEqual(relatorio.nao_verificado, [
    { rotulo: 'Leitor de código', motivo: 'a etapa está em execução', causa: 'em_andamento' },
    { rotulo: 'Etapa leitor.conferido', motivo: 'a etapa ainda não começou', causa: 'em_andamento' },
  ])
  validarRelatorio(relatorio)
})

test('relatar que lança não derruba o relatório; etapa pulada e de rodada relatam como as outras', () => {
  const etapas = [
    etapaDe('github', () => {
      throw new Error('campo ausente')
    }),
    etapaDe('build', (saida) => ({ resumo: { build: naoTestavel(saida.pulada) }, uso: [{ tipo: 'item', id: 'build:instalar', rotulo: 'Instalação', estado: naoTestavel(saida.pulada), evidencias: [] }] }), ['build']),
    etapaDe('copia', () => ({ origem: [{ tipo: 'item', id: 'copia:iguais', rotulo: 'Arquivos iguais a outras equipes', estado: verificado(), valor: 0, evidencias: [] }] })),
    etapaDe('uso.conferido', () => ({
      uso: [
        { tipo: 'passo', id: 'uso:passo-4', n: 4, acao: 'Enviar o exame', estado: naoTestavel('tempo de teste esgotado'), evidencias: [] },
        { tipo: 'item', id: 'uso:bloqueio-1', rotulo: 'Login com Google', estado: naoTestavel('exige conta de terceiro'), evidencias: [] },
      ],
      declaracoes: [{ tipo: 'declaracao', id: 'P1', citacao: 'Paga com cartão', no_uso: naoTestavel('exige pagamento real') }],
    })),
    etapaDe('fachada', () => ({ parte_inventada: [] })),
  ]
  const resultados = Object.fromEntries(['github', 'copia', 'uso.conferido', 'fachada'].map((id) => [id, pronto(id, {})]))
  resultados.build = pronto('build', { pulada: 'há deploy informado' })

  const relatorio = montarCom(etapas, resultados)

  assert.deepEqual(relatorio.nao_verificado, [
    { rotulo: 'Etapa github', motivo: 'não foi possível relatar: campo ausente', causa: 'etapa_falhou' },
    { rotulo: 'Etapa fachada', motivo: 'não foi possível relatar: parte desconhecida: parte_inventada', causa: 'etapa_falhou' },
    { rotulo: 'Paga com cartão', motivo: 'exige pagamento real', causa: 'bloqueio_externo' },
    { rotulo: 'Instalação', motivo: 'há deploy informado', causa: 'bloqueio_externo' },
    { rotulo: 'Enviar o exame', motivo: 'tempo de teste esgotado', causa: 'tempo_esgotado' },
    { rotulo: 'Login com Google', motivo: 'exige conta de terceiro', causa: 'bloqueio_externo' },
  ])
  assert.deepEqual(relatorio.uso.map((bloco) => bloco.id), ['build:instalar', 'uso:passo-4', 'uso:bloqueio-1'])
  assert.equal(relatorio.origem[0].id, 'copia:iguais')
  validarRelatorio(relatorio)
})

test('validarRelatorio: rejeita com o caminho do campo inválido', () => {
  const base = () =>
    montarCom(
      [etapaDe('leitor.conferido', () => ({ ia: [{ tipo: 'item', id: 'leitor:chamada-1', rotulo: 'Chamada', estado: verificado(), evidencias: [noCodigo] }], declaracoes: [{ tipo: 'declaracao', id: 'P1', estado: 'confirmada' }] }))],
      { 'leitor.conferido': pronto('leitor.conferido', {}) },
    )
  const alterado = (mudar) => {
    const relatorio = structuredClone(base())
    mudar(relatorio)
    return relatorio
  }

  validarRelatorio(base())
  assert.throws(() => validarRelatorio(alterado((r) => (r.ia[0].citacoes = [{ tipo: 'arquivo', caminho: 'a.js' }]))), /ia\[0\]\.citacoes/)
  assert.throws(() => validarRelatorio(alterado((r) => (r.higiene = null))), /higiene/)
  assert.throws(() => validarRelatorio(alterado((r) => (r.ia[0].tipo = 'nota'))), /ia\[0\]\.tipo/)
  assert.throws(() => validarRelatorio(alterado((r) => delete r.ia[0].id)), /ia\[0\]\.id/)
  assert.throws(() => validarRelatorio(alterado((r) => (r.ia[0].estado = { estado: 'aprovado' }))), /ia\[0\]\.estado/)
  assert.throws(() => validarRelatorio(alterado((r) => (r.declaracoes[0].estado = 'mentira'))), /declaracoes\[0\]\.estado/)
  assert.throws(() => validarRelatorio(alterado((r) => (r.declaracoes[0].no_uso = { estado: 'talvez' }))), /declaracoes\[0\]\.no_uso/)
  assert.throws(() => validarRelatorio(alterado((r) => delete r.ia[0].evidencias[0].conferida)), /ia\[0\]\.evidencias\[0\]\.conferida/)
  assert.throws(() => validarRelatorio(alterado((r) => (r.resumo.build = { estado: 'ok' }))), /resumo\.build/)
})
