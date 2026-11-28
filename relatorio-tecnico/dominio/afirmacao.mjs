/**
 * Tudo que um agent pode afirmar. Cada tipo define seus campos, quanta prova
 * precisa para sobreviver ao conferidor e quais campos são texto livre sujeito
 * à trava de linguagem. O schema de saída dos agents e a regra do conferidor
 * derivam desta tabela.
 */
import { ESTADO_DECLARACAO, RESULTADO_USO } from './estados.mjs'

const texto = { type: 'string' }
const textoOuNulo = { type: ['string', 'null'] }
const lista = { type: 'array', items: { type: 'string' } }
const umDe = (valores) => ({ type: 'string', enum: [...valores] })

/**
 * @typedef {object} TipoAfirmacao
 * @property {string} agente        etapa que pode emitir este tipo
 * @property {string} descricao     entra no prompt do agent
 * @property {Record<string, object>} campos   JSON Schema de cada campo de `dados`
 * @property {string[]} obrigatorios
 * @property {string[]} livres      campos de texto livre que passam pela trava de linguagem
 * @property {(dados: Record<string, any>) => {minimo: number, tipos: string[]}} prova
 *   quantas citações conferidas, e de quais tipos, a afirmação precisa
 */

/** @type {Readonly<Record<string, TipoAfirmacao>>} */
export const TIPOS_AFIRMACAO = Object.freeze({
  promessa: {
    agente: 'promessas',
    descricao: 'Uma afirmação verificável que a equipe fez sobre o projeto. `citacao` é a frase literal, copiada sem alterar. A citação aponta para o arquivo e a linha, ou para o texto do formulário.',
    campos: { citacao: texto, classe: umDe(['funcionalidade', 'tecnologia', 'resultado']) },
    obrigatorios: ['citacao', 'classe'],
    livres: [],
    prova: () => ({ minimo: 1, tipos: ['arquivo', 'formulario'] }),
  },
  fluxo_principal: {
    agente: 'promessas',
    descricao: 'O caminho principal de uso que a equipe descreve, em passos curtos, para orientar o teste. No máximo uma.',
    campos: { descricao: texto, passos: lista },
    obrigatorios: ['descricao', 'passos'],
    livres: ['descricao'],
    prova: () => ({ minimo: 1, tipos: ['arquivo', 'formulario'] }),
  },
  declaracao: {
    agente: 'leitor',
    descricao: 'O que o código mostra sobre uma promessa. `promessa` é o id da promessa. `observacao` é uma linha factual.',
    campos: {
      promessa: texto,
      estado: umDe(Object.keys(ESTADO_DECLARACAO)),
      observacao: textoOuNulo,
      existe: textoOuNulo,
      falta: textoOuNulo,
      o_que_faz: textoOuNulo,
      onde_procurou: lista,
    },
    obrigatorios: ['promessa', 'estado'],
    livres: ['observacao', 'existe', 'falta', 'o_que_faz'],
    prova: (dados) => ({ minimo: ESTADO_DECLARACAO[dados.estado]?.prova === 'codigo' ? 1 : 0, tipos: ['arquivo'] }),
  },
  chamada_ia: {
    agente: 'leitor',
    descricao: 'Um ponto do código que chama um modelo ou serviço de IA.',
    campos: { provedor: texto, modelo: textoOuNulo, finalidade: textoOuNulo },
    obrigatorios: ['provedor'],
    livres: ['finalidade'],
    prova: () => ({ minimo: 1, tipos: ['arquivo'] }),
  },
  resposta_fixa: {
    agente: 'leitor',
    descricao: 'Um ponto em que o código devolve texto ou dado fixo onde a equipe descreve resposta gerada.',
    campos: { descricao: texto },
    obrigatorios: ['descricao'],
    livres: ['descricao'],
    prova: () => ({ minimo: 1, tipos: ['arquivo'] }),
  },
  nao_declarado: {
    agente: 'leitor',
    descricao: 'Biblioteca, modelo ou serviço externo que o código usa e que nenhum texto da equipe menciona.',
    campos: { nome: texto, classe: umDe(['biblioteca', 'modelo', 'servico']) },
    obrigatorios: ['nome', 'classe'],
    livres: [],
    prova: () => ({ minimo: 1, tipos: ['arquivo'] }),
  },
  componente: {
    agente: 'leitor',
    descricao: 'Um componente real da arquitetura, com seu papel e os arquivos principais.',
    campos: { nome: texto, papel: texto, arquivos: lista },
    obrigatorios: ['nome', 'papel'],
    livres: ['papel'],
    prova: () => ({ minimo: 1, tipos: ['arquivo'] }),
  },
  diferenca_arquitetura: {
    agente: 'leitor',
    descricao: 'Uma diferença entre a arquitetura descrita pela equipe e a encontrada no código.',
    campos: { descrito: texto, encontrado: texto },
    obrigatorios: ['descrito', 'encontrado'],
    livres: ['encontrado'],
    prova: () => ({ minimo: 1, tipos: ['arquivo', 'formulario'] }),
  },
  passo_uso: {
    agente: 'uso',
    descricao: 'Um passo do fluxo principal executado no produto, com o que foi observado. Cada passo executado tem uma captura.',
    campos: {
      n: { type: 'integer' },
      acao: texto,
      observado: textoOuNulo,
      resultado: umDe(RESULTADO_USO),
      erro: textoOuNulo,
      motivo: textoOuNulo,
    },
    obrigatorios: ['n', 'acao', 'resultado'],
    livres: ['observado', 'erro', 'motivo'],
    prova: (dados) => ({ minimo: dados.resultado === 'nao_testavel' ? 0 : 1, tipos: ['captura'] }),
  },
  entrada_inesperada: {
    agente: 'uso',
    descricao: 'Um teste com entrada fora do esperado: campo vazio, texto muito longo, arquivo errado.',
    campos: { entrada: texto, observado: texto, resultado: umDe(RESULTADO_USO) },
    obrigatorios: ['entrada', 'observado', 'resultado'],
    livres: ['observado'],
    prova: () => ({ minimo: 1, tipos: ['captura'] }),
  },
  promessa_no_uso: {
    agente: 'uso',
    descricao: 'O que aconteceu ao exercitar, no produto, a funcionalidade de uma promessa. `promessa` é o id da promessa.',
    campos: { promessa: texto, resultado: umDe(RESULTADO_USO), erro: textoOuNulo, motivo: textoOuNulo },
    obrigatorios: ['promessa', 'resultado'],
    livres: ['erro', 'motivo'],
    prova: (dados) => ({ minimo: dados.resultado === 'nao_testavel' ? 0 : 1, tipos: ['captura'] }),
  },
  bloqueio: {
    agente: 'uso',
    descricao: 'Algo que não foi possível testar por bloqueio externo: login por terceiro, pagamento, telefone ou e-mail real, arquivo que não temos, chave ausente.',
    campos: { item: texto, motivo: texto },
    obrigatorios: ['item', 'motivo'],
    livres: ['motivo'],
    prova: () => ({ minimo: 0, tipos: ['captura'] }),
  },
})

