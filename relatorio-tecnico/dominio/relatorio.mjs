/**
 * O formato fixo do relatório de uma equipe e a montagem dele a partir das
 * contribuições das etapas. `montar` é pura: recebe os envelopes e a hora.
 */
import { isDeepStrictEqual } from 'node:util'
import { ESTADO_DECLARACAO, ESTADO_ITEM, naoInformado, naoTestavel } from './estados.mjs'

/** @typedef {import('./tipos.mjs').Relatorio} Relatorio */
/** @typedef {import('./tipos.mjs').Bloco} Bloco */

export const FORMATO = 1

/** Na ordem da página. */
export const PARTES = Object.freeze([
  { id: 'roteiro', titulo: 'Roteiro de 2 minutos' },
  { id: 'declaracoes', titulo: 'Declarações da equipe' },
  { id: 'nao_declarado', titulo: 'Usado e não declarado' },
  { id: 'uso', titulo: 'Teste de uso' },
  { id: 'ia', titulo: 'Uso de IA' },
  { id: 'linha_do_tempo', titulo: 'Linha do tempo' },
  { id: 'origem', titulo: 'Origem do código' },
  { id: 'arquitetura', titulo: 'Arquitetura' },
  { id: 'higiene', titulo: 'Submissão e segredos' },
])

export const RESUMO = Object.freeze([
  { chave: 'deploy', titulo: 'Deploy' },
  { chave: 'build', titulo: 'Build' },
  { chave: 'fluxo', titulo: 'Fluxo principal' },
  { chave: 'ia', titulo: 'IA no código' },
])

const TIPOS_DE_BLOCO = new Set(['item', 'declaracao', 'passo'])
const IDS_DAS_PARTES = new Set(PARTES.map((parte) => parte.id))
const CHAVES_DO_RESUMO = new Set(RESUMO.map((entrada) => entrada.chave))
const EM_CURSO = new Set(['aguardando', 'rodando'])
const MOTIVO_EM_CURSO = { aguardando: 'a etapa ainda não começou', rodando: 'a etapa está em execução' }

const ehObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor)

function exigirContribuicao(contribuicao) {
  if (!ehObjeto(contribuicao)) throw new Error('relatar não devolveu um objeto')
  for (const [chave, valor] of Object.entries(contribuicao)) {
    if (valor === undefined) continue
    if (chave === 'resumo') {
      if (!ehObjeto(valor)) throw new Error('resumo não é um objeto')
      for (const chaveDoResumo of Object.keys(valor)) {
        if (!CHAVES_DO_RESUMO.has(chaveDoResumo)) throw new Error(`resumo.${chaveDoResumo} não existe`)
      }
      continue
    }
    if (!IDS_DAS_PARTES.has(chave)) throw new Error(`parte desconhecida: ${chave}`)
    if (!Array.isArray(valor)) throw new Error(`${chave} não é uma lista`)
    valor.forEach((bloco, i) => {
      if (!ehObjeto(bloco) || typeof bloco.id !== 'string' || !TIPOS_DE_BLOCO.has(bloco.tipo)) {
        throw new Error(`${chave}[${i}] precisa de tipo conhecido e id`)
      }
    })
  }
}

/**
 * Funde um bloco no que já existe com o mesmo id. Evidências se somam; null e
 * undefined significam "esta etapa não informou"; dois valores diferentes para o
 * mesmo campo são erro de quem escreveu as etapas.
 */
function fundir(existente, bloco, parte, etapa) {
  for (const [campo, valor] of Object.entries(bloco)) {
    if (valor === undefined) continue
    if (valor === null) {
      existente.bloco[campo] ??= null
      continue
    }
    const atual = existente.bloco[campo]
    if (atual === undefined || atual === null) {
      existente.bloco[campo] = valor
      existente.origem[campo] = etapa
      continue
    }
    if (campo === 'evidencias' && Array.isArray(atual) && Array.isArray(valor)) {
      existente.bloco.evidencias = [...atual, ...valor]
      continue
    }
    if (!isDeepStrictEqual(atual, valor)) {
      throw new Error(`${parte}: o campo ${campo} do bloco ${bloco.id} veio de duas etapas, ${existente.origem[campo]} e ${etapa}`)
    }
  }
}

const compararIds = new Intl.Collator('pt-BR', { numeric: true }).compare

const PADRAO_DA_DECLARACAO = { estado: null, no_uso: null, evidencias: [] }

const rotuloDoBloco = (bloco) => bloco.rotulo ?? bloco.acao ?? bloco.citacao ?? bloco.id

function estadosDeItem(bloco) {
  return bloco.tipo === 'declaracao' ? [bloco.no_uso] : [bloco.estado]
}

