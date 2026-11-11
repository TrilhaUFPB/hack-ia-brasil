"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

/**
 * The page moves one stop per gesture: a wheel swipe or a key press glides to the
 * next section and nothing more, so nobody skims past a part of the page.
 *
 * Stops: the top of each section. A section taller than the screen gets extra stops
 * a screen apart. A section with `data-steps="n"` gets n stops spread over its height
 * (pinned sections turn those into views of their shape). A strip shorter than half a
 * screen rides along with the section under it.
 *
 * Touch keeps native scrolling.
 */

let lenis: Lenis | null = null;
let busy = false;
let queued: 0 | 1 | -1 = 0;
let glideAt = 0;
let glideEnd = 0;

// moves the moment you swipe and lands softly (an ease-in start felt laggy)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

function stops() {
  const vh = innerHeight;
  if (vh < 50) return []; // a window with no height (hidden or collapsed) has no stops
  const max = document.documentElement.scrollHeight - vh;
  const out: number[] = [];
  let carried: number | null = null;
  for (const s of document.querySelectorAll<HTMLElement>("main > section")) {
    const top = s.getBoundingClientRect().top + scrollY;
    const h = s.offsetHeight;
    if (h < vh * 0.5) {
      carried ??= top;
      continue;
    }
    const first = carried ?? top;
    carried = null;
    const n = Number(s.dataset.steps);
    if (n > 1) {
      for (let k = 0; k < n; k++) out.push(top + ((h - vh) * k) / (n - 1));
      continue;
    }
    out.push(first);
    for (let y = top + vh * 0.85; y < top + h - vh; y += vh * 0.85) out.push(y);
    if (h > vh) out.push(top + h - vh);
  }
  const sorted = out.map((y) => Math.round(Math.min(max, Math.max(0, y)))).sort((a, b) => a - b);
  // no tiny nudges: a stop too close to the one before is dropped (the very bottom
  // always stays reachable, taking the earlier one's place)
  const kept: number[] = [];
  for (const y of sorted) {
    const prev = kept.at(-1);
    if (prev === undefined || y - prev >= vh * 0.2) kept.push(y);
    else if (y === max) kept[kept.length - 1] = y;
  }
  return kept;
}

// inside a pinned section a step only changes the shape in place: a quick, short glide
const SLOW_STEP = 0.32;

function inSteppedSection(a: number, b: number) {
  for (const s of document.querySelectorAll<HTMLElement>("main > section[data-steps]")) {
    const top = s.getBoundingClientRect().top + scrollY;
    const end = top + s.offsetHeight - innerHeight;
    if (Math.min(a, b) >= top - 8 && Math.max(a, b) <= end + 8) return true;
  }
  return false;
}

export function scrollToY(y: number) {
  if (!lenis) return scrollTo(0, y);
  const dist = Math.abs(y - scrollY);
  const duration = inSteppedSection(scrollY, y)
    ? SLOW_STEP
    : Math.min(0.5, Math.max(0.32, dist / 2400));
  busy = true;
  glideAt = performance.now();
  const done = () => {
    if (!busy) return;
    busy = false;
    glideEnd = performance.now();
    // a swipe made during the glide is not lost: it goes on to the next stop
    const dir = queued;
    queued = 0;
    if (dir) step(dir);
  };
  lenis.scrollTo(y, {
    duration,
    easing: easeOut,
    force: true,
    onComplete: done,
  });
  setTimeout(done, duration * 1000 + 150); // never stay stuck if the glide is cut short
}

function step(dir: 1 | -1) {
  if (busy) {
    // the swipe that started this glide is still ramping up for a moment: not a new one
    if (performance.now() - glideAt > 160) queued = dir;
    return;
  }
  const y = scrollY;
  const all = stops();
  const next = dir > 0 ? all.find((s) => s > y + 8) : all.findLast((s) => s < y - 8);
  if (next !== undefined) scrollToY(next);
}

export function SmoothScroll() {
  useEffect(() => {
    // a swipe on a trackpad keeps sending wheel events for a second or so: only a new
    // gesture (a pause, or a sudden harder push) counts as another step
    let lastAt = 0,
      lastAbs = 0;
    lenis = new Lenis({
      autoRaf: true,
      anchors: { offset: 0, duration: 1.6 },
      virtualScroll: ({ deltaX, deltaY, event }) => {
        if (event.type !== "wheel" || event.ctrlKey) return true;
        if (Math.abs(deltaX) > Math.abs(deltaY)) return false;
        event.preventDefault();
        const now = performance.now(),
          abs = Math.abs(deltaY);
        const fresh = now - lastAt > 100 || abs > lastAbs * 1.5 + 4;
        // a hard swipe still pushing after its glide ends carries on to the next stop,
        // so a strong flick can travel more than one screen; a soft tail does not
        const pushing = !busy && abs >= 40 && now - glideEnd > 60;
        lastAt = now;
        lastAbs = abs;
        if ((fresh && abs >= 4) || pushing) step(deltaY > 0 ? 1 : -1);
        return false;
      },
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable]")) return;
      if (e.key === " " && t.closest("a,button,summary")) return;
      const down = e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey);
      const up = e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey);
      if (!down && !up) return;
      e.preventDefault();
      step(down ? 1 : -1);
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      lenis?.destroy();
      lenis = null;
    };
  }, []);
  return null;
}
