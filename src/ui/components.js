// UI System — shared widgets: cards, sprite portraits, modals, toasts, tooltips, transitions.
import { h, sleep } from '../core/util.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { getSheet, drawFrame, iconCanvas, FRAMES } from '../engine/sprites.js';
import { CARDS, cardStats, describeCard, ELEMENTS, CATEGORIES, RARITY, STATUS_INFO, DICE_NAME, diceLabel } from '../data/cards.js';
import { ITEM_RARITY, STAT_LABEL } from '../data/items.js';
import { cardArt } from './cardArt.js';
import { CLASSES, heroLook } from '../data/classes.js';
import { MONSTERS } from '../data/monsters.js';

export const ui = () => document.getElementById('ui');

// ───── animated sprite canvases (shared rAF loop) ─────
const live = new Set();
let looping = false;
function loop(now) {
  for (const s of live) {
    if (!s.canvas.isConnected) { if (now - s.born > 1500) live.delete(s); continue; }
    const fps = { idle: 5, walk: 9, attack: 10, cast: 7, hurt: 8 }[s.anim] || 6;
    const f = Math.floor(now / (1000 / fps)) % FRAMES;
    if (f === s.lastF && s.anim === s.lastA && s.dir === s.lastD) continue;
    s.lastF = f; s.lastA = s.anim; s.lastD = s.dir;
    const ctx = s.canvas.getContext('2d'); ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
    drawFrame(ctx, s.sheet, s.anim, s.dir, f, s.ox, s.oy, s.dw, s.dh);
  }
  if (live.size) requestAnimationFrame(loop); else looping = false;
}
export function spriteCanvas(key, look, { size = 128, anim = 'idle', dir = 5, zoom = 1, cls = '', oy = 0 } = {}) {
  // Large portraits get a backing store at the screen's pixel density and a larger sprite sheet, so they
  // are drawn sharp instead of being a small frame stretched up. Small ones keep the light 128px sheet.
  const k = size >= 150 ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const canvas = h('canvas.sprite-canvas' + (cls ? '.' + cls : ''), { width: Math.round(size * k), height: Math.round(size * k) });
  if (k !== 1) { canvas.style.width = size + 'px'; canvas.style.height = size + 'px'; }
  const dw = size * zoom * k, dh = size * zoom * k;
  const sheet = getSheet(key, look, dw > 150 ? 256 : 128);
  const s = { canvas, sheet, anim, dir, ox: (size * k - dw) / 2, oy: size * k - dh + oy * size * k, dw, dh, born: performance.now() };
  live.add(s); canvas._sprite = s;
  if (!looping) { looping = true; requestAnimationFrame(loop); }
  return canvas;
}
// `hero` is a hero ({ cls, gender }) or a bare class id
export const heroSprite = (hero, opts) => { const L = heroLook(hero); return spriteCanvas(L.key, L.look, opts); };
export const monsterSprite = (id, opts) => spriteCanvas('mon_' + id, MONSTERS[id].look, opts);
export const unitSprite = (u, opts) => spriteCanvas(u.spriteKey, u.look, opts);

export const icon = (name, color = '#fff', size = 20) => h('img.icon', { src: iconCanvas(name, color, 64), width: size, height: size, draggable: 'false', decoding: 'sync' });

// ───── cards ─────
// A dice chip such as [■■ red ×2]; card text marks dice as ⟦red:2⟧ (see describeCard).
// A small drawn die (or several), for wherever a roll is written next to text.
export const die = (n = 1) => Array.from({ length: n }, () => h('i.die'));
export function diceChip(color, n) {
  return h(`span.dchip.${color}`, { 'data-tip': diceLabel(color, n) }, ...Array.from({ length: n }, () => h('i')), h('b', `${t(DICE_NAME[color])}×${n}`));
}
function richText(s) {
  return s.split(/(⟦\w+:\d+⟧)/).filter(Boolean).map((p) => { const m = p.match(/^⟦(\w+):(\d+)⟧$/); return m ? diceChip(m[1], +m[2]) : p; });
}
export function cardEl(id, level = 0, { unit = null, small = false, count = null } = {}) {
  const c = cardStats(id, level) || CARDS[id];
  const d = describeCard(c, unit);
  const el = ELEMENTS[c.el]; const cat = CATEGORIES[c.cat];
  const range = c.tg === 'self' ? (c.shape === 'burst' ? t('Burst {n}', { n: c.size }) : t('Self')) : `${t('Range {n}', { n: c.range })}${d.shape ? ' · ' + d.shape : ''}`;
  return h(`div.card.cat-${c.cat}.rar-${c.rarity}${small ? '.small' : ''}`, { style: { '--el': c.el === 'neutral' ? cat.color : el.color, '--elg': el.glow, '--cat': cat.color, '--rar': RARITY[c.rarity].color, '--art': `url(${cardArt(id)})` }, 'data-id': id },
    h('div.card-frame'),
    h('div.card-cost', { 'data-tip': t('Action Slots this card takes') }, c.cost),
    c.mp ? h('div.card-mp', { 'data-tip': t('MP cost') }, c.mp) : null,
    count != null ? h('div.card-count', '×' + count) : null,
    h('div.card-name', c.name),
    h('div.card-art'),
    h('div.card-type', `${cat.name}${c.el !== 'neutral' ? ' · ' + el.name : ''}`),
    h('div.card-text', ...richText(d.text)),
    h('div.card-foot', h('span', range), h('span.cd', c.cd ? t('CD {n}', { n: c.cd }) : t('No CD'))),
  );
}

