import { NextResponse, type NextRequest } from "next/server";

// One shared password for the jury panel, asked by the browser's own Basic Auth prompt.
// Any user name works; only JURY_PASSWORD is checked. Unset → the panel stays closed.
export function proxy(request: NextRequest) {
  const password = process.env.JURY_PASSWORD;
  const [scheme, encoded] = request.headers.get("authorization")?.split(" ") ?? [];
  if (password && scheme === "Basic" && encoded) {
    const decoded = atob(encoded);
    if (decoded.slice(decoded.indexOf(":") + 1) === password) return NextResponse.next();
  }
  return new NextResponse("Senha necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Jurados Hack IA Brasil", charset="UTF-8"' },
  });
}

export const config = { matcher: "/jurados/projetos/:path*" };
