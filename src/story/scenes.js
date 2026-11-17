// The story's scenes, in the order they are met. Each is written for whoever is in the party, the leader first: one
// hero or four. The leader speaks the main lines, the second hero the doubting ones (alone, the leader has both), and
// the others act with their bodies. What is said, and why, is docs/story.md; the words are in lines.js.
// A scene is `async (P) => { … }` with P.party = the heroes; it builds its stage with newScene(set) and ends in black.
import { S, W, H, quiet, newScene, wait, tw, run, actor, thing, act, hop, shake, cut, drift, emote, freeze, sfx, face, walkTo, readMs, say, caption, dirt, burst, preload, showPic, hidePic, look, closeOn, castHero, castMon, castNpc, pathX } from './stage.js';
import { picture, MAP_AT } from './sets.js';
import { L } from './lines.js';
import { MONSTERS } from '../data/monsters.js';
import { STAGE_BY_ID } from '../data/stages.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Where each hero stands relative to the leader, and the band as the scenes use it.
const SPOT = [[0, 0], [1.5, -1.5], [-1.6, -0.6], [0.3, -2.7]];
function band(P, z, o = {}) {
  const fz = o.fz ?? 1, all = P.party.slice(0, 4).map((h, i) => actor(castHero(h), { x: pathX(z) + SPOT[i][0], z: z + SPOT[i][1] * fz, fz, lean: i === 1 ? -1 : 1, ox: SPOT[i][0], mouth: true, ...o }));
  return { all, hero: all[0], second: all[1], third: all[2], two: all[1] || all[0], rest: all.slice(1), solo: all.length === 1 };
}
// The whole band walks along the road to where the leader stands at depth z.
const march = (B, z, ms, e = 'io') => quiet(march_(B, z, ms, e));
async function march_(B, z, ms, e) {
  const from = B.all.map((a) => a.z), dz = z - B.hero.z; for (const a of B.all) { a.anim = 'walk'; a.once = 0; a.pose = null; a.fz = dz >= 0 ? 1 : -1; a.fx = 0; }
  try { await run(ms, (k) => B.all.forEach((a, i) => { a.z = from[i] + dz * k; a.x = pathX(a.z) + a.ox; }), e); } finally { for (const a of B.all) a.anim = 'idle'; }
}
const npc = (name, o) => actor(castNpc(name), { mouth: true, ...o });
async function open(cam, ms = 800) { cut(cam); tw(S, { bars: 1 }, 500); await tw(S, { fade: 0 }, ms); }
const close = (ms = 650) => tw(S, { fade: 1 }, ms);
// One line, with the camera on whoever says it. o.cam: a shot of your own · o.shot: false = stay where the camera is ·
// o.pose: held while speaking · o.kind: shout
async function tell(a, key, o = {}) {
  const text = L(key), ms = o.ms ?? readMs(text); if (o.shot !== false) { cut(o.cam || closeOn(a, o)); drift(ms + 300, o.push ?? 0.35); }
  if (o.pose) a.pose = o.pose; try { await say(a, text, ms, o.kind); } finally { if (o.pose && !o.keep) a.pose = null; }
}
const all = (list, fn) => list.forEach(fn);
const startle = (list, h = 0.5) => all(list, (a) => { emote(a, '!', 700); a.pose = 'startled'; hop(a, h, 300); });
const calm = (list) => all(list, (a) => { a.pose = null; });
// The mapmaker inks a realm over on his map: close on that corner of the sheet, and the ink spreads.
async function inkMap(id, prior = [], o = {}) {
  const [mx, my] = MAP_AT[id], pic = showPic(picture('map', { inked: prior, ...o }), { s: 1.45, x: clamp(mx - 640, -190, 190), y: clamp(my - 360, -110, 110) }), b = { x: mx, y: my - 4, r: 0, seed: id + 3 };
  pic.blots.push(b); S.flash = 0.25; tw(pic, { s: 1.6 }, 2700, 'lin'); await wait(600); sfx('shadow'); await tw(b, { r: 80 }, 1500, 'out'); await wait(650); hidePic(); S.flash = 0.2;
}
// The fallen boss says its last, and is gone.
async function lastWords(boss, key, o = {}) { boss.anim = 'hurt'; boss.still = true; boss.dark = 0.3; await tell(boss, key, { d: 5.4, f: 1000, sy: H * 0.66, ...o }); tw(boss, { alpha: 0, dark: 0.9 }, 1500, 'in'); for (let i = 0; i < 3; i++) dirt(boss.x + (i - 1) * 1.4, boss.z, 14, 0.7); await wait(1300); boss.hide = true; }
const nameSlip = (id, stage) => { S.title = { big: MONSTERS[id].name.toUpperCase(), small: 'MVP · ' + (STAGE_BY_ID[stage]?.name || ''), t0: S.now }; sfx('smash'); shake(8); }; // (the name is the game's own: Thai when the game is in Thai)

