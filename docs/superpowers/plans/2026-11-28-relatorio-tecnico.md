# Plano de construção: harness do relatório técnico

Spec: `docs/superpowers/specs/2026-11-28-relatorio-tecnico-design.md`. Contrato entre módulos: `relatorio-tecnico/CONTRATO.md`.

## Objetivo

Rodar `node relatorio-tecnico/rodar.mjs --csv <link> --modo final` e obter, para cada equipe, um `relatorio.html` com fatos, evidências e estados. O primeiro alvo é o repositório de exemplo `nicolecostt/puca-onboarding`, de ponta a ponta.

## Forma escolhida

Dois desenhos foram feitos em paralelo por modelos diferentes e convergiram. Um juiz independente escolheu a mesma base.

- **Tudo é uma etapa.** Cada verificação, build e agent é um arquivo em `etapas/`. Ele declara o que lê, a fila, o teto de tempo e a sua fatia do relatório. Acrescentar uma verificação é criar um arquivo.
- **O progresso vem dos arquivos de saída.** Não existe arquivo de estado. Uma etapa está pronta quando o envelope dela existe e a chave bate com as entradas atuais. Uma queda em qualquer ponto retoma sozinha.
- **Reuso entre prévia e final sem código especial.** A chave de uma etapa só inclui a parte que ela lê das dependências. Se o commit de corte não mudou, leitura de código e build não rodam de novo.
- **Texto de agent fica em quarentena.** A saída bruta de um agent mora fora da pasta de saída. Só a etapa derivada `<agent>.conferido` chega à página, e ela abre cada citação antes.
- **O relatório é uma projeção.** A página de cada equipe é remontada a cada etapa que termina. Às 16h30 ela mostra o que existe e marca o resto como em andamento.
- **Navegador sempre em container.** O harness não tem dependência npm. O testador de uso e as capturas usam a imagem `mcr.microsoft.com/playwright/mcp`. Para projeto local, o navegador entra na rede do container do projeto e acessa `localhost` como um desenvolvedor acessaria.

## Frentes de trabalho

Oito implementadores em paralelo, com arquivos disjuntos e um contrato comum.

| Frente | Entrega |
|---|---|
| Núcleo | registro de etapas, armazém, orquestrador com três filas, projeção |
| Comandos | `rodar`, `status`, `preparar`, `publicar`, tabela do terminal |
| Domínio | estados, evidências, conferidor, trava de linguagem, leitura do CSV, montagem do relatório |
| Tempo | clone, commit de corte, GitHub, linha do tempo, cópia entre equipes |
| Conteúdo | composição, segredos, submissão, indícios de fachada, deploy, navegador |
| Build | receitas por stack, container isolado, subida local, registro de DNS |
| Agents | promessas, leitor de código, testador de uso, prompts |
| Página | HTML autossuficiente no padrão visual do site, índice |

A integração e o teste de ponta a ponta ficam com o agente principal.

## Verificação

1. Testes de cada frente com `node --test relatorio-tecnico/testes/`.
2. `node relatorio-tecnico/preparar.mjs` nesta máquina.
3. Rodada real no repositório de exemplo, com a janela do hackathon dele (07/11 13h a 08/11 13h), conferindo no HTML gerado: commit de corte, commits fora da janela, declarações com evidência que abre no GitHub, teste de uso com capturas.
4. Segunda rodada sem mudança: nenhuma etapa não volátil reexecuta.

## O que ficou fora desta primeira versão

- Busca de trechos na busca de código do GitHub. Ficam os sinais por script: fork, marcas de projeto gerado, commit único muito grande.
- O testador executar comandos dentro do container para seguir o README quando a receita automática falha.
- Comparação de arquivos quase iguais entre equipes. Fica a comparação exata sobre conteúdo normalizado.
- Reescrita de texto reprovado pela trava de linguagem. O texto reprovado é removido e o estado e a evidência ficam.
