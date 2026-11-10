// LAST WORLD — application bootstrap and scene flow.
import './i18n/applyData.js';
import { t } from './core/i18n.js';
import * as Hex from './engine/hex.js';
import { World } from './engine/renderer.js';
import { bus, sleep, h } from './core/util.js';
import { audio } from './core/audio.js';
import { G, newGame, normalize, touch } from './game/state.js';
import { StageManager } from './game/stageManager.js';
import { Net } from './net/firebase.js';
import { CLASSES, CLASS_ORDER } from './data/classes.js';
import { MONSTERS } from './data/monsters.js';
import { STAGE_BY_ID } from './data/stages.js';
import { initTooltips, transition, toast, openModal, btn, topModal, banner } from './ui/components.js';
import { titleScreen, charSelectScreen, worldMapScreen, authModal, clearScreens, epilogue } from './ui/screens.js';
import { ExploreScene, rewardsModal, stageIntro } from './ui/exploreUI.js';
import { BattleScene } from './ui/battleUI.js';

class App {
  constructor() {
    this.world = new World(document.getElementById('view3d'), document.getElementById('labels'));
    this.sm = new StageManager();
    this.scene = null; this.diorama = false; this.saveTimer = null;
  }

  async boot() {
    initTooltips();
    this.saveInd = h('div#save-ind'); document.getElementById('game').appendChild(this.saveInd);
    this.buildDiorama();
    const loading = h('div.screen.loading', h('div.loading-text', 'LAST WORLD'), h('div.loading-sub', t('Awakening the realms…')));
    document.getElementById('ui').appendChild(loading);
    await Net.init();
    G.state = normalize(await Net.load());
    if (G.state) audio.setVolumes(G.state.settings.music, G.state.settings.sfx);
    bus.on('state:changed', () => this.queueSave());
    const wake = () => { audio.init(); if (G.state) audio.setVolumes(G.state.settings.music, G.state.settings.sfx); };
    window.addEventListener('pointerdown', wake); window.addEventListener('keydown', wake);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const m = topModal(); if (m?._close) m._close(); } if (e.key === 'F11') return; });
    window.addEventListener('beforeunload', () => { if (G.state) Net.saveLocal(G.state); });
    // leaving the tab is the last chance to back up, so push any pending change then
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && G.state) this.saveNow(); });
    await sleep(500);
    loading.remove();
    titleScreen(this); audio.music('title');
    document.getElementById('fade').classList.remove('on');
  }

  // ───── saving ─────
  // Local-first saving. Every change is written to this device right away (free and instant);
  // the cloud copy is refreshed only at milestones and at most every few minutes, and only if something changed.
  queueSave() { clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => this.saveNow({ gap: 5 * 60000 }), 1000); }
  // gap = minimum time since the last cloud upload (0 = upload now if anything changed)
  async saveNow({ gap = 0 } = {}) {
    if (!G.state) return;
    clearTimeout(this.saveTimer);
    G.state.updated = Date.now();
    const okLocal = Net.saveLocal(G.state);
    let okCloud = false;
    if (Net.cloudDirty(G.state)) {
      const wait = (this.lastCloudAt || 0) + gap - Date.now();
      clearTimeout(this.cloudTimer);
      if (wait <= 0) { okCloud = (await Net.saveCloud(G.state)) === true; if (okCloud) this.lastCloudAt = Date.now(); }
      else this.cloudTimer = setTimeout(() => this.saveNow(), wait); // catch up once the interval has passed
    }
    this.saveInd.textContent = t(okCloud ? '☁ Saved to cloud' : okLocal ? '✔ Saved' : '⚠ Save failed');
    this.saveInd.classList.add('on'); clearTimeout(this._si); this._si = setTimeout(() => this.saveInd.classList.remove('on'), 1600);
  }
  openAuth(done) { authModal(this, done); }
  async onSignedIn() {
    const cloud = normalize(await Net.loadCloud(G.state?.updated || 0)); // null unless the cloud copy is newer
    if (cloud) { G.state = cloud; Net.saveLocal(cloud); toast(t('Cloud save loaded'), 'good'); }
    else if (G.state) { if ((await Net.saveCloud(G.state)) === true) this.lastCloudAt = Date.now(); }
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

  // ───── flow ─────
  async toTitle() {
    await this.saveNow();
    await transition(() => { this.disposeScene(); clearScreens(); if (!this.diorama) this.buildDiorama(); titleScreen(this); audio.music('title'); });
  }
  async toCharSelect() { await transition(() => { clearScreens(); if (!this.diorama) this.buildDiorama(); charSelectScreen(this); }); }
  async startNewGame(party) {
    newGame(party); audio.setVolumes(G.state.settings.music, G.state.settings.sfx);
    await this.saveNow();
    await this.toWorldMap();
    toast(t('Your journey begins. Enter Greenveil Forest!'), 'good');
  }
  async continueGame() { if (G.state.run) await this.enterStage(G.state.run.stageId); else await this.toWorldMap(); }
  async toWorldMap() {
    await transition(() => { this.disposeScene(); clearScreens(); if (!this.diorama) this.buildDiorama(); worldMapScreen(this); audio.music('world'); });
  }
  async enterStage(id) {
    const st = G.state; const fresh = !(st.run && st.run.stageId === id);
    await transition(() => { this.disposeScene(); clearScreens(); this.leaveDiorama(); this.scene = new ExploreScene(this, id, { fresh }); this.scene.build(); });
    if (!st.seenIntro[id]) { st.seenIntro[id] = true; touch(); await stageIntro(STAGE_BY_ID[id]); }
  }

  async startBattle(enc, cell) {
    const stage = this.sm.stage; const stageId = stage.id;
    this.disposeScene();
    let bs; let playing;
    await transition(async () => { clearScreens(); bs = new BattleScene(this, { stage, enc }); this.scene = bs; playing = bs.play(); await sleep(60); });
    const result = await playing;
    if (result === 'victory') {
      const r = this.sm.battleRewards(bs.battle, cell);
      await rewardsModal(r, enc.kind);
      await this.saveNow({ gap: enc.kind === 'boss' ? 0 : 3 * 60000 });
      if (enc.kind === 'boss') {
        this.sm.leave();
        await this.toWorldMap();
        if (stageId === 6 && r.first) await epilogue(this);
        else if (r.first) banner(t('New Realm Unlocked'), STAGE_BY_ID[Math.min(6, stageId + 1)].name, 'victory', 2200);
        return;
      }
    } else {
      const d = this.sm.onDefeat();
      await new Promise((res) => { const m = openModal(h('div.confirm', h('p', t('Your party was defeated and carried back to the entrance of {stage}. You lost {gold} gold. The heroes recover to half strength — cleared encounters stay cleared.', { stage: stage.name, gold: d.lost })), h('div.row.center', btn(t('Rise Again'), () => { m.close(); res(); }, { cls: 'primary' }))), { title: t('Defeat'), closable: false, cls: 'narrow' }); });
      await this.saveNow({ gap: 3 * 60000 });
    }
    await transition(() => { this.disposeScene(); clearScreens(); this.scene = new ExploreScene(this, stageId); this.scene.build(); });
  }
}

const app = new App();
window.__app = app; window.__G = G; window.__Net = Net; // handles for debugging and automated tests
app.boot();
