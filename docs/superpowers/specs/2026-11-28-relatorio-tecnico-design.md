# Relatório técnico por equipe: desenho do harness

Data: 28/11/2026 (dia do evento). Estado: aprovado pelo Joaquim em 28/11. Construído no mesmo dia; veja "Como ficou construído".

## Intenção

Cada uma das 23 equipes do Hack IA Brasil recebe um relatório técnico, gerado por scripts e agents, que mostra ao jurado o estado real da solução: o que existe, o que roda, o que foi prometido e quando foi feito. O jurado decide; o relatório só evita que ele gaste tempo garimpando repositório.

## Objetivos

- Dar a cada jurado, em uma página, os fatos técnicos de cada equipe com a prova ao lado.
- Testar a solução como usuário: pelo link de deploy quando existe, subindo o projeto quando não existe.
- Ter a parte rápida pronta para as 23 equipes até 16h30, a tempo da escolha das finalistas.

## O que o relatório não é

- Não dá nota, não ordena equipes, não recomenda finalista.
- Não usa adjetivo nem conclusão: registra fato e evidência ("README descreve X; não encontrado no código").
- Não acusa. Plágio e prazo aparecem como "sinal a conferir", com o link para o jurado verificar.
- Não mede "quem commitou quanto" (engana com ferramentas de IA e trabalho em dupla).

## Falharia mesmo funcionando se

- Um jurado lesse o relatório como veredito.
- Uma afirmação sem prova chegasse à página.
- "Não foi possível testar" fosse confundido com "está quebrado".
- Um projeto lento segurasse o relatório dos outros.

## Restrições

- Submissão fecha às 16h00; pitches às 17h00. Janela útil: cerca de 30 minutos.
- O harness é construído hoje, a partir das 11h. A ordem de construção abaixo existe para que cada etapa já seja útil sozinha.
- Código das equipes é desconhecido: toda execução acontece em ambiente isolado, um por equipe, sem acesso a credenciais da organização.
- Não temos as chaves de API das equipes.

## Entrada

A planilha de respostas do formulário "Submissão de Projeto – Hack IA Brasil" (CSV), uma linha por equipe. Colunas reais, conferidas no formulário em 28/11:

| Coluna | Obrigatória | Uso no harness |
|---|---|---|
| Nome do projeto | sim | identifica a equipe e nomeia a pasta |
| Link do repositório público (GitHub) | sim | tudo |
| One-line summary | sim | lista de promessas |
| Descrição do projeto (o que faz, pra quem é, o que foi construído no hackathon) | sim | lista de promessas; credenciais de teste, se a equipe as colocou aqui |
| Link da demo ao vivo | não | teste de uso pelo deploy |
| Track (sendo adicionada ao formulário) | a confirmar | exibida no cabeçalho do relatório |
| Vídeo do pitch, 3 minutos (YouTube não listado, Loom ou Drive) | sim | só o link, exibido no relatório |

O nome do projeto é o nome da equipe (decisão do Joaquim). O formulário não pede a lista de ferramentas, modelos e APIs usados (que a regra do guia manda declarar). Consequências:

- A chave da equipe é o nome do projeto; se repetir ou vier vazio, o endereço do repositório (`dono/nome`).
- A declaração da equipe é o que ela escreveu no README, na descrição do projeto, no resumo em uma linha e nos demais documentos do repositório (decisão do Joaquim). Cada afirmação dali é checada contra o código; ver "Checagem das declarações".
- Credenciais de teste são procuradas no texto da descrição pelo agent. Sem elas, tela de login vira "não foi possível testar: exige login".
- Campo ausente vira "não informado" no relatório; nunca erro.

## Abordagens consideradas

1. **Esteira em etapas (escolhida).** Scripts coletam os fatos das 23 equipes; dois agents por equipe rodam em paralelo; um conferidor valida as citações; sai a página. Relatórios comparáveis, e os fatos de git ficam prontos em minutos mesmo que os agents atrasem.
2. **Um agent por equipe com os scripts como ferramentas.** Mais rápido de construir, mais lento de rodar, e cada relatório sai diferente porque depende do agent lembrar de cada verificação.
3. **Só scripts, agent apenas redigindo.** Descartada: não testa uso nem compara prometido com entregue.

