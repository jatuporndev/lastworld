// Boss rules — the one thing each MVP does that no other fight has. A rule is pure battle logic (it runs the same on
// every co-op client: dice come from b.rng only), and tells the view what happened through b.emit('rule', {...}).
//
// A rule may set:
//   setup(b, R)            the board is ready: place its pieces (no events yet, the view is not built)
//   round(b, R)            a round begins, intents are chosen: the rule may replace the boss's
//   roundEnd(b, R)         everyone has acted
//   act(b, R, u, it)       the boss (or one of its pieces) carries out an intent marked `rule: true`
//   damaged(b, R, d)       { src, tgt, dealt, el }
//   died(b, R, u)          any unit fell
//   lethal(b, R, u)        the MVP would die: return true to keep it alive (the rule then sets its HP)
//   phase(b, R)            the MVP passed half its life
//   card(b, R, d)          a hero's card resolved: { unit, card, cells, victims }
//   turnEnd(b, R, u)
//   dmgOut(b, R, src)      flat damage added to the MVP's blows;  dmgMul(b, R, src)  multiplier on them
// State lives on R (b.rule): R.boss, R.props (its pieces), R.reserved (hex keys nobody may stand on), and whatever the rule needs.
import * as Hex from '../engine/hex.js';
import { t } from '../core/i18n.js';

const K = (c) => Hex.key(c.q, c.r);
const alive = (R) => R.props.filter((p) => p.alive);
const between = (b, u) => { const m = heroMid(b); return Hex.round({ q: (u.q + m.q) / 2, r: (u.r + m.r) / 2 }); }; // the middle ground between the boss and the party
const heroMid = (b) => { const hs = b.heroes(); const o = { q: 0, r: 0 }; hs.forEach((h) => { o.q += h.q / hs.length; o.r += h.r / hs.length; }); return Hex.round(o); };

// Free hexes between `lo` and `hi` steps from `center`, spread apart, never next to a hero. `far`: prefer those far from the heroes.
function pickSpots(b, n, center, lo, hi, { far = false, avoid = [] } = {}) {
  const heroes = b.heroes();
  for (let grow = 0; grow < 4; grow++) {
    const ok = [...b.board.cells.values()].filter((c) => {
      const d = Hex.distance(c, center);
      return d >= lo && d <= hi + grow * 2 && b.canStand({ size: 1 }, c) && heroes.every((h) => Hex.distance(h, c) >= 2) && avoid.every((a) => Hex.distance(a, c) >= 2);
    }).sort((a, c) => a.q - c.q || a.r - c.r);
    if (ok.length < n && grow < 3) continue;
    const out = [];
    while (out.length < n && ok.length) {
      let best = null, bs = -Infinity;
      for (const c of ok) {
        const near = heroes.length ? Math.min(...heroes.map((h) => Hex.distance(h, c))) : 0;
        const s = out.length ? Math.min(...out.map((o) => Hex.distance(o, c))) * 10 + (far ? near : -near) : (far ? near : -near);
        if (s > bs) { bs = s; best = c; }
      }
      out.push(best); ok.splice(ok.indexOf(best), 1);
    }
    return out;
  }
  return [];
}

function put(b, R, id, at, extra = {}) {
  const u = b._monsterUnit(id); Object.assign(u, extra, { q: at.q, r: at.r, facing: 3, from: R.boss.uid });
  b.units.push(u); R.props.push(u); return u;
}
async function raise(b, R, id, spots, extra) { for (const at of spots) { const u = put(b, R, id, at, extra); await b.emit('spawn', { unit: u, prop: true }); } }

const fin = (b, u, it) => { if (!it.card) it.name = t(it.name); if (it.dmg) { it.power = b.intentPower(u, it); it.dice = u.def.dice || 1; } it.rule = true; return it; };
const around = (b, u, at, lo, hi) => { const own = b.cellsOf(u, at); return Hex.spiral(at, hi).filter((h) => b.cell(h) && Hex.distance(at, h) >= lo && !own.some((o) => Hex.hexEq(o, h))); };

