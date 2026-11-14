// Stage Manager — exploration runs, encounter generation, rewards, shops, events, progression.
import { RNG, hashStr } from '../core/util.js';
import { t } from '../core/i18n.js';
import * as Hex from '../engine/hex.js';
import { STAGE_BY_ID, STAGES, parseLayout, exploreCell } from '../data/stages.js';
import { MONSTERS } from '../data/monsters.js';
import { CARDS, RARITY, MAX_CARD_LEVEL } from '../data/cards.js';
import { BASES, makeEquipment, makeUnique, rollRarity, CONSUMABLES, MATERIALS } from '../data/items.js';
import { EVENTS } from '../data/events.js';
import { CLASSES } from '../data/classes.js';
import { G, touch, addCard, addItem, addConsumable, addMaterial, healParty, progress, myHeroes } from './state.js';
import { grantExp, computeStats } from './character.js';

export const NODE_INFO = {
  M: { type: 'monster', name: 'Monsters', icon: 'sword', color: '#e05a4a' },
  m: { type: 'mini', name: 'Mini Boss', icon: 'horns', color: '#ff8a2a' },
  B: { type: 'boss', name: 'MVP Boss', icon: 'crown', color: '#ff3050' },
  T: { type: 'treasure', name: 'Treasure', icon: 'chest', color: '#ffd24a' },
  R: { type: 'resource', name: 'Resources', icon: 'gem', color: '#6fe0c0' },
  '?': { type: 'event', name: 'Unknown', icon: 'question', color: '#c9a0ff' },
  H: { type: 'rest', name: 'Rest Site', icon: 'camp', color: '#7fe08a' },
  $: { type: 'shop', name: 'Merchant', icon: 'coin', color: '#ffc050' },
  '*': { type: 'shrine', name: 'Shrine', icon: 'shrine', color: '#9ad8ff' },
};

export const MINI_NEEDS = 2; // monster groups to beat before a stage's mini boss can be challenged
export class StageManager {
  constructor() { this.stage = null; this.cells = new Map(); }

  get run() { return G.state.run; }

  enter(stageId, { fresh = false } = {}) {
    const st = G.state;
    this.stage = STAGE_BY_ID[stageId];
    this.cells = new Map();
    for (const c of parseLayout(this.stage.layout)) {
      const info = NODE_INFO[c.ch];
      const k = Hex.key(c.q, c.r); const e = exploreCell(this.stage, c.ch, hashStr(k + this.stage.id));
      this.cells.set(k, { q: c.q, r: c.r, ch: c.ch, walk: e.walk, terrain: e.terrain, node: info ? { ...info } : null });
    }
    // (a save made on an older map layout may point at a tile that no longer exists)
    const here = st.run && st.run.stageId === stageId ? this.cells.get(Hex.key(st.run.pos.q, st.run.pos.r)) : null;
    if (fresh || !st.run || st.run.stageId !== stageId || !here || !here.walk || st.run.layout !== this.stage.layout.join('').length) {
      const start = [...this.cells.values()].find((c) => c.ch === 'S');
      st.run = { stageId, seed: (Math.random() * 1e9) | 0, pos: { q: start.q, r: start.r }, cleared: {}, seen: {}, shop: {}, layout: this.stage.layout.join('').length };
    }
    st.run.shop = st.run.shop || {};
    this.reveal();
    touch();
    return this.stage;
  }

  cell(h) { return this.cells.get(Hex.key(h.q, h.r)); }
  isCleared(c) { return !!this.run.cleared[Hex.key(c.q, c.r)]; }
  activeNode(c) { return c && c.node && !this.isCleared(c) ? c.node : null; }
  blocks(c) { const n = this.activeNode(c); return n && ['monster', 'mini', 'boss'].includes(n.type); }
  startCell() { return [...this.cells.values()].find((c) => c.ch === 'S'); }

