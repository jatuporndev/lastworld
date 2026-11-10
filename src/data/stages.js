// Stage definitions. Every stage has its own hand-designed exploration map and battle boards:
// different silhouettes, sizes, chokepoints, elevation and boss arena.
//
// Exploration legend (odd-r offset rows; a space is "no tile"):
//   S start  . path  M monsters  m mini boss  B MVP boss  T treasure  R resource  ? event  H rest  $ shop  * shrine
//   # stage scenery   other characters: see the stage's `legend` (scenery) and `walk` (walkable special terrain)
// Battle board legend: ' ' no tile  . base terrain  h hero start  e enemy start  B large-monster anchor
//   other characters: see the stage's `tiles`

export const STAGES = [
  {
    id: 1, name: 'Greenveil Forest', subtitle: 'The Whispering Canopy', boss: 'forest_guardian', mini: ['bramble_ogre'],
    pool: ['moss_slime', 'thornwolf', 'sporecap', 'briar_sprite'],
    biome: { base: 'grass', scatter: [['forest', 0.07], ['bloom', 0.03], ['swamp', 0.025]], scenery: ['forest', 'forest', 'forest', 'rock'] },
    sky: 0x9fd6c0, fog: 0x7fb89a, light: 0xfff2d0, ambient: 'leaves', mats: ['heartwood', 'spiritmoss'],
    rewardCard: 'r_verdant', rewardUnique: 'guardian_heart', mapPos: [0.2, 0.68],
    intro: 'The Sundering shattered the old world into drifting realms. Greenveil, the last living forest, now strangles every traveler in its thorns. Follow the river past the fallen shrine — its ancient Guardian has gone mad with grief.',
    // An irregular forest blob split by a winding river with two bridges; the Guardian waits in the ruins to the east.
    legend: { '~': 'water', g: 'giant', r: 'ruinwall' }, walk: { '=': 'bridge', ':': 'ruinfloor' },
    layout: [
      '     ########          ',
      '   ###S..M.#~~g###     ',
      '  ##g.##...~~.T.?###   ',
      '  #M..#..?.==..##.H##  ',
      ' ##.#T#.##.~~.M.#$#rr# ',
      ' #..g..R...~~g#...:::r#',
      '##.##.##.#~~#.m.#.:B:r ',
      ' #H.M#...~~g##.#*#:::r#',
      ' ##.##.?.==...T.#.rr#  ',
      '  ##.....~~#.M...###   ',
      '    ####~~~######      ',
    ],
    tiles: { '~': 'water', '=': 'bridge', f: 'forest', g: 'giant', r: 'ruinwall', ':': 'ruinfloor', o: 'rock', b: 'bloom', s: 'swamp' },
    boards: {
      skirmish: [
        [ // River Crossing — two bridges are the only way over
          '    ..f..~~.f..    ',
          '  h..f...~~....e   ',
          ' h...o...==..f...e ',
          '  ..f.b..==......  ',
          ' h.....~~~....B.e  ',
          '  .f...==....f..e  ',
          '   ..s.~~..b...e   ',
          '     ..~~.f..      ',
        ],
        [ // Fallen Shrine — broken walls around an elder tree
          '      ......       ',
          '   ..f..r:r..f..   ',
          '  h...r:::::r...e  ',
          ' h..f.::.g.::.f..e ',
          '  h...r:::::...B.  ',
          '   ..f..r:r......e ',
          '     ...b...f..e   ',
          '       .....  e    ',
        ],
      ],
      boss: [ // Guardian's Grove — a clearing ringed by elder trees, reached over the river from the south
        '     gg.gg.gg      ',
        '   g..........g    ',
        '  g....b..b....g   ',
        '  ......B.......   ',
        '  g............g   ',
        '   ~~~f....f~~~    ',
        '    ~~~~==~~~~     ',
        '     f.h.h.hf      ',
      ],
    },
  },
  {
    id: 2, name: 'Ashen Desert', subtitle: 'Sea of Burning Glass', boss: 'sand_tyrant', mini: ['raider_chief'],
    pool: ['dune_scorpion', 'sand_wraith', 'cactoid', 'sun_cultist'],
    biome: { base: 'sand', scatter: [['dune', 0.06], ['cactus', 0.04], ['quicksand', 0.02]], scenery: ['dune', 'rock', 'cactus', 'dune'] },
    sky: 0xf0c080, fog: 0xd8a060, light: 0xffe0b0, ambient: 'sand', mats: ['sunstone', 'chitin'],
    rewardCard: 'r_sandstorm', rewardUnique: 'tyrant_fang', mapPos: [0.42, 0.78],
    intro: 'Beyond the forest lies a desert of ash and fused glass, the scar of a war between gods. A single canyon winds east past a lonely oasis. At its dead end, beneath the dunes, stirs the Sand Tyrant.',
    // A long, lopsided canyon running west to east, widening around an oasis, ending in the Tyrant's pit.
    legend: { c: 'canyon', d: 'dune', o: 'oasis', p: 'palm' }, walk: { a: 'oasisgrass' },
    layout: [
      'cccc                           ',
      'cS.ccccc     cccccc            ',
      'c..M.dddccccc.T..cccccc        ',
      ' cc.dd.?..M...cc.M..pa.ccccc   ',
      '  c.T.dd.cc.R..c$.aooa.?..cccc ',
      '  ccc.M...ccc.m...pHap..cc.M.cc',
      '    cccc.?.c ccc............Bc ',
      '       ccccc   cccc*.T.ccc...cc',
      '                  cccccc ccccc ',
    ],
    tiles: { d: 'dune', c: 'canyon', k: 'cactus', q: 'quicksand', o: 'oasis', p: 'palm', a: 'oasisgrass', x: 'rock' },
    boards: {
      skirmish: [
        [ // Canyon Run — a long, narrow gorge
          'ccccc.....ccccc.....cc ',
          'h...cc.d....c..d..k..e ',
          'h.d.....cc.....cc...e. ',
          'h..k.cc..d..q..c..d..e ',
          'cc.....ccc.d.....cc.Be ',
          '  ccc....cccc..k..ccc  ',
        ],
        [ // The Oasis — healing banks and palm cover around the pool
          '        ..d..        ',
          '   h..d....k...      ',
          '  h...paoap..d..e    ',
          ' h..d.aooooa....e.   ',
          '   ...paoap.k..B..e  ',
          '     d..a.....d..e   ',
          '       ..q..d...     ',
        ],
      ],
      boss: [ // Tyrant's Pit — a sand bowl ringed by dunes, quicksand around the lair
        '   ccc.ddd.ccc     ',
        '  c..d.....d..cc   ',
        ' h..d...q....d..c  ',
        'h...d.q...B...d..  ',
        ' h..d...q....d..c  ',
        '  c..d.....d..cc   ',
        '   ccc.ddd.ccc     ',
      ],
    },
  },
  {
    id: 3, name: 'Frostfall Kingdom', subtitle: 'The Kingdom That Never Thaws', boss: 'frost_queen', mini: ['rime_behemoth'],
    pool: ['frost_wolf', 'ice_golem', 'snow_wisp', 'frozen_knight'],
    biome: { base: 'snow', scatter: [['pine', 0.06], ['ice', 0.05]], scenery: ['pine', 'mountain', 'pine', 'glacier'] },
    sky: 0xc8e0f8, fog: 0xb0c8e0, light: 0xe8f4ff, ambient: 'snow', mats: ['frostcrystal', 'rimesilk'],
    rewardCard: 'r_glacial', rewardUnique: 'queen_tiara', mapPos: [0.58, 0.32],
    intro: 'Once a proud northern kingdom, Frostfall was frozen in a single night when its Queen sought eternity. Cross the frozen lake and climb the ice bridge: her palace crowns the glacier.',
    // A tall map climbed from south to north: foothills, a frozen lake, a crevasse with an ice bridge, the palace plateau.
    legend: { i: 'glacier', v: 'void' }, walk: { '=': 'icebridge', l: 'ice', ':': 'plateau' },
    layout: [
      '    iiiiiii    ',
      '   ii:B:::ii   ',
      '   i:::::::i   ',
      '   ii::m::ii   ',
      '    iiv=vii    ',
      '  ###vv=vv###  ',
      ' ##.T.v=v.?.## ',
      ' #.M.lllll.M.# ',
      '##.##.lHl.##.$#',
      '#..R#..l..#T..#',
      ' #.#i.M.M.i#.# ',
      ' #?..ii.ii..*# ',
      '  ##.M...M.##  ',
      '   ###.S.###   ',
      '     #####     ',
    ],
    tiles: { l: 'ice', i: 'glacier', '=': 'icebridge', P: 'plateau', v: 'void', y: 'pine', k: 'mountain' },
    boards: {
      skirmish: [
        [ // Frozen Lake — open ice chills anyone who lingers
          '    ..y...y..      ',
          '  h..lllllll..e    ',
          ' h..lllllllll..e   ',
          '  ..lllli.llllB..  ',
          ' h..lllllllll...e  ',
          '  ..y.lllll.y..e   ',
          '    .........      ',
        ],
        [ // Glacier Bridges — a crevasse crossed by two ice bridges, with snow plateaus to hold
          '  ..y.vv..PP..     ',
          ' h....==.PPP..e    ',
          'h..PP.==......e    ',
          ' h.PP.vv..y.B..e   ',
          '  ....==.......e   ',
          '   .y.vv...y..     ',
        ],
      ],
      boss: [ // Throne of Winter — the Queen holds the raised dais beyond the frozen forecourt
        '    iiPPPPPii     ',
        '   i.PPPBPPP.i    ',
        '   i..PPPPP..i    ',
        '    ...lll...     ',
        '   y..lllll..y    ',
        '    ..lllll..     ',
        '   ....lll....    ',
        '    y.......y     ',
        '     h.h.h.h      ',
      ],
    },
  },
  {
    id: 4, name: 'Shadow Crypt', subtitle: 'Halls of the Unquiet Dead', boss: 'lich_king', mini: ['bone_colossus'],
    pool: ['skeleton', 'crypt_bat', 'ghoul', 'wailing_spirit'],
    biome: { base: 'crypt', scatter: [['grave', 0.05], ['cursed', 0.03]], scenery: ['wall'] },
    sky: 0x2a2038, fog: 0x1a1426, light: 0xb0a0d8, ambient: 'souls', mats: ['bonedust', 'soulshard'], dark: true,
    rewardCard: 'r_soulharvest', rewardUnique: 'lich_phylactery', mapPos: [0.78, 0.55],
    intro: 'Beneath the ruined cathedral of Velmora lies a maze of tomb chambers and narrow corridors. Some walls are thinner than they look. In the deepest vault the Lich King Morvath raises an army from the dead of the Sundering.',
    // A dungeon: separate chambers joined by one-tile corridors and crumbling hidden passages; the throne vault is the deepest room.
    legend: { w: 'wall', t: 'tomb' }, walk: { '%': 'secret' },
    layout: [
      'wwwwwww   wwwwwwww     ',
      'wS....wwwww.t.T.tw     ',
      'w..M...........M.w     ',
      'w.....wwwww.t...tw     ',
      'www.www   www%wwww     ',
      '  w.w  wwwww.wwwwwwwww ',
      '  w.wwww?..w.w..R..t.w ',
      '  w......M.w...M...*.w ',
      '  w.wwww...w.w.t...t.w ',
      'www.w  wwwww.wwww.wwww ',
      'w.T.www    w.w  w.w    ',
      'wH...%.M...$.wwww.wwww ',
      'w.?.www wwwwww.m.....Bw',
      'wwwww        w...t.t..w',
      '             wwwwwwwwww',
    ],
    tiles: { w: 'wall', '%': 'secret', t: 'tomb', g: 'grave', c: 'cursed', p: 'pillar', v: 'void' },
    boards: {
      skirmish: [
        [ // Tomb Chambers — two rooms, one corridor, and a hidden way round
          'wwwwwwwwwwwwwwwww',
          'wh..g.w.t.....eww',
          'wh....w......e.w ',
          'wh.........B...w ',
          'w...p.....p...ew ',
          'wwww%wwwwww..eww ',
          '   w.........w   ',
          '   wwwwwwwwwww   ',
        ],
        [ // Ossuary Crossroads — four corridors meeting at a cursed junction
          '      wwwww      ',
          '      w.e.w      ',
          'wwwwwww.g.wwwwwww',
          'wh...p..c......ew',
          'wh.g....B....g.ew',
          'wh......c..p...ew',
          'wwwwwww.g.wwwwwww',
          '      w.e.w      ',
          '      wwwww      ',
        ],
      ],
      boss: [ // The Lich's Vault — a long pillared hall with the throne at the far end
        '   wwwwwwwwwwwwww  ',
        'wwww..p..c..p...ww ',
        'wh......c.....t..w ',
        'wh..........B....w ',
        'wh......c.....t..w ',
        'wwww..p..c..p...ww ',
        '   wwwwwwwwwwwwww  ',
      ],
    },
  },
  {
    id: 5, name: 'Celestial Ruins', subtitle: 'Where Stars Fell', boss: 'celestial_dragon', mini: ['aether_hydra'],
    pool: ['star_sentinel', 'seraph_wisp', 'astral_lynx', 'rune_guardian'],
    biome: { base: 'star', scatter: [['holy', 0.04]], scenery: ['crystal', 'pillar', 'crystal'] },
    sky: 0x2a2a6a, fog: 0x4a4a8a, light: 0xe0e0ff, ambient: 'stars', mats: ['starfragment', 'aetherfeather'], dark: true,
    rewardCard: 'r_starfall', rewardUnique: 'dragon_scale', mapPos: [0.82, 0.2],
    intro: 'Islands of starstone drift above the clouds — the remains of the sky-temple, joined only by bridges of light. On the highest island the Celestial Dragon judges all who seek the path to the Abyss.',
    // Seven separate floating islands joined by bridges of light; the temple island floats highest, at the top.
    legend: {}, walk: { '=': 'skybridge' },
    layout: [
      '        ##B##        ',
      '       #.....#       ',
      '        #.m.#        ',
      '          =          ',
      '  ####    =    ####  ',
      ' #.T.#  ##.##  #.?.# ',
      ' #.M.====.*.====.M.# ',
      ' ##.##  #.H.#  ##.## ',
      '   =     #=#     =   ',
      '   =      =      =   ',
      ' #.R.#  ##M##  #.$.# ',
      ' #?.M====.S.====M.T# ',
      '  ###   #####   ###  ',
    ],
    tiles: { '=': 'skybridge', y: 'crystal', p: 'pillar', o: 'holy', D: 'dais' },
    boards: {
      skirmish: [
        [ // Twin Isles — two islands and a shrine islet, linked by light
          '  ....       ....  ',
          ' h..y..     ..y..e ',
          'h.....==.o.==....e ',
          ' h..o.==...==..B.. ',
          '  ....  .y.  ....e ',
          '   ..       .e     ',
        ],
        [ // The Shattered Stair — three platforms stepping across the sky
          ' ....                ',
          'h..y.===.....        ',
          'h....===..o..===..e  ',
          ' h..    ......===..e ',
          '        ..p.  y.B..e ',
          '               ....e ',
        ],
      ],
      boss: [ // Sky Temple — the dragon's island, reached by three bridges from small landing isles
        '        ..p...p..    ',
        '  ..   ...........   ',
        ' h..==....DDD....    ',
        '  ..   ..DDBDD....   ',
        '        ..DDD....    ',
        '  ..   ...........   ',
        ' h..====..p...p..    ',
        '  ..      ==         ',
        '         .h.         ',
      ],
    },
  },
  {
    id: 6, name: 'Abyssal Citadel', subtitle: 'The Last Gate', boss: 'abyssal_overlord', mini: ['demon_warden'],
    pool: ['void_imp', 'abyss_hound', 'chaos_knight', 'void_horror'],
    biome: { base: 'obsidian', scatter: [['rift', 0.03]], scenery: ['rampart', 'spire', 'rampart'] },
    sky: 0x3a0a12, fog: 0x2a0610, light: 0xffb0a0, ambient: 'embers', mats: ['voidichor', 'abyssiron'], dark: true,
    rewardCard: 'r_rift', rewardUnique: 'overlord_crown', mapPos: [0.5, 0.12],
    intro: 'At the edge of everything stands the Abyssal Citadel, a fortress ring around a moat of lava. Xal\'Zhul waits at its heart, devouring the drifting realms one by one. Only the Last World remains. End this.',
    // A fortress ring: an outer wall-walk circles a lava moat; two bridges lead into the central arena where the Overlord stands.
    legend: { w: 'rampart', x: 'lava', s: 'spire' }, walk: { '=': 'lavabridge', o: 'ritual' },
    layout: [
      '    wwwwwwwwwww    ',
      '  www.M..T..M.www  ',
      ' ww.Mxxxxxxxxx.Mww ',
      ' w.?xx..s.s..xx?.w ',
      'ww.xx...o.o...xx.ww',
      'wS.==m...B.....x.$w',
      'ww.xx...o.o...xx.ww',
      ' w.Rxx..s.s..xx*.w ',
      ' ww..xxxx=xxxx..ww ',
      '  www.M..H..T.www  ',
      '    wwwwwwwwwww    ',
    ],
    tiles: { x: 'lava', '=': 'lavabridge', r: 'rift', R: 'ritual', s: 'spire', w: 'rampart' },
    boards: {
      skirmish: [
        [ // Lava Channels — a molten river with two obsidian bridges
          '  ww...xx...ww     ',
          ' h...s.xx.r...e    ',
          'h.....==......e    ',
          ' h..r.xx..s..B.e   ',
          '  ....xx.......e   ',
          '  ww..==...r.ww    ',
          '    ...xx...       ',
        ],
        [ // Ritual Court — four empowering platforms around a lava sigil
          '   wwww...wwww     ',
          '  w..R.....R..w    ',
          ' h....xx.xx....e   ',
          'h...s.x.r.x.s...e  ',
          ' h....xx.xx...B.e  ',
          '  w..R.....R....e  ',
          '   wwww...wwww     ',
        ],
      ],
      boss: [ // The Overlord's Arena — an island in the moat, four bridges, ritual platforms at the corners
        '     wwxxxxxww      ',
        '    xx.R...R.xx     ',
        '  ..x.........x..   ',
        ' h.==....r.....==.  ',
        'h..x.....B.....x..  ',
        ' h.==....r.....==.  ',
        '  ..x.........x..   ',
        '    xx.R...R.xx     ',
        '     wwxxxxxww      ',
      ],
    },
  },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));

// Convert offset rows into axial cells. Spaces are holes in the board.
export function parseLayout(layout) {
  const cells = [];
  layout.forEach((row, r) => {
    [...row].forEach((ch, col) => {
      if (ch === ' ') return;
      const q = col - (r - (r & 1)) / 2;
      cells.push({ q, r, ch, col, row: r });
    });
  });
  return cells;
}

const NODE_CHARS = 'SMmBTR?H$*.';
// Terrain + walkability of one exploration cell.
export function exploreCell(stage, ch, hash) {
  if (NODE_CHARS.includes(ch)) return { walk: true, terrain: stage.biome.base };
  if (stage.walk[ch]) return { walk: true, terrain: stage.walk[ch] };
  if (stage.legend[ch]) return { walk: false, terrain: stage.legend[ch] };
  return { walk: false, terrain: stage.biome.scenery[hash % stage.biome.scenery.length] };
}
