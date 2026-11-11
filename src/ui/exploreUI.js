// Exploration Scene — the stage's hex map: walk the party, reveal fog, trigger encounters,
// treasure, resources, events, rest sites, shops and the MVP boss.
import * as Hex from '../engine/hex.js';
import { h, fmt, sleep, hashStr } from '../core/util.js';
import { t } from '../core/i18n.js';
import { ELEMENTS } from '../data/cards.js';
import { audio } from '../core/audio.js';
import { G, touch, addCard, claimableQuests } from '../game/state.js';
import { computeStats } from '../game/character.js';
import { CLASSES } from '../data/classes.js';
import { MONSTERS } from '../data/monsters.js';
import { CARDS } from '../data/cards.js';
import { CONSUMABLES, MATERIALS } from '../data/items.js';
import { ui, openModal, btn, icon, toast, cardEl, itemEl, monsterSprite, heroSprite, bar, banner } from './components.js';
import { openMenu } from './panels.js';
import { Coop } from '../net/coop.js';
import { bus } from '../core/util.js';
import { lobbyModal } from './coopUI.js';

export class ExploreScene {
  constructor(app, stageId, opts = {}) {
    this.app = app; this.world = app.world; this.sm = app.sm;
    this.stage = this.sm.enter(stageId, opts);
    this.busy = false; this.followers = [];
    this.spectator = Coop.isGuest; // guests watch the host lead; they can only drop pings
    this.pings = new Map();
  }

  build() {
    const w = this.world, sm = this.sm, st = this.stage, run = sm.run;
    w.clearBoard(); w.setEnvironment(st);
    for (const c of sm.cells.values()) {
      const k = Hex.key(c.q, c.r);
      w.addTile(c.q, c.r, c.terrain, !!run.seen[k], !c.walk);
      const node = sm.activeNode(c);
      if (node) w.addMarker(k, c, node.icon, node.color, node.type === 'boss' || node.type === 'mini');
    }
    w.finishBoard();
    for (const [k, m] of w.markers) m.grp.visible = !!run.seen[k];
    // party tokens: leader + followers
    this.addPartyTokens(run.pos);
    const p = Hex.toWorld(run.pos.q, run.pos.r);
    w.focus({ x: p.x, z: p.z, size: 12.5, offY: 0, yaw: 0, minWidth: 15 }, 0);
    this.buildHud(); this.bind();
    audio.music('explore');
  }

  dispose() { this._offPing?.(); for (const p of this.pings.values()) { this.world.detach(p.anchor); this.world.clearLayer(p.layer); clearTimeout(p.timer); } this.pings.clear(); this.unbind(); this.hud?.remove(); this.world.clearLayers(); this.world.setHover(null); }

  buildHud() {
    this.hud?.remove();
    this.el = { res: h('div.x-res'), party: h('div.x-party'), hint: h('div.b-hint'), obj: h('div.x-obj') };
    this.hud = h('div.explore-hud',
      h('div.x-top', h('div.x-title', h('div.x-stage', this.stage.name), h('div.x-sub', this.stage.subtitle), this.el.obj),
        h('div.x-right', this.el.res, h('div.x-buttons',
          btn(t('Journal'), () => openMenu(this.app), { cls: 'small', iconName: 'book', tip: t('Heroes, equipment, deck, forge, quests (Tab)') }),
          this.spectator ? btn(t('Party Room'), () => lobbyModal(this.app), { cls: 'small', iconName: 'banner' }) : btn(t('World Map'), () => this.app.toWorldMap(), { cls: 'small', iconName: 'flag', tip: t('Leave — your progress in this stage is kept') })))),
      this.el.party, this.el.hint, this.world.camControls(),
      h('div.x-legend', ...[['sword', '#e05a4a', 'Monsters'], ['horns', '#ff8a2a', 'Mini Boss'], ['crown', '#ff3050', 'MVP Boss'], ['chest', '#ffd24a', 'Treasure'], ['gem', '#6fe0c0', 'Resources'], ['question', '#c9a0ff', 'Event'], ['camp', '#7fe08a', 'Rest'], ['coin', '#ffc050', 'Shop'], ['shrine', '#9ad8ff', 'Shrine']].map(([i, c, n]) => h('span', icon(i, c, 16), t(n)))));
    ui().appendChild(this.hud);
    this.refreshHud();
  }

