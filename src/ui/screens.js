// Menu screens: Title, Account (Firebase auth), Character Selection, World Map.
import { h, fmt } from '../core/util.js';
import { t, LANG, setLang } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { G, claimableQuests } from '../game/state.js';
import { computeStats, createHero } from '../game/character.js';
import { CLASSES, CLASS_ORDER } from '../data/classes.js';
import { STARTER_DECKS, ELEMENTS } from '../data/cards.js';
import { STAGES } from '../data/stages.js';
import { MONSTERS } from '../data/monsters.js';
import { UNIQUES } from '../data/items.js';
import { CARDS } from '../data/cards.js';
import { Net } from '../net/firebase.js';
import { ui, btn, icon, openModal, heroSprite, monsterSprite, cardEl, toast, toggleFullscreen, confirmBox, bar } from './components.js';
import { openMenu } from './panels.js';
import { coopModal } from './coopUI.js';

function mount(el) { ui().querySelectorAll('.screen').forEach((s) => s.remove()); ui().appendChild(el); return el; }
export function clearScreens() { ui().querySelectorAll('.screen, .battle-hud, .explore-hud').forEach((s) => s.remove()); }

// ───────── Title ─────────
export function titleScreen(app) {
  const st = G.state;
  const letters = (t) => [...t].map((ch, i) => h('span', { style: { animationDelay: `${i * 70}ms` } }, ch === ' ' ? ' ' : ch));
  const el = h('div.screen.title-screen',
    h('div.title-rays'), h('div.title-vignette'),
    h('div.title-logo', h('div.logo-crest', icon('crown', '#f6d98a', 44)), h('h1.logo', h('span.logo-word', ...letters('LAST')), h('span.logo-word.w2', ...letters('WORLD'))), h('div.logo-sub', t('A Tactical Card Chronicle of the Sundered Realms'))),
    h('div.title-menu',
      st ? btn(t('Continue'), () => app.continueGame(), { cls: 'primary big', iconName: 'sword' }) : null,
      st ? h('div.continue-info', t('{party} — Stage {n}{prog}', { party: st.party.map((p) => `${p.name} Lv ${p.level}`).join(' · '), n: Math.min(6, st.unlocked), prog: st.run ? t(' (in progress)') : '' })) : null,
      btn(t('New Game'), async () => { if (!st || await confirmBox(t('Start a New Game?'), t('This will overwrite your current campaign save.'), t('Start Over'))) app.toCharSelect(); }, { cls: st ? 'big ghost' : 'primary big', iconName: 'star' }),
      btn(t('Play with Friends'), () => coopModal(app), { cls: 'big ghost', iconName: 'banner', disabled: !Net.online }),
      btn(t(Net.online && Net.user ? 'Account' : 'Sign In'), () => app.openAuth(() => app.toTitle(true)), { cls: 'big ghost', iconName: 'book' }),
      btn(t('Fullscreen'), toggleFullscreen, { cls: 'big ghost', iconName: 'flag' }),
      btn(LANG === 'th' ? 'English' : 'ภาษาไทย', () => setLang(LANG === 'th' ? 'en' : 'th'), { cls: 'big ghost', iconName: 'star' })),
    h('div.title-foot', h('span.net' + (Net.online && Net.user ? '.on' : ''), Net.label()), h('span', 'v1.0 · Three.js · Firebase')));
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

// ───────── Character Selection ─────────
export function charSelectScreen(app) {
  let picks = ['knight']; let focus = 'knight';
  const names = {};
  const list = h('div.cs-list'); const detail = h('div.cs-detail'); const partyBar = h('div.cs-party');
  const start = btn(t('Begin Journey'), () => app.startNewGame(picks.map((cls) => ({ cls, name: (names[cls] || '').trim() || CLASSES[cls].name }))), { cls: 'primary big' });
  const render = () => {
    list.replaceChildren(...CLASS_ORDER.map((cls, i) => { const C = CLASSES[cls]; const idx = picks.indexOf(cls);
      return h('div.cs-card' + (idx >= 0 ? '.picked' : '') + (focus === cls ? '.focus' : ''), { style: { '--c': C.color, animationDelay: `${i * 70}ms` },
        onclick: () => { audio.sfx('click'); focus = cls; if (idx >= 0) { if (picks.length > 1) picks.splice(idx, 1); } else if (picks.length < 3) picks.push(cls); else toast(t('Your party can hold 3 heroes'), 'bad'); render(); },
        onmouseenter: (e) => { const cv = e.currentTarget.querySelector('canvas'); if (cv?._sprite) cv._sprite.anim = 'walk'; audio.sfx('hover'); }, onmouseleave: (e) => { const cv = e.currentTarget.querySelector('canvas'); if (cv?._sprite) cv._sprite.anim = 'idle'; } },
        idx >= 0 ? h('div.cs-order', idx === 0 ? t('LEADER') : `#${idx + 1}`) : null,
        heroSprite(cls, { size: 150, zoom: 1.05 }), h('div.cs-name', C.name), h('div.cs-role', C.role));
    }));
    const C = CLASSES[focus]; const s = computeStats(createHero(focus));
    const statBar = (label, v, max) => h('div.cs-stat', h('span', label), h('div.cs-bar', h('i', { style: { width: Math.min(100, (v / max) * 100) + '%' } })), h('b', v));
    const anims = ['idle', 'attack', 'cast', 'walk'];
    const big = heroSprite(focus, { size: 260, zoom: 1.05, cls: 'cs-big' });
    let ai = 0; clearInterval(render._t); render._t = setInterval(() => { if (!big.isConnected) return clearInterval(render._t); ai = (ai + 1) % anims.length; big._sprite.anim = anims[ai]; big._sprite.dir = [5, 0, 5, 4][ai]; }, 1400);
    detail.replaceChildren(
      h('div.cs-hero', h('div.cs-pedestal'), big),
      h('div.cs-info', h('div.cs-title', { style: { color: C.color } }, C.name), h('div.cs-sub', `${C.title} · ${ELEMENTS[C.element].name}`), h('p', C.desc),
        h('div.cs-stats', statBar('HP', s.hp, 130), statBar('MP', s.mp, 60), statBar('ATK', s.atk, 26), statBar('MATK', s.matk, 26), statBar('DEF', s.def, 14), statBar('SPD', s.spd, 34), statBar(t('MOVE'), s.move, 5)),
        h('div.cs-deck-title', t('Starting Deck')), h('div.cs-deck', ...[...new Set(STARTER_DECKS[focus])].map((id) => cardEl(id, 0, { small: true })))));
    partyBar.replaceChildren(h('div.cs-party-label', t('YOUR PARTY — choose 1 to 3 heroes')), ...picks.map((cls, i) => h('div.cs-slot', heroSprite(cls, { size: 64, zoom: 1.4, oy: 0.25 }),
      h('input', { value: names[cls] || '', placeholder: CLASSES[cls].name, maxlength: 14, oninput: (e) => { names[cls] = e.target.value; } }), h('small', i === 0 ? t('Leader') : CLASSES[cls].name))),
      ...Array.from({ length: 3 - picks.length }, () => h('div.cs-slot.empty', t('Empty'))));
  };
  render();
  return mount(h('div.screen.cs-screen', h('div.cs-head', h('h2', t('Choose Your Heroes')), btn(t('Back'), () => app.toTitle(), { cls: 'small' })), list, detail, h('div.cs-foot', partyBar, start)));
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
    h('div.wm-top', h('h2', t('The Sundered Realms')),
      h('div.wm-party', ...st.party.map((p) => { const cs = computeStats(p); return h('div.p-card', { onclick: () => openMenu(app, 'hero') }, h('div.p-portrait', heroSprite(p.cls, { size: 64, zoom: 1.5, oy: 0.3 })), h('div.p-body', h('div.p-name', p.name, h('span', ` Lv ${p.level}`), p.statPoints + p.skillPoints > 0 ? h('i.pip', '!') : null), bar('hp', p.hp, cs.hp), bar('mp', p.mp, cs.mp))); })),
      h('div.wm-actions', h('div.res', icon('coin', '#ffd24a', 18), fmt(st.gold)), h('div.res', icon('gem', '#9ad8ff', 18), fmt(st.shards)),
        btn(q ? t('Journal ({n})', { n: q }) : t('Journal'), () => openMenu(app), { cls: 'small', iconName: 'book' }), btn(t('Forge'), () => openMenu(app, 'forge'), { cls: 'small', iconName: 'anvil' }), btn(t('Title'), () => app.toTitle(), { cls: 'small' }))),
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
