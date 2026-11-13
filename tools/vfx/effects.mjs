// Every skill effect in LAST WORLD, drawn by code with tools/vfx/kit.mjs. These designs are the game's own.
//
// An effect:  fx(name, { w, h, ox, oy, dur, px, hit, fps, floor }, (k) => (p, t) => { ...draw... })
//   w h: canvas · ox oy: where local (0, 0) sits on it (the floor under the effect, the middle of a hit, a
//   projectile's nose, a beam's mouth) · dur: seconds · px: world units per pixel · hit: when the blow lands
//   floor: particles bounce on y = 0 · k: { R (seeded random), ps (particles), at(time, fn) }
// Things that point somewhere point right. A fighter is about 40 px tall, its chest 19 px above the floor.
//
// How each one is built (what makes an effect read as a blow and not as a sticker):
//   gather → one white frame on contact → a fast spread → a hold with small things still moving → a slow clear.
import { TAU, RAMP, WHITE, INK, hex, clamp, lerp, seg, smooth, out, bump, hash, rng } from './kit.mjs';

export const FX = {};
const fx = (name, m, setup) => { FX[name] = { fps: 15, px: 0.036, ...m, setup }; };
const FY = 0.42; // how flat a circle on the floor looks from the game's camera
const VOLT = ['#2c2a6a', '#4a58c8', '#6fb4ff', '#bfeeff', '#fff6a8', '#ffffff'].map(hex);
const dirt = RAMP.earth, smokeR = RAMP.smoke;

// ───────── shared pieces ─────────
// the one white frame on contact, then a smaller coloured one
function flash(p, x, y, r, t, t0, C) {
  const d = t - t0; if (d < -1e-6 || d >= 0.14) return;
  if (d < 0.066) { p.ink = false; p.diamond(x, y, r, WHITE); p.ink = true; p.star(x, y, Math.round(r * 1.7), WHITE, C[4]); p.glow(x, y, r * 3.2, C[4], 1.3); }
  else { p.ink = false; p.diamond(x, y, r * 0.6, C[5]); p.ink = true; p.glow(x, y, r * 2.2, C[3], 0.8); }
}
// a hexagon racing outward: on the floor by default, upright with sy: 1
function shock(p, x, y, t, t0, d, r0, r1, C, { sy = FY, th = 3, rot = 0, sides = 6 } = {}) {
  const k = seg(t, t0, t0 + d); if (k <= 0 || k >= 1) return;
  p.ring(x, y, lerp(r0, r1, out(k)), Math.max(1, th * (1 - k)), k < 0.25 ? C[5] : k < 0.55 ? C[4] : C[3], k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1, { sy, sides, rot });
}
// a faceted spike from a base point: lit side, shadow side, a bright ridge
function spike(p, x, y, ang, len, half, C, ridge = true) {
  if (len < 1) return; const ca = Math.cos(ang), sa = Math.sin(ang), tx = x + ca * len, ty = y + sa * len;
  p.poly([[x - sa * half, y + ca * half], [tx, ty], [x, y]], C[2]); p.poly([[x + sa * half, y - ca * half], [tx, ty], [x, y]], C[4]);
  if (ridge) { p.ink = false; p.line(x, y, tx, ty, C[5], 1, 1); p.ink = true; }
}
// fire that bursts, rises, and leaves smoke
function boom(k, x, y, S = 1, C = RAMP.fire, { smoke = true, up = 1 } = {}) {
  const { R, ps } = k;
  ps.burst(R, Math.round(11 * S), x, y - 4, 50 * S, 170 * S, () => ({ kind: 'puff', ramp: C, tone: 3, s: R.range(7, 12) * S, life: R.range(0.45, 0.85), drag: 5, g: -50 * up }), { a0: -Math.PI * 1.05, a1: 0.05 });
  ps.burst(R, Math.round(6 * S), x, y - 6, 20 * S, 90 * S, () => ({ kind: 'puff', ramp: C, tone: 4, s: R.range(5, 8) * S, life: R.range(0.25, 0.45), drag: 5, g: -60 }), { a0: -Math.PI, a1: 0 });
  if (smoke) ps.burst(R, Math.round(8 * S), x, y - 8, 15 * S, 70 * S, () => ({ kind: 'puff', ramp: smokeR, tone: 2, s: R.range(6, 10) * S, life: R.range(0.9, 1.6), delay: R.range(0.22, 0.5), drag: 2.5, g: -34, back: R() < 0.5 }), { a0: -Math.PI, a1: 0 });
  ps.burst(R, Math.round(14 * S), x, y - 5, 110 * S, 300 * S, () => ({ kind: 'spark', ramp: C, life: R.range(0.4, 0.9), g: 620, drag: 1.2 }), { a0: -Math.PI * 0.95, a1: -0.05 });
  ps.burst(R, Math.round(7 * S), x, y - 5, 70 * S, 190 * S, () => ({ kind: 'chip', ramp: C, tone: R.pick([2, 3, 4]), s: R.range(2, 4), life: R.range(0.6, 1.1), g: 520 }), { a0: -Math.PI * 0.9, a1: -0.1 });
}
// dust kicked along the floor to both sides
function dust(k, x, y, n, sp, C = smokeR, tone = 3) {
  const { R, ps } = k;
  for (let i = 0; i < n; i++) ps.spawn({ kind: 'puff', ramp: C, tone, x: x + R.range(-4, 4), y: y - R.range(0, 3), vx: R.sign() * R.range(sp * 0.4, sp), vy: -R.range(4, 26), drag: 3.2, g: -12, s: R.range(4, 8), life: R.range(0.5, 1.1), back: i % 3 === 0 });
}
const rocks = (k, x, y, n, sp, C = dirt) => k.ps.burst(k.R, n, x, y - 3, sp * 0.4, sp, () => ({ kind: 'chip', ramp: C, tone: k.R.pick([1, 2, 3]), s: k.R.range(2.5, 5), life: k.R.range(0.8, 1.4), g: 560 }), { a0: -Math.PI * 0.88, a1: -Math.PI * 0.12 });
const sparks = (k, x, y, n, sp, C, o = {}) => k.ps.burst(k.R, n, x, y, sp * 0.35, sp, () => ({ kind: 'spark', ramp: C, life: k.R.range(0.25, 0.6), drag: 2.5, g: 0, ...o }));
// cracks running out across the floor from a point
function cracks(p, x, y, r, k, C, seed = 1, n = 6) {
  if (k <= 0) return; p.ink = false;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + hash(i, seed) * 0.8, l = r * (0.5 + hash(i, seed + 3) * 0.5) * k; const mx = x + Math.cos(a) * l * 0.5 + (hash(i, seed + 5) - 0.5) * 5, my = y + Math.sin(a) * l * 0.5 * FY; p.path([[x, y], [mx, my], [x + Math.cos(a) * l, y + Math.sin(a) * l * FY]], C, 1, 1); }
  p.ink = true;
}
// small things that loop for ever behind a flying head: fn(x, y, phase 0..1, i)
function wake(t, dur, n, len, spread, fn) { for (let i = 0; i < n; i++) { const ph = (t / dur * (1 + (i % 2)) + hash(i, 7)) % 1; fn(-ph * len, (hash(i, 9) - 0.5) * spread * (0.3 + ph), ph, i); } }
const plus = (p, x, y, s, c, core = WHITE) => { p.line(x - s, y, x + s, y, c, 1, Math.max(1, s * 0.7)); p.line(x, y - s, x, y + s, c, 1, Math.max(1, s * 0.7)); if (s >= 3) { p.ink = false; p.line(x - s + 1, y, x + s - 1, y, core, 1, 1); p.line(x, y - s + 1, x, y + s - 1, core, 1, 1); p.ink = true; } };

// ───────── the wind-up in the caster's hand ─────────
const charge = (C) => fx(null, { w: 110, h: 96, ox: 55, oy: 48, dur: 0.8, px: 0.034 }, () => (p, t) => {
  const g = seg(t, 0, 0.7), late = t > 0.7;
  p.glow(0, 0, 10 + 22 * g, C[3], 0.35 + 0.6 * g);
  if (!late) p.ring(0, 0, lerp(30, 8, smooth(g)), 1.5, C[g > 0.5 ? 4 : 3], 1, { sides: 6, rot: t * 5 }); if (!late) p.ring(0, 0, lerp(44, 14, smooth(g)), 1, C[2], 1, { sides: 6, rot: -t * 3 });
  p.ink = false;
  for (let i = 0; i < 16; i++) { // motes are pulled in along a curl
    const k = seg(t, hash(i) * 0.45, hash(i) * 0.45 + 0.28); if (k <= 0 || k >= 1) continue;
    const a = hash(i, 2) * TAU + k * 1.6, r = lerp(34 + hash(i, 4) * 12, 3, k * k), r2 = lerp(34 + hash(i, 4) * 12, 3, clamp(k - 0.12) ** 2), a2 = a - 0.19;
    p.line(Math.cos(a2) * r2, Math.sin(a2) * r2, Math.cos(a) * r, Math.sin(a) * r, C[k > 0.6 ? 5 : 4], 1, 1);
  }
  p.ink = true;
  const r = late ? 11 - (t - 0.7) * 40 : 3 + 7 * g * g + Math.sin(t * 40) * 0.7;
  p.diamond(0, 0, r + 2, C[3]); p.ink = false; p.diamond(0, 0, r, C[4]); p.diamond(0, 0, r * 0.55, WHITE); p.ink = true;
  if (late) { p.star(0, 0, Math.round(16 - (t - 0.7) * 60), WHITE, C[4]); p.ring(0, 0, 8 + (t - 0.7) * 260, 2, C[5], 1, { sides: 6, rot: 0.5 }); }
});
for (const el of ['fire', 'ice', 'wind', 'earth', 'holy', 'poison', 'arcane']) { charge(RAMP[el]); FX['charge_' + el] = FX.null; } delete FX.null;

