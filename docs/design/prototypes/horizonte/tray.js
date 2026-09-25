/* Trajectory page: the Ma line travels through seven roles. */
(function () {
  "use strict";

  var dict = {
    es: {
      "tl.title": "Siete equipos, un hilo",
      "tl.lede":
        "De sistemas de emergencia y comercio a productos propios: cada etapa dejó una forma concreta de trabajar. En paralelo, desde 2015, construyo mis productos con AOHYS.",
      "tl.cv-h": "El CV completo",
      "tl.cv-a": "Abrir el CV en aohys.com",
      "tl.title-suffix": "· Prototipo Horizonte",
    },
    en: {
      "tl.title": "Seven teams, one thread",
      "tl.lede":
        "From emergency-response systems and commerce to my own products: each stage left a concrete way of working. In parallel, since 2015, I build my products with AOHYS.",
      "tl.cv-h": "The full resume",
      "tl.cv-a": "Open the resume on aohys.com",
      "tl.title-suffix": "· Horizonte prototype",
    },
  };
  Object.keys(dict).forEach(function (lang) {
    Object.assign(HZ.dict[lang], dict[lang]);
  });

  var colors = [
    "#FCE3A6",
    "#D6E2B4",
    "#FDD2B1",
    "#E7E6B0",
    "#FDDDAA",
    "#D6E2B4",
    "#FCE3A6",
  ];

  function render() {
    var lang = HZ.lang;
    document.title = HZ.t("tl.title") + " " + HZ.t("tl.title-suffix");
    document.getElementById("tl-title").textContent = HZ.t("tl.title");
    document.getElementById("tl-lede").textContent = HZ.t("tl.lede");
    document.getElementById("cv-h").textContent = HZ.t("tl.cv-h");
    document.getElementById("cv-a").textContent = HZ.t("tl.cv-a") + " ↗";

    var ol = document.getElementById("timeline");
    ol.innerHTML = "";
    HZ.career.forEach(function (c, i) {
      var li = document.createElement("li");
      li.className = "tl-item";
      var anchor = document.createElement("span");
      anchor.className = "tl-anchor";
      anchor.setAttribute("data-ma-node", "");
      anchor.setAttribute("data-ma-color", colors[i % colors.length]);
      anchor.setAttribute("aria-hidden", "true");
      var card = document.createElement("div");
      card.className = "tl-card";
      var pe = document.createElement("span");
      pe.className = "pe";
      pe.textContent = c.period[lang];
      var h = document.createElement("h2");
      h.textContent = c.company;
      var ti = document.createElement("span");
      ti.className = "ti";
      ti.textContent = c.title;
      var ul = document.createElement("ul");
      c.bullets[lang].forEach(function (b) {
        var item = document.createElement("li");
        item.textContent = b;
        ul.appendChild(item);
      });
      card.appendChild(pe);
      card.appendChild(h);
      card.appendChild(ti);
      card.appendChild(ul);
      li.appendChild(anchor);
      li.appendChild(card);
      ol.appendChild(li);
    });

    // Founder role, styled as its own stop on the same line.
    var f = HZ.founder;
    var li = document.createElement("li");
    li.className = "tl-item";
    var anchor = document.createElement("span");
    anchor.className = "tl-anchor";
    anchor.setAttribute("data-ma-node", "");
    anchor.setAttribute("data-ma-color", "#FDD2B1");
    anchor.setAttribute("aria-hidden", "true");
    var card = document.createElement("div");
    card.className = "tl-card";
    var pe = document.createElement("span");
    pe.className = "pe";
    pe.textContent = f.period[lang];
    var h = document.createElement("h2");
    h.textContent = f.company;
    var ti = document.createElement("span");
    ti.className = "ti";
    ti.textContent = f.title;
    var note = document.createElement("p");
    note.className = "tl-founder-note";
    note.textContent = f.short[lang];
    var ul = document.createElement("ul");
    f.bullets[lang].forEach(function (b) {
      var item = document.createElement("li");
      item.textContent = b;
      ul.appendChild(item);
    });
    card.appendChild(pe);
    card.appendChild(h);
    card.appendChild(ti);
    card.appendChild(note);
    card.appendChild(ul);
    li.appendChild(anchor);
    li.appendChild(card);
    ol.appendChild(li);
  }

  function boot() {
    HZ.initSite();
    render();
    HZ.onLang(function () {
      render();
      HZ.maLine(document.getElementById("main"));
    });
    HZ.maLine(document.getElementById("main"));
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
