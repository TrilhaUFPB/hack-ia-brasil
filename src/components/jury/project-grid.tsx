"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { videoEmbed, type Project } from "@/jury/submissions";

// Opening and closing the project: 0.96 → 1 + fade, 220ms. Judges open ~23 of these,
// so it stays quick. Reduced motion drops the scale (MotionConfig in the shell).
const QUICK = { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const };

const TRACKS = ["Saúde", "Educação", "Segurança"];

export function ProjectGrid({ projects }: { projects: Project[] }) {
  const [track, setTrack] = useState<string | null>(null);
  const [active, setActive] = useState<Project | null>(null);
  const shown = track ? projects.filter((p) => p.track === track) : projects;

  if (!projects.length) return null;

  return (
    <>
      <div role="group" aria-label="Filtrar por track" className="mb-8 flex flex-wrap gap-2 border-t border-white/15 pt-6">
        {[null, ...TRACKS].map((t) => {
          const count = t ? projects.filter((p) => p.track === t).length : projects.length;
          const on = track === t;
          return (
            <button
              key={t ?? "todos"}
              type="button"
              aria-pressed={on}
              onClick={() => setTrack(t)}
              className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                on ? "border-white bg-white text-[#000928]" : "border-white/20 text-white/70 hover:border-white/50 hover:text-white"
              }`}
            >
              {t ?? "Todos"} <span className="tabular-nums opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setActive(p)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b0b0c] text-left transition-colors hover:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <Cover project={p} index={i} />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/55">
                  {p.track || "Sem track"}
                </p>
                <h2 className="text-[1.35rem] font-light leading-tight text-white">{p.name}</h2>
                <p className="line-clamp-3 text-[15px] leading-relaxed text-white/70">{p.summary}</p>
                <span className="mt-auto pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/60 transition-colors group-hover:text-white">
                  Abrir projeto <span aria-hidden className="inline-block motion-safe:transition-transform motion-safe:group-hover:translate-x-1">→</span>
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <ProjectDialog project={active} onClose={() => setActive(null)} />
    </>
  );
}

function Cover({ project, index }: { project: Project; index: number }) {
  if (project.cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Drive-hosted covers, no next/image remote config needed
      <img
        src={project.cover}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="aspect-video w-full border-b border-white/10 bg-white/[0.03] object-cover"
      />
    );
  }
  return (
    <div className="relative flex aspect-video w-full items-end overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_60%)] p-5">
      <span aria-hidden className="absolute left-5 top-4 font-mono text-xs tabular-nums text-white/35">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span aria-hidden className="line-clamp-2 text-[2rem] font-extralight leading-none tracking-tight text-white/85">
        {project.name}
      </span>
    </div>
  );
}

function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (project) ref.current?.showModal();
  }, [project]);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={project?.name}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-white backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      {project && (
        <div
          className="flex h-full items-start justify-center overflow-y-auto px-3 py-3 md:px-6 md:py-8"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <ProjectPanel project={project} onClose={close} />
        </div>
      )}
    </dialog>
  );
}

/** "28/11/2026 15:01:23" (the sheet's timestamp) → "28/11 às 15:01" */
function submittedLabel(raw: string) {
  const m = raw.match(/(\d{1,2})\/(\d{1,2})\/\d{4}\s+(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")} às ${m[3].padStart(2, "0")}:${m[4]}` : raw;
}

function ProjectPanel({ project: p, onClose }: { project: Project; onClose: () => void }) {
  const embed = videoEmbed(p.video);
  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={QUICK}
      className="relative my-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-white/15 bg-[#0b0b0c] shadow-2xl"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full border border-white/20 bg-black/60 text-white/80 backdrop-blur hover:text-white focus-visible:outline-2"
      >
        ✕
      </button>

      {p.cover && (
        // eslint-disable-next-line @next/next/no-img-element -- Drive-hosted cover
        <img src={p.cover} alt="" referrerPolicy="no-referrer" className="aspect-[21/9] w-full border-b border-white/10 object-cover" />
      )}

      <div className="px-5 pb-8 pt-8 md:px-10 md:pb-12 md:pt-10">
        <header className="max-w-3xl pr-12 md:pr-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/25 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/80">
              {p.track || "Sem track"}
            </span>
            {p.submittedAt && (
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
                Enviado {submittedLabel(p.submittedAt)}
              </span>
            )}
          </div>
          <h2 className="mt-5 text-balance text-[clamp(2.25rem,6vw,4rem)] font-extralight leading-[1.02] tracking-[-0.02em]">{p.name}</h2>
          <p className="mt-5 max-w-[60ch] text-pretty text-lg leading-relaxed text-white/75 md:text-xl">{p.summary}</p>
        </header>

        <div className="mt-10 grid gap-10 border-t border-white/15 pt-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
          <div className="grid min-w-0 content-start gap-10">
            {embed && (
              <section>
                <h3 className="mb-4 text-[1.5rem] font-extralight tracking-tight md:text-[1.75rem]">Vídeo do pitch</h3>
                <iframe
                  src={embed}
                  title={`Pitch de ${p.name}`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="aspect-video w-full rounded-xl border border-white/10 bg-black"
                />
              </section>
            )}
            <section>
              <h3 className="mb-4 text-[1.5rem] font-extralight tracking-tight md:text-[1.75rem]">Sobre o projeto</h3>
              <p className="max-w-[68ch] whitespace-pre-line text-base leading-[1.75] text-white/75">{p.description}</p>
            </section>
          </div>

          <aside className="order-first grid content-start gap-4 lg:order-none lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border border-white/15 bg-white/[0.02] p-5">
              <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-white/60">Links</h3>
              <div className="grid gap-2.5">
                {p.repo && <Action href={p.repo} primary>Repositório</Action>}
                {p.demo && <Action href={p.demo}>Demo ao vivo</Action>}
                {p.video && <Action href={p.video}>Vídeo do pitch</Action>}
              </div>
            </div>
            <dl className="grid gap-3 rounded-xl border border-white/15 bg-white/[0.02] p-5 text-sm">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/60">Track</dt>
                <dd className="mt-1 text-white/85">{p.track || "Sem track"}</dd>
              </div>
              {!p.demo && (
                <div className="border-t border-white/10 pt-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/60">Demo</dt>
                  <dd className="mt-1 text-white/70">Sem link no ar. Rode pelo repositório.</dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      </div>
    </motion.article>
  );
}

function Action({ href, primary = false, children }: { href: string; primary?: boolean; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
        primary ? "bg-white text-[#000928] hover:bg-white/85" : "border border-white/20 text-white/80 hover:border-white/50 hover:text-white"
      }`}
    >
      {children} <span aria-hidden>↗</span>
    </a>
  );
}
