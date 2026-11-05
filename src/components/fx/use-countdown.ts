"use client";

import { useEffect, useState } from "react";

export type Countdown = { d: number; h: number; m: number; s: number; done: boolean };

function diff(target: number): Countdown {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    done: ms === 0,
  };
}

/** Returns null on the server / first paint so SSR and client markup match. */
export function useCountdown(iso: string): Countdown | null {
  const [value, setValue] = useState<Countdown | null>(null);
  useEffect(() => {
    const target = new Date(iso).getTime();
    const tick = () => setValue(diff(target));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [iso]);
  return value;
}

export const pad = (n: number | undefined) => String(n ?? 0).padStart(2, "0");
