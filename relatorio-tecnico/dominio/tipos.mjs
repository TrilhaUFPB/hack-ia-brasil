/**
 * Formas de dados compartilhadas. Só typedefs. Quem precisa de um tipo importa
 * daqui com `import('../dominio/tipos.mjs').Nome`.
 */

/**
 * Uma linha do formulário de submissão. `null` significa "não informado".
 * A leitura do CSV nunca lança por campo ausente.
 * @typedef {object} Equipe
 * @property {string} id            slug do nome do projeto; `dono-nome` do repositório se vier vazio ou repetido
 * @property {string} nome          nome do projeto, que é o nome da equipe
 * @property {{dono: string, nome: string, url: string}|null} repo
 * @property {string|null} resumo   resumo em uma linha
 * @property {string|null} descricao
 * @property {string|null} demo     link da demo ao vivo
 * @property {string|null} track
 * @property {string|null} video
 */

/**
 * @typedef {object} Rodada
 * @property {'previa'|'final'} modo
 * @property {{inicio: string, fim: string}} janela   ISO 8601 com fuso
 * @property {{trabalho: string, saida: string}} dirs caminhos absolutos
 * @property {Equipe[]} equipes
 * @property {{refazer: string[], build: 'todos'|'sem-deploy'|'nenhum', somente: string[]|null}} opcoes
 *   `somente`: ids das equipes que esta execução roda; null roda todas. As demais só são lidas do disco.
 */

/**
 * O que um agent alega como prova. Ainda não foi aberto.
 * - `arquivo`: `caminho` relativo à raiz do repositório no commit de corte.
 * - `formulario`: `caminho` é `descricao.md` ou `resumo.md`, os textos do formulário.
 * - `captura`: `caminho` é o nome do arquivo que o agent gravou.
 * - `url`: `caminho` é a URL.
 * - `log`: `caminho` é o nome do arquivo de log.
 * @typedef {object} Citacao
 * @property {'arquivo'|'formulario'|'captura'|'url'|'log'} tipo
 * @property {string} caminho
 * @property {number|null} [linha]
 * @property {number|null} [linha_fim]
 * @property {string|null} [trecho]   texto literal copiado do alvo
 */

/**
 * Citação cujo alvo foi aberto e bateu. Só `dominio/evidencia.mjs` constrói.
 * `link` aponta para o GitHub no commit de corte, para a captura relativa à pasta
 * da equipe, ou para a própria URL.
 * @typedef {Citacao & {link: string|null, conferida: 'script'|'conferidor'}} Evidencia
 */

/**
 * O que um agent devolve. Fica em `trabalho/<id>/bruto/` e nunca chega à página.
 * @typedef {object} AfirmacaoBruta
 * @property {string} id
 * @property {string} tipo          chave de TIPOS_AFIRMACAO
 * @property {Record<string, unknown>} dados   campos do tipo
 * @property {Citacao[]} citacoes
 */

/**
 * Afirmação que passou pelo conferidor. Não tem `citacoes`.
 * @typedef {object} Afirmacao
 * @property {string} id
 * @property {string} tipo
 * @property {Record<string, unknown>} dados   textos reprovados pela trava de linguagem viram null
 * @property {Evidencia[]} evidencias
 */

/**
 * Saída de uma etapa `<agent>.conferido`.
 * @typedef {object} Conferido
 * @property {Afirmacao[]} afirmacoes
 * @property {number} descartadas
 * @property {Record<string, number>} motivos   contagem de descartes por motivo
 * @property {Record<string, unknown>} fatos   o que o script da etapa mediu em volta do agent; nunca texto do agent
 */

/**
 * O que `executar` de uma etapa de agent devolve.
 * @typedef {object} SaidaAgente
 * @property {AfirmacaoBruta[]} afirmacoes
 * @property {Record<string, unknown>} [fatos]
 */

/**
 * Onde o conferidor e os construtores de evidência abrem os alvos.
 * `corte.saida` satisfaz `{codigo, repo, sha}`.
 * @typedef {object} Fontes
 * @property {string|null} codigo        pasta do código no commit de corte
 * @property {{dono: string, nome: string}|null} repo
 * @property {string|null} sha
 * @property {string} [formulario]       pasta com `descricao.md` e `resumo.md`
 * @property {string} [saida]            pasta de saída da equipe; capturas e logs são relativos a ela
 */

