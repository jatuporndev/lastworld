// Advanced classes ("jobs"): at level 25 a hero takes one of the two paths of its class, for good.
// The hero keeps its class (cards, gear, base stats); the job adds a new look, twelve new cards and a second,
// larger skill tree. A job has no power of its own: all of it comes from the tree and the cards. Plan: docs/jobs.md.
//
// Tree nodes use the same passive keys as the class trees (see SKILL_TREES in classes.js), and two more:
//   cardMod {job, cls, cat, el, shape, ids, rarity | dmg, block, heal, stacks, dice, range, cd, mp, hits, self}
//     changes every card that matches all the filters given (filters left out match anything)
//   startStatus {st: n}   the hero starts every battle with these statuses

export const JOB_LEVEL = 25; // when the job is chosen; the first class grows to 25, the job from 25 to 50
export const JOB_ORDER = ['lordknight', 'paladin', 'sorcerer', 'warlock', 'marksman', 'ranger', 'reaper', 'venomancer', 'bishop', 'monk', 'engineer', 'forgemaster'];

export const JOBS = {
  lordknight: {
    cls: 'knight', name: 'Lord Knight', title: 'Lance of the First Charge', color: '#b8343c', ult: 'lk_charge1000',
    desc: 'Breaks lines. Charges through rows of enemies with a long lance and never stops moving.',
    branches: ['Lance', 'Vanguard', 'Warlord'],
    look: { armor: '#4a4c56', armor2: '#2a2a32', cloth: '#8a2a26', cape: '#6a2620', helm: 'greathelm', weapon: 'lance', offhand: null, pads: 'layered', padTrim: '#a08040', tatters: true, mantle: true, tabard: '#d8ccb0', tabardTrim: '#7a6a4e', emblem: 'redcross', warbanner: '#7a2420' },
  },
  paladin: {
    cls: 'knight', name: 'Paladin', title: 'Shield of the Sun', color: '#e8c25a', ult: 'pa_judgment',
    desc: 'Stands between friends and harm. Great shield, holy blade, light that heals and burns.',
    branches: ['Aegis', 'Zeal', 'Mercy'],
    look: { armor: '#f2f3f6', armor2: '#b8bcc8', cloth: '#e0b040', cape: '#2a4a8a', helm: 'winged', weapon: 'holysword', offhand: 'towershield', crownColor: '#ffe080', pads: 'round', capeLong: true, tabard: '#2a4a8a', emblem: 'sun', halo: '#ffd860' },
  },
  sorcerer: {
    cls: 'mage', name: 'Sorcerer', title: 'Keeper of Two Storms', color: '#d8503a', ult: 'so_cataclysm',
    desc: 'Raw fire and raw frost, side by side. Freezes, melts, and wipes out whole groups at once.',
    branches: ['Pyre', 'Rime', 'Focus'],
    look: { armor: '#8a2a2a', armor2: '#2a4a8a', cloth: '#f0c060', hair: '#f4f0f8', helm: 'wild', weapon: 'staff', offhand: null, orbs: true, collar: true, robe: true, crownColor: '#ff9040', pads: 'mantle', mantle: '#2a4a8a' },
    female: { hair: '#ff8a5a' },
  },
  warlock: {
    cls: 'mage', name: 'Warlock', title: 'Voice Under the Eclipse', color: '#8a4ad0', ult: 'wl_eclipse',
    desc: 'Curses that make every blow hurt more, and a hunger that drinks the life of the cursed.',
    branches: ['Malice', 'Hunger', 'Pact'],
    look: { armor: '#2a1a3a', armor2: '#140c1e', cloth: '#a060ff', hoodColor: '#24162e', helm: 'hornhood', weapon: 'staff', offhand: 'chainbook', cape: '#1c1028', capeLong: true, robe: true, crownColor: '#b060ff', pads: 'spiked', faceShade: 0.35 },
  },
  marksman: {
    cls: 'archer', name: 'Marksman', title: 'The Eye at the Horizon', color: '#8a6a3a', ult: 'mk_oneshot',
    desc: 'Shoots from farther than anyone, and when the shot lands, it ends the fight for that one.',
    branches: ['Precision', 'Patience', 'Mobility'],
    look: { armor: '#2e3648', armor2: '#1c2230', cloth: '#d8b060', hair: '#7a4a2a', helm: 'feathercap', hatColor: '#1e1a18', weapon: 'greatbow', monocle: true, coat: true, quiver: true },
  },
  ranger: {
    cls: 'archer', name: 'Ranger', title: 'Friend of the Hawk', color: '#4a8a3a', ult: 'rg_greathunt',
    desc: 'Hunts with a hawk at the shoulder. Traps, poison and snares hold the prey for the kill.',
    branches: ['Falconry', 'Trapper', 'Wilds'],
    look: { armor: '#6a4a2a', armor2: '#3a2a1a', cloth: '#7aa04a', helm: 'wolfhood', hoodColor: '#8a7a6a', weapon: 'bow', hawk: true, fur: '#cfc0a4', pads: 'fur', quiver: true },
  },
  reaper: {
    cls: 'assassin', name: 'Reaper', title: 'The Last Visitor', color: '#d8d0bc', ult: 'rp_reaping',
    desc: 'Comes for the weakened with a great scythe. Every life taken pays for the next swing.',
    branches: ['Harvest', 'Shroud', 'Doom'],
    look: { armor: '#18141e', armor2: '#0c0a10', cloth: '#d8d0bc', hoodColor: '#16121a', helm: 'skullhood', weapon: 'scythe', offhand: null, scarf: null, cape: '#0e0c12', capeLong: true, robe: true, pads: 'bone', faceShade: 0.55 },
  },
  venomancer: {
    cls: 'assassin', name: 'Deathstalker', title: 'The Sting in the Dark', color: '#7ac03a', ult: 'vm_plague', // (id kept from its first name, Venomancer)
    desc: 'Still an assassin. Hides, strikes from the dark with poisoned blades, and lets the venom finish the work.',
    branches: ['Toxin', 'Ambush', 'Miasma'],
    look: { armor: '#24301e', armor2: '#121a0e', cloth: '#9be04a', hoodColor: '#1a2416', helm: 'mask', scarf: '#2e4a22', weapon: 'venomdagger', offhand: 'venomdagger', vials: true, stinger: '#9be04a', pads: 'one', padColor: '#2e3a26', padTrim: '#9be04a' },
  },
  bishop: {
    cls: 'priest', name: 'Bishop', title: 'Light of the Last Church', color: '#f0d890', ult: 'bi_miracle',
    desc: 'Heals everyone at once, brings back the fallen and covers the party in blessed armour.',
    branches: ['Grace', 'Bastion', 'Judgment'],
    look: { armor: '#f8f4e8', armor2: '#d8ccb0', cloth: '#e0b040', helm: 'mitre', weapon: 'crozier', offhand: 'book', robe: true, cape: '#9a2a3a', capeLong: true, crownColor: '#fff0b0', pads: 'mantle', mantle: '#e0b040', padTrim: '#fff4d0', tabard: '#9a2a3a', emblem: 'cross' },
  },
  monk: {
    cls: 'priest', name: 'Monk', title: 'The Open Hand', color: '#5aa8d8', ult: 'mo_hundredfists', armorTypes: ['light'], // fights up close, so not only in robes
    desc: 'Fights with bare hands and holy strength, in robes or light armour. The more cards played in a turn, the harder each blow.',
    branches: ['Fist', 'Flow', 'Spirit'],
    look: { armor: '#e07a2a', armor2: '#a84a1a', cloth: '#f0c040', hair: '#3a2a1e', helm: 'headband', bandColor: '#c8302a', weapon: 'fists', offhand: 'fists', beads: 'big', topknot: true, bigFists: true, robe: false, cape: null, gi: true, bareArms: true, sash: '#3a2a20' },
    female: { hair: '#2a1e18' },
  },
  engineer: {
    cls: 'blacksmith', name: 'Engineer', title: 'Builder of Iron Guns', color: '#c8a050', ult: 'en_artillery',
    desc: 'Builds cannons and shield pylons, and calls down a barrage of shells.',
    branches: ['Artillery', 'Fortify', 'Tinker'],
    look: { armor: '#3a5a78', armor2: '#24384c', cloth: '#e0a030', helm: 'goggles', weapon: 'wrench', backpack: true, gauntlet: '#c89a48', pads: 'one', padColor: '#c89a48', padTrim: '#5a4226', apron: null },
  },
  forgemaster: {
    cls: 'blacksmith', name: 'Forgemaster', title: 'Heart of the Great Furnace', color: '#ff7a2a', ult: 'fm_worldforge',
    desc: 'Swings a giant glowing hammer. Breaks armour, sets the ground on fire and splits the earth.',
    branches: ['Hammer', 'Furnace', 'Anvil'],
    look: { armor: '#3a3438', armor2: '#1e1a1e', cloth: '#ff7a2a', hair: '#d8d2cc', beard: '#d8d2cc', lens: '#ff6a20', helm: 'goggles', weapon: 'bighammer', seams: '#ff8a30', bulky: true, pads: 'heavy', gauntlet: '#2e2a2e' },
    female: { hair: '#d8d2cc' },
  },
};

