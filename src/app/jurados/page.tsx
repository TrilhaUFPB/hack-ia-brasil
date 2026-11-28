import { GuideBlock, RoleGuide, Roster, StepList, roleGuideMetadata } from "@/components/guide/role-guide";

export const metadata = roleGuideMetadata(
  "Guia dos jurados · Hack IA Brasil",
  "Os cinco critérios, as duas rodadas de avaliação e os pitches das equipes finalistas.",
);

const criteria = [
  { name: "Impacto", question: "Quem tem esse problema e o que muda para essa pessoa?" },
  { name: "Inovação", question: "O que a IA permite fazer de um jeito novo?" },
  { name: "Aplicação real", question: "Como a solução chegaria a quem precisa dela?" },
  { name: "Execução técnica", question: "O fluxo principal funciona de ponta a ponta na demo?" },
  { name: "Entrega no tempo", question: "Dada a complexidade da ideia, o que o time conseguiu pôr de pé?" },
];

const steps = [
  {
    title: "Durante o dia · circule pelas equipes",
    body: "Pergunte como chegaram à ideia e o que já testaram. Deixe as decisões com o time e a orientação com os mentores.",
  },
  {
    title: "1ª rodada · avalie as 23 equipes",
    body: "Comece antes do prazo de submissão das 16h. No painel, confira os documentos, os slides e a demo de cada projeto. Rode o projeto pelo repositório.",
  },
  {
    title: "2ª rodada · escolha as cinco finalistas",
    body: "Na sala reservada aos jurados, compare as notas, confira os relatórios e reveja os casos em que a banca divergiu. A equipe de organização cuida da entrada.",
  },
  {
    title: "17h · pitches das finalistas",
    body: "Observe se a equipe explica o problema, justifica a solução e consegue mostrar o produto funcionando.",
  },
];

const checks = [
  { signal: "Possível plágio", evidence: "Compare o trecho com a fonte e confira os créditos." },
  { signal: "Entrega incompleta", evidence: "Teste na demo o que a equipe diz ter entregue." },
  { signal: "Fora do prazo", evidence: "Confira se há código do projeto anterior às 9h20 ou mudanças na entrega após as 16h." },
  { signal: "Arquitetura", evidence: "Confira no repositório se os componentes descritos sustentam a demo." },
];

const jury = ["Antonia Lemann", "Carol Bartunek", "Felipe Duarte", "Tiago Trindade", "Samuel (Praso)"];

function Scorecard() {
  return (
    <section aria-labelledby="criterios" className="rounded-2xl border border-white/15 bg-[#101011] p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-4">
        <h2 id="criterios" className="text-xl font-normal tracking-tight text-white">Critérios de avaliação</h2>
        <span className="shrink-0 font-mono text-sm tabular-nums text-white/75">0 a 5</span>
      </div>
      <dl className="divide-y divide-white/10">
        {criteria.map(({ name, question }) => (
          <div key={name} className="py-3">
            <dt className="text-[15px] font-medium text-white">{name}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-white/70">{question}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-white/15 pt-4 text-sm leading-relaxed text-white/70">
        Use notas decimais, como 4,85.
      </p>
    </section>
  );
}

export default function JuryPage() {
  return (
    <RoleGuide
      role="jurados"
      title="Como avaliar os projetos"
      lead="Das 23 equipes, cinco chegam ao pitch das 17h. Registre em cada nota o que você viu a equipe demonstrar."
      feature={<Scorecard />}
    >
      <GuideBlock title="Cronograma da banca">
        <StepList steps={steps} />
        <a
          href="/jurados/projetos"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#000928] hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Abrir painel de projetos <span aria-hidden>→</span>
        </a>
      </GuideBlock>
      <GuideBlock title="Relatório técnico">
        <p className="mb-5 text-base leading-relaxed text-white/75">
          Cada equipe precisa de um relatório. Ao revisar um sinal, registre o link, o trecho ou o horário que permite verificá-lo.
        </p>
        <table className="w-full border-collapse text-left text-sm leading-relaxed">
          <thead className="border-b border-white/20 text-white/60">
            <tr>
              <th scope="col" className="pb-2 pr-4 font-normal">Sinal</th>
              <th scope="col" className="pb-2 font-normal">Como conferir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {checks.map(({ signal, evidence }) => (
              <tr key={signal}>
                <th scope="row" className="w-[31%] py-3 pr-4 align-top font-medium text-white">{signal}</th>
                <td className="py-3 align-top text-white/75">{evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GuideBlock>
      <GuideBlock title="Jurados">
        <Roster names={jury} />
      </GuideBlock>
    </RoleGuide>
  );
}
