// Skill effects — what a card looks like when it resolves. Every effect is built from a small set of
// white shapes painted once by code (a crescent, a crystal, a flame, a rune circle…), tinted by the
// card's element and animated as billboards, ground decals and particles. What plays is chosen from the
// card itself: its element, its icon, how it travels (melee, projectile, line, cone, area, burst) and
// what it does (damage, block, heal, buff), so two different cards rarely look alike.
import * as THREE from 'three';
import { tween, Ease, sleep, clamp } from '../core/util.js';
import { audio } from '../core/audio.js';
import { elColor } from './renderer.js';

const EL_SFX = { fire: 'fire', ice: 'ice', wind: 'wind', earth: 'earth', holy: 'holy', shadow: 'shadow', poison: 'poison', neutral: 'slash', arcane: 'magic' };

// ───────── shapes (painted once, cached) ─────────
const W = '#fff'; const CLEAR = 'rgba(255,255,255,0)';
const PAINT = {
  // a crescent that bulges upward: a blade's arc
  slash(g) {
    const gr = g.createLinearGradient(6, 0, 122, 0); gr.addColorStop(0, CLEAR); gr.addColorStop(0.3, W); gr.addColorStop(0.72, W); gr.addColorStop(1, CLEAR);
    g.fillStyle = gr; g.beginPath(); g.moveTo(6, 86); g.quadraticCurveTo(64, -6, 122, 86); g.quadraticCurveTo(64, 40, 6, 86); g.fill();
  },
  spark(g) {
    g.translate(64, 64); g.fillStyle = W; g.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = i % 2 ? 7 : i % 4 ? 34 : 60; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.fill();
  },
  // a long crystal pointing right
  shard(g) {
    const gr = g.createLinearGradient(0, 44, 0, 84); gr.addColorStop(0, W); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, W);
    g.fillStyle = gr; g.beginPath(); g.moveTo(124, 64); g.lineTo(52, 46); g.lineTo(4, 64); g.lineTo(52, 82); g.fill();
  },
  flame(g) {
    const gr = g.createRadialGradient(64, 86, 4, 64, 78, 52); gr.addColorStop(0, W); gr.addColorStop(0.55, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, CLEAR);
    g.fillStyle = gr; g.beginPath(); g.moveTo(64, 4); g.bezierCurveTo(74, 40, 108, 58, 100, 92); g.bezierCurveTo(96, 118, 32, 118, 28, 92); g.bezierCurveTo(22, 62, 52, 44, 64, 4); g.fill();
  },
  rock(g) {
    g.fillStyle = W; g.beginPath(); [[24, 44], [58, 16], [100, 30], [112, 72], [82, 108], [36, 100], [14, 72]].forEach(([x, y]) => g.lineTo(x, y)); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); [[58, 16], [100, 30], [112, 72], [70, 60]].forEach(([x, y]) => g.lineTo(x, y)); g.fill();
  },
  swirl(g) {
    g.translate(64, 64); g.strokeStyle = W; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) { g.rotate((Math.PI * 2) / 3); for (let k = 0; k < 14; k++) { g.lineWidth = 1 + k * 0.6; g.globalAlpha = (k + 1) / 14; g.beginPath(); g.arc(0, 0, 24 + i * 12, k * 0.11, k * 0.11 + 0.14); g.stroke(); } }
  },
  // a rune circle: two rings, a six-pointed star and tick marks
  circle(g) {
    g.translate(64, 64); g.strokeStyle = W; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 58, 0, 7); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 49, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 22, 0, 7); g.stroke();
    for (let t = 0; t < 2; t++) { g.beginPath(); for (let i = 0; i < 3; i++) { const a = t * Math.PI + (i / 3) * Math.PI * 2 - Math.PI / 2; g.lineTo(Math.cos(a) * 49, Math.sin(a) * 49); } g.closePath(); g.stroke(); }
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 51, Math.sin(a) * 51); g.lineTo(Math.cos(a) * 56, Math.sin(a) * 56); g.stroke(); }
  },
  shock(g) {
    const gr = g.createRadialGradient(64, 64, 20, 64, 64, 63); gr.addColorStop(0, CLEAR); gr.addColorStop(0.72, 'rgba(255,255,255,0.3)'); gr.addColorStop(0.9, W); gr.addColorStop(1, CLEAR);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  },
  crack(g) {
    let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    g.translate(64, 64); g.strokeStyle = W; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 7; i++) {
      let a = (i / 7) * Math.PI * 2 + rnd() * 0.5; let x = 0, y = 0; const n = 4 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) { g.lineWidth = 4.5 * (1 - k / n) + 0.8; g.beginPath(); g.moveTo(x, y); a += (rnd() - 0.5) * 0.9; x += Math.cos(a) * 11; y += Math.sin(a) * 11; g.lineTo(x, y); g.stroke(); }
    }
  },
  // lightning, top to bottom
  bolt(g) {
    g.strokeStyle = W; g.lineJoin = 'miter'; g.shadowColor = W; g.shadowBlur = 10; g.lineWidth = 7;
    g.beginPath(); [[70, 0], [48, 34], [74, 46], [42, 84], [66, 92], [52, 128]].forEach(([x, y]) => g.lineTo(x, y)); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(74, 46); g.lineTo(98, 70); g.lineTo(90, 86); g.stroke();
  },
  pillar(g) {
    const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, CLEAR); gr.addColorStop(0.5, W); gr.addColorStop(1, CLEAR);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = 'destination-in'; const v = g.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, CLEAR); v.addColorStop(0.35, W); v.addColorStop(0.8, W); v.addColorStop(1, CLEAR); g.fillStyle = v; g.fillRect(0, 0, 128, 128);
  },
  cross(g) { g.fillStyle = W; g.fillRect(50, 14, 28, 100); g.fillRect(14, 50, 100, 28); },
  bubble(g) { g.strokeStyle = W; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 46, 0, 7); g.stroke(); g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(64, 64, 30, 3.6, 4.5); g.stroke(); },
  // an arrow flying right
  arrow(g) {
    g.strokeStyle = W; g.fillStyle = W; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(14, 64); g.lineTo(100, 64); g.stroke();
    g.beginPath(); g.moveTo(124, 64); g.lineTo(96, 50); g.lineTo(96, 78); g.fill();
    g.lineWidth = 4; g.beginPath(); g.moveTo(6, 50); g.lineTo(22, 64); g.lineTo(6, 78); g.moveTo(18, 50); g.lineTo(34, 64); g.lineTo(18, 78); g.stroke();
  },
  shield(g) {
    g.beginPath(); g.moveTo(64, 8); g.lineTo(112, 24); g.bezierCurveTo(112, 74, 96, 104, 64, 122); g.bezierCurveTo(32, 104, 16, 74, 16, 24); g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fill(); g.strokeStyle = W; g.lineWidth = 8; g.lineJoin = 'round'; g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(64, 30); g.lineTo(64, 100); g.moveTo(36, 54); g.lineTo(92, 54); g.stroke();
  },
  chevron(g) { g.strokeStyle = W; g.lineWidth = 13; g.lineCap = 'round'; g.lineJoin = 'round'; for (const y of [62, 104]) { g.beginPath(); g.moveTo(24, y); g.lineTo(64, y - 40); g.lineTo(104, y); g.stroke(); } },
  claw(g) {
    g.fillStyle = W; for (let i = 0; i < 3; i++) { const x = 30 + i * 30; g.beginPath(); g.moveTo(x - 14, 6); g.quadraticCurveTo(x + 14, 60, x + 4, 124); g.quadraticCurveTo(x - 6, 60, x - 14, 6); g.fill(); }
  },
  smoke(g) { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, CLEAR); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); },
};
const TEX = new Map();
function tex(name) {
  let t = TEX.get(name); if (t) return t;
  const c = document.createElement('canvas'); c.width = c.height = 128; PAINT[name](c.getContext('2d'));
  t = new THREE.CanvasTexture(c); TEX.set(name, t); return t;
}

