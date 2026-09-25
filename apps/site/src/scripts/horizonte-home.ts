/*
  Horizonte home stage: refractive lens, orbiting earlier versions, part
  labels and the product selector. The signature transition (~1100 ms):
  inhale 0–32%, swirl 28–62% (content swaps at 45%), resolve 45–75%, settle
  60–100% with one damped overshoot. Reduced motion swaps with a crossfade.
*/
import { createLens, hexToVec, type Lens } from "./horizonte-lens";

type GhostKind =
  | "calendar"
  | "range"
  | "sidebar"
  | "chat"
  | "plan"
  | "chart"
  | "list"
  | "doc"
  | "board"
  | "page"
  | "split"
  | "form";

interface StageProject {
  id: string;
  name: string;
  status: string;
  short: string;
  href: string;
  tint: string;
  texture: string;
  size: [number, number];
  focus: { x: number; y: number; zoom: number };
  alt: string;
  parts: { kind: GhostKind; label: string }[];
}

interface StageData {
  projects: StageProject[];
  versions: [string, string, string];
  dots: [string, string, string];
}

interface Transition {
  from: number;
  to: number;
  dir: number;
  dur: number;
  t0: number;
  waiting: boolean;
  swapped: boolean;
}

interface Slot {
  a: number;
  rotY: number;
  rotZ: number;
  text?: "above" | "below";
  bend?: number;
}

interface PartEl {
  el: HTMLElement;
  dot: HTMLElement;
  text: HTMLElement;
  name: HTMLElement;
  ver: HTMLElement;
  left: boolean | undefined;
  w: number;
  h: number;
}

interface GhostState {
  el: HTMLElement;
  pt: [number, number];
  scale: number;
  c: [number, number];
}

const DURATION = 1100;
const SWAP_AT = 0.45;
const RETARGET_BEFORE = 0.3;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeOutBack = (t: number) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const seg = (x: number, a: number, b: number) => clamp((x - a) / (b - a), 0, 1);

