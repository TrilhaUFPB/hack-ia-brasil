// Parses the Google Form responses sheet, published as CSV, into the projects the jury sees.
// Only the fields below leave the server: the respondent e-mail the form records is dropped here.

export type Project = {
  id: string;
  name: string;
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
const COLUMNS = {
  submittedAt: "carimbo de data/hora",
  cover: "imagem de capa",
  name: "nome do projeto",
  track: "track",
  repo: "repositório",
  summary: "one-line summary",
  description: "descrição do projeto",
  demo: "link da demo",
  video: "vídeo do pitch",
  report: "relatório técnico",
} as const;

/** Form uploads arrive as Drive links; the uploads folder must be shared as "anyone with the link". */
export function driveImage(url: string): string | undefined {
  const id = url.match(/[?&]id=([\w-]+)/)?.[1] ?? url.match(/\/d\/([\w-]+)/)?.[1];
  return id ? `https://lh3.googleusercontent.com/d/${id}=w1200` : undefined;
}

function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function toProjects(csv: string): Project[] {
  const [header = [], ...rows] = parseCsv(csv);
  const titles = header.map((h) => h.trim().toLowerCase());
  const col = Object.fromEntries(
    Object.entries(COLUMNS).map(([key, title]) => [key, titles.findIndex((t) => t.includes(title))]),
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
    });
}

/** YouTube and Loom links become an embeddable player URL; anything else stays a plain link. */
export function videoEmbed(url: string): string | undefined {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)?.[1];
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;
  const loom = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/)?.[1];
  if (loom) return `https://www.loom.com/embed/${loom}`;
  return undefined;
}