// The boss loses its footing: it does nothing on its next turn and is easier to hurt until then.
async function stagger(b, u, name) {
  const s = { k: 'stagger', name: t(name), rule: true };
  if (b.current !== u && u.intent) u.intent = s; else u.nextIntent = s;
  await b.addStatus(null, u, 'vulnerable', 2);
  await b.emit('intent', { unit: u });
}

// Every hex the caster can see: line of sight from where it stands (walls and ice pillars cast a safe shadow).
export function sightCells(b, u) {
  return [...b.board.cells.values()].filter((c) => !Hex.hexEq(c, u) && b.los(u, c)).map((c) => ({ q: c.q, r: c.r }));
}

// Where the current will carry each hero at the end of the round (Leviathan).
export function driftPlan(b, R) {
  const eye = R.eye; const steps = R.boss.phase === 2 ? 2 : 1; const moves = []; const taken = new Set();
  const list = b.heroSide().filter((u) => u.size === 1 && !u.construct).sort((a, c) => Hex.distance(a, eye) - Hex.distance(c, eye) || (a.uid < c.uid ? -1 : 1));
  for (const u of list) {
    let pos = { q: u.q, r: u.r };
    for (let i = 0; i < steps; i++) {
      const d = Hex.distance(pos, eye); if (d <= 1) break;
      const nx = Hex.neighbors(pos).filter((h) => Hex.distance(h, eye) < d && b.canStand(u, h) && !taken.has(K(h))).sort((a, c) => a.q - c.q || a.r - c.r)[0];
      if (!nx) break; pos = nx;
    }
    taken.add(K(pos));
    if (!Hex.hexEq(pos, u)) moves.push({ unit: u, to: pos });
  }
  return moves;
}

// The hexes the rot will take at the end of this round (Sporemother).
export function rotNext(b, R) {
  const out = []; const seen = new Set(R.rot);
  for (const p of alive(R)) {
    const grow = R.boss.phase === 2 ? 3 : 2;
    const near = [...b.board.cells.values()].filter((c) => !seen.has(K(c)) && isFinite(b.terrain(c).cost) && !b.unitAt(c)?.prop)
      .sort((a, c) => Hex.distance(a, p) - Hex.distance(c, p) || a.q - c.q || a.r - c.r).slice(0, grow);
    for (const c of near) { seen.add(K(c)); out.push({ q: c.q, r: c.r }); }
  }
  return out;
}

// Hexes a hero could shelter on: out of the caster's sight, and free (or already held by a hero).
export function safeCells(b, u) {
  return [...b.board.cells.values()].filter((c) => isFinite(b.terrain(c).cost) && !Hex.hexEq(c, u) && !b.los(u, c) && !(b.unitAt(c) && !b.unitAt(c).hero));
}

// Where to raise `n` pillars so that each hides the most ground from `from`: a pillar at the edge of the board, with nothing behind it, shelters no one.
function shadowSpots(b, n, from, avoid = []) {
  const heroes = b.heroes(); const walk = [...b.board.cells.values()].filter((c) => isFinite(b.terrain(c).cost));
  const shade = new Map(); // candidate hex → the seen hexes it would hide
  for (const c of walk) { const d = Hex.distance(c, from); if (d >= 3 && d <= 6 && b.canStand({ size: 1 }, c) && avoid.every((a) => Hex.distance(a, c) >= 2)) shade.set(K(c), []); }
  for (const x of walk) {
    if (Hex.hexEq(x, from) || !b.los(from, x) || (b.unitAt(x) && !b.unitAt(x).hero)) continue;
    const line = Hex.lineDraw(from, x); for (let i = 1; i < line.length - 1; i++) shade.get(K(line[i]))?.push(K(x));
  }
  const out = []; const covered = new Set();
  while (out.length < n) {
    let best = null, bs = 0;
    for (const [k, list] of shade) {
      const c = Hex.parseKey(k); if (out.some((o) => Hex.distance(o, c) < 2)) continue;
      const gain = list.filter((x) => !covered.has(x)).length; if (gain < 2) continue;
      const near = heroes.length ? Math.min(...heroes.map((h) => Hex.distance(h, c))) : 0;
      const sc = Math.min(gain, 5) * 10 - near; // a shadow for a hero or two, close to where they stand
      if (sc > bs || (sc === bs && best && (c.q - best.q || c.r - best.r) < 0)) { bs = sc; best = c; }
    }
    if (!best) break;
    out.push(best); shade.get(K(best)).forEach((x) => covered.add(x)); shade.delete(K(best));
  }
  return out;
}

