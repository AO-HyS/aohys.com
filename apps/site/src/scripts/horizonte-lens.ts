/*
  Horizonte lens: a refractive daylight sphere rendered with one fullscreen
  triangle. WebGL2 (GLSL 300 es) first, WebGL1 (GLSL 100) fallback, both built
  from the same source through a few macros.
*/

const VERT_BODY = [
  "ATTR vec2 aPos;",
  "VARY_OUT vec2 vUv;",
  "void main() {",
  "  vUv = aPos * 0.5 + 0.5;",
  "  gl_Position = vec4(aPos, 0.0, 1.0);",
  "}",
].join("\n");

const FRAG_BODY = [
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
  "  float k = 0.3 + 0.03 * uBreath + 0.28 * uPulse;",
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

function build(isGL2: boolean) {
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

export function hexToVec(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export interface LensFrame {
  a: number;
  b: number;
  time: number;
  radiusPx: number;
  fitA: number[];
  fitB: number[];
  mix: number;
  pulse: number;
  dir: number;
  tintMix: number;
  breath: number;
  tintA: number[];
  tintB: number[];
  paperA: number[];
  paperB: number[];
  pointer: number[];
}

export interface Lens {
  version: 1 | 2;
  addTexture(key: number, img: TexImageSource): void;
  /* Re-upload an existing texture in place, for animated canvas sources. */
  updateTexture(key: number, source: TexImageSource): void;
  resize(cssSize: number, dpr: number): void;
  render(frame: LensFrame): boolean;
  destroy(): void;
}

type GL = WebGLRenderingContext | WebGL2RenderingContext;

const UNIFORMS = [
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
] as const;

type UniformName = (typeof UNIFORMS)[number];

export function createLens(
  canvas: HTMLCanvasElement,
  hooks: { onLost?: () => void; onRestored?: () => void } = {},
): Lens | null {
  let gl: GL | null = null;
  let isGL2 = false;
  let prog: WebGLProgram | null = null;
  let buf: WebGLBuffer | null = null;
  const loc = new Map<UniformName, WebGLUniformLocation | null>();
  let textures = new Map<number, WebGLTexture>();
  let images = new Map<number, TexImageSource>();
  let lost = false;

  const u = (name: UniformName) => loc.get(name) ?? null;

  function compile(ctx: GL, type: number, src: string) {
    const shader = ctx.createShader(type);
    if (!shader) throw new Error("shader: create failed");
    ctx.shaderSource(shader, src);
    ctx.compileShader(shader);
    if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
      const log = ctx.getShaderInfoLog(shader);
      ctx.deleteShader(shader);
      throw new Error("shader: " + log);
    }
    return shader;
  }

  function upload(ctx: GL, key: number, img: TexImageSource) {
    const tex = ctx.createTexture();
    if (!tex) return;
    ctx.bindTexture(ctx.TEXTURE_2D, tex);
    ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, false);
    ctx.texImage2D(
      ctx.TEXTURE_2D,
      0,
      ctx.RGBA,
      ctx.RGBA,
      ctx.UNSIGNED_BYTE,
      img,
    );
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    textures.set(key, tex);
  }

  function setup(ctx: GL) {
    const src = build(isGL2);
    const vs = compile(ctx, ctx.VERTEX_SHADER, src.vert);
    const fs = compile(ctx, ctx.FRAGMENT_SHADER, src.frag);
    const program = ctx.createProgram();
    if (!program) throw new Error("program: create failed");
    prog = program;
    ctx.attachShader(program, vs);
    ctx.attachShader(program, fs);
    ctx.bindAttribLocation(program, 0, "aPos");
    ctx.linkProgram(program);
    ctx.deleteShader(vs);
    ctx.deleteShader(fs);
    if (!ctx.getProgramParameter(program, ctx.LINK_STATUS))
      throw new Error("link: " + ctx.getProgramInfoLog(program));
    ctx.useProgram(program);
    buf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
    ctx.bufferData(
      ctx.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      ctx.STATIC_DRAW,
    );
    ctx.enableVertexAttribArray(0);
    ctx.vertexAttribPointer(0, 2, ctx.FLOAT, false, 0, 0);
    for (const name of UNIFORMS)
      loc.set(name, ctx.getUniformLocation(program, name));
    ctx.uniform1i(u("uTexA"), 0);
    ctx.uniform1i(u("uTexB"), 1);
    ctx.clearColor(0, 0, 0, 0);
    textures = new Map();
    images.forEach((img, key) => upload(ctx, key, img));
  }

  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    hooks.onLost?.();
  };
  const onRestored = () => {
    lost = false;
    try {
      if (gl) setup(gl);
      hooks.onRestored?.();
    } catch {
      hooks.onLost?.();
    }
  };

  const attrs: WebGLContextAttributes = {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  };
  try {
    gl = canvas.getContext("webgl2", attrs);
    isGL2 = Boolean(gl);
    if (!gl) gl = canvas.getContext("webgl", attrs);
    if (!gl) return null;
    setup(gl);
  } catch (error) {
    console.warn(
      "[horizonte] WebGL unavailable, using the CSS lens.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
  const ctx = gl;

  canvas.addEventListener("webglcontextlost", onLost, false);
  canvas.addEventListener("webglcontextrestored", onRestored, false);

  return {
    version: isGL2 ? 2 : 1,
    addTexture(key, img) {
      images.set(key, img);
      if (!lost) upload(ctx, key, img);
    },
    updateTexture(key, source) {
      images.set(key, source);
      if (lost) return;
      const tex = textures.get(key);
      if (!tex) {
        upload(ctx, key, source);
        return;
      }
      ctx.bindTexture(ctx.TEXTURE_2D, tex);
      ctx.texImage2D(
        ctx.TEXTURE_2D,
        0,
        ctx.RGBA,
        ctx.RGBA,
        ctx.UNSIGNED_BYTE,
        source,
      );
    },
    resize(cssSize, dpr) {
      const px = Math.max(2, Math.round(cssSize * dpr));
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
    },
    render(s) {
      const texA = textures.get(s.a);
      const texB = textures.get(s.b);
      if (lost || !texA || !texB) return false;
      ctx.viewport(0, 0, canvas.width, canvas.height);
      ctx.clear(ctx.COLOR_BUFFER_BIT);
      ctx.activeTexture(ctx.TEXTURE0);
      ctx.bindTexture(ctx.TEXTURE_2D, texA);
      ctx.activeTexture(ctx.TEXTURE1);
      ctx.bindTexture(ctx.TEXTURE_2D, texB);
      ctx.uniform2f(u("uRes"), canvas.width, canvas.height);
      ctx.uniform1f(u("uTime"), s.time);
      ctx.uniform1f(u("uR"), s.radiusPx);
      ctx.uniform4fv(u("uFitA"), s.fitA);
      ctx.uniform4fv(u("uFitB"), s.fitB);
      ctx.uniform1f(u("uMix"), s.mix);
      ctx.uniform1f(u("uPulse"), s.pulse);
      ctx.uniform1f(u("uDir"), s.dir);
      ctx.uniform1f(u("uTintMix"), s.tintMix);
      ctx.uniform1f(u("uBreath"), s.breath);
      ctx.uniform3fv(u("uTintA"), s.tintA);
      ctx.uniform3fv(u("uTintB"), s.tintB);
      ctx.uniform3fv(u("uPaperA"), s.paperA);
      ctx.uniform3fv(u("uPaperB"), s.paperB);
      ctx.uniform2f(u("uPointer"), s.pointer[0] ?? 0, s.pointer[1] ?? 0);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);
      return true;
    },
    destroy() {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (!lost) {
        textures.forEach((tex) => ctx.deleteTexture(tex));
        ctx.deleteBuffer(buf);
        ctx.deleteProgram(prog);
      }
      ctx.getExtension("WEBGL_lose_context")?.loseContext();
      textures = new Map();
      images = new Map();
    },
  };
}
