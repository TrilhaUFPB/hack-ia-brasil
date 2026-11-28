// Parses the Google Form responses sheet, published as CSV, into the projects the jury sees.
// Only the fields below leave the server: the respondent e-mail the form records is dropped here.

export type Project = {
  id: string;
  name: string;
  /** "Número do grupo", as the team typed it; absent when the answer has no number */
  group?: number;
  track: string;
  repo: string;
  summary: string;
  description: string;
  demo?: string;
  video: string;
  cover?: string;
  /** a URL or raw HTML; rendered sandboxed, so its scripts can't reach the panel */
  report?: string;
  /** the sheet's own timestamp, as Google writes it */
  submittedAt?: string;
};

/** RFC 4180 CSV: quoted fields may hold commas, quotes ("") and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Columns are found by question title, so the form can gain questions without breaking this.
// A pattern stands where the title has already been reworded once.
const COLUMNS = {
  submittedAt: "carimbo de data/hora",
  cover: "imagem de capa",
  name: "nome do projeto",
  group: /n[úu]mero d[oa] (?:grupo|equipe|time)/,
  track: "track",
  repo: "repositório",
  summary: "one-line summary",
  description: "descrição do projeto",
  demo: "link da demo",
  // was "Vídeo do pitch", now "Vídeo da demo e pitch"
  video: /v[íi]deo d[oa] (?:demo|pitch)/,
  report: "relatório técnico",
} as const;

/** The form takes free text here: "7", "07" and "Grupo 7" are all group 7. */
export function groupNumber(answer: string): number | undefined {
  const n = Number(answer.match(/(?<!\d)\d{1,3}(?!\d)/)?.[0]);
  return n > 0 ? n : undefined;
}

/** Form uploads arrive as Drive links; the uploads folder must be shared as "anyone with the link". */
export function driveImage(url: string): string | undefined {
  const id = url.match(/[?&]id=([\w-]+)/)?.[1] ?? url.match(/\/d\/([\w-]+)/)?.[1];
  return id ? `https://lh3.googleusercontent.com/d/${id}=w1200` : undefined;
}

function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Submissions the jury must not see, by a word of the project name. The row stays in the sheet.
const HIDDEN = ["orbis"];

const isHidden = (name: string) => slug(name).split("-").some((word) => HIDDEN.includes(word));

export function toProjects(csv: string): Project[] {
  const [header = [], ...rows] = parseCsv(csv);
  const titles = header.map((h) => h.trim().toLowerCase());
  const col = Object.fromEntries(
    Object.entries(COLUMNS).map(([key, title]) => [
      key,
      titles.findIndex((t) => (typeof title === "string" ? t.includes(title) : title.test(t))),
    ]),
  ) as Record<keyof typeof COLUMNS, number>;
  const get = (row: string[], key: keyof typeof COLUMNS) => (col[key] < 0 ? "" : (row[col[key]] ?? "").trim());

  return rows
    .filter((row) => get(row, "name"))
    .map((row, i) => {
      const name = get(row, "name");
      // a re-upload can leave several links in one cell: use the first
      const coverLink = get(row, "cover").split(/[,\s]+/)[0];
      return {
        id: `${slug(name) || "projeto"}-${i + 1}`,
        name,
        group: groupNumber(get(row, "group")),
        track: get(row, "track"),
        repo: get(row, "repo"),
        summary: get(row, "summary"),
        description: get(row, "description"),
        demo: get(row, "demo") || undefined,
        video: get(row, "video"),
        cover: coverLink ? driveImage(coverLink) : undefined,
        report: get(row, "report") || undefined,
        submittedAt: get(row, "submittedAt") || undefined,
      };
    })
    // after the ids are numbered, so hiding one project doesn't renumber the others
    .filter((project) => !isHidden(project.name));
}

// Submissions the sheet never got: the form froze at 16:04, when this team sent it, and only
// reopened at 16:07. The team sent the same answers to the organizers instead.
const OUTSIDE_THE_FORM: Project[] = [
  {
    id: "lookout-fora-do-forms",
    name: "Lookout",
    group: 9,
    track: "Segurança",
    repo: "https://github.com/PMGmenegon/Lookout",
    summary:
      "Lookout usa o Gemini para ler relatos de golpe Pix, com texto e prints, confere cada dado no relato e liga os casos do mesmo golpista entre bancos para o analista revisar.",
    description:
      "Lookout: copiloto de IA que transforma o relato de uma vítima de golpe de Pix em ficha estruturada e liga o caso a outros do mesmo golpista, inclusive em outros bancos.",
    demo: "https://lookout-drab.vercel.app",
    video: "https://youtu.be/j8CByk8MYo8",
    cover: "/jurados/lookout.png",
    submittedAt: "28/11/2026 16:04:00",
  },
];

/**
 * The sheet's projects, then the ones sent outside the form. The organizers confirmed those by
 * hand, so a sheet row with the same name, which anyone can type, leaves the panel instead.
 */
export function withOutsideTheForm(projects: Project[], outside = OUTSIDE_THE_FORM): Project[] {
  const names = new Set(outside.map((project) => slug(project.name)));
  return [...projects.filter((project) => !names.has(slug(project.name))), ...outside];
}

/** YouTube and Loom links become an embeddable player URL; anything else stays a plain link. */
export function videoEmbed(url: string): string | undefined {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)?.[1];
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;
  const loom = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/)?.[1];
  if (loom) return `https://www.loom.com/embed/${loom}`;
  return undefined;
}
