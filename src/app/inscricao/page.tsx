import type { Metadata } from "next";
import { SignupPage } from "@/components/signup-page";

export const metadata: Metadata = {
  title: "Inscrição · Hack IA Brasil",
  description: "Inscreva-se com o seu time, ou sozinho(a) para entrar num time, no Hack IA Brasil, 28 de novembro em João Pessoa. Inscrições até 21/11.",
  alternates: { languages: { "pt-BR": "/inscricao", en: "/en/inscricao" } },
};

export default function Page() {
  return <SignupPage lang="pt" />;
}
