// Battle Scene — renders a Battle (combat.js) in the 3D world and provides the combat HUD:
// turn order, monster intents, hand with drag & drop, action slots, cooldown track.
import * as THREE from 'three';
import * as Hex from '../engine/hex.js';
import { h, sleep } from '../core/util.js';
import { t } from '../core/i18n.js';
const tr = t; // for scopes with a local variable named t
import { audio } from '../core/audio.js';
import { elColor } from '../engine/renderer.js';
import { castVfx, dashFx, blinkFx, critFx, poofFx, fxSheetsFor, ALWAYS_SHEETS } from '../engine/vfx.js';
import { preloadSheets, releaseSheets } from '../engine/pixfx.js';
import { Battle, DICE } from '../game/combat.js';
import { ACTION_SLOTS } from '../game/cardEngine.js';
import { G, cardLevel } from '../game/state.js';
import { ELEMENTS, STATUS_INFO, describeCard, diceText } from '../data/cards.js';
import { terrainOf } from '../data/terrain.js';
import { CONSUMABLES } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { MONSTERS } from '../data/monsters.js';
import { Coop } from '../net/coop.js';
import { bus } from '../core/util.js';
import { cardArt } from './cardArt.js';
import { ui, cardEl, unitSprite, statusChips, bar, btn, icon, toast, banner, openModal, diceChip, die } from './components.js';

// A monster attack reads as its dice plus the fixed bonus: drawn dice on the board, words in a sentence.
const pw = (i) => t('{n} dice', { n: i.dice || 1 }) + ' +' + i.power;
const pwEl = (i) => [...die(i.dice || 1), '+' + i.power + (i.hits > 1 ? '×' + i.hits : '')];
const INTENT_ICON = { strike: 'sword', shoot: 'arrow', aoe: 'meteor', guard: 'shield', buff: 'star', heal: 'cross', summon: 'skull', wait: 'orb' };

export class BattleScene {
  constructor(app, { stage, enc, seed = Date.now(), party = null }) {
    this.app = app; this.world = app.world; this.stage = stage; this.enc = enc;
    this.labels = new Map(); this.pending = null; this.inputOn = false; this.hoverCell = null; this.inspect = null;
    // co-op battles use the party snapshot every client received (each hero carries its card levels and potions)
    this.battle = new Battle({ stage, enemies: enc.enemies, kind: enc.kind, party: party ? JSON.parse(JSON.stringify(party)) : G.state.party, levelOf: cardLevel, inv: party ? null : G.state.inv, nextBuff: G.state.nextBuff, view: this, seed });
    // co-op lockstep: every hero action is a numbered command applied in the same order on every client
    this.cmdN = 0; this.remote = new Map(); this.applying = false;
    this.coop = Coop.active;
    if (this.coop) {
      for (const m of Coop.bbuf || []) if (m.seed === seed) this.remote.set(m.n, m); // commands that arrived before this scene
      Coop.bbuf = [];
      this._offs = [bus.on('coop:msg', (m) => { if (m.t === 'b' && m.seed === this.battle.seed) { this.remote.set(m.n, m); this.drain(); } }),
        bus.on('coop:players', () => this.ownersChanged())];
    }
  }

  // ───────── co-op ─────────
  // Whether this client may act for a hero unit.
  canControl(u) { return !this.coop || Coop.controls(u.hero?.owner); }
  ownerName(u) { return Coop.nameOf(u.hero?.owner); }
  consOf(u) { return u.hero?.owner ? (u.hero.cons ||= {}) : G.state.inv.cons; }
  ready(u = this.hero()) { return !!u && !!this.battle._endTurn && !this.battle.busy && !this.applying && !this.battle.result; }
  inputReady() { this.ownersChanged(); this.drain(); }
  ownersChanged() {
    if (!this.el) return;
    const u = this.hero();
    const can = !!u && this.ready(u) && this.canControl(u) && !this.remote.has(this.cmdN);
    if (can !== this.inputOn) { this.inputOn = can; if (!can) this.pending = null; this.renderHand(); this.refreshBoard(); }
    else this.setHint();
  }
  // Local action: publish it (co-op), then apply it.
  async act(cmd) {
    const u = this.hero(); if (!u) return;
    if (this.coop) Coop.send({ t: 'b', seed: this.battle.seed, n: this.cmdN, u: u.uid, ...cmd });
    await this.apply(cmd);
  }
  async apply(c) {
    const b = this.battle; const u = b.current;
    this.cmdN++; this.applying = true; this.inputOn = false; this.hoverCell = null; this.world.setHover(null);
    try {
      switch (c.k) {
        case 'move': await b.heroMove(u, { q: c.q, r: c.r }); break;
        case 'plan': {
          if (!b.plan(u, c.c, c.q == null ? null : { q: c.q, r: c.r })) { audio.sfx('error'); break; }
          let x = 0; for (let i = 0; i < (c.x || 0); i++) if (b.chargePlan(u, 1)) x++; // the charge chosen with the card comes in the same command
          audio.sfx('place'); const e = u.plan[u.plan.length - 1]; if (e?.inst.card.charge) this.showCharge(u, e.inst, x);
          break;
        }
        case 'unplan': if (b.unplan(u)) audio.sfx('close'); break;
        case 'charge': if (b.chargePlan(u, c.d)) audio.sfx(c.d > 0 ? 'place' : 'close'); else audio.sfx('error'); break;
        case 'exec': await b.execute(u); break;
        case 'end': await b.endHeroTurn(u); break;
        case 'item': await b.useItem(u, c.id); break;
        default: break;
      }
    } finally { this.applying = false; }
    if (!b.result) { this.renderHand(); this.refreshBoard(); }
    this.drain();
  }
  // Apply queued remote commands once the battle reaches the point they were made at.
  drain() {
    const c = this.remote.get(this.cmdN);
    if (!c) { this.ownersChanged(); return; }
    if (!this.ready() || this.battle.current?.uid !== c.u) return;
    this.remote.delete(this.cmdN);
    this.pending = null;
    this.apply(c);
  }

