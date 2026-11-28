import { evidenciaDeArquivo } from '../dominio/evidencia.mjs'
import { verificado } from '../dominio/estados.mjs'
import { etapa, MINUTO, tolera } from '../nucleo/etapa.mjs'
import { compararEquipes } from './tempo/copia.mjs'

const EVIDENCIAS_POR_ITEM = 10

export default etapa({
  id: 'copia',
  titulo: 'Cópia entre equipes',
  coluna: 'fatos',
  escopo: 'rodada',
  fila: 'scripts',
  versao: 1,
  depende: { corte: tolera((c) => (c ? { sha: c.sha, codigo: c.codigo } : null)) },
  teto: { total: 5 * MINUTO },

  async executar(ctx) {
    const cortes = Object.entries(ctx.depDeTodas('corte')).filter(([, resultado]) => resultado?.saida?.codigo)
    const por_equipe = await compararEquipes(Object.fromEntries(cortes.map(([id, r]) => [id, r.saida.codigo])), ctx.pulso)

    // A evidência é montada aqui porque abre o arquivo no disco, e `relatar` é pura.
    const evidencias = {}
    for (const [id, resultado] of cortes) {
      const arquivos = [...new Set(por_equipe[id].map((igual) => igual.arquivo))].slice(0, EVIDENCIAS_POR_ITEM)
      evidencias[id] = await Promise.all(arquivos.map((arquivo) => evidenciaDeArquivo(resultado.saida, arquivo, 1, { ocultarTrecho: true })))
    }

    return {
      por_equipe,
      evidencias,
      nomes: Object.fromEntries(ctx.rodada.equipes.map((equipe) => [equipe.id, equipe.nome])),
    }
  },

  relatar(saida, equipe) {
    const iguais = saida.por_equipe[equipe.id]
    if (!iguais) return {}
    if (iguais.length === 0) {
      return {
        origem: [{
          tipo: 'item',
          id: 'copia:arquivos-iguais',
          rotulo: 'Nenhum arquivo igual ao de outra equipe nesta rodada',
          estado: verificado(),
          evidencias: [],
          obs: `${Object.keys(saida.por_equipe).length} equipes comparadas; só conteúdo idêntico depois de normalizar espaços`,
        }],
      }
    }
    return {
      origem: [{
        tipo: 'item',
        id: 'copia:arquivos-iguais',
        rotulo: 'Arquivos iguais aos de outra equipe',
        estado: verificado(),
        valor: {
          tabela: {
            colunas: ['Arquivo', 'Outra equipe', 'Arquivo dela'],
            linhas: iguais.map((igual) => [igual.arquivo, saida.nomes[igual.outra_equipe] ?? igual.outra_equipe, igual.arquivo_dela]),
          },
        },
        evidencias: (saida.evidencias[equipe.id] ?? []).filter(Boolean),
        sinal: true,
      }],
    }
  },
})
