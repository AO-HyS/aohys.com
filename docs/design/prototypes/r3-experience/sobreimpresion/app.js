(() => {
  "use strict";
  const data = window.MOCK;
  const main = document.getElementById("main");
  const motionToggle = document.getElementById("reduce-motion");
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const arrow =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  const escape = (value) =>
    String(value).replace(
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
  let projectIndex = 0;
  let transitionVersion = 0;
  let routeAnimation;
  let projectAnimations = [];
  let route = "";
  const reduced = () => motionToggle.checked || preference.matches;
  motionToggle.checked = preference.matches;
  const syncMotion = () => {
    document.documentElement.classList.toggle("reduce-motion", reduced());
    if (reduced()) {
      if (routeAnimation) routeAnimation.finish();
      projectAnimations.forEach((a) => a.finish());
    }
  };
  motionToggle.addEventListener("change", syncMotion);
  preference.addEventListener("change", syncMotion);
  syncMotion();
  const link = (href, text, klass = "text-link") =>
    `<a class="${klass}" href="${href}"><span>${escape(text)}</span>${arrow}</a>`;
  const picture = (p) =>
    `<img src="../shared/${p.image}" alt="${escape(p.alt)}" decoding="async">`;
  const mail = (subject) =>
    `mailto:${data.email}?subject=${encodeURIComponent(subject)}`;
  const planes =
    '<div class="registration-plane plane-a" aria-hidden="true"></div><div class="registration-plane plane-b" aria-hidden="true"></div>';
  const caseImage = (p) =>
    `<div class="showcase${p.image.endsWith(".svg") ? " svg-art" : ""}">${picture(p)}</div>`;
  function contacts() {
    return `<div class="contact-columns"><section class="contact-column"><h3>Sumarme a tu equipo</h3><p>Si buscas un ingeniero que conecte la experiencia de uso con el resto del producto, podemos hablar del equipo y del reto.</p>${link(mail("Hablemos de tu equipo"), "Cuéntame del equipo")}</section><section class="contact-column"><h3>Construir tu producto</h3><p>Si tienes un producto por desarrollar o una experiencia que necesita cambiar, podemos empezar por el problema que quieres resolver.</p>${link(mail("Hablemos de tu producto"), "Cuéntame de tu producto")}</section></div>`;
  }
  function workRows() {
    return `<div class="work-list">${data.projects.map((p) => `<a class="work-row" href="#proyecto/${p.id}"><strong>${escape(p.title)}</strong><span>${escape(p.subtitle)}</span>${arrow}</a>`).join("")}</div>`;
  }
  function home() {
    const p = data.projects[projectIndex];
    return `<section class="hero"><h1>Alejandro<br><span>Ortiz Corro</span></h1><div class="hero-copy"><h2>${escape(data.role)}</h2><p>${escape(data.intro)}</p>${link("#trabajo", "Conoce mi trabajo", "button")}</div></section>
      <section class="spotlight" aria-label="Proyecto destacado" style="background:${p.color}">${planes}<div class="spotlight-head"><div id="spotlight-copy" aria-live="polite" aria-atomic="true"><h2>${escape(p.title)}</h2><p>${escape(p.subtitle)}</p>${link("#proyecto/" + p.id, "Ver proyecto")}</div><div class="project-controls"><span class="project-count"><span id="project-number">${projectIndex + 1}</span> / ${data.projects.length}</span><button class="icon-button prev" data-step="-1" aria-label="Proyecto anterior">${arrow}</button><button class="icon-button" data-step="1" aria-label="Proyecto siguiente">${arrow}</button></div></div><div class="showcase${p.image.endsWith(".svg") ? " svg-art" : ""}" id="project-image">${picture(p)}<a id="image-case-link" href="#proyecto/${p.id}" aria-label="Ver proyecto ${escape(p.title)}"></a></div></section>
      <section class="section" id="all-work"><div class="section-heading"><h2>El trabajo, en contexto.</h2><p>Productos propios y contribuciones dentro de equipos. Cada uno plantea un problema distinto.</p></div>${workRows()}</section>
      <section class="architecture-teaser"><h2>Lo que sostiene la experiencia.</h2><div><p>Una interfaz también depende de sus datos, sus permisos y sus reglas. Aquí explico cómo se conectan en AOHYS.</p>${link("#arquitectura", "Ver la arquitectura")}</div></section>
      <section class="collaborate"><h2>Podemos trabajar juntos.</h2>${contacts()}</section>`;
  }
  function work() {
    return `<section class="page-head"><h1>El trabajo,<br>en contexto.</h1><p>Seis casos para conocer qué construyo, dónde contribuyo y cómo tomo decisiones.</p></section><section class="section" style="padding-top:0">${workRows()}</section>`;
  }
  function project(id) {
    const p = data.projects.find((item) => item.id === id);
    if (!p) return missing();
    const next = data.projects.find((item) => item.id === p.next);
    return `<section class="page-head case-head">${link("#trabajo", "Todos los proyectos", "text-link back")}<h1>${escape(p.title)}</h1><p>${escape(p.summary)}</p></section>
      <section class="case-visual" style="background:${p.color}" aria-label="Vista del proyecto">${planes}${caseImage(p)}</section>
      <section class="case-story"><h2>El contexto.</h2><p>${escape(p.context)}</p><h2>Mi contribución.</h2><div><p>${escape(p.contribution)}</p><ul class="case-details">${p.details.map((d) => `<li>${escape(d)}</li>`).join("")}</ul></div></section>
      <section class="decision"><h2>Una decisión<br>que importa.</h2><p>${escape(p.decision)}</p></section>
      <a class="next-case" href="#proyecto/${next.id}"><div><p>Siguiente proyecto</p><h2>${escape(next.title)}</h2></div>${arrow}</a>`;
  }
  function architecture() {
    return `<section class="page-head"><h1>Detrás de<br>esta página.</h1><p>Así se organiza AOHYS: una experiencia pública, un editor privado y una fuente de contenido.</p></section>
      <section class="architecture-flow" aria-label="Estructura del producto AOHYS">${data.architecture.map((a) => `<article class="architecture-piece"><h2>${escape(a.title)}</h2><p class="tech">${escape(a.tech)}</p><p>${escape(a.text)}</p></article>`).join("")}</section>
      <p class="structure-note">El grafo de contenido conecta proyectos, idiomas y metadatos. Es la relación que permite publicar una página sin perder el contexto del resto del sitio.</p>
      <section class="practice"><h2>El proceso<br>es otra parte.</h2><div><p>Mi forma de desarrollar acompaña esta arquitectura: defino el problema, divido el trabajo y reviso el resultado completo.</p><ul><li>Requisitos y límites antes de implementar.</li><li>Agentes para tareas acotadas, con revisión de decisiones y código.</li><li>Verificación de la experiencia antes de publicar.</li></ul>${link("#proyecto/aohys", "Conocer el caso AOHYS")}</div></section>`;
  }
  function cv() {
    return `<section class="page-head cv-head"><div><h1>Alejandro<br>Ortiz Corro</h1><h2>${escape(data.role)}</h2></div><div><p>${escape(data.intro)}</p><button class="button light" id="print-cv">Imprimir CV ${arrow}</button></div></section><div class="cv-band"><span>Experiencia de producto, dentro y fuera de equipos.</span><a href="mailto:${data.email}">${data.email}</a></div><section class="timeline" aria-label="Experiencia profesional">${data.experience.map((e) => `<article class="timeline-item"><div><h2>${escape(e.company)}</h2><span class="dates">${escape(e.dates)}</span></div><div><h3>${escape(e.role)}</h3><p>${escape(e.text)}</p></div></article>`).join("")}</section><section class="cv-end"><h2>Hablemos de tu equipo.</h2>${link(mail("Hablemos de tu equipo"), "Escríbeme", "button")}</section>`;
  }
  function contact() {
    return `<section class="page-head contact-page"><h1>Una conversación<br>para empezar.</h1><p>Hay dos formas de colaborar. Las dos empiezan por entender qué necesitas.</p>${contacts()}<p class="email-line">También puedes escribirme a <a href="mailto:${data.email}">${data.email}</a>.</p></section>`;
  }
  function missing() {
    return `<section class="empty-page"><h1>Esa página no está en el mock.</h1><p>Puedes seguir explorando los proyectos o volver al inicio.</p>${link("#inicio", "Volver al inicio", "button")}</section>`;
  }
  function changeProject(step) {
    projectIndex =
      (projectIndex + step + data.projects.length) % data.projects.length;
    const p = data.projects[projectIndex];
    const version = ++transitionVersion;
    projectAnimations.forEach((a) => a.cancel());
    projectAnimations = [];
    const frame = document.getElementById("project-image");
    if (!frame) return;
    const oldImages = Array.from(frame.querySelectorAll("img"));
    const outgoing = oldImages.pop();
    oldImages.forEach((img) => img.remove());
    if (outgoing) outgoing.classList.remove("incoming");
    const incoming = document.createElement("img");
    incoming.src = "../shared/" + p.image;
    incoming.alt = p.alt;
    incoming.className = "incoming";
    frame.classList.toggle("svg-art", p.image.endsWith(".svg"));
    frame.append(incoming);
    const imageLink = document.getElementById("image-case-link");
    imageLink.href = "#proyecto/" + p.id;
    imageLink.setAttribute("aria-label", "Ver proyecto " + p.title);
    document.getElementById("spotlight-copy").innerHTML =
      `<h2>${escape(p.title)}</h2><p>${escape(p.subtitle)}</p>${link("#proyecto/" + p.id, "Ver proyecto")}`;
    document.getElementById("project-number").textContent = String(
      projectIndex + 1,
    );
    const stage = document.querySelector(".spotlight");
    stage.style.background = p.color;
    if (reduced()) {
      if (outgoing) outgoing.remove();
      incoming.classList.remove("incoming");
      return;
    }
    const opts = {
      duration: 620,
      easing: "cubic-bezier(.16,1,.3,1)",
      fill: "both",
    };
    const reveal = incoming.animate(
      [
        { clipPath: "inset(0 100% 0 0)", transform: "translateX(2%)" },
        { clipPath: "inset(0 0% 0 0)", transform: "translateX(0)" },
      ],
      opts,
    );
    projectAnimations.push(reveal);
    if (outgoing)
      projectAnimations.push(
        outgoing.animate(
          [{ transform: "translateX(0)" }, { transform: "translateX(-2%)" }],
          opts,
        ),
      );
    stage
      .querySelectorAll(".registration-plane")
      .forEach((plane, i) =>
        projectAnimations.push(
          plane.animate(
            [{ translate: `${i ? "-24" : "32"}px 0` }, { translate: "0 0" }],
            opts,
          ),
        ),
      );
    reveal.finished
      .then(() => {
        if (version !== transitionVersion) return;
        if (outgoing) outgoing.remove();
        incoming.classList.remove("incoming");
        projectAnimations.forEach((a) => a.cancel());
        projectAnimations = [];
      })
      .catch(() => {});
  }
  function render(initial = false) {
    const nextRoute = location.hash.slice(1) || "inicio";
    if (nextRoute === "main") {
      main.focus();
      return;
    }
    route = nextRoute;
    transitionVersion++;
    if (routeAnimation) routeAnimation.cancel();
    projectAnimations.forEach((a) => a.cancel());
    projectAnimations = [];
    let markup;
    let title;
    if (route === "inicio") {
      markup = home();
      title = "Inicio";
    } else if (route === "trabajo") {
      markup = work();
      title = "Trabajo";
    } else if (route.startsWith("proyecto/")) {
      markup = project(route.slice(9));
      title =
        data.projects.find((p) => p.id === route.slice(9))?.title || "Proyecto";
    } else if (route === "arquitectura") {
      markup = architecture();
      title = "Arquitectura";
    } else if (route === "cv") {
      markup = cv();
      title = "CV";
    } else if (route === "contacto") {
      markup = contact();
      title = "Contacto";
    } else {
      markup = missing();
      title = "Página no encontrada";
    }
    main.innerHTML = markup;
    document.title = title + " · Alejandro Ortiz Corro · Mock Sobreimpresión";
    document.getElementById("other-direction").href = "../firma/#" + route;
    document.querySelectorAll(".site-header nav a").forEach((a) => {
      const active =
        a.hash === "#" + route ||
        (route.startsWith("proyecto/") && a.hash === "#trabajo");
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    main
      .querySelectorAll("[data-step]")
      .forEach((b) =>
        b.addEventListener("click", () =>
          changeProject(Number(b.dataset.step)),
        ),
      );
    document
      .getElementById("print-cv")
      ?.addEventListener("click", () => window.print());
    if (!initial) {
      window.scrollTo({ top: 0, behavior: "instant" });
      main.focus({ preventScroll: true });
    }
    if (!initial && !reduced())
      routeAnimation = main.animate(
        [
          {
            opacity: 0.72,
            clipPath: "inset(0 0 2% 0)",
            transform: "translateY(9px)",
          },
          {
            opacity: 1,
            clipPath: "inset(0 0 0% 0)",
            transform: "translateY(0)",
          },
        ],
        { duration: 390, easing: "cubic-bezier(.16,1,.3,1)" },
      );
  }
  window.addEventListener("hashchange", () => render());
  render(true);
})();
