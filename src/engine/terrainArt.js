// Terrain Art — procedurally painted textures for the tabletop diorama look:
// hex top faces (with baked edge occlusion), layered side strata, table surfaces, water and waterfalls.
import * as THREE from 'three';
import { mulberry32, hashStr } from '../core/util.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function tone(n, amt) { // lighten (>0) or darken (<0) a 0xRRGGBB colour → css string
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; } else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
const rgba = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;

// terrain id → [top style, side style]
const STYLE = {
  grass: ['grass', 'earth'], forest: ['leaf', 'earth'], rock: ['stone', 'earth'], water: ['water', 'earth'], sea: ['water', 'earth'], islet: ['sand', 'sandstone'], swamp: ['mud', 'earth'], bloom: ['flowers', 'earth'],
  sand: ['sand', 'sandstone'], dune: ['dune', 'sandstone'], cactus: ['sand', 'sandstone'], quicksand: ['swirl', 'sandstone'],
  snow: ['snow', 'frost'], ice: ['ice', 'frost'], pine: ['snow', 'frost'], mountain: ['stone', 'frost'],
  crypt: ['flag', 'brick'], grave: ['gravedirt', 'brick'], pillar: ['flag', 'brick'], cursed: ['cursed', 'brick'], void: ['void', 'void'],
  star: ['marble', 'marble'], crystal: ['marble', 'marble'], holy: ['glyph', 'marble'],
  obsidian: ['obsidian', 'basalt'], lava: ['lava', 'basalt'], rift: ['rift', 'basalt'], spire: ['obsidian', 'basalt'],
  // stage-specific pieces
  bridge: ['planks', 'planks'], giant: ['leaf', 'earth'], ruinwall: ['flag', 'earth'], ruinfloor: ['flag', 'earth'],
  canyon: ['stone', 'sandstone'], oasis: ['water', 'sandstone'], palm: ['grass', 'sandstone'], oasisgrass: ['flowers', 'sandstone'],
  glacier: ['ice', 'frost'], icebridge: ['ice', 'frost'], plateau: ['snow', 'frost'],
  wall: ['flag', 'brick'], secret: ['rubble', 'brick'], tomb: ['flag', 'brick'],
  skybridge: ['light', 'marble'], dais: ['glyph', 'marble'],
  lavabridge: ['obsidian', 'basalt'], ritual: ['ritual', 'basalt'], rampart: ['obsidian', 'basalt'],
};
export const styleOf = (id) => STYLE[id] || STYLE.grass;

function makeTex(canvas, repeat = false) {
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

function blotches(g, R, S, col, n, a0, a1, r0, r1) {
  for (let i = 0; i < n; i++) {
    const x = R() * S, y = R() * S, r = r0 + R() * (r1 - r0);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, a0 + R() * (a1 - a0))); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
function speckle(g, R, S, css, n, s0 = 1, s1 = 2.5, a = 0.5) {
  g.fillStyle = css; for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.4 + R() * 0.6); const s = s0 + R() * (s1 - s0); g.fillRect(R() * S, R() * S, s, s); } g.globalAlpha = 1;
}
function cracks(g, R, S, css, n, lw = 1.4, len = 60) {
  g.strokeStyle = css; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    let x = R() * S, y = R() * S, a = R() * 6.28; g.lineWidth = lw * (0.6 + R() * 0.8); g.beginPath(); g.moveTo(x, y);
    const steps = 3 + (R() * 5 | 0);
    for (let k = 0; k < steps; k++) { a += (R() - 0.5) * 1.3; x += Math.cos(a) * len / steps * (0.6 + R()); y += Math.sin(a) * len / steps * (0.6 + R()); g.lineTo(x, y); }
    g.stroke();
  }
}
function flagstones(g, R, S, base, mortar) {
  g.fillStyle = mortar; g.fillRect(0, 0, S, S);
  const rows = 5; const rh = S / rows;
  for (let j = 0; j < rows; j++) {
    let x = -R() * 30;
    while (x < S) {
      const w = 34 + R() * 44; const d = (R() - 0.5) * 0.22;
      g.fillStyle = tone(base, d); g.beginPath(); g.roundRect(x + 2, j * rh + 2, w - 4, rh - 4, 5); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 4, j * rh + 3, w - 8, 3);
      g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x + 4, (j + 1) * rh - 7, w - 8, 3);
      x += w;
    }
  }
}