// ───── items ─────
export function itemStats(item) {
  return Object.entries(item.stats).map(([k, v]) => h('div.stat-line', h('span', STAT_LABEL[k] || k), h('b', '+' + v)));
}
export function itemEl(item, { onClick = null, tag = null } = {}) {
  const r = ITEM_RARITY[item.rarity];
  return h('div.item', { style: { '--rar': r.color }, onclick: onClick, 'data-tip-html': itemTip(item) },
    h('div.item-icon', icon(item.icon, r.color, 34)),
    h('div.item-info', h('div.item-name', item.name), h('div.item-sub', `${r.name} · ${t('Tier {n}', { n: item.tier })} ${t(item.type)}`)),
    tag ? h('div.item-tag', tag) : null);
}
export function itemTip(item) {
  const r = ITEM_RARITY[item.rarity];
  return `<div class="tip-title" style="color:${r.color}">${item.name}</div><div class="tip-sub">${r.name} ${t(item.type)} · ${t('Tier {n}', { n: item.tier })}</div>` +
    Object.entries(item.stats).map(([k, v]) => `<div class="tip-stat"><span>${STAT_LABEL[k] || k}</span><b>+${v}</b></div>`).join('') +
    (item.unique ? `<div class="tip-unique">${item.unique}</div>` : '') + `<div class="tip-sub">${t('Sell: {n} gold', { n: Math.round(item.value * 0.4) })}</div>`;
}

export function statusChips(unit) {
  return Object.entries(unit.status).map(([st, s]) => {
    const info = STATUS_INFO[st];
    return h('span.status-chip', { style: { '--c': info.color }, 'data-tip': `${info.name}${s.n > 1 ? ' ' + s.n : ''} — ${info.desc}` }, info.icon, s.n > 1 ? h('i', s.n) : null);
  });
}

export function bar(cls, v, max, label = true) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0;
  return h(`div.bar.${cls}`, h('div.bar-fill', { style: { width: pct + '%' } }), label ? h('div.bar-text', `${Math.max(0, Math.round(v))} / ${Math.round(max)}`) : null);
}

// ───── buttons ─────
export function btn(label, onClick, { cls = '', disabled = false, tip = null, iconName = null } = {}) {
  const b = h('button.btn' + (cls ? '.' + cls.split(' ').join('.') : ''), { disabled, 'data-tip': tip, onclick: (e) => { audio.init(); audio.sfx('click'); onClick?.(e); }, onmouseenter: () => audio.sfx('hover') },
    iconName ? icon(iconName, '#f4e4bc', 18) : null, h('span', label));
  return b;
}

// The bag: a round paper token next to your hero. It opens the Journal (stats, gear, deck, forge, quests);
// the red pip counts what is waiting there — unspent stat / skill points and quests ready to claim.
const tokenButton = (ic, label, tip, onClick, n) => h('button.bag-btn', { 'data-tip': tip, onclick: () => { audio.init(); audio.sfx('click'); onClick(); }, onmouseenter: () => audio.sfx('hover') },
  h('span.bag-token', icon(ic, '#3a2a20', 30)), h('small', label), n > 0 ? h('i.pip', n) : null);
export const bagButton = (onClick, n = 0) => tokenButton('bag', t('Bag'), t('Bag — spend stat and skill points, change equipment, build your deck (Tab)'), onClick, n);
// The quest log has its own token; its pip counts the quests whose reward is ready to claim.
export const questButton = (onClick, n = 0) => tokenButton('flag', t('Quests'), t('Quests — see your goals and claim rewards (Q)'), onClick, n);