// ───────── things that fly (nose at 0, 0, flying right) ─────────
const shot = { w: 150, h: 60, ox: 124, oy: 30, dur: 0.8 };
fx('fireball', { ...shot, px: 0.04 }, () => (p, t) => {
  const C = RAMP.fire; p.glow(-4, 0, 26, C[3], 0.9);
  for (let j = 9; j >= 0; j--) { // a tail of flame that licks up and down
    const x = -8 - j * 7, r = 9 - j * 0.8 + Math.sin(t * TAU * 5 + j) * 0.8, y = Math.sin(t * TAU * 2.5 + j * 0.9) * j * 0.55;
    p.ball(x, y, r, j > 6 ? [C[0], C[1], C[2]] : j > 3 ? [C[1], C[2], C[3]] : [C[2], C[3], C[4]]);
  }
  p.ink = false; p.ball(-9, 0, 5.5, [C[3], C[4], C[5]]); p.diamond(-7, -1, 2.5, WHITE); p.ink = true;
  wake(t, 0.8, 9, 110, 30, (x, y, ph, i) => { p.ink = false; p.px(x - 10, y, C[ph < 0.4 ? 5 : ph < 0.7 ? 4 : 2]); if (i % 3 === 0 && ph < 0.6) p.diamond(x - 10, y, 1.5, C[4]); p.ink = true; });
});
// a firebolt: a thin dart of flame, quick and straight (the fireball above is the heavy one)
fx('firebolt', { ...shot, w: 130, ox: 112, h: 36, oy: 18, px: 0.032 }, () => (p, t) => {
  const C = RAMP.fire, f = Math.sin(t * TAU * 5); p.glow(-10, 0, 16, C[3], 0.7);
  p.poly([[0, 0], [-14, -5 - f], [-30, -3], [-62, 0]], C[3]); p.poly([[0, 0], [-14, 5 + f], [-30, 3], [-62, 0]], C[2]);
  for (let i = 0; i < 3; i++) { const ph = (t / 0.8 * 2 + i / 3) % 1, sd = i % 2 ? 1 : -1; p.poly([[-18 - ph * 30, sd * 3], [-26 - ph * 34, sd * (6 + ph * 4)], [-30 - ph * 30, sd * 2]], C[ph < 0.5 ? 3 : 2]); } // tongues peel off the shaft
  p.ink = false; p.poly([[-2, 0], [-13, -2.5], [-40, 0], [-13, 2.5]], C[4]); p.line(-3, 0, -30, 0, WHITE, 1, 1); p.ink = true;
  wake(t, 0.8, 8, 90, 14, (x, y, ph) => { p.ink = false; p.px(x - 40, y, C[ph < 0.4 ? 5 : ph < 0.7 ? 4 : 2]); p.ink = true; });
});
fx('icelance', { ...shot, h: 44, oy: 22, px: 0.032 }, () => (p, t) => {
  const C = RAMP.ice; p.glow(-14, 0, 20, C[3], 0.6);
  p.poly([[0, 0], [-16, -5], [-58, -2], [-66, 0]], C[4]); p.poly([[0, 0], [-16, 5], [-58, 2], [-66, 0]], C[2]); p.poly([[-16, -5], [-24, -9], [-34, -4]], C[3]); p.poly([[-20, 5], [-30, 9], [-40, 3]], C[1]);
  p.ink = false; p.line(-2, 0, -60, 0, WHITE, 1, 1); p.ink = true;
  wake(t, 0.8, 10, 100, 26, (x, y, ph, i) => { if (i % 3 === 0) p.diamond(x - 30, y, 2 * (1 - ph), C[4]); else { p.ink = false; p.px(x - 30, y, ph < 0.5 ? WHITE : C[3]); p.ink = true; } });
  p.ink = false; for (let i = 0; i < 3; i++) { const ph = (t / 0.8 * 2 + i / 3) % 1; p.line(-70 - ph * 40, (i - 1) * 7, -84 - ph * 40, (i - 1) * 7, C[4], 1 - ph, 1); } p.ink = true;
});
fx('arrow', { ...shot, w: 110, ox: 100, h: 24, oy: 12, dur: 0.6, px: 0.03 }, () => (p, t) => {
  const S = RAMP.steel, E = RAMP.earth;
  p.line(-46, 0, -6, 0, E[3], 1, 2); p.poly([[0, 0], [-9, -4], [-7, 0], [-9, 4]], S[4]);
  p.poly([[-46, 0], [-52, -4], [-42, -4], [-38, 0]], RAMP.blood[3]); p.poly([[-46, 0], [-52, 4], [-42, 4], [-38, 0]], RAMP.blood[2]);
  p.ink = false; for (let i = 0; i < 3; i++) { const ph = (t / 0.6 * 2 + i / 3) % 1; p.line(-56 - ph * 30, (i - 1) * 5, -70 - ph * 30, (i - 1) * 5, WHITE, 0.9 - ph * 0.7, 1); } p.ink = true;
});
// spell bolts: a cut gem, each element with its own wake
const orb = (el, style) => fx('orb_' + el, { ...shot, w: 130, ox: 104 }, () => (p, t) => {
  const C = RAMP[el]; const spin = Math.floor(t * 15) % 2; p.glow(-6, 0, 22, C[3], 0.8);
  for (let j = 3; j >= 1; j--) p.diamond(-6 - j * 13, Math.sin(t * TAU * 2.5 + j) * 2, 7 - j * 1.6, C[3 - Math.min(2, j)], j === 3 ? 0.6 : 1); // after-images
  if (style === 'rock') { p.ball(-7, 0, 7.5, [C[1], C[2], C[4]]); p.ink = false; p.px(-9, -3, C[5]); p.ink = true; }
  else { p.diamond(-7, 0, 8.5, C[2]); p.ink = false; p.diamond(-7, 0, 6.5, C[spin ? 3 : 4]); p.diamond(-8, -1, 3, WHITE); p.ink = true; }
  if (style === 'ring') p.ring(-7, 0, 12, 1.5, C[4], 1, { sides: 6, rot: t * TAU * 1.25 });
  if (style === 'star') p.star(-7, 0, 11 + spin * 2, WHITE, C[4]);
  if (style === 'gust') for (let i = 0; i < 2; i++) { const ph = (t / 0.8 * 2 + i * 0.5) % 1; p.ink = false; p.arc(-22 - ph * 50, 0, 10 + ph * 6, -1.1, 1.1, 2, C[4], 1 - ph); p.ink = true; }
  wake(t, 0.8, 12, 96, 30, (x, y, ph, i) => {
    const X = x - 16;
    if (style === 'drip') { const Y = y + ph * ph * 22; if (i % 2) p.diamond(X, Y, 2.2 * (1 - ph), C[3]); else p.dot(X, Y, C[4], 1 - ph); }
    else if (style === 'smoke') p.ball(X, y, 4.5 * (1 - ph), [C[0], C[1], C[2]]);
    else if (i % 3 === 0) p.diamond(X, y, 2.4 * (1 - ph), C[ph < 0.5 ? 4 : 3]);
    else { p.ink = false; p.line(X, y, X - 5 * (1 - ph), y, C[ph < 0.4 ? 5 : 3], 1, 1); p.ink = true; }
  });
});
orb('arcane', 'ring'); orb('holy', 'star'); orb('shadow', 'smoke'); orb('poison', 'drip'); orb('wind', 'gust'); orb('earth', 'rock');

