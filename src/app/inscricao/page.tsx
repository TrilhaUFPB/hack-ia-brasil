import type { Metadata } from "next";
import Link from "next/link";
import { EVENT } from "@/content";
import { ApplicationForm } from "@/components/application-form";

export const metadata: Metadata = {
  title: "Inscrição · Hack IA Brasil",
  description: "Inscreva-se sozinho(a) ou com o seu time no Hack IA Brasil, 21 de novembro em João Pessoa.",
};

export default function Inscricao() {
  return (
    <main className="min-h-dvh bg-black font-light text-white selection:bg-white selection:text-[#000928]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-7 md:px-8">
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.28em] text-white/90 transition-colors hover:text-white">
          ← Hack IA Brasil
        </Link>
        <span className="hidden font-mono text-[11px] uppercase sm:inline tracking-[0.28em] text-white/60">21.11 · João Pessoa</span>
      </header>
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-10 md:px-8 md:pt-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/75">inscrições</p>
        <h1 className="mt-6 text-3xl font-extralight leading-tight md:text-5xl">Mostre o que você já construiu.</h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/80">
          Leva uns 10 minutos, ou 20 se você inscreve um time. Se for em time, tenha em mãos o e-mail, a idade e um link de
          cada membro. {EVENT.cost}, {EVENT.dateLabel.toLowerCase()}, {EVENT.hoursLabel}.
        </p>
        <div className="mt-14">
          <ApplicationForm />
        </div>
      </div>
    </main>
  );
}
