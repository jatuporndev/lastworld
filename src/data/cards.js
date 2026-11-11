// Card Engine data — every skill card in LAST WORLD.
// fx effect types:
//   dmg {v, s:'atk'|'matk', hits}   block {v}   heal {v, s}     (board-game scale: dice + v + stat)
//   status {st, n, self}  move {v}  teleport  dash  push {v}  pull {v}
//   draw {v}  energy {v} (extra Action Slots this turn)  mp {v}  cleanse  taunt  summon {id}  revive {pct}
// charge: true — the card may take up to 2 extra Action Slots, each adding a die
// tg: enemy | ally | self | hex | any     shape: single | line | cone | area | burst
import { t } from '../core/i18n.js';

export const ELEMENTS = {
  neutral: { name: 'Neutral', color: '#c9c2b0', glow: '#e8e2d0' },
  fire: { name: 'Fire', color: '#ff6a2a', glow: '#ffb070' },
  ice: { name: 'Ice', color: '#6fd0ff', glow: '#c8f0ff' },
  wind: { name: 'Wind', color: '#7be3a0', glow: '#c8ffd8' },
  earth: { name: 'Earth', color: '#c08a4a', glow: '#e8c08a' },
  holy: { name: 'Holy', color: '#ffe27a', glow: '#fff6c8' },
  shadow: { name: 'Shadow', color: '#a66bff', glow: '#d8c0ff' },
  poison: { name: 'Poison', color: '#9be04a', glow: '#d8ff9a' },
};

export const CATEGORIES = {
  attack: { name: 'Attack', color: '#c0392b' },
  defense: { name: 'Defense', color: '#2f6fb0' },
  movement: { name: 'Movement', color: '#2f9a6a' },
  buff: { name: 'Buff', color: '#c79a2b' },
  special: { name: 'Special', color: '#8a4fc0' },
};

export const RARITY = {
  common: { name: 'Common', color: '#b8b0a0', shards: 5, craft: 15 },
  rare: { name: 'Rare', color: '#4fa3ff', shards: 15, craft: 45 },
  epic: { name: 'Epic', color: '#c070ff', shards: 40, craft: 110 },
  legendary: { name: 'Legendary', color: '#ffb347', shards: 100, craft: 300 },
};

const C = (o) => ({ cost: 1, mp: 0, cd: 0, tg: 'enemy', range: 1, shape: 'single', size: 0, el: 'neutral', rarity: 'common', fx: [], ...o });

export const CARDS = {};
function add(list) { list.forEach((c) => { CARDS[c.id] = C(c); }); }

// ───────── KNIGHT ─────────
add([
  { id: 'k_slash', cls: 'knight', name: 'Slash', cat: 'attack', icon: 'sword', fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'k_shieldwall', cls: 'knight', name: 'Shield Wall', cat: 'defense', icon: 'shield', tg: 'self', cd: 1, fx: [{ t: 'block', v: 2 }] },
  { id: 'k_charge', cls: 'knight', name: 'Charge', cat: 'movement', icon: 'boot', cost: 2, cd: 2, range: 4, fx: [{ t: 'dash' }, { t: 'dmg', v: 1, s: 'atk' }, { t: 'push', v: 1 }] },
  { id: 'k_bash', cls: 'knight', name: 'Shield Bash', cat: 'attack', icon: 'shield', cd: 1, combo: { after: 'defense', bonus: { status: { st: 'stun', n: 1 } } }, fx: [{ t: 'dmg', v: 0, s: 'atk', fromBlock: 0.6 }] },
  { id: 'k_taunt', cls: 'knight', name: 'Challenging Roar', cat: 'special', icon: 'roar', tg: 'self', shape: 'burst', size: 2, cd: 2, fx: [{ t: 'taunt' }, { t: 'block', v: 1, self: true }] },
  { id: 'k_whirl', cls: 'knight', name: 'Whirlwind', cat: 'attack', icon: 'whirl', tg: 'self', shape: 'burst', size: 1, cost: 2, cd: 2, fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'k_rally', cls: 'knight', name: 'Rally', cat: 'buff', icon: 'banner', tg: 'self', shape: 'burst', size: 2, cd: 3, allies: true, fx: [{ t: 'status', st: 'strength', n: 2 }] },
  { id: 'k_vow', cls: 'knight', name: "Guardian's Vow", cat: 'defense', icon: 'shield', tg: 'ally', range: 3, cd: 2, fx: [{ t: 'block', v: 3 }] },
  { id: 'k_advance', cls: 'knight', name: 'Advance', cat: 'movement', icon: 'boot', tg: 'hex', range: 2, cost: 0, cd: 1, fx: [{ t: 'move', v: 2 }] },
  { id: 'k_valor', charge: true, cls: 'knight', name: 'Valor Strike', cat: 'attack', icon: 'sword', rarity: 'rare', cost: 2, cd: 2, el: 'holy', fx: [{ t: 'dmg', v: 2, s: 'atk' }] },
  { id: 'k_ironwill', cls: 'knight', name: 'Iron Will', cat: 'buff', icon: 'heart', rarity: 'rare', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'cleanse' }, { t: 'status', st: 'regen', n: 3 }] },
  { id: 'k_earthsplit', cls: 'knight', name: 'Earthsplitter', cat: 'attack', icon: 'quake', rarity: 'epic', shape: 'line', size: 4, cost: 3, cd: 3, mp: 6, el: 'earth', tg: 'any', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'stun', n: 1 }] },
]);

