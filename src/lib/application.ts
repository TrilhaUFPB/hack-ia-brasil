// Shared by the form (client) and /api/inscricao (server).

export const STAGES = [
  "Ensino Fundamental",
  "Ensino Médio",
  "Ensino técnico / IF",
  "Graduação",
  "Já me formei",
  "Fora da escola ou faculdade",
];
export const MODES = [
  { v: "time", label: "Em time (3 ou 4 pessoas)" },
  { v: "quero-time", label: "Sozinho(a), mas quero entrar num time" },
];
export const SOURCES = ["Instagram", "LinkedIn", "WhatsApp", "Escola ou faculdade", "Indicação", "Outro"];
export const LIMIT = 1000; // open answers, characters
export const MIN_OTHERS = 2; // team of 3–4 = you + 2–3
export const MAX_OTHERS = 3;

export type Person = {
  name: string;
  email: string;
  age: string;
  stage: string;
  school: string;
  project: string;
};

export type Application = {
  me: Person & { whatsapp: string; city: string; guardianName: string; guardianPhone: string };
  mode: string;
  team: { plan: string; members: Person[] };
  challenge: string;
  role: string;
  fellowship: string;
  available: boolean;
  consent: boolean;
  source: string;
  website: string; // honeypot, must stay empty
};

export const emptyPerson = (): Person => ({
  name: "",
  email: "",
  age: "",
  stage: "",
  school: "",
  project: "",
});

export const emptyApplication = (): Application => ({
  me: { ...emptyPerson(), whatsapp: "", city: "", guardianName: "", guardianPhone: "" },
  mode: "",
  team: { plan: "", members: [emptyPerson(), emptyPerson()] },
  challenge: "",
  role: "",
  fellowship: "",
  available: false,
  consent: false,
  source: "",
  website: "",
});

export const isMinor = (age: string) => Number(age) > 0 && Number(age) < 18;
