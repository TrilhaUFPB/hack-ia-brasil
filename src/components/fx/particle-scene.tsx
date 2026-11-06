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
 *  2 a ten-hour dial
 *  3 a crowd (12–25, anyone who builds)
 *  4 two mentors facing each other
 *  5 "?"
 *  6 the Trilha mountain
 */

type P = [number, number, number, number, number, number, number, number]; // x y z r g b alpha size
const WHITE: [number, number, number] = [1, 1, 1];
const MENTA: [number, number, number] = [0, 0.83, 0.41];

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
          ...MENTA,
          0.95,
          1.05,
        ]);
      }
      sphere(out, A[0] * R, A[1] * R, A[2] * R, 0.09, 260, MENTA, 1, 1.2, true);
      sphere(out, B[0] * R, B[1] * R, B[2] * R, 0.07, 200, WHITE, 1, 1.2, true);
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
      // ten hour ticks (08 → 18)
      for (let h = 0; h < 10; h++) {
        const t = Math.PI / 2 - (h / 10) * Math.PI * 2;
        for (let i = 0; i < 70; i++) {
          const r = R - 0.15 - rnd() * 0.25;
          out.push([Math.cos(t) * r, Math.sin(t) * r, 0, ...WHITE, 0.95, 1.05]);
        }
      }
      // the hand, pointing at "hacking"
      const ht = Math.PI / 2 - (1.5 / 10) * Math.PI * 2;
      for (let i = 0; i < 520; i++) {
        const r = rnd() * (R - 0.45);
        out.push([
          Math.cos(ht) * r + (rnd() - 0.5) * 0.02,
          Math.sin(ht) * r + (rnd() - 0.5) * 0.02,
          0.02,
          ...MENTA,
          1,
          1.05,
        ]);
      }
      sphere(out, 0, 0, 0.02, 0.07, 160, MENTA, 1, 1.1, true);
      return out;
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
      for (let i = you; i < out.length; i++) out[i].splice(3, 3, ...MENTA);
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
      place(pedro, -1.4, 0);
      place(victor, 1.4, 0);
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

    async function mountain(): Promise<P[]> {
      const img = new Image();
      img.src = "/montanha.svg";
      await img.decode();
      seed = 51;
      const ar = img.naturalWidth / img.naturalHeight || 1.43;
      const Wu = 4.6,
        Hu = Wu / ar;
      return sampleCanvas(
        (g, W, H) => g.drawImage(img, 0, 0, W, H),
        Wu,
        Hu,
        narrow() ? 0.04 : 0.022,
      );
    }

    function fit(pts: P[]) {
      for (let i = pts.length - 1; i > 0; i--) {
        const j = (rnd() * (i + 1)) | 0;
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      const out = new Float32Array(N * 8);
      for (let i = 0; i < N; i++) {
        if (i < pts.length) out.set(pts[i], i * 8);
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
            i * 8,
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
    geo.setAttribute("aAncF", new THREE.BufferAttribute(aAncF, 2));
    geo.setAttribute("aAncT", new THREE.BufferAttribute(aAncT, 2));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uT: { value: 0 },
        uDur: { value: 1.4 },
        uTime: { value: 0 },
        uScale: { value: 1 },
        uKick: { value: new THREE.Vector2() },
        uKickAge: { value: 99 },
        uRot: { value: new THREE.Matrix3() },
        uView: { value: new THREE.Vector2(1, 1) },
        uScrollY: { value: 0 },
        uAdj: { value: 0 },
        // particles are drawn as tiny Trilha mountains (see below)
        uLogo: { value: null as THREE.Texture | null },
        uLogoOn: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aFrom; attribute vec3 aCF; attribute vec3 aCT; attribute vec4 aAS; attribute vec3 aMisc; attribute vec3 aDir;
        attribute vec2 aAncF; attribute vec2 aAncT;
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
          float sc = sin(3.14159 * p);
          vec3 pos = mix(aFrom, position, e) + aDir * sc;
          pos += vec3(sin(uTime * 0.6 + aMisc.x * 30.0), cos(uTime * 0.5 + aMisc.x * 20.0), sin(uTime * 0.4 + aMisc.x * 12.0)) * 0.008;
          pos = uRot * pos; // lean around the shape's own centre
          vec4 mv = viewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;

          // pin the shape to the page in screen pixels, so it scrolls exactly like the DOM
          vec2 anc = mix(aAncF, aAncT, e);
          anc.y += uAdj * e; // follows its section if the layout shifts after it formed
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
          vA = mix(aAS.x, aAS.y, e) * (1.0 - 0.4 * sc) * (1.0 - 0.25 * k) * tw * mix(1.0, 1.25, uLogoOn);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uLogo; uniform float uLogoOn;
        varying vec3 vC; varying float vA;
        void main() {
          if (uLogoOn > 0.5) {
            float a = texture2D(uLogo, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y)).a;
            if (a < 0.05) discard;
            gl_FragColor = vec4(vC * a * vA, 1.0);
            return;
          }
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(vC * smoothstep(0.5, 0.1, d) * vA, 1.0);
        }`,
    });
    group.add(new THREE.Points(geo, mat));

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
    const ease = (p: number) =>
      p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

    function begin(n: number) {
      const T = SCENES[n];
      if (!T) return;
      // a scene can span several sections (the hero and the facts strip under it): the shape
      // always belongs to the first one, whichever section triggered it
      anchorEl = document.querySelector<HTMLElement>(`[data-scene="${n}"]`);
      const ax = narrow() ? 0.5 : cTarget;
      const ay = anchorY();
      bakedY = ay;
      const adjAtBegin = mat.uniforms.uAdj.value;
      mat.uniforms.uAdj.value = 0;
      const elapsed = (performance.now() - startAt) / 1000,
        dur = mat.uniforms.uDur.value;
      for (let i = 0; i < N; i++) {
        // freeze where each particle is right now, then aim it at the new shape
        const p =
            chapter < 0
              ? 0
              : Math.min(1, Math.max(0, (elapsed - aMisc[i * 3 + 1]) / dur)),
          e = ease(Math.min(1, Math.max(0, (p - 0.12) / 0.88))),
          sc = Math.sin(Math.PI * p);
        for (let k = 0; k < 3; k++)
          aFrom[i * 3 + k] +=
            (aTo[i * 3 + k] - aFrom[i * 3 + k]) * e + aDir[i * 3 + k] * sc;
        for (let k = 0; k < 3; k++)
          aCF[i * 3 + k] += (aCT[i * 3 + k] - aCF[i * 3 + k]) * e;
        if (chapter < 0) {
          aAncF[i * 2] = ax;
          aAncF[i * 2 + 1] = ay;
        } else {
          aAncF[i * 2] += (aAncT[i * 2] - aAncF[i * 2]) * e;
          aAncF[i * 2 + 1] +=
            (aAncT[i * 2 + 1] + adjAtBegin - aAncF[i * 2 + 1]) * e;
        }
        aAncT[i * 2] = ax;
        aAncT[i * 2 + 1] = ay;
        aAS[i * 4] += (aAS[i * 4 + 1] - aAS[i * 4]) * e;
        aAS[i * 4 + 2] += ((aAS[i * 4 + 3] || 1) - aAS[i * 4 + 2]) * e;
        const o = i * 8;
        aTo[i * 3] = T[o];
        aTo[i * 3 + 1] = T[o + 1];
        aTo[i * 3 + 2] = T[o + 2];
        aCT[i * 3] = T[o + 3];
        aCT[i * 3 + 1] = T[o + 4];
        aCT[i * 3 + 2] = T[o + 5];
        aAS[i * 4 + 1] = T[o + 6];
        aAS[i * 4 + 3] = T[o + 7];
        aMisc[i * 3 + 1] = aMisc[i * 3] * (chapter < 0 ? 0.6 : 0.3);
      }
      for (const k of [
        "position",
        "aFrom",
        "aCF",
        "aCT",
        "aAS",
        "aMisc",
        "aDir",
        "aAncF",
        "aAncT",
      ])
        geo.attributes[k].needsUpdate = true;
      chapter = n;
      startAt = performance.now();
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
    const anchorY = () => {
      if (!anchorEl) return 0;
      const r = anchorEl.getBoundingClientRect();
      const top = r.top + scrollY;
      return narrow()
        ? top + Math.min(r.height, innerHeight) * 0.24
        : top + r.height / 2;
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
            if (SCENES.length && want !== chapter) begin(want);
          }
      },
      { rootMargin: "-64% 0px -35% 0px" },
    );
    document
      .querySelectorAll<HTMLElement>("[data-scene]")
      .forEach((s) => io.observe(s));

    /* ---------- click pulse ---------- */
    let kickAt = -1e9;
    const kick = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      const cx = (narrow() ? 0.5 : cTarget) * r.width;
      const cy = bakedY + mat.uniforms.uAdj.value - scrollY;
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
    const frame = (now: number) => {
      const t = now / 1000,
        dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      mat.uniforms.uT.value = reduced ? 99 : (now - startAt) / 1000;
      mat.uniforms.uTime.value = reduced ? 0 : t;
      mat.uniforms.uKickAge.value = (now - kickAt) / 1000;
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
      euler.set(lean.y * 0.15, rotY + lean.x * 0.35, 0);
      mat.uniforms.uRot.value.setFromMatrix4(m4.makeRotationFromEuler(euler));
      mat.uniforms.uScrollY.value = scrollY;
      if (chapter >= 0) mat.uniforms.uAdj.value = anchorY() - bakedY;
      if (!narrow() && Math.abs(cTarget - cNow) > 0.0005) {
        cNow += (cTarget - cNow) * (reduced ? 1 : Math.min(1, dt * 1.4));
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
      let mtn: P[] = [];
      try {
        mtn = await mountain();
      } catch {
        mtn = text("trilha", 5, 1.6);
      }
      if (!alive) return;
      SCENES = [...shapes, mtn].map(fit);
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