// ───────── MAGE ─────────
add([
  { id: 'm_firebolt', cls: 'mage', name: 'Firebolt', cat: 'attack', icon: 'flame', range: 4, el: 'fire', proj: 'fire', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'burn', n: 1 }] },
  { id: 'm_frostshard', cls: 'mage', name: 'Frost Shard', cat: 'attack', icon: 'snow', range: 4, el: 'ice', proj: 'ice', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'chill', n: 1 }] },
  { id: 'm_barrier', cls: 'mage', name: 'Arcane Barrier', cat: 'defense', icon: 'orb', tg: 'ally', range: 2, cd: 1, fx: [{ t: 'block', v: 2 }] },
  { id: 'm_blink', cls: 'mage', name: 'Blink', cat: 'movement', icon: 'blink', tg: 'hex', range: 3, cd: 2, fx: [{ t: 'teleport' }] },
  { id: 'm_fireball', charge: true, cls: 'mage', name: 'Fireball', cat: 'attack', icon: 'flame', range: 4, shape: 'area', size: 1, tg: 'any', cost: 2, mp: 4, cd: 2, el: 'fire', proj: 'fire', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'burn', n: 2 }] },
  { id: 'm_surge', cls: 'mage', name: 'Mana Surge', cat: 'buff', icon: 'star', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'energy', v: 1 }, { t: 'mp', v: 4 }, { t: 'draw', v: 1 }] },
  { id: 'm_lance', cls: 'mage', name: 'Lightning Lance', cat: 'attack', icon: 'bolt', shape: 'line', size: 4, tg: 'any', range: 1, mp: 3, cd: 1, el: 'wind', fx: [{ t: 'dmg', v: 1, s: 'matk' }] },
  { id: 'm_ignite', cls: 'mage', name: 'Ignite', cat: 'special', icon: 'flame', range: 4, cost: 1, cd: 1, el: 'fire', fx: [{ t: 'status', st: 'burn', n: 3 }] },
  { id: 'm_missiles', cls: 'mage', name: 'Arcane Missiles', cat: 'attack', icon: 'orb', range: 4, cd: 1, proj: 'arcane', fx: [{ t: 'dmg', v: 0, s: 'matk', hits: 3 }] },
  { id: 'm_nova', cls: 'mage', name: 'Frost Nova', cat: 'special', icon: 'snow', rarity: 'rare', tg: 'self', shape: 'burst', size: 1, cd: 2, mp: 3, el: 'ice', fx: [{ t: 'dmg', v: 0, s: 'matk' }, { t: 'status', st: 'chill', n: 2 }, { t: 'push', v: 1 }] },
  { id: 'm_blizzard', cls: 'mage', name: 'Blizzard', cat: 'attack', icon: 'snow', rarity: 'rare', range: 4, shape: 'area', size: 1, tg: 'any', cost: 2, mp: 5, cd: 3, el: 'ice', fx: [{ t: 'dmg', v: 0, s: 'matk' }, { t: 'status', st: 'chill', n: 2 }] },
  { id: 'm_meteor', cls: 'mage', name: 'Meteor', cat: 'attack', icon: 'meteor', rarity: 'epic', range: 5, shape: 'area', size: 2, tg: 'any', cost: 3, mp: 10, cd: 4, el: 'fire', fx: [{ t: 'dmg', v: 3, s: 'matk' }, { t: 'status', st: 'burn', n: 2 }] },
]);

