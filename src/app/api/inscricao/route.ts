import { EVENT } from "@/content";
import { MAX_AGE, MAX_OTHERS, MIN_AGE, MIN_OTHERS, MODES, SOURCES, STAGES, UFS, ageOf, isMinor, type Application, type Person } from "@/lib/application";

// Forwards a validated application to the Google Sheets web app (scripts/google-sheets.gs).
// The sheet URL and secret stay server-side, so the public page can't write to the sheet directly.

const MAX_LEN = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sheets runs cells starting with = + - @ as formulas; prefix with ' so they stay text
const cell = (v: unknown) => {
  const s = Array.isArray(v) ? v.join(", ") : String(v ?? "").trim().slice(0, MAX_LEN);
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
// optional fields may be missing, but never a non-string (would crash .trim()/.replace())
const badTypes = (o: Record<string, unknown>, keys: string[]) => keys.some((k) => o[k] != null && typeof o[k] !== "string");
const PERSON_KEYS = ["name", "email", "birth", "stage", "school", "links", "project", "guardianName", "guardianEmail"];
const STAGE_VALUES = STAGES.map((s) => s.v);
const SOURCE_VALUES = SOURCES.map((s) => s.v);

function personErrors(p: Person, who: string): string[] {
  const e: string[] = [];
  if (!p.name?.trim()) e.push(`${who}: nome`);
  if (!EMAIL.test(p.email ?? "")) e.push(`${who}: e-mail`);
  const age = ageOf(p.birth);
  const ageOk = age >= MIN_AGE && age <= MAX_AGE;
  if (!ageOk) e.push(`${who}: data de nascimento`);
  if (!STAGE_VALUES.includes(p.stage)) e.push(`${who}: momento atual`);
  if (ageOk && isMinor(p.birth) && (!p.guardianName?.trim() || !EMAIL.test(p.guardianEmail ?? ""))) e.push(`${who}: responsável`);
  return e;
}

const personCols = (p: Person, prefix: string) => ({
  [`${prefix}nome`]: p.name,
  [`${prefix}email`]: p.email,
  [`${prefix}nascimento`]: p.birth,
  [`${prefix}idade`]: Number.isNaN(ageOf(p.birth)) ? "" : ageOf(p.birth),
  [`${prefix}momento`]: p.stage,
  [`${prefix}instituicao`]: p.school,
  [`${prefix}links`]: p.links,
  [`${prefix}projeto`]: p.project,
  [`${prefix}responsavel_nome`]: p.guardianName,
  [`${prefix}responsavel_email`]: p.guardianEmail,
});

export async function POST(req: Request) {
  let a: Application;
  try {
    a = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!isObj(a) || !isObj(a.me)) return Response.json({ error: "Formato inválido" }, { status: 400 });
  if (a.website) return Response.json({ ok: true }); // bot: pretend it worked
  const rawMembers = (a as { team?: { members?: unknown } }).team?.members;
  const shapeOk =
    !badTypes(a.me, [...PERSON_KEYS, "country", "whatsapp", "city", "uf"]) &&
    !badTypes(a as unknown as Record<string, unknown>, ["mode", "challenge", "role", "source", "lang"]) &&
    (rawMembers == null || (Array.isArray(rawMembers) && rawMembers.length <= 10 && rawMembers.every((m) => isObj(m) && !badTypes(m, PERSON_KEYS)))) &&
    (!isObj(a.team) || !badTypes(a.team as unknown as Record<string, unknown>, ["plan"]));
  if (!shapeOk) return Response.json({ error: "Formato inválido" }, { status: 400 });
  if (Date.now() > Date.parse(EVENT.signupDeadline)) {
    return Response.json({ error: "Inscrições encerradas" }, { status: 410 });
  }

  const isTeam = a.mode === "time";
  const members = isTeam ? (a.team?.members ?? []) : [];
  const errors = [
    ...personErrors(a.me, "você"),
    ...members.flatMap((m, i) => personErrors(m, `membro ${i + 2}`)),
  ];
  const br = a.me.country === "55";
  const phone = (a.me.whatsapp ?? "").replace(/\D/g, "");
  const phoneOk = /^[1-9][0-9]{0,2}$/.test(a.me.country ?? "") &&
    (br ? /^[1-9][0-9]9?[0-9]{8}$/.test(phone) : /^[0-9]{6,14}$/.test(phone));
  if (!phoneOk) errors.push("whatsapp");
  if (!a.me.city?.trim() || !UFS.includes(a.me.uf)) errors.push("cidade/UF");
  if (!MODES.some((m) => m.v === a.mode)) errors.push("modalidade");
  if (isTeam && (members.length < MIN_OTHERS || members.length > MAX_OTHERS)) errors.push("tamanho do time");
  if (!a.challenge?.trim() || !a.me.project?.trim()) errors.push("respostas");
  if (!isTeam && !a.role?.trim()) errors.push("papel");
  if (members.some((m) => !m.project?.trim())) errors.push("projeto dos membros");
  if (a.source && !SOURCE_VALUES.includes(a.source)) errors.push("origem");
  const emails = [a.me, ...members].map((p) => (p.email ?? "").trim().toLowerCase());
  if (new Set(emails).size !== emails.length) errors.push("e-mails repetidos");
  if (!a.available || !a.consent) errors.push("confirmações");
  if (errors.length) return Response.json({ error: `Campos inválidos: ${errors.join(", ")}` }, { status: 400 });

  const row: Record<string, unknown> = {
    enviado_em: new Date().toISOString(),
    modalidade: a.mode,
    tamanho: 1 + members.length,
    ...personCols(a.me, ""),
    // no leading "+": it would trip the formula guard and leave a stray apostrophe in the sheet
    whatsapp: `${a.me.country} ${br ? `(${phone.slice(0, 2)}) ${phone.slice(2)}` : phone}`,
    cidade: a.me.city,
    uf: a.me.uf,
    desafio: a.challenge,
    time_plano: isTeam ? a.team.plan : "",
    papel_no_time: isTeam ? "" : a.role,
    como_soube: a.source,
    idioma: a.lang === "en" ? "en" : "pt",
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
