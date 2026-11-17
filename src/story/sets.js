// What a story scene is painted with: one set per realm (its sky, ground and what stands on it), the few single
// things a scene puts down (a wagon, a campfire, a throne), and the full pictures (the cave wall, the map; the old
// world of the prologue moves, and is in vista.js). Everything is painted by code, once, and kept: nothing here is drawn again per frame.
import { STAGE_BY_ID } from '../data/stages.js';

export const seeded = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const canvas = (w, h) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; };

// ───── the realms ─────
// sky: top, middle, horizon · ground: horizon, middle, near · path: the road's two tones (none: no road) · hill: the two far
// ridges and how they run · props: [kind, share, colours, shortest, tallest] · floor: land, water (the party stands on a
// causeway) or float (ground exists only where a scene lays a platform) · amb: what drifts across the picture
export const SETS = {
  1: { sky: ['#252d50', '#7a4a66', '#e08a56'], sun: 'rgba(255,190,130,0.55)', hill: ['#5a5378', '#484468'], shape: 'hill', haze: '#6a5a80', ground: ['#6a5a80', '#3f6a4c', '#2a4a38'], path: ['#a8947a', '#8a765e'], tuft: ['#56806a', '#3f6a4c', '#2a4a38'], tint: 'rgba(70,50,120,0.16)',
    props: [['tree', 1, ['#2a2c44', '#2f5048', '#3b6252', '#27433f'], 8, 14]], bits: ['#5a8a5a', '#3a2c26', '#6a5440'], amb: { col: '#ffe9a8', vx: 0.012, vy: 0.006, s: 2.4, n: 26 } },
  2: { sky: ['#5a3a6a', '#d0704a', '#f6c878'], sun: 'rgba(255,230,160,0.7)', hill: ['#c98a5c', '#a86a44'], shape: 'dune', haze: '#e0a070', ground: ['#e0a070', '#c98a4c', '#9a6230'], path: ['#e0b880', '#c89a60'], tuft: null, tint: 'rgba(150,60,30,0.12)',
    props: [['cactus', 2, ['#3a2c26', '#4f7a4a', '#6a9a5a', '#3a5a3a'], 3, 6], ['rock', 3, ['#3a2c26', '#a8744a', '#c8946a', '#7a4e30'], 2, 6]], bits: ['#e0b880', '#c89a60', '#9a6230'], amb: { col: '#ffe0b0', vx: 0.09, vy: 0.004, s: 1.8, n: 40 } },
  3: { sky: ['#3a4a7a', '#8aa8d0', '#e8f2fa'], sun: 'rgba(255,255,255,0.5)', hill: ['#a8c0dc', '#8aa6c8'], shape: 'peak', haze: '#c8dcee', ground: ['#c8dcee', '#dfeaf4', '#a8c0dc'], path: ['#f2f8fc', '#d0e0ee'], tuft: null, tint: 'rgba(60,90,170,0.14)',
    props: [['pine', 3, ['#2a3248', '#3a5a6a', '#f2f8fc', '#2a4454'], 7, 12], ['crystal', 1, ['#2a3248', '#9fd8ff', '#e4f8ff', '#5a8fc8'], 2, 6]], bits: ['#f2f8fc', '#c8dcee', '#9fd8ff'], amb: { col: '#ffffff', vx: 0.02, vy: 0.05, s: 2.6, n: 60 } },
  4: { sky: ['#14101e', '#3a2c50', '#7a6a94'], sun: 'rgba(200,190,255,0.3)', hill: ['#3a2e52', '#2c2240'], shape: 'hill', haze: '#4a3c64', ground: ['#4a3c64', '#34283f', '#221a2c'], path: ['#5a4e6a', '#463a56'], tuft: ['#3a3050', '#2c2240', '#4a3c64'], tint: 'rgba(40,20,90,0.22)',
    props: [['tomb', 3, ['#14101e', '#6a6078', '#8a80a0', '#4a4058'], 2, 3.6], ['dead', 2, ['#14101e', '#2a2236', '#3a3050', '#1c1626'], 6, 11]], bits: ['#5a4e6a', '#34283f', '#8a80a0'], amb: { col: '#b0ffd8', vx: 0.004, vy: -0.02, s: 2.4, n: 22 } },
  5: { sky: ['#1a1a52', '#5a5ab0', '#f0d8b0'], sun: 'rgba(255,240,200,0.6)', stars: true, shape: 'none', haze: '#8a88c8', ground: ['#b8b0e0', '#9a94cc', '#7a74b0'], path: ['#f0e8c0', '#d8cca0'], floor: 'float', below: ['#f0d8b0', '#c8b8e0'], tint: 'rgba(60,60,160,0.12)',
    props: [['pillar', 3, ['#2a2a5a', '#d8d0f0', '#ffffff', '#8a84b8'], 5, 10], ['cloud', 3, ['#ffffff', '#ffffff', '#f0e8ff', '#c8c0e8'], 2, 5]], bits: ['#f0e8c0', '#ffffff', '#b8b0e0'], amb: { col: '#ffffff', vx: 0.006, vy: -0.004, s: 2, n: 30 } },
  6: { sky: ['#12060c', '#4a1420', '#c8583a'], sun: 'rgba(255,90,50,0.45)', hill: ['#4a1626', '#30101c'], shape: 'peak', haze: '#5a1a28', ground: ['#5a1a28', '#3a121c', '#220a12'], path: ['#5a3a40', '#42262c'], tuft: null, tint: 'rgba(120,10,20,0.18)',
    props: [['spike', 3, ['#0a0408', '#2a0e16', '#4a1a24', '#16060c'], 4, 12], ['pillar', 1, ['#0a0408', '#3a2228', '#5a3a40', '#22121a'], 6, 10]], bits: ['#5a3a40', '#220a12', '#ff6a2a'], amb: { col: '#ff8a3a', vx: 0.006, vy: -0.05, s: 2.4, n: 40 } },
  7: { sky: ['#060e16', '#1a2c40', '#3a5a6a'], sun: 'rgba(128,255,208,0.25)', hill: ['#1c2c44', '#142034'], shape: 'hill', haze: '#243a50', ground: ['#243a50', '#1c2a3c', '#101a26'], path: ['#3a4a5a', '#2a3848'], tuft: ['#2a6a5a', '#1c4a44', '#3a8a70'], tint: 'rgba(20,60,90,0.2)',
    props: [['shroom', 3, ['#0a0e16', '#7a4aa8', '#e8d8f0', '#80ffd0'], 3, 11], ['shroom', 2, ['#0a0e16', '#2a8a7a', '#d0f0e8', '#f0ffb0'], 2, 6]], bits: ['#80ffd0', '#3a4a5a', '#7a4aa8'], amb: { col: '#80ffd0', vx: 0.004, vy: -0.016, s: 3, n: 44 } },
  8: { sky: ['#1a1410', '#5a4028', '#d0a060'], sun: 'rgba(255,200,120,0.45)', hill: ['#4a3a28', '#34281c'], shape: 'city', haze: '#6a5438', ground: ['#6a5438', '#4a3c2c', '#2c241c'], path: ['#7a6a54', '#5e5040'], tuft: null, tint: 'rgba(120,80,20,0.16)',
    props: [['tower', 3, ['#14100c', '#8a6a3a', '#c8a050', '#4a3820'], 6, 14], ['gear', 1, ['#14100c', '#a08050', '#d8b870', '#5a4428'], 2, 5]], bits: ['#c8a050', '#4a3c2c', '#ffb040'], amb: { col: '#ffc070', vx: 0.01, vy: -0.03, s: 2, n: 30 } },
  9: { sky: ['#2a5a8a', '#7ab8dc', '#f4ecd0'], sun: 'rgba(255,250,220,0.7)', shape: 'none', haze: '#a8d4e8', ground: ['#a8d4e8', '#4a94b8', '#2a6890'], path: ['#d8c8a0', '#b8a880'], floor: 'water', tint: 'rgba(30,90,150,0.1)',
    props: [['stack', 3, ['#16303e', '#6a7a70', '#8a9a8a', '#3a5048'], 3, 9], ['palm', 1, ['#16303e', '#3f7a4c', '#5a9a5a', '#2a5038'], 5, 8]], bits: ['#ffffff', '#a8d4e8', '#4a94b8'], amb: { col: '#ffffff', vx: 0.03, vy: 0.004, s: 2, n: 24 } },
  10: { sky: ['#1a0806', '#6a2412', '#f09040'], sun: 'rgba(255,150,60,0.6)', hill: ['#5a2014', '#3a140c'], shape: 'peak', haze: '#7a3018', ground: ['#7a3018', '#3a1a12', '#1e0c08'], path: ['#5a4038', '#42302a'], tuft: null, tint: 'rgba(160,50,0,0.16)',
    props: [['vent', 2, ['#0e0604', '#3a2018', '#5a3424', '#ff8a2a'], 2, 5], ['rock', 3, ['#0e0604', '#2a1814', '#4a2c22', '#160c0a'], 2, 8]], bits: ['#ff8a2a', '#3a1a12', '#ffd070'], amb: { col: '#ffb050', vx: 0.008, vy: -0.07, s: 2.6, n: 50 } },
  11: { sky: ['#b8b0e8', '#e8e4fa', '#ffffff'], sun: 'rgba(255,255,255,0.8)', shape: 'none', haze: '#f0eeff', ground: ['#f4f2ff', '#e4e0f6', '#c8c2e6'], path: null, floor: 'float', below: ['#ffffff', '#e8e4fa'], tint: 'rgba(120,110,200,0.06)',
    props: [['page', 5, ['#8a84b0', '#ffffff', '#f4f0e4', '#c8c2e6'], 1.2, 3], ['pillar', 1, ['#6a64a0', '#e8e4fa', '#ffffff', '#b0a8d8'], 5, 9]], bits: ['#ffffff', '#c8c2e6', '#ffe080'], amb: { col: '#8a84c0', vx: 0.004, vy: -0.01, s: 2, n: 26 } },
};