// ───── an MVP's entrance, shared by the realms where nothing else needs to happen first ─────
// No two arrive alike. o.set: the realm · o.id: the boss · o.side: stood off the road by this much ·
// o.open: how the scene begins: lair (the empty place first, then them), front (they walk toward us), feet (from the ground at their heels),
//         peek (from behind the small thing that is waiting for them), top (from straight overhead), walk (from high behind) ·
// o.end: the last shot, under the name: wide (both, from high), behind (past its back, at them), push (in on it, from low) ·
// o.how: rise (out of the ground), burrow (a mound races at them and bursts), wait (it was there all along, in the dark), dive (across the sky),
//        grow (it swells up out of something small), drop (straight down, hard), surface (a back in the water that passes, then comes up), erupt (out of fire) ·
// o.lines(B, boss, sh): what is said once it is there, and from where. sh holds the shots: low (from the ground at its feet), up (from where they
//        stand, looking up at it), over (past their shoulders), past (past its back, down at them), top (from straight overhead), wide (both, from high)
async function bossScene(P, o) {
  newScene(o.set); const D = S.set.D, HZ = 11, how = o.how, BZ = how === 'burrow' ? 17.5 : 24, bx = pathX(BZ) + (o.side || 0), opening = o.open || 'walk';
  if (D.floor === 'float') S.plats.push({ x: 0, z: 15, r: 19 }); S.clear.push({ x: bx, z: BZ, r: 7.5 }); if (D.floor !== 'float' && D.floor !== 'water' && how !== 'burrow') S.rings.push({ x: bx, z: BZ, r: 6.2, col: D.path[1] }, { x: bx, z: BZ, r: 5.2, col: D.ground[1] });
  const B = band(P, opening === 'lair' ? HZ : opening === 'front' ? -1 : 1), boss = actor(castMon(o.id), { x: bx, z: BZ, fz: -1, lean: -1 }), big = boss.size;
  if (how === 'rise') Object.assign(boss, { y: -big * 1.12, buried: true, dark: 0.95 }); else if (how === 'burrow') Object.assign(boss, { y: -big * 1.1, buried: true }); else if (how === 'dive') Object.assign(boss, { x: bx - 16, y: 11, alpha: 0 }); else if (how === 'grow') Object.assign(boss, { size: big * 0.12, head: big * 0.1, dark: 0.6 });
  else if (how === 'drop') Object.assign(boss, { y: 26, alpha: 0 }); else if (how === 'surface') S.clear.push({ x: bx + 12, z: BZ - 5, r: 17 }), Object.assign(boss, { x: bx + 30, y: -big * 0.74, buried: true, fx: -1, lean: -1 }); else if (how === 'erupt') boss.alpha = 0; else boss.dark = 0.93;
  const low = (more = {}) => look([boss.x, big * 0.5, boss.z], { d: big * (o.near || 1.95), h: 0.5, f: o.lens || 800, sy: H * 0.64, sx: W * 0.46, ...more }); // (room is left over its head for what it says)
  const facing = () => look([B.hero.x + 0.3, 1.25, HZ], { d: 5.3, dir: -1, h: 1.05, f: 1150, sy: H * 0.56 });
  // 1 · how it begins
  if (opening === 'lair') { // the place itself, before anyone is seen in it
    await open(look([bx, big * 0.35, BZ], { d: 15, h: 3.6, f: 860, sy: H * 0.56 }), 1000); drift(2800, 2.4);
    if (how === 'wait') { const lights = [[-3.2, 2.6], [3.4, 3.2], [-1.6, 4.6], [2, 5.4], [-4.4, 4.2], [4.6, 1.8]].map(([dx, y]) => ({ x: bx + dx, y, z: BZ + 0.6, r: 0, c: ['#e8fff0', '#40ffa0'] })); S.orbs.push(...lights); lights.forEach((l, i) => { wait(350 + i * 330).then(() => { sfx('magic'); tw(l, { r: 0.14 }, 400, 'back'); }).catch(() => {}); }); } // (its lights come on one by one)
    else if (how === 'erupt') run(2800, () => { if (Math.random() < 0.3) dirt(bx + (Math.random() - 0.5) * 6, BZ, 5, 1.2, FIRE); });
    await wait(2800); cut(facing()); drift(2000, 0.4); await wait(500);
  } else if (opening === 'front') { await open(look([pathX(HZ), 1.25, HZ], { d: 12, dir: -1, h: 1.3, f: 1000, sy: H * 0.58 })); tw(S.cam, facing(), 3000, 'io'); await march(B, HZ, 3000); await wait(250); } // they come toward us; whatever it is, it is behind the camera
  else {
    if (opening === 'feet') { await open(look([pathX(3), 0.6, 3], { d: 4.4, h: 0.35, f: 900, sy: H * 0.5 })); tw(S.cam, look([pathX(HZ), 0.9, HZ], { d: 7.5, h: 0.5, f: 900, sy: H * 0.54 }), 3000, 'io'); } // heels and long shadows, close to the ground
    else if (opening === 'peek') { await open(look([bx, 0.35, BZ], { d: 3.2, dir: -1, h: 0.5, f: 1000, sy: H * 0.68, sx: W * 0.3 }), 1000); drift(3200, 0.4); } // something small in the grass, and far off the ones walking toward it
    else if (opening === 'top') { await open(look([pathX(5), 0, 5], { d: 27, h: 21, f: 1500, sy: H * 0.5 })); tw(S.cam, look([pathX(HZ), 0, HZ], { d: 21, h: 16, f: 1500, sy: H * 0.5 }), 3000, 'io'); } // from straight overhead: small figures in a big place
    else { await open(look([pathX(6), 1, 6], { d: 15, h: 6.2, f: 780, sy: H * 0.66 })); tw(S.cam, look([pathX(HZ), 1.2, HZ], { d: 9.5, h: 2.6, f: 900, sy: H * 0.6 }), 3000, 'io'); }
    await march(B, HZ, 3000); await wait(200); cut(facing()); drift(2200, 0.5); await wait(450);
  }
  // 2 · something is wrong
  if (how === 'burrow') { emote(B.hero, '?', 700); await wait(600); shake(5); sfx('earth'); B.two.pose = 'point'; emote(B.two, '!', 700); await wait(900); } // one of them sees it coming and points
  else if (how === 'wait') { sfx('shadow'); all(B.all, (a) => { a.pose = 'ready'; }); if (B.rest.length) emote(B.rest[B.rest.length - 1], 'sweat', 900); await wait(1300); } // nobody jumps: weapons come up, and nobody speaks
  else if (how === 'dive') { sfx('wind'); emote(B.hero, '?', 600); await wait(550); B.hero.pose = 'point'; all(B.rest, (a) => { a.pose = 'startled'; }); S.dim = 0.25; tw(S, { dim: 0 }, 900); await wait(900); calm(B.all); } // a shadow crosses them, and the leader points up
  else if (how === 'grow') { emote(B.two, '?', 800); await wait(500); tw(B.hero, { z: B.hero.z + 0.7 }, 700); B.hero.anim = 'walk'; await wait(700); B.hero.anim = 'idle'; await wait(400); } // nothing to fear yet: the leader goes a step closer to look
  else if (how === 'surface') { emote(B.hero, '?', 700); await wait(600); sfx('wind'); B.two.fx = 1; B.two.lean = 1; B.two.pose = 'point'; emote(B.two, '!', 700); await wait(900); B.two.fx = 0; } // one of them points out over the water
  else { emote(B.hero, '?', 700); await wait(700); shake(9); sfx(how === 'drop' ? 'wind' : 'earth'); startle(B.all); await wait(850); calm(B.all); }
  // 3 · it arrives, each in its own way
  const over = (more = {}) => look([bx, big * 0.42, BZ], { d: BZ - HZ + 4.4, h: 2.0, f: 900, sy: H * 0.5, sx: W * 0.52, ...more });
  if (how === 'rise') { cut(over()); dirt(bx, BZ, 40, 1.4); run(2000, () => { shake(8); if (Math.random() < 0.25) dirt(bx + (Math.random() - 0.5) * 5, BZ + (Math.random() - 0.5) * 3, 6, 1); }); tw(S.cam, { hy: S.cam.hy + 130, y: 1.7 }, 2000, 'io'); await tw(boss, { y: 0 }, 2000, 'out'); boss.buried = false; shake(18); sfx('explosion'); dirt(bx, BZ - 1, 50, 1.8); await wait(350); await tw(boss, { dark: 0 }, 500, 'out'); }
  else if (how === 'burrow') { // high and to the side: a mound comes down the road at them faster than they can turn, and bursts
    cut(look([pathX(22), 0.4, 22], { d: 17, h: 7.5, f: 800, sy: H * 0.56 })); const m = { k: 'mound', x: pathX(44), z: 44, r: 1.7, col: D.ground[2] }; S.mounds.push(m); tw(S.cam, look([bx, 1, BZ - 2], { d: 12, h: 4.2, f: 860, sy: H * 0.58 }), 1700, 'in'); await run(1700, (k) => { m.z = 44 - (44 - BZ) * k * k; m.x = pathX(m.z); m.r = 1.7 + Math.sin(k * 40) * 0.15; dirt(m.x, m.z, 4, 0.9); shake(4 + k * 8); }); S.mounds.length = 0; all(B.all, (a) => { a.pose = 'startled'; tw(a, { z: a.z - 1.6 }, 260, 'out'); hop(a, 0.6, 300); });
    sfx('explosion'); S.flash = 0.6; dirt(bx, BZ, 80, 2.2); freeze(90); await tw(boss, { y: 2.2 }, 340, 'out'); boss.buried = false; await tw(boss, { y: 0 }, 240, 'in'); shake(24); dirt(bx, BZ, 50, 1.6); await wait(500); calm(B.all); }
  else if (how === 'dive') { cut(over()); sfx('wind'); boss.alpha = 1; S.lines = 0.6; await tw(boss, { x: bx, y: 0 }, 850, 'in'); S.lines = 0; shake(22); S.flash = 0.6; sfx('explosion'); dirt(bx, BZ, 60, 1.9); freeze(110); await wait(600); }
  else if (how === 'grow') { // something no bigger than a cap in the grass, and then it is not
    cut(look([bx, 0.5, BZ], { d: 6, h: 1.0, f: 1000, sy: H * 0.6 })); await wait(700); sfx('poison'); tw(S.cam, over(), 2400, 'io'); const puffs = Array.from({ length: 10 }, (_, i) => ({ x: bx + (i - 4.5) * 0.7, y: 0.3, z: BZ - 0.4, r: 0.06, c: ['#e8fff8', '#80ffd0'] })); S.orbs.push(...puffs); puffs.forEach((q, i) => tw(q, { y: 3 + (i % 4) * 1.6, x: q.x + (i - 4.5) * 0.5, r: 0.13 }, 2400 + i * 90, 'out'));
    await run(2400, (k) => { const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; boss.size = big * (0.12 + 0.88 * e) * (1 + Math.sin(k * 26) * 0.05 * (1 - k)); boss.head = boss.size * 0.88; boss.dark = 0.6 * (1 - k); shake(3 + k * 6); }); boss.size = big; boss.head = big * 0.88; boss.dark = 0; startle(B.all); await wait(900); calm(B.all); S.orbs.length = 0; shake(14); sfx('roar'); await wait(300); }
  else if (how === 'drop') { // nothing, then all of its weight at once
    cut(over()); const shade = { x: bx, z: BZ, r: 0.3, col: 'rgba(8,8,30,0.42)' }; S.rings.push(shade); await tw(shade, { r: 3.6 }, 950, 'in'); boss.alpha = 1; S.lines = 0.5; await tw(boss, { y: 0 }, 300, 'in'); S.lines = 0; S.flash = 0.9; shake(30); sfx('smash'); freeze(140); dirt(bx, BZ, 90, 2.4); burst('hit_spark', bx, 1.2, BZ - 0.6, 9); all(B.all, (a) => hop(a, 0.5, 300)); await wait(900); }
  else if (how === 'surface') { // a long back goes by in the water, and is gone; then it is beside them
    cut(look([bx + 9, 1, BZ], { d: 17, h: 3.6, f: 880, sy: H * 0.54 })); sfx('wind'); await run(1900, (k) => { boss.x = bx + 30 - 24 * k; if (Math.random() < 0.6) dirt(boss.x + 2, BZ, 3, 0.6, SPRAY); }); await tw(boss, { y: -big * 1.15 }, 380, 'in'); boss.fx = 0; boss.lean = -1; boss.x = bx; all(B.all, (a) => { a.pose = 'ready'; }); await wait(900); // (the water closes over it)
    cut(over({ h: 1.6 })); sfx('explosion'); dirt(bx, BZ, 90, 2.4, SPRAY); tw(S.cam, { hy: S.cam.hy + 120 }, 900, 'io'); await tw(boss, { y: 0 }, 900, 'out'); boss.buried = false; shake(20); dirt(bx, BZ - 1, 60, 1.8, SPRAY); await wait(450); calm(B.all); }
  else if (how === 'erupt') { // the ground gives way to fire, and something walks out of it still glowing
    preload('hit_fire'); cut(over()); S.flash = 0.8; shake(22); sfx('explosion'); for (const dx of [-2.4, 0, 2.4]) burst('hit_fire', bx + dx, 1.6, BZ - 0.4, 11); dirt(bx, BZ, 90, 2.6, FIRE); freeze(100);
    await run(2100, (k) => { boss.alpha = Math.min(1, k * 2.5); boss.tint = 'rgba(255,' + ((150 + k * 80) | 0) + ',60,' + (0.95 * (1 - k)).toFixed(2) + ')'; shake(5 + (1 - k) * 8); if (Math.random() < 0.3) dirt(bx + (Math.random() - 0.5) * 5, BZ, 5, 1.3, FIRE); }); boss.tint = null; sfx('fire'); await wait(350); }
  else { cut(over()); tw(S.cam, { z: S.cam.z + 2.2 }, 2000, 'io'); await tw(boss, { dark: 0 }, 1800, 'io'); await wait(250); }
  // 4 · what it has to say, and what they answer
  const mid = [(bx + B.hero.x) / 2, 1.6, (BZ + B.hero.z) / 2], sh = { low, over,
    up: (m = {}) => look([boss.x, boss.y + big * 0.55, boss.z], { d: BZ - B.hero.z - 1.3, h: 0.3, f: 720, sy: H * 0.62, sx: W * 0.5, ...m }),
    past: (m = {}) => look([B.hero.x, 1.2, B.hero.z], { d: BZ - B.hero.z + big * 1.6, dir: -1, h: big * 0.5, f: 820, sy: H * 0.6, sx: W * (o.side ? 0.66 : 0.34), ...m }),
    top: (m = {}) => look([mid[0], 0, B.hero.z + (BZ - B.hero.z) * 0.35], { d: 27, h: 20, f: 1150, sy: H * 0.52, ...m }), // (both of them in it: the boss at the top of the picture, the party below)
    wide: (m = {}) => look(mid, { d: 13.5, h: 3.4, f: 860, sy: H * 0.58, ...m }) };
  await o.lines(B, boss, sh);
  // 5 · wide: it moves, and its name lands. This is where the fight takes over
  if (o.end === 'behind') { cut(sh.past()); drift(2600, 0.8); } // past its back: how small they are in front of it
  else if (o.end === 'push') { cut(low({ d: Math.min(big * 2.4, BZ - B.hero.z - 1.4), sx: W * 0.4 })); drift(2600, 1.6); } // from the ground, going in on it
  else { cut(sh.wide()); drift(2600, 1.2); }
  all(B.all, (a) => { a.pose = 'ready'; }); act(boss, 'cast'); boss.once = 0; shake(14); S.flash = 0.5; sfx('boss');
  await wait(350); nameSlip(o.id, o.set); await wait(2300); await close();
}
const FIRE = ['#ff8a2a', '#ffd070', '#ff5a1a'], SPRAY = ['#ffffff', '#d8f0fa', '#a8d4e8'];

