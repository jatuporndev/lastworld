// The stage a story scene plays on, and its director. Everything is a flat painted cut-out (the game's own figures,
// scenery painted in sets.js) standing in a world with distance: the camera sits in that world, so figures walk toward
// it and away from it, near things pass in front of far ones, and a shot can be turned round to face back.
// A scene is an async function that calls the director below (cut, tw, say, …) against one clock, S.now.
// Nothing here knows about the game's flow: index.js puts the canvas on screen and scenes.js holds the scenes.
import { getSheet, drawFrame, posePicture, DIR_VIEW, VIEWS } from '../engine/sprites.js';
import { SHEETS } from '../engine/vfxSheets.js';
import { heroLook } from '../data/classes.js';
import { MONSTERS } from '../data/monsters.js';
import { audio } from '../core/audio.js';
import { buildSet, pathX, thingPic, seeded } from './sets.js';

export const W = 1280, H = 720, BAR = 62;
const FS = 256; // figures are painted at this size: the same sheets the game's large portraits use
const ease = { lin: (k) => k, out: (k) => 1 - (1 - k) ** 3, in: (k) => k * k * k, io: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2), back: (k) => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2 };
export { pathX };

// ───── the canvas ─────
let cv = null, ctx = null, raf = 0, last = 0, manual = false, quality = 1, costN = 0, costSum = 0;
export let S = null; // the scene being played
function fit() {
  if (!cv) return; const box = cv.parentElement.getBoundingClientRect(), k = Math.min(box.width / W, box.height / H) || 1;
  cv.style.width = W * k + 'px'; cv.style.height = H * k + 'px';
  const px = Math.max(480, Math.min(1600, W * k * Math.min(2, window.devicePixelRatio || 1)) * quality); cv.width = Math.round(px); cv.height = Math.round((px * H) / W);
}
export function mount(canvas) { cv = canvas; ctx = cv.getContext('2d', { alpha: false }); quality = 1; costN = costSum = 0; manual = false; fit(); window.addEventListener('resize', fit); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
export function unmount() { cancelAnimationFrame(raf); window.removeEventListener('resize', fit); S = null; cv = ctx = null; }
function frame(t) {
  raf = requestAnimationFrame(frame); const dt = Math.min(50, t - last); last = t; if (manual || !S) return;
  const t0 = performance.now(); step(dt);
  // slow machine guard: when a frame takes too long to paint, the picture is painted smaller (and scaled up by the page)
  costSum += performance.now() - t0; if (++costN >= 40) { if (costSum / costN > 18 && quality > 0.45) { quality *= 0.72; fit(); } costN = costSum = 0; }
}
export function step(dt) {
  if (!S || !ctx) return; if (S.hold > 0) { S.hold -= dt; dt = 0; }
  S.now += dt; S.cam.shake *= Math.pow(0.9, dt / 16); S.flash *= Math.pow(0.82, dt / 16);
  S.tweens = S.tweens.filter((w) => { const k = Math.min(1, (S.now - w.t0) / w.ms); w.step(w.e(k)); if (k >= 1) { w.res(); return false; } return true; });
  S.waits = S.waits.filter((w) => { if (S.now >= w.at) { w.res(); return false; } return true; });
  draw();
}
export const debug = { step: (dt) => { manual = true; step(dt); }, auto: () => { manual = false; } }; // for looking at one moment while testing

// ───── the cast ─────
// Looks for the people who are in the story and not in the game's own tables.
const NPC = {
  orrin: { body: 'humanoid', armor: '#7a6448', armor2: '#4e3e2c', cloth: '#c9a25a', skin: '#e2bd98', hair: '#eeeae0', beard: '#eeeae0', robe: true, scarf: '#8a3a32', offhand: 'book', hunch: true, wrap: '#e8dcc0' },
  orrin_bare: { body: 'humanoid', armor: '#7a6448', armor2: '#4e3e2c', cloth: '#c9a25a', skin: '#e2bd98', hair: '#eeeae0', beard: '#eeeae0', robe: true, scarf: '#8a3a32', offhand: 'book', hunch: true, wrap: 'void' },
  towns1: { body: 'humanoid', armor: '#8a6a4a', armor2: '#5a4430', cloth: '#d8c8a0', skin: '#e8c4a0', hair: '#6a4a2a', robe: true },
  towns2: { body: 'humanoid', armor: '#5a7a9a', armor2: '#3a5270', cloth: '#e8e0c8', skin: '#f0cfae', hair: '#c9873a', female: true, gown: true },
  towns3: { body: 'humanoid', armor: '#6a8a5a', armor2: '#44603a', cloth: '#c9a25a', skin: '#d9a07a', hair: '#3a2a22', beard: '#3a2a22', bulky: true },
};
const member = (key, look, size, who) => { const human = look.body === 'humanoid'; return { key, look, size, who, human, head: size * (human ? (size > 3 ? 0.76 : 0.64) : 0.88), sheet: getSheet(key, look, FS) }; };
export const castHero = (hero) => { const L = heroLook(hero); return member(L.key, L.look, 2.35, hero.cls); };
export const castMon = (id) => member('mon_' + id, MONSTERS[id].look, 2.35 * (MONSTERS[id].scale || 1), id);
export const castNpc = (name) => member('npc_' + name, NPC[name], name.startsWith('orrin') ? 2.2 : 2.3, name);
// The poses a story needs and a battle does not. Each is the standing figure with its hands, lean and face set by hand.
const POSES = {
  startled: { arm: 1.9, off: 1.9, lean: -0.16, bob: -3, squash: 1.05, leg: 0.3, mood: 'shock' },
  point: { arm: 1.55, off: 0.1, lean: 0.07, mood: 'angry' },
  ready: { arm: 1.0, off: 0.7, lean: 0.1, leg: 0.3, mood: 'angry' },
  cheer: { arm: 2.35, off: 2.3, bob: -3, mood: 'smile' },
  sad: { lean: 0.1, arm: 0.12, off: 0.08, squash: 0.97, mood: 'sad' },
  smile: { mood: 'smile' }, talk: { mood: 'talk' }, shut: { mood: 'down' }, stern: { mood: 'angry' },
  give: { arm: 0.2, off: 1.5, lean: 0.06, mood: 'smile' }, // one hand held out, with something in it
  halt: { arm: 0.15, off: 1.75, lean: -0.05, mood: 'talk' }, // the weapon down and an open hand up: wait
  write: { arm: 1.2, off: 1.25, lean: 0.12, mood: 'down' }, // bent over the map, pen to paper
  kneel: { squash: 0.8, lean: 0.2, arm: 0.1, off: 0.1, bob: 6, mood: 'sad' },
  down: { lie: 1, arm: 0.2, off: 0.9, mood: 'down' },
};
const imgs = {}; const img = (name) => imgs[name] || (imgs[name] = Object.assign(new Image(), { src: '/vfx/' + name + '.png' }));

// ───── the director ─────
export function newScene(setId) {
  S = { now: 0, hold: 0, dead: false, waits: [], tweens: [], actors: [], things: [], bits: [], orbs: [], fx: [], bubbles: [], emotes: [], plats: [], rings: [], mounds: [], clear: [], set: buildSet(setId),
    cam: { x: 0, y: 2, z: 0, dir: 1, f: 900, hy: 300, shake: 0 }, bars: 0, fade: 1, flash: 0, lines: 0, title: null, caption: null, pic: null, wash: 0, dim: 0 };
  return S;
}
const gone = () => !S || S.dead;
export const quiet = (p) => { p.catch(() => {}); return p; }; // a move nobody is waiting for may be cut short by the skip without complaint
export const wait = (ms) => quiet(new Promise((res, rej) => (gone() ? rej('skip') : S.waits.push({ at: S.now + ms, res, rej }))));
export function tw(o, to, ms, e = 'io') { const from = {}; for (const k in to) from[k] = o[k]; return quiet(new Promise((res, rej) => (gone() ? rej('skip') : S.tweens.push({ o, t0: S.now, ms: Math.max(1, ms), res, rej, e: ease[e], step: (k) => { for (const p in to) o[p] = from[p] + (to[p] - from[p]) * k; } })))); }
export const run = (ms, fn, e = 'lin') => quiet(new Promise((res, rej) => (gone() ? rej('skip') : S.tweens.push({ t0: S.now, ms: Math.max(1, ms), res, rej, e: ease[e], step: fn }))));
// The skip: every wait and move in flight is refused, so the scene's function ends at the line it was waiting on.
export function skip() { if (gone()) return; S.dead = true; for (const w of [...S.waits, ...S.tweens]) w.rej('skip'); S.waits = []; S.tweens = []; }
export function actor(m, o) { const a = { ...m, x: 0, y: 0, z: 0, fz: 1, fx: 0, lean: 1, anim: 'idle', once: 0, dark: 0, alpha: 1, buried: false, ...o }; S.actors.push(a); return a; }
export const thing = (kind, o) => { const th = { kind, pic: thingPic(kind, o.o), x: 0, y: 0, z: 0, h: 2.6, alpha: 1, ...o }; S.things.push(th); return th; };
export const act = (a, anim) => { a.anim = anim; a.once = S.now; };
export const hop = (a, h, ms) => run(ms, (k) => { a.y = Math.sin(k * Math.PI) * h; });
export const shake = (amp) => { S.cam.shake = Math.max(S.cam.shake, amp); };
export const cut = (c) => { S.tweens = S.tweens.filter((w) => w.o !== S.cam || (w.res(), false)); Object.assign(S.cam, c); }; // a cut drops whatever move the camera was making
export const drift = (ms, dz, more = {}) => tw(S.cam, { z: S.cam.z + S.cam.dir * dz, ...more }, ms, 'lin'); // the slow push every held shot has
export const emote = (a, sign, ms = 900) => S.emotes.push({ a, sign, t0: S.now, ms });
export const freeze = (ms) => { S.hold = ms; };
export const sfx = (name) => { try { audio.sfx(name); } catch (e) { /* sound is never worth a broken scene */ } };
// Turn `a` to look at `b` (an actor or a point): along the depth of the picture when they stand front to back, sideways when side by side.
export function face(a, b) { const dx = b.x - a.x, dz = b.z - a.z; if (Math.abs(dz) >= Math.abs(dx) * 0.7) { a.fz = dz >= 0 ? 1 : -1; a.fx = 0; if (Math.abs(dx) > 0.3) a.lean = dx > 0 ? 1 : -1; } else { a.fx = dx > 0 ? 1 : -1; a.lean = a.fx; } }
export const walkTo = (a, x, z, ms, e = 'io') => quiet((async () => { face(a, { x, z }); a.anim = 'walk'; a.once = 0; a.pose = null; try { await tw(a, { x, z }, ms, e); } finally { a.anim = 'idle'; } })());
// How long a line stays up: long enough to read it once, unhurried.
export const readMs = (text) => Math.max(1700, Math.min(5600, 900 + [...text].length * 62));
// A line of speech over `a`'s head (a: null = a voice from nowhere, set at the top of the picture). kind: talk, shout, voice.
export async function say(a, text, ms = readMs(text), kind = 'talk') {
  const b = { a, text, kind: a ? kind : 'voice', t0: S.now }; S.bubbles.push(b); if (a) a.talking = true; sfx(kind === 'shout' ? 'roar' : 'hover');
  const typing = Math.min(ms, [...text].length * 34 + 250);
  try { await wait(typing); if (a) a.talking = false; await wait(ms - typing); } finally { if (a) a.talking = false; const i = S.bubbles.indexOf(b); if (i >= 0) S.bubbles.splice(i, 1); }
  await wait(140);
}
// Words on a slip at the foot of the picture: the storyteller, not a character.
export async function caption(text, ms = readMs(text) + 500) { S.caption = { text, t0: S.now }; try { await wait(ms); } finally { S.caption = null; } await wait(200); }
export function dirt(x, z, n = 30, sp = 1, cols = S.set.D.bits) { const R = Math.random; for (let i = 0; i < n; i++) { const a = R() * 6.28, v = (1.5 + R() * 4) * sp; S.bits.push({ x, y: 0.1, z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: (4 + R() * 7) * sp, r: 0.05 + R() * 0.12, c: cols[(R() * cols.length) | 0], life: 900 + R() * 600, t0: S.now }); } }
export const burst = (name, x, y, z, s) => { img(name); S.fx.push({ name, x, y, z, s, t0: S.now }); }; // one of the game's own effect sheets, played once in the world
export const preload = (...names) => names.forEach(img);
// A full painted picture in place of the world (see picture() in sets.js): s = how close, x / y = where it is looked at.
export const showPic = (pic, o = {}) => { S.pic = { cv: pic, s: 1, x: 0, y: 0, blots: [], notes: [], strokes: [], torch: null, ...o }; return S.pic; };
export const hidePic = () => { S.pic = null; };

// ───── the camera ─────
// A point in the world to a point on the picture. z' is how far in front of the camera it is.
function proj(x, y, z) { const c = S.cam, zd = (z - c.z) * c.dir, xd = (x - c.x) * c.dir; return zd < 0.35 ? null : [W / 2 + (xd / zd) * c.f, c.hy - ((y - c.y) / zd) * c.f, zd]; }
// A camera placed by what it shows: the point `at` lands on the picture at (sx, sy). d = how far away it stands,
// dir = which way it faces along the depth (1: into the world, -1: turned round), h = its own height, f = its lens.
export function look(at, { d = 8, dir = 1, h = 1.6, f = 900, sx = W / 2, sy = H * 0.56 } = {}) {
  return { x: at[0] - dir * (((sx - W / 2) * d) / f), y: h, z: at[2] - dir * d, dir, f, hy: sy + ((at[1] - h) / d) * f };
}
// Close on one figure, from the side it is facing. A big figure is stood further off so that it fills the same space.
export function closeOn(a, o = {}) { const k = a.size / 2.35, low = a.pose === 'kneel' ? 0.5 : 0; return look([a.x, a.y + a.head * 0.8 - low, a.z], { d: (o.d ?? 4.6) * k, dir: o.dir ?? -a.fz, h: o.h ?? a.head * 0.72 - low * 0.6, f: o.f ?? 1250, sx: o.sx ?? W * 0.5, sy: o.sy ?? H * 0.54 }); }
// `a` seen from behind `from`: the listener's back near the camera, the speaker beyond.
export function overOn(a, from, o = {}) { const dir = a.z >= from.z ? 1 : -1, back = o.back ?? 3.4, d = Math.abs(a.z - from.z) + back; return look([a.x, a.y + a.head * 0.7, a.z], { d, dir, h: o.h ?? 1.7, f: o.f ?? 1000, sx: o.sx ?? W * 0.56, sy: o.sy ?? H * 0.5 }); }

// ───── the picture ─────
const scratch = document.createElement('canvas'); scratch.width = 840; scratch.height = 420; const sc = scratch.getContext('2d');
const vignette = (() => { const k = document.createElement('canvas'); k.width = 256; k.height = 144; const g = k.getContext('2d'), v = g.createRadialGradient(128, 72, 60, 128, 72, 164); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(8,6,24,0.5)'); g.fillStyle = v; g.fillRect(0, 0, 256, 144); return k; })();
function ground(pts, fill, y = 0) { const q = pts.map((p) => proj(p[0], y, p[1])).filter(Boolean); if (q.length < 3) return; ctx.fillStyle = fill; ctx.beginPath(); for (const p of q) ctx.lineTo(p[0], p[1]); ctx.fill(); }
const circle = (x, z, r, n = 28) => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * 6.283) * r, z + Math.sin((i / n) * 6.283) * r]);
// One figure, feet at (x, y), s pixels to a frame.
function figure(c, a, s, x, y, dir, f, set) {
  if (set) { const [view, flip] = DIR_VIEW[dir], pic = posePicture(a.key, a.look, VIEWS[view], set, FS); c.save(); c.translate(x, y); c.scale(flip ? -1 : 1, 1); c.drawImage(pic, -s, -s * 0.96, s * 2, s); c.restore(); }
  else drawFrame(c, a.sheet, a.anim, dir, f, x - s / 2, y - s * 0.96, s, s);
}
function drawActor(a, p) {
  if (a.hide || a.alpha <= 0.01) return; const cam = S.cam, s = (a.size * cam.f) / p[2], loop = a.anim === 'idle' || a.anim === 'walk' || (a.anim === 'cast' && !a.once);
  let f = a.still ? 0 : loop ? Math.floor(S.now / (a.anim === 'walk' ? 105 : 150)) % 4 : Math.max(0, Math.min(3, Math.floor((S.now - a.once) / 95))); if (!loop && S.now - a.once > 520) { a.anim = 'idle'; a.once = 0; f = 0; }
  const right = (a.fx || a.lean) * cam.dir > 0, dir = a.fx ? (right ? 0 : 3) : a.fz * cam.dir > 0 ? (right ? 1 : 2) : right ? 5 : 4; // the side of the figure this camera sees
  const g = proj(a.x, 0, a.z); if (g && a.y > -0.5 && !a.noShadow && !a.buried) { const k = Math.max(0.4, 1 - Math.max(0, a.y) / 3); ctx.fillStyle = `rgba(8,8,30,${0.34 * a.alpha})`; ctx.beginPath(); ctx.ellipse(g[0], g[1], s * 0.2 * k, s * 0.055 * k, 0, 0, 6.3); ctx.fill(); }
  const talk = a.mouth && a.talking && Math.floor(S.now / 150) % 2 === 0, set = !a.human ? null : a.pose ? (talk ? { ...POSES[a.pose], mood: 'talk' } : POSES[a.pose]) : talk && a.anim === 'idle' ? POSES.talk : null;
  ctx.save(); if (a.buried && g) { ctx.beginPath(); ctx.rect(-50, -50, W + 100, g[1] + 53); ctx.clip(); } // still under the ground: only what is above it shows
  ctx.globalAlpha = a.alpha;
  if (a.dark > 0.01 || a.tint) { // darkened or washed with a colour: painted aside first, so that only the figure takes it
    const q = Math.min(420, Math.ceil(s)); sc.globalCompositeOperation = 'source-over'; sc.clearRect(0, 0, 840, 420); figure(sc, a, q, q, q * 0.96, dir, f, set);
    sc.globalCompositeOperation = 'source-atop'; if (a.tint) { sc.fillStyle = a.tint; sc.fillRect(0, 0, 840, 420); } if (a.dark > 0.01) { sc.fillStyle = `rgba(6,4,12,${Math.min(1, a.dark)})`; sc.fillRect(0, 0, 840, 420); }
    ctx.drawImage(scratch, 0, 0, q * 2, q, p[0] - s, p[1] - s * 0.96, s * 2, s);
  } else figure(ctx, a, s, p[0], p[1], dir, f, set);
  ctx.restore();
}
function drawThing(th, p) {
  const u = (th.h * S.cam.f) / p[2]; ctx.save(); ctx.globalAlpha = th.alpha; ctx.translate(p[0], p[1]); if (th.flip) ctx.scale(-1, 1); ctx.drawImage(th.pic, -u / 2, -u, u, u);
  if (th.kind === 'camp' && !th.cold) { // the fire under the kettle, and the steam off it
    ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(0, -u * 0.1, 0, 0, -u * 0.1, u * 0.7); gl.addColorStop(0, 'rgba(255,170,70,0.5)'); gl.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = gl; ctx.fillRect(-u, -u, u * 2, u * 1.2); ctx.globalCompositeOperation = 'source-over';
    const R = seeded(Math.floor(S.now / 90)); for (const [w, hh, col] of [[0.2, 0.3, '#ff8a2a'], [0.13, 0.22, '#ffd24a'], [0.06, 0.12, '#fff6d0']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-u * w, -u * 0.04); ctx.quadraticCurveTo(-u * w * 0.6, -u * hh * 0.6, (R() - 0.5) * u * 0.08, -u * (0.04 + hh * (0.8 + R() * 0.4))); ctx.quadraticCurveTo(u * w * 0.6, -u * hh * 0.6, u * w, -u * 0.04); ctx.fill(); }
  }
  if ((th.kind === 'camp' || th.steam) && !th.cold) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 3; i++) { const k = ((S.now / 1700 + i / 3) % 1); ctx.globalAlpha = th.alpha * (1 - k) * 0.6; ctx.beginPath(); ctx.arc((th.steam ? th.steam[0] : 0.19) * u + Math.sin(k * 5 + i) * u * 0.04, -(th.steam ? th.steam[1] : 0.42) * u - k * u * 0.3, u * (0.03 + k * 0.05), 0, 6.3); ctx.fill(); } }
  ctx.restore();
}
// Break a line where words end (Thai has no spaces between words, so the browser's own word finder is asked).
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function wrap(text, maxW) {
  const out = []; for (const para of text.split('\n')) { const parts = segmenter ? [...segmenter.segment(para)].map((x) => x.segment) : para.split(/(?<= )/); let line = '';
    for (const w of parts) { if (line && ctx.measureText(line + w).width > maxW) { out.push(line.trimEnd()); line = w.trimStart(); } else line += w; } if (line) out.push(line.trimEnd()); }
  return out;
}
function drawBubble(b) {
  const a = b.a, shout = b.kind === 'shout', voice = b.kind === 'voice', hp = a ? proj(a.x, a.y + a.head, a.z) : [W / 2, BAR + 230, 1]; if (!hp) return; const hx = Math.max(60, Math.min(W - 60, hp[0])), hy = Math.max(BAR + 150, hp[1]);
  const size = shout ? 44 : 27; ctx.font = `${shout ? 600 : 500} ${size}px Mitr, 'Noto Sans Thai', sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  if (!b.lay) { const lines = wrap(b.text, shout ? 620 : 520); b.lay = { lines, tw: Math.max(...lines.map((l) => ctx.measureText(l).width)), ws: lines.map((l) => ctx.measureText(l).width) }; }
  const { lines, tw: tw_, ws } = b.lay; let left = Math.floor((S.now - b.t0) / (shout ? 45 : 32));
  const bw = tw_ + (shout ? 80 : 52), bh = lines.length * size * 1.34 + (shout ? 46 : 30), jx = shout ? (Math.random() - 0.5) * 6 : 0, jy = shout ? (Math.random() - 0.5) * 6 : 0;
  const bx = Math.max(30, Math.min(W - bw - 30, hx - bw / 2 + (voice ? 0 : 60))) + jx, by = Math.max(BAR + 12, hy - bh - 46) + jy, k = ease.back(Math.min(1, (S.now - b.t0) / 160)), tx = Math.max(bx + 40, Math.min(bx + bw - 40, hx));
  ctx.save(); ctx.translate(bx + bw / 2, by + bh); ctx.scale(k, k); ctx.translate(-bx - bw / 2, -by - bh);
  const body = (dy, fill) => { ctx.fillStyle = fill; ctx.beginPath(); if (shout) { for (let i = 0; i < 22; i++) { const t = (i / 22) * 6.283, r = i % 2 ? 1.14 : 0.92; ctx.lineTo(bx + bw / 2 + Math.cos(t) * bw * 0.56 * r, by + bh / 2 + Math.sin(t) * bh * 0.66 * r + dy); } ctx.fill(); } else { ctx.roundRect(bx, by + dy, bw, bh, 16); ctx.fill(); if (!voice) { ctx.beginPath(); ctx.moveTo(tx - 16, by + bh - 2 + dy); ctx.lineTo(tx + 16, by + bh - 2 + dy); ctx.lineTo(hx + (tx - hx) * 0.35, Math.min(by + bh + 34, hy - 6) + dy); ctx.fill(); } } };
  body(7, 'rgba(0,0,0,0.3)'); body(0, shout ? '#d9482f' : voice ? '#3a2a20' : '#f1e4c5'); ctx.fillStyle = shout || voice ? '#fbf3df' : '#3a2a20';
  lines.forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length + 1; ctx.fillText(part, bx + (bw - ws[i]) / 2, by + (shout ? 23 : 15) + size * 0.67 + i * size * 1.34); }); ctx.restore();
}
function drawCaption(cp) {
  ctx.font = "500 28px Mitr, 'Noto Sans Thai', sans-serif"; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  if (!cp.lay) { const lines = wrap(cp.text, 860); cp.lay = { lines, ws: lines.map((l) => ctx.measureText(l).width) }; }
  const { lines, ws } = cp.lay, bw = Math.max(...ws) + 70, bh = lines.length * 40 + 30, bx = (W - bw) / 2, by = H - BAR - 34 - bh, k = ease.out(Math.min(1, (S.now - cp.t0) / 260)); let left = Math.floor((S.now - cp.t0) / 30);
  ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 24); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.roundRect(bx, by + 7, bw, bh, 10); ctx.fill(); ctx.fillStyle = '#f1e4c5'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill(); ctx.fillStyle = '#3a2a20';
  lines.forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length + 1; ctx.fillText(part, (W - ws[i]) / 2, by + 15 + 20 + i * 40); }); ctx.restore();
}
function drawEmote(e) {
  const k = (S.now - e.t0) / e.ms; if (k >= 1) return false; const a = e.a, hp = proj(a.x, a.y + a.head + 0.2, a.z); if (!hp) return true; const x = hp[0] + 30, y = Math.max(BAR + 50, hp[1]);
  const pop = ease.back(Math.min(1, k * 5)) * (k > 0.85 ? (1 - k) / 0.15 : 1); ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
  if (e.sign === 'sweat') { ctx.translate(70, 60 + k * 30); ctx.fillStyle = '#8fd8ff'; ctx.strokeStyle = '#1b1410'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -22); ctx.quadraticCurveTo(16, 6, 0, 14); ctx.quadraticCurveTo(-16, 6, 0, -22); ctx.stroke(); ctx.fill(); }
  else { ctx.font = '600 64px Mitr, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = '#1b1410'; ctx.strokeText(e.sign, 0, 0); ctx.fillStyle = e.sign === '!' ? '#f2b632' : '#fbf3df'; ctx.fillText(e.sign, 0, 0); }
  ctx.restore(); return true;
}
// A painted picture in place of the world: looked at closer or further, with ink spreading on it, or words written on it.
function drawPic(P) {
  const s = P.s, pw = P.cv.width, dx = W / 2 - (pw > W ? W / 2 : pw / 2) * s - P.x * s, dy = H / 2 - (H / 2) * s - P.y * s; ctx.fillStyle = '#0a0705'; ctx.fillRect(-40, -40, W + 80, H + 80);
  ctx.save(); ctx.translate(dx, dy); ctx.scale(s, s); ctx.drawImage(P.cv, 0, 0);
  for (const b of P.blots) { if (b.r < 0.5) continue; const R = seeded(b.seed || 9); ctx.fillStyle = b.col || '#120c0a'; ctx.globalAlpha = b.a ?? 0.92; for (let i = 0; i < 11; i++) { ctx.beginPath(); ctx.ellipse(b.x + (R() - 0.5) * b.r * 1.3, b.y + (R() - 0.5) * b.r * 0.8, b.r * (0.35 + R() * 0.5), b.r * (0.25 + R() * 0.35), R() * 3, 0, 6.3); ctx.fill(); } ctx.globalAlpha = 1; }
  for (const n of P.notes) { // the mapmaker's hand: slanted, in ink, written as it is read
    ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.rot ?? -0.035); ctx.transform(1, 0, -0.2, 1, 0, 0); ctx.font = `500 ${n.size || 34}px Mitr, 'Noto Sans Thai', sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = n.col || '#2a1c16';
    if (!n.lay) n.lay = wrap(n.text, n.w || 560); if (n.bg) { ctx.save(); ctx.globalAlpha = 0.93; ctx.fillStyle = '#ead9b2'; ctx.beginPath(); ctx.roundRect(-18, -(n.size || 34) * 0.8, (n.w || 560) + 36, n.lay.length * (n.size || 34) * 1.32 + (n.size || 34) * 0.5, 10); ctx.fill(); ctx.restore(); } let left = Math.floor((S.now - n.t0) / 46); n.lay.forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length + 1; ctx.globalAlpha = (n.a ?? 1) * 0.9; ctx.fillText(part, 0, i * (n.size || 34) * 1.32); }); ctx.restore(); }
  for (const st of P.strokes) { const k = Math.max(0, Math.min(1, (S.now - st.t0) / st.ms)), n = st.pts.length - 1, upto = k * n; ctx.strokeStyle = st.col || '#2a1c16'; ctx.lineWidth = st.w || 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(st.pts[0][0], st.pts[0][1]); for (let i = 1; i <= n; i++) { if (i <= upto) ctx.lineTo(st.pts[i][0], st.pts[i][1]); else { const f = upto - (i - 1); if (f > 0) ctx.lineTo(st.pts[i - 1][0] + (st.pts[i][0] - st.pts[i - 1][0]) * f, st.pts[i - 1][1] + (st.pts[i][1] - st.pts[i - 1][1]) * f); break; } } ctx.stroke(); } // a line being drawn across it
  ctx.restore();
  if (P.torch) { const g = ctx.createRadialGradient(P.torch.x, P.torch.y, 60, P.torch.x, P.torch.y, 520); g.addColorStop(0, 'rgba(255,170,80,0.12)'); g.addColorStop(0.45, 'rgba(20,10,4,0.35)'); g.addColorStop(1, 'rgba(8,4,2,0.94)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
}
function drawWorld() {
  const c = S.cam, D = S.set.D, hy = c.hy; let g;
  // the sky and the far ridges: they only slide a little, and the other way round when the camera faces back
  ctx.fillStyle = D.sky[0]; ctx.fillRect(-40, -40, W + 80, Math.max(0, hy - 556) + 44); ctx.drawImage(S.set.sky, 0, 0, 64, 600, -40, hy - 560, W + 80, 564);
  if (S.set.stars) ctx.drawImage(S.set.stars, 0, hy - 470);
  if (D.sun) { const sun = W / 2 + (c.dir > 0 ? 220 : -300) - c.x * 6 * c.dir; g = ctx.createRadialGradient(sun, hy - 40, 10, sun, hy - 40, 460); g.addColorStop(0, D.sun); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, hy + 44); }
  if (S.set.hills) ctx.drawImage(S.set.hills, (c.dir > 0 ? -400 : -900) - c.x * 5 * c.dir, hy - 236 * (c.f / 900) ** 0.3, 2600, 260);
  // what is underfoot, going pale toward the horizon
  const z0 = Math.floor((c.z - (c.dir > 0 ? 0 : 130)) / 5) * 5;
  if (D.floor === 'float') { g = ctx.createLinearGradient(0, hy, 0, H); g.addColorStop(0, D.below[0]); g.addColorStop(1, D.below[1]); ctx.fillStyle = g; ctx.fillRect(-40, hy - 1, W + 80, H - hy + 60); }
  else {
    g = ctx.createLinearGradient(0, hy, 0, H); g.addColorStop(0, D.ground[0]); g.addColorStop(0.14, D.ground[1]); g.addColorStop(1, D.ground[2]); ctx.fillStyle = g; ctx.fillRect(-40, hy - 1, W + 80, H - hy + 60);
    if (D.floor === 'water') { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineCap = 'round'; const R = seeded(4); for (let i = 0; i < 46; i++) { const z = z0 + R() * 90, x = c.x + (R() - 0.5) * 90 + Math.sin(S.now / 1300 + i) * 0.5, p = proj(x, 0, z), q = proj(x + 1.6 + R() * 2, 0, z); if (!p || !q) continue; ctx.lineWidth = Math.max(1, 26 / p[2]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); } }
    else for (let z = z0; z < z0 + 135; z += 10) ground([[c.x - 400, z], [c.x + 400, z], [c.x + 400, z + 5], [c.x - 400, z + 5]], 'rgba(20,30,60,0.07)'); // bands across it, so that distance can be read on it
  }
  for (const pl of S.plats) { ground(circle(pl.x, pl.z, pl.r, 36), pl.side || D.ground[2], -(pl.t ?? 1.2)); ground(circle(pl.x, pl.z, pl.r, 36), pl.col || D.ground[1]); }
  if (D.path && !S.noPath) { const half = D.floor === 'water' ? 2.3 : 1.45, L = [], Rr = [], L2 = [], R2 = []; for (let z = z0 - 4; z < z0 + 140; z += 1.5) { L.push([pathX(z) - half, z]); Rr.unshift([pathX(z) + half, z]); L2.push([pathX(z) - 0.2, z]); R2.unshift([pathX(z) + half, z]); } ground([...L, ...Rr], D.path[0]); ground([...L2, ...R2], D.path[1]); }
  for (const r of S.rings) ground(circle(r.x, r.z, r.r), r.col);
  // everything that stands up, far to near
  const list = [];
  for (const s of S.set.scenery) { let y = s.y || 0; if (s.bob) y += Math.sin(S.now / 1500 + s.bob) * 0.35; const p = proj(s.x, y, s.z); if (!p || p[2] > 120 || p[0] < -700 || p[0] > W + 700) continue; if (S.clear.some((q) => Math.hypot(s.x - q.x, s.z - q.z) < q.r)) continue; list.push([p[2], s, p]); }
  for (const a of S.actors) { const p = proj(a.x, a.y, a.z); if (p) list.push([p[2], a, p]); }
  for (const th of S.things) { const p = proj(th.x, th.y, th.z); if (p) list.push([p[2] + 0.01, th, p]); }
  S.bits = S.bits.filter((b) => { const t = (S.now - b.t0) / 1000; if (t * 1000 > b.life) return false; const y = b.y + b.vy * t - 9 * t * t; if (y < 0) return false; const p = proj(b.x + b.vx * t, y, b.z + b.vz * t); if (p) list.push([p[2], { k: 'bit', r: b.r, c: b.c }, p]); return true; });
  for (const o of S.orbs) { const p = proj(o.x, o.y, o.z); if (p) list.push([p[2], { k: 'orb', o }, p]); }
  for (const m of S.mounds) { const p = proj(m.x, 0, m.z); if (p) list.push([p[2], m, p]); }
  S.fx = S.fx.filter((e) => { const d = SHEETS[e.name]; if (!d) return false; const f = Math.floor(((S.now - e.t0) / 1000) * d.fps); if (f >= d.n) return false; const p = proj(e.x, e.y, e.z); if (p) list.push([p[2] - 0.5, { k: 'fx', e, d, f }, p]); return true; });
  list.sort((a, b) => b[0] - a[0]);
  for (const [zd, o, p] of list) {
    if (o.k === 'prop') { const h = (o.h * c.f) / zd, wd = h * (300 / 520), im = S.set.cut[o.v][Math.min(2, Math.floor(zd / 22))]; if (zd < 3 && Math.abs(p[0] - W / 2) < wd * 0.4) continue; if (p[0] < -wd || p[0] > W + wd) continue; ctx.save(); ctx.translate(p[0], p[1]); if (o.flip) ctx.scale(-1, 1); ctx.drawImage(im, -wd / 2, -h * 0.985, wd, h); ctx.restore(); }
    else if (o.k === 'tuft') { if (zd > 40) continue; const u = (o.s * c.f) / zd; ctx.strokeStyle = D.tuft[o.c]; ctx.lineWidth = Math.max(1, u * 0.09); ctx.lineCap = 'round'; ctx.beginPath(); for (const d of [-0.2, 0, 0.22]) { ctx.moveTo(p[0] + d * u * 0.6, p[1]); ctx.lineTo(p[0] + d * u * 1.5, p[1] - u * (0.4 - Math.abs(d) * 0.5)); } ctx.stroke(); }
    else if (o.k === 'flower') { if (zd > 40) continue; const u = (o.s * c.f) / zd; ctx.fillStyle = ['#e8b8d8', '#f2d27a', '#c8d8ff'][o.c]; ctx.beginPath(); ctx.arc(p[0], p[1] - u * 0.22, u * 0.09, 0, 6.3); ctx.fill(); }
    else if (o.k === 'orb') { const r = ((o.o.r * c.f) / zd) * (1 + Math.sin(S.now / 40) * 0.08); if (r < 0.3) continue; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3.2); gg.addColorStop(0, o.o.c[1]); gg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 0.75; ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p[0], p[1], r * 3.2, 0, 6.3); ctx.fill(); ctx.restore(); const cg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r); cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.55, o.o.c[0]); cg.addColorStop(1, o.o.c[1]); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.3); ctx.fill(); }
    else if (o.k === 'mound') { const w = (o.r * c.f) / zd, hh = w * 0.62; ctx.fillStyle = o.col; ctx.beginPath(); ctx.ellipse(p[0], p[1], w, hh, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = 'rgba(255,240,200,0.22)'; ctx.beginPath(); ctx.ellipse(p[0] - w * 0.25, p[1], w * 0.6, hh * 0.8, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = 'rgba(8,8,30,0.3)'; ctx.beginPath(); ctx.ellipse(p[0], p[1], w * 1.15, w * 0.12, 0, 0, 6.3); ctx.fill(); } // earth pushed up by something moving under it
    else if (o.k === 'bit') { ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(p[0], p[1], (o.r * c.f) / zd, 0, 6.3); ctx.fill(); }
    else if (o.k === 'fx') { const { e, d, f } = o, im = img(e.name), u = ((e.s / d.h) * c.f) / zd; if (im.complete && im.naturalWidth) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(p[0], p[1]); ctx.drawImage(im, (f % d.cols) * d.w, Math.floor(f / d.cols) * d.h, d.w, d.h, -d.ox * u, -d.oy * u, d.w * u, d.h * u); ctx.restore(); } }
    else if (o.pic) drawThing(o, p);
    else drawActor(o, p);
  }
}
function draw() {
  const k = cv.width / W, c = S.cam; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium'; ctx.globalAlpha = 1;
  ctx.translate((Math.random() - 0.5) * c.shake * 2, (Math.random() - 0.5) * c.shake * 2);
  if (S.pic) drawPic(S.pic); else drawWorld();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (!S.pic) { ctx.fillStyle = S.set.D.tint; ctx.fillRect(0, 0, W, H);
    const A = S.set.D.amb; if (A) { ctx.fillStyle = A.col; for (let i = 0; i < A.n; i++) { const r1 = (i * 0.6180339) % 1, r2 = (i * 0.7548776) % 1, x = (((r1 * W + S.now * A.vx * (0.5 + r2)) % W) + W) % W, y = (((r2 * H + S.now * A.vy * (0.5 + r1)) % H) + H) % H; ctx.globalAlpha = 0.25 + 0.5 * r2; const sz = 1.5 + r1 * A.s; ctx.fillRect(x, y, sz, sz); } ctx.globalAlpha = 1; } } // what drifts in this realm's air
  if (S.wash > 0.01 && !S.pic) { ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${Math.min(1, S.wash)})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(190,190,200,${S.wash * 0.22})`; ctx.fillRect(0, 0, W, H); } // the colour going out of a place
  if (S.dim > 0.01) { ctx.fillStyle = `rgba(6,4,12,${S.dim})`; ctx.fillRect(0, 0, W, H); }
  ctx.drawImage(vignette, 0, 0, W, H);
  if (S.lines > 0.01) { const R = seeded(Math.floor(S.now / 70) + 5); ctx.fillStyle = `rgba(245,255,230,${0.5 * S.lines})`; for (let i = 0; i < 64; i++) { const t = R() * 6.283, r0 = 320 + R() * 170, w = 0.01 + R() * 0.024; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(t) * r0 * 1.25, H / 2 + Math.sin(t) * r0 * 0.72); ctx.lineTo(W / 2 + Math.cos(t - w) * 1100, H / 2 + Math.sin(t - w) * 1100); ctx.lineTo(W / 2 + Math.cos(t + w) * 1100, H / 2 + Math.sin(t + w) * 1100); ctx.fill(); } }
  if (S.flash > 0.01) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, S.flash)})`; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = '#0a0705'; ctx.fillRect(0, 0, W, BAR * S.bars); ctx.fillRect(0, H - BAR * S.bars, W, BAR * S.bars);
  if (!S.pic) S.emotes = S.emotes.filter(drawEmote); for (const b of S.bubbles) drawBubble(b); if (S.caption) drawCaption(S.caption);
  if (S.title) { const t = S.title, kx = ease.out(Math.min(1, (S.now - t.t0) / 260)); ctx.save(); ctx.translate(W - 400 + (1 - kx) * 900, H - 190); ctx.rotate(-0.035); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.roundRect(-330, -52, 660, 124, 10); ctx.fill(); ctx.fillStyle = '#f1e4c5'; ctx.beginPath(); ctx.roundRect(-330, -62, 660, 124, 10); ctx.fill(); ctx.fillStyle = '#f2b632'; ctx.fillRect(-330, -62, 660, 12); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#806b54'; ctx.font = "500 22px Mitr, 'Noto Sans Thai', sans-serif"; ctx.fillText(t.small, 0, -26); ctx.fillStyle = '#3a2a20'; let fs = 54; ctx.font = `600 ${fs}px Mitr, sans-serif`; while (fs > 26 && ctx.measureText(t.big).width > 610) { fs -= 3; ctx.font = `600 ${fs}px Mitr, sans-serif`; } ctx.fillText(t.big, 0, 20); ctx.restore(); }
  if (S.fade > 0.005) { ctx.fillStyle = `rgba(10,7,5,${Math.min(1, S.fade)})`; ctx.fillRect(0, 0, W, H); }
}