// One cut-out of each kind, base at the bottom middle of a 300 × 520 sheet. c: outline/dark, main, light, other.
const PW = 300, PH = 520;
const poly = (g, pts, fill) => { g.fillStyle = fill; g.beginPath(); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); };
const PROP = {
  tree(g, R, c) { const x = PW / 2, tw = 20 + R() * 12, th = 270 + R() * 90; poly(g, [[x - tw * 1.2, PH], [x - tw * 0.5, PH - th], [x + tw * 0.5, PH - th], [x + tw * 1.2, PH]], c[0]);
    for (let i = 0; i < 15; i++) { const a = R() * 6.28, d = R() * 78; g.fillStyle = c[1 + (i % 3)]; g.beginPath(); g.arc(x + Math.cos(a) * d, PH - th - 30 + Math.sin(a) * d * 0.75, 44 + R() * 34, 0, 6.3); g.fill(); } },
  pine(g, R, c) { const x = PW / 2; g.fillStyle = c[0]; g.fillRect(x - 9, PH - 110, 18, 110); for (let i = 0; i < 4; i++) { const w = 120 - i * 24, top = PH - 220 - i * 86, base = PH - 70 - i * 82; poly(g, [[x, top], [x + w, base], [x - w, base]], i % 2 ? c[3] : c[1]); poly(g, [[x, top], [x + w * 0.42, top + (base - top) * 0.42], [x - w * 0.3, top + (base - top) * 0.5]], c[2]); } },
  dead(g, R, c) { const x = PW / 2; g.strokeStyle = c[1]; g.lineCap = 'round'; const br = (x0, y0, a, len, w) => { const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); if (w > 4) { br(x1, y1, a - 0.5 - R() * 0.4, len * 0.66, w * 0.6); br(x1, y1, a + 0.4 + R() * 0.4, len * 0.6, w * 0.55); } }; br(x, PH, -1.57 + (R() - 0.5) * 0.2, 190, 26); },
  cactus(g, R, c) { const x = PW / 2, bar = (bx, by, w, h) => { g.fillStyle = c[1]; g.beginPath(); g.roundRect(bx - w / 2, by - h, w, h, w / 2); g.fill(); g.fillStyle = c[2]; g.beginPath(); g.roundRect(bx - w / 2 + 5, by - h + 8, w * 0.25, h - 16, w / 8); g.fill(); }; bar(x, PH, 62, 430 + R() * 60); bar(x - 82, PH - 150, 44, 170); g.fillStyle = c[1]; g.fillRect(x - 82, PH - 172, 82, 34); bar(x + 84, PH - 230, 44, 150); g.fillStyle = c[1]; g.fillRect(x, PH - 250, 84, 34); },
  rock(g, R, c) { const n = 9, pts = []; for (let i = 0; i <= n; i++) { const k = i / n; pts.push([20 + k * 260, PH - Math.sin(k * 3.14) * (200 + R() * 240) * (0.6 + R() * 0.4)]); } poly(g, [[20, PH], ...pts, [280, PH]], c[1]); poly(g, [[20, PH], ...pts.slice(0, 5), [130, PH]], c[2]); },
  tomb(g, R, c) { const x = PW / 2, w = 150 + R() * 40; g.fillStyle = c[1]; g.beginPath(); g.roundRect(x - w / 2, PH - 400, w, 400, [w / 2, w / 2, 0, 0]); g.fill(); g.fillStyle = c[2]; g.beginPath(); g.roundRect(x - w / 2, PH - 400, w * 0.3, 400, [w / 2, 0, 0, 0]); g.fill(); g.fillStyle = c[0]; g.fillRect(x - 12, PH - 330, 24, 170); g.fillRect(x - 48, PH - 280, 96, 24); },
  pillar(g, R, c) { const x = PW / 2, h = 380 + R() * 130, w = 84; g.fillStyle = c[1]; g.fillRect(x - w / 2, PH - h, w, h); g.fillStyle = c[2]; g.fillRect(x - w / 2, PH - h, w * 0.3, h); g.fillStyle = c[3]; for (let i = 1; i < 4; i++) g.fillRect(x - w / 2 + i * w / 4, PH - h, 4, h); g.fillStyle = c[1]; g.fillRect(x - w * 0.75, PH - 34, w * 1.5, 34); if (R() < 0.6) g.fillRect(x - w * 0.75, PH - h - 30, w * 1.5, 34); else poly(g, [[x - w / 2, PH - h], [x - w / 4, PH - h - 30], [x, PH - h - 6], [x + w / 4, PH - h - 44], [x + w / 2, PH - h]], c[1]); },
  spike(g, R, c) { const x = PW / 2; for (const [dx, w, h] of [[0, 54, 500], [-80, 38, 280 + R() * 100], [76, 44, 340 + R() * 100]]) { poly(g, [[x + dx, PH - h], [x + dx + w, PH], [x + dx - w, PH]], c[1]); poly(g, [[x + dx, PH - h], [x + dx - w * 0.2, PH], [x + dx - w, PH]], c[2]); } },
  shroom(g, R, c) { const x = PW / 2, h = 330 + R() * 150, cw = 120 + R() * 24; g.fillStyle = c[2]; g.beginPath(); g.roundRect(x - 22, PH - h, 44, h, 14); g.fill(); g.fillStyle = c[1]; g.beginPath(); g.ellipse(x, PH - h, cw, cw * 0.62, 0, Math.PI, 0); g.closePath(); g.fill(); g.fillStyle = c[3]; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(x + (R() - 0.5) * cw * 1.5, PH - h - 12 - R() * cw * 0.4, 6 + R() * 10, 0, 6.3); g.fill(); } g.globalAlpha = 0.35; g.fillRect(x - cw, PH - h, cw * 2, 10); g.globalAlpha = 1; },
  tower(g, R, c) { const x = PW / 2, h = 380 + R() * 130, w = 110; g.fillStyle = c[1]; g.fillRect(x - w / 2, PH - h, w, h); g.fillStyle = c[2]; g.fillRect(x - w / 2, PH - h, w * 0.26, h); g.fillStyle = c[3]; g.fillRect(x - w * 0.7, PH - h - 22, w * 1.4, 26); g.fillRect(x + 12, PH - h - 100, 28, 80); g.fillStyle = c[0]; for (let y = PH - h + 50; y < PH - 60; y += 86) g.fillRect(x - 12, y, 30, 40); g.fillStyle = '#ffd070'; for (let y = PH - h + 50; y < PH - 60; y += 172) g.fillRect(x - 8, y + 4, 22, 32); },
  gear(g, R, c) { const x = PW / 2, y = PH - 190, r = 150; g.save(); g.translate(x, y); g.rotate(R()); g.fillStyle = c[1]; for (let i = 0; i < 10; i++) { g.rotate(Math.PI / 5); g.fillRect(-26, -r - 34, 52, 60); } g.beginPath(); g.arc(0, 0, r, 0, 6.3); g.fill(); g.fillStyle = c[3]; g.beginPath(); g.arc(0, 0, r * 0.55, 0, 6.3); g.fill(); g.fillStyle = c[2]; g.beginPath(); g.arc(-r * 0.3, -r * 0.3, r * 0.2, 0, 6.3); g.fill(); g.restore(); },
  stack(g, R, c) { const x = PW / 2, h = 300 + R() * 200; poly(g, [[x - 110, PH], [x - 70, PH - h * 0.7], [x - 20, PH - h], [x + 50, PH - h * 0.9], [x + 120, PH]], c[1]); poly(g, [[x - 110, PH], [x - 70, PH - h * 0.7], [x - 20, PH - h], [x - 20, PH]], c[2]); g.fillStyle = '#5a9a5a'; g.beginPath(); g.ellipse(x + 6, PH - h * 0.93, 60, 14, 0.1, 0, 6.3); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x - 130, PH - 10, 270, 10); },
  palm(g, R, c) { const x = PW / 2; g.strokeStyle = c[0]; g.lineWidth = 20; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 30, PH); g.quadraticCurveTo(x - 10, PH - 250, x + 20, PH - 430); g.stroke(); for (let i = 0; i < 7; i++) { const a = -2.9 + i * 0.45; g.fillStyle = c[1 + (i % 3)]; g.beginPath(); g.ellipse(x + 20 + Math.cos(a) * 70, PH - 430 + Math.sin(a) * 50 + 14, 84, 18, a, 0, 6.3); g.fill(); } },
  vent(g, R, c) { const x = PW / 2, h = 260 + R() * 200; poly(g, [[x - 140, PH], [x - 40, PH - h], [x + 40, PH - h], [x + 140, PH]], c[1]); poly(g, [[x - 140, PH], [x - 40, PH - h], [x - 6, PH - h], [x - 50, PH]], c[2]); g.fillStyle = c[3]; g.beginPath(); g.ellipse(x, PH - h, 40, 12, 0, 0, 6.3); g.fill(); g.strokeStyle = c[3]; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 6, PH - h); g.lineTo(x - 30, PH - h * 0.5); g.lineTo(x - 14, PH - h * 0.2); g.stroke(); },
  crystal(g, R, c) { const x = PW / 2; for (const [dx, w, h, t] of [[0, 46, 480, 0.1], [-70, 34, 290, -0.25], [66, 38, 340, 0.3]]) { g.save(); g.translate(x + dx, PH); g.rotate(t); poly(g, [[0, -h], [w, -h * 0.75], [w * 0.8, 0], [-w * 0.8, 0], [-w, -h * 0.75]], c[1]); poly(g, [[0, -h], [-w, -h * 0.75], [-w * 0.8, 0], [-w * 0.2, 0]], c[2]); poly(g, [[0, -h], [w, -h * 0.75], [w * 0.8, 0], [w * 0.4, 0]], c[3]); g.restore(); } },
  cloud(g, R, c) { for (let i = 0; i < 9; i++) { g.fillStyle = i % 3 ? c[1] : c[3]; g.beginPath(); g.ellipse(40 + R() * 220, PH - 60 - R() * 110, 60 + R() * 50, 34 + R() * 26, 0, 0, 6.3); g.fill(); } g.fillStyle = c[1]; g.beginPath(); g.ellipse(150, PH - 40, 150, 40, 0, 0, 6.3); g.fill(); },
  page(g, R, c) { g.save(); g.translate(PW / 2, PH - 260); g.rotate((R() - 0.5) * 0.9); g.transform(1, 0, (R() - 0.5) * 0.6, 1, 0, 0); g.fillStyle = c[3]; g.fillRect(-92, -124, 200, 260); g.fillStyle = c[1]; g.fillRect(-100, -130, 200, 260); g.strokeStyle = c[0]; g.globalAlpha = 0.45; g.lineWidth = 5; const n = (R() * 6) | 0; for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(-76, -96 + i * 34); g.lineTo(-76 + 60 + R() * 90, -96 + i * 34); g.stroke(); } g.restore(); },
};
const FLOATS = { page: [-3, 9], cloud: [-7, -2] }; // kinds that hang in the air, and between which heights