// Twelve nodes per job: three branches of four tiers. Tiers 1-2 cost 1 point, tier 3 costs 2 and tier 4 costs 3.
const tree = (job, rows) => rows.flatMap((branch, b) => branch.map(([name, desc, p], i) => ({
  id: `${job}_${b}${i + 1}`, job, branch: b, tier: i + 1, name, desc, p, cost: [1, 1, 2, 3][i], req: i ? `${job}_${b}${i}` : undefined,
})));
const J = (job, o) => ({ job, ...o }); // a card filter for this job's own cards

export const JOB_TREES = {
  lordknight: tree('lordknight', [
    [['Lance Drill', '+1 ATK.', { atk: 1 }], ['Long Reach', 'Your Lord Knight cards reach 1 hex farther.', { cardMod: J('lordknight', { range: 1, tg: 'enemy' }) }],
      ['Battering Charge', 'Cards that Trample push 1 more.', { cardMod: J('lordknight', { fx: 'trample', push: 1 }) }], ['Lance Master', 'Your Lord Knight attacks roll 1 more die.', { cardMod: J('lordknight', { cat: 'attack', dice: 1 }) }]],
    [['Light Armour', '+1 Movement.', { move: 1 }], ['Ready to Ride', 'Start every battle with Haste 1.', { startStatus: { haste: 1 } }],
      ['Heavy Blow', 'Critical hits deal +20% damage.', { critDmg: 0.2 }], ['Rolling Charge', 'Your Lord Knight movement cards also give you Strength 1.', { cardMod: J('lordknight', { cat: 'movement', self: { st: 'strength', n: 1 } }) }]],
    [['Plate Hauberk', '+4 Max HP.', { hp: 4 }], ['Warlord\'s Call', 'Your Lord Knight buffs grant +1 stack.', { cardMod: J('lordknight', { cat: 'buff', stacks: 1 }) }],
      ['Hold the Ground', 'Start every battle with 3 Block.', { startBlock: 3 }], ['Iron Thorns', 'Enemies that hit you take 2 more damage (Thorns).', { thorns: 2 }]],
  ]),
  paladin: tree('paladin', [
    [['Sacred Plate', '+1 DEF.', { def: 1 }], ['Bulwark Prayer', 'Your Paladin defense cards grant +1 Block.', { cardMod: J('paladin', { cat: 'defense', block: 1 }) }],
      ['Shared Shield', 'Allies start battles with 2 Block.', { teamBlock: 2 }], ['Living Wall', 'Your Paladin defense cards roll 1 more die.', { cardMod: J('paladin', { cat: 'defense', dice: 1 }) }]],
    [['Righteous Arm', '+1 ATK.', { atk: 1 }], ['Dawnfire', 'Holy damage +15%.', { elemPct: { holy: 0.15 } }],
      ['Humbling Light', 'Your Paladin attacks apply 1 more stack.', { cardMod: J('paladin', { cat: 'attack', stacks: 1 }) }], ['Sun\'s Edge', 'Holy damage +25%.', { elemPct: { holy: 0.25 } }]],
    [['Steadfast Heart', '+5 Max HP.', { hp: 5 }], ['Gentle Hands', 'Healing is 20% stronger.', { healPct: 0.2 }],
      ['Morning Grace', 'Start every battle with Regen 2.', { startStatus: { regen: 2 } }], ['Hands of Light', 'Your Paladin heals roll 1 more die.', { cardMod: J('paladin', { fx: 'heal', dice: 1 }) }]],
  ]),
  sorcerer: tree('sorcerer', [
    [['Kindled Mind', '+1 MATK.', { matk: 1 }], ['Lasting Burn', 'Burn you apply has +1 stack.', { statusBonus: { burn: 1 } }],
      ['Searing Will', 'Your Sorcerer fire cards deal +1 damage.', { cardMod: J('sorcerer', { el: 'fire', dmg: 1 }) }], ['Heart of the Pyre', 'Fire damage +30%.', { elemPct: { fire: 0.3 } }]],
    [['Cold Reserve', '+10 Max MP.', { mp: 10 }], ['Deep Chill', 'Chill you apply has +1 stack.', { statusBonus: { chill: 1 } }],
      ['Far Frost', 'Your Sorcerer ice cards reach 1 hex farther.', { cardMod: J('sorcerer', { el: 'ice', range: 1 }) }], ['Two Storms', 'Melt and Quench combos deal +50% more.', { comboPct: 0.5 }]],
    [['Steady Flow', '+2 MP regen per round.', { mpRegen: 2 }], ['Thrift', 'Your Sorcerer cards cost 1 less MP.', { cardMod: J('sorcerer', { mp: -1 }) }],
      ['Quick Ruin', 'Your Sorcerer Epic cards cool down 1 round sooner.', { cardMod: J('sorcerer', { rarity: 'epic', cd: -1 }) }], ['Wide Storm', 'Your Sorcerer area cards roll 1 more die.', { cardMod: J('sorcerer', { shape: 'area', dice: 1 }) }]],
  ]),
  warlock: tree('warlock', [
    [['Dark Study', '+1 MATK.', { matk: 1 }], ['Heavy Curse', 'Curse you apply has +1 stack.', { statusBonus: { curse: 1 } }],
      ['Withering Word', 'Your Warlock cards apply 1 more stack.', { cardMod: J('warlock', { stacks: 1 }) }], ['Night Without End', 'Shadow damage +30%.', { elemPct: { shadow: 0.3 } }]],
    [['Grave Flesh', '+4 Max HP.', { hp: 4 }], ['Thirst', 'Heal 10% of the damage you deal.', { lifesteal: 0.1 }],
      ['Deep Drink', 'Your Warlock cards that drain heal 20% more of the damage.', { cardMod: J('warlock', { drain: 0.2 }) }], ['Feast', 'Heal 15% more of the damage you deal.', { lifesteal: 0.15 }]],
    [['Pact of Ink', '+15 Max MP.', { mp: 15 }], ['Cheap Souls', 'Your Warlock cards cost 1 less MP.', { cardMod: J('warlock', { mp: -1 }) }],
      ['Borrowed Might', 'Start every battle with Strength 1.', { startStatus: { strength: 1 } }], ['The Pact Kept', 'Your Warlock cards roll 1 more die.', { cardMod: J('warlock', { dice: 1 }) }]],
  ]),
  marksman: tree('marksman', [
    [['Keen Sight', '+10% crit chance.', { crit: 10 }], ['Far Sight', '+1 range on ranged attacks.', { rangeBonus: 1 }],
      ['Vital Spot', 'Critical hits deal +30% damage.', { critDmg: 0.3 }], ['Perfect Aim', 'Your Marksman cards roll 1 more die.', { cardMod: J('marksman', { dice: 1 }) }]],
    [['Steady Hands', '+1 ATK.', { atk: 1 }], ['Range Finder', 'Cards that hit harder from far deal +1 more.', { cardMod: J('marksman', { fx: 'far', far: 1 }) }],
      ['Deep Breath', 'Start every battle with Strength 2.', { startStatus: { strength: 2 } }], ['Spotter\'s Patience', 'Every hit of your Marksman cards gets the Marked bonus.', { cardMod: J('marksman', { keepMark: true }) }]],
    [['Light Boots', '+1 Movement.', { move: 1 }], ['Duck and Roll', '+8% evasion.', { eva: 8 }],
      ['Scout Ahead', 'Your Marksman movement cards draw 1 more.', { cardMod: J('marksman', { cat: 'movement', draw: 1 }) }], ['Head Start', 'Start every battle with Haste 2.', { startStatus: { haste: 2 } }]],
  ]),
  ranger: tree('ranger', [
    [['Strong Wings', 'Your hawk has +50% HP.', { hawkHp: 0.5 }], ['Hawk\'s Eye', 'Your hawk also applies Marked.', { hawkMark: 1 }],
      ['Talons', 'Your hawk deals +50% damage.', { turretBonus: 0.5 }], ['Faithful Bird', 'Call Hawk cools down 1 round sooner.', { cardMod: { ids: ['rg_hawk'], cd: -1 } }]],
    [['Snarecraft', 'Root you apply has +1 stack.', { statusBonus: { root: 1 } }], ['Spiked Snares', 'Your Ranger cards that Root deal +1 damage.', { cardMod: J('ranger', { st: 'root', dmg: 1 }) }],
      ['Venom Tips', 'Poison you apply has +1 stack.', { statusBonus: { poison: 1 } }], ['Killing Ground', 'Your Ranger area cards roll 1 more die.', { cardMod: J('ranger', { shape: 'area', dice: 1 }) }]],
    [['Pathfinder', '+1 Movement.', { move: 1 }], ['Hardy', '+4 Max HP.', { hp: 4 }],
      ['First on the Trail', 'Start every battle with Haste 1.', { startStatus: { haste: 1 } }], ['Wind at the Back', 'Wind damage +30%.', { elemPct: { wind: 0.3 } }]],
  ]),
  reaper: tree('reaper', [
    [['Cold Edge', '+1 ATK.', { atk: 1 }], ['Smell of Death', 'Your Reaper cards double their damage at 10% more HP.', { cardMod: J('reaper', { execute: 0.1 }) }],
      ['Sure Cut', '+10% crit chance.', { crit: 10 }], ['Harvest Moon', 'What your Reaper cards give on a kill is doubled.', { cardMod: J('reaper', { onKill: 2 }) }]],
    [['Grey Mist', '+8% evasion.', { eva: 8 }], ['Unseen', 'Start every battle in Stealth.', { startStatus: { stealth: 1 } }],
      ['Open Veins', 'Your Reaper cards apply 1 more Bleed.', { cardMod: J('reaper', { st: 'bleed', stacks: 1 }) }], ['Soul Drink', 'Heal 15% of the damage you deal.', { lifesteal: 0.15 }]],
    [['Swift Shade', '+1 Movement.', { move: 1 }], ['Black Blade', 'Shadow damage +15%.', { elemPct: { shadow: 0.15 } }],
      ['Long Shadow', 'Your Reaper cards reach 1 hex farther.', { cardMod: J('reaper', { range: 1 }) }], ['Inevitable', 'Your Reaper cards roll 1 more die.', { cardMod: J('reaper', { dice: 1 }) }]],
  ]),
  // Deathstalker: Toxin stacks the poison, Ambush strikes from Stealth, Miasma spreads it and lives inside it.
  venomancer: tree('venomancer', [
    [['Potent Brew', 'Poison you apply has +1 stack.', { statusBonus: { poison: 1 } }], ['Double Dose', 'Your Deathstalker cards apply 1 more Poison.', { cardMod: J('venomancer', { st: 'poison', stacks: 1 }) }],
      ['Rot', 'Your Deathstalker cards that count Poison count +1 per stack.', { cardMod: J('venomancer', { perStatus: 1 }) }], ['Lethal Dose', 'Your Deathstalker attacks roll 1 more die.', { cardMod: J('venomancer', { cat: 'attack', dice: 1 }) }]],
    [['Shade Cloak', '+8% evasion.', { eva: 8 }], ['Unseen', 'Start every battle in Stealth.', { startStatus: { stealth: 1 } }],
      ['From Nowhere', 'Your Assassin cards that hit harder from Stealth hit +2 more.', { cardMod: { cls: 'assassin', fx: 'hidden', hidden: 2 } }], ['Second Shadow', 'Fume Veil and Stalk cool down 1 round sooner.', { cardMod: { ids: ['vm_cloud', 'vm_stalk'], cd: -1 } }]],
    [['Thick Fog', 'Your Deathstalker area cards deal +1 damage.', { cardMod: J('venomancer', { shape: 'area', dmg: 1 }) }], ['Tough Gut', '+5 Max HP.', { hp: 5 }],
      ['Clean Blood', 'Start every battle with Regen 2.', { startStatus: { regen: 2 } }], ['Immune', 'You cannot be Poisoned.', { immunePoison: 1 }]],
  ]),
  bishop: tree('bishop', [
    [['Blessed Hands', 'Healing is 20% stronger.', { healPct: 0.2 }], ['Greater Mercy', 'Your Bishop heals restore 1 more.', { cardMod: J('bishop', { fx: 'heal', heal: 1 }) }],
      ['Lasting Grace', 'Regen you grant has +1 stack.', { statusBonus: { regen: 1 } }], ['Overflowing Cup', 'Your Bishop heals roll 1 more die.', { cardMod: J('bishop', { fx: 'heal', dice: 1 }) }]],
    [['Vestments', '+1 DEF.', { def: 1 }], ['Sanctuary Walls', 'Allies start battles with 2 Block.', { teamBlock: 2 }],
      ['Holy Bulwark', 'Your Bishop cards that grant Block grant 1 more.', { cardMod: J('bishop', { fx: 'block', block: 1 }) }], ['Second Life', 'Your Bishop revives bring allies back with 20% more HP.', { cardMod: J('bishop', { fx: 'revive', revive: 0.2 }) }]],
    [['Scripture', '+1 MATK.', { matk: 1 }], ['Radiant Word', 'Holy damage +20%.', { elemPct: { holy: 0.2 } }],
      ['Sentence', 'Your Bishop attacks apply 1 more stack.', { cardMod: J('bishop', { cat: 'attack', stacks: 1 }) }], ['Final Judgment', 'Holy damage +30%.', { elemPct: { holy: 0.3 } }]],
  ]),
  monk: tree('monk', [
    [['Hardened Knuckles', '+1 ATK.', { atk: 1 }], ['One More', 'Your Monk cards that hit several times hit once more.', { cardMod: J('monk', { hits: 1 }) }],
      ['Pressure Sense', '+10% crit chance.', { crit: 10 }], ['Iron Fist', 'Your Monk attacks roll 1 more die.', { cardMod: J('monk', { cat: 'attack', dice: 1 }) }]],
    [['Light Step', '+1 Movement.', { move: 1 }], ['Unbroken Flow', 'Your Monk cards that grow with each card played grow by 1 more.', { cardMod: J('monk', { perPlayed: 1 }) }],
      ['Warm Up', 'Start every battle with Haste 1.', { startStatus: { haste: 1 } }], ['Like Water', '+8% evasion.', { eva: 8 }]],
    [['Tempered Body', '+4 Max HP.', { hp: 4 }], ['Stone Skin', '+1 DEF.', { def: 1 }],
      ['Stillness', 'Start every battle with 3 Block.', { startBlock: 3 }], ['Inner Sun', 'Holy damage +30%.', { elemPct: { holy: 0.3 } }]],
  ]),
  engineer: tree('engineer', [
    [['Better Barrels', 'Turrets and Cannons gain +30% HP and damage.', { turretBonus: 0.3 }], ['Rifled Bore', 'Your Cannon reaches 1 hex farther.', { cannonRange: 1 }],
      ['Shaped Charges', 'Your Engineer area cards deal +1 damage.', { cardMod: J('engineer', { shape: 'area', dmg: 1 }) }], ['Grand Battery', 'Turrets and Cannons gain +50% HP and damage.', { turretBonus: 0.5 }]],
    [['Riveted Frames', 'What you build has +50% HP.', { buildHp: 0.5 }], ['Charged Pylon', 'Your Shield Pylon grants 1 more Block.', { pylonBlock: 1 }],
      ['Work Plates', 'Start every battle with 2 Block.', { startBlock: 2 }], ['Shared Plating', 'Allies start battles with 2 Block.', { teamBlock: 2 }]],
    [['Spare Cells', '+10 Max MP.', { mp: 10 }], ['Quick Assembly', 'Your Engineer cards that build cool down 1 round sooner.', { cardMod: J('engineer', { fx: 'summon', cd: -1 }) }],
      ['Efficient Design', 'Your Engineer cards cost 2 less MP.', { cardMod: J('engineer', { mp: -2 }) }], ['Organised Kit', 'Draw 1 more card each round.', { draw: 1 }]],
  ]),
  forgemaster: tree('forgemaster', [
    [['Heavy Arms', '+1 ATK.', { atk: 1 }], ['Armour Breaker', 'Your Forgemaster cards that break Block deal +2 damage.', { cardMod: J('forgemaster', { fx: 'breakBlock', dmg: 2 }) }],
      ['Great Swing', 'Your Forgemaster attacks roll 1 more die.', { cardMod: J('forgemaster', { cat: 'attack', dice: 1 }) }], ['Bedrock', 'Earth damage +30%.', { elemPct: { earth: 0.3 } }]],
    [['Slow Coals', 'Burn you apply has +1 stack.', { statusBonus: { burn: 1 } }], ['Bellows', 'Fire damage +20%.', { elemPct: { fire: 0.2 } }],
      ['White Heat', 'Your Forgemaster fire cards deal +1 damage.', { cardMod: J('forgemaster', { el: 'fire', dmg: 1 }) }], ['The Great Furnace', 'Fire damage +30%.', { elemPct: { fire: 0.3 } }]],
    [['Anvil Frame', '+6 Max HP.', { hp: 6 }], ['Forged Plate', '+1 DEF.', { def: 1 }],
      ['Hot Blood', 'Start every battle with Strength 2.', { startStatus: { strength: 2 } }], ['Spiked Apron', 'Enemies that hit you take 2 damage (Thorns).', { thorns: 2 }]],
  ]),
};

export const jobsOf = (cls) => JOB_ORDER.filter((j) => JOBS[j].cls === cls);