const topCache = new Map();
export function topTexture(id, T, variant = 0) {
  const key = id + ':' + variant; if (topCache.has(key)) return topCache.get(key);
  const S = 256; const [c, g] = canvas(S, S); const R = mulberry32(hashStr(key) + 17);
  const base = T.top; const [style] = styleOf(id);
  g.fillStyle = hex(base); g.fillRect(0, 0, S, S);
  const dark = (a) => tone(base, -a), light = (a) => tone(base, a);
  switch (style) {
    case 'grass': case 'leaf': case 'flowers': {
      blotches(g, R, S, 0x0a2a08, 14, 0.08, 0.22, 18, 50); blotches(g, R, S, 0xe8f08a, 10, 0.05, 0.16, 16, 44);
      g.lineCap = 'round';
      for (let i = 0; i < 900; i++) { const x = R() * S, y = R() * S, l = 4 + R() * 7; g.strokeStyle = R() < 0.5 ? light(0.1 + R() * 0.28) : dark(0.1 + R() * 0.3); g.globalAlpha = 0.55 + R() * 0.4; g.lineWidth = 1 + R() * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 4, y - l); g.stroke(); }
      g.globalAlpha = 1;
      if (style === 'leaf') { for (let i = 0; i < 46; i++) { g.fillStyle = ['#8a5a22', '#b0742a', '#6a4a1e', '#c99a3a', '#4a3a1a'][R() * 5 | 0]; g.globalAlpha = 0.75; g.beginPath(); g.ellipse(R() * S, R() * S, 3 + R() * 3, 1.6 + R() * 1.5, R() * 3.14, 0, 6.3); g.fill(); } g.globalAlpha = 1; blotches(g, R, S, 0x1a1408, 8, 0.12, 0.25, 20, 46); }
      const nf = style === 'flowers' ? 70 : variant ? 10 : 3;
      for (let i = 0; i < nf; i++) { const x = R() * S, y = R() * S; g.fillStyle = ['#fff4c0', '#ffb0d8', '#b8e0ff', '#ffe060', '#ffffff'][R() * 5 | 0]; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.257) * 2.6, y + Math.sin(k * 1.257) * 2.6, 1.9, 0, 6.3); g.fill(); } g.fillStyle = '#e0902a'; g.beginPath(); g.arc(x, y, 1.5, 0, 6.3); g.fill(); }
      break;
    }
    case 'mud': {
      blotches(g, R, S, 0x1a1608, 16, 0.15, 0.3, 16, 44); speckle(g, R, S, light(0.2), 300);
      for (let i = 0; i < 7; i++) { const x = 40 + R() * 176, y = 40 + R() * 176, rx = 12 + R() * 22, ry = 8 + R() * 14; g.fillStyle = 'rgba(40,70,50,0.75)'; g.beginPath(); g.ellipse(x, y, rx, ry, R() * 3, 0, 6.3); g.fill(); g.strokeStyle = 'rgba(190,220,150,0.35)'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = 'rgba(200,240,170,0.5)'; g.beginPath(); g.arc(x - rx * 0.3, y - ry * 0.2, 2, 0, 6.3); g.fill(); }
      break;
    }
    case 'stone': { blotches(g, R, S, 0x000000, 12, 0.08, 0.2, 20, 50); blotches(g, R, S, 0xffffff, 10, 0.05, 0.14, 16, 40); speckle(g, R, S, dark(0.35), 500); speckle(g, R, S, light(0.3), 300); cracks(g, R, S, dark(0.5), 14, 1.6, 70); break; }
    case 'sand': case 'dune': case 'swirl': {
      blotches(g, R, S, 0x6a3a08, 10, 0.05, 0.14, 20, 60); blotches(g, R, S, 0xfff0c0, 10, 0.06, 0.16, 20, 50); speckle(g, R, S, dark(0.3), 700, 1, 2, 0.45); speckle(g, R, S, light(0.35), 500, 1, 2, 0.5);
      if (style === 'swirl') { g.lineWidth = 3; for (let r = 12; r < 120; r += 13) { g.strokeStyle = r % 26 ? dark(0.22) : light(0.2); g.globalAlpha = 0.6; g.beginPath(); g.arc(128 + Math.sin(r) * 4, 128 + Math.cos(r) * 4, r, r * 0.3, r * 0.3 + 5.2); g.stroke(); } g.globalAlpha = 1; blotches(g, R, S, 0x2a1804, 1, 0.5, 0.5, 60, 60); }
      else { const n = style === 'dune' ? 15 : 8; for (let i = 0; i < n; i++) { const y = (i + 0.5) * S / n; g.strokeStyle = i % 2 ? dark(0.16) : light(0.22); g.globalAlpha = style === 'dune' ? 0.7 : 0.4; g.lineWidth = style === 'dune' ? 4 : 2.5; g.beginPath(); for (let x = -10; x <= S + 10; x += 12) g.lineTo(x, y + Math.sin(x * 0.045 + i * 1.7) * 7); g.stroke(); } g.globalAlpha = 1; }
      break;
    }
    case 'snow': { blotches(g, R, S, 0x7a9ac8, 14, 0.08, 0.22, 20, 56); blotches(g, R, S, 0xffffff, 16, 0.2, 0.5, 14, 40); speckle(g, R, S, '#ffffff', 260, 1, 2.2, 0.9); for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(120,150,200,0.22)'; g.lineWidth = 3; g.beginPath(); const y = R() * S; for (let x = 0; x <= S; x += 16) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 10); g.stroke(); } break; }
    case 'ice': { blotches(g, R, S, 0xffffff, 12, 0.1, 0.3, 20, 60); blotches(g, R, S, 0x2a6aa0, 10, 0.08, 0.2, 20, 60); g.lineCap = 'round'; for (let i = 0; i < 26; i++) { const x = R() * S, y = R() * S, l = 20 + R() * 60; g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1 + R() * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y - l * 0.6); g.stroke(); } cracks(g, R, S, 'rgba(255,255,255,0.75)', 9, 1.2, 80); cracks(g, R, S, 'rgba(30,80,130,0.4)', 6, 1, 60); break; }
    case 'flag': case 'cursed': case 'gravedirt': {
      if (style === 'gravedirt') { blotches(g, R, S, 0x000000, 14, 0.1, 0.28, 16, 46); speckle(g, R, S, light(0.25), 400); speckle(g, R, S, dark(0.4), 400); for (let i = 0; i < 120; i++) { g.strokeStyle = 'rgba(90,120,70,0.6)'; g.lineWidth = 1.3; const x = R() * S, y = R() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - 5 - R() * 4); g.stroke(); } }
      else { flagstones(g, R, S, base, dark(0.62)); speckle(g, R, S, dark(0.4), 300); cracks(g, R, S, dark(0.6), 6, 1.2, 50); blotches(g, R, S, 0x3a5a2a, 5, 0.1, 0.2, 14, 30); }
      if (style === 'cursed') { blotches(g, R, S, 0x7a20c0, 1, 0.5, 0.5, 110, 110); g.strokeStyle = 'rgba(210,130,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 62, 0, 6.3); g.stroke(); g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * 2.094 * 2; g.lineTo(128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60); } g.closePath(); g.stroke(); g.beginPath(); g.arc(128, 128, 20, 0, 6.3); g.stroke(); }
      break;
    }
    case 'planks': {
      const n = 7, bh = S / n;
      for (let i = 0; i < n; i++) { g.fillStyle = tone(base, (R() - 0.5) * 0.3); g.fillRect(0, i * bh, S, bh); for (let k = 0; k < 9; k++) { g.strokeStyle = 'rgba(40,20,5,' + (0.12 + R() * 0.2) + ')'; g.lineWidth = 1 + R(); const y = i * bh + R() * bh; g.beginPath(); for (let x = 0; x <= S; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + k) * 2); g.stroke(); } g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, i * bh, S, 3); g.fillStyle = 'rgba(255,240,200,0.12)'; g.fillRect(0, i * bh + 3, S, 2); for (const x of [40, 128, 216]) { g.fillStyle = '#2a1a0c'; g.beginPath(); g.arc(x + (R() - 0.5) * 20, i * bh + bh / 2, 2.5, 0, 6.3); g.fill(); } }
      break;
    }
    case 'rubble': { flagstones(g, R, S, base, dark(0.7)); blotches(g, R, S, 0x000000, 14, 0.2, 0.4, 20, 50); cracks(g, R, S, 'rgba(0,0,0,0.85)', 22, 2.2, 70); speckle(g, R, S, light(0.35), 500, 2, 5, 0.6); break; }
    case 'light': {
      g.fillStyle = '#ffe9a0'; g.fillRect(0, 0, S, S); blotches(g, R, S, 0xffffff, 1, 0.95, 0.95, 120, 120);
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.5; for (let i = -S; i < S * 2; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke(); g.beginPath(); g.moveTo(i, S); g.lineTo(i + S, 0); g.stroke(); }
      g.strokeStyle = 'rgba(214,150,30,0.9)'; g.lineWidth = 5; g.beginPath(); g.arc(128, 128, 100, 0, 6.3); g.stroke();
      break;
    }
    case 'ritual': {
      flagstones(g, R, S, base, dark(0.6)); blotches(g, R, S, 0xff3010, 1, 0.6, 0.6, 115, 115);
      g.strokeStyle = 'rgba(255,150,90,0.95)'; g.lineWidth = 4; g.beginPath(); g.arc(128, 128, 78, 0, 6.3); g.stroke(); g.beginPath(); g.arc(128, 128, 66, 0, 6.3); g.stroke();
      g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= 5; k++) { const an = k * 2 * 1.2566 - 1.5708; g.lineTo(128 + Math.cos(an) * 64, 128 + Math.sin(an) * 64); } g.stroke();
      for (let k = 0; k < 10; k++) { const an = k * 0.628; g.fillStyle = 'rgba(255,200,140,0.9)'; g.fillRect(128 + Math.cos(an) * 72 - 2, 128 + Math.sin(an) * 72 - 4, 4, 8); }
      break;
    }
    case 'void': { g.fillStyle = '#05040a'; g.fillRect(0, 0, S, S); blotches(g, R, S, 0x4a2a8a, 8, 0.1, 0.25, 30, 80); speckle(g, R, S, '#c8b8ff', 90, 1, 2, 0.9); break; }
    case 'marble': case 'glyph': {
      blotches(g, R, S, 0x6a62b0, 10, 0.06, 0.18, 24, 60); blotches(g, R, S, 0xffffff, 10, 0.1, 0.3, 20, 50);
      for (let i = 0; i < 12; i++) { g.strokeStyle = i % 3 ? 'rgba(90,84,150,0.32)' : 'rgba(255,255,255,0.5)'; g.lineWidth = 1 + R() * 2; g.beginPath(); let x = R() * S, y = 0; g.moveTo(x, y); while (y < S) { y += 14; x += (R() - 0.5) * 26; g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = 'rgba(214,170,60,0.75)'; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 96, 0, 6.3); g.stroke(); speckle(g, R, S, '#fff6c0', 40, 1.5, 3, 0.9);
      if (style === 'glyph') { blotches(g, R, S, 0xffe070, 1, 0.55, 0.55, 100, 100); g.strokeStyle = 'rgba(190,130,20,0.95)'; g.lineWidth = 4; g.beginPath(); g.arc(128, 128, 58, 0, 6.3); g.stroke(); g.beginPath(); for (let k = 0; k <= 8; k++) { const a = k * 3 * 0.7854 - 1.5708; g.lineTo(128 + Math.cos(a) * 56, 128 + Math.sin(a) * 56); } g.stroke(); }
      break;
    }
    case 'obsidian': {
      g.fillStyle = tone(base, 0.2); g.fillRect(0, 0, S, S); blotches(g, R, S, 0x000000, 10, 0.1, 0.22, 20, 60);
      for (let i = 0; i < 26; i++) { const x = R() * S, y = R() * S; g.fillStyle = `rgba(255,255,255,${0.03 + R() * 0.07})`; g.beginPath(); for (let k = 0; k < 4; k++) g.lineTo(x + (R() - 0.5) * 70, y + (R() - 0.5) * 70); g.closePath(); g.fill(); }
      cracks(g, R, S, 'rgba(0,0,0,0.7)', 10, 1.5, 70); cracks(g, R, S, 'rgba(255,110,30,0.55)', 4, 1.6, 60); speckle(g, R, S, '#8a7a9a', 120, 1, 2, 0.5);
      break;
    }
    case 'lava': {
      g.fillStyle = '#ffb030'; g.fillRect(0, 0, S, S); blotches(g, R, S, 0xff3a00, 20, 0.3, 0.6, 20, 50); blotches(g, R, S, 0xfff2a0, 10, 0.3, 0.6, 10, 26);
      for (let i = 0; i < 16; i++) { const x = R() * S, y = R() * S, r = 14 + R() * 24; g.fillStyle = `rgba(${40 + R() * 30 | 0},10,6,0.9)`; g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; g.lineTo(x + Math.cos(a) * r * (0.6 + R() * 0.5), y + Math.sin(a) * r * (0.6 + R() * 0.5)); } g.closePath(); g.fill(); }
      break;
    }
    case 'rift': { g.fillStyle = '#1a0626'; g.fillRect(0, 0, S, S); blotches(g, R, S, 0xb040ff, 1, 0.9, 0.9, 120, 120); blotches(g, R, S, 0xffb0ff, 1, 0.9, 0.9, 40, 40); g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.strokeStyle = 'rgba(230,160,255,0.55)'; g.beginPath(); for (let t = 0; t < 40; t++) { const a = k * 1.257 + t * 0.16, r = 6 + t * 2.8; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.stroke(); } break; }
    default: break;
  }
  // baked ambient occlusion toward the hex rim + soft top-left light
  let gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, 'rgba(255,250,220,0.10)'); gr.addColorStop(1, 'rgba(0,0,20,0.14)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
  gr = g.createRadialGradient(128, 128, 72, 128, 128, 130); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.72, 'rgba(0,0,0,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  const t = makeTex(c); topCache.set(key, t); return t;
}

