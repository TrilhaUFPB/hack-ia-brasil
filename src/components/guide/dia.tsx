import { Accordion } from "@/components/fx/accordion";
import type { Rich as RichT } from "@/guide/content";
import { Checklist } from "./checklist";
import { GuideHero } from "./hero";
import { Pager } from "./pager";
import { PitchClock } from "./pitch-clock";
import { Rich } from "./rich";
import { FirstScreen, Rise } from "./rise";
import { Schedule } from "./schedule";
import { SectionIndex } from "./section-index";
import { Bullets, GuideSection, Intro, Lead, LeadRows, MiniHeading, Note, P, PullQuote } from "./ui";
import { PAGES, items, plain, rich, section, splitLead, splitTitle, table } from "./data";

/** /guia/dia: everything about Saturday itself. */
export function GuideDia() {
  const index = PAGES.dia.sections.flatMap((id) => {
    const { num, text } = splitTitle(section(id).title);
    return text ? [{ id, num, label: text }] : [];
  });

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 md:px-10 md:pb-24 lg:px-16">
      <GuideHero kicker="guia do participante" title={PAGES.dia.label} />
      <div className="mt-16 grid gap-16 lg:mt-24 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-20">
        <SectionIndex items={index} label={PAGES.dia.label} />
        <div className="grid min-w-0 gap-28 md:gap-40">
          <FirstScreen>
            <Programacao />
          </FirstScreen>
          <Participacao />
          <Levar />
          <Submissao />
          <Criterios />
          <Pitch />
          <Premiacao />
          <Faq />
          <Regras />
          <Outro />
          <Pager current="dia" />
        </div>
      </div>
    </main>
  );
}

function Programacao() {
  const b = section("programacao").blocks;
  const t = table(b[1]);
  return (
    <GuideSection id="programacao">
      <Rise y={10}>
        <Note rich={rich(b[0])} className="mt-8" />
      </Rise>
      <div className="mt-10">
        <Schedule head={t.head} rows={t.rows} />
      </div>
      <Rise y={12}>
        <div className="mt-10 grid gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-7">
          <P rich={rich(b[2])} />
          <P rich={rich(b[3])} />
        </div>
      </Rise>
    </GuideSection>
  );
}

/** "Antes do evento, à vontade: …" → the part up to the first ":" becomes the card's heading. */
function splitColon(r: RichT): { head: string; body: RichT } {
  const first = r[0];
  const at = first.t.indexOf(":");
  if (at < 0) return { head: "", body: r };
  return { head: first.t.slice(0, at + 1), body: [{ ...first, t: first.t.slice(at + 1).trimStart() }, ...r.slice(1)] };
}

function Participacao() {
  const b = section("participacao").blocks;
  const before = splitColon(rich(b[5]));
  const during = splitColon(rich(b[6]));
  return (
    <GuideSection id="participacao">
      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <Rise y={12}>
          <MiniHeading rich={rich(b[0])} />
          <Bullets items={items(b[1])} className="mt-4" />
        </Rise>
        <Rise y={12} delay={0.06}>
          <MiniHeading rich={rich(b[2])} />
          <Bullets items={items(b[3])} className="mt-4" />
        </Rise>
      </div>

      <Rise y={12}>
        <MiniHeading rich={rich(b[4])} className="mt-16" />
      </Rise>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {[before, during].map((c, i) => (
          <Rise key={i} y={12} delay={i * 0.06} className="h-full">
            <div
              className={`h-full rounded-2xl border p-5 md:p-6 ${
                i === 0 ? "border-white/[0.08] bg-white/[0.02]" : "border-white/25 bg-white/[0.05]"
              }`}
            >
              <p className="text-lg font-light text-white">{c.head}</p>
              <p className="mt-2 text-[15px] leading-[1.7] text-white/75">
                <Rich rich={c.body} />
              </p>
            </div>
          </Rise>
        ))}
      </div>

      <Rise y={12}>
        <MiniHeading rich={rich(b[7])} className="mt-16" />
        <Lead rich={rich(b[8])} className="mt-4" />
      </Rise>
    </GuideSection>
  );
}