// ───────── building blocks ─────────
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const R = (a = 1) => (Math.random() - 0.5) * a;
const after = (ms, fn) => tween(ms, () => {}).then(fn); // a timer that pauses with hit-stop and slow motion
const fade = (k, hold) => (k < hold ? 1 : 1 - (k - hold) / (1 - hold));
// The angle on screen from one world point to another (sprites turn in screen space).
function screenAngle(w, a, b) { const p = w.project(a), q = w.project(b); return Math.atan2(-(q.y - p.y), q.x - p.x); }
// A world-space velocity that moves along a screen angle.
function screenDir(w, a, sp) { const e = w.camera.matrixWorld.elements; return V(e[0], e[1], e[2]).multiplyScalar(Math.cos(a) * sp).add(V(e[4], e[5], e[6]).multiplyScalar(Math.sin(a) * sp)); }

// Shapes are flat colour, like cut paper: true to the element's colour on any ground. Only light itself (`add`) glows.
const K = 1.5; // overall size of effects next to a unit
const pale = (c) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.6).getHex();

// A billboard that grows from `size` to `to`, turns, and fades out.
function spr(w, name, pos, { color = 0xffffff, size = 1, to = size * 1.6, ms = 260, rot = 0, spin = 0, add = false, sy = 1, rise = 0, opacity = 1, hold = 0, ease = Ease.outCubic } = {}) {
  size *= K; to *= K;
  const mat = new THREE.SpriteMaterial({ map: tex(name), color, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, rotation: rot, opacity });
  const s = new THREE.Sprite(mat); s.position.copy(pos); s.renderOrder = 31; s.scale.set(size, size * sy, 1); w.fxGroup.add(s);
  const y0 = pos.y;
  return tween(ms, (e, k) => { const z = size + (to - size) * e; s.scale.set(z, z * sy, 1); mat.opacity = opacity * fade(k, hold); mat.rotation = rot + spin * k; s.position.y = y0 + rise * e; }, ease).then(() => { w.fxGroup.remove(s); mat.dispose(); });
}
// The same, lying flat on the ground.
let PLANE = null;
function decal(w, name, pos, { color = 0xffffff, size = 1, to = size * 1.6, ms = 320, rot = Math.random() * 6, spin = 0, add = false, opacity = 0.9, hold = 0, ease = Ease.outCubic } = {}) {
  PLANE ||= new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); size *= K; to *= K;
  const mat = new THREE.MeshBasicMaterial({ map: tex(name), color, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity });
  const m = new THREE.Mesh(PLANE, mat); m.position.copy(pos); m.position.y += 0.09; m.renderOrder = 8; m.scale.set(size, 1, size); w.fxGroup.add(m);
  return tween(ms, (e, k) => { const z = size + (to - size) * e; m.scale.set(z, 1, z); mat.opacity = opacity * fade(k, hold); m.rotation.y = rot + spin * k; }, ease).then(() => { w.fxGroup.remove(m); mat.dispose(); });
}
const bit = (w, name, pos, o) => w.particle(pos, { tex: tex(name), ...o, size: (o.size || 0.3) * K });