const sideCache = new Map();
export function sideTexture(id, T) {
  if (sideCache.has(id)) return sideCache.get(id);
  const W = 768, H = 192; const [c, g] = canvas(W, H); const R = mulberry32(hashStr('side' + id));
  const [, style] = styleOf(id); const top = T.top;
  const band = (y0, y1, css) => { g.fillStyle = css; g.fillRect(0, y0, W, y1 - y0); };
  const ragged = (y, amp, css, down = true) => { g.fillStyle = css; g.beginPath(); g.moveTo(0, down ? 0 : H); for (let x = 0; x <= W; x += 8) g.lineTo(x, y + (R() - 0.3) * amp); g.lineTo(W, down ? 0 : H); g.closePath(); g.fill(); };
  const strata = (y0, y1, n, cols) => { const hgt = (y1 - y0) / n; for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(0, y0 + i * hgt); for (let x = 0; x <= W; x += 24) g.lineTo(x, y0 + i * hgt + Math.sin(x * 0.02 + i * 2) * 3); g.lineTo(W, y1); g.lineTo(0, y1); g.fill(); } };
  switch (style) {
    case 'earth': {
      strata(0, 110, 3, ['#6a4a2a', '#5a3d22', '#4c331c']); band(110, H, '#5c5a58');
      ragged(112, 14, '#4c331c'); speckle(g, R, W, '#2a1a0c', 500, 1, 3, 0.5); speckle(g, R, W, '#a08058', 300, 1, 3, 0.5);
      for (let i = 0; i < 40; i++) { g.fillStyle = ['#8a8680', '#6e6a66', '#9a958c'][R() * 3 | 0]; g.beginPath(); g.ellipse(R() * W, 40 + R() * 70, 3 + R() * 6, 2 + R() * 4, 0, 0, 6.3); g.fill(); }
      g.save(); g.translate(0, 112); cracks(g, R, W, 'rgba(0,0,0,0.5)', 40, 1.5, 40); g.restore();
      for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(40,24,10,0.6)'; g.lineWidth = 1.5; const x = R() * W; g.beginPath(); g.moveTo(x, 20); g.quadraticCurveTo(x + (R() - 0.5) * 20, 50, x + (R() - 0.5) * 26, 60 + R() * 40); g.stroke(); }
      ragged(22, 16, tone(top, -0.28)); ragged(15, 12, hex(top)); ragged(6, 4, tone(top, 0.18));
      break;
    }
    case 'sandstone': { strata(0, H, 8, ['#c99a58', '#b8843f', '#d6aa66', '#a87636', '#c08e4a']); speckle(g, R, W, '#7a5222', 600, 1, 3, 0.4); speckle(g, R, W, '#f0d6a0', 400, 1, 3, 0.4); cracks(g, R, W, 'rgba(70,40,10,0.45)', 30, 1.4, 50); ragged(12, 8, hex(top)); ragged(5, 4, tone(top, 0.2)); break; }
    case 'frost': {
      strata(0, 100, 3, ['#6f7888', '#5c6676', '#525b6a']); band(100, H, '#7a9cc0'); ragged(102, 12, '#525b6a');
      for (let i = 0; i < 46; i++) { const x = R() * W; g.fillStyle = 'rgba(200,235,255,0.5)'; g.beginPath(); g.moveTo(x, 104 + R() * 20); g.lineTo(x + 5 + R() * 8, H); g.lineTo(x - 5 - R() * 8, H); g.fill(); }
      speckle(g, R, W, '#ffffff', 400, 1, 3, 0.5); cracks(g, R, W, 'rgba(20,40,70,0.4)', 30, 1.3, 40);
      ragged(26, 18, '#c4d6ea'); ragged(18, 14, hex(top)); ragged(7, 5, '#ffffff');
      for (let i = 0; i < 26; i++) { const x = R() * W, l = 10 + R() * 26; g.fillStyle = 'rgba(225,245,255,0.9)'; g.beginPath(); g.moveTo(x - 3, 20); g.lineTo(x + 3, 20); g.lineTo(x, 20 + l); g.fill(); }
      break;
    }
    case 'brick': {
      band(0, H, '#1a161e'); const rows = 6, rh = H / rows;
      for (let j = 0; j < rows; j++) { let x = (j % 2) * -30 - R() * 10; while (x < W) { const w = 46 + R() * 30; g.fillStyle = tone(0x5a5462, (R() - 0.5) * 0.3 - j * 0.03); g.beginPath(); g.roundRect(x + 2, j * rh + 2, w - 4, rh - 4, 3); g.fill(); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 3, j * rh + 3, w - 6, 3); x += w; } }
      speckle(g, R, W, '#000000', 500, 1, 3, 0.35); cracks(g, R, W, 'rgba(0,0,0,0.6)', 24, 1.4, 40); blotches(g, R, W, 0x4a7a3a, 26, 0.12, 0.3, 8, 22);
      band(0, 10, tone(top, 0.12)); ragged(12, 5, hex(top));
      break;
    }
    case 'marble': {
      band(0, H, '#b8b2d8'); const rows = 3, rh = H / rows;
      for (let j = 0; j < rows; j++) { let x = (j % 2) * -50; while (x < W) { const w = 100; g.fillStyle = tone(0xcfc9ea, (R() - 0.5) * 0.14 - j * 0.07); g.fillRect(x + 1.5, j * rh + 1.5, w - 3, rh - 3); x += w; } }
      for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(100,92,160,0.3)'; g.lineWidth = 1 + R() * 1.5; g.beginPath(); let x = R() * W, y = 0; g.moveTo(x, y); while (y < H) { y += 16; x += (R() - 0.5) * 22; g.lineTo(x, y); } g.stroke(); }
      band(14, 24, '#d6aa3c'); band(16, 18, '#fff0a0'); band(0, 14, hex(top));
      for (let x = 16; x < W; x += 64) { g.fillStyle = '#d6aa3c'; g.beginPath(); g.moveTo(x, 34); g.lineTo(x + 7, 44); g.lineTo(x, 54); g.lineTo(x - 7, 44); g.fill(); }
      break;
    }
    case 'basalt': {
      band(0, H, '#191418');
      for (let x = 0; x < W;) { const w = 14 + R() * 20; g.fillStyle = tone(0x2e2630, (R() - 0.5) * 0.4); g.fillRect(x + 1, 0, w - 2, H); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x + 1, 0, 2, H); x += w; }
      cracks(g, R, W, 'rgba(0,0,0,0.7)', 30, 1.5, 40);
      for (let i = 0; i < 24; i++) { const x = R() * W; const gr = g.createLinearGradient(0, 90, 0, H); gr.addColorStop(0, 'rgba(255,90,20,0)'); gr.addColorStop(1, 'rgba(255,140,40,0.9)'); g.strokeStyle = gr; g.lineWidth = 1.5 + R() * 2; g.beginPath(); g.moveTo(x, 80 + R() * 40); g.lineTo(x + (R() - 0.5) * 16, 140); g.lineTo(x + (R() - 0.5) * 24, H); g.stroke(); }
      ragged(10, 6, hex(top));
      break;
    }
    case 'planks': {
      for (let x = 0; x < W;) { const w = 26 + R() * 18; g.fillStyle = tone(top, (R() - 0.5) * 0.3 - 0.25); g.fillRect(x + 1, 0, w - 2, H); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 2, H); x += w; }
      band(0, 26, tone(top, -0.1)); band(26, 32, 'rgba(0,0,0,0.5)'); speckle(g, R, W, '#2a1a0c', 300, 1, 3, 0.4);
      break;
    }
    default: band(0, H, '#05040a');
  }
  // vertical occlusion: darker toward the table, thin highlight under the lip
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const t = makeTex(c, true); sideCache.set(id, t); return t;
}

