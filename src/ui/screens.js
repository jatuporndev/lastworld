// Menu screens: Title, Account (Firebase auth), Character Selection, World Map.
import { h, fmt } from '../core/util.js';
import { t, LANG, setLang } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { G, claimableQuests, charList, worldList, createCharacter, createWorld, deleteCharacter, deleteWorld, myHeroes, MAX_CHARS, MAX_WORLDS } from '../game/state.js';
import { computeStats, createHero } from '../game/character.js';
import { CLASSES, CLASS_ORDER } from '../data/classes.js';
import { STARTER_DECKS, ELEMENTS } from '../data/cards.js';
import { STAGES } from '../data/stages.js';
import { MONSTERS } from '../data/monsters.js';
import { UNIQUES } from '../data/items.js';
import { CARDS } from '../data/cards.js';
import { Net } from '../net/firebase.js';
import { ui, btn, icon, openModal, heroSprite, monsterSprite, cardEl, toast, toggleFullscreen, confirmBox, bar, bagButton } from './components.js';
import { openMenu } from './panels.js';
import { coopModal, inviteFriends } from './coopUI.js';
import { Coop } from '../net/coop.js';

function mount(el) { ui().querySelectorAll('.screen').forEach((s) => s.remove()); ui().appendChild(el); return el; }
export function clearScreens() { ui().querySelectorAll('.screen, .battle-hud, .explore-hud').forEach((s) => s.remove()); }

// ───────── Title ─────────
export function titleScreen(app) {
  const P = G.profile; const L = P.last || {};
  const lastChar = P.chars[L.char]; const lastWorld = P.worlds[L.world];
  const letters = (t) => [...t].map((ch, i) => h('span', { style: { animationDelay: `${i * 70}ms` } }, ch === ' ' ? ' ' : ch));
  // Main menu: wordmark and a short list of large text entries down the left edge, round-the-clock
  // shortcuts as hex icons in the top right, and the living diorama filling the rest of the screen.
  const press = (fn) => () => { audio.init(); audio.sfx('click'); fn(); };
  const item = (label, fn, { sub = null, disabled = false, main = false } = {}) => h('button.ts-item' + (main ? '.main' : ''), { disabled, onclick: press(fn), onmouseenter: () => audio.sfx('hover') }, h('i.ts-node'), h('span.ts-label', label), sub ? h('small', sub) : null);
  const shortcut = (label, ic, fn) => h('button.ts-ico', { onclick: press(fn), onmouseenter: () => audio.sfx('hover') }, h('span.ts-hex', icon(ic, '#ffffff', 22)), h('small', label));
  const resume = lastChar && lastWorld;
  const el = h('div.screen.title-screen',
    h('div.title-vignette'),
    h('div.ts-left',
      h('div.title-logo', h('h1.logo', h('span.logo-word', ...letters('LAST')), h('span.logo-word.w2', ...letters('WORLD'))), h('div.logo-sub', t('A Tactical Card Chronicle of the Sundered Realms'))),
      h('div.title-menu',
        resume ? item(t('Continue'), () => app.continueGame(), { main: true, sub: t('{hero} Lv {lv} · {world} — Stage {n}', { hero: lastChar.hero.name, lv: lastChar.hero.level, world: lastWorld.name, n: Math.min(6, lastWorld.unlocked) }) }) : null,
        item(t('Play'), () => app.toPlay(), { main: !resume }),
        item(t('Play with Friends'), () => coopModal(app), { disabled: !Net.online }))),
    h('div.ts-top',
      shortcut(t(Net.online && Net.user ? 'Account' : 'Sign In'), 'book', () => app.openAuth(() => app.toTitle(true))),
      shortcut(t('Fullscreen'), 'flag', toggleFullscreen),
      shortcut(LANG === 'th' ? 'English' : 'ภาษาไทย', 'star', () => setLang(LANG === 'th' ? 'en' : 'th'))),
    h('div.title-foot', h('span.net' + (Net.online && Net.user ? '.on' : ''), Net.label()), h('span', 'v1.1 · Three.js · Firebase')));
  // the board sits to the right of the menu
  app.world.focus({ x: -4.6, z: 0.6, size: 13 }, 700);
  return mount(el);
}