  refreshHud() {
    if (!this.el) return;
    const st = G.state; const sm = this.sm;
    const q = claimableQuests();
    this.el.res.replaceChildren(h('div.res', icon('coin', '#ffd24a', 18), fmt(st.gold)), h('div.res', icon('gem', '#9ad8ff', 18), fmt(st.shards)), q ? h('div.res.alert', { onclick: () => openMenu(this.app, 'quests') }, t('{n} quest(s) ready', { n: q })) : null);
    this.el.party.replaceChildren(...st.party.map((hero) => { const s = computeStats(hero);
      return h('div.p-card' + (hero.hp <= 0 ? '.dead' : ''), { onclick: () => openMenu(this.app, 'hero') }, h('div.p-portrait', heroSprite(hero.cls, { size: 64, zoom: 1.5, oy: 0.3 })),
        h('div.p-body', h('div.p-name', hero.name, h('span', ` Lv ${hero.level}`), hero.statPoints + hero.skillPoints > 0 ? h('i.pip', '!') : null), bar('hp', hero.hp, s.hp), bar('mp', hero.mp, s.mp))); }));
    const left = [...sm.cells.values()].filter((c) => sm.activeNode(c));
    const boss = left.find((c) => c.node.type === 'boss');
    const bossName = MONSTERS[this.stage.boss].name;
    this.el.obj.textContent = boss ? t('Objective: find and defeat {boss}', { boss: bossName }) : t('{boss} has been defeated', { boss: bossName });
  }

  bind() {
    const cv = this.world.canvas;
    this._move = (e) => this.onMove(e); this._down = (e) => this.onDown(e);
    this._key = (e) => { if (e.key === 'Tab') { e.preventDefault(); if (!document.querySelector('.modal-wrap')) openMenu(this.app); } else if (!document.querySelector('.modal-wrap') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) this.world.rotateBy(e.key === 'ArrowLeft' ? -1 : 1); };
    this._ctx = (e) => { if (Coop.active) e.preventDefault(); };
    cv.addEventListener('pointermove', this._move); cv.addEventListener('pointerdown', this._down); window.addEventListener('keydown', this._key); cv.addEventListener('contextmenu', this._ctx);
    if (Coop.active) { this._offPing = bus.on('coop:pings', (all) => this.showPings(all)); }
  }
  unbind() { const cv = this.world.canvas; cv.removeEventListener('contextmenu', this._ctx); cv.removeEventListener('pointermove', this._move); cv.removeEventListener('pointerdown', this._down); window.removeEventListener('keydown', this._key); }

  onMove(e) {
    if (this.busy && !this.spectator) return;
    const p = this.world.pick(e.clientX, e.clientY);
    const path = p && !this.spectator ? this.sm.pathTo(p) : null;
    if (this.spectator) { const ok = p && this.sm.run.seen[Hex.key(p.q, p.r)]; this.world.setHover(ok ? p : null, parseInt(Coop.colorOf(Coop.me).slice(1), 16)); this.world.canvas.style.cursor = ok ? 'pointer' : ''; return; }
    this.world.setHover(path ? p : null, 0xffe9a0);
    this.world.setLayer('path', path || [], { color: 0xffe9a0, opacity: 0.45, y: 0.03 });
    const c = p && this.sm.run.seen[Hex.key(p.q, p.r)] ? this.sm.cell(p) : null; const node = this.sm.activeNode(c);
    this.el.hint.textContent = node ? `${node.name}${node.type === 'boss' ? ' — ' + MONSTERS[this.stage.boss].name : ''}` : ''; this.el.hint.classList.toggle('on', !!node);
    this.world.canvas.style.cursor = path ? 'pointer' : '';
  }

