// Translates the game's data tables in place for the active language. Imported first by main.js.
import { localize, localizeValues } from '../core/i18n.js';
import { CLASSES, SKILL_TREES, STAT_INFO, STAT_MILESTONES } from '../data/classes.js';
import { CARDS, ELEMENTS, CATEGORIES, RARITY, STATUS_INFO } from '../data/cards.js';
import { ITEM_RARITY, BASES, UNIQUES, CONSUMABLES, MATERIALS, STAT_LABEL } from '../data/items.js';
import { TERRAIN } from '../data/terrain.js';
import { MONSTERS } from '../data/monsters.js';
import { STAGES } from '../data/stages.js';
import { EVENTS, QUESTS } from '../data/events.js';
import { NODE_INFO } from '../game/stageManager.js';
import { JOBS, JOB_TREES } from '../data/jobs.js';

// Skill names (hero cards and monster attacks) are kept in English in every language, like "Fireball".
const cardNames = Object.entries(CARDS).map(([id, c]) => [id, c.name]);
const attackNames = Object.values(MONSTERS).flatMap((m) => [...(m.intents || []), ...(m.phase2 || [])]).map((it) => [it, it.name]);

[CLASSES, SKILL_TREES, STAT_INFO, STAT_MILESTONES, CARDS, ELEMENTS, CATEGORIES, RARITY, STATUS_INFO, ITEM_RARITY, BASES, UNIQUES,
  CONSUMABLES, MATERIALS, TERRAIN, MONSTERS, STAGES, EVENTS, QUESTS, NODE_INFO].forEach((tbl) => localize(tbl));
// a job keeps its English name, like a class; its title, words, branches and tree are translated
const jobNames = Object.values(JOBS).map((J) => [J, J.name]);
Object.values(CLASSES).forEach((C) => localizeValues(C.branches));
localize(JOBS); localize(JOB_TREES); Object.values(JOBS).forEach((J) => localizeValues(J.branches));
jobNames.forEach(([J, name]) => { J.name = name; });
localizeValues(STAT_LABEL);
cardNames.forEach(([id, name]) => { CARDS[id].name = name; });
attackNames.forEach(([it, name]) => { it.name = name; });
