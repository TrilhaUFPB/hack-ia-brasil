"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SlideToConfirm } from "./fx/slide-to-confirm";

export type SignupTheme = {
  field: string;
  label: string;
  track: string;
  knob: string;
  fill: string;
  doneText?: string;
};

/**
 * Pre-registration form. Not wired to a backend yet: submission only
 * flips local state. Hook `onSubmit` up to a real endpoint before launch.
 */
export function SignupForm({ theme, success }: { theme: SignupTheme; success: ReactNode }) {
  const [sent, setSent] = useState(false);
  const [minor, setMinor] = useState(false);
  const [form, setForm] = useState<HTMLFormElement | null>(null);

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div
          key="ok"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {success}
        </motion.div>
      ) : (
        <motion.form
          key="form"
          ref={setForm}
          exit={{ opacity: 0, y: -8 }}
          className="grid gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field theme={theme} label="Nome" name="name" autoComplete="name" />
            <Field theme={theme} label="E-mail" name="email" type="email" autoComplete="email" />
            <Field theme={theme} label="Cidade / UF" name="city" autoComplete="address-level2" />
            <label className="grid gap-1.5">
              <span className={theme.label}>Idade</span>
              <input
                required
                name="age"
                type="number"
                min={12}
                max={25}
                inputMode="numeric"
                className={theme.field}
                onChange={(e) => setMinor(Number(e.target.value) > 0 && Number(e.target.value) < 18)}
              />
            </label>
          </div>
          <Field
            theme={theme}
            label="O que você já construiu? (link, repo, olimpíada…)"
            name="built"
          />
          {minor && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <Field theme={theme} label="E-mail do responsável" name="guardian" type="email" />
            </motion.div>
          )}
          <SlideToConfirm
            className={`mt-2 ${theme.track}`}
            knobClass={theme.knob}
            fillClass={theme.fill}
            doneTextClass={theme.doneText}
            label="Deslize para se inscrever"
            doneLabel="Enviado"
            onConfirm={() => {
              if (form && !form.reportValidity()) return false;
              setTimeout(() => setSent(true), 500);
            }}
          />
        </motion.form>
      )}
    </AnimatePresence>
  );
}

function Field({
  theme,
  label,
  ...props
}: { theme: SignupTheme; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-1.5">
      <span className={theme.label}>{label}</span>
      <input required className={theme.field} {...props} />
    </label>
  );
}
