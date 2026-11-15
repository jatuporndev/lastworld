// A boss's entrance: a short scene played on the board before an MVP fight. Black bars close in, the camera
// leaves the heroes for the empty place where the boss will stand, the boss arrives in its own way (out of the
// ground, out of the sky, out of nothing), its guards appear, it roars, and its name is struck across the screen.
// It cannot be skipped: in co-op every player watches the same scene for the same length of time. Alone, a boss
// met before makes a shorter entrance. Nothing here touches the battle's
// logic: units are only hidden, moved and scaled on screen, and put back exactly where they were.
import * as THREE from 'three';
import * as Hex from '../engine/hex.js';
import { h, tween, Ease, sleep } from '../core/util.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { elColor } from '../engine/renderer.js';
import { fxSprite, fxDecal, fxBit, poofFx } from '../engine/vfx.js';
import { ui } from './components.js';

// How each boss arrives; a boss not listed arrives by the shape of its body.
const ENTRANCE = {
  forest_guardian: 'rise', sand_tyrant: 'rise', frost_queen: 'descend', lich_king: 'appear', celestial_dragon: 'dive', abyssal_overlord: 'appear',
  sporemother: 'rise', iron_regent: 'drop', leviathan: 'rise', pyrelord: 'rise', the_unmaker: 'descend',
};
const BY_BODY = { dragon: 'dive', bird: 'dive', bat: 'dive', serpent: 'rise', treant: 'rise', shroom: 'rise', golem: 'drop', beast: 'drop' };
// What flies about as it arrives, and what is heard.
const DEBRIS = { fire: 'flame', ice: 'shard', wind: 'swirl', earth: 'rock', holy: 'spark', shadow: 'smoke', poison: 'bubble', neutral: 'rock' };
const EL_SFX = { fire: 'fire', ice: 'ice', wind: 'wind', earth: 'earth', holy: 'holy', shadow: 'shadow', poison: 'poison', neutral: 'earth' };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const R = (a = 1) => (Math.random() - 0.5) * a;
const graphemes = (s) => (typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter().segment(s)].map((x) => x.segment) : Array.from(s));

