// Equipment, consumables, materials and crafting recipes.
import { uid } from '../core/util.js';
import { t } from '../core/i18n.js';

export const ITEM_RARITY = {
  common: { name: 'Common', color: '#c8c0b0', mul: 1, affixes: 0 },
  uncommon: { name: 'Uncommon', color: '#6fd06f', mul: 1.15, affixes: 1 },
  rare: { name: 'Rare', color: '#4fa3ff', mul: 1.3, affixes: 2 },
  epic: { name: 'Epic', color: '#c070ff', mul: 1.5, affixes: 2 },
  legendary: { name: 'Legendary', color: '#ffb347', mul: 1.8, affixes: 3 },
};

// Base equipment templates. Board-game scale: ATK / MATK / DEF are small bonuses that rise by 1 every
// two tiers; HP, MP, crit, evasion and speed scale with tier (1-6) and rarity.
export const BASES = {
  sword: { slot: 'weapon', type: 'sword', names: ['Iron Sword', 'Steel Longsword', 'Frostbrand', 'Gravecleaver', 'Starforged Blade', 'Doomedge'], stats: { atk: 1, crit: 2 }, icon: 'sword' },
  mace: { slot: 'weapon', type: 'mace', names: ['Oak Mace', 'Flanged Mace', 'Rimehammer', 'Bonecrusher', 'Sunmace', 'Abyssal Maul'], stats: { atk: 1, hp: 2 }, icon: 'mace' },
  staff: { slot: 'weapon', type: 'staff', names: ['Ashwood Staff', 'Ember Rod', 'Glacial Scepter', 'Soulbinder', 'Astral Staff', 'Voidcaller'], stats: { matk: 1, mp: 4 }, icon: 'staff' },
  bow: { slot: 'weapon', type: 'bow', names: ['Hunting Bow', 'Recurve Bow', 'Frostwind Bow', 'Ghostwood Bow', 'Comet Longbow', 'Hellstring'], stats: { atk: 1, crit: 3 }, icon: 'bow' },
  dagger: { slot: 'weapon', type: 'dagger', names: ['Rusty Dirk', 'Kris Blade', 'Icicle Shiv', 'Venomfang', 'Moonsliver', 'Nightreaver'], stats: { atk: 1, crit: 4 }, icon: 'dagger' },
  hammer: { slot: 'weapon', type: 'hammer', names: ['Smithing Hammer', 'War Hammer', 'Glacier Breaker', 'Tombhammer', 'Meteor Maul', 'Hellforge Hammer'], stats: { atk: 1, hp: 3 }, icon: 'hammer' },
  heavy: { slot: 'armor', type: 'heavy', names: ['Chainmail', 'Iron Plate', 'Frostguard Plate', 'Deathknight Plate', 'Celestial Aegis', 'Abyssal Carapace'], stats: { def: 1, hp: 3 }, icon: 'armor' },
  light: { slot: 'armor', type: 'light', names: ['Leather Vest', 'Ranger Coat', 'Snowfox Garb', 'Shadeweave', 'Starsilk Mantle', 'Voidskin'], stats: { def: 0, hp: 2, eva: 2 }, icon: 'vest' },
  robe: { slot: 'armor', type: 'robe', names: ['Linen Robe', 'Acolyte Robe', 'Frostweave Robe', 'Lich Shroud', 'Aether Vestment', 'Robe of Ending'], stats: { def: 0, hp: 1, mp: 8 }, icon: 'robe' },
  ring: { slot: 'accessory', type: 'ring', names: ['Copper Ring', 'Silver Band', 'Frost Signet', 'Bone Ring', 'Star Ring', 'Ring of the Abyss'], stats: { crit: 4 }, icon: 'ring' },
  amulet: { slot: 'accessory', type: 'amulet', names: ['Wooden Charm', 'Sun Amulet', 'Snowflake Pendant', 'Soul Locket', 'Aether Pendant', 'Heart of Night'], stats: { hp: 3, mp: 4 }, icon: 'amulet' },
  boots: { slot: 'accessory', type: 'boots', names: ['Traveler Boots', 'Dune Striders', 'Snowtread Boots', 'Grave Walkers', 'Skystep Boots', 'Hellwalkers'], stats: { spd: 3, eva: 2 }, icon: 'boots' },
};

const AFFIXES = [
  { stat: 'atk', v: 1, name: 'of Might' }, { stat: 'matk', v: 1, name: 'of Sorcery' }, { stat: 'def', v: 1, name: 'of the Bulwark' },
  { stat: 'hp', v: 2, name: 'of Vigor' }, { stat: 'mp', v: 6, name: 'of Insight' }, { stat: 'crit', v: 3, name: 'of Precision' },
  { stat: 'eva', v: 2, name: 'of Shadows' }, { stat: 'spd', v: 2, name: 'of Haste' },
];

const SMALL = ['atk', 'matk', 'def'];

export const STAT_LABEL = { atk: 'ATK', matk: 'MATK', def: 'DEF', hp: 'Max HP', mp: 'Max MP', crit: 'Crit %', eva: 'Evasion %', spd: 'Speed', move: 'Move', energy: 'Action Slots' };

