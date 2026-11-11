"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { dotRipple } from "./click-dots";

/**
 * One cloud of particles, fixed behind the page, that re-forms into a new
 * shape for each section (`data-scene="n"` on the section). White dots with
 * a Verde Menta accent; clicking sends a pulse through the cloud.
 *
 *  0 globe with the João Pessoa → San Francisco arc
 *  1 "100K"
 *  2 a clock face, its hands set by the schedule
 *  3 a crowd (12–25, anyone who builds)
 *  4 two mentors facing each other
 *  5 "?"
 *  6 a megaphone with sound rays (inscrições em breve)
 */

// x y z r g b alpha size, then an optional hand flag (1 hour, 2 minute) for the dial
type P8 = [number, number, number, number, number, number, number, number];
type P = P8 | [...P8, number];
const S = 9; // floats per particle in a baked scene

// the schedule drives the clock: hours as a decimal (9.5 = 09:30)
let dialTarget = 8;
export function setDialTime(hours: number) {
  dialTarget = hours;
}

// the crowd's camera, one view per stop of its section: face on, from the side,
// from above, then close on one person.
let crowdTarget = 0;
export function setCrowdView(p: number) {
  crowdTarget = p;
}
const CROWD_VIEWS = [
  { tilt: 0, yaw: 0, zoom: 0 },
  { tilt: 0.12, yaw: 1.15, zoom: 0 },
  { tilt: 1.2, yaw: 0, zoom: 0 },
  { tilt: 0, yaw: 0, zoom: 1 },
];
const CROWD = 3;

// the prize section, one shape per prize as you scroll: "100K", then its "1" stays put
// for "1 semana", then becomes a mentor beside a younger builder, then the US flag
let prizeTarget = 0;
export function setPrizeView(p: number) {
  prizeTarget = p;
}
const PRIZE_SCENES = [1, 7, 8, 9]; // 7-9 come after the signup's empty dawn (6)
const prizeScene = () => PRIZE_SCENES[Math.round(prizeTarget * (PRIZE_SCENES.length - 1))];
const sceneSection = (n: number) => (PRIZE_SCENES.includes(n) ? 1 : n);

// the founders: -1 Pedro up, 1 Victor up
let peopleTarget = -1;
export function setPeopleFocus(v: number) {
  peopleTarget = v;
}
const WHITE: [number, number, number] = [1, 1, 1];
const MENTA: [number, number, number] = [1, 1, 1]; // white accent
const BLUE: [number, number, number] = [0.12, 0.38, 1]; // the route; dim enough to stay blue when dots pile up