  async onDown(e) {
    audio.init();
    // co-op: guests (left click) and the host (right click) mark a tile — "let's go this way"
    if (Coop.active && (this.spectator ? e.button === 0 : e.button === 2)) {
      const p = this.world.pick(e.clientX, e.clientY);
      if (p && this.sm.run.seen[Hex.key(p.q, p.r)]) { Coop.ping(p.q, p.r); this.showPing(Coop.me, p); audio.sfx('click'); }
      return;
    }
    if (e.button !== 0 || this.busy || this.spectator) return;
    const p = this.world.pick(e.clientX, e.clientY); if (!p) return;
    const path = this.sm.pathTo(p); if (!path || !path.length) return;
    this.busy = true; this.world.clearLayer('path'); this.world.setHover(null);
    await this.walk(path);
    const c = this.sm.cell(this.sm.run.pos);
    if (this.sm.activeNode(c)) await this.trigger(c);
    this.busy = false;
  }

  // ── co-op pings ──
  showPings(all) {
    for (const [id, p] of Object.entries(all)) {
      if (id === Coop.me || !p || Date.now() - p.ts > 15000) continue;
      const cur = this.pings.get(id); if (cur && cur.ts === p.ts) continue;
      this.showPing(id, p);
    }
  }
  showPing(id, p) {
    const w = this.world; const old = this.pings.get(id);
    if (old) { w.detach(old.anchor); clearTimeout(old.timer); }
    const color = Coop.colorOf(id); const layer = 'ping_' + id;
    w.setLayer(layer, [{ q: p.q, r: p.r }], { color: parseInt(color.slice(1), 16), opacity: 0.55, pulse: 5, y: 0.05 });
    const el = h('div.ping-label', h('div.ping-pill', { style: { '--pc': color } }, h('i', '➤'), Coop.nameOf(id)));
    const anchor = w.attach(el, () => { const v = w.cellPos(p.q, p.r); v.y += 1.2; return v; });
    w.ring(w.cellPos(p.q, p.r), parseInt(color.slice(1), 16), 1.1, 600);
    const timer = setTimeout(() => { w.detach(anchor); w.clearLayer(layer); this.pings.delete(id); }, 7000);
    this.pings.set(id, { ts: p.ts, anchor, layer, timer });
    if (id !== Coop.me) { audio.sfx('place'); this.el && (this.el.hint.textContent = t('{name}: let\'s go this way!', { name: Coop.nameOf(id) }), this.el.hint.classList.add('on')); }
  }

  async walk(path) {
    if (Coop.isHost && !this.spectator) Coop.send({ t: 'walk', path: path.map((s) => ({ q: s.q, r: s.r })) });
    const w = this.world, run = this.sm.run; const n = G.state.party.length;
    for (const step of path) {
      const prev = [...this.trail];
      this.trail.unshift({ q: step.q, r: step.r }); this.trail.length = n;
      const moves = [];
      for (let i = 0; i < n; i++) {
        const from = prev[i], to = this.trail[i];
        if (Hex.hexEq(from, to)) continue;
        const pos = w.cellPos(to.q, to.r); if (i > 0) { pos.x += (i % 2 ? -0.25 : 0.25); pos.z -= 0.1; }
        moves.push(w.moveUnit('party' + i, [{ pos, dir: Hex.directionTo(from, to) }], { stepMs: 150 }));
      }
      const wp = Hex.toWorld(step.q, step.r); w.focus({ x: wp.x, z: wp.z }, 200);
      await Promise.all(moves);
      run.pos = { q: step.q, r: step.r };
      for (const k of this.sm.reveal()) { w.revealTile(k); w.showMarker(k); }
    }
    touch();
  }

  retreat() { // step back off a blocking node
    const run = this.sm.run; const back = this.trail[1] && !Hex.hexEq(this.trail[1], run.pos) ? this.trail[1] : Hex.neighbors(run.pos).find((n) => { const c = this.sm.cell(n); return c && c.walk && !this.sm.blocks(c); });
    if (back) return this.walk([back]);
    return Promise.resolve();
  }

  clearNode(c) { this.world.removeMarker(Hex.key(c.q, c.r)); this.refreshHud(); }