// ───── 0 · the last world ─────
async function s0(P) {
  newScene(1); S.bars = 1; const B = band(P, 8);
  let pic = showPic(picture('one'), { s: 1.14, y: 14 }); tw(S, { fade: 0 }, 900); tw(pic, { s: 1.02, y: 0 }, 4600, 'lin'); await wait(500); await caption(L('0.1'), 3300);
  S.flash = 0.9; shake(26); sfx('explosion'); pic = showPic(picture('broken'), { s: 1.04 }); tw(pic, { s: 1.16 }, 4200, 'lin'); run(1200, () => shake(7)); await wait(600); await caption(L('0.2'), 3200);
  await tw(S, { fade: 1 }, 400); pic = showPic(picture('drift'), { s: 1.16, y: -10 }); tw(S, { fade: 0 }, 500); tw(pic, { s: 1.0, y: 0 }, 6200, 'lin'); sfx('shadow'); await wait(500); await caption(L('0.3'), 5000);
  // and the ones who will walk it: at the edge of the forest, looking in
  await tw(S, { fade: 1 }, 450); hidePic(); cut(look([B.hero.x, 1.2, 8], { d: 9, h: 3.4, f: 860, sy: H * 0.62 })); tw(S, { fade: 0 }, 600); tw(S.cam, look([B.hero.x, 1.2, 8], { d: 6.6, h: 2.0, f: 900, sy: H * 0.6 }), 2600, 'io'); await wait(1700);
  await tell(B.hero, '0.4', { pose: 'point' }); all(B.rest, (a) => { a.pose = 'ready'; hop(a, 0.3, 260); }); await wait(500); await close();
}

// ───── 1 · Greenveil Forest ─────
async function s1A(P) {
  newScene(1); const OZ = 14.6, B = band(P, -1), ox = pathX(OZ) + 2.2; S.clear.push({ x: ox + 2, z: OZ + 1, r: 5 });
  thing('cart', { x: ox + 2.6, z: OZ + 1.4, h: 3.3, o: { broken: true } }); const orrin = npc('orrin', { x: ox, z: OZ, fz: -1, lean: -1, pose: 'kneel' });
  await open(look([pathX(5), 1, 5], { d: 12, h: 4.6, f: 800, sy: H * 0.64 })); tw(S.cam, look([pathX(10), 1.2, 10], { d: 8.6, h: 2.3, f: 900, sy: H * 0.6 }), 2800, 'io'); await march(B, 10, 2800);
  startle(B.all, 0.35); all(B.all, (a) => face(a, orrin)); await wait(600); calm(B.all); B.hero.pose = 'ready';
  await tell(orrin, '1A.1', { pose: 'kneel', keep: true }); B.hero.pose = null;
  emote(B.two, '?', 700); await tell(B.two, '1A.2', { pose: 'point' });
  await tell(orrin, '1A.3', { pose: 'give', d: 5.4, sx: W * 0.44 });
  await tell(orrin, '1A.4', { pose: 'sad', keep: true });
  cut(look([B.hero.x, 1.2, 10], { d: 5.6, dir: -1, h: 1.2, f: 1100, sy: H * 0.56 })); drift(1500, 0.3); hop(B.hero, 0.25, 280); emote(B.hero, '!', 600); all(B.rest, (a) => { a.pose = 'ready'; }); await wait(1300); await close();
}
// Those who fight from where they stand: the colour of what they send, and what it does when it lands.
const RANGED = { mage: { c: ['#fff0b0', '#ff6a2a'], hit: 'hit_fire' }, priest: { c: ['#ffffff', '#ffd24a'], hit: 'hit_holy' }, archer: { c: ['#ffffff', '#bfe0ff'], hit: 'hit_spark', arrow: true } };
// The Guardian wakes. The last beat is the leader's own way of fighting: a knight runs in and cuts, a mage stands and
// casts, an archer looses an arrow.
async function s1B(P) {
  newScene(1); const BOSS_Z = 31, HZ = 22, px = pathX, bx = px(BOSS_Z); preload('slash2', 'hit_fire', 'hit_holy', 'hit_spark');
  S.clear.push({ x: bx, z: BOSS_Z, r: 8.5 }); S.rings.push({ x: bx, z: BOSS_Z, r: 6.4, col: '#8a765e' }, { x: bx, z: BOSS_Z, r: 5.6, col: '#8f8a9a' }, { x: bx, z: BOSS_Z, r: 3.2, col: '#7c7888' });
  const B = band(P, -2), { hero, second, third, solo } = B, far = RANGED[hero.who], boss = actor(castMon('forest_guardian'), { x: bx, z: BOSS_Z, fz: -1, y: -6.4, buried: true, dark: 0.95, lean: -1 });
  // shot 1: high behind them. They walk away from us down the road, and the camera comes down and follows them in
  cut({ x: 1.6, y: 6.5, z: -12, dir: 1, f: 760, hy: 150 }); tw(S, { bars: 1 }, 500); tw(S, { fade: 0 }, 800); tw(S.cam, { y: 2.4, z: 11, hy: 300, x: 0.9 }, 4600, 'io'); await march(B, HZ, 4600, 'lin'); await wait(250);
  // shot 2: turned round to face them, low. The road they came by runs away behind them. Something is wrong
  cut({ x: hero.x + 0.4, y: 1.0, z: HZ + 5.2, dir: -1, f: 1150, hy: 330 }); drift(2600, 0.6);
  await wait(450); emote(hero, '?', 800); await wait(900); shake(7); sfx('earth'); await wait(350); shake(10); for (const a of B.all) { emote(a, '!', 700); a.pose = 'startled'; hop(a, 0.5, 300); tw(a, { z: a.z - 1 }, 300, 'out'); } await wait(900); calm(B.all);
  // shot 3: over their shoulders. The ground opens, a black shape climbs out of it, and the camera has to look up
  cut({ x: hero.x - (solo ? 1.3 : 0.3), y: 2.0, z: hero.z - 4.0, dir: 1, f: 900, hy: 330 }); dirt(bx, BOSS_Z, 40, 1.4);
  run(2200, () => { shake(8); if (Math.random() < 0.25) dirt(bx + (Math.random() - 0.5) * 5, BOSS_Z + (Math.random() - 0.5) * 3, 6, 1); }); tw(S.cam, { hy: 480, z: hero.z - 4.6, y: 1.7 }, 2200, 'io');
  await tw(boss, { y: 0 }, 2200, 'out'); boss.buried = false; shake(18); sfx('explosion'); dirt(bx, BOSS_Z - 1, 50, 1.8); await wait(400); await tw(boss, { dark: 0 }, 500, 'out'); await wait(250);
  // shot 4: from the ground at its roots, looking up
  boss.anim = 'cast'; boss.once = 0; cut({ x: bx + 1.2, y: 0.5, z: BOSS_Z - 10.5, dir: 1, f: 760, hy: 640 }); drift(1900, 0.8);
  S.flash = 0.6; S.lines = 1; run(1700, () => shake(13)); await say(boss, L('1B.1'), 1700, 'shout'); S.lines = 0; boss.anim = 'idle';
  // shot 5: turned round again: the ones behind first (if anyone is), then close on the leader. Alone, the leader has both thoughts
  if (second) { cut({ x: hero.x + 0.2, y: 1.2, z: hero.z + 4.4, dir: -1, f: 1250, hy: 350 }); drift(2100, 0.4); if (third) { emote(third, 'sweat', 900); third.pose = 'sad'; } second.pose = 'startled'; await say(second, L('1B.2'), 1700); }
  cut({ x: hero.x - 0.5, y: 1.15, z: hero.z + 3.0, dir: -1, f: 1500, hy: 350 }); drift(3000, 0.4);
  if (solo) { hero.pose = 'startled'; emote(hero, 'sweat', 800); await say(hero, L('1B.2'), 1500); }
  hero.pose = 'point'; S.flash = 0.35; await say(hero, L(solo ? '1B.3s' : far ? '1B.3r' : '1B.3'), 1500); hero.pose = null; all(B.rest, (a) => { a.pose = 'ready'; });
  // shot 6: high behind them, the whole distance between them: it comes at us, the blow lands, and they are already scattering
  cut({ x: 3.4, y: 5.2, z: hero.z - 9, dir: 1, f: 900, hy: 190 }); await wait(250);
  act(boss, 'attack'); await tw(boss, { z: hero.z + 3.4 }, 320, 'in'); dirt(hero.x, hero.z, 60, 1.8); S.flash = 0.8; shake(22); sfx('smash'); freeze(110);
  B.all.forEach((a, i) => { const [dx, dz] = [[0.4, -4.5], [3.2, -2.5], [-3.4, -2], [1.6, -4.2]][i]; hop(a, 2, 520); tw(a, { z: a.z + dz, x: a.x + dx }, 520, 'out'); }); if (third) third.pose = 'startled';
  await wait(520); if (third) { third.pose = 'down'; dirt(third.x, third.z, 14, 0.8); } tw(boss, { z: BOSS_Z }, 520, 'io'); await wait(380); // (with three or more, the blow throws one of them flat)
  // shot 7: low behind the leader, and the answer in the leader's own way
  cut({ x: hero.x + 1.3, y: 1.3, z: hero.z - 3.4, dir: 1, f: 800, hy: 400 }); for (const a of B.rest) if (a !== third) { a.pose = null; if (RANGED[a.who]) { a.anim = 'cast'; a.once = 0; } else act(a, 'attack'); }
  const struck = (sheet, s) => { burst(sheet, bx - 0.4, 2.6, BOSS_Z - 1, s); act(boss, 'hurt'); S.flash = 0.9; shake(20); sfx('hit'); freeze(160); tw(S, { lines: 0 }, 300); };
  if (far) { // stands the ground: the power gathers in the hand, then crosses the whole distance and gets small as it goes
    const orb = { x: hero.x + 0.55, y: 1.75, z: hero.z + 0.3, r: 0.05, c: far.c }; S.orbs.push(orb); hero.anim = far.arrow ? 'idle' : 'cast'; hero.once = 0; hero.pose = far.arrow ? 'ready' : null;
    tw(S.cam, { z: hero.z - 2.6, hy: 380 }, 900, 'lin'); run(900, () => shake(3)); await tw(orb, { r: far.arrow ? 0.1 : 0.3 }, far.arrow ? 500 : 900, 'out'); hero.pose = null; act(hero, 'attack'); S.lines = 0.8; S.flash = 0.3; sfx('magic');
    tw(S.cam, { f: 1050, x: S.cam.x - 0.5 }, 420, 'out'); await tw(orb, { x: bx - 0.2, y: 2.7, z: BOSS_Z - 0.8 }, far.arrow ? 240 : 420, 'in'); S.orbs.length = 0; struck(far.hit, 6.5); hero.anim = 'idle'; hero.once = 0;
  } else { // goes in: gets small fast, and the cut crosses the Guardian
    S.lines = 0.8; hero.anim = 'attack'; hero.once = S.now + 500; tw(S.cam, { z: BOSS_Z - 12 }, 320, 'out'); await tw(hero, { z: BOSS_Z - 3.2, x: bx - 0.6 }, 240, 'in'); struck('slash2', 5); hero.anim = 'idle'; hero.once = 0;
  }
  await tw(boss, { z: BOSS_Z + 0.8 }, 200, 'out'); tw(boss, { z: BOSS_Z }, 500, 'io'); await wait(300);
  // the camera drifts while the name slip lands: this is where the fight takes over
  tw(S.cam, far ? { x: S.cam.x + 1.2, y: 1.7, hy: 420 } : { x: S.cam.x + 2.0, y: 1.8, z: BOSS_Z - 10.5, hy: 440 }, 2700, 'out'); if (third) { third.pose = 'ready'; hop(third, 0.5, 260); }
  nameSlip('forest_guardian', 1); await wait(2300); await close();
}
async function s1C(P) {
  newScene(1); const BZ = 15.5, bx = pathX(BZ), B = band(P, 9.5); S.clear.push({ x: bx, z: BZ, r: 8 }); S.rings.push({ x: bx, z: BZ, r: 5.6, col: '#8f8a9a' });
  const boss = actor(castMon('forest_guardian'), { x: bx, z: BZ, fz: -1, lean: -1 }), orrin = npc('orrin', { x: bx + 9, z: BZ - 2.5, fx: -1, lean: -1 });
  await open(look([bx, 2.4, BZ], { d: 11.5, h: 2.4, f: 880, sy: H * 0.52 })); drift(2000, 0.8); await wait(900);
  await lastWords(boss, '1C.1'); all(B.all, (a) => { a.pose = 'sad'; });
  // he was not there, and then he is: the pen is already in his hand
  cut(look([bx + 3.5, 1.3, BZ - 2.5], { d: 8, h: 1.8, f: 900, sy: H * 0.58 })); calm(B.all); await walkTo(orrin, bx + 2.6, BZ - 2.5, 2200, 'out'); orrin.fx = 0; orrin.fz = -1; all(B.all, (a) => face(a, orrin));
  await tell(orrin, '1C.2', { pose: 'smile' }); orrin.pose = 'write'; await wait(500); await inkMap(1);
  // and the forest has gone quiet: the colour is a little less than it was
  cut(look([B.hero.x, 1.3, 9.5], { d: 6, dir: -1, h: 1.3, f: 1050, sy: H * 0.56 })); tw(S, { wash: 0.36 }, 2400); drift(3000, 0.5); await wait(900); emote(B.two, '?', 800); B.two.pose = 'startled'; await wait(500);
  await tell(B.two, '1C.3', { shot: false, pose: 'sad' }); orrin.pose = null;
  await tell(orrin, '1C.4', { pose: 'smile' }); cut(look([bx + 2, 1.3, BZ], { d: 9, h: 2.2, f: 900, sy: H * 0.58 })); walkTo(orrin, bx + 3.4, BZ + 12, 3600, 'in'); await wait(1900); await close();
}

