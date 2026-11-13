import type { Metadata } from "next";
import { SignupPage } from "@/components/signup-page";

export const metadata: Metadata = {
  title: "Apply · Hack IA Brasil",
  description: "Apply with your team, or on your own to join one, for Hack IA Brasil on November 21 in João Pessoa.",
  alternates: { languages: { "pt-BR": "/inscricao", en: "/en/inscricao" } },
};

export default function Page() {
  return <SignupPage lang="en" />;
}
