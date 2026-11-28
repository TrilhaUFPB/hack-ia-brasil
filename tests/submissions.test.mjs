import assert from "node:assert/strict";
import { test } from "node:test";
import { toProjects, videoEmbed } from "../src/jury/submissions.ts";

const csv = [
  "Carimbo de data/hora,Endereço de e-mail,Imagem de capa do projeto,Nome do projeto,Track escolhida,Link do repositório público,One-line summary (use o Devin para escrever!),Descrição do projeto,Link da demo ao vivo,Vídeo do pitch (3 minutos),Pergunta nova",
  '28/11/2026 15:01,a@b.com,https://drive.google.com/open?id=abc_123-X,Saúde Já,Saúde,https://github.com/x/y,"Triagem, rápida",' +
    '"Linha 1\r\nLinha 2 com ""aspas""",,https://youtu.be/dQw4w9WgXcQ,extra',
  "28/11/2026 15:02,c@d.com,,Escola+,Educação,https://github.com/z/w,Resumo,Desc,https://demo.app,https://loom.com/share/abc123,",
  ",,,,,,,,,,",
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
  assert.ok(!JSON.stringify(a).includes("a@b.com"), "e-mail não sai do servidor");

  assert.equal(b.track, "Educação");
  assert.equal(b.cover, undefined);
  assert.equal(b.demo, "https://demo.app");
});

test("embute YouTube e Loom, deixa o resto como link", () => {
  assert.equal(videoEmbed("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("https://www.loom.com/share/abc123"), "https://www.loom.com/embed/abc123");
  assert.equal(videoEmbed("https://drive.google.com/file/d/x/view"), undefined);
});