// ───────── ARCHER ─────────
add([
  { id: 'a_quick', cls: 'archer', name: 'Quick Shot', cat: 'attack', icon: 'arrow', range: 4, proj: 'arrow', fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'a_aimed', charge: true, cls: 'archer', name: 'Aimed Shot', cat: 'attack', icon: 'eye', range: 6, cost: 2, cd: 1, proj: 'arrow', fx: [{ t: 'dmg', v: 2, s: 'atk', crit: 25 }] },
  { id: 'a_volley', cls: 'archer', name: 'Volley', cat: 'attack', icon: 'arrows', range: 5, shape: 'area', size: 1, tg: 'any', cost: 2, cd: 2, fx: [{ t: 'dmg', v: 0, s: 'atk' }] },
  { id: 'a_pierce', cls: 'archer', name: 'Piercing Arrow', cat: 'attack', icon: 'arrow', shape: 'line', size: 5, tg: 'any', range: 1, cost: 2, cd: 2, el: 'wind', fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'a_roll', cls: 'archer', name: 'Evasive Roll', cat: 'movement', icon: 'boot', tg: 'hex', range: 2, cd: 1, fx: [{ t: 'move', v: 2 }, { t: 'block', v: 1, self: true }] },
  { id: 'a_mark', cls: 'archer', name: "Hunter's Mark", cat: 'special', icon: 'eye', range: 6, cost: 0, cd: 2, fx: [{ t: 'status', st: 'mark', n: 1 }, { t: 'status', st: 'vulnerable', n: 2 }] },
  { id: 'a_windstep', cls: 'archer', name: 'Wind Step', cat: 'buff', icon: 'wind', tg: 'self', cd: 2, el: 'wind', fx: [{ t: 'status', st: 'haste', n: 2 }, { t: 'draw', v: 1 }] },
  { id: 'a_poison', cls: 'archer', name: 'Venom Arrow', cat: 'attack', icon: 'arrow', range: 5, cd: 1, el: 'poison', proj: 'arrow', fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'status', st: 'poison', n: 3 }] },
  { id: 'a_blank', cls: 'archer', name: 'Point Blank', cat: 'attack', icon: 'arrow', range: 1, cd: 1, fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'push', v: 2 }] },
  { id: 'a_snare', cls: 'archer', name: 'Snare Trap', cat: 'special', icon: 'trap', rarity: 'rare', range: 4, cd: 2, fx: [{ t: 'status', st: 'root', n: 2 }, { t: 'dmg', v: 0, s: 'atk' }] },
  { id: 'a_focus', cls: 'archer', name: 'Focus', cat: 'buff', icon: 'eye', rarity: 'rare', tg: 'self', cd: 2, fx: [{ t: 'status', st: 'strength', n: 2 }, { t: 'draw', v: 1 }] },
  { id: 'a_storm', cls: 'archer', name: 'Storm of Arrows', cat: 'attack', icon: 'arrows', rarity: 'epic', range: 5, shape: 'area', size: 2, tg: 'any', cost: 3, mp: 8, cd: 4, el: 'wind', fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
]);

