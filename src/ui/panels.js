// Hero menu: Character Status, Skill Tree, Equipment & Inventory, Deck Builder, Forge, Quests, System.
import { h, fmt } from '../core/util.js';
import { t, LANG, setLang } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { G, myHeroes, touch, deckCount, usedCopies, canAddToDeck, canRemoveFromDeck, tryUpgradeCard, tryCraftCard, tryDismantle, equipItem, unequip, sellItem, useConsumable, questStatus, claimQuest, progress, addItem } from '../game/state.js';
import { computeStats, attributes, canLearn, learnSkill, canEquip, clampVitals } from '../game/character.js';
import { CLASSES, SKILL_TREES, STAT_INFO, expToNext } from '../data/classes.js';
import { CARDS, RARITY, MAX_CARD_LEVEL, upgradeCost, DECK_MIN, DECK_MAX } from '../data/cards.js';
import { CONSUMABLES, MATERIALS, RECIPES, BASES, ITEM_RARITY, makeEquipment } from '../data/items.js';
import { QUESTS } from '../data/events.js';
import { Net } from '../net/firebase.js';
import { openModal, cardEl, itemTip, heroSprite, bar, btn, icon, toast, toggleFullscreen, confirmBox, dragPiece } from './components.js';

const TABS = [['hero', 'Heroes', 'crown'], ['equip', 'Bag', 'bag'], ['deck', 'Deck', 'book'], ['forge', 'Forge', 'anvil'], ['system', 'System', 'star']];
let sel = 0; // selected hero index

export function openMenu(app, tab = 'hero') {
  const st = G.state; if (!st) return;
  sel = Math.max(0, Math.min(sel, myHeroes().length - 1));
  const body = h('div.menu-body'); const tabs = h('div.menu-tabs'); const res = h('div.menu-res');
  const root = h('div.menu', h('div.menu-side', tabs, res), body);
  const m = openModal(root, { cls: 'menu-modal', title: t("Adventurer's Journal") });
  if (tab === 'quests') tab = 'hero';
  let shown = null;
  const render = () => {
    tabs.replaceChildren(...TABS.map(([id, label, ic]) => h('button.tab' + (id === tab ? '.on' : ''), { onclick: () => { tab = id; audio.sfx('click'); render(); } }, icon(ic, '#f4e4bc', 20), h('span', t(label)))));
    res.replaceChildren(h('div.res', icon('coin', '#ffd24a', 18), fmt(st.gold), h('small', t('Gold'))), h('div.res', icon('gem', '#9ad8ff', 18), fmt(st.shards), h('small', t('Shards'))));
    // a change inside a page redraws it where it stands: lists keep their scroll and the page does not slide in again
    const scroll = shown === tab ? [...body.querySelectorAll('.scroll')].map((x) => x.scrollTop) : [];
    const page = ({ hero: heroTab, equip: equipTab, deck: deckTab, forge: forgeTab, system: systemTab })[tab](render, app, m);
    if (shown !== tab) page.classList.add('fresh');
    shown = tab; body.replaceChildren(page);
    body.querySelectorAll('.scroll').forEach((x, i) => { if (scroll[i]) x.scrollTop = scroll[i]; });
    app.refreshHud?.();
  };
  render();
  return m;
}

// The quest log: its own paper sheet, opened from the quest token.
export function openQuests(app) {
  if (!G.state) return;
  const body = h('div.quest-log');
  const render = () => { const top = body.firstChild?.scrollTop || 0; body.replaceChildren(questTab(render)); body.firstChild.scrollTop = top; app.refreshHud?.(); };
  render();
  return openModal(body, { cls: 'wide quest-modal', title: t('Quests') });
}

function heroPicker(render) {
  return h('div.hero-picker', ...myHeroes().map((hero, i) => h('div.hp-item' + (i === sel ? '.on' : ''), { onclick: () => { sel = i; audio.sfx('click'); render(); } },
    heroSprite(hero, { size: 60, zoom: 1.4, oy: 0.26 }), h('div', h('b', hero.name), h('small', `Lv ${hero.level} ${CLASSES[hero.cls].name}`)),
    hero.statPoints + hero.skillPoints > 0 ? h('i.pip', '!') : null)));
}

