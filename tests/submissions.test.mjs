import assert from "node:assert/strict";
import { test } from "node:test";
import { groupNumber, toProjects, videoEmbed, withOutsideTheForm } from "../src/jury/submissions.ts";
import { attachReports } from "../src/jury/reports.ts";

const csv = [
  "Carimbo de data/hora,Endereço de e-mail,Imagem de capa do projeto,Nome do projeto,Track escolhida,Link do repositório público,One-line summary (use o Devin para escrever!),Descrição do projeto,Link da demo ao vivo,Vídeo do pitch (3 minutos),Pergunta nova,Relatório técnico",
  '28/11/2026 15:01,a@b.com,https://drive.google.com/open?id=abc_123-X,Saúde Já,Saúde,https://github.com/x/y,"Triagem, rápida",' +
    '"Linha 1\r\nLinha 2 com ""aspas""",,https://youtu.be/dQw4w9WgXcQ,extra,https://r.example/saude.html',
  "28/11/2026 15:02,c@d.com,,Escola+,Educação,https://github.com/z/w,Resumo,Desc,https://demo.app,https://loom.com/share/abc123,,",
  ",,,,,,,,,,,",
].join("\r\n");

test("lê respostas do form pelo título das perguntas", () => {
  const [a, b, ...rest] = toProjects(csv);
  assert.equal(rest.length, 0, "linha vazia descartada");

  assert.equal(a.id, "saude-ja-1");
  assert.equal(a.summary, "Triagem, rápida");
  assert.equal(a.description, 'Linha 1\r\nLinha 2 com "aspas"');
  assert.equal(a.cover, "https://lh3.googleusercontent.com/d/abc_123-X=w1200");
  assert.equal(a.demo, undefined);
  assert.equal(a.submittedAt, "28/11/2026 15:01");
  assert.equal(a.report, "https://r.example/saude.html");
  assert.ok(!JSON.stringify(a).includes("a@b.com"), "e-mail não sai do servidor");

  assert.equal(b.track, "Educação");
  assert.equal(b.cover, undefined);
  assert.equal(b.demo, "https://demo.app");
  assert.equal(b.report, undefined);
});

// The question titles as the form had them on 28/11/2026 at 15:20, line breaks included.
const liveHeader = [
  "Carimbo de data/hora",
  "Endereço de e-mail",
  "Nome do projeto",
  "Imagem de capa do projeto (Ela vai aparecer no card do projeto na página do evento.)",
  "Track escolhida",
  '"Link do repositório público\nlink do GitHub. O repositório precisa estar público."',
  "One-line summary (use o Devin para escrever!)",
  '"Descrição do projeto\n(O que faz, pra quem é e o que vocês construíram durante o hackathon.)"',
  '"Link da demo ao vivo\nse o projeto estiver no ar, coloque o link aqui. Garanta que ele funcione sem login ou mande credenciais de teste na descrição."',
  "Final Pitch Slides",
  '"Vídeo da demo e pitch(3 minutos)\n\nlink do YouTube (não listado), Loom ou Google Drive com acesso liberado pra ""qualquer pessoa com o link.\n\nVocê tem 3 minutos pra nos convencer."',
  "Número do grupo",
].join(",");

test("lê o formulário atual: número do grupo e vídeo da demo e pitch", () => {
  const row = (name, group) =>
    `28/11/2026 15:40:00,a@b.com,${name},,Saúde,https://github.com/x/y,Resumo,Descrição,https://demo.app,https://drive.google.com/open?id=slides,https://youtu.be/dQw4w9WgXcQ,${group}`;
  const [a, b, c] = toProjects([liveHeader, row("Laudo", "Grupo 07"), row("Atlas", "12"), row("Puca", "sete")].join("\r\n"));

  assert.equal(a.group, 7);
  assert.equal(b.group, 12);
  assert.equal(c.group, undefined);
  assert.equal(a.video, "https://youtu.be/dQw4w9WgXcQ", "o vídeo não é o upload de slides");
  assert.equal(a.repo, "https://github.com/x/y");
  assert.equal(a.description, "Descrição");
  assert.equal(a.demo, "https://demo.app");
  assert.equal(a.track, "Saúde");
});

test("o projeto Orbis não chega ao painel, e os outros mantêm o id", () => {
  const row = (name) => `28/11/2026 15:40:00,a@b.com,${name},,Saúde,https://github.com/x/y,Resumo,Descrição,,,https://youtu.be/dQw4w9WgXcQ,1`;
  const projects = toProjects([liveHeader, row("Laudo"), row("Orbis"), row("The ORBIS App"), row("Orbisar"), row("Atlas")].join("\r\n"));
  assert.deepEqual(projects.map((p) => p.id), ["laudo-1", "orbisar-4", "atlas-5"]);
});

test("lê o número do grupo como a equipe digitou", () => {
  for (const [answer, group] of [["7", 7], ["07", 7], [" Grupo 12 ", 12], ["G-3", 3]]) assert.equal(groupNumber(answer), group, answer);
  for (const answer of ["", "sete", "0", "2026"]) assert.equal(groupNumber(answer), undefined, answer);
});

test("embute YouTube e Loom, deixa o resto como link", () => {
  assert.equal(videoEmbed("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("https://www.loom.com/share/abc123"), "https://www.loom.com/embed/abc123");
  assert.equal(videoEmbed("https://drive.google.com/file/d/x/view"), undefined);
});

test("a Lookout, que o forms não gravou, entra depois da planilha e recebe o relatório do próprio repositório", () => {
  const row = (name) => `28/11/2026 15:40:00,a@b.com,${name},,Saúde,https://github.com/x/y,Resumo,Descrição,,,https://youtu.be/dQw4w9WgXcQ,1`;
  const projects = withOutsideTheForm(toProjects([liveHeader, row("Laudo")].join("\r\n")));
  assert.deepEqual(projects.map((p) => p.name), ["Laudo", "Lookout"]);
  const lookout = projects[1];
  assert.equal(lookout.group, 9);
  assert.equal(lookout.track, "Segurança");
  assert.equal(videoEmbed(lookout.video), "https://www.youtube-nocookie.com/embed/j8CByk8MYo8");

  const [, withReport] = attachReports(projects, [{ id: "lookout", name: "Lookout", group: 9, repo: "https://github.com/PMGmenegon/Lookout" }]);
  assert.equal(withReport.report, "/jurados/projetos/relatorio/lookout");
});

test("quando a planilha já traz a Lookout, ela não aparece duas vezes", () => {
  const row = (name) => `28/11/2026 16:30:00,a@b.com,${name},,Segurança,https://github.com/PMGmenegon/Lookout,Resumo,Descrição,,,https://youtu.be/dQw4w9WgXcQ,9`;
  const projects = withOutsideTheForm(toProjects([liveHeader, row("LookOut")].join("\r\n")));
  assert.deepEqual(projects.map((p) => p.id), ["lookout-1"]);
});