// ───── 2 · Ashen Desert ─────
async function s2A(P) {
  newScene(2); S.dim = 0.2; const OZ = 14.4, B = band(P, 0), cx = pathX(OZ) + 1.2; S.clear.push({ x: cx, z: OZ, r: 5 });
  const fire = thing('camp', { x: cx, z: OZ + 0.2, h: 2.2 }), orrin = npc('orrin', { x: cx + 2.2, z: OZ + 0.6, fz: -1, lean: -1 });
  await open(look([cx, 1, OZ], { d: 6.5, h: 1.6, f: 1000, sy: H * 0.6 })); tw(S.cam, look([pathX(10), 1.2, 11], { d: 9, h: 2.4, f: 900, sy: H * 0.6 }), 2600, 'io'); await march(B, 10, 2800);
  all(B.all, (a) => face(a, orrin)); emote(B.two, '?', 800);
  await tell(B.two, '2A.1', { pose: 'point' });
  await tell(orrin, '2A.2', { pose: 'give', keep: true });
  // they sit by it; the leader drinks first
  cut(look([cx - 0.6, 1.1, OZ - 2], { d: 6.4, h: 1.5, f: 1000, sy: H * 0.58 })); orrin.pose = 'smile'; await walkTo(B.hero, cx - 1.6, OZ - 1.2, 1200); face(B.hero, fire); B.hero.pose = 'give'; await wait(700); B.hero.pose = 'startled'; emote(B.hero, 'sweat', 900); hop(B.hero, 0.3, 260); await wait(450);
  await tell(B.hero, '2A.3', { pose: 'sad', dir: -1, d: 4.2 });
  await tell(orrin, '2A.4', { pose: 'smile', keep: true });
  // (his own cup stands full beside him: he has not touched it)
  cut(look([cx + 0.4, 0.8, OZ], { d: 5.2, h: 1.2, f: 1150, sy: H * 0.6 })); drift(1800, 0.5); orrin.pose = 'shut'; await wait(1700); await close();
}
const s2B = (P) => bossScene(P, { set: 2, id: 'sand_tyrant', how: 'burrow', open: 'feet', near: 0.95, lens: 400, async lines(B, boss, sh) {
  boss.anim = 'cast'; boss.once = 0; cut(sh.low()); drift(3600, 0.8); S.lines = 0.7; run(900, () => shake(10)); await say(boss, L('2B.1'), undefined, 'shout'); S.lines = 0; boss.anim = 'idle';
  // past its horns: grains is what they look like from here. One of them answers anyway
  cut(sh.past()); drift(3200, 0.6); B.two.pose = B.solo ? 'point' : 'smile'; await say(B.two, L('2B.2')); B.two.pose = null;
  // from overhead: the leader's order, and they are already moving apart
  if (!B.solo) { cut(sh.top()); B.hero.pose = 'point'; const p = quiet(say(B.hero, L('2B.3'), 1900)); B.rest.forEach((a, i) => { tw(a, { x: a.x + (i % 2 ? -2.8 : 2.8), z: a.z - 0.6 }, 700, 'out'); hop(a, 0.4, 320); }); await p; B.hero.pose = null; }
} });
async function s2C() {
  newScene(2); S.bars = 1; const pic = showPic(picture('wall'), { s: 1, x: 0, torch: { x: 760, y: 330 } }); sfx('fire');
  tw(S, { fade: 0 }, 900); await tw(pic, { x: 360 }, 5200, 'io'); await wait(600); await tw(pic, { x: 720 }, 3400, 'io'); tw(pic.torch, { x: 900, y: 420 }, 1400, 'io'); await wait(2600); // (the torch stays a while on the small one with the roll)
  // outside again: the desert on the map is already inked over, and nobody saw him do it
  await tw(S, { fade: 1 }, 500); const map = showPic(picture('map', { inked: [1] }), { s: 1.5, x: clamp(MAP_AT[2][0] - 640, -190, 190), y: clamp(MAP_AT[2][1] - 360, -110, 110) }); map.blots.push({ x: MAP_AT[2][0], y: MAP_AT[2][1] - 4, r: 80, seed: 5 });
  tw(S, { fade: 0 }, 500); sfx('shadow'); await tw(map, { s: 1.62 }, 2600, 'lin'); await close();
}

