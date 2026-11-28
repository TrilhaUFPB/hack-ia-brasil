/**
 * Padrões do harness. Cada valor pode ser trocado por opção de linha de comando
 * em `comandos/rodar.mjs`.
 */
import os from 'node:os'
import path from 'node:path'

export const CONFIG = Object.freeze({
  /** Fora do repositório do site: o tsconfig e o servidor de desenvolvimento dele varrem a árvore inteira. */
  dirDados: process.env.RT_DADOS || path.join(os.homedir(), 'hack-ia-relatorios'),

  /** Hack IA Brasil, 28/11/2026, horário de Brasília. */
  janela: { inicio: '2026-11-28T09:20:00-03:00', fim: '2026-11-28T16:00:00-03:00' },

  filas: { scripts: 16, agentes: 6, containers: 3 },

  /** Onde `publicar` grava, relativo à raiz do repositório do site. Fora de `public/`. */
  dirPublicacao: 'relatorios',

  imagens: {
    /** Navegador do agent testador e das capturas por script. */
    navegador: 'mcr.microsoft.com/playwright/mcp@sha256:2dfc17e08e8db54678ec965ce9ffb4100be0aa68135774d761bac9035ceb6668',
    /** Onde os projetos das equipes são instalados e sobem. Construída por `preparar` a partir de `docker/base.Dockerfile`. */
    base: 'rt-base:1',
  },

  /** Limites de cada container de projeto. */
  container: { memoria: '3g', cpus: '2', pids: '512' },

  /** O leitor decide o estado de cada declaração, por isso usa o modelo mais forte. Trocar para `sonnet` reduz o tempo por equipe. */
  modelos: {
    promessas: process.env.RT_MODELO_PROMESSAS || 'sonnet',
    leitor: process.env.RT_MODELO_LEITOR || 'opus',
    uso: process.env.RT_MODELO_USO || 'sonnet',
  },

  /** Teto de gasto por chamada de agent, em dólares. */
  orcamentoUsd: { promessas: 1.5, leitor: 6, uso: 4 },

  /** Quantas ações de navegador o testador pode fazer antes de relatar o que falta como tempo esgotado. */
  acoesDoTestador: 40,
})
