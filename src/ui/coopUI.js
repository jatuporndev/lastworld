// Online co-op UI: create / join a room, lobby (players + who controls which hero), the room badge,
// and the guests' waiting screen.
import { h, bus } from '../core/util.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { G, charList, worldList } from '../game/state.js';
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
  const P = G.profile; const chars = charList(); const worlds = worldList();
  const opt = (v, label, selected) => { const o = h('option', { value: v }, label); if (selected) o.selected = true; return o; };
  const charLabel = (c) => `${c.hero.name} · ${CLASSES[c.hero.cls].name} Lv ${c.hero.level}`;
  const pickChar = () => h('select.lb-select', ...chars.map((c) => opt(c.id, charLabel(c), c.id === P.last.char)));
  const hostChar = pickChar(); const joinChar = pickChar();
  const hostWorld = h('select.lb-select', ...worlds.map((w) => opt(w.id, `${w.name} · ${t('Stage {n}', { n: Math.min(6, w.unlocked) })}`, w.id === P.last.world)));
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
  const create = () => run(async () => { await app.hostRoom(hostWorld.value, hostChar.value, nick()); m.close(); audio.sfx('buff'); lobbyModal(app); });
  const join = () => run(async () => {
    if (code.value.length < 5) { say(t('Enter the 5-letter room code.')); return; }
    await app.joinRoom(code.value, joinChar.value, nick()); m.close(); audio.sfx('buff');
  });
  const field = (label, el) => h('label.auth-field', h('span.auth-label', label), el);
  const needChar = h('div.coop-box.coop-need', h('p', t('You need a character to play online.')), btn(t('Create Character'), () => { m.close(); app.toCharCreate({}); }, { cls: 'primary block', iconName: 'star' }));
  const body = h('div.coop',
    h('div.auth-head', h('div.auth-crest', h('div.auth-crest-ring'), icon('banner', '#f6d98a', 46)), h('h2.auth-title', t('Play with Friends')),
      h('p.auth-sub', t('Up to 3 players, one character each. The host opens one of their worlds; friends bring their own character and keep what they earn.'))),
    h('label.auth-field', h('span.auth-label', t('Your name')), h('div.auth-input', name)),
    !chars.length ? needChar : h('div.coop-cols',
      h('div.coop-box', h('h3', t('Host a room')),
        worlds.length ? field(t('World'), hostWorld) : h('p', t('Create a world first (Play → Create World).')),
        field(t('Character'), hostChar),
        btn(t('Create Room'), create, { cls: 'primary block', iconName: 'crown', disabled: !worlds.length })),
      h('div.coop-box', h('h3', t('Join a room')), field(t('Character'), joinChar),
        h('form', { novalidate: true, onsubmit: (e) => { e.preventDefault(); join(); } }, field(t('Room code'), h('div.auth-input', code)), btn(t('Join'), join, { cls: 'block', iconName: 'sword' })))),
    msg);
  const m = openModal(body, { cls: 'auth-modal coop-modal' });
  return m;
}

// ───────── lobby ─────────
export function lobbyModal(app) {
  const body = h('div.coop.lobby');
  const render = () => {
    if (!Coop.active) { m.close(); return; }
    const ids = Coop.partyIds();
    const playerRow = (id) => { const hero = id === Coop.me ? G.state?.party.find((x) => !x.remote) : Coop.heroOf(id);
      return h('div.lb-hero', { style: { '--pc': Coop.colorOf(id) } },
        hero ? h('div.lb-portrait', heroSprite(hero, { size: 56, zoom: 1.5, oy: 0.3 })) : h('div.lb-portrait'),
        h('div.lb-hinfo', h('b', { style: { color: Coop.colorOf(id) } }, Coop.nameOf(id), id === Coop.hostId ? h('span.tag', t('Host')) : null, id === Coop.me ? h('span.tag.me', t('You')) : null),
          hero ? h('small', `${hero.name} · ${CLASSES[hero.cls].name} Lv ${hero.level}`) : h('small', '…')),
        Coop.isHost && id !== Coop.me ? h('button.mini', { onclick: () => Coop.kick(id), 'data-tip': t('Remove from room') }, '✕') : null); };
    body.replaceChildren(
      h('div.lb-code', h('small', t('ROOM CODE')), h('div.lb-code-row', h('b', Coop.code),
        h('button.mini', { onclick: () => { navigator.clipboard?.writeText(Coop.code).then(() => toast(t('Code copied'), 'good')).catch(() => {}); } }, t('Copy')))),
      h('p.note', Coop.isHost ? t('Share this code with friends. Up to 3 players.') : t('The host leads the party on the map. Click tiles to suggest a direction.')),
      h('div.sec-title', t('Players ({n}/3)', { n: ids.length })), h('div.lb-heroes', ...ids.map(playerRow)),
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

// Host the world you are already in (from the world map).
export async function inviteFriends(app) {
  const st = G.state; if (!st?.worldId) return;
  try { await app.hostRoom(st.worldId, st.charId, defaultName()); lobbyModal(app); audio.sfx('buff'); }
  catch (e) { console.warn('[co-op]', e); toast(coopError(e), 'bad'); }
}
