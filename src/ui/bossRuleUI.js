// What the player sees of an MVP's rule (game/bossRules.js). Three layers, most important first:
//   1 · the board shows it: light flows from a root to the boss, the safe shadow behind a pillar is lit, the rot creeps
//   2 · the entrance scene points at it (ruleCaption, used by bossIntro.js)
//   3 · a note at the right edge of the board says where things stand (ruleLine)
// A piece or the boss, when tapped, explains the rule on its slip (ruleTip). Nothing here changes the fight.
import * as THREE from 'three';
import * as Hex from '../engine/hex.js';
import { tween, Ease, sleep } from '../core/util.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { fxDecal, fxSprite, fxBit } from '../engine/vfx.js';
import { driftPlan, rotNext } from '../game/bossRules.js';

const alive = (R) => R.props.filter((p) => p.alive);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const AIR = 1.6; // how high the dragon hangs: its arena puts it at the top of the board, so it rises little and fades instead

// ── 3 · the line ──
export function ruleLine(b) {
  const R = b.rule; if (!R || !R.boss.alive || b.result) return null;
  const u = R.boss; const n = alive(R).length; const k = u.intent?.k;
  switch (R.id) {
    case 'forest_guardian': return n ? t('The roots are healing the Guardian ({n} left)', { n }) : t('The Guardian can no longer heal');
    case 'sand_tyrant': return u.hidden ? t('The Tyrant is under the sand. It will come up where the sand is sinking') : u.status.vulnerable ? t('The Tyrant has lost its footing') : k === 'burrow' ? t('The Tyrant is about to go under the sand') : null;
    case 'frost_queen': return k === 'gather' || k === 'zero' ? t('The Queen is casting Absolute Zero. Only the shadow of a pillar is safe') : n ? t('Ice pillars: {n}. Their shadow is the only shelter from Absolute Zero', { n }) : t('No pillar is left to hide behind');
    case 'lich_king': return n ? t("The Lich King's soul is in the urn") : t('The urn is broken. The Lich King can die');
    case 'celestial_dragon': return u.aloft ? t('The dragon is in the sky. Melee cards cannot reach it (it lands next round)') : k === 'ascend' ? t('The dragon is about to take wing') : null;
    case 'abyssal_overlord': { const d = R.def.demons(b); return n ? t('The gate lets a demon through every round. The Overlord hits harder for each one (+{n})', { n: Math.min(5, d) }) : d ? t('The gate is shut. {n} demon(s) still feed the Overlord', { n: d }) : t('The gate is shut. No more demons will come'); }
    case 'sporemother': return n ? t('The rot spreads every round. Fire burns it away ({n} pods left)', { n }) : t('The pods are gone. The rot has stopped spreading');
    case 'iron_regent': return R.charging ? t('The Regent is charging Overload Core ({n} more damage breaks it)', { n: Math.max(1, Math.ceil(R.need)) }) : k === 'stagger' || u.nextIntent?.k === 'stagger' ? t('The charge is broken. The Regent stands still') : null;
    case 'leviathan': return t('When the round ends, the current pulls everyone {n} hex toward the whirlpool', { n: u.phase === 2 ? 2 : 1 });
    case 'pyrelord': return R.heat >= 5 ? t('The heat is full. The mountain erupts this round') : t('Heat {pips} · the hotter, the harder it hits. Ice cools it', { pips: '●'.repeat(R.heat) + '○'.repeat(5 - R.heat) });
    case 'the_unmaker': { const held = alive(R).filter((e) => e.memory).map((e) => e.memory.name); return !n ? t('The echoes are gone') : held.length ? t('The echoes remember: {cards}', { cards: held.join(', ') }) : t('An echo throws your last attack card back at the party next round'); }
    default: return null;
  }
}

// ── 2 · the line the entrance scene ends on ──
const CAPTION = {
  forest_guardian: 'While the roots stand, the Guardian will not fall.',
  sand_tyrant: 'The sand under your feet is never still.',
  frost_queen: 'My cold reaches everything I can see.',
  lich_king: 'You cannot kill what does not keep its life here.',
  celestial_dragon: 'The sky is mine. You have only the ground.',
  abyssal_overlord: 'The gate is open, and I did not come alone.',
  sporemother: 'Whatever stands still is mine.',
  iron_regent: 'A machine does not miss. It only needs time.',
  leviathan: 'The sea does not ask which way you wish to go.',
  pyrelord: 'The mountain is awake, and hotter with every breath.',
  the_unmaker: 'Everything you do, I remember. And I give it back.',
};
export const ruleCaption = (id) => (CAPTION[id] ? t(CAPTION[id]) : '');

