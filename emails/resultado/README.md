# E-mails de resultado · Hack IA Brasil

Cada template tem um `.html` e um `.txt` com o mesmo conteúdo. Enviar os dois juntos (multipart/alternative). `index.html` mostra os quatro com valores de exemplo; `previews/` tem capturas em 600px e 375px.

| Arquivo | Assunto | Placeholders |
|---|---|---|
| `time-aprovado` | Hack IA Brasil: o time de vocês foi aprovado | `{nomes_do_time}`, `{data_limite}` |
| `time-recusado` | Hack IA Brasil: resultado da inscrição | `{nomes_do_time}` |
| `individual-aprovado` | Hack IA Brasil: você foi aprovado(a) | `{primeiro_nome}`, `{data_limite}` |
| `individual-recusado` | Hack IA Brasil: resultado da inscrição | `{primeiro_nome}` |

## Placeholders

Substituição simples de texto (no `.html` e no `.txt`):

- `{primeiro_nome}`: primeiro nome de quem se inscreveu sozinho. Ex.: `Lívia`.
- `{nomes_do_time}`: primeiros nomes de todos do time, já juntos pelo script com vírgula e "e". Ex.: `Lívia, Rafael e Júlia`.
- `{data_limite}`: prazo de confirmação, como vai aparecer na frase "Confirmem a presença até …". Ex.: `quarta, 25/11, às 18h`.

No HTML, escapar `&`, `<` e `>` nos valores antes de substituir. Nos templates de time, `{primeiro_nome}` não é usado: o e-mail é endereçado ao time todo.

## Envio

- Reply-To: `hackathon@otrilha.com`. A confirmação é por resposta ao e-mail; o botão abre um `mailto:` com o assunto "Confirmação · Hack IA Brasil" e o corpo "Confirmamos" / "Confirmo".
- Nos aprovados de time, mandar para todos do time (ou para o representante com os outros em cópia), já que o texto fala com "vocês".

## Estado: estacionado

Estes templates ainda não são usados pelo site nem pela planilha. Antes de enviar:

- Definir `{data_limite}` (sugestão: quarta, 25/11, às 18h, com resultados até segunda, 23/11) e se haverá lista de espera.
- Mandar um teste para a própria equipe e conferir no Gmail, no Outlook e no Apple Mail (só foram vistos em Chrome).
- Decidir se o envio é manual ou por um menu "Hack IA → Enviar resultado" no script da planilha (`scripts/google-sheets.gs`).

Textos de origem: [E-mails de resultado](https://claude.ai/artifact/Sw5GQZFqLWDc9mY1WkPJVC) e [Termo de autorização](https://claude.ai/artifact/JT4RQNtncYnPRys1ofzeLt).
