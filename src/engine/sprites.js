// Sprite Factory — paints multi-directional animated sprite sheets onto canvases at runtime.
// Sheet layout: 12 columns (3 views × 4 frames) × 5 rows (anims). Views: side, back(3/4), front(3/4),
// all facing right; left-facing directions are produced by mirroring UVs.

import { paintChibi } from './chibi.js';

export const ANIMS = ['idle', 'walk', 'attack', 'hurt', 'cast'];
export const VIEWS = ['side', 'back', 'front'];
export const FRAMES = 4;
// hex direction (E, NE, NW, W, SW, SE) → [view index, mirrored]
export const DIR_VIEW = [[0, false], [1, false], [1, true], [0, true], [2, true], [2, false]];

const OUT = '#1b1410';
const cache = new Map();

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; } else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function getSheet(key, look, frameSize = 128) {
  const ck = key + ':' + frameSize;
  if (cache.has(ck)) return cache.get(ck);
  const cols = VIEWS.length * FRAMES, rows = ANIMS.length;
  const canvas = document.createElement('canvas');
  canvas.width = cols * frameSize; canvas.height = rows * frameSize;
  const ctx = canvas.getContext('2d');
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (let a = 0; a < rows; a++) {
    for (let v = 0; v < VIEWS.length; v++) {
      for (let f = 0; f < FRAMES; f++) {
        ctx.save();
        ctx.translate((v * FRAMES + f) * frameSize, a * frameSize);
        ctx.beginPath(); ctx.rect(0, 0, frameSize, frameSize); ctx.clip();
        ctx.translate(frameSize / 2, frameSize * 0.96);
        const u = frameSize / 128;
        ctx.scale(u, u);
        paint(ctx, look, VIEWS[v], ANIMS[a], f);
        ctx.restore();
        shadeFrame(ctx, (v * FRAMES + f) * frameSize, a * frameSize, frameSize);
      }
    }
  }
  rimLight(canvas, ctx, frameSize);
  const sheet = { canvas, frameSize, cols, rows };
  cache.set(ck, sheet);
  return sheet;
}

// Volume: every figure is lit from above and falls into cool shadow toward its feet.
function shadeFrame(ctx, x, y, size) {
  const g = ctx.createLinearGradient(0, y, 0, y + size);
  g.addColorStop(0, 'rgba(255, 240, 205, 0.2)'); g.addColorStop(0.42, 'rgba(255, 255, 255, 0)'); g.addColorStop(1, 'rgba(16, 12, 52, 0.4)');
  ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = g; ctx.fillRect(x, y, size, size); ctx.restore();
}
// Rim light: a warm key light catches the upper-left edge of every silhouette and a cool back light the
// lower-right one, which lifts the flat painted figures off the board.
function rimLight(canvas, ctx, frameSize) {
  const r = Math.max(1.5, frameSize * 0.02);
  const edge = (dx, dy, color, alpha) => {
    const tmp = document.createElement('canvas'); tmp.width = canvas.width; tmp.height = canvas.height;
    const c = tmp.getContext('2d');
    c.drawImage(canvas, 0, 0);
    c.globalCompositeOperation = 'destination-out'; c.drawImage(canvas, dx, dy);
    c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, tmp.width, tmp.height);
    ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = alpha; ctx.drawImage(tmp, 0, 0); ctx.restore();
  };
  edge(r, r, '#fff1cc', 0.7);
  edge(-r, -r, '#6f9bff', 0.45);
}

// Draw a single frame onto an external 2D context (used for UI portraits / previews).
export function drawFrame(ctx, sheet, anim, dir, frame, dx, dy, dw, dh) {
  const [view, flip] = DIR_VIEW[dir];
  const a = ANIMS.indexOf(anim);
  const sx = (view * FRAMES + (frame % FRAMES)) * sheet.frameSize, sy = a * sheet.frameSize;
  ctx.save();
  if (flip) { ctx.translate(dx + dw, dy); ctx.scale(-1, 1); dx = 0; dy = 0; }
  ctx.drawImage(sheet.canvas, sx, sy, sheet.frameSize, sheet.frameSize, flip ? 0 : dx, flip ? 0 : dy, dw, dh);
  ctx.restore();
}

function pose(anim, f) {
  const t = (f / FRAMES) * Math.PI * 2;
  const p = { bob: 0, leg: 0, arm: 0.35, off: 0.25, lean: 0, dx: 0, glow: 0, squash: 1, flap: Math.sin(t) };
  switch (anim) {
    case 'idle': p.bob = Math.sin(t) * 1.6; p.arm = 0.35 + Math.sin(t) * 0.05; p.squash = 1 + Math.sin(t) * 0.03; break;
    case 'walk': p.bob = -Math.abs(Math.sin(t)) * 3; p.leg = Math.sin(t) * 0.5; p.arm = 0.35 - Math.sin(t) * 0.35; p.off = 0.25 + Math.sin(t) * 0.35; p.squash = 1 + Math.cos(t * 2) * 0.05; break;
    case 'attack': p.arm = [2.7, 3.0, 1.0, 0.6][f]; p.dx = [-3, -5, 9, 5][f]; p.lean = [-0.08, -0.12, 0.14, 0.08][f]; p.squash = [1.05, 1.1, 0.88, 0.95][f]; p.swing = f === 2; break;
    case 'hurt': p.lean = -0.22; p.dx = [-4, -6, -5, -3][f]; p.arm = 0.1; p.off = 0.1; p.squash = 0.92; p.hurt = true; p.shake = f % 2 ? 1.5 : -1.5; break;
    case 'cast': p.arm = [2.0, 2.3, 2.5, 2.3][f]; p.off = [1.6, 1.9, 2.1, 1.9][f]; p.glow = [0.5, 0.8, 1, 0.8][f]; p.bob = -[0, 1, 2, 1][f]; p.squash = 1 + p.glow * 0.04; break;
  }
  return p;
}

function path(ctx, fill, stroke = OUT, lw = 2.5) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, fill, stroke = OUT, lw = 2.5, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); path(ctx, fill, stroke, lw);
}
function rrect(ctx, x, y, w, hgt, r, fill, stroke = OUT, lw = 2.5) {
  ctx.beginPath(); ctx.roundRect(x, y, w, hgt, r); path(ctx, fill, stroke, lw);
}
function grad(ctx, y0, y1, c1, c2) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
}
function rgrad(ctx, x, y, r, c1, c2) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
}
function glowCircle(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function paint(ctx, look, view, anim, f) {
  const p = pose(anim, f);
  if (p.shake) ctx.translate(p.shake, 0);
  const painter = PAINTERS[look.body] || PAINTERS.blob;
  painter(ctx, look, view, p, f, anim);
  if (p.hurt) {
    ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,60,60,0.35)'; ctx.fillRect(-64, -128, 128, 128); ctx.restore();
  }
}

// ───────────────────────── HUMANOID ─────────────────────────
function weapon(ctx, type, look, glow) {
  const metal = grad(ctx, -40, 0, '#f4f8ff', '#8a96a8');
  switch (type) {
    case 'sword':
      rrect(ctx, -2.5, -34, 5, 30, 2, metal); rrect(ctx, -8, -6, 16, 4, 2, '#c9a040'); rrect(ctx, -2, -2, 4, 9, 1, '#5a3a20'); break;
    case 'greatsword':
      ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(-4.5, -46); ctx.lineTo(0, -54); ctx.lineTo(4.5, -46); ctx.lineTo(4, -6); ctx.closePath(); path(ctx, look.demon ? grad(ctx, -54, 0, '#5a2030', '#200810') : metal);
      if (look.glowEyes) { ctx.strokeStyle = look.glowEyes; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -46); ctx.stroke(); }
      rrect(ctx, -11, -7, 22, 5, 2, '#3a2a2a'); rrect(ctx, -2.5, -2, 5, 11, 1, '#2a1a1a'); break;
    case 'staff': {
      rrect(ctx, -2, -58, 4, 66, 2, grad(ctx, -58, 8, '#a07040', '#5a3a20'));
      const orb = look.crownColor || look.cloth || '#80c0ff';
      glowCircle(ctx, 0, -62, 14 + glow * 8, orb, 0.7 + glow * 0.3);
      ellipse(ctx, 0, -62, 6, 6, rgrad(ctx, 0, -62, 6, '#ffffff', orb));
      ctx.beginPath(); ctx.moveTo(-6, -56); ctx.quadraticCurveTo(-9, -66, 0, -71); ctx.quadraticCurveTo(9, -66, 6, -56); path(ctx, null, '#c9a040', 2); break;
    }
    case 'mace':
      rrect(ctx, -2, -24, 4, 30, 2, '#6a4a2a');
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, -28 + Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 11, -28 + Math.sin(a) * 11); path(ctx, null, OUT, 3); }
      ellipse(ctx, 0, -28, 7.5, 7.5, rgrad(ctx, 0, -28, 8, '#fff6d0', '#c9a040')); break;
    case 'hammer':
      rrect(ctx, -2, -30, 4, 38, 2, '#6a4a2a');
      rrect(ctx, -11, -40, 22, 13, 2, grad(ctx, -40, -27, '#c0c8d0', '#5a6068'));
      rrect(ctx, -11, -36, 22, 3, 1, look.cloth === '#5a4a3a' ? '#ff9a30' : '#8a8a90', null); break;
    case 'bow':
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(16, 0, 0, 30); path(ctx, null, OUT, 5);
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(16, 0, 0, 30); path(ctx, null, '#8a5a2a', 3);
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-glow * 10, 0); ctx.lineTo(0, 30); path(ctx, null, '#e8e0d0', 1); break;
    case 'dagger':
      ctx.beginPath(); ctx.moveTo(-2.5, -4); ctx.lineTo(0, -20); ctx.lineTo(2.5, -4); ctx.closePath(); path(ctx, metal);
      rrect(ctx, -5, -5, 10, 3, 1, '#8a2a4a'); rrect(ctx, -1.5, -2, 3, 6, 1, '#2a1a1a'); break;
    case 'spear':
      rrect(ctx, -1.5, -52, 3, 62, 1, '#8a6a3a');
      ctx.beginPath(); ctx.moveTo(-5, -50); ctx.lineTo(0, -66); ctx.lineTo(5, -50); ctx.closePath(); path(ctx, look.cloth ? grad(ctx, -66, -50, '#fff8d0', look.cloth) : metal); break;
    case 'claw':
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 3, 0); ctx.quadraticCurveTo(i * 4 + 2, -8, i * 3 + 4, -13); path(ctx, null, '#e8e0c0', 2); } break;
    default: break;
  }
}

function offhand(ctx, type, look) {
  switch (type) {
    case 'shield':
      ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(10, -14); ctx.lineTo(10, 2); ctx.quadraticCurveTo(10, 12, 0, 18); ctx.quadraticCurveTo(-10, 12, -10, 2); ctx.closePath();
      path(ctx, grad(ctx, -14, 18, shade(look.armor, 0.25), look.armor2));
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 13); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); path(ctx, null, look.cloth || '#c9a040', 3); break;
    case 'book':
      rrect(ctx, -8, -10, 16, 18, 2, '#7a2a2a'); rrect(ctx, -6, -8, 12, 14, 1, '#e8dcc0', null);
      ctx.fillStyle = '#c9a040'; ctx.fillRect(-1, -6, 2, 10); ctx.fillRect(-4, -3, 8, 2); break;
    case 'dagger': case 'sword': weapon(ctx, type, look, 0); break;
    default: break;
  }
}

