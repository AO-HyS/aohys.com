/*
  Horizonte lens: a refractive daylight sphere rendered with one fullscreen
  triangle. WebGL2 (GLSL 300 es) first, WebGL1 (GLSL 100) fallback; both are
  generated from the same source through a few macros.
*/
(function () {
  "use strict";

  var VERT_BODY = [
    "ATTR vec2 aPos;",
    "VARY_OUT vec2 vUv;",
    "void main() {",
    "  vUv = aPos * 0.5 + 0.5;",
    "  gl_Position = vec4(aPos, 0.0, 1.0);",
    "}",
  ].join("\n");

  var FRAG_BODY = [
    "precision highp float;",
    "VARY_IN vec2 vUv;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform float uR;",
    "uniform sampler2D uTexA;",
    "uniform sampler2D uTexB;",
    "uniform vec4 uFitA;",
    "uniform vec4 uFitB;",
    "uniform float uMix;",
    "uniform float uPulse;",
    "uniform float uDir;",
    "uniform float uTintMix;",
    "uniform float uBreath;",
    "uniform vec3 uTintA;",
    "uniform vec3 uTintB;",
    "uniform vec3 uPaperA;",
    "uniform vec3 uPaperB;",
    "uniform vec2 uPointer;",
    "FRAG_DECL",
    "",
    "const vec3 INK = vec3(0.278, 0.235, 0.200);",
    "const vec3 HONEY = vec3(0.988, 0.890, 0.651);",
    "const vec3 OLIVE = vec3(0.839, 0.886, 0.706);",
    "const vec3 APRICOT = vec3(0.992, 0.824, 0.694);",
    "",
    "float hash(vec2 p) {",
    "  p = fract(p * vec2(123.34, 456.21));",
    "  p += dot(p, p + 45.32);",
    "  return fract(p.x * p.y);",
    "}",
    "float vnoise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),",
    "             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);",
    "}",
    "mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c, -s, s, c); }",
    "",
    "vec3 samp(sampler2D tx, vec4 fit, vec3 paper, vec2 q) {",
    "  vec2 uv = vec2(fit.z + q.x * fit.x, fit.w - q.y * fit.y);",
    "  vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));",
    "  vec3 c = TEX(tx, clamp(uv, 0.001, 0.999)).rgb;",
    "  return mix(paper, c, inside.x * inside.y);",
    "}",
    "vec3 sampCA(sampler2D tx, vec4 fit, vec3 paper, vec2 q, float ca) {",
    "  return vec3(samp(tx, fit, paper, q * (1.0 + ca)).r,",
    "              samp(tx, fit, paper, q).g,",
    "              samp(tx, fit, paper, q * (1.0 - ca)).b);",
    "}",
    "",
    "vec4 over(vec4 top, vec4 under) { return top + under * (1.0 - top.a); }",
    "",
    "void main() {",
    "  vec2 frag = vUv * uRes;",
    "  vec2 p = (frag - 0.5 * uRes) / uR;",
    "  float d = length(p);",
    "  float aa = 1.5 / uR;",
    "  vec3 tint = mix(uTintA, uTintB, uTintMix);",
    "",
    // soft floor shadow and a pastel caustic where daylight focuses through the sphere
    "  vec2 sp = (p - vec2(0.0, -1.07)) / vec2(0.8, 0.1);",
    "  float sh = exp(-dot(sp, sp) * 1.4) * 0.09;",
    "  vec4 outside = vec4(INK * sh, sh);",
    "  vec2 cp = (p - vec2(0.16 + uPointer.x * 0.05, -1.03)) / vec2(0.46, 0.065);",
    "  float cs = exp(-dot(cp, cp) * 1.8) * (0.5 + 0.2 * uPulse);",
    "  outside = over(vec4(mix(tint, vec3(1.0), 0.15) * cs, cs), outside);",
    "  float halo = smoothstep(1.3, 1.0, d) * (0.18 + 0.16 * uPulse);",
    "  outside = over(vec4(tint * halo, halo), outside);",
    "  if (d > 1.0 + aa) { FRAG_OUT = outside; return; }",
    "",
    "  float z = sqrt(max(0.0, 1.0 - d * d));",
    "  float rim = 1.0 - z;",
    "  vec2 dirv = d > 0.0001 ? p / d : vec2(0.0);",
    // barrel refraction: the image compresses toward the rim, like looking through a ball of glass
    "  float k = 0.42 + 0.03 * uBreath + 0.28 * uPulse;",
    "  vec2 q = p * (1.0 + k * pow(d, 3.2));",
    "  q -= uPointer * 0.05 * z;",
    "  float ripple = sin(d * 17.0 - uTime * 8.5) * 0.032 * uPulse * smoothstep(1.0, 0.12, d);",
    "  q += dirv * ripple;",
    "  float sw = uPulse * uDir * 2.1 * pow(1.0 - d, 1.35);",
    "  vec2 qa = rot(sw * (0.55 + uMix)) * q;",
    "  vec2 qb = rot(-sw * (1.0 - uMix) * 1.25) * q;",
    "  float cab = 0.011 * rim * rim + 0.022 * uPulse * rim;",
    "",
    // next interface resolves from the centre outward through a soft noise front
    "  float n = vnoise(p * 3.1 + vec2(uTime * 0.55, -uTime * 0.4));",
    "  float reveal = 1.0 - d * 0.75 + (n - 0.5) * 0.36;",
    "  float thr = mix(1.45, -0.45, uMix);",
    "  float m = smoothstep(thr - 0.14, thr + 0.14, reveal);",
    "  vec3 col;",
    "  if (m < 0.002) {",
    "    col = sampCA(uTexA, uFitA, uPaperA, qa, cab);",
    "  } else if (m > 0.998) {",
    "    col = sampCA(uTexB, uFitB, uPaperB, qb, cab);",
    "  } else {",
    "    col = mix(sampCA(uTexA, uFitA, uPaperA, qa, cab), sampCA(uTexB, uFitB, uPaperB, qb, cab), m);",
    "  }",
    "  float front = 1.0 - abs(m * 2.0 - 1.0);",
    "  col = mix(col, mix(vec3(1.0), tint, 0.55), front * 0.6 * uPulse);",
    "  col = mix(col, vec3(1.0, 0.996, 0.988), 0.1 * uPulse);",
    "",
    "  vec3 N = normalize(vec3(p, z));",
    "  vec3 L = normalize(vec3(-0.5 + uPointer.x * 0.25, 0.62 + uPointer.y * 0.2, 0.62));",
    "  float diff = dot(N, L);",
    "  col *= 0.958 + 0.06 * diff;",
    "  col = mix(col, tint, clamp(0.5 * pow(rim, 1.6) + 0.025 + 0.1 * uPulse, 0.0, 1.0));",
    "",
    "  float ang = atan(p.y, p.x);",
    "  vec3 iri = mix(mix(HONEY, APRICOT, 0.5 + 0.5 * sin(ang * 2.0 + uTime * 0.25)),",
    "                 OLIVE, 0.5 + 0.5 * sin(ang * 3.0 - uTime * 0.18 + 1.3));",
    "  float fr = pow(rim, 3.4);",
    "  col = mix(col, iri, fr * 0.42);",
    "  col = mix(col, vec3(1.0), fr * 0.24);",
    "",
    "  vec3 R = reflect(-L, N);",
    "  float spec = pow(max(R.z, 0.0), 42.0);",
    "  col += vec3(1.0, 0.99, 0.97) * spec * 0.42;",
    "  vec2 hp = rot(0.62) * (p - vec2(-0.4, 0.5));",
    "  float win = smoothstep(0.2, 0.0, length(max(abs(hp) - vec2(0.2, 0.045), 0.0)));",
    "  col = mix(col, vec3(1.0), win * (0.34 + 0.04 * uBreath));",
    "  float bounce = smoothstep(0.2, 1.0, -p.y) * fr * 0.7;",
    "  col = mix(col, tint, bounce);",
    "",
    "  float edge = smoothstep(1.0 - 3.5 * aa, 1.0 - aa, d);",
    "  col = mix(col, INK, edge * 0.2);",
    "  float a = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, d);",
    "  FRAG_OUT = over(vec4(col * a, a), outside);",
    "}",
  ].join("\n");

  function build(isGL2) {
    if (isGL2) {
      return {
        vert:
          "#version 300 es\n" +
          VERT_BODY.replace(/ATTR/g, "in").replace(/VARY_OUT/g, "out"),
        frag:
          "#version 300 es\n" +
          FRAG_BODY.replace(/VARY_IN/g, "in")
            .replace("FRAG_DECL", "out vec4 fragColor;")
            .replace(/FRAG_OUT/g, "fragColor")
            .replace(/TEX\(/g, "texture("),
      };
    }
    return {
      vert: VERT_BODY.replace(/ATTR/g, "attribute").replace(
        /VARY_OUT/g,
        "varying",
      ),
      frag: FRAG_BODY.replace(/VARY_IN/g, "varying")
        .replace("FRAG_DECL", "")
        .replace(/FRAG_OUT/g, "gl_FragColor")
        .replace(/TEX\(/g, "texture2D("),
    };
  }

  function hexToVec(hex) {
    var h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }

  function createLens(canvas, hooks) {
    hooks = hooks || {};
    var gl = null;
    var isGL2 = false;
    var prog = null;
    var buf = null;
    var loc = {};
    var textures = {};
    var images = {};
    var lost = false;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        var log = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error("shader: " + log);
      }
      return s;
    }

    function setup() {
      var src = build(isGL2);
      var vs = compile(gl.VERTEX_SHADER, src.vert);
      var fs = compile(gl.FRAGMENT_SHADER, src.frag);
      prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, "aPos");
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        throw new Error("link: " + gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      [
        "uRes",
        "uTime",
        "uR",
        "uTexA",
        "uTexB",
        "uFitA",
        "uFitB",
        "uMix",
        "uPulse",
        "uDir",
        "uTintMix",
        "uBreath",
        "uTintA",
        "uTintB",
        "uPaperA",
        "uPaperB",
        "uPointer",
      ].forEach(function (n) {
        loc[n] = gl.getUniformLocation(prog, n);
      });
      gl.uniform1i(loc.uTexA, 0);
      gl.uniform1i(loc.uTexB, 1);
      gl.clearColor(0, 0, 0, 0);
      textures = {};
      Object.keys(images).forEach(function (key) {
        upload(key, images[key]);
      });
    }

    function upload(key, img) {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textures[key] = tex;
    }

    function onLost(e) {
      e.preventDefault();
      lost = true;
      if (hooks.onLost) hooks.onLost();
    }
    function onRestored() {
      lost = false;
      try {
        setup();
        if (hooks.onRestored) hooks.onRestored();
      } catch (err) {
        if (hooks.onLost) hooks.onLost();
      }
    }

    var attrs = {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    };
    try {
      gl = canvas.getContext("webgl2", attrs);
      isGL2 = !!gl;
      if (!gl)
        gl =
          canvas.getContext("webgl", attrs) ||
          canvas.getContext("experimental-webgl", attrs);
      if (!gl) return null;
      setup();
    } catch (err) {
      if (window.console)
        console.warn(
          "[horizonte] WebGL unavailable, using CSS lens.",
          err && err.message,
        );
      return null;
    }

    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);

    return {
      version: isGL2 ? 2 : 1,
      addTexture: function (key, img) {
        images[key] = img;
        if (!lost) upload(key, img);
      },
      has: function (key) {
        return !!textures[key];
      },
      resize: function (cssSize, dpr) {
        var px = Math.max(2, Math.round(cssSize * dpr));
        if (canvas.width !== px || canvas.height !== px) {
          canvas.width = px;
          canvas.height = px;
        }
      },
      render: function (s) {
        if (lost || !textures[s.a] || !textures[s.b]) return false;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[s.a]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures[s.b]);
        gl.uniform2f(loc.uRes, canvas.width, canvas.height);
        gl.uniform1f(loc.uTime, s.time);
        gl.uniform1f(loc.uR, s.radiusPx);
        gl.uniform4fv(loc.uFitA, s.fitA);
        gl.uniform4fv(loc.uFitB, s.fitB);
        gl.uniform1f(loc.uMix, s.mix);
        gl.uniform1f(loc.uPulse, s.pulse);
        gl.uniform1f(loc.uDir, s.dir);
        gl.uniform1f(loc.uTintMix, s.tintMix);
        gl.uniform1f(loc.uBreath, s.breath);
        gl.uniform3fv(loc.uTintA, s.tintA);
        gl.uniform3fv(loc.uTintB, s.tintB);
        gl.uniform3fv(loc.uPaperA, s.paperA);
        gl.uniform3fv(loc.uPaperB, s.paperB);
        gl.uniform2f(loc.uPointer, s.pointer[0], s.pointer[1]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return true;
      },
      destroy: function () {
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
        if (!lost) {
          Object.keys(textures).forEach(function (k) {
            gl.deleteTexture(textures[k]);
          });
          gl.deleteBuffer(buf);
          gl.deleteProgram(prog);
        }
        var ext = gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
        textures = {};
        images = {};
      },
    };
  }

  window.HZ = window.HZ || {};
  HZ.createLens = createLens;
  HZ.hexToVec = hexToVec;
})();