// ───── 3 · Frostfall Kingdom ─────
const ICE = 'rgba(150,215,255,0.6)';
function townsfolk(z, frozen) { const o = frozen ? { tint: ICE, still: true } : { still: true }; return [npc('towns1', { x: pathX(z) - 3.4, z: z + 1.6, fz: -1, lean: 1, pose: frozen ? 'startled' : null, ...o }), npc('towns2', { x: pathX(z) + 3.0, z: z + 3.2, fz: -1, lean: -1, pose: frozen ? 'cheer' : null, ...o }), npc('towns3', { x: pathX(z) - 1.4, z: z + 6, fz: -1, lean: -1, pose: frozen ? 'point' : null, ...o })]; }
async function s3A(P) {
  newScene(3); const TZ = 12, B = band(P, -1), folk = townsfolk(TZ, true), orrin = npc('orrin', { x: pathX(TZ) + 5.2, z: TZ + 0.4, fx: -1, lean: -1 }); S.clear.push({ x: pathX(TZ), z: TZ + 3, r: 7 });
  await open(look([pathX(TZ), 1.3, TZ + 3], { d: 13, h: 3.6, f: 820, sy: H * 0.6 })); tw(S.cam, look([pathX(TZ), 1.3, TZ + 2], { d: 9, h: 2.2, f: 900, sy: H * 0.58 }), 3000, 'io'); await march(B, TZ - 3.5, 3000);
  await walkTo(B.hero, folk[0].x + 1.5, folk[0].z - 0.9, 1100); face(B.hero, folk[0]);
  cut(look([folk[0].x + 0.7, 1.3, folk[0].z], { d: 4.8, dir: -1, h: 1.3, f: 1200, sy: H * 0.54 })); drift(2600, 0.3); await wait(500); await say(B.hero, L('3A.1')); // (breath still comes from the frozen mouth)
  face(orrin, B.hero); await tell(orrin, '3A.2', { pose: 'sad', dir: 1 }); all(B.all, (a) => face(a, orrin));
  emote(B.two, '?', 700); await tell(B.two, '3A.3');
  await tell(orrin, '3A.4', { pose: 'shut', ms: 1500, dir: 1 }); startle(B.all, 0.2); orrin.pose = 'smile'; drift(1400, 0.2); await wait(1300); calm(B.all);
  cut(look([pathX(TZ) + 2, 1.3, TZ + 2], { d: 10, h: 2.4, f: 880, sy: H * 0.58 })); orrin.pose = null; walkTo(orrin, pathX(TZ + 14) + 1, TZ + 14, 3600, 'in'); await wait(1800); await close();
}
async function s3B(P) {
  newScene(3); const BZ = 21, HZ = 11, bx = pathX(BZ), B = band(P, 2); S.clear.push({ x: bx, z: BZ, r: 8 }); S.rings.push({ x: bx, z: BZ, r: 6, col: '#d0e0ee' }, { x: bx, z: BZ, r: 4.4, col: '#9fd8ff' });
  const boss = actor(castMon('frost_queen'), { x: bx, z: BZ, fz: -1, lean: -1 }), low = (m = {}) => look([bx, boss.size * 0.5, BZ], { d: boss.size * 1.95, h: 0.7, f: 820, sy: H * 0.64, sx: W * 0.46, ...m });
  await open(look([pathX(8), 1.2, 8], { d: 13, h: 5, f: 800, sy: H * 0.64 })); tw(S.cam, look([pathX(HZ), 1.2, HZ], { d: 9, h: 2.4, f: 900, sy: H * 0.6 }), 2600, 'io'); await march(B, HZ, 2600); all(B.all, (a) => { a.pose = 'ready'; });
  // she begins the speech she gives everyone, and stops
  boss.anim = 'cast'; boss.once = 0; cut(low()); drift(2600, 0.5); sfx('ice'); await say(boss, L('3B.1'), 2300); boss.anim = 'idle'; emote(boss, '!', 800); await wait(450);
  cut(closeOn(B.hero, { d: 3.6 })); B.hero.pose = 'give'; drift(1300, 0.3); await wait(1200); // (the map is in the leader's hand)
  cut(low({ d: boss.size * 1.75 })); drift(4200, 0.5); await say(boss, L('3B.2'));
  await tell(B.two, '3B.3', { pose: 'point' }); B.hero.pose = 'ready';
  cut(low({ d: boss.size * 1.75 })); drift(3600, 0.4); await say(boss, L('3B.4'));
  cut(look([(bx + B.hero.x) / 2, 1.6, (BZ + HZ) / 2], { d: 13, h: 3.2, f: 860, sy: H * 0.58 })); act(boss, 'cast'); boss.once = 0; S.flash = 0.6; shake(14); sfx('ice'); dirt(B.hero.x, HZ + 2, 40, 1.4); all(B.all, (a) => hop(a, 0.6, 320)); drift(2600, 1);
  await wait(350); nameSlip('frost_queen', 3); await wait(2300); await close();
}
async function s3C(P) {
  newScene(3); const BZ = 15.5, bx = pathX(BZ), B = band(P, 9.5); townsfolk(BZ + 2, false); S.clear.push({ x: bx, z: BZ + 3, r: 9 });
  const boss = actor(castMon('frost_queen'), { x: bx, z: BZ, fz: -1, lean: -1 }), orrin = npc('orrin', { x: bx + 9, z: BZ - 2.5, fx: -1, lean: -1 });
  await open(look([bx, 2, BZ], { d: 10.5, h: 2.2, f: 880, sy: H * 0.54 })); drift(1800, 0.6); await wait(700);
  await lastWords(boss, '3C.1');
  cut(look([bx + 3.2, 1.3, BZ - 2.5], { d: 8, h: 1.8, f: 900, sy: H * 0.58 })); await walkTo(orrin, bx + 2.6, BZ - 2.5, 1900, 'out'); orrin.fx = 0; orrin.fz = -1; orrin.pose = 'write'; await wait(600); await inkMap(3, [1, 2]);
  // the thaw has come, and the people of the town stand where they stood: the colour runs out of all of it as they watch
  cut(look([bx, 1.4, BZ + 3], { d: 12, h: 2.6, f: 860, sy: H * 0.58 })); drift(3400, 1); await tw(S, { wash: 0.42 }, 2600, 'io'); startle([B.two], 0.4);
  await tell(B.two, '3C.2', { pose: 'startled' }); all(B.all, (a) => face(a, orrin));
  await tell(orrin, '3C.3', { pose: 'smile' });
  // the leader has the map out, and has seen something else on it
  const map = showPic(picture('map', { inked: [1, 2, 3] }), { s: 1.3, x: 150, y: 30 }); S.flash = 0.2; tw(map, { s: 1.5, x: 190 }, 2000, 'lin'); await wait(1900); hidePic();
  await tell(B.hero, '3C.4', { pose: 'point' });
  await tell(orrin, '3C.5', { pose: 'shut', keep: true }); await wait(500); await close();
}

// ───── 4 · Shadow Crypt ─────
async function s4A(P) {
  newScene(4); const GZ = 14, B = band(P, 0), gx = pathX(GZ) - 1.8, ghost = actor(castMon('wailing_spirit'), { x: gx, z: GZ, y: 0.5, fz: -1, lean: 1, alpha: 0, noShadow: true }), orrin = npc('orrin', { x: pathX(1) + 3.6, z: 1, fz: 1, lean: -1 }); S.clear.push({ x: gx, z: GZ, r: 4 });
  await open(look([pathX(6), 1.2, 6], { d: 11, h: 3.8, f: 820, sy: H * 0.62 })); tw(S.cam, look([pathX(9), 1.2, 9], { d: 8.4, h: 2.2, f: 900, sy: H * 0.6 }), 2600, 'io'); await march(B, 9.5, 2600);
  sfx('shadow'); run(1600, (k) => { ghost.y = 0.5 + Math.sin(S.now / 400) * 0.15; ghost.alpha = 0.78 * k; }); startle(B.all, 0.3); await wait(1300); calm(B.all); const bob = run(60000, () => { ghost.y = 0.5 + Math.sin(S.now / 400) * 0.15; }); void bob;
  // it is not looking at them. It is looking past them, at the old man down the road
  await tell(ghost, '4A.1', { d: 5, f: 1050, sx: W * 0.42 });
  await tell(B.hero, '4A.2', { ms: 1500 });
  await tell(ghost, '4A.3', { d: 4.4, f: 1100 });
  cut(look([orrin.x, 1.2, orrin.z], { d: 6.5, dir: -1, h: 1.4, f: 1200, sy: H * 0.56 })); orrin.pose = 'smile'; drift(1500, 0.3); await wait(1400); // (he lifts his bound hand a little, as if to wave)
  all(B.all, (a) => { a.fz = -1; }); emote(B.two, 'sweat', 900);
  await tell(B.two, '4A.4', { pose: 'sad', dir: 1 }); tw(ghost, { alpha: 0 }, 900); await wait(700); await close();
}
const s4B = (P) => bossScene(P, { set: 4, id: 'lich_king', how: 'wait', open: 'lair', end: 'behind', async lines(B, boss, sh) {
  // it does not get up. From far off, small among its lights
  cut(sh.wide({ d: 17, h: 2.2 })); drift(3200, 1.6); await say(boss, L('4B.1'));
  // past its crown: the one who answers it
  cut(sh.past()); drift(2800, 0.5); B.hero.pose = 'point'; await say(B.hero, L('4B.2')); B.hero.pose = null;
  // the question, and the camera comes slowly in on it while it is asked
  boss.anim = 'cast'; boss.once = 0; cut(sh.low({ d: boss.size * 2.7 })); tw(S.cam, sh.low({ d: boss.size * 1.75 }), 5000, 'io'); await say(boss, L('4B.3')); boss.anim = 'idle';
  // nobody can. From straight overhead: three small figures, and stones with names on them all round
  cut(sh.top()); drift(2400, 0.6); all(B.all, (a) => { a.pose = 'sad'; emote(a, '…', 1500); }); await wait(2200);
} });
async function s4C(P) {
  newScene(4); S.dim = 0.12; const OZ = 14.4, B = band(P, 10), cx = pathX(OZ) + 1.2; S.clear.push({ x: cx, z: OZ, r: 5 });
  const fire = thing('camp', { x: cx, z: OZ + 0.2, h: 2.2 }), orrin = npc('orrin', { x: cx + 2.2, z: OZ + 0.6, fz: -1, lean: -1 }); all(B.all, (a) => face(a, orrin)); void fire;
  await open(look([cx, 1.1, OZ - 1], { d: 8.5, h: 2, f: 920, sy: H * 0.6 })); drift(1800, 0.6); await wait(1200);
  await tell(B.hero, '4C.1', { pose: 'stern' });
  await tell(orrin, '4C.2', { pose: 'shut', keep: true });
  await tell(B.two, '4C.3', { pose: 'stern', ms: 1700 });
  orrin.pose = null; cut(closeOn(orrin, { h: 1.0, sy: H * 0.6 })); tw(S.cam, { hy: S.cam.hy + 60 }, 3200, 'io'); await say(orrin, L('4C.4')); // (he looks up as he says it)
  await tell(B.two, '4C.5', { pose: 'point' });
  await tell(orrin, '4C.6', { pose: 'smile' });
  cut(look([cx + 1, 1.2, OZ], { d: 9, h: 2.2, f: 900, sy: H * 0.58 })); walkTo(orrin, pathX(OZ + 13) + 1, OZ + 13, 3800, 'in'); tw(orrin, { dark: 0.9 }, 3200, 'in'); await wait(2100); await close();
}

