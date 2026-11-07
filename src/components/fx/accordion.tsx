"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

/** Single-open accordion; style via the class props. */
export function Accordion({
  items,
  itemClass = "",
  qClass = "",
  aClass = "",
  icon = "+",
}: {
  items: { q: string; a: string }[];
  itemClass?: string;
  qClass?: string;
  aClass?: string;
  icon?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className={itemClass}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className={`flex w-full items-center justify-between gap-6 text-left ${qClass}`}
            >
              <span>{it.q}</span>
              <motion.span
                aria-hidden
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="shrink-0 font-mono text-xl leading-none"
              >
                {icon}
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className={aClass}>{it.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