// ── the slip: what this piece is, and what to do about it ──
const TIP = {
  heart_root: 'Feeds the Guardian at the end of every round. Break it to stop the healing.',
  ice_pillar: 'Blocks line of sight. Stand in its shadow when the Queen casts Absolute Zero. It can be broken, by you as well.',
  soul_urn: "Holds the Lich King's soul. While it stands he rises again when killed, and the urn cracks each time.",
  hell_gate: 'Lets one demon through at the end of every round. Break it to shut it.',
  spore_pod: 'Spreads the rot at the end of every round. Break it and the rot around it withers.',
  magma_vent: 'Break it to let the heat out: Heat -2. Another opens three rounds later.',
  aeon_echo: 'Remembers the last attack card its hero played and throws it back next round. A dearer card hits harder.',
};
const BOSS_TIP = {
  forest_guardian: 'Heals at the end of every round for each Heart Root standing.',
  sand_tyrant: 'Goes under the sand for a round: nothing can reach it. It comes up where the sand sinks, then takes more damage for a round.',
  frost_queen: 'Absolute Zero strikes every hex she can see. Hide behind an Ice Pillar.',
  lich_king: 'Rises again when killed while the Soul Urn stands.',
  celestial_dragon: 'Takes wing for a round: melee cards cannot reach it, and stars fall on the marked hexes.',
  abyssal_overlord: 'Deals +1 damage for each demon alive (up to +5).',
  sporemother: 'Ending a turn on rot poisons you. Fire cards burn the rot they touch.',
  iron_regent: 'Charges Overload Core for a round. Enough damage breaks the charge and he loses his next turn.',
  leviathan: 'At the end of every round the current pulls heroes toward the whirlpool, and the whirlpool hurts those beside it.',
  pyrelord: 'Heat rises by 1 every round, and each point adds 8% to its damage. At 5 it erupts. An Ice card on it: Heat -1.',
  the_unmaker: 'Each hero has an Echo. Kill it, or mind which attack card you play last.',
};
export function ruleTip(b, u) {
  const R = b.rule; if (!R) return null;
  if (u === R.boss) return t(BOSS_TIP[R.id]);
  return TIP[u.monsterId] ? t(TIP[u.monsterId]) : null;
}

export function ruleIntentText(u, i, pw) {
  switch (i.k) {
    case 'burrow': return t('{name}: goes under the sand. Nothing can reach it until it comes up.', { name: i.name });
    case 'emerge': return t('{name}: comes up and strikes the marked hexes for {p}.', { name: i.name, p: pw });
    case 'gather': return t('{name}: next round, every hex she can see is struck for {p}. Hide behind a pillar.', { name: i.name, p: pw });
    case 'zero': return t('{name}: every hex she can see is struck for {p}. Hide behind a pillar.', { name: i.name, p: pw });
    case 'ascend': return t('{name}: takes to the sky for a round. Melee cards cannot reach it.', { name: i.name });
    case 'dive': return t('{name}: stars fall on the marked hexes for {p}, and it lands.', { name: i.name, p: pw });
    case 'charge': return t('{name}: charging. Next round it strikes the marked hexes for {p}. Enough damage breaks the charge.', { name: i.name, p: pw });
    case 'overload': return t('{name}: strikes the marked hexes for {p}. Enough damage still breaks it.', { name: i.name, p: pw });
    case 'stagger': return t('{name}: it does nothing this turn.', { name: i.name });
    case 'erupt': return t('{name}: the whole board is struck for {p}.', { name: i.name, p: pw });
    case 'echo': return t('{name}: your own card, thrown back for {p}.', { name: i.name, p: pw });
    case 'idle': return t('{name}: it waits for a card to remember.', { name: i.name });
    default: return i.name;
  }
}

// The same step in a few words, for the small card on the slip (the sentence above is its tooltip).
const NOTE = {
  burrow: 'Goes under the sand', emerge: 'Comes up on the marked hexes', gather: 'Strikes next round. Hide behind a pillar', zero: 'Strikes every hex she can see',
  ascend: 'Takes to the sky', dive: 'Stars fall on the marked hexes', charge: 'Charging. Damage breaks it', overload: 'Strikes the marked hexes',
  stagger: 'Does nothing this turn', erupt: 'Strikes the whole board', echo: 'Your own card, thrown back', idle: 'Waits for a card to remember',
};
export const ruleIntentNote = (i) => (NOTE[i.k] ? t(NOTE[i.k]) : '');

