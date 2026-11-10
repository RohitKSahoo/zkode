"use client";

import * as React from "react";

/* ------------------------------------------------------------------ */
/*  Glass Prism Hero: a glass prism splits a beam of white light into  */
/*  a spectrum that falls across a dot grid. The cursor moves the      */
/*  light source, scrolling turns the prism and dims the light.        */
/*  Plain WebGL, no dependencies. Background and text colors come     */
/*  from the theme (bg-background / text-foreground).                  */
/* ------------------------------------------------------------------ */

export interface GlassPrismHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Headline drawn into the scene (the glass refracts it). Also rendered as a real <h1>. */
  headline: string;
  /** Small pill above the headline. */
  eyebrow?: React.ReactNode;
  /** Supporting line under the prism. */
  description?: React.ReactNode;
  /** Buttons or links under the description. */
  actions?: React.ReactNode;
  /** Accent for the eyebrow dot and the scroll hint. */
  accent?: string;
  /** Font for the headline. Make sure it is loaded on the page. */
  fontFamily?: string;
  fontWeight?: number;
  /** Turn the prism and dim the light while the page scrolls. */
  scrollRotate?: boolean;
  /** Labels for the scroll hint, or false to hide it. */
  scrollHint?: { rotate: string; back: string } | false;
}

export interface GlassPrismHeroHandle {
  /** Play the intro again. */
  replay: () => void;
}

const NR = 16; // wavelengths in the fan