Escolha do Joaquim: opção 1, com a regra "o que dá para medir, script mede; agent só onde precisa ler, interpretar ou usar o produto".

## Desenho

### Etapa 1: ficha de fatos (scripts, sem agent)

Gera `fatos.json` por equipe.

- **Linha do tempo:** primeiro e último commit, commits fora de 9h20–16h00 (horário de Brasília), volume por hora, maiores commits em linhas.
- **Registro do GitHub:** data de criação do repositório, se é fork e de quem, horário dos pushes. Vale mais que a data do commit, que o autor pode forjar.
- **Composição:** linguagens, tamanho, dependências, bibliotecas de IA presentes e arquivos onde são chamadas.
- **Cópia entre equipes:** arquivos iguais ou quase iguais entre os 23 repositórios.
- **Segredos expostos** no repositório.
- **Submissão:** README existe, tem instruções de como rodar, campos preenchidos.
- **Deploy:** o link responde, código e tempo de resposta, captura da tela inicial.
- **Build:** detecta a stack, instala, compila e sobe no ambiente isolado; guarda o log e o passo em que parou.
- **Indícios de fachada:** respostas fixas, dados de exemplo, trechos marcados como pendentes (lista de ocorrências, sem interpretar).

### Etapa 2: agents (dois por equipe, em paralelo)

Cada um recebe `fatos.json` e devolve JSON em formato fixo.

- **Leitor de código.** Extrai as promessas da descrição, do resumo em uma linha, do README e dos documentos do repositório; marca cada uma como encontrada, parcial ou não encontrada. Diz se há chamada real a modelo ou resposta fixa, compara modelos/APIs usados com os declarados, e mapeia os componentes reais contra os descritos.
- **Testador de uso.** Descobre o fluxo principal e o percorre no navegador como usuário, no deploy ou na instância local; tenta entradas inesperadas (vazio, texto enorme, arquivo errado); escreve o "roteiro de 2 minutos" para o jurado repetir. Quando a receita automática de build falha, segue o README à mão.

Toda afirmação de agent cita arquivo e linha, URL ou captura de tela.

### Etapa 3: conferidor (script)

Abre cada citação e confirma que o arquivo, a linha e o trecho existem. Afirmação sem prova válida é removida e contada em "itens descartados".

### Etapa 4: página

Uma página por equipe e um índice, mesma estrutura para todas:

1. Resumo de estados (deploy, build, fluxo principal, IA)
2. Roteiro de 2 minutos
3. Prometido e encontrado
4. Uso de IA
5. Linha do tempo e origem
6. Arquitetura
7. Não foi possível verificar

Cada item tem um de quatro estados: **verificado**, **falhou** (com o erro), **não foi possível testar** (com o motivo, por exemplo "faltou chave para a API X"), **não informado**. O terceiro estado vira item para o jurado validar com a equipe.

### Tempo

- As 23 equipes rodam ao mesmo tempo, cada uma no seu ambiente.
- Cada etapa tem teto de tempo. Estourou: o relatório sai com o que tem e registra "parou em tal passo aos N minutos".
- **Prévia às 15h** com os links de repositório coletados na 2ª mentoria (14h). Às 16h a etapa 1 roda de novo para todas, e os agents só para quem mudou o código desde a prévia.
- A etapa 1 e o leitor de código são a entrega garantida das 16h30. O testador de uso entra à medida que termina; a página mostra "teste em andamento" até lá.

### Ordem de construção

1. Scripts de fatos e página só com eles.
2. Leitor de código e conferidor.
3. Testador de uso.

## Decisões minhas (para o Joaquim conferir)

