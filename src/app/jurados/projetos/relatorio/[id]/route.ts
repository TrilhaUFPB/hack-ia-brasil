import { openReport } from "@/jury/reports";

// One team's technical report. src/proxy.ts asks for the jury password before this runs.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const report = await openReport((await params).id);
  if (!report) return new Response("Relatório não encontrado", { status: 404 });
  return new Response(report.body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": String(report.size),
      // The page quotes text from the teams' repositories. Opened in its own tab, outside the panel's
      // sandboxed frame, it still gets an opaque origin and can't act as the site.
      "Content-Security-Policy": "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
      // each deploy may bring a newer report under the same address
      "Cache-Control": "private, no-cache",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
