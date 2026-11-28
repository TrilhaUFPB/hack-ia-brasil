import path from 'node:path'
import { CONFIG } from '../config.mjs'
import { falhou, verificado } from '../dominio/estados.mjs'
import { rodarAgente } from '../ferramentas/claude.mjs'
import { agente, exige, tolera, MINUTO } from '../nucleo/etapa.mjs'
import { item, promessasDe, soDePromessasConhecidas } from './agentes/conferidas.mjs'
import { emLinhas, montarPrompt } from './agentes/prompt.mjs'

const TIPOS = ['declaracao', 'chamada_ia', 'resposta_fixa', 'nao_declarado', 'componente', 'diferenca_arquitetura']
const LIMITE_DE_PISTAS = 60

function pistasDeIa(ia) {
  if (!ia) return 'A varredura de composição não terminou; não há pistas.'
  const bibliotecas = (ia.bibliotecas ?? []).map((biblioteca) => `- biblioteca ${biblioteca.nome} (${biblioteca.provedor}) em ${biblioteca.manifesto}`)
  const chamadas = (ia.chamadas ?? []).slice(0, LIMITE_DE_PISTAS).map((chamada) => `- ${chamada.caminho}:${chamada.linha} (${chamada.provedor})`)
  return emLinhas([...bibliotecas, ...chamadas], 'A varredura não achou biblioteca nem endereço de provedor de IA.')
}

function pistasDeFachada(ocorrencias) {
  if (!ocorrencias) return 'A varredura de respostas fixas não terminou; não há pistas.'
  const linhas = ocorrencias.slice(0, LIMITE_DE_PISTAS).map((ocorrencia) => `- ${ocorrencia.caminho}:${ocorrencia.linha} (${ocorrencia.classe})`)
  return emLinhas(linhas, 'A varredura não achou ocorrências.')
}

export default agente({
  id: 'leitor',
  titulo: 'Leitura do código',
  coluna: 'leitor',
  fila: 'agentes',
  versao: 1,
  depende: {
    corte: exige((corte) => ({ sha: corte.sha, codigo: corte.codigo })),
    'promessas.conferido': exige(promessasDe),
    composicao: tolera((composicao) => composicao?.ia ?? null),
    fachada: tolera((fachada) => fachada?.ocorrencias ?? null),
  },
  entradas: (equipe) => ({ descricao: equipe.descricao, resumo: equipe.resumo }),
  teto: { total: 12 * MINUTO },
  resumo: ['ia'],

  async executar(ctx) {
    const promessas = promessasDe(ctx.dep('promessas.conferido').saida)
    const pastaFormulario = path.join(ctx.pastas.trabalho, 'formulario')
    const prompt = montarPrompt('leitor', TIPOS, {
      pasta_formulario: pastaFormulario,
      promessas: emLinhas(promessas.map((promessa) => `${promessa.id} [${promessa.classe}] ${promessa.citacao}`), 'Nenhuma promessa foi extraída dos textos da equipe.'),
      pistas_ia: pistasDeIa(ctx.dep('composicao').saida?.ia),
      pistas_fachada: pistasDeFachada(ctx.dep('fachada').saida?.ocorrencias),
    })
    const brutas = await rodarAgente({
      prompt,
      tipos: TIPOS,
      ferramentas: ['Read', 'Glob', 'Grep'],
      cwd: ctx.dep('corte').saida.codigo,
      dirsExtras: [pastaFormulario],
      modelo: CONFIG.modelos.leitor,
      orcamentoUsd: CONFIG.orcamentoUsd.leitor,
      sinal: ctx.sinal,
      pulso: ctx.pulso,
    })
    const filtradas = soDePromessasConhecidas(brutas, 'declaracao', promessas.map((promessa) => promessa.id))
    return {
      afirmacoes: filtradas.afirmacoes,
      fatos: {
        promessas: promessas.length,
        declaracoes_de_promessa_desconhecida: filtradas.de_promessa_desconhecida,
        declaracoes_repetidas: filtradas.repetidas,
      },
    }
  },

  relatar(conferido) {
    const chamadas = conferido.doTipo('chamada_ia')
    return {
      resumo: { ia: chamadas.length > 0 ? verificado() : falhou('nenhuma chamada a modelo de IA encontrada no código') },

      declaracoes: conferido.doTipo('declaracao').map(({ dados, evidencias }) => ({
        tipo: 'declaracao',
        id: dados.promessa,
        estado: dados.estado,
        evidencias,
        obs: dados.observacao ?? null,
        existe: dados.existe ?? null,
        falta: dados.falta ?? null,
        o_que_faz: dados.o_que_faz ?? null,
        onde_procurou: dados.onde_procurou ?? [],
      })),

      ia: [
        ...chamadas.map(({ id, dados, evidencias }) =>
          item(`leitor:${id}`, `Chamada a ${dados.provedor}`, verificado(), {
            ...(dados.modelo ? { valor: dados.modelo } : {}),
            obs: dados.finalidade ?? null,
            evidencias,
          })),
        ...conferido.doTipo('resposta_fixa').map(({ id, dados, evidencias }) =>
          item(`leitor:${id}`, 'Resposta fixa no código', verificado(), { obs: dados.descricao ?? null, evidencias, sinal: true })),
      ],

      nao_declarado: conferido.doTipo('nao_declarado').map(({ id, dados, evidencias }) =>
        item(`leitor:${id}`, dados.nome, verificado(), { valor: dados.classe, evidencias })),

      arquitetura: [
        ...conferido.doTipo('componente').map(({ id, dados, evidencias }) =>
          item(`leitor:${id}`, dados.nome, verificado(), {
            ...(dados.arquivos?.length ? { valor: { lista: dados.arquivos } } : {}),
            obs: dados.papel ?? null,
            evidencias,
          })),
        ...conferido.doTipo('diferenca_arquitetura').map(({ id, dados, evidencias }) =>
          item(`leitor:${id}`, 'Diferença entre a arquitetura descrita e a encontrada', verificado(), {
            valor: { tabela: { colunas: ['descrito', 'encontrado'], linhas: [[dados.descrito, dados.encontrado ?? '']] } },
            evidencias,
            sinal: true,
          })),
      ],
    }
  },
})