- Fica em `relatorio-tecnico/` na raiz deste repositório, separado do site.
- Scripts em Node (`.mjs`, sem etapa de build), como os testes que já existem aqui.
- Agents rodam pelo Claude Code em modo não interativo, com saída JSON validada.
- Isolamento: um container Docker por equipe, sem rede para a máquina hospedeira e sem variáveis da organização.
- **Versão analisada:** o último commit até 16h00 (horário do push no GitHub). Leitura de código, build e teste local usam essa versão. Commits posteriores aparecem na linha do tempo como sinal a conferir e não são analisados. O deploy não tem como ser fixado: o relatório registra o horário em que foi testado.
- **Rede e lugar dos agents:** o container tem saída para a internet (instalar dependências, chamar APIs) e nenhuma credencial. Os agents rodam fora do container, na máquina hospedeira. O leitor recebe o repositório montado só para leitura; o testador acessa o projeto pela porta publicada do container e executa comandos nele por `docker exec`. Conteúdo do repositório é tratado como dado, nunca como instrução, e isso consta no prompt dos agents.
- **Acesso ao GitHub:** repositórios públicos, lidos com um token da organização só de leitura. Repositório privado ou inacessível vira "não foi possível testar: repositório sem acesso".

## Fica com quem construir

- Tetos de tempo exatos por etapa e limite de processos simultâneos na máquina.
- Limiar de "quase igual" na comparação entre equipes.
- Lista de bibliotecas de IA reconhecidas.

## Checagem das declarações

Fonte da declaração: README, descrição do projeto, resumo em uma linha, outros documentos do repositório (`docs/`, arquivos `.md`). Fonte da verdade: o código na versão analisada e, quando houve teste, o que o testador observou.

1. O leitor de código quebra os textos em **afirmações verificáveis**, uma por linha, com a citação literal e de onde veio. Três tipos: *funcionalidade* ("gera o laudo em PDF"), *tecnologia* ("usa o modelo X", "banco vetorial Y", "agente com N etapas") e *resultado* ("95% de acerto", "responde em 2 segundos"). Frases de visão ou de mercado não entram.
2. Para cada afirmação, procura a prova no código e classifica:
   - **confirmada**: há código que faz isso, com arquivo e linha.
   - **parcial**: existe uma parte; o relatório diz qual parte existe e qual não.
   - **não encontrada**: procurou e não achou; o relatório lista onde procurou.
   - **contradita**: o código faz outra coisa (declara o modelo X, chama o modelo Y; declara resposta gerada por IA, a resposta é um texto fixo).
   - **não verificável pelo código**: afirmações de resultado sem teste ou dado no repositório que as sustente.
3. No sentido inverso, a ficha de fatos lista as bibliotecas, modelos e serviços externos que o código realmente chama. O que é usado e não foi mencionado em lugar nenhum aparece como **usado e não declarado**.
4. Quando o testador de uso exercitou a funcionalidade, o item ganha um segundo campo, **no uso**: funcionou, falhou ou não foi possível testar. Uma afirmação pode estar confirmada no código e falhar no uso; as duas coisas aparecem.

O relatório nunca usa a palavra "mentira". Mostra a frase da equipe, o que o código tem e o estado.

## Saída

Uma pasta por equipe: `saida/<nome-do-projeto>/` com `relatorio.json`, `capturas/` e `logs/`. O JSON tem estas partes, sempre na mesma ordem:

- `equipe`: nome do projeto, track, repositório, link da demo, vídeo.
- `geracao`: horário, prévia ou final, commit analisado, duração de cada etapa e etapas que estouraram o tempo.
- `resumo`: quatro estados, sem texto: deploy, build, fluxo principal, IA em uso real.
- `roteiro`: passos numerados para o jurado repetir o teste em 2 minutos, com o resultado esperado de cada passo.
- `declaracoes`: lista de afirmações, cada uma com citação, fonte, tipo, estado, estado no uso, evidências e observação factual de uma linha.
- `nao_declarado`: tecnologias usadas pelo código e não mencionadas.
- `uso`: cada passo do teste com ação, resultado observado, captura de tela e, se houve, o erro; inclui os testes com entradas inesperadas.
- `ia`: chamadas a modelo encontradas (arquivo, linha, provedor, modelo), se alguma foi observada em execução, e respostas fixas encontradas.
- `linha_do_tempo`: criação do repositório, fork, primeiro e último commit, commits e pushes fora de 9h20–16h00, maiores commits, volume por hora.
- `origem`: arquivos iguais a outras equipes e trechos com origem externa identificada, com o link.
- `arquitetura`: componentes reais (nome, papel, arquivos) e diferenças em relação ao descrito.
- `higiene`: segredos expostos (só arquivo e linha, nunca o valor) e itens da submissão ausentes.
- `nao_verificado`: tudo que não foi possível testar, com o motivo, para o jurado validar com a equipe.
- `descartados`: quantas afirmações dos agents o conferidor removeu por falta de prova.

