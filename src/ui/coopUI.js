// Online co-op UI: create / join a room, lobby (players + who controls which hero), the room badge,
// and the guests' waiting screen.
import { h, bus } from '../core/util.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { G } from '../game/state.js';
import { CLASSES } from '../data/classes.js';
import { Net } from '../net/firebase.js';
import { Coop } from '../net/coop.js';
import { ui, btn, icon, openModal, heroSprite, toast } from './components.js';

const ERR = {
  offline: 'Online play needs the Firebase connection. Check your internet and the game settings.',
  auth: 'Could not sign in. Enable Anonymous sign-in in Firebase, or sign in with an account.',
  noroom: 'No room with that code. Check the code with your friend.',
  self: 'This is your own room.',
  busy: 'Could not create a room. Try again.',
  full: 'That room is full (3 players).',
};
export const coopError = (e) => {
  if (ERR[e?.message]) return t(ERR[e.message]);
  if (String(e?.code || e?.message).includes('PERMISSION_DENIED') || String(e).includes('permission')) return t('The database refused access. Publish the co-op rules in database.rules.json to Firebase.');
  return t('Something went wrong');
};

const defaultName = () => {
  try { const n = localStorage.getItem('lw_name'); if (n) return n; } catch (e) { /* ignore */ }
  return Net.user?.email ? Net.user.email.split('@')[0].slice(0, 14) : t('Player') + ' ' + Math.floor(100 + Math.random() * 900);
};

// ───────── create / join ─────────
export function coopModal(app) {
  if (Coop.active) return lobbyModal(app);
  if (!Net.online) { toast(t(ERR.offline), 'bad'); return null; }
  const st = G.state;
  const name = h('input', { value: defaultName(), maxlength: 16, autocomplete: 'nickname' });
  const code = h('input.code-input', { placeholder: 'ABCDE', maxlength: 5, autocomplete: 'off', spellcheck: 'false', oninput: () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); } });
  const msg = h('div.auth-msg');
  const say = (text, cls = 'bad') => { msg.className = 'auth-msg ' + cls; msg.textContent = text; };
  const nick = () => { const n = name.value.trim().slice(0, 16) || defaultName(); try { localStorage.setItem('lw_name', n); } catch (e) { /* ignore */ } return n; };
  let busy = false;
  const run = async (fn) => {
    if (busy) return; busy = true; say(t('Connecting…'), 'busy');
    try { await fn(); } catch (e) { console.warn('[co-op]', e); say(coopError(e)); } finally { busy = false; }
  };
  const create = () => run(async () => {
    await Coop.create(nick()); m.close(); audio.sfx('buff');
    app.onCoopStart(); lobbyModal(app);
  });
  const join = () => run(async () => {
    if (code.value.length < 5) { say(t('Enter the 5-letter room code.')); return; }
    await Coop.join(code.value, nick()); m.close(); audio.sfx('buff');
    app.onCoopStart();
  });
  const body = h('div.coop',
    h('div.auth-head', h('div.auth-crest', h('div.auth-crest-ring'), icon('banner', '#f6d98a', 46)), h('h2.auth-title', t('Play with Friends')),
      h('p.auth-sub', t('Up to 3 players. The host shares their campaign; each friend controls one hero in battle.'))),
    h('label.auth-field', h('span.auth-label', t('Your name')), h('div.auth-input', name)),
    h('div.coop-cols',
      h('div.coop-box', h('h3', t('Host a room')), h('p', st ? t('Your party: {party}', { party: st.party.map((p) => p.name).join(', ') }) : t('You need a saved campaign to host.')),
        st && st.party.length < 2 ? h('p.note', t('Tip: a party of 2–3 heroes lets friends take a hero each.')) : null,
        btn(t('Create Room'), create, { cls: 'primary block', iconName: 'crown', disabled: !st })),
      h('div.coop-box', h('h3', t('Join a room')), h('p', t('Ask the host for the room code.')),
        h('form', { novalidate: true, onsubmit: (e) => { e.preventDefault(); join(); } }, h('div.auth-input', code), btn(t('Join'), join, { cls: 'block', iconName: 'sword' })))),
    msg);
  const m = openModal(body, { cls: 'auth-modal coop-modal' });
  return m;
}

