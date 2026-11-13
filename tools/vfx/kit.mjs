// LAST WORLD's own effect painter: everything a skill effect is drawn with. No dependencies.
//
// The look, so every effect belongs to this game and to each other:
//   · cut paper, not glass: flat tones from a six-step ramp, a warm ink line round every solid shape
//   · light is separate from paint: `glow` and `add` only ever brighten, in a few hard steps
//   · the board is hexes, so rings, seals and shockwaves on the floor are hexagons
//   · sparks are streaks; debris is confetti: small squares that flip to diamonds as they tumble
import zlib from 'node:zlib';

export const TAU = Math.PI * 2;
export const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (k) => k * k * (3 - 2 * k);
export const out = (k) => 1 - (1 - k) ** 3;
export const bump = (k) => Math.sin(clamp(k) * Math.PI);
export const hash = (i, j = 0) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
export function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (lo, hi) => lo + (hi - lo) * f(); f.sign = () => (f() < 0.5 ? -1 : 1); f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}

// Six tones, shadow to white-hot. [2] and [3] are the element's own colour on the board.
const ramp = (...cs) => cs.map(hex);
export const INK = hex('#2b1b1e');
export const WHITE = [255, 255, 255];
export const RAMP = {
  fire: ramp('#5a1410', '#a8261a', '#e8521e', '#ff8a2a', '#ffd25a', '#fff6d8'),
  ice: ramp('#1c3466', '#2f64b0', '#4f9fe0', '#8fe0ff', '#c8f4ff', '#ffffff'),
  wind: ramp('#124a3c', '#1f7a58', '#3fb880', '#9affc0', '#d4ffe4', '#ffffff'),
  earth: ramp('#3a2416', '#6a4426', '#9c6e3a', '#d0a060', '#ecd09a', '#fff4dc'),
  holy: ramp('#7a4a12', '#c8861e', '#f2b632', '#ffe27a', '#fff4b8', '#ffffff'),
  shadow: ramp('#160a2c', '#32185e', '#5c2ea0', '#9458e6', '#c8a0ff', '#f0e4ff'),
  poison: ramp('#17380f', '#2f6a16', '#58a81e', '#a0f050', '#d8ff96', '#f8ffe0'),
  arcane: ramp('#221a5c', '#4630a8', '#7858e0', '#b094ff', '#dccdff', '#ffffff'),
  steel: ramp('#3a3440', '#6e6878', '#a8a4b0', '#dcdad8', '#f6f2e6', '#ffffff'),
  smoke: ramp('#3a302e', '#5c504a', '#84766c', '#aea092', '#d2c6b4', '#efe6d4'),
  blood: ramp('#3c0a14', '#7a1420', '#c02a2a', '#f05a3c', '#ffb07a', '#fff0d8'),
  leaf: ramp('#1c3a1a', '#2f6424', '#4f9434', '#86c850', '#c4ec84', '#f4ffd8'),
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export class Painter {
  constructor(w, h, ox, oy) { this.w = w; this.h = h; this.ox = ox; this.oy = oy; this.c = new Float32Array(w * h * 4); this.g = new Float32Array(w * h * 3); this.ni = new Uint8Array(w * h); this.ink = true; }
  clear() { this.c.fill(0); this.g.fill(0); this.ni.fill(0); this.ink = true; }
  raw(ix, iy, c, a = 1) {
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h || a <= 0) return;
    const i = (iy * this.w + ix) * 4, d = this.c, na = a + d[i + 3] * (1 - a);
    d[i] = (c[0] * a + d[i] * d[i + 3] * (1 - a)) / na; d[i + 1] = (c[1] * a + d[i + 1] * d[i + 3] * (1 - a)) / na; d[i + 2] = (c[2] * a + d[i + 2] * d[i + 3] * (1 - a)) / na; d[i + 3] = na;
    this.ni[iy * this.w + ix] = this.ink ? 0 : 1;
  }
  px(x, y, c, a = 1) { this.raw(Math.floor(x + this.ox), Math.floor(y + this.oy), c, a); }
  // a pixel that is either there or not: `a` is how often
  dot(x, y, c, a = 1) { const ix = Math.floor(x + this.ox), iy = Math.floor(y + this.oy); if (a >= BAYER[(iy & 3) * 4 + (ix & 3)]) this.raw(ix, iy, c, 1); }
  add(x, y, c, k = 1) { const ix = Math.floor(x + this.ox), iy = Math.floor(y + this.oy); if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return; const i = (iy * this.w + ix) * 3; this.g[i] += c[0] * k; this.g[i + 1] += c[1] * k; this.g[i + 2] += c[2] * k; }
  // every pixel centre in a local box: fn(x, y, ix, iy)
  each(x0, y0, x1, y1, fn) {
    const a = Math.max(0, Math.floor(x0 + this.ox)), b = Math.min(this.w - 1, Math.ceil(x1 + this.ox)), c = Math.max(0, Math.floor(y0 + this.oy)), d = Math.min(this.h - 1, Math.ceil(y1 + this.oy));
    for (let iy = c; iy <= d; iy++) for (let ix = a; ix <= b; ix++) fn(ix + 0.5 - this.ox, iy + 0.5 - this.oy, ix, iy);
  }
  put(ix, iy, c, a, dith) { if (dith) { if (a >= BAYER[(iy & 3) * 4 + (ix & 3)]) { const was = this.ink; this.ink = false; this.raw(ix, iy, c, 1); this.ink = was; } } else this.raw(ix, iy, c, a); } // a shape that is thinning out loses its ink line
  disc(x, y, r, c, a = 1, sy = 1) { if (r <= 0) return; this.each(x - r, y - r * sy, x + r, y + r * sy, (px, py, ix, iy) => { if ((px - x) ** 2 + ((py - y) / sy) ** 2 <= r * r) this.put(ix, iy, c, a, a < 1); }); }
  // a lit lump in three tones of a ramp, light from the upper left: smoke, flame, rock
  ball(x, y, r, tones, sy = 1, a = 1) {
    if (r < 0.8) { if (r > 0.3) this.px(x, y, tones[1]); return; }
    this.each(x - r, y - r * sy, x + r, y + r * sy, (px, py, ix, iy) => {
      const dx = (px - x) / r, dy = (py - y) / (r * sy); if (dx * dx + dy * dy > 1) return;
      const l = Math.hypot(dx + 0.38, dy + 0.42); this.put(ix, iy, l < 0.55 ? tones[2] : l < 1.05 ? tones[1] : tones[0], a, a < 1);
    });
  }
  diamond(x, y, r, c, a = 1) { this.each(x - r, y - r, x + r, y + r, (px, py, ix, iy) => { if (Math.abs(px - x) + Math.abs(py - y) <= r) this.put(ix, iy, c, a, a < 1); }); }
  // a ring; sy flattens it onto the floor; sides: 6 for a hexagon; keep(angle) to draw only part of it
  ring(x, y, r, th, c, a = 1, { sy = 1, sides = 0, rot = 0, keep = null } = {}) {
    if (r <= 0) return; const R1 = r + th;
    this.each(x - R1, y - R1 * sy, x + R1, y + R1 * sy, (px, py, ix, iy) => {
      const dx = px - x, dy = (py - y) / sy; let d = Math.hypot(dx, dy); const ang = Math.atan2(dy, dx);
      if (sides) { const s = TAU / sides; const q = (((ang - rot) % s) + s) % s; d *= Math.cos(q - s / 2) / Math.cos(s / 2); }
      if (Math.abs(d - r) > th / 2) return; if (keep && !keep(ang)) return;
      this.put(ix, iy, c, a, a < 1);
    });
  }
  // a filled floor shape (hexagon or circle), flattened by sy
  plate(x, y, r, c, a = 1, { sy = 1, sides = 0, rot = 0 } = {}) {
    this.each(x - r * 1.2, y - r * 1.2 * sy, x + r * 1.2, y + r * 1.2 * sy, (px, py, ix, iy) => {
      const dx = px - x, dy = (py - y) / sy; let d = Math.hypot(dx, dy);
      if (sides) { const s = TAU / sides; const q = (((Math.atan2(dy, dx) - rot) % s) + s) % s; d *= Math.cos(q - s / 2) / Math.cos(s / 2); }
      if (d <= r) this.put(ix, iy, c, a, a < 1);
    });
  }
  // a stroke that can taper: w0 wide at the start, w1 at the end
  line(x0, y0, x1, y1, c, a = 1, w0 = 1, w1 = w0) {
    const m = Math.max(w0, w1) / 2 + 1, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-6;
    this.each(Math.min(x0, x1) - m, Math.min(y0, y1) - m, Math.max(x0, x1) + m, Math.max(y0, y1) + m, (px, py, ix, iy) => {
      const u = clamp(((px - x0) * dx + (py - y0) * dy) / L2), d = Math.hypot(px - x0 - dx * u, py - y0 - dy * u);
      if (d <= Math.max(0.5, lerp(w0, w1, u) / 2)) this.put(ix, iy, c, a, a < 1);
    });
  }
  path(pts, c, a = 1, w = 1) { for (let i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, a, w); }
  poly(pts, c, a = 1) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    this.each(x0, y0, x1, y1, (px, py, ix, iy) => {
      let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside; }
      if (inside) this.put(ix, iy, c, a, a < 1);
    });
  }
  // a crescent: the outer edge is the circle, the body swells in the middle of the sweep (a blade's wake)
  arc(x, y, r, a0, a1, w, c, a = 1, { sy = 1, pow = 1, lead = 0, kf = null } = {}) { // kf(angle): the body's own thickness 0..1, for a sweep drawn in parts
    if (a1 < a0) [a0, a1] = [a1, a0]; const span = a1 - a0; if (span <= 0) return;
    this.each(x - r - 1, y - (r + 1) * sy, x + r + 1, y + (r + 1) * sy, (px, py, ix, iy) => {
      const dx = px - x, dy = (py - y) / sy, d = Math.hypot(dx, dy); if (d > r || d < r - w) return;
      let ang = Math.atan2(dy, dx); while (ang < a0) ang += TAU; while (ang > a0 + TAU) ang -= TAU; if (ang > a1) return;
      const u = (ang - a0) / span; const k = kf ? kf(ang) : lead ? Math.min(1, u / 0.85) ** pow * (u > 0.85 ? (1 - u) / 0.15 : 1) : Math.sin(u * Math.PI) ** pow; // lead: thickest at the leading end
      if (r - d <= w * k) this.put(ix, iy, c, a, a < 1);
    });
  }
  glow(x, y, r, c, k = 1, sy = 1) { if (r <= 0) return; this.each(x - r, y - r * sy, x + r, y + r * sy, (px, py) => { const d = Math.hypot(px - x, (py - y) / sy) / r; if (d < 1) this.add(px, py, c, k * (1 - d) * (1 - d)); }); }
  // a four-point glint
  star(x, y, arm, c, tip = c) {
    if (arm < 1) { this.px(x, y, c); return; } const was = this.ink; this.ink = false;
    for (let i = 1; i <= arm; i++) { const cc = i > arm * 0.55 ? tip : c; this.px(x + i, y, cc); this.px(x - i, y, cc); this.px(x, y + i, cc); this.px(x, y - i, cc); }
    if (arm >= 3) { this.px(x + 1, y + 1, tip); this.px(x - 1, y + 1, tip); this.px(x + 1, y - 1, tip); this.px(x - 1, y - 1, tip); }
    this.px(x, y, WHITE); this.ink = was;
  }
  // a jagged bolt between two points
  bolt(x0, y0, x1, y1, c, R, { jag = 6, steps = 6, w = 1, fork = 0, forkC = c } = {}) {
    const pts = [[x0, y0]]; const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
    for (let i = 1; i < steps; i++) { const u = i / steps, o = R.range(-jag, jag); pts.push([lerp(x0, x1, u) + (nx / L) * o, lerp(y0, y1, u) + (ny / L) * o]); }
    pts.push([x1, y1]); this.path(pts, c, 1, w);
    for (let i = 0; i < fork; i++) { const p = pts[1 + Math.floor(R() * (pts.length - 2))]; const a = Math.atan2(y1 - y0, x1 - x0) + R.range(-1.1, 1.1), l = R.range(5, 12); this.line(p[0], p[1], p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l, forkC, 1, 1); }
    return pts;
  }
  // paint + light → RGBA bytes, with the ink line drawn round solid shapes
  compose() {
    const { w, h, c, g, ni } = this; const o = new Uint8ClampedArray(w * h * 4);
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && c[(y * w + x) * 4 + 3] >= 0.6 && !ni[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, j = (y * w + x) * 3; let r = c[i], gg = c[i + 1], b = c[i + 2], a = c[i + 3];
      if (a < 0.3 && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) { r = INK[0]; gg = INK[1]; b = INK[2]; a = 0.9; }
      const gk = Math.max(g[j], g[j + 1], g[j + 2]) / 255;
      if (gk > 0.04) {
        const ga = Math.min(1, Math.round(Math.min(1, gk) * 5) / 5) * 0.85, n = Math.max(1, gk); const lr = Math.min(255, g[j] / Math.min(1, gk) / n * n), lg = Math.min(255, g[j + 1] / Math.min(1, gk)), lb = Math.min(255, g[j + 2] / Math.min(1, gk));
        if (a > 0.3 && !(r === INK[0] && gg === INK[1])) { r = Math.min(255, r + g[j] * 0.45); gg = Math.min(255, gg + g[j + 1] * 0.45); b = Math.min(255, b + g[j + 2] * 0.45); }
        else if (ga > 0) { const na = a + ga * (1 - a); r = (r * a + lr * ga * (1 - a)) / na; gg = (gg * a + lg * ga * (1 - a)) / na; b = (b * a + lb * ga * (1 - a)) / na; a = na; }
      }
      o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = a * 255;
    }
    return o;
  }
}

