// The journey between two realms — a short scene after a realm's boss falls for the first time. The party walks
// (or sails) across a painted handscroll: flat colour, ink ridgelines, bands of mist and a low sun, on paper.
// The land it leaves gives way to the land it is going to, and the new realm's name and story close the scene.
// Everything is painted by code (no image or video files) from a small theme per stage, so a new stage needs
// one line in THEMES. The scene cannot be skipped: it plays once per realm, and in co-op everyone watches it.
// It returns a function that lifts the picture away (see the end of travelScene).
import { h, sleep, tween, Ease, RNG, hashStr } from '../core/util.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { G } from '../game/state.js';
import { STAGE_BY_ID } from '../data/stages.js';
import { ui, heroSprite } from './components.js';

// sky: top and horizon · far, mid, near: the three ridges · ground: what is walked on · shape: how the ridges run ·
// prop: what stands along the near ridge · sea: the party is in boats · dark: a dark sky, so words over it are light
const THEMES = {
  1: { sky: ['#9fc6a8', '#f3e2b8'], far: '#8fb49a', mid: '#5b8f6c', near: '#34664a', ground: '#3f7044', shape: 'hill', prop: 'tree' },
  2: { sky: ['#e89a5a', '#f6dfa8'], far: '#dfa96e', mid: '#c98a4c', near: '#a36634', ground: '#bd7d42', shape: 'dune', prop: 'cactus' },
  3: { sky: ['#9cc3dc', '#eef5f8'], far: '#b4cfdf', mid: '#86acc8', near: '#5f8aae', ground: '#e3eef4', shape: 'peak', prop: 'pine' },
  4: { sky: ['#4a3a5e', '#b9a9c9'], far: '#6a5982', mid: '#4a3a62', near: '#2f2444', ground: '#3a2e4e', shape: 'hill', prop: 'tomb', dark: true },
  5: { sky: ['#6f7fc0', '#f2e6c0'], far: '#98a3d6', mid: '#727cba', near: '#4e5494', ground: '#5d63a0', shape: 'peak', prop: 'pillar' },
  6: { sky: ['#3a1420', '#d06a4a'], far: '#74283a', mid: '#501826', near: '#300e18', ground: '#3e121c', shape: 'peak', prop: 'spike', dark: true },
  7: { sky: ['#4c2f66', '#cdb6e0'], far: '#7a5596', mid: '#5a3b76', near: '#3e2656', ground: '#452c60', shape: 'hill', prop: 'shroom', dark: true },
  8: { sky: ['#a07a48', '#f0dca8'], far: '#b09262', mid: '#866840', near: '#5e4828', ground: '#6e5634', shape: 'dune', prop: 'tower' },
  9: { sky: ['#8fc7d6', '#f3e7c4'], far: '#8fbccd', mid: '#5a9cba', near: '#33769c', ground: '#2c6e98', shape: 'wave', prop: 'islet', sea: true },
  10: { sky: ['#8a2a1a', '#f4b070'], far: '#93402a', mid: '#6c2a1c', near: '#461a10', ground: '#4e1e12', shape: 'peak', prop: 'vent', dark: true },
  11: { sky: ['#8a7ad0', '#f4f0ff'], far: '#b6abe8', mid: '#8a7bcc', near: '#6052a4', ground: '#6e60b4', shape: 'peak', prop: 'shard' },
};
const INK = '#2a1c16'; const PAPER = '#f1e4c5'; const SUN = '#d9482f';
const smooth = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const mix = (a, b, k) => { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = p(a), B = p(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')'; };

// A ridge's height (0..1 of its band) at x, repeating every `period` so the strip can scroll for ever.
function ridge(shape, seed) {
  const r = new RNG(seed); const ph = [r.float() * 6.28, r.float() * 6.28, r.float() * 6.28];
  return (u) => { // u: 0..1 along one period
    const a = u * Math.PI * 2;
    if (shape === 'peak') return 0.22 + 0.5 * Math.abs(Math.sin(a * 2 + ph[0])) * (0.6 + 0.4 * Math.sin(a * 3 + ph[1])) + 0.2 * Math.abs(Math.sin(a * 7 + ph[2]));
    if (shape === 'dune') return 0.3 + 0.3 * Math.sin(a * 2 + ph[0]) + 0.16 * Math.sin(a * 3 + ph[1]);
    if (shape === 'wave') return 0.3 + 0.34 * Math.abs(Math.sin(a * 6 + ph[0])) + 0.08 * Math.sin(a * 2 + ph[1]);
    return 0.36 + 0.26 * Math.sin(a * 2 + ph[0]) + 0.16 * Math.sin(a * 5 + ph[1]) + 0.06 * Math.sin(a * 11 + ph[2]);
  };
}

// What stands along the near ridge: small flat shapes with an ink edge. (x, y) is where it meets the ground; s its size.
const PROPS = {
  tree(g, x, y, s, c) { g.fillStyle = INK; g.fillRect(x - s * 0.06, y - s * 0.5, s * 0.12, s * 0.5); g.fillStyle = c; for (const [dx, dy, r] of [[0, -0.78, 0.36], [-0.26, -0.56, 0.28], [0.26, -0.58, 0.3]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.fill(); g.stroke(); } },
  pine(g, x, y, s, c) { g.fillStyle = INK; g.fillRect(x - s * 0.05, y - s * 0.3, s * 0.1, s * 0.3); for (let i = 0; i < 3; i++) { const w = s * (0.42 - i * 0.1), top = y - s * (0.55 + i * 0.3), base = y - s * (0.2 + i * 0.27); g.fillStyle = c; g.beginPath(); g.moveTo(x, top); g.lineTo(x + w, base); g.lineTo(x - w, base); g.closePath(); g.fill(); g.stroke(); g.fillStyle = PAPER; g.beginPath(); g.moveTo(x, top); g.lineTo(x + w * 0.45, top + (base - top) * 0.45); g.lineTo(x - w * 0.45, top + (base - top) * 0.45); g.closePath(); g.fill(); } },
  cactus(g, x, y, s, c) { g.fillStyle = c; const bar = (bx, by, w, hh) => { g.beginPath(); g.roundRect(bx - w / 2, by - hh, w, hh, w / 2); g.fill(); g.stroke(); }; bar(x, y, s * 0.2, s * 0.95); bar(x - s * 0.28, y - s * 0.3, s * 0.14, s * 0.42); bar(x + s * 0.28, y - s * 0.42, s * 0.14, s * 0.36); },
  tomb(g, x, y, s, c) { g.fillStyle = c; g.beginPath(); g.roundRect(x - s * 0.2, y - s * 0.62, s * 0.4, s * 0.62, [s * 0.2, s * 0.2, 0, 0]); g.fill(); g.stroke(); g.fillStyle = INK; g.fillRect(x - s * 0.03, y - s * 0.5, s * 0.06, s * 0.3); g.fillRect(x - s * 0.1, y - s * 0.42, s * 0.2, s * 0.06); },
  pillar(g, x, y, s, c) { g.fillStyle = c; g.fillRect(x - s * 0.12, y - s * 0.9, s * 0.24, s * 0.9); g.strokeRect(x - s * 0.12, y - s * 0.9, s * 0.24, s * 0.9); g.fillRect(x - s * 0.2, y - s * 1.0, s * 0.4, s * 0.12); g.strokeRect(x - s * 0.2, y - s * 1.0, s * 0.4, s * 0.12); g.fillStyle = PAPER; g.beginPath(); g.arc(x + s * 0.5, y - s * 1.3, s * 0.05, 0, 7); g.fill(); },
  spike(g, x, y, s, c) { g.fillStyle = c; for (const [dx, w, hh] of [[0, 0.2, 1.1], [-0.26, 0.14, 0.6], [0.24, 0.16, 0.75]]) { g.beginPath(); g.moveTo(x + dx * s, y - hh * s); g.lineTo(x + (dx + w) * s, y); g.lineTo(x + (dx - w) * s, y); g.closePath(); g.fill(); g.stroke(); } },
  shroom(g, x, y, s, c) { g.fillStyle = PAPER; g.fillRect(x - s * 0.07, y - s * 0.55, s * 0.14, s * 0.55); g.strokeRect(x - s * 0.07, y - s * 0.55, s * 0.14, s * 0.55); g.fillStyle = c; g.beginPath(); g.ellipse(x, y - s * 0.55, s * 0.42, s * 0.3, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = PAPER; for (const dx of [-0.2, 0.05, 0.24]) { g.beginPath(); g.arc(x + dx * s, y - s * 0.68, s * 0.05, 0, 7); g.fill(); } },
  tower(g, x, y, s, c) { g.fillStyle = c; g.fillRect(x - s * 0.16, y - s * 1.0, s * 0.32, s * 1.0); g.strokeRect(x - s * 0.16, y - s * 1.0, s * 0.32, s * 1.0); g.beginPath(); g.arc(x, y - s * 1.12, s * 0.2, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(x, y - s * 1.12, s * 0.06, 0, 7); g.fill(); g.fillRect(x - s * 0.04, y - s * 0.7, s * 0.08, s * 0.16); },
  islet(g, x, y, s, c) { g.fillStyle = mix(c, PAPER, 0.55); g.beginPath(); g.ellipse(x, y, s * 0.6, s * 0.22, 0, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = INK; g.fillRect(x - s * 0.03, y - s * 0.7, s * 0.06, s * 0.5); g.fillStyle = '#3f7044'; for (const a of [-0.9, -0.3, 0.3, 0.9]) { g.beginPath(); g.ellipse(x + Math.sin(a) * s * 0.2, y - s * 0.72 + Math.abs(a) * s * 0.06, s * 0.24, s * 0.07, a, 0, 7); g.fill(); } },
  vent(g, x, y, s, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x - s * 0.5, y); g.lineTo(x - s * 0.14, y - s * 0.7); g.lineTo(x + s * 0.14, y - s * 0.7); g.lineTo(x + s * 0.5, y); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ff9a3a'; g.beginPath(); g.ellipse(x, y - s * 0.7, s * 0.14, s * 0.05, 0, 0, 7); g.fill(); for (const [dx, dy, r] of [[0, -0.95, 0.07], [0.1, -1.15, 0.05], [-0.08, -1.3, 0.04]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); g.fill(); } },
  shard(g, x, y, s, c) { g.fillStyle = mix(c, PAPER, 0.5); for (const [dx, dy, k] of [[0, -0.9, 1], [0.4, -1.4, 0.5], [-0.36, -1.25, 0.4]]) { g.beginPath(); g.moveTo(x + dx * s, y + (dy - 0.5 * k) * s); g.lineTo(x + (dx + 0.16 * k) * s, y + dy * s); g.lineTo(x + dx * s, y + (dy + 0.5 * k) * s); g.lineTo(x + (dx - 0.16 * k) * s, y + dy * s); g.closePath(); g.fill(); g.stroke(); } },
};

// One ridge of one theme, painted once on a strip two periods wide (so any scroll offset can be cut from it).
function strip(W, H, theme, layer, seed) {
  const c = document.createElement('canvas'); c.width = W * 2; c.height = H; const g = c.getContext('2d');
  const f = ridge(layer === 2 && theme.sea ? 'wave' : theme.shape, seed); const colour = [theme.far, theme.mid, theme.near][layer];
  const top = H * [0.3, 0.46, 0.62][layer]; const band = H * [0.34, 0.3, 0.24][layer]; const yAt = (x) => top + band * (1 - f((x % W) / W));
  g.fillStyle = colour; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W * 2; x += 4) g.lineTo(x, yAt(x)); g.lineTo(W * 2, H); g.closePath(); g.fill();
  g.strokeStyle = INK; g.lineWidth = Math.max(1.5, H * 0.004) * (0.6 + layer * 0.3); g.lineJoin = 'round'; g.globalAlpha = 0.5 + layer * 0.2; g.beginPath(); for (let x = 0; x <= W * 2; x += 4) (x ? g.lineTo(x, yAt(x)) : g.moveTo(x, yAt(x))); g.stroke(); g.globalAlpha = 1;
  if (layer === 0 && theme.shape === 'peak') { // snow, ash or light on the far summits
    g.fillStyle = mix(colour, PAPER, 0.6); for (let x = 0; x < W * 2; x += 4) { const y = yAt(x); if (y < top + band * 0.42) g.fillRect(x, y + 1, 4, Math.min(band * 0.16, top + band * 0.42 - y)); } }
  if (layer > 0) { // what grows or stands there
    const r = new RNG(seed + 7); const paint = PROPS[theme.prop]; g.lineWidth = Math.max(1.2, H * 0.003); const s = H * (layer === 1 ? 0.07 : 0.13);
    for (let x = W * 0.04; x < W; x += W * (layer === 1 ? 0.07 : 0.11) * (0.7 + r.float() * 0.9)) { const k = s * (0.75 + r.float() * 0.6); for (const off of [0, W]) paint(g, x + off, yAt(x) + k * 0.06, k, mix(colour, layer === 1 ? theme.near : INK, layer === 1 ? 0.35 : 0.3)); }
  }
  return c;
}

// Paper: a faint speckle laid over the whole picture.
function grain(W, H) {
  const c = document.createElement('canvas'); c.width = Math.ceil(W / 2); c.height = Math.ceil(H / 2); const g = c.getContext('2d'); const r = new RNG(11);
  for (let i = 0; i < (c.width * c.height) / 14; i++) { g.fillStyle = r.float() < 0.5 ? 'rgba(60,40,20,0.10)' : 'rgba(255,250,235,0.10)'; g.fillRect(r.float() * c.width, r.float() * c.height, 1 + r.float() * 2, 1); }
  return c;
}

const TRAVEL_MS = 7600, HOLD_MS = 2600;

export async function travelScene(fromId, toId) {
  const from = STAGE_BY_ID[fromId], to = STAGE_BY_ID[toId]; if (!from || !to) return;
  const A = THEMES[fromId] || THEMES[1], B = THEMES[toId] || THEMES[1];
  const host = document.getElementById('game'); const box = host.getBoundingClientRect();
  const W = Math.min(1280, Math.round(box.width)), H = Math.round(W * (box.height / box.width));
  const canvas = h('canvas.tv-canvas', { width: W, height: H }); const g = canvas.getContext('2d');
  const seed = hashStr('travel' + fromId + '-' + toId);
  const SA = [0, 1, 2].map((l) => strip(W, H, A, l, seed + l * 31)), SB = [0, 1, 2].map((l) => strip(W, H, B, l, seed + 500 + l * 31));
  const paper = grain(W, H);
  // the travellers: the whole party in line, the leader in front
  const party = (G.state?.party || []).slice(0, 4); const size = Math.round(box.height * 0.24);
  const walkers = party.map((hero, i) => h('div.tv-walker', { style: { left: `calc(${42 - i * 10.5}% - ${size / 2}px)`, animationDelay: -i * 0.17 + 's' } }, h('i.tv-boat'), heroSprite(hero, { size, anim: 'walk', dir: 0 })));
  const card = h('div.tv-card' + (B.dark ? '.dark' : ''), h('div.tv-rank', t('Stage {n}', { n: to.id })), h('div.tv-name', to.name), h('div.tv-stroke', { style: { background: B.near } }), h('div.tv-note', h('div.tv-sub', to.subtitle), h('p.tv-intro', to.intro))); // the words sit on a slip of paper, readable over any sky
  const leaving = h('div.tv-from' + (A.dark ? '.dark' : ''), t('Leaving {stage}', { stage: from.name }));
  const foot = h('div.tv-foot', { style: { background: `linear-gradient(${B.ground}, ${B.ground} 20%, transparent)` } }); // the ground carries on below the picture's edge, then thins out over the board
  const el = h('div.travel', canvas, foot, h('div.tv-walkers', ...walkers), leaving, card, h('div.tv-seal', String(to.id)));
  ui().appendChild(el);
  window.addEventListener('keydown', stopKey, true); // no hotkeys while the scene plays

  const setBoat = (on) => { if (el.classList.contains('afloat') === on) return; el.classList.toggle('afloat', on); walkers.forEach((x) => { const s = x.querySelector('canvas')._sprite; if (s) s.anim = on ? 'idle' : 'walk'; }); };
  const speeds = [0.25, 0.6, 1.25]; const groundY = H * 0.84; const dist = W * 2.4; // how far the near ground moves in all
  let framed = true; // the print's ink border; taken off for the lift, where the ground must run on past the edge
  const draw = (p, ms) => {
    const k = smooth((p - 0.3) / 0.4); // how far the new land has taken over
    // sky: colour deepening upward (bokashi), the old sky giving way to the new
    for (const [T, a] of [[A, 1], [B, k]]) { if (!a) continue; const sky = g.createLinearGradient(0, 0, 0, H * 0.8); sky.addColorStop(0, T.sky[0]); sky.addColorStop(1, T.sky[1]); g.globalAlpha = a; g.fillStyle = sky; g.fillRect(0, 0, W, H); }
    g.globalAlpha = 1;
    // the sun, low and red, and bands of mist that drift the other way
    g.fillStyle = SUN; g.beginPath(); g.arc(W * (0.74 - p * 0.08), H * (0.24 + p * 0.03), H * 0.085, 0, 7); g.fill();
    g.fillStyle = PAPER; for (const [y, w, sp, a] of [[0.2, 0.34, 0.03, 0.75], [0.31, 0.5, 0.05, 0.6], [0.5, 0.42, 0.09, 0.5]]) { const x = ((1.2 - (p * dist * sp * 0.004 + y * 3)) % 1.6 + 1.6) % 1.6 - 0.4; g.globalAlpha = a; g.beginPath(); g.roundRect(x * W, y * H, w * W, H * 0.022, H * 0.011); g.fill(); g.beginPath(); g.roundRect((x + 0.07) * W, (y + 0.032) * H, w * 0.6 * W, H * 0.016, H * 0.008); g.fill(); }
    g.globalAlpha = 1;
    // the three ridges: far ones change first, as a traveller sees the land ahead before reaching it
    for (let l = 0; l < 3; l++) { const off = (p * dist * speeds[l]) % W; const kl = smooth((p - 0.22 - l * 0.08) / 0.34);
      if (kl < 1) { g.globalAlpha = 1; g.drawImage(SA[l], off, 0, W, H, 0, 0, W, H); }
      if (kl > 0) { g.globalAlpha = kl; g.drawImage(SB[l], off, 0, W, H, 0, 0, W, H); } }
    g.globalAlpha = 1;
    // the road (or the water) underfoot, with marks that run past
    g.fillStyle = mix(A.ground, B.ground, k); g.fillRect(0, groundY, W, H - groundY);
    g.strokeStyle = INK; g.globalAlpha = 0.55; g.lineWidth = Math.max(1.5, H * 0.004); g.beginPath(); g.moveTo(0, groundY); g.lineTo(W, groundY); g.stroke();
    const sea = k < 0.5 ? !!A.sea : !!B.sea; g.globalAlpha = 0.4; g.lineWidth = Math.max(1.2, H * 0.003); const step = W / 9; const o = (p * dist * 1.6) % step;
    for (let row = 0; row < 3; row++) for (let x = -o - (row % 2) * step * 0.5; x < W + step; x += step) { const y = groundY + H * (0.035 + row * 0.042);
      g.beginPath(); if (sea) { g.arc(x, y + H * 0.012, step * 0.16, Math.PI * 1.15, Math.PI * 1.85); } else { g.moveTo(x, y); g.lineTo(x + step * (0.16 + row * 0.05), y); } g.stroke(); }
    g.globalAlpha = 1; setBoat(sea);
    // paper, and a darker edge like the border of a print
    g.globalAlpha = 0.9; g.drawImage(paper, 0, 0, W, H); g.globalAlpha = 1;
    if (framed) { g.strokeStyle = INK; g.lineWidth = H * 0.012; g.strokeRect(0, 0, W, H); }
    void ms;
  };

  try {
    draw(0, 0); await sleep(30); el.classList.add('in'); audio.sfx('portal');
    const t0 = performance.now(); let titled = false;
    await new Promise((res) => { const tick = () => { const ms = performance.now() - t0; const p = Math.min(1, ms / TRAVEL_MS);
      if (!el.isConnected) return res();
      draw(p < 0.5 ? 2 * p * p * 0.5 + p * 0.5 : p, ms); // a gentle start, then a steady pace
      if (p > 0.34) leaving.classList.add('out');
      if (!titled && p > 0.62) { titled = true; card.classList.add('show'); audio.sfx('levelup'); }
      if (p >= 1) return res(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await sleep(HOLD_MS);
  } finally {
    window.removeEventListener('keydown', stopKey, true);
  }
  // The picture stays up while the next realm is laid out underneath it. The caller then lifts it, and the lift is
  // one camera move, not a fade: the view tips down from the horizon to the ground. The painting slides up and off
  // the top of the screen while the board's own camera (given as `world`) travels down onto the board from beyond
  // its far edge and draws back from a closer view. The new stage's HUD comes in at the end of the move.
  // It lifts itself if nobody does.
  let lifted = false; const MOVE = 1500;
  const lift = async (world = null) => {
    if (lifted) return; lifted = true; el.style.pointerEvents = 'none'; el.classList.add('lift'); framed = false; draw(1, 0);
    const hud = ui().querySelector('.explore-hud');
    el.animate([{ transform: 'none' }, { transform: 'translateY(-118%)' }], { duration: MOVE, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });
    hud?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.72 }, { opacity: 1 }], { duration: MOVE + 250 });
    if (world) { const c = world.cam; const home = { z: c.target.z, size: c.size }; const far = home.size * 0.6;
      c.target.z = home.z - far; c.size = home.size * 0.7;
      tween(MOVE, (e) => { c.target.z = home.z - far * (1 - e); c.size = home.size * (0.7 + 0.3 * e); }, Ease.inOutQuad).then(() => { c.target.z = home.z; c.size = home.size; }); }
    await sleep(MOVE + 60); el.remove();
  };
  setTimeout(() => lift(), 8000);
  return lift;
}
function stopKey(e) { e.stopPropagation(); e.preventDefault(); }