// ───────── element impacts ─────────
// What an element does where it lands. `p` is chest height over the cell, `s` scales the whole effect.
export function elemHit(w, el, p, s = 1) {
  const c = elColor(el); const g = p.clone(); g.y -= 0.62;
  switch (el) {
    case 'fire':
      for (let i = 0; i < 5; i++) bit(w, 'flame', V(p.x + R(0.8 * s), g.y + 0.25, p.z + R(0.5 * s)), { color: i % 2 ? 0xff6a1a : 0xffc040, size: (0.6 + Math.random() * 0.5) * s, life: 380 + Math.random() * 240, vel: V(R(0.6), 2 + Math.random() * 1.8, 0), gravity: -1.5, grow: 0.4 });
      w.burst(p, { color: 0xffb040, count: 5, speed: 3, size: 0.16, life: 650, gravity: 3, up: 3 });
      decal(w, 'shock', g, { color: 0xff5a1a, size: 0.5, to: 2.3 * s, ms: 300 });
      break;
    case 'ice':
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + R(0.5); bit(w, 'shard', p, { color: i % 2 ? 0xe6f8ff : c, size: (0.55 + Math.random() * 0.4) * s, life: 360, rot: a, vel: screenDir(w, a, 3.6 * s), drag: 0.88 }); }
      spr(w, 'spark', p, { color: 0xffffff, size: 0.4, to: 1.5 * s, ms: 200, rot: R(3) });
      decal(w, 'shock', g, { color: 0xbfeaff, size: 0.5, to: 2 * s, ms: 340 });
      break;
    case 'wind':
      spr(w, 'swirl', p, { color: c, size: 0.7 * s, to: 2.3 * s, ms: 380, spin: 7 });
      spr(w, 'swirl', p, { color: 0xffffff, size: 0.4 * s, to: 1.5 * s, ms: 300, spin: -9, opacity: 0.7 });
      for (let i = 0; i < 4; i++) { const a = R(6.3); bit(w, 'shard', p, { color: 0xd8ffe6, size: 0.4 * s, life: 300, rot: a, vel: screenDir(w, a, 4), drag: 0.9 }); }
      break;
    case 'earth':
      for (let i = 0; i < 6; i++) bit(w, 'rock', V(p.x + R(0.6 * s), g.y + 0.2, p.z + R(0.4 * s)), { color: i % 2 ? 0x8a6a48 : 0xb89868, size: (0.22 + Math.random() * 0.26) * s, life: 620, fade: false, spin: R(14), vel: V(R(3), 3.2 + Math.random() * 2.6, R(2)), gravity: 13 });
      bit(w, 'smoke', g, { color: 0xc8b090, size: 1.1 * s, life: 520, opacity: 0.5, grow: 1.4, vel: V(0, 0.5, 0) });
      decal(w, 'crack', g, { color: 0x2a1c10, size: 1.5 * s, to: 2.1 * s, ms: 800, hold: 0.6, opacity: 0.85 });
      break;
    case 'holy':
      spr(w, 'pillar', V(p.x, p.y + 1.3, p.z), { add: true, color: 0xfff0a0, size: 0.5 * s, to: 1.1 * s, sy: 4.4, ms: 440, hold: 0.35, opacity: 0.85 });
      for (let i = 0; i < 5; i++) bit(w, 'spark', V(p.x + R(0.9 * s), p.y + R(0.6), p.z + R(0.3)), { color: i % 2 ? 0xffffff : c, size: 0.3 * s, life: 520 + Math.random() * 200, spin: 5, vel: V(0, 1.6 + Math.random(), 0) });
      decal(w, 'circle', g, { color: c, size: 0.9 * s, to: 1.9 * s, ms: 420, spin: 1.5 });
      break;
    case 'shadow':
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; bit(w, 'smoke', p.clone().add(screenDir(w, a, 1.3 * s)), { color: i % 2 ? 0x5a2a9a : c, size: 0.6 * s, life: 300, vel: screenDir(w, a, -4.2 * s), drag: 0.97 }); }
      spr(w, 'spark', p, { color: c, size: 1.9 * s, to: 0.2, ms: 280, spin: 5, ease: Ease.inOutQuad, hold: 0.8 });
      after(240, () => decal(w, 'shock', g, { color: c, size: 0.4, to: 2.2 * s, ms: 260 }));
      break;
    case 'poison':
      for (let i = 0; i < 7; i++) bit(w, 'bubble', V(p.x + R(0.9 * s), g.y + Math.random() * 0.8, p.z + R(0.4)), { color: i % 2 ? 0xd8ff9a : c, size: (0.16 + Math.random() * 0.24) * s, life: 600 + Math.random() * 300, vel: V(R(0.5), 0.9 + Math.random() * 1.3, 0), gravity: -0.6 });
      bit(w, 'smoke', p, { color: 0x6aa82a, size: 1 * s, life: 620, opacity: 0.45, grow: 1.6, vel: V(0, 0.4, 0) });
      break;
    case 'arcane':
      spr(w, 'circle', p, { color: c, size: 0.6 * s, to: 1.7 * s, ms: 340, spin: 3 });
      for (let i = 0; i < 4; i++) { const a = R(6.3); bit(w, 'spark', p, { color: 0xe6d8ff, size: 0.3 * s, life: 380, spin: 8, vel: screenDir(w, a, 2.6), drag: 0.92 }); }
      break;
    default:
      spr(w, 'spark', p, { color: 0xfff0d0, size: 0.45 * s, to: 1.7 * s, ms: 190, rot: R(3) });
  }
}

