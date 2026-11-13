"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { EVENT, contentFor, localePath, type Lang } from "@/content";
import { useHtmlLang } from "@/components/fx/use-html-lang";
import { ParticleScene } from "@/components/fx/particle-scene";
import { ClickDots } from "@/components/fx/click-dots";
import { Scramble } from "@/components/fx/scramble";
import { RollingDigits } from "@/components/fx/rolling-digits";
import { pad, useCountdown } from "@/components/fx/use-countdown";
import { Reveal } from "@/components/fx/reveal";
import { Accordion } from "@/components/fx/accordion";

const EASE = [0.22, 1, 0.36, 1] as const;

// Inline page copy. Event data (prizes, schedule, people, FAQ) lives in content.ts.
const T = {
  pt: {
    nav: ["Dia", "Prêmio", "Quem"],
    apply: "Inscreva-se",
    switchLabel: "EN",
    h1: ["Um hackathon em", "João Pessoa", "pode ser o seu caminho para o", "Vale do Silício."],
    sub: "Dez horas. Um problema difícil. O foco é achar pessoas, não só projetos.",
    cta: "Quero participar",
    countdown: "dias · horas · min · seg",
    facts: [
      ["quando", "28 nov · 8h–18h"],
      ["onde", "R. Manoel Gualberto, 255, Miramar"],
      ["quem", "12 a 25 anos"],
      ["custo", "Gratuito"],
      ["parceria", ""],
    ],
    prizeLabel: "o que está em jogo",
    prizeH2: ["O vencedor", "pula a fila", "da fellowship."],
    prizeP: ["A", "é um programa de um ano para jovens de 12 a 25 anos com talento técnico excepcional."],
    perksLabel: "o que os fellows recebem",
    dayLabel: "cronograma",
    whoLabel: "quem pode",
    whoH2: "Brasileiros de 12 a 25 anos que constroem coisas.",
    whoP: "Software, IA, hardware, robótica, matemática, física, química ou biotecnologia. Ensino médio, IF, olimpíada ou universidade: o que conta é o que você já fez. Menores de 18 precisam da confirmação de um responsável.",
    peopleLabel: "quem está por trás",
    faqLabel: "perguntas",
    signupLabel: "inscrições",
    signupH2: ["Inscrições", "abertas."],
    signupLine: "28.11 · 8h–18h · Miramar, João Pessoa",
    signupBtn: "Inscrever-se",
    aboutFellowship: "conheça a IA Brasil Fellowship ↗",
    aboutTrilha: "conheça o Trilha ↗",
    aboutDevin: "conheça o Devin, da Cognition ↗",
    coOrganized: "co-organizado por",
  },
  en: {
    nav: ["Day", "Prize", "People"],
    apply: "Apply",
    switchLabel: "PT",
    h1: ["A hackathon in", "João Pessoa", "could be your path to", "Silicon Valley."],
    sub: "Ten hours. One hard problem. We're looking for people, not just projects.",
    cta: "Count me in",
    countdown: "days · hours · min · sec",
    facts: [
      ["when", "Nov 28 · 8am–6pm"],
      ["where", "R. Manoel Gualberto, 255, Miramar"],
      ["who", "Ages 12 to 25"],
      ["cost", "Free"],
      ["partners", ""],
    ],
    prizeLabel: "what's at stake",
    prizeH2: ["The winner", "skips the line", "for the fellowship."],
    prizeP: ["The", "is a one-year program for people aged 12 to 25 with exceptional technical talent."],
    perksLabel: "what fellows get",
    dayLabel: "schedule",
    whoLabel: "who can apply",
    whoH2: "Brazilians aged 12 to 25 who build things.",
    whoP: "Software, AI, hardware, robotics, math, physics, chemistry or biotech. High school, technical school, olympiads or university: what counts is what you've already done. Under-18s need a guardian's consent.",
    peopleLabel: "who's behind it",
    faqLabel: "questions",
    signupLabel: "applications",
    signupH2: ["Applications", "open."],
    signupLine: "11.28 · 8am–6pm · Miramar, João Pessoa",
    signupBtn: "Apply",
    aboutFellowship: "about the IA Brasil Fellowship ↗",
    aboutTrilha: "about Trilha ↗",
    aboutDevin: "about Devin, by Cognition ↗",
    coOrganized: "co-organized by",
  },
};


function Label({ children }: { children: string }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/75">
      <Scramble text={children} />
    </p>
  );
}

