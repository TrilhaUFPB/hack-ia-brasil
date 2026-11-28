/**
 * A regra central do produto: nada dito por agent chega à página sem prova
 * aberta e conferida. Único produtor de `Afirmacao`.
 */
import { TIPOS_AFIRMACAO } from '../dominio/afirmacao.mjs'
import { ESTADO_DECLARACAO } from '../dominio/estados.mjs'
import { conferirCitacao } from '../dominio/evidencia.mjs'
import { revisar } from '../dominio/linguagem.mjs'

/** @typedef {import('../dominio/tipos.mjs').Conferido} Conferido */
/** @typedef {import('../dominio/tipos.mjs').Fontes} Fontes */

const vazio = (valor) =>
  valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '') || (Array.isArray(valor) && valor.length === 0)

const TIPO_JSON = Object.freeze({
  string: (valor) => typeof valor === 'string',
  integer: (valor) => Number.isInteger(valor),
  array: (valor) => Array.isArray(valor) && valor.every((elemento) => typeof elemento === 'string'),
  null: (valor) => valor === null,
})

function campoValido(esquema, valor) {
  if (esquema.enum) return esquema.enum.includes(valor)
  return [esquema.type].flat().some((tipo) => TIPO_JSON[tipo]?.(valor))
}

async function evidenciasValidas(citacoes, fontes) {
  const conferidas = await Promise.all(citacoes.map((citacao) => conferirCitacao(citacao, fontes)))
  return conferidas.filter(Boolean)
}

/**
 * @returns {Promise<{afirmacao: import('../dominio/tipos.mjs').Afirmacao, reprovados: number} | {motivo: string}>}
 */
async function conferirUma(bruta, fontes) {
  const definicao = Object.hasOwn(TIPOS_AFIRMACAO, bruta?.tipo) ? TIPOS_AFIRMACAO[bruta.tipo] : null
  if (!definicao) return { motivo: 'tipo_desconhecido' }

  const recebidos = bruta.dados && typeof bruta.dados === 'object' ? bruta.dados : {}
  // Só os campos da tabela passam: campo extra seria texto de agent fora da trava de linguagem.
  const dados = {}
  for (const campo of Object.keys(definicao.campos)) {
    if (recebidos[campo] !== undefined) dados[campo] = recebidos[campo]
  }

  if (definicao.obrigatorios.some((campo) => vazio(dados[campo]))) return { motivo: 'campo_obrigatorio' }
  for (const [campo, valor] of Object.entries(dados)) {
    if (!campoValido(definicao.campos[campo], valor)) return { motivo: 'campo_invalido' }
  }

  const citacoes = Array.isArray(bruta.citacoes) ? bruta.citacoes : []
  const prova = definicao.prova(dados)
  let evidencias = await evidenciasValidas(citacoes, fontes)

  // A frase da equipe é procurada inteira em cada fonte citada; achada, ela é a prova e a evidência aponta para onde ela está.
  const ondeAFraseEsta =
    bruta.tipo === 'promessa'
      ? await evidenciasValidas(
          citacoes
            .filter((citacao) => prova.tipos.includes(citacao?.tipo))
            .map((citacao) => ({ tipo: citacao.tipo, caminho: citacao.caminho, linha: citacao.linha, trecho: dados.citacao })),
          fontes,
        )
      : null
  if (ondeAFraseEsta?.length) evidencias = ondeAFraseEsta
  else {
    const aceitas = evidencias.filter((evidencia) => prova.tipos.includes(evidencia.tipo))
    if (aceitas.length < prova.minimo) return { motivo: 'sem_prova' }
    if (ondeAFraseEsta) return { motivo: 'citacao_nao_literal' }
  }

  if (bruta.tipo === 'declaracao' && ESTADO_DECLARACAO[dados.estado].exige.some((campo) => vazio(dados[campo]))) {
    return { motivo: 'campo_do_estado' }
  }

  let reprovados = 0
  for (const campo of definicao.livres) {
    if (typeof dados[campo] === 'string' && !revisar(dados[campo]).ok) {
      dados[campo] = null
      reprovados++
    }
  }

  return { afirmacao: { id: String(bruta.id), tipo: bruta.tipo, dados, evidencias }, reprovados }
}

/**
 * @param {import('../dominio/tipos.mjs').SaidaAgente|null|undefined} saidaAgente
 * @param {Fontes} fontes
 * @returns {Promise<Conferido>}
 */
export async function conferir(saidaAgente, fontes) {
  /** @type {Conferido} */
  const conferido = { afirmacoes: [], descartadas: 0, motivos: {}, fatos: saidaAgente?.fatos ?? {} }
  const contar = (motivo, quantos = 1) => {
    conferido.motivos[motivo] = (conferido.motivos[motivo] ?? 0) + quantos
  }

  const brutas = Array.isArray(saidaAgente?.afirmacoes) ? saidaAgente.afirmacoes : []
  const resultados = await Promise.all(brutas.map((bruta) => conferirUma(bruta, fontes)))
  for (const resultado of resultados) {
    if ('motivo' in resultado) {
      conferido.descartadas++
      contar(resultado.motivo)
      continue
    }
    conferido.afirmacoes.push(resultado.afirmacao)
    if (resultado.reprovados > 0) contar('linguagem', resultado.reprovados)
  }
  return conferido
}
