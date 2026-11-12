// Monster AI — chooses a telegraphed Intent each round, then moves and acts on its turn.
import * as Hex from '../engine/hex.js';

function pickTarget(b, u) {
  const foes = b.heroSide();
  if (!foes.length) return null;
  if (u.status.taunt) { const t = foes.find((f) => f.uid === u.status.taunt.by); if (t) return t; }
  let best = null, bs = Infinity;
  for (const f of foes) {
    let score = b.dist(u, f) * 10 + (f.hp / f.maxHp) * 6 + (f.construct ? 4 : 0) + (f.status.stealth ? 40 : 0) - (f.status.mark ? 8 : 0);
    if (score < bs) { bs = score; best = f; }
  }
  return best;
}

// A nest never attacks. It counts down, then hatches a weaker copy of a stage monster — unless its
// brood is already full. Destroying the nest is the only way to stop it.
function nestIntent(b, u) {
  const d = u.def;
  u.hatchIn = Math.max(0, (u.hatchIn ?? d.every) - 1);
  const brood = b.enemies().filter((x) => x.from === u.uid).length;
  if (u.hatchIn > 0 || brood >= b.nestCap || b.enemies().length >= 9) return { k: 'wait', name: d.waitName, turns: u.hatchIn, full: u.hatchIn <= 0 };
  return { k: 'summon', name: d.hatchName, id: b.rng.pick(d.hatch), n: 1 };
}

export function chooseIntent(b, u) {
  const d = u.def;
  if (d.nest) return nestIntent(b, u);
  let list = (u.phase === 2 && d.phase2) ? d.phase2 : d.intents;
  if (!list || !list.length) return null;
  const allies = b.enemies();
  const hurt = allies.some((a) => a.hp < a.maxHp * 0.8);
  list = list.filter((it) => {
    if (it.k === 'summon' && allies.length >= 6) return false;
    if (it.k === 'heal' && !(it.self ? u.hp < u.maxHp * 0.8 : hurt)) return false;
    if (it.k === 'guard' && u.block > 0) return false;
    if (u.lastIntent && u.lastIntent === it.name && list.length > 1 && it.k !== 'strike' && it.k !== 'shoot') return false;
    return true;
  });
  if (!list.length) list = [d.intents[0]];
  const it = { ...b.rng.weighted(list.map((x) => ({ w: x.w || 1, v: x }))) };
  u.lastIntent = it.name;
  const tgt = pickTarget(b, u);
  it.targetUid = tgt?.uid || null;
  if (it.k === 'aoe' && it.shape === 'area' && tgt) {
    it.center = { q: tgt.q, r: tgt.r };
    it.cells = Hex.spiral(it.center, it.size).filter((h) => b.cell(h));
  }
  if (it.dmg) { it.power = b.intentPower(u, it); it.dice = d.dice || 1; }
  if (it.k === 'guard') it.blockValue = it.block + (d.tier - 1);
  return it;
}

// Move toward target until within `range` (optionally requiring line of sight).
async function approach(b, u, tgt, range, budget, needLos = false) {
  if (budget <= 0 || !tgt) return;
  const tcells = b.cellsOf(tgt);
  const ok = (at) => {
    if (b.distCells(b.cellsOf(u, at), tcells) > range) return false;
    if (needLos) { const nc = b.nearestCell(at, tgt); if (!b.los(at, nc)) return false; }
    return true;
  };
  if (ok(u)) return;
  const R = b.reach(u, u, 60);
  let goal = null, gc = Infinity, near = null, nd = Infinity;
  for (const [k, c] of R.costs) {
    const h = Hex.parseKey(k);
    if (ok(h)) { if (c < gc) { gc = c; goal = h; } }
    const dd = b.distCells(b.cellsOf(u, h), tcells) * 100 + c;
    if (dd < nd) { nd = dd; near = h; }
  }
  const dest = goal || near;
  if (!dest || Hex.hexEq(dest, u)) return;
  const full = Hex.pathFromPrev(R.prev, u, dest);
  const path = [];
  for (const h of full) { if (R.costs.get(Hex.key(h.q, h.r)) > budget) break; path.push(h); }
  if (path.length) await b.moveUnit(u, path);
}