// ───── Heroes: status, stat points, skill tree ─────
function heroTab(render) {
  const hero = myHeroes()[sel]; const s = computeStats(hero); const a = attributes(hero); const C = CLASSES[hero.cls];
  const attrRow = (k) => h('div.attr', { 'data-tip': `${STAT_INFO[k].full} — ${STAT_INFO[k].desc}` }, h('span.attr-n', STAT_INFO[k].name), h('b', a[k]),
    h('button.plus', { disabled: hero.statPoints <= 0, onclick: () => { hero.alloc[k]++; hero.statPoints--; clampVitals(hero); touch(); audio.sfx('buff'); render(); } }, '+'));
  const d = (label, v, tip) => h('div.derived', { 'data-tip': tip }, h('span', label), h('b', v));
  const tree = SKILL_TREES[hero.cls];
  const branch = (b) => h('div.branch', ...tree.filter((n) => n.branch === b).map((n) => {
    const known = hero.skills.includes(n.id); const can = canLearn(hero, n);
    return h('div.skill' + (known ? '.known' : can ? '.can' : '.locked'), { 'data-tip': `${n.desc}${known ? '' : t(' — Cost: {n} SP', { n: n.cost || 1 })}`, onclick: () => { if (learnSkill(hero, n)) { clampVitals(hero); touch(); audio.sfx('levelup'); render(); } else if (!known) audio.sfx('error'); } },
      h('div.skill-tier', 'I'.repeat(n.tier)), h('div.skill-name', n.name), h('div.skill-desc', n.desc));
  }));
  return h('div.tab-hero', heroPicker(render),
    h('div.hero-sheet',
      h('div.hero-col.portrait', h('div.hero-stage', heroSprite(hero, { size: 220, zoom: 1.1 })), h('div.hero-name', hero.name), h('div.hero-class', `${C.name} · ${C.title}`),
        h('div.lvl', t('Level {n}', { n: hero.level })), bar('exp', hero.exp, expToNext(hero.level)), bar('hp', hero.hp, s.hp), bar('mp', hero.mp, s.mp)),
      h('div.hero-col', h('div.sec-title', t('Attributes'), h('span.points' + (hero.statPoints ? '.has' : ''), t('{n} points', { n: hero.statPoints }))), ...['str', 'agi', 'vit', 'int', 'dex'].map(attrRow),
        h('div.sec-title', t('Combat Stats')),
        h('div.derived-grid', d('ATK', s.atk, t('Physical attack power')), d('MATK', s.matk, t('Magic attack power')), d('DEF', s.def, t('Reduces damage taken')), d(t('Speed'), s.spd, t('Determines turn order')), d(t('Crit'), s.crit + '%', t('Critical hit chance')), d(t('Evasion'), s.eva + '%', t('Chance to dodge')), d(t('Move'), s.move + (s.passives.move || 0), t('Hexes per turn')), d(t('Action Slots'), s.energy, t('How many slots of cards you can play each turn')))),
      h('div.hero-col.wide', h('div.sec-title', t('Skill Tree'), h('span.points' + (hero.skillPoints ? '.has' : ''), `${hero.skillPoints} SP`)), h('div.tree', branch(0), branch(1)))));
}

