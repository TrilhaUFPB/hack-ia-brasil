"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EVENT, FAQ, PEOPLE, PRIZES, SCHEDULE } from "@/content";
import { ParticleScene, setCrowdView, setDialTime, setPeopleFocus, setPrizeView } from "@/components/fx/particle-scene";
import { SmoothScroll } from "@/components/fx/smooth-scroll";
import { ClickDots } from "@/components/fx/click-dots";
import { Scramble } from "@/components/fx/scramble";
import { RollingDigits } from "@/components/fx/rolling-digits";
import { pad, useCountdown } from "@/components/fx/use-countdown";
import { Reveal } from "@/components/fx/reveal";
import { Accordion } from "@/components/fx/accordion";

const EASE = [0.22, 1, 0.36, 1] as const;


function Label({ children }: { children: string }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/75">
      <Scramble text={children} />
    </p>
  );
}

const SLOT_HOURS = SCHEDULE.map((s) => {
  const [h, m] = s.t.split(":").map(Number);
  return h + m / 60;
});

// how far the page has scrolled through a pinned (sticky) section: 0 at its first
// stop, 1 at its last. Calls back once per frame while scrolling.
function useScrub(ref: React.RefObject<HTMLElement | null>, onProgress: (p: number) => void) {
  const cb = useRef(onProgress);
  useEffect(() => {
    cb.current = onProgress;
  });
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - innerHeight;
      cb.current(span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, [ref]);
}

const SLOT_MS = 7_000; // each slot of the schedule stays up for seven seconds

