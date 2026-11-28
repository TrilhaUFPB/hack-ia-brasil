#!/usr/bin/env node
/**
 * Auditoria independente dos relatórios gerados. Reabre cada evidência por um
 * caminho que não passa pelo conferidor: o trecho de arquivo é relido do git no
 * commit analisado, a captura é procurada no disco e o link é refeito a partir
 * do repositório e do commit. Sai com código 1 se alguma evidência não bater.
 *
 * Uso: node relatorio-tecnico/auditar.mjs [--dir <pasta de dados>]
 */
import fs from 'node:fs'
import path from 'node:path'
import { CONFIG } from './config.mjs'
import { rodar } from './ferramentas/processo.mjs'

const normalizar = (texto) => texto.replace(/\s+/g, ' ').trim()

function* evidenciasDe(valor, caminho = '') {
  if (Array.isArray(valor)) {
    for (const [indice, item] of valor.entries()) yield* evidenciasDe(item, `${caminho}[${indice}]`)
    return
  }
  if (!valor || typeof valor !== 'object') return
  if (typeof valor.conferida === 'string' && typeof valor.tipo === 'string') {
    yield { evidencia: valor, onde: caminho }
    return
  }
  for (const [chave, filho] of Object.entries(valor)) yield* evidenciasDe(filho, caminho ? `${caminho}.${chave}` : chave)
}

async function arquivoNoCommit(dirRepo, sha, caminho) {
  const { codigo, stdout } = await rodar('git', ['-C', dirRepo, 'show', `${sha}:${caminho}`])
  return codigo === 0 ? stdout : null
}

/** @returns {Promise<string|null>} o motivo da reprovação, ou null */
async function auditarEvidencia(evidencia, { relatorio, dirRepo, dirSaidaEquipe }) {
  const sha = relatorio.geracao.commit
  if (evidencia.tipo === 'arquivo') {
    const conteudo = await arquivoNoCommit(dirRepo, sha, evidencia.caminho)
    if (conteudo === null) return `arquivo não existe no commit ${sha.slice(0, 10)}`
    const linhas = conteudo.split('\n')
    if (evidencia.linha > linhas.length) return `linha ${evidencia.linha} além do fim do arquivo (${linhas.length} linhas)`
    if (evidencia.trecho) {
      const inicio = Math.max(0, evidencia.linha - 1)
      const fim = Math.min(linhas.length, (evidencia.linha_fim ?? evidencia.linha) + 1)
      const janela = normalizar(linhas.slice(inicio, fim).join('\n'))
      const trecho = normalizar(evidencia.trecho).slice(0, 200)
      if (!janela.includes(trecho.slice(0, Math.min(trecho.length, janela.length)))) return 'o trecho não está nas linhas indicadas'
    }
    const esperado = `/blob/${sha}/${evidencia.caminho}`
    if (evidencia.link && !decodeURI(evidencia.link).includes(esperado)) return 'o link não aponta para o arquivo no commit analisado'
    return null
  }
  if (evidencia.tipo === 'captura' || evidencia.tipo === 'log') {
    const arquivo = path.join(dirSaidaEquipe, evidencia.caminho)
    if (!arquivo.startsWith(dirSaidaEquipe + path.sep)) return 'caminho fora da pasta da equipe'
    return fs.existsSync(arquivo) && fs.statSync(arquivo).size > 0 ? null : 'arquivo ausente ou vazio'
  }
  if (evidencia.tipo === 'url') return /^https?:\/\//.test(evidencia.caminho) ? null : 'não é um link http'
  if (evidencia.tipo === 'formulario') return null
  return `tipo de evidência desconhecido: ${evidencia.tipo}`
}

async function auditarEquipe(dirs, id) {
  const dirSaidaEquipe = path.join(dirs.saida, id)
  const arquivo = path.join(dirSaidaEquipe, 'relatorio.json')
  if (!fs.existsSync(arquivo)) return null
  const relatorio = JSON.parse(fs.readFileSync(arquivo, 'utf8'))
  const dirRepo = path.join(dirs.trabalho, id, 'repo')
  const contagem = {}
  const reprovadas = []
  for (const { evidencia, onde } of evidenciasDe(relatorio)) {
    contagem[evidencia.tipo] = (contagem[evidencia.tipo] ?? 0) + 1
    if (evidencia.tipo === 'arquivo' && !relatorio.geracao.commit) {
      reprovadas.push({ onde, motivo: 'evidência de arquivo sem commit analisado' })
      continue
    }
    const motivo = await auditarEvidencia(evidencia, { relatorio, dirRepo, dirSaidaEquipe })
    if (motivo) reprovadas.push({ onde, motivo, alvo: `${evidencia.caminho}:${evidencia.linha ?? ''}` })
  }
  return { nome: relatorio.equipe.nome, contagem, reprovadas }
}

const argumentos = process.argv.slice(2)
const indiceDir = argumentos.indexOf('--dir')
const raiz = indiceDir >= 0 ? path.resolve(argumentos[indiceDir + 1]) : CONFIG.dirDados
const dirs = { trabalho: path.join(raiz, 'trabalho'), saida: path.join(raiz, 'saida') }

if (!fs.existsSync(dirs.saida)) {
  console.log(`Não há relatórios em ${dirs.saida}.`)
  process.exit(1)
}

let falhou = false
for (const id of fs.readdirSync(dirs.saida).sort()) {
  const resultado = await auditarEquipe(dirs, id)
  if (!resultado) continue
  const total = Object.values(resultado.contagem).reduce((soma, n) => soma + n, 0)
  const porTipo = Object.entries(resultado.contagem).map(([tipo, n]) => `${n} ${tipo}`).join(', ')
  console.log(`${resultado.nome}: ${total} evidências (${porTipo}), ${resultado.reprovadas.length} reprovadas`)
  for (const { onde, motivo, alvo } of resultado.reprovadas) {
    falhou = true
    console.log(`  reprovada em ${onde}${alvo ? ` (${alvo})` : ''}: ${motivo}`)
  }
}
process.exit(falhou ? 1 : 0)