// Drag a piece (a card, an item) onto a drop zone: any element with a `data-drop` name. A press that does
// not move stays an ordinary click. `ghost()` builds what follows the pointer; `onDrop(zoneName, zoneEl)`.
export function dragPiece(el, { ghost, onDrop }) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.pointerType === 'touch') return; // on touch a drag scrolls the list; tapping does the same job
    const sx = e.clientX, sy = e.clientY; let g = null; let over = null;
    const move = (ev) => {
      if (!g && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
        g = ghost(); g.classList.add('drag-piece'); document.getElementById('game').appendChild(g); el.classList.add('drag-from');
        document.getElementById('tooltip')?.classList.remove('show'); audio.sfx('draw');
      }
      if (!g) return;
      g.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -50%) rotate(-4deg)`;
      const z = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]') || null;
      if (z !== over) { over?.classList.remove('drop-over'); over = z; over?.classList.add('drop-over'); }
    };
    const end = (drop) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
      if (!g) return;
      g.remove(); el.classList.remove('drag-from'); over?.classList.remove('drop-over');
      // the click that follows a drag must not also count as a press on the piece
      const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; window.addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', eat, { capture: true }), 0);
      if (drop && over) onDrop(over.dataset.drop, over);
    };
    const up = () => end(true); const cancel = () => end(false);
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  });
}

// ───── modal ─────
export function openModal(content, { cls = '', closable = true, onClose = null, title = null } = {}) {
  audio.sfx('open');
  let closed = false;
  const close = () => { if (closed) return; closed = true; audio.sfx('close'); wrap.classList.add('closing'); setTimeout(() => wrap.remove(), 220); onClose?.(); };
  const box = h('div.modal' + (cls ? '.' + cls.split(' ').join('.') : ''),
    title ? h('div.modal-title', h('span.orn', '❖'), title, h('span.orn', '❖')) : null,
    closable ? h('button.modal-x', { onclick: close, 'data-tip': t('Close (Esc)') }, '✕') : null,
    h('div.modal-body', content),
    h('i.mc.tl'), h('i.mc.tr'), h('i.mc.bl'), h('i.mc.br'));
  const wrap = h('div.modal-wrap', { onpointerdown: (e) => { if (e.target === wrap && closable) close(); } }, box);
  wrap._close = closable ? close : null;
  ui().appendChild(wrap);
  // give keyboard players a starting point: first text field, else the primary button
  requestAnimationFrame(() => (box.querySelector('[autofocus]') || box.querySelector('.modal-body input, .modal-body .btn.primary'))?.focus({ preventScroll: true }));
  return { el: box, wrap, close, body: box.querySelector('.modal-body') };
}
export function topModal() { const all = ui().querySelectorAll('.modal-wrap:not(.closing)'); return all[all.length - 1] || null; }

export function confirmBox(title, text, yes = t('Confirm'), no = t('Cancel')) {
  return new Promise((res) => {
    const m = openModal(h('div.confirm', h('p', text), h('div.row.center', btn(no, () => { m.close(); res(false); }), btn(yes, () => { m.close(); res(true); }, { cls: 'primary' }))), { title, closable: false, cls: 'narrow' });
  });
}

export function toast(text, cls = '') {
  let host = document.getElementById('toasts');
  if (!host) { host = h('div#toasts'); document.getElementById('game').appendChild(host); }
  const t = h('div.toast' + (cls ? '.' + cls : ''), text);
  host.appendChild(t); setTimeout(() => t.classList.add('out'), 2200); setTimeout(() => t.remove(), 2700);
}

export async function banner(text, sub = '', cls = '', ms = 1300) {
  const b = h('div.banner' + (cls ? '.' + cls.split(' ').join('.') : ''), h('div.banner-line'), h('div.banner-text', text), sub ? h('div.banner-sub', sub) : null, h('div.banner-line'));
  document.getElementById('game').appendChild(b);
  await sleep(ms); b.classList.add('out'); await sleep(350); b.remove();
}

// Screen transition: fade to black, swap, fade back in.
export async function transition(fn) {
  const f = document.getElementById('fade');
  f.classList.add('on'); audio.sfx('portal');
  await sleep(420);
  try { await fn(); } finally { await sleep(120); f.classList.remove('on'); }
}

// ───── tooltips (delegated) ─────
export function initTooltips() {
  const tip = h('div#tooltip'); document.getElementById('game').appendChild(tip);
  let cur = null;
  const hide = () => { tip.classList.remove('show'); cur = null; };
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest?.('[data-tip],[data-tip-html]');
    if (!t) { if (cur) hide(); return; }
    if (t !== cur) {
      cur = t;
      if (t.dataset.tipHtml) tip.innerHTML = t.dataset.tipHtml; else tip.textContent = t.dataset.tip;
      tip.classList.add('show');
    }
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 16, y = e.clientY + 18;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 12;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 12;
    tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
  });
  document.addEventListener('pointerdown', hide);
}

export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  // on phones, going fullscreen also turns the game to landscape where the browser allows it
  else document.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
}
