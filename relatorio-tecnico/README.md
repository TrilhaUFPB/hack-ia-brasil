# Como gerar os relatórios técnicos no dia do evento

Este guia é para quem opera o harness. O que o relatório contém e por quê está na [spec](../docs/superpowers/specs/2026-11-28-relatorio-tecnico-design.md). Como os módulos se encaixam está no [contrato interno](CONTRATO.md).

Rode os comandos a partir da raiz do repositório.

## Prepare a máquina antes das 15h

```bash
colima start --cpu 8 --memory 16
node relatorio-tecnico/preparar.mjs
```

O `preparar` confere Node, git, GitHub, Docker, Claude e as duas imagens, e aplica o isolamento de rede. Cada linha sai com `ok` ou `FALTA`, e a linha com `FALTA` diz o que fazer. Rode de novo até a última linha dizer `Tudo pronto para rodar.`

## Rode a prévia às 15h

Monte um CSV com os links coletados na 2ª mentoria. Duas colunas bastam:

```csv
nome,repositorio
Nome do Projeto,https://github.com/dono/repo
```

```bash
node relatorio-tecnico/rodar.mjs --csv previa.csv --modo previa
```

O terminal mostra uma linha por equipe e uma coluna por fase. A última linha da saída é o caminho de `index.html`. Abra esse arquivo no navegador e confira os relatórios.

A prévia serve para achar problema no harness e para deixar os repositórios clonados. Ela não é publicada.

## Rode a versão final às 16h

No Google Planilhas, publique a planilha de respostas do formulário em **Arquivo → Compartilhar → Publicar na Web**, no formato CSV, e use o link:

```bash
node relatorio-tecnico/rodar.mjs --csv "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv" --modo final
```

O harness analisa o último commit que chegou ao GitHub até as 16h00. Commits posteriores aparecem na linha do tempo como sinal a conferir e não são analisados.

Se você interromper com Ctrl+C ou a máquina travar, rode o mesmo comando de novo. O harness retoma de onde parou e não repete o que já terminou.

## Refaça uma equipe

Quando uma equipe corrigir o link ou mandar uma credencial de teste, baixe a planilha de novo com `--csv` e limite a execução a ela:

```bash
node relatorio-tecnico/rodar.mjs --csv "<link>" --modo final --equipe "Nome do Projeto"
```

Para forçar uma fase mesmo sem mudança nas entradas, acrescente `--refazer <etapa>`. As etapas são `corte`, `github`, `linha-do-tempo`, `composicao`, `segredos`, `submissao`, `fachada`, `deploy`, `copia`, `build`, `promessas`, `leitor` e `uso`.

Para ver o andamento sem iniciar nada:

```bash
node relatorio-tecnico/status.mjs
```

## Confira antes de publicar

```bash
node relatorio-tecnico/auditar.mjs
```

O `auditar` reabre cada evidência dos relatórios por um caminho independente: relê o trecho no git, no commit analisado, e procura cada captura no disco. Ele sai com código 1 e lista o que não bater.

## Publique

Na branch `main`, com o repositório atualizado:

```bash
node relatorio-tecnico/publicar.mjs
```

O `publicar` copia `relatorio.html` e `relatorio.json` de cada equipe para `relatorios/<projeto>/`, cria um commit só com essa pasta e envia para a `main`. Ele recusa relatórios de prévia e recusa rodar fora da `main`. Use `--sem-push` para criar o commit sem enviar.

Se testes de uso terminarem depois, rode `rodar` e `publicar` de novo. Só o que mudou entra no novo commit.

## Onde ficam os arquivos

Tudo fica em `~/hack-ia-relatorios/`, fora do repositório. Use `--dir <pasta>` para trocar.

| Caminho | Conteúdo |
|---|---|
| `saida/index.html` | lista das equipes, em ordem alfabética |
| `saida/<projeto>/relatorio.html` | o relatório, em um arquivo só |
| `saida/<projeto>/relatorio.json` | os mesmos dados, para a plataforma |
| `saida/<projeto>/logs/<etapa>.log` | o que cada etapa fez, com horário |
| `saida/<projeto>/capturas/` | capturas de tela originais |
| `trabalho/<projeto>/` | clone do repositório e saída bruta dos agents |

## Ajuste a velocidade

| Opção | Padrão | Efeito |
|---|---|---|
| `--agentes <n>` | 6 | quantos agents rodam ao mesmo tempo. Suba até a conta do Claude começar a recusar chamadas. |
| `--containers <n>` | 3 | quantos projetos sobem ao mesmo tempo |
| `--build todos` | `sem-deploy` | também instala e sobe o projeto de quem tem deploy |
| `RT_MODELO_LEITOR=sonnet` | `opus` | modelo do leitor de código |

No repositório de exemplo, com 19 declarações, o leitor de código levou 4 min 47 s com `opus` e 2 min 38 s com `sonnet`. Nas 13 declarações que as duas rodadas extraíram com o mesmo texto, os dois modelos chegaram ao mesmo estado.

## Quando algo dá errado

**`Isolamento de rede inativo`.** O `rodar` se recusa a iniciar sem a regra de firewall que impede os containers de alcançar esta máquina e a rede local. Rode `preparar.mjs`. A regra some quando a máquina virtual do Docker reinicia, e o `preparar` e o `rodar` a aplicam de novo.

**Uma célula mostra `falhou` ou `tempo esgotado`.** Abra `saida/<projeto>/logs/<etapa>.log`. O relatório da equipe sai mesmo assim, e a fase que não terminou aparece em "Não foi possível verificar", com o motivo. Para tentar de novo, use `--equipe` com `--refazer <etapa>`.

**`Já existe uma execução em andamento nesta pasta`.** Só uma execução por pasta de dados. Espere a outra terminar ou interrompa com Ctrl+C.

**O `publicar` diz que o push foi recusado.** Alguém enviou outro commit para a `main`. Rode `git pull --rebase origin main` e depois `publicar` de novo. O commit com os relatórios fica guardado.

## Rode os testes

```bash
node --test relatorio-tecnico/testes/*.test.mjs
```

Os testes que chamam o Claude de verdade ficam desligados. Para ligar, defina `RT_AGENTES_REAL=1`.
