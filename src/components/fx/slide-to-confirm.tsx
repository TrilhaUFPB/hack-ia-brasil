"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

const KNOB = 40;

/**
 * Drag the knob to the end to confirm. Keyboard: focus the knob and press
 * Enter/Space or ArrowRight to confirm.
 */
export function SlideToConfirm({
  label,
  doneLabel,
  onConfirm,
  className = "",
  knobClass = "",
  fillClass = "",
}: {
  label: string;
  doneLabel: string;
  /** return false to reject (knob springs back) */
  onConfirm: () => boolean | void;
  className?: string;
  knobClass?: string;
  fillClass?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [maxX, setMaxX] = useState(0);
  const [done, setDone] = useState(false);
  const x = useMotionValue(0);
  const fill = useTransform(x, (v) => v + KNOB);
  const labelOpacity = useTransform(x, [0, Math.max(1, maxX * 0.6)], [1, 0]);

  useLayoutEffect(() => {
    const measure = () => track.current && setMaxX(track.current.offsetWidth - KNOB - 8);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const confirm = () => {
    if (done) return;
    if (onConfirm() === false) {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 32 });
      return;
    }
    animate(x, maxX, { type: "spring", stiffness: 400, damping: 30 });
    setDone(true);
  };

  return (
    <div
      ref={track}
      className={`relative h-12 select-none overflow-hidden rounded-full p-1 ${className}`}
    >
      <motion.div
        aria-hidden
        className={`absolute inset-y-1 left-1 rounded-full ${fillClass}`}
        style={{ width: fill }}
      />
      <motion.span
        className="pointer-events-none absolute inset-0 grid place-items-center text-[12px] tracking-[0.15em]"
        style={{ opacity: done ? 1 : labelOpacity }}
      >
        <span className={done ? "" : "shimmer-text"}>{done ? doneLabel : label}</span>
      </motion.span>
      <motion.button
        type="button"
        aria-label={label}
        className={`relative z-10 grid h-10 w-10 cursor-grab place-items-center rounded-full active:cursor-grabbing ${knobClass}`}
        drag={done ? false : "x"}
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0.04}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={() => {
          if (x.get() > maxX * 0.85) confirm();
          else animate(x, 0, { type: "spring", stiffness: 500, damping: 32 });
        }}
        onKeyDown={(e) => {
          if (["Enter", " ", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            confirm();
          }
        }}
      >
        {done ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
