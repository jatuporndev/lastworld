// Terrain definitions for battle boards and exploration maps.
// cost: movement cost (Infinity = impassable). blocksLos: blocks line of sight.

export const TERRAIN = {
  grass:    { name: 'Meadow', top: 0x5d8a3a, side: 0x4a3524, h: 0.35, cost: 1 },
  forest:   { name: 'Forest', top: 0x3c6b2c, side: 0x4a3524, h: 0.4, cost: 2, blocksLos: true, def: 1, prop: 'tree', desc: 'Costs 2 movement. +1 DEF. Blocks line of sight.' },
  rock:     { name: 'Boulder', top: 0x7a7468, side: 0x4d4943, h: 0.5, cost: Infinity, blocksLos: true, prop: 'rock', desc: 'Impassable. Blocks line of sight.' },
  water:    { name: 'Water', top: 0x2f6f9a, side: 0x1f3b55, h: 0.15, cost: Infinity, liquid: true, desc: 'Impassable.' },
  swamp:    { name: 'Bog', top: 0x4b5a2a, side: 0x3a3020, h: 0.25, cost: 2, onEnd: { status: 'poison', n: 2 }, desc: 'Costs 2. Ending a turn here inflicts Poison 2.' },
  bloom:    { name: 'Spirit Bloom', top: 0x7fb069, side: 0x4a3524, h: 0.36, cost: 1, onEnd: { heal: 1 }, prop: 'flower', desc: 'Ending a turn here restores 1 HP.' },
  sand:     { name: 'Sand', top: 0xd9b26f, side: 0x9c7442, h: 0.3, cost: 1 },
  dune:     { name: 'Dune', top: 0xc99a52, side: 0x9c7442, h: 0.6, cost: 2, def: 1, desc: 'Costs 2 movement. +1 DEF.' },
  cactus:   { name: 'Cactus Grove', top: 0xbf9a5a, side: 0x9c7442, h: 0.32, cost: 2, blocksLos: true, prop: 'cactus', onEnd: { dmg: 1 }, desc: 'Costs 2. Blocks LOS. Thorns deal 1 damage at turn end.' },
  quicksand:{ name: 'Quicksand', top: 0xa98349, side: 0x7c5c33, h: 0.2, cost: 3, onEnd: { status: 'root', n: 1 }, desc: 'Costs 3. Roots units that end a turn here.' },
  snow:     { name: 'Snow', top: 0xe4edf5, side: 0x8a9bb0, h: 0.35, cost: 1 },
  ice:      { name: 'Ice', top: 0xa8dcf0, side: 0x6b9cbc, h: 0.25, cost: 1, onEnd: { status: 'chill', n: 1 }, glossy: true, desc: 'Ending a turn here inflicts Chill 1.' },
  pine:     { name: 'Pine Forest', top: 0xcfdde8, side: 0x6d7d90, h: 0.4, cost: 2, blocksLos: true, def: 1, prop: 'pine', desc: 'Costs 2. +1 DEF. Blocks line of sight.' },
  mountain: { name: 'Crag', top: 0x9aa4b0, side: 0x5e6670, h: 0.6, cost: Infinity, blocksLos: true, prop: 'mountain', desc: 'Impassable. Blocks line of sight.' },
  crypt:    { name: 'Crypt Floor', top: 0x5c5566, side: 0x2c2832, h: 0.3, cost: 1 },
  grave:    { name: 'Grave', top: 0x4a4038, side: 0x2c2832, h: 0.34, cost: 1, def: 1, prop: 'grave', desc: '+1 DEF (cover).' },
  pillar:   { name: 'Pillar', top: 0x6b6474, side: 0x3e3a44, h: 0.4, cost: Infinity, blocksLos: true, prop: 'pillar', desc: 'Impassable. Blocks line of sight.' },
  cursed:   { name: 'Cursed Ground', top: 0x3f2a4f, side: 0x241a2e, h: 0.28, cost: 1, onEnd: { dmg: 1, el: 'shadow' }, emissive: 0x5a1f7a, desc: 'Ending a turn here deals 1 Shadow damage.' },
  void:     { name: 'Chasm', top: 0x07060c, side: 0x07060c, h: 0.02, cost: Infinity, chasm: true, desc: 'Impassable chasm. Does not block sight.' },
  star:     { name: 'Starstone', top: 0xc9c3e6, side: 0x6f6a9a, h: 0.35, cost: 1 },
  crystal:  { name: 'Aether Crystal', top: 0xb9a8ff, side: 0x6f6a9a, h: 0.4, cost: Infinity, blocksLos: true, prop: 'crystal', desc: 'Impassable. Blocks line of sight.' },
  holy:     { name: 'Sacred Glyph', top: 0xf5e7a8, side: 0x9a8a5a, h: 0.37, cost: 1, onEnd: { heal: 2 }, emissive: 0x6a5a10, desc: 'Ending a turn here restores 2 HP.' },
  obsidian: { name: 'Obsidian', top: 0x2b2530, side: 0x16121a, h: 0.35, cost: 1 },
  lava:     { name: 'Lava', top: 0xff5a1a, side: 0x5a1a0a, h: 0.18, cost: 2, onEnd: { dmg: 2, el: 'fire', status: 'burn', n: 1 }, emissive: 0xff3300, liquid: true, desc: 'Costs 2. Ending a turn here deals 2 Fire damage and Burn.' },
  rift:     { name: 'Abyssal Rift', top: 0x4a1066, side: 0x1a0626, h: 0.22, cost: 1, prop: 'portal', onEnd: { dmg: 1, el: 'shadow', mp: -3 }, emissive: 0x8a20c0, desc: 'Ending a turn here deals 1 Shadow damage and drains 3 MP.' },
  spire:    { name: 'Demon Spire', top: 0x3a2a3e, side: 0x1a1220, h: 0.5, cost: Infinity, blocksLos: true, prop: 'spire', desc: 'Impassable. Blocks line of sight.' },
  // ── stage-specific pieces ──
  // Greenveil Forest
  bridge:     { name: 'Wooden Bridge', top: 0x9a7444, side: 0x5a3c1e, h: 0.34, cost: 1, thin: true, under: 'water', prop: 'bridge', desc: 'A narrow crossing over the river.' },
  giant:      { name: 'Elder Tree', top: 0x35602a, side: 0x4a3524, h: 0.5, cost: Infinity, blocksLos: true, prop: 'giant', desc: 'Impassable. Blocks line of sight.' },
  ruinwall:   { name: 'Ruined Wall', top: 0x8a8678, side: 0x4a3524, h: 0.42, cost: Infinity, blocksLos: true, prop: 'ruinwall', desc: 'Impassable. Blocks line of sight.' },
  ruinfloor:  { name: 'Ancient Flagstones', top: 0x97927f, side: 0x4a3524, h: 0.4, cost: 1, def: 1, desc: 'Firm footing: +1 DEF.' },
  // Ashen Desert
  canyon:     { name: 'Canyon Wall', top: 0xb9814a, side: 0x9c7442, h: 0.95, cost: Infinity, blocksLos: true, prop: 'mesa', desc: 'Impassable. Blocks line of sight.' },
  oasis:      { name: 'Oasis Pool', top: 0x2f8f9a, side: 0x9c7442, h: 0.14, cost: Infinity, liquid: true, desc: 'Impassable.' },
  palm:       { name: 'Palm Grove', top: 0x8fa24c, side: 0x9c7442, h: 0.34, cost: 2, def: 1, blocksLos: true, prop: 'palm', desc: 'Costs 2. +1 DEF. Blocks line of sight.' },
  oasisgrass: { name: 'Oasis Bank', top: 0x86a850, side: 0x9c7442, h: 0.3, cost: 1, onEnd: { heal: 1 }, prop: 'reeds', desc: 'Ending a turn here restores 1 HP.' },
  // Frostfall Kingdom
  glacier:    { name: 'Glacier', top: 0xbfe6f8, side: 0x6b9cbc, h: 0.7, cost: Infinity, blocksLos: true, glossy: true, prop: 'glacier', desc: 'Impassable. Blocks line of sight.' },
  icebridge:  { name: 'Ice Bridge', top: 0xc8f0ff, side: 0x6b9cbc, h: 0.33, cost: 1, glossy: true, thin: true, onEnd: { status: 'chill', n: 1 }, prop: 'icebridge', desc: 'A slick span over the crevasse. Ending a turn here inflicts Chill 1.' },
  plateau:    { name: 'Snow Plateau', top: 0xf2f7fc, side: 0x8a9bb0, h: 0.85, cost: 2, def: 1, desc: 'High ground. Costs 2 to climb. +1 DEF.' },
  // Shadow Crypt
  wall:       { name: 'Crypt Wall', top: 0x25212c, side: 0x2c2832, h: 0.85, cost: Infinity, blocksLos: true, prop: 'wallcap', desc: 'Impassable. Blocks line of sight.' },
  secret:     { name: 'Hidden Passage', top: 0x403a4a, side: 0x2c2832, h: 0.3, cost: 2, blocksLos: true, prop: 'secret', desc: 'A crumbling gap in the wall. Costs 2. Blocks line of sight.' },
  tomb:       { name: 'Sarcophagus', top: 0x4b4552, side: 0x2c2832, h: 0.3, cost: Infinity, prop: 'tomb', desc: 'Impassable, but low enough to shoot over.' },
  // Celestial Ruins
  skybridge:  { name: 'Bridge of Light', top: 0xfff0b0, side: 0x9a8a5a, h: 0.34, cost: 1, thin: true, emissive: 0xffc850, prop: 'skybridge', desc: 'A span of solid starlight between the islands.' },
  dais:       { name: 'Temple Dais', top: 0xe8e0ff, side: 0x6f6a9a, h: 0.72, cost: 2, def: 1, desc: 'High ground. Costs 2 to climb. +1 DEF.' },
  // Abyssal Citadel
  lavabridge: { name: 'Obsidian Bridge', top: 0x3a3038, side: 0x16121a, h: 0.38, cost: 1, thin: true, under: 'lava', prop: 'stonebridge', desc: 'A bridge over the lava channel.' },
  ritual:     { name: 'Ritual Platform', top: 0x4a2634, side: 0x16121a, h: 0.55, cost: 1, emissive: 0xff3a20, onEnd: { status: 'strength', n: 2 }, prop: 'ritual', desc: 'Ending a turn here grants Strength.' },
  rampart:    { name: 'Fortress Rampart', top: 0x2e242c, side: 0x16121a, h: 0.9, cost: Infinity, blocksLos: true, prop: 'rampart', desc: 'Impassable. Blocks line of sight.' },
};

export const terrainOf = (id) => TERRAIN[id] || TERRAIN.grass;
