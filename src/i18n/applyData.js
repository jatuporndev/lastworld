// Translates the game's data tables in place for the active language. Imported first by main.js.
import { localize, localizeValues } from '../core/i18n.js';
import { CLASSES, SKILL_TREES, STAT_INFO } from '../data/classes.js';
import { CARDS, ELEMENTS, CATEGORIES, RARITY, STATUS_INFO } from '../data/cards.js';
import { ITEM_RARITY, BASES, UNIQUES, CONSUMABLES, MATERIALS, STAT_LABEL } from '../data/items.js';
import { TERRAIN } from '../data/terrain.js';
import { MONSTERS } from '../data/monsters.js';
import { STAGES } from '../data/stages.js';
import { EVENTS, QUESTS } from '../data/events.js';
import { NODE_INFO } from '../game/stageManager.js';

// Skill names (hero cards and monster attacks) are kept in English in every language, like "Fireball".
const cardNames = Object.entries(CARDS).map(([id, c]) => [id, c.name]);
const attackNames = Object.values(MONSTERS).flatMap((m) => [...(m.intents || []), ...(m.phase2 || [])]).map((it) => [it, it.name]);

[CLASSES, SKILL_TREES, STAT_INFO, CARDS, ELEMENTS, CATEGORIES, RARITY, STATUS_INFO, ITEM_RARITY, BASES, UNIQUES,
  CONSUMABLES, MATERIALS, TERRAIN, MONSTERS, STAGES, EVENTS, QUESTS, NODE_INFO].forEach((tbl) => localize(tbl));
localizeValues(STAT_LABEL);
cardNames.forEach(([id, name]) => { CARDS[id].name = name; });
attackNames.forEach(([it, name]) => { it.name = name; });
