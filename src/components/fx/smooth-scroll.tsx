"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

// Free scroll, just slowed down and smoothed: the wheel moves the page less per
// notch and the page glides to a stop. Touch keeps native scrolling.
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      anchors: { offset: 0, duration: 1.6 },
      lerp: 0.07,
      wheelMultiplier: 0.55,
    });
    return () => lenis.destroy();
  }, []);
  return null;
}
