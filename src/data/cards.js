// Card Engine data — every skill card in LAST WORLD.
// fx effect types:
//   dmg {v, s:'atk'|'matk', hits}   block {v}   heal {v, s}     (board-game scale: dice + v + stat)
//   status {st, n, self}  move {v}  teleport  dash  push {v}  pull {v}
//   draw {v}  energy {v} (extra Action Slots this turn)  mp {v}  cleanse  taunt  summon {id}  revive {pct}
//   trample (run to the far end of the card's line, hitting everything on the way)
//   dmg extras: onKill {energy, draw, heal} (paid when the card kills)  perPlayed v (+v per card played before it this turn)
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
  { id: 'k_whirl', cls: 'knight', name: 'Whirlwind', cat: 'attack', icon: 'whirl', tg: 'self', shape: 'burst', size: 1, cost: 2, cd: 2, fx: [{ t: 'dmg', v: 1, s: 'atk', guard: 1 }] },
  { id: 'k_rally', cls: 'knight', name: 'Rally', cat: 'buff', icon: 'banner', tg: 'self', shape: 'burst', size: 2, cd: 3, allies: true, fx: [{ t: 'status', st: 'strength', n: 2 }] },
  { id: 'k_vow', cls: 'knight', name: "Guardian's Vow", cat: 'defense', icon: 'shield', tg: 'ally', range: 3, cd: 2, fx: [{ t: 'block', v: 3 }] },
  { id: 'k_advance', cls: 'knight', name: 'Advance', cat: 'movement', icon: 'boot', tg: 'hex', range: 2, cost: 0, cd: 1, fx: [{ t: 'move', v: 2 }] },
  { id: 'k_valor', charge: true, cls: 'knight', name: 'Valor Strike', cat: 'attack', icon: 'sword', rarity: 'rare', cost: 2, cd: 2, el: 'holy', fx: [{ t: 'dmg', v: 2, s: 'atk' }] },
  { id: 'k_ironwill', cls: 'knight', name: 'Iron Will', cat: 'buff', icon: 'heart', rarity: 'rare', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'cleanse' }, { t: 'status', st: 'thorns', n: 3 }] },
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
  { id: 'a_pierce', cls: 'archer', name: 'Piercing Arrow', cat: 'attack', icon: 'arrow', shape: 'line', size: 5, tg: 'any', range: 1, cost: 2, cd: 2, el: 'wind', fx: [{ t: 'dmg', v: 1, s: 'atk', far: { d: 3, v: 2 } }] },
  { id: 'a_roll', cls: 'archer', name: 'Evasive Roll', cat: 'movement', icon: 'boot', tg: 'hex', range: 2, cd: 1, fx: [{ t: 'move', v: 2 }, { t: 'block', v: 1, self: true }] },
  { id: 'a_mark', cls: 'archer', name: "Hunter's Mark", cat: 'special', icon: 'eye', range: 6, cost: 0, cd: 2, fx: [{ t: 'status', st: 'mark', n: 1 }, { t: 'status', st: 'vulnerable', n: 2 }] },
  { id: 'a_windstep', cls: 'archer', name: 'Wind Step', cat: 'buff', icon: 'wind', tg: 'self', cd: 2, el: 'wind', fx: [{ t: 'status', st: 'haste', n: 2 }, { t: 'draw', v: 1 }] },
  { id: 'a_poison', cls: 'archer', name: 'Venom Arrow', cat: 'attack', icon: 'arrow', range: 5, cd: 1, el: 'poison', proj: 'arrow', fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'status', st: 'poison', n: 3 }] },
  { id: 'a_blank', cls: 'archer', name: 'Point Blank', cat: 'attack', icon: 'arrow', range: 1, cd: 1, fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'push', v: 2 }] },
  { id: 'a_snare', cls: 'archer', name: 'Snare Trap', cat: 'special', icon: 'trap', rarity: 'rare', range: 4, cd: 2, fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'status', st: 'root', n: 2 }, { t: 'status', st: 'mark', n: 1 }] },
  { id: 'a_focus', cls: 'archer', name: 'Focus', cat: 'buff', icon: 'eye', rarity: 'rare', tg: 'self', cd: 2, fx: [{ t: 'status', st: 'strength', n: 2 }, { t: 'draw', v: 1 }] },
  { id: 'a_storm', cls: 'archer', name: 'Storm of Arrows', cat: 'attack', icon: 'arrows', rarity: 'epic', range: 5, shape: 'area', size: 2, tg: 'any', cost: 3, mp: 8, cd: 4, el: 'wind', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'mark', n: 1 }] },
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
  { id: 'r_sporebloom', cls: 'any', name: 'Spore Bloom', cat: 'attack', icon: 'skull', rarity: 'legendary', tg: 'self', shape: 'burst', size: 2, cost: 2, mp: 6, cd: 4, el: 'poison', fx: [{ t: 'status', st: 'poison', n: 3 }, { t: 'dmg', v: 1, s: 'atk', perStatus: { st: 'poison', v: 1 } }] },
  { id: 'r_overclock', cls: 'any', name: 'Overclock', cat: 'buff', icon: 'bolt', rarity: 'legendary', tg: 'self', cost: 0, cd: 5, el: 'wind', fx: [{ t: 'energy', v: 2 }, { t: 'cool', v: 2 }, { t: 'draw', v: 1 }] },
  { id: 'r_tidal', cls: 'any', name: 'Tidal Crash', cat: 'attack', icon: 'snow', rarity: 'legendary', shape: 'line', size: 5, tg: 'any', cost: 2, mp: 8, cd: 4, el: 'ice', fx: [{ t: 'dmg', v: 3, s: 'matk' }, { t: 'push', v: 3 }, { t: 'status', st: 'chill', n: 2 }] },
  { id: 'r_eruption', cls: 'any', name: 'Eruption', cat: 'attack', icon: 'meteor', rarity: 'legendary', range: 5, shape: 'area', size: 2, tg: 'any', cost: 3, mp: 10, cd: 4, el: 'fire', fx: [{ t: 'status', st: 'burn', n: 3 }, { t: 'dmg', v: 2, s: 'matk', perStatus: { st: 'burn', v: 1 } }] },
  { id: 'r_worldrender', cls: 'any', name: 'Worldrender', cat: 'attack', icon: 'sword', rarity: 'legendary', cost: 3, mp: 10, cd: 4, el: 'shadow', fx: [{ t: 'breakBlock' }, { t: 'dmg', v: 4, s: 'atk', wounded: 2, drain: 0.3 }] },
]);

