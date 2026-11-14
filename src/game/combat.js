// Combat Resolver — board state, turn order, card planning/resolution, damage, statuses.
// The Battle is pure logic. It talks to an optional async `view` (the renderer/UI) through emit().
import * as Hex from '../engine/hex.js';
import { RNG } from '../core/util.js';
import { t } from '../core/i18n.js';
import { terrainOf } from '../data/terrain.js';
import { parseLayout } from '../data/stages.js';
import { MONSTERS } from '../data/monsters.js';
import { STATUS_INFO, ELEMENTS, DICE, MONSTER_DIE, diceOf } from '../data/cards.js';
import { CLASSES, heroLook } from '../data/classes.js';
import { CONSUMABLES } from '../data/items.js';
import { computeStats } from './character.js';
import { CardEngine, HAND_SIZE } from './cardEngine.js';
import { chooseIntent, monsterAct } from './ai.js';

const FOOT = {
  1: [[0, 0]],
  3: [[0, 0], [1, 0], [0, 1]],
  7: [[0, 0], ...Hex.DIRS],
};
const NO_STACK = ['stun', 'frozen', 'mark', 'stealth', 'taunt'];
export { DICE } from '../data/cards.js';

// Builds the battle board from the stage's hand-designed layouts (see data/stages.js).
// Skirmishes pick one of the stage's boards; the MVP fight always uses the stage's boss arena.
export function generateBoard(stage, kind, rng, pick = null) {
  const drawn = rng.pick(stage.boards.skirmish); // (always drawn, so the dice that follow are the same whether or not a board was picked)
  const layout = kind === 'boss' ? stage.boards.boss : stage.boards.skirmish[pick] || drawn;
  const parsed = parseLayout(layout);
  // centre the board on the origin so the camera and effects stay simple
  let cx = 0, cz = 0;
  for (const c of parsed) { const w = Hex.toWorld(c.q, c.r); cx += w.x; cz += w.z; }
  const mid = Hex.fromWorld(cx / parsed.length, cz / parsed.length);
  const cells = new Map(); const heroSpawns = []; const enemySpawns = []; const nests = []; let anchor = null; const plain = [];
  for (const c of parsed) {
    const q = c.q - mid.q, r = c.r - mid.r; let t = stage.biome.base;
    if (c.ch === 'h') heroSpawns.push({ q, r });
    else if (c.ch === 'e') enemySpawns.push({ q, r });
    else if (c.ch === 'B') anchor = { q, r };
    else if (c.ch === 'N') nests.push({ q, r });
    else if (stage.tiles[c.ch]) t = stage.tiles[c.ch];
    else plain.push({ q, r });
    cells.set(Hex.key(q, r), { q, r, t });
  }
  // a little seeded variety on open ground (walkable terrain only, never next to the large-monster anchor)
  for (const c of plain) {
    if (anchor && Hex.distance(c, anchor) <= 2) continue;
    let roll = rng.float();
    for (const [id, p] of stage.biome.scatter || []) { if (roll < p) { cells.get(Hex.key(c.q, c.r)).t = id; break; } roll -= p; }
  }
  let R = 0; for (const c of cells.values()) R = Math.max(R, Hex.distance(c, { q: 0, r: 0 }));
  return { R, cells, heroSpawns, enemySpawns, nests, anchor };
}

export class Battle {
  constructor({ stage, enemies, kind = 'normal', party, levelOf = () => 0, inv = null, nextBuff = null, view = null, seed = Date.now(), board = null }) {
    this.stage = stage; this.kind = kind; this.view = view;
    this.rng = new RNG(seed); this.seed = seed;
    this._ids = 1; // per-battle ids keep co-op clients in lockstep
    this.nextId = () => this._ids++;
    this.board = generateBoard(stage, kind, this.rng, board);
    this.units = []; this.round = 0; this.order = []; this.current = null; this.result = null;
    this.inv = inv; this.combos = 0; this.kills = []; this.log = [];
    // MVP arenas with nests: a lone hero faces slower nests that keep one hatchling each
    const heads = party.filter((h) => h.hp > 0).length;
    this.nestCap = heads >= 2 ? 2 : 1; this.nestSlow = heads >= 2 ? 0 : 1;
    // A boss has more life for a bigger party: +50% for each hero after the first (x1.5 for two, x2 for three).
    // Ordinary monsters do not: a bigger party already meets more of them.
    this.bossHp = 1 + 0.5 * Math.max(0, heads - 1);
    this._setup(party, enemies, levelOf, nextBuff);
  }

  // ───────── setup ─────────
  _setup(party, enemies, levelOf, nextBuff) {
    const B = this.board;
    const all = [...B.cells.values()].filter((c) => isFinite(terrainOf(c.t).cost));
    const centroid = (list) => { const o = { q: 0, r: 0 }; list.forEach((c) => { o.q += c.q / list.length; o.r += c.r / list.length; }); return Hex.round(o); };
    const heroMid = centroid(B.heroSpawns.length ? B.heroSpawns : all);
    const enemyMid = B.anchor || centroid(B.enemySpawns.length ? B.enemySpawns : all);
    const freeNear = (u, target, avoid = null) => all.filter((c) => this.canStand(u, c) && (!avoid || Hex.distance(c, avoid) >= 4)).sort((a, b) => Hex.distance(a, target) - Hex.distance(b, target))[0];
    // heroes on the board's hero starts
    const living = party.filter((h) => h.hp > 0);
    living.forEach((hero, i) => {
      const u = this._heroUnit(hero, levelOf);
      const spot = (B.heroSpawns[i] && this.canStand(u, B.heroSpawns[i])) ? B.heroSpawns[i] : freeNear(u, heroMid);
      u.q = spot.q; u.r = spot.r; u.facing = Hex.directionTo(spot, enemyMid); this.units.push(u);
    });
    // start-of-battle passives
    const heroes = this.heroes();
    const teamBlock = heroes.reduce((s, u) => s + (u.passives.teamBlock || 0), 0);
    heroes.forEach((u) => {
      u.block += (u.passives.startBlock || 0) + teamBlock;
      if (u.passives.startStrength) u.status.strength = { n: u.passives.startStrength, p: 0 };
      if (nextBuff) u.status[nextBuff.st] = { n: (u.status[nextBuff.st]?.n || 0) + nextBuff.n, p: 0 };
    });
    // large monsters on the anchor, the rest on enemy starts
    const big = enemies.filter((id) => MONSTERS[id].size > 1);
    const small = enemies.filter((id) => MONSTERS[id].size === 1);
    big.forEach((id) => {
      const u = this._monsterUnit(id);
      const spot = (B.anchor && this.canStand(u, B.anchor)) ? B.anchor : freeNear(u, enemyMid, heroMid);
      u.q = spot.q; u.r = spot.r; u.facing = Hex.directionTo(spot, heroMid); this.units.push(u);
    });
    // nests stand on the arena's nest marks (MVP fights only)
    if (this.kind === 'boss' && this.stage.nest) for (const at of B.nests) {
      const u = this._monsterUnit(this.stage.nest);
      if (!this.canStand(u, at)) continue;
      u.q = at.q; u.r = at.r; u.hatchIn = u.def.every + this.nestSlow; this.units.push(u);
    }
    const starts = this.rng.shuffle([...B.enemySpawns]);
    small.forEach((id) => {
      const u = this._monsterUnit(id);
      const spot = starts.find((c) => this.canStand(u, c)) || freeNear(u, enemyMid, heroMid) || freeNear(u, enemyMid);
      u.q = spot.q; u.r = spot.r; u.facing = Hex.directionTo(spot, heroMid); this.units.push(u);
    });
  }


