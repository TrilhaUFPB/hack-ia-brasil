"use client";
import { useEffect, useRef, type ElementType, type ReactNode, type CSSProperties } from "react";

export default function Reveal({
  as: Tag = "div", className = "", delay, children,
}: { as?: ElementType; className?: string; delay?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={className} style={delay ? ({ "--d": delay } as CSSProperties) : undefined}>
      {children}
    </Tag>
  );
}