let waterTex = null;
export function waterTexture() {
  if (waterTex) return waterTex;
  const S = 256; const [c, g] = canvas(S, S);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
  for (let j = 0; j < 8; j++) { // tileable caustic ripples
    for (const [col, lw, off] of [['rgba(0,30,70,0.13)', 9, 0], ['rgba(255,255,255,0.42)', 1.6, 5]]) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
      for (let x = -8; x <= S + 8; x += 8) g.lineTo(x, j * 32 + 16 + off + Math.sin((x / S) * Math.PI * 2 * 3 + j * 1.9) * 7 + Math.sin((x / S) * Math.PI * 2 * 7 + j) * 2.5);
      g.stroke();
    }
  }
  waterTex = makeTex(c, true); waterTex.repeat.set(0.9, 0.9); return waterTex;
}

let fallTex = null;
export function waterfallTexture() {
  if (fallTex) return fallTex;
  const W = 128, H = 256; const [c, g] = canvas(W, H); const R = mulberry32(99);
  g.clearRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { const x = R() * W, w = 2 + R() * 7; const y = R() * H, l = 60 + R() * 120; g.fillStyle = `rgba(255,255,255,${0.25 + R() * 0.55})`; g.fillRect(x, y, w, l); g.fillRect(x, y - H, w, l); }
  fallTex = makeTex(c, true); return fallTex;
}

