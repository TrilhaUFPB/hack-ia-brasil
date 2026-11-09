"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SlideToConfirm } from "./fx/slide-to-confirm";
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
  type Person,
} from "@/lib/application";

const DRAFT_KEY = "hackia-inscricao-v1";
const EASE = [0.22, 1, 0.36, 1] as const;

const field =
  "w-full border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/70";
const labelCls = "font-mono text-[11px] uppercase tracking-[0.22em] text-white/75";

export function ApplicationForm() {
  const [a, setA] = useState<Application>(emptyApplication);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [attempt, setAttempt] = useState(0); // remounts the slider after a failed send
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
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!loaded || status === "sent") return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(a));
    } catch {}
  }, [a, loaded, status]);

  const steps = ["Você", ...(a.mode === "time" ? ["Time"] : []), "Respostas", "Enviar"];
  const current = steps[Math.min(step, steps.length - 1)];
  const isTeam = a.mode === "time";

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
      body: JSON.stringify(a),
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

  if (status === "sent") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="border border-white/15 px-8 py-12 text-center"
      >
        <p className={labelCls}>inscrição recebida</p>
        <h2 className="mt-6 text-2xl font-extralight md:text-3xl">Até o dia 21, {a.me.name.split(" ")[0]}.</h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/80">
          O resultado sai por e-mail. {isTeam && "Avise o seu time que a inscrição foi feita por você."}
        </p>
      </motion.div>
    );
  }

  return (
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
            {String(i + 1).padStart(2, "0")} {s}
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
          {current === "Você" && (
            <>
              <Heading title="Sobre você" note="Se você vai em time, é você quem inscreve o time inteiro." />
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Nome completo" value={a.me.name} onChange={(v) => setMe({ name: v })} autoComplete="name" />
                <Input label="E-mail" type="email" value={a.me.email} onChange={(v) => setMe({ email: v })} autoComplete="email" />
                <Input
                  label="WhatsApp com DDD"
                  type="tel"
                  value={a.me.whatsapp}
                  onChange={(v) => setMe({ whatsapp: v })}
                  autoComplete="tel"
                  pattern="[0-9\s\(\)\+\-]{10,}"
                  title="Número com DDD, ex.: (83) 99999-9999"
                />
                <Input label="Cidade / UF" value={a.me.city} onChange={(v) => setMe({ city: v })} autoComplete="address-level2" />
              </div>
              <PersonCore id="me" p={a.me} onChange={setMe} />
              <Area
                label="Um projeto de que você tem orgulho"
                hint="Não precisa ser de tecnologia: vale um app, um robô, uma olimpíada, um negócio, um evento, o grêmio, uma pesquisa, um trabalho voluntário. Conte o que era, qual foi a sua parte e mande o link, se tiver."
                value={a.me.project}
                onChange={(v) => setMe({ project: v })}
                max={500}
              />
              <Choice
                label="Como você vai participar?"
                name="mode"
                options={MODES.map((m) => m.label)}
                value={MODES.find((m) => m.v === a.mode)?.label ?? ""}
                onChange={(v) => set({ mode: MODES.find((m) => m.label === v)?.v ?? "" })}
                stacked
              />
            </>
          )}

          {current === "Time" && (
            <>
              <Heading title="O seu time" note="Times de 3 ou 4 pessoas, contando com você. Cada membro tem o seu espaço." />
              {a.team.members.map((m, i) => (
                <fieldset key={i} className="grid gap-5 border-t border-white/10 pt-8">
                  <div className="flex items-baseline justify-between">
                    <legend className={labelCls}>Membro {i + 2}</legend>
                    {i >= MIN_OTHERS && (
                      <button
                        type="button"
                        onClick={() => setTeam({ members: a.team.members.filter((_, j) => j !== i) })}
                        className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white"
                      >
                        remover
                      </button>
                    )}
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input label="Nome completo" value={m.name} onChange={(v) => setMember(i, { name: v })} />
                    <Input label="E-mail" type="email" value={m.email} onChange={(v) => setMember(i, { email: v })} />
                  </div>
                  <PersonCore id={`m${i}`} p={m} onChange={(patch) => setMember(i, patch)} />
                  <Area
                    label="Um projeto que essa pessoa construiu ou de que participou"
                    hint="Não precisa ser de tecnologia: vale um negócio, um evento, o grêmio, uma pesquisa, um trabalho voluntário. Conte o que era, qual foi a parte dela e mande o link, se tiver."
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
                  + adicionar 4º membro
                </button>
              )}
              <Area
                label="Por que vocês formaram esse time e como vão dividir o trabalho no dia?"
                value={a.team.plan}
                onChange={(v) => setTeam({ plan: v })}
              />
            </>
          )}

          {current === "Respostas" && (
            <>
              <Heading
                title={isTeam ? "Respostas do time" : "Suas respostas"}
                note={
                  isTeam
                    ? "Respondam juntos, pelo time. Não precisa ser longo: respostas específicas valem mais que bonitas."
                    : "Não precisa ser longo: respostas específicas valem mais que bonitas."
                }
              />
              <Area
                label="Escolha um problema real da sua escola, faculdade, cidade ou família que tecnologia poderia ajudar a resolver."
                hint="Isto não é o projeto do hackathon: o tema só é revelado na abertura, e ninguém vai precisar defender esta ideia no dia. Queremos entender como vocês pensam um problema com senso crítico. Para quem é? Por que importa? Como vocês saberiam que a solução funcionou?"
                value={a.challenge}
                onChange={(v) => set({ challenge: v })}
              />
              {!isTeam && (
                <Area
                  label="Que papel você quer ter num time e o que você traz?"
                  value={a.role}
                  onChange={(v) => set({ role: v })}
                  max={500}
                />
              )}
              <Area
                label={`Se ${isTeam ? "o time ganhasse" : "você ganhasse"} e entrasse na IA Brasil Fellowship, o que ${isTeam ? "fariam" : "faria"} nos 12 meses seguintes?`}
                value={a.fellowship}
                onChange={(v) => set({ fellowship: v })}
              />
            </>
          )}

          {current === "Enviar" && (
            <>
              <Heading title="Quase lá" note="Confira e deslize para enviar." />
              <Check
                checked={a.available}
                onChange={(v) => set({ available: v })}
                label={`Confirmo que ${isTeam ? "todo o time está disponível" : "estou disponível"} no sábado, 21/11, das 8h às 18h, em João Pessoa.`}
              />
              <Check
                checked={a.consent}
                onChange={(v) => set({ consent: v })}
                label={`Autorizo o uso destes dados para a seleção e da imagem ${isTeam ? "do time" : "minha"} na divulgação do evento. ${isTeam ? "Todos os membros" : "Eu"} ${isTeam ? "sabem" : "sei"} desta inscrição, e os responsáveis de quem tem menos de 18 anos estão cientes.`}
              />
              <Choice label="Como ficou sabendo do hackathon?" name="source" options={SOURCES} value={a.source} onChange={(v) => set({ source: v })} required={false} />
              <Summary a={a} />
              {status === "error" && (
                <p role="alert" className="text-sm text-white">
                  Não conseguimos enviar. Suas respostas estão salvas neste navegador; tente de novo em instantes.
                </p>
              )}
              <SlideToConfirm
                key={attempt}
                className="border border-white/15 bg-white/[0.03] text-white"
                knobClass="bg-white text-[#000928]"
                fillClass="bg-white/15"
                label={status === "sending" ? "Enviando…" : "Deslize para enviar"}
                doneLabel="Enviando…"
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
            ← voltar
          </button>
        ) : (
          <span className="text-xs text-white/50">Suas respostas ficam salvas neste navegador.</span>
        )}
        {current !== "Enviar" && (
          <button
            type="button"
            onClick={() => go(1)}
            className="bg-white px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[#000928] transition-[filter] hover:brightness-110"
          >
            Continuar
          </button>
        )}
      </div>
    </form>
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
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
        <Input
          label="Idade"
          type="number"
          inputMode="numeric"
          min={12}
          max={25}
          value={p.age}
          onChange={(v) => onChange({ age: v })}
          title="O hackathon é para pessoas de 12 a 25 anos"
        />
        <Input
          label="Escola ou universidade"
          placeholder="Se não estuda, escreva “não se aplica”"
          value={p.school}
          onChange={(v) => onChange({ school: v })}
        />
      </div>
      {isMinor(p.age) && (
        <div className="grid gap-5 border-l border-white/20 pl-5 sm:grid-cols-2">
          <p className="text-sm leading-relaxed text-white/75 sm:col-span-2">
            Menores de 18 precisam da autorização de um responsável. Se o time for aprovado, enviamos o termo para este
            e-mail.
          </p>
          <Input label="Nome do responsável" value={p.guardianName} onChange={(v) => onChange({ guardianName: v })} />
          <Input
            label="E-mail do responsável"
            type="email"
            value={p.guardianEmail}
            onChange={(v) => onChange({ guardianEmail: v })}
          />
        </div>
      )}
      <Choice label="Momento atual" name={`stage-${id}`} options={STAGES} value={p.stage} onChange={(v) => onChange({ stage: v })} />
      <Input
        label="LinkedIn, GitHub, site ou portfólio"
        required={false}
        placeholder="Cole um ou mais links, separados por vírgula"
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
  return (
    <label className="grid content-start gap-2">
      <span className={labelCls}>
        {label}
        {!required && <span className="text-white/40"> · opcional</span>}
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
  options: string[];
  value: string;
  onChange: (v: string) => void;
  stacked?: boolean;
  required?: boolean;
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className={`${labelCls} mb-3`}>
        {label}
        {!required && <span className="text-white/40"> · opcional</span>}
      </legend>
      <div className={stacked ? "grid gap-2" : "flex flex-wrap gap-2"}>
        {options.map((o) => (
          <label key={o} className={pill}>
            <input
              type="radio"
              name={name}
              required={required}
              checked={value === o}
              onChange={() => onChange(o)}
              className="sr-only"
            />
            {o}
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
  const people = [a.me, ...(a.mode === "time" ? a.team.members : [])];
  return (
    <div className="border border-white/10 p-5 text-sm text-white/80">
      <p className={labelCls}>{a.mode === "time" ? `time de ${1 + a.team.members.length} pessoas` : MODES.find((m) => m.v === a.mode)?.label}</p>
      <ul className="mt-4 grid gap-1.5">
        {people.map((p, i) => (
          <li key={i}>
            {p.name || "—"} · {p.age || "?"} anos · {p.stage || "—"}
          </li>
        ))}
      </ul>
    </div>
  );
}