/**
 * JSON Schema da saída de um agent: um objeto com uma lista por tipo pedido.
 * Cada elemento traz os campos do tipo e `citacoes`. Sem `anyOf`.
 * @param {string[]} tipos chaves de TIPOS_AFIRMACAO
 * @returns {object}
 */
export function esquemaPara(tipos) {
  const properties = {}
  for (const tipo of tipos) {
    const definicao = definicaoDe(tipo)
    properties[tipo] = {
      type: 'array',
      items: {
        type: 'object',
        properties: { ...definicao.campos, citacoes: { type: 'array', items: ESQUEMA_CITACAO } },
        required: [...definicao.obrigatorios, 'citacoes'],
        additionalProperties: false,
      },
    }
  }
  return { type: 'object', properties, required: [...tipos], additionalProperties: false }
}

const TIPOS_CITACAO = ['arquivo', 'formulario', 'captura', 'url', 'log']

const ESQUEMA_CITACAO = Object.freeze({
  type: 'object',
  properties: {
    tipo: umDe(TIPOS_CITACAO),
    caminho: texto,
    linha: { type: ['integer', 'null'] },
    linha_fim: { type: ['integer', 'null'] },
    trecho: textoOuNulo,
  },
  required: ['tipo', 'caminho'],
  additionalProperties: false,
})

