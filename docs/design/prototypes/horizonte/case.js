/* Case page (Ma language): renders any of the five products, The Barber Central is the authored one. */
(function () {
  "use strict";

  var dict = {
    es: {
      "case.back": "Trabajo",
      "case.h-contrib": "Lo que construí",
      "case.h-decisions": "Las decisiones",
      "case.h-interface": "La interfaz",
      "case.h-next": "El siguiente producto",
      "case.title-suffix": "· Prototipo Horizonte",
    },
    en: {
      "case.back": "Work",
      "case.h-contrib": "What I built",
      "case.h-decisions": "The decisions",
      "case.h-interface": "The interface",
      "case.h-next": "The next product",
      "case.title-suffix": "· Horizonte prototype",
    },
  };
  Object.keys(dict).forEach(function (lang) {
    Object.assign(HZ.dict[lang], dict[lang]);
  });

  var slug, project, data, index;

  function name(p) {
    return HZ.lang === "en" && p.nameEn ? p.nameEn : p.name;
  }
  function $(s) {
    return document.querySelector(s);
  }

  function render() {
    var lang = HZ.lang;
    document.title = name(project) + " " + HZ.t("case.title-suffix");
    document.documentElement.style.setProperty("--wash", project.tint);
    $("#case-orb").style.setProperty("--wash", project.tint);
    $("#next-orb").style.setProperty(
      "--tint",
      HZ.projects[(index + 1) % HZ.projects.length].tint,
    );

    $("#back-text").textContent = HZ.t("case.back");
    $("#case-status").textContent = project.status[lang];
    $("#case-title").textContent = name(project);
    $("#case-lede").textContent = data.lede[lang];

    var orbImg = $("#case-orb-img");
    orbImg.src = project.texture;
    orbImg.alt = project.alt[lang];
    HZ.fitVars($("#case-orb"), project.size, project.focus);
    $("#sec-purpose").textContent = data.purpose[lang];
    $("#sec-contrib").textContent = HZ.t("case.h-contrib");
    var ul = $("#contrib-list");
    ul.innerHTML = "";
    data.contribution[lang].forEach(function (b) {
      var li = document.createElement("li");
      li.textContent = b;
      ul.appendChild(li);
    });
    $("#sec-decisions").textContent = HZ.t("case.h-decisions");
    var dd = $("#decisions");
    dd.innerHTML = "";
    data.decisions[lang].forEach(function (d) {
      var div = document.createElement("div");
      div.className = "decision";
      var h = document.createElement("h3");
      h.textContent = d.t;
      var p = document.createElement("p");
      p.textContent = d.b;
      div.appendChild(h);
      div.appendChild(p);
      dd.appendChild(div);
    });
    $("#sec-interface").textContent = HZ.t("case.h-interface");
    var fr = $("#interface-frames");
    fr.innerHTML = "";
    data.images.forEach(function (im) {
      var fig = document.createElement("figure");
      fig.className = "frame";
      var img = document.createElement("img");
      img.src = im.src;
      img.width = im.w;
      img.height = im.h;
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = im[lang];
      var cap = document.createElement("figcaption");
      cap.textContent = im[lang];
      fig.appendChild(img);
      fig.appendChild(cap);
      fr.appendChild(fig);
    });
    if (data.link) {
      var p = document.createElement("p");
      p.style.margin = "4px 0 0";
      p.style.textAlign = "center";
      var a = document.createElement("a");
      a.className = "text-link";
      a.href = data.link.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = data.link[lang] + " ";
      var arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      a.appendChild(arrow);
      p.appendChild(a);
      fr.appendChild(p);
    }

    var next = HZ.projects[(index + 1) % HZ.projects.length];
    $("#sec-next").textContent = HZ.t("case.h-next");
    $("#next-link").setAttribute("href", "caso.html?p=" + next.slug);
    $("#next-name").textContent = name(next);
    $("#next-purpose").textContent = next.purpose[lang];
    var nimg = $("#next-orb-img");
    nimg.src = next.texture;
    nimg.alt = "";
    HZ.fitVars($("#next-orb"), next.size, next.focus);
  }

  function boot() {
    var q = new URLSearchParams(location.search).get("p");
    index = HZ.projects.findIndex(function (p) {
      return p.slug === q;
    });
    if (index < 0) index = 0;
    project = HZ.projects[index];
    slug = project.slug;
    data = HZ.cases[slug];

    HZ.initSite();
    render();
    HZ.onLang(render);
    HZ.maLine(document.getElementById("main"));
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