const FS = `precision highp float;
#define NR ${NR}
uniform vec2 uRes;uniform float uDpr,uT,uDark,uFade,uTime;
uniform vec3 uBg,uFg;
uniform sampler2D uText;
uniform vec2 uV0,uV1,uV2;          // glass triangle (already shrunk by the corner radius)
uniform float uRound;
uniform vec2 uDepth;               // extrusion of the back face, for the 3D read
uniform vec2 uS,uE,uDir0;          // beam source, entry point, incoming direction
uniform vec2 uX[NR];uniform vec2 uD[NR];uniform float uOk[NR];uniform vec3 uC[NR];
uniform vec2 uShift;               // small drift of the view through the glass
uniform vec2 uC0;                  // prism centre
uniform float uHeadIn,uFanLen;     // intro: length of the incoming beam and of the fan

float sdTri(vec2 p,vec2 p0,vec2 p1,vec2 p2){
  vec2 e0=p1-p0,e1=p2-p1,e2=p0-p2,v0=p-p0,v1=p-p1,v2=p-p2;
  vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);
  vec2 pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);
  vec2 pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
  float s=sign(e0.x*e2.y-e0.y*e2.x);
  vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
  return -sqrt(d.x)*sign(d.y);
}
float prism(vec2 p){return sdTri(p,uV0,uV1,uV2)-uRound;}
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}

float dotMask(vec2 p){vec2 g=vec2(20.,13.);vec2 q=mod(p+vec2(6.,1.)+g*.5,g)-g*.5;return 1.-smoothstep(.45,1.15,length(q));}
vec3 scene(vec2 p){
  vec3 c=uBg;
  c=mix(c,uFg,(uDark>.5?.12:.14)*dotMask(p));
  float t=texture2D(uText,clamp(p/uRes,0.,1.)).a;
  return mix(c,uFg,t*.97);
}
/* incoming white beam + the spectrum fan, as rgb light */
vec3 beams(vec2 p,out float white){
  vec3 L=vec3(0.);white=0.;
  // incoming
  vec2 head=uS+uDir0*uHeadIn;
  float di=seg(p,uS,head);
  float wi=exp(-di*di/1.6)+.16*exp(-di*di/120.);
  white=wi;L+=vec3(wi);
  // fan
  for(int i=0;i<NR;i++){
    if(uOk[i]<.5)continue;
    vec2 q=p-uX[i];float t=dot(q,uD[i]);
    if(t<0.)continue;
    float d=abs(q.x*uD[i].y-q.y*uD[i].x);
    float w=1.2+t*.022;
    float f=(exp(-d*d/(w*w))+.22*exp(-d*d/(w*w*16.)))*smoothstep(uFanLen,uFanLen-120.,t)/(1.+t*.0011);
    L+=uC[i]*f*(2.4/float(NR));
  }
  return L*uFade;
}
/* faint rays travelling inside the glass */
vec3 inner(vec2 p){
  vec3 L=vec3(0.);
  if(uFanLen<=0.)return L;
  for(int i=0;i<NR;i++){if(uOk[i]<.5)continue;float d=seg(p,uE,uX[i]);L+=mix(vec3(1.),uC[i],.75)*exp(-d*d/3.)*(.9/float(NR));}
  float de=length(p-uE);L+=vec3(1.)*exp(-de*de/90.)*.55;
  return L*uFade;
}

void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;   // css px, y down
  float aa=.8/uDpr+.35;
  float dF=prism(p);
  // back face and the sides of the extruded prism
  float dH=dF;for(int k=1;k<=4;k++){dH=min(dH,prism(p-uDepth*float(k)*.25));}

  vec3 col;
  float wb;vec3 B=beams(p,wb);
  vec3 outside=scene(p);
  float dm=dotMask(p);
  if(uDark>.5){outside+=B*(.2+2.6*dm);}
  else{float I=max(B.r,max(B.g,B.b));vec3 hue=B/max(I,1e-4);hue=mix(hue,vec3(.32),wb/max(I,1e-4)*.9);outside=mix(outside,hue*.92,clamp(I*(.3+1.7*dm),0.,.85));}

  // side glass: a light, slightly shifted look through the depth
  vec3 side=scene(p-uDepth*.6)*(uDark>.5?.92:.97)+(uDark>.5?.028:-.015);
  if(uDark>.5)side+=B*.25;
  col=mix(side,outside,smoothstep(-aa,aa,dH));

  // front face
  if(dF<2.){
    float e=1.;
    vec2 g=vec2(prism(p+vec2(e,0.))-prism(p-vec2(e,0.)),prism(p+vec2(0.,e))-prism(p-vec2(0.,e)));g=g/max(length(g),1e-4);
    float bevel=16.;float h=clamp(-dF/bevel,0.,1.);float slope=pow(1.-h,1.6);
    vec3 N=normalize(vec3(g*slope*1.35,1.));
    vec2 off=-N.xy*30.-(p-uC0)*.22+uShift;
    vec3 refr=vec3(scene(p+off*1.).r,scene(p+off*1.07).g,scene(p+off*1.15).b);
    vec3 glass=refr*(uDark>.5?vec3(.9,.92,1.):vec3(.96,.97,1.))+(uDark>.5?.03:.0);
    // fresnel rim and a highlight on the bevel facing the light
    float fr=pow(1.-N.z,1.5);
    vec3 Ld=normalize(vec3(-uDir0,.9));vec3 H=normalize(Ld+vec3(0.,0.,1.));
    float sp=pow(max(dot(N,H),0.),48.);
    float band=exp(-pow(dot(p-uC0,vec2(.8,-.6))/(length(uV0-uC0)*.22)-.35,2.));
    vec3 iri=.5+.5*cos(6.2831*(dot(p-uC0,vec2(.004,.003))+vec3(0.,.33,.67)));
    glass+=vec3(1.)*(fr*.3+sp*.85+band*(uDark>.5?.05:.03))+iri*fr*(uDark>.5?.14:.08);
    if(uDark<.5)glass-=vec3(fr*.10);
    vec3 IN=inner(p);
    if(uDark>.5)glass+=IN;
    else{float I=max(IN.r,max(IN.g,IN.b));vec3 hue=IN/max(I,1e-4);hue=mix(vec3(.45),hue,clamp((I-min(IN.r,min(IN.g,IN.b)))/max(I,1e-4)*2.,0.,1.));glass=mix(glass,hue*.85,clamp(I*.7,0.,.7));}
    col=mix(glass,col,smoothstep(-aa,aa,dF));
  }

  // edges: front, back and connectors
  vec2 b0=uV0+uDepth,b1=uV1+uDepth,b2=uV2+uDepth;
  vec3 lineC=uDark>.5?vec3(1.):vec3(0.);
  float ef=abs(dF);float lf=1.-smoothstep(.0,aa*1.6,ef);
  float eb=min(min(seg(p,b0,b1),seg(p,b1,b2)),seg(p,b2,b0))-uRound;eb=abs(eb);float lb=1.-smoothstep(0.,aa*1.6,eb);
  float ec=min(min(seg(p,uV0+normalize(uV0-uC0)*uRound,b0+normalize(uV0-uC0)*uRound),seg(p,uV1+normalize(uV1-uC0)*uRound,b1+normalize(uV1-uC0)*uRound)),seg(p,uV2+normalize(uV2-uC0)*uRound,b2+normalize(uV2-uC0)*uRound));float lc=1.-smoothstep(.2,.2+aa*1.6,ec);
  col=mix(col,lineC,lb*(uDark>.5?.16:.14));
  col=mix(col,lineC,lc*(uDark>.5?.22:.18));
  col=mix(col,lineC,lf*(uDark>.5?.55:.45));
  gl_FragColor=vec4(col,1.);
}`;

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

