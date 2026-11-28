/**
 * Instala, compila e sobe o projeto da equipe em container, a partir do commit
 * de corte. A imagem que sai daqui é a que o testador de uso sobe depois.
 */
import path from 'node:path'
import { CONFIG } from '../config.mjs'
import { falhou, naoTestavel, verificado } from '../dominio/estados.mjs'
import * as docker from '../ferramentas/docker.mjs'
import { etapa, exige, MINUTO, tolera } from '../nucleo/etapa.mjs'
import { detectarReceita, lerEnvExemplo } from './build/receitas.mjs'

const RAIZ = '/projeto'
const AMBIENTE_FIXO = { HOST: '0.0.0.0', HOSTNAME: '0.0.0.0', CI: '1' }
const LINHAS_DE_ERRO = 15

/**
 * @param {'instalar'|'compilar'} nome
 * @param {(pulso: (linha: string) => void) => Promise<boolean>} acao
 */
async function fase(nome, saida, ctx, acao) {
  const ultimas = []
  const pulso = (linha) => {
    ultimas.push(linha)
    if (ultimas.length > LINHAS_DE_ERRO) ultimas.shift()
    ctx.pulso(linha)
  }
  const inicio = Date.now()
  ctx.pulso(`[build] ${nome}`)
  const deuCerto = await acao(pulso)
  saida.duracao_ms[nome] = Date.now() - inicio
  if (!deuCerto) {
    saida.parou_em = nome
    saida.erro = ultimas.join('\n') || `a fase ${nome} terminou com erro e sem saída`
  }
  ctx.parcial({ ...saida })
  return deuCerto
}

async function prepararComDockerfile({ receita, codigo, imagem, saida, ctx }) {
  saida.instalou = await fase('instalar', saida, ctx, async (pulso) => {
    const { codigo: saiu } = await docker.construirImagem(path.join(codigo, receita.pasta), imagem, { id: ctx.equipe.id, pulso, sinal: ctx.sinal })
    return saiu === 0
  })
  if (saida.instalou) saida.imagem = imagem
}

/**
 * A imagem é gravada mesmo quando uma fase quebra: é nela que o testador segue
 * o README à mão.
 */
async function prepararNaImagemBase({ receita, codigo, imagem, exemplo, saida, ctx }) {
  const { sinal } = ctx
  const nome = docker.nomesDe(ctx.equipe.id).build
  const pasta = path.posix.join(RAIZ, receita.pasta)
  const comandos = (lista) => async (pulso) => {
    for (const comando of lista) {
      pulso(`$ ${comando}`)
      const { codigo: saiu } = await docker.executarNo(nome, comando, { pasta, pulso, sinal })
      if (saiu !== 0) return false
    }
    return true
  }

  await docker.criarContainer({ nome, id: ctx.equipe.id, imagem: CONFIG.imagens.base, comando: 'sleep infinity', env: saida.env, sinal })
  await docker.copiarPara(nome, codigo, RAIZ, { sinal })
  if (exemplo) {
    for (const arquivo of ['.env', '.env.local']) await docker.gravarArquivo(nome, `${pasta}/${arquivo}`, exemplo.conteudo, { sinal })
  }
  saida.instalou = await fase('instalar', saida, ctx, comandos(receita.instalar))
  if (saida.instalou && receita.compilar.length > 0) saida.compilou = await fase('compilar', saida, ctx, comandos(receita.compilar))
  await docker.consolidar(nome, imagem, { pasta, sinal })
  saida.imagem = imagem
}

const PREPAROS = { dockerfile: prepararComDockerfile, node: prepararNaImagemBase, python: prepararNaImagemBase }

async function provarSubida({ receita, imagem, saida, ctx }) {
  if (receita.tipo !== 'dockerfile' && receita.subir === null) {
    saida.parou_em = 'subir'
    saida.erro = 'nenhum comando de subida reconhecido nos arquivos do projeto'
    return
  }
  const inicio = Date.now()
  ctx.pulso('[build] subir')
  const instancia = await docker.subir({ imagem, id: ctx.equipe.id, comando: receita.subir, env: saida.env, pulso: ctx.pulso, sinal: ctx.sinal })
  try {
    saida.porta = instancia.porta
    saida.subiu = instancia.porta !== null
    if (!saida.subiu) {
      saida.parou_em = 'subir'
      saida.erro = (await instancia.log()).trimEnd().split('\n').slice(-LINHAS_DE_ERRO).join('\n') || 'o processo não abriu porta e não escreveu saída'
    }
  } finally {
    await instancia.parar()
    saida.duracao_ms.subir = Date.now() - inicio
  }
}

