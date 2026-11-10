// Localization. Thai is the default language; English is the fallback/source text.
// t('English text with {vars}', { vars }) looks the English string up in the active dictionary.
import { TH } from '../i18n/th.js';

const KEY = 'lw_lang';
let saved = null;
try { saved = localStorage.getItem(KEY); } catch { /* storage blocked */ }
export const LANG = saved === 'en' ? 'en' : 'th';
const DICT = LANG === 'th' ? TH : {};
if (typeof document !== 'undefined') document.documentElement.lang = LANG; // lets CSS adapt typography per script

export function t(s, vars) {
  if (s == null) return s;
  let out = DICT[s] ?? s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return out;
}

export function setLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* storage blocked */ }
  location.reload();
}

// Translate display fields of a data table in place (names, descriptions, quotes …).
const FIELDS = new Set(['name', 'title', 'subtitle', 'intro', 'desc', 'role', 'text', 'label', 'msg', 'quote', 'full', 'unique']);
export function localize(obj, seen = new Set()) {
  if (LANG === 'en' || !obj || typeof obj !== 'object' || seen.has(obj)) return obj;
  seen.add(obj);
  if (Array.isArray(obj)) { obj.forEach((x) => localize(x, seen)); return obj; }
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') { if (FIELDS.has(k) && DICT[v]) obj[k] = DICT[v]; }
    else if (k === 'names' && Array.isArray(v)) obj[k] = v.map((s) => DICT[s] ?? s);
    else if (v && typeof v === 'object') localize(v, seen);
  }
  return obj;
}
// Translate every string value of a flat map (e.g. STAT_LABEL).
export function localizeValues(map) {
  if (LANG === 'en') return map;
  for (const [k, v] of Object.entries(map)) if (typeof v === 'string' && DICT[v]) map[k] = DICT[v];
  return map;
}
