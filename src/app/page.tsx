"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { EVENT, FAQ, FIELDS, PEOPLE, PRIZES, SCHEDULE } from "@/content";
import { ParticleScene } from "@/components/fx/particle-scene";
import { Scramble } from "@/components/fx/scramble";
import { RollingDigits } from "@/components/fx/rolling-digits";
import { pad, useCountdown } from "@/components/fx/use-countdown";
import { Reveal } from "@/components/fx/reveal";
import { Accordion } from "@/components/fx/accordion";
import { SignupForm } from "@/components/signup-form";

const EASE = [0.22, 1, 0.36, 1] as const;


function Label({ children }: { children: string }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/55">
      <Scramble text={children} />
    </p>
  );
}

function Timeline() {
  const [active, setActive] = useState(2);
  return (
    <div>
      <ul>
        {SCHEDULE.map((s, i) => (
          <li key={s.t}>
            <button
              type="button"
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`grid w-full grid-cols-[3.5rem_1fr_auto] items-baseline gap-4 border-l py-3 pl-5 text-left transition-colors duration-300 ${
                i === active ? "border-white text-white" : "border-white/10 text-white/55 hover:text-white/85"
              }`}
            >
              <span className="font-mono text-[10px]">{s.t}</span>
              <span className="text-sm font-light leading-snug">{s.what}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-60">{s.where}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  const cd = useCountdown(EVENT.start);

  return (
    <main className="bg-black font-light text-white selection:bg-[#00D468] selection:text-[#000928] [&>section]:relative [&>section]:z-10">
      <ParticleScene />
      {/* HERO */}
      <section data-scene="0" data-side="left" className="relative h-[100svh] min-h-[620px] overflow-hidden">
        <header className="absolute inset-x-0 top-0 z-10 mx-auto flex max-w-6xl items-center justify-between px-8 py-7 md:px-20 lg:px-32">
          <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/90">IA Hack</span>
          <nav className="hidden gap-10 font-mono text-[10px] uppercase tracking-[0.35em] text-white/55 md:flex">
            <a href="#premio" className="transition-colors hover:text-white">Prêmio</a>
            <a href="#dia" className="transition-colors hover:text-white">Dia</a>
            <a href="#quem" className="transition-colors hover:text-white">Quem</a>
          </nav>
          <a href="#inscricao" className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/90 transition-colors hover:text-white">
            inscrições →
          </a>
        </header>

        <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-8 pb-24 pt-32 md:justify-center md:px-20 md:pb-0 lg:px-32">
          <motion.p
            className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/65"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
          >
            <Scramble text="Hackathon · João Pessoa · 21.11" duration={1200} />
          </motion.p>
          <motion.h1
            className="mt-8 max-w-[15em] text-balance text-[clamp(1.7rem,3.2vw,2.6rem)] font-extralight leading-[1.1] tracking-[-0.01em]"
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.5, duration: 1.2, ease: EASE }}
          >
            Seu caminho para o Vale do Silício <span className="text-white/65">começa em João Pessoa.</span>
          </motion.h1>
          <motion.p
            className="mt-8 max-w-sm text-sm leading-relaxed text-white/65"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            Dez horas. Um problema difícil. O time vencedor vai direto para a entrevista da IA Brasil Fellowship.
          </motion.p>
          <motion.a
            href="#inscricao"
            className="pointer-events-auto mt-12 w-fit border-b border-white/30 pb-1 font-mono text-[11px] uppercase tracking-[0.35em] text-white/90 transition-colors hover:border-white hover:text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            inscrições →
          </motion.a>
          <motion.div
            className="mt-16 flex flex-col gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 1 }}
          >
            <div className="flex items-baseline gap-1.5 text-lg font-extralight tabular-nums text-white/85 md:text-xl">
              <RollingDigits value={pad(cd?.d)} />
              <span className="text-white/55">:</span>
              <RollingDigits value={pad(cd?.h)} />
              <span className="text-white/55">:</span>
              <RollingDigits value={pad(cd?.m)} />
              <span className="text-white/55">:</span>
              <RollingDigits value={pad(cd?.s)} />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-white/55">dias · horas · min · seg</span>
          </motion.div>
        </div>
      </section>

      {/* FACTS */}
      <section data-scene="0" data-side="left" className="border-y border-white/[0.06]">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 px-8 md:grid-cols-5 md:px-20 lg:px-32">
          {[
            ["quando", "21 nov · 8h–18h"],
            ["onde", "ONDER, Miramar"],
            ["quem", "12 a 25 anos"],
            ["custo", "gratuito"],
            ["parceria", "IA Brasil × Trilha"],
          ].map(([k, v], i) => (
            <div
              key={k}
              className={`border-white/[0.06] py-7 ${i % 2 ? "pl-6" : ""} ${i ? "md:border-l md:pl-6" : ""} ${i % 2 ? "border-l" : ""} ${
                i > 1 ? "border-t md:border-t-0" : ""
              }`}
            >
              <dt className="font-mono text-[9px] uppercase tracking-[0.4em] text-white/55">{k}</dt>
              <dd className="mt-2 text-sm text-white/90">
                <Scramble text={v} trigger="hover" />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* PRIZE */}
      <section data-scene="1" data-side="right" id="premio" className="mx-auto max-w-6xl px-8 py-36 md:px-20 lg:px-32 min-[901px]:!pl-[34%]">
        <Label>o que está em jogo</Label>
        <Reveal>
          <h2 className="mt-6 max-w-2xl text-2xl font-extralight leading-tight md:text-4xl">
            O vencedor{" "}
            <mark className="bg-[#00D468] px-[0.08em] text-[#000928]">pula a fila</mark> da fellowship.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/65">
            A IA Brasil Fellowship é um programa de um ano para jovens de 12 a 25 anos com talento técnico
            excepcional. Não precisa ter ideia nem empresa pronta.
          </p>
        </Reveal>
        <div className="mt-16 grid border-t border-white/[0.06] sm:grid-cols-2">
          {PRIZES.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.08} y={12}>
              <article
                className={`group h-full border-b border-white/[0.06] py-8 ${i % 2 ? "sm:border-l sm:pl-8" : "sm:pr-8"}`}
              >
                <span className="font-mono text-[10px] text-white/55">{p.n}</span>
                <h3 className="mt-6 text-2xl font-extralight md:text-3xl">
                  <Scramble text={p.title} trigger="hover" />
                </h3>
                <p className="mt-1 text-sm text-white/65">{p.sub}</p>
                <p className="mt-6 text-[13px] leading-relaxed text-white/55 transition-colors duration-500 group-hover:text-white/75">
                  {p.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* DAY */}
      <section data-scene="2" data-side="left" id="dia" className="mx-auto max-w-6xl px-8 pb-36 md:px-20 lg:px-32 min-[901px]:!pr-[34%]">
        <Label>o dia</Label>
        <Reveal>
          <h2 className="mt-6 text-2xl font-extralight md:text-4xl">08:00 — 18:00</h2>
        </Reveal>
        <div className="mt-14">
          <Timeline />
        </div>
      </section>

      {/* WHO */}
      <section data-scene="3" data-side="right" className="border-y border-white/[0.06]">
        <div className="mx-auto grid max-w-6xl gap-14 px-8 py-32 md:px-20 lg:px-32 min-[901px]:!pl-[34%]">
          <Reveal>
            <Label>quem pode</Label>
            <h2 className="mt-6 text-2xl font-extralight leading-tight md:text-3xl">
              Brasileiros de 12 a 25 anos que constroem coisas.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">
              Ensino médio, IF, olimpíada ou universidade: o que conta é o que você já fez. Menores de 18 precisam
              da confirmação de um responsável.
            </p>
          </Reveal>
          <ul className="self-end">
            {FIELDS.map((f, i) => (
              <li
                key={f}
                className="flex items-baseline justify-between border-b border-white/[0.06] py-3 text-sm text-white/70 transition-colors duration-300 hover:text-white"
              >
                <Scramble text={f} trigger="hover" />
                <span className="font-mono text-[9px] text-white/55">{String(i + 1).padStart(2, "0")}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PEOPLE */}
      <section data-scene="4" data-side="left" id="quem" className="mx-auto max-w-6xl px-8 py-36 md:px-20 lg:px-32 min-[901px]:!pr-[34%]">
        <Label>mentores</Label>
        <div className="mt-14 grid gap-16">
          {PEOPLE.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-white/55">{p.role}</p>
              <h3 className="mt-3 text-2xl font-extralight md:text-3xl">
                <Scramble text={p.name} trigger="hover" />
              </h3>
              <p className="mt-5 text-sm leading-relaxed text-white/65">{p.bio}</p>
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
      <section data-scene="5" data-side="right" className="mx-auto max-w-6xl px-8 pb-36 md:px-20 lg:px-32 min-[901px]:!pl-[34%]">
        <Label>perguntas</Label>
        <div className="mt-10 border-t border-white/[0.06]">
          <Accordion
            items={FAQ}
            itemClass="border-b border-white/[0.06]"
            qClass="py-5 text-[15px] text-white/90"
            aClass="pb-6 pr-10 text-sm leading-relaxed text-white/65"
          />
        </div>
      </section>

      {/* SIGNUP */}
      <section data-scene="6" data-side="left" id="inscricao" className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-8 py-36 md:px-20 lg:px-32 min-[901px]:!pr-[34%]">
          <Label>inscrições</Label>
          <h2 className="mt-6 text-2xl font-extralight md:text-4xl">Seu passaporte começa aqui.</h2>
          <div className="mt-14">
            <SignupForm
              theme={{
                label: "font-mono text-[9px] uppercase tracking-[0.3em] text-white/55",
                field:
                  "w-full border-0 border-b border-white/15 bg-transparent px-0 py-2 text-[15px] font-light text-white outline-none transition-colors focus:border-[#A0B5FF]",
                track: "border border-white/15 text-white/85",
                knob: "bg-white text-black",
                fill: "bg-[#00D468]",
                doneText: "text-[#000928]",
              }}
              success={
                <div className="py-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/55">recebido</p>
                  <p className="mt-4 text-xl font-extralight">
                    <Scramble text="Até dia 21, em João Pessoa." duration={900} />
                  </p>
                </div>
              }
            />
          </div>
          <a
            href={EVENT.fellowshipUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-16 inline-block text-[12px] tracking-[0.15em] text-white/55 transition-colors hover:text-white"
          >
            conheça a IA Brasil Fellowship ↗
          </a>
        </div>
        <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 border-t border-white/[0.06] px-8 py-8 font-mono text-[9px] uppercase tracking-[0.35em] text-white/55 md:px-20 lg:px-32">
          <span>© 2026 IA Hack</span>
          <span>O sol nasce primeiro aqui</span>
          <span>IA Brasil Fellowship</span>
        </footer>
        {/* Trilha lockup — "fio e rótulo" device from the Trilha brand */}
        <div className="mx-auto max-w-6xl px-8 pb-12 md:px-20 lg:px-32">
          <div className="flex items-center gap-4 font-mono text-[9px] lowercase tracking-[0.3em] text-white/55">
            <span className="h-px flex-1 bg-white/[0.06]" />
            co-organizado por
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>
          <a
            href="https://www.otrilha.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Trilha"
            className="mx-auto mt-6 block w-fit text-white/65 transition-colors duration-500 hover:text-[#A0B5FF]"
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