// Things that fly, fall, bounce and fade. kinds: spark · chip · puff · mote · ember · shard
export class Particles {
  constructor(ground = null) { this.a = []; this.ground = ground; }
  spawn(o) { this.a.push({ kind: 'spark', x: 0, y: 0, vx: 0, vy: 0, life: 0.5, age: 0, g: 0, drag: 0, s: 2, delay: 0, ramp: RAMP.fire, tone: 3, back: false, ph: this.a.length * 1.7, rot: 0, va: 0, ...o }); }
  // n particles thrown outward: o may be a function of (i, angle)
  burst(R, n, x, y, sp0, sp1, o, { a0 = 0, a1 = TAU, sy = 1 } = {}) {
    for (let i = 0; i < n; i++) { const a = R.range(a0, a1), sp = R.range(sp0, sp1); this.spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * sy, ...(typeof o === 'function' ? o(i, a) : o) }); }
  }
  update(dt) {
    for (const p of this.a) {
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.age += dt; p.vy += p.g * dt; if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.va * dt;
      if (this.ground != null && p.g > 0 && p.y > this.ground && p.vy > 0) { p.y = this.ground; p.vy *= -0.38; p.vx *= 0.55; p.va *= 0.5; if (Math.abs(p.vy) < 14) { p.vy = 0; p.g = 0; p.vx = 0; p.va = 0; } }
    }
    this.a = this.a.filter((p) => p.age < p.life);
  }
  draw(P, back = false) {
    for (const p of this.a) {
      if (p.delay > 0 || p.back !== back) continue; const k = p.age / p.life, r = p.ramp;
      if (p.kind === 'spark') {
        const sp = Math.hypot(p.vx, p.vy), l = Math.min(9, sp * 0.035) * (1 - k * 0.5), ux = sp ? p.vx / sp : 0, uy = sp ? p.vy / sp : 0;
        P.ink = false; P.line(p.x - ux * l, p.y - uy * l, p.x, p.y, r[k < 0.35 ? 4 : k < 0.7 ? 3 : 2], 1, 1); P.px(p.x, p.y, k < 0.5 ? r[5] : r[4]); P.ink = true;
        P.glow(p.x, p.y, 4, r[3], 0.5 * (1 - k));
      } else if (p.kind === 'chip') {
        const s = p.s * (1 - k * k); const c = r[p.tone];
        if (s < 1.2) P.px(p.x, p.y, c); else if (Math.floor(p.age * 9 + p.ph) % 2) P.diamond(p.x, p.y, s * 0.75, c); else P.each(p.x - s / 2, p.y - s / 2, p.x + s / 2 - 1, p.y + s / 2 - 1, (x, y, ix, iy) => P.raw(ix, iy, c, 1));
      } else if (p.kind === 'puff') {
        const s = p.s * Math.min(1, p.age / 0.07 + 0.3) * (1 - k * k * 0.55); const t = p.tone - (k > 0.55 ? 1 : 0); // swells fast, then thins away rather than shrinking to a bead
        P.ball(p.x, p.y, s, [r[Math.max(0, t - 1)], r[Math.max(0, t)], r[Math.min(5, t + 1)]], 1, k > 0.5 ? 1 - (k - 0.5) / 0.5 : 1);
      } else if (p.kind === 'mote') {
        P.ink = false; if (k < 0.85 || Math.floor(p.age * 20) % 2) P.px(p.x, p.y, r[k < 0.4 ? 5 : p.tone]); P.ink = true; P.add(p.x, p.y, r[3], 0.5 * (1 - k));
      } else if (p.kind === 'ember') {
        const x = p.x + Math.sin(p.age * 7 + p.ph) * 2; P.ink = false; P.px(x, p.y, r[k < 0.3 ? 5 : k < 0.65 ? 4 : 3]); if (p.s > 1.5 && k < 0.5) P.px(x, p.y - 1, r[4]); P.ink = true; P.add(x, p.y, r[3], 0.7 * (1 - k));
      } else if (p.kind === 'shard') {
        const s = p.s * (1 - k ** 3), ca = Math.cos(p.rot), sa = Math.sin(p.rot);
        P.poly([[p.x + ca * s, p.y + sa * s], [p.x - sa * s * 0.3, p.y + ca * s * 0.3], [p.x - ca * s * 0.6, p.y - sa * s * 0.6], [p.x + sa * s * 0.3, p.y - ca * s * 0.3]], r[p.tone]);
        P.ink = false; P.line(p.x, p.y, p.x + ca * s * 0.8, p.y + sa * s * 0.8, r[5], 1, 1); P.ink = true;
      }
    }
  }
}

// ───────── PNG ─────────
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
export function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
