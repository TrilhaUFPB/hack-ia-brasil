"use client";

import { motion } from "motion/react";

/**
 * Odometer-style number: each digit is a 0–9 strip that springs to position.
 * Non-digit characters render as-is.
 */
export function RollingDigits({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex tabular-nums ${className}`}
      aria-label={value}
      role="text"
    >
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <Digit key={i} d={Number(ch)} />
        ) : (
          <span key={i} aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

function Digit({ d }: { d: number }) {
  return (
    <span aria-hidden className="relative inline-block h-[1em] overflow-hidden leading-none">
      {/* invisible glyph sizes the slot to the font's own digit width */}
      <span className="invisible">0</span>
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col items-center"
        initial={false}
        animate={{ y: `${-d}em` }}
        transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.8 }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} className="block h-[1em] leading-none">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}