Toda evidência tem o mesmo formato: tipo (`arquivo`, `url`, `captura`, `log`), caminho, linha e trecho. Links de arquivo apontam para o GitHub no commit analisado, para o jurado abrir com um clique.

## Mecânica interna

**Orquestrador.** Um comando (`node relatorio-tecnico/rodar.mjs --csv respostas.csv --modo previa|final`) lê a planilha e cria um trabalho por equipe. Cada etapa grava o próprio arquivo em `saida/<projeto>/` e um `estado.json`; rodar de novo retoma de onde parou e pula o que já está pronto. Três filas com limite próprio (scripts, agents, containers). Toda etapa tem teto de tempo e, ao falhar ou estourar, grava um estado em vez de derrubar a equipe.

**Preparação por equipe.** Clone completo do repositório. O horário dos pushes vem da API do GitHub; o commit de corte é o último que chegou até 16h00. A análise roda sobre uma cópia do código nesse commit.

**Scripts de fatos.**
- Linha do tempo: `git log` com contagem de linhas por commit, cruzado com os pushes registrados pelo GitHub (inclusive push forçado).
- Composição: arquivos de dependências e uma lista de bibliotecas e endereços de provedores de IA procurados no código.
- Cópia entre equipes: roda depois que todas foram clonadas; compara arquivos normalizados, ignorando dependências, arquivos gerados e arquivos de trava.
- Segredos: ferramenta de varredura rodando em container; o valor nunca é gravado.
- Deploy: requisição HTTP e captura da tela inicial com navegador sem interface.

**Build em container.** Uma imagem base única, baixada antes das 15h, com Node, Python e os gerenciadores de pacote comuns. Receita: se o repositório tem Dockerfile ou compose, usa o da equipe; senão detecta pelo arquivo de dependências, instala, compila e sobe. Limite de memória e CPU por container, rede própria, nenhuma variável da máquina hospedeira. Variáveis pedidas em `.env.example` são preenchidas com valores falsos para o projeto subir; cada chave falsa é anotada e alimenta "não foi possível testar". As conexões de saída do container são registradas: uma chamada a um provedor de IA durante o teste é a prova de "IA em uso real".

**Leitor de código (agent).** Roda fora do container, com permissão só de leitura e busca na cópia do código, sem terminal e sem internet. Duas passadas: primeiro extrai as afirmações dos textos; depois verifica cada uma no código. Saída em JSON validado pelo orquestrador; saída inválida é pedida de novo uma vez.

**Testador de uso (agent).** Controla um navegador sem interface apontado para o deploy ou para a porta do container. Tem orçamento de ações, tira captura a cada passo e registra as respostas de rede. Para deploy, onde não vemos o servidor, manda duas entradas diferentes e compara as respostas: resposta idêntica é registrada como indício de resposta fixa. Quando o build automático falhou, pode executar comandos dentro do container para seguir o README.

**Conferidor.** Para evidência de arquivo, abre o arquivo no commit de corte e confere se o trecho citado está nas linhas indicadas; para captura, confere se o arquivo existe; para URL, usa o status registrado. Evidência inválida é removida; afirmação que fica sem evidência sai do relatório e entra na contagem de descartados.

**Montagem.** Junta fatos e saídas dos agents, valida contra o formato fixo e grava `relatorio.json` de uma vez, para a plataforma nunca ler um arquivo pela metade.

