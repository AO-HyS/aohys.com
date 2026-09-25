/* Shared behaviour: language, menu, header state, view-transition sources, Ma line. */
(function () {
  "use strict";
  window.HZ = window.HZ || {};

  var dict = {
    es: {
      skip: "Saltar al contenido",
      "nav.label": "Principal",
      "nav.work": "Trabajo",
      "nav.method": "Cómo trabajo",
      "nav.career": "Trayectoria",
      "nav.cv": "CV",
      "nav.contact": "Contacto",
      menu: "Menú",
      "lang.label": "Idioma",
      "footer.line": "Alejandro Ortiz Corro · full stack development",
      "footer.note": "Prototipo de diseño Horizonte. No es el sitio publicado.",
      "hero.lede":
        "Ingeniero de software full stack con una base fuerte en frontend. Llevo productos del requisito a la entrega.",
      "hero.cta": "Conoce mi trabajo",
      "tabs.label": "Productos",
      "parts.label": "Partes del producto",
      swipe: "Desliza la lente para cambiar de producto",
      "work.h": "Cinco productos, del requisito a la entrega",
      "work.p":
        "Cada uno empezó con un trabajo concreto que alguien necesitaba resolver. Esto es lo que resuelve y lo que construí.",
      "work.case": "Ver caso",
      "how.h": "Fallar rápido, aprender, volver a hacer",
      "how.p1":
        "Prefiero poner algo real frente a las personas pronto. Cada intento me enseña qué entendí mal; lo corrijo y vuelvo a construir.",
      "how.p2":
        "Empiezo por quién usa el sistema, qué información necesita y qué debe pasar después. Defino el problema, la lógica y la arquitectura, divido el trabajo en tareas que puedo revisar y respondo por cómo encajan las piezas. Los agentes de programación son parte de ese proceso; la revisión y la entrega son mías.",
      "how.energy":
        "Soy alegre, me gusta construir cosas y me apasiona hablar de productos hasta convertirlos en sistemas.",
      "loop.1": "Fallar rápido",
      "loop.2": "Moverme rápido",
      "loop.3": "Fallar",
      "loop.4": "Aprender",
      "loop.5": "Volver a hacer",
      "loop.center": "v1 → v2 → entrega",
      "loop.sub": "CADA VUELTA DEJA ALGO",
      "loop.label":
        "Ciclo de trabajo: fallar rápido, moverme rápido, fallar, aprender, volver a hacer.",
      "career.h": "Trayectoria",
      "career.p":
        "Desde 2018 en equipos de producto; desde 2015, construyendo los míos con AOHYS.",
      "career.more": "Ver trayectoria completa",
      "career.parallel": "en paralelo",
      "close.h": "Dos caminos para empezar",
      "close.p": "Elige el que se parezca a lo que necesitas.",
      "team.h": "Sumarme a tu equipo",
      "team.p":
        "Frontend fuerte y full stack cuando el producto lo pide. Me gusta entender el negocio antes de escribir código.",
      "team.l1": "Ver trayectoria",
      "team.l2": "Ver CV",
      "build.h": "Construir tu producto",
      "build.p":
        "Si tienes un proceso que hoy vive en libretas, mensajes u hojas de cálculo, platiquemos cómo convertirlo en un sistema.",
      "build.l1": "Escríbeme",
      "build.l2": "Ver un caso",
    },
    en: {
      skip: "Skip to content",
      "nav.label": "Main",
      "nav.work": "Work",
      "nav.method": "How I work",
      "nav.career": "Career",
      "nav.cv": "Resume",
      "nav.contact": "Contact",
      menu: "Menu",
      "lang.label": "Language",
      "footer.line": "Alejandro Ortiz Corro · full stack development",
      "footer.note": "Horizonte design prototype. Not the published site.",
      "hero.lede":
        "Full-stack software engineer, strongest in frontend. I take products from requirements to delivery.",
      "hero.cta": "See my work",
      "tabs.label": "Products",
      "parts.label": "Product parts",
      swipe: "Swipe the lens to change product",
      "work.h": "Five products, from requirements to delivery",
      "work.p":
        "Each one started with real work someone needed to get done. Here is what it solves and what I built.",
      "work.case": "Read the case",
      "how.h": "Fail fast, learn, build it again",
      "how.p1":
        "I’d rather put something real in front of people early. Every attempt shows me what I got wrong; I fix it and build again.",
      "how.p2":
        "I start with who uses the system, what information they need and what should happen next. I define the problem, logic and architecture, break the work into tasks I can review and stay responsible for how the pieces fit. Coding agents are part of that process; review and delivery are mine.",
      "how.energy":
        "I’m cheerful, I like building things, and I love talking about products until they become systems.",
      "loop.1": "Fail fast",
      "loop.2": "Move fast",
      "loop.3": "Fail",
      "loop.4": "Learn",
      "loop.5": "Build again",
      "loop.center": "v1 → v2 → shipped",
      "loop.sub": "EVERY LAP LEAVES SOMETHING",
      "loop.label":
        "Work cycle: fail fast, move fast, fail, learn, build again.",
      "career.h": "Career",
      "career.p":
        "On product teams since 2018; building my own with AOHYS since 2015.",
      "career.more": "See the full career",
      "career.parallel": "in parallel",
      "close.h": "Two ways to start",
      "close.p": "Pick the one that looks like what you need.",
      "team.h": "Join your team",
      "team.p":
        "Strong frontend, full stack when the product needs it. I like understanding the business before writing code.",
      "team.l1": "See my career",
      "team.l2": "See my resume",
      "build.h": "Build your product",
      "build.p":
        "If you have a process that lives in notebooks, messages or spreadsheets today, let’s talk about turning it into a system.",
      "build.l1": "Write to me",
      "build.l2": "Read a case",
    },
  };

  HZ.dict = dict;
  var listeners = [];
  HZ.onLang = function (fn) {
    listeners.push(fn);
  };
  HZ.t = function (key) {
    return (dict[HZ.lang] && dict[HZ.lang][key]) || dict.es[key] || key;
  };

  function readLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "es") return q;
    try {
      var s = localStorage.getItem("hz-lang");
      if (s === "en" || s === "es") return s;
    } catch (e) {}
    return "es";
  }

  function applyLang(lang, silent) {
    HZ.lang = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = dict[lang][el.getAttribute("data-i18n")];
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var v = dict[lang][el.getAttribute("data-i18n-aria")];
      if (v != null) el.setAttribute("aria-label", v);
    });
    document
      .querySelectorAll("[data-href-" + lang + "]")
      .forEach(function (el) {
        el.setAttribute("href", el.getAttribute("data-href-" + lang));
      });
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute(
        "aria-pressed",
        String(b.getAttribute("data-lang") === lang),
      );
    });
    try {
      localStorage.setItem("hz-lang", lang);
    } catch (e) {}
    if (!silent)
      listeners.forEach(function (fn) {
        fn(lang);
      });
  }
  HZ.applyLang = applyLang;

  function initChrome() {
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.addEventListener("click", function () {
        applyLang(b.getAttribute("data-lang"));
      });
    });

    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".menu-toggle");
    if (nav && toggle) {
      toggle.addEventListener("click", function () {
        var open = nav.getAttribute("data-open") !== "true";
        nav.setAttribute("data-open", String(open));
        toggle.setAttribute("aria-expanded", String(open));
      });
      nav.querySelectorAll("ul a").forEach(function (a) {
        a.addEventListener("click", function () {
          nav.setAttribute("data-open", "false");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.getAttribute("data-open") === "true") {
          nav.setAttribute("data-open", "false");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    }

    var header = document.querySelector(".site-header");
    if (header) {
      var onScroll = function () {
        header.setAttribute("data-scrolled", String(window.scrollY > 8));
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    // Only one element may carry the "lens" view-transition name; move it to the
    // orb the visitor actually clicked so the morph starts from what they saw.
    document.addEventListener("click", function (e) {
      var link = e.target.closest && e.target.closest("a[data-vt-from]");
      if (!link) return;
      var src = document.querySelector(link.getAttribute("data-vt-from"));
      if (!src) return;
      document
        .querySelectorAll(".lens, .case-orb, .w-orb")
        .forEach(function (el) {
          el.style.viewTransitionName = "none";
        });
      src.style.viewTransitionName = "lens";
    });
    window.addEventListener("pageshow", function () {
      document
        .querySelectorAll(".lens, .case-orb, .w-orb")
        .forEach(function (el) {
          el.style.viewTransitionName = "";
        });
    });
  }

  HZ.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Place an image inside a circle the same way the shader maps its texture. */
  HZ.fitVars = function (el, size, focus) {
    var ar = size[0] / size[1];
    var halfH = 0.5 * focus.zoom;
    var halfW = halfH / ar;
    var w = 100 / (2 * halfW);
    var h = 100 / (2 * halfH);
    el.style.setProperty("--w", w + "%");
    el.style.setProperty("--h", h + "%");
    el.style.setProperty("--l", 50 - focus.x * w + "%");
    el.style.setProperty("--t", 50 - focus.y * h + "%");
  };

  /* Ma: one protagonist line that travels through the page's nodes. */
  HZ.maLine = function (container) {
    var svg = container.querySelector(".ma-line");
    if (!svg) return;
    if (svg._maLayout) {
      svg._maLayout();
      return;
    }
    var ns = "http://www.w3.org/2000/svg";
    var glow = document.createElementNS(ns, "path");
    glow.setAttribute("class", "glow");
    var ink = document.createElementNS(ns, "path");
    ink.setAttribute("class", "ink");
    svg.appendChild(glow);
    svg.appendChild(ink);
    var dots = [];
    var samples = [];
    var total = 0;
    var anchors = [];
    var ticking = false;

    function layout() {
      var box = container.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
      // Modes keep the line off the copy: "before" sits in the gutter left of the element,
      // "above" sits over its top edge; the default is the element's center (for empty anchors).
      anchors = Array.prototype.map.call(
        container.querySelectorAll("[data-ma-node]"),
        function (el) {
          var r = el.getBoundingClientRect();
          var mode = el.getAttribute("data-ma-node");
          var block = el.closest("[data-ma-block]") || el;
          var x = r.left + r.width / 2 - box.left;
          var y = r.top + r.height / 2 - box.top;
          if (mode === "before") {
            x = Math.max(10, r.left - box.left - 28);
            y = r.top - box.top + Math.min(r.height / 2, 22);
          } else if (mode === "above") {
            y = r.top - box.top - 36;
          }
          return {
            x: x,
            y: y,
            bottom: block.getBoundingClientRect().bottom - box.top,
            c: el.getAttribute("data-ma-color") || "",
          };
        },
      );
      if (anchors.length < 2) return;
      var f = function (n) {
        return n.toFixed(1);
      };
      var d = "M" + f(anchors[0].x) + " " + f(anchors[0].y);
      for (var i = 1; i < anchors.length; i++) {
        var a = anchors[i - 1];
        var b = anchors[i];
        // Descend beside block a, cross sideways only in the empty band between blocks, then descend to b.
        var top = Math.max(a.y, Math.min(a.bottom + 28, b.y - 48));
        var bot = Math.min(b.y, Math.max(top + 40, b.y - 28));
        var band = Math.min(bot - top, 240);
        var y0 = top + (bot - top - band) / 2;
        var y1 = y0 + band;
        if (Math.abs(b.x - a.x) < 1) {
          d += " L" + f(b.x) + " " + f(b.y);
          continue;
        }
        d += " L" + f(a.x) + " " + f(y0);
        d +=
          " C" +
          f(a.x) +
          " " +
          f(y0 + band * 0.55) +
          " " +
          f(b.x) +
          " " +
          f(y1 - band * 0.55) +
          " " +
          f(b.x) +
          " " +
          f(y1);
        d += " L" + f(b.x) + " " + f(b.y);
      }
      glow.setAttribute("d", d);
      ink.setAttribute("d", d);
      total = ink.getTotalLength();
      ink.style.strokeDasharray = total + " " + total;
      glow.style.strokeDasharray = total + " " + total;
      samples = [];
      for (var s = 0; s <= 240; s++) {
        var len = (total * s) / 240;
        samples.push([len, ink.getPointAtLength(len).y]);
      }
      dots.forEach(function (n) {
        n.remove();
      });
      dots = anchors.map(function (p, idx) {
        var c = document.createElementNS(ns, "circle");
        c.setAttribute("class", "node");
        c.setAttribute("cx", p.x);
        c.setAttribute("cy", p.y);
        c.setAttribute("r", idx === 0 ? 0 : 5);
        if (p.c) c.style.setProperty("--c", p.c);
        svg.appendChild(c);
        return c;
      });
      update();
    }

    function lengthAtY(y) {
      for (var i = 1; i < samples.length; i++) {
        if (samples[i][1] >= y) {
          var a = samples[i - 1];
          var b = samples[i];
          var t = (y - a[1]) / Math.max(1, b[1] - a[1]);
          return a[0] + (b[0] - a[0]) * Math.min(1, Math.max(0, t));
        }
      }
      return total;
    }

    function update() {
      ticking = false;
      if (!total) return;
      var reduced = HZ.reducedMotion.matches;
      var box = container.getBoundingClientRect();
      var reachY = reduced ? Infinity : window.innerHeight * 0.66 - box.top;
      var len = reduced ? total : lengthAtY(reachY);
      ink.style.strokeDashoffset = String(total - len);
      glow.style.strokeDashoffset = String(total - Math.min(total, len + 40));
      anchors.forEach(function (p, i) {
        if (dots[i])
          dots[i].setAttribute("data-on", String(reduced || p.y <= reachY));
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    layout();
    svg._maLayout = layout;
    window.addEventListener("scroll", onScroll, { passive: true });
    if ("ResizeObserver" in window)
      new ResizeObserver(function () {
        layout();
      }).observe(container);
    else window.addEventListener("resize", layout);
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(layout);
    HZ.reducedMotion.addEventListener("change", update);
    HZ.onLang(function () {
      requestAnimationFrame(layout);
    });
    window.addEventListener("load", layout);
  };

  HZ.initSite = function () {
    initChrome();
    applyLang(readLang(), true);
  };
})();