export function ParticleScene() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = () => innerWidth <= 900;
    const N = narrow() ? 9000 : 18000;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return; // no WebGL: page still works, just without the scene
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const group = new THREE.Group();
    scene.add(group);

    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    /* ---------- shape builders ---------- */
    const sphere = (
      out: P[],
      cx: number,
      cy: number,
      cz: number,
      r: number,
      n: number,
      col = WHITE,
      a = 1,
      size = 1,
      filled = false,
    ) => {
      for (let i = 0; i < n; i++) {
        const u = rnd() * 2 - 1,
          th = rnd() * Math.PI * 2,
          s = Math.sqrt(1 - u * u),
          k = filled ? Math.cbrt(rnd()) : 1;
        out.push([
          cx + s * Math.cos(th) * r * k,
          cy + u * r * k,
          cz + s * Math.sin(th) * r * k,
          ...col,
          a * (0.7 + rnd() * 0.3),
          size,
        ]);
      }
    };
    const figure = (
      out: P[],
      x: number,
      z: number,
      scale: number,
      facing: number,
      a = 0.9,
    ) => {
      sphere(
        out,
        x,
        1.05 * scale,
        z,
        0.25 * scale,
        Math.round(240 * scale),
        WHITE,
        a,
      );
      for (let i = 0; i < Math.round(480 * scale); i++) {
        const u = rnd(),
          th = rnd() * Math.PI * 2,
          s = Math.sqrt(1 - u * u);
        const lx = s * Math.cos(th) * 0.46 * scale,
          ly = u * 0.42 * scale,
          lz = s * Math.sin(th) * 0.3 * scale;
        const cs = Math.cos(facing),
          sn = Math.sin(facing);
        out.push([
          x + lx * cs - lz * sn,
          0.35 * scale + ly,
          z + lx * sn + lz * cs,
          ...WHITE,
          a * (0.65 + rnd() * 0.35),
          1,
        ]);
      }
    };

    function globe(): P[] {
      const out: P[] = [];
      seed = 11;
      const R = 2.05;
      const d2r = Math.PI / 180;
      const latMid = 15 * d2r,
        lonMid = -78 * d2r;
      const vec = (
        lat: number,
        lon: number,
        r = R,
      ): [number, number, number] => {
        const phi = lon - lonMid;
        const x = Math.cos(lat) * Math.sin(phi),
          y0 = Math.sin(lat),
          z0 = Math.cos(lat) * Math.cos(phi);
        return [
          x * r,
          (y0 * Math.cos(latMid) - z0 * Math.sin(latMid)) * r,
          (y0 * Math.sin(latMid) + z0 * Math.cos(latMid)) * r,
        ];
      };
      const push = (
        v: [number, number, number],
        a: number,
        col = WHITE,
        size = 1,
      ) => out.push([v[0], v[1], v[2], ...col, v[2] < 0 ? a * 0.3 : a, size]);
      // meridians and parallels
      for (let m = 0; m < 18; m++)
        for (let i = 0; i < 140; i++)
          push(vec((rnd() * 180 - 90) * d2r, m * 20 * d2r), 0.55);
      for (let p = -75; p <= 75; p += 15) {
        const n = Math.round(260 * Math.cos(p * d2r));
        for (let i = 0; i < n; i++)
          push(vec(p * d2r, rnd() * Math.PI * 2), 0.5);
      }
      // sparse shell
      for (let i = 0; i < 1600; i++)
        push(
          vec(Math.asin(rnd() * 2 - 1), rnd() * Math.PI * 2),
          0.18,
          WHITE,
          0.85,
        );
      // the route: João Pessoa → San Francisco, lifted off the surface
      const A = vec(-7.12 * d2r, -34.86 * d2r, 1),
        B = vec(37.77 * d2r, -122.42 * d2r, 1);
      const dot = A[0] * B[0] + A[1] * B[1] + A[2] * B[2],
        om = Math.acos(dot),
        so = Math.sin(om);
      // flag 4 + t: the shader draws the line out from João Pessoa as uRoute goes 0 → 1
      for (let i = 0; i < 900; i++) {
        const t = rnd();
        const ka = Math.sin((1 - t) * om) / so,
          kb = Math.sin(t * om) / so;
        const r = R * (1 + Math.sin(Math.PI * t) * 0.32);
        const j = 0.012;
        out.push([
          (A[0] * ka + B[0] * kb) * r + (rnd() - 0.5) * j,
          (A[1] * ka + B[1] * kb) * r + (rnd() - 0.5) * j,
          (A[2] * ka + B[2] * kb) * r,
          ...BLUE,
          0.95,
          1.05,
          4 + t,
        ]);
      }
      sphere(out, A[0] * R, A[1] * R, A[2] * R, 0.09, 260, MENTA, 1, 1.2, true);
      // San Francisco lights up when the line gets there
      const sf = out.length;
      sphere(out, B[0] * R, B[1] * R, B[2] * R, 0.07, 200, WHITE, 1, 1.2, true);
      for (let i = sf; i < out.length; i++) out[i] = [...out[i].slice(0, 8), 5] as P;
      return out;
    }

    function sampleCanvas(
      draw: (g: CanvasRenderingContext2D, W: number, H: number) => void,
      Wu: number,
      Hu: number,
      step: number,
      col = WHITE,
    ): P[] {
      const PX = 120,
        W = Math.round(Wu * PX),
        H = Math.round(Hu * PX);
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      draw(g, W, H);
      const d = g.getImageData(0, 0, W, H).data;
      const out: P[] = [];
      const s = step * PX;
      for (let y = 0; y < H; y += s)
        for (let x = 0; x < W; x += s) {
          const jx = x + rnd() * s,
            jy = y + rnd() * s;
          if (
            d[(Math.min(H - 1, jy | 0) * W + Math.min(W - 1, jx | 0)) * 4 + 3] <
            128
          )
            continue;
          out.push([
            (jx - W / 2) / PX,
            -(jy - H / 2) / PX,
            (rnd() - 0.5) * 0.12,
            ...col,
            1,
            1.05,
          ]);
        }
      return out;
    }

    const font = getComputedStyle(document.body).fontFamily;
    const text = (str: string, Wu: number, Hu: number, weight = 300) =>
      sampleCanvas(
        (g, W, H) => {
          g.fillStyle = "#fff";
          g.textAlign = "center";
          g.textBaseline = "middle";
          let size = H * 0.9;
          g.font = `${weight} ${size}px ${font}`;
          while (g.measureText(str).width > W * 0.96)
            g.font = `${weight} ${(size *= 0.95)}px ${font}`;
          g.fillText(str, W / 2, H / 2);
        },
        Wu,
        Hu,
        narrow() ? 0.04 : 0.024,
      );

    function dial(): P[] {
      const out: P[] = [];
      seed = 23;
      const R = 2;
      const ring = (r: number, n: number, a: number, j = 0.03) => {
        for (let i = 0; i < n; i++) {
          const t = rnd() * Math.PI * 2,
            rr = r + (rnd() - 0.5) * j;
          out.push([
            Math.cos(t) * rr,
            Math.sin(t) * rr,
            (rnd() - 0.5) * j,
            ...WHITE,
            a * (0.7 + rnd() * 0.3),
            1,
          ]);
        }
      };
      ring(R, 1800, 0.9);
      ring(R - 0.08, 500, 0.35);
      for (let i = 0; i < 900; i++) {
        const t = rnd() * Math.PI * 2,
          r = Math.sqrt(rnd()) * (R - 0.15);
        out.push([
          Math.cos(t) * r,
          Math.sin(t) * r,
          0,
          ...WHITE,
          0.1 + rnd() * 0.1,
          0.9,
        ]);
      }
      // a real clock face: twelve hour ticks and small minute ticks
      for (let m = 0; m < 60; m++) {
        const t = Math.PI / 2 - (m / 60) * Math.PI * 2,
          hour = m % 5 === 0,
          n = hour ? 60 : 8,
          len = hour ? 0.22 : 0.07;
        for (let i = 0; i < n; i++) {
          const r = R - 0.13 - rnd() * len;
          out.push([Math.cos(t) * r, Math.sin(t) * r, 0, ...WHITE, hour ? 0.95 : 0.6, 1.05]);
        }
      }
      // two hands, built pointing at 12; the shader turns them to the schedule's time
      const hand = (len: number, n: number, w: number, a: number, flag: number) => {
        for (let i = 0; i < n; i++)
          out.push([(rnd() - 0.5) * w, rnd() * len, 0.02, ...MENTA, a, 1.05, flag]);
      };
      hand(R * 0.5, 380, 0.05, 1, 1);
      hand(R * 0.75, 320, 0.022, 0.9, 2);
      sphere(out, 0, 0, 0.02, 0.07, 160, MENTA, 1, 1.1, true);
      return out;
    }

    // the US flag for the visa, in white like everything else: solid stripes for the
    // red ones, a faint field behind bright stars for the canton, waving a little
    function usFlag(): P[] {
      const out: P[] = [];
      const Wf = 3.8,
        Hf = (Wf * 10) / 19,
        stripe = Hf / 13,
        cw = Wf * 0.4,
        ch = stripe * 7;
      const wave = (x: number, y: number): [number, number, number] => [
        x,
        y + Math.sin(x * 1.3) * 0.06,
        Math.sin(x * 1.6 + 0.6) * 0.14,
      ];
      const dot = (x: number, y: number, col: [number, number, number], a: number, size = 1) =>
        out.push([...wave(x - Wf / 2, Hf / 2 - y), ...col, a, size]);
      const step = narrow() ? 0.045 : 0.028;
      for (let y = 0; y < Hf; y += step)
        for (let x = 0; x < Wf; x += step) {
          const jx = x + rnd() * step,
            jy = y + rnd() * step;
          if (jx < cw && jy < ch) {
            if (rnd() < 0.55) dot(jx, jy, WHITE, 0.28);
            continue;
          }
          const red = Math.floor(jy / stripe) % 2 === 0;
          if (red) dot(jx, jy, WHITE, 0.9);
          else if (rnd() < 0.12) dot(jx, jy, WHITE, 0.25);
        }
      // 50 stars: 9 rows alternating 6 and 5
      for (let r = 0; r < 9; r++) {
        const n = r % 2 ? 5 : 6;
        for (let c = 0; c < n; c++) {
          const sx = (cw / 12) * (2 * c + 1 + (r % 2)),
            sy = (ch / 10) * (r + 1);
          for (let i = 0; i < 14; i++) {
            const a = rnd() * Math.PI * 2,
              rr = Math.sqrt(rnd()) * 0.045;
            dot(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr, WHITE, 1, 1.2);
          }
        }
      }
      return out;
    }

    // the four prize shapes, drawn on one canvas size so their parts line up
    function prizeShapes(): { shapes: P[][]; keep: number[] } {
      seed = 71;
      const Wu = 5.6,
        Hu = 2.2,
        step = narrow() ? 0.04 : 0.024;
      const PX = 120,
        W = Wu * PX,
        H = Hu * PX;
      const g0 = document.createElement("canvas").getContext("2d")!;
      let size = H * 0.9;
      g0.font = `300 ${size}px ${font}`;
      while (g0.measureText("100K").width > W * 0.96) g0.font = `300 ${(size *= 0.95)}px ${font}`;
      const x0 = (W - g0.measureText("100K").width) / 2,
        w1 = g0.measureText("1").width;
      const draw = (str: string, x: number, px: number, weight = 300, y = H / 2) =>
        sampleCanvas(
          (g) => {
            g.fillStyle = "#fff";
            g.textAlign = "left";
            g.textBaseline = "middle";
            g.font = `${weight} ${px}px ${font}`;
            g.fillText(str, x, y);
          },
          Wu,
          Hu,
          step,
        );
      const byY = (a: P, b: P) => a[1] - b[1];
      const one = draw("1", x0, size).sort(byY);
      const hundredK = [...one, ...draw("00K", x0 + w1, size)];
      const week = [...one, ...draw("SEMANA", x0 + w1 + size * 0.12, size * 0.34, 400)];
      // mentoria: just two people, a mentor and a younger builder. The 1's dots
      // become the mentor.
      const pair: P[] = [];
      const person = (x: number, scale: number, facing: number, flag: number) => {
        const from = pair.length;
        figure(pair, x, 0, scale, facing, 0.95);
        // centred on the shape; flags 8 and 9 make each one nod on its own beat
        for (let i = from; i < pair.length; i++)
          pair[i] = [pair[i][0], pair[i][1] - 0.85, ...(pair[i].slice(2, 8) as [number, number, number, number, number, number]), flag];
      };
      person(-1.25, 1.4, Math.PI / 2 - 0.4, 8);
      const mentor = pair.slice().sort(byY);
      pair.length = 0;
      person(1.25, 1.1, Math.PI / 2 + 0.4, 9);
      const mentoria = [...mentor, ...pair];
      const leg = mentor;
      return { shapes: [hundredK, week, mentoria, usFlag()], keep: [one.length, one.length, leg.length, 0] };
    }

    function crowd(): P[] {
      const out: P[] = [];
      seed = 31;
      const rows = [
        { z: -1.4, n: 6, s: 0.55 },
        { z: -0.2, n: 5, s: 0.62 },
        { z: 1.0, n: 4, s: 0.7 },
      ];
      for (const row of rows)
        for (let i = 0; i < row.n; i++) {
          const x = (i - (row.n - 1) / 2) * 1.0 + (rnd() - 0.5) * 0.15;
          figure(out, x, row.z, row.s, 0, row.z > 0 ? 0.95 : 0.7);
        }
      // one of them in green: you
      const you = out.length;
      figure(out, 0.5, 1.0, 0.7, 0, 1);
      for (let i = you; i < out.length; i++) {
        out[i].splice(3, 3, ...MENTA);
        out[i] = [...out[i].slice(0, 8), 3] as P; // the one the camera closes in on
      }
      for (let i = 0; i < out.length; i++) out[i][1] -= 0.9;
      return out;
    }

    function mentors(): P[] {
      const out: P[] = [];
      seed = 41;
      figure(out, -1.25, 0, 1.35, Math.PI / 2 + 0.35, 0.9);
      figure(out, 1.25, 0, 1.35, Math.PI / 2 - 0.35, 0.9);
      // the conversation between them
      for (let i = 0; i < 700; i++) {
        const u = rnd() * 2 - 1,
          th = rnd() * Math.PI * 2,
          s = Math.sqrt(1 - u * u),
          r = 0.08 + Math.pow(rnd(), 1.8) * 0.6;
        out.push([
          s * Math.cos(th) * r,
          1.25 + u * r,
          s * Math.sin(th) * r,
          ...MENTA,
          0.55 * (1 - r / 0.7),
          0.95,
        ]);
      }
      for (let i = 0; i < out.length; i++) out[i][1] -= 1.0;
      return out;
    }

    // the two founders as point holograms: each portrait photo, cut out with a
    // person mask, becomes a cloud where brighter parts of the photo get more and
    // brighter points; a soft bulge gives the face depth, shoulders dissolve
    // chamfer distance from each inside pixel to the outline, 0..1. Used as depth so each
    // person is "inflated": round in the middle, flat at the silhouette, thin at the neck
    function inflate(mask: Uint8ClampedArray, n: number) {
      const INF = 1e9,
        d = new Float32Array(n * n);
      for (let i = 0; i < n * n; i++) d[i] = mask[i * 4] > 127 ? INF : 0;
      const at = (x: number, y: number) =>
        x < 0 || y < 0 || x >= n || y >= n ? 0 : d[y * n + x];
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const i = y * n + x;
          if (d[i])
            d[i] = Math.min(
              d[i],
              at(x - 1, y) + 1,
              at(x, y - 1) + 1,
              at(x - 1, y - 1) + 1.414,
              at(x + 1, y - 1) + 1.414,
            );
        }
      for (let y = n - 1; y >= 0; y--)
        for (let x = n - 1; x >= 0; x--) {
          const i = y * n + x;
          if (d[i])
            d[i] = Math.min(
              d[i],
              at(x + 1, y) + 1,
              at(x, y + 1) + 1,
              at(x + 1, y + 1) + 1.414,
              at(x - 1, y + 1) + 1.414,
            );
        }
      let max = 0;
      for (const v of d) max = Math.max(max, v);
      for (let i = 0; i < n * n; i++) d[i] /= max || 1;
      return d;
    }

    async function founders(): Promise<P[]> {
      const read = (src: string) =>
        new Promise<HTMLImageElement>((ok, no) => {
          const i = new Image();
          i.onload = () => ok(i);
          i.onerror = no;
          i.src = src;
        });
      const G = narrow() ? 110 : 150; // sampling grid per portrait
      const sample = async (name: string) => {
        const [photo, mask] = await Promise.all([
          read(`/mentors/${name}.jpg`),
          read(`/mentors/${name}-mask.png`),
        ]);
        const c = document.createElement("canvas");
        c.width = c.height = G;
        const g = c.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(photo, 0, 0, G, G);
        const pd = g.getImageData(0, 0, G, G).data;
        g.clearRect(0, 0, G, G);
        g.drawImage(mask, 0, 0, G, G);
        const md = g.getImageData(0, 0, G, G).data;
        const lum = new Float32Array(G * G);
        const inside: number[] = [];
        for (let i = 0; i < G * G; i++) {
          lum[i] =
            (0.299 * pd[i * 4] +
              0.587 * pd[i * 4 + 1] +
              0.114 * pd[i * 4 + 2]) /
            255;
          if (md[i * 4] > 127) inside.push(lum[i]);
        }
        inside.sort((a, b) => a - b);
        const lo = inside[Math.floor(inside.length * 0.04)] ?? 0,
          hi = inside[Math.floor(inside.length * 0.97)] ?? 1;
        // head metrics from the cut-out: top row, and the widest span in the top ~18%
        let top = 0;
        while (
          top < G &&
          ![...Array(G).keys()].some((x) => md[(top * G + x) * 4] > 127)
        )
          top++;
        let headW = 1;
        for (let y = top; y < Math.min(G, top + Math.round(G * 0.18)); y++) {
          let a = -1,
            b = -1;
          for (let x = 0; x < G; x++)
            if (md[(y * G + x) * 4] > 127) {
              if (a < 0) a = x;
              b = x;
            }
          if (a >= 0) headW = Math.max(headW, b - a);
        }
        return { lum, md, lo, hi, depth: inflate(md, G), top, headW };
      };
      const out: P[] = [];
      seed = 41;
      // both people at the same scale: equal head width, tops of the heads aligned,
      // shoulders cut at the same height
      const HEAD = 1.3,
        TOP = 1.05;
      const metrics = (d: { headW: number; top: number }) => {
        const size = HEAD / (d.headW / G);
        return { size, oy: TOP - ((G / 2 - d.top) / G) * size };
      };
      // cut both busts where the shorter photo ends, so they match
      let CUT = -Infinity;
      const place = (
        d: Awaited<ReturnType<typeof sample>>,
        ox: number,
        ry: number,
      ) => {
        const { size, oy } = metrics(d);
        const cs = Math.cos(ry),
          sn = Math.sin(ry);
        for (let y = 0; y < G; y++)
          for (let x = 0; x < G; x++) {
            const i = y * G + x;
            if (d.md[i * 4] < 128) continue;
            const v = Math.min(
              1,
              Math.max(0, (d.lum[i] - d.lo) / (d.hi - d.lo)),
            );
            if (rnd() > 0.25 + v * 0.95) continue;
            const u = (x + rnd() - G / 2) / G,
              t = (G / 2 - y - rnd()) / G;
            const z = (Math.sqrt(d.depth[i]) * 0.32 + (v - 0.5) * 0.04) * size;
            const wy = oy + t * size;
            if (wy < CUT) continue;
            const fade = Math.min(1, (wy - CUT) / 0.4);
            const lx = u * size;
            out.push([
              ox + lx * cs + z * sn,
              wy,
              -lx * sn + z * cs,
              ...WHITE,
              (0.18 + 0.82 * Math.pow(v, 1.2)) * fade,
              1,
            ]);
          }
      };
      const [pedro, victor] = await Promise.all([
        sample("pedro"),
        sample("victor"),
      ]);
      for (const d of [pedro, victor]) {
        const { size, oy } = metrics(d);
        CUT = Math.max(CUT, oy - 0.5 * size + 0.05);
      }
      // flags 6 and 7: Pedro's dots and Victor's, so one can step back while the other talks
      const p0 = out.length;
      place(pedro, -1.4, 0);
      const p1 = out.length;
      place(victor, 1.4, 0);
      for (let i = p0; i < out.length; i++) out[i] = [...out[i].slice(0, 8), i < p1 ? 6 : 7] as P;
      // the conversation between them
      for (let i = 0; i < 600; i++) {
        const u = rnd() * 2 - 1,
          th = rnd() * Math.PI * 2,
          s = Math.sqrt(1 - u * u),
          r = 0.06 + Math.pow(rnd(), 1.8) * 0.45;
        out.push([
          s * Math.cos(th) * r,
          0.12 + u * r,
          s * Math.sin(th) * r,
          ...MENTA,
          0.55 * (1 - r / 0.51),
          0.95,
        ]);
      }
      return out;
    }

    // a wireframe megaphone, built like the globe (rings + lines, back side dimmed),
    // with sound waves opening in front of the mouth: "inscrições em breve"
    function megaphone(): P[] {
      const out: P[] = [];
      seed = 51;
      const yaw = -0.65, // mouth turns towards the viewer (and, mirrored, towards the text)
        tilt = 0.32; // and lifts up and to the right
      const cy = Math.cos(yaw),
        sy = Math.sin(yaw),
        ct = Math.cos(tilt),
        st = Math.sin(tilt);
      const push = (x: number, y: number, z: number, a: number, size = 1) => {
        const x1 = x * cy + z * sy,
          z1 = -x * sy + z * cy;
        const X = -(x1 * ct - y * st), // mirrored: the mouth points left, at the text
          Y = x1 * st + y * ct;
        out.push([X, Y, z1, ...WHITE, z1 < 0 ? a * 0.3 : a, size]);
      };
      // radius along the axis: a short mouthpiece, then a bell that flares out
      const xa = -1.9,
        xb = -1.45,
        xc = 0.9;
      const rAt = (x: number) => {
        if (x < xb) return 0.3 - ((x - xa) / (xb - xa)) * 0.06;
        const u = (x - xb) / (xc - xb);
        return 0.24 + Math.pow(u, 1.7) * 0.86;
      };
      const X = (u: number) => xa + u * (xc - xa);
      // lines along the body
      for (let m = 0; m < 16; m++) {
        const th = (m / 16) * Math.PI * 2;
        for (let i = 0; i < 150; i++) {
          const x = X(rnd());
          const r = rAt(x);
          push(x, Math.cos(th) * r, Math.sin(th) * r, 0.55);
        }
      }
      // rings around the body
      for (let k = 0; k <= 14; k++) {
        const x = X(k / 14),
          r = rAt(x);
        for (let i = 0; i < Math.round(60 + r * 140); i++) {
          const th = rnd() * Math.PI * 2;
          push(x, Math.cos(th) * r, Math.sin(th) * r, 0.5);
        }
      }
      // a brighter rim at the mouth and at the mouthpiece
      for (const x of [xc, xa]) {
        const r = rAt(x);
        for (let i = 0; i < 420; i++) {
          const th = rnd() * Math.PI * 2;
          push(x, Math.cos(th) * r, Math.sin(th) * r, 0.95, 1.05);
        }
      }
      // sparse shell
      for (let i = 0; i < 900; i++) {
        const x = X(rnd()),
          th = rnd() * Math.PI * 2;
        push(x, Math.cos(th) * rAt(x), Math.sin(th) * rAt(x), 0.16, 0.85);
      }
      // the handle: a small wire cylinder under the bell
      const hx = -0.55,
        hr = 0.12;
      for (let m = 0; m < 6; m++) {
        const th = (m / 6) * Math.PI * 2;
        for (let i = 0; i < 50; i++) {
          const y = -rAt(hx) + 0.05 - rnd() * 0.75;
          push(hx + Math.cos(th) * hr, y, Math.sin(th) * hr, 0.55);
        }
      }
      for (let k = 0; k <= 4; k++) {
        const y = -rAt(hx) + 0.05 - (k / 4) * 0.75;
        for (let i = 0; i < 50; i++) {
          const th = rnd() * Math.PI * 2;
          push(hx + Math.cos(th) * hr, y, Math.sin(th) * hr, 0.5);
        }
      }
      // sound waves: a few clean rings opening in front of the mouth, fading out
      for (let k = 1; k <= 3; k++) {
        const x = xc + 0.4 + k * 0.5,
          r = rAt(xc) * (0.55 + k * 0.17),
          a = 0.9 - k * 0.22;
        for (let i = 0; i < 300; i++) {
          const th = rnd() * Math.PI * 2;
          push(x, Math.cos(th) * r, Math.sin(th) * r, a, 1.05);
        }
      }
      return out;
    }

    // keep: the first `keep` points stay in order, so a shape can hand its dots to the
    // same spots in the next one (they don't move); the rest are shuffled
    function fit(pts: P[], keep = 0) {
      for (let i = pts.length - 1; i > keep; i--) {
        const j = keep + ((rnd() * (i + 1 - keep)) | 0);
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      const out = new Float32Array(N * S);
      for (let i = 0; i < N; i++) {
        if (i < pts.length) out.set(pts[i], i * S);
        else {
          // spare particles drift as faint dust around the shape
          const t = rnd() * Math.PI * 2,
            r = 3 + rnd() * 6;
          out.set(
            [
              Math.cos(t) * r,
              (rnd() - 0.5) * 7,
              Math.sin(t) * r - 2,
              1,
              1,
              1,
              0.03 + rnd() * 0.06,
              0.8,
            ],
            i * S,
          );
        }
      }
      return out;
    }

    /* ---------- particles, morphing on the GPU ---------- */
    const geo = new THREE.BufferGeometry();
    const A = (n: number) => new Float32Array(N * n);
    const aFrom = A(3),
      aTo = A(3),
      aCF = A(3),
      aCT = A(3),
      aAS = A(4),
      aMisc = A(3),
      aHand = A(1), // 1 hour hand, 2 minute hand, 0 everything else
      aDir = A(3), // where each particle flies when a shape breaks apart
      // where the shape sits on the page: x as a fraction of the viewport width, y in page px
      aAncF = new Float32Array(N * 2),
      aAncT = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2,
        r = 7 + rnd() * 8;
      aFrom.set(
        [Math.cos(a) * r, (rnd() - 0.5) * 8, Math.sin(a) * r - 4],
        i * 3,
      );
      aCF.set(WHITE, i * 3);
      aAS[i * 4 + 2] = 1;
      aMisc[i * 3] = rnd();
      aMisc[i * 3 + 2] = (rnd() - 0.5) * 2.6;
      const u = rnd() * 2 - 1,
        th = rnd() * Math.PI * 2,
        sq = Math.sqrt(1 - u * u),
        mag = 0.6 + Math.pow(rnd(), 1.5) * 2.4;
      aDir.set(
        [sq * Math.cos(th) * mag, u * mag * 0.8, sq * Math.sin(th) * mag],
        i * 3,
      );
    }
    geo.setAttribute("position", new THREE.BufferAttribute(aTo, 3));
    geo.setAttribute("aFrom", new THREE.BufferAttribute(aFrom, 3));
    geo.setAttribute("aCF", new THREE.BufferAttribute(aCF, 3));
    geo.setAttribute("aCT", new THREE.BufferAttribute(aCT, 3));
    geo.setAttribute("aAS", new THREE.BufferAttribute(aAS, 4));
    geo.setAttribute("aMisc", new THREE.BufferAttribute(aMisc, 3));
    geo.setAttribute("aDir", new THREE.BufferAttribute(aDir, 3));
    geo.setAttribute("aHand", new THREE.BufferAttribute(aHand, 1));
    geo.setAttribute("aAncF", new THREE.BufferAttribute(aAncF, 2));
    geo.setAttribute("aAncT", new THREE.BufferAttribute(aAncT, 2));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uT: { value: 0 },
        uDur: { value: 1.1 }, // how long the dust takes to re-form a shape
        uTime: { value: 0 },
        uScale: { value: 1 },
        uKick: { value: new THREE.Vector2() },
        uKickAge: { value: 99 },
        uRot: { value: new THREE.Matrix3() },
        uView: { value: new THREE.Vector2(1, 1) },
        uScrollY: { value: 0 },
        uHands: { value: new THREE.Vector2() }, // hour and minute hand angles
        uFocus: { value: 0 },
        uHandsFrom: { value: new THREE.Vector2() }, // where the hands' dots are flying from
        uHandT: { value: 1 }, // 0 → 1 over a move
        uRoute: { value: 1 }, // how much of the globe's route is drawn
        uPeople: { value: 0 }, // -1 Pedro in focus, 1 Victor
        uCalm: { value: 0 }, // 1 between prize shapes: the shape follows its pinned section
        uBurst: { value: 0.3 }, // how far dots puff out mid-change (was 1: too showy)
        uAdj: { value: 0 },
        // particles are drawn as tiny Trilha mountains (see below)
        uLogo: { value: null as THREE.Texture | null },
        uLogoOn: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aFrom; attribute vec3 aCF; attribute vec3 aCT; attribute vec4 aAS; attribute vec3 aMisc; attribute vec3 aDir;
        attribute vec2 aAncF; attribute vec2 aAncT; attribute float aHand; uniform vec2 uHands; uniform float uFocus; uniform vec2 uHandsFrom; uniform float uHandT; uniform float uRoute; uniform float uPeople; uniform float uCalm; uniform float uBurst;
        uniform mat3 uRot; uniform vec2 uView; uniform float uScrollY; uniform float uAdj;
        uniform float uT; uniform float uDur; uniform float uTime; uniform float uScale; uniform float uLogoOn;
        uniform vec2 uKick; uniform float uKickAge;
        varying vec3 vC; varying float vA;
        float ease(float p) { return p < 0.5 ? 4.0 * p * p * p : 1.0 - pow(-2.0 * p + 2.0, 3.0) / 2.0; }
        void main() {
          // a shape never travels as a whole: it breaks apart where it is, the dust
          // drifts to the new spot, then condenses into the next shape
          float p = clamp((uT - aMisc.y) / uDur, 0.0, 1.0);
          float e = ease(clamp((p - 0.12) / 0.88, 0.0, 1.0));
          float sc = sin(3.14159 * p) * uBurst;
          vec3 tgt = position;
          float fly = 0.0;
          if (aHand > 0.5 && aHand < 2.5) {
            float a0 = aHand < 1.5 ? uHandsFrom.x : uHandsFrom.y;
            float a1 = aHand < 1.5 ? uHands.x : uHands.y;
            vec2 p0 = vec2(tgt.x * cos(a0) - tgt.y * sin(a0), tgt.x * sin(a0) + tgt.y * cos(a0));
            vec2 p1 = vec2(tgt.x * cos(a1) - tgt.y * sin(a1), tgt.x * sin(a1) + tgt.y * cos(a1));
            // each dot leaves a little after the one before it, so the hand streams across
            float h = clamp((uHandT - aMisc.x * 0.3) / 0.7, 0.0, 1.0);
            h = ease(h);
            tgt.xy = mix(p0, p1, h);
            fly = sin(3.14159 * h);
          }
          vec3 pos = mix(aFrom, tgt, e) + aDir * (sc + fly * 0.12);
          // the two people in "mentoria" nod along, each on its own beat
          if (aHand > 7.5 && aHand < 9.5) pos.y += sin(uTime * 2.4 + (aHand - 8.0) * 2.6) * 0.035 * e;
          pos += vec3(sin(uTime * 0.6 + aMisc.x * 30.0), cos(uTime * 0.5 + aMisc.x * 20.0), sin(uTime * 0.4 + aMisc.x * 12.0)) * 0.008;
          pos = uRot * pos; // lean around the shape's own centre
          vec4 mv = viewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;

          // pin the shape to the page in screen pixels, so it scrolls exactly like the DOM
          vec2 anc = mix(aAncF, aAncT, e);
          // follows its section as it moves (a pinned one moves with the scroll); between
          // two shapes of one pinned section both ends follow it, so nothing drifts
          anc.y += uAdj * mix(e, 1.0, uCalm);
          vec2 offPx = vec2(anc.x * uView.x - uView.x * 0.5, anc.y - uScrollY - uView.y * 0.5);
          gl_Position.xy += vec2(offPx.x, -offPx.y) / uView * 2.0 * gl_Position.w;

          // click on the shape: a puff of air. Nearby points are blown away from the
          // cursor, each a little differently, peak fast and then drift back
          float k = 0.0;
          if (uKickAge < 2.0) {
            vec2 px = (gl_Position.xy / gl_Position.w * 0.5 + 0.5) * uView;
            px.y = uView.y - px.y;
            vec2 dv = px - uKick;
            vec2 d = normalize(dv + 1e-4);
            float fall = exp(-pow(length(dv) / 110.0, 2.0));
            float t = uKickAge / 0.15;
            float env = t * exp(1.0 - t);
            float ang = aMisc.z * 0.55 + sin(aMisc.x * 50.0) * 0.35;
            d = vec2(d.x * cos(ang) - d.y * sin(ang), d.x * sin(ang) + d.y * cos(ang));
            k = fall * env;
            vec2 push = d * k * (16.0 + 28.0 * aMisc.x);
            gl_Position.xy += vec2(push.x, -push.y) / uView * 2.0 * gl_Position.w;
          }
          float size = mix(aAS.z, aAS.w, e);
          gl_PointSize = min(size * uScale * (14.0 / -mv.z), uScale * 2.4) * mix(1.0, 1.6, uLogoOn);
          float tw = 0.8 + 0.2 * sin(uTime * (1.0 + aMisc.x * 1.5) + aMisc.x * 40.0);
          vC = mix(aCF, aCT, e);
          // zoomed on one person (flag 3): everyone else fades back
          float focus = aHand > 2.5 ? 1.0 : 1.0 - 0.85 * uFocus;
          if (aHand > 5.5 && aHand < 7.5) {
            float away = aHand < 6.5 ? max(0.0, uPeople) : max(0.0, -uPeople);
            focus *= 1.0 - 0.75 * away;
          } else if (aHand > 3.5 && aHand < 5.5) {
            // the route: a dot shows once the line has reached it, the leading edge glows
            float ahead = uRoute - (aHand - 4.0);
            focus *= clamp(ahead / 0.025 + 1.0, 0.0, 1.0);
            focus *= 1.0 + 1.2 * exp(-pow(ahead / 0.03, 2.0)) * step(uRoute, 0.999);
          }
          vA = focus * mix(aAS.x, aAS.y, e) * (1.0 - 0.4 * sc) * (1.0 - 0.25 * k) * tw * mix(1.0, 1.25, uLogoOn);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uLogo; uniform float uLogoOn;
        varying vec3 vC; varying float vA;
        void main() {
          // green and white points are drawn in separate passes (see below)
          bool green = false; // accent is white now: no separate pass needed
          float va = vA;
          #ifdef MENTA_PASS
            if (!green) discard;
            va = clamp(vA * 1.35, 0.0, 1.0); // no accumulation in this pass: lift it to full Menta
          #else
            if (green) discard;
          #endif
          if (uLogoOn > 0.5) {
            float a = texture2D(uLogo, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y)).a;
            if (a < 0.05) discard;
            gl_FragColor = vec4(vC * a * va, 1.0);
            return;
          }
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(vC * smoothstep(0.5, 0.1, d) * va, 1.0);
        }`,
    });
    group.add(new THREE.Points(geo, mat));
    // Additive blending makes overlapping green points drift to cyan (green caps at 1 while
    // blue keeps adding up). Green points get their own pass with max blending, so the
    // route and accents stay exactly Verde Menta; white points keep the additive glow.
    const matMenta = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      uniforms: mat.uniforms,
      vertexShader: mat.vertexShader,
      fragmentShader: mat.fragmentShader,
      defines: { MENTA_PASS: 1 },
    });
    group.add(new THREE.Points(geo, matMenta));

    // every particle is a tiny Trilha mountain, about the size of a dot: you only notice
    // when you zoom in. ?pontos falls back to round dots.
    if (!new URLSearchParams(location.search).has("pontos")) {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const g = c.getContext("2d")!;
        const ar = img.naturalWidth / img.naturalHeight || 1.43;
        const w = 60,
          h = w / ar;
        g.drawImage(img, 2, (64 - h) / 2, w, h);
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        mat.uniforms.uLogo.value = tex;
        mat.uniforms.uLogoOn.value = 1;
      };
      img.src = "/montanha.svg";
    }

    let SCENES: Float32Array[] = [];
    let chapter = -1;
    let want = 0;
    let startAt = performance.now();
    let routeAt = performance.now();
    // the route waits for the globe to form, then crawls from João Pessoa to San Francisco
    const ROUTE_DELAY = 1.3,
      ROUTE_DUR = 3.6;
    const ease = (p: number) =>
      p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

    function begin(n: number) {
      const T = SCENES[n];
      if (!T) return;
      // a scene can span several sections (the hero and the facts strip under it): the shape
      // always belongs to the first one, whichever section triggered it
      anchorEl = document.querySelector<HTMLElement>(`[data-scene="${sceneSection(n)}"]`);
      const ax = narrow() ? 0.5 : cTarget;
      const ay = anchorY();
      bakedY = ay;
      const adjAtBegin = mat.uniforms.uAdj.value;
      mat.uniforms.uAdj.value = 0;
      const elapsed = (performance.now() - startAt) / 1000,
        dur = mat.uniforms.uDur.value,
        burstNow = mat.uniforms.uBurst.value,
        calmNow = mat.uniforms.uCalm.value;
      // between two prize shapes the move is short and quick, and dots that keep
      // their spot (the "1") stay still
      const calm = PRIZE_SCENES.includes(n) && PRIZE_SCENES.includes(chapter) ? 1 : 0;
      for (let i = 0; i < N; i++) {
        // freeze where each particle is right now, then aim it at the new shape
        const p =
            chapter < 0
              ? 0
              : Math.min(1, Math.max(0, (elapsed - aMisc[i * 3 + 1]) / dur)),
          e = ease(Math.min(1, Math.max(0, (p - 0.12) / 0.88))),
          sc = Math.sin(Math.PI * p) * burstNow;
        // a hand sits where it was turned to, not where it was built
        let tx = aTo[i * 3],
          ty = aTo[i * 3 + 1];
        if (aHand[i] === 1 || aHand[i] === 2) {
          const { x: hourA, y: minA } = mat.uniforms.uHands.value;
          const a = aHand[i] === 1 ? hourA : minA;
          [tx, ty] = [tx * Math.cos(a) - ty * Math.sin(a), tx * Math.sin(a) + ty * Math.cos(a)];
        }
        const to = [tx, ty, aTo[i * 3 + 2]];
        for (let k = 0; k < 3; k++)
          aFrom[i * 3 + k] +=
            (to[k] - aFrom[i * 3 + k]) * e + aDir[i * 3 + k] * sc;
        for (let k = 0; k < 3; k++)
          aCF[i * 3 + k] += (aCT[i * 3 + k] - aCF[i * 3 + k]) * e;
        if (chapter < 0) {
          aAncF[i * 2] = ax;
          aAncF[i * 2 + 1] = ay;
        } else {
          // start from exactly where the dot is drawn right now (the shader adds the
          // section's movement in full while inside one pinned section), so a change
          // that interrupts another never snaps
          aAncF[i * 2] += (aAncT[i * 2] - aAncF[i * 2]) * e;
          aAncF[i * 2 + 1] +=
            (aAncT[i * 2 + 1] - aAncF[i * 2 + 1]) * e + adjAtBegin * (e + (1 - e) * calmNow);
        }
        aAncT[i * 2] = ax;
        aAncT[i * 2 + 1] = ay;
        aAS[i * 4] += (aAS[i * 4 + 1] - aAS[i * 4]) * e;
        aAS[i * 4 + 2] += ((aAS[i * 4 + 3] || 1) - aAS[i * 4 + 2]) * e;
        const o = i * S;
        aHand[i] = T[o + 8];
        aTo[i * 3] = T[o];
        aTo[i * 3 + 1] = T[o + 1];
        aTo[i * 3 + 2] = T[o + 2];
        aCT[i * 3] = T[o + 3];
        aCT[i * 3 + 1] = T[o + 4];
        aCT[i * 3 + 2] = T[o + 5];
        aAS[i * 4 + 1] = T[o + 6];
        aAS[i * 4 + 3] = T[o + 7];
        aMisc[i * 3 + 1] = aMisc[i * 3] * (chapter < 0 ? 0.6 : calm ? 0.12 : 0.3);
      }
      for (const k of [
        "position",
        "aFrom",
        "aCF",
        "aCT",
        "aAS",
        "aMisc",
        "aDir",
        "aHand",
        "aAncF",
        "aAncT",
      ])
        geo.attributes[k].needsUpdate = true;
      mat.uniforms.uCalm.value = calm;
      // shapes glide into each other: a small puff between sections, none inside one
      mat.uniforms.uBurst.value = calm ? 0 : 0.3;
      mat.uniforms.uDur.value = calm ? 0.8 : 1.1;
      if (n === 0 && chapter !== 0) routeAt = performance.now();
      chapter = n;
      startAt = performance.now();
      // begin() can run mid-frame, after uT was set from the old start: without this the
      // new shape is drawn fully formed for one frame, a visible flash
      mat.uniforms.uT.value = 0;
      el.dataset.chapter = String(n);
    }

    /* ---------- framing: on desktop the shape sits on the side the text leaves empty ----------
       sections say where their text is (data-side="left" | "right"); the shape glides across */
    let baseD = 14;
    let cNow = 0.76,
      cTarget = 0.76; // shape centre as a fraction of the viewport width
    let maskC = -1;
    let anchorEl: HTMLElement | null = null;
    let bakedY = 0;
    // where the shape sits on the page (px): the section's middle on desktop,
    // its upper part on phones (the text sits low there)
    // On desktop the page moves in stops, so the shape is pinned to the screen, not
    // the page: it holds still while the page glides and only changes form (pinned to
    // the page it rose with the old section and rose again with the new one). Its
    // height is where it sits once the section has landed: mid-screen, or level with
    // the part the section names (data-shape-anchor). Phones scroll freely, so there it
    // rides with its section, in the upper part (the text sits low).
    const screenPinned = () => !narrow();
    const anchorY = () => {
      if (!anchorEl) return 0;
      const r = anchorEl.getBoundingClientRect();
      if (screenPinned()) {
        const target = anchorEl.querySelector<HTMLElement>("[data-shape-anchor]");
        if (!target) return innerHeight / 2;
        const t = target.getBoundingClientRect();
        return Math.min(innerHeight * 0.85, Math.max(innerHeight * 0.15, t.top - r.top + t.height / 2));
      }
      return r.top + scrollY + Math.min(r.height, innerHeight) * 0.24;
    };
    const frameSide = () => {
      if (narrow()) {
        if (maskC !== -2) {
          el.style.maskImage = el.style.webkitMaskImage = "";
          maskC = -2;
        }
        return;
      }
      if (Math.abs(maskC - cNow) > 0.002) {
        // keep the dots off the text: fully visible 13% either side of the shape centre, gone by 20%
        const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
        const m = `linear-gradient(to right, transparent ${pct(cNow - 0.2)}, #000 ${pct(cNow - 0.13)}, #000 ${pct(cNow + 0.13)}, transparent ${pct(cNow + 0.2)})`;
        el.style.maskImage = el.style.webkitMaskImage = m;
        maskC = cNow;
      }
    };
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      if (!narrow()) {
        camera.clearViewOffset();
        baseD = Math.max(
          8.4 / (0.5 * camera.aspect * 2 * half),
          5.6 / (2 * half),
        );
      } else {
        // phones: lift the shape into the empty top of the screen, above the text
        camera.clearViewOffset();
        baseD = Math.max(6.6 / (camera.aspect * 2 * half), 5.4 / (2 * half));
      }
      mat.uniforms.uView.value.set(w, h);
      camera.position.set(0, 0, baseD);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      maskC = -1;
      frameSide();
      mat.uniforms.uScale.value =
        renderer.getPixelRatio() *
        2.3 *
        Math.min(1.25, Math.max(0.75, h / 820));
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    /* ---------- which section is in the middle of the screen ---------- */
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            const sec = e.target as HTMLElement;
            want = Number(sec.dataset.scene);
            if (sec.dataset.side)
              cTarget = sec.dataset.side === "right" ? 0.24 : 0.76;
            if (want === 1) want = prizeScene();
            if (SCENES.length && want !== chapter) begin(want);
          }
      },
      // a section takes over once its top is 80% down the screen, so its shape is
      // already forming as it scrolls in
      { rootMargin: "-80% 0px -19% 0px" },
    );
    document
      .querySelectorAll<HTMLElement>("[data-scene]")
      .forEach((s) => io.observe(s));

    /* ---------- click pulse ---------- */
    let kickAt = -1e9;
    const kick = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      const cx = (narrow() ? 0.5 : cTarget) * r.width;
      const cy = bakedY + mat.uniforms.uAdj.value - (screenPinned() ? 0 : scrollY);
      // roughly the shape's radius on screen: 4.2 world units across at the current zoom
      const unit =
        r.height /
        (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * baseD);
      const onShape = Math.hypot(x - r.left - cx, y - r.top - cy) < 2.4 * unit;
      if (!onShape) return dotRipple(x, y); // elsewhere: little dots appear around the click
      mat.uniforms.uKick.value.set(x - r.left, y - r.top);
      kickAt = performance.now();
    };

    /* ---------- the shape leans slightly toward the mouse; a click sends the pulse ---------- */
    const INTERACTIVE =
      "a,button,input,textarea,select,label,summary,[role=button]";
    const pointer = { x: 0, y: 0 },
      lean = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = e.clientX / innerWidth - 0.5;
      pointer.y = e.clientY / innerHeight - 0.5;
    };
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element)?.closest?.(INTERACTIVE))
        kick(e.clientX, e.clientY);
    };
    addEventListener("pointerdown", onDown);
    if (!reduced) addEventListener("pointermove", onMove);

    /* ---------- loop ---------- */
    const euler = new THREE.Euler(),
      m4 = new THREE.Matrix4();
    let raf = 0,
      rotY = 0,
      last = performance.now();
    // on a new slot the hands sweep there quickly, like a clock fast-forwarding: the
    // minute hand spins once per hour passed. Going back in the day winds them back.
    const HAND_SWEEP = 0.8; // seconds
    let dialSlot = -1,
      sweepFrom = 0,
      sweepAt = -1e9;
    const angles = (h: number): [number, number] => [
      -((h % 12) / 12) * Math.PI * 2,
      -(h % 1) * Math.PI * 2,
    ];
    let shownH = dialTarget;
    const tickClock = (now: number) => {
      const u = mat.uniforms;
      if (dialTarget !== dialSlot) {
        if (dialSlot < 0 || reduced) shownH = dialTarget;
        sweepFrom = shownH;
        sweepAt = now;
        dialSlot = dialTarget;
      }
      const t = Math.min(1, (now - sweepAt) / 1000 / HAND_SWEEP);
      shownH = sweepFrom + (dialTarget - sweepFrom) * ease(t);
      const [hA, mA] = angles(shownH);
      u.uHands.value.set(hA, mA);
      u.uHandsFrom.value.set(hA, mA);
      u.uHandT.value = 1;
    };
    let peopleShown = peopleTarget,
      peopleWeight = 0;
    let crowdShown = crowdTarget,
      crowdWeight = 0,
      zoomShown = 0;
    const you = new THREE.Vector3();
    const frame = (now: number) => {
      const t = now / 1000,
        dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      mat.uniforms.uT.value = reduced ? 99 : (now - startAt) / 1000;
      mat.uniforms.uTime.value = reduced ? 0 : t;
      mat.uniforms.uKickAge.value = (now - kickAt) / 1000;
      tickClock(now);
      mat.uniforms.uRoute.value = reduced
        ? 1
        : ease(Math.min(1, Math.max(0, ((now - routeAt) / 1000 - ROUTE_DELAY) / ROUTE_DUR)));
      if (!reduced) {
        // the globe and the crowd turn a little more than flat shapes
        const amp =
          chapter === 0
            ? 0.35
            : chapter === 3
              ? 0.3
              : chapter === 4
                ? 0.22
                : 0.18;
        rotY += (Math.sin(t * 0.3) * amp - rotY) * Math.min(1, dt * 2);
      }
      lean.x += (pointer.x - lean.x) * Math.min(1, dt * 3);
      lean.y += (pointer.y - lean.y) * Math.min(1, dt * 3);
      if (SCENES.length && PRIZE_SCENES.includes(chapter) && prizeScene() !== chapter) begin(prizeScene());
      crowdShown += (crowdTarget - crowdShown) * (reduced ? 1 : Math.min(1, dt * 10));
      // the crowd turns only while it is the shape on screen; leaving, it settles back face on
      crowdWeight += ((chapter === CROWD ? 1 : 0) - crowdWeight) * (reduced ? 1 : Math.min(1, dt * 3));
      const f = crowdShown * (CROWD_VIEWS.length - 1),
        i = Math.min(CROWD_VIEWS.length - 2, Math.floor(f)),
        k = f - i,
        va = CROWD_VIEWS[i],
        vb = CROWD_VIEWS[i + 1],
        tilt = (va.tilt + (vb.tilt - va.tilt) * k) * crowdWeight,
        yaw = (va.yaw + (vb.yaw - va.yaw) * k) * crowdWeight;
      zoomShown += ((va.zoom + (vb.zoom - va.zoom) * k) * crowdWeight - zoomShown) * (reduced ? 1 : Math.min(1, dt * 7));
      mat.uniforms.uFocus.value = zoomShown;
      euler.set(lean.y * 0.15 + tilt, rotY + lean.x * 0.35 + yaw, 0);
      mat.uniforms.uRot.value.setFromMatrix4(m4.makeRotationFromEuler(euler));
      // close in on the one person: the camera slides over and in, 3.6 units from them
      you.set(0.5, -0.45, 1).applyMatrix4(m4);
      camera.position.set(you.x * zoomShown, you.y * zoomShown, baseD + (you.z + 3.6 - baseD) * zoomShown);
      // the founders: the camera drifts toward whoever is in focus
      peopleShown += (peopleTarget - peopleShown) * (reduced ? 1 : Math.min(1, dt * 8));
      peopleWeight += ((chapter === 4 ? 1 : 0) - peopleWeight) * (reduced ? 1 : Math.min(1, dt * 3));
      mat.uniforms.uPeople.value = peopleShown * peopleWeight;
      camera.position.x += peopleShown * peopleWeight * 0.7;
      camera.position.z -= peopleWeight * 1.2;
      mat.uniforms.uScrollY.value = screenPinned() ? 0 : scrollY;
      if (chapter >= 0) mat.uniforms.uAdj.value = anchorY() - bakedY;
      if (!narrow() && Math.abs(cTarget - cNow) > 0.0005) {
        cNow += (cTarget - cNow) * (reduced ? 1 : Math.min(1, dt * 3));
        frameSide();
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };

    let alive = true;
    (async () => {
      await document.fonts.ready;
      const shapes = [
        globe(),
        text("100K", 5.6, 2.2),
        dial(),
        crowd(),
        mentors(), // replaced by the founders hologram below when the photos load
        text("?", 3, 3.6, 200),
      ];
      try {
        shapes[4] = await founders();
      } catch {
        /* keep the generic figures */
      }
      const dawn: P[] = []; // signup: no shape, just the dust
      if (!alive) return;
      const prize = prizeShapes();
      shapes[1] = prize.shapes[0];
      SCENES = [
        ...[...shapes, dawn].map((pts, i) => fit(pts, i === 1 ? prize.keep[0] : 0)),
        ...prize.shapes.slice(1).map((pts, i) => fit(pts, prize.keep[i + 1])),
      ];
      begin(want);
      el.style.opacity = "1";
      raf = requestAnimationFrame(frame);
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener("pointerdown", onDown);
      removeEventListener("pointermove", onMove);
      geo.dispose();
      mat.dispose();
      matMenta.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-0 transition-opacity duration-[1500ms] max-[900px]:!opacity-40 [&>canvas]:block [&>canvas]:!h-full [&>canvas]:!w-full"
    />
  );
}