// ───────── Auth ─────────
// The account gate: crest + heading, then one focused task per view.
const authHead = (title, sub, ic = 'crown') => h('div.auth-head',
  h('div.auth-crest', h('div.auth-crest-ring'), icon(ic, '#f6d98a', 46)),
  h('h2.auth-title', title), sub ? h('p.auth-sub', sub) : null);
const AUTH_ERRORS = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/missing-password': 'Enter your password.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/credential-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'The password needs at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Cannot reach the server. Check your connection.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for the game yet.',
  'auth/admin-restricted-operation': 'This sign-in method is not enabled for the game yet.',
};
const authError = (e) => t(AUTH_ERRORS[e?.code] || 'Something went wrong');

export function authModal(app, done) {
  const finish = (m) => { m.close(); done?.(); };
  if (!Net.online) {
    const m = openModal(h('div.auth',
      authHead(t('Offline Mode'), t('Cloud accounts are not configured for this build, so the game is running in offline mode. Your campaign is saved automatically in this browser.'), 'shield'),
      h('div.auth-actions', btn(t('OK'), () => m.close(), { cls: 'primary block' }))), { cls: 'auth-modal' });
    return m;
  }
  if (Net.user) {
    const m = openModal(h('div.auth',
      authHead(Net.user.guest ? t('Guest Adventurer') : t('Account'), Net.user.guest ? t('You are playing on a guest account. Register an email to keep your save across devices.') : null, Net.user.guest ? 'flag' : 'crown'),
      Net.user.guest ? null : h('div.auth-id', h('small', t('Signed in as')), h('b', Net.user.email)),
      h('div.auth-status', h('i.dot.on'), Net.label()),
      Net.user.guest ? authForm(app, () => finish(m), 'upgrade') : null,
      h('div.auth-actions.split',
        btn(t('Sign Out'), async () => { await app.saveNow(); await Net.signOut(); toast(t('Signed out')); finish(m); }, { cls: 'ghost' }),
        btn(t('Close'), () => m.close(), { cls: Net.user.guest ? 'ghost' : 'primary' }))), { cls: 'auth-modal' });
    return m;
  }
  const body = h('div.auth');
  const m = openModal(body, { cls: 'auth-modal' });
  let mode = 'signin';
  const render = () => body.replaceChildren(
    authHead(t('Adventurer Account'), t('Sign in to save your campaign to the cloud and continue on any device.')),
    h('div.auth-tabs', ...[['signin', 'Sign In'], ['signup', 'Create Account']].map(([id, label]) =>
      h('button.auth-tab' + (mode === id ? '.on' : ''), { type: 'button', onclick: () => { if (mode !== id) { mode = id; audio.sfx('click'); render(); } } }, t(label)))),
    authForm(app, () => finish(m), mode),
    h('div.auth-or', h('span', t('or'))),
    btn(t('Play as Guest'), async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { await Net.signInGuest(); await app.onSignedIn(); finish(m); }
      catch (err) { toast(authError(err), 'bad'); audio.sfx('error'); b.disabled = false; }
    }, { cls: 'ghost block', iconName: 'flag' }),
    h('p.auth-note', t('Your progress is always saved on this device too.')));
  render();
  return m;
}

// mode: 'signin' | 'signup' | 'upgrade' (link the current guest account to an email)
function authForm(app, ok, mode) {
  const signin = mode === 'signin';
  const msg = h('div.auth-msg', { role: 'status' });
  const email = h('input', { type: 'email', name: 'email', autocomplete: 'email', required: true, autofocus: true, placeholder: 'name@example.com' });
  const pass = h('input', { type: 'password', name: 'password', autocomplete: signin ? 'current-password' : 'new-password', required: true, minlength: 6, placeholder: '••••••' });
  const reveal = h('button.auth-eye', { type: 'button', 'data-tip': t('Show password'), onclick: () => { pass.type = pass.type === 'password' ? 'text' : 'password'; reveal.classList.toggle('on', pass.type === 'text'); } }, '👁');
  const submit = btn(t(signin ? 'Sign In' : mode === 'upgrade' ? 'Register this account' : 'Create Account'), null, { cls: 'primary block big' });
  submit.type = 'submit';
  const field = (label, input, extra = null, hint = null) => h('label.auth-field', h('span.auth-label', label), h('div.auth-input', input, extra), hint ? h('small.auth-hint', hint) : null);
  return h('form.auth-form', {
    novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      const em = email.value.trim(), pw = pass.value;
      if (!em) { msg.textContent = t('Enter your email.'); msg.className = 'auth-msg bad'; email.focus(); return; }
      if (pw.length < 6) { msg.textContent = t('The password needs at least 6 characters.'); msg.className = 'auth-msg bad'; pass.focus(); return; }
      submit.disabled = true; msg.textContent = t(signin ? 'Signing in' : 'Creating account') + '…'; msg.className = 'auth-msg busy';
      try { await (signin ? Net.signIn(em, pw) : Net.signUp(em, pw)); await app.onSignedIn(); audio.sfx('levelup'); ok(); }
      catch (err) { msg.textContent = authError(err); msg.className = 'auth-msg bad'; audio.sfx('error'); submit.disabled = false; }
    },
  },
  field(t('Email'), email),
  field(t('Password'), pass, reveal, signin ? null : t('At least 6 characters')),
  msg, submit);
}

