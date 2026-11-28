import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { attachReports, openReport, readReports, repoKey } from "../src/jury/reports.ts";

const project = (name, repo, report) => ({ id: name, name, track: "", repo, summary: "", description: "", video: "", report });

async function published(teams) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "relatorios-"));
  for (const [id, { json, html }] of Object.entries(teams)) {
    await mkdir(path.join(dir, id), { recursive: true });
    if (json !== undefined) await writeFile(path.join(dir, id, "relatorio.json"), typeof json === "string" ? json : JSON.stringify(json));
    if (html !== undefined) await writeFile(path.join(dir, id, "relatorio.html"), html);
  }
  return dir;
}

test("reconhece o mesmo repositório em qualquer forma de link", () => {
  for (const link of [
    "https://github.com/Time/Projeto",
    "github.com/time/projeto.git",
    " https://www.github.com/time/projeto/tree/main/src?tab=readme#uso ",
    "git@github.com:time/projeto.git",
    "time/projeto",
  ]) assert.equal(repoKey(link), "time/projeto", link);
  assert.equal(repoKey("https://gitlab.com/time/projeto"), undefined);
  assert.equal(repoKey("https://github.com/time"), undefined);
  assert.equal(repoKey(""), undefined);
});

test("cada projeto recebe o relatório do próprio repositório", () => {
  const reports = [
    { id: "saude-ja", name: "Saúde Já", repo: "https://github.com/x/y" },
    { id: "z-w", name: "Escola+", repo: "https://github.com/z/w" },
  ];
  const [a, b, c] = attachReports(
    [
      project("Saúde Já (versão nova)", "https://github.com/X/Y/tree/main"),
      project("Escola+", "https://github.com/z/w.git", "https://planilha.example/antigo.html"),
      project("Sem relatório", "https://github.com/q/r", "https://planilha.example/manual.html"),
    ],
    reports,
  );
  assert.equal(a.report, "/jurados/projetos/relatorio/saude-ja");
  assert.equal(b.report, "/jurados/projetos/relatorio/z-w", "o publicado vale mais que o link da planilha");
  assert.equal(c.report, "https://planilha.example/manual.html", "sem publicado, fica o da planilha");
});

test("nome igual não entrega o relatório de outra equipe", () => {
  const reports = [{ id: "saude", name: "Saúde+", repo: "https://github.com/a/saude" }];
  const [other] = attachReports([project("Saúde+", "https://github.com/b/saude")], reports);
  assert.equal(other.report, undefined);
});

test("sem repositório dos dois lados, casa pelo nome quando ele é único", () => {
  const reports = [
    { id: "triagem", name: "Triagem  Rápida" },
    { id: "eco", name: "Eco" },
    { id: "eco-2", name: "eco" },
  ];
  const [a, b] = attachReports([project("triagem rápida", "https://drive.google.com/x"), project("Eco", "")], reports);
  assert.equal(a.report, "/jurados/projetos/relatorio/triagem");
  assert.equal(b.report, undefined, "dois relatórios com o mesmo nome: nenhum é escolhido");
});

test("lê a pasta publicada e ignora o que não é relatório inteiro", async () => {
  const dir = await published({
    "saude-ja": { json: { equipe: { id: "saude-ja", nome: "Saúde Já", repo: "https://github.com/x/y" } }, html: "<!doctype html><p>ok" },
    "sem-repo": { json: { equipe: { id: "sem-repo", nome: "Sem Repo", repo: null } }, html: "<p>" },
    "so-json": { json: { equipe: { id: "so-json", nome: "Só JSON", repo: null } } },
    quebrado: { json: "{", html: "<p>" },
    "Fora do Padrão": { json: { equipe: { nome: "X" } }, html: "<p>" },
  });
  await writeFile(path.join(dir, "indice.json"), "{}");
  assert.deepEqual(await readReports(dir), [
    { id: "saude-ja", name: "Saúde Já", repo: "https://github.com/x/y" },
    { id: "sem-repo", name: "Sem Repo", repo: undefined },
  ]);
  assert.deepEqual(await readReports(path.join(dir, "nao-existe")), []);
});

test("entrega a página de uma equipe e nada fora da pasta dela", async () => {
  const dir = await published({ "saude-ja": { json: {}, html: "<!doctype html><p>relatório" } });
  await writeFile(path.join(dir, "relatorio.html"), "fora");
  const report = await openReport("saude-ja", dir);
  assert.equal(await new Response(report.body).text(), "<!doctype html><p>relatório");
  assert.equal(report.size, Buffer.byteLength("<!doctype html><p>relatório"));
  for (const id of ["nao-existe", "..", ".", "", "saude-ja/..", "../saude-ja", "%2e%2e", "Saude-Ja"]) {
    assert.equal(await openReport(id, dir), undefined, id);
  }
});
