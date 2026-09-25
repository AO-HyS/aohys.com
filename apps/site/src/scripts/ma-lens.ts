/*
  Living lenses for interior pages. The same refractive sphere as the home
  page, looking either at an animated illustration drawn on a 2D canvas each
  frame, or at a set of product images it cycles through with the home's
  inhale/swirl/resolve transition. Reduced motion or no WebGL: the circle shows
  the illustration (one still frame) or the first image.
*/
import { createLens, hexToVec, type Lens } from "./horizonte-lens";

const INK = "#473C33";
const HONEY = "#FCE3A6";
const OLIVE = "#D6E2B4";
const APRICOT = "#FDD2B1";
const HONEY_FULL = "#FEC868";
const BRASS = "#C9A96A";
const PAPER = "#FBF8F3";
const SIZE = 640;

type Scene = (ctx: CanvasRenderingContext2D, t: number) => void;

interface LensImage {
  src: string;
  size: [number, number];
  focus: { x: number; y: number; zoom: number };
  tint: string;
  alt: string;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (t: number) => -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const seg = (x: number, a: number, b: number) => clamp((x - a) / (b - a), 0, 1);

/* ---------- Shared painting ---------- */

let leafLayer: HTMLCanvasElement | null = null;
function leaves() {
  if (leafLayer) return leafLayer;
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const g = c.getContext("2d");
  if (!g) return c;
  g.filter = "blur(14px)";
  g.fillStyle = INK;
  g.translate(SIZE * 0.12, SIZE * 0.2);
  g.rotate(-0.35);
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(160, -50, 330, -20);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    g.save();
    g.translate(30 + i * 38, -10 - Math.sin(i) * 12);
    g.rotate(i % 2 ? 0.6 : -0.7);
    g.beginPath();
    g.ellipse(0, 0, 44, 13, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  leafLayer = c;
  return c;
}

function paper(ctx: CanvasRenderingContext2D, wash: string) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const grad = ctx.createRadialGradient(
    SIZE * 0.42,
    SIZE * 0.36,
    20,
    SIZE * 0.5,
    SIZE * 0.5,
    SIZE * 0.7,
  );
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.55, `${wash}55`);
  grad.addColorStop(1, `${wash}aa`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function shade(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.translate(Math.sin(t * 0.21) * 14, Math.cos(t * 0.17) * 10);
  ctx.rotate(Math.sin(t * 0.13) * 0.03);
  ctx.drawImage(leaves(), 0, 0);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function softShadow(ctx: CanvasRenderingContext2D, blur: number, y: number) {
  ctx.shadowColor = "rgba(71,60,51,0.18)";
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = y;
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/* ---------- Scenes ---------- */

/* Career: seven roles on one line light up in turn; the founder band runs beneath. */
const resume: Scene = (ctx, t) => {
  paper(ctx, OLIVE);
  const n = 7;
  const x0 = 120;
  const x1 = SIZE - 120;
  const yAt = (x: number) =>
    300 - Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 26;
  ctx.strokeStyle = "rgba(71,60,51,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 4)
    x === x0 ? ctx.moveTo(x, yAt(x)) : ctx.lineTo(x, yAt(x));
  ctx.stroke();
  const cycle = (t * 1.1) % (n + 3);
  const colors = [HONEY, OLIVE, APRICOT];
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / (n - 1);
    const y = yAt(x);
    const on = cycle > i;
    const k = clamp(cycle - i, 0, 1);
    if (on && cycle - i < 1.6) {
      ctx.strokeStyle = `rgba(71,60,51,${0.35 * (1 - k)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 14 + k * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
    softShadow(ctx, 10, 3);
    ctx.fillStyle = on ? colors[i % 3]! : "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 11 + easeOutCubic(k) * 5, 0, Math.PI * 2);
    ctx.fill();
    clearShadow(ctx);
    ctx.strokeStyle = "rgba(71,60,51,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(71,60,51,0.28)";
    roundRect(ctx, x - 22, y + 34, 44, 5, 3);
    ctx.fill();
    roundRect(ctx, x - 14, y + 46, 28, 4, 2);
    ctx.fill();
  }
  const band = easeOutCubic(clamp(cycle / n, 0, 1));
  const grad = ctx.createLinearGradient(x0, 0, x1, 0);
  grad.addColorStop(0, OLIVE);
  grad.addColorStop(0.5, HONEY);
  grad.addColorStop(1, APRICOT);
  ctx.fillStyle = grad;
  roundRect(ctx, x0, 420, (x1 - x0) * band, 12, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(71,60,51,0.35)";
  roundRect(ctx, x0, 446, 70, 5, 3);
  ctx.fill();
  shade(ctx, t);
};

/* Practice: pastel blocks drift apart and assemble into one balanced system. */
const practice: Scene = (ctx, t) => {
  paper(ctx, "#E7E6B0");
  const phase = ease((Math.sin(t * 0.55) + 1) / 2);
  const blocks = [
    { x: 250, y: 360, w: 150, h: 70, c: HONEY, dx: -120, dy: 60 },
    { x: 260, y: 290, w: 60, h: 70, c: OLIVE, dx: -150, dy: -90 },
    { x: 330, y: 290, w: 60, h: 70, c: APRICOT, dx: 130, dy: -110 },
    { x: 220, y: 430, w: 210, h: 34, c: "#EFE6D8", dx: 20, dy: 120 },
    {
      x: 295,
      y: 210,
      w: 60,
      h: 80,
      c: HONEY_FULL,
      dx: 150,
      dy: 40,
      round: true,
    },
  ];
  for (const [i, b] of blocks.entries()) {
    const k = 1 - phase;
    const bob = Math.sin(t * 1.3 + i) * 4 * k;
    const x = b.x + b.dx * k;
    const y = b.y + b.dy * k + bob;
    const rot = (i % 2 ? 0.18 : -0.14) * k;
    ctx.save();
    ctx.translate(x + b.w / 2, y + b.h / 2);
    ctx.rotate(rot);
    softShadow(ctx, 18, 8);
    ctx.fillStyle = b.c;
    if (b.round) {
      ctx.beginPath();
      ctx.ellipse(0, 0, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    } else {
      roundRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 8);
    }
    ctx.fill();
    clearShadow(ctx);
    ctx.strokeStyle = "rgba(71,60,51,0.28)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    roundRect(ctx, -b.w / 2 + 6, -b.h / 2 + 5, b.w - 12, 5, 3);
    ctx.fill();
    ctx.restore();
  }
  shade(ctx, t);
};

/* Contact: two voices orbit each other; each speaks in turn with a soft ripple. */
const contact: Scene = (ctx, t) => {
  paper(ctx, HONEY);
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 10;
  const a = t * 0.45;
  const r = 110;
  const p1 = [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55] as const;
  const p2 = [cx - Math.cos(a) * r, cy - Math.sin(a) * r * 0.55] as const;
  ctx.strokeStyle = "rgba(71,60,51,0.35)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 7]);
  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.quadraticCurveTo(cx, cy - 60 * Math.cos(a * 2), p2[0], p2[1]);
  ctx.stroke();
  ctx.setLineDash([]);
  const speaker = Math.floor(t / 2.2) % 2;
  const k = (t % 2.2) / 2.2;
  const src = speaker === 0 ? p1 : p2;
  for (let j = 0; j < 3; j++) {
    const kk = (k + j * 0.22) % 1;
    ctx.strokeStyle = `rgba(71,60,51,${0.28 * (1 - kk)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(src[0], src[1], 40 + kk * 90, 0, Math.PI * 2);
    ctx.stroke();
  }
  const drawVoice = (
    p: readonly [number, number],
    color: string,
    active: boolean,
  ) => {
    const grad = ctx.createRadialGradient(
      p[0] - 14,
      p[1] - 16,
      4,
      p[0],
      p[1],
      46,
    );
    grad.addColorStop(0, "#fff");
    grad.addColorStop(0.45, color);
    grad.addColorStop(1, color);
    softShadow(ctx, 22, 10);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(
      p[0],
      p[1],
      active ? 44 + Math.sin(t * 6) * 1.5 : 40,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    clearShadow(ctx);
    ctx.strokeStyle = "rgba(71,60,51,0.25)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  };
  drawVoice(p1, HONEY_FULL, speaker === 0);
  drawVoice(p2, APRICOT, speaker === 1);
  shade(ctx, t);
};

/* Privacy: an envelope rests behind frosted glass; a slow sheen crosses; a small lock waits in front. */
let frostLayer: HTMLCanvasElement | null = null;
const privacy: Scene = (ctx, t) => {
  paper(ctx, APRICOT);
  if (!frostLayer) {
    frostLayer = document.createElement("canvas");
    frostLayer.width = SIZE;
    frostLayer.height = SIZE;
  }
  const f = frostLayer.getContext("2d");
  if (f) {
    f.clearRect(0, 0, SIZE, SIZE);
    f.filter = "blur(9px)";
    const dy = Math.sin(t * 0.6) * 6;
    f.fillStyle = APRICOT;
    f.fillRect(190, 220 + dy, 260, 170);
    f.strokeStyle = "rgba(71,60,51,0.55)";
    f.lineWidth = 5;
    f.beginPath();
    f.moveTo(190, 220 + dy);
    f.lineTo(320, 320 + dy);
    f.lineTo(450, 220 + dy);
    f.stroke();
    f.fillStyle = HONEY_FULL;
    f.beginPath();
    f.arc(320, 322 + dy, 16, 0, Math.PI * 2);
    f.fill();
    f.filter = "none";
  }
  ctx.drawImage(frostLayer, 0, 0);
  softShadow(ctx, 30, 12);
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  roundRect(ctx, 150, 170, 340, 270, 18);
  ctx.fill();
  clearShadow(ctx);
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  roundRect(ctx, 150, 170, 340, 270, 18);
  ctx.clip();
  const sx = ((t * 70) % 760) - 220;
  const sheen = ctx.createLinearGradient(sx, 0, sx + 140, 140);
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.55)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();
  const ly = 470 + Math.sin(t * 1.1) * 3;
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(320, ly - 6, 20, Math.PI, 0);
  ctx.stroke();
  softShadow(ctx, 12, 5);
  ctx.fillStyle = BRASS;
  roundRect(ctx, 292, ly - 6, 56, 44, 8);
  ctx.fill();
  clearShadow(ctx);
  ctx.fillStyle = "rgba(71,60,51,0.6)";
  ctx.beginPath();
  ctx.arc(320, ly + 12, 5, 0, Math.PI * 2);
  ctx.fill();
  shade(ctx, t);
};

/* Architecture: five translucent layers breathe apart and settle back together on brass pins. */
const architecture: Scene = (ctx, t) => {
  paper(ctx, HONEY);
  const cx = SIZE / 2;
  const colors = [APRICOT, HONEY, OLIVE, HONEY, APRICOT];
  const spread = 34 + ease((Math.sin(t * 0.5) + 1) / 2) * 30;
  const n = 5;
  const w = 150;
  const h = 62;
  const baseY = SIZE / 2 + ((n - 1) * spread) / 2;
  const corners = (y: number) => [
    [cx, y - h],
    [cx + w, y],
    [cx, y + h],
    [cx - w, y],
  ];
  const tops = Array.from({ length: n }, (_, i) => baseY - i * spread);
  for (const [px, py] of corners(0)) {
    ctx.strokeStyle = BRASS;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px!, tops[0]! + py!);
    ctx.lineTo(px!, tops[n - 1]! + py!);
    ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const y = tops[i]! + Math.sin(t * 1.2 + i * 0.7) * 2;
    const pts = corners(y);
    softShadow(ctx, 16, 8);
    ctx.fillStyle = `${colors[i]}cc`;
    ctx.beginPath();
    pts.forEach(([x, yy], k) =>
      k ? ctx.lineTo(x!, yy!) : ctx.moveTo(x!, yy!),
    );
    ctx.closePath();
    ctx.fill();
    clearShadow(ctx);
    ctx.strokeStyle = "rgba(71,60,51,0.35)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.moveTo(pts[3]![0]!, pts[3]![1]!);
    ctx.lineTo(pts[0]![0]!, pts[0]![1]!);
    ctx.lineTo(pts[1]![0]!, pts[1]![1]!);
    ctx.stroke();
    for (const [px, py] of pts) {
      ctx.fillStyle = BRASS;
      ctx.beginPath();
      ctx.arc(px!, py!, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  shade(ctx, t);
};

const SCENES: Record<string, { draw: Scene; tint: string }> = {
  resume: { draw: resume, tint: OLIVE },
  practice: { draw: practice, tint: "#E7E6B0" },
  contact: { draw: contact, tint: HONEY },
  privacy: { draw: privacy, tint: APRICOT },
  architecture: { draw: architecture, tint: HONEY },
};

/* ---------- Mount ---------- */

function fitOf(
  size: [number, number],
  focus: { x: number; y: number; zoom: number },
) {
  const ar = size[0] / size[1];
  const halfH = 0.5 * focus.zoom;
  return [halfH / ar, halfH, focus.x, focus.y];
}

export function mountMaLens(el: HTMLElement) {
  const glCanvas = el.querySelector<HTMLCanvasElement>("canvas[data-gl]");
  const dom = el.querySelector<HTMLElement>(".ma-lens-dom");
  if (!glCanvas || !dom) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sceneSpec = el.dataset.scene ? SCENES[el.dataset.scene] : undefined;
  const images: LensImage[] = el.dataset.images
    ? (JSON.parse(el.dataset.images) as LensImage[])
    : [];
  if (!sceneSpec && images.length === 0) return;

  const art = document.createElement("canvas");
  art.width = SIZE;
  art.height = SIZE;
  const artCtx = art.getContext("2d");
  if (sceneSpec && artCtx) {
    art.className = "art";
    art.setAttribute("aria-hidden", "true");
    dom.prepend(art);
    sceneSpec.draw(artCtx, 3.2);
  }

  let lens: Lens | null = null;
  let raf = 0;
  let inView = true;
  const start = performance.now();
  const pointer = [0, 0];
  let target = [0, 0];
  let current = 0;
  let tr: { from: number; to: number; t0: number } | null = null;
  let nextAt = 5200;
  const loaded: boolean[] = [];

  const motionOK = () => !reduced.matches;
  const running = () => motionOK() && inView && !document.hidden;

  function resize() {
    if (!lens) return;
    const size = el.getBoundingClientRect().width;
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      matchMedia("(pointer: coarse)").matches ? 1 : 1.5,
    );
    lens.resize(size * 1.36, dpr);
    (el as HTMLElement & { _dpr?: number })._dpr = dpr;
  }

  function frame(now: number) {
    raf = 0;
    const time = (now - start) / 1000;
    pointer[0] = pointer[0]! + (target[0]! - pointer[0]!) * 0.06;
    pointer[1] = pointer[1]! + (target[1]! - pointer[1]!) * 0.06;
    if (sceneSpec && artCtx) {
      sceneSpec.draw(artCtx, time);
      lens?.updateTexture(0, art);
    }
    let a = 0;
    let b = 0;
    let mix = 0;
    let pulse = 0;
    let scale = 1;
    if (images.length > 1) {
      const elapsed = now - start;
      if (!tr && elapsed > nextAt && loaded[(current + 1) % images.length]) {
        tr = { from: current, to: (current + 1) % images.length, t0: now };
      }
      if (tr) {
        const x = clamp((now - tr.t0) / 1100, 0, 1);
        a = tr.from;
        b = tr.to;
        mix = easeInOutCubic(seg(x, 0.28, 0.62));
        pulse =
          x < 0.32
            ? ease(x / 0.32)
            : x < 0.6
              ? 1
              : 1 - easeOutCubic((x - 0.6) / 0.4);
        scale =
          x < 0.32
            ? 1 + 0.03 * ease(x / 0.32)
            : x < 0.6
              ? 1.03
              : 1 +
                0.03 *
                  Math.exp(-4.6 * ((x - 0.6) / 0.4)) *
                  Math.cos(2 * Math.PI * 1.15 * ((x - 0.6) / 0.4));
        if (x === 1) {
          current = tr.to;
          tr = null;
          nextAt = now - start + 5200;
          el.style.setProperty("--tint", images[current]!.tint);
        }
      } else {
        a = b = current;
      }
    }
    if (lens) {
      const size = el.getBoundingClientRect().width;
      const dpr = (el as HTMLElement & { _dpr?: number })._dpr ?? 1;
      const breath = Math.sin(time * 0.9);
      const imgA = images[a];
      const imgB = images[b];
      const tintA = sceneSpec ? sceneSpec.tint : imgA!.tint;
      const tintB = sceneSpec ? sceneSpec.tint : imgB!.tint;
      const drawn = lens.render({
        a,
        b,
        time,
        radiusPx: (size / 2) * dpr * scale * (1 + 0.006 * breath),
        fitA: sceneSpec
          ? [0.36, 0.36, 0.5, 0.5]
          : fitOf(imgA!.size, imgA!.focus),
        fitB: sceneSpec
          ? [0.36, 0.36, 0.5, 0.5]
          : fitOf(imgB!.size, imgB!.focus),
        mix,
        pulse: pulse + 0.06 + 0.04 * breath,
        dir: 1,
        tintMix: mix,
        breath,
        tintA: hexToVec(tintA),
        tintB: hexToVec(tintB),
        paperA: [0.984, 0.973, 0.953],
        paperB: [0.984, 0.973, 0.953],
        pointer,
      });
      el.setAttribute("data-gl", drawn ? "on" : "off");
    }
    if (running()) raf = requestAnimationFrame(frame);
  }

  const kick = () => {
    if (!raf && running()) raf = requestAnimationFrame(frame);
  };

  function startGL() {
    if (lens || !motionOK() || !glCanvas) return;
    lens = createLens(glCanvas, {
      onLost: () => el.setAttribute("data-gl", "off"),
      onRestored: kick,
    });
    if (!lens) return;
    resize();
    if (sceneSpec) lens.addTexture(0, art);
    images.forEach((image, i) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        loaded[i] = true;
        lens?.addTexture(i, img);
        kick();
      };
      img.src = image.src;
    });
    kick();
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const nx = (event.clientX - (r.left + r.width / 2)) / (r.width * 1.5);
      const ny = -((event.clientY - (r.top + r.height / 2)) / (r.height * 1.5));
      target = [clamp(nx, -1, 1), clamp(ny, -1, 1)];
    },
    { passive: true },
  );
  new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? true;
    kick();
  }).observe(el);
  new ResizeObserver(resize).observe(el);
  document.addEventListener("visibilitychange", kick);
  reduced.addEventListener("change", () => {
    if (motionOK()) {
      startGL();
      kick();
    } else {
      lens?.destroy();
      lens = null;
      el.setAttribute("data-gl", "off");
    }
  });

  startGL();
}