/* wavelength (nm) to a saturated rgb; the blue band leans toward #3c2cff */
function spectrum(l: number): [number, number, number] {
  const g = (x: number, m: number, s: number) => Math.exp(-(((x - m) / s) ** 2));
  let r = g(l, 610, 55) + 0.35 * g(l, 415, 28), gg = g(l, 540, 50);
  const b = g(l, 455, 38), blue = g(l, 455, 22);
  r += blue * 0.12; gg -= blue * 0.1;
  const m = Math.max(r, gg, b, 1e-3);
  return [(r / m) * 0.9 + 0.1 * r, (gg / m) * 0.9 + 0.1 * gg, b / m];
}
const LAMBDA = Array.from({ length: NR }, (_, i) => 700 - i * (300 / (NR - 1)));
const IOR = LAMBDA.map((l) => 1.33 + 0.03 / (l / 1000) ** 2); // exaggerated Cauchy, so the fan opens wide
const COLORS = new Float32Array(LAMBDA.flatMap(spectrum));

type V2 = [number, number];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
const mul = (a: V2, s: number): V2 => [a[0] * s, a[1] * s];
const dot = (a: V2, b: V2) => a[0] * b[0] + a[1] * b[1];
const norm = (a: V2): V2 => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };

function hitEdges(o: V2, d: V2, V: V2[], skip: number) {
  let best: { t: number; k: number; p: V2 } | null = null;
  for (let k = 0; k < 3; k++) {
    if (k === skip) continue;
    const a = V[k], e = sub(V[(k + 1) % 3], a), den = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(den) < 1e-9) continue;
    const w = sub(a, o), t = (w[0] * e[1] - w[1] * e[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den;
    if (t > 1e-4 && u >= 0 && u <= 1 && (!best || t < best.t)) best = { t, k, p: add(o, mul(d, t)) };
  }
  return best;
}
function outward(V: V2[], k: number, C: V2): V2 {
  const a = V[k], b = V[(k + 1) % 3];
  let n = norm([b[1] - a[1], -(b[0] - a[0])]);
  if (dot(n, sub(a, C)) < 0) n = mul(n, -1);
  return n;
}
function refract(d: V2, n: V2, eta: number): V2 | null {
  const ci = -dot(n, d), k = 1 - eta * eta * (1 - ci * ci);
  if (k < 0) return null;
  return norm(add(mul(d, eta), mul(n, eta * ci - Math.sqrt(k))));
}

/* any CSS color (rgb, hsl, oklch, color-mix…) to linear 0..1 rgb via a 1px canvas */
function makeColorReader() {
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  return (css: string): [number, number, number] => {
    g.clearRect(0, 0, 1, 1); g.fillStyle = "#000"; g.fillStyle = css; g.fillRect(0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  };
}

export const GlassPrismHero = React.forwardRef<GlassPrismHeroHandle, GlassPrismHeroProps>(function GlassPrismHero(
  {
    headline,
    eyebrow,
    description,
    actions,
    accent = "#D71921",
    fontFamily = "var(--font-sans), Geist, ui-sans-serif, system-ui, sans-serif",
    fontWeight = 600,
    scrollRotate = true,
    scrollHint = { rotate: "Scroll to rotate & explore", back: "Scroll up" },
    className = "",
    style,
    ...rest
  },
  ref,
) {
  const outerRef = React.useRef<HTMLElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const copyRef = React.useRef<HTMLDivElement>(null);
  const hintRef = React.useRef<HTMLDivElement>(null);
  const hintLabelRef = React.useRef<HTMLSpanElement>(null);
  const restartRef = React.useRef<() => void>(() => {});
  const [ready, setReady] = React.useState(false);
  const [noGL, setNoGL] = React.useState(false);

  React.useImperativeHandle(ref, () => ({ replay: () => restartRef.current() }), []);

  React.useEffect(() => {
    const stage = stageRef.current, cv = canvasRef.current;
    if (!stage || !cv) return;
    const gl = cv.getContext("webgl", { antialias: false, premultipliedAlpha: false, alpha: false });
    if (!gl || gl.isContextLost()) { setNoGL(true); setReady(true); return; }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const shader = (type: number, src: string) => {
      const o = gl.createShader(type);
      if (!o) return null;
      gl.shaderSource(o, src); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); gl.deleteShader(o); return null; }
      return o;
    };
    const vs = shader(gl.VERTEX_SHADER, VS), fsh = shader(gl.FRAGMENT_SHADER, FS), pr = gl.createProgram();
    if (!vs || !fsh || !pr) { setNoGL(true); setReady(true); return; }
    gl.attachShader(pr, vs); gl.attachShader(pr, fsh);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { setNoGL(true); setReady(true); return; }
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const al = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
    const U: Record<string, WebGLUniformLocation | null> = {};
    ["uRes","uDpr","uT","uDark","uFade","uTime","uBg","uFg","uText","uV0","uV1","uV2","uRound","uDepth","uS","uE","uDir0","uX","uD","uOk","uC","uShift","uC0","uHeadIn","uFanLen"]
      .forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform3fv(U.uC, COLORS); gl.uniform1i(U.uText, 0);

    const readColor = makeColorReader();
    let textBottom = 0, W = 0, H = 0, DPR = 1, bg: [number, number, number] = [0, 0, 0], fg: [number, number, number] = [1, 1, 1], dark = true;
    const readTheme = () => {
      const cs = getComputedStyle(stage);
      bg = readColor(cs.backgroundColor); fg = readColor(cs.color);
      dark = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 0.5;
    };

    const drawText = () => {
      const c = document.createElement("canvas"); c.width = W * DPR; c.height = H * DPR;
      const g = c.getContext("2d")!; g.scale(DPR, DPR);
      const font = (px: number) => `${fontWeight} ${px}px ${fontFamily}`;
      const words = headline.split(/\s+/);
      let size = Math.min(W * 0.085, H * 0.14, 128), lines: string[] = [];
      for (;;) {
        g.font = font(size); try { (g as any).letterSpacing = `${-size * 0.05}px`; } catch {}
        lines = []; let cur = "";
        for (const w of words) { const t = cur ? cur + " " + w : w; if (g.measureText(t).width > W * 0.88 && cur) { lines.push(cur); cur = w; } else cur = t; }
        lines.push(cur);
        if ((lines.length <= 2 && lines.every((l) => g.measureText(l).width <= W * 0.9)) || size < 28) break;
        size *= 0.92;
      }
      g.font = font(size); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
      try { (g as any).letterSpacing = `${-size * 0.05}px`; } catch {}
      const lh = size, top = H * 0.29 - ((lines.length - 1) * lh) / 2;
      lines.forEach((l, i) => g.fillText(l, W / 2, top + i * lh));
      textBottom = top + (lines.length - 1) * lh + size * 0.36;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    };

    const resize = () => {
      const r = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height)); DPR = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * DPR; cv.height = H * DPR; gl.viewport(0, 0, cv.width, cv.height);
      drawText();
    };

    let src = 0.3, ang = 0, tilt: V2 = [0, 0], SCR = 0, t0 = performance.now(), isReady = false, readyTimer = 0;
    const mouse = { x: 0.5, y: 0.5, on: false };

    /* prism and light path, solved on the CPU with Snell's law for every wavelength */
    const geometry = () => {
      const R = Math.min(W * 0.15, H * 0.22, 200), C: V2 = [W * 0.5, Math.min(H * 0.56, Math.max(H * 0.46, textBottom + R * 0.72))], a = ang + 0.4;
      const V = [0, 1, 2].map((k) => { const t = a + (k * 2 * Math.PI) / 3; return [C[0] + R * Math.sin(t), C[1] - R * Math.cos(t)] as V2; });
      const rr = Math.max(4, R * 0.045);
      const Vs = V.map((v) => add(C, mul(sub(v, C), 1 - (2 * rr) / R)));
      const S: V2 = [-60, H * src], d0 = norm(sub([C[0] - R * 0.4, C[1] - R * 0.2], S));
      const h = hitEdges(S, d0, V, -1);
      const X: number[] = [], D: number[] = [], ok: number[] = [];
      for (let i = 0; i < NR; i++) {
        let good = 0, x: V2 = [0, 0], dir: V2 = [1, 0];
        if (h) {
          let d = refract(d0, outward(V, h.k, C), 1 / IOR[i]), o = h.p, skip = h.k;
          for (let b = 0; b < 4 && d; b++) {
            const g = hitEdges(o, d, V, skip); if (!g) break;
            const N = outward(V, g.k, C), t = refract(d, mul(N, -1), IOR[i]);
            if (t) { x = g.p; dir = t; good = 1; break; }
            d = norm(sub(d, mul(N, 2 * dot(d, N)))); o = g.p; skip = g.k; // total internal reflection
          }
        }
        X.push(...x); D.push(...dir); ok.push(good);
      }
      return { R, C, Vs, rr, S, d0, E: h ? h.p : C, X, D, ok };
    };

    const setCopy = () => {
      if (copyRef.current) copyRef.current.style.opacity = isReady ? String(Math.max(0, 1 - SCR * 1.6)) : "";
      if (hintRef.current && hintLabelRef.current && scrollHint) {
        const up = SCR > 0.85;
        hintRef.current.dataset.up = up ? "true" : "false";
        hintLabelRef.current.textContent = up ? scrollHint.back : scrollHint.rotate;
        hintRef.current.style.opacity = isReady ? String(up ? 1 : Math.max(0, 1 - SCR * 5)) : "0";
      }
    };
    const onScroll = () => {
      if (!scrollRotate || !outerRef.current) return;
      const r = outerRef.current.getBoundingClientRect();
      SCR = Math.min(1, Math.max(0, -r.top / (window.innerHeight * 0.7)));
      setCopy();
    };

    const restart = () => {
      if (scrollRotate && SCR > 0) outerRef.current?.scrollIntoView({ block: "start" });
      t0 = performance.now(); isReady = false; setReady(false); setCopy();
      window.clearTimeout(readyTimer);
      readyTimer = window.setTimeout(() => { isReady = true; setReady(true); setCopy(); }, reduce ? 0 : 1500);
    };
    restartRef.current = restart;

    let raf = 0, alive = true, visible = true, frameNo = 0;
    const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
    const frame = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      if (frameNo++ % 30 === 0) readTheme();
      const t = reduce ? 99 : (now - t0) / 1000;
      // the cursor moves the light source (y) and turns the prism a touch (x)
      const angT = (mouse.on ? (mouse.x - 0.5) * 0.2 : 0) + SCR * 1.35;
      const srcT = mouse.on ? 0.2 + Math.min(1, Math.max(0, mouse.y / 0.8)) * 0.3 : 0.3 + (reduce ? 0 : Math.sin(now / 1000 * 0.45) * 0.04);
      const tiltT: V2 = mouse.on ? [(mouse.x - 0.5) * 16, (mouse.y - 0.5) * 10] : [0, 0];
      ang += (angT - ang) * 0.06; src += (srcT - src) * 0.05;
      tilt = [tilt[0] + (tiltT[0] - tilt[0]) * 0.06, tilt[1] + (tiltT[1] - tilt[1]) * 0.06];
      const G = geometry();
      const L0 = Math.hypot(G.E[0] - G.S[0], G.E[1] - G.S[1]);
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, DPR); gl.uniform1f(U.uT, t); gl.uniform1f(U.uDark, dark ? 1 : 0);
      gl.uniform1f(U.uFade, (1 - SCR) * (reduce ? 1 : 0.96 + 0.04 * Math.sin((now / 1000) * 2.1))); gl.uniform1f(U.uTime, now / 1000);
      gl.uniform3fv(U.uBg, bg); gl.uniform3fv(U.uFg, fg);
      gl.uniform2fv(U.uV0, G.Vs[0]); gl.uniform2fv(U.uV1, G.Vs[1]); gl.uniform2fv(U.uV2, G.Vs[2]); gl.uniform1f(U.uRound, G.rr);
      gl.uniform2f(U.uDepth, G.R * 0.12 + tilt[0], -G.R * 0.13 + tilt[1]); gl.uniform2fv(U.uC0, G.C);
      gl.uniform2fv(U.uS, G.S); gl.uniform2fv(U.uE, G.E); gl.uniform2fv(U.uDir0, G.d0);
      gl.uniform2fv(U.uX, G.X); gl.uniform2fv(U.uD, G.D); gl.uniform1fv(U.uOk, G.ok);
      const sa = ang + 0.6; gl.uniform2f(U.uShift, Math.cos(sa) * G.R * 0.04, Math.sin(sa) * G.R * 0.03);
      gl.uniform1f(U.uHeadIn, L0 * ease(t / 0.9));
      gl.uniform1f(U.uFanLen, t < 0.9 ? 0 : Math.hypot(W, H) * 1.2 * ease((t - 0.9) / 1.4) + 120);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const move = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width; mouse.y = (e.clientY - r.top) / r.height; mouse.on = true;
    };
    const leave = () => { mouse.on = false; };
    let rt = 0;
    const ro = new ResizeObserver(() => { window.clearTimeout(rt); rt = window.setTimeout(resize, 120); });
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    const fontReady = document.fonts?.load ? document.fonts.load(`${fontWeight} 100px ${fontFamily}`).catch(() => []) : Promise.resolve([]);
    fontReady.then(() => {
      if (!alive) return;
      readTheme(); resize(); onScroll(); restart();
      ro.observe(stage); io.observe(stage);
      raf = requestAnimationFrame(frame);
    });

    return () => {
      alive = false; cancelAnimationFrame(raf); window.clearTimeout(readyTimer); window.clearTimeout(rt);
      ro.disconnect(); io.disconnect();
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", onScroll, { capture: true } as any);
      gl.deleteTexture(tex); gl.deleteBuffer(buf); gl.deleteProgram(pr); gl.deleteShader(vs); gl.deleteShader(fsh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headline, fontFamily, fontWeight, scrollRotate]);

  const fade = `transition-[opacity,transform] duration-1000 [transition-timing-function:cubic-bezier(.2,.9,.25,1)] ${ready ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0"}`;

  return (
    <section
      ref={outerRef}
      className={`relative w-full bg-background text-foreground ${className}`}
      style={{ height: scrollRotate ? "calc(100svh + 90vh)" : undefined, ...style }}
      {...rest}
    >
      <div ref={stageRef} className="sticky top-0 h-[100svh] min-h-[560px] w-full overflow-hidden bg-background text-foreground" style={{ fontFamily }}>
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />

        <h1
          className={noGL ? "absolute inset-x-0 top-[22vh] m-0 px-5 text-center text-[clamp(40px,8vw,112px)] font-semibold leading-none tracking-[-0.05em]" : "sr-only"}
        >
          {headline}
        </h1>

        <div ref={copyRef} className="pointer-events-none absolute inset-0">
          {eyebrow && (
            <div className={`absolute inset-x-0 top-[9vh] flex justify-center ${fade}`}>
              <span className="inline-flex h-[30px] items-center gap-2 rounded-none border border-border bg-muted/60 px-3 text-[13px] font-mono tracking-tight text-muted-foreground backdrop-blur-md">
                <i className="size-1.5 rounded-none" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
                {eyebrow}
              </span>
            </div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-end px-5 pb-[max(15vh,104px)] text-center">
            {description && (
              <p className={`m-0 max-w-[640px] text-[16px] sm:text-[18px] leading-[26px] tracking-[-0.02em] text-[#A1A1AA] font-sans ${fade} delay-100`}>{description}</p>
            )}
            {actions && <div className={`pointer-events-auto mt-[24px] flex flex-wrap justify-center gap-3 ${fade} delay-200`}>{actions}</div>}
          </div>
        </div>

        {scrollRotate && scrollHint && (
          <div
            ref={hintRef}
            aria-hidden="true"
            data-up="false"
            className="group/hint pointer-events-none absolute bottom-[22px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[11px] font-mono tracking-wider text-muted-foreground opacity-0 transition-opacity duration-700 uppercase"
          >
            <div className="relative h-[34px] w-[22px] rounded-none border-[1.5px] border-[#333333] transition-transform duration-500 group-data-[up=true]/hint:rotate-180">
              <span
                className="absolute left-1/2 top-[7px] -ml-[1.5px] h-[7px] w-[3px] rounded-none motion-safe:animate-[prism-wheel_1.8s_cubic-bezier(.6,0,.3,1)_infinite]"
                style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
              />
            </div>
            <span ref={hintLabelRef}>{scrollHint.rotate}</span>
          </div>
        )}
        <style>{`@keyframes prism-wheel{0%{transform:translateY(0);opacity:0}20%{opacity:1}70%{transform:translateY(10px);opacity:0}100%{opacity:0}}`}</style>
      </div>
    </section>
  );
});

export default GlassPrismHero;