  reveal() {
    const p = this.run.pos; const newly = [];
    for (const h of Hex.spiral(p, 3)) {
      const k = Hex.key(h.q, h.r);
      if (this.cells.has(k) && !this.run.seen[k]) { this.run.seen[k] = 1; newly.push(k); }
    }
    return newly;
  }

  // Path for the party token. Stops at the first uncleared node on the way.
  pathTo(dest) {
    const d = this.cell(dest);
    if (!d || !d.walk || !this.run.seen[Hex.key(dest.q, dest.r)]) return null;
    const path = Hex.findPath(this.run.pos, dest, (h) => {
      const c = this.cell(h);
      if (!c || !c.walk || !this.run.seen[Hex.key(h.q, h.r)]) return Infinity;
      if (this.blocks(c) && !Hex.hexEq(h, dest)) return Infinity;
      return 1;
    });
    if (!path) return null;
    const out = [];
    for (const h of path) { out.push(h); if (this.activeNode(this.cell(h))) break; }
    return out;
  }

  rngFor(c, salt = '') { return new RNG(hashStr(`${this.run.seed}:${c.q},${c.r}:${salt}`)); }

  encounterFor(c) {
    const rng = this.rngFor(c, 'enc'); const s = this.stage; const n = G.state.party.length;
    const type = c.node.type;
    // the MVP's guards start spread over the arena and do not come back: one per hero, up to the stage's `guards`
    if (type === 'boss') return { kind: 'boss', enemies: [s.boss, ...Array.from({ length: Math.min(s.guards || 0, n) }, () => rng.pick(s.pool))] };
    if (type === 'mini') {
      const adds = Array.from({ length: n >= 3 ? 2 : 1 }, () => rng.pick(s.pool));
      return { kind: 'mini', enemies: [rng.pick(s.mini), ...adds] };
    }
    const count = Math.min(5, Math.max(2, n + rng.int(0, 1)));
    return { kind: 'normal', enemies: Array.from({ length: count }, () => rng.pick(s.pool)) };
  }
  ambush() {
    const rng = new RNG(); const n = G.state.party.length;
    return { kind: 'normal', enemies: Array.from({ length: 1 + n }, () => rng.pick(this.stage.pool)) };
  }

  // Loot is each player's own luck: never seeded from the map or the clock, which co-op players share.
  luck() { return new RNG((Math.random() * 2 ** 32) >>> 0); }
  // What still stands between the party and a boss node: null when it may be challenged.
  //   mini boss: MINI_NEEDS monster groups beaten in this stage · MVP: every mini boss beaten
  sealOf(c) {
    const type = c?.node?.type; const all = [...this.cells.values()];
    if (type === 'mini') { const won = all.filter((x) => x.node?.type === 'monster' && this.isCleared(x)).length; return won < MINI_NEEDS ? { kind: 'groups', left: MINI_NEEDS - won } : null; }
    if (type === 'boss') return all.some((x) => x.node?.type === 'mini' && !this.isCleared(x)) ? { kind: 'mini' } : null;
    return null;
  }
  markCleared(c) { this.run.cleared[Hex.key(c.q, c.r)] = 1; touch(); }