// ───── 5 · Celestial Ruins ─────
const s5B = (P) => bossScene(P, { set: 5, id: 'celestial_dragon', how: 'dive', open: 'front', end: 'push', async lines(B, boss, sh) {
  // it has not come all the way down: it speaks from the air, and they have to look up
  tw(boss, { y: 4.6 }, 500, 'out'); await wait(350); boss.anim = 'cast'; boss.once = 0; cut(sh.up({ sy: H * 0.7 })); drift(3200, 0.4); await say(boss, L('5B.1')); boss.anim = 'idle';
  // it lands, and what it has seen is the thing in the leader's hand
  cut(sh.wide()); await tw(boss, { y: 0 }, 380, 'in'); shake(16); sfx('smash'); dirt(boss.x, boss.z, 40, 1.5); await wait(350);
  cut(closeOn(B.hero, { d: 3.4 })); B.hero.pose = 'give'; drift(1200, 0.3); await wait(1100);
  cut(sh.low({ d: boss.size * 1.75, sx: W * 0.52 })); drift(3400, 0.5); await say(boss, L('5B.2'));
  startle([B.hero], 0.2); await tell(B.hero, '5B.3', { pose: 'give', ms: 2100 });
  // past its wings: the choice it gives them
  cut(sh.past()); S.flash = 0.3; shake(8); drift(3400, 0.5); await say(boss, L('5B.4'));
} });
async function s5C(P) {
  newScene(5); const BZ = 15.5, bx = pathX(BZ), B = band(P, 9.5); S.plats.push({ x: 0, z: 12, r: 13 }); S.clear.push({ x: bx, z: BZ, r: 8 }); preload('hit_holy');
  const boss = actor(castMon('celestial_dragon'), { x: bx, z: BZ, fz: -1, lean: -1, anim: 'hurt', still: true, dark: 0.25 }), orrin = npc('orrin', { x: pathX(34), z: 34, fz: -1, lean: -1, alpha: 0 });
  await open(look([bx, 2.6, BZ], { d: 12, h: 2.4, f: 880, sy: H * 0.52 })); drift(1800, 0.7); await wait(800);
  cut(closeOn(boss, { d: 5.4, f: 1000, sy: H * 0.66 })); drift(9000, 0.6); await say(boss, L('5C.1')); all(B.all, (a) => { a.pose = 'startled'; }); await say(boss, L('5C.2'), 2600);
  burst('hit_holy', bx, 2, BZ - 0.5, 9); S.flash = 0.7; sfx('holy'); tw(boss, { alpha: 0 }, 1300, 'in'); await wait(1200); boss.hide = true;
  // the map in the leader's hand goes dark, all of it at once
  const map = showPic(picture('map', { inked: [1, 2, 3, 4] }), { s: 1.12 }); const blots = [5, 1, 2, 3, 4].map((id) => ({ x: MAP_AT[id][0], y: MAP_AT[id][1], r: id === 5 ? 0 : 60, seed: id })); map.blots.push(...blots); await wait(500); sfx('fire'); shake(10);
  run(1700, (k) => { blots.forEach((b) => { b.r = 60 + k * 340; }); shake(5); }, 'in'); await wait(1700); S.flash = 0.6; hidePic(); all(B.all, (a) => { a.pose = 'sad'; });
  // and he is there, out on the bridge of light, where there was no one
  cut(look([pathX(30), 1.4, 30], { d: 22, h: 2.6, f: 1150, sy: H * 0.52 })); tw(orrin, { alpha: 1 }, 900); walkTo(orrin, pathX(24), 24, 2600, 'out'); drift(2600, 1.2); await wait(1400);
  await tell(B.two, '5C.3', { pose: 'sad' });
  await tell(orrin, '5C.4', { pose: 'smile' });
  await tell(orrin, '5C.5', { pose: 'shut', keep: true, d: 3.6 });
  cut(look([pathX(26), 1.4, 26], { d: 18, h: 2.4, f: 1100, sy: H * 0.52 })); orrin.pose = null; walkTo(orrin, pathX(40), 40, 2600, 'in'); tw(S, { dim: 0.55 }, 2400, 'in'); tw(orrin, { dark: 1 }, 1900, 'in'); sfx('portal'); await wait(1700);
  cut(closeOn(B.hero, { d: 3.6 })); B.hero.pose = 'startled'; S.lines = 0.7; run(1300, () => shake(9)); await say(B.hero, L('5C.6'), 1600, 'shout'); S.lines = 0; await close(900);
}

// ───── 6 · Abyssal Citadel ─────
async function s6A(P) {
  newScene(6); S.dim = 0.15; const B = band(P, 0);
  await open(look([pathX(6), 1.2, 6], { d: 12, h: 4.4, f: 800, sy: H * 0.62 })); tw(S.cam, look([pathX(12), 1.2, 12], { d: 9, h: 2.2, f: 900, sy: H * 0.6 }), 4800, 'io'); march(B, 12, 5000, 'lin'); await wait(900);
  sfx('shadow'); await say(null, L('6A.1')); await wait(300); all(B.all, (a) => { a.anim = 'idle'; });
  // the map: every realm inked over but the one under their feet
  const map = showPic(picture('map', { inked: [1, 2, 3, 4, 5] }), { s: 1.3, x: clamp(MAP_AT[6][0] - 640, -190, 190), y: clamp(MAP_AT[6][1] - 360, -110, 110) }); S.flash = 0.2; tw(map, { s: 1.5 }, 2400, 'lin'); await wait(1800); hidePic();
  await tell(B.two, '6A.2', { pose: 'sad' });
  cut(look([B.hero.x, 1.3, B.hero.z], { d: 7, dir: -1, h: 1.6, f: 1000, sy: H * 0.56 })); drift(3000, 0.4); await say(null, L('6A.3')); all(B.rest, (a) => { emote(a, 'sweat', 800); });
  await tell(B.hero, '6A.4', { pose: 'stern', ms: 1700 }); all(B.all, (a) => { a.pose = 'ready'; }); await wait(400); await close();
}
async function s6B(P) {
  newScene(6); S.dim = 0.1; const TZ = 19, HZ = 11, tx = pathX(TZ), B = band(P, 3); S.clear.push({ x: tx, z: TZ, r: 8 }); S.rings.push({ x: tx, z: TZ, r: 6.5, col: '#42262c' }, { x: tx, z: TZ, r: 4.6, col: '#5a1a28' });
  thing('throne', { x: tx, z: TZ + 0.8, h: 4.6 }); const orrin = npc('orrin', { x: tx, z: TZ, fz: -1, lean: -1 }), lord = actor(castMon('abyssal_overlord'), { x: tx, z: TZ, fz: -1, lean: -1, alpha: 0, dark: 1 });
  await open(look([tx, 1.6, TZ], { d: 15, h: 3.4, f: 840, sy: H * 0.56 })); tw(S.cam, look([tx, 1.6, TZ], { d: 12, h: 2.2, f: 900, sy: H * 0.56 }), 2800, 'io'); await march(B, HZ, 2800); all(B.all, (a) => { a.pose = 'ready'; });
  // he unwinds the cloth. There is no hand under it
  cut(closeOn(orrin, { d: 4.2 })); orrin.pose = 'give'; drift(5200, 0.5); await wait(900); S.flash = 0.5; sfx('shadow'); shake(6); Object.assign(orrin, castNpc('orrin_bare'), { pose: 'give' }); await wait(700); await say(orrin, L('6B.1'));
  all(B.all, (a) => { a.pose = 'sad'; }); await tell(B.two, '6B.2', { pose: 'sad', ms: 1900 });
  await tell(orrin, '6B.3', { pose: 'shut', keep: true });
  await tell(B.hero, '6B.4', { pose: 'point' }); all(B.all, (a) => { a.pose = 'ready'; });
  // and what the old man was is taken off like the cloth
  cut(look([tx, 2.2, TZ], { d: 9.5, h: 1.4, f: 880, sy: H * 0.5 })); sfx('portal'); tw(S, { dim: 0.6 }, 1200, 'in'); run(1500, () => shake(9)); tw(S.cam, { hy: S.cam.hy + 110 }, 1500, 'io'); tw(orrin, { dark: 1 }, 900, 'in'); await wait(1100);
  orrin.hide = true; lord.alpha = 1; S.flash = 1; shake(24); sfx('explosion'); freeze(140); dirt(tx, TZ - 1, 60, 1.8); tw(S, { dim: 0.1 }, 600); await tw(lord, { dark: 0 }, 700, 'out');
  lord.anim = 'cast'; lord.once = 0; cut(look([tx, lord.size * 0.5, TZ], { d: 6.6, h: 0.6, f: 430, sy: H * 0.66, sx: W * 0.46 })); drift(4200, 0.4); S.lines = 0.8; run(900, () => shake(11)); await say(lord, L('6B.5'), undefined, 'shout'); S.lines = 0;
  nameSlip('abyssal_overlord', 6); await wait(2300); await close();
}
async function s6C(P) {
  newScene(6); S.dim = 0.1; const TZ = 15, tx = pathX(TZ), B = band(P, 10); S.clear.push({ x: tx, z: TZ, r: 8 }); S.rings.push({ x: tx, z: TZ, r: 6.5, col: '#42262c' });
  const lord = actor(castMon('abyssal_overlord'), { x: tx, z: TZ, fz: -1, lean: -1, anim: 'hurt', still: true }), orrin = npc('orrin_bare', { x: tx, z: TZ - 0.6, fz: -1, lean: -1, pose: 'down', hide: true });
  await open(look([tx, 2.4, TZ], { d: 11, h: 2.2, f: 880, sy: H * 0.52 })); await wait(700); tw(lord, { dark: 0.9 }, 800, 'in'); shake(10); sfx('death'); await wait(800); S.flash = 0.8; lord.hide = true; orrin.hide = false; dirt(tx, TZ, 30, 1); await wait(600);
  const lying = (m = {}) => look([tx - 0.4, 0.5, TZ - 0.6], { d: 3.6, dir: 1, h: 0.9, f: 1200, sy: H * 0.62, ...m });
  cut(lying()); drift(3000, 0.3); await say(orrin, L('6C.1'));
  all(B.all, (a) => face(a, orrin)); await walkTo(B.hero, tx - 1.3, TZ - 2.4, 900); B.hero.pose = 'kneel'; await tell(B.hero, '6C.2', { pose: 'kneel', keep: true, ms: 1500 });
  cut(lying({ d: 3.2 })); drift(7400, 0.4); await say(orrin, L('6C.3'));
  startle([B.two], 0.2); await tell(B.two, '6C.4', { pose: 'startled', ms: 1700 });
  cut(lying({ d: 4.2, sx: W * 0.56 })); drift(6800, 0.4); orrin.pose = 'down'; await say(orrin, L('6C.5')); // (the true map, held up to them)
  cut(lying({ d: 2.9 })); drift(3200, 0.2); await say(orrin, L('6C.6'), 2800); await wait(500);
  // he goes, and what he kept comes back out of him: five lights, one for each realm
  cut(look([tx, 2.4, TZ], { d: 12, h: 2.2, f: 880, sy: H * 0.58 })); tw(orrin, { alpha: 0 }, 1500, 'in'); all(B.all, (a) => { a.pose = 'sad'; }); await wait(900);
  const cols = [['#d8ffd0', '#56c06a'], ['#fff0c0', '#e0a040'], ['#e8f8ff', '#6fc0ff'], ['#e8d8ff', '#8a6ad0'], ['#ffffff', '#ffe080']], orbs = cols.map((c) => ({ x: tx, y: 0.6, z: TZ - 0.6, r: 0.12, c })); S.orbs.push(...orbs); sfx('holy');
  tw(S.cam, { hy: S.cam.hy + 150 }, 2400, 'io'); await Promise.all(orbs.map((o, i) => tw(o, { x: tx + (i - 2) * 5, y: 9 + (i % 2) * 2.5, z: TZ + 8 + i, r: 0.5 }, 2200 + i * 120, 'out'))); S.flash = 1; sfx('levelup'); S.orbs.length = 0; tw(S, { dim: 0 }, 400); all(B.all, (a) => { a.pose = 'startled'; });
  // the sheet he gave them: the realms are back on it, and five more that were never spilled ink
  const map = showPic(picture('map', { all: true }), { s: 1.5, x: -150, y: 60 }); await tw(map, { s: 1.0, x: 0, y: 0 }, 3800, 'io'); await wait(1200); await close(900);
}

