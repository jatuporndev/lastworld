#!/usr/bin/env node
// Bakes the skill effects into sprite sheets: public/vfx/<name>.png and src/engine/vfxSheets.js.
//
//   node tools/bake-vfx.mjs [name ...]            bake everything, or only the named sheets
//   node tools/bake-vfx.mjs --look <dir> [name…]  also write <dir>/<name>.png: every frame, enlarged, on board colours
//
// The effects are this game's own, drawn by code in tools/vfx/effects.mjs with the painter in tools/vfx/kit.mjs.
// The game only ever loads the baked pictures (src/engine/pixfx.js plays them).
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { Painter, Particles, rng, encodePNG } from './vfx/kit.mjs';
import { FX } from './vfx/effects.mjs';

const args = process.argv.slice(2); let look = null; const li = args.indexOf('--look'); if (li >= 0) { look = args[li + 1]; args.splice(li, 2); }
const only = args; const bad = only.filter((n) => !FX[n]); if (bad.length) { console.error('no such effect:', bad.join(', ')); process.exit(1); }
const HERE = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(HERE, 'public/vfx'); const META = join(HERE, 'src/engine/vfxSheets.js');
const prev = existsSync(META) ? JSON.parse(readFileSync(META, 'utf8').replace(/^[^{]*/, '').replace(/;\s*$/, '')) : {};
mkdirSync(OUT, { recursive: true }); if (look) mkdirSync(look, { recursive: true });

const meta = {}; let bytes = 0;
for (const [name, m] of Object.entries(FX)) {
  if (only.length && !only.includes(name) && prev[name]) { meta[name] = prev[name]; continue; }
  const PAD = 70, w = m.w + PAD * 2, h = m.h + PAD * 2, { fps } = m; const p = new Painter(w, h, m.ox + PAD, m.oy + PAD); // room to spill: the sheet is trimmed to what was drawn
  let seed = 7; for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const events = []; const k = { R: rng(seed), ps: new Particles(m.floor ? 0 : null), at: (t, fn) => events.push({ t, fn }) };
  const draw = m.setup(k); events.sort((a, b) => a.t - b.t);
  const n = Math.round(m.dur * fps); const frames = []; let x0 = w, y0 = h, x1 = -1, y1 = -1, t = 0; const STEP = 1 / 120;
  for (let i = 0; i < n; i++) {
    const until = i / fps; while (t < until - 1e-9) { const d = Math.min(STEP, until - t); t += d; while (events.length && events[0].t <= t + 1e-9) events.shift().fn(); k.ps.update(d); }
    while (events.length && events[0].t <= t + 1e-9) events.shift().fn();
    p.clear(); draw(p, until); const px = p.compose(); frames.push(px);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) { console.error(name, 'drew nothing'); process.exit(1); }
  if (x0 === 0 || y0 === 0 || x1 === w - 1 || y1 === h - 1) console.warn(`  ! ${name} touches the edge of its canvas (${[x0, y0, w - 1 - x1, h - 1 - y1].join(' ')}): make it bigger`);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1; const cols = Math.max(1, Math.round(Math.sqrt((n * ch) / cw))); const rows = Math.ceil(n / cols);
  const W = cols * cw, H = rows * ch; const sheet = new Uint8ClampedArray(W * H * 4);
  frames.forEach((px, i) => { const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
    for (let y = 0; y < ch; y++) { const s = ((y + y0) * w + x0) * 4; sheet.set(px.subarray(s, s + cw * 4), ((cy + y) * W + cx) * 4); } });
  const png = encodePNG(W, H, sheet); writeFileSync(join(OUT, name + '.png'), png); bytes += png.length;
  meta[name] = { w: cw, h: ch, cols, rows, n, fps, ox: m.ox + PAD - x0, oy: m.oy + PAD - y0, px: m.px, ...(m.hit != null ? { hit: m.hit } : {}) };
  console.log(name.padEnd(14), `${cw}x${ch}`.padEnd(9), `${n}f`.padEnd(4), `${W}x${H}`.padEnd(10), (png.length / 1024).toFixed(0) + ' KB');
  if (look) { // every other frame, twice the size, on the two grounds the board has: grass and stone
    const Z = 2, pick = frames.filter((_, i) => i % 2 === 0), lc = Math.min(pick.length, Math.max(1, Math.floor(1500 / (cw * Z)))), lr = Math.ceil(pick.length / lc), LW = lc * cw * Z, LH = lr * ch * Z; const o = new Uint8ClampedArray(LW * LH * 4);
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const f = Math.floor(y / (ch * Z)) * lc + Math.floor(x / (cw * Z)); const bg = Math.floor(y / (ch * Z)) % 2 ? [92, 96, 104] : [122, 150, 92]; const i = (y * LW + x) * 4;
      let r = bg[0], g = bg[1], b = bg[2]; if (f < pick.length) { const s = ((Math.floor((y % (ch * Z)) / Z) + y0) * w + Math.floor((x % (cw * Z)) / Z) + x0) * 4, a = pick[f][s + 3] / 255; r = pick[f][s] * a + r * (1 - a); g = pick[f][s + 1] * a + g * (1 - a); b = pick[f][s + 2] * a + b * (1 - a); }
      o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = 255; }
    writeFileSync(join(look, name + '.png'), encodePNG(LW, LH, o));
  }
}
const body = Object.entries(meta).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
writeFileSync(META, `// Generated by tools/bake-vfx.mjs — do not edit by hand. One entry per sprite sheet in public/vfx.\nexport const SHEETS = {\n${body}\n};\n`);
console.log(`${Object.keys(meta).length} sheets, ${(bytes / 1048576).toFixed(1)} MB baked this run`);