// ───────── what an element does where it lands ─────────
fx('blast', { w: 230, h: 220, ox: 115, oy: 176, dur: 2.4, px: 0.04, hit: 0.05, floor: true }, (k) => {
  k.at(0.04, () => boom(k, 0, -4, 1.25));
  return (p, t) => {
    const C = RAMP.fire; const s = seg(t, 0.04, 2.2);
    p.ink = false; p.plate(0, 0, 30, INK, 0.7 * (1 - s) * seg(t, 0.04, 0.12), { sy: FY, sides: 6, rot: 0.3 }); p.ink = true; // scorch
    p.glow(0, -14, 80, C[3], 1.2 * (1 - seg(t, 0.04, 0.7))); p.glow(0, 0, 60, C[2], 0.5 * (1 - seg(t, 0.3, 1.6)), FY);
    shock(p, 0, 0, t, 0.04, 0.45, 8, 84, C, { rot: 0.3 }); shock(p, 0, 0, t, 0.12, 0.5, 4, 60, C, { th: 2, rot: 0.3 });
    k.ps.draw(p, true); k.ps.draw(p); flash(p, 0, -12, 17, t, 0.0, C);
  };
});
// a small burn where one fire bolt lands: tongues of flame snap out and are gone (the blast above is for explosions)
fx('hit_fire', { w: 120, h: 130, ox: 60, oy: 70, dur: 1.0, px: 0.034, hit: 0.08 }, (k) => {
  const C = RAMP.fire, N = 7, sp = [...Array(N)].map((_, i) => ({ a: (i / N) * TAU + k.R.range(-0.3, 0.3), l: k.R.range(14, 26), w: k.R.range(3, 5) }));
  k.at(0.08, () => { sparks(k, 0, 0, 12, 190, C, { g: 300 });
    k.ps.burst(k.R, 5, 0, 0, 15, 50, () => ({ kind: 'puff', ramp: C, tone: 3, s: k.R.range(4, 7), life: k.R.range(0.3, 0.55), drag: 4, g: -90 }));
    k.ps.burst(k.R, 3, 0, -4, 8, 30, () => ({ kind: 'puff', ramp: smokeR, tone: 2, s: k.R.range(4, 6), life: k.R.range(0.5, 0.8), delay: 0.2, drag: 2.5, g: -40 })); });
  return (p, t) => {
    p.glow(0, 0, 36, C[3], 1 - seg(t, 0.08, 0.6)); shock(p, 0, 0, t, 0.08, 0.3, 4, 34, C, { sy: 1, th: 2 });
    const g = seg(t, 0.06, 0.16), fade = seg(t, 0.2, 0.42); if (g > 0 && fade < 1) sp.forEach((s) => spike(p, 0, 0, s.a, s.l * out(g) * (1 - fade), s.w * (1 - fade * 0.6), C, false));
    k.ps.draw(p, true); k.ps.draw(p); flash(p, 0, 0, 9, t, 0.05, C);
  };
});
fx('hit_ice', { w: 130, h: 130, ox: 65, oy: 65, dur: 1.6, px: 0.034, hit: 0.1 }, (k) => {
  const C = RAMP.ice, N = 9, sp = [...Array(N)].map((_, i) => ({ a: (i / N) * TAU + k.R.range(-0.25, 0.25), l: k.R.range(22, 46), w: k.R.range(3.5, 6) }));
  k.at(0.1, () => { sparks(k, 0, 0, 10, 200, C); k.ps.burst(k.R, 10, 0, 0, 20, 70, () => ({ kind: 'mote', ramp: C, tone: 3, life: k.R.range(0.6, 1.3), drag: 2, g: 30 })); });
  k.at(0.95, () => sp.forEach((s) => { for (let j = 0; j < 3; j++) { const d = s.l * (0.3 + j * 0.3); k.ps.spawn({ kind: 'shard', ramp: C, tone: k.R.pick([2, 3, 4]), x: Math.cos(s.a) * d, y: Math.sin(s.a) * d, vx: Math.cos(s.a) * k.R.range(20, 70), vy: Math.sin(s.a) * k.R.range(20, 70) - 30, g: 420, s: k.R.range(4, 8), rot: s.a, va: k.R.range(-8, 8), life: k.R.range(0.4, 0.65) }); } }));
  return (p, t) => {
    p.glow(0, 0, 44, C[3], 0.9 * (1 - seg(t, 0.1, 1.2))); shock(p, 0, 0, t, 0.1, 0.4, 6, 56, C, { sy: 1, th: 2 });
    if (t < 0.95) { const g = seg(t, 0.05, 0.17), o = 1 + 0.18 * bump(seg(t, 0.17, 0.3)); const sh = t > 0.8 ? (Math.floor(t * 30) % 2) * 1.5 : 0; // snap out, overshoot, hold, tremble
      sp.forEach((s, i) => spike(p, sh * (i % 2 ? 1 : -1), 0, s.a, s.l * out(g) * o, s.w, i % 3 === 0 ? [C[0], C[1], C[2], C[3], C[3], C[4]] : C)); }
    if (t > 0.3 && t < 0.9) for (let i = 0; i < 3; i++) if (Math.floor(t * 8 + i * 1.3) % 3 === 0) p.star(Math.cos(sp[i * 3].a) * sp[i * 3].l * 0.8, Math.sin(sp[i * 3].a) * sp[i * 3].l * 0.8, 3, WHITE, C[4]);
    k.ps.draw(p); flash(p, 0, 0, 12, t, 0.07, C);
  };
});
fx('hit_wind', { w: 150, h: 160, ox: 75, oy: 146, dur: 1.0, px: 0.022, hit: 0.15, floor: true }, (k) => {
  const C = RAMP.wind;
  k.at(0.1, () => { dust(k, 0, 0, 6, 60, C, 3); for (let i = 0; i < 9; i++) k.ps.spawn({ kind: 'chip', ramp: RAMP.leaf, tone: k.R.pick([2, 3, 4]), x: k.R.range(-20, 20), y: -k.R.range(4, 40), vx: k.R.sign() * k.R.range(60, 140), vy: -k.R.range(40, 150), drag: 1.5, g: 120, s: 3, life: k.R.range(0.5, 0.85) }); });
  return (p, t) => {
    const g = out(seg(t, 0.03, 0.22)), end = seg(t, 0.7, 1.0); p.glow(0, -50, 60, C[3], 0.5 * g * (1 - end));
    for (const back of [true, false]) for (let i = 0; i < 9; i++) { // stacked gusts, each turning at its own pace
      const u = i / 8, y = -6 - u * 118 * g, r = (9 + u * 44 + Math.sin(t * 9 + i) * 3) * g * (1 - end * 0.6), a = t * (13 - u * 4) + i * 1.9;
      const lo = back ? Math.PI + 0.1 : 0.1, hi = back ? TAU - 0.1 : Math.PI - 0.1; const a0 = Math.max(lo, ((a % TAU) + TAU) % TAU - 1.4), a1 = Math.min(hi, ((a % TAU) + TAU) % TAU + 1.4);
      if (a1 > a0 && r > 2) p.arc(0, y, r, a0, a1, 2.5 + u * 2, back ? C[1] : i % 2 ? C[4] : C[3], end > 0 ? 1 - end : 1, { sy: 0.4 });
    }
    shock(p, 0, 0, t, 0.12, 0.4, 6, 60, C, { th: 2 }); k.ps.draw(p, true); k.ps.draw(p);
  };
});
fx('hit_earth', { w: 240, h: 150, ox: 120, oy: 128, dur: 1.9, px: 0.03, hit: 0.2, floor: true }, (k) => {
  const C = dirt, sp = [[0, 78, 13, 0], [-26, 52, 10, -0.22], [24, 58, 11, 0.2], [-48, 30, 8, -0.4], [46, 34, 8, 0.38], [-10, 40, 9, -0.1], [12, 36, 8, 0.12]];
  k.at(0.16, () => { rocks(k, 0, 0, 14, 300); dust(k, 0, 0, 10, 110, C, 3); });
  k.at(1.25, () => { dust(k, 0, 0, 8, 60, C, 3); rocks(k, 0, -10, 8, 120); });
  return (p, t) => {
    cracks(p, 0, 0, 80, seg(t, 0.05, 0.2) * (1 - seg(t, 1.5, 1.9)), C[0], 4, 8); k.ps.draw(p, true);
    const up = seg(t, 0.14, 0.24), o = 1 + 0.12 * bump(seg(t, 0.24, 0.4)), down = seg(t, 1.2, 1.55);
    [5, 6, 3, 4, 1, 2, 0].forEach((i) => { const [x, h, w, lean] = sp[i]; const d = clamp(up * 1.4 - i * 0.05); const hh = h * out(d) * o * (1 - down * down); // the far row first
      spike(p, x, 2, -Math.PI / 2 + lean, hh, w, i > 4 ? [C[0], C[0], C[1], C[2], C[2], C[3]] : C, false); if (hh > 12 && i < 5) { p.ink = false; p.line(x + 1, -hh * 0.3, x + lean * hh * 0.6 + 1, -hh * 0.75, C[5], 1, 1); p.ink = true; } });
    shock(p, 0, 0, t, 0.18, 0.45, 10, 96, C); k.ps.draw(p); flash(p, 0, -20, 12, t, 0.18, C);
  };
});
fx('hit_holy', { w: 180, h: 200, ox: 90, oy: 172, dur: 1.6, px: 0.034, hit: 0.35, floor: true }, (k) => {
  const C = RAMP.holy;
  k.at(0.35, () => { sparks(k, 0, -6, 12, 190, C, { g: 300 }); for (let i = 0; i < 14; i++) k.ps.spawn({ kind: 'ember', ramp: C, x: k.R.range(-26, 26), y: -k.R.range(0, 30), vy: -k.R.range(25, 70), life: k.R.range(0.6, 1.2), delay: k.R.range(0, 0.5), s: 2 }); });
  return (p, t) => {
    const seal = seg(t, 0, 0.3), end = seg(t, 1.1, 1.6); // a seal is drawn, a blade of light falls on it
    p.glow(0, 0, 58, C[3], 0.6 * seal * (1 - end), FY);
    p.ring(0, 0, 40, 2, C[3], seal * (1 - end), { sy: FY, sides: 6, rot: t * 0.8, keep: (a) => (a + Math.PI) / TAU < seal }); p.ring(0, 0, 27, 1.5, C[4], seal * (1 - end), { sy: FY, sides: 6, rot: -t * 1.2 + 0.5 });
    const fall = seg(t, 0.22, 0.35), wd = t < 0.35 ? 2 : lerp(26, 0, seg(t, 0.4, 1.0) ** 0.6);
    if (t > 0.22 && wd > 0.5) { const top = -170, bot = t < 0.35 ? lerp(top, 0, fall) : 0;
      p.glow(0, -70, 60, C[3], t < 0.35 ? 0.4 : 0.9 * (1 - seg(t, 0.4, 1.0)));
      p.poly([[-wd / 2 - 3, top], [wd / 2 + 3, top], [wd / 2 + 1, bot - 3], [0, bot + 3], [-wd / 2 - 1, bot - 3]], C[3]); p.ink = false; p.poly([[-wd / 2, top], [wd / 2, top], [wd / 2 - 1, bot - 4], [0, bot], [-wd / 2 + 1, bot - 4]], C[4]); p.line(0, top, 0, bot - 2, WHITE, 1, Math.max(1, wd * 0.45)); p.ink = true; }
    shock(p, 0, 0, t, 0.35, 0.5, 8, 74, C); k.ps.draw(p); flash(p, 0, -6, 14, t, 0.35, C);
    if (t > 0.5 && t < 1.2) p.star(0, -52 - (t - 0.5) * 40, Math.round(7 * (1 - seg(t, 0.5, 1.2))) + 2, WHITE, C[4]);
  };
});
fx('hit_shadow', { w: 160, h: 160, ox: 80, oy: 80, dur: 1.15, px: 0.026, hit: 0.5 }, (k) => {
  const C = RAMP.shadow;
  k.at(0.5, () => { k.ps.burst(k.R, 12, 0, 0, 90, 260, () => ({ kind: 'chip', ramp: C, tone: k.R.pick([1, 2, 3]), s: k.R.range(3, 6), life: k.R.range(0.35, 0.6), drag: 4 })); k.ps.burst(k.R, 8, 0, 0, 30, 90, () => ({ kind: 'puff', ramp: C, tone: 1, s: k.R.range(6, 10), life: k.R.range(0.35, 0.6), drag: 3 })); sparks(k, 0, 0, 10, 300, C); });
  return (p, t) => {
    const g = seg(t, 0, 0.5); // everything is drawn in to a dark point, which then bursts
    if (t < 0.5) { p.ring(0, 0, lerp(70, 10, g * g), 2, C[3], 0.3 + g * 0.7, { sides: 6, rot: -t * 6 });
      p.ink = false; for (let i = 0; i < 18; i++) { const kk = seg(t, hash(i, 3) * 0.3, hash(i, 3) * 0.3 + 0.22); if (kk <= 0 || kk >= 1) continue; const a = hash(i, 5) * TAU, r0 = 74 * (1 - kk * kk), r1 = Math.min(74, r0 + 14); p.line(Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r0, Math.sin(a) * r0, C[kk > 0.5 ? 4 : 3], 1, 1); } p.ink = true;
      p.disc(0, 0, 4 + g * 12 + Math.sin(t * 50), C[3]); p.ink = false; p.disc(0, 0, 2 + g * 11, INK); p.ink = true; }
    else { const d = seg(t, 0.5, 0.75); p.glow(0, 0, 70, C[3], 1.1 * (1 - seg(t, 0.5, 1.0))); if (d < 1) { p.disc(0, 0, lerp(16, 44, out(d)), C[1], 1 - d); } shock(p, 0, 0, t, 0.5, 0.45, 12, 76, C, { sy: 1, rot: 0.5 }); shock(p, 0, 0, t, 0.56, 0.45, 6, 54, C, { sy: 1, th: 2 }); }
    k.ps.draw(p); flash(p, 0, 0, 15, t, 0.5, C);
  };
});
fx('hit_poison', { w: 130, h: 100, ox: 65, oy: 78, dur: 1.7, px: 0.034, hit: 0.15, floor: true }, (k) => {
  const C = RAMP.poison;
  k.at(0.13, () => { k.ps.burst(k.R, 16, 0, -4, 70, 210, () => ({ kind: 'chip', ramp: C, tone: k.R.pick([2, 3, 4]), s: k.R.range(2.5, 5), life: k.R.range(0.55, 0.95), g: 600 }), { a0: -Math.PI * 0.92, a1: -Math.PI * 0.08 }); for (let i = 0; i < 6; i++) k.ps.spawn({ kind: 'puff', ramp: C, tone: 2, x: k.R.range(-22, 22), y: -2, vy: -k.R.range(14, 34), s: k.R.range(4, 7), life: k.R.range(0.7, 1.2), delay: k.R.range(0.15, 0.7) }); });
  return (p, t) => {
    const s = out(seg(t, 0.13, 0.4)), end = seg(t, 1.2, 1.7); const r = 34 * s * (1 - end * 0.5);
    p.glow(0, 0, 50, C[3], 0.5 * s * (1 - end), FY);
    if (r > 2) { p.plate(0, 0, r + 2, C[1], end > 0.5 ? 2 - end * 2 : 1, { sy: FY }); p.ink = false; p.plate(0, 0, r, C[2], end > 0.5 ? 2 - end * 2 : 1, { sy: FY }); p.plate(-r * 0.2, -1, r * 0.5, C[3], end > 0.3 ? 0 : 1, { sy: FY }); p.ink = true; }
    if (t > 0.13 && t < 0.4) { const c = seg(t, 0.13, 0.4); for (let i = 0; i < 7; i++) { const x = (i - 3) * 7; spike(p, x, 0, -Math.PI / 2 + (i - 3) * 0.2, (18 + (i % 2) * 8) * bump(c), 3, C, false); } } // the crown of the splash
    for (let i = 0; i < 5; i++) { const ph = (t * 1.3 + hash(i, 2)) % 1; if (t > 0.35 && t < 1.4) { const x = (hash(i, 4) - 0.5) * 44, y = -ph * 22; if (ph < 0.85) p.ring(x, y, 1.5 + hash(i) * 2, 1, C[4]); else p.star(x, y, 2, C[5], C[4]); } } // bubbles
    k.ps.draw(p); flash(p, 0, -6, 9, t, 0.13, C);
  };
});
fx('hit_arcane', { w: 170, h: 150, ox: 85, oy: 75, dur: 1.3, px: 0.03, hit: 0.2 }, (k) => {
  const C = RAMP.arcane;
  k.at(0.2, () => { sparks(k, 0, 0, 12, 260, C); k.ps.burst(k.R, 12, 0, 0, 40, 150, () => ({ kind: 'chip', ramp: C, tone: k.R.pick([3, 4]), s: k.R.range(2, 4), life: k.R.range(0.5, 1.0), drag: 3.5 })); });
  return (p, t) => {
    const g = seg(t, 0, 0.2), o = out(seg(t, 0.2, 0.5)), end = seg(t, 0.8, 1.3); // a seal snaps shut, then opens
    p.glow(0, 0, 60, C[3], 0.4 + 0.8 * (1 - seg(t, 0.2, 0.9)));
    const r = t < 0.2 ? lerp(46, 14, g * g) : lerp(14, 44, o);
    p.ring(0, 0, r, 2, C[3], 1 - end, { sides: 6, rot: t * 3 }); p.ring(0, 0, r * 0.62, 1.5, C[4], 1 - end, { sides: 3, rot: -t * 4 }); p.ring(0, 0, r * 0.62, 1.5, C[4], 1 - end, { sides: 3, rot: -t * 4 + Math.PI });
    if (t > 0.2) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t * 3; p.diamond(Math.cos(a) * r, Math.sin(a) * r, 3 * (1 - end), C[5]); }
    shock(p, 0, 0, t, 0.2, 0.4, 10, 70, C, { sy: 1, th: 2 }); k.ps.draw(p); flash(p, 0, 0, 13, t, 0.2, C);
  };
});
fx('hit_spark', { w: 120, h: 100, ox: 60, oy: 50, dur: 0.5, px: 0.036 }, (k) => {
  const C = RAMP.steel; sparks(k, 0, 0, 12, 320, RAMP.holy, { drag: 4 }); k.ps.burst(k.R, 5, 0, 0, 60, 160, () => ({ kind: 'chip', ramp: C, tone: 4, s: 3, life: k.R.range(0.25, 0.45), drag: 3, g: 300 }));
  return (p, t) => {
    const d = seg(t, 0.066, 0.4); p.glow(0, 0, 34, RAMP.holy[4], 1 - seg(t, 0, 0.4));
    if (t >= 0.066 && d < 1) for (let i = 0; i < 4; i++) { const a = 0.45 + (i * TAU) / 4, l0 = 8 + d * 20, l1 = l0 + 26 * (1 - d) * (i % 2 ? 0.6 : 1); p.ink = false; p.line(Math.cos(a) * l0, Math.sin(a) * l0, Math.cos(a) * l1, Math.sin(a) * l1, d < 0.4 ? WHITE : C[4], 1, 3 * (1 - d), 1); p.ink = true; }
    shock(p, 0, 0, t, 0.05, 0.3, 6, 34, C, { sy: 1, th: 2 }); k.ps.draw(p); flash(p, 0, 0, 10, t, 0, RAMP.holy);
  };
});
fx('hit_crit', { w: 170, h: 140, ox: 85, oy: 70, dur: 0.9, px: 0.03 }, (k) => {
  const C = RAMP.blood, G = RAMP.holy; sparks(k, 0, 0, 20, 420, G, { drag: 4 }); k.ps.burst(k.R, 10, 0, 0, 80, 240, () => ({ kind: 'chip', ramp: k.R() < 0.5 ? C : G, tone: 3, s: k.R.range(3, 5), life: k.R.range(0.4, 0.8), drag: 2.5, g: 260 }));
  return (p, t) => {
    const d = seg(t, 0.066, 0.6), hold = 1 - d * d; p.glow(0, 0, 60, C[3], 1.2 * (1 - seg(t, 0, 0.7)));
    if (t >= 0.066 && d < 1) { // a jagged eight-point burst that holds a beat, then closes
      const pts = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + 0.2, r = i % 2 ? 11 : (i % 4 === 0 ? 62 : 36) * (0.55 + 0.45 * out(seg(t, 0.066, 0.2))); pts.push([Math.cos(a) * r * hold, Math.sin(a) * r * hold * 0.82]); }
      p.poly(pts, C[2]); p.ink = false; p.poly(pts.map(([x, y]) => [x * 0.72, y * 0.72]), G[3]); p.poly(pts.map(([x, y]) => [x * 0.4, y * 0.4]), WHITE); p.ink = true; }
    shock(p, 0, 0, t, 0.066, 0.4, 14, 78, G, { sy: 1 }); shock(p, 0, 0, t, 0.16, 0.4, 8, 56, C, { sy: 1, th: 2, rot: 0.5 }); k.ps.draw(p); flash(p, 0, 0, 18, t, 0, G);
  };
});
fx('hit_blunt', { w: 110, h: 100, ox: 55, oy: 50, dur: 0.9, px: 0.036 }, (k) => {
  const C = RAMP.steel; k.ps.burst(k.R, 7, 0, 0, 50, 130, () => ({ kind: 'puff', ramp: smokeR, tone: 4, s: k.R.range(4, 7), life: k.R.range(0.35, 0.7), drag: 4 })); k.ps.burst(k.R, 6, 0, 0, 80, 200, () => ({ kind: 'chip', ramp: RAMP.holy, tone: 3, s: 3, life: k.R.range(0.4, 0.7), drag: 3, g: 240 }));
  return (p, t) => { p.glow(0, 0, 36, C[4], 1 - seg(t, 0, 0.5)); shock(p, 0, 0, t, 0.03, 0.4, 6, 40, C, { sy: 1, th: 5 }); shock(p, 0, 0, t, 0.12, 0.4, 4, 28, C, { sy: 1, th: 2, rot: 0.5 }); k.ps.draw(p);
    for (let i = 0; i < 3; i++) { const d = seg(t, 0.15, 0.85), a = t * 7 + i * 2.1; if (d > 0 && d < 1) p.star(Math.cos(a) * 20, -18 + Math.sin(a) * 6, 3, RAMP.holy[4], RAMP.holy[3]); } // stars going round
    flash(p, 0, 0, 12, t, 0, C); };
});
fx('zap', { w: 130, h: 120, ox: 65, oy: 70, dur: 0.9, px: 0.036 }, (k) => {
  const C = VOLT; sparks(k, 0, 0, 14, 280, C, { drag: 3, g: 200 });
  return (p, t) => {
    const R = rng(11 + Math.floor(t * 15)); const live = t < 0.5 && Math.floor(t * 15) % 3 !== 2; p.glow(0, 0, 44, C[3], 1.1 * (1 - seg(t, 0, 0.7)));
    if (live) { p.ink = true; p.bolt(R.range(-16, 16), -68, 0, 0, C[2], R, { jag: 9, steps: 7, w: 4, fork: 3, forkC: C[3] }); const R2 = rng(11 + Math.floor(t * 15)); p.ink = false; p.bolt(R2.range(-16, 16), -68, 0, 0, WHITE, R2, { jag: 9, steps: 7, w: 1.5 }); p.ink = true; }
    if (t < 0.65) for (let i = 0; i < 4; i++) { const a = R.range(0, TAU), l = R.range(14, 30); p.ink = false; p.bolt(0, 0, Math.cos(a) * l, Math.sin(a) * l, i % 2 ? C[4] : C[3], R, { jag: 4, steps: 3 }); p.ink = true; }
    shock(p, 0, 0, t, 0.03, 0.35, 6, 44, C, { sy: 1, th: 2 }); k.ps.draw(p); flash(p, 0, 0, 12, t, 0, C);
  };
});

