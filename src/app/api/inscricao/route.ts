import { MAX_OTHERS, MIN_OTHERS, MODES, isMinor, type Application, type Person } from "@/lib/application";

// Forwards a validated application to the Google Sheets web app (scripts/google-sheets.gs).
// The sheet URL and secret stay server-side, so the public page can't write to the sheet directly.

const MAX_LEN = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sheets runs cells starting with = + - @ as formulas; prefix with ' so they stay text
const cell = (v: unknown) => {
  const s = Array.isArray(v) ? v.join(", ") : String(v ?? "").trim().slice(0, MAX_LEN);
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
};

function personErrors(p: Person, who: string): string[] {
  const e: string[] = [];
  if (!p.name?.trim()) e.push(`${who}: nome`);
  if (!EMAIL.test(p.email ?? "")) e.push(`${who}: e-mail`);
  const age = Number(p.age);
  if (!(age >= 12 && age <= 25)) e.push(`${who}: idade`);
  if (!p.stage) e.push(`${who}: momento atual`);
  return e;
}

const personCols = (p: Person, prefix: string) => ({
  [`${prefix}nome`]: p.name,
  [`${prefix}email`]: p.email,
  [`${prefix}idade`]: p.age,
  [`${prefix}momento`]: p.stage,
  [`${prefix}instituicao`]: p.school,
  [`${prefix}projeto`]: p.project,
});

export async function POST(req: Request) {
  let a: Application;
  try {
    a = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (a.website) return Response.json({ ok: true }); // bot: pretend it worked

  const isTeam = a.mode === "time";
  const members = isTeam ? (a.team?.members ?? []) : [];
  const errors = [
    ...personErrors(a.me, "você"),
    ...members.flatMap((m, i) => personErrors(m, `membro ${i + 2}`)),
  ];
  if (!MODES.some((m) => m.v === a.mode)) errors.push("modalidade");
  if (isTeam && (members.length < MIN_OTHERS || members.length > MAX_OTHERS)) errors.push("tamanho do time");
  if (isMinor(a.me.age) && !a.me.guardianPhone?.trim()) errors.push("responsável");
  if (!a.challenge?.trim() || !a.fellowship?.trim() || !a.me.project?.trim()) errors.push("respostas");
  if (!a.available || !a.consent) errors.push("confirmações");
  if (errors.length) return Response.json({ error: `Campos inválidos: ${errors.join(", ")}` }, { status: 400 });

  const row: Record<string, unknown> = {
    enviado_em: new Date().toISOString(),
    modalidade: a.mode,
    tamanho: 1 + members.length,
    ...personCols(a.me, ""),
    whatsapp: a.me.whatsapp,
    cidade: a.me.city,
    responsavel_nome: a.me.guardianName,
    responsavel_whatsapp: a.me.guardianPhone,
    desafio: a.challenge,
    time_plano: isTeam ? a.team.plan : "",
    papel_no_time: isTeam ? "" : a.role,
    fellowship: a.fellowship,
    como_soube: a.source,
  };
  for (let i = 0; i < MAX_OTHERS; i++) {
    Object.assign(row, personCols(members[i] ?? ({} as Person), `m${i + 2}_`));
  }
  const clean = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, cell(v)]));

  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[inscricao] SHEETS_WEBHOOK_URL not set, would send:", clean);
      return Response.json({ ok: true, dev: true });
    }
    return Response.json({ error: "Inscrições indisponíveis" }, { status: 503 });
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.SHEETS_SECRET, row: clean }),
    });
    const out = await r.json().catch(() => null);
    if (!out?.ok) throw new Error(`sheet answered ${r.status} ${JSON.stringify(out)}`);
  } catch (err) {
    console.error("[inscricao] sheet write failed", err, clean);
    return Response.json({ error: "Falha ao salvar" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
