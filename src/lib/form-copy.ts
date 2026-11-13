// Signup form copy. `team` is true when the applicant registers a whole team.

export const FORM = {
  pt: {
    steps: { you: "Você", team: "Time", answers: "Respostas", send: "Enviar" },
    optional: "opcional",
    back: "← voltar",
    next: "Continuar",
    draftNote: "Suas respostas ficam salvas neste navegador.",
    you: { title: "Sobre você", note: "Se você vai em time, é você quem inscreve o time inteiro." },
    name: "Nome completo",
    email: "E-mail",
    whatsapp: "WhatsApp com DDD",
    whatsappTitle: "Número com DDD, ex.: (83) 99999-9999",
    city: "Cidade / UF",
    age: "Idade",
    ageTitle: "O hackathon é para pessoas de 12 a 25 anos",
    school: "Escola ou universidade",
    schoolPlaceholder: "Se estuda, onde?",
    guardianNote:
      "Menores de 18 precisam da autorização de um responsável. Se o time for aprovado, enviamos o termo para este e-mail.",
    guardianName: "Nome do responsável",
    guardianEmail: "E-mail do responsável",
    stage: "Momento atual",
    links: "LinkedIn, GitHub, site ou portfólio",
    linksPlaceholder: "Cole um ou mais links, separados por vírgula",
    myProject: "Um projeto de que você tem orgulho",
    myProjectHint:
      "Não precisa ser de tecnologia: vale um app, um robô, uma olimpíada, um negócio, um evento, um clube ou liga estudantil, uma pesquisa, um trabalho voluntário. Conte o que era, qual foi a sua parte e mande o link, se tiver.",
    mode: "Como você vai participar?",
    teamStep: { title: "O seu time", note: "Times de 3 ou 4 pessoas, contando com você. Cada membro tem o seu espaço." },
    member: "Membro",
    remove: "remover",
    addMember: "+ adicionar 4º membro",
    memberProject: "Um projeto que essa pessoa construiu ou de que participou",
    memberProjectHint:
      "Não precisa ser de tecnologia: vale um negócio, um evento, um clube ou liga estudantil, uma pesquisa, um trabalho voluntário. Conte o que era, qual foi a parte dela e mande o link, se tiver.",
    plan: "Por que vocês formaram esse time e como vão dividir o trabalho no dia?",
    answers: (team: boolean) => ({
      title: team ? "Respostas do time" : "Suas respostas",
      note: (team ? "Respondam juntos, pelo time. " : "") + "Não precisa ser longo: respostas específicas valem mais que bonitas.",
    }),
    challenge: "Escolha um problema real da sua escola, faculdade, cidade ou família que tecnologia poderia ajudar a resolver.",
    challengeHint: (team: boolean) =>
      `Isto não é o projeto do hackathon: o tema só é revelado na abertura, e ninguém vai precisar defender esta ideia no dia. Queremos entender como ${team ? "vocês pensam" : "você pensa"} um problema com senso crítico. Para quem é? Por que importa? Como ${team ? "vocês saberiam" : "você saberia"} que a solução funcionou?`,
    role: "Que papel você quer ter num time e o que você traz?",
    send: { title: "Quase lá", note: "Confira e deslize para enviar." },
    available: (team: boolean) =>
      `Confirmo que ${team ? "todo o time está disponível" : "estou disponível"} no sábado, 28/11, das 8h às 18h, em João Pessoa.`,
    consent: (team: boolean, minors: boolean) =>
      `Autorizo o uso destes dados para a seleção e ${team ? "da imagem do time" : "da minha imagem"} na divulgação do evento.` +
      (team ? " Todos os membros sabem desta inscrição." : "") +
      (minors ? (team ? " Os responsáveis de quem tem menos de 18 anos estão cientes." : " Tenho menos de 18 anos e meu responsável está ciente.") : ""),
    source: "Como ficou sabendo do hackathon?",
    error: "Não conseguimos enviar. Suas respostas estão salvas neste navegador; tente de novo em instantes.",
    slide: "Deslize para enviar",
    sending: "Enviando…",
    teamOf: (n: number) => `time de ${n} pessoas`,
    years: "anos",
    closed: {
      label: "inscrições encerradas",
      title: "As inscrições fecharam.",
      body: "Recebemos inscrições até sábado, 21/11, às 23h59. Se você se inscreveu, o resultado chega por e-mail.",
    },
    sent: {
      label: "inscrição recebida",
      title: (first: string) => `Até o dia 28, ${first}.`,
      body: (team: boolean) => `O resultado sai por e-mail.${team ? " Avise o seu time que a inscrição foi feita por você." : ""}`,
    },
  },
  en: {
    steps: { you: "You", team: "Team", answers: "Answers", send: "Send" },
    optional: "optional",
    back: "← back",
    next: "Continue",
    draftNote: "Your answers are saved in this browser.",
    you: { title: "About you", note: "If you're coming as a team, you register the whole team." },
    name: "Full name",
    email: "E-mail",
    whatsapp: "WhatsApp with area code",
    whatsappTitle: "Number with area code, e.g. (83) 99999-9999",
    city: "City / State",
    age: "Age",
    ageTitle: "The hackathon is for people aged 12 to 25",
    school: "School or university",
    schoolPlaceholder: "If you study, where?",
    guardianNote:
      "Under-18s need a guardian's consent. If the team is accepted, we'll send the consent form to this e-mail.",
    guardianName: "Guardian's name",
    guardianEmail: "Guardian's e-mail",
    stage: "Where you are now",
    links: "LinkedIn, GitHub, website or portfolio",
    linksPlaceholder: "Paste one or more links, separated by commas",
    myProject: "A project you're proud of",
    myProjectHint:
      "It doesn't have to be tech: an app, a robot, an olympiad, a business, an event, a student club or league, research or volunteer work all count. Tell us what it was, what your part was, and add a link if you have one.",
    mode: "How will you take part?",
    teamStep: { title: "Your team", note: "Teams of 3 or 4 people, including you. Each member gets their own space." },
    member: "Member",
    remove: "remove",
    addMember: "+ add a 4th member",
    memberProject: "A project this person built or took part in",
    memberProjectHint:
      "It doesn't have to be tech: a business, an event, a student club or league, research or volunteer work all count. Tell us what it was, what their part was, and add a link if there is one.",
    plan: "Why did you form this team, and how will you split the work on the day?",
    answers: (team: boolean) => ({
      title: team ? "Team answers" : "Your answers",
      note: (team ? "Answer together, as a team. " : "") + "Keep it short: specific answers beat polished ones.",
    }),
    challenge: "Pick a real problem at your school, university, city or family that technology could help solve.",
    challengeHint: () =>
      "This is not the hackathon project: the theme is only revealed at the opening, and no one will have to defend this idea on the day. We want to see how you think critically about a problem. Who is it for? Why does it matter? How would you know the solution worked?",
    role: "What role do you want on a team, and what do you bring?",
    send: { title: "Almost there", note: "Check everything and slide to send." },
    available: (team: boolean) =>
      `I confirm that ${team ? "the whole team is" : "I am"} available on Saturday, Nov 28, from 8am to 6pm, in João Pessoa.`,
    consent: (team: boolean, minors: boolean) =>
      `I authorize the use of this data for selection and of ${team ? "the team's" : "my"} image to promote the event.` +
      (team ? " All members know about this application." : "") +
      (minors ? (team ? " The guardians of anyone under 18 are aware." : " I'm under 18 and my guardian knows.") : ""),
    source: "How did you hear about the hackathon?",
    error: "We couldn't send it. Your answers are saved in this browser; try again in a moment.",
    slide: "Slide to send",
    sending: "Sending…",
    teamOf: (n: number) => `team of ${n}`,
    years: "years old",
    closed: {
      label: "applications closed",
      title: "Applications are closed.",
      body: "We took applications until Saturday, Nov 21, at 11:59pm (Brasília time). If you applied, the result will arrive by e-mail.",
    },
    sent: {
      label: "application received",
      title: (first: string) => `See you on the 28th, ${first}.`,
      body: (team: boolean) => `We'll e-mail you the result.${team ? " Let your team know you registered them." : ""}`,
    },
  },
};