// ───── 7–10 · the notes in the margin of his map ─────
// The map again, close on the realm ahead, and his hand writing beside it.
async function note(stage, keys, o = {}) {
  newScene(stage); S.bars = 1; const [mx, my] = MAP_AT[stage], pic = showPic(picture('map', { all: true }), { s: 1.0 }), left = mx > 700, px = clamp(mx - 640 + (left ? -170 : 170), -210, 210), py = clamp(my - 360, -115, 115), nx = 640 + px + (left ? -400 : 30), ny = 360 + py - 150;
  tw(S, { fade: 0 }, 800); await tw(pic, { s: 1.5, x: px, y: py }, 2400, 'io'); sfx('draw');
  let y = ny; for (const k of keys) { const text = L(k), n = { text, x: nx, y, t0: S.now, w: 360, size: 28, bg: true, rot: o.shaky ? -0.05 + Math.random() * 0.04 : -0.03, a: o.shaky ? 0.75 : 1 }; pic.notes.push(n); tw(pic, { s: pic.s + 0.03 }, readMs(text), 'lin'); await wait([...text].length * 46 + 900); y += 37 * Math.max(1, Math.ceil([...text].length / (LATIN.test(text) ? 24 : 19))) + 30; }
  await wait(1500);
}
const LATIN = /^[ -~]+$/; // (a line in English runs longer on the page than one in Thai)
const s7N = async () => { await note(7, ['7N.1', '7N.2']); await close(); };
const s8N = async () => { await note(8, ['8N.1', '8N.2']); await close(); };
const s9N = async () => { await note(9, ['9N.1', '9N.2']); await close(); };
async function s10N(P) {
  await note(10, ['10N.1', '10N.2'], { shaky: true }); await tw(S, { fade: 1 }, 450); hidePic();
  // the ones reading it
  const B = band(P, 8); B.hero.pose = 'give'; cut(look([B.hero.x + 0.4, 1.25, 8], { d: 5.6, dir: -1, h: 1.2, f: 1150, sy: H * 0.56 })); tw(S, { fade: 0 }, 500); drift(2400, 0.3); await wait(700);
  await tell(B.two, '10N.3', { pose: 'sad', ms: 2000, dir: -1 });
  await tell(B.hero, '10N.4', { pose: 'smile', dir: -1 }); await wait(300); await close();
}
const s7B = (P) => bossScene(P, { set: 7, id: 'sporemother', how: 'grow', open: 'peek', end: 'push', async lines(B, boss, sh) {
  // they speak first, and not to it: what the old man wrote in the margin did not cover this
  await tell(B.two, '7B.0', { pose: 'point' }); await tell(B.hero, '7B.0b', { pose: 'sad', ...(B.solo ? { d: 3.5 } : {}) });
  // past their shoulders: it is in no hurry, and it does not wait for an answer
  cut(sh.over()); drift(4200, 1.4); await say(boss, L('7B.1'));
  // it leans toward them, and the air between fills with what it sheds
  boss.anim = 'cast'; boss.once = 0; cut(sh.low({ d: Math.min(boss.size * 2.5, 11) })); tw(S.cam, sh.low({ d: boss.size * 1.6 }), 2800, 'in'); sfx('poison');
  const sp = Array.from({ length: 14 }, (_, i) => ({ x: boss.x + (i - 6.5) * 0.5, y: 1 + (i % 5) * 0.6, z: boss.z - 1, r: 0.07, c: ['#e8fff8', '#80ffd0'] })); S.orbs.push(...sp); sp.forEach((q, i) => tw(q, { z: boss.z - 8 - (i % 3), x: q.x + (i - 6.5) * 0.4, r: 0.2 }, 2700, 'in'));
  await say(boss, L('7B.3')); S.orbs.length = 0; boss.anim = 'idle';
  // the last word is theirs, and it is said quietly
  emote(B.two, '…', 900); await tell(B.two, '7B.2', { pose: 'sad', ms: 1900 });
} });
const s8B = (P) => bossScene(P, { set: 8, id: 'iron_regent', how: 'drop', open: 'top', async lines(B, boss, sh) {
  // from overhead, as it sees them: things in a street, to be sorted
  cut(sh.top()); drift(3200, 0.5); await say(boss, L('8B.1'));
  // past its cog: the one who asks
  cut(sh.past()); drift(2800, 0.5); B.hero.pose = 'point'; await say(B.hero, L('8B.2')); B.hero.pose = null;
  // its answer comes in three hard steps closer
  { const text = L('8B.3'), ms = readMs(text), p = quiet(say(boss, text, ms)); for (const k of [2.7, 2.1, 1.6]) { cut(sh.low({ d: boss.size * k })); S.flash = 0.22; sfx('click'); await wait(ms / 3); } await p; }
  if (!B.solo) await tell(B.two, '8B.4', { pose: 'smile', ms: 1900 }); else { emote(B.hero, 'sweat', 800); await tell(B.hero, '8B.4', { pose: 'smile', ms: 1900 }); }
} });
const s9B = (P) => bossScene(P, { set: 9, id: 'leviathan', how: 'surface', open: 'front', end: 'push', side: 7, async lines(B, boss, sh) {
  // it does not strike. From the causeway where they stand, looking up at it: a long look, and nothing said
  cut(sh.up()); drift(2400, 0.5); all(B.all, (a) => { a.pose = 'ready'; }); await wait(2000);
  // from over its crest: a strip of sand, and small figures on it. One of them sees what it is looking at
  cut(sh.past({ h: boss.size * 0.85 })); drift(3200, 0.5); B.two.pose = 'point'; await say(B.two, L('9B.0')); B.two.pose = 'ready';
  cut(sh.up()); drift(3200, 0.6); await say(boss, L('9B.1'));
  // it comes down to the water to say the rest, and the wave goes over the causeway
  boss.anim = 'cast'; boss.once = 0; cut(sh.low({ d: boss.size * 1.75 })); drift(4000, 0.6); dirt(boss.x, boss.z - 1, 60, 1.8, SPRAY); shake(16); sfx('wind'); all(B.all, (a) => { hop(a, 0.4, 300); dirt(a.x, a.z, 10, 0.8, SPRAY); }); await say(boss, L('9B.3')); boss.anim = 'idle';
} });
const s10B = (P) => bossScene(P, { set: 10, id: 'pyrelord', how: 'erupt', open: 'lair', end: 'behind', async lines(B, boss, sh) {
  // the leader puts the weapon down and tries words first
  calm(B.all); await tell(B.hero, '10B.0', { pose: 'halt' });
  // from far off: a black shape against its own fire. It has not listened
  cut(sh.wide({ d: 18, h: 1.4, sy: H * 0.6 })); boss.dark = 0.85; drift(4400, 1.8); await say(boss, L('10B.1')); tw(boss, { dark: 0 }, 500);
  await tell(B.two, '10B.2', { pose: 'point' });
  boss.anim = 'cast'; boss.once = 0; cut(sh.low({ d: boss.size * 1.75 })); S.flash = 0.5; S.lines = 0.7; run(1000, () => shake(10)); drift(3200, 0.7); await say(boss, L('10B.3'), undefined, 'shout'); S.lines = 0; boss.anim = 'idle';
} });

