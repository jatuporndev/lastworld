// Skill effects — what a card looks like when it resolves. A card is acted out in beats: a wind-up, the
// thing travelling, and the blow landing. The pictures are pixel-art sprite sheets (see pixfx.js); which ones
// play is chosen from the card itself — its element, its icon, how it travels (melee, projectile, line,
// cone, area, burst) and what it does (damage, block, heal, buff) — so a new card needs no extra work.
// A few small shapes are still painted here by code for dashes, teleports and thrown knives.
import * as THREE from 'three';
import { tween, Ease, sleep, clamp } from '../core/util.js';
import { audio } from '../core/audio.js';
import { elColor } from './renderer.js';
import { play, hitMs } from './pixfx.js';

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

// ───────── projectiles ─────────
const SHOT = { knife: { name: 'shard', size: 0.8, sy: 0.4, arc: 0.1, spin: 26, trail: { color: 0xffffff, size: 0.12, life: 120 } } };
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

// ───────── which pictures a card plays ─────────
const CHARGE = { fire: 'charge_fire', ice: 'charge_ice', wind: 'charge_wind', earth: 'charge_earth', holy: 'charge_holy', poison: 'charge_poison' };
const IMPACT = { fire: 'blast', ice: 'hit_ice', wind: 'hit_wind', earth: 'hit_earth', holy: 'hit_holy', shadow: 'hit_shadow', poison: 'hit_poison', arcane: 'hit_arcane', neutral: 'hit_spark' };
const PROJ = { fire: 'fireball', ice: 'icelance', arrow: 'arrow', holy: 'orb_holy', arcane: 'orb_arcane', shadow: 'orb_shadow', poison: 'orb_poison', wind: 'orb_wind', earth: 'orb_earth', neutral: 'orb_arcane' };
const MELEE = { sword: 'slash', dagger: 'flurry', hammer: 'smash', mace: 'smash', anvil: 'smash', wrench: 'smash', quake: 'smash', shield: 'hit_blunt', boot: 'thrust', skull: 'reap' };
const AREA = { fire: 'blast', ice: 'frostnova', earth: 'dirt', wind: 'hit_wind', shadow: 'darkblast', holy: 'holypillar', poison: 'spores', arcane: 'hit_arcane', neutral: 'slam' };
const BURST = { fire: 'blast', ice: 'frostnova', earth: 'slam', wind: 'hit_wind', shadow: 'darkblast', holy: 'hit_holy', poison: 'spores', arcane: 'hit_arcane', neutral: 'slam' };
const BEAM = { holy: 'beam_holy', wind: 'beam_wind' };
const SUPPORT = { heal: 'heal', block: 'shield', smoke: 'smoke', summon: 'portal', boon: 'hit_arcane', revive: 'revive', buff: 'bless' };
// drawn round their own middle, so they go on the target's chest; every other picture stands on the floor
const CHEST = new Set(['hit_ice', 'hit_shadow', 'hit_arcane', 'hit_spark', 'hit_crit', 'hit_blunt', 'zap', 'slash', 'slash2', 'flurry', 'claw', 'thrust', 'reap', 'poof']);
const SINGLE = { blast: 0.5, hit_wind: 0.8, hit_earth: 0.75, hit_holy: 0.75, hit_arcane: 0.7 }; // size on one target
const HEAVY = new Set(['smash', 'reap']);