// ───── Bag: equipment slots and one grid of everything carried ─────
// Each thing is a square cell holding only its icon. Point at a cell to read it; press it to pick it and
// get its actions; drag gear onto a slot to wear it, off a slot to take it off, or onto the coin to sell it.
let picked = null; // { k: 'gear' | 'slot' | 'cons' | 'mat', id }
const BAG_MIN = 48;
function equipTab(render) {
  const st = G.state; const hero = myHeroes()[sel];
  const pick = (k, id) => { picked = picked && picked.k === k && picked.id === id ? null : { k, id }; audio.sfx('click'); render(); };
  const on = (k, id) => (picked && picked.k === k && picked.id === id ? '.on' : '');
  const wear = (it) => { if (equipItem(hero, it)) { audio.sfx('place'); picked = null; render(); } else { audio.sfx('error'); toast(t('{cls} cannot equip {type}', { cls: CLASSES[hero.cls].name, type: t(it.type) }), 'bad'); } };
  const takeOff = (name) => { unequip(hero, name); audio.sfx('close'); picked = null; render(); };
  const sell = async (it) => { const n = Math.round(it.value * 0.4);
    if (!(await confirmBox(t('Sell Item'), t('Sell {name} for {n} gold? This cannot be undone.', { name: it.name, n }), t('Sell {n}g', { n })))) return;
    sellItem(it); audio.sfx('coin'); picked = null; render(); };
  const use = (id) => { const c = CONSUMABLES[id];
    if (useConsumable(id, hero)) { audio.sfx('heal'); toast(t('{hero} used {item}', { hero: hero.name, item: c.name })); if (!st.inv.cons[id]) picked = null; render(); }
    else { audio.sfx('error'); toast(t(c.use.bomb ? 'Only usable in battle' : 'Cannot use that now'), 'bad'); } };
  const ghost = (ic, color) => h('div.cell.ghost', icon(ic, color, 40));
  const gearCell = (it, extra = {}) => { const r = ITEM_RARITY[it.rarity];
    const el = h('div.cell.gear' + (canEquip(hero, it) ? '' : '.dim') + on(extra.slot ? 'slot' : 'gear', extra.slot || it.uid), { style: { '--rar': r.color }, 'data-tip-html': itemTip(it), 'data-drop': extra.slot ? 'slot:' + extra.slot : null,
      onclick: () => pick(extra.slot ? 'slot' : 'gear', extra.slot || it.uid), ondblclick: () => (extra.slot ? takeOff(extra.slot) : wear(it)) }, icon(it.icon, r.color, 40), h('i.cell-rar'));
    dragPiece(el, { ghost: () => ghost(it.icon, r.color), onDrop: (zone) => {
      if (extra.slot) { if (zone === 'bag') takeOff(extra.slot); }
      else if (zone.startsWith('slot:')) wear(it); else if (zone === 'sell') sell(it); } });
    return el; };
  const slot = (name) => { const it = hero.equip[name];
    return h('div.eq-slot', it ? gearCell(it, { slot: name }) : h('div.cell.empty.slot', { 'data-drop': 'slot:' + name }), h('div.eq-label', t(name))); };
  const items = st.inv.equip.slice().sort((a, b) => b.tier - a.tier || b.value - a.value);
  const cells = [
    ...items.map((it) => gearCell(it)),
    ...Object.entries(st.inv.cons).map(([id, n]) => { const c = CONSUMABLES[id];
      return h('div.cell' + on('cons', id), { style: { '--rar': c.color }, 'data-tip': `${c.name} — ${c.desc}`, onclick: () => pick('cons', id), ondblclick: () => use(id) }, icon(c.icon, c.color, 40), h('b.cell-n', n)); }),
    ...Object.entries(st.inv.mats).map(([id, n]) => { const c = MATERIALS[id];
      return h('div.cell' + on('mat', id), { style: { '--rar': c.color }, 'data-tip': t('{name} — a material for the Forge', { name: c.name }), onclick: () => pick('mat', id) }, icon('gem', c.color, 40), h('b.cell-n', n)); }),
  ];
  const used = cells.length;
  while (cells.length < BAG_MIN || cells.length % 8) cells.push(h('div.cell.empty'));
  // the slip under the hero: what is picked, and what can be done with it
  let detail = h('div.bag-detail.none', t('Point at an item to read it. Press it for its actions, drag it onto a slot to wear it, or onto the coin to sell it.'));
  if (picked) {
    const gear = picked.k === 'gear' ? items.find((x) => x.uid === picked.id) : picked.k === 'slot' ? hero.equip[picked.id] : null;
    if (gear) { const html = h('div.bag-tip'); html.innerHTML = itemTip(gear);
      detail = h('div.bag-detail', html, h('div.row', picked.k === 'slot' ? btn(t('Unequip'), () => takeOff(picked.id), { cls: 'small primary' }) : btn(t('Equip'), () => wear(gear), { cls: 'small primary', disabled: !canEquip(hero, gear) }),
        picked.k === 'gear' ? btn(t('Sell {n}g', { n: Math.round(gear.value * 0.4) }), () => sell(gear), { cls: 'small' }) : null)); }
    else if (picked.k === 'cons' && st.inv.cons[picked.id]) { const c = CONSUMABLES[picked.id];
      detail = h('div.bag-detail', h('div.bag-tip', h('div.tip-title', `${c.name} ×${st.inv.cons[picked.id]}`), h('div.tip-sub', c.desc)), h('div.row', btn(t('Use on {name}', { name: hero.name }), () => use(picked.id), { cls: 'small primary' }))); }
    else if (picked.k === 'mat' && st.inv.mats[picked.id]) { const c = MATERIALS[picked.id];
      detail = h('div.bag-detail', h('div.bag-tip', h('div.tip-title', `${c.name} ×${st.inv.mats[picked.id]}`), h('div.tip-sub', t('A material. The Forge turns materials into equipment.')))); }
  }
  return h('div.tab-equip', heroPicker(render),
    h('div.equip-cols',
      h('div.eq-col', h('div.sec-title', t("{name}'s Equipment", { name: hero.name })),
        h('div.bag-doll', h('div.hero-stage', heroSprite(hero, { size: 150, zoom: 1.1 })), h('div.bag-slots', slot('weapon'), slot('armor'), slot('accessory'))),
        detail),
      h('div.eq-col.grow', h('div.sec-title', t('Inventory ({n})', { n: used }),
          h('div.cell.sell', { 'data-drop': 'sell', 'data-tip': t('Drag an item here to sell it') }, icon('coin', '#b07a10', 26), h('small', t('Sell')))),
        h('div.bag-grid.scroll', { 'data-drop': 'bag' }, ...cells))));
}