  _heroUnit(hero, levelOf) {
    const s = computeStats(hero);
    return {
      uid: 'u' + this.nextId(), side: 'hero', hero, name: hero.name, cls: hero.cls, look: heroLook(hero).look, spriteKey: heroLook(hero).key,
      size: 1, scale: 1, q: 0, r: 0, facing: 0, level: hero.level,
      hp: Math.min(hero.hp, s.hp), maxHp: s.hp, mp: Math.min(hero.mp, s.mp), maxMp: s.mp,
      stats: { atk: s.atk, matk: s.matk, def: s.def, spd: s.spd, crit: s.crit, eva: s.eva, move: s.move, energy: s.energy, draw: s.draw, mpRegen: s.mpRegen },
      passives: s.passives, el: CLASSES[hero.cls].element, weak: [], resist: [],
      block: 0, status: {}, alive: true, energy: 0, moved: false, slotsUsed: 0, plan: [], lastCat: null, itemUsed: false,
      cards: new CardEngine(hero.deck, hero.cardLv ? (id) => hero.cardLv[id] || 0 : levelOf, this.rng, () => 'c' + this.nextId()),
    };
  }

  _monsterUnit(id, { minion = false } = {}) {
    const d = MONSTERS[id];
    const hp = Math.round(d.hp * (minion ? 0.6 : (d.rank === 'mvp' || d.rank === 'mini') ? this.bossHp || 1 : 1));
    return {
      uid: 'u' + this.nextId(), side: d.construct ? 'hero' : 'enemy', def: d, monsterId: id, name: d.name, look: d.look, spriteKey: 'mon_' + id,
      size: d.size || 1, scale: d.scale || 1, q: 0, r: 0, facing: 3, level: d.level || 1, rank: d.rank || 'normal', construct: !!d.construct, nest: !!d.nest, minion,
      hp, maxHp: hp, mp: 0, maxMp: 0,
      stats: { atk: d.atk, matk: d.matk || d.atk, def: d.def, spd: d.spd, crit: 5, eva: d.body === 'bat' ? 15 : 3, move: d.move },
      passives: { statusBonus: {}, elemPct: {}, thorns: d.thorns || 0 }, el: d.el, weak: d.weak || [], resist: d.resist || [],
      block: 0, status: {}, alive: true, intent: null, phase: 1,
    };
  }

  // ───────── queries ─────────
  heroes() { return this.units.filter((u) => u.alive && u.side === 'hero' && !u.construct); }
  heroSide() { return this.units.filter((u) => u.alive && u.side === 'hero'); }
  enemies() { return this.units.filter((u) => u.alive && u.side === 'enemy'); }
  foesOf(u) { return u.side === 'hero' ? this.enemies() : this.heroSide(); }
  alliesOf(u) { return u.side === 'hero' ? this.heroSide() : this.enemies(); }
  cell(h) { return this.board.cells.get(Hex.key(h.q, h.r)); }
  terrain(h) { const c = this.cell(h); return c ? terrainOf(c.t) : null; }
  cellsOf(u, at = u) { return FOOT[u.size].map(([dq, dr]) => ({ q: at.q + dq, r: at.r + dr })); }
  unitAt(h, except = null) {
    for (const u of this.units) {
      if (!u.alive || u === except) continue;
      for (const [dq, dr] of FOOT[u.size]) if (u.q + dq === h.q && u.r + dr === h.r) return u;
    }
    return null;
  }
  canStand(u, at) {
    for (const c of this.cellsOf(u, at)) {
      const t = this.terrain(c);
      if (!t || !isFinite(t.cost)) return false;
      if (this.unitAt(c, u)) return false;
    }
    return true;
  }
  moveCost(u, at) {
    if (!this.canStand(u, at)) return Infinity;
    return u.size > 1 ? 1 : this.terrain(at).cost;
  }
  reach(u, from, budget) { return Hex.reachable(from, budget, (h) => this.moveCost(u, h)); }
  distCells(a, b) { let m = Infinity; for (const x of a) for (const y of b) m = Math.min(m, Hex.distance(x, y)); return m; }
  dist(a, b, aAt = a) { return this.distCells(this.cellsOf(a, aAt), this.cellsOf(b)); }
  nearestCell(from, u) { let best = null, bd = Infinity; for (const c of this.cellsOf(u)) { const d = Hex.distance(from, c); if (d < bd) { bd = d; best = c; } } return best; }
  los(a, b) { return Hex.hasLOS(a, b, (h) => { const t = this.terrain(h); return !t || !!t.blocksLos; }); }
  moveBudget(u) {
    if (u.status.root) return 0;
    let m = u.stats.move + (u.passives.move || 0);
    if (u.status.chill) m -= 1;
    if (u.status.haste) m += 2;
    return Math.max(0, m);
  }

  // What the view shows may fail; the fight itself must go on (a thrown effect used to leave the turn hanging forever).
  async emit(type, data = {}) { if (!this.view) return; try { await this.view.handle(type, data, this); } catch (e) { console.error('[battle view]', type, e); } }

  // ───────── main loop ─────────
  async run() {
    await this.emit('start');
    while (!this.result) {
      await this.startRound();
      for (const u of this.order) {
        if (this.result) break;
        if (!u.alive) continue;
        await this.takeTurn(u);
        this.checkEnd();
      }
      this.checkEnd();
      if (this.round > 60 && !this.result) this.result = 'defeat';
    }
    this.heroes().forEach((u) => { u.hero.hp = Math.max(1, Math.round(u.hp)); u.hero.mp = Math.round(u.mp); });
    this.units.filter((u) => u.hero && !u.alive).forEach((u) => { u.hero.hp = 0; u.hero.mp = Math.round(u.mp); });
    await this.emit('end', { result: this.result });
    return this.result;
  }