// What a card looks like, decided from the card alone: its element, icon, how it travels and what it does.
// `hostile` says whether a "special" card is aimed at an enemy. Returns the mode and every sheet it needs.
export function fxPlan(card, monster = false, hostile = card.cat === 'attack') {
  const el = card.el || 'neutral'; const plain = card.proj === 'arrow' || card.proj === 'knife';
  const aoe = !!card.shape && card.shape !== 'single';
  const has = (...ts) => (card.fx || []).some((f) => ts.includes(f.t));
  const status = (...ss) => (card.fx || []).some((f) => f.t === 'status' && ss.includes(f.st));
  const magic = card.cat !== 'attack' || (card.proj && !plain) || card.mp > 0 || (aoe && card.shape !== 'burst') || (monster && el !== 'neutral' && (card.proj || aoe));
  const P = { el, aoe, magic: !!magic, plain, charge: magic ? CHARGE[plain ? 'neutral' : el] || 'charge_arcane' : null, mode: 'melee', main: null, proj: null, impact: null, extra: null };
  if (!hostile) {
    // (monster actions and items come as bare cards without an fx list: their category says what they are)
    P.mode = 'support';
    P.kind = card.kind || (card.icon === 'smoke' ? 'smoke' : has('heal', 'revive') ? (has('revive') ? 'revive' : 'heal') : has('block') ? 'block' : has('summon') ? 'summon' : has('draw', 'energy', 'mp') ? 'boon' : !card.fx && card.cat === 'defense' ? 'block' : 'buff');
    P.main = SUPPORT[P.kind]; if (aoe && P.kind === 'heal') P.extra = 'heal_area';
  } else if (aoe) {
    P.mode = card.shape;
    if (card.shape === 'area') {
      if (card.icon === 'meteor') P.main = el === 'holy' ? 'starfall' : 'meteor';
      else if (card.icon === 'arrows') { P.proj = 'arrow'; P.impact = 'hit_spark'; }
      else if (el === 'fire') { P.proj = 'fireball'; P.main = 'blast'; }
      else P.main = AREA[el] || 'slam';
    } else if (card.shape === 'line') {
      if (card.icon === 'bolt') { P.main = 'beam_wind'; P.impact = 'zap'; }
      else if (el === 'earth' || card.icon === 'quake') P.impact = 'hit_earth';
      else if (card.icon === 'arrow') { P.proj = 'arrow'; P.impact = 'hit_spark'; }
      else { P.main = BEAM[el] || 'beam_arcane'; P.impact = el === 'holy' ? 'hit_spark' : IMPACT[el]; }
    } else if (card.shape === 'cone') {
      if (el === 'ice') P.main = 'breath_ice'; else P.impact = IMPACT[el];
    } else { // burst: round the caster
      P.main = card.icon === 'whirl' ? 'spin' : card.icon === 'blink' ? 'hit_shadow' : card.icon === 'roar' ? 'slam' : BURST[el] || 'slam';
    }
  } else if (card.proj) {
    P.mode = 'shot'; P.proj = card.proj === 'knife' ? null : plain ? 'arrow' : PROJ[card.proj] || PROJ[el];
    P.impact = plain ? IMPACT[el] : IMPACT[card.proj] || IMPACT[el];
  } else if ((card.range || 1) > 1 && !has('dash')) { // worked on the target from afar: a snare, a curse, a brand
    P.mode = 'remote'; P.main = card.icon === 'trap' ? 'snare' : status('frozen') ? 'freeze' : el === 'neutral' ? 'curse' : IMPACT[el];
  } else {
    P.main = monster ? (el === 'neutral' ? 'claw' : 'slash2') : card.icon === 'bolt' ? 'zap' : MELEE[card.icon] || 'slash';
    if (!card.mp) { P.magic = false; P.charge = null; } // a blow is wound up by the body, not by a spell
    if (el !== 'neutral') P.extra = IMPACT[el];
  }
  P.sheets = [P.charge, P.main, P.proj, P.impact, P.extra].filter(Boolean);
  return P;
}
// Every sheet a card could play (a "special" may be friendly or hostile), for loading before the fight.
export const fxSheetsFor = (card, monster = false) => [...fxPlan(card, monster, true).sheets, ...fxPlan(card, monster, false).sheets];
export const ALWAYS_SHEETS = ['hit_crit', 'poof'];

// ───────── a card resolves ─────────
const flightMs = (from, to) => clamp(from.distanceTo(to) * 75, 240, 600);
// How long a world-space stretch looks on screen, in the units a billboard is sized in.
function screenLen(w, a, b) { const p = w.project(a), q = w.project(b), o = w.project(V(0, 0, 0)), u = w.project(screenDir(w, 0, 1)); return Math.hypot(q.x - p.x, q.y - p.y) / Math.max(1e-3, Math.hypot(u.x - o.x, u.y - o.y)); }
// A projectile: the sheet flies from `from` to `to`, nose first, speeding up a little on the way.
function fly(w, name, from, to, { s = 1, ms = flightMs(from, to), arc = 0 } = {}) {
  const ang = screenAngle(w, from, to);
  return play(w, name, from, { s, rot: ang, flipY: Math.cos(ang) < 0, ms, loop: true, fadeIn: 0.08, fadeOut: 0, order: 34,
    move: (p, k) => { p.lerpVectors(from, to, k * k * 0.35 + k * 0.65); p.y += Math.sin(k * Math.PI) * arc; } });
}

