// Monster bestiary. Stats derive from stage tier and per-monster multipliers.
// Board-game scale: HP in the tens, ATK / DEF are small bonuses. A monster's hit is
// round(ATK × intent dmg) + its grey dice, minus the target's DEF.
// intents: k = strike | shoot | aoe | guard | buff | heal | summon
//   strike/shoot {dmg (×ATK), range, el, status:{st,n}, name}
//   aoe {shape: area|burst|line|cone, size, range, dmg, el, status, name}  (telegraphed onto the board)
//   guard {block}  buff {st, n, allies}  heal {v (×MATK)}  summon {id, n}

const eff = (t) => (t <= 6 ? t : 6 + (t - 6) * 0.45); // stages 7 to 11 count as 6.45 to 8.25
const T = (real, t = eff(real)) => ({
  hp: Math.round(4 + 5 * t + 0.6 * t * t), // stages 1-6: 10 16 24 34 44 56 · stages 7-11: 61 67 73 79 86
  atk: Math.round((2 + 1.4 * t) * 10) / 10, // stages 1-6: 3.4 4.8 6.2 7.6 9 10.4 · stage 11: 13.6
  matk: Math.round((2 + 1.4 * t) * 10) / 10,
  def: Math.floor((t - 1) / 2),
  level: 1 + (real - 1) * 3,
  exp: Math.round(20 * Math.pow(1.7, t - 1)),
  gold: Math.round(8 * Math.pow(1.5, t - 1)),
});

function M(tier, o) {
  const b = T(tier);
  const rankMul = { normal: 1, mini: 5, mvp: 12, minion: 0.7 }[o.rank || 'normal'];
  const atkMul = (o.atkM || 1) * (o.rank === 'mvp' ? 1.5 : o.rank === 'mini' ? 1.2 : 1);
  const m = {
    rank: 'normal', size: 1, move: 3, spd: 8, el: 'neutral', weak: [], resist: [], scale: 1,
    ...o,
    tier,
    level: b.level + (o.rank === 'mvp' ? 3 : o.rank === 'mini' ? 2 : 0),
    hp: Math.round(b.hp * (o.hpM || 1) * rankMul),
    atk: Math.round(b.atk * atkMul * 10) / 10,
    matk: Math.round(b.matk * atkMul * 10) / 10,
    def: b.def + (o.defM >= 1.3 ? 1 : 0),
    dice: Math.min(4, 1 + Math.floor((eff(tier) - 1) / 2) + (o.rank === 'mvp' || o.rank === 'mini' ? 1 : 0)), // grey dice rolled on every attack
    exp: Math.round(b.exp * rankMul * 0.8),
    gold: Math.round(b.gold * rankMul * 0.8),
  };
  return m;
}