export async function bossIntro(scene, boss) {
  const w = scene.world, b = scene.battle; const U = w.units.get(boss.uid); if (!U) return;
  const color = elColor(boss.el); const sea = !!w.afloat; // on open water nothing cracks: the sea parts in rings and throws spray
  const debris = sea ? 'bubble' : DEBRIS[boss.el] || 'rock';
  const style = ENTRANCE[boss.monsterId] || BY_BODY[boss.look?.body || boss.def?.look?.body] || 'appear';
  // Alone, a boss already met is quicker about it; in co-op the scene is always the full one, so all players stay together.
  const seenKey = 'lw.bossSeen.' + boss.monsterId; let seen = false;
  try { seen = !!localStorage.getItem(seenKey); localStorage.setItem(seenKey, '1'); } catch (e) { /* storage may be off: play the full scene */ }
  if (scene.coop) seen = false;
  const q = seen ? 0.55 : 1; // how long the quiet beats last

  const wait = sleep; const tw = tween; const fx = (fn) => fn();
  const cam = (to, ms) => { const c = w.cam; const f = { x: c.target.x, z: c.target.z, size: c.size };
    return tw(ms, (e) => { c.target.x = f.x + (to.x - f.x) * e; c.target.z = f.z + (to.z - f.z) * e; c.size = f.size + (to.size - f.size) * e; }, Ease.inOutQuad); };

  const guards = b.units.filter((u) => u.side === 'enemy' && u !== boss && u.alive).map((u) => w.units.get(u.uid)).filter(Boolean);
  const heroes = b.units.filter((u) => u.side === 'hero' && u.alive);
  const home = U.group.position.clone(); const S = U.size; const shS = U.shadow.scale.x; const shY = U.shadow.position.y;
  const feet = home.clone(); const chest = home.clone().add(V(0, 1.1 * U.scale, 0));

  // the stage is set: no HUD, no labels, the boss and its guards not yet there
  const labels = document.getElementById('labels');
  scene.hud.style.visibility = 'hidden'; labels.style.visibility = 'hidden';
  U.group.visible = false; guards.forEach((g) => { g.group.visible = false; });
  const card = h('div.cine-card', { style: { '--el': '#' + new THREE.Color(color).getHexString() } },
    h('div.cine-rank', t('MVP Boss') + ' · ' + scene.stage.name), h('div.cine-name', boss.name), h('div.cine-stroke'), h('div.cine-quote'));
  const veil = h('div.cine', h('div.cine-bar.top'), h('div.cine-bar.bottom'), card); // also keeps taps off the board while the scene plays
  ui().appendChild(veil);
  const onKey = (e) => { e.stopPropagation(); e.preventDefault(); }; window.addEventListener('keydown', onKey, true); // no hotkeys during the scene
  const c0 = { minWidth: w.cam.minWidth, zoom: w.cam.zoom }; w.cam.minWidth = 0;

  // ── how it arrives ──
  const show = () => { U.group.visible = true; };
  const scatter = (n, speed, up) => { for (let i = 0; i < n; i++) fxBit(w, debris, feet.clone().add(V(R(1.6) * U.scale, 0.2, R(1.2) * U.scale)), { color, size: 0.22 + Math.random() * 0.2, life: 700 + Math.random() * 500, vel: V(R(speed), up * (0.6 + Math.random()), R(speed)), gravity: 9, spin: R(8) }); };
  // what it leaves where it stands: broken ground, or widening rings on water
  const scar = (from, to, ms) => (sea ? [0, 260, 520].forEach((d) => setTimeout(() => fxDecal(w, 'shock', feet, { color: 0xdff4ff, size: from * U.scale, to: (to + 1.2) * U.scale, ms: 900, opacity: 0.6 }), d))
    : fxDecal(w, 'crack', feet, { color: 0x1a1210, size: from * U.scale, to: to * U.scale, ms, hold: 0.72, opacity: 0.78 }));
  const land = (hard = 1) => fx(() => {
    w.shake(0.6 * hard, 520); audio.sfx(hard >= 1 ? 'explosion' : 'smash');
    fxDecal(w, 'shock', feet, { color: 0xffffff, size: 1.2 * U.scale, to: 4.4 * U.scale, ms: 480, opacity: 0.85 });
    scar(2.2, 2.6, 2600);
    w.burst(chest, { color, count: 26, speed: 5.5, size: 0.4 }); scatter(16, 5, 6);
  });
  const enter = {
    // out of the ground: it shakes its way up from nothing
    async rise() {
      fx(() => { audio.sfx(EL_SFX[boss.el] || 'earth'); scar(0.8, 2.4, 3000); });
      U.sprite.scale.set(S, 0.001, 1); U.shadow.scale.setScalar(0.001); show(); let acc = 0;
      await tw(1150, (e, k) => {
        U.sprite.scale.set(S * (1 + Math.sin(k * 46) * 0.035 * (1 - k)), Math.max(0.001, S * e), 1); U.shadow.scale.setScalar(Math.max(0.001, shS * e));
        if (k * 14 > acc) { acc++; scatter(3, 3, 5); w.shake(0.14, 160); }
      }, Ease.outCubic);
      U.sprite.scale.set(S, S, 1); land(0.8);
    },
    // out of the sky, feet first
    async drop() {
      const H = 17; show(); U.group.position.y = home.y + H; U.shadow.position.y = shY - H; U.shadow.scale.setScalar(shS * 0.3);
      fx(() => audio.sfx('wind'));
      await tw(430, (e) => { const y = H * (1 - e); U.group.position.y = home.y + y; U.shadow.position.y = shY - y; U.shadow.scale.setScalar(shS * (0.3 + 0.7 * e)); }, Ease.inQuad);
      U.group.position.copy(home); U.shadow.position.y = shY; land(1.25);
      await tw(260, (e) => { const a = 0.22 * (1 - e); U.sprite.scale.set(S * (1 + a), S * (1 - a), 1); }, Ease.outBack); // it sinks into the blow
    },
    // down a shaft of light, slowly
    async descend() {
      const H = 6; show(); U.mat.opacity = 0; U.group.position.y = home.y + H; U.shadow.position.y = shY - H; let acc = 0;
      fx(() => { audio.sfx(EL_SFX[boss.el] || 'holy'); fxSprite(w, 'pillar', feet.clone().add(V(0, 4.5, 0)), { add: true, color, size: 1.6 * U.scale, to: 2.2 * U.scale, sy: 6, ms: 1700, hold: 0.6, opacity: 0.8 }); fxDecal(w, 'circle', feet, { color, size: 1 * U.scale, to: 2.6 * U.scale, ms: 1700, spin: 2.5, hold: 0.6 }); });
      await tw(1350, (e, k) => {
        const y = H * (1 - e); U.group.position.y = home.y + y; U.shadow.position.y = shY - y; U.mat.opacity = Math.min(1, k * 2.5); U.shadow.scale.setScalar(shS * (0.4 + 0.6 * e));
        if (k * 12 > acc) { acc++; fxBit(w, debris, chest.clone().add(V(R(2.4) * U.scale, y + R(2), R(1))), { color, size: 0.2, life: 900, vel: V(R(0.6), -1.6, R(0.6)), gravity: 0, spin: R(5) }); }
      }, Ease.outCubic);
      U.group.position.copy(home); U.shadow.position.y = shY; U.mat.opacity = 1;
      fx(() => { w.shake(0.25, 300); fxDecal(w, 'shock', feet, { color, size: 1 * U.scale, to: 3.6 * U.scale, ms: 520, opacity: 0.8 }); w.burst(chest, { color, count: 18, speed: 3.5 }); });
    },
    // out of nothing: the dark gathers, and it is there
    async appear() {
      show(); U.mat.opacity = 0; U.shadow.scale.setScalar(0.001); let acc = 0;
      fx(() => { audio.sfx('portal'); fxDecal(w, 'swirl', feet, { color, size: 3 * U.scale, to: 0.9 * U.scale, ms: 1250, spin: -9, hold: 0.7, opacity: 0.9, ease: Ease.inQuad }); });
      await tw(1150, (e, k) => { // everything is drawn in to one place
        if (k * 16 > acc) { acc++; const a = Math.random() * 6.28, d = (3.2 - 2.4 * k) * U.scale; const from = chest.clone().add(V(Math.cos(a) * d, R(2.2), Math.sin(a) * d * 0.6)); fxBit(w, debris, from, { color, size: 0.3, life: 420, vel: chest.clone().sub(from).multiplyScalar(2.2), gravity: 0, drag: 1, spin: R(6) }); }
        U.mat.opacity = Math.max(0, (k - 0.55) / 0.45) * 0.9; U.sprite.scale.set(S * (1.3 - 0.3 * e), S * (1.3 - 0.3 * e), 1); U.shadow.scale.setScalar(Math.max(0.001, shS * e));
      }, Ease.inQuad);
      U.mat.opacity = 1; U.sprite.scale.set(S, S, 1);
      fx(() => { audio.sfx(EL_SFX[boss.el] || 'shadow'); w.shake(0.4, 380); fxSprite(w, 'spark', chest, { add: true, color: 0xffffff, size: 1 * U.scale, to: 3.4 * U.scale, ms: 320 }); fxDecal(w, 'shock', feet, { color, size: 1 * U.scale, to: 4 * U.scale, ms: 520, opacity: 0.8 }); w.burst(chest, { color, count: 24, speed: 5 }); });
    },
    // across the sky and down
    async dive() {
      const from = home.clone().add(V(-13, 10, -5)); const over = home.clone().add(V(-2.5, 6.5, -1)); show(); U.shadow.scale.setScalar(0.001);
      fx(() => audio.sfx('wind'));
      await tw(720, (e, k) => { // a long swoop in: over the board, then down
        const a = from.clone().lerp(over, k), c = over.clone().lerp(home, k); U.group.position.copy(a.lerp(c, k));
        const y = U.group.position.y - home.y; U.shadow.position.y = shY - y; U.shadow.scale.setScalar(Math.max(0.001, shS * k * k));
        if (Math.random() < 0.5) fxBit(w, 'spark', U.group.position.clone().add(V(R(1), 1.2 * U.scale, R(1))), { color, size: 0.25, life: 380, vel: V(R(1), R(1), R(1)), gravity: 0 });
      }, Ease.inQuad);
      U.group.position.copy(home); U.shadow.position.y = shY; U.shadow.scale.setScalar(shS); land(1.2);
      await tw(260, (e) => { const a = 0.2 * (1 - e); U.sprite.scale.set(S * (1 + a), S * (1 - a), 1); }, Ease.outBack);
    },
  };

  try {
    await sleep(30); veil.classList.add('in'); audio.sfx('boss');
    // 1 · the heroes, who sense it coming
    let hx = 0, hz = 0; heroes.forEach((u) => { const p = w.unitPos(u.uid, 0); hx += p.x; hz += p.z; w.setFacing(u.uid, Hex.directionTo(u, boss)); }); hx /= heroes.length || 1; hz /= heroes.length || 1;
    await cam({ x: hx, z: hz - 0.6, size: 10.5 }, 650 * q); await wait(450 * q);
    // 2 · the empty place: something stirs
    fx(() => { audio.sfx(EL_SFX[boss.el] || 'earth'); w.shake(0.1, 1300 * q); });
    const omen = setInterval(() => fx(() => { fxDecal(w, 'circle', feet, { color, size: 0.6 * U.scale, to: 2.6 * U.scale, ms: 700, opacity: 0.7, spin: 1.5 }); w.rise(feet, { color, count: 5, radius: 1.2 * U.scale, speed: 2.2 }); }), 300);
    await cam({ x: home.x, z: home.z - 1.35 * U.scale, size: 8 + 2.4 * U.scale }, 1150 * q); // framed on where its chest will be await wait(420 * q);
    clearInterval(omen);
    // 3 · it arrives
    await enter[style]();
    await wait(380 * q);
    // 4 · and it has not come alone
    for (const g of guards) { g.group.visible = true; const gs = g.size; poofFx(w, g.group.position.clone().add(V(0, 0.8 * g.scale, 0)), Math.max(1, g.scale * 0.9)); audio.sfx('magic'); tw(240, (e) => g.sprite.scale.set(gs * e, gs * e, 1), Ease.outBack); await wait(150); }
    if (guards.length) await wait(220 * q);
    // 5 · the roar: the camera flinches and so do the heroes
    fx(() => {
      audio.sfx('roar'); w.playOnce(boss.uid, 'cast'); w.shake(0.55, 1000); w.ring(feet, color, 6, 900);
      setTimeout(() => fx(() => { w.ring(feet, 0xffffff, 8, 800); fxDecal(w, 'shock', feet, { color, size: 2 * U.scale, to: 7 * U.scale, ms: 700, opacity: 0.6 }); }), 220);
      heroes.forEach((u, i) => setTimeout(() => fx(() => w.playOnce(u.uid, 'hurt')), 260 + i * 60));
    });
    const c = w.cam; await cam({ x: c.target.x, z: c.target.z, size: c.size * 0.9 }, 220); await wait(650 * q);
    // 6 · its name, and what it has to say
    card.classList.add('show'); audio.sfx('smash'); w.shake(0.2, 200);
    const parts = graphemes(`“${boss.def?.quote || ''}”`); const line = card.querySelector('.cine-quote'); await wait(520);
    for (let i = 1; i <= parts.length; i++) { line.textContent = parts.slice(0, i).join(''); if (i % 3 === 0) audio.sfx('hover'); await wait(seen ? 12 : 26); }
    await wait(1700 * q);
  } finally {
    // put everything back exactly as the fight expects it, however the scene ended
    window.removeEventListener('keydown', onKey, true);
    U.group.visible = true; U.group.position.copy(home); U.sprite.scale.set(S, S, 1); U.mat.opacity = 1; U.shadow.scale.setScalar(shS); U.shadow.position.y = shY;
    guards.forEach((g) => { g.group.visible = true; g.sprite.scale.set(g.size, g.size, 1); });
    heroes.forEach((u) => w.setFacing(u.uid, u.facing));
    card.classList.add('out'); veil.classList.remove('in'); veil.style.pointerEvents = 'none';
    w.cam.zoom = c0.zoom; w.cam.minWidth = c0.minWidth;
    await w.focus(scene.view, 750);
    scene.hud.style.visibility = ''; labels.style.visibility = '';
    setTimeout(() => veil.remove(), 500);
  }
}