  async trigger(c) {
    const node = c.node; const sm = this.sm;
    switch (node.type) {
      case 'monster': case 'mini': case 'boss': {
        const enc = sm.encounterFor(c);
        if (Coop.isHost) Coop.send({ t: 'note', text: 'The host is deciding whether to fight {name}…', vars: { name: node.name } });
        const go = await this.encounterPrompt(enc, node);
        if (go) await this.app.startBattle(enc, c); else await this.retreat();
        break;
      }
      case 'treasure': { audio.sfx('chest'); const r = sm.openTreasure(c); this.clearNode(c); this.share('loot', { kind: 'treasure', cell: { q: c.q, r: c.r } }); await lootModal(t('Treasure Cache'), r); break; }
      case 'resource': { audio.sfx('coin'); const r = sm.gatherResource(c); this.clearNode(c); this.share('loot', { kind: 'resource', cell: { q: c.q, r: c.r } }); await lootModal(t('Resources Gathered'), r); break; }
      case 'rest': await this.restPrompt(c); break;
      case 'shop': this.share('note', { text: 'The host is browsing the merchant.' }); await this.shop(c); break;
      case 'event': case 'shrine': await this.event(c); break;
      default: break;
    }
    this.refreshHud();
  }

  // Co-op: the party changed (someone joined / left) — redraw the tokens without rebuilding the map.
  rebuildParty() {
    const w = this.world; const run = this.sm.run;
    for (const k of [...w.units.keys()]) if (k.startsWith('party')) w.removeUnit(k);
    this.addPartyTokens(run.pos);
    this.refreshHud();
  }
  addPartyTokens(pos) {
    const w = this.world; const party = G.state.party;
    this.trail = party.map(() => ({ ...pos }));
    party.slice().reverse().forEach((hero, ri) => {
      const i = party.length - 1 - ri;
      w.addUnit({ uid: 'party' + i, spriteKey: 'cls_' + hero.cls, look: CLASSES[hero.cls].look, scale: i === 0 ? 1 : 0.85, facing: 5 }, [pos]);
      if (i > 0) { const U = w.units.get('party' + i); U.group.position.x -= 0.35 * i; U.group.position.z -= 0.18 * i; }
    });
  }
  share(type, data) { if (Coop.isHost) Coop.send({ t: type, ...data }); }
  // Guests: read-only view of an event the host resolved.
  eventView(m) {
    if (m.cell) this.clearNode(this.sm.cell(m.cell));
    openModal(h('div.event', h('div.big-icon', icon(m.icon, '#e8d8a8', 72)), h('p.event-text', m.text), h('p.event-text', h('b', m.choice)), h('p.event-text', m.msg), h('div.gains', ...(m.gains || []).map((g) => h('div.gain', g)))),
      { title: m.title, cls: 'narrow event-modal coop-view' });
  }

  encounterPrompt(enc, node) {
    return new Promise((res) => {
      const boss = enc.kind === 'boss';
      if (boss) audio.sfx('boss');
      const counts = {}; enc.enemies.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
      const m = openModal(h('div.enc',
        h('div.enc-row', ...Object.entries(counts).map(([id, n]) => { const d = MONSTERS[id];
          return h('div.enc-mon' + (d.rank !== 'normal' ? '.big' : ''), monsterSprite(id, { size: d.rank === 'mvp' ? 200 : d.rank === 'mini' ? 150 : 110, anim: 'idle' }), h('div.enc-name', d.name, n > 1 ? ` ×${n}` : ''), h('div.enc-sub', `Lv ${d.level}${d.weak.length ? ' · ' + t('Weak: ') + d.weak.map((e) => ELEMENTS[e].name).join(', ') : ''}`)); })),
        boss ? h('p.enc-quote', `“${MONSTERS[enc.enemies[0]].quote}”`) : null,
        h('div.row.center', btn(t('Retreat'), () => { m.close(); res(false); }), btn(t(boss ? 'Challenge the MVP' : 'Fight'), () => { m.close(); res(true); }, { cls: 'primary' }))),
      { title: boss ? t('MVP Boss') : node.name, closable: false, cls: boss ? 'boss-modal' : '' });
    });
  }