// ───────── blades and blows (in front of a fighter who faces right) ─────────
// one cut: the edge sweeps a0 → a1 in `sw` seconds, stays lit, and thins away
function cut(p, t, t0, { x = -22, y = 0, r = 58, a0 = -1.15, a1 = 1.15, w = 13, sy = 1, sw = 0.1, life = 0.5, C = RAMP.steel, tint = C }) {
  const d = t - t0; if (d < 0 || d >= life) return; const k = d / life, lead = lerp(a0, a1, clamp(d / sw)), tail = lerp(a0, a1, smooth(seg(d, sw * 1.4, life)));
  const ww = w * (1 - k * k); const lo = Math.min(tail, lead), hi = Math.max(tail, lead); if (hi - lo < 0.05) return;
  p.arc(x, y, r + 1, lo, hi, ww + 3, tint[2], 1, { sy, pow: 0.8 }); p.ink = false; p.arc(x, y, r, lo, hi, ww, tint[4], 1, { sy, pow: 0.8 }); p.arc(x, y, r - 1, lo + 0.08, hi - 0.08, ww * 0.45, WHITE, 1, { sy, pow: 0.8 }); p.ink = true;
  if (d < sw + 0.07) { p.star(x + Math.cos(lead) * r, y + Math.sin(lead) * r * sy, 5, WHITE, tint[4]); p.glow(x + Math.cos(lead) * r, y + Math.sin(lead) * r * sy, 22, tint[3], 0.9); }
}
const cutSparks = (k, C, n = 8, x = 30, y = 0) => { for (let i = 0; i < n; i++) k.ps.spawn({ kind: 'spark', ramp: C, x: x + k.R.range(-6, 6), y: y + k.R.range(-26, 26), vx: k.R.range(60, 260), vy: k.R.range(-90, 90), life: k.R.range(0.2, 0.45), drag: 4 }); };
fx('slash', { w: 150, h: 150, ox: 62, oy: 75, dur: 0.75, px: 0.036 }, (k) => {
  k.at(0.08, () => { cutSparks(k, RAMP.holy, 10); k.ps.burst(k.R, 4, 30, 0, 50, 140, () => ({ kind: 'chip', ramp: RAMP.steel, tone: 4, s: 3, life: 0.4, drag: 3 }), { a0: -1, a1: 1 }); });
  return (p, t) => { cut(p, t, 0, { a0: -1.25, a1: 1.2, r: 62, w: 15, life: 0.6 }); k.ps.draw(p); };
});
fx('slash2', { w: 150, h: 150, ox: 66, oy: 75, dur: 0.8, px: 0.032 }, (k) => {
  k.at(0.07, () => cutSparks(k, RAMP.holy, 6)); k.at(0.25, () => { cutSparks(k, RAMP.holy, 8); });
  return (p, t) => { cut(p, t, 0, { x: -16, y: -18, a0: -0.75, a1: 1.3, r: 56, w: 11, life: 0.5 }); cut(p, t, 0.18, { x: -16, y: 18, a0: 0.75, a1: -1.3, r: 56, w: 11, life: 0.55 }); k.ps.draw(p); flash(p, 34, 0, 8, t, 0.24, RAMP.steel); };
});
fx('flurry', { w: 130, h: 110, ox: 55, oy: 55, dur: 0.95, px: 0.032 }, (k) => {
  const st = [...Array(6)].map((_, i) => ({ t: i * 0.085, a: k.R.range(-0.5, 0.5), y: k.R.range(-18, 18) })); st.forEach((s) => k.at(s.t + 0.03, () => cutSparks(k, RAMP.holy, 3, 40, s.y)));
  return (p, t) => {
    for (const s of st) { const d = seg(t, s.t, s.t + 0.2); if (d <= 0 || d >= 1) continue; const ca = Math.cos(s.a), sa = Math.sin(s.a), x0 = lerp(-40, 10, d), x1 = Math.min(52, -40 + d * 300); // quick stabs, each a needle of light
      p.line(x0 * ca, s.y + x0 * sa, x1 * ca, s.y + x1 * sa, RAMP.steel[2], 1, 1, 5 * (1 - d)); p.ink = false; p.line(x0 * ca, s.y + x0 * sa, x1 * ca, s.y + x1 * sa, WHITE, 1, 1, 2.5 * (1 - d)); p.ink = true; if (d < 0.5) p.star(x1 * ca, s.y + x1 * sa, 3, WHITE, RAMP.holy[4]); }
    cut(p, t, 0.52, { a0: 1.1, a1: -1.1, r: 52, w: 12, life: 0.4 }); k.ps.draw(p);
  };
});
fx('smash', { w: 180, h: 130, ox: 90, oy: 100, dur: 1.6, px: 0.034, hit: 0.2, floor: true }, (k) => {
  k.at(0.2, () => { dust(k, 0, 0, 12, 130); rocks(k, 0, 0, 12, 260); sparks(k, 0, -4, 8, 240, RAMP.holy, { g: 500 }); });
  return (p, t) => {
    const C = RAMP.steel; cracks(p, 0, 0, 58, seg(t, 0.2, 0.3) * (1 - seg(t, 1.2, 1.6)), INK, 2, 7); k.ps.draw(p, true);
    if (t < 0.2) { const d = seg(t, 0.05, 0.2), y = lerp(-90, 0, d * d); p.line(0, y - 40 * d, 0, y, C[3], 1, 2, 10); p.ink = false; p.line(0, y - 30 * d, 0, y, WHITE, 1, 1, 5); p.ink = true; } // the weight coming down
    p.glow(0, 0, 60, RAMP.holy[4], 0.9 * (1 - seg(t, 0.2, 0.7)), 0.6); shock(p, 0, 0, t, 0.2, 0.4, 8, 76, C, { th: 4 }); shock(p, 0, 0, t, 0.28, 0.45, 4, 54, C, { th: 2, rot: 0.5 }); k.ps.draw(p); flash(p, 0, -4, 14, t, 0.2, RAMP.holy);
  };
});
fx('claw', { w: 110, h: 110, ox: 50, oy: 55, dur: 0.9, px: 0.038 }, (k) => {
  k.at(0.1, () => k.ps.burst(k.R, 9, 14, 0, 50, 170, () => ({ kind: 'chip', ramp: RAMP.blood, tone: k.R.pick([2, 3]), s: k.R.range(2, 4), life: k.R.range(0.35, 0.7), g: 380, drag: 1.5 }), { a0: -0.9, a1: 1.3 }));
  return (p, t) => { for (let i = 0; i < 3; i++) cut(p, t, i * 0.04, { x: -30 + i * 2, y: -40 + i * 14, r: 54 - i * 2, a0: -0.35, a1: 1.15, w: 6, sw: 0.09, life: 0.6, tint: RAMP.blood }); k.ps.draw(p); };
});
fx('thrust', { w: 170, h: 70, ox: 80, oy: 35, dur: 0.75, px: 0.032 }, (k) => {
  k.at(0.08, () => cutSparks(k, RAMP.holy, 9, 54, 0));
  return (p, t) => {
    const C = RAMP.steel, d = seg(t, 0, 0.55); if (d < 1) { const x0 = lerp(-70, 30, smooth(seg(t, 0.08, 0.5))), x1 = Math.min(64, -70 + t * 1500); p.line(x0, 0, x1, 0, C[2], 1, 2, 11 * (1 - d * d)); p.ink = false; p.line(x0, 0, x1, 0, C[4], 1, 1, 7 * (1 - d * d)); p.line(x0 + 10, 0, x1, 0, WHITE, 1, 1, 3 * (1 - d)); p.ink = true; }
    for (let i = 0; i < 2; i++) { const kk = seg(t, 0.08 + i * 0.08, 0.5 + i * 0.08); if (kk > 0 && kk < 1) { const x = 44 - i * 26 + kk * 10, h = (16 - i * 4) * out(kk) + 4; p.ink = false; p.path([[x - h * 0.5, -h], [x, 0], [x - h * 0.5, h]], kk < 0.4 ? WHITE : C[3], 1 - kk, 2); p.ink = true; } } // the air it punched through
    k.ps.draw(p); flash(p, 62, 0, 9, t, 0.066, C);
  };
});
fx('reap', { w: 170, h: 100, ox: 75, oy: 50, dur: 1.5, px: 0.036, hit: 0.2 }, (k) => {
  const C = RAMP.shadow;
  k.at(0.2, () => { for (let i = 0; i < 12; i++) k.ps.spawn({ kind: 'ember', ramp: C, x: k.R.range(-10, 70), y: k.R.range(-14, 20), vy: -k.R.range(14, 40), life: k.R.range(0.6, 1.2), delay: k.R.range(0, 0.4), s: 2 }); k.ps.burst(k.R, 6, 40, 0, 20, 60, () => ({ kind: 'puff', ramp: C, tone: 1, s: k.R.range(5, 8), life: k.R.range(0.5, 0.9), drag: 2, g: -20 })); });
  return (p, t) => { cut(p, t, 0.08, { x: -10, y: -6, r: 78, a0: 1.3, a1: -1.2, w: 18, sy: 0.5, sw: 0.14, life: 0.8, tint: C }); k.ps.draw(p); flash(p, 62, 0, 9, t, 0.2, C); };
});
fx('spin', { w: 200, h: 110, ox: 100, oy: 80, dur: 0.8, px: 0.05, floor: true }, (k) => {
  k.at(0.1, () => dust(k, 0, 0, 10, 150));
  return (p, t) => {
    const C = RAMP.steel, lead = lerp(-0.6, TAU + 0.9, smooth(seg(t, 0, 0.42))), tail = lerp(-0.6, TAU + 0.9, smooth(seg(t, 0.12, 0.7))), w = 12 * (1 - seg(t, 0.3, 0.75) ** 2);
    const kf = (g) => Math.sin(clamp((g - tail) / Math.max(0.01, lead - tail)) * Math.PI) ** 0.7;
    const part = (lo, hi, back) => { const a = Math.max(lo, tail), b = Math.min(hi, lead); if (b - a < 0.05 || w < 0.5) return; p.arc(0, -22, 84, a, b, w + 3, C[2], 1, { sy: 0.36, kf }); p.ink = false; p.arc(0, -22, 83, a, b, w, back ? C[3] : C[4], 1, { sy: 0.36, kf }); if (!back) p.arc(0, -22, 82, a, b, w * 0.4, WHITE, 1, { sy: 0.36, kf }); p.ink = true; };
    k.ps.draw(p, true); for (let n = -1; n < 2; n++) part(n * TAU + Math.PI, n * TAU + TAU, true); for (let n = 0; n < 2; n++) part(n * TAU, n * TAU + Math.PI, false); // far half, then near half
    if (t < 0.5) p.star(Math.cos(lead) * 83, -22 + Math.sin(lead) * 83 * 0.36, 5, WHITE, RAMP.holy[4]); k.ps.draw(p);
  };
});

