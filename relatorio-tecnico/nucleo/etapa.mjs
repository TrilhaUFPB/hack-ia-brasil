/**
 * A declaração de uma etapa. Um arquivo em `etapas/` é uma etapa: ele traz a
 * chave, a fila, o teto de tempo e a fatia do relatório que lhe pertence.
 */

/** Colunas da tabela do terminal. `conferidor` e `relatorio` são derivadas pelo orquestrador. */
export const COLUNAS = Object.freeze(['fatos', 'build', 'leitor', 'uso'])

export const FILAS = Object.freeze(['scripts', 'agentes', 'containers'])

export const SEGUNDO = 1000
export const MINUTO = 60 * SEGUNDO

/**
 * O que aconteceu com a NOSSA checagem. Nunca descreve o projeto da equipe.
 * @typedef {'pronto'|'falhou'|'tempo_esgotado'} Desfecho
 */

/**
 * Envelope em `saida/<id>/etapas/<etapa>.json` (ou `trabalho/<id>/bruto/` para
 * agents). Só o armazém grava, por tmp e rename.
 * @template S
 * @typedef {object} Resultado
 * @property {string} etapa
 * @property {string} chave        sha256 da versão, das entradas e da parte selecionada de cada dependência
 * @property {string} hash_saida   sha256 da saída; é o que entra na chave de quem depende desta etapa
 * @property {Desfecho} desfecho
 * @property {S|null} saida        em `tempo_esgotado`, o último `ctx.parcial()`
 * @property {string|null} erro
 * @property {string|null} parou_em   último `ctx.pulso()` antes de falhar ou estourar
 * @property {{espera_ms: number, preparo_ms: number, execucao_ms: number}} relogio
 */

/**
 * @typedef {object} Dependencia
 * @property {'exige'|'tolera'} modo      exige: sem ela pronta, esta etapa falha sem rodar
 * @property {(saida: any) => unknown} seletor   a parte da saída que entra na chave
 */

/** Só a parte selecionada invalida esta etapa. @param {(saida: any) => unknown} [seletor] @returns {Dependencia} */
export const exige = (seletor = (s) => s) => ({ modo: 'exige', seletor })

/** A etapa roda mesmo que a dependência tenha falhado; `ctx.dep(id).saida` pode ser null. @param {(saida: any) => unknown} [seletor] @returns {Dependencia} */
export const tolera = (seletor = (s) => s) => ({ modo: 'tolera', seletor })

/** @typedef {{total: number} | {inatividade: number}} Teto   milissegundos */
/** @typedef {'scripts'|'agentes'|'containers'} Fila */

/**
 * @template R
 * @typedef {object} Ctx
 * @property {import('../dominio/tipos.mjs').Equipe} equipe   null em etapa de escopo 'rodada'
 * @property {import('../dominio/tipos.mjs').Rodada} rodada
 * @property {(id: string) => Resultado<any>} dep   dependência não declarada lança
 * @property {(id: string) => Record<string, Resultado<any>>} depDeTodas
 *   só em etapa de escopo 'rodada': o resultado da dependência em cada equipe, por id da equipe
 * @property {R} recurso                            o que `recurso.abrir` devolveu
 * @property {AbortSignal} sinal
 * @property {(linha: string) => void} pulso        grava no log da etapa e zera o relógio de inatividade
 * @property {(saida: unknown) => void} parcial     saída a preservar se o tempo estourar
 * @property {{capturas: string, logs: string, trabalho: string}} pastas   absolutas; `capturas` é própria desta etapa
 * @property {(caminhoAbsoluto: string) => string} relativo   caminho relativo à pasta de saída da equipe, para usar em Citacao e Evidencia
 */