export async function castVfx(w, d) {
  const { unit: u, card, cells, targets, target } = d;
  const hostile = card.cat === 'attack' || targets.some((t) => t.side !== u.side);
  const P = fxPlan(card, !!d.monster, hostile); const el = P.el;
  const color = P.plain ? 0xfff0c8 : elColor(el);
  const sc = Math.max(1, Math.min(1.8, (u.scale || 1) * 0.8));
  const from = w.unitPos(u.uid, 0.95); const feet = w.unitPos(u.uid, 0.04);
  const chest = (c) => { const p = w.cellPos(c.q, c.r); p.y += 0.7; return p; };
  const floor = (c) => { const p = w.cellPos(c.q, c.r); p.y += 0.04; return p; };
  const land = (name, c, o) => play(w, name, CHEST.has(name) ? chest(c) : floor(c), o); // each picture on its own anchor
  const self = !target || (target.q === u.q && target.r === u.r);
  const aim = self ? null : chest(target);
  w.setFacing(u.uid, u.facing);
  w.playOnce(u.uid, P.magic ? 'cast' : 'attack').then(() => { if (w.units.has(u.uid)) w.setAnim(u.uid, 'idle'); });

  // beat 1 · the wind-up: a spell gathers in the hand while the caster sinks into it, then lets go
  if (P.magic) {
    audio.sfx('magic');
    const hand = aim ? from.clone().add(screenDir(w, screenAngle(w, from, aim), 0.35 * sc)) : from.clone().add(V(0, 0.5 * sc, 0));
    play(w, P.charge, hand, { s: sc, ms: 400, loop: true, fadeIn: 0.2, fadeOut: 0.12, order: 34 });
    await w.gather(u.uid, 380);
    w.release(u.uid, P.mode === 'support' ? null : aim);
  }

  if (P.mode === 'support') { supportFx(w, d, P, sc); await tween(200, () => {}); return; }

  // beats 2 and 3 · it travels, and it lands
  const wait = (name, s = 1) => tween(Math.max(1, hitMs(name, s)), () => {});
  if (P.aoe) {
    const big = (card.size || 1) >= 2 || card.big; const S = (card.size || 1) >= 3 ? 1.6 : big ? 1.3 : 1;
    const origin = card.shape === 'area' ? chest(target) : from;
    // the effect sweeps outward: cells nearer the origin go first
    const order = cells.slice(0, 26).sort((a, b) => chest(a).distanceToSquared(origin) - chest(b).distanceToSquared(origin));
    const sweep = (gap, name, o, max = 8) => order.slice(0, max).forEach((c, i) => after(i * gap, () => land(name, c, o)));
    if (card.shape === 'area') {
      if (P.proj === 'arrow') { // a volley falls on every cell
        order.slice(0, 10).forEach((c, i) => after(i * 45, () => { const p = chest(c); fly(w, 'arrow', p.clone().add(V(-1.6 + R(0.6), 7, -0.6)), p, { ms: 230 }).then(() => land('hit_spark', c, { s: 0.8 })); }));
        audio.sfx('arrow'); await tween(Math.min(10, order.length) * 45 + 230, () => {});
      } else {
        if (P.proj) { audio.sfx(EL_SFX[el] || 'magic'); await fly(w, P.proj, from, origin, { s: big ? 1.3 : 1 }); }
        land(P.main, target, { s: S });
        await wait(P.main);
      }
    } else if (card.shape === 'line') {
      const far = order.length ? chest(order[order.length - 1]) : from;
      if (P.proj) await fly(w, P.proj, from, far, { ms: 200 });
      else if (P.main) { const ang = screenAngle(w, from, far); play(w, P.main, from, { rot: ang, flipY: Math.cos(ang) < 0, len: screenLen(w, from, far) + 0.8, ms: 460, loop: true, fadeIn: 0.1, fadeOut: 0.3, order: 34 }); await tween(90, () => {}); }
      if (P.impact) sweep(P.impact === 'hit_earth' ? 70 : 40, P.impact, { s: SINGLE[P.impact] || 0.8 });
      if (P.impact === 'hit_earth') { order.slice(0, 6).forEach((c, i) => after(i * 70 + 200, () => w.shake(0.12, 120))); await wait('hit_earth'); }
      await tween(Math.min(240, order.length * 40), () => {});
    } else if (card.shape === 'cone') {
      const far = order.length ? chest(order[order.length - 1]) : from; const ang = screenAngle(w, from, far);
      if (P.main) { play(w, P.main, from, { rot: ang, flipY: Math.cos(ang) < 0, fit: screenLen(w, from, far) + 1, ms: 700, loop: true, fadeIn: 0.12, fadeOut: 0.3, order: 34 }); await tween(220, () => {}); }
      else { sweep(45, P.impact, { s: (SINGLE[P.impact] || 0.8) * 0.9 }, 6); await tween(180, () => {}); }
    } else { // burst
      const centred = CHEST.has(P.main);
      play(w, P.main, centred ? from : feet, { s: P.main === 'spin' ? sc : centred ? S * 2 : (card.size || 1) >= 3 ? 1.15 : (card.size || 1) >= 2 ? 0.85 : 0.7 });
      await wait(P.main);
    }
    audio.sfx(el === 'fire' ? 'explosion' : EL_SFX[el] || 'earth');
    w.flashCells(cells, color, 520);
    w.shake(big ? 0.45 : 0.25, 320);
    await tween(120, () => {});
  } else if (P.mode === 'shot') {
    audio.sfx(P.plain ? 'arrow' : EL_SFX[el] || 'magic');
    if (P.proj) await fly(w, P.proj, from, aim, { arc: P.plain ? 0.5 : 0.1 }); else await shot(w, from, aim, color, SHOT.knife);
    land(P.impact, target, { s: SINGLE[P.impact] || 1 });
    await wait(P.impact);
  } else if (P.mode === 'remote') {
    audio.sfx(EL_SFX[el] || 'magic');
    land(P.main, target, { s: SINGLE[P.main] || 1 });
    await wait(P.main);
  } else { // melee: pull back, snap in, and the cut opens on the target
    audio.sfx(el !== 'neutral' ? EL_SFX[el] : 'slash');
    const heavy = HEAVY.has(P.main);
    await w.strike(u.uid, aim || from, { heavy });
    const left = aim ? w.project(aim).x < w.project(from).x : false;
    land(P.main, target || u, { s: sc * (P.main === 'slash' ? 1.15 : 1), flipX: left, speed: 1.15 });
    if (heavy) w.shake(0.32, 240);
    if (P.extra) land(P.extra, target || u, { s: (SINGLE[P.extra] || 0.8) * 0.85 });
    await wait(P.main, 1.15);
  }
}