// ───────── Characters + Worlds ─────────
// Up to 3 characters and 6 worlds. Pick a character and a world, then enter. A world can be played
// alone or opened to friends (co-op); a character can visit any world.
export function playScreen(app, sel = {}) {
  const P = G.profile;
  let charId = sel.char && P.chars[sel.char] ? sel.char : (P.chars[P.last.char] ? P.last.char : charList()[0]?.id);
  let worldId = sel.world && P.worlds[sel.world] ? sel.world : (P.worlds[P.last.world] ? P.last.world : worldList()[0]?.id);
  const chars = h('div.ps-chars'); const worlds = h('div.ps-worlds'); const go = h('div.ps-go');
  const render = () => {
    const list = charList();
    chars.replaceChildren(...Array.from({ length: MAX_CHARS }, (_, i) => {
      const c = list[i];
      if (!c) return h('button.ps-char.empty', { onclick: () => app.toCharCreate({ world: worldId }) }, h('div.ps-plus', '+'), h('b', t('Create Character')), h('small', t('Slot {n}', { n: i + 1 })));
      const hero = c.hero; const C = CLASSES[hero.cls];
      return h('div.ps-char' + (c.id === charId ? '.sel' : ''), { style: { '--c': C.color }, onclick: () => { charId = c.id; audio.sfx('click'); render(); } },
        h('div.ps-sprite', heroSprite(hero, { size: 120, zoom: 1.15, oy: 0.1 })),
        h('b.ps-cname', hero.name), h('small', `${C.name} · Lv ${hero.level}`),
        h('div.ps-cstats', h('span', icon('coin', '#ffd24a', 14), fmt(c.gold)), h('span', icon('book', '#c9a0ff', 14), Object.values(c.cards).reduce((s, x) => s + x.n, 0))),
        h('button.ps-del', { 'data-tip': t('Delete character'), onclick: async (e) => { e.stopPropagation();
          if (await confirmBox(t('Delete {name}?', { name: hero.name }), t('This character, their gear, cards and gold are deleted for good. Worlds are kept.'), t('Delete'))) { deleteCharacter(c.id); if (charId === c.id) charId = charList()[0]?.id; await app.saveNow({ gap: 0 }); render(); } } }, '✕'));
    }));
    const wl = worldList();
    worlds.replaceChildren(
      ...wl.map((w) => h('div.ps-world' + (w.id === worldId ? '.sel' : ''), { onclick: () => { worldId = w.id; audio.sfx('click'); render(); } },
        h('div.ps-wicon', icon(Object.keys(w.cleared).length >= 6 ? 'crown' : 'flag', '#f6d98a', 26)),
        h('div.ps-winfo', h('b', w.name), h('small', t('Stage {n} / 6 · {cleared} cleared', { n: Math.min(6, w.unlocked), cleared: Object.keys(w.cleared).length }) + (w.run ? t(' (in progress)') : '')),
          w.lastChar && P.chars[w.lastChar] ? h('small.ps-wlast', t('Last played: {name}', { name: P.chars[w.lastChar].hero.name })) : null),
        h('button.ps-del', { 'data-tip': t('Delete world'), onclick: async (e) => { e.stopPropagation();
          if (await confirmBox(t('Delete {name}?', { name: w.name }), t('All map progress in this world is lost. Characters are kept.'), t('Delete'))) { deleteWorld(w.id); if (worldId === w.id) worldId = worldList()[0]?.id; await app.saveNow({ gap: 0 }); render(); } } }, '✕'))),
      wl.length < MAX_WORLDS ? h('button.ps-world.new', { onclick: () => newWorldModal((w) => { worldId = w.id; app.saveNow(); render(); }) }, h('div.ps-plus', '+'), h('b', t('Create World'))) : null);
    const c = P.chars[charId]; const w = P.worlds[worldId];
    go.replaceChildren(
      h('div.ps-pick', c ? h('span', h('small', t('Character')), h('b', c.hero.name)) : h('span.dim', t('Choose or create a character')), h('i', '→'), w ? h('span', h('small', t('World')), h('b', w.name)) : h('span.dim', t('Choose or create a world'))),
      btn(t('Enter World'), () => app.play(worldId, charId), { cls: 'primary big', iconName: 'sword', disabled: !c || !w }));
  };
  render();
  return mount(h('div.screen.ps-screen',
    h('div.cs-head', h('h2', t('Characters & Worlds')), btn(t('Back'), () => app.toTitle(), { cls: 'small' })),
    h('div.ps-main',
      h('section.ps-col', h('div.ps-title', icon('crown', '#f6d98a', 20), t('Your Characters'), h('small', t('up to {n}', { n: MAX_CHARS }))), chars),
      h('section.ps-col', h('div.ps-title', icon('flag', '#f6d98a', 20), t('Worlds'), h('small', t('solo or co-op · up to {n}', { n: MAX_WORLDS }))), worlds)),
    go));
}