// ───────── MORE CARDS (found as loot: battles, chests, merchants) ─────────
add([
  // knight
  { id: 'k_cleave', cls: 'knight', name: 'Cleave', cat: 'attack', icon: 'sword', shape: 'line', size: 2, tg: 'any', cd: 1, fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'k_riposte', cls: 'knight', name: 'Riposte', cat: 'attack', icon: 'sword', cd: 1, combo: { after: 'defense', bonus: { dmg: 3 } }, fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'k_bulwark', cls: 'knight', name: 'Bulwark', cat: 'defense', icon: 'shield', rarity: 'rare', tg: 'self', cost: 2, cd: 3, fx: [{ t: 'block', v: 4 }, { t: 'status', st: 'fortify', n: 1 }] },
  { id: 'k_radiant', cls: 'knight', name: 'Radiant Blade', cat: 'attack', icon: 'sword', rarity: 'rare', cd: 2, el: 'holy', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'weak', n: 2 }] },
  { id: 'k_stomp', cls: 'knight', name: 'War Stomp', cat: 'special', icon: 'quake', tg: 'self', shape: 'burst', size: 1, cd: 2, el: 'earth', fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'status', st: 'root', n: 1 }] },
  { id: 'k_shieldslam', cls: 'knight', name: 'Shield Slam', cat: 'attack', icon: 'shield', cost: 2, cd: 2, fx: [{ t: 'dmg', v: 1, s: 'atk', spendBlock: true }] },
  { id: 'k_laststand', cls: 'knight', name: 'Last Stand', cat: 'attack', icon: 'sword', rarity: 'rare', cd: 2, fx: [{ t: 'dmg', v: 1, s: 'atk', wounded: 2 }] },
  { id: 'k_holdline', cls: 'knight', name: 'Hold the Line', cat: 'defense', icon: 'banner', rarity: 'rare', tg: 'self', shape: 'burst', size: 2, allies: true, cd: 3, fx: [{ t: 'block', v: 2 }] },
  { id: 'k_executioner', cls: 'knight', name: 'Executioner', cat: 'attack', icon: 'skull', rarity: 'epic', cost: 2, cd: 3, fx: [{ t: 'dmg', v: 2, s: 'atk', execute: 0.25 }] },
  // mage
  { id: 'm_spark', cls: 'mage', name: 'Spark', cat: 'attack', icon: 'bolt', range: 3, el: 'wind', proj: 'wind', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'vulnerable', n: 1 }] },
  { id: 'm_detonate', cls: 'mage', name: 'Detonate', cat: 'attack', icon: 'flame', rarity: 'rare', range: 4, cd: 2, el: 'fire', fx: [{ t: 'dmg', v: 0, s: 'matk', perStatus: { st: 'burn', v: 2, consume: true } }] },
  { id: 'm_shatter', cls: 'mage', name: 'Shatter', cat: 'attack', icon: 'snow', rarity: 'rare', range: 4, cd: 2, el: 'ice', proj: 'ice', fx: [{ t: 'dmg', v: 1, s: 'matk', ifStatus: { sts: ['chill', 'frozen'], v: 4 } }] },
  { id: 'm_wildfire', cls: 'mage', name: 'Wildfire', cat: 'special', icon: 'flame', range: 4, cd: 2, el: 'fire', fx: [{ t: 'status', st: 'burn', n: 1 }, { t: 'spread', sts: ['burn'] }] },
  { id: 'm_overload', cls: 'mage', name: 'Arcane Overload', cat: 'attack', icon: 'orb', rarity: 'epic', range: 5, cost: 2, cd: 3, proj: 'arcane', fx: [{ t: 'dmg', v: 0, s: 'matk', spendMp: 4 }] },
  { id: 'm_stonespike', cls: 'mage', name: 'Stone Spike', cat: 'attack', icon: 'quake', range: 4, cd: 1, el: 'earth', proj: 'earth', fx: [{ t: 'dmg', v: 2, s: 'matk' }, { t: 'push', v: 1 }] },
  { id: 'm_voidbolt', cls: 'mage', name: 'Void Bolt', cat: 'attack', icon: 'orb', range: 5, cd: 1, mp: 2, el: 'shadow', proj: 'shadow', fx: [{ t: 'dmg', v: 2, s: 'matk' }, { t: 'status', st: 'weak', n: 1 }] },
  { id: 'm_flamewave', cls: 'mage', name: 'Flame Wave', cat: 'attack', icon: 'flame', shape: 'line', size: 3, tg: 'any', cost: 2, mp: 3, cd: 2, el: 'fire', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'burn', n: 2 }] },
  { id: 'm_chain', cls: 'mage', name: 'Chain Lightning', cat: 'attack', icon: 'bolt', rarity: 'rare', shape: 'line', size: 5, tg: 'any', cost: 2, mp: 4, cd: 2, el: 'wind', fx: [{ t: 'dmg', v: 2, s: 'matk' }] },
  { id: 'm_deepfreeze', cls: 'mage', name: 'Deep Freeze', cat: 'special', icon: 'snow', rarity: 'rare', range: 4, cost: 2, mp: 5, cd: 3, el: 'ice', fx: [{ t: 'status', st: 'frozen', n: 1 }, { t: 'dmg', v: 1, s: 'matk' }] },
  { id: 'm_toxic', cls: 'mage', name: 'Toxic Cloud', cat: 'attack', icon: 'skull', rarity: 'rare', range: 4, shape: 'area', size: 1, tg: 'any', cost: 2, mp: 4, cd: 3, el: 'poison', fx: [{ t: 'dmg', v: 0, s: 'matk' }, { t: 'status', st: 'poison', n: 4 }] },
  { id: 'm_earthquake', cls: 'mage', name: 'Earthquake', cat: 'attack', icon: 'quake', rarity: 'epic', tg: 'self', shape: 'burst', size: 2, cost: 3, mp: 8, cd: 4, el: 'earth', fx: [{ t: 'dmg', v: 2, s: 'matk' }, { t: 'status', st: 'stun', n: 1 }] },
  // archer
  { id: 'a_flame', cls: 'archer', name: 'Flame Arrow', cat: 'attack', icon: 'arrow', range: 5, cd: 1, el: 'fire', proj: 'arrow', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'burn', n: 2 }] },
  { id: 'a_longshot', cls: 'archer', name: 'Long Shot', cat: 'attack', icon: 'arrow', range: 7, cd: 1, proj: 'arrow', fx: [{ t: 'dmg', v: 0, s: 'atk', far: { d: 4, v: 3 } }] },
  { id: 'a_quiver', cls: 'archer', name: 'Full Quiver', cat: 'attack', icon: 'arrows', rarity: 'rare', range: 5, cost: 2, cd: 2, proj: 'arrow', fx: [{ t: 'dmg', v: 0, s: 'atk', perHand: 1 }] },
  { id: 'a_double', cls: 'archer', name: 'Double Shot', cat: 'attack', icon: 'arrows', range: 4, cd: 1, proj: 'arrow', fx: [{ t: 'dmg', v: 0, s: 'atk', hits: 2, keepMark: true }] },
  { id: 'a_disengage', cls: 'archer', name: 'Disengage', cat: 'movement', icon: 'boot', tg: 'hex', range: 3, cd: 2, fx: [{ t: 'move', v: 3 }, { t: 'status', st: 'haste', n: 1, self: true }] },
  { id: 'a_camo', cls: 'archer', name: 'Camouflage', cat: 'defense', icon: 'leaf', tg: 'self', cd: 3, fx: [{ t: 'status', st: 'stealth', n: 1 }, { t: 'draw', v: 1 }] },
  { id: 'a_concuss', cls: 'archer', name: 'Concussive Shot', cat: 'attack', icon: 'arrow', rarity: 'rare', range: 4, cd: 2, proj: 'arrow', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'stun', n: 1 }] },
  { id: 'a_headshot', charge: true, cls: 'archer', name: 'Headshot', cat: 'attack', icon: 'eye', rarity: 'epic', range: 7, cost: 3, cd: 3, proj: 'arrow', fx: [{ t: 'dmg', v: 3, s: 'atk', crit: 40, ifStatus: { sts: ['mark'], v: 3 } }] },
  { id: 'a_firerain', cls: 'archer', name: 'Rain of Fire', cat: 'attack', icon: 'arrows', rarity: 'epic', range: 5, shape: 'area', size: 2, tg: 'any', cost: 3, mp: 8, cd: 4, el: 'fire', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'burn', n: 2 }] },
  // assassin
  { id: 's_hamstring', cls: 'assassin', name: 'Hamstring', cat: 'attack', icon: 'dagger', cd: 1, fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'status', st: 'root', n: 1 }, { t: 'status', st: 'bleed', n: 2 }] },
  { id: 's_ambush', cls: 'assassin', name: 'Ambush', cat: 'attack', icon: 'dagger', cd: 1, el: 'shadow', fx: [{ t: 'dmg', v: 1, s: 'atk', alone: 3 }] },
  { id: 's_fester', cls: 'assassin', name: 'Fester', cat: 'attack', icon: 'dagger', rarity: 'rare', cd: 2, el: 'poison', fx: [{ t: 'dmg', v: 0, s: 'atk', perStatus: { st: 'poison', v: 1 } }] },
  { id: 's_contagion', cls: 'assassin', name: 'Contagion', cat: 'special', icon: 'skull', rarity: 'rare', range: 3, cd: 2, el: 'poison', fx: [{ t: 'status', st: 'poison', n: 1 }, { t: 'spread', sts: ['poison', 'bleed'] }] },
  { id: 's_twinfangs', cls: 'assassin', name: 'Twin Fangs', cat: 'attack', icon: 'dagger', cd: 1, el: 'poison', fx: [{ t: 'dmg', v: 0, s: 'atk', hits: 2 }, { t: 'status', st: 'poison', n: 1 }] },
  { id: 's_miasma', cls: 'assassin', name: 'Miasma', cat: 'attack', icon: 'skull', tg: 'self', shape: 'burst', size: 1, cd: 2, el: 'poison', fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'status', st: 'poison', n: 3 }] },
  { id: 's_rupture', cls: 'assassin', name: 'Rupture', cat: 'attack', icon: 'dagger', rarity: 'rare', cost: 2, cd: 2, fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'bleed', n: 4 }] },
  { id: 's_vanish', cls: 'assassin', name: 'Vanish', cat: 'movement', icon: 'blink', rarity: 'rare', tg: 'hex', range: 4, cd: 3, el: 'shadow', fx: [{ t: 'teleport' }, { t: 'status', st: 'stealth', n: 1, self: true }] },
  { id: 's_deathmark', cls: 'assassin', name: 'Death Mark', cat: 'special', icon: 'skull', rarity: 'rare', range: 3, cd: 3, el: 'shadow', fx: [{ t: 'status', st: 'mark', n: 1 }, { t: 'status', st: 'vulnerable', n: 3 }] },
  { id: 's_shuriken', cls: 'assassin', name: 'Shuriken Storm', cat: 'attack', icon: 'whirl', rarity: 'epic', tg: 'self', shape: 'burst', size: 2, cost: 3, mp: 5, cd: 3, fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'bleed', n: 2 }] },
  // priest
  { id: 'p_flash', cls: 'priest', name: 'Holy Flash', cat: 'attack', icon: 'sun', tg: 'self', shape: 'burst', size: 1, cd: 2, mp: 2, el: 'holy', fx: [{ t: 'dmg', v: 0, s: 'matk' }, { t: 'status', st: 'weak', n: 1 }] },
  { id: 'p_renew', cls: 'priest', name: 'Renew', cat: 'buff', icon: 'heart', tg: 'ally', range: 3, cd: 1, el: 'holy', fx: [{ t: 'status', st: 'regen', n: 4 }] },
  { id: 'p_rebuke', cls: 'priest', name: 'Rebuke', cat: 'attack', icon: 'sun', range: 3, cd: 1, el: 'holy', proj: 'holy', fx: [{ t: 'dmg', v: 1, s: 'matk', ifStatus: { sts: ['weak', 'vulnerable'], v: 3 } }] },
  { id: 'p_vigil', cls: 'priest', name: 'Vigil', cat: 'buff', icon: 'star', rarity: 'rare', tg: 'self', cd: 4, fx: [{ t: 'recall', v: 1 }, { t: 'cool', v: 1 }] },
  { id: 'p_swift', cls: 'priest', name: 'Swift Blessing', cat: 'buff', icon: 'wind', tg: 'ally', range: 3, cd: 2, el: 'wind', fx: [{ t: 'status', st: 'haste', n: 2 }, { t: 'block', v: 1 }] },
  { id: 'p_faith', cls: 'priest', name: 'Hammer of Faith', cat: 'attack', icon: 'mace', rarity: 'rare', cost: 2, cd: 2, el: 'holy', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'stun', n: 1 }] },
  { id: 'p_ward', cls: 'priest', name: 'Divine Ward', cat: 'defense', icon: 'shield', rarity: 'rare', tg: 'self', shape: 'burst', size: 2, allies: true, cost: 2, mp: 4, cd: 3, el: 'holy', fx: [{ t: 'block', v: 3 }] },
  { id: 'p_banish', cls: 'priest', name: 'Banish', cat: 'attack', icon: 'sun', rarity: 'rare', range: 4, cost: 2, mp: 4, cd: 3, el: 'holy', proj: 'holy', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'push', v: 3 }] },
  { id: 'p_lifebloom', cls: 'priest', name: 'Lifebloom', cat: 'buff', icon: 'leaf', rarity: 'rare', tg: 'ally', range: 3, cost: 2, mp: 5, cd: 3, el: 'earth', fx: [{ t: 'heal', v: 4, s: 'matk' }, { t: 'status', st: 'regen', n: 2 }] },
  { id: 'p_radiance', cls: 'priest', name: 'Radiance', cat: 'attack', icon: 'sun', rarity: 'epic', tg: 'self', shape: 'burst', size: 2, cost: 3, mp: 8, cd: 4, el: 'holy', fx: [{ t: 'dmg', v: 2, s: 'matk' }, { t: 'status', st: 'vulnerable', n: 2 }] },
  // blacksmith
  { id: 'b_sunder', cls: 'blacksmith', name: 'Sunder', cat: 'attack', icon: 'hammer', cd: 2, fx: [{ t: 'breakBlock' }, { t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'b_retool', cls: 'blacksmith', name: 'Retool', cat: 'buff', icon: 'wrench', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'cool', v: 2 }] },
  { id: 'b_salvage', cls: 'blacksmith', name: 'Salvage', cat: 'buff', icon: 'wrench', rarity: 'rare', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'recall', v: 1 }, { t: 'block', v: 1 }] },
  { id: 'b_oil', cls: 'blacksmith', name: 'Oil Flask', cat: 'special', icon: 'flame', range: 3, cd: 2, el: 'fire', proj: 'fire', fx: [{ t: 'status', st: 'vulnerable', n: 2 }, { t: 'status', st: 'burn', n: 2 }] },
  { id: 'b_magnet', cls: 'blacksmith', name: 'Magnet Pull', cat: 'special', icon: 'bolt', range: 4, cd: 2, el: 'wind', fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'pull', v: 2 }] },
  { id: 'b_whetstone', cls: 'blacksmith', name: 'Whetstone', cat: 'buff', icon: 'anvil', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'status', st: 'strength', n: 2 }, { t: 'draw', v: 1 }] },
  { id: 'b_shrapnel', cls: 'blacksmith', name: 'Shrapnel Blast', cat: 'attack', icon: 'flame', tg: 'self', shape: 'burst', size: 1, cost: 2, cd: 2, el: 'fire', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'bleed', n: 2 }] },
  { id: 'b_anvildrop', cls: 'blacksmith', name: 'Anvil Drop', cat: 'attack', icon: 'anvil', rarity: 'rare', range: 3, shape: 'area', size: 1, tg: 'any', cost: 2, cd: 2, el: 'earth', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'weak', n: 2 }] },
  { id: 'b_mortar', cls: 'blacksmith', name: 'Deploy Mortar', cat: 'special', icon: 'turret', rarity: 'rare', tg: 'hex', range: 2, cost: 2, cd: 4, el: 'earth', fx: [{ t: 'summon', id: 'mortar' }] },
  { id: 'b_meteorhammer', charge: true, cls: 'blacksmith', name: 'Meteor Hammer', cat: 'attack', icon: 'hammer', rarity: 'epic', cost: 3, mp: 6, cd: 4, el: 'fire', fx: [{ t: 'dmg', v: 3, s: 'atk' }, { t: 'status', st: 'burn', n: 3 }, { t: 'push', v: 2 }] },
  // any class
  { id: 'n_catchbreath', cls: 'any', name: 'Catch Breath', cat: 'buff', icon: 'heart', rarity: 'rare', tg: 'self', cd: 3, fx: [{ t: 'cool', v: 1 }, { t: 'heal', v: 1 }] },
  { id: 'n_firstaid', cls: 'any', name: 'First Aid', cat: 'buff', icon: 'cross', tg: 'ally', range: 1, cd: 3, fx: [{ t: 'heal', v: 2 }] },
  { id: 'n_stone', cls: 'any', name: 'Throw Stone', cat: 'attack', icon: 'quake', range: 3, el: 'earth', proj: 'earth', fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'push', v: 1 }] },
  { id: 'n_breath', cls: 'any', name: 'Deep Breath', cat: 'buff', icon: 'wind', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'mp', v: 5 }, { t: 'cleanse' }] },
]);

