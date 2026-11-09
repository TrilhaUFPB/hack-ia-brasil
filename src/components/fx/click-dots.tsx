"use client";

import { useEffect, useRef } from "react";

// cheap stable per-cell random in [0, 1)
const hash = (i: number, j: number, k: number) => {
  const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Fire a ripple of little dots at a viewport point. */
export const dotRipple = (x: number, y: number) =>
  dispatchEvent(new CustomEvent("dot-ripple", { detail: { x, y } }));

/**
 * Invisible dust over the page, drawn like the particles that form the shapes
 * (soft white points, additive, scattered rather than on a grid). A ripple
 * (see `dotRipple`) makes it appear in a ring that spreads from the click and
 * fades. Draws nothing when idle.
 */
export function ClickDots({ gap = 13 }: { gap?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ripples: { x: number; y: number; t: number }[] = [];
    let w = 0,
      h = 0,
      raf = 0;
    const LIFE = 1.6;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeSprite(dpr);
    };

    // one point, drawn like the shape particles: a tiny Trilha mountain (round soft dot
    // with ?pontos, or until the logo has loaded)
    let sprite: HTMLCanvasElement | null = null;
    const SP = 5; // CSS px across
    let logo: HTMLImageElement | null = null;
    const makeSprite = (dpr: number) => {
      const c = document.createElement("canvas");
      c.width = c.height = Math.ceil(SP * dpr);
      const g = c.getContext("2d")!;
      if (logo) {
        const ar = logo.naturalWidth / logo.naturalHeight || 1.43;
        const w = c.width,
          h = w / ar;
        g.drawImage(logo, 0, (c.height - h) / 2, w, h);
      } else {
        const r = c.width / 2;
        const grad = g.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, "rgba(253,244,229,1)");
        grad.addColorStop(0.2, "rgba(253,244,229,0.95)");
        grad.addColorStop(0.55, "rgba(253,244,229,0.35)");
        grad.addColorStop(1, "rgba(253,244,229,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, c.width, c.height);
      }
      sprite = c;
    };
    if (!new URLSearchParams(location.search).has("pontos")) {
      const img = new Image();
      img.onload = () => {
        logo = img;
        makeSprite(Math.min(devicePixelRatio || 1, 2));
      };
      img.src = "/montanha.svg";
    }

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const t = now / 1000;
      for (let i = ripples.length - 1; i >= 0; i--)
        if ((now - ripples[i].t) / 1000 > LIFE) ripples.splice(i, 1);
      if (!ripples.length) {
        raf = 0;
        return;
      }
      for (const rp of ripples) {
        const age = (now - rp.t) / 1000;
        const front = age * 260;
        const fade = 1 - age / LIFE;
        // only visit the grid cells near the ring
        const R = front + 40;
        const x0 = Math.max(
          gap / 2,
          Math.floor((rp.x - R) / gap) * gap + gap / 2,
        );
        const y0 = Math.max(
          gap / 2,
          Math.floor((rp.y - R) / gap) * gap + gap / 2,
        );
        for (let gy = y0; gy < Math.min(h, rp.y + R); gy += gap)
          for (let gx = x0; gx < Math.min(w, rp.x + R); gx += gap) {
            const ci = Math.round(gx / gap),
              cj = Math.round(gy / gap);
            const r1 = hash(ci, cj, 1),
              r2 = hash(ci, cj, 2),
              r3 = hash(ci, cj, 3);
            if (r3 < 0.35) continue; // leave gaps, like dust
            const x = gx + (r1 - 0.5) * gap,
              y = gy + (r2 - 0.5) * gap;
            const dx = x - rp.x,
              dy = y - rp.y;
            const d = Math.hypot(dx, dy) || 1;
            const ring = d - front;
            const k = Math.exp(-(ring * ring) / 900) * fade;
            if (k < 0.03) continue;
            const tw = 0.8 + 0.2 * Math.sin(t * (1 + r1 * 1.5) + r2 * 40); // twinkle
            ctx.globalAlpha = Math.min(1, k * (0.55 + 0.45 * r3) * tw);
            const sz = SP * (0.6 + 0.5 * r1);
            ctx.drawImage(
              sprite!,
              x + (dx / d) * k * 6 - sz / 2,
              y + (dy / d) * k * 6 - sz / 2,
              sz,
              sz,
            );
          }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };

    const onRipple = (e: Event) => {
      if (reduce) return;
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      ripples.push({ x, y, t: performance.now() });
      if (ripples.length > 6) ripples.shift();
      if (!raf) raf = requestAnimationFrame(draw);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    addEventListener("dot-ripple", onRipple);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener("dot-ripple", onRipple);
    };
  }, [gap]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 block h-full w-full"
    />
  );
}