**Prévia e final.** Às 16h o orquestrador busca os repositórios de novo. Se o commit de corte é o mesmo da prévia, reaproveita a saída dos agents e só refaz a linha do tempo; se mudou, refaz a equipe.

**Vídeo.** Fora do escopo (decisão do Joaquim). O link vai para o relatório como dado da equipe; as afirmações vêm só dos textos.

**Relógios separados (decisão do Joaquim).** O tempo de build não conta no tempo de teste. O build não tem teto total: só é interrompido por inatividade (nenhuma saída no log por alguns minutos) e o relatório registra quanto levou. O relógio do testador começa quando o projeto responde na porta.

**Fluxo longo.** O testador não desiste do fluxo inteiro quando o orçamento acaba. Registra cada passo concluído e, se parar no meio, o item sai como "verificado até o passo N de M", com as capturas, e os passos restantes vão para "não verificado: tempo de teste esgotado". "Não foi possível testar" fica reservado para bloqueio externo: login por terceiro, pagamento, telefone ou e-mail real, arquivo que não temos, chave ausente.

## Operação

Tudo pelo terminal, dentro de `relatorio-tecnico/`.

- `preparar`: confere Docker, acesso ao GitHub e conta do Claude, e baixa a imagem base. Roda uma vez, antes das 15h.
- `rodar --csv <arquivo ou link> --modo previa|final`: processa todas as equipes. `--csv` aceita o arquivo baixado ou o link de exportação CSV da planilha de respostas, para não baixar à mão a cada rodada.
- `rodar --equipe <nome>`: refaz uma equipe só. `--refazer <etapa>` força uma etapa (por exemplo `uso`) sem refazer as outras.
- `status`: mostra a tabela de andamento sem iniciar nada.

Durante a rodada o terminal mostra uma tabela que se atualiza: uma linha por equipe, uma coluna por etapa (fatos, build, leitor, uso, conferidor, relatório), cada célula com aguardando, rodando, pronto, falhou ou tempo esgotado, e o tempo decorrido. Interromper com Ctrl+C não perde nada: o próximo `rodar` retoma.

Resultados em `saida/`:

- `saida/indice.json`: lista das equipes com o estado e o caminho de cada relatório. É o ponto de entrada da plataforma.
- `saida/<projeto>/relatorio.json`, `capturas/`, `logs/`.
- `saida/<projeto>/relatorio.html`: a entrega final de cada equipe (ver "Página final"). `saida/index.html` lista todas.

A entrada no dia é o link CSV publicado da planilha de respostas (decisão do Joaquim); a prévia das 15h usa um CSV reduzido, montado à mão, com nome do projeto e repositório.

### Publicação

- A plataforma dos jurados roda neste mesmo repositório, então os relatórios são publicados na `main` dele (decisão do Joaquim, ciente de que o repositório é público).
- Ficam em `relatorios/<projeto>/` na raiz, **fora de `public/`**: arquivo em `public/` é servido pelo site a qualquer pessoa, sem passar pelo acesso dos jurados. A plataforma lê a pasta no servidor e exibe dentro da área dos jurados.
- `trabalho/` (clones e cópias dos projetos) e as capturas originais ficam no `.gitignore`.
- `publicar` é um comando separado de `rodar`: copia `relatorio.html`, `relatorio.json` e o índice para `relatorios/`, faz um commit por rodada e um push para a `main`. Só roda depois de o Joaquim conferir os relatórios localmente. Cada push dispara um novo deploy do site, que é como a plataforma recebe os relatórios; rodar de novo publica o que mudou.
- Risco aceito: enquanto o repositório for público, qualquer pessoa com o endereço dele lê os relatórios no GitHub, inclusive as equipes. O repositório segue público durante o evento (decisão do Joaquim em 28/11).
- **Capturas:** na página vão comprimidas (largura máxima de 1280 px, formato com perda em qualidade alta), sempre legíveis: o critério é o texto da tela continuar lendo sem esforço. Os agents e o conferidor trabalham sobre as capturas originais, que ficam no Mac em `saida/<projeto>/capturas/` e não são publicadas.