/**
 * @param {object} p
 * @param {import('./tipos.mjs').Equipe} p.equipe
 * @param {import('./tipos.mjs').Rodada} p.rodada
 * @param {{id: string, titulo: string, coluna: string, resumo?: string[], relatar?: (saida: any, equipe: any) => import('./tipos.mjs').Contribuicao}[]} p.etapas
 * @param {Record<string, import('../nucleo/etapa.mjs').Resultado<any>>} p.resultados só das etapas com envelope publicável
 * @param {Record<string, string>} p.situacoes
 * @param {Date} p.agora
 * @returns {Relatorio}
 */
export function montar({ equipe, rodada, etapas, resultados, situacoes, agora }) {
  const situacaoDe = (id) => resultados[id]?.desfecho ?? situacoes?.[id] ?? 'aguardando'

  /** @type {Relatorio['nao_verificado']} */
  const naoVerificado = []
  const resumo = {}
  const donaDoResumo = {}
  const relatoFalhou = new Set()
  /** @type {Record<string, Map<string, {bloco: Record<string, any>, origem: Record<string, string>}>>} */
  const partes = Object.fromEntries(PARTES.map((parte) => [parte.id, new Map()]))

  for (const etapa of etapas) {
    const resultado = resultados[etapa.id]
    const situacao = situacaoDe(etapa.id)

    if (situacao !== 'pronto') {
      const dependencia = /^dependência ([^:]+):/.exec(resultado?.erro ?? '')?.[1]
      // Uma etapa que caiu derruba todas as que a exigem; só a origem entra na lista.
      const repetida = dependencia !== undefined && etapas.some((outra) => outra.id === dependencia) && situacaoDe(dependencia) !== 'pronto'
      if (!repetida) {
        if (EM_CURSO.has(situacao)) naoVerificado.push({ rotulo: etapa.titulo, motivo: MOTIVO_EM_CURSO[situacao], causa: 'em_andamento' })
        else if (situacao === 'tempo_esgotado') {
          naoVerificado.push({ rotulo: etapa.titulo, motivo: resultado?.parou_em ? `tempo esgotado em: ${resultado.parou_em}` : 'tempo esgotado', causa: 'tempo_esgotado' })
        } else naoVerificado.push({ rotulo: etapa.titulo, motivo: resultado?.erro ?? 'a etapa falhou', causa: 'etapa_falhou' })
      }
    }

    if (!etapa.relatar || resultado?.saida === null || resultado?.saida === undefined) continue

    let contribuicao
    try {
      contribuicao = etapa.relatar(resultado.saida, equipe)
      exigirContribuicao(contribuicao)
    } catch (erro) {
      relatoFalhou.add(etapa.id)
      naoVerificado.push({ rotulo: etapa.titulo, motivo: `não foi possível relatar: ${erro?.message ?? erro}`, causa: 'etapa_falhou' })
      continue
    }

    for (const [chave, estado] of Object.entries(contribuicao.resumo ?? {})) {
      if (estado === undefined || estado === null) continue
      if (chave in resumo) throw new Error(`resumo.${chave} veio de duas etapas, ${donaDoResumo[chave]} e ${etapa.id}`)
      resumo[chave] = estado
      donaDoResumo[chave] = etapa.id
    }
    for (const parte of PARTES) {
      for (const bloco of contribuicao[parte.id] ?? []) {
        const blocos = partes[parte.id]
        if (!blocos.has(bloco.id)) blocos.set(bloco.id, { bloco: {}, origem: {} })
        fundir(blocos.get(bloco.id), bloco, parte.id, etapa.id)
      }
    }
  }

  for (const { chave } of RESUMO) {
    if (chave in resumo) continue
    const dona = etapas.find((etapa) => etapa.resumo?.includes(chave))
    const situacao = dona ? situacaoDe(dona.id) : null
    if (!dona) resumo[chave] = naoInformado()
    else if (EM_CURSO.has(situacao)) resumo[chave] = { estado: 'em_andamento', etapa: dona.id }
    else if (situacao === 'tempo_esgotado') resumo[chave] = naoTestavel(`tempo esgotado na etapa ${dona.titulo}`)
    else if (situacao === 'falhou' || relatoFalhou.has(dona.id)) resumo[chave] = naoTestavel(`a etapa ${dona.titulo} não terminou`)
    else resumo[chave] = naoInformado()
  }

  const listas = {}
  for (const parte of PARTES) {
    let blocos = [...partes[parte.id].values()].map(({ bloco }) => (bloco.tipo === 'declaracao' ? { ...PADRAO_DA_DECLARACAO, ...bloco } : bloco))
    if (parte.id === 'declaracoes') blocos = blocos.sort((a, b) => compararIds(a.id, b.id))
    listas[parte.id] = blocos

    for (const bloco of blocos) {
      for (const estado of estadosDeItem(bloco)) {
        if (estado?.estado !== 'nao_testavel') continue
        const motivo = String(estado.motivo ?? 'motivo não informado')
        naoVerificado.push({ rotulo: String(rotuloDoBloco(bloco)), motivo, causa: /^tempo/i.test(motivo) ? 'tempo_esgotado' : 'bloqueio_externo' })
      }
    }
  }

  const descartados = { total: 0, motivos: {} }
  for (const resultado of Object.values(resultados)) {
    const saida = resultado?.saida
    if (typeof saida?.descartadas !== 'number' || !ehObjeto(saida.motivos)) continue
    descartados.total += saida.descartadas
    for (const [motivo, quantos] of Object.entries(saida.motivos)) descartados.motivos[motivo] = (descartados.motivos[motivo] ?? 0) + quantos
  }

  const corte = resultados.corte?.saida
  return {
    formato: FORMATO,
    equipe: {
      id: equipe.id,
      nome: equipe.nome,
      track: equipe.track ?? null,
      repo: equipe.repo?.url ?? null,
      demo: equipe.demo ?? null,
      video: equipe.video ?? null,
      resumo: equipe.resumo ?? null,
    },
    geracao: {
      horario: agora.toISOString(),
      modo: rodada.modo,
      janela: rodada.janela,
      commit: corte?.sha ?? null,
      commit_em: corte?.em ?? null,
      etapas: Object.fromEntries(
        etapas.map((etapa) => [
          etapa.id,
          {
            titulo: etapa.titulo,
            coluna: etapa.coluna,
            situacao: situacaoDe(etapa.id),
            relogio: resultados[etapa.id]?.relogio ?? null,
            parou_em: resultados[etapa.id]?.parou_em ?? null,
            erro: resultados[etapa.id]?.erro ?? null,
          },
        ]),
      ),
    },
    resumo: Object.fromEntries(RESUMO.map(({ chave }) => [chave, resumo[chave]])),
    ...listas,
    nao_verificado: naoVerificado,
    descartados,
  }
}

