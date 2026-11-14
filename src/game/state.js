// Persistent player profile (characters + worlds), the play session, and helpers
// (inventory, card collection, quests, autosave hook).
import { bus } from '../core/util.js';
import { t } from '../core/i18n.js';
import { createHero, computeStats, canEquip, clampVitals } from './character.js';
import { CARDS, STARTER_DECKS, RARITY, MAX_CARD_LEVEL, upgradeCost, DECK_MIN, DECK_MAX } from '../data/cards.js';
import { QUESTS } from '../data/events.js';
import { STAGES } from '../data/stages.js';
import { CONSUMABLES, UNIQUES, makeEquipment } from '../data/items.js';

export const SAVE_VERSION = 4;
export const MAX_CHARS = 3;
export const MAX_WORLDS = 6;
// G.profile — everything saved for this player: up to 3 characters and up to 6 worlds.
//   A character owns its hero, gold, shards, bag, card collection, quests and stats.
//   A world owns map progress: unlocked / cleared stages, the current expedition, intros seen.
// G.state — the play session: one world + one character, in the shape the game code uses.
//   In online co-op the party also lists the other players' heroes (remote: true, never saved here).
export const G = { profile: null, state: null };
const CHAR_KEYS = ['gold', 'shards', 'inv', 'cards', 'quests', 'stats'];
const WORLD_KEYS = ['unlocked', 'cleared', 'run', 'seenIntro', 'nextBuff'];
const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function emptyProfile() { return { version: SAVE_VERSION, created: Date.now(), updated: 0, settings: { music: 0.45, sfx: 0.7 }, chars: {}, worlds: {}, last: {} }; }
function touchProfile() { G.profile.updated = Date.now(); bus.emit('state:changed'); }

export function createCharacter(cls, name, gender = 'm') {
  const hero = createHero(cls, name, gender);
  const cards = {};
  STARTER_DECKS[cls].forEach((id) => { (cards[id] ||= { n: 0, lv: 0 }).n++; });
  cards.n_sprint = { n: 1, lv: 0 }; cards.n_secondwind = { n: 1, lv: 0 };
  const c = { id: newId('c'), created: Date.now(), hero, gold: 60, shards: 20, inv: { equip: [], cons: { potion: 3, ether: 1 }, mats: {} }, cards, quests: {},
    stats: { kills: 0, chests: 0, mini: 0, craft: 0, upgrade: 0, combos: 0, events: 0, bosses: {} } };
  G.profile.chars[c.id] = c; touchProfile();
  return c;
}
export function createWorld(name) {
  const w = { id: newId('w'), name, created: Date.now(), unlocked: 1, cleared: {}, run: null, seenIntro: {}, nextBuff: null };
  G.profile.worlds[w.id] = w; touchProfile();
  return w;
}
export function deleteCharacter(id) { delete G.profile.chars[id]; if (G.profile.last.char === id) G.profile.last.char = null; touchProfile(); }
export function deleteWorld(id) { delete G.profile.worlds[id]; if (G.profile.last.world === id) G.profile.last.world = null; touchProfile(); }
export const charList = () => Object.values(G.profile?.chars || {}).sort((a, b) => a.created - b.created);
export const worldList = () => Object.values(G.profile?.worlds || {}).sort((a, b) => a.created - b.created);

// Start playing `worldId` with character `charId` (worldId null: no own world, e.g. a co-op guest).
export function openSession(worldId, charId) {
  const P = G.profile; const c = P.chars[charId]; const w = worldId ? P.worlds[worldId] : null;
  if (!c) return null;
  const st = { worldId, charId, party: [c.hero], settings: P.settings };
  CHAR_KEYS.forEach((k) => { st[k] = c[k]; });
  if (w) { WORLD_KEYS.forEach((k) => { st[k] = w[k]; }); w.lastChar = charId; }
  else Object.assign(st, { unlocked: 1, cleared: {}, run: null, seenIntro: {}, nextBuff: null });
  P.last = { world: worldId || P.last.world || null, char: charId };
  G.state = st;
  return st;
}
// Copy the session back into the profile. world: false keeps a borrowed (co-op host's) world out of the save.
export function commitSession({ world = true } = {}) {
  const st = G.state, P = G.profile; if (!st || !P) return;
  const c = P.chars[st.charId];
  if (c) { c.hero = myHeroes()[0] || c.hero; CHAR_KEYS.forEach((k) => { c[k] = st[k]; }); c.updated = Date.now(); }
  const w = st.worldId && P.worlds[st.worldId];
  if (w && world) { WORLD_KEYS.forEach((k) => { w[k] = st[k]; }); w.updated = Date.now(); }
}
// Heroes this player controls (in co-op the party also lists friends' heroes).
export const myHeroes = (st = G.state) => (st?.party || []).filter((h) => !h.remote);

