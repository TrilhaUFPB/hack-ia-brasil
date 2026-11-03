import { ImageResponse } from "next/og";

export const alt = "LF Hack: um hackathon em João Pessoa pode ser o seu caminho para o Vale do Silício";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0a0a0a", color: "#f4f4f0", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 28, background: "#c9f542", borderRadius: "56px 56px 0 0" }} />
          <div style={{ fontSize: 40, fontWeight: 800 }}>LF Hack</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>
          <div>Um hackathon em João Pessoa</div>
          <div>pode ser o seu caminho para o</div>
          <div style={{ color: "#c9f542" }}>Vale do Silício.</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#8a8a86" }}>21 de novembro · João Pessoa, PB · 12 a 25 anos · Gratuito</div>
      </div>
    ),
    size,
  );
}
