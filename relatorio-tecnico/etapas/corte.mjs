import { etapa, MINUTO } from '../nucleo/etapa.mjs'
import { cortar } from './tempo/corte.mjs'

export default etapa({
  id: 'corte',
  titulo: 'Commit de corte',
  coluna: 'fatos',
  fila: 'scripts',
  versao: 1,
  depende: {},
  volatil: true,
  entradas: (equipe, rodada) => ({ repo: equipe.repo?.url ?? null, fim: rodada.janela.fim }),
  teto: { inatividade: 3 * MINUTO },
  executar: (ctx) => cortar({
    equipe: ctx.equipe,
    janela: ctx.rodada.janela,
    pastaTrabalho: ctx.pastas.trabalho,
    pulso: ctx.pulso,
    sinal: ctx.sinal,
  }),
})