// ───────── ADVANCED CLASSES (jobs, from level 30; see src/data/jobs.js and docs/jobs.md) ─────────
// Each job has twelve cards. `start` marks the three given when the job is taken; `ult` the job's Legendary.
function jobCards(job, cls, list) { add(list.map((c) => ({ cls, job, ...c }))); }
jobCards('lordknight', 'knight', [
  { id: 'lk_thrust', start: true, name: 'Lance Thrust', cat: 'attack', icon: 'sword', range: 2, fx: [{ t: 'dmg', v: 2, s: 'atk' }] },
  { id: 'lk_spur', start: true, name: 'Spur Charge', cat: 'movement', icon: 'boot', range: 3, cd: 1, fx: [{ t: 'dash' }, { t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'lk_impale', start: true, name: 'Impale', cat: 'attack', icon: 'sword', range: 2, cd: 1, fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'bleed', n: 2 }, { t: 'status', st: 'root', n: 1 }] },
  { id: 'lk_banner', name: 'War Banner', cat: 'buff', icon: 'banner', tg: 'self', shape: 'burst', size: 2, allies: true, cd: 3, fx: [{ t: 'status', st: 'strength', n: 1 }, { t: 'status', st: 'haste', n: 1 }] },
  { id: 'lk_sweep', name: 'Halberd Sweep', cat: 'attack', icon: 'whirl', tg: 'any', shape: 'cone', size: 2, cost: 2, cd: 2, fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'push', v: 1 }] },
  { id: 'lk_trample', name: 'Trample', cat: 'attack', icon: 'boot', rarity: 'rare', tg: 'any', shape: 'line', size: 4, cost: 2, cd: 2, fx: [{ t: 'trample' }, { t: 'dmg', v: 2, s: 'atk' }] },
  { id: 'lk_brace', name: 'Brace the Spear', cat: 'defense', icon: 'shield', rarity: 'rare', tg: 'self', cd: 2, fx: [{ t: 'block', v: 2 }, { t: 'status', st: 'thorns', n: 2 }] },
  { id: 'lk_skewer', name: 'Skewer', cat: 'attack', icon: 'sword', rarity: 'rare', tg: 'any', shape: 'line', size: 2, cost: 2, cd: 2, fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'vulnerable', n: 2 }] },
  { id: 'lk_momentum', name: 'Momentum', cat: 'buff', icon: 'boot', rarity: 'rare', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'energy', v: 1 }, { t: 'status', st: 'haste', n: 1 }] },
  { id: 'lk_leap', name: 'Dragoon Leap', cat: 'attack', icon: 'meteor', rarity: 'epic', tg: 'any', range: 4, shape: 'area', size: 1, cost: 3, mp: 6, cd: 3, fx: [{ t: 'dmg', v: 3, s: 'atk' }, { t: 'status', st: 'stun', n: 1 }] },
  { id: 'lk_line', name: 'Unbroken Line', cat: 'defense', icon: 'banner', rarity: 'epic', tg: 'self', shape: 'burst', size: 2, allies: true, cost: 2, mp: 6, cd: 4, fx: [{ t: 'block', v: 3 }, { t: 'status', st: 'strength', n: 2 }] },
  { id: 'lk_charge1000', name: 'Thousand-Lance Charge', cat: 'attack', icon: 'sword', rarity: 'legendary', ult: true, tg: 'any', shape: 'line', size: 6, cost: 3, mp: 10, cd: 5, fx: [{ t: 'trample' }, { t: 'dmg', v: 4, s: 'atk' }, { t: 'status', st: 'bleed', n: 2 }, { t: 'push', v: 1 }] },
]);
jobCards('paladin', 'knight', [
  { id: 'pa_blade', start: true, name: 'Sacred Blade', cat: 'attack', icon: 'sword', el: 'holy', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'block', v: 1, self: true }] },
  { id: 'pa_faith', start: true, name: 'Shield of Faith', cat: 'defense', icon: 'shield', tg: 'ally', range: 3, cd: 1, el: 'holy', fx: [{ t: 'block', v: 3 }] },
  { id: 'pa_consecrate', start: true, name: 'Consecrate', cat: 'attack', icon: 'sun', tg: 'self', shape: 'burst', size: 1, cd: 2, el: 'holy', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'weak', n: 1 }] },
  { id: 'pa_hands', name: 'Lay on Hands', cat: 'buff', icon: 'cross', tg: 'ally', range: 1, cd: 2, el: 'holy', fx: [{ t: 'heal', v: 3 }] },
  { id: 'pa_oath', name: 'Oath of Light', cat: 'buff', icon: 'sun', tg: 'self', cost: 0, cd: 3, el: 'holy', fx: [{ t: 'cleanse' }, { t: 'status', st: 'regen', n: 2 }] },
  { id: 'pa_bond', name: 'Aegis Bond', cat: 'defense', icon: 'shield', rarity: 'rare', tg: 'ally', range: 3, cd: 2, el: 'holy', fx: [{ t: 'block', v: 3 }, { t: 'block', v: 2, self: true }] },
  { id: 'pa_dawn', name: 'Hammer of Dawn', cat: 'attack', icon: 'mace', rarity: 'rare', cost: 2, cd: 2, el: 'holy', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'stun', n: 1 }] },
  { id: 'pa_ground', name: 'Holy Ground', cat: 'buff', icon: 'cross', rarity: 'rare', tg: 'self', shape: 'burst', size: 2, allies: true, cost: 2, mp: 4, cd: 3, el: 'holy', fx: [{ t: 'status', st: 'regen', n: 3 }, { t: 'block', v: 1 }] },
  { id: 'pa_aura', name: 'Retribution Aura', cat: 'defense', icon: 'sun', rarity: 'rare', tg: 'self', cd: 3, el: 'holy', fx: [{ t: 'status', st: 'thorns', n: 3 }, { t: 'status', st: 'fortify', n: 1 }] },
  { id: 'pa_divine', name: 'Divine Shield', cat: 'defense', icon: 'shield', rarity: 'epic', tg: 'self', shape: 'burst', size: 2, allies: true, cost: 2, mp: 8, cd: 4, el: 'holy', fx: [{ t: 'block', v: 4 }, { t: 'cleanse' }] },
  { id: 'pa_crusader', charge: true, name: 'Crusader Strike', cat: 'attack', icon: 'sword', rarity: 'epic', cost: 2, cd: 3, el: 'holy', fx: [{ t: 'dmg', v: 3, s: 'atk' }, { t: 'status', st: 'vulnerable', n: 2 }] },
  { id: 'pa_judgment', name: 'Judgment of Heaven', cat: 'attack', icon: 'sun', rarity: 'legendary', ult: true, tg: 'any', range: 5, shape: 'area', size: 2, cost: 3, mp: 12, cd: 5, el: 'holy', fx: [{ t: 'dmg', v: 4, s: 'atk' }, { t: 'status', st: 'weak', n: 2 }, { t: 'status', st: 'stun', n: 1 }] },
]);
jobCards('sorcerer', 'mage', [
  { id: 'so_lash', start: true, name: 'Flame Lash', cat: 'attack', icon: 'flame', range: 4, el: 'fire', proj: 'fire', fx: [{ t: 'dmg', v: 2, s: 'matk' }, { t: 'status', st: 'burn', n: 1 }] },
  { id: 'so_rime', start: true, name: 'Rime Spear', cat: 'attack', icon: 'snow', range: 4, cd: 1, el: 'ice', proj: 'ice', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'chill', n: 2 }] },
  { id: 'so_steam', start: true, name: 'Steam Burst', cat: 'attack', icon: 'smoke', range: 4, cd: 1, el: 'fire', fx: [{ t: 'dmg', v: 1, s: 'matk', perStatus: { st: 'chill', v: 2, consume: true } }] },
  { id: 'so_ward', name: 'Mana Ward', cat: 'defense', icon: 'orb', tg: 'self', cd: 2, fx: [{ t: 'block', v: 2 }, { t: 'mp', v: 4 }] },
  { id: 'so_embers', name: 'Ember Field', cat: 'special', icon: 'flame', tg: 'any', range: 4, shape: 'area', size: 1, cd: 2, el: 'fire', fx: [{ t: 'status', st: 'burn', n: 2 }] },
  { id: 'so_firestorm', name: 'Firestorm', cat: 'attack', icon: 'flame', rarity: 'rare', tg: 'any', range: 4, shape: 'area', size: 1, cost: 2, mp: 4, cd: 2, el: 'fire', fx: [{ t: 'dmg', v: 2, s: 'matk' }, { t: 'status', st: 'burn', n: 2 }] },
  { id: 'so_glacier', name: 'Glacier', cat: 'attack', icon: 'snow', rarity: 'rare', tg: 'any', shape: 'line', size: 4, cost: 2, mp: 4, cd: 2, el: 'ice', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'chill', n: 2 }, { t: 'status', st: 'root', n: 1 }] },
  { id: 'so_attune', name: 'Attunement', cat: 'buff', icon: 'star', rarity: 'rare', tg: 'self', cost: 0, cd: 3, fx: [{ t: 'energy', v: 1 }, { t: 'mp', v: 6 }] },
  { id: 'so_frostfire', name: 'Frostfire Bolt', cat: 'attack', icon: 'orb', rarity: 'rare', range: 5, cost: 2, mp: 4, cd: 2, el: 'fire', proj: 'fire', fx: [{ t: 'dmg', v: 2, s: 'matk' }, { t: 'status', st: 'burn', n: 2 }, { t: 'status', st: 'chill', n: 2 }] },
  { id: 'so_inferno', name: 'Inferno', cat: 'attack', icon: 'flame', rarity: 'epic', tg: 'self', shape: 'burst', size: 2, cost: 3, mp: 8, cd: 4, el: 'fire', fx: [{ t: 'dmg', v: 3, s: 'matk' }, { t: 'status', st: 'burn', n: 3 }] },
  { id: 'so_zero', name: 'Absolute Zero', cat: 'attack', icon: 'snow', rarity: 'epic', tg: 'any', range: 5, shape: 'area', size: 2, cost: 3, mp: 8, cd: 4, el: 'ice', fx: [{ t: 'dmg', v: 2, s: 'matk' }, { t: 'status', st: 'frozen', n: 1 }, { t: 'status', st: 'chill', n: 2 }] },
  { id: 'so_cataclysm', name: 'Cataclysm', cat: 'attack', icon: 'meteor', rarity: 'legendary', ult: true, tg: 'any', range: 6, shape: 'area', size: 2, cost: 3, mp: 12, cd: 5, el: 'fire', fx: [{ t: 'dmg', v: 4, s: 'matk' }, { t: 'status', st: 'burn', n: 2 }, { t: 'status', st: 'chill', n: 2 }] },
]);
jobCards('warlock', 'mage', [
  { id: 'wl_hex', start: true, name: 'Hex Bolt', cat: 'attack', icon: 'orb', range: 4, el: 'shadow', proj: 'shadow', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'curse', n: 2 }] },
  { id: 'wl_siphon', start: true, name: 'Siphon', cat: 'attack', icon: 'heart', range: 3, cd: 1, el: 'shadow', fx: [{ t: 'dmg', v: 1, s: 'matk', drain: 0.5 }] },
  { id: 'wl_pact', start: true, name: 'Dark Pact', cat: 'buff', icon: 'skull', tg: 'self', cost: 0, cd: 2, el: 'shadow', fx: [{ t: 'selfdmg', v: 2 }, { t: 'mp', v: 6 }, { t: 'draw', v: 1 }] },
  { id: 'wl_wither', name: 'Wither', cat: 'special', icon: 'skull', range: 4, cd: 1, el: 'shadow', fx: [{ t: 'status', st: 'weak', n: 2 }, { t: 'status', st: 'curse', n: 1 }] },
  { id: 'wl_grasp', name: 'Shadow Grasp', cat: 'special', icon: 'blink', range: 4, cd: 2, el: 'shadow', fx: [{ t: 'pull', v: 2 }, { t: 'status', st: 'root', n: 1 }] },
  { id: 'wl_agony', name: 'Agony', cat: 'attack', icon: 'skull', rarity: 'rare', range: 4, cost: 2, cd: 2, el: 'shadow', fx: [{ t: 'dmg', v: 0, s: 'matk', perStatus: { st: 'curse', v: 2 } }] },
  { id: 'wl_spread', name: 'Spreading Curse', cat: 'special', icon: 'skull', rarity: 'rare', range: 4, mp: 3, cd: 2, el: 'shadow', fx: [{ t: 'status', st: 'curse', n: 2 }, { t: 'spread', sts: ['curse'] }] },
  { id: 'wl_ritual', name: 'Blood Ritual', cat: 'buff', icon: 'heart', rarity: 'rare', tg: 'self', cd: 3, el: 'shadow', fx: [{ t: 'selfdmg', v: 3 }, { t: 'energy', v: 1 }, { t: 'draw', v: 1 }] },
  { id: 'wl_leech', name: 'Soul Leech', cat: 'attack', icon: 'skull', rarity: 'rare', tg: 'self', shape: 'burst', size: 1, cost: 2, mp: 4, cd: 2, el: 'shadow', fx: [{ t: 'dmg', v: 1, s: 'matk', drain: 0.5 }] },
  { id: 'wl_doom', name: 'Doom', cat: 'special', icon: 'skull', rarity: 'epic', range: 5, cost: 2, mp: 6, cd: 4, el: 'shadow', fx: [{ t: 'status', st: 'curse', n: 5 }, { t: 'status', st: 'vulnerable', n: 2 }] },
  { id: 'wl_chains', name: 'Abyssal Chains', cat: 'attack', icon: 'blink', rarity: 'epic', tg: 'any', range: 4, shape: 'area', size: 1, cost: 3, mp: 8, cd: 4, el: 'shadow', fx: [{ t: 'dmg', v: 2, s: 'matk' }, { t: 'status', st: 'root', n: 2 }, { t: 'status', st: 'curse', n: 2 }] },
  { id: 'wl_eclipse', name: 'Eclipse', cat: 'attack', icon: 'orb', rarity: 'legendary', ult: true, tg: 'self', shape: 'burst', size: 3, cost: 3, mp: 12, cd: 5, el: 'shadow', fx: [{ t: 'dmg', v: 3, s: 'matk', drain: 0.5 }, { t: 'status', st: 'curse', n: 3 }] },
]);
jobCards('marksman', 'archer', [
  { id: 'mk_steady', start: true, name: 'Steady Shot', cat: 'attack', icon: 'arrow', range: 6, proj: 'arrow', fx: [{ t: 'dmg', v: 1, s: 'atk', crit: 15 }] },
  { id: 'mk_spot', start: true, name: "Spotter's Mark", cat: 'special', icon: 'eye', range: 7, cost: 0, cd: 1, fx: [{ t: 'status', st: 'mark', n: 1 }, { t: 'status', st: 'vulnerable', n: 1 }] },
  { id: 'mk_ricochet', start: true, name: 'Ricochet', cat: 'attack', icon: 'arrows', range: 5, cd: 1, proj: 'arrow', fx: [{ t: 'dmg', v: 0, s: 'atk', hits: 2 }] },
  { id: 'mk_reposition', name: 'Reposition', cat: 'movement', icon: 'boot', tg: 'hex', range: 3, cd: 2, fx: [{ t: 'move', v: 3 }, { t: 'draw', v: 1 }] },
  { id: 'mk_cripple', name: 'Crippling Shot', cat: 'attack', icon: 'arrow', range: 5, cd: 1, proj: 'arrow', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'root', n: 1 }, { t: 'status', st: 'weak', n: 1 }] },
  { id: 'mk_pierce', name: 'Piercing Bolt', cat: 'attack', icon: 'arrow', rarity: 'rare', tg: 'any', shape: 'line', size: 6, cost: 2, cd: 2, el: 'wind', fx: [{ t: 'dmg', v: 2, s: 'atk', far: { d: 4, v: 2 } }] },
  { id: 'mk_deadeye', name: 'Deadeye', cat: 'buff', icon: 'eye', rarity: 'rare', tg: 'self', cd: 3, fx: [{ t: 'status', st: 'strength', n: 3 }, { t: 'draw', v: 1 }] },
  { id: 'mk_kill', name: 'Kill Shot', cat: 'attack', icon: 'skull', rarity: 'rare', range: 6, cost: 2, cd: 2, proj: 'arrow', fx: [{ t: 'dmg', v: 1, s: 'atk', execute: 0.3, onKill: { energy: 1 } }] },
  { id: 'mk_suppress', name: 'Suppressing Fire', cat: 'attack', icon: 'arrows', rarity: 'rare', tg: 'any', range: 5, shape: 'area', size: 1, cost: 2, cd: 2, fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'status', st: 'weak', n: 2 }] },
  { id: 'mk_breaker', name: 'Armor Breaker', cat: 'attack', icon: 'arrow', rarity: 'epic', range: 6, cost: 2, cd: 3, proj: 'arrow', fx: [{ t: 'breakBlock' }, { t: 'dmg', v: 3, s: 'atk' }, { t: 'status', st: 'vulnerable', n: 2 }] },
  { id: 'mk_barrage', name: 'Barrage', cat: 'attack', icon: 'arrows', rarity: 'epic', tg: 'any', range: 6, shape: 'area', size: 1, cost: 3, mp: 6, cd: 4, fx: [{ t: 'dmg', v: 1, s: 'atk', hits: 2 }] },
  { id: 'mk_oneshot', charge: true, name: 'One Shot', cat: 'attack', icon: 'eye', rarity: 'legendary', ult: true, range: 9, cost: 3, mp: 10, cd: 5, proj: 'arrow', fx: [{ t: 'dmg', v: 6, s: 'atk', crit: 50, execute: 0.4 }] },
]);
jobCards('ranger', 'archer', [
  { id: 'rg_hawk', start: true, name: 'Call Hawk', cat: 'special', icon: 'phoenix', tg: 'hex', range: 2, cost: 2, cd: 3, el: 'wind', fx: [{ t: 'summon', id: 'hawk' }] },
  { id: 'rg_barbed', start: true, name: 'Barbed Arrow', cat: 'attack', icon: 'arrow', range: 5, proj: 'arrow', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'bleed', n: 2 }] },
  { id: 'rg_beartrap', start: true, name: 'Bear Trap', cat: 'special', icon: 'trap', range: 3, cd: 1, fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'root', n: 2 }] },
  { id: 'rg_thorn', name: 'Thornshot', cat: 'attack', icon: 'arrow', range: 4, cd: 1, el: 'poison', proj: 'arrow', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'poison', n: 2 }, { t: 'status', st: 'bleed', n: 1 }] },
  { id: 'rg_fleet', name: 'Fleet Step', cat: 'movement', icon: 'wind', tg: 'hex', range: 3, cd: 1, el: 'wind', fx: [{ t: 'move', v: 3 }, { t: 'status', st: 'haste', n: 1, self: true }] },
  { id: 'rg_dive', name: 'Hawk Dive', cat: 'attack', icon: 'phoenix', rarity: 'rare', range: 6, cost: 2, cd: 2, el: 'wind', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'mark', n: 1 }] },
  { id: 'rg_net', name: 'Net Trap', cat: 'special', icon: 'trap', rarity: 'rare', tg: 'any', range: 4, shape: 'area', size: 1, cost: 2, cd: 3, fx: [{ t: 'status', st: 'root', n: 2 }] },
  { id: 'rg_pack', name: 'Pack Tactics', cat: 'buff', icon: 'banner', rarity: 'rare', tg: 'self', shape: 'burst', size: 2, allies: true, cd: 3, fx: [{ t: 'status', st: 'haste', n: 2 }, { t: 'status', st: 'strength', n: 1 }] },
  { id: 'rg_spikes', name: 'Poison Spikes', cat: 'attack', icon: 'trap', rarity: 'rare', tg: 'any', range: 4, shape: 'area', size: 1, cost: 2, cd: 2, el: 'poison', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'poison', n: 3 }] },
  { id: 'rg_wildhunt', name: 'Wild Hunt', cat: 'attack', icon: 'arrows', rarity: 'epic', range: 6, cost: 2, mp: 6, cd: 3, el: 'wind', proj: 'arrow', fx: [{ t: 'dmg', v: 2, s: 'atk', hits: 3 }] },
  { id: 'rg_snarefield', name: 'Snare Field', cat: 'special', icon: 'trap', rarity: 'epic', tg: 'any', range: 4, shape: 'area', size: 2, cost: 3, mp: 6, cd: 4, el: 'poison', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'root', n: 1 }, { t: 'status', st: 'poison', n: 2 }] },
  { id: 'rg_greathunt', name: 'The Great Hunt', cat: 'attack', icon: 'phoenix', rarity: 'legendary', ult: true, tg: 'self', shape: 'burst', size: 4, cost: 3, mp: 12, cd: 5, el: 'wind', fx: [{ t: 'dmg', v: 3, s: 'atk' }, { t: 'status', st: 'root', n: 1 }, { t: 'status', st: 'mark', n: 1 }] },
]);
jobCards('reaper', 'assassin', [
  { id: 'rp_sweep', start: true, name: 'Scythe Sweep', cat: 'attack', icon: 'whirl', tg: 'any', shape: 'cone', size: 2, cd: 1, el: 'shadow', fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'rp_harvest', start: true, name: 'Harvest', cat: 'attack', icon: 'skull', cd: 1, fx: [{ t: 'dmg', v: 1, s: 'atk', execute: 0.3 }] },
  { id: 'rp_gravestep', start: true, name: 'Grave Step', cat: 'movement', icon: 'blink', range: 4, cd: 2, el: 'shadow', fx: [{ t: 'dash' }, { t: 'dmg', v: 1, s: 'atk', onKill: { draw: 1 } }] },
  { id: 'rp_tithe', name: 'Soul Tithe', cat: 'attack', icon: 'heart', cd: 1, el: 'shadow', fx: [{ t: 'dmg', v: 1, s: 'atk', drain: 0.3 }] },
  { id: 'rp_omen', name: 'Omen', cat: 'special', icon: 'eye', range: 3, cost: 0, cd: 2, el: 'shadow', fx: [{ t: 'status', st: 'vulnerable', n: 1 }, { t: 'status', st: 'mark', n: 1 }] },
  { id: 'rp_reap', name: 'Reap', cat: 'attack', icon: 'skull', rarity: 'rare', cd: 2, el: 'shadow', fx: [{ t: 'dmg', v: 2, s: 'atk', onKill: { energy: 1 } }] },
  { id: 'rp_wail', name: 'Wailing Scythe', cat: 'attack', icon: 'whirl', rarity: 'rare', tg: 'self', shape: 'burst', size: 1, cost: 2, cd: 2, el: 'shadow', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'weak', n: 2 }] },
  { id: 'rp_shroud', name: 'Soul Shroud', cat: 'defense', icon: 'smoke', rarity: 'rare', tg: 'self', cd: 3, el: 'shadow', fx: [{ t: 'status', st: 'stealth', n: 1 }, { t: 'block', v: 2 }] },
  { id: 'rp_gravecall', name: 'Gravecall', cat: 'special', icon: 'blink', rarity: 'rare', range: 3, cd: 2, el: 'shadow', fx: [{ t: 'pull', v: 2 }, { t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'rp_rites', name: 'Final Rites', cat: 'attack', icon: 'skull', rarity: 'epic', cost: 2, mp: 6, cd: 3, el: 'shadow', fx: [{ t: 'dmg', v: 3, s: 'atk', execute: 0.3, onKill: { energy: 1 } }] },
  { id: 'rp_danse', name: 'Danse Macabre', cat: 'attack', icon: 'whirl', rarity: 'epic', tg: 'self', shape: 'burst', size: 2, cost: 3, mp: 8, cd: 4, el: 'shadow', fx: [{ t: 'dmg', v: 2, s: 'atk', drain: 0.3 }, { t: 'status', st: 'bleed', n: 2 }] },
  { id: 'rp_reaping', name: 'The Reaping', cat: 'attack', icon: 'skull', rarity: 'legendary', ult: true, tg: 'self', shape: 'burst', size: 3, cost: 3, mp: 12, cd: 5, el: 'shadow', fx: [{ t: 'dmg', v: 2, s: 'atk', execute: 0.3 }, { t: 'status', st: 'bleed', n: 3 }] },
]);
jobCards('venomancer', 'assassin', [
  { id: 'vm_dart', start: true, name: 'Toxin Dart', cat: 'attack', icon: 'dagger', range: 4, el: 'poison', proj: 'knife', fx: [{ t: 'dmg', v: 0, s: 'atk' }, { t: 'status', st: 'poison', n: 3 }] },
  { id: 'vm_cloud', start: true, name: 'Noxious Cloud', cat: 'special', icon: 'smoke', tg: 'any', range: 4, shape: 'area', size: 1, cd: 1, el: 'poison', fx: [{ t: 'status', st: 'poison', n: 2 }] },
  { id: 'vm_virulence', start: true, name: 'Virulence', cat: 'special', icon: 'skull', range: 4, cost: 0, cd: 2, el: 'poison', fx: [{ t: 'status', st: 'poison', n: 1 }, { t: 'spread', sts: ['poison'] }] },
  { id: 'vm_mithridate', name: 'Mithridate', cat: 'defense', icon: 'heart', tg: 'self', cd: 2, el: 'poison', fx: [{ t: 'cleanse' }, { t: 'block', v: 2 }] },
  { id: 'vm_corrode', name: 'Corrode', cat: 'attack', icon: 'dagger', range: 3, cd: 1, el: 'poison', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'vulnerable', n: 1 }] },
  { id: 'vm_fester', name: 'Fester Bloom', cat: 'attack', icon: 'smoke', rarity: 'rare', tg: 'any', range: 4, shape: 'area', size: 1, cost: 2, cd: 2, el: 'poison', fx: [{ t: 'dmg', v: 0, s: 'atk', perStatus: { st: 'poison', v: 1 } }] },
  { id: 'vm_blight', name: 'Blight', cat: 'special', icon: 'skull', rarity: 'rare', range: 4, cd: 2, el: 'poison', fx: [{ t: 'status', st: 'poison', n: 4 }, { t: 'status', st: 'weak', n: 1 }] },
  { id: 'vm_blood', name: 'Toxic Blood', cat: 'defense', icon: 'heart', rarity: 'rare', tg: 'self', cd: 3, el: 'poison', fx: [{ t: 'status', st: 'thorns', n: 3 }, { t: 'status', st: 'regen', n: 2 }] },
  { id: 'vm_paralytic', name: 'Paralytic', cat: 'attack', icon: 'dagger', rarity: 'rare', range: 4, cost: 2, cd: 3, el: 'poison', proj: 'knife', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'stun', n: 1 }] },
  { id: 'vm_pandemic', name: 'Pandemic', cat: 'special', icon: 'skull', rarity: 'epic', range: 5, cost: 2, mp: 6, cd: 3, el: 'poison', fx: [{ t: 'status', st: 'poison', n: 3 }, { t: 'spread', sts: ['poison', 'bleed'] }] },
  { id: 'vm_necrotic', name: 'Necrotic Burst', cat: 'attack', icon: 'smoke', rarity: 'epic', tg: 'any', range: 4, shape: 'area', size: 1, cost: 3, mp: 8, cd: 4, el: 'poison', fx: [{ t: 'dmg', v: 2, s: 'atk', perStatus: { st: 'poison', v: 1, consume: true } }] },
  { id: 'vm_plague', name: 'Plague', cat: 'attack', icon: 'skull', rarity: 'legendary', ult: true, tg: 'self', shape: 'burst', size: 4, cost: 3, mp: 12, cd: 5, el: 'poison', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'poison', n: 5 }, { t: 'status', st: 'weak', n: 2 }] },
]);
jobCards('bishop', 'priest', [
  { id: 'bi_heal', start: true, name: 'Greater Heal', cat: 'buff', icon: 'cross', tg: 'ally', range: 3, cd: 1, el: 'holy', fx: [{ t: 'heal', v: 3, s: 'matk' }] },
  { id: 'bi_word', start: true, name: 'Holy Word', cat: 'attack', icon: 'sun', range: 4, el: 'holy', proj: 'holy', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'weak', n: 1 }] },
  { id: 'bi_ward', start: true, name: 'Sacred Ward', cat: 'defense', icon: 'shield', tg: 'ally', range: 3, cd: 1, el: 'holy', fx: [{ t: 'block', v: 2 }, { t: 'status', st: 'regen', n: 2 }] },
  { id: 'bi_bene', name: 'Benediction', cat: 'buff', icon: 'star', tg: 'ally', range: 3, cd: 2, el: 'holy', fx: [{ t: 'status', st: 'strength', n: 2 }, { t: 'status', st: 'haste', n: 1 }] },
  { id: 'bi_absolve', name: 'Absolution', cat: 'buff', icon: 'cross', tg: 'ally', range: 3, cost: 0, cd: 1, el: 'holy', fx: [{ t: 'cleanse' }, { t: 'block', v: 1 }] },
  { id: 'bi_mending', name: 'Prayer of Mending', cat: 'buff', icon: 'heart', rarity: 'rare', tg: 'self', shape: 'burst', size: 2, allies: true, cost: 2, mp: 5, cd: 3, el: 'holy', fx: [{ t: 'heal', v: 2, s: 'matk' }, { t: 'status', st: 'regen', n: 1 }] },
  { id: 'bi_censure', name: 'Censure', cat: 'attack', icon: 'sun', rarity: 'rare', range: 4, cost: 2, cd: 2, el: 'holy', proj: 'holy', fx: [{ t: 'dmg', v: 2, s: 'matk' }, { t: 'status', st: 'vulnerable', n: 2 }] },
  { id: 'bi_sanctify', name: 'Sanctify', cat: 'defense', icon: 'shield', rarity: 'rare', tg: 'self', shape: 'burst', size: 2, allies: true, cd: 3, el: 'holy', fx: [{ t: 'block', v: 2 }] },
  { id: 'bi_holyfire', name: 'Holy Fire', cat: 'attack', icon: 'flame', rarity: 'rare', tg: 'any', range: 4, shape: 'area', size: 1, cost: 2, mp: 4, cd: 2, el: 'holy', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'status', st: 'burn', n: 1 }] },
  { id: 'bi_massres', name: 'Mass Resurrection', cat: 'special', icon: 'phoenix', rarity: 'epic', tg: 'self', cost: 3, mp: 12, cd: 5, el: 'holy', fx: [{ t: 'revive', pct: 0.6 }] },
  { id: 'bi_intervene', name: 'Divine Intervention', cat: 'defense', icon: 'shield', rarity: 'epic', tg: 'ally', range: 4, cost: 2, mp: 6, cd: 4, el: 'holy', fx: [{ t: 'block', v: 5 }, { t: 'status', st: 'fortify', n: 1 }, { t: 'cleanse' }] },
  { id: 'bi_miracle', name: 'Miracle', cat: 'buff', icon: 'phoenix', rarity: 'legendary', ult: true, tg: 'self', shape: 'burst', size: 3, allies: true, cost: 3, mp: 12, cd: 5, el: 'holy', fx: [{ t: 'heal', v: 4, s: 'matk' }, { t: 'revive', pct: 0.5 }, { t: 'status', st: 'regen', n: 3 }] },
]);
jobCards('monk', 'priest', [
  { id: 'mo_palm', start: true, name: 'Palm Strike', cat: 'attack', icon: 'roar', el: 'holy', fx: [{ t: 'dmg', v: 1, s: 'matk' }, { t: 'push', v: 1 }] },
  { id: 'mo_flurry', start: true, name: 'Flurry', cat: 'attack', icon: 'whirl', cd: 1, fx: [{ t: 'dmg', v: 0, s: 'atk', hits: 3 }] },
  { id: 'mo_center', start: true, name: 'Centering', cat: 'defense', icon: 'orb', tg: 'self', cost: 0, cd: 2, fx: [{ t: 'block', v: 3 }, { t: 'draw', v: 1 }] },
  { id: 'mo_kick', name: 'Rising Kick', cat: 'attack', icon: 'boot', cd: 1, combo: { after: 'attack', bonus: { dmg: 2 } }, fx: [{ t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'mo_flow', name: 'Flowing Step', cat: 'movement', icon: 'wind', tg: 'hex', range: 2, cost: 0, cd: 2, fx: [{ t: 'move', v: 2 }, { t: 'status', st: 'haste', n: 1, self: true }] },
  { id: 'mo_chi', name: 'Chi Burst', cat: 'attack', icon: 'sun', rarity: 'rare', tg: 'self', shape: 'burst', size: 1, cost: 2, cd: 2, el: 'holy', fx: [{ t: 'dmg', v: 1, s: 'matk', perPlayed: 1 }] },
  { id: 'mo_ironbody', name: 'Iron Body', cat: 'defense', icon: 'shield', rarity: 'rare', tg: 'self', cd: 2, fx: [{ t: 'block', v: 4 }, { t: 'status', st: 'thorns', n: 2 }] },
  { id: 'mo_pressure', name: 'Pressure Point', cat: 'attack', icon: 'eye', rarity: 'rare', cd: 2, fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'weak', n: 2 }, { t: 'status', st: 'vulnerable', n: 1 }] },
  { id: 'mo_innerfire', name: 'Inner Fire', cat: 'buff', icon: 'flame', rarity: 'rare', tg: 'self', cost: 0, cd: 3, el: 'holy', fx: [{ t: 'energy', v: 1 }, { t: 'status', st: 'strength', n: 1 }] },
  { id: 'mo_sevenstar', name: 'Seven-Star Strike', cat: 'attack', icon: 'star', rarity: 'epic', cost: 2, cd: 3, fx: [{ t: 'dmg', v: 0, s: 'atk', hits: 5, perPlayed: 1 }] },
  { id: 'mo_dragon', name: "Dragon's Ascent", cat: 'attack', icon: 'phoenix', rarity: 'epic', cost: 3, mp: 6, cd: 4, el: 'holy', fx: [{ t: 'dmg', v: 3, s: 'matk' }, { t: 'push', v: 3 }, { t: 'status', st: 'stun', n: 1 }] },
  { id: 'mo_hundredfists', name: 'Hundred Fists', cat: 'attack', icon: 'roar', rarity: 'legendary', ult: true, cost: 3, mp: 10, cd: 5, el: 'holy', fx: [{ t: 'dmg', v: 1, s: 'matk', hits: 6, perPlayed: 1 }, { t: 'push', v: 2 }] },
]);
jobCards('engineer', 'blacksmith', [
  { id: 'en_cannon', start: true, name: 'Deploy Cannon', cat: 'special', icon: 'turret', tg: 'hex', range: 2, cost: 2, cd: 3, el: 'fire', fx: [{ t: 'summon', id: 'cannon' }] },
  { id: 'en_rivet', start: true, name: 'Rivet Gun', cat: 'attack', icon: 'wrench', range: 4, proj: 'knife', fx: [{ t: 'dmg', v: 1, s: 'atk', hits: 2 }] },
  { id: 'en_patch', start: true, name: 'Patch Up', cat: 'buff', icon: 'wrench', tg: 'ally', range: 3, cd: 1, fx: [{ t: 'heal', v: 2 }, { t: 'block', v: 1 }] },
  { id: 'en_smoke', name: 'Smoke Charge', cat: 'special', icon: 'smoke', tg: 'any', range: 3, shape: 'area', size: 1, cd: 2, fx: [{ t: 'status', st: 'weak', n: 2 }] },
  { id: 'en_calibrate', name: 'Calibrate', cat: 'buff', icon: 'wrench', tg: 'self', cost: 0, cd: 2, fx: [{ t: 'draw', v: 1 }, { t: 'cool', v: 1 }] },
  { id: 'en_pylon', name: 'Shield Pylon', cat: 'defense', icon: 'turret', rarity: 'rare', tg: 'hex', range: 2, cost: 2, cd: 4, fx: [{ t: 'summon', id: 'pylon' }] },
  { id: 'en_grenade', name: 'Grenade', cat: 'attack', icon: 'flame', rarity: 'rare', tg: 'any', range: 4, shape: 'area', size: 1, cost: 2, cd: 2, el: 'fire', proj: 'fire', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'burn', n: 1 }] },
  { id: 'en_tesla', name: 'Tesla Coil', cat: 'attack', icon: 'bolt', rarity: 'rare', tg: 'any', shape: 'line', size: 4, cost: 2, mp: 4, cd: 3, el: 'wind', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'vulnerable', n: 1 }, { t: 'status', st: 'stun', n: 1 }] },
  { id: 'en_plate', name: 'Bulwark Plate', cat: 'defense', icon: 'anvil', rarity: 'rare', tg: 'ally', range: 3, cost: 2, cd: 3, fx: [{ t: 'block', v: 4 }] },
  { id: 'en_rockets', name: 'Rocket Barrage', cat: 'attack', icon: 'meteor', rarity: 'epic', tg: 'any', range: 6, shape: 'area', size: 2, cost: 3, mp: 8, cd: 4, el: 'fire', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'push', v: 1 }] },
  { id: 'en_mech', name: 'Mech Suit', cat: 'buff', icon: 'anvil', rarity: 'epic', tg: 'self', cost: 2, mp: 8, cd: 5, fx: [{ t: 'status', st: 'mech', n: 3, self: true }, { t: 'block', v: 3 }] },
  { id: 'en_artillery', name: 'Artillery Barrage', cat: 'attack', icon: 'turret', rarity: 'legendary', ult: true, tg: 'any', range: 7, shape: 'area', size: 2, cost: 3, mp: 12, cd: 5, el: 'fire', fx: [{ t: 'dmg', v: 4, s: 'atk' }, { t: 'status', st: 'stun', n: 1 }] },
]);
jobCards('forgemaster', 'blacksmith', [
  { id: 'fm_molten', start: true, name: 'Molten Hammer', cat: 'attack', icon: 'hammer', el: 'fire', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'burn', n: 1 }] },
  { id: 'fm_guard', start: true, name: 'Anvil Guard', cat: 'defense', icon: 'anvil', tg: 'self', cd: 1, fx: [{ t: 'block', v: 3 }] },
  { id: 'fm_heat', start: true, name: 'Heat the Steel', cat: 'buff', icon: 'flame', tg: 'self', cost: 0, cd: 2, el: 'fire', fx: [{ t: 'status', st: 'strength', n: 2 }, { t: 'draw', v: 1 }] },
  { id: 'fm_crush', name: 'Crushing Blow', cat: 'attack', icon: 'hammer', cd: 1, el: 'earth', fx: [{ t: 'breakBlock' }, { t: 'dmg', v: 1, s: 'atk' }] },
  { id: 'fm_slag', name: 'Slag Throw', cat: 'attack', icon: 'flame', range: 3, cd: 1, el: 'fire', proj: 'fire', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'burn', n: 2 }] },
  { id: 'fm_seismic', name: 'Seismic Hammer', cat: 'attack', icon: 'quake', rarity: 'rare', tg: 'any', shape: 'line', size: 4, cost: 2, cd: 2, el: 'earth', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'push', v: 1 }] },
  { id: 'fm_quench', name: 'Quench', cat: 'defense', icon: 'snow', rarity: 'rare', tg: 'self', cd: 3, fx: [{ t: 'cleanse' }, { t: 'block', v: 3 }, { t: 'status', st: 'fortify', n: 1 }] },
  { id: 'fm_tempered', name: 'Tempered Edge', cat: 'buff', icon: 'anvil', rarity: 'rare', tg: 'self', shape: 'burst', size: 2, allies: true, cost: 2, cd: 3, fx: [{ t: 'status', st: 'strength', n: 2 }] },
  { id: 'fm_bellows', name: 'Bellows Blast', cat: 'attack', icon: 'wind', rarity: 'rare', tg: 'any', shape: 'cone', size: 3, cost: 2, mp: 4, cd: 2, el: 'fire', fx: [{ t: 'dmg', v: 1, s: 'atk' }, { t: 'status', st: 'burn', n: 2 }, { t: 'push', v: 1 }] },
  { id: 'fm_shatter', name: 'Shatter Armor', cat: 'attack', icon: 'hammer', rarity: 'epic', cost: 2, cd: 3, el: 'earth', fx: [{ t: 'breakBlock' }, { t: 'dmg', v: 3, s: 'atk' }, { t: 'status', st: 'vulnerable', n: 3 }] },
  { id: 'fm_magma', name: 'Magma Pool', cat: 'attack', icon: 'meteor', rarity: 'epic', tg: 'any', range: 4, shape: 'area', size: 1, cost: 3, mp: 8, cd: 4, el: 'fire', fx: [{ t: 'dmg', v: 2, s: 'atk' }, { t: 'status', st: 'burn', n: 3 }, { t: 'status', st: 'root', n: 1 }] },
  { id: 'fm_worldforge', name: 'Worldforge Slam', cat: 'attack', icon: 'quake', rarity: 'legendary', ult: true, tg: 'any', shape: 'line', size: 6, cost: 3, mp: 12, cd: 5, el: 'earth', fx: [{ t: 'dmg', v: 4, s: 'atk' }, { t: 'status', st: 'burn', n: 3 }, { t: 'status', st: 'stun', n: 1 }] },
]);
// The three cards a hero is given on taking each job.
export const JOB_STARTERS = Object.values(CARDS).filter((c) => c.start).reduce((o, c) => { (o[c.job] ||= []).push(c.id); return o; }, {});

