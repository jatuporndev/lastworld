// Shared utilities: seeded RNG, tweening, timing helpers, DOM helpers.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = Date.now()) { this.seed = seed >>> 0; this.next = mulberry32(this.seed); }
  float() { return this.next(); }
  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  weighted(entries) { // [{w, v}]
    const total = entries.reduce((s, e) => s + e.w, 0);
    let roll = this.next() * total;
    for (const e of entries) { roll -= e.w; if (roll <= 0) return e.v; }
    return entries[entries.length - 1].v;
  }
}

export const rng = new RNG();

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const Ease = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inQuad: (t) => t * t,
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
};

// Tween manager driven by the main loop.
const tweens = new Set();
export function tween(duration, onUpdate, ease = Ease.outQuad) {
  return new Promise((resolve) => {
    tweens.add({ t: 0, duration: Math.max(1, duration), onUpdate, ease, resolve });
  });
}
export function updateTweens(dtMs) {
  for (const tw of tweens) {
    tw.t += dtMs;
    const k = Math.min(1, tw.t / tw.duration);
    tw.onUpdate(tw.ease(k), k);
    if (k >= 1) { tweens.delete(tw); tw.resolve(); }
  }
}

// Minimal event bus
const listeners = {};
export const bus = {
  on(ev, fn) { (listeners[ev] ||= new Set()).add(fn); return () => listeners[ev].delete(fn); },
  emit(ev, data) { listeners[ev]?.forEach((fn) => fn(data)); },
};

// DOM helper: h('div.cls#id', {attrs}, children)
export function h(tag, attrs = {}, ...children) {
  const m = tag.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement(m[1] || 'div');
  (m[2].match(/[.#][\w-]+/g) || []).forEach((p) => {
    if (p[0] === '.') el.classList.add(p.slice(1)); else el.id = p.slice(1);
  });
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = {}; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') { for (const [p, val] of Object.entries(v)) { if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val; } }
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  children.forEach(add);
  return el;
}

export function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

// The UI builds child lists with `cond ? node : null`. Native replaceChildren would render
// those as the text "null", so drop empty entries (same rule h() applies to its children).
if (typeof Element !== 'undefined' && !Element.prototype._lwPatched) {
  const native = Element.prototype.replaceChildren;
  Element.prototype.replaceChildren = function (...nodes) { return native.apply(this, nodes.flat().filter((n) => n != null && n !== false)); };
  Element.prototype._lwPatched = true;
}