// ───────── ASSASSIN ─────────
add([
  { id: 's_stab', cls: 'assassin', name: 'Stab', cat: 'attack', icon: 'dagger', fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 's_venom', cls: 'assassin', name: 'Venom Blade', cat: 'attack', icon: 'dagger', cd: 1, el: 'poison', fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'status', st: 'poison', n: 3 }] },
  { id: 's_step', cls: 'assassin', name: 'Shadow Step', cat: 'movement', icon: 'blink', tg: 'hex', range: 3, cd: 1, el: 'shadow', fx: [{ t: 'teleport' }] },
  { id: 's_backstab', charge: true, cls: 'assassin', name: 'Backstab', cat: 'attack', icon: 'dagger', cost: 2, cd: 2, combo: { after: 'movement', bonus: { dmg: 2 } }, fx: [{ t: 'dmg', v: 2, s: 'atk' }] },
  { id: 's_smoke', cls: 'assassin', name: 'Smoke Bomb', cat: 'defense', icon: 'smoke', tg: 'self', cd: 2, fx: [{ t: 'status', st: 'stealth', n: 1 }, { t: 'block', v: 1 }] },
  { id: 's_fan', cls: 'assassin', name: 'Fan of Knives', cat: 'attack', icon: 'whirl', tg: 'self', shape: 'burst', size: 1, cost: 2, cd: 2, fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'status', st: 'bleed', n: 2 }] },
  { id: 's_expose', cls: 'assassin', name: 'Expose Weakness', cat: 'special', icon: 'eye', range: 2, cost: 0, cd: 2, fx: [{ t: 'status', st: 'vulnerable', n: 2 }, { t: 'status', st: 'mark', n: 1 }] },
  { id: 's_throw', cls: 'assassin', name: 'Throwing Knife', cat: 'attack', icon: 'dagger', range: 3, proj: 'knife', fx: [{ t: 'dmg', v: 0, s: 'atk' }] },
  { id: 's_rush', cls: 'assassin', name: 'Phantom Rush', cat: 'movement', icon: 'boot', range: 4, cd: 2, el: 'shadow', fx: [{ t: 'dash' }, { t: 'dmg', v: 1, s: 'atk' }] },
  { id: 's_dance', cls: 'assassin', name: 'Dance of Blades', cat: 'attack', icon: 'dagger', rarity: 'rare', cost: 2, cd: 2, fx: [{ t: 'dmg', v: 0, s: 'atk', hits: 4 }] },
  { id: 's_adrenaline', cls: 'assassin', name: 'Adrenaline', cat: 'buff', icon: 'heart', rarity: 'rare', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'energy', v: 1 }, { t: 'draw', v: 1 }] },
  { id: 's_assassinate', cls: 'assassin', name: 'Assassinate', cat: 'attack', icon: 'skull', rarity: 'epic', cost: 3, mp: 6, cd: 4, el: 'shadow', fx: [{ t: 'dmg', v: 3, s: 'atk', execute: 0.3 }] },
]);

// ───────── PRIEST ─────────
add([
  { id: 'p_smite', cls: 'priest', name: 'Smite', cat: 'attack', icon: 'sun', range: 3, el: 'holy', proj: 'holy', fx: [{ t: 'dmg', v: 1, s: 'matk' }] },
  { id: 'p_heal', cls: 'priest', name: 'Heal', cat: 'buff', icon: 'cross', tg: 'ally', range: 3, cd: 1, el: 'holy', fx: [{ t: 'heal', v: 2, s: 'matk' }] },
  { id: 'p_bless', cls: 'priest', name: 'Blessing', cat: 'buff', icon: 'sun', tg: 'ally', range: 3, cd: 2, el: 'holy', fx: [{ t: 'status', st: 'strength', n: 2 }, { t: 'status', st: 'regen', n: 2 }] },
  { id: 'p_shield', cls: 'priest', name: 'Holy Shield', cat: 'defense', icon: 'shield', tg: 'ally', range: 3, cd: 1, el: 'holy', fx: [{ t: 'block', v: 2 }] },
  { id: 'p_purify', cls: 'priest', name: 'Purify', cat: 'buff', icon: 'cross', tg: 'ally', range: 3, cost: 0, cd: 1, fx: [{ t: 'cleanse' }, { t: 'heal', v: 1 }] },
  { id: 'p_mace', cls: 'priest', name: 'Mace Strike', cat: 'attack', icon: 'mace', fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'p_step', cls: 'priest', name: 'Guiding Step', cat: 'movement', icon: 'boot', tg: 'hex', range: 2, cd: 1, fx: [{ t: 'move', v: 2 }, { t: 'heal', v: 1, self: true }] },
  { id: 'p_prayer', cls: 'priest', name: 'Prayer', cat: 'buff', icon: 'star', tg: 'self', cost: 0, cd: 2, fx: [{ t: 'mp', v: 6 }, { t: 'draw', v: 1 }] },
  { id: 'p_light', charge: true, cls: 'priest', name: 'Divine Light', cat: 'attack', icon: 'sun', shape: 'line', size: 4, tg: 'any', cost: 2, mp: 3, cd: 2, el: 'holy', fx: [{ t: 'dmg', v: 1, s: 'matk' }] },
  { id: 'p_sanctuary', cls: 'priest', name: 'Sanctuary', cat: 'special', icon: 'cross', rarity: 'rare', tg: 'self', shape: 'burst', size: 2, allies: true, cost: 2, mp: 6, cd: 3, el: 'holy', fx: [{ t: 'heal', v: 1, s: 'matk' }, { t: 'cleanse' }] },
  { id: 'p_judgment', cls: 'priest', name: 'Judgment', cat: 'attack', icon: 'sun', rarity: 'rare', range: 4, shape: 'area', size: 1, tg: 'any', cost: 2, mp: 4, cd: 2, el: 'holy', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'weak', n: 2 }] },
  { id: 'p_resurrect', cls: 'priest', name: 'Resurrection', cat: 'special', icon: 'phoenix', rarity: 'epic', tg: 'self', cost: 3, mp: 12, cd: 5, el: 'holy', fx: [{ t: 'revive', pct: 0.4 }] },
]);