PAINTERS_INIT();
var PAINTERS;
function PAINTERS_INIT() {
  PAINTERS = {
    // every humanoid (heroes and humanoid monsters) is drawn by the chibi painter
    humanoid(ctx, L, view, p, f, anim) { paintChibi(ctx, L, view, p, anim, { weapon, offhand }); },

    blob(ctx, L, view, p, f, anim) {
      const sq = p.squash;
      ctx.translate(p.dx, 0);
      if (L.tentacles) {
        for (let i = 0; i < 5; i++) { const x = -24 + i * 12; ctx.beginPath(); ctx.moveTo(x, -10); ctx.quadraticCurveTo(x + Math.sin(f + i) * 8, 2, x + Math.sin(f * 1.5 + i) * 10, 4); path(ctx, null, OUT, 7); ctx.beginPath(); ctx.moveTo(x, -10); ctx.quadraticCurveTo(x + Math.sin(f + i) * 8, 2, x + Math.sin(f * 1.5 + i) * 10, 4); path(ctx, null, L.c2, 4); }
      }
      const w = 30 / sq, hh = 26 * sq;
      ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(-w - 4, -hh * 1.5, 0, -hh * 1.9); ctx.quadraticCurveTo(w + 4, -hh * 1.5, w, 0); ctx.closePath();
      path(ctx, rgrad(ctx, -6, -hh, w * 1.5, shade(L.c1, 0.35), L.c2));
      ctx.globalAlpha = 0.6; ellipse(ctx, -10, -hh * 1.3, 7, 4, '#ffffff', null, 0, -0.5); ctx.globalAlpha = 1;
      if (view !== 'back') {
        const ex = view === 'side' ? [10, 20] : [-9, 9];
        ex.forEach((x) => { ellipse(ctx, x, -hh * 0.95, 4.5, 6, L.eye, null); ellipse(ctx, x + 1.2, -hh * 1.05, 1.6, 2, '#fff', null); if (L.tentacles) glowCircle(ctx, x, -hh * 0.95, 8, L.eye, 0.7); });
        ctx.beginPath(); ctx.arc(view === 'side' ? 15 : 0, -hh * 0.65, 5, 0.2, Math.PI - 0.2); path(ctx, null, L.eye, 2);
      }
      if (p.glow) glowCircle(ctx, 0, -hh, 30 * p.glow, L.c1, 0.5);
    },

    beast(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx, p.bob * 0.6); ctx.rotate(p.lean * 0.5);
      const body = grad(ctx, -56, -14, shade(L.c1, 0.2), L.c2);
      const legC = shade(L.c2, -0.1);
      if (view === 'side') {
        // tail
        ctx.beginPath(); ctx.moveTo(-26, -40); ctx.quadraticCurveTo(-46, -48 + p.leg * 8, -50, -62 + p.leg * 6); path(ctx, null, OUT, 9); ctx.beginPath(); ctx.moveTo(-26, -40); ctx.quadraticCurveTo(-46, -48 + p.leg * 8, -50, -62 + p.leg * 6); path(ctx, null, L.c1, 5);
        // far legs
        [[-18, p.leg], [18, -p.leg]].forEach(([x, a]) => { ctx.save(); ctx.translate(x - 4, -26); ctx.rotate(a * 0.8); rrect(ctx, -4, 0, 8, 26, 3, shade(legC, -0.2)); ctx.restore(); });
        ellipse(ctx, 0, -36, 32, 15, body);
        if (L.accent) { for (let i = 0; i < (L.big ? 6 : 4); i++) { ctx.beginPath(); const x = -20 + i * 9; ctx.moveTo(x - 4, -48); ctx.lineTo(x, -58 - (L.big ? 6 : 0)); ctx.lineTo(x + 4, -48); path(ctx, L.accent, OUT, 1.5); } }
        [[-18, -p.leg], [18, p.leg]].forEach(([x, a]) => { ctx.save(); ctx.translate(x, -26); ctx.rotate(a * 0.8); rrect(ctx, -4.5, 0, 9, 26, 3, legC); ellipse(ctx, 2, 25, 6, 3, '#2a1a10'); ctx.restore(); });
        // head
        ctx.save(); ctx.translate(30, -50 + (anim === 'attack' ? 6 : 0)); ctx.rotate(anim === 'attack' && f === 2 ? 0.3 : 0);
        ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(4, -24); ctx.lineTo(8, -10); path(ctx, shade(L.c1, -0.1));
        ellipse(ctx, 0, 0, 15, 12, rgrad(ctx, 0, -2, 15, shade(L.c1, 0.3), L.c1));
        rrect(ctx, 6, -2, 16, 10, 4, shade(L.c1, 0.1));
        if (anim === 'attack' && f >= 2) { ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 4, 8); ctx.lineTo(12 + i * 4, 14); ctx.lineTo(14 + i * 4, 8); ctx.fill(); } }
        ellipse(ctx, 21, 0, 2.5, 2.5, '#1a1010', null);
        ellipse(ctx, 5, -3, 3, 3.2, L.eye, null); glowCircle(ctx, 5, -3, 6, L.eye, 0.6);
        if (L.horns) { ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-6, -26, 6, -32); ctx.quadraticCurveTo(0, -20, 4, -9); path(ctx, '#e8dcc0'); }
        ctx.restore();
      } else {
        const front = view === 'front';
        if (!front) { ctx.beginPath(); ctx.moveTo(0, -40); ctx.quadraticCurveTo(10 + p.leg * 10, -60, 4, -78); path(ctx, null, OUT, 9); ctx.beginPath(); ctx.moveTo(0, -40); ctx.quadraticCurveTo(10 + p.leg * 10, -60, 4, -78); path(ctx, null, L.c1, 5); }
        [-1, 1].forEach((s, i) => { const lift = (i ? 1 : -1) * p.leg * 5; rrect(ctx, s * 12 - 4.5, -30 - Math.max(0, lift), 9, 28, 3, legC); });
        ellipse(ctx, 0, -38, 24, 18, body);
        if (L.accent) { for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 7 - 4, -52); ctx.lineTo(i * 7, -62 - (L.big ? 6 : 0) + Math.abs(i) * 2); ctx.lineTo(i * 7 + 4, -52); path(ctx, L.accent, OUT, 1.5); } }
        if (front) {
          ctx.save(); ctx.translate(0, -46);
          [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 6, -10); ctx.lineTo(s * 14, -24); ctx.lineTo(s * 15, -6); path(ctx, shade(L.c1, -0.1)); });
          ellipse(ctx, 0, 0, 16, 14, rgrad(ctx, 0, -4, 16, shade(L.c1, 0.3), L.c1));
          rrect(ctx, -7, 2, 14, 12, 5, shade(L.c1, 0.15)); ellipse(ctx, 0, 5, 3, 2.2, '#1a1010', null);
          [-7, 7].forEach((x) => { ellipse(ctx, x, -3, 3, 3.4, L.eye, null); glowCircle(ctx, x, -3, 6, L.eye, 0.6); });
          if (L.horns) [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 8, -8); ctx.quadraticCurveTo(s * 22, -14, s * 20, -30); ctx.quadraticCurveTo(s * 16, -16, s * 4, -10); path(ctx, '#e8dcc0'); });
          ctx.restore();
        } else {
          [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 6, -54); ctx.lineTo(s * 13, -70); ctx.lineTo(s * 15, -52); path(ctx, shade(L.c1, -0.1)); });
          ellipse(ctx, 0, -54, 14, 11, L.c1);
        }
      }
      if (L.stars) { for (let i = 0; i < 6; i++) glowCircle(ctx, -20 + ((i * 37) % 40), -30 - ((i * 23) % 22), 4, '#ffffff', 0.9); }
      if (p.glow) glowCircle(ctx, 0, -40, 30 * p.glow, L.accent || L.c1, 0.5);
    },

    insect(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx, 0);
      const strike = anim === 'attack' ? [0, -0.4, 0.9, 0.4][f] : Math.sin(f / 4 * Math.PI * 2) * 0.1;
      const legs = () => { for (let i = 0; i < 3; i++) { [-1, 1].forEach((s) => { ctx.beginPath(); const x = -12 + i * 12; ctx.moveTo(x, -16); ctx.lineTo(x + s * 6 + p.leg * 4 * s, -24); ctx.lineTo(x + s * 14, 0); path(ctx, null, OUT, 4); ctx.beginPath(); ctx.moveTo(x, -16); ctx.lineTo(x + s * 6 + p.leg * 4 * s, -24); ctx.lineTo(x + s * 14, 0); path(ctx, null, L.c2, 2); }); } };
      legs();
      const segs = view === 'side' ? [[-18, -18, 12, 9], [-4, -20, 14, 11], [14, -20, 13, 10]] : [[0, -18, 20, 12], [0, -24, 18, 11]];
      segs.forEach(([x, y, rx, ry]) => ellipse(ctx, x, y, rx, ry, rgrad(ctx, x, y - 4, rx, shade(L.c1, 0.3), L.c2)));
      // tail
      ctx.save(); ctx.translate(view === 'side' ? -26 : 0, -22); ctx.rotate(strike * (view === 'side' ? -1 : 0));
      ctx.beginPath(); const tx = view === 'side' ? -14 : 0; ctx.moveTo(0, 0); ctx.quadraticCurveTo(tx - 6, -30, tx + 16, -46); path(ctx, null, OUT, 10); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(tx - 6, -30, tx + 16, -46); path(ctx, null, L.c1, 6);
      ctx.beginPath(); ctx.moveTo(tx + 12, -48); ctx.lineTo(tx + 26, -44); ctx.lineTo(tx + 16, -38); path(ctx, '#2a1010'); ctx.restore();
      // claws
      const cx = view === 'side' ? 28 : 0;
      [-1, 1].forEach((s) => { if (view === 'side' && s < 0) return; ctx.save(); ctx.translate(view === 'side' ? cx : s * 20, -22); ctx.rotate(view === 'side' ? -strike * 0.5 : s * 0.3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -6); path(ctx, null, L.c2, 5); ctx.beginPath(); ctx.moveTo(8, -12); ctx.quadraticCurveTo(22, -14, 20, -2); ctx.lineTo(14, -6); ctx.lineTo(20, 2); ctx.quadraticCurveTo(8, 4, 8, -12); path(ctx, shade(L.c1, 0.1)); ctx.restore(); });
      if (view !== 'back') { (view === 'side' ? [22] : [-5, 5]).forEach((x) => { ellipse(ctx, x, -24, 2.5, 2.5, L.eye, null); glowCircle(ctx, x, -24, 5, L.eye); }); }
    },

    plant(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx, 0);
      const sq = p.squash;
      if (L.cactus) {
        const g = grad(ctx, -80, 0, shade(L.c1, 0.2), shade(L.c1, -0.3));
        rrect(ctx, -12, -72 * sq, 24, 72 * sq, 12, g);
        [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 12, -36); ctx.lineTo(s * 24, -36); ctx.lineTo(s * 24, -56 - (anim === 'attack' ? 8 : 0)); path(ctx, null, OUT, 13); ctx.beginPath(); ctx.moveTo(s * 12, -36); ctx.lineTo(s * 24, -36); ctx.lineTo(s * 24, -56 - (anim === 'attack' ? 8 : 0)); path(ctx, null, L.c1, 8); });
        ctx.strokeStyle = L.spots; ctx.lineWidth = 1; for (let i = 0; i < 14; i++) { const y = -8 - i * 4.5, x = (i % 2 ? -1 : 1) * 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x * 1.5, y - 2); ctx.stroke(); }
        ellipse(ctx, 0, -72 * sq - 3, 7, 5, '#ff70a0');
        if (view !== 'back') { [-5, 5].forEach((x) => ellipse(ctx, x + (view === 'side' ? 6 : 0), -50, 2.5, 3.5, '#1a1010', null)); ctx.beginPath(); ctx.arc(view === 'side' ? 6 : 0, -42, 4, 0.2, Math.PI - 0.2); path(ctx, null, '#1a1010', 2); }
        return;
      }
      rrect(ctx, -11, -36 * sq, 22, 36 * sq, 8, grad(ctx, -36, 0, L.c2, shade(L.c2, -0.25)));
      if (view !== 'back') { (view === 'side' ? [6] : [-5, 5]).forEach((x) => { ellipse(ctx, x, -20, 2.5, 3.5, '#1a1010', null); }); ctx.beginPath(); ctx.arc(view === 'side' ? 5 : 0, -13, 3.5, 0.2, Math.PI - 0.2); path(ctx, null, '#1a1010', 1.8); }
      const cy = -36 * sq - 2;
      ctx.beginPath(); ctx.ellipse(0, cy, 34 / sq, 24 * sq, 0, Math.PI, Math.PI * 2); ctx.quadraticCurveTo(0, cy + 10, -34 / sq, cy); path(ctx, rgrad(ctx, -6, cy - 14, 34, shade(L.c1, 0.3), L.c1));
      [[-14, -12, 5], [6, -18, 6], [18, -7, 4], [-2, -6, 3.5]].forEach(([x, y, r]) => ellipse(ctx, x, cy + y * sq, r, r * 0.8, L.spots, null));
      if (anim === 'attack' || anim === 'cast') { for (let i = 0; i < 6; i++) glowCircle(ctx, -20 + i * 8, cy - 20 - ((i * 7 + f * 9) % 22), 6, '#c0ff80', 0.6); }
    },

    floating(ctx, L, view, p, f, anim) {
      const hover = Math.sin((f / 4) * Math.PI * 2) * 4;
      ctx.translate(p.dx, -24 + hover);
      glowCircle(ctx, 0, -30, 44, L.glow, 0.5 + p.glow * 0.4);
      if (L.wings) [-1, 1].forEach((s) => { ctx.save(); ctx.translate(s * 8, -36); ctx.scale(s, 1); ctx.rotate(-0.3 + p.flap * 0.3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, -30, 40, -16); ctx.quadraticCurveTo(24, -8, 30, 2); ctx.quadraticCurveTo(14, 0, 0, 6); path(ctx, 'rgba(255,250,230,0.9)'); ctx.restore(); });
      ctx.beginPath(); ctx.moveTo(-20, -30); ctx.quadraticCurveTo(-24, -62, 0, -64); ctx.quadraticCurveTo(24, -62, 20, -30);
      for (let i = 0; i < 4; i++) { const x = 20 - i * 13; ctx.quadraticCurveTo(x - 3, -12 + Math.sin(f + i) * 4, x - 6.5, -4 - (i % 2) * 8); }
      ctx.closePath(); ctx.globalAlpha = 0.92; path(ctx, rgrad(ctx, -4, -48, 30, '#ffffff', L.c1), shade(L.c2, -0.3)); ctx.globalAlpha = 1;
      if (view !== 'back') { (view === 'side' ? [9] : [-7, 7]).forEach((x) => { ellipse(ctx, x, -44, 3.2, 5, L.c2, null); glowCircle(ctx, x, -44, 6, '#ffffff', 0.5); }); ctx.beginPath(); ctx.ellipse(view === 'side' ? 6 : 0, -32, 4, anim === 'attack' ? 5 : 2.5, 0, 0, Math.PI * 2); path(ctx, shade(L.c2, -0.4), null); }
      for (let i = 0; i < 3; i++) glowCircle(ctx, Math.sin(f * 1.7 + i * 2) * 26, -40 + Math.cos(f + i * 2) * 24, 4, L.glow, 0.9);
    },

    bat(ctx, L, view, p, f) {
      const hover = Math.sin((f / 4) * Math.PI * 2) * 5;
      ctx.translate(p.dx, -40 + hover);
      const flap = Math.sin((f / 4) * Math.PI * 2);
      [-1, 1].forEach((s) => { if (view === 'side' && s < 0) return; ctx.save(); ctx.scale(view === 'side' ? 1 : s, 1); ctx.rotate(flap * 0.5 * (view === 'side' ? 1 : 1));
        ctx.beginPath(); ctx.moveTo(4, -4); ctx.quadraticCurveTo(20, -26, 44, -18); ctx.lineTo(38, -6); ctx.lineTo(34, 2); ctx.lineTo(26, -2); ctx.lineTo(20, 8); ctx.quadraticCurveTo(10, 2, 4, 4); ctx.closePath(); path(ctx, grad(ctx, -26, 8, shade(L.c1, 0.2), L.c2)); ctx.restore(); });
      ellipse(ctx, 0, 0, 12, 14, rgrad(ctx, -2, -4, 14, shade(L.c1, 0.3), L.c1));
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 4, -10); ctx.lineTo(s * 9, -22); ctx.lineTo(s * 10, -8); path(ctx, L.c1); });
      if (view !== 'back') { (view === 'side' ? [6] : [-4.5, 4.5]).forEach((x) => { ellipse(ctx, x, -3, 2.2, 2.6, L.eye, null); glowCircle(ctx, x, -3, 5, L.eye); }); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(-2, 8); ctx.lineTo(-1, 4); ctx.moveTo(1, 4); ctx.lineTo(2, 8); ctx.lineTo(3, 4); ctx.fill(); }
    },

    imp(ctx, L, view, p, f) {
      const hover = Math.sin((f / 4) * Math.PI * 2) * 4;
      ctx.translate(p.dx, -22 + hover);
      [-1, 1].forEach((s) => { ctx.save(); ctx.translate(s * 6, -30); ctx.scale(s, 1); ctx.rotate(-0.2 + p.flap * 0.4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(16, -24, 32, -18); ctx.lineTo(26, -8); ctx.lineTo(28, 2); ctx.quadraticCurveTo(14, 0, 0, 6); path(ctx, L.wing); ctx.restore(); });
      ctx.beginPath(); ctx.moveTo(-6, -14); ctx.quadraticCurveTo(-26, -4, -22, 10); path(ctx, null, OUT, 4); ctx.beginPath(); ctx.moveTo(-22, 10); ctx.lineTo(-27, 4); ctx.lineTo(-19, 4); path(ctx, L.c2);
      ellipse(ctx, 0, -22, 14, 16, rgrad(ctx, -2, -28, 16, shade(L.c1, 0.3), L.c1));
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 5, -34); ctx.quadraticCurveTo(s * 12, -46, s * 8, -52); ctx.quadraticCurveTo(s * 7, -42, s * 1, -36); path(ctx, '#e8dcc0'); });
      if (view !== 'back') { (view === 'side' ? [7] : [-5, 5]).forEach((x) => { ellipse(ctx, x, -26, 3, 3.5, L.eye, null); glowCircle(ctx, x, -26, 6, L.eye); }); ctx.beginPath(); ctx.arc(view === 'side' ? 5 : 0, -18, 5, 0.1, Math.PI - 0.1); path(ctx, '#2a0a10', null); }
      if (p.glow || p.swing) glowCircle(ctx, 16, -24, 18, '#ff8020', 0.8);
    },

    golem(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx, p.bob); ctx.rotate(p.lean * 0.6);
      const body = grad(ctx, -90, -20, shade(L.c1, 0.25), L.c2);
      const armA = anim === 'attack' ? [2.6, 2.9, 0.6, 0.4][f] : 0.2 + p.leg * 0.3;
      const drawArm = (s, a) => { ctx.save(); ctx.translate(s * 28, -68); ctx.rotate(-s * 0.2 + (s > 0 ? -1 : 1) * 0); const hx = Math.sin(a) * 26 * s, hy = Math.cos(a) * 26; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hx, hy); path(ctx, null, OUT, 18); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hx, hy); path(ctx, null, L.c2, 13); rrect(ctx, hx - 11, hy - 6, 22, 20, 6, grad(ctx, hy - 6, hy + 14, shade(L.c1, 0.2), L.c2)); ctx.restore(); };
      // legs
      [-1, 1].forEach((s, i) => { const lift = (i ? 1 : -1) * p.leg * 5; rrect(ctx, s * 14 - 9, -30 - Math.max(0, lift), 18, 30, 5, shade(L.c2, -0.1)); });
      drawArm(-1, view === 'side' ? armA * 0.6 : 0.2 - p.leg * 0.3);
      ctx.beginPath(); ctx.moveTo(-30, -88); ctx.lineTo(30, -88); ctx.lineTo(24, -28); ctx.lineTo(-24, -28); ctx.closePath(); path(ctx, body);
      // details
      if (L.bones) { ctx.strokeStyle = shade(L.c1, 0.5); ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-20, -78 + i * 12); ctx.quadraticCurveTo(0, -72 + i * 12, 20, -78 + i * 12); ctx.stroke(); } }
      else { ctx.strokeStyle = shade(L.c2, -0.3); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, -84); ctx.lineTo(-6, -64); ctx.lineTo(-16, -44); ctx.moveTo(12, -80); ctx.lineTo(4, -58); ctx.lineTo(14, -36); ctx.stroke(); }
      if (L.lava) { ctx.strokeStyle = '#ffa020'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-14, -84); ctx.lineTo(-6, -64); ctx.lineTo(-16, -44); ctx.moveTo(12, -80); ctx.lineTo(4, -58); ctx.stroke(); glowCircle(ctx, 0, -60, 30, '#ff6010', 0.5); }
      if (view !== 'back') glowCircle(ctx, 0, -58, 12, L.accent, 0.8);
      // head
      rrect(ctx, -14, -108, 28, 22, 6, grad(ctx, -108, -86, shade(L.c1, 0.35), L.c1));
      if (L.horns) [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 10, -104); ctx.quadraticCurveTo(s * 26, -110, s * 24, -128); ctx.quadraticCurveTo(s * 18, -112, s * 4, -106); path(ctx, '#2a1a1a'); });
      if (view !== 'back') { (view === 'side' ? [6] : [-6, 6]).forEach((x) => { rrect(ctx, x - 3.5, -100, 7, 4, 1, L.eye, null); glowCircle(ctx, x, -98, 8, L.eye, 0.9); }); }
      drawArm(1, armA);
      if (p.swing) { ctx.save(); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(10, -60, 50, -1.2, 1); ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.stroke(); ctx.restore(); }
    },

    treant(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx, p.bob); ctx.rotate(p.lean * 0.5);
      const sway = Math.sin((f / 4) * Math.PI * 2) * 0.05;
      // roots
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 8, -14); ctx.quadraticCurveTo(i * 16, -4, i * 22 + p.leg * 4, 0); path(ctx, null, OUT, 9); ctx.beginPath(); ctx.moveTo(i * 8, -14); ctx.quadraticCurveTo(i * 16, -4, i * 22 + p.leg * 4, 0); path(ctx, null, L.c2, 5); }
      // trunk
      ctx.beginPath(); ctx.moveTo(-22, -10); ctx.quadraticCurveTo(-26, -60, -18, -92); ctx.lineTo(18, -92); ctx.quadraticCurveTo(26, -60, 22, -10); ctx.closePath(); path(ctx, grad(ctx, -92, -10, shade(L.c1, 0.2), L.c2));
      ctx.strokeStyle = shade(L.c2, -0.35); ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 10, -88); ctx.quadraticCurveTo(i * 12 + 3, -50, i * 9, -14); ctx.stroke(); }
      // arms (branches)
      const armA = anim === 'attack' ? [2.4, 2.8, 0.5, 0.4][f] : 0.6 + sway * 4;
      [-1, 1].forEach((s) => { const a = s > 0 ? armA : 0.6 - sway * 4; ctx.save(); ctx.translate(s * 18, -70); const hx = Math.sin(a) * 34 * s, hy = Math.cos(a) * 34; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(hx * 0.5 + s * 10, hy * 0.3, hx, hy); path(ctx, null, OUT, 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(hx * 0.5 + s * 10, hy * 0.3, hx, hy); path(ctx, null, L.c1, 8);
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + s * (4 + k * 3), hy + 8 - k * 6); path(ctx, null, L.c2, 3); } ctx.restore(); });
      // crown of leaves
      ctx.save(); ctx.rotate(sway);
      [[-26, -104, 22], [0, -118, 26], [26, -104, 22], [-14, -96, 18], [14, -96, 18]].forEach(([x, y, r]) => ellipse(ctx, x, y, r, r * 0.85, rgrad(ctx, x - 5, y - 6, r, shade(L.accent, 0.35), shade(L.accent, -0.3))));
      for (let i = 0; i < 5; i++) ellipse(ctx, -24 + i * 12, -112 + (i % 2) * 10, 3, 3, '#ffd0f0', null);
      ctx.restore();
      if (view !== 'back') { (view === 'side' ? [8] : [-8, 8]).forEach((x) => { ellipse(ctx, x, -70, 5, 6, '#1a1008', null); glowCircle(ctx, x, -70, 10, L.eye, 0.9); }); ctx.beginPath(); ctx.ellipse(view === 'side' ? 6 : 0, -52, 8, anim === 'attack' ? 7 : 4, 0, 0, Math.PI * 2); path(ctx, '#1a1008', null); }
      if (p.glow) glowCircle(ctx, 0, -90, 50 * p.glow, L.accent, 0.5);
    },

    dragon(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx * 0.6, p.bob);
      const flap = Math.sin((f / 4) * Math.PI * 2);
      const wing = (s) => { ctx.save(); ctx.translate(s * (view === 'side' ? 4 : 14), -66); ctx.scale(view === 'side' ? 1 : s, 1); ctx.rotate(-0.4 - flap * 0.35);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, -40); ctx.lineTo(56, -48); ctx.lineTo(50, -30); ctx.lineTo(56, -14); ctx.lineTo(40, -10); ctx.lineTo(42, 4); ctx.lineTo(24, 0); ctx.quadraticCurveTo(10, 10, 0, 10); ctx.closePath(); path(ctx, grad(ctx, -48, 10, shade(L.wing, 0.3), shade(L.wing, -0.3)));
        ctx.strokeStyle = shade(L.wing, -0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(22, -40); ctx.lineTo(24, 0); ctx.moveTo(22, -40); ctx.lineTo(40, -10); ctx.stroke(); ctx.restore(); };
      const body = grad(ctx, -80, -20, shade(L.c1, 0.3), L.c2);
      const neckHead = (ox, oy, ang, scale = 1) => {
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(ang); ctx.scale(scale, scale);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -20, 16, -36); path(ctx, null, OUT, 16); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -20, 16, -36); path(ctx, null, L.c1, 12);
        ctx.translate(18, -40);
        ellipse(ctx, 0, 0, 13, 10, rgrad(ctx, -2, -3, 13, shade(L.c1, 0.35), L.c1));
        rrect(ctx, 4, -3, 18, 10, 4, shade(L.c1, 0.15));
        if (anim === 'attack' && f >= 2) { glowCircle(ctx, 28, 2, 18, L.accent === '#ffffff' ? '#fff0a0' : L.accent, 1); }
        ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-14, -18, -20, -22); ctx.quadraticCurveTo(-12, -12, -4, -2); path(ctx, '#f0e8d0');
        ellipse(ctx, 4, -2, 2.8, 2.8, L.eye, null); glowCircle(ctx, 4, -2, 6, L.eye);
        ctx.restore();
      };
      if (view === 'side') {
        wing(-1);
        ctx.beginPath(); ctx.moveTo(-26, -40); ctx.quadraticCurveTo(-56, -36, -60, -12 + flap * 3); ctx.lineTo(-52, -16); path(ctx, null, OUT, 12); ctx.beginPath(); ctx.moveTo(-26, -40); ctx.quadraticCurveTo(-56, -36, -60, -12 + flap * 3); path(ctx, null, L.c1, 8);
        [[-16, p.leg], [14, -p.leg]].forEach(([x, a]) => { ctx.save(); ctx.translate(x, -28); ctx.rotate(a * 0.6); rrect(ctx, -5, 0, 11, 26, 4, shade(L.c2, -0.1)); ctx.restore(); });
        ellipse(ctx, 0, -44, 32, 20, body);
        ctx.fillStyle = shade(L.c1, 0.4); ctx.beginPath(); ctx.ellipse(4, -34, 24, 8, 0, 0, Math.PI); ctx.fill();
        if (L.hydra) { neckHead(18, -54, -0.5, 0.75); neckHead(22, -50, 0.1, 0.85); neckHead(20, -56, 0.6, 0.75); }
        else neckHead(20, -56, anim === 'attack' ? [0, -0.2, 0.35, 0.2][f] : flap * 0.05);
        wing(1);
      } else {
        const front = view === 'front';
        wing(-1); wing(1);
        if (!front) { ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(10, -10, 26, -6); path(ctx, null, OUT, 12); ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(10, -10, 26, -6); path(ctx, null, L.c1, 8); }
        [-1, 1].forEach((s, i) => { const lift = (i ? 1 : -1) * p.leg * 5; rrect(ctx, s * 16 - 6, -30 - Math.max(0, lift), 12, 28, 4, shade(L.c2, -0.1)); });
        ellipse(ctx, 0, -46, 28, 24, body);
        if (front) {
          ctx.fillStyle = shade(L.c1, 0.4); ctx.beginPath(); ctx.ellipse(0, -40, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
          const heads = L.hydra ? [[-16, -0.4, 0.7], [0, 0, 0.8], [16, 0.4, 0.7]] : [[0, 0, 1]];
          heads.forEach(([x, a, sc]) => { ctx.save(); ctx.translate(x, -64); ctx.rotate(a); ctx.scale(sc, sc);
            ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -16); path(ctx, null, OUT, 16); ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -16); path(ctx, null, L.c1, 12);
            ellipse(ctx, 0, -24, 14, 13, rgrad(ctx, -2, -28, 14, shade(L.c1, 0.35), L.c1)); rrect(ctx, -8, -20, 16, 14, 5, shade(L.c1, 0.15));
            [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 8, -32); ctx.quadraticCurveTo(s * 18, -42, s * 22, -50); ctx.quadraticCurveTo(s * 14, -38, s * 4, -34); path(ctx, '#f0e8d0'); });
            [-6, 6].forEach((ex) => { ellipse(ctx, ex, -27, 2.8, 3, L.eye, null); glowCircle(ctx, ex, -27, 6, L.eye); });
            if (anim === 'attack' && f >= 2) glowCircle(ctx, 0, -10, 20, L.accent === '#ffffff' ? '#fff0a0' : L.accent, 1);
            ctx.restore(); });
        } else { ctx.beginPath(); ctx.moveTo(0, -66); ctx.lineTo(0, -88); path(ctx, null, OUT, 16); ctx.beginPath(); ctx.moveTo(0, -66); ctx.lineTo(0, -88); path(ctx, null, L.c1, 12); ellipse(ctx, 0, -92, 13, 11, L.c1); }
      }
      if (p.glow) glowCircle(ctx, 0, -60, 50 * p.glow, L.accent, 0.4);
    },

    // ── creatures of the sea (stage 9). They stand half under water, so what matters is drawn high. ──
    // A sea serpent: coils breaking the surface, a thick neck rising in an S, a finned head with a long jaw.
    serpent(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx * 0.5, 0); const sway = Math.sin((f / 4) * Math.PI * 2) * 3, lunge = anim === 'attack' ? [0, -7, 15, 6][f] : 0, side = view === 'side';
      const fin = L.wing || shade(L.c1, 0.3), belly = L.accent || shade(L.c1, 0.4);
      [[-36, 15, 1], [32, 12, -1]].forEach(([x, r, s]) => { // coils behind, each with a row of fins
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 9 - 4, -r * 0.8); ctx.lineTo(x + k * 9 + s * 2, -r - 9 + Math.abs(k) * 4); ctx.lineTo(x + k * 9 + 5, -r * 0.8); path(ctx, fin, OUT, 2); }
        ctx.beginPath(); ctx.arc(x, 2, r + s * sway * 0.3, Math.PI, 0); path(ctx, rgrad(ctx, x - 4, -r, r * 1.6, shade(L.c1, 0.25), L.c2), OUT, 3);
      });
      const hx = (side ? 20 : 0) + sway + lunge, hy = -86 + p.bob - Math.abs(lunge) * 0.5;
      const neck = (w, col, off = 0) => { ctx.beginPath(); ctx.moveTo(-4 + off, 6); ctx.bezierCurveTo(-30 + off, -30, 26 + off, -52, hx + off * 0.5, hy + 8); ctx.lineCap = 'round'; path(ctx, null, col, w); };
      for (let k = 0; k < 4; k++) { const t = 0.25 + k * 0.17, bx = -4 * (1 - t) ** 3 + 3 * -30 * t * (1 - t) ** 2 + 3 * 26 * t * t * (1 - t) + hx * t ** 3, by = 6 * (1 - t) ** 3 + 3 * -30 * t * (1 - t) ** 2 + 3 * -52 * t * t * (1 - t) + (hy + 8) * t ** 3; // fins down the back of the neck
        ctx.beginPath(); ctx.moveTo(bx - 20, by + 4); ctx.lineTo(bx - 30, by - 12); ctx.lineTo(bx - 12, by - 6); path(ctx, fin, OUT, 2); }
      neck(31, OUT); neck(26, L.c2); neck(20, L.c1, -2); neck(7, belly, 6);
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(side ? 0.25 + lunge * 0.012 : 0);
      const jaw = anim === 'attack' && f >= 1 ? 0.5 : 0.12;
      if (side) {
        ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(-34, -22); ctx.lineTo(-22, -4); ctx.lineTo(-36, -6); ctx.lineTo(-18, 6); path(ctx, fin, OUT, 2); // frill behind the head
        ctx.save(); ctx.rotate(jaw); ctx.beginPath(); ctx.moveTo(-10, 4); ctx.quadraticCurveTo(14, 16, 36, 8); ctx.lineTo(8, 2); ctx.closePath(); path(ctx, L.c2, OUT, 2.5); ctx.restore(); // lower jaw
        ctx.beginPath(); ctx.moveTo(-18, 4); ctx.quadraticCurveTo(-20, -18, 2, -18); ctx.quadraticCurveTo(26, -16, 40, -2); ctx.quadraticCurveTo(24, 8, -18, 4); path(ctx, rgrad(ctx, 0, -10, 34, shade(L.c1, 0.35), L.c2), OUT, 2.5);
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(12 + k * 6, 3); ctx.lineTo(15 + k * 6, 9); ctx.lineTo(18 + k * 6, 2.5); path(ctx, '#fff', null); }
        ellipse(ctx, 8, -8, 4.5, 5.5, L.eye, OUT, 1.5); ellipse(ctx, 9, -8, 1.6, 4, '#101020', null); glowCircle(ctx, 8, -8, 9, L.eye, 0.6);
      } else {
        [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 14, -6); ctx.lineTo(s * 34, -22); ctx.lineTo(s * 24, -4); ctx.lineTo(s * 34, 6); ctx.lineTo(s * 14, 8); path(ctx, fin, OUT, 2); });
        ctx.beginPath(); ctx.moveTo(-18, -8); ctx.quadraticCurveTo(-16, -24, 0, -24); ctx.quadraticCurveTo(16, -24, 18, -8); ctx.quadraticCurveTo(14, 14, 0, 18); ctx.quadraticCurveTo(-14, 14, -18, -8); path(ctx, rgrad(ctx, -4, -12, 30, shade(L.c1, 0.35), L.c2), OUT, 2.5);
        if (view !== 'back') { [-1, 1].forEach((s) => { ellipse(ctx, s * 9, -8, 4.5, 5.5, L.eye, OUT, 1.5); ellipse(ctx, s * 9, -8, 1.6, 4, '#101020', null); glowCircle(ctx, s * 9, -8, 9, L.eye, 0.6); ellipse(ctx, s * 4, 8, 1.4, 2, '#101020', null); });
          if (jaw > 0.3) { ctx.beginPath(); ctx.moveTo(-9, 10); ctx.quadraticCurveTo(0, 24, 9, 10); path(ctx, '#3a0a14', OUT, 2); } }
        else for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-5, -20 + k * 11); ctx.lineTo(0, -32 + k * 11); ctx.lineTo(5, -20 + k * 11); path(ctx, fin, OUT, 2); }
      }
      ctx.restore(); if (p.glow) glowCircle(ctx, hx, hy, 34 * p.glow, belly, 0.5);
    },
    // A kraken's young: a tall mantle with two great eyes, and arms that come up out of the water all round it.
    squid(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx, 0); const t = (f / 4) * Math.PI * 2, reach = anim === 'attack' ? [0, -0.3, 0.8, 0.3][f] : 0;
      const arm = (x, len, lean, ph) => { const tipx = x + lean * len + Math.sin(t + ph) * 5, tipy = -len; const c = () => { ctx.beginPath(); ctx.moveTo(x, 4); ctx.quadraticCurveTo(x - lean * 12, -len * 0.5, tipx, tipy); ctx.lineCap = 'round'; }; c(); path(ctx, null, OUT, 9); c(); path(ctx, null, L.c1, 5.5); for (let k = 1; k < 4; k++) ellipse(ctx, x + (tipx - x) * (k / 4) + 2, 4 + (tipy - 4) * (k / 4), 1.6, 1.6, shade(L.c1, 0.5), null); };
      arm(-36, 34 + reach * 14, -0.25 - reach * 0.4, 0); arm(36, 30 + reach * 14, 0.25 + reach * 0.4, 2); arm(-22, 22, -0.1, 1); arm(22, 24, 0.1, 3);
      const sq = p.squash, w = 22 / sq, hh = 60 * sq;
      ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(-w - 8, -hh * 0.55, -w * 0.5, -hh * 0.9); ctx.quadraticCurveTo(0, -hh * 1.15, w * 0.5, -hh * 0.9); ctx.quadraticCurveTo(w + 8, -hh * 0.55, w, 0); ctx.closePath(); path(ctx, rgrad(ctx, -6, -hh * 0.7, w * 2, shade(L.c1, 0.4), L.c2));
      for (let k = 0; k < 5; k++) ellipse(ctx, (k - 2) * 7 + (k % 2) * 2, -hh * (0.72 + (k % 3) * 0.07), 2.4, 3, shade(L.c2, -0.15), null); // spots on the mantle
      ctx.globalAlpha = 0.55; ellipse(ctx, -9, -hh * 0.82, 5, 9, '#ffffff', null, 0, -0.3); ctx.globalAlpha = 1;
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * w * 0.7, -hh * 0.72); ctx.lineTo(s * (w + 16), -hh * 0.6); ctx.lineTo(s * w * 0.9, -hh * 0.45); path(ctx, shade(L.c1, 0.15), OUT, 2); }); // fins on the mantle
      if (view !== 'back') { const ex = view === 'side' ? [6, 20] : [-11, 11]; ex.forEach((x) => { ellipse(ctx, x, -hh * 0.3, 7, 8.5, '#fff8d8', OUT, 2); ellipse(ctx, x + 1, -hh * 0.3, 3.2, 5.5, L.eye === '#ffe040' ? '#101020' : '#101020', null); glowCircle(ctx, x, -hh * 0.3, 11, L.eye, 0.5); }); }
      if (p.glow) glowCircle(ctx, 0, -hh * 0.6, 34 * p.glow, L.c1, 0.5);
    },
    // A hunting fish, seen leaping: jaws first, a tall back fin, the tail still in the water.
    fish(ctx, L, view, p, f, anim) {
      const leap = anim === 'attack' ? [0, -6, -14, -6][f] : Math.sin((f / 4) * Math.PI * 2) * 2; ctx.translate(p.dx, leap + p.bob * 0.4);
      const body = grad(ctx, -56, 0, shade(L.c1, 0.3), L.c2), belly = L.accent || '#e8f6f4', bite = anim === 'attack' && f >= 1;
      if (view === 'side') {
        ctx.save(); ctx.rotate(-0.5 + p.lean);
        ctx.beginPath(); ctx.moveTo(-34, -4); ctx.lineTo(-52, -18); ctx.lineTo(-46, -2); ctx.lineTo(-52, 12); path(ctx, shade(L.c1, 0.1), OUT, 2.5); // tail
        ctx.beginPath(); ctx.moveTo(-10, -18); ctx.lineTo(-2, -40); ctx.lineTo(10, -17); path(ctx, shade(L.c2, -0.1), OUT, 2.5); // back fin
        ctx.beginPath(); ctx.moveTo(-36, -2); ctx.quadraticCurveTo(-8, -26, 30, -10); ctx.lineTo(34, bite ? -2 : -6); ctx.quadraticCurveTo(0, 16, -36, -2); path(ctx, body);
        ctx.beginPath(); ctx.moveTo(-28, 2); ctx.quadraticCurveTo(2, 14, 28, bite ? 8 : 0); ctx.quadraticCurveTo(0, 8, -28, 2); path(ctx, belly, null);
        if (bite) { ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(36, -2); ctx.lineTo(30, 10); ctx.lineTo(12, 4); path(ctx, '#3a0a14', OUT, 2); }
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(16 + k * 5, -5); ctx.lineTo(18.5 + k * 5, bite ? 1 : -1); ctx.lineTo(21 + k * 5, -5); path(ctx, '#fff', null); }
        ellipse(ctx, 16, -11, 3.6, 3.6, L.eye, OUT, 1.5); ellipse(ctx, 17, -11, 1.4, 1.4, '#101020', null);
        ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(4, 16); ctx.lineTo(8, 3); path(ctx, shade(L.c1, 0.1), OUT, 2); ctx.restore();
      } else {
        ctx.beginPath(); ctx.moveTo(-5, -44); ctx.lineTo(0, -66); ctx.lineTo(6, -44); path(ctx, shade(L.c2, -0.1), OUT, 2.5);
        [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 14, -22); ctx.lineTo(s * 32, -14); ctx.lineTo(s * 16, -8); path(ctx, shade(L.c1, 0.1), OUT, 2); });
        ctx.beginPath(); ctx.moveTo(-14, 2); ctx.quadraticCurveTo(-22, -30, 0, -50); ctx.quadraticCurveTo(22, -30, 14, 2); ctx.closePath(); path(ctx, body);
        if (view !== 'back') { ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(0, -22, 9, 0); path(ctx, belly, null);
          ctx.beginPath(); ctx.moveTo(-11, -20); ctx.quadraticCurveTo(0, bite ? -4 : -14, 11, -20); ctx.quadraticCurveTo(0, -26, -11, -20); path(ctx, '#3a0a14', OUT, 2); for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 4 - 2, -22); ctx.lineTo(k * 4, -17); ctx.lineTo(k * 4 + 2, -22); path(ctx, '#fff', null); }
          [-1, 1].forEach((s) => { ellipse(ctx, s * 9, -32, 3.6, 3.6, L.eye, OUT, 1.5); ellipse(ctx, s * 9, -32, 1.4, 1.4, '#101020', null); }); }
      }
    },
    // A reef crab: a wide shell low in the water, eyes on stalks, and two heavy claws held up.
    crab(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx, 0); const snap = anim === 'attack' ? [0, -0.5, 0.7, 0.3][f] : Math.sin((f / 4) * Math.PI * 2) * 0.08, side = view === 'side';
      for (let i = 0; i < 3; i++) [-1, 1].forEach((s) => { const x = s * (16 + i * 7); ctx.beginPath(); ctx.moveTo(s * 12, -14); ctx.lineTo(x + s * 6, -22 + i * 2 + p.leg * 3 * s); ctx.lineTo(x + s * 12, 0); path(ctx, null, OUT, 5); ctx.beginPath(); ctx.moveTo(s * 12, -14); ctx.lineTo(x + s * 6, -22 + i * 2 + p.leg * 3 * s); ctx.lineTo(x + s * 12, 0); path(ctx, null, L.c2, 2.6); });
      const claw = (s) => { ctx.save(); ctx.translate(s * 22, -24); ctx.rotate(s * (-0.5 - snap)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 6, -18); path(ctx, null, OUT, 9); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 6, -18); path(ctx, null, L.c2, 5.5);
        ctx.translate(s * 7, -22); const open = 0.25 + Math.max(0, -snap) * 0.8; ctx.save(); ctx.rotate(-s * open); ctx.beginPath(); ctx.moveTo(-s * 6, 4); ctx.quadraticCurveTo(-s * 14, -14, s * 2, -24); ctx.quadraticCurveTo(s * 2, -8, s * 4, 4); ctx.closePath(); path(ctx, rgrad(ctx, 0, -10, 18, shade(L.c1, 0.35), L.c2)); ctx.restore();
        ctx.save(); ctx.rotate(s * open); ctx.beginPath(); ctx.moveTo(s * 2, 4); ctx.quadraticCurveTo(s * 14, -8, s * 8, -20); ctx.quadraticCurveTo(s * 4, -8, -s * 2, 4); ctx.closePath(); path(ctx, shade(L.c1, 0.15)); ctx.restore(); ctx.restore(); };
      if (!side) claw(-1); claw(1);
      ellipse(ctx, 0, -18, side ? 22 : 27, 15, rgrad(ctx, -6, -24, 30, shade(L.c1, 0.35), L.c2)); // the shell
      for (let k = -1; k <= 1; k++) ellipse(ctx, k * 10, -24, 3, 2, shade(L.c2, -0.15), null);
      ctx.globalAlpha = 0.5; ellipse(ctx, -9, -26, 8, 3, '#ffffff', null, 0, -0.2); ctx.globalAlpha = 1;
      if (view !== 'back') (side ? [10, 18] : [-8, 8]).forEach((x) => { ctx.beginPath(); ctx.moveTo(x, -30); ctx.lineTo(x, -40); path(ctx, null, OUT, 4); ctx.beginPath(); ctx.moveTo(x, -30); ctx.lineTo(x, -40); path(ctx, null, L.c1, 2); ellipse(ctx, x, -42, 3.6, 3.6, L.eye, OUT, 1.5); ellipse(ctx, x + 0.6, -42, 1.4, 1.4, '#101020', null); });
    },

    // ── bodies for the later stages, so each realm has shapes of its own ──
    // A walking mushroom: a stalk with a face under a wide spotted cap. caps: 3 makes a cluster; vines adds tendrils.
    shroom(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx, 0); const sq = p.squash, t = (f / 4) * Math.PI * 2, nod = anim === 'attack' ? [0, -0.12, 0.3, 0.1][f] : Math.sin(t) * 0.03;
      if (L.vines) for (let i = 0; i < 4; i++) { const x = -42 + i * 28, c = () => { ctx.beginPath(); ctx.moveTo(x * 0.4, -4); ctx.quadraticCurveTo(x, -34 + Math.sin(t + i) * 6, x + Math.sin(t * 1.3 + i) * 8, -8 - (i % 2) * 26); ctx.lineCap = 'round'; }; c(); path(ctx, null, OUT, 8); c(); path(ctx, null, shade(L.c1, -0.25), 4.5); }
      const one = (x, base, w, hh, lean, face) => { ctx.save(); ctx.translate(x, 0); ctx.rotate(lean);
        ctx.beginPath(); ctx.moveTo(-w * 0.34, 0); ctx.quadraticCurveTo(-w * 0.2, base * 0.6, -w * 0.26, base); ctx.lineTo(w * 0.26, base); ctx.quadraticCurveTo(w * 0.2, base * 0.6, w * 0.34, 0); ctx.closePath(); path(ctx, grad(ctx, base, 0, shade(L.c2, 0.2), shade(L.c2, -0.2)));
        if (face && view !== 'back') { const ex = view === 'side' ? [3, 11] : [-6, 6]; ex.forEach((e) => { ellipse(ctx, e, base * 0.5, 3, 4, '#101020', null); ellipse(ctx, e + 0.8, base * 0.5 - 1.2, 1, 1.2, '#fff', null); }); ctx.beginPath(); ctx.arc(view === 'side' ? 7 : 0, base * 0.28, 4, 0.15, Math.PI - 0.15); path(ctx, null, '#101020', 2); }
        ctx.beginPath(); ctx.moveTo(-w, base + 5); ctx.quadraticCurveTo(-w * 1.08, base - hh * 1.3, 0, base - hh * 1.5); ctx.quadraticCurveTo(w * 1.08, base - hh * 1.3, w, base + 5); ctx.quadraticCurveTo(0, base - 5, -w, base + 5); path(ctx, rgrad(ctx, -w * 0.3, base - hh, w * 1.5, shade(L.c1, 0.4), shade(L.c1, -0.3)));
        [[-0.5, 0.5, 0.2], [0.35, 0.8, 0.16], [0.05, 1.1, 0.13], [0.62, 0.35, 0.1], [-0.72, 0.15, 0.09]].forEach(([sx, sy, r]) => { ellipse(ctx, sx * w, base - hh * sy, r * w, r * w * 0.8, L.spots, null); }); glowCircle(ctx, 0, base - hh * 0.7, w * 0.9, L.spots, 0.25 + (p.glow || 0) * 0.5);
        ctx.restore(); };
      if ((L.caps || 1) >= 3) { one(-30, -22 * sq, 15, 13, -0.22 + nod * 0.5, false); one(30, -26 * sq, 17, 14, 0.2 - nod * 0.5, false); }
      one(0, -32 * sq, 27 / sq, 22 * sq, nod, true);
    },
    // A cave spider: eight legs arched high, a fat marked abdomen, a cluster of eyes over two fangs.
    spider(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx, p.bob * 0.4); const t = (f / 4) * Math.PI * 2, bite = anim === 'attack' ? [0, -3, 7, 2][f] : 0;
      for (let i = 0; i < 4; i++) [-1, 1].forEach((s) => { const kx = s * (24 + i * 6), ky = -44 + i * 7 + Math.sin(t + i * 1.5 + (s > 0 ? 1.6 : 0)) * (anim === 'walk' ? 5 : 1.5), fx = s * (36 + i * 5), c = () => { ctx.beginPath(); ctx.moveTo(s * 8, -18); ctx.lineTo(kx, ky); ctx.lineTo(fx, 0); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }; c(); path(ctx, null, OUT, 5.5); c(); path(ctx, null, L.c2, 3); });
      ellipse(ctx, 0, -36, 22, 19, rgrad(ctx, -6, -44, 28, shade(L.c1, 0.35), L.c2));
      ctx.beginPath(); ctx.moveTo(-6, -46); ctx.lineTo(6, -46); ctx.lineTo(0, -38); ctx.lineTo(6, -30); ctx.lineTo(-6, -30); ctx.lineTo(0, -38); ctx.closePath(); path(ctx, L.eye, null);
      ellipse(ctx, 0, -14 + bite * 0.4, 14, 12, rgrad(ctx, -3, -18, 18, shade(L.c1, 0.25), L.c2));
      if (view !== 'back') { const y = -16 + bite * 0.4; [[-5, 0, 3.2], [5, 0, 3.2], [-11, -3, 2], [11, -3, 2], [-3, -6, 1.6], [3, -6, 1.6]].forEach(([x, dy, r]) => { ellipse(ctx, x, y + dy, r, r, L.eye, null); ellipse(ctx, x + 0.5, y + dy - 0.5, r * 0.35, r * 0.35, '#fff', null); }); glowCircle(ctx, 0, y, 14, L.eye, 0.35);
        [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 3, -6 + bite * 0.4); ctx.lineTo(s * 6, 3 + bite); ctx.lineTo(s * 8, -6 + bite * 0.4); path(ctx, '#f4ecd8', OUT, 1.5); }); }
    },
    // A clockwork drone: a toothed wheel with a lens for an eye, held up by one rotor.
    drone(ctx, L, view, p, f) {
      ctx.translate(p.dx, -36 + Math.sin((f / 4) * Math.PI * 2) * 3); const lens = L.glow || '#80e0ff';
      ctx.fillStyle = OUT; ctx.fillRect(-2, -32, 4, 14); ellipse(ctx, 0, -33, 8 + 22 * Math.abs(Math.cos(f * 1.3)), 3.5, shade(L.c1, 0.3), OUT, 2);
      for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate((i / 8) * Math.PI * 2 + f * 0.2); ctx.beginPath(); ctx.rect(-4.5, -24, 9, 9); path(ctx, L.c2, OUT, 2); ctx.restore(); }
      ellipse(ctx, 0, 0, 18, 18, rgrad(ctx, -5, -6, 24, shade(L.c1, 0.4), L.c2)); ellipse(ctx, 0, 0, 12, 12, shade(L.c2, -0.2), OUT, 2);
      [-1, 1].forEach((s) => { const c = () => { ctx.beginPath(); ctx.moveTo(s * 14, 10); ctx.lineTo(s * 24, 18); ctx.lineTo(s * 19, 26 + p.arm * 2); }; c(); path(ctx, null, OUT, 5); c(); path(ctx, null, L.c1, 2.5); });
      if (view !== 'back') { const ex = view === 'side' ? 5 : 0; ellipse(ctx, ex, 0, 7.5, 7.5, '#101822', OUT, 2); ellipse(ctx, ex, 0, 4.5, 4.5, lens, null); ellipse(ctx, ex - 1.5, -1.5, 1.5, 1.5, '#fff', null); glowCircle(ctx, ex, 0, 12, lens, 0.6 + (p.glow || 0) * 0.4); }
      else { ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(6, -4); ctx.moveTo(-6, 2); ctx.lineTo(6, 2); path(ctx, null, OUT, 2); }
    },
    // A siege engine on treads: a riveted hull, a domed turret, one long gun that kicks back when it fires.
    tank(ctx, L, view, p, f, anim) {
      ctx.translate(p.dx * 0.4, 0); const kick = anim === 'attack' ? [0, 2, -8, -3][f] : 0, lens = L.accent || '#80e0ff', side = view === 'side';
      rrect(ctx, -36, -16, 72, 16, 8, '#1c1a1a'); for (let i = 0; i < 5; i++) ellipse(ctx, -28 + i * 14, -8, 5.5, 5.5, shade(L.c2, 0.15), OUT, 1.5); // treads
      ctx.beginPath(); ctx.moveTo(-32, -16); ctx.lineTo(-26, -40); ctx.lineTo(26, -40); ctx.lineTo(32, -16); ctx.closePath(); path(ctx, grad(ctx, -40, -16, shade(L.c1, 0.3), L.c2));
      for (let i = 0; i < 5; i++) ellipse(ctx, -22 + i * 11, -20, 1.6, 1.6, shade(L.c2, -0.3), null);
      ctx.fillStyle = OUT; ctx.fillRect(-24, -62, 6, 22); ctx.fillStyle = shade(L.c2, 0.1); ctx.fillRect(-23, -61, 4, 20); if (f % 2) { ctx.globalAlpha = 0.5; ellipse(ctx, -21, -68, 6, 5, '#c8c8c8', null); ctx.globalAlpha = 1; } // smokestack
      if (side) { ctx.fillStyle = OUT; ctx.fillRect(6 + kick, -58, 44, 11); ctx.fillStyle = shade(L.c1, 0.1); ctx.fillRect(8 + kick, -56, 40, 7); ctx.fillStyle = OUT; ctx.fillRect(44 + kick, -60, 8, 15); if (anim === 'attack' && f === 2) glowCircle(ctx, 56, -52, 18, '#ffd080', 1); }
      ctx.beginPath(); ctx.arc(0, -40, 20, Math.PI, 0); ctx.closePath(); path(ctx, rgrad(ctx, -6, -52, 26, shade(L.c1, 0.45), L.c2));
      if (!side) { ellipse(ctx, 0, -48 - kick * 0.3, 8, 8, '#101010', OUT, 2.5); ellipse(ctx, 0, -48 - kick * 0.3, 4, 4, '#2a2a2a', null); if (anim === 'attack' && f === 2) glowCircle(ctx, 0, -48, 20, '#ffd080', 1); }
      if (view !== 'back') { const ex = side ? 10 : 0; ctx.fillStyle = OUT; ctx.fillRect(ex - 12, -33, 24, 8); ctx.fillStyle = lens; ctx.fillRect(ex - 10, -31, 20, 4); glowCircle(ctx, ex, -29, 12, lens, 0.5 + (p.glow || 0) * 0.5); }
    },
    // A thing made of fire: a tall flame with a white-hot heart, two eyes, and arms it throws out to strike.
    flame(ctx, L, view, p, f, anim) {
      const t = (f / 4) * Math.PI * 2, lash = anim === 'attack' ? [0, -0.3, 0.9, 0.3][f] : 0; ctx.translate(p.dx, -10 + Math.sin(t) * 2);
      const tongue = (x, w, hh, col, ph) => { ctx.beginPath(); ctx.moveTo(x - w, 6); ctx.bezierCurveTo(x - w * 1.5, -hh * 0.5, x - w * 0.2 + Math.sin(t + ph) * 5, -hh * 0.7, x + Math.sin(t * 1.3 + ph) * 6, -hh); ctx.bezierCurveTo(x + w * 0.3, -hh * 0.6, x + w * 1.5, -hh * 0.4, x + w, 6); ctx.closePath(); path(ctx, col, null); };
      glowCircle(ctx, 0, -30, 46, L.c1, 0.5 + (p.glow || 0) * 0.4);
      [-1, 1].forEach((s) => { ctx.save(); ctx.translate(s * 14, -26); ctx.rotate(s * (0.9 + lash * 0.8)); tongue(0, 6, 26 + lash * 14, L.c2, s); ctx.restore(); }); // arms
      tongue(0, 24, 74, L.c2, 0); tongue(-2, 18, 58, L.c1, 1); tongue(0, 11, 38, L.glow || '#fff0b0', 2);
      if (view !== 'back') { const ex = view === 'side' ? [2, 12] : [-7, 7]; ex.forEach((x) => { ellipse(ctx, x, -24, 3.6, 5.5, '#2a0a04', null); ellipse(ctx, x + 0.8, -26, 1.2, 1.6, '#fff', null); }); ctx.beginPath(); ctx.arc(view === 'side' ? 7 : 0, -14, 6, 0.1, Math.PI - 0.1); path(ctx, anim === 'attack' ? '#2a0a04' : null, '#2a0a04', 2); }
      for (let i = 0; i < 4; i++) { const ph = (f / 4 + i * 0.27) % 1; ellipse(ctx, -18 + i * 12 + Math.sin(i * 3) * 4, -40 - ph * 44, 2.2 * (1 - ph), 2.2 * (1 - ph), L.glow || '#fff0b0', null); } // sparks rising off it
    },
    // A watching eye adrift in the dark, trailing tendrils.
    eye(ctx, L, view, p, f, anim) {
      const t = (f / 4) * Math.PI * 2; ctx.translate(p.dx, -40 + Math.sin(t) * 3); const open = anim === 'hurt' ? 0.35 : anim === 'attack' ? 1.15 : 1;
      for (let i = 0; i < 5; i++) { const x = -20 + i * 10, c = () => { ctx.beginPath(); ctx.moveTo(x, 12); ctx.quadraticCurveTo(x + Math.sin(t + i) * 9, 28, x + Math.sin(t * 1.4 + i) * 10, 40 - (i % 2) * 8); ctx.lineCap = 'round'; }; c(); path(ctx, null, OUT, 6.5); c(); path(ctx, null, L.c1, 3.5); }
      ellipse(ctx, 0, 0, 27, 24, rgrad(ctx, -8, -8, 34, shade(L.c1, 0.3), L.c2)); glowCircle(ctx, 0, 0, 40, L.eye, 0.25 + (p.glow || 0) * 0.5);
      if (view === 'back') { for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, 8 + i * 5, 0.3 + i, 2.2 + i); path(ctx, null, shade(L.c2, 0.2), 1.5); } return; }
      const ex = view === 'side' ? 9 : 0; ctx.save(); ctx.beginPath(); ctx.ellipse(ex, 0, view === 'side' ? 13 : 19, 14 * open, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#fbf6e4'; ctx.fillRect(-30, -30, 60, 60); ellipse(ctx, ex + (view === 'side' ? 3 : 0), 0, 10, 10, L.eye, null); ctx.beginPath(); ctx.ellipse(ex + (view === 'side' ? 4 : 0), 0, anim === 'attack' ? 1.8 : 3.4, 8, 0, 0, Math.PI * 2); ctx.fillStyle = '#0a0612'; ctx.fill(); ellipse(ctx, ex - 4, -4, 2.4, 2.4, '#fff', null); ctx.restore();
      ctx.beginPath(); ctx.ellipse(ex, 0, view === 'side' ? 13 : 19, 14 * open, 0, 0, Math.PI * 2); path(ctx, null, OUT, 2.5);
      for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 19); ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 28); path(ctx, null, OUT, 2.5); } // lashes
    },
    // A carrion bird on the wing: a hunched body, a bare hooked neck, wings that beat wide.
    bird(ctx, L, view, p, f, anim) {
      const flap = Math.sin((f / 4) * Math.PI * 2), dive = anim === 'attack' ? [0, -6, 12, 4][f] : 0; ctx.translate(p.dx + dive * 0.4, -46 + flap * 3 + Math.abs(dive) * 0.5);
      const wing = (s) => { ctx.save(); ctx.translate(s * 9, -6); ctx.rotate(s * (-0.35 - flap * 0.5)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 26, -22, s * 50, -8); ctx.lineTo(s * 44, 2); ctx.lineTo(s * 38, -2); ctx.lineTo(s * 32, 8); ctx.lineTo(s * 26, 2); ctx.lineTo(s * 20, 12); ctx.lineTo(s * 12, 5); ctx.lineTo(0, 12); ctx.closePath(); path(ctx, grad(ctx, -22, 12, shade(L.c1, 0.2), L.c2)); ctx.restore(); };
      if (view === 'side') wing(-1); else { wing(-1); wing(1); }
      ctx.beginPath(); ctx.moveTo(-4, 14); ctx.lineTo(-10, 30); ctx.lineTo(0, 24); ctx.lineTo(10, 30); ctx.lineTo(4, 14); path(ctx, L.c2); // tail
      ellipse(ctx, 0, 4, 13, 17, rgrad(ctx, -4, -4, 20, shade(L.c1, 0.3), L.c2));
      ellipse(ctx, 0, -9, 13, 6, '#f0e8d8', OUT, 2); // ruff
      const hx = view === 'side' ? 12 : 0, hy = -22 + dive * 0.3; const c = () => { ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(hx * 0.3 - 6, -18, hx, hy); ctx.lineCap = 'round'; }; c(); path(ctx, null, OUT, 9); c(); path(ctx, null, L.skin || '#d8a090', 5.5);
      ellipse(ctx, hx, hy, 7.5, 7, L.skin || '#d8a090');
      if (view !== 'back') { if (view === 'side') { ctx.beginPath(); ctx.moveTo(hx + 5, hy - 3); ctx.quadraticCurveTo(hx + 18, hy - 2, hx + 15, hy + 9); ctx.lineTo(hx + 5, hy + 3); ctx.closePath(); path(ctx, '#e0b040', OUT, 2); ellipse(ctx, hx + 2, hy - 2, 2.2, 2.2, L.eye, OUT, 1); }
        else { ctx.beginPath(); ctx.moveTo(-4, hy); ctx.lineTo(0, hy + 12); ctx.lineTo(4, hy); ctx.closePath(); path(ctx, '#e0b040', OUT, 2); [-1, 1].forEach((s) => ellipse(ctx, s * 4, hy - 2, 2.2, 2.2, L.eye, OUT, 1)); } }
      if (view === 'side') wing(1);
    },

    turret(ctx, L, view, p, f, anim) {
      [-1, 0, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(s * 18, 0); path(ctx, null, OUT, 6); ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(s * 18, 0); path(ctx, null, L.c2, 3); });
      rrect(ctx, -14, -38, 28, 20, 5, grad(ctx, -38, -18, shade(L.c1, 0.3), L.c2));
      const recoil = anim === 'attack' ? [0, -2, -6, -3][f] : 0;
      rrect(ctx, (view === 'back' ? -6 : 4) + recoil, -34, 26, 9, 3, grad(ctx, -34, -25, '#c0c8d0', '#5a6068'));
      glowCircle(ctx, 0, -28, 8 + Math.sin(f * 1.6) * 2, L.accent, 0.9);
      if (anim === 'attack' && f === 2) glowCircle(ctx, 32, -30, 16, '#ffd060', 1);
    },

    // A thorn nest: a bramble mound with glowing eggs. It swells when it hatches (cast).
    nest(ctx, L, view, p, f, anim) {
      const pulse = anim === 'cast' ? 1 : 0.55 + Math.sin(f * 1.6) * 0.15;
      ctx.save(); ctx.scale(1.7, 1.7);
      ellipse(ctx, 0, -13, 31, 15, grad(ctx, -30, 0, shade(L.c1, 0.25), L.c2));
      [-1, 1].forEach((s) => [0, 1].forEach((i) => {
        const cane = () => { ctx.beginPath(); ctx.moveTo(s * (27 - i * 9), -8); ctx.quadraticCurveTo(s * (32 - i * 8), -46 - i * 8, s * (5 + i * 5), -40 - i * 10); };
        cane(); path(ctx, null, OUT, 7); cane(); path(ctx, null, i ? shade(L.c1, 0.2) : L.c1, 4);
        ctx.fillStyle = L.c2; [[s * (29 - i * 8), -30 - i * 6], [s * (20 - i * 6), -42 - i * 8]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 6, y - 5); ctx.lineTo(x + s * 1, y + 4); ctx.fill(); });
      }));
      [[-12, -17, 7], [11, -16, 7], [0, -24, 9]].forEach(([x, y, r]) => { ellipse(ctx, x, y, r * 0.8, r, rgrad(ctx, x, y, r, '#ffffff', L.accent)); glowCircle(ctx, x, y, r * 2, L.accent, pulse * 0.7); });
      ctx.restore();
    },

    barricade(ctx, L) {
      for (let i = -1; i <= 1; i++) { ctx.save(); ctx.translate(i * 16, 0); ctx.rotate(i * 0.08); rrect(ctx, -9, -46 + Math.abs(i) * 6, 18, 46 - Math.abs(i) * 6, 3, grad(ctx, -46, 0, shade(L.c1, 0.4), L.c2)); ctx.fillStyle = '#2a2a30'; [[-4, -36], [4, -36], [-4, -10], [4, -10]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y + Math.abs(i) * 6, 1.6, 0, 7); ctx.fill(); }); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(-26, -24); ctx.lineTo(26, -24); path(ctx, null, '#5a5a60', 4);
    },
  };
}

