import Link from "next/link";
import { localePath, type Lang } from "@/content";
import { ApplicationForm } from "@/components/application-form";

const T = {
  pt: {
    back: "← Hack IA Brasil",
    date: "21.11 · João Pessoa",
    switchLabel: "EN",
    label: "inscrições",
    h1: "Mostre o que você já construiu.",
    intro:
      "Leva uns 10 minutos, ou 20 se você inscreve um time. Se for em time, tenha em mãos o e-mail, a idade e um link de cada membro. Gratuito, sábado, 21 de novembro, das 8h às 18h.",
  },
  en: {
    back: "← Hack IA Brasil",
    date: "11.21 · João Pessoa",
    switchLabel: "PT",
    label: "applications",
    h1: "Show us what you've built.",
    intro:
      "Takes about 10 minutes, or 20 if you're registering a team. For a team, have each member's e-mail, age and a link at hand. Free, Saturday, November 21, 8am to 6pm.",
  },
};

export function SignupPage({ lang }: { lang: Lang }) {
  const t = T[lang];
  return (
    <main className="min-h-dvh bg-black font-light text-white selection:bg-white selection:text-[#000928]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-7 md:px-8">
        <Link
          href={localePath(lang, "/")}
          className="font-mono text-xs uppercase tracking-[0.28em] text-white/90 transition-colors hover:text-white"
        >
          {t.back}
        </Link>
        <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.28em]">
          <span className="hidden text-white/60 sm:inline">{t.date}</span>
          <Link
            href={localePath(lang === "en" ? "pt" : "en", "/inscricao")}
            hrefLang={lang === "en" ? "pt-BR" : "en"}
            className="text-white/60 transition-colors hover:text-white"
          >
            {t.switchLabel}
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-10 md:px-8 md:pt-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/75">{t.label}</p>
        <h1 className="mt-6 text-3xl font-extralight leading-tight md:text-5xl">{t.h1}</h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/80">{t.intro}</p>
        <div className="mt-14">
          <ApplicationForm lang={lang} />
        </div>
      </div>
    </main>
  );
}
