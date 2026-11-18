// Plays one story scene over the whole game, and holds the "Story" page where scenes already seen can be watched
// again. It is part of the game from the start (see the import in main.js).
// A scene can never hold the game: it can be skipped, it ends itself if it runs far too long, and whatever goes
// wrong inside it is caught here and the game carries on.
import { mount, unmount, skip, debug, S } from './stage.js';
import { SCENES } from './scenes.js';
import { L, titleOf } from './lines.js';
import { h, sleep } from '../core/util.js';
import { t } from '../core/i18n.js';
import { openModal, btn } from '../ui/components.js';

let playing = null;
export const ORDER = Object.keys(SCENES);
// Cut the scene on screen short (id given: only if it is that one).
export function skipStory(id = null) { if (playing && (!id || playing.id === id)) { playing.skipped = true; skip(); } }
export const storyPlaying = () => playing?.id || null;
export const storyVotesChanged = () => playing?.paint?.(); // someone in the room pressed skip, or took it back

// party: the heroes, leader first · canSkip: this player may skip · vote: with friends, the tag is a vote and not a skip:
// { toggle(), state() -> { n, N, mine } }; the scene is then cut from outside (skipStory) when everyone has pressed ·
// world: the 3D board, which is not drawn while the scene covers it. Resolves true if it played to its end.
export async function playStory(id, party, { canSkip = true, onSkip = null, onShown = null, vote = null, world = null } = {}) {
  const fn = SCENES[id]; if (!fn || playing || !party?.length) return false;
  const me = (playing = { id, skipped: false });
  const canvas = h('canvas');
  const doSkip = () => { if (me.skipped) return; if (vote) { vote.toggle(); me.paint(); return; } me.skipped = true; onSkip?.(); skip(); };
  const tag = canSkip ? h('button.st-skip', { onclick: doSkip }, L('skip')) : h('div.st-skip.note', L('hostSkips'));
  if (vote && canSkip) { tag.classList.add('vote'); me.paint = () => { const v = vote.state(); tag.classList.toggle('on', v.mine); tag.replaceChildren(h('span', L('skip') + ' ' + v.n + '/' + v.N), h('small', L('allSkip'))); }; me.paint(); }
  const el = h('div.story', h('div.st-frame', canvas), tag);
  const key = (e) => { e.stopPropagation(); e.preventDefault(); if (e.key === 'Escape' && canSkip && !e.repeat) doSkip(); }; // no hotkeys reach the game under the scene
  document.getElementById('game').appendChild(el); window.addEventListener('keydown', key, true);
  try {
    await Promise.race([document.fonts?.ready, sleep(1200)]); await sleep(30); el.classList.add('in'); await sleep(330); onShown?.(); // (the scene's own black is up: whatever was covering the board can go)
    if (world) world.hidden = true;
    mount(canvas);
    const tooLong = setTimeout(() => { console.warn('[story] scene ran too long and was ended', id); skip(); }, 180000);
    try { if (!me.skipped) await fn({ party }); } catch (e) { if (e !== 'skip') console.error('[story]', id, e); } finally { clearTimeout(tooLong); }
  } catch (e) { console.error('[story]', id, e); } finally {
    if (world) world.hidden = false;
    window.removeEventListener('keydown', key, true);
    canvas.style.opacity = 0; await sleep(200); el.classList.remove('in'); await sleep(340);
    unmount(); el.remove(); if (playing === me) playing = null;
  }
  return !me.skipped;
}

// The "Story" page: every scene this world has shown, by realm, to watch again.
export function storyPage(app, seen, canPlay) {
  const rows = ORDER.filter((id) => id !== '1B' || seen(id)).map((id) => { const ok = seen(id);
    return h('div.sp-row' + (ok ? '' : '.locked'), h('span.sp-no', id), h('span.sp-name', ok ? titleOf(id) : '???'), ok ? btn(t('Watch'), () => { m.close(); app.story(id, { replay: true }); }, { cls: 'small', disabled: !canPlay }) : null); });
  const m = openModal(h('div.story-page', canPlay ? null : h('p.note', t('Scenes can be watched again when you play alone.')), h('div.sp-list', ...rows)), { title: t('Story'), cls: 'narrow' });
  return m;
}

if (typeof window !== 'undefined') window.__story = { play: playStory, skip: skipStory, debug, state: () => S, ORDER }; // handles for debugging and automated tests