// ───────── BLACKSMITH ─────────
add([
  { id: 'b_hammer', cls: 'blacksmith', name: 'Hammer Blow', cat: 'attack', icon: 'hammer', fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'b_temper', cls: 'blacksmith', name: 'Temper Steel', cat: 'buff', icon: 'anvil', tg: 'ally', range: 2, cd: 2, fx: [{ t: 'status', st: 'strength', n: 3 }] },
  { id: 'b_forge', cls: 'blacksmith', name: 'Forge Armor', cat: 'defense', icon: 'shield', tg: 'ally', range: 2, cd: 1, fx: [{ t: 'block', v: 2 }] },
  { id: 'b_molten', charge: true, cls: 'blacksmith', name: 'Molten Strike', cat: 'attack', icon: 'flame', cost: 2, cd: 1, el: 'fire', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'burn', n: 2 }] },
  { id: 'b_turret', cls: 'blacksmith', name: 'Deploy Turret', cat: 'special', icon: 'turret', tg: 'hex', range: 2, cost: 2, cd: 3, fx: [{ t: 'summon', id: 'turret' }] },
  { id: 'b_slam', cls: 'blacksmith', name: 'Shockwave Slam', cat: 'attack', icon: 'quake', tg: 'self', shape: 'burst', size: 1, cost: 2, cd: 2, el: 'earth', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'push', v: 1 }] },
  { id: 'b_overcharge', cls: 'blacksmith', name: 'Overcharge', cat: 'buff', icon: 'bolt', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'energy', v: 2 }, { t: 'selfdmg', v: 2 }] },
  { id: 'b_wall', cls: 'blacksmith', name: 'Iron Barricade', cat: 'defense', icon: 'anvil', tg: 'hex', range: 2, cd: 2, fx: [{ t: 'summon', id: 'barricade' }] },
  { id: 'b_rush', cls: 'blacksmith', name: 'Sledge Rush', cat: 'movement', icon: 'boot', range: 3, cd: 2, fx: [{ t: 'dash' }, { t: 'dmg', v: 0, s: 'atk' }] },
  { id: 'b_repair', cls: 'blacksmith', name: 'Field Repair', cat: 'buff', icon: 'wrench', tg: 'ally', range: 2, cd: 2, fx: [{ t: 'heal', v: 2, s: 'def' }] },
  { id: 'b_quake', cls: 'blacksmith', name: 'Tectonic Quake', cat: 'attack', icon: 'quake', rarity: 'rare', shape: 'line', size: 4, tg: 'any', cost: 3, mp: 5, cd: 3, el: 'earth', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'stun', n: 1 }] },
  { id: 'b_masterwork', cls: 'blacksmith', name: 'Masterwork', cat: 'buff', icon: 'anvil', rarity: 'epic', tg: 'self', cost: 2, mp: 6, cd: 4, fx: [{ t: 'status', st: 'strength', n: 4 }, { t: 'block', v: 3 }] },
]);

