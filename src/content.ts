// Single source of truth for event copy — every variant reads from here.

export const EVENT = {
  name: "Hack IA Brasil",
  // Saturday, 21 Nov 2026, 08:00 in João Pessoa (UTC-3)
  start: "2026-11-21T08:00:00-03:00",
  end: "2026-11-21T18:00:00-03:00",
  dateLabel: "Sábado, 21 de novembro",
  hoursLabel: "8h às 18h",
  venue: "ONDER",
  address: "R. Manoel Gualberto, 255, Miramar, João Pessoa",
  who: "Brasileiros de 12 a 25 anos, de qualquer lugar",
  cost: "Gratuito",
  partners: ["IA Brasil Fellowship", "Trilha"],
  coords: { lat: "7°09′S", lon: "34°47′W" },
  signupUrl: "/inscricao",
  fellowshipUrl: "https://iabrasil.com/",
  trilhaUrl: "https://www.otrilha.com",
};

export const PRIZES = [
  {
    n: "01",
    title: "R$ 100 mil",
    sub: "em prêmios",
    body: "Para se dedicar ao problema mais difícil que você quer.",
  },
  {
    n: "02",
    title: "1 semana",
    sub: "em São Francisco",
    body: "Com os outros fellows e grandes founders.",
  },
  {
    n: "03",
    title: "Mentoria",
    sub: "de Pedro e Victor",
    body: "Fundadores da Brex, Pagar.me e Wildlife.",
  },
  {
    n: "04",
    title: "Visto",
    sub: "americano",
    body: "Suporte em todo o processo de visto para os EUA.",
  },
];

export const SCHEDULE = [
  { t: "08:00", what: "Credenciamento e café", where: "Entrada" },
  { t: "09:00", what: "Abertura e tema", where: "Auditório" },
  { t: "09:30", what: "Hacking", where: "Pátio e salas" },
  { t: "12:30", what: "Almoço", where: "Cantina" },
  { t: "16:30", what: "Pitches", where: "Auditório" },
  { t: "17:30", what: "Júri e prêmios", where: "Auditório" },
  { t: "18:00", what: "Encerramento", where: "Auditório" },
];

export const FIELDS = [
  "Software",
  "IA",
  "Hardware",
  "Robótica",
  "Matemática",
  "Física",
  "Química",
  "Biotecnologia",
];

export const PEOPLE = [
  {
    name: "Pedro Franceschi",
    role: "Founder e CEO da Brex",
    initials: "PF",
    bio: "Programa desde os 9, fez o primeiro jailbreak do iPhone 3G aos 12 e fundou o Pagar.me aos 15. A Brex foi adquirida pela Capital One, a maior aquisição de uma startup fundada por brasileiros.",
    facts: [
      ["9", "anos, primeira linha de código"],
      ["12", "anos, jailbreak do iPhone 3G"],
      ["15", "anos, fundou o Pagar.me"],
    ],
    linkedin: "https://www.linkedin.com/in/pedrofranceschi/",
  },
  {
    name: "Victor Lazarte",
    role: "Founder e GP da Diffusion",
    initials: "VL",
    bio: "Fundou a Wildlife com o irmão, foi sócio da Benchmark em São Francisco e hoje lidera a Diffusion, o maior fundo de IA fundado por brasileiros, com investimentos em Etched, Cognition e Harvey.",
    facts: [
      ["Wildlife", "co-fundador"],
      ["Benchmark", "ex-sócio em SF"],
      ["Diffusion", "maior fundo de IA BR"],
    ],
    linkedin: "https://www.linkedin.com/in/victorlazarte/",
  },
];