export const MONSTERS = {
  // ── Stage 1: Greenveil Forest ──
  moss_slime: M(1, { name: 'Moss Slime', look: { body: 'blob', c1: '#6ec04a', c2: '#3f7a2a', eye: '#1a2a10' }, hpM: 0.9, move: 2, spd: 4, el: 'earth', weak: ['fire'],
    intents: [{ k: 'strike', name: 'Gloop', dmg: 1, w: 3 }, { k: 'guard', name: 'Harden', block: 2, w: 1 }] }),
  thornwolf: M(1, { name: 'Thornwolf', look: { body: 'beast', c1: '#6a5a40', c2: '#3a3020', accent: '#7ac04a', eye: '#ffdd44' }, move: 4, spd: 12, atkM: 1.15, weak: ['fire'],
    intents: [{ k: 'strike', name: 'Bite', dmg: 1, w: 3 }, { k: 'strike', name: 'Rend', dmg: 0.8, status: { st: 'bleed', n: 2 }, w: 2 }] }),
  sporecap: M(1, { name: 'Sporecap', look: { body: 'plant', c1: '#c0503a', c2: '#f0e0c0', spots: '#f8f0e0' }, hpM: 0.8, move: 2, spd: 5, el: 'poison', weak: ['fire'],
    intents: [{ k: 'aoe', name: 'Spore Cloud', shape: 'burst', size: 1, dmg: 0.6, status: { st: 'poison', n: 2 }, w: 2 }, { k: 'shoot', name: 'Spore Shot', range: 3, dmg: 0.8, el: 'poison', w: 2 }] }),
  briar_sprite: M(1, { name: 'Briar Sprite', look: { body: 'floating', c1: '#a0f080', c2: '#4a8a3a', glow: '#d0ffb0' }, hpM: 0.7, move: 3, spd: 14, el: 'wind', ranged: true,
    intents: [{ k: 'shoot', name: 'Thorn Dart', range: 4, dmg: 0.9, w: 3 }, { k: 'heal', name: 'Mend', v: 0.8, w: 1 }] }),
  bramble_ogre: M(1, { name: 'Bramble Ogre', rank: 'mini', look: { body: 'golem', c1: '#6a7a4a', c2: '#3a4a2a', accent: '#8ac05a', eye: '#ff6a2a' }, size: 3, scale: 1.5, move: 2, spd: 6, defM: 1.3, weak: ['fire'],
    intents: [{ k: 'strike', name: 'Club Smash', dmg: 1.4, w: 3 }, { k: 'aoe', name: 'Ground Pound', shape: 'burst', size: 1, dmg: 0.9, status: { st: 'stun', n: 1 }, w: 2 }, { k: 'guard', name: 'Bark Skin', block: 5, w: 1 }] }),
  forest_guardian: M(1, { name: 'Forest Guardian', rank: 'mvp', look: { body: 'treant', c1: '#5a4a32', c2: '#3a2e20', accent: '#5ab04a', eye: '#a0ff70' }, size: 7, scale: 2.4, move: 2, spd: 7, el: 'earth', weak: ['fire'], resist: ['earth', 'poison'],
    intents: [{ k: 'aoe', name: 'Creeping Roots', shape: 'star', arms: 3, size: 4, dmg: 1.0, el: 'earth', status: { st: 'root', n: 1 }, w: 2 }, { k: 'strike', name: 'Root Lash', dmg: 1.2, range: 2, w: 3 }, { k: 'aoe', name: 'Thorn Eruption', shape: 'area', size: 1, range: 5, dmg: 1.0, status: { st: 'root', n: 1 }, w: 2 }, { k: 'summon', name: 'Call Saplings', id: 'moss_slime', n: 2, w: 1 }, { k: 'heal', name: 'Photosynthesis', v: 1.5, self: true, w: 1 }],
    phase2: [{ k: 'aoe', name: 'Wrath of the Grove', shape: 'star', arms: 6, size: 4, dmg: 1.1, el: 'earth', status: { st: 'root', n: 1 }, w: 2 }, { k: 'aoe', name: 'Verdant Cataclysm', shape: 'burst', size: 2, dmg: 1.1, status: { st: 'poison', n: 3 }, w: 2 }, { k: 'aoe', name: 'Thorn Eruption', shape: 'area', size: 1, range: 5, dmg: 1.2, status: { st: 'root', n: 1 }, w: 2 }, { k: 'strike', name: 'Ancient Wrath', dmg: 1.7, range: 2, w: 2 }],
    quote: 'Interlopers... the forest remembers every axe.' }),

  // ── Stage 2: Ashen Desert ──
  dune_scorpion: M(2, { name: 'Dune Scorpion', look: { body: 'insect', c1: '#c08040', c2: '#6a3a1a', eye: '#ff3030' }, move: 3, spd: 9, defM: 1.3, el: 'earth', weak: ['ice'],
    intents: [{ k: 'strike', name: 'Pincer', dmg: 1, w: 2 }, { k: 'strike', name: 'Venom Sting', dmg: 0.7, status: { st: 'poison', n: 3 }, w: 2 }] }),
  sand_wraith: M(2, { name: 'Sand Wraith', look: { body: 'floating', c1: '#e0c080', c2: '#8a6a3a', glow: '#fff0b0' }, hpM: 0.8, move: 4, spd: 13, el: 'wind', weak: ['holy'], ranged: true,
    intents: [{ k: 'shoot', name: 'Sand Lash', range: 3, dmg: 1, status: { st: 'weak', n: 1 }, w: 3 }, { k: 'aoe', name: 'Dust Devil', shape: 'area', size: 1, range: 4, dmg: 0.7, w: 1 }] }),
  cactoid: M(2, { name: 'Cactoid', look: { body: 'plant', c1: '#5aa04a', c2: '#c0a060', spots: '#f0f0d0', cactus: true }, hpM: 1.2, move: 2, spd: 4, el: 'earth', weak: ['fire'], thorns: 1,
    intents: [{ k: 'aoe', name: 'Needle Burst', shape: 'burst', size: 2, dmg: 0.6, w: 2 }, { k: 'guard', name: 'Spine Wall', block: 3, w: 1 }] }),
  sun_cultist: M(2, { name: 'Sun Cultist', look: { body: 'humanoid', armor: '#c09040', armor2: '#7a5a2a', cloth: '#a03020', skin: '#c08a60', hair: '#2a1a10', helm: 'hood', hoodColor: '#a03020', weapon: 'staff', robe: true }, hpM: 0.85, move: 3, spd: 10, el: 'fire', weak: ['ice'], ranged: true,
    intents: [{ k: 'shoot', name: 'Solar Flare', range: 4, dmg: 1.1, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'buff', name: 'Sun Rite', st: 'strength', n: 2, allies: true, w: 1 }] }),
  raider_chief: M(2, { name: 'Raider Chief Kassar', rank: 'mini', look: { body: 'humanoid', armor: '#8a6a4a', armor2: '#5a3a2a', cloth: '#c0a060', skin: '#b07850', hair: '#1a1a1a', helm: 'turban', weapon: 'sword', offhand: 'sword', beard: '#1a1a1a' }, scale: 1.35, move: 4, spd: 12,
    intents: [{ k: 'strike', name: 'Twin Scimitars', dmg: 1.3, w: 3 }, { k: 'buff', name: 'War Cry', st: 'strength', n: 3, allies: true, w: 1 }, { k: 'summon', name: 'Call Raiders', id: 'dune_scorpion', n: 1, w: 1 }] }),
  sand_tyrant: M(2, { name: 'Sand Tyrant', rank: 'mvp', look: { body: 'beast', c1: '#c09050', c2: '#6a4a2a', accent: '#e0c080', eye: '#ff4a1a', horns: true, big: true }, size: 7, scale: 2.5, move: 3, spd: 9, el: 'earth', weak: ['ice'], resist: ['earth', 'fire'],
    intents: [{ k: 'aoe', name: 'Sandstorm Ring', shape: 'ring', inner: 3, size: 4, dmg: 1.0, el: 'earth', status: { st: 'weak', n: 2 }, w: 2 }, { k: 'strike', name: 'Crushing Jaws', dmg: 1.4, w: 3 }, { k: 'aoe', name: 'Sand Breath', shape: 'cone', size: 3, dmg: 1.0, status: { st: 'weak', n: 2 }, w: 2 }, { k: 'aoe', name: 'Burrow Quake', shape: 'burst', size: 2, dmg: 0.8, status: { st: 'stun', n: 1 }, w: 1 }],
    phase2: [{ k: 'aoe', name: 'Dune Collapse', shape: 'ring', inner: 1, size: 2, dmg: 1.1, el: 'earth', w: 2, then: { k: 'aoe', name: 'Aftershock', shape: 'ring', inner: 3, size: 4, dmg: 1.1, el: 'earth', status: { st: 'weak', n: 2 } } }, { k: 'aoe', name: 'Sandstorm Fury', shape: 'area', size: 2, range: 5, dmg: 1.0, status: { st: 'weak', n: 2 }, w: 2 }, { k: 'strike', name: 'Tyrant Maul', dmg: 1.9, w: 2 }, { k: 'summon', name: 'Brood Call', id: 'dune_scorpion', n: 2, w: 1 }],
    quote: 'The dunes swallowed empires. You are but grains.' }),

  // ── Stage 3: Frostfall Kingdom ──
  frost_wolf: M(3, { name: 'Frost Wolf', look: { body: 'beast', c1: '#d8e4f0', c2: '#7a8aa0', accent: '#a0e0ff', eye: '#60c0ff' }, move: 4, spd: 13, el: 'ice', weak: ['fire'], resist: ['ice'],
    intents: [{ k: 'strike', name: 'Frost Fang', dmg: 1, el: 'ice', status: { st: 'chill', n: 1 }, w: 3 }, { k: 'buff', name: 'Howl', st: 'haste', n: 2, allies: true, w: 1 }] }),
  ice_golem: M(3, { name: 'Ice Golem', look: { body: 'golem', c1: '#a8d8f0', c2: '#5a8ab0', accent: '#e0f8ff', eye: '#2060ff' }, hpM: 1.4, defM: 1.5, move: 2, spd: 4, el: 'ice', weak: ['fire', 'earth'], resist: ['ice'],
    intents: [{ k: 'strike', name: 'Glacier Fist', dmg: 1.3, w: 2 }, { k: 'guard', name: 'Permafrost', block: 5, w: 1 }, { k: 'aoe', name: 'Frost Stomp', shape: 'burst', size: 1, dmg: 0.8, status: { st: 'chill', n: 2 }, w: 1 }] }),
  snow_wisp: M(3, { name: 'Snow Wisp', look: { body: 'floating', c1: '#e0f4ff', c2: '#80b0e0', glow: '#ffffff' }, hpM: 0.7, move: 4, spd: 15, el: 'ice', weak: ['fire'], ranged: true,
    intents: [{ k: 'shoot', name: 'Ice Needle', range: 4, dmg: 1, el: 'ice', status: { st: 'chill', n: 1 }, w: 3 }, { k: 'heal', name: 'Winter Breath', v: 0.9, w: 1 }] }),
  frozen_knight: M(3, { name: 'Frozen Knight', look: { body: 'humanoid', armor: '#8ab0d0', armor2: '#4a6a90', cloth: '#2a4a70', skin: '#a0c0e0', hair: '#e0f0ff', helm: 'knight', weapon: 'sword', offhand: 'shield', cape: '#2a4a70' }, hpM: 1.1, defM: 1.4, move: 3, spd: 8, el: 'ice', weak: ['fire', 'holy'],
    intents: [{ k: 'strike', name: 'Rime Blade', dmg: 1.2, el: 'ice', w: 3 }, { k: 'guard', name: 'Ice Shield', block: 4, w: 1 }] }),
  rime_behemoth: M(3, { name: 'Rime Behemoth', rank: 'mini', look: { body: 'beast', c1: '#e8f0f8', c2: '#8a9ab0', accent: '#60a0e0', eye: '#2040a0', horns: true, big: true }, size: 3, scale: 1.7, move: 3, spd: 7, el: 'ice', weak: ['fire'],
    intents: [{ k: 'strike', name: 'Tusk Gore', dmg: 1.4, w: 3 }, { k: 'aoe', name: 'Avalanche', shape: 'cone', size: 3, dmg: 0.9, status: { st: 'chill', n: 2 }, w: 2 }] }),
  frost_queen: M(3, { name: 'Frost Queen Isolde', rank: 'mvp', look: { body: 'humanoid', armor: '#c0e0ff', armor2: '#6a9ad0', cloth: '#e8f4ff', skin: '#d0e8ff', hair: '#f0f8ff', helm: 'crown', crownColor: '#a0e8ff', weapon: 'staff', robe: true, cape: '#7ab0e8', gown: true }, size: 3, scale: 2.0, move: 3, spd: 12, el: 'ice', weak: ['fire'], resist: ['ice'], ranged: true,
    intents: [{ k: 'aoe', name: 'Glacial Spokes', shape: 'star', arms: 6, size: 4, dmg: 1.0, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }, { k: 'shoot', name: 'Glacial Spear', range: 5, dmg: 1.3, el: 'ice', status: { st: 'chill', n: 2 }, w: 3 }, { k: 'aoe', name: 'Blizzard Crown', shape: 'area', size: 1, range: 5, dmg: 1.0, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }, { k: 'summon', name: 'Royal Guard', id: 'frozen_knight', n: 1, w: 1 }, { k: 'guard', name: 'Mirror Ice', block: 8, w: 1 }],
    phase2: [{ k: 'aoe', name: 'Frozen Halo', shape: 'ring', inner: 3, size: 4, dmg: 1.1, el: 'ice', status: { st: 'chill', n: 2 }, w: 2, then: { k: 'aoe', name: 'Heart of Winter', shape: 'ring', inner: 1, size: 2, dmg: 1.2, el: 'ice', status: { st: 'frozen', n: 1 } } }, { k: 'aoe', name: 'Absolute Zero', shape: 'burst', size: 3, dmg: 0.9, el: 'ice', status: { st: 'frozen', n: 1 }, w: 1 }, { k: 'aoe', name: 'Blizzard Crown', shape: 'area', size: 2, range: 5, dmg: 1.0, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }, { k: 'shoot', name: 'Glacial Spear', range: 5, dmg: 1.5, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }],
    quote: 'Eternal winter is mercy. Let me show you peace.' }),

  // ── Stage 4: Shadow Crypt ──
  skeleton: M(4, { name: 'Skeleton Warrior', look: { body: 'humanoid', skeleton: true, armor: '#6a6050', armor2: '#3a3428', cloth: '#4a3a5a', skin: '#e8e0c8', helm: 'none', weapon: 'sword', offhand: 'shield' }, move: 3, spd: 8, el: 'shadow', weak: ['holy', 'earth'], resist: ['poison', 'shadow'],
    intents: [{ k: 'strike', name: 'Rusted Blade', dmg: 1.1, w: 3 }, { k: 'guard', name: 'Bone Guard', block: 3, w: 1 }] }),
  crypt_bat: M(4, { name: 'Crypt Bat', look: { body: 'bat', c1: '#4a3a5a', c2: '#2a1a3a', eye: '#ff2040' }, hpM: 0.6, move: 5, spd: 17, el: 'shadow', weak: ['holy', 'wind'],
    intents: [{ k: 'strike', name: 'Blood Drain', dmg: 0.9, drain: 0.5, w: 3 }, { k: 'strike', name: 'Screech', dmg: 0.5, status: { st: 'weak', n: 1 }, w: 1 }] }),
  ghoul: M(4, { name: 'Ghoul', look: { body: 'humanoid', armor: '#5a6a4a', armor2: '#3a4a2a', cloth: '#3a3a2a', skin: '#8aa080', hair: '#2a2a1a', helm: 'none', weapon: 'claw', hunch: true }, hpM: 1.1, move: 3, spd: 9, el: 'poison', weak: ['holy', 'fire'],
    intents: [{ k: 'strike', name: 'Rotting Claw', dmg: 1, status: { st: 'poison', n: 3 }, w: 3 }, { k: 'heal', name: 'Feast', v: 1, self: true, w: 1 }] }),
  wailing_spirit: M(4, { name: 'Wailing Spirit', look: { body: 'floating', c1: '#b0a0e0', c2: '#5a4a9a', glow: '#e0d0ff' }, hpM: 0.8, move: 4, spd: 12, el: 'shadow', weak: ['holy'], resist: ['earth', 'poison'], ranged: true,
    intents: [{ k: 'shoot', name: 'Soul Wail', range: 4, dmg: 1, el: 'shadow', status: { st: 'vulnerable', n: 2 }, w: 3 }, { k: 'aoe', name: 'Banshee Scream', shape: 'burst', size: 2, dmg: 0.6, status: { st: 'weak', n: 1 }, w: 1 }] }),
  bone_colossus: M(4, { name: 'Bone Colossus', rank: 'mini', look: { body: 'golem', c1: '#e0d8c0', c2: '#8a8070', accent: '#6a4a8a', eye: '#a040ff', bones: true }, size: 3, scale: 1.7, move: 2, spd: 5, el: 'shadow', weak: ['holy', 'earth'],
    intents: [{ k: 'strike', name: 'Ossuary Slam', dmg: 1.5, w: 3 }, { k: 'aoe', name: 'Bone Storm', shape: 'burst', size: 2, dmg: 0.8, status: { st: 'bleed', n: 2 }, w: 2 }, { k: 'summon', name: 'Reassemble', id: 'skeleton', n: 1, w: 1 }] }),
  lich_king: M(4, { name: 'Lich King Morvath', rank: 'mvp', look: { body: 'humanoid', skeleton: true, armor: '#3a2a4a', armor2: '#1a1026', cloth: '#5a2a7a', skin: '#d8d0c0', helm: 'crown', crownColor: '#c0a040', weapon: 'staff', robe: true, cape: '#2a1a3a', glowEyes: '#40ffa0' }, size: 3, scale: 2.0, move: 3, spd: 11, el: 'shadow', weak: ['holy'], resist: ['shadow', 'poison', 'ice'], ranged: true,
    intents: [{ k: 'aoe', name: 'Soul Cross', shape: 'cross', size: 4, dmg: 1.0, el: 'shadow', status: { st: 'weak', n: 2 }, w: 2 }, { k: 'shoot', name: 'Death Bolt', range: 5, dmg: 1.3, el: 'shadow', w: 3 }, { k: 'aoe', name: 'Necrotic Field', shape: 'area', size: 1, range: 5, dmg: 1.0, el: 'shadow', status: { st: 'weak', n: 2 }, w: 2 }, { k: 'summon', name: 'Raise Dead', id: 'skeleton', n: 2, w: 2 }],
    phase2: [{ k: 'aoe', name: 'Grave Tide', shape: 'checker', phase: 0, size: 4, dmg: 1.1, el: 'shadow', w: 2, then: { k: 'aoe', name: 'Grave Undertow', shape: 'checker', phase: 1, size: 4, dmg: 1.1, el: 'shadow', status: { st: 'vulnerable', n: 2 } } }, { k: 'aoe', name: 'Soul Rend', shape: 'area', size: 2, range: 5, dmg: 1.1, el: 'shadow', status: { st: 'vulnerable', n: 2 }, w: 2 }, { k: 'summon', name: 'Army of the Damned', id: 'ghoul', n: 2, w: 1 }, { k: 'shoot', name: 'Finger of Death', range: 6, dmg: 1.9, el: 'shadow', w: 2 }],
    quote: 'Death is not the end of my reign. It is the beginning of yours... as my servant.' }),

  // ── Stage 5: Celestial Ruins ──
  star_sentinel: M(5, { name: 'Star Sentinel', look: { body: 'golem', c1: '#d0c8f0', c2: '#6a62a0', accent: '#ffe080', eye: '#80e0ff' }, hpM: 1.3, defM: 1.4, move: 2, spd: 6, el: 'holy', weak: ['shadow', 'earth'],
    intents: [{ k: 'strike', name: 'Astral Fist', dmg: 1.2, w: 2 }, { k: 'aoe', name: 'Starbeam', shape: 'line', size: 4, dmg: 1.0, el: 'holy', w: 2 }, { k: 'guard', name: 'Aegis Field', block: 5, w: 1 }] }),
  seraph_wisp: M(5, { name: 'Seraph Wisp', look: { body: 'floating', c1: '#fff0c0', c2: '#e0a040', glow: '#fffbe0', wings: true }, hpM: 0.7, move: 4, spd: 16, el: 'holy', weak: ['shadow'], ranged: true,
    intents: [{ k: 'shoot', name: 'Radiant Ray', range: 4, dmg: 1, el: 'holy', w: 3 }, { k: 'heal', name: 'Grace', v: 1.0, w: 2 }] }),
  astral_lynx: M(5, { name: 'Astral Lynx', look: { body: 'beast', c1: '#6a5ab0', c2: '#2a2060', accent: '#ffe0ff', eye: '#ffffff', stars: true }, move: 5, spd: 16, atkM: 1.15, el: 'wind', weak: ['earth'],
    intents: [{ k: 'strike', name: 'Comet Pounce', dmg: 1.2, w: 3 }, { k: 'strike', name: 'Rake', dmg: 0.8, status: { st: 'bleed', n: 3 }, w: 2 }] }),
  rune_guardian: M(5, { name: 'Rune Guardian', look: { body: 'humanoid', armor: '#d8d0f0', armor2: '#8a80c0', cloth: '#ffd060', skin: '#c0c0e0', hair: '#ffffff', helm: 'knight', weapon: 'spear', offhand: 'shield', cape: '#4a40a0' }, hpM: 1.1, defM: 1.3, move: 3, spd: 10, el: 'holy', weak: ['shadow'],
    intents: [{ k: 'strike', name: 'Rune Spear', dmg: 1.1, range: 2, w: 3 }, { k: 'buff', name: 'Runic Ward', st: 'regen', n: 3, allies: true, w: 1 }] }),
  aether_hydra: M(5, { name: 'Aether Hydra', rank: 'mini', look: { body: 'dragon', c1: '#5a8ad0', c2: '#2a4a8a', accent: '#a0e0ff', eye: '#ffff80', wing: '#80a0e0', hydra: true }, size: 3, scale: 1.7, move: 3, spd: 10, el: 'wind', weak: ['earth'],
    intents: [{ k: 'strike', name: 'Triple Bite', dmg: 0.6, hits: 3, w: 3 }, { k: 'aoe', name: 'Storm Breath', shape: 'cone', size: 3, dmg: 0.9, el: 'wind', w: 2 }, { k: 'heal', name: 'Regrow', v: 1.5, self: true, w: 1 }] }),
  celestial_dragon: M(5, { name: 'Celestial Dragon Aurelion', rank: 'mvp', look: { body: 'dragon', c1: '#f0e0a0', c2: '#b08a40', accent: '#ffffff', eye: '#40c0ff', wing: '#e8d8ff' }, size: 7, scale: 2.7, move: 3, spd: 13, el: 'holy', weak: ['shadow'], resist: ['holy', 'fire', 'wind'],
    intents: [{ k: 'aoe', name: 'Star Rays', shape: 'star', arms: 3, size: 6, dmg: 1.0, el: 'holy', w: 2 }, { k: 'strike', name: 'Starfang', dmg: 1.4, range: 2, w: 3 }, { k: 'aoe', name: 'Nova Breath', shape: 'cone', size: 4, dmg: 1.1, el: 'holy', w: 2 }, { k: 'aoe', name: 'Meteor Rain', shape: 'area', size: 1, range: 6, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 2 }, w: 2 }],
    phase2: [{ k: 'aoe', name: 'Constellation', shape: 'checker', phase: 2, size: 5, dmg: 1.1, el: 'holy', status: { st: 'vulnerable', n: 2 }, w: 2, then: { k: 'aoe', name: 'Six Rays', shape: 'star', arms: 6, size: 6, dmg: 1.2, el: 'holy' } }, { k: 'aoe', name: 'Supernova', shape: 'burst', size: 3, dmg: 1.0, el: 'holy', status: { st: 'stun', n: 1 }, w: 1 }, { k: 'aoe', name: 'Meteor Rain', shape: 'area', size: 2, range: 6, dmg: 1.1, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'strike', name: 'Heaven Rend', dmg: 2.0, range: 2, w: 2 }],
    quote: 'I guarded the stars before your world was born. Kneel.' }),

  // ── Stage 6: Abyssal Citadel ──
  void_imp: M(6, { name: 'Void Imp', look: { body: 'imp', c1: '#8a2a4a', c2: '#4a0a2a', eye: '#ffe040', wing: '#3a0a2a' }, hpM: 0.7, move: 4, spd: 16, el: 'fire', weak: ['holy', 'ice'], ranged: true,
    intents: [{ k: 'shoot', name: 'Hellfire Bolt', range: 4, dmg: 1, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'buff', name: 'Cackle', st: 'strength', n: 2, w: 1 }] }),
  abyss_hound: M(6, { name: 'Abyss Hound', look: { body: 'beast', c1: '#3a2a3a', c2: '#1a0a1a', accent: '#ff4a2a', eye: '#ff8020', horns: true }, move: 5, spd: 14, atkM: 1.2, el: 'fire', weak: ['ice', 'holy'],
    intents: [{ k: 'strike', name: 'Infernal Bite', dmg: 1.1, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'buff', name: 'Pack Frenzy', st: 'strength', n: 2, allies: true, w: 1 }] }),
  chaos_knight: M(6, { name: 'Chaos Knight', look: { body: 'humanoid', armor: '#3a2a3a', armor2: '#1a0a1a', cloth: '#8a1a2a', skin: '#5a3a4a', hair: '#000000', helm: 'horned', weapon: 'greatsword', cape: '#5a0a1a', glowEyes: '#ff3030' }, hpM: 1.2, defM: 1.4, move: 3, spd: 9, el: 'shadow', weak: ['holy'],
    intents: [{ k: 'strike', name: 'Chaos Cleave', dmg: 1.3, el: 'shadow', w: 3 }, { k: 'aoe', name: 'Dark Sweep', shape: 'cone', size: 2, dmg: 0.9, el: 'shadow', w: 1 }, { k: 'guard', name: 'Abyssal Plate', block: 5, w: 1 }] }),
  void_horror: M(6, { name: 'Void Horror', look: { body: 'blob', c1: '#3a1a5a', c2: '#1a0a2a', eye: '#ff40ff', tentacles: true }, hpM: 1.3, move: 2, spd: 6, el: 'shadow', weak: ['holy'], resist: ['shadow'],
    intents: [{ k: 'strike', name: 'Engulf', dmg: 1.1, drain: 0.5, w: 2 }, { k: 'aoe', name: 'Madness Pulse', shape: 'burst', size: 2, dmg: 0.7, status: { st: 'vulnerable', n: 2 }, w: 2 }] }),
  demon_warden: M(6, { name: 'Demon Warden', rank: 'mini', look: { body: 'golem', c1: '#5a2a2a', c2: '#2a0a0a', accent: '#ff6a1a', eye: '#ffd020', horns: true, lava: true }, size: 3, scale: 1.8, move: 2, spd: 7, el: 'fire', weak: ['ice', 'holy'],
    intents: [{ k: 'strike', name: 'Molten Fist', dmg: 1.5, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'aoe', name: 'Eruption', shape: 'area', size: 1, range: 4, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'guard', name: 'Obsidian Hide', block: 7, w: 1 }] }),
  abyssal_overlord: M(6, { name: 'Abyssal Overlord Xal\'Zhul', rank: 'mvp', look: { body: 'humanoid', armor: '#2a1a2a', armor2: '#120612', cloth: '#7a0a2a', skin: '#6a2030', hair: '#000000', helm: 'horned', weapon: 'greatsword', cape: '#3a0612', glowEyes: '#ff2020', wings: '#2a0a1a', demon: true }, size: 7, scale: 2.8, move: 3, spd: 12, el: 'shadow', weak: ['holy'], resist: ['shadow', 'fire', 'poison'],
    intents: [{ k: 'aoe', name: 'Ring of Ruin', shape: 'ring', inner: 3, size: 5, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 2 }, w: 2 }, { k: 'strike', name: 'Worldbreaker', dmg: 1.5, range: 2, el: 'shadow', w: 3 }, { k: 'aoe', name: 'Abyssal Flames', shape: 'area', size: 2, range: 6, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'summon', name: 'Open the Gate', id: 'void_imp', n: 2, w: 1 }, { k: 'aoe', name: 'Void Cleave', shape: 'cone', size: 3, dmg: 1.2, el: 'shadow', w: 2 }],
    phase2: [{ k: 'aoe', name: 'Rift Cross', shape: 'cross', size: 5, dmg: 1.2, el: 'shadow', w: 2, then: { k: 'aoe', name: 'Abyssal Spokes', shape: 'star', arms: 6, size: 5, dmg: 1.2, el: 'shadow', status: { st: 'vulnerable', n: 2 } } }, { k: 'aoe', name: 'End of All Things', shape: 'burst', size: 3, dmg: 1.2, el: 'shadow', status: { st: 'vulnerable', n: 2 }, w: 2 }, { k: 'aoe', name: 'Abyssal Flames', shape: 'area', size: 2, range: 6, dmg: 1.2, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'strike', name: 'Oblivion', dmg: 2.2, range: 2, el: 'shadow', w: 2 }, { k: 'summon', name: 'Legion', id: 'chaos_knight', n: 1, w: 1 }],
    quote: 'Every world ends. Yours is merely the last.' }),

  // ── Nests (MVP arenas) ── rooted spawners: every `every` rounds one hatches a weaker copy of a monster in `hatch`
  thorn_nest: M(1, { name: 'Thorn Nest', nest: true, look: { body: 'nest', c1: '#7a5a3a', c2: '#3a2616', accent: '#ffd24a' }, hpM: 2, move: 0, spd: 1, el: 'earth', weak: ['fire'],
    every: 3, hatch: ['moss_slime', 'thornwolf'], waitName: 'Stirring', hatchName: 'Hatch', intents: [] }),

  // ── Summons (hero-side constructs) ──
  // ── A fifth kind in each of the first six stages, so their fights repeat less ──
  glade_poacher: M(1, { name: 'Glade Poacher', look: { body: 'humanoid', armor: '#5a6a3a', armor2: '#3a4a2a', cloth: '#7a5a3a', skin: '#c89a70', hair: '#3a2a1a', helm: 'hood', weapon: 'spear' }, hpM: 0.9, move: 3, spd: 11, weak: ['fire'], ranged: true,
    intents: [{ k: 'shoot', name: 'Barbed Arrow', range: 4, dmg: 0.9, status: { st: 'bleed', n: 1 }, w: 3 }, { k: 'shoot', name: 'Snare Shot', range: 3, dmg: 0.5, status: { st: 'root', n: 1 }, w: 1 }] }),
  carrion_vulture: M(2, { name: 'Carrion Vulture', look: { body: 'bird', c1: '#7a5a3a', c2: '#2a1a12', eye: '#ffd040', skin: '#d8a090' }, hpM: 0.8, move: 5, spd: 16, el: 'wind', weak: ['ice'],
    intents: [{ k: 'strike', name: 'Dive', dmg: 1.1, status: { st: 'bleed', n: 2 }, w: 3 }, { k: 'buff', name: 'Circle Overhead', st: 'haste', n: 2, w: 1 }] }),
  frost_shaman: M(3, { name: 'Frost Shaman', look: { body: 'humanoid', armor: '#8ab0d0', armor2: '#4a6a90', cloth: '#d0e8ff', skin: '#c0d8f0', hair: '#f0f8ff', helm: 'hood', weapon: 'staff' }, hpM: 0.9, move: 3, spd: 9, el: 'ice', weak: ['fire'], ranged: true,
    intents: [{ k: 'shoot', name: 'Ice Bolt', range: 4, dmg: 0.9, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }, { k: 'heal', name: 'Mending Snow', v: 0.6, w: 2 }, { k: 'buff', name: 'Winter Ward', st: 'regen', n: 2, allies: true, w: 1 }] }),
  necromancer: M(4, { name: 'Necromancer', look: { body: 'humanoid', armor: '#2a2030', armor2: '#16101c', cloth: '#4a2a6a', skin: '#b0a8a0', hair: '#e0e0e0', helm: 'hood', weapon: 'staff', glowEyes: '#a060ff' }, hpM: 0.9, move: 2, spd: 8, el: 'shadow', weak: ['holy'], ranged: true,
    intents: [{ k: 'shoot', name: 'Grave Bolt', range: 4, dmg: 1.0, el: 'shadow', status: { st: 'weak', n: 1 }, w: 3 }, { k: 'summon', name: 'Raise Dead', id: 'skeleton', n: 1, w: 2 }] }),
  comet_imp: M(5, { name: 'Comet Imp', look: { body: 'imp', c1: '#e0c060', c2: '#8a6a2a', eye: '#ffffff', wing: '#fff0b0' }, hpM: 0.7, move: 4, spd: 17, el: 'holy', weak: ['shadow'], ranged: true,
    intents: [{ k: 'shoot', name: 'Starshard', range: 4, dmg: 1.0, el: 'holy', w: 3 }, { k: 'aoe', name: 'Falling Spark', shape: 'area', size: 1, range: 4, dmg: 0.7, el: 'holy', w: 1 }] }),
  doom_herald: M(6, { name: 'Doom Herald', look: { body: 'humanoid', armor: '#3a1a2a', armor2: '#1a0a12', cloth: '#6a0a2a', skin: '#7a4a5a', hair: '#000000', helm: 'hood', weapon: 'staff', glowEyes: '#ff4040' }, hpM: 0.9, move: 3, spd: 10, el: 'shadow', weak: ['holy'], ranged: true,
    intents: [{ k: 'shoot', name: 'Doom Bolt', range: 4, dmg: 1.0, el: 'shadow', status: { st: 'vulnerable', n: 2 }, w: 2 }, { k: 'buff', name: 'Dark Litany', st: 'strength', n: 2, allies: true, w: 2 }, { k: 'heal', name: 'Blood Rite', v: 0.6, w: 1 }] }),

  // ── Stage 7: Gloomcap Hollow ──
  gloom_spore: M(7, { name: 'Gloom Spore', look: { body: 'shroom', c1: '#5a3a9a', c2: '#d8d0f0', spots: '#80ffd0' }, hpM: 0.9, move: 2, spd: 6, el: 'poison', weak: ['fire'],
    intents: [{ k: 'aoe', name: 'Spore Burst', shape: 'burst', size: 1, dmg: 0.7, el: 'poison', status: { st: 'poison', n: 3 }, w: 3 }, { k: 'strike', name: 'Cap Slam', dmg: 1.0, w: 1 }] }),
  cave_stalker: M(7, { name: 'Cave Stalker', look: { body: 'spider', c1: '#3a4a5a', c2: '#141e2a', eye: '#60ffc0' }, hpM: 0.8, move: 5, spd: 17, atkM: 1.1, weak: ['fire', 'holy'],
    intents: [{ k: 'strike', name: 'Rending Fangs', dmg: 1.1, status: { st: 'bleed', n: 2 }, w: 3 }, { k: 'buff', name: 'Skitter', st: 'haste', n: 2, w: 1 }] }),
  fungal_brute: M(7, { name: 'Fungal Brute', look: { body: 'golem', c1: '#6a5a8a', c2: '#3a2a5a', accent: '#80ffd0', eye: '#c0ffe0' }, hpM: 1.4, defM: 1.3, move: 2, spd: 6, el: 'earth', weak: ['fire'],
    intents: [{ k: 'strike', name: 'Mossy Fist', dmg: 1.3, w: 3 }, { k: 'guard', name: 'Bark Shell', block: 6, w: 1 }, { k: 'aoe', name: 'Ground Pound', shape: 'burst', size: 1, dmg: 0.8, el: 'earth', w: 1 }] }),
  lantern_wisp: M(7, { name: 'Lantern Wisp', look: { body: 'floating', c1: '#80ffd0', c2: '#2a8a7a', glow: '#d0fff0' }, hpM: 0.7, move: 4, spd: 13, el: 'holy', weak: ['shadow'], ranged: true,
    intents: [{ k: 'shoot', name: 'Lure Light', range: 4, dmg: 0.8, el: 'holy', status: { st: 'vulnerable', n: 2 }, w: 2 }, { k: 'heal', name: 'Glow Mend', v: 0.6, w: 2 }] }),
  myco_shaman: M(7, { name: 'Myco Shaman', look: { body: 'humanoid', armor: '#4a3a6a', armor2: '#2a1a4a', cloth: '#7a6aa0', skin: '#a0c0b0', hair: '#80ffd0', helm: 'hood', weapon: 'staff' }, hpM: 0.9, move: 3, spd: 9, el: 'poison', weak: ['fire'], ranged: true,
    intents: [{ k: 'shoot', name: 'Rot Dart', range: 4, dmg: 0.9, el: 'poison', status: { st: 'poison', n: 2 }, w: 2 }, { k: 'summon', name: 'Sow Spores', id: 'gloom_spore', n: 1, w: 1 }, { k: 'buff', name: 'Overgrowth', st: 'regen', n: 3, allies: true, w: 1 }] }),
  mycelium_titan: M(7, { name: 'Mycelium Titan', rank: 'mini', look: { body: 'shroom', c1: '#3a6a5a', c2: '#c8d8c0', spots: '#f0ffb0', caps: 3 }, size: 3, scale: 1.8, move: 2, spd: 6, el: 'earth', weak: ['fire'],
    intents: [{ k: 'strike', name: 'Root Hammer', dmg: 1.5, status: { st: 'root', n: 1 }, w: 3 }, { k: 'aoe', name: 'Choking Cloud', shape: 'area', size: 1, range: 4, dmg: 0.8, el: 'poison', status: { st: 'poison', n: 3 }, w: 2 }, { k: 'heal', name: 'Regrow', v: 0.8, self: true, w: 1 }] }),
  sporemother: M(7, { name: 'Sporemother Yshara', rank: 'mvp', look: { body: 'shroom', c1: '#7a2a8a', c2: '#e8d8f0', spots: '#80ffd0', caps: 3, vines: true }, size: 7, scale: 2.6, move: 2, spd: 8, el: 'poison', weak: ['fire'], resist: ['poison', 'earth'],
    intents: [{ k: 'aoe', name: 'Spore Bed', shape: 'checker', phase: 0, size: 4, dmg: 0.9, el: 'poison', status: { st: 'poison', n: 3 }, w: 2 }, { k: 'aoe', name: 'Bloom of Rot', shape: 'area', size: 2, range: 6, dmg: 0.9, el: 'poison', status: { st: 'poison', n: 3 }, w: 3 }, { k: 'summon', name: 'Brood', id: 'gloom_spore', n: 2, w: 1 }, { k: 'aoe', name: 'Lashing Vines', shape: 'cone', size: 3, dmg: 1.1, status: { st: 'root', n: 1 }, w: 2 }, { k: 'strike', name: 'Crush', dmg: 1.4, range: 2, w: 2 }],
    phase2: [{ k: 'aoe', name: 'Rolling Rot', shape: 'ring', inner: 1, size: 2, dmg: 1.1, el: 'poison', status: { st: 'poison', n: 3 }, w: 2, then: { k: 'aoe', name: 'Outer Rot', shape: 'ring', inner: 3, size: 5, dmg: 1.1, el: 'poison', status: { st: 'poison', n: 3 } } }, { k: 'aoe', name: 'Mycelial Quake', shape: 'burst', size: 3, dmg: 1.1, el: 'earth', status: { st: 'weak', n: 2 }, w: 2 }, { k: 'aoe', name: 'Bloom of Rot', shape: 'area', size: 2, range: 6, dmg: 1.1, el: 'poison', status: { st: 'poison', n: 4 }, w: 2 }, { k: 'heal', name: 'Feast on the Fallen', v: 1.0, self: true, w: 1 }, { k: 'summon', name: 'Brood', id: 'cave_stalker', n: 2, w: 1 }],
    quote: 'Everything that falls here feeds me. You will feed me too.' }),

  // ── Stage 8: Clockwork Bastion ──
  gear_drone: M(8, { name: 'Gear Drone', look: { body: 'drone', c1: '#c0a060', c2: '#6a4a2a', glow: '#80e0ff' }, hpM: 0.7, move: 4, spd: 15, el: 'wind', weak: ['earth'], ranged: true,
    intents: [{ k: 'shoot', name: 'Arc Shot', range: 4, dmg: 1.0, el: 'wind', w: 3 }, { k: 'buff', name: 'Target Lock', st: 'strength', n: 2, w: 1 }] }),
  brass_sentinel: M(8, { name: 'Brass Sentinel', look: { body: 'humanoid', armor: '#c09a50', armor2: '#6a4a20', cloth: '#5a3a2a', skin: '#8a7a6a', hair: '#000000', helm: 'knight', weapon: 'spear', glowEyes: '#80e0ff' }, hpM: 1.2, defM: 1.4, move: 3, spd: 9, weak: ['wind'],
    intents: [{ k: 'strike', name: 'Piston Thrust', dmg: 1.2, range: 2, w: 3 }, { k: 'aoe', name: 'Pike Line', shape: 'line', size: 3, dmg: 0.9, w: 1 }, { k: 'guard', name: 'Lock Plates', block: 6, w: 1 }] }),
  steam_hound: M(8, { name: 'Steam Hound', look: { body: 'beast', c1: '#8a6a4a', c2: '#4a3a2a', accent: '#ff8040', eye: '#ffd040' }, move: 5, spd: 14, atkM: 1.1, el: 'fire', weak: ['ice'],
    intents: [{ k: 'strike', name: 'Scalding Bite', dmg: 1.1, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'aoe', name: 'Vent Steam', shape: 'cone', size: 2, dmg: 0.7, el: 'fire', status: { st: 'weak', n: 1 }, w: 1 }] }),
  scrap_golem: M(8, { name: 'Scrap Golem', look: { body: 'golem', c1: '#7a6a5a', c2: '#3a3028', accent: '#c09a50', eye: '#80e0ff' }, hpM: 1.5, move: 2, spd: 5, el: 'earth', weak: ['wind'],
    intents: [{ k: 'strike', name: 'Wrecking Arm', dmg: 1.4, w: 3 }, { k: 'aoe', name: 'Scrap Toss', shape: 'area', size: 1, range: 3, dmg: 0.8, w: 1 }] }),
  tinker_adept: M(8, { name: 'Tinker Adept', look: { body: 'humanoid', armor: '#6a5a4a', armor2: '#3a2a1a', cloth: '#a07040', skin: '#c89a70', hair: '#5a3a1a', helm: 'none', weapon: 'staff' }, hpM: 0.9, move: 3, spd: 10, weak: ['fire'], ranged: true,
    intents: [{ k: 'heal', name: 'Field Repairs', v: 0.7, w: 2 }, { k: 'shoot', name: 'Rivet Gun', range: 4, dmg: 0.9, w: 2 }, { k: 'summon', name: 'Wind Up a Drone', id: 'gear_drone', n: 1, w: 1 }] }),
  siege_automaton: M(8, { name: 'Siege Automaton', rank: 'mini', look: { body: 'tank', c1: '#a08050', c2: '#4a3820', accent: '#80e0ff' }, size: 3, scale: 1.8, move: 2, spd: 7, el: 'wind', weak: ['earth'],
    intents: [{ k: 'strike', name: 'Ram', dmg: 1.5, w: 2 }, { k: 'aoe', name: 'Lightning Cannon', shape: 'line', size: 5, dmg: 1.0, el: 'wind', w: 2 }, { k: 'aoe', name: 'Mortar', shape: 'area', size: 1, range: 5, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 2 }, w: 2 }, { k: 'guard', name: 'Bulkhead', block: 8, w: 1 }] }),
  iron_regent: M(8, { name: 'The Iron Regent', rank: 'mvp', look: { body: 'humanoid', armor: '#c0a050', armor2: '#5a4420', cloth: '#3a2a4a', skin: '#8a8a9a', hair: '#000000', helm: 'crown', crownColor: '#80e0ff', weapon: 'greatsword', cape: '#2a3a5a', glowEyes: '#80e0ff' }, size: 7, scale: 2.6, move: 3, spd: 11, el: 'wind', weak: ['earth'], resist: ['wind', 'poison'],
    intents: [{ k: 'aoe', name: 'Rail Cannons', shape: 'star', arms: 3, size: 6, dmg: 1.1, el: 'wind', w: 2 }, { k: 'strike', name: 'Regent Blade', dmg: 1.5, range: 2, w: 3 }, { k: 'aoe', name: 'Tesla Lance', shape: 'line', size: 5, dmg: 1.1, el: 'wind', w: 2 }, { k: 'summon', name: 'Assemble', id: 'gear_drone', n: 2, w: 1 }, { k: 'aoe', name: 'Grapeshot', shape: 'area', size: 2, range: 6, dmg: 0.9, status: { st: 'bleed', n: 2 }, w: 2 }],
    phase2: [{ k: 'aoe', name: 'Overload Grid', shape: 'checker', phase: 1, size: 5, dmg: 1.1, el: 'wind', w: 2, then: { k: 'aoe', name: 'Second Circuit', shape: 'checker', phase: 2, size: 5, dmg: 1.1, el: 'wind', status: { st: 'stun', n: 1 } } }, { k: 'aoe', name: 'Overload Core', shape: 'burst', size: 3, dmg: 1.2, el: 'wind', status: { st: 'stun', n: 1 }, w: 2 }, { k: 'aoe', name: 'Tesla Lance', shape: 'line', size: 6, dmg: 1.3, el: 'wind', w: 2 }, { k: 'guard', name: 'Emergency Plating', block: 12, w: 1 }, { k: 'summon', name: 'Assemble', id: 'brass_sentinel', n: 1, w: 1 }],
    quote: 'The makers are gone. The work goes on. You are an error in the work.' }),

  // ── Stage 9: Skysea Archipelago ──
  storm_gull: M(9, { name: 'Storm Gull', look: { body: 'bird', c1: '#e8f0f8', c2: '#7a94b4', eye: '#ffe040', skin: '#f4f4f4' }, hpM: 0.7, move: 5, spd: 18, el: 'wind', weak: ['ice'],
    intents: [{ k: 'strike', name: 'Gale Dive', dmg: 1.1, el: 'wind', w: 3 }, { k: 'shoot', name: 'Feather Dart', range: 3, dmg: 0.8, w: 1 }] }),
  tide_lurker: M(9, { name: 'Tide Lurker', look: { body: 'fish', c1: '#3a7a9a', c2: '#1a3a5a', accent: '#e8f6f4', eye: '#ffe060' }, move: 4, spd: 13, atkM: 1.1, el: 'ice', weak: ['wind'],
    intents: [{ k: 'strike', name: 'Riptide Bite', dmg: 1.2, el: 'ice', status: { st: 'chill', n: 2 }, w: 3 }, { k: 'aoe', name: 'Undertow', shape: 'cone', size: 2, dmg: 0.8, el: 'ice', status: { st: 'root', n: 1 }, w: 1 }] }),
  coral_knight: M(9, { name: 'Coral Knight', look: { body: 'humanoid', armor: '#e08a8a', armor2: '#8a3a4a', cloth: '#2a6a7a', skin: '#a0d0d0', hair: '#f0f0ff', helm: 'knight', weapon: 'sword', cape: '#2a5a6a' }, hpM: 1.2, defM: 1.4, move: 3, spd: 9, el: 'ice', weak: ['wind'],
    intents: [{ k: 'strike', name: 'Reef Edge', dmg: 1.2, status: { st: 'bleed', n: 2 }, w: 3 }, { k: 'guard', name: 'Shell Guard', block: 7, w: 1 }, { k: 'buff', name: 'Tide Oath', st: 'strength', n: 2, allies: true, w: 1 }] }),
  mist_siren: M(9, { name: 'Mist Siren', look: { body: 'floating', c1: '#b0e0f0', c2: '#4a8ab0', glow: '#f0ffff' }, hpM: 0.8, move: 3, spd: 12, el: 'ice', weak: ['fire'], ranged: true,
    intents: [{ k: 'shoot', name: 'Drowning Song', range: 5, dmg: 0.9, el: 'ice', status: { st: 'weak', n: 2 }, w: 2 }, { k: 'heal', name: 'Lullaby', v: 0.7, w: 2 }, { k: 'aoe', name: 'Mist Veil', shape: 'area', size: 1, range: 4, dmg: 0.6, el: 'ice', status: { st: 'chill', n: 2 }, w: 1 }] }),
  reef_crab: M(9, { name: 'Reef Crab', look: { body: 'crab', c1: '#e07050', c2: '#7a2a1a', eye: '#ffffff' }, hpM: 1.3, defM: 1.5, move: 3, spd: 7, weak: ['wind'],
    intents: [{ k: 'strike', name: 'Pincer', dmg: 1.3, w: 3 }, { k: 'guard', name: 'Hunker', block: 8, w: 2 }] }),
  kraken_spawn: M(9, { name: 'Kraken Spawn', rank: 'mini', look: { body: 'squid', c1: '#c0507a', c2: '#5a1a3a', eye: '#ffe040' }, size: 3, scale: 1.8, move: 2, spd: 8, el: 'ice', weak: ['wind'],
    intents: [{ k: 'strike', name: 'Tentacle Slam', dmg: 1.5, w: 3 }, { k: 'aoe', name: 'Ink Cloud', shape: 'area', size: 1, range: 4, dmg: 0.8, el: 'shadow', status: { st: 'weak', n: 2 }, w: 2 }, { k: 'aoe', name: 'Whirlpool', shape: 'burst', size: 2, dmg: 0.9, el: 'ice', status: { st: 'root', n: 1 }, w: 2 }] }),
  leviathan: M(9, { name: 'Leviathan Thalassa', rank: 'mvp', look: { body: 'serpent', c1: '#2f8f9a', c2: '#123a52', accent: '#bff0e0', eye: '#ffe060', wing: '#5fd0c0' }, size: 7, scale: 2.7, move: 3, spd: 11, el: 'ice', weak: ['wind'], resist: ['ice', 'fire'],
    intents: [{ k: 'aoe', name: 'Whirlpool Ring', shape: 'ring', inner: 3, size: 5, dmg: 1.0, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }, { k: 'strike', name: 'Maw of the Deep', dmg: 1.5, range: 2, w: 3 }, { k: 'aoe', name: 'Tidal Breath', shape: 'cone', size: 4, dmg: 1.1, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }, { k: 'aoe', name: 'Waterspout', shape: 'area', size: 2, range: 6, dmg: 1.0, el: 'wind', w: 2 }, { k: 'summon', name: 'Call the Shoal', id: 'tide_lurker', n: 2, w: 1 }],
    phase2: [{ k: 'aoe', name: 'Tidal Surge', shape: 'ring', inner: 1, size: 2, dmg: 1.2, el: 'ice', w: 2, then: { k: 'aoe', name: 'Backwash', shape: 'ring', inner: 3, size: 5, dmg: 1.2, el: 'ice', status: { st: 'root', n: 1 } } }, { k: 'aoe', name: 'Deluge', shape: 'burst', size: 3, dmg: 1.2, el: 'ice', status: { st: 'chill', n: 3 }, w: 2 }, { k: 'aoe', name: 'Tidal Breath', shape: 'cone', size: 4, dmg: 1.3, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }, { k: 'aoe', name: 'Waterspout', shape: 'area', size: 2, range: 6, dmg: 1.2, el: 'wind', status: { st: 'vulnerable', n: 2 }, w: 2 }, { k: 'heal', name: 'Sink Beneath', v: 0.9, self: true, w: 1 }],
    quote: 'The sea remembers when it had a floor. It will have yours.' }),

  // ── Stage 10: Ember Wastes ──
  cinder_imp: M(10, { name: 'Cinder Imp', look: { body: 'imp', c1: '#e0602a', c2: '#6a1a0a', eye: '#fff0a0', wing: '#8a2a0a' }, hpM: 0.7, move: 4, spd: 17, el: 'fire', weak: ['ice'], ranged: true,
    intents: [{ k: 'shoot', name: 'Cinder Spit', range: 4, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'aoe', name: 'Fire Dance', shape: 'burst', size: 1, dmg: 0.7, el: 'fire', w: 1 }] }),
  magma_crawler: M(10, { name: 'Magma Crawler', look: { body: 'insect', c1: '#5a2a1a', c2: '#2a0a0a', eye: '#ffb020' }, hpM: 1.1, move: 4, spd: 12, el: 'fire', weak: ['ice'],
    intents: [{ k: 'strike', name: 'Searing Mandibles', dmg: 1.2, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'guard', name: 'Cooling Crust', block: 6, w: 1 }] }),
  ash_revenant: M(10, { name: 'Ash Revenant', look: { body: 'humanoid', skeleton: true, armor: '#4a4040', armor2: '#2a2020', cloth: '#6a2a1a', skin: '#c0b0a0', helm: 'none', weapon: 'greatsword', glowEyes: '#ff8020' }, hpM: 1.1, move: 3, spd: 10, atkM: 1.2, el: 'fire', weak: ['holy', 'ice'],
    intents: [{ k: 'strike', name: 'Ashen Cleave', dmg: 1.3, el: 'fire', w: 3 }, { k: 'aoe', name: 'Burning Sweep', shape: 'cone', size: 2, dmg: 0.9, el: 'fire', status: { st: 'burn', n: 2 }, w: 1 }] }),
  obsidian_golem: M(10, { name: 'Obsidian Golem', look: { body: 'golem', c1: '#2a2030', c2: '#120a16', accent: '#ff5a1a', eye: '#ffd020', lava: true }, hpM: 1.5, defM: 1.4, move: 2, spd: 5, el: 'earth', weak: ['ice'],
    intents: [{ k: 'strike', name: 'Glass Fist', dmg: 1.4, status: { st: 'bleed', n: 2 }, w: 3 }, { k: 'aoe', name: 'Shard Burst', shape: 'burst', size: 1, dmg: 0.9, el: 'earth', w: 1 }, { k: 'guard', name: 'Harden', block: 8, w: 1 }] }),
  flame_dancer: M(10, { name: 'Flame Dancer', look: { body: 'flame', c1: '#ff7a1a', c2: '#c0301a', glow: '#fff0b0' }, hpM: 0.8, move: 4, spd: 14, el: 'fire', weak: ['ice'], ranged: true,
    intents: [{ k: 'buff', name: 'War Dance', st: 'strength', n: 2, allies: true, w: 2 }, { k: 'aoe', name: 'Ring of Fire', shape: 'area', size: 1, range: 4, dmg: 0.8, el: 'fire', status: { st: 'burn', n: 2 }, w: 2 }, { k: 'heal', name: 'Kindle', v: 0.6, w: 1 }] }),
  molten_wyrm: M(10, { name: 'Molten Wyrm', rank: 'mini', look: { body: 'serpent', c1: '#c0401a', c2: '#3a100a', accent: '#ffb040', eye: '#ffff80', wing: '#ff7a1a' }, size: 3, scale: 1.8, move: 3, spd: 9, el: 'fire', weak: ['ice'],
    intents: [{ k: 'strike', name: 'Magma Bite', dmg: 1.5, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'aoe', name: 'Lava Breath', shape: 'cone', size: 3, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'aoe', name: 'Burrow Burst', shape: 'burst', size: 2, dmg: 0.9, el: 'earth', w: 1 }] }),
  pyrelord: M(10, { name: 'Pyrelord Ignarok', rank: 'mvp', look: { body: 'golem', c1: '#6a2a1a', c2: '#2a0a06', accent: '#ff7a1a', eye: '#ffe040', horns: true, lava: true }, size: 7, scale: 2.8, move: 2, spd: 9, el: 'fire', weak: ['ice'], resist: ['fire', 'earth'],
    intents: [{ k: 'aoe', name: 'Magma Fissures', shape: 'cross', size: 5, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'strike', name: 'Caldera Fist', dmg: 1.6, range: 2, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'aoe', name: 'Pyroclasm', shape: 'area', size: 2, range: 6, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 3 }, w: 3 }, { k: 'aoe', name: 'Fissure', shape: 'line', size: 5, dmg: 1.1, el: 'earth', status: { st: 'stun', n: 1 }, w: 1 }, { k: 'summon', name: 'Stoke the Embers', id: 'cinder_imp', n: 2, w: 1 }],
    phase2: [{ k: 'aoe', name: 'Lava Rivers', shape: 'star', arms: 6, size: 5, dmg: 1.2, el: 'fire', status: { st: 'burn', n: 3 }, w: 2, then: { k: 'aoe', name: 'Caldera Rim', shape: 'ring', inner: 4, size: 6, dmg: 1.2, el: 'fire', status: { st: 'burn', n: 3 } } }, { k: 'aoe', name: 'Eruption of Ages', shape: 'burst', size: 3, dmg: 1.3, el: 'fire', status: { st: 'burn', n: 4 }, w: 2 }, { k: 'aoe', name: 'Pyroclasm', shape: 'area', size: 2, range: 6, dmg: 1.2, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'guard', name: 'Cooling Slag', block: 14, w: 1 }, { k: 'strike', name: 'Mountain Breaker', dmg: 2.2, range: 2, el: 'earth', w: 2 }],
    quote: 'I was a mountain before your kind had fire. I will be one after.' }),

  // ── Stage 11: The Sundered Throne ──
  null_shade: M(11, { name: 'Null Shade', look: { body: 'eye', c1: '#5a4a8a', c2: '#1a1030', eye: '#c0a0ff' }, hpM: 0.8, move: 4, spd: 15, el: 'shadow', weak: ['holy'], ranged: true,
    intents: [{ k: 'shoot', name: 'Unravel', range: 5, dmg: 1.0, el: 'shadow', status: { st: 'vulnerable', n: 2 }, w: 3 }, { k: 'aoe', name: 'Silence', shape: 'area', size: 1, range: 4, dmg: 0.7, el: 'shadow', status: { st: 'weak', n: 2 }, w: 1 }] }),
  throne_guard: M(11, { name: 'Throne Guard', look: { body: 'humanoid', armor: '#e0d8c0', armor2: '#8a7a50', cloth: '#3a2a6a', skin: '#b0a0c0', hair: '#ffffff', helm: 'knight', weapon: 'greatsword', cape: '#4a2a8a', glowEyes: '#ffe080' }, hpM: 1.3, defM: 1.4, move: 3, spd: 10, atkM: 1.1, el: 'holy', weak: ['shadow'],
    intents: [{ k: 'strike', name: 'Oathkeeper', dmg: 1.3, el: 'holy', w: 3 }, { k: 'aoe', name: 'Honour Guard', shape: 'cone', size: 2, dmg: 0.9, el: 'holy', w: 1 }, { k: 'guard', name: 'Unbroken Line', block: 8, w: 1 }] }),
  rift_stalker: M(11, { name: 'Rift Stalker', look: { body: 'beast', c1: '#4a2a7a', c2: '#1a0a3a', accent: '#ff60ff', eye: '#ffffff', horns: true }, move: 5, spd: 17, atkM: 1.2, el: 'shadow', weak: ['holy'],
    intents: [{ k: 'strike', name: 'Phase Pounce', dmg: 1.2, el: 'shadow', status: { st: 'bleed', n: 3 }, w: 3 }, { k: 'buff', name: 'Blur', st: 'haste', n: 2, w: 1 }] }),
  star_eater: M(11, { name: 'Star Eater', look: { body: 'eye', c1: '#2a1a5a', c2: '#06061a', eye: '#ffe080' }, hpM: 1.4, move: 2, spd: 7, el: 'shadow', weak: ['holy'], resist: ['shadow'],
    intents: [{ k: 'strike', name: 'Devour Light', dmg: 1.2, drain: 0.5, w: 2 }, { k: 'aoe', name: 'Event Horizon', shape: 'burst', size: 2, dmg: 0.8, el: 'shadow', status: { st: 'root', n: 1 }, w: 2 }] }),
  oblivion_seer: M(11, { name: 'Oblivion Seer', look: { body: 'humanoid', armor: '#2a2040', armor2: '#120a24', cloth: '#6a4ab0', skin: '#c0b0e0', hair: '#ffffff', helm: 'hood', weapon: 'staff', glowEyes: '#c0a0ff' }, hpM: 0.9, move: 3, spd: 11, el: 'shadow', weak: ['holy'], ranged: true,
    intents: [{ k: 'heal', name: 'Rewind', v: 0.7, w: 2 }, { k: 'shoot', name: 'Foretold Doom', range: 5, dmg: 1.0, el: 'shadow', status: { st: 'weak', n: 2 }, w: 2 }, { k: 'summon', name: 'Call a Shade', id: 'null_shade', n: 1, w: 1 }] }),
  fallen_seraph: M(11, { name: 'Fallen Seraph', rank: 'mini', look: { body: 'humanoid', armor: '#d0c8e0', armor2: '#6a5a8a', cloth: '#2a1a4a', skin: '#e0d8f0', hair: '#ffffff', helm: 'none', weapon: 'spear', wings: '#8a7ab0', glowEyes: '#ffe080' }, size: 3, scale: 1.8, move: 4, spd: 13, el: 'holy', weak: ['shadow'],
    intents: [{ k: 'strike', name: 'Lance of Dusk', dmg: 1.5, range: 2, el: 'holy', w: 3 }, { k: 'aoe', name: 'Falling Feathers', shape: 'area', size: 1, range: 5, dmg: 1.0, el: 'holy', status: { st: 'vulnerable', n: 2 }, w: 2 }, { k: 'aoe', name: 'Wing Sweep', shape: 'cone', size: 3, dmg: 1.0, el: 'wind', w: 1 }, { k: 'heal', name: 'Last Grace', v: 0.8, self: true, w: 1 }] }),
  the_unmaker: M(11, { name: 'Aeon the Unmaker', rank: 'mvp', look: { body: 'humanoid', armor: '#e8e0ff', armor2: '#5a4a9a', cloth: '#1a1030', skin: '#d0c8f0', hair: '#ffffff', helm: 'crown', crownColor: '#ffe080', weapon: 'staff', cape: '#2a1a5a', glowEyes: '#ffffff', wings: '#c0b0ff' }, size: 7, scale: 3.0, move: 3, spd: 13, el: 'shadow', weak: [], resist: ['shadow', 'holy', 'poison'],
    intents: [{ k: 'aoe', name: 'Crosshair', shape: 'cross', size: 5, dmg: 1.1, el: 'holy', status: { st: 'vulnerable', n: 2 }, w: 1 }, { k: 'aoe', name: 'Hour Hands', shape: 'star', arms: 3, size: 6, dmg: 1.1, el: 'shadow', w: 2 }, { k: 'strike', name: 'Unmake', dmg: 1.6, range: 2, el: 'shadow', w: 3 }, { k: 'aoe', name: 'Falling Sky', shape: 'area', size: 2, range: 7, dmg: 1.1, el: 'holy', status: { st: 'vulnerable', n: 2 }, w: 3 }, { k: 'aoe', name: 'Line of Ending', shape: 'line', size: 6, dmg: 1.2, el: 'shadow', w: 2 }, { k: 'summon', name: 'Echoes', id: 'null_shade', n: 2, w: 1 }],
    phase2: [{ k: 'aoe', name: 'Closing Circle', shape: 'ring', inner: 3, size: 5, dmg: 1.2, el: 'holy', w: 2, then: { k: 'aoe', name: 'Point of Ending', shape: 'ring', inner: 1, size: 2, dmg: 1.4, el: 'shadow', status: { st: 'stun', n: 1 } } }, { k: 'aoe', name: 'Erasure Grid', shape: 'checker', phase: 0, size: 5, dmg: 1.2, el: 'shadow', w: 2, then: { k: 'aoe', name: 'Second Erasure', shape: 'checker', phase: 1, size: 5, dmg: 1.2, el: 'shadow', status: { st: 'weak', n: 2 } } }, { k: 'aoe', name: 'Zero Hour', shape: 'burst', size: 3, dmg: 1.3, el: 'shadow', status: { st: 'stun', n: 1 }, w: 2 }, { k: 'aoe', name: 'Falling Sky', shape: 'area', size: 2, range: 7, dmg: 1.3, el: 'holy', status: { st: 'vulnerable', n: 2 }, w: 2 }, { k: 'strike', name: 'Erase', dmg: 2.3, range: 2, el: 'shadow', w: 2 }, { k: 'summon', name: 'Echoes', id: 'throne_guard', n: 1, w: 1 }, { k: 'heal', name: 'Turn Back the Hour', v: 0.8, self: true, w: 1 }],
    quote: 'I made the worlds, and I grew tired of them. Yours is the last page.' }),

  turret: { name: 'Arc Turret', construct: true, look: { body: 'turret', c1: '#8a6a4a', c2: '#4a3a2a', accent: '#ffb030' }, hp: 6, atk: 0, def: 0, move: 0, spd: 0, size: 1, scale: 0.9, el: 'fire', weak: [], resist: [] },
  barricade: { name: 'Iron Barricade', construct: true, look: { body: 'barricade', c1: '#7a7a80', c2: '#3a3a40' }, hp: 8, atk: 0, def: 1, move: 0, spd: 0, size: 1, scale: 0.9, el: 'neutral', weak: [], resist: [] },
};

for (const [id, m] of Object.entries(MONSTERS)) m.id = id;
