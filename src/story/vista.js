// The prologue's picture: the old world seen from far off, and what became of it. Unlike the other full pictures it is
// not a still: the land is painted once, cut into six realms, and then moved every frame, with clouds, birds, falling
// water and the gate laid over it. Nothing is painted per frame but a few lines and dots; the rest is drawImage.
// The scene steers it with numbers on the picture (see showPic): s, x, y = the camera · brk = how far the land has
// come apart · sky = 0 day, 1 burning, 2 night · far = pulled back to where the pieces drift · gate = the gate open ·
// crack = light through the seams · tb = when it broke (S.now), for the stones that fall.
import { seeded } from './sets.js';

const W = 1280, H = 720, IW = 1500, IH = 840, Y0 = 330, K = 0.68, X0 = 90, X1 = 1410;
const canvas = (w, h) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; };
const poly = (g, pts, fill) => { g.fillStyle = fill; g.beginPath(); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); };
const ell = (g, x, y, rx, ry, fill, rot = 0) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 6.3); g.fill(); };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const io = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
const top = (x) => Y0 - Math.sin(clamp((x - X0) / (X1 - X0)) * Math.PI) * 26; // the land's surface, a little higher in the middle

// ───── the six realms of the one land, left to right. Light comes from the right, where the sun is. ─────
const SEAM = [X0 - 60, 330, 560, 790, 1010, 1220, X1 + 60];
const GROUND = [['#7fb573', '#3f6a4c'], ['#efcf92', '#c08a4c'], ['#f6fafd', '#a8c0dc'], ['#a5bd76', '#5e7a48'], ['#75659a', '#3a2e52'], ['#6a3230', '#2a1014']];
const tree = (g, x, y, s, c) => { g.fillStyle = '#3a2c26'; g.fillRect(x - s * 0.06, y - s * 0.5, s * 0.12, s * 0.5); for (const [dx, dy, r, col] of [[-0.2, -0.6, 0.3, c[0]], [0.14, -0.68, 0.34, c[1]], [-0.04, -0.9, 0.28, c[1]], [0.15, -0.92, 0.17, c[2]]]) ell(g, x + dx * s, y + dy * s, r * s, r * s, col); };
const pine = (g, x, y, s, c) => { g.fillStyle = '#2a3248'; g.fillRect(x - s * 0.05, y - s * 0.3, s * 0.1, s * 0.3); for (let i = 0; i < 3; i++) { const w = s * (0.34 - i * 0.08), t = y - s * (0.55 + i * 0.22), b = y - s * (0.16 + i * 0.22); poly(g, [[x, t], [x + w, b], [x - w, b]], c[0]); poly(g, [[x, t], [x + w, b], [x + w * 0.1, b]], c[1]); } poly(g, [[x, y - s], [x + s * 0.09, y - s * 0.82], [x - s * 0.09, y - s * 0.82]], '#ffffff'); };
const REALM = [
  // the forest
  (g, a, b, R, X) => { for (const [k, rx, ry, col] of [[0.3, 110, 54, '#5c9468'], [0.75, 90, 40, '#69a56e']]) ell(g, a + (b - a) * k, top(a + (b - a) * k) + 6, rx, ry, col);
    const ts = []; for (let i = 0; i < 20; i++) ts.push([a + 70 + R() * (b - a - 86), 30 + R() * 34 + (i < 8 ? 0 : 8), i < 8]); ts.sort((p, q) => q[2] - p[2] || p[1] - q[1]);
    for (const [x, s, back] of ts) tree(g, x, top(x) - (back ? 16 : 2), s, back ? ['#3c6a56', '#4a7c60', '#5f9670'] : ['#2f5a44', '#3f7a4e', '#74b06a']);
    const hx = a + 96, hy = top(hx); g.fillStyle = '#e8d8b8'; g.fillRect(hx - 11, hy - 15, 22, 15); poly(g, [[hx - 16, hy - 15], [hx, hy - 31], [hx + 16, hy - 15]], '#a8323a'); g.fillStyle = '#3a2a20'; g.fillRect(hx - 3, hy - 9, 6, 9); X.lights.push([hx, hy - 5, 5]);
    X.falls.push({ x: a + 118, y: top(a + 118) + 4, len: 230, w: 13 }); },
  // the dunes
  (g, a, b, R, X) => { const m = a + 150, y = top(m); poly(g, [[m - 62, y + 4], [m - 46, y - 74], [m - 10, y - 86], [m + 36, y - 80], [m + 58, y + 4]], '#b8693c'); poly(g, [[m + 4, y + 4], [m - 4, y - 85], [m + 36, y - 80], [m + 58, y + 4]], '#d98e56'); g.fillStyle = 'rgba(90,40,20,0.3)'; g.fillRect(m - 54, y - 44, 108, 5); g.fillRect(m - 50, y - 22, 106, 4);
    for (const [k, rx, ry, col] of [[0.2, 74, 30, '#e3b877'], [0.52, 96, 24, '#f4d9a0'], [0.86, 70, 34, '#dcab68']]) ell(g, a + (b - a) * k, top(a + (b - a) * k) + 8, rx, ry, col);
    for (const k of [0.1, 0.34, 0.9]) { const x = a + (b - a) * k, yy = top(x) - 4, s = 20 + R() * 12; g.fillStyle = '#4f7a4a'; g.beginPath(); g.roundRect(x - 4, yy - s, 8, s + 4, 4); g.roundRect(x - 13, yy - s * 0.72, 5, s * 0.38, 3); g.roundRect(x + 8, yy - s * 0.9, 5, s * 0.4, 3); g.fill(); g.fillRect(x - 13, yy - s * 0.4, 12, 4); g.fillRect(x + 2, yy - s * 0.56, 10, 4); } },
  // the frozen peaks
  (g, a, b, R, X) => { for (const [k, w, h] of [[0.2, 84, 150], [0.78, 80, 170], [0.5, 104, 236]]) { const x = a + (b - a) * k, y = top(x) + 6; poly(g, [[x, y - h], [x + w, y], [x - w, y]], '#7f93b5'); poly(g, [[x, y - h], [x + w, y], [x + w * 0.12, y]], '#a9bdd8');
      poly(g, [[x, y - h], [x + w * 0.3, y - h * 0.7], [x + w * 0.12, y - h * 0.62], [x + w * 0.02, y - h * 0.72], [x - w * 0.12, y - h * 0.58], [x - w * 0.3, y - h * 0.7]], '#ffffff'); }
    for (const [k, rx, ry] of [[0.25, 80, 22], [0.7, 96, 26]]) ell(g, a + (b - a) * k, top(a + (b - a) * k) + 8, rx, ry, '#e4eef6');
    for (let i = 0; i < 9; i++) { const x = a + 14 + R() * (b - a - 28); pine(g, x, top(x) - 1, 30 + R() * 22, ['#33566a', '#4c7686']); }
    X.falls.push({ x: a + 150, y: top(a + 150) + 4, len: 260, w: 10 }); },
  // the city
  (g, a, b, R, X) => { ell(g, (a + b) / 2, top((a + b) / 2) + 12, 124, 44, '#8fae68'); const mx = a + 34, my = top(mx); poly(g, [[mx - 11, my], [mx - 7, my - 52], [mx + 7, my - 52], [mx + 11, my]], '#e8d8b8'); poly(g, [[mx + 1, my], [mx + 1, my - 52], [mx + 7, my - 52], [mx + 11, my]], '#fbf3df'); poly(g, [[mx - 10, my - 52], [mx, my - 66], [mx + 10, my - 52]], '#8a4a3a'); X.mill = [mx, my - 50];
    g.fillStyle = '#b99a6a'; for (let x = a + 66; x < b - 24; x += 12) { g.fillRect(x, top(x) - 22, 13, 26); g.fillRect(x, top(x) - 28, 6, 7); }
    for (const [dx, w, h] of [[86, 24, 62], [196, 28, 88], [116, 32, 104], [154, 44, 150]]) { const x = a + dx, y = top(x); g.fillStyle = '#a88d62'; g.fillRect(x - w / 2, y - h, w, h); g.fillStyle = '#d2b88a'; g.fillRect(x - w * 0.1, y - h, w * 0.6, h);
      const ry = y - h, rh = w * 1.15; poly(g, [[x - w / 2 - 5, ry], [x, ry - rh], [x + w / 2 + 5, ry]], '#a8323a'); poly(g, [[x, ry], [x, ry - rh], [x + w / 2 + 5, ry]], '#cf4b40');
      for (let j = 0; ry + 14 + j * 28 < y - 22; j++) { g.fillStyle = '#3a2a20'; g.fillRect(x - 3, ry + 14 + j * 28, 7, 11); X.lights.push([x, ry + 19 + j * 28, 6]); }
      if (h > 120) { g.fillStyle = '#3a2a20'; g.fillRect(x - 1, ry - rh - 26, 2, 28); poly(g, [[x + 1, ry - rh - 26], [x + 22, ry - rh - 20], [x + 1, ry - rh - 13]], '#f2b632'); } }
    for (const dx of [70, 100, 134, 176, 204]) { const x = a + dx, y = top(x) + 2; g.fillStyle = '#efe2c4'; g.fillRect(x - 8, y - 12, 16, 12); poly(g, [[x - 11, y - 12], [x, y - 23], [x + 11, y - 12]], '#8a4a3a'); X.lights.push([x, y - 6, 4]); } },
  // the moor of the dead
  (g, a, b, R, X) => { for (const [k, rx, ry, col] of [[0.3, 90, 40, '#5a4a80'], [0.8, 70, 30, '#66568e']]) ell(g, a + (b - a) * k, top(a + (b - a) * k) + 8, rx, ry, col);
    const ax = a + 150, ay = top(ax); g.fillStyle = '#6a6078'; g.fillRect(ax - 30, ay - 62, 13, 62); g.fillRect(ax + 18, ay - 44, 13, 44); poly(g, [[ax - 34, ay - 62], [ax - 34, ay - 74], [ax + 8, ay - 74], [ax + 2, ay - 62]], '#6a6078'); g.fillStyle = '#8a80a0'; g.fillRect(ax - 22, ay - 62, 5, 62); g.fillRect(ax + 26, ay - 44, 5, 44);
    g.strokeStyle = '#2a2236'; g.lineCap = 'round'; const br = (x0, y0, an, len, w) => { const x1 = x0 + Math.cos(an) * len, y1 = y0 + Math.sin(an) * len; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); if (w > 1.6) { br(x1, y1, an - 0.45 - R() * 0.4, len * 0.68, w * 0.6); br(x1, y1, an + 0.4 + R() * 0.4, len * 0.62, w * 0.56); } };
    for (const k of [0.12, 0.42, 0.9]) { const x = a + (b - a) * k; br(x, top(x) + 2, -1.57 + (R() - 0.5) * 0.3, 26 + R() * 12, 6); }
    for (let i = 0; i < 9; i++) { const x = a + 18 + R() * (b - a - 36), y = top(x) + 2, w = 8 + R() * 4; g.fillStyle = '#8a80a0'; g.beginPath(); g.roundRect(x - w / 2, y - w * 1.5, w, w * 1.5, [w / 2, w / 2, 0, 0]); g.fill(); g.fillStyle = '#b0a8c4'; g.fillRect(x + w * 0.1, y - w * 1.2, w * 0.22, w * 1.2); } X.lights.push([a + 70, top(a + 70) - 30, 5, '#80ffc8'], [a + 178, top(a + 178) - 24, 4, '#80ffc8']); },
  // the mountain of fire
  (g, a, b, R, X) => { const x = a + 96, y = top(x) + 6; for (const [dx, w, h] of [[-76, 16, 46], [84, 14, 56], [58, 12, 34]]) poly(g, [[x + dx, y - h], [x + dx + w, y], [x + dx - w, y]], '#2a0e12');
    poly(g, [[x - 92, y], [x - 30, y - 150], [x - 12, y - 140], [x + 6, y - 148], [x + 28, y - 152], [x + 88, y]], '#3d1c18'); poly(g, [[x + 10, y], [x + 6, y - 148], [x + 28, y - 152], [x + 88, y]], '#62302a'); ell(g, x, y - 148, 26, 6, '#ffb040');
    g.strokeStyle = '#ff8a2a'; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; for (const pts of [[[-8, -146], [-20, -100], [-10, -64], [-30, -20]], [[12, -147], [30, -96], [22, -60]], [[2, -146], [4, -116]]]) { g.beginPath(); for (const [px, py] of pts) g.lineTo(x + px, y + py); g.stroke(); }
    X.lights.push([x, y - 148, 26, '#ff8a2a'], [x - 16, y - 80, 12, '#ff8a2a'], [x + 26, y - 80, 9, '#ff8a2a']); X.smoke = [x, y - 152]; },
];