export const FAQ = [
  {
    q: "Preciso ter uma ideia ou time pronto?",
    a: "Não. O tema é revelado na abertura, às 9h. Dá pra chegar sozinho e formar time no dia.",
  },
  {
    q: "Quem pode participar?",
    a: "Brasileiros de 12 a 25 anos que constroem coisas — do ensino médio, IF, olimpíadas ou universidade. Menores de 18 precisam da confirmação de um responsável.",
  },
  {
    q: "Quanto custa?",
    a: "Nada. Credenciamento, café e almoço estão incluídos.",
  },
  {
    q: "O que é a IA Brasil Fellowship?",
    a: "Um programa de um ano, fundado por Pedro Franceschi e Victor Lazarte, para jovens com talento técnico excepcional. O time vencedor do Hack IA Brasil vai direto para a entrevista.",
  },
  {
    q: "Moro fora de João Pessoa. Posso ir?",
    a: "Pode. O evento é aberto a brasileiros de qualquer lugar — só precisa estar no ONDER no dia 21.",
  },
];

// ---- English (/en). Same shapes as above; keep both in sync when copy changes.

export type Lang = "pt" | "en";

export const PRIZES_EN = [
  { n: "01", title: "R$ 100k", sub: "in prizes", body: "To go after the hardest problem you want." },
  { n: "02", title: "1 week", sub: "in San Francisco", body: "With the other fellows and top founders." },
  { n: "03", title: "Mentorship", sub: "from Pedro and Victor", body: "Founders of Brex, Pagar.me and Wildlife." },
  { n: "04", title: "US visa", sub: "support", body: "Help through the whole US visa process." },
];

export const SCHEDULE_EN = [
  { t: "08:00", what: "Check-in and coffee", where: "Entrance" },
  { t: "09:00", what: "Opening and theme", where: "Auditorium" },
  { t: "09:30", what: "Hacking", where: "Courtyard and rooms" },
  { t: "12:30", what: "Lunch", where: "Cafeteria" },
  { t: "16:30", what: "Pitches", where: "Auditorium" },
  { t: "17:30", what: "Judging and awards", where: "Auditorium" },
  { t: "18:00", what: "Closing", where: "Auditorium" },
];

export const PEOPLE_EN = [
  {
    ...PEOPLE[0],
    role: "Founder and CEO of Brex",
    bio: "Coding since age 9, did the first iPhone 3G jailbreak at 12 and founded Pagar.me at 15. Brex was acquired by Capital One, the largest acquisition of a startup founded by Brazilians.",
  },
  {
    ...PEOPLE[1],
    role: "Founder and GP of Diffusion",
    bio: "Co-founded Wildlife, was a partner at Benchmark in San Francisco and now leads Diffusion, the largest AI fund founded by Brazilians, with investments in Etched, Cognition and Harvey.",
  },
];

export const FAQ_EN = [
  {
    q: "Do I need an idea or a team ready?",
    a: "No. The theme is revealed at the opening, at 9am. You can come alone and form a team on the day.",
  },
  {
    q: "Who can take part?",
    a: "Brazilians aged 12 to 25 who build things: from high school, technical schools, olympiads or university. Under-18s need a guardian's consent.",
  },
  { q: "How much does it cost?", a: "Nothing. Check-in, coffee and lunch are included." },
  {
    q: "What is the IA Brasil Fellowship?",
    a: "A one-year program, founded by Pedro Franceschi and Victor Lazarte, for young people with exceptional technical talent. The winning Hack IA Brasil team goes straight to the interview.",
  },
  {
    q: "I don't live in João Pessoa. Can I come?",
    a: "Yes. The event is open to Brazilians from anywhere; you just need to be at ONDER on the 21st.",
  },
];

/** Event copy for one language. */
export const contentFor = (lang: Lang) =>
  lang === "en"
    ? { PRIZES: PRIZES_EN, SCHEDULE: SCHEDULE_EN, PEOPLE: PEOPLE_EN, FAQ: FAQ_EN }
    : { PRIZES, SCHEDULE, PEOPLE, FAQ };

/** Same page in the given language: "/" ↔ "/en", "/inscricao" ↔ "/en/inscricao". */
export const localePath = (lang: Lang, path: string) => (lang === "en" ? `/en${path === "/" ? "" : path}` : path);