// ───────── melee ─────────
const MELEE = { sword: 'sword', dagger: 'dagger', hammer: 'smash', mace: 'smash', anvil: 'smash', wrench: 'smash', quake: 'smash', shield: 'shield', boot: 'rush' };
function meleeFx(w, kind, from, tp, color, sc) {
  const ang = screenAngle(w, from, tp); const g = tp.clone(); g.y -= 0.62;
  switch (kind) {
    case 'dagger': // two quick crossing cuts
      [0.55, -0.55].forEach((off, i) => after(i * 85, () => { spr(w, 'shard', tp, { color: i ? 0xffffff : color, size: 0.7 * sc, to: 2.6 * sc, sy: 0.3, ms: 170, rot: ang + off }); audio.sfx('slash'); }));
      after(120, () => spr(w, 'spark', tp, { color: 0xffffff, size: 0.3, to: 1.1 * sc, ms: 160, rot: R(3) }));
      break;
    case 'smash': // a heavy blow that breaks the ground
      decal(w, 'shock', g, { color, size: 0.6, to: 3.2 * sc, ms: 360 });
      decal(w, 'crack', g, { color: 0x2a1c10, size: 1.7 * sc, to: 2.4 * sc, ms: 900, hold: 0.65, opacity: 0.85 });
      for (let i = 0; i < 7; i++) bit(w, 'rock', V(tp.x + R(0.7), g.y + 0.2, tp.z + R(0.5)), { color: i % 2 ? 0x8a6a48 : 0xb89868, size: 0.2 + Math.random() * 0.25, life: 640, fade: false, spin: R(14), vel: V(R(3.5), 3.5 + Math.random() * 3, R(2.4)), gravity: 13 });
      spr(w, 'spark', tp, { color: 0xffffff, size: 0.6, to: 2.4 * sc, ms: 200, rot: R(3) });
      w.shake(0.32, 240);
      break;
    case 'shield':
      spr(w, 'shield', tp, { color: 0xbfd8ff, size: 0.8 * sc, to: 1.9 * sc, ms: 280, hold: 0.3 });
      for (let i = 0; i < 4; i++) { const a = ang + R(1.6); bit(w, 'spark', tp, { color: 0xffffff, size: 0.34, life: 340, spin: 9, vel: screenDir(w, a, 4.2), drag: 0.9 }); }
      break;
    case 'claw':
      spr(w, 'claw', tp, { color, size: 1.1 * sc, to: 2.1 * sc, ms: 240, rot: ang - Math.PI / 2 + 0.5, hold: 0.25 });
      break;
    case 'rush': // a charge: the blow carries on past the target
      spr(w, 'slash', tp, { color, size: 1.3 * sc, to: 2.9 * sc, ms: 230, rot: ang - Math.PI / 2 });
      decal(w, 'shock', g, { color: 0xffffff, size: 0.6, to: 2.6 * sc, ms: 300 });
      for (let i = 0; i < 5; i++) bit(w, 'shard', tp.clone().add(V(R(0.6), R(0.8), 0)), { color: 0xffffff, size: 0.6, life: 260, rot: ang, vel: screenDir(w, ang, 6 + Math.random() * 3), drag: 0.9 });
      break;
    default: // a sword: one wide crescent and its bright echo
      spr(w, 'slash', tp, { color, size: 1.2 * sc, to: 2.7 * sc, ms: 240, rot: ang - Math.PI / 2 });
      spr(w, 'slash', tp, { color: pale(color), size: 0.9 * sc, to: 2.1 * sc, ms: 220, rot: ang - Math.PI / 2 });
      after(60, () => spr(w, 'slash', tp, { color: 0xffffff, size: 0.8 * sc, to: 1.7 * sc, ms: 170, rot: ang - Math.PI / 2 + 0.3, opacity: 0.85 }));
  }
}

