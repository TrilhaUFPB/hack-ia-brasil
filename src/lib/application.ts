// Shared by the form (client) and /api/inscricao (server).

// `v` is what goes to the sheet (always Portuguese, so the columns stay comparable); `pt`/`en` is what people see.
export type Option = { v: string; pt: string; en: string };
const same = (v: string, en: string): Option => ({ v, pt: v, en });

export const STAGES: Option[] = [
  same("Ensino Fundamental", "Middle school"),
  same("Ensino Médio", "High school"),
  same("Ensino técnico / IF", "Technical school / IF"),
  same("Graduação", "University"),
  same("Já me formei", "Graduated"),
  same("Fora da escola ou faculdade", "Not in school or university"),
];
export const MODES: Option[] = [
  { v: "time", pt: "Em time (3 ou 4 pessoas)", en: "As a team (3 or 4 people)" },
  { v: "quero-time", pt: "Sozinho(a), mas quero entrar num time", en: "On my own, but I want to join a team" },
];
export const SOURCES: Option[] = [
  same("Instagram", "Instagram"),
  same("LinkedIn", "LinkedIn"),
  same("WhatsApp", "WhatsApp"),
  same("Escola ou faculdade", "School or university"),
  same("Indicação", "A friend told me"),
  same("Outro", "Other"),
];
export const LIMIT = 1000; // open answers, characters
export const MIN_OTHERS = 2; // team of 3–4 = you + 2–3
export const MAX_OTHERS = 3;

export type Person = {
  name: string;
  email: string;
  birth: string; // YYYY-MM-DD, age is computed from it
  stage: string;
  school: string;
  links: string;
  project: string;
  guardianName: string; // only for under-18s
  guardianEmail: string;
};

export type Application = {
  me: Person & { country: string; ddd: string; whatsapp: string; city: string; uf: string };
  mode: string;
  team: { plan: string; members: Person[] };
  challenge: string;
  role: string;
  available: boolean;
  consent: boolean;
  source: string;
  website: string; // honeypot, must stay empty
  lang: "pt" | "en";
};

export const emptyPerson = (): Person => ({
  name: "",
  email: "",
  birth: "",
  stage: "",
  school: "",
  links: "",
  project: "",
  guardianName: "",
  guardianEmail: "",
});

export const emptyApplication = (): Application => ({
  me: { ...emptyPerson(), country: "55", ddd: "", whatsapp: "", city: "", uf: "" },
  mode: "",
  team: { plan: "", members: [emptyPerson(), emptyPerson()] },
  challenge: "",
  role: "",
  available: false,
  consent: false,
  source: "",
  website: "",
  lang: "pt",
});

export const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

// Age on the event day (Nov 28): that's what decides 12–25 and who needs a guardian.
const EVENT_DAY = "2026-11-28";
export const MIN_AGE = 12;
export const MAX_AGE = 25;
export function ageOf(birth: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth ?? "")) return NaN;
  const [y, m, d] = birth.split("-").map(Number);
  const [ey, em, ed] = EVENT_DAY.split("-").map(Number);
  return ey - y - (em < m || (em === m && ed < d) ? 1 : 0);
}
// input[type=date] bounds: born between these days means 12–25 on the event day
export const BIRTH_MIN = `${2026 - MAX_AGE - 1}-11-29`;
export const BIRTH_MAX = `${2026 - MIN_AGE}-11-28`;
export const isMinor = (birth: string) => ageOf(birth) < 18;
