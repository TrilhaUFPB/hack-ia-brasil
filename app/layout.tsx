import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";
import "./globals.css";

const syne = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-syne" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lf-hack.vercel.app";
const TITLE = "LF Hack | Hackathon em João Pessoa e caminho para o Vale do Silício";
const DESCRIPTION =
  "Hackathon gratuito de um dia em João Pessoa (PB), em 21 de novembro, para brasileiros de 12 a 25 anos. O time vencedor vai direto para a entrevista da Lazarte Franceschi Fellowship: R$ 100 mil em prêmios, uma semana em São Francisco e mentoria de Pedro Franceschi e Victor Lazarte.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | LF Hack" },
  description: DESCRIPTION,
  applicationName: "LF Hack",
  keywords: [
    "hackathon", "João Pessoa", "Paraíba", "Lazarte Franceschi Fellowship", "Pedro Franceschi",
    "Victor Lazarte", "Vale do Silício", "Trilha", "programação", "jovens", "fellowship", "LF Hack",
  ],
  authors: [{ name: "Lazarte Franceschi Fellowship" }, { name: "Trilha" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "LF Hack",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

export const viewport: Viewport = { themeColor: "#0a0a0a", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${syne.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