## Página final

Um arquivo HTML por equipe, autossuficiente: estilos embutidos e capturas de tela embutidas no próprio arquivo, para abrir em qualquer lugar e ser incorporado pela plataforma sem depender de outros arquivos.

Segue o padrão visual do site do evento: fundo preto, blocos `#101011` com borda branca a 15% e cantos arredondados, fonte Oxanium no texto e Geist Mono em horários, commits, caminhos de arquivo e contagens, texto branco com hierarquia por opacidade (como em `src/app/jurados/page.tsx`). Tabelas no mesmo estilo da tabela "Relatório técnico" do guia dos jurados.

Os quatro estados são distinguidos por rótulo escrito e por um marcador, nunca só por cor. Não há verde e vermelho: cor de semáforo lê-se como nota. Seções na ordem da lista em "Saída"; evidências abrem o arquivo no GitHub no commit analisado; capturas ampliam ao clicar.

## Lacunas fechadas na revisão final (decisões minhas)

- **Projeto que não é site.** O testador não é só navegador: para API, linha de comando ou bot, testa por requisições e por comandos dentro do container. Aplicativo de celular e bot que exige número de telefone real ficam como "não foi possível testar".
- **Origem externa do código.** Sinais por script: fork, marcas de gerador ou modelo pronto (por exemplo projeto inicial de framework ou de ferramenta de geração de app), commit único muito grande. Além disso, o leitor escolhe alguns trechos característicos e um script os procura na busca de código do GitHub; resultado com data anterior ao evento entra como sinal a conferir, com o link. É melhor esforço: ausência de resultado não prova originalidade, e o relatório diz isso.
- **Deploy alterado depois das 16h.** Às 16h00 um script grava a impressão digital da página inicial e dos arquivos servidos por cada deploy; repete no momento do teste. Diferença aparece na linha do tempo como sinal a conferir.
- **Link de repositório fora do padrão.** Links para branch, pasta ou perfil são normalizados para o repositório. A análise usa o branch padrão; commits em outros branches são listados, não analisados. Projeto dividido em mais de um repositório: só o informado no formulário é analisado, e referências a outros repositórios da equipe são listadas.
- **Trava de linguagem.** Um script recusa textos de agent com palavras de julgamento (lista fixa: mentira, fraude, plágio como afirmação, ótimo, fraco, ruim e afins) e pede reescrita uma vez; se persistir, o texto é removido e fica só o estado com a evidência.
- **Teste do próprio harness.** Antes da prévia, o harness roda em dois ou três repositórios públicos de exemplo, um com deploy e um sem, para acharmos os defeitos dele antes de olhar projeto de equipe.

## Onde roda e onde é lido (decidido pelo Joaquim)

- **Roda no Mac do Joaquim** (10 núcleos, 24 GB; o Docker, via colima, foi ajustado em 28/11 para 8 núcleos e 16 GB, com 65 GB livres em disco). Não cabem 23 projetos subindo ao mesmo tempo, então há três filas com limites diferentes:
  - *Scripts de fatos* (git, GitHub, composição, deploy no ar): não usam container, rodam para as 23 de uma vez.
  - *Agents* (leitor de código; testador de uso em projetos com deploy, que só precisa de navegador): em paralelo até o limite da conta do Claude.
  - *Build e teste local* (só equipes sem deploy): fila de poucos containers por vez. É a única parte que pode não fechar até 16h30.
- **Os jurados leem na plataforma da organização**, que reúne as informações de cada equipe; o relatório é uma das seções. O harness não publica nada: entrega, por equipe, uma pasta com `relatorio.json` em formato fixo e as capturas de tela. O formato desse JSON é o contrato entre os dois trabalhos e é a primeira coisa a fechar. Cada arquivo traz horário de geração e se é prévia ou final. Os jurados só veem a versão final; a prévia das 15h é interna, para testar o harness e adiantar trabalho.
- A entrega é o `relatorio.html` de cada equipe (decisão do Joaquim). O `relatorio.json` continua sendo gerado, como fonte da página e para a plataforma usar se quiser.

