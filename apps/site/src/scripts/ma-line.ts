/*
  Ma: one protagonist line that travels through the page's nodes. It runs in
  the gutter beside each block and turns only in the empty band between
  blocks, so it never crosses copy. It draws with scroll and each node fills
  with its pastel as the line reaches it.

  Markup: a container with `.ma`, an empty `<svg class="ma-line">`, and
  anchors marked `data-ma-node` ("before" = gutter left of the element,
  "above" = over its top edge, empty = element centre), optionally inside a
  `data-ma-block` whose bottom bounds the descent, with `data-ma-color`.
*/

const NS = "http://www.w3.org/2000/svg";

interface Anchor {
  x: number;
  y: number;
  bottom: number;
  c: string;
}

export function mountMaLine(container: HTMLElement) {
  const svg = container.querySelector<SVGSVGElement>(":scope > .ma-line");
  if (!svg) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const glow = document.createElementNS(NS, "path");
  glow.setAttribute("class", "glow");
  const ink = document.createElementNS(NS, "path");
  ink.setAttribute("class", "ink");
  svg.append(glow, ink);

  let dots: SVGCircleElement[] = [];
  let samples: Array<[number, number]> = [];
  let total = 0;
  let anchors: Anchor[] = [];
  let ticking = false;

  function layout() {
    const box = container.getBoundingClientRect();
    svg!.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    anchors = Array.from(
      container.querySelectorAll<HTMLElement>("[data-ma-node]"),
    )
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const mode = el.dataset.maNode;
        const block = el.closest<HTMLElement>("[data-ma-block]") ?? el;
        let x = r.left + r.width / 2 - box.left;
        let y = r.top + r.height / 2 - box.top;
        if (mode === "before") {
          x = Math.max(10, r.left - box.left - 28);
          y = r.top - box.top + Math.min(r.height / 2, 22);
        } else if (mode === "above") {
          y = r.top - box.top - 36;
        }
        return {
          x,
          y,
          bottom: block.getBoundingClientRect().bottom - box.top,
          c: el.dataset.maColor ?? "",
        };
      });
    if (anchors.length < 2) return;
    const f = (n: number) => n.toFixed(1);
    const first = anchors[0]!;
    let d = `M${f(first.x)} ${f(first.y)}`;
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1]!;
      const b = anchors[i]!;
      // Descend beside block a, cross sideways only in the empty band between blocks, then descend to b.
      const top = Math.max(a.y, Math.min(a.bottom + 28, b.y - 48));
      const bot = Math.min(b.y, Math.max(top + 40, b.y - 28));
      const band = Math.min(bot - top, 240);
      const y0 = top + (bot - top - band) / 2;
      const y1 = y0 + band;
      if (Math.abs(b.x - a.x) < 1) {
        d += ` L${f(b.x)} ${f(b.y)}`;
        continue;
      }
      d += ` L${f(a.x)} ${f(y0)}`;
      d += ` C${f(a.x)} ${f(y0 + band * 0.55)} ${f(b.x)} ${f(y1 - band * 0.55)} ${f(b.x)} ${f(y1)}`;
      d += ` L${f(b.x)} ${f(b.y)}`;
    }
    glow.setAttribute("d", d);
    ink.setAttribute("d", d);
    total = ink.getTotalLength();
    ink.style.strokeDasharray = `${total} ${total}`;
    glow.style.strokeDasharray = `${total} ${total}`;
    samples = [];
    for (let s = 0; s <= 240; s++) {
      const len = (total * s) / 240;
      samples.push([len, ink.getPointAtLength(len).y]);
    }
    dots.forEach((n) => n.remove());
    dots = anchors.map((p, idx) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "node");
      c.setAttribute("cx", String(p.x));
      c.setAttribute("cy", String(p.y));
      c.setAttribute("r", idx === 0 ? "0" : "5");
      if (p.c) c.style.setProperty("--c", p.c);
      svg!.appendChild(c);
      return c;
    });
    update();
  }

  function lengthAtY(y: number) {
    for (let i = 1; i < samples.length; i++) {
      const b = samples[i]!;
      if (b[1] >= y) {
        const a = samples[i - 1]!;
        const t = (y - a[1]) / Math.max(1, b[1] - a[1]);
        return a[0] + (b[0] - a[0]) * Math.min(1, Math.max(0, t));
      }
    }
    return total;
  }

  function update() {
    ticking = false;
    if (!total) return;
    const reduced = reducedMotion.matches;
    const box = container.getBoundingClientRect();
    const reachY = reduced ? Infinity : window.innerHeight * 0.66 - box.top;
    const len = reduced ? total : lengthAtY(reachY);
    ink.style.strokeDashoffset = String(total - len);
    glow.style.strokeDashoffset = String(total - Math.min(total, len + 40));
    anchors.forEach((p, i) =>
      dots[i]?.setAttribute("data-on", String(reduced || p.y <= reachY)),
    );
  }

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  layout();
  window.addEventListener("scroll", onScroll, { passive: true });
  new ResizeObserver(() => layout()).observe(container);
  if (document.fonts?.ready) void document.fonts.ready.then(layout);
  reducedMotion.addEventListener("change", update);
  window.addEventListener("load", layout);
}

/* Reveal helpers used by the home "How I build" line. */
export function mountInViewFlags(root: ParentNode = document) {
  const targets = Array.from(
    root.querySelectorAll<HTMLElement>("[data-hz-inview]"),
  );
  if (!targets.length) return;
  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.setAttribute("data-on", "true"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-on", "true");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.4 },
  );
  targets.forEach((el) => io.observe(el));
}

/* Only one element may carry the "lens" view-transition name; move it to the orb the visitor clicked. */
export function mountLensViewTransitionSource() {
  const holders = () =>
    document.querySelectorAll<HTMLElement>(".hz-lens, .ma-hero-orb, .hz-orb");
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>("a[data-vt-from]");
    if (!link) return;
    const src = document.querySelector<HTMLElement>(link.dataset.vtFrom ?? "");
    if (!src) return;
    holders().forEach((el) => {
      el.style.viewTransitionName = "none";
    });
    src.style.viewTransitionName = "lens";
  });
  window.addEventListener("pageshow", () => {
    holders().forEach((el) => {
      el.style.viewTransitionName = "";
    });
  });
}
