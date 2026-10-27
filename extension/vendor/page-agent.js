(() => {
  var ph = Object.defineProperty;
  var Rd = (e, n) => () => (e && (n = e((e = 0))), n);
  var Ge = (e, n) => {
    for (var i in n) ph(e, i, { get: n[i], enumerable: !0 });
  };
  function Hg(e, n, i, o) {
    let t = Math.max(1, Math.min(e, n)),
      r = Math.min(i, 20),
      s = Math.min(r + o, t),
      u = Math.min(s, Math.floor(e / 2)),
      c = Math.min(s, Math.floor(n / 2)),
      l = (S) => (S / e) * 2 - 1,
      f = (S) => (S / n) * 2 - 1,
      d = 0,
      m = e,
      g = 0,
      $ = n,
      w = u,
      z = e - u,
      x = c,
      O = n - c,
      I = l(d),
      E = l(m),
      D = f(g),
      R = f($),
      be = l(w),
      pe = l(z),
      ce = f(x),
      ie = f(O),
      de = 0,
      It = 0,
      Ve = 1,
      Zn = 1,
      Vn = u / e,
      Mn = 1 - u / e,
      Me = c / n,
      $e = 1 - c / n,
      ra = new Float32Array([
        I,
        D,
        E,
        D,
        I,
        ce,
        I,
        ce,
        E,
        D,
        E,
        ce,
        I,
        ie,
        E,
        ie,
        I,
        R,
        I,
        R,
        E,
        ie,
        E,
        R,
        I,
        ce,
        be,
        ce,
        I,
        ie,
        I,
        ie,
        be,
        ce,
        be,
        ie,
        pe,
        ce,
        E,
        ce,
        pe,
        ie,
        pe,
        ie,
        E,
        ce,
        E,
        ie,
      ]),
      p = new Float32Array([
        de,
        It,
        Ve,
        It,
        de,
        Me,
        de,
        Me,
        Ve,
        It,
        Ve,
        Me,
        de,
        $e,
        Ve,
        $e,
        de,
        Zn,
        de,
        Zn,
        Ve,
        $e,
        Ve,
        Zn,
        de,
        Me,
        Vn,
        Me,
        de,
        $e,
        de,
        $e,
        Vn,
        Me,
        Vn,
        $e,
        Mn,
        Me,
        Ve,
        Me,
        Mn,
        $e,
        Mn,
        $e,
        Ve,
        Me,
        Ve,
        $e,
      ]);
    return { positions: ra, uvs: p };
  }
  function Yg(e, n, i) {
    let o = e.createShader(n);
    if (!o) throw new Error("Failed to create shader");
    if ((e.shaderSource(o, i), e.compileShader(o), !e.getShaderParameter(o, e.COMPILE_STATUS))) {
      let t = e.getShaderInfoLog(o) || "Unknown shader error";
      throw (e.deleteShader(o), new Error(t));
    }
    return o;
  }
  function E_(e, n, i) {
    let o = Yg(e, e.VERTEX_SHADER, n),
      t = Yg(e, e.FRAGMENT_SHADER, i),
      r = e.createProgram();
    if (!r) throw new Error("Failed to create program");
    if (
      (e.attachShader(r, o),
      e.attachShader(r, t),
      e.linkProgram(r),
      !e.getProgramParameter(r, e.LINK_STATUS))
    ) {
      let a = e.getProgramInfoLog(r) || "Unknown link error";
      throw (e.deleteProgram(r), e.deleteShader(o), e.deleteShader(t), new Error(a));
    }
    return (e.deleteShader(o), e.deleteShader(t), r);
  }
  function U_(e) {
    let n = e.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!n) throw new Error(`Invalid color format: ${e}`);
    let [, i, o, t] = n;
    return [parseInt(i) / 255, parseInt(o) / 255, parseInt(t) / 255];
  }
  var A_,
    D_,
    j_,
    na,
    Qg = Rd(() => {
      ((A_ = `#version 300 es
precision lowp float;
in vec2 vUV;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uBorderWidth;
uniform float uGlowWidth;
uniform float uBorderRadius;
uniform vec3 uColors[4];
uniform float uGlowExponent;
uniform float uGlowFactor;
const float PI = 3.14159265359;
const float TWO_PI = 2.0 * PI;
const float HALF_PI = 0.5 * PI;
const vec4 startPositions = vec4(0.0, PI, HALF_PI, 1.5 * PI);
const vec4 speeds = vec4(-1.9, -1.9, -1.5, 2.1);
const vec4 innerRadius = vec4(PI * 0.8, PI * 0.7, PI * 0.3, PI * 0.1);
const vec4 outerRadius = vec4(PI * 1.2, PI * 0.9, PI * 0.6, PI * 0.4);
float random(vec2 st) {
return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
vec2 random2(vec2 st) {
return vec2(random(st), random(st + 1.0));
}
float aaStep(float edge, float d) {
float width = fwidth(d);
return smoothstep(edge - width * 0.5, edge + width * 0.5, d);
}
float aaFract(float x) {
float f = fract(x);
float w = fwidth(x);
float smooth_f = f * (1.0 - smoothstep(1.0 - w, 1.0, f));
return smooth_f;
}
float sdRoundedBox(in vec2 p, in vec2 b, in float r) {
vec2 q = abs(p) - b + r;
return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
float getInnerGlow(vec2 p, vec2 b, float radius) {
float dist_x = b.x - abs(p.x);
float dist_y = b.y - abs(p.y);
float glow_x = smoothstep(radius, 0.0, dist_x);
float glow_y = smoothstep(radius, 0.0, dist_y);
return 1.0 - (1.0 - glow_x) * (1.0 - glow_y);
}
float getVignette(vec2 uv) {
vec2 vignetteUv = uv;
vignetteUv = vignetteUv * (1.0 - vignetteUv);
float vignette = vignetteUv.x * vignetteUv.y * 25.0;
vignette = pow(vignette, 0.16);
vignette = 1.0 - vignette;
return vignette;
}
float uvToAngle(vec2 uv) {
vec2 center = vec2(0.5);
vec2 dir = uv - center;
return atan(dir.y, dir.x) + PI;
}
void main() {
vec2 uv = vUV;
vec2 pos = uv * uResolution;
vec2 centeredPos = pos - uResolution * 0.5;
vec2 size = uResolution - uBorderWidth;
vec2 halfSize = size * 0.5;
float dBorderBox = sdRoundedBox(centeredPos, halfSize, uBorderRadius);
float border = aaStep(0.0, dBorderBox);
float glow = getInnerGlow(centeredPos, halfSize, uGlowWidth);
float vignette = getVignette(uv);
glow *= vignette;
float posAngle = uvToAngle(uv);
vec4 lightCenter = mod(startPositions + speeds * uTime, TWO_PI);
vec4 angleDist = abs(posAngle - lightCenter);
vec4 disToLight = min(angleDist, TWO_PI - angleDist) / TWO_PI;
float intensityBorder[4];
intensityBorder[0] = 1.0;
intensityBorder[1] = smoothstep(0.4, 0.0, disToLight.y);
intensityBorder[2] = smoothstep(0.4, 0.0, disToLight.z);
intensityBorder[3] = smoothstep(0.2, 0.0, disToLight.w) * 0.5;
vec3 borderColor = vec3(0.0);
for(int i = 0; i < 4; i++) {
borderColor = mix(borderColor, uColors[i], intensityBorder[i]);
}
borderColor *= 1.1;
borderColor = clamp(borderColor, 0.0, 1.0);
float intensityGlow[4];
intensityGlow[0] = smoothstep(0.9, 0.0, disToLight.x);
intensityGlow[1] = smoothstep(0.7, 0.0, disToLight.y);
intensityGlow[2] = smoothstep(0.4, 0.0, disToLight.z);
intensityGlow[3] = smoothstep(0.1, 0.0, disToLight.w) * 0.7;
vec4 breath = smoothstep(0.0, 1.0, sin(uTime * 1.0 + startPositions * PI) * 0.2 + 0.8);
vec3 glowColor = vec3(0.0);
glowColor += uColors[0] * intensityGlow[0] * breath.x;
glowColor += uColors[1] * intensityGlow[1] * breath.y;
glowColor += uColors[2] * intensityGlow[2] * breath.z;
glowColor += uColors[3] * intensityGlow[3] * breath.w * glow;
glow = pow(glow, uGlowExponent);
glow *= random(pos + uTime) * 0.1 + 1.0;
glowColor *= glow * uGlowFactor;
glowColor = clamp(glowColor, 0.0, 1.0);
vec3 color = mix(glowColor, borderColor + glowColor * 0.2, border);
float alpha = mix(glow, 1.0, border);
outColor = vec4(color, alpha);
}`),
        (D_ = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
void main() {
vUV = aUV;
gl_Position = vec4(aPosition, 0.0, 1.0);
}`));
      j_ = ["rgb(57, 182, 255)", "rgb(189, 69, 251)", "rgb(255, 87, 51)", "rgb(255, 214, 0)"];
      na = class {
        element;
        canvas;
        options;
        running = !1;
        disposed = !1;
        startTime = 0;
        lastTime = 0;
        rafId = null;
        glr;
        observer;
        constructor(n = {}) {
          ((this.options = {
            width: n.width ?? 600,
            height: n.height ?? 600,
            ratio: n.ratio ?? window.devicePixelRatio ?? 1,
            borderWidth: n.borderWidth ?? 8,
            glowWidth: n.glowWidth ?? 200,
            borderRadius: n.borderRadius ?? 8,
            mode: n.mode ?? "light",
            ...n,
          }),
            (this.canvas = document.createElement("canvas")),
            this.options.classNames && (this.canvas.className = this.options.classNames),
            this.options.styles && Object.assign(this.canvas.style, this.options.styles),
            (this.canvas.style.display = "block"),
            (this.canvas.style.transformOrigin = "center"),
            (this.canvas.style.pointerEvents = "none"),
            (this.element = this.canvas),
            this.setupGL(),
            this.options.skipGreeting || this.greet());
        }
        start() {
          if (this.disposed) throw new Error("Motion instance has been disposed.");
          if (this.running) return;
          if (!this.glr) {
            console.error("WebGL resources are not initialized.");
            return;
          }
          ((this.running = !0),
            (this.startTime = performance.now()),
            this.resize(this.options.width ?? 600, this.options.height ?? 600, this.options.ratio),
            this.glr.gl.viewport(0, 0, this.canvas.width, this.canvas.height),
            this.glr.gl.useProgram(this.glr.program),
            this.glr.gl.uniform2f(this.glr.uResolution, this.canvas.width, this.canvas.height),
            this.checkGLError(this.glr.gl, "start: after initial setup"));
          let n = () => {
            if (!this.running || !this.glr) return;
            this.rafId = requestAnimationFrame(n);
            let i = performance.now();
            if (i - this.lastTime < 1e3 / 32) return;
            this.lastTime = i;
            let t = (i - this.startTime) * 0.001;
            this.render(t);
          };
          this.rafId = requestAnimationFrame(n);
        }
        pause() {
          if (this.disposed) throw new Error("Motion instance has been disposed.");
          ((this.running = !1), this.rafId !== null && cancelAnimationFrame(this.rafId));
        }
        dispose() {
          if (this.disposed) return;
          ((this.disposed = !0),
            (this.running = !1),
            this.rafId !== null && cancelAnimationFrame(this.rafId));
          let { gl: n, vao: i, positionBuffer: o, uvBuffer: t, program: r } = this.glr;
          (i && n.deleteVertexArray(i),
            o && n.deleteBuffer(o),
            t && n.deleteBuffer(t),
            n.deleteProgram(r),
            this.observer && this.observer.disconnect(),
            this.canvas.remove());
        }
        resize(n, i, o) {
          if (this.disposed) throw new Error("Motion instance has been disposed.");
          if (
            ((this.options.width = n),
            (this.options.height = i),
            o && (this.options.ratio = o),
            !this.running)
          )
            return;
          let {
              gl: t,
              program: r,
              vao: a,
              positionBuffer: s,
              uvBuffer: u,
              uResolution: c,
            } = this.glr,
            l = o ?? this.options.ratio ?? window.devicePixelRatio ?? 1,
            f = Math.max(1, Math.floor(n * l)),
            d = Math.max(1, Math.floor(i * l));
          ((this.canvas.style.width = `${n}px`),
            (this.canvas.style.height = `${i}px`),
            (this.canvas.width !== f || this.canvas.height !== d) &&
              ((this.canvas.width = f), (this.canvas.height = d)),
            t.viewport(0, 0, this.canvas.width, this.canvas.height),
            this.checkGLError(t, "resize: after viewport setup"));
          let { positions: m, uvs: g } = Hg(
            this.canvas.width,
            this.canvas.height,
            this.options.borderWidth * l,
            this.options.glowWidth * l,
          );
          (t.bindVertexArray(a),
            t.bindBuffer(t.ARRAY_BUFFER, s),
            t.bufferData(t.ARRAY_BUFFER, m, t.STATIC_DRAW));
          let $ = t.getAttribLocation(r, "aPosition");
          (t.enableVertexAttribArray($),
            t.vertexAttribPointer($, 2, t.FLOAT, !1, 0, 0),
            this.checkGLError(t, "resize: after position buffer update"),
            t.bindBuffer(t.ARRAY_BUFFER, u),
            t.bufferData(t.ARRAY_BUFFER, g, t.STATIC_DRAW));
          let w = t.getAttribLocation(r, "aUV");
          (t.enableVertexAttribArray(w),
            t.vertexAttribPointer(w, 2, t.FLOAT, !1, 0, 0),
            this.checkGLError(t, "resize: after UV buffer update"),
            t.useProgram(r),
            t.uniform2f(c, this.canvas.width, this.canvas.height),
            t.uniform1f(this.glr.uBorderWidth, this.options.borderWidth * l),
            t.uniform1f(this.glr.uGlowWidth, this.options.glowWidth * l),
            t.uniform1f(this.glr.uBorderRadius, this.options.borderRadius * l),
            this.checkGLError(t, "resize: after uniform updates"));
          let z = performance.now();
          this.lastTime = z;
          let x = (z - this.startTime) * 0.001;
          this.render(x);
        }
        autoResize(n) {
          (this.observer && this.observer.disconnect(),
            (this.observer = new ResizeObserver(() => {
              let i = n.getBoundingClientRect();
              this.resize(i.width, i.height);
            })),
            this.observer.observe(n));
        }
        fadeIn() {
          if (this.disposed) throw new Error("Motion instance has been disposed.");
          return new Promise((n, i) => {
            let o = this.canvas.animate(
              [
                { opacity: 0, transform: "scale(1.2)" },
                { opacity: 1, transform: "scale(1)" },
              ],
              { duration: 300, easing: "ease-out", fill: "forwards" },
            );
            ((o.onfinish = () => n()), (o.oncancel = () => i("canceled")));
          });
        }
        fadeOut() {
          if (this.disposed) throw new Error("Motion instance has been disposed.");
          return new Promise((n, i) => {
            let o = this.canvas.animate(
              [
                { opacity: 1, transform: "scale(1)" },
                { opacity: 0, transform: "scale(1.2)" },
              ],
              { duration: 300, easing: "ease-in", fill: "forwards" },
            );
            ((o.onfinish = () => n()), (o.oncancel = () => i("canceled")));
          });
        }
        checkGLError(n, i) {
          let o = n.getError();
          if (o !== n.NO_ERROR) {
            for (console.group(`\u{1F534} WebGL Error in ${i}`); o !== n.NO_ERROR; ) {
              let t = this.getGLErrorName(n, o);
              (console.error(`${t} (0x${o.toString(16)})`), (o = n.getError()));
            }
            console.groupEnd();
          }
        }
        getGLErrorName(n, i) {
          switch (i) {
            case n.INVALID_ENUM:
              return "INVALID_ENUM";
            case n.INVALID_VALUE:
              return "INVALID_VALUE";
            case n.INVALID_OPERATION:
              return "INVALID_OPERATION";
            case n.INVALID_FRAMEBUFFER_OPERATION:
              return "INVALID_FRAMEBUFFER_OPERATION";
            case n.OUT_OF_MEMORY:
              return "OUT_OF_MEMORY";
            case n.CONTEXT_LOST_WEBGL:
              return "CONTEXT_LOST_WEBGL";
            default:
              return "UNKNOWN_ERROR";
          }
        }
        setupGL() {
          let n = this.canvas.getContext("webgl2", { antialias: !1, alpha: !0 });
          if (!n) throw new Error("WebGL2 is required but not available.");
          let i = E_(n, D_, A_);
          this.checkGLError(n, "setupGL: after createProgram");
          let o = n.createVertexArray();
          (n.bindVertexArray(o), this.checkGLError(n, "setupGL: after VAO creation"));
          let t = this.canvas.width || 2,
            r = this.canvas.height || 2,
            { positions: a, uvs: s } = Hg(t, r, this.options.borderWidth, this.options.glowWidth),
            u = n.createBuffer();
          (n.bindBuffer(n.ARRAY_BUFFER, u), n.bufferData(n.ARRAY_BUFFER, a, n.STATIC_DRAW));
          let c = n.getAttribLocation(i, "aPosition");
          (n.enableVertexAttribArray(c),
            n.vertexAttribPointer(c, 2, n.FLOAT, !1, 0, 0),
            this.checkGLError(n, "setupGL: after position buffer setup"));
          let l = n.createBuffer();
          (n.bindBuffer(n.ARRAY_BUFFER, l), n.bufferData(n.ARRAY_BUFFER, s, n.STATIC_DRAW));
          let f = n.getAttribLocation(i, "aUV");
          (n.enableVertexAttribArray(f),
            n.vertexAttribPointer(f, 2, n.FLOAT, !1, 0, 0),
            this.checkGLError(n, "setupGL: after UV buffer setup"));
          let d = n.getUniformLocation(i, "uResolution"),
            m = n.getUniformLocation(i, "uTime"),
            g = n.getUniformLocation(i, "uBorderWidth"),
            $ = n.getUniformLocation(i, "uGlowWidth"),
            w = n.getUniformLocation(i, "uBorderRadius"),
            z = n.getUniformLocation(i, "uColors"),
            x = n.getUniformLocation(i, "uGlowExponent"),
            O = n.getUniformLocation(i, "uGlowFactor");
          (n.useProgram(i),
            n.uniform1f(g, this.options.borderWidth),
            n.uniform1f($, this.options.glowWidth),
            n.uniform1f(w, this.options.borderRadius),
            this.options.mode === "dark"
              ? (n.uniform1f(x, 2), n.uniform1f(O, 1.8))
              : (n.uniform1f(x, 1), n.uniform1f(O, 1)));
          let I = (this.options.colors || j_).map(U_);
          for (let E = 0; E < I.length; E++)
            n.uniform3f(n.getUniformLocation(i, `uColors[${E}]`), ...I[E]);
          (this.checkGLError(n, "setupGL: after uniform setup"),
            n.bindVertexArray(null),
            n.bindBuffer(n.ARRAY_BUFFER, null),
            (this.glr = {
              gl: n,
              program: i,
              vao: o,
              positionBuffer: u,
              uvBuffer: l,
              uResolution: d,
              uTime: m,
              uBorderWidth: g,
              uGlowWidth: $,
              uBorderRadius: w,
              uColors: z,
            }));
        }
        render(n) {
          if (!this.glr) return;
          let { gl: i, program: o, vao: t, uTime: r } = this.glr;
          (i.useProgram(o),
            i.bindVertexArray(t),
            i.uniform1f(r, n),
            i.disable(i.DEPTH_TEST),
            i.disable(i.CULL_FACE),
            i.disable(i.BLEND),
            i.clearColor(0, 0, 0, 0),
            i.clear(i.COLOR_BUFFER_BIT),
            i.drawArrays(i.TRIANGLES, 0, 24),
            this.checkGLError(i, "render: after draw call"),
            i.bindVertexArray(null));
        }
        greet() {
          console.log(
            "%c\u{1F308} ai-motion 0.4.8 \u{1F308}",
            "background: linear-gradient(90deg, #39b6ff, #bd45fb, #ff5733, #ffd600); color: white; text-shadow: 0 0 2px rgba(0, 0, 0, 0.2); font-weight: bold; font-size: 1em; padding: 2px 12px; border-radius: 6px;",
          );
        }
      };
    });
  var th = {};
  Ge(th, { SimulatorMask: () => W_ });
  function C_() {
    try {
      return !!(L_() || R_() || Z_() || V_() || F_() || M_());
    } catch (e) {
      return (console.warn("Error determining if page is dark:", e), !1);
    }
  }
  function L_() {
    let e = ["dark", "dark-mode", "theme-dark", "night", "night-mode"],
      n = document.documentElement,
      i = document.body || document.documentElement;
    for (let o of e) if (n.classList.contains(o) || i?.classList.contains(o)) return !0;
    return !1;
  }
  function R_() {
    let e = document.documentElement,
      n = document.body || document.documentElement;
    for (let i of ["data-theme", "data-color-mode", "data-bs-theme", "data-mui-color-scheme"]) {
      let o = n?.getAttribute(i),
        t = e.getAttribute(i);
      if (o?.toLowerCase() === "dark" || t?.toLowerCase() === "dark") return !0;
    }
    return !1;
  }
  function Z_() {
    let e = document.querySelector('meta[name="color-scheme"]')?.content.toLowerCase();
    if (e === "dark" || e === "only dark") return !0;
    let n = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue("color-scheme")
      .trim()
      .toLowerCase();
    return n === "dark" || n === "only dark";
  }
  function V_() {
    let e = window.getComputedStyle(document.documentElement),
      n = window.getComputedStyle(document.body || document.documentElement),
      i = e.backgroundColor,
      o = n.backgroundColor;
    return jd(o) ? !0 : o === "transparent" || o.startsWith("rgba(0, 0, 0, 0)") ? jd(i) : !1;
  }
  function M_() {
    let n = eh(window.getComputedStyle(document.body || document.documentElement).color);
    return n !== null && n > 200;
  }
  function F_() {
    let { innerWidth: e, innerHeight: n } = window,
      i = e * n * 0.5;
    for (let o of ["#app", "#root", "#__next"]) {
      let t = document.querySelector(o);
      if (!t) continue;
      let r = t.getBoundingClientRect();
      if (!(r.width * r.height < i) && jd(window.getComputedStyle(t).backgroundColor)) return !0;
    }
    return !1;
  }
  function B_(e) {
    let n = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(e);
    return n ? { r: parseInt(n[1]), g: parseInt(n[2]), b: parseInt(n[3]) } : null;
  }
  function eh(e) {
    if (!e || e === "transparent" || e.startsWith("rgba(0, 0, 0, 0)")) return null;
    let n = B_(e);
    return n ? 0.299 * n.r + 0.587 * n.g + 0.114 * n.b : null;
  }
  function jd(e, n = 128) {
    let i = eh(e);
    return i !== null && i < n;
  }
  var Dd,
    qt,
    W_,
    nh = Rd(() => {
      Qg();
      (function () {
        try {
          if (typeof document < "u") {
            var e = document.createElement("style");
            (e.appendChild(
              document.createTextNode(`._wrapper_1ooyb_1 {
	position: fixed;
	inset: 0;
	z-index: 2147483641; /* \u786E\u4FDD\u5728\u6240\u6709\u5143\u7D20\u4E4B\u4E0A\uFF0C\u9664\u4E86 panel */
	cursor: wait;
	overflow: hidden;

	display: none;
}

._wrapper_1ooyb_1._visible_1ooyb_11 {
	display: block;
}
/* AI \u5149\u6807\u6837\u5F0F */
._cursor_1dgwb_2 {
	position: absolute;
	width: var(--cursor-size, 75px);
	height: var(--cursor-size, 75px);
	pointer-events: none;
	z-index: 10000;
}

._cursorBorder_1dgwb_10 {
	position: absolute;
	width: 100%;
	height: 100%;
	background: linear-gradient(45deg, rgb(57, 182, 255), rgb(189, 69, 251));
	mask-image: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%20fill='none'%3e%3cg%3e%3cpath%20d='M%2015%2042%20L%2015%2036.99%20Q%2015%2031.99%2023.7%2031.99%20L%2028.05%2031.99%20Q%2032.41%2031.99%2032.41%2021.99%20L%2032.41%2017%20Q%2032.41%2012%2041.09%2016.95%20L%2076.31%2037.05%20Q%2085%2042%2076.31%2046.95%20L%2041.09%2067.05%20Q%2032.41%2072%2032.41%2062.01%20L%2032.41%2057.01%20Q%2032.41%2052.01%2023.7%2052.01%20L%2019.35%2052.01%20Q%2015%2052.01%2015%2047.01%20Z'%20fill='none'%20stroke='%23000000'%20stroke-width='6'%20stroke-miterlimit='10'%20style='stroke:%20light-dark(rgb(0,%200,%200),%20rgb(255,%20255,%20255));'/%3e%3c/g%3e%3c/svg%3e");
	mask-size: 100% 100%;
	mask-repeat: no-repeat;

	transform-origin: center;
	transform: rotate(-135deg) scale(1.2);
	margin-left: -10px;
	margin-top: -18px;
}

._cursorFilling_1dgwb_25 {
	position: absolute;
	width: 100%;
	height: 100%;
	background: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3e%3cdefs%3e%3c/defs%3e%3cg%20xmlns='http://www.w3.org/2000/svg'%20style='filter:%20drop-shadow(light-dark(rgba(0,%200,%200,%200.4),%20rgba(237,%20237,%20237,%200.4))%203px%204px%204px);'%3e%3cpath%20d='M%2015%2042%20L%2015%2036.99%20Q%2015%2031.99%2023.7%2031.99%20L%2028.05%2031.99%20Q%2032.41%2031.99%2032.41%2021.99%20L%2032.41%2017%20Q%2032.41%2012%2041.09%2016.95%20L%2076.31%2037.05%20Q%2085%2042%2076.31%2046.95%20L%2041.09%2067.05%20Q%2032.41%2072%2032.41%2062.01%20L%2032.41%2057.01%20Q%2032.41%2052.01%2023.7%2052.01%20L%2019.35%2052.01%20Q%2015%2052.01%2015%2047.01%20Z'%20fill='%23ffffff'%20stroke='none'%20style='fill:%20%23ffffff;'/%3e%3c/g%3e%3c/svg%3e");
	background-size: 100% 100%;
	background-repeat: no-repeat;

	transform-origin: center;
	transform: rotate(-135deg) scale(1.2);
	margin-left: -10px;
	margin-top: -18px;
}

._cursorRipple_1dgwb_39 {
	position: absolute;
	width: 100%;
	height: 100%;
	pointer-events: none;
	margin-left: -50%;
	margin-top: -50%;

	&::after {
		content: '';
		opacity: 0;
		position: absolute;
		inset: 0;
		border: 4px solid rgba(57, 182, 255, 1);
		border-radius: 50%;
	}
}

._cursor_1dgwb_2._clicking_1dgwb_57 ._cursorRipple_1dgwb_39::after {
	animation: _cursor-ripple_1dgwb_1 300ms ease-out forwards;
}

@keyframes _cursor-ripple_1dgwb_1 {
	0% {
		transform: scale(0);
		opacity: 1;
	}
	100% {
		transform: scale(2);
		opacity: 0;
	}
}`),
            ),
              document.head.appendChild(e));
          }
        } catch (n) {
          console.error("vite-plugin-css-injected-by-js", n);
        }
      })();
      ((Dd = { wrapper: "_wrapper_1ooyb_1", visible: "_visible_1ooyb_11" }),
        (qt = {
          cursor: "_cursor_1dgwb_2",
          cursorBorder: "_cursorBorder_1dgwb_10",
          cursorFilling: "_cursorFilling_1dgwb_25",
          cursorRipple: "_cursorRipple_1dgwb_39",
          clicking: "_clicking_1dgwb_57",
          "cursor-ripple": "_cursor-ripple_1dgwb_1",
        }),
        (W_ = class extends EventTarget {
          shown = !1;
          wrapper = document.createElement("div");
          motion = null;
          #i = !1;
          #e = document.createElement("div");
          #t = 0;
          #n = 0;
          #a = 0;
          #o = 0;
          constructor() {
            (super(),
              (this.wrapper.id = "page-agent-runtime_simulator-mask"),
              (this.wrapper.className = Dd.wrapper),
              this.wrapper.setAttribute("data-browser-use-ignore", "true"),
              this.wrapper.setAttribute("data-page-agent-ignore", "true"));
            try {
              let t = new na({
                mode: C_() ? "dark" : "light",
                styles: { position: "absolute", inset: "0" },
              });
              ((this.motion = t), this.wrapper.appendChild(t.element), t.autoResize(this.wrapper));
            } catch (t) {
              console.warn("[SimulatorMask] Motion overlay unavailable:", t);
            }
            (this.wrapper.addEventListener("click", (t) => {
              (t.stopPropagation(), t.preventDefault());
            }),
              this.wrapper.addEventListener("mousedown", (t) => {
                (t.stopPropagation(), t.preventDefault());
              }),
              this.wrapper.addEventListener("mouseup", (t) => {
                (t.stopPropagation(), t.preventDefault());
              }),
              this.wrapper.addEventListener("mousemove", (t) => {
                (t.stopPropagation(), t.preventDefault());
              }),
              this.wrapper.addEventListener("wheel", (t) => {
                (t.stopPropagation(), t.preventDefault());
              }),
              this.wrapper.addEventListener("keydown", (t) => {
                (t.stopPropagation(), t.preventDefault());
              }),
              this.wrapper.addEventListener("keyup", (t) => {
                (t.stopPropagation(), t.preventDefault());
              }),
              this.#r(),
              document.body.appendChild(this.wrapper),
              this.#u());
            let e = (t) => {
                let { x: r, y: a } = t.detail;
                this.setCursorPosition(r, a);
              },
              n = () => {
                this.triggerClickAnimation();
              },
              i = () => {
                this.wrapper.style.pointerEvents = "none";
              },
              o = () => {
                this.wrapper.style.pointerEvents = "auto";
              };
            (window.addEventListener("PageAgent::MovePointerTo", e),
              window.addEventListener("PageAgent::ClickPointer", n),
              window.addEventListener("PageAgent::EnablePassThrough", i),
              window.addEventListener("PageAgent::DisablePassThrough", o),
              this.addEventListener("dispose", () => {
                (window.removeEventListener("PageAgent::MovePointerTo", e),
                  window.removeEventListener("PageAgent::ClickPointer", n),
                  window.removeEventListener("PageAgent::EnablePassThrough", i),
                  window.removeEventListener("PageAgent::DisablePassThrough", o));
              }));
          }
          #r() {
            this.#e.className = qt.cursor;
            let e = document.createElement("div");
            ((e.className = qt.cursorRipple), this.#e.appendChild(e));
            let n = document.createElement("div");
            ((n.className = qt.cursorFilling), this.#e.appendChild(n));
            let i = document.createElement("div");
            ((i.className = qt.cursorBorder),
              this.#e.appendChild(i),
              this.wrapper.appendChild(this.#e));
          }
          #u() {
            if (this.#i) return;
            let e = this.#t + (this.#a - this.#t) * 0.2,
              n = this.#n + (this.#o - this.#n) * 0.2,
              i = Math.abs(e - this.#a);
            i > 0 &&
              (i < 2 ? (this.#t = this.#a) : (this.#t = e), (this.#e.style.left = `${this.#t}px`));
            let o = Math.abs(n - this.#o);
            (o > 0 &&
              (o < 2 ? (this.#n = this.#o) : (this.#n = n), (this.#e.style.top = `${this.#n}px`)),
              requestAnimationFrame(() => this.#u()));
          }
          setCursorPosition(e, n) {
            this.#i || ((this.#a = e), (this.#o = n));
          }
          triggerClickAnimation() {
            this.#i ||
              (this.#e.classList.remove(qt.clicking),
              this.#e.getBoundingClientRect(),
              this.#e.classList.add(qt.clicking));
          }
          show() {
            this.shown ||
              this.#i ||
              ((this.shown = !0),
              this.motion?.start(),
              this.motion?.fadeIn(),
              this.wrapper.classList.add(Dd.visible),
              (this.#t = window.innerWidth / 2),
              (this.#n = window.innerHeight / 2),
              (this.#a = this.#t),
              (this.#o = this.#n),
              (this.#e.style.left = `${this.#t}px`),
              (this.#e.style.top = `${this.#n}px`));
          }
          hide() {
            !this.shown ||
              this.#i ||
              ((this.shown = !1),
              this.motion?.fadeOut(),
              this.motion?.pause(),
              this.#e.classList.remove(qt.clicking),
              setTimeout(() => {
                this.wrapper.classList.remove(Dd.visible);
              }, 800));
          }
          dispose() {
            ((this.#i = !0),
              this.motion?.dispose(),
              this.wrapper.remove(),
              this.dispatchEvent(new Event("dispose")));
          }
        }));
    });
  var Yo = {};
  Ge(Yo, {
    $brand: () => $a,
    $input: () => Mc,
    $output: () => Vc,
    INVALID: () => ke,
    NEVER: () => va,
    TimePrecision: () => Qc,
    ZodAny: () => Ll,
    ZodArray: () => Ml,
    ZodBase64: () => Mo,
    ZodBase64URL: () => Fo,
    ZodBigInt: () => Cn,
    ZodBigIntFormat: () => Jo,
    ZodBoolean: () => Un,
    ZodCIDRv4: () => Zo,
    ZodCIDRv6: () => Vo,
    ZodCUID: () => Ao,
    ZodCUID2: () => Do,
    ZodCatch: () => ud,
    ZodCodec: () => jr,
    ZodCompileAsyncError: () => We,
    ZodCompileUnsupportedError: () => F,
    ZodCreditCard: () => El,
    ZodCustom: () => Ur,
    ZodCustomStringFormat: () => Wt,
    ZodDate: () => Or,
    ZodDefault: () => rd,
    ZodDiscriminatedUnion: () => Bl,
    ZodE164: () => Bo,
    ZodEmail: () => Po,
    ZodEmoji: () => To,
    ZodEnum: () => An,
    ZodError: () => Ob,
    ZodExactOptional: () => Xo,
    ZodFile: () => Ql,
    ZodFirstPartyTypeKind: () => xd,
    ZodFunction: () => yd,
    ZodGUID: () => Oo,
    ZodIBAN: () => Al,
    ZodIPv4: () => Lo,
    ZodIPv6: () => Ro,
    ZodISODate: () => yt,
    ZodISODateTime: () => $t,
    ZodISODuration: () => _t,
    ZodISOTime: () => bt,
    ZodInstanceOf: () => wd,
    ZodIntersection: () => Wl,
    ZodIssueCode: () => Ab,
    ZodJWT: () => Wo,
    ZodKSUID: () => Co,
    ZodLazy: () => hd,
    ZodLiteral: () => Yl,
    ZodMAC: () => Tl,
    ZodMap: () => Xl,
    ZodNaN: () => dd,
    ZodNanoID: () => Eo,
    ZodNever: () => Zl,
    ZodNonOptional: () => Ho,
    ZodNull: () => Ul,
    ZodNullable: () => nd,
    ZodNumber: () => jn,
    ZodNumberFormat: () => Jt,
    ZodObject: () => Kt,
    ZodOptional: () => Ar,
    ZodPipe: () => Dr,
    ZodPrefault: () => od,
    ZodPreprocess: () => fd,
    ZodPromise: () => $d,
    ZodReadonly: () => md,
    ZodRealError: () => Te,
    ZodRecord: () => En,
    ZodSet: () => Hl,
    ZodString: () => Dn,
    ZodStringFormat: () => X,
    ZodSuccess: () => cd,
    ZodSymbol: () => Dl,
    ZodTemplateLiteral: () => gd,
    ZodTransform: () => ed,
    ZodTuple: () => Gl,
    ZodType: () => V,
    ZodULID: () => jo,
    ZodURL: () => Pr,
    ZodUUID: () => He,
    ZodUndefined: () => jl,
    ZodUnion: () => Er,
    ZodUnknown: () => Rl,
    ZodVoid: () => Vl,
    ZodXID: () => Uo,
    ZodXor: () => Fl,
    _ZodString: () => No,
    _default: () => id,
    _function: () => yg,
    any: () => Hp,
    array: () => Tr,
    base64: () => Tp,
    base64url: () => Ep,
    bigint: () => Jp,
    boolean: () => Gt,
    catch: () => ld,
    check: () => bg,
    cidrv4: () => Pp,
    cidrv6: () => Op,
    clone: () => G,
    codec: () => gg,
    coerce: () => Id,
    compile: () => Jc,
    config: () => re,
    core: () => at,
    creditCard: () => Dp,
    cuid: () => _p,
    cuid2: () => wp,
    currencyCode: () => Zp,
    custom: () => _g,
    date: () => Qp,
    decode: () => kl,
    decodeAsync: () => Sl,
    deepPartial: () => Dg,
    describe: () => wg,
    discriminatedUnion: () => ig,
    e164: () => Ap,
    email: () => dp,
    emoji: () => yp,
    encode: () => xl,
    encodeAsync: () => Il,
    endsWith: () => bn,
    enum: () => Ko,
    exactOptional: () => td,
    file: () => dg,
    flattenError: () => Qn,
    float32: () => Mp,
    float64: () => Fp,
    formatError: () => er,
    fromJSONSchema: () => Eg,
    function: () => yg,
    getDiscriminatedOption: () => gc,
    getErrorMap: () => jb,
    globalRegistry: () => ve,
    gt: () => qe,
    gte: () => Ue,
    guid: () => fp,
    hash: () => Vp,
    hex: () => Rp,
    hostname: () => Lp,
    httpUrl: () => $p,
    iban: () => jp,
    includes: () => $n,
    input: () => Ug,
    instanceof: () => kg,
    int: () => vt,
    int32: () => Bp,
    int64: () => Gp,
    intersection: () => Jl,
    invertCodec: () => hg,
    ipv4: () => Sp,
    ipv6: () => Np,
    iso: () => Cr,
    json: () => Sg,
    jwt: () => Up,
    keyof: () => eg,
    ksuid: () => Ip,
    lazy: () => vd,
    length: () => Zt,
    literal: () => lg,
    locales: () => br,
    looseObject: () => ng,
    looseRecord: () => ag,
    lowercase: () => hn,
    lt: () => Ke,
    lte: () => je,
    mac: () => zp,
    map: () => sg,
    maxLength: () => Rt,
    maxSize: () => mt,
    memoizer: () => $r,
    meta: () => xg,
    mime: () => wn,
    minLength: () => ot,
    minSize: () => Xe,
    multipleOf: () => ft,
    nan: () => pg,
    nanoid: () => bp,
    nativeEnum: () => ug,
    negative: () => vo,
    never: () => Go,
    nonnegative: () => yo,
    nonoptional: () => sd,
    nonpositive: () => $o,
    normalize: () => xn,
    null: () => Cl,
    nullable: () => Nr,
    nullish: () => fg,
    number: () => Ye,
    object: () => Ae,
    optional: () => Ft,
    output: () => Cg,
    overwrite: () => Je,
    parse: () => yl,
    parseAsync: () => bl,
    partialRecord: () => og,
    pipe: () => zo,
    positive: () => ho,
    prefault: () => ad,
    preprocess: () => zg,
    prettifyError: () => Ot,
    promise: () => $g,
    properties: () => _n,
    property: () => bo,
    readonly: () => pd,
    record: () => ql,
    refine: () => bd,
    regex: () => gn,
    regexes: () => Ze,
    registry: () => Bi,
    safeDecode: () => Nl,
    safeDecodeAsync: () => Ol,
    safeEncode: () => zl,
    safeEncodeAsync: () => Pl,
    safeParse: () => _l,
    safeParseAsync: () => wl,
    set: () => cg,
    setErrorMap: () => Db,
    size: () => Lt,
    slugify: () => zn,
    startsWith: () => yn,
    strictObject: () => tg,
    string: () => Ee,
    stringFormat: () => Cp,
    stringbool: () => Ig,
    success: () => mg,
    superRefine: () => _d,
    symbol: () => qp,
    templateLiteral: () => vg,
    toJSONSchema: () => Tn,
    toLowerCase: () => In,
    toUpperCase: () => Sn,
    toZod: () => Bn,
    transform: () => qo,
    treeifyError: () => wa,
    trim: () => kn,
    tuple: () => Kl,
    uint32: () => Wp,
    uint64: () => Kp,
    ulid: () => xp,
    undefined: () => Xp,
    union: () => wt,
    unknown: () => Mt,
    uppercase: () => vn,
    url: () => vp,
    util: () => y,
    uuid: () => mp,
    uuidv4: () => pp,
    uuidv6: () => gp,
    uuidv7: () => hp,
    validate: () => tr,
    validateAsync: () => nr,
    void: () => Yp,
    withParser: () => Wi,
    xid: () => kp,
    xor: () => rg,
  });
  var at = {};
  Ge(at, {
    $ZodAny: () => sc,
    $ZodArray: () => fc,
    $ZodAsyncError: () => Pe,
    $ZodBase64: () => qs,
    $ZodBase64URL: () => Xs,
    $ZodBigInt: () => Oi,
    $ZodBigIntFormat: () => rc,
    $ZodBoolean: () => fr,
    $ZodCIDRv4: () => Gs,
    $ZodCIDRv6: () => Ks,
    $ZodCUID: () => js,
    $ZodCUID2: () => Us,
    $ZodCatch: () => Tc,
    $ZodCheck: () => Q,
    $ZodCheckBigIntFormat: () => cs,
    $ZodCheckEndsWith: () => bs,
    $ZodCheckGreaterThan: () => pi,
    $ZodCheckIncludes: () => $s,
    $ZodCheckLengthEquals: () => ps,
    $ZodCheckLessThan: () => mi,
    $ZodCheckLowerCase: () => hs,
    $ZodCheckMaxLength: () => fs,
    $ZodCheckMaxSize: () => us,
    $ZodCheckMimeType: () => xs,
    $ZodCheckMinLength: () => ms,
    $ZodCheckMinSize: () => ls,
    $ZodCheckMultipleOf: () => as,
    $ZodCheckNumberFormat: () => ss,
    $ZodCheckOverwrite: () => ks,
    $ZodCheckProperties: () => ws,
    $ZodCheckProperty: () => _s,
    $ZodCheckRegex: () => gs,
    $ZodCheckSizeEquals: () => ds,
    $ZodCheckStartsWith: () => ys,
    $ZodCheckStringFormat: () => ln,
    $ZodCheckUpperCase: () => vs,
    $ZodCodec: () => pr,
    $ZodCreditCard: () => Ys,
    $ZodCustom: () => Lc,
    $ZodCustomStringFormat: () => tc,
    $ZodCyclicError: () => Ci,
    $ZodDate: () => dc,
    $ZodDefault: () => zc,
    $ZodDiscriminatedUnion: () => hc,
    $ZodE164: () => Hs,
    $ZodEmail: () => Ps,
    $ZodEmoji: () => As,
    $ZodEncodeError: () => dt,
    $ZodEnum: () => _c,
    $ZodError: () => _a,
    $ZodExactOptional: () => Ic,
    $ZodFile: () => xc,
    $ZodFunction: () => Uc,
    $ZodGUID: () => zs,
    $ZodIBAN: () => Qs,
    $ZodIPv4: () => Bs,
    $ZodIPv6: () => Ws,
    $ZodISODate: () => Vs,
    $ZodISODateTime: () => Zs,
    $ZodISODuration: () => Fs,
    $ZodISOTime: () => Ms,
    $ZodIntersection: () => vc,
    $ZodJWT: () => ec,
    $ZodKSUID: () => Rs,
    $ZodLazy: () => gr,
    $ZodLiteral: () => wc,
    $ZodMAC: () => Js,
    $ZodMap: () => yc,
    $ZodNaN: () => Ec,
    $ZodNanoID: () => Ds,
    $ZodNever: () => uc,
    $ZodNonOptional: () => Pc,
    $ZodNull: () => ac,
    $ZodNullable: () => Sc,
    $ZodNumber: () => Pi,
    $ZodNumberFormat: () => nc,
    $ZodObject: () => _f,
    $ZodObjectJIT: () => mc,
    $ZodOptional: () => Ei,
    $ZodPipe: () => Ai,
    $ZodPrefault: () => Nc,
    $ZodPreprocess: () => Ac,
    $ZodPromise: () => Cc,
    $ZodReadonly: () => Dc,
    $ZodRealError: () => Oe,
    $ZodRecord: () => $c,
    $ZodRegistry: () => Fi,
    $ZodSet: () => bc,
    $ZodString: () => At,
    $ZodStringFormat: () => K,
    $ZodSuccess: () => Oc,
    $ZodSymbol: () => ic,
    $ZodTemplateLiteral: () => jc,
    $ZodTransform: () => kc,
    $ZodTuple: () => Ti,
    $ZodType: () => L,
    $ZodULID: () => Cs,
    $ZodURL: () => Es,
    $ZodUUID: () => Ns,
    $ZodUndefined: () => oc,
    $ZodUnion: () => mr,
    $ZodUnknown: () => cc,
    $ZodVoid: () => lc,
    $ZodXID: () => Ls,
    $ZodXor: () => pc,
    $brand: () => $a,
    $constructor: () => h,
    $input: () => Mc,
    $output: () => Vc,
    Doc: () => Et,
    INVALID: () => ke,
    JSONSchema: () => cp,
    JSONSchemaGenerator: () => ko,
    NEVER: () => va,
    TimePrecision: () => Qc,
    URL_BAD_FORMAT: () => Os,
    URL_UNPARSEABLE: () => sr,
    ZodCompileAsyncError: () => We,
    ZodCompileUnsupportedError: () => F,
    _any: () => hu,
    _array: () => xu,
    _base64: () => fo,
    _base64url: () => mo,
    _bigint: () => uu,
    _boolean: () => su,
    _catch: () => $b,
    _check: () => Jm,
    _cidrv4: () => uo,
    _cidrv6: () => lo,
    _coercedBigint: () => lu,
    _coercedBoolean: () => cu,
    _coercedDate: () => _u,
    _coercedNumber: () => tu,
    _coercedString: () => qc,
    _creditCard: () => Hc,
    _cuid: () => no,
    _cuid2: () => ro,
    _custom: () => Iu,
    _date: () => bu,
    _decode: () => ni,
    _decodeAsync: () => ii,
    _default: () => gb,
    _discriminatedUnion: () => rb,
    _e164: () => po,
    _email: () => Ki,
    _emoji: () => eo,
    _encode: () => ti,
    _encodeAsync: () => ri,
    _endsWith: () => bn,
    _enum: () => ub,
    _file: () => ku,
    _float32: () => ru,
    _float64: () => iu,
    _gt: () => qe,
    _gte: () => Ue,
    _guid: () => qi,
    _iban: () => Yc,
    _includes: () => $n,
    _int: () => nu,
    _int32: () => ou,
    _int64: () => du,
    _intersection: () => ib,
    _ipv4: () => so,
    _ipv6: () => co,
    _isoDate: () => xr,
    _isoDateTime: () => wr,
    _isoDuration: () => Ir,
    _isoTime: () => kr,
    _jwt: () => go,
    _ksuid: () => ao,
    _lazy: () => wb,
    _length: () => Zt,
    _literal: () => db,
    _lowercase: () => hn,
    _lt: () => Ke,
    _lte: () => je,
    _mac: () => Xc,
    _map: () => sb,
    _max: () => je,
    _maxLength: () => Rt,
    _maxSize: () => mt,
    _mime: () => wn,
    _min: () => Ue,
    _minLength: () => ot,
    _minSize: () => Xe,
    _multipleOf: () => ft,
    _nan: () => wu,
    _nanoid: () => to,
    _nativeEnum: () => lb,
    _negative: () => vo,
    _never: () => $u,
    _nonnegative: () => yo,
    _nonoptional: () => hb,
    _nonpositive: () => $o,
    _normalize: () => xn,
    _null: () => gu,
    _nullable: () => pb,
    _number: () => eu,
    _optional: () => mb,
    _overwrite: () => Je,
    _parse: () => an,
    _parseAsync: () => sn,
    _pipe: () => yb,
    _positive: () => ho,
    _promise: () => xb,
    _properties: () => _n,
    _property: () => bo,
    _readonly: () => bb,
    _record: () => ab,
    _refine: () => Su,
    _regex: () => gn,
    _safeDecode: () => ai,
    _safeDecodeAsync: () => ci,
    _safeEncode: () => oi,
    _safeEncodeAsync: () => si,
    _safeParse: () => cn,
    _safeParseAsync: () => un,
    _set: () => cb,
    _size: () => Lt,
    _slugify: () => zn,
    _startsWith: () => yn,
    _string: () => Kc,
    _stringFormat: () => Vt,
    _stringbool: () => Ou,
    _success: () => vb,
    _superRefine: () => zu,
    _symbol: () => mu,
    _templateLiteral: () => _b,
    _toLowerCase: () => In,
    _toUpperCase: () => Sn,
    _transform: () => fb,
    _trim: () => kn,
    _tuple: () => ob,
    _uint32: () => au,
    _uint64: () => fu,
    _ulid: () => io,
    _undefined: () => pu,
    _union: () => tb,
    _unknown: () => vu,
    _uppercase: () => vn,
    _url: () => _r,
    _uuid: () => Xi,
    _uuidv4: () => Hi,
    _uuidv6: () => Yi,
    _uuidv7: () => Qi,
    _void: () => yu,
    _xid: () => oo,
    _xor: () => nb,
    base64Charset: () => ki,
    base64urlCharset: () => dr,
    canParseURL: () => Ts,
    clone: () => G,
    compile: () => Jc,
    compileFn: () => Ji,
    config: () => re,
    createStandardJSONSchemaMethod: () => Nn,
    createToJSONSchemaMethod: () => Eu,
    decode: () => ov,
    decodeAsync: () => sv,
    describe: () => Nu,
    encode: () => iv,
    encodeAsync: () => av,
    extractDefs: () => gt,
    finalize: () => ht,
    flattenError: () => Qn,
    formatError: () => er,
    getDiscriminatedOption: () => gc,
    globalConfig: () => fe,
    globalRegistry: () => ve,
    handleUnrepresentable: () => ue,
    initializeContext: () => pt,
    isBackEdge: () => Ri,
    isRecursiveSchema: () => Li,
    isValidBase64: () => lr,
    isValidBase64URL: () => Ii,
    isValidCIDRv6: () => xi,
    isValidCreditCard: () => Si,
    isValidIBAN: () => zi,
    isValidIPv6: () => ur,
    isValidJWT: () => Ni,
    locales: () => br,
    memoizer: () => $r,
    mergeValues: () => dn,
    meta: () => Pu,
    parse: () => Qr,
    parseAsync: () => ei,
    parseURLObject: () => $f,
    prettifyError: () => Ot,
    process: () => q,
    processSchema: () => q,
    regexes: () => Ze,
    registry: () => Bi,
    safeDecode: () => uv,
    safeDecodeAsync: () => dv,
    safeEncode: () => cv,
    safeEncodeAsync: () => lv,
    safeParse: () => Qh,
    safeParseAsync: () => ev,
    standardProps: () => yi,
    stripTabAndNewline: () => cr,
    toDotPath: () => Xd,
    toJSONSchema: () => Tn,
    toZod: () => Bn,
    treeifyError: () => wa,
    urlHostnameOk: () => _i,
    urlProtocolOk: () => wi,
    util: () => y,
    validate: () => tr,
    validateAsync: () => nr,
    validateURL: () => bi,
    version: () => Is,
    withParser: () => Wi,
  });
  var y = {};
  Ge(y, {
    BIGINT_FORMAT_RANGES: () => qn,
    CONSTANT_CATCH: () => Hr,
    Class: () => sa,
    NUMBER_FORMAT_RANGES: () => Kn,
    aborted: () => xe,
    allowsEval: () => la,
    assert: () => yh,
    assertEqual: () => gh,
    assertIs: () => vh,
    assertNever: () => $h,
    assertNotEqual: () => hh,
    assignProp: () => he,
    attachSchema: () => Xr,
    base64ToUint8Array: () => Bd,
    base64urlToUint8Array: () => Lh,
    cached: () => nn,
    captureStackTrace: () => Kr,
    cleanEnum: () => Ch,
    cleanRegex: () => rt,
    clone: () => G,
    cloneDef: () => wh,
    codePointLength: () => Pt,
    constantCatch: () => ga,
    createTransparentProxy: () => Nh,
    defineLazy: () => ca,
    defineLazyInternal: () => M,
    derived: () => Mh,
    esc: () => we,
    escapeRegex: () => Re,
    explicitlyAborted: () => ma,
    extend: () => Th,
    finalizeIssue: () => Ne,
    floatSafeRemainder: () => Wn,
    getElementAtPath: () => xh,
    getEnumValues: () => en,
    getLengthableOrigin: () => Hn,
    getParsedType: () => zh,
    getSizableOrigin: () => Xn,
    hexToUint8Array: () => Zh,
    hide: () => Yn,
    installLazyProp: () => Jh,
    isObject: () => Nt,
    isPlainObject: () => Le,
    issue: () => on,
    joinValues: () => v,
    jsonStringifyReplacer: () => tn,
    members: () => pa,
    merge: () => Ah,
    mergeDefs: () => Be,
    normalizeParams: () => k,
    nullish: () => Gr,
    numKeys: () => Sh,
    objectClone: () => bh,
    omit: () => Oh,
    optionalKeys: () => fa,
    own: () => lt,
    parsedType: () => _,
    partial: () => Dh,
    pick: () => Ph,
    prefixIssues: () => ze,
    primitiveTypes: () => da,
    promiseAllObject: () => kh,
    propertyKeyTypes: () => Gn,
    randomString: () => Ih,
    rawShape: () => rn,
    required: () => jh,
    safeExtend: () => Eh,
    shallowClone: () => Jn,
    slugify: () => ua,
    stringifyPrimitive: () => b,
    toZod: () => Bn,
    uint8ArrayToBase64: () => Wd,
    uint8ArrayToBase64url: () => Rh,
    uint8ArrayToHex: () => Vh,
    unwrapMessage: () => Qt,
  });
  function gh(e) {
    return e;
  }
  function hh(e) {
    return e;
  }
  function Bn() {
    return (e) => e;
  }
  function vh(e) {}
  function $h(e) {
    throw new Error("Unexpected value in exhaustive check");
  }
  function yh(e) {}
  function en(e) {
    let n = Object.values(e).filter((o) => typeof o == "number");
    return Object.entries(e)
      .filter(([o, t]) => n.indexOf(+o) === -1)
      .map(([o, t]) => t);
  }
  function v(e, n = "|") {
    return e.map((i) => b(i)).join(n);
  }
  function tn(e, n) {
    return typeof n == "bigint" ? n.toString() : n;
  }
  var aa = class {
    constructor(n) {
      ((this._getter = n), (this._value = void 0));
    }
    get value() {
      let n = this._getter;
      return (n !== void 0 && ((this._value = n()), (this._getter = void 0)), this._value);
    }
  };
  function nn(e) {
    return new aa(e);
  }
  function Gr(e) {
    return e == null;
  }
  function rt(e) {
    let n = e.startsWith("^") ? 1 : 0,
      i = e.endsWith("$") ? e.length - 1 : e.length;
    return e.slice(n, i);
  }
  function Wn(e, n) {
    let i = e / n,
      o = Math.round(i),
      t = 4 * Number.EPSILON * Math.max(Math.abs(i), 1);
    return Math.abs(i - o) < t ? 0 : i - o;
  }
  var Zd = Symbol("evaluating");
  function ca(e, n, i) {
    let o;
    Object.defineProperty(e, n, {
      get() {
        if (o !== Zd) return (o === void 0 && ((o = Zd), (o = i())), o);
      },
      set(t) {
        Object.defineProperty(e, n, { value: t });
      },
      configurable: !0,
    });
  }
  function bh(e) {
    return Object.create(Object.getPrototypeOf(e), Object.getOwnPropertyDescriptors(e));
  }
  function he(e, n, i) {
    Object.defineProperty(e, n, { value: i, writable: !0, enumerable: !0, configurable: !0 });
  }
  function rn(e) {
    let n = Object.getOwnPropertyDescriptor(e, "shape");
    return n?.get ? n.get.raw : n?.value;
  }
  function nt(e) {
    return rn(e._zod.def) ?? e._zod.def.shape;
  }
  function Vd(e, n, i) {
    Object.defineProperty(e, n, {
      get() {
        let o = i();
        return (he(this, n, o), o);
      },
      enumerable: !0,
      configurable: !0,
    });
  }
  function Md(e, n, i) {
    n in e ? he(e, n, i) : (e[n] = i);
  }
  function zt(e, n, i, o) {
    let t = nt(n);
    for (let r of i) {
      let a = Object.getOwnPropertyDescriptor(t, r);
      a.enumerable &&
        (a.get
          ? Vd(e, r, () => {
              let s = n._zod.def.shape[r];
              return o ? o(s, r) : s;
            })
          : Md(e, r, o ? o(a.value, r) : a.value));
    }
  }
  function _h(e, n) {
    for (let i of Reflect.ownKeys(n)) {
      let o = Object.getOwnPropertyDescriptor(n, i);
      o.enumerable && (o.get ? Vd(e, i, () => n[i]) : Md(e, i, o.value));
    }
  }
  function Be(...e) {
    let n = {};
    for (let i of e) {
      let o = Object.getOwnPropertyDescriptors(i);
      Object.assign(n, o);
    }
    return Object.defineProperties({}, n);
  }
  function wh(e) {
    return Be(e._zod.def);
  }
  function xh(e, n) {
    return n ? n.reduce((i, o) => i?.[o], e) : e;
  }
  function kh(e) {
    let n = Object.keys(e),
      i = n.map((o) => e[o]);
    return Promise.all(i).then((o) => {
      let t = {};
      for (let r = 0; r < n.length; r++) t[n[r]] = o[r];
      return t;
    });
  }
  function Ih(e = 10) {
    let n = "abcdefghijklmnopqrstuvwxyz",
      i = "";
    for (let o = 0; o < e; o++) i += n[Math.floor(Math.random() * n.length)];
    return i;
  }
  function we(e) {
    return JSON.stringify(e);
  }
  function ua(e) {
    return e
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  var Kr = "captureStackTrace" in Error ? Error.captureStackTrace : (...e) => {};
  function Nt(e) {
    return typeof e == "object" && e !== null && !Array.isArray(e);
  }
  var la = nn(() => {
    if (fe.jitless || (typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare")))
      return !1;
    try {
      let e = Function;
      return (new e(""), !0);
    } catch {
      return !1;
    }
  });
  function Le(e) {
    if (Nt(e) === !1) return !1;
    let n = e.constructor;
    if (n === void 0 || typeof n != "function") return !0;
    let i = n.prototype;
    return !(Nt(i) === !1 || Object.prototype.hasOwnProperty.call(i, "isPrototypeOf") === !1);
  }
  function Jn(e) {
    return Le(e)
      ? { ...e }
      : Array.isArray(e)
        ? [...e]
        : e instanceof Map
          ? new Map(e)
          : e instanceof Set
            ? new Set(e)
            : e;
  }
  function Sh(e) {
    let n = 0;
    for (let i in e) Object.prototype.hasOwnProperty.call(e, i) && n++;
    return n;
  }
  var zh = (e) => {
      let n = typeof e;
      switch (n) {
        case "undefined":
          return "undefined";
        case "string":
          return "string";
        case "number":
          return Number.isNaN(e) ? "nan" : "number";
        case "boolean":
          return "boolean";
        case "function":
          return "function";
        case "bigint":
          return "bigint";
        case "symbol":
          return "symbol";
        case "object":
          return Array.isArray(e)
            ? "array"
            : e === null
              ? "null"
              : e.then && typeof e.then == "function" && e.catch && typeof e.catch == "function"
                ? "promise"
                : typeof Map < "u" && e instanceof Map
                  ? "map"
                  : typeof Set < "u" && e instanceof Set
                    ? "set"
                    : typeof Date < "u" && e instanceof Date
                      ? "date"
                      : typeof File < "u" && e instanceof File
                        ? "file"
                        : "object";
        default:
          throw new Error(`Unknown data type: ${n}`);
      }
    },
    Gn = new Set(["string", "number", "symbol"]),
    da = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
  function Re(e) {
    return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function G(e, n, i) {
    let o = new e._zod.constr(n ?? e._zod.def);
    return ((!n || i?.parent) && (o._zod.parent = e), o);
  }
  function k(e) {
    let n = e;
    if (!n) return {};
    if (typeof n == "string") return { error: () => n };
    if (n?.message !== void 0) {
      if (n?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
      n.error = n.message;
    }
    return (delete n.message, typeof n.error == "string" ? { ...n, error: () => n.error } : n);
  }
  function Nh(e) {
    let n;
    return new Proxy(
      {},
      {
        get(i, o, t) {
          return (n ?? (n = e()), Reflect.get(n, o, t));
        },
        set(i, o, t, r) {
          return (n ?? (n = e()), Reflect.set(n, o, t, r));
        },
        has(i, o) {
          return (n ?? (n = e()), Reflect.has(n, o));
        },
        deleteProperty(i, o) {
          return (n ?? (n = e()), Reflect.deleteProperty(n, o));
        },
        ownKeys(i) {
          return (n ?? (n = e()), Reflect.ownKeys(n));
        },
        getOwnPropertyDescriptor(i, o) {
          return (n ?? (n = e()), Reflect.getOwnPropertyDescriptor(n, o));
        },
        defineProperty(i, o, t) {
          return (n ?? (n = e()), Reflect.defineProperty(n, o, t));
        },
      },
    );
  }
  function b(e) {
    return typeof e == "bigint" ? e.toString() + "n" : typeof e == "string" ? `"${e}"` : `${e}`;
  }
  function fa(e) {
    return Object.keys(e).filter(
      (n) => e[n]._zod.optin !== void 0 && e[n]._zod.optout === "optional",
    );
  }
  var Kn = {
      safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
      int32: [-2147483648, 2147483647],
      uint32: [0, 4294967295],
      float32: [-34028234663852886e22, 34028234663852886e22],
      float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
    },
    qn = {
      int64: [BigInt("-9223372036854775808"), BigInt("9223372036854775807")],
      uint64: [BigInt(0), BigInt("18446744073709551615")],
    };
  function Ph(e, n) {
    let i = e._zod.def,
      o = i.checks;
    if (o && o.length > 0)
      throw new Error(".pick() cannot be used on object schemas containing refinements");
    let r = {};
    return (zt(r, e, qr(e, n)), G(e, Be(i, { shape: r, checks: [] })));
  }
  function qr(e, n) {
    let i = nt(e),
      o = [];
    for (let t of Reflect.ownKeys(n)) {
      if (!Object.getOwnPropertyDescriptor(i, t)?.enumerable)
        throw new Error(`Unrecognized key: "${String(t)}"`);
      n[t] && o.push(t);
    }
    return o;
  }
  function Oh(e, n) {
    let i = e._zod.def,
      o = i.checks;
    if (o && o.length > 0)
      throw new Error(".omit() cannot be used on object schemas containing refinements");
    let r = new Set(qr(e, n)),
      a = {};
    return (
      zt(
        a,
        e,
        Reflect.ownKeys(nt(e)).filter((s) => !r.has(s)),
      ),
      G(e, Be(i, { shape: a, checks: [] }))
    );
  }
  function Th(e, n) {
    if (!Le(n)) throw new Error("Invalid input to extend: expected a plain object");
    let i = e._zod.def.checks;
    if (i && i.length > 0) {
      let t = nt(e);
      for (let r of Reflect.ownKeys(n))
        if (Object.getOwnPropertyDescriptor(t, r) !== void 0)
          throw new Error(
            "Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.",
          );
    }
    return G(e, Be(e._zod.def, { shape: Fd(e, n) }));
  }
  function Fd(e, n) {
    let i = {};
    return (zt(i, e, Reflect.ownKeys(nt(e))), _h(i, n), i);
  }
  function Eh(e, n) {
    if (!Le(n)) throw new Error("Invalid input to safeExtend: expected a plain object");
    return G(e, Be(e._zod.def, { shape: Fd(e, n) }));
  }
  function Ah(e, n) {
    if (!n?._zod?.def)
      throw new Error(
        "Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.",
      );
    if (e._zod.def.checks?.length)
      throw new Error(
        ".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.",
      );
    let i = {};
    (zt(i, e, Reflect.ownKeys(nt(e))), zt(i, n, Reflect.ownKeys(nt(n))));
    let o = Be(e._zod.def, {
      shape: i,
      get catchall() {
        return n._zod.def.catchall;
      },
      checks: n._zod.def.checks ?? [],
    });
    return G(e, o);
  }
  function Dh(e, n, i, o = "partial") {
    let r = n._zod.def.checks;
    if (r && r.length > 0)
      throw new Error(`.${o}() cannot be used on object schemas containing refinements`);
    let s = i ? new Set(qr(n, i)) : void 0,
      u = {};
    return (
      zt(
        u,
        n,
        Reflect.ownKeys(nt(n)),
        e && ((c, l) => (s && !s.has(l) ? c : new e({ type: "optional", innerType: c }))),
      ),
      G(n, Be(n._zod.def, { shape: u, checks: [] }))
    );
  }
  function jh(e, n, i) {
    let o = i ? new Set(qr(n, i)) : void 0,
      t = {};
    return (
      zt(t, n, Reflect.ownKeys(nt(n)), (r, a) =>
        o && !o.has(a) ? r : new e({ type: "nonoptional", innerType: r }),
      ),
      G(n, Be(n._zod.def, { shape: t }))
    );
  }
  function xe(e, n = 0) {
    if (e.aborted === !0) return !0;
    for (let i = n; i < e.issues.length; i++) if (e.issues[i]?.continue !== !0) return !0;
    return !1;
  }
  function ma(e, n = 0) {
    if (e.aborted === !0) return !0;
    for (let i = n; i < e.issues.length; i++) if (e.issues[i]?.continue === !1) return !0;
    return !1;
  }
  function ze(e, n) {
    return n.map((i) => {
      var o;
      return ((o = i).path ?? (o.path = []), i.path.unshift(e), i);
    });
  }
  function Qt(e) {
    return typeof e == "string" ? e : e?.message;
  }
  function Xr(e, n, i) {
    var o;
    for (let t = n; t < e.length; t++) (o = e[t]).schema ?? (o.schema = i);
  }
  function Ne(e, n, i) {
    var o;
    let t = e.inst?._zod?.traits;
    t?.has("$ZodType") &&
      (t.has("$ZodCheck") ? ((o = e).schema ?? (o.schema = e.inst)) : (e.schema = e.inst));
    let r = e.schema !== e.inst ? e.schema?._zod.def?.error : void 0,
      a = e.message
        ? e.message
        : (Qt(e.inst?._zod.def?.error?.(e)) ??
          Qt(r?.(e)) ??
          Qt(n?.error?.(e)) ??
          Qt(i.customError?.(e)) ??
          Qt(i.localeError?.(e)) ??
          "Invalid input"),
      s = {};
    for (let u of Object.keys(e))
      u === "inst" ||
        u === "schema" ||
        u === "continue" ||
        u === "input" ||
        u === "__proto__" ||
        (s[u] = e[u]);
    return (s.path ?? (s.path = []), (s.message = a), n?.reportInput && (s.input = e.input), s);
  }
  function Xn(e) {
    return e instanceof Set
      ? "set"
      : e instanceof Map
        ? "map"
        : e instanceof File
          ? "file"
          : "unknown";
  }
  var Uh = /[\uD800-\uDBFF]/;
  function Pt(e) {
    let n = e.length;
    if (!Uh.test(e)) return n;
    let i = n;
    for (let o = 0; o < n - 1; o++)
      (e.charCodeAt(o) & 64512) === 55296 && (e.charCodeAt(o + 1) & 64512) === 56320 && (i--, o++);
    return i;
  }
  function Hn(e) {
    return Array.isArray(e) ? "array" : typeof e == "string" ? "string" : "unknown";
  }
  function _(e) {
    let n = typeof e;
    switch (n) {
      case "number":
        return Number.isNaN(e) ? "nan" : "number";
      case "object": {
        if (e === null) return "null";
        if (Array.isArray(e)) return "array";
        let i = e;
        if (
          i &&
          Object.getPrototypeOf(i) !== Object.prototype &&
          "constructor" in i &&
          i.constructor
        )
          return i.constructor.name;
      }
    }
    return n;
  }
  function on(...e) {
    let [n, i, o] = e;
    return typeof n == "string" ? { message: n, code: "custom", input: i, inst: o } : { ...n };
  }
  function Ch(e) {
    return Object.entries(e)
      .filter(([n, i]) => Number.isNaN(Number.parseInt(n, 10)))
      .map((n) => n[1]);
  }
  function Bd(e) {
    let n = atob(e),
      i = new Uint8Array(n.length);
    for (let o = 0; o < n.length; o++) i[o] = n.charCodeAt(o);
    return i;
  }
  function Wd(e) {
    let n = "";
    for (let i = 0; i < e.length; i++) n += String.fromCharCode(e[i]);
    return btoa(n);
  }
  function Lh(e) {
    let n = e.replace(/-/g, "+").replace(/_/g, "/"),
      i = "=".repeat((4 - (n.length % 4)) % 4);
    return Bd(n + i);
  }
  function Rh(e) {
    return Wd(e).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  function Zh(e) {
    let n = e.replace(/^0x/, "");
    if (n.length % 2 !== 0) throw new Error("Invalid hex string length");
    let i = new Uint8Array(n.length / 2);
    for (let o = 0; o < n.length; o += 2) i[o / 2] = Number.parseInt(n.slice(o, o + 2), 16);
    return i;
  }
  function Vh(e) {
    return Array.from(e)
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
  }
  var sa = class {
    constructor(...n) {}
  };
  function pa(e, n) {
    for (let i in n) {
      let o = Object.getOwnPropertyDescriptor(n, i);
      o.get ? Object.defineProperty(e, i, { ...o, enumerable: !1 }) : Fh(e, i, o.value);
    }
  }
  function lt(e, n, i, o = !0) {
    return (
      Object.defineProperty(e, n, { configurable: !0, writable: !0, enumerable: o, value: i }), i
    );
  }
  function Yn(e, n, i) {
    return lt(e, n, i, !1);
  }
  function Mh(e, n) {
    for (let i in e) {
      let o = e[i];
      Object.defineProperty(n, i, {
        configurable: !0,
        enumerable: !0,
        get() {
          return lt(this, i, o(this));
        },
        set(t) {
          lt(this, i, t);
        },
      });
    }
    return n;
  }
  function Fh(e, n, i) {
    Object.defineProperty(e, n, {
      configurable: !0,
      get() {
        return this == null ? i : lt(this, n, i.bind(this));
      },
      set(o) {
        lt(this, n, o);
      },
    });
  }
  function Bh(e, n) {
    let i = Object.getPrototypeOf(e);
    return n in i ? void 0 : i;
  }
  var oa,
    ut = !1,
    Wh = {
      configurable: !0,
      get() {
        ut = !0;
      },
    };
  function M(e, n, i) {
    let o = Object.getPrototypeOf(e._zod);
    if (n in o && oa !== e._zod) {
      oa = void 0;
      return;
    }
    ((oa = e._zod),
      Object.defineProperty(o, n, {
        configurable: !0,
        get() {
          Object.defineProperty(this, n, Wh);
          let t = ut;
          ut = !1;
          try {
            let r = i(this);
            return (
              ut
                ? delete this[n]
                : Object.defineProperty(this, n, { configurable: !0, writable: !0, value: r }),
              (ut = ut || t),
              r
            );
          } catch (r) {
            throw (delete this[n], (ut = ut || t), r);
          }
        },
        set(t) {
          Object.defineProperty(this, n, { configurable: !0, writable: !0, value: t });
        },
      }));
  }
  function Jh(e, n, i, o) {
    let t = Bh(e, n);
    t &&
      Object.defineProperty(t, n, {
        configurable: !0,
        get() {
          let r = { configurable: !0, writable: !0, enumerable: o, value: void 0 };
          return (
            Object.defineProperty(this, n, r),
            (r.value = i(this)),
            Object.defineProperty(this, n, r),
            r.value
          );
        },
        set(r) {
          Object.defineProperty(this, n, {
            configurable: !0,
            writable: !0,
            enumerable: o,
            value: r,
          });
        },
      });
  }
  var Hr = "~constantCatch";
  function ga(e) {
    let n = () => e;
    return ((n[Hr] = !0), n);
  }
  var Jd,
    va = Object.freeze({ status: "aborted" }),
    ha = { value: void 0, enumerable: !1 },
    Gd = "captureStackTrace" in Error ? Error : null;
  function Gh(e) {
    let n = Gd;
    if (n) {
      let i = n.stackTraceLimit;
      if (typeof i == "number") {
        try {
          n.stackTraceLimit = 0;
        } catch {
          return ((Gd = null), new e());
        }
        try {
          return new e();
        } finally {
          n.stackTraceLimit = i;
        }
      }
    }
    return new e();
  }
  function h(e, n, i, o) {
    let t = {};
    function r(d) {
      ((this.def = d), (this.constr = f), (this.traits = new Set()));
    }
    r.prototype = t;
    let a = i,
      s = a && new WeakSet();
    function u(d, m) {
      if (d._zod) {
        if (d._zod.traits.has(e)) return;
      } else {
        ha.value = new r(m);
        try {
          Object.defineProperty(d, "_zod", ha);
        } finally {
          ha.value = void 0;
        }
      }
      if ((d._zod.traits.add(e), n(d, m), s)) {
        let $ = Object.getPrototypeOf(d),
          w = d._zod.constr.prototype,
          z = $;
        for (; z && z !== w; ) z = Object.getPrototypeOf(z);
        let x = z ?? $;
        s.has(x) || (s.add(x), pa(x, a));
      }
      let g = f.prototype;
      for (let $ in g)
        Object.prototype.hasOwnProperty.call(g, $) && ($ in d || (d[$] = g[$].bind(d)));
    }
    let c = o?.Parent ?? Object;
    class l extends c {}
    Object.defineProperty(l, "name", { value: e });
    function f(d) {
      let m = o?.Parent ? Gh(l) : this;
      u(m, d);
      let g = m._zod.deferred;
      if (g) {
        for (let w of g) w();
        m._zod.deferred = void 0;
      }
      let $ = globalThis.__zod_globalConfig?.postProcessor;
      return ($ && $(m), m);
    }
    return (
      Object.defineProperty(f, "init", { value: u }),
      Object.defineProperty(f, Symbol.hasInstance, {
        value: (d) => (o?.Parent && d instanceof o.Parent ? !0 : d?._zod?.traits?.has(e)),
      }),
      Object.defineProperty(f, "name", { value: e }),
      f
    );
  }
  var $a = Symbol("zod_brand"),
    Pe = class extends Error {
      constructor() {
        super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
      }
    },
    dt = class extends Error {
      constructor(n) {
        (super(`Encountered unidirectional transform during encode: ${n}`),
          (this.name = "ZodEncodeError"));
      }
    };
  (Jd = globalThis).__zod_globalConfig ?? (Jd.__zod_globalConfig = {});
  var fe = globalThis.__zod_globalConfig;
  function re(e) {
    return (e && Object.assign(fe, e), fe);
  }
  function Kh() {
    let e = this._zod;
    return (e.message ?? (e.message = JSON.stringify(e.def, tn, 2)), e.message);
  }
  function qh(e) {
    this._zod.message = e;
  }
  var Xh = { get: Kh, set: qh, enumerable: !0, configurable: !0 },
    ba = { value: void 0, enumerable: !1 },
    Kd = new WeakSet([Object.prototype, Error.prototype]),
    qd = (e, n) => {
      ((e.name = "$ZodError"),
        (ba.value = n),
        Object.defineProperty(e, "issues", ba),
        (ba.value = void 0),
        Object.defineProperty(e, "message", Xh));
      let i = Object.getPrototypeOf(e);
      Kd.has(i) ||
        (Kd.add(i),
        Object.defineProperty(i, "toString", {
          configurable: !0,
          enumerable: !1,
          get() {
            let o = () => this.message;
            return (
              Object.defineProperty(this, "toString", { value: o, configurable: !0, writable: !0 }),
              o
            );
          },
          set(o) {
            Object.defineProperty(this, "toString", { value: o, configurable: !0, writable: !0 });
          },
        }));
    },
    _a = h("$ZodError", qd),
    Oe = h("$ZodError", qd, void 0, { Parent: Error });
  function Hh(e, n, i) {
    return (
      Object.prototype.hasOwnProperty.call(e, n) ||
        (n === "__proto__"
          ? Object.defineProperty(e, n, {
              value: i(),
              writable: !0,
              enumerable: !0,
              configurable: !0,
            })
          : (e[n] = i())),
      e[n]
    );
  }
  function Qn(e, n = (i) => i.message) {
    let i = {},
      o = [];
    for (let t of e.issues)
      t.path.length > 0 ? Hh(i, t.path[0], () => []).push(n(t)) : o.push(n(t));
    return { formErrors: o, fieldErrors: i };
  }
  function er(e, n = (i) => i.message) {
    let i = { _errors: [] },
      o = (t, r = []) => {
        for (let a of t.issues)
          if (a.code === "invalid_union" && a.errors.length)
            a.errors.map((s) => o({ issues: s }, [...r, ...a.path]));
          else if (a.code === "invalid_key") o({ issues: a.issues }, [...r, ...a.path]);
          else if (a.code === "invalid_element") o({ issues: a.issues }, [...r, ...a.path]);
          else {
            let s = [...r, ...a.path];
            if (s.length === 0) i._errors.push(n(a));
            else {
              let u = i,
                c = 0;
              for (; c < s.length; ) {
                let l = s[c],
                  f = c === s.length - 1;
                if (l === "_errors") {
                  (f && u._errors.push(n(a)), c++);
                  continue;
                }
                Object.prototype.hasOwnProperty.call(u, l) ||
                  Object.defineProperty(u, l, {
                    value: { _errors: [] },
                    enumerable: !0,
                    writable: !0,
                    configurable: !0,
                  });
                let d = u[l];
                (f && d._errors.push(n(a)), (u = d), c++);
              }
            }
          }
      };
    return (o(e), i);
  }
  function wa(e, n = (i) => i.message) {
    let i = { errors: [] },
      o = (t, r = []) => {
        var a;
        for (let s of t.issues)
          if (s.code === "invalid_union" && s.errors.length)
            s.errors.map((u) => o({ issues: u }, [...r, ...s.path]));
          else if (s.code === "invalid_key") o({ issues: s.issues }, [...r, ...s.path]);
          else if (s.code === "invalid_element") o({ issues: s.issues }, [...r, ...s.path]);
          else {
            let u = [...r, ...s.path];
            if (u.length === 0) {
              i.errors.push(n(s));
              continue;
            }
            let c = i,
              l = 0;
            for (; l < u.length; ) {
              let f = u[l],
                d = l === u.length - 1;
              (typeof f == "string"
                ? (c.properties ?? (c.properties = {}),
                  Object.prototype.hasOwnProperty.call(c.properties, f) ||
                    Object.defineProperty(c.properties, f, {
                      value: { errors: [] },
                      enumerable: !0,
                      writable: !0,
                      configurable: !0,
                    }),
                  (c = c.properties[f]))
                : (c.items ?? (c.items = []),
                  (a = c.items)[f] ?? (a[f] = { errors: [] }),
                  (c = c.items[f])),
                d && c.errors.push(n(s)),
                l++);
            }
          }
      };
    return (o(e), i);
  }
  function Xd(e) {
    let n = [],
      i = e.map((o) => (typeof o == "object" ? o.key : o));
    for (let o of i)
      typeof o == "number"
        ? n.push(`[${o}]`)
        : typeof o == "symbol"
          ? n.push(`[${JSON.stringify(String(o))}]`)
          : /[^\w$]/.test(o)
            ? n.push(`[${JSON.stringify(o)}]`)
            : (n.length && n.push("."), n.push(o));
    return n.join("");
  }
  function Ot(e) {
    let n = [],
      i = [...e.issues].sort((o, t) => (o.path ?? []).length - (t.path ?? []).length);
    for (let o of i)
      (n.push(`\u2716 ${o.message}`), o.path?.length && n.push(`  \u2192 at ${Xd(o.path)}`));
    return n.join(`
`);
  }
  function Yr(e, n) {
    return { callee: n?.callee ?? e, Err: n?.Err };
  }
  var an = (e) => {
      let n = (i, o, t, r) => {
        let a = t ? { ...t, async: !1 } : { async: !1 },
          s = i._zod.run({ value: o, issues: [] }, a);
        if (s instanceof Promise) throw new Pe();
        if (s.issues.length) {
          let u = new (r?.Err ?? e)(s.issues.map((c) => Ne(c, a, re())));
          throw (Kr(u, r?.callee ?? n), u);
        }
        return s.value;
      };
      return n;
    },
    Qr = an(Oe),
    sn = (e) => {
      let n = async (i, o, t, r) => {
        let a = t ? { ...t, async: !0 } : { async: !0 },
          s = i._zod.run({ value: o, issues: [] }, a);
        if ((s instanceof Promise && (s = await s), s.issues.length)) {
          let u = new (r?.Err ?? e)(s.issues.map((c) => Ne(c, a, re())));
          throw (Kr(u, r?.callee ?? n), u);
        }
        return s.value;
      };
      return n;
    },
    ei = sn(Oe),
    cn = (e) => (n, i, o) => {
      let t = o ? { ...o, async: !1 } : { async: !1 },
        r = n._zod.run({ value: i, issues: [] }, t);
      if (r instanceof Promise) throw new Pe();
      return r.issues.length ? Hd(e, r.issues, t) : { success: !0, data: r.value };
    },
    Qh = cn(Oe);
  function Hd(e, n, i) {
    let o;
    return {
      success: !1,
      get error() {
        return (o || ((o = new e(n.map((t) => Ne(t, i, re())))), (n = void 0), (i = void 0)), o);
      },
      set error(t) {
        ((o = t), (n = void 0), (i = void 0));
      },
    };
  }
  var un = (e) => async (n, i, o) => {
      let t = o ? { ...o, async: !0 } : { async: !0 },
        r = n._zod.run({ value: i, issues: [] }, t);
      return (
        r instanceof Promise && (r = await r),
        r.issues.length ? Hd(e, r.issues, t) : { success: !0, data: r.value }
      );
    },
    ev = un(Oe),
    tv = Symbol.for("zod.compile.invalid"),
    nv = Symbol.for("zod.compile.fallback"),
    tr = (e, n, i) => {
      let o = e._zod.bag.validator;
      if (o !== void 0) {
        if (o(n) !== tv) return !0;
        if (o.definite === !0 && i === void 0) return !1;
      }
      return rv(e, n, i);
    };
  function rv(e, n, i) {
    let o = i ? { ...i, async: !1, abortEarly: !0 } : { async: !1, abortEarly: !0 },
      t = e._zod.bag.fallbackRun,
      r;
    if (
      (t
        ? ((o[nv] = !0), (r = t({ value: n, issues: [] }, o)))
        : (r = e._zod.run({ value: n, issues: [] }, o)),
      r instanceof Promise)
    )
      throw new Pe();
    return r.issues.length === 0;
  }
  var nr = async (e, n, i) => {
      let o = i ? { ...i, async: !0, abortEarly: !0 } : { async: !0, abortEarly: !0 },
        t = e._zod.run({ value: n, issues: [] }, o);
      return (t instanceof Promise && (t = await t), t.issues.length === 0);
    },
    ti = (e) => {
      let n = an(e),
        i = (o, t, r, a) => {
          let s = r ? { ...r, direction: "backward" } : { direction: "backward" };
          return n(o, t, s, Yr(i, a));
        };
      return i;
    },
    iv = ti(Oe),
    ni = (e) => {
      let n = an(e),
        i = (o, t, r, a) => n(o, t, r, Yr(i, a));
      return i;
    },
    ov = ni(Oe),
    ri = (e) => {
      let n = sn(e),
        i = async (o, t, r, a) => {
          let s = r ? { ...r, direction: "backward" } : { direction: "backward" };
          return await n(o, t, s, Yr(i, a));
        };
      return i;
    },
    av = ri(Oe),
    ii = (e) => {
      let n = sn(e),
        i = async (o, t, r, a) => await n(o, t, r, Yr(i, a));
      return i;
    },
    sv = ii(Oe),
    oi = (e) => (n, i, o) => {
      let t = o ? { ...o, direction: "backward" } : { direction: "backward" };
      return cn(e)(n, i, t);
    },
    cv = oi(Oe),
    ai = (e) => (n, i, o) => cn(e)(n, i, o),
    uv = ai(Oe),
    si = (e) => async (n, i, o) => {
      let t = o ? { ...o, direction: "backward" } : { direction: "backward" };
      return un(e)(n, i, t);
    },
    lv = si(Oe),
    ci = (e) => async (n, i, o) => un(e)(n, i, o),
    dv = ci(Oe);
  var Ze = {};
  Ge(Ze, {
    anyString: () => qa,
    base64: () => Za,
    base64url: () => Va,
    bigint: () => Ha,
    boolean: () => Ya,
    browserEmail: () => yv,
    cidrv4: () => La,
    cidrv6: () => Ra,
    creditCard: () => ui,
    cuid: () => ka,
    cuid2: () => Ia,
    currencyCode: () => Wa,
    date: () => Ja,
    datetime: () => Ka,
    domain: () => Fa,
    duration: () => Ta,
    e164: () => Ba,
    email: () => Aa,
    emoji: () => Da,
    extendedDuration: () => fv,
    guid: () => Ea,
    hex: () => rs,
    hostname: () => Ma,
    html5Email: () => hv,
    httpProtocol: () => rr,
    iban: () => li,
    idnEmail: () => $v,
    integer: () => ir,
    ipv4: () => ja,
    ipv6: () => Ua,
    ksuid: () => Na,
    lowercase: () => ts,
    mac: () => Ca,
    md5_base64: () => xv,
    md5_base64url: () => kv,
    md5_hex: () => wv,
    nanoid: () => Pa,
    nanoidOfLength: () => Oa,
    null: () => Qa,
    number: () => it,
    rfc5322Email: () => vv,
    sha1_base64: () => Sv,
    sha1_base64url: () => zv,
    sha1_hex: () => Iv,
    sha256_base64: () => Pv,
    sha256_base64url: () => Ov,
    sha256_hex: () => Nv,
    sha384_base64: () => Ev,
    sha384_base64url: () => Av,
    sha384_hex: () => Tv,
    sha512_base64: () => jv,
    sha512_base64url: () => Uv,
    sha512_hex: () => Dv,
    string: () => Xa,
    time: () => Ga,
    ulid: () => Sa,
    undefined: () => es,
    unicodeEmail: () => Yd,
    uppercase: () => ns,
    uuid: () => Tt,
    uuid4: () => mv,
    uuid6: () => pv,
    uuid7: () => gv,
    xid: () => za,
  });
  var ka = /^[cC][0-9a-z]{6,}$/,
    Ia = /^[0-9a-z]+$/,
    Sa = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/,
    za = /^[0-9a-vA-V]{20}$/,
    Na = /^[A-Za-z0-9]{27}$/,
    Pa = /^[a-zA-Z0-9_-]{21}$/;
  function Oa(e) {
    return new RegExp(`^[a-zA-Z0-9_-]{${e}}$`);
  }
  var Ta =
      /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/,
    fv =
      /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
    Ea = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
    Tt = (e) =>
      e
        ? new RegExp(
            `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`,
          )
        : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/,
    mv = Tt(4),
    pv = Tt(6),
    gv = Tt(7),
    Aa =
      /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/,
    hv =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    vv =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    Yd = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u,
    $v = Yd,
    yv =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    bv =
      "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
  function Da() {
    return new RegExp(bv, "u");
  }
  var ja =
      /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    Ua =
      /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/,
    Ca = (e) => {
      let n = Re(e ?? ":");
      return new RegExp(`^(?:[0-9A-F]{2}${n}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${n}){5}[0-9a-f]{2}$`);
    },
    La =
      /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/,
    Ra =
      /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    Za = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/,
    Va = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/,
    Ma =
      /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/,
    Fa = /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/,
    rr = /^https?$/,
    Ba = /^\+[1-9]\d{6,14}$/,
    ui = /^\d(?:[ -]?\d){11,18}$/,
    Wa =
      /^(?:AED|AFN|ALL|AMD|AOA|ARS|AUD|AWG|AZN|BAM|BBD|BDT|BHD|BIF|BMD|BND|BOB|BOV|BRL|BSD|BTN|BWP|BYN|BZD|CAD|CDF|CHE|CHF|CHW|CLF|CLP|CNY|COP|COU|CRC|CUP|CVE|CZK|DJF|DKK|DOP|DZD|EGP|ERN|ETB|EUR|FJD|FKP|GBP|GEL|GHS|GIP|GMD|GNF|GTQ|GYD|HKD|HNL|HTG|HUF|IDR|ILS|INR|IQD|IRR|ISK|JMD|JOD|JPY|KES|KGS|KHR|KMF|KPW|KRW|KWD|KYD|KZT|LAK|LBP|LKR|LRD|LSL|LYD|MAD|MDL|MGA|MKD|MMK|MNT|MOP|MRU|MUR|MVR|MWK|MXN|MXV|MYR|MZN|NAD|NGN|NIO|NOK|NPR|NZD|OMR|PAB|PEN|PGK|PHP|PKR|PLN|PYG|QAR|RON|RSD|RUB|RWF|SAR|SBD|SCR|SDG|SEK|SGD|SHP|SLE|SOS|SRD|SSP|STN|SVC|SYP|SZL|THB|TJS|TMT|TND|TOP|TRY|TTD|TWD|TZS|UAH|UGX|USD|USN|UYI|UYU|UYW|UZS|VED|VES|VND|VUV|WST|XAD|XAF|XAG|XAU|XBA|XBB|XBC|XBD|XCD|XCG|XDR|XOF|XPD|XPF|XPT|XSU|XTS|XUA|XXX|YER|ZAR|ZMW|ZWG)$/,
    li = /^[A-Z]{2}(?!00|01|99)\d{2}[A-Z0-9]{11,30}$/,
    Qd =
      "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
  function _v(e) {
    return new RegExp(`^${e}$`);
  }
  var Ja = _v(Qd);
  function xa(e) {
    let n = "(?:[01]\\d|2[0-3]):[0-5]\\d";
    return typeof e.precision == "number"
      ? e.precision === -1
        ? `${n}`
        : e.precision === 0
          ? `${n}:[0-5]\\d`
          : `${n}:[0-5]\\d\\.\\d{${e.precision}}`
      : e.seconds
        ? `${n}:[0-5]\\d(?:\\.\\d+)?`
        : `${n}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  }
  function Ga(e) {
    return new RegExp(`^${xa(e)}$`);
  }
  function Ka(e) {
    let n = ["Z"];
    e.offset && n.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
    let i = `${xa({ precision: e.precision, seconds: !0 })}(?:${n.join("|")})`,
      o = e.local ? `${i}|${xa({ precision: e.precision })}` : i;
    return new RegExp(`^${Qd}T(?:${o})$`);
  }
  var qa = /^[\s\S]{0,}$/,
    Xa = (e) => {
      let n = e ? `[\\s\\S]{${e?.minimum ?? 0},${e?.maximum ?? ""}}` : "[\\s\\S]*";
      return new RegExp(`^${n}$`);
    },
    Ha = /^-?\d+n?$/,
    ir = /^-?\d+$/,
    it = /^-?\d+(?:\.\d+)?$/,
    Ya = /^(?:true|false)$/i,
    Qa = /^null$/i;
  var es = /^undefined$/i;
  var ts = /^[^A-Z]*$/,
    ns = /^[^a-z]*$/,
    rs = /^[0-9a-fA-F]*$/;
  function or(e, n) {
    return new RegExp(`^[A-Za-z0-9+/]{${e}}${n}$`);
  }
  function ar(e) {
    return new RegExp(`^[A-Za-z0-9_-]{${e}}$`);
  }
  var wv = /^[0-9a-fA-F]{32}$/,
    xv = or(22, "=="),
    kv = ar(22),
    Iv = /^[0-9a-fA-F]{40}$/,
    Sv = or(27, "="),
    zv = ar(27),
    Nv = /^[0-9a-fA-F]{64}$/,
    Pv = or(43, "="),
    Ov = ar(43),
    Tv = /^[0-9a-fA-F]{96}$/,
    Ev = or(64, ""),
    Av = ar(64),
    Dv = /^[0-9a-fA-F]{128}$/,
    jv = or(86, "=="),
    Uv = ar(86);
  var Q = h("$ZodCheck", (e, n) => {
      var i;
      (e._zod ?? (e._zod = {}), (e._zod.def = n), (i = e._zod).onattach ?? (i.onattach = []));
    }),
    is = (e) => {
      let n = e.value;
      return !Gr(n) && n.size !== void 0;
    },
    os = (e) => {
      let n = e.value;
      return !Gr(n) && n.length !== void 0;
    },
    di = { number: "number", bigint: "bigint", object: "date" },
    mi = h("$ZodCheckLessThan", (e, n) => {
      Q.init(e, n);
      let i = di[typeof n.value];
      e._zod.check = (o) => {
        (n.inclusive ? o.value <= n.value : o.value < n.value) ||
          o.issues.push({
            origin: di[typeof o.value] ?? i,
            code: "too_big",
            maximum: typeof n.value == "object" ? n.value.getTime() : n.value,
            input: o.value,
            inclusive: n.inclusive,
            inst: e,
            continue: !n.abort,
          });
      };
    }),
    pi = h("$ZodCheckGreaterThan", (e, n) => {
      Q.init(e, n);
      let i = di[typeof n.value];
      e._zod.check = (o) => {
        (n.inclusive ? o.value >= n.value : o.value > n.value) ||
          o.issues.push({
            origin: di[typeof o.value] ?? i,
            code: "too_small",
            minimum: typeof n.value == "object" ? n.value.getTime() : n.value,
            input: o.value,
            inclusive: n.inclusive,
            inst: e,
            continue: !n.abort,
          });
      };
    }),
    as = h("$ZodCheckMultipleOf", (e, n) => {
      (Q.init(e, n),
        (e._zod.check = (i) => {
          if (typeof i.value != typeof n.value)
            throw new Error("Cannot mix number and bigint in multiple_of check.");
          (typeof i.value == "bigint"
            ? n.value !== BigInt(0) && i.value % n.value === BigInt(0)
            : Wn(i.value, n.value) === 0) ||
            i.issues.push({
              origin: typeof i.value,
              code: "not_multiple_of",
              divisor: n.value,
              input: i.value,
              inst: e,
              continue: !n.abort,
            });
        }));
    }),
    ss = h("$ZodCheckNumberFormat", (e, n) => {
      (Q.init(e, n), (n.format = n.format || "float64"));
      let i = n.format?.includes("int"),
        o = i ? "int" : "number",
        [t, r] = Kn[n.format];
      e._zod.check = (a) => {
        let s = a.value;
        if (i) {
          if (!Number.isInteger(s)) {
            a.issues.push({
              expected: o,
              format: n.format,
              code: "invalid_type",
              continue: !1,
              input: s,
              inst: e,
            });
            return;
          }
          if (!Number.isSafeInteger(s)) {
            s > 0
              ? a.issues.push({
                  input: s,
                  code: "too_big",
                  maximum: Number.MAX_SAFE_INTEGER,
                  note: "Integers must be within the safe integer range.",
                  inst: e,
                  origin: o,
                  inclusive: !0,
                  continue: !n.abort,
                })
              : a.issues.push({
                  input: s,
                  code: "too_small",
                  minimum: Number.MIN_SAFE_INTEGER,
                  note: "Integers must be within the safe integer range.",
                  inst: e,
                  origin: o,
                  inclusive: !0,
                  continue: !n.abort,
                });
            return;
          }
        }
        (s < t &&
          a.issues.push({
            origin: "number",
            input: s,
            code: "too_small",
            minimum: t,
            inclusive: !0,
            inst: e,
            continue: !n.abort,
          }),
          s > r &&
            a.issues.push({
              origin: "number",
              input: s,
              code: "too_big",
              maximum: r,
              inclusive: !0,
              inst: e,
              continue: !n.abort,
            }));
      };
    }),
    cs = h("$ZodCheckBigIntFormat", (e, n) => {
      Q.init(e, n);
      let [i, o] = qn[n.format];
      e._zod.check = (t) => {
        let r = t.value;
        (r < i &&
          t.issues.push({
            origin: "bigint",
            input: r,
            code: "too_small",
            minimum: i,
            inclusive: !0,
            inst: e,
            continue: !n.abort,
          }),
          r > o &&
            t.issues.push({
              origin: "bigint",
              input: r,
              code: "too_big",
              maximum: o,
              inclusive: !0,
              inst: e,
              continue: !n.abort,
            }));
      };
    }),
    us = h("$ZodCheckMaxSize", (e, n) => {
      var i;
      (Q.init(e, n),
        (i = e._zod.def).when ?? (i.when = is),
        (e._zod.check = (o) => {
          let t = o.value;
          t.size <= n.maximum ||
            o.issues.push({
              origin: Xn(t),
              code: "too_big",
              maximum: n.maximum,
              inclusive: !0,
              input: t,
              inst: e,
              continue: !n.abort,
            });
        }));
    }),
    ls = h("$ZodCheckMinSize", (e, n) => {
      var i;
      (Q.init(e, n),
        (i = e._zod.def).when ?? (i.when = is),
        (e._zod.check = (o) => {
          let t = o.value;
          t.size >= n.minimum ||
            o.issues.push({
              origin: Xn(t),
              code: "too_small",
              minimum: n.minimum,
              inclusive: !0,
              input: t,
              inst: e,
              continue: !n.abort,
            });
        }));
    }),
    ds = h("$ZodCheckSizeEquals", (e, n) => {
      var i;
      (Q.init(e, n),
        (i = e._zod.def).when ?? (i.when = is),
        (e._zod.check = (o) => {
          let t = o.value,
            r = t.size;
          if (r === n.size) return;
          let a = r > n.size;
          o.issues.push({
            origin: Xn(t),
            ...(a ? { code: "too_big", maximum: n.size } : { code: "too_small", minimum: n.size }),
            inclusive: !0,
            exact: !0,
            input: o.value,
            inst: e,
            continue: !n.abort,
          });
        }));
    }),
    fs = h("$ZodCheckMaxLength", (e, n) => {
      var i;
      (Q.init(e, n),
        (i = e._zod.def).when ?? (i.when = os),
        (e._zod.check = (o) => {
          let t = o.value,
            r = t.length;
          if ((typeof t == "string" && r > n.maximum ? Pt(t) : r) <= n.maximum) return;
          let s = Hn(t);
          o.issues.push({
            origin: s,
            code: "too_big",
            maximum: n.maximum,
            inclusive: !0,
            input: t,
            inst: e,
            continue: !n.abort,
          });
        }));
    }),
    ms = h("$ZodCheckMinLength", (e, n) => {
      var i;
      (Q.init(e, n),
        (i = e._zod.def).when ?? (i.when = os),
        (e._zod.check = (o) => {
          let t = o.value,
            r = t.length;
          if (
            (typeof t == "string" && r >= n.minimum && r < n.minimum * 2 ? Pt(t) : r) >= n.minimum
          )
            return;
          let s = Hn(t);
          o.issues.push({
            origin: s,
            code: "too_small",
            minimum: n.minimum,
            inclusive: !0,
            input: t,
            inst: e,
            continue: !n.abort,
          });
        }));
    }),
    ps = h("$ZodCheckLengthEquals", (e, n) => {
      var i;
      (Q.init(e, n),
        (i = e._zod.def).when ?? (i.when = os),
        (e._zod.check = (o) => {
          let t = o.value,
            r = t.length,
            a = typeof t == "string" && r >= n.length && r <= n.length * 2 ? Pt(t) : r;
          if (a === n.length) return;
          let s = Hn(t),
            u = a > n.length;
          o.issues.push({
            origin: s,
            ...(u
              ? { code: "too_big", maximum: n.length }
              : { code: "too_small", minimum: n.length }),
            inclusive: !0,
            exact: !0,
            input: o.value,
            inst: e,
            continue: !n.abort,
          });
        }));
    }),
    ln = h("$ZodCheckStringFormat", (e, n) => {
      var i, o;
      (Q.init(e, n),
        n.pattern
          ? ((i = e._zod).check ??
            (i.check = (t) => {
              ((n.pattern.lastIndex = 0),
                !n.pattern.test(t.value) &&
                  t.issues.push({
                    origin: "string",
                    code: "invalid_format",
                    format: n.format,
                    input: t.value,
                    ...(n.pattern ? { pattern: n.pattern.toString() } : {}),
                    inst: e,
                    continue: !n.abort,
                  }));
            }))
          : ((o = e._zod).check ?? (o.check = () => {})));
    }),
    gs = h("$ZodCheckRegex", (e, n) => {
      (ln.init(e, n),
        (e._zod.check = (i) => {
          ((n.pattern.lastIndex = 0),
            !n.pattern.test(i.value) &&
              i.issues.push({
                origin: "string",
                code: "invalid_format",
                format: "regex",
                input: i.value,
                pattern: n.pattern.toString(),
                inst: e,
                continue: !n.abort,
              }));
        }));
    }),
    hs = h("$ZodCheckLowerCase", (e, n) => {
      (n.pattern ?? (n.pattern = ts), ln.init(e, n));
    }),
    vs = h("$ZodCheckUpperCase", (e, n) => {
      (n.pattern ?? (n.pattern = ns), ln.init(e, n));
    }),
    $s = h("$ZodCheckIncludes", (e, n) => {
      Q.init(e, n);
      let i = Re(n.includes),
        o = new RegExp(typeof n.position == "number" ? `^.{${n.position},}${i}` : i);
      ((n.pattern = o),
        (e._zod.check = (t) => {
          t.value.includes(n.includes, n.position) ||
            t.issues.push({
              origin: "string",
              code: "invalid_format",
              format: "includes",
              includes: n.includes,
              input: t.value,
              inst: e,
              continue: !n.abort,
            });
        }));
    }),
    ys = h("$ZodCheckStartsWith", (e, n) => {
      Q.init(e, n);
      let i = new RegExp(`^${Re(n.prefix)}.*`);
      (n.pattern ?? (n.pattern = i),
        (e._zod.check = (o) => {
          o.value.startsWith(n.prefix) ||
            o.issues.push({
              origin: "string",
              code: "invalid_format",
              format: "starts_with",
              prefix: n.prefix,
              input: o.value,
              inst: e,
              continue: !n.abort,
            });
        }));
    }),
    bs = h("$ZodCheckEndsWith", (e, n) => {
      Q.init(e, n);
      let i = new RegExp(`.*${Re(n.suffix)}$`);
      (n.pattern ?? (n.pattern = i),
        (e._zod.check = (o) => {
          o.value.endsWith(n.suffix) ||
            o.issues.push({
              origin: "string",
              code: "invalid_format",
              format: "ends_with",
              suffix: n.suffix,
              input: o.value,
              inst: e,
              continue: !n.abort,
            });
        }));
    });
  function fi(e, n, i) {
    e.issues.length && n.issues.push(...ze(i, e.issues));
  }
  var _s = h("$ZodCheckProperty", (e, n) => {
      (Q.init(e, n),
        (e._zod.check = (i) => {
          let o = n.schema._zod.run({ value: i.value[n.property], issues: [] }, {});
          if (o instanceof Promise) return o.then((t) => fi(t, i, n.property));
          fi(o, i, n.property);
        }));
    }),
    ws = h("$ZodCheckProperties", (e, n) => {
      (Q.init(e, n),
        Yn(e, Symbol.iterator, function* () {
          yield e;
        }));
      let i;
      e._zod.check = (o) => {
        if (o.value == null) {
          o.issues.push({ expected: "object", code: "invalid_type", input: o.value, inst: e });
          return;
        }
        i ?? (i = Reflect.ownKeys(n.shape).map((a) => [a, n.shape[a]]));
        let t = o.value,
          r;
        for (let [a, s] of i) {
          let u = s._zod.run({ value: t[a], issues: [] }, {});
          u instanceof Promise ? (r ?? (r = []), r.push(u.then((c) => fi(c, o, a)))) : fi(u, o, a);
        }
        if (r) return Promise.all(r).then(() => {});
      };
    }),
    xs = h("$ZodCheckMimeType", (e, n) => {
      Q.init(e, n);
      let i = new Set(n.mime);
      e._zod.check = (o) => {
        i.has(o.value.type) ||
          o.issues.push({
            code: "invalid_value",
            values: n.mime,
            input: o.value.type,
            inst: e,
            continue: !n.abort,
          });
      };
    }),
    ks = h("$ZodCheckOverwrite", (e, n) => {
      (Q.init(e, n),
        (e._zod.check = (i) => {
          i.value = n.tx(i.value);
        }));
    });
  var Et = class {
    constructor(n = [], i = {}) {
      ((this.content = []), (this.indent = 0), (this.args = n), (this.closed = i));
    }
    indented(n) {
      this.indent += 1;
      try {
        n(this);
      } finally {
        this.indent -= 1;
      }
    }
    write(n) {
      if (typeof n == "function") {
        (n(this, { execution: "sync" }), n(this, { execution: "async" }));
        return;
      }
      let o = n
          .split(`
`)
          .filter((a) => a),
        t = Math.min(...o.map((a) => a.length - a.trimStart().length)),
        r = o.map((a) => a.slice(t)).map((a) => " ".repeat(this.indent * 2) + a);
      for (let a of r) this.content.push(a);
    }
    compile() {
      let n = Function,
        i = this?.content ?? [""];
      return new n(
        ...Object.keys(this.closed),
        `return function (${this.args.join(", ")}) {
${i.join(`
`)}
};`,
      )(...Object.values(this.closed));
    }
  };
  var Is = { major: 4, minor: 6, patch: 5 };
  var L = h(
      "$ZodType",
      (e, n) => {
        var i;
        (e ?? (e = {}), (e._zod.def = n), (e._zod.bag = e._zod.bag || {}), (e._zod.version = Is));
        let o = e._zod.def.checks,
          t = e._zod.traits.has("$ZodCheck") ? [e, ...(o ?? [])] : o?.length ? [...o] : [];
        for (let r of t) for (let a of r._zod.onattach) a(e);
        if (t.length === 0)
          ((i = e._zod).deferred ?? (i.deferred = []),
            e._zod.deferred?.push(() => {
              e._zod.run = e._zod.parse;
            }));
        else {
          let r = (s, u, c) => {
              if (s.memo) return s;
              let l = xe(s),
                f;
              for (let d of u) {
                if (d._zod.def.when) {
                  if (ma(s) || !d._zod.def.when(s)) continue;
                } else if (l) continue;
                let m = s.issues.length,
                  g = d._zod.check(s);
                if (g instanceof Promise && c?.async === !1) throw new Pe();
                if (f || g instanceof Promise)
                  f = (f ?? Promise.resolve()).then(async () => {
                    (await g, s.issues.length !== m && (Xr(s.issues, m, e), l || (l = xe(s, m))));
                  });
                else {
                  if (s.issues.length === m) continue;
                  (Xr(s.issues, m, e), l || (l = xe(s, m)));
                }
              }
              return f ? f.then(() => s) : s;
            },
            a = (s, u, c) => {
              if (xe(s)) return ((s.aborted = !0), s);
              let l = r(u, t, c);
              if (l instanceof Promise) {
                if (c.async === !1) throw new Pe();
                return l.then((f) => e._zod.parse(f, c));
              }
              return e._zod.parse(l, c);
            };
          e._zod.run = (s, u) => {
            if (u.skipChecks) return e._zod.parse(s, u);
            if (u.direction === "backward") {
              let l = e._zod.parse({ value: s.value, issues: [] }, { ...u, skipChecks: !0 });
              return l instanceof Promise ? l.then((f) => a(f, s, u)) : a(l, s, u);
            }
            let c = e._zod.parse(s, u);
            if (c instanceof Promise) {
              if (u.async === !1) throw new Pe();
              return c.then((l) => r(l, t, u));
            }
            return r(c, t, u);
          };
        }
      },
      {
        get "~standard"() {
          return Yn(this, "~standard", yi(this));
        },
        set "~standard"(e) {
          lt(this, "~standard", e);
        },
      },
    ),
    vf = (e, n) =>
      e.issues.length ? { issues: e.issues.map((i) => Ne(i, n, re())) } : { value: e.value };
  async function Cv(e, n) {
    let i = { async: !0 };
    return vf(await e._zod.run({ value: n, issues: [] }, i), i);
  }
  function yi(e) {
    return {
      validate: (n) => {
        let i = { async: !1 };
        try {
          let o = e._zod.run({ value: n, issues: [] }, i);
          if (!(o instanceof Promise)) return vf(o, i);
        } catch {}
        return Cv(e, n);
      },
      vendor: "zod",
      version: 1,
    };
  }
  var At = h("$ZodString", (e, n) => {
      (L.init(e, n),
        (e._zod.pattern = n.pattern ?? qa),
        (e._zod.parse = (i, o) => {
          if (n.coerce)
            try {
              i.value = String(i.value);
            } catch {}
          return (
            typeof i.value == "string" ||
              i.issues.push({ expected: "string", code: "invalid_type", input: i.value, inst: e }),
            i
          );
        }));
    }),
    K = h("$ZodStringFormat", (e, n) => {
      (ln.init(e, n), At.init(e, n));
    }),
    zs = h("$ZodGUID", (e, n) => {
      (n.pattern ?? (n.pattern = Ea), K.init(e, n));
    }),
    Ns = h("$ZodUUID", (e, n) => {
      if (n.version) {
        let o = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[n.version];
        if (o === void 0) throw new Error(`Invalid UUID version: "${n.version}"`);
        n.pattern ?? (n.pattern = Tt(o));
      } else n.pattern ?? (n.pattern = Tt());
      K.init(e, n);
    }),
    Ps = h("$ZodEmail", (e, n) => {
      (n.pattern ?? (n.pattern = Aa), K.init(e, n));
    }),
    Os = 1,
    sr = 2;
  function Ts(e) {
    try {
      return typeof URL < "u" && typeof URL.canParse == "function"
        ? URL.canParse(e)
        : (new URL(e), !0);
    } catch {
      return !1;
    }
  }
  function bi(e, n) {
    return !("normalize" in n) && !("hostname" in n) && !("protocol" in n) ? Ts(e) || sr : $f(e, n);
  }
  function $f(e, n) {
    if (!n.normalize && n.protocol?.source === rr.source && !/^https?:\/\//i.test(e)) return Os;
    try {
      if (typeof URL < "u") {
        let i = URL;
        if (typeof i.parse == "function") return i.parse(e) ?? sr;
      }
      return new URL(e);
    } catch {
      return sr;
    }
  }
  var Lv = /[\t\n\r]/g;
  function cr(e) {
    return e.replace(Lv, "");
  }
  function _i(e, n) {
    return ((n.lastIndex = 0), n.test(e.hostname));
  }
  function wi(e, n) {
    return (
      (n.lastIndex = 0), n.test(e.protocol.endsWith(":") ? e.protocol.slice(0, -1) : e.protocol)
    );
  }
  var Es = h("$ZodURL", (e, n) => {
      (K.init(e, n),
        (e._zod.check = (i) => {
          try {
            let o = i.value.trim(),
              t = bi(o, n);
            if (t === Os) {
              i.issues.push({
                code: "invalid_format",
                format: "url",
                note: "Invalid URL format",
                input: i.value,
                inst: e,
                continue: !n.abort,
              });
              return;
            }
            if (t === sr) {
              i.issues.push({
                code: "invalid_format",
                format: "url",
                input: i.value,
                inst: e,
                continue: !n.abort,
              });
              return;
            }
            if (t === !0) {
              i.value = cr(o);
              return;
            }
            (n.hostname &&
              !_i(t, n.hostname) &&
              i.issues.push({
                code: "invalid_format",
                format: "url",
                note: "Invalid hostname",
                pattern: n.hostname.source,
                input: i.value,
                inst: e,
                continue: !n.abort,
              }),
              n.protocol &&
                !wi(t, n.protocol) &&
                i.issues.push({
                  code: "invalid_format",
                  format: "url",
                  note: "Invalid protocol",
                  pattern: n.protocol.source,
                  input: i.value,
                  inst: e,
                  continue: !n.abort,
                }),
              (i.value = n.normalize ? t.href : cr(o)));
            return;
          } catch {
            i.issues.push({
              code: "invalid_format",
              format: "url",
              input: i.value,
              inst: e,
              continue: !n.abort,
            });
          }
        }));
    }),
    As = h("$ZodEmoji", (e, n) => {
      (n.pattern ?? (n.pattern = Da()), K.init(e, n));
    }),
    Ds = h("$ZodNanoID", (e, n) => {
      if (n.length !== void 0 && (!Number.isInteger(n.length) || n.length < 1))
        throw new Error(`Invalid nanoid length: ${n.length}`);
      (n.pattern ?? (n.pattern = n.length === void 0 ? Pa : Oa(n.length)), K.init(e, n));
    }),
    js = h("$ZodCUID", (e, n) => {
      (n.pattern ?? (n.pattern = ka), K.init(e, n));
    }),
    Us = h("$ZodCUID2", (e, n) => {
      (n.pattern ?? (n.pattern = Ia), K.init(e, n));
    }),
    Cs = h("$ZodULID", (e, n) => {
      (n.pattern ?? (n.pattern = Sa), K.init(e, n));
    }),
    Ls = h("$ZodXID", (e, n) => {
      (n.pattern ?? (n.pattern = za), K.init(e, n));
    }),
    Rs = h("$ZodKSUID", (e, n) => {
      (n.pattern ?? (n.pattern = Na), K.init(e, n));
    }),
    Zs = h("$ZodISODateTime", (e, n) => {
      (n.pattern ?? (n.pattern = Ka(n)), K.init(e, n));
    }),
    Vs = h("$ZodISODate", (e, n) => {
      (n.pattern ?? (n.pattern = Ja), K.init(e, n));
    }),
    Ms = h("$ZodISOTime", (e, n) => {
      (n.pattern ?? (n.pattern = Ga(n)), K.init(e, n));
    }),
    Fs = h("$ZodISODuration", (e, n) => {
      (n.pattern ?? (n.pattern = Ta), K.init(e, n));
    }),
    Bs = h("$ZodIPv4", (e, n) => {
      (n.pattern ?? (n.pattern = ja), K.init(e, n));
    }),
    Rv = /^[0-9a-fA-F:.]+$/;
  function ur(e) {
    return Rv.test(e) ? Ts(`http://[${e}]`) : !1;
  }
  var Ws = h("$ZodIPv6", (e, n) => {
      (n.pattern ?? (n.pattern = Ua),
        K.init(e, n),
        (e._zod.check = (i) => {
          ur(i.value) ||
            i.issues.push({
              code: "invalid_format",
              format: "ipv6",
              input: i.value,
              inst: e,
              continue: !n.abort,
            });
        }));
    }),
    Js = h("$ZodMAC", (e, n) => {
      (n.pattern ?? (n.pattern = Ca(n.delimiter)), K.init(e, n));
    }),
    Gs = h("$ZodCIDRv4", (e, n) => {
      (n.pattern ?? (n.pattern = La), K.init(e, n));
    });
  function xi(e) {
    let n = e.split("/");
    if (n.length !== 2) return !1;
    let [i, o] = n;
    if (!o) return !1;
    let t = Number(o);
    return `${t}` !== o || t < 0 || t > 128 ? !1 : ur(i);
  }
  var Ks = h("$ZodCIDRv6", (e, n) => {
    (n.pattern ?? (n.pattern = Ra),
      K.init(e, n),
      (e._zod.check = (i) => {
        xi(i.value) ||
          i.issues.push({
            code: "invalid_format",
            format: "cidrv6",
            input: i.value,
            inst: e,
            continue: !n.abort,
          });
      }));
  });
  function lr(e) {
    if (e === "") return !0;
    if (/\s/.test(e) || e.length % 4 !== 0) return !1;
    try {
      return (atob(e), !0);
    } catch {
      return !1;
    }
  }
  var ki = /^[0-9a-zA-Z+/]*={0,2}$/,
    qs = h("$ZodBase64", (e, n) => {
      (n.pattern ?? (n.pattern = ki),
        K.init(e, n),
        (e._zod.check = (i) => {
          lr(i.value) ||
            i.issues.push({
              code: "invalid_format",
              format: "base64",
              input: i.value,
              inst: e,
              continue: !n.abort,
            });
        }));
    }),
    dr = /^[A-Za-z0-9_-]*$/;
  function Ii(e) {
    if (!dr.test(e)) return !1;
    let n = e.replace(/[-_]/g, (o) => (o === "-" ? "+" : "/")),
      i = n.padEnd(Math.ceil(n.length / 4) * 4, "=");
    return lr(i);
  }
  var Xs = h("$ZodBase64URL", (e, n) => {
      (n.pattern ?? (n.pattern = dr),
        K.init(e, n),
        (e._zod.check = (i) => {
          Ii(i.value) ||
            i.issues.push({
              code: "invalid_format",
              format: "base64url",
              input: i.value,
              inst: e,
              continue: !n.abort,
            });
        }));
    }),
    Hs = h("$ZodE164", (e, n) => {
      (n.pattern ?? (n.pattern = Ba), K.init(e, n));
    }),
    Zv = /[- ]/g;
  function Vv(e) {
    let n = e.length,
      i = 1,
      o = 0;
    for (; n; ) {
      let t = e.charCodeAt(--n) - 48;
      ((i ^= 1), (o += i ? [0, 2, 4, 6, 8, 1, 3, 5, 7, 9][t] : t));
    }
    return o % 10 === 0;
  }
  function Si(e) {
    return ui.test(e) ? Vv(e.replace(Zv, "")) : !1;
  }
  var Ys = h("$ZodCreditCard", (e, n) => {
    (n.pattern ?? (n.pattern = ui),
      K.init(e, n),
      (e._zod.check = (i) => {
        Si(i.value) ||
          i.issues.push({
            code: "invalid_format",
            format: "credit_card",
            input: i.value,
            inst: e,
            continue: !n.abort,
          });
      }));
  });
  function Mv(e) {
    let n = 0,
      i = e.length;
    for (let o = 4; o < i; o++) {
      let t = e.charCodeAt(o);
      n = (t >= 65 ? n * 100 + (t - 55) : n * 10 + (t - 48)) % 97;
    }
    for (let o = 0; o < 4; o++) {
      let t = e.charCodeAt(o);
      n = (t >= 65 ? n * 100 + (t - 55) : n * 10 + (t - 48)) % 97;
    }
    return n === 1;
  }
  function zi(e) {
    return li.test(e) ? Mv(e) : !1;
  }
  var Qs = h("$ZodIBAN", (e, n) => {
    (n.pattern ?? (n.pattern = li),
      K.init(e, n),
      (e._zod.check = (i) => {
        zi(i.value) ||
          i.issues.push({
            code: "invalid_format",
            format: "iban",
            input: i.value,
            inst: e,
            continue: !n.abort,
          });
      }));
  });
  function Ni(e, n = null) {
    try {
      let i = e.split(".");
      if (i.length !== 3) return !1;
      let [o] = i;
      if (!o) return !1;
      let t = JSON.parse(atob(o));
      return !(("typ" in t && t?.typ !== "JWT") || !t.alg || (n && (!("alg" in t) || t.alg !== n)));
    } catch {
      return !1;
    }
  }
  var ec = h("$ZodJWT", (e, n) => {
      (K.init(e, n),
        (e._zod.check = (i) => {
          Ni(i.value, n.alg) ||
            i.issues.push({
              code: "invalid_format",
              format: "jwt",
              input: i.value,
              inst: e,
              continue: !n.abort,
            });
        }));
    }),
    tc = h("$ZodCustomStringFormat", (e, n) => {
      (K.init(e, n),
        (e._zod.check = (i) => {
          n.fn(i.value) ||
            i.issues.push({
              code: "invalid_format",
              format: n.format,
              input: i.value,
              inst: e,
              continue: !n.abort,
            });
        }));
    }),
    Pi = h("$ZodNumber", (e, n) => {
      (L.init(e, n),
        (e._zod.pattern = it),
        (e._zod.parse = (i, o) => {
          if (n.coerce)
            try {
              i.value = Number(i.value);
            } catch {}
          let t = i.value;
          if (typeof t == "number" && !Number.isNaN(t) && Number.isFinite(t)) return i;
          let r =
            typeof t == "number"
              ? Number.isNaN(t)
                ? "NaN"
                : Number.isFinite(t)
                  ? void 0
                  : String(t)
              : void 0;
          return (
            i.issues.push({
              expected: "number",
              code: "invalid_type",
              input: t,
              inst: e,
              ...(r ? { received: r } : {}),
            }),
            i
          );
        }));
    }),
    nc = h("$ZodNumberFormat", (e, n) => {
      (ss.init(e, n), Pi.init(e, n));
    }),
    fr = h("$ZodBoolean", (e, n) => {
      (L.init(e, n),
        (e._zod.pattern = Ya),
        (e._zod.parse = (i, o) => {
          if (n.coerce)
            try {
              i.value = !!i.value;
            } catch {}
          let t = i.value;
          return (
            typeof t == "boolean" ||
              i.issues.push({ expected: "boolean", code: "invalid_type", input: t, inst: e }),
            i
          );
        }));
    }),
    Oi = h("$ZodBigInt", (e, n) => {
      (L.init(e, n),
        (e._zod.pattern = Ha),
        (e._zod.parse = (i, o) => {
          if (n.coerce)
            try {
              i.value = BigInt(i.value);
            } catch {}
          return (
            typeof i.value == "bigint" ||
              i.issues.push({ expected: "bigint", code: "invalid_type", input: i.value, inst: e }),
            i
          );
        }));
    }),
    rc = h("$ZodBigIntFormat", (e, n) => {
      (cs.init(e, n), Oi.init(e, n));
    }),
    ic = h("$ZodSymbol", (e, n) => {
      (L.init(e, n),
        (e._zod.parse = (i, o) => {
          let t = i.value;
          return (
            typeof t == "symbol" ||
              i.issues.push({ expected: "symbol", code: "invalid_type", input: t, inst: e }),
            i
          );
        }));
    }),
    oc = h("$ZodUndefined", (e, n) => {
      (L.init(e, n),
        (e._zod.pattern = es),
        (e._zod.values = new Set([void 0])),
        (e._zod.parse = (i, o) => {
          let t = i.value;
          return (
            typeof t > "u" ||
              i.issues.push({ expected: "undefined", code: "invalid_type", input: t, inst: e }),
            i
          );
        }));
    }),
    ac = h("$ZodNull", (e, n) => {
      (L.init(e, n),
        (e._zod.pattern = Qa),
        (e._zod.values = new Set([null])),
        (e._zod.parse = (i, o) => {
          let t = i.value;
          return (
            t === null ||
              i.issues.push({ expected: "null", code: "invalid_type", input: t, inst: e }),
            i
          );
        }));
    }),
    sc = h("$ZodAny", (e, n) => {
      (L.init(e, n), (e._zod.parse = (i) => i));
    }),
    cc = h("$ZodUnknown", (e, n) => {
      (L.init(e, n), (e._zod.parse = (i) => i));
    }),
    uc = h("$ZodNever", (e, n) => {
      (L.init(e, n),
        (e._zod.parse = (i, o) => (
          i.issues.push({ expected: "never", code: "invalid_type", input: i.value, inst: e }),
          i
        )));
    }),
    lc = h("$ZodVoid", (e, n) => {
      (L.init(e, n),
        (e._zod.parse = (i, o) => {
          let t = i.value;
          return (
            typeof t > "u" ||
              i.issues.push({ expected: "void", code: "invalid_type", input: t, inst: e }),
            i
          );
        }));
    }),
    dc = h("$ZodDate", (e, n) => {
      (L.init(e, n),
        (e._zod.parse = (i, o) => {
          if (n.coerce)
            try {
              i.value = new Date(i.value);
            } catch {}
          let t = i.value,
            r = t instanceof Date;
          return (
            (r && !Number.isNaN(t.getTime())) ||
              i.issues.push({
                expected: "date",
                code: "invalid_type",
                input: t,
                ...(r ? { received: "Invalid Date" } : {}),
                inst: e,
              }),
            i
          );
        }));
    });
  function tf(e, n, i) {
    (e.issues.length && n.issues.push(...ze(i, e.issues)), (n.value[i] = e.value));
  }
  var fc = h("$ZodArray", (e, n) => {
    L.init(e, n);
    let i = fe.memoizer;
    (i?.attach(e),
      (e._zod.parse = (o, t) => {
        let r = o.value;
        if (!Array.isArray(r))
          return (o.issues.push({ expected: "array", code: "invalid_type", input: r, inst: e }), o);
        o.value = i ? i.alloc(e, o, Array(r.length), t) : Array(r.length);
        let a = [],
          s = t?.abortEarly;
        for (let u = 0; u < r.length; u++) {
          let c = r[u],
            l = n.element._zod.run({ value: c, issues: [] }, t);
          if (l instanceof Promise) a.push(l.then((f) => tf(f, o, u)));
          else if ((tf(l, o, u), s && l.issues.length !== 0 && xe(l))) break;
        }
        return a.length ? Promise.all(a).then(() => o) : o;
      }));
  });
  function $i(e, n, i, o, t, r) {
    let a = i in o,
      s = r === "optional";
    if (!(!a && s && t === "optional")) {
      if (e.issues.length) {
        if (t !== void 0 && s && !a) return;
        n.issues.push(...ze(i, e.issues));
      }
      if (!a && t === void 0) {
        e.issues.length ||
          n.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: void 0,
            path: [i],
          });
        return;
      }
      e.value === void 0
        ? (a || (t === "defaulted" && !s)) && (n.value[i] = void 0)
        : (n.value[i] = e.value);
    }
  }
  var Fv = [];
  function yf(e) {
    let n = Object.keys(e.shape),
      i = Object.getOwnPropertySymbols(e.shape),
      o = i.length ? i : Fv,
      t = o.length ? [...n, ...o] : n;
    for (let a of t)
      if (!e.shape?.[a]?._zod?.traits?.has("$ZodType"))
        throw new Error(`Invalid element at key "${String(a)}": expected a Zod schema`);
    let r = fa(e.shape);
    return {
      ...e,
      allKeys: t,
      symbolKeys: o,
      keySet: new Set(n),
      numKeys: n.length,
      optionalKeys: new Set(r),
    };
  }
  function bf(e, n, i, o, t, r, a) {
    let s = [],
      u = t.keySet,
      c = t.catchall._zod,
      l = c.def.type,
      f = c.optin,
      d = c.optout,
      m = 0;
    for (let g in n) {
      if (a && i.issues.length !== m) {
        if (xe(i, m)) break;
        m = i.issues.length;
      }
      if (u.has(g)) continue;
      if (g === "__proto__") {
        l === "never" && s.push(g);
        continue;
      }
      if (l === "never") {
        s.push(g);
        continue;
      }
      let $ = c.run({ value: n[g], issues: [] }, o);
      $ instanceof Promise ? e.push($.then((w) => $i(w, i, g, n, f, d))) : $i($, i, g, n, f, d);
    }
    return (
      s.length &&
        i.issues.push({ code: "unrecognized_keys", keys: s, input: n, inst: r, continue: !0 }),
      e.length ? Promise.all(e).then(() => i) : i
    );
  }
  var _f = h("$ZodObject", (e, n) => {
      L.init(e, n);
      let i = Object.getOwnPropertyDescriptor(n, "shape"),
        o = i?.get ? i.get.raw : (n.shape ?? {});
      if (o) {
        let c = () => {
          let l = { ...o };
          return (Object.defineProperty(n, "shape", { value: l }), (c.raw = l), l);
        };
        ((c.raw = o), Object.defineProperty(n, "shape", { get: c }));
      }
      let t = nn(() => yf(n));
      M(e, "propValues", (c) => {
        let l = c.def.shape,
          f = {};
        for (let d in l) {
          let m = l[d]._zod;
          if (m.values) {
            Object.prototype.hasOwnProperty.call(f, d) || he(f, d, new Set());
            for (let g of m.values) f[d].add(g);
            m.optin !== void 0 && f[d].add(void 0);
          }
        }
        return f;
      });
      let r = Nt,
        a = n.catchall,
        s,
        u = fe.memoizer;
      (u?.attach(e),
        (e._zod.parse = (c, l) => {
          s ?? (s = t.value);
          let f = c.value;
          if (!r(f))
            return (
              c.issues.push({ expected: "object", code: "invalid_type", input: f, inst: e }), c
            );
          c.value = u ? u.alloc(e, c, {}, l) : {};
          let d = [],
            m = s.shape,
            g = l?.abortEarly,
            $ = c.issues.length;
          for (let w of s.allKeys) {
            if (g && c.issues.length !== $) {
              if (xe(c, $)) break;
              $ = c.issues.length;
            }
            if (w === "__proto__") continue;
            let z = m[w],
              x = z._zod.optin,
              O = z._zod.optout,
              I = z._zod.run({ value: f[w], issues: [] }, l);
            I instanceof Promise
              ? d.push(I.then((E) => $i(E, c, w, f, x, O)))
              : $i(I, c, w, f, x, O);
          }
          return a
            ? bf(d, f, c, l, t.value, e, g === !0)
            : d.length
              ? Promise.all(d).then(() => c)
              : c;
        }));
    }),
    mc = h("$ZodObjectJIT", (e, n) => {
      _f.init(e, n);
      let i = e._zod.parse,
        o = nn(() => yf(n)),
        t = fe.memoizer,
        r = (m) => {
          let g = o.value,
            $ = g.symbolKeys,
            w = new Et(["payload", "ctx"], { shape: m, inst: e, memo: t, syms: $ }),
            z = (E) => `shape[${E}]._zod.run({ value: input[${E}], issues: [] }, ctx)`,
            x = (E, D) => `
          let ${E}_ab = false;
          for (let i = 0; i < ${E}.issues.length; i++) {
            const iss = ${E}.issues[i];
            iss.path = iss.path ? [${D}, ...iss.path] : [${D}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${E}_ab = true;
          }
          if (${E}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
          w.write("const input = payload.value;");
          let O = Object.create(null),
            I = 0;
          for (let E of g.allKeys) O[E] = `key_${I++}`;
          w.write(
            t ? "const newResult = memo.alloc(inst, payload, {}, ctx);" : "const newResult = {};",
          );
          for (let E of g.allKeys) {
            if (E === "__proto__") continue;
            let D = O[E],
              R = typeof E == "symbol" ? `syms[${$.indexOf(E)}]` : we(E),
              be = `${R} in input`,
              pe = m[E],
              ce = pe?._zod?.optin,
              ie = ce !== void 0,
              de = pe?._zod?.optout === "optional";
            if ((w.write(`const ${D} = ${z(R)};`), ie && de)) {
              let It =
                ce === "optional" ? `${D}_present` : `${D}.value !== undefined || ${D}_present`;
              w.write(`
        const ${D}_present = ${be};
        if (!${D}.issues.length || ${D}_present) {
          if (${D}.issues.length) {${x(D, R)}
          }

          if (${It}) {
            newResult[${R}] = ${D}.value;
          }
        }

      `);
            } else
              ie
                ? (w.write(`
        if (${D}.issues.length) {${x(D, R)}
        }
      `),
                  ce === "defaulted"
                    ? w.write(`newResult[${R}] = ${D}.value;`)
                    : w.write(`
        if (${D}.value !== undefined || ${be}) {
          newResult[${R}] = ${D}.value;
        }
      `))
                : w.write(`
        const ${D}_present = ${be};
        if (${D}.issues.length) {${x(D, R)}
        }
        if (!${D}_present && !${D}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${R}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${D}_present) {
          newResult[${R}] = ${D}.value;
        }

      `);
          }
          return (w.write("payload.value = newResult;"), w.write("return payload;"), w.compile());
        },
        a,
        s = Nt,
        u = !fe.jitless,
        l = u && la.value,
        f = n.catchall,
        d;
      e._zod.parse = (m, g) => {
        d ?? (d = o.value);
        let $ = m.value;
        return s($)
          ? u && l && g?.async === !1 && g.jitless !== !0
            ? (a || (a = r(n.shape)),
              (m = a(m, g)),
              f ? bf([], $, m, g, d, e, g?.abortEarly === !0) : m)
            : i(m, g)
          : (m.issues.push({ expected: "object", code: "invalid_type", input: $, inst: e }), m);
      };
    });
  function nf(e, n, i, o) {
    for (let r of e) if (r.issues.length === 0) return ((n.value = r.value), n);
    let t = e.filter((r) => !xe(r));
    return t.length === 1
      ? ((n.value = t[0].value), t[0])
      : (n.issues.push({
          code: "invalid_union",
          input: n.value,
          inst: i,
          errors: e.map((r) => r.issues.map((a) => Ne(a, o, re()))),
        }),
        n);
  }
  var mr = h("$ZodUnion", (e, n) => {
    (L.init(e, n),
      M(e, "optin", (o) =>
        o.def.options.some((t) => t._zod.optin === "defaulted")
          ? "defaulted"
          : o.def.options.some((t) => t._zod.optin !== void 0)
            ? "optional"
            : void 0,
      ),
      M(e, "optout", (o) =>
        o.def.options.some((t) => t._zod.optout === "optional") ? "optional" : void 0,
      ),
      M(e, "values", (o) => {
        if (o.def.options.every((t) => t._zod.values))
          return new Set(o.def.options.flatMap((t) => Array.from(t._zod.values)));
      }),
      M(e, "pattern", (o) => {
        if (o.def.options.every((t) => t._zod.pattern)) {
          let t = o.def.options.map((r) => r._zod.pattern);
          return new RegExp(`^(${t.map((r) => rt(r.source)).join("|")})$`);
        }
      }));
    let i = n.options.length === 1 ? n.options[0]._zod.run : null;
    e._zod.parse = (o, t) => {
      if (i) return i(o, t);
      let r = !1,
        a = [];
      for (let s of n.options) {
        let u = s._zod.run({ value: o.value, issues: [] }, t);
        if (u instanceof Promise) (a.push(u), (r = !0));
        else {
          if (u.issues.length === 0) return u;
          a.push(u);
        }
      }
      return r ? Promise.all(a).then((s) => nf(s, o, e, t)) : nf(a, o, e, t);
    };
  });
  function rf(e, n, i, o) {
    let t = [];
    for (let r = 0; r < e.length; r++) e[r].issues.length === 0 && t.push(r);
    return t.length === 1
      ? ((n.value = e[t[0]].value), n)
      : (t.length === 0
          ? n.issues.push({
              code: "invalid_union",
              input: n.value,
              inst: i,
              errors: e.map((r) => r.issues.map((a) => Ne(a, o, re()))),
            })
          : n.issues.push({
              code: "invalid_union",
              input: n.value,
              inst: i,
              errors: [],
              inclusive: !1,
              matches: t,
            }),
        n);
  }
  var pc = h("$ZodXor", (e, n) => {
    (mr.init(e, n), (n.inclusive = !1));
    let i = n.options.length === 1 ? n.options[0]._zod.run : null;
    e._zod.parse = (o, t) => {
      if (i) return i(o, t);
      let r = !1,
        a = [];
      for (let s of n.options) {
        let u = s._zod.run({ value: o.value, issues: [] }, t);
        u instanceof Promise ? (a.push(u), (r = !0)) : a.push(u);
      }
      return r ? Promise.all(a).then((s) => rf(s, o, e, t)) : rf(a, o, e, t);
    };
  });
  function gc(e, n) {
    let i = e._zod,
      o = i.bag.optionsMap;
    o || ((o = wf(i.def)), (i.bag.optionsMap = o));
    let t = o.get(n);
    if (t === null) throw new Error(`Ambiguous discriminator value "${String(n)}"`);
    return t;
  }
  function wf(e) {
    let n = new Map();
    for (let i of e.options) {
      let o = i._zod.propValues?.[e.discriminator];
      if (!o || o.size === 0)
        throw new Error(`Invalid discriminated union option at index "${e.options.indexOf(i)}"`);
      for (let t of o)
        if (n.has(t)) {
          if (t !== void 0) throw new Error(`Duplicate discriminator value "${String(t)}"`);
          n.set(t, null);
        } else n.set(t, i);
    }
    return n;
  }
  var hc = h("$ZodDiscriminatedUnion", (e, n) => {
      ((n.inclusive = !1), mr.init(e, n));
      let i = e._zod.parse;
      (M(e, "propValues", (t) => {
        let r = {},
          a = 0;
        for (let s of t.def.options) {
          let u = s._zod.propValues;
          if (!u || Object.keys(u).length === 0)
            throw new Error(
              `Invalid discriminated union option at index "${t.def.options.indexOf(s)}"`,
            );
          u[t.def.discriminator]?.has(void 0) && a++;
          for (let [c, l] of Object.entries(u)) {
            Object.prototype.hasOwnProperty.call(r, c) || he(r, c, new Set());
            for (let f of l) r[c].add(f);
          }
        }
        return (!t.def.unionFallback && a > 1 && r[t.def.discriminator]?.delete(void 0), r);
      }),
        n.options.forEach((t, r) => {
          let a = rn(t._zod.def);
          if (a && !Object.prototype.hasOwnProperty.call(a, n.discriminator))
            throw new Error(`Invalid discriminated union option at index "${r}"`);
        }));
      let o = nn(() => wf(n));
      e._zod.parse = (t, r) => {
        let a = t.value;
        if (!Nt(a))
          return (
            t.issues.push({ code: "invalid_type", expected: "object", input: a, inst: e }), t
          );
        let s = a?.[n.discriminator],
          u = o.value.get(s);
        return u && (s !== void 0 || r.direction !== "backward")
          ? u._zod.run(t, r)
          : n.unionFallback || r.direction === "backward"
            ? i(t, r)
            : (t.issues.push({
                code: "invalid_union",
                errors: [],
                note: "No matching discriminator",
                discriminator: n.discriminator,
                options: Array.from(o.value.keys()).filter((c) => o.value.get(c) !== null),
                input: a,
                path: [n.discriminator],
                inst: e,
              }),
              t);
      };
    }),
    vc = h("$ZodIntersection", (e, n) => {
      (L.init(e, n),
        (e._zod.parse = (i, o) => {
          let t = i.value,
            r = n.left._zod.run({ value: t, issues: [] }, o),
            a = n.right._zod.run({ value: t, issues: [] }, o);
          return r instanceof Promise || a instanceof Promise
            ? Promise.all([r, a]).then(([u, c]) => of(i, u, c))
            : of(i, r, a);
        }));
    });
  function dn(e, n) {
    if (e === n) return { valid: !0, data: e };
    if (e instanceof Date && n instanceof Date && +e == +n) return { valid: !0, data: e };
    if (Le(e) && Le(n)) {
      let i = Object.keys(n),
        o = Object.keys(e).filter((r) => i.indexOf(r) !== -1),
        t = { ...e, ...n };
      Object.prototype.hasOwnProperty.call(t, "__proto__") && delete t.__proto__;
      for (let r of o) {
        if (r === "__proto__") continue;
        let a = dn(e[r], n[r]);
        if (!a.valid) return { valid: !1, mergeErrorPath: [r, ...a.mergeErrorPath] };
        t[r] = a.data;
      }
      return { valid: !0, data: t };
    }
    if (Array.isArray(e) && Array.isArray(n)) {
      if (e.length !== n.length) return { valid: !1, mergeErrorPath: [] };
      let i = [];
      for (let o = 0; o < e.length; o++) {
        let t = e[o],
          r = n[o],
          a = dn(t, r);
        if (!a.valid) return { valid: !1, mergeErrorPath: [o, ...a.mergeErrorPath] };
        i.push(a.data);
      }
      return { valid: !0, data: i };
    }
    return { valid: !1, mergeErrorPath: [] };
  }
  function of(e, n, i) {
    let o = new Map(),
      t,
      r = new Map(),
      a = (c, l) => {
        let f;
        if (c.code === "unrecognized_keys" && !c.path?.length) (t ?? (t = c), (f = c.keys));
        else if (c.code === "invalid_key" && c.origin === "record" && c.path?.length === 1) {
          let d = String(c.path[0]);
          (r.has(d) || r.set(d, c), (f = [d]));
        } else return !1;
        for (let d of f) (o.has(d) || o.set(d, {}), (o.get(d)[l] = !0));
        return !0;
      };
    for (let c of n.issues) a(c, "l") || e.issues.push(c);
    for (let c of i.issues) a(c, "r") || e.issues.push(c);
    let s = [...o].filter(([, c]) => c.l && c.r).map(([c]) => c);
    if (s.length) {
      let c = t ? s.filter((l) => t.keys.includes(l)) : [];
      c.length && e.issues.push({ ...t, keys: c });
      for (let l of s) !c.includes(l) && r.has(l) && e.issues.push(r.get(l));
    }
    let u = dn(n.value, i.value);
    if (!u.valid) {
      if (xe(e)) return e;
      throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(u.mergeErrorPath)}`);
    }
    return ((e.value = u.data), e);
  }
  var Ti = h("$ZodTuple", (e, n) => {
    L.init(e, n);
    let i = n.items,
      o = fe.memoizer;
    (o?.attach(e),
      (e._zod.parse = (t, r) => {
        let a = t.value;
        if (!Array.isArray(a))
          return (t.issues.push({ input: a, inst: e, expected: "tuple", code: "invalid_type" }), t);
        t.value = o ? o.alloc(e, t, [], r) : [];
        let s = [],
          u = af(i, "optin"),
          c = af(i, "optout");
        if (!n.rest) {
          if (a.length < u)
            return (
              t.issues.push({
                code: "too_small",
                minimum: u,
                inclusive: !0,
                input: a,
                inst: e,
                origin: "array",
              }),
              t
            );
          a.length > i.length &&
            t.issues.push({
              code: "too_big",
              maximum: i.length,
              inclusive: !0,
              input: a,
              inst: e,
              origin: "array",
            });
        }
        let l = new Array(i.length),
          f = n.rest ? r?.abortEarly : void 0,
          d = !1;
        for (let m = 0; m < i.length; m++) {
          let g = i[m]._zod.run({ value: a[m], issues: [] }, r);
          g instanceof Promise
            ? s.push(
                g.then(($) => {
                  l[m] = $;
                }),
              )
            : ((l[m] = g), f && !d && g.issues.length && (d = xe(g)));
        }
        if (n.rest && !d) {
          let m = i.length - 1,
            g = a.slice(i.length),
            $ = t.issues.length;
          for (let w of g) {
            if (f && t.issues.length !== $) {
              if (xe(t, $)) break;
              $ = t.issues.length;
            }
            m++;
            let z = n.rest._zod.run({ value: w, issues: [] }, r);
            z instanceof Promise ? s.push(z.then((x) => sf(x, t, m))) : sf(z, t, m);
          }
        }
        return s.length ? Promise.all(s).then(() => cf(l, t, i, a, c)) : cf(l, t, i, a, c);
      }));
  });
  function af(e, n) {
    for (let i = e.length - 1; i >= 0; i--)
      if (!(n === "optin" ? e[i]._zod.optin !== void 0 : e[i]._zod.optout === "optional"))
        return i + 1;
    return 0;
  }
  function sf(e, n, i) {
    (e.issues.length && n.issues.push(...ze(i, e.issues)), (n.value[i] = e.value));
  }
  function cf(e, n, i, o, t) {
    for (let r = 0; r < i.length; r++) {
      let a = e[r],
        s = r < o.length;
      if (!s && r >= t && i[r]._zod.optin === "optional") {
        n.value.length = r;
        break;
      }
      if (a.issues.length) {
        if (!s && r >= t) {
          n.value.length = r;
          break;
        }
        n.issues.push(...ze(r, a.issues));
      }
      n.value[r] = a.value;
    }
    for (
      let r = n.value.length - 1;
      r >= o.length && i[r]._zod.optout === "optional" && n.value[r] === void 0;
      r--
    )
      n.value.length = r;
    return n;
  }
  var $c = h("$ZodRecord", (e, n) => {
      L.init(e, n);
      let i = fe.memoizer;
      (i?.attach(e),
        (e._zod.parse = (o, t) => {
          let r = o.value;
          if (!Le(r))
            return (
              o.issues.push({ expected: "record", code: "invalid_type", input: r, inst: e }), o
            );
          let a = [],
            s = n.keyType._zod.values;
          if (s && !n.partial) {
            o.value = i ? i.alloc(e, o, {}, t) : {};
            let u = new Set();
            for (let l of s)
              if (typeof l == "string" || typeof l == "number" || typeof l == "symbol") {
                if ((u.add(typeof l == "number" ? l.toString() : l), l === "__proto__")) continue;
                let f = n.keyType._zod.run({ value: l, issues: [] }, t);
                if (f instanceof Promise)
                  throw new Error("Async schemas not supported in object keys currently");
                if (f.issues.length) {
                  o.issues.push({
                    code: "invalid_key",
                    origin: "record",
                    issues: f.issues.map((g) => Ne(g, t, re())),
                    input: l,
                    path: [l],
                    inst: e,
                  });
                  continue;
                }
                let d = f.value;
                if (d === "__proto__") continue;
                let m = n.valueType._zod.run({ value: r[l], issues: [] }, t);
                m instanceof Promise
                  ? a.push(
                      m.then((g) => {
                        (g.issues.length && o.issues.push(...ze(l, g.issues)),
                          (o.value[d] = g.value));
                      }),
                    )
                  : (m.issues.length && o.issues.push(...ze(l, m.issues)), (o.value[d] = m.value));
              }
            let c;
            for (let l in r)
              if (!u.has(l))
                if (n.mode === "loose") {
                  if (l === "__proto__") continue;
                  o.value[l] = r[l];
                } else ((c = c ?? []), c.push(l));
            c &&
              c.length > 0 &&
              o.issues.push({
                code: "unrecognized_keys",
                input: r,
                inst: e,
                keys: c,
                continue: !0,
              });
          } else {
            o.value = i ? i.alloc(e, o, {}, t) : {};
            let u;
            for (let c of Reflect.ownKeys(r)) {
              if (c === "__proto__" || !Object.prototype.propertyIsEnumerable.call(r, c)) continue;
              let l = n.keyType._zod.run({ value: c, issues: [] }, t);
              if (l instanceof Promise)
                throw new Error("Async schemas not supported in object keys currently");
              if (typeof c == "string" && it.test(c) && l.issues.length) {
                let g = n.keyType._zod.run({ value: Number(c), issues: [] }, t);
                if (g instanceof Promise)
                  throw new Error("Async schemas not supported in object keys currently");
                g.issues.length === 0 && (l = g);
              }
              if (l.issues.length) {
                n.mode === "loose"
                  ? (o.value[c] = r[c])
                  : s
                    ? ((u = u ?? []), u.push(c))
                    : o.issues.push({
                        code: "invalid_key",
                        origin: "record",
                        issues: l.issues.map((g) => Ne(g, t, re())),
                        input: c,
                        path: [c],
                        inst: e,
                      });
                continue;
              }
              let d = l.value;
              if (d === "__proto__") continue;
              let m = n.valueType._zod.run({ value: r[c], issues: [] }, t);
              m instanceof Promise
                ? a.push(
                    m.then((g) => {
                      (g.issues.length && o.issues.push(...ze(c, g.issues)),
                        (o.value[d] = g.value));
                    }),
                  )
                : (m.issues.length && o.issues.push(...ze(c, m.issues)), (o.value[d] = m.value));
            }
            u &&
              u.length > 0 &&
              o.issues.push({
                code: "unrecognized_keys",
                input: r,
                inst: e,
                keys: u,
                continue: !0,
              });
          }
          return a.length ? Promise.all(a).then(() => o) : o;
        }));
    }),
    yc = h("$ZodMap", (e, n) => {
      L.init(e, n);
      let i = fe.memoizer;
      (i?.attach(e),
        (e._zod.parse = (o, t) => {
          let r = o.value;
          if (!(r instanceof Map))
            return (o.issues.push({ expected: "map", code: "invalid_type", input: r, inst: e }), o);
          let a = [];
          o.value = i ? i.alloc(e, o, new Map(), t) : new Map();
          let s = t?.abortEarly,
            u = o.issues.length;
          for (let [c, l] of r) {
            if (s && o.issues.length !== u) {
              if (xe(o, u)) break;
              u = o.issues.length;
            }
            let f = n.keyType._zod.run({ value: c, issues: [] }, t),
              d = n.valueType._zod.run({ value: l, issues: [] }, t);
            f instanceof Promise || d instanceof Promise
              ? a.push(
                  Promise.all([f, d]).then(([m, g]) => {
                    uf(m, g, o, c, r, e, t);
                  }),
                )
              : uf(f, d, o, c, r, e, t);
          }
          return a.length ? Promise.all(a).then(() => o) : o;
        }));
    });
  function uf(e, n, i, o, t, r, a) {
    (e.issues.length &&
      (Gn.has(typeof o)
        ? i.issues.push(...ze(o, e.issues))
        : i.issues.push({
            code: "invalid_key",
            origin: "map",
            input: t,
            inst: r,
            issues: e.issues.map((s) => Ne(s, a, re())),
          })),
      n.issues.length &&
        (Gn.has(typeof o)
          ? i.issues.push(...ze(o, n.issues))
          : i.issues.push({
              origin: "map",
              code: "invalid_element",
              input: t,
              inst: r,
              key: o,
              issues: n.issues.map((s) => Ne(s, a, re())),
            })),
      i.value.set(e.value, n.value));
  }
  var bc = h("$ZodSet", (e, n) => {
    L.init(e, n);
    let i = fe.memoizer;
    (i?.attach(e),
      (e._zod.parse = (o, t) => {
        let r = o.value;
        if (!(r instanceof Set))
          return (o.issues.push({ input: r, inst: e, expected: "set", code: "invalid_type" }), o);
        let a = [];
        o.value = i ? i.alloc(e, o, new Set(), t) : new Set();
        let s = t?.abortEarly,
          u = o.issues.length;
        for (let c of r) {
          if (s && o.issues.length !== u) {
            if (xe(o, u)) break;
            u = o.issues.length;
          }
          let l = n.valueType._zod.run({ value: c, issues: [] }, t);
          l instanceof Promise ? a.push(l.then((f) => lf(f, o))) : lf(l, o);
        }
        return a.length ? Promise.all(a).then(() => o) : o;
      }));
  });
  function lf(e, n) {
    (e.issues.length && n.issues.push(...e.issues), n.value.add(e.value));
  }
  var _c = h("$ZodEnum", (e, n) => {
      L.init(e, n);
      let i = en(n.entries),
        o = new Set(i);
      ((e._zod.values = o),
        M(e, "pattern", (t) => {
          let r = en(t.def.entries).filter((a) => Gn.has(typeof a));
          return new RegExp(
            r.length ? `^(${r.map((a) => Re(a.toString())).join("|")})$` : "^[^\\s\\S]$",
          );
        }),
        (e._zod.parse = (t, r) => {
          let a = t.value;
          return (
            o.has(a) || t.issues.push({ code: "invalid_value", values: i, input: a, inst: e }), t
          );
        }));
    }),
    wc = h("$ZodLiteral", (e, n) => {
      L.init(e, n);
      let i = new Set(n.values);
      ((e._zod.values = i),
        M(e, "pattern", (o) => {
          let t = o.def.values;
          return new RegExp(
            t.length
              ? `^(${t.map((r) => (typeof r == "string" ? Re(r) : r ? Re(r.toString()) : String(r))).join("|")})$`
              : "^[^\\s\\S]$",
          );
        }),
        (e._zod.parse = (o, t) => {
          let r = o.value;
          return (
            i.has(r) ||
              o.issues.push({ code: "invalid_value", values: n.values, input: r, inst: e }),
            o
          );
        }));
    }),
    xc = h("$ZodFile", (e, n) => {
      (L.init(e, n),
        (e._zod.parse = (i, o) => {
          let t = i.value;
          return (
            t instanceof File ||
              i.issues.push({ expected: "file", code: "invalid_type", input: t, inst: e }),
            i
          );
        }));
    }),
    kc = h("$ZodTransform", (e, n) => {
      (L.init(e, n),
        (e._zod.optin = "optional"),
        fe.memoizer?.guard(e),
        (e._zod.parse = (i, o) => {
          if (o.direction === "backward") throw new dt(e.constructor.name);
          let t = n.transform(i.value, i);
          if (o.async)
            return (t instanceof Promise ? t : Promise.resolve(t)).then((a) => ((i.value = a), i));
          if (t instanceof Promise) throw new Pe();
          return ((i.value = t), i);
        }));
    });
  function df(e, n) {
    return ((e.value = n.issues.length ? void 0 : n.value), e);
  }
  var Ei = h("$ZodOptional", (e, n) => {
      (L.init(e, n),
        M(e, "optin", (i) =>
          i.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional",
        ),
        (e._zod.optout = "optional"),
        M(e, "values", (i) => {
          let o = i.def.innerType._zod.values;
          return o ? new Set([...o, void 0]) : void 0;
        }),
        M(e, "pattern", (i) => {
          let o = i.def.innerType._zod.pattern;
          return o ? new RegExp(`^(${rt(o.source)})?$`) : void 0;
        }),
        (e._zod.parse = (i, o) => {
          if (i.value === void 0) {
            if (n.innerType._zod.optin !== "defaulted") return i;
            let t = n.innerType._zod.run({ value: i.value, issues: [] }, o);
            return t instanceof Promise ? t.then((r) => df(i, r)) : df(i, t);
          }
          return n.innerType._zod.run(i, o);
        }));
    }),
    Ic = h("$ZodExactOptional", (e, n) => {
      (Ei.init(e, n),
        M(e, "values", (i) => i.def.innerType._zod.values),
        M(e, "pattern", (i) => i.def.innerType._zod.pattern),
        (e._zod.parse = (i, o) => n.innerType._zod.run(i, o)));
    }),
    Sc = h("$ZodNullable", (e, n) => {
      (L.init(e, n),
        M(e, "optin", (i) => i.def.innerType._zod.optin),
        M(e, "optout", (i) => i.def.innerType._zod.optout),
        M(e, "pattern", (i) => {
          let o = i.def.innerType._zod.pattern;
          return o ? new RegExp(`^(${rt(o.source)}|null)$`) : void 0;
        }),
        M(e, "values", (i) =>
          i.def.innerType._zod.values ? new Set([...i.def.innerType._zod.values, null]) : void 0,
        ),
        (e._zod.parse = (i, o) => (i.value === null ? i : n.innerType._zod.run(i, o))));
    }),
    zc = h("$ZodDefault", (e, n) => {
      (L.init(e, n),
        (e._zod.optin = "defaulted"),
        M(e, "values", (i) => i.def.innerType._zod.values),
        (e._zod.parse = (i, o) => {
          if (o.direction === "backward") return n.innerType._zod.run(i, o);
          if (i.value === void 0) return ((i.value = n.defaultValue), i);
          let t = n.innerType._zod.run(i, o);
          return t instanceof Promise ? t.then((r) => ff(r, n)) : ff(t, n);
        }));
    });
  function ff(e, n) {
    return (e.value === void 0 && (e.value = n.defaultValue), e);
  }
  var Nc = h("$ZodPrefault", (e, n) => {
      (L.init(e, n),
        (e._zod.optin = "defaulted"),
        M(e, "values", (i) => i.def.innerType._zod.values),
        (e._zod.parse = (i, o) => (
          o.direction === "backward" || (i.value === void 0 && (i.value = n.defaultValue)),
          n.innerType._zod.run(i, o)
        )));
    }),
    Pc = h("$ZodNonOptional", (e, n) => {
      (L.init(e, n),
        M(e, "values", (i) => {
          let o = i.def.innerType._zod.values;
          return o ? new Set([...o].filter((t) => t !== void 0)) : void 0;
        }),
        (e._zod.parse = (i, o) => {
          let t = n.innerType._zod.run(i, o);
          return t instanceof Promise ? t.then((r) => mf(r, e)) : mf(t, e);
        }));
    });
  function mf(e, n) {
    return (
      !e.issues.length &&
        e.value === void 0 &&
        e.issues.push({ code: "invalid_type", expected: "nonoptional", input: e.value, inst: n }),
      e
    );
  }
  var Oc = h("$ZodSuccess", (e, n) => {
    (L.init(e, n),
      (e._zod.parse = (i, o) => {
        if (o.direction === "backward") throw new dt("ZodSuccess");
        let t = n.innerType._zod.run(i, o);
        return t instanceof Promise
          ? t.then((r) => ((i.value = r.issues.length === 0), i))
          : ((i.value = t.issues.length === 0), i);
      }));
  });
  function pf(e, n, i, o) {
    return n.issues.length
      ? ((e.value = i.catchValue({
          ...n,
          value: e.value,
          error: { issues: n.issues.map((t) => Ne(t, o, re())) },
          input: e.value,
        })),
        e)
      : ((e.value = n.value), n.memo && (e.memo = !0), e);
  }
  var Tc = h("$ZodCatch", (e, n) => {
      (L.init(e, n),
        M(e, "optin", (i) =>
          i.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional",
        ),
        M(e, "optout", (i) => i.def.innerType._zod.optout),
        M(e, "values", (i) => i.def.innerType._zod.values),
        (e._zod.parse = (i, o) => {
          if (o.direction === "backward") return n.innerType._zod.run(i, o);
          let t = n.innerType._zod.run({ value: i.value, issues: [] }, o);
          return t instanceof Promise ? t.then((r) => pf(i, r, n, o)) : pf(i, t, n, o);
        }));
    }),
    Ec = h("$ZodNaN", (e, n) => {
      (L.init(e, n),
        (e._zod.parse = (i, o) => (
          (typeof i.value != "number" || !Number.isNaN(i.value)) &&
            i.issues.push({ input: i.value, inst: e, expected: "nan", code: "invalid_type" }),
          i
        )));
    }),
    Ai = h("$ZodPipe", (e, n) => {
      (L.init(e, n),
        M(e, "values", (i) => i.def.in._zod.values),
        M(e, "optin", (i) => i.def.in._zod.optin),
        M(e, "optout", (i) => i.def.out._zod.optout),
        M(e, "propValues", (i) => i.def.in._zod.propValues),
        (e._zod.parse = (i, o) => {
          if (o.direction === "backward") {
            let r = n.out._zod.run(i, o);
            return r instanceof Promise ? r.then((a) => gi(a, n.in, o)) : gi(r, n.in, o);
          }
          let t = n.in._zod.run(i, o);
          return t instanceof Promise ? t.then((r) => gi(r, n.out, o)) : gi(t, n.out, o);
        }));
    });
  function gi(e, n, i) {
    return e.issues.some((o) => o.code !== "unrecognized_keys")
      ? ((e.aborted = !0), e)
      : n._zod.run({ value: e.value, issues: e.issues }, i);
  }
  var pr = h("$ZodCodec", (e, n) => {
    (L.init(e, n),
      M(e, "values", (i) => i.def.in._zod.values),
      M(e, "optin", (i) => i.def.in._zod.optin),
      M(e, "optout", (i) => i.def.out._zod.optout),
      M(e, "propValues", (i) => i.def.in._zod.propValues),
      (e._zod.parse = (i, o) => {
        if ((o.direction || "forward") === "forward") {
          let r = n.in._zod.run(i, o);
          return r instanceof Promise ? r.then((a) => hi(a, n, o)) : hi(r, n, o);
        } else {
          let r = n.out._zod.run(i, o);
          return r instanceof Promise ? r.then((a) => hi(a, n, o)) : hi(r, n, o);
        }
      }));
  });
  function hi(e, n, i) {
    if (e.issues.length) return ((e.aborted = !0), e);
    if ((i.direction || "forward") === "forward") {
      let t = n.transform(e.value, e);
      return t instanceof Promise ? t.then((r) => vi(e, r, n.out, i)) : vi(e, t, n.out, i);
    } else {
      let t = n.reverseTransform(e.value, e);
      return t instanceof Promise ? t.then((r) => vi(e, r, n.in, i)) : vi(e, t, n.in, i);
    }
  }
  function vi(e, n, i, o) {
    return e.issues.length ? ((e.aborted = !0), e) : i._zod.run({ value: n, issues: e.issues }, o);
  }
  var Ac = h("$ZodPreprocess", (e, n) => {
      Ai.init(e, n);
    }),
    Dc = h("$ZodReadonly", (e, n) => {
      (L.init(e, n),
        M(e, "propValues", (i) => i.def.innerType._zod.propValues),
        M(e, "values", (i) => i.def.innerType._zod.values),
        M(e, "optin", (i) => i.def.innerType?._zod?.optin),
        M(e, "optout", (i) => i.def.innerType?._zod?.optout),
        (e._zod.parse = (i, o) => {
          if (o.direction === "backward") return n.innerType._zod.run(i, o);
          let t = n.innerType._zod.run(i, o);
          return t instanceof Promise ? t.then(gf) : gf(t);
        }));
    });
  function gf(e) {
    return (e.memo || (e.value = Object.freeze(e.value)), e);
  }
  function Bv(e) {
    let n = e._zod.def,
      i = n.pattern,
      o = !!n.format?.includes("int"),
      t,
      r;
    for (let s of n.checks ?? []) {
      let u = s._zod.def;
      (u.pattern && (i = u.pattern), o || (o = !!u.format?.includes("int")));
      let c = u.minimum ?? u.length,
        l = u.maximum ?? u.length;
      (c !== void 0 && (t === void 0 || c > t) && (t = c),
        l !== void 0 && (r === void 0 || l < r) && (r = l));
    }
    if (i) return i.source;
    if (t !== void 0 && r !== void 0 && t > r) return "(?!)";
    if (t !== void 0 || r !== void 0) return Xa({ minimum: t, maximum: r }).source;
    let a = e._zod.pattern;
    return (o && a === it ? ir : a)?.source;
  }
  function Ss(e) {
    let n = e._zod.def,
      i = e._zod.pattern?.source,
      o = n.innerType ?? e._zod.innerType;
    if (o) {
      let t = o._zod.pattern?.source,
        r = Ss(o);
      return i && t && r && r !== t ? i.replace(rt(t), () => rt(r)) : i;
    }
    if (n.options) {
      let t = n.options.map(Ss);
      if (t.every(Boolean)) return `^(${t.map((r) => rt(r)).join("|")})$`;
    }
    return Bv(e);
  }
  var jc = h("$ZodTemplateLiteral", (e, n) => {
      L.init(e, n);
      let i = [];
      for (let o of n.parts)
        if (typeof o == "object" && o !== null) {
          let t = Ss(o);
          if (!t)
            throw new Error(
              `Invalid template literal part, no pattern found: ${[...o._zod.traits].shift()}`,
            );
          i.push(rt(t));
        } else if (o === null || da.has(typeof o)) i.push(Re(`${o}`));
        else throw new Error(`Invalid template literal part: ${o}`);
      ((e._zod.pattern = new RegExp(`^${i.join("")}$`)),
        (e._zod.parse = (o, t) =>
          typeof o.value != "string"
            ? (o.issues.push({ input: o.value, inst: e, expected: "string", code: "invalid_type" }),
              o)
            : ((e._zod.pattern.lastIndex = 0),
              e._zod.pattern.test(o.value) ||
                o.issues.push({
                  input: o.value,
                  inst: e,
                  code: "invalid_format",
                  format: n.format ?? "template_literal",
                  pattern: e._zod.pattern.source,
                }),
              o)));
    }),
    Uc = h(
      "$ZodFunction",
      (e, n) => (
        L.init(e, n),
        Object.defineProperty(e, "_def", { value: n }),
        (e._zod.def = n),
        (e.implement = (i) => {
          if (typeof i != "function") throw new Error("implement() must be called with a function");
          return Object.defineProperty(
            function (...o) {
              let t = e._def.input ? Qr(e._def.input, o) : o,
                r = Reflect.apply(i, this, t);
              return e._def.output ? Qr(e._def.output, r) : r;
            },
            "_zod",
            { value: e._zod, enumerable: !1 },
          );
        }),
        (e.implementAsync = (i) => {
          if (typeof i != "function")
            throw new Error("implementAsync() must be called with a function");
          return Object.defineProperty(
            async function (...o) {
              let t = e._def.input ? await ei(e._def.input, o) : o,
                r = await Reflect.apply(i, this, t);
              return e._def.output ? await ei(e._def.output, r) : r;
            },
            "_zod",
            { value: e._zod, enumerable: !1 },
          );
        }),
        (e._zod.parse = (i, o) =>
          typeof i.value != "function"
            ? (i.issues.push({
                code: "invalid_type",
                expected: "function",
                input: i.value,
                inst: e,
              }),
              i)
            : (e._def.output && e._def.output._zod.def.type === "promise"
                ? (i.value = e.implementAsync(i.value))
                : (i.value = e.implement(i.value)),
              i)),
        (e.input = (...i) => {
          let o = e.constructor;
          return Array.isArray(i[0])
            ? new o({
                type: "function",
                input: new Ti({ type: "tuple", items: i[0], rest: i[1] }),
                output: e._def.output,
              })
            : new o({ type: "function", input: i[0], output: e._def.output });
        }),
        (e.output = (i) => {
          let o = e.constructor;
          return new o({ type: "function", input: e._def.input, output: i });
        }),
        e
      ),
    ),
    Cc = h("$ZodPromise", (e, n) => {
      (L.init(e, n),
        (e._zod.parse = (i, o) =>
          Promise.resolve(i.value).then((t) => n.innerType._zod.run({ value: t, issues: [] }, o))));
    }),
    gr = h("$ZodLazy", (e, n) => {
      (L.init(e, n),
        ca(e._zod, "innerType", () => {
          let i = n;
          return (i._cachedInner || (i._cachedInner = n.getter()), i._cachedInner);
        }),
        M(e, "pattern", (i) => i.innerType?._zod?.pattern),
        M(e, "propValues", (i) => i.innerType?._zod?.propValues),
        M(e, "optin", (i) => i.innerType?._zod?.optin ?? void 0),
        M(e, "optout", (i) => i.innerType?._zod?.optout ?? void 0),
        (e._zod.parse = (i, o) => e._zod.innerType._zod.run(i, o)));
    }),
    Lc = h("$ZodCustom", (e, n) => {
      (Q.init(e, n),
        L.init(e, n),
        (e._zod.parse = (i, o) => i),
        (e._zod.check = (i) => {
          let o = i.value,
            t = n.fn(o);
          if (t instanceof Promise) return t.then((r) => hf(r, i, o, e));
          hf(t, i, o, e);
        }));
    });
  function hf(e, n, i, o) {
    if (!e) {
      let t = {
        code: "custom",
        input: i,
        inst: o,
        path: [...(o._zod.def.path ?? [])],
        continue: !o._zod.def.abort,
      };
      (o._zod.def.params && (t.params = o._zod.def.params), n.issues.push(on(t)));
    }
  }
  var Ci = class extends Error {
      constructor() {
        (super("Cannot parse a reference cycle that closes through a transform"),
          (this.name = "ZodCyclicError"));
      }
    },
    Zc = "~memo",
    kf = [];
  function If(e) {
    return e !== null && typeof e == "object";
  }
  function Rc(e) {
    return e.map((n) => (n.path ? { ...n, path: n.path.slice() } : { ...n }));
  }
  var Sf = new WeakMap(),
    fn = 0,
    Ui = 1,
    hr = 2;
  function vr(e, n, i) {
    let o = Sf.get(e);
    if (o !== void 0) return o ? hr : fn;
    if (n.has(e)) return hr;
    n.add(e);
    let t = fn,
      r = (l) => {
        if (t !== hr && l?._zod) {
          let f = vr(l, n, i);
          f > t && (t = f);
        }
      },
      a = (l, f) => {
        let d = fn;
        for (let m of Reflect.ownKeys(l)) {
          let g = Object.getOwnPropertyDescriptor(l, m);
          if (f && !g.enumerable) continue;
          let $ = g.get ? Ui : g.value?._zod ? vr(g.value, n, i) : fn;
          $ > d && (d = $);
        }
        return d;
      },
      s = (l) => {
        l > t && (t = l);
      },
      u = e._zod.def,
      c = u.type;
    switch (c) {
      case "object": {
        let l = rn(u);
        (s(l ? a(l, !0) : Ui), r(u.catchall));
        break;
      }
      case "array":
        r(u.element);
        break;
      case "tuple":
        for (let l of u.items) r(l);
        r(u.rest);
        break;
      case "record":
      case "map":
        (r(u.keyType), r(u.valueType));
        break;
      case "set":
        r(u.valueType);
        break;
      case "union":
        for (let l of u.options) r(l);
        break;
      case "intersection":
        (r(u.left), r(u.right));
        break;
      case "optional":
      case "nullable":
      case "default":
      case "prefault":
      case "catch":
      case "readonly":
      case "nonoptional":
      case "promise":
      case "success":
        r(u.innerType);
        break;
      case "pipe":
        (r(u.in), r(u.out));
        break;
      case "function":
        (r(u.input), r(u.output));
        break;
      case "lazy": {
        let l = u._cachedInner ?? (i ? e._zod.innerType : void 0);
        s(l ? vr(l, n, !1) : Ui);
        break;
      }
      case "template_literal":
      case "string":
      case "number":
      case "int":
      case "boolean":
      case "bigint":
      case "symbol":
      case "undefined":
      case "null":
      case "void":
      case "never":
      case "any":
      case "unknown":
      case "date":
      case "nan":
      case "enum":
      case "literal":
      case "file":
      case "transform":
      case "custom":
        break;
      default:
        for (let l in u) {
          let f = Object.getOwnPropertyDescriptor(u, l);
          if (!f || f.get) continue;
          let d = f.value;
          if (!(!d || typeof d != "object")) {
            if (d._zod) r(d);
            else if (Array.isArray(d)) for (let m of d) r(m);
          }
        }
    }
    return (n.delete(e), Wv(e, t));
  }
  function Wv(e, n) {
    return (n !== Ui && Sf.set(e, n === hr), n);
  }
  function Li(e) {
    return vr(e, new Set(), !0) !== fn;
  }
  function Jv(e, n) {
    let i = e.buckets.get(n);
    return (i || ((i = new WeakMap()), e.buckets.set(n, i)), i);
  }
  var Di,
    ji = [],
    Gv = {
      alloc(e, n, i) {
        let o = Di;
        if (!o) return i;
        Di = void 0;
        let t = { value: i, issues: null };
        return (o.set(n.value, t), ji.push(t), i);
      },
      guard(e) {
        var n;
        ((n = e._zod).deferred ?? (n.deferred = []),
          e._zod.deferred.push(() => {
            let i = e._zod.parse,
              o = (t, r) => {
                if (r.direction !== "backward" && Ri(r, t.value)) throw new Ci();
                return i(t, r);
              };
            ((e._zod.parse = o), e._zod.run === i && (e._zod.run = o));
          }));
      },
      attach(e) {
        var n;
        let i,
          o = !1,
          t,
          r;
        ((n = e._zod).deferred ?? (n.deferred = []),
          e._zod.deferred.push(() => {
            let a = e._zod.parse,
              s = (u, c) => {
                if (i === void 0) {
                  let z = vr(e, new Set(), !1);
                  if (z === fn)
                    return ((e._zod.parse = a), e._zod.run === s && (e._zod.run = a), a(u, c));
                  z === hr || o ? (i = !0) : (o = !0);
                }
                let l = u.value;
                if (!If(l)) return a(u, c);
                let f = c[Zc];
                f || ((f = { buckets: new WeakMap(), backEdges: void 0 }), (c[Zc] = f));
                let d;
                t === c ? (d = r) : ((d = Jv(f, e)), (t = c), (r = d));
                let m = d.get(l);
                if (m)
                  return (
                    (u.value = m.value),
                    m.issues
                      ? m.issues.length && u.issues.push(...Rc(m.issues))
                      : ((u.memo = !0),
                        f.backEdges ?? (f.backEdges = new WeakSet()),
                        f.backEdges.add(m.value)),
                    u
                  );
                Di = d;
                let g = ji.length,
                  $ = a(u, c);
                Di = void 0;
                let w = ji.length > g ? ji.pop() : void 0;
                return $ instanceof Promise
                  ? $.then((z) => (w && (w.issues = z.issues.length ? Rc(z.issues) : kf), z))
                  : (w && (w.issues = $.issues.length ? Rc($.issues) : kf), $);
              };
            ((e._zod.parse = s), e._zod.run === a && (e._zod.run = s));
          }));
      },
    };
  function $r() {
    return Gv;
  }
  function Ri(e, n) {
    let i = e[Zc]?.backEdges;
    return i !== void 0 && If(n) && i.has(n);
  }
  var br = {};
  Ge(br, {
    ar: () => zf,
    az: () => Nf,
    be: () => Of,
    bg: () => Tf,
    bn: () => Ef,
    ca: () => Af,
    ckb: () => Df,
    cs: () => jf,
    da: () => Uf,
    de: () => Cf,
    el: () => Lf,
    en: () => Zi,
    eo: () => Rf,
    es: () => Zf,
    fa: () => Vf,
    fi: () => Mf,
    fr: () => Ff,
    frCA: () => Bf,
    gu: () => Wf,
    he: () => Jf,
    hi: () => Gf,
    hr: () => Kf,
    hu: () => qf,
    hy: () => Hf,
    id: () => Yf,
    is: () => Qf,
    it: () => em,
    ja: () => tm,
    ka: () => nm,
    kh: () => rm,
    km: () => Vi,
    kn: () => im,
    ko: () => om,
    lt: () => sm,
    mk: () => cm,
    ms: () => um,
    ne: () => lm,
    nl: () => dm,
    nn: () => fm,
    no: () => mm,
    ota: () => pm,
    pl: () => hm,
    ps: () => gm,
    pt: () => vm,
    ptBR: () => $m,
    ro: () => ym,
    ru: () => _m,
    sk: () => wm,
    sl: () => xm,
    sv: () => km,
    ta: () => Im,
    tg: () => Sm,
    th: () => zm,
    tk: () => Nm,
    tr: () => Pm,
    ua: () => Om,
    uk: () => Mi,
    ur: () => Tm,
    uz: () => Em,
    vi: () => Am,
    yo: () => Um,
    zhCN: () => Dm,
    zhTW: () => jm,
  });
  var Kv = () => {
    let e = {
      string: { unit: "\u062D\u0631\u0641", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
      file: { unit: "\u0628\u0627\u064A\u062A", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
      array: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
      set: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
      map: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0645\u062F\u062E\u0644",
        email: "\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
        url: "\u0631\u0627\u0628\u0637",
        emoji: "\u0625\u064A\u0645\u0648\u062C\u064A",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime:
          "\u062A\u0627\u0631\u064A\u062E \u0648\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
        date: "\u062A\u0627\u0631\u064A\u062E \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
        time: "\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
        duration: "\u0645\u062F\u0629 \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
        ipv4: "\u0639\u0646\u0648\u0627\u0646 IPv4",
        ipv6: "\u0639\u0646\u0648\u0627\u0646 IPv6",
        mac: "\u0639\u0646\u0648\u0627\u0646 MAC",
        cidrv4:
          "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv4",
        cidrv6:
          "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv6",
        base64: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64-encoded",
        base64url: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64url-encoded",
        json_string: "\u0646\u064E\u0635 \u0639\u0644\u0649 \u0647\u064A\u0626\u0629 JSON",
        e164: "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0628\u0645\u0639\u064A\u0627\u0631 E.164",
        credit_card:
          "\u0631\u0642\u0645 \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0627\u0626\u062A\u0645\u0627\u0646",
        currency_code: "\u0631\u0645\u0632 \u0627\u0644\u0639\u0645\u0644\u0629",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0645\u062F\u062E\u0644",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 instanceof ${t.expected}\u060C \u0648\u0644\u0643\u0646 \u062A\u0645 \u0625\u062F\u062E\u0627\u0644 ${s}`
            : `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${r}\u060C \u0648\u0644\u0643\u0646 \u062A\u0645 \u0625\u062F\u062E\u0627\u0644 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${b(t.values[0])}`
            : `\u0627\u062E\u062A\u064A\u0627\u0631 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062A\u0648\u0642\u0639 \u0627\u0646\u062A\u0642\u0627\u0621 \u0623\u062D\u062F \u0647\u0630\u0647 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A: ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? ` \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${t.origin ?? "\u0627\u0644\u0642\u064A\u0645\u0629"} ${r} ${t.maximum.toString()} ${a.unit ?? "\u0639\u0646\u0635\u0631"}`
            : `\u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${t.origin ?? "\u0627\u0644\u0642\u064A\u0645\u0629"} ${r} ${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${t.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${r} ${t.minimum.toString()} ${a.unit}`
            : `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${t.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${r} ${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0628\u0640 "${t.prefix}"`
            : r.format === "ends_with"
              ? `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0646\u062A\u0647\u064A \u0628\u0640 "${r.suffix}"`
              : r.format === "includes"
                ? `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u062A\u0636\u0645\u0651\u064E\u0646 "${r.includes}"`
                : r.format === "regex"
                  ? `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0646\u0645\u0637 ${r.pattern}`
                  : `${i[r.format] ?? t.format} \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644`;
        }
        case "not_multiple_of":
          return `\u0631\u0642\u0645 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0646 \u0645\u0636\u0627\u0639\u0641\u0627\u062A ${t.divisor}`;
        case "unrecognized_keys":
          return `\u0645\u0639\u0631\u0641${t.keys.length > 1 ? "\u0627\u062A" : ""} \u063A\u0631\u064A\u0628${t.keys.length > 1 ? "\u0629" : ""}: ${v(t.keys, "\u060C ")}`;
        case "invalid_key":
          return `\u0645\u0639\u0631\u0641 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${t.origin}`;
        case "invalid_union":
          return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
        case "invalid_element":
          return `\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${t.origin}`;
        default:
          return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
      }
    };
  };
  function zf() {
    return { localeError: Kv() };
  }
  var qv = () => {
    let e = {
      string: { unit: "simvol", verb: "olmal\u0131d\u0131r" },
      file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
      array: { unit: "element", verb: "olmal\u0131d\u0131r" },
      set: { unit: "element", verb: "olmal\u0131d\u0131r" },
      map: { unit: "element", verb: "olmal\u0131d\u0131r" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "input",
        email: "email address",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datetime",
        date: "ISO date",
        time: "ISO time",
        duration: "ISO duration",
        ipv4: "IPv4 address",
        ipv6: "IPv6 address",
        mac: "MAC address",
        cidrv4: "IPv4 range",
        cidrv6: "IPv6 range",
        base64: "base64-encoded string",
        base64url: "base64url-encoded string",
        json_string: "JSON string",
        e164: "E.164 number",
        credit_card: "kredit kart\u0131 n\xF6mr\u0259si",
        currency_code: "valyuta kodu",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "input",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n instanceof ${t.expected}, daxil olan ${s}`
            : `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${r}, daxil olan ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${b(t.values[0])}`
            : `Yanl\u0131\u015F se\xE7im: a\u015Fa\u011F\u0131dak\u0131lardan biri olmal\u0131d\u0131r: ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${t.origin ?? "d\u0259y\u0259r"} ${r}${t.maximum.toString()} ${a.unit ?? "element"}`
            : `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${t.origin ?? "d\u0259y\u0259r"} ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${t.origin} ${r}${t.minimum.toString()} ${a.unit}`
            : `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${t.origin} ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Yanl\u0131\u015F m\u0259tn: "${r.prefix}" il\u0259 ba\u015Flamal\u0131d\u0131r`
            : r.format === "ends_with"
              ? `Yanl\u0131\u015F m\u0259tn: "${r.suffix}" il\u0259 bitm\u0259lidir`
              : r.format === "includes"
                ? `Yanl\u0131\u015F m\u0259tn: "${r.includes}" daxil olmal\u0131d\u0131r`
                : r.format === "regex"
                  ? `Yanl\u0131\u015F m\u0259tn: ${r.pattern} \u015Fablonuna uy\u011Fun olmal\u0131d\u0131r`
                  : `Yanl\u0131\u015F ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Yanl\u0131\u015F \u0259d\u0259d: ${t.divisor} il\u0259 b\xF6l\xFCn\u0259 bil\u0259n olmal\u0131d\u0131r`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan a\xE7ar${t.keys.length > 1 ? "lar" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `${t.origin} daxilind\u0259 yanl\u0131\u015F a\xE7ar`;
        case "invalid_union":
          return "Yanl\u0131\u015F d\u0259y\u0259r";
        case "invalid_element":
          return `${t.origin} daxilind\u0259 yanl\u0131\u015F d\u0259y\u0259r`;
        default:
          return "Yanl\u0131\u015F d\u0259y\u0259r";
      }
    };
  };
  function Nf() {
    return { localeError: qv() };
  }
  function Pf(e, n, i, o) {
    let t = Math.abs(e),
      r = t % 10,
      a = t % 100;
    return a >= 11 && a <= 19 ? o : r === 1 ? n : r >= 2 && r <= 4 ? i : o;
  }
  var Xv = () => {
    let e = {
      string: {
        unit: {
          one: "\u0441\u0456\u043C\u0432\u0430\u043B",
          few: "\u0441\u0456\u043C\u0432\u0430\u043B\u044B",
          many: "\u0441\u0456\u043C\u0432\u0430\u043B\u0430\u045E",
        },
        verb: "\u043C\u0435\u0446\u044C",
      },
      array: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E",
        },
        verb: "\u043C\u0435\u0446\u044C",
      },
      set: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E",
        },
        verb: "\u043C\u0435\u0446\u044C",
      },
      map: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E",
        },
        verb: "\u043C\u0435\u0446\u044C",
      },
      file: {
        unit: {
          one: "\u0431\u0430\u0439\u0442",
          few: "\u0431\u0430\u0439\u0442\u044B",
          many: "\u0431\u0430\u0439\u0442\u0430\u045E",
        },
        verb: "\u043C\u0435\u0446\u044C",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0443\u0432\u043E\u0434",
        email: "email \u0430\u0434\u0440\u0430\u0441",
        url: "URL",
        emoji: "\u044D\u043C\u043E\u0434\u0437\u0456",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0434\u0430\u0442\u0430 \u0456 \u0447\u0430\u0441",
        date: "ISO \u0434\u0430\u0442\u0430",
        time: "ISO \u0447\u0430\u0441",
        duration: "ISO \u043F\u0440\u0430\u0446\u044F\u0433\u043B\u0430\u0441\u0446\u044C",
        ipv4: "IPv4 \u0430\u0434\u0440\u0430\u0441",
        ipv6: "IPv6 \u0430\u0434\u0440\u0430\u0441",
        mac: "MAC \u0430\u0434\u0440\u0430\u0441",
        cidrv4: "IPv4 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D",
        cidrv6: "IPv6 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D",
        base64:
          "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64",
        base64url:
          "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64url",
        json_string: "JSON \u0440\u0430\u0434\u043E\u043A",
        e164: "\u043D\u0443\u043C\u0430\u0440 E.164",
        credit_card:
          "\u043D\u0443\u043C\u0430\u0440 \u043A\u0440\u044D\u0434\u044B\u0442\u043D\u0430\u0439 \u043A\u0430\u0440\u0442\u044B",
        currency_code: "\u043A\u043E\u0434 \u0432\u0430\u043B\u044E\u0442\u044B",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0443\u0432\u043E\u0434",
      },
      o = { nan: "NaN", number: "\u043B\u0456\u043A", array: "\u043C\u0430\u0441\u0456\u045E" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u045E\u0441\u044F instanceof ${t.expected}, \u0430\u0442\u0440\u044B\u043C\u0430\u043D\u0430 ${s}`
            : `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u045E\u0441\u044F ${r}, \u0430\u0442\u0440\u044B\u043C\u0430\u043D\u0430 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F ${b(t.values[0])}`
            : `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0432\u0430\u0440\u044B\u044F\u043D\u0442: \u0447\u0430\u043A\u0430\u045E\u0441\u044F \u0430\u0434\u0437\u0456\u043D \u0437 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          if (a) {
            let s = Number(t.maximum),
              u = Pf(s, a.unit.one, a.unit.few, a.unit.many);
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${t.origin ?? "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${a.verb} ${r}${t.maximum.toString()} ${u}`;
          }
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${t.origin ?? "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          if (a) {
            let s = Number(t.minimum),
              u = Pf(s, a.unit.one, a.unit.few, a.unit.many);
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${t.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${a.verb} ${r}${t.minimum.toString()} ${u}`;
          }
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${t.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u043F\u0430\u0447\u044B\u043D\u0430\u0446\u0446\u0430 \u0437 "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u0430\u043A\u0430\u043D\u0447\u0432\u0430\u0446\u0446\u0430 \u043D\u0430 "${r.suffix}"`
              : r.format === "includes"
                ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u043C\u044F\u0448\u0447\u0430\u0446\u044C "${r.includes}"`
                : r.format === "regex"
                  ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0430\u0434\u043F\u0430\u0432\u044F\u0434\u0430\u0446\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${r.pattern}`
                  : `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043B\u0456\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0431\u044B\u0446\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${t.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0441\u043F\u0430\u0437\u043D\u0430\u043D\u044B ${t.keys.length > 1 ? "\u043A\u043B\u044E\u0447\u044B" : "\u043A\u043B\u044E\u0447"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043A\u043B\u044E\u0447 \u0443 ${t.origin}`;
        case "invalid_union":
          return "\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434";
        case "invalid_element":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u0430\u0435 \u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435 \u045E ${t.origin}`;
        default:
          return "\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434";
      }
    };
  };
  function Of() {
    return { localeError: Xv() };
  }
  var Hv = () => {
    let e = {
      string: {
        unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430",
        verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430",
      },
      file: {
        unit: "\u0431\u0430\u0439\u0442\u0430",
        verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430",
      },
      array: {
        unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
        verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430",
      },
      set: {
        unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
        verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430",
      },
      map: {
        unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
        verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0432\u0445\u043E\u0434",
        email: "\u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441",
        url: "URL",
        emoji: "\u0435\u043C\u043E\u0434\u0436\u0438",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0432\u0440\u0435\u043C\u0435",
        date: "ISO \u0434\u0430\u0442\u0430",
        time: "ISO \u0432\u0440\u0435\u043C\u0435",
        duration:
          "ISO \u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442",
        ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441",
        ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441",
        mac: "MAC \u0430\u0434\u0440\u0435\u0441",
        cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
        cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
        base64: "base64-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437",
        base64url: "base64url-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437",
        json_string: "JSON \u043D\u0438\u0437",
        e164: "E.164 \u043D\u043E\u043C\u0435\u0440",
        credit_card:
          "\u043D\u043E\u043C\u0435\u0440 \u043D\u0430 \u043A\u0440\u0435\u0434\u0438\u0442\u043D\u0430 \u043A\u0430\u0440\u0442\u0430",
        currency_code: "\u043A\u043E\u0434 \u043D\u0430 \u0432\u0430\u043B\u0443\u0442\u0430",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0432\u0445\u043E\u0434",
      },
      o = {
        nan: "NaN",
        number: "\u0447\u0438\u0441\u043B\u043E",
        array: "\u043C\u0430\u0441\u0438\u0432",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D instanceof ${t.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D ${s}`
            : `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${r}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${b(t.values[0])}`
            : `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u043E\u043F\u0446\u0438\u044F: \u043E\u0447\u0430\u043A\u0432\u0430\u043D\u043E \u0435\u0434\u043D\u043E \u043E\u0442 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${t.origin ?? "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${r}${t.maximum.toString()} ${a.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430"}`
            : `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${t.origin ?? "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0431\u044A\u0434\u0435 ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${t.origin} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${r}${t.minimum.toString()} ${a.unit}`
            : `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${t.origin} \u0434\u0430 \u0431\u044A\u0434\u0435 ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          if (r.format === "starts_with")
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u0432\u0430 \u0441 "${r.prefix}"`;
          if (r.format === "ends_with")
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u0432\u044A\u0440\u0448\u0432\u0430 \u0441 "${r.suffix}"`;
          if (r.format === "includes")
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0432\u043A\u043B\u044E\u0447\u0432\u0430 "${r.includes}"`;
          if (r.format === "regex")
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0441\u044A\u0432\u043F\u0430\u0434\u0430 \u0441 ${r.pattern}`;
          let a = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D";
          return (
            r.format === "emoji" && (a = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E"),
            r.format === "datetime" &&
              (a = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E"),
            r.format === "date" && (a = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430"),
            r.format === "time" && (a = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E"),
            r.format === "duration" &&
              (a = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430"),
            `${a} ${i[r.format] ?? t.format}`
          );
        }
        case "not_multiple_of":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E \u0447\u0438\u0441\u043B\u043E: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0431\u044A\u0434\u0435 \u043A\u0440\u0430\u0442\u043D\u043E \u043D\u0430 ${t.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0437\u043F\u043E\u0437\u043D\u0430\u0442${t.keys.length > 1 ? "\u0438" : ""} \u043A\u043B\u044E\u0447${t.keys.length > 1 ? "\u043E\u0432\u0435" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043A\u043B\u044E\u0447 \u0432 ${t.origin}`;
        case "invalid_union":
          return "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434";
        case "invalid_element":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442 \u0432 ${t.origin}`;
        default:
          return "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434";
      }
    };
  };
  function Tf() {
    return { localeError: Hv() };
  }
  var Yv = () => {
    let e = {
      string: {
        unit: "\u0985\u0995\u09CD\u09B7\u09B0",
        verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
      },
      file: {
        unit: "\u09AC\u09BE\u0987\u099F",
        verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
      },
      array: {
        unit: "\u0986\u0987\u099F\u09C7\u09AE",
        verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
      },
      set: {
        unit: "\u0986\u0987\u099F\u09C7\u09AE",
        verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
      },
      map: {
        unit: "\u098F\u09A8\u09CD\u099F\u09CD\u09B0\u09BF",
        verb: "\u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0987\u09A8\u09AA\u09C1\u099F",
        email: "\u0987\u09AE\u09C7\u0987\u09B2 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
        url: "URL",
        emoji: "\u0987\u09AE\u09CB\u099C\u09BF",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u09A4\u09BE\u09B0\u09BF\u0996 \u0993 \u09B8\u09AE\u09AF\u09BC",
        date: "ISO \u09A4\u09BE\u09B0\u09BF\u0996",
        time: "ISO \u09B8\u09AE\u09AF\u09BC",
        duration: "ISO \u09B8\u09AE\u09AF\u09BC\u0995\u09BE\u09B2",
        ipv4: "IPv4 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
        ipv6: "IPv6 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
        mac: "MAC \u09A0\u09BF\u0995\u09BE\u09A8\u09BE",
        cidrv4: "IPv4 \u09B0\u09C7\u099E\u09CD\u099C",
        cidrv6: "IPv6 \u09B0\u09C7\u099E\u09CD\u099C",
        base64:
          "base64-\u098F\u09A8\u0995\u09CB\u09A1\u09C7\u09A1 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982",
        base64url:
          "base64url-\u098F\u09A8\u0995\u09CB\u09A1\u09C7\u09A1 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982",
        json_string: "JSON \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982",
        e164: "E.164 \u09A8\u09AE\u09CD\u09AC\u09B0",
        credit_card:
          "\u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F \u0995\u09BE\u09B0\u09CD\u09A1 \u09A8\u09AE\u09CD\u09AC\u09B0",
        currency_code: "\u09AE\u09C1\u09A6\u09CD\u09B0\u09BE \u0995\u09CB\u09A1",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0987\u09A8\u09AA\u09C1\u099F",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return `\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F: \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 ${r}, \u09AA\u09CD\u09B0\u09BE\u09AA\u09CD\u09A4 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F: \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 ${b(t.values[0])}`
            : `\u0985\u09AC\u09C8\u09A7 \u0985\u09AA\u09B6\u09A8: ${v(t.values, " | ")} \u098F\u09B0 \u09AE\u09A7\u09CD\u09AF\u09C7 \u098F\u0995\u099F\u09BF \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u0985\u09A8\u09C7\u0995 \u09AC\u09A1\u09BC: ${t.origin ?? "\u09AE\u09BE\u09A8"} ${r}${t.maximum.toString()} ${a.unit ?? "\u098F\u09B2\u09BF\u09AE\u09C7\u09A8\u09CD\u099F"} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`
            : `\u0985\u09A8\u09C7\u0995 \u09AC\u09A1\u09BC: ${t.origin ?? "\u09AE\u09BE\u09A8"} ${r}${t.maximum.toString()} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0985\u09A8\u09C7\u0995 \u099B\u09CB\u099F: ${t.origin} ${r}${t.minimum.toString()} ${a.unit} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`
            : `\u0985\u09A8\u09C7\u0995 \u099B\u09CB\u099F: ${t.origin} ${r}${t.minimum.toString()} \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: "${r.prefix}" \u09A6\u09BF\u09AF\u09BC\u09C7 \u09B6\u09C1\u09B0\u09C1 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`
            : r.format === "ends_with"
              ? `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: "${r.suffix}" \u09A6\u09BF\u09AF\u09BC\u09C7 \u09B6\u09C7\u09B7 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`
              : r.format === "includes"
                ? `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: "${r.includes}" \u0985\u09A8\u09CD\u09A4\u09B0\u09CD\u09AD\u09C1\u0995\u09CD\u09A4 \u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7`
                : r.format === "regex"
                  ? `\u0985\u09AC\u09C8\u09A7 \u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u0982: ${r.pattern} \u09AA\u09CD\u09AF\u09BE\u099F\u09BE\u09B0\u09CD\u09A8 \u09AE\u09BF\u09B2\u09A4\u09C7 \u09B9\u09AC\u09C7`
                  : `\u0985\u09AC\u09C8\u09A7 ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u0985\u09AC\u09C8\u09A7 \u09A8\u09AE\u09CD\u09AC\u09B0: ${t.divisor} \u098F\u09B0 \u0997\u09C1\u09A3\u09BF\u09A4\u0995 \u09B9\u09A4\u09C7 \u09B9\u09AC\u09C7`;
        case "unrecognized_keys":
          return `\u0985\u099A\u09C7\u09A8\u09BE \u0995\u09C0${t.keys.length > 1 ? "\u0997\u09C1\u09B2\u09CB" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `${t.origin} \u098F \u0985\u09AC\u09C8\u09A7 \u0995\u09C0`;
        case "invalid_union":
          return t.options && Array.isArray(t.options) && t.options.length > 0
            ? `\u0985\u09AC\u09C8\u09A7 \u09A1\u09BF\u09B8\u0995\u09CD\u09B0\u09BF\u09AE\u09BF\u09A8\u09C7\u099F\u09B0 \u09AE\u09BE\u09A8\u0964 \u09AA\u09CD\u09B0\u09A4\u09CD\u09AF\u09BE\u09B6\u09BF\u09A4 ${t.options.map((a) => `'${a}'`).join(" | ")}`
            : "\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F";
        case "invalid_element":
          return `${t.origin} \u098F \u0985\u09AC\u09C8\u09A7 \u09AE\u09BE\u09A8`;
        default:
          return "\u0985\u09AC\u09C8\u09A7 \u0987\u09A8\u09AA\u09C1\u099F";
      }
    };
  };
  function Ef() {
    return { localeError: Yv() };
  }
  var Qv = () => {
    let e = {
      string: { unit: "car\xE0cters", verb: "contenir" },
      file: { unit: "bytes", verb: "contenir" },
      array: { unit: "elements", verb: "contenir" },
      set: { unit: "elements", verb: "contenir" },
      map: { unit: "elements", verb: "contenir" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "entrada",
        email: "adre\xE7a electr\xF2nica",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data i hora ISO",
        date: "data ISO",
        time: "hora ISO",
        duration: "durada ISO",
        ipv4: "adre\xE7a IPv4",
        ipv6: "adre\xE7a IPv6",
        mac: "adre\xE7a MAC",
        cidrv4: "rang IPv4",
        cidrv6: "rang IPv6",
        base64: "cadena codificada en base64",
        base64url: "cadena codificada en base64url",
        json_string: "cadena JSON",
        e164: "n\xFAmero E.164",
        credit_card: "n\xFAmero de targeta de cr\xE8dit",
        currency_code: "codi de moneda",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "entrada",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Tipus inv\xE0lid: s'esperava instanceof ${t.expected}, s'ha rebut ${s}`
            : `Tipus inv\xE0lid: s'esperava ${r}, s'ha rebut ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Valor inv\xE0lid: s'esperava ${b(t.values[0])}`
            : `Opci\xF3 inv\xE0lida: s'esperava una de ${v(t.values, " o ")}`;
        case "too_big": {
          let r = t.inclusive ? "com a m\xE0xim" : "menys de",
            a = n(t.origin);
          return a
            ? `Massa gran: s'esperava que ${t.origin ?? "el valor"} contingu\xE9s ${r} ${t.maximum.toString()} ${a.unit ?? "elements"}`
            : `Massa gran: s'esperava que ${t.origin ?? "el valor"} fos ${r} ${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? "com a m\xEDnim" : "m\xE9s de",
            a = n(t.origin);
          return a
            ? `Massa petit: s'esperava que ${t.origin} contingu\xE9s ${r} ${t.minimum.toString()} ${a.unit}`
            : `Massa petit: s'esperava que ${t.origin} fos ${r} ${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Format inv\xE0lid: ha de comen\xE7ar amb "${r.prefix}"`
            : r.format === "ends_with"
              ? `Format inv\xE0lid: ha d'acabar amb "${r.suffix}"`
              : r.format === "includes"
                ? `Format inv\xE0lid: ha d'incloure "${r.includes}"`
                : r.format === "regex"
                  ? `Format inv\xE0lid: ha de coincidir amb el patr\xF3 ${r.pattern}`
                  : `Format inv\xE0lid per a ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE0lid: ha de ser m\xFAltiple de ${t.divisor}`;
        case "unrecognized_keys":
          return `Clau${t.keys.length > 1 ? "s" : ""} no reconeguda${t.keys.length > 1 ? "s" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Clau inv\xE0lida a ${t.origin}`;
        case "invalid_union":
          return "Entrada inv\xE0lida";
        case "invalid_element":
          return `Element inv\xE0lid a ${t.origin}`;
        default:
          return "Entrada inv\xE0lida";
      }
    };
  };
  function Af() {
    return { localeError: Qv() };
  }
  var e$ = () => {
    let e = {
      string: { unit: "\u067E\u06CC\u062A", verb: "\u0628\u06CE\u062A" },
      file: { unit: "\u0628\u0627\u06CC\u062A", verb: "\u0628\u06CE\u062A" },
      array: { unit: "\u062F\u0627\u0646\u06D5", verb: "\u0628\u06CE\u062A" },
      set: { unit: "\u062F\u0627\u0646\u06D5", verb: "\u0628\u06CE\u062A" },
      map: { unit: "\u062F\u0627\u0646\u06D5", verb: "\u0628\u06CE\u062A" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "regex",
        email: "\u0626\u06CC\u0645\u06D5\u06CC\u06B5",
        url: "\u0628\u06D5\u0633\u062A\u06D5\u0631 (URL)",
        emoji: "\u0626\u06CC\u0645\u06C6\u062C\u06CC",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u0695\u06CE\u06A9\u06D5\u0648\u062A \u0648 \u06A9\u0627\u062A",
        date: "\u0695\u06CE\u06A9\u06D5\u0648\u062A",
        time: "\u06A9\u0627\u062A",
        duration: "\u0645\u0627\u0648\u06D5",
        ipv4: "\u0646\u0627\u0648\u0646\u06CC\u0634\u0627\u0646\u06CC IPv4",
        ipv6: "\u0646\u0627\u0648\u0646\u06CC\u0634\u0627\u0646\u06CC IPv6",
        mac: "\u0646\u0627\u0648\u0646\u06CC\u0634\u0627\u0646\u06CC MAC",
        cidrv4: "\u0645\u06D5\u0648\u062F\u0627\u06CC IPv4",
        cidrv6: "\u0645\u06D5\u0648\u062F\u0627\u06CC IPv6",
        base64: "\u062F\u06D5\u0642\u06CC base64",
        base64url: "\u062F\u06D5\u0642\u06CC base64url",
        json_string: "\u062F\u06D5\u0642\u06CC JSON",
        e164: "\u0698\u0645\u0627\u0631\u06D5\u06CC E.164",
        credit_card:
          "\u0698\u0645\u0627\u0631\u06D5\u06CC \u06A9\u0627\u0631\u062A\u06CC \u06A9\u0631\u06CE\u062F\u06CC\u062A",
        currency_code: "\u06A9\u06C6\u062F\u06CC \u062F\u0631\u0627\u0648",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u062A\u06CE\u06A9\u0631\u062F\u06D5",
      },
      o = {
        nan: "NaN",
        string: "\u0646\u0648\u0648\u0633\u06CC\u0646",
        number: "\u0698\u0645\u0627\u0631\u06D5",
        boolean: "boolean",
        array: "array",
        object: "object",
        date: "\u0695\u06CE\u06A9\u06D5\u0648\u062A",
        integer: "\u0698\u0645\u0627\u0631\u06D5",
        float: "\u0698\u0645\u0627\u0631\u06D5",
        null: "null",
        undefined: "undefined",
        function: "function",
        symbol: "symbol",
        unknown: "unknown",
        promise: "promise",
        void: "void",
        never: "never",
        map: "map",
        set: "set",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a,
            u = ["\u0627", "\u0648", "\u06C6", "\u0648\u0648", "\u06D5", "\u06CC", "\u06CE"].some(
              (l) => s.endsWith(l),
            )
              ? "\u06CC\u06D5"
              : "\u06D5",
            c = /^[a-zA-Z]+$/.test(s);
          return a === "null" || a === "undefined"
            ? "\u062F\u0627\u0648\u0627\u06A9\u0631\u0627\u0648\u06D5"
            : `\u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648\u06D5 ${r} \u0628\u06CE\u062A\u060C \u0628\u06D5\u06B5\u0627\u0645 ${s}${c ? "" : u}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0628\u06D5\u0647\u0627\u06A9\u06D5 \u0646\u0627\u062F\u0631\u0648\u0648\u0633\u062A\u06D5: \u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648\u06D5 ${b(t.values[0])} \u0628\u06CE\u062A`
            : `\u0647\u06D5\u06B5\u0628\u0698\u0627\u0631\u062F\u06D5\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648\u06D5 \u06CC\u06D5\u06A9\u06CE\u06A9 \u0628\u06CE\u062A \u0644\u06D5 ${v(t.values, "|")}`;
        case "too_big": {
          let r = n(t.origin);
          return r
            ? `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u0632\u06C6\u0631\u06D5\u0648\u06D5 ${t.maximum.toString()} ${r.unit} ${r.verb}`
            : `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u0632\u06C6\u0631\u06D5\u0648\u06D5 ${t.maximum.toString()} \u0628\u06CE\u062A`;
        }
        case "too_small": {
          let r = n(t.origin);
          return r
            ? `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u06A9\u06D5\u0645\u06D5\u0648\u06D5 ${t.minimum.toString()} ${r.unit} ${r.verb}`
            : `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u06A9\u06D5\u0645\u06D5\u0648\u06D5 ${t.minimum.toString()} \u0628\u06CE\u062A`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u062F\u06D5\u0633\u062A\u067E\u06CE\u0628\u06A9\u0627\u062A \u0628\u06D5 "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u06A9\u06C6\u062A\u0627\u06CC\u06CC\u0628\u06CE\u062A \u0628\u06D5 "${r.suffix}"`
              : r.format === "includes"
                ? `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 "${r.includes}" \u0644\u06D5\u062E\u06C6\u0628\u06AF\u0631\u06CE\u062A`
                : r.format === "regex"
                  ? `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0644\u06D5\u06AF\u06D5\u06B5 \u067E\u0627\u062A\u06CE\u0631\u0646\u06CC ${r.pattern} \u0628\u06AF\u0648\u0646\u062C\u06CE\u062A`
                  : `\u0628\u06D5\u0647\u0627\u06CC ${i[r.format] ?? t.format} \u0646\u0627\u062F\u0631\u0648\u0633\u062A\u06D5`;
        }
        case "not_multiple_of":
          return `\u0698\u0645\u0627\u0631\u06D5\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u062F\u06D5\u0628\u06CE\u062A \u0686\u06D5\u0646\u062F \u0647\u06CE\u0646\u062F\u06D5 \u0628\u06CE\u062A \u0628\u06C6 ${t.divisor}`;
        case "unrecognized_keys":
          return `\u06A9\u0644\u06CC\u0644\u06CC \u0646\u06D5\u0646\u0627\u0633\u0631\u0627\u0648: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u06A9\u0644\u06CC\u0644\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A \u0644\u06D5 ${t.origin}`;
        case "invalid_union":
          return t.options && Array.isArray(t.options) && t.options.length > 0
            ? `\u0628\u06D5\u0647\u0627\u06CC \u0646\u06D5\u0646\u0627\u0633\u0631\u0627\u0648 \u0647\u06D5\u06CC\u06D5. \u0628\u06D5\u0647\u0627\u06CC \u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648: ${t.options.map((a) => `'${a}'`).join(" | ")}`
            : "\u06CC\u06D5\u06A9\u06AF\u0631\u062A\u0646\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A";
        case "invalid_element":
          return `${t.origin} \u0628\u06D5\u0647\u0627\u06A9\u06D5 \u0646\u0627\u062F\u0631\u0648\u0633\u062A\u06D5`;
        default:
          return "\u062A\u06CE\u06A9\u0631\u062F\u06D5\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A";
      }
    };
  };
  function Df() {
    return { localeError: e$() };
  }
  var t$ = () => {
    let e = {
      string: { unit: "znak\u016F", verb: "m\xEDt" },
      file: { unit: "bajt\u016F", verb: "m\xEDt" },
      array: { unit: "prvk\u016F", verb: "m\xEDt" },
      set: { unit: "prvk\u016F", verb: "m\xEDt" },
      map: { unit: "prvk\u016F", verb: "m\xEDt" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "regul\xE1rn\xED v\xFDraz",
        email: "e-mailov\xE1 adresa",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "datum a \u010Das ve form\xE1tu ISO",
        date: "datum ve form\xE1tu ISO",
        time: "\u010Das ve form\xE1tu ISO",
        duration: "doba trv\xE1n\xED ISO",
        ipv4: "IPv4 adresa",
        ipv6: "IPv6 adresa",
        mac: "MAC adresa",
        cidrv4: "rozsah IPv4",
        cidrv6: "rozsah IPv6",
        base64: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64",
        base64url: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64url",
        json_string: "\u0159et\u011Bzec ve form\xE1tu JSON",
        e164: "\u010D\xEDslo E.164",
        credit_card: "\u010D\xEDslo kreditn\xED karty",
        currency_code: "k\xF3d m\u011Bny",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "vstup",
      },
      o = {
        nan: "NaN",
        number: "\u010D\xEDslo",
        string: "\u0159et\u011Bzec",
        function: "funkce",
        array: "pole",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no instanceof ${t.expected}, obdr\u017Eeno ${s}`
            : `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${r}, obdr\u017Eeno ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${b(t.values[0])}`
            : `Neplatn\xE1 mo\u017Enost: o\u010Dek\xE1v\xE1na jedna z hodnot ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${t.origin ?? "hodnota"} mus\xED m\xEDt ${r}${t.maximum.toString()} ${a.unit ?? "prvk\u016F"}`
            : `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${t.origin ?? "hodnota"} mus\xED b\xFDt ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${t.origin ?? "hodnota"} mus\xED m\xEDt ${r}${t.minimum.toString()} ${a.unit ?? "prvk\u016F"}`
            : `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${t.origin ?? "hodnota"} mus\xED b\xFDt ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Neplatn\xFD \u0159et\u011Bzec: mus\xED za\u010D\xEDnat na "${r.prefix}"`
            : r.format === "ends_with"
              ? `Neplatn\xFD \u0159et\u011Bzec: mus\xED kon\u010Dit na "${r.suffix}"`
              : r.format === "includes"
                ? `Neplatn\xFD \u0159et\u011Bzec: mus\xED obsahovat "${r.includes}"`
                : r.format === "regex"
                  ? `Neplatn\xFD \u0159et\u011Bzec: mus\xED odpov\xEDdat vzoru ${r.pattern}`
                  : `Neplatn\xFD form\xE1t ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Neplatn\xE9 \u010D\xEDslo: mus\xED b\xFDt n\xE1sobkem ${t.divisor}`;
        case "unrecognized_keys":
          return `Nezn\xE1m\xE9 kl\xED\u010De: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Neplatn\xFD kl\xED\u010D v ${t.origin}`;
        case "invalid_union":
          return "Neplatn\xFD vstup";
        case "invalid_element":
          return `Neplatn\xE1 hodnota v ${t.origin}`;
        default:
          return "Neplatn\xFD vstup";
      }
    };
  };
  function jf() {
    return { localeError: t$() };
  }
  var n$ = () => {
    let e = {
      string: { unit: "tegn", verb: "havde" },
      file: { unit: "bytes", verb: "havde" },
      array: { unit: "elementer", verb: "indeholdt" },
      set: { unit: "elementer", verb: "indeholdt" },
      map: { unit: "elementer", verb: "indeholdt" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "input",
        email: "e-mailadresse",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO dato- og klokkesl\xE6t",
        date: "ISO-dato",
        time: "ISO-klokkesl\xE6t",
        duration: "ISO-varighed",
        ipv4: "IPv4-adresse",
        ipv6: "IPv6-adresse",
        mac: "MAC-adresse",
        cidrv4: "IPv4-spektrum",
        cidrv6: "IPv6-spektrum",
        base64: "base64-kodet streng",
        base64url: "base64url-kodet streng",
        json_string: "JSON-streng",
        e164: "E.164-nummer",
        credit_card: "kreditkortnummer",
        currency_code: "valutakode",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "input",
      },
      o = {
        nan: "NaN",
        string: "streng",
        number: "tal",
        boolean: "boolean",
        array: "liste",
        object: "objekt",
        set: "s\xE6t",
        file: "fil",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Ugyldigt input: forventede instanceof ${t.expected}, fik ${s}`
            : `Ugyldigt input: forventede ${r}, fik ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Ugyldig v\xE6rdi: forventede ${b(t.values[0])}`
            : `Ugyldigt valg: forventede en af f\xF8lgende ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin),
            s = o[t.origin] ?? t.origin;
          return a
            ? `For stor: forventede ${s ?? "value"} ${a.verb} ${r} ${t.maximum.toString()} ${a.unit ?? "elementer"}`
            : `For stor: forventede ${s ?? "value"} havde ${r} ${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin),
            s = o[t.origin] ?? t.origin;
          return a
            ? `For lille: forventede ${s} ${a.verb} ${r} ${t.minimum.toString()} ${a.unit}`
            : `For lille: forventede ${s} havde ${r} ${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Ugyldig streng: skal starte med "${r.prefix}"`
            : r.format === "ends_with"
              ? `Ugyldig streng: skal ende med "${r.suffix}"`
              : r.format === "includes"
                ? `Ugyldig streng: skal indeholde "${r.includes}"`
                : r.format === "regex"
                  ? `Ugyldig streng: skal matche m\xF8nsteret ${r.pattern}`
                  : `Ugyldig ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Ugyldigt tal: skal v\xE6re deleligt med ${t.divisor}`;
        case "unrecognized_keys":
          return `${t.keys.length > 1 ? "Ukendte n\xF8gler" : "Ukendt n\xF8gle"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8gle i ${t.origin}`;
        case "invalid_union":
          return "Ugyldigt input: matcher ingen af de tilladte typer";
        case "invalid_element":
          return `Ugyldig v\xE6rdi i ${t.origin}`;
        default:
          return "Ugyldigt input";
      }
    };
  };
  function Uf() {
    return { localeError: n$() };
  }
  var r$ = () => {
    let e = {
      string: { unit: "Zeichen", verb: "zu haben" },
      file: { unit: "Bytes", verb: "zu haben" },
      array: { unit: "Elemente", verb: "zu haben" },
      set: { unit: "Elemente", verb: "zu haben" },
      map: { unit: "Elemente", verb: "zu haben" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "Eingabe",
        email: "E-Mail-Adresse",
        url: "URL",
        emoji: "Emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-Datum und -Uhrzeit",
        date: "ISO-Datum",
        time: "ISO-Uhrzeit",
        duration: "ISO-Dauer",
        ipv4: "IPv4-Adresse",
        ipv6: "IPv6-Adresse",
        mac: "MAC-Adresse",
        cidrv4: "IPv4-Bereich",
        cidrv6: "IPv6-Bereich",
        base64: "Base64-codierter String",
        base64url: "Base64-URL-codierter String",
        json_string: "JSON-String",
        e164: "E.164-Nummer",
        credit_card: "Kreditkartennummer",
        currency_code: "W\xE4hrungscode",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "Eingabe",
      },
      o = { nan: "NaN", number: "Zahl", array: "Array" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Ung\xFCltige Eingabe: erwartet instanceof ${t.expected}, erhalten ${s}`
            : `Ung\xFCltige Eingabe: erwartet ${r}, erhalten ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Ung\xFCltige Eingabe: erwartet ${b(t.values[0])}`
            : `Ung\xFCltige Option: erwartet eine von ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Zu gro\xDF: erwartet, dass ${t.origin ?? "Wert"} ${r}${t.maximum.toString()} ${a.unit ?? "Elemente"} hat`
            : `Zu gro\xDF: erwartet, dass ${t.origin ?? "Wert"} ${r}${t.maximum.toString()} ist`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Zu klein: erwartet, dass ${t.origin} ${r}${t.minimum.toString()} ${a.unit} hat`
            : `Zu klein: erwartet, dass ${t.origin} ${r}${t.minimum.toString()} ist`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Ung\xFCltiger String: muss mit "${r.prefix}" beginnen`
            : r.format === "ends_with"
              ? `Ung\xFCltiger String: muss mit "${r.suffix}" enden`
              : r.format === "includes"
                ? `Ung\xFCltiger String: muss "${r.includes}" enthalten`
                : r.format === "regex"
                  ? `Ung\xFCltiger String: muss dem Muster ${r.pattern} entsprechen`
                  : `Ung\xFCltig: ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Ung\xFCltige Zahl: muss ein Vielfaches von ${t.divisor} sein`;
        case "unrecognized_keys":
          return `${t.keys.length > 1 ? "Unbekannte Schl\xFCssel" : "Unbekannter Schl\xFCssel"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Ung\xFCltiger Schl\xFCssel in ${t.origin}`;
        case "invalid_union":
          return "Ung\xFCltige Eingabe";
        case "invalid_element":
          return `Ung\xFCltiger Wert in ${t.origin}`;
        default:
          return "Ung\xFCltige Eingabe";
      }
    };
  };
  function Cf() {
    return { localeError: r$() };
  }
  var i$ = () => {
    let e = {
      string: {
        unit: "\u03C7\u03B1\u03C1\u03B1\u03BA\u03C4\u03AE\u03C1\u03B5\u03C2",
        verb: "\u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9",
      },
      file: { unit: "bytes", verb: "\u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9" },
      array: {
        unit: "\u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1",
        verb: "\u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9",
      },
      set: {
        unit: "\u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1",
        verb: "\u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9",
      },
      map: {
        unit: "\u03BA\u03B1\u03C4\u03B1\u03C7\u03C9\u03C1\u03AE\u03C3\u03B5\u03B9\u03C2",
        verb: "\u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2",
        email: "\u03B4\u03B9\u03B5\u03CD\u03B8\u03C5\u03BD\u03C3\u03B7 email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime:
          "ISO \u03B7\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1 \u03BA\u03B1\u03B9 \u03CE\u03C1\u03B1",
        date: "ISO \u03B7\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1",
        time: "ISO \u03CE\u03C1\u03B1",
        duration: "ISO \u03B4\u03B9\u03AC\u03C1\u03BA\u03B5\u03B9\u03B1",
        ipv4: "\u03B4\u03B9\u03B5\u03CD\u03B8\u03C5\u03BD\u03C3\u03B7 IPv4",
        ipv6: "\u03B4\u03B9\u03B5\u03CD\u03B8\u03C5\u03BD\u03C3\u03B7 IPv6",
        mac: "\u03B4\u03B9\u03B5\u03CD\u03B8\u03C5\u03BD\u03C3\u03B7 MAC",
        cidrv4: "\u03B5\u03CD\u03C1\u03BF\u03C2 IPv4",
        cidrv6: "\u03B5\u03CD\u03C1\u03BF\u03C2 IPv6",
        base64:
          "\u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC \u03BA\u03C9\u03B4\u03B9\u03BA\u03BF\u03C0\u03BF\u03B9\u03B7\u03BC\u03AD\u03BD\u03B7 \u03C3\u03B5 base64",
        base64url:
          "\u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC \u03BA\u03C9\u03B4\u03B9\u03BA\u03BF\u03C0\u03BF\u03B9\u03B7\u03BC\u03AD\u03BD\u03B7 \u03C3\u03B5 base64url",
        json_string:
          "\u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC JSON",
        e164: "\u03B1\u03C1\u03B9\u03B8\u03BC\u03CC\u03C2 E.164",
        credit_card:
          "\u03B1\u03C1\u03B9\u03B8\u03BC\u03CC\u03C2 \u03C0\u03B9\u03C3\u03C4\u03C9\u03C4\u03B9\u03BA\u03AE\u03C2 \u03BA\u03AC\u03C1\u03C4\u03B1\u03C2",
        currency_code:
          "\u03BA\u03C9\u03B4\u03B9\u03BA\u03CC\u03C2 \u03BD\u03BF\u03BC\u03AF\u03C3\u03BC\u03B1\u03C4\u03BF\u03C2",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return typeof t.expected == "string" && /^[A-Z]/.test(t.expected)
            ? `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD instanceof ${t.expected}, \u03BB\u03AE\u03C6\u03B8\u03B7\u03BA\u03B5 ${s}`
            : `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${r}, \u03BB\u03AE\u03C6\u03B8\u03B7\u03BA\u03B5 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${b(t.values[0])}`
            : `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03C0\u03B9\u03BB\u03BF\u03B3\u03AE: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD \u03AD\u03BD\u03B1 \u03B1\u03C0\u03CC ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u03A0\u03BF\u03BB\u03CD \u03BC\u03B5\u03B3\u03AC\u03BB\u03BF: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${t.origin ?? "\u03C4\u03B9\u03BC\u03AE"} \u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9 ${r}${t.maximum.toString()} ${a.unit ?? "\u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1"}`
            : `\u03A0\u03BF\u03BB\u03CD \u03BC\u03B5\u03B3\u03AC\u03BB\u03BF: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${t.origin ?? "\u03C4\u03B9\u03BC\u03AE"} \u03BD\u03B1 \u03B5\u03AF\u03BD\u03B1\u03B9 ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u03A0\u03BF\u03BB\u03CD \u03BC\u03B9\u03BA\u03C1\u03CC: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${t.origin} \u03BD\u03B1 \u03AD\u03C7\u03B5\u03B9 ${r}${t.minimum.toString()} ${a.unit}`
            : `\u03A0\u03BF\u03BB\u03CD \u03BC\u03B9\u03BA\u03C1\u03CC: \u03B1\u03BD\u03B1\u03BC\u03B5\u03BD\u03CC\u03C4\u03B1\u03BD ${t.origin} \u03BD\u03B1 \u03B5\u03AF\u03BD\u03B1\u03B9 ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC: \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03BE\u03B5\u03BA\u03B9\u03BD\u03AC \u03BC\u03B5 "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC: \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03C4\u03B5\u03BB\u03B5\u03B9\u03CE\u03BD\u03B5\u03B9 \u03BC\u03B5 "${r.suffix}"`
              : r.format === "includes"
                ? `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC: \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03C0\u03B5\u03C1\u03B9\u03AD\u03C7\u03B5\u03B9 "${r.includes}"`
                : r.format === "regex"
                  ? `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C3\u03C5\u03BC\u03B2\u03BF\u03BB\u03BF\u03C3\u03B5\u03B9\u03C1\u03AC: \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03C4\u03B1\u03B9\u03C1\u03B9\u03AC\u03B6\u03B5\u03B9 \u03BC\u03B5 \u03C4\u03BF \u03BC\u03BF\u03C4\u03AF\u03B2\u03BF ${r.pattern}`
                  : `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03BF: ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03BF\u03C2 \u03B1\u03C1\u03B9\u03B8\u03BC\u03CC\u03C2: \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03B5\u03AF\u03BD\u03B1\u03B9 \u03C0\u03BF\u03BB\u03BB\u03B1\u03C0\u03BB\u03AC\u03C3\u03B9\u03BF \u03C4\u03BF\u03C5 ${t.divisor}`;
        case "unrecognized_keys":
          return `\u0386\u03B3\u03BD\u03C9\u03C3\u03C4${t.keys.length > 1 ? "\u03B1" : "\u03BF"} \u03BA\u03BB\u03B5\u03B9\u03B4${t.keys.length > 1 ? "\u03B9\u03AC" : "\u03AF"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03BF \u03BA\u03BB\u03B5\u03B9\u03B4\u03AF \u03C3\u03C4\u03BF ${t.origin}`;
        case "invalid_union":
          return "\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2";
        case "invalid_element":
          return `\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03C4\u03B9\u03BC\u03AE \u03C3\u03C4\u03BF ${t.origin}`;
        default:
          return "\u039C\u03B7 \u03AD\u03B3\u03BA\u03C5\u03C1\u03B7 \u03B5\u03AF\u03C3\u03BF\u03B4\u03BF\u03C2";
      }
    };
  };
  function Lf() {
    return { localeError: i$() };
  }
  var o$ = () => {
    let e = {
      string: { unit: "characters", verb: "to have" },
      file: { unit: "bytes", verb: "to have" },
      array: { unit: "items", verb: "to have" },
      set: { unit: "items", verb: "to have" },
      map: { unit: "entries", verb: "to have" },
    };
    function n(r) {
      return e[r] ?? null;
    }
    let i = {
        regex: "input",
        email: "email address",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datetime",
        date: "ISO date",
        time: "ISO time",
        duration: "ISO duration",
        ipv4: "IPv4 address",
        ipv6: "IPv6 address",
        mac: "MAC address",
        cidrv4: "IPv4 range",
        cidrv6: "IPv6 range",
        base64: "base64-encoded string",
        base64url: "base64url-encoded string",
        json_string: "JSON string",
        e164: "E.164 number",
        currency_code: "currency code",
        credit_card: "credit card number",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "input",
      },
      o = { nan: "NaN" };
    function t(r, a) {
      return r === "number" && typeof a == "number" && !Number.isFinite(a)
        ? String(a)
        : (o[r] ?? r);
    }
    return (r) => {
      switch (r.code) {
        case "invalid_type": {
          let a = t(r.expected),
            s = _(r.input),
            u = t(s, r.input);
          return `Invalid input: expected ${a}, received ${u}`;
        }
        case "invalid_value":
          return r.values.length === 1
            ? `Invalid input: expected ${b(r.values[0])}`
            : `Invalid option: expected one of ${v(r.values, "|")}`;
        case "too_big": {
          let a = r.exact ? "exactly " : r.inclusive ? "<=" : "<",
            s = n(r.origin);
          return s
            ? `Too big: expected ${r.origin ?? "value"} to have ${a}${r.maximum.toString()} ${s.unit ?? "elements"}`
            : `Too big: expected ${r.origin ?? "value"} to be ${a}${r.maximum.toString()}`;
        }
        case "too_small": {
          let a = r.exact ? "exactly " : r.inclusive ? ">=" : ">",
            s = n(r.origin);
          return s
            ? `Too small: expected ${r.origin} to have ${a}${r.minimum.toString()} ${s.unit}`
            : `Too small: expected ${r.origin} to be ${a}${r.minimum.toString()}`;
        }
        case "invalid_format": {
          let a = r;
          return a.format === "starts_with"
            ? `Invalid string: must start with "${a.prefix}"`
            : a.format === "ends_with"
              ? `Invalid string: must end with "${a.suffix}"`
              : a.format === "includes"
                ? `Invalid string: must include "${a.includes}"`
                : a.format === "regex"
                  ? `Invalid string: must match pattern ${a.pattern}`
                  : `Invalid ${i[a.format] ?? r.format}`;
        }
        case "not_multiple_of":
          return `Invalid number: must be a multiple of ${r.divisor}`;
        case "unrecognized_keys":
          return `Unrecognized key${r.keys.length > 1 ? "s" : ""}: ${v(r.keys, ", ")}`;
        case "invalid_key":
          return `Invalid key in ${r.origin}`;
        case "invalid_union":
          return r.options && Array.isArray(r.options) && r.options.length > 0
            ? `Invalid discriminator value. Expected ${r.options.map((s) => `'${s}'`).join(" | ")}`
            : r.inclusive === !1
              ? "Invalid input: more than one option matched"
              : "Invalid input";
        case "invalid_element":
          return `Invalid value in ${r.origin}`;
        default:
          return "Invalid input";
      }
    };
  };
  function Zi() {
    return { localeError: o$() };
  }
  var a$ = () => {
    let e = {
      string: { unit: "karaktrojn", verb: "havi" },
      file: { unit: "bajtojn", verb: "havi" },
      array: { unit: "elementojn", verb: "havi" },
      set: { unit: "elementojn", verb: "havi" },
      map: { unit: "elementojn", verb: "havi" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "enigo",
        email: "retadreso",
        url: "URL",
        emoji: "emo\u011Dio",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-datotempo",
        date: "ISO-dato",
        time: "ISO-tempo",
        duration: "ISO-da\u016Dro",
        ipv4: "IPv4-adreso",
        ipv6: "IPv6-adreso",
        mac: "MAC-adreso",
        cidrv4: "IPv4-rango",
        cidrv6: "IPv6-rango",
        base64: "64-ume kodita karaktraro",
        base64url: "URL-64-ume kodita karaktraro",
        json_string: "JSON-karaktraro",
        e164: "E.164-nombro",
        credit_card: "kreditkarta numero",
        currency_code: "valuta kodo",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "enigo",
      },
      o = { nan: "NaN", number: "nombro", array: "tabelo", null: "senvalora" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Nevalida enigo: atendi\u011Dis instanceof ${t.expected}, ricevi\u011Dis ${s}`
            : `Nevalida enigo: atendi\u011Dis ${r}, ricevi\u011Dis ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Nevalida enigo: atendi\u011Dis ${b(t.values[0])}`
            : `Nevalida opcio: atendi\u011Dis unu el ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Tro granda: atendi\u011Dis ke ${t.origin ?? "valoro"} havu ${r}${t.maximum.toString()} ${a.unit ?? "elementojn"}`
            : `Tro granda: atendi\u011Dis ke ${t.origin ?? "valoro"} havu ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Tro malgranda: atendi\u011Dis ke ${t.origin} havu ${r}${t.minimum.toString()} ${a.unit}`
            : `Tro malgranda: atendi\u011Dis ke ${t.origin} estu ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Nevalida karaktraro: devas komenci\u011Di per "${r.prefix}"`
            : r.format === "ends_with"
              ? `Nevalida karaktraro: devas fini\u011Di per "${r.suffix}"`
              : r.format === "includes"
                ? `Nevalida karaktraro: devas inkluzivi "${r.includes}"`
                : r.format === "regex"
                  ? `Nevalida karaktraro: devas kongrui kun la modelo ${r.pattern}`
                  : `Nevalida ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Nevalida nombro: devas esti oblo de ${t.divisor}`;
        case "unrecognized_keys":
          return `Nekonata${t.keys.length > 1 ? "j" : ""} \u015Dlosilo${t.keys.length > 1 ? "j" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Nevalida \u015Dlosilo en ${t.origin}`;
        case "invalid_union":
          return "Nevalida enigo";
        case "invalid_element":
          return `Nevalida valoro en ${t.origin}`;
        default:
          return "Nevalida enigo";
      }
    };
  };
  function Rf() {
    return { localeError: a$() };
  }
  var s$ = () => {
    let e = {
      string: { unit: "caracteres", verb: "tener" },
      file: { unit: "bytes", verb: "tener" },
      array: { unit: "elementos", verb: "tener" },
      set: { unit: "elementos", verb: "tener" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "entrada",
        email: "direcci\xF3n de correo electr\xF3nico",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "fecha y hora ISO",
        date: "fecha ISO",
        time: "hora ISO",
        duration: "duraci\xF3n ISO",
        ipv4: "direcci\xF3n IPv4",
        ipv6: "direcci\xF3n IPv6",
        mac: "direcci\xF3n MAC",
        cidrv4: "rango IPv4",
        cidrv6: "rango IPv6",
        base64: "cadena codificada en base64",
        base64url: "URL codificada en base64",
        json_string: "cadena JSON",
        e164: "n\xFAmero E.164",
        credit_card: "n\xFAmero de tarjeta de cr\xE9dito",
        currency_code: "c\xF3digo de moneda",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "entrada",
      },
      o = {
        nan: "NaN",
        string: "texto",
        number: "n\xFAmero",
        boolean: "booleano",
        array: "arreglo",
        object: "objeto",
        set: "conjunto",
        file: "archivo",
        date: "fecha",
        bigint: "n\xFAmero grande",
        symbol: "s\xEDmbolo",
        undefined: "indefinido",
        null: "nulo",
        function: "funci\xF3n",
        map: "mapa",
        record: "registro",
        tuple: "tupla",
        enum: "enumeraci\xF3n",
        union: "uni\xF3n",
        literal: "literal",
        promise: "promesa",
        void: "vac\xEDo",
        never: "nunca",
        unknown: "desconocido",
        any: "cualquiera",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Entrada inv\xE1lida: se esperaba instanceof ${t.expected}, recibido ${s}`
            : `Entrada inv\xE1lida: se esperaba ${r}, recibido ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Entrada inv\xE1lida: se esperaba ${b(t.values[0])}`
            : `Opci\xF3n inv\xE1lida: se esperaba una de ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin),
            s = o[t.origin] ?? t.origin;
          return a
            ? `Demasiado grande: se esperaba que ${s ?? "valor"} tuviera ${r}${t.maximum.toString()} ${a.unit ?? "elementos"}`
            : `Demasiado grande: se esperaba que ${s ?? "valor"} fuera ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin),
            s = o[t.origin] ?? t.origin;
          return a
            ? `Demasiado peque\xF1o: se esperaba que ${s} tuviera ${r}${t.minimum.toString()} ${a.unit}`
            : `Demasiado peque\xF1o: se esperaba que ${s} fuera ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Cadena inv\xE1lida: debe comenzar con "${r.prefix}"`
            : r.format === "ends_with"
              ? `Cadena inv\xE1lida: debe terminar en "${r.suffix}"`
              : r.format === "includes"
                ? `Cadena inv\xE1lida: debe incluir "${r.includes}"`
                : r.format === "regex"
                  ? `Cadena inv\xE1lida: debe coincidir con el patr\xF3n ${r.pattern}`
                  : `Inv\xE1lido ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE1lido: debe ser m\xFAltiplo de ${t.divisor}`;
        case "unrecognized_keys":
          return `Llave${t.keys.length > 1 ? "s" : ""} desconocida${t.keys.length > 1 ? "s" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Llave inv\xE1lida en ${o[t.origin] ?? t.origin}`;
        case "invalid_union":
          return "Entrada inv\xE1lida";
        case "invalid_element":
          return `Valor inv\xE1lido en ${o[t.origin] ?? t.origin}`;
        default:
          return "Entrada inv\xE1lida";
      }
    };
  };
  function Zf() {
    return { localeError: s$() };
  }
  var c$ = () => {
    let e = {
      string: {
        unit: "\u06A9\u0627\u0631\u0627\u06A9\u062A\u0631",
        verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F",
      },
      file: {
        unit: "\u0628\u0627\u06CC\u062A",
        verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F",
      },
      array: {
        unit: "\u0622\u06CC\u062A\u0645",
        verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F",
      },
      set: {
        unit: "\u0622\u06CC\u062A\u0645",
        verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F",
      },
      map: {
        unit: "\u0622\u06CC\u062A\u0645",
        verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0648\u0631\u0648\u062F\u06CC",
        email: "\u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644",
        url: "URL",
        emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime:
          "\u062A\u0627\u0631\u06CC\u062E \u0648 \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
        date: "\u062A\u0627\u0631\u06CC\u062E \u0627\u06CC\u0632\u0648",
        time: "\u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
        duration: "\u0645\u062F\u062A \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
        ipv4: "IPv4 \u0622\u062F\u0631\u0633",
        ipv6: "IPv6 \u0622\u062F\u0631\u0633",
        mac: "MAC \u0622\u062F\u0631\u0633",
        cidrv4: "IPv4 \u062F\u0627\u0645\u0646\u0647",
        cidrv6: "IPv6 \u062F\u0627\u0645\u0646\u0647",
        base64: "base64-encoded \u0631\u0634\u062A\u0647",
        base64url: "base64url-encoded \u0631\u0634\u062A\u0647",
        json_string: "JSON \u0631\u0634\u062A\u0647",
        e164: "E.164 \u0639\u062F\u062F",
        credit_card:
          "\u0634\u0645\u0627\u0631\u0647 \u06A9\u0627\u0631\u062A \u0627\u0639\u062A\u0628\u0627\u0631\u06CC",
        currency_code: "\u06A9\u062F \u0627\u0631\u0632",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0648\u0631\u0648\u062F\u06CC",
      },
      o = { nan: "NaN", number: "\u0639\u062F\u062F", array: "\u0622\u0631\u0627\u06CC\u0647" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A instanceof ${t.expected} \u0645\u06CC\u200C\u0628\u0648\u062F\u060C ${s} \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F`
            : `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${r} \u0645\u06CC\u200C\u0628\u0648\u062F\u060C ${s} \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${b(t.values[0])} \u0645\u06CC\u200C\u0628\u0648\u062F`
            : `\u06AF\u0632\u06CC\u0646\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A \u06CC\u06A9\u06CC \u0627\u0632 ${v(t.values, "|")} \u0645\u06CC\u200C\u0628\u0648\u062F`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${t.origin ?? "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${r}${t.maximum.toString()} ${a.unit ?? "\u0639\u0646\u0635\u0631"} \u0628\u0627\u0634\u062F`
            : `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${t.origin ?? "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${r}${t.maximum.toString()} \u0628\u0627\u0634\u062F`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${t.origin} \u0628\u0627\u06CC\u062F ${r}${t.minimum.toString()} ${a.unit} \u0628\u0627\u0634\u062F`
            : `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${t.origin} \u0628\u0627\u06CC\u062F ${r}${t.minimum.toString()} \u0628\u0627\u0634\u062F`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${r.prefix}" \u0634\u0631\u0648\u0639 \u0634\u0648\u062F`
            : r.format === "ends_with"
              ? `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${r.suffix}" \u062A\u0645\u0627\u0645 \u0634\u0648\u062F`
              : r.format === "includes"
                ? `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0634\u0627\u0645\u0644 "${r.includes}" \u0628\u0627\u0634\u062F`
                : r.format === "regex"
                  ? `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 \u0627\u0644\u06AF\u0648\u06CC ${r.pattern} \u0645\u0637\u0627\u0628\u0642\u062A \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F`
                  : `${i[r.format] ?? t.format} \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
        }
        case "not_multiple_of":
          return `\u0639\u062F\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0645\u0636\u0631\u0628 ${t.divisor} \u0628\u0627\u0634\u062F`;
        case "unrecognized_keys":
          return `\u06A9\u0644\u06CC\u062F${t.keys.length > 1 ? "\u0647\u0627\u06CC" : ""} \u0646\u0627\u0634\u0646\u0627\u0633: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u06A9\u0644\u06CC\u062F \u0646\u0627\u0634\u0646\u0627\u0633 \u062F\u0631 ${t.origin}`;
        case "invalid_union":
          return "\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631";
        case "invalid_element":
          return `\u0645\u0642\u062F\u0627\u0631 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u062F\u0631 ${t.origin}`;
        default:
          return "\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631";
      }
    };
  };
  function Vf() {
    return { localeError: c$() };
  }
  var u$ = () => {
    let e = {
      string: { unit: "merkki\xE4", subject: "merkkijonon" },
      file: { unit: "tavua", subject: "tiedoston" },
      array: { unit: "alkiota", subject: "listan" },
      set: { unit: "alkiota", subject: "joukon" },
      map: { unit: "alkiota", subject: "kuvauksen" },
      number: { unit: "", subject: "luvun" },
      bigint: { unit: "", subject: "suuren kokonaisluvun" },
      int: { unit: "", subject: "kokonaisluvun" },
      date: { unit: "", subject: "p\xE4iv\xE4m\xE4\xE4r\xE4n" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "s\xE4\xE4nn\xF6llinen lauseke",
        email: "s\xE4hk\xF6postiosoite",
        url: "URL-osoite",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-aikaleima",
        date: "ISO-p\xE4iv\xE4m\xE4\xE4r\xE4",
        time: "ISO-aika",
        duration: "ISO-kesto",
        ipv4: "IPv4-osoite",
        ipv6: "IPv6-osoite",
        mac: "MAC-osoite",
        cidrv4: "IPv4-alue",
        cidrv6: "IPv6-alue",
        base64: "base64-koodattu merkkijono",
        base64url: "base64url-koodattu merkkijono",
        json_string: "JSON-merkkijono",
        e164: "E.164-luku",
        credit_card: "luottokortin numero",
        currency_code: "valuuttakoodi",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "templaattimerkkijono",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Virheellinen tyyppi: odotettiin instanceof ${t.expected}, oli ${s}`
            : `Virheellinen tyyppi: odotettiin ${r}, oli ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Virheellinen sy\xF6te: t\xE4ytyy olla ${b(t.values[0])}`
            : `Virheellinen valinta: t\xE4ytyy olla yksi seuraavista: ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Liian suuri: ${a.subject} t\xE4ytyy olla ${r}${t.maximum.toString()} ${a.unit}`.trim()
            : `Liian suuri: arvon t\xE4ytyy olla ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Liian pieni: ${a.subject} t\xE4ytyy olla ${r}${t.minimum.toString()} ${a.unit}`.trim()
            : `Liian pieni: arvon t\xE4ytyy olla ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Virheellinen sy\xF6te: t\xE4ytyy alkaa "${r.prefix}"`
            : r.format === "ends_with"
              ? `Virheellinen sy\xF6te: t\xE4ytyy loppua "${r.suffix}"`
              : r.format === "includes"
                ? `Virheellinen sy\xF6te: t\xE4ytyy sis\xE4lt\xE4\xE4 "${r.includes}"`
                : r.format === "regex"
                  ? `Virheellinen sy\xF6te: t\xE4ytyy vastata s\xE4\xE4nn\xF6llist\xE4 lauseketta ${r.pattern}`
                  : `Virheellinen ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Virheellinen luku: t\xE4ytyy olla luvun ${t.divisor} monikerta`;
        case "unrecognized_keys":
          return `${t.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return "Virheellinen avain tietueessa";
        case "invalid_union":
          return "Virheellinen unioni";
        case "invalid_element":
          return "Virheellinen arvo joukossa";
        default:
          return "Virheellinen sy\xF6te";
      }
    };
  };
  function Mf() {
    return { localeError: u$() };
  }
  var l$ = () => {
    let e = {
      string: { unit: "caract\xE8res", verb: "avoir" },
      file: { unit: "octets", verb: "avoir" },
      array: { unit: "\xE9l\xE9ments", verb: "avoir" },
      set: { unit: "\xE9l\xE9ments", verb: "avoir" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "expression r\xE9guli\xE8re",
        email: "adresse e-mail",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "date et heure ISO",
        date: "date ISO",
        time: "heure ISO",
        duration: "dur\xE9e ISO",
        ipv4: "adresse IPv4",
        ipv6: "adresse IPv6",
        mac: "adresse MAC",
        cidrv4: "plage IPv4",
        cidrv6: "plage IPv6",
        base64: "cha\xEEne de caract\xE8res encod\xE9e en base64",
        base64url: "cha\xEEne de caract\xE8res encod\xE9e en base64url",
        json_string: "cha\xEEne de caract\xE8res JSON",
        e164: "num\xE9ro au format E.164",
        credit_card: "num\xE9ro de carte de cr\xE9dit",
        currency_code: "code de devise",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "entr\xE9e",
      },
      o = {
        string: "cha\xEEne de caract\xE8res",
        number: "nombre",
        int: "entier",
        boolean: "bool\xE9en",
        bigint: "grand entier",
        symbol: "symbole",
        undefined: "ind\xE9fini",
        null: "null",
        never: "jamais",
        void: "vide",
        date: "date",
        array: "tableau",
        object: "objet",
        tuple: "tuple",
        record: "record",
        map: "map",
        set: "ensemble",
        file: "fichier",
        nonoptional: "non optionnel",
        nan: "NaN",
        function: "fonction",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Entr\xE9e invalide : instance de ${t.expected} attendu, ${s} re\xE7u`
            : `Entr\xE9e invalide : ${r} attendu, ${s} re\xE7u`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Entr\xE9e invalide : ${b(t.values[0])} attendu`
            : `Option invalide : une valeur parmi ${v(t.values, "|")} attendue`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Trop grand : ${o[t.origin] ?? "valeur"} doit ${a.verb} ${r}${t.maximum.toString()} ${a.unit ?? "\xE9l\xE9ment(s)"}`
            : `Trop grand : ${o[t.origin] ?? "valeur"} doit \xEAtre ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Trop petit : ${o[t.origin] ?? "valeur"} doit ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`
            : `Trop petit : ${o[t.origin] ?? "valeur"} doit \xEAtre ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Cha\xEEne de caract\xE8res invalide : doit commencer par "${r.prefix}"`
            : r.format === "ends_with"
              ? `Cha\xEEne de caract\xE8res invalide : doit se terminer par "${r.suffix}"`
              : r.format === "includes"
                ? `Cha\xEEne de caract\xE8res invalide : doit inclure "${r.includes}"`
                : r.format === "regex"
                  ? `Cha\xEEne de caract\xE8res invalide : doit correspondre au motif ${r.pattern}`
                  : `${i[r.format] ?? t.format} invalide`;
        }
        case "not_multiple_of":
          return `Nombre invalide : doit \xEAtre un multiple de ${t.divisor}`;
        case "unrecognized_keys":
          return `Cl\xE9${t.keys.length > 1 ? "s" : ""} non reconnue${t.keys.length > 1 ? "s" : ""} : ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Cl\xE9 invalide dans ${t.origin}`;
        case "invalid_union":
          return "Entr\xE9e invalide";
        case "invalid_element":
          return `Valeur invalide dans ${t.origin}`;
        default:
          return "Entr\xE9e invalide";
      }
    };
  };
  function Ff() {
    return { localeError: l$() };
  }
  var d$ = () => {
    let e = {
      string: { unit: "caract\xE8res", verb: "avoir" },
      file: { unit: "octets", verb: "avoir" },
      array: { unit: "\xE9l\xE9ments", verb: "avoir" },
      set: { unit: "\xE9l\xE9ments", verb: "avoir" },
      map: { unit: "\xE9l\xE9ments", verb: "avoir" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "entr\xE9e",
        email: "adresse courriel",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "date-heure ISO",
        date: "date ISO",
        time: "heure ISO",
        duration: "dur\xE9e ISO",
        ipv4: "adresse IPv4",
        ipv6: "adresse IPv6",
        mac: "adresse MAC",
        cidrv4: "plage IPv4",
        cidrv6: "plage IPv6",
        base64: "cha\xEEne encod\xE9e en base64",
        base64url: "cha\xEEne encod\xE9e en base64url",
        json_string: "cha\xEEne JSON",
        e164: "num\xE9ro E.164",
        credit_card: "num\xE9ro de carte de cr\xE9dit",
        currency_code: "code de devise",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "entr\xE9e",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Entr\xE9e invalide : attendu instanceof ${t.expected}, re\xE7u ${s}`
            : `Entr\xE9e invalide : attendu ${r}, re\xE7u ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Entr\xE9e invalide : attendu ${b(t.values[0])}`
            : `Option invalide : attendu l'une des valeurs suivantes ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "\u2264" : "<",
            a = n(t.origin);
          return a
            ? `Trop grand : attendu que ${t.origin ?? "la valeur"} ait ${r}${t.maximum.toString()} ${a.unit}`
            : `Trop grand : attendu que ${t.origin ?? "la valeur"} soit ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? "\u2265" : ">",
            a = n(t.origin);
          return a
            ? `Trop petit : attendu que ${t.origin} ait ${r}${t.minimum.toString()} ${a.unit}`
            : `Trop petit : attendu que ${t.origin} soit ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Cha\xEEne invalide : doit commencer par "${r.prefix}"`
            : r.format === "ends_with"
              ? `Cha\xEEne invalide : doit se terminer par "${r.suffix}"`
              : r.format === "includes"
                ? `Cha\xEEne invalide : doit inclure "${r.includes}"`
                : r.format === "regex"
                  ? `Cha\xEEne invalide : doit correspondre au motif ${r.pattern}`
                  : `${i[r.format] ?? t.format} invalide`;
        }
        case "not_multiple_of":
          return `Nombre invalide : doit \xEAtre un multiple de ${t.divisor}`;
        case "unrecognized_keys":
          return `Cl\xE9${t.keys.length > 1 ? "s" : ""} non reconnue${t.keys.length > 1 ? "s" : ""} : ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Cl\xE9 invalide dans ${t.origin}`;
        case "invalid_union":
          return "Entr\xE9e invalide";
        case "invalid_element":
          return `Valeur invalide dans ${t.origin}`;
        default:
          return "Entr\xE9e invalide";
      }
    };
  };
  function Bf() {
    return { localeError: d$() };
  }
  var f$ = () => {
    let e = {
      string: {
        unit: "\u0A85\u0A95\u0ACD\u0AB7\u0AB0",
        verb: "\u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F",
      },
      file: {
        unit: "\u0AAC\u0ABE\u0AAF\u0A9F",
        verb: "\u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F",
      },
      array: {
        unit: "\u0A86\u0A87\u0A9F\u0AAE",
        verb: "\u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F",
      },
      set: {
        unit: "\u0A86\u0A87\u0A9F\u0AAE",
        verb: "\u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F",
      },
      map: {
        unit: "\u0A8F\u0AA8\u0ACD\u0A9F\u0ACD\u0AB0\u0AC0",
        verb: "\u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0A87\u0AA8\u0AAA\u0AC1\u0A9F",
        email: "\u0A88\u0AAE\u0AC7\u0A87\u0AB2 \u0A8F\u0AA1\u0ACD\u0AB0\u0AC7\u0AB8",
        url: "URL",
        emoji: "\u0A87\u0AAE\u0ACB\u0A9C\u0AC0",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0AA4\u0ABE\u0AB0\u0AC0\u0A96 \u0A85\u0AA8\u0AC7 \u0AB8\u0AAE\u0AAF",
        date: "ISO \u0AA4\u0ABE\u0AB0\u0AC0\u0A96",
        time: "ISO \u0AB8\u0AAE\u0AAF",
        duration: "ISO \u0A85\u0AB5\u0AA7\u0ABF",
        ipv4: "IPv4 \u0A8F\u0AA1\u0ACD\u0AB0\u0AC7\u0AB8",
        ipv6: "IPv6 \u0A8F\u0AA1\u0ACD\u0AB0\u0AC7\u0AB8",
        mac: "MAC \u0A8F\u0AA1\u0ACD\u0AB0\u0AC7\u0AB8",
        cidrv4: "IPv4 \u0AB6\u0ACD\u0AB0\u0AC7\u0AA3\u0AC0",
        cidrv6: "IPv6 \u0AB6\u0ACD\u0AB0\u0AC7\u0AA3\u0AC0",
        base64:
          "base64-\u0A8F\u0AA8\u0ACD\u0A95\u0ACB\u0AA1\u0AC7\u0AA1 \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97",
        base64url:
          "base64url-\u0A8F\u0AA8\u0ACD\u0A95\u0ACB\u0AA1\u0AC7\u0AA1 \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97",
        json_string: "JSON \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97",
        e164: "E.164 \u0AA8\u0A82\u0AAC\u0AB0",
        credit_card:
          "\u0A95\u0ACD\u0AB0\u0AC7\u0AA1\u0ABF\u0A9F \u0A95\u0ABE\u0AB0\u0ACD\u0AA1 \u0AA8\u0A82\u0AAC\u0AB0",
        currency_code: "\u0A9A\u0AB2\u0AA3 \u0A95\u0ACB\u0AA1",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0A87\u0AA8\u0AAA\u0AC1\u0A9F",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0A87\u0AA8\u0AAA\u0AC1\u0A9F: \u0A85\u0AAA\u0AC7\u0A95\u0ACD\u0AB7\u0ABF\u0AA4 ${r}, \u0AAA\u0ACD\u0AB0\u0ABE\u0AAA\u0ACD\u0AA4 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0A87\u0AA8\u0AAA\u0AC1\u0A9F: \u0A85\u0AAA\u0AC7\u0A95\u0ACD\u0AB7\u0ABF\u0AA4 ${b(t.values[0])}`
            : `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AB5\u0ABF\u0A95\u0AB2\u0ACD\u0AAA: ${v(t.values, " | ")} \u0AAE\u0ABE\u0AA7\u0ACD\u0AAF\u0AAE\u0AA5\u0AC0 \u0A8F\u0A95 \u0A85\u0AAA\u0AC7\u0A95\u0ACD\u0AB7\u0ABF\u0AA4`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u0A96\u0AC2\u0AAC \u0AAE\u0ACB\u0A9F\u0AC1\u0A82: ${t.origin ?? "\u0AAE\u0AC2\u0AB2\u0ACD\u0AAF"} ${r}${t.maximum.toString()} ${a.unit ?? "\u0A8F\u0AB2\u0ABF\u0AAE\u0AC7\u0AA8\u0ACD\u0A9F"} \u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F`
            : `\u0A96\u0AC2\u0AAC \u0AAE\u0ACB\u0A9F\u0AC1\u0A82: ${t.origin ?? "\u0AAE\u0AC2\u0AB2\u0ACD\u0AAF"} ${r}${t.maximum.toString()} \u0AB9\u0ACB\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0A96\u0AC2\u0AAC \u0AA8\u0ABE\u0AA8\u0AC1\u0A82: ${t.origin} ${r}${t.minimum.toString()} ${a.unit} \u0AB9\u0ACB\u0AB5\u0ABE \u0A9C\u0ACB\u0A88\u0A8F`
            : `\u0A96\u0AC2\u0AAC \u0AA8\u0ABE\u0AA8\u0AC1\u0A82: ${t.origin} ${r}${t.minimum.toString()} \u0AB9\u0ACB\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97: "${r.prefix}" \u0AA5\u0AC0 \u0AB6\u0AB0\u0AC2 \u0AA5\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`
            : r.format === "ends_with"
              ? `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97: "${r.suffix}" \u0AAA\u0AB0 \u0AB8\u0AAE\u0ABE\u0AAA\u0ACD\u0AA4 \u0AA5\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`
              : r.format === "includes"
                ? `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97: "${r.includes}" \u0AB6\u0ABE\u0AAE\u0AC7\u0AB2 \u0AB9\u0ACB\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`
                : r.format === "regex"
                  ? `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AB8\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A82\u0A97: \u0AAA\u0AC7\u0A9F\u0AB0\u0ACD\u0AA8 ${r.pattern} \u0AB8\u0ABE\u0AA5\u0AC7 \u0AAE\u0AC7\u0AB3 \u0A96\u0ABE\u0AB5\u0AC1\u0A82 \u0A9C\u0ACB\u0A88\u0A8F`
                  : `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AA8\u0A82\u0AAC\u0AB0: ${t.divisor} \u0AA8\u0ACB \u0A97\u0AC1\u0AA3\u0ABE\u0A82\u0A95 \u0AB9\u0ACB\u0AB5\u0ACB \u0A9C\u0ACB\u0A88\u0A8F`;
        case "unrecognized_keys":
          return `\u0A93\u0AB3\u0A96\u0AC0 \u0AB6\u0A95\u0ABE\u0AA4\u0ABE \u0AA8\u0AB9\u0AC0\u0A82 \u0AA4\u0AC7 \u0A95\u0AC0${t.keys.length > 1 ? "\u0A93" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `${t.origin} \u0AAE\u0ABE\u0A82 \u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0A95\u0AC0`;
        case "invalid_union":
          return t.options && Array.isArray(t.options) && t.options.length > 0
            ? `\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AA1\u0ABF\u0AB8\u0ACD\u0A95\u0ACD\u0AB0\u0ABF\u0AAE\u0ABF\u0AA8\u0AC7\u0A9F\u0AB0 \u0AAE\u0AC2\u0AB2\u0ACD\u0AAF. \u0A85\u0AAA\u0AC7\u0A95\u0ACD\u0AB7\u0ABF\u0AA4 ${t.options.map((a) => `'${a}'`).join(" | ")}`
            : "\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0A87\u0AA8\u0AAA\u0AC1\u0A9F";
        case "invalid_element":
          return `${t.origin} \u0AAE\u0ABE\u0A82 \u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0AAE\u0AC2\u0AB2\u0ACD\u0AAF`;
        default:
          return "\u0A85\u0AAE\u0ABE\u0AA8\u0ACD\u0AAF \u0A87\u0AA8\u0AAA\u0AC1\u0A9F";
      }
    };
  };
  function Wf() {
    return { localeError: f$() };
  }
  var m$ = () => {
    let e = {
        string: { label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA", gender: "f" },
        number: { label: "\u05DE\u05E1\u05E4\u05E8", gender: "m" },
        boolean: {
          label: "\u05E2\u05E8\u05DA \u05D1\u05D5\u05DC\u05D9\u05D0\u05E0\u05D9",
          gender: "m",
        },
        bigint: { label: "BigInt", gender: "m" },
        date: { label: "\u05EA\u05D0\u05E8\u05D9\u05DA", gender: "m" },
        array: { label: "\u05DE\u05E2\u05E8\u05DA", gender: "m" },
        object: { label: "\u05D0\u05D5\u05D1\u05D9\u05D9\u05E7\u05D8", gender: "m" },
        null: { label: "\u05E2\u05E8\u05DA \u05E8\u05D9\u05E7 (null)", gender: "m" },
        undefined: {
          label: "\u05E2\u05E8\u05DA \u05DC\u05D0 \u05DE\u05D5\u05D2\u05D3\u05E8 (undefined)",
          gender: "m",
        },
        symbol: { label: "\u05E1\u05D9\u05DE\u05D1\u05D5\u05DC (Symbol)", gender: "m" },
        function: { label: "\u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4", gender: "f" },
        map: { label: "\u05DE\u05E4\u05D4 (Map)", gender: "f" },
        set: { label: "\u05E7\u05D1\u05D5\u05E6\u05D4 (Set)", gender: "f" },
        file: { label: "\u05E7\u05D5\u05D1\u05E5", gender: "m" },
        promise: { label: "Promise", gender: "m" },
        NaN: { label: "NaN", gender: "m" },
        unknown: { label: "\u05E2\u05E8\u05DA \u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2", gender: "m" },
        value: { label: "\u05E2\u05E8\u05DA", gender: "m" },
      },
      n = {
        string: {
          unit: "\u05EA\u05D5\u05D5\u05D9\u05DD",
          shortLabel: "\u05E7\u05E6\u05E8",
          longLabel: "\u05D0\u05E8\u05D5\u05DA",
        },
        file: {
          unit: "\u05D1\u05D9\u05D9\u05D8\u05D9\u05DD",
          shortLabel: "\u05E7\u05D8\u05DF",
          longLabel: "\u05D2\u05D3\u05D5\u05DC",
        },
        array: {
          unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD",
          shortLabel: "\u05E7\u05D8\u05DF",
          longLabel: "\u05D2\u05D3\u05D5\u05DC",
        },
        set: {
          unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD",
          shortLabel: "\u05E7\u05D8\u05DF",
          longLabel: "\u05D2\u05D3\u05D5\u05DC",
        },
        number: {
          unit: "",
          shortLabel: "\u05E7\u05D8\u05DF",
          longLabel: "\u05D2\u05D3\u05D5\u05DC",
        },
      },
      i = (c) => (c ? e[c] : void 0),
      o = (c) => {
        let l = i(c);
        return l ? l.label : (c ?? e.unknown.label);
      },
      t = (c) => `\u05D4${o(c)}`,
      r = (c) =>
        (i(c)?.gender ?? "m") === "f"
          ? "\u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05D9\u05D5\u05EA"
          : "\u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA",
      a = (c) => (c ? (n[c] ?? null) : null),
      s = {
        regex: { label: "\u05E7\u05DC\u05D8", gender: "m" },
        email: {
          label: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
          gender: "f",
        },
        url: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05E8\u05E9\u05EA", gender: "f" },
        emoji: { label: "\u05D0\u05D9\u05DE\u05D5\u05D2'\u05D9", gender: "m" },
        uuid: { label: "UUID", gender: "m" },
        uuidv4: { label: "UUIDv4", gender: "m" },
        uuidv6: { label: "UUIDv6", gender: "m" },
        nanoid: { label: "nanoid", gender: "m" },
        guid: { label: "GUID", gender: "m" },
        cuid: { label: "cuid", gender: "m" },
        cuid2: { label: "cuid2", gender: "m" },
        ulid: { label: "ULID", gender: "m" },
        xid: { label: "XID", gender: "m" },
        ksuid: { label: "KSUID", gender: "m" },
        datetime: {
          label: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05D6\u05DE\u05DF ISO",
          gender: "m",
        },
        date: { label: "\u05EA\u05D0\u05E8\u05D9\u05DA ISO", gender: "m" },
        time: { label: "\u05D6\u05DE\u05DF ISO", gender: "m" },
        duration: { label: "\u05DE\u05E9\u05DA \u05D6\u05DE\u05DF ISO", gender: "m" },
        ipv4: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv4", gender: "f" },
        ipv6: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv6", gender: "f" },
        mac: { label: "\u05DB\u05EA\u05D5\u05D1\u05EA MAC", gender: "f" },
        cidrv4: { label: "\u05D8\u05D5\u05D5\u05D7 IPv4", gender: "m" },
        cidrv6: { label: "\u05D8\u05D5\u05D5\u05D7 IPv6", gender: "m" },
        base64: {
          label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64",
          gender: "f",
        },
        base64url: {
          label:
            "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64 \u05DC\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E8\u05E9\u05EA",
          gender: "f",
        },
        json_string: { label: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA JSON", gender: "f" },
        e164: { label: "\u05DE\u05E1\u05E4\u05E8 E.164", gender: "m" },
        credit_card: {
          label:
            "\u05DE\u05E1\u05E4\u05E8 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D0\u05E9\u05E8\u05D0\u05D9",
          gender: "m",
        },
        currency_code: { label: "\u05E7\u05D5\u05D3 \u05DE\u05D8\u05D1\u05E2", gender: "m" },
        iban: { label: "IBAN", gender: "m" },
        jwt: { label: "JWT", gender: "m" },
        template_literal: { label: "\u05E7\u05DC\u05D8", gender: "m" },
        ends_with: { label: "\u05E7\u05DC\u05D8", gender: "m" },
        includes: { label: "\u05E7\u05DC\u05D8", gender: "m" },
        lowercase: { label: "\u05E7\u05DC\u05D8", gender: "m" },
        starts_with: { label: "\u05E7\u05DC\u05D8", gender: "m" },
        uppercase: { label: "\u05E7\u05DC\u05D8", gender: "m" },
      },
      u = { nan: "NaN" };
    return (c) => {
      switch (c.code) {
        case "invalid_type": {
          let l = c.expected,
            f = u[l ?? ""] ?? o(l),
            d = _(c.input),
            m = u[d] ?? e[d]?.label ?? d;
          return /^[A-Z]/.test(c.expected)
            ? `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA instanceof ${c.expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${m}`
            : `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${f}, \u05D4\u05EA\u05E7\u05D1\u05DC ${m}`;
        }
        case "invalid_value": {
          if (c.values.length === 1)
            return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05E2\u05E8\u05DA \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA ${b(c.values[0])}`;
          let l = c.values.map((m) => b(m));
          if (c.values.length === 2)
            return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05DF ${l[0]} \u05D0\u05D5 ${l[1]}`;
          let f = l[l.length - 1];
          return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D4\u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05D4\u05DF ${l.slice(0, -1).join(", ")} \u05D0\u05D5 ${f}`;
        }
        case "too_big": {
          let l = a(c.origin),
            f = t(c.origin ?? "value");
          if (c.origin === "string")
            return `${l?.longLabel ?? "\u05D0\u05E8\u05D5\u05DA"} \u05DE\u05D3\u05D9: ${f} \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05DB\u05D9\u05DC ${c.maximum.toString()} ${l?.unit ?? ""} ${c.inclusive ? "\u05D0\u05D5 \u05E4\u05D7\u05D5\u05EA" : "\u05DC\u05DB\u05DC \u05D4\u05D9\u05D5\u05EA\u05E8"}`.trim();
          if (c.origin === "number") {
            let g = c.inclusive
              ? `\u05E7\u05D8\u05DF \u05D0\u05D5 \u05E9\u05D5\u05D5\u05D4 \u05DC-${c.maximum}`
              : `\u05E7\u05D8\u05DF \u05DE-${c.maximum}`;
            return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${f} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${g}`;
          }
          if (c.origin === "array" || c.origin === "set") {
            let g =
                c.origin === "set" ? "\u05E6\u05E8\u05D9\u05DB\u05D4" : "\u05E6\u05E8\u05D9\u05DA",
              $ = c.inclusive
                ? `${c.maximum} ${l?.unit ?? ""} \u05D0\u05D5 \u05E4\u05D7\u05D5\u05EA`
                : `\u05E4\u05D7\u05D5\u05EA \u05DE-${c.maximum} ${l?.unit ?? ""}`;
            return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${f} ${g} \u05DC\u05D4\u05DB\u05D9\u05DC ${$}`.trim();
          }
          let d = c.inclusive ? "<=" : "<",
            m = r(c.origin ?? "value");
          return l?.unit
            ? `${l.longLabel} \u05DE\u05D3\u05D9: ${f} ${m} ${d}${c.maximum.toString()} ${l.unit}`
            : `${l?.longLabel ?? "\u05D2\u05D3\u05D5\u05DC"} \u05DE\u05D3\u05D9: ${f} ${m} ${d}${c.maximum.toString()}`;
        }
        case "too_small": {
          let l = a(c.origin),
            f = t(c.origin ?? "value");
          if (c.origin === "string")
            return `${l?.shortLabel ?? "\u05E7\u05E6\u05E8"} \u05DE\u05D3\u05D9: ${f} \u05E6\u05E8\u05D9\u05DB\u05D4 \u05DC\u05D4\u05DB\u05D9\u05DC ${c.minimum.toString()} ${l?.unit ?? ""} ${c.inclusive ? "\u05D0\u05D5 \u05D9\u05D5\u05EA\u05E8" : "\u05DC\u05E4\u05D7\u05D5\u05EA"}`.trim();
          if (c.origin === "number") {
            let g = c.inclusive
              ? `\u05D2\u05D3\u05D5\u05DC \u05D0\u05D5 \u05E9\u05D5\u05D5\u05D4 \u05DC-${c.minimum}`
              : `\u05D2\u05D3\u05D5\u05DC \u05DE-${c.minimum}`;
            return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${f} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${g}`;
          }
          if (c.origin === "array" || c.origin === "set") {
            let g =
              c.origin === "set" ? "\u05E6\u05E8\u05D9\u05DB\u05D4" : "\u05E6\u05E8\u05D9\u05DA";
            if (c.minimum === 1 && c.inclusive) {
              let w =
                (c.origin === "set",
                "\u05DC\u05E4\u05D7\u05D5\u05EA \u05E4\u05E8\u05D9\u05D8 \u05D0\u05D7\u05D3");
              return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${f} ${g} \u05DC\u05D4\u05DB\u05D9\u05DC ${w}`;
            }
            let $ = c.inclusive
              ? `${c.minimum} ${l?.unit ?? ""} \u05D0\u05D5 \u05D9\u05D5\u05EA\u05E8`
              : `\u05D9\u05D5\u05EA\u05E8 \u05DE-${c.minimum} ${l?.unit ?? ""}`;
            return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${f} ${g} \u05DC\u05D4\u05DB\u05D9\u05DC ${$}`.trim();
          }
          let d = c.inclusive ? ">=" : ">",
            m = r(c.origin ?? "value");
          return l?.unit
            ? `${l.shortLabel} \u05DE\u05D3\u05D9: ${f} ${m} ${d}${c.minimum.toString()} ${l.unit}`
            : `${l?.shortLabel ?? "\u05E7\u05D8\u05DF"} \u05DE\u05D3\u05D9: ${f} ${m} ${d}${c.minimum.toString()}`;
        }
        case "invalid_format": {
          let l = c;
          if (l.format === "starts_with")
            return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1 "${l.prefix}"`;
          if (l.format === "ends_with")
            return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1 "${l.suffix}"`;
          if (l.format === "includes")
            return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05DB\u05DC\u05D5\u05DC "${l.includes}"`;
          if (l.format === "regex")
            return `\u05D4\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05EA\u05D1\u05E0\u05D9\u05EA ${l.pattern}`;
          let f = s[l.format],
            d = f?.label ?? l.format,
            g =
              (f?.gender ?? "m") === "f"
                ? "\u05EA\u05E7\u05D9\u05E0\u05D4"
                : "\u05EA\u05E7\u05D9\u05DF";
          return `${d} \u05DC\u05D0 ${g}`;
        }
        case "not_multiple_of":
          return `\u05DE\u05E1\u05E4\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05DB\u05E4\u05DC\u05D4 \u05E9\u05DC ${c.divisor}`;
        case "unrecognized_keys":
          return `\u05DE\u05E4\u05EA\u05D7${c.keys.length > 1 ? "\u05D5\u05EA" : ""} \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4${c.keys.length > 1 ? "\u05D9\u05DD" : "\u05D4"}: ${v(c.keys, ", ")}`;
        case "invalid_key":
          return "\u05E9\u05D3\u05D4 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1\u05D0\u05D5\u05D1\u05D9\u05D9\u05E7\u05D8";
        case "invalid_union":
          return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
        case "invalid_element":
          return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${t(c.origin ?? "array")}`;
        default:
          return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
      }
    };
  };
  function Jf() {
    return { localeError: m$() };
  }
  var p$ = () => {
    let e = {
      string: {
        unit: "\u0905\u0915\u094D\u0937\u0930",
        verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
      },
      file: {
        unit: "\u092C\u093E\u0907\u091F\u094D\u0938",
        verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
      },
      array: {
        unit: "\u0924\u0924\u094D\u0935",
        verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
      },
      set: {
        unit: "\u0924\u0924\u094D\u0935",
        verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
      },
      map: {
        unit: "\u092A\u094D\u0930\u0935\u093F\u0937\u094D\u091F\u093F\u092F\u093E\u0901",
        verb: "\u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0907\u0928\u092A\u0941\u091F",
        email: "\u0908\u092E\u0947\u0932 \u092A\u0924\u093E",
        url: "URL",
        emoji: "\u0907\u092E\u094B\u091C\u0940",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0924\u093F\u0925\u093F \u0914\u0930 \u0938\u092E\u092F",
        date: "ISO \u0924\u093F\u0925\u093F",
        time: "ISO \u0938\u092E\u092F",
        duration: "ISO \u0905\u0935\u0927\u093F",
        ipv4: "IPv4 \u092A\u0924\u093E",
        ipv6: "IPv6 \u092A\u0924\u093E",
        mac: "MAC \u092A\u0924\u093E",
        cidrv4: "IPv4 \u0936\u094D\u0930\u0947\u0923\u0940",
        cidrv6: "IPv6 \u0936\u094D\u0930\u0947\u0923\u0940",
        base64:
          "Base64-\u090F\u0928\u094D\u0915\u094B\u0921\u0947\u0921 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917",
        base64url:
          "Base64URL-\u090F\u0928\u094D\u0915\u094B\u0921\u0947\u0921 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917",
        json_string: "JSON \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917",
        e164: "E.164 \u0938\u0902\u0916\u094D\u092F\u093E",
        credit_card:
          "\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u093E\u0930\u094D\u0921 \u0938\u0902\u0916\u094D\u092F\u093E",
        currency_code: "\u092E\u0941\u0926\u094D\u0930\u093E \u0915\u094B\u0921",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0907\u0928\u092A\u0941\u091F",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${r}, \u092A\u094D\u0930\u093E\u092A\u094D\u0924 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${b(t.values[0])}`
            : `\u0905\u092E\u093E\u0928\u094D\u092F \u0935\u093F\u0915\u0932\u094D\u092A: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u092E\u093E\u0928\u094B\u0902 \u092E\u0947\u0902 \u0938\u0947 \u090F\u0915 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u092C\u0939\u0941\u0924 \u092C\u0921\u093C\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${t.origin ?? "\u092E\u093E\u0928"} \u092E\u0947\u0902 ${r}${t.maximum} ${a.unit} \u0939\u094B\u0902`
            : `\u092C\u0939\u0941\u0924 \u092C\u0921\u093C\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${t.origin ?? "\u092E\u093E\u0928"} ${r}${t.maximum} \u0939\u094B`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u092C\u0939\u0941\u0924 \u091B\u094B\u091F\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${t.origin} \u092E\u0947\u0902 ${r}${t.minimum} ${a.unit} \u0939\u094B\u0902`
            : `\u092C\u0939\u0941\u0924 \u091B\u094B\u091F\u093E: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0925\u093E \u0915\u093F ${t.origin} ${r}${t.minimum} \u0939\u094B`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: "${r.prefix}" \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`
            : r.format === "ends_with"
              ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: "${r.suffix}" \u092A\u0930 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`
              : r.format === "includes"
                ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: \u0907\u0938\u092E\u0947\u0902 "${r.includes}" \u0936\u093E\u092E\u093F\u0932 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`
                : r.format === "regex"
                  ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917: \u092A\u0948\u091F\u0930\u094D\u0928 ${r.pattern} \u0938\u0947 \u092E\u0947\u0932 \u0916\u093E\u0928\u093E \u091A\u093E\u0939\u093F\u090F`
                  : `\u0905\u092E\u093E\u0928\u094D\u092F ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u0902\u0916\u094D\u092F\u093E: \u092F\u0939 ${t.divisor} \u0915\u093E \u0917\u0941\u0923\u091C \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F`;
        case "unrecognized_keys":
          return `\u0905\u092A\u0930\u093F\u091A\u093F\u0924 \u0915\u0941\u0902\u091C\u0940${t.keys.length > 1 ? "\u092F\u093E\u0901" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0915\u0941\u0902\u091C\u0940: ${t.origin} \u092E\u0947\u0902`;
        case "invalid_union":
          return t.options && Array.isArray(t.options) && t.options.length > 0
            ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092E\u093F\u0928\u0947\u091F\u0930 \u092E\u093E\u0928: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${t.options.map((a) => `'${a}'`).join(" | ")}`
            : "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
        case "invalid_element":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u092E\u093E\u0928: ${t.origin} \u092E\u0947\u0902`;
        default:
          return "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
      }
    };
  };
  function Gf() {
    return { localeError: p$() };
  }
  var g$ = () => {
    let e = {
      string: { unit: "znakova", verb: "imati" },
      file: { unit: "bajtova", verb: "imati" },
      array: { unit: "stavki", verb: "imati" },
      set: { unit: "stavki", verb: "imati" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "unos",
        email: "email adresa",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datum i vrijeme",
        date: "ISO datum",
        time: "ISO vrijeme",
        duration: "ISO trajanje",
        ipv4: "IPv4 adresa",
        ipv6: "IPv6 adresa",
        mac: "MAC adresa",
        cidrv4: "IPv4 raspon",
        cidrv6: "IPv6 raspon",
        base64: "base64 kodirani tekst",
        base64url: "base64url kodirani tekst",
        json_string: "JSON tekst",
        e164: "E.164 broj",
        credit_card: "broj kreditne kartice",
        currency_code: "kod valute",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "unos",
      },
      o = {
        nan: "NaN",
        string: "tekst",
        number: "broj",
        boolean: "boolean",
        array: "niz",
        object: "objekt",
        set: "skup",
        file: "datoteka",
        date: "datum",
        bigint: "bigint",
        symbol: "simbol",
        undefined: "undefined",
        null: "null",
        function: "funkcija",
        map: "mapa",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Neispravan unos: o\u010Dekuje se instanceof ${t.expected}, a primljeno je ${s}`
            : `Neispravan unos: o\u010Dekuje se ${r}, a primljeno je ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Neispravna vrijednost: o\u010Dekivano ${b(t.values[0])}`
            : `Neispravna opcija: o\u010Dekivano jedno od ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin),
            s = o[t.origin] ?? t.origin;
          return a
            ? `Preveliko: o\u010Dekivano da ${s ?? "vrijednost"} ima ${r}${t.maximum.toString()} ${a.unit ?? "elemenata"}`
            : `Preveliko: o\u010Dekivano da ${s ?? "vrijednost"} bude ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin),
            s = o[t.origin] ?? t.origin;
          return a
            ? `Premalo: o\u010Dekivano da ${s} ima ${r}${t.minimum.toString()} ${a.unit}`
            : `Premalo: o\u010Dekivano da ${s} bude ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Neispravan tekst: mora zapo\u010Dinjati s "${r.prefix}"`
            : r.format === "ends_with"
              ? `Neispravan tekst: mora zavr\u0161avati s "${r.suffix}"`
              : r.format === "includes"
                ? `Neispravan tekst: mora sadr\u017Eavati "${r.includes}"`
                : r.format === "regex"
                  ? `Neispravan tekst: mora odgovarati uzorku ${r.pattern}`
                  : `Neispravna ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Neispravan broj: mora biti vi\u0161ekratnik od ${t.divisor}`;
        case "unrecognized_keys":
          return `Neprepoznat${t.keys.length > 1 ? "i klju\u010Devi" : " klju\u010D"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Neispravan klju\u010D u ${o[t.origin] ?? t.origin}`;
        case "invalid_union":
          return "Neispravan unos";
        case "invalid_element":
          return `Neispravna vrijednost u ${o[t.origin] ?? t.origin}`;
        default:
          return "Neispravan unos";
      }
    };
  };
  function Kf() {
    return { localeError: g$() };
  }
  var h$ = () => {
    let e = {
      string: { unit: "karakter", verb: "legyen" },
      file: { unit: "byte", verb: "legyen" },
      array: { unit: "elem", verb: "legyen" },
      set: { unit: "elem", verb: "legyen" },
      map: { unit: "elem", verb: "legyen" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "bemenet",
        email: "email c\xEDm",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO id\u0151b\xE9lyeg",
        date: "ISO d\xE1tum",
        time: "ISO id\u0151",
        duration: "ISO id\u0151intervallum",
        ipv4: "IPv4 c\xEDm",
        ipv6: "IPv6 c\xEDm",
        mac: "MAC c\xEDm",
        cidrv4: "IPv4 tartom\xE1ny",
        cidrv6: "IPv6 tartom\xE1ny",
        base64: "base64-k\xF3dolt string",
        base64url: "base64url-k\xF3dolt string",
        json_string: "JSON string",
        e164: "E.164 sz\xE1m",
        credit_card: "hitelk\xE1rtyasz\xE1m",
        currency_code: "p\xE9nznemk\xF3d",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "bemenet",
      },
      o = { nan: "NaN", number: "sz\xE1m", array: "t\xF6mb" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k instanceof ${t.expected}, a kapott \xE9rt\xE9k ${s}`
            : `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${r}, a kapott \xE9rt\xE9k ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${b(t.values[0])}`
            : `\xC9rv\xE9nytelen opci\xF3: valamelyik \xE9rt\xE9k v\xE1rt ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `T\xFAl nagy: ${t.origin ?? "\xE9rt\xE9k"} m\xE9rete t\xFAl nagy ${r}${t.maximum.toString()} ${a.unit ?? "elem"}`
            : `T\xFAl nagy: a bemeneti \xE9rt\xE9k ${t.origin ?? "\xE9rt\xE9k"} t\xFAl nagy: ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${t.origin} m\xE9rete t\xFAl kicsi ${r}${t.minimum.toString()} ${a.unit}`
            : `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${t.origin} t\xFAl kicsi ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\xC9rv\xE9nytelen string: "${r.prefix}" \xE9rt\xE9kkel kell kezd\u0151dnie`
            : r.format === "ends_with"
              ? `\xC9rv\xE9nytelen string: "${r.suffix}" \xE9rt\xE9kkel kell v\xE9gz\u0151dnie`
              : r.format === "includes"
                ? `\xC9rv\xE9nytelen string: "${r.includes}" \xE9rt\xE9ket kell tartalmaznia`
                : r.format === "regex"
                  ? `\xC9rv\xE9nytelen string: ${r.pattern} mint\xE1nak kell megfelelnie`
                  : `\xC9rv\xE9nytelen ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\xC9rv\xE9nytelen sz\xE1m: ${t.divisor} t\xF6bbsz\xF6r\xF6s\xE9nek kell lennie`;
        case "unrecognized_keys":
          return `Ismeretlen kulcs${t.keys.length > 1 ? "s" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\xC9rv\xE9nytelen kulcs ${t.origin}`;
        case "invalid_union":
          return "\xC9rv\xE9nytelen bemenet";
        case "invalid_element":
          return `\xC9rv\xE9nytelen \xE9rt\xE9k: ${t.origin}`;
        default:
          return "\xC9rv\xE9nytelen bemenet";
      }
    };
  };
  function qf() {
    return { localeError: h$() };
  }
  function Xf(e, n, i) {
    return Math.abs(e) === 1 ? n : i;
  }
  function mn(e) {
    if (!e) return "";
    let n = ["\u0561", "\u0565", "\u0568", "\u056B", "\u0578", "\u0578\u0582", "\u0585"],
      i = e[e.length - 1];
    return e + (n.includes(i) ? "\u0576" : "\u0568");
  }
  var v$ = () => {
    let e = {
      string: {
        unit: {
          one: "\u0576\u0577\u0561\u0576",
          many: "\u0576\u0577\u0561\u0576\u0576\u0565\u0580",
        },
        verb: "\u0578\u0582\u0576\u0565\u0576\u0561\u056C",
      },
      file: {
        unit: { one: "\u0562\u0561\u0575\u0569", many: "\u0562\u0561\u0575\u0569\u0565\u0580" },
        verb: "\u0578\u0582\u0576\u0565\u0576\u0561\u056C",
      },
      array: {
        unit: { one: "\u057F\u0561\u0580\u0580", many: "\u057F\u0561\u0580\u0580\u0565\u0580" },
        verb: "\u0578\u0582\u0576\u0565\u0576\u0561\u056C",
      },
      set: {
        unit: { one: "\u057F\u0561\u0580\u0580", many: "\u057F\u0561\u0580\u0580\u0565\u0580" },
        verb: "\u0578\u0582\u0576\u0565\u0576\u0561\u056C",
      },
      map: {
        unit: { one: "\u057F\u0561\u0580\u0580", many: "\u057F\u0561\u0580\u0580\u0565\u0580" },
        verb: "\u0578\u0582\u0576\u0565\u0576\u0561\u056C",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0574\u0578\u0582\u057F\u0584",
        email: "\u0567\u056C. \u0570\u0561\u057D\u0581\u0565",
        url: "URL",
        emoji: "\u0567\u0574\u0578\u057B\u056B",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0561\u0574\u057D\u0561\u0569\u056B\u057E \u0587 \u056A\u0561\u0574",
        date: "ISO \u0561\u0574\u057D\u0561\u0569\u056B\u057E",
        time: "ISO \u056A\u0561\u0574",
        duration: "ISO \u057F\u0587\u0578\u0572\u0578\u0582\u0569\u0575\u0578\u0582\u0576",
        ipv4: "IPv4 \u0570\u0561\u057D\u0581\u0565",
        ipv6: "IPv6 \u0570\u0561\u057D\u0581\u0565",
        mac: "MAC \u0570\u0561\u057D\u0581\u0565",
        cidrv4: "IPv4 \u0574\u056B\u057B\u0561\u056F\u0561\u0575\u0584",
        cidrv6: "IPv6 \u0574\u056B\u057B\u0561\u056F\u0561\u0575\u0584",
        base64: "base64 \u0571\u0587\u0561\u0579\u0561\u0583\u0578\u057E \u057F\u0578\u0572",
        base64url: "base64url \u0571\u0587\u0561\u0579\u0561\u0583\u0578\u057E \u057F\u0578\u0572",
        json_string: "JSON \u057F\u0578\u0572",
        e164: "E.164 \u0570\u0561\u0574\u0561\u0580",
        credit_card:
          "\u056F\u0580\u0565\u0564\u056B\u057F \u0584\u0561\u0580\u057F\u056B \u0570\u0561\u0574\u0561\u0580",
        currency_code: "\u0561\u0580\u056A\u0578\u0582\u0575\u0569\u056B \u056F\u0578\u0564",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0574\u0578\u0582\u057F\u0584",
      },
      o = {
        nan: "NaN",
        number: "\u0569\u056B\u057E",
        array: "\u0566\u0561\u0576\u0563\u057E\u0561\u056E",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u054D\u056D\u0561\u056C \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0578\u0582\u0574\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567\u0580 instanceof ${t.expected}, \u057D\u057F\u0561\u0581\u057E\u0565\u056C \u0567 ${s}`
            : `\u054D\u056D\u0561\u056C \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0578\u0582\u0574\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567\u0580 ${r}, \u057D\u057F\u0561\u0581\u057E\u0565\u056C \u0567 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u054D\u056D\u0561\u056C \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0578\u0582\u0574\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567\u0580 ${b(t.values[1])}`
            : `\u054D\u056D\u0561\u056C \u057F\u0561\u0580\u0562\u0565\u0580\u0561\u056F\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567\u0580 \u0570\u0565\u057F\u0587\u0575\u0561\u056C\u0576\u0565\u0580\u056B\u0581 \u0574\u0565\u056F\u0568\u055D ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          if (a) {
            let s = Number(t.maximum),
              u = Xf(s, a.unit.one, a.unit.many);
            return `\u0549\u0561\u0583\u0561\u0566\u0561\u0576\u0581 \u0574\u0565\u056E \u0561\u0580\u056A\u0565\u0584\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567, \u0578\u0580 ${mn(t.origin ?? "\u0561\u0580\u056A\u0565\u0584")} \u056F\u0578\u0582\u0576\u0565\u0576\u0561 ${r}${t.maximum.toString()} ${u}`;
          }
          return `\u0549\u0561\u0583\u0561\u0566\u0561\u0576\u0581 \u0574\u0565\u056E \u0561\u0580\u056A\u0565\u0584\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567, \u0578\u0580 ${mn(t.origin ?? "\u0561\u0580\u056A\u0565\u0584")} \u056C\u056B\u0576\u056B ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          if (a) {
            let s = Number(t.minimum),
              u = Xf(s, a.unit.one, a.unit.many);
            return `\u0549\u0561\u0583\u0561\u0566\u0561\u0576\u0581 \u0583\u0578\u0584\u0580 \u0561\u0580\u056A\u0565\u0584\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567, \u0578\u0580 ${mn(t.origin)} \u056F\u0578\u0582\u0576\u0565\u0576\u0561 ${r}${t.minimum.toString()} ${u}`;
          }
          return `\u0549\u0561\u0583\u0561\u0566\u0561\u0576\u0581 \u0583\u0578\u0584\u0580 \u0561\u0580\u056A\u0565\u0584\u2024 \u057D\u057A\u0561\u057D\u057E\u0578\u0582\u0574 \u0567, \u0578\u0580 ${mn(t.origin)} \u056C\u056B\u0576\u056B ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u054D\u056D\u0561\u056C \u057F\u0578\u0572\u2024 \u057A\u0565\u057F\u0584 \u0567 \u057D\u056F\u057D\u057E\u056B "${r.prefix}"-\u0578\u057E`
            : r.format === "ends_with"
              ? `\u054D\u056D\u0561\u056C \u057F\u0578\u0572\u2024 \u057A\u0565\u057F\u0584 \u0567 \u0561\u057E\u0561\u0580\u057F\u057E\u056B "${r.suffix}"-\u0578\u057E`
              : r.format === "includes"
                ? `\u054D\u056D\u0561\u056C \u057F\u0578\u0572\u2024 \u057A\u0565\u057F\u0584 \u0567 \u057A\u0561\u0580\u0578\u0582\u0576\u0561\u056F\u056B "${r.includes}"`
                : r.format === "regex"
                  ? `\u054D\u056D\u0561\u056C \u057F\u0578\u0572\u2024 \u057A\u0565\u057F\u0584 \u0567 \u0570\u0561\u0574\u0561\u057A\u0561\u057F\u0561\u057D\u056D\u0561\u0576\u056B ${r.pattern} \u0571\u0587\u0561\u0579\u0561\u0583\u056B\u0576`
                  : `\u054D\u056D\u0561\u056C ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u054D\u056D\u0561\u056C \u0569\u056B\u057E\u2024 \u057A\u0565\u057F\u0584 \u0567 \u0562\u0561\u0566\u0574\u0561\u057A\u0561\u057F\u056B\u056F \u056C\u056B\u0576\u056B ${t.divisor}-\u056B`;
        case "unrecognized_keys":
          return `\u0549\u0573\u0561\u0576\u0561\u0579\u057E\u0561\u056E \u0562\u0561\u0576\u0561\u056C\u056B${t.keys.length > 1 ? "\u0576\u0565\u0580" : ""}. ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u054D\u056D\u0561\u056C \u0562\u0561\u0576\u0561\u056C\u056B ${mn(t.origin)}-\u0578\u0582\u0574`;
        case "invalid_union":
          return "\u054D\u056D\u0561\u056C \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0578\u0582\u0574";
        case "invalid_element":
          return `\u054D\u056D\u0561\u056C \u0561\u0580\u056A\u0565\u0584 ${mn(t.origin)}-\u0578\u0582\u0574`;
        default:
          return "\u054D\u056D\u0561\u056C \u0574\u0578\u0582\u057F\u0584\u0561\u0563\u0580\u0578\u0582\u0574";
      }
    };
  };
  function Hf() {
    return { localeError: v$() };
  }
  var $$ = () => {
    let e = {
      string: { unit: "karakter", verb: "memiliki" },
      file: { unit: "byte", verb: "memiliki" },
      array: { unit: "item", verb: "memiliki" },
      set: { unit: "item", verb: "memiliki" },
      map: { unit: "item", verb: "memiliki" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "input",
        email: "alamat email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "tanggal dan waktu format ISO",
        date: "tanggal format ISO",
        time: "jam format ISO",
        duration: "durasi format ISO",
        ipv4: "alamat IPv4",
        ipv6: "alamat IPv6",
        mac: "alamat MAC",
        cidrv4: "rentang alamat IPv4",
        cidrv6: "rentang alamat IPv6",
        base64: "string dengan enkode base64",
        base64url: "string dengan enkode base64url",
        json_string: "string JSON",
        e164: "angka E.164",
        credit_card: "nomor kartu kredit",
        currency_code: "kode mata uang",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "input",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Input tidak valid: diharapkan instanceof ${t.expected}, diterima ${s}`
            : `Input tidak valid: diharapkan ${r}, diterima ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Input tidak valid: diharapkan ${b(t.values[0])}`
            : `Pilihan tidak valid: diharapkan salah satu dari ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Terlalu besar: diharapkan ${t.origin ?? "value"} memiliki ${r}${t.maximum.toString()} ${a.unit ?? "elemen"}`
            : `Terlalu besar: diharapkan ${t.origin ?? "value"} menjadi ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Terlalu kecil: diharapkan ${t.origin} memiliki ${r}${t.minimum.toString()} ${a.unit}`
            : `Terlalu kecil: diharapkan ${t.origin} menjadi ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `String tidak valid: harus dimulai dengan "${r.prefix}"`
            : r.format === "ends_with"
              ? `String tidak valid: harus berakhir dengan "${r.suffix}"`
              : r.format === "includes"
                ? `String tidak valid: harus menyertakan "${r.includes}"`
                : r.format === "regex"
                  ? `String tidak valid: harus sesuai pola ${r.pattern}`
                  : `${i[r.format] ?? t.format} tidak valid`;
        }
        case "not_multiple_of":
          return `Angka tidak valid: harus kelipatan dari ${t.divisor}`;
        case "unrecognized_keys":
          return `Kunci tidak dikenali ${t.keys.length > 1 ? "s" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Kunci tidak valid di ${t.origin}`;
        case "invalid_union":
          return "Input tidak valid";
        case "invalid_element":
          return `Nilai tidak valid di ${t.origin}`;
        default:
          return "Input tidak valid";
      }
    };
  };
  function Yf() {
    return { localeError: $$() };
  }
  var y$ = () => {
    let e = {
      string: { unit: "stafi", verb: "a\xF0 hafa" },
      file: { unit: "b\xE6ti", verb: "a\xF0 hafa" },
      array: { unit: "hluti", verb: "a\xF0 hafa" },
      set: { unit: "hluti", verb: "a\xF0 hafa" },
      map: { unit: "hluti", verb: "a\xF0 hafa" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "gildi",
        email: "netfang",
        url: "vefsl\xF3\xF0",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO dagsetning og t\xEDmi",
        date: "ISO dagsetning",
        time: "ISO t\xEDmi",
        duration: "ISO t\xEDmalengd",
        ipv4: "IPv4 address",
        ipv6: "IPv6 address",
        mac: "MAC address",
        cidrv4: "IPv4 range",
        cidrv6: "IPv6 range",
        base64: "base64-encoded strengur",
        base64url: "base64url-encoded strengur",
        json_string: "JSON strengur",
        e164: "E.164 t\xF6lugildi",
        credit_card: "kreditkortan\xFAmer",
        currency_code: "gjaldmi\xF0ilsk\xF3\xF0i",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "gildi",
      },
      o = { nan: "NaN", number: "n\xFAmer", array: "fylki" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Rangt gildi: \xDE\xFA sl\xF3st inn ${s} \xFEar sem \xE1 a\xF0 vera instanceof ${t.expected}`
            : `Rangt gildi: \xDE\xFA sl\xF3st inn ${s} \xFEar sem \xE1 a\xF0 vera ${r}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Rangt gildi: gert r\xE1\xF0 fyrir ${b(t.values[0])}`
            : `\xD3gilt val: m\xE1 vera eitt af eftirfarandi ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${t.origin ?? "gildi"} hafi ${r}${t.maximum.toString()} ${a.unit ?? "hluti"}`
            : `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${t.origin ?? "gildi"} s\xE9 ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${t.origin} hafi ${r}${t.minimum.toString()} ${a.unit}`
            : `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${t.origin} s\xE9 ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\xD3gildur strengur: ver\xF0ur a\xF0 byrja \xE1 "${r.prefix}"`
            : r.format === "ends_with"
              ? `\xD3gildur strengur: ver\xF0ur a\xF0 enda \xE1 "${r.suffix}"`
              : r.format === "includes"
                ? `\xD3gildur strengur: ver\xF0ur a\xF0 innihalda "${r.includes}"`
                : r.format === "regex"
                  ? `\xD3gildur strengur: ver\xF0ur a\xF0 fylgja mynstri ${r.pattern}`
                  : `Rangt ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `R\xF6ng tala: ver\xF0ur a\xF0 vera margfeldi af ${t.divisor}`;
        case "unrecognized_keys":
          return `\xD3\xFEekkt ${t.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Rangur lykill \xED ${t.origin}`;
        case "invalid_union":
          return "Rangt gildi";
        case "invalid_element":
          return `Rangt gildi \xED ${t.origin}`;
        default:
          return "Rangt gildi";
      }
    };
  };
  function Qf() {
    return { localeError: y$() };
  }
  var b$ = () => {
    let e = {
      string: { unit: "caratteri", verb: "avere" },
      file: { unit: "byte", verb: "avere" },
      array: { unit: "elementi", verb: "avere" },
      set: { unit: "elementi", verb: "avere" },
      map: { unit: "elementi", verb: "avere" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "input",
        email: "indirizzo email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data e ora ISO",
        date: "data ISO",
        time: "ora ISO",
        duration: "durata ISO",
        ipv4: "indirizzo IPv4",
        ipv6: "indirizzo IPv6",
        mac: "indirizzo MAC",
        cidrv4: "intervallo IPv4",
        cidrv6: "intervallo IPv6",
        base64: "stringa codificata in base64",
        base64url: "URL codificata in base64",
        json_string: "stringa JSON",
        e164: "numero E.164",
        credit_card: "numero di carta di credito",
        currency_code: "codice valuta",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "input",
      },
      o = { nan: "NaN", number: "numero", array: "vettore" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Input non valido: atteso instanceof ${t.expected}, ricevuto ${s}`
            : `Input non valido: atteso ${r}, ricevuto ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Input non valido: atteso ${b(t.values[0])}`
            : `Opzione non valida: atteso uno tra ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Troppo grande: ${t.origin ?? "valore"} deve avere ${r}${t.maximum.toString()} ${a.unit ?? "elementi"}`
            : `Troppo grande: ${t.origin ?? "valore"} deve essere ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Troppo piccolo: ${t.origin} deve avere ${r}${t.minimum.toString()} ${a.unit}`
            : `Troppo piccolo: ${t.origin} deve essere ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Stringa non valida: deve iniziare con "${r.prefix}"`
            : r.format === "ends_with"
              ? `Stringa non valida: deve terminare con "${r.suffix}"`
              : r.format === "includes"
                ? `Stringa non valida: deve includere "${r.includes}"`
                : r.format === "regex"
                  ? `Stringa non valida: deve corrispondere al pattern ${r.pattern}`
                  : `Input non valido: ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Numero non valido: deve essere un multiplo di ${t.divisor}`;
        case "unrecognized_keys":
          return `Chiav${t.keys.length > 1 ? "i" : "e"} non riconosciut${t.keys.length > 1 ? "e" : "a"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Chiave non valida in ${t.origin}`;
        case "invalid_union":
          return "Input non valido";
        case "invalid_element":
          return `Valore non valido in ${t.origin}`;
        default:
          return "Input non valido";
      }
    };
  };
  function em() {
    return { localeError: b$() };
  }
  var _$ = () => {
    let e = {
      string: { unit: "\u6587\u5B57", verb: "\u3067\u3042\u308B" },
      file: { unit: "\u30D0\u30A4\u30C8", verb: "\u3067\u3042\u308B" },
      array: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" },
      set: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" },
      map: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u5165\u529B\u5024",
        email: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9",
        url: "URL",
        emoji: "\u7D75\u6587\u5B57",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO\u65E5\u6642",
        date: "ISO\u65E5\u4ED8",
        time: "ISO\u6642\u523B",
        duration: "ISO\u671F\u9593",
        ipv4: "IPv4\u30A2\u30C9\u30EC\u30B9",
        ipv6: "IPv6\u30A2\u30C9\u30EC\u30B9",
        mac: "MAC\u30A2\u30C9\u30EC\u30B9",
        cidrv4: "IPv4\u7BC4\u56F2",
        cidrv6: "IPv6\u7BC4\u56F2",
        base64: "base64\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
        base64url: "base64url\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
        json_string: "JSON\u6587\u5B57\u5217",
        e164: "E.164\u756A\u53F7",
        credit_card: "\u30AF\u30EC\u30B8\u30C3\u30C8\u30AB\u30FC\u30C9\u756A\u53F7",
        currency_code: "\u901A\u8CA8\u30B3\u30FC\u30C9",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u5165\u529B\u5024",
      },
      o = { nan: "NaN", number: "\u6570\u5024", array: "\u914D\u5217" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u7121\u52B9\u306A\u5165\u529B: instanceof ${t.expected}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${s}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`
            : `\u7121\u52B9\u306A\u5165\u529B: ${r}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${s}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u7121\u52B9\u306A\u5165\u529B: ${b(t.values[0])}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F`
            : `\u7121\u52B9\u306A\u9078\u629E: ${v(t.values, "\u3001")}\u306E\u3044\u305A\u308C\u304B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        case "too_big": {
          let r = t.inclusive ? "\u4EE5\u4E0B\u3067\u3042\u308B" : "\u3088\u308A\u5C0F\u3055\u3044",
            a = n(t.origin);
          return a
            ? `\u5927\u304D\u3059\u304E\u308B\u5024: ${t.origin ?? "\u5024"}\u306F${t.maximum.toString()}${a.unit ?? "\u8981\u7D20"}${r}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`
            : `\u5927\u304D\u3059\u304E\u308B\u5024: ${t.origin ?? "\u5024"}\u306F${t.maximum.toString()}${r}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        }
        case "too_small": {
          let r = t.inclusive ? "\u4EE5\u4E0A\u3067\u3042\u308B" : "\u3088\u308A\u5927\u304D\u3044",
            a = n(t.origin);
          return a
            ? `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${t.origin}\u306F${t.minimum.toString()}${a.unit}${r}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`
            : `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${t.origin}\u306F${t.minimum.toString()}${r}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${r.prefix}"\u3067\u59CB\u307E\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`
            : r.format === "ends_with"
              ? `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${r.suffix}"\u3067\u7D42\u308F\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`
              : r.format === "includes"
                ? `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${r.includes}"\u3092\u542B\u3080\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`
                : r.format === "regex"
                  ? `\u7121\u52B9\u306A\u6587\u5B57\u5217: \u30D1\u30BF\u30FC\u30F3${r.pattern}\u306B\u4E00\u81F4\u3059\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`
                  : `\u7121\u52B9\u306A${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u7121\u52B9\u306A\u6570\u5024: ${t.divisor}\u306E\u500D\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        case "unrecognized_keys":
          return `\u8A8D\u8B58\u3055\u308C\u3066\u3044\u306A\u3044\u30AD\u30FC${t.keys.length > 1 ? "\u7FA4" : ""}: ${v(t.keys, "\u3001")}`;
        case "invalid_key":
          return `${t.origin}\u5185\u306E\u7121\u52B9\u306A\u30AD\u30FC`;
        case "invalid_union":
          return "\u7121\u52B9\u306A\u5165\u529B";
        case "invalid_element":
          return `${t.origin}\u5185\u306E\u7121\u52B9\u306A\u5024`;
        default:
          return "\u7121\u52B9\u306A\u5165\u529B";
      }
    };
  };
  function tm() {
    return { localeError: _$() };
  }
  var w$ = () => {
    let e = {
      string: {
        unit: "\u10E1\u10D8\u10DB\u10D1\u10DD\u10DA\u10DD",
        verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1",
      },
      file: {
        unit: "\u10D1\u10D0\u10D8\u10E2\u10D8",
        verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1",
      },
      array: {
        unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8",
        verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1",
      },
      set: {
        unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8",
        verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1",
      },
      map: {
        unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8",
        verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0",
        email:
          "\u10D4\u10DA-\u10E4\u10DD\u10E1\u10E2\u10D8\u10E1 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
        url: "URL",
        emoji: "\u10D4\u10DB\u10DD\u10EF\u10D8",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8-\u10D3\u10E0\u10DD",
        date: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8",
        time: "\u10D3\u10E0\u10DD",
        duration: "\u10EE\u10D0\u10DC\u10D2\u10E0\u10EB\u10DA\u10D8\u10D5\u10DD\u10D1\u10D0",
        ipv4: "IPv4 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
        ipv6: "IPv6 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
        mac: "MAC \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
        cidrv4: "IPv4 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8",
        cidrv6: "IPv6 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8",
        base64:
          "base64-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10D5\u10D4\u10DA\u10D8",
        base64url:
          "base64url-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10D5\u10D4\u10DA\u10D8",
        json_string: "JSON \u10D5\u10D4\u10DA\u10D8",
        e164: "E.164 \u10DC\u10DD\u10DB\u10D4\u10E0\u10D8",
        credit_card:
          "\u10E1\u10D0\u10D9\u10E0\u10D4\u10D3\u10D8\u10E2\u10DD \u10D1\u10D0\u10E0\u10D0\u10D7\u10D8\u10E1 \u10DC\u10DD\u10DB\u10D4\u10E0\u10D8",
        currency_code: "\u10D5\u10D0\u10DA\u10E3\u10E2\u10D8\u10E1 \u10D9\u10DD\u10D3\u10D8",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0",
      },
      o = {
        nan: "NaN",
        number: "\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8",
        string: "\u10D5\u10D4\u10DA\u10D8",
        boolean: "\u10D1\u10E3\u10DA\u10D4\u10D0\u10DC\u10D8",
        function: "\u10E4\u10E3\u10DC\u10E5\u10EA\u10D8\u10D0",
        array: "\u10DB\u10D0\u10E1\u10D8\u10D5\u10D8",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 instanceof ${t.expected}, \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8 ${s}`
            : `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${r}, \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${b(t.values[0])}`
            : `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D0\u10E0\u10D8\u10D0\u10DC\u10E2\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8\u10D0 \u10D4\u10E0\u10D7-\u10D4\u10E0\u10D7\u10D8 ${v(t.values, "|")}-\u10D3\u10D0\u10DC`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${t.origin ?? "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} ${a.verb} ${r}${t.maximum.toString()} ${a.unit}`
            : `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${t.origin ?? "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} \u10D8\u10E7\u10DD\u10E1 ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${t.origin} ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`
            : `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${t.origin} \u10D8\u10E7\u10DD\u10E1 ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D4\u10DA\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10EC\u10E7\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${r.prefix}"-\u10D8\u10D7`
            : r.format === "ends_with"
              ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D4\u10DA\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10DB\u10D7\u10D0\u10D5\u10E0\u10D3\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${r.suffix}"-\u10D8\u10D7`
              : r.format === "includes"
                ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D4\u10DA\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1 "${r.includes}"-\u10E1`
                : r.format === "regex"
                  ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D4\u10DA\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D4\u10E1\u10D0\u10D1\u10D0\u10DB\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 \u10E8\u10D0\u10D1\u10DA\u10DD\u10DC\u10E1 ${r.pattern}`
                  : `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E0\u10D8\u10EA\u10EE\u10D5\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10E7\u10DD\u10E1 ${t.divisor}-\u10D8\u10E1 \u10EF\u10D4\u10E0\u10D0\u10D3\u10D8`;
        case "unrecognized_keys":
          return `\u10E3\u10EA\u10DC\u10DD\u10D1\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1${t.keys.length > 1 ? "\u10D4\u10D1\u10D8" : "\u10D8"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1\u10D8 ${t.origin}-\u10E8\u10D8`;
        case "invalid_union":
          return "\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0";
        case "invalid_element":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0 ${t.origin}-\u10E8\u10D8`;
        default:
          return "\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0";
      }
    };
  };
  function nm() {
    return { localeError: w$() };
  }
  var x$ = () => {
    let e = {
      string: {
        unit: "\u178F\u17BD\u17A2\u1780\u17D2\u179F\u179A",
        verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793",
      },
      file: { unit: "\u1794\u17C3", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
      array: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
      set: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
      map: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex:
          "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B",
        email:
          "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793\u17A2\u17CA\u17B8\u1798\u17C2\u179B",
        url: "URL",
        emoji: "\u179F\u1789\u17D2\u1789\u17B6\u17A2\u17B6\u179A\u1798\u17D2\u1798\u178E\u17CD",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime:
          "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 \u1793\u17B7\u1784\u1798\u17C9\u17C4\u1784 ISO",
        date: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 ISO",
        time: "\u1798\u17C9\u17C4\u1784 ISO",
        duration: "\u179A\u1799\u17C8\u1796\u17C1\u179B ISO",
        ipv4: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4",
        ipv6: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6",
        mac: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 MAC",
        cidrv4: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4",
        cidrv6: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6",
        base64:
          "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64",
        base64url:
          "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64url",
        json_string: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A JSON",
        e164: "\u179B\u17C1\u1781 E.164",
        credit_card:
          "\u179B\u17C1\u1781\u1794\u17D0\u178E\u17D2\u178E\u17A5\u178E\u1791\u17B6\u1793",
        currency_code:
          "\u1780\u17BC\u178A\u179A\u17BC\u1794\u17B7\u1799\u1794\u17D0\u178E\u17D2\u178E",
        iban: "IBAN",
        jwt: "JWT",
        template_literal:
          "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B",
      },
      o = {
        nan: "NaN",
        number: "\u179B\u17C1\u1781",
        array: "\u17A2\u17B6\u179A\u17C1 (Array)",
        null: "\u1782\u17D2\u1798\u17B6\u1793\u178F\u1798\u17D2\u179B\u17C3 (null)",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A instanceof ${t.expected} \u1794\u17C9\u17BB\u1793\u17D2\u178F\u17C2\u1791\u1791\u17BD\u179B\u1794\u17B6\u1793 ${s}`
            : `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${r} \u1794\u17C9\u17BB\u1793\u17D2\u178F\u17C2\u1791\u1791\u17BD\u179B\u1794\u17B6\u1793 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${b(t.values[0])}`
            : `\u1787\u1798\u17D2\u179A\u17BE\u179F\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1787\u17B6\u1798\u17BD\u1799\u1780\u17D2\u1793\u17BB\u1784\u1785\u17C6\u178E\u17C4\u1798 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${t.origin ?? "\u178F\u1798\u17D2\u179B\u17C3"} ${r} ${t.maximum.toString()} ${a.unit ?? "\u1792\u17B6\u178F\u17BB"}`
            : `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${t.origin ?? "\u178F\u1798\u17D2\u179B\u17C3"} ${r} ${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${t.origin} ${r} ${t.minimum.toString()} ${a.unit}`
            : `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${t.origin} ${r} ${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1785\u17B6\u1794\u17CB\u1795\u17D2\u178F\u17BE\u1798\u178A\u17C4\u1799 "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1794\u1789\u17D2\u1785\u1794\u17CB\u178A\u17C4\u1799 "${r.suffix}"`
              : r.format === "includes"
                ? `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1798\u17B6\u1793 "${r.includes}"`
                : r.format === "regex"
                  ? `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1795\u17D2\u1782\u17BC\u1795\u17D2\u1782\u1784\u1793\u17B9\u1784\u1791\u1798\u17D2\u179A\u1784\u17CB\u178A\u17C2\u179B\u1794\u17B6\u1793\u1780\u17C6\u178E\u178F\u17CB ${r.pattern}`
                  : `\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u179B\u17C1\u1781\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1787\u17B6\u1796\u17A0\u17BB\u1782\u17BB\u178E\u1793\u17C3 ${t.divisor}`;
        case "unrecognized_keys":
          return `\u179A\u1780\u1783\u17BE\u1789\u179F\u17C4\u1798\u17B7\u1793\u179F\u17D2\u1782\u17B6\u179B\u17CB\u17D6 ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u179F\u17C4\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${t.origin}`;
        case "invalid_union":
          return "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C";
        case "invalid_element":
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${t.origin}`;
        default:
          return "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C";
      }
    };
  };
  function Vi() {
    return { localeError: x$() };
  }
  function rm() {
    return Vi();
  }
  var k$ = () => {
    let e = {
      string: {
        unit: "\u0C85\u0C95\u0CCD\u0CB7\u0CB0\u0C97\u0CB3\u0CC1",
        verb: "\u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1",
      },
      file: {
        unit: "\u0CAC\u0CC8\u0C9F\u0CCD\u200C\u0C97\u0CB3\u0CC1",
        verb: "\u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1",
      },
      array: {
        unit: "\u0CB5\u0CB8\u0CCD\u0CA4\u0CC1\u0C97\u0CB3\u0CC1",
        verb: "\u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1",
      },
      set: {
        unit: "\u0CB5\u0CB8\u0CCD\u0CA4\u0CC1\u0C97\u0CB3\u0CC1",
        verb: "\u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1",
      },
      map: { unit: "entries", verb: "\u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0C87\u0CA8\u0CCD\u0CAA\u0CC1\u0C9F\u0CCD",
        email: "email \u0CB5\u0CBF\u0CB3\u0CBE\u0CB8",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0CA6\u0CBF\u0CA8\u0CBE\u0C82\u0C95\u0CA6 \u0CB8\u0CAE\u0CAF",
        date: "ISO \u0CA6\u0CBF\u0CA8\u0CBE\u0C82\u0C95",
        time: "ISO \u0CB8\u0CAE\u0CAF",
        duration: "ISO \u0C85\u0CB5\u0CA7\u0CBF",
        ipv4: "IPv4 \u0CB5\u0CBF\u0CB3\u0CBE\u0CB8",
        ipv6: "IPv6 \u0CB5\u0CBF\u0CB3\u0CBE\u0CB8",
        mac: "MAC \u0CB5\u0CBF\u0CB3\u0CBE\u0CB8",
        cidrv4: "IPv4 \u0CB5\u0CCD\u0CAF\u0CBE\u0CAA\u0CCD\u0CA4\u0CBF\u0CAF",
        cidrv6: "IPv6 \u0CB5\u0CCD\u0CAF\u0CBE\u0CAA\u0CCD\u0CA4\u0CBF\u0CAF",
        base64: "base64-encoded\u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD",
        base64url: "base64url-encoded\u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD",
        json_string: "JSON\u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD",
        e164: "E.164 \u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6",
        credit_card:
          "\u0C95\u0CCD\u0CB0\u0CC6\u0CA1\u0CBF\u0C9F\u0CCD \u0C95\u0CBE\u0CB0\u0CCD\u0CA1\u0CCD \u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6",
        currency_code: "\u0C95\u0CB0\u0CC6\u0CA8\u0CCD\u0CB8\u0CBF \u0C95\u0CCB\u0CA1\u0CCD",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0C87\u0CA8\u0CCD\u0CAA\u0CC1\u0C9F\u0CCD",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C87\u0CA8\u0CCD\u200C\u0CAA\u0CC1\u0C9F\u0CCD: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${r}, \u0CB8\u0CCD\u0CB5\u0CC0\u0C95\u0CB0\u0CBF\u0CB8\u0CBF\u0CA6\u0CA8\u0CC1 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C87\u0CA8\u0CCD\u200C\u0CAA\u0CC1\u0C9F\u0CCD: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${b(t.values[0])}`
            : `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C86\u0CAF\u0CCD\u0C95\u0CC6: \u0C87\u0CB5\u0CC1\u0C97\u0CB3\u0CB2\u0CCD\u0CB2\u0CBF \u0C92\u0C82\u0CA6\u0CA8\u0CCD\u0CA8\u0CC1 \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u0CA4\u0CC1\u0C82\u0CAC\u0CBE \u0CA6\u0CCA\u0CA1\u0CCD\u0CA1\u0CA6\u0CC1: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${t.origin ?? "value"} \u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1 ${r}${t.maximum.toString()} ${a.unit ?? "\u0C85\u0C82\u0CB6\u0C97\u0CB3\u0CC1"}`
            : `\u0CA4\u0CC1\u0C82\u0CAC\u0CBE \u0CA6\u0CCA\u0CA1\u0CCD\u0CA1\u0CA6\u0CC1: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${t.origin ?? "value"} \u0C8E\u0C82\u0CA6\u0CC1 ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0CA4\u0CC1\u0C82\u0CAC\u0CBE \u0C9A\u0CBF\u0C95\u0CCD\u0C95\u0CA6\u0CC1: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${t.origin} \u0CB9\u0CCA\u0C82\u0CA6\u0CB2\u0CC1 ${r}${t.minimum.toString()} ${a.unit}`
            : `\u0CA4\u0CC1\u0C82\u0CAC\u0CBE \u0C9A\u0CBF\u0C95\u0CCD\u0C95\u0CA6\u0CC1: \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${t.origin} \u0C8E\u0C82\u0CA6\u0CC1 ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF\u0CB5\u0CBE\u0CA6 \u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD: \u0C87\u0CA6\u0CB0\u0CCA\u0C82\u0CA6\u0CBF\u0C97\u0CC6 \u0CAA\u0CCD\u0CB0\u0CBE\u0CB0\u0C82\u0CAD\u0CBF\u0CB8\u0CAC\u0CC7\u0C95\u0CC1 "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF\u0CB5\u0CBE\u0CA6 \u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD: \u0C87\u0CA6\u0CB0\u0CCA\u0C82\u0CA6\u0CBF\u0C97\u0CC6 \u0C95\u0CCA\u0CA8\u0CC6\u0C97\u0CCA\u0CB3\u0CCD\u0CB3\u0CAC\u0CC7\u0C95\u0CC1 "${r.suffix}"`
              : r.format === "includes"
                ? `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD: \u0C92\u0CB3\u0C97\u0CCA\u0C82\u0CA1\u0CBF\u0CB0\u0CAC\u0CC7\u0C95\u0CC1 "${r.includes}"`
                : r.format === "regex"
                  ? `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF\u0CB5\u0CBE\u0CA6 \u0CB8\u0CCD\u0C9F\u0CCD\u0CB0\u0CBF\u0C82\u0C97\u0CCD: \u0CAE\u0CBE\u0CA6\u0CB0\u0CBF\u0C97\u0CC6 \u0CB9\u0CCA\u0C82\u0CA6\u0CBF\u0C95\u0CC6\u0CAF\u0CBE\u0C97\u0CAC\u0CC7\u0C95\u0CC1 ${r.pattern}`
                  : `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6: \u0CAC\u0CB9\u0CC1\u0CB8\u0C82\u0C96\u0CCD\u0CAF\u0CC6\u0CAF\u0CBE\u0C97\u0CBF\u0CB0\u0CAC\u0CC7\u0C95\u0CC1 ${t.divisor}`;
        case "unrecognized_keys":
          return `\u0C97\u0CC1\u0CB0\u0CC1\u0CA4\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CA6 \u0C95\u0CC0 ${t.keys.length > 1 ? "s" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF\u0CB5\u0CBE\u0CA6 \u0C95\u0CC0 \u0C87\u0CA8\u0CCD ${t.origin}`;
        case "invalid_union":
          return t.options && Array.isArray(t.options) && t.options.length > 0
            ? `\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0CA4\u0CBE\u0CB0\u0CA4\u0CAE\u0CCD\u0CAF \u0CAE\u0CCC\u0CB2\u0CCD\u0CAF. \u0CA8\u0CBF\u0CB0\u0CC0\u0C95\u0CCD\u0CB7\u0CBF\u0CB8\u0CB2\u0CBE\u0C97\u0CBF\u0CA6\u0CC6 ${t.options.map((a) => `'${a}'`).join(" | ")}`
            : "\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C87\u0CA8\u0CCD\u200C\u0CAA\u0CC1\u0C9F\u0CCD";
        case "invalid_element":
          return `\u0CB0\u0CB2\u0CCD\u0CB2\u0CBF \u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0CAE\u0CCC\u0CB2\u0CCD\u0CAF ${t.origin}`;
        default:
          return "\u0C85\u0CAE\u0CBE\u0CA8\u0CCD\u0CAF \u0C87\u0CA8\u0CCD\u200C\u0CAA\u0CC1\u0C9F\u0CCD";
      }
    };
  };
  function im() {
    return { localeError: k$() };
  }
  var I$ = () => {
    let e = {
      string: { unit: "\uBB38\uC790", verb: "to have" },
      file: { unit: "\uBC14\uC774\uD2B8", verb: "to have" },
      array: { unit: "\uAC1C", verb: "to have" },
      set: { unit: "\uAC1C", verb: "to have" },
      map: { unit: "\uAC1C", verb: "to have" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\uC785\uB825",
        email: "\uC774\uBA54\uC77C \uC8FC\uC18C",
        url: "URL",
        emoji: "\uC774\uBAA8\uC9C0",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \uB0A0\uC9DC\uC2DC\uAC04",
        date: "ISO \uB0A0\uC9DC",
        time: "ISO \uC2DC\uAC04",
        duration: "ISO \uAE30\uAC04",
        ipv4: "IPv4 \uC8FC\uC18C",
        ipv6: "IPv6 \uC8FC\uC18C",
        mac: "MAC \uC8FC\uC18C",
        cidrv4: "IPv4 \uBC94\uC704",
        cidrv6: "IPv6 \uBC94\uC704",
        base64: "base64 \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
        base64url: "base64url \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
        json_string: "JSON \uBB38\uC790\uC5F4",
        e164: "E.164 \uBC88\uD638",
        credit_card: "\uC2E0\uC6A9\uCE74\uB4DC \uBC88\uD638",
        currency_code: "\uD1B5\uD654 \uCF54\uB4DC",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\uC785\uB825",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 instanceof ${t.expected}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${s}\uC785\uB2C8\uB2E4`
            : `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 ${r}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${s}\uC785\uB2C8\uB2E4`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\uC798\uBABB\uB41C \uC785\uB825: \uAC12\uC740 ${b(t.values[0])} \uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`
            : `\uC798\uBABB\uB41C \uC635\uC158: ${v(t.values, "\uB610\uB294 ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
        case "too_big": {
          let r = t.inclusive ? "\uC774\uD558" : "\uBBF8\uB9CC",
            a =
              r === "\uBBF8\uB9CC"
                ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4"
                : "\uC5EC\uC57C \uD569\uB2C8\uB2E4",
            s = n(t.origin),
            u = s?.unit ?? "\uC694\uC18C";
          return s
            ? `${t.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${t.maximum.toString()}${u} ${r}${a}`
            : `${t.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${t.maximum.toString()} ${r}${a}`;
        }
        case "too_small": {
          let r = t.inclusive ? "\uC774\uC0C1" : "\uCD08\uACFC",
            a =
              r === "\uC774\uC0C1"
                ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4"
                : "\uC5EC\uC57C \uD569\uB2C8\uB2E4",
            s = n(t.origin),
            u = s?.unit ?? "\uC694\uC18C";
          return s
            ? `${t.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${t.minimum.toString()}${u} ${r}${a}`
            : `${t.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${t.minimum.toString()} ${r}${a}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${r.prefix}"(\uC73C)\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4`
            : r.format === "ends_with"
              ? `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${r.suffix}"(\uC73C)\uB85C \uB05D\uB098\uC57C \uD569\uB2C8\uB2E4`
              : r.format === "includes"
                ? `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${r.includes}"\uC744(\uB97C) \uD3EC\uD568\uD574\uC57C \uD569\uB2C8\uB2E4`
                : r.format === "regex"
                  ? `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: \uC815\uADDC\uC2DD ${r.pattern} \uD328\uD134\uACFC \uC77C\uCE58\uD574\uC57C \uD569\uB2C8\uB2E4`
                  : `\uC798\uBABB\uB41C ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\uC798\uBABB\uB41C \uC22B\uC790: ${t.divisor}\uC758 \uBC30\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
        case "unrecognized_keys":
          return `\uC778\uC2DD\uD560 \uC218 \uC5C6\uB294 \uD0A4: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\uC798\uBABB\uB41C \uD0A4: ${t.origin}`;
        case "invalid_union":
          return "\uC798\uBABB\uB41C \uC785\uB825";
        case "invalid_element":
          return `\uC798\uBABB\uB41C \uAC12: ${t.origin}`;
        default:
          return "\uC798\uBABB\uB41C \uC785\uB825";
      }
    };
  };
  function om() {
    return { localeError: I$() };
  }
  var yr = (e) => e.charAt(0).toUpperCase() + e.slice(1);
  function am(e) {
    let n = Math.abs(e),
      i = n % 10,
      o = n % 100;
    return (o >= 11 && o <= 19) || i === 0 ? "many" : i === 1 ? "one" : "few";
  }
  var S$ = () => {
    let e = {
      string: {
        unit: { one: "simbolis", few: "simboliai", many: "simboli\u0173" },
        verb: {
          smaller: {
            inclusive: "turi b\u016Bti ne ilgesn\u0117 kaip",
            notInclusive: "turi b\u016Bti trumpesn\u0117 kaip",
          },
          bigger: {
            inclusive: "turi b\u016Bti ne trumpesn\u0117 kaip",
            notInclusive: "turi b\u016Bti ilgesn\u0117 kaip",
          },
        },
      },
      file: {
        unit: { one: "baitas", few: "baitai", many: "bait\u0173" },
        verb: {
          smaller: {
            inclusive: "turi b\u016Bti ne didesnis kaip",
            notInclusive: "turi b\u016Bti ma\u017Eesnis kaip",
          },
          bigger: {
            inclusive: "turi b\u016Bti ne ma\u017Eesnis kaip",
            notInclusive: "turi b\u016Bti didesnis kaip",
          },
        },
      },
      array: {
        unit: { one: "element\u0105", few: "elementus", many: "element\u0173" },
        verb: {
          smaller: {
            inclusive: "turi tur\u0117ti ne daugiau kaip",
            notInclusive: "turi tur\u0117ti ma\u017Eiau kaip",
          },
          bigger: {
            inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
            notInclusive: "turi tur\u0117ti daugiau kaip",
          },
        },
      },
      set: {
        unit: { one: "element\u0105", few: "elementus", many: "element\u0173" },
        verb: {
          smaller: {
            inclusive: "turi tur\u0117ti ne daugiau kaip",
            notInclusive: "turi tur\u0117ti ma\u017Eiau kaip",
          },
          bigger: {
            inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
            notInclusive: "turi tur\u0117ti daugiau kaip",
          },
        },
      },
    };
    function n(t, r, a, s) {
      let u = e[t] ?? null;
      return u === null
        ? u
        : { unit: u.unit[r], verb: u.verb[s][a ? "inclusive" : "notInclusive"] };
    }
    let i = {
        regex: "\u012Fvestis",
        email: "el. pa\u0161to adresas",
        url: "URL",
        emoji: "jaustukas",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO data ir laikas",
        date: "ISO data",
        time: "ISO laikas",
        duration: "ISO trukm\u0117",
        ipv4: "IPv4 adresas",
        ipv6: "IPv6 adresas",
        mac: "MAC adresas",
        cidrv4: "IPv4 tinklo prefiksas (CIDR)",
        cidrv6: "IPv6 tinklo prefiksas (CIDR)",
        base64: "base64 u\u017Ekoduota eilut\u0117",
        base64url: "base64url u\u017Ekoduota eilut\u0117",
        json_string: "JSON eilut\u0117",
        e164: "E.164 numeris",
        credit_card: "kredito kortel\u0117s numeris",
        currency_code: "valiutos kodas",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u012Fvestis",
      },
      o = {
        nan: "NaN",
        number: "skai\u010Dius",
        bigint: "sveikasis skai\u010Dius",
        string: "eilut\u0117",
        boolean: "login\u0117 reik\u0161m\u0117",
        undefined: "neapibr\u0117\u017Eta reik\u0161m\u0117",
        function: "funkcija",
        symbol: "simbolis",
        array: "masyvas",
        object: "objektas",
        null: "nulin\u0117 reik\u0161m\u0117",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Gautas tipas ${s}, o tik\u0117tasi - instanceof ${t.expected}`
            : `Gautas tipas ${s}, o tik\u0117tasi - ${r}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Privalo b\u016Bti ${b(t.values[0])}`
            : `Privalo b\u016Bti vienas i\u0161 ${v(t.values, "|")} pasirinkim\u0173`;
        case "too_big": {
          let r = o[t.origin] ?? t.origin,
            a = n(t.origin, am(Number(t.maximum)), t.inclusive ?? !1, "smaller");
          if (a?.verb)
            return `${yr(r ?? t.origin ?? "reik\u0161m\u0117")} ${a.verb} ${t.maximum.toString()} ${a.unit ?? "element\u0173"}`;
          let s = t.inclusive ? "ne didesnis kaip" : "ma\u017Eesnis kaip";
          return `${yr(r ?? t.origin ?? "reik\u0161m\u0117")} turi b\u016Bti ${s} ${t.maximum.toString()} ${a?.unit}`;
        }
        case "too_small": {
          let r = o[t.origin] ?? t.origin,
            a = n(t.origin, am(Number(t.minimum)), t.inclusive ?? !1, "bigger");
          if (a?.verb)
            return `${yr(r ?? t.origin ?? "reik\u0161m\u0117")} ${a.verb} ${t.minimum.toString()} ${a.unit ?? "element\u0173"}`;
          let s = t.inclusive ? "ne ma\u017Eesnis kaip" : "didesnis kaip";
          return `${yr(r ?? t.origin ?? "reik\u0161m\u0117")} turi b\u016Bti ${s} ${t.minimum.toString()} ${a?.unit}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Eilut\u0117 privalo prasid\u0117ti "${r.prefix}"`
            : r.format === "ends_with"
              ? `Eilut\u0117 privalo pasibaigti "${r.suffix}"`
              : r.format === "includes"
                ? `Eilut\u0117 privalo \u012Ftraukti "${r.includes}"`
                : r.format === "regex"
                  ? `Eilut\u0117 privalo atitikti ${r.pattern}`
                  : `Neteisingas ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Skai\u010Dius privalo b\u016Bti ${t.divisor} kartotinis.`;
        case "unrecognized_keys":
          return `Neatpa\u017Eint${t.keys.length > 1 ? "i" : "as"} rakt${t.keys.length > 1 ? "ai" : "as"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return "Rastas klaidingas raktas";
        case "invalid_union":
          return "Klaidinga \u012Fvestis";
        case "invalid_element": {
          let r = o[t.origin] ?? t.origin;
          return `${yr(r ?? t.origin ?? "reik\u0161m\u0117")} turi klaiding\u0105 \u012Fvest\u012F`;
        }
        default:
          return "Klaidinga \u012Fvestis";
      }
    };
  };
  function sm() {
    return { localeError: S$() };
  }
  var z$ = () => {
    let e = {
      string: {
        unit: "\u0437\u043D\u0430\u0446\u0438",
        verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442",
      },
      file: {
        unit: "\u0431\u0430\u0458\u0442\u0438",
        verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442",
      },
      array: {
        unit: "\u0441\u0442\u0430\u0432\u043A\u0438",
        verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442",
      },
      set: {
        unit: "\u0441\u0442\u0430\u0432\u043A\u0438",
        verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442",
      },
      map: {
        unit: "\u0441\u0442\u0430\u0432\u043A\u0438",
        verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0432\u043D\u0435\u0441",
        email:
          "\u0430\u0434\u0440\u0435\u0441\u0430 \u043D\u0430 \u0435-\u043F\u043E\u0448\u0442\u0430",
        url: "URL",
        emoji: "\u0435\u043C\u043E\u045F\u0438",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0434\u0430\u0442\u0443\u043C \u0438 \u0432\u0440\u0435\u043C\u0435",
        date: "ISO \u0434\u0430\u0442\u0443\u043C",
        time: "ISO \u0432\u0440\u0435\u043C\u0435",
        duration: "ISO \u0432\u0440\u0435\u043C\u0435\u0442\u0440\u0430\u0435\u045A\u0435",
        ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441\u0430",
        ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441\u0430",
        mac: "MAC \u0430\u0434\u0440\u0435\u0441\u0430",
        cidrv4: "IPv4 \u043E\u043F\u0441\u0435\u0433",
        cidrv6: "IPv6 \u043E\u043F\u0441\u0435\u0433",
        base64:
          "base64-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430",
        base64url:
          "base64url-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430",
        json_string: "JSON \u043D\u0438\u0437\u0430",
        e164: "E.164 \u0431\u0440\u043E\u0458",
        credit_card:
          "\u0431\u0440\u043E\u0458 \u043D\u0430 \u043A\u0440\u0435\u0434\u0438\u0442\u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u0447\u043A\u0430",
        currency_code: "\u043A\u043E\u0434 \u043D\u0430 \u0432\u0430\u043B\u0443\u0442\u0430",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0432\u043D\u0435\u0441",
      },
      o = { nan: "NaN", number: "\u0431\u0440\u043E\u0458", array: "\u043D\u0438\u0437\u0430" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 instanceof ${t.expected}, \u043F\u0440\u0438\u043C\u0435\u043D\u043E ${s}`
            : `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${r}, \u043F\u0440\u0438\u043C\u0435\u043D\u043E ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Invalid input: expected ${b(t.values[0])}`
            : `\u0413\u0440\u0435\u0448\u0430\u043D\u0430 \u043E\u043F\u0446\u0438\u0458\u0430: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 \u0435\u0434\u043D\u0430 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${t.origin ?? "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0438\u043C\u0430 ${r}${t.maximum.toString()} ${a.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438"}`
            : `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${t.origin ?? "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0431\u0438\u0434\u0435 ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${t.origin} \u0434\u0430 \u0438\u043C\u0430 ${r}${t.minimum.toString()} ${a.unit}`
            : `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${t.origin} \u0434\u0430 \u0431\u0438\u0434\u0435 ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u043D\u0443\u0432\u0430 \u0441\u043E "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u0432\u0440\u0448\u0443\u0432\u0430 \u0441\u043E "${r.suffix}"`
              : r.format === "includes"
                ? `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0432\u043A\u043B\u0443\u0447\u0443\u0432\u0430 "${r.includes}"`
                : r.format === "regex"
                  ? `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u043E\u0434\u0433\u043E\u0430\u0440\u0430 \u043D\u0430 \u043F\u0430\u0442\u0435\u0440\u043D\u043E\u0442 ${r.pattern}`
                  : `Invalid ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u0431\u0440\u043E\u0458: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0431\u0438\u0434\u0435 \u0434\u0435\u043B\u0438\u0432 \u0441\u043E ${t.divisor}`;
        case "unrecognized_keys":
          return `${t.keys.length > 1 ? "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D\u0438 \u043A\u043B\u0443\u0447\u0435\u0432\u0438" : "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D \u043A\u043B\u0443\u0447"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u043A\u043B\u0443\u0447 \u0432\u043E ${t.origin}`;
        case "invalid_union":
          return "\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441";
        case "invalid_element":
          return `\u0413\u0440\u0435\u0448\u043D\u0430 \u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442 \u0432\u043E ${t.origin}`;
        default:
          return "\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441";
      }
    };
  };
  function cm() {
    return { localeError: z$() };
  }
  var N$ = () => {
    let e = {
      string: { unit: "aksara", verb: "mempunyai" },
      file: { unit: "bait", verb: "mempunyai" },
      array: { unit: "elemen", verb: "mempunyai" },
      set: { unit: "elemen", verb: "mempunyai" },
      map: { unit: "elemen", verb: "mempunyai" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "input",
        email: "alamat e-mel",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "tarikh masa ISO",
        date: "tarikh ISO",
        time: "masa ISO",
        duration: "tempoh ISO",
        ipv4: "alamat IPv4",
        ipv6: "alamat IPv6",
        mac: "alamat MAC",
        cidrv4: "julat IPv4",
        cidrv6: "julat IPv6",
        base64: "string dikodkan base64",
        base64url: "string dikodkan base64url",
        json_string: "string JSON",
        e164: "nombor E.164",
        credit_card: "nombor kad kredit",
        currency_code: "kod mata wang",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "input",
      },
      o = { nan: "NaN", number: "nombor" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Input tidak sah: dijangka instanceof ${t.expected}, diterima ${s}`
            : `Input tidak sah: dijangka ${r}, diterima ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Input tidak sah: dijangka ${b(t.values[0])}`
            : `Pilihan tidak sah: dijangka salah satu daripada ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Terlalu besar: dijangka ${t.origin ?? "nilai"} ${a.verb} ${r}${t.maximum.toString()} ${a.unit ?? "elemen"}`
            : `Terlalu besar: dijangka ${t.origin ?? "nilai"} adalah ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Terlalu kecil: dijangka ${t.origin} ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`
            : `Terlalu kecil: dijangka ${t.origin} adalah ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `String tidak sah: mesti bermula dengan "${r.prefix}"`
            : r.format === "ends_with"
              ? `String tidak sah: mesti berakhir dengan "${r.suffix}"`
              : r.format === "includes"
                ? `String tidak sah: mesti mengandungi "${r.includes}"`
                : r.format === "regex"
                  ? `String tidak sah: mesti sepadan dengan corak ${r.pattern}`
                  : `${i[r.format] ?? t.format} tidak sah`;
        }
        case "not_multiple_of":
          return `Nombor tidak sah: perlu gandaan ${t.divisor}`;
        case "unrecognized_keys":
          return `Kunci tidak dikenali: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Kunci tidak sah dalam ${t.origin}`;
        case "invalid_union":
          return "Input tidak sah";
        case "invalid_element":
          return `Nilai tidak sah dalam ${t.origin}`;
        default:
          return "Input tidak sah";
      }
    };
  };
  function um() {
    return { localeError: N$() };
  }
  var P$ = () => {
    let e = {
      string: {
        unit: "\u0905\u0915\u094D\u0937\u0930",
        verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
      },
      file: {
        unit: "\u092C\u093E\u0907\u091F",
        verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
      },
      array: {
        unit: "\u0924\u0924\u094D\u0935",
        verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
      },
      set: {
        unit: "\u0924\u0924\u094D\u0935",
        verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
      },
      map: {
        unit: "\u092A\u094D\u0930\u0935\u093F\u0937\u094D\u091F\u093F",
        verb: "\u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0907\u0928\u092A\u0941\u091F",
        email: "\u0907\u092E\u0947\u0932 \u0920\u0947\u0917\u093E\u0928\u093E",
        url: "URL",
        emoji: "\u0907\u092E\u094B\u091C\u0940",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u092E\u093F\u0924\u093F \u0930 \u0938\u092E\u092F",
        date: "ISO \u092E\u093F\u0924\u093F",
        time: "ISO \u0938\u092E\u092F",
        duration: "ISO \u0905\u0935\u0927\u093F",
        ipv4: "IPv4 \u0920\u0947\u0917\u093E\u0928\u093E",
        ipv6: "IPv6 \u0920\u0947\u0917\u093E\u0928\u093E",
        mac: "MAC \u0920\u0947\u0917\u093E\u0928\u093E",
        cidrv4: "IPv4 \u0926\u093E\u092F\u0930\u093E",
        cidrv6: "IPv6 \u0926\u093E\u092F\u0930\u093E",
        base64:
          "base64-\u0907\u0928\u094D\u0915\u094B\u0921 \u0917\u0930\u093F\u090F\u0915\u094B \u0938\u094D\u091F\u094D\u0930\u093F\u0919",
        base64url:
          "base64url-\u0907\u0928\u094D\u0915\u094B\u0921 \u0917\u0930\u093F\u090F\u0915\u094B \u0938\u094D\u091F\u094D\u0930\u093F\u0919",
        json_string: "JSON \u0938\u094D\u091F\u094D\u0930\u093F\u0919",
        e164: "E.164 \u0928\u092E\u094D\u092C\u0930",
        credit_card:
          "\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u093E\u0930\u094D\u0921 \u0928\u092E\u094D\u092C\u0930",
        currency_code: "\u092E\u0941\u0926\u094D\u0930\u093E \u0915\u094B\u0921",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0907\u0928\u092A\u0941\u091F",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${r}, \u092A\u094D\u0930\u093E\u092A\u094D\u0924 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${b(t.values[0])}`
            : `\u0905\u092E\u093E\u0928\u094D\u092F \u0935\u093F\u0915\u0932\u094D\u092A: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u092E\u093E\u0928\u0939\u0930\u0942 \u092E\u0927\u094D\u092F\u0947 \u090F\u0915 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u0927\u0947\u0930\u0948 \u0920\u0942\u0932\u094B: ${t.origin ?? "\u092E\u093E\u0928"} \u092E\u093E ${r}${t.maximum.toString()} ${a.unit} ${a.verb}`
            : `\u0927\u0947\u0930\u0948 \u0920\u0942\u0932\u094B: ${t.origin ?? "\u092E\u093E\u0928"} ${r}${t.maximum.toString()} \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0927\u0947\u0930\u0948 \u0938\u093E\u0928\u094B: ${t.origin} \u092E\u093E ${r}${t.minimum.toString()} ${a.unit} ${a.verb}`
            : `\u0927\u0947\u0930\u0948 \u0938\u093E\u0928\u094B: ${t.origin} ${r}${t.minimum.toString()} \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: "${r.prefix}" \u092C\u093E\u091F \u0938\u0941\u0930\u0941 \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`
            : r.format === "ends_with"
              ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: "${r.suffix}" \u092E\u093E \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`
              : r.format === "includes"
                ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: "${r.includes}" \u0938\u092E\u093E\u0935\u0947\u0936 \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`
                : r.format === "regex"
                  ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u094D\u091F\u094D\u0930\u093F\u0919: \u0922\u093E\u0901\u091A\u093E ${r.pattern} \u0938\u0901\u0917 \u092E\u0947\u0932 \u0916\u093E\u0928\u0941\u092A\u0930\u094D\u091B`
                  : `\u0905\u092E\u093E\u0928\u094D\u092F ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u0902\u0916\u094D\u092F\u093E: ${t.divisor} \u0915\u094B \u0917\u0941\u0923\u091C \u0939\u0941\u0928\u0941\u092A\u0930\u094D\u091B`;
        case "unrecognized_keys":
          return `\u0905\u092A\u0930\u093F\u091A\u093F\u0924 \u0915\u0941\u091E\u094D\u091C\u0940${t.keys.length > 1 ? "\u0939\u0930\u0942" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u0915\u0941\u091E\u094D\u091C\u0940: ${t.origin} \u092E\u093E`;
        case "invalid_union":
          return t.options && Array.isArray(t.options) && t.options.length > 0
            ? `\u0905\u092E\u093E\u0928\u094D\u092F \u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092E\u093F\u0928\u0947\u091F\u0930 \u092E\u093E\u0928: \u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 ${t.options.map((a) => `'${a}'`).join(" | ")}`
            : "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
        case "invalid_element":
          return `\u0905\u092E\u093E\u0928\u094D\u092F \u092E\u093E\u0928: ${t.origin} \u092E\u093E`;
        default:
          return "\u0905\u092E\u093E\u0928\u094D\u092F \u0907\u0928\u092A\u0941\u091F";
      }
    };
  };
  function lm() {
    return { localeError: P$() };
  }
  var O$ = () => {
    let e = {
      string: { unit: "tekens", verb: "heeft" },
      file: { unit: "bytes", verb: "heeft" },
      array: { unit: "elementen", verb: "heeft" },
      set: { unit: "elementen", verb: "heeft" },
      map: { unit: "elementen", verb: "heeft" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "invoer",
        email: "emailadres",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datum en tijd",
        date: "ISO datum",
        time: "ISO tijd",
        duration: "ISO duur",
        ipv4: "IPv4-adres",
        ipv6: "IPv6-adres",
        mac: "MAC-adres",
        cidrv4: "IPv4-bereik",
        cidrv6: "IPv6-bereik",
        base64: "base64-gecodeerde tekst",
        base64url: "base64 URL-gecodeerde tekst",
        json_string: "JSON string",
        e164: "E.164-nummer",
        credit_card: "creditcardnummer",
        currency_code: "valutacode",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "invoer",
      },
      o = { nan: "NaN", number: "getal" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Ongeldige invoer: verwacht instanceof ${t.expected}, ontving ${s}`
            : `Ongeldige invoer: verwacht ${r}, ontving ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Ongeldige invoer: verwacht ${b(t.values[0])}`
            : `Ongeldige optie: verwacht \xE9\xE9n van ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin),
            s = t.origin === "date" ? "laat" : t.origin === "string" ? "lang" : "groot";
          return a
            ? `Te ${s}: verwacht dat ${t.origin ?? "waarde"} ${r}${t.maximum.toString()} ${a.unit ?? "elementen"} ${a.verb}`
            : `Te ${s}: verwacht dat ${t.origin ?? "waarde"} ${r}${t.maximum.toString()} is`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin),
            s = t.origin === "date" ? "vroeg" : t.origin === "string" ? "kort" : "klein";
          return a
            ? `Te ${s}: verwacht dat ${t.origin} ${r}${t.minimum.toString()} ${a.unit} ${a.verb}`
            : `Te ${s}: verwacht dat ${t.origin} ${r}${t.minimum.toString()} is`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Ongeldige tekst: moet met "${r.prefix}" beginnen`
            : r.format === "ends_with"
              ? `Ongeldige tekst: moet op "${r.suffix}" eindigen`
              : r.format === "includes"
                ? `Ongeldige tekst: moet "${r.includes}" bevatten`
                : r.format === "regex"
                  ? `Ongeldige tekst: moet overeenkomen met patroon ${r.pattern}`
                  : `Ongeldig: ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Ongeldig getal: moet een veelvoud van ${t.divisor} zijn`;
        case "unrecognized_keys":
          return `Onbekende key${t.keys.length > 1 ? "s" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Ongeldige key in ${t.origin}`;
        case "invalid_union":
          return "Ongeldige invoer";
        case "invalid_element":
          return `Ongeldige waarde in ${t.origin}`;
        default:
          return "Ongeldige invoer";
      }
    };
  };
  function dm() {
    return { localeError: O$() };
  }
  var T$ = () => {
    let e = {
      string: { unit: "teikn", verb: "\xE5 ha" },
      file: { unit: "bytes", verb: "\xE5 ha" },
      array: { unit: "element", verb: "\xE5 innehalde" },
      set: { unit: "element", verb: "\xE5 innehalde" },
      map: { unit: "element", verb: "\xE5 innehalde" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "input",
        email: "e-postadresse",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO dato- og klokkeslett",
        date: "ISO-dato",
        time: "ISO-klokkeslett",
        duration: "ISO-varigheit",
        ipv4: "IPv4-adresse",
        ipv6: "IPv6-adresse",
        mac: "MAC-adresse",
        cidrv4: "IPv4-spekter",
        cidrv6: "IPv6-spekter",
        base64: "base64-enkoda streng",
        base64url: "base64url-enkoda streng",
        json_string: "JSON-streng",
        e164: "E.164-nummer",
        credit_card: "kredittkortnummer",
        currency_code: "valutakode",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "input",
      },
      o = { nan: "NaN", number: "tal", array: "liste" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Ugyldig input: forventa instanceof ${t.expected}, fekk ${s}`
            : `Ugyldig input: forventa ${r}, fekk ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Ugyldig verdi: forventa ${b(t.values[0])}`
            : `Ugyldig val: forventa eitt av ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `For stor(t): forventa ${t.origin ?? "value"} til \xE5 ha ${r}${t.maximum.toString()} ${a.unit ?? "element"}`
            : `For stor(t): forventa ${t.origin ?? "value"} til \xE5 ha ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `For lite(n): forventa ${t.origin} til \xE5 ha ${r}${t.minimum.toString()} ${a.unit}`
            : `For lite(n): forventa ${t.origin} til \xE5 ha ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Ugyldig streng: m\xE5 starte med "${r.prefix}"`
            : r.format === "ends_with"
              ? `Ugyldig streng: m\xE5 slutte med "${r.suffix}"`
              : r.format === "includes"
                ? `Ugyldig streng: m\xE5 innehalde "${r.includes}"`
                : r.format === "regex"
                  ? `Ugyldig streng: m\xE5 matche m\xF8nsteret ${r.pattern}`
                  : `Ugyldig ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Ugyldig tal: m\xE5 vere eit multiplum av ${t.divisor}`;
        case "unrecognized_keys":
          return `${t.keys.length > 1 ? "Ukjende n\xF8klar" : "Ukjend n\xF8kkel"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8kkel i ${t.origin}`;
        case "invalid_union":
          return "Ugyldig input";
        case "invalid_element":
          return `Ugyldig verdi i ${t.origin}`;
        default:
          return "Ugyldig input";
      }
    };
  };
  function fm() {
    return { localeError: T$() };
  }
  var E$ = () => {
    let e = {
      string: { unit: "tegn", verb: "\xE5 ha" },
      file: { unit: "bytes", verb: "\xE5 ha" },
      array: { unit: "elementer", verb: "\xE5 inneholde" },
      set: { unit: "elementer", verb: "\xE5 inneholde" },
      map: { unit: "elementer", verb: "\xE5 inneholde" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "input",
        email: "e-postadresse",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO dato- og klokkeslett",
        date: "ISO-dato",
        time: "ISO-klokkeslett",
        duration: "ISO-varighet",
        ipv4: "IPv4-adresse",
        ipv6: "IPv6-adresse",
        mac: "MAC-adresse",
        cidrv4: "IPv4-spekter",
        cidrv6: "IPv6-spekter",
        base64: "base64-enkodet streng",
        base64url: "base64url-enkodet streng",
        json_string: "JSON-streng",
        e164: "E.164-nummer",
        credit_card: "kredittkortnummer",
        currency_code: "valutakode",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "input",
      },
      o = { nan: "NaN", number: "tall", array: "liste" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Ugyldig input: forventet instanceof ${t.expected}, fikk ${s}`
            : `Ugyldig input: forventet ${r}, fikk ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Ugyldig verdi: forventet ${b(t.values[0])}`
            : `Ugyldig valg: forventet en av ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `For stor(t): forventet ${t.origin ?? "value"} til \xE5 ha ${r}${t.maximum.toString()} ${a.unit ?? "elementer"}`
            : `For stor(t): forventet ${t.origin ?? "value"} til \xE5 ha ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `For lite(n): forventet ${t.origin} til \xE5 ha ${r}${t.minimum.toString()} ${a.unit}`
            : `For lite(n): forventet ${t.origin} til \xE5 ha ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Ugyldig streng: m\xE5 starte med "${r.prefix}"`
            : r.format === "ends_with"
              ? `Ugyldig streng: m\xE5 ende med "${r.suffix}"`
              : r.format === "includes"
                ? `Ugyldig streng: m\xE5 inneholde "${r.includes}"`
                : r.format === "regex"
                  ? `Ugyldig streng: m\xE5 matche m\xF8nsteret ${r.pattern}`
                  : `Ugyldig ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Ugyldig tall: m\xE5 v\xE6re et multiplum av ${t.divisor}`;
        case "unrecognized_keys":
          return `${t.keys.length > 1 ? "Ukjente n\xF8kler" : "Ukjent n\xF8kkel"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8kkel i ${t.origin}`;
        case "invalid_union":
          return "Ugyldig input";
        case "invalid_element":
          return `Ugyldig verdi i ${t.origin}`;
        default:
          return "Ugyldig input";
      }
    };
  };
  function mm() {
    return { localeError: E$() };
  }
  var A$ = () => {
    let e = {
      string: { unit: "harf", verb: "olmal\u0131d\u0131r" },
      file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
      array: { unit: "unsur", verb: "olmal\u0131d\u0131r" },
      set: { unit: "unsur", verb: "olmal\u0131d\u0131r" },
      map: { unit: "unsur", verb: "olmal\u0131d\u0131r" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "giren",
        email: "epostag\xE2h",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO heng\xE2m\u0131",
        date: "ISO tarihi",
        time: "ISO zaman\u0131",
        duration: "ISO m\xFCddeti",
        ipv4: "IPv4 ni\u015F\xE2n\u0131",
        ipv6: "IPv6 ni\u015F\xE2n\u0131",
        mac: "MAC ni\u015F\xE2n\u0131",
        cidrv4: "IPv4 menzili",
        cidrv6: "IPv6 menzili",
        base64: "base64-\u015Fifreli metin",
        base64url: "base64url-\u015Fifreli metin",
        json_string: "JSON metin",
        e164: "E.164 say\u0131s\u0131",
        credit_card: "i'tib\xE2r kart\u0131 numaras\u0131",
        currency_code: "para birimi kodu",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "giren",
      },
      o = { nan: "NaN", number: "numara", array: "saf", null: "gayb" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `F\xE2sit giren: umulan instanceof ${t.expected}, al\u0131nan ${s}`
            : `F\xE2sit giren: umulan ${r}, al\u0131nan ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `F\xE2sit giren: umulan ${b(t.values[0])}`
            : `F\xE2sit tercih: m\xFBteberler ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Fazla b\xFCy\xFCk: ${t.origin ?? "value"}, ${r}${t.maximum.toString()} ${a.unit ?? "elements"} sahip olmal\u0131yd\u0131.`
            : `Fazla b\xFCy\xFCk: ${t.origin ?? "value"}, ${r}${t.maximum.toString()} olmal\u0131yd\u0131.`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Fazla k\xFC\xE7\xFCk: ${t.origin}, ${r}${t.minimum.toString()} ${a.unit} sahip olmal\u0131yd\u0131.`
            : `Fazla k\xFC\xE7\xFCk: ${t.origin}, ${r}${t.minimum.toString()} olmal\u0131yd\u0131.`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `F\xE2sit metin: "${r.prefix}" ile ba\u015Flamal\u0131.`
            : r.format === "ends_with"
              ? `F\xE2sit metin: "${r.suffix}" ile bitmeli.`
              : r.format === "includes"
                ? `F\xE2sit metin: "${r.includes}" ihtiv\xE2 etmeli.`
                : r.format === "regex"
                  ? `F\xE2sit metin: ${r.pattern} nak\u015F\u0131na uymal\u0131.`
                  : `F\xE2sit ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `F\xE2sit say\u0131: ${t.divisor} kat\u0131 olmal\u0131yd\u0131.`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan anahtar ${t.keys.length > 1 ? "s" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `${t.origin} i\xE7in tan\u0131nmayan anahtar var.`;
        case "invalid_union":
          return "Giren tan\u0131namad\u0131.";
        case "invalid_element":
          return `${t.origin} i\xE7in tan\u0131nmayan k\u0131ymet var.`;
        default:
          return "K\u0131ymet tan\u0131namad\u0131.";
      }
    };
  };
  function pm() {
    return { localeError: A$() };
  }
  var D$ = () => {
    let e = {
      string: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
      file: { unit: "\u0628\u0627\u06CC\u067C\u0633", verb: "\u0648\u0644\u0631\u064A" },
      array: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
      set: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
      map: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0648\u0631\u0648\u062F\u064A",
        email: "\u0628\u0631\u06CC\u069A\u0646\u0627\u0644\u06CC\u06A9",
        url: "\u06CC\u0648 \u0622\u0631 \u0627\u0644",
        emoji: "\u0627\u06CC\u0645\u0648\u062C\u064A",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u0646\u06CC\u067C\u0647 \u0627\u0648 \u0648\u062E\u062A",
        date: "\u0646\u06D0\u067C\u0647",
        time: "\u0648\u062E\u062A",
        duration: "\u0645\u0648\u062F\u0647",
        ipv4: "\u062F IPv4 \u067E\u062A\u0647",
        ipv6: "\u062F IPv6 \u067E\u062A\u0647",
        mac: "\u062F MAC \u067E\u062A\u0647",
        cidrv4: "\u062F IPv4 \u0633\u0627\u062D\u0647",
        cidrv6: "\u062F IPv6 \u0633\u0627\u062D\u0647",
        base64: "base64-encoded \u0645\u062A\u0646",
        base64url: "base64url-encoded \u0645\u062A\u0646",
        json_string: "JSON \u0645\u062A\u0646",
        e164: "\u062F E.164 \u0634\u0645\u06D0\u0631\u0647",
        credit_card:
          "\u062F \u06A9\u0631\u06CC\u0689\u06CC\u067C \u06A9\u0627\u0631\u062A \u0634\u0645\u06CC\u0631\u0647",
        currency_code: "\u062F \u0627\u0633\u0639\u0627\u0631\u0648 \u06A9\u0648\u0689",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0648\u0631\u0648\u062F\u064A",
      },
      o = { nan: "NaN", number: "\u0639\u062F\u062F", array: "\u0627\u0631\u06D0" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F instanceof ${t.expected} \u0648\u0627\u06CC, \u0645\u06AB\u0631 ${s} \u062A\u0631\u0644\u0627\u0633\u0647 \u0634\u0648`
            : `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${r} \u0648\u0627\u06CC, \u0645\u06AB\u0631 ${s} \u062A\u0631\u0644\u0627\u0633\u0647 \u0634\u0648`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${b(t.values[0])} \u0648\u0627\u06CC`
            : `\u0646\u0627\u0633\u0645 \u0627\u0646\u062A\u062E\u0627\u0628: \u0628\u0627\u06CC\u062F \u06CC\u0648 \u0644\u0647 ${v(t.values, "|")} \u0685\u062E\u0647 \u0648\u0627\u06CC`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${t.origin ?? "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${r}${t.maximum.toString()} ${a.unit ?? "\u0639\u0646\u0635\u0631\u0648\u0646\u0647"} \u0648\u0644\u0631\u064A`
            : `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${t.origin ?? "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${r}${t.maximum.toString()} \u0648\u064A`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${t.origin} \u0628\u0627\u06CC\u062F ${r}${t.minimum.toString()} ${a.unit} \u0648\u0644\u0631\u064A`
            : `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${t.origin} \u0628\u0627\u06CC\u062F ${r}${t.minimum.toString()} \u0648\u064A`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${r.prefix}" \u0633\u0631\u0647 \u067E\u06CC\u0644 \u0634\u064A`
            : r.format === "ends_with"
              ? `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${r.suffix}" \u0633\u0631\u0647 \u067E\u0627\u06CC \u062A\u0647 \u0648\u0631\u0633\u064A\u0696\u064A`
              : r.format === "includes"
                ? `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F "${r.includes}" \u0648\u0644\u0631\u064A`
                : r.format === "regex"
                  ? `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F ${r.pattern} \u0633\u0631\u0647 \u0645\u0637\u0627\u0628\u0642\u062A \u0648\u0644\u0631\u064A`
                  : `${i[r.format] ?? t.format} \u0646\u0627\u0633\u0645 \u062F\u06CC`;
        }
        case "not_multiple_of":
          return `\u0646\u0627\u0633\u0645 \u0639\u062F\u062F: \u0628\u0627\u06CC\u062F \u062F ${t.divisor} \u0645\u0636\u0631\u0628 \u0648\u064A`;
        case "unrecognized_keys":
          return `\u0646\u0627\u0633\u0645 ${t.keys.length > 1 ? "\u06A9\u0644\u06CC\u0689\u0648\u0646\u0647" : "\u06A9\u0644\u06CC\u0689"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u0646\u0627\u0633\u0645 \u06A9\u0644\u06CC\u0689 \u067E\u0647 ${t.origin} \u06A9\u06D0`;
        case "invalid_union":
          return "\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A";
        case "invalid_element":
          return `\u0646\u0627\u0633\u0645 \u0639\u0646\u0635\u0631 \u067E\u0647 ${t.origin} \u06A9\u06D0`;
        default:
          return "\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A";
      }
    };
  };
  function gm() {
    return { localeError: D$() };
  }
  var j$ = () => {
    let e = {
      string: { unit: "znak\xF3w", verb: "mie\u0107" },
      file: { unit: "bajt\xF3w", verb: "mie\u0107" },
      array: { unit: "element\xF3w", verb: "mie\u0107" },
      set: { unit: "element\xF3w", verb: "mie\u0107" },
      map: { unit: "element\xF3w", verb: "mie\u0107" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "wyra\u017Cenie",
        email: "adres email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data i godzina w formacie ISO",
        date: "data w formacie ISO",
        time: "godzina w formacie ISO",
        duration: "czas trwania ISO",
        ipv4: "adres IPv4",
        ipv6: "adres IPv6",
        mac: "adres MAC",
        cidrv4: "zakres IPv4",
        cidrv6: "zakres IPv6",
        base64: "ci\u0105g znak\xF3w zakodowany w formacie base64",
        base64url: "ci\u0105g znak\xF3w zakodowany w formacie base64url",
        json_string: "ci\u0105g znak\xF3w w formacie JSON",
        e164: "liczba E.164",
        credit_card: "numer karty kredytowej",
        currency_code: "kod waluty",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "wej\u015Bcie",
      },
      o = { nan: "NaN", number: "liczba", array: "tablica" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano instanceof ${t.expected}, otrzymano ${s}`
            : `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${r}, otrzymano ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${b(t.values[0])}`
            : `Nieprawid\u0142owa opcja: oczekiwano jednej z warto\u015Bci ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Za du\u017Ca warto\u015B\u0107: oczekiwano, \u017Ce ${t.origin ?? "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${r}${t.maximum.toString()} ${a.unit ?? "element\xF3w"}`
            : `Zbyt du\u017C(y/a/e): oczekiwano, \u017Ce ${t.origin ?? "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Za ma\u0142a warto\u015B\u0107: oczekiwano, \u017Ce ${t.origin ?? "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${r}${t.minimum.toString()} ${a.unit ?? "element\xF3w"}`
            : `Zbyt ma\u0142(y/a/e): oczekiwano, \u017Ce ${t.origin ?? "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zaczyna\u0107 si\u0119 od "${r.prefix}"`
            : r.format === "ends_with"
              ? `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi ko\u0144czy\u0107 si\u0119 na "${r.suffix}"`
              : r.format === "includes"
                ? `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zawiera\u0107 "${r.includes}"`
                : r.format === "regex"
                  ? `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi odpowiada\u0107 wzorcowi ${r.pattern}`
                  : `Nieprawid\u0142ow(y/a/e) ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Nieprawid\u0142owa liczba: musi by\u0107 wielokrotno\u015Bci\u0105 ${t.divisor}`;
        case "unrecognized_keys":
          return `Nierozpoznane klucze${t.keys.length > 1 ? "s" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Nieprawid\u0142owy klucz w ${t.origin}`;
        case "invalid_union":
          return "Nieprawid\u0142owe dane wej\u015Bciowe";
        case "invalid_element":
          return `Nieprawid\u0142owa warto\u015B\u0107 w ${t.origin}`;
        default:
          return "Nieprawid\u0142owe dane wej\u015Bciowe";
      }
    };
  };
  function hm() {
    return { localeError: j$() };
  }
  var U$ = () => {
    let e = {
      string: { unit: "caracteres" },
      file: { unit: "bytes" },
      array: { unit: "elementos" },
      set: { unit: "elementos" },
      map: { unit: "entradas" },
    };
    function n(a) {
      return e[a] ?? null;
    }
    let i = {
        regex: "a entrada",
        email: "o endere\xE7o de e-mail",
        url: "o URL",
        emoji: "o emoji",
        uuid: "o UUID",
        uuidv4: "o UUIDv4",
        uuidv6: "o UUIDv6",
        nanoid: "o nanoid",
        guid: "o GUID",
        cuid: "o cuid",
        cuid2: "o cuid2",
        ulid: "o ULID",
        xid: "o XID",
        ksuid: "o KSUID",
        datetime: "a data e hora ISO",
        date: "a data ISO",
        time: "a hora ISO",
        duration: "a dura\xE7\xE3o ISO",
        ipv4: "o endere\xE7o IPv4",
        ipv6: "o endere\xE7o IPv6",
        mac: "o endere\xE7o MAC",
        cidrv4: "o intervalo de endere\xE7os IPv4",
        cidrv6: "o intervalo de endere\xE7os IPv6",
        base64: "o texto codificado em base64",
        base64url: "o texto codificado em base64url",
        json_string: "o texto JSON",
        e164: "o n\xFAmero E.164",
        credit_card: "o n\xFAmero de cart\xE3o de cr\xE9dito",
        currency_code: "o c\xF3digo de moeda",
        iban: "o IBAN",
        jwt: "o JWT",
        template_literal: "a entrada",
      },
      o = {
        masculine: { definite: "o", indefinite: "um" },
        feminine: { definite: "a", indefinite: "uma" },
      },
      t = {
        string: { name: "texto", articles: o.masculine },
        number: { name: "n\xFAmero", articles: o.masculine },
        int: { name: "n\xFAmero inteiro", articles: o.masculine },
        boolean: { name: "valor booleano", articles: o.masculine },
        bigint: { name: "n\xFAmero bigint", articles: o.masculine },
        symbol: { name: "s\xEDmbolo", articles: o.masculine },
        undefined: { name: 'valor "undefined"', articles: o.masculine },
        null: { name: 'valor "nulo"', articles: o.masculine },
        never: { name: 'valor "never"', articles: o.masculine },
        void: { name: 'valor "void"', articles: o.masculine },
        date: { name: "data", articles: o.feminine },
        array: { name: "vetor", articles: o.masculine },
        object: { name: "objeto", articles: o.masculine },
        tuple: { name: "tuplo", articles: o.masculine },
        record: { name: "registo", articles: o.masculine },
        map: { name: "mapa", articles: o.masculine },
        set: { name: "conjunto", articles: o.masculine },
        file: { name: "ficheiro", articles: o.masculine },
        nonoptional: { name: "valor n\xE3o opcional", articles: o.masculine },
        nan: { name: 'valor "NaN"', articles: o.masculine },
        function: { name: "fun\xE7\xE3o", articles: o.feminine },
      };
    function r(a, s) {
      let u = t[a] ?? { name: `valor "${a}"`, articles: o.masculine };
      return `${u.articles[s]} ${u.name}`;
    }
    return (a) => {
      switch (a.code) {
        case "invalid_type": {
          let s = r(a.expected, "indefinite"),
            u = _(a.input),
            c = r(u, "indefinite");
          return `Entrada inv\xE1lida: esperava ${s}, recebeu ${c}`;
        }
        case "invalid_value":
          return a.values.length === 1
            ? `Entrada inv\xE1lida: esperava ${b(a.values[0])}`
            : `Op\xE7\xE3o inv\xE1lida: esperava uma das seguintes op\xE7\xF5es: ${v(a.values, "|")}`;
        case "too_big": {
          let s = a.inclusive ? "<=" : "<",
            u = n(a.origin);
          return u
            ? `Demasiado grande: esperava que ${r(a.origin, "definite")} tivesse ${s} ${a.maximum.toString()} ${u.unit ?? "elementos"}`
            : `Demasiado grande: esperava que ${r(a.origin, "definite")} fosse ${s} ${a.maximum.toString()}`;
        }
        case "too_small": {
          let s = a.inclusive ? ">=" : ">",
            u = n(a.origin);
          return u
            ? `Demasiado pequeno: esperava que ${r(a.origin, "definite")} tivesse ${s} ${a.minimum.toString()} ${u.unit ?? "elementos"}`
            : `Demasiado pequeno: esperava que ${r(a.origin, "definite")} fosse ${s} ${a.minimum.toString()}`;
        }
        case "invalid_format": {
          let s = a;
          return s.format === "starts_with"
            ? `Texto inv\xE1lido: deve come\xE7ar por "${s.prefix}"`
            : s.format === "ends_with"
              ? `Texto inv\xE1lido: deve terminar em "${s.suffix}"`
              : s.format === "includes"
                ? `Texto inv\xE1lido: deve incluir "${s.includes}"`
                : s.format === "regex"
                  ? `Texto inv\xE1lido: deve corresponder ao padr\xE3o ${s.pattern}`
                  : `Formato d${i[s.format] ?? a.format} inv\xE1lido`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE1lido: deve ser m\xFAltiplo de ${a.divisor}`;
        case "unrecognized_keys": {
          let s = a.keys.length > 1 ? "s" : "";
          return `Chave${s} inv\xE1lida${s}: ${v(a.keys, ", ")}`;
        }
        case "invalid_key":
          return `Entrada inv\xE1lida n${r(a.origin, "definite")}`;
        case "invalid_union":
          return a.options && Array.isArray(a.options) && a.options.length > 0
            ? `Valor de discrimina\xE7\xE3o inv\xE1lido. Esperava ${a.options.map((u) => `'${u}'`).join(" | ")}`
            : "Entrada inv\xE1lida";
        case "invalid_element":
          return `Entrada inv\xE1lida n${r(a.origin, "definite")}`;
        default:
          return "Entrada inv\xE1lida";
      }
    };
  };
  function vm() {
    return { localeError: U$() };
  }
  var C$ = () => {
    let e = {
      string: { unit: "caracteres" },
      file: { unit: "bytes" },
      array: { unit: "elementos" },
      set: { unit: "elementos" },
      map: { unit: "entradas" },
    };
    function n(a) {
      return e[a] ?? null;
    }
    let i = {
        regex: "a entrada",
        email: "o endere\xE7o de e-mail",
        url: "o URL",
        emoji: "o emoji",
        uuid: "o UUID",
        uuidv4: "o UUIDv4",
        uuidv6: "o UUIDv6",
        nanoid: "o nanoid",
        guid: "o GUID",
        cuid: "o cuid",
        cuid2: "o cuid2",
        ulid: "o ULID",
        xid: "o XID",
        ksuid: "o KSUID",
        datetime: "a data e hora ISO",
        date: "a data ISO",
        time: "a hora ISO",
        duration: "a dura\xE7\xE3o ISO",
        ipv4: "o endere\xE7o IPv4",
        ipv6: "o endere\xE7o IPv6",
        mac: "o endere\xE7o MAC",
        cidrv4: "a faixa de endere\xE7os IPv4",
        cidrv6: "a faixa de endere\xE7os IPv6",
        base64: "o texto codificado em base64",
        base64url: "o texto codificado em base64url",
        json_string: "o texto JSON",
        e164: "o n\xFAmero E.164",
        credit_card: "o n\xFAmero de cart\xE3o de cr\xE9dito",
        currency_code: "o c\xF3digo de moeda",
        iban: "o IBAN",
        jwt: "o JWT",
        template_literal: "a entrada",
      },
      o = {
        masculine: { definite: "o", indefinite: "um" },
        feminine: { definite: "a", indefinite: "uma" },
      },
      t = {
        string: { name: "texto", articles: o.masculine },
        number: { name: "n\xFAmero", articles: o.masculine },
        int: { name: "n\xFAmero inteiro", articles: o.masculine },
        boolean: { name: "valor booleano", articles: o.masculine },
        bigint: { name: "n\xFAmero bigint", articles: o.masculine },
        symbol: { name: "s\xEDmbolo", articles: o.masculine },
        undefined: { name: 'valor "undefined"', articles: o.masculine },
        null: { name: 'valor "nulo"', articles: o.masculine },
        never: { name: 'valor "never"', articles: o.masculine },
        void: { name: 'valor "void"', articles: o.masculine },
        date: { name: "data", articles: o.feminine },
        array: { name: "vetor", articles: o.masculine },
        object: { name: "objeto", articles: o.masculine },
        tuple: { name: "tupla", articles: o.feminine },
        record: { name: "registro", articles: o.masculine },
        map: { name: "mapa", articles: o.masculine },
        set: { name: "conjunto", articles: o.masculine },
        file: { name: "arquivo", articles: o.masculine },
        nonoptional: { name: "valor n\xE3o opcional", articles: o.masculine },
        nan: { name: 'valor "NaN"', articles: o.masculine },
        function: { name: "fun\xE7\xE3o", articles: o.feminine },
      };
    function r(a, s) {
      let u = t[a] ?? { name: `valor "${a}"`, articles: o.masculine };
      return `${u.articles[s]} ${u.name}`;
    }
    return (a) => {
      switch (a.code) {
        case "invalid_type": {
          let s = r(a.expected, "indefinite"),
            u = _(a.input),
            c = r(u, "indefinite");
          return `Entrada inv\xE1lida: esperava ${s}, recebeu ${c}`;
        }
        case "invalid_value":
          return a.values.length === 1
            ? `Entrada inv\xE1lida: esperava ${b(a.values[0])}`
            : `Op\xE7\xE3o inv\xE1lida: esperava uma das seguintes op\xE7\xF5es: ${v(a.values, "|")}`;
        case "too_big": {
          let s = a.inclusive ? "<=" : "<",
            u = n(a.origin);
          return u
            ? `Grande demais: esperava que ${r(a.origin, "definite")} tivesse ${s} ${a.maximum.toString()} ${u.unit ?? "elementos"}`
            : `Grande demais: esperava que ${r(a.origin, "definite")} fosse ${s} ${a.maximum.toString()}`;
        }
        case "too_small": {
          let s = a.inclusive ? ">=" : ">",
            u = n(a.origin);
          return u
            ? `Pequeno demais: esperava que ${r(a.origin, "definite")} tivesse ${s} ${a.minimum.toString()} ${u.unit ?? "elementos"}`
            : `Pequeno demais: esperava que ${r(a.origin, "definite")} fosse ${s} ${a.minimum.toString()}`;
        }
        case "invalid_format": {
          let s = a;
          return s.format === "starts_with"
            ? `Texto inv\xE1lido: deve come\xE7ar com "${s.prefix}"`
            : s.format === "ends_with"
              ? `Texto inv\xE1lido: deve terminar com "${s.suffix}"`
              : s.format === "includes"
                ? `Texto inv\xE1lido: deve incluir "${s.includes}"`
                : s.format === "regex"
                  ? `Texto inv\xE1lido: deve corresponder ao padr\xE3o ${s.pattern}`
                  : `Formato d${i[s.format] ?? a.format} inv\xE1lido`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE1lido: deve ser m\xFAltiplo de ${a.divisor}`;
        case "unrecognized_keys": {
          let s = a.keys.length > 1 ? "s" : "";
          return `Chave${s} inv\xE1lida${s}: ${v(a.keys, ", ")}`;
        }
        case "invalid_key":
          return `Entrada inv\xE1lida n${r(a.origin, "definite")}`;
        case "invalid_union":
          return a.options && Array.isArray(a.options) && a.options.length > 0
            ? `Valor de discrimina\xE7\xE3o inv\xE1lido. Esperava ${a.options.map((u) => `'${u}'`).join(" | ")}`
            : "Entrada inv\xE1lida";
        case "invalid_element":
          return `Entrada inv\xE1lida n${r(a.origin, "definite")}`;
        default:
          return "Entrada inv\xE1lida";
      }
    };
  };
  function $m() {
    return { localeError: C$() };
  }
  var L$ = () => {
    let e = {
      string: { unit: "caractere", verb: "s\u0103 aib\u0103" },
      file: { unit: "octe\u021Bi", verb: "s\u0103 aib\u0103" },
      array: { unit: "elemente", verb: "s\u0103 aib\u0103" },
      set: { unit: "elemente", verb: "s\u0103 aib\u0103" },
      map: { unit: "intr\u0103ri", verb: "s\u0103 aib\u0103" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "intrare",
        email: "adres\u0103 de email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "dat\u0103 \u0219i or\u0103 ISO",
        date: "dat\u0103 ISO",
        time: "or\u0103 ISO",
        duration: "durat\u0103 ISO",
        ipv4: "adres\u0103 IPv4",
        ipv6: "adres\u0103 IPv6",
        mac: "adres\u0103 MAC",
        cidrv4: "interval IPv4",
        cidrv6: "interval IPv6",
        base64: "\u0219ir codat base64",
        base64url: "\u0219ir codat base64url",
        json_string: "\u0219ir JSON",
        e164: "num\u0103r E.164",
        credit_card: "num\u0103r de card de credit",
        currency_code: "cod valutar",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "intrare",
      },
      o = {
        nan: "NaN",
        string: "\u0219ir",
        number: "num\u0103r",
        boolean: "boolean",
        function: "func\u021Bie",
        array: "matrice",
        object: "obiect",
        undefined: "nedefinit",
        symbol: "simbol",
        bigint: "num\u0103r mare",
        void: "void",
        never: "never",
        map: "hart\u0103",
        set: "set",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return `Intrare invalid\u0103: a\u0219teptat ${r}, primit ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Intrare invalid\u0103: a\u0219teptat ${b(t.values[0])}`
            : `Op\u021Biune invalid\u0103: a\u0219teptat una dintre ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Prea mare: a\u0219teptat ca ${t.origin ?? "valoarea"} ${a.verb} ${r}${t.maximum.toString()} ${a.unit ?? "elemente"}`
            : `Prea mare: a\u0219teptat ca ${t.origin ?? "valoarea"} s\u0103 fie ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Prea mic: a\u0219teptat ca ${t.origin} ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`
            : `Prea mic: a\u0219teptat ca ${t.origin} s\u0103 fie ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0218ir invalid: trebuie s\u0103 \xEEnceap\u0103 cu "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u0218ir invalid: trebuie s\u0103 se termine cu "${r.suffix}"`
              : r.format === "includes"
                ? `\u0218ir invalid: trebuie s\u0103 includ\u0103 "${r.includes}"`
                : r.format === "regex"
                  ? `\u0218ir invalid: trebuie s\u0103 se potriveasc\u0103 cu modelul ${r.pattern}`
                  : `Format invalid: ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Num\u0103r invalid: trebuie s\u0103 fie multiplu de ${t.divisor}`;
        case "unrecognized_keys":
          return `Chei nerecunoscute: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Cheie invalid\u0103 \xEEn ${t.origin}`;
        case "invalid_union":
          return "Intrare invalid\u0103";
        case "invalid_element":
          return `Valoare invalid\u0103 \xEEn ${t.origin}`;
        default:
          return "Intrare invalid\u0103";
      }
    };
  };
  function ym() {
    return { localeError: L$() };
  }
  function bm(e, n, i, o) {
    let t = Math.abs(e),
      r = t % 10,
      a = t % 100;
    return a >= 11 && a <= 19 ? o : r === 1 ? n : r >= 2 && r <= 4 ? i : o;
  }
  var R$ = () => {
    let e = {
      string: {
        unit: {
          one: "\u0441\u0438\u043C\u0432\u043E\u043B",
          few: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430",
          many: "\u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432",
        },
        verb: "\u0438\u043C\u0435\u0442\u044C",
      },
      file: {
        unit: {
          one: "\u0431\u0430\u0439\u0442",
          few: "\u0431\u0430\u0439\u0442\u0430",
          many: "\u0431\u0430\u0439\u0442",
        },
        verb: "\u0438\u043C\u0435\u0442\u044C",
      },
      array: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432",
        },
        verb: "\u0438\u043C\u0435\u0442\u044C",
      },
      set: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432",
        },
        verb: "\u0438\u043C\u0435\u0442\u044C",
      },
      map: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432",
        },
        verb: "\u0438\u043C\u0435\u0442\u044C",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0432\u0432\u043E\u0434",
        email: "email \u0430\u0434\u0440\u0435\u0441",
        url: "URL",
        emoji: "\u044D\u043C\u043E\u0434\u0437\u0438",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0434\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F",
        date: "ISO \u0434\u0430\u0442\u0430",
        time: "ISO \u0432\u0440\u0435\u043C\u044F",
        duration: "ISO \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
        ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441",
        ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441",
        mac: "MAC \u0430\u0434\u0440\u0435\u0441",
        cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
        cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
        base64:
          "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64",
        base64url:
          "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64url",
        json_string: "JSON \u0441\u0442\u0440\u043E\u043A\u0430",
        e164: "\u043D\u043E\u043C\u0435\u0440 E.164",
        credit_card:
          "\u043D\u043E\u043C\u0435\u0440 \u043A\u0440\u0435\u0434\u0438\u0442\u043D\u043E\u0439 \u043A\u0430\u0440\u0442\u044B",
        currency_code: "\u043A\u043E\u0434 \u0432\u0430\u043B\u044E\u0442\u044B",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0432\u0432\u043E\u0434",
      },
      o = {
        nan: "NaN",
        number: "\u0447\u0438\u0441\u043B\u043E",
        array: "\u043C\u0430\u0441\u0441\u0438\u0432",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C instanceof ${t.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${s}`
            : `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${r}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${b(t.values[0])}`
            : `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0434\u043D\u043E \u0438\u0437 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          if (a) {
            let s = Number(t.maximum),
              u = bm(s, a.unit.one, a.unit.few, a.unit.many);
            return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${t.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${r}${t.maximum.toString()} ${u}`;
          }
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${t.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          if (a) {
            let s = Number(t.minimum),
              u = bm(s, a.unit.one, a.unit.few, a.unit.many);
            return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${t.origin} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${r}${t.minimum.toString()} ${u}`;
          }
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${t.origin} \u0431\u0443\u0434\u0435\u0442 ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0441 "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 "${r.suffix}"`
              : r.format === "includes"
                ? `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C "${r.includes}"`
                : r.format === "regex"
                  ? `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${r.pattern}`
                  : `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E: \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${t.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D${t.keys.length > 1 ? "\u044B\u0435" : "\u044B\u0439"} \u043A\u043B\u044E\u0447${t.keys.length > 1 ? "\u0438" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0432 ${t.origin}`;
        case "invalid_union":
          return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
        case "invalid_element":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432 ${t.origin}`;
        default:
          return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
      }
    };
  };
  function _m() {
    return { localeError: R$() };
  }
  var Z$ = () => {
    let e = {
      string: { unit: "znakov", verb: "ma\u0165" },
      file: { unit: "bajtov", verb: "ma\u0165" },
      array: { unit: "prvkov", verb: "ma\u0165" },
      set: { unit: "prvkov", verb: "ma\u0165" },
      map: { unit: "polo\u017Eiek", verb: "ma\u0165" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "regul\xE1rny v\xFDraz",
        email: "e-mailov\xE1 adresa",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "d\xE1tum a \u010Das vo form\xE1te ISO",
        date: "d\xE1tum vo form\xE1te ISO",
        time: "\u010Das vo form\xE1te ISO",
        duration: "doba trvania ISO",
        ipv4: "IPv4 adresa",
        ipv6: "IPv6 adresa",
        mac: "MAC adresa",
        cidrv4: "rozsah IPv4",
        cidrv6: "rozsah IPv6",
        base64: "re\u0165azec zak\xF3dovan\xFD vo form\xE1te base64",
        base64url: "re\u0165azec zak\xF3dovan\xFD vo form\xE1te base64url",
        json_string: "re\u0165azec vo form\xE1te JSON",
        e164: "\u010D\xEDslo E.164",
        credit_card: "\u010D\xEDslo kreditnej karty",
        currency_code: "k\xF3d meny",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "vstup",
      },
      o = {
        nan: "NaN",
        number: "\u010D\xEDslo",
        string: "re\u0165azec",
        function: "funkcia",
        array: "pole",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Neplatn\xFD vstup: o\u010Dak\xE1van\xE9 instanceof ${t.expected}, obdr\u017Ean\xE9 ${s}`
            : `Neplatn\xFD vstup: o\u010Dak\xE1van\xE9 ${r}, obdr\u017Ean\xE9 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Neplatn\xFD vstup: o\u010Dak\xE1van\xE9 ${b(t.values[0])}`
            : `Neplatn\xFD vstup: o\u010Dak\xE1van\xE1 jedna z hodn\xF4t ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Hodnota je pr\xEDli\u0161 ve\u013Ek\xE1: ${t.origin ?? "hodnota"} mus\xED ma\u0165 ${r}${t.maximum.toString()} ${a.unit ?? "prvkov"}`
            : `Hodnota je pr\xEDli\u0161 ve\u013Ek\xE1: ${t.origin ?? "hodnota"} mus\xED by\u0165 ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Hodnota je pr\xEDli\u0161 mal\xE1: ${t.origin ?? "hodnota"} mus\xED ma\u0165 ${r}${t.minimum.toString()} ${a.unit ?? "prvkov"}`
            : `Hodnota je pr\xEDli\u0161 mal\xE1: ${t.origin ?? "hodnota"} mus\xED by\u0165 ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Neplatn\xFD re\u0165azec: mus\xED za\u010D\xEDna\u0165 na "${r.prefix}"`
            : r.format === "ends_with"
              ? `Neplatn\xFD re\u0165azec: mus\xED kon\u010Di\u0165 na "${r.suffix}"`
              : r.format === "includes"
                ? `Neplatn\xFD re\u0165azec: mus\xED obsahova\u0165 "${r.includes}"`
                : r.format === "regex"
                  ? `Neplatn\xFD re\u0165azec: mus\xED zodpoveda\u0165 vzoru ${r.pattern}`
                  : `Neplatn\xFD form\xE1t ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Neplatn\xE9 \u010D\xEDslo: mus\xED by\u0165 n\xE1sobkom ${t.divisor}`;
        case "unrecognized_keys":
          return `Nezn\xE1me kl\xFA\u010De: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Neplatn\xFD kl\xFA\u010D v ${t.origin}`;
        case "invalid_union":
          return "Neplatn\xFD vstup";
        case "invalid_element":
          return `Neplatn\xE1 hodnota v ${t.origin}`;
        default:
          return "Neplatn\xFD vstup";
      }
    };
  };
  function wm() {
    return { localeError: Z$() };
  }
  var V$ = () => {
    let e = {
      string: { unit: "znakov", verb: "imeti" },
      file: { unit: "bajtov", verb: "imeti" },
      array: { unit: "elementov", verb: "imeti" },
      set: { unit: "elementov", verb: "imeti" },
      map: { unit: "elementov", verb: "imeti" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "vnos",
        email: "e-po\u0161tni naslov",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datum in \u010Das",
        date: "ISO datum",
        time: "ISO \u010Das",
        duration: "ISO trajanje",
        ipv4: "IPv4 naslov",
        ipv6: "IPv6 naslov",
        mac: "MAC naslov",
        cidrv4: "obseg IPv4",
        cidrv6: "obseg IPv6",
        base64: "base64 kodiran niz",
        base64url: "base64url kodiran niz",
        json_string: "JSON niz",
        e164: "E.164 \u0161tevilka",
        credit_card: "\u0161tevilka kreditne kartice",
        currency_code: "koda valute",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "vnos",
      },
      o = { nan: "NaN", number: "\u0161tevilo", array: "tabela" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Neveljaven vnos: pri\u010Dakovano instanceof ${t.expected}, prejeto ${s}`
            : `Neveljaven vnos: pri\u010Dakovano ${r}, prejeto ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Neveljaven vnos: pri\u010Dakovano ${b(t.values[0])}`
            : `Neveljavna mo\u017Enost: pri\u010Dakovano eno izmed ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Preveliko: pri\u010Dakovano, da bo ${t.origin ?? "vrednost"} imelo ${r}${t.maximum.toString()} ${a.unit ?? "elementov"}`
            : `Preveliko: pri\u010Dakovano, da bo ${t.origin ?? "vrednost"} ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Premajhno: pri\u010Dakovano, da bo ${t.origin} imelo ${r}${t.minimum.toString()} ${a.unit}`
            : `Premajhno: pri\u010Dakovano, da bo ${t.origin} ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Neveljaven niz: mora se za\u010Deti z "${r.prefix}"`
            : r.format === "ends_with"
              ? `Neveljaven niz: mora se kon\u010Dati z "${r.suffix}"`
              : r.format === "includes"
                ? `Neveljaven niz: mora vsebovati "${r.includes}"`
                : r.format === "regex"
                  ? `Neveljaven niz: mora ustrezati vzorcu ${r.pattern}`
                  : `Neveljaven ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Neveljavno \u0161tevilo: mora biti ve\u010Dkratnik ${t.divisor}`;
        case "unrecognized_keys":
          return `Neprepoznan${t.keys.length > 1 ? "i klju\u010Di" : " klju\u010D"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Neveljaven klju\u010D v ${t.origin}`;
        case "invalid_union":
          return "Neveljaven vnos";
        case "invalid_element":
          return `Neveljavna vrednost v ${t.origin}`;
        default:
          return "Neveljaven vnos";
      }
    };
  };
  function xm() {
    return { localeError: V$() };
  }
  var M$ = () => {
    let e = {
      string: { unit: "tecken", verb: "att ha" },
      file: { unit: "bytes", verb: "att ha" },
      array: { unit: "objekt", verb: "att inneh\xE5lla" },
      set: { unit: "objekt", verb: "att inneh\xE5lla" },
      map: { unit: "objekt", verb: "att inneh\xE5lla" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "regulj\xE4rt uttryck",
        email: "e-postadress",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-datum och tid",
        date: "ISO-datum",
        time: "ISO-tid",
        duration: "ISO-varaktighet",
        ipv4: "IPv4-adress",
        ipv6: "IPv6-adress",
        mac: "MAC-adress",
        cidrv4: "IPv4-spektrum",
        cidrv6: "IPv6-spektrum",
        base64: "base64-kodad str\xE4ng",
        base64url: "base64url-kodad str\xE4ng",
        json_string: "JSON-str\xE4ng",
        e164: "E.164-nummer",
        credit_card: "kreditkortsnummer",
        currency_code: "valutakod",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "mall-literal",
      },
      o = { nan: "NaN", number: "antal", array: "lista" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Ogiltig inmatning: f\xF6rv\xE4ntat instanceof ${t.expected}, fick ${s}`
            : `Ogiltig inmatning: f\xF6rv\xE4ntat ${r}, fick ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Ogiltig inmatning: f\xF6rv\xE4ntat ${b(t.values[0])}`
            : `Ogiltigt val: f\xF6rv\xE4ntade en av ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `F\xF6r stor(t): f\xF6rv\xE4ntade ${t.origin ?? "v\xE4rdet"} att ha ${r}${t.maximum.toString()} ${a.unit ?? "element"}`
            : `F\xF6r stor(t): f\xF6rv\xE4ntat ${t.origin ?? "v\xE4rdet"} att ha ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `F\xF6r lite(t): f\xF6rv\xE4ntade ${t.origin ?? "v\xE4rdet"} att ha ${r}${t.minimum.toString()} ${a.unit}`
            : `F\xF6r lite(t): f\xF6rv\xE4ntade ${t.origin ?? "v\xE4rdet"} att ha ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Ogiltig str\xE4ng: m\xE5ste b\xF6rja med "${r.prefix}"`
            : r.format === "ends_with"
              ? `Ogiltig str\xE4ng: m\xE5ste sluta med "${r.suffix}"`
              : r.format === "includes"
                ? `Ogiltig str\xE4ng: m\xE5ste inneh\xE5lla "${r.includes}"`
                : r.format === "regex"
                  ? `Ogiltig str\xE4ng: m\xE5ste matcha m\xF6nstret "${r.pattern}"`
                  : `Ogiltig(t) ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Ogiltigt tal: m\xE5ste vara en multipel av ${t.divisor}`;
        case "unrecognized_keys":
          return `${t.keys.length > 1 ? "Ok\xE4nda nycklar" : "Ok\xE4nd nyckel"}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Ogiltig nyckel i ${t.origin ?? "v\xE4rdet"}`;
        case "invalid_union":
          return "Ogiltig input";
        case "invalid_element":
          return `Ogiltigt v\xE4rde i ${t.origin ?? "v\xE4rdet"}`;
        default:
          return "Ogiltig input";
      }
    };
  };
  function km() {
    return { localeError: M$() };
  }
  var F$ = () => {
    let e = {
      string: {
        unit: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD\u0B95\u0BB3\u0BCD",
        verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD",
      },
      file: {
        unit: "\u0BAA\u0BC8\u0B9F\u0BCD\u0B9F\u0BC1\u0B95\u0BB3\u0BCD",
        verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD",
      },
      array: {
        unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD",
        verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD",
      },
      set: {
        unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD",
        verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD",
      },
      map: {
        unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD",
        verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1",
        email:
          "\u0BAE\u0BBF\u0BA9\u0BCD\u0BA9\u0B9E\u0BCD\u0B9A\u0BB2\u0BCD \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0BA4\u0BC7\u0BA4\u0BBF \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD",
        date: "ISO \u0BA4\u0BC7\u0BA4\u0BBF",
        time: "ISO \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD",
        duration: "ISO \u0B95\u0BBE\u0BB2 \u0B85\u0BB3\u0BB5\u0BC1",
        ipv4: "IPv4 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
        ipv6: "IPv6 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
        mac: "MAC \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
        cidrv4: "IPv4 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1",
        cidrv6: "IPv6 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1",
        base64: "base64-encoded \u0B9A\u0BB0\u0BAE\u0BCD",
        base64url: "base64url-encoded \u0B9A\u0BB0\u0BAE\u0BCD",
        json_string: "JSON \u0B9A\u0BB0\u0BAE\u0BCD",
        e164: "E.164 \u0B8E\u0BA3\u0BCD",
        credit_card: "\u0B95\u0B9F\u0BA9\u0BCD \u0B85\u0B9F\u0BCD\u0B9F\u0BC8 \u0B8E\u0BA3\u0BCD",
        currency_code:
          "\u0BA8\u0BBE\u0BA3\u0BAF\u0B95\u0BCD \u0B95\u0BC1\u0BB1\u0BBF\u0BAF\u0BC0\u0B9F\u0BC1",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "input",
      },
      o = {
        nan: "NaN",
        number: "\u0B8E\u0BA3\u0BCD",
        array: "\u0B85\u0BA3\u0BBF",
        null: "\u0BB5\u0BC6\u0BB1\u0BC1\u0BAE\u0BC8",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 instanceof ${t.expected}, \u0BAA\u0BC6\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${s}`
            : `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${r}, \u0BAA\u0BC6\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${b(t.values[0])}`
            : `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${v(t.values, "|")} \u0B87\u0BB2\u0BCD \u0B92\u0BA9\u0BCD\u0BB1\u0BC1`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${t.origin ?? "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${r}${t.maximum.toString()} ${a.unit ?? "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD"} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`
            : `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${t.origin ?? "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${r}${t.maximum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${t.origin} ${r}${t.minimum.toString()} ${a.unit} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`
            : `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${t.origin} ${r}${t.minimum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${r.prefix}" \u0B87\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`
            : r.format === "ends_with"
              ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${r.suffix}" \u0B87\u0BB2\u0BCD \u0BAE\u0BC1\u0B9F\u0BBF\u0BB5\u0B9F\u0BC8\u0BAF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`
              : r.format === "includes"
                ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${r.includes}" \u0B90 \u0B89\u0BB3\u0BCD\u0BB3\u0B9F\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`
                : r.format === "regex"
                  ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: ${r.pattern} \u0BAE\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0B9F\u0BA9\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`
                  : `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B8E\u0BA3\u0BCD: ${t.divisor} \u0B87\u0BA9\u0BCD \u0BAA\u0BB2\u0BAE\u0BBE\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        case "unrecognized_keys":
          return `\u0B85\u0B9F\u0BC8\u0BAF\u0BBE\u0BB3\u0BAE\u0BCD \u0BA4\u0BC6\u0BB0\u0BBF\u0BAF\u0BBE\u0BA4 \u0BB5\u0BBF\u0B9A\u0BC8${t.keys.length > 1 ? "\u0B95\u0BB3\u0BCD" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `${t.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0B9A\u0BC8`;
        case "invalid_union":
          return "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1";
        case "invalid_element":
          return `${t.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1`;
        default:
          return "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1";
      }
    };
  };
  function Im() {
    return { localeError: F$() };
  }
  var B$ = () => {
    let e = {
      string: {
        unit: "\u0430\u043B\u043E\u043C\u0430\u0442",
        verb: "\u0434\u043E\u0448\u0442\u0430 \u0431\u043E\u0448\u0430\u0434",
      },
      file: {
        unit: "\u0431\u0430\u0439\u0442",
        verb: "\u0434\u043E\u0448\u0442\u0430 \u0431\u043E\u0448\u0430\u0434",
      },
      array: {
        unit: "\u0443\u043D\u0441\u0443\u0440",
        verb: "\u0434\u043E\u0448\u0442\u0430 \u0431\u043E\u0448\u0430\u0434",
      },
      set: {
        unit: "\u0443\u043D\u0441\u0443\u0440",
        verb: "\u0434\u043E\u0448\u0442\u0430 \u0431\u043E\u0448\u0430\u0434",
      },
      map: {
        unit: "\u0441\u0430\u0431\u0442",
        verb: "\u0434\u043E\u0448\u0442\u0430 \u0431\u043E\u0448\u0430\u0434",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0432\u0443\u0440\u0443\u0434",
        email: "\u0441\u0443\u0440\u043E\u0493\u0430\u0438 email",
        url: "URL",
        emoji: "\u044D\u043C\u043E\u04B7\u0438",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u0441\u0430\u043D\u0430\u0432\u0443 \u0432\u0430\u049B\u0442\u0438 ISO",
        date: "\u0441\u0430\u043D\u0430\u0438 ISO",
        time: "\u0432\u0430\u049B\u0442\u0438 ISO",
        duration: "\u0434\u0430\u0432\u043E\u043C\u043D\u043E\u043A\u0438\u0438 ISO",
        ipv4: "\u0441\u0443\u0440\u043E\u0493\u0430\u0438 IPv4",
        ipv6: "\u0441\u0443\u0440\u043E\u0493\u0430\u0438 IPv6",
        mac: "\u0441\u0443\u0440\u043E\u0493\u0430\u0438 MAC",
        cidrv4: "\u043C\u0430\u04B3\u0434\u0443\u0434\u0430\u0438 IPv4",
        cidrv6: "\u043C\u0430\u04B3\u0434\u0443\u0434\u0430\u0438 IPv6",
        base64:
          "\u0441\u0430\u0442\u0440\u0438 \u0434\u0430\u0440 \u0444\u043E\u0440\u043C\u0430\u0442\u0438 base64",
        base64url:
          "\u0441\u0430\u0442\u0440\u0438 \u0434\u0430\u0440 \u0444\u043E\u0440\u043C\u0430\u0442\u0438 base64url",
        json_string: "\u0441\u0430\u0442\u0440\u0438 JSON",
        e164: "\u0440\u0430\u049B\u0430\u043C\u0438 E.164",
        credit_card:
          "\u0440\u0430\u049B\u0430\u043C\u0438 \u043A\u043E\u0440\u0442\u0438 \u043A\u0440\u0435\u0434\u0438\u0442\u04E3",
        currency_code: "\u0440\u0430\u043C\u0437\u0438 \u0430\u0441\u044A\u043E\u0440",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0432\u0443\u0440\u0443\u0434",
      },
      o = {
        nan: "NaN",
        number: "\u0440\u0430\u049B\u0430\u043C",
        string: "\u0441\u0430\u0442\u0440",
        array: "\u043C\u0430\u0441\u0441\u0438\u0432",
        object: "\u043E\u0431\u044A\u0435\u043A\u0442",
        date: "\u0441\u0430\u043D\u0430",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return `\u0412\u0443\u0440\u0443\u0434\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: ${r} \u0438\u043D\u0442\u0438\u0437\u043E\u0440 \u043C\u0435\u0440\u0430\u0444\u0442, ${s} \u0433\u0438\u0440\u0438\u0444\u0442\u0430 \u0448\u0443\u0434`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0412\u0443\u0440\u0443\u0434\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: ${b(t.values[0])} \u0438\u043D\u0442\u0438\u0437\u043E\u0440 \u043C\u0435\u0440\u0430\u0444\u0442`
            : `\u0418\u043D\u0442\u0438\u0445\u043E\u0431\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u044F\u043A\u0435 \u0430\u0437 ${v(t.values, "|")} \u0438\u043D\u0442\u0438\u0437\u043E\u0440 \u043C\u0435\u0440\u0430\u0444\u0442`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u0425\u0435\u043B\u0435 \u043A\u0430\u043B\u043E\u043D: ${t.origin ?? "\u049B\u0438\u043C\u0430\u0442"} \u0431\u043E\u044F\u0434 ${r}${t.maximum.toString()} ${a.unit} ${a.verb}`
            : `\u0425\u0435\u043B\u0435 \u043A\u0430\u043B\u043E\u043D: ${t.origin ?? "\u049B\u0438\u043C\u0430\u0442"} \u0431\u043E\u044F\u0434 ${r}${t.maximum.toString()} \u0431\u043E\u0448\u0430\u0434`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0425\u0435\u043B\u0435 \u0445\u0443\u0440\u0434: ${t.origin} \u0431\u043E\u044F\u0434 ${r}${t.minimum.toString()} ${a.unit} ${a.verb}`
            : `\u0425\u0435\u043B\u0435 \u0445\u0443\u0440\u0434: ${t.origin} \u0431\u043E\u044F\u0434 ${r}${t.minimum.toString()} \u0431\u043E\u0448\u0430\u0434`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0421\u0430\u0442\u0440\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u0431\u043E\u044F\u0434 \u0431\u043E "${r.prefix}" \u043E\u0493\u043E\u0437 \u0448\u0430\u0432\u0430\u0434`
            : r.format === "ends_with"
              ? `\u0421\u0430\u0442\u0440\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u0431\u043E\u044F\u0434 \u0431\u043E "${r.suffix}" \u0430\u043D\u04B7\u043E\u043C \u0451\u0431\u0430\u0434`
              : r.format === "includes"
                ? `\u0421\u0430\u0442\u0440\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u0431\u043E\u044F\u0434 "${r.includes}"-\u0440\u043E \u0434\u0430\u0440 \u0431\u0430\u0440 \u0433\u0438\u0440\u0430\u0434`
                : r.format === "regex"
                  ? `\u0421\u0430\u0442\u0440\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u0431\u043E\u044F\u0434 \u0431\u0430 \u043D\u0430\u043C\u0443\u043D\u0430\u0438 ${r.pattern} \u043C\u0443\u0432\u043E\u0444\u0438\u049B\u0430\u0442 \u043A\u0443\u043D\u0430\u0434`
                  : `${i[r.format] ?? t.format}-\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442`;
        }
        case "not_multiple_of":
          return `\u0420\u0430\u049B\u0430\u043C\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442: \u0431\u043E\u044F\u0434 \u0431\u0430 ${t.divisor} \u0431\u0435 \u0431\u0430\u049B\u0438\u044F \u0442\u0430\u049B\u0441\u0438\u043C \u0448\u0430\u0432\u0430\u0434`;
        case "unrecognized_keys":
          return `\u041A\u0430\u043B\u0438\u0434${t.keys.length > 1 ? "\u04B3\u043E\u0438" : "\u0438"} \u043D\u043E\u043C\u0430\u044A\u043B\u0443\u043C: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u041A\u0430\u043B\u0438\u0434\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442 \u0434\u0430\u0440 ${t.origin}`;
        case "invalid_union":
          return t.options && Array.isArray(t.options) && t.options.length > 0
            ? `\u049A\u0438\u043C\u0430\u0442\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442\u0438 \u0434\u0438\u0441\u043A\u0440\u0438\u043C\u0438\u043D\u0430\u0442\u043E\u0440: ${t.options.map((a) => `'${a}'`).join(" | ")} \u0438\u043D\u0442\u0438\u0437\u043E\u0440 \u043C\u0435\u0440\u0430\u0444\u0442`
            : "\u0412\u0443\u0440\u0443\u0434\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442";
        case "invalid_element":
          return `\u049A\u0438\u043C\u0430\u0442\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442 \u0434\u0430\u0440 ${t.origin}`;
        default:
          return "\u0412\u0443\u0440\u0443\u0434\u0438 \u043D\u043E\u0434\u0443\u0440\u0443\u0441\u0442";
      }
    };
  };
  function Sm() {
    return { localeError: B$() };
  }
  var W$ = () => {
    let e = {
      string: {
        unit: "\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23",
        verb: "\u0E04\u0E27\u0E23\u0E21\u0E35",
      },
      file: { unit: "\u0E44\u0E1A\u0E15\u0E4C", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
      array: {
        unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23",
        verb: "\u0E04\u0E27\u0E23\u0E21\u0E35",
      },
      set: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
      map: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19",
        email: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E2D\u0E35\u0E40\u0E21\u0E25",
        url: "URL",
        emoji: "\u0E2D\u0E34\u0E42\u0E21\u0E08\u0E34",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime:
          "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
        date: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E1A\u0E1A ISO",
        time: "\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
        duration: "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
        ipv4: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv4",
        ipv6: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv6",
        mac: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 MAC",
        cidrv4: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv4",
        cidrv6: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv6",
        base64: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64",
        base64url:
          "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A URL",
        json_string: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A JSON",
        e164: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28 (E.164)",
        credit_card:
          "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E1A\u0E31\u0E15\u0E23\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15",
        currency_code: "\u0E23\u0E2B\u0E31\u0E2A\u0E2A\u0E01\u0E38\u0E25\u0E40\u0E07\u0E34\u0E19",
        iban: "IBAN",
        jwt: "\u0E42\u0E17\u0E40\u0E04\u0E19 JWT",
        template_literal:
          "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19",
      },
      o = {
        nan: "NaN",
        number: "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02",
        array: "\u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E23\u0E22\u0E4C (Array)",
        null: "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E48\u0E32 (null)",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 instanceof ${t.expected} \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${s}`
            : `\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${r} \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0E04\u0E48\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${b(t.values[0])}`
            : `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E43\u0E19 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive
              ? "\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19"
              : "\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32",
            a = n(t.origin);
          return a
            ? `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${t.origin ?? "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${r} ${t.maximum.toString()} ${a.unit ?? "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"}`
            : `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${t.origin ?? "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${r} ${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive
              ? "\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22"
              : "\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32",
            a = n(t.origin);
          return a
            ? `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${t.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${r} ${t.minimum.toString()} ${a.unit}`
            : `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${t.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${r} ${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E17\u0E49\u0E32\u0E22\u0E14\u0E49\u0E27\u0E22 "${r.suffix}"`
              : r.format === "includes"
                ? `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 "${r.includes}" \u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21`
                : r.format === "regex"
                  ? `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14 ${r.pattern}`
                  : `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E32\u0E23\u0E14\u0E49\u0E27\u0E22 ${t.divisor} \u0E44\u0E14\u0E49\u0E25\u0E07\u0E15\u0E31\u0E27`;
        case "unrecognized_keys":
          return `\u0E1E\u0E1A\u0E04\u0E35\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u0E04\u0E35\u0E22\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${t.origin}`;
        case "invalid_union":
          return "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E22\u0E39\u0E40\u0E19\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E44\u0E27\u0E49";
        case "invalid_element":
          return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${t.origin}`;
        default:
          return "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07";
      }
    };
  };
  function zm() {
    return { localeError: W$() };
  }
  var J$ = () => {
    let e = {
      string: { unit: "simwol", verb: "bolmaly" },
      file: { unit: "ba\xFDt", verb: "bolmaly" },
      array: { unit: "elementler", verb: "bolmaly" },
      set: { unit: "elementler", verb: "bolmaly" },
      map: { unit: "elementler", verb: "bolmaly" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "giri\u015F",
        email: "e-po\xE7ta salgysy",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO sene we wagt",
        date: "ISO sene",
        time: "ISO wagt",
        duration: "ISO wagt aralygy",
        ipv4: "IPv4 salgysy",
        ipv6: "IPv6 salgysy",
        mac: "MAC salgysy",
        cidrv4: "IPv4 aralygy",
        cidrv6: "IPv6 aralygy",
        base64: "base64 bilen \u015Fifrlenen setir",
        base64url: "base64url bilen \u015Fifrlenen setir",
        json_string: "JSON setiri",
        e164: "E.164 nomeri",
        credit_card: "kredit kartyny\u0148 nomeri",
        currency_code: "wal\xFDuta kody",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u015Fablon",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return `N\xE4dogry baha: gara\u015Fylan ${r} \xFDerine ${s} alyndy`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `N\xE4dogry baha: ${b(t.values[0])} bolmaly`
            : `N\xE4dogry sa\xFDlaw: a\u015Fakdakylardan biri bolmaly: ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Has uly: gara\u015Fyl\xFDan ${t.origin ?? "baha"} ${r} ${t.maximum.toString()} ${a.unit ?? "element"}`
            : `Has uly: gara\u015Fyl\xFDan ${t.origin ?? "baha"} ${r} ${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Has ki\xE7i: gara\u015Fyl\xFDan ${t.origin} ${r} ${t.minimum.toString()} ${a.unit}`
            : `Has ki\xE7i: gara\u015Fyl\xFDan ${t.origin} ${r} ${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `N\xE4dogry setir: "${r.prefix}" bilen ba\u015Flamaly`
            : r.format === "ends_with"
              ? `N\xE4dogry setir: "${r.suffix}" bilen gutarmaly`
              : r.format === "includes"
                ? `N\xE4dogry setir: "${r.includes}" saklamaly`
                : r.format === "regex"
                  ? `N\xE4dogry setir: ${r.pattern} nusga la\xFDyk bolmaly`
                  : `N\xE4dogry ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `N\xE4dogry san: ${t.divisor} bilen galyndysyz b\xF6l\xFCnmeli`;
        case "unrecognized_keys":
          return `Tanalma\xFDan a\xE7ar${t.keys.length > 1 ? "lar" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `${t.origin} i\xE7inde n\xE4dogry a\xE7ar`;
        case "invalid_union":
          return "N\xE4dogry baha";
        case "invalid_element":
          return `${t.origin} i\xE7inde n\xE4dogry baha`;
        default:
          return "N\xE4dogry baha";
      }
    };
  };
  function Nm() {
    return { localeError: J$() };
  }
  var G$ = () => {
    let e = {
      string: { unit: "karakter", verb: "olmal\u0131" },
      file: { unit: "bayt", verb: "olmal\u0131" },
      array: { unit: "\xF6\u011Fe", verb: "olmal\u0131" },
      set: { unit: "\xF6\u011Fe", verb: "olmal\u0131" },
      map: { unit: "\xF6\u011Fe", verb: "olmal\u0131" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "girdi",
        email: "e-posta adresi",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO tarih ve saat",
        date: "ISO tarih",
        time: "ISO saat",
        duration: "ISO s\xFCre",
        ipv4: "IPv4 adresi",
        ipv6: "IPv6 adresi",
        mac: "MAC adresi",
        cidrv4: "IPv4 aral\u0131\u011F\u0131",
        cidrv6: "IPv6 aral\u0131\u011F\u0131",
        base64: "base64 ile \u015Fifrelenmi\u015F metin",
        base64url: "base64url ile \u015Fifrelenmi\u015F metin",
        json_string: "JSON dizesi",
        e164: "E.164 say\u0131s\u0131",
        credit_card: "kredi kart\u0131 numaras\u0131",
        currency_code: "para birimi kodu",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u015Eablon dizesi",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Ge\xE7ersiz de\u011Fer: beklenen instanceof ${t.expected}, al\u0131nan ${s}`
            : `Ge\xE7ersiz de\u011Fer: beklenen ${r}, al\u0131nan ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Ge\xE7ersiz de\u011Fer: beklenen ${b(t.values[0])}`
            : `Ge\xE7ersiz se\xE7enek: a\u015Fa\u011F\u0131dakilerden biri olmal\u0131: ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\xC7ok b\xFCy\xFCk: beklenen ${t.origin ?? "de\u011Fer"} ${r}${t.maximum.toString()} ${a.unit ?? "\xF6\u011Fe"}`
            : `\xC7ok b\xFCy\xFCk: beklenen ${t.origin ?? "de\u011Fer"} ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\xC7ok k\xFC\xE7\xFCk: beklenen ${t.origin} ${r}${t.minimum.toString()} ${a.unit}`
            : `\xC7ok k\xFC\xE7\xFCk: beklenen ${t.origin} ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Ge\xE7ersiz metin: "${r.prefix}" ile ba\u015Flamal\u0131`
            : r.format === "ends_with"
              ? `Ge\xE7ersiz metin: "${r.suffix}" ile bitmeli`
              : r.format === "includes"
                ? `Ge\xE7ersiz metin: "${r.includes}" i\xE7ermeli`
                : r.format === "regex"
                  ? `Ge\xE7ersiz metin: ${r.pattern} desenine uymal\u0131`
                  : `Ge\xE7ersiz ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Ge\xE7ersiz say\u0131: ${t.divisor} ile tam b\xF6l\xFCnebilmeli`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan anahtar${t.keys.length > 1 ? "lar" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `${t.origin} i\xE7inde ge\xE7ersiz anahtar`;
        case "invalid_union":
          return "Ge\xE7ersiz de\u011Fer";
        case "invalid_element":
          return `${t.origin} i\xE7inde ge\xE7ersiz de\u011Fer`;
        default:
          return "Ge\xE7ersiz de\u011Fer";
      }
    };
  };
  function Pm() {
    return { localeError: G$() };
  }
  var K$ = () => {
    let e = {
      string: {
        unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432",
        verb: "\u043C\u0430\u0442\u0438\u043C\u0435",
      },
      file: {
        unit: "\u0431\u0430\u0439\u0442\u0456\u0432",
        verb: "\u043C\u0430\u0442\u0438\u043C\u0435",
      },
      array: {
        unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432",
        verb: "\u043C\u0430\u0442\u0438\u043C\u0435",
      },
      set: {
        unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432",
        verb: "\u043C\u0430\u0442\u0438\u043C\u0435",
      },
      map: {
        unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432",
        verb: "\u043C\u0430\u0442\u0438\u043C\u0435",
      },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456",
        email:
          "\u0430\u0434\u0440\u0435\u0441\u0430 \u0435\u043B\u0435\u043A\u0442\u0440\u043E\u043D\u043D\u043E\u0457 \u043F\u043E\u0448\u0442\u0438",
        url: "URL",
        emoji: "\u0435\u043C\u043E\u0434\u0437\u0456",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u0434\u0430\u0442\u0430 \u0442\u0430 \u0447\u0430\u0441 ISO",
        date: "\u0434\u0430\u0442\u0430 ISO",
        time: "\u0447\u0430\u0441 ISO",
        duration: "\u0442\u0440\u0438\u0432\u0430\u043B\u0456\u0441\u0442\u044C ISO",
        ipv4: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv4",
        ipv6: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv6",
        mac: "\u0430\u0434\u0440\u0435\u0441\u0430 MAC",
        cidrv4: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv4",
        cidrv6: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv6",
        base64:
          "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64",
        base64url:
          "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64url",
        json_string: "\u0440\u044F\u0434\u043E\u043A JSON",
        e164: "\u043D\u043E\u043C\u0435\u0440 E.164",
        credit_card:
          "\u043D\u043E\u043C\u0435\u0440 \u043A\u0440\u0435\u0434\u0438\u0442\u043D\u043E\u0457 \u043A\u0430\u0440\u0442\u043A\u0438",
        currency_code: "\u043A\u043E\u0434 \u0432\u0430\u043B\u044E\u0442\u0438",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456",
      },
      o = {
        nan: "NaN",
        number: "\u0447\u0438\u0441\u043B\u043E",
        array: "\u043C\u0430\u0441\u0438\u0432",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F instanceof ${t.expected}, \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E ${s}`
            : `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${r}, \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${b(t.values[0])}`
            : `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0430 \u043E\u043F\u0446\u0456\u044F: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u043E\u0434\u043D\u0435 \u0437 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${t.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} ${a.verb} ${r}${t.maximum.toString()} ${a.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432"}`
            : `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${t.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} \u0431\u0443\u0434\u0435 ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${t.origin} ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`
            : `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${t.origin} \u0431\u0443\u0434\u0435 ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043F\u043E\u0447\u0438\u043D\u0430\u0442\u0438\u0441\u044F \u0437 "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0432\u0430\u0442\u0438\u0441\u044F \u043D\u0430 "${r.suffix}"`
              : r.format === "includes"
                ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043C\u0456\u0441\u0442\u0438\u0442\u0438 "${r.includes}"`
                : r.format === "regex"
                  ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0442\u0438 \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${r.pattern}`
                  : `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0447\u0438\u0441\u043B\u043E: \u043F\u043E\u0432\u0438\u043D\u043D\u043E \u0431\u0443\u0442\u0438 \u043A\u0440\u0430\u0442\u043D\u0438\u043C ${t.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u043D\u0438\u0439 \u043A\u043B\u044E\u0447${t.keys.length > 1 ? "\u0456" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u043A\u043B\u044E\u0447 \u0443 ${t.origin}`;
        case "invalid_union":
          return "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456";
        case "invalid_element":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F \u0443 ${t.origin}`;
        default:
          return "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456";
      }
    };
  };
  function Mi() {
    return { localeError: K$() };
  }
  function Om() {
    return Mi();
  }
  var q$ = () => {
    let e = {
      string: { unit: "\u062D\u0631\u0648\u0641", verb: "\u06C1\u0648\u0646\u0627" },
      file: { unit: "\u0628\u0627\u0626\u0679\u0633", verb: "\u06C1\u0648\u0646\u0627" },
      array: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" },
      set: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" },
      map: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0627\u0646 \u067E\u0679",
        email: "\u0627\u06CC \u0645\u06CC\u0644 \u0627\u06CC\u0688\u0631\u06CC\u0633",
        url: "\u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644",
        emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC",
        uuid: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
        uuidv4: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 4",
        uuidv6: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 6",
        nanoid: "\u0646\u06CC\u0646\u0648 \u0622\u0626\u06CC \u0688\u06CC",
        guid: "\u062C\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
        cuid: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
        cuid2: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC 2",
        ulid: "\u06CC\u0648 \u0627\u06CC\u0644 \u0622\u0626\u06CC \u0688\u06CC",
        xid: "\u0627\u06CC\u06A9\u0633 \u0622\u0626\u06CC \u0688\u06CC",
        ksuid: "\u06A9\u06D2 \u0627\u06CC\u0633 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
        datetime:
          "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0688\u06CC\u0679 \u0679\u0627\u0626\u0645",
        date: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u062A\u0627\u0631\u06CC\u062E",
        time: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0648\u0642\u062A",
        duration: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0645\u062F\u062A",
        ipv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0627\u06CC\u0688\u0631\u06CC\u0633",
        ipv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0627\u06CC\u0688\u0631\u06CC\u0633",
        mac: "\u0627\u06CC\u0645 \u0627\u06D2 \u0633\u06CC \u0627\u06CC\u0688\u0631\u06CC\u0633",
        cidrv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0631\u06CC\u0646\u062C",
        cidrv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0631\u06CC\u0646\u062C",
        base64:
          "\u0628\u06CC\u0633 64 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF",
        base64url:
          "\u0628\u06CC\u0633 64 \u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF",
        json_string:
          "\u062C\u06D2 \u0627\u06CC\u0633 \u0627\u0648 \u0627\u06CC\u0646 \u0633\u0679\u0631\u0646\u06AF",
        e164: "\u0627\u06CC 164 \u0646\u0645\u0628\u0631",
        credit_card:
          "\u06A9\u0631\u06CC\u0688\u0679 \u06A9\u0627\u0631\u0688 \u0646\u0645\u0628\u0631",
        currency_code: "\u06A9\u0631\u0646\u0633\u06CC \u06A9\u0648\u0688",
        iban: "IBAN",
        jwt: "\u062C\u06D2 \u0688\u0628\u0644\u06CC\u0648 \u0679\u06CC",
        template_literal: "\u0627\u0646 \u067E\u0679",
      },
      o = {
        nan: "NaN",
        number: "\u0646\u0645\u0628\u0631",
        array: "\u0622\u0631\u06D2",
        null: "\u0646\u0644",
      };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: instanceof ${t.expected} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627\u060C ${s} \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648\u0627`
            : `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${r} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627\u060C ${s} \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648\u0627`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${b(t.values[0])} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`
            : `\u063A\u0644\u0637 \u0622\u067E\u0634\u0646: ${v(t.values, "|")} \u0645\u06CC\u06BA \u0633\u06D2 \u0627\u06CC\u06A9 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u0628\u06C1\u062A \u0628\u0691\u0627: ${t.origin ?? "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u06D2 ${r}${t.maximum.toString()} ${a.unit ?? "\u0639\u0646\u0627\u0635\u0631"} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`
            : `\u0628\u06C1\u062A \u0628\u0691\u0627: ${t.origin ?? "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u0627 ${r}${t.maximum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${t.origin} \u06A9\u06D2 ${r}${t.minimum.toString()} ${a.unit} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`
            : `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${t.origin} \u06A9\u0627 ${r}${t.minimum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${r.prefix}" \u0633\u06D2 \u0634\u0631\u0648\u0639 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`
            : r.format === "ends_with"
              ? `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${r.suffix}" \u067E\u0631 \u062E\u062A\u0645 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`
              : r.format === "includes"
                ? `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${r.includes}" \u0634\u0627\u0645\u0644 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`
                : r.format === "regex"
                  ? `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: \u067E\u06CC\u0679\u0631\u0646 ${r.pattern} \u0633\u06D2 \u0645\u06CC\u0686 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`
                  : `\u063A\u0644\u0637 ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u063A\u0644\u0637 \u0646\u0645\u0628\u0631: ${t.divisor} \u06A9\u0627 \u0645\u0636\u0627\u0639\u0641 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        case "unrecognized_keys":
          return `\u063A\u06CC\u0631 \u062A\u0633\u0644\u06CC\u0645 \u0634\u062F\u06C1 \u06A9\u06CC${t.keys.length > 1 ? "\u0632" : ""}: ${v(t.keys, "\u060C ")}`;
        case "invalid_key":
          return `${t.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u06A9\u06CC`;
        case "invalid_union":
          return "\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679";
        case "invalid_element":
          return `${t.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u0648\u06CC\u0644\u06CC\u0648`;
        default:
          return "\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679";
      }
    };
  };
  function Tm() {
    return { localeError: q$() };
  }
  var X$ = () => {
    let e = {
      string: { unit: "belgi", verb: "bo\u2018lishi kerak" },
      file: { unit: "bayt", verb: "bo\u2018lishi kerak" },
      array: { unit: "element", verb: "bo\u2018lishi kerak" },
      set: { unit: "element", verb: "bo\u2018lishi kerak" },
      map: { unit: "yozuv", verb: "bo\u2018lishi kerak" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "kirish",
        email: "elektron pochta manzili",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO sana va vaqti",
        date: "ISO sana",
        time: "ISO vaqt",
        duration: "ISO davomiylik",
        ipv4: "IPv4 manzil",
        ipv6: "IPv6 manzil",
        mac: "MAC manzil",
        cidrv4: "IPv4 diapazon",
        cidrv6: "IPv6 diapazon",
        base64: "base64 kodlangan satr",
        base64url: "base64url kodlangan satr",
        json_string: "JSON satr",
        e164: "E.164 raqam",
        credit_card: "kredit karta raqami",
        currency_code: "valyuta kodi",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "kirish",
      },
      o = { nan: "NaN", number: "raqam", array: "massiv" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `Noto\u2018g\u2018ri kirish: kutilgan instanceof ${t.expected}, qabul qilingan ${s}`
            : `Noto\u2018g\u2018ri kirish: kutilgan ${r}, qabul qilingan ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `Noto\u2018g\u2018ri kirish: kutilgan ${b(t.values[0])}`
            : `Noto\u2018g\u2018ri variant: quyidagilardan biri kutilgan ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Juda katta: kutilgan ${t.origin ?? "qiymat"} ${r}${t.maximum.toString()} ${a.unit} ${a.verb}`
            : `Juda katta: kutilgan ${t.origin ?? "qiymat"} ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Juda kichik: kutilgan ${t.origin} ${r}${t.minimum.toString()} ${a.unit} ${a.verb}`
            : `Juda kichik: kutilgan ${t.origin} ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Noto\u2018g\u2018ri satr: "${r.prefix}" bilan boshlanishi kerak`
            : r.format === "ends_with"
              ? `Noto\u2018g\u2018ri satr: "${r.suffix}" bilan tugashi kerak`
              : r.format === "includes"
                ? `Noto\u2018g\u2018ri satr: "${r.includes}" ni o\u2018z ichiga olishi kerak`
                : r.format === "regex"
                  ? `Noto\u2018g\u2018ri satr: ${r.pattern} shabloniga mos kelishi kerak`
                  : `Noto\u2018g\u2018ri ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `Noto\u2018g\u2018ri raqam: ${t.divisor} ning karralisi bo\u2018lishi kerak`;
        case "unrecognized_keys":
          return `Noma\u2019lum kalit${t.keys.length > 1 ? "lar" : ""}: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `${t.origin} dagi kalit noto\u2018g\u2018ri`;
        case "invalid_union":
          return "Noto\u2018g\u2018ri kirish";
        case "invalid_element":
          return `${t.origin} da noto\u2018g\u2018ri qiymat`;
        default:
          return "Noto\u2018g\u2018ri kirish";
      }
    };
  };
  function Em() {
    return { localeError: X$() };
  }
  var H$ = () => {
    let e = {
      string: { unit: "k\xFD t\u1EF1", verb: "c\xF3" },
      file: { unit: "byte", verb: "c\xF3" },
      array: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" },
      set: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" },
      map: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u0111\u1EA7u v\xE0o",
        email: "\u0111\u1ECBa ch\u1EC9 email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ng\xE0y gi\u1EDD ISO",
        date: "ng\xE0y ISO",
        time: "gi\u1EDD ISO",
        duration: "kho\u1EA3ng th\u1EDDi gian ISO",
        ipv4: "\u0111\u1ECBa ch\u1EC9 IPv4",
        ipv6: "\u0111\u1ECBa ch\u1EC9 IPv6",
        mac: "\u0111\u1ECBa ch\u1EC9 MAC",
        cidrv4: "d\u1EA3i IPv4",
        cidrv6: "d\u1EA3i IPv6",
        base64: "chu\u1ED7i m\xE3 h\xF3a base64",
        base64url: "chu\u1ED7i m\xE3 h\xF3a base64url",
        json_string: "chu\u1ED7i JSON",
        e164: "s\u1ED1 E.164",
        credit_card: "s\u1ED1 th\u1EBB t\xEDn d\u1EE5ng",
        currency_code: "m\xE3 ti\u1EC1n t\u1EC7",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u0111\u1EA7u v\xE0o",
      },
      o = { nan: "NaN", number: "s\u1ED1", array: "m\u1EA3ng" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i instanceof ${t.expected}, nh\u1EADn \u0111\u01B0\u1EE3c ${s}`
            : `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${r}, nh\u1EADn \u0111\u01B0\u1EE3c ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${b(t.values[0])}`
            : `T\xF9y ch\u1ECDn kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i m\u1ED9t trong c\xE1c gi\xE1 tr\u1ECB ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${t.origin ?? "gi\xE1 tr\u1ECB"} ${a.verb} ${r}${t.maximum.toString()} ${a.unit ?? "ph\u1EA7n t\u1EED"}`
            : `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${t.origin ?? "gi\xE1 tr\u1ECB"} ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${t.origin} ${a.verb} ${r}${t.minimum.toString()} ${a.unit}`
            : `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${t.origin} ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i b\u1EAFt \u0111\u1EA7u b\u1EB1ng "${r.prefix}"`
            : r.format === "ends_with"
              ? `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i k\u1EBFt th\xFAc b\u1EB1ng "${r.suffix}"`
              : r.format === "includes"
                ? `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i bao g\u1ED3m "${r.includes}"`
                : r.format === "regex"
                  ? `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i kh\u1EDBp v\u1EDBi m\u1EABu ${r.pattern}`
                  : `${i[r.format] ?? t.format} kh\xF4ng h\u1EE3p l\u1EC7`;
        }
        case "not_multiple_of":
          return `S\u1ED1 kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i l\xE0 b\u1ED9i s\u1ED1 c\u1EE7a ${t.divisor}`;
        case "unrecognized_keys":
          return `Kh\xF3a kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADn d\u1EA1ng: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `Kh\xF3a kh\xF4ng h\u1EE3p l\u1EC7 trong ${t.origin}`;
        case "invalid_union":
          return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
        case "invalid_element":
          return `Gi\xE1 tr\u1ECB kh\xF4ng h\u1EE3p l\u1EC7 trong ${t.origin}`;
        default:
          return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
      }
    };
  };
  function Am() {
    return { localeError: H$() };
  }
  var Y$ = () => {
    let e = {
      string: { unit: "\u5B57\u7B26", verb: "\u5305\u542B" },
      file: { unit: "\u5B57\u8282", verb: "\u5305\u542B" },
      array: { unit: "\u9879", verb: "\u5305\u542B" },
      set: { unit: "\u9879", verb: "\u5305\u542B" },
      map: { unit: "\u9879", verb: "\u5305\u542B" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u8F93\u5165",
        email: "\u7535\u5B50\u90AE\u4EF6",
        url: "URL",
        emoji: "\u8868\u60C5\u7B26\u53F7",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO\u65E5\u671F\u65F6\u95F4",
        date: "ISO\u65E5\u671F",
        time: "ISO\u65F6\u95F4",
        duration: "ISO\u65F6\u957F",
        ipv4: "IPv4\u5730\u5740",
        ipv6: "IPv6\u5730\u5740",
        mac: "MAC\u5730\u5740",
        cidrv4: "IPv4\u7F51\u6BB5",
        cidrv6: "IPv6\u7F51\u6BB5",
        base64: "base64\u7F16\u7801\u5B57\u7B26\u4E32",
        base64url: "base64url\u7F16\u7801\u5B57\u7B26\u4E32",
        json_string: "JSON\u5B57\u7B26\u4E32",
        e164: "E.164\u53F7\u7801",
        credit_card: "\u4FE1\u7528\u5361\u53F7",
        currency_code: "\u8D27\u5E01\u4EE3\u7801",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u8F93\u5165",
      },
      o = { nan: "NaN", number: "\u6570\u5B57", array: "\u6570\u7EC4", null: "\u7A7A\u503C(null)" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B instanceof ${t.expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${s}`
            : `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${r}\uFF0C\u5B9E\u9645\u63A5\u6536 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${b(t.values[0])}`
            : `\u65E0\u6548\u9009\u9879\uFF1A\u671F\u671B\u4EE5\u4E0B\u4E4B\u4E00 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${t.origin ?? "\u503C"} ${r}${t.maximum.toString()} ${a.unit ?? "\u4E2A\u5143\u7D20"}`
            : `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${t.origin ?? "\u503C"} ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${t.origin} ${r}${t.minimum.toString()} ${a.unit}`
            : `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${t.origin} ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${r.prefix}" \u5F00\u5934`
            : r.format === "ends_with"
              ? `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${r.suffix}" \u7ED3\u5C3E`
              : r.format === "includes"
                ? `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u5305\u542B "${r.includes}"`
                : r.format === "regex"
                  ? `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u6EE1\u8DB3\u6B63\u5219\u8868\u8FBE\u5F0F ${r.pattern}`
                  : `\u65E0\u6548${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u65E0\u6548\u6570\u5B57\uFF1A\u5FC5\u987B\u662F ${t.divisor} \u7684\u500D\u6570`;
        case "unrecognized_keys":
          return `\u51FA\u73B0\u672A\u77E5\u7684\u952E(key): ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `${t.origin} \u4E2D\u7684\u952E(key)\u65E0\u6548`;
        case "invalid_union":
          return "\u65E0\u6548\u8F93\u5165";
        case "invalid_element":
          return `${t.origin} \u4E2D\u5305\u542B\u65E0\u6548\u503C(value)`;
        default:
          return "\u65E0\u6548\u8F93\u5165";
      }
    };
  };
  function Dm() {
    return { localeError: Y$() };
  }
  var Q$ = () => {
    let e = {
      string: { unit: "\u5B57\u5143", verb: "\u64C1\u6709" },
      file: { unit: "\u4F4D\u5143\u7D44", verb: "\u64C1\u6709" },
      array: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" },
      set: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" },
      map: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u8F38\u5165",
        email: "\u90F5\u4EF6\u5730\u5740",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u65E5\u671F\u6642\u9593",
        date: "ISO \u65E5\u671F",
        time: "ISO \u6642\u9593",
        duration: "ISO \u671F\u9593",
        ipv4: "IPv4 \u4F4D\u5740",
        ipv6: "IPv6 \u4F4D\u5740",
        mac: "MAC \u4F4D\u5740",
        cidrv4: "IPv4 \u7BC4\u570D",
        cidrv6: "IPv6 \u7BC4\u570D",
        base64: "base64 \u7DE8\u78BC\u5B57\u4E32",
        base64url: "base64url \u7DE8\u78BC\u5B57\u4E32",
        json_string: "JSON \u5B57\u4E32",
        e164: "E.164 \u6578\u503C",
        credit_card: "\u4FE1\u7528\u5361\u865F",
        currency_code: "\u8CA8\u5E63\u4EE3\u78BC",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u8F38\u5165",
      },
      o = { nan: "NaN" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA instanceof ${t.expected}\uFF0C\u4F46\u6536\u5230 ${s}`
            : `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${r}\uFF0C\u4F46\u6536\u5230 ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${b(t.values[0])}`
            : `\u7121\u6548\u7684\u9078\u9805\uFF1A\u9810\u671F\u70BA\u4EE5\u4E0B\u5176\u4E2D\u4E4B\u4E00 ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${t.origin ?? "\u503C"} \u61C9\u70BA ${r}${t.maximum.toString()} ${a.unit ?? "\u500B\u5143\u7D20"}`
            : `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${t.origin ?? "\u503C"} \u61C9\u70BA ${r}${t.maximum.toString()}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${t.origin} \u61C9\u70BA ${r}${t.minimum.toString()} ${a.unit}`
            : `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${t.origin} \u61C9\u70BA ${r}${t.minimum.toString()}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${r.prefix}" \u958B\u982D`
            : r.format === "ends_with"
              ? `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${r.suffix}" \u7D50\u5C3E`
              : r.format === "includes"
                ? `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u5305\u542B "${r.includes}"`
                : r.format === "regex"
                  ? `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u7B26\u5408\u683C\u5F0F ${r.pattern}`
                  : `\u7121\u6548\u7684 ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `\u7121\u6548\u7684\u6578\u5B57\uFF1A\u5FC5\u9808\u70BA ${t.divisor} \u7684\u500D\u6578`;
        case "unrecognized_keys":
          return `\u7121\u6CD5\u8B58\u5225\u7684\u9375\u503C${t.keys.length > 1 ? "\u5011" : ""}\uFF1A${v(t.keys, "\u3001")}`;
        case "invalid_key":
          return `${t.origin} \u4E2D\u6709\u7121\u6548\u7684\u9375\u503C`;
        case "invalid_union":
          return "\u7121\u6548\u7684\u8F38\u5165\u503C";
        case "invalid_element":
          return `${t.origin} \u4E2D\u6709\u7121\u6548\u7684\u503C`;
        default:
          return "\u7121\u6548\u7684\u8F38\u5165\u503C";
      }
    };
  };
  function jm() {
    return { localeError: Q$() };
  }
  var ey = () => {
    let e = {
      string: { unit: "\xE0mi", verb: "n\xED" },
      file: { unit: "bytes", verb: "n\xED" },
      array: { unit: "nkan", verb: "n\xED" },
      set: { unit: "nkan", verb: "n\xED" },
      map: { unit: "nkan", verb: "n\xED" },
    };
    function n(t) {
      return e[t] ?? null;
    }
    let i = {
        regex: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9",
        email: "\xE0d\xEDr\u1EB9\u0301s\xEC \xECm\u1EB9\u0301l\xEC",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\xE0k\xF3k\xF2 ISO",
        date: "\u1ECDj\u1ECD\u0301 ISO",
        time: "\xE0k\xF3k\xF2 ISO",
        duration: "\xE0k\xF3k\xF2 t\xF3 p\xE9 ISO",
        ipv4: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv4",
        ipv6: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv6",
        mac: "\xE0d\xEDr\u1EB9\u0301s\xEC MAC",
        cidrv4: "\xE0gb\xE8gb\xE8 IPv4",
        cidrv6: "\xE0gb\xE8gb\xE8 IPv6",
        base64: "\u1ECD\u0300r\u1ECD\u0300 t\xED a k\u1ECD\u0301 n\xED base64",
        base64url: "\u1ECD\u0300r\u1ECD\u0300 base64url",
        json_string: "\u1ECD\u0300r\u1ECD\u0300 JSON",
        e164: "n\u1ECD\u0301mb\xE0 E.164",
        credit_card: "n\u1ECDmba kaadi gbese",
        currency_code: "koodu ow\xF3",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9",
      },
      o = { nan: "NaN", number: "n\u1ECD\u0301mb\xE0", array: "akop\u1ECD" };
    return (t) => {
      switch (t.code) {
        case "invalid_type": {
          let r = o[t.expected] ?? t.expected,
            a = _(t.input),
            s = o[a] ?? a;
          return /^[A-Z]/.test(t.expected)
            ? `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi instanceof ${t.expected}, \xE0m\u1ECD\u0300 a r\xED ${s}`
            : `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${r}, \xE0m\u1ECD\u0300 a r\xED ${s}`;
        }
        case "invalid_value":
          return t.values.length === 1
            ? `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${b(t.values[0])}`
            : `\xC0\u1E63\xE0y\xE0n a\u1E63\xEC\u1E63e: yan \u1ECD\u0300kan l\xE1ra ${v(t.values, "|")}`;
        case "too_big": {
          let r = t.inclusive ? "<=" : "<",
            a = n(t.origin);
          return a
            ? `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${t.origin ?? "iye"} ${a.verb} ${r}${t.maximum} ${a.unit}`
            : `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 ${r}${t.maximum}`;
        }
        case "too_small": {
          let r = t.inclusive ? ">=" : ">",
            a = n(t.origin);
          return a
            ? `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${t.origin} ${a.verb} ${r}${t.minimum} ${a.unit}`
            : `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 ${r}${t.minimum}`;
        }
        case "invalid_format": {
          let r = t;
          return r.format === "starts_with"
            ? `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\u1EB9\u0300r\u1EB9\u0300 p\u1EB9\u0300l\xFA "${r.prefix}"`
            : r.format === "ends_with"
              ? `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 par\xED p\u1EB9\u0300l\xFA "${r.suffix}"`
              : r.format === "includes"
                ? `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 n\xED "${r.includes}"`
                : r.format === "regex"
                  ? `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\xE1 \xE0p\u1EB9\u1EB9r\u1EB9 mu ${r.pattern}`
                  : `A\u1E63\xEC\u1E63e: ${i[r.format] ?? t.format}`;
        }
        case "not_multiple_of":
          return `N\u1ECD\u0301mb\xE0 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 j\u1EB9\u0301 \xE8y\xE0 p\xEDp\xEDn ti ${t.divisor}`;
        case "unrecognized_keys":
          return `B\u1ECDt\xECn\xEC \xE0\xECm\u1ECD\u0300: ${v(t.keys, ", ")}`;
        case "invalid_key":
          return `B\u1ECDt\xECn\xEC a\u1E63\xEC\u1E63e n\xEDn\xFA ${t.origin}`;
        case "invalid_union":
          return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
        case "invalid_element":
          return `Iye a\u1E63\xEC\u1E63e n\xEDn\xFA ${t.origin}`;
        default:
          return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
      }
    };
  };
  function Um() {
    return { localeError: ey() };
  }
  var Cm,
    Vc = Symbol("ZodOutput"),
    Mc = Symbol("ZodInput"),
    Fi = class {
      constructor() {
        ((this._map = new WeakMap()), (this._idmap = new Map()));
      }
      add(n, ...i) {
        let o = i[0];
        return (
          this._map.set(n, o),
          o && typeof o == "object" && "id" in o && this._idmap.set(o.id, n),
          this
        );
      }
      clear() {
        return ((this._map = new WeakMap()), (this._idmap = new Map()), this);
      }
      remove(n) {
        let i = this._map.get(n);
        return (
          i && typeof i == "object" && "id" in i && this._idmap.delete(i.id),
          this._map.delete(n),
          this
        );
      }
      get(n) {
        let i = n._zod.parent;
        if (i) {
          let o = { ...(this.get(i) ?? {}) };
          delete o.id;
          let t = { ...o, ...this._map.get(n) };
          return Object.keys(t).length ? t : void 0;
        }
        return this._map.get(n);
      }
      has(n) {
        return this._map.has(n);
      }
    };
  function Bi() {
    return new Fi();
  }
  (Cm = globalThis).__zod_globalRegistry ?? (Cm.__zod_globalRegistry = Bi());
  var ve = globalThis.__zod_globalRegistry;
  var ke = Symbol.for("zod.compile.invalid"),
    Lm = Symbol.for("zod.compile.fallback"),
    We = class extends Error {
      constructor(n = "z.compile does not support async refinements, transforms, or checks") {
        (super(n), (this.name = "ZodCompileAsyncError"));
      }
    },
    F = class extends Error {
      constructor(n, i = !0) {
        (super(`z.compile does not support ${n}; this schema must use the runtime parser`),
          (this.name = "ZodCompileUnsupportedError"),
          (this.islandable = i));
      }
    };
  function ny(e, n) {
    try {
      return Ji(e, { assertOnly: !0 });
    } catch {
      return n;
    }
  }
  function Jc(e, n) {
    try {
      let i = Ji(e),
        o = Wi(e, i);
      return ((o._zod.bag.validator = ny(e, i)), o);
    } catch (i) {
      if (n?.strict) throw i;
      return e;
    }
  }
  function Wi(e, n) {
    if (Li(e)) throw new F("a schema whose subtree contains a reference cycle");
    let i = G(e),
      o = e._zod.run,
      t = o.__originalRun ?? o,
      r = (a, s) => {
        if (
          s?.async ||
          s?.direction === "backward" ||
          s?.skipChecks ||
          s?.[Lm] ||
          (s && Ri(s, a.value))
        )
          return t(a, s);
        let u = n(a.value);
        return u !== ke ? ((a.value = u), a) : (s && (s[Lm] = !0), t(a, s));
      };
    return (
      (r.__originalRun = t),
      (i._zod.bag.fallbackRun = t),
      (i._zod.bag.validator = n),
      (i._zod.run = r),
      o.__originalRun || ry(i, e, n),
      i
    );
  }
  function ry(e, n, i) {
    let o = e,
      t = n;
    if (typeof t.safeParse == "function") {
      let r = t.safeParse;
      o.safeParse = (a, s) => {
        let u = i(a);
        return u !== ke ? { success: !0, data: u } : r(a, s);
      };
    }
    if (typeof t.parse == "function") {
      let r = t.parse;
      o.parse = (a, s) => {
        let u = i(a);
        return u !== ke ? u : r(a, s);
      };
    }
  }
  function Ji(e, n) {
    let i = !0;
    try {
      i = Li(e);
    } catch {}
    if (i) throw new F("a schema whose subtree contains a reference cycle");
    let o = { constants: new Map(), constantCounter: 0, varCounter: 0, definite: !0 },
      t = new Et(["input"]),
      r = te(t, o, e, "input", !n?.assertOnly);
    t.write(r === null ? "return true;" : `return ${r};`);
    let a = ["INVALID", ...o.constants.keys()],
      s = [ke, ...o.constants.values()],
      u = t.content.join(`
`),
      c = n?.debug
        ? a.length > 0
          ? `// Constants: ${a.join(", ")}
${u}`
          : u
        : "",
      l = Function,
      f = `return (input) => {
${u}
}`,
      d;
    try {
      d = new l(...a, f)(...s);
    } catch (m) {
      throw new F(`this schema (generated code failed to evaluate: ${m.message})`);
    }
    return (n?.debug && (d.code = c), (d.definite = o.definite), d);
  }
  function C(e, n) {
    for (let [o, t] of e.constants) if (t === n) return o;
    let i = `c${e.constantCounter++}`;
    return (e.constants.set(i, n), i);
  }
  function Ut(e, n) {
    return ((e.definite = !1), C(e, n));
  }
  function A(e) {
    return `v${e.varCounter++}`;
  }
  function iy(e, n) {
    let i = e._zod.run({ value: n, issues: [] }, {});
    if (i && typeof i.then == "function") return ke;
    let o = i;
    return o.issues.length === 0 ? o.value : ke;
  }
  function ye(e, n, i, o, t = !0) {
    let r = e.content.length,
      a = n.constants.size,
      s = n.constantCounter,
      u = n.varCounter;
    try {
      return te(e, n, i, o, t);
    } catch (c) {
      if (!(c instanceof F) || !c.islandable) throw c;
      if (((e.content.length = r), n.constants.size > a)) {
        let l = Array.from(n.constants.keys()).slice(a);
        for (let f of l) n.constants.delete(f);
      }
      return ((n.constantCounter = s), (n.varCounter = u), oy(e, n, i, o));
    }
  }
  function oy(e, n, i, o) {
    n.definite = !1;
    let t = C(n, i),
      r = C(n, iy),
      a = A(n);
    return (
      e.write(`const ${a} = ${r}(${t}, ${o});`), e.write(`if (${a} === INVALID) return INVALID;`), a
    );
  }
  var ay = new Set([
    "max_size",
    "min_size",
    "size_equals",
    "max_length",
    "min_length",
    "length_equals",
  ]);
  function sy(e, n, i, o) {
    let t = i._zod.def.checks;
    if (!t || t.length === 0) return o;
    let r = o;
    for (let a of t) {
      let s = a._zod.def;
      if (s.when && !ay.has(s.check)) throw new F('check with a custom "when" condition');
      switch (s.check) {
        case "greater_than":
          cy(e, n, s, r);
          break;
        case "less_than":
          uy(e, n, s, r);
          break;
        case "multiple_of":
          ly(e, n, s, r);
          break;
        case "number_format":
          Bm(e, s, r);
          break;
        case "min_length": {
          let u = Dt(s.minimum, "min_length"),
            c = Fc(e, n, r, `${r}.length >= ${u} && ${r}.length < ${s.minimum * 2}`);
          e.write(`if (${c} < ${u}) return INVALID;`);
          break;
        }
        case "max_length": {
          let u = Dt(s.maximum, "max_length"),
            c = Fc(e, n, r, `${r}.length > ${u}`);
          e.write(`if (${c} > ${u}) return INVALID;`);
          break;
        }
        case "length_equals": {
          let u = Dt(s.length, "length_equals"),
            c = Fc(e, n, r, `${r}.length >= ${u} && ${r}.length <= ${s.length * 2}`);
          e.write(`if (${c} !== ${u}) return INVALID;`);
          break;
        }
        case "min_size":
          e.write(`if (${r}.size < ${Dt(s.minimum, "min_size")}) return INVALID;`);
          break;
        case "max_size":
          e.write(`if (${r}.size > ${Dt(s.maximum, "max_size")}) return INVALID;`);
          break;
        case "size_equals":
          e.write(`if (${r}.size !== ${Dt(s.size, "size_equals")}) return INVALID;`);
          break;
        case "string_format":
          r = Wm(e, n, s, r);
          break;
        case "custom":
          r = hy(e, n, a, r);
          break;
        case "bigint_format":
          dy(e, s, r);
          break;
        case "mime_type":
          fy(e, n, s, r);
          break;
        case "property":
          py(e, n, s, r);
          break;
        case "properties":
          my(e, n, s, r);
          break;
        case "overwrite": {
          let u = A(n);
          (gy(e, n, a, r, u), (r = u));
          break;
        }
        default:
          throw new F(`check type ${s.check}`);
      }
    }
    return r;
  }
  function Fc(e, n, i, o) {
    let t = C(n, Pt),
      r = A(n);
    return (
      e.write(`const ${r} = typeof ${i} === "string" && ${o} ? ${t}(${i}) : ${i}.length;`), r
    );
  }
  function Dt(e, n) {
    if (typeof e != "number" || !Number.isFinite(e)) throw new F(`${n} bound of type ${typeof e}`);
    return `${e}`;
  }
  function Fm(e, n) {
    if (typeof n == "bigint") return `${n}n`;
    if (typeof n == "number") {
      if (Number.isNaN(n)) throw new F("comparison check with NaN bound");
      return `${n}`;
    }
    if (n instanceof Date) {
      if (Number.isNaN(n.getTime())) throw new F("comparison check with Invalid Date bound");
      return C(e, n);
    }
    throw new F(`comparison check bound of type ${typeof n}`);
  }
  function cy(e, n, i, o) {
    let t = i.inclusive ? "<" : "<=";
    e.write(`if (${o} ${t} ${Fm(n, i.value)}) return INVALID;`);
  }
  function uy(e, n, i, o) {
    let t = i.inclusive ? ">" : ">=";
    e.write(`if (${o} ${t} ${Fm(n, i.value)}) return INVALID;`);
  }
  function ly(e, n, i, o) {
    if (typeof i.value == "bigint") {
      if (i.value === BigInt(0)) throw new F("multiple_of check with a zero divisor");
      e.write(`if (${o} % ${i.value}n !== 0n) return INVALID;`);
    } else {
      let t = C(n, Wn);
      e.write(`if (${t}(${o}, ${Dt(i.value, "multiple_of")}) !== 0) return INVALID;`);
    }
  }
  function Bm(e, n, i) {
    let o = n.format;
    switch (o) {
      case "safeint":
        e.write(`if (!Number.isSafeInteger(${i})) return INVALID;`);
        break;
      case "int32":
        e.write(
          `if (!Number.isInteger(${i}) || ${i} < -2147483648 || ${i} > 2147483647) return INVALID;`,
        );
        break;
      case "uint32":
        e.write(`if (!Number.isInteger(${i}) || ${i} < 0 || ${i} > 4294967295) return INVALID;`);
        break;
      case "float32":
        e.write(
          `if (!Number.isFinite(${i}) || ${i} < -3.4028234663852886e38 || ${i} > 3.4028234663852886e38) return INVALID;`,
        );
        break;
      case "float64":
        e.write(`if (!Number.isFinite(${i})) return INVALID;`);
        break;
      default:
        throw new F(`number format ${o}`);
    }
  }
  function dy(e, n, i) {
    let o = n.format;
    if (o)
      switch (o) {
        case "int64":
          e.write(
            `if (${i} < -9223372036854775808n || ${i} > 9223372036854775807n) return INVALID;`,
          );
          break;
        case "uint64":
          e.write(`if (${i} < 0n || ${i} > 18446744073709551615n) return INVALID;`);
          break;
        default:
          throw new F(`bigint format ${o}`);
      }
  }
  function fy(e, n, i, o) {
    let t = i.mime;
    if (t && t.length > 0) {
      let r = C(n, new Set(t));
      e.write(`if (!${r}.has(${o}.type)) return INVALID;`);
    }
  }
  function my(e, n, i, o) {
    if (i.when) throw new F('check with a custom "when" condition');
    e.write(`if (${o} == null) return INVALID;`);
    let t = i.shape;
    for (let r of Reflect.ownKeys(t)) {
      let a = typeof r == "symbol" ? C(n, r) : we(r),
        s = A(n);
      (e.write(`const ${s} = ${o}[${a}];`), ye(e, n, t[r], s, !1));
    }
  }
  function py(e, n, i, o) {
    let t = `${o}[${JSON.stringify(i.property)}]`;
    te(e, n, i.schema, t);
  }
  function gy(e, n, i, o, t) {
    let r = i._zod.def.tx;
    if (!r) throw new F("overwrite check without a transform function");
    if (Ct(r)) throw new We("z.compile: async overwrite transforms are not supported");
    let a = C(n, r);
    e.write(`const ${t} = ${a}(${o});`);
  }
  function Bc() {
    throw new Pe();
  }
  function Gc(e) {
    this.issues.push(e);
  }
  function hy(e, n, i, o) {
    let t = i._zod.def;
    if (t.fn) {
      if (Ct(t.fn)) throw new We("z.compile: async .refine() predicates are not supported");
      let r = Ut(n, t.fn),
        a = C(n, Bc),
        s = A(n);
      return (
        e.write(`const ${s} = ${r}(${o});`),
        e.write(`if (${s} instanceof Promise) ${a}();`),
        e.write(`if (!${s}) return INVALID;`),
        o
      );
    }
    if (i._zod.check) {
      if (Ct(i._zod.check))
        throw new We("z.compile: async .superRefine() / check functions are not supported");
      let r = i._zod.check,
        s = Ut(n, (c) => {
          let l = { value: c, issues: [], addIssue: Gc };
          return (r(l) instanceof Promise && Bc(), l.issues.length === 0 ? l.value : ke);
        }),
        u = A(n);
      return (
        e.write(`const ${u} = ${s}(${o});`), e.write(`if (${u} === INVALID) return INVALID;`), u
      );
    }
    throw new F("custom check without a predicate or check function");
  }
  var vy = new Set([
    "cidrv4",
    "cuid",
    "cuid2",
    "date",
    "datetime",
    "duration",
    "e164",
    "email",
    "emoji",
    "ends_with",
    "guid",
    "includes",
    "ipv4",
    "ksuid",
    "lowercase",
    "mac",
    "nanoid",
    "regex",
    "starts_with",
    "time",
    "ulid",
    "uppercase",
    "uuid",
    "xid",
  ]);
  function Wm(e, n, i, o, t = !0) {
    let r = i.format;
    if (r === "base64") {
      let c = C(n, lr);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (r === "base64url") {
      let c = C(n, Ii);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (r === "jwt") {
      let c = C(n, Ni),
        l = C(n, i.alg ?? null);
      return (e.write(`if (!${c}(${o}, ${l})) return INVALID;`), o);
    }
    if (r === "ipv6") {
      let c = C(n, ur);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (r === "cidrv6") {
      let c = C(n, xi);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (r === "credit_card") {
      let c = C(n, Si);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (r === "iban") {
      let c = C(n, zi);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    let a = i;
    if (
      r === "url" ||
      r === "httpurl" ||
      a.normalize ||
      a.hostname !== void 0 ||
      a.protocol !== void 0
    ) {
      let c = C(n, bi),
        l = C(n, i),
        f = A(n),
        d = A(n);
      if (
        (e.write(`const ${f} = ${o}.trim();`),
        e.write(`const ${d} = ${c}(${f}, ${l});`),
        e.write(`if (typeof ${d} === "number") return INVALID;`),
        a.hostname !== void 0)
      ) {
        let $ = C(n, _i);
        e.write(`if (!${$}(${d}, ${l}.hostname)) return INVALID;`);
      }
      if (a.protocol !== void 0) {
        let $ = C(n, wi);
        e.write(`if (!${$}(${d}, ${l}.protocol)) return INVALID;`);
      }
      if (!t) return null;
      let m = A(n),
        g = a.normalize ? `${d}.href` : `${C(n, cr)}(${f})`;
      return (e.write(`const ${m} = ${g};`), m);
    }
    let s = i.fn;
    if (s) {
      if (Ct(s)) throw new F(`async string format ${r}`);
      let c = C(n, s);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (vy.has(r) && i.pattern) {
      let c = C(n, i.pattern);
      return (e.write(`${c}.lastIndex = 0;`), e.write(`if (!${c}.test(${o})) return INVALID;`), o);
    }
    let u = i.format;
    switch (u) {
      case "regex":
        throw new F("regex format without a pattern");
      case "lowercase":
        e.write(`if (${o} !== ${o}.toLowerCase()) return INVALID;`);
        break;
      case "uppercase":
        e.write(`if (${o} !== ${o}.toUpperCase()) return INVALID;`);
        break;
      case "includes":
        e.write(`if (!${o}.includes(${we(i.includes)})) return INVALID;`);
        break;
      case "starts_with": {
        let c = i.prefix;
        e.write(`if (${o}.slice(0, ${c.length}) !== ${we(c)}) return INVALID;`);
        break;
      }
      case "ends_with": {
        let c = i.suffix;
        e.write(`if (${o}.slice(-${c.length}) !== ${we(c)}) return INVALID;`);
        break;
      }
      default:
        throw new F(`string format ${u}`);
    }
    return o;
  }
  function te(e, n, i, o, t = !0) {
    let r = i._zod.def,
      a = r.type;
    if (r.coerce) throw new F(`coercion (z.coerce.${a}())`);
    let s = t || !!r.checks?.length,
      u;
    switch (a) {
      case "string":
        u = $y(e, n, i, o, s);
        break;
      case "number":
        u = yy(e, i, o);
        break;
      case "boolean":
        u = by(e, o);
        break;
      case "bigint":
        u = _y(e, i, o);
        break;
      case "symbol":
        u = wy(e, o);
        break;
      case "undefined":
        u = xy(e, o);
        break;
      case "null":
        u = ky(e, o);
        break;
      case "any":
      case "unknown":
        u = o;
        break;
      case "never":
        (e.write("return INVALID;"), (u = o));
        break;
      case "void":
        u = Iy(e, o);
        break;
      case "nan":
        u = Sy(e, o);
        break;
      case "date":
        u = zy(e, o);
        break;
      case "object":
        u = Ny(e, n, i, o, s);
        break;
      case "optional":
        u = Py(e, n, i, o, s);
        break;
      case "nullable":
        u = Ey(e, n, i, o, s);
        break;
      case "array":
        u = Ay(e, n, i, o, s);
        break;
      case "literal":
        u = Dy(e, n, i, o);
        break;
      case "enum":
        u = jy(e, n, i, o);
        break;
      case "readonly": {
        let c = Zm(e, n, i, o),
          l = A(n);
        (e.write(`const ${l} = Object.freeze(${c});`), (u = l));
        break;
      }
      case "success":
        (Zm(e, n, i, o), (u = "true"));
        break;
      case "default":
      case "prefault":
        u = Uy(e, n, i, o);
        break;
      case "nonoptional":
        u = Cy(e, n, i, o);
        break;
      case "tuple":
        u = Ly(e, n, i, o);
        break;
      case "union":
        u = Ry(e, n, i, o);
        break;
      case "intersection":
        u = My(e, n, i, o);
        break;
      case "record":
        u = Fy(e, n, i, o);
        break;
      case "map":
        u = Wy(e, n, i, o);
        break;
      case "set":
        u = Jy(e, n, i, o);
        break;
      case "file":
        u = Gy(e, o);
        break;
      case "template_literal":
        u = Ky(e, n, i, o);
        break;
      case "lazy":
        u = qy(e, n, i, o);
        break;
      case "pipe":
        u = Xy(e, n, i, o);
        break;
      case "custom":
        u = Hy(e, n, i, o);
        break;
      case "transform":
        u = eb(e, n, i, o);
        break;
      case "catch":
        u = Qy(e, n, i, o);
        break;
      default:
        throw new F(`schema type ${a}`);
    }
    return u === null ? null : sy(e, n, i, u);
  }
  function $y(e, n, i, o, t = !0) {
    e.write(`if (typeof ${o} !== "string") return INVALID;`);
    let r = i._zod.def;
    return r.format === void 0 ? o : Wm(e, n, r, o, t);
  }
  function yy(e, n, i) {
    e.write(`if (typeof ${i} !== "number" || !Number.isFinite(${i})) return INVALID;`);
    let o = n._zod.def;
    return (o.check === "number_format" && o.format && Bm(e, { format: o.format }, i), i);
  }
  function by(e, n) {
    return (e.write(`if (typeof ${n} !== "boolean") return INVALID;`), n);
  }
  function _y(e, n, i) {
    e.write(`if (typeof ${i} !== "bigint") return INVALID;`);
    let o = n._zod.def;
    if (o.format)
      switch (o.format) {
        case "int64":
          e.write(
            `if (${i} < -9223372036854775808n || ${i} > 9223372036854775807n) return INVALID;`,
          );
          break;
        case "uint64":
          e.write(`if (${i} < 0n || ${i} > 18446744073709551615n) return INVALID;`);
          break;
      }
    return i;
  }
  function wy(e, n) {
    return (e.write(`if (typeof ${n} !== "symbol") return INVALID;`), n);
  }
  function xy(e, n) {
    return (e.write(`if (${n} !== undefined) return INVALID;`), n);
  }
  function ky(e, n) {
    return (e.write(`if (${n} !== null) return INVALID;`), n);
  }
  function Iy(e, n) {
    return (e.write(`if (${n} !== undefined) return INVALID;`), n);
  }
  function Sy(e, n) {
    return (e.write(`if (typeof ${n} !== "number" || !Number.isNaN(${n})) return INVALID;`), n);
  }
  function zy(e, n) {
    return (
      e.write(`if (!(${n} instanceof Date) || Number.isNaN(${n}.getTime())) return INVALID;`), n
    );
  }
  function Ny(e, n, i, o, t = !0) {
    let r = i._zod.def;
    e.write(
      `if (typeof ${o} !== "object" || ${o} === null || Array.isArray(${o})) return INVALID;`,
    );
    let a = r.shape,
      s = Object.keys(a),
      u = Object.getOwnPropertySymbols(a),
      c = u.length ? [...s, ...u] : s,
      l = (x) => (typeof x == "symbol" ? C(n, x) : we(x)),
      f = (x) => (typeof x == "symbol" ? `[${l(x)}]` : we(x)),
      d = a;
    if (s.includes("__proto__")) throw new F('object shape key "__proto__"');
    let m = new Map();
    for (let x of c) {
      let O = d[x],
        I = l(x),
        E = A(n);
      if ((e.write(`const ${E} = ${o}[${I}];`), O._zod.optin !== void 0)) {
        let D = A(n);
        (e.write(`let ${D} = (() => {`),
          e.indented((R) => {
            let be = ye(R, n, O, E);
            R.write(`return ${be};`);
          }),
          e.write("})();"),
          O._zod.optout === "optional"
            ? (e.write(`if (${D} === INVALID) {`),
              e.indented((R) => {
                (R.write(`if (${I} in ${o}) return INVALID;`), R.write(`${D} = undefined;`));
              }),
              e.write("}"))
            : e.write(`if (${D} === INVALID) return INVALID;`),
          m.set(x, D));
      } else {
        Ty(O) && e.write(`if (!(${I} in ${o})) return INVALID;`);
        let D = ye(e, n, O, E, t);
        D !== null && m.set(x, D);
      }
    }
    let g = r.catchall,
      $ = "none";
    if (g) {
      let x = g._zod.def.type;
      if (x === "never") {
        let O = s.map((I) => `k !== ${we(I)}`).join(" && ") || "true";
        (e.write(`for (const k in ${o}) {`),
          e.indented((I) => {
            I.write(`if (${O}) return INVALID;`);
          }),
          e.write("}"));
      } else
        (x === "unknown" || x === "any") && !g._zod.def.checks?.length
          ? ($ = "passthrough")
          : ($ = "schema");
    }
    let w = A(n),
      z = c.some((x) => Rm(d[x]) || Wc(d[x]));
    if (!t) {
      if ($ === "schema") {
        let x = s.length > 0 ? C(n, new Set(s)) : null;
        (e.write(`for (const k in ${o}) {`),
          e.indented((O) => {
            (O.write('if (k === "__proto__") continue;'),
              x && O.write(`if (${x}.has(k)) continue;`));
            let I = A(n);
            (O.write(`const ${I} = ${o}[k];`), ye(O, n, g, I, !1));
          }),
          e.write("}"));
      }
      return null;
    }
    if (z) {
      e.write(`const ${w} = {};`);
      for (let x of c) {
        let O = l(x),
          I = m.get(x);
        Wc(d[x])
          ? e.write(`if (${O} in ${o}) ${w}[${O}] = ${I};`)
          : Rm(d[x])
            ? e.write(`if (${I} !== undefined || ${O} in ${o}) ${w}[${O}] = ${I};`)
            : e.write(`${w}[${O}] = ${I};`);
      }
    } else {
      let x = c.map((O) => `${f(O)}: ${m.get(O)}`).join(", ");
      e.write(`const ${w} = { ${x} };`);
    }
    if ($ !== "none") {
      let x = s.length > 0 ? C(n, new Set(s)) : null;
      (e.write(`for (const k in ${o}) {`),
        e.indented((O) => {
          if (
            (O.write('if (k === "__proto__") continue;'),
            x && O.write(`if (${x}.has(k)) continue;`),
            $ === "passthrough")
          )
            O.write(`${w}[k] = ${o}[k];`);
          else {
            let I = A(n);
            O.write(`const ${I} = ${o}[k];`);
            let E = ye(O, n, g, I);
            O.write(`${w}[k] = ${E};`);
          }
        }),
        e.write("}"));
    }
    return w;
  }
  function Py(e, n, i, o, t = !0) {
    let r = i._zod.def;
    if (Oy(i)) return te(e, n, r.innerType, o, t);
    if (r.innerType._zod.optin === "defaulted") {
      let s = A(n),
        u = A(n);
      return (
        e.write(`let ${s};`),
        e.write(`if (${o} === undefined) {`),
        e.indented((c) => {
          (c.write(`const ${u} = (() => {`),
            c.indented((l) => {
              let f = te(l, n, r.innerType, o);
              l.write(`return ${f};`);
            }),
            c.write("})();"),
            c.write(`if (${u} !== INVALID) ${s} = ${u};`));
        }),
        e.write("} else {"),
        e.indented((c) => {
          let l = te(c, n, r.innerType, o);
          c.write(`${s} = ${l};`);
        }),
        e.write("}"),
        s
      );
    }
    let a = t ? A(n) : null;
    return (
      a && e.write(`let ${a};`),
      e.write(`if (${o} !== undefined) {`),
      e.indented((s) => {
        let u = te(s, n, r.innerType, o, t);
        a && u !== null && s.write(`${a} = ${u};`);
      }),
      e.write("}"),
      a
    );
  }
  function Oy(e) {
    return e._zod.traits?.has("$ZodExactOptional") === !0;
  }
  function Ty(e) {
    return e._zod.optin === void 0 && jt(e);
  }
  function jt(e) {
    if (e._zod.def.coerce) return !0;
    let n = e._zod.def;
    switch (n.type) {
      case "any":
      case "unknown":
      case "undefined":
      case "void":
      case "default":
      case "prefault":
      case "transform":
      case "custom":
      case "lazy":
        return !0;
      case "string":
      case "number":
      case "boolean":
      case "bigint":
      case "symbol":
      case "null":
      case "never":
      case "nan":
      case "date":
      case "object":
      case "array":
      case "tuple":
      case "record":
      case "map":
      case "set":
      case "file":
      case "template_literal":
        return !1;
      case "nonoptional":
        return n.innerType ? jt(n.innerType) : !1;
      case "literal":
        return !!n.values?.includes(void 0);
      case "enum":
        return !!e._zod.values?.has(void 0);
      case "optional":
      case "nullable":
      case "readonly":
      case "success":
        return n.innerType ? jt(n.innerType) : !0;
      case "catch":
        return !0;
      case "union":
        return n.options ? n.options.some(jt) : !0;
      case "intersection":
        return !n.left || !n.right ? !0 : jt(n.left) && jt(n.right);
      case "pipe":
        return n.in ? jt(n.in) : !0;
      default:
        return !0;
    }
  }
  function Wc(e) {
    return e._zod.optin === "optional" && e._zod.optout === "optional";
  }
  function Rm(e) {
    return (e._zod.optin !== "defaulted" || e._zod.optout === "optional") && pn(e);
  }
  function pn(e) {
    let n = e._zod.def;
    switch (n.type) {
      case "string":
      case "number":
      case "boolean":
      case "bigint":
      case "symbol":
      case "null":
      case "nan":
      case "date":
      case "object":
      case "array":
      case "tuple":
      case "record":
      case "map":
      case "set":
      case "file":
      case "template_literal":
      case "never":
      case "success":
        return !1;
      case "literal":
        return !!n.values?.includes(void 0);
      case "enum":
        return !!e._zod.values?.has(void 0);
      case "optional":
        return !0;
      case "nullable":
      case "readonly":
      case "nonoptional":
        return n.innerType ? pn(n.innerType) : !0;
      case "union":
        return n.options ? n.options.some(pn) : !0;
      case "intersection":
        return !n.left || !n.right || pn(n.left) || pn(n.right);
      case "pipe":
        return n.out ? pn(n.out) : !0;
      default:
        return !0;
    }
  }
  function Ey(e, n, i, o, t = !0) {
    let r = i._zod.def,
      a = t ? A(n) : null;
    return (
      a && e.write(`let ${a} = null;`),
      e.write(`if (${o} !== null) {`),
      e.indented((s) => {
        let u = te(s, n, r.innerType, o, t);
        a && u !== null && s.write(`${a} = ${u};`);
      }),
      e.write("}"),
      a
    );
  }
  function Ay(e, n, i, o, t = !0) {
    let r = i._zod.def;
    e.write(`if (!Array.isArray(${o})) return INVALID;`);
    let a = t ? A(n) : null,
      s = A(n),
      u = A(n);
    return (
      a && e.write(`const ${a} = new Array(${o}.length);`),
      e.write(`for (let ${s} = 0; ${s} < ${o}.length; ${s}++) {`),
      e.indented((c) => {
        c.write(`const ${u} = ${o}[${s}];`);
        let l = ye(c, n, r.element, u, t);
        a && l !== null && c.write(`${a}[${s}] = ${l};`);
      }),
      e.write("}"),
      a
    );
  }
  function Dy(e, n, i, o) {
    let r = i._zod.def.values;
    if (r.length !== 1) {
      let s = C(n, new Set(r));
      return (e.write(`if (!${s}.has(${o})) return INVALID;`), o);
    }
    let a = r[0];
    if (typeof a == "number" && Number.isNaN(a)) {
      let s = C(n, new Set(r));
      return (e.write(`if (!${s}.has(${o})) return INVALID;`), o);
    }
    if (typeof a == "string") e.write(`if (${o} !== ${we(a)}) return INVALID;`);
    else if (typeof a == "number" || typeof a == "boolean")
      e.write(`if (${o} !== ${a}) return INVALID;`);
    else if (a === null) e.write(`if (${o} !== null) return INVALID;`);
    else if (a === void 0) e.write(`if (${o} !== undefined) return INVALID;`);
    else if (typeof a == "bigint") e.write(`if (${o} !== ${a}n) return INVALID;`);
    else throw new F(`literal type ${typeof a}`);
    return o;
  }
  function jy(e, n, i, o) {
    let t = i._zod.values;
    if (!t) throw new F("enum schema without enumerated values");
    let r = C(n, t);
    return (e.write(`if (!${r}.has(${o})) return INVALID;`), o);
  }
  function Zm(e, n, i, o) {
    let t = i._zod.def;
    return te(e, n, t.innerType, o);
  }
  function Uy(e, n, i, o) {
    let t = i._zod.def,
      a = Object.getOwnPropertyDescriptor(i._zod.def, "defaultValue")
        ? () => i._zod.def.defaultValue
        : void 0;
    if (i._zod.def.type === "prefault") {
      if (!a) return te(e, n, t.innerType, o);
      let u = C(n, a),
        c = A(n);
      return (
        e.write(`let ${c} = ${o};`),
        e.write(`if (${o} === undefined) ${c} = ${u}();`),
        te(e, n, t.innerType, c)
      );
    }
    let s = A(n);
    if (a) {
      let u = C(n, a),
        c = C(n, Jn);
      (e.write(`let ${s};`),
        e.write(`if (${o} === undefined) {`),
        e.indented((l) => {
          l.write(`${s} = ${c}(${u}());`);
        }),
        e.write("} else {"),
        e.indented((l) => {
          let f = te(l, n, t.innerType, o);
          l.write(`${s} = ${f} === undefined ? ${c}(${u}()) : ${f};`);
        }),
        e.write("}"));
    } else
      (e.write(`let ${s};`),
        e.write(`if (${o} !== undefined) {`),
        e.indented((u) => {
          let c = te(u, n, t.innerType, o);
          u.write(`${s} = ${c};`);
        }),
        e.write("}"));
    return s;
  }
  function Cy(e, n, i, o) {
    let t = i._zod.def,
      r = te(e, n, t.innerType, o),
      a = A(n);
    return (e.write(`const ${a} = ${r};`), e.write(`if (${a} === undefined) return INVALID;`), a);
  }
  function Ly(e, n, i, o) {
    let t = i._zod.def,
      r = t.items,
      a = t.rest;
    e.write(`if (!Array.isArray(${o})) return INVALID;`);
    let s = Vm(r, "optin"),
      u = Vm(r, "optout");
    a
      ? e.write(`if (${o}.length < ${s}) return INVALID;`)
      : e.write(`if (${o}.length < ${s} || ${o}.length > ${r.length}) return INVALID;`);
    let c = A(n);
    e.write(`const ${c} = [];`);
    for (let l = 0; l < r.length; l++) {
      let f = r[l];
      if (l >= u)
        (e.write(`if (${c}.length === ${l}) {`),
          e.indented((d) => {
            (d.write(`if (${l} < ${o}.length) {`),
              d.indented((m) => {
                let g = A(n);
                m.write(`const ${g} = ${o}[${l}];`);
                let $ = ye(m, n, f, g);
                m.write(`${c}[${l}] = ${$};`);
              }),
              d.write("} else {"),
              d.indented((m) => {
                if (Wc(f)) {
                  m.write(`${c}.length = ${l};`);
                  return;
                }
                let g = A(n),
                  $ = A(n);
                (m.write(`const ${g} = undefined;`),
                  m.write(`const ${$} = (() => {`),
                  m.indented((w) => {
                    let z = ye(w, n, f, g);
                    w.write(`return ${z};`);
                  }),
                  m.write("})();"),
                  m.write(`if (${$} === INVALID || ${$} === undefined) ${c}.length = ${l};`),
                  m.write(`else ${c}[${l}] = ${$};`));
              }),
              d.write("}"));
          }),
          e.write("}"));
      else {
        let d = A(n);
        e.write(`const ${d} = ${o}[${l}];`);
        let m = ye(e, n, f, d);
        e.write(`${c}[${l}] = ${m};`);
      }
    }
    if (a) {
      let l = A(n),
        f = A(n);
      (e.write(`for (let ${l} = ${r.length}; ${l} < ${o}.length; ${l}++) {`),
        e.indented((d) => {
          d.write(`const ${f} = ${o}[${l}];`);
          let m = ye(d, n, a, f);
          d.write(`${c}[${l}] = ${m};`);
        }),
        e.write("}"));
    }
    return c;
  }
  function Vm(e, n) {
    for (let i = e.length - 1; i >= 0; i--)
      if (!(n === "optin" ? e[i]._zod.optin !== void 0 : e[i]._zod.optout === "optional"))
        return i + 1;
    return 0;
  }
  function Ry(e, n, i, o) {
    let t = i._zod.def,
      r = t.options;
    if (t.discriminator) return Zy(e, n, t, o);
    if (t.inclusive === !1) throw new F("exclusive unions (z.xor)");
    if (r.length === 0) return (e.write("return INVALID;"), o);
    if (r.length === 1) return te(e, n, r[0], o);
    if (r.every((u) => u._zod.def.type === "literal" && !u._zod.def.checks?.length)) {
      let u = new Set(r.flatMap((l) => l._zod.def.values)),
        c = C(n, u);
      return (e.write(`if (!${c}.has(${o})) return INVALID;`), o);
    }
    let s = A(n);
    e.write(`let ${s};`);
    for (let u = 0; u < r.length; u++) {
      let c = r[u];
      (u === 0 ? e.write(`${s} = (() => {`) : e.write(`if (${s} === INVALID) ${s} = (() => {`),
        e.indented((l) => {
          let f = te(l, n, c, o);
          l.write(`return ${f};`);
        }),
        e.write("})();"));
    }
    return (e.write(`if (${s} === INVALID) return INVALID;`), s);
  }
  function Zy(e, n, i, o) {
    if (i.unionFallback) throw new F("discriminated union with unionFallback");
    if (i.options.length === 0) return (e.write("return INVALID;"), o);
    let t = A(n),
      r = A(n);
    (e.write(`const ${t} = ${o}?.[${we(i.discriminator)}];`), e.write(`let ${r};`));
    let a = !0,
      s = new Set();
    for (let u of i.options) {
      let c = u._zod.propValues?.[i.discriminator];
      if (!c || c.size === 0)
        throw new F("discriminated union option without static discriminator values");
      for (let d of c) {
        if (s.has(d)) throw new F(`duplicate discriminator value ${String(d)}`);
        s.add(d);
      }
      let l = Array.from(c, (d) => Vy(n, t, d)),
        f = a ? "if" : "else if";
      (e.write(`${f} (${l.join(" || ")}) {`),
        e.indented((d) => {
          let m = te(d, n, u, o);
          d.write(`${r} = ${m};`);
        }),
        e.write("}"),
        (a = !1));
    }
    return (e.write("else { return INVALID; }"), r);
  }
  function Vy(e, n, i) {
    if (typeof i == "string") return `${n} === ${we(i)}`;
    if (typeof i == "number") return Number.isNaN(i) ? `Number.isNaN(${n})` : `${n} === ${i}`;
    if (typeof i == "boolean") return `${n} === ${i}`;
    if (i === null) return `${n} === null`;
    if (i === void 0) return `${n} === undefined`;
    if (typeof i == "bigint") return `${n} === ${i}n`;
    if (typeof i == "symbol") {
      let o = C(e, i);
      return `${n} === ${o}`;
    }
    throw new F(`literal discriminator value ${String(i)}`);
  }
  function My(e, n, i, o) {
    let t = i._zod.def;
    n.definite = !1;
    let r = ye(e, n, t.left, o),
      a = ye(e, n, t.right, o),
      s = C(n, dn),
      u = A(n);
    return (
      e.write(`const ${u} = ${s}(${r}, ${a});`),
      e.write(`if (!${u}.valid) return INVALID;`),
      `${u}.data`
    );
  }
  function Fy(e, n, i, o) {
    let t = i._zod.def,
      r = C(n, Le);
    e.write(`if (!${r}(${o})) return INVALID;`);
    let a = A(n),
      s = A(n),
      u = A(n);
    e.write(`const ${a} = {};`);
    let c = t,
      l = c.partial ? void 0 : t.keyType._zod.values;
    if (l) {
      let m = [];
      for (let $ of l) {
        if (!(typeof $ == "string" || typeof $ == "number" || typeof $ == "symbol"))
          throw new F(`record key value ${String($)}`);
        let w = typeof $ == "number" ? $.toString() : $;
        if (w === "__proto__") throw new F('record key "__proto__"');
        m.push(w);
        let z = C(n, $),
          x = te(e, n, t.keyType, z),
          O = A(n);
        e.write(`const ${O} = ${o}[${By(n, w)}];`);
        let I = ye(e, n, t.valueType, O);
        e.write(`${a}[${x}] = ${I};`);
      }
      let g = C(n, new Set(m));
      return (
        e.write(`for (const ${s} in ${o}) {`),
        e.indented(($) => {
          ($.write(`if (${g}.has(${s})) continue;`),
            c.mode === "loose"
              ? $.write(`if (${s} !== "__proto__") ${a}[${s}] = ${o}[${s}];`)
              : $.write("return INVALID;"));
        }),
        e.write("}"),
        a
      );
    }
    let f = t.keyType._zod.def;
    if (
      !(f.type === "string" && f.format === void 0 && !f.coerce && (f.checks?.length ?? 0) === 0)
    ) {
      let m = t.mode === "loose",
        g = Ji(t.keyType);
      g.definite === !1 && (n.definite = !1);
      let $ = C(n, g),
        w = C(n, it),
        z = A(n);
      return (
        Mm(e, n, o, s, (x) => {
          (x.write(`let ${z} = ${$}(${s});`),
            x.write(
              `if (${z} === INVALID && typeof ${s} === "string" && ${w}.test(${s})) ${z} = ${$}(Number(${s}));`,
            ),
            m
              ? x.write(`if (${z} === INVALID) { ${a}[${s}] = ${o}[${s}]; continue; }`)
              : x.write(`if (${z} === INVALID) return INVALID;`),
            x.write(`if (${z} === "__proto__") continue;`));
          let O = A(n);
          x.write(`const ${O} = ${o}[${s}];`);
          let I = ye(x, n, t.valueType, O);
          x.write(`${a}[${z}] = ${I};`);
        }),
        a
      );
    }
    return (
      Mm(
        e,
        n,
        o,
        s,
        (m) => {
          m.write(`const ${u} = ${o}[${s}];`);
          let g = ye(m, n, t.valueType, u);
          m.write(`${a}[${s}] = ${g};`);
        },
        "return INVALID;",
      ),
      a
    );
  }
  function Mm(e, n, i, o, t, r) {
    let a = C(n, Object.prototype.propertyIsEnumerable),
      s = A(n),
      u = A(n),
      c = A(n);
    (e.write(`const ${s} = Object.getOwnPropertySymbols(${i});`),
      e.write(`const ${u} = Object.getOwnPropertyNames(${i});`),
      e.write(`for (let ${c} = 0; ${c} < ${u}.length; ${c}++) {`),
      e.indented((l) => {
        (l.write(`const ${o} = ${u}[${c}];`),
          l.write(`if (${o} === "__proto__" || !${a}.call(${i}, ${o})) continue;`),
          t(l));
      }),
      e.write("}"),
      e.write(`for (let ${c} = 0; ${c} < ${s}.length; ${c}++) {`),
      e.indented((l) => {
        (l.write(`const ${o} = ${s}[${c}];`),
          l.write(`if (!${a}.call(${i}, ${o})) continue;`),
          r ? l.write(r) : t(l));
      }),
      e.write("}"));
  }
  function By(e, n) {
    return typeof n == "string" ? we(n) : C(e, n);
  }
  function Wy(e, n, i, o) {
    let t = i._zod.def;
    e.write(`if (!(${o} instanceof Map)) return INVALID;`);
    let r = A(n),
      a = A(n),
      s = A(n);
    return (
      e.write(`const ${r} = new Map();`),
      e.write(`for (const [${a}, ${s}] of ${o}) {`),
      e.indented((u) => {
        let c = te(u, n, t.keyType, a),
          l = te(u, n, t.valueType, s);
        u.write(`${r}.set(${c}, ${l});`);
      }),
      e.write("}"),
      r
    );
  }
  function Jy(e, n, i, o) {
    let t = i._zod.def;
    e.write(`if (!(${o} instanceof Set)) return INVALID;`);
    let r = A(n),
      a = A(n);
    return (
      e.write(`const ${r} = new Set();`),
      e.write(`for (const ${a} of ${o}) {`),
      e.indented((s) => {
        let u = te(s, n, t.valueType, a);
        s.write(`${r}.add(${u});`);
      }),
      e.write("}"),
      r
    );
  }
  function Gy(e, n) {
    return (e.write(`if (!(${n} instanceof File)) return INVALID;`), n);
  }
  function Ky(e, n, i, o) {
    e.write(`if (typeof ${o} !== "string") return INVALID;`);
    let t = i._zod.pattern;
    if (t) {
      let r = C(n, t);
      (e.write(`${r}.lastIndex = 0;`), e.write(`if (!${r}.test(${o})) return INVALID;`));
    }
    return o;
  }
  function qy(e, n, i, o) {
    let t = i._zod.def,
      r = Ut(n, t.getter),
      a = C(n, { parser: null });
    (e.write(`if (!${a}.parser) {`),
      e.indented((u) => {
        (u.write(`const inner = ${r}();`),
          u.write(`${a}.parser = function(input) {`),
          u.indented((c) => {
            (c.write("const result = inner._zod.run({ value: input, issues: [] }, {});"),
              c.write("return result.issues.length === 0 ? result.value : INVALID;"));
          }),
          u.write("};"));
      }),
      e.write("}"));
    let s = A(n);
    return (
      e.write(`const ${s} = ${a}.parser(${o});`),
      e.write(`if (${s} === INVALID) return INVALID;`),
      s
    );
  }
  function Xy(e, n, i, o) {
    let t = i._zod.def,
      r = te(e, n, t.in, o);
    if (t.transform) {
      if (Ct(t.transform)) throw new We("z.compile: async transforms in pipes are not supported");
      let a = t.transform,
        u = Ut(n, (l) => {
          let f = { value: l, issues: [], addIssue: Gc },
            d = a(l, f);
          return d instanceof Promise ? ke : f.issues.length === 0 ? d : ke;
        }),
        c = A(n);
      return (
        e.write(`const ${c} = ${u}(${r});`),
        e.write(`if (${c} === INVALID) return INVALID;`),
        te(e, n, t.out, c)
      );
    } else return te(e, n, t.out, r);
  }
  function Ct(e) {
    return (
      typeof e == "function" &&
      (e.constructor.name === "AsyncFunction" || e[Symbol.toStringTag] === "AsyncFunction")
    );
  }
  function Hy(e, n, i, o) {
    let t = i._zod.def;
    if (t.fn) {
      if (Ct(t.fn)) throw new We("z.compile: async custom predicates are not supported");
      let r = Ut(n, t.fn),
        a = C(n, Bc),
        s = A(n);
      (e.write(`const ${s} = ${r}(${o});`),
        e.write(`if (${s} instanceof Promise) ${a}();`),
        e.write(`if (!${s}) return INVALID;`));
    } else throw new F("custom schema without a predicate function");
    return o;
  }
  function Yy(e, n, i) {
    let o = e._zod.run({ value: i, issues: [] }, {});
    if (o && typeof o.then == "function") return ke;
    let t = o;
    return t.issues.length === 0 ? t.value : n();
  }
  function Qy(e, n, i, o) {
    let t = i._zod.def;
    if (!t.catchValue[Hr])
      throw new F("catch with a callback (only a constant catch value compiles)", !1);
    let r = A(n);
    (e.write(`let ${r} = (() => {`),
      e.indented((c) => {
        let l = ye(c, n, t.innerType, o);
        c.write(`return ${l};`);
      }),
      e.write("})();"));
    let a = C(n, t.innerType),
      s = Ut(n, t.catchValue),
      u = C(n, Yy);
    return (
      e.write(`if (${r} === INVALID) {`),
      e.indented((c) => {
        (c.write(`${r} = ${u}(${a}, ${s}, ${o});`),
          c.write(`if (${r} === INVALID) return INVALID;`));
      }),
      e.write("}"),
      r
    );
  }
  function eb(e, n, i, o) {
    let t = i._zod.def;
    if (t.transform) {
      if (Ct(t.transform)) throw new We("z.compile: async transforms are not supported");
      let r = t.transform,
        s = Ut(n, (c) => {
          let l = { value: c, issues: [], addIssue: Gc },
            f = r(c, l);
          return f instanceof Promise ? ke : l.issues.length === 0 ? f : ke;
        }),
        u = A(n);
      return (
        e.write(`const ${u} = ${s}(${o});`), e.write(`if (${u} === INVALID) return INVALID;`), u
      );
    }
    return o;
  }
  function Gi(e) {
    return (e.checks && (e.checks = [...e.checks]), e);
  }
  function Kc(e, n) {
    return new e(Gi({ type: "string", ...k(n) }));
  }
  function qc(e, n) {
    return new e(Gi({ type: "string", coerce: !0, ...k(n) }));
  }
  function Ki(e, n) {
    return new e({ type: "string", format: "email", check: "string_format", abort: !1, ...k(n) });
  }
  function qi(e, n) {
    return new e({ type: "string", format: "guid", check: "string_format", abort: !1, ...k(n) });
  }
  function Xi(e, n) {
    return new e({ type: "string", format: "uuid", check: "string_format", abort: !1, ...k(n) });
  }
  function Hi(e, n) {
    return new e({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: !1,
      version: "v4",
      ...k(n),
    });
  }
  function Yi(e, n) {
    return new e({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: !1,
      version: "v6",
      ...k(n),
    });
  }
  function Qi(e, n) {
    return new e({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: !1,
      version: "v7",
      ...k(n),
    });
  }
  function _r(e, n) {
    return new e({ type: "string", format: "url", check: "string_format", abort: !1, ...k(n) });
  }
  function eo(e, n) {
    return new e({ type: "string", format: "emoji", check: "string_format", abort: !1, ...k(n) });
  }
  function to(e, n) {
    return new e({ type: "string", format: "nanoid", check: "string_format", abort: !1, ...k(n) });
  }
  function no(e, n) {
    return new e({ type: "string", format: "cuid", check: "string_format", abort: !1, ...k(n) });
  }
  function ro(e, n) {
    return new e({ type: "string", format: "cuid2", check: "string_format", abort: !1, ...k(n) });
  }
  function io(e, n) {
    return new e({ type: "string", format: "ulid", check: "string_format", abort: !1, ...k(n) });
  }
  function oo(e, n) {
    return new e({ type: "string", format: "xid", check: "string_format", abort: !1, ...k(n) });
  }
  function ao(e, n) {
    return new e({ type: "string", format: "ksuid", check: "string_format", abort: !1, ...k(n) });
  }
  function so(e, n) {
    return new e({ type: "string", format: "ipv4", check: "string_format", abort: !1, ...k(n) });
  }
  function co(e, n) {
    return new e({ type: "string", format: "ipv6", check: "string_format", abort: !1, ...k(n) });
  }
  function Xc(e, n) {
    return new e({ type: "string", format: "mac", check: "string_format", abort: !1, ...k(n) });
  }
  function uo(e, n) {
    return new e({ type: "string", format: "cidrv4", check: "string_format", abort: !1, ...k(n) });
  }
  function lo(e, n) {
    return new e({ type: "string", format: "cidrv6", check: "string_format", abort: !1, ...k(n) });
  }
  function fo(e, n) {
    return new e({ type: "string", format: "base64", check: "string_format", abort: !1, ...k(n) });
  }
  function mo(e, n) {
    return new e({
      type: "string",
      format: "base64url",
      check: "string_format",
      abort: !1,
      ...k(n),
    });
  }
  function po(e, n) {
    return new e({ type: "string", format: "e164", check: "string_format", abort: !1, ...k(n) });
  }
  function Hc(e, n) {
    return new e({
      type: "string",
      format: "credit_card",
      check: "string_format",
      abort: !1,
      ...k(n),
    });
  }
  function Yc(e, n) {
    return new e({ type: "string", format: "iban", check: "string_format", abort: !1, ...k(n) });
  }
  function go(e, n) {
    return new e({ type: "string", format: "jwt", check: "string_format", abort: !1, ...k(n) });
  }
  var Qc = { Any: null, Minute: -1, Second: 0, Millisecond: 3, Microsecond: 6 };
  function wr(e, n) {
    return new e({
      type: "string",
      format: "datetime",
      check: "string_format",
      offset: !1,
      local: !1,
      precision: null,
      ...k(n),
    });
  }
  function xr(e, n) {
    return new e({ type: "string", format: "date", check: "string_format", ...k(n) });
  }
  function kr(e, n) {
    return new e({
      type: "string",
      format: "time",
      check: "string_format",
      precision: null,
      ...k(n),
    });
  }
  function Ir(e, n) {
    return new e({ type: "string", format: "duration", check: "string_format", ...k(n) });
  }
  function eu(e, n) {
    return new e(Gi({ type: "number", checks: [], ...k(n) }));
  }
  function tu(e, n) {
    return new e(Gi({ type: "number", coerce: !0, checks: [], ...k(n) }));
  }
  function nu(e, n) {
    return new e({ type: "number", check: "number_format", abort: !1, format: "safeint", ...k(n) });
  }
  function ru(e, n) {
    return new e({ type: "number", check: "number_format", abort: !1, format: "float32", ...k(n) });
  }
  function iu(e, n) {
    return new e({ type: "number", check: "number_format", abort: !1, format: "float64", ...k(n) });
  }
  function ou(e, n) {
    return new e({ type: "number", check: "number_format", abort: !1, format: "int32", ...k(n) });
  }
  function au(e, n) {
    return new e({ type: "number", check: "number_format", abort: !1, format: "uint32", ...k(n) });
  }
  function su(e, n) {
    return new e({ type: "boolean", ...k(n) });
  }
  function cu(e, n) {
    return new e({ type: "boolean", coerce: !0, ...k(n) });
  }
  function uu(e, n) {
    return new e({ type: "bigint", ...k(n) });
  }
  function lu(e, n) {
    return new e({ type: "bigint", coerce: !0, ...k(n) });
  }
  function du(e, n) {
    return new e({ type: "bigint", check: "bigint_format", abort: !1, format: "int64", ...k(n) });
  }
  function fu(e, n) {
    return new e({ type: "bigint", check: "bigint_format", abort: !1, format: "uint64", ...k(n) });
  }
  function mu(e, n) {
    return new e({ type: "symbol", ...k(n) });
  }
  function pu(e, n) {
    return new e({ type: "undefined", ...k(n) });
  }
  function gu(e, n) {
    return new e({ type: "null", ...k(n) });
  }
  function hu(e) {
    return new e({ type: "any" });
  }
  function vu(e) {
    return new e({ type: "unknown" });
  }
  function $u(e, n) {
    return new e({ type: "never", ...k(n) });
  }
  function yu(e, n) {
    return new e({ type: "void", ...k(n) });
  }
  function bu(e, n) {
    return new e({ type: "date", ...k(n) });
  }
  function _u(e, n) {
    return new e({ type: "date", coerce: !0, ...k(n) });
  }
  function wu(e, n) {
    return new e({ type: "nan", ...k(n) });
  }
  function Ke(e, n) {
    return new mi({ check: "less_than", ...k(n), value: e, inclusive: !1 });
  }
  function je(e, n) {
    return new mi({ check: "less_than", ...k(n), value: e, inclusive: !0 });
  }
  function qe(e, n) {
    return new pi({ check: "greater_than", ...k(n), value: e, inclusive: !1 });
  }
  function Ue(e, n) {
    return new pi({ check: "greater_than", ...k(n), value: e, inclusive: !0 });
  }
  function ho(e) {
    return qe(0, e);
  }
  function vo(e) {
    return Ke(0, e);
  }
  function $o(e) {
    return je(0, e);
  }
  function yo(e) {
    return Ue(0, e);
  }
  function ft(e, n) {
    return new as({ check: "multiple_of", ...k(n), value: e });
  }
  function mt(e, n) {
    return new us({ check: "max_size", ...k(n), maximum: e });
  }
  function Xe(e, n) {
    return new ls({ check: "min_size", ...k(n), minimum: e });
  }
  function Lt(e, n) {
    return new ds({ check: "size_equals", ...k(n), size: e });
  }
  function Rt(e, n) {
    return new fs({ check: "max_length", ...k(n), maximum: e });
  }
  function ot(e, n) {
    return new ms({ check: "min_length", ...k(n), minimum: e });
  }
  function Zt(e, n) {
    return new ps({ check: "length_equals", ...k(n), length: e });
  }
  function gn(e, n) {
    return new gs({ check: "string_format", format: "regex", ...k(n), pattern: e });
  }
  function hn(e) {
    return new hs({ check: "string_format", format: "lowercase", ...k(e) });
  }
  function vn(e) {
    return new vs({ check: "string_format", format: "uppercase", ...k(e) });
  }
  function $n(e, n) {
    return new $s({ check: "string_format", format: "includes", ...k(n), includes: e });
  }
  function yn(e, n) {
    return new ys({ check: "string_format", format: "starts_with", ...k(n), prefix: e });
  }
  function bn(e, n) {
    return new bs({ check: "string_format", format: "ends_with", ...k(n), suffix: e });
  }
  function bo(e, n, i) {
    return new _s({ check: "property", property: e, schema: n, ...k(i) });
  }
  function _n(e, n) {
    return new ws({ check: "properties", shape: e, ...k(n) });
  }
  function wn(e, n) {
    return new xs({ check: "mime_type", mime: e, ...k(n) });
  }
  function Je(e) {
    return new ks({ check: "overwrite", tx: e });
  }
  function xn(e) {
    return Je((n) => n.normalize(e));
  }
  function kn() {
    return Je((e) => e.trim());
  }
  function In() {
    return Je((e) => e.toLowerCase());
  }
  function Sn() {
    return Je((e) => e.toUpperCase());
  }
  function zn() {
    return Je((e) => ua(e));
  }
  function xu(e, n, i) {
    return new e({ type: "array", element: n, ...k(i) });
  }
  function tb(e, n, i) {
    return new e({ type: "union", options: n, ...k(i) });
  }
  function nb(e, n, i) {
    return new e({ type: "union", options: n, inclusive: !1, ...k(i) });
  }
  function rb(e, n, i, o) {
    return new e({ type: "union", options: i, discriminator: n, ...k(o) });
  }
  function ib(e, n, i) {
    return new e({ type: "intersection", left: n, right: i });
  }
  function ob(e, n, i, o) {
    let t = i instanceof L,
      r = t ? o : i,
      a = t ? i : null;
    return new e({ type: "tuple", items: n, rest: a, ...k(r) });
  }
  function ab(e, n, i, o) {
    return new e({ type: "record", keyType: n, valueType: i, ...k(o) });
  }
  function sb(e, n, i, o) {
    return new e({ type: "map", keyType: n, valueType: i, ...k(o) });
  }
  function cb(e, n, i) {
    return new e({ type: "set", valueType: n, ...k(i) });
  }
  function ub(e, n, i) {
    let o = Array.isArray(n) ? Object.fromEntries(n.map((t) => [t, t])) : n;
    return new e({ type: "enum", entries: o, ...k(i) });
  }
  function lb(e, n, i) {
    return new e({ type: "enum", entries: n, ...k(i) });
  }
  function db(e, n, i) {
    return new e({ type: "literal", values: Array.isArray(n) ? n : [n], ...k(i) });
  }
  function ku(e, n) {
    return new e({ type: "file", ...k(n) });
  }
  function fb(e, n) {
    return new e({ type: "transform", transform: n });
  }
  function mb(e, n) {
    return new e({ type: "optional", innerType: n });
  }
  function pb(e, n) {
    return new e({ type: "nullable", innerType: n });
  }
  function gb(e, n, i) {
    return new e({
      type: "default",
      innerType: n,
      get defaultValue() {
        return typeof i == "function" ? i() : Jn(i);
      },
    });
  }
  function hb(e, n, i) {
    return new e({ type: "nonoptional", innerType: n, ...k(i) });
  }
  function vb(e, n) {
    return new e({ type: "success", innerType: n });
  }
  function $b(e, n, i) {
    return new e({ type: "catch", innerType: n, catchValue: typeof i == "function" ? i : ga(i) });
  }
  function yb(e, n, i) {
    return new e({ type: "pipe", in: n, out: i });
  }
  function bb(e, n) {
    return new e({ type: "readonly", innerType: n });
  }
  function _b(e, n, i) {
    return new e({ type: "template_literal", parts: n, ...k(i) });
  }
  function wb(e, n) {
    return new e({ type: "lazy", getter: n });
  }
  function xb(e, n) {
    return new e({ type: "promise", innerType: n });
  }
  function Iu(e, n, i) {
    let o = k(i);
    return (o.abort ?? (o.abort = !0), new e({ type: "custom", check: "custom", fn: n, ...o }));
  }
  function Su(e, n, i) {
    return new e({ type: "custom", check: "custom", fn: n, ...k(i) });
  }
  function zu(e, n) {
    let i = Jm(
      (o) => (
        (o.addIssue = (t) => {
          if (typeof t == "string") o.issues.push(on(t, o.value, i._zod.def));
          else {
            let r = t;
            (r.fatal && (r.continue = !1),
              r.code ?? (r.code = "custom"),
              "input" in r || (r.input = o.value),
              r.inst ?? (r.inst = i),
              r.continue ?? (r.continue = !i._zod.def.abort),
              o.issues.push(on(r)));
          }
        }),
        e(o.value, o)
      ),
      n,
    );
    return i;
  }
  function Jm(e, n) {
    let i = new Q({ check: "custom", ...k(n) });
    return ((i._zod.check = e), i);
  }
  function Nu(e) {
    let n = new Q({ check: "describe" });
    return (
      (n._zod.onattach = [
        (i) => {
          let o = ve.get(i) ?? {};
          ve.add(i, { ...o, description: e });
        },
      ]),
      (n._zod.check = () => {}),
      n
    );
  }
  function Pu(e) {
    let n = new Q({ check: "meta" });
    return (
      (n._zod.onattach = [
        (i) => {
          let o = ve.get(i) ?? {};
          ve.add(i, { ...o, ...e });
        },
      ]),
      (n._zod.check = () => {}),
      n
    );
  }
  function Ou(e, n) {
    let i = k(n),
      o = i.truthy ?? ["true", "1", "yes", "on", "y", "enabled"],
      t = i.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
    i.case !== "sensitive" &&
      ((o = o.map((m) => (typeof m == "string" ? m.toLowerCase() : m))),
      (t = t.map((m) => (typeof m == "string" ? m.toLowerCase() : m))));
    let r = new Set(o),
      a = new Set(t),
      s = e.Codec ?? pr,
      u = e.Boolean ?? fr,
      c = e.String ?? At,
      l = new c({ type: "string", error: i.error }),
      f = new u({ type: "boolean", error: i.error }),
      d = new s({
        type: "pipe",
        in: l,
        out: f,
        transform: (m, g) => {
          let $ = m;
          return (
            i.case !== "sensitive" && ($ = $.toLowerCase()),
            r.has($)
              ? !0
              : a.has($)
                ? !1
                : (g.issues.push({
                    code: "invalid_value",
                    expected: "stringbool",
                    values: [...r, ...a],
                    input: g.value,
                    inst: d,
                    continue: !1,
                  }),
                  {})
          );
        },
        reverseTransform: (m, g) => (m === !0 ? o[0] || "true" : t[0] || "false"),
        error: i.error,
      });
    return (
      (d._zod.bag.truthy = o),
      (d._zod.bag.falsy = t),
      (d._zod.bag.case = i.case ?? "insensitive"),
      d
    );
  }
  function Vt(e, n, i, o = {}) {
    let t = k(o),
      r = {
        check: "string_format",
        type: "string",
        format: n,
        fn: typeof i == "function" ? i : (s) => i.test(s),
        ...t,
      };
    return (i instanceof RegExp && (r.pattern = i), new e(r));
  }
  function Sr(e, ...n) {
    for (let i of n)
      for (let o of Reflect.ownKeys(i))
        Object.prototype.propertyIsEnumerable.call(i, o) && he(e, o, i[o]);
    return e;
  }
  function pt(e) {
    let n = e?.target ?? "draft-2020-12";
    return (
      n === "draft-4" && (n = "draft-04"),
      n === "draft-7" && (n = "draft-07"),
      {
        processors: e.processors ?? {},
        metadataRegistry: e?.metadata ?? ve,
        target: n,
        unrepresentable: e?.unrepresentable ?? "throw",
        override: e?.override ?? (() => {}),
        io: e?.io ?? "output",
        counter: 0,
        seen: new Map(),
        sharedDefsExtractedFor: void 0,
        sharedEmitDoneFor: void 0,
        cycles: e?.cycles ?? "ref",
        reused: e?.reused ?? "inline",
        intersections: [],
        deferred: [],
        external: e?.external ?? void 0,
      }
    );
  }
  function ue(e, n, i, o, t) {
    let r =
      typeof n.unrepresentable == "function"
        ? n.unrepresentable({ zodSchema: e, path: o.path, message: t })
        : n.unrepresentable;
    if (r === "any") return !1;
    if (r === void 0 || r === "throw") throw new Error(t);
    return (Object.assign(i, r), !0);
  }
  function q(e, n, i = { path: [], schemaPath: [] }) {
    var o;
    let t = e._zod.def,
      r = n.seen.get(e);
    if (r) return (r.count++, i.schemaPath.includes(e) && (r.cycle = i.path), r.schema);
    let a = { schema: {}, count: 1, cycle: void 0, path: i.path };
    (n.seen.set(e, a), (n.sharedDefsExtractedFor = void 0), (n.sharedEmitDoneFor = void 0));
    let s = e._zod.toJSONSchema?.();
    if (s) a.schema = s;
    else {
      let l = { ...i, schemaPath: [...i.schemaPath, e], path: i.path };
      if (e._zod.processJSONSchema) e._zod.processJSONSchema(n, a.schema, l);
      else {
        let d = a.schema,
          m = n.processors[t.type];
        if (!m) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${t.type}`);
        m(e, n, d, l);
      }
      let f = e._zod.parent;
      f && (a.ref || (a.ref = f), q(f, n, l), (n.seen.get(f).isParent = !0));
    }
    let u = n.metadataRegistry.get(e);
    return (
      u && Sr(a.schema, u),
      n.io === "input" && Ie(e) && (delete a.schema.examples, delete a.schema.default),
      n.io === "input" &&
        "_prefault" in a.schema &&
        ((o = a.schema).default ?? (o.default = a.schema._prefault)),
      delete a.schema._prefault,
      n.seen.get(e).schema
    );
  }
  function Gm(e) {
    return e.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  function gt(e, n) {
    let i = e.seen.get(n);
    if (!i) throw new Error("Unprocessed schema. This is a bug in Zod.");
    if (e.external && e.sharedDefsExtractedFor === e.external) return;
    let o = new Map();
    for (let a of e.seen.entries()) {
      let s = e.metadataRegistry.get(a[0])?.id;
      if (s) {
        let u = o.get(s);
        if (u && u !== a[0])
          throw new Error(
            `Duplicate schema id "${s}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`,
          );
        o.set(s, a[0]);
      }
    }
    let t = (a) => {
        let s = e.target === "draft-2020-12" ? "$defs" : "definitions";
        if (e.external) {
          let f = e.external.registry.get(a[0])?.id,
            d = e.external.uri ?? ((g) => g);
          if (f) return { ref: d(f) };
          let m = a[1].defId ?? a[1].schema.id ?? `schema${e.counter++}`;
          return ((a[1].defId = m), { defId: m, ref: `${d("__shared")}#/${s}/${Gm(m)}` });
        }
        let u = "#",
          c = `${u}/${s}/`;
        if (a[1] === i && !a[1].schema.id) return { ref: u };
        let l = a[1].schema.id ?? `__schema${e.counter++}`;
        return { defId: l, ref: c + Gm(l) };
      },
      r = (a) => {
        if (a[1].schema.$ref) return;
        let s = a[1],
          { ref: u, defId: c } = t(a);
        ((s.def = { ...s.schema }), c && (s.defId = c));
        let l = s.schema;
        for (let f in l) delete l[f];
        l.$ref = u;
      };
    if (e.cycles === "throw")
      for (let a of e.seen.entries()) {
        let s = a[1];
        if (s.cycle)
          throw new Error(`Cycle detected: #/${s.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    for (let a of e.seen.entries()) {
      let s = a[1];
      if (n === a[0]) {
        r(a);
        continue;
      }
      if (e.external) {
        let c = e.external.registry.get(a[0])?.id;
        if (n !== a[0] && c) {
          r(a);
          continue;
        }
      }
      if (e.metadataRegistry.get(a[0])?.id) {
        r(a);
        continue;
      }
      if (s.cycle) {
        r(a);
        continue;
      }
      s.count > 1 && e.reused === "ref" && r(a);
    }
    e.external && (e.sharedDefsExtractedFor = e.external);
  }
  function Xm(e) {
    let n = e.anyOf;
    if (!Array.isArray(n) || n.length === 0 || e.type !== void 0) return;
    let i = [];
    for (let o of n) {
      if (!o || typeof o != "object") return;
      Xm(o);
      let t = Object.keys(o);
      if (t.length !== 1 || t[0] !== "type") return;
      let r = o.type;
      for (let a of Array.isArray(r) ? r : [r]) {
        if (typeof a != "string") return;
        i.includes(a) || i.push(a);
      }
    }
    (delete e.anyOf, (e.type = i.length === 1 ? i[0] : i));
  }
  var Hm = new Set(["type", "properties", "required", "additionalProperties"]),
    Km = ["oneOf", "anyOf"];
  function qm(e) {
    let n = e.additionalProperties;
    return n === void 0 || n === !1 || typeof n != "object" || n === null
      ? null
      : Object.keys(n).length
        ? n
        : null;
  }
  function Tu(e) {
    let n = [];
    for (let r of e) {
      if (typeof r != "object" || r.type !== "object") return null;
      for (let a in r) if (!Hm.has(a)) return null;
      n.push(r);
    }
    let i = {},
      o = new Set();
    for (let r of n) {
      for (let a in r.properties) {
        if (Object.prototype.hasOwnProperty.call(i, a)) continue;
        let s = [];
        for (let c of n) {
          let l = c.properties?.[a] ?? qm(c);
          l != null && (s.some((f) => JSON.stringify(f) === JSON.stringify(l)) || s.push(l));
        }
        let u = s.length === 1 ? s[0] : (Tu(s) ?? { allOf: s });
        he(i, a, u);
      }
      for (let a of r.required ?? []) o.add(a);
    }
    let t = { type: "object", properties: i };
    if ((o.size && (t.required = [...o]), n.every((r) => r.additionalProperties === !1)))
      t.additionalProperties = !1;
    else {
      let r = [];
      for (let a of n) {
        let s = qm(a);
        s && !r.some((u) => JSON.stringify(u) === JSON.stringify(s)) && r.push(s);
      }
      r.length === 1
        ? (t.additionalProperties = r[0])
        : r.length > 1 && (t.additionalProperties = { allOf: r });
    }
    return t;
  }
  function kb(e) {
    let n = e.allOf;
    if (!Array.isArray(n) || n.length < 2) return;
    for (let t of Hm) if (t in e) return;
    let i = n.filter((t) => Km.some((r) => Array.isArray(t[r]))),
      o = null;
    if (!i.length) o = Tu(n);
    else {
      let t = i[0],
        r = Km.find((u) => Array.isArray(t[u]));
      if (Object.keys(t).length !== 1) return;
      let a = n.filter((u) => u !== t),
        s = t[r].map((u) => Tu([...a, u]));
      if (s.some((u) => !u)) return;
      o = { [r]: s };
    }
    o && (delete e.allOf, Sr(e, o));
  }
  function ht(e, n) {
    let i = e.seen.get(n);
    if (!i) throw new Error("Unprocessed schema. This is a bug in Zod.");
    let o = (s) => {
      let u = e.seen.get(s);
      if (u.ref === null) return;
      let c = u.def ?? u.schema,
        l = { ...c },
        f = u.ref;
      if (((u.ref = null), f)) {
        o(f);
        let m = e.seen.get(f),
          g = m.schema;
        if (
          (g.$ref &&
          (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0")
            ? ((c.allOf = c.allOf ?? []), c.allOf.push(g))
            : Sr(c, g),
          Sr(c, l),
          s._zod.parent === f)
        )
          for (let w in c) w === "$ref" || w === "allOf" || w in l || delete c[w];
        if (g.$ref && m.def)
          for (let w in c)
            w === "$ref" ||
              w === "allOf" ||
              (w in m.def && JSON.stringify(c[w]) === JSON.stringify(m.def[w]) && delete c[w]);
      }
      let d = s._zod.parent;
      if (d && d !== f) {
        o(d);
        let m = e.seen.get(d);
        if (m?.schema.$ref && ((c.$ref = m.schema.$ref), m.def))
          for (let g in c)
            g === "$ref" ||
              g === "allOf" ||
              (g in m.def && JSON.stringify(c[g]) === JSON.stringify(m.def[g]) && delete c[g]);
      }
      e.override({ zodSchema: s, jsonSchema: c, path: u.path ?? [] });
    };
    if (!e.external || e.sharedEmitDoneFor !== e.external) {
      for (let s of [...e.seen.entries()].reverse()) o(s[0]);
      if (e.target !== "openapi-3.0") for (let s of e.seen.entries()) Xm(s[1].def ?? s[1].schema);
      for (let s of e.deferred) s();
      if (e.intersections.length) {
        let s = new Map();
        for (let u of e.seen.values())
          for (let c of [u.schema, u.def]) {
            let l = c?.allOf;
            if (!Array.isArray(l)) continue;
            let f = s.get(l);
            f ? f.push(c) : s.set(l, [c]);
          }
        for (let u of e.intersections) for (let c of s.get(u) ?? []) kb(c);
      }
    }
    let t = {};
    if (
      (e.target === "draft-2020-12"
        ? (t.$schema = "https://json-schema.org/draft/2020-12/schema")
        : e.target === "draft-07"
          ? (t.$schema = "http://json-schema.org/draft-07/schema#")
          : e.target === "draft-04"
            ? (t.$schema = "http://json-schema.org/draft-04/schema#")
            : e.target,
      e.external?.uri)
    ) {
      let s = e.external.registry.get(n)?.id;
      if (!s) throw new Error("Schema is missing an `id` property");
      t.$id = e.external.uri(s);
    }
    Sr(t, i.defId ? i.schema : (i.def ?? i.schema));
    let r = e.metadataRegistry.get(n)?.id;
    r !== void 0 && t.id === r && delete t.id;
    let a = e.external?.defs ?? {};
    if (!e.external || e.sharedEmitDoneFor !== e.external)
      for (let s of e.seen.entries()) {
        let u = s[1];
        u.def && u.defId && (u.def.id === u.defId && delete u.def.id, he(a, u.defId, u.def));
      }
    (e.external && (e.sharedEmitDoneFor = e.external),
      e.external ||
        (Object.keys(a).length > 0 &&
          (e.target === "draft-2020-12" ? (t.$defs = a) : (t.definitions = a))));
    try {
      let s = JSON.parse(JSON.stringify(t));
      return (
        Object.defineProperty(s, "~standard", {
          value: {
            ...n["~standard"],
            jsonSchema: {
              input: Nn(n, "input", e.processors),
              output: Nn(n, "output", e.processors),
            },
          },
          enumerable: !1,
          writable: !1,
        }),
        s
      );
    } catch {
      throw new Error("Error converting schema to JSON.");
    }
  }
  function Ie(e, n) {
    let i = n ?? { seen: new Set() };
    if (i.seen.has(e)) return !1;
    i.seen.add(e);
    let o = e._zod.def;
    if (o.type === "transform") return !0;
    if (o.type === "array") return Ie(o.element, i);
    if (o.type === "set") return Ie(o.valueType, i);
    if (o.type === "lazy") return Ie(o.getter(), i);
    if (
      o.type === "promise" ||
      o.type === "optional" ||
      o.type === "nonoptional" ||
      o.type === "nullable" ||
      o.type === "readonly" ||
      o.type === "default" ||
      o.type === "prefault" ||
      o.type === "catch"
    )
      return Ie(o.innerType, i);
    if (o.type === "intersection") return Ie(o.left, i) || Ie(o.right, i);
    if (o.type === "record" || o.type === "map") return Ie(o.keyType, i) || Ie(o.valueType, i);
    if (o.type === "pipe") return e._zod.traits.has("$ZodCodec") ? !0 : Ie(o.in, i) || Ie(o.out, i);
    if (o.type === "object") {
      for (let t in o.shape) if (Ie(o.shape[t], i)) return !0;
      return !1;
    }
    if (o.type === "union") {
      for (let t of o.options) if (Ie(t, i)) return !0;
      return !1;
    }
    if (o.type === "tuple") {
      for (let t of o.items) if (Ie(t, i)) return !0;
      return !!(o.rest && Ie(o.rest, i));
    }
    return !1;
  }
  var Eu =
      (e, n = {}) =>
      (i) => {
        let o = pt({ ...i, processors: n });
        return (q(e, o), gt(o, e), ht(o, e));
      },
    Nn =
      (e, n, i = {}) =>
      (o) => {
        let { libraryOptions: t, target: r } = o ?? {},
          a = pt({ ...(t ?? {}), target: r, io: n, processors: i });
        return (q(e, a), gt(a, e), ht(a, e));
      };
  var Pn = (e, n, i) => {
      (e[n] === void 0 || i > e[n]) && (e[n] = i);
    },
    On = (e, n, i) => {
      (e[n] === void 0 || i < e[n]) && (e[n] = i);
    },
    Ym = (e, n) => {
      (Pn(e, "minimum", n), On(e, "maximum", n));
    },
    np = (e, n) => {
      (e.multipleOf ?? (e.multipleOf = []), e.multipleOf.includes(n) || e.multipleOf.push(n));
    },
    rp = (e, n) => {
      (e.patterns ?? (e.patterns = new Set()), e.patterns.add(n));
    },
    ip = (e, n) => {
      e.mime = e.mime ? e.mime.filter((i) => n.includes(i)) : [...n];
    },
    op = (e, n) => {
      ((e.format = n), n.includes("int") && (e.isInt = !0));
    },
    Qm = (e, n) => Pn(e, "minimum", n.minimum),
    ep = (e, n) => On(e, "maximum", n.maximum),
    tp = (e) => (n, i) => {
      op(n, i.format);
      let [o, t] = e[i.format];
      (Pn(n, "minimum", o), On(n, "maximum", t));
    },
    Ib = {
      greater_than: (e, n) => Pn(e, n.inclusive ? "minimum" : "exclusiveMinimum", n.value),
      less_than: (e, n) => On(e, n.inclusive ? "maximum" : "exclusiveMaximum", n.value),
      multiple_of: (e, n) => np(e, n.value),
      number_format: tp(Kn),
      bigint_format: tp(qn),
      min_length: Qm,
      max_length: ep,
      length_equals: (e, n) => Ym(e, n.length),
      min_size: Qm,
      max_size: ep,
      size_equals: (e, n) => Ym(e, n.size),
      string_format: (e, n) => {
        (op(e, n.format),
          n.pattern && rp(e, n.pattern),
          (n.format === "base64" || n.format === "base64url") && (e.contentEncoding = n.format),
          (n.local || n.precision === -1) && (e.laxFormat = !0));
      },
      mime_type: (e, n) => ip(e, n.mime),
    };
  function le(e) {
    let n = {},
      i = e._zod.def,
      o = e._zod.traits.has("$ZodCheck") ? [e, ...(i.checks ?? [])] : (i.checks ?? []);
    for (let r of o) Ib[r._zod.def.check]?.(n, r._zod.def);
    let t = e._zod.bag;
    (t.minimum !== void 0 && Pn(n, "minimum", t.minimum),
      t.exclusiveMinimum !== void 0 && Pn(n, "exclusiveMinimum", t.exclusiveMinimum),
      t.maximum !== void 0 && On(n, "maximum", t.maximum),
      t.exclusiveMaximum !== void 0 && On(n, "exclusiveMaximum", t.exclusiveMaximum),
      t.multipleOf !== void 0 && np(n, t.multipleOf),
      t.format !== void 0 &&
        (n.format ?? (n.format = t.format), t.format.includes("int") && (n.isInt = !0)),
      t.mime && ip(n, t.mime));
    for (let r of t.patterns ?? []) rp(n, r);
    return n;
  }
  var Sb = {
      guid: "uuid",
      url: "uri",
      datetime: "date-time",
      json_string: "json-string",
      regex: "",
    },
    zb = new Map([
      [ki, Za],
      [dr, Va],
    ]),
    ap = (e) => zb.get(e) ?? e,
    ju = (e, n, i, o) => {
      let t = i;
      t.type = "string";
      let {
        minimum: r,
        maximum: a,
        format: s,
        patterns: u,
        contentEncoding: c,
        laxFormat: l,
      } = le(e);
      if (
        (typeof r == "number" && (t.minLength = r),
        typeof a == "number" && (t.maxLength = a),
        s &&
          ((t.format = Sb[s] ?? s),
          t.format === "" && delete t.format,
          (s === "time" || l) && delete t.format),
        c && (t.contentEncoding = c),
        u && u.size > 0)
      ) {
        let f = [...u].map(ap);
        f.length === 1
          ? (t.pattern = f[0].source)
          : f.length > 1 &&
            (t.allOf = [
              ...f.map((d) => ({
                ...(n.target === "draft-07" || n.target === "draft-04" || n.target === "openapi-3.0"
                  ? { type: "string" }
                  : {}),
                pattern: d.source,
              })),
            ]);
      }
    },
    Uu = (e, n, i, o) => {
      let t = i,
        {
          minimum: r,
          maximum: a,
          multipleOf: s,
          exclusiveMaximum: u,
          exclusiveMinimum: c,
          isInt: l,
        } = le(e);
      t.type = l ? "integer" : "number";
      let f = typeof c == "number" && c >= (r ?? Number.NEGATIVE_INFINITY),
        d = typeof u == "number" && u <= (a ?? Number.POSITIVE_INFINITY),
        m = n.target === "draft-04" || n.target === "openapi-3.0";
      if (
        (f
          ? m
            ? ((t.minimum = c), (t.exclusiveMinimum = !0))
            : (t.exclusiveMinimum = c)
          : typeof r == "number" && (t.minimum = r),
        d
          ? m
            ? ((t.maximum = u), (t.exclusiveMaximum = !0))
            : (t.exclusiveMaximum = u)
          : typeof a == "number" && (t.maximum = a),
        s)
      ) {
        let g = new Set();
        for (let z of s)
          Number.isFinite(z) && z !== 0
            ? g.add(Math.abs(z))
            : ue(e, n, t, o, `A multipleOf divisor of ${z} cannot be represented in JSON Schema`);
        let [$, ...w] = g;
        ($ !== void 0 && (t.multipleOf = $),
          w.length && (t.allOf = [...(t.allOf ?? []), ...w.map((z) => ({ multipleOf: z }))]));
      }
    },
    Cu = (e, n, i, o) => {
      i.type = "boolean";
    },
    Lu = (e, n, i, o) => {
      ue(e, n, i, o, "BigInt cannot be represented in JSON Schema");
    },
    Ru = (e, n, i, o) => {
      ue(e, n, i, o, "Symbols cannot be represented in JSON Schema");
    },
    Zu = (e, n, i, o) => {
      n.target === "openapi-3.0"
        ? ((i.type = "string"), (i.nullable = !0), (i.enum = [null]))
        : (i.type = "null");
    },
    Vu = (e, n, i, o) => {
      ue(e, n, i, o, "Undefined cannot be represented in JSON Schema");
    },
    Mu = (e, n, i, o) => {
      ue(e, n, i, o, "Void cannot be represented in JSON Schema");
    },
    Fu = (e, n, i, o) => {
      i.not = {};
    },
    Bu = (e, n, i, o) => {},
    Wu = (e, n, i, o) => {},
    Ju = (e, n, i, o) => {
      ue(e, n, i, o, "Date cannot be represented in JSON Schema");
    },
    Gu = (e, n, i, o) => {
      let t = e._zod.def,
        r = en(t.entries);
      if (r.length === 0) {
        i.not = {};
        return;
      }
      (r.every((a) => typeof a == "number") && (i.type = "number"),
        r.every((a) => typeof a == "string") && (i.type = "string"),
        (i.enum = r));
    },
    Ku = (e, n, i, o) => {
      let t = e._zod.def;
      if (t.values.length === 0) {
        i.not = {};
        return;
      }
      let r = [];
      for (let a of t.values)
        if (a === void 0) {
          if (ue(e, n, i, o, "Literal `undefined` cannot be represented in JSON Schema")) return;
        } else if (typeof a == "bigint") {
          if (ue(e, n, i, o, "BigInt literals cannot be represented in JSON Schema")) return;
          r.push(Number(a));
        } else r.push(a);
      if (r.length !== 0)
        if (r.length === 1) {
          let a = r[0];
          ((i.type = a === null ? "null" : typeof a),
            n.target === "draft-04" || n.target === "openapi-3.0" ? (i.enum = [a]) : (i.const = a));
        } else
          (r.every((a) => typeof a == "number") && (i.type = "number"),
            r.every((a) => typeof a == "string") && (i.type = "string"),
            r.every((a) => typeof a == "boolean") && (i.type = "boolean"),
            r.every((a) => a === null) && (i.type = "null"),
            (i.enum = r));
    },
    qu = (e, n, i, o) => {
      ue(e, n, i, o, "NaN cannot be represented in JSON Schema");
    },
    Xu = (e, n, i, o) => {
      let t = i,
        r = e._zod.pattern;
      if (!r) throw new Error("Pattern not found in template literal");
      ((t.type = "string"), (t.pattern = r.source));
    },
    Hu = (e, n, i, o) => {
      let t = i;
      ((t.type = "string"), (t.format = "binary"), (t.contentEncoding = "binary"));
      let { minimum: r, maximum: a, mime: s } = le(e);
      (r !== void 0 && (t.minLength = r),
        a !== void 0 && (t.maxLength = a),
        s &&
          (s.length === 0
            ? (t.not = {})
            : s.length === 1
              ? (t.contentMediaType = s[0])
              : (t.anyOf = s.map((u) => ({ contentMediaType: u })))));
    },
    Yu = (e, n, i, o) => {
      i.type = "boolean";
    },
    Qu = (e, n, i, o) => {
      ue(e, n, i, o, "Custom types cannot be represented in JSON Schema");
    },
    el = (e, n, i, o) => {
      ue(e, n, i, o, "Function types cannot be represented in JSON Schema");
    },
    tl = (e, n, i, o) => {
      ue(e, n, i, o, "Transforms cannot be represented in JSON Schema");
    },
    nl = (e, n, i, o) => {
      ue(e, n, i, o, "Map cannot be represented in JSON Schema");
    },
    rl = (e, n, i, o) => {
      ue(e, n, i, o, "Set cannot be represented in JSON Schema");
    },
    il = (e, n, i, o) => {
      let t = i,
        r = e._zod.def,
        { minimum: a, maximum: s } = le(e);
      (typeof a == "number" && (t.minItems = a),
        typeof s == "number" && (t.maxItems = s),
        (t.type = "array"),
        (t.items = q(r.element, n, { ...o, path: [...o.path, "items"] })));
    };
  function zr(e) {
    let n = e._zod.def;
    return n.type === "pipe" && n.in._zod.traits.has("$ZodTransform")
      ? zr(n.out)
      : n.type === "catch"
        ? zr(n.innerType)
        : e._zod.optin;
  }
  var ol = (e, n, i, o) => {
      let t = i,
        r = e._zod.def,
        a = r.shape;
      if (
        Object.getOwnPropertySymbols(a).length &&
        ue(e, n, t, o, "Symbol keys cannot be represented in JSON Schema")
      )
        return;
      ((t.type = "object"), (t.properties = {}));
      for (let c in a)
        he(t.properties, c, q(a[c], n, { ...o, path: [...o.path, "properties", c] }));
      let u = [];
      for (let c of Object.keys(a)) {
        let l = r.shape[c];
        (n.io === "input" ? zr(l) === void 0 : l._zod.optout === void 0) && u.push(c);
      }
      (u.length > 0 && (t.required = u),
        r.catchall?._zod.def.type === "never"
          ? (t.additionalProperties = !1)
          : r.catchall
            ? r.catchall &&
              (t.additionalProperties = q(r.catchall, n, {
                ...o,
                path: [...o.path, "additionalProperties"],
              }))
            : n.io === "output" && (t.additionalProperties = !1));
    },
    wo = (e, n, i, o) => {
      let t = e._zod.def,
        r = t.inclusive === !1,
        a = t.options.map((s, u) => q(s, n, { ...o, path: [...o.path, r ? "oneOf" : "anyOf", u] }));
      r ? (i.oneOf = a) : (i.anyOf = a);
    },
    al = (e, n, i, o) => {
      let t = e._zod.def,
        r = q(t.left, n, { ...o, path: [...o.path, "allOf", 0] }),
        a = q(t.right, n, { ...o, path: [...o.path, "allOf", 1] }),
        s = (c) => "allOf" in c && Object.keys(c).length === 1,
        u = [...(s(r) ? r.allOf : [r]), ...(s(a) ? a.allOf : [a])];
      ((i.allOf = u), n.intersections.push(u));
    },
    sl = (e, n, i, o) => {
      let t = i,
        r = e._zod.def;
      t.type = "array";
      let a = n.target === "draft-2020-12" ? "prefixItems" : "items",
        s =
          n.target === "draft-2020-12" || n.target === "openapi-3.0" ? "items" : "additionalItems",
        u = r.items.map(($, w) => q($, n, { ...o, path: [...o.path, a, w] })),
        c = r.rest
          ? q(r.rest, n, {
              ...o,
              path: [...o.path, s, ...(n.target === "openapi-3.0" ? [r.items.length] : [])],
            })
          : null,
        l = r.items.length;
      for (; l > 0; ) {
        let $ = r.items[l - 1];
        if (!(n.io === "input" ? zr($) !== void 0 : $._zod.optout === "optional")) break;
        l--;
      }
      let f = r.items.length,
        d = !r.rest;
      n.target === "draft-2020-12"
        ? ((t.prefixItems = u),
          d ? (t.items = !1) : c && (t.items = c),
          l > 0 && (t.minItems = l),
          d && (t.maxItems = f))
        : n.target === "openapi-3.0"
          ? ((t.items = { anyOf: u }),
            c && t.items.anyOf.push(c),
            l > 0 && (t.minItems = l),
            d && (t.maxItems = f))
          : ((t.items = u),
            d ? (t.additionalItems = !1) : c && (t.additionalItems = c),
            l > 0 && (t.minItems = l),
            d && (t.maxItems = f));
      let { minimum: m, maximum: g } = le(e);
      (typeof m == "number" && (t.minItems = m), typeof g == "number" && (t.maxItems = g));
    };
  function Au(e, n, i) {
    if (n.$ref) {
      if (i.has(n)) return n;
      i.add(n);
      let g = e.get(n)?.def;
      if (!g) return n;
      let $ = Au(e, g, i);
      return $ === g ? n : $;
    }
    for (let g of ["anyOf", "oneOf"]) {
      let $ = n[g];
      if (!Array.isArray($)) continue;
      let w = $.map((z) => Au(e, z, i));
      w.some((z, x) => z !== $[x]) && (n = { ...n, [g]: w });
    }
    let o = Array.isArray(n.type) ? n.type : [n.type],
      t = !o.includes("string") && o.some((g) => g === "number" || g === "integer"),
      r = n.enum ?? (n.const !== void 0 ? [n.const] : void 0);
    if (!t && !r?.some((g) => typeof g == "number")) return n;
    let {
      minimum: a,
      maximum: s,
      exclusiveMinimum: u,
      exclusiveMaximum: c,
      multipleOf: l,
      format: f,
      id: d,
      ...m
    } = n;
    return (
      m.enum
        ? (m.enum = m.enum.map((g) => (typeof g == "number" ? String(g) : g)))
        : typeof m.const == "number" && (m.const = String(m.const)),
      t && ((m.type = "string"), r || (m.pattern = (o.includes("number") ? it : ir).source)),
      m
    );
  }
  var Du = new WeakMap();
  function Nb(e) {
    let n = new Map();
    for (let o of e.seen.values()) o.def && !n.has(o.schema) && n.set(o.schema, o);
    let i = new Map();
    for (let o of Du.get(e) ?? []) {
      let t = e.seen.get(o),
        r = (t?.def ?? t?.schema)?.propertyNames;
      if (!r || r === !0 || i.has(r)) continue;
      let a = Au(n, r, new Set());
      a !== r && i.set(r, a);
    }
    if (i.size)
      for (let o of e.seen.values())
        for (let t of [o.schema, o.def]) {
          let r = t && i.get(t.propertyNames);
          r && (t.propertyNames = r);
        }
  }
  var cl = (e, n, i, o) => {
      let t = i,
        r = e._zod.def;
      t.type = "object";
      let a = r.keyType,
        s = le(a).patterns;
      if (r.mode === "loose" && s && s.size > 0) {
        let l = q(r.valueType, n, { ...o, path: [...o.path, "patternProperties", "*"] });
        t.patternProperties = {};
        for (let f of s) he(t.patternProperties, ap(f).source, l);
      } else {
        if (n.target === "draft-07" || n.target === "draft-2020-12") {
          t.propertyNames = q(r.keyType, n, { ...o, path: [...o.path, "propertyNames"] });
          let l = Du.get(n);
          (l || ((l = []), Du.set(n, l), n.deferred.push(() => Nb(n))), l.push(e));
        }
        t.additionalProperties = q(r.valueType, n, {
          ...o,
          path: [...o.path, "additionalProperties"],
        });
      }
      let u = a._zod.values,
        c = n.io === "input" && zr(r.valueType) !== void 0;
      if (u && !r.partial && !c) {
        let l = [...u].filter((f) => typeof f == "string" || typeof f == "number");
        l.length > 0 && (t.required = l.map(String));
      }
    },
    ul = (e, n, i, o) => {
      let t = e._zod.def,
        r = q(t.innerType, n, o),
        a = n.seen.get(e);
      n.target === "openapi-3.0"
        ? ((a.ref = t.innerType), (i.nullable = !0))
        : (i.anyOf = [r, { type: "null" }]);
    },
    ll = (e, n, i, o) => {
      let t = e._zod.def;
      q(t.innerType, n, o);
      let r = n.seen.get(e);
      r.ref = t.innerType;
    },
    dl = Symbol();
  function sp(e, n, i, o, t) {
    let r = !1,
      a = JSON.stringify(e, (s, u) => (typeof u != "bigint" ? u : ((r = !0), null)));
    return r
      ? (ue(n, i, o, t, "BigInt defaults cannot be represented in JSON Schema"), dl)
      : JSON.parse(a);
  }
  var fl = (e, n, i, o) => {
      let t = e._zod.def;
      q(t.innerType, n, o);
      let r = n.seen.get(e);
      r.ref = t.innerType;
      let a = sp(t.defaultValue, e, n, i, o);
      a !== dl && (i.default = a);
    },
    ml = (e, n, i, o) => {
      let t = e._zod.def;
      q(t.innerType, n, o);
      let r = n.seen.get(e);
      if (((r.ref = t.innerType), n.io !== "input")) return;
      let a = sp(t.defaultValue, e, n, i, o);
      a !== dl && (i._prefault = a);
    },
    pl = (e, n, i, o) => {
      let t = e._zod.def;
      q(t.innerType, n, o);
      let r = n.seen.get(e);
      r.ref = t.innerType;
      let a;
      try {
        a = t.catchValue(void 0);
      } catch {
        ue(e, n, i, o, "Dynamic catch values are not supported in JSON Schema");
        return;
      }
      i.default = a;
    },
    gl = (e, n, i, o) => {
      let t = e._zod.def,
        r = t.in._zod.traits.has("$ZodTransform"),
        a = n.io === "input" ? (r ? t.out : t.in) : t.out;
      q(a, n, o);
      let s = n.seen.get(e);
      s.ref = a;
    },
    hl = (e, n, i, o) => {
      let t = e._zod.def;
      q(t.innerType, n, o);
      let r = n.seen.get(e);
      ((r.ref = t.innerType), (i.readOnly = !0));
    },
    vl = (e, n, i, o) => {
      let t = e._zod.def;
      q(t.innerType, n, o);
      let r = n.seen.get(e);
      r.ref = t.innerType;
    },
    xo = (e, n, i, o) => {
      let t = e._zod.def;
      q(t.innerType, n, o);
      let r = n.seen.get(e);
      r.ref = t.innerType;
    },
    $l = (e, n, i, o) => {
      let t = e._zod.innerType;
      q(t, n, o);
      let r = n.seen.get(e);
      r.ref = t;
    },
    _o = {
      string: ju,
      number: Uu,
      boolean: Cu,
      bigint: Lu,
      symbol: Ru,
      null: Zu,
      undefined: Vu,
      void: Mu,
      never: Fu,
      any: Bu,
      unknown: Wu,
      date: Ju,
      enum: Gu,
      literal: Ku,
      nan: qu,
      template_literal: Xu,
      file: Hu,
      success: Yu,
      custom: Qu,
      function: el,
      transform: tl,
      map: nl,
      set: rl,
      array: il,
      object: ol,
      union: wo,
      intersection: al,
      tuple: sl,
      record: cl,
      nullable: ul,
      nonoptional: ll,
      default: fl,
      prefault: ml,
      catch: pl,
      pipe: gl,
      readonly: hl,
      promise: vl,
      optional: xo,
      lazy: $l,
    };
  function Tn(e, n) {
    if ("_idmap" in e) {
      let o = e,
        t = pt({ ...n, processors: _o }),
        r = {};
      for (let u of o._idmap.entries()) {
        let [c, l] = u;
        q(l, t);
      }
      let a = {},
        s = { registry: o, uri: n?.uri, defs: r };
      t.external = s;
      for (let u of o._idmap.entries()) {
        let [c, l] = u;
        (gt(t, l), he(a, c, ht(t, l)));
      }
      if (Object.keys(r).length > 0) {
        let u = t.target === "draft-2020-12" ? "$defs" : "definitions";
        a.__shared = { [u]: r };
      }
      return { schemas: a };
    }
    let i = pt({ ...n, processors: _o });
    return (q(e, i), gt(i, e), ht(i, e));
  }
  var ko = class {
    get metadataRegistry() {
      return this.ctx.metadataRegistry;
    }
    get target() {
      return this.ctx.target;
    }
    get unrepresentable() {
      return this.ctx.unrepresentable;
    }
    get override() {
      return this.ctx.override;
    }
    get io() {
      return this.ctx.io;
    }
    get counter() {
      return this.ctx.counter;
    }
    set counter(n) {
      this.ctx.counter = n;
    }
    get seen() {
      return this.ctx.seen;
    }
    constructor(n) {
      let i = n?.target ?? "draft-2020-12";
      (i === "draft-4" && (i = "draft-04"),
        i === "draft-7" && (i = "draft-07"),
        (this.ctx = pt({
          processors: _o,
          target: i,
          ...(n?.metadata && { metadata: n.metadata }),
          ...(n?.unrepresentable && { unrepresentable: n.unrepresentable }),
          ...(n?.override && { override: n.override }),
          ...(n?.io && { io: n.io }),
        })));
    }
    process(n, i = { path: [], schemaPath: [] }) {
      return q(n, this.ctx, i);
    }
    emit(n, i) {
      (i &&
        (i.cycles && (this.ctx.cycles = i.cycles),
        i.reused && (this.ctx.reused = i.reused),
        i.external && (this.ctx.external = i.external)),
        (this.ctx.sharedDefsExtractedFor = void 0),
        (this.ctx.sharedEmitDoneFor = void 0),
        gt(this.ctx, n));
      let o = ht(this.ctx, n),
        { "~standard": t, ...r } = o;
      return r;
    }
  };
  var cp = {};
  var Ln = {};
  Ge(Ln, {
    ZodAny: () => Ll,
    ZodArray: () => Ml,
    ZodBase64: () => Mo,
    ZodBase64URL: () => Fo,
    ZodBigInt: () => Cn,
    ZodBigIntFormat: () => Jo,
    ZodBoolean: () => Un,
    ZodCIDRv4: () => Zo,
    ZodCIDRv6: () => Vo,
    ZodCUID: () => Ao,
    ZodCUID2: () => Do,
    ZodCatch: () => ud,
    ZodCodec: () => jr,
    ZodCreditCard: () => El,
    ZodCustom: () => Ur,
    ZodCustomStringFormat: () => Wt,
    ZodDate: () => Or,
    ZodDefault: () => rd,
    ZodDiscriminatedUnion: () => Bl,
    ZodE164: () => Bo,
    ZodEmail: () => Po,
    ZodEmoji: () => To,
    ZodEnum: () => An,
    ZodExactOptional: () => Xo,
    ZodFile: () => Ql,
    ZodFunction: () => yd,
    ZodGUID: () => Oo,
    ZodIBAN: () => Al,
    ZodIPv4: () => Lo,
    ZodIPv6: () => Ro,
    ZodISODate: () => yt,
    ZodISODateTime: () => $t,
    ZodISODuration: () => _t,
    ZodISOTime: () => bt,
    ZodInstanceOf: () => wd,
    ZodIntersection: () => Wl,
    ZodJWT: () => Wo,
    ZodKSUID: () => Co,
    ZodLazy: () => hd,
    ZodLiteral: () => Yl,
    ZodMAC: () => Tl,
    ZodMap: () => Xl,
    ZodNaN: () => dd,
    ZodNanoID: () => Eo,
    ZodNever: () => Zl,
    ZodNonOptional: () => Ho,
    ZodNull: () => Ul,
    ZodNullable: () => nd,
    ZodNumber: () => jn,
    ZodNumberFormat: () => Jt,
    ZodObject: () => Kt,
    ZodOptional: () => Ar,
    ZodPipe: () => Dr,
    ZodPrefault: () => od,
    ZodPreprocess: () => fd,
    ZodPromise: () => $d,
    ZodReadonly: () => md,
    ZodRecord: () => En,
    ZodSet: () => Hl,
    ZodString: () => Dn,
    ZodStringFormat: () => X,
    ZodSuccess: () => cd,
    ZodSymbol: () => Dl,
    ZodTemplateLiteral: () => gd,
    ZodTransform: () => ed,
    ZodTuple: () => Gl,
    ZodType: () => V,
    ZodULID: () => jo,
    ZodURL: () => Pr,
    ZodUUID: () => He,
    ZodUndefined: () => jl,
    ZodUnion: () => Er,
    ZodUnknown: () => Rl,
    ZodVoid: () => Vl,
    ZodXID: () => Uo,
    ZodXor: () => Fl,
    _ZodString: () => No,
    _default: () => id,
    _function: () => yg,
    any: () => Hp,
    array: () => Tr,
    base64: () => Tp,
    base64url: () => Ep,
    bigint: () => Jp,
    boolean: () => Gt,
    catch: () => ld,
    check: () => bg,
    cidrv4: () => Pp,
    cidrv6: () => Op,
    codec: () => gg,
    creditCard: () => Dp,
    cuid: () => _p,
    cuid2: () => wp,
    currencyCode: () => Zp,
    custom: () => _g,
    date: () => Qp,
    describe: () => wg,
    discriminatedUnion: () => ig,
    e164: () => Ap,
    email: () => dp,
    emoji: () => yp,
    enum: () => Ko,
    exactOptional: () => td,
    file: () => dg,
    float32: () => Mp,
    float64: () => Fp,
    function: () => yg,
    guid: () => fp,
    hash: () => Vp,
    hex: () => Rp,
    hostname: () => Lp,
    httpUrl: () => $p,
    iban: () => jp,
    instanceof: () => kg,
    int: () => vt,
    int32: () => Bp,
    int64: () => Gp,
    intersection: () => Jl,
    invertCodec: () => hg,
    ipv4: () => Sp,
    ipv6: () => Np,
    json: () => Sg,
    jwt: () => Up,
    keyof: () => eg,
    ksuid: () => Ip,
    lazy: () => vd,
    literal: () => lg,
    looseObject: () => ng,
    looseRecord: () => ag,
    mac: () => zp,
    map: () => sg,
    meta: () => xg,
    nan: () => pg,
    nanoid: () => bp,
    nativeEnum: () => ug,
    never: () => Go,
    nonoptional: () => sd,
    null: () => Cl,
    nullable: () => Nr,
    nullish: () => fg,
    number: () => Ye,
    object: () => Ae,
    optional: () => Ft,
    partialRecord: () => og,
    pipe: () => zo,
    prefault: () => ad,
    preprocess: () => zg,
    promise: () => $g,
    readonly: () => pd,
    record: () => ql,
    refine: () => bd,
    set: () => cg,
    strictObject: () => tg,
    string: () => Ee,
    stringFormat: () => Cp,
    stringbool: () => Ig,
    success: () => mg,
    superRefine: () => _d,
    symbol: () => qp,
    templateLiteral: () => vg,
    transform: () => qo,
    tuple: () => Kl,
    uint32: () => Wp,
    uint64: () => Kp,
    ulid: () => xp,
    undefined: () => Xp,
    union: () => wt,
    unknown: () => Mt,
    url: () => vp,
    uuid: () => mp,
    uuidv4: () => pp,
    uuidv6: () => gp,
    uuidv7: () => hp,
    void: () => Yp,
    xid: () => kp,
    xor: () => rg,
  });
  var Io = {};
  Ge(Io, {
    endsWith: () => bn,
    gt: () => qe,
    gte: () => Ue,
    includes: () => $n,
    length: () => Zt,
    lowercase: () => hn,
    lt: () => Ke,
    lte: () => je,
    maxLength: () => Rt,
    maxSize: () => mt,
    mime: () => wn,
    minLength: () => ot,
    minSize: () => Xe,
    multipleOf: () => ft,
    negative: () => vo,
    nonnegative: () => yo,
    nonpositive: () => $o,
    normalize: () => xn,
    overwrite: () => Je,
    positive: () => ho,
    properties: () => _n,
    property: () => bo,
    regex: () => gn,
    size: () => Lt,
    slugify: () => zn,
    startsWith: () => yn,
    toLowerCase: () => In,
    toUpperCase: () => Sn,
    trim: () => kn,
    uppercase: () => vn,
  });
  var up = new WeakSet([Object.prototype, Error.prototype]);
  function So(e, n, i) {
    Object.defineProperty(e, n, {
      configurable: !0,
      enumerable: !1,
      get() {
        let o = i(this);
        return (Object.defineProperty(this, n, { value: o, configurable: !0, writable: !0 }), o);
      },
      set(o) {
        Object.defineProperty(this, n, { value: o, configurable: !0, writable: !0 });
      },
    });
  }
  var lp = (e, n) => {
      (_a.init(e, n), (e.name = "ZodError"));
      let i = Object.getPrototypeOf(e);
      up.has(i) ||
        (up.add(i),
        So(i, "format", (o) => (t) => er(o, t)),
        So(i, "flatten", (o) => (t) => Qn(o, t)),
        So(i, "addIssue", (o) => (t) => {
          (o.issues.push(t), (o.message = JSON.stringify(o.issues, tn, 2)));
        }),
        So(i, "addIssues", (o) => (t) => {
          (o.issues.push(...t), (o.message = JSON.stringify(o.issues, tn, 2)));
        }),
        Object.defineProperty(i, "isEmpty", {
          configurable: !0,
          enumerable: !1,
          get() {
            return this.issues.length === 0;
          },
        }));
    },
    Ob = h("ZodError", lp),
    Te = h("ZodError", lp, void 0, { Parent: Error });
  var yl = an(Te),
    bl = sn(Te),
    _l = cn(Te),
    wl = un(Te),
    xl = ti(Te),
    kl = ni(Te),
    Il = ri(Te),
    Sl = ii(Te),
    zl = oi(Te),
    Nl = ai(Te),
    Pl = si(Te),
    Ol = ci(Te);
  function Eb() {
    fe.localeError || re(Zi());
  }
  function Bt() {
    fe.memoizer || re({ memoizer: $r() });
  }
  var V = h("ZodType", (e, n) => (Eb(), L.init(e, n), (e.def = n), (e.type = n.type), e), {
      check(...e) {
        let n = this.def;
        return this.clone(
          y.mergeDefs(n, {
            checks: [
              ...(n.checks ?? []),
              ...e.map((i) =>
                typeof i == "function"
                  ? { _zod: { check: i, def: { check: "custom" }, onattach: [] } }
                  : i,
              ),
            ],
          }),
          { parent: !0 },
        );
      },
      with(...e) {
        return this.check(...e);
      },
      clone(e, n) {
        return G(this, e, n);
      },
      brand() {
        return this;
      },
      register(e, n) {
        return (e.add(this, n), this);
      },
      refine(e, n) {
        return this.check(bd(e, n));
      },
      superRefine(e, n) {
        return this.check(_d(e, n));
      },
      overwrite(e) {
        return this.check(Je(e));
      },
      optional() {
        return Ft(this);
      },
      exactOptional() {
        return td(this);
      },
      nullable() {
        return Nr(this);
      },
      nullish() {
        return Ft(Nr(this));
      },
      nonoptional(e) {
        return sd(this, e);
      },
      array() {
        return Tr(this);
      },
      or(e) {
        return wt([this, e]);
      },
      and(e) {
        return Jl(this, e);
      },
      transform(e) {
        return zo(this, qo(e));
      },
      default(e) {
        return id(this, e);
      },
      prefault(e) {
        return ad(this, e);
      },
      catch(e) {
        return ld(this, e);
      },
      pipe(e) {
        return zo(this, e);
      },
      readonly() {
        return pd(this);
      },
      describe(e) {
        let n = this.clone();
        return (ve.add(n, { description: e }), n);
      },
      meta(...e) {
        if (e.length === 0) return ve.get(this);
        let n = this.clone();
        return (ve.add(n, e[0]), n);
      },
      isOptional() {
        return this.safeParse(void 0).success;
      },
      isNullable() {
        return this.safeParse(null).success;
      },
      apply(e, ...n) {
        return n.length === 0 ? e(this) : e(this, ...n);
      },
      get "~standard"() {
        return y.hide(this, "~standard", {
          ...yi(this),
          jsonSchema: { input: Nn(this, "input"), output: Nn(this, "output") },
        });
      },
      set "~standard"(e) {
        y.own(this, "~standard", e);
      },
      parse: function e(n, i) {
        return yl(this, n, i, { callee: e });
      },
      parseAsync: async function e(n, i) {
        return await bl(this, n, i, { callee: e });
      },
      safeParse(e, n) {
        return _l(this, e, n);
      },
      async safeParseAsync(e, n) {
        return wl(this, e, n);
      },
      get spa() {
        return this?.safeParseAsync;
      },
      set spa(e) {
        y.own(this, "spa", e);
      },
      validate(e, n) {
        return tr(this, e, n);
      },
      validateAsync(e, n) {
        return nr(this, e, n);
      },
      encode: function e(n, i) {
        return xl(this, n, i, { callee: e });
      },
      decode: function e(n, i) {
        return kl(this, n, i, { callee: e });
      },
      encodeAsync: async function e(n, i) {
        return await Il(this, n, i, { callee: e });
      },
      decodeAsync: async function e(n, i) {
        return await Sl(this, n, i, { callee: e });
      },
      safeEncode(e, n) {
        return zl(this, e, n);
      },
      safeDecode(e, n) {
        return Nl(this, e, n);
      },
      async safeEncodeAsync(e, n) {
        return Pl(this, e, n);
      },
      async safeDecodeAsync(e, n) {
        return Ol(this, e, n);
      },
      toJSONSchema(e) {
        return Eu(this, {})(e);
      },
      get description() {
        return ve.get(this)?.description;
      },
      get _def() {
        return this._zod.def;
      },
    }),
    No = h(
      "_ZodString",
      (e, n) => {
        (At.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => ju(e, i, o, t)));
      },
      y.derived(
        {
          format: (e) => le(e).format ?? null,
          minLength: (e) => le(e).minimum ?? null,
          maxLength: (e) => le(e).maximum ?? null,
        },
        {
          regex(...e) {
            return this.check(gn(...e));
          },
          includes(...e) {
            return this.check($n(...e));
          },
          startsWith(...e) {
            return this.check(yn(...e));
          },
          endsWith(...e) {
            return this.check(bn(...e));
          },
          min(...e) {
            return this.check(ot(...e));
          },
          max(...e) {
            return this.check(Rt(...e));
          },
          length(...e) {
            return this.check(Zt(...e));
          },
          nonempty(...e) {
            return this.check(ot(1, ...e));
          },
          lowercase(e) {
            return this.check(hn(e));
          },
          uppercase(e) {
            return this.check(vn(e));
          },
          trim() {
            return this.check(kn());
          },
          normalize(...e) {
            return this.check(xn(...e));
          },
          toLowerCase() {
            return this.check(In());
          },
          toUpperCase() {
            return this.check(Sn());
          },
          slugify() {
            return this.check(zn());
          },
        },
      ),
    ),
    Dn = h(
      "ZodString",
      (e, n) => {
        (At.init(e, n), No.init(e, n));
      },
      {
        email(e) {
          return this.check(Ki(Po, e));
        },
        url(e) {
          return this.check(_r(Pr, e));
        },
        jwt(e) {
          return this.check(go(Wo, e));
        },
        emoji(e) {
          return this.check(eo(To, e));
        },
        guid(e) {
          return this.check(qi(Oo, e));
        },
        uuid(e) {
          return this.check(Xi(He, e));
        },
        uuidv4(e) {
          return this.check(Hi(He, e));
        },
        uuidv6(e) {
          return this.check(Yi(He, e));
        },
        uuidv7(e) {
          return this.check(Qi(He, e));
        },
        nanoid(e) {
          return this.check(to(Eo, e));
        },
        cuid(e) {
          return this.check(no(Ao, e));
        },
        cuid2(e) {
          return this.check(ro(Do, e));
        },
        ulid(e) {
          return this.check(io(jo, e));
        },
        base64(e) {
          return this.check(fo(Mo, e));
        },
        base64url(e) {
          return this.check(mo(Fo, e));
        },
        xid(e) {
          return this.check(oo(Uo, e));
        },
        ksuid(e) {
          return this.check(ao(Co, e));
        },
        ipv4(e) {
          return this.check(so(Lo, e));
        },
        ipv6(e) {
          return this.check(co(Ro, e));
        },
        cidrv4(e) {
          return this.check(uo(Zo, e));
        },
        cidrv6(e) {
          return this.check(lo(Vo, e));
        },
        e164(e) {
          return this.check(po(Bo, e));
        },
        datetime(e) {
          return this.check(wr($t, e));
        },
        date(e) {
          return this.check(xr(yt, e));
        },
        time(e) {
          return this.check(kr(bt, e));
        },
        duration(e) {
          return this.check(Ir(_t, e));
        },
      },
    );
  function Ee(e) {
    return Kc(Dn, e);
  }
  var X = h("ZodStringFormat", (e, n) => {
      (K.init(e, n), No.init(e, n));
    }),
    $t = h("ZodISODateTime", (e, n) => {
      (Zs.init(e, n), X.init(e, n));
    }),
    yt = h("ZodISODate", (e, n) => {
      (Vs.init(e, n), X.init(e, n));
    }),
    bt = h("ZodISOTime", (e, n) => {
      (Ms.init(e, n), X.init(e, n));
    }),
    _t = h("ZodISODuration", (e, n) => {
      (Fs.init(e, n), X.init(e, n));
    }),
    Po = h("ZodEmail", (e, n) => {
      (Ps.init(e, n), X.init(e, n));
    });
  function dp(e) {
    return Ki(Po, e);
  }
  var Oo = h("ZodGUID", (e, n) => {
    (zs.init(e, n), X.init(e, n));
  });
  function fp(e) {
    return qi(Oo, e);
  }
  var He = h("ZodUUID", (e, n) => {
    (Ns.init(e, n), X.init(e, n));
  });
  function mp(e) {
    return Xi(He, e);
  }
  function pp(e) {
    return Hi(He, e);
  }
  function gp(e) {
    return Yi(He, e);
  }
  function hp(e) {
    return Qi(He, e);
  }
  var Pr = h("ZodURL", (e, n) => {
    (Es.init(e, n), X.init(e, n));
  });
  function vp(e) {
    return _r(Pr, e);
  }
  function $p(e) {
    return _r(Pr, { protocol: rr, hostname: Fa, ...y.normalizeParams(e) });
  }
  var To = h("ZodEmoji", (e, n) => {
    (As.init(e, n), X.init(e, n));
  });
  function yp(e) {
    return eo(To, e);
  }
  var Eo = h("ZodNanoID", (e, n) => {
    (Ds.init(e, n), X.init(e, n));
  });
  function bp(e) {
    return to(Eo, e);
  }
  var Ao = h("ZodCUID", (e, n) => {
    (js.init(e, n), X.init(e, n));
  });
  function _p(e) {
    return no(Ao, e);
  }
  var Do = h("ZodCUID2", (e, n) => {
    (Us.init(e, n), X.init(e, n));
  });
  function wp(e) {
    return ro(Do, e);
  }
  var jo = h("ZodULID", (e, n) => {
    (Cs.init(e, n), X.init(e, n));
  });
  function xp(e) {
    return io(jo, e);
  }
  var Uo = h("ZodXID", (e, n) => {
    (Ls.init(e, n), X.init(e, n));
  });
  function kp(e) {
    return oo(Uo, e);
  }
  var Co = h("ZodKSUID", (e, n) => {
    (Rs.init(e, n), X.init(e, n));
  });
  function Ip(e) {
    return ao(Co, e);
  }
  var Lo = h("ZodIPv4", (e, n) => {
    (Bs.init(e, n), X.init(e, n));
  });
  function Sp(e) {
    return so(Lo, e);
  }
  var Tl = h("ZodMAC", (e, n) => {
    (Js.init(e, n), X.init(e, n));
  });
  function zp(e) {
    return Xc(Tl, e);
  }
  var Ro = h("ZodIPv6", (e, n) => {
    (Ws.init(e, n), X.init(e, n));
  });
  function Np(e) {
    return co(Ro, e);
  }
  var Zo = h("ZodCIDRv4", (e, n) => {
    (Gs.init(e, n), X.init(e, n));
  });
  function Pp(e) {
    return uo(Zo, e);
  }
  var Vo = h("ZodCIDRv6", (e, n) => {
    (Ks.init(e, n), X.init(e, n));
  });
  function Op(e) {
    return lo(Vo, e);
  }
  var Mo = h("ZodBase64", (e, n) => {
    (qs.init(e, n), X.init(e, n));
  });
  function Tp(e) {
    return fo(Mo, e);
  }
  var Fo = h("ZodBase64URL", (e, n) => {
    (Xs.init(e, n), X.init(e, n));
  });
  function Ep(e) {
    return mo(Fo, e);
  }
  var Bo = h("ZodE164", (e, n) => {
    (Hs.init(e, n), X.init(e, n));
  });
  function Ap(e) {
    return po(Bo, e);
  }
  var El = h("ZodCreditCard", (e, n) => {
    (Ys.init(e, n), X.init(e, n));
  });
  function Dp(e) {
    return Hc(El, e);
  }
  var Al = h("ZodIBAN", (e, n) => {
    (Qs.init(e, n), X.init(e, n));
  });
  function jp(e) {
    return Yc(Al, e);
  }
  var Wo = h("ZodJWT", (e, n) => {
    (ec.init(e, n), X.init(e, n));
  });
  function Up(e) {
    return go(Wo, e);
  }
  var Wt = h("ZodCustomStringFormat", (e, n) => {
    (tc.init(e, n), X.init(e, n));
  });
  function Cp(e, n, i = {}) {
    return Vt(Wt, e, n, i);
  }
  function Lp(e) {
    return Vt(Wt, "hostname", Ma, e);
  }
  function Rp(e) {
    return Vt(Wt, "hex", rs, e);
  }
  function Zp(e) {
    return Vt(Wt, "currency_code", Wa, e);
  }
  function Vp(e, n) {
    let i = n?.enc ?? "hex",
      o = `${e}_${i}`,
      t = Ze[o];
    if (!t) throw new Error(`Unrecognized hash format: ${o}`);
    return Vt(Wt, o, t, n);
  }
  var jn = h(
    "ZodNumber",
    (e, n) => {
      (Pi.init(e, n),
        V.init(e, n),
        (e._zod.processJSONSchema = (i, o, t) => Uu(e, i, o, t)),
        (e.isFinite = !0));
    },
    y.derived(
      {
        minValue: (e) => {
          let { minimum: n, exclusiveMinimum: i } = le(e);
          return Math.max(n ?? Number.NEGATIVE_INFINITY, i ?? Number.NEGATIVE_INFINITY);
        },
        maxValue: (e) => {
          let { maximum: n, exclusiveMaximum: i } = le(e);
          return Math.min(n ?? Number.POSITIVE_INFINITY, i ?? Number.POSITIVE_INFINITY);
        },
        isInt: (e) => {
          let { isInt: n, multipleOf: i } = le(e);
          return !!n || !!i?.some(Number.isSafeInteger);
        },
        format: (e) => le(e).format ?? null,
      },
      {
        gt(e, n) {
          return this.check(qe(e, n));
        },
        gte(e, n) {
          return this.check(Ue(e, n));
        },
        min(e, n) {
          return this.check(Ue(e, n));
        },
        lt(e, n) {
          return this.check(Ke(e, n));
        },
        lte(e, n) {
          return this.check(je(e, n));
        },
        max(e, n) {
          return this.check(je(e, n));
        },
        int(e) {
          return this.check(vt(e));
        },
        safe(e) {
          return this.check(vt(e));
        },
        positive(e) {
          return this.check(qe(0, e));
        },
        nonnegative(e) {
          return this.check(Ue(0, e));
        },
        negative(e) {
          return this.check(Ke(0, e));
        },
        nonpositive(e) {
          return this.check(je(0, e));
        },
        multipleOf(e, n) {
          return this.check(ft(e, n));
        },
        step(e, n) {
          return this.check(ft(e, n));
        },
        finite() {
          return this;
        },
      },
    ),
  );
  function Ye(e) {
    return eu(jn, e);
  }
  var Jt = h("ZodNumberFormat", (e, n) => {
    (nc.init(e, n), jn.init(e, n));
  });
  function vt(e) {
    return nu(Jt, e);
  }
  function Mp(e) {
    return ru(Jt, e);
  }
  function Fp(e) {
    return iu(Jt, e);
  }
  function Bp(e) {
    return ou(Jt, e);
  }
  function Wp(e) {
    return au(Jt, e);
  }
  var Un = h("ZodBoolean", (e, n) => {
    (fr.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Cu(e, i, o, t)));
  });
  function Gt(e) {
    return su(Un, e);
  }
  var Cn = h(
    "ZodBigInt",
    (e, n) => {
      (Oi.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Lu(e, i, o, t)));
    },
    y.derived(
      {
        minValue: (e) => le(e).minimum ?? null,
        maxValue: (e) => le(e).maximum ?? null,
        format: (e) => le(e).format ?? null,
      },
      {
        gte(e, n) {
          return this.check(Ue(e, n));
        },
        min(e, n) {
          return this.check(Ue(e, n));
        },
        gt(e, n) {
          return this.check(qe(e, n));
        },
        lt(e, n) {
          return this.check(Ke(e, n));
        },
        lte(e, n) {
          return this.check(je(e, n));
        },
        max(e, n) {
          return this.check(je(e, n));
        },
        positive(e) {
          return this.check(qe(BigInt(0), e));
        },
        negative(e) {
          return this.check(Ke(BigInt(0), e));
        },
        nonpositive(e) {
          return this.check(je(BigInt(0), e));
        },
        nonnegative(e) {
          return this.check(Ue(BigInt(0), e));
        },
        multipleOf(e, n) {
          return this.check(ft(e, n));
        },
      },
    ),
  );
  function Jp(e) {
    return uu(Cn, e);
  }
  var Jo = h("ZodBigIntFormat", (e, n) => {
    (rc.init(e, n), Cn.init(e, n));
  });
  function Gp(e) {
    return du(Jo, e);
  }
  function Kp(e) {
    return fu(Jo, e);
  }
  var Dl = h("ZodSymbol", (e, n) => {
    (ic.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Ru(e, i, o, t)));
  });
  function qp(e) {
    return mu(Dl, e);
  }
  var jl = h("ZodUndefined", (e, n) => {
    (oc.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Vu(e, i, o, t)));
  });
  function Xp(e) {
    return pu(jl, e);
  }
  var Ul = h("ZodNull", (e, n) => {
    (ac.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Zu(e, i, o, t)));
  });
  function Cl(e) {
    return gu(Ul, e);
  }
  var Ll = h("ZodAny", (e, n) => {
    (sc.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Bu(e, i, o, t)));
  });
  function Hp() {
    return hu(Ll);
  }
  var Rl = h("ZodUnknown", (e, n) => {
    (cc.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Wu(e, i, o, t)));
  });
  function Mt() {
    return vu(Rl);
  }
  var Zl = h("ZodNever", (e, n) => {
    (uc.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Fu(e, i, o, t)));
  });
  function Go(e) {
    return $u(Zl, e);
  }
  var Vl = h("ZodVoid", (e, n) => {
    (lc.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Mu(e, i, o, t)));
  });
  function Yp(e) {
    return yu(Vl, e);
  }
  var Or = h(
    "ZodDate",
    (e, n) => {
      (dc.init(e, n),
        V.init(e, n),
        (e._zod.processJSONSchema = (i, o, t) => Ju(e, i, o, t)),
        (e.min = (i, o) => e.check(Ue(i, o))),
        (e.max = (i, o) => e.check(je(i, o))));
    },
    y.derived(
      {
        minDate: (e) => {
          let { minimum: n } = le(e);
          return n ? new Date(n) : null;
        },
        maxDate: (e) => {
          let { maximum: n } = le(e);
          return n ? new Date(n) : null;
        },
      },
      {},
    ),
  );
  function Qp(e) {
    return bu(Or, e);
  }
  var Ml = h(
    "ZodArray",
    (e, n) => {
      (Bt(),
        fc.init(e, n),
        V.init(e, n),
        (e._zod.processJSONSchema = (i, o, t) => il(e, i, o, t)),
        (e.element = n.element));
    },
    {
      min(e, n) {
        return this.check(ot(e, n));
      },
      nonempty(e) {
        return this.check(ot(1, e));
      },
      max(e, n) {
        return this.check(Rt(e, n));
      },
      length(e, n) {
        return this.check(Zt(e, n));
      },
      unwrap() {
        return this.element;
      },
    },
  );
  function Tr(e, n) {
    return xu(Ml, e, n);
  }
  function eg(e) {
    let n = e._zod.def.shape;
    return Ko(Object.keys(n));
  }
  var Kt = h(
    "ZodObject",
    (e, n) => {
      (Bt(),
        mc.init(e, n),
        V.init(e, n),
        (e._zod.processJSONSchema = (i, o, t) => ol(e, i, o, t)),
        y.installLazyProp(e, "shape", (i) => i._zod.def.shape, !1));
    },
    {
      keyof() {
        return Ko(Object.keys(this._zod.def.shape));
      },
      catchall(e) {
        return this.clone(y.mergeDefs(this._zod.def, { catchall: e }));
      },
      passthrough() {
        return this.clone(y.mergeDefs(this._zod.def, { catchall: Mt() }));
      },
      loose() {
        return this.clone(y.mergeDefs(this._zod.def, { catchall: Mt() }));
      },
      strict() {
        return this.clone(y.mergeDefs(this._zod.def, { catchall: Go() }));
      },
      strip() {
        return this.clone(y.mergeDefs(this._zod.def, { catchall: void 0 }));
      },
      extend(e) {
        return y.extend(this, e);
      },
      safeExtend(e) {
        return y.safeExtend(this, e);
      },
      merge(e) {
        return y.merge(this, e);
      },
      pick(e) {
        return y.pick(this, e);
      },
      omit(e) {
        return y.omit(this, e);
      },
      partial(...e) {
        return y.partial(Ar, this, e[0]);
      },
      exactPartial(...e) {
        return y.partial(Xo, this, e[0], "exactPartial");
      },
      required(...e) {
        return y.required(Ho, this, e[0]);
      },
    },
  );
  function Ae(e, n) {
    let i = { type: "object", shape: e ?? {}, ...y.normalizeParams(n) };
    return new Kt(i);
  }
  function tg(e, n) {
    return new Kt({ type: "object", shape: e, catchall: Go(), ...y.normalizeParams(n) });
  }
  function ng(e, n) {
    return new Kt({ type: "object", shape: e, catchall: Mt(), ...y.normalizeParams(n) });
  }
  var Er = h("ZodUnion", (e, n) => {
    (mr.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => wo(e, i, o, t)),
      (e.options = n.options));
  });
  function wt(e, n) {
    return new Er({ type: "union", options: e, ...y.normalizeParams(n) });
  }
  var Fl = h("ZodXor", (e, n) => {
    (Er.init(e, n),
      pc.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => wo(e, i, o, t)),
      (e.options = n.options));
  });
  function rg(e, n) {
    return new Fl({ type: "union", options: e, inclusive: !1, ...y.normalizeParams(n) });
  }
  var Bl = h("ZodDiscriminatedUnion", (e, n) => {
    (Er.init(e, n), hc.init(e, n));
  });
  function ig(e, n, i) {
    return new Bl({ type: "union", options: n, discriminator: e, ...y.normalizeParams(i) });
  }
  var Wl = h("ZodIntersection", (e, n) => {
    (vc.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => al(e, i, o, t)));
  });
  function Jl(e, n) {
    return new Wl({ type: "intersection", left: e, right: n });
  }
  var Gl = h(
    "ZodTuple",
    (e, n) => {
      (Bt(), Ti.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => sl(e, i, o, t)));
    },
    {
      rest(e) {
        return this.clone({ ...this._zod.def, rest: e });
      },
      partial() {
        let e = this._zod.def;
        if (e.checks?.length)
          throw new Error(".partial() cannot be used on tuple schemas containing refinements");
        return this.clone({
          ...e,
          items: e.items.map((n) => new Ar({ type: "optional", innerType: n })),
        });
      },
    },
  );
  function Kl(e, n, i) {
    let o = n instanceof L,
      t = o ? i : n,
      r = o ? n : null;
    return new Gl({ type: "tuple", items: e, rest: r, ...y.normalizeParams(t) });
  }
  var En = h("ZodRecord", (e, n) => {
    (Bt(),
      $c.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => cl(e, i, o, t)),
      (e.keyType = n.keyType),
      (e.valueType = n.valueType));
  });
  function ql(e, n, i) {
    return !n || !n._zod
      ? new En({ type: "record", keyType: Ee(), valueType: e, ...y.normalizeParams(n) })
      : new En({ type: "record", keyType: e, valueType: n, ...y.normalizeParams(i) });
  }
  function og(e, n, i) {
    return new En({
      type: "record",
      keyType: e,
      valueType: n,
      ...y.normalizeParams(i),
      partial: !0,
    });
  }
  function ag(e, n, i) {
    return new En({
      type: "record",
      keyType: e,
      valueType: n,
      mode: "loose",
      ...y.normalizeParams(i),
    });
  }
  var Xl = h("ZodMap", (e, n) => {
    (Bt(),
      yc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => nl(e, i, o, t)),
      (e.keyType = n.keyType),
      (e.valueType = n.valueType),
      (e.min = (...i) => e.check(Xe(...i))),
      (e.nonempty = (i) => e.check(Xe(1, i))),
      (e.max = (...i) => e.check(mt(...i))),
      (e.size = (...i) => e.check(Lt(...i))));
  });
  function sg(e, n, i) {
    return new Xl({ type: "map", keyType: e, valueType: n, ...y.normalizeParams(i) });
  }
  var Hl = h("ZodSet", (e, n) => {
    (Bt(),
      bc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => rl(e, i, o, t)),
      (e.min = (...i) => e.check(Xe(...i))),
      (e.nonempty = (i) => e.check(Xe(1, i))),
      (e.max = (...i) => e.check(mt(...i))),
      (e.size = (...i) => e.check(Lt(...i))));
  });
  function cg(e, n) {
    return new Hl({ type: "set", valueType: e, ...y.normalizeParams(n) });
  }
  var An = h("ZodEnum", (e, n) => {
    (_c.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (o, t, r) => Gu(e, o, t, r)),
      (e.enum = n.entries),
      (e.options = [...e._zod.values]));
    let i = new Set(Object.keys(n.entries));
    ((e.extract = (o, t) => {
      let r = {};
      for (let a of o)
        if (i.has(a)) r[a] = n.entries[a];
        else throw new Error(`Key ${a} not found in enum`);
      return new An({ ...n, checks: [], ...y.normalizeParams(t), entries: r });
    }),
      (e.exclude = (o, t) => {
        let r = { ...n.entries };
        for (let a of o)
          if (i.has(a)) delete r[a];
          else throw new Error(`Key ${a} not found in enum`);
        return new An({ ...n, checks: [], ...y.normalizeParams(t), entries: r });
      }));
  });
  function Ko(e, n) {
    let i = Array.isArray(e) ? Object.fromEntries(e.map((o) => [o, o])) : e;
    return new An({ type: "enum", entries: i, ...y.normalizeParams(n) });
  }
  function ug(e, n) {
    return new An({ type: "enum", entries: e, ...y.normalizeParams(n) });
  }
  var Yl = h("ZodLiteral", (e, n) => {
    (wc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => Ku(e, i, o, t)),
      (e.values = new Set(n.values)),
      Object.defineProperty(e, "value", {
        get() {
          if (n.values.length > 1)
            throw new Error(
              "This schema contains multiple valid literal values. Use `.values` instead.",
            );
          return n.values[0];
        },
      }));
  });
  function lg(e, n) {
    return new Yl({ type: "literal", values: Array.isArray(e) ? e : [e], ...y.normalizeParams(n) });
  }
  var Ql = h("ZodFile", (e, n) => {
    (xc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => Hu(e, i, o, t)),
      (e.min = (i, o) => e.check(Xe(i, o))),
      (e.max = (i, o) => e.check(mt(i, o))),
      (e.mime = (i, o) => e.check(wn(Array.isArray(i) ? i : [i], o))));
  });
  function dg(e) {
    return ku(Ql, e);
  }
  var ed = h("ZodTransform", (e, n) => {
    (Bt(),
      kc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => tl(e, i, o, t)),
      (e._zod.parse = (i, o) => {
        if (o.direction === "backward") throw new dt(e.constructor.name);
        i.addIssue = (r) => {
          if (typeof r == "string") i.issues.push(y.issue(r, i.value, n));
          else {
            let a = r;
            (a.fatal && (a.continue = !1),
              a.code ?? (a.code = "custom"),
              "input" in a || (a.input = i.value),
              a.inst ?? (a.inst = e),
              i.issues.push(y.issue(a)));
          }
        };
        let t = n.transform(i.value, i);
        return t instanceof Promise ? t.then((r) => ((i.value = r), i)) : ((i.value = t), i);
      }));
  });
  function qo(e) {
    return new ed({ type: "transform", transform: e });
  }
  var Ar = h("ZodOptional", (e, n) => {
    (Ei.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => xo(e, i, o, t)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function Ft(e) {
    return new Ar({ type: "optional", innerType: e });
  }
  var Xo = h("ZodExactOptional", (e, n) => {
    (Ic.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => xo(e, i, o, t)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function td(e) {
    return new Xo({ type: "optional", innerType: e });
  }
  var nd = h("ZodNullable", (e, n) => {
    (Sc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => ul(e, i, o, t)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function Nr(e) {
    return new nd({ type: "nullable", innerType: e });
  }
  function fg(e) {
    return Ft(Nr(e));
  }
  var rd = h("ZodDefault", (e, n) => {
    (zc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => fl(e, i, o, t)),
      (e.unwrap = () => e._zod.def.innerType),
      (e.removeDefault = e.unwrap));
  });
  function id(e, n) {
    return new rd({
      type: "default",
      innerType: e,
      get defaultValue() {
        return typeof n == "function" ? n() : y.shallowClone(n);
      },
    });
  }
  var od = h("ZodPrefault", (e, n) => {
    (Nc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => ml(e, i, o, t)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function ad(e, n) {
    return new od({
      type: "prefault",
      innerType: e,
      get defaultValue() {
        return typeof n == "function" ? n() : y.shallowClone(n);
      },
    });
  }
  var Ho = h("ZodNonOptional", (e, n) => {
    (Pc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => ll(e, i, o, t)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function sd(e, n) {
    return new Ho({ type: "nonoptional", innerType: e, ...y.normalizeParams(n) });
  }
  var cd = h("ZodSuccess", (e, n) => {
    (Oc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => Yu(e, i, o, t)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function mg(e) {
    return new cd({ type: "success", innerType: e });
  }
  var ud = h("ZodCatch", (e, n) => {
    (Tc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => pl(e, i, o, t)),
      (e.unwrap = () => e._zod.def.innerType),
      (e.removeCatch = e.unwrap));
  });
  function ld(e, n) {
    return new ud({
      type: "catch",
      innerType: e,
      catchValue: typeof n == "function" ? n : y.constantCatch(n),
    });
  }
  var dd = h("ZodNaN", (e, n) => {
    (Ec.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => qu(e, i, o, t)));
  });
  function pg(e) {
    return wu(dd, e);
  }
  var Dr = h("ZodPipe", (e, n) => {
    (Ai.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => gl(e, i, o, t)),
      (e.in = n.in),
      (e.out = n.out));
  });
  function zo(e, n) {
    return new Dr({ type: "pipe", in: e, out: n });
  }
  var jr = h("ZodCodec", (e, n) => {
    (Dr.init(e, n), pr.init(e, n));
  });
  function gg(e, n, i) {
    return new jr({ type: "pipe", in: e, out: n, transform: i.decode, reverseTransform: i.encode });
  }
  function hg(e) {
    let n = e._zod.def;
    return new jr({
      type: "pipe",
      in: n.out,
      out: n.in,
      transform: n.reverseTransform,
      reverseTransform: n.transform,
    });
  }
  var fd = h("ZodPreprocess", (e, n) => {
      (Dr.init(e, n), Ac.init(e, n));
    }),
    md = h("ZodReadonly", (e, n) => {
      (Dc.init(e, n),
        V.init(e, n),
        (e._zod.processJSONSchema = (i, o, t) => hl(e, i, o, t)),
        (e.unwrap = () => e._zod.def.innerType));
    });
  function pd(e) {
    return new md({ type: "readonly", innerType: e });
  }
  var gd = h("ZodTemplateLiteral", (e, n) => {
    (jc.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Xu(e, i, o, t)));
  });
  function vg(e, n) {
    return new gd({ type: "template_literal", parts: e, ...y.normalizeParams(n) });
  }
  var hd = h("ZodLazy", (e, n) => {
    (gr.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => $l(e, i, o, t)),
      (e.unwrap = () => e._zod.def.getter()));
  });
  function vd(e) {
    return new hd({ type: "lazy", getter: e });
  }
  var $d = h("ZodPromise", (e, n) => {
    (Cc.init(e, n),
      V.init(e, n),
      (e._zod.processJSONSchema = (i, o, t) => vl(e, i, o, t)),
      (e.unwrap = () => e._zod.def.innerType));
  });
  function $g(e) {
    return new $d({ type: "promise", innerType: e });
  }
  var yd = h("ZodFunction", (e, n) => {
    (Uc.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => el(e, i, o, t)));
  });
  function yg(e) {
    return new yd({
      type: "function",
      input: Array.isArray(e?.input) ? Kl(e?.input) : (e?.input ?? Tr(Mt())),
      output: e?.output ?? Mt(),
    });
  }
  var Ur = h("ZodCustom", (e, n) => {
    (Lc.init(e, n), V.init(e, n), (e._zod.processJSONSchema = (i, o, t) => Qu(e, i, o, t)));
  });
  function bg(e) {
    let n = new Q({ check: "custom" });
    return ((n._zod.check = e), n);
  }
  function _g(e, n) {
    return Iu(Ur, e ?? (() => !0), n);
  }
  function bd(e, n = {}) {
    return Su(Ur, e, n);
  }
  function _d(e, n) {
    return zu(e, n);
  }
  var wg = Nu,
    xg = Pu,
    wd = h(
      "ZodInstanceOf",
      (e, n) => {
        Ur.init(e, n);
      },
      {
        properties(e, n) {
          return this.check(_n(e, n));
        },
      },
    );
  function kg(e, n = {}) {
    let i = new wd({
      type: "custom",
      check: "custom",
      fn: (o) => o instanceof e,
      abort: !0,
      ...y.normalizeParams(n),
    });
    return (
      (i._zod.bag.Class = e),
      (i._zod.check = (o) => {
        o.value instanceof e ||
          o.issues.push({
            code: "invalid_type",
            expected: e.name,
            input: o.value,
            inst: i,
            path: [...(i._zod.def.path ?? [])],
          });
      }),
      i
    );
  }
  var Ig = (...e) => Ou({ Codec: jr, Boolean: Un, String: Dn }, ...e);
  function Sg(e) {
    let n = vd(() => wt([Ee(e), Ye(), Gt(), Cl(), Tr(n), ql(Ee(), n)]));
    return n;
  }
  function zg(e, n) {
    return new fd({ type: "pipe", in: qo(e), out: n });
  }
  var Ab = {
    invalid_type: "invalid_type",
    too_big: "too_big",
    too_small: "too_small",
    invalid_format: "invalid_format",
    not_multiple_of: "not_multiple_of",
    unrecognized_keys: "unrecognized_keys",
    invalid_union: "invalid_union",
    invalid_key: "invalid_key",
    invalid_element: "invalid_element",
    invalid_value: "invalid_value",
    custom: "custom",
  };
  function Db(e) {
    re({ customError: e });
  }
  function jb() {
    return re().customError;
  }
  var xd;
  xd || (xd = {});
  var Cr = {};
  Ge(Cr, {
    ZodISODate: () => yt,
    ZodISODateTime: () => $t,
    ZodISODuration: () => _t,
    ZodISOTime: () => bt,
    date: () => Cb,
    datetime: () => Ub,
    duration: () => Rb,
    time: () => Lb,
  });
  function Ub(e) {
    return wr($t, e);
  }
  function Cb(e) {
    return xr(yt, e);
  }
  function Lb(e) {
    return kr(bt, e);
  }
  function Rb(e) {
    return Ir(_t, e);
  }
  var P = { ...Ln, ...Io, iso: Cr },
    Zb = new Set([
      "$schema",
      "$ref",
      "$defs",
      "definitions",
      "$id",
      "id",
      "$comment",
      "$anchor",
      "$vocabulary",
      "$dynamicRef",
      "$dynamicAnchor",
      "type",
      "enum",
      "const",
      "anyOf",
      "oneOf",
      "allOf",
      "not",
      "properties",
      "required",
      "additionalProperties",
      "patternProperties",
      "propertyNames",
      "minProperties",
      "maxProperties",
      "items",
      "prefixItems",
      "additionalItems",
      "minItems",
      "maxItems",
      "uniqueItems",
      "contains",
      "minContains",
      "maxContains",
      "minLength",
      "maxLength",
      "pattern",
      "format",
      "minimum",
      "maximum",
      "exclusiveMinimum",
      "exclusiveMaximum",
      "multipleOf",
      "description",
      "default",
      "contentEncoding",
      "contentMediaType",
      "contentSchema",
      "unevaluatedItems",
      "unevaluatedProperties",
      "if",
      "then",
      "else",
      "dependentSchemas",
      "dependentRequired",
      "nullable",
      "readOnly",
    ]);
  function Vb(e, n) {
    let i = e.$schema;
    return i === "https://json-schema.org/draft/2020-12/schema"
      ? "draft-2020-12"
      : i === "http://json-schema.org/draft-07/schema#"
        ? "draft-7"
        : i === "http://json-schema.org/draft-04/schema#"
          ? "draft-4"
          : (n ?? "draft-2020-12");
  }
  function Ng(e, n) {
    return e.map((i, o) => (o < n ? i : i.optional()));
  }
  function Mb(e) {
    return e.replace(/~1/g, "/").replace(/~0/g, "~");
  }
  function Fb(e, n) {
    if (!e.startsWith("#"))
      throw new Error("External $ref is not supported, only local refs (#/...) are allowed");
    let i = e.slice(1).split("/").filter(Boolean);
    if (i.length === 0) return n.rootSchema;
    let o = n.version === "draft-2020-12" ? "$defs" : "definitions";
    if (i[0] === o) {
      let t = i[1] === void 0 ? void 0 : Mb(i[1]);
      if (!t || !n.defs[t]) throw new Error(`Reference not found: ${e}`);
      return n.defs[t];
    }
    throw new Error(`Reference not found: ${e}`);
  }
  function Bb(e, n) {
    return P.transform((o) => o)
      .check((o) => {
        let t = o.value;
        if (typeof t != "object" || t === null || Array.isArray(t)) return;
        let r = Object.getOwnPropertyNames(t);
        if (
          (n.minProperties !== void 0 &&
            r.length < n.minProperties &&
            o.issues.push({
              origin: "object",
              code: "too_small",
              minimum: n.minProperties,
              inclusive: !0,
              message: `Too small: expected object to have >=${n.minProperties} properties`,
              input: t,
              inst: e,
              continue: !0,
            }),
          n.maxProperties !== void 0 &&
            r.length > n.maxProperties &&
            o.issues.push({
              origin: "object",
              code: "too_big",
              maximum: n.maxProperties,
              inclusive: !0,
              message: `Too big: expected object to have <=${n.maxProperties} properties`,
              input: t,
              inst: e,
              continue: !0,
            }),
          n.keySchema)
        )
          for (let a of r) {
            let s = n.keySchema.safeParse(a);
            s.success ||
              o.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: s.error.issues,
                input: a,
                path: [a],
                continue: !0,
              });
          }
      })
      .pipe(e);
  }
  function kd(e, n) {
    if (e === null) return "z";
    let i = typeof e;
    if (i !== "object") {
      if (i === "number" && Number.isNaN(e)) return null;
      let o = String(e);
      return `${i[0]}${o.length}:${o}`;
    }
    if (n.has(e)) return null;
    n.add(e);
    try {
      if (Array.isArray(e)) {
        let r = [];
        for (let a of e) {
          let s = kd(a, n);
          if (s === null) return null;
          r.push(s);
        }
        return `a${r.length}:[${r.join(",")}]`;
      }
      let o = Object.keys(e).sort(),
        t = [];
      for (let r of o) {
        let a = kd(e[r], n);
        if (a === null) return null;
        t.push(`${r.length}:${r}=${a}`);
      }
      return `o${t.length}:{${t.join(",")}}`;
    } finally {
      n.delete(e);
    }
  }
  var Wb = new Set([
      "items",
      "prefixItems",
      "additionalItems",
      "additionalProperties",
      "contains",
      "propertyNames",
      "not",
      "if",
      "then",
      "else",
      "allOf",
      "anyOf",
      "oneOf",
      "unevaluatedItems",
      "unevaluatedProperties",
      "contentSchema",
    ]),
    Jb = new Set([
      "properties",
      "patternProperties",
      "dependentSchemas",
      "dependencies",
      "$defs",
      "definitions",
    ]);
  function Lr(e) {
    return typeof e != "object" || e === null
      ? !1
      : Array.isArray(e)
        ? e.some(Lr)
        : typeof e.$ref == "string"
          ? !0
          : Object.entries(e).some(([n, i]) =>
              Wb.has(n)
                ? Lr(i)
                : !Jb.has(n) || typeof i != "object" || i === null
                  ? !1
                  : Object.values(i).some(Lr),
            );
  }
  function Pg(e) {
    return e === 1 ? "element" : "elements";
  }
  function Gb(e, n) {
    return P.transform((o) => o)
      .check((o) => {
        let t = o.value;
        if (Array.isArray(t)) {
          if (n.uniqueItems === !0) {
            let r = new Map();
            for (let a = 0; a < t.length; a++) {
              let s = kd(t[a], new Set());
              if (s === null) continue;
              let u = r.get(s);
              if (u === void 0) {
                r.set(s, a);
                continue;
              }
              o.issues.push({
                code: "custom",
                message: `Array items must be unique: element at index ${a} duplicates the one at index ${u}`,
                input: t,
                path: [a],
                continue: !0,
              });
            }
          }
          if (n.containsSchema) {
            let r = n.minContains ?? 1,
              a = n.maxContains !== void 0 ? n.maxContains + 1 : Number.POSITIVE_INFINITY,
              s = 0;
            for (let u of t) if (n.containsSchema.safeParse(u).success && ++s >= a) break;
            (s < r &&
              o.issues.push({
                code: "custom",
                message: `Array must contain at least ${r} matching ${Pg(r)}; found ${s}`,
                input: t,
                continue: !0,
              }),
              n.maxContains !== void 0 &&
                s > n.maxContains &&
                o.issues.push({
                  code: "custom",
                  message: `Array must contain at most ${n.maxContains} matching ${Pg(n.maxContains)}`,
                  input: t,
                  continue: !0,
                }));
          }
        }
      })
      .pipe(e);
  }
  function Og(e, n) {
    if (e !== !1) return e === void 0 || e === !0 ? P.any() : Se(e, n);
  }
  var Kb = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
  function Tg(e, n) {
    if (e.not !== void 0) {
      if (typeof e.not == "object" && Object.keys(e.not).length === 0) return P.never();
      throw new Error("not is not supported in Zod (except { not: {} } for never)");
    }
    if (e.unevaluatedItems !== void 0) throw new Error("unevaluatedItems is not supported");
    if (e.unevaluatedProperties !== void 0)
      throw new Error("unevaluatedProperties is not supported");
    if (e.if !== void 0 || e.then !== void 0 || e.else !== void 0)
      throw new Error("Conditional schemas (if/then/else) are not supported");
    if (e.dependentSchemas !== void 0 || e.dependentRequired !== void 0)
      throw new Error("dependentSchemas and dependentRequired are not supported");
    if (e.$ref) {
      let t = e.$ref;
      if (n.refs.has(t)) return n.refs.get(t);
      if (n.processing.has(t))
        return P.lazy(() => {
          if (!n.refs.has(t)) throw new Error(`Circular reference not resolved: ${t}`);
          return n.refs.get(t);
        });
      n.processing.add(t);
      let r = Fb(t, n),
        a = Se(r, n);
      return (n.refs.set(t, a), n.processing.delete(t), a);
    }
    if (e.enum !== void 0) {
      let t = e.enum;
      if (n.version === "openapi-3.0" && e.nullable === !0 && t.length === 1 && t[0] === null)
        return P.null();
      if (t.length === 0) return P.never();
      if (t.length === 1) return P.literal(t[0]);
      if (t.every((a) => typeof a == "string")) return P.enum(t);
      let r = t.map((a) => P.literal(a));
      return r.length < 2 ? r[0] : P.union([r[0], r[1], ...r.slice(2)]);
    }
    if (e.const !== void 0) return P.literal(e.const);
    let i = e.type;
    if (Array.isArray(i)) {
      let t = i.map((r) => {
        let a = { ...e, type: r };
        return Tg(a, n);
      });
      return t.length === 0 ? P.never() : t.length === 1 ? t[0] : P.union(t);
    }
    if (!i) return P.any();
    let o;
    switch (i) {
      case "string": {
        let t = P.string();
        if (e.format) {
          let r = e.format;
          r === "email"
            ? (t = t.check(P.email()))
            : r === "uri" || r === "uri-reference"
              ? (t = t.check(P.url()))
              : r === "uuid" || r === "guid"
                ? (t = t.check(P.uuid()))
                : r === "date-time"
                  ? (t = t.check(P.iso.datetime({ offset: !0 })))
                  : r === "date"
                    ? (t = t.check(P.iso.date()))
                    : r === "time"
                      ? (t = t.check(P.regex(Kb)))
                      : r === "duration"
                        ? (t = t.check(P.iso.duration()))
                        : r === "hostname"
                          ? (t = t.check(P.hostname()))
                          : r === "ipv4"
                            ? (t = t.check(P.ipv4()))
                            : r === "ipv6"
                              ? (t = t.check(P.ipv6()))
                              : r === "mac"
                                ? (t = t.check(P.mac()))
                                : r === "cidr"
                                  ? (t = t.check(P.cidrv4()))
                                  : r === "cidr-v6"
                                    ? (t = t.check(P.cidrv6()))
                                    : r === "base64"
                                      ? (t = t.check(P.base64()))
                                      : r === "base64url"
                                        ? (t = t.check(P.base64url()))
                                        : r === "e164"
                                          ? (t = t.check(P.e164()))
                                          : r === "credit_card"
                                            ? (t = t.check(P.creditCard()))
                                            : r === "iban"
                                              ? (t = t.check(P.iban()))
                                              : r === "jwt"
                                                ? (t = t.check(P.jwt()))
                                                : r === "emoji"
                                                  ? (t = t.check(P.emoji()))
                                                  : r === "nanoid"
                                                    ? (t = t.check(P.nanoid()))
                                                    : r === "cuid"
                                                      ? (t = t.check(P.cuid()))
                                                      : r === "cuid2"
                                                        ? (t = t.check(P.cuid2()))
                                                        : r === "ulid"
                                                          ? (t = t.check(P.ulid()))
                                                          : r === "xid"
                                                            ? (t = t.check(P.xid()))
                                                            : r === "ksuid" &&
                                                              (t = t.check(P.ksuid()));
        }
        (typeof e.minLength == "number" && (t = t.min(e.minLength)),
          typeof e.maxLength == "number" && (t = t.max(e.maxLength)),
          e.pattern && (t = t.regex(new RegExp(e.pattern))),
          (o = t));
        break;
      }
      case "number":
      case "integer": {
        let t = i === "integer" ? P.number().int() : P.number();
        (typeof e.minimum == "number" && e.exclusiveMinimum !== !0 && (t = t.min(e.minimum)),
          typeof e.maximum == "number" && e.exclusiveMaximum !== !0 && (t = t.max(e.maximum)),
          typeof e.exclusiveMinimum == "number"
            ? (t = t.gt(e.exclusiveMinimum))
            : e.exclusiveMinimum === !0 && typeof e.minimum == "number" && (t = t.gt(e.minimum)),
          typeof e.exclusiveMaximum == "number"
            ? (t = t.lt(e.exclusiveMaximum))
            : e.exclusiveMaximum === !0 && typeof e.maximum == "number" && (t = t.lt(e.maximum)),
          typeof e.multipleOf == "number" && (t = t.multipleOf(e.multipleOf)),
          (o = t));
        break;
      }
      case "boolean": {
        o = P.boolean();
        break;
      }
      case "null": {
        o = P.null();
        break;
      }
      case "object": {
        let t = {},
          r = e.properties || {},
          a = new Set(e.required || []),
          s = typeof e.additionalProperties == "object" ? Se(e.additionalProperties, n) : void 0;
        for (let [f, d] of Object.entries(r)) {
          let m = Se(d, n);
          he(t, f, a.has(f) ? m : m.optional());
        }
        if (e.patternProperties) {
          let f = e.patternProperties,
            d = Object.keys(f),
            m = [];
          for (let $ of d) {
            let w = Se(f[$], n),
              z = P.string().regex(new RegExp($));
            m.push(P.looseRecord(z, w));
          }
          let g = [];
          if (
            (Object.keys(t).length > 0 && g.push(P.object(t).passthrough()),
            g.push(...m),
            g.length === 0)
          )
            o = P.object({}).passthrough();
          else if (g.length === 1) o = g[0];
          else {
            let $ = P.intersection(g[0], g[1]);
            for (let w = 2; w < g.length; w++) $ = P.intersection($, g[w]);
            o = $;
          }
          if (e.additionalProperties === !1) {
            let $ = Object.keys(t),
              w = d.map((x) => new RegExp(x)),
              z = o;
            o = o.check((x) => {
              if (!Le(x.value)) return;
              let O = [];
              for (let I of Object.keys(x.value))
                $.includes(I) || w.some((E) => E.test(I)) || O.push(I);
              O.length &&
                x.issues.push({ code: "unrecognized_keys", keys: O, input: x.value, inst: z });
            });
          }
        } else {
          let f = P.object(t);
          e.additionalProperties === !1
            ? (o = f.strict())
            : s
              ? (o = f.catchall(s))
              : (o = f.passthrough());
        }
        let u = e.propertyNames !== void 0 && e.propertyNames !== !0,
          c = typeof e.minProperties == "number" ? e.minProperties : void 0,
          l = typeof e.maxProperties == "number" ? e.maxProperties : void 0;
        if (u || c !== void 0 || l !== void 0) {
          let f;
          if (u) {
            let d =
              typeof e.propertyNames == "object" && e.propertyNames.type === void 0
                ? { type: "string", ...e.propertyNames }
                : e.propertyNames;
            f = Se(d, n);
          }
          o = Bb(o, { keySchema: f, minProperties: c, maxProperties: l });
        }
        break;
      }
      case "array": {
        let t = e.prefixItems,
          r = e.items;
        if (t && Array.isArray(t)) {
          let a = typeof e.minItems == "number" ? e.minItems : 0,
            s = t.map((f) => Se(f, n)),
            u = Ng(s, a),
            c = Array.isArray(r) ? void 0 : Og(r, n),
            l = P.tuple(u);
          ((o = c ? l.rest(c) : l),
            typeof e.minItems == "number" && (o = o.check(P.minLength(e.minItems))),
            typeof e.maxItems == "number" && (o = o.check(P.maxLength(e.maxItems))));
        } else if (Array.isArray(r)) {
          let a = typeof e.minItems == "number" ? e.minItems : 0,
            s = r.map((f) => Se(f, n)),
            u = Ng(s, a),
            c = Og(e.additionalItems, n),
            l = P.tuple(u);
          ((o = c ? l.rest(c) : l),
            typeof e.minItems == "number" && (o = o.check(P.minLength(e.minItems))),
            typeof e.maxItems == "number" && (o = o.check(P.maxLength(e.maxItems))));
        } else if (r !== void 0) {
          let a = Se(r, n),
            s = P.array(a);
          (typeof e.minItems == "number" && (s = s.min(e.minItems)),
            typeof e.maxItems == "number" && (s = s.max(e.maxItems)),
            (o = s));
        } else o = P.array(P.any());
        (e.uniqueItems === !0 || e.contains !== void 0) &&
          (o = Gb(o, {
            uniqueItems: e.uniqueItems === !0,
            containsSchema: e.contains !== void 0 ? Se(e.contains, n) : void 0,
            minContains: typeof e.minContains == "number" ? e.minContains : void 0,
            maxContains: typeof e.maxContains == "number" ? e.maxContains : void 0,
          }));
        break;
      }
      default:
        throw new Error(`Unsupported type: ${i}`);
    }
    return o;
  }
  function Se(e, n) {
    if (typeof e == "boolean") return e ? P.any() : P.never();
    let i = Tg(e, n),
      o = e.type || e.enum !== void 0 || e.const !== void 0;
    if (e.anyOf && Array.isArray(e.anyOf)) {
      let s = e.anyOf.map((c) => Se(c, n)),
        u = P.union(s);
      i = o ? P.intersection(i, u) : u;
    }
    if (e.oneOf && Array.isArray(e.oneOf)) {
      let s = e.oneOf.map((c) => Se(c, n)),
        u = P.xor(s);
      i = o ? P.intersection(i, u) : u;
    }
    if (e.allOf && Array.isArray(e.allOf))
      if (e.allOf.length === 0) i = o ? i : P.any();
      else {
        let s = o ? i : Se(e.allOf[0], n),
          u = o ? 0 : 1;
        for (let c = u; c < e.allOf.length; c++) s = P.intersection(s, Se(e.allOf[c], n));
        i = s;
      }
    (e.nullable === !0 && n.version === "openapi-3.0" && (i = P.nullable(i)),
      e.readOnly === !0 && (i = P.readonly(i)),
      e.default !== void 0 && (i = i.default(e.default)));
    let t = {},
      r = ["$id", "id", "$comment", "$anchor", "$vocabulary", "$dynamicRef", "$dynamicAnchor"];
    for (let s of r) s in e && (t[s] = e[s]);
    let a = ["contentEncoding", "contentMediaType", "contentSchema"];
    for (let s of a) s in e && (t[s] = e[s]);
    if (e.type === "object" && e.$ref === void 0) {
      e.propertyNames !== void 0 && !Lr(e.propertyNames) && (t.propertyNames = e.propertyNames);
      for (let s of ["minProperties", "maxProperties"]) e[s] !== void 0 && (t[s] = e[s]);
    }
    if (e.type === "array" && e.$ref === void 0) {
      e.contains !== void 0 && !Lr(e.contains) && (t.contains = e.contains);
      for (let s of ["uniqueItems", "minContains", "maxContains"]) e[s] !== void 0 && (t[s] = e[s]);
    }
    for (let s of Object.keys(e)) Zb.has(s) || he(t, s, e[s]);
    return (
      Object.keys(t).length > 0 && n.registry.add(i, t),
      e.description && (i = i.describe(e.description)),
      i
    );
  }
  function Eg(e, n) {
    if (typeof e == "boolean") return e ? P.any() : P.never();
    let i;
    try {
      i = JSON.parse(JSON.stringify(e));
    } catch {
      throw new Error(
        "fromJSONSchema input is not valid JSON (possibly cyclic); use $defs/$ref for recursive schemas",
      );
    }
    let o = Vb(i, n?.defaultTarget),
      t = i.$defs || i.definitions || {},
      r = {
        version: o,
        defs: t,
        refs: new Map(),
        processing: new Set(),
        rootSchema: i,
        registry: n?.registry ?? ve,
      };
    return Se(i, r);
  }
  var Ag = Symbol("z.visit/resolving");
  function Rr(e, n) {
    let i =
        typeof n == "function"
          ? n
          : (a, s) => {
              let u = n[a._zod.def.type];
              return u ? u(a, s) : a;
            },
      o = new Map();
    function t(a) {
      let s = o.get(a);
      if (s === Ag) return new gr({ type: "lazy", getter: () => o.get(a) });
      if (s !== void 0) return s;
      o.set(a, Ag);
      let u = r(a),
        c = i(u, u !== a);
      return (o.set(a, c), c);
    }
    function r(a) {
      let s = a._zod.def,
        u = s.type;
      switch (u) {
        case "object": {
          let c = s.shape,
            l = Object.keys(c),
            f = !1,
            d = {};
          for (let g of l) {
            let $ = t(c[g]);
            ($ !== c[g] && (f = !0), (d[g] = $));
          }
          let m = s.catchall;
          return (
            s.catchall && ((m = t(s.catchall)), m !== s.catchall && (f = !0)),
            f ? G(a, { ...s, shape: d, catchall: m }) : a
          );
        }
        case "array": {
          let c = t(s.element);
          return c === s.element ? a : G(a, { ...s, element: c });
        }
        case "tuple": {
          let c = s.items,
            l = !1,
            f = [];
          for (let m of c) {
            let g = t(m);
            (g !== m && (l = !0), f.push(g));
          }
          let d = s.rest;
          return (
            s.rest && ((d = t(s.rest)), d !== s.rest && (l = !0)),
            l ? G(a, { ...s, items: f, rest: d }) : a
          );
        }
        case "record":
        case "map": {
          let c = t(s.keyType),
            l = t(s.valueType);
          return c === s.keyType && l === s.valueType
            ? a
            : G(a, { ...s, keyType: c, valueType: l });
        }
        case "set": {
          let c = t(s.valueType);
          return c === s.valueType ? a : G(a, { ...s, valueType: c });
        }
        case "union": {
          let c = s.options,
            l = !1,
            f = [];
          for (let d of c) {
            let m = t(d);
            (m !== d && (l = !0), f.push(m));
          }
          return l ? G(a, { ...s, options: f }) : a;
        }
        case "intersection": {
          let c = t(s.left),
            l = t(s.right);
          return c === s.left && l === s.right ? a : G(a, { ...s, left: c, right: l });
        }
        case "optional":
        case "nullable":
        case "default":
        case "prefault":
        case "catch":
        case "readonly":
        case "nonoptional":
        case "promise":
        case "success": {
          let c = t(s.innerType);
          return c === s.innerType ? a : G(a, { ...s, innerType: c });
        }
        case "pipe": {
          let c = t(s.in),
            l = t(s.out);
          return c === s.in && l === s.out ? a : G(a, { ...s, in: c, out: l });
        }
        case "function": {
          let c = t(s.input),
            l = t(s.output);
          return c === s.input && l === s.output ? a : G(a, { ...s, input: c, output: l });
        }
        case "lazy": {
          let c = s.getter,
            { _cachedInner: l, ...f } = s;
          return G(a, { ...f, getter: () => t(c()) });
        }
        case "template_literal":
        case "string":
        case "number":
        case "int":
        case "boolean":
        case "bigint":
        case "symbol":
        case "undefined":
        case "null":
        case "void":
        case "never":
        case "any":
        case "unknown":
        case "date":
        case "nan":
        case "enum":
        case "literal":
        case "file":
        case "transform":
        case "custom":
          return a;
        default:
          return a;
      }
    }
    return t(e);
  }
  function Dg(e) {
    return Rr(e, {
      object: (n) => n.partial(),
      union: (n) => {
        let i = n._zod.def;
        return i.discriminator === void 0 ? n : wt(i.options);
      },
    });
  }
  function qb(e, n) {
    if (!n?.length) return e;
    let i = e._zod.def;
    return G(e, Be(i, { checks: [...(i.checks ?? []), ...n] }), { parent: !0 });
  }
  function jg(e) {
    return qb(e.out, e.checks);
  }
  function Xb(e) {
    return e.in._zod.traits.has("$ZodTransform") ? jg(e) : e.in;
  }
  function Ug(e) {
    return Rr(e, {
      pipe: (n) => Xb(n._zod.def),
      default: (n, i) => (i ? Ft(n._zod.def.innerType) : n),
      catch: (n, i) => (i ? n._zod.def.innerType : n),
    });
  }
  function Cg(e) {
    return Rr(e, {
      pipe: (n) => jg(n._zod.def),
      prefault: (n, i) => (i ? n._zod.def.innerType : n),
    });
  }
  var Id = {};
  Ge(Id, {
    bigint: () => e_,
    boolean: () => Qb,
    date: () => t_,
    number: () => Yb,
    string: () => Hb,
  });
  function Hb(e) {
    return qc(Dn, e);
  }
  function Yb(e) {
    return tu(jn, e);
  }
  function Qb(e) {
    return cu(Un, e);
  }
  function e_(e) {
    return lu(Cn, e);
  }
  function t_(e) {
    return _u(Or, e);
  }
  function Lg(e, n, i) {
    let o = e.indexOf(n);
    if (o === -1) return e;
    let t = n.length,
      r = 0,
      a = "";
    do ((a += e.slice(r, o) + n + i), (r = o + t), (o = e.indexOf(n, r)));
    while (o !== -1);
    return ((a += e.slice(r)), a);
  }
  function Rg(e, n, i, o) {
    let t = 0,
      r = "";
    do {
      let a = e[o - 1] === "\r";
      ((r +=
        e.slice(t, a ? o - 1 : o) +
        n +
        (a
          ? `\r
`
          : `
`) +
        i),
        (t = o + 1),
        (o = e.indexOf(
          `
`,
          t,
        )));
    } while (o !== -1);
    return ((r += e.slice(t)), r);
  }
  var Zg =
      (e = 0) =>
      (n) =>
        `\x1B[${n + e}m`,
    Sd =
      (e = 0) =>
      (n) =>
        `\x1B[${38 + e};5;${n}m`,
    zd =
      (e = 0) =>
      (n, i, o) =>
        `\x1B[${38 + e};2;${n};${i};${o}m`,
    n_ = (e) => `\x1B[58;5;${e < 90 ? e - 30 : e - 90 + 8}m`,
    H = {
      modifier: {
        reset: [0, 0],
        bold: [1, 22],
        dim: [2, 22],
        italic: [3, 23],
        underline: [4, 24],
        underlineDouble: ["4:2", 24],
        underlineCurly: ["4:3", 24],
        underlineDotted: ["4:4", 24],
        underlineDashed: ["4:5", 24],
        overline: [53, 55],
        inverse: [7, 27],
        hidden: [8, 28],
        strikethrough: [9, 29],
      },
      color: {
        black: [30, 39],
        red: [31, 39],
        green: [32, 39],
        yellow: [33, 39],
        blue: [34, 39],
        magenta: [35, 39],
        cyan: [36, 39],
        white: [37, 39],
        blackBright: [90, 39],
        gray: [90, 39],
        grey: [90, 39],
        redBright: [91, 39],
        greenBright: [92, 39],
        yellowBright: [93, 39],
        blueBright: [94, 39],
        magentaBright: [95, 39],
        cyanBright: [96, 39],
        whiteBright: [97, 39],
      },
      bgColor: {
        bgBlack: [40, 49],
        bgRed: [41, 49],
        bgGreen: [42, 49],
        bgYellow: [43, 49],
        bgBlue: [44, 49],
        bgMagenta: [45, 49],
        bgCyan: [46, 49],
        bgWhite: [47, 49],
        bgBlackBright: [100, 49],
        bgGray: [100, 49],
        bgGrey: [100, 49],
        bgRedBright: [101, 49],
        bgGreenBright: [102, 49],
        bgYellowBright: [103, 49],
        bgBlueBright: [104, 49],
        bgMagentaBright: [105, 49],
        bgCyanBright: [106, 49],
        bgWhiteBright: [107, 49],
      },
      underlineColor: {
        underlineBlack: ["58;5;0", 59],
        underlineRed: ["58;5;1", 59],
        underlineGreen: ["58;5;2", 59],
        underlineYellow: ["58;5;3", 59],
        underlineBlue: ["58;5;4", 59],
        underlineMagenta: ["58;5;5", 59],
        underlineCyan: ["58;5;6", 59],
        underlineWhite: ["58;5;7", 59],
        underlineBlackBright: ["58;5;8", 59],
        underlineGray: ["58;5;8", 59],
        underlineGrey: ["58;5;8", 59],
        underlineRedBright: ["58;5;9", 59],
        underlineGreenBright: ["58;5;10", 59],
        underlineYellowBright: ["58;5;11", 59],
        underlineBlueBright: ["58;5;12", 59],
        underlineMagentaBright: ["58;5;13", 59],
        underlineCyanBright: ["58;5;14", 59],
        underlineWhiteBright: ["58;5;15", 59],
      },
    },
    oS = Object.keys(H.modifier),
    r_ = Object.keys(H.color),
    i_ = Object.keys(H.bgColor),
    aS = Object.keys(H.underlineColor),
    sS = [...r_, ...i_];
  function o_() {
    let e = new Map();
    for (let [n, i] of Object.entries(H)) {
      for (let [o, t] of Object.entries(i))
        ((H[o] = { open: `\x1B[${t[0]}m`, close: `\x1B[${t[1]}m` }),
          (i[o] = H[o]),
          e.set(Number.parseInt(t[0], 10), t[1]));
      Object.defineProperty(H, n, { value: i, enumerable: !1 });
    }
    return (
      Object.defineProperty(H, "codes", { value: e, enumerable: !1 }),
      (H.color.close = "\x1B[39m"),
      (H.bgColor.close = "\x1B[49m"),
      (H.underlineColor.close = "\x1B[59m"),
      (H.color.ansi = Zg()),
      (H.color.ansi256 = Sd()),
      (H.color.ansi16m = zd()),
      (H.bgColor.ansi = Zg(10)),
      (H.bgColor.ansi256 = Sd(10)),
      (H.bgColor.ansi16m = zd(10)),
      (H.underlineColor.ansi = n_),
      (H.underlineColor.ansi256 = Sd(20)),
      (H.underlineColor.ansi16m = zd(20)),
      Object.defineProperties(H, {
        rgbToAnsi256: {
          value(n, i, o) {
            return n === i && i === o
              ? n < 8
                ? 16
                : n > 248
                  ? 231
                  : Math.round(((n - 8) / 247) * 24) + 232
              : 16 +
                  36 * Math.round((n / 255) * 5) +
                  6 * Math.round((i / 255) * 5) +
                  Math.round((o / 255) * 5);
          },
          enumerable: !1,
        },
        hexToRgb: {
          value(n) {
            let i = /[\da-f]{6}|[\da-f]{3}/i.exec(n.toString(16));
            if (!i) return [0, 0, 0];
            let [o] = i;
            o.length === 3 && (o = [...o].map((r) => r + r).join(""));
            let t = Number.parseInt(o, 16);
            return [(t >> 16) & 255, (t >> 8) & 255, t & 255];
          },
          enumerable: !1,
        },
        hexToAnsi256: { value: (n) => H.rgbToAnsi256(...H.hexToRgb(n)), enumerable: !1 },
        ansi256ToAnsi: {
          value(n) {
            if (n < 8) return 30 + n;
            if (n < 16) return 90 + (n - 8);
            let i, o, t;
            if (n >= 232) ((i = ((n - 232) * 10 + 8) / 255), (o = i), (t = i));
            else {
              n -= 16;
              let s = n % 36;
              ((i = Math.floor(n / 36) / 5), (o = Math.floor(s / 6) / 5), (t = (s % 6) / 5));
            }
            let r = Math.max(i, o, t) * 2;
            if (r === 0) return 30;
            let a = 30 + ((Math.round(t) << 2) | (Math.round(o) << 1) | Math.round(i));
            return (r === 2 && (a += 60), a);
          },
          enumerable: !1,
        },
        rgbToAnsi: { value: (n, i, o) => H.ansi256ToAnsi(H.rgbToAnsi256(n, i, o)), enumerable: !1 },
        hexToAnsi: { value: (n) => H.ansi256ToAnsi(H.hexToAnsi256(n)), enumerable: !1 },
      }),
      H
    );
  }
  var a_ = o_(),
    Qe = a_;
  var Qo =
      "navigator" in globalThis
        ? globalThis.navigator.userAgentData &&
          globalThis.navigator.userAgentData.brands.find(({ brand: n }) => n === "Chromium")
            ?.version > 93
          ? 3
          : /\b(?:Chrome|Chromium)\//.test(globalThis.navigator.userAgent)
            ? 1
            : 0
        : 0,
    Vg = Qo !== 0 && { level: Qo, hasBasic: !0, has256: Qo >= 2, has16m: Qo >= 3 },
    s_ = { stdout: Vg, stderr: Vg },
    Mg = s_;
  var { stdout: Fg, stderr: Bg } = Mg,
    Zr = Symbol("GENERATOR"),
    Vr = Symbol("STYLER"),
    ta = Symbol("IS_EMPTY"),
    ea = Symbol("LEVEL"),
    Mr = Object.create(null),
    Wg = (e) => {
      if (!Number.isSafeInteger(e) || e < 0 || e > 3)
        throw new Error("The `level` should be an integer from 0 to 3");
    },
    c_ = {
      enumerable: !0,
      get() {
        return this[ea];
      },
      set(e) {
        (Wg(e), (this[ea] = e));
      },
    },
    u_ = (e, n = {}) => {
      n.level !== void 0 && Wg(n.level);
      let i = Fg ? Fg.level : 0;
      e[ea] = n.level === void 0 ? i : n.level;
    };
  var l_ = (e) => {
    let n = (...i) => i.join(" ");
    return (u_(n, e), Object.setPrototypeOf(n, Fr.prototype), n);
  };
  function Fr(e) {
    return l_(e);
  }
  Object.setPrototypeOf(Fr.prototype, Function.prototype);
  for (let [e, n] of Object.entries(Qe))
    Mr[e] = {
      get() {
        let i = Pd(this, Jg(n.open, n.close, this[Vr]), this[ta]);
        return (Object.defineProperty(this, e, { value: i }), i);
      },
    };
  Mr.visible = {
    get() {
      let e = Pd(this, this[Vr], !0);
      return (Object.defineProperty(this, "visible", { value: e }), e);
    },
  };
  var d_ = (e, n) => {
      let i = Qe[n];
      if (e === "rgb") {
        let t = (a, s, u) => i.ansi(Qe.rgbToAnsi(a, s, u));
        return [t, t, (a, s, u) => i.ansi256(Qe.rgbToAnsi256(a, s, u)), i.ansi16m];
      }
      if (e === "hex") {
        let t = (a) => i.ansi(Qe.hexToAnsi(a));
        return [t, t, (a) => i.ansi256(Qe.hexToAnsi256(a)), (a) => i.ansi16m(...Qe.hexToRgb(a))];
      }
      let o = (t) => i.ansi(Qe.ansi256ToAnsi(t));
      return [o, o, i.ansi256, i.ansi256];
    },
    f_ = ["rgb", "hex", "ansi256"];
  for (let e of f_) {
    let n = e[0].toUpperCase() + e.slice(1);
    for (let [i, o] of [
      [e, "color"],
      ["bg" + n, "bgColor"],
      ["underline" + n, "underlineColor"],
    ]) {
      let { close: t } = Qe[o],
        r = d_(e, o);
      Mr[i] = {
        get() {
          let a = function (s, u, c) {
            let l = r[this.level](s, u, c);
            return Pd(this, Jg(l, t, this[Vr]), this[ta]);
          };
          return (Object.defineProperty(this, i, { value: a }), a);
        },
      };
    }
  }
  var m_ = Object.defineProperties(() => {}, {
      ...Mr,
      level: {
        enumerable: !0,
        get() {
          return this[Zr].level;
        },
        set(e) {
          this[Zr].level = e;
        },
      },
    }),
    Jg = (e, n, i) => {
      let o, t;
      return (
        i === void 0 ? ((o = e), (t = n)) : ((o = i.openAll + e), (t = n + i.closeAll)),
        { open: e, close: n, openAll: o, closeAll: t, parent: i }
      );
    },
    Pd = (e, n, i) => {
      let o = (...t) =>
        t.length === 1
          ? Nd(o, "" + t[0])
          : t.length === 2
            ? Nd(o, t[0] + " " + t[1])
            : Nd(o, t.join(" "));
      return (Object.setPrototypeOf(o, m_), (o[Zr] = e[Zr] ?? e), (o[Vr] = n), (o[ta] = i), o);
    },
    Nd = (e, n) => {
      if (e[Zr][ea] <= 0 || !n) return e[ta] ? "" : n;
      let i = e[Vr];
      if (i === void 0) return n;
      let { openAll: o, closeAll: t } = i;
      if (n.includes("\x1B")) for (; i !== void 0; ) ((n = Lg(n, i.close, i.open)), (i = i.parent));
      let r = n.indexOf(`
`);
      return (r !== -1 && (n = Rg(n, t, o, r)), o + n + t);
    };
  Object.defineProperties(Fr.prototype, { ...Mr, level: c_ });
  var p_ = Fr(),
    mS = Fr({ level: Bg ? Bg.level : 0 });
  var me = p_;
  var Y = {
      NETWORK_ERROR: "network_error",
      RATE_LIMIT: "rate_limit",
      SERVER_ERROR: "server_error",
      NO_TOOL_CALL: "no_tool_call",
      INVALID_TOOL_ARGS: "invalid_tool_args",
      TOOL_EXECUTION_ERROR: "tool_execution_error",
      INVALID_RESPONSE: "invalid_response",
      INVALID_SCHEMA: "invalid_schema",
      UNKNOWN: "unknown",
      CONFIG_ERROR: "config_error",
      AUTH_ERROR: "auth_error",
      CONTEXT_LENGTH: "context_length",
      CONTENT_FILTER: "content_filter",
    },
    h_ = [
      Y.NETWORK_ERROR,
      Y.RATE_LIMIT,
      Y.SERVER_ERROR,
      Y.NO_TOOL_CALL,
      Y.INVALID_TOOL_ARGS,
      Y.TOOL_EXECUTION_ERROR,
      Y.INVALID_RESPONSE,
      Y.INVALID_SCHEMA,
      Y.UNKNOWN,
    ],
    se = class extends Error {
      type;
      retryable;
      statusCode;
      rawError;
      rawResponse;
      constructor(e, n, i, o) {
        (super(n),
          (this.name = "InvokeError"),
          (this.type = e),
          (this.retryable = h_.includes(e)),
          (this.rawError = i),
          (this.rawResponse = o));
      }
    };
  function ne(...e) {
    console.debug(me.gray("[LLM]"), ...e);
  }
  function v_(e, n) {
    return {
      type: "function",
      function: {
        name: e,
        description: n.description,
        parameters: Tn(n.inputSchema, { target: "openapi-3.0" }),
      },
    };
  }
  function $_(e, n) {
    let i = e.model || "";
    if (!i) return e;
    let o = b_(n),
      t = y_(i);
    if (
      (t.startsWith("qwen") &&
        (o === "openrouter" && t.startsWith("qwen38-max")
          ? (ne("Patch Qwen3.8-max on OpenRouter: reasoning_effort=low, remove tool_choice"),
            (e.reasoning_effort = "low"),
            delete e.tool_choice)
          : (ne("Patch Qwen: disable thinking"), (e.enable_thinking = !1)),
        e.temperature === void 0 &&
          !/max|plus/.test(t) &&
          (ne("Patch Qwen: raise temperature to 1.0"), (e.temperature = 1))),
      t.startsWith("deepseek") &&
        (ne("Patch DeepSeek: disable thinking, remove tool_choice"),
        (e.thinking = { type: "disabled" }),
        delete e.tool_choice),
      t.startsWith("gpt") &&
        (t.startsWith("gpt-5") && (e.verbosity = "low"),
        t.includes("chat-latest")
          ? (ne("Patch chat-latest: omit reasoning_effort and temperature"),
            delete e.reasoning_effort,
            delete e.temperature)
          : /^gpt-5[12](-|$)/.test(t)
            ? (ne("Patch GPT-5.1/5.2: reasoning_effort=none"), (e.reasoning_effort = "none"))
            : /^gpt-5(-|$)/.test(t)
              ? (ne("Patch GPT-5: reasoning_effort=minimal"), (e.reasoning_effort = "minimal"))
              : (ne("Patch GPT: omit reasoning_effort"), delete e.reasoning_effort)),
      t.startsWith("claude") &&
        (/opus|sonnet|haiku/.test(t)
          ? (ne("Patch Claude: disable thinking"),
            (e.thinking = { type: "disabled" }),
            o !== "openrouter" &&
              (e.tool_choice === "required"
                ? (ne('Applying Claude patch: convert tool_choice "required" to { type: "any" }'),
                  (e.tool_choice = { type: "any" }))
                : e.tool_choice?.function?.name &&
                  (ne("Applying Claude patch: convert tool_choice format"),
                  (e.tool_choice = { type: "tool", name: e.tool_choice.function.name }))))
          : (ne("Patch Claude: reasoning_effort=low"),
            (e.reasoning_effort = "low"),
            delete e.tool_choice)),
      t.startsWith("gemini") &&
        (ne("Patch Gemini: reasoning_effort=low"),
        (e.reasoning_effort = "low"),
        /^gemini-25(?!.*pro)/.test(t)
          ? (ne("Patch Gemini 2.5 non-Pro: reasoning_effort=none"), (e.reasoning_effort = "none"))
          : (t.startsWith("gemini-35-flash") ||
              t.startsWith("gemini-31-flash-lite") ||
              t.startsWith("gemini-3-flash")) &&
            (ne("Patch Gemini 3.x Flash/Lite: reasoning_effort=minimal"),
            (e.reasoning_effort = "minimal"))),
      t.startsWith("glm") &&
        (/^glm-5[3-9]/.test(t)
          ? (ne("Patch GLM 5.3+: reasoning_effort=low"), (e.reasoning_effort = "low"))
          : (ne("Patch GLM: disable thinking"), (e.thinking = { type: "disabled" }))),
      t.startsWith("hy") &&
        (ne("Patch Hunyuan: disable thinking, reasoning_effort=low"),
        (e.thinking = { type: "disabled" }),
        (e.reasoning_effort = "low")),
      t.startsWith("grok") &&
        (/^grok-4-?3/.test(t)
          ? (ne("Patch Grok 4.3: reasoning_effort=none"), (e.reasoning_effort = "none"))
          : (t.startsWith("grok-3-mini") || t.startsWith("grok-code-fast")) &&
            (ne("Patch Grok mini/code: reasoning_effort=low"), (e.reasoning_effort = "low"))),
      t.startsWith("kimi") &&
        (t.startsWith("kimi-k3")
          ? (ne("Patch Kimi K3: use required tool choice, remove parallel tool calls"),
            delete e.parallel_tool_calls,
            e.tool_choice?.function?.name && (e.tool_choice = "required"))
          : t.includes("code") ||
            (ne("Patch Kimi: disable thinking"), (e.thinking = { type: "disabled" }))),
      t.startsWith("minimax") &&
        (ne("Patch MiniMax: remove parallel_tool_calls"),
        delete e.parallel_tool_calls,
        t.includes("m3") &&
          (ne("Patch MiniMax: disable thinking"), (e.thinking = { type: "disabled" }))),
      o === "openrouter")
    ) {
      let r = e.reasoning_effort;
      e.thinking?.type === "disabled" || e.enable_thinking === !1 || r === "none"
        ? (e.reasoning = { enabled: !1 })
        : r && (e.reasoning = { enabled: !0, effort: r });
    }
    return e;
  }
  function y_(e) {
    let n = e.toLowerCase();
    return (
      n.includes("/") && (n = n.split("/")[1]),
      (n = n.replace(/_/g, "")),
      (n = n.replace(/\./g, "")),
      n
    );
  }
  function b_(e) {
    if (e)
      try {
        return new URL(e).hostname === "openrouter.ai" ? "openrouter" : void 0;
      } catch {
        return;
      }
  }
  var __ = class {
      config;
      fetch;
      constructor(e) {
        ((this.config = e), (this.fetch = e.customFetch));
      }
      async invoke(e, n, i, o) {
        i?.throwIfAborted();
        let t = Object.entries(n).map(([I, E]) => v_(I, E)),
          r = "required";
        o?.toolChoiceName &&
          !this.config.disableNamedToolChoice &&
          (r = { type: "function", function: { name: o.toolChoiceName } });
        let a = {
          model: this.config.model,
          messages: e,
          tools: t,
          parallel_tool_calls: !1,
          tool_choice: r,
        };
        (this.config.temperature !== void 0 && (a.temperature = this.config.temperature),
          $_(a, this.config.baseURL));
        let s;
        try {
          s = this.config.transformRequestBody(a);
        } catch (I) {
          throw new se(Y.CONFIG_ERROR, `transformRequestBody failed: ${I.message}`, I);
        }
        let u = s ?? a,
          c;
        try {
          c = await this.fetch(`${this.config.baseURL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
            },
            body: JSON.stringify(u),
            signal: i,
          });
        } catch (I) {
          throw I?.name === "AbortError"
            ? I
            : (console.error(I), new se(Y.NETWORK_ERROR, "Network request failed", I));
        }
        if (!c.ok) {
          let I;
          try {
            I = await c.json();
          } catch (D) {
            if (D?.name === "AbortError") throw D;
          }
          let E = I?.error?.message || c.statusText;
          throw c.status === 401 || c.status === 403
            ? new se(Y.AUTH_ERROR, `Authentication failed: ${E}`, I)
            : c.status === 429
              ? new se(Y.RATE_LIMIT, `Rate limit exceeded: ${E}`, I)
              : c.status >= 500
                ? new se(Y.SERVER_ERROR, `Server error: ${E}`, I)
                : new se(Y.UNKNOWN, `HTTP ${c.status}: ${E}`, I);
        }
        let l;
        try {
          l = await c.json();
        } catch (I) {
          throw I?.name === "AbortError"
            ? I
            : new se(Y.INVALID_RESPONSE, "Response body is not valid JSON", I);
        }
        let f = l.choices?.[0];
        if (!f) throw new se(Y.INVALID_SCHEMA, "No choices in response", l);
        switch (f.finish_reason) {
          case "tool_calls":
          case "function_call":
          case "stop":
            break;
          case "length":
            throw new se(Y.CONTEXT_LENGTH, "Response truncated: max tokens reached", void 0, l);
          case "content_filter":
            throw new se(Y.CONTENT_FILTER, "Content filtered by safety system", void 0, l);
          default:
            throw new se(
              Y.INVALID_SCHEMA,
              `Unexpected finish_reason: ${f.finish_reason}`,
              void 0,
              l,
            );
        }
        let d = (o?.normalizeResponse ? o.normalizeResponse(l) : l).choices?.[0],
          m = d?.message?.tool_calls?.[0]?.function?.name;
        if (!m) throw new se(Y.NO_TOOL_CALL, "No tool call found in response", void 0, l);
        let g = n[m];
        if (!g) throw new se(Y.UNKNOWN, `Tool "${m}" not found in tools`, void 0, l);
        let $ = d.message?.tool_calls?.[0]?.function?.arguments;
        if (!$) throw new se(Y.INVALID_TOOL_ARGS, "No tool call arguments found", void 0, l);
        let w;
        try {
          w = JSON.parse($);
        } catch (I) {
          throw new se(Y.INVALID_TOOL_ARGS, "Failed to parse tool arguments as JSON", I, l);
        }
        let z = g.inputSchema.safeParse(w);
        if (!z.success) {
          // 兼容部分模型（如 DeepSeek）把对象参数双重编码为字符串：逐字段尝试还原后再验一次
          for (const [k, v] of Object.entries(w))
            if (typeof v == "string" && (v.startsWith("{") || v.startsWith("[")))
              try {
                const p = JSON.parse(v);
                typeof p == "object" && p !== null && (w[k] = p);
              } catch {}
          z = g.inputSchema.safeParse(w);
        }
        if (!z.success)
          throw (
            console.error(Ot(z.error)),
            new se(Y.INVALID_TOOL_ARGS, "Tool arguments validation failed", z.error, l)
          );
        let x = z.data,
          O;
        try {
          O = await g.execute(x);
        } catch (I) {
          throw I?.name === "AbortError"
            ? I
            : new se(Y.TOOL_EXECUTION_ERROR, `Tool execution failed: ${I?.message}`, I, l);
        }
        return {
          toolCall: { name: m, args: x },
          toolResult: O,
          usage: {
            promptTokens: l.usage?.prompt_tokens ?? 0,
            completionTokens: l.usage?.completion_tokens ?? 0,
            totalTokens: l.usage?.total_tokens ?? 0,
            cachedTokens: l.usage?.prompt_tokens_details?.cached_tokens,
            reasoningTokens: l.usage?.completion_tokens_details?.reasoning_tokens,
          },
          rawResponse: l,
          rawRequest: u,
        };
      }
    },
    Gg = class extends EventTarget {
      config;
      client;
      constructor(e) {
        (super(), (this.config = x_(e)), (this.client = new __(this.config)));
      }
      async invoke(e, n, i, o) {
        return await w_(async () => this.client.invoke(e, n, i, o), {
          maxRetries: this.config.maxRetries,
          onRetry: (t, r) => {
            this.dispatchEvent(
              new CustomEvent("retry", {
                detail: { attempt: t, maxAttempts: this.config.maxRetries, lastError: r },
              }),
            );
          },
        });
      }
    };
  async function w_(e, n) {
    let i = 0;
    for (;;)
      try {
        return await e();
      } catch (o) {
        if (
          o?.name === "AbortError" ||
          (o instanceof se && !o.retryable) ||
          (i++, i > n.maxRetries)
        )
          throw o;
        (console.debug("[LLM] retryable failure, will retry:", o),
          n.onRetry(i, o),
          await new Promise((t) => setTimeout(t, 100)));
      }
  }
  function x_(e) {
    if (!e.baseURL || !e.model)
      throw new Error(
        "[PageAgent] LLM configuration required. Please provide: baseURL, model. See: https://alibaba.github.io/page-agent/docs/features/models",
      );
    return (
      e.temperature !== void 0 &&
        console.warn(
          "[PageAgent] LLMConfig.temperature is deprecated and will be removed in a future version. Use transformRequestBody to set it only for models you have verified accept it.",
        ),
      {
        baseURL: e.baseURL,
        model: e.model,
        apiKey: e.apiKey || "",
        temperature: e.temperature,
        maxRetries: e.maxRetries ?? 2,
        transformRequestBody: e.transformRequestBody ?? ((n) => n),
        disableNamedToolChoice: e.disableNamedToolChoice ?? !1,
        customFetch: (e.customFetch ?? fetch).bind(globalThis),
      }
    );
  }
  var k_ = `You are an AI agent designed to operate in an iterative loop to automate browser tasks. Your ultimate goal is accomplishing the task provided in <user_request>.

<intro>
You excel at following tasks:
1. Navigating complex websites and extracting precise information
2. Automating form submissions and interactive web actions
3. Gathering and saving information 
4. Operate effectively in an agent loop
5. Efficiently performing diverse web tasks
</intro>

<language_settings>
- Default working language: **English**
- Use the language that user is using. Return in user's language.
</language_settings>

<input>
At every step, your input will consist of: 
1. <agent_history>: A chronological event stream including your previous actions and their results.
2. <agent_state>: Current <user_request> and <step_info>.
3. <browser_state>: Current URL, interactive elements indexed for actions, and visible page content.
</input>

<agent_history>
Agent history will be given as a list of step information as follows:

<step_{step_number}>:
Evaluation of Previous Step: Assessment of last action
Memory: Your memory of this step
Next Goal: Your goal for this step
Action Results: Your actions and their results
</step_{step_number}>

and system messages wrapped in <sys> tag.
</agent_history>

<user_request>
USER REQUEST: This is your ultimate objective and always remains visible.
- This has the highest priority. Make the user happy.
- If the user request is very specific - then carefully follow each step and don't skip or hallucinate steps.
- If the task is open ended you can plan yourself how to get it done.
</user_request>

<browser_state>
1. Browser State will be given as:

Current URL: URL of the page you are currently viewing.
Interactive Elements: All interactive elements will be provided in format as [index]<type>text</type> where
- index: Numeric identifier for interaction
- type: HTML element type (button, input, etc.)
- text: Element description

Examples:
[33]<div>User form</div>
\\t*[35]<button aria-label='Submit form'>Submit</button>

Note that:
- Only elements with numeric indexes in [] are interactive
- (stacked) indentation (with \\t) is important and means that the element is a (html) child of the element above (with a lower index)
- Elements tagged with \`*[\` are the new clickable elements that appeared on the website since the last step - if url has not changed.
- Pure text elements without [] are not interactive.
</browser_state>

<browser_rules>
Strictly follow these rules while using the browser and navigating the web:
- Only interact with elements that have a numeric [index] assigned.
- Only use indexes that are explicitly provided.
- If the page changes after, for example, an input text action, analyze if you need to interact with new elements, e.g. selecting the right option from the list.
- By default, only elements in the visible viewport are listed. Use scrolling actions if you suspect relevant content is offscreen which you need to interact with. Scroll ONLY if there are more pixels below or above the page.
- You can scroll by a specific number of pages using the num_pages parameter (e.g., 0.5 for half page, 2.0 for two pages).
- All the elements that are scrollable are marked with \`data-scrollable\` attribute. Including the scrollable distance in every directions. You can scroll *the element* in case some area are overflowed.
- If a captcha appears, tell user you can not solve captcha. Finish the task and ask user to solve it.
- If the page is not fully loaded, use the \`wait\` action.
- Do not repeat one action for more than 3 times unless some conditions changed.
- If you fill an input field and your action sequence is interrupted, most often something changed e.g. suggestions popped up under the field.
- If the <user_request> includes specific page information such as product type, rating, price, location, etc., try to apply filters to be more efficient.
- The <user_request> is the ultimate goal. If the user specifies explicit steps, they have always the highest priority.
- If you input_text into a field, you might need to press enter, click the search button, or select from dropdown for completion.
- Don't login into a page if you don't have to. Don't login if you don't have the credentials. 
- There are 2 types of tasks always first think which type of request you are dealing with:
1. Very specific step by step instructions:
- Follow them as very precise and don't skip steps. Try to complete everything as requested.
2. Open ended tasks. Plan yourself, be creative in achieving them.
- If you get stuck e.g. with logins or captcha in open-ended tasks you can re-evaluate the task and try alternative ways, e.g. sometimes accidentally login pops up, even though there some part of the page is accessible or you get some information via web search.
</browser_rules>

<capability>
- You can only handle single page app. Do not jump out of current page.
- Do not click on link if it will open in a new page (e.g., <a target="_blank">)
- It is ok to fail the task.
	- User can be wrong. If the request of user is not achievable, inappropriate or you do not have enough information or tools to achieve it. Tell user to make a better request.
	- Webpage can be broken. All webpages or apps have bugs. Some bug will make it hard for your job. It's encouraged to tell user the problem of current page. Your feedbacks (including failing) are valuable for user.
	- Trying too hard can be harmful. Repeating some action back and forth or pushing for a complex procedure with little knowledge can cause unwanted results and harmful side-effects. User would rather you complete the task with a fail.
- If you do not have knowledge for the current webpage or task. You must require user to give specific instructions and detailed steps.
</capability>

<task_completion_rules>
You must call the \`done\` action in one of three cases:
- When you have fully completed the USER REQUEST.
- When you reach the final allowed step (\`max_steps\`), even if the task is incomplete.
- When you feel stuck or unable to solve user request. Or user request is not clear or contains inappropriate content.
- If it is ABSOLUTELY IMPOSSIBLE to continue.

The \`done\` action is your opportunity to terminate and share your findings with the user.
- Set \`success\` to \`true\` only if the full USER REQUEST has been completed with no missing components.
- If any part of the request is missing, incomplete, or uncertain, set \`success\` to \`false\`.
- You can use the \`text\` field of the \`done\` action to communicate your findings and to provide a coherent reply to the user and fulfill the USER REQUEST.
- You are ONLY ALLOWED to call \`done\` as a single action. Don't call it together with other actions.
- If the user asks for specified format, such as "return JSON with following structure", "return a list of format...", MAKE sure to use the right format in your answer.
- If the user asks for a structured output, your \`done\` action's schema may be modified. Take this schema into account when solving the task!
</task_completion_rules>

<reasoning_rules>
Exhibit the following reasoning patterns to successfully achieve the <user_request>:

- Reason about <agent_history> to track progress and context toward <user_request>.
- Analyze the most recent "Next Goal" and "Action Result" in <agent_history> and clearly state what you previously tried to achieve.
- Analyze all relevant items in <agent_history> and <browser_state> to understand your state.
- Explicitly judge success/failure/uncertainty of the last action. Never assume an action succeeded just because it appears to be executed in your last step in <agent_history>. If the expected change is missing, mark the last action as failed (or uncertain) and plan a recovery.
- Analyze whether you are stuck, e.g. when you repeat the same actions multiple times without any progress. Then consider alternative approaches e.g. scrolling for more context or ask user for help.
- Ask user for help if you have any difficulty. Keep user in the loop.
- If you see information relevant to <user_request>, plan saving the information to memory.
- Always reason about the <user_request>. Make sure to carefully analyze the specific steps and information required. E.g. specific filters, specific form fields, specific information to search. Make sure to always compare the current trajectory with the user request and think carefully if thats how the user requested it.
</reasoning_rules>

<examples>
Here are examples of good output patterns. Use them as reference but never copy them directly.

<evaluation_examples>
"evaluation_previous_goal": "Successfully navigated to the product page and found the target information. Verdict: Success"
"evaluation_previous_goal": "Clicked the login button and user authentication form appeared. Verdict: Success"
</evaluation_examples>

<memory_examples>
"memory": "Found many pending reports that need to be analyzed in the main page. Successfully processed the first 2 reports on quarterly sales data and moving on to inventory analysis and customer feedback reports."
</memory_examples>

<next_goal_examples>
"next_goal": "Click on the 'Add to Cart' button to proceed with the purchase flow."
</next_goal_examples>
</examples>

<output_style_rules>
- STRICT OUTPUT BUDGET: all JSON text fields plus any accompanying prose must total under 80 words.
- NEVER write analysis prose, element lists, or page descriptions in the message text. The page state is already in the context; all reasoning goes into the JSON fields only.
- Produce the JSON action immediately; long text output wastes time and will be truncated.
</output_style_rules>

<output>
{
  "evaluation_previous_goal": "One short sentence (max 25 words): success, failure, or uncertain.",
  "memory": "One short sentence (max 25 words) of only the key facts needed later. Never repeat page content or element lists.",
  "next_goal": "One short sentence (max 20 words).",
  "action":{
    "Action name": {// Action parameters}
  }
}
</output>
`,
    Rn = console.log.bind(console, me.yellow("[autoFixer]"));
  function I_(e, n) {
    let i,
      o = e.choices?.[0];
    if (!o) throw new Error("No choices in response");
    let t = o.message;
    if (!t) throw new Error("No message in choice");
    let r = t.tool_calls?.[0];
    if (r?.function?.arguments)
      ((i = xt(r.function.arguments)),
        r.function.name &&
          r.function.name !== "AgentOutput" &&
          (Rn("#1: fixing tool_call"), (i = { action: xt(i) })));
    else if (t.content) {
      let a = z_(t.content.trim());
      if (a)
        ((i = xt(a)),
          i?.name === "AgentOutput" && (Rn("#2: fixing tool_call"), (i = xt(i.arguments))),
          i?.type === "function" && (Rn("#3: fixing tool_call"), (i = xt(i.function.arguments))),
          !i?.action &&
            !i?.evaluation_previous_goal &&
            !i?.memory &&
            !i?.next_goal &&
            !i?.thinking &&
            (Rn("#4: fixing tool_call"), (i = { action: xt(i) })));
      else throw new Error("No tool_call and the message content does not contain valid JSON");
    } else throw new Error("No tool_call nor message content is present");
    return (
      (i = xt(i)),
      i.action && (i.action = xt(i.action)),
      i.action && n && (i.action = S_(i.action, n)),
      i.action || (Rn("#5: fixing tool_call"), (i.action = { wait: { seconds: 1 } })),
      {
        ...e,
        choices: [
          {
            ...o,
            message: {
              ...t,
              tool_calls: [
                {
                  ...(r || {}),
                  function: {
                    ...(r?.function || {}),
                    name: "AgentOutput",
                    arguments: JSON.stringify(i),
                  },
                },
              ],
            },
          },
        ],
      }
    );
  }
  function S_(e, n) {
    if (typeof e != "object" || e === null) return e;
    let i = Object.keys(e)[0];
    if (!i) return e;
    if (i === "action" && typeof e[i] == "object" && e[i] !== null) {
      ((e = e[i]), (i = Object.keys(e)[0]));
    }
    let o = n.get(i);
    if (!o) {
      let s = Array.from(n.keys()).join(", ");
      const hit = Array.from(n.keys()).filter((k) => k.includes(i));
      if (hit.length === 1) {
        (Rn(`action alias: "${i}" -> "${hit[0]}"`), (o = n.get((i = hit[0]))));
      } else throw new se(Y.INVALID_TOOL_ARGS, `Unknown action "${i}". Available: ${s}`);
    }
    let t = e[i],
      r = o.inputSchema;
    if (r instanceof Kt && t !== null && typeof t != "object") {
      let s = Object.keys(r.shape).find((u) => !r.shape[u].safeParse(void 0).success);
      s && (Rn(`coercing primitive action input for "${i}"`), (t = { [s]: t }));
    }
    let a = r.safeParse(t);
    if (!a.success)
      throw new se(Y.INVALID_TOOL_ARGS, `Invalid input for action "${i}": ${Ot(a.error)}`);
    return { [i]: a.data };
  }
  function xt(e) {
    if (typeof e != "string") return e;
    let s = e.trim();
    try {
      s = JSON.parse(s);
    } catch {
      try {
        s = JSON.parse(e.replace(/\r?\n[\t ]*/g, "\\n").replace(/\t/g, "\\t"));
      } catch {
        return e;
      }
    }
    if (typeof s == "string") {
      let a = xt(s);
      if (typeof a != "string") return a;
    }
    return s;
  }
  function z_(e) {
    try {
      let n = /({[\s\S]*})/.exec(e) ?? [];
      return n.length === 0 ? null : JSON.parse(n[0]);
    } catch {
      return null;
    }
  }
  async function Ed(e, n) {
    if (!n) {
      await new Promise((i) => setTimeout(i, e * 1e3));
      return;
    }
    (n.throwIfAborted(),
      await new Promise((i, o) => {
        let t = setTimeout(() => {
            (n.removeEventListener("abort", r), i());
          }, e * 1e3),
          r = () => {
            (clearTimeout(t), o(n.reason));
          };
        n.addEventListener("abort", r, { once: !0 });
      }));
  }
  function N_(e, n) {
    return e.length > n ? e.substring(0, n) + "..." : e;
  }
  function P_(e) {
    let n = Math.random().toString(36).substring(2, 11);
    if (!e) return n;
    let i = 1e3,
      o = 0;
    for (; e.includes(n); )
      if (((n = Math.random().toString(36).substring(2, 11)), o++, o > i))
        throw new Error("randomID: too many tries");
    return n;
  }
  var Ad = globalThis;
  Ad.__PAGE_AGENT_IDS__ || (Ad.__PAGE_AGENT_IDS__ = []);
  var Kg = Ad.__PAGE_AGENT_IDS__;
  function qg() {
    let e = P_(Kg);
    return (Kg.push(e), e);
  }
  var Od = new Map();
  async function O_(e) {
    let n;
    try {
      n = new URL(e).origin;
    } catch {
      return null;
    }
    if (n === "null") return null;
    if (Od.has(n)) return Od.get(n);
    let i = `${n}/llms.txt`,
      o = null;
    try {
      console.log(me.gray(`[llms.txt] Fetching ${i}`));
      let t = await fetch(i, { signal: AbortSignal.timeout(3e3) });
      t.ok
        ? ((o = await t.text()),
          console.log(me.green(`[llms.txt] Found (${o.length} chars)`)),
          o.length > 1e3 &&
            (console.log(me.yellow("[llms.txt] Truncating to 1000 chars")), (o = N_(o, 1e3))))
        : console.debug(me.gray(`[llms.txt] ${t.status} for ${i}`));
    } catch (t) {
      console.debug(me.gray(`[llms.txt] not found for ${i}`), t);
    }
    return (Od.set(n, o), o);
  }
  function T_(e, n, i) {
    if (!e) {
      let o = n ?? "Assertion failed";
      throw (i || console.error(me.red(`\u274C assert: ${o}`)), new Error(o));
    }
  }
  async function Td(e) {
    try {
      return await e();
    } catch (n) {
      console.error(n);
      return;
    }
  }
  var et = new Map();
  et.set("done", {
    description:
      "Complete task. Text is your final response to the user \u2014 keep it concise unless the user explicitly asks for detail.",
    inputSchema: Ae({ text: Ee(), success: Gt().default(!0) }),
    execute: async function (e) {
      return Promise.resolve("Task completed");
    },
  });
  et.set("wait", {
    description: "Wait for x seconds. Can be used to wait until the page or data is fully loaded.",
    inputSchema: Ae({ seconds: Ye().min(1).max(10).default(1) }),
    execute: async function (e, { signal: n }) {
      let i = await this.pageController.getLastUpdateTime(),
        o = (Date.now() - i) / 1e3,
        t = Math.max(0, e.seconds - o);
      return (
        console.log(`actualWaitTime: ${t} seconds`),
        await Ed(t, n),
        `\u2705 Waited for ${(o + t).toFixed(2)} seconds.`
      );
    },
  });
  et.set("ask_user", {
    description:
      "Ask the user a question and wait for their answer. Use this if you need more information or clarification.",
    inputSchema: Ae({ question: Ee() }),
    execute: async function (e, { signal: n }) {
      if (!this.onAskUser) throw new Error("ask_user tool requires onAskUser callback to be set");
      return `User answered: ${await this.onAskUser(e.question, { signal: n })}`;
    },
  });
  et.set("click_element_by_index", {
    description: "Click element by index",
    inputSchema: Ae({ index: vt().min(0) }),
    execute: async function (e) {
      return (await this.pageController.clickElement(e.index)).message;
    },
  });
  et.set("input_text", {
    description: "Click and type text into an interactive input element",
    inputSchema: Ae({ index: vt().min(0), text: Ee() }),
    execute: async function (e) {
      return (await this.pageController.inputText(e.index, e.text)).message;
    },
  });
  et.set("select_dropdown_option", {
    description:
      "Select dropdown option for interactive element index by the text of the option you want to select",
    inputSchema: Ae({ index: vt().min(0), text: Ee() }),
    execute: async function (e) {
      return (await this.pageController.selectOption(e.index, e.text)).message;
    },
  });
  et.set("scroll", {
    description:
      "Scroll vertically. Without index: scrolls the document. With index: scrolls the container at that index (or its nearest scrollable ancestor). Use index of a data-scrollable element to scroll a specific area.",
    inputSchema: Ae({
      down: Gt().default(!0),
      num_pages: Ye().min(0).max(10).optional().default(0.1),
      pixels: Ye().int().min(0).optional(),
      index: Ye().int().min(0).optional(),
    }),
    execute: async function (e) {
      return (await this.pageController.scroll({ ...e, numPages: e.num_pages })).message;
    },
  });
  et.set("scroll_horizontally", {
    description:
      "Scroll horizontally. Without index: scrolls the document. With index: scrolls the container at that index (or its nearest scrollable ancestor). Use index of a data-scrollable element to scroll a specific area.",
    inputSchema: Ae({
      right: Gt().default(!0),
      pixels: Ye().int().min(0),
      index: Ye().int().min(0).optional(),
    }),
    execute: async function (e) {
      return (await this.pageController.scrollHorizontally(e)).message;
    },
  });
  et.set("execute_javascript", {
    description:
      "Execute JavaScript code on the current page. Supports async/await syntax. Use with caution! An `AbortSignal` named `signal` is available in scope: long-running async code MUST honor it (e.g. `await fetch(url, { signal })`, or `signal.throwIfAborted()` in loops)",
    inputSchema: Ae({ script: Ee() }),
    execute: async function (e, { signal: n }) {
      let i = await this.pageController.executeJavascript(e.script, n);
      return (n.throwIfAborted(), i.message);
    },
  });
  var Xg = class extends EventTarget {
    id = qg();
    config;
    tools;
    pageController;
    task = "";
    taskId = "";
    history = [];
    #doneBlocks = 0;
    disposed = !1;
    onAskUser;
    #i = "idle";
    #e;
    #t = new AbortController();
    #n = [];
    #a = Promise.resolve();
    #o = null;
    #r = { totalWaitTime: 0, lastURL: "", browserState: null };
    constructor(e) {
      if (
        (super(),
        (this.config = { ...e, maxSteps: e.maxSteps ?? 40 }),
        (this.#e = new Gg(this.config)),
        (this.tools = new Map(et)),
        (this.pageController = e.pageController),
        this.#e.addEventListener("retry", (n) => {
          let { attempt: i, maxAttempts: o, lastError: t } = n.detail;
          (this.#s({ type: "retrying", attempt: i, maxAttempts: o }),
            this.history.push({ type: "error", message: String(t), rawResponse: t.rawResponse }),
            this.history.push({
              type: "retry",
              message: `LLM retry attempt ${i} of ${o}`,
              attempt: i,
              maxAttempts: o,
            }),
            this.#c());
        }),
        this.config.customTools)
      )
        for (let [n, i] of Object.entries(this.config.customTools)) {
          if (i === null) {
            this.tools.delete(n);
            continue;
          }
          this.tools.set(n, i);
        }
      this.config.experimentalScriptExecutionTool || this.tools.delete("execute_javascript");
    }
    get status() {
      return this.#i;
    }
    get lastResult() {
      return this.#o;
    }
    #u() {
      this.dispatchEvent(new Event("statuschange"));
    }
    #c(e) {
      (e && this.history.push(e), this.dispatchEvent(new Event("historychange")));
    }
    #s(e) {
      this.dispatchEvent(new CustomEvent("activity", { detail: e }));
    }
    #l(e) {
      this.#i !== e && ((this.#i = e), this.#u());
    }
    pushObservation(e) {
      this.#n.push(e);
    }
    async stop() {
      this.#i === "running" && (this.#t.abort(), await this.#a);
    }
    async execute(e) {
      if (this.disposed) throw new Error("PageAgent has been disposed. Create a new instance.");
      if (this.#i === "running") throw new Error("A task is already running.");
      if (!e) throw new Error("Task is required");
      ((this.task = e),
        (this.taskId = qg()),
        (this.history = []),
        (this.#doneBlocks = 0),
        (this.#n = []),
        (this.#r = { totalWaitTime: 0, lastURL: "", browserState: null }),
        (this.#t = new AbortController()));
      let n = this.#t.signal,
        i;
      ((this.#a = new Promise((d) => (i = d))),
        this.#l("running"),
        this.#c(),
        this.onAskUser || this.tools.delete("ask_user"));
      let o = this.config.onBeforeStep,
        t = this.config.onAfterStep,
        r = this.config.onBeforeTask,
        a = this.config.onAfterTask,
        s = this.config.stepDelay ?? 0.4,
        u = this.config.maxSteps,
        c = 0,
        l,
        f = "error";
      await Td(() => this.pageController.showMask());
      try {
        for (await r?.(this); ; ) {
          await o?.(this, c);
          try {
            (console.group(`step: ${c}`),
              c > 0 && (await Ed(s, n)),
              n.throwIfAborted(),
              console.log(me.blue.bold("\u{1F440} Observing...")),
              (this.#r.browserState = await this.pageController.getBrowserState()),
              await this.#p(c));
            (() => {
              let h = this.history.filter((q) => q.type === "step").slice(-3);
              h.length === 3 &&
                new Set(
                  h.map((q) => q.action?.name + ":" + JSON.stringify(q.action?.input ?? null)),
                ).size === 1 &&
                this.pushObservation(
                  "Warning: you have repeated the exact same action 3+ times in a row but the page did not change as expected - this approach is NOT working. Do NOT repeat the same click again. Try a different action (e.g. fill_field_by_label or input_text with an explicit value, click a different element, or scroll), or ask the user for help.",
                );
            })();
            let v = await this.#g(),
              d = [
                { role: "system", content: this.#f() + (this._instr || "") },
                { role: "user", content: v },
              ],
              m = { AgentOutput: this.#d() };
            (console.log(me.blue.bold("\u{1F9E0} Thinking...")), this.#s({ type: "thinking" }));
            let g = await this.#e.invoke(d, m, n, {
                toolChoiceName: "AgentOutput",
                normalizeResponse: (E) => I_(E, this.tools),
              }),
              $ = g.toolResult,
              w = $.input,
              z = $.output,
              x = {
                evaluation_previous_goal: w.evaluation_previous_goal,
                memory: w.memory,
                next_goal: w.next_goal,
              },
              O = Object.keys(w.action)[0],
              I = { name: O, input: w.action[O], output: z };
            if (
              (this.#c({
                type: "step",
                stepIndex: c,
                reflection: x,
                action: I,
                usage: g.usage,
                rawResponse: g.rawResponse,
                rawRequest: g.rawRequest,
              }),
              O === "done")
            ) {
              let E = I.input?.success ?? !1,
                D = I.input?.text || "no text provided";
              // 空 done 拦截：text 为空 = 没有结果总结（面板只会显示 no text provided），要求补总结（最多拦 2 次防死锁）
              if (!String(I.input?.text ?? "").trim() && this.#doneBlocks < 2) {
                this.#doneBlocks++;
                this.pushObservation(
                  "❌ done 缺少结果总结：请用 text 说明完成了什么（填了哪些字段/值）、还剩什么未做，然后重新调用 done。",
                );
                console.log(me.yellow.bold("done with empty text blocked"));
                continue;
              }
              // 提前 done 拦截：未实际尝试（已执行步骤<3）且从未 ask_user 就结束任务，属于 done 误用
              if (this.#doneBlocks < 2) {
                let B = this.history.filter(
                    (h) => h.type === "step" && h.action?.name !== "done",
                  ).length,
                  K = this.history.some((h) => h.type === "step" && h.action?.name === "ask_user");
                if (B < 3 && !K) {
                  if (!E) {
                    // 交白卷式失败：拒绝结束并注入指引（最多拦 2 次，之后放行防死锁）
                    this.#doneBlocks++;
                    this.pushObservation(
                      "❌ 已拦截提前 done 失败：任务还没真正尝试就要放弃属于工具误用。信息不足必须用 ask_user 向用户提问；否则继续执行字段操作（点击/输入），禁止用 done 结束任务。",
                    );
                    console.log(me.yellow.bold("Premature done(success=false) blocked"));
                    continue;
                  }
                  if (this.#doneBlocks === 0) {
                    // 提前宣告成功：二次确认——仅执行 1-2 步就 done(true) 多为半途而废，拦一次让模型重新审视；再次 done 直接放行
                    this.#doneBlocks++;
                    this.pushObservation(
                      "❌ 提前 done 确认：仅执行了 " +
                        B +
                        " 步就宣告任务完成。若任务确实已完成，请再次调用 done（会立即放行）；若页面仍有待填字段、必填项或未处理的 tab 页签，必须继续执行。",
                    );
                    console.log(me.yellow.bold("Premature done(success=true) double-confirm"));
                    continue;
                  }
                }
              }
              (console.log(me.green.bold("Task completed"), E, D),
                (l = { success: E, data: D, history: this.history }),
                (this.#o = l),
                (f = "completed"));
              break;
            }
          } catch (d) {
            let m = d?.name === "AbortError";
            m || console.error("Task failed", d);
            let g = m ? "Task aborted" : String(d);
            (this.#s({ type: "error", message: g }),
              this.#c({ type: "error", message: g, rawResponse: d }),
              (l = { success: !1, data: g, history: this.history }),
              (this.#o = l),
              (f = m ? "stopped" : "error"));
            break;
          } finally {
            (console.groupEnd(), await t?.(this, this.history));
          }
          if ((c++, c > u)) {
            let d = "Step count exceeded maximum limit";
            (console.error(d),
              this.#s({ type: "error", message: d }),
              this.#c({ type: "error", message: d }),
              (l = { success: !1, data: d, history: this.history }),
              (this.#o = l),
              (f = "error"));
            break;
          }
        }
        return (await a?.(this, l), l);
      } catch (d) {
        throw (this.#s({ type: "error", message: String(d) }), (f = "error"), d);
      } finally {
        (await Td(() => this.pageController.cleanUpHighlights()),
          await Td(() => this.pageController.hideMask()),
          this.#t.abort(),
          i(),
          this.#l(f));
      }
    }
    #d() {
      let e = this.tools,
        n = Array.from(e.entries()).map(([o, t]) =>
          Ae({ [o]: t.inputSchema }).describe(t.description),
        ),
        i = wt(n);
      return {
        description: "You MUST call this tool every step!",
        inputSchema: Ae({
          evaluation_previous_goal: Ee().optional(),
          memory: Ee().optional(),
          next_goal: Ee().optional(),
          action: i,
        }),
        execute: async (o) => {
          let t = this.#t.signal;
          (t.throwIfAborted(), console.log(me.blue.bold("MacroTool input"), o));
          let r = o.action,
            a = Object.keys(r)[0],
            s = r[a],
            u = [];
          (o.evaluation_previous_goal && u.push(`\u2705: ${o.evaluation_previous_goal}`),
            o.memory && u.push(`\u{1F4BE}: ${o.memory}`),
            o.next_goal && u.push(`\u{1F3AF}: ${o.next_goal}`));
          let c =
            u.length > 0
              ? u.join(`
`)
              : "";
          c && console.log(c);
          let l = e.get(a);
          T_(l, `Tool ${a} not found`);
          let f = Date.now(),
            d;
          // 防死循环硬拦截：最近 6 步内同一动作+同参数已出现 3 次 → 拒绝执行，强制换策略
          // （旧逻辑只警告"连续 3 步完全相同"，被交替点击绕过；这里允许穿插其他动作，数窗口内重复次数）
          let rep = this.history
            .filter((q) => q.type === "step")
            .slice(-6)
            .filter(
              (q) =>
                q.action?.name === a &&
                JSON.stringify(q.action?.input ?? null) === JSON.stringify(s ?? null),
            ).length;
          // 空下拉选项拦截：text 为空等于没选（模型盲选），直接拒绝
          if (a === "select_dropdown_option" && !String(s?.text ?? "").trim())
            d = {
              success: !1,
              message:
                "❌ select_dropdown_option 的 text 为空，已拦截：禁止盲选。请先从 browser_state 读取该下拉的可见选项，再用确切的选项文本重新选择",
            };
          else if (rep >= 3)
            d = {
              success: !1,
              message:
                "❌ " +
                a +
                " 已重复 " +
                rep +
                " 次且页面无进展，本次已拦截：禁止原样重复。请换策略——click 相邻/父级元素、scroll 查找真正的入口、用 execute_javascript 直接触发（如读取外层 a[href] 后改 location.href 跳转）、或 ask_user 向用户求助",
            };
          else
            (console.log(me.blue.bold(`Executing tool: ${a}`), s),
              this.#s({ type: "executing", tool: a, input: s }),
              (d = await l.execute.bind(this)(s, { signal: t })));
          t.throwIfAborted();
          let m = Date.now() - f;
          return (
            console.log(me.green.bold(`Tool (${a}) executed for ${m}ms`), d),
            this.#s({ type: "executed", tool: a, input: s, output: d, duration: m }),
            a === "wait" ? (this.#r.totalWaitTime += s?.seconds || 0) : (this.#r.totalWaitTime = 0),
            { input: o, output: d }
          );
        },
      };
    }
    #f() {
      if (this.config.customSystemPrompt) return this.config.customSystemPrompt;
      let e = this.config.language === "zh-CN" ? "\u4E2D\u6587" : "English";
      return k_.replace(
        /Default working language: \*\*.*?\*\*/,
        `Default working language: **${e}**`,
      );
    }
    async #m() {
      let { instructions: e, experimentalLlmsTxt: n } = this.config,
        i = e?.system?.trim(),
        o,
        t = this.#r.browserState?.url || "";
      if (e?.getPageInstructions && t)
        try {
          o = e.getPageInstructions(t)?.trim();
        } catch (s) {
          console.error(me.red("[PageAgent] Failed to execute getPageInstructions callback:"), s);
        }
      let r = n && t ? await O_(t) : void 0;
      if (!i && !o && !r) return "";
      let a = `<instructions>
`;
      return (
        i &&
          (a += `<system_instructions>
${i}
</system_instructions>
`),
        o &&
          (a += `<page_instructions>
${o}
</page_instructions>
`),
        r &&
          (a += `<llms_txt>
${r}
</llms_txt>
`),
        (a += `</instructions>

`),
        a
      );
    }
    async #p(e) {
      this.#r.totalWaitTime >= 3 &&
        this.pushObservation(
          `You have waited ${this.#r.totalWaitTime} seconds accumulatively. DO NOT wait any longer unless you have a good reason.`,
        );
      let n = this.#r.browserState?.url || "";
      n !== this.#r.lastURL &&
        (this.pushObservation(`Page navigated to \u2192 ${n}`),
        (this.#r.lastURL = n),
        await Ed(0.5));
      let i = this.config.maxSteps - e;
      if (
        (i === 5
          ? this.pushObservation(
              `\u26A0\uFE0F Only ${i} steps remaining. Consider wrapping up or calling done with partial results.`,
            )
          : i === 2 &&
            this.pushObservation(
              `\u26A0\uFE0F Critical: Only ${i} steps left! You must finish the task or call done immediately.`,
            ),
        this.#n.length > 0)
      ) {
        for (let o of this.#n)
          (this.history.push({ type: "observation", content: o }),
            console.log(me.cyan("Observation:"), o));
        ((this.#n = []), this.#c());
      }
    }
    async #g() {
      let e = this.#r.browserState,
        n = "";
      this._instr = await this.#m();
      let i = this.history.filter((r) => r.type === "step").length;
      ((n += `<agent_state>
`),
        (n += `<user_request>
`),
        (n += `${this.task}
`),
        (n += `</user_request>
`),
        (n += `<step_info>
`),
        (n += `Step ${i + 1} of ${this.config.maxSteps} max possible steps
`),
        (n += `Current time: ${new Date().toLocaleString()}
`),
        (n += `</step_info>
`),
        (n += `</agent_state>

`),
        (n += `<agent_history>
`));
      let o = 0;
      for (let r of this.history)
        r.type === "step"
          ? (o++,
            (n += `<step_${o}>
`),
            (n += `Evaluation of Previous Step: ${r.reflection.evaluation_previous_goal}
`),
            (n += `Memory: ${r.reflection.memory}
`),
            (n += `Next Goal: ${r.reflection.next_goal}
`),
            (n += `Action Results: ${r.action.output}
`),
            (n += `</step_${o}>
`))
          : r.type === "observation"
            ? (n += `<sys>${r.content}</sys>
`)
            : r.type === "user_takeover"
              ? (n += `<sys>User took over control and made changes to the page</sys>
`)
              : r.type;
      n += `</agent_history>

`;
      let t = e.content;
      return (
        this.config.transformPageContent && (t = await this.config.transformPageContent(t)),
        (n += `<browser_state>
`),
        (n +=
          e.header +
          `
`),
        (n +=
          t +
          `
`),
        (n +=
          e.footer +
          `

`),
        (n += `</browser_state>

`),
        n
      );
    }
    dispose() {
      (console.log("Disposing PageAgent..."),
        (this.disposed = !0),
        this.pageController.dispose(),
        this.#t.abort(),
        this.dispatchEvent(new Event("dispose")),
        this.config.onDispose?.(this));
    }
  };
  var rh = Object.defineProperty,
    J_ = (e, n) => {
      let i = {};
      for (var o in e) rh(i, o, { get: e[o], enumerable: !0 });
      return (n || rh(i, Symbol.toStringTag, { value: "Module" }), i);
    };
  function G_(e) {
    return !!e && e.nodeType === 1;
  }
  function K_(e) {
    return e?.nodeType === 1 && e.tagName === "INPUT";
  }
  function q_(e) {
    return e?.nodeType === 1 && e.tagName === "TEXTAREA";
  }
  function X_(e) {
    return e?.nodeType === 1 && e.tagName === "SELECT";
  }
  function H_(e) {
    return e?.nodeType === 1 && e.tagName === "A";
  }
  function Y_(e) {
    let n = e.ownerDocument.defaultView?.frameElement;
    if (!n) return { x: 0, y: 0 };
    let i = n.getBoundingClientRect();
    return { x: i.left, y: i.top };
  }
  function Q_(e) {
    return Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), "value").set;
  }
  async function Xt(e) {
    await new Promise((n) => setTimeout(n, e * 1e3));
  }
  async function ew(e, n, i) {
    let o = Y_(e);
    (window.dispatchEvent(
      new CustomEvent("PageAgent::MovePointerTo", { detail: { x: n + o.x, y: i + o.y } }),
    ),
      await Xt(0.3));
  }
  async function tw() {
    window.dispatchEvent(new CustomEvent("PageAgent::ClickPointer"));
  }
  async function nw() {
    window.dispatchEvent(new CustomEvent("PageAgent::EnablePassThrough"));
  }
  async function rw() {
    window.dispatchEvent(new CustomEvent("PageAgent::DisablePassThrough"));
  }
  function Br(e, n) {
    let i = e.get(n);
    if (!i) throw new Error(`No interactive element found at index ${n}`);
    let o = i.ref;
    if (!o) throw new Error(`Element at index ${n} does not have a reference`);
    if (!G_(o)) throw new Error(`Element at index ${n} is not an HTMLElement`);
    return o;
  }
  var kt = null;
  function iw() {
    kt &&
      (kt.dispatchEvent(new PointerEvent("pointerout", { bubbles: !0 })),
      kt.dispatchEvent(new PointerEvent("pointerleave", { bubbles: !1 })),
      kt.dispatchEvent(new MouseEvent("mouseout", { bubbles: !0 })),
      kt.dispatchEvent(new MouseEvent("mouseleave", { bubbles: !1 })),
      kt.blur(),
      (kt = null));
  }
  async function sh(e) {
    (iw(), (kt = e), await ih(e));
    let n = e.ownerDocument.defaultView?.frameElement;
    n && (await ih(n));
    let i = e.getBoundingClientRect(),
      o = i.left + i.width / 2,
      t = i.top + i.height / 2;
    (await ew(e, o, t), await tw(), await Xt(0.1));
    let r = e.ownerDocument;
    await nw();
    let a = r.elementFromPoint(o, t);
    await rw();
    let s = a instanceof HTMLElement && e.contains(a) ? a : e,
      u = { bubbles: !0, cancelable: !0, clientX: o, clientY: t, pointerType: "mouse" },
      c = { bubbles: !0, cancelable: !0, clientX: o, clientY: t, button: 0 };
    (s.dispatchEvent(new PointerEvent("pointerover", u)),
      s.dispatchEvent(new PointerEvent("pointerenter", { ...u, bubbles: !1 })),
      s.dispatchEvent(new MouseEvent("mouseover", c)),
      s.dispatchEvent(new MouseEvent("mouseenter", { ...c, bubbles: !1 })),
      s.dispatchEvent(new PointerEvent("pointerdown", u)),
      s.dispatchEvent(new MouseEvent("mousedown", c)),
      e.focus({ preventScroll: !0 }),
      s.dispatchEvent(new PointerEvent("pointerup", u)),
      s.dispatchEvent(new MouseEvent("mouseup", c)),
      s.click(),
      await Xt(0.2));
  }
  async function ow(e, n) {
    let i = e.isContentEditable;
    if (!K_(e) && !q_(e) && !i)
      throw new Error("Element is not an input, textarea, or contenteditable");
    if ((await sh(e), i)) {
      if (
        (e.dispatchEvent(
          new InputEvent("beforeinput", {
            bubbles: !0,
            cancelable: !0,
            inputType: "deleteContent",
          }),
        ) &&
          ((e.innerText = ""),
          e.dispatchEvent(new InputEvent("input", { bubbles: !0, inputType: "deleteContent" }))),
        e.dispatchEvent(
          new InputEvent("beforeinput", {
            bubbles: !0,
            cancelable: !0,
            inputType: "insertText",
            data: n,
          }),
        ) &&
          ((e.innerText = n),
          e.dispatchEvent(
            new InputEvent("input", { bubbles: !0, inputType: "insertText", data: n }),
          )),
        e.innerText.trim() !== n.trim())
      ) {
        e.focus();
        let o = e.ownerDocument,
          t = (o.defaultView || window).getSelection(),
          r = o.createRange();
        (r.selectNodeContents(e),
          t?.removeAllRanges(),
          t?.addRange(r),
          o.execCommand("delete", !1),
          o.execCommand("insertText", !1, n));
      }
      (e.dispatchEvent(new Event("change", { bubbles: !0 })), e.blur());
    } else Q_(e).call(e, n);
    (i || e.dispatchEvent(new Event("input", { bubbles: !0 })), await Xt(0.1));
  }
  async function aw(e, n) {
    if (!X_(e)) throw new Error("Element is not a select element");
    let i = Array.from(e.options).find((o) => o.textContent?.trim() === n.trim());
    if (!i) throw new Error(`Option with text "${n}" not found in select element`);
    ((e.value = i.value), e.dispatchEvent(new Event("change", { bubbles: !0 })), await Xt(0.1));
  }
  async function ih(e) {
    let n = e;
    typeof n.scrollIntoViewIfNeeded == "function"
      ? n.scrollIntoViewIfNeeded()
      : e.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
  }
  async function sw(e, n) {
    if (n) {
      let a = n,
        s = a,
        u = !1,
        c = null,
        l = 0,
        f = 0,
        d = e;
      for (; s && f < 10; ) {
        let m = window.getComputedStyle(s),
          g =
            /(auto|scroll|overlay)/.test(m.overflowY) ||
            (m.scrollbarWidth && m.scrollbarWidth !== "auto") ||
            (m.scrollbarGutter && m.scrollbarGutter !== "auto"),
          $ = s.scrollHeight > s.clientHeight;
        if (g && $) {
          let w = s.scrollTop,
            z = s.scrollHeight - s.clientHeight,
            x = d / 3;
          (x > 0 ? (x = Math.min(x, z - w)) : (x = Math.max(x, -w)), (s.scrollTop = w + x));
          let O = s.scrollTop - w;
          if (Math.abs(O) > 0.5) {
            ((u = !0), (c = s), (l = O));
            break;
          }
        }
        if (s === document.body || s === document.documentElement) break;
        ((s = s.parentElement), f++);
      }
      return u
        ? `Scrolled container (${c?.tagName}) by ${l}px`
        : `No scrollable container found for element (${a.tagName})`;
    }
    let i = e,
      o = (a) => a.clientHeight >= window.innerHeight * 0.5,
      t = (a) =>
        !!(
          a &&
          /(auto|scroll|overlay)/.test(getComputedStyle(a).overflowY) &&
          a.scrollHeight > a.clientHeight &&
          o(a)
        ),
      r = document.activeElement;
    for (; r && !t(r) && r !== document.body; ) r = r.parentElement;
    if (
      ((r = t(r)
        ? r
        : Array.from(document.querySelectorAll("*")).find(t) ||
          document.scrollingElement ||
          document.documentElement),
      r === document.scrollingElement || r === document.documentElement || r === document.body)
    ) {
      let a = window.scrollY,
        s = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollBy(0, i);
      let u = window.scrollY,
        c = u - a;
      if (Math.abs(c) < 1)
        return i > 0
          ? "\u26A0\uFE0F Already at the bottom of the page, cannot scroll down further."
          : "\u26A0\uFE0F Already at the top of the page, cannot scroll up further.";
      let l = i > 0 && u >= s - 1,
        f = i < 0 && u <= 1;
      return l
        ? `\u2705 Scrolled page by ${c}px. Reached the bottom of the page.`
        : f
          ? `\u2705 Scrolled page by ${c}px. Reached the top of the page.`
          : `\u2705 Scrolled page by ${c}px.`;
    } else {
      let a = "The document is not scrollable. Falling back to container scroll.";
      console.log(`[PageController] ${a}`);
      let s = r.scrollTop,
        u = r.scrollHeight - r.clientHeight;
      (r.scrollBy({ top: i, behavior: "smooth" }), await Xt(0.1));
      let c = r.scrollTop,
        l = c - s;
      if (Math.abs(l) < 1)
        return i > 0
          ? `\u26A0\uFE0F ${a} Already at the bottom of container (${r.tagName}), cannot scroll down further.`
          : `\u26A0\uFE0F ${a} Already at the top of container (${r.tagName}), cannot scroll up further.`;
      let f = i > 0 && c >= u - 1,
        d = i < 0 && c <= 1;
      return f
        ? `\u2705 ${a} Scrolled container (${r.tagName}) by ${l}px. Reached the bottom.`
        : d
          ? `\u2705 ${a} Scrolled container (${r.tagName}) by ${l}px. Reached the top.`
          : `\u2705 ${a} Scrolled container (${r.tagName}) by ${l}px.`;
    }
  }
  async function cw(e, n) {
    if (n) {
      let a = n,
        s = a,
        u = !1,
        c = null,
        l = 0,
        f = 0,
        d = e;
      for (; s && f < 10; ) {
        let m = window.getComputedStyle(s),
          g =
            /(auto|scroll|overlay)/.test(m.overflowX) ||
            (m.scrollbarWidth && m.scrollbarWidth !== "auto") ||
            (m.scrollbarGutter && m.scrollbarGutter !== "auto"),
          $ = s.scrollWidth > s.clientWidth;
        if (g && $) {
          let w = s.scrollLeft,
            z = s.scrollWidth - s.clientWidth,
            x = d / 3;
          (x > 0 ? (x = Math.min(x, z - w)) : (x = Math.max(x, -w)), (s.scrollLeft = w + x));
          let O = s.scrollLeft - w;
          if (Math.abs(O) > 0.5) {
            ((u = !0), (c = s), (l = O));
            break;
          }
        }
        if (s === document.body || s === document.documentElement) break;
        ((s = s.parentElement), f++);
      }
      return u
        ? `Scrolled container (${c?.tagName}) horizontally by ${l}px`
        : `No horizontally scrollable container found for element (${a.tagName})`;
    }
    let i = e,
      o = (a) => a.clientWidth >= window.innerWidth * 0.5,
      t = (a) =>
        !!(
          a &&
          /(auto|scroll|overlay)/.test(getComputedStyle(a).overflowX) &&
          a.scrollWidth > a.clientWidth &&
          o(a)
        ),
      r = document.activeElement;
    for (; r && !t(r) && r !== document.body; ) r = r.parentElement;
    if (
      ((r = t(r)
        ? r
        : Array.from(document.querySelectorAll("*")).find(t) ||
          document.scrollingElement ||
          document.documentElement),
      r === document.scrollingElement || r === document.documentElement || r === document.body)
    ) {
      let a = window.scrollX,
        s = document.documentElement.scrollWidth - window.innerWidth;
      window.scrollBy(i, 0);
      let u = window.scrollX,
        c = u - a;
      if (Math.abs(c) < 1)
        return i > 0
          ? "\u26A0\uFE0F Already at the right edge of the page, cannot scroll right further."
          : "\u26A0\uFE0F Already at the left edge of the page, cannot scroll left further.";
      let l = i > 0 && u >= s - 1,
        f = i < 0 && u <= 1;
      return l
        ? `\u2705 Scrolled page by ${c}px. Reached the right edge of the page.`
        : f
          ? `\u2705 Scrolled page by ${c}px. Reached the left edge of the page.`
          : `\u2705 Scrolled page horizontally by ${c}px.`;
    } else {
      let a = "The document is not scrollable. Falling back to container scroll.";
      console.log(`[PageController] ${a}`);
      let s = r.scrollLeft,
        u = r.scrollWidth - r.clientWidth;
      (r.scrollBy({ left: i, behavior: "smooth" }), await Xt(0.1));
      let c = r.scrollLeft,
        l = c - s;
      if (Math.abs(l) < 1)
        return i > 0
          ? `\u26A0\uFE0F ${a} Already at the right edge of container (${r.tagName}), cannot scroll right further.`
          : `\u26A0\uFE0F ${a} Already at the left edge of container (${r.tagName}), cannot scroll left further.`;
      let f = i > 0 && c >= u - 1,
        d = i < 0 && c <= 1;
      return f
        ? `\u2705 ${a} Scrolled container (${r.tagName}) by ${l}px. Reached the right edge.`
        : d
          ? `\u2705 ${a} Scrolled container (${r.tagName}) by ${l}px. Reached the left edge.`
          : `\u2705 ${a} Scrolled container (${r.tagName}) horizontally by ${l}px.`;
    }
  }
  var uw = (
      e = {
        doHighlightElements: !0,
        focusHighlightIndex: -1,
        viewportExpansion: 0,
        debugMode: !1,
        interactiveBlacklist: [],
        interactiveWhitelist: [],
        highlightOpacity: 0.1,
        highlightLabelOpacity: 0.5,
      },
    ) => {
      let {
          interactiveBlacklist: n,
          interactiveWhitelist: i,
          highlightOpacity: o,
          highlightLabelOpacity: t,
        } = e,
        { doHighlightElements: r, focusHighlightIndex: a, viewportExpansion: s, debugMode: u } = e,
        c = 0,
        l = new WeakMap();
      function f(p, S) {
        !p || p.nodeType !== Node.ELEMENT_NODE || l.set(p, { ...l.get(p), ...S });
      }
      let d = {
        boundingRects: new WeakMap(),
        clientRects: new WeakMap(),
        computedStyles: new WeakMap(),
        clearCache: () => {
          ((d.boundingRects = new WeakMap()),
            (d.clientRects = new WeakMap()),
            (d.computedStyles = new WeakMap()));
        },
      };
      function m(p) {
        if (!p) return null;
        if (d.boundingRects.has(p)) return d.boundingRects.get(p);
        let S = p.getBoundingClientRect();
        return (S && d.boundingRects.set(p, S), S);
      }
      function g(p) {
        if (!p) return null;
        if (d.computedStyles.has(p)) return d.computedStyles.get(p);
        let S = window.getComputedStyle(p);
        return (S && d.computedStyles.set(p, S), S);
      }
      function $(p) {
        if (!p) return null;
        if (d.clientRects.has(p)) return d.clientRects.get(p);
        let S = p.getClientRects();
        return (S && d.clientRects.set(p, S), S);
      }
      let w = {},
        z = { current: 0 },
        x = "playwright-highlight-container";
      function O(p, S, B = null) {
        if (!p) return S;
        let N = [],
          U = null,
          J = 20,
          T = 16,
          Z = null;
        try {
          let j = document.getElementById(x);
          j ||
            ((j = document.createElement("div")),
            (j.id = x),
            (j.style.position = "fixed"),
            (j.style.pointerEvents = "none"),
            (j.style.top = "0"),
            (j.style.left = "0"),
            (j.style.width = "100%"),
            (j.style.height = "100%"),
            (j.style.zIndex = "2147483640"),
            (j.style.backgroundColor = "transparent"),
            document.body.appendChild(j));
          let W = p.getClientRects();
          if (!W || W.length === 0) return S;
          let Ce = [
              "#FF0000",
              "#00FF00",
              "#0000FF",
              "#FFA500",
              "#800080",
              "#008080",
              "#FF69B4",
              "#4B0082",
              "#FF4500",
              "#2E8B57",
              "#DC143C",
              "#4682B4",
            ],
            ge = Ce[S % Ce.length],
            Fe =
              ge +
              Math.floor(o * 255)
                .toString(16)
                .padStart(2, "0");
          ge =
            ge +
            Math.floor(t * 255)
              .toString(16)
              .padStart(2, "0");
          let _e = { x: 0, y: 0 };
          if (B) {
            let oe = B.getBoundingClientRect();
            ((_e.x = oe.left), (_e.y = oe.top));
          }
          let Fn = document.createDocumentFragment();
          for (let oe of W) {
            if (oe.width === 0 || oe.height === 0) continue;
            let ae = document.createElement("div");
            ((ae.style.position = "fixed"),
              (ae.style.border = `2px solid ${ge}`),
              (ae.style.backgroundColor = Fe),
              (ae.style.pointerEvents = "none"),
              (ae.style.boxSizing = "border-box"));
            let ee = oe.top + _e.y,
              tt = oe.left + _e.x;
            ((ae.style.top = `${ee}px`),
              (ae.style.left = `${tt}px`),
              (ae.style.width = `${oe.width}px`),
              (ae.style.height = `${oe.height}px`),
              Fn.appendChild(ae),
              N.push({ element: ae, initialRect: oe }));
          }
          let St = W[0];
          ((U = document.createElement("div")),
            (U.className = "playwright-highlight-label"),
            (U.style.position = "fixed"),
            (U.style.background = ge),
            (U.style.color = t > 0 ? "white" : "transparent"),
            (U.style.padding = "1px 4px"),
            (U.style.borderRadius = "4px"),
            (U.style.fontSize = `${Math.min(12, Math.max(8, St.height / 2))}px`),
            (U.textContent = S.toString()),
            (J = U.offsetWidth > 0 ? U.offsetWidth : J),
            (T = U.offsetHeight > 0 ? U.offsetHeight : T));
          let Ld = St.top + _e.y,
            ia = St.left + _e.x,
            Wr = Ld + 2,
            Ht = ia + St.width - J - 2;
          ((St.width < J + 4 || St.height < T + 4) &&
            ((Wr = Ld - T - 2), (Ht = ia + St.width - J), Ht < _e.x && (Ht = ia)),
            (Wr = Math.max(0, Math.min(Wr, window.innerHeight - T))),
            (Ht = Math.max(0, Math.min(Ht, window.innerWidth - J))),
            (U.style.top = `${Wr}px`),
            (U.style.left = `${Ht}px`),
            Fn.appendChild(U));
          let Jr = ((oe, ae) => {
            let ee = 0;
            return (...tt) => {
              let De = performance.now();
              if (!(De - ee < ae)) return ((ee = De), oe(...tt));
            };
          })(() => {
            let oe = p.getClientRects(),
              ae = { x: 0, y: 0 };
            if (B) {
              let ee = B.getBoundingClientRect();
              ((ae.x = ee.left), (ae.y = ee.top));
            }
            if (
              (N.forEach((ee, tt) => {
                if (tt < oe.length) {
                  let De = oe[tt],
                    Yt = De.top + ae.y,
                    ct = De.left + ae.x;
                  ((ee.element.style.top = `${Yt}px`),
                    (ee.element.style.left = `${ct}px`),
                    (ee.element.style.width = `${De.width}px`),
                    (ee.element.style.height = `${De.height}px`),
                    (ee.element.style.display =
                      De.width === 0 || De.height === 0 ? "none" : "block"));
                } else ee.element.style.display = "none";
              }),
              oe.length < N.length)
            )
              for (let ee = oe.length; ee < N.length; ee++) N[ee].element.style.display = "none";
            if (U && oe.length > 0) {
              let ee = oe[0],
                tt = ee.top + ae.y,
                De = ee.left + ae.x,
                Yt = tt + 2,
                ct = De + ee.width - J - 2;
              ((ee.width < J + 4 || ee.height < T + 4) &&
                ((Yt = tt - T - 2), (ct = De + ee.width - J), ct < ae.x && (ct = De)),
                (Yt = Math.max(0, Math.min(Yt, window.innerHeight - T))),
                (ct = Math.max(0, Math.min(ct, window.innerWidth - J))),
                (U.style.top = `${Yt}px`),
                (U.style.left = `${ct}px`),
                (U.style.display = "block"));
            } else U && (U.style.display = "none");
          }, 16);
          return (
            window.addEventListener("scroll", Jr, !0),
            window.addEventListener("resize", Jr),
            (Z = () => {
              (window.removeEventListener("scroll", Jr, !0),
                window.removeEventListener("resize", Jr),
                N.forEach((oe) => oe.element.remove()),
                U && U.remove());
            }),
            j.appendChild(Fn),
            S + 1
          );
        } finally {
          Z &&
            (window._highlightCleanupFunctions = window._highlightCleanupFunctions || []).push(Z);
        }
      }
      function I(p) {
        if (!p || p.nodeType !== Node.ELEMENT_NODE) return null;
        let S = g(p);
        if (!S) return null;
        let B = S.display;
        if (B === "inline" || B === "inline-block") return null;
        let N = S.overflowX,
          U = S.overflowY,
          J =
            (S.scrollbarWidth && S.scrollbarWidth !== "auto") ||
            (S.scrollbarGutter && S.scrollbarGutter !== "auto"),
          T = N === "auto" || N === "scroll",
          Z = U === "auto" || U === "scroll";
        if (!T && !Z && !J) return null;
        let j = p.scrollWidth - p.clientWidth,
          W = p.scrollHeight - p.clientHeight,
          Ce = 4;
        if ((j < Ce && W < Ce) || (!Z && !J && j < Ce) || (!T && !J && W < Ce)) return null;
        let ge = p.scrollTop,
          Fe = p.scrollLeft,
          _e = {
            top: ge,
            right: p.scrollWidth - p.clientWidth - p.scrollLeft,
            bottom: p.scrollHeight - p.clientHeight - p.scrollTop,
            left: Fe,
          };
        return (f(p, { scrollable: !0, scrollData: _e }), _e);
      }
      function E(p) {
        try {
          if (s === -1) {
            let T = p.parentElement;
            if (!T) return !1;
            try {
              return T.checkVisibility({ checkOpacity: !0, checkVisibilityCSS: !0 });
            } catch {
              let j = window.getComputedStyle(T);
              return j.display !== "none" && j.visibility !== "hidden" && j.opacity !== "0";
            }
          }
          let S = document.createRange();
          S.selectNodeContents(p);
          let B = S.getClientRects();
          if (!B || B.length === 0) return !1;
          let N = !1,
            U = !1;
          for (let T of B)
            if (
              T.width > 0 &&
              T.height > 0 &&
              ((N = !0),
              !(
                T.bottom < -s ||
                T.top > window.innerHeight + s ||
                T.right < -s ||
                T.left > window.innerWidth + s
              ))
            ) {
              U = !0;
              break;
            }
          if (!N || !U) return !1;
          let J = p.parentElement;
          if (!J) return !1;
          try {
            return J.checkVisibility({ checkOpacity: !0, checkVisibilityCSS: !0 });
          } catch {
            let Z = window.getComputedStyle(J);
            return Z.display !== "none" && Z.visibility !== "hidden" && Z.opacity !== "0";
          }
        } catch (S) {
          return (console.warn("Error checking text node visibility:", S), !1);
        }
      }
      function D(p) {
        if (!p || !p.tagName) return !1;
        let S = new Set(["body", "div", "main", "article", "section", "nav", "header", "footer"]),
          B = p.tagName.toLowerCase();
        return S.has(B)
          ? !0
          : !new Set(["svg", "script", "style", "link", "meta", "noscript", "template"]).has(B);
      }
      function R(p) {
        let S = g(p);
        return (
          p.offsetWidth > 0 &&
          p.offsetHeight > 0 &&
          S?.visibility !== "hidden" &&
          S?.display !== "none"
        );
      }
      function be(p) {
        if (!p || p.nodeType !== Node.ELEMENT_NODE || n.includes(p)) return !1;
        if (i.includes(p)) return !0;
        let S = p.tagName.toLowerCase(),
          B = g(p),
          N = new Set([
            "pointer",
            "move",
            "text",
            "grab",
            "grabbing",
            "cell",
            "copy",
            "alias",
            "all-scroll",
            "col-resize",
            "context-menu",
            "crosshair",
            "e-resize",
            "ew-resize",
            "help",
            "n-resize",
            "ne-resize",
            "nesw-resize",
            "ns-resize",
            "nw-resize",
            "nwse-resize",
            "row-resize",
            "s-resize",
            "se-resize",
            "sw-resize",
            "vertical-text",
            "w-resize",
            "zoom-in",
            "zoom-out",
          ]),
          U = new Set(["not-allowed", "no-drop", "wait", "progress", "initial", "inherit"]);
        function J(ge) {
          return ge.tagName.toLowerCase() === "html" ? !1 : !!(B?.cursor && N.has(B.cursor));
        }
        if (J(p)) return !0;
        let T = new Set([
            "a",
            "button",
            "input",
            "select",
            "textarea",
            "details",
            "summary",
            "label",
            "option",
            "optgroup",
            "fieldset",
            "legend",
          ]),
          Z = new Set(["disabled", "readonly"]);
        if (T.has(S)) {
          if (B?.cursor && U.has(B.cursor)) return !1;
          for (let ge of Z)
            if (p.hasAttribute(ge) || p.getAttribute(ge) === "true" || p.getAttribute(ge) === "")
              return !1;
          return !(p.disabled || p.readOnly || p.inert);
        }
        let j = p.getAttribute("role"),
          W = p.getAttribute("aria-role");
        if (
          p.getAttribute("contenteditable") === "true" ||
          p.isContentEditable ||
          (p.classList &&
            (p.classList.contains("button") ||
              p.classList.contains("dropdown-toggle") ||
              p.getAttribute("data-index") ||
              p.getAttribute("data-toggle") === "dropdown" ||
              p.getAttribute("aria-haspopup") === "true"))
        )
          return !0;
        let Ce = new Set([
          "button",
          "menu",
          "menubar",
          "menuitem",
          "menuitemradio",
          "menuitemcheckbox",
          "radio",
          "checkbox",
          "tab",
          "switch",
          "slider",
          "spinbutton",
          "combobox",
          "searchbox",
          "textbox",
          "listbox",
          "option",
          "scrollbar",
        ]);
        if (T.has(S) || (j && Ce.has(j)) || (W && Ce.has(W))) return !0;
        try {
          if (typeof getEventListeners == "function") {
            let Fe = getEventListeners(p);
            for (let _e of ["click", "mousedown", "mouseup", "dblclick"])
              if (Fe[_e] && Fe[_e].length > 0) return !0;
          }
          let ge =
            p?.ownerDocument?.defaultView?.getEventListenersForNode ||
            window.getEventListenersForNode;
          if (typeof ge == "function") {
            let Fe = ge(p);
            for (let _e of [
              "click",
              "mousedown",
              "mouseup",
              "keydown",
              "keyup",
              "submit",
              "change",
              "input",
              "focus",
              "blur",
            ])
              for (let Fn of Fe) if (Fn.type === _e) return !0;
          }
          for (let Fe of ["onclick", "onmousedown", "onmouseup", "ondblclick"])
            if (p.hasAttribute(Fe) || typeof p[Fe] == "function") return !0;
        } catch {}
        return !!I(p);
      }
      function pe(p) {
        if (s === -1) return !0;
        let S = $(p);
        if (!S || S.length === 0) return !1;
        let B = !1;
        for (let T of S)
          if (
            T.width > 0 &&
            T.height > 0 &&
            !(
              T.bottom < -s ||
              T.top > window.innerHeight + s ||
              T.right < -s ||
              T.left > window.innerWidth + s
            )
          ) {
            B = !0;
            break;
          }
        if (!B) return !1;
        if (p.ownerDocument !== window.document) return !0;
        let N = Array.from(S).find((T) => T.width > 0 && T.height > 0);
        if (!N) return !1;
        let U = p.getRootNode();
        if (U instanceof ShadowRoot) {
          let T = N.left + N.width / 2,
            Z = N.top + N.height / 2;
          try {
            let j = U.elementFromPoint(T, Z);
            if (!j) return !1;
            let W = j;
            for (; W && W !== U; ) {
              if (W === p) return !0;
              W = W.parentElement;
            }
            return !1;
          } catch {
            return !0;
          }
        }
        let J = 5;
        return [
          { x: N.left + N.width / 2, y: N.top + N.height / 2 },
          { x: N.left + J, y: N.top + J },
          { x: N.right - J, y: N.bottom - J },
        ].some(({ x: T, y: Z }) => {
          try {
            let j = document.elementFromPoint(T, Z);
            if (!j) return !1;
            let W = j;
            for (; W && W !== document.documentElement; ) {
              if (W === p) return !0;
              W = W.parentElement;
            }
            return !1;
          } catch {
            return !0;
          }
        });
      }
      function ce(p, S) {
        if (S === -1) return !0;
        let B = p.getClientRects();
        if (!B || B.length === 0) {
          let N = m(p);
          return !N || N.width === 0 || N.height === 0
            ? !1
            : !(
                N.bottom < -S ||
                N.top > window.innerHeight + S ||
                N.right < -S ||
                N.left > window.innerWidth + S
              );
        }
        for (let N of B)
          if (
            !(N.width === 0 || N.height === 0) &&
            !(
              N.bottom < -S ||
              N.top > window.innerHeight + S ||
              N.right < -S ||
              N.left > window.innerWidth + S
            )
          )
            return !0;
        return !1;
      }
      let ie = [
        "aria-expanded",
        "aria-checked",
        "aria-selected",
        "aria-pressed",
        "aria-haspopup",
        "aria-controls",
        "aria-owns",
        "aria-activedescendant",
        "aria-valuenow",
        "aria-valuetext",
        "aria-valuemax",
        "aria-valuemin",
        "aria-autocomplete",
      ];
      function de(p) {
        for (let S = 0; S < ie.length; S++) if (p.hasAttribute(ie[S])) return !0;
        return !1;
      }
      function It(p) {
        if (!p || p.nodeType !== Node.ELEMENT_NODE) return !1;
        let S = p.tagName.toLowerCase();
        return new Set([
          "a",
          "button",
          "input",
          "select",
          "textarea",
          "details",
          "summary",
          "label",
        ]).has(S)
          ? !0
          : p.hasAttribute("onclick") ||
              p.hasAttribute("role") ||
              p.hasAttribute("tabindex") ||
              de(p) ||
              p.hasAttribute("data-action") ||
              p.getAttribute("contenteditable") === "true";
      }
      let Ve = new Set([
          "a",
          "button",
          "input",
          "select",
          "textarea",
          "summary",
          "details",
          "label",
          "option",
          "li",
        ]),
        Zn = new Set([
          "button",
          "link",
          "menuitem",
          "menuitemradio",
          "menuitemcheckbox",
          "radio",
          "checkbox",
          "tab",
          "switch",
          "slider",
          "spinbutton",
          "combobox",
          "searchbox",
          "textbox",
          "listbox",
          "listitem",
          "treeitem",
          "row",
          "option",
          "scrollbar",
        ]);
      function Vn(p) {
        if (!p || p.nodeType !== Node.ELEMENT_NODE || !R(p)) return !1;
        let S =
            p.hasAttribute("role") ||
            p.hasAttribute("tabindex") ||
            p.hasAttribute("onclick") ||
            typeof p.onclick == "function",
          B = /\b(btn|clickable|menu|item|entry|link)\b/i.test(p.className || ""),
          N = !!p.closest('button,a,[role="button"],.menu,.dropdown,.list,.toolbar'),
          U = [...p.children].some(R),
          J = p.parentElement && p.parentElement.isSameNode(document.body);
        return (be(p) || S || B) && U && N && !J;
      }
      function Mn(p) {
        if (!p || p.nodeType !== Node.ELEMENT_NODE) return !1;
        let S = p.tagName.toLowerCase(),
          B = p.getAttribute("role");
        if (
          S === "iframe" ||
          Ve.has(S) ||
          (B && Zn.has(B)) ||
          p.isContentEditable ||
          p.getAttribute("contenteditable") === "true" ||
          p.hasAttribute("data-testid") ||
          p.hasAttribute("data-cy") ||
          p.hasAttribute("data-test") ||
          p.hasAttribute("onclick") ||
          typeof p.onclick == "function" ||
          de(p)
        )
          return !0;
        try {
          let N =
            p?.ownerDocument?.defaultView?.getEventListenersForNode ||
            window.getEventListenersForNode;
          if (typeof N == "function") {
            let U = N(p);
            for (let J of [
              "click",
              "mousedown",
              "mouseup",
              "keydown",
              "keyup",
              "submit",
              "change",
              "input",
              "focus",
              "blur",
            ])
              for (let T of U) if (T.type === J) return !0;
          }
          if (
            [
              "onmousedown",
              "onmouseup",
              "onkeydown",
              "onkeyup",
              "onsubmit",
              "onchange",
              "oninput",
              "onfocus",
              "onblur",
            ].some((U) => p.hasAttribute(U))
          )
            return !0;
        } catch {}
        return !!(Vn(p) || l.get(p)?.scrollable);
      }
      function Me(p, S, B, N) {
        if (!p.isInteractive) return !1;
        let U = !1;
        return (
          N ? (Mn(S) ? (U = !0) : (U = !1)) : (U = !0),
          U &&
          ((p.isInViewport = ce(S, s)),
          (p.isInViewport || s === -1) && ((p.highlightIndex = c++), r))
            ? (a >= 0
                ? a === p.highlightIndex && O(S, p.highlightIndex, B)
                : O(S, p.highlightIndex, B),
              !0)
            : !1
        );
      }
      function $e(p, S = null, B = !1) {
        if (
          !p ||
          p.id === x ||
          (p.nodeType !== Node.ELEMENT_NODE && p.nodeType !== Node.TEXT_NODE) ||
          !p ||
          p.id === x ||
          p.dataset?.browserUseIgnore === "true" ||
          p.dataset?.pageAgentIgnore === "true" ||
          (p.getAttribute && p.getAttribute("aria-hidden") === "true")
        )
          return null;
        if (p === document.body) {
          let T = { tagName: "body", attributes: {}, xpath: "/body", children: [] };
          for (let j of p.childNodes) {
            let W = $e(j, S, !1);
            W && T.children.push(W);
          }
          let Z = `${z.current++}`;
          return ((w[Z] = T), Z);
        }
        if (p.nodeType !== Node.ELEMENT_NODE && p.nodeType !== Node.TEXT_NODE) return null;
        if (p.nodeType === Node.TEXT_NODE) {
          let T = p.textContent?.trim();
          if (!T) return null;
          let Z = p.parentElement;
          if (!Z || Z.tagName.toLowerCase() === "script") return null;
          let j = `${z.current++}`;
          return ((w[j] = { type: "TEXT_NODE", text: T, isVisible: E(p) }), j);
        }
        if (p.nodeType === Node.ELEMENT_NODE && !D(p)) return null;
        if (s !== -1 && !p.shadowRoot) {
          let T = m(p),
            Z = g(p),
            j = Z && (Z.position === "fixed" || Z.position === "sticky"),
            W = p.offsetWidth > 0 || p.offsetHeight > 0;
          if (
            !T ||
            (!j &&
              !W &&
              (T.bottom < -s ||
                T.top > window.innerHeight + s ||
                T.right < -s ||
                T.left > window.innerWidth + s))
          )
            return null;
        }
        let N = { tagName: p.tagName.toLowerCase(), attributes: {}, children: [] };
        if (It(p) || p.tagName.toLowerCase() === "iframe" || p.tagName.toLowerCase() === "body") {
          let T = p.getAttributeNames?.() || [];
          for (let Z of T) {
            let j = p.getAttribute(Z);
            N.attributes[Z] = j;
          }
          p.tagName.toLowerCase() === "input" &&
            (p.type === "checkbox" || p.type === "radio") &&
            (N.attributes.checked = p.checked ? "true" : "false");
          // 红框必填/校验失败状态默认被白名单过滤，模型看不到；收集端标记后由渲染白名单放行
          try {
            if (p.closest(".is-error, .has-error, .ant-form-item-has-error, [aria-invalid='true']"))
              N.attributes["data-dsh-state"] = "error";
            else if (
              p.required ||
              p.hasAttribute("required") ||
              p.getAttribute("aria-required") === "true" ||
              p.closest(".el-form-item.is-required")
            )
              N.attributes["data-dsh-state"] = "required";
          } catch {}
        }
        let U = !1;
        if (p.nodeType === Node.ELEMENT_NODE && ((N.isVisible = R(p)), N.isVisible)) {
          N.isTopElement = pe(p);
          let T = p.getAttribute("role"),
            Z = T === "menu" || T === "menubar" || T === "listbox";
          if (
            (N.isTopElement || Z) &&
            ((N.isInteractive = be(p)),
            (U = Me(N, p, S, B)),
            (N.ref = p),
            N.isInteractive && Object.keys(N.attributes).length === 0)
          ) {
            let j = p.getAttributeNames?.() || [];
            for (let W of j) {
              let Ce = p.getAttribute(W);
              N.attributes[W] = Ce;
            }
          }
        }
        if (p.tagName) {
          let T = p.tagName.toLowerCase();
          if (T === "iframe")
            try {
              let Z = p.contentDocument || p.contentWindow?.document;
              if (Z)
                for (let j of Z.childNodes) {
                  let W = $e(j, p, !1);
                  W && N.children.push(W);
                }
            } catch (Z) {
              console.warn("Unable to access iframe:", Z);
            }
          else if (
            p.isContentEditable ||
            p.getAttribute("contenteditable") === "true" ||
            p.id === "tinymce" ||
            p.classList.contains("mce-content-body") ||
            (T === "body" && p.getAttribute("data-id")?.startsWith("mce_"))
          )
            for (let Z of p.childNodes) {
              let j = $e(Z, S, U);
              j && N.children.push(j);
            }
          else {
            if (p.shadowRoot) {
              N.shadowRoot = !0;
              for (let Z of p.shadowRoot.childNodes) {
                let j = $e(Z, S, U);
                j && N.children.push(j);
              }
            }
            for (let Z of p.childNodes) {
              let j = $e(Z, S, U || B);
              j && N.children.push(j);
            }
          }
        }
        if (N.tagName === "a" && N.children.length === 0 && !N.attributes.href) {
          let T = m(p);
          if (!((T && T.width > 0 && T.height > 0) || p.offsetWidth > 0 || p.offsetHeight > 0))
            return null;
        }
        N.extra = l.get(p) || null;
        let J = `${z.current++}`;
        return ((w[J] = N), J);
      }
      let ra = $e(document.body);
      return (d.clearCache(), { rootId: ra, map: w });
    },
    zS = J_({
      cleanUpHighlights: () => st,
      flatTreeToString: () => uh,
      getAllTextTillNextClickableElement: () => lh,
      getElementTextMap: () => fh,
      getFlatTree: () => ch,
      getSelectorMap: () => dh,
      resolveViewportExpansion: () => Cd,
    }),
    lw = -1;
  function Cd(e) {
    return e ?? lw;
  }
  var dw = new Set(["nav", "menu", "header", "footer", "aside", "dialog"]),
    oh = new WeakMap();
  function ch(e) {
    let n = Cd(e.viewportExpansion),
      i = [];
    for (let a of e.interactiveBlacklist || []) typeof a == "function" ? i.push(a()) : i.push(a);
    let o = [];
    for (let a of e.interactiveWhitelist || []) typeof a == "function" ? o.push(a()) : o.push(a);
    let t = uw({
        doHighlightElements: !0,
        debugMode: !0,
        focusHighlightIndex: -1,
        viewportExpansion: n,
        interactiveBlacklist: i,
        interactiveWhitelist: o,
        highlightOpacity: e.highlightOpacity ?? 0,
        highlightLabelOpacity: e.highlightLabelOpacity ?? 0.1,
      }),
      r = window.location.href;
    for (let a in t.map) {
      let s = t.map[a];
      if (s.isInteractive && s.ref) {
        let u = s.ref;
        oh.has(u) || (oh.set(u, r), (s.isNew = !0));
      }
    }
    return t;
  }
  var ah = new Map();
  function fw(e) {
    let n = ah.get(e);
    if (!n) {
      let i = e.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      ((n = new RegExp(`^${i.replace(/\*/g, ".*")}$`)), ah.set(e, n));
    }
    return n;
  }
  function mw(e, n) {
    let i = {};
    for (let o of n)
      if (o.includes("*")) {
        let t = fw(o);
        for (let r of Object.keys(e)) t.test(r) && e[r].trim() && (i[r] = e[r].trim());
      } else {
        let t = e[o];
        t && t.trim() && (i[o] = t.trim());
      }
    return i;
  }
  function uh(e, n = [], i = !1) {
    let o = [
        "title",
        "type",
        "checked",
        "name",
        "role",
        "value",
        "placeholder",
        "data-date-format",
        "data-dsh-state",
        "alt",
        "aria-label",
        "aria-expanded",
        "data-state",
        "aria-checked",
        "id",
        "for",
        "target",
        "aria-haspopup",
        "aria-controls",
        "aria-owns",
        "contenteditable",
      ],
      t = [...n, ...o],
      r = (d, m) => (d.length > m ? d.substring(0, m) + "..." : d),
      a = (d) => {
        let m = e.map[d];
        if (!m) return null;
        if (m.type === "TEXT_NODE") {
          let g = m;
          return { type: "text", text: g.text, isVisible: g.isVisible, parent: null, children: [] };
        } else {
          let g = m,
            $ = [];
          if (g.children)
            for (let w of g.children) {
              let z = a(w);
              z && ((z.parent = null), $.push(z));
            }
          return {
            type: "element",
            tagName: g.tagName,
            attributes: g.attributes ?? {},
            isVisible: g.isVisible ?? !1,
            isInteractive: g.isInteractive ?? !1,
            isTopElement: g.isTopElement ?? !1,
            isNew: g.isNew ?? !1,
            highlightIndex: g.highlightIndex,
            parent: null,
            children: $,
            extra: g.extra ?? {},
          };
        }
      },
      s = (d, m = null) => {
        d.parent = m;
        for (let g of d.children) s(g, d);
      },
      u = a(e.rootId);
    if (!u) return "";
    s(u);
    let c = (d) => {
        let m = d.parent;
        for (; m; ) {
          if (m.type === "element" && m.highlightIndex !== void 0) return !0;
          m = m.parent;
        }
        return !1;
      },
      l = (d, m, g) => {
        let $ = m,
          w = "	".repeat(m);
        if (d.type === "element") {
          let z = i && d.tagName && dw.has(d.tagName);
          if (d.highlightIndex !== void 0) {
            $ += 1;
            let I = lh(d),
              E = "";
            if (t.length > 0 && d.attributes) {
              let R = mw(d.attributes, t),
                be = Object.keys(R);
              if (be.length > 1) {
                let pe = new Set(),
                  ce = {};
                for (let ie of be) {
                  let de = R[ie];
                  de.length > 5 && (de in ce ? pe.add(ie) : (ce[de] = ie));
                }
                for (let ie of pe) delete R[ie];
              }
              R.role === d.tagName && delete R.role;
              // 无文本元素（如图标按钮）补 class 提示：Element-UI 日历翻月箭头等图标按钮没有文字/aria-label，
              // 只显示 <button type=button /> 模型无从分辨；取最后一个 class（最具体，如 el-date-picker__prev-btn）
              if (!I && !Object.keys(R).length && d.attributes?.class) {
                let Ok = String(d.attributes.class).split(/\s+/).filter(Boolean);
                if (Ok.length) R["class"] = Ok[Ok.length - 1];
              }
              for (let pe of ["aria-label", "placeholder", "title"])
                R[pe] && R[pe].toLowerCase().trim() === I.toLowerCase().trim() && delete R[pe];
              Object.keys(R).length > 0 &&
                (E = Object.entries(R)
                  .map(([pe, ce]) => `${pe}=${r(ce, 20)}`)
                  .join(" "));
            }
            let D = `${w}${d.isNew ? `*[${d.highlightIndex}]` : `[${d.highlightIndex}]`}<${d.tagName ?? ""}`;
            if ((E && (D += ` ${E}`), d.extra && d.extra.scrollable)) {
              let R = "";
              (d.extra.scrollData?.left && (R += `left=${d.extra.scrollData.left}, `),
                d.extra.scrollData?.top && (R += `top=${d.extra.scrollData.top}, `),
                d.extra.scrollData?.right && (R += `right=${d.extra.scrollData.right}, `),
                d.extra.scrollData?.bottom && (R += `bottom=${d.extra.scrollData.bottom}`),
                (D += ` data-scrollable="${R}"`));
            }
            if (I) {
              let R = I.trim();
              (E || (D += " "), (D += `>${R}`));
            } else E || (D += " ");
            ((D += " />"), g.push(D));
          }
          let x = z && d.highlightIndex === void 0,
            O = x ? g.length : -1;
          x && (g.push(`${w}<${d.tagName}>`), ($ += 1));
          for (let I of d.children) l(I, $, g);
          x && (g.length === O + 1 ? g.pop() : g.push(`${w}</${d.tagName}>`));
        } else if (d.type === "text") {
          if (c(d)) return;
          d.parent &&
            d.parent.type === "element" &&
            d.parent.isVisible &&
            d.parent.isTopElement &&
            g.push(`${w}${d.text ?? ""}`);
        }
      },
      f = [];
    return (
      l(u, 0, f),
      f.join(`
`)
    );
  }
  var lh = (e, n = -1) => {
    let i = [],
      o = (t, r) => {
        if (
          !(n !== -1 && r > n) &&
          !(t.type === "element" && t !== e && t.highlightIndex !== void 0)
        ) {
          if (t.type === "text" && t.text) i.push(t.text);
          else if (t.type === "element") for (let a of t.children) o(a, r + 1);
        }
      };
    return (
      o(e, 0),
      i
        .join(`
`)
        .trim()
    );
  };
  function dh(e) {
    let n = new Map(),
      i = Object.keys(e.map);
    for (let o of i) {
      let t = e.map[o];
      t.isInteractive && typeof t.highlightIndex == "number" && n.set(t.highlightIndex, t);
    }
    return n;
  }
  function fh(e) {
    let n = e
        .split(`
`)
        .map((o) => o.trim())
        .filter((o) => o.length > 0),
      i = new Map();
    for (let o of n) {
      let t = /^\[(\d+)\]<[^>]+>([^<]*)/.exec(o);
      if (t) {
        let r = parseInt(t[1], 10);
        i.set(r, o);
      }
    }
    return i;
  }
  function st() {
    let e = window._highlightCleanupFunctions || [];
    for (let n of e) typeof n == "function" && n();
    window._highlightCleanupFunctions = [];
  }
  window.addEventListener("popstate", () => {
    st();
  });
  window.addEventListener("hashchange", () => {
    st();
  });
  window.addEventListener("beforeunload", () => {
    st();
  });
  var Ud = window.navigation;
  if (Ud && typeof Ud.addEventListener == "function")
    Ud.addEventListener("navigate", () => {
      st();
    });
  else {
    let e = window.location.href;
    setInterval(() => {
      window.location.href !== e && ((e = window.location.href), st());
    }, 500);
  }
  function pw() {
    let e = window.innerWidth,
      n = window.innerHeight,
      i = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth || 0),
      o = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight || 0),
      t = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0,
      r = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0,
      a = Math.max(0, o - (window.innerHeight + r)),
      s = Math.max(0, i - (window.innerWidth + t));
    return {
      viewport_width: e,
      viewport_height: n,
      page_width: i,
      page_height: o,
      scroll_x: t,
      scroll_y: r,
      pixels_above: r,
      pixels_below: a,
      pages_above: n > 0 ? r / n : 0,
      pages_below: n > 0 ? a / n : 0,
      total_pages: n > 0 ? o / n : 0,
      current_page_position: r / Math.max(1, o - n),
      pixels_left: t,
      pixels_right: s,
    };
  }
  function gw(e) {
    let n = document.querySelectorAll(
      '[data-reactroot], [data-reactid], [data-react-checksum], #root, #app, [id^="root-"], [id^="app-"], #adex-wrapper, #adex-root',
    );
    for (let i of n) i.setAttribute("data-page-agent-not-interactive", "true");
  }
  var mh = class extends EventTarget {
    config;
    flatTree = null;
    selectorMap = new Map();
    elementTextMap = new Map();
    simplifiedHTML = "<EMPTY>";
    lastTimeUpdate = 0;
    isIndexed = !1;
    mask = null;
    maskReady = null;
    constructor(e = {}) {
      (super(), (this.config = e), gw(this), e.enableMask && this.initMask());
    }
    initMask() {
      this.maskReady === null &&
        (this.maskReady = (async () => {
          let { SimulatorMask: e } = await Promise.resolve().then(() => (nh(), th));
          this.mask = new e();
        })());
    }
    async getCurrentUrl() {
      return window.location.href;
    }
    async getLastUpdateTime() {
      return this.lastTimeUpdate;
    }
    async getBrowserState() {
      let e = window.location.href,
        n = document.title,
        i = pw(),
        o = Cd(this.config.viewportExpansion);
      await this.updateTree();
      let t = this.simplifiedHTML;
      return {
        url: e,
        title: n,
        header: `${`Current Page: [${n}](${e})`}
${`Page info: ${i.viewport_width}x${i.viewport_height}px viewport, ${i.page_width}x${i.page_height}px total page size, ${i.pages_above.toFixed(1)} pages above, ${i.pages_below.toFixed(1)} pages below, ${i.total_pages.toFixed(1)} total pages, at ${(i.current_page_position * 100).toFixed(0)}% of page`}

${o === -1 ? "Interactive elements from top layer of the current page (full page):" : "Interactive elements from top layer of the current page inside the viewport:"}

${i.pixels_above > 4 && o !== -1 ? `... ${i.pixels_above} pixels above (${i.pages_above.toFixed(1)} pages) - scroll to see more ...` : "[Start of page]"}`,
        content: t,
        footer:
          i.pixels_below > 4 && o !== -1
            ? `... ${i.pixels_below} pixels below (${i.pages_below.toFixed(1)} pages) - scroll to see more ...`
            : "[End of page]",
      };
    }
    async updateTree() {
      (this.dispatchEvent(new Event("beforeUpdate")),
        (this.lastTimeUpdate = Date.now()),
        this.mask && (this.mask.wrapper.style.pointerEvents = "none"),
        st());
      let e = [
        ...(this.config.interactiveBlacklist || []),
        ...Array.from(document.querySelectorAll("[data-page-agent-not-interactive]")),
      ];
      return (
        (this.flatTree = ch({ ...this.config, interactiveBlacklist: e })),
        (this.simplifiedHTML = uh(
          this.flatTree,
          this.config.includeAttributes,
          this.config.keepSemanticTags,
        )),
        this.selectorMap.clear(),
        (this.selectorMap = dh(this.flatTree)),
        this.elementTextMap.clear(),
        (this.elementTextMap = fh(this.simplifiedHTML)),
        (this.isIndexed = !0),
        this.mask && (this.mask.wrapper.style.pointerEvents = "auto"),
        this.dispatchEvent(new Event("afterUpdate")),
        this.simplifiedHTML
      );
    }
    async cleanUpHighlights() {
      (console.log("[PageController] cleanUpHighlights"), st());
    }
    assertIndexed() {
      if (!this.isIndexed)
        throw new Error("DOM tree not indexed yet. Can not perform actions on elements.");
    }
    async clickElement(e) {
      try {
        this.assertIndexed();
        let n = Br(this.selectorMap, e),
          i = this.elementTextMap.get(e);
        if (/^(返回|后退|back)/i.test(String(i ?? "").trim()))
          return {
            success: !1,
            message:
              "❌ 「返回/后退」类按钮已拦截：点击会离开当前页面、丢失已填内容，禁止点击。请继续当前页操作；确实需要离开时用 ask_user 与用户确认",
          };
        return (
          await sh(n),
          H_(n) && n.target === "_blank"
            ? {
                success: !0,
                message: `\u2705 Clicked element (${i ?? e}). \u26A0\uFE0F Link opened in a new tab.`,
              }
            : { success: !0, message: `\u2705 Clicked element (${i ?? e}).` }
        );
      } catch (n) {
        return { success: !1, message: `\u274C Failed to click element: ${n}` };
      }
    }
    async inputText(e, n) {
      try {
        this.assertIndexed();
        let i = Br(this.selectorMap, e),
          o = this.elementTextMap.get(e);
        if (
          i?.matches?.("input") &&
          (i.readOnly ||
            i.closest(
              ".el-date-editor,.el-select,.el-autocomplete,.el-cascader,.el-dropdown,[class*=datepicker],[class*=date-picker],[class*=DatePicker],[class*=select],[class*=dropdown]",
            ))
        )
          return {
            success: !1,
            message:
              "❌ 该字段是日期/下拉选择类组件（只读），直接输入文本赋不上值。必须先用 click 点击该字段展开面板/选项列表，再点击具体选项或日期格子完成选择（日期面板可用翻页箭头切换年月）",
          };
        return (
          await ow(i, n),
          { success: !0, message: `\u2705 Input text (${n}) into element (${o ?? e}).` }
        );
      } catch (i) {
        return { success: !1, message: `\u274C Failed to input text: ${i}` };
      }
    }
    async selectOption(e, n) {
      try {
        this.assertIndexed();
        let i = Br(this.selectorMap, e),
          o = this.elementTextMap.get(e);
        return (
          await aw(i, n),
          { success: !0, message: `\u2705 Selected option (${n}) in element (${o ?? e}).` }
        );
      } catch (i) {
        return { success: !1, message: `\u274C Failed to select option: ${i}` };
      }
    }
    async scroll(e) {
      try {
        let { down: n, numPages: i, pixels: o, index: t } = e;
        return (
          this.assertIndexed(),
          {
            success: !0,
            message: await sw(
              (o ?? i * window.innerHeight) * (n ? 1 : -1),
              t !== void 0 ? Br(this.selectorMap, t) : null,
            ),
          }
        );
      } catch (n) {
        return { success: !1, message: `\u274C Failed to scroll: ${n}` };
      }
    }
    async scrollHorizontally(e) {
      try {
        let { right: n, pixels: i, index: o } = e;
        return (
          this.assertIndexed(),
          {
            success: !0,
            message: await cw(i * (n ? 1 : -1), o !== void 0 ? Br(this.selectorMap, o) : null),
          }
        );
      } catch (n) {
        return { success: !1, message: `\u274C Failed to scroll horizontally: ${n}` };
      }
    }
    async executeJavascript(script, signal) {
      try {
        let asyncFunction = eval(`(async (signal) => { ${script} })`),
          result = await asyncFunction(signal);
        return { success: !0, message: `\u2705 Executed JavaScript. Result: ${result}` };
      } catch (e) {
        return { success: !1, message: `\u274C Error executing JavaScript: ${e}` };
      }
    }
    async showMask() {
      (await this.maskReady, this.mask?.show());
    }
    async hideMask() {
      (await this.maskReady, this.mask?.hide());
    }
    dispose() {
      (st(),
        (this.flatTree = null),
        this.selectorMap.clear(),
        this.elementTextMap.clear(),
        (this.simplifiedHTML = "<EMPTY>"),
        (this.isIndexed = !1),
        this.mask?.dispose(),
        (this.mask = null));
    }
  };
  window.PageAgentCore = Xg;
  window.PageController = mh;
  window.z = Yo;
})();
/*! Bundled license information:

ai-motion/build/Motion.js:
  (**
   * AI Motion - WebGL2 animated border with AI-style glow effects
   *
   * @author Simon<gaomeng1900@gmail.com>
   * @license MIT
   * @repository https://github.com/gaomeng1900/ai-motion
   *)
*/