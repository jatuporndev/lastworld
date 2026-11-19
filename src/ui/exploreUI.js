// Exploration Scene — the stage's hex map: walk the party, reveal fog, trigger encounters,
// treasure, resources, events, rest sites, shops and the MVP boss.
import * as Hex from '../engine/hex.js';
import { h, fmt, sleep, hashStr } from '../core/util.js';
import { t } from '../core/i18n.js';
import { ELEMENTS } from '../data/cards.js';
import { audio } from '../core/audio.js';
import { G, touch, addCard, claimableQuests, myHeroes } from '../game/state.js';
import { computeStats, jobReady } from '../game/character.js';
import { CLASSES, heroLook } from '../data/classes.js';
import { MONSTERS } from '../data/monsters.js';
import { CARDS } from '../data/cards.js';
import { CONSUMABLES, MATERIALS } from '../data/items.js';
import { itemPic, ui, openModal, btn, icon, toast, cardEl, itemEl, reveal, monsterSprite, heroSprite, bar, banner, bagButton, questButton } from './components.js';
import { openMenu, openQuests } from './panels.js';
import { Coop } from '../net/coop.js';
import { bus } from '../core/util.js';
import { lobbyModal } from './coopUI.js';
import { STORY } from '../story/when.js';

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
    Object.keys(this.app.pst).forEach((id) => this.showStatus(id));
    audio.music('explore');
  }

  dispose() { this.bagTags?.forEach((a) => this.world.detach(a)); this.nameTags?.forEach((a) => this.world.detach(a)); this._offPing?.(); for (const p of this.pings.values()) { this.world.detach(p.anchor); this.world.clearLayer(p.layer); clearTimeout(p.timer); } this.pings.clear(); this.unbind(); this.hud?.remove(); this.world.clearLayers(); this.world.setHover(null); }

  buildHud() {
    this.hud?.remove();
    this.el = { res: h('div.x-res'), party: h('div.x-party'), hint: h('div.b-hint'), obj: h('div.x-obj'), bag: h('div.x-bag') };
    this.hud = h('div.explore-hud',
      h('div.x-top', h('div.x-title', h('div.x-stage', this.stage.name), h('div.x-sub', this.stage.subtitle), this.el.obj),
        h('div.x-right', this.el.res, h('div.x-buttons',
          this.spectator ? btn(t('Party Room'), () => lobbyModal(this.app), { cls: 'small', iconName: 'banner' }) : btn(t('World Map'), () => this.app.toWorldMap(), { cls: 'small', iconName: 'flag', tip: t('Leave — your progress in this stage is kept') })))),
      h('div.x-dock', this.el.party, this.el.bag), this.el.hint, this.world.camControls(),
      h('div.x-legend', ...[['sword', '#e05a4a', 'Monsters'], ['horns', '#ff8a2a', 'Mini Boss'], ['crown', '#ff3050', 'MVP Boss'], ['chest', '#ffd24a', 'Treasure'], ['gem', '#6fe0c0', 'Resources'], ['question', '#c9a0ff', 'Event'], ['camp', '#7fe08a', 'Rest'], ['coin', '#ffc050', 'Shop'], ['shrine', '#9ad8ff', 'Shrine']].map(([i, c, n]) => h('span', icon(i, c, 16), t(n)))));
    ui().appendChild(this.hud);
    if (this.spectator) { this.el.hint.textContent = t('The host leads the party. Click a hex to suggest where to go.'); this.el.hint.classList.add('on'); }
    this.refreshHud();
  }

  refreshHud() {
    if (!this.el || !G.state?.run) return; // (the expedition is over once the MVP falls)
    const st = G.state; const sm = this.sm;
    const q = claimableQuests();
    this.el.res.replaceChildren(h('div.res', icon('coin', '#ffd24a', 18), fmt(st.gold)), h('div.res', icon('gem', '#9ad8ff', 18), fmt(st.shards)), q ? h('div.res.alert', { onclick: () => openQuests(this.app) }, t('{n} quest(s) ready', { n: q })) : null);
    this.el.party.replaceChildren(...st.party.map((hero) => { const s = computeStats(hero);
      return h('div.p-card' + (hero.hp <= 0 ? '.dead' : ''), { onclick: () => openMenu(this.app, 'hero') }, h('div.p-portrait', heroSprite(hero, { size: 64, zoom: 1.5, oy: 0.3 })),
        h('div.p-body', h('div.p-name', hero.name, h('span', ` Lv ${hero.level}`), hero.statPoints + hero.skillPoints > 0 ? h('i.pip', '!') : null), bar('hp', hero.hp, s.hp), bar('mp', hero.mp, s.mp))); }));
    this.el.bag.replaceChildren(bagButton(() => openMenu(this.app), myHeroes().reduce((s, hero) => s + hero.statPoints + hero.skillPoints, 0)), questButton(() => openQuests(this.app), q));
    const left = [...sm.cells.values()].filter((c) => sm.activeNode(c));
    const boss = left.find((c) => c.node.type === 'boss');
    const bossName = MONSTERS[this.stage.boss].name;
    const mini = left.find((c) => c.node.type === 'mini'); const need = mini ? sm.sealOf(mini) : null; const miniName = MONSTERS[this.stage.mini[0]].name;
    // a boss that cannot be fought yet wears its chains on the map, with the reason under it
    for (const c of left) if (c.node.type === 'mini' || c.node.type === 'boss') { const s = sm.sealOf(c); this.world.setSeal(Hex.key(c.q, c.r), !s ? null : s.kind === 'groups' ? t('Defeat {n} more monster group(s)', { n: s.left }) : t('Defeat {mini} first', { mini: miniName })); }
    this.el.obj.textContent = !boss ? t('{boss} has been defeated', { boss: bossName })
      : need ? t('Objective: defeat {n} monster group(s) to draw out {mini}', { n: need.left, mini: miniName })
        : mini ? t('Objective: defeat {mini} to break the seal on {boss}', { mini: miniName, boss: bossName })
          : t('Objective: find and defeat {boss}', { boss: bossName });
  }

  bind() {
    const cv = this.world.canvas;
    this._move = (e) => this.onMove(e); this._down = (e) => this.onDown(e);
    this._key = (e) => { if (e.key === 'Tab') { e.preventDefault(); if (!document.querySelector('.modal-wrap')) openMenu(this.app); } else if ((e.key === 'q' || e.key === 'Q') && !document.querySelector('.modal-wrap')) openQuests(this.app); else if (!document.querySelector('.modal-wrap') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) this.world.rotateBy(e.key === 'ArrowLeft' ? -1 : 1); };
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
    this.aid = Coop.isHost ? 1 + Math.floor(Math.random() * 1e9) : 0; // (with friends: the host goes on only when every player has closed their own window, see App.waitForParty)
    this.aidSent = 0;
    await this.trigger_(c);
    // only for a window the friends were really sent (a fight, a rest or a sealed boss sends none, so nobody would ever
    // answer), and only while this map is still the one on screen (after a fight a new one has been built)
    if (this.aid && this.aidSent === this.aid && this.app.scene === this && !this.app.inBattle) await this.app.waitForParty(this.aid);
  }
  async trigger_(c) {
    const node = c.node; const sm = this.sm;
    switch (node.type) {
      case 'monster': case 'mini': case 'boss': {
        const seal = sm.sealOf(c);
        if (seal) { // not yet: say what has to be done first, and step back
          audio.sfx('error');
          const why = seal.kind === 'groups' ? t('{name} will not face you yet. Defeat {n} more monster group(s) in this stage first.', { name: MONSTERS[this.stage.mini[0]].name, n: seal.left }) : t('A seal guards {boss}. Defeat {mini} to break it.', { boss: MONSTERS[this.stage.boss].name, mini: MONSTERS[this.stage.mini[0]].name });
          this.share('note', { text: why });
          await new Promise((res) => { const m = openModal(h('div.confirm', h('div.big-icon', icon(node.type === 'boss' ? 'crown' : 'horns', '#806b54', 72)), h('p', why), h('div.row.center', btn(t('OK'), () => { m.close(); res(); }, { cls: 'primary' }))), { title: t('Sealed'), closable: false, cls: 'narrow' }); });
          await this.retreat(); break;
        }
        const enc = sm.encounterFor(c);
        const rid = Coop.active && Coop.partyIds().length > 1 ? 1 + Math.floor(Math.random() * 1e9) : 0; // with friends: everyone says "ready" first
        this.share('enc', { enc: { kind: enc.kind, enemies: enc.enemies }, name: node.name, rid });
        const go = await (rid ? this.readyCheck(enc, node, rid) : this.encounterPrompt(enc, node));
        if (go) await this.app.startBattle(enc, c); else { this.share('note', { text: 'The host retreated.', close: true }); await this.retreat(); }
        break;
      }
      case 'treasure': { audio.sfx('chest'); const r = sm.openTreasure(c); this.clearNode(c); this.share('loot', { kind: 'treasure', cell: { q: c.q, r: c.r }, aid: this.aid }); await lootModal(t('Treasure Cache'), r); break; }
      case 'resource': { audio.sfx('coin'); const r = sm.gatherResource(c); this.clearNode(c); this.share('loot', { kind: 'resource', cell: { q: c.q, r: c.r }, aid: this.aid }); await lootModal(t('Resources Gathered'), r); break; }
      case 'rest': await this.app.story(STORY.explore(this.stage.id)); this.share('view', { kind: 'rest' }); await this.restPrompt(c); break;
      case 'shop': this.share('view', { kind: 'shop', cell: { q: c.q, r: c.r }, aid: this.aid, cards: this.sm.shopStock(c).filter((e) => e.kind === 'card').map((e) => e.id) }); await this.shop(c); this.share('note', { close: true }); break;
      case 'event': case 'shrine': await this.app.story(STORY.explore(this.stage.id)); await this.event(c); break;
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
      w.addUnit({ uid: 'party' + i, spriteKey: heroLook(hero).key, look: heroLook(hero).look, scale: i === 0 ? 1 : 0.85, facing: 5 }, [pos]);
      if (i > 0) { const U = w.units.get('party' + i); U.group.position.x -= 0.35 * i; U.group.position.z -= 0.18 * i; }
    });
    // each hero's name floats over their head (plain text; in co-op it takes the player's colour)
    this.nameTags?.forEach((a) => w.detach(a));
    this.nameTags = party.map((hero, i) => w.attach(h('div.unit-label.foot', h('div.ul-foot', h('div.ul-name', { style: hero.owner ? { color: Coop.colorOf(hero.owner) } : null }, hero.name))), () => w.unitPos('party' + i, 0)));
  }
  // Co-op: a small slip over a friend's head while they read the spoils of the last fight or have their bag open,
  // so nobody wonders why they stand still.
  showStatus(id) {
    this.bagTags ||= new Map(); const w = this.world; w.detach(this.bagTags.get(id)); this.bagTags.delete(id);
    const s = this.app.pst[id] || {}; const uid = this.bagUnit(id); if (id === Coop.me || !uid || !(s.sum || s.bag)) return;
    this.bagTags.set(id, w.attach(h('div.ping-label', h('div.bag-tag', icon(s.sum ? 'chest' : 'bag', '#3a2a20', 16), t(s.sum ? 'Collecting rewards' : 'Looking in the bag'))), () => w.unitPos(uid, 2.1)));
  }
  bagUnit(id) { const i = G.state.party.findIndex((x) => x.owner === id); return i < 0 ? null : 'party' + i; }
  share(type, data) { if (!Coop.isHost) return; if (data?.aid) this.aidSent = data.aid; Coop.send({ t: type, ...data }); }
  // Guests: read-only view of an event the host resolved.
  eventView(m) {
    if (m.cell) this.clearNode(this.sm.cell(m.cell));
    // the host's outcome, as the host saw it; an older host sends words only
    return reveal({ title: m.title, text: [m.choice, m.msg, m.pieces ? null : (m.gains || []).join(' · ')].filter(Boolean).join(' — '), pieces: m.pieces || [], button: t('OK'), view: true });
  }

  // Guests: a read-only copy of the window the host has open (camp, merchant, an event's choices), until the host is done.
  hostView(m) {
    const wait = (s) => h('p.note.center', t(s));
    if (m.kind === 'rest') openModal(h('div.confirm', h('div.big-icon', icon('camp', '#7fe08a', 72)), h('p', t('A sheltered campsite. The fire is still warm. Resting restores 60% HP and MP to the whole party and revives the fallen. The site can be used once.')), wait('The host is deciding whether to rest…')), { title: t('Rest Site'), cls: 'narrow coop-view' });
    else if (m.kind === 'shop') openModal(h('div.confirm', h('div.big-icon', icon('coin', '#ffc050', 72)), h('p', t('A wandering merchant has laid out their wares.')), (m.cards || []).length ? h('div.card-grid.center', ...m.cards.filter((id) => CARDS[id]).map((id) => cardEl(id, 0, { small: true }))) : null, wait('The host is browsing the merchant…')), { title: t('Wandering Merchant'), cls: 'narrow coop-view' });
    else if (m.kind === 'event') openModal(h('div.event', h('div.big-icon', icon(m.icon, '#e8d8a8', 72)), h('p.event-text', m.text), h('div.choices', ...(m.choices || []).map((c) => h('div.choice-view', c))), wait('The host is choosing…')), { title: m.title, cls: 'narrow event-modal coop-view' });
  }

  encounterPrompt(enc, node) {
    return new Promise((res) => {
      const boss = enc.kind === 'boss';
      if (boss) audio.sfx('boss');
      const m = openModal(h('div.enc', ...encHead(enc),
        h('div.row.center', btn(t('Retreat'), () => { m.close(); res(false); }), btn(t(boss ? 'Challenge the MVP' : 'Fight'), () => { m.close(); res(true); }, { cls: 'primary' }))),
      { title: boss ? t('MVP Boss') : node.name, closable: false, cls: boss ? 'boss-modal' : '' });
    });
  }

  // Co-op: before a fight every player says they are ready. The host's window decides (and may start without waiting);
  // a guest's is the same window with one button. A guest who has their own window open (the bag) gets a slip at the
  // top of the screen instead, so nothing covers what they are doing.
  readyCheck(enc, node, rid) {
    const app = this.app; const host = Coop.isHost; const boss = enc.kind === 'boss';
    return new Promise((res) => {
      if (boss) audio.sfx('boss');
      let m = null, slip = null, done = false, go = null;
      const isReady = (id) => app.pst[id]?.rdy === rid;
      const end = (v) => { if (done) return; done = true; offs.forEach((off) => off()); clearInterval(watch); clearTimeout(go); slip?.remove(); if (m?.wrap.isConnected) m.close(); res(v); };
      const ready = () => { audio.sfx('buff'); app.setMine('rdy', rid); };
      const body = h('div.enc');
      const render = () => {
        if (done) return;
        const ids = Coop.partyIds(); const mine = isReady(Coop.me); const left = ids.filter((id) => !isReady(id)).length;
        body.replaceChildren(...encHead(enc), partyTiles(app, isReady),
          h('p.rc-count' + (left ? '' : '.all'), left ? t('Waiting for {n} player(s)…', { n: left }) : t('Everyone is ready!')),
          host ? h('div.row.center', btn(t('Retreat'), () => end(false)), mine ? h('p.note.center', t('Waiting for the others…')) : btn(t(boss ? 'Challenge the MVP' : 'Ready to fight'), ready, { cls: 'primary' }))
            : h('div.row.center', mine ? h('p.note.center', t('Waiting for the others…')) : btn(t('Ready'), ready, { cls: 'primary' })));
        slip?.replaceChildren(icon(boss ? 'crown' : 'sword', '#d9482f', 22), h('span', t('{host} is about to fight {name}', { host: Coop.nameOf(Coop.hostId), name: node.name })),
          mine ? h('b.rc-ok', '✔ ' + t('Ready')) : btn(t('Ready'), ready, { cls: 'small primary' }));
        if (host && !left && !go) go = setTimeout(() => end(true), 800); // a beat to see the last stamp land
      };
      const open = () => { m = openModal(body, { title: boss ? t('MVP Boss') : node.name, closable: false, cls: ['ready-modal', boss ? 'boss-modal' : '', host ? '' : 'coop-view'].filter(Boolean).join(' ') }); };
      if (!host && ownModalOpen()) { slip = h('div#rc-slip'); document.getElementById('game').appendChild(slip); } else open();
      const offs = [bus.on('coop:state', render), bus.on('coop:players', render)];
      // the host moving on takes a guest's window (or slip) away; closing the bag turns the slip into the window
      const watch = setInterval(() => {
        if ((m && !m.wrap.isConnected) || (slip && !slip.isConnected)) end(false);
        else if (slip && !ownModalOpen()) { slip.remove(); slip = null; open(); render(); }
      }, 300);
      render();
    });
  }

  restPrompt(c) {
    return new Promise((res) => {
      const m = openModal(h('div.confirm', h('div.big-icon', icon('camp', '#7fe08a', 72)), h('p', t('A sheltered campsite. The fire is still warm. Resting restores 60% HP and MP to the whole party and revives the fallen. The site can be used once.')),
        h('div.row.center', btn(t('Not now'), () => { this.share('note', { close: true }); m.close(); res(); }), btn(t('Rest'), () => { this.sm.rest(c); this.share('rest', { cell: { q: c.q, r: c.r } }); audio.sfx('heal'); this.clearNode(c); m.close(); reveal({ title: t('Rest Site'), text: t('The party is rested'), pieces: [{ k: 'heal', pct: 0.6 }, { k: 'mp', n: '60%' }] }).then(res); }, { cls: 'primary' }))), { title: t('Rest Site'), closable: false, cls: 'narrow' });
    });
  }

  // mine: a co-op guest shopping with their own gold, alongside the host (their purchases are kept apart from the host's)
  shop(c, mine = null) {
    return new Promise((res) => {
      const body = h('div.shop'); const st = G.state;
      const render = () => {
        const stock = this.sm.shopStock(c, mine);
        const row = (e) => {
          const buy = h('button.mini.up', { disabled: e.sold || st.gold < e.price, onclick: () => { if (this.sm.buy(c, e, mine)) { audio.sfx('coin'); render(); this.refreshHud(); } } }, e.sold ? t('Sold') : t('{n} g', { n: e.price }));
          if (e.kind === 'equip') { const el = itemEl(e.item); el.appendChild(buy); return el; }
          if (e.kind === 'cons') { const k = CONSUMABLES[e.id]; return h('div.item', { style: { '--rar': k.color } }, h('div.item-icon', itemPic(k.icon, k.color, 30)), h('div.item-info', h('div.item-name', k.name), h('div.item-sub', k.desc)), h('div.item-tag', `×${st.inv.cons[e.id] || 0}`), buy); }
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
      this.share('view', { kind: 'event', title: ev.title, icon: ev.icon, text: ev.text, choices: ev.choices.map((ch) => ch.label) });
      body.replaceChildren(h('div.big-icon', icon(ev.icon, '#e8d8a8', 72)), h('p.event-text', ev.text),
        h('div.choices', ...ev.choices.map((ch) => btn(ch.label, async () => {
          const out = this.sm.resolveChoice(c, ch);
          this.share('event', { title: ev.title, icon: ev.icon, text: ev.text, choice: ch.label, chi: ev.choices.indexOf(ch), ok: out.ok, aid: out.fight ? 0 : this.aid, cell2: { q: c.q, r: c.r }, msg: out.msg, gains: out.gains, pieces: out.pieces, out: out.party, cell: out.fight ? null : { q: c.q, r: c.r } });
          audio.sfx(out.fight ? 'boss' : out.gains.length ? 'chest' : 'click');
          // the choice window closes and the outcome is laid on the table
          m.close(); this.refreshHud();
          await reveal({ title: ev.title, text: out.msg, pieces: out.pieces, button: t(out.fight ? 'To battle!' : 'Continue') });
          if (out.fight) await this.app.startBattle(this.sm.ambush(), c); else this.clearNode(c);
          res();
        }, { disabled: !this.sm.canChoose(ch), cls: 'choice' }))));
    });
  }
}

// The monsters of an encounter, drawn in a row (with the MVP's words under it).
function encHead(enc) {
  const counts = {}; enc.enemies.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
  return [h('div.enc-row', ...Object.entries(counts).map(([id, n]) => { const d = MONSTERS[id];
    return h('div.enc-mon' + (d.rank !== 'normal' ? '.big' : ''), monsterSprite(id, { size: d.rank === 'mvp' ? 200 : d.rank === 'mini' ? 150 : 110, anim: 'idle' }), h('div.enc-name', d.name, n > 1 ? ` ×${n}` : ''), h('div.enc-sub', `Lv ${d.level}${d.weak.length ? ' · ' + t('Weak: ') + d.weak.map((e) => ELEMENTS[e].name).join(', ') : ''}`)); })),
  enc.kind === 'boss' ? h('p.enc-quote', `“${MONSTERS[enc.enemies[0]].quote}”`) : null].filter(Boolean);
}

// Is a window of the player's own open (the bag, the quest list)? Read-only copies of the host's windows do not count.
export const ownModalOpen = () => [...document.querySelectorAll('.modal-wrap:not(.closing) > .modal')].some((m) => !m.classList.contains('coop-view'));

// Co-op: every player as a paper token with what they are doing under it. `isReady` stamps the ones who are ready;
// without it the token says who has finished with the spoils.
export function partyTiles(app, isReady = null, label = null) {
  return h('div.rc-party', ...Coop.partyIds().map((id) => {
    const hero = G.state.party.find((x) => x.owner === id); const s = app.pst[id] || {}; const ok = isReady ? isReady(id) : !label && !s.sum && !s.busy;
    return h('div.rc-p' + (ok ? '.ready' : ''), { style: { '--pc': Coop.colorOf(id) } },
      h('div.rc-face', hero ? heroSprite(hero, { size: 96, zoom: 1.5, oy: 0.3 }) : null),
      h('div.rc-name', Coop.nameOf(id), id === Coop.me ? h('small', ' (' + t('You') + ')') : null),
      h('div.rc-st', s.sum ? t('Collecting rewards') : s.busy ? t('Not done yet') : s.bag ? t('Looking in the bag') : label ? label(id) : isReady ? t(ok ? 'Ready' : 'Not ready yet') : t('Done')),
      ok && isReady && !label ? h('div.rc-stamp', t('READY')) : null); // (a label of its own: the tile is not about being ready)
  }));
}

// After a battle: what each hero did. The longest bar in a column is that column's best.
export function battleSummary(battle) {
  const rows = battle.units.filter((u) => u.hero).map((u) => ({ u, ...(battle.tally[u.uid] || { dealt: 0, taken: 0, healed: 0 }) }));
  const cols = [['dealt', 'Damage dealt', 'sword', 'var(--accent)'], ['taken', 'Damage taken', 'shield', '#806b54'], ['healed', 'Healing done', 'cross', 'var(--accent2)']];
  const max = {}; cols.forEach(([k]) => { max[k] = Math.max(1, ...rows.map((r) => r[k])); });
  return h('div.bsum', h('div.bsum-h'), ...cols.map(([, label, ic]) => h('div.bsum-h', icon(ic, '#806b54', 16), t(label))),
    ...rows.flatMap((r) => [
      h('div.bsum-who', h('div.bsum-face', { style: { '--pc': r.u.hero.owner ? Coop.colorOf(r.u.hero.owner) : 'transparent' } }, heroSprite(r.u.hero, { size: 64, zoom: 1.5, oy: 0.3 })), h('span', r.u.name)),
      ...cols.map(([k, , , c]) => h('div.bsum-v' + (rows.length > 1 && r[k] > 0 && r[k] === max[k] ? '.top' : ''), h('div.bsum-bar', h('i', { style: { width: Math.round((r[k] / max[k]) * 100) + '%', background: c } })), h('b', String(r[k]))))]));
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

// Treasure and gathered resources: the pieces are laid out on the table.
export function lootModal(title, r, { view = false } = {}) {
  if (view) title = t(title);
  const pieces = [];
  if (r.gold) pieces.push({ k: 'gold', n: r.gold });
  if (r.shards) pieces.push({ k: 'shards', n: r.shards });
  if (r.exp) pieces.push({ k: 'exp', n: r.exp });
  Object.entries(r.mats || {}).forEach(([id, n]) => pieces.push({ k: 'mat', id, n }));
  (r.cons || []).forEach((id) => pieces.push({ k: 'cons', id }));
  (r.items || []).forEach((item) => pieces.push({ k: 'item', item }));
  (r.cards || []).forEach((id) => pieces.push({ k: 'card', id, lv: G.state?.cards[id]?.lv || 0 }));
  return reveal({ title, pieces, button: t(view ? 'OK' : 'Take'), view });
}

export function rewardsModal(r, kind, { view = false, summary = null } = {}) {
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
      summary,
      r.levelUps.length ? h('div.levelups', ...r.levelUps.map((l) => h('div.levelup', heroSprite(l.hero, { size: 72, zoom: 1.3, oy: 0.15, anim: 'cast' }), h('div', h('b', t('{name} reached Level {lv}!', { name: l.hero.name, lv: l.hero.level })), h('small', t('+{n} stat points', { n: l.levels }) + (l.hero.skillPoints ? t(' · skill points available') : '')), jobReady(l.hero) ? h('div.job-news', t("A page bearing {name}'s name has appeared in the bag. Read it, and choose the road ahead.", { name: l.hero.name })) : null)))) : null,
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