function Timeline({ schedule }: { schedule: { t: string; what: string; where: string }[] }) {
  const [active, setActive] = useState(2);
  return (
    <div>
      <ul>
        {schedule.map((s, i) => (
          <li key={s.t}>
            <button
              type="button"
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`grid w-full grid-cols-[3.5rem_1fr_auto] items-baseline gap-4 border-l py-3 pl-5 text-left transition-colors duration-300 ${
                i === active ? "border-white text-white" : "border-white/10 text-white/75 hover:text-white/85"
              }`}
            >
              <span className="font-mono text-xs">{s.t}</span>
              <span className="text-sm font-light leading-snug">{s.what}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60">{s.where}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Home({ lang }: { lang: Lang }) {
  const cd = useCountdown(EVENT.start);
  const t = T[lang];
  const { PRIZES, SCHEDULE, PEOPLE, FAQ } = contentFor(lang);
  const signup = localePath(lang, EVENT.signupUrl);
  useHtmlLang(lang);

  return (
    <main className="bg-black font-light text-white selection:bg-[#FFFFFF] selection:text-[#000928] [&>section]:relative [&>section]:z-10">
      <ParticleScene />
      <ClickDots />
      {/* HERO */}
      <section data-scene="0" data-side="left" className="relative h-[100svh] min-h-[620px] overflow-hidden">
        <header className="absolute inset-x-0 top-0 z-10 mx-auto flex max-w-6xl items-center justify-between px-8 py-7 md:grid md:grid-cols-[1fr_auto_1fr] md:px-20 lg:px-32">
          <span className="font-mono text-xs uppercase tracking-[0.28em] text-white/90">Hack IA Brasil</span>
          <nav className="hidden gap-10 font-mono text-xs uppercase tracking-[0.28em] text-white/75 md:flex">
            <a href="#dia" className="transition-colors hover:text-white">{t.nav[0]}</a>
            <a href="#premio" className="transition-colors hover:text-white">{t.nav[1]}</a>
            <a href="#quem" className="transition-colors hover:text-white">{t.nav[2]}</a>
          </nav>
          <div className="flex items-center justify-end gap-6 font-mono text-xs uppercase tracking-[0.28em]">
            <a href={signup} className="text-white/90 transition-colors hover:text-white">
              {t.apply}
            </a>
            <a
              href={localePath(lang === "en" ? "pt" : "en", "/")}
              hrefLang={lang === "en" ? "pt-BR" : "en"}
              className="w-6 text-right text-white/60 transition-colors hover:text-white"
            >
              {t.switchLabel}
            </a>
          </div>
        </header>

        <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-8 pb-24 pt-32 max-[900px]:items-center max-[900px]:text-center md:justify-center md:px-20 md:pb-32 lg:px-32">
          <motion.h1
            className="max-w-[15em] text-balance text-[clamp(1.7rem,3.2vw,2.6rem)] font-extralight leading-[1.1] tracking-[-0.01em]"
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.5, duration: 1.2, ease: EASE }}
          >
            <span className="text-white/80">{t.h1[0]}</span>{" "}
            <span className="font-normal text-white">{t.h1[1]}</span>{" "}
            <span className="text-white/80">{t.h1[2]}</span>{" "}
            <span className="font-normal text-white">{t.h1[3]}</span>
          </motion.h1>
          <motion.p
            className="mt-8 text-sm leading-relaxed text-white/80 md:whitespace-nowrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            {t.sub}
          </motion.p>
          <motion.div
            className="pointer-events-auto mt-12 flex flex-wrap items-center max-[900px]:justify-center gap-x-8 gap-y-4 font-mono text-[11px] uppercase tracking-[0.28em]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <a
              href={signup}
              className="inline-flex items-center bg-[#FFFFFF] px-7 py-3.5 text-xs font-semibold tracking-[0.3em] text-[#000928] transition-[filter] duration-300 hover:brightness-110"
            >
              {t.cta}
            </a>
          </motion.div>
          <motion.div
            className="mt-16 flex flex-col gap-2 max-[900px]:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 1 }}
          >
            <div className="flex items-baseline gap-1.5 text-lg font-extralight tabular-nums text-white/85 md:text-xl">
              <RollingDigits value={pad(cd?.d)} />
              <span className="text-white/75">:</span>
              <RollingDigits value={pad(cd?.h)} />
              <span className="text-white/75">:</span>
              <RollingDigits value={pad(cd?.m)} />
              <span className="text-white/75">:</span>
              <RollingDigits value={pad(cd?.s)} />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/75">{t.countdown}</span>
          </motion.div>
        </div>
      </section>

      {/* FACTS */}
      <section data-scene="0" data-side="left" className="border-y border-white/[0.06]">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 max-[900px]:text-center px-8 md:grid-cols-[1fr_1.7fr_0.9fr_0.9fr_1.1fr] md:px-20 lg:px-32">
          {t.facts.map(([k, v], i) => (
            <div
              key={k}
              className={`border-white/[0.06] py-7 ${i % 2 ? "pl-6" : ""} ${i ? "md:border-l md:pl-6" : ""} ${i % 2 ? "border-l" : ""} ${
                i > 1 ? "border-t md:border-t-0" : ""
              }`}
            >
              <dt className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/75">{k}</dt>
              <dd className="mt-2 text-sm text-white/90">
                {i === t.facts.length - 1 ? (
                  <>
                    <a href={EVENT.fellowshipUrl} target="_blank" rel="noreferrer" className="underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white">
                      IA Brasil
                    </a>{" "}
                    ×{" "}
                    <a href={EVENT.trilhaUrl} target="_blank" rel="noreferrer" className="underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white">
                      Trilha
                    </a>
                    {" "}
                    ×{" "}
                    <a href={EVENT.cognitionUrl} target="_blank" rel="noreferrer" className="underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white">
                      Cognition
                    </a>
                  </>
                ) : (
                  <Scramble text={v} trigger="hover" />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* DAY */}
      <section data-scene="2" data-side="right" id="dia" className="mx-auto max-w-6xl px-8 py-36 max-[900px]:pt-[44svh] max-[900px]:text-center md:px-20 lg:px-32 min-[901px]:!pl-[34%]">
        <Label>{t.dayLabel}</Label>
        <Reveal>
          <h2 className="mt-6 text-2xl font-extralight md:text-4xl">08:00 — 18:00</h2>
        </Reveal>
        <div className="mt-14">
          <Timeline schedule={SCHEDULE} />
        </div>
      </section>

      {/* PRIZE */}
      <section data-scene="1" data-side="left" id="premio" className="mx-auto max-w-6xl px-8 py-36 max-[900px]:pt-[44svh] max-[900px]:text-center md:px-20 lg:px-32 min-[901px]:!pr-[34%]">
        <Label>{t.prizeLabel}</Label>
        <Reveal>
          <h2 className="mx-auto mt-6 max-w-2xl text-2xl font-extralight leading-tight md:text-4xl">
            {t.prizeH2[0]}{" "}
            <mark className="bg-[#FFFFFF] px-[0.08em] text-[#000928]">{t.prizeH2[1]}</mark> {t.prizeH2[2]}
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/80">
            {t.prizeP[0]}{" "}
            <a
              href={EVENT.fellowshipUrl}
              target="_blank"
              rel="noreferrer"
              className="text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white"
            >
              IA Brasil Fellowship
            </a>{" "}
            {t.prizeP[1]}
          </p>
        </Reveal>
        <p className="mt-14 font-mono text-[11px] uppercase tracking-[0.3em] text-white/75">{t.perksLabel}</p>
        <div className="mt-6 grid border-t border-white/[0.06] sm:grid-cols-2">
          {PRIZES.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.08} y={12}>
              <article
                className={`group h-full border-b border-white/[0.06] py-8 ${i % 2 ? "sm:border-l sm:pl-8" : "sm:pr-4"}`}
              >
                <span className="font-mono text-xs text-white/75">{p.n}</span>
                <h3 className="mt-6 text-2xl font-extralight md:text-3xl">
                  <Scramble text={p.title} trigger="hover" />
                </h3>
                <p className="mt-1 text-sm text-white/80">{p.sub}</p>
                <p className="mt-4 text-sm leading-relaxed text-white/75 transition-colors duration-500 group-hover:text-white/90">
                  {p.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* WHO */}
      <section data-scene="3" data-side="right" className="border-y border-white/[0.06]">
        <div className="mx-auto flex min-h-[100svh] max-w-6xl items-center px-8 py-32 max-[900px]:items-end max-[900px]:pt-[44svh] max-[900px]:text-center md:px-20 lg:px-32 min-[901px]:!pl-[34%]">
          <Reveal>
            <Label>{t.whoLabel}</Label>
            <h2 className="mt-6 text-2xl font-extralight leading-tight md:text-3xl">
              {t.whoH2}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/80">
              {t.whoP}
            </p>
          </Reveal>
        </div>
      </section>

      {/* PEOPLE */}
      <section data-scene="4" data-side="left" id="quem" className="mx-auto max-w-6xl px-8 py-36 max-[900px]:pt-[44svh] max-[900px]:text-center md:px-20 lg:px-32 min-[901px]:!pr-[34%]">
        <Label>{t.peopleLabel}</Label>
        <div className="mt-14 grid gap-16">
          {PEOPLE.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/75">{p.role}</p>
              <h3 className="mt-3 text-2xl font-extralight md:text-3xl">
                <Scramble text={p.name} trigger="hover" />
              </h3>
              <p className="mt-5 text-sm leading-relaxed text-white/80">{p.bio}</p>
              <a
                href={p.linkedin}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-block border-b border-white/20 pb-0.5 text-[12px] tracking-[0.15em] text-white/75 transition-colors hover:border-white hover:text-white"
              >
                linkedin ↗
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section data-scene="5" data-side="right" className="border-t border-white/[0.06]">
        <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-8 py-36 max-[900px]:justify-end max-[900px]:pt-[44svh] md:px-20 lg:px-32 min-[901px]:!pl-[34%]">
          <div className="max-[900px]:text-center"><Label>{t.faqLabel}</Label></div>
          <div className="mt-10 border-t border-white/[0.06]">
            <Accordion
              items={FAQ}
              itemClass="border-b border-white/[0.06]"
              qClass="py-5 text-[15px] text-white/90"
              aClass="pb-6 pr-10 text-sm leading-relaxed text-white/80"
            />
          </div>
        </div>
      </section>

      {/* SIGNUP */}
      <section id="inscricao" className="border-t border-white/[0.06]">
        <div data-scene="6" className="mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-center px-8 py-36 text-center md:px-20 lg:px-32">
          <Label>{t.signupLabel}</Label>
          <h2 className="mt-6 text-3xl font-extralight leading-tight md:text-5xl">
            {t.signupH2[0]} <span className="text-[#FFFFFF]">{t.signupH2[1]}</span>
          </h2>
          <p className="mt-6 font-mono text-xs uppercase leading-relaxed tracking-[0.3em] text-white/75">
            {t.signupLine}
          </p>
          <a
            href={signup}
            className="mt-12 inline-flex items-center bg-[#FFFFFF] px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[#000928] transition-[filter] duration-300 hover:brightness-110"
          >
            {t.signupBtn}
          </a>
          <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[12px] tracking-[0.15em] text-white/75">
            <a href={EVENT.fellowshipUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
              {t.aboutFellowship}
            </a>
            <a href={EVENT.trilhaUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
              {t.aboutTrilha}
            </a>
            <a href={EVENT.devinUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
              {t.aboutDevin}
            </a>
          </div>
        </div>
        <footer className="mx-auto flex max-w-6xl flex-wrap justify-between max-[900px]:justify-center max-[900px]:text-center gap-4 border-t border-white/[0.06] px-8 py-8 font-mono text-[11px] uppercase tracking-[0.28em] text-white/75 md:px-20 lg:px-32">
          <span>© 2026 Hack IA Brasil</span>
          <a href={EVENT.fellowshipUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
            iabrasil.com ↗
          </a>
        </footer>
        {/* Trilha lockup — "fio e rótulo" device from the Trilha brand */}
        <div className="mx-auto max-w-6xl px-8 pb-12 md:px-20 lg:px-32">
          <div className="flex items-center gap-4 font-mono text-[11px] lowercase tracking-[0.3em] text-white/75">
            <span className="h-px flex-1 bg-white/[0.06]" />
            {t.coOrganized}
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>
          <a
            href="https://www.otrilha.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Trilha"
            className="mx-auto mt-6 block w-fit text-white/80 transition-colors duration-500 hover:text-white"
          >
            <span
              aria-hidden
              className="block h-[22px] w-[32px] bg-current"
              style={{
                WebkitMask: "url(/montanha.svg) center/contain no-repeat",
                mask: "url(/montanha.svg) center/contain no-repeat",
              }}
            />
          </a>
        </div>
      </section>
    </main>
  );
}