export const STARTER_DECKS = {
  knight: ['k_slash', 'k_slash', 'k_shieldwall', 'k_charge', 'k_bash', 'k_advance', 'k_taunt', 'k_vow'],
  mage: ['m_firebolt', 'm_firebolt', 'm_frostshard', 'm_frostshard', 'm_barrier', 'm_blink', 'm_fireball', 'm_surge'],
  archer: ['a_quick', 'a_quick', 'a_aimed', 'a_roll', 'a_mark', 'a_poison', 'a_blank', 'a_volley'],
  assassin: ['s_stab', 's_stab', 's_venom', 's_step', 's_backstab', 's_smoke', 's_throw', 's_expose'],
  priest: ['p_smite', 'p_smite', 'p_heal', 'p_heal', 'p_shield', 'p_purify', 'p_mace', 'p_step'],
  blacksmith: ['b_hammer', 'b_hammer', 'b_forge', 'b_temper', 'b_molten', 'b_rush', 'b_repair', 'b_wall'],
};

export const DECK_MIN = 8;
export const DECK_MAX = 22;

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
    if (f.t === 'status' && level >= 2 && !['stun', 'frozen', 'mark', 'stealth', 'fortify'].includes(f.st)) f.n += 1;
    if (['draw', 'mp'].includes(f.t) && level >= 2) f.v += f.t === 'mp' ? 2 : 0;
  });
  if (level >= 3 && c.cd > 0) c.cd -= 1;
  return c;
}
// Skill-tree nodes that change cards (a `cardMod`, see jobs.js): every mod whose filters all match is applied to a copy.
const modMatches = (c, m) => (!m.job || c.job === m.job) && (!m.cls || c.cls === m.cls) && (!m.cat || c.cat === m.cat) && (!m.el || c.el === m.el)
  && (!m.shape || c.shape === m.shape) && (!m.rarity || c.rarity === m.rarity) && (!m.ids || m.ids.includes(c.id)) && (!m.tg || c.tg === m.tg)
  && (!m.fx || c.fx.some((f) => f.t === m.fx || f[m.fx] != null)) && (!m.st || c.fx.some((f) => f.t === 'status' && f.st === m.st));
