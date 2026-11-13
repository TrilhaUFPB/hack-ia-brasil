"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SlideToConfirm } from "./fx/slide-to-confirm";
import { useHtmlLang } from "./fx/use-html-lang";
import { EVENT } from "@/content";
import {
  LIMIT,
  MAX_OTHERS,
  MIN_OTHERS,
  MODES,
  SOURCES,
  STAGES,
  emptyApplication,
  emptyPerson,
  isMinor,
  type Application,
  type Option,
  type Person,
} from "@/lib/application";
import { FORM } from "@/lib/form-copy";
import type { Lang } from "@/content";

type Copy = (typeof FORM)["pt"];
const CopyCtx = createContext<{ t: Copy; lang: Lang }>({ t: FORM.pt, lang: "pt" });

const DRAFT_KEY = "hackia-inscricao-v1";
const EASE = [0.22, 1, 0.36, 1] as const;

const field =
  "w-full border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/70";
const labelCls = "font-mono text-[11px] uppercase tracking-[0.22em] text-white/75";

export function ApplicationForm({ lang = "pt", header }: { lang?: Lang; header?: ReactNode }) {
  const t: Copy = FORM[lang] as Copy;
  useHtmlLang(lang);
  const [a, setA] = useState<Application>(emptyApplication);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [attempt, setAttempt] = useState(0); // remounts the slider after a failed send
  const [closed, setClosed] = useState(false); // checked after hydration, so the static page can still render the form
  const [loaded, setLoaded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // draft autosave: a team rep fills ~40 fields, losing them to a closed tab hurts
  // restored after hydration on purpose: reading storage during render would mismatch the server HTML
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        // merge per person too, so drafts saved before a field existed don't leave it undefined
        const d = JSON.parse(saved);
        const base = emptyApplication();
        setA({
          ...base,
          ...d,
          me: { ...base.me, ...d.me },
          team: { ...base.team, ...d.team, members: (d.team?.members ?? base.team.members).map((m: Person) => ({ ...emptyPerson(), ...m })) },
        });
      }
    } catch {}
    setClosed(Date.now() > Date.parse(EVENT.signupDeadline));
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!loaded || status === "sent") return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(a));
    } catch {}
  }, [a, loaded, status]);

  const steps: (keyof Copy["steps"])[] = ["you", ...(a.mode === "time" ? (["team"] as const) : []), "answers", "send"];
  const current = steps[Math.min(step, steps.length - 1)];
  const isTeam = a.mode === "time";
  const hasMinor = [a.me, ...(isTeam ? a.team.members : [])].some((p) => isMinor(p.age));

  const set = (patch: Partial<Application>) => setA((s) => ({ ...s, ...patch }));
  const setMe = (patch: Partial<Application["me"]>) => setA((s) => ({ ...s, me: { ...s.me, ...patch } }));
  const setTeam = (patch: Partial<Application["team"]>) => setA((s) => ({ ...s, team: { ...s.team, ...patch } }));
  const setMember = (i: number, patch: Partial<Person>) =>
    setTeam({ members: a.team.members.map((m, j) => (j === i ? { ...m, ...patch } : m)) });

  const go = (d: number) => {
    if (d > 0 && !formRef.current?.reportValidity()) return;
    setStep((s) => s + d);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    if (!formRef.current?.reportValidity()) return false;
    setStatus("sending");
    fetch("/api/inscricao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, lang }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Erro ao enviar");
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        setTimeout(() => setStatus("sent"), 400);
      })
      .catch(() => {
        setStatus("error");
        setAttempt((n) => n + 1);
      });
  };

  if (closed && status !== "sent") {
    return (
      <div className="border border-white/15 px-8 py-12 text-center">
        <p className={labelCls}>{t.closed.label}</p>
        <h2 className="mt-6 text-2xl font-extralight md:text-3xl">{t.closed.title}</h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/80">{t.closed.body}</p>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="mt-8 border border-white/15 px-8 py-12 text-center"
      >
        <p className={labelCls}>{t.sent.label}</p>
        <h2 className="mt-6 text-2xl font-extralight md:text-3xl">{t.sent.title(a.me.name.split(" ")[0])}</h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/80">{t.sent.body(isTeam)}</p>
      </motion.div>
    );
  }

  return (
    <CopyCtx.Provider value={{ t, lang }}>
    {header}
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="grid gap-10" noValidate={false}>
      {/* honeypot: hidden from people, bots fill it */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        value={a.website}
        onChange={(e) => set({ website: e.target.value })}
      />

      <ol className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.25em]">
        {steps.map((s, i) => (
          <li key={s} className={i === step ? "text-white" : i < step ? "text-white/60" : "text-white/30"}>
            {String(i + 1).padStart(2, "0")} {t.steps[s]}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="grid gap-8"
        >
          {current === "you" && (
            <>
              <Heading title={t.you.title} note={t.you.note} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label={t.name} value={a.me.name} onChange={(v) => setMe({ name: v })} autoComplete="name" />
                <Input label={t.email} type="email" value={a.me.email} onChange={(v) => setMe({ email: v })} autoComplete="email" />
                <Input
                  label={t.whatsapp}
                  type="tel"
                  value={a.me.whatsapp}
                  onChange={(v) => setMe({ whatsapp: v })}
                  autoComplete="tel"
                  pattern="[0-9\s\(\)\+\-]{10,}"
                  title={t.whatsappTitle}
                />
                <Input label={t.city} value={a.me.city} onChange={(v) => setMe({ city: v })} autoComplete="address-level2" />
              </div>
              <PersonCore id="me" p={a.me} onChange={setMe} />
              <Area
                label={t.myProject}
                hint={t.myProjectHint}
                value={a.me.project}
                onChange={(v) => setMe({ project: v })}
                max={500}
              />
              <Choice
                label={t.mode}
                name="mode"
                options={MODES}
                value={a.mode}
                onChange={(v) => set({ mode: v })}
                stacked
              />
            </>
          )}

          {current === "team" && (
            <>
              <Heading title={t.teamStep.title} note={t.teamStep.note} />
              {a.team.members.map((m, i) => (
                <fieldset key={i} className="grid gap-5 border-t border-white/10 pt-8">
                  <div className="flex items-baseline justify-between">
                    <legend className={labelCls}>{t.member} {i + 2}</legend>
                    {i >= MIN_OTHERS && (
                      <button
                        type="button"
                        onClick={() => setTeam({ members: a.team.members.filter((_, j) => j !== i) })}
                        className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white"
                      >
                        {t.remove}
                      </button>
                    )}
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input label={t.name} value={m.name} onChange={(v) => setMember(i, { name: v })} />
                    <Input label={t.email} type="email" value={m.email} onChange={(v) => setMember(i, { email: v })} />
                  </div>
                  <PersonCore id={`m${i}`} p={m} onChange={(patch) => setMember(i, patch)} />
                  <Area
                    label={t.memberProject}
                    hint={t.memberProjectHint}
                    value={m.project}
                    onChange={(v) => setMember(i, { project: v })}
                    max={500}
                  />
                </fieldset>
              ))}
              {a.team.members.length < MAX_OTHERS && (
                <button
                  type="button"
                  onClick={() => setTeam({ members: [...a.team.members, emptyPerson()] })}
                  className="justify-self-start border border-dashed border-white/25 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-white/75 transition-colors hover:border-white/70 hover:text-white"
                >
                  {t.addMember}
                </button>
              )}
              <Area
                label={t.plan}
                value={a.team.plan}
                onChange={(v) => setTeam({ plan: v })}
              />
            </>
          )}

          {current === "answers" && (
            <>
              <Heading {...t.answers(isTeam)} />
              <Area
                label={t.challenge}
                hint={t.challengeHint(isTeam)}
                value={a.challenge}
                onChange={(v) => set({ challenge: v })}
              />
              {!isTeam && (
                <Area
                  label={t.role}
                  value={a.role}
                  onChange={(v) => set({ role: v })}
                  max={500}
                />
              )}
            </>
          )}

          {current === "send" && (
            <>
              <Heading title={t.send.title} note={t.send.note} />
              <Check
                checked={a.available}
                onChange={(v) => set({ available: v })}
                label={t.available(isTeam)}
              />
              <Check
                checked={a.consent}
                onChange={(v) => set({ consent: v })}
                label={t.consent(isTeam, hasMinor)}
              />
              <Choice label={t.source} name="source" options={SOURCES} value={a.source} onChange={(v) => set({ source: v })} required={false} />
              <Summary a={a} />
              {status === "error" && (
                <p role="alert" className="text-sm text-white">
                  {t.error}
                </p>
              )}
              <SlideToConfirm
                key={attempt}
                className="border border-white/15 bg-white/[0.03] text-white"
                knobClass="bg-white text-[#000928]"
                fillClass="bg-white/15"
                label={status === "sending" ? t.sending : t.slide}
                doneLabel={t.sending}
                onConfirm={submit}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-4">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => go(-1)}
            className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/60 transition-colors hover:text-white"
          >
            {t.back}
          </button>
        ) : (
          <span className="text-xs text-white/50">{t.draftNote}</span>
        )}
        {current !== "send" && (
          <button
            type="button"
            onClick={() => go(1)}
            className="bg-white px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[#000928] transition-[filter] hover:brightness-110"
          >
            {t.next}
          </button>
        )}
      </div>
    </form>
    </CopyCtx.Provider>
  );
}

function Heading({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="text-2xl font-extralight md:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/75">{note}</p>
    </div>
  );
}

/** Fields every person answers, the applicant and each team member. */
function PersonCore({
  id,
  p,
  onChange,
}: {
  id: string;
  p: Person;
  onChange: (patch: Partial<Person>) => void;
}) {
  const { t } = useContext(CopyCtx);
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
        <Input
          label={t.age}
          type="number"
          inputMode="numeric"
          min={12}
          max={25}
          value={p.age}
          onChange={(v) => onChange({ age: v })}
          title={t.ageTitle}
        />
        <Input
          label={t.school}
          placeholder={t.schoolPlaceholder}
          value={p.school}
          onChange={(v) => onChange({ school: v })}
          required={false}
        />
      </div>
      {isMinor(p.age) && (
        <div className="grid gap-5 border-l border-white/20 pl-5 sm:grid-cols-2">
          <p className="text-sm leading-relaxed text-white/75 sm:col-span-2">{t.guardianNote}</p>
          <Input label={t.guardianName} value={p.guardianName} onChange={(v) => onChange({ guardianName: v })} />
          <Input
            label={t.guardianEmail}
            type="email"
            value={p.guardianEmail}
            onChange={(v) => onChange({ guardianEmail: v })}
          />
        </div>
      )}
      <Choice label={t.stage} name={`stage-${id}`} options={STAGES} value={p.stage} onChange={(v) => onChange({ stage: v })} />
      <Input
        label={t.links}
        required={false}
        placeholder={t.linksPlaceholder}
        value={p.links}
        onChange={(v) => onChange({ links: v })}
      />
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
};
function Input({ label, value, onChange, required = true, ...props }: InputProps) {
  const { t } = useContext(CopyCtx);
  return (
    <label className="grid content-start gap-2">
      <span className={labelCls}>
        {label}
        {!required && <span className="text-white/40"> · {t.optional}</span>}
      </span>
      <input {...props} required={required} value={value} onChange={(e) => onChange(e.target.value)} className={field} />
    </label>
  );
}

function Area({
  label,
  hint,
  value,
  onChange,
  max = LIMIT,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[15px] leading-snug text-white/90">{label}</span>
      {hint && <span className="text-sm text-white/60">{hint}</span>}
      <textarea
        required
        rows={5}
        maxLength={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${field} resize-y leading-relaxed`}
      />
      <span className={`justify-self-end font-mono text-[11px] tabular-nums ${value.length > max * 0.9 ? "text-white" : "text-white/40"}`}>
        {value.length}/{max}
      </span>
    </label>
  );
}

// relative: keeps the sr-only radio inside the pill, otherwise focusing it scrolls the page away
const pill =
  "relative cursor-pointer border border-white/15 px-4 py-2.5 text-sm text-white/80 transition-colors hover:border-white/50 has-[:checked]:border-white has-[:checked]:bg-white has-[:checked]:text-[#000928] has-[:focus-visible]:outline has-[:focus-visible]:outline-white";

function Choice({
  label,
  name,
  options,
  value,
  onChange,
  stacked,
  required = true,
}: {
  label: string;
  name: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  stacked?: boolean;
  required?: boolean;
}) {
  const { t, lang } = useContext(CopyCtx);
  return (
    <fieldset className="grid gap-3">
      <legend className={`${labelCls} mb-3`}>
        {label}
        {!required && <span className="text-white/40"> · {t.optional}</span>}
      </legend>
      <div className={stacked ? "grid gap-2" : "flex flex-wrap gap-2"}>
        {options.map((o) => (
          <label key={o.v} className={pill}>
            <input
              type="radio"
              name={name}
              required={required}
              checked={value === o.v}
              onChange={() => onChange(o.v)}
              className="sr-only"
            />
            {o[lang]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}


function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-4 text-sm leading-relaxed text-white/85">
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-white"
      />
      {label}
    </label>
  );
}

function Summary({ a }: { a: Application }) {
  const { t, lang } = useContext(CopyCtx);
  const label = (opts: Option[], v: string) => opts.find((o) => o.v === v)?.[lang] ?? "—";
  const people = [a.me, ...(a.mode === "time" ? a.team.members : [])];
  return (
    <div className="border border-white/10 p-5 text-sm text-white/80">
      <p className={labelCls}>{a.mode === "time" ? t.teamOf(1 + a.team.members.length) : label(MODES, a.mode)}</p>
      <ul className="mt-4 grid gap-1.5">
        {people.map((p, i) => (
          <li key={i}>
            {p.name || "—"} · {p.age || "?"} {t.years} · {label(STAGES, p.stage)}
          </li>
        ))}
      </ul>
    </div>
  );
}