/**
 * @template S, R
 * @typedef {object} Etapa
 * @property {string} id
 * @property {string} titulo
 * @property {'fatos'|'build'|'leitor'|'uso'} coluna
 * @property {'etapa'|'agente'} natureza
 * @property {'equipe'|'rodada'} [escopo]     'rodada': roda uma vez e enxerga todas as equipes
 * @property {Fila | Fila[] | ((ctx: {equipe: any, rodada: any, dep: (id: string) => Resultado<any>}) => Fila[])} fila
 * @property {number} versao                  subir invalida só os artefatos desta etapa
 * @property {Record<string, Dependencia>} depende
 * @property {(equipe: import('../dominio/tipos.mjs').Equipe, rodada: import('../dominio/tipos.mjs').Rodada) => unknown} [entradas]
 *   o resto da chave: campos do formulário, janela; `rodada.modo` para quem observa o mundo
 * @property {boolean} [volatil]              true: observa o mundo externo e roda de novo a cada `rodar`
 * @property {(ctx: Ctx<never>) => string|null} [pular]   devolve o motivo para não rodar; a saída fica `{pulada: motivo}`
 * @property {Teto} teto                      vale para `executar`; o relógio começa depois de `recurso.abrir`
 * @property {{abrir: (ctx: Ctx<never>) => Promise<R>, fechar: (recurso: R) => Promise<void>}} [recurso]
 *   container ou navegador; em `abrir` só a inatividade conta
 * @property {(ctx: Ctx<R>) => Promise<S>} executar
 * @property {(saida: S) => Promise<boolean>} [valeAinda]   por exemplo: a imagem citada na saída ainda existe
 * @property {import('../dominio/tipos.mjs').ChaveResumo[]} [resumo]   quais estados do resumo esta etapa possui
 * @property {(saida: S, equipe: import('../dominio/tipos.mjs').Equipe) => import('../dominio/tipos.mjs').Contribuicao} [relatar]
 *   pura; só é chamada com saída completa ou com o último parcial
 */

const OBRIGATORIOS = ['id', 'titulo', 'coluna', 'fila', 'versao', 'depende', 'teto', 'executar']

function validar(decl, natureza) {
  for (const campo of OBRIGATORIOS) {
    if (decl[campo] === undefined) throw new Error(`etapa ${decl.id ?? '(sem id)'}: falta o campo ${campo}`)
  }
  if (!/^[a-z][a-z0-9-]*$/.test(decl.id)) throw new Error(`etapa ${decl.id}: id deve ser minúsculo com hífens`)
  if (!COLUNAS.includes(decl.coluna)) throw new Error(`etapa ${decl.id}: coluna desconhecida ${decl.coluna}`)
  if (!('total' in decl.teto) && !('inatividade' in decl.teto)) throw new Error(`etapa ${decl.id}: teto precisa de total ou inatividade`)
  for (const [dep, modo] of Object.entries(decl.depende)) {
    if (modo?.modo !== 'exige' && modo?.modo !== 'tolera') throw new Error(`etapa ${decl.id}: dependência ${dep} precisa de exige() ou tolera()`)
  }
  return Object.freeze({ escopo: 'equipe', ...decl, natureza })
}

/**
 * Declara uma etapa de script. `executar` devolve a saída; `relatar` a transforma em blocos do relatório.
 * @template S, R
 * @param {Omit<Etapa<S, R>, 'natureza'>} decl
 * @returns {Etapa<S, R>}
 */
export function etapa(decl) {
  return validar(decl, 'etapa')
}

/**
 * Declara uma etapa de agent. `executar` devolve `{afirmacoes, fatos?}`, que o
 * armazém guarda fora da pasta de saída. O registro deriva a etapa
 * `<id>.conferido`, e é ela que chama `relatar`, com um `Conferido`.
 * Nenhuma outra etapa pode depender diretamente de um agent.
 * @param {Omit<Etapa<import('../dominio/tipos.mjs').SaidaAgente, any>, 'natureza'|'relatar'> & {
 *   relatar?: (conferido: import('../dominio/tipos.mjs').Conferido & {doTipo: (tipo: string) => import('../dominio/tipos.mjs').Afirmacao[]},
 *     equipe: import('../dominio/tipos.mjs').Equipe) => import('../dominio/tipos.mjs').Contribuicao}} decl
 */
export function agente(decl) {
  return validar(decl, 'agente')
}
