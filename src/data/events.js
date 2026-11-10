// Random events encountered on '?' tiles, plus campaign quests.
// Each choice has outcome(s): {gold, healPct, dmgPct, mp, item:'consumable id', card:'random'|'rare', upgrade:true,
//   fight:true, buff:{st,n}, shards, mat:true, exp, chance:p, fail:{...}}

export const EVENTS = [
  {
    id: 'shrine', title: 'Forgotten Shrine', icon: 'sun',
    text: 'A moss-covered shrine hums with faint power. Offerings of tarnished coins lie at its feet. A voice whispers: "Give, and be given."',
    choices: [
      { label: 'Offer 40 gold', cost: { gold: 40 }, out: { buff: { st: 'strength', n: 2 }, healPct: 0.3, msg: 'Warm light fills your party. (+2 Strength next battle, heal 30%)' } },
      { label: 'Pray without offering', out: { chance: 0.5, healPct: 0.2, msg: 'A gentle warmth. (+20% HP)', fail: { dmgPct: 0.1, msg: 'The shrine rejects you. (-10% HP)' } } },
      { label: 'Leave', out: { msg: 'You move on.' } },
    ],
  },
  {
    id: 'traveler', title: 'Wounded Traveler', icon: 'cross',
    text: 'A wounded cartographer leans against a broken wagon. "Please... I have nothing but my maps, and an old card I found."',
    choices: [
      { label: 'Give a Health Potion', cost: { item: 'potion' }, out: { card: 'rare', exp: 30, msg: 'Grateful, the traveler gives you a skill card.' } },
      { label: 'Tend wounds (lose 10% HP)', out: { dmgPct: 0.1, card: 'random', msg: 'You bind the wounds. They hand you a worn card.' } },
      { label: 'Walk past', out: { msg: 'You leave the traveler behind.' } },
    ],
  },
  {
    id: 'chest', title: 'Cursed Chest', icon: 'skull',
    text: 'An iron-bound chest pulses with sickly light. Something rattles inside — treasure, or a trap?',
    choices: [
      { label: 'Force it open', out: { chance: 0.55, gold: 120, item: 'random-equip', msg: 'Riches spill out!', fail: { fight: true, msg: 'The chest was bait! Monsters ambush you!' } } },
      { label: 'Break the seal carefully', out: { dmgPct: 0.15, gold: 60, msg: 'The curse lashes out, but you claim the gold.' } },
      { label: 'Leave it', out: { msg: 'Wisdom is its own reward.' } },
    ],
  },
  {
    id: 'fountain', title: 'Moonlit Spring', icon: 'drop',
    text: 'Silver water bubbles from a cracked stone. Your reflection looks... younger.',
    choices: [
      { label: 'Drink deeply', out: { healPct: 0.5, mp: 30, msg: 'Wounds close and minds clear. (+50% HP, +30 MP)' } },
      { label: 'Fill your flasks', out: { item: 'potion', msg: 'You bottle the water. (+1 Health Potion)' } },
    ],
  },
  {
    id: 'gambler', title: 'The Masked Gambler', icon: 'coin',
    text: 'A figure in a porcelain mask shuffles a deck of glowing cards. "Double or nothing, heroes?"',
    choices: [
      { label: 'Bet 60 gold', cost: { gold: 60 }, out: { chance: 0.5, gold: 140, msg: 'Fortune smiles! (+140 gold)', fail: { msg: 'The mask grins. You lose the bet.' } } },
      { label: 'Wager a card draw', out: { chance: 0.6, card: 'rare', msg: 'You win a rare card!', fail: { dmgPct: 0.1, msg: 'The cards cut you. (-10% HP)' } } },
      { label: 'Decline', out: { msg: '"Another time, then."' } },
    ],
  },
  {
    id: 'library', title: 'Ruined Library', icon: 'book',
    text: 'Pages of an ancient tactical treatise flutter in the wind. Some diagrams describe your own techniques — improved.',
    choices: [
      { label: 'Study (upgrade a random card)', out: { upgrade: true, msg: 'Insight! One of your cards grows stronger.' } },
      { label: 'Salvage the bindings', out: { shards: 25, msg: 'You recover arcane shards. (+25 Shards)' } },
    ],
  },
  {
    id: 'ambush', title: 'Ambush!', icon: 'sword',
    text: 'Shapes move in the shadows around you. Too late to run — weapons out!',
    choices: [
      { label: 'Fight!', out: { fight: true, gold: 40, msg: 'Steel rings out!' } },
      { label: 'Throw gold and flee (50 gold)', cost: { gold: 50 }, out: { msg: 'The ambushers scramble for coins as you escape.' } },
    ],
  },
  {
    id: 'forge', title: 'Abandoned Forge', icon: 'anvil',
    text: 'A dwarven forge still glows with ancient embers. Tools hang on the walls, waiting.',
    choices: [
      { label: 'Temper weapons (+3 Strength next battle)', out: { buff: { st: 'strength', n: 3 }, msg: 'Your blades gleam.' } },
      { label: 'Search for materials', out: { mat: true, shards: 10, msg: 'You find rare materials among the slag.' } },
    ],
  },
  {
    id: 'spirit', title: 'Restless Spirit', icon: 'ghost',
    text: 'A translucent knight blocks the path. "I fell before the Sundering. Prove that the living still fight."',
    choices: [
      { label: 'Accept the duel', out: { fight: true, exp: 80, card: 'rare', msg: 'The spirit draws its blade.' } },
      { label: 'Pay respects', out: { exp: 40, msg: 'The spirit nods and fades. (+40 EXP)' } },
    ],
  },
];

