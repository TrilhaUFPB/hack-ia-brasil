import type { Metadata } from "next";
import { Geist_Mono, Oxanium } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const oxanium = Oxanium({ variable: "--font-oxanium", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IA Hack — João Pessoa, 21 de novembro",
  description:
    "Um hackathon de 10 horas em João Pessoa. O time vencedor vai direto para a entrevista da IA Brasil Fellowship. Gratuito, para brasileiros de 12 a 25 anos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={[geistMono, oxanium]
        .map((f) => f.variable)
        .join(" ")}
    >
      <body className="min-h-dvh antialiased">
        {children}
      </body>
    </html>
  );
}