// ───── 11 · The Sundered Throne ─────
function throneRoom(P, hz) { newScene(11); const AZ = 22; S.plats.push({ x: 0, z: 14, r: 15, col: '#e4e0f6', side: '#b0a8d8' }, { x: 0, z: 14, r: 9, col: '#f4f2ff', t: 0.01 }); S.clear.push({ x: 0, z: 14, r: 16 });
  return { AZ, B: band(P, hz), aeon: actor(castMon('the_unmaker'), { x: 0.4, z: AZ, fz: 1, lean: 1 }), desk: thing('desk', { x: 0.4, z: AZ + 1.5, h: 3.4 }) }; }
async function s11A(P) {
  const { AZ, B, aeon } = throneRoom(P, 2);
  await open(look([0, 2, 14], { d: 20, h: 7, f: 760, sy: H * 0.6 }), 1200); tw(S.cam, look([0, 2, 16], { d: 14, h: 3, f: 860, sy: H * 0.56 }), 5200, 'io'); march(B, 9, 5200, 'lin'); await wait(5300);
  // the one at the desk does not turn. A page drifts past, and it is blank
  cut(look([aeon.x, 2.4, AZ], { d: 8, h: 1.8, f: 950, sy: H * 0.52 })); drift(3000, 0.8); sfx('holy'); await wait(2800);
  // the map in the leader's hand: its edges are going
  const map = showPic(picture('map', { all: true }), { s: 1.12 }), white = [[40, 60], [1240, 80], [60, 660], [1230, 650], [640, 20]].map(([x, y], i) => ({ x, y, r: 0, seed: i + 2, col: '#f6f3ff', a: 1 })); map.blots.push(...white); S.flash = 0.3;
  await Promise.all(white.map((b, i) => tw(b, { r: 150 + i * 14 }, 2600, 'in'))); await wait(400); hidePic();
  cut(closeOn(B.hero, { d: 3.8 })); B.hero.pose = 'startled'; emote(B.hero, '!', 700); drift(1800, 0.3); await wait(800); B.hero.pose = 'ready'; all(B.rest, (a) => { a.pose = 'ready'; }); await wait(1000); await close(900); // (the hand closes on the map)
}
async function s11B(P) {
  const { AZ, B, aeon } = throneRoom(P, 10); aeon.fz = -1; aeon.lean = -1; const page = thing('sheet', { x: aeon.x - 2.6, y: 2.2, z: AZ - 0.6, h: 2.6 }); run(60000, () => { page.y = 2.2 + Math.sin(S.now / 700) * 0.18; }); all(B.all, (a) => { a.pose = 'ready'; });
  const low = (m = {}) => look([aeon.x - 0.8, aeon.size * 0.5, AZ], { d: 9.4, h: 0.7, f: 540, sy: H * 0.64, ...m });
  await open(look([0, 2, 16], { d: 14, h: 3, f: 860, sy: H * 0.56 })); drift(1500, 0.6); await wait(1100);
  aeon.anim = 'cast'; aeon.once = 0; cut(low()); drift(4600, 0.6); await say(aeon, L('11B.1')); aeon.anim = 'idle';
  // one line is rubbed off the page, and one of them is not there for a moment
  const gone = B.third || B.hero; cut(look([B.hero.x + 0.2, 1.3, B.hero.z], { d: 6.4, dir: -1, h: 1.4, f: 1050, sy: H * 0.56 })); await wait(300); S.flash = 0.6; sfx('zap');
  for (let i = 0; i < 4; i++) { gone.alpha = B.third ? 0 : 0.25; gone.noShadow = true; await wait(170); gone.alpha = 1; gone.noShadow = false; await wait(120); } startle(B.all, 0.3); await wait(600); calm(B.all);
  await tell(B.two, '11B.2', { pose: 'stern' });
  cut(low({ f: 600 })); drift(4000, 0.5); await say(aeon, L('11B.3'));
  await tell(B.hero, '11B.4', { pose: 'give', d: 4 }); all(B.rest, (a) => { a.pose = 'ready'; hop(a, 0.3, 260); });
  cut(look([0, 2, 16], { d: 13, h: 3, f: 860, sy: H * 0.58 })); act(aeon, 'cast'); aeon.once = 0; S.flash = 0.7; shake(14); sfx('boss'); drift(2600, 1); await wait(350); nameSlip('the_unmaker', 11); await wait(2300); await close();
}
async function s11C(P) {
  const { AZ, B, aeon } = throneRoom(P, 12); aeon.fz = -1; aeon.lean = -1; aeon.z = AZ - 3; aeon.pose = 'kneel'; const page = thing('sheet', { x: aeon.x - 2.4, y: 0.05, z: AZ - 5.4, h: 2.2 });
  await open(look([0, 1.6, 16], { d: 12, h: 2.6, f: 880, sy: H * 0.56 })); drift(1600, 0.5); await wait(1100);
  cut(closeOn(aeon, { d: 5.2, f: 1050, sy: H * 0.64 })); drift(4200, 0.4); aeon.pose = 'sad'; await say(aeon, L('11C.1'));
  await tell(B.hero, '11C.2', { pose: 'stern' });
  // the pen drops from its hand. The leader picks it up
  cut(look([aeon.x - 1.2, 1, AZ - 3.6], { d: 5.2, h: 1.5, f: 760, sy: H * 0.58 })); const pen = { x: aeon.x - 0.9, y: 1.9, z: aeon.z - 0.2, r: 0.07, c: ['#fff6c0', '#ffc040'] }; S.orbs.push(pen); aeon.pose = 'kneel'; await tw(pen, { y: 0.15, x: aeon.x - 1.6, z: aeon.z - 1.4 }, 700, 'in'); sfx('coin'); await wait(500); tw(aeon, { alpha: 0 }, 2200, 'in');
  await walkTo(B.hero, pen.x + 0.5, pen.z - 0.8, 1500); B.hero.pose = 'give'; await tw(pen, { x: B.hero.x + 0.4, y: 1.3, z: B.hero.z + 0.2 }, 500, 'out'); await wait(500);
  if (!B.solo) { emote(B.two, 'sweat', 900); await tell(B.two, '11C.3', { pose: 'smile' }); } else { emote(B.hero, 'sweat', 900); await tell(B.hero, '11C.3', { pose: 'smile' }); }
  face(B.hero, page); S.orbs.length = 0; await tell(B.hero, '11C.4', { pose: 'write', keep: true, dir: -1 }); void page;
  // his map, laid on the blank page, and the first line drawn across it
  const map = showPic(picture('map', { all: true }), { s: 1.5, x: 330, y: 40 }); S.flash = 0.4; sfx('draw'); tw(map, { s: 1.0, x: 0, y: 0 }, 5200, 'io');
  map.strokes.push({ pts: [[1120, 370], [1150, 330], [1190, 300], [1215, 250], [1200, 200], [1230, 150], [1250, 96]], t0: S.now + 500, ms: 2600, col: '#d9482f', w: 8 }); await wait(1900); // (from the last realm on the sheet, out toward its edge: somewhere that is not there yet)
  await caption(L('11C.5'), 4200); S.flash = 0.2; await tw(S, { flash: 1.4 }, 900, 'in'); S.fade = 1; S.flash = 0; await wait(200);
}
async function s11D() {
  newScene(1); S.wash = 0.6; const z = 14.6, x = pathX(z) + 2.2; S.clear.push({ x: x + 2, z: z + 1, r: 5 });
  thing('cart', { x: x + 2.6, z: z + 1.4, h: 3.3, o: { cloth: true } }); thing('camp', { x: x - 0.6, z: z - 0.2, h: 1.9 });
  await open(look([x + 1, 1.1, z], { d: 11, h: 2.6, f: 860, sy: H * 0.6 }), 1400); tw(S.cam, look([x + 1.4, 1.0, z], { d: 6.2, h: 1.5, f: 980, sy: H * 0.6 }), 7200, 'io'); await wait(1500);
  tw(S, { wash: 0 }, 3600, 'io'); await wait(1200); sfx('heal'); await wait(4700); await close(1500); // (the colour comes back into the forest, and with it the birds)
}

// id → the scene, and the realm it belongs to (for the "Story" page). The order here is the order of the story.
export const SCENES = {
  '0': s0, '1A': s1A, '1B': s1B, '1C': s1C, '2A': s2A, '2B': s2B, '2C': s2C, '3A': s3A, '3B': s3B, '3C': s3C, '4A': s4A, '4B': s4B, '4C': s4C, '5B': s5B, '5C': s5C, '6A': s6A, '6B': s6B, '6C': s6C,
  '7N': s7N, '7B': s7B, '8N': s8N, '8B': s8B, '9N': s9N, '9B': s9B, '10N': s10N, '10B': s10B, '11A': s11A, '11B': s11B, '11C': s11C, '11D': s11D,
};