// The whole land on one sheet, then each realm cut out of it along a ragged seam. Kept for the life of the page.
let made = null;
function build() {
  if (made) return made;
  const whole = canvas(IW, IH), g = whole.getContext('2d'), R = seeded(21), X = SEAM.slice(0, 6).map(() => ({ lights: [], falls: [], mill: null, smoke: null }));
  // the rock underneath: deepest in the middle, hung with teeth
  const up = [], dn = []; for (let x = X0; x <= X1; x += 20) { const k = (x - X0) / (X1 - X0), env = Math.sin(k * Math.PI) ** 0.55; up.push([x, top(x)]); dn.unshift([x + (R() - 0.5) * 8, top(x) + 12 + env * (120 + 90 * R() + 190 * Math.abs(Math.sin(x * 0.021 + 0.6)) ** 2.4)]); }
  const rock = () => { g.beginPath(); for (const p of [...up, ...dn]) g.lineTo(p[0], p[1]); g.closePath(); };
  g.fillStyle = '#6e5a4c'; rock(); g.fill(); g.save(); rock(); g.clip();
  for (let i = 0; i < 70; i++) { const x = X0 + R() * (X1 - X0), y = Y0 + R() * 420, w = 30 + R() * 70, h = 50 + R() * 120; poly(g, [[x, y], [x + w, y + h * 0.2], [x + w * 0.4, y + h]], R() < 0.5 ? 'rgba(255,224,180,0.10)' : 'rgba(30,18,30,0.14)'); } // facets
  g.strokeStyle = 'rgba(255,226,180,0.13)'; g.lineWidth = 9; for (let y = Y0 + 54; y < IH; y += 52) { g.beginPath(); for (let x = 0; x <= IW; x += 50) g.lineTo(x, y + Math.sin(x * 0.012 + y) * 12 + R() * 6); g.stroke(); } // strata
  let lg = g.createLinearGradient(0, Y0, 0, Y0 + 430); lg.addColorStop(0, 'rgba(24,14,34,0)'); lg.addColorStop(1, 'rgba(24,14,34,0.62)'); g.fillStyle = lg; g.fillRect(0, 0, IW, IH);
  lg = g.createLinearGradient(X0, 0, X1, 0); lg.addColorStop(0, 'rgba(20,14,40,0.3)'); lg.addColorStop(0.6, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(255,220,170,0.16)'); g.fillStyle = lg; g.fillRect(0, 0, IW, IH); g.restore();
  // what stands on each realm (kept above the surface line), then the turf laid over the lip of the rock
  SEAM.slice(0, 6).forEach((a, i) => { const b = SEAM[i + 1]; g.save(); g.beginPath(); g.moveTo(a, 0); g.lineTo(b, 0); for (let x = b; x >= a; x -= 10) g.lineTo(x, top(x) + 1); g.closePath(); g.clip(); REALM[i](g, Math.max(a, X0), Math.min(b, X1), seeded(40 + i * 9), X[i]); g.restore(); });
  SEAM.slice(0, 6).forEach((a, i) => { const b = SEAM[i + 1], x0 = Math.max(a, X0), x1 = Math.min(b, X1), [lt, dk] = GROUND[i], lip = [], rim = [], rim2 = [];
    for (let x = x0; x <= x1 + 0.1; x += (x1 - x0) / Math.round((x1 - x0) / 13)) { const edge = Math.min(1, (x - X0) / 50, (X1 - x) / 50); lip.unshift([x, top(x) + (15 + R() * 15 + (lip.length % 2) * 7) * Math.max(0.2, edge)]); rim.push([x, top(x) - 1]); rim2.unshift([x, top(x) + 8 * Math.max(0.3, edge)]); }
    poly(g, [...rim, ...lip], dk); poly(g, [...rim, ...rim2], lt);
    g.strokeStyle = dk; g.lineWidth = 2.5; g.lineCap = 'round'; for (let n = 0; n < 16; n++) { const x = x0 + 6 + R() * (x1 - x0 - 12), y = top(x) + 20, l = 10 + R() * 44; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (R() - 0.5) * 12, y + l * 0.6, x + (R() - 0.5) * 8, y + l); g.stroke(); } }); // (roots and vines hanging)
  // the seams, and the six pieces
  const seam = SEAM.map((x, i) => { const pts = []; for (let y = -10; y <= IH + 10; y += 34) pts.push([i === 0 || i === 6 ? x : x + (R() - 0.5) * 30 + ((y / 34) % 2 ? 9 : -9), y]); return pts; });
  const night = (src) => { const q = canvas(src.width, src.height), d = q.getContext('2d'); d.drawImage(src, 0, 0); d.globalCompositeOperation = 'source-atop'; d.fillStyle = 'rgba(20,12,46,0.66)'; d.fillRect(0, 0, q.width, q.height); return q; };
  const pieces = SEAM.slice(0, 6).map((a, i) => { const b = SEAM[i + 1], ox = Math.floor(a - 30), k = canvas(Math.ceil(b - a + 64), IH), d = k.getContext('2d'); d.translate(-ox, 0); d.beginPath(); for (const p of seam[i]) d.lineTo(p[0], p[1]); for (const p of [...seam[i + 1]].reverse()) d.lineTo(p[0] + 2, p[1]); d.closePath(); d.clip(); d.drawImage(whole, 0, 0);
    return { day: k, night: night(k), ox, cx: (Math.max(a, X0) + Math.min(b, X1)) / 2, ...X[i] }; });
  whole.width = whole.height = 0;
  // skies, clouds, the sea of cloud below, stars, small far islands, the gate
  const sky = [['#5fa6c0', '#a6d2cf', '#f8e8bf'], ['#2c1d44', '#8c3a56', '#ee8a50'], ['#0c0a20', '#2a1f4c', '#6c4a72']].map((c) => { const k = canvas(8, H), d = k.getContext('2d'), s = d.createLinearGradient(0, 0, 0, H); s.addColorStop(0, c[0]); s.addColorStop(0.55, c[1]); s.addColorStop(1, c[2]); d.fillStyle = s; d.fillRect(0, 0, 8, H); return k; });
  const cloud = (seed, base, shade) => { const k = canvas(440, 170), d = k.getContext('2d'), Q = seeded(seed); d.save(); d.beginPath(); d.rect(0, 0, 440, 132); d.clip(); for (let i = 0; i < 9; i++) ell(d, 70 + (i / 8) * 300 + (Q() - 0.5) * 30, 118 - Q() * 34 - Math.sin((i / 8) * 3.14) * 30, 38 + Q() * 30, 34 + Q() * 22, base); ell(d, 220, 126, 200, 24, base); d.restore();
    d.globalCompositeOperation = 'source-atop'; const s = d.createLinearGradient(0, 30, 0, 136); s.addColorStop(0.3, 'rgba(0,0,0,0)'); s.addColorStop(1, shade); d.fillStyle = s; d.fillRect(0, 0, 440, 170); return k; };
  const clouds = [0, 1, 2].map((i) => [cloud(60 + i, '#ffffff', 'rgba(178,160,206,0.8)'), cloud(60 + i, '#7a5a86', 'rgba(34,22,62,0.85)')]);
  const sea = [['#e6dcea', '#fdf8ee', 'rgba(190,170,214,0.7)'], ['#3a2a56', '#5a4274', 'rgba(16,10,36,0.8)']].map(([back, front, shade]) => { const k = canvas(1600, 260), d = k.getContext('2d'), Q = seeded(9);
    for (const [col, y0, n] of [[back, 70, 22], [front, 104, 18]]) { for (let i = 0; i < n; i++) { const x = (i / n) * 1600 + Q() * 40, r = 44 + Q() * 46, y = y0 + Q() * 22; for (const dx of [-1600, 0, 1600]) ell(d, x + dx, y, r, r * 0.8, col); } d.fillStyle = col; d.fillRect(0, y0 + 20, 1600, 260); }
    d.globalCompositeOperation = 'source-atop'; const s = d.createLinearGradient(0, 60, 0, 260); s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(1, shade); d.fillStyle = s; d.fillRect(0, 0, 1600, 260); return k; });
  const stars = [0, 1].map((n) => { const k = canvas(W, 520), d = k.getContext('2d'), Q = seeded(3 + n); for (let i = 0; i < 110; i++) { d.fillStyle = `rgba(255,255,255,${0.35 + Q() * 0.65})`; const s = 1 + Q() * 2.2; d.fillRect(Q() * W, Q() * 520, s, s); } return k; });
  const islet = canvas(240, 220); { const d = islet.getContext('2d'); poly(d, [[20, 80], [220, 80], [176, 132], [150, 128], [124, 206], [96, 140], [60, 150]], '#7a6a80'); ell(d, 120, 80, 104, 16, '#6f9a7c'); for (const [x, s] of [[70, 36], [104, 50], [150, 40], [182, 30]]) tree(d, x, 76, s, ['#4a7a64', '#5c8e70', '#77a880']); d.globalCompositeOperation = 'source-atop'; d.fillStyle = 'rgba(166,206,208,0.5)'; d.fillRect(0, 0, 240, 220); }
  const gate = canvas(440, 440); { const d = gate.getContext('2d'), s = d.createRadialGradient(220, 220, 8, 220, 220, 220); s.addColorStop(0, '#000000'); s.addColorStop(0.42, '#16040c'); s.addColorStop(0.62, '#5a0c18'); s.addColorStop(0.8, 'rgba(217,72,47,0.45)'); s.addColorStop(1, 'rgba(217,72,47,0)'); d.fillStyle = s; d.fillRect(0, 0, 440, 440); }
  const glow = canvas(256, 256); { const d = glow.getContext('2d'), s = d.createRadialGradient(128, 128, 0, 128, 128, 128); s.addColorStop(0, 'rgba(255,255,255,1)'); s.addColorStop(0.3, 'rgba(255,255,255,0.45)'); s.addColorStop(1, 'rgba(255,255,255,0)'); d.fillStyle = s; d.fillRect(0, 0, 256, 256); }
  const Q = seeded(77), stones = Array.from({ length: 70 }, (_, j) => ({ s: 1 + (j % 5), y: Y0 + 10 + Q() * 240, dx: (Q() - 0.5) * 40, vx: (Q() - 0.5) * 90, vy: -150 + Q() * 150, r: 3 + Q() * 8, d: Q() * 0.7, c: ['#6e5a4c', '#4a3c34', '#8a765e'][j % 3] }));
  made = { pieces, sky, clouds, sea, stars, islet, gate, glow, stones, seamX: SEAM.slice(1, 6) };
  return made;
}