// ── 1 · the board ──
const LINK = { forest_guardian: 0x8aff6a, lich_king: 0x40ffa0, abyssal_overlord: 0xff4a3a };

// Marks that stay on the board while the rule is in force. Called whenever the board may have changed.
export function ruleSync(scene) {
  const b = scene.battle; const R = b.rule; const w = scene.world; if (!R) return;
  const S = (scene.ruleFx ||= { timer: 0, links: [] });
  const set = (name, cells, o) => w.setLayer('rule-' + name, cells, o);
  const over = !!b.result || !R.boss.alive;
  // light that flows from a piece to the boss it serves
  S.links = over ? [] : R.id === 'abyssal_overlord' ? b.enemies().filter((u) => !u.prop && u.rank !== 'mvp').map((u) => [u.uid, R.boss.uid]) : LINK[R.id] ? alive(R).map((p) => [p.uid, R.boss.uid]) : [];
  if (S.links.length && !S.timer) S.timer = setInterval(() => flow(scene), 300);
  if (!S.links.length && S.timer) { clearInterval(S.timer); S.timer = 0; }
  if (over) { ['safe', 'mark', 'rot', 'next', 'eye', 'drift'].forEach((n) => w.clearLayer('rule-' + n)); return; }
  if (R.id === 'frost_queen') {
    const it = R.boss.intent; let safe = [];
    if (it?.sight) { const hit = new Set(it.cells.map((c) => Hex.key(c.q, c.r))); safe = [...b.board.cells.values()].filter((c) => !hit.has(Hex.key(c.q, c.r)) && isFinite(b.terrain(c).cost) && !b.unitAt(c)?.prop && !Hex.hexEq(c, R.boss)); }
    set('safe', safe, { color: 0x7fe8ff, opacity: 0.55, pulse: 2, y: 0.04, order: 4 });
  }
  if (R.id === 'sand_tyrant') set('mark', R.reserved ? [...R.reserved].map(Hex.parseKey) : [], { color: 0x3a2410, opacity: 0.75, pulse: 3, y: 0.035, order: 4 });
  if (R.id === 'sporemother') {
    set('rot', [...R.rot].map(Hex.parseKey), { color: 0x7a2a8a, opacity: 0.5, y: 0.025, order: 2 });
    set('next', rotNext(b, R), { color: 0xb060d0, opacity: 0.3, pulse: 3, y: 0.03, order: 3 });
  }
  if (R.id === 'leviathan') {
    set('eye', [R.eye], { color: 0x0a2a5a, opacity: 0.8, pulse: 2, y: 0.04, order: 4 });
    set('drift', driftPlan(b, R).map((m) => m.to), { color: 0xdff4ff, opacity: 0.35, pulse: 2, y: 0.03, order: 3 });
  }
  // something that keeps turning: the whirlpool, or the sand sinking where the Tyrant will come up
  if (!S.eyeT && (R.id === 'leviathan' || R.id === 'sand_tyrant')) S.eyeT = setInterval(() => {
    if (scene.battle.result || document.hidden) return;
    if (R.id === 'leviathan') fxDecal(w, 'swirl', w.cellPos(R.eye.q, R.eye.r), { color: 0xbfe8ff, size: 2.6, to: 0.8, ms: 1500, spin: -6, opacity: 0.55, ease: Ease.inQuad });
    else if (R.at) fxDecal(w, 'swirl', w.cellPos(R.at.q, R.at.r), { color: 0x4a3018, size: 3.4, to: 1, ms: 1200, spin: -7, opacity: 0.7, ease: Ease.inQuad });
  }, 1200);
}

function flow(scene) {
  const w = scene.world; const S = scene.ruleFx; const R = scene.battle.rule; if (!S || document.hidden) return;
  const color = LINK[R.id] || 0xffffff;
  for (const [a, z] of S.links) {
    if (!w.units.has(a) || !w.units.has(z)) continue;
    const from = w.unitPos(a, 0.9), to = w.unitPos(z, 1.1); const life = 900;
    w.particle(from, { color, size: 0.5, life, vel: to.clone().sub(from).multiplyScalar(1000 / life), gravity: 0, drag: 1 });
  }
}