// ───────── areas ─────────
fx('meteor', { w: 290, h: 330, ox: 165, oy: 280, dur: 2.5, px: 0.045, hit: 0.65, floor: true }, (k) => {
  const C = RAMP.fire; k.at(0.65, () => { boom(k, 0, -4, 1.6); rocks(k, 0, 0, 12, 320); dust(k, 0, 0, 8, 140); });
  return (p, t) => {
    const s = seg(t, 0.65, 2.3); p.ink = false; p.ring(0, 0, 44 * (1 - seg(t, 0, 0.65) * 0.5), 2, C[3], t < 0.65 ? 0.4 + seg(t, 0, 0.65) * 0.6 : 0, { sy: FY, sides: 6, rot: t * 2 }); // where it will land
    p.plate(0, 0, 38, INK, 0.75 * (1 - s) * seg(t, 0.65, 0.72), { sy: FY, sides: 6 }); p.ink = true; cracks(p, 0, 0, 70, seg(t, 0.65, 0.75) * (1 - seg(t, 1.8, 2.4)), C[1], 6, 8);
    if (t < 0.65) { const d = seg(t, 0, 0.65), x = lerp(-76, 0, d), y = lerp(-250, -8, d * d); p.glow(x, y, 40, C[3], 1);
      for (let j = 8; j >= 1; j--) p.ball(x - j * 6.5 * 0.3, y - j * 9, 12 - j * 1.1 + Math.sin(t * 40 + j), j > 5 ? [C[0], C[1], C[2]] : [C[1], C[2], C[3]]);
      p.ball(x, y, 11, [dirt[0], dirt[1], dirt[2]]); p.ink = false; p.arc(x, y, 11, 0.2, 2.6, 4, C[4]); p.arc(x, y, 11, 0.6, 2.2, 2, C[5]); p.ink = true; }
    p.glow(0, -16, 110, C[3], 1.3 * (1 - seg(t, 0.65, 1.4))); p.glow(0, 0, 80, C[2], 0.5 * (1 - seg(t, 0.9, 2.2)), FY);
    shock(p, 0, 0, t, 0.65, 0.5, 10, 112, C, { th: 4 }); shock(p, 0, 0, t, 0.75, 0.55, 6, 84, C, { th: 2, rot: 0.5 }); k.ps.draw(p, true); k.ps.draw(p); flash(p, 0, -14, 22, t, 0.65, C);
  };
});
fx('starfall', { w: 190, h: 190, ox: 95, oy: 160, dur: 1.9, px: 0.05, hit: 0.45, floor: true }, (k) => {
  const C = RAMP.holy, st = [[0, 0, 0.45], [-44, -8, 0.3], [40, -12, 0.38], [-22, 10, 0.58], [30, 12, 0.66], [-56, 6, 0.74], [58, 2, 0.5]];
  st.forEach(([x, y, tt]) => k.at(tt, () => { sparks(k, x, y - 3, 6, 170, C, { g: 420 }); k.ps.burst(k.R, 4, x, y - 3, 40, 120, () => ({ kind: 'chip', ramp: C, tone: 4, s: 3, life: k.R.range(0.4, 0.8), g: 400 }), { a0: -2.8, a1: -0.3 }); }));
  return (p, t) => {
    p.glow(0, 0, 80, C[3], 0.5 * bump(seg(t, 0.2, 1.6)), FY);
    for (const [x, y, tt] of st) { const d = seg(t, tt - 0.26, tt);
      if (d > 0 && d < 1) { const sx = x - 34 * (1 - d), sy = y - 160 * (1 - d); p.ink = false; p.line(sx - 12, sy - 56, sx, sy, C[3], 1, 1, 5); p.line(sx - 6, sy - 28, sx, sy, WHITE, 1, 1, 3); p.ink = true; p.diamond(sx, sy, 5, C[4]); p.star(sx, sy, 7, WHITE, C[4]); p.glow(sx, sy, 18, C[3], 0.8); }
      shock(p, x, y, t, tt, 0.4, 4, 30, C, { th: 2 }); flash(p, x, y - 3, 8, t, tt, C);
      const h = seg(t, tt + 0.14, tt + 0.9); if (h > 0 && h < 1 && Math.floor(t * 15 + x) % 3) p.star(x, y - 4 - h * 14, Math.round(4 * (1 - h)) + 1, WHITE, C[4]); }
    k.ps.draw(p);
  };
});
fx('frostnova', { w: 270, h: 160, ox: 135, oy: 110, dur: 2.0, px: 0.04, hit: 0.4, floor: true }, (k) => {
  const C = RAMP.ice, N = 12, sp = [...Array(N)].map((_, i) => { const a = (i / N) * TAU + 0.26; return { a, x: Math.cos(a) * 82, y: Math.sin(a) * 82 * FY, h: k.R.range(26, 46), w: k.R.range(5, 8), lean: Math.cos(a) * 0.4 }; }).sort((a, b) => a.y - b.y);
  k.at(0.4, () => { dust(k, 0, 0, 10, 170, C, 4); sparks(k, 0, -4, 12, 260, C, { g: 300 }); });
  k.at(1.45, () => sp.forEach((s) => { for (let j = 0; j < 3; j++) k.ps.spawn({ kind: 'shard', ramp: C, tone: k.R.pick([2, 3, 4]), x: s.x + s.lean * s.h * 0.4, y: s.y - s.h * (0.2 + j * 0.3), vx: k.R.range(-50, 50) + s.lean * 60, vy: -k.R.range(20, 120), g: 520, s: k.R.range(4, 8), rot: k.R.range(0, 6), va: k.R.range(-9, 9), life: k.R.range(0.35, 0.55), back: s.y < 0 }); }));
  return (p, t) => {
    const g = seg(t, 0, 0.4), end = seg(t, 1.5, 2.0);
    p.glow(0, 0, 110, C[3], (0.3 + 0.6 * (1 - seg(t, 0.4, 1.2))) * (1 - end), FY);
    p.ink = false; p.plate(0, 0, 86 * out(seg(t, 0.4, 0.55)), C[4], 0.28 * (1 - end), { sy: FY, sides: 6, rot: 0.26 }); p.ink = true; // rime on the floor
    if (t < 0.4) p.ring(0, 0, lerp(70, 6, g * g), 2, C[4], 0.4 + g * 0.6, { sy: FY, sides: 6, rot: 0.26 });
    p.ring(0, 0, 86 * out(seg(t, 0.4, 0.55)), 2, C[3], t > 0.4 ? 1 - end : 0, { sy: FY, sides: 6, rot: 0.26 });
    k.ps.draw(p, true);
    if (t > 0.4 && t < 1.45) sp.forEach((s, i) => { const d = seg(t, 0.4 + Math.abs(s.x) * 0.0006, 0.5 + Math.abs(s.x) * 0.0006), o = 1 + 0.2 * bump(seg(t, 0.5, 0.68)); const sh = t > 1.3 ? (Math.floor(t * 30) % 2) * (i % 2 ? 1 : -1) : 0;
      spike(p, s.x + sh, s.y + 1, -Math.PI / 2 + s.lean, s.h * out(d) * o, s.w, s.y < 0 ? [C[0], C[0], C[1], C[2], C[3], C[4]] : C); if (s.y >= 0 && Math.floor(t * 6 + i) % 5 === 0) p.star(s.x + s.lean * s.h * 0.9, s.y - s.h * 0.9, 3, WHITE, C[4]); });
    shock(p, 0, 0, t, 0.4, 0.5, 10, 124, C, { th: 4, rot: 0.26 }); k.ps.draw(p); flash(p, 0, -6, 16, t, 0.4, C);
  };
});
fx('dirt', { w: 250, h: 220, ox: 125, oy: 184, dur: 2.0, px: 0.04, hit: 0.05, floor: true }, (k) => {
  const C = dirt; k.at(0.04, () => { boom(k, 0, -2, 1.3, C, { smoke: false, up: 0.2 }); rocks(k, 0, 0, 20, 360); dust(k, 0, 0, 14, 150, C, 3); });
  return (p, t) => { cracks(p, 0, 0, 84, seg(t, 0.03, 0.14) * (1 - seg(t, 1.5, 2.0)), C[0], 8, 9); k.ps.draw(p, true); p.glow(0, -8, 60, C[4], 0.7 * (1 - seg(t, 0, 0.4)));
    shock(p, 0, 0, t, 0.04, 0.45, 10, 104, C, { th: 4 }); k.ps.draw(p); flash(p, 0, -8, 15, t, 0, C); };
});
fx('darkblast', { w: 250, h: 240, ox: 125, oy: 196, dur: 2.4, px: 0.04, hit: 0.5, floor: true }, (k) => {
  const C = RAMP.shadow;
  k.at(0.5, () => { boom(k, 0, -4, 1.35, C, { smoke: false }); for (let i = 0; i < 18; i++) k.ps.spawn({ kind: 'ember', ramp: C, x: k.R.range(-70, 70), y: -k.R.range(0, 30), vy: -k.R.range(20, 60), life: k.R.range(0.7, 1.5), delay: k.R.range(0.2, 0.9), s: 2 }); });
  return (p, t) => {
    const g = seg(t, 0, 0.5), end = seg(t, 1.7, 2.4);
    p.ink = false; p.plate(0, 0, t < 0.5 ? 80 * g : 80, INK, t < 0.5 ? 0.5 : 0.6 * (1 - end), { sy: FY, sides: 6 }); p.ink = true; // a pool of dark opens under them
    p.ring(0, 0, t < 0.5 ? lerp(100, 80, g) : 80, 2, C[3], t < 0.5 ? g : 1 - end, { sy: FY, sides: 6 });
    if (t < 0.5) { p.ink = false; for (let i = 0; i < 16; i++) { const kk = seg(t, hash(i, 3) * 0.3, hash(i, 3) * 0.3 + 0.2); if (kk <= 0 || kk >= 1) continue; const x = (hash(i, 5) - 0.5) * 150, y0 = -150 * (1 - kk * kk); p.line(x * (0.3 + 0.7 * (1 - kk)), y0 - 16, x * (0.3 + 0.7 * (1 - kk)), y0, C[4], 1, 1); } p.ink = true; p.disc(0, -10, 3 + g * 9, C[3]); p.ink = false; p.disc(0, -10, 2 + g * 8, INK); p.ink = true; }
    else for (let i = 0; i < 7; i++) { const d = seg(t, 0.5 + i * 0.03, 1.3 + i * 0.05); if (d <= 0 || d >= 1) continue; const x = (i - 3) * 20 + Math.sin(t * 5 + i) * 4, h = (50 + hash(i) * 50) * out(seg(d, 0, 0.3)) * (1 - seg(d, 0.6, 1)); // tongues of shadow licking up
      p.line(x, 0, x + Math.sin(t * 6 + i * 2) * 8, -h, C[1], 1, 8, 1); p.ink = false; p.line(x, 0, x + Math.sin(t * 6 + i * 2) * 6, -h * 0.7, C[2], 1, 4, 1); p.ink = true; }
    p.glow(0, -14, 100, C[3], 1.2 * (1 - seg(t, 0.5, 1.3)) * (t > 0.5 ? 1 : 0.3));
    shock(p, 0, 0, t, 0.5, 0.5, 10, 116, C, { th: 4 }); k.ps.draw(p, true); k.ps.draw(p); flash(p, 0, -12, 19, t, 0.5, C);
  };
});
fx('holypillar', { w: 200, h: 250, ox: 100, oy: 220, dur: 2.7, fps: 12, px: 0.04, hit: 0.5, floor: true }, (k) => {
  const C = RAMP.holy;
  k.at(0.5, () => { sparks(k, 0, -6, 14, 240, C, { g: 300 }); dust(k, 0, 0, 8, 130, C, 4); for (let i = 0; i < 26; i++) k.ps.spawn({ kind: 'ember', ramp: C, x: k.R.range(-34, 34), y: -k.R.range(0, 60), vy: -k.R.range(40, 110), life: k.R.range(0.6, 1.2), delay: k.R.range(0, 1.3), s: 2 }); });
  return (p, t) => {
    const seal = seg(t, 0, 0.45), end = seg(t, 2.0, 2.7), on = seg(t, 0.5, 0.58), off = seg(t, 1.6, 2.1), wd = 46 * on * (1 - off) ** 0.7;
    p.glow(0, 0, 86, C[3], 0.7 * seal * (1 - end), FY);
    p.ring(0, 0, 62, 2, C[3], 1 - end, { sy: FY, sides: 6, rot: t * 0.5, keep: (a) => (a + Math.PI) / TAU < seal }); p.ring(0, 0, 44, 1.5, C[4], seal * (1 - end), { sy: FY, sides: 6, rot: 0.5 - t * 0.8 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t * 0.5; if (i / 6 < seal) p.diamond(Math.cos(a) * 62, Math.sin(a) * 62 * FY, 3 * (1 - end), C[5]); }
    if (wd > 1) { p.glow(0, -100, 90, C[3], 0.9 * (1 - off)); const top = -214;
      p.each(-wd / 2 - 3, top, wd / 2 + 3, 0, (x, y, ix, iy) => { const a = clamp((y - top) / 40), e = Math.abs(x) / (wd / 2 + 2); if (e > 1) return; // a column of light, solid at the foot, breaking up at the top
        const band = ((y + t * 150) % 26 + 26) % 26 < 3; p.ink = e > 0.86; p.put(ix, iy, e > 0.86 ? C[2] : e > 0.55 ? (band ? C[4] : C[3]) : e > 0.25 ? C[4] : WHITE, a, true); }); p.ink = true;
      p.plate(0, 0, wd * 0.8, WHITE, 1, { sy: FY }); }
    shock(p, 0, 0, t, 0.5, 0.5, 10, 96, C, { th: 4 }); shock(p, 0, 0, t, 1.0, 0.5, 20, 84, C, { th: 2 }); k.ps.draw(p, true); k.ps.draw(p); flash(p, 0, -8, 18, t, 0.5, C);
  };
});
fx('spores', { w: 170, h: 130, ox: 85, oy: 106, dur: 2.7, fps: 12, px: 0.04, hit: 0.7, floor: true }, (k) => {
  const C = RAMP.poison, R = k.R;
  k.at(0.7, () => { for (let i = 0; i < 16; i++) k.ps.spawn({ kind: 'puff', ramp: C, tone: R.pick([1, 2, 2]), x: R.range(-10, 10), y: -R.range(2, 16), vx: R.range(-90, 90), vy: -R.range(10, 70), drag: 2.6, g: -8, s: R.range(8, 14), life: R.range(1.0, 1.9), back: i % 3 === 0 }); for (let i = 0; i < 22; i++) k.ps.spawn({ kind: 'ember', ramp: C, x: R.range(-60, 60), y: -R.range(4, 40), vy: -R.range(8, 30), life: R.range(0.8, 1.6), delay: R.range(0, 0.8), s: 2 }); });
  return (p, t) => {
    const g = seg(t, 0, 0.7), end = seg(t, 2.0, 2.7); p.glow(0, -8, 80, C[3], 0.5 * (t > 0.7 ? 1 - end : g * 0.6), 0.7);
    if (t < 0.78) { const s = out(seg(t, 0, 0.35)), sw = 1 + 0.35 * bump(seg(t, 0.4, 0.7)), pop = seg(t, 0.7, 0.78); // a pod swells, shudders, bursts
      p.line(0, 0, 0, -12 * s, RAMP.leaf[2], 1, 4); p.ball(0, -14 * s, 11 * s * sw * (1 - pop), [C[1], C[2], C[3]]); if (s > 0.8 && !pop) { p.ink = false; p.px(-4, -18, C[5]); p.px(3, -12, C[1]); p.px(-2, -10, C[1]); p.ink = true; } }
    k.ps.draw(p, true); shock(p, 0, 0, t, 0.7, 0.6, 8, 80, C); k.ps.draw(p); flash(p, 0, -12, 11, t, 0.7, C);
  };
});
fx('slam', { w: 250, h: 170, ox: 125, oy: 124, dur: 1.9, px: 0.04, hit: 0.05, floor: true }, (k) => {
  const C = RAMP.steel; k.at(0.04, () => { dust(k, 0, 0, 16, 190); rocks(k, 0, 0, 14, 300); });
  return (p, t) => { cracks(p, 0, 0, 96, seg(t, 0.03, 0.14) * (1 - seg(t, 1.4, 1.9)), INK, 5, 10); k.ps.draw(p, true); p.glow(0, 0, 90, RAMP.holy[4], 0.8 * (1 - seg(t, 0, 0.5)), 0.6);
    shock(p, 0, 0, t, 0.04, 0.4, 10, 116, C, { th: 5 }); shock(p, 0, 0, t, 0.14, 0.45, 6, 92, C, { th: 3, rot: 0.5 }); shock(p, 0, 0, t, 0.26, 0.45, 4, 66, C, { th: 2 }); k.ps.draw(p); flash(p, 0, -6, 16, t, 0, RAMP.holy); };
});

// ───────── lines and cones (from the caster's hand at 0, 0, pointing right) ─────────
// a beam is stretched to its target's distance, so it is built only from things that survive stretching
const beam = (name, C) => fx(name, { w: 240, h: 70, ox: 12, oy: 35, dur: 0.6, px: 0.034 }, () => (p, t) => {
  const L = 222, on = seg(t, 0.066, 0.14), off = seg(t, 0.3, 0.6), w = t < 0.066 ? 1 : 15 * on * (1 - off) ** 0.8;
  p.each(0, -30, L, 30, (x, y) => { const d = Math.abs(y), e2 = Math.min(1, (L - x) / 24); if (d < w * 1.6 + 5) p.add(x, y, C[3], 0.5 * (1 - d / (w * 1.6 + 5)) * (1 - off) * e2); });
  if (w >= 1) { const flick = Math.floor(t * 15) % 2; p.line(4, 0, L, 0, C[2], 1, w + 4, w * 0.7 + 3); p.ink = false; p.line(4, 0, L, 0, C[flick ? 4 : 3], 1, w + 1, w * 0.7); p.line(2, 0, L, 0, WHITE, 1, Math.max(1, w * 0.5), Math.max(1, w * 0.3));
    for (let i = 0; i < 5; i++) { const x = ((t * 420 + i * 46) % L); p.line(x, -w * 0.9 - 2, x + 16, -w * 0.9 - 2, C[5], 1 - off, 1); p.line(L - x, w * 0.9 + 2, L - x + 16, w * 0.9 + 2, C[4], 1 - off, 1); } p.ink = true; } // streaks racing along it
  else { p.ink = false; p.line(0, 0, L, 0, WHITE, 1, 1); p.ink = true; }
  if (t < 0.4) { p.diamond(2, 0, 7 * (1 - off) + 2, C[4]); p.ink = false; p.diamond(2, 0, 4 * (1 - off) + 1, WHITE); p.ink = true; }
});
beam('beam_arcane', RAMP.arcane); beam('beam_holy', RAMP.holy); beam('beam_wind', VOLT);
fx('breath_ice', { w: 190, h: 90, ox: 12, oy: 45, dur: 1.2, px: 0.034 }, () => (p, t) => {
  const C = RAMP.ice, on = seg(t, 0, 0.15), off = seg(t, 0.85, 1.2), L = 170 * out(on);
  p.each(0, -40, L, 40, (x, y) => { const sp = 6 + x * 0.2; if (Math.abs(y) < sp) p.add(x, y, C[3], 0.45 * (1 - Math.abs(y) / sp) * (1 - off) * Math.min(1, (L - x) / 30)); });
  for (let i = 0; i < 26; i++) { const ph = (t * (1.6 + (i % 3) * 0.5) + hash(i, 3)) % 1, x = ph * L, sp = 4 + x * 0.19, y = (hash(i, 5) - 0.5) * 2 * sp * 0.8; if (x < 6) continue; // frost rolling out in a widening fan
    if (i % 5 < 2) spike(p, x, y, (hash(i, 8) - 0.5) * 0.5, (9 + hash(i, 4) * 9) * (1 - ph * 0.4) * (1 - off), 2.5, C); else if (i % 5 === 2) p.star(x, y, 3, WHITE, C[4]); else if (i % 5 === 3) p.diamond(x, y, 2.5 * (1 - off), C[4]); else p.ball(x, y, (3 + ph * 5) * (1 - off), [C[3], C[4], C[5]], 1, 0.75); }
  p.diamond(2, 0, 5 * (1 - off) + 1, WHITE);
});

// ───────── help for friends ─────────
fx('heal', { w: 80, h: 110, ox: 40, oy: 92, dur: 1.7, px: 0.04, floor: true }, (k) => (p, t) => {
  const C = RAMP.leaf, end = seg(t, 1.2, 1.7); p.glow(0, -20, 44, C[3], 0.6 * bump(seg(t, 0, 1.6)));
  p.ring(0, 0, 26 * out(seg(t, 0, 0.3)), 2, C[3], 1 - end, { sy: FY, sides: 6, rot: t }); p.ring(0, 0, 17 * out(seg(t, 0.1, 0.4)), 1.5, C[4], 1 - end, { sy: FY, sides: 6, rot: -t });
  for (let i = 0; i < 6; i++) { const d = seg(t, i * 0.14, i * 0.14 + 0.9); if (d <= 0 || d >= 1) continue; const x = (hash(i, 2) - 0.5) * 40 + Math.sin(t * 4 + i) * 2; plus(p, x, -6 - out(d) * 64, (i % 2 ? 5 : 7) * bump(d * 0.9 + 0.1), C[3]); } // crosses float up
  for (let i = 0; i < 8; i++) { const ph = (t * 0.9 + hash(i, 6)) % 1; p.ink = false; if (t < 1.4) p.px((hash(i, 7) - 0.5) * 50, -ph * 70, ph < 0.5 ? WHITE : C[4]); p.ink = true; }
});
fx('heal_area', { w: 250, h: 150, ox: 125, oy: 112, dur: 2.0, px: 0.045, floor: true }, (k) => (p, t) => {
  const C = RAMP.leaf, end = seg(t, 1.5, 2.0); p.glow(0, 0, 110, C[3], 0.6 * bump(seg(t, 0, 1.9)), FY);
  p.ring(0, 0, 100 * out(seg(t, 0, 0.4)), 2.5, C[3], 1 - end, { sy: FY, sides: 6, rot: t * 0.4 }); p.ring(0, 0, 72 * out(seg(t, 0.1, 0.5)), 1.5, C[4], 1 - end, { sy: FY, sides: 6, rot: 0.5 - t * 0.6 });
  shock(p, 0, 0, t, 0.5, 0.7, 20, 108, C, { th: 2 }); shock(p, 0, 0, t, 1.0, 0.7, 20, 108, C, { th: 2 });
  for (let i = 0; i < 14; i++) { const t0 = 0.15 + hash(i, 3) * 0.8, d = seg(t, t0, t0 + 0.9); if (d <= 0 || d >= 1) continue; const a = hash(i, 5) * TAU, r = 20 + hash(i, 9) * 74; plus(p, Math.cos(a) * r, Math.sin(a) * r * FY - 4 - out(d) * 56, (i % 3 ? 3 : 5) * bump(d * 0.9 + 0.1), C[3]); }
});
fx('shield', { w: 90, h: 100, ox: 45, oy: 78, dur: 1.0, px: 0.044, floor: true }, (k) => (p, t) => {
  const C = RAMP.ice, S = RAMP.steel, a = seg(t, 0, 0.14), o = 1 + 0.22 * bump(seg(t, 0.14, 0.32)), end = seg(t, 0.75, 1.0), r = 30 * out(a) * o, cy = -26; // a hexagon of plate snaps up in front of them
  p.glow(0, cy, 46, C[3], 0.8 * (1 - seg(t, 0.1, 0.9)));
  if (r > 3) { p.plate(0, cy, r, C[3], 0.42 * (1 - end), { sides: 6, rot: Math.PI / 6 }); p.ring(0, cy, r, 3, S[4], 1 - end, { sides: 6, rot: Math.PI / 6 }); p.ring(0, cy, r * 0.66, 1.5, C[4], 1 - end, { sides: 6, rot: Math.PI / 6 });
    const g = seg(t, 0.25, 0.6); if (g > 0 && g < 1) { p.ink = false; const x = lerp(-r, r, g); p.each(x - 3, cy - r, x + 3, cy + r, (px, py, ix, iy) => { if (Math.abs(px - x + (py - cy) * 0.4) < 2.5 && Math.hypot(px, py - cy) < r * 0.82) p.raw(ix, iy, WHITE, 1); }); p.ink = true; } } // a glint crosses it
  flash(p, 0, cy, 10, t, 0.1, C); if (t > 0.14 && t < 0.5) for (let i = 0; i < 6; i++) { const an = (i / 6) * TAU + Math.PI / 6, d = seg(t, 0.14, 0.5); p.diamond(Math.cos(an) * (r + d * 12), cy + Math.sin(an) * (r + d * 12), 2.5 * (1 - d), C[5]); }
});
fx('bless', { w: 70, h: 140, ox: 35, oy: 122, dur: 1.2, px: 0.04, floor: true }, (k) => (p, t) => {
  const C = RAMP.holy, end = seg(t, 0.9, 1.2); p.glow(0, -40, 44, C[3], 0.7 * bump(seg(t, 0, 1.2)));
  p.ring(0, 0, 22 * out(seg(t, 0, 0.25)), 2, C[3], 1 - end, { sy: FY, sides: 6, rot: t * 2 });
  for (let i = 0; i < 3; i++) { const d = seg(t, i * 0.13, i * 0.13 + 0.7); if (d <= 0 || d >= 1) continue; const y = -14 - out(d) * 80, s = 13 - i * 2; // arrowheads rising: stronger
    p.path([[-s, y + s * 0.8], [0, y], [s, y + s * 0.8]], C[2], d > 0.7 ? (1 - d) / 0.3 : 1, 5); p.ink = false; p.path([[-s + 1, y + s * 0.8], [0, y + 1], [s - 1, y + s * 0.8]], d < 0.25 ? WHITE : C[4], d > 0.7 ? (1 - d) / 0.3 : 1, 2); p.ink = true; }
  const s = seg(t, 0.45, 1.1); if (s > 0 && s < 1) p.star(0, -104, Math.round(9 * bump(s)), WHITE, C[4]);
  for (let i = 0; i < 6; i++) { const ph = (t * 1.4 + hash(i, 6)) % 1; p.ink = false; if (t < 1.0) p.px((hash(i, 7) - 0.5) * 40, -ph * 100, ph < 0.5 ? WHITE : C[4]); p.ink = true; }
});
fx('smoke', { w: 190, h: 130, ox: 95, oy: 104, dur: 2.3, fps: 12, px: 0.036, floor: true }, (k) => {
  const R = k.R; for (let i = 0; i < 22; i++) k.ps.spawn({ kind: 'puff', ramp: smokeR, tone: R.pick([1, 2, 2, 3]), x: R.range(-8, 8), y: -R.range(2, 12), vx: R.range(-130, 130), vy: -R.range(10, 90), drag: 3, g: -10, s: R.range(9, 16), life: R.range(1.1, 2.2), delay: R.range(0, 0.12), back: i % 3 === 0 });
  sparks(k, 0, -4, 8, 200, RAMP.holy, { g: 500 });
  return (p, t) => { k.ps.draw(p, true); shock(p, 0, 0, t, 0, 0.4, 6, 70, RAMP.steel, { th: 2 }); k.ps.draw(p); flash(p, 0, -6, 10, t, 0, RAMP.holy); };
});
fx('portal', { w: 150, h: 150, ox: 75, oy: 122, dur: 2.2, px: 0.032, floor: true }, (k) => (p, t) => {
  const C = RAMP.arcane, open = out(seg(t, 0.1, 0.45)), close = seg(t, 1.7, 2.1), s = open * (1 - close * close), rx = 30 * s, cy = -52; // a door: a slit that opens, turns, and shuts
  p.glow(0, cy, 70, C[3], 0.8 * s); p.ring(0, 0, 34 * s, 2, C[3], 1, { sy: FY, sides: 6, rot: t });
  if (t < 0.12) { p.ink = false; p.line(0, cy - 50 * seg(t, 0, 0.1), 0, cy + 50 * seg(t, 0, 0.1), WHITE, 1, 1); p.ink = true; }
  if (rx > 2) { const sy = 46 / 30; p.disc(0, cy, rx + 3, C[3], 1, sy); p.ink = false; p.disc(0, cy, rx, C[0], 1, sy); p.disc(0, cy, rx * 0.72, INK, 1, sy);
    for (let i = 0; i < 4; i++) { const a = t * 5 + (i * TAU) / 4, r = rx * (0.92 - i * 0.14); p.arc(0, cy, r, a, a + 1.6, 2.5, C[2 + (i % 3)], 1, { sy }); }
    for (let i = 0; i < 10; i++) { const ph = (t * 1.2 + hash(i, 3)) % 1, a = hash(i, 5) * TAU + ph * 3, r = rx * (1.5 - ph * 1.3); p.px(Math.cos(a) * r, cy + Math.sin(a) * r * sy, ph > 0.6 ? WHITE : C[4]); } p.ink = true; }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + t * 2; p.diamond(Math.cos(a) * (rx + 12), cy + Math.sin(a) * (rx + 12) * 1.5, 2.5 * s, C[5]); }
  flash(p, 0, cy, 12, t, 0.1, C); flash(p, 0, cy, 9, t, 2.05, C);
});
fx('revive', { w: 170, h: 190, ox: 85, oy: 162, dur: 4.0, fps: 12, px: 0.04, floor: true }, (k) => {
  const C = RAMP.holy, R = k.R; for (let i = 0; i < 40; i++) k.ps.spawn({ kind: 'ember', ramp: C, x: R.range(-40, 40), y: -R.range(0, 20), vy: -R.range(18, 50), life: R.range(1.0, 2.0), delay: R.range(0.2, 2.8), s: 2 });
  k.at(2.0, () => sparks(k, 0, -40, 16, 220, C));
  return (p, t) => {
    const seal = seg(t, 0, 0.8), end = seg(t, 3.2, 4.0), lift = seg(t, 0.8, 2.0), y = -6 - smooth(lift) * 36; // a light is raised from the floor, and opens its wings
    p.glow(0, 0, 80, C[3], 0.6 * seal * (1 - end), FY); p.glow(0, y, 60, C[4], 0.8 * seg(t, 0.6, 2.0) * (1 - end));
    p.ring(0, 0, 50, 2, C[3], 1 - end, { sy: FY, sides: 6, rot: t * 0.4, keep: (a) => (a + Math.PI) / TAU < seal }); p.ring(0, 0, 34, 1.5, C[4], seal * (1 - end), { sy: FY, sides: 6, rot: 0.5 - t * 0.6 });
    p.each(-16, -170, 16, 0, (x, yy) => { const e = Math.abs(x) / 16; p.add(x, yy, C[4], 0.35 * (1 - e) * seg(t, 0.5, 1.2) * (1 - end)); });
    k.ps.draw(p);
    if (t > 0.8 && end < 1) { const w = out(seg(t, 2.0, 2.4)) * (1 - end); p.diamond(0, y, 6 * (1 - end) + 1, C[4]); p.ink = false; p.diamond(0, y, 3.5 * (1 - end), WHITE); p.ink = true;
      if (w > 0.05) for (const s of [-1, 1]) for (let j = 0; j < 3; j++) { const a0 = s > 0 ? -1.0 - j * 0.1 : Math.PI - 0.45 + j * 0.25, a1 = s > 0 ? 0.45 - j * 0.25 : Math.PI + 1.0 + j * 0.1; p.arc(s * 6, y + 14 + j * 5, (38 - j * 7) * w, a0, a1, 6 - j, j ? C[4] : WHITE, 1, { pow: 0.6 }); } }
    shock(p, 0, 0, t, 2.0, 0.6, 10, 80, C); flash(p, 0, -42, 15, t, 2.0, C);
  };
});