function Levar() {
  const b = section("levar").blocks;
  return (
    <GuideSection id="levar">
      <Rise y={12} className="mt-8">
        <Checklist id="levar" items={items(b[0])} variant="lead" />
      </Rise>
      <Rise y={10}>
        <p className="mt-8 w-fit rounded-full border border-white/15 px-4 py-2 text-[14px] text-white/85">
          <Rich rich={rich(b[1])} />
        </p>
      </Rise>
    </GuideSection>
  );
}

function Submissao() {
  const b = section("submissao").blocks;
  return (
    <GuideSection id="submissao">
      <Rise y={12}>
        <p className="mt-8 max-w-[58ch] text-[17px] font-light leading-[1.65] text-white/85 md:text-lg">
          <Rich rich={rich(b[0])} strong="mt-3 block w-fit bg-white px-2 py-1 font-normal text-[#000928] md:mt-4 md:text-xl" />
        </p>
      </Rise>
      <Rise y={12}>
        <Intro rich={rich(b[1])} className="mt-12" />
      </Rise>
      <ol className="mt-5 border-t border-white/[0.08]">
        {items(b[2]).map((it, i) => (
          <Rise
            as="li"
            key={i}
            y={10}
            delay={Math.min(i, 4) * 0.04}
            className="grid grid-cols-[2.25rem_1fr] gap-3 border-b border-white/[0.08] py-4 text-[15px] leading-[1.7] text-white/80 md:text-base"
          >
            <span aria-hidden className="pt-1 font-mono text-xs text-white/35">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <Rich rich={it} />
            </span>
          </Rise>
        ))}
      </ol>
      <Rise y={10}>
        <P rich={rich(b[4])} className="mt-8" />
        <Note rich={rich(b[3])} className="mt-4" />
      </Rise>
    </GuideSection>
  );
}

// column name shown above each cell, from the table header (CSS content, not DOM text)
const CELL =
  "block leading-[1.6] before:mb-1 before:block before:font-mono before:text-[10px] before:uppercase before:tracking-[0.25em] before:text-white/40 before:content-[attr(data-label)]";

