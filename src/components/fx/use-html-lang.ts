"use client";

import { useEffect } from "react";
import type { Lang } from "@/content";

// ponytail: the root layout always renders lang="pt-BR"; English pages flip it after hydration.
// Upgrade path if SEO in English matters: an app/[lang] root layout that renders the right lang on the server.
export function useHtmlLang(lang: Lang) {
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
  }, [lang]);
}