/* Synthetic earlier versions drawn in code: v1 sketch, v2 prototype, shipped. */
function ghostSVG(kind: GhostKind, stageIdx: number, tint: string) {
  const o: string[] = [];
  const ink = "rgba(71,60,51,";
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    accent = false,
    r = 2,
  ) => {
    let st: string;
    if (stageIdx === 0)
      st = `fill="none" stroke="${ink}0.42)" stroke-dasharray="3 2.5"`;
    else if (stageIdx === 1)
      st = `fill="${ink}${accent ? "0.16)" : "0.07)"}" stroke="${ink}0.16)"`;
    else st = `fill="${accent ? tint : "#fff"}" stroke="${ink}0.24)"`;
    o.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${st} stroke-width="1"/>`,
    );
  };
  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strong = false,
  ) => {
    const a =
      stageIdx === 0 ? 0.38 : stageIdx === 1 ? 0.22 : strong ? 0.55 : 0.3;
    o.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}${a})" stroke-width="${strong ? 1.6 : 1.1}" stroke-linecap="round"/>`,
    );
  };
  const dot = (x: number, y: number, r: number, accent = false) => {
    const f = stageIdx === 2 && accent ? tint : "none";
    o.push(
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" stroke="${ink}${stageIdx === 0 ? "0.4)" : "0.3)"}" stroke-width="1"/>`,
    );
  };
  switch (kind) {
    case "calendar":
      line(10, 12, 60, 12, true);
      rect(104, 7, 28, 10, true, 5);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 7; j++)
          rect(
            10 + j * 18,
            26 + i * 17,
            14,
            12,
            (i === 1 && j === 3) || (i === 2 && j === 5),
            2,
          );
      break;
    case "range":
      line(10, 12, 70, 12, true);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 7; j++)
          rect(10 + j * 18, 26 + i * 17, 14, 12, false, 2);
      rect(46, 44, 68, 10, true, 5);
      rect(10, 78, 50, 10, true, 5);
      break;
    case "sidebar":
      rect(6, 6, 32, 88, false, 3);
      for (let i = 0; i < 4; i++) line(12, 18 + i * 12, 30, 18 + i * 12);
      line(46, 14, 96, 14, true);
      rect(46, 24, 42, 26, false, 3);
      rect(92, 24, 42, 26, true, 3);
      for (let i = 0; i < 3; i++) line(46, 62 + i * 11, 124, 62 + i * 11);
      break;
    case "chat":
      rect(10, 12, 74, 14, false, 7);
      rect(58, 32, 74, 14, true, 7);
      rect(10, 52, 60, 14, false, 7);
      rect(70, 72, 62, 14, true, 7);
      break;
    case "plan":
      line(10, 12, 64, 12, true);
      for (let i = 0; i < 4; i++) {
        dot(15, 30 + i * 17, 4, i === 1);
        line(26, 30 + i * 17, 96, 30 + i * 17);
        rect(104, 25 + i * 17, 28, 10, i === 1, 5);
      }
      break;
    case "chart":
      line(12, 86, 132, 86);
      line(12, 14, 12, 86);
      o.push(
        `<polyline points="16,74 36,66 56,70 76,52 96,46 116,34 130,28" fill="none" stroke="${ink}${stageIdx === 0 ? "0.4)" : "0.5)"}" stroke-width="1.4"${stageIdx === 0 ? ' stroke-dasharray="3 2.5"' : ""}/>`,
      );
      for (let i = 0; i < 6; i++)
        rect(20 + i * 19, 90 - (8 + i * 3), 9, 8 + i * 3, i === 5, 1.5);
      break;
    case "list":
      line(10, 12, 60, 12, true);
      for (let i = 0; i < 5; i++) {
        dot(16, 28 + i * 14, 4, i === 0);
        line(26, 28 + i * 14, 92, 28 + i * 14);
        rect(106, 23 + i * 14, 26, 10, i === 2, 5);
      }
      break;
    case "doc":
      rect(44, 16, 70, 78, false, 3);
      rect(36, 10, 70, 78, false, 3);
      rect(28, 4, 70, 78, false, 3);
      line(36, 16, 76, 16, true);
      for (let i = 0; i < 5; i++)
        line(36, 28 + i * 10, 90 - (i % 2) * 14, 28 + i * 10);
      rect(36, 72, 30, 8, true, 4);
      break;
    case "board":
      for (let j = 0; j < 3; j++) {
        rect(8 + j * 44, 8, 40, 84, false, 3);
        for (let i = 0; i < 3 - (j === 2 ? 1 : 0); i++)
          rect(12 + j * 44, 16 + i * 24, 32, 18, j === 1 && i === 0, 2);
      }
      break;
    case "page":
      line(10, 10, 40, 10, true);
      line(90, 10, 132, 10);
      line(10, 30, 62, 30, true);
      line(10, 40, 56, 40, true);
      line(10, 52, 64, 52);
      rect(10, 60, 30, 9, true, 4.5);
      rect(74, 24, 58, 44, true, 3);
      for (let j = 0; j < 3; j++) rect(10 + j * 42, 78, 38, 16, false, 2);
      break;
    case "split":
      rect(8, 8, 60, 84, false, 3);
      rect(74, 8, 60, 84, false, 3);
      rect(14, 14, 16, 9, true, 4.5);
      rect(80, 14, 16, 9, true, 4.5);
      for (let i = 0; i < 5; i++) {
        line(14, 34 + i * 11, 60 - (i % 2) * 10, 34 + i * 11);
        line(80, 34 + i * 11, 126 - (i % 2) * 10, 34 + i * 11);
      }
      break;
    case "form":
      line(10, 12, 58, 12, true);
      for (let i = 0; i < 3; i++) {
        line(10, 28 + i * 20, 34, 28 + i * 20);
        rect(10, 32 + i * 20, 122, 10, false, 2);
      }
      rect(92, 88, 40, 9, true, 4.5);
      break;
  }
  return `<svg viewBox="0 0 142 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${o.join("")}</svg>`;
}

const SLOTS_DESKTOP: Slot[] = [
  { a: 206, rotY: 24, rotZ: -3, text: "above", bend: -1 },
  { a: 150, rotY: 22, rotZ: 2, text: "below", bend: 1 },
  { a: 8, rotY: -24, rotZ: 2, text: "above", bend: -1 },
];
const SLOTS_MOBILE: Slot[] = [
  { a: 222, rotY: 18, rotZ: -4 },
  { a: 140, rotY: 18, rotZ: 3 },
  { a: -14, rotY: -18, rotZ: 3 },
];

export function fitVars(
  el: HTMLElement,
  size: [number, number],
  focus: { x: number; y: number; zoom: number },
) {
  const ar = size[0] / size[1];
  const halfH = 0.5 * focus.zoom;
  const halfW = halfH / ar;
  const w = 100 / (2 * halfW);
  const h = 100 / (2 * halfH);
  el.style.setProperty("--w", `${w}%`);
  el.style.setProperty("--h", `${h}%`);
  el.style.setProperty("--l", `${50 - focus.x * w}%`);
  el.style.setProperty("--t", `${50 - focus.y * h}%`);
}