// ───────── NEUTRAL (any class) ─────────
add([
  { id: 'n_sprint', cls: 'any', name: 'Sprint', cat: 'movement', icon: 'boot', tg: 'hex', range: 3, cd: 2, fx: [{ t: 'move', v: 3 }] },
  { id: 'n_secondwind', cls: 'any', name: 'Second Wind', cat: 'defense', icon: 'heart', tg: 'self', cd: 2, fx: [{ t: 'block', v: 2 }, { t: 'heal', v: 1 }] },
  { id: 'n_battlecry', cls: 'any', name: 'Battle Cry', cat: 'buff', icon: 'banner', rarity: 'rare', tg: 'self', shape: 'burst', size: 3, allies: true, cd: 3, fx: [{ t: 'status', st: 'strength', n: 1 }, { t: 'draw', v: 1 }] },
  { id: 'n_insight', cls: 'any', name: 'Insight', cat: 'special', icon: 'eye', rarity: 'rare', tg: 'self', cost: 0, cd: 2, fx: [{ t: 'draw', v: 2 }] },
  // Stage reward cards (high rarity)
  { id: 'r_verdant', cls: 'any', name: 'Verdant Bloom', cat: 'buff', icon: 'leaf', rarity: 'epic', tg: 'self', shape: 'burst', size: 3, allies: true, cost: 2, cd: 4, el: 'earth', fx: [{ t: 'heal', v: 3, s: 'matk' }, { t: 'status', st: 'regen', n: 3 }] },
  { id: 'r_sandstorm', cls: 'any', name: 'Tyrant Sandstorm', cat: 'attack', icon: 'wind', rarity: 'epic', range: 4, shape: 'area', size: 2, tg: 'any', cost: 2, mp: 6, cd: 4, el: 'earth', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'weak', n: 2 }] },
  { id: 'r_glacial', cls: 'any', name: 'Glacial Prison', cat: 'special', icon: 'snow', rarity: 'epic', range: 4, cost: 2, mp: 6, cd: 4, el: 'ice', fx: [{ t: 'status', st: 'frozen', n: 1 }, { t: 'status', st: 'chill', n: 2 }, { t: 'dmg', v: 2, s: 'matk' }] },
  { id: 'r_soulharvest', cls: 'any', name: 'Soul Harvest', cat: 'attack', icon: 'skull', rarity: 'legendary', tg: 'self', shape: 'burst', size: 2, cost: 2, mp: 8, cd: 4, el: 'shadow', fx: [{ t: 'dmg', v: 2, s: 'atk', drain: 0.5 }] },
  { id: 'r_starfall', cls: 'any', name: 'Starfall', cat: 'attack', icon: 'meteor', rarity: 'legendary', range: 6, shape: 'area', size: 2, tg: 'any', cost: 3, mp: 10, cd: 4, el: 'holy', fx: [{ t: 'dmg', v: 4, s: 'matk' }, { t: 'status', st: 'stun', n: 1 }] },
  { id: 'r_rift', cls: 'any', name: 'Abyssal Rift', cat: 'special', icon: 'blink', rarity: 'legendary', tg: 'self', shape: 'burst', size: 3, cost: 3, mp: 12, cd: 5, el: 'shadow', fx: [{ t: 'dmg', v: 3, s: 'atk' }, { t: 'pull', v: 2 }, { t: 'status', st: 'vulnerable', n: 2 }] },
]);

export const STARTER_DECKS = {
  knight: ['k_slash', 'k_slash', 'k_shieldwall', 'k_charge', 'k_bash', 'k_advance', 'k_taunt', 'k_vow'],
  mage: ['m_firebolt', 'm_firebolt', 'm_frostshard', 'm_frostshard', 'm_barrier', 'm_blink', 'm_fireball', 'm_surge'],
  archer: ['a_quick', 'a_quick', 'a_aimed', 'a_roll', 'a_mark', 'a_poison', 'a_blank', 'a_volley'],
  assassin: ['s_stab', 's_stab', 's_venom', 's_step', 's_backstab', 's_smoke', 's_throw', 's_expose'],
  priest: ['p_smite', 'p_smite', 'p_heal', 'p_heal', 'p_shield', 'p_purify', 'p_mace', 'p_step'],
  blacksmith: ['b_hammer', 'b_hammer', 'b_forge', 'b_temper', 'b_molten', 'b_rush', 'b_repair', 'b_wall'],
};

export const DECK_MIN = 8;
export const DECK_MAX = 16;

// ───────── Upgrades ─────────
// Level 1: +1 to numeric bases. Level 2: +1 die and +1 status stack. Level 3: +1 again and -1 cooldown.
export const MAX_CARD_LEVEL = 3;
export function cardStats(id, level = 0) {
  const base = CARDS[id];
  if (!base) return null;
  if (!level) return base;
  const c = { ...base, fx: base.fx.map((f) => ({ ...f })) };
  c.level = level;
  c.name = base.name + '+'.repeat(level);
  c.fx.forEach((f) => {
    if (['dmg', 'block', 'heal'].includes(f.t) && f.v != null) f.v += f.hits ? 1 : level >= 3 ? 2 : 1;
    if (f.t === 'status' && level >= 2 && !['stun', 'frozen', 'mark', 'stealth'].includes(f.st)) f.n += 1;
    if (['draw', 'mp'].includes(f.t) && level >= 2) f.v += f.t === 'mp' ? 2 : 0;
  });
  if (level >= 3 && c.cd > 0) c.cd -= 1;
  return c;
}
export function upgradeCost(card, level) {
  const r = { common: 1, rare: 2, epic: 3, legendary: 4 }[card.rarity] || 1;
  return { gold: 40 * (level + 1) * r, shards: 8 * (level + 1) * r };
}