export function makeEquipment(baseId, tier, rarity, rng = Math.random) {
  const base = BASES[baseId];
  const r = ITEM_RARITY[rarity];
  const tierMul = 1 + (tier - 1) * 0.85;
  const hpMul = 1 + (tier - 1) * 0.5;
  const step = Math.floor((tier - 1) / 2); // +1 ATK / MATK / DEF at tiers 3 and 5
  const stats = {};
  for (const [k, v] of Object.entries(base.stats)) {
    const n = SMALL.includes(k) ? v + (v > 0 ? step : 0) + (rarity === 'legendary' && v > 0 ? 1 : 0) : k === 'hp' ? Math.round(v * hpMul * r.mul) : Math.max(1, Math.round(v * tierMul * r.mul));
    if (n > 0) stats[k] = n;
  }
  const affixNames = []; const used = new Set();
  for (let i = 0; i < r.affixes; i++) {
    const a = AFFIXES[Math.floor(rng() * AFFIXES.length)]; const roll = 0.8 + rng() * 0.4;
    if (used.has(a.stat)) continue; // each bonus at most once per item
    used.add(a.stat);
    stats[a.stat] = (stats[a.stat] || 0) + (SMALL.includes(a.stat) ? a.v : a.stat === 'hp' ? Math.round(a.v * hpMul * roll) : Math.round(a.v * tierMul * roll));
    affixNames.push(t(a.name));
  }
  const name = base.names[Math.min(5, tier - 1)] + (affixNames[0] ? ' ' + affixNames[0] : '');
  return { uid: uid(), kind: 'equip', base: baseId, slot: base.slot, type: base.type, tier, rarity, name, stats, icon: base.icon, value: Math.round(25 * tierMul * r.mul * (1 + r.affixes)) };
}

// Unique stage reward equipment (granted by MVP bosses)
export const UNIQUES = {
  guardian_heart: { kind: 'equip', base: 'amulet', slot: 'accessory', type: 'amulet', tier: 2, rarity: 'legendary', name: "Guardian's Heartwood", stats: { hp: 6, def: 1, matk: 1 }, icon: 'amulet', value: 400, unique: 'Regenerate 1 HP each round.', passive: { regenFlat: 1 } },
  tyrant_fang: { kind: 'equip', base: 'ring', slot: 'accessory', type: 'ring', tier: 3, rarity: 'legendary', name: 'Tyrant Fang Ring', stats: { atk: 2, crit: 8 }, icon: 'ring', value: 600, unique: '+20% damage to bosses.', passive: { bossDmg: 0.2 } },
  queen_tiara: { kind: 'equip', base: 'amulet', slot: 'accessory', type: 'amulet', tier: 4, rarity: 'legendary', name: 'Tiara of Endless Winter', stats: { matk: 2, mp: 25 }, icon: 'amulet', value: 800, unique: 'Attacks apply Chill 1.', passive: { onHitStatus: { st: 'chill', n: 1 } } },
  lich_phylactery: { kind: 'equip', base: 'amulet', slot: 'accessory', type: 'amulet', tier: 5, rarity: 'legendary', name: 'Shattered Phylactery', stats: { hp: 8, matk: 2, atk: 2 }, icon: 'amulet', value: 1100, unique: 'Heal 10% of damage dealt.', passive: { lifesteal: 0.1 } },
  dragon_scale: { kind: 'equip', base: 'boots', slot: 'accessory', type: 'boots', tier: 6, rarity: 'legendary', name: 'Aurelion Scale Treads', stats: { spd: 12, eva: 8, def: 2, hp: 8 }, icon: 'boots', value: 1500, unique: '+1 Movement and +1 Action Slot.', passive: { move: 1, energy: 1 } },
  overlord_crown: { kind: 'equip', base: 'ring', slot: 'accessory', type: 'ring', tier: 7, rarity: 'legendary', name: 'Crown of the Last World', stats: { atk: 3, matk: 3, hp: 12, crit: 10 }, icon: 'ring', value: 3000, unique: 'All damage +25%.', passive: { dmgPct: 0.25 } },
};
export function makeUnique(id) { return { ...UNIQUES[id], stats: { ...UNIQUES[id].stats }, uid: uid(), uniqueId: id }; }

export const CONSUMABLES = {
  potion: { name: 'Health Potion', desc: 'Restore 40% HP.', icon: 'potion', color: '#e04040', price: 30, use: { healPct: 0.4 } },
  hipotion: { name: 'Greater Potion', desc: 'Restore 80% HP.', icon: 'potion', color: '#ff6080', price: 80, use: { healPct: 0.8 } },
  ether: { name: 'Ether', desc: 'Restore 25 MP.', icon: 'potion', color: '#4080ff', price: 35, use: { mp: 25 } },
  antidote: { name: 'Panacea', desc: 'Remove all debuffs and grant 2 Block.', icon: 'potion', color: '#60d060', price: 25, use: { cleanse: true, block: 2 } },
  elixir: { name: 'Phoenix Elixir', desc: 'Fully restore HP and MP. Can revive a fallen ally outside battle.', icon: 'potion', color: '#ffb030', price: 200, use: { healPct: 1, mp: 999, revive: true } },
  bomb: { name: 'Alchemist Bomb', desc: 'Deal 8 Fire damage to an enemy (battle only).', icon: 'bomb', color: '#ff7020', price: 45, use: { bomb: 8 } },
};