export const RULES = {
  // 1 · Roots that feed it: while they stand, the Guardian heals at the end of every round.
  forest_guardian: {
    setup(b, R) { pickSpots(b, 3, R.boss, 3, 4).forEach((at) => put(b, R, 'heart_root', at)); },
    async roundEnd(b, R) {
      const roots = alive(R); if (!roots.length || R.boss.hp >= R.boss.maxHp) return;
      const amount = Math.max(1, Math.round(R.boss.maxHp * 0.02 * roots.length * (R.fed ? 1 : 0.5))); R.fed = true;
      await b.emit('rule', { k: 'feed', from: roots, to: R.boss });
      await b.heal(null, R.boss, amount);
    },
    async phase(b, R) { const n = Math.min(1, 3 - alive(R).length); if (n > 0) await raise(b, R, 'heart_root', pickSpots(b, n, R.boss, 3, 4, { avoid: alive(R) })); },
  },

  // 2 · It goes under the sand, comes up where the sand sinks, and is off balance for a round after.
  sand_tyrant: {
    setup(b, R) { R.next = 2; },
    round(b, R) {
      const u = R.boss; if (u.hidden || u.intent?.rule || u.nextIntent || b.round < R.next) return;
      u.intent = fin(b, u, { k: 'burrow', name: 'Burrow' });
    },
    async act(b, R, u, it) {
      if (it.k === 'burrow') {
        const tgt = b.heroes().sort((a, c) => b.dist(u, a) - b.dist(u, c) || (a.uid < c.uid ? -1 : 1))[0]; if (!tgt) return;
        u.hidden = true; // off the board: it holds no hex and nothing can reach it
        const spots = [...b.board.cells.values()].filter((c) => b.canStand(u, c) && b.distCells(b.cellsOf(u, c), [tgt]) >= 1)
          .sort((a, c) => Hex.distance(a, tgt) - Hex.distance(c, tgt) || a.q - c.q || a.r - c.r);
        const at = spots[0] || { q: u.q, r: u.r };
        R.at = at; R.reserved = new Set(b.cellsOf(u, at).map(K));
        await b.emit('rule', { k: 'burrow', unit: u, at });
        u.nextIntent = fin(b, u, { k: 'emerge', name: 'Erupt', dmg: 1.1, el: 'earth', shape: 'ring', size: 2, cells: around(b, u, at, 2, 3), fixed: true, center: at });
      } else if (it.k === 'emerge') {
        const at = R.at; u.q = at.q; u.r = at.r; u.hidden = false; R.reserved = null; R.at = null;
        await b.emit('rule', { k: 'emerge', unit: u });
        await b.monsterAoe(u, it, it.cells, at);
        if (!u.alive) return;
        R.next = b.round + 3;
        await b.addStatus(null, u, 'vulnerable', 2); // off balance until its next turn is over
        await b.emit('rule', { k: 'reel', unit: u });
      }
    },
  },

  // 3 · Absolute Zero strikes everything she can see. The ice pillars cast the only shadow.
  frost_queen: {
    setup(b, R) { R.next = 2; shadowSpots(b, Math.max(3, b.heroes().length), R.boss).forEach((at) => put(b, R, 'ice_pillar', at)); },
    // She begins the cast only where there is shelter to be had: if the pillars left cast too little shadow from where she stands, new ones rise first.
    async round(b, R) {
      const u = R.boss; if (u.intent?.rule || u.nextIntent || b.round < R.next) return;
      const lack = b.heroes().length + 1 - safeCells(b, u).length;
      if (lack > 0 && alive(R).length < 6) await raise(b, R, 'ice_pillar', shadowSpots(b, Math.min(3, Math.ceil(lack / 2)), u, alive(R)));
      u.intent = fin(b, u, { k: 'gather', name: 'Absolute Zero', turns: 1, dmg: 1.1, el: 'ice', cells: sightCells(b, u), sight: true });
    },
    async act(b, R, u, it) {
      if (it.k === 'gather') {
        await b.emit('rule', { k: 'gather', unit: u });
        u.nextIntent = fin(b, u, { k: 'zero', name: 'Absolute Zero', dmg: 1.1, el: 'ice', status: { st: 'chill', n: 2 }, shape: 'sight', cells: sightCells(b, u), fixed: true, sight: true });
      } else {
        it.cells = sightCells(b, u);
        await b.monsterAoe(u, it, it.cells, { q: u.q, r: u.r });
        R.next = b.round + 4;
        await b.emit('rule', { k: 'zeroDone', unit: u });
      }
    },
    // a pillar fell: the shadow it cast is gone
    async died(b, R, u) {
      const u0 = R.boss; if (!u.prop || !u0.alive) return;
      for (const it of [u0.intent, u0.nextIntent]) if (it?.sight) it.cells = sightCells(b, u0);
      if (u0.intent?.sight || u0.nextIntent?.sight) await b.emit('intent', { unit: u0 });
    },
    async phase(b, R) {
      for (const p of alive(R)) await b.kill(p, null);
      await raise(b, R, 'ice_pillar', shadowSpots(b, Math.max(2, b.heroes().length), R.boss));
    },
  },

  // 4 · His soul is kept in an urn. Kill him while it stands and he gets up again; each time, the urn cracks.
  lich_king: {
    setup(b, R) { pickSpots(b, 1, R.boss, 3, 4).forEach((at) => put(b, R, 'soul_urn', at)); },
    lethal(b, R, u) { return u === R.boss && alive(R).length > 0; },
    async saved(b, R) {
      const u = R.boss; const urn = alive(R)[0];
      u.hp = Math.round(u.maxHp * 0.35); b.cleanse(u);
      await b.emit('rule', { k: 'reform', unit: u, urn });
      if (urn) await b.applyDamage(null, urn, Math.ceil(urn.maxHp / 2), { el: 'shadow', dot: true, tags: [] });
    },
  },

  // 5 · It takes to the sky for a round: blades cannot reach it, and stars fall where the ground is marked.
  celestial_dragon: {
    setup(b, R) { R.next = 3; },
    round(b, R) {
      const u = R.boss; if (u.aloft || u.intent?.rule || u.nextIntent || b.round < R.next) return;
      u.intent = fin(b, u, { k: 'ascend', name: 'Take Wing' });
    },
    async act(b, R, u, it) {
      if (it.k === 'ascend') {
        u.aloft = true;
        await b.emit('rule', { k: 'ascend', unit: u });
        // a star for every hero, and more wherever the dice say; what is left between them is the safe ground
        const seeds = b.heroes().map((h) => ({ q: h.q, r: h.r }));
        const open = [...b.board.cells.values()].filter((c) => isFinite(b.terrain(c).cost)).sort((a, c) => a.q - c.q || a.r - c.r);
        for (let i = 0; i < 3 + (u.phase === 2 ? 2 : 0); i++) seeds.push(b.rng.pick(open));
        const own = b.cellsOf(u); const seen = new Set(); const cells = [];
        for (const s of seeds) for (const h of Hex.spiral(s, 1)) if (b.cell(h) && !seen.has(K(h)) && !own.some((o) => Hex.hexEq(o, h))) { seen.add(K(h)); cells.push(h); }
        u.nextIntent = fin(b, u, { k: 'dive', name: 'Starfall', dmg: 1.2, el: 'holy', status: { st: 'burn', n: 2 }, shape: 'stars', cells, fixed: true, center: { q: u.q, r: u.r } });
      } else {
        await b.monsterAoe(u, it, it.cells, { q: u.q, r: u.r });
        u.aloft = false; R.next = b.round + 3;
        await b.emit('rule', { k: 'land', unit: u });
      }
    },
  },

  // 6 · A gate lets one demon through every round, and he hits harder for each demon alive.
  abyssal_overlord: {
    noSummon: true,
    setup(b, R) { pickSpots(b, 1, R.boss, 3, 4).forEach((at) => put(b, R, 'hell_gate', at)); },
    demons(b) { return b.enemies().filter((u) => !u.prop && u.rank !== 'mvp').length; },
    async roundEnd(b, R) {
      const gate = alive(R)[0]; if (!gate || this.demons(b) >= 5) return;
      await b.emit('rule', { k: 'gate', unit: gate });
      await b.spawnMinion(gate, 'void_imp');
      await b.emit('rule', { k: 'count' });
    },
    dmgOut(b, R, src) { return src === R.boss ? Math.min(5, this.demons(b)) : 0; },
    async died(b, R, u) { if (u.side === 'enemy' && R.boss.alive) await b.emit('rule', { k: 'count' }); },
  },

  // 7 · Rot spreads from her pods every round and poisons whoever stops on it. Fire burns it away.
  sporemother: {
    setup(b, R) {
      R.rot = new Set();
      pickSpots(b, 3, between(b, R.boss), 1, 3).forEach((at) => put(b, R, 'spore_pod', at));
      for (const p of R.props) for (const h of Hex.spiral(p, 1)) if (b.cell(h) && isFinite(b.terrain(h).cost) && !Hex.hexEq(h, p)) R.rot.add(K(h));
    },
    async roundEnd(b, R) {
      const grown = rotNext(b, R); if (!grown.length) return;
      grown.forEach((c) => R.rot.add(K(c)));
      await b.emit('rule', { k: 'rot', cells: grown });
    },
    async turnEnd(b, R, u) { if (u.side === 'hero' && !u.construct && u.alive && R.rot.has(K(u))) await b.addStatus(null, u, 'poison', 2); },
    async card(b, R, { card, cells }) {
      if (card.el !== 'fire' || !cells?.length) return;
      const burnt = []; const seen = new Set();
      for (const c of cells) for (const h of card.shape === 'single' ? Hex.spiral(c, 1) : [c]) if (R.rot.has(K(h)) && !seen.has(K(h))) { seen.add(K(h)); burnt.push({ q: h.q, r: h.r }); }
      if (!burnt.length) return;
      burnt.forEach((c) => R.rot.delete(K(c)));
      await b.emit('rule', { k: 'burn', cells: burnt });
    },
    // a pod that dies takes the rot around it along
    async died(b, R, u) {
      if (!u.prop) return;
      const gone = Hex.spiral(u, 2).filter((h) => R.rot.has(K(h))); gone.forEach((c) => R.rot.delete(K(c)));
      await b.emit('rule', { k: 'burn', cells: gone, wither: true });
    },
    async phase(b, R) { await raise(b, R, 'spore_pod', pickSpots(b, 2, between(b, R.boss), 1, 3, { avoid: alive(R) })); },
  },

  // 8 · He charges his core for a round. Enough damage in that time breaks the charge and leaves him helpless.
  iron_regent: {
    setup(b, R) { R.next = 3; },
    round(b, R) {
      const u = R.boss; if (R.charging || u.intent?.rule || u.nextIntent || b.round < R.next) return;
      R.charging = true; R.need = R.goal = Math.max(4, Math.round(u.maxHp * 0.08));
      u.intent = fin(b, u, { k: 'charge', name: 'Overload Core', turns: 1, dmg: 1.6, el: 'wind', cells: around(b, u, u, 2, 5) });
    },
    async act(b, R, u, it) {
      if (it.k === 'charge') {
        await b.emit('rule', { k: 'charge', unit: u });
        u.nextIntent = fin(b, u, { k: 'overload', name: 'Overload Core', dmg: 1.6, el: 'wind', status: { st: 'stun', n: 1 }, shape: 'burst', size: 4, cells: around(b, u, u, 2, 5), fixed: true });
      } else if (it.k === 'overload') {
        R.charging = false; R.next = b.round + 4;
        await b.monsterAoe(u, it, it.cells, { q: u.q, r: u.r });
        await b.emit('rule', { k: 'chargeEnd', unit: u });
      } else await b.emit('text', { unit: u, text: it.name, color: '#ccc' });
    },
    async damaged(b, R, { tgt, dealt }) {
      if (!R.charging || tgt !== R.boss || !tgt.alive || dealt <= 0) return;
      R.need -= dealt;
      if (R.need > 0) { await b.emit('rule', { k: 'chargeHit', unit: tgt }); return; }
      R.charging = false; R.next = b.round + 4;
      await b.emit('rule', { k: 'break', unit: tgt });
      await stagger(b, tgt, 'Short Circuit');
    },
  },

  // 9 · The current drags every hero one hex toward the whirlpool at the end of each round.
  leviathan: {
    setup(b, R) {
      const mid = Hex.round({ q: (R.boss.q + heroMid(b).q) / 2, r: (R.boss.r + heroMid(b).r) / 2 });
      const at = [...b.board.cells.values()].filter((c) => b.canStand({ size: 1 }, c) && b.heroes().every((h) => Hex.distance(h, c) >= 3))
        .sort((a, c) => Hex.distance(a, mid) - Hex.distance(c, mid) || a.q - c.q || a.r - c.r)[0] || mid;
      R.eye = { q: at.q, r: at.r }; R.reserved = new Set([K(at)]);
    },
    async roundEnd(b, R) {
      const moves = driftPlan(b, R);
      if (moves.length) { await b.emit('rule', { k: 'drift', moves }); for (const m of moves) { m.unit.q = m.to.q; m.unit.r = m.to.r; } }
      const caught = b.heroSide().filter((u) => u.size === 1 && !u.construct && Hex.distance(u, R.eye) <= 1);
      if (!caught.length) return;
      await b.emit('rule', { k: 'maw', units: caught });
      for (const u of caught) {
        await b.applyDamage(null, u, Math.max(1, Math.round(R.boss.stats.atk * 0.3)), { el: 'ice', dot: true, tags: ['Whirlpool'], together: true });
      }
    },
  },

  // 10 · It grows hotter every round and hits harder for it. At five it erupts. Ice, or a broken vent, cools it.
  pyrelord: {
    setup(b, R) { R.heat = 0; R.regrow = []; pickSpots(b, 2, R.boss, 3, 5).forEach((at) => put(b, R, 'magma_vent', at)); },
    round(b, R) {
      const u = R.boss; if (R.heat < 5) return;
      const cells = [...b.board.cells.values()].filter((c) => !b.cellsOf(u).some((o) => Hex.hexEq(o, c))).map((c) => ({ q: c.q, r: c.r }));
      u.intent = fin(b, u, { k: 'erupt', name: 'Eruption', dmg: 0.9, el: 'fire', status: { st: 'burn', n: 3 }, shape: 'all', cells, fixed: true });
    },
    async act(b, R, u, it) {
      await b.monsterAoe(u, it, it.cells, { q: u.q, r: u.r });
      R.heat = 0; await b.emit('rule', { k: 'heat', unit: u, d: -5 });
    },
    async cool(b, R, n, why) { if (R.heat <= 0) return; const d = Math.min(R.heat, n); R.heat -= d; if (R.heat < 5 && R.boss.intent?.k === 'erupt') { R.boss.intent = null; R.boss.intent = b.pickIntent(R.boss); await b.emit('intent', { unit: R.boss }); } await b.emit('rule', { k: 'heat', unit: R.boss, d: -d, why }); },
    async roundEnd(b, R) {
      if (R.heat < 5) { R.heat++; await b.emit('rule', { k: 'heat', unit: R.boss, d: 1 }); }
      const due = R.regrow.filter((r) => r <= b.round); R.regrow = R.regrow.filter((r) => r > b.round);
      if (due.length) await raise(b, R, 'magma_vent', pickSpots(b, due.length, R.boss, 3, 5, { avoid: alive(R) }));
    },
    async card(b, R, { card, victims }) { if (card.el === 'ice' && victims?.includes(R.boss) && R.boss.alive) await this.cool(b, R, 1, 'ice'); },
    async died(b, R, u) { if (u.prop && R.boss.alive) { R.regrow.push(b.round + 3); await this.cool(b, R, 2, 'vent'); } },
    dmgMul(b, R, src) { return src === R.boss ? 1 + 0.08 * R.heat : 1; },
  },

  // 11 · Each hero has an echo. It remembers the last attack card that hero played and turns it on the party next round.
  the_unmaker: {
    setup(b, R) { this.call(b, R).forEach(({ at, hero }) => put(b, R, 'aeon_echo', at, { echoOf: hero.uid })); },
    call(b, R) {
      const need = b.heroes().filter((h) => !alive(R).some((e) => e.echoOf === h.uid)).slice(0, 3);
      const spots = pickSpots(b, need.length, R.boss, 2, 4, { avoid: alive(R) });
      return need.map((hero, i) => ({ hero, at: spots[i] })).filter((x) => x.at);
    },
    async card(b, R, { unit, card }) {
      if (!unit.hero || card.cat !== 'attack' || !card.fx.some((f) => f.t === 'dmg')) return;
      const echo = alive(R).find((e) => e.echoOf === unit.uid); if (!echo) return;
      const st = card.fx.find((f) => f.t === 'status' && !f.self);
      echo.memory = { name: card.name, el: card.el, area: card.shape !== 'single', size: Math.max(1, Math.min(2, card.size || 1)), cost: card.cost || 1, status: st ? { st: st.st, n: st.n } : null, id: card.id };
      await b.emit('rule', { k: 'remember', unit: echo, hero: unit, card });
    },
    async act(b, R, u, it) {
      if (it.k !== 'echo') return;
      const tgt = b.units.find((x) => x.uid === it.targetUid && x.alive) || b.heroes()[0]; if (!tgt) return;
      if (it.cells) await b.monsterAoe(u, it, it.cells, it.center);
      else await b.monsterAttack(u, tgt, it);
    },
    async phase(b, R) { for (const { at, hero } of this.call(b, R)) { const u = put(b, R, 'aeon_echo', at, { echoOf: hero.uid }); await b.emit('spawn', { unit: u, prop: true }); } },
  },
};

// What an echo will do this round: the card it was shown, thrown back at the hero it mirrors.
export function echoIntent(b, u) {
  const m = u.memory; u.memory = null;
  if (!m) return { k: 'idle', name: t('Listening'), rule: true };
  const tgt = b.units.find((x) => x.uid === u.echoOf && x.alive) || b.heroes()[0]; if (!tgt) return null;
  const it = { k: 'echo', name: m.name, el: m.el, dmg: 0.3 + 0.2 * m.cost, status: m.status, targetUid: tgt.uid, card: m.id };
  if (m.area) { it.shape = 'area'; it.size = m.size; it.center = { q: tgt.q, r: tgt.r }; it.cells = Hex.spiral(it.center, m.size).filter((h) => b.cell(h)); it.fixed = true; }
  return fin(b, u, it);
}

export function initRule(b) {
  if (b.kind !== 'boss') return;
  const boss = b.units.find((u) => u.rank === 'mvp'); const def = boss && RULES[boss.monsterId];
  if (!def) return;
  b.rule = { id: boss.monsterId, def, boss, props: [], reserved: null };
  def.setup?.(b, b.rule);
}