function fitOf(p: StageProject) {
  const ar = p.size[0] / p.size[1];
  const halfH = 0.5 * p.focus.zoom;
  return [halfH / ar, halfH, p.focus.x, p.focus.y];
}

function samplePaper(img: HTMLImageElement): [number, number, number] {
  try {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    const ctx = c.getContext("2d");
    if (!ctx) return [0.98, 0.97, 0.95];
    ctx.drawImage(
      img,
      0,
      0,
      img.naturalWidth,
      img.naturalHeight * 0.08,
      0,
      0,
      8,
      8,
    );
    const d = ctx.getImageData(0, 7, 1, 1).data;
    const e = ctx.getImageData(7, 7, 1, 1).data;
    return [
      ((d[0] ?? 250) + (e[0] ?? 250)) / 510,
      ((d[1] ?? 247) + (e[1] ?? 247)) / 510,
      ((d[2] ?? 242) + (e[2] ?? 242)) / 510,
    ];
  } catch {
    return [0.98, 0.97, 0.95];
  }
}

export function mountHorizonteStage(hero: HTMLElement) {
  const dataEl = hero.querySelector<HTMLScriptElement>(
    "script[data-hz-stage-data]",
  );
  const stage = hero.querySelector<HTMLElement>("[data-hz-stage]");
  const lensEl = hero.querySelector<HTMLElement>("[data-hz-lens]");
  const tabsEl = hero.querySelector<HTMLElement>("[data-hz-tabs]");
  const captionEl = hero.querySelector<HTMLElement>("[data-hz-caption]");
  const ctaEl = hero.querySelector<HTMLAnchorElement>("[data-hz-cta]");
  const announceEl = hero.querySelector<HTMLElement>("[data-hz-announce]");
  const orbitsSvg = hero.querySelector<SVGSVGElement>("[data-hz-orbits]");
  if (
    !dataEl ||
    !stage ||
    !lensEl ||
    !tabsEl ||
    !captionEl ||
    !ctaEl ||
    !announceEl ||
    !orbitsSvg
  )
    return;
  const canvas = lensEl.querySelector("canvas");
  if (!canvas) return;

  const data = JSON.parse(dataEl.textContent ?? "{}") as StageData;
  const P = data.projects;
  const N = P.length;
  if (!N) return;

  const statusEl = captionEl.querySelector<HTMLElement>(".status");
  const purposeEl = captionEl.querySelector<HTMLElement>(".purpose");
  const tabs = Array.from(
    tabsEl.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
  const beadEls = Array.from(
    orbitsSvg.querySelectorAll<SVGCircleElement>(".bead"),
  );
  const connectorEls = Array.from(
    orbitsSvg.querySelectorAll<SVGPathElement>(".connector"),
  );
  const orbitEls = Array.from(
    orbitsSvg.querySelectorAll<SVGEllipseElement>(".orbit"),
  );
  const ghosts: GhostState[] = Array.from(
    hero.querySelectorAll<HTMLElement>(".hz-ghost"),
  ).map((el) => ({
    el,
    pt: [0, 0],
    scale: 1,
    c: [0, 0],
  }));
  const parts: PartEl[] = Array.from(
    hero.querySelectorAll<HTMLElement>(".hz-part"),
  ).map((el) => ({
    el,
    dot: el.querySelector<HTMLElement>(".dot")!,
    text: el.querySelector<HTMLElement>(".text")!,
    name: el.querySelector<HTMLElement>(".name")!,
    ver: el.querySelector<HTMLElement>(".ver")!,
    left: undefined,
    w: 0,
    h: 0,
  }));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mqMobile = window.matchMedia("(max-width: 760px)");

  let lens: Lens | null = null;
  let glOn = false;
  let current = Math.max(0, Number(stage.dataset.initial ?? 0)) % N;
  let requested = current;
  let pending: number | null = null;
  let tr: Transition | null = null;
  let raf = 0;
  let inView = true;
  const start = performance.now();
  const pointer = [0, 0];
  let pointerTarget = [0, 0];
  const paper: Array<[number, number, number] | undefined> = [];
  let geo: {
    W: number;
    H: number;
    cx: number;
    cy: number;
    R: number;
    mobile: boolean;
    rx: number;
    ry: number;
    tilt: number;
    slots: Slot[];
    gw: number;
    gh: number;
    padL: number;
    padR: number;
    beads: number[][];
    dpr: number;
  } | null = null;

  const motionOK = () => !reducedMotion.matches;

  const images = P.map((p, i) => {
    const img = new Image();
    img.decoding = "async";
    const ready = new Promise<void>((resolve) => {
      img.onload = () => {
        paper[i] = samplePaper(img);
        resolve();
      };
      img.onerror = () => resolve();
    });
    img.src = p.texture;
    return { img, ready };
  });

  function measure() {
    if (!stage || !lensEl) return;
    const sr = stage.getBoundingClientRect();
    const lr = lensEl.getBoundingClientRect();
    const mobile = mqMobile.matches;
    const R = lr.width / 2;
    const sets = mobile
      ? [
          [1.14, 1.1, 0],
          [1.34, 1.3, 0],
          [0, 0, 0],
        ]
      : [
          [1.86, 0.88, -6],
          [1.38, 1.12, 4],
          [2.2, 1.02, -2],
        ];
    const firstGhost = ghosts[0]?.el;
    geo = {
      W: sr.width,
      H: sr.height,
      cx: lr.left - sr.left + R,
      cy: lr.top - sr.top + R,
      R,
      mobile,
      rx: mobile ? 1.14 * R : 1.86 * R,
      ry: mobile ? 1.1 * R : 0.88 * R,
      tilt: mobile ? 0 : (-6 * Math.PI) / 180,
      slots: mobile ? SLOTS_MOBILE : SLOTS_DESKTOP,
      gw: firstGhost?.offsetWidth ?? 0,
      gh: firstGhost?.offsetHeight ?? 0,
      padL: sr.left,
      padR: document.documentElement.clientWidth - sr.right,
      beads: sets,
      dpr: Math.min(
        window.devicePixelRatio || 1,
        mobile || matchMedia("(pointer: coarse)").matches ? 1 : 1.5,
      ),
    };
    for (const part of parts) part.w = 0;
    orbitsSvg?.setAttribute("viewBox", `0 0 ${geo.W} ${geo.H}`);
    orbitEls.forEach((el, i) => {
      const s = sets[i] ?? [0, 0, 0];
      el.setAttribute("cx", String(geo!.cx));
      el.setAttribute("cy", String(geo!.cy));
      el.setAttribute("rx", String(Math.max(0, (s[0] ?? 0) * R)));
      el.setAttribute("ry", String(Math.max(0, (s[1] ?? 0) * R)));
      el.setAttribute(
        "transform",
        `rotate(${s[2] ?? 0} ${geo!.cx} ${geo!.cy})`,
      );
      el.style.display = s[0] ? "" : "none";
    });
    if (lens && canvas)
      lens.resize(
        canvas.getBoundingClientRect().width || R * 2 * 1.36,
        geo.dpr,
      );
  }

  function orbitPoint(angleDeg: number): [number, number] {
    const g = geo!;
    const a = (angleDeg * Math.PI) / 180;
    const x = g.rx * Math.cos(a);
    const y = g.ry * Math.sin(a);
    const c = Math.cos(g.tilt);
    const s = Math.sin(g.tilt);
    return [g.cx + x * c - y * s, g.cy + x * s + y * c];
  }

  function progress(now: number) {
    if (!tr || tr.waiting) return null;
    return clamp((now - tr.t0) / tr.dur, 0, 1);
  }

  function lensState(x: number | null) {
    if (x == null) return { pulse: 0, mix: 0, tintMix: 0, scale: 1, labels: 1 };
    const pulse =
      x < 0.32
        ? easeInOutSine(x / 0.32)
        : x < 0.6
          ? 1
          : 1 - easeOutCubic((x - 0.6) / 0.4);
    const mix = easeInOutCubic(seg(x, 0.28, 0.62));
    const tintMix = easeInOutSine(seg(x, 0.2, 0.75));
    let scale: number;
    if (x < 0.32) scale = 1 + 0.038 * easeInOutSine(x / 0.32);
    else if (x < 0.6) scale = 1.038;
    else {
      const y = (x - 0.6) / 0.4;
      scale = 1 + 0.038 * Math.exp(-4.6 * y) * Math.cos(2 * Math.PI * 1.15 * y);
    }
    const labels =
      x < 0.22
        ? 1 - easeInCubic(x / 0.22)
        : x < 0.62
          ? 0
          : easeOutCubic((x - 0.62) / 0.38);
    return { pulse, mix, tintMix, scale, labels };
  }

  function ghostOffset(x: number | null, i: number, dir: number) {
    if (x == null) return { off: 0, op: 1 };
    const xi = clamp((x - i * 0.035) / 0.93, 0, 1);
    const D = 30;
    if (xi < SWAP_AT) {
      const t = xi / SWAP_AT;
      return { off: dir * D * easeInCubic(t), op: 1 - easeInCubic(t) };
    }
    const k = (xi - SWAP_AT) / (1 - SWAP_AT);
    return {
      off: -dir * D * (1 - easeOutBack(k)),
      op: easeOutCubic(clamp(k / 0.5, 0, 1)),
    };
  }

  function frame(now: number) {
    raf = 0;
    const time = (now - start) / 1000;
    const x = progress(now);
    if (tr && x != null && x >= SWAP_AT && !tr.swapped) {
      tr.swapped = true;
      swapContent(tr.to);
    }
    const st = lensState(x);
    const breath = Math.sin(time * 0.9);
    pointer[0] = lerp(pointer[0] ?? 0, pointerTarget[0] ?? 0, 0.06);
    pointer[1] = lerp(pointer[1] ?? 0, pointerTarget[1] ?? 0, 0.06);

    if (glOn && lens && geo) {
      const active = tr && !tr.waiting;
      const a = active ? tr!.from : current;
      const b = active ? tr!.to : current;
      const pa = P[a]!;
      const pb = P[b]!;
      const drawn = lens.render({
        a,
        b,
        time,
        radiusPx: geo.R * geo.dpr * st.scale * (1 + 0.004 * breath),
        fitA: fitOf(pa),
        fitB: fitOf(pb),
        mix: active ? st.mix : 0,
        pulse: st.pulse,
        dir: tr ? tr.dir : 1,
        tintMix: active ? st.tintMix : 0,
        breath,
        tintA: hexToVec(pa.tint),
        tintB: hexToVec(pb.tint),
        paperA: paper[a] ?? [0.98, 0.97, 0.95],
        paperB: paper[b] ?? [0.98, 0.97, 0.95],
        pointer,
      });
      lensEl!.setAttribute("data-gl", drawn ? "on" : "off");
    }

    layoutOrbit(x, st, time);
    if (x === 1) finish();
    if (shouldRun()) raf = requestAnimationFrame(frame);
  }

  function layoutOrbit(
    x: number | null,
    st: ReturnType<typeof lensState>,
    time: number,
  ) {
    const g = geo;
    if (!g) return;
    const dir = tr ? tr.dir : 1;
    ghosts.forEach((ghost, i) => {
      const s = g.slots[i]!;
      const off = ghostOffset(x, i, dir);
      const sway = motionOK() ? Math.sin(time * 0.35 + i * 2.1) * 1.4 : 0;
      const ang = s.a + off.off + sway;
      const pt = orbitPoint(ang);
      const depth = Math.sin((ang * Math.PI) / 180);
      const scale = 1 + 0.07 * depth;
      const px = pt[0] - g.gw / 2 + (pointer[0] ?? 0) * (8 + 4 * depth);
      const py = pt[1] - g.gh / 2 + (pointer[1] ?? 0) * -6;
      ghost.el.style.transform = `translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,0) rotateY(${s.rotY}deg) rotateZ(${s.rotZ}deg) scale(${scale.toFixed(3)})`;
      ghost.el.style.opacity = (0.92 * off.op).toFixed(3);
      ghost.pt = pt;
      ghost.scale = scale;
      ghost.c = [px + g.gw / 2, py + g.gh / 2];
    });

    beadEls.forEach((b, i) => {
      const set = g.beads[i];
      if (!set || !set[0]) {
        b.style.display = "none";
        return;
      }
      b.style.display = "";
      const speed = [0.05, -0.035, 0.028][i] ?? 0.03;
      const ang =
        (motionOK() ? time * speed * 57.3 : 0) +
        ([300, 40, 120][i] ?? 0) +
        st.pulse * 18 * dir;
      const a = (ang * Math.PI) / 180;
      const tilt = ((set[2] ?? 0) * Math.PI) / 180;
      const ex = (set[0] ?? 0) * g.R * Math.cos(a);
      const ey = (set[1] ?? 0) * g.R * Math.sin(a);
      b.setAttribute(
        "cx",
        (g.cx + ex * Math.cos(tilt) - ey * Math.sin(tilt)).toFixed(2),
      );
      b.setAttribute(
        "cy",
        (g.cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)).toFixed(2),
      );
    });

    if (g.mobile) {
      parts.forEach((part, m) => {
        const lp = clamp(st.labels * 1.25 - m * 0.12, 0, 1);
        part.el.style.transform = `translate3d(0,${((1 - lp) * 6).toFixed(2)}px,0)`;
        part.el.style.opacity = lp.toFixed(3);
        if (part.left !== undefined) {
          part.el.removeAttribute("data-side");
          part.left = undefined;
        }
        const connector = connectorEls[m];
        if (connector) connector.style.display = "none";
      });
      return;
    }

    parts.forEach((part, k) => {
      const ghost = ghosts[k];
      const slot = g.slots[k];
      const path = connectorEls[k];
      if (!ghost || !slot || !path) return;
      let ux = ghost.pt[0] - g.cx;
      let uy = ghost.pt[1] - g.cy;
      const ul = Math.hypot(ux, uy) || 1;
      ux /= ul;
      uy /= ul;
      const p0 = [
        g.cx + ux * g.R * st.scale * 1.03,
        g.cy + uy * g.R * st.scale * 1.03,
      ] as const;
      const halfExtent =
        Math.abs(ux) * g.gw * 0.5 * ghost.scale + Math.abs(uy) * g.gh * 0.5;
      const p1 = [
        ghost.pt[0] - ux * (halfExtent + 6),
        ghost.pt[1] - uy * (halfExtent + 6),
      ] as const;
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const bend = (slot.bend ?? 1) * len * 0.16;
      const c = [mx - uy * bend, my + ux * bend] as const;
      path.style.display = "";
      path.setAttribute(
        "d",
        `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`,
      );
      const L = len * 1.04 + 2;
      const lp = clamp(st.labels * 1.15 - k * 0.07, 0, 1);
      path.style.strokeDasharray = `${L} ${L}`;
      path.style.strokeDashoffset = (L * (1 - lp)).toFixed(2);
      const dotIn = easeOutCubic(seg(lp, 0.5, 0.85));
      const textIn = easeOutCubic(seg(lp, 0.6, 1));
      // Labels sit on the ghost's outer side so they cover neither the lens nor the ghost;
      // when the viewport is too narrow they tuck above or below the ghost instead.
      const left = ux < -0.15;
      if (part.left !== left) {
        part.left = left;
        part.el.setAttribute("data-side", left ? "left" : "right");
        part.w = 0;
      }
      if (!part.w) {
        part.w = part.el.offsetWidth;
        part.h = part.el.offsetHeight;
      }
      const gs = ghost.scale;
      const gl = ghost.c[0] - g.gw * 0.5 * gs;
      const gr = ghost.c[0] + g.gw * 0.5 * gs;
      const gt = ghost.c[1] - g.gh * 0.5 * gs;
      const gb = ghost.c[1] + g.gh * 0.5 * gs;
      const gap = 14;
      let lx: number;
      let ly: number;
      if (
        left
          ? gl - gap - part.w >= 16 - g.padL
          : gr + gap + part.w <= g.W + g.padR - 16
      ) {
        lx = left ? gl - gap - part.w : gr + gap;
        ly = ghost.c[1] - part.h / 2;
      } else {
        lx = left ? gr - part.w : gl;
        ly = slot.text === "below" ? gb + 10 : gt - 10 - part.h;
      }
      part.el.style.transform = `translate3d(${lx.toFixed(1)}px,${ly.toFixed(1)}px,0)`;
      part.el.style.opacity = "1";
      part.dot.style.transform = `scale(${dotIn.toFixed(3)})`;
      part.text.style.opacity = textIn.toFixed(3);
      part.text.style.transform = `translate3d(${((1 - textIn) * (left ? 8 : -8)).toFixed(1)}px,0,0)`;
    });
  }

  const shouldRun = () => motionOK() && inView && !document.hidden;
  const kick = () => {
    if (!raf && shouldRun()) raf = requestAnimationFrame(frame);
  };
  const renderStill = () => {
    if (geo) layoutOrbit(null, lensState(null), 0);
  };

  function select(target: number, dirHint?: number) {
    const i = (target + N) % N;
    const dir = dirHint ?? (i > requested ? 1 : -1);
    requested = i;
    updateTabs(i);
    ctaEl!.href = P[i]!.href;

    if (!motionOK()) {
      tr = null;
      pending = null;
      if (i !== current) {
        current = i;
        swapContent(i);
        crossfadeDom(i);
      }
      renderStill();
      return;
    }

    const x = progress(performance.now());
    if (!tr) {
      if (i === current) return;
      begin(current, i, dir);
    } else if (tr.waiting || (x != null && x < RETARGET_BEFORE)) {
      tr.to = i;
      tr.dir = dir;
      pending = null;
      if (!glOn) domPrepare(i);
      void images[i]!.ready.then(() => {
        if (tr && tr.waiting && tr.to === i) {
          tr.waiting = false;
          tr.t0 = performance.now();
          kick();
        }
      });
    } else {
      pending = i === tr.to ? null : i;
    }
  }

  function begin(from: number, to: number, dir: number, dur = DURATION) {
    tr = { from, to, dir, dur, t0: 0, waiting: true, swapped: false };
    if (!glOn) domPrepare(to);
    lensEl!.classList.remove("inhale");
    void images[to]!.ready.then(() => {
      if (!tr || tr.to !== to) return;
      tr.waiting = false;
      tr.t0 = performance.now();
      if (!glOn) domRun();
      kick();
    });
    kick();
  }

  function finish() {
    const done = tr!;
    tr = null;
    current = done.to;
    if (!done.swapped) swapContent(current);
    domSettle(current);
    announce(current);
    if (pending != null && pending !== current) {
      const next = pending;
      pending = null;
      begin(current, next, next > current ? 1 : -1, 780);
    } else {
      pending = null;
    }
  }

  function swapContent(i: number) {
    const p = P[i]!;
    document.documentElement.style.setProperty("--wash", p.tint);
    captionEl!.setAttribute("data-swap", "out");
    window.setTimeout(
      () => {
        if (statusEl) statusEl.textContent = `${p.name} · ${p.status}`;
        if (purposeEl) purposeEl.textContent = p.short;
        captionEl!.setAttribute("data-swap", "in");
      },
      motionOK() ? 160 : 0,
    );
    parts.forEach((part, k) => {
      const spec = p.parts[k];
      const ghost = ghosts[k];
      if (!spec || !ghost) return;
      ghost.el.innerHTML = ghostSVG(spec.kind, k, p.tint);
      ghost.el.setAttribute("data-stage", String(k));
      part.name.textContent = spec.label;
      part.w = 0;
      part.ver.textContent = data.versions[k] ?? "";
      part.dot.style.setProperty("--dot", data.dots[k] ?? "#FCE3A6");
    });
    stage!.setAttribute("aria-labelledby", tabs[i]?.id ?? "");
  }

  function announce(i: number) {
    const p = P[i]!;
    announceEl!.textContent = `${p.name}. ${p.short}`;
  }

  function updateTabs(i: number) {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (geo?.mobile) {
      const t = tabs[i];
      if (t)
        tabsEl!.scrollTo({
          left: t.offsetLeft - (tabsEl!.clientWidth - t.offsetWidth) / 2,
          behavior: motionOK() ? "smooth" : "auto",
        });
    }
  }

  /* ---------- DOM lens: poster, accessible image, no-WebGL and reduced-motion fallback ---------- */

  function domLayers() {
    const ls = lensEl!.querySelectorAll<HTMLElement>(".layer");
    const first = ls[0]!;
    const second = ls[1]!;
    const cur = first.classList.contains("incoming") ? second : first;
    const inc = cur === first ? second : first;
    return { cur, inc };
  }
  function setLayerImage(layer: HTMLElement, i: number, withAlt: boolean) {
    const img = layer.querySelector("img");
    const p = P[i]!;
    if (!img) return;
    img.dataset.i = String(i);
    img.src = p.texture;
    img.alt = withAlt ? p.alt : "";
    fitVars(layer, p.size, p.focus);
  }
  function domPrepare(i: number) {
    const { inc } = domLayers();
    inc.classList.remove("reveal");
    inc.style.clipPath = "";
    inc.style.opacity = "";
    setLayerImage(inc, i, false);
  }
  function domRun() {
    const { cur, inc } = domLayers();
    lensEl!.classList.remove("inhale");
    void lensEl!.offsetWidth;
    lensEl!.classList.add("inhale");
    window.setTimeout(() => {
      inc.classList.add("reveal");
      cur.classList.add("outgoing", "leave");
    }, 280);
  }
  function domSettle(i: number) {
    const { cur, inc } = domLayers();
    const incImg = inc.querySelector("img");
    if (
      !glOn &&
      incImg &&
      Number(incImg.dataset.i) === i &&
      inc.classList.contains("reveal")
    ) {
      inc.classList.remove("incoming", "reveal");
      incImg.alt = P[i]!.alt;
      cur.classList.remove("outgoing", "leave");
      cur.classList.add("incoming");
      const curImg = cur.querySelector("img");
      if (curImg) curImg.alt = "";
    } else {
      setLayerImage(cur, i, true);
    }
    lensEl!.classList.remove("inhale");
  }
  function crossfadeDom(i: number) {
    const { cur, inc } = domLayers();
    setLayerImage(inc, i, false);
    inc.style.clipPath = "none";
    inc.style.opacity = "0";
    inc.classList.add("fade");
    void inc.offsetWidth;
    inc.style.opacity = "1";
    window.setTimeout(() => {
      inc.classList.remove("incoming", "fade");
      inc.style.clipPath = "";
      inc.style.opacity = "";
      const incImg = inc.querySelector("img");
      if (incImg) incImg.alt = P[i]!.alt;
      cur.classList.add("incoming");
      const curImg = cur.querySelector("img");
      if (curImg) curImg.alt = "";
      announce(i);
    }, 200);
  }

  /* ---------- WebGL lifecycle ---------- */

  function startGL() {
    if (lens || !motionOK() || !canvas) return;
    lens = createLens(canvas, {
      onLost: () => {
        glOn = false;
        lensEl!.setAttribute("data-gl", "off");
      },
      onRestored: () => {
        glOn = true;
        kick();
      },
    });
    if (!lens) {
      glOn = false;
      lensEl!.setAttribute("data-gl", "off");
      return;
    }
    glOn = true;
    lensEl!.setAttribute("data-renderer", `webgl${lens.version}`);
    images.forEach((im, i) => {
      void im.ready.then(() => {
        if (lens && im.img.naturalWidth) lens.addTexture(i, im.img);
        kick();
      });
    });
    measure();
  }
  function stopGL() {
    if (!lens) return;
    lens.destroy();
    lens = null;
    glOn = false;
    lensEl!.setAttribute("data-gl", "off");
    lensEl!.removeAttribute("data-renderer");
  }

  /* ---------- Input ---------- */

  tabs.forEach((tab, i) => tab.addEventListener("click", () => select(i)));
  tabsEl.addEventListener("keydown", (event) => {
    const map: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    let i: number;
    let dir: number;
    if (event.key in map) {
      dir = map[event.key]!;
      i = requested + dir;
    } else if (event.key === "Home") {
      i = 0;
      dir = -1;
    } else if (event.key === "End") {
      i = N - 1;
      dir = 1;
    } else return;
    event.preventDefault();
    i = (i + N) % N;
    select(i, dir);
    tabs[i]?.focus();
  });
  stage.addEventListener("keydown", (event) => {
    if (event.target !== stage) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      select(requested + 1, 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      select(requested - 1, -1);
    }
  });

  let sx = 0;
  let sy = 0;
  let sid: number | null = null;
  stage.addEventListener("pointerdown", (event) => {
    sid = event.pointerId;
    sx = event.clientX;
    sy = event.clientY;
  });
  stage.addEventListener("pointerup", (event) => {
    if (event.pointerId !== sid) return;
    sid = null;
    const dx = event.clientX - sx;
    const dy = event.clientY - sy;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      const dir = dx < 0 ? 1 : -1;
      select(requested + dir, dir);
    }
  });
  stage.addEventListener("pointercancel", () => {
    sid = null;
  });

  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const r = hero.getBoundingClientRect();
    pointerTarget = [
      clamp(((event.clientX - r.left) / r.width) * 2 - 1, -1, 1),
      clamp(-(((event.clientY - r.top) / r.height) * 2 - 1), -1, 1),
    ];
  });
  hero.addEventListener("pointerleave", () => {
    pointerTarget = [0, 0];
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      kick();
    }).observe(hero);
  }
  document.addEventListener("visibilitychange", kick);

  reducedMotion.addEventListener("change", () => {
    if (motionOK()) {
      startGL();
      kick();
      return;
    }
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (tr) {
      const to = tr.to;
      tr = null;
      current = to;
      swapContent(to);
    }
    pending = null;
    stopGL();
    domSettle(current);
    renderStill();
  });

  new ResizeObserver(() => {
    measure();
    renderStill();
    kick();
  }).observe(stage);
  if (document.fonts?.ready) {
    void document.fonts.ready.then(() => {
      measure();
      renderStill();
    });
  }

  /* ---------- Boot ---------- */

  const layers = lensEl.querySelectorAll<HTMLElement>(".layer");
  if (layers[0]) setLayerImage(layers[0], current, true);
  if (layers[1]) setLayerImage(layers[1], (current + 1) % N, false);
  updateTabs(current);
  swapContent(current);
  captionEl.setAttribute("data-swap", "in");
  ctaEl.href = P[current]!.href;
  measure();
  startGL();
  renderStill();
  kick();
}
