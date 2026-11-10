// Persistent campaign state + helpers (inventory, card collection, quests, autosave hook).
import { bus } from '../core/util.js';
import { createHero, computeStats, canEquip, clampVitals } from './character.js';
import { CARDS, STARTER_DECKS, RARITY, MAX_CARD_LEVEL, upgradeCost, DECK_MIN, DECK_MAX } from '../data/cards.js';
import { QUESTS } from '../data/events.js';
import { CONSUMABLES } from '../data/items.js';

export const SAVE_VERSION = 1;
export const G = { state: null };

export function newGame(party) { // party: [{cls, name}]
  const heroes = party.map((p) => createHero(p.cls, p.name));
  const cards = {};
  heroes.forEach((h) => STARTER_DECKS[h.cls].forEach((id) => { (cards[id] ||= { n: 0, lv: 0 }).n++; }));
  cards.n_sprint = { n: 1, lv: 0 }; cards.n_secondwind = { n: 1, lv: 0 };
  G.state = {
    version: SAVE_VERSION, created: Date.now(), updated: Date.now(), playtime: 0,
    party: heroes, gold: 60, shards: 20,
    inv: { equip: [], cons: { potion: 3, ether: 1 }, mats: {} },
    cards,
    unlocked: 1, cleared: {}, run: null,
    quests: {}, stats: { kills: 0, chests: 0, mini: 0, craft: 0, upgrade: 0, combos: 0, events: 0, bosses: {} },
    nextBuff: null, seenIntro: {}, settings: { music: 0.45, sfx: 0.7 },
  };
  return G.state;
}

export function touch() { if (G.state) { G.state.updated = Date.now(); bus.emit('state:changed'); } }

// Firebase strips empty arrays/objects and nulls — repair shape on load.
export function normalize(s) {
  if (!s) return null;
  s.party = (s.party || []).map((h) => {
    h.alloc = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, ...(h.alloc || {}) };
    h.skills = h.skills || []; h.deck = h.deck || [];
    h.equip = { weapon: null, armor: null, accessory: null, ...(h.equip || {}) };
    return h;
  });
  s.inv = s.inv || {}; s.inv.equip = s.inv.equip || []; s.inv.cons = s.inv.cons || {}; s.inv.mats = s.inv.mats || {};
  s.cards = s.cards || {}; s.cleared = s.cleared || {}; s.quests = s.quests || {}; s.seenIntro = s.seenIntro || {};
  s.stats = { kills: 0, chests: 0, mini: 0, craft: 0, upgrade: 0, combos: 0, events: 0, bosses: {}, ...(s.stats || {}) };
  s.stats.bosses = s.stats.bosses || {};
  s.settings = { music: 0.45, sfx: 0.7, ...(s.settings || {}) };
  if (s.run) { s.run.cleared = s.run.cleared || {}; s.run.seen = s.run.seen || {}; }
  else s.run = null;
  s.nextBuff = s.nextBuff || null;
  return s;
}

// ── Cards ──
export function addCard(id, n = 1) {
  const c = (G.state.cards[id] ||= { n: 0, lv: 0 });
  c.n += n; touch();
}
export const cardLevel = (id) => G.state.cards[id]?.lv || 0;
export function deckCount(hero, id) { return hero.deck.filter((c) => c === id).length; }
export function usedCopies(id) { return G.state.party.reduce((s, h) => s + deckCount(h, id), 0); }
export function canAddToDeck(hero, id) {
  const card = CARDS[id];
  if (!card || (card.cls !== 'any' && card.cls !== hero.cls)) return false;
  if (hero.deck.length >= DECK_MAX) return false;
  return usedCopies(id) < (G.state.cards[id]?.n || 0);
}
export function canRemoveFromDeck(hero) { return hero.deck.length > DECK_MIN; }
export function tryUpgradeCard(id) {
  const st = G.state, c = st.cards[id];
  if (!c || c.lv >= MAX_CARD_LEVEL) return false;
  const cost = upgradeCost(CARDS[id], c.lv);
  if (st.gold < cost.gold || st.shards < cost.shards) return false;
  st.gold -= cost.gold; st.shards -= cost.shards; c.lv++;
  progress('upgrade', 1); touch();
  return true;
}
export function tryCraftCard(id) {
  const st = G.state; const cost = RARITY[CARDS[id].rarity].craft;
  if (st.shards < cost) return false;
  st.shards -= cost; addCard(id); return true;
}
export function tryDismantle(id) {
  const c = G.state.cards[id];
  if (!c || c.n - usedCopies(id) <= 0) return false;
  c.n--; G.state.shards += RARITY[CARDS[id].rarity].shards;
  if (c.n <= 0) delete G.state.cards[id];
  touch(); return true;
}

