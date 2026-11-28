/**
 * Ocorrências que podem indicar funcionalidade de fachada. A etapa só lista:
 * quem interpreta é o agent leitor, que abre cada linha.
 */
import { etapa, exige, MINUTO } from '../nucleo/etapa.mjs'
import { aparar, ehCodigo, ehTeste, percorrer } from './conteudo/arquivos.mjs'

const MAXIMO_DE_OCORRENCIAS = 40
const MAXIMO_POR_CLASSE = 20
const TAMANHO_DE_RESPOSTA_FIXA = 60

// Sem a opção `i` na primeira: "todo" é palavra comum em português.
const MARCA_DE_PENDENCIA = /\b(TODO|FIXME)\b/
const FRASE_DE_PENDENCIA = /not\s+(yet\s+)?implemented|em\s+breve|coming\s+soon/i
const ATRIBUTO_OU_ESTILO_PLACEHOLDER = /::?placeholder|placeholder-[a-z]|placeholder(Text|TextColor|Style)?\s*[=:]/gi
const DADO_DE_EXEMPLO = /lorem\s+ipsum|(?<![A-Za-z])(mock|fake|dummy)|sample[\s_-]?data|(?<![\w-])placeholder(?![\w-])/i
const RETORNO_DE_TEXTO_LITERAL = new RegExp(`\\breturn\\s+(["'\`])((?:(?!\\1)[^$\\\\]){${TAMANHO_DE_RESPOSTA_FIXA},})\\1`)
const CAMINHO_DE_RESPOSTA = new Set(['ai', 'ia', 'llm', 'chat', 'agent', 'agents', 'agente', 'agentes', 'resposta', 'respostas', 'response', 'responses'])

const palavrasDoCaminho = (caminho) => caminho.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z]+/)

/** @param {string} caminho @returns {boolean} o caminho sugere código de IA ou de resposta */
export const caminhoSugereResposta = (caminho) => palavrasDoCaminho(caminho).some((palavra) => CAMINHO_DE_RESPOSTA.has(palavra))

/**
 * @param {string} linha
 * @param {boolean} emCaminhoDeResposta
 * @returns {'resposta_fixa'|'dado_de_exemplo'|'pendencia'|null}
 */
export function classificarLinha(linha, emCaminhoDeResposta) {
  if (emCaminhoDeResposta && RETORNO_DE_TEXTO_LITERAL.test(linha)) return 'resposta_fixa'
  if (DADO_DE_EXEMPLO.test(linha.replace(ATRIBUTO_OU_ESTILO_PLACEHOLDER, ''))) return 'dado_de_exemplo'
  if (MARCA_DE_PENDENCIA.test(linha) || FRASE_DE_PENDENCIA.test(linha)) return 'pendencia'
  return null
}

/**
 * @param {string} codigo
 * @returns {Promise<{ocorrencias: {classe: 'resposta_fixa'|'dado_de_exemplo'|'pendencia', caminho: string, linha: number, trecho: string}[]}>}
 */
export async function listarOcorrencias(codigo) {
  const porClasse = { resposta_fixa: [], dado_de_exemplo: [], pendencia: [] }
  for await (const { caminho, linhas } of percorrer(codigo)) {
    if (!ehCodigo(caminho) || ehTeste(caminho)) continue
    const emCaminhoDeResposta = caminhoSugereResposta(caminho)
    linhas.forEach((linha, indice) => {
      if (linha.length > 2000) return
      const classe = classificarLinha(linha, emCaminhoDeResposta)
      if (classe && porClasse[classe].length < MAXIMO_POR_CLASSE) {
        porClasse[classe].push({ classe, caminho, linha: indice + 1, trecho: aparar(linha) })
      }
    })
  }
  return { ocorrencias: Object.values(porClasse).flat().slice(0, MAXIMO_DE_OCORRENCIAS) }
}

export default etapa({
  id: 'fachada',
  titulo: 'Sinais de fachada no código',
  coluna: 'fatos',
  fila: 'scripts',
  versao: 1,
  depende: { corte: exige((c) => ({ sha: c.sha, codigo: c.codigo, repo: c.repo })) },
  teto: { total: 3 * MINUTO },

  async executar(ctx) {
    ctx.pulso('procurando pendências, dados de exemplo e respostas fixas')
    const saida = await listarOcorrencias(ctx.dep('corte').saida.codigo)
    ctx.pulso(`${saida.ocorrencias.length} ocorrências`)
    return saida
  },
})
