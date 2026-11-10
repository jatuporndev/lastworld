// Monster bestiary. Stats derive from stage tier and per-monster multipliers.
// intents: k = strike | shoot | aoe | guard | buff | heal | summon
//   strike/shoot {dmg (×ATK), range, el, status:{st,n}, name}
//   aoe {shape: area|burst|line|cone, size, range, dmg, el, status, name}  (telegraphed onto the board)
//   guard {block}  buff {st, n, allies}  heal {v (×MATK)}  summon {id, n}

const T = (t) => ({
  hp: Math.round(40 * Math.pow(1.5, t - 1)),
  atk: Math.round(19 * Math.pow(1.5, t - 1)),
  matk: Math.round(19 * Math.pow(1.5, t - 1)),
  def: Math.round(3 + (t - 1) * 5),
  level: 1 + (t - 1) * 3,
  exp: Math.round(20 * Math.pow(1.7, t - 1)),
  gold: Math.round(8 * Math.pow(1.5, t - 1)),
});

function M(tier, o) {
  const b = T(tier);
  const rankMul = { normal: 1, mini: 6, mvp: 16, minion: 0.7 }[o.rank || 'normal'];
  const m = {
    rank: 'normal', size: 1, move: 3, spd: 8, el: 'neutral', weak: [], resist: [], scale: 1,
    ...o,
    tier,
    level: b.level + (o.rank === 'mvp' ? 3 : o.rank === 'mini' ? 2 : 0),
    hp: Math.round(b.hp * (o.hpM || 1) * rankMul),
    atk: Math.round(b.atk * (o.atkM || 1) * (o.rank === 'mvp' ? 1.7 : o.rank === 'mini' ? 1.35 : 1)),
    matk: Math.round(b.matk * (o.atkM || 1) * (o.rank === 'mvp' ? 1.7 : o.rank === 'mini' ? 1.35 : 1)),
    def: Math.round(b.def * (o.defM || 1) * (o.rank === 'mvp' ? 1.4 : 1)),
    exp: Math.round(b.exp * rankMul * 0.8),
    gold: Math.round(b.gold * rankMul * 0.8),
  };
  return m;
}

