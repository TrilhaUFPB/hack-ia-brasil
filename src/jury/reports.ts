// The technical reports `relatorio-tecnico/publicar.mjs` commits to relatorios/<id>/.
// They stay outside public/ so the only way to read one is the route behind the jury password.

import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { Project } from "./submissions";

export type Report = {
  /** the harness's team id, which is also the folder name */
  id: string;
  name: string;
  /** the repository the harness analysed, as https://github.com/owner/name */
  repo?: string;
};

// Read by a path the bundler can't follow, so next.config.ts names the files the deploy must carry.
export const REPORTS_DIR = "relatorios";
export const reportHref = (id: string) => `/jurados/projetos/relatorio/${id}`;

// the harness builds ids with the same alphabet; anything else never reaches the disk
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A GitHub link, in any of the shapes a team may paste, as "owner/name". */
export function repoKey(link: string): string | undefined {
  const text = link.trim();
  const rest =
    text.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/(.+)$/i)?.[1] ??
    text.match(/^(?:ssh:\/\/)?git@github\.com[:/](.+)$/i)?.[1] ??
    (/^[^\s/:@]+\/[^\s/:@]+$/.test(text) ? text : undefined);
  const [owner, name] = rest?.split(/[?#]/)[0].split("/").filter(Boolean) ?? [];
  return owner && name ? `${owner}/${name.replace(/\.git$/i, "")}`.toLowerCase() : undefined;
}

const nameKey = (name: string) =>
  name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Gives each project the report of its own repository. Two teams may pick the same project name,
 * so the name only decides when neither side has a repository to compare, and only when it is unique.
 */
export function attachReports(projects: Project[], reports: Report[]): Project[] {
  const byRepo = new Map<string, Report>();
  const byName = new Map<string, Report | null>();
  for (const report of reports) {
    const key = report.repo && repoKey(report.repo);
    if (key) byRepo.set(key, report);
    else byName.set(nameKey(report.name), byName.has(nameKey(report.name)) ? null : report);
  }
  return projects.map((project) => {
    const key = repoKey(project.repo);
    const report = key ? byRepo.get(key) : byName.get(nameKey(project.name));
    return report ? { ...project, report: reportHref(report.id) } : project;
  });
}

/** Every published report. A folder without both files, or with a JSON that isn't a report, is skipped. */
export async function readReports(dir = path.join(process.cwd(), REPORTS_DIR)): Promise<Report[]> {
  const entries = await readdir(/*turbopackIgnore: true*/ dir, { withFileTypes: true }).catch(() => []);
  const ids = entries.filter((entry) => entry.isDirectory() && ID.test(entry.name)).map((entry) => entry.name);
  const reports = await Promise.all(
    ids.sort().map(async (id): Promise<Report | undefined> => {
      try {
        const { equipe } = JSON.parse(await readFile(/*turbopackIgnore: true*/ path.join(dir, id, "relatorio.json"), "utf8"));
        await stat(/*turbopackIgnore: true*/ path.join(dir, id, "relatorio.html"));
        if (typeof equipe?.nome !== "string") return undefined;
        return { id, name: equipe.nome, repo: typeof equipe.repo === "string" ? equipe.repo : undefined };
      } catch {
        return undefined;
      }
    }),
  );
  return reports.filter((report) => report !== undefined);
}

/** The report page of one team, streamed from disk, or undefined when there is none. */
export async function openReport(id: string, dir = path.join(process.cwd(), REPORTS_DIR)) {
  if (!ID.test(id)) return undefined;
  const file = path.join(dir, id, "relatorio.html");
  const info = await stat(/*turbopackIgnore: true*/ file).catch(() => undefined);
  if (!info?.isFile()) return undefined;
  return { size: info.size, body: Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ file)) as ReadableStream<Uint8Array> };
}