// ───────── projectiles ─────────
const SHOT = {
  arrow: { name: 'arrow', size: 1.25, arc: 0.7, orient: true, trail: { color: 0xffffff, size: 0.14, life: 150 } },
  knife: { name: 'shard', size: 0.8, sy: 0.4, arc: 0.1, spin: 26, trail: { color: 0xffffff, size: 0.12, life: 120 } },
  fire: { size: 1, arc: 0.2, trail: { tex: 'flame', color: 0xff8a2a, size: 0.55, life: 300, up: 1.4 } },
  ice: { name: 'shard', size: 1.2, sy: 0.5, arc: 0.1, orient: true, trail: { tex: 'spark', color: 0xdff6ff, size: 0.2, life: 260 } },
  holy: { name: 'spark', size: 1, arc: 0.3, spin: 9, trail: { color: 0xfff0a0, size: 0.4, life: 260 } },
  arcane: { size: 0.75, arc: 0.15, trail: { tex: 'spark', color: 0xe0c8ff, size: 0.3, life: 300, spin: 9 } },
};
async function shot(w, from, to, color, o = {}) {
  const { name = null, size = 0.7, sy = 1, arc = 0.15, spin = 0, orient = false, trail = { color, size: 0.4, life: 260 } } = o;
  const dist = from.distanceTo(to); const ms = o.ms ?? clamp(dist * 55, 160, 520);
  const mat = new THREE.SpriteMaterial({ map: name ? tex(name) : w.glowTex, color: name ? pale(color) : color, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: name ? THREE.NormalBlending : THREE.AdditiveBlending, rotation: orient ? screenAngle(w, from, to) : 0 });
  const s = new THREE.Sprite(mat); s.scale.set(size * K, size * sy * K, 1); s.renderOrder = 32; s.position.copy(from); w.fxGroup.add(s);
  const prev = from.clone();
  await tween(ms, (e, k) => {
    prev.copy(s.position);
    s.position.lerpVectors(from, to, k); s.position.y += Math.sin(k * Math.PI) * arc * Math.min(2, dist / 3);
    if (orient && prev.distanceToSquared(s.position) > 1e-5) mat.rotation = screenAngle(w, prev, s.position); else if (spin) mat.rotation = spin * k * (ms / 300);
    if (trail) w.particle(s.position, { tex: trail.tex ? tex(trail.tex) : undefined, add: !trail.tex, color: trail.color ?? color, size: trail.size * K, life: trail.life, spin: trail.spin || 0, vel: V(R(0.4), trail.up ?? 0.2, R(0.4)) });
  }, Ease.linear);
  w.fxGroup.remove(s); mat.dispose();
}
// Things falling out of the sky onto each cell (arrows, ice).
async function rain(w, pts, color, o) {
  pts.slice(0, 10).forEach((p, i) => after(i * 45, () => shot(w, p.clone().add(V(-1.6 + R(0.6), 7, -0.6)), p, color, { ...o, arc: 0, ms: 230 }).then(() => o.land?.(p))));
  await sleep(Math.min(10, pts.length) * 45 + 200);
}