  checkEnd() {
    if (this.result) return this.result;
    // an MVP fight is won the moment the MVP falls, whatever is left of its brood
    if (!this.enemies().length || (this.kind === 'boss' && !this.enemies().some((u) => u.rank === 'mvp'))) this.result = 'victory';
    else if (!this.heroes().length) this.result = 'defeat';
    return this.result;
  }

  async startRound() {
    this.round++;
    for (const u of this.enemies()) u.intent = chooseIntent(this, u);
    this.order = this.units.filter((u) => u.alive).sort((a, b) => (b.stats.spd + (b.status.haste ? 5 : 0)) - (a.stats.spd + (a.status.haste ? 5 : 0)) || (a.side === 'hero' ? -1 : 1));
    await this.emit('round', { round: this.round, order: this.order });
  }

  async takeTurn(u) {
    this.current = u;
    u.block = 0;
    await this.emit('turnStart', { unit: u });
    await this.tickStart(u);
    if (!u.alive || this.checkEnd()) return;
    if (u.status.stun || u.status.frozen) {
      const st = u.status.frozen ? 'frozen' : 'stun';
      await this.emit('text', { unit: u, text: t(st === 'frozen' ? 'Frozen!' : 'Stunned!'), color: STATUS_INFO[st].color });
      this.decStatus(u, st);
      if (u.cards) { u.cards.tickCooldowns(); }
      await this.turnEnd(u);
      return;
    }
    if (u.cards) {
      u.energy = u.stats.energy; u.moved = false; u.slotsUsed = 0; u.plan = []; u.lastCat = null; u.itemUsed = false;
      u.mp = Math.min(u.maxMp, u.mp + u.stats.mpRegen);
      if (u.passives.regenFlat) await this.heal(u, u, u.passives.regenFlat, true);
      const ready = u.cards.tickCooldowns();
      const drawn = u.cards.drawTo(HAND_SIZE + (u.stats.draw || 0));
      await this.emit('heroTurn', { unit: u, drawn, ready });
      await new Promise((res) => { this._endTurn = res; this.view?.inputReady?.(u); });
      this._endTurn = null;
    } else if (u.construct) {
      await this.constructAct(u);
    } else {
      await monsterAct(this, u);
      u.intent = null;
      await this.emit('intentDone', { unit: u });
    }
    if (u.alive) await this.turnEnd(u);
  }

  async tickStart(u) {
    for (const st of ['burn', 'poison']) {
      const s = u.status[st];
      if (!s || !u.alive) continue;
      const dmg = Math.max(1, Math.round(s.n * s.p));
      await this.applyDamage(null, u, dmg, { el: st === 'burn' ? 'fire' : 'poison', dot: true, tags: [STATUS_INFO[st].name] });
      this.decStatus(u, st);
    }
    if (u.alive && u.status.regen) { await this.heal(null, u, Math.max(1, Math.round(u.status.regen.n * u.status.regen.p)), true); this.decStatus(u, 'regen'); }
    if (u.alive && u.status.bleed) this.decStatus(u, 'bleed');
  }

  async turnEnd(u) {
    // terrain effects
    if (u.size === 1 && !u.construct) {
      const t = this.terrain(u);
      if (t?.onEnd) {
        const e = t.onEnd;
        if (e.heal) await this.heal(null, u, e.heal, true);
        if (e.dmg) await this.applyDamage(null, u, e.dmg, { el: e.el || 'neutral', dot: true, tags: [t.name] });
        if (e.status && u.alive) await this.addStatus(null, u, e.status, e.n);
        if (e.mp && u.maxMp) u.mp = Math.max(0, u.mp + e.mp);
      }
    }
    for (const st of ['weak', 'vulnerable', 'haste', 'root', 'taunt', 'stealth', 'strength', 'chill']) if (u.status[st]) this.decStatus(u, st);
    await this.emit('turnEnd', { unit: u });
  }

  decStatus(u, st, n = 1) {
    const s = u.status[st]; if (!s) return;
    s.n -= n; if (s.n <= 0) delete u.status[st];
  }

  // ───────── hero input API ─────────
  projected(u) { return u.plan.length ? u.plan[u.plan.length - 1].to : { q: u.q, r: u.r }; }

  moveOptions(u) {
    if (u.moved || u.plan.length || !u.alive) return null;
    const budget = this.moveBudget(u);
    if (budget <= 0) return null;
    return this.reach(u, u, budget);
  }

  async heroMove(u, dest) {
    const opts = this.moveOptions(u);
    if (!opts || !opts.costs.has(Hex.key(dest.q, dest.r)) || Hex.hexEq(dest, u)) return false;
    const path = Hex.pathFromPrev(opts.prev, u, dest);
    u.moved = true;
    await this.moveUnit(u, path);
    this._afterAction(u);
    return true;
  }

  cardRange(u, card) { return card.range + (card.range >= 3 && card.tg !== 'hex' ? (u.passives.rangeBonus || 0) : 0); }

  whyNot(u, inst) {
    const c = inst.card;
    // Action Slots are the one thing a turn spends: a card takes as many slots as its cost (0 = free).
    // u.energy holds the slots still open this turn.
    if (u.energy < c.cost) return c.cost > 1 ? t('Needs {n} free Action Slots', { n: c.cost }) : t('No free Action Slot');
    if (u.mp < c.mp) return t('Not enough MP');
    return null;
  }