// ───── Deck builder + card upgrades ─────
function deckTab(render) {
  const st = G.state; const hero = myHeroes()[sel];
  const deckIds = [...new Set(hero.deck)].sort((a, b) => CARDS[a].cost - CARDS[b].cost || a.localeCompare(b));
  const pool = Object.keys(st.cards).filter((id) => CARDS[id] && (CARDS[id].cls === 'any' || CARDS[id].cls === hero.cls)).sort((a, b) => CARDS[a].cost - CARDS[b].cost || a.localeCompare(b));
  const deckCard = (id) => { const el = cardEl(id, st.cards[id]?.lv || 0, { small: true, count: deckCount(hero, id) });
    const take = () => { if (!canRemoveFromDeck(hero)) { toast(t('A deck needs at least {n} cards', { n: DECK_MIN }), 'bad'); audio.sfx('error'); return; } hero.deck.splice(hero.deck.indexOf(id), 1); touch(); audio.sfx('close'); render(); };
    el.onclick = take;
    dragPiece(el, { ghost: () => cardEl(id, st.cards[id]?.lv || 0, { small: true }), onDrop: (zone) => { if (zone === 'pool') take(); } });
    return el; };
  const poolCard = (id) => { const c = st.cards[id]; const free = c.n - usedCopies(id); const card = CARDS[id]; const cost = upgradeCost(card, c.lv);
    const el = cardEl(id, c.lv, { small: true, count: free });
    const put = () => { if (canAddToDeck(hero, id)) { hero.deck.push(id); touch(); audio.sfx('place'); render(); } else { audio.sfx('error'); toast(hero.deck.length >= DECK_MAX ? t('Deck is full ({n})', { n: DECK_MAX }) : t('No free copies'), 'bad'); } };
    el.onclick = put;
    dragPiece(el, { ghost: () => cardEl(id, c.lv, { small: true }), onDrop: (zone) => { if (zone === 'deck') put(); } });
    if (free <= 0) el.classList.add('dim');
    return h('div.pool-item', el,
      h('div.pool-actions',
        c.lv < MAX_CARD_LEVEL ? h('button.mini.up', { 'data-tip': t('Upgrade to +{lv}: {gold} gold, {shards} shards', { lv: c.lv + 1, gold: cost.gold, shards: cost.shards }), disabled: st.gold < cost.gold || st.shards < cost.shards, onclick: () => { if (tryUpgradeCard(id)) { audio.sfx('levelup'); render(); } } }, `⬆ ${cost.gold}g ${cost.shards}◆`) : h('span.maxed', 'MAX'),
        h('button.mini', { 'data-tip': t('Dismantle one copy for {n} shards', { n: RARITY[card.rarity].shards }), disabled: free <= 0, onclick: () => { if (tryDismantle(id)) { audio.sfx('coin'); render(); } } }, `✂ +${RARITY[card.rarity].shards}◆`))); };
  return h('div.tab-deck', heroPicker(render),
    h('div.deck-cols',
      h('div.deck-col', h('div.sec-title', t("{name}'s Deck", { name: hero.name }), h('span.points' + (hero.deck.length < DECK_MIN ? '.has' : ''), t('{n} / {max} cards (min {min})', { n: hero.deck.length, max: DECK_MAX, min: DECK_MIN }))), h('div.card-grid.scroll', { 'data-drop': 'deck' }, ...deckIds.map(deckCard))),
      h('div.deck-col', h('div.sec-title', t('Collection'), h('span.points', t('Drag or click a card to move it'))), h('div.card-grid.scroll', { 'data-drop': 'pool' }, ...pool.map(poolCard)))));
}

