// Character classes, base stats and skill trees.

export const CLASSES = {
  knight: {
    name: 'Knight', title: 'Bulwark of the Dawn', role: 'Tank / Melee', element: 'holy', move: 3,
    base: { str: 8, agi: 4, vit: 9, int: 2, dex: 4 },
    color: '#6f8fc0', desc: 'An oath-bound defender who shields allies, controls the front line and turns Block into punishing counterattacks.',
    weaponTypes: ['sword', 'mace'], armorTypes: ['heavy'],
    look: { body: 'humanoid', armor: '#8fa3bf', armor2: '#5a6d8c', cloth: '#a8323a', skin: '#f1c9a5', hair: '#6b4a2b', helm: 'knight', weapon: 'sword', offhand: 'shield', cape: '#a8323a' },
  },
  mage: {
    name: 'Mage', title: 'Scholar of Embers & Frost', role: 'Ranged Caster', element: 'fire', move: 3,
    base: { str: 2, agi: 4, vit: 4, int: 10, dex: 5 },
    color: '#c0583a', desc: 'Wields fire and frost. Chill foes then Melt them with fire for devastating elemental combos.',
    weaponTypes: ['staff'], armorTypes: ['robe'],
    look: { body: 'humanoid', armor: '#3b3f8f', armor2: '#25285e', cloth: '#d9a94a', skin: '#f1c9a5', hair: '#e8e8f0', helm: 'wizard', weapon: 'staff', cape: '#2b2d6e', robe: true },
  },
  archer: {
    name: 'Archer', title: 'Warden of the Wilds', role: 'Ranged DPS', element: 'wind', move: 4,
    base: { str: 5, agi: 7, vit: 5, int: 3, dex: 9 },
    color: '#4f9a52', desc: 'A long-range hunter. Marks prey, rains arrows over areas and kites enemies with superior mobility.',
    weaponTypes: ['bow'], armorTypes: ['light'],
    look: { body: 'humanoid', armor: '#4f7a3a', armor2: '#34522a', cloth: '#8a6a3a', skin: '#f1c9a5', hair: '#c9873a', helm: 'hood', hoodColor: '#3e6a32', weapon: 'bow' },
  },
  assassin: {
    name: 'Assassin', title: 'Blade of the Veil', role: 'Burst / Mobility', element: 'shadow', move: 4,
    base: { str: 7, agi: 9, vit: 4, int: 2, dex: 7 },
    color: '#7a4fa8', desc: 'Strikes from the shadows. Teleports behind foes, stacks poison and executes weakened targets.',
    weaponTypes: ['dagger'], armorTypes: ['light'],
    look: { body: 'humanoid', armor: '#2d2838', armor2: '#1b1824', cloth: '#7a2a4a', skin: '#e8bfa0', hair: '#1a1a22', helm: 'mask', hoodColor: '#2a2436', weapon: 'dagger', offhand: 'dagger', scarf: '#9a2a4a' },
  },
  priest: {
    name: 'Priest', title: 'Voice of the Last Light', role: 'Healer / Support', element: 'holy', move: 3,
    base: { str: 3, agi: 4, vit: 6, int: 8, dex: 4 },
    color: '#e0c060', desc: 'Heals, shields and blesses allies while smiting the undead with holy light. Can resurrect the fallen.',
    weaponTypes: ['staff', 'mace'], armorTypes: ['robe'],
    look: { body: 'humanoid', armor: '#f0ead8', armor2: '#c9bfa0', cloth: '#d9b04a', skin: '#f1c9a5', hair: '#e0b860', helm: 'circlet', weapon: 'mace', offhand: 'book', robe: true, cape: '#e8d8a8' },
  },
  blacksmith: {
    name: 'Blacksmith', title: 'Forgemaster of Kharn', role: 'Bruiser / Engineer', element: 'earth', move: 3,
    base: { str: 9, agi: 3, vit: 8, int: 3, dex: 5 },
    color: '#b8743a', desc: 'Builds turrets and barricades, tempers allies\' weapons and crushes foes with molten hammer blows.',
    weaponTypes: ['hammer', 'mace'], armorTypes: ['heavy'],
    look: { body: 'humanoid', armor: '#7a5a3a', armor2: '#4e3a26', cloth: '#5a4a3a', skin: '#d9a07a', hair: '#8a3a1a', helm: 'goggles', weapon: 'hammer', beard: '#8a3a1a', apron: '#4a3020', bulky: true },
  },
};