// ───────── a card resolves ─────────
export async function castVfx(w, d) {
  const { unit: u, card, cells, targets, target } = d;
  const el = card.el || 'neutral';
  const plain = card.proj === 'arrow' || card.proj === 'knife';
  const color = plain ? 0xfff0c8 : elColor(el);
  const sc = Math.max(1, Math.min(1.8, (u.scale || 1) * 0.8));
  const from = w.unitPos(u.uid, 0.95); const feet = w.unitPos(u.uid, 0.02);
  const tpos = (c) => { const p = w.cellPos(c.q, c.r); p.y += 0.7; return p; };
  const aoe = card.shape && card.shape !== 'single';
  const magic = card.cat !== 'attack' || (card.proj && !plain) || card.mp > 0 || (aoe && card.shape !== 'burst') || (d.monster && el !== 'neutral' && (card.proj || aoe));
  w.setFacing(u.uid, u.facing);
  w.playOnce(u.uid, magic ? 'cast' : 'attack').then(() => { if (w.units.has(u.uid)) w.setAnim(u.uid, 'idle'); });
  if (magic) { // a rune circle opens under the caster
    decal(w, 'circle', feet, { color, size: 1.1 * sc, to: 2.7 * sc, ms: 560, spin: 2.2, hold: 0.5 });
    w.rise(feet, { color, count: 8, speed: 1.4 }); audio.sfx('magic');
  }
  await sleep(magic ? 230 : 150);

  const hostile = card.cat === 'attack' || (card.cat === 'special' && targets.some((t) => t.side !== u.side));
  if (!hostile) { supportFx(w, d, color, sc, aoe); await sleep(160); return; }

  if (aoe) {
    const origin = card.shape === 'area' ? tpos(target) : from;
    // the effect sweeps outward: cells nearer the origin go first
    const pts = cells.slice(0, 26).map(tpos).sort((a, b) => a.distanceToSquared(origin) - b.distanceToSquared(origin));
    const sweep = (gap, fn) => pts.forEach((p, i) => after(i * gap, () => fn(p, i)));
    const hit = (p) => elemHit(w, el, p, 0.8);
    if (card.shape === 'area') {
      const big = card.el === 'fire' || card.icon === 'meteor' || card.big;
      if (card.icon === 'arrows') await rain(w, pts, color, { ...SHOT.arrow, land: (p) => elemHit(w, 'neutral', p, 0.7) });
      else if (el === 'ice') await rain(w, pts, color, { ...SHOT.ice, land: hit });
      else {
        if (big) await w.meteor(origin, color); else await shot(w, from, origin, color, { size: 0.95, ...(SHOT[card.proj] || SHOT[el] || {}) });
        const g = origin.clone(); g.y -= 0.62;
        decal(w, 'shock', g, { color, size: 1, to: card.size * 3.8 + 2.4, ms: 420 });
        if (big) spr(w, 'spark', origin, { color: 0xffffff, size: 1, to: 4.5, ms: 240, rot: R(3) });
        sweep(26, hit);
      }
    } else if (card.shape === 'line') {
      if (card.icon === 'bolt') sweep(40, (p) => { spr(w, 'bolt', V(p.x, p.y + 1.6, p.z), { color, size: 1.5, to: 1.7, sy: 2.6, ms: 220, hold: 0.5 }); hit(p); });
      else if (el === 'earth' || card.icon === 'quake') sweep(60, (p) => { elemHit(w, 'earth', p, 1); w.shake(0.12, 120); });
      else { w.beam(from, pts.length ? pts[pts.length - 1] : from, color); sweep(38, hit); }
      await sleep(Math.min(240, pts.length * 40));
    } else if (card.shape === 'burst') {
      const r = (card.size || 1) * 3.8 + 2;
      if (card.icon === 'whirl') { spr(w, 'swirl', from, { color, size: 1.4 * sc, to: r * 0.9, ms: 400, spin: 13 }); spr(w, 'swirl', from, { color: 0xffffff, size: 0.9 * sc, to: r * 0.6, ms: 320, spin: -15, opacity: 0.7 }); }
      else if (card.icon === 'roar') [0, 110, 220].forEach((ms) => after(ms, () => decal(w, 'shock', feet, { color, size: 0.6, to: r, ms: 420 })));
      else { decal(w, 'shock', feet, { color, size: 0.6, to: r, ms: 420 }); decal(w, 'circle', feet, { color, size: 1, to: r * 0.7, ms: 480, spin: 2 }); }
      sweep(30, hit);
    } else { // cone
      if (el === 'neutral') spr(w, 'slash', pts[0] || from, { color, size: 1.6 * sc, to: 4.2 * sc, ms: 280, rot: screenAngle(w, from, pts[pts.length - 1] || from) - Math.PI / 2 });
      sweep(42, hit);
    }
    audio.sfx(card.el === 'fire' ? 'explosion' : EL_SFX[card.el] || 'earth');
    w.flashCells(cells, color, 520);
    w.shake(card.big || card.size >= 2 ? 0.45 : 0.25, 320);
    await sleep(160);
  } else if (card.proj) {
    const tp = tpos(target);
    audio.sfx(plain ? 'arrow' : EL_SFX[card.el] || 'magic');
    await shot(w, from, tp, color, SHOT[card.proj] || {});
    elemHit(w, plain ? 'neutral' : el, tp, 1);
  } else {
    const tp = tpos(target);
    audio.sfx(el !== 'neutral' ? EL_SFX[el] : 'slash');
    await w.lunge(u.uid, tp);
    if (card.icon === 'bolt') spr(w, 'bolt', V(tp.x, tp.y + 1.6, tp.z), { color, size: 1.6, to: 1.8, sy: 2.6, ms: 240, hold: 0.5 });
    else meleeFx(w, d.monster ? (el === 'neutral' ? 'claw' : 'sword') : MELEE[card.icon] || 'sword', from, tp, color, sc);
    if (el !== 'neutral') elemHit(w, el, tp, 0.9);
  }
}

