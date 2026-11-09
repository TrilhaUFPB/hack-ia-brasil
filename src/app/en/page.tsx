import type { Metadata } from "next";
import { Home } from "@/components/home";

const description =
  "A hackathon in João Pessoa could be your bridge to Silicon Valley. The winning team skips a step in the IA Brasil Fellowship. Apply now.";

export const metadata: Metadata = {
  title: "Hack IA Brasil",
  description,
  alternates: { languages: { "pt-BR": "/", en: "/en" } },
  openGraph: { title: "Hack IA Brasil", description, locale: "en_US" },
  twitter: { title: "Hack IA Brasil", description },
};

export default function Page() {
  return <Home lang="en" />;
}