export async function monsterAct(b, u) {
  const it = u.intent;
  if (!it || !u.alive) return;
  const budget = b.moveBudget(u);
  let tgt = b.units.find((x) => x.uid === it.targetUid && x.alive) || pickTarget(b, u);
  if (u.status.taunt) tgt = pickTarget(b, u);
  if (it.k === 'wait') return;
  if (!tgt && it.k !== 'guard' && it.k !== 'heal' && it.k !== 'buff' && it.k !== 'summon') return;

  switch (it.k) {
    case 'strike': case 'shoot': {
      const range = it.range || 1; const needLos = range > 1;
      const inRange = (t) => b.dist(u, t) <= range && (!needLos || b.los(b.nearestCell(b.nearestCell(u, t), u), b.nearestCell(u, t)));
      if (!inRange(tgt)) await approach(b, u, tgt, range, budget, needLos);
      if (!u.alive) return;
      if (!inRange(tgt)) {
        const alt = b.heroSide().filter(inRange).sort((a, c) => a.hp - c.hp)[0];
        if (!alt) { await b.emit('text', { unit: u, text: 'Advances…', color: '#ccc' }); return; }
        tgt = alt;
      }
      await b.monsterAttack(u, tgt, it);
      break;
    }
    case 'aoe': {
      if (it.shape === 'area') {
        const cells = it.cells || Hex.spiral(tgt, it.size).filter((h) => b.cell(h));
        if (tgt && b.dist(u, tgt) > 2) await approach(b, u, tgt, 2, Math.min(budget, 1));
        if (!u.alive) return;
        u.facing = Hex.directionTo(u, it.center || tgt);
        await b.monsterAoe(u, it, cells, it.center || { q: tgt.q, r: tgt.r });
      } else {
        const extra = u.size === 7 ? 1 : 0;
        const need = it.size + extra;
        if (b.dist(u, tgt) > Math.max(1, need - (u.size > 1 ? 1 : 0))) await approach(b, u, tgt, Math.max(1, it.shape === 'burst' ? need : need - 1), budget);
        if (!u.alive) return;
        const origin = { q: u.q, r: u.r };
        const tc = b.nearestCell(origin, tgt);
        const own = b.cellsOf(u);
        let cells;
        if (it.shape === 'burst') cells = Hex.spiral(origin, need).filter((h) => b.cell(h));
        else if (it.shape === 'cone') cells = Hex.cone(origin, Hex.directionTo(origin, tc), need).filter((h) => b.cell(h));
        else cells = Hex.lineInDir(origin, Hex.directionTo(origin, tc), need + 1).filter((h) => b.cell(h));
        cells = cells.filter((h) => !own.some((o) => Hex.hexEq(o, h)));
        if (!Hex.hexEq(tc, origin)) u.facing = Hex.directionTo(origin, tc);
        await b.monsterAoe(u, it, cells, origin);
      }
      break;
    }
    case 'guard': {
      if (tgt && b.dist(u, tgt) > 1) await approach(b, u, tgt, 1, Math.max(0, budget - 1));
      if (!u.alive) return;
      await b.emit('cast', { unit: u, card: { name: it.name, el: u.el, cat: 'defense' }, cells: b.cellsOf(u), targets: [u], target: u, monster: true });
      await b.addBlock(u, it.blockValue || it.block);
      break;
    }
    case 'buff': {
      if (tgt && b.dist(u, tgt) > 3) await approach(b, u, tgt, 3, Math.max(0, budget - 1));
      if (!u.alive) return;
      const targets = it.allies ? b.enemies().filter((a) => b.dist(u, a) <= 3) : [u];
      await b.emit('cast', { unit: u, card: { name: it.name, el: u.el, cat: 'buff' }, cells: targets.flatMap((t) => b.cellsOf(t)), targets, target: u, monster: true });
      for (const t of targets) await b.addStatus(u, t, it.st, it.n);
      break;
    }
    case 'heal': {
      const pool = it.self ? [u] : b.enemies();
      const t = pool.sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];
      await b.emit('cast', { unit: u, card: { name: it.name, el: 'holy', cat: 'buff' }, cells: b.cellsOf(t), targets: [t], target: t, monster: true });
      await b.heal(u, t, u.stats.matk * it.v * 2 + t.maxHp * 0.04);
      break;
    }
    case 'summon': {
      await b.emit('cast', { unit: u, card: { name: it.name, el: u.el, cat: 'special' }, cells: b.cellsOf(u), targets: [u], target: u, monster: true });
      for (let i = 0; i < (it.n || 1); i++) await b.spawnMinion(u, it.id);
      if (u.nest) u.hatchIn = u.def.every + b.nestSlow;
      break;
    }
    default: break;
  }
}