function definicaoDe(tipo) {
  const definicao = TIPOS_AFIRMACAO[tipo]
  if (!definicao) throw new Error(`tipo de afirmação desconhecido: ${tipo}`)
  return definicao
}

const prefixoDoId = (tipo) => (tipo === 'promessa' ? 'P' : `${tipo}-`)

/**
 * Transforma a saída estruturada do agent (um objeto com uma lista por tipo) em
 * `AfirmacaoBruta[]`. O id é `<prefixo><posição>`: `P1`, `P2` para promessas;
 * `<tipo>-1`, `<tipo>-2` para os demais.
 * @param {Record<string, any[]>} saida
 * @param {string[]} tipos
 * @returns {import('./tipos.mjs').AfirmacaoBruta[]}
 */
export function achatar(saida, tipos) {
  const afirmacoes = []
  for (const tipo of tipos) {
    const elementos = Array.isArray(saida?.[tipo]) ? saida[tipo] : []
    elementos.forEach((elemento, indice) => {
      if (!elemento || typeof elemento !== 'object') return
      const { citacoes, ...dados } = elemento
      afirmacoes.push({
        id: `${prefixoDoId(tipo)}${indice + 1}`,
        tipo,
        dados,
        citacoes: Array.isArray(citacoes) ? citacoes : [],
      })
    })
  }
  return afirmacoes
}

/**
 * @param {string[]} tipos
 * @returns {string}
 */
export function descreverTipos(tipos) {
  return tipos
    .map((tipo) => {
      const definicao = definicaoDe(tipo)
      const linhas = [`### ${tipo}`, definicao.descricao, 'Campos:']
      for (const [campo, esquema] of Object.entries(definicao.campos)) {
        const exigencia = definicao.obrigatorios.includes(campo) ? 'obrigatório' : 'opcional'
        linhas.push(`- \`${campo}\` (${descreverCampo(esquema)}, ${exigencia})`)
      }
      linhas.push(...descreverProva(definicao))
      if (tipo === 'declaracao') linhas.push(...descreverExigenciasDoEstado())
      return linhas.join('\n')
    })
    .join('\n\n')
}

function descreverCampo(esquema) {
  if (esquema.enum) return `um de: ${esquema.enum.join(', ')}`
  if (esquema.type === 'array') return 'lista de textos'
  if (esquema.type === 'integer') return 'número inteiro'
  return Array.isArray(esquema.type) ? 'texto ou null' : 'texto'
}

const descreverExigencia = ({ minimo, tipos }) =>
  minimo === 0 ? 'nenhuma citação é exigida' : `ao menos ${minimo} citação de tipo ${tipos.join(' ou ')}`

/** A prova pode depender de um campo de enumeração (`estado`, `resultado`); nesse caso descreve valor por valor. */
function descreverProva(definicao) {
  for (const [campo, esquema] of Object.entries(definicao.campos)) {
    if (!esquema.enum) continue
    const porValor = esquema.enum.map((valor) => [valor, descreverExigencia(definicao.prova({ [campo]: valor }))])
    if (new Set(porValor.map(([, exigencia]) => exigencia)).size > 1) {
      return ['Prova, em `citacoes`:', ...porValor.map(([valor, exigencia]) => `- \`${campo}\` = ${valor}: ${exigencia}`)]
    }
  }
  return [`Prova, em \`citacoes\`: ${descreverExigencia(definicao.prova({}))}.`]
}

function descreverExigenciasDoEstado() {
  return Object.entries(ESTADO_DECLARACAO)
    .filter(([, estado]) => estado.exige.length > 0)
    .map(([nome, estado]) => `- \`estado\` = ${nome} exige preencher: ${estado.exige.join(', ')}`)
}
