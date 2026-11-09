import type { Metadata } from "next";
import { Poppins, Space_Grotesk } from "next/font/google";
import "./globals.css";

// the Trilha pair: Poppins for text, Space Grotesk for labels and numbers
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });

const description =
  "Um hackathon de 10 horas em João Pessoa. O time vencedor vai direto para a entrevista da IA Brasil Fellowship. Gratuito, para brasileiros de 12 a 25 anos.";

// absolute base for the share images: the production domain in production, the
// stable branch URL on previews, localhost in dev
const host =
  process.env.VERCEL_ENV === "production"
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : (process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL);

export const metadata: Metadata = {
  metadataBase: new URL(host ? `https://${host}` : "http://localhost:3123"),
  title: "IA Hack — João Pessoa, 21 de novembro",
  description,
  openGraph: {
    title: "IA Hack — seu caminho para o Vale do Silício começa em João Pessoa",
    description,
    siteName: "IA Hack",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IA Hack — João Pessoa, 21 de novembro",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={[poppins, grotesk]
        .map((f) => f.variable)
        .join(" ")}
    >
      <body className="min-h-dvh antialiased">
        {children}
      </body>
    </html>
  );
}