export function newWorldModal(done) {
  const n = worldList().length + 1;
  const input = h('input', { value: t('World {n}', { n }), maxlength: 24 });
  // (a button inside a form also submits it, so make sure one press makes one world — and Cancel makes none)
  let made = false;
  const ok = () => { if (made) return; made = true; const w = createWorld(input.value.trim() || t('World {n}', { n })); m.close(); audio.sfx('buff'); done?.(w); };
  const m = openModal(h('form.confirm', { novalidate: true, onsubmit: (e) => { e.preventDefault(); ok(); } },
    h('label.auth-field', h('span.auth-label', t('World name')), h('div.auth-input', input)),
    h('p.note', t('A new world starts at Stage 1. Any of your characters can enter it, alone or with friends.')),
    h('div.row.center', btn(t('Cancel'), () => { made = true; m.close(); }, { cls: 'ghost' }), btn(t('Create World'), ok, { cls: 'primary' }))), { title: t('Create World'), cls: 'narrow' });
  requestAnimationFrame(() => input.select());
}

// ───────── Character creation ─────────
// One hero per character. `back` = selection to return to on the Characters & Worlds screen.
export function charCreateScreen(app, back = {}) {
  let focus = 'knight'; let name = ''; let gender = 'm'; let entered = false;
  const list = h('div.cs-list'); const detail = h('div.cs-detail'); const foot = h('div.cs-party');
  const nameInput = h('input', { placeholder: CLASSES[focus].name, maxlength: 14, oninput: (e) => { name = e.target.value; } });
  const create = () => {
    if (charList().length >= MAX_CHARS) { toast(t('You already have {n} characters. Delete one first.', { n: MAX_CHARS }), 'bad'); return; }
    const c = createCharacter(focus, name.trim() || CLASSES[focus].name, gender);
    audio.sfx('levelup'); app.saveNow();
    if (back.join) { back.join(c.id); return; }
    app.toPlay({ ...back, char: c.id });
  };
  const render = () => {
    list.replaceChildren(...CLASS_ORDER.map((cls, i) => { const C = CLASSES[cls];
      return h('div.cs-card' + (focus === cls ? '.focus.picked' : '') + (entered ? '.still' : ''), { style: { '--c': C.color, animationDelay: `${i * 70}ms` },
        onclick: () => { audio.sfx('click'); focus = cls; nameInput.placeholder = C.name; render(); },
        onmouseenter: (e) => { const cv = e.currentTarget.querySelector('canvas'); if (cv?._sprite) cv._sprite.anim = 'walk'; audio.sfx('hover'); }, onmouseleave: (e) => { const cv = e.currentTarget.querySelector('canvas'); if (cv?._sprite) cv._sprite.anim = 'idle'; } },
        heroSprite({ cls, gender }, { size: 150, zoom: 1.05 }), h('div.cs-name', C.name), h('div.cs-role', C.role));
    }));
    entered = true;
    const C = CLASSES[focus]; const s = computeStats(createHero(focus));
    const statBar = (label, v, max) => h('div.cs-stat', h('span', label), h('div.cs-bar', h('i', { style: { width: Math.min(100, (v / max) * 100) + '%' } })), h('b', v));
    const anims = ['idle', 'attack', 'cast', 'walk'];
    const big = heroSprite({ cls: focus, gender }, { size: 260, zoom: 1.05, cls: 'cs-big' });
    let ai = 0; clearInterval(render._t); render._t = setInterval(() => { if (!big.isConnected) return clearInterval(render._t); ai = (ai + 1) % anims.length; big._sprite.anim = anims[ai]; big._sprite.dir = [5, 0, 5, 4][ai]; }, 1400);
    detail.replaceChildren(
      h('div.cs-hero', h('div.cs-pedestal'), big),
      h('div.cs-info', h('div.cs-title', { style: { color: C.color } }, C.name), h('div.cs-sub', `${C.title} · ${ELEMENTS[C.element].name}`), h('p', C.desc),
        h('div.cs-stats', statBar('HP', s.hp, 130), statBar('MP', s.mp, 60), statBar('ATK', s.atk, 26), statBar('MATK', s.matk, 26), statBar('DEF', s.def, 14), statBar('SPD', s.spd, 34), statBar(t('MOVE'), s.move, 5)),
        h('div.cs-deck-title', t('Starting Deck')), h('div.cs-deck', ...[...new Set(STARTER_DECKS[focus])].map((id) => cardEl(id, 0, { small: true })))));
    const pick = (g, label) => h('button.cs-gender' + (gender === g ? '.on' : ''), { onclick: () => { audio.sfx('click'); gender = g; render(); } }, label);
    foot.replaceChildren(h('div.cs-genders', pick('m', '♂ ' + t('Male')), pick('f', '♀ ' + t('Female'))), h('div.cs-slot', heroSprite({ cls: focus, gender }, { size: 64, zoom: 1.4, oy: 0.25 }), h('label', h('small', t('Character name')), nameInput)));
  };
  render();
  return mount(h('div.screen.cs-screen', h('div.cs-head', h('h2', t('Create Character')), btn(t('Back'), () => (back.cancel ? back.cancel() : app.toPlay(back)), { cls: 'small' })),
    list, detail, h('div.cs-foot', foot, btn(t('Create Character'), create, { cls: 'primary big', iconName: 'star' }))));
}