// ───────── Card art & icons (UI) ─────────
const iconCache = new Map();
export function iconCanvas(name, color = '#fff', size = 64) {
  const k = name + color + size;
  if (iconCache.has(k)) return iconCache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.scale(size / 64, size / 64); ctx.translate(32, 32);
  drawIcon(ctx, name, color);
  const url = c.toDataURL();
  iconCache.set(k, url);
  return url;
}

export function drawIcon(ctx, name, color) {
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 4;
  const P = (pts, close = true) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (close) ctx.closePath(); };
  switch (name) {
    case 'bag': ctx.beginPath(); ctx.arc(0, -12, 9, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-19, -12, 38, 36, 9); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.roundRect(-19, -12, 38, 14, [9, 9, 3, 3]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.roundRect(-5, -3, 10, 10, 2); ctx.fill(); break;
    case 'sword': P([[-3, 14], [-3, -22], [0, -27], [3, -22], [3, 14]]); ctx.fill(); ctx.fillRect(-11, 12, 22, 4); ctx.fillRect(-2, 16, 4, 10); break;
    case 'shield': P([[-16, -18], [16, -18], [16, 0], [0, 22], [-16, 0]]); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-2, -14, 4, 28); ctx.fillRect(-12, -4, 24, 4); break;
    case 'boot': P([[-8, -20], [6, -20], [6, 6], [20, 12], [20, 20], [-10, 20]]); ctx.fill(); break;
    case 'roar': for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-10, 0, 8 + i * 9, -0.8, 0.8); ctx.stroke(); } ctx.beginPath(); ctx.arc(-14, 0, 6, 0, 7); ctx.fill(); break;
    case 'whirl': for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 8 + i * 7, i, i + 3.6); ctx.stroke(); } break;
    case 'banner': ctx.fillRect(-14, -24, 3, 48); P([[-11, -22], [16, -22], [8, -10], [16, 2], [-11, 2]]); ctx.fill(); break;
    case 'heart': ctx.beginPath(); ctx.moveTo(0, 20); ctx.bezierCurveTo(-30, 0, -14, -26, 0, -10); ctx.bezierCurveTo(14, -26, 30, 0, 0, 20); ctx.fill(); break;
    case 'quake': P([[-24, 18], [-10, -4], [-2, 8], [6, -14], [14, 4], [24, -20]], false); ctx.stroke(); ctx.fillRect(-26, 18, 52, 5); break;
    case 'flame': ctx.beginPath(); ctx.moveTo(0, -26); ctx.bezierCurveTo(18, -6, 20, 18, 0, 22); ctx.bezierCurveTo(-20, 18, -18, -2, -6, -10); ctx.bezierCurveTo(-6, 0, 0, 2, 0, -26); ctx.fill(); break;
    case 'snow': for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate((i * Math.PI) / 3); ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, 24); ctx.moveTo(-6, -16); ctx.lineTo(0, -10); ctx.lineTo(6, -16); ctx.moveTo(-6, 16); ctx.lineTo(0, 10); ctx.lineTo(6, 16); ctx.stroke(); ctx.restore(); } break;
    case 'orb': ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.lineWidth = 2; ctx.stroke(); break;
    case 'blink': ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); break;
    case 'star': P(Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 10 : 24, a = (i / 10) * Math.PI * 2 - Math.PI / 2; return [Math.cos(a) * r, Math.sin(a) * r]; })); ctx.fill(); break;
    case 'bolt': P([[4, -26], [-12, 4], [0, 4], [-4, 26], [12, -4], [0, -4]]); ctx.fill(); break;
    case 'meteor': ctx.beginPath(); ctx.arc(8, 8, 12, 0, 7); ctx.fill(); ctx.lineWidth = 4; [[-6, -6], [-14, 2], [2, -14]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y - 12); ctx.stroke(); }); break;
    case 'arrow': ctx.beginPath(); ctx.moveTo(-20, 20); ctx.lineTo(18, -18); ctx.stroke(); P([[22, -22], [8, -18], [18, -8]]); ctx.fill(); ctx.beginPath(); ctx.moveTo(-20, 20); ctx.lineTo(-20, 10); ctx.moveTo(-20, 20); ctx.lineTo(-10, 20); ctx.stroke(); break;
    case 'arrows': [-10, 0, 10].forEach((o) => { ctx.beginPath(); ctx.moveTo(o - 6, 22); ctx.lineTo(o + 6, -14); ctx.stroke(); P([[o + 8, -22], [o + 1, -12], [o + 11, -10]]); ctx.fill(); }); break;
    case 'eye': ctx.beginPath(); ctx.moveTo(-24, 0); ctx.quadraticCurveTo(0, -22, 24, 0); ctx.quadraticCurveTo(0, 22, -24, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); break;
    case 'wind': for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-22, -12 + i * 12); ctx.lineTo(10, -12 + i * 12); ctx.arc(10, -18 + i * 12, 6, Math.PI / 2, -Math.PI / 2, true); ctx.stroke(); } break;
    case 'trap': ctx.beginPath(); ctx.arc(0, 4, 18, Math.PI, 0); ctx.stroke(); for (let i = -2; i <= 2; i++) { P([[i * 7 - 3, 4], [i * 7, -8], [i * 7 + 3, 4]]); ctx.fill(); } ctx.fillRect(-22, 4, 44, 4); break;
    case 'dagger': P([[-2, 8], [0, -24], [2, 8]]); ctx.fill(); ctx.fillRect(-8, 8, 16, 3); ctx.fillRect(-2, 11, 4, 10); break;
    case 'smoke': [[-8, 4, 12], [8, 2, 12], [0, -8, 13], [0, 10, 10]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }); break;
    case 'skull': ctx.beginPath(); ctx.arc(0, -4, 18, 0, 7); ctx.fill(); ctx.fillRect(-10, 8, 20, 12); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(-7, -4, 5, 0, 7); ctx.arc(7, -4, 5, 0, 7); ctx.fill(); break;
    case 'sun': ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.stroke(); } break;
    case 'cross': ctx.fillRect(-5, -22, 10, 44); ctx.fillRect(-18, -9, 36, 10); break;
    case 'mace': ctx.fillRect(-2, -2, 4, 26); ctx.beginPath(); ctx.arc(0, -10, 11, 0, 7); ctx.fill(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, -10 + Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * 17, -10 + Math.sin(a) * 17); ctx.stroke(); } break;
    case 'phoenix': ctx.beginPath(); ctx.moveTo(0, 22); ctx.quadraticCurveTo(-30, -6, -22, -24); ctx.quadraticCurveTo(-10, -6, 0, -20); ctx.quadraticCurveTo(10, -6, 22, -24); ctx.quadraticCurveTo(30, -6, 0, 22); ctx.fill(); break;
    case 'hammer': ctx.fillRect(-2, -8, 5, 32); ctx.fillRect(-16, -22, 32, 14); break;
    case 'anvil': P([[-22, -10], [18, -10], [24, -16], [24, -4], [10, 2], [10, 10], [16, 18], [-14, 18], [-8, 10], [-8, 2], [-22, -2]]); ctx.fill(); break;
    case 'turret': ctx.fillRect(-12, -6, 24, 14); ctx.fillRect(4, -4, 22, 6); P([[-14, 8], [-20, 22], [20, 22], [14, 8]]); ctx.fill(); break;
    case 'wrench': ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-16, 16); ctx.lineTo(8, -8); ctx.stroke(); ctx.beginPath(); ctx.arc(12, -12, 10, 0.8, 5.5); ctx.stroke(); break;
    case 'leaf': ctx.beginPath(); ctx.moveTo(-20, 20); ctx.quadraticCurveTo(-20, -20, 22, -22); ctx.quadraticCurveTo(20, 20, -20, 20); ctx.fill(); break;
    case 'potion': ctx.fillRect(-5, -24, 10, 10); ctx.beginPath(); ctx.arc(0, 6, 16, 0, 7); ctx.fill(); break;
    case 'bomb': ctx.beginPath(); ctx.arc(-2, 6, 16, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(14, -20, 22, -18); ctx.stroke(); break;
    case 'staff': ctx.fillRect(-2, -14, 4, 38); ctx.beginPath(); ctx.arc(0, -18, 9, 0, 7); ctx.fill(); break;
    case 'bow': ctx.beginPath(); ctx.arc(-8, 0, 24, -1.2, 1.2); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(1, -22); ctx.lineTo(1, 22); ctx.stroke(); break;
    case 'armor': P([[-18, -20], [-6, -22], [0, -16], [6, -22], [18, -20], [16, 4], [12, 22], [-12, 22], [-16, 4]]); ctx.fill(); break;
    case 'vest': P([[-16, -20], [-4, -20], [0, -12], [4, -20], [16, -20], [14, 22], [-14, 22]]); ctx.fill(); break;
    case 'robe': P([[-10, -22], [10, -22], [22, 22], [-22, 22]]); ctx.fill(); break;
    case 'ring': ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 6, 14, 0, 7); ctx.stroke(); P([[-6, -10], [0, -20], [6, -10], [0, -6]]); ctx.fill(); break;
    case 'amulet': ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -10, 16, Math.PI, 0); ctx.stroke(); P([[0, -6], [12, 6], [0, 22], [-12, 6]]); ctx.fill(); break;
    case 'boots': P([[-16, -20], [-2, -20], [-2, 4], [12, 8], [14, 20], [-16, 20]]); ctx.fill(); break;
    case 'coin': ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.font = 'bold 22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('G', 0, 1); break;
    case 'gem': P([[-14, -8], [-6, -18], [6, -18], [14, -8], [0, 20]]); ctx.fill(); break;
    case 'drop': ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(20, 4, 0, 20); ctx.quadraticCurveTo(-20, 4, 0, -24); ctx.fill(); break;
    case 'book': ctx.fillRect(-18, -20, 36, 40); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-1, -20, 2, 40); break;
    case 'ghost': ctx.beginPath(); ctx.arc(0, -4, 16, Math.PI, 0); ctx.lineTo(16, 20); ctx.lineTo(8, 14); ctx.lineTo(0, 20); ctx.lineTo(-8, 14); ctx.lineTo(-16, 20); ctx.closePath(); ctx.fill(); break;
    case 'chest': ctx.fillRect(-20, -6, 40, 24); ctx.beginPath(); ctx.moveTo(-20, -6); ctx.quadraticCurveTo(0, -24, 20, -6); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-3, -4, 6, 8); break;
    case 'camp': P([[-22, 18], [0, -20], [22, 18]]); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; P([[-6, 18], [0, 4], [6, 18]]); ctx.fill(); break;
    case 'crown': P([[-20, 14], [-20, -12], [-10, 0], [0, -18], [10, 0], [20, -12], [20, 14]]); ctx.fill(); break;
    case 'horns': ctx.beginPath(); ctx.arc(0, 6, 12, 0, 7); ctx.fill(); [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 8, -2); ctx.quadraticCurveTo(s * 26, -6, s * 22, -26); ctx.quadraticCurveTo(s * 16, -10, s * 2, -6); ctx.fill(); }); break;
    case 'question': ctx.font = 'bold 44px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 2); break;
    case 'shrine': P([[-18, 20], [-14, -8], [0, -22], [14, -8], [18, 20]]); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(0, 4, 6, 0, 7); ctx.fill(); break;
    case 'flag': ctx.fillRect(-14, -24, 4, 48); P([[-10, -22], [18, -14], [-10, -4]]); ctx.fill(); break;
    default: ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill();
  }
}
