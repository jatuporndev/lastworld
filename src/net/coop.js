// Online co-op — a host shares their campaign in a room; friends join with a room code and each
// controls one hero of the host's party. Firebase Realtime Database, no server code.
//
//  rooms/{code}
//    host: uid · created: ms
//    players/{uid}: { name, joined, hero } — each player brings one character; `hero` is its
//                                      latest snapshot (stats, deck card levels, potions)
//    log/{pushId}: message           — ordered stream: host → everyone (scenes, walks, loot…)
//                                      and battle commands from whoever controls the acting hero
//    pings/{uid}: { q, r, ts }       — "let's go this way" markers on the exploration map
//
// Battles run in lockstep: every client simulates the same seeded Battle and applies the same
// ordered player commands, so only inputs travel over the network.
import { Net } from './firebase.js';
import { bus } from '../core/util.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code5 = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
export const PLAYER_COLORS = ['#ffd24a', '#6fd0ff', '#ff7ab0', '#8fe07a'];

export const Coop = {
  code: null, role: null, me: null, hostId: null,
  players: {}, _offs: [], _fd: null,
  get active() { return !!this.code; },
  get isHost() { return this.role === 'host'; },
  get isGuest() { return this.role === 'guest'; },

  _ref(p = '') { return this._fd.ref(Net._db, `rooms/${this.code}${p}`); },
  async _ready() {
    if (!Net.online) throw new Error('offline');
    if (!Net.user) await Net.signInGuest();
    for (let i = 0; i < 40 && !Net.user; i++) await new Promise((r) => setTimeout(r, 100));
    if (!Net.user) throw new Error('auth');
    this._fd = Net._fd; this.me = Net.user.uid;
  },

  async create(name, hero) {
    await this._ready();
    const fd = this._fd; Net.hold();
    try {
      let code = null;
      for (let i = 0; i < 6 && !code; i++) { const c = code5(); const s = await fd.get(fd.ref(Net._db, `rooms/${c}/host`)); if (!s.exists()) code = c; }
      if (!code) throw new Error('busy');
      this.code = code; this.role = 'host'; this.hostId = this.me;
      await fd.set(this._ref(), { host: this.me, created: fd.serverTimestamp(), players: { [this.me]: { name, joined: fd.serverTimestamp(), hero } } });
      fd.onDisconnect(this._ref()).remove(); // the room closes if the host drops
      this._listen();
      return code;
    } catch (e) { this._reset(); throw e; }
  },

  async join(code, name, hero) {
    await this._ready();
    const fd = this._fd; code = code.trim().toUpperCase(); Net.hold();
    try {
      const host = await fd.get(fd.ref(Net._db, `rooms/${code}/host`));
      if (!host.exists()) throw new Error('noroom');
      if (host.val() === this.me) throw new Error('self');
      const ps = await fd.get(fd.ref(Net._db, `rooms/${code}/players`));
      if (Object.keys(ps.val() || {}).filter((id) => id !== this.me).length >= 3) throw new Error('full');
      this.code = code; this.role = 'guest'; this.hostId = host.val();
      // start reading the log from "now" so a late joiner doesn't replay history
      this._from = fd.push(this._ref('/log')).key;
      this._listen();
      await fd.set(this._ref(`/players/${this.me}`), { name, joined: fd.serverTimestamp(), hero });
      fd.onDisconnect(this._ref(`/players/${this.me}`)).remove();
      fd.onDisconnect(this._ref(`/pings/${this.me}`)).remove();
      return code;
    } catch (e) { this._reset(); throw e; }
  },

  _listen() {
    const fd = this._fd; const on = (r, ev, fn) => this._offs.push(ev === 'value' ? fd.onValue(r, fn) : fd.onChildAdded(r, fn));
    on(this._ref('/players'), 'value', (s) => {
      const before = this.players; this.players = s.val() || {};
      if (this.isHost) {
        for (const id of Object.keys(this.players)) if (!before[id] && id !== this.me) bus.emit('coop:join', id);
        for (const id of Object.keys(before)) if (!this.players[id]) bus.emit('coop:left', id);
      }
      if (this.isGuest && !this._leaving && before[this.me] && !this.players[this.me]) { this._reset(); bus.emit('coop:closed', 'kicked'); return; }
      bus.emit('coop:players');
    });
    on(this._ref('/host'), 'value', (s) => { if (!s.exists() && this.code && !this._leaving) { const was = this.isGuest; this._reset(); if (was) bus.emit('coop:closed'); } });
    const q = this._from ? fd.query(this._ref('/log'), fd.orderByKey(), fd.startAfter(this._from)) : fd.query(this._ref('/log'), fd.orderByKey(), fd.startAfter(fd.push(this._ref('/log')).key));
    on(q, 'child', (s) => { const m = s.val(); if (m && m.from !== this.me) bus.emit('coop:msg', m); });
    on(this._ref('/pings'), 'value', (s) => bus.emit('coop:pings', s.val() || {}));
  },

  // ── messages ──
  send(msg) {
    if (!this.code) return;
    const json = JSON.parse(JSON.stringify({ ...msg, from: this.me })); // strips undefined / class instances
    this._fd.push(this._ref('/log'), json).catch((e) => console.warn('[co-op] send failed', e));
  },
  // at most one ping a second: a burst of clicks is one marker, not a write each
  ping(q, r) { const now = Date.now(); if (!this.code || now - (this._pingAt || 0) < 1000) return; this._pingAt = now; this._fd.set(this._ref(`/pings/${this.me}`), { q, r, ts: now }); },

  // ── heroes ──
  colorOf(id) { const ids = this.partyIds(); return PLAYER_COLORS[Math.max(0, ids.indexOf(id)) % PLAYER_COLORS.length]; },
  nameOf(id) { return this.players[id]?.name || '?'; },
  // Party order (host first, then by join time) — identical on every client.
  partyIds() { return Object.keys(this.players).sort((a, b) => (a === this.hostId ? -1 : b === this.hostId ? 1 : (this.players[a].joined || 0) - (this.players[b].joined || 0))); },
  heroOf(id) { return this.players[id]?.hero || null; },
  // The snapshot is written only when it differs from the one the room already has (every write is sent to every player).
  publishHero(hero) {
    if (!this.code) return; const json = JSON.stringify(hero);
    if (json === this._heroJson) return; this._heroJson = json;
    this._fd.set(this._ref(`/players/${this.me}/hero`), JSON.parse(json)).catch((e) => { this._heroJson = null; console.warn('[co-op] hero sync failed', e); });
  },
  // May this client act for a hero? Its owner, or the host when the owner has left.
  controls(owner) { return !this.code || owner === this.me || (this.isHost && !this.players[owner]); },
  kick(id) { if (this.isHost) this._fd.remove(this._ref(`/players/${id}`)); },

  async leave() {
    if (!this.code) return;
    // Our own removal reaches our listeners at once; they must not treat it as "the room closed on us",
    // and must not drop the connection before the server has the write (it would then never be confirmed).
    this._leaving = true;
    const gone = this.isHost ? this._fd.remove(this._ref()) : Promise.all([this._fd.remove(this._ref(`/players/${this.me}`)), this._fd.remove(this._ref(`/pings/${this.me}`))]);
    await Promise.race([gone.catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
    this._leaving = false;
    this._reset();
  },
  _reset() {
    this._offs.forEach((off) => off?.());
    this._offs = []; const had = !!this.code || this.role;
    this.code = null; this.role = null; this.players = {}; this._from = null; this._heroJson = null;
    if (had && this._fd) Net.release();
    bus.emit('coop:players');
  },
};