// Male or female is chosen when a character is created. The female build is the same class look with
// long hair, a slimmer frame and no beard; everything else (armour, colours, weapon) is shared.
const FEMALE_LOOK = {
  knight: { hair: '#d9a14a' }, mage: { hair: '#b78ad8' }, archer: { hair: '#c9873a' },
  assassin: { hair: '#2a2030' }, priest: { hair: '#e8c46a' }, blacksmith: { hair: '#b8431a', beard: null, bulky: false },
};
// The sprite key and look for a hero ({ cls, gender }) or a bare class id.
export function heroLook(hero) {
  const cls = typeof hero === 'string' ? hero : hero.cls; const female = typeof hero !== 'string' && hero.gender === 'f';
  return female ? { key: 'cls_' + cls + '_f', look: { ...CLASSES[cls].look, female: true, ...FEMALE_LOOK[cls] } } : { key: 'cls_' + cls, look: CLASSES[cls].look };
}

export const CLASS_ORDER = ['knight', 'mage', 'archer', 'assassin', 'priest', 'blacksmith'];

// Skill trees: two branches, three tiers each. Each node costs 1 skill point (tier 3 costs 2).
// p: passive effects — flat stats, or combat hooks interpreted by the Combat Resolver.
export const SKILL_TREES = {
  knight: [
    { id: 'kn1', branch: 0, tier: 1, name: 'Plate Mastery', desc: '+1 DEF, +3 Max HP.', p: { def: 1, hp: 3 } },
    { id: 'kn2', branch: 0, tier: 2, name: 'Bastion', desc: 'Start every battle with 3 Block.', p: { startBlock: 3 }, req: 'kn1' },
    { id: 'kn3', branch: 0, tier: 3, name: 'Retribution', desc: 'Enemies that hit you take 1 damage (Thorns).', p: { thorns: 1 }, req: 'kn2', cost: 2 },
    { id: 'kn4', branch: 1, tier: 1, name: 'Weapon Training', desc: '+1 ATK.', p: { atk: 1 } },
    { id: 'kn5', branch: 1, tier: 2, name: 'Momentum', desc: '+1 Movement.', p: { move: 1 }, req: 'kn4' },
    { id: 'kn6', branch: 1, tier: 3, name: 'Champion', desc: '+1 Action Slot per turn.', p: { energy: 1 }, req: 'kn5', cost: 2 },
  ],
  mage: [
    { id: 'mg1', branch: 0, tier: 1, name: 'Pyromancy', desc: 'Burn you apply has +1 stack.', p: { statusBonus: { burn: 1 } } },
    { id: 'mg2', branch: 0, tier: 2, name: 'Searing Mind', desc: '+1 MATK.', p: { matk: 1 }, req: 'mg1' },
    { id: 'mg3', branch: 0, tier: 3, name: 'Archmage', desc: '+1 Action Slot per turn.', p: { energy: 1 }, req: 'mg2', cost: 2 },
    { id: 'mg4', branch: 1, tier: 1, name: 'Cryomancy', desc: 'Chill you apply has +1 stack.', p: { statusBonus: { chill: 1 } } },
    { id: 'mg5', branch: 1, tier: 2, name: 'Mana Well', desc: '+15 Max MP, +2 MP regen per round.', p: { mp: 15, mpRegen: 2 }, req: 'mg4' },
    { id: 'mg6', branch: 1, tier: 3, name: 'Elemental Fusion', desc: 'Melt and Quench combos deal +50% more.', p: { comboPct: 0.5 }, req: 'mg5', cost: 2 },
  ],
  archer: [
    { id: 'ar1', branch: 0, tier: 1, name: 'Eagle Eye', desc: '+1 range on ranged attacks.', p: { rangeBonus: 1 } },
    { id: 'ar2', branch: 0, tier: 2, name: 'Deadly Aim', desc: '+10% crit chance.', p: { crit: 10 }, req: 'ar1' },
    { id: 'ar3', branch: 0, tier: 3, name: 'Sniper', desc: 'Critical hits deal +40% damage.', p: { critDmg: 0.4 }, req: 'ar2', cost: 2 },
    { id: 'ar4', branch: 1, tier: 1, name: 'Fleet Foot', desc: '+1 Movement.', p: { move: 1 } },
    { id: 'ar5', branch: 1, tier: 2, name: 'Toxicology', desc: 'Poison you apply has +1 stack.', p: { statusBonus: { poison: 1 } }, req: 'ar4' },
    { id: 'ar6', branch: 1, tier: 3, name: 'Quiver of Plenty', desc: 'Draw +1 card each round.', p: { draw: 1 }, req: 'ar5', cost: 2 },
  ],
  assassin: [
    { id: 'as1', branch: 0, tier: 1, name: 'Lethality', desc: '+1 ATK.', p: { atk: 1 } },
    { id: 'as2', branch: 0, tier: 2, name: 'Vital Strikes', desc: '+8% crit chance.', p: { crit: 8 }, req: 'as1' },
    { id: 'as3', branch: 0, tier: 3, name: 'Bloodthirst', desc: 'Heal 15% of damage dealt.', p: { lifesteal: 0.15 }, req: 'as2', cost: 2 },
    { id: 'as4', branch: 1, tier: 1, name: 'Shadowstep', desc: '+8% evasion.', p: { eva: 8 } },
    { id: 'as5', branch: 1, tier: 2, name: 'Venomcraft', desc: 'Poison and Bleed you apply have +1 stack.', p: { statusBonus: { poison: 1, bleed: 1 } }, req: 'as4' },
    { id: 'as6', branch: 1, tier: 3, name: 'Phantom', desc: '+1 Action Slot per turn.', p: { energy: 1 }, req: 'as5', cost: 2 },
  ],
  priest: [
    { id: 'pr1', branch: 0, tier: 1, name: 'Devotion', desc: 'Healing is 20% stronger.', p: { healPct: 0.2 } },
    { id: 'pr2', branch: 0, tier: 2, name: 'Aegis', desc: 'Allies start battles with 2 Block.', p: { teamBlock: 2 }, req: 'pr1' },
    { id: 'pr3', branch: 0, tier: 3, name: 'Saint', desc: '+1 Action Slot per turn.', p: { energy: 1 }, req: 'pr2', cost: 2 },
    { id: 'pr4', branch: 1, tier: 1, name: 'Zealotry', desc: '+1 MATK.', p: { matk: 1 } },
    { id: 'pr5', branch: 1, tier: 2, name: 'Wellspring', desc: '+20 Max MP, +2 MP regen.', p: { mp: 20, mpRegen: 2 }, req: 'pr4' },
    { id: 'pr6', branch: 1, tier: 3, name: 'Wrath of Light', desc: 'Holy damage +30%.', p: { elemPct: { holy: 0.3 } }, req: 'pr5', cost: 2 },
  ],
  blacksmith: [
    { id: 'bs1', branch: 0, tier: 1, name: 'Tough Hide', desc: '+4 Max HP.', p: { hp: 4 } },
    { id: 'bs2', branch: 0, tier: 2, name: 'Master Engineer', desc: 'Turrets and Barricades gain +50% HP and damage.', p: { turretBonus: 0.5 }, req: 'bs1' },
    { id: 'bs3', branch: 0, tier: 3, name: 'Anvil Heart', desc: 'Start each battle with 2 Strength.', p: { startStrength: 2 }, req: 'bs2', cost: 2 },
    { id: 'bs4', branch: 1, tier: 1, name: 'Heavy Swing', desc: '+1 ATK.', p: { atk: 1 } },
    { id: 'bs5', branch: 1, tier: 2, name: 'Forgefire', desc: 'Fire damage +25%, Burn +1 stack.', p: { elemPct: { fire: 0.25 }, statusBonus: { burn: 1 } }, req: 'bs4' },
    { id: 'bs6', branch: 1, tier: 3, name: 'Relentless', desc: '+1 Action Slot per turn.', p: { energy: 1 }, req: 'bs5', cost: 2 },
  ],
};

export const STAT_INFO = {
  str: { name: 'STR', full: 'Strength', desc: '+1 ATK per 6 points.' },
  agi: { name: 'AGI', full: 'Agility', desc: '+2 Speed, +1% Evasion per point.' },
  vit: { name: 'VIT', full: 'Vitality', desc: '+1 Max HP per point, +1 DEF per 10 points.' },
  int: { name: 'INT', full: 'Intelligence', desc: '+3 Max MP per point, +1 MATK per 6 points.' },
  dex: { name: 'DEX', full: 'Dexterity', desc: '+1.2% Crit, +1 Speed per point, +1 ATK per 12 points.' },
};

export const expToNext = (level) => Math.round(40 * Math.pow(level, 1.45) + 20);
export const MAX_LEVEL = 30;