export function ruleDispose(scene) {
  const S = scene.ruleFx; if (!S) return;
  clearInterval(S.timer); clearInterval(S.eyeT); scene.ruleFx = null;
}

// The moments of a rule, as they happen.
export async function ruleEvent(scene, d) {
  const w = scene.world; const b = scene.battle; const R = b.rule; if (!R) return;
  const pos = (u, up = 1) => w.unitPos(u.uid, up);
  const U = d.unit ? w.units.get(d.unit.uid) : null;
  const note = (u, text, cls = 'note') => w.floatText(pos(u, 2.2), text, cls);
  switch (d.k) {
    case 'feed': { // light runs from every root into the Guardian
      audio.sfx('heal');
      d.from.forEach((r) => { w.ring(pos(r, 0.1), 0x8aff6a, 1.4, 500); w.beam(pos(r, 0.9), pos(d.to, 1.3), 0x6aff4a, 900); });
      await Promise.all(d.from.map((r) => w.projectile(pos(r, 0.9), pos(d.to, 1.3), { color: 0xd8ffb0, ms: 620, arc: 0.3, size: 1.1 })));
      w.ring(pos(d.to, 0.1), 0x8aff6a, 3, 480); w.rise(pos(d.to, 0.3), { color: 0x8aff6a, count: 16, radius: 1.2 }); await sleep(200); break;
    }
    case 'burrow': {
      audio.sfx('earth'); w.shake(0.3, 500); const s = U.size; const feet = pos(d.unit, 0);
      fxDecal(w, 'crack', feet, { color: 0x3a2a16, size: 2 * U.scale, to: 2.6 * U.scale, ms: 1600, hold: 0.6, opacity: 0.7 });
      for (let i = 0; i < 14; i++) fxBit(w, 'rock', feet.clone().add(V((Math.random() - 0.5) * 3, 0.2, (Math.random() - 0.5) * 2)), { color: 0xc09050, size: 0.3, life: 800, vel: V((Math.random() - 0.5) * 4, 4 + Math.random() * 3, (Math.random() - 0.5) * 4), gravity: 9, spin: 5 });
      await tween(520, (e) => U.sprite.scale.set(s, Math.max(0.001, s * (1 - e)), 1), Ease.inQuad);
      U.group.visible = false; U.sprite.scale.set(s, s, 1);
      break;
    }
    case 'emerge': {
      w.placeUnit(d.unit.uid, b.cellsOf(d.unit)); const s = U.size; const feet = pos(d.unit, 0);
      U.sprite.scale.set(s, 0.001, 1); U.group.visible = true; audio.sfx('explosion'); w.shake(0.6, 600);
      fxDecal(w, 'shock', feet, { color: 0xffe0a0, size: 1.2 * U.scale, to: 4.6 * U.scale, ms: 520, opacity: 0.85 });
      for (let i = 0; i < 18; i++) fxBit(w, 'rock', feet.clone().add(V((Math.random() - 0.5) * 3, 0.2, (Math.random() - 0.5) * 2)), { color: 0xc09050, size: 0.32, life: 900, vel: V((Math.random() - 0.5) * 6, 5 + Math.random() * 4, (Math.random() - 0.5) * 6), gravity: 9, spin: 6 });
      await tween(380, (e) => U.sprite.scale.set(s, Math.max(0.001, s * e), 1), Ease.outBack);
      U.sprite.scale.set(s, s, 1);
      break;
    }
    case 'reel': note(d.unit, t('Off balance!'), 'status debuff'); await sleep(260); break;
    case 'gather': { audio.sfx('ice'); w.ring(pos(d.unit, 0.1), 0x9fe8ff, 5, 700); w.rise(pos(d.unit, 0.3), { color: 0x9fe8ff, count: 18, radius: 1.2 }); w.playOnce(d.unit.uid, 'cast'); await sleep(420); break; }
    case 'zeroDone': break;
    case 'reform': { // the soul leaves the urn and he stands again
      audio.sfx('shadow'); w.shake(0.35, 500);
      if (d.urn) await w.projectile(pos(d.urn, 0.9), pos(d.unit, 1.2), { color: 0x40ffa0, ms: 620, arc: 1.2, size: 0.8 });
      w.ring(pos(d.unit, 0.1), 0x40ffa0, 3.4, 600); w.rise(pos(d.unit, 0.2), { color: 0x40ffa0, count: 26, radius: 1 });
      note(d.unit, t('Risen again!'), 'combo'); await sleep(620); break;
    }
    case 'ascend': {
      audio.sfx('wind'); w.playOnce(d.unit.uid, 'cast'); const y0 = U.sprite.position.y; const sh = U.shadow.scale.x; U.air = { y0, sh };
      w.burst(pos(d.unit, 0.3), { color: 0xffffff, count: 20, speed: 4 });
      await tween(620, (e) => { U.sprite.position.y = y0 + AIR * e; U.shadow.scale.setScalar(sh * (1 - 0.45 * e)); U.mat.opacity = 1 - 0.45 * e; }, Ease.outCubic);
      break;
    }
    case 'land': {
      const a = U.air || { y0: 0, sh: U.shadow.scale.x }; U.air = null;
      await tween(300, (e) => { U.sprite.position.y = a.y0 + AIR * (1 - e); U.shadow.scale.setScalar(a.sh * (0.55 + 0.45 * e)); U.mat.opacity = 0.55 + 0.45 * e; }, Ease.inQuad);
      U.sprite.position.y = a.y0; U.shadow.scale.setScalar(a.sh); U.mat.opacity = 1; audio.sfx('smash'); w.shake(0.5, 420);
      fxDecal(w, 'shock', pos(d.unit, 0), { color: 0xffffff, size: 1.2 * U.scale, to: 4.4 * U.scale, ms: 480, opacity: 0.8 });
      break;
    }
    case 'gate': { audio.sfx('portal'); w.ring(pos(d.unit, 0.1), 0xff3a2a, 2.6, 480); w.burst(pos(d.unit, 1), { color: 0xff5a2a, count: 18, speed: 4 }); await sleep(260); break; }
    case 'count': break;
    case 'rot': { audio.sfx('poison'); await w.flashCells(d.cells, 0xb060d0, 420); break; }
    case 'burn': { if (!d.cells.length) break; audio.sfx(d.wither ? 'poison' : 'fire'); await w.flashCells(d.cells, d.wither ? 0xd8ffb0 : 0xff8a2a, 420); break; }
    case 'charge': { audio.sfx('magic'); w.playOnce(d.unit.uid, 'cast'); w.ring(pos(d.unit, 0.1), 0x80e0ff, 4, 700); fxSprite(w, 'spark', pos(d.unit, 1.2), { add: true, color: 0x80e0ff, size: 1.2 * U.scale, to: 2.6 * U.scale, ms: 500 }); await sleep(420); break; }
    case 'chargeHit': case 'chargeEnd': break;
    case 'break': {
      audio.sfx('explosion'); w.shake(0.55, 500); w.hitStop(110);
      w.burst(pos(d.unit, 1.2), { color: 0x80e0ff, count: 34, speed: 6 }); w.ring(pos(d.unit, 0.1), 0xffffff, 4.5, 500);
      note(d.unit, t('Charge broken!'), 'combo'); await sleep(520); break;
    }
    case 'drift': { // the sea moves everyone at once
      audio.sfx('wind');
      await Promise.all(d.moves.map((m) => w.leapUnit(m.unit.uid, w.footPos(b.cellsOf(m.unit, m.to)), 420, 0.06)));
      break;
    }
    case 'maw': { audio.sfx('ice'); const p = w.cellPos(R.eye.q, R.eye.r); w.ring(p, 0xbfe8ff, 2.6, 420); w.burst(p.clone().add(V(0, 0.4, 0)), { color: 0xdff4ff, count: 22, speed: 4 }); await sleep(160); break; }
    case 'heat': {
      const up = d.d > 0; audio.sfx(up ? 'fire' : 'ice');
      note(d.unit, (up ? '+' : '') + d.d + ' ' + t('Heat'), up ? 'status debuff' : 'status buffed');
      if (up) w.rise(pos(d.unit, 0.3), { color: 0xff7a1a, count: 6 + R.heat * 5, radius: 1.4, speed: 2.2 }); else w.rise(pos(d.unit, 0.3), { color: 0xdff4ff, count: 20, radius: 1.4, speed: 2.4 });
      await sleep(320); break;
    }
    case 'remember': { // the card is seen, and kept
      audio.sfx('shadow');
      await w.projectile(pos(d.hero, 1.2), pos(d.unit, 1.2), { color: 0xd0c8f0, ms: 380, arc: 0.8, size: 0.5 });
      w.ring(pos(d.unit, 0.1), 0xd0c8f0, 1.4, 320); note(d.unit, d.card.name, 'card-name enemy'); await sleep(200); break;
    }
    default: break;
  }
}