const tableCache = new Map();
export function tableTexture(style, color) {
  const key = style + color; if (tableCache.has(key)) return tableCache.get(key);
  const S = 512; const [c, g] = canvas(S, S); const R = mulberry32(hashStr(key));
  g.fillStyle = hex(color); g.fillRect(0, 0, S, S);
  if (style === 'wood') {
    for (let p = 0; p < 4; p++) {
      const y0 = p * 128; g.fillStyle = tone(color, (R() - 0.5) * 0.22); g.fillRect(0, y0, S, 128);
      for (let i = 0; i < 46; i++) { g.strokeStyle = `rgba(0,0,0,${0.05 + R() * 0.14})`; g.lineWidth = 1 + R() * 1.6; const y = y0 + R() * 128; g.beginPath(); for (let x = 0; x <= S; x += 32) g.lineTo(x, y + Math.sin(x * 0.0123 * (1 + (i % 3)) + i) * 3); g.stroke(); }
      for (let k = 0; k < 2; k++) { const x = R() * S, y = y0 + 30 + R() * 70; for (let r = 3; r < 20; r += 4) { g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y, r * 1.7, r, 0, 0, 6.3); g.stroke(); } }
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, y0, S, 3); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, y0 + 3, S, 2);
      const sx = (p % 2 ? 150 : 400); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(sx, y0, 3, 128);
    }
  } else if (style === 'stone') {
    flagstones(g, R, S, color, tone(color, -0.6)); blotches(g, R, S, 0x000000, 20, 0.1, 0.25, 30, 90); cracks(g, R, S, 'rgba(0,0,0,0.5)', 20, 1.6, 90); speckle(g, R, S, tone(color, 0.3), 600, 1, 3, 0.3);
  } else if (style === 'cosmic') {
    for (let i = 0; i < 260; i++) { g.fillStyle = ['#ffffff', '#fff2b0', '#b0d0ff'][R() * 3 | 0]; g.globalAlpha = 0.3 + R() * 0.7; const s = R() < 0.06 ? 3 : 1 + R() * 1.4; g.beginPath(); g.arc(R() * S, R() * S, s, 0, 6.3); g.fill(); } g.globalAlpha = 1;
  } else { // char — scorched rock with ember veins
    blotches(g, R, S, 0x000000, 20, 0.2, 0.4, 30, 100); cracks(g, R, S, 'rgba(0,0,0,0.8)', 30, 2.2, 110); cracks(g, R, S, 'rgba(255,90,20,0.38)', 7, 1.8, 120); speckle(g, R, S, '#6a5a5a', 500, 1, 3, 0.3);
  }
  const t = makeTex(c, true); tableCache.set(key, t); return t;
}

let shadowTex = null;
export function blobShadowTexture() {
  if (shadowTex) return shadowTex;
  const [c, g] = canvas(128, 128); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.78)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c); return shadowTex;
}