// ───────── lobby ─────────
export function lobbyModal(app) {
  const body = h('div.coop.lobby');
  const render = () => {
    if (!Coop.active) { m.close(); return; }
    const st = G.state; const ids = Object.keys(Coop.players);
    const playerRow = (id) => h('div.lb-player', { style: { '--pc': Coop.colorOf(id) } }, h('i.dot'), h('b', Coop.nameOf(id)),
      id === Coop.hostId ? h('span.tag', t('Host')) : null, id === Coop.me ? h('span.tag.me', t('You')) : null,
      Coop.isHost && id !== Coop.me ? h('button.mini', { onclick: () => Coop.kick(id), 'data-tip': t('Remove from room') }, '✕') : null);
    const heroRow = (hero, i) => {
      const owner = Coop.ownerOf(i);
      const ctl = Coop.isHost
        ? h('select.lb-select', { onchange: (e) => { Coop.setSlot(i, e.target.value); audio.sfx('click'); } }, ...ids.map((id) => { const o = h('option', { value: id }, Coop.nameOf(id)); if (id === owner) o.selected = true; return o; }))
        : h('b', { style: { color: Coop.colorOf(owner) } }, Coop.nameOf(owner));
      return h('div.lb-hero', { style: { '--pc': Coop.colorOf(owner) } }, h('div.lb-portrait', heroSprite(hero.cls, { size: 56, zoom: 1.5, oy: 0.3 })),
        h('div.lb-hinfo', h('b', hero.name), h('small', `${CLASSES[hero.cls].name} · Lv ${hero.level}`)), h('div.lb-ctl', h('small', t('Controlled by')), ctl));
    };
    body.replaceChildren(
      h('div.lb-code', h('small', t('ROOM CODE')), h('div.lb-code-row', h('b', Coop.code),
        h('button.mini', { onclick: () => { navigator.clipboard?.writeText(Coop.code).then(() => toast(t('Code copied'), 'good')).catch(() => {}); } }, t('Copy')))),
      h('p.note', Coop.isHost ? t('Share this code with friends. Up to 3 players.') : t('The host leads the party on the map. Click tiles to suggest a direction.')),
      h('div.sec-title', t('Players ({n}/3)', { n: ids.length })), h('div.lb-players', ...ids.map(playerRow)),
      st ? h('div.sec-title', t('Heroes')) : null,
      st ? h('div.lb-heroes', ...st.party.map(heroRow)) : null,
      h('div.row.center', btn(t(Coop.isHost ? 'Close Room' : 'Leave Room'), async () => { m.close(); await app.leaveCoop(); }, { cls: 'ghost' }), btn(t('Done'), () => m.close(), { cls: 'primary' })));
  };
  const m = openModal(body, { title: t('Party Room'), cls: 'narrow lobby-modal', onClose: () => off() });
  const off = bus.on('coop:players', render);
  render();
  return m;
}

// ───────── room badge (top centre while in a room) ─────────
export function coopBadge(app) {
  let el = document.getElementById('coop-badge');
  if (!Coop.active) { el?.remove(); return; }
  if (!el) { el = h('div#coop-badge', { onclick: () => lobbyModal(app), 'data-tip': t('Party room — players and heroes') }); document.getElementById('game').appendChild(el); }
  el.replaceChildren(icon('banner', '#f6d98a', 16), h('b', Coop.code),
    h('span.cb-dots', ...Object.keys(Coop.players).map((id) => h('i', { style: { background: Coop.colorOf(id) }, 'data-tip': Coop.nameOf(id) }))),
    h('span', Coop.isHost ? t('Host') : t('Guest')));
}

// ───────── guest waiting screen ─────────
export function guestWaitScreen(app, text) {
  ui().querySelectorAll('.screen').forEach((s) => s.remove());
  const el = h('div.screen.coop-wait',
    h('div.cw-box', h('div.auth-crest', h('div.auth-crest-ring'), icon('banner', '#f6d98a', 46)),
      h('h2', text), h('p', t('Room {code} · Host: {name}', { code: Coop.code, name: Coop.nameOf(Coop.hostId) })),
      h('div.cw-dots', h('i'), h('i'), h('i')),
      h('div.row.center', btn(t('Party Room'), () => lobbyModal(app), { cls: 'ghost' }), btn(t('Leave Room'), () => app.leaveCoop(), { cls: 'ghost' }))));
  ui().appendChild(el);
  return el;
}
