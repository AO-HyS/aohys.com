/* Home: lens stage, orbit ghosts, part labels, project selector and sections. */
(function () {
  "use strict";

  var P = HZ.projects;
  var N = P.length;
  var DURATION = 1100;
  var SWAP_AT = 0.45;
  var RETARGET_BEFORE = 0.3;

  var $ = function (s, r) {
    return (r || document).querySelector(s);
  };
  var clamp = function (v, a, b) {
    return Math.min(b, Math.max(a, v));
  };
  var lerp = function (a, b, t) {
    return a + (b - a) * t;
  };
  var easeInOutSine = function (t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  };
  var easeInOutCubic = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  var easeOutCubic = function (t) {
    return 1 - Math.pow(1 - t, 3);
  };
  var easeInCubic = function (t) {
    return t * t * t;
  };
  var easeOutBack = function (t) {
    var c1 = 1.9,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  var seg = function (x, a, b) {
    return clamp((x - a) / (b - a), 0, 1);
  };

  var hero,
    stage,
    lensEl,
    canvas,
    tabsEl,
    captionEl,
    ctaEl,
    announceEl,
    orbitsSvg,
    ghostEls,
    partEls,
    connectorEls,
    beadEls;
  var lens = null;
  var glOn = false;
  var current = 0;
  var requested = 0;
  var pending = null;
  var tr = null;
  var raf = 0;
  var inView = true;
  var start = performance.now();
  var pointer = [0, 0];
  var pointerTarget = [0, 0];
  var geo = null;
  var images = [];
  var paper = [];
  var mqMobile = window.matchMedia("(max-width: 760px)");

  function name(p) {
    return HZ.lang === "en" && p.nameEn ? p.nameEn : p.name;
  }
  function fitOf(p) {
    var ar = p.size[0] / p.size[1];
    var halfH = 0.5 * p.focus.zoom;
    return [halfH / ar, halfH, p.focus.x, p.focus.y];
  }
  function motionOK() {
    return !HZ.reducedMotion.matches;
  }

  /* ---------- Ghost drawings: synthetic earlier versions ---------- */

  function ghostSVG(kind, stageIdx, tint) {
    var o = [];
    var ink = "rgba(71,60,51,";
    function rect(x, y, w, h, accent, r) {
      r = r == null ? 2 : r;
      var st;
      if (stageIdx === 0)
        st = 'fill="none" stroke="' + ink + '0.42)" stroke-dasharray="3 2.5"';
      else if (stageIdx === 1)
        st =
          'fill="' +
          ink +
          (accent ? "0.16)" : "0.07)") +
          '" stroke="' +
          ink +
          '0.16)"';
      else
        st =
          'fill="' + (accent ? tint : "#fff") + '" stroke="' + ink + '0.24)"';
      o.push(
        '<rect x="' +
          x +
          '" y="' +
          y +
          '" width="' +
          w +
          '" height="' +
          h +
          '" rx="' +
          r +
          '" ' +
          st +
          ' stroke-width="1"/>',
      );
    }
    function line(x1, y1, x2, y2, strong) {
      var a =
        stageIdx === 0 ? 0.38 : stageIdx === 1 ? 0.22 : strong ? 0.55 : 0.3;
      o.push(
        '<line x1="' +
          x1 +
          '" y1="' +
          y1 +
          '" x2="' +
          x2 +
          '" y2="' +
          y2 +
          '" stroke="' +
          ink +
          a +
          ')" stroke-width="' +
          (strong ? 1.6 : 1.1) +
          '" stroke-linecap="round"/>',
      );
    }
    function dot(x, y, r, accent) {
      var f = stageIdx === 2 && accent ? tint : "none";
      o.push(
        '<circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="' +
          r +
          '" fill="' +
          f +
          '" stroke="' +
          ink +
          (stageIdx === 0 ? "0.4)" : "0.3)") +
          '" stroke-width="1"/>',
      );
    }
    var i, j;
    switch (kind) {
      case "calendar":
        line(10, 12, 60, 12, true);
        rect(104, 7, 28, 10, true, 5);
        for (i = 0; i < 4; i++)
          for (j = 0; j < 7; j++)
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
        for (i = 0; i < 4; i++)
          for (j = 0; j < 7; j++)
            rect(10 + j * 18, 26 + i * 17, 14, 12, false, 2);
        rect(46, 44, 68, 10, true, 5);
        rect(10, 78, 50, 10, true, 5);
        break;
      case "sidebar":
        rect(6, 6, 32, 88, false, 3);
        for (i = 0; i < 4; i++) line(12, 18 + i * 12, 30, 18 + i * 12);
        line(46, 14, 96, 14, true);
        rect(46, 24, 42, 26, false, 3);
        rect(92, 24, 42, 26, true, 3);
        for (i = 0; i < 3; i++) {
          line(46, 62 + i * 11, 124, 62 + i * 11);
        }
        break;
      case "chat":
        rect(10, 12, 74, 14, false, 7);
        rect(58, 32, 74, 14, true, 7);
        rect(10, 52, 60, 14, false, 7);
        rect(70, 72, 62, 14, true, 7);
        break;
      case "plan":
        line(10, 12, 64, 12, true);
        for (i = 0; i < 4; i++) {
          dot(15, 30 + i * 17, 4, i === 1);
          line(26, 30 + i * 17, 96, 30 + i * 17);
          rect(104, 25 + i * 17, 28, 10, i === 1, 5);
        }
        break;
      case "chart":
        line(12, 86, 132, 86);
        line(12, 14, 12, 86);
        o.push(
          '<polyline points="16,74 36,66 56,70 76,52 96,46 116,34 130,28" fill="none" stroke="' +
            ink +
            (stageIdx === 0 ? "0.4)" : "0.5)") +
            '" stroke-width="1.4"' +
            (stageIdx === 0 ? ' stroke-dasharray="3 2.5"' : "") +
            "/>",
        );
        for (i = 0; i < 6; i++)
          rect(20 + i * 19, 90 - (8 + i * 3), 9, 8 + i * 3, i === 5, 1.5);
        break;
      case "list":
        line(10, 12, 60, 12, true);
        for (i = 0; i < 5; i++) {
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
        for (i = 0; i < 5; i++)
          line(36, 28 + i * 10, 90 - (i % 2) * 14, 28 + i * 10);
        rect(36, 72, 30, 8, true, 4);
        break;
      case "board":
        for (j = 0; j < 3; j++) {
          rect(8 + j * 44, 8, 40, 84, false, 3);
          for (i = 0; i < 3 - (j === 2 ? 1 : 0); i++)
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
        for (j = 0; j < 3; j++) rect(10 + j * 42, 78, 38, 16, false, 2);
        break;
      case "split":
        rect(8, 8, 60, 84, false, 3);
        rect(74, 8, 60, 84, false, 3);
        rect(14, 14, 16, 9, true, 4.5);
        rect(80, 14, 16, 9, true, 4.5);
        for (i = 0; i < 5; i++) {
          line(14, 34 + i * 11, 60 - (i % 2) * 10, 34 + i * 11);
          line(80, 34 + i * 11, 126 - (i % 2) * 10, 34 + i * 11);
        }
        break;
      case "form":
        line(10, 12, 58, 12, true);
        for (i = 0; i < 3; i++) {
          line(10, 28 + i * 20, 34, 28 + i * 20);
          rect(10, 32 + i * 20, 122, 10, false, 2);
        }
        rect(92, 88, 40, 9, true, 4.5);
        break;
    }
    return (
      '<svg viewBox="0 0 142 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
      o.join("") +
      "</svg>"
    );
  }

  /* ---------- Geometry ---------- */

  var SLOTS_DESKTOP = [
    { a: 206, rotY: 24, rotZ: -3, text: "above", bend: -1 },
    { a: 150, rotY: 22, rotZ: 2, text: "below", bend: 1 },
    { a: 8, rotY: -24, rotZ: 2, text: "above", bend: -1 },
  ];
  var SLOTS_MOBILE = [
    { a: 222, rotY: 18, rotZ: -4 },
    { a: 140, rotY: 18, rotZ: 3 },
    { a: -14, rotY: -18, rotZ: 3 },
  ];

  function measure() {
    var sr = stage.getBoundingClientRect();
    var lr = lensEl.getBoundingClientRect();
    var mobile = mqMobile.matches;
    var R = lr.width / 2;
    geo = {
      W: sr.width,
      H: sr.height,
      cx: lr.left - sr.left + R,
      cy: lr.top - sr.top + R,
      R: R,
      mobile: mobile,
      rx: mobile ? 1.14 * R : 2.02 * R,
      ry: mobile ? 1.1 * R : 0.9 * R,
      tilt: mobile ? 0 : (-6 * Math.PI) / 180,
      slots: mobile ? SLOTS_MOBILE : SLOTS_DESKTOP,
      gw: ghostEls[0].offsetWidth,
      gh: ghostEls[0].offsetHeight,
      padL: sr.left,
      padR: document.documentElement.clientWidth - sr.right,
    };
    partEls.forEach(function (el) {
      el._w = 0;
    });
    orbitsSvg.setAttribute("viewBox", "0 0 " + geo.W + " " + geo.H);
    var orbits = orbitsSvg.querySelectorAll(".orbit");
    var sets = mobile
      ? [
          [1.14, 1.1, 0],
          [1.34, 1.3, 0],
          [0, 0, 0],
        ]
      : [
          [2.02, 0.9, -6],
          [1.46, 1.16, 4],
          [2.4, 1.06, -2],
        ];
    orbits.forEach(function (el, i) {
      var s = sets[i];
      el.setAttribute("cx", geo.cx);
      el.setAttribute("cy", geo.cy);
      el.setAttribute("rx", Math.max(0, s[0] * R));
      el.setAttribute("ry", Math.max(0, s[1] * R));
      el.setAttribute(
        "transform",
        "rotate(" + s[2] + " " + geo.cx + " " + geo.cy + ")",
      );
      el.style.display = s[0] ? "" : "none";
    });
    geo.beads = sets;
    var dpr = Math.min(
      window.devicePixelRatio || 1,
      mobile || matchMedia("(pointer: coarse)").matches ? 1 : 1.5,
    );
    geo.dpr = dpr;
    if (lens)
      lens.resize(canvas.getBoundingClientRect().width || R * 2 * 1.36, dpr);
    HZ.projects.forEach(function (p, i) {
      lensEl.querySelectorAll(".layer img").forEach(function (img) {
        if (+img.getAttribute("data-i") === i)
          HZ.fitVars(img.parentNode, p.size, p.focus);
      });
    });
  }

  function orbitPoint(angleDeg, rxK, ryK, tilt) {
    var a = (angleDeg * Math.PI) / 180;
    var x = geo.rx * rxK * Math.cos(a);
    var y = geo.ry * ryK * Math.sin(a);
    var c = Math.cos(tilt),
      s = Math.sin(tilt);
    return [geo.cx + x * c - y * s, geo.cy + x * s + y * c];
  }

  /* ---------- Transition state ---------- */

  function progress(now) {
    if (!tr || tr.waiting) return null;
    return clamp((now - tr.t0) / tr.dur, 0, 1);
  }

  function lensState(x) {
    if (x == null) return { pulse: 0, mix: 0, tintMix: 0, scale: 1, labels: 1 };
    var pulse =
      x < 0.32
        ? easeInOutSine(x / 0.32)
        : x < 0.6
          ? 1
          : 1 - easeOutCubic((x - 0.6) / 0.4);
    var mix = easeInOutCubic(seg(x, 0.28, 0.62));
    var tintMix = easeInOutSine(seg(x, 0.2, 0.75));
    var scale;
    if (x < 0.32) scale = 1 + 0.038 * easeInOutSine(x / 0.32);
    else if (x < 0.6) scale = 1.038;
    else {
      var y = (x - 0.6) / 0.4;
      scale = 1 + 0.038 * Math.exp(-4.6 * y) * Math.cos(2 * Math.PI * 1.15 * y);
    }
    var labels =
      x < 0.22
        ? 1 - easeInCubic(x / 0.22)
        : x < 0.62
          ? 0
          : easeOutCubic((x - 0.62) / 0.38);
    return {
      pulse: pulse,
      mix: mix,
      tintMix: tintMix,
      scale: scale,
      labels: labels,
    };
  }

  function ghostOffset(x, i, dir) {
    if (x == null) return { off: 0, op: 1 };
    var xi = clamp((x - i * 0.035) / 0.93, 0, 1);
    var D = 30;
    if (xi < SWAP_AT) {
      var t = xi / SWAP_AT;
      return { off: dir * D * easeInCubic(t), op: 1 - easeInCubic(t) };
    }
    var u = (xi - SWAP_AT) / (1 - SWAP_AT);
    return {
      off: -dir * D * (1 - easeOutBack(u)),
      op: easeOutCubic(clamp(u / 0.5, 0, 1)),
    };
  }

  /* ---------- Frame ---------- */

  function frame(now) {
    raf = 0;
    var time = (now - start) / 1000;
    var x = progress(now);
    if (x != null && x >= SWAP_AT && !tr.swapped) {
      tr.swapped = true;
      swapContent(tr.to);
    }
    var st = lensState(x);
    var breath = Math.sin(time * 0.9);

    pointer[0] = lerp(pointer[0], pointerTarget[0], 0.06);
    pointer[1] = lerp(pointer[1], pointerTarget[1], 0.06);

    if (glOn && lens) {
      var a = tr && !tr.waiting ? tr.from : current;
      var b = tr && !tr.waiting ? tr.to : current;
      var pa = P[a],
        pb = P[b];
      var drawn = lens.render({
        a: a,
        b: b,
        time: time,
        radiusPx: geo.R * geo.dpr * st.scale * (1 + 0.004 * breath),
        fitA: fitOf(pa),
        fitB: fitOf(pb),
        mix: tr && !tr.waiting ? st.mix : 0,
        pulse: st.pulse,
        dir: tr ? tr.dir : 1,
        tintMix: tr && !tr.waiting ? st.tintMix : 0,
        breath: breath,
        tintA: HZ.hexToVec(pa.tint),
        tintB: HZ.hexToVec(pb.tint),
        paperA: paper[a] || [0.98, 0.97, 0.95],
        paperB: paper[b] || [0.98, 0.97, 0.95],
        pointer: pointer,
      });
      if (!drawn) lensEl.setAttribute("data-gl", "off");
      else lensEl.setAttribute("data-gl", "on");
    }

    layoutOrbit(x, st, time);

    if (x === 1) finish();
    if (shouldRun()) raf = requestAnimationFrame(frame);
  }

  function layoutOrbit(x, st, time) {
    if (!geo) return;
    var dir = tr ? tr.dir : 1;
    var slots = geo.slots;
    for (var i = 0; i < 3; i++) {
      var s = slots[i];
      var g = ghostOffset(x, i, dir);
      var sway = motionOK() ? Math.sin(time * 0.35 + i * 2.1) * 1.4 : 0;
      var ang = s.a + g.off + sway;
      var pt = orbitPoint(ang, 1, 1, geo.tilt);
      var depth = Math.sin((ang * Math.PI) / 180);
      var scale = 1 + 0.07 * depth;
      var px = pt[0] - geo.gw / 2 + pointer[0] * (8 + 4 * depth);
      var py = pt[1] - geo.gh / 2 + pointer[1] * -6;
      ghostEls[i].style.transform =
        "translate3d(" +
        px.toFixed(2) +
        "px," +
        py.toFixed(2) +
        "px,0) rotateY(" +
        s.rotY +
        "deg) rotateZ(" +
        s.rotZ +
        "deg) scale(" +
        scale.toFixed(3) +
        ")";
      ghostEls[i].style.opacity = (0.92 * g.op).toFixed(3);
      ghostEls[i]._pt = pt;
      ghostEls[i]._scale = scale;
      ghostEls[i]._c = [px + geo.gw / 2, py + geo.gh / 2];
    }

    beadEls.forEach(function (b, i) {
      var set = geo.beads[i];
      if (!set || !set[0]) {
        b.style.display = "none";
        return;
      }
      b.style.display = "";
      var speed = [0.05, -0.035, 0.028][i];
      var ang =
        (motionOK() ? time * speed * 57.3 : 0) +
        [300, 40, 120][i] +
        st.pulse * 18 * dir;
      var a = (ang * Math.PI) / 180;
      var tilt = (set[2] * Math.PI) / 180;
      var ex = set[0] * geo.R * Math.cos(a),
        ey = set[1] * geo.R * Math.sin(a);
      b.setAttribute(
        "cx",
        (geo.cx + ex * Math.cos(tilt) - ey * Math.sin(tilt)).toFixed(2),
      );
      b.setAttribute(
        "cy",
        (geo.cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)).toFixed(2),
      );
    });

    if (geo.mobile) {
      for (var m = 0; m < 3; m++) {
        var lp = clamp(st.labels * 1.25 - m * 0.12, 0, 1);
        partEls[m].style.transform =
          "translate3d(0," + ((1 - lp) * 6).toFixed(2) + "px,0)";
        partEls[m].style.opacity = lp.toFixed(3);
        if (partEls[m]._left !== undefined) {
          partEls[m].removeAttribute("data-side");
          partEls[m]._left = undefined;
        }
        connectorEls[m].style.display = "none";
      }
      return;
    }

    for (var k = 0; k < 3; k++) {
      var gp = ghostEls[k]._pt;
      var ux = gp[0] - geo.cx,
        uy = gp[1] - geo.cy;
      var ul = Math.hypot(ux, uy) || 1;
      ux /= ul;
      uy /= ul;
      var p0 = [
        geo.cx + ux * geo.R * st.scale * 1.03,
        geo.cy + uy * geo.R * st.scale * 1.03,
      ];
      var halfExtent =
        Math.abs(ux) * geo.gw * 0.5 * ghostEls[k]._scale +
        Math.abs(uy) * geo.gh * 0.5;
      var p1 = [gp[0] - ux * (halfExtent + 6), gp[1] - uy * (halfExtent + 6)];
      var mx = (p0[0] + p1[0]) / 2,
        my = (p0[1] + p1[1]) / 2;
      var len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      var bend = slots[k].bend * len * 0.16;
      var c = [mx - uy * bend, my + ux * bend];
      var path = connectorEls[k];
      path.style.display = "";
      path.setAttribute(
        "d",
        "M" +
          p0[0].toFixed(1) +
          " " +
          p0[1].toFixed(1) +
          " Q" +
          c[0].toFixed(1) +
          " " +
          c[1].toFixed(1) +
          " " +
          p1[0].toFixed(1) +
          " " +
          p1[1].toFixed(1),
      );
      var L = len * 1.04 + 2;
      var lp2 = clamp(st.labels * 1.15 - k * 0.07, 0, 1);
      path.style.strokeDasharray = L + " " + L;
      path.style.strokeDashoffset = (L * (1 - lp2)).toFixed(2);
      var dotIn = easeOutCubic(seg(lp2, 0.5, 0.85));
      var textIn = easeOutCubic(seg(lp2, 0.6, 1));
      var el = partEls[k];
      // Labels sit on the ghost's outer side so they cover neither the lens nor the ghost;
      // when the viewport is too narrow they tuck above or below the ghost instead.
      var left = ux < -0.15;
      if (el._left !== left) {
        el._left = left;
        el.setAttribute("data-side", left ? "left" : "right");
        el._w = 0;
      }
      if (!el._w) {
        el._w = el.offsetWidth;
        el._h = el.offsetHeight;
      }
      var gc = ghostEls[k]._c,
        gs = ghostEls[k]._scale;
      var gl = gc[0] - geo.gw * 0.5 * gs,
        gr = gc[0] + geo.gw * 0.5 * gs;
      var gt = gc[1] - geo.gh * 0.5 * gs,
        gb = gc[1] + geo.gh * 0.5 * gs;
      var gap = 14,
        lx,
        ly;
      if (
        left
          ? gl - gap - el._w >= 16 - geo.padL
          : gr + gap + el._w <= geo.W + geo.padR - 16
      ) {
        lx = left ? gl - gap - el._w : gr + gap;
        ly = gc[1] - el._h / 2;
      } else {
        lx = left ? gr - el._w : gl;
        ly = slots[k].text === "below" ? gb + 10 : gt - 10 - el._h;
      }
      el.style.transform =
        "translate3d(" + lx.toFixed(1) + "px," + ly.toFixed(1) + "px,0)";
      el.style.opacity = "1";
      el._dot.style.transform = "scale(" + dotIn.toFixed(3) + ")";
      el._text.style.opacity = textIn.toFixed(3);
      el._text.style.transform =
        "translate3d(" +
        ((1 - textIn) * (left ? 8 : -8)).toFixed(1) +
        "px,0,0)";
    }
  }

  function shouldRun() {
    return motionOK() && inView && !document.hidden;
  }
  function kick() {
    if (!raf && shouldRun()) raf = requestAnimationFrame(frame);
  }
  function renderStill() {
    // Used when the loop is not running (reduced motion or offscreen) so the static layout stays correct.
    if (!geo) return;
    layoutOrbit(null, lensState(null), 0);
  }

  /* ---------- Selection ---------- */

  function ensureImage(i) {
    return images[i].ready;
  }

  function select(i, dir) {
    i = (i + N) % N;
    if (dir == null) dir = i > requested ? 1 : -1;
    requested = i;
    updateTabs(i);
    ctaEl.setAttribute("href", "caso.html?p=" + P[i].slug);

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

    var now = performance.now();
    var x = progress(now);
    if (!tr) {
      if (i === current) return;
      begin(current, i, dir);
    } else if (tr.waiting || (x != null && x < RETARGET_BEFORE)) {
      if (i === tr.from && x != null && x < 0.12) {
        pending = null;
      }
      tr.to = i;
      tr.dir = dir;
      pending = null;
      if (!glOn) domPrepare(i);
      ensureImage(i).then(function () {
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

  function begin(from, to, dir, dur) {
    tr = {
      from: from,
      to: to,
      dir: dir,
      dur: dur || DURATION,
      t0: 0,
      waiting: true,
      swapped: false,
    };
    if (!glOn) domPrepare(to);
    lensEl.classList.remove("inhale");
    ensureImage(to).then(function () {
      if (!tr || tr.to !== to) return;
      tr.waiting = false;
      tr.t0 = performance.now();
      if (!glOn) domRun();
      kick();
    });
    kick();
  }

  function finish() {
    var done = tr;
    tr = null;
    current = done.to;
    if (!done.swapped) swapContent(current);
    domSettle(current);
    announce(current);
    if (pending != null && pending !== current) {
      var p = pending;
      pending = null;
      begin(current, p, p > current ? 1 : -1, 780);
    } else {
      pending = null;
    }
  }

  function swapContent(i) {
    var p = P[i];
    var lang = HZ.lang;
    document.documentElement.style.setProperty("--wash", p.tint);
    captionEl.setAttribute("data-swap", "out");
    setTimeout(
      function () {
        captionEl.querySelector(".status").textContent =
          name(p) + " · " + p.status[lang];
        captionEl.querySelector(".purpose").textContent = p.purpose[lang];
        captionEl.setAttribute("data-swap", "in");
      },
      motionOK() ? 160 : 0,
    );
    for (var k = 0; k < 3; k++) {
      var part = p.parts[k];
      ghostEls[k].innerHTML = ghostSVG(part.kind, k, p.tint);
      ghostEls[k].setAttribute("data-stage", String(k));
      partEls[k]._name.textContent = part[lang];
      partEls[k]._w = 0;
      partEls[k]._ver.textContent = HZ.versions[lang][k];
      partEls[k]._dot.style.setProperty(
        "--dot",
        [HZ.pastel.honey, HZ.pastel.apricot, HZ.pastel.olive][k],
      );
    }
    stage.setAttribute("aria-labelledby", "tab-" + p.slug);
  }

  function announce(i) {
    announceEl.textContent = name(P[i]) + ". " + P[i].purpose[HZ.lang];
  }

  function updateTabs(i) {
    tabsEl.querySelectorAll('[role="tab"]').forEach(function (t, k) {
      var on = k === i;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (geo && geo.mobile) {
      var t = tabsEl.children[i];
      var left = t.offsetLeft - (tabsEl.clientWidth - t.offsetWidth) / 2;
      tabsEl.scrollTo({ left: left, behavior: motionOK() ? "smooth" : "auto" });
    }
  }

  /* ---------- DOM lens (fallback and poster) ---------- */

  var layers;
  function domLayers() {
    var ls = lensEl.querySelectorAll(".layer");
    var cur = ls[0].classList.contains("incoming") ? ls[1] : ls[0];
    var inc = cur === ls[0] ? ls[1] : ls[0];
    return { cur: cur, inc: inc };
  }
  function setLayerImage(layer, i, withAlt) {
    var img = layer.querySelector("img");
    img.setAttribute("data-i", String(i));
    img.src = P[i].texture;
    img.alt = withAlt ? P[i].alt[HZ.lang] : "";
    HZ.fitVars(layer, P[i].size, P[i].focus);
  }
  function domPrepare(i) {
    layers = domLayers();
    layers.inc.classList.remove("reveal");
    layers.inc.style.clipPath = "";
    layers.inc.style.opacity = "";
    setLayerImage(layers.inc, i, false);
  }
  function domRun() {
    layers = domLayers();
    lensEl.classList.remove("inhale");
    void lensEl.offsetWidth;
    lensEl.classList.add("inhale");
    setTimeout(function () {
      layers.inc.classList.add("reveal");
      layers.cur.classList.add("outgoing", "leave");
    }, 280);
  }
  function domSettle(i) {
    layers = domLayers();
    if (
      !glOn &&
      +layers.inc.querySelector("img").getAttribute("data-i") === i &&
      layers.inc.classList.contains("reveal")
    ) {
      var oldCur = layers.cur;
      layers.inc.classList.remove("incoming", "reveal");
      layers.inc.querySelector("img").alt = P[i].alt[HZ.lang];
      oldCur.classList.remove("outgoing", "leave");
      oldCur.classList.add("incoming");
      oldCur.querySelector("img").alt = "";
    } else {
      setLayerImage(layers.cur, i, true);
    }
    lensEl.classList.remove("inhale");
  }
  function crossfadeDom(i) {
    layers = domLayers();
    var inc = layers.inc,
      cur = layers.cur;
    setLayerImage(inc, i, false);
    inc.style.clipPath = "none";
    inc.style.opacity = "0";
    inc.classList.add("fade");
    void inc.offsetWidth;
    inc.style.opacity = "1";
    setTimeout(function () {
      inc.classList.remove("incoming", "fade");
      inc.style.clipPath = "";
      inc.style.opacity = "";
      inc.querySelector("img").alt = P[i].alt[HZ.lang];
      cur.classList.add("incoming");
      cur.querySelector("img").alt = "";
      announce(i);
    }, 200);
  }

  /* ---------- WebGL lifecycle ---------- */

  function startGL() {
    if (lens || !motionOK()) return;
    lens = HZ.createLens(canvas, {
      onLost: function () {
        glOn = false;
        lensEl.setAttribute("data-gl", "off");
      },
      onRestored: function () {
        glOn = true;
        kick();
      },
    });
    if (!lens) {
      glOn = false;
      lensEl.setAttribute("data-gl", "off");
      return;
    }
    glOn = true;
    lensEl.setAttribute("data-renderer", "webgl" + lens.version);
    images.forEach(function (im, i) {
      im.ready.then(function () {
        if (lens) lens.addTexture(i, im.img);
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
    lensEl.setAttribute("data-gl", "off");
    lensEl.removeAttribute("data-renderer");
  }

  function samplePaper(img) {
    try {
      var c = document.createElement("canvas");
      c.width = 8;
      c.height = 8;
      var ctx = c.getContext("2d");
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
      var d = ctx.getImageData(0, 7, 1, 1).data;
      var e = ctx.getImageData(7, 7, 1, 1).data;
      return [(d[0] + e[0]) / 510, (d[1] + e[1]) / 510, (d[2] + e[2]) / 510];
    } catch (err) {
      return [0.98, 0.97, 0.95];
    }
  }

  function loadImages() {
    images = P.map(function (p, i) {
      var img = new Image();
      img.decoding = "async";
      var ready = new Promise(function (res) {
        img.onload = function () {
          paper[i] = samplePaper(img);
          res();
        };
        img.onerror = function () {
          res();
        };
      });
      img.src = p.texture;
      return { img: img, ready: ready };
    });
  }

  /* ---------- Sections ---------- */

  function renderWork() {
    var lang = HZ.lang;
    var list = $("#work-list");
    list.innerHTML = "";
    P.forEach(function (p, i) {
      var li = document.createElement("li");
      li.className = "work-row";
      li.id = "work-" + p.slug;
      var links = [];
      links.push(
        '<a class="text-link" href="caso.html?p=' +
          p.slug +
          '" data-vt-from="#orb-' +
          p.slug +
          '">' +
          HZ.t("work.case") +
          ' <span aria-hidden="true">→</span></a>',
      );
      if (p.live)
        links.push(
          '<a class="text-link" href="' +
            p.live.href +
            '" rel="noopener" target="_blank">' +
            p.live[lang] +
            ' <span aria-hidden="true">↗</span></a>',
        );
      li.innerHTML =
        '<div class="w-left"><h3>' +
        name(p) +
        '</h3><span class="meta">' +
        p.status[lang] +
        "</span>" +
        (p.brand ? '<span class="meta">' + p.brand[lang] + "</span>" : "") +
        "</div>" +
        '<div class="w-axis"><span class="w-orb" id="orb-' +
        p.slug +
        '" style="--tint:' +
        p.tint +
        '"><img src="' +
        p.texture +
        '" alt="" loading="lazy" decoding="async"></span></div>' +
        '<div class="w-right"><p class="purpose">' +
        p.purpose[lang] +
        '</p><p class="contrib">' +
        p.contribution[lang] +
        '</p><div class="links">' +
        links.join("") +
        "</div></div>";
      list.appendChild(li);
      HZ.fitVars(li.querySelector(".w-orb"), p.size, p.focus);
    });
  }

  function renderCareer() {
    var lang = HZ.lang;
    var ol = $("#career-line");
    ol.innerHTML = "";
    HZ.career
      .slice()
      .reverse()
      .forEach(function (c) {
        var li = document.createElement("li");
        li.innerHTML =
          '<span class="pe">' +
          c.period[lang] +
          '</span><span class="co">' +
          c.company +
          '</span><span class="ti">' +
          c.title +
          '</span><span class="sh">' +
          c.short[lang] +
          "</span>";
        ol.appendChild(li);
      });
    var f = HZ.founder;
    $("#founder-line").innerHTML =
      '<span class="co">' +
      f.company +
      '</span><span class="track" aria-hidden="true"></span><span class="pe">' +
      f.period[lang] +
      "</span>" +
      '<p class="desc">' +
      f.title +
      " · " +
      HZ.t("career.parallel") +
      " · " +
      f.short[lang] +
      "</p>";
  }

  function renderTabs() {
    tabsEl.innerHTML = "";
    P.forEach(function (p, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tab";
      b.id = "tab-" + p.slug;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "stage");
      b.style.setProperty("--tab-tint", p.tint);
      b.innerHTML =
        '<span class="tab-dot" aria-hidden="true"></span>' + name(p);
      b.addEventListener("click", function () {
        select(i);
      });
      tabsEl.appendChild(b);
    });
    updateTabs(requested);
  }

  function onTabKey(e) {
    var map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    var i;
    if (e.key in map) i = requested + map[e.key];
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = N - 1;
    else return;
    e.preventDefault();
    var dir = e.key === "Home" ? -1 : e.key === "End" ? 1 : map[e.key];
    i = (i + N) % N;
    select(i, dir);
    tabsEl.children[i].focus();
  }

  /* ---------- Input ---------- */

  function bindInput() {
    tabsEl.addEventListener("keydown", onTabKey);

    var sx = 0,
      sy = 0,
      sid = null;
    stage.addEventListener("pointerdown", function (e) {
      sid = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
    });
    stage.addEventListener("pointerup", function (e) {
      if (e.pointerId !== sid) return;
      sid = null;
      var dx = e.clientX - sx,
        dy = e.clientY - sy;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        var dir = dx < 0 ? 1 : -1;
        select(requested + dir, dir);
      }
    });
    stage.addEventListener("pointercancel", function () {
      sid = null;
    });

    lensEl.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        select(requested + 1, 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        select(requested - 1, -1);
      }
    });

    hero.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var r = hero.getBoundingClientRect();
      pointerTarget[0] = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      pointerTarget[1] = clamp(
        -(((e.clientY - r.top) / r.height) * 2 - 1),
        -1,
        1,
      );
    });
    hero.addEventListener("pointerleave", function () {
      pointerTarget = [0, 0];
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        kick();
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", kick);

    var onMotionChange = function () {
      if (motionOK()) {
        startGL();
        kick();
      } else {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (tr) {
          var to = tr.to;
          tr = null;
          current = to;
          swapContent(to);
        }
        pending = null;
        stopGL();
        domSettle(current);
        renderStill();
      }
    };
    HZ.reducedMotion.addEventListener("change", onMotionChange);

    var ro =
      "ResizeObserver" in window
        ? new ResizeObserver(function () {
            measure();
            renderStill();
            kick();
          })
        : null;
    if (ro) ro.observe(stage);
    else
      window.addEventListener("resize", function () {
        measure();
        renderStill();
      });

    var loop = $(".loop");
    if (loop && "IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          loop.setAttribute(
            "data-live",
            String(entries[0].isIntersecting && motionOK()),
          );
        },
        { threshold: 0.35 },
      ).observe(loop);
    }
  }

  /* ---------- Boot ---------- */

  function boot() {
    HZ.initSite();
    hero = $(".hero");
    stage = $("#stage");
    lensEl = $("#lens");
    canvas = lensEl.querySelector("canvas");
    tabsEl = $(".tabs");
    captionEl = $(".caption");
    ctaEl = $("#hero-cta");
    announceEl = $("#announce");
    orbitsSvg = $(".orbits");
    beadEls = Array.prototype.slice.call(orbitsSvg.querySelectorAll(".bead"));
    connectorEls = Array.prototype.slice.call(
      orbitsSvg.querySelectorAll(".connector"),
    );
    ghostEls = Array.prototype.slice.call(document.querySelectorAll(".ghost"));
    partEls = Array.prototype.slice.call(document.querySelectorAll(".part"));
    partEls.forEach(function (el) {
      el._dot = el.querySelector(".dot");
      el._text = el.querySelector(".text");
      el._name = el.querySelector(".name");
      el._ver = el.querySelector(".ver");
    });

    var q = new URLSearchParams(location.search).get("p");
    var qi = P.findIndex(function (p) {
      return p.slug === q;
    });
    current = requested = qi >= 0 ? qi : 0;

    var ls = lensEl.querySelectorAll(".layer");
    setLayerImage(ls[0], current, true);
    setLayerImage(ls[1], (current + 1) % N, false);

    renderTabs();
    swapContent(current);
    captionEl.setAttribute("data-swap", "in");
    ctaEl.setAttribute("href", "caso.html?p=" + P[current].slug);
    renderWork();
    renderCareer();
    loadImages();
    measure();
    bindInput();
    startGL();
    renderStill();
    kick();

    HZ.onLang(function () {
      renderTabs();
      renderWork();
      renderCareer();
      swapContent(tr ? tr.to : current);
      domSettle(tr ? tr.from : current);
      requestAnimationFrame(function () {
        measure();
        renderStill();
      });
    });

    window.HZ.debug = {
      select: select,
      state: function () {
        return {
          current: current,
          requested: requested,
          pending: pending,
          transitioning: !!tr,
          renderer: lensEl.getAttribute("data-renderer") || "css",
          running: !!raf,
          gl: glOn,
        };
      },
    };
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
