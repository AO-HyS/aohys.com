/* Throwaway experience mock: in-memory navigation, no submission or persistence. */
(() => {
  "use strict";
  const data = window.MOCK;
  const main = document.querySelector("main");
  const reducedInput = document.querySelector("#reduce-motion");
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const arrow =
    '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7"/></svg>';
  let projectIndex = 0;
  let projectRevision = 0;
  let routeRevision = 0;
  let activeAnimations = [];
  const reduced = () => reducedInput.checked || media.matches;
  const esc = (str) =>
    String(str).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const link = (href, text, cls = "text-link") =>
    `<a class="${cls}" href="${href}">${esc(text)}${arrow}</a>`;
  const img = (p, eager = false) =>
    `<img src="../shared/${p.image}" alt="${esc(p.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
  const line = (shape = "M0 36 C190 36 175 78 380 55 S800 0 1100 35") =>
    `<svg class="page-line" viewBox="0 0 1100 90" preserveAspectRatio="none" aria-hidden="true"><path class="signature-path" pathLength="1" d="${shape}"/></svg>`;
  const mail = (subject) =>
    `mailto:${data.email}?subject=${encodeURIComponent(subject)}`;
  const contactOptions = () =>
    `<div class="contact-options"><div class="contact-option"><h3>Sumarme a tu equipo</h3><p>Si buscas un ingeniero full-stack con experiencia en frontend, podemos hablar del producto y del equipo.</p>${link(mail("Conversemos sobre tu equipo"), "Hablar de una oportunidad")}</div><div class="contact-option"><h3>Construir tu producto</h3><p>Si tienes un producto en mente o uno que necesita avanzar, cuéntame qué quieres resolver.</p>${link(mail("Conversemos sobre tu producto"), "Hablar de un producto")}</div></div>`;
  const contact = () =>
    `<section class="contact-section section-space"><h2>¿En qué podemos trabajar?</h2>${contactOptions()}</section>`;
  const projectRows = () =>
    `<div class="project-list">${data.projects.map((p) => `<a class="project-row" href="#proyecto/${p.id}"><h3>${esc(p.title)}</h3><p>${esc(p.subtitle)}</p>${arrow}</a>`).join("")}</div>`;
  function home() {
    const p = data.projects[projectIndex];
    return `<div class="wrap"><section class="intro-stage"><h1 class="hero-name">Alejandro<br>Ortiz Corro</h1><div class="hero-copy"><p class="role">${esc(data.role)}</p><p class="intro">${esc(data.intro)}</p>${link("#trabajo", "Conoce mi trabajo", "pill")}</div><svg class="signature-art" viewBox="0 0 700 600" preserveAspectRatio="none" aria-hidden="true"><path class="signature-path" pathLength="1" d="M30 210 C160 130 170 335 355 292 S550 100 700 65 C780 130 780 380 700 430 C540 372 430 461 100 460 C25 460 10 480 10 570"/></svg><div class="project-spotlight"><div class="spotlight-copy"><h2 id="spotlight-title">${esc(p.title)}</h2><p id="spotlight-subtitle">${esc(p.subtitle)}</p><a id="spotlight-link" class="text-link" href="#proyecto/${p.id}">Ver proyecto${arrow}</a><div class="project-controls"><button type="button" class="circle-button prev" data-project-step="-1" aria-label="Proyecto anterior">${arrow}</button><button type="button" class="circle-button" data-project-step="1" aria-label="Proyecto siguiente">${arrow}</button><span class="counter" id="project-counter" aria-live="polite">${projectIndex + 1} / ${data.projects.length}</span></div></div><div class="image-window" id="spotlight-image">${img(p, true)}</div></div></section><section class="section-space"><div class="section-heading"><h2>El trabajo, de cerca.</h2><p>Productos propios y contribuciones en equipo. El contexto, mi trabajo y las decisiones detrás de cada uno.</p></div>${projectRows()}</section><section class="architecture-tease section-space"><div class="tease-title"><h2>También importa<br>lo que no se ve.</h2></div><div><p>Una buena interfaz se apoya en decisiones de contenido, datos y acceso. AOHYS sirve para mostrar cómo conecto esas piezas.</p>${link("#arquitectura", "Ver la arquitectura")}</div></section>${contact()}</div>`;
  }
  function work() {
    return `<div class="wrap"><header class="page-head"><h1>Productos con contexto.</h1><p>Seis maneras de ver mi trabajo: desde la experiencia que usa una persona hasta las decisiones que la sostienen.</p></header>${line()}<section class="work-grid" aria-label="Proyectos">${data.projects.map((p) => `<a class="work-item" href="#proyecto/${p.id}"><div class="image-window">${img(p)}</div><h2>${esc(p.title)}</h2><p>${esc(p.subtitle)}</p><span class="text-link">Conocer el proyecto${arrow}</span></a>`).join("")}</section>${contact()}</div>`;
  }
  function project(p) {
    const next = data.projects.find((item) => item.id === p.next);
    return `<article class="wrap"><header class="page-head">${link("#trabajo", "Todos los proyectos", "back-link")}<div class="case-head"><h1>${esc(p.title)}</h1><p>${esc(p.summary)}</p></div></header><div class="case-picture"><div class="image-window">${img(p, true)}</div><p class="case-caption">${esc(p.subtitle)} · ${p.id === "enterprise" || p.id === "aohys" ? "Diagrama conceptual público" : "Referencia visual del proyecto"}</p></div><div class="case-body"><aside class="case-sidebar"><p>En este proyecto</p><ul>${p.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>${p.id === "aohys" ? link("#arquitectura", "Explorar arquitectura") : ""}</aside><div class="case-story"><section class="story-part"><h2>El contexto</h2><p>${esc(p.context)}</p></section><section class="story-part"><h2>Mi contribución</h2><p>${esc(p.contribution)}</p></section><section class="story-part"><h2>Una decisión que importa</h2><p>${esc(p.decision)}</p></section></div></div><a class="next-case" href="#proyecto/${next.id}"><div><small>Siguiente proyecto</small><h2>${esc(next.title)}</h2></div>${arrow}</a></article>`;
  }
  function architecture() {
    return `<div class="wrap"><header class="page-head"><h1>De la interfaz<br>a la estructura.</h1><p>AOHYS es mi sitio, pero también un producto: contenido público, edición privada y una forma de publicar.</p></header>${line("M0 20 C140 20 220 90 415 54 S800 22 1100 60")}<section class="arch-intro"><h2>Tres responsabilidades.<br>Un mismo sitio.</h2><p>Separar lo que ve un visitante de lo que puede editar un administrador hace más claros los límites de cada parte.</p></section><div class="arch-path">${data.architecture.map((item) => `<section class="arch-step"><div><h3>${esc(item.title)}</h3><span class="tech">${esc(item.tech)}</span></div><p>${esc(item.text)}</p></section>`).join("")}</div><section class="practice"><h2>La arquitectura del producto.<br>Y el trabajo para entregarlo.</h2><p>Mi proceso empieza por entender el problema y los límites del dominio. Después convierto esas decisiones en tareas, implemento y verifico el comportamiento antes de publicar.</p><p>Uso agentes para tareas acotadas. La dirección técnica, la integración y la revisión siguen bajo mi responsabilidad.</p>${link("#proyecto/aohys", "Ver el caso AOHYS")}</section>${contact()}</div>`;
  }
  function cv() {
    return `<div class="wrap"><header class="page-head cv-head"><div><h1>Alejandro<br>Ortiz Corro</h1><p>${esc(data.role)}</p></div><button type="button" class="pill" id="print-cv">Imprimir CV${arrow}</button></header>${line("M0 15 C230 15 215 66 410 53 S800 8 1100 30")}<div class="cv-layout"><aside class="cv-aside"><h2>Perfil</h2><p>${esc(data.intro)}</p><p>Trabajo en productos propios y en equipos de ingeniería. Mi experiencia conecta interfaces, integraciones y decisiones de producto.</p>${link(mail("Conversemos sobre tu equipo"), "Contactar")}</aside><section class="timeline" aria-label="Trayectoria profesional">${data.experience.map((job) => `<article class="job"><div class="job-top"><h2>${esc(job.company)}</h2><time>${esc(job.dates)}</time></div><p class="job-role">${esc(job.role)}</p><p>${esc(job.text)}</p></article>`).join("")}</section></div></div>`;
  }
  function contactPage() {
    return `<div class="wrap contact-page"><header class="page-head"><h1>Una buena conversación<br>es un comienzo.</h1><p>Podemos hablar de un equipo al que sumarme o de un producto que quieras construir.</p></header>${line("M0 25 C180 25 150 85 400 55 S830 0 1100 35")}${contactOptions()}<a class="contact-email" href="mailto:${data.email}">${esc(data.email)}</a></div>`;
  }
  function animateThread(duration = 650) {
    if (reduced()) return;
    main.querySelectorAll(".signature-path").forEach((path) => {
      activeAnimations.push(
        path.animate(
          [
            { strokeDasharray: "1", strokeDashoffset: "1" },
            { strokeDasharray: "1", strokeDashoffset: "0" },
          ],
          { duration, easing: "cubic-bezier(.16,1,.3,1)" },
        ),
      );
    });
  }
  function stopAnimations() {
    activeAnimations.forEach((animation) => animation.cancel());
    activeAnimations = [];
  }
  async function changeProject(step) {
    const revision = ++projectRevision;
    projectIndex =
      (projectIndex + step + data.projects.length) % data.projects.length;
    const p = data.projects[projectIndex];
    const frame = document.querySelector("#spotlight-image");
    if (!frame) return;
    document.querySelector("#spotlight-title").textContent = p.title;
    document.querySelector("#spotlight-subtitle").textContent = p.subtitle;
    document.querySelector("#spotlight-link").href = `#proyecto/${p.id}`;
    document.querySelector("#project-counter").textContent =
      `${projectIndex + 1} / ${data.projects.length}`;
    frame.querySelectorAll(".incoming").forEach((node) => node.remove());
    if (reduced()) {
      frame.innerHTML = img(p, true);
      return;
    }
    const incoming = document.createElement("img");
    incoming.className = "incoming";
    incoming.src = `../shared/${p.image}`;
    incoming.alt = p.alt;
    await incoming.decode().catch(() => {});
    if (revision !== projectRevision || !frame.isConnected) return;
    frame.append(incoming);
    const animation = incoming.animate(
      [
        { clipPath: "inset(0 100% 0 0 round 12px)" },
        { clipPath: "inset(0 0% 0 0 round 12px)" },
      ],
      { duration: 600, easing: "cubic-bezier(.16,1,.3,1)" },
    );
    activeAnimations.push(animation);
    animateThread(600);
    await animation.finished.catch(() => {});
    if (revision !== projectRevision || !frame.isConnected) return;
    frame.innerHTML = img(p, true);
  }
  function render(initial = false) {
    const revision = ++routeRevision;
    ++projectRevision;
    stopAnimations();
    const hash = location.hash.slice(1) || "inicio";
    if (hash === "main") {
      main.focus();
      return;
    }
    const parts = hash.split("/");
    const page = parts[0];
    const selected = data.projects.find((p) => p.id === parts[1]);
    const routes = {
      inicio: home,
      trabajo: work,
      arquitectura: architecture,
      cv,
      contacto: contactPage,
    };
    if (page === "proyecto" && selected) main.innerHTML = project(selected);
    else main.innerHTML = (routes[page] || home)();
    document.title = `${page === "proyecto" && selected ? selected.title : { inicio: "Alejandro Ortiz Corro", trabajo: "Trabajo", arquitectura: "Arquitectura", cv: "CV", contacto: "Contacto" }[page] || "Alejandro Ortiz Corro"} · Firma en movimiento`;
    document.querySelector("#other-direction").href =
      `../sobreimpresion/#${hash === "main" ? "inicio" : hash}`;
    document.querySelectorAll("nav a").forEach((a) => {
      if (a.hash.slice(1) === (page === "proyecto" ? "trabajo" : page))
        a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (!initial) {
      window.scrollTo({ top: 0, behavior: "instant" });
      main.focus({ preventScroll: true });
    }
    if (!reduced()) {
      const motion = main.animate(
        [{ clipPath: "inset(0 0 0 3%)" }, { clipPath: "inset(0 0 0 0%)" }],
        { duration: 400, easing: "cubic-bezier(.16,1,.3,1)" },
      );
      activeAnimations.push(motion);
      if (revision === routeRevision) animateThread(initial ? 850 : 650);
    }
  }
  document.addEventListener("click", (event) => {
    const step = event.target.closest("[data-project-step]");
    if (step) changeProject(Number(step.dataset.projectStep));
    if (event.target.closest("#print-cv")) window.print();
    const skip = event.target.closest(".skip");
    if (skip) {
      event.preventDefault();
      main.focus();
      main.scrollIntoView();
    }
  });
  function motionChanged() {
    document.documentElement.classList.toggle("reduced-motion", reduced());
    if (reduced()) {
      ++projectRevision;
      stopAnimations();
      const frame = document.querySelector("#spotlight-image");
      if (frame) frame.innerHTML = img(data.projects[projectIndex], true);
    }
  }
  reducedInput.checked = media.matches;
  reducedInput.addEventListener("change", motionChanged);
  media.addEventListener("change", motionChanged);
  window.addEventListener("hashchange", () => render());
  motionChanged();
  render(true);
})();