// Paint a set: three cut-outs of each kind, each in three strengths of haze (the further one stands, the paler the copy),
// where each one stands, the far ridges, the sky, and the grass. `pathX` is where the road runs at a depth.
const built = new Map();
export const pathX = (z) => Math.sin(z * 0.11) * 0.9;
export function buildSet(id) {
  if (built.has(id)) return built.get(id);
  built.clear(); // one set is kept at a time: the next realm's replaces it
  const D = SETS[id] || SETS[1], R = seeded(id * 77 + 5), cut = [];
  D.props.forEach(([kind, , c], pi) => { for (let v = 0; v < 3; v++) { const k = canvas(PW, PH), g = k.getContext('2d'); PROP[kind](g, seeded(pi * 31 + v * 13 + id), c);
    g.globalCompositeOperation = 'source-atop'; const lg = g.createLinearGradient(0, 0, PW, PH); lg.addColorStop(0, 'rgba(255,230,190,0.2)'); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(10,10,40,0.26)'); g.fillStyle = lg; g.fillRect(0, 0, PW, PH);
    cut.push([0, 0.3, 0.58].map((a) => { if (!a) return k; const q = canvas(PW, PH), d = q.getContext('2d'); d.drawImage(k, 0, 0); d.globalCompositeOperation = 'source-atop'; d.fillStyle = D.haze; d.globalAlpha = a; d.fillRect(0, 0, PW, PH); return q; })); } });
  const scenery = [], total = D.props.reduce((s, p) => s + p[1], 0), floating = D.floor === 'float';
  for (let i = 0; i < (floating ? 90 : 170); i++) {
    let r = R() * total, pi = 0; while (r > D.props[pi][1]) { r -= D.props[pi][1]; pi++; }
    const [kind, , , h0, h1] = D.props[pi], fl = FLOATS[kind], z = -26 + R() * 150, side = R() < 0.5 ? -1 : 1;
    const x = pathX(z) + side * ((fl || floating ? 7 : 4.4) + R() * R() * (floating ? 60 : 46));
    scenery.push({ k: 'prop', x, z, y: fl ? fl[0] + R() * (fl[1] - fl[0]) : floating ? -2 - R() * 14 : 0, h: h0 + R() * (h1 - h0), v: pi * 3 + ((R() * 3) | 0), flip: R() < 0.5, bob: fl ? R() * 6.28 : 0 });
  }
  if (D.tuft) for (let i = 0; i < 300; i++) { const z = -20 + R() * 80; scenery.push({ k: R() < 0.1 ? 'flower' : 'tuft', x: pathX(z) + (R() < 0.5 ? -1 : 1) * (1.7 + R() * 15), z, s: 0.5 + R() * 0.7, c: (R() * 3) | 0 }); }
  // the far ridges on one long strip
  let hills = null; if (D.hill) { hills = canvas(2600, 260); const g = hills.getContext('2d'), H2 = seeded(id + 7);
    for (const [col, base, amp] of [[D.hill[0], 120, 80], [D.hill[1], 180, 50]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, 260);
      for (let x = 0; x <= 2600; x += D.shape === 'city' ? 46 : 40) { let y = base - Math.sin(x * 0.006 + base) * amp * 0.6 - H2() * amp * 0.5; if (D.shape === 'peak') y = base - Math.abs(Math.sin(x * 0.011 + base)) * amp * 1.5 - H2() * amp * 0.3; if (D.shape === 'dune') y = base - Math.sin(x * 0.004 + base) * amp * 0.8; if (D.shape === 'city') { y = base - H2() * amp * 1.6; g.lineTo(x, y); g.lineTo(x + 46, y); continue; } g.lineTo(x, y); }
      g.lineTo(2600, 260); g.fill(); } }
  // the sky as one tall strip, stars in it where there are any
  const sky = canvas(64, 600), sg = sky.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 600); gr.addColorStop(0, D.sky[0]); gr.addColorStop(0.6, D.sky[1]); gr.addColorStop(1, D.sky[2]); sg.fillStyle = gr; sg.fillRect(0, 0, 64, 600);
  let stars = null; if (D.stars) { stars = canvas(1280, 420); const g = stars.getContext('2d'), Q = seeded(3); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + Q() * 0.7})`; const s = 1 + Q() * 2.4; g.fillRect(Q() * 1280, Q() * 420, s, s); } }
  const set = { id, D, cut, scenery, hills, sky, stars };
  built.set(id, set); return set;
}

// ───── single things a scene puts down ─────
// Painted once on a 400 × 400 sheet, base at the bottom middle. What flickers on them (flame, steam) is drawn by the stage.
const things = new Map();
const THING = {
  cart(g, o) { g.fillStyle = '#3a2a20'; g.fillRect(40, 250, 320, 20); poly(g, [[60, 150], [340, 150], [352, 256], [48, 256]], '#8a6a44'); poly(g, [[60, 150], [340, 150], [344, 176], [56, 176]], '#a8845a'); g.fillStyle = '#5a4230'; for (const x of [110, 200, 290]) g.fillRect(x - 3, 150, 6, 106);
    g.fillStyle = '#e8dcc0'; g.beginPath(); g.ellipse(200, 150, 132, 86, 0, Math.PI, 0); g.fill(); g.fillStyle = '#cfc0a0'; g.beginPath(); g.ellipse(250, 150, 80, 80, 0, Math.PI * 1.3, 0); g.lineTo(250, 150); g.fill();
    for (const [x, tilt] of [[100, o.broken ? 0.5 : 0], [300, 0]]) { g.save(); g.translate(x, 320 + (tilt ? 30 : 0)); g.rotate(tilt); g.scale(1, tilt ? 0.5 : 1); g.fillStyle = '#3a2a20'; g.beginPath(); g.arc(0, 0, 72, 0, 6.3); g.fill(); g.fillStyle = '#8a6a44'; g.beginPath(); g.arc(0, 0, 56, 0, 6.3); g.fill(); g.strokeStyle = '#3a2a20'; g.lineWidth = 9; for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(-56, 0); g.lineTo(56, 0); g.stroke(); } g.restore(); }
    if (o.cloth) { poly(g, [[330, 150], [352, 150], [378, 250], [362, 300], [344, 240]], '#f4f0e4'); poly(g, [[330, 150], [352, 150], [350, 176], [334, 176]], '#d8d0c0'); } },
  camp(g) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(200, 384, 150, 16, 0, 0, 6.3); g.fill(); g.strokeStyle = '#5a4230'; g.lineWidth = 22; g.lineCap = 'round'; for (const [a, b] of [[[110, 380], [270, 344]], [[290, 380], [130, 344]]]) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    g.strokeStyle = '#3a2a20'; g.lineWidth = 9; g.beginPath(); g.moveTo(80, 390); g.lineTo(200, 150); g.lineTo(320, 390); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(200, 150); g.lineTo(200, 230); g.stroke();
    g.fillStyle = '#4a4a56'; g.beginPath(); g.ellipse(200, 270, 46, 40, 0, 0, 6.3); g.fill(); g.fillStyle = '#6a6a78'; g.beginPath(); g.ellipse(186, 258, 16, 20, 0, 0, 6.3); g.fill(); g.strokeStyle = '#4a4a56'; g.lineWidth = 9; g.beginPath(); g.moveTo(244, 262); g.lineTo(276, 240); g.stroke(); g.fillRect(180, 226, 40, 10); },
  throne(g) { poly(g, [[110, 400], [110, 150], [150, 20], [200, 90], [250, 20], [290, 150], [290, 400]], '#2a0e16'); poly(g, [[110, 400], [110, 150], [150, 20], [176, 60], [150, 160], [150, 400]], '#4a1a24'); g.fillStyle = '#7a0a2a'; g.fillRect(140, 170, 120, 150); g.fillStyle = '#16060c'; g.fillRect(84, 300, 232, 100); g.fillStyle = '#3a121c'; g.fillRect(84, 300, 232, 22); g.fillRect(84, 250, 34, 60); g.fillRect(282, 250, 34, 60);
    g.fillStyle = '#e8dcc0'; for (const x of [96, 290]) { g.fillRect(x, 236, 18, 14); g.fillRect(x - 3, 248, 24, 4); } },
  desk(g) { g.fillStyle = '#5a4a9a'; g.fillRect(60, 250, 280, 30); poly(g, [[80, 280], [110, 280], [100, 400], [84, 400]], '#3a2f6a'); poly(g, [[290, 280], [320, 280], [316, 400], [300, 400]], '#3a2f6a'); g.fillStyle = '#ffffff'; for (const [x, y, r] of [[110, 232, -0.1], [190, 228, 0.06], [262, 236, 0.2]]) { g.save(); g.translate(x, y); g.rotate(r); g.fillRect(-40, -8, 80, 16); g.restore(); } g.fillStyle = '#ffe080'; g.fillRect(310, 180, 6, 70); },
  sheet(g) { g.save(); g.translate(200, 200); g.rotate(-0.08); g.fillStyle = '#c8c2e6'; g.fillRect(-132, -178, 280, 372); g.fillStyle = '#fbf7ea'; g.fillRect(-140, -186, 280, 372); const Q = seeded(4); for (let i = 0; i < 6; i++) { g.fillStyle = ['#56806a', '#c98a4c', '#a8c0dc', '#4a3c64', '#9a94cc', '#5a1a28'][i]; g.beginPath(); g.ellipse(-90 + (i % 3) * 90, -110 + ((i / 3) | 0) * 150, 34 + Q() * 10, 24 + Q() * 8, Q(), 0, 6.3); g.fill(); } g.restore(); },
};
export function thingPic(kind, o = {}) { const key = kind + JSON.stringify(o); if (things.has(key)) return things.get(key); const k = canvas(400, 400), g = k.getContext('2d'); THING[kind](g, o); g.globalCompositeOperation = 'source-atop'; const lg = g.createLinearGradient(0, 0, 400, 400); lg.addColorStop(0, 'rgba(255,230,190,0.18)'); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(10,10,40,0.3)'); g.fillStyle = lg; g.fillRect(0, 0, 400, 400); things.set(key, k); return k; }

// ───── full pictures ─────
const PWd = 1280, PHt = 720, INK = '#2a1c16', PAPER = '#ead9b2';
function paper(g, col = PAPER) { g.fillStyle = col; g.fillRect(0, 0, PWd, PHt); const Q = seeded(11); for (let i = 0; i < 5200; i++) { g.fillStyle = Q() < 0.5 ? 'rgba(60,40,20,0.07)' : 'rgba(255,250,235,0.1)'; g.fillRect(Q() * PWd, Q() * PHt, 1 + Q() * 3, 1 + Q()); } const v = g.createRadialGradient(640, 360, 300, 640, 360, 800); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(70,40,10,0.35)'); g.fillStyle = v; g.fillRect(0, 0, PWd, PHt); }
function island(g, x, y, w, h, top, side, Q) { const n = 14, up = [], dn = []; for (let i = 0; i <= n; i++) { const k = i / n, px = x - w / 2 + k * w; up.push([px, y - Math.sin(k * 3.14) * h * (0.25 + Q() * 0.2)]); dn.unshift([px, y + Math.sin(k * 3.14) * h * (0.7 + Q() * 0.5)]); } poly(g, [...up, ...dn], side); poly(g, [...up, ...up.map((p) => [p[0], p[1] + h * 0.16]).reverse()], top); g.strokeStyle = INK; g.lineWidth = 3; g.globalAlpha = 0.5; g.beginPath(); for (const p of up) g.lineTo(p[0], p[1]); g.stroke(); g.globalAlpha = 1; }
// where each realm sits on the map picture
export const MAP_AT = { 1: [210, 520], 2: [370, 390], 3: [250, 240], 4: [470, 170], 5: [640, 290], 6: [560, 500], 7: [800, 590], 8: [930, 440], 9: [830, 250], 10: [1030, 160], 11: [1120, 370] };
const PICS = {
  // the cave wall: the gods at their table, and beside them a small figure with a rolled map and one black hand
  wall(g) { g.fillStyle = '#6a4a32'; g.fillRect(0, 0, 2000, PHt); const Q = seeded(8); for (let i = 0; i < 2600; i++) { g.fillStyle = Q() < 0.5 ? 'rgba(30,16,8,0.16)' : 'rgba(255,220,170,0.08)'; g.fillRect(Q() * 2000, Q() * PHt, 2 + Q() * 22, 1 + Q() * 4); }
    const man = (x, y, s, col, arms = 0) => { g.fillStyle = col; g.beginPath(); g.arc(x, y - s * 1.5, s * 0.26, 0, 6.3); g.fill(); poly(g, [[x - s * 0.3, y - s * 1.2], [x + s * 0.3, y - s * 1.2], [x + s * 0.42, y], [x - s * 0.42, y]], col); g.strokeStyle = col; g.lineWidth = s * 0.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - s * 0.28, y - s * 1.1); g.lineTo(x - s * 0.7, y - s * (1.1 + arms)); g.moveTo(x + s * 0.28, y - s * 1.1); g.lineTo(x + s * 0.7, y - s * (1.1 + arms)); g.stroke(); };
    g.fillStyle = '#e8d8b8'; g.fillRect(420, 420, 620, 26); g.fillRect(450, 446, 22, 110); g.fillRect(990, 446, 22, 110); for (let i = 0; i < 6; i++) { g.save(); g.translate(480 + i * 100, 404); g.rotate((Q() - 0.5) * 0.4); g.fillStyle = '#fbf3df'; g.fillRect(-22, -14, 44, 28); g.restore(); }
    for (let i = 0; i < 5; i++) { man(470 + i * 130, 420, 150, '#a8323a', 0.5); g.fillStyle = '#f2b632'; g.beginPath(); g.arc(470 + i * 130, 150, 34, Math.PI, 0); g.fill(); }
    man(1560, 560, 90, '#e8d8b8', -0.3); g.strokeStyle = '#e8d8b8'; g.lineWidth = 18; g.beginPath(); g.moveTo(1500, 470); g.lineTo(1500, 400); g.stroke(); g.fillStyle = '#0a0705'; g.beginPath(); g.arc(1624, 488, 17, 0, 6.3); g.fill(); // (the roll in one hand, and the other hand black)
    g.strokeStyle = '#e8d8b8'; g.lineWidth = 4; g.setLineDash([10, 14]); g.beginPath(); g.moveTo(1080, 430); g.quadraticCurveTo(1300, 360, 1470, 440); g.stroke(); g.setLineDash([]); },
  // the mapmaker's map. o.all: the five realms beyond the Abyss are shown (otherwise they are blots of "spilled ink");
  // o.inked: realms already inked over; o.burnt: the whole sheet has gone dark
  map(g, o) { paper(g, o.burnt ? '#6a5a48' : PAPER); const Q = seeded(5), ids = Object.keys(MAP_AT).map(Number);
    g.strokeStyle = INK; g.lineWidth = 3; g.globalAlpha = 0.45; g.setLineDash([4, 12]); g.beginPath(); ids.forEach((id) => { if (id > 6 && !o.all) return; g.lineTo(MAP_AT[id][0], MAP_AT[id][1]); }); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    for (const id of ids) { const [x, y] = MAP_AT[id], hid = id > 6 && !o.all, dead = (o.inked || []).includes(id) || o.burnt;
      if (hid) { g.fillStyle = '#120c0a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(x + (Q() - 0.5) * 70, y + (Q() - 0.5) * 44, 16 + Q() * 34, 12 + Q() * 22, Q() * 3, 0, 6.3); g.fill(); } continue; }
      island(g, x, y - 6, 124, 50, dead ? '#5a5048' : SETS[id].ground[1], dead ? '#3a322c' : '#8a765e', Q);
      if (dead) { g.fillStyle = 'rgba(18,12,10,0.82)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(x + (Q() - 0.5) * 80, y + (Q() - 0.5) * 40, 20 + Q() * 30, 14 + Q() * 18, Q() * 3, 0, 6.3); g.fill(); } }
      g.fillStyle = o.burnt ? '#1a120e' : INK; g.font = "500 20px Mitr, 'Noto Sans Thai', sans-serif"; g.textAlign = 'center'; g.fillText(STAGE_BY_ID[id]?.name || '', x, y + 62); }
    g.strokeStyle = INK; g.lineWidth = 2.5; g.globalAlpha = 0.5; g.beginPath(); g.arc(1160, 620, 44, 0, 6.3); g.moveTo(1160, 560); g.lineTo(1160, 680); g.moveTo(1100, 620); g.lineTo(1220, 620); g.stroke(); g.globalAlpha = 1; g.strokeStyle = INK; g.lineWidth = 8; g.strokeRect(14, 14, PWd - 28, PHt - 28); },
};
const pics = new Map();
export function picture(name, o = {}) { const key = name + JSON.stringify(o); if (pics.has(key)) return pics.get(key); if (pics.size > 3) pics.clear(); const k = canvas(name === 'wall' ? 2000 : PWd, PHt); PICS[name](k.getContext('2d'), o); pics.set(key, k); return k; }
