// Which story scene is due where. This small table is the only part of the story the game loads at start; the
// scenes themselves (src/story/index.js) are fetched when the first one plays. The story is docs/story.md.
const EXPLORE = { 1: '1A', 2: '2A', 3: '3A', 4: '4A', 6: '6A' }; // at the first event, shrine or rest site reached in that realm
const AFTER = { 1: '1C', 2: '2C', 3: '3C', 4: '4C', 5: '5C', 6: '6C', 11: '11C' }; // when its MVP has fallen
const ROAD = { 7: '7N', 8: '8N', 9: '9N', 10: '10N' }; // on the way into that realm: a note in the map's margin
export const STORY = {
  start: (stage) => (stage === 1 ? ['0'] : []),
  explore: (stage) => (EXPLORE[stage] ? [EXPLORE[stage]] : []),
  // before the MVP: whatever was to be met on the way and was not, then the meeting itself
  boss: (stage) => [...(stage === 11 ? ['11A'] : STORY.explore(stage)), stage + 'B'],
  after: (stage) => (AFTER[stage] ? [AFTER[stage]] : []),
  road: (stage) => (ROAD[stage] ? [ROAD[stage]] : []),
  end: ['11D'],
};
