import { evidenciaDeArquivo } from '../dominio/evidencia.mjs'
import { naoInformado, verificado } from '../dominio/estados.mjs'
import { etapa, exige, MINUTO } from '../nucleo/etapa.mjs'
import { percorrer, profundidade } from './conteudo/arquivos.mjs'

const INSTRUCOES = /\b(npm|pnpm|yarn|bun)\s+(install|i|run|start|dev)\b|\bnpx\s+\S|\bpip3?\s+install\b|\buv\s+(sync|run|pip)\b|\bpoetry\s+(install|run)\b|\bdocker(\s+compose|-compose)?\s+(run|up|build)\b|\bgo\s+run\b|\bcargo\s+run\b|\bpython3?\s+\S+\.py\b|como\s+(rodar|executar|usar|instalar)|instala[çc][ãa]o|getting\s+started|\bsetup\b|\bquick\s?start\b|how\s+to\s+run|rodando\s+(o\s+projeto|localmente)/i

/** Cada marca diz onde procurar: no texto do README, no nome de um caminho ou no conteúdo de um arquivo. */
const MARCAS = [
  { marca: 'README padrão do create-next-app', readme: /bootstrapped with \[?`?create-next-app/i },
  { marca: 'README padrão do modelo do Vite', readme: /^#\s*(React|Vue|Svelte|Preact|Lit|Solid)\s*\+\s*(TypeScript\s*\+\s*)?Vite\s*$|This template (provides a minimal setup|should help get you started)/i },
  { marca: 'README padrão do Lovable', readme: /Welcome to your Lovable project|lovable\.dev\/projects\//i },
  { marca: 'README com menção ao v0', readme: /\bv0\.(dev|app)\b|built with v0/i },
  { marca: 'pasta .lovable', caminho: /(^|\/)\.lovable(\/|$)/ },
  { marca: 'pasta .bolt', caminho: /(^|\/)\.bolt(\/|$)/ },
  { marca: 'pasta ou arquivo v0', caminho: /(^|\/)\.?v0(\/|\.json$|$)/ },
  { marca: 'arquivo .replit', caminho: /(^|\/)(\.replit|replit\.nix)$/ },
  { marca: 'dependência lovable-tagger', arquivo: /(^|\/)(package\.json|vite\.config\.[cm]?[jt]s)$/, conteudo: /lovable-tagger/ },
]

const preenchido = (campo) => typeof campo === 'string' && campo.trim().length > 0

/**
 * @param {string} codigo
 * @returns {Promise<{readme: {caminho: string, linhas: number, linha_instrucoes: number|null}|null,
 *   marcas: {marca: string, caminho: string, linha: number|null}[]}>}
 */
export async function examinarSubmissao(codigo) {
  let readme = null
  const marcas = new Map()
  const marcar = (marca, caminho, linha) => { if (!marcas.has(marca)) marcas.set(marca, { marca, caminho, linha }) }
  const linhaQueCasa = (linhas, expressao) => linhas.findIndex((linha) => expressao.test(linha)) + 1

  for await (const { caminho, linhas } of percorrer(codigo)) {
    const ehReadme = /(^|\/)readme(\.(md|mdx|txt|rst))?$/i.test(caminho)
    if (ehReadme && (readme === null || profundidade(caminho) < profundidade(readme.caminho))) {
      readme = { caminho, linhas: linhas.length, linha_instrucoes: linhaQueCasa(linhas, INSTRUCOES) || null }
    }
    for (const definicao of MARCAS) {
      if (definicao.caminho?.test(caminho)) marcar(definicao.marca, caminho, null)
      const alvo = definicao.readme && ehReadme ? definicao.readme : definicao.arquivo?.test(caminho) ? definicao.conteudo : null
      const linha = alvo ? linhaQueCasa(linhas, alvo) : 0
      if (linha) marcar(definicao.marca, caminho, linha)
    }
  }
  return { readme, marcas: [...marcas.values()] }
}

const itemDeRequisito = (id, rotulo, atendido, extras = {}) => ({
  tipo: 'item', id: `submissao:${id}`, rotulo, estado: atendido ? verificado() : naoInformado(), evidencias: [], ...extras,
})

const idDeMarca = (marca) => marca.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default etapa({
  id: 'submissao',
  titulo: 'Requisitos de submissão',
  coluna: 'fatos',
  fila: 'scripts',
  versao: 1,
  depende: { corte: exige((c) => ({ sha: c.sha, codigo: c.codigo, repo: c.repo })) },
  entradas: (equipe) => ({ resumo: equipe.resumo, descricao: equipe.descricao, video: equipe.video, demo: equipe.demo, track: equipe.track }),
  teto: { total: 3 * MINUTO },

  async executar(ctx) {
    const fontes = ctx.dep('corte').saida
    ctx.pulso('lendo README e procurando marcas de projeto gerado')
    const { readme, marcas } = await examinarSubmissao(fontes.codigo)
    const { equipe } = ctx
    return {
      readme: {
        existe: readme !== null,
        caminho: readme?.caminho ?? null,
        linhas: readme?.linhas ?? 0,
        instrucoes: Boolean(readme?.linha_instrucoes),
        evidencia: readme ? evidenciaDeArquivo(fontes, readme.caminho, 1) : null,
        evidencia_instrucoes: readme?.linha_instrucoes ? evidenciaDeArquivo(fontes, readme.caminho, readme.linha_instrucoes) : null,
      },
      formulario: {
        resumo: preenchido(equipe.resumo), descricao: preenchido(equipe.descricao),
        video: preenchido(equipe.video), demo: preenchido(equipe.demo), track: preenchido(equipe.track),
      },
      marcas: marcas.map((marca) => ({ ...marca, evidencia: evidenciaDeArquivo(fontes, marca.caminho, marca.linha) })),
    }
  },

  relatar(saida) {
    const { readme, formulario } = saida
    return {
      higiene: [
        itemDeRequisito('readme', 'README', readme.existe, readme.existe
          ? { valor: `${readme.caminho}, ${readme.linhas} linhas`, evidencias: [readme.evidencia].filter(Boolean) } : {}),
        itemDeRequisito('instrucoes', 'Instruções de execução no README', readme.instrucoes,
          { evidencias: [readme.evidencia_instrucoes].filter(Boolean) }),
        itemDeRequisito('descricao', 'Descrição do projeto no formulário', formulario.descricao || formulario.resumo),
        itemDeRequisito('video', 'Vídeo no formulário', formulario.video),
        itemDeRequisito('demo', 'Link da demo no formulário', formulario.demo),
      ],
      origem: saida.marcas.map((marca) => ({
        tipo: 'item', id: `submissao:marca-${idDeMarca(marca.marca)}`, rotulo: `Marca de projeto gerado ou modelo pronto: ${marca.marca}`,
        estado: verificado(), valor: marca.linha ? `${marca.caminho}, linha ${marca.linha}` : marca.caminho, sinal: true,
        evidencias: [marca.evidencia].filter(Boolean),
      })),
    }
  },
})