export const QUESTS = [
  { id: 'q_stage1', type: 'main', title: 'Heart of Greenveil', desc: 'Defeat the Forest Guardian.', goal: { kind: 'boss', stage: 1 }, n: 1, reward: { gold: 150, shards: 30 } },
  { id: 'q_stage2', type: 'main', title: 'Tyrant of the Sands', desc: 'Defeat the Sand Tyrant.', goal: { kind: 'boss', stage: 2 }, n: 1, reward: { gold: 300, shards: 50 } },
  { id: 'q_stage3', type: 'main', title: 'The Thaw', desc: 'Defeat the Frost Queen.', goal: { kind: 'boss', stage: 3 }, n: 1, reward: { gold: 500, shards: 70 } },
  { id: 'q_stage4', type: 'main', title: 'Rest for the Dead', desc: 'Defeat the Lich King.', goal: { kind: 'boss', stage: 4 }, n: 1, reward: { gold: 800, shards: 90 } },
  { id: 'q_stage5', type: 'main', title: 'Judgment of Stars', desc: 'Defeat the Celestial Dragon.', goal: { kind: 'boss', stage: 5 }, n: 1, reward: { gold: 1200, shards: 120 } },
  { id: 'q_stage6', type: 'main', title: 'The Last World', desc: 'Defeat the Abyssal Overlord and save what remains.', goal: { kind: 'boss', stage: 6 }, n: 1, reward: { gold: 3000, shards: 300 } },
  { id: 'q_slayer1', type: 'side', title: 'Monster Hunter', desc: 'Defeat 25 monsters.', goal: { kind: 'kills' }, n: 25, reward: { gold: 120, item: 'hipotion' } },
  { id: 'q_slayer2', type: 'side', title: 'Legendary Slayer', desc: 'Defeat 120 monsters.', goal: { kind: 'kills' }, n: 120, reward: { gold: 600, shards: 100 } },
  { id: 'q_chests', type: 'side', title: 'Treasure Seeker', desc: 'Open 8 treasure caches.', goal: { kind: 'chests' }, n: 8, reward: { gold: 200, item: 'elixir' } },
  { id: 'q_mini', type: 'side', title: 'Giant Killer', desc: 'Defeat 4 mini bosses.', goal: { kind: 'mini' }, n: 4, reward: { shards: 80, gold: 250 } },
  { id: 'q_craft', type: 'side', title: 'Apprentice Smith', desc: 'Forge an item at the Forge.', goal: { kind: 'craft' }, n: 1, reward: { shards: 40 } },
  { id: 'q_upgrade', type: 'side', title: 'Honed Technique', desc: 'Upgrade cards 5 times.', goal: { kind: 'upgrade' }, n: 5, reward: { gold: 200, shards: 30 } },
  { id: 'q_level', type: 'side', title: 'Veteran', desc: 'Reach level 10 with any hero.', goal: { kind: 'level' }, n: 10, reward: { gold: 400, item: 'elixir' } },
  { id: 'q_combo', type: 'side', title: 'Elementalist', desc: 'Trigger 10 elemental combos (Melt, Quench, Wildfire...).', goal: { kind: 'combos' }, n: 10, reward: { shards: 60, item: 'ether' } },
  { id: 'q_events', type: 'side', title: 'Wanderer', desc: 'Resolve 6 random events.', goal: { kind: 'events' }, n: 6, reward: { gold: 180 } },
];
