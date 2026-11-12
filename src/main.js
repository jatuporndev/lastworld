// LAST WORLD — application bootstrap and scene flow.
import './i18n/applyData.js';
import { t } from './core/i18n.js';
import * as Hex from './engine/hex.js';
import { World } from './engine/renderer.js';
import { bus, sleep, h } from './core/util.js';
import { audio } from './core/audio.js';
import { G, normalizeProfile, openSession, commitSession, myHeroes, fixHero, touch, healParty } from './game/state.js';
import { StageManager } from './game/stageManager.js';
import { grantExp, computeStats } from './game/character.js';
import { Net } from './net/firebase.js';
import { CLASSES, CLASS_ORDER } from './data/classes.js';
import { MONSTERS } from './data/monsters.js';
import { STAGE_BY_ID } from './data/stages.js';
import { initTooltips, transition, toast, openModal, btn, topModal, banner } from './ui/components.js';
import { titleScreen, playScreen, charCreateScreen, worldMapScreen, authModal, clearScreens, epilogue } from './ui/screens.js';
import { ExploreScene, rewardsModal, stageIntro, lootModal } from './ui/exploreUI.js';
import { BattleScene } from './ui/battleUI.js';
import { Coop } from './net/coop.js';
import { coopBadge, guestWaitScreen } from './ui/coopUI.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

class App {
  constructor() {
    this.world = new World(document.getElementById('view3d'), document.getElementById('labels'));
    this.sm = new StageManager();
    this.scene = null; this.diorama = false; this.saveTimer = null;
    this.inBattle = false; this.guestQ = Promise.resolve();
  }