// ───────── curses and holds ─────────
fx('curse', { w: 120, h: 130, ox: 60, oy: 116, dur: 2.4, px: 0.04, floor: true }, (k) => {
  const C = RAMP.shadow, R = k.R; k.at(1.0, () => { for (let i = 0; i < 14; i++) k.ps.spawn({ kind: 'ember', ramp: C, x: R.range(-18, 18), y: -R.range(4, 40), vy: -R.range(12, 40), life: R.range(0.6, 1.2), delay: R.range(0, 0.6), s: 2 }); sparks(k, 0, -22, 8, 150, C); });
  return (p, t) => {
    const end = seg(t, 1.9, 2.4), fall = seg(t, 0.8, 1.0); p.glow(0, -30, 50, C[3], 0.5 * bump(seg(t, 0, 2.3)));
    p.ring(0, 0, 30 * out(seg(t, 0, 0.3)), 2, C[3], 1 - end, { sy: FY, sides: 6, rot: -t }); p.ink = false; p.plate(0, 0, 28 * out(seg(t, 0, 0.3)), INK, 0.4 * (1 - end), { sy: FY, sides: 6, rot: -t }); p.ink = true;
    const gem = (back) => { for (let i = 0; i < 3; i++) { const a = t * 3.2 + (i * TAU) / 3, b = Math.sin(a) < 0; if (b !== back || t >= 1.0) continue; const r = 30 * (1 - fall), x = Math.cos(a) * r, y = lerp(-88, -22, fall * fall) + Math.sin(a) * r * 0.3; // three dark gems circle overhead, then drive in
      p.diamond(x, y, 6, C[b ? 1 : 2]); p.ink = false; p.diamond(x, y - 1, 3, C[b ? 2 : 4]); if (t > 0.8) p.line(x, y - 22, x, y - 6, C[4], 1, 1); p.ink = true; } };
    gem(true); if (t > 1.0) for (let i = 0; i < 3; i++) { const d = seg(t, 1.0, 1.9), a = t * 2 + (i * TAU) / 3; p.ring(0, -8 - i * 14, 15 - i * 2, 2, C[2 + i % 2], 1 - end, { sy: 0.4, keep: (g) => ((g - a) % TAU + TAU) % TAU < 4.4 * (1 - d * 0.3) }); } // bands that bind
    gem(false); k.ps.draw(p); flash(p, 0, -22, 12, t, 1.0, C);
  };
});
fx('snare', { w: 120, h: 80, ox: 60, oy: 60, dur: 2.4, fps: 12, px: 0.04, floor: true }, (k) => {
  const C = RAMP.leaf, v = [...Array(6)].map((_, i) => ({ x0: (i - 2.5) * 13, dir: i % 2 ? 1 : -1, h: k.R.range(24, 40), t0: 0.1 + i * 0.05 }));
  k.at(0.2, () => { dust(k, 0, 0, 6, 70, dirt, 3); rocks(k, 0, 0, 6, 150); });
  return (p, t) => {
    cracks(p, 0, 0, 40, seg(t, 0, 0.2) * (1 - seg(t, 1.9, 2.4)), dirt[0], 3, 6); k.ps.draw(p, true);
    v.forEach((s, i) => { const g = out(seg(t, s.t0, s.t0 + 0.25)) * (1 - seg(t, 1.8, 2.3) ** 2), n = 9; if (g < 0.05) return; const pts = []; // vines whip up and lean across to cross each other
      for (let j = 0; j <= n * g; j++) { const u = j / n; pts.push([s.x0 + s.dir * Math.sin(u * 2.4) * 22 + Math.sin(t * 5 + i) * u * 2, -u * s.h]); }
      if (pts.length < 2) return; p.path(pts, C[i % 2 ? 1 : 2], 1, 3.5); p.ink = false; p.path(pts.map(([x, y]) => [x - 1, y]), C[3], 1, 1); p.ink = true;
      pts.forEach(([x, y], j) => { if (j % 3 === 2) p.diamond(x + s.dir * 3, y, 2, C[4]); }); const e = pts[pts.length - 1]; p.diamond(e[0], e[1], 2.5, C[4]); });
    k.ps.draw(p); flash(p, 0, -14, 9, t, 0.3, C);
  };
});
fx('freeze', { w: 130, h: 130, ox: 65, oy: 104, dur: 3.0, fps: 12, px: 0.04, hit: 0.4, floor: true }, (k) => {
  const C = RAMP.ice, R = k.R;
  k.at(0.4, () => { dust(k, 0, 0, 8, 90, C, 4); sparks(k, 0, -24, 10, 200, C); });
  k.at(2.5, () => { for (let i = 0; i < 18; i++) k.ps.spawn({ kind: 'shard', ramp: C, tone: R.pick([2, 3, 4]), x: R.range(-18, 18), y: -R.range(4, 56), vx: R.range(-120, 120), vy: -R.range(20, 160), g: 560, s: R.range(4, 9), rot: R.range(0, 6), va: R.range(-9, 9), life: R.range(0.3, 0.5) }); });
  return (p, t) => {
    const g = seg(t, 0, 0.4), on = out(seg(t, 0.4, 0.5)), o = 1 + 0.12 * bump(seg(t, 0.5, 0.7)), end = seg(t, 2.5, 3.0);
    p.glow(0, -24, 60, C[3], (0.3 * g + 0.6 * (1 - seg(t, 0.4, 1.2))) * (1 - end)); p.ink = false; p.plate(0, 0, 34 * on, C[4], 0.3 * (1 - end), { sy: FY, sides: 6 }); p.ink = true;
    if (t < 0.4) for (let i = 0; i < 12; i++) { const kk = seg(t, hash(i, 3) * 0.2, hash(i, 3) * 0.2 + 0.2); if (kk > 0 && kk < 1) { const a = hash(i, 5) * TAU, r = 50 * (1 - kk); p.diamond(Math.cos(a) * r, -24 + Math.sin(a) * r, 2, C[4]); } } // cold gathers
    if (t >= 0.4 && t < 2.5) { const H = 62 * on * o, W = 21 * on * o, sh = t > 2.2 ? (Math.floor(t * 24) % 2) * 2 - 1 : 0; // a block of ice with cut faces
      const pts = [[-W + sh, 0], [-W - 3 + sh, -H * 0.55], [-W * 0.45 + sh, -H], [W * 0.5 + sh, -H * 0.94], [W + 3 + sh, -H * 0.5], [W + sh, 0]];
      p.poly(pts, C[2]); p.ink = false; p.poly([pts[0], pts[1], pts[2], [-W * 0.2 + sh, -H * 0.5], [-W * 0.3 + sh, 0]], C[3]); p.poly([pts[2], pts[3], [W * 0.2 + sh, -H * 0.62], [-W * 0.2 + sh, -H * 0.5]], C[4]);
      p.line(-W * 0.2 + sh, -H * 0.5, -W * 0.3 + sh, 0, C[5], 1, 1); p.line(-W * 0.2 + sh, -H * 0.5, W * 0.2 + sh, -H * 0.62, C[5], 1, 1); p.line(W * 0.2 + sh, -H * 0.62, W * 0.35 + sh, 0, C[1], 1, 1);
      const gl = seg(t, 0.9, 1.3); if (gl > 0 && gl < 1) p.line(-W + gl * W * 2, -H * 0.9, -W + gl * W * 2 - 8, -H * 0.3, WHITE, 1, 2);
      if (t > 1.9) { const c = seg(t, 1.9, 2.4); p.path([[0, -H], [-4, -H * 0.7], [3, -H * 0.5], [-2, -H * (0.5 - 0.5 * c)]], WHITE, 1, 1); if (c > 0.5) p.path([[3, -H * 0.5], [W * 0.8, -H * 0.3]], WHITE, 1, 1); } p.ink = true;
      if (Math.floor(t * 4) % 3 === 0) p.star(W * 0.5, -H * 0.94, 3, WHITE, C[4]); }
    shock(p, 0, 0, t, 0.4, 0.45, 6, 56, C); shock(p, 0, 0, t, 2.5, 0.4, 6, 50, C, { th: 2 }); k.ps.draw(p); flash(p, 0, -26, 13, t, 0.4, C); flash(p, 0, -26, 10, t, 2.5, C);
  };
});
fx('poof', { w: 110, h: 100, ox: 55, oy: 50, dur: 1.3, px: 0.036 }, (k) => {
  const R = k.R; k.ps.burst(R, 12, 0, 0, 40, 150, () => ({ kind: 'puff', ramp: smokeR, tone: R.pick([2, 3, 4]), s: R.range(6, 11), life: R.range(0.6, 1.2), drag: 4, g: -22 }));
  k.ps.burst(R, 8, 0, 0, 80, 200, () => ({ kind: 'chip', ramp: RAMP.shadow, tone: R.pick([2, 3, 4]), s: 3, life: R.range(0.4, 0.8), drag: 2.5, g: 200 }));
  return (p, t) => { shock(p, 0, 0, t, 0.03, 0.4, 6, 44, RAMP.shadow, { sy: 1, th: 2 }); k.ps.draw(p); for (let i = 0; i < 4; i++) { const d = seg(t, 0.2 + i * 0.12, 0.7 + i * 0.12); if (d > 0 && d < 1) p.star((hash(i, 2) - 0.5) * 50, (hash(i, 4) - 0.5) * 40 - d * 8, Math.round(4 * bump(d)), WHITE, RAMP.shadow[4]); } flash(p, 0, 0, 12, t, 0, RAMP.shadow); };
});