const STAT_NAMES = { atk: 'ATK', matk: 'MATK', def: 'DEF' };
export const STATUS_INFO = {
  burn: { name: 'Burn', color: '#ff7a33', icon: '🔥', desc: 'Takes damage equal to stacks at turn start; stacks decay by 1.', debuff: true },
  poison: { name: 'Poison', color: '#8fd14f', icon: '☠', desc: 'Takes damage equal to stacks at turn start; stacks decay by 1.', debuff: true },
  bleed: { name: 'Bleed', color: '#d83a3a', icon: '🩸', desc: 'Takes 1 damage per stack when it moves. Decays each turn.', debuff: true },
  chill: { name: 'Chill', color: '#7fd4ff', icon: '❄', desc: '-1 movement. At 3 stacks becomes Frozen.', debuff: true },
  frozen: { name: 'Frozen', color: '#bfefff', icon: '🧊', desc: 'Skips its next turn. Takes +50% Fire damage (Melt).', debuff: true },
  stun: { name: 'Stun', color: '#ffe066', icon: '💫', desc: 'Skips its next turn.', debuff: true },
  root: { name: 'Root', color: '#a07a4a', icon: '🌿', desc: 'Cannot move.', debuff: true },
  weak: { name: 'Weak', color: '#b08ad0', icon: '↓', desc: 'Deals 25% less damage.', debuff: true },
  vulnerable: { name: 'Vulnerable', color: '#ff9a9a', icon: '◎', desc: 'Takes 25% more damage.', debuff: true },
  mark: { name: 'Marked', color: '#ff5050', icon: '🎯', desc: 'Next hit deals +50% damage and always crits.', debuff: true },
  taunt: { name: 'Taunted', color: '#ff8a3a', icon: '❗', desc: 'Must target the taunting hero.', debuff: true },
  strength: { name: 'Strength', color: '#ffb347', icon: '⚔', desc: '+1 damage per stack on attacks.' },
  regen: { name: 'Regen', color: '#7fe0a0', icon: '✚', desc: 'Heals stacks HP at turn start; decays by 1.' },
  haste: { name: 'Haste', color: '#9af0ff', icon: '»', desc: '+2 movement while active.' },
  stealth: { name: 'Stealth', color: '#9a8ab0', icon: '◐', desc: '+50% evasion. Breaks when you attack.' },
};

// ───────── dice ─────────
// Heroes roll coloured dice for every damage / block / heal card, and the card prints its formula,
// e.g. "[red ×2] + 3 damage" = roll two red dice and add 3. The dice are the bulk of every number:
// the card's own value and the hero's ATK / MATK are only small bonuses on top.
//   red (ATK attacks): ✸ = 3 and a guaranteed critical hit
//   blue (MATK spells): ◈ = 2 and +1 stack on every status the card applies
//   green (block / heal): ★ = 2 and doubles the dice total
export const DICE = {
  red: [{ v: 0 }, { v: 2 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 3, k: 'crit' }],
  blue: [{ v: 0 }, { v: 2 }, { v: 3 }, { v: 3 }, { v: 2, k: 'surge' }, { v: 2, k: 'surge' }],
  green: [{ v: 0 }, { v: 2 }, { v: 2 }, { v: 3 }, { v: 3 }, { v: 2, k: 'star' }],
};
export const MONSTER_DIE = [0, 1, 1, 2, 2, 3];
export const DICE_NAME = { red: 'Red', blue: 'Blue', green: 'Green' };
// Which dice a card rolls (null = none): colour from its first damage stat, count from cost, rarity and upgrades.
// Monsters roll the grey die (see Battle.monsterRoll).
export function diceOf(card) {
  const off = card.fx.find((f) => f.t === 'dmg'); const sup = card.fx.find((f) => f.t === 'block' || f.t === 'heal');
  if (!off && !sup) return null;
  const color = off ? (off.s === 'matk' ? 'blue' : 'red') : 'green';
  const n = Math.min(5, 1 + (card.cost >= 2 ? 1 : 0) + (card.cost >= 3 ? 1 : 0) + (['epic', 'legendary'].includes(card.rarity) ? 1 : 0) + (card.level >= 2 ? 1 : 0));
  return { color, n };
}
// Card text carries dice as a marker like ⟦red:2⟧; diceText() makes it plain text, cards render it as chips.
export const diceMark = (d) => `⟦${d.color}:${d.n}⟧`;
export const diceLabel = (color, n) => t('{c} die ×{n}', { c: t(DICE_NAME[color]), n });
export const diceText = (s) => s.replace(/⟦(\w+):(\d+)⟧/g, (_, c, n) => '🎲' + diceLabel(c, +n));