// ───── Forge: craft equipment and cards ─────
function forgeTab(render) {
  const st = G.state; const classes = new Set(myHeroes().map((x) => x.cls));
  const recipes = RECIPES.filter((r) => r.tier <= st.unlocked + 1);
  const craftable = Object.values(CARDS).filter((c) => !c.id.startsWith('r_') && (c.cls === 'any' || classes.has(c.cls))).sort((a, b) => ['common', 'rare', 'epic', 'legendary'].indexOf(a.rarity) - ['common', 'rare', 'epic', 'legendary'].indexOf(b.rarity) || a.cls.localeCompare(b.cls));
  return h('div.tab-forge',
    h('div.deck-col', h('div.sec-title', t('Smithing'), h('span.points', t('Forge equipment from materials'))),
      h('div.item-list.scroll', ...recipes.map((r) => { const B = BASES[r.base]; const ok = st.gold >= r.gold && Object.entries(r.mats).every(([m, n]) => (st.inv.mats[m] || 0) >= n);
        return h('div.item.recipe' + (ok ? '' : '.dim'), { style: { '--rar': ITEM_RARITY[r.rarity].color } }, h('div.item-icon', icon(B.icon, ITEM_RARITY[r.rarity].color, 32)),
          h('div.item-info', h('div.item-name', `${B.names[r.tier - 1]}`), h('div.item-sub', `${ITEM_RARITY[r.rarity].name} · ${t('Tier {n}', { n: r.tier })} ${t(B.type)}`),
            h('div.recipe-cost', ...Object.entries(r.mats).map(([m, n]) => h('span' + ((st.inv.mats[m] || 0) >= n ? '' : '.lack'), `${MATERIALS[m].name} ${st.inv.mats[m] || 0}/${n}`)), h('span' + (st.gold >= r.gold ? '' : '.lack'), t('{n} gold', { n: r.gold })))),
          h('button.mini.up', { disabled: !ok, onclick: () => { Object.entries(r.mats).forEach(([m, n]) => { st.inv.mats[m] -= n; if (st.inv.mats[m] <= 0) delete st.inv.mats[m]; }); st.gold -= r.gold; const it = makeEquipment(r.base, r.tier, r.rarity); addItem(it); progress('craft', 1); audio.sfx('place'); audio.sfx('levelup'); toast(t('Forged {name}!', { name: it.name }), 'good'); render(); } }, t('Forge'))); }))),
    h('div.deck-col', h('div.sec-title', t('Card Scribing'), h('span.points', t('Spend shards to create cards'))),
      h('div.card-grid.scroll', ...craftable.map((c) => { const cost = RARITY[c.rarity].craft; const el = cardEl(c.id, 0, { small: true, count: st.cards[c.id]?.n || 0 });
        return h('div.pool-item', el, h('div.pool-actions', h('button.mini.up', { disabled: st.shards < cost, onclick: () => { if (tryCraftCard(c.id)) { progress('craft', 1); audio.sfx('draw'); audio.sfx('buff'); render(); } } }, t('Scribe {n}◆', { n: cost })))); }))));
}

