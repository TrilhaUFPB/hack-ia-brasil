"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CHARS = "!<>-_\\/[]{}—=+*^?#01";

/** Text that decodes from noise on mount/in-view and re-scrambles on hover. */
export function Scramble({
  text,
  className = "",
  duration = 700,
  trigger = "both",
}: {
  text: string;
  className?: string;
  duration?: number;
  trigger?: "mount" | "hover" | "both";
}) {
  const [out, setOut] = useState(text);
  const raf = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);

  const run = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const reveal = Math.floor(p * text.length);
      setOut(
        text
          .split("")
          .map((c, i) =>
            i < reveal || c === " " ? c : CHARS[Math.floor(Math.random() * CHARS.length)],
          )
          .join(""),
      );
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [text, duration]);

  useEffect(() => {
    if (trigger === "hover") return;
    const el = ref.current!;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        run();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [run, trigger]);

  return (
    <span
      ref={ref}
      className={className}
      aria-label={text}
      onPointerEnter={trigger !== "mount" ? run : undefined}
    >
      <span aria-hidden>{out}</span>
    </span>
  );
}