/**
 * @typedef {string | number
 *   | {serie: [string, number][]}
 *   | {tabela: {colunas: string[], linhas: (string|number)[][]}}
 *   | {lista: string[]}} Valor
 */

/**
 * Um fato do relatório. `sinal: true` marca "sinal a conferir", sem julgamento.
 * @typedef {object} Item
 * @property {'item'} tipo
 * @property {string} id
 * @property {string} rotulo
 * @property {import('./estados.mjs').EstadoItem} estado
 * @property {Valor} [valor]
 * @property {Evidencia[]} evidencias
 * @property {string|null} [obs]
 * @property {boolean} [sinal]
 */

/**
 * Uma afirmação da equipe e o que o código mostra. Três etapas contribuem com
 * pedaços do mesmo `id`: `promessas.conferido` (citacao, fonte, classe),
 * `leitor.conferido` (estado e evidências) e `uso.conferido` (no_uso).
 * @typedef {object} Declaracao
 * @property {'declaracao'} tipo
 * @property {string} id
 * @property {string} [citacao]     frase literal da equipe
 * @property {Evidencia} [fonte]    onde a frase está
 * @property {'funcionalidade'|'tecnologia'|'resultado'} [classe]
 * @property {import('./estados.mjs').EstadoDeclaracao|null} [estado]   null: não conferida
 * @property {import('./estados.mjs').EstadoItem|null} [no_uso]
 * @property {Evidencia[]} [evidencias]
 * @property {string|null} [obs]
 * @property {string|null} [existe]
 * @property {string|null} [falta]
 * @property {string|null} [o_que_faz]
 * @property {string[]} [onde_procurou]
 */

/**
 * @typedef {object} Passo
 * @property {'passo'} tipo
 * @property {string} id
 * @property {number} n
 * @property {string} acao
 * @property {string|null} [esperado]
 * @property {string|null} [observado]
 * @property {import('./estados.mjs').EstadoItem} [estado]
 * @property {Evidencia[]} evidencias
 */

/** @typedef {Item | Declaracao | Passo} Bloco */
/** @typedef {'deploy'|'build'|'fluxo'|'ia'} ChaveResumo */
/** @typedef {'roteiro'|'declaracoes'|'nao_declarado'|'uso'|'ia'|'linha_do_tempo'|'origem'|'arquitetura'|'higiene'} Parte */

/**
 * O que `relatar` devolve. Blocos de mesmo `id` na mesma parte são fundidos.
 * @typedef {{resumo?: Partial<Record<ChaveResumo, import('./estados.mjs').EstadoItem>>}
 *   & Partial<Record<Parte, Bloco[]>>} Contribuicao
 */

/** Só nasce em `montar`, quando a etapa dona ainda não tem artefato. @typedef {{estado: 'em_andamento', etapa: string}} Pendente */

/**
 * @typedef {object} EtapaNoRelatorio
 * @property {string} titulo
 * @property {string} coluna
 * @property {'aguardando'|'rodando'|'pronto'|'falhou'|'tempo_esgotado'} situacao
 * @property {{espera_ms: number, preparo_ms: number, execucao_ms: number}|null} relogio
 * @property {string|null} parou_em
 * @property {string|null} erro
 */

/**
 * `relatorio.json`. As partes seguem a ordem de PARTES em `dominio/relatorio.mjs`.
 * @typedef {object} Relatorio
 * @property {number} formato
 * @property {{id: string, nome: string, track: string|null, repo: string|null, demo: string|null, video: string|null, resumo: string|null}} equipe
 * @property {{horario: string, modo: 'previa'|'final', janela: {inicio: string, fim: string},
 *   commit: string|null, commit_em: string|null, etapas: Record<string, EtapaNoRelatorio>}} geracao
 * @property {Record<ChaveResumo, import('./estados.mjs').EstadoItem | Pendente>} resumo
 * @property {Bloco[]} roteiro
 * @property {Declaracao[]} declaracoes
 * @property {Bloco[]} nao_declarado
 * @property {Bloco[]} uso
 * @property {Bloco[]} ia
 * @property {Bloco[]} linha_do_tempo
 * @property {Bloco[]} origem
 * @property {Bloco[]} arquitetura
 * @property {Bloco[]} higiene
 * @property {{rotulo: string, motivo: string, causa: 'bloqueio_externo'|'tempo_esgotado'|'etapa_falhou'|'em_andamento'}[]} nao_verificado
 * @property {{total: number, motivos: Record<string, number>}} descartados
 */

export {}