  // ───── rewards ─────
  cardPool(minRarity = 'common') {
    const classes = new Set(myHeroes().map((h) => h.cls));
    const order = ['common', 'rare', 'epic', 'legendary'];
    return Object.values(CARDS).filter((c) => !c.id.startsWith('r_') && (c.cls === 'any' || classes.has(c.cls)) && order.indexOf(c.rarity) >= order.indexOf(minRarity));
  }
  rollCards(rng, n, minRarity = 'common') {
    const pool = this.cardPool(minRarity); const out = [];
    const w = { common: 10, rare: 4 + this.stage.id, epic: 1 + this.stage.id * 0.8, legendary: 0.5 };
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      const c = rng.weighted(pool.map((x) => ({ w: w[x.rarity], v: x })));
      if (!out.includes(c.id)) out.push(c.id);
    }
    return out;
  }
  rollEquip(rng, luck = 0, minRarity = null) {
    const classes = myHeroes().map((h) => CLASSES[h.cls]);
    const usable = Object.keys(BASES).filter((b) => { const B = BASES[b]; return B.slot === 'accessory' || classes.some((c) => c.weaponTypes.includes(B.type) || c.armorTypes.includes(B.type)); });
    let rar = rollRarity(() => rng.float(), luck);
    const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (minRarity && order.indexOf(rar) < order.indexOf(minRarity)) rar = minRarity;
    return makeEquipment(rng.pick(usable), this.stage.id, rar, () => rng.float());
  }

  battleRewards(battle, c) {
    const st = G.state; const rng = this.luck(); const s = this.stage;
    const kind = battle.kind;
    const r = { exp: 0, gold: 0, shards: 0, items: [], mats: {}, cons: [], cardChoices: null, fixedCards: [], levelUps: [], first: false };
    for (const k of battle.kills) {
      r.exp += k.def.exp * (k.minion ? 0.3 : 1); r.gold += k.def.gold * (k.minion ? 0.3 : 1) * (0.8 + rng.float() * 0.4);
      if (!k.minion && rng.chance(0.35)) { const m = rng.pick(s.mats); r.mats[m] = (r.mats[m] || 0) + 1; }
    }
    r.exp = Math.round(r.exp); r.gold = Math.round(r.gold);
    r.shards = kind === 'boss' ? 40 + s.id * 10 : kind === 'mini' ? 15 + s.id * 3 : rng.int(2, 5);
    if (kind === 'normal') {
      if (rng.chance(0.3)) r.items.push(this.rollEquip(rng));
      if (rng.chance(0.25)) r.cons.push(rng.pick(['potion', 'potion', 'ether', 'antidote']));
      if (rng.chance(0.45)) r.cardChoices = this.rollCards(rng, 3);
    } else if (kind === 'mini') {
      r.items.push(this.rollEquip(rng, 2, 'rare'));
      r.cons.push('hipotion');
      r.cardChoices = this.rollCards(rng, 3, 'rare');
      const m = rng.pick(s.mats); r.mats[m] = (r.mats[m] || 0) + 2;
    } else if (kind === 'boss') {
      r.first = !st.stats.bosses[s.id];
      r.items.push(this.rollEquip(rng, 4, 'epic'));
      if (r.first) { r.items.push(makeUnique(s.rewardUnique)); r.fixedCards.push(s.rewardCard); } else r.shards += 60;
      r.cardChoices = this.rollCards(rng, 3, 'rare');
      s.mats.forEach((m) => { r.mats[m] = (r.mats[m] || 0) + 3; });
      r.cons.push('elixir');
    }
    // apply
    st.gold += r.gold; st.shards += r.shards;
    r.items.forEach(addItem); r.cons.forEach((id) => addConsumable(id));
    Object.entries(r.mats).forEach(([m, n]) => addMaterial(m, n));
    r.fixedCards.forEach((id) => addCard(id));
    myHeroes().forEach((h) => {
      const was = h.hp <= 0;
      if (was) h.hp = Math.round(computeStats(h).hp * 0.25); // fallen heroes get back up
      const lv = grantExp(h, was ? Math.round(r.exp * 0.5) : r.exp);
      if (lv) r.levelUps.push({ hero: h, levels: lv });
    });
    progress('kills', battle.kills.length);
    if (battle.combos) progress('combos', battle.combos);
    if (kind === 'mini') progress('mini', 1);
    if (kind === 'boss') {
      st.stats.bosses[s.id] = true; st.cleared[s.id] = true;
      st.unlocked = Math.max(st.unlocked, Math.min(STAGES.length, s.id + 1));
    }
    st.nextBuff = null;
    if (c) this.markCleared(c);
    touch();
    return r;
  }

  onDefeat() {
    const st = G.state; const lost = Math.round(st.gold * 0.15);
    st.gold -= lost;
    let exp = 0; myHeroes().forEach((h) => { const x = Math.round(h.exp * 0.25); h.exp -= x; exp += x; }); // a quarter of the way to the next level; a level is never lost
    myHeroes().forEach((h) => { const s = computeStats(h); h.hp = Math.round(s.hp * 0.5); h.mp = Math.round(s.mp * 0.5); });
    const start = this.startCell(); st.run.pos = { q: start.q, r: start.r };
    st.nextBuff = null;
    touch();
    return { lost, exp };
  }

  openTreasure(c) {
    const rng = this.luck(); const st = G.state; const s = this.stage;
    const r = { gold: Math.round((30 + rng.int(0, 30)) * Math.pow(1.5, s.id - 1)), shards: rng.int(5, 12) + s.id * 2, items: [this.rollEquip(rng, 1, 'uncommon')], cons: [], mats: {}, cards: [] };
    if (rng.chance(0.6)) r.cons.push(rng.pick(['potion', 'ether', 'bomb', 'hipotion']));
    if (rng.chance(0.4)) r.cards.push(this.rollCards(rng, 1)[0]);
    st.gold += r.gold; st.shards += r.shards; r.items.forEach(addItem); r.cons.forEach((id) => addConsumable(id)); r.cards.forEach((id) => addCard(id));
    progress('chests', 1); this.markCleared(c);
    return r;
  }

  gatherResource(c) {
    const rng = this.luck(); const s = this.stage; const r = { mats: {}, shards: rng.int(4, 10), gold: 0, items: [], cons: [], cards: [] };
    s.mats.forEach((m) => { r.mats[m] = rng.int(1, 3); });
    Object.entries(r.mats).forEach(([m, n]) => addMaterial(m, n));
    G.state.shards += r.shards; this.markCleared(c);
    return r;
  }

  rest(c) { healParty(0.6, 0.6, true); this.markCleared(c); }

  // ───── shop ─────
  shopStock(c) {
    const k = Hex.key(c.q, c.r); const rng = this.rngFor(c, 'shop'); const s = this.stage;
    const bought = (this.run.shop[k] ||= {});
    const stock = [];
    for (let i = 0; i < 4; i++) { const it = this.rollEquip(rng, 1, i === 0 ? 'rare' : 'uncommon'); it.uid = `shop${k}${i}`; stock.push({ key: 'e' + i, kind: 'equip', item: it, price: Math.round(it.value * 1.6) }); }
    this.rollCards(rng, 3).forEach((id, i) => stock.push({ key: 'c' + i, kind: 'card', id, price: Math.round(RARITY[CARDS[id].rarity].craft * (1.2 + s.id * 0.25)) }));
    ['potion', 'hipotion', 'ether', 'antidote', 'bomb', 'elixir'].forEach((id) => stock.push({ key: 'k' + id, kind: 'cons', id, price: Math.round(CONSUMABLES[id].price * (1 + (s.id - 1) * 0.25)), unlimited: true }));
    stock.forEach((x) => { x.sold = !x.unlimited && !!bought[x.key]; });
    return stock;
  }
  buy(c, entry) {
    const st = G.state; if (entry.sold || st.gold < entry.price) return false;
    st.gold -= entry.price;
    if (entry.kind === 'equip') addItem({ ...entry.item, uid: entry.item.uid + Date.now().toString(36) });
    else if (entry.kind === 'card') addCard(entry.id);
    else addConsumable(entry.id);
    if (!entry.unlimited) { this.run.shop[Hex.key(c.q, c.r)][entry.key] = 1; entry.sold = true; }
    touch(); return true;
  }

  // ───── events ─────
  eventFor(c) {
    if (c.node.type === 'shrine') return SHRINE;
    const rng = this.rngFor(c, 'ev');
    return rng.pick(EVENTS);
  }
  canChoose(choice) {
    const st = G.state; const cost = choice.cost;
    if (!cost) return true;
    if (cost.gold && st.gold < cost.gold) return false;
    if (cost.item && !(st.inv.cons[cost.item] > 0)) return false;
    return true;
  }
  // returns { msg, gains:[], fight }
  resolveChoice(c, choice) {
    const st = G.state; const rng = new RNG(); const s = this.stage; const gains = [];
    if (choice.cost?.gold) st.gold -= choice.cost.gold;
    if (choice.cost?.item) { st.inv.cons[choice.cost.item]--; if (st.inv.cons[choice.cost.item] <= 0) delete st.inv.cons[choice.cost.item]; }
    let o = choice.out;
    if (o.chance != null && !rng.chance(o.chance)) o = o.fail || { msg: t('Nothing happens.') };
    const scale = Math.pow(1.5, s.id - 1);
    if (o.gold) { const g = Math.round(o.gold * scale); st.gold += g; gains.push(t('+{n} Gold', { n: g })); }
    if (o.shards) { st.shards += o.shards + s.id * 3; gains.push(t('+{n} Shards', { n: o.shards + s.id * 3 })); }
    if (o.exp) { const e = Math.round(o.exp * scale); myHeroes().forEach((h) => grantExp(h, e)); gains.push(t('+{n} EXP', { n: e })); }
    if (o.healPct) healParty(o.healPct, 0, false);
    if (o.fullHeal) healParty(1, 1, true);
    if (o.mp) myHeroes().forEach((h) => { h.mp = Math.min(computeStats(h).mp, h.mp + o.mp); });
    if (o.dmgPct) myHeroes().forEach((h) => { if (h.hp > 0) h.hp = Math.max(1, h.hp - Math.round(computeStats(h).hp * o.dmgPct)); });
    if (o.buff) { st.nextBuff = o.buff; }
    if (o.skillPoint) { myHeroes().forEach((h) => { h.skillPoints += 1; }); gains.push(t('+1 Skill Point (all heroes)')); }
    if (o.item === 'random-equip') { const it = this.rollEquip(rng, 2, 'rare'); addItem(it); gains.push(it.name); }
    else if (o.item) { addConsumable(o.item); gains.push(CONSUMABLES[o.item].name); }
    if (o.card) { const id = this.rollCards(rng, 1, o.card === 'rare' ? 'rare' : 'common')[0]; addCard(id); gains.push(t('Card: {name}', { name: CARDS[id].name })); }
    if (o.mat) { s.mats.forEach((m) => { addMaterial(m, 2); gains.push(t('2× {name}', { name: MATERIALS[m].name })); }); }
    if (o.upgrade) {
      const ids = Object.keys(st.cards).filter((id) => st.cards[id].lv < MAX_CARD_LEVEL && myHeroes().some((h) => h.deck.includes(id)));
      if (ids.length) { const id = rng.pick(ids); st.cards[id].lv++; progress('upgrade', 1); gains.push(t('{name} upgraded to +{n}', { name: CARDS[id].name, n: st.cards[id].lv })); }
    }
    progress('events', 1);
    if (!o.fight) this.markCleared(c);
    touch();
    // effects on heroes, replayed by co-op guests on their own characters
    const party = { healPct: o.healPct, fullHeal: o.fullHeal, mp: o.mp, dmgPct: o.dmgPct, exp: o.exp ? Math.round(o.exp * scale) : 0, skillPoint: o.skillPoint };
    return { msg: o.msg || '', gains, fight: !!o.fight, party };
  }

  leave() { G.state.run = null; touch(); }
}

const SHRINE = {
  id: 'shrine_asc', title: t('Shrine of Ascension'), icon: 'shrine',
  text: t('A pillar of pale light rises from an altar untouched by the Sundering. It offers a single boon to those who would save the Last World.'),
  choices: [
    { label: t('Renewal — fully restore the party'), out: { fullHeal: true, msg: t('Light washes over you. The party is fully restored.') } },
    { label: t('Wisdom — +1 Skill Point for every hero'), out: { skillPoint: true, msg: t('Ancient knowledge floods your minds.') } },
    { label: t('Mastery — upgrade a random deck card'), out: { upgrade: true, shards: 20, msg: t('Your technique is refined.') } },
  ],
};
