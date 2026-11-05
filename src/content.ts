// Single source of truth for event copy — every variant reads from here.

export const EVENT = {
  name: "IA Hack",
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
  signupUrl: "#inscricao",
  fellowshipUrl: "https://iabrasil.com/",
};

export const PRIZES = [
  {
    n: "01",
    title: "R$ 100 mil",
    sub: "em prêmios",
    body: "Para se dedicar ao problema mais difícil que você quer resolver.",
  },
  {
    n: "02",
    title: "1 semana",
    sub: "em São Francisco",
    body: "Com os outros fellows, conhecendo grandes founders.",
  },
  {
    n: "03",
    title: "Mentoria",
    sub: "de Pedro e Victor",
    body: "Fundadores da Brex, Pagar.me, Wildlife e Diffusion.",
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
    bio: "Começou a programar aos 9, fez o primeiro jailbreak do iPhone 3G do mundo aos 12 e fundou o Pagar.me aos 15. A Brex foi adquirida pela Capital One: a maior aquisição de uma empresa fundada por brasileiros.",
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
    a: "Um programa de um ano, fundado por Pedro Franceschi e Victor Lazarte, para jovens com talento técnico excepcional. O time vencedor do IA Hack vai direto para a entrevista.",
  },
  {
    q: "Moro fora de João Pessoa. Posso ir?",
    a: "Pode. O evento é aberto a brasileiros de qualquer lugar — só precisa estar no ONDER no dia 21.",
  },
];