// Blocks, heals, buffs and other helpful cards: each kind has its own sign over whoever receives it.
function supportFx(w, d, P, sc) {
  const { unit: u, targets, target } = d;
  const spots = targets.length ? targets.map((t) => [w.unitPos(t.uid, 0.9), w.unitPos(t.uid, 0.04), Math.max(1, Math.min(1.8, (t.scale || 1) * 0.8))])
    : [target ? (() => { const g = w.cellPos(target.q, target.r); g.y += 0.04; return [g.clone().add(V(0, 0.8, 0)), g, 1]; })() : [w.unitPos(u.uid, 0.9), w.unitPos(u.uid, 0.04), sc]];
  for (const [p, g, s] of spots) play(w, P.main, CHEST.has(P.main) ? p : g, { s: s * (P.kind === 'boon' ? 0.6 : 1), fadeIn: P.kind === 'block' || P.kind === 'buff' ? 0.2 : 0, order: 34 });
  if (P.extra) play(w, P.extra, w.unitPos(u.uid, 0.04), { s: (d.card.size || 1) >= 3 ? 1.5 : 1.15 });
}

// A dash: streaks of speed trail behind the unit, dust where it left.
export function dashFx(w, from, to) {
  const ang = screenAngle(w, from, to);
  for (let i = 0; i < 7; i++) after(i * 26, () => bit(w, 'shard', V(from.x + (to.x - from.x) * (i / 7) + R(0.3), from.y + 0.3 + Math.random() * 1.1, from.z + (to.z - from.z) * (i / 7)), { color: 0xffffff, size: 0.9, life: 240, rot: ang, opacity: 0.8, vel: screenDir(w, ang, -1.5) }));
  bit(w, 'smoke', from, { color: 0xd8c8a8, size: 0.9, life: 480, opacity: 0.5, grow: 1.5, vel: V(0, 0.4, 0) });
}
// Teleport: a rune circle where the unit leaves and where it arrives.
export function blinkFx(w, pos, color) { const g = pos.clone(); decal(w, 'circle', g, { color, size: 0.7, to: 2.2, ms: 420, spin: 5 }); spr(w, 'pillar', V(g.x, g.y + 1.4, g.z), { add: true, color, size: 0.5, to: 0.9, sy: 3.4, ms: 320, hold: 0.3, opacity: 0.7 }); }
// A critical hit and a monster's last breath, for the battle screen.
export const critFx = (w, pos) => play(w, 'hit_crit', pos, { order: 35 });
export const poofFx = (w, pos, s = 1) => play(w, 'poof', pos, { s, order: 35 });