  // Describe what the player must click for this card from position `from`.
  targetsFor(u, card, from = this.projected(u)) {
    const range = this.cardRange(u, card);
    const f0 = card.fx[0]?.t;
    if (card.tg === 'self') return { mode: 'none', cells: [] };
    if (card.tg === 'enemy' || card.tg === 'ally') {
      const pool = card.tg === 'enemy' ? this.foesOf(u) : this.alliesOf(u).filter((a) => !a.construct || f0 === 'heal' || f0 === 'block');
      const cells = [];
      for (const t of pool) {
        const tc = t === u ? [from] : this.cellsOf(t);
        const d = this.distCells([from], tc);
        if (d > range) continue;
        if (range > 1 && t !== u) { const nc = this.nearestCell(from, t); if (!this.los(from, nc)) continue; }
        if (f0 === 'dash' && !this.dashDest(u, from, t)) continue;
        tc.forEach((c) => cells.push({ ...c, uid: t.uid }));
      }
      return { mode: 'unit', cells };
    }
    if (card.tg === 'hex') {
      if (f0 === 'move') {
        if (u.status.root) return { mode: 'hex', cells: [] };
        const r = Hex.reachable(from, card.fx[0].v, (h) => this.moveCost(u, h));
        const cells = [...r.costs.keys()].map(Hex.parseKey).filter((h) => !Hex.hexEq(h, from) && !(u.plan.length === 0 ? false : Hex.hexEq(h, u) && false));
        return { mode: 'hex', cells, prev: r.prev };
      }
      const cells = Hex.spiral(from, range).filter((h) => !Hex.hexEq(h, from) && this.canStand(u, h) && !(this.unitAt(h)));
      return { mode: 'hex', cells };
    }
    // tg any
    if (card.shape === 'line' || card.shape === 'cone') {
      const cells = [];
      for (let d = 0; d < 6; d++) this.shapeCells(card, from, Hex.neighbor(from, d)).forEach((c) => cells.push({ ...c, dir: d }));
      return { mode: 'dir', cells };
    }
    return { mode: 'hex', cells: Hex.spiral(from, range).filter((h) => this.cell(h)) };
  }

  shapeCells(card, from, target, sizeBonus = 0) {
    const size = card.size + sizeBonus;
    switch (card.shape) {
      case 'line': {
        const d = Hex.directionTo(from, target); const out = [];
        for (const h of Hex.lineInDir(from, d, size)) { const t = this.terrain(h); if (!t) break; if (t.blocksLos) break; out.push(h); }
        return out;
      }
      case 'cone': return Hex.cone(from, Hex.directionTo(from, target), size).filter((h) => this.cell(h));
      case 'area': return Hex.spiral(target, size).filter((h) => this.cell(h));
      case 'burst': return Hex.spiral(from, size).filter((h) => this.cell(h) && !Hex.hexEq(h, from));
      default: return [target];
    }
  }