// ───── Quests ─────
function questTab(render) {
  const row = (q) => { const s = questStatus(q); const r = q.reward;
    return h('div.quest' + (s.claimed ? '.claimed' : s.done ? '.done' : ''), h('div.q-type', t(q.type === 'main' ? 'MAIN' : 'SIDE')),
      h('div.q-info', h('div.q-title', q.title), h('div.q-desc', q.desc), bar('exp', s.v, q.n)),
      h('div.q-reward', r.gold ? h('span', t('{n} gold', { n: r.gold })) : null, r.shards ? h('span', t('{n} shards', { n: r.shards })) : null, r.item ? h('span', CONSUMABLES[r.item].name) : null),
      s.claimed ? h('div.q-done', t('✔ Claimed')) : btn(t('Claim'), () => { if (claimQuest(q)) { audio.sfx('coin'); audio.sfx('levelup'); render(); } }, { cls: 'small primary', disabled: !s.done })); };
  return h('div.tab-quests.scroll', h('div.sec-title', t('Campaign')), ...QUESTS.filter((q) => q.type === 'main').map(row), h('div.sec-title', t('Side Quests')), ...QUESTS.filter((q) => q.type === 'side').map(row));
}

// ───── System ─────
function systemTab(render, app, modal) {
  const st = G.state;
  const slider = (label, key) => h('label.slider', h('span', label), h('input', { type: 'range', min: 0, max: 100, value: Math.round(st.settings[key] * 100), oninput: (e) => { st.settings[key] = e.target.value / 100; audio.setVolumes(st.settings.music, st.settings.sfx); touch(); } }));
  return h('div.tab-system',
    h('div.sec-title', t('Settings')), slider(t('Music'), 'music'), slider(t('Sound Effects'), 'sfx'),
    h('div.row', h('span', t('Language')), btn('ภาษาไทย', () => setLang('th'), { cls: 'small' + (LANG === 'th' ? ' primary' : '') }), btn('English', () => setLang('en'), { cls: 'small' + (LANG === 'en' ? ' primary' : '') })),
    h('div.row', btn(t('Toggle Fullscreen'), toggleFullscreen, { iconName: 'star' }), btn(t('Save Now'), async () => { await app.saveNow(); toast(t('Game saved'), 'good'); })),
    h('div.sec-title', t('Account')), h('p.note', Net.label()),
    h('div.row', Net.online ? (Net.user ? btn(t('Sign Out'), async () => { await app.saveNow(); await Net.signOut(); toast(t('Signed out')); render(); }) : btn(t('Sign In / Register'), () => app.openAuth(() => render()))) : h('p.note', t('Cloud saves are disabled until Firebase is configured (see README). Progress is stored in this browser.'))),
    h('div.sec-title', t('Campaign')), h('p.note', t('Stages liberated: {n} / 6 · Monsters slain: {k} · Party: {party}', { n: Object.keys(st.cleared).length, k: st.stats.kills, party: myHeroes().map((x) => `${x.name} Lv${x.level}`).join(', ') })),
    h('div.row', btn(t('Return to Title'), async () => { if (await confirmBox(t('Return to Title'), t('Your progress is saved automatically.'), t('Return'))) { modal.close(); app.toTitle(); } })));
}