export function describeCard(card, unit = null) {
  const dice = unit === false ? null : diceOf(card); let diceUsed = false;
  const withDice = (v) => { if (!dice || diceUsed) return v; diceUsed = true; return v === 0 ? diceMark(dice) : `${diceMark(dice)} + ${v}`; };
  const parts = [];
  for (const f of card.fx) {
    switch (f.t) {
      case 'dmg': {
        const v = withDice(flat(f, unit));
        let s = card.el !== 'neutral' ? t('Deal {v} {el} damage', { v, el: ELEMENTS[card.el].name }) : t('Deal {v} damage', { v });
        if (f.hits > 1) s += ` ×${f.hits}`;
        if (f.fromBlock) s += t(', +{n}% of your Block', { n: Math.round(f.fromBlock * 100) });
        if (f.crit) s += t(', +{n}% crit', { n: f.crit });
        if (f.execute) s += t('. Double vs targets under {n}% HP', { n: f.execute * 100 });
        if (f.drain) s += t('. Heal {n}% of damage dealt', { n: f.drain * 100 });
        parts.push(s + t('.')); break;
      }
      case 'block': parts.push(t(f.self ? 'Gain {v} Block.' : 'Grant {v} Block.', { v: dice?.color === 'green' ? withDice(flat(f, unit)) : flat(f, unit) })); break;
      case 'heal': parts.push(t(f.self ? 'Heal yourself {v} HP.' : 'Heal {v} HP.', { v: dice?.color === 'green' ? withDice(flat(f, unit)) : flat(f, unit) })); break;
      case 'status': parts.push(t(f.self ? 'Gain {st}.' : STATUS_INFO[f.st].debuff ? 'Apply {st}.' : 'Grant {st}.', { st: `${STATUS_INFO[f.st].name}${['stun', 'frozen', 'mark', 'stealth'].includes(f.st) ? '' : ' ' + f.n}` })); break;
      case 'move': parts.push(t('Move up to {n} hexes.', { n: f.v })); break;
      case 'teleport': parts.push(t('Teleport to a hex within {n}.', { n: card.range })); break;
      case 'dash': parts.push(t('Dash next to an enemy within {n}.', { n: card.range })); break;
      case 'push': parts.push(t('Push {n}. If blocked, Slam for the hexes left.', { n: f.v })); break;
      case 'pull': parts.push(t('Pull {n} toward you.', { n: f.v })); break;
      case 'draw': parts.push(t('Draw {n}.', { n: f.v })); break;
      case 'energy': parts.push(t('Gain {n} extra Action Slot this turn.', { n: f.v })); break;
      case 'mp': parts.push(t('Restore {n} MP.', { n: f.v })); break;
      case 'cleanse': parts.push(t('Remove all debuffs.')); break;
      case 'taunt': parts.push(t('Taunt nearby enemies.')); break;
      case 'summon': parts.push(t(f.id === 'turret' ? 'Build a Turret that fires each round.' : 'Raise an Iron Barricade (8 HP).')); break;
      case 'revive': parts.push(t('Revive fallen allies at {n}% HP.', { n: f.pct * 100 })); break;
      case 'selfdmg': parts.push(t('Lose {n} HP.', { n: f.v })); break;
      default: break;
    }
  }
  if (card.charge) parts.push(t('Charge: +1 die per extra Action Slot.'));
  if (card.combo) {
    const b = card.combo.bonus;
    parts.push(t('Combo (after {cat}): {bonus}.', { cat: t(card.combo.after), bonus: `${b.dmg ? t('+{n} damage', { n: b.dmg }) : ''}${b.status ? STATUS_INFO[b.status.st].name : ''}` }));
  }
  const n = card.size; const shape = card.shape === 'line' ? t('Line {n}', { n }) : card.shape === 'cone' ? t('Cone {n}', { n }) : card.shape === 'area' ? t('Area r{n}', { n }) : card.shape === 'burst' ? t('Around self r{n}', { n }) : null;
  return { text: parts.join(' '), shape, dice };
}
// The fixed part of a card's number: its own value plus the hero's stat (a plain number once a hero is known).
const flat = (f, unit) => (unit && f.s ? f.v + Math.round(unit.stats?.[f.s] || 0) : f.s ? (f.v ? `${f.v} + ${STAT_NAMES[f.s]}` : STAT_NAMES[f.s]) : f.v);
