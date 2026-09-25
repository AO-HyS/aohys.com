/*
  Living lenses for interior pages. The same refractive sphere as the home
  page, looking at one photograph that drifts slowly under the glass, or at a
  set of images it cycles through with the home's inhale/swirl/resolve
  transition. Reduced motion or no WebGL: the circle shows the first image.
*/
import { createLens, hexToVec, type Lens } from "./horizonte-lens";

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
  if (!glCanvas) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const images: LensImage[] = el.dataset.images
    ? (JSON.parse(el.dataset.images) as LensImage[])
    : [];
  if (images.length === 0) return;

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
      // A single photograph drifts slowly under the glass so the lens never reads as a still.
      const drift = (image: LensImage | undefined): LensImage | undefined =>
        image && images.length === 1
          ? {
              ...image,
              focus: {
                x: image.focus.x + Math.sin(time * 0.11) * 0.035,
                y: image.focus.y + Math.cos(time * 0.08) * 0.03,
                zoom: image.focus.zoom * (1 + 0.035 * Math.sin(time * 0.06)),
              },
            }
          : image;
      const imgA = drift(images[a]);
      const imgB = drift(images[b]);
      const drawn = lens.render({
        a,
        b,
        time,
        radiusPx: (size / 2) * dpr * scale * (1 + 0.006 * breath),
        fitA: fitOf(imgA!.size, imgA!.focus),
        fitB: fitOf(imgB!.size, imgB!.focus),
        mix,
        pulse: pulse + 0.06 + 0.04 * breath,
        dir: 1,
        tintMix: mix,
        breath,
        tintA: hexToVec(imgA!.tint),
        tintB: hexToVec(imgB!.tint),
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