  dashDest(u, from, target) {
    let best = null, bd = Infinity;
    const seen = new Set();
    for (const c of this.cellsOf(target)) for (const n of Hex.neighbors(c)) {
      const k = Hex.key(n.q, n.r); if (seen.has(k)) continue; seen.add(k);
      if (Hex.hexEq(n, from)) return n;
      if (!this.canStand(u, n)) continue;
      const d = Hex.distance(from, n);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  // Preview of affected cells and victims for UI highlighting.
  preview(u, card, target, from = this.projected(u)) {
    let cells;
    if (card.tg === 'self' && card.shape === 'single') cells = [from];
    else if (card.shape === 'single') cells = target ? [target] : [];
    else cells = this.shapeCells(card, from, target || from);
    return cells;
  }

  // Would plan() accept this card and target? (no side effects)
  canPlan(u, handUid, target) {
    const inst = u.cards.hand.find((c) => c.uid === handUid);
    if (!inst || this.whyNot(u, inst)) return false;
    const T = this.targetsFor(u, inst.card, this.projected(u));
    return T.mode === 'none' || T.cells.some((c) => c.q === target?.q && c.r === target?.r);
  }

  plan(u, handUid, target) {
    const inst = u.cards.hand.find((c) => c.uid === handUid);
    if (!inst || this.whyNot(u, inst)) return false;
    const card = inst.card; const from = this.projected(u);
    const T = this.targetsFor(u, card, from);
    let entry = { inst, from, to: from, target: null, targetUid: null, extra: 0 };
    if (T.mode !== 'none') {
      const hit = T.cells.find((c) => c.q === target?.q && c.r === target?.r);
      if (!hit) return false;
      entry.target = { q: hit.q, r: hit.r }; entry.targetUid = hit.uid || null;
      const f0 = card.fx[0].t;
      if (f0 === 'move' || f0 === 'teleport') entry.to = entry.target;
      if (f0 === 'dash') entry.to = this.dashDest(u, from, this.units.find((x) => x.uid === hit.uid));
    }
    u.cards.takeFromHand(handUid);
    u.energy -= card.cost; u.mp -= card.mp;
    u.plan.push(entry);
    return true;
  }

  unplan(u) {
    const e = u.plan.pop(); if (!e) return false;
    u.energy += e.inst.card.cost + (e.extra || 0); u.mp += e.inst.card.mp;
    u.cards.returnToHand(e.inst);
    return true;
  }

  // Charge: the last planned card, if it can be charged, takes one more (or one fewer) Action Slot.
  // Each extra slot rolls one more die.
  chargePlan(u, d) {
    const e = u.plan[u.plan.length - 1]; if (!e || !e.inst.card.charge) return false;
    const x = (e.extra || 0) + d; if (x < 0 || x > 2 || (d > 0 && u.energy < d)) return false;
    e.extra = x; u.energy -= d;
    return true;
  }

  async execute(u) {
    if (this.busy || !u.plan.length) return;
    this.busy = true;
    const plan = u.plan; u.plan = [];
    for (let i = 0; i < plan.length; i++) {
      const e = plan[i];
      u.slotsUsed += e.inst.card.cost + (e.extra || 0);
      if (u.alive && !this.result) await this.resolveCard(u, e, i);
      u.cards.spend(e.inst);
      await this.emit('cardSpent', { unit: u, inst: e.inst, slot: u.slotsUsed - 1 });
      this.checkEnd();
    }
    this.busy = false;
    this._afterAction(u);
  }

  _afterAction(u) {
    this.checkEnd();
    if ((this.result || !u.alive) && this._endTurn) this.finishTurn();
    else this.emit('refresh', { unit: u });
  }

  finishTurn() { const f = this._endTurn; this._endTurn = null; f?.(); }

  async endHeroTurn(u) {
    if (this.busy || this.current !== u || !this._endTurn) return;
    if (u.plan.length) await this.execute(u);
    if (this._endTurn) this.finishTurn();
  }

  async useItem(u, id) {
    const inv = u.hero?.owner ? { cons: (u.hero.cons ||= {}) } : this.inv; // co-op: each hero carries its own potions
    if (this.busy || u.itemUsed || !inv || !(inv.cons[id] > 0)) return false;
    const use = CONSUMABLES[id].use;
    this.busy = true; u.itemUsed = true;
    inv.cons[id]--; if (inv.cons[id] <= 0) delete inv.cons[id];
    await this.emit('item', { unit: u, id });
    if (use.healPct) await this.heal(u, u, Math.round(u.maxHp * use.healPct), true);
    if (use.mp) { u.mp = Math.min(u.maxMp, u.mp + use.mp); await this.emit('text', { unit: u, text: `+${use.mp} MP`, color: '#6aa8ff' }); }
    if (use.cleanse) this.cleanse(u);
    if (use.block) await this.addBlock(u, use.block);
    if (use.bomb) {
      const t = this.enemies().sort((a, b) => this.dist(u, a) - this.dist(u, b))[0];
      if (t) { await this.emit('cast', { unit: u, card: { name: t('Alchemist Bomb'), el: 'fire', proj: 'fire', cat: 'attack' }, cells: this.cellsOf(t), targets: [t], target: this.nearestCell(u, t) }); await this.applyDamage(u, t, use.bomb, { el: 'fire', tags: [] }); }
    }
    this.busy = false;
    this._afterAction(u);
    return true;
  }

  // ───────── card resolution ─────────
  async resolveCard(u, e, slot) {
    const card = e.inst.card;
    const from = { q: u.q, r: u.r };
    let target = e.target; let tUnit = e.targetUid ? this.units.find((x) => x.uid === e.targetUid) : null;
    const T = this.targetsFor(u, card, from);
    if (T.mode === 'unit') {
      if (!tUnit || !tUnit.alive || !T.cells.some((c) => c.uid === tUnit.uid)) {
        const alt = T.cells[0];
        if (!alt) { await this.emit('text', { unit: u, text: t('{name} fizzled', { name: card.name }), color: '#aaa' }); return; }
        tUnit = this.units.find((x) => x.uid === alt.uid);
      }
      target = tUnit === u ? from : this.nearestCell(from, tUnit);
    } else if (T.mode === 'hex' || T.mode === 'dir') {
      if (!T.cells.some((c) => c.q === target.q && c.r === target.r)) { await this.emit('text', { unit: u, text: t('{name} fizzled', { name: card.name }), color: '#aaa' }); return; }
    }
    if (target && !Hex.hexEq(target, from)) u.facing = Hex.directionTo(from, target);
    const comboCat = card.combo && u.lastCat === card.combo.after;
    if (u.status.stealth && card.cat === 'attack') delete u.status.stealth;
    await this.emit('cardPlay', { unit: u, card, slot, combo: comboCat });
    // the dice are rolled and read before the hero moves, so a charge lands as one motion: roll, rush, hit
    const hasEffect = card.fx.some((f) => !['move', 'teleport', 'dash'].includes(f.t));
    const dice = hasEffect ? this.rollDice(u, card, e.extra || 0) : null; // only the side playing the card rolls
    if (dice) await this.emit('dice', { unit: u, card, dice });

    // movement component first
    const f0 = card.fx[0].t;
    if (f0 === 'move') {
      const path = Hex.findPath(from, target, (h) => this.moveCost(u, h));
      if (path) await this.moveUnit(u, path);
    } else if (f0 === 'teleport') {
      await this.emit('teleport', { unit: u, to: target, el: card.el });
      u.q = target.q; u.r = target.r;
      await this.emit('teleportIn', { unit: u, el: card.el });
    } else if (f0 === 'dash') {
      const dest = this.dashDest(u, from, tUnit);
      if (dest && !Hex.hexEq(dest, from)) { await this.emit('dash', { unit: u, to: dest }); u.q = dest.q; u.r = dest.r; }
      u.facing = Hex.directionTo(u, this.nearestCell(u, tUnit));
    }
    const origin = { q: u.q, r: u.r };
    let cells; let victims;
    if (card.tg === 'self' && card.shape === 'single') { cells = [origin]; victims = [u]; }
    else if (card.shape === 'single') {
      cells = tUnit ? this.cellsOf(tUnit) : [target]; victims = tUnit ? [tUnit] : [];
    } else {
      cells = this.shapeCells(card, origin, target || origin);
      const pool = card.allies ? this.alliesOf(u) : this.foesOf(u);
      victims = pool.filter((v) => this.cellsOf(v).some((c) => cells.some((x) => Hex.hexEq(x, c))));
      if (card.allies && !victims.includes(u)) victims.unshift(u);
    }
    if (hasEffect) await this.emit('cast', { unit: u, card, cells, targets: victims, target: target || origin });

    const evaded = new Set(); const diceHit = new Set();
    let firstDmg = true;
    for (const f of card.fx) {
      const tgts = f.self ? [u] : victims;
      switch (f.t) {
        case 'dmg': {
          let spent = 0;
          if (f.spendBlock && u.block > 0) { spent += u.block; u.block = 0; await this.emit('heal', { tgt: u, amount: 0 }); }
          if (f.spendMp) { const n = Math.floor(u.mp / f.spendMp); spent += n; u.mp -= n * f.spendMp; }
          for (const v of tgts) {
            for (let i = 0; i < (f.hits || 1); i++) {
              if (!v.alive) break;
              let raw = f.v + (f.s ? u.stats[f.s] : 0); // small fixed bonus; the dice carry the hit
              if (f.fromBlock) raw += u.block * f.fromBlock;
              if (comboCat && firstDmg && card.combo.bonus.dmg) raw += card.combo.bonus.dmg;
              const diceFirst = dice && !diceHit.has(v); // dice bonus lands once per target, on its first hit
              if (diceFirst) { diceHit.add(v); raw += dice.dmgBonus; }
              // conditional bonuses: each rewards a way of playing, not a bigger number
              if (f.ifStatus && f.ifStatus.sts.some((st) => v.status[st])) raw += f.ifStatus.v;
              if (f.perStatus && v.status[f.perStatus.st]) { raw += v.status[f.perStatus.st].n * f.perStatus.v; if (f.perStatus.consume) delete v.status[f.perStatus.st]; }
              if (f.perHand && u.cards) raw += u.cards.hand.length * f.perHand;
              if (f.wounded) raw += Math.floor((1 - u.hp / u.maxHp) * 4) * f.wounded;
              if (f.far && this.dist(u, v) >= f.far.d) raw += f.far.v;
              if (f.alone && !this.alliesOf(v).some((x) => x !== v && x.alive && this.dist(x, v) <= 1)) raw += f.alone;
              if (spent) { raw += spent; spent = 0; } // Block or MP paid into the blow: once, on the first hit
              if (f.execute && v.hp / v.maxHp <= f.execute) raw *= 2;
              const res = await this.hit(u, v, { raw, el: card.el, critBonus: f.crit || 0, forceCrit: diceFirst && dice.crit, drain: f.drain, aoe: card.shape !== 'single', tags: comboCat && firstDmg ? ['Combo!'] : [] });
              if (res.evaded) evaded.add(v);
            }
          }
          firstDmg = false; break;
        }
        case 'block': for (const v of tgts) await this.addBlock(v, Math.round(f.v + (dice?.supBonus || 0))); break;
        case 'heal': for (const v of tgts) if (v.alive) await this.heal(u, v, f.v + (f.s ? u.stats[f.s] : 0) + (dice?.supBonus || 0)); break;
        case 'status': for (const v of tgts) if (v.alive && !evaded.has(v)) await this.addStatus(u, v, f.st, f.n + (dice?.surge && !NO_STACK.includes(f.st) ? dice.surge : 0)); break;
        case 'push': case 'pull': for (const v of tgts) if (v.alive && !evaded.has(v)) await this.shove(u, v, f.v + (f.t === 'push' ? dice?.push || 0 : 0), f.t === 'pull'); break;
        case 'draw': { const d = []; for (let i = 0; i < f.v; i++) { const c = u.cards.drawOne(); if (c) d.push(c); } await this.emit('draw', { unit: u, drawn: d }); break; }
        case 'energy': u.energy += f.v; await this.emit('text', { unit: u, text: t('+{n} Action Slot', { n: f.v }), color: '#ffd76a' }); break;
        case 'mp': u.mp = Math.min(u.maxMp, u.mp + f.v); await this.emit('text', { unit: u, text: `+${f.v} MP`, color: '#6aa8ff' }); break;
        case 'cleanse': for (const v of tgts) { this.cleanse(v); await this.emit('text', { unit: v, text: t('Cleansed'), color: '#bfffe0' }); } break;
        case 'taunt': for (const v of this.foesOf(u)) if (this.dist(u, v) <= card.size) await this.addStatus(u, v, 'taunt', 2); break;
        case 'selfdmg': await this.applyDamage(null, u, f.v, { el: 'neutral', dot: true, tags: [] }); break;
        case 'summon': await this.summon(u, f.id, target); break;
        case 'revive': await this.revive(u, f.pct); break;
        // the target's burns, poisons or wounds jump to every enemy next to it
        case 'spread': for (const v of tgts) for (const st of f.sts) { const sv = v.status[st]; if (!sv) continue; for (const o of this.alliesOf(v)) if (o !== v && o.alive && this.dist(o, v) <= 1) await this.addStatus(u, o, st, sv.n); } break;
        case 'breakBlock': for (const v of tgts) if (v.alive && v.block > 0) { v.block = 0; await this.emit('text', { unit: v, text: t('Guard broken'), color: '#9fc8ff' }); await this.emit('heal', { tgt: v, amount: 0 }); } break;
        // cards on cooldown come back sooner
        case 'cool': if (u.cards) { for (const e of u.cards.cooldown) e.left -= f.v; u.cards.cooldown = u.cards.cooldown.filter((e) => { if (e.left > 0) return true; u.cards.discard.push(e.inst); return false; }); await this.emit('text', { unit: u, text: t('Cooldowns -{n}', { n: f.v }), color: '#ffd76a' }); await this.emit('draw', { unit: u, drawn: [] }); } break;
        // a card comes back from the discard pile
        case 'recall': if (u.cards) { const d = []; for (let i = 0; i < f.v && u.cards.discard.length && u.cards.hand.length < 7; i++) { const c = u.cards.discard.splice(Math.floor(this.rng.float() * u.cards.discard.length), 1)[0]; u.cards.hand.push(c); d.push(c); } await this.emit('draw', { unit: u, drawn: d }); } break;
        default: break;
      }
    }
    if (comboCat && card.combo.bonus.status) for (const v of victims) if (v.alive && !evaded.has(v)) await this.addStatus(u, v, card.combo.bonus.status.st, card.combo.bonus.status.n);
    u.lastCat = card.cat;
  }

  async moveUnit(u, path) {
    if (!path || !path.length) return;
    await this.emit('move', { unit: u, path });
    const last = path[path.length - 1];
    u.facing = Hex.directionTo(path.length > 1 ? path[path.length - 2] : u, last);
    u.q = last.q; u.r = last.r;
    if (u.status.bleed && u.alive) await this.applyDamage(null, u, Math.max(1, Math.round(u.status.bleed.n * u.status.bleed.p)), { el: 'neutral', dot: true, tags: ['Bleed'] });
  }

  async shove(src, v, n, pull) {
    if (v.size > 1 || v.construct || v.nest) return;
    const sc = this.nearestCell(v, src);
    let d = Hex.directionTo(sc, v); if (pull) d = (d + 3) % 6;
    let pos = { q: v.q, r: v.r }; let moved = 0; let wall = null;
    for (let i = 0; i < n; i++) {
      const nx = Hex.neighbor(pos, d);
      if (!this.canStand(v, nx)) { wall = nx; break; }
      if (pull && this.dist(src, v, nx) < 1) break;
      pos = nx; moved++;
    }
    if (moved) { await this.emit('shove', { unit: v, to: pos }); v.q = pos.q; v.r = pos.r; }
    // Slam: a knockback that is stopped short hurts — 1 damage for every hex it could not travel.
    // Whoever it was shoved into takes 1 as well.
    if (!pull && wall && moved < n) {
      const into = this.unitAt(wall, v);
      await this.applyDamage(src, v, n - moved, { el: 'neutral', tags: ['Slam'] });
      if (into && into.alive) await this.applyDamage(src, into, 1, { el: 'neutral', tags: ['Slam'] });
    }
  }

  async summon(owner, id, at) {
    if (!this.canStand({ size: 1 }, at) || this.unitAt(at)) return;
    const u = this._monsterUnit(id);
    const bonus = 1 + (owner.passives.turretBonus || 0);
    u.maxHp = u.hp = Math.round((u.hp + Math.floor(owner.level / 3)) * bonus);
    u.stats.atk = Math.round((owner.stats.atk + 2) * bonus);
    u.owner = owner.uid; u.q = at.q; u.r = at.r; u.facing = owner.facing; u.level = owner.level;
    this.units.push(u);
    await this.emit('spawn', { unit: u });
  }

  async spawnMinion(boss, id) {
    const u = this._monsterUnit(id, { minion: true });
    const spots = [];
    for (const c of this.cellsOf(boss)) for (const h of Hex.spiral(c, 2)) if (this.canStand(u, h) && !spots.some((s) => Hex.hexEq(s, h))) spots.push(h);
    if (!spots.length) return null;
    const tgt = this.heroes()[0];
    spots.sort((a, b) => (tgt ? Hex.distance(a, tgt) - Hex.distance(b, tgt) : 0));
    const at = spots[Math.min(spots.length - 1, this.rng.int(0, 2))];
    u.q = at.q; u.r = at.r; u.facing = 3; u.from = boss.uid;
    this.units.push(u);
    await this.emit('spawn', { unit: u });
    return u;
  }

  async revive(caster, pct) {
    const fallen = this.units.filter((x) => x.hero && !x.alive);
    if (!fallen.length) { await this.heal(caster, caster, caster.maxHp * 0.25); return; }
    for (const f of fallen) {
      const spot = Hex.spiral(caster, 3).find((h) => !Hex.hexEq(h, caster) && this.canStand(f, h));
      if (!spot) continue;
      f.alive = true; f.hp = Math.round(f.maxHp * pct); f.status = {}; f.block = 0; f.q = spot.q; f.r = spot.r;
      await this.emit('spawn', { unit: f, revive: true });
    }
  }

  async constructAct(u) {
    if (u.monsterId !== 'turret') return;
    const t = this.enemies().filter((e) => this.dist(u, e) <= 4).sort((a, b) => this.dist(u, a) - this.dist(u, b))[0];
    if (!t) return;
    const tc = this.nearestCell(u, t);
    u.facing = Hex.directionTo(u, tc);
    await this.emit('cast', { unit: u, card: { name: t('Arc Shot'), el: 'fire', proj: 'fire', cat: 'attack' }, cells: [tc], targets: [t], target: tc });
    await this.hit(u, t, { raw: u.stats.atk, el: 'fire', noEvade: true, tags: [] });
  }

  // ───────── dice ─────────
  // Heroes roll the dice printed on the card (see diceOf in data/cards.js); the faces' values are
  // added as-is to the card's small flat value. Monsters roll grey dice for their attacks.
  monsterRoll(u) {
    let sum = 0; for (let i = 0; i < (u.def?.dice || 1); i++) sum += this.rng.pick(MONSTER_DIE);
    return sum;
  }

  // Dice twists:
  //   Charge — each extra Action Slot spent on a card adds a die.
  //   Match  — dice that land on the same number (blanks excluded) add +1 for each extra matching die.
  //   Impact — on a card that pushes, every ✸ face knocks the target back one hex further.
  rollDice(u, card, extra = 0) {
    if (!u.hero) return null;
    const d = diceOf(card); if (!d) return null;
    const faces = Array.from({ length: Math.min(6, d.n + extra) }, () => this.rng.pick(DICE[d.color]));
    const groups = {}; faces.forEach((f) => { if (f.v > 0) groups[f.v] = (groups[f.v] || 0) + 1; });
    const match = Object.values(groups).reduce((s, k) => s + (k - 1), 0);
    const push = card.fx.some((f) => f.t === 'push') ? faces.filter((f) => f.k === 'crit').length : 0;
    const hasStack = card.fx.some((f) => f.t === 'status' && !f.self && !NO_STACK.includes(f.st));
    const sum = faces.reduce((s, f) => s + f.v, 0);
    const stars = faces.filter((f) => f.k === 'star').length;
    const total = sum * (1 + stars) + match;
    const surge = hasStack ? faces.filter((f) => f.k === 'surge').length : 0;
    const off = d.color !== 'green';
    return { color: d.color, faces, sum, total, match, push, charge: extra, crit: faces.some((f) => f.k === 'crit'), surge, stars, dmgBonus: off ? total : 0, supBonus: off ? 0 : total };
  }

  // ───────── damage / heal / status ─────────
  async hit(src, tgt, o) {
    if (!tgt.alive) return { dmg: 0 };
    const tags = [...(o.tags || [])];
    if (!o.noEvade) {
      let eva = tgt.stats.eva + (tgt.status.stealth ? 50 : 0);
      if (tgt.status.stun || tgt.status.frozen || tgt.status.root || tgt.construct) eva = 0;
      if (this.rng.chance(eva / 100)) { await this.emit('miss', { src, tgt }); return { dmg: 0, evaded: true }; }
    }
    let dmg = o.raw; const el = o.el || 'neutral';
    const P = src?.passives || {};
    dmg += src.status.strength?.n || 0;
    if (src.status.weak) dmg *= 0.75;
    if (P.dmgPct) dmg *= 1 + P.dmgPct;
    if (P.elemPct?.[el]) dmg *= 1 + P.elemPct[el];
    if (P.bossDmg && tgt.rank === 'mvp') dmg *= 1 + P.bossDmg;
    // elemental affinity
    if (tgt.weak.includes(el)) { dmg *= 1.5; tags.push('Weak!'); }
    else if (tgt.resist.includes(el)) { dmg *= 0.5; tags.push('Resist'); }
    // elemental synergies
    const cm = 1 + (P.comboPct || 0);
    let combo = null; const post = [];
    if (el === 'fire' && (tgt.status.chill || tgt.status.frozen)) { combo = 'Melt'; dmg *= 1 + 0.5 * cm; delete tgt.status.chill; delete tgt.status.frozen; }
    else if (el === 'ice' && tgt.status.burn) { combo = 'Quench'; dmg *= 1 + 0.3 * cm; delete tgt.status.burn; post.push(() => this.addStatus(src, tgt, 'weak', 2)); }
    else if (el === 'earth' && (tgt.status.frozen || tgt.status.chill)) { combo = 'Shatter'; dmg *= 1 + 0.4 * cm; delete tgt.status.chill; delete tgt.status.frozen; }
    else if (el === 'fire' && tgt.status.poison) { combo = 'Wildfire'; dmg += tgt.status.poison.n * tgt.status.poison.p * 2 * cm; delete tgt.status.poison; }
    else if (el === 'wind' && tgt.status.burn) { combo = 'Firestorm'; const b = tgt.status.burn; post.push(async () => { for (const o2 of this.alliesOf(tgt)) if (o2 !== tgt && this.dist(tgt, o2) <= 1) await this.addStatus(src, o2, 'burn', Math.max(1, b.n)); }); dmg *= 1.15; }
    else if (el === 'shadow' && tgt.status.mark) { combo = 'Eclipse'; post.push(() => this.addStatus(src, tgt, 'weak', 2)); }
    else if (el === 'holy' && (tgt.status.weak || tgt.status.vulnerable)) { combo = 'Judgment'; dmg *= 1 + 0.25 * cm; }
    if (combo) { tags.push(combo + '!'); if (src.side === 'hero') this.combos++; }
    // crit / mark / vulnerable
    let crit = !!o.forceCrit || this.rng.chance((src.stats.crit + (o.critBonus || 0)) / 100);
    if (tgt.status.mark) { crit = true; dmg *= 1.5; delete tgt.status.mark; }
    if (crit) dmg *= 1.5 + (P.critDmg || 0);
    if (tgt.status.vulnerable) dmg *= 1.25;
    // defense
    const tdef = tgt.size === 1 ? (this.terrain(tgt)?.def || 0) : 0;
    dmg = Math.max(1, Math.round(dmg) - tgt.stats.def - tdef); // DEF is flat armour; a hit always does at least 1
    const res = await this.applyDamage(src, tgt, dmg, { el, crit, tags, combo });
    if (res.dealt > 0) {
      const ls = (P.lifesteal || 0) + (o.drain || 0);
      if (ls && src.alive) await this.heal(src, src, Math.max(1, res.dealt * ls), true);
      if (tgt.passives.thorns && src.alive && !o.aoe && this.dist(src, tgt) <= 1) await this.applyDamage(null, src, tgt.passives.thorns, { el: 'neutral', dot: true, tags: ['Thorns'] });
      if (P.onHitStatus && tgt.alive) await this.addStatus(src, tgt, P.onHitStatus.st, P.onHitStatus.n);
    }
    for (const fn of post) if (tgt.alive) await fn();
    return { dmg: res.dealt, crit };
  }

  async applyDamage(src, tgt, dmg, { el = 'neutral', crit = false, tags = [], dot = false, combo = null } = {}) {
    if (!tgt.alive) return { dealt: 0 };
    let blocked = 0;
    if (tgt.block > 0 && !dot) { blocked = Math.min(tgt.block, dmg); tgt.block -= blocked; dmg -= blocked; }
    tgt.hp = Math.max(0, tgt.hp - dmg);
    const killed = tgt.hp <= 0;
    await this.emit('hit', { src, tgt, dmg, blocked, crit, el, tags, dot, combo, killed });
    if (killed) await this.kill(tgt, src);
    else if (tgt.rank === 'mvp' && tgt.phase === 1 && tgt.hp <= tgt.maxHp * 0.5) {
      tgt.phase = 2; this.cleanse(tgt); tgt.block += Math.round(tgt.maxHp * 0.08);
      tgt.intent = null;
      await this.emit('phase', { unit: tgt });
      tgt.intent = chooseIntent(this, tgt);
      await this.emit('intent', { unit: tgt });
    }
    return { dealt: dmg, killed };
  }

  async kill(u, src) {
    u.alive = false; u.status = {}; u.block = 0; u.intent = null;
    if (u.side === 'enemy') this.kills.push(u);
    await this.emit('death', { unit: u, src });
    // constructs die with their owner
    if (u.hero) for (const c of this.units) if (c.alive && c.owner === u.uid) await this.kill(c, null);
    // the brood scatters when its MVP falls (no spoils for those)
    if (u.rank === 'mvp' && this.kind === 'boss') for (const c of this.enemies()) {
      c.alive = false; c.status = {}; c.block = 0; c.intent = null;
      await this.emit('death', { unit: c, src: null, rout: true });
    }
  }

  async heal(src, tgt, amount, quiet = false) {
    if (!tgt.alive) return;
    let v = amount * (1 + (src?.passives?.healPct || 0));
    v = Math.round(Math.min(tgt.maxHp - tgt.hp, v));
    tgt.hp += v;
    if (v > 0 || !quiet) await this.emit('heal', { src, tgt, amount: v });
  }

  async addBlock(u, v) {
    if (!u.alive) return;
    u.block += v;
    await this.emit('block', { unit: u, amount: v });
  }

  cleanse(u) { for (const st of Object.keys(u.status)) if (STATUS_INFO[st]?.debuff) delete u.status[st]; }

  async addStatus(src, tgt, st, n) {
    if (!tgt.alive || tgt.construct) return;
    const hard = ['stun', 'frozen', 'root'].includes(st);
    if (hard && (tgt.rank === 'mvp' || tgt.rank === 'mini')) {
      if ((tgt.ccUntil || 0) >= this.round) { await this.emit('text', { unit: tgt, text: t('Resisted'), color: '#bbb' }); return; }
      tgt.ccUntil = this.round + 3;
    }
    n += src?.passives?.statusBonus?.[st] || 0;
    const power = 1; // one point per stack, whoever applied it
    const cur = tgt.status[st];
    if (NO_STACK.includes(st)) tgt.status[st] = { n: Math.max(cur?.n || 0, n), p: power, by: src?.uid };
    else tgt.status[st] = { n: (cur?.n || 0) + n, p: Math.max(cur?.p || 0, power), by: src?.uid };
    if (st === 'chill' && tgt.status.chill.n >= 3) {
      delete tgt.status.chill;
      await this.emit('status', { unit: tgt, st: 'chill', n });
      return this.addStatus(src, tgt, 'frozen', 1);
    }
    await this.emit('status', { unit: tgt, st, n });
  }

  // ───────── monster actions (called by AI) ─────────
  // The fixed part of a monster attack; its grey dice are rolled on top when it lands.
  intentPower(u, it) { return Math.round(u.stats.atk * (it.dmg || 0)); }

  async monsterAttack(u, tgt, it) {
    const tc = this.nearestCell(u, tgt);
    u.facing = Hex.directionTo(this.nearestCell(tc, u), tc);
    await this.emit('cast', { unit: u, card: { name: it.name, el: it.el || u.el, proj: (it.range || 1) > 1 ? (it.el || u.el || 'arcane') : null, cat: 'attack' }, cells: this.cellsOf(tgt), targets: [tgt], target: tc, monster: true });
    const roll = this.monsterRoll(u); // lands once, on the first hit
    for (let i = 0; i < (it.hits || 1); i++) {
      if (!tgt.alive) break;
      const res = await this.hit(u, tgt, { raw: this.intentPower(u, it) + (i === 0 ? roll : 0), el: it.el || 'neutral', drain: it.drain, tags: i === 0 ? ['🎲 ' + roll] : [] });
      if (!res.evaded && it.status && tgt.alive && i === 0) await this.addStatus(u, tgt, it.status.st, it.status.n);
    }
  }

  async monsterAoe(u, it, cells, origin) {
    const victims = this.heroSide().filter((v) => this.cellsOf(v).some((c) => cells.some((x) => Hex.hexEq(x, c))));
    await this.emit('cast', { unit: u, card: { name: it.name, el: it.el || u.el, cat: 'attack', shape: it.shape, size: it.size, big: true }, cells, targets: victims, target: origin, monster: true });
    const roll = this.monsterRoll(u); // one roll for the whole area
    for (const v of victims) {
      const res = await this.hit(u, v, { raw: this.intentPower(u, it) + roll, el: it.el || 'neutral', aoe: true, tags: ['🎲 ' + roll] });
      if (!res.evaded && it.status && v.alive) await this.addStatus(u, v, it.status.st, it.status.n);
    }
  }
}

export { FOOT, ELEMENTS };
