/**
 * Extrai dos textos da equipe (README, documentos, formulário) as afirmações
 * verificáveis e o fluxo principal de uso. O leitor e o testador partem daqui.
 */
import path from 'node:path'
import { CONFIG } from '../config.mjs'
import { rodarAgente } from '../ferramentas/claude.mjs'
import { agente, exige, MINUTO } from '../nucleo/etapa.mjs'
import { montarPrompt } from './agentes/prompt.mjs'

const TIPOS = ['promessa', 'fluxo_principal']

export default agente({
  id: 'promessas',
  titulo: 'Promessas da equipe',
  coluna: 'leitor',
  fila: 'agentes',
  versao: 1,
  depende: { corte: exige((corte) => ({ sha: corte.sha, codigo: corte.codigo })) },
  entradas: (equipe) => ({ descricao: equipe.descricao, resumo: equipe.resumo }),
  teto: { total: 6 * MINUTO },

  async executar(ctx) {
    const pastaFormulario = path.join(ctx.pastas.trabalho, 'formulario')
    const afirmacoes = await rodarAgente({
      prompt: montarPrompt('promessas', TIPOS, { pasta_formulario: pastaFormulario }),
      tipos: TIPOS,
      ferramentas: ['Read', 'Glob', 'Grep'],
      cwd: ctx.dep('corte').saida.codigo,
      dirsExtras: [pastaFormulario],
      modelo: CONFIG.modelos.promessas,
      orcamentoUsd: CONFIG.orcamentoUsd.promessas,
      sinal: ctx.sinal,
      pulso: ctx.pulso,
    })
    return { afirmacoes }
  },

  relatar(conferido) {
    return {
      declaracoes: conferido.doTipo('promessa').map((promessa) => ({
        tipo: 'declaracao',
        id: promessa.id,
        citacao: promessa.dados.citacao,
        fonte: promessa.evidencias[0],
        classe: promessa.dados.classe,
      })),
    }
  },
})