export function applyCardMods(card, mods) {
  const hit = (mods || []).filter((m) => modMatches(card, m)); if (!hit.length) return card;
  const c = { ...card, fx: card.fx.map((f) => ({ ...f, onKill: f.onKill && { ...f.onKill }, far: f.far && { ...f.far }, perStatus: f.perStatus && { ...f.perStatus } })) };
  for (const m of hit) {
    if (m.range && c.tg !== 'self') c.range += m.range;
    if (m.cd) c.cd = Math.max(0, c.cd + m.cd);
    if (m.mp) c.mp = Math.max(0, c.mp + m.mp);
    if (m.dice) c.diceBonus = (c.diceBonus || 0) + m.dice;
    if (m.self) c.fx.push({ t: 'status', st: m.self.st, n: m.self.n, self: true });
    for (const f of c.fx) {
      if (f.t === 'dmg') { if (m.dmg) f.v += m.dmg; if (m.hits && f.hits > 1) f.hits += m.hits; if (m.drain && f.drain) f.drain += m.drain; if (m.far && f.far) f.far.v += m.far;
        if (m.keepMark) f.keepMark = true; if (m.execute && f.execute) f.execute += m.execute; if (m.onKill && f.onKill) for (const k of Object.keys(f.onKill)) f.onKill[k] *= m.onKill;
        if (m.perStatus && f.perStatus) f.perStatus.v += m.perStatus; if (m.perPlayed && f.perPlayed) f.perPlayed += m.perPlayed; }
      if (f.t === 'block' && m.block) f.v += m.block;
      if (f.t === 'heal' && m.heal) f.v += m.heal;
      if (f.t === 'status' && m.stacks && !f.self && (!m.st || f.st === m.st) && !['stun', 'frozen', 'mark', 'stealth', 'fortify', 'mech'].includes(f.st)) f.n += m.stacks;
      if (f.t === 'push' && m.push) f.v += m.push;
      if (f.t === 'draw' && m.draw) f.v += m.draw;
      if (f.t === 'revive' && m.revive) f.pct = Math.min(1, f.pct + m.revive);
    }
  }
  return c;
}
export function upgradeCost(card, level) {
  const r = { common: 1, rare: 2, epic: 3, legendary: 4 }[card.rarity] || 1;
  return { gold: 40 * (level + 1) * r, shards: 8 * (level + 1) * r };
}