function Criterios() {
  const b = section("criterios").blocks;
  const { head, rows } = table(b[1]);
  return (
    <GuideSection id="criterios">
      <Rise y={12}>
        <Lead rich={rich(b[0])} className="mt-8" />
      </Rise>
      {/* A real table: the header row is read once by screen readers; each
          card shows its column names through data-label, so on screen the
          cards read on their own without repeating the text in the DOM. */}
      <table className="mt-12 block w-full text-left">
        <thead className="sr-only">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col">
                <Rich rich={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="grid gap-3 md:grid-cols-2">
          {rows.map(([name, look, good, great], i) => (
            <tr key={i} className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
              <th scope="row" className="block text-left text-xl font-light text-white md:text-2xl">
                <Rich rich={name} strong="font-light" />
              </th>
              <td data-label={plain(head[1])} className={`${CELL} mt-3 text-[14px] text-white/60`}>
                <Rich rich={look} />
              </td>
              <td data-label={plain(head[2])} className={`${CELL} mt-6 border-t border-white/[0.08] pt-5 text-[14px] text-white/60`}>
                <Rich rich={good} />
              </td>
              <td data-label={plain(head[3])} className={`${CELL} mt-4 text-[15px] text-white`}>
                <Rich rich={great} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-10 grid gap-4">
        <P rich={rich(b[2])} />
        <Note rich={rich(b[3])} />
      </div>
    </GuideSection>
  );
}

function Pitch() {
  const b = section("pitch").blocks;
  return (
    <GuideSection id="pitch">
      <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
        {items(b[0]).map((it, i) => (
          <Rise as="li" key={i} y={10} delay={i * 0.05} className="bg-black p-5 text-[15px] leading-[1.65] text-white/75">
            <Rich rich={it} strong="font-normal text-white" />
          </Rise>
        ))}
      </ul>

      <Rise y={12}>
        <Intro rich={rich(b[1])} className="mt-16" />
      </Rise>
      <div className="mt-6">
        <PitchClock items={items(b[2])} />
      </div>

      <Rise y={12}>
        <Intro rich={rich(b[3])} className="mt-16" />
      </Rise>
      <ul className="mt-5 border-t border-white/[0.08]">
        {items(b[4]).map((it, i) => {
          const { lead, body } = splitLead(it);
          return (
            <Rise as="li" key={i} y={10} delay={Math.min(i, 4) * 0.04} className="border-b border-white/[0.08] py-5">
              <p className="text-[17px] font-light text-white md:text-lg">
                <Rich rich={lead} strong="font-light" />
              </p>
              <p className="mt-1 max-w-[60ch] text-[15px] leading-[1.7] text-white/70">
                <Rich rich={body} />
              </p>
            </Rise>
          );
        })}
      </ul>

      <div className="mt-16">
        <PullQuote rich={rich(b[5])} />
      </div>
    </GuideSection>
  );
}

function Premiacao() {
  const b = section("premiacao").blocks;
  const { head, rows } = table(b[1]);
  return (
    <GuideSection id="premiacao">
      <Rise y={10}>
        <P rich={rich(b[0])} className="mt-8" />
      </Rise>
      <table className="mt-10 block w-full text-left">
        <thead className="sr-only">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col">
                <Rich rich={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
          {rows.map(([place, prize], i) => {
            return (
              <tr
                key={i}
                className={`flex flex-col justify-between gap-8 rounded-2xl border p-5 md:p-6 ${
                  i === 0 ? "border-white/30 bg-white/[0.06] md:min-h-[14rem]" : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                {/* place as a mono label, like the site's numbered cards; the Notion medals are dropped */}
                <th scope="row" className={`block text-left font-mono text-[13px] font-normal tracking-[0.08em] ${i === 0 ? "text-white" : "text-white/55"}`}>
                  <Rich rich={place} strong="font-normal" />
                </th>
                <td className={i === 0 ? "block text-xl font-light leading-snug text-white md:text-2xl" : "block text-2xl font-extralight text-white md:text-3xl"}>
                  <Rich rich={prize} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Rise y={12}>
        <P rich={rich(b[2])} className="mt-14" />
      </Rise>
      <ul className="mt-6 grid border-t border-white/[0.08] sm:grid-cols-2">
        {items(b[3]).map((it, i) => {
          const { lead, body } = splitLead(it);
          return (
            <Rise
              as="li"
              key={i}
              y={10}
              delay={i * 0.06}
              className={`border-b border-white/[0.08] py-7 ${i % 2 ? "sm:border-l sm:pl-7" : "sm:pr-6"}`}
            >
              <span aria-hidden className="font-mono text-xs text-white/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-4 text-2xl font-extralight text-white md:text-[1.75rem]">
                <Rich rich={lead} strong="font-extralight" />
              </p>
              <p className="mt-1 text-[15px] text-white/70">
                <Rich rich={body} />
              </p>
            </Rise>
          );
        })}
      </ul>
    </GuideSection>
  );
}

function Faq() {
  const b = section("faq").blocks;
  const qa = b.map((x) => {
    const text = plain(rich(x));
    const at = text.indexOf("\n");
    return { q: text.slice(0, at), a: text.slice(at + 1) };
  });
  return (
    <GuideSection id="faq">
      <div className="mt-8 border-t border-white/[0.08]">
        <Accordion
          items={qa}
          itemClass="border-b border-white/[0.08]"
          qClass="py-5 text-[16px] font-light text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60 md:text-[17px]"
          aClass="pb-6 pr-10 text-[15px] leading-[1.7] text-white/70"
        />
      </div>
    </GuideSection>
  );
}

function Regras() {
  const b = section("regras").blocks;
  return (
    <GuideSection id="regras">
      <LeadRows items={b.map(rich)} className="mt-8" />
    </GuideSection>
  );
}

function Outro() {
  const b = section("outro").blocks;
  return (
    <GuideSection id="outro" className="py-10 md:py-16">
      <Rise y={16}>
        <p className="mx-auto max-w-[24ch] text-balance text-center text-[1.6rem] font-extralight leading-[1.3] text-white md:text-[2.4rem]">
          <Rich rich={rich(b[0])} />
        </p>
      </Rise>
    </GuideSection>
  );
}