export const MATERIALS = {
  heartwood: { name: 'Heartwood', stage: 1, color: '#8a6a3a' }, spiritmoss: { name: 'Spirit Moss', stage: 1, color: '#7ad06a' },
  sunstone: { name: 'Sunstone', stage: 2, color: '#ffb040' }, chitin: { name: 'Scorpion Chitin', stage: 2, color: '#c07040' },
  frostcrystal: { name: 'Frost Crystal', stage: 3, color: '#90e0ff' }, rimesilk: { name: 'Rime Silk', stage: 3, color: '#e0f0ff' },
  bonedust: { name: 'Bone Dust', stage: 4, color: '#e0d8c0' }, soulshard: { name: 'Soul Shard', stage: 4, color: '#a070ff' },
  starfragment: { name: 'Star Fragment', stage: 5, color: '#fff0a0' }, aetherfeather: { name: 'Aether Feather', stage: 5, color: '#c0d0ff' },
  voidichor: { name: 'Void Ichor', stage: 6, color: '#8020a0' }, abyssiron: { name: 'Abyssal Iron', stage: 6, color: '#5a3a4a' },
};

// Forge recipes: craft equipment of a given tier/rarity from materials + gold.
export const RECIPES = [
  { id: 'r1', base: 'sword', tier: 2, rarity: 'rare', mats: { heartwood: 3, spiritmoss: 2 }, gold: 120 },
  { id: 'r2', base: 'staff', tier: 2, rarity: 'rare', mats: { heartwood: 3, spiritmoss: 2 }, gold: 120 },
  { id: 'r3', base: 'light', tier: 2, rarity: 'rare', mats: { spiritmoss: 4 }, gold: 100 },
  { id: 'r4', base: 'bow', tier: 3, rarity: 'rare', mats: { sunstone: 2, chitin: 3 }, gold: 220 },
  { id: 'r5', base: 'heavy', tier: 3, rarity: 'rare', mats: { chitin: 4, sunstone: 1 }, gold: 220 },
  { id: 'r6', base: 'dagger', tier: 3, rarity: 'rare', mats: { chitin: 3, sunstone: 2 }, gold: 220 },
  { id: 'r7', base: 'hammer', tier: 4, rarity: 'epic', mats: { frostcrystal: 3, rimesilk: 2, sunstone: 1 }, gold: 420 },
  { id: 'r8', base: 'robe', tier: 4, rarity: 'epic', mats: { rimesilk: 4, frostcrystal: 1 }, gold: 400 },
  { id: 'r9', base: 'mace', tier: 4, rarity: 'epic', mats: { frostcrystal: 3, chitin: 2 }, gold: 400 },
  { id: 'r10', base: 'amulet', tier: 5, rarity: 'epic', mats: { soulshard: 3, bonedust: 3 }, gold: 650 },
  { id: 'r11', base: 'ring', tier: 5, rarity: 'epic', mats: { soulshard: 2, bonedust: 4 }, gold: 650 },
  { id: 'r12', base: 'boots', tier: 5, rarity: 'epic', mats: { bonedust: 3, rimesilk: 2 }, gold: 600 },
  { id: 'r13', base: 'sword', tier: 6, rarity: 'legendary', mats: { starfragment: 4, aetherfeather: 2, soulshard: 2 }, gold: 1200 },
  { id: 'r14', base: 'staff', tier: 6, rarity: 'legendary', mats: { starfragment: 3, aetherfeather: 3, soulshard: 2 }, gold: 1200 },
  { id: 'r15', base: 'heavy', tier: 6, rarity: 'legendary', mats: { starfragment: 3, aetherfeather: 2, abyssiron: 2 }, gold: 1300 },
  { id: 'r16', base: 'bow', tier: 6, rarity: 'legendary', mats: { aetherfeather: 4, starfragment: 2 }, gold: 1200 },
  { id: 'r17', base: 'dagger', tier: 6, rarity: 'legendary', mats: { voidichor: 3, aetherfeather: 2 }, gold: 1200 },
  { id: 'r18', base: 'hammer', tier: 6, rarity: 'legendary', mats: { abyssiron: 4, starfragment: 2 }, gold: 1300 },
];

export function rollRarity(rng, luck = 0) {
  const r = rng();
  if (r < 0.02 + luck * 0.01) return 'legendary';
  if (r < 0.08 + luck * 0.03) return 'epic';
  if (r < 0.25 + luck * 0.05) return 'rare';
  if (r < 0.55) return 'uncommon';
  return 'common';
}
