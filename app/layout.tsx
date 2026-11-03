import type { Metadata } from "next";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";
import "./globals.css";

const syne = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-syne" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "LF Hack — Hackathon em João Pessoa",
  description:
    "Um dia inteiro de construção para brasileiros de 12 a 25 anos. O time vencedor vai direto para a entrevista da Lazarte Franceschi Fellowship.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${syne.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
