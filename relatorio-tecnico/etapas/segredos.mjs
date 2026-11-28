/**
 * Varredura de segredos versionados. A saída traz tipo, caminho e linha; o
 * valor encontrado nunca é gravado.
 */
import { evidenciaDeArquivo } from '../dominio/evidencia.mjs'
import { verificado } from '../dominio/estados.mjs'
import { etapa, exige, MINUTO } from '../nucleo/etapa.mjs'
import { percorrer } from './conteudo/arquivos.mjs'
import { linhaPreenchidaDeEnv, tiposNaLinha, TIPO_ENV_VERSIONADO } from './conteudo/padroes-segredos.mjs'

const MAXIMO_DE_ACHADOS = 100
const ACHADOS_NO_RELATORIO = 10

/**
 * @param {string} codigo  pasta do código no commit de corte
 * @returns {Promise<{achados: {tipo: string, caminho: string, linha: number}[], total: number}>}
 */
export async function varrerSegredos(codigo) {
  const achados = []
  for await (const { caminho, linhas } of percorrer(codigo)) {
    const linhaDoEnv = linhaPreenchidaDeEnv(caminho, linhas)
    if (linhaDoEnv) achados.push({ tipo: TIPO_ENV_VERSIONADO, caminho, linha: linhaDoEnv })
    linhas.forEach((linha, indice) => {
      for (const tipo of tiposNaLinha(linha)) achados.push({ tipo, caminho, linha: indice + 1 })
    })
  }
  return { achados: achados.slice(0, MAXIMO_DE_ACHADOS), total: achados.length }
}

export default etapa({
  id: 'segredos',
  titulo: 'Segredos versionados',
  coluna: 'fatos',
  fila: 'scripts',
  versao: 1,
  depende: { corte: exige((c) => ({ sha: c.sha, codigo: c.codigo, repo: c.repo })) },
  teto: { total: 3 * MINUTO },

  async executar(ctx) {
    const fontes = ctx.dep('corte').saida
    ctx.pulso('procurando padrões de segredo')
    const { achados, total } = await varrerSegredos(fontes.codigo)
    ctx.pulso(`${total} achados`)
    return {
      total,
      achados: achados.map((achado, indice) => ({
        ...achado,
        evidencia: indice < ACHADOS_NO_RELATORIO ? evidenciaDeArquivo(fontes, achado.caminho, achado.linha, { ocultarTrecho: true }) : null,
      })),
    }
  },

  relatar(saida) {
    if (saida.total === 0) {
      return {
        higiene: [{
          tipo: 'item', id: 'segredos:nenhum', rotulo: 'Nenhum segredo encontrado pelos padrões da varredura',
          estado: verificado(), evidencias: [],
        }],
      }
    }
    const mostrados = saida.achados.slice(0, ACHADOS_NO_RELATORIO)
    return {
      higiene: mostrados.map((achado, indice) => ({
        tipo: 'item', id: `segredos:achado-${indice + 1}`, rotulo: `Padrão de segredo: ${achado.tipo}`,
        estado: verificado(), valor: `${achado.caminho}, linha ${achado.linha}`, sinal: true,
        evidencias: achado.evidencia ? [achado.evidencia] : [],
        obs: indice === mostrados.length - 1 && saida.total > mostrados.length
          ? `A varredura encontrou ${saida.total} ocorrências; a página mostra as ${mostrados.length} primeiras.` : null,
      })),
    }
  },
})