// Where each piece ends up when the camera has pulled back: round the gate, each a realm of its own.
const GATE = [640, 318], AWAY = [[196, 500], [408, 196], [1012, 178], [1086, 486], [770, 560], [262, 318]];
const OFF = [[-150, 30, -0.1], [-90, -36, 0.06], [-30, 22, -0.04], [30, -14, 0.05], [92, 44, -0.07], [152, -28, 0.12]];
const CLOUDS_FAR = [[80, 150, 0.5, 0, 6], [520, 96, 0.36, 1, 4], [900, 250, 0.44, 2, 5], [1260, 130, 0.56, 0, 7], [1560, 220, 0.4, 1, 5]];
const CLOUDS_NEAR = [[200, 520, 1.1, 2, 16], [900, 470, 0.9, 0, 12], [1500, 560, 1.3, 1, 20]];

function draw(c, now, P) {
  const M = build(), sky = clamp(P.sky ?? 0, 0, 2), dark = clamp(sky / 2 * 1.15), far = io(clamp(P.far ?? 0)), brk = clamp(P.brk ?? 0), gate = clamp(P.gate ?? 0), crack = clamp(P.crack ?? 0);
  const layer = (d, fn) => { const s = 1 + (P.s - 1) * d; c.save(); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2 - P.x * d, -H / 2 - P.y * d); fn(); c.restore(); };
  const two = (a, b, k, fn) => { if (k < 0.995) { c.globalAlpha = 1; fn(a); } if (k > 0.005) { c.globalAlpha = k; fn(b); } c.globalAlpha = 1; }; // the day picture, with the dark one coming over it
  // the sky, its stars and its sun
  const si = Math.min(1, Math.floor(sky)); two(M.sky[si], M.sky[si + 1], sky - si, (k) => c.drawImage(k, -40, -40, W + 80, H + 80));
  if (sky > 1) layer(0.05, () => { const a = sky - 1; c.globalAlpha = a * (0.65 + 0.35 * Math.sin(now / 700)); c.drawImage(M.stars[0], 0, 0); c.globalAlpha = a * (0.65 + 0.35 * Math.sin(now / 900 + 2)); c.drawImage(M.stars[1], 0, 0); c.globalAlpha = 1; });
  if (sky < 1.95) layer(0.1, () => { const a = clamp(2 - sky), x = 968, y = 168 + sky * 120, red = clamp(sky * 1.6); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * (0.55 + 0.05 * Math.sin(now / 900)); c.drawImage(M.glow, x - 330, y - 330, 660, 660); c.restore(); c.globalAlpha = a; ell(c, x, y, 58, 58, '#fff3c8'); if (red > 0.01) { c.globalAlpha = a * red; ell(c, x, y, 58, 58, '#e2552f'); } c.globalAlpha = 1; });
  // small islands far away, and the far clouds
  if (far < 0.98) layer(0.3, () => { c.globalAlpha = (1 - far) * (1 - dark * 0.55); for (const [x, y, s, ph] of [[150, 262, 0.6, 0], [1150, 330, 0.8, 2], [395, 150, 0.36, 4]]) c.drawImage(M.islet, x - 120 * s, y - 80 * s + Math.sin(now / 1900 + ph) * 5, 240 * s, 220 * s); c.globalAlpha = 1; });
  layer(0.45, () => { for (const [x0, y, s, v, sp] of CLOUDS_FAR) { const x = ((x0 + (now / 1000) * sp) % 1900) - 300; two(M.clouds[v][0], M.clouds[v][1], dark, (k) => c.drawImage(k, x, y, 440 * s, 170 * s)); } });
  // birds over the land, while it is still day
  if (sky < 0.9) layer(0.7, () => { c.strokeStyle = '#3a2a20'; c.lineWidth = 2.4; c.lineCap = 'round'; c.globalAlpha = 1 - sky / 0.9; for (let j = 0; j < 7; j++) { const x = ((300 + j * 47 + (j % 3) * 30 + now * 0.036) % 1700) - 200, y = 150 + (j % 4) * 22 + Math.sin(now / 800 + j) * 8 - sky * 160, f = Math.sin(now / 110 + j * 1.3) * 5; c.beginPath(); c.moveTo(x - 9, y - f); c.lineTo(x, y); c.lineTo(x + 9, y - f); c.stroke(); } c.globalAlpha = 1; });
  layer(1, () => {
    const hx = (x) => 640 + (x - 750) * K, hy = 352;
    // the gate, behind the pieces: its rings turn, and dust is drawn into it
    if (gate > 0.01) { const [gx, gy] = GATE, r = 170 * (0.4 + 0.6 * gate) * (1 + Math.sin(now / 600) * 0.03); c.globalAlpha = gate; c.drawImage(M.gate, gx - r * 1.3, gy - r * 1.3, r * 2.6, r * 2.6); c.strokeStyle = '#d9482f'; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a0 = (now / (1400 + i * 500)) * (i % 2 ? -1 : 1) + i * 1.3; c.lineWidth = 5 - i; c.beginPath(); c.arc(gx, gy, r * (0.4 + i * 0.2), a0, a0 + 4.3); c.stroke(); }
      for (let j = 0; j < 46; j++) { const t = (now / 3600 + j * 0.618) % 1, a = j * 2.4 + t * 5, rr = r * (2.3 - t * 2.1); c.globalAlpha = gate * Math.min(1, t * 4) * (1 - t * 0.5); c.fillStyle = j % 3 ? '#f2b632' : '#fbf3df'; const s = 2 + (j % 3); c.fillRect(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr * 0.8, s, s); } c.globalAlpha = 1; }
    // light through the seams as it breaks
    if (crack > 0.01 && far < 0.5) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = crack; for (const sx of M.seamX) { const x = hx(sx), w = 14 + crack * 60; c.drawImage(M.glow, x - w, 90, w * 2, 560); } c.restore(); }
    M.pieces.forEach((p, i) => {
      const o = OFF[i], on = Math.min(1, brk * 3), x = hx(p.cx) + o[0] * brk, y = hy + o[1] * brk, t = AWAY[i], px = x + (t[0] - x) * far, py = y + (t[1] - y) * far + Math.sin(now / 1300 + i * 1.7) * 6 * on, sc = K * (1 - 0.56 * far);
      c.save(); c.translate(px, py); c.rotate(o[2] * brk * (1 - far * 0.6) + Math.sin(now / 1700 + i * 2.1) * 0.014 * on); c.scale(sc, sc); c.translate(-p.cx, -Y0);
      for (const f of p.falls) { const g = c.createLinearGradient(0, f.y, 0, f.y + f.len); g.addColorStop(0, `rgba(${dark > 0.5 ? '170,190,240' : '236,250,255'},0.95)`); g.addColorStop(0.7, 'rgba(210,236,250,0.5)'); g.addColorStop(1, 'rgba(210,236,250,0)'); c.fillStyle = g; c.fillRect(f.x - f.w / 2, f.y, f.w, f.len); c.fillStyle = 'rgba(120,170,210,0.55)'; for (let j = 0; j < 5; j++) { const yy = (now * 0.2 + j * f.len / 5) % f.len; c.globalAlpha = 1 - yy / f.len; c.fillRect(f.x - f.w / 2 + ((j * 5) % f.w), f.y + yy, 2.4, 20); } c.globalAlpha = 1; ell(c, f.x, f.y + f.len * 0.94, f.w * 2.4, 12, 'rgba(255,255,255,0.3)'); }
      two(p.day, p.night, dark, (k) => c.drawImage(k, p.ox, 0));
      if (p.mill) { const [mx, my] = p.mill; c.save(); c.translate(mx, my); c.rotate(now / 900); for (let b = 0; b < 4; b++) { c.rotate(Math.PI / 2); poly(c, [[0, -2], [34, -9], [36, 3], [0, 2]], dark > 0.5 ? '#6a5a70' : '#fbf3df'); } c.restore(); }
      if (p.smoke) { const [sx, sy] = p.smoke; for (let j = 0; j < 6; j++) { const u = (now / 3200 + j / 6) % 1; c.globalAlpha = (1 - u) * 0.5; ell(c, sx + Math.sin(j * 3 + u * 4) * 16 * u - u * 30, sy - u * 150, 10 + u * 30, 9 + u * 24, '#3a2c34'); } c.globalAlpha = 1; }
      if (dark > 0.05 && p.lights.length) { c.save(); c.globalCompositeOperation = 'lighter'; for (const [lx, ly, r, col] of p.lights) { c.globalAlpha = dark * (0.75 + 0.25 * Math.sin(now / 300 + lx)); c.drawImage(M.glow, lx - r * 2.4, ly - r * 2.4, r * 4.8, r * 4.8); if (!col) { c.fillStyle = '#ffd070'; c.fillRect(lx - 3, ly - 5, 7, 11); } else ell(c, lx, ly, r * 0.5, r * 0.4, col); } c.restore(); }
      c.restore();
    });
    // stones shaken loose where it broke
    if (P.tb >= 0) { const t = (now - P.tb) / 1000; if (t < 4.2) for (const s of M.stones) { const u = t - s.d; if (u < 0) continue; const x = hx(M.seamX[s.s - 1]) + s.dx + s.vx * u, y = hy + (s.y - Y0) * K + s.vy * u + 210 * u * u; if (y > H + 20) continue; c.globalAlpha = clamp(3.4 - u) * (1 - far); c.fillStyle = s.c; c.save(); c.translate(x, y); c.rotate(u * 3 + s.r); c.fillRect(-s.r / 2, -s.r / 2, s.r, s.r * 0.8); c.restore(); } c.globalAlpha = 1; }
  });
  // cloud passing in front, and the sea of cloud everything floats above
  layer(1.25, () => { for (const [x0, y, s, v, sp] of CLOUDS_NEAR) { const x = ((x0 + (now / 1000) * sp) % 2300) - 500; two(M.clouds[v][0], M.clouds[v][1], dark, (k) => { c.globalAlpha *= 0.8; c.drawImage(k, x, y, 440 * s, 170 * s); }); } });
  layer(1.4, () => { const x = -(((now / 1000) * 14) % 1600); two(M.sea[0], M.sea[1], dark, (k) => { for (let i = -1; i < 2; i++) c.drawImage(k, x + i * 1600 + 200, H - 118, 1600, 260); }); });
}
let pic = null;
export const vista = () => pic || (pic = { width: W, height: H, draw });