// Blocks, heals, buffs and other helpful cards: each kind has its own sign over whoever receives it.
function supportFx(w, d, color, sc, aoe) {
  const { unit: u, card, targets, target } = d;
  const has = (...ts) => card.fx.some((f) => ts.includes(f.t));
  const kind = has('heal', 'revive') ? 'heal' : has('block') ? 'block' : card.icon === 'smoke' ? 'smoke' : has('summon') ? 'summon' : has('draw', 'energy', 'mp') ? 'boon' : 'buff';
  const spots = targets.length ? targets.map((t) => [w.unitPos(t.uid, 0.9), w.unitPos(t.uid, 0.02)]) : [target ? (() => { const g = w.cellPos(target.q, target.r); return [g.clone().add(V(0, 0.8, 0)), g]; })() : [w.unitPos(u.uid, 0.9), w.unitPos(u.uid, 0.02)]];
  for (const [p, g] of spots) {
    switch (kind) {
      case 'heal':
        spr(w, 'pillar', V(p.x, p.y + 0.9, p.z), { add: true, color: 0x7fffa0, size: 0.9, to: 1.5, sy: 2.6, ms: 520, hold: 0.3, opacity: 0.5 });
        for (let i = 0; i < 6; i++) bit(w, 'cross', V(p.x + R(1), g.y + Math.random() * 0.8, p.z + R(0.4)), { color: i % 2 ? 0xd8ffe0 : 0x5fe08a, size: 0.22 + Math.random() * 0.14, life: 700 + Math.random() * 300, vel: V(0, 1.3 + Math.random(), 0) });
        decal(w, 'circle', g, { color: 0x7fffa0, size: 1, to: 2.2, ms: 520, spin: 1.5 });
        break;
      case 'block':
        spr(w, 'shield', p, { color: 0xa8ccff, size: 0.6, to: 1.75, ms: 460, hold: 0.55, ease: Ease.outBack });
        decal(w, 'shock', g, { color: 0x9fc8ff, size: 0.6, to: 2.4, ms: 380 });
        break;
      case 'smoke':
        for (let i = 0; i < 7; i++) bit(w, 'smoke', V(p.x + R(1.2), g.y + 0.3 + Math.random() * 0.8, p.z + R(0.6)), { color: 0xa8a0b0, size: 0.9 + Math.random() * 0.6, life: 800 + Math.random() * 300, opacity: 0.6, grow: 1.6, vel: V(R(0.8), 0.5, 0) });
        break;
      case 'summon':
        decal(w, 'circle', g, { color, size: 0.8, to: 2.4, ms: 620, spin: 4, hold: 0.5 });
        spr(w, 'pillar', V(p.x, p.y + 0.9, p.z), { add: true, color, size: 0.6, to: 1.1, sy: 3, ms: 420, hold: 0.3, opacity: 0.6 });
        break;
      case 'boon':
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; bit(w, 'spark', p.clone().add(screenDir(w, a, 1.1)), { color: i % 2 ? 0xffffff : color, size: 0.32, life: 460, spin: 8, vel: screenDir(w, a + 1.4, 2.2), drag: 0.93 }); }
        spr(w, 'spark', p, { color, size: 0.4, to: 1.6, ms: 320, spin: 3 });
        break;
      default: // a buff: chevrons climbing
        for (let i = 0; i < 5; i++) bit(w, 'chevron', V(p.x + R(1), g.y + 0.2 + i * 0.22, p.z + R(0.3)), { color: i % 2 ? 0xffffff : color, size: 0.34, life: 620 + i * 60, vel: V(0, 1.7, 0) });
        decal(w, 'circle', g, { color, size: 1, to: 2.1, ms: 480, spin: 1.5 });
    }
  }
  if (aoe) decal(w, 'shock', w.unitPos(u.uid, 0.02), { color, size: 0.6, to: (card.size || 1) * 3.8 + 2, ms: 460 });
}

// A dash: streaks of speed trail behind the unit, dust where it left.
export function dashFx(w, from, to) {
  const ang = screenAngle(w, from, to);
  for (let i = 0; i < 7; i++) after(i * 26, () => bit(w, 'shard', V(from.x + (to.x - from.x) * (i / 7) + R(0.3), from.y + 0.3 + Math.random() * 1.1, from.z + (to.z - from.z) * (i / 7)), { color: 0xffffff, size: 0.9, life: 240, rot: ang, opacity: 0.8, vel: screenDir(w, ang, -1.5) }));
  bit(w, 'smoke', from, { color: 0xd8c8a8, size: 0.9, life: 480, opacity: 0.5, grow: 1.5, vel: V(0, 0.4, 0) });
}
// Teleport: a rune circle where the unit leaves and where it arrives.
export function blinkFx(w, pos, color) { const g = pos.clone(); decal(w, 'circle', g, { color, size: 0.7, to: 2.2, ms: 420, spin: 5 }); spr(w, 'pillar', V(g.x, g.y + 1.4, g.z), { add: true, color, size: 0.5, to: 0.9, sy: 3.4, ms: 320, hold: 0.3, opacity: 0.7 }); }
