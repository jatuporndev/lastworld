# LAST WORLD

A 2.5D fantasy tactical board-game RPG: hex-grid movement, card combat with action slots and
cooldowns, six stages each ending in an MVP boss, and a persistent party that levels up across
the whole campaign. Built with Three.js; saves go to Firebase Realtime Database (or to the
browser when Firebase is not configured).

Characters, monsters, icons, card art and terrain, and all audio (music and sound effects), are generated
in code at runtime. The one set of picture files is the skill effects in `public/vfx`: pixel-art sprite
sheets that `tools/bake-vfx.mjs` draws by code from the game's own designs in `tools/vfx/effects.mjs`.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## How to play

1. **New Game** — pick 1 to 3 heroes (the first is the leader) from Knight, Mage, Archer,
   Assassin, Priest and Blacksmith.
2. **World Map** — enter the unlocked stage.
3. **Explore** — every stage has its own map shape: a river forest, a long canyon, a climb up a glacier, a dungeon of rooms and hidden passages, floating islands, a fortress ring around a lava moat. Click a hex to walk. Fog lifts as you go. Markers are monsters, mini bosses,
   treasure, resources, events, rest sites, a merchant, a shrine and the MVP boss.
4. **Battle** — each round every unit acts in Speed order. On a hero's turn:
   - click a blue hex to move (once per turn, before playing cards);
   - drag cards from your hand into the three **Action Slots** (or click them, or press 1–9),
     then pick the target on the board; a card can also be dropped straight onto its target;
   - **Execute** (E) resolves the slots in order, **End Turn** (Space) finishes the hero,
     **Undo** (Z) takes back the last planned card, right-click or Esc cancels targeting.
   - Cards cost Energy (3 per turn) and sometimes MP. Used cards go to the **Cooldown** track
     and return after the listed number of rounds.
   - Monsters show their **Intent** above their heads; area attacks are marked in red on the
     board a round ahead, so move out of them.
5. **Journal** (Tab) — spend stat points and skill points, change equipment, build decks,
   upgrade / scribe / dismantle cards, forge gear, claim quests.

Elemental synergies: Fire on a Chilled or Frozen target (**Melt**), Ice on Burning
(**Quench**), Earth on Frozen (**Shatter**), Fire on Poisoned (**Wildfire**), Wind on Burning
(**Firestorm**), Shadow on Marked (**Eclipse**), Holy on Weak/Vulnerable (**Judgment**).
Some cards also have category combos (for example Backstab after a Movement card).

## Firebase setup

Without configuration the game runs offline and saves to `localStorage`. To enable accounts
and cloud saves:

1. Create a project at <https://console.firebase.google.com>.
2. Authentication → Sign-in method → enable **Email/Password** and **Anonymous**.
3. Create a **Realtime Database** and paste `database.rules.json` into its Rules tab
   (each user can only read and write `users/{uid}`).
4. Project settings → Your apps → Web app. Put the values in a `.env` file
   (see `.env.example`) or directly in `src/net/firebase-config.js`.

### Staying inside the free plan

The game is local-first, so Firebase is only a backup and sync copy:

- Every change is saved to the browser straight away; that costs nothing.
- The cloud copy is one small document per player (about 3 KB at the start of a campaign), written in a single request.
- Uploads happen at milestones (new game, MVP boss defeated, returning to the title, leaving the tab, **Save Now**),
  at most every 3 minutes after ordinary battles and every 5 minutes otherwise — and never when nothing changed.
- There are no realtime listeners. Loading reads only the save's timestamp and downloads the full save
  just when the cloud copy is newer than the one on the device.
- The database connection is opened per request and closed again, so idle players do not hold a connection.

Saved under `users/{uid}/save`: party (class, level, EXP, stat and skill allocation, equipment,
deck, HP/MP), card collection and card levels, inventory, gold, shards, unlocked and cleared
stages, the in-progress stage run, quest and statistics progress, settings. The game autosaves
after every change and the title screen offers **Continue**.

## Code layout

| Module | File |
| --- | --- |
| Hex Engine (coordinates, pathfinding, line of sight, line/cone/area shapes) | `src/engine/hex.js` |
| Renderer (Three.js diorama board, shadows, fog, billboard sprites, particles, camera) | `src/engine/renderer.js` |
| Terrain textures (painted hex tops, layered sides, tables, water) | `src/engine/terrainArt.js` |
| Scenery props and per-stage visual themes | `src/engine/props.js` |
| Skill effects (which pictures a card plays; the sprite-sheet player) | `src/engine/vfx.js`, `src/engine/pixfx.js` |
| Sprite sheets (5 animations × 3 views × 4 frames, mirrored for 6 facings) | `src/engine/sprites.js` |
| Card Engine (draw pile, hand limit, cooldown track) | `src/game/cardEngine.js` |
| Combat Resolver (turn order, planning, damage, statuses, synergies) | `src/game/combat.js` |
| Monster AI (intents, targeting, movement) | `src/game/ai.js` |
| Stage Manager (exploration, encounters, rewards, shops, events) | `src/game/stageManager.js` |
| Character System (stats, levelling, skill trees, equipment) | `src/game/character.js` |
| Campaign state, inventory, quests | `src/game/state.js` |
| Firebase Integration | `src/net/firebase.js` |
| UI System | `src/ui/*.js`, `src/styles.css` |
| Game data (cards, classes, monsters, stages, items, events) | `src/data/*.js` |

The combat logic has no dependency on the renderer, so it can be simulated headlessly in Node
for balance work.