function falha(caminho, problema) {
  throw new Error(`relatório inválido em ${caminho}: ${problema}`)
}

function validarEstadoItem(estado, caminho) {
  if (!ehObjeto(estado) || !Object.hasOwn(ESTADO_ITEM, estado.estado)) falha(caminho, 'não é um dos quatro estados de item')
}

function validarEvidencia(evidencia, caminho) {
  if (!ehObjeto(evidencia)) falha(caminho, 'evidência não é um objeto')
  if (evidencia.conferida !== 'script' && evidencia.conferida !== 'conferidor') falha(`${caminho}.conferida`, 'evidência sem conferência')
}

function validarBloco(bloco, caminho) {
  if (!ehObjeto(bloco)) falha(caminho, 'bloco não é um objeto')
  if (!TIPOS_DE_BLOCO.has(bloco.tipo)) falha(`${caminho}.tipo`, `tipo de bloco desconhecido: ${bloco.tipo}`)
  if (typeof bloco.id !== 'string' || bloco.id === '') falha(`${caminho}.id`, 'bloco sem id')
  if ('citacoes' in bloco) falha(`${caminho}.citacoes`, 'citação de agent não conferida não pode chegar ao relatório')

  if (bloco.tipo === 'declaracao') {
    if (bloco.estado !== null && bloco.estado !== undefined && !Object.hasOwn(ESTADO_DECLARACAO, bloco.estado)) {
      falha(`${caminho}.estado`, 'não é um dos cinco estados de declaração nem null')
    }
    if (bloco.no_uso !== null && bloco.no_uso !== undefined) validarEstadoItem(bloco.no_uso, `${caminho}.no_uso`)
    if (bloco.fonte !== null && bloco.fonte !== undefined) validarEvidencia(bloco.fonte, `${caminho}.fonte`)
  } else if (bloco.tipo === 'item' || (bloco.estado !== null && bloco.estado !== undefined)) {
    validarEstadoItem(bloco.estado, `${caminho}.estado`)
  }

  if (bloco.evidencias !== undefined) {
    if (!Array.isArray(bloco.evidencias)) falha(`${caminho}.evidencias`, 'não é uma lista')
    bloco.evidencias.forEach((evidencia, i) => validarEvidencia(evidencia, `${caminho}.evidencias[${i}]`))
  }
}

/**
 * Lança com o caminho do campo inválido. Última barreira antes de gravar
 * `relatorio.json`.
 * @param {Relatorio} relatorio
 */
export function validarRelatorio(relatorio) {
  if (!ehObjeto(relatorio)) falha('relatorio', 'não é um objeto')
  for (const { id } of PARTES) {
    if (!Array.isArray(relatorio[id])) falha(id, 'não é uma lista')
    relatorio[id].forEach((bloco, i) => validarBloco(bloco, `${id}[${i}]`))
  }
  if (!ehObjeto(relatorio.resumo)) falha('resumo', 'não é um objeto')
  for (const { chave } of RESUMO) {
    const estado = relatorio.resumo[chave]
    if (estado?.estado === 'em_andamento' && typeof estado.etapa === 'string') continue
    validarEstadoItem(estado, `resumo.${chave}`)
  }
  if (!Array.isArray(relatorio.nao_verificado)) falha('nao_verificado', 'não é uma lista')
  if (!ehObjeto(relatorio.descartados) || typeof relatorio.descartados.total !== 'number') falha('descartados', 'falta o total')
}