  async boot() {
    initTooltips();
    this.saveInd = h('div#save-ind'); document.getElementById('game').appendChild(this.saveInd);
    this.buildDiorama();
    const loading = h('div.screen.loading', h('div.loading-text', 'LAST WORLD'), h('div.loading-sub', t('Awakening the realms…')));
    document.getElementById('ui').appendChild(loading);
    await Net.init();
    G.profile = normalizeProfile(await Net.load());
    const vol = () => audio.setVolumes(G.profile.settings.music, G.profile.settings.sfx);
    vol();
    bus.on('state:changed', () => { this.queueSave(); this.queueHeroSync(); });
    this.bindCoop();
    const wake = () => { audio.init(); vol(); };
    window.addEventListener('pointerdown', wake); window.addEventListener('keydown', wake);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const m = topModal(); if (m?._close) m._close(); } if (e.key === 'F11') return; });
    window.addEventListener('beforeunload', () => { if (!G.profile) return; commitSession({ world: !Coop.isGuest }); Net.saveLocal(G.profile); });
    // leaving the tab is the last chance to back up, so push any pending change then
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.saveNow(); });
    await sleep(500);
    loading.remove();
    titleScreen(this); audio.music('title');
    document.getElementById('fade').classList.remove('on');
  }

  // ───── saving ─────
  // Local-first saving of the whole profile (characters + worlds). Every change is written to this device
  // right away; the cloud copy is refreshed only at milestones and at most every few minutes, and only if
  // something changed. A co-op guest saves their own character but never the host's world.
  queueSave() { clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => this.saveNow({ gap: 5 * 60000 }), 1000); }
  // gap = minimum time since the last cloud upload (0 = upload now if anything changed)
  async saveNow({ gap = 0 } = {}) {
    if (!G.profile) return;
    clearTimeout(this.saveTimer);
    commitSession({ world: !Coop.isGuest });
    G.profile.updated = Date.now();
    const okLocal = Net.saveLocal(G.profile);
    let okCloud = false;
    if (Net.cloudDirty(G.profile)) {
      const wait = (this.lastCloudAt || 0) + gap - Date.now();
      clearTimeout(this.cloudTimer);
      if (wait <= 0) { okCloud = (await Net.saveCloud(G.profile)) === true; if (okCloud) this.lastCloudAt = Date.now(); }
      else this.cloudTimer = setTimeout(() => this.saveNow(), wait); // catch up once the interval has passed
    }
    this.saveInd.textContent = t(okCloud ? '☁ Saved to cloud' : okLocal ? '✔ Saved' : '⚠ Save failed');
    this.saveInd.classList.add('on'); clearTimeout(this._si); this._si = setTimeout(() => this.saveInd.classList.remove('on'), 1600);
  }
  openAuth(done) { authModal(this, done); }
  async onSignedIn() {
    const cloud = await Net.loadCloud(G.profile?.updated || 0); // null unless the cloud copy is newer
    if (cloud) {
      if (Coop.active) await this.leaveCoop({ silent: true });
      G.profile = normalizeProfile(cloud); G.state = null; Net.saveLocal(G.profile); toast(t('Cloud save loaded'), 'good');
    } else if (G.profile) { if ((await Net.saveCloud(G.profile)) === true) this.lastCloudAt = Date.now(); }
  }

  refreshHud() {
    this.scene?.refreshHud?.();
    const wm = document.querySelector('.wm-screen'); if (wm && !document.querySelector('.modal-wrap:not(.closing)')) wm._refresh?.();
  }

  // ───── menu backdrop: a living hex diorama ─────
  buildDiorama() {
    const w = this.world; w.clearBoard();
    w.setEnvironment({ sky: 0x2d2a5c, fog: 0x0e0b1e, light: 0xffe6c0, ambient: 'motes' });
    const pick = (q, r, ring) => { const n = Math.abs(Math.sin(q * 91.7 + r * 53.3) * 1000) % 1;
      if (ring === 4) return n < 0.35 ? 'water' : n < 0.6 ? 'forest' : n < 0.75 ? 'rock' : 'grass';
      if (ring === 3) return n < 0.3 ? 'forest' : n < 0.4 ? 'bloom' : n < 0.48 ? 'crystal' : 'grass';
      return n < 0.12 ? 'bloom' : n < 0.2 ? 'holy' : 'grass'; };
    for (const c of Hex.spiral({ q: 0, r: 0 }, 4)) w.addTile(c.q, c.r, pick(c.q, c.r, Hex.distance(c, { q: 0, r: 0 })));
    w.finishBoard();
    const spots = [{ q: -1, r: 1 }, { q: 1, r: 0 }, { q: 0, r: -1 }, { q: -2, r: 0 }, { q: 1, r: 1 }, { q: 2, r: -2 }];
    CLASS_ORDER.forEach((cls, i) => { const s = spots[i]; w.tiles.get(Hex.key(s.q, s.r)) && w.addUnit({ uid: 'd' + i, spriteKey: 'cls_' + cls, look: CLASSES[cls].look, scale: 1, facing: [5, 4, 5, 0, 4, 5][i] }, [s]); });
    [['moss_slime', { q: -2, r: 2 }], ['briar_sprite', { q: 2, r: -1 }], ['thornwolf', { q: 0, r: 2 }]].forEach(([id, s], i) => w.addUnit({ uid: 'dm' + i, spriteKey: 'mon_' + id, look: MONSTERS[id].look, scale: 1, facing: 4 }, [s]));
    w.focus({ x: 0, z: 0.6, size: 13, offY: -0.06, yaw: 0, minWidth: 0 }, 0);
    this._orbit = (dt, T) => { w.cam.yaw = Math.sin(T * 0.12) * 0.5; };
    w.frameHooks.add(this._orbit);
    this.diorama = true;
  }
  leaveDiorama() { if (this._orbit) this.world.frameHooks.delete(this._orbit); this.world.cam.yaw = 0; this.diorama = false; }
  disposeScene() { this.scene?.dispose?.(); this.scene = null; }
  menuScreen(fn) { return transition(() => { this.disposeScene(); clearScreens(); if (!this.diorama) this.buildDiorama(); fn(); }); }

  // ───── flow ─────
  async toTitle() {
    if (Coop.active) await this.leaveCoop({ silent: true, toTitle: false });
    await this.saveNow();
    G.state = null;
    await this.menuScreen(() => { titleScreen(this); audio.music('title'); });
  }
  // Characters + worlds: pick (or create) both, then enter.
  async toPlay(sel = {}) { await this.saveNow(); G.state = null; await this.menuScreen(() => playScreen(this, sel)); }
  async toCharCreate(back) { await this.menuScreen(() => charCreateScreen(this, back)); }
  // Enter world `worldId` with character `charId`.
  async play(worldId, charId) {
    if (!openSession(worldId, charId)) return;
    audio.setVolumes(G.profile.settings.music, G.profile.settings.sfx);
    this.syncParty();
    await this.saveNow();
    if (G.state.run) await this.enterStage(G.state.run.stageId); else await this.toWorldMap();
  }
  async continueGame() { const L = G.profile.last; await this.play(L.world, L.char); }
  async toWorldMap() {
    await this.menuScreen(() => { worldMapScreen(this); audio.music('world'); });
    this.hostScene();
  }
  async enterStage(id) {
    const st = G.state; const fresh = !(st.run && st.run.stageId === id);
    await transition(() => { this.disposeScene(); clearScreens(); this.leaveDiorama(); this.scene = new ExploreScene(this, id, { fresh }); this.scene.build(); });
    this.hostScene();
    if (!st.seenIntro[id]) { st.seenIntro[id] = true; touch(); await stageIntro(STAGE_BY_ID[id]); }
  }

  // ───── battle ─────
  async startBattle(enc, cell) {
    const stage = this.sm.stage;
    const seed = (Math.random() * 2 ** 31) | 0;
    const party = Coop.active ? G.state.party.map((hero) => this.heroSnap(hero)) : null;
    const at = cell ? { q: cell.q, r: cell.r } : null;
    if (Coop.isHost) Coop.send({ t: 'battle', stageId: stage.id, enc, seed, party, cell: at, nextBuff: G.state.nextBuff });
    await this.runBattle({ stage, enc, seed, party, cell });
  }
  // Every client (solo, host, guest) plays the battle and collects its own rewards into its own character.
  async runBattle({ stage, enc, seed, party, cell }) {
    const stageId = stage.id; const guest = Coop.isGuest;
    this.disposeScene(); this.inBattle = true;
    let bs; let playing;
    await transition(async () => { clearScreens(); this.leaveDiorama(); bs = new BattleScene(this, { stage, enc, seed, party }); this.scene = bs; playing = bs.play(); await sleep(60); });
    const result = await playing;
    this.inBattle = false;
    if (party) this.takeBack(bs.battle);
    if (result === 'victory') {
      const r = this.sm.battleRewards(bs.battle, cell);
      this.syncHeroNow();
      await rewardsModal(r, enc.kind);
      await this.saveNow({ gap: enc.kind === 'boss' ? 0 : 3 * 60000 });
      if (guest) { bs.waitForHost?.(); return; } // the host's next scene takes the guest on
      if (enc.kind === 'boss') {
        this.sm.leave();
        await this.toWorldMap();
        if (stageId === 6 && r.first) await epilogue(this);
        else if (r.first) banner(t('New Realm Unlocked'), STAGE_BY_ID[Math.min(6, stageId + 1)].name, 'victory', 2200);
        return;
      }
    } else {
      const d = this.sm.onDefeat();
      this.syncHeroNow();
      await new Promise((res) => { const m = openModal(h('div.confirm', h('p', t('Your party was defeated and carried back to the entrance of {stage}. You lost {gold} gold. The heroes recover to half strength — cleared encounters stay cleared.', { stage: stage.name, gold: d.lost })), h('div.row.center', btn(t('Rise Again'), () => { m.close(); res(); }, { cls: 'primary' }))), { title: t('Defeat'), closable: false, cls: 'narrow' }); });
      await this.saveNow({ gap: 3 * 60000 });
      if (guest) return;
    }
    await transition(() => { this.disposeScene(); clearScreens(); this.scene = new ExploreScene(this, stageId); this.scene.build(); });
    this.hostScene();
  }
  // A hero as sent to a co-op battle: the hero plus its deck's card levels and its potions.
  heroSnap(hero) {
    if (hero.remote) return clone(hero);
    const cardLv = {}; hero.deck.forEach((id) => { cardLv[id] = G.state.cards[id]?.lv || 0; });
    return { ...clone(hero), owner: Coop.me, cardLv, cons: clone(G.state.inv.cons) };
  }
  // After a co-op battle: copy my hero's HP/MP and potions back from the battle copy.
  takeBack(battle) {
    const mine = myHeroes()[0];
    const u = battle.units.find((x) => x.hero && x.hero.owner === Coop.me);
    if (!mine || !u) return;
    mine.hp = u.hero.hp; mine.mp = u.hero.mp;
    G.state.inv.cons = { ...(u.hero.cons || {}) };
  }

  // ───── online co-op ─────
  // Each player brings one character. The host's world is the map; everyone's heroes form the party.
  bindCoop() {
    bus.on('coop:players', () => { coopBadge(this); if (!this.inBattle) this.syncParty(); });
    bus.on('coop:join', (id) => { toast(t('{name} joined the room', { name: Coop.nameOf(id) }), 'good'); if (!this.inBattle) this.hostScene(); });
    bus.on('coop:left', () => toast(t('A player left the room')));
    bus.on('coop:closed', (why) => this.onRoomClosed(why));
    bus.on('coop:msg', (m) => {
      if (m.t === 'b') { (Coop.bbuf ||= []).push(m); return; } // battle commands go to the battle scene
      if (Coop.isGuest && m.from === Coop.hostId) this.guestQ = this.guestQ.then(() => this.guestHandle(m)).catch((e) => console.error('[co-op]', e));
    });
  }
  // Rebuild the party from the room: host first, then guests by join time. My own hero stays the real object.
  syncParty() {
    if (!G.state) return;
    const mine = G.profile.chars[G.state.charId]?.hero; if (!mine) return;
    let party;
    if (!Coop.active) { delete mine.owner; party = [mine]; }
    else {
      mine.owner = Coop.me;
      party = Coop.partyIds().map((id) => {
        if (id === Coop.me) return mine;
        const snap = Coop.heroOf(id); if (!snap) return null;
        return Object.assign(fixHero(clone(snap)), { remote: true, owner: id });
      }).filter(Boolean);
    }
    const before = G.state.party.map((x) => x.owner + x.cls).join();
    G.state.party = party;
    if (before !== party.map((x) => x.owner + x.cls).join() && this.scene instanceof ExploreScene) this.scene.rebuildParty?.();
    this.refreshHud();
  }
  queueHeroSync() { if (!Coop.active || this.inBattle) return; clearTimeout(this._heroT); this._heroT = setTimeout(() => this.syncHeroNow(), 1200); }
  syncHeroNow() { const mine = myHeroes()[0]; if (Coop.active && mine) Coop.publishHero(this.heroSnap(mine)); }
  async hostRoom(worldId, charId, name) {
    openSession(worldId, charId);
    await Coop.create(name, this.heroSnap(G.profile.chars[charId].hero));
    coopBadge(this);
    await this.play(worldId, charId);
  }
  async joinRoom(code, charId, name) {
    openSession(null, charId);
    await Coop.join(code, name, this.heroSnap(G.profile.chars[charId].hero));
    coopBadge(this); this.syncParty();
    await this.menuScreen(() => guestWaitScreen(this, t('Waiting for the host…')));
  }
  // Host → everyone: the current scene plus the world's progress.
  hostScene() {
    if (!Coop.isHost || !G.state || this.inBattle) return;
    const explore = this.scene instanceof ExploreScene;
    const st = G.state;
    Coop.send({ t: 'scene', s: explore ? 'explore' : 'map', stageId: explore ? this.sm.stage.id : null, world: { unlocked: st.unlocked, cleared: st.cleared, run: st.run, seenIntro: st.seenIntro, nextBuff: st.nextBuff } });
  }
  async leaveCoop({ silent = false, toTitle = true } = {}) {
    const guest = Coop.isGuest;
    await Coop.leave(); coopBadge(this);
    if (!silent) toast(t('You left the room'));
    this.syncParty();
    if (guest && toTitle) await this.backToTitle();
  }
  async onRoomClosed(why) {
    coopBadge(this);
    await new Promise((res) => { const m = openModal(h('div.confirm', h('p', t(why === 'kicked' ? 'You were removed from the room.' : 'The host closed the room.') + ' ' + t('Your character keeps everything earned.')), h('div.row.center', btn(t('OK'), () => { m.close(); res(); }, { cls: 'primary' }))), { title: t('Room Closed'), closable: false, cls: 'narrow' }); });
    await this.backToTitle();
  }
  async backToTitle() {
    await this.saveNow();
    G.state = null; this.inBattle = false; this.guestQ = Promise.resolve(); Coop.bbuf = [];
    document.querySelectorAll('.modal-wrap').forEach((w) => w.remove());
    await this.menuScreen(() => { titleScreen(this); audio.music('title'); });
  }
  closeGuestModals() { document.querySelectorAll('.modal.coop-view').forEach((m) => (m.closest('.modal-wrap') || m).remove()); }
  // Guests replay the host's stream in order (walks and battles take time, so each waits for the last).
  async guestHandle(m) {
    if (!Coop.isGuest || !G.state) return;
    const st = G.state; const sc = this.scene instanceof ExploreScene ? this.scene : null;
    const cellOf = (c) => (c ? this.sm.cell(c) : null);
    switch (m.t) {
      case 'scene': {
        const w = m.world || {};
        Object.assign(st, { unlocked: w.unlocked || 1, cleared: w.cleared || {}, run: w.run || null, seenIntro: w.seenIntro || {}, nextBuff: w.nextBuff || null });
        if (st.run) { st.run.cleared = st.run.cleared || {}; st.run.seen = st.run.seen || {}; st.run.shop = st.run.shop || {}; }
        this.closeGuestModals(); this.syncParty();
        if (m.s === 'explore') await transition(() => { this.disposeScene(); clearScreens(); this.leaveDiorama(); this.scene = new ExploreScene(this, m.stageId, { spectator: true }); this.scene.build(); });
        else await this.menuScreen(() => { guestWaitScreen(this, t('The host is choosing the next stage…')); audio.music('world'); });
        break;
      }
      case 'walk': if (sc) await sc.walk(m.path); break;
      // treasure and resources: every player gets their own share
      case 'loot': {
        const c = cellOf(m.cell); if (!sc || !c || this.sm.isCleared(c)) break;
        const r = m.kind === 'treasure' ? this.sm.openTreasure(c) : this.sm.gatherResource(c);
        sc.clearNode(c); audio.sfx('chest'); lootModal(m.kind === 'treasure' ? 'Treasure Cache' : 'Resources Gathered', r, { view: true });
        break;
      }
      case 'rest': { const c = cellOf(m.cell); this.healMine(0.6, 0.6, true); if (sc && c) { this.sm.markCleared(c); sc.clearNode(c); } audio.sfx('heal'); toast(t('The party is rested'), 'good'); break; }
      case 'event': {
        const o = m.out || {};
        if (o.healPct) this.healMine(o.healPct, 0, false);
        if (o.fullHeal) this.healMine(1, 1, true);
        myHeroes().forEach((hero) => {
          const s = computeStats(hero);
          if (o.mp) hero.mp = Math.min(s.mp, hero.mp + o.mp);
          if (o.dmgPct && hero.hp > 0) hero.hp = Math.max(1, hero.hp - Math.round(s.hp * o.dmgPct));
          if (o.exp) grantExp(hero, o.exp);
          if (o.skillPoint) hero.skillPoints += 1;
        });
        touch();
        const c = cellOf(m.cell); if (sc && c) { this.sm.markCleared(c); sc.clearNode(c); }
        sc?.eventView?.(m);
        break;
      }
      case 'note': if (m.close) this.closeGuestModals(); toast(t(m.text, m.vars || {})); break;
      case 'enc': this.closeGuestModals(); sc?.encounterPrompt(m.enc, { name: m.name }, true); break;
      case 'battle': {
        this.closeGuestModals();
        st.nextBuff = m.nextBuff || null;
        // the database drops empty lists (a new hero's skills), so put them back before the battle reads them
        await this.runBattle({ stage: STAGE_BY_ID[m.stageId], enc: m.enc, seed: m.seed, party: (m.party || []).map(fixHero), cell: cellOf(m.cell) });
        break;
      }
      default: break;
    }
    this.refreshHud();
  }
  healMine(pct, mpPct, revive) {
    myHeroes().forEach((hero) => { const s = computeStats(hero); if (hero.hp <= 0 && !revive) return; hero.hp = Math.min(s.hp, Math.max(0, hero.hp) + Math.round(s.hp * pct)); hero.mp = Math.min(s.mp, hero.mp + Math.round(s.mp * mpPct)); });
    touch();
  }
}

const app = new App();
window.__app = app; window.__G = G; window.__Net = Net; window.__Coop = Coop; // handles for debugging and automated tests
app.boot();