// The schedule scrolls like any section. While it is on screen the slots take turns
// by themselves, and the clock's hands fly to each one's time; a click jumps ahead.
function Schedule() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [round, setRound] = useState(0); // bumped by a click, so that slot gets its full turn

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.5 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const id = setTimeout(() => setActive((i) => (i + 1) % SCHEDULE.length), SLOT_MS);
    return () => clearTimeout(id);
  }, [inView, active, round]);

  useEffect(() => setDialTime(SLOT_HOURS[active]), [active]);

  const pick = (i: number) => {
    setActive(i);
    setRound((r) => r + 1);
  };

  return (
    <section ref={ref} id="dia" data-scene="2" data-side="left" className="flex min-h-[100svh] items-center max-[900px]:items-end">
      <div className="mx-auto w-full max-w-6xl px-8 py-24 max-[900px]:pb-10 max-[900px]:pt-[44svh] max-[900px]:text-center md:px-20 lg:px-32 min-[901px]:!pr-[34%]">
        <Label>cronograma</Label>
        <h2 className="mt-6 text-2xl font-extralight md:text-4xl">08:00 — 18:00</h2>
        <ul className="mt-14 max-[900px]:mt-8">
          {SCHEDULE.map((s, i) => (
            <li key={s.t}>
              <button
                type="button"
                onClick={() => pick(i)}
                className={`relative grid w-full grid-cols-[3.5rem_1fr_auto] items-baseline gap-4 overflow-hidden border-l py-3 pl-5 pr-4 text-left transition-colors duration-300 max-[900px]:py-2 ${
                  i === active ? "border-white bg-white text-black" : "border-white/10 text-white/75"
                }`}
              >
                {i === active && (
                  // a thin line along the bottom fills while this slot has its turn
                  <motion.span
                    key={`${active}-${round}-${inView}`}
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-black/25"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: inView ? 1 : 0 }}
                    transition={{ duration: inView ? SLOT_MS / 1000 : 0, ease: "linear" }}
                  />
                )}
                <span className="font-mono text-xs">{s.t}</span>
                <span className="text-sm font-light leading-snug">{s.what}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-70">{s.where}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// the prize pins with one stop per prize: the shape goes 100K → 1 semana → M → VISTO,
// and the matching card comes forward
function Prize() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useScrub(ref, (p) => {
    setPrizeView(p);
    setActive(Math.round(p * (PRIZES.length - 1)));
  });
  return (
    <section
      ref={ref}
      id="premio"
      data-steps={PRIZES.length}
      style={{ height: `${100 + (PRIZES.length - 1) * 60}svh` }}
    >
      <div
        data-scene="1"
        data-side="right"
        className="sticky top-0 mx-auto flex h-[100svh] max-w-6xl flex-col justify-center px-8 max-[900px]:justify-end max-[900px]:pb-10 max-[900px]:text-center md:px-20 lg:px-32 min-[901px]:!pl-[34%]"
      >
        <Label>o que está em jogo</Label>
        <Reveal>
          <h2 className="mx-auto mt-6 max-w-2xl text-2xl font-extralight leading-tight md:text-4xl">
            O vencedor{" "}
            <mark className="bg-[#FFFFFF] px-[0.08em] text-[#000928]">pula a fila</mark> da fellowship.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/80 [@media(max-height:820px)]:hidden">
            A{" "}
            <a
              href={EVENT.fellowshipUrl}
              target="_blank"
              rel="noreferrer"
              className="text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white"
            >
              IA Brasil Fellowship
            </a>{" "}
            é um programa de um ano para jovens de 12 a 25 anos com talento técnico excepcional.
          </p>
        </Reveal>
        <div
          data-shape-anchor
          className="mt-10 grid border-t border-white/[0.06] max-[900px]:mt-6 sm:grid-cols-2 [@media(max-height:820px)]:mt-5"
        >
          {PRIZES.map((p, i) => (
            <article
              key={p.n}
              className={`h-full border-b border-white/[0.06] py-8 transition-opacity duration-300 max-[900px]:py-5 [@media(max-height:820px)]:py-4 ${
                i % 2 ? "sm:border-l sm:pl-8" : "sm:pr-4"
              } ${i === active ? "opacity-100" : "opacity-30 max-[900px]:hidden"}`}
            >
              <span className="font-mono text-xs text-white/75">{p.n}</span>
              <h3 className="mt-6 text-2xl font-extralight md:text-3xl max-[900px]:mt-3 [@media(max-height:820px)]:mt-2">
                <Scramble text={p.title} trigger="hover" />
              </h3>
              <p className="mt-1 text-sm text-white/80">{p.sub}</p>
              <p className="mt-4 text-sm leading-relaxed text-white/75">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const CROWD_STOPS = 4;

// "quem pode" pins itself too: each stop turns the camera around the crowd, and the
// last one closes in on one person
function Crowd() {
  const ref = useRef<HTMLElement>(null);
  useScrub(ref, setCrowdView);
  return (
    <section
      ref={ref}
      data-steps={CROWD_STOPS}
      className="border-y border-white/[0.06]"
      style={{ height: `${100 + (CROWD_STOPS - 1) * 60}svh` }}
    >
      <div
        data-scene="3"
        data-side="right"
        className="sticky top-0 mx-auto flex h-[100svh] max-w-6xl items-center px-8 max-[900px]:items-end max-[900px]:pb-16 max-[900px]:text-center md:px-20 lg:px-32 min-[901px]:!pl-[34%]"
      >
        <Reveal>
          <Label>quem pode</Label>
          <h2 className="mt-6 text-2xl font-extralight leading-tight md:text-3xl">
            Brasileiros de 12 a 25 anos que constroem coisas.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/80">
            Software, IA, hardware, robótica, matemática, física, química ou biotecnologia. Ensino médio, IF,
            olimpíada ou universidade: o que conta é o que você já fez. Menores de 18 precisam da confirmação de um
            responsável.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// the founders pin too, one stop each: the hologram leans toward whoever is up,
// and their bio comes forward
function People() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useScrub(ref, (p) => {
    setPeopleFocus(p * 2 - 1);
    setActive(Math.round(p * (PEOPLE.length - 1)));
  });
  return (
    <section
      ref={ref}
      id="quem"
      data-steps={PEOPLE.length}
      style={{ height: `${100 + (PEOPLE.length - 1) * 60}svh` }}
    >
      <div
        data-scene="4"
        data-side="left"
        className="sticky top-0 mx-auto flex h-[100svh] max-w-6xl flex-col justify-center px-8 max-[900px]:justify-end max-[900px]:pb-12 max-[900px]:text-center md:px-20 lg:px-32 min-[901px]:!pr-[34%]"
      >
        <Label>quem está por trás</Label>
        <div className="mt-12 grid gap-12 max-[900px]:mt-8">
          {PEOPLE.map((p, i) => (
            <div
              key={p.name}
              className={`transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-30 max-[900px]:hidden"}`}
            >
              <Reveal delay={i * 0.1}>
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const cd = useCountdown(EVENT.start);

  return (
    <main className="bg-black font-light text-white selection:bg-[#FFFFFF] selection:text-[#000928] [&>section]:relative [&>section]:z-10">
      <SmoothScroll />
      <ParticleScene />
      <ClickDots />
      {/* HERO */}
      <section data-scene="0" data-side="left" className="relative h-[100svh] min-h-[620px] overflow-hidden">
        <header className="absolute inset-x-0 top-0 z-10 mx-auto flex max-w-6xl items-center justify-between px-8 py-7 md:px-20 lg:px-32">
          <span className="font-mono text-xs uppercase tracking-[0.28em] text-white/90">Hack IA Brasil</span>
          <nav className="hidden gap-10 font-mono text-xs uppercase tracking-[0.28em] text-white/75 md:flex">
            <a href="#premio" className="transition-colors hover:text-white">Prêmio</a>
            <a href="#dia" className="transition-colors hover:text-white">Dia</a>
            <a href="#quem" className="transition-colors hover:text-white">Quem</a>
          </nav>
          <a href="#inscricao" className="font-mono text-xs uppercase tracking-[0.28em] text-white/90 transition-colors hover:text-white">
            Inscreva-se
          </a>
        </header>

        <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-8 pb-24 pt-32 max-[900px]:items-center max-[900px]:text-center md:justify-center md:px-20 md:pb-32 lg:px-32">
          <motion.h1
            className="max-w-[15em] text-balance text-[clamp(1.7rem,3.2vw,2.6rem)] font-extralight leading-[1.1] tracking-[-0.01em]"
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.5, duration: 1.2, ease: EASE }}
          >
            <span className="text-white/80">Um hackathon em</span>{" "}
            <span className="font-normal text-white">João Pessoa</span>{" "}
            <span className="text-white/80">pode ser o seu caminho para o</span>{" "}
            <span className="font-normal text-white">Vale do Silício.</span>
          </motion.h1>
          <motion.p
            className="mt-8 text-sm leading-relaxed text-white/80 md:whitespace-nowrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            Dez horas. Um problema difícil. O foco é achar pessoas, não só projetos.
          </motion.p>
          <motion.div
            className="pointer-events-auto mt-12 flex flex-wrap items-center max-[900px]:justify-center gap-x-8 gap-y-4 font-mono text-[11px] uppercase tracking-[0.28em]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <a
              href="#inscricao"
              className="inline-flex items-center bg-[#FFFFFF] px-7 py-3.5 text-xs font-semibold tracking-[0.3em] text-[#000928] transition-[filter] duration-300 hover:brightness-110"
            >
              Quero participar
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
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/75">dias · horas · min · seg</span>
          </motion.div>
        </div>
      </section>

      {/* FACTS */}
      <section data-scene="0" data-side="left" className="border-y border-white/[0.06]">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 max-[900px]:text-center px-8 md:grid-cols-[1fr_1.7fr_0.9fr_0.9fr_1.1fr] md:px-20 lg:px-32">
          {[
            ["quando", "21 nov · 8h–18h"],
            ["onde", "R. Manoel Gualberto, 255, Miramar"],
            ["quem", "12 a 25 anos"],
            ["custo", "Gratuito"],
            ["parceria", "IA Brasil × Trilha"],
          ].map(([k, v], i) => (
            <div
              key={k}
              className={`border-white/[0.06] py-7 ${i % 2 ? "pl-6" : ""} ${i ? "md:border-l md:pl-6" : ""} ${i % 2 ? "border-l" : ""} ${
                i > 1 ? "border-t md:border-t-0" : ""
              }`}
            >
              <dt className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/75">{k}</dt>
              <dd className="mt-2 text-sm text-white/90">
                {k === "parceria" ? (
                  <>
                    <a href={EVENT.fellowshipUrl} target="_blank" rel="noreferrer" className="underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white">
                      IA Brasil
                    </a>{" "}
                    ×{" "}
                    <a href={EVENT.trilhaUrl} target="_blank" rel="noreferrer" className="underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white">
                      Trilha
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

      {/* PRIZE */}
      <Prize />

      {/* DAY */}
      <Schedule />

      {/* WHO */}
      <Crowd />

      {/* PEOPLE */}
      <People />

      {/* FAQ */}
      <section data-scene="5" data-side="right" className="border-t border-white/[0.06]">
        <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-8 py-36 max-[900px]:justify-end max-[900px]:pt-[44svh] md:px-20 lg:px-32 min-[901px]:!pl-[34%]">
          <div className="max-[900px]:text-center"><Label>perguntas</Label></div>
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
          <Label>inscrições</Label>
          <h2 className="mt-6 text-3xl font-extralight leading-tight md:text-5xl">
            Inscrições abrem <span className="text-[#FFFFFF]">em breve.</span>
          </h2>
          <p className="mt-6 font-mono text-xs uppercase leading-relaxed tracking-[0.3em] text-white/75">
            21.11 · 8h–18h · Miramar, João Pessoa
          </p>
          <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[12px] tracking-[0.15em] text-white/75">
            <a href={EVENT.fellowshipUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
              conheça a IA Brasil Fellowship ↗
            </a>
            <a href={EVENT.trilhaUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
              conheça o Trilha ↗
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
            co-organizado por
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
