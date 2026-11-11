// Character System — heroes, derived stats, levelling, equipment, skill trees.
import { CLASSES, SKILL_TREES, expToNext, MAX_LEVEL } from '../data/classes.js';
import { STARTER_DECKS } from '../data/cards.js';
import { makeEquipment } from '../data/items.js';
import { uid } from '../core/util.js';

const STARTER_GEAR = {
  knight: ['sword', 'heavy'], mage: ['staff', 'robe'], archer: ['bow', 'light'],
  assassin: ['dagger', 'light'], priest: ['mace', 'robe'], blacksmith: ['hammer', 'heavy'],
};

export function createHero(cls, name, gender = 'm') {
  const [w, a] = STARTER_GEAR[cls];
  const hero = {
    id: uid(), cls, gender: gender === 'f' ? 'f' : 'm', name: name || CLASSES[cls].name, level: 1, exp: 0,
    statPoints: 0, skillPoints: 0,
    alloc: { str: 0, agi: 0, vit: 0, int: 0, dex: 0 },
    skills: [],
    equip: { weapon: makeEquipment(w, 1, 'common'), armor: makeEquipment(a, 1, 'common'), accessory: null },
    deck: [...STARTER_DECKS[cls]],
    hp: 0, mp: 0,
  };
  const s = computeStats(hero);
  hero.hp = s.hp; hero.mp = s.mp;
  return hero;
}

export function attributes(hero) {
  const base = CLASSES[hero.cls].base;
  const out = {};
  for (const k of Object.keys(base)) out[k] = base[k] + (hero.alloc[k] || 0);
  return out;
}

export function computeStats(hero) {
  const cls = CLASSES[hero.cls];
  const a = attributes(hero);
  const s = {
    // board-game scale: attack and defence are small bonuses (+1, +2, +3…) added to the dice
    hp: 10 + a.vit + Math.floor(hero.level / 2),
    mp: 10 + a.int * 3 + hero.level * 2,
    atk: Math.floor(a.str / 6 + a.dex / 12),
    matk: Math.floor(a.int / 6),
    def: Math.floor(a.vit / 10),
    spd: 5 + a.agi * 2 + a.dex,
    crit: 5 + a.dex * 1.2,
    eva: a.agi,
    move: cls.move, energy: 3, draw: 0, mpRegen: 2,
    passives: { statusBonus: {}, elemPct: {} },
    attrs: a,
  };
  const applyPassive = (p) => {
    for (const [k, v] of Object.entries(p)) {
      if (k === 'statusBonus' || k === 'elemPct') { for (const [kk, vv] of Object.entries(v)) s.passives[k][kk] = (s.passives[k][kk] || 0) + vv; }
      else if (k in s && typeof s[k] === 'number') s[k] += v;
      else if (typeof v === 'number') s.passives[k] = (s.passives[k] || 0) + v;
      else s.passives[k] = v;
    }
  };
  for (const slot of ['weapon', 'armor', 'accessory']) {
    const it = hero.equip[slot];
    if (!it) continue;
    for (const [k, v] of Object.entries(it.stats)) if (k in s) s[k] += v;
    if (it.passive) applyPassive(it.passive);
  }
  const tree = SKILL_TREES[hero.cls];
  for (const id of hero.skills) { const n = tree.find((x) => x.id === id); if (n) applyPassive(n.p); }
  s.crit = Math.min(75, Math.round(s.crit)); s.eva = Math.min(50, Math.round(s.eva));
  return s;
}

// Returns number of levels gained
export function grantExp(hero, amount) {
  let gained = 0;
  if (hero.level >= MAX_LEVEL) return 0;
  hero.exp += amount;
  while (hero.level < MAX_LEVEL && hero.exp >= expToNext(hero.level)) {
    hero.exp -= expToNext(hero.level);
    hero.level++; gained++;
    hero.statPoints += 1;
    if (hero.level % 2 === 0) hero.skillPoints += 1;
  }
  if (gained) { const s = computeStats(hero); hero.hp = s.hp; hero.mp = s.mp; }
  return gained;
}

export function canLearn(hero, node) {
  if (hero.skills.includes(node.id)) return false;
  if (hero.skillPoints < (node.cost || 1)) return false;
  if (node.req && !hero.skills.includes(node.req)) return false;
  return true;
}
export function learnSkill(hero, node) {
  if (!canLearn(hero, node)) return false;
  hero.skillPoints -= node.cost || 1; hero.skills.push(node.id);
  return true;
}

export function canEquip(hero, item) {
  const cls = CLASSES[hero.cls];
  if (item.slot === 'weapon') return cls.weaponTypes.includes(item.type);
  if (item.slot === 'armor') return cls.armorTypes.includes(item.type);
  return true;
}

export function clampVitals(hero) {
  const s = computeStats(hero);
  hero.hp = Math.max(0, Math.min(s.hp, Math.round(hero.hp)));
  hero.mp = Math.max(0, Math.min(s.mp, Math.round(hero.mp)));
}