const SUMMON_TEXT = { turret: 'Build a Turret that fires each round.', barricade: 'Raise an Iron Barricade (8 HP).', mortar: 'Build a Mortar that shells a group of enemies each round. It cannot aim at enemies next to it.',
  hawk: 'Call a Hawk. Each round it strikes the nearest enemy within 4 hexes.', cannon: 'Build a Cannon that fires down a line of 5 hexes each round.', pylon: 'Build a Shield Pylon that gives allies next to it 2 Block each round.' };
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
  fortify: { name: 'Fortify', color: '#9fc8ff', icon: '⛨', desc: 'Your Block is not lost at the start of your next turn.' },
  thorns: { name: 'Thorns', color: '#d9a441', icon: '✴', desc: 'Enemies that hit you from the next hex take 1 damage per stack. Ends at your next turn.' },
  mech: { name: 'Mech', color: '#d8a040', icon: '⚙', desc: 'Riding a war machine: +2 Movement and +2 damage on every hit. Lasts the turns shown.' },
  curse: { name: 'Curse', color: '#b06aff', icon: '☾', desc: 'Takes 1 more damage per stack from every hit. Decays by 1 each turn.', debuff: true },
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
  const n = Math.min(6, 1 + (card.cost >= 2 ? 1 : 0) + (card.cost >= 3 ? 1 : 0) + (['epic', 'legendary'].includes(card.rarity) ? 1 : 0) + (card.level >= 2 ? 1 : 0) + (card.diceBonus || 0));
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
        if (f.ifStatus) s += t(', +{n} if the target has {st}', { n: f.ifStatus.v, st: f.ifStatus.sts.map((x) => STATUS_INFO[x].name).join(' / ') });
        if (f.perStatus) s += t(f.perStatus.consume ? ', +{n} per {st} on the target (removes it)' : ', +{n} per {st} on the target', { n: f.perStatus.v, st: STATUS_INFO[f.perStatus.st].name });
        if (f.perHand) s += t(', +{n} per card in your hand', { n: f.perHand });
        if (f.wounded) s += t(', +{n} per quarter of your HP missing', { n: f.wounded });
        if (f.guard) s += t(', +{n} Block per enemy hit', { n: f.guard });
        if (f.keepMark) s += t(', every hit gets the Marked bonus');
        if (f.far) s += t(', +{n} from {d} hexes or more', { n: f.far.v, d: f.far.d });
        if (f.alone) s += t(', +{n} if no other enemy stands next to the target', { n: f.alone });
        if (f.spendBlock) s += t(', spends all your Block: +1 each');
        if (f.spendMp) s += t(', spends all your MP: +1 per {n} MP', { n: f.spendMp });
        if (f.execute) s += t('. Double vs targets under {n}% HP', { n: f.execute * 100 });
        if (f.drain) s += t('. Heal {n}% of damage dealt', { n: Math.round(f.drain * 100) });
        if (f.perPlayed) s += t(', +{n} per card you played before it this turn', { n: f.perPlayed });
        if (f.onKill) s += f.onKill.energy ? t('. On a kill: +{n} Action Slot', { n: f.onKill.energy }) : f.onKill.draw ? t('. On a kill: draw {n}', { n: f.onKill.draw }) : t('. On a kill: heal {n}', { n: f.onKill.heal });
        parts.push(s + t('.')); break;
      }
      case 'block': parts.push(t(f.self ? 'Gain {v} Block.' : 'Grant {v} Block.', { v: dice?.color === 'green' ? withDice(flat(f, unit)) : flat(f, unit) })); break;
      case 'heal': parts.push(t(f.self ? 'Heal yourself {v} HP.' : 'Heal {v} HP.', { v: dice?.color === 'green' ? withDice(flat(f, unit)) : flat(f, unit) })); break;
      case 'status': parts.push(t(f.self ? 'Gain {st}.' : STATUS_INFO[f.st].debuff ? 'Apply {st}.' : 'Grant {st}.', { st: `${STATUS_INFO[f.st].name}${['stun', 'frozen', 'mark', 'stealth', 'fortify'].includes(f.st) ? '' : ' ' + f.n}` })); break;
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
      case 'summon': parts.push(t(SUMMON_TEXT[f.id])); break;
      case 'revive': parts.push(t('Revive fallen allies at {n}% HP.', { n: f.pct * 100 })); break;
      case 'selfdmg': parts.push(t('Lose {n} HP.', { n: f.v })); break;
      case 'spread': parts.push(t('Spread its {st} to enemies next to it.', { st: f.sts.map((x) => STATUS_INFO[x].name).join(' / ') })); break;
      case 'breakBlock': parts.push(t("Destroy the target's Block.")); break;
      case 'cool': parts.push(t('Your cooling cards return {n} round(s) sooner.', { n: f.v })); break;
      case 'recall': parts.push(t('Take {n} random card(s) back from your discard pile.', { n: f.v })); break;
      case 'trample': parts.push(t('Charge to the end of the line, striking everything on the way.')); break;
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