async function executar(ctx) {
  const { sha, codigo } = ctx.dep('corte').saida
  const receita = await detectarReceita(codigo)
  const saida = {
    imagem: null,
    receita: receita && { tipo: receita.tipo, instalar: receita.instalar, compilar: receita.compilar, subir: receita.subir, pasta: receita.pasta },
    instalou: false,
    compilou: null,
    subiu: false,
    porta: null,
    parou_em: null,
    erro: null,
    chaves_falsas: [],
    env: {},
    duracao_ms: { instalar: 0, compilar: 0, subir: 0 },
    comando_subir: receita?.subir ?? null,
    outras_pastas: receita?.outras_pastas ?? [],
  }
  if (!receita) {
    return { ...saida, parou_em: 'receita', erro: 'nenhum Dockerfile, package.json, requirements.txt ou pyproject.toml na raiz nem nas pastas de costume' }
  }

  const imagem = `rt-${ctx.equipe.id}:${sha.slice(0, 12)}`
  const exemplo = await lerEnvExemplo(path.join(codigo, receita.pasta))
  saida.chaves_falsas = exemplo?.chaves_falsas ?? []
  saida.env = { ...exemplo?.env, ...AMBIENTE_FIXO }
  try {
    await PREPAROS[receita.tipo]({ receita, codigo, imagem, exemplo, saida, ctx })
    if (saida.parou_em === null) await provarSubida({ receita, imagem, saida, ctx })
  } finally {
    await docker.desmontar(ctx.equipe.id)
  }
  return saida
}

const FASES = [
  { fase: 'instalar', id: 'build:instalacao', rotulo: 'Instalação', existe: () => true, feita: (saida) => saida.instalou },
  { fase: 'compilar', id: 'build:compilacao', rotulo: 'Compilação', existe: (saida) => saida.receita.compilar.length > 0, feita: (saida) => saida.compilou === true },
  { fase: 'subir', id: 'build:subida', rotulo: 'Subida local', existe: () => true, feita: (saida) => saida.subiu },
]

const ultimaLinha = (texto) => (texto ?? '').trimEnd().split('\n').pop() || 'sem saída'
const segundos = (ms) => `${Math.round(ms / 1000)} s`

function itemDaFase({ fase: nome, id, rotulo, feita }, saida) {
  const estado = feita(saida)
    ? verificado()
    : saida.parou_em === nome
      ? falhou(ultimaLinha(saida.erro))
      : naoTestavel(`o build parou em ${saida.parou_em}, antes desta fase`)
  const rodou = feita(saida) || saida.parou_em === nome
  return {
    tipo: 'item',
    id,
    rotulo,
    estado,
    ...(rodou ? { valor: segundos(saida.duracao_ms[nome]) } : {}),
    evidencias: [],
    obs: nome === 'subir' && saida.subiu ? `porta ${saida.porta}, comando: ${saida.comando_subir ?? 'o padrão da imagem da equipe'}` : null,
  }
}

function relatar(saida) {
  if (saida.pulada !== undefined) return { resumo: { build: naoTestavel(saida.pulada) } }
  if (saida.parou_em === 'receita') return { resumo: { build: naoTestavel(saida.erro) } }

  const uso = FASES.filter(({ existe }) => existe(saida)).map((linha) => itemDaFase(linha, saida))
  if (saida.chaves_falsas.length > 0) {
    uso.push({
      tipo: 'item',
      id: 'build:chaves-falsas',
      rotulo: 'Variáveis preenchidas com valor falso',
      estado: naoTestavel('o teste local roda sem as chaves reais da equipe'),
      valor: { lista: saida.chaves_falsas },
      evidencias: [],
    })
  }
  if (saida.outras_pastas.length > 0) {
    uso.push({
      tipo: 'item',
      id: 'build:outras-pastas',
      rotulo: 'Pastas com manifesto que não foram executadas',
      estado: naoTestavel(`o build automático executa uma pasta por projeto; a executada foi ${saida.receita.pasta === '.' ? 'a raiz' : saida.receita.pasta}`),
      valor: { lista: saida.outras_pastas },
      evidencias: [],
    })
  }
  const build = saida.parou_em === null ? verificado() : falhou(`parou em ${saida.parou_em}: ${ultimaLinha(saida.erro)}`)
  return { resumo: { build }, uso }
}

export default etapa({
  id: 'build',
  titulo: 'Build',
  coluna: 'build',
  fila: 'containers',
  versao: 1,
  teto: { inatividade: 5 * MINUTO },
  depende: {
    corte: exige((corte) => ({ sha: corte.sha, codigo: corte.codigo })),
    deploy: tolera((deploy) => deploy?.responde ?? null),
  },
  entradas: (_equipe, rodada) => ({ build: rodada.opcoes.build }),
  resumo: ['build'],
  pular(ctx) {
    const { build } = ctx.rodada.opcoes
    if (build === 'nenhum') return 'não executado: build desligado nesta rodada'
    if (build === 'sem-deploy' && ctx.dep('deploy').saida?.responde) return 'não executado nesta rodada: o deploy da equipe responde'
    return null
  },
  valeAinda: async (saida) => saida.pulada !== undefined || saida.imagem === null || docker.imagemExiste(saida.imagem),
  executar,
  relatar,
})
