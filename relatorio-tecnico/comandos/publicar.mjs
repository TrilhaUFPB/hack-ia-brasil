/**
 * `publicar`: copia os relatórios e o índice para a pasta de publicação do
 * repositório do site, cria um commit e envia para a `main`.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG } from '../config.mjs'
import { criarArmazem } from '../nucleo/armazem.mjs'
import { rodar as rodarProcesso, rodarOuLancar } from '../ferramentas/processo.mjs'
import { ErroDeUso, analisar, comCodigoDeSaida, dirsDe } from './argumentos.mjs'

const DIR_HARNESS = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ARQUIVOS_DA_EQUIPE = ['relatorio.html', 'relatorio.json']
const ARQUIVOS_DO_INDICE = ['indice.json', 'index.html']

const OPCOES = {
  previa: { tipo: 'marca' },
  'sem-push': { tipo: 'marca' },
  repo: { tipo: 'texto' },
  dir: { tipo: 'texto' },
}

async function raizDoRepositorio(pasta) {
  const { codigo, stdout } = await rodarProcesso('git', ['rev-parse', '--show-toplevel'], { cwd: pasta }).catch(() => ({ codigo: -1, stdout: '' }))
  if (codigo !== 0) throw new ErroDeUso(`${pasta} não está dentro de um repositório git. Informe --repo <pasta>.`)
  return stdout.trim()
}

const existe = (caminho) => fsp.access(caminho).then(() => true, () => false)

/**
 * @param {string[]} argv
 * @param {{escrever?: (linha: string) => void, agora?: () => Date}} [injetado]
 * @returns {Promise<number>} código de saída
 */
export function publicar(argv, { escrever = console.log, agora = () => new Date() } = {}) {
  return comCodigoDeSaida(async () => {
    const opcoes = analisar(argv, OPCOES)
    const dirs = dirsDe(opcoes.dir)
    const armazem = criarArmazem(dirs)
    const repo = await raizDoRepositorio(opcoes.repo ? path.resolve(opcoes.repo) : DIR_HARNESS)
    const git = (...args) => rodarOuLancar('git', args, { cwd: repo })

    // `git push origin HEAD:main` envia o branch atual inteiro. Fora da main, levaria junto commits que ainda não foram revisados.
    const ramo = (await git('rev-parse', '--abbrev-ref', 'HEAD')).trim()
    if (!opcoes['sem-push'] && ramo !== 'main') {
      escrever(`Recusado: o repositório está no branch ${ramo}, e o push enviaria os commits dele para a main.`)
      escrever('Vá para a main (git switch main) e rode publicar de novo, ou use --sem-push para só criar o commit.')
      return 1
    }

    const relatorios = await armazem.lerRelatorios()
    if (relatorios.length === 0) {
      escrever(`Nenhum relatório em ${dirs.saida}. Rode rodar.mjs antes de publicar.`)
      return 1
    }
    const previas = relatorios.filter((relatorio) => relatorio.geracao.modo !== 'final')
    if (previas.length > 0 && !opcoes.previa) {
      escrever(`Recusado: ${previas.length} de ${relatorios.length} relatórios são de prévia (${previas.map((relatorio) => relatorio.equipe.id).join(', ')}).`)
      escrever('Rode rodar.mjs --modo final, ou publique a prévia com --previa.')
      return 1
    }
    const modo = previas.length > 0 ? 'previa' : 'final'

    const destino = path.join(repo, CONFIG.dirPublicacao)
    for (const relatorio of relatorios) {
      const origem = armazem.pastaSaida(relatorio.equipe.id)
      await fsp.mkdir(path.join(destino, relatorio.equipe.id), { recursive: true })
      for (const arquivo of ARQUIVOS_DA_EQUIPE) {
        await fsp.copyFile(path.join(origem, arquivo), path.join(destino, relatorio.equipe.id, arquivo))
      }
    }
    for (const arquivo of ARQUIVOS_DO_INDICE) {
      const origem = path.join(dirs.saida, arquivo)
      if (await existe(origem)) await fsp.copyFile(origem, path.join(destino, arquivo))
      else escrever(`Aviso: ${origem} não existe; publicando sem ele.`)
    }

    await git('add', '--', CONFIG.dirPublicacao)
    const semMudancas = (await rodarProcesso('git', ['diff', '--cached', '--quiet', '--', CONFIG.dirPublicacao], { cwd: repo })).codigo === 0
    if (semMudancas) {
      escrever(`Sem mudanças em ${CONFIG.dirPublicacao}/. Nenhum commit criado.`)
    } else {
      const momento = agora()
      const hora = `${String(momento.getHours()).padStart(2, '0')}h${String(momento.getMinutes()).padStart(2, '0')}`
      const mensagem = `chore(relatorios): publique a rodada ${modo} das ${hora}`
      // O caminho no commit deixa de fora o que já estivesse no índice antes deste comando.
      await git('commit', '-m', mensagem, '--', CONFIG.dirPublicacao)
      escrever(`Commit criado em ${repo}: ${mensagem} (${relatorios.length} relatórios)`)
    }

    if (opcoes['sem-push']) {
      escrever('Parou antes do push (--sem-push).')
      return 0
    }
    // O push roda mesmo sem commit novo: um push recusado antes deixa o commit local à espera.
    const push = await rodarProcesso('git', ['push', 'origin', 'HEAD:main'], { cwd: repo })
    if (push.codigo !== 0) {
      escrever(`O push foi recusado: ${push.stderr.trim().split('\n').pop()}`)
      escrever('O commit está guardado. Rode git pull --rebase origin main e depois publicar de novo.')
      return 1
    }
    escrever('Enviado para origin/main.')
    return 0
  }, escrever)
}
