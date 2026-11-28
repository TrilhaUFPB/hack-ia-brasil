/**
 * Leitura de CSV no padrão RFC 4180, sem dependência. A planilha do formulário
 * traz vírgula e quebra de linha dentro de campo, inclusive no cabeçalho.
 */
import fsp from 'node:fs/promises'

/**
 * @param {string} texto
 * @returns {string[][]} linhas de campos; linhas totalmente vazias ficam de fora
 */
export function analisarCsv(texto) {
  const conteudo = String(texto ?? '').replace(/^﻿/, '')
  const linhas = []
  let linha = []
  let campo = ''
  let entreAspas = false

  const fecharCampo = () => {
    linha.push(campo)
    campo = ''
  }
  const fecharLinha = () => {
    fecharCampo()
    if (linha.some((valor) => valor !== '')) linhas.push(linha)
    linha = []
  }

  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i]
    if (entreAspas) {
      if (c !== '"') campo += c
      else if (conteudo[i + 1] === '"') {
        campo += '"'
        i++
      } else entreAspas = false
    } else if (c === '"' && campo === '') entreAspas = true
    else if (c === ',') fecharCampo()
    else if (c === '\n') fecharLinha()
    else if (c === '\r') {
      if (conteudo[i + 1] === '\n') i++
      fecharLinha()
    } else campo += c
  }
  if (campo !== '' || linha.length > 0) fecharLinha()
  return linhas
}

/**
 * @param {string} origem caminho de arquivo ou URL http(s)
 * @returns {Promise<string>}
 */
export async function carregarCsv(origem) {
  if (typeof origem !== 'string' || origem.trim() === '') throw new Error('CSV: informe o caminho do arquivo ou a URL da planilha')
  if (!/^https?:\/\//i.test(origem)) {
    try {
      return await fsp.readFile(origem, 'utf8')
    } catch (erro) {
      throw new Error(`CSV: não consegui ler o arquivo ${origem} (${erro.code ?? erro.message})`)
    }
  }

  let resposta
  try {
    resposta = await fetch(origem, { redirect: 'follow' })
  } catch (erro) {
    throw new Error(`CSV: não consegui baixar ${origem} (${erro.cause?.code ?? erro.message})`)
  }
  if (!resposta.ok) throw new Error(`CSV: ${origem} respondeu ${resposta.status}`)
  const texto = await resposta.text()
  // Planilha que não está publicada devolve a tela de login do Google com status 200.
  if (/^\s*<(!doctype|html)/i.test(texto)) {
    throw new Error(`CSV: ${origem} devolveu uma página HTML, não um CSV. Publique a planilha como CSV ou baixe o arquivo.`)
  }
  return texto
}