export function touch() { if (G.state) { G.state.updated = Date.now(); bus.emit('state:changed'); } }

// Firebase strips empty arrays/objects and nulls — repair shapes on load.
export function fixHero(h) {
  h.alloc = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, ...(h.alloc || {}) };
  h.skills = h.skills || []; h.deck = h.deck || [];
  h.equip = { weapon: null, armor: null, accessory: null, ...(h.equip || {}) };
  return h;
}
function fixChar(c) {
  fixHero(c.hero);
  c.inv = c.inv || {}; c.inv.equip = c.inv.equip || []; c.inv.cons = c.inv.cons || {}; c.inv.mats = c.inv.mats || {};
  c.cards = c.cards || {}; c.quests = c.quests || {}; c.gold = c.gold || 0; c.shards = c.shards || 0;
  c.stats = { kills: 0, chests: 0, mini: 0, craft: 0, upgrade: 0, combos: 0, events: 0, bosses: {}, ...(c.stats || {}) };
  c.stats.bosses = c.stats.bosses || {};
  return c;
}
function fixWorld(w) {
  w.unlocked = w.unlocked || 1; w.cleared = w.cleared || {}; w.seenIntro = w.seenIntro || {}; w.nextBuff = w.nextBuff || null;
  // a world that had cleared its last stage when the game was shorter: the stages added since open up
  while (w.cleared[w.unlocked] && w.unlocked < STAGES.length) w.unlocked++;
  if (w.run) { w.run.cleared = w.run.cleared || {}; w.run.seen = w.run.seen || {}; w.run.shop = w.run.shop || {}; } else w.run = null;
  return w;
}
// Version 3 moved the whole game to board-game numbers (HP in the tens, ATK / DEF of +1…+3, one stat
// point per level). An older character keeps its level, cards and items, gets its stat points back to
// spend again, and has its equipment re-rolled at the same base, tier and rarity.
function rescaleItem(it) {
  if (!it || it.kind !== 'equip') return it;
  if (it.uniqueId && UNIQUES[it.uniqueId]) return Object.assign(it, { stats: { ...UNIQUES[it.uniqueId].stats }, passive: UNIQUES[it.uniqueId].passive });
  const n = makeEquipment(it.base, it.tier, it.rarity);
  return Object.assign(it, { stats: n.stats, name: n.name, value: n.value });
}
function rescaleChar(c) {
  const h = c.hero;
  h.alloc = { str: 0, agi: 0, vit: 0, int: 0, dex: 0 }; h.statPoints = Math.max(0, (h.level || 1) - 1);
  Object.values(h.equip).forEach(rescaleItem); c.inv.equip.forEach(rescaleItem);
  const s = computeStats(h); h.hp = s.hp; h.mp = s.mp;
  return c;
}
// Load any save into the current profile shape. A version-1 save (one campaign with a 1–3 hero party)
// becomes one world plus one character per hero; the first hero keeps the gold, bag and cards.
export function normalizeProfile(s) {
  if (!s) return emptyProfile();
  // Version 4 is a fresh start for everyone: before release the game changed too much for old characters to carry over
  // (cards only from loot, upgrades paid with copies, five more stages, new monster numbers). The old save is kept
  // once in this browser under "lw_before_reset"; the settings carry over. Marked as new, so it replaces the cloud copy.
  if ((s.version || 1) < 4) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('lw_before_reset', JSON.stringify(s)); } catch (e) { /* ignore */ }
    const P = emptyProfile(); P.settings = { ...P.settings, ...(s.settings || {}) }; P.updated = Date.now(); return P;
  }
  if (!s.chars && !s.worlds && s.party) {
    const P = emptyProfile(); P.settings = { ...P.settings, ...(s.settings || {}) }; P.updated = s.updated || Date.now();
    P.worlds.w1 = fixWorld({ id: 'w1', name: t('My World'), created: s.created || Date.now(), unlocked: s.unlocked, cleared: s.cleared, run: s.run, seenIntro: s.seenIntro, nextBuff: s.nextBuff, lastChar: 'c1' });
    const heroes = (s.party || []).slice(0, MAX_CHARS);
    // each card goes to the first hero of its class; class-free cards stay with the first hero
    const ownerOf = (id) => Math.max(0, heroes.findIndex((h) => h.cls === CARDS[id]?.cls));
    heroes.forEach((hero, i) => {
      const first = i === 0;
      const cards = Object.fromEntries(Object.entries(s.cards || {}).filter(([id]) => ownerOf(id) === i));
      P.chars['c' + (i + 1)] = fixChar({ id: 'c' + (i + 1), created: (s.created || Date.now()) + i, hero,
        cards, gold: first ? s.gold : 0, shards: first ? s.shards : 0,
        inv: first ? s.inv : { equip: [], cons: {}, mats: {} }, quests: first ? s.quests : {}, stats: first ? s.stats : { bosses: { ...(s.stats?.bosses || {}) } } });
    });
    Object.values(P.chars).forEach(rescaleChar);
    P.last = { world: 'w1', char: 'c1' };
    return P;
  }
  const old = (s.version || 1) < 3;
  s.version = SAVE_VERSION; s.settings = { music: 0.45, sfx: 0.7, ...(s.settings || {}) };
  s.chars = s.chars || {}; s.worlds = s.worlds || {}; s.last = s.last || {};
  Object.values(s.chars).forEach(fixChar); Object.values(s.worlds).forEach(fixWorld);
  if (old) Object.values(s.chars).forEach(rescaleChar);
  return s;
}
// A session snapshot received over the network (co-op) — same repairs as a save.
export function normalize(s) {
  if (!s) return null;
  s.party = (s.party || []).map(fixHero);
  s.inv = s.inv || {}; s.inv.equip = s.inv.equip || []; s.inv.cons = s.inv.cons || {}; s.inv.mats = s.inv.mats || {};
  s.cards = s.cards || {}; s.cleared = s.cleared || {}; s.quests = s.quests || {}; s.seenIntro = s.seenIntro || {};
  s.stats = { kills: 0, chests: 0, mini: 0, craft: 0, upgrade: 0, combos: 0, events: 0, bosses: {}, ...(s.stats || {}) };
  s.stats.bosses = s.stats.bosses || {};
  if (s.run) { s.run.cleared = s.run.cleared || {}; s.run.seen = s.run.seen || {}; s.run.shop = s.run.shop || {}; } else s.run = null;
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
export function usedCopies(id) { return myHeroes().reduce((s, h) => s + deckCount(h, id), 0); }
export function canAddToDeck(hero, id) {
  const card = CARDS[id];
  if (!card || (card.cls !== 'any' && card.cls !== hero.cls)) return false;
  if (hero.deck.length >= DECK_MAX) return false;
  return usedCopies(id) < (G.state.cards[id]?.n || 0);
}
export function canRemoveFromDeck(hero) { return hero.deck.length > DECK_MIN; }
// An upgrade is paid for with a second copy of the card: one that is not in any deck.
export const spareCopy = (id) => { const c = G.state.cards[id]; return !!c && c.n >= 2 && c.n - usedCopies(id) >= 1; };
export function tryUpgradeCard(id) {
  const st = G.state, c = st.cards[id];
  if (!c || c.lv >= MAX_CARD_LEVEL) return false;
  const cost = upgradeCost(CARDS[id], c.lv);
  if (st.gold < cost.gold || st.shards < cost.shards || !spareCopy(id)) return false;
  st.gold -= cost.gold; st.shards -= cost.shards; c.n--; c.lv++; // the spare copy is spent on the upgrade
  progress('upgrade', 1); touch();
  return true;
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
    case 'level': return Math.max(...myHeroes().map((h) => h.level));
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