## Como ficou construído (28/11, tarde)

Esta seção registra o que mudou em relação ao texto acima durante a construção. Onde houver conflito, vale esta seção. O contrato entre os módulos está em `relatorio-tecnico/CONTRATO.md`.

**Onde os dados ficam.** A pasta de trabalho e a pasta de saída ficam em `~/hack-ia-relatorios/`, fora do repositório do site, com `--dir` para trocar. O `tsconfig` e o servidor de desenvolvimento do site varrem a árvore inteira do repositório, e 23 clones ali dentro atrapalhariam quem constrói a plataforma. O `publicar` continua copiando os relatórios para `relatorios/<projeto>/` no repositório.

**Forma do código.** Cada verificação, build e agent é uma etapa: um arquivo em `relatorio-tecnico/etapas/` que declara o que lê, a fila, o teto de tempo e a sua fatia do relatório. Não existe arquivo de estado. Uma etapa está pronta quando o arquivo de saída dela existe e corresponde às entradas atuais. A página de cada equipe é remontada a cada etapa que termina.

**Sem dependência npm.** O navegador do testador e das capturas roda na imagem `mcr.microsoft.com/playwright/mcp`, fixada por digest. Para projeto local, o navegador entra na rede do container do projeto e acessa `localhost`, sem publicar portas.

**Isolamento de rede.** Dois cuidados que a spec original não tinha:
- Todo link informado por equipe é validado antes de ser aberto. Link que aponta para `localhost`, rede privada ou endereço interno não é aberto, e o deploy sai como `falhou` com esse motivo.
- Todos os containers do harness ficam em redes dentro de `10.213.0.0/16`. Uma regra de firewall na VM do Docker descarta o tráfego dessa faixa para redes privadas. O container alcança a internet e não alcança a máquina de quem opera nem a rede do evento. O `rodar` aplica e prova a regra a cada execução e se recusa a rodar sem ela, salvo com `--sem-isolamento`. O build de um Dockerfile de equipe também roda nessa rede.

**Resumo.** Os quatro estados são Deploy, Build, Fluxo principal e IA no código. O quarto mudou de "IA em uso real" para "IA no código" porque, em projeto com deploy, não há como observar o servidor. Ele fica `verificado` quando o leitor acha pelo menos uma chamada a modelo com evidência. Em teste local, os provedores de IA que o projeto resolveu durante o teste entram como item à parte.

**Build.** Por padrão só roda para equipe cujo deploy não responde (`--build sem-deploy`). `--build todos` força para todas e `--build nenhum` desliga.

**Comandos.**

```
node relatorio-tecnico/preparar.mjs
node relatorio-tecnico/rodar.mjs --csv <arquivo ou link> --modo previa|final
node relatorio-tecnico/rodar.mjs --equipe "Nome" [--refazer <etapa>]
node relatorio-tecnico/status.mjs
node relatorio-tecnico/publicar.mjs [--sem-push]
```

Outras opções do `rodar`: `--inicio` e `--fim` (janela do evento, em ISO), `--agentes` e `--containers` (limites das filas), `--dir`, `--build`, `--sem-isolamento`. Só uma execução por pasta de dados.

**Fora desta primeira versão.**
- Busca de trechos na busca de código do GitHub. Ficam os sinais por script: fork, marcas de projeto gerado, commit único muito grande.
- O testador executar comandos dentro do container para seguir o README quando a receita automática falha, e o teste de projeto que não é site por requisições ou comandos.
- Comparação de arquivos quase iguais entre equipes. Fica a comparação exata sobre conteúdo normalizado.
- Reescrita do texto reprovado pela trava de linguagem. O texto reprovado é removido, e o estado e a evidência ficam.
- Compose. Projeto sem Dockerfile na raiz e sem manifesto reconhecido fica sem build.

## Em aberto

- Limite de agents simultâneos da conta do Claude usada.