// ── Inventory ──
export function addItem(item) { G.state.inv.equip.push(item); touch(); }
export function addConsumable(id, n = 1) { G.state.inv.cons[id] = (G.state.inv.cons[id] || 0) + n; touch(); }
export function addMaterial(id, n = 1) { G.state.inv.mats[id] = (G.state.inv.mats[id] || 0) + n; touch(); }
export function equipItem(hero, item) {
  if (!canEquip(hero, item)) return false;
  const inv = G.state.inv.equip; const i = inv.findIndex((x) => x.uid === item.uid);
  if (i < 0) return false;
  inv.splice(i, 1);
  const old = hero.equip[item.slot];
  if (old) inv.push(old);
  hero.equip[item.slot] = item;
  clampVitals(hero); touch(); return true;
}
export function unequip(hero, slot) {
  const it = hero.equip[slot]; if (!it) return;
  hero.equip[slot] = null; G.state.inv.equip.push(it); clampVitals(hero); touch();
}
export function sellItem(item) {
  const inv = G.state.inv.equip; const i = inv.findIndex((x) => x.uid === item.uid);
  if (i < 0) return; inv.splice(i, 1); G.state.gold += Math.round(item.value * 0.4); touch();
}
// Use a consumable outside battle
export function useConsumable(id, hero) {
  const st = G.state; if (!(st.inv.cons[id] > 0)) return false;
  const u = CONSUMABLES[id].use; const s = computeStats(hero);
  if (u.bomb) return false;
  if (hero.hp <= 0 && !u.revive) return false;
  if (u.healPct) hero.hp = Math.min(s.hp, Math.max(hero.hp, 0) + Math.round(s.hp * u.healPct));
  if (u.mp) hero.mp = Math.min(s.mp, hero.mp + u.mp);
  st.inv.cons[id]--; if (st.inv.cons[id] <= 0) delete st.inv.cons[id];
  touch(); return true;
}
export function healParty(pct, mpPct = pct, revive = true) {
  G.state.party.forEach((h) => {
    const s = computeStats(h);
    if (h.hp <= 0 && !revive) return;
    h.hp = Math.min(s.hp, Math.max(0, h.hp) + Math.round(s.hp * pct));
    h.mp = Math.min(s.mp, h.mp + Math.round(s.mp * mpPct));
  });
  touch();
}

// ── Quests ──
export function questValue(q) {
  const st = G.state.stats;
  switch (q.goal.kind) {
    case 'boss': return st.bosses[q.goal.stage] ? 1 : 0;
    case 'level': return Math.max(...G.state.party.map((h) => h.level));
    default: return st[q.goal.kind] || 0;
  }
}
export function questStatus(q) {
  const claimed = !!G.state.quests[q.id];
  const v = Math.min(q.n, questValue(q));
  return { v, done: v >= q.n, claimed };
}
export function claimQuest(q) {
  const s = questStatus(q); if (!s.done || s.claimed) return false;
  G.state.quests[q.id] = true;
  const r = q.reward;
  if (r.gold) G.state.gold += r.gold;
  if (r.shards) G.state.shards += r.shards;
  if (r.item) addConsumable(r.item);
  touch(); return true;
}
export const claimableQuests = () => QUESTS.filter((q) => { const s = questStatus(q); return s.done && !s.claimed; }).length;
export function progress(kind, n = 1) { G.state.stats[kind] = (G.state.stats[kind] || 0) + n; bus.emit('quest:progress'); }
