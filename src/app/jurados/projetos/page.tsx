import { cacheLife } from "next/cache";
import { EVENT } from "@/content";
import { GuideHero } from "@/components/guide/hero";
import { roleGuideMetadata } from "@/components/guide/role-guide";
import { GuideShell } from "@/components/guide/shell";
import { ProjectGrid } from "@/components/jury/project-grid";
import { attachReports, readReports } from "@/jury/reports";
import { toProjects, withOutsideTheForm } from "@/jury/submissions";

export const metadata = {
  ...roleGuideMetadata("Projetos · Jurados · Hack IA Brasil", "Painel das submissões para a banca."),
  robots: { index: false, follow: false },
};

// the form's responses sheet, published as CSV (Arquivo › Compartilhar › Publicar na web),
// plus the teams the form failed to record, with each team's technical report from relatorios/
// when the harness has published one
async function getProjects() {
  "use cache";
  cacheLife("minutes");
  const url = process.env.SUBMISSIONS_CSV_URL;
  if (!url) return [];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Planilha de submissões respondeu ${res.status}`);
  return attachReports(withOutsideTheForm(toProjects(await res.text())), await readReports());
}

export default async function JuryProjectsPage() {
  const projects = await getProjects();
  return (
    <GuideShell staff>
      <main className="mx-auto max-w-6xl px-5 pb-16 md:px-10 md:pb-24 lg:px-16">
        <div className="pb-10 md:pb-14">
          <GuideHero
            kicker="Painel dos jurados"
            meta={EVENT.dateLabel + " · João Pessoa"}
            title="Projetos submetidos"
            lead={
              <p className="max-w-[44ch] text-pretty text-[17px] leading-relaxed text-white/75 md:text-lg">
                {projects.length
                  ? `${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}. Abra cada um para ver a descrição, o repositório, a demo e o pitch.`
                  : "As submissões aparecem aqui assim que os times enviarem o formulário."}
              </p>
            }
          />
        </div>
        <ProjectGrid projects={projects} />
      </main>
    </GuideShell>
  );
}