  // ───────── lifecycle ─────────
  async play() {
    const b = this.battle, w = this.world;
    w.clearBoard(); w.setEnvironment(this.stage);
    w.buildBoard(b.board.cells.values());
    for (const u of b.units) this.addUnit(u);
    const boss = b.kind === 'boss';
    // frame the camera on this board's own outline (every stage has a different shape and size)
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const c of b.board.cells.values()) { const p = Hex.toWorld(c.q, c.r); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    this.view = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, size: Math.max(19, (z1 - z0) * 0.78 + 14), offY: 0.05, yaw: 0, minWidth: (x1 - x0) + 13 };
    w.focus(this.view, 0);
    this.buildHud();
    this.bind();
    audio.music(boss ? 'boss' : 'battle');
    await Promise.race([preloadSheets(this.fxSheets(), w), sleep(4000)]); // the skill pictures this fight can show
    const result = await b.run();
    return result;
  }

  // Every effect sheet this fight may need: the heroes' decks, each monster's attacks (and what it can hatch or call), items.
  fxSheets() {
    const out = [...ALWAYS_SHEETS, ...fxSheetsFor({ cat: 'attack', el: 'fire', proj: 'fire' })]; // (the bomb and the turret)
    for (const u of this.battle.units) if (u.cards) for (const pile of [u.cards.draw, u.cards.hand]) for (const inst of pile) out.push(...fxSheetsFor(inst.card));
    const ids = new Set([...this.battle.units.filter((u) => u.def).map((u) => u.monsterId), ...(this.stage.pool || [])]);
    for (const id of ids) { // (a Set also walks the ids added while it is being walked)
      const m = MONSTERS[id]; if (!m) continue; (m.hatch || []).forEach((x) => ids.add(x));
      for (const it of [...(m.intents || []), ...(m.phase2 || [])]) {
        if (it.k === 'summon' && it.id) ids.add(it.id);
        const el = it.el || m.el || 'neutral';
        const card = it.k === 'aoe' ? { cat: 'attack', el, shape: it.shape, size: it.size } : it.k === 'strike' || it.k === 'shoot' ? { cat: 'attack', el, proj: (it.range || 1) > 1 ? el : null }
          : { cat: it.k === 'guard' ? 'defense' : it.k === 'summon' ? 'special' : 'buff', el, kind: it.k === 'guard' ? 'block' : it.k === 'heal' ? 'heal' : it.k === 'summon' ? 'summon' : undefined };
        out.push(...fxSheetsFor(card, true));
      }
    }
    return out;
  }

  dispose() {
    releaseSheets();
    this._offs?.forEach((off) => off());
    this.unbind();
    for (const l of this.labels.values()) { this.world.detach(l.anchor); this.world.detach(l.footAnchor); }
    this.labels.clear();
    this.hud?.remove();
    this.world.clearLayers(); this.world.setHover(null); this.world.setTurnRing(null);
  }

  addUnit(u) {
    const w = this.world; const b = this.battle;
    w.addUnit(u, b.cellsOf(u));
    const cls = (u.side === 'enemy' ? '.enemy' : '.ally') + (u.rank === 'mvp' ? '.mvp' : u.rank === 'mini' ? '.mini' : '');
    // over the head: what it is about to do, its statuses, and the stars that circle while it is stunned
    const el = h('div.unit-label' + cls, h('div.ul-inner', h('div.ul-intent'), h('div.ul-status'), h('div.ul-stun', h('i', '★'), h('i', '★'), h('i', '★'))));
    // under the feet: the HP bar, then the name of a hero or boss (plain text; in co-op a hero's name takes its player's colour)
    const foot = h('div.unit-label.foot' + cls, h('div.ul-foot', h('div.ul-row', h('div.ul-block'), h('div.ul-hp', h('div.ul-hp-ghost'), h('div.ul-hp-fill'))),
      u.hero || u.rank === 'mvp' || u.rank === 'mini' ? h('div.ul-name', { style: u.hero?.owner ? { color: Coop.colorOf(u.hero.owner) } : null }, u.name) : null));
    const anchor = w.attach(el, () => (u.alive ? w.unitPos(u.uid, u.construct ? 1.1 : u.nest ? 1.6 : 2.0) : null));
    const footAnchor = w.attach(foot, () => (u.alive ? w.unitPos(u.uid, 0) : null));
    this.labels.set(u.uid, { el, foot, anchor, footAnchor, u });
    this.syncLabel(u);
  }

  syncLabel(u) {
    const L = this.labels.get(u.uid); if (!L) return;
    const el = L.el; const foot = L.foot;
    el.querySelector('.ul-stun').classList.toggle('on', !!u.status.stun && u.alive);
    const pct = Math.max(0, (u.hp / u.maxHp) * 100) + '%';
    foot.querySelector('.ul-hp-fill').style.width = pct; foot.querySelector('.ul-hp-ghost').style.width = pct; // the pale ghost bar trails behind to show what a hit took
    const blk = foot.querySelector('.ul-block'); blk.textContent = u.block > 0 ? Math.round(u.block) : ''; blk.classList.toggle('on', u.block > 0);
    const st = el.querySelector('.ul-status'); st.replaceChildren(...statusChips(u));
    const it = el.querySelector('.ul-intent');
    if (u.intent && u.alive) {
      const i = u.intent; const val = i.power != null ? pwEl(i) : i.blockValue || (i.k === 'wait' && i.turns ? i.turns : '');
      it.className = 'ul-intent on k-' + i.k;
      it.replaceChildren(icon(INTENT_ICON[i.k], '#fff', 16), val ? h('b', ...[].concat(val)) : null);
      it.dataset.tip = this.intentText(u);
    } else { it.className = 'ul-intent'; it.replaceChildren(); }
  }
  syncAll() { for (const u of this.battle.units) this.syncLabel(u); this.renderParty(); this.renderInfo(); this.updateDanger(); }
  // ── impact feedback ──
  // A full-screen flash (hurt = red edges, crit = warm burst, kill = white), and a buzz on phones.
  screenFx(kind) { const el = h('div.screen-fx.' + kind); this.hud.appendChild(el); setTimeout(() => el.remove(), 520); }
  // Roll log (bottom right): the dice tray is gone in a moment, so each result stays here as a small line.
  logRoll(who, color, faces, total, notes = []) {
    const SYM = { crit: '✸', surge: '◈', star: '★' };
    const line = h('div.dl-line', h('i.dl-dot.' + color), h('b', who), h('span.dl-faces', ...die(), ' ' + faces.map((f) => (f.k ? SYM[f.k] : '') + f.v).join(' + ')), faces.length > 1 || notes.length ? h('span.dl-total', '= ' + total) : null, ...notes.map((n) => h('em', n)));
    this.el.log.appendChild(line);
    while (this.el.log.children.length > 6) this.el.log.firstChild.remove();
  }
  buzz(pattern) { try { navigator.vibrate?.(pattern); } catch (e) { /* not supported */ } }
  // The screen edges pulse red while one of your heroes is close to falling.
  updateDanger() { this.hud.classList.toggle('danger', this.battle.heroes().some((u) => this.canControl(u) && u.hp / u.maxHp <= 0.3)); }

  intentText(u) {
    const i = u.intent; if (!i) return '';
    const st = i.status ? t(' Applies {st}.', { st: STATUS_INFO[i.status.st].name }) : '';
    switch (i.k) {
      case 'strike': return t('{name}: melee attack for {p}{hits}.{st}', { name: i.name, p: pw(i), hits: i.hits > 1 ? ' ×' + i.hits : '', st });
      case 'shoot': return t('{name}: ranged attack (range {r}) for {p}.{st}', { name: i.name, r: i.range, p: pw(i), st });
      case 'aoe': return t('{name}: {shape} attack for {p}.{st}{warn}', { name: i.name, shape: t(i.shape), p: pw(i), st, warn: i.shape === 'area' ? t(' Target area is marked on the board — move out!') : '' });
      case 'guard': return t('{name}: gains {n} Block.', { name: i.name, n: i.blockValue });
      case 'buff': return t('{name}: grants {st} {n}{allies}.', { name: i.name, st: STATUS_INFO[i.st].name, n: i.n, allies: i.allies ? t(' to nearby allies') : '' });
      case 'heal': return t('{name}: heals a wounded ally.', { name: i.name });
      case 'summon': return u.nest ? t('{name}: a monster hatches this round. Destroy the nest to stop it.', { name: i.name }) : t('{name}: summons reinforcements.', { name: i.name });
      case 'wait': return i.full ? t('{name}: its brood is full. It hatches again when one falls.', { name: i.name }) : t('{name}: hatches a monster in {n} round(s). Destroy the nest to stop it.', { name: i.name, n: i.turns });
      default: return i.name;
    }
  }

  // ───────── HUD ─────────
  buildHud() {
    const b = this.battle;
    this.el = {
      order: h('div.turn-order'), round: h('div.round-label', t('Round {n}', { n: 1 })), party: h('div.b-party'), info: h('div.b-info'), log: h('div.dice-log'),
      hand: h('div.hand'), slots: h('div.slots'), energy: h('div.energy-orb'), cool: h('div.cooldown-track'), heroTag: h('div.hero-tag'),
      exec: btn(t('Execute'), () => this.execute(), { cls: 'primary exec', tip: t('Resolve the cards in your Action Slots (E)') }),
      end: btn(t('End Turn'), () => this.endTurn(), { cls: 'end', tip: t("End this hero's turn (Space)") }),
      undo: btn(t('Undo'), () => this.undo(), { cls: 'small', tip: t('Remove the last planned card') }),
      items: btn(t('Items'), () => this.openItems(), { cls: 'small', tip: t('Use a consumable (once per turn)') }),
      hint: h('div.b-hint'),
    };
    this.hud = h('div.battle-hud', this.el.log, this.world.camControls({ fit: true }),
      h('div.b-top', h('div.b-title', h('div.b-stage', this.stage.name), this.el.round), this.el.order),
      this.el.party, this.el.info, this.el.hint,
      h('div.b-bottom',
        h('div.b-left', this.el.heroTag),
        h('div.b-center', h('div.slots-wrap', h('div.slots-label', t('ACTION SLOTS')), this.el.slots), this.el.hand),
        h('div.b-right', h('div.cool-wrap', h('div.slots-label', t('COOLDOWN')), this.el.cool), h('div.b-buttons', this.el.undo, this.el.items, this.el.exec, this.el.end))),
    );
    ui().appendChild(this.hud);
    this.renderOrder(); this.renderParty(); this.renderHand(); void b;
  }

  renderOrder() {
    const b = this.battle;
    const list = b.order.length ? b.order.filter((u) => u.alive) : b.units.filter((u) => u.alive);
    this.el.order.replaceChildren(...list.map((u) => h('div.to-unit' + (u.side === 'enemy' ? '.enemy' : '.ally') + (u === b.current ? '.current' : '') + (u.rank === 'mvp' ? '.mvp' : ''),
      { 'data-tip': t('{name} — Speed {n}', { name: u.name, n: u.stats.spd }), onmouseenter: () => { this.inspect = u; this.renderInfo(); } },
      unitSprite(u, { size: 56, zoom: u.scale > 1.5 ? 1.0 : 1.25, oy: u.scale > 1.5 ? 0 : 0.12 }))));
    this.el.round.textContent = t('Round {n}', { n: Math.max(1, b.round) });
  }

  renderParty() {
    const b = this.battle;
    const heroes = b.units.filter((u) => u.hero);
    this.el.party.replaceChildren(...heroes.map((u) => h('div.p-card' + (u === b.current ? '.current' : '') + (u.alive ? '' : '.dead'), { onclick: () => { this.inspect = u; this.renderInfo(); } },
      h('div.p-portrait', unitSprite(u, { size: 64, zoom: 1.5, oy: 0.3 })),
      h('div.p-body', h('div.p-name', u.name, h('span', ` Lv ${u.level}`)), bar('hp', u.hp, u.maxHp), bar('mp', u.mp, u.maxMp),
        h('div.p-status', u.block > 0 ? h('span.status-chip.block', { 'data-tip': t('Block absorbs damage until your next turn.') }, '🛡', h('i', Math.round(u.block))) : null, ...statusChips(u))))));
  }

  renderInfo() {
    const u = this.inspect; const box = this.el.info;
    if (!u || !u.alive) { box.classList.remove('on'); return; }
    box.classList.add('on');
    const rows = [];
    if (u.def) {
      if (u.weak.length) rows.push(h('div.i-line.weak', t('Weak: '), ...u.weak.map((e) => h('span', { style: { color: ELEMENTS[e].color } }, ELEMENTS[e].name + ' '))));
      if (u.resist.length) rows.push(h('div.i-line.res', t('Resists: '), ...u.resist.map((e) => h('span', { style: { color: ELEMENTS[e].color } }, ELEMENTS[e].name + ' '))));
      if (u.intent) rows.push(h('div.i-intent', h('b', t('Intent — ')), this.intentText(u)));
    } else if (u.cls) rows.push(h('div.i-line', CLASSES[u.cls].role));
    box.replaceChildren(
      h('div.i-head', h('div.i-portrait', unitSprite(u, { size: 72, zoom: u.scale > 1.5 ? 1 : 1.3, oy: u.scale > 1.5 ? 0 : 0.14 })),
        h('div', h('div.i-name', u.name), h('div.i-sub', `Lv ${u.level}${u.rank === 'mvp' ? t(' · MVP BOSS') : u.rank === 'mini' ? t(' · Mini Boss') : ''}${u.phase === 2 ? t(' · ENRAGED') : ''}`))),
      bar('hp', u.hp, u.maxHp), u.maxMp ? bar('mp', u.mp, u.maxMp) : null,
      h('div.i-stats', h('span', { 'data-tip': t('Attack') }, `ATK ${Math.round(u.stats.atk)}`), u.hero ? h('span', `MATK ${Math.round(u.stats.matk)}`) : null, h('span', `DEF ${Math.round(u.stats.def)}`), h('span', t('MOV {n}', { n: u.stats.move })), u.block ? h('span.blk', t('Block {n}', { n: Math.round(u.block) })) : null),
      h('div.i-status', ...Object.entries(u.status).map(([st, s]) => h('div.i-st', { style: { color: STATUS_INFO[st].color } }, `${STATUS_INFO[st].icon} ${STATUS_INFO[st].name}${s.n > 1 ? ' ' + s.n : ''}`, h('small', STATUS_INFO[st].desc)))),
      ...rows);
  }

  hero() { const u = this.battle.current; return u && u.cards && u.alive ? u : null; }

  // A card that can be charged asks how hard to play it before it goes into a slot: the same card laid out
  // once per choice in the middle of the table. cb(extra) with the dice added, or cb(null) when called off.
  pickCharge(u, inst, cb) {
    const c = inst.card; const max = Math.min(2, u.energy - c.cost);
    if (!c.charge || max <= 0) return cb(0);
    const done = (x) => { wrap.remove(); this._pick = null; cb(x); };
    const opt = (x) => h('button.cp-opt', { disabled: x > max, onclick: () => done(x) }, cardEl(inst.id, inst.lv, { unit: u }),
      h('div.cp-tag', ...(x ? ['+', ...die(x)] : [t('Normal')])), h('div.cp-cost', t('{n} Action Slot(s)', { n: c.cost + x })));
    const wrap = h('div.charge-pick', { onpointerdown: (e) => { if (e.target === wrap) done(null); } },
      h('div.cp-title', t('{name} — how hard?', { name: c.name })), h('div.cp-row', opt(0), opt(1), opt(2)), h('div.cp-note', t('Each extra Action Slot adds one die. Click outside to take the card back.')));
    this.renderHand(); this.refreshBoard(); // the card goes back among the others while the choice is open
    this._pick = () => done(null); this.hud.appendChild(wrap); audio.sfx('open');
  }
  // Everyone at the table sees which choice was made: the card and its added dice, for a moment, mid-screen.
  showCharge(u, inst, x) {
    this.hud.querySelector('.charge-show')?.remove();
    const el = h('div.charge-show', cardEl(inst.id, inst.lv, { unit: u }), h('div.cp-tag', ...(x ? [u.name + ' +', ...die(x)] : [u.name + ' · ' + t('Normal')])));
    this.hud.appendChild(el); setTimeout(() => el.remove(), 1500);
  }
  planCard(inst, cell) {
    const u = this.hero(); if (!u) return;
    return new Promise((res) => this.pickCharge(u, inst, async (x) => {
      if (x == null) { this.renderHand(); this.refreshBoard(); return res(false); }
      await this.act({ k: 'plan', c: inst.uid, ...(cell ? { q: cell.q, r: cell.r } : {}), ...(x ? { x } : {}) }); res(true);
    }));
  }

  // The hero's cards that are not in hand, laid out to read: what is cooling down, what was discarded, what is left to draw.
  openPiles(u) {
    const face = (inst, tag = null) => h('div.pile-card', cardEl(inst.id, inst.lv, { unit: u }), tag ? h('b.pile-tag', tag) : null);
    const sec = (title, list, note = null) => h('div.piles-sec', h('h4', title, h('i', String(list.length))), note && list.length ? h('p', note) : null,
      list.length ? h('div.card-grid', ...list) : h('p.empty', t('No cards here.')));
    const byName = (a, b) => a.card.name.localeCompare(b.card.name);
    openModal(h('div.piles',
      sec(t('Cooling down'), [...u.cards.cooldown].sort((a, b) => a.left - b.left).map((e) => face(e.inst, t('{n} round(s)', { n: e.left }))), t('Back in the discard pile when the count runs out.')),
      sec(t('Discard pile'), [...u.cards.discard].sort(byName).map((i) => face(i)), t('Shuffled into the draw pile when it runs out.')),
      sec(t('Draw pile'), [...u.cards.draw].sort(byName).map((i) => face(i)), t('Listed by name, not in the order you will draw them.'))),
    { title: t("{name}'s cards", { name: u.name }), cls: 'wide piles-modal' });
  }

  renderHand(drawn = []) {
    const u = this.hero(); const E = this.el;
    const active = !!u && this.inputOn;
    this.hud.classList.toggle('my-turn', active);
    if (!u) { E.hand.replaceChildren(); E.slots.replaceChildren(); E.cool.replaceChildren(); E.energy.replaceChildren(); E.heroTag.replaceChildren(); return; }
    // hero tag + energy
    E.heroTag.replaceChildren(h('div.ht-portrait', unitSprite(u, { size: 84, zoom: 1.45, oy: 0.28 })), h('div.ht-name', u.name), h('div.ht-move' + (u.moved || u.plan.length ? '.used' : ''), u.status.root ? t('Rooted') : u.moved ? t('Moved') : t('Move {n}', { n: this.battle.moveBudget(u) })));
    E.energy.replaceChildren(h('div.eo-num', u.energy), h('div.eo-label', t('ENERGY')), h('div.eo-pips', ...Array.from({ length: Math.max(u.stats.energy, u.energy) }, (_, i) => h('i' + (i < u.energy ? '.on' : '')))));
    // hand
    const n = u.cards.hand.length;
    E.hand.replaceChildren(...u.cards.hand.map((inst, i) => {
      const el = cardEl(inst.id, inst.lv, { unit: u });
      const why = this.battle.whyNot(u, inst);
      el.dataset.uid = inst.uid;
      if (why) { el.classList.add('unplayable'); el.dataset.tip = why; }
      if (this.pending?.inst === inst) el.classList.add('selected');
      if (drawn.includes(inst)) { el.classList.add('drawn'); el.style.animationDelay = drawn.indexOf(inst) * 90 + 'ms'; }
      const mid = (n - 1) / 2; el.style.setProperty('--rot', (i - mid) * 3 + 'deg'); el.style.setProperty('--lift', Math.abs(i - mid) * 5 + 'px'); el.style.zIndex = 10 + i;
      el.appendChild(h('div.card-key', i + 1));
      el.addEventListener('pointerdown', (e) => this.cardDown(e, inst, el));
      el.addEventListener('pointerenter', () => this.cardHover(inst));
      el.addEventListener('pointerleave', () => this.cardHover(null));
      return el;
    }));
    // action slots
    const slots = [];
    // spent slots, then the planned cards (a card is as wide as the slots it takes; free cards are a small chip), then what is still open
    let sn = 0;
    for (let i = 0; i < u.slotsUsed; i++) slots.push(h('div.slot.spent', h("div.slot-n", ++sn), h("span", t("Spent"))));
    u.plan.forEach((e, pi) => {
      const c = e.inst.card; const last = pi === u.plan.length - 1;
      // Pointing at a planned card lifts the whole card out of its slot so it can be read. With a mouse,
      // clicking the last one takes it back; on touch a tap opens the card, which carries a Remove button.
      const touch = window.matchMedia('(hover: none)').matches;
      const peek = h('div.slot-peek', cardEl(e.inst.id, e.inst.lv, { unit: u }), last && touch ? h('button.mini.slot-remove', { onclick: (ev) => { ev.stopPropagation(); this.undo(); } }, t('Remove')) : null);
      const w = c.cost + (e.extra || 0);
      slots.push(h('div.slot.filled' + (last ? '.last' : '') + (w === 0 ? '.free' : w > 1 ? '.w' + Math.min(3, w) : '') + (e.extra ? '.charged' : ''), { style: { '--el': ELEMENTS[c.el].color, '--art': `url(${cardArt(e.inst.id)})` }, 'data-tip': last && !touch ? t('Click to remove') : null,
        onclick: (ev) => { if (touch) { const el = ev.currentTarget; const on = el.classList.contains('peek'); this.el.slots.querySelectorAll('.slot.peek').forEach((x) => x.classList.remove('peek')); if (!on) el.classList.add('peek'); } else if (last) this.undo(); } }, peek,
        h('div.slot-n', w === 0 ? '★' : w > 1 ? `${sn + 1}–${sn + w}` : sn + 1), icon(c.icon, '#fff', 30), h('div.slot-name', c.name, ...(e.extra ? [' +', ...die(e.extra)] : [])),
        null));
      sn += w;
    });
    for (let i = 0; i < u.energy; i++) slots.push(h('div.slot.empty' + (this.pending && i === 0 ? '.awaiting' : ''), h('div.slot-n', ++sn), h('span', this.pending && i === 0 ? t('Choose target') : t('Drop card'))));
    E.slots.replaceChildren(...slots);
    // cooldown track
    const piles = () => this.openPiles(u);
    E.cool.replaceChildren(...(u.cards.cooldown.length ? u.cards.cooldown.map((e) => h('div.cool-card', { onclick: piles, style: { '--el': ELEMENTS[e.inst.card.el].color, '--art': `url(${cardArt(e.inst.id)})` }, 'data-tip': t('{name} — ready in {n} round(s)', { name: e.inst.card.name, n: e.left }) }, icon(e.inst.card.icon, '#fff', 22), h('b', e.left))) : [h('div.cool-empty', '—')]),
      h('div.pile.discard', { onclick: piles, 'data-tip': t('Discard pile {n} — click to look', { n: u.cards.discard.length }) }, h('span', String(u.cards.discard.length)), h('small', t('DISCARD'))),
      h('div.pile', { onclick: piles, 'data-tip': t('Draw pile {n} — click to look', { n: u.cards.draw.length }) }, h('span', String(u.cards.draw.length)), h('small', t('DECK'))));
    E.exec.disabled = !active || !u.plan.length; E.end.disabled = !active; E.undo.disabled = !active || !u.plan.length;
    const cons = Object.values(this.consOf(u)).reduce((s, v) => s + v, 0);
    E.items.disabled = !active || u.itemUsed || !cons; E.items.querySelector('span').textContent = t('Items ({n})', { n: cons });
    this.setHint();
  }

  waitForHost() { if (this.el) { this.el.hint.textContent = tr('Waiting for the host…'); this.el.hint.classList.add('on'); } }
  setHint() {
    const u = this.hero(); let t = '';
    if (u && this.coop && !this.canControl(u)) t = tr("{player}'s turn — wait for them…", { player: this.ownerName(u) });
    else if (!u || !this.inputOn) t = this.battle.current && !this.battle.current.cards ? tr("{name}'s turn…", { name: this.battle.current.name }) : '';
    else if (this.pending) t = this.pending.T.mode === 'dir' ? tr('Choose a direction — right-click to cancel') : tr('Choose a target — right-click to cancel');
    else if (!u.moved && !u.plan.length && this.battle.moveBudget(u) > 0) t = (this.coop ? tr('Your turn') + ' · ' : '') + tr('Click a blue hex to move · Drag cards into Action Slots');
    else t = tr(u.plan.length ? 'Execute your plan, or add more cards' : 'Drag cards into Action Slots · End Turn when done');
    this.el.hint.textContent = t; this.el.hint.classList.toggle('on', !!t);
  }

  // ───────── board highlights ─────────
  refreshBoard() {
    const w = this.world, b = this.battle, u = this.hero();
    w.clearLayers(['telegraph']);
    this.refreshTelegraph();
    if (!u || !this.inputOn) return;
    if (this.pending) {
      const T = this.pending.T; const c = this.pending.inst.card;
      const col = c.tg === 'ally' ? 0x5fe08a : c.tg === 'hex' ? 0x4fb0ff : T.mode === 'dir' ? 0xffb347 : c.tg === 'enemy' ? 0xff5a4a : 0xffb347;
      w.setLayer('target', T.cells, { color: col, opacity: T.mode === 'hex' && c.tg === 'any' ? 0.16 : 0.42, pulse: 4 });
      this.refreshPreview();
    } else {
      const m = b.moveOptions(u);
      if (m) w.setLayer('move', [...m.costs.keys()].map(Hex.parseKey).filter((c) => !Hex.hexEq(c, u)), { color: 0x4fa8ff, opacity: 0.34 });
    }
    const proj = b.projected(u);
    if (u.plan.length && !Hex.hexEq(proj, u)) w.setLayer('proj', [proj], { color: 0x7ff0ff, opacity: 0.7, pulse: 6, y: 0.04 });
  }

  refreshTelegraph() {
    const b = this.battle; const cells = [];
    for (const e of b.enemies()) {
      const i = e.intent; if (!i || i.k !== 'aoe') continue;
      if (i.shape === 'area' && i.cells) cells.push(...i.cells);
      else if (i.shape === 'burst') cells.push(...Hex.spiral(e, i.size + (e.size === 7 ? 1 : 0)).filter((c) => b.cell(c) && !b.cellsOf(e).some((o) => Hex.hexEq(o, c))));
    }
    this.world.setLayer('telegraph', cells, { color: 0xff2a2a, opacity: 0.5, pulse: 5, y: 0.03, order: 3 });
  }

  refreshPreview() {
    const w = this.world, b = this.battle, u = this.hero();
    if (!this.pending || !u) { w.clearLayer('aoe'); return; }
    const c = this.pending.inst.card; const hc = this.hoverCell;
    const valid = hc && this.pending.T.cells.find((x) => x.q === hc.q && x.r === hc.r);
    if (!valid) { w.clearLayer('aoe'); return; }
    let cells;
    if (c.fx[0].t === 'move' && this.pending.T.prev) cells = Hex.pathFromPrev(this.pending.T.prev, b.projected(u), hc);
    else if (c.shape === 'single') cells = valid.uid ? b.cellsOf(b.units.find((x) => x.uid === valid.uid)) : [hc];
    else cells = b.preview(u, c, hc);
    w.setLayer('aoe', cells, { color: c.tg === 'ally' || c.allies ? 0x8affb0 : c.tg === 'hex' ? 0x9fd8ff : 0xffe066, opacity: 0.75, y: 0.05, order: 4 });
  }

  cardHover(inst) {
    if (this.pending || this.drag || !this.inputOn) return;
    const u = this.hero(); if (!u) return;
    if (!inst) { this.world.clearLayer('range'); return; }
    const c = inst.card; const T = this.battle.targetsFor(u, c);
    const cells = T.mode === 'none' ? (c.shape === 'burst' ? this.battle.preview(u, c, null) : [this.battle.projected(u)]) : T.cells;
    this.world.setLayer('range', cells, { color: c.tg === 'ally' || c.allies ? 0x5fe08a : c.tg === 'hex' ? 0x9fd8ff : 0xff8a5a, opacity: 0.22, y: 0.025 });
  }

  // ───────── input ─────────
  bind() {
    const cv = this.world.canvas;
    this._move = (e) => this.pointerMove(e);
    this._down = (e) => this.pointerDown(e);
    this._ctx = (e) => { e.preventDefault(); if (this.world.orbitMoved) { this.world.orbitMoved = false; return; } this.cancelPending(); }; // a right-drag turned the camera
    this._key = (e) => this.key(e);
    cv.addEventListener('pointermove', this._move); cv.addEventListener('pointerdown', this._down); cv.addEventListener('contextmenu', this._ctx);
    window.addEventListener('keydown', this._key);
  }
  unbind() {
    const cv = this.world.canvas;
    cv.removeEventListener('pointermove', this._move); cv.removeEventListener('pointerdown', this._down); cv.removeEventListener('contextmenu', this._ctx);
    window.removeEventListener('keydown', this._key);
  }

  pickAt(e) { return this.world.pick(e.clientX, e.clientY, { units: this.battle.units.filter((u) => u.alive) }); }

  pointerMove(e) {
    const p = this.pickAt(e);
    const cell = p ? { q: p.q, r: p.r } : null;
    if ((cell && this.hoverCell && Hex.hexEq(cell, this.hoverCell)) || (!cell && !this.hoverCell)) return;
    this.hoverCell = cell;
    this.world.setHover(cell, this.pending ? 0xffe066 : 0xffffff);
    const u = cell ? (p.unit || this.battle.unitAt(cell)) : null;
    if (u) { this.inspect = u; this.renderInfo(); }
    else if (cell) {
      const t = terrainOf(this.battle.cell(cell)?.t);
      this.el.hint.textContent = t.desc ? tr('{name} — {desc}', { name: t.name, desc: t.desc }) : this.el.hint.textContent; if (!t.desc) this.setHint(); else this.el.hint.classList.add('on');
    }
    this.refreshPreview();
  }

  async pointerDown(e) {
    if (e.button !== 0) return;
    audio.init();
    const u = this.hero(); if (!u || !this.inputOn || this.battle.busy) return;
    const p = this.pickAt(e); if (!p) { this.cancelPending(); return; }
    if (this.pending) { await this.tryTarget(p); return; }
    const m = this.battle.moveOptions(u);
    if (m && m.costs.has(Hex.key(p.q, p.r)) && !Hex.hexEq(p, u)) {
      this.inputOn = false; this.world.clearLayers(['telegraph']);
      await this.act({ k: 'move', q: p.q, r: p.r });
    }
  }

  async tryTarget(p) {
    const u = this.hero(); const pend = this.pending; if (!u || !pend) return false;
    let cell = pend.T.cells.find((c) => c.q === p.q && c.r === p.r);
    if (!cell && p.unit) cell = pend.T.cells.find((c) => c.uid === p.unit.uid);
    if (!cell) { audio.sfx('error'); return false; }
    this.pending = null;
    if (!this.battle.canPlan(u, pend.inst.uid, cell)) { audio.sfx('error'); this.renderHand(); this.refreshBoard(); return true; }
    await this.planCard(pend.inst, cell);
    return true;
  }

  cancelPending() { if (!this.pending) return; this.pending = null; this.renderHand(); this.refreshBoard(); }

  choose(inst, dropPoint = null) {
    const u = this.hero(); if (!u || !this.inputOn || this.battle.busy) return;
    const why = this.battle.whyNot(u, inst);
    if (why) { toast(why, 'bad'); audio.sfx('error'); return; }
    const T = this.battle.targetsFor(u, inst.card);
    this.world.clearLayer('range');
    if (T.mode === 'none') {
      this.pending = null;
      if (this.battle.canPlan(u, inst.uid, null)) this.planCard(inst, null);
      return;
    }
    if (!T.cells.length) { toast(t(inst.card.tg === 'hex' ? 'No valid destination' : 'No valid target in range'), 'bad'); audio.sfx('error'); this.cancelPending(); return; }
    this.pending = { inst, T };
    this.renderHand(); this.refreshBoard();
    if (dropPoint) { const p = this.world.pick(dropPoint.x, dropPoint.y, { units: this.battle.units.filter((x) => x.alive) }); if (p) this.tryTarget(p); }
  }

  cardDown(e, inst, el) {
    if (e.button !== 0 || !this.inputOn || this.battle.busy) return;
    e.preventDefault(); audio.init();
    const sx = e.clientX, sy = e.clientY; const rect = el.getBoundingClientRect();
    let dragging = false; let ghost = null;
    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!dragging && Math.hypot(dx, dy) > 8) {
        dragging = true; this.drag = inst; this.cardHover(null); this.drag = inst;
        ghost = el.cloneNode(true); ghost.classList.add('drag-ghost'); ghost.classList.remove('drawn', 'selected');
        ghost.style.width = rect.width + 'px'; ghost.style.height = rect.height + 'px';
        document.getElementById('game').appendChild(ghost); el.classList.add('drag-src');
        // preview valid targets while dragging
        const u = this.hero(); if (u && !this.battle.whyNot(u, inst)) { const T = this.battle.targetsFor(u, inst.card); if (T.mode !== 'none') { this.pending = { inst, T, dragging: true }; this.refreshBoard(); } }
        this.hud.classList.add('dragging');
      }
      if (dragging) {
        ghost.style.transform = `translate(${ev.clientX - rect.width / 2}px, ${ev.clientY - rect.height * 0.6}px) rotate(${Math.max(-12, Math.min(12, dx * 0.04))}deg) scale(${ev.clientY < this.el.hand.getBoundingClientRect().top ? 0.62 : 1})`;
        const p = this.world.pick(ev.clientX, ev.clientY, { units: this.battle.units.filter((x) => x.alive) });
        this.hoverCell = p ? { q: p.q, r: p.r } : null; this.world.setHover(this.hoverCell, 0xffe066); this.refreshPreview();
      }
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
      this.drag = null; this.hud.classList.remove('dragging');
      if (ghost) ghost.remove(); el.classList.remove('drag-src');
      if (!dragging) { if (this.pending?.inst === inst) this.cancelPending(); else this.choose(inst); return; }
      const wasPending = this.pending; this.pending = null;
      const handTop = this.el.hand.getBoundingClientRect().top;
      if (ev.clientY < handTop - 4) this.choose(inst, wasPending ? { x: ev.clientX, y: ev.clientY } : null);
      else { this.renderHand(); this.refreshBoard(); }
    };
    // if the browser takes a touch drag away (pointercancel), the card goes back to the hand
    const cancel = () => { const was = dragging; dragging = true; up({ clientX: 0, clientY: Infinity }); if (!was) { this.renderHand(); this.refreshBoard(); } };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  }

  key(e) {
    if (e.repeat || document.querySelector('.modal-wrap')) return;
    if (this._pick) { if (e.key === 'Escape') this._pick(); return; }
    if (e.key === 'Escape') this.cancelPending();
    else if (e.key === 'ArrowLeft') this.world.rotateBy(-1);
    else if (e.key === 'ArrowRight') this.world.rotateBy(1);
    else if (e.code === 'Space') { e.preventDefault(); this.endTurn(); }
    else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') this.execute();
    else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') this.undo();
    else if (/^[1-9]$/.test(e.key)) { const u = this.hero(); const inst = u?.cards.hand[+e.key - 1]; if (inst) this.choose(inst); }
  }

  undo() { const u = this.hero(); if (!u || !this.inputOn || this.battle.busy || !u.plan.length) return; this.pending = null; this.act({ k: 'unplan' }); }

  async execute() {
    const u = this.hero(); if (!u || !this.inputOn || this.battle.busy || !u.plan.length) return;
    this.pending = null; this.inputOn = false; this.world.clearLayers(['telegraph']); this.renderHand();
    await this.act({ k: 'exec' });
  }

  async endTurn() {
    const u = this.hero(); if (!u || !this.inputOn || this.battle.busy) return;
    this.pending = null; this.inputOn = false; this.world.clearLayers(['telegraph']); this.renderHand();
    await this.act({ k: 'end' });
  }

  openItems() {
    const u = this.hero(); if (!u || !this.inputOn) return;
    const list = Object.entries(this.consOf(u)).map(([id, n]) => { const c = CONSUMABLES[id];
      return h('div.item', { style: { '--rar': c.color }, onclick: async () => { m.close(); if (!this.inputOn || u.itemUsed) return; this.inputOn = false; await this.act({ k: 'item', id }); } },
        h('div.item-icon', icon(c.icon, c.color, 34)), h('div.item-info', h('div.item-name', c.name), h('div.item-sub', c.desc)), h('div.item-tag', '×' + n)); });
    const m = openModal(h('div.item-list', ...list), { title: t('Use Item — {name}', { name: u.name }), cls: 'narrow' });
  }

  // ───────── view: battle event handler ─────────
  async handle(type, d) {
    const w = this.world, b = this.battle;
    const pos = (u, up = 1) => w.unitPos(u.uid, up);
    switch (type) {
      case 'start': {
        if (b.kind === 'boss') {
          const boss = b.units.find((u) => u.rank === 'mvp'); const bp = pos(boss, 0);
          audio.sfx('boss');
          await w.focus({ x: bp.x, z: bp.z + 0.5, size: 10 }, 900);
          audio.sfx('roar'); w.shake(0.5, 900); w.ring(bp, elColor(boss.el), 5, 900); w.playOnce(boss.uid, 'cast');
          await banner(boss.name, `“${boss.def.quote}”`, 'boss', 2600);
          await w.focus(this.view, 800);
        } else await banner(t(b.kind === 'mini' ? 'Mini Boss' : 'Battle'), b.enemies().map((e) => e.name).filter((n, i, a) => a.indexOf(n) === i).join(' · '), b.kind === 'mini' ? 'mini' : '', 1100);
        break;
      }
      case 'round': {
        this.renderOrder(); this.syncAll(); this.refreshTelegraph();
        if (d.round > 1) { audio.sfx('turn'); await banner(t('Round {n}', { n: d.round }), '', 'round', 650); }
        break;
      }
      case 'turnStart': {
        w.setTurnRing(d.unit.uid); this.renderOrder(); this.syncAll(); this.inputOn = false; this.renderHand();
        if (!d.unit.cards) await sleep(260);
        break;
      }
      case 'heroTurn': {
        audio.sfx('turn'); this.inspect = d.unit; this.inputOn = false; // enabled by inputReady() once the battle waits for input
        if (this.coop) toast(this.canControl(d.unit) ? tr('Your turn — {name}', { name: d.unit.name }) : tr("{player}'s turn — {name}", { player: this.ownerName(d.unit), name: d.unit.name }), this.canControl(d.unit) ? 'good' : '');
        d.drawn.forEach((_, i) => setTimeout(() => audio.sfx('draw'), i * 90));
        this.renderHand(d.drawn); this.syncAll(); this.refreshBoard();
        break;
      }
      case 'refresh': this.syncAll(); break;
      case 'turnEnd': { this.syncAll(); if (d.unit.cards) { this.inputOn = false; this.pending = null; w.clearLayers(['telegraph']); this.renderHand(); } break; }
      case 'move': {
        const u = d.unit; let prev = { q: u.q, r: u.r };
        const steps = d.path.map((c) => { const s = { pos: w.footPos(b.cellsOf(u, c)), dir: Hex.directionTo(prev, c) }; prev = c; return s; });
        await w.moveUnit(u.uid, steps, { stepMs: u.size > 1 ? 260 : 170, hop: u.size > 1 ? 0.3 : 0.16 });
        if (u.size > 1) w.shake(0.12, 150);
        break;
      }
      case 'teleport': { audio.sfx('magic'); blinkFx(w, pos(d.unit, 0.02), elColor(d.el)); w.burst(pos(d.unit), { color: elColor(d.el), count: 18 }); w.units.get(d.unit.uid).mat.opacity = 0; await sleep(140); break; }
      case 'teleportIn': { w.placeUnit(d.unit.uid, b.cellsOf(d.unit)); w.burst(pos(d.unit), { color: elColor(d.el), count: 18 }); blinkFx(w, pos(d.unit, 0.02), elColor(d.el)); await w.fadeIn(d.unit.uid, 220); break; }
      case 'dash': { audio.sfx('wind'); w.setFacing(d.unit.uid, Hex.directionTo(d.unit, d.to)); w.setAnim(d.unit.uid, 'walk'); const p0 = pos(d.unit, 0.5); const p1 = w.footPos(b.cellsOf(d.unit, d.to)); dashFx(w, pos(d.unit, 0), p1); await w.leapUnit(d.unit.uid, p1, 230, 0.5); w.setAnim(d.unit.uid, 'idle'); w.burst(p0, { color: 0xffffff, count: 8, speed: 1.5 }); break; }
      case 'shove': { await w.leapUnit(d.unit.uid, w.footPos(b.cellsOf(d.unit, d.to)), 200, 0.35); w.burst(pos(d.unit, 0.1), { color: 0xd0c0a0, count: 6, speed: 1.5, up: 0.6 }); break; }
      case 'cardPlay': {
        const slot = this.el.slots.querySelector('.slot.filled:not(.firing)') || this.el.slots.querySelector('.slot.empty'); if (slot) slot.classList.add('firing');
        w.floatText(pos(d.unit, 2.5), d.card.name + '!', 'card-name');
        if (d.combo) { w.floatText(pos(d.unit, 2.7), t('COMBO!'), 'combo'); audio.sfx('buff'); }
        await sleep(160);
        break;
      }
      case 'dice': await this.showDice(d); break;
      case 'cast': await this.castFx(d); break;
      case 'hit': {
        const { tgt, dmg, blocked, crit, el, tags, dot, killed } = d;
        const p = pos(tgt, 1.1);
        if (dmg > 0) {
          // every blow answers on several channels at once; how hard depends on how much it took
          const sev = dmg / tgt.maxHp; const heavy = crit || killed || sev >= 0.25; const onHero = tgt.side === 'hero' && !tgt.construct;
          w.hitFlash(tgt.uid, heavy, d.src && d.src !== tgt ? pos(d.src, 0) : null);
          const num = w.floatText(pos(tgt, 1.6), (crit ? '✦ ' : '') + dmg, `dmg el-${el}${crit ? ' crit' : ''}${dot ? ' dot' : ''}${tgt.side === 'hero' ? ' on-ally' : ''}`);
          if (!dot) num.style.fontSize = (crit ? 2.8 : 1.9) * Math.min(1.9, 0.85 + sev * 2.4) + 'em';
          w.burst(p, { color: elColor(el), count: crit ? 26 : dot ? 6 : heavy ? 18 : 12, speed: crit ? 5 : heavy ? 4 : 3 });
          if (heavy && !dot) w.ring(pos(tgt, 0.1), elColor(el), crit ? 1.8 : 1.2, 260);
          if (crit && !dot) critFx(w, p);
          audio.sfx(crit ? 'crit' : dot ? (el === 'fire' ? 'fire' : 'poison') : 'hit');
          if (!dot) {
            if (heavy || onHero) w.shake(crit ? 0.45 : killed ? 0.32 : onHero ? 0.2 : 0.25, crit ? 320 : 240);
            if (crit || killed) w.punch(crit ? 0.07 : 0.045);
            if (crit) this.screenFx('crit'); else if (onHero) this.screenFx('hurt');
            if (onHero) this.buzz(heavy ? [30, 40, 60] : 35); else if (crit) this.buzz(25);
            await w.hitStop(crit ? 120 : killed ? 95 : onHero ? 45 : heavy ? 75 : 35);
          }
        } else if (blocked > 0) { w.floatText(pos(tgt, 1.6), t('Blocked'), 'blocked'); audio.sfx('block'); w.burst(p, { color: 0x9fc8ff, count: 12, speed: 3 }); w.ring(pos(tgt, 0.1), 0x9fc8ff, 1.1, 220); w.shake(0.1, 140); await w.hitStop(45); }
        if (blocked > 0 && dmg > 0) w.floatText(pos(tgt, 2.0), t('-{n} block', { n: blocked }), 'blocked small');
        { const roll = tags.find((x) => x.startsWith('🎲')); if (roll && d.src) this.logRoll(d.src.name, 'grey', [{ v: +roll.replace(/\D/g, '') }], +roll.replace(/\D/g, '')); }
        tags.forEach((t, i) => setTimeout(() => { const roll = t.startsWith('🎲'); // a roll is written as a drawn die and its number
          const el = w.floatText(pos(tgt, 2.2 + i * 0.35), roll ? t.replace('🎲', '') : tr(t), d.combo && t.startsWith(d.combo) ? 'combo' : 'tag'); if (roll) el.prepend(...die()); }, 90 * (i + 1)));
        if (d.combo) { audio.sfx('magic'); w.ring(pos(tgt, 0.1), elColor(el), 2); }
        this.syncLabel(tgt); this.renderParty(); this.updateDanger(); if (this.inspect === tgt) this.renderInfo();
        await sleep(killed ? 60 : dot ? 240 : 170);
        break;
      }
      case 'miss': { w.floatText(pos(d.tgt, 1.6), t('Miss'), 'miss'); audio.sfx('miss'); await sleep(180); break; }
      case 'heal': { if (d.amount > 0) { w.floatText(pos(d.tgt, 1.6), '+' + d.amount, 'heal'); w.rise(pos(d.tgt, 0.2), { color: 0x7fffa0, count: 12 }); audio.sfx('heal'); } this.syncLabel(d.tgt); this.renderParty(); this.updateDanger(); await sleep(200); break; }
      case 'block': { w.floatText(pos(d.unit, 1.6), t('+{n} Block', { n: d.amount }), 'blocked'); w.ring(pos(d.unit, 0.1), 0x9fc8ff, 1.2, 300); audio.sfx('block'); this.syncLabel(d.unit); this.renderParty(); await sleep(170); break; }
      case 'status': {
        const info = STATUS_INFO[d.st];
        w.floatText(pos(d.unit, 1.9), `${info.icon} ${info.name}`, 'status' + (info.debuff ? ' debuff' : ' buffed'));
        w.rise(pos(d.unit, 0.3), { color: new THREE.Color(info.color).getHex(), count: 7, speed: 1.2 });
        if (!info.debuff) audio.sfx('buff'); else if (d.st === 'frozen' || d.st === 'chill') audio.sfx('ice');
        this.syncLabel(d.unit); this.renderParty(); await sleep(150); break;
      }
      case 'text': { w.floatText(pos(d.unit, 1.9), d.text, 'note'); await sleep(260); break; }
      case 'death': {
        const u = d.unit; audio.sfx(u.rank === 'mvp' ? 'explosion' : 'death');
        const L = this.labels.get(u.uid); if (L) { w.detach(L.anchor); w.detach(L.footAnchor); this.labels.delete(u.uid); }
        const p = pos(u, 0.8);
        // the MVP's brood scatters with it: a quick puff each, no fanfare
        if (d.rout) { w.burst(p, { color: 0xc0a0ff, count: 10, speed: 3 }); w.fadeOut(u.uid, 300); await sleep(90); break; }
        // the blow that ends the fight plays out in slow motion
        if (u.side === 'enemy' && (!b.enemies().length || (u.rank === 'mvp' && b.kind === 'boss'))) { w.slowMo(0.3, 700); this.screenFx('kill'); w.punch(0.09, 700); this.buzz([40, 50, 90]); }
        if (u.side === 'enemy') w.floatText(pos(u, 2.4), t('KO!'), 'ko');
        if (u.rank === 'mvp') { w.shake(0.7, 1200); for (let i = 0; i < 6; i++) { w.burst(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 2)), { color: elColor(u.el), count: 20, speed: 5 }); audio.sfx('explosion'); await sleep(170); } w.ring(pos(u, 0), 0xffffff, 8, 900); }
        w.burst(p, { color: u.side === 'enemy' ? 0xc0a0ff : 0xff6060, count: 20, speed: 3.5 });
        if (u.side === 'enemy' && u.rank !== 'mvp') poofFx(w, p, Math.max(1, (u.scale || 1) * 0.9));
        w.rise(p, { color: 0xffffff, count: 10 });
        await w.fadeOut(u.uid, u.rank === 'mvp' ? 1100 : 480);
        this.renderOrder(); this.renderParty(); if (this.inspect === u) { this.inspect = null; this.renderInfo(); }
        this.refreshTelegraph();
        break;
      }
      case 'spawn': {
        const u = d.unit; this.addUnit(u); audio.sfx(d.revive ? 'holy' : 'magic');
        w.ring(pos(u, 0), d.revive ? 0xfff0a0 : elColor(u.el), 1.6); w.rise(pos(u, 0.2), { color: d.revive ? 0xfff0a0 : elColor(u.el), count: 16 });
        await w.fadeIn(u.uid, 380); this.renderOrder(); this.renderParty(); break;
      }
      case 'phase': {
        const u = d.unit; audio.sfx('roar'); w.shake(0.6, 900); w.playOnce(u.uid, 'cast');
        w.ring(pos(u, 0), 0xff3030, 7, 900); w.burst(pos(u, 1), { color: 0xff4040, count: 40, speed: 6 });
        audio.music('boss');
        await banner(t('ENRAGED'), t('{name} unleashes its true power!', { name: u.name }), 'boss enrage', 1700);
        this.syncAll(); break;
      }
      case 'intent': case 'intentDone': { this.syncLabel(d.unit); this.refreshTelegraph(); if (this.inspect === d.unit) this.renderInfo(); break; }
      case 'cardSpent': case 'draw': { if (d.drawn) d.drawn.forEach((_, i) => setTimeout(() => audio.sfx('draw'), i * 90)); this.renderHand(d.drawn || []); this.syncAll(); break; }
      case 'item': { audio.sfx('heal'); w.floatText(pos(d.unit, 2.2), CONSUMABLES[d.id].name, 'card-name'); await sleep(200); break; }
      case 'end': {
        this.inputOn = false; this.renderHand(); w.clearLayers(); w.setTurnRing(null);
        audio.stopMusic();
        if (d.result === 'victory') { audio.sfx('victory'); b.heroes().forEach((u) => { w.playOnce(u.uid, 'cast'); w.rise(pos(u, 0.2), { color: 0xffe080, count: 14 }); [0xffe080, 0x7fd0ff, 0xff8ad0, 0x9affb0].forEach((c, i) => setTimeout(() => w.burst(pos(u, 1.6 + Math.random()), { color: c, count: 16, speed: 4.5, gravity: 3, life: 900 }), 180 * i)); }); await banner(t('VICTORY'), b.kind === 'boss' ? t('{stage} is liberated', { stage: this.stage.name }) : '', 'victory', 1700); }
        else { audio.sfx('defeat'); await banner(t('DEFEAT'), t('The party has fallen…'), 'defeat', 2000); }
        break;
      }
      default: break;
    }
  }

  // Dice tray: shows the card's dice formula, the dice tumble and land one by one, then the total. Click to skip.
  async showDice({ dice, card, unit }) {
    const SYM = { crit: '✸', surge: '◈', star: '★' };
    const faceEl = (f) => [h('span', String(f.v)), f.k ? h('i', SYM[f.k]) : null];
    const faces = DICE[dice.color];
    const els = dice.faces.map(() => h(`div.die.${dice.color}.rolling`, h('span')));
    const flat = describeCard(card, unit).text.match(/⟦\w+:\d+⟧ \+ (\d+)/)?.[1];
    const head = h('div.dice-head', h('b', card.name), h('span', diceChip(dice.color, dice.faces.length), flat ? ` + ${flat}` : ''));
    const parts = [];
    const what = dice.color === 'green' ? t('Rolled {n}', { n: dice.total }) : t('Rolled {n} damage', { n: dice.total });
    parts.push(dice.stars ? `${dice.faces.map((f) => f.v).join(' + ')} ×${1 + dice.stars} = ${dice.total}` : `${dice.faces.map((f) => f.v).join(' + ')} = ${dice.total}`);
    if (dice.crit) parts.push(t('Critical!'));
    if (dice.surge) parts.push(t('+{n} status stacks', { n: dice.surge }));
    if (dice.stars) parts.push(t('Bonus doubled!'));
    if (dice.match) parts.push(t('Match +{n}', { n: dice.match }));
    if (dice.push) parts.push(t('Impact: +{n} knockback', { n: dice.push }));
    if (dice.charge) parts.push(t('Charged +{n} dice', { n: dice.charge }));
    const sum = h('div.dice-sum', h('div.ds-total', what), h('div.ds-parts', parts.join(' · ')));
    const tray = h(`div.dice-tray.${dice.color}`, head, h('div.dice-row', ...els), sum);
    let skip = false; tray.addEventListener('pointerdown', () => { skip = true; });
    this.hud.appendChild(tray);
    const wait = async (ms) => { const end = performance.now() + ms; while (!skip && performance.now() < end) await sleep(30); };
    const spin = setInterval(() => els.forEach((el) => { if (el.classList.contains('rolling')) el.replaceChildren(...faceEl(faces[Math.floor(Math.random() * faces.length)])); }), 90);
    await wait(500); // read the formula first
    audio.sfx('dice');
    await wait(950);
    for (let i = 0; i < els.length; i++) {
      const el = els[i]; const f = dice.faces[i];
      el.classList.remove('rolling'); el.replaceChildren(...faceEl(f));
      el.classList.add('landed', f.v === 0 ? 'f-blank' : 'f-' + (f.k || 'num'));
      tray.classList.remove('thump'); void tray.offsetWidth; tray.classList.add('thump'); // the tray jolts as each die lands
      if (f.k === 'crit' || f.k === 'star') { this.screenFx('crit'); this.buzz(30); this.world.shake(0.18, 200); }
      audio.sfx(f.v === 0 ? 'place' : f.k === 'crit' || f.k === 'star' ? 'crit' : 'coin');
      await wait(480);
    }
    clearInterval(spin);
    tray.classList.add('done');
    await wait(dice.crit || dice.stars ? 1500 : 1200);
    this.logRoll(card.name, dice.color, dice.faces, dice.total, [dice.crit ? t('Critical!') : null, dice.surge ? t('+{n} status stacks', { n: dice.surge }) : null, dice.stars ? t('Bonus doubled!') : null, dice.match ? t('Match +{n}', { n: dice.match }) : null, dice.push ? t('Impact: +{n} knockback', { n: dice.push }) : null].filter(Boolean));
    tray.classList.add('out'); setTimeout(() => tray.remove(), 300);
  }

  async castFx(d) {
    if (d.monster) this.world.floatText(this.world.unitPos(d.unit.uid, 2.5), d.card.name + '!', 'card-name enemy');
    await castVfx(this.world, d);
  }
}
