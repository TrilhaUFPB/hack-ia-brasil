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
  age: string;
  stage: string;
  school: string;
  links: string;
  project: string;
  guardianName: string; // only for under-18s
  guardianEmail: string;
};

export type Application = {
  me: Person & { whatsapp: string; city: string };
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
  age: "",
  stage: "",
  school: "",
  links: "",
  project: "",
  guardianName: "",
  guardianEmail: "",
});

export const emptyApplication = (): Application => ({
  me: { ...emptyPerson(), whatsapp: "", city: "" },
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

export const isMinor = (age: string) => Number(age) > 0 && Number(age) < 18;