  restPrompt(c) {
    return new Promise((res) => {
      const m = openModal(h('div.confirm', h('div.big-icon', icon('camp', '#7fe08a', 72)), h('p', t('A sheltered campsite. The fire is still warm. Resting restores 60% HP and MP to the whole party and revives the fallen. The site can be used once.')),
        h('div.row.center', btn(t('Not now'), () => { m.close(); res(); }), btn(t('Rest'), () => { this.sm.rest(c); this.share('rest', { cell: { q: c.q, r: c.r } }); audio.sfx('heal'); this.clearNode(c); toast(t('The party is rested'), 'good'); m.close(); res(); }, { cls: 'primary' }))), { title: t('Rest Site'), closable: false, cls: 'narrow' });
    });
  }

  shop(c) {
    return new Promise((res) => {
      const body = h('div.shop'); const st = G.state;
      const render = () => {
        const stock = this.sm.shopStock(c);
        const row = (e) => {
          const buy = h('button.mini.up', { disabled: e.sold || st.gold < e.price, onclick: () => { if (this.sm.buy(c, e)) { audio.sfx('coin'); render(); this.refreshHud(); } } }, e.sold ? t('Sold') : t('{n} g', { n: e.price }));
          if (e.kind === 'equip') { const el = itemEl(e.item); el.appendChild(buy); return el; }
          if (e.kind === 'cons') { const k = CONSUMABLES[e.id]; return h('div.item', { style: { '--rar': k.color } }, h('div.item-icon', icon(k.icon, k.color, 30)), h('div.item-info', h('div.item-name', k.name), h('div.item-sub', k.desc)), h('div.item-tag', `×${st.inv.cons[e.id] || 0}`), buy); }
          return h('div.pool-item', cardEl(e.id, 0, { small: true }), h('div.pool-actions', buy));
        };
        body.replaceChildren(h('div.shop-gold', icon('coin', '#ffd24a', 20), t('{n} gold', { n: fmt(st.gold) })),
          h('div.shop-cols', h('div', h('div.sec-title', t('Equipment')), h('div.item-list', ...stock.filter((e) => e.kind === 'equip').map(row)), h('div.sec-title', t('Supplies')), h('div.item-list', ...stock.filter((e) => e.kind === 'cons').map(row))),
            h('div', h('div.sec-title', t('Skill Cards')), h('div.card-grid', ...stock.filter((e) => e.kind === 'card').map(row)), h('p.note', t('Sell unwanted gear from the Journal → Equipment tab.')))));
      };
      render();
      openModal(body, { title: t('Wandering Merchant'), cls: 'wide', onClose: res });
    });
  }

  event(c) {
    return new Promise((res) => {
      const ev = this.sm.eventFor(c); const body = h('div.event');
      const m = openModal(body, { title: ev.title, closable: false, cls: 'narrow event-modal' });
      body.replaceChildren(h('div.big-icon', icon(ev.icon, '#e8d8a8', 72)), h('p.event-text', ev.text),
        h('div.choices', ...ev.choices.map((ch) => btn(ch.label, async () => {
          const out = this.sm.resolveChoice(c, ch);
          this.share('event', { title: ev.title, icon: ev.icon, text: ev.text, choice: ch.label, msg: out.msg, gains: out.gains, out: out.party, cell: out.fight ? null : { q: c.q, r: c.r } });
          audio.sfx(out.fight ? 'boss' : out.gains.length ? 'chest' : 'click');
          body.replaceChildren(h('div.big-icon', icon(ev.icon, '#e8d8a8', 72)), h('p.event-text', out.msg), h('div.gains', ...out.gains.map((g) => h('div.gain', g))),
            h('div.row.center', btn(t(out.fight ? 'To battle!' : 'Continue'), async () => { m.close(); if (out.fight) await this.app.startBattle(this.sm.ambush(), c); else this.clearNode(c); res(); }, { cls: 'primary' })));
          this.refreshHud();
        }, { disabled: !this.sm.canChoose(ch), cls: 'choice' }))));
    });
  }
}

