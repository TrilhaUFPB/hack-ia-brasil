// Texto do Guia do Participante, exportado do Notion (página "Deck do participante: Hack IA Brasil").
// Não reescreva o texto aqui: ele é a fonte da verdade e foi revisado pela organização.
// Só a apresentação (layout, animação, divisão em telas) deve mudar.

export type Span = { t: string; b?: true; href?: string };
export type Rich = Span[];
export type Block =
  | { kind: "p"; rich: Rich }
  | { kind: "h3"; rich: Rich }
  | { kind: "quote"; rich: Rich }
  | { kind: "ul" | "ol" | "todo"; items: Rich[] }
  | { kind: "table"; head: Rich[]; rows: Rich[][] };
export type Section = { id: string; title: string | null; blocks: Block[] };

export const GUIDE_TITLE = "Deck do participante: Hack IA Brasil";

export const GUIDE: Section[] = [
  {
    "id": "intro",
    "title": null,
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Última atualização: 28 de novembro de 2026"
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Você foi aprovado no Hack IA Brasil!!",
            "b": true
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Este guia reúne as principais informações para você chegar preparado no dia do hack: o que esperamos dos times, as tracks, como os projetos serão avaliados, a programação, a logística e as regras. Leia com calma, junto com o seu time, antes de sábado. Ao participar, você declara que leu e concorda com estas regras e com as decisões da organização."
          }
        ]
      }
    ]
  },
  {
    "id": "checklist",
    "title": "Seu checklist antes do evento",
    "blocks": [
      {
        "kind": "todo",
        "items": [
          [
            {
              "t": "Entrar no grupo de WhatsApp do hackathon (é o canal oficial de avisos)"
            }
          ],
          [
            {
              "t": "Confirmar presença quando pedirmos no grupo. Quem não confirmar pode perder a vaga"
            }
          ],
          [
            {
              "t": "Ler as tracks com o seu time e escolher uma (seção 3)"
            }
          ],
          [
            {
              "t": "Chegar com o escopo do projeto definido, usando o roteiro da seção 4"
            }
          ],
          [
            {
              "t": "Deixar o ambiente de desenvolvimento instalado e testado (seção 7)"
            }
          ],
          [
            {
              "t": "Menores de 18 anos: enviar a autorização do responsável por email → trilhaufpb@gmail.com"
            }
          ]
        ]
      }
    ]
  },
  {
    "id": "evento",
    "title": "1. O evento em resumo",
    "blocks": [
      {
        "kind": "table",
        "head": [
          [
            {
              "t": "O quê",
              "b": true
            }
          ],
          [
            {
              "t": "Hackathon presencial de IA, de um dia, com pitches e premiação"
            }
          ]
        ],
        "rows": [
          [
            [
              {
                "t": "Quando",
                "b": true
              }
            ],
            [
              {
                "t": "Sábado, 28 de novembro de 2026, das 8h às 18h"
              }
            ]
          ],
          [
            [
              {
                "t": "Onde",
                "b": true
              }
            ],
            [
              {
                "t": "Medway, R. Manoel Gualberto, 255, Miramar, João Pessoa/PB"
              }
            ]
          ],
          [
            [
              {
                "t": "Quem",
                "b": true
              }
            ],
            [
              {
                "t": "Times aprovados no processo seletivo, de 12 a 25 anos"
              }
            ]
          ],
          [
            [
              {
                "t": "Organização",
                "b": true
              }
            ],
            [
              {
                "t": "IA Brasil Fellowship e Trilha, com apoio da Cognition e do Medway"
              }
            ]
          ],
          [
            [
              {
                "t": "Canal oficial",
                "b": true
              }
            ],
            [
              {
                "t": "Grupo de WhatsApp dos aprovados"
              }
            ]
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Toda atualização, mudança de programação ou esclarecimento sai pelo grupo de WhatsApp. Acompanhar o grupo é responsabilidade de cada participante."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "📍 "
          },
          {
            "t": "Como chegar:",
            "b": true
          },
          {
            "t": " "
          },
          {
            "t": "abrir o Medway no Google Maps",
            "href": "https://www.google.com/maps/search/?api=1&query=R.+Manoel+Gualberto,+255,+Miramar,+Jo%C3%A3o+Pessoa+-+PB"
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "🙋 "
          },
          {
            "t": "No dia, teve alguma dificuldade?",
            "b": true
          },
          {
            "t": " Procure alguém da organização. A equipe vai estar de camisa do evento ou entre em contato diretamente com: +83 996374372"
          }
        ]
      }
    ]
  },
  {
    "id": "esperamos",
    "title": "2. O que esperamos dos times",
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "São cerca de "
          },
          {
            "t": "7 horas de construção",
            "b": true
          },
          {
            "t": ". É pouco tempo, e as tracks são amplas de propósito. Quem chegar no sábado ainda decidindo o que fazer vai gastar metade do dia discutindo ideia e a outra metade correndo. Quem chegar com o problema escolhido passa o dia construindo."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "O que queremos ver no fim do dia:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Um problema real e específico.",
              "b": true
            },
            {
              "t": " Uma pessoa concreta, com uma dor concreta. \"Saúde mental\" é um tema; \"alunos do ensino médio que não sabem onde pedir ajuda\" é um problema."
            }
          ],
          [
            {
              "t": "Algo funcionando.",
              "b": true
            },
            {
              "t": " Uma demo ao vivo vale mais do que dez slides dizendo o que o produto faria. Pode usar dados fictícios, mas precisa rodar."
            }
          ],
          [
            {
              "t": "IA no centro.",
              "b": true
            },
            {
              "t": " A IA precisa ser parte essencial da solução, não um enfeite em cima de um formulário."
            }
          ],
          [
            {
              "t": "Ambição grande, entrega concreta.",
              "b": true
            },
            {
              "t": " Pensem grande no problema e mostrem uma parte importante funcionando de verdade. Preferimos um projeto ambicioso com uma demo real a um projeto simples e seguro."
            }
          ],
          [
            {
              "t": "Uma boa apresentação.",
              "b": true
            },
            {
              "t": " A forma como vocês mostram o projeto conta muito. Jurados e mentores precisam entender em poucos minutos qual é o problema, para quem é e por que a solução de vocês importa. Contem a história com clareza, mostrem o produto funcionando e ensaiem antes (veja a seção 10)."
            }
          ]
        ]
      },
      {
        "kind": "h3",
        "rich": [
          {
            "t": "O que é um problema (e o que não é)"
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Parece pergunta boba, mas é aqui que muita ideia de hackathon tropeça. É muito comum confundir o problema com uma causa dele, ou com uma consequência. E essa confusão muda tudo o que vem depois."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "O problema é o dano.",
            "b": true
          },
          {
            "t": " É aquilo de ruim que acontece com alguém e que dá para medir: gente morrendo, dinheiro perdido, meses de espera por um atendimento, aluno reprovando. "
          },
          {
            "t": "A causa",
            "b": true
          },
          {
            "t": " é o porquê de esse dano acontecer. "
          },
          {
            "t": "A consequência",
            "b": true
          },
          {
            "t": " é o que vem depois, como efeito dele."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Um exemplo. Um time quer trabalhar com segurança nas rodovias, pensando nos caminhoneiros, e diz: \"o problema é que os motoristas não têm informação sobre quais trechos da estrada são mais perigosos\". Isso não é o problema. O problema é que muita gente morre nesses trechos. A falta de informação é uma das causas. E as famílias que perdem quem sustentava a casa, ou os hospitais lotados de acidentados, são consequências."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Por que isso importa? Quando vocês chamam a causa de problema, já escolheram a solução sem perceber (\"falta informação, então vamos dar informação\") e param de olhar para as outras causas, que podem pesar mais: motorista cansado depois de horas ao volante, sinalização ruim, prazo de entrega apertado. E fica difícil mostrar impacto. \"Agora o motorista tem a informação\" não convence ninguém. \"Menos acidentes nos trechos mais perigosos\" convence."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Então organizem assim:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Problema:",
              "b": true
            },
            {
              "t": " o que vocês querem diminuir. Ex.: mortes de caminhoneiros nas rodovias."
            }
          ],
          [
            {
              "t": "Causa:",
              "b": true
            },
            {
              "t": " por onde vocês vão atacar. Ex.: o motorista não sabe quais trechos são mais perigosos."
            }
          ],
          [
            {
              "t": "Solução:",
              "b": true
            },
            {
              "t": " o que vocês vão construir para atacar essa causa."
            }
          ],
          [
            {
              "t": "Impacto:",
              "b": true
            },
            {
              "t": " é medido no problema, não na causa. Ex.: quantos acidentes a menos."
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Dois truques para não cair nessa:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Pergunte \"e daí?\".",
              "b": true
            },
            {
              "t": " \"Os motoristas não sabem quais trechos são perigosos.\" E daí? \"E daí que eles não reduzem a velocidade onde deveriam.\" E daí? \"E daí que acontecem acidentes e gente morre.\" Quando a resposta é um dano que ninguém discute, vocês chegaram no problema."
            }
          ],
          [
            {
              "t": "Pergunte \"por quê?\".",
              "b": true
            },
            {
              "t": " É o caminho contrário: por que tanta gente morre nesses trechos? Cada resposta é uma causa possível. Escolham uma que dê para atacar de verdade em um dia de hack."
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "(EXEMPLOS ILUSTRATIVOS NÃO SIGAM)"
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Problema genérico vs. problema relevante.",
            "b": true
          },
          {
            "t": " Um bom problema tem alguém específico que sofre com ele, um momento em que a dor aparece e um motivo para as soluções de hoje não resolverem."
          }
        ]
      },
      {
        "kind": "table",
        "head": [
          [
            {
              "t": "Problema genérico"
            }
          ],
          [
            {
              "t": "Problema real e relevante"
            }
          ]
        ],
        "rows": [
          [
            [
              {
                "t": "A saúde pública é ruim"
              }
            ],
            [
              {
                "t": "O médico da UBS não tem apoio para resolver casos que não precisariam de especialista, encaminha quase tudo e o paciente espera meses na fila"
              }
            ]
          ],
          [
            [
              {
                "t": "Os alunos não aprendem matemática"
              }
            ],
            [
              {
                "t": "Alunos chegam ao ensino médio sem dominar o conteúdo do fundamental, e o professor, com dezenas de alunos por sala, não consegue saber quem travou em quê"
              }
            ]
          ],
          [
            [
              {
                "t": "Tem muito golpe na internet"
              }
            ],
            [
              {
                "t": "Idosos recebem mensagens de falsos parentes pedindo Pix e não têm a quem perguntar, na hora, se aquilo é verdade"
              }
            ]
          ],
          [
            [
              {
                "t": "A cidade é violenta"
              }
            ],
            [
              {
                "t": "A prefeitura recebe denúncias espalhadas por vários canais e não consegue ver onde e quando os mesmos crimes se repetem para agir antes"
              }
            ]
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Ideia genérica vs. ideia ambiciosa.",
            "b": true
          },
          {
            "t": " Com o problema certo em mãos, a solução pode e deve ser grande:"
          }
        ]
      },
      {
        "kind": "table",
        "head": [
          [
            {
              "t": "Ideia genérica"
            }
          ],
          [
            {
              "t": "Ideia ambiciosa e concreta"
            }
          ]
        ],
        "rows": [
          [
            [
              {
                "t": "Um chatbot de saúde"
              }
            ],
            [
              {
                "t": "Um copiloto para o médico da UBS que lê prontuário, exames e histórico do paciente, sugere hipóteses e organiza o encaminhamento para o especialista certo, encurtando a fila do SUS"
              }
            ]
          ],
          [
            [
              {
                "t": "Um tutor com IA"
              }
            ],
            [
              {
                "t": "Um professor particular de IA que descobre as lacunas de cada aluno a partir das provas que ele já fez, monta um plano para a olimpíada ou o vestibular e se ajusta a cada resposta, trabalhando junto com o professor da escola"
              }
            ]
          ],
          [
            [
              {
                "t": "Um detector de golpes"
              }
            ],
            [
              {
                "t": "Um sistema que ataca a infraestrutura de uma prefeitura ou de um hospital como um hacker faria, encontra as falhas e entrega a correção pronta para a equipe de TI"
              }
            ]
          ],
          [
            [
              {
                "t": "Um mapa da violência"
              }
            ],
            [
              {
                "t": "Uma plataforma que cruza denúncias, boletins de ocorrência e dados abertos para mostrar à prefeitura onde e quando agir para prevenir crimes, e mede se a ação funcionou"
              }
            ]
          ]
        ]
      }
    ]
  },
  {
    "id": "tracks",
    "title": "3. As tracks",
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Cada time escolhe uma das três tracks. Elas são amplas para caber ideias diferentes, mas o projeto precisa resolver um problema claro dentro delas. Abaixo, algumas direções que valem explorar e exemplos de quem já está construindo nessas áreas, para servir de inspiração."
          }
        ]
      },
      {
        "kind": "h3",
        "rich": [
          {
            "t": "🔒 Segurança"
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Segurança digital e segurança das pessoas: golpes, fraudes, privacidade, vulnerabilidades em software e segurança pública."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Direções que valem explorar:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Detectar golpes por mensagem, ligação ou voz clonada, principalmente contra idosos"
            }
          ],
          [
            {
              "t": "Identificar deepfakes e conteúdo manipulado"
            }
          ],
          [
            {
              "t": "Encontrar e corrigir vulnerabilidades em código ou em sites"
            }
          ],
          [
            {
              "t": "Organizar e cruzar denúncias ou dados de violência para quem toma decisão"
            }
          ],
          [
            {
              "t": "Proteger dados pessoais de quem não entende de tecnologia"
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Para se inspirar, leia estes cases antes de sábado:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Pax",
              "b": true
            },
            {
              "t": ": a startup brasileira conecta câmeras, boletins de ocorrência e bases criminais para gerar pistas de investigação em tempo real. Diz ter ajudado a esclarecer mais de 2 mil crimes e levantou US$ 40 milhões, a maior rodada desse estágio no Brasil. "
            },
            {
              "t": "Leia na Bloomberg Línea",
              "href": "https://www.bloomberglinea.com.br/negocios/chatgpt-da-policia-brasileira-pax-atrai-capital-dos-eua-com-ia-para-seguranca-publica/"
            }
          ],
          [
            {
              "t": "Gabriel",
              "b": true
            },
            {
              "t": ": nasceu no Rio instalando câmeras inteligentes em prédios para formar uma rede de segurança por bairro. Hoje tem cerca de 22 mil câmeras em quatro estados e já recebeu investimento do SoftBank. "
            },
            {
              "t": "Leia no Startups",
              "href": "https://startups.com.br/negocios/exclusivo-gabriel-atinge-breakeven-e-amplia-presenca-para-45-cidades/"
            }
          ],
          [
            {
              "t": "Unico",
              "b": true
            },
            {
              "t": ": o unicórnio brasileiro de verificação de identidade usa biometria para barrar fraudes em bancos e varejo, e agora também combate golpes feitos com deepfake. "
            },
            {
              "t": "Leia no Canaltech",
              "href": "https://canaltech.com.br/seguranca/brasil-vira-referencia-em-combate-a-fraudes-e-exporta-esse-conhecimento-ao-mundo/"
            }
          ],
          [
            {
              "t": "Minds Digital",
              "b": true
            },
            {
              "t": ": startup brasileira de biometria de voz que identifica, durante a ligação, quando quem fala não é o cliente de verdade. Diz ter evitado R$ 60 milhões em fraudes bancárias. "
            },
            {
              "t": "Leia na Forbes",
              "href": "https://forbes.com.br/forbes-money/2024/02/esta-empresa-evitou-r-60-milhoes-em-fraudes-bancarias-usando-ia-por-voz/"
            }
          ],
          [
            {
              "t": "Axur",
              "b": true
            },
            {
              "t": ": empresa brasileira que usa IA para encontrar e derrubar sites falsos, perfis falsos e vazamentos de dados antes que virem golpe. "
            },
            {
              "t": "Leia no Startupi",
              "href": "https://startupi.com.br/axur-recebe-aporte-serie-b/"
            }
          ],
          [
            {
              "t": "XBOW",
              "b": true
            },
            {
              "t": ": um agente autônomo que procura falhas de segurança como um hacker faria. Em 2025, virou o primeiro não humano a liderar o ranking dos EUA do HackerOne, a maior plataforma de caça a falhas do mundo. "
            },
            {
              "t": "Leia na Bloomberg",
              "href": "https://www.bloomberg.com/news/articles/2025-06-24/one-of-the-best-hackers-in-the-country-is-an-ai-bot"
            }
          ],
          [
            {
              "t": "Fogo Cruzado",
              "b": true
            },
            {
              "t": ": mapeia tiroteios a partir de relatos de moradores checados com fontes oficiais, inclusive em Recife. Seus dados abertos viraram referência para jornalistas, pesquisadores e governos. "
            },
            {
              "t": "Leia na IJNet",
              "href": "https://ijnet.org/pt-br/story/entrevista-fogo-cruzado-cobre-v%C3%A1cuo-de-informa%C3%A7%C3%A3o-sobre-viol%C3%AAncia"
            }
          ]
        ]
      },
      {
        "kind": "h3",
        "rich": [
          {
            "t": "🩺 Saúde"
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Acesso, prevenção, diagnóstico e o dia a dia de quem cuida, com atenção especial ao SUS e a quem está longe de um especialista."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Direções que valem explorar:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Triagem e organização de filas em UBS e prontos-socorros"
            }
          ],
          [
            {
              "t": "Apoio a agentes comunitários de saúde em visitas domiciliares"
            }
          ],
          [
            {
              "t": "Adesão a tratamentos e lembretes de medicação"
            }
          ],
          [
            {
              "t": "Saúde mental de jovens"
            }
          ],
          [
            {
              "t": "Leitura e explicação de exames para quem não tem um especialista perto"
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Para se inspirar, leia estes cases antes de sábado:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Laura",
              "b": true
            },
            {
              "t": ": depois de perder a filha recém-nascida para uma sepse, Jacson Fressatto criou uma IA que monitora os pacientes internados e avisa a equipe quando alguém corre risco. Segundo a iniciativa, ajudou a reduzir a mortalidade nos hospitais onde roda. "
            },
            {
              "t": "Leia no case da AWS",
              "href": "https://aws.amazon.com/pt/solutions/case-studies/laura"
            }
          ],
          [
            {
              "t": "Huna",
              "b": true
            },
            {
              "t": ": deeptech brasileira que procura sinais de câncer em exames de sangue de rotina, como o hemograma. O primeiro produto, para câncer de mama, foi treinado com exames de mais de 300 mil mulheres. "
            },
            {
              "t": "Leia na Exame",
              "href": "https://exame.com/negocios/huna-detecta-cancer-de-mama-exames-sangue-startup-brasileira"
            }
          ],
          [
            {
              "t": "Rivio",
              "b": true
            },
            {
              "t": ": healthtech brasileira que usa agentes de IA para cuidar da gestão financeira e administrativa de hospitais. Já opera em mais de 50 e passou de R$ 1 bilhão em valor de mercado em cerca de um ano. "
            },
            {
              "t": "Leia no Startups",
              "href": "https://startups.com.br/negocios/rodada-de-investimento/rivio-fecha-serie-a-de-r-180m-e-passa-de-r-1-bi-em-valuation/"
            }
          ],
          [
            {
              "t": "Telepatía",
              "b": true
            },
            {
              "t": ": startup nascida na Colômbia, com operação no Brasil, que criou um copiloto para médicos: transcreve a consulta, revisa o histórico do paciente e aponta possíveis erros. Tem investimento da a16z, um dos maiores fundos do Vale do Silício. "
            },
            {
              "t": "Leia no Startups",
              "href": "https://startups.com.br/negocios/healthtechs/telepatia-capta-us-33m-com-a16z-para-expandir-copiloto-clinico/"
            }
          ]
        ]
      },
      {
        "kind": "h3",
        "rich": [
          {
            "t": "📚 Educação"
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Aprendizado, acesso e o trabalho do professor, principalmente na escola pública."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Direções que valem explorar:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Tutores que acompanham o aluno no ritmo dele, inclusive pelo WhatsApp"
            }
          ],
          [
            {
              "t": "Correção e feedback de redação"
            }
          ],
          [
            {
              "t": "Preparação para olimpíadas e vestibulares"
            }
          ],
          [
            {
              "t": "Ferramentas que tiram trabalho repetitivo do professor, como planejamento e correção"
            }
          ],
          [
            {
              "t": "Alfabetização e reforço para quem ficou para trás"
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Para se inspirar, leia estes cases antes de sábado:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Teachy",
              "b": true
            },
            {
              "t": ": plataforma brasileira que ajuda professores a planejar aulas, criar atividades e corrigir provas, tirando horas de trabalho repetitivo da semana. Já é usada em cerca de 60 mil escolas no Brasil e captou R$ 40 milhões. "
            },
            {
              "t": "Leia no Startups",
              "href": "https://startups.com.br/negocios/rodada-de-investimento/teachy-capta-r-40m-para-expandir-nos-eua-e-america-latina/"
            }
          ],
          [
            {
              "t": "BeConfident",
              "b": true
            },
            {
              "t": ": criada por quatro amigos da periferia de São Paulo, coloca um tutor de IA que conversa com o aluno por ligação ou WhatsApp para destravar o inglês falado. Chegou a milhões de usuários e recebeu R$ 85 milhões da Prosus, dona do iFood. "
            },
            {
              "t": "Leia no Startups",
              "href": "https://startups.com.br/negocios/rodada-de-investimento/com-a-bencao-e-r-85m-da-prosus-beconfident-quer-conquistar-o-mundo/"
            }
          ],
          [
            {
              "t": "Letrus",
              "b": true
            },
            {
              "t": ": usa IA para dar feedback de redação a alunos de escolas públicas. Um estudo apoiado pelo J-PAL, laboratório do MIT, encontrou redução na diferença de notas entre escolas públicas e privadas onde o programa rodou. "
            },
            {
              "t": "Leia no J-PAL",
              "href": "https://www.povertyactionlab.org/case-study/artificial-intelligence-strengthen-high-school-students-writing-skills"
            }
          ],
          [
            {
              "t": "isaac",
              "b": true
            },
            {
              "t": ": fintech brasileira que organiza a cobrança de mensalidades das escolas particulares e garante que a escola receba mesmo quando a família atrasa. Foi comprada pela Arco Educação e movimenta cerca de R$ 5 bilhões por ano. "
            },
            {
              "t": "Leia na Forbes",
              "href": "https://forbes.com.br/forbes-money/2024/11/girando-r-5-bi-por-ano-fintech-educacional-isaac-quer-chegar-a-10-mil-escolas/"
            }
          ]
        ]
      }
    ]
  },
  {
    "id": "escopo",
    "title": "4. Como chegar com o escopo pronto",
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Vocês podem, e devem, chegar com a ideia pensada. Pesquisa, escopo e arquitetura podem vir prontos; só o código começa no dia. Antes de sábado, sente com o seu time e responda às perguntas abaixo. Se vocês conseguirem responder todas em poucas linhas, o projeto está pronto para começar. Traga as respostas: os mentores vão usar isso para ajudar vocês logo na primeira rodada de mentoria."
          }
        ]
      },
      {
        "kind": "ol",
        "items": [
          [
            {
              "t": "Qual é o problema?",
              "b": true
            },
            {
              "t": " Em uma frase, sem falar da solução."
            }
          ],
          [
            {
              "t": "Quem sente esse problema?",
              "b": true
            },
            {
              "t": " Uma pessoa específica. Se possível, converse com alguém assim antes do evento."
            }
          ],
          [
            {
              "t": "Como essa pessoa resolve isso hoje?",
              "b": true
            },
            {
              "t": " E por que isso não é bom o suficiente?"
            }
          ],
          [
            {
              "t": "O que a demo vai mostrar?",
              "b": true
            },
            {
              "t": " Descreva os 60 segundos de demo que vocês querem apresentar às 17h."
            }
          ],
          [
            {
              "t": "O que vocês NÃO vão fazer?",
              "b": true
            },
            {
              "t": " Cortar escopo é a decisão mais importante do dia."
            }
          ],
          [
            {
              "t": "Como a IA entra?",
              "b": true
            },
            {
              "t": " Que modelo, API ou agente, e por que ele é necessário."
            }
          ],
          [
            {
              "t": "Quem faz o quê?",
              "b": true
            },
            {
              "t": " Divida os papéis antes de chegar."
            }
          ]
        ]
      }
    ]
  },
  {
    "id": "programacao",
    "title": "5. Programação",
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Programação prevista. A versão final, com eventuais ajustes, será enviada no grupo de WhatsApp."
          }
        ]
      },
      {
        "kind": "table",
        "head": [
          [
            {
              "t": "Horário"
            }
          ],
          [
            {
              "t": "Sábado, 28/11"
            }
          ]
        ],
        "rows": [
          [
            [
              {
                "t": "☀️ 08h00"
              }
            ],
            [
              {
                "t": "Credenciamento e café. Você recebe uma pulseira de acesso, que deve ficar com você o dia todo"
              }
            ]
          ],
          [
            [
              {
                "t": "🎯 09h00"
              }
            ],
            [
              {
                "t": "Abertura: boas-vindas do Trilha e da IA Brasil Fellowship, tracks, critérios de avaliação e regras"
              }
            ]
          ],
          [
            [
              {
                "t": "🛠️ 09h20"
              }
            ],
            [
              {
                "t": "Início do hacking. Ninguém escreve código do projeto antes deste horário"
              }
            ]
          ],
          [
            [
              {
                "t": "🧭 10h30 às 11h20"
              }
            ],
            [
              {
                "t": "1ª rodada de mentoria"
              }
            ]
          ],
          [
            [
              {
                "t": "🍽️ 12h30"
              }
            ],
            [
              {
                "t": "Almoço. O hacking não para: cada time se organiza para comer e continuar construindo"
              }
            ]
          ],
          [
            [
              {
                "t": "🧭 14h00 às 14h50"
              }
            ],
            [
              {
                "t": "2ª rodada de mentoria"
              }
            ]
          ],
          [
            [
              {
                "t": "📤 16h00"
              }
            ],
            [
              {
                "t": "Prazo final de submissão"
              }
            ]
          ],
          [
            [
              {
                "t": "🎤 17h00"
              }
            ],
            [
              {
                "t": "Pitches"
              }
            ]
          ],
          [
            [
              {
                "t": "🏆 17h40"
              }
            ],
            [
              {
                "t": "Deliberação do júri e premiação"
              }
            ]
          ],
          [
            [
              {
                "t": "👋 18h00"
              }
            ],
            [
              {
                "t": "Encerramento"
              }
            ]
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Mentoria.",
            "b": true
          },
          {
            "t": " São duas rodadas fixas, uma de manhã e outra à tarde. Em cada uma, o seu time tem 10 minutos com 2 mentores, e o horário de cada time é passado no dia. A rodada da manhã serve para afinar a ideia e o escopo antes que vocês avancem demais."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Fora das rodadas, os mentores ficam disponíveis o dia todo, até as 16h30. Procure um mentor sempre que precisar, sem esperar a sua rodada. Chegue com uma pergunta concreta, não com um \"o que você acha?\"."
          }
        ]
      }
    ]
  },
  {
    "id": "participacao",
    "title": "6. Times e regras de participação",
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Quem participa",
            "b": true
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Só os participantes aprovados no processo seletivo. A participação é pessoal e intransferível"
            }
          ],
          [
            {
              "t": "Menores de 18 anos precisam da autorização de um responsável"
            }
          ],
          [
            {
              "t": "Presença obrigatória no Medway durante o evento"
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Times",
            "b": true
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Os times já estão formados, conforme a seleção"
            }
          ],
          [
            {
              "t": "Qualquer mudança de integrante precisa ser combinada com a organização pelo WhatsApp antes do evento"
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "O que pode ser feito antes e o que só vale durante",
            "b": true
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Antes do evento, à vontade: pesquisa, conversa com possíveis usuários, escolha do problema, arquitetura da solução e preparação do ambiente (contas, chaves de API, bibliotecas, repositório vazio). Chegar com a ideia madura é exatamente o que queremos."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Só durante o evento: o código do projeto e o material do pitch. O desenvolvimento começa às 9h20 de sábado. Bibliotecas, frameworks e projetos open source podem ser usados como ponto de partida. A organização pode pedir o histórico de commits, então crie o repositório no dia."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Uso de IA",
            "b": true
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "O uso de IA é obrigatório e deve ser central no projeto. APIs, modelos prontos e plataformas de IA são permitidos, desde que declarados na submissão. Ferramentas de código com IA (Devin, Claude Code, Cursor, Codex, Copilot ou outras) estão liberadas."
          }
        ]
      }
    ]
  },
  {
    "id": "levar",
    "title": "7. O que levar",
    "blocks": [
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Notebook e carregador.",
              "b": true
            },
            {
              "t": " Não haverá computadores no local"
            }
          ],
          [
            {
              "t": "Extensão ou filtro de linha.",
              "b": true
            },
            {
              "t": " Haverá tomadas, mas não uma para cada pessoa"
            }
          ],
          [
            {
              "t": "Documento com foto",
              "b": true
            },
            {
              "t": " para o credenciamento"
            }
          ],
          [
            {
              "t": "Contas criadas e testadas:",
              "b": true
            },
            {
              "t": " GitHub e qualquer API ou serviço que vocês pretendem usar. Não haverá tempo para configurar no evento"
            }
          ],
          [
            {
              "t": "Ambiente instalado:",
              "b": true
            },
            {
              "t": " linguagem, gerenciador de pacotes e o que mais a sua stack precisar, já rodando"
            }
          ],
          [
            {
              "t": "Downloads pesados feitos em casa:",
              "b": true
            },
            {
              "t": " modelos locais, imagens de container e dependências grandes. A internet do evento é compartilhada"
            }
          ],
          [
            {
              "t": "Hardware próprio,",
              "b": true
            },
            {
              "t": " se o projeto usar. A organização não fornece componentes"
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Café da manhã e almoço estão incluídos."
          }
        ]
      }
    ]
  },
  {
    "id": "submissao",
    "title": "8. Submissão do projeto",
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Enviem o projeto pelo "
          },
          {
            "t": "formulário de submissão",
            "href": "https://forms.gle/DzdZukwN27fQiS4V8"
          },
          {
            "t": ". "
          },
          {
            "t": "Prazo final: sábado, 28/11, às 16h00.",
            "b": true
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "A submissão precisa conter:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Nome do projeto e track escolhida"
            }
          ],
          [
            {
              "t": "Link do repositório no GitHub, com o código bem documentado e um README que explique bem o projeto. "
            },
            {
              "t": "Contem o que ele é, qual o impacto, o que tem de inovador, como seria aplicado na vida real e quais ferramentas, modelos e APIs vocês usaram",
              "b": true
            }
          ],
          [
            {
              "t": "Passo a passo para testar, no README. Expliquem como rodar tudo do zero, quais variáveis de ambiente configurar e o que mais for preciso. Os jurados vão rodar e testar o projeto seguindo o que estiver escrito ali"
            }
          ],
          [
            {
              "t": "Vídeo do projeto, com pitch e demo. Combinem os dois do jeito que acharem melhor, desde que o vídeo mostre tanto a ideia quanto a solução funcionando. Surpreendam a gente. Se o projeto tiver link de acesso, mandem também"
            }
          ],
          [
            {
              "t": "Descrição do projeto. É um resumo, e precisa ter o problema, a dor, o produto que vocês fizeram e como esse produto resolve a dor. Os detalhes ficam no README"
            }
          ],
          [
            {
              "t": "Slides (opcional). O que vocês enviarem não é a versão final, dá para alterar e melhorar até a hora do pitch"
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Submissões fora do prazo ou incompletas podem ser desclassificadas."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Só os 5 times selecionados apresentam o pitch.",
            "b": true
          },
          {
            "t": " Mesmo assim, todo time precisa montar o seu, para o caso de ser selecionado."
          }
        ]
      }
    ]
  },
  {
    "id": "criterios",
    "title": "9. Critérios de avaliação",
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Os projetos são avaliados em quatro critérios. Não há nota por critério: a tabela mostra o que separa um projeto bom de um excelente, para vocês usarem como referência na hora de decidir o que construir."
          }
        ]
      },
      {
        "kind": "table",
        "head": [
          [
            {
              "t": "Critério"
            }
          ],
          [
            {
              "t": "O que olhamos"
            }
          ],
          [
            {
              "t": "Bom"
            }
          ],
          [
            {
              "t": "Excelente"
            }
          ]
        ],
        "rows": [
          [
            [
              {
                "t": "Impacto",
                "b": true
              }
            ],
            [
              {
                "t": "Quem tem o problema e o quanto a vida dessas pessoas muda"
              }
            ],
            [
              {
                "t": "Resolve uma dor real de um grupo claro de pessoas"
              }
            ],
            [
              {
                "t": "Ataca um problema grande, de muita gente, e dá para ver a diferença que faz"
              }
            ]
          ],
          [
            [
              {
                "t": "Inovação",
                "b": true
              }
            ],
            [
              {
                "t": "O que há de novo na solução e no uso da IA"
              }
            ],
            [
              {
                "t": "Traz um diferencial claro sobre o que já existe"
              }
            ],
            [
              {
                "t": "Faz algo que não seria possível sem IA, ou de um jeito que ninguém fez"
              }
            ]
          ],
          [
            [
              {
                "t": "Aplicação real",
                "b": true
              }
            ],
            [
              {
                "t": "Se isso funciona fora do hackathon"
              }
            ],
            [
              {
                "t": "Dá para imaginar alguém usando"
              }
            ],
            [
              {
                "t": "Tem um caminho concreto para chegar em quem precisa e crescer"
              }
            ]
          ],
          [
            [
              {
                "t": "Execução técnica",
                "b": true
              }
            ],
            [
              {
                "t": "Se o projeto funciona e faz sentido"
              }
            ],
            [
              {
                "t": "Roda a partir do repositório e cumpre o que a demo promete"
              }
            ],
            [
              {
                "t": "Funciona de ponta a ponta, com a IA fazendo trabalho de verdade, e aguenta o teste dos jurados"
              }
            ]
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Os jurados vão abrir o repositório, rodar o projeto e testar se ele funciona e faz sentido. O pitch é onde vocês mostram tudo isso."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Os critérios ou sua interpretação podem ser ajustados até o início do evento, com aviso no grupo."
          }
        ]
      }
    ]
  },
  {
    "id": "pitch",
    "title": "10. Pitch",
    "blocks": [
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Só os 5 times selecionados apresentam. Cada um tem "
            },
            {
              "t": "3 minutos de pitch e 2 minutos de perguntas",
              "b": true
            },
            {
              "t": " da banca. O tempo é controlado"
            }
          ],
          [
            {
              "t": "A ordem de apresentação sai no grupo de WhatsApp no dia"
            }
          ],
          [
            {
              "t": "As decisões do júri são finais"
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Uma estrutura que funciona em 3 minutos:",
            "b": true
          }
        ]
      },
      {
        "kind": "ol",
        "items": [
          [
            {
              "t": "Problema",
              "b": true
            },
            {
              "t": " (30s): quem sofre, com o quê, e por que importa"
            }
          ],
          [
            {
              "t": "Demo",
              "b": true
            },
            {
              "t": " (90s): mostre o produto rodando num caso real"
            }
          ],
          [
            {
              "t": "Como funciona",
              "b": true
            },
            {
              "t": " (30s): onde a IA entra e o que é difícil no que vocês fizeram"
            }
          ],
          [
            {
              "t": "Próximos passos",
              "b": true
            },
            {
              "t": " (30s): o que falta para isso chegar em quem precisa"
            }
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Dicas:",
            "b": true
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "Ganhe a atenção nos primeiros 30 segundos.",
              "b": true
            },
            {
              "t": " Comece pela história ou pelo número que mostra o tamanho do problema"
            }
          ],
          [
            {
              "t": "Mostre, não afirme.",
              "b": true
            },
            {
              "t": " A banca vai querer ver funcionando"
            }
          ],
          [
            {
              "t": "Ensaie com o cronômetro.",
              "b": true
            },
            {
              "t": " Três minutos passam rápido, e o pitch é cortado no tempo"
            }
          ],
          [
            {
              "t": "Prepare as perguntas óbvias:",
              "b": true
            },
            {
              "t": " por que isso é melhor do que o que já existe? Quem usaria? O que acontece quando a IA erra?"
            }
          ],
          [
            {
              "t": "Tenha um plano B.",
              "b": true
            },
            {
              "t": " Grave um vídeo da demo caso a internet ou a API falhem na hora"
            }
          ]
        ]
      },
      {
        "kind": "quote",
        "rich": [
          {
            "t": "\"Busque ser 80% preciso e 100% claro.\" (Y Combinator)"
          }
        ]
      }
    ]
  },
  {
    "id": "premiacao",
    "title": "11. Premiação",
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Os três primeiros colocados são premiados. Os valores são por time."
          }
        ]
      },
      {
        "kind": "table",
        "head": [
          [
            {
              "t": "Colocação"
            }
          ],
          [
            {
              "t": "Prêmio"
            }
          ]
        ],
        "rows": [
          [
            [
              {
                "t": "🥇 1º lugar"
              }
            ],
            [
              {
                "t": "R$ 1.000 e fast track no processo seletivo da IA Brasil Fellowship"
              }
            ]
          ],
          [
            [
              {
                "t": "🥈 2º lugar"
              }
            ],
            [
              {
                "t": "R$ 500"
              }
            ]
          ],
          [
            [
              {
                "t": "🥉 3º lugar"
              }
            ],
            [
              {
                "t": "R$ 300"
              }
            ]
          ]
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "O time vencedor tem direito ao fast track no processo seletivo"
          },
          {
            "t": " para IA Brasil Fellowship",
            "b": true
          },
          {
            "t": ", um programa de um ano fundado por Pedro Franceschi (Brex) e Victor Lazarte (Diffusion) para jovens com talento técnico excepcional. Os fellows recebem:"
          }
        ]
      },
      {
        "kind": "ul",
        "items": [
          [
            {
              "t": "R$ 100 mil",
              "b": true
            },
            {
              "t": " para se dedicar ao problema mais difícil que quiserem"
            }
          ],
          [
            {
              "t": "Uma semana em São Francisco",
              "b": true
            },
            {
              "t": " com os outros fellows e grandes founders"
            }
          ],
          [
            {
              "t": "Mentoria",
              "b": true
            },
            {
              "t": " de Pedro Franceschi e Victor Lazarte"
            }
          ],
          [
            {
              "t": "Suporte no visto americano",
              "b": true
            },
            {
              "t": " durante todo o processo"
            }
          ]
        ]
      }
    ]
  },
  {
    "id": "faq",
    "title": "12. Perguntas frequentes",
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Posso trocar alguém do meu time?",
            "b": true
          },
          {
            "t": "\nSó combinando antes com a organização pelo WhatsApp. (Até às 18:00 da sexta feira)"
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Podemos chegar com a ideia pronta?",
            "b": true
          },
          {
            "t": "\nSim, e recomendamos. Pesquisa, escopo, arquitetura e ambiente podem vir prontos. O código do projeto só começa às 9h20 de sábado."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Podemos mudar de ideia no dia?",
            "b": true
          },
          {
            "t": "\nPode, mas o tempo é curto. Mudar de ideia depois do almoço costuma ser um erro."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Precisa ser um aplicativo?",
            "b": true
          },
          {
            "t": "\nNão. Pode ser site, bot de WhatsApp, extensão, API, hardware ou o que fizer sentido para o problema. O que importa é funcionar na demo."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "A ideia e o código ficam com quem?",
            "b": true
          },
          {
            "t": "\nCom o time. Tudo o que for criado no hackathon pertence aos participantes."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Moro fora de João Pessoa. A organização cobre transporte ou hospedagem?",
            "b": true
          },
          {
            "t": "\nNão. Transporte e hospedagem ficam por conta de cada participante."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Onde tiro dúvidas?",
            "b": true
          },
          {
            "t": "\nNo grupo de WhatsApp. Para assuntos pessoais ou denúncias, fale diretamente com a organização no privado."
          }
        ]
      }
    ]
  },
  {
    "id": "regras",
    "title": "13. Regras gerais",
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Conduta.",
            "b": true
          },
          {
            "t": " O Hack IA Brasil é um ambiente seguro, inclusivo e respeitoso para todos. Não toleramos assédio, discriminação, intimidação ou exclusão de qualquer tipo, seja por gênero, identidade de gênero, orientação sexual, idade, deficiência, aparência, raça, etnia, religião ou nível técnico. Isso vale no local do evento, no grupo de WhatsApp, nos pitches e nos materiais submetidos. A organização pode advertir, remover do evento ou desclassificar quem descumprir estas regras. Denúncias podem ser feitas de forma confidencial à organização."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Honestidade.",
            "b": true
          },
          {
            "t": " Trapaça, plágio ou informação falsa levam à desclassificação."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Propriedade intelectual.",
            "b": true
          },
          {
            "t": " Os participantes mantêm a propriedade do que criarem. Ao participar, os times autorizam a organização a usar nomes, descrições, imagens e vídeos dos projetos para divulgação, sempre com crédito."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Imagem.",
            "b": true
          },
          {
            "t": " Ao comparecer, você autoriza fotos, vídeos e gravações de áudio durante o evento e o uso da sua imagem pela organização para divulgação."
          }
        ]
      },
      {
        "kind": "p",
        "rich": [
          {
            "t": "Responsabilidade.",
            "b": true
          },
          {
            "t": " A organização não se responsabiliza por perda de equipamentos, falhas técnicas, transporte ou hospedagem. A organização pode alterar programação, formato, critérios e premiação, com aviso no grupo de WhatsApp."
          }
        ]
      }
    ]
  },
  {
    "id": "outro",
    "title": null,
    "blocks": [
      {
        "kind": "p",
        "rich": [
          {
            "t": "Nos vemos no Medway. Venha com o problema escolhido, o ambiente pronto e vontade de colocar algo de pé em um dia."
          }
        ]
      }
    ]
  }
];