// ───────── World Map ─────────
export function worldMapScreen(app) {
  const st = G.state; let selId = Math.min(6, st.run?.stageId || st.unlocked);
  const detail = h('div.wm-detail'); const nodes = h('div.wm-nodes');
  const W = 1000, H = 600;
  const pts = STAGES.map((s) => [s.mapPos[0] * W, s.mapPos[1] * H]);
  const pathD = pts.map((p, i) => { if (!i) return `M${p[0]},${p[1]}`; const q = pts[i - 1]; const mx = (p[0] + q[0]) / 2 + (i % 2 ? 40 : -40), my = (p[1] + q[1]) / 2 + (i % 2 ? -30 : 30); return `Q${mx},${my} ${p[0]},${p[1]}`; }).join(' ');
  const svg = h('div.wm-svg', { html: `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path class="wm-path-bg" d="${pathD}"/><path class="wm-path" d="${pathD}" pathLength="100" style="stroke-dasharray:${((st.unlocked - 1) / 5) * 100} 100"/></svg>` });
  const render = () => {
    nodes.replaceChildren(...STAGES.map((s) => { const locked = s.id > st.unlocked; const cleared = !!st.cleared[s.id];
      return h('div.wm-node' + (locked ? '.locked' : '') + (cleared ? '.cleared' : '') + (s.id === selId ? '.sel' : '') + (s.id === st.unlocked && !cleared ? '.next' : ''), { style: { left: s.mapPos[0] * 100 + '%', top: s.mapPos[1] * 100 + '%', '--c': '#' + s.sky.toString(16).padStart(6, '0') },
        onclick: () => { selId = s.id; audio.sfx(locked ? 'error' : 'click'); render(); } },
        h('div.wm-pin', locked ? '🔒' : cleared ? '✔' : s.id), h('div.wm-label', s.name));
    }));
    const s = STAGES[selId - 1]; const locked = s.id > st.unlocked; const boss = MONSTERS[s.boss]; const cleared = !!st.cleared[s.id];
    detail.replaceChildren(
      h('div.wm-d-head', h('div.wm-d-stage', t('STAGE {n}', { n: s.id })), h('h3', s.name), h('div.wm-d-sub', s.subtitle)),
      h('div.wm-boss', locked ? h('div.wm-unknown', '?') : monsterSprite(s.boss, { size: 190 }), h('div', h('small', t('MVP BOSS')), h('b', locked ? '???' : boss.name), locked ? null : h('span', t('Lv {lv} · Weak: {weak}', { lv: boss.level, weak: boss.weak.map((e) => ELEMENTS[e].name).join(', ') || '—' })))),
      h('p.wm-text', locked ? t('Defeat {boss} to unlock this realm.', { boss: MONSTERS[STAGES[selId - 2].boss].name }) : s.intro),
      locked ? null : h('div.wm-rewards', h('small', t('FIRST CLEAR REWARDS')), h('div', icon('ring', '#ffb347', 18), UNIQUES[s.rewardUnique].name), h('div', icon('book', '#c070ff', 18), t('Card: {name}', { name: CARDS[s.rewardCard].name }))),
      h('div.row', btn(t(locked ? 'Locked' : st.run?.stageId === s.id ? 'Resume Expedition' : cleared ? 'Replay Stage' : 'Enter Stage'), () => app.enterStage(s.id), { cls: 'primary big', disabled: locked })));
  };
  render();
  const q = claimableQuests();
  const el = h('div.screen.wm-screen',
    h('div.wm-top', h('h2', G.profile.worlds[st.worldId]?.name || t('The Sundered Realms')),
      h('div.wm-party', ...st.party.map((p) => { const cs = computeStats(p); return h('div.p-card', { onclick: () => openMenu(app, 'hero') }, h('div.p-portrait', heroSprite(p, { size: 64, zoom: 1.5, oy: 0.3 })), h('div.p-body', h('div.p-name', p.name, h('span', ` Lv ${p.level}`), p.statPoints + p.skillPoints > 0 ? h('i.pip', '!') : null), bar('hp', p.hp, cs.hp), bar('mp', p.mp, cs.mp))); }),
        bagButton(() => openMenu(app), myHeroes().reduce((s, p) => s + p.statPoints + p.skillPoints, 0) + q)),
      h('div.wm-actions', h('div.res', icon('coin', '#ffd24a', 18), fmt(st.gold)), h('div.res', icon('gem', '#9ad8ff', 18), fmt(st.shards)),
        btn(t('Forge'), () => openMenu(app, 'forge'), { cls: 'small', iconName: 'anvil' }), Coop.active ? null : btn(t('Invite Friends'), () => inviteFriends(app), { cls: 'small', iconName: 'banner', tip: t('Open this world to friends (online co-op)'), disabled: !Net.online }), btn(t('Title'), () => app.toTitle(), { cls: 'small' }))),
    h('div.wm-main', h('div.wm-map', h('div.wm-parchment'), svg, nodes, h('div.wm-compass', '✦')), detail));
  el._refresh = () => { if (el.isConnected) worldMapScreen(app); };
  return mount(el);
}

export function epilogue(app) {
  return new Promise((res) => {
    const m = openModal(h('div.intro.epi', h('div.intro-text', h('p', t("Xal'Zhul falls, and the Abyss closes like a wound. One by one the drifting realms settle back into the sky, bound together by the paths you carved through them.")),
      h('p', t('The forest breathes. The desert cools. Frostfall thaws for the first time in an age. The dead of Velmora finally sleep, and above the Celestial Ruins a new star is lit.')),
      h('p', h('b', t('The Last World endures — because of you.'))), h('p.note', t('You may keep exploring: replay any stage to forge legendary gear, master every card and perfect your party.')),
      h('div.row.center', btn(t('Continue'), () => { m.close(); res(); }, { cls: 'primary' })))), { title: t('Heroes of the Last World'), closable: false, cls: 'wide intro-modal' });
  });
}