// ───── loot / rewards ─────
function lootRows(r) {
  const rows = [];
  if (r.exp) rows.push(h('div.loot', icon('star', '#ffe080', 22), t('{n} EXP to each hero', { n: fmt(r.exp) })));
  if (r.gold) rows.push(h('div.loot', icon('coin', '#ffd24a', 22), t('{n} Gold', { n: fmt(r.gold) })));
  if (r.shards) rows.push(h('div.loot', icon('gem', '#9ad8ff', 22), t('{n} Arcane Shards', { n: r.shards })));
  Object.entries(r.mats || {}).forEach(([m, n]) => rows.push(h('div.loot', h('i.matdot', { style: { background: MATERIALS[m].color } }), `${n}× ${MATERIALS[m].name}`)));
  (r.cons || []).forEach((id) => rows.push(h('div.loot', icon('potion', CONSUMABLES[id].color, 22), CONSUMABLES[id].name)));
  return rows;
}

export function lootModal(title, r, { view = false } = {}) {
  if (view) title = t(title);
  return new Promise((res) => {
    const m = openModal(h('div.rewards', h('div.loot-list', ...lootRows(r)), (r.items || []).length ? h('div.item-list', ...r.items.map((it) => itemEl(it))) : null,
      (r.cards || []).length ? h('div.card-grid.center', ...r.cards.map((id) => cardEl(id, 0, { small: true }))) : null,
      h('div.row.center', btn(t(view ? 'OK' : 'Take'), () => { m.close(); res(); }, { cls: 'primary' }))), { title, closable: view, cls: 'narrow' + (view ? ' coop-view' : ''), onClose: res });
  });
}

export function rewardsModal(r, kind, { view = false } = {}) {
  return new Promise((res) => {
    const body = h('div.rewards');
    const m = openModal(body, { title: t(kind === 'boss' ? 'MVP Defeated!' : 'Spoils of Battle'), closable: view, cls: 'rewards-modal' + (view ? ' coop-view' : ''), onClose: res });
    r.items = r.items || []; r.fixedCards = r.fixedCards || []; r.levelUps = r.levelUps || [];
    r.levelUps.forEach((l, i) => setTimeout(() => audio.sfx('levelup'), 400 + i * 300));
    const finish = () => { m.close(); res(); };
    const choices = r.cardChoices ? h('div.card-pick', h('div.sec-title', t('Choose a card reward')), h('div.card-grid.center', ...r.cardChoices.map((id) => { const el = cardEl(id, G.state.cards[id]?.lv || 0); el.classList.add('pickable'); el.onclick = () => { addCard(id); audio.sfx('draw'); audio.sfx('buff'); toast(t('{name} added to your collection', { name: CARDS[id].name }), 'good'); finish(); }; return el; })),
      h('div.row.center', btn(t('Skip (+8 shards)'), () => { G.state.shards += 8; touch(); finish(); }, { cls: 'small' }))) : h('div.row.center', btn(t('Continue'), finish, { cls: 'primary' }));
    body.replaceChildren(
      h('div.loot-list', ...lootRows(r)),
      r.levelUps.length ? h('div.levelups', ...r.levelUps.map((l) => h('div.levelup', heroSprite(l.hero.cls, { size: 72, zoom: 1.3, oy: 0.15, anim: 'cast' }), h('div', h('b', t('{name} reached Level {lv}!', { name: l.hero.name, lv: l.hero.level })), h('small', t('+{n} stat points', { n: l.levels * 3 }) + (l.hero.skillPoints ? t(' · skill points available') : '')))))) : null,
      r.items.length ? h('div.item-list', ...r.items.map((it) => itemEl(it, { tag: it.unique ? t('UNIQUE') : null }))) : null,
      r.fixedCards.length ? h('div.card-grid.center', ...r.fixedCards.map((id) => { const el = cardEl(id, 0); el.classList.add('reward-glow'); return el; })) : null,
      choices);
  });
}

export async function stageIntro(stage) {
  await new Promise((res) => {
    const m = openModal(h('div.intro', h('div.intro-boss', monsterSprite(stage.boss, { size: 220 })), h('div.intro-text', h('div.intro-sub', t('Stage {n} · {sub}', { n: stage.id, sub: stage.subtitle })), h('p', stage.intro), h('p.note', t('MVP Boss: {name}', { name: MONSTERS[stage.boss].name })), h('div.row', btn(t('Begin'), () => { m.close(); res(); }, { cls: 'primary' })))), { title: stage.name, closable: false, cls: 'wide intro-modal' });
  });
}

export { banner, sleep };