export const MONSTERS = {
  // ── Stage 1: Greenveil Forest ──
  moss_slime: M(1, { name: 'Moss Slime', look: { body: 'blob', c1: '#6ec04a', c2: '#3f7a2a', eye: '#1a2a10' }, hpM: 0.9, move: 2, spd: 4, el: 'earth', weak: ['fire'],
    intents: [{ k: 'strike', name: 'Gloop', dmg: 1, w: 3 }, { k: 'guard', name: 'Harden', block: 6, w: 1 }] }),
  thornwolf: M(1, { name: 'Thornwolf', look: { body: 'beast', c1: '#6a5a40', c2: '#3a3020', accent: '#7ac04a', eye: '#ffdd44' }, move: 4, spd: 12, atkM: 1.15, weak: ['fire'],
    intents: [{ k: 'strike', name: 'Bite', dmg: 1, w: 3 }, { k: 'strike', name: 'Rend', dmg: 0.8, status: { st: 'bleed', n: 2 }, w: 2 }] }),
  sporecap: M(1, { name: 'Sporecap', look: { body: 'plant', c1: '#c0503a', c2: '#f0e0c0', spots: '#f8f0e0' }, hpM: 0.8, move: 2, spd: 5, el: 'poison', weak: ['fire'],
    intents: [{ k: 'aoe', name: 'Spore Cloud', shape: 'burst', size: 1, dmg: 0.6, status: { st: 'poison', n: 2 }, w: 2 }, { k: 'shoot', name: 'Spore Shot', range: 3, dmg: 0.8, el: 'poison', w: 2 }] }),
  briar_sprite: M(1, { name: 'Briar Sprite', look: { body: 'floating', c1: '#a0f080', c2: '#4a8a3a', glow: '#d0ffb0' }, hpM: 0.7, move: 3, spd: 14, el: 'wind', ranged: true,
    intents: [{ k: 'shoot', name: 'Thorn Dart', range: 4, dmg: 0.9, w: 3 }, { k: 'heal', name: 'Mend', v: 0.8, w: 1 }] }),
  bramble_ogre: M(1, { name: 'Bramble Ogre', rank: 'mini', look: { body: 'golem', c1: '#6a7a4a', c2: '#3a4a2a', accent: '#8ac05a', eye: '#ff6a2a' }, size: 3, scale: 1.5, move: 2, spd: 6, defM: 1.3, weak: ['fire'],
    intents: [{ k: 'strike', name: 'Club Smash', dmg: 1.4, w: 3 }, { k: 'aoe', name: 'Ground Pound', shape: 'burst', size: 1, dmg: 0.9, status: { st: 'stun', n: 1 }, w: 2 }, { k: 'guard', name: 'Bark Skin', block: 14, w: 1 }] }),
  forest_guardian: M(1, { name: 'Forest Guardian', rank: 'mvp', look: { body: 'treant', c1: '#5a4a32', c2: '#3a2e20', accent: '#5ab04a', eye: '#a0ff70' }, size: 7, scale: 2.4, move: 2, spd: 7, el: 'earth', weak: ['fire'], resist: ['earth', 'poison'],
    intents: [{ k: 'strike', name: 'Root Lash', dmg: 1.2, range: 2, w: 3 }, { k: 'aoe', name: 'Thorn Eruption', shape: 'area', size: 1, range: 5, dmg: 1.0, status: { st: 'root', n: 1 }, w: 2 }, { k: 'summon', name: 'Call Saplings', id: 'moss_slime', n: 2, w: 1 }, { k: 'heal', name: 'Photosynthesis', v: 1.5, self: true, w: 1 }],
    phase2: [{ k: 'aoe', name: 'Verdant Cataclysm', shape: 'burst', size: 2, dmg: 1.1, status: { st: 'poison', n: 3 }, w: 2 }, { k: 'aoe', name: 'Thorn Eruption', shape: 'area', size: 1, range: 5, dmg: 1.2, status: { st: 'root', n: 1 }, w: 2 }, { k: 'strike', name: 'Ancient Wrath', dmg: 1.7, range: 2, w: 2 }],
    quote: 'Interlopers... the forest remembers every axe.' }),

  // ── Stage 2: Ashen Desert ──
  dune_scorpion: M(2, { name: 'Dune Scorpion', look: { body: 'insect', c1: '#c08040', c2: '#6a3a1a', eye: '#ff3030' }, move: 3, spd: 9, defM: 1.3, el: 'earth', weak: ['ice'],
    intents: [{ k: 'strike', name: 'Pincer', dmg: 1, w: 2 }, { k: 'strike', name: 'Venom Sting', dmg: 0.7, status: { st: 'poison', n: 3 }, w: 2 }] }),
  sand_wraith: M(2, { name: 'Sand Wraith', look: { body: 'floating', c1: '#e0c080', c2: '#8a6a3a', glow: '#fff0b0' }, hpM: 0.8, move: 4, spd: 13, el: 'wind', weak: ['holy'], ranged: true,
    intents: [{ k: 'shoot', name: 'Sand Lash', range: 3, dmg: 1, status: { st: 'weak', n: 1 }, w: 3 }, { k: 'aoe', name: 'Dust Devil', shape: 'area', size: 1, range: 4, dmg: 0.7, w: 1 }] }),
  cactoid: M(2, { name: 'Cactoid', look: { body: 'plant', c1: '#5aa04a', c2: '#c0a060', spots: '#f0f0d0', cactus: true }, hpM: 1.2, move: 2, spd: 4, el: 'earth', weak: ['fire'], thorns: 3,
    intents: [{ k: 'aoe', name: 'Needle Burst', shape: 'burst', size: 2, dmg: 0.6, w: 2 }, { k: 'guard', name: 'Spine Wall', block: 10, w: 1 }] }),
  sun_cultist: M(2, { name: 'Sun Cultist', look: { body: 'humanoid', armor: '#c09040', armor2: '#7a5a2a', cloth: '#a03020', skin: '#c08a60', hair: '#2a1a10', helm: 'hood', hoodColor: '#a03020', weapon: 'staff', robe: true }, hpM: 0.85, move: 3, spd: 10, el: 'fire', weak: ['ice'], ranged: true,
    intents: [{ k: 'shoot', name: 'Solar Flare', range: 4, dmg: 1.1, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'buff', name: 'Sun Rite', st: 'strength', n: 2, allies: true, w: 1 }] }),
  raider_chief: M(2, { name: 'Raider Chief Kassar', rank: 'mini', look: { body: 'humanoid', armor: '#8a6a4a', armor2: '#5a3a2a', cloth: '#c0a060', skin: '#b07850', hair: '#1a1a1a', helm: 'turban', weapon: 'sword', offhand: 'sword', beard: '#1a1a1a' }, scale: 1.35, move: 4, spd: 12,
    intents: [{ k: 'strike', name: 'Twin Scimitars', dmg: 1.3, w: 3 }, { k: 'buff', name: 'War Cry', st: 'strength', n: 3, allies: true, w: 1 }, { k: 'summon', name: 'Call Raiders', id: 'dune_scorpion', n: 1, w: 1 }] }),
  sand_tyrant: M(2, { name: 'Sand Tyrant', rank: 'mvp', look: { body: 'beast', c1: '#c09050', c2: '#6a4a2a', accent: '#e0c080', eye: '#ff4a1a', horns: true, big: true }, size: 7, scale: 2.5, move: 3, spd: 9, el: 'earth', weak: ['ice'], resist: ['earth', 'fire'],
    intents: [{ k: 'strike', name: 'Crushing Jaws', dmg: 1.4, w: 3 }, { k: 'aoe', name: 'Sand Breath', shape: 'cone', size: 3, dmg: 1.0, status: { st: 'weak', n: 2 }, w: 2 }, { k: 'aoe', name: 'Burrow Quake', shape: 'burst', size: 2, dmg: 0.8, status: { st: 'stun', n: 1 }, w: 1 }],
    phase2: [{ k: 'aoe', name: 'Sandstorm Fury', shape: 'area', size: 2, range: 5, dmg: 1.0, status: { st: 'weak', n: 2 }, w: 2 }, { k: 'strike', name: 'Tyrant Maul', dmg: 1.9, w: 2 }, { k: 'summon', name: 'Brood Call', id: 'dune_scorpion', n: 2, w: 1 }],
    quote: 'The dunes swallowed empires. You are but grains.' }),

  // ── Stage 3: Frostfall Kingdom ──
  frost_wolf: M(3, { name: 'Frost Wolf', look: { body: 'beast', c1: '#d8e4f0', c2: '#7a8aa0', accent: '#a0e0ff', eye: '#60c0ff' }, move: 4, spd: 13, el: 'ice', weak: ['fire'], resist: ['ice'],
    intents: [{ k: 'strike', name: 'Frost Fang', dmg: 1, el: 'ice', status: { st: 'chill', n: 1 }, w: 3 }, { k: 'buff', name: 'Howl', st: 'haste', n: 2, allies: true, w: 1 }] }),
  ice_golem: M(3, { name: 'Ice Golem', look: { body: 'golem', c1: '#a8d8f0', c2: '#5a8ab0', accent: '#e0f8ff', eye: '#2060ff' }, hpM: 1.4, defM: 1.5, move: 2, spd: 4, el: 'ice', weak: ['fire', 'earth'], resist: ['ice'],
    intents: [{ k: 'strike', name: 'Glacier Fist', dmg: 1.3, w: 2 }, { k: 'guard', name: 'Permafrost', block: 15, w: 1 }, { k: 'aoe', name: 'Frost Stomp', shape: 'burst', size: 1, dmg: 0.8, status: { st: 'chill', n: 2 }, w: 1 }] }),
  snow_wisp: M(3, { name: 'Snow Wisp', look: { body: 'floating', c1: '#e0f4ff', c2: '#80b0e0', glow: '#ffffff' }, hpM: 0.7, move: 4, spd: 15, el: 'ice', weak: ['fire'], ranged: true,
    intents: [{ k: 'shoot', name: 'Ice Needle', range: 4, dmg: 1, el: 'ice', status: { st: 'chill', n: 1 }, w: 3 }, { k: 'heal', name: 'Winter Breath', v: 0.9, w: 1 }] }),
  frozen_knight: M(3, { name: 'Frozen Knight', look: { body: 'humanoid', armor: '#8ab0d0', armor2: '#4a6a90', cloth: '#2a4a70', skin: '#a0c0e0', hair: '#e0f0ff', helm: 'knight', weapon: 'sword', offhand: 'shield', cape: '#2a4a70' }, hpM: 1.1, defM: 1.4, move: 3, spd: 8, el: 'ice', weak: ['fire', 'holy'],
    intents: [{ k: 'strike', name: 'Rime Blade', dmg: 1.2, el: 'ice', w: 3 }, { k: 'guard', name: 'Ice Shield', block: 12, w: 1 }] }),
  rime_behemoth: M(3, { name: 'Rime Behemoth', rank: 'mini', look: { body: 'beast', c1: '#e8f0f8', c2: '#8a9ab0', accent: '#60a0e0', eye: '#2040a0', horns: true, big: true }, size: 3, scale: 1.7, move: 3, spd: 7, el: 'ice', weak: ['fire'],
    intents: [{ k: 'strike', name: 'Tusk Gore', dmg: 1.4, w: 3 }, { k: 'aoe', name: 'Avalanche', shape: 'cone', size: 3, dmg: 0.9, status: { st: 'chill', n: 2 }, w: 2 }] }),
  frost_queen: M(3, { name: 'Frost Queen Isolde', rank: 'mvp', look: { body: 'humanoid', armor: '#c0e0ff', armor2: '#6a9ad0', cloth: '#e8f4ff', skin: '#d0e8ff', hair: '#f0f8ff', helm: 'crown', crownColor: '#a0e8ff', weapon: 'staff', robe: true, cape: '#7ab0e8', gown: true }, size: 3, scale: 2.0, move: 3, spd: 12, el: 'ice', weak: ['fire'], resist: ['ice'], ranged: true,
    intents: [{ k: 'shoot', name: 'Glacial Spear', range: 5, dmg: 1.3, el: 'ice', status: { st: 'chill', n: 2 }, w: 3 }, { k: 'aoe', name: 'Blizzard Crown', shape: 'area', size: 1, range: 5, dmg: 1.0, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }, { k: 'summon', name: 'Royal Guard', id: 'frozen_knight', n: 1, w: 1 }, { k: 'guard', name: 'Mirror Ice', block: 25, w: 1 }],
    phase2: [{ k: 'aoe', name: 'Absolute Zero', shape: 'burst', size: 3, dmg: 0.9, el: 'ice', status: { st: 'frozen', n: 1 }, w: 1 }, { k: 'aoe', name: 'Blizzard Crown', shape: 'area', size: 2, range: 5, dmg: 1.0, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }, { k: 'shoot', name: 'Glacial Spear', range: 5, dmg: 1.5, el: 'ice', status: { st: 'chill', n: 2 }, w: 2 }],
    quote: 'Eternal winter is mercy. Let me show you peace.' }),

  // ── Stage 4: Shadow Crypt ──
  skeleton: M(4, { name: 'Skeleton Warrior', look: { body: 'humanoid', skeleton: true, armor: '#6a6050', armor2: '#3a3428', cloth: '#4a3a5a', skin: '#e8e0c8', helm: 'none', weapon: 'sword', offhand: 'shield' }, move: 3, spd: 8, el: 'shadow', weak: ['holy', 'earth'], resist: ['poison', 'shadow'],
    intents: [{ k: 'strike', name: 'Rusted Blade', dmg: 1.1, w: 3 }, { k: 'guard', name: 'Bone Guard', block: 10, w: 1 }] }),
  crypt_bat: M(4, { name: 'Crypt Bat', look: { body: 'bat', c1: '#4a3a5a', c2: '#2a1a3a', eye: '#ff2040' }, hpM: 0.6, move: 5, spd: 17, el: 'shadow', weak: ['holy', 'wind'],
    intents: [{ k: 'strike', name: 'Blood Drain', dmg: 0.9, drain: 0.5, w: 3 }, { k: 'strike', name: 'Screech', dmg: 0.5, status: { st: 'weak', n: 1 }, w: 1 }] }),
  ghoul: M(4, { name: 'Ghoul', look: { body: 'humanoid', armor: '#5a6a4a', armor2: '#3a4a2a', cloth: '#3a3a2a', skin: '#8aa080', hair: '#2a2a1a', helm: 'none', weapon: 'claw', hunch: true }, hpM: 1.1, move: 3, spd: 9, el: 'poison', weak: ['holy', 'fire'],
    intents: [{ k: 'strike', name: 'Rotting Claw', dmg: 1, status: { st: 'poison', n: 3 }, w: 3 }, { k: 'heal', name: 'Feast', v: 1, self: true, w: 1 }] }),
  wailing_spirit: M(4, { name: 'Wailing Spirit', look: { body: 'floating', c1: '#b0a0e0', c2: '#5a4a9a', glow: '#e0d0ff' }, hpM: 0.8, move: 4, spd: 12, el: 'shadow', weak: ['holy'], resist: ['earth', 'poison'], ranged: true,
    intents: [{ k: 'shoot', name: 'Soul Wail', range: 4, dmg: 1, el: 'shadow', status: { st: 'vulnerable', n: 2 }, w: 3 }, { k: 'aoe', name: 'Banshee Scream', shape: 'burst', size: 2, dmg: 0.6, status: { st: 'weak', n: 1 }, w: 1 }] }),
  bone_colossus: M(4, { name: 'Bone Colossus', rank: 'mini', look: { body: 'golem', c1: '#e0d8c0', c2: '#8a8070', accent: '#6a4a8a', eye: '#a040ff', bones: true }, size: 3, scale: 1.7, move: 2, spd: 5, el: 'shadow', weak: ['holy', 'earth'],
    intents: [{ k: 'strike', name: 'Ossuary Slam', dmg: 1.5, w: 3 }, { k: 'aoe', name: 'Bone Storm', shape: 'burst', size: 2, dmg: 0.8, status: { st: 'bleed', n: 2 }, w: 2 }, { k: 'summon', name: 'Reassemble', id: 'skeleton', n: 1, w: 1 }] }),
  lich_king: M(4, { name: 'Lich King Morvath', rank: 'mvp', look: { body: 'humanoid', skeleton: true, armor: '#3a2a4a', armor2: '#1a1026', cloth: '#5a2a7a', skin: '#d8d0c0', helm: 'crown', crownColor: '#c0a040', weapon: 'staff', robe: true, cape: '#2a1a3a', glowEyes: '#40ffa0' }, size: 3, scale: 2.0, move: 3, spd: 11, el: 'shadow', weak: ['holy'], resist: ['shadow', 'poison', 'ice'], ranged: true,
    intents: [{ k: 'shoot', name: 'Death Bolt', range: 5, dmg: 1.3, el: 'shadow', w: 3 }, { k: 'aoe', name: 'Necrotic Field', shape: 'area', size: 1, range: 5, dmg: 1.0, el: 'shadow', status: { st: 'weak', n: 2 }, w: 2 }, { k: 'summon', name: 'Raise Dead', id: 'skeleton', n: 2, w: 2 }],
    phase2: [{ k: 'aoe', name: 'Soul Rend', shape: 'area', size: 2, range: 5, dmg: 1.1, el: 'shadow', status: { st: 'vulnerable', n: 2 }, w: 2 }, { k: 'summon', name: 'Army of the Damned', id: 'ghoul', n: 2, w: 1 }, { k: 'shoot', name: 'Finger of Death', range: 6, dmg: 1.9, el: 'shadow', w: 2 }],
    quote: 'Death is not the end of my reign. It is the beginning of yours... as my servant.' }),

  // ── Stage 5: Celestial Ruins ──
  star_sentinel: M(5, { name: 'Star Sentinel', look: { body: 'golem', c1: '#d0c8f0', c2: '#6a62a0', accent: '#ffe080', eye: '#80e0ff' }, hpM: 1.3, defM: 1.4, move: 2, spd: 6, el: 'holy', weak: ['shadow', 'earth'],
    intents: [{ k: 'strike', name: 'Astral Fist', dmg: 1.2, w: 2 }, { k: 'aoe', name: 'Starbeam', shape: 'line', size: 4, dmg: 1.0, el: 'holy', w: 2 }, { k: 'guard', name: 'Aegis Field', block: 14, w: 1 }] }),
  seraph_wisp: M(5, { name: 'Seraph Wisp', look: { body: 'floating', c1: '#fff0c0', c2: '#e0a040', glow: '#fffbe0', wings: true }, hpM: 0.7, move: 4, spd: 16, el: 'holy', weak: ['shadow'], ranged: true,
    intents: [{ k: 'shoot', name: 'Radiant Ray', range: 4, dmg: 1, el: 'holy', w: 3 }, { k: 'heal', name: 'Grace', v: 1.0, w: 2 }] }),
  astral_lynx: M(5, { name: 'Astral Lynx', look: { body: 'beast', c1: '#6a5ab0', c2: '#2a2060', accent: '#ffe0ff', eye: '#ffffff', stars: true }, move: 5, spd: 16, atkM: 1.15, el: 'wind', weak: ['earth'],
    intents: [{ k: 'strike', name: 'Comet Pounce', dmg: 1.2, w: 3 }, { k: 'strike', name: 'Rake', dmg: 0.8, status: { st: 'bleed', n: 3 }, w: 2 }] }),
  rune_guardian: M(5, { name: 'Rune Guardian', look: { body: 'humanoid', armor: '#d8d0f0', armor2: '#8a80c0', cloth: '#ffd060', skin: '#c0c0e0', hair: '#ffffff', helm: 'knight', weapon: 'spear', offhand: 'shield', cape: '#4a40a0' }, hpM: 1.1, defM: 1.3, move: 3, spd: 10, el: 'holy', weak: ['shadow'],
    intents: [{ k: 'strike', name: 'Rune Spear', dmg: 1.1, range: 2, w: 3 }, { k: 'buff', name: 'Runic Ward', st: 'regen', n: 3, allies: true, w: 1 }] }),
  aether_hydra: M(5, { name: 'Aether Hydra', rank: 'mini', look: { body: 'dragon', c1: '#5a8ad0', c2: '#2a4a8a', accent: '#a0e0ff', eye: '#ffff80', wing: '#80a0e0', hydra: true }, size: 3, scale: 1.7, move: 3, spd: 10, el: 'wind', weak: ['earth'],
    intents: [{ k: 'strike', name: 'Triple Bite', dmg: 0.6, hits: 3, w: 3 }, { k: 'aoe', name: 'Storm Breath', shape: 'cone', size: 3, dmg: 0.9, el: 'wind', w: 2 }, { k: 'heal', name: 'Regrow', v: 1.5, self: true, w: 1 }] }),
  celestial_dragon: M(5, { name: 'Celestial Dragon Aurelion', rank: 'mvp', look: { body: 'dragon', c1: '#f0e0a0', c2: '#b08a40', accent: '#ffffff', eye: '#40c0ff', wing: '#e8d8ff' }, size: 7, scale: 2.7, move: 3, spd: 13, el: 'holy', weak: ['shadow'], resist: ['holy', 'fire', 'wind'],
    intents: [{ k: 'strike', name: 'Starfang', dmg: 1.4, range: 2, w: 3 }, { k: 'aoe', name: 'Nova Breath', shape: 'cone', size: 4, dmg: 1.1, el: 'holy', w: 2 }, { k: 'aoe', name: 'Meteor Rain', shape: 'area', size: 1, range: 6, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 2 }, w: 2 }],
    phase2: [{ k: 'aoe', name: 'Supernova', shape: 'burst', size: 3, dmg: 1.0, el: 'holy', status: { st: 'stun', n: 1 }, w: 1 }, { k: 'aoe', name: 'Meteor Rain', shape: 'area', size: 2, range: 6, dmg: 1.1, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'strike', name: 'Heaven Rend', dmg: 2.0, range: 2, w: 2 }],
    quote: 'I guarded the stars before your world was born. Kneel.' }),

  // ── Stage 6: Abyssal Citadel ──
  void_imp: M(6, { name: 'Void Imp', look: { body: 'imp', c1: '#8a2a4a', c2: '#4a0a2a', eye: '#ffe040', wing: '#3a0a2a' }, hpM: 0.7, move: 4, spd: 16, el: 'fire', weak: ['holy', 'ice'], ranged: true,
    intents: [{ k: 'shoot', name: 'Hellfire Bolt', range: 4, dmg: 1, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'buff', name: 'Cackle', st: 'strength', n: 2, w: 1 }] }),
  abyss_hound: M(6, { name: 'Abyss Hound', look: { body: 'beast', c1: '#3a2a3a', c2: '#1a0a1a', accent: '#ff4a2a', eye: '#ff8020', horns: true }, move: 5, spd: 14, atkM: 1.2, el: 'fire', weak: ['ice', 'holy'],
    intents: [{ k: 'strike', name: 'Infernal Bite', dmg: 1.1, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'buff', name: 'Pack Frenzy', st: 'strength', n: 2, allies: true, w: 1 }] }),
  chaos_knight: M(6, { name: 'Chaos Knight', look: { body: 'humanoid', armor: '#3a2a3a', armor2: '#1a0a1a', cloth: '#8a1a2a', skin: '#5a3a4a', hair: '#000000', helm: 'horned', weapon: 'greatsword', cape: '#5a0a1a', glowEyes: '#ff3030' }, hpM: 1.2, defM: 1.4, move: 3, spd: 9, el: 'shadow', weak: ['holy'],
    intents: [{ k: 'strike', name: 'Chaos Cleave', dmg: 1.3, el: 'shadow', w: 3 }, { k: 'aoe', name: 'Dark Sweep', shape: 'cone', size: 2, dmg: 0.9, el: 'shadow', w: 1 }, { k: 'guard', name: 'Abyssal Plate', block: 16, w: 1 }] }),
  void_horror: M(6, { name: 'Void Horror', look: { body: 'blob', c1: '#3a1a5a', c2: '#1a0a2a', eye: '#ff40ff', tentacles: true }, hpM: 1.3, move: 2, spd: 6, el: 'shadow', weak: ['holy'], resist: ['shadow'],
    intents: [{ k: 'strike', name: 'Engulf', dmg: 1.1, drain: 0.5, w: 2 }, { k: 'aoe', name: 'Madness Pulse', shape: 'burst', size: 2, dmg: 0.7, status: { st: 'vulnerable', n: 2 }, w: 2 }] }),
  demon_warden: M(6, { name: 'Demon Warden', rank: 'mini', look: { body: 'golem', c1: '#5a2a2a', c2: '#2a0a0a', accent: '#ff6a1a', eye: '#ffd020', horns: true, lava: true }, size: 3, scale: 1.8, move: 2, spd: 7, el: 'fire', weak: ['ice', 'holy'],
    intents: [{ k: 'strike', name: 'Molten Fist', dmg: 1.5, el: 'fire', status: { st: 'burn', n: 2 }, w: 3 }, { k: 'aoe', name: 'Eruption', shape: 'area', size: 1, range: 4, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'guard', name: 'Obsidian Hide', block: 22, w: 1 }] }),
  abyssal_overlord: M(6, { name: 'Abyssal Overlord Xal\'Zhul', rank: 'mvp', look: { body: 'humanoid', armor: '#2a1a2a', armor2: '#120612', cloth: '#7a0a2a', skin: '#6a2030', hair: '#000000', helm: 'horned', weapon: 'greatsword', cape: '#3a0612', glowEyes: '#ff2020', wings: '#2a0a1a', demon: true }, size: 7, scale: 2.8, move: 3, spd: 12, el: 'shadow', weak: ['holy'], resist: ['shadow', 'fire', 'poison'],
    intents: [{ k: 'strike', name: 'Worldbreaker', dmg: 1.5, range: 2, el: 'shadow', w: 3 }, { k: 'aoe', name: 'Abyssal Flames', shape: 'area', size: 2, range: 6, dmg: 1.0, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'summon', name: 'Open the Gate', id: 'void_imp', n: 2, w: 1 }, { k: 'aoe', name: 'Void Cleave', shape: 'cone', size: 3, dmg: 1.2, el: 'shadow', w: 2 }],
    phase2: [{ k: 'aoe', name: 'End of All Things', shape: 'burst', size: 3, dmg: 1.2, el: 'shadow', status: { st: 'vulnerable', n: 2 }, w: 2 }, { k: 'aoe', name: 'Abyssal Flames', shape: 'area', size: 2, range: 6, dmg: 1.2, el: 'fire', status: { st: 'burn', n: 3 }, w: 2 }, { k: 'strike', name: 'Oblivion', dmg: 2.2, range: 2, el: 'shadow', w: 2 }, { k: 'summon', name: 'Legion', id: 'chaos_knight', n: 1, w: 1 }],
    quote: 'Every world ends. Yours is merely the last.' }),

  // ── Summons (hero-side constructs) ──
  turret: { name: 'Arc Turret', construct: true, look: { body: 'turret', c1: '#8a6a4a', c2: '#4a3a2a', accent: '#ffb030' }, hp: 18, atk: 0, def: 4, move: 0, spd: 0, size: 1, scale: 0.9, el: 'fire', weak: [], resist: [] },
  barricade: { name: 'Iron Barricade', construct: true, look: { body: 'barricade', c1: '#7a7a80', c2: '#3a3a40' }, hp: 20, atk: 0, def: 8, move: 0, spd: 0, size: 1, scale: 0.9, el: 'neutral', weak: [], resist: [] },
};

for (const [id, m] of Object.entries(MONSTERS)) m.id = id;
