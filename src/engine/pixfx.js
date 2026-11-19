// Pixel-art skill effects, played from sprite sheets. The sheets are baked ahead of time by
// tools/bake-vfx.mjs from the designs in tools/vfx/effects.mjs; nothing is simulated or repainted here.
// A sheet is loaded the first time something asks for it; a battle asks for all of its own before it starts.
import * as THREE from 'three';
import { tween, Ease } from '../core/util.js';
import { SHEETS } from './vfxSheets.js';

const TEX = new Map(); // name → { tex, ready: Promise, held }
let world = null; // the renderer's owner, once known: a sheet that arrives late goes straight onto the graphics card
function sheet(name) {
  let e = TEX.get(name); if (e) return e;
  e = {}; e.ready = new Promise((res) => {
    e.tex = new THREE.TextureLoader().load(`/vfx/${name}.png`, () => { if (world) hold(world, e); res(true); }, undefined, () => res(false));
  });
  const t = e.tex; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  TEX.set(name, e); return e;
}
// Put the picture on the graphics card now, so the first time it is shown costs nothing.
function hold(w, e) { if (e.held || !e.tex.image) return; e.held = true; w.renderer.initTexture(e.tex); }
export const hasSheet = (name) => !!SHEETS[name];
export function preloadSheets(names, w = null) {
  if (w) world = w;
  return Promise.all([...new Set(names)].filter(hasSheet).map((n) => { const e = sheet(n); return e.ready.then((ok) => { if (ok && w) hold(w, e); return ok; }); }));
}
// Give the pictures back (after a battle): they come from the browser's cache next time.
export function releaseSheets() { for (const e of TEX.values()) e.tex.dispose(); TEX.clear(); world = null; }
// When the blow lands, in ms from the start of play().
export const hitMs = (name, speed = 1) => ((SHEETS[name]?.hit || 0) * 1000) / speed;
export const sheetMs = (name, speed = 1) => { const S = SHEETS[name]; return S ? ((S.n / S.fps) * 1000) / speed : 0; };

// Play a sheet at `pos`.  s: size multiplier · rot: turn on screen · flipX / flipY: mirror · speed: play rate
// ms + loop: keep looping for this long · len: stretch so the picture reaches this far right of its pivot (beams)
// fit: size the whole picture so it reaches this far right of its pivot (breath cones)
// move(position, k): carry it along while it plays.
//
// Every effect playing from a sheet shares that sheet's one texture and points it at its own frame just before
// it is drawn. (A texture clone per effect looks simpler, but three uploads a clone's picture again each time,
// and on a big sheet that froze the screen for a second.)
export function play(w, name, pos, { s = 1, rot = 0, flipX = false, flipY = false, speed = 1, ms = null, loop = false, fadeIn = 0, fadeOut = 0.2, move = null, len = null, fit = null, order = 33, opacity = 1, depth = false } = {}) {
  const S = SHEETS[name]; if (!S) return Promise.resolve();
  const span = S.n; ms ??= sheetMs(name, speed);
  world = w; const e = sheet(name); hold(w, e); const map = e.tex;
  const rx = (flipX ? -1 : 1) / S.cols, ry = (flipY ? -1 : 1) / S.rows; let ux = 0, uy = 0;
  const mat = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: depth, fog: false, toneMapped: false, rotation: rot, opacity });
  const sp = new THREE.Sprite(mat);
  sp.onBeforeRender = () => { map.repeat.set(rx, ry); map.offset.set(ux, uy); };
  sp.center.set(flipX ? 1 - S.ox / S.w : S.ox / S.w, flipY ? S.oy / S.h : 1 - S.oy / S.h);
  const px = fit != null ? fit / (S.w - S.ox) : S.px * s; const sx = len != null ? (len * S.w) / (S.w - S.ox) : S.w * px;
  sp.scale.set(sx, S.h * px, 1); sp.position.copy(pos); sp.renderOrder = order; w.fxGroup.add(sp);
  const frames = loop ? Math.max(span, Math.round((ms / 1000) * S.fps * speed)) : span;
  const show = (i) => { const col = i % S.cols, row = Math.floor(i / S.cols); ux = flipX ? (col + 1) / S.cols : col / S.cols; uy = flipY ? 1 - row / S.rows : 1 - (row + 1) / S.rows; };
  show(0);
  return tween(ms, (_, k) => {
    show(Math.min(frames - 1, Math.floor(k * frames)) % span);
    mat.opacity = opacity * Math.min(fadeIn ? k / fadeIn : 1, fadeOut ? (1 - k) / fadeOut : 1, 1);
    if (move) move(sp.position, k, sp);
  }, Ease.linear).then(() => { w.fxGroup.remove(sp); mat.dispose(); });
}

// Play a sheet painted from straight above, laid flat on the board round `center`: one hexagon per tile it reaches,
// each at that tile's own height, so it follows steps in the ground and whatever stands in front of it hides it.
// tiles: [{ x, y, z }] tile-top centres · r: a tile's radius · yaw: the camera's turn (the sheet's foot faces it)
let HEXGEO = null;
export function playFloor(w, name, center, tiles, { s = 1, order = 9, r = 0.985, yaw = 0 } = {}) {
  const S = SHEETS[name]; if (!S || !tiles.length) return Promise.resolve();
  world = w; const e = sheet(name); hold(w, e); const map = e.tex;
  HEXGEO ||= new THREE.CircleGeometry(r, 6).rotateZ(Math.PI / 6).rotateX(-Math.PI / 2).toNonIndexed();
  const px = S.px * s, cy = Math.cos(yaw), sy = Math.sin(yaw);
  const reach = Math.hypot(Math.max(S.ox, S.w - S.ox), Math.max(S.oy, S.h - S.oy)) * px + r;
  const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  mat.onBeforeCompile = (sh) => { // nothing past the edge of this frame (the next frame of the sheet is there)
    sh.vertexShader = 'varying vec2 vFrame;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vFrame = uv;');
    sh.fragmentShader = 'varying vec2 vFrame;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (vFrame.x < 0.0 || vFrame.y < 0.0 || vFrame.x > 1.0 || vFrame.y > 1.0) discard;');
  };
  mat.customProgramCacheKey = () => 'floor-frame';
  let ux = 0, uy = 0; const rx = 1 / S.cols, ry = 1 / S.rows;
  const near = tiles.filter((t) => Math.hypot(t.x - center.x, t.z - center.z) <= reach); if (!near.length) return Promise.resolve();
  const H = HEXGEO.attributes.position, n = H.count, pos = new Float32Array(near.length * n * 3), uv = new Float32Array(near.length * n * 2);
  near.forEach((t, j) => { // all the hexagons in one mesh: one draw however many tiles it covers
    for (let i = 0; i < n; i++) {
      const x = H.getX(i) + t.x, z = H.getZ(i) + t.z, o = j * n + i; pos[o * 3] = x; pos[o * 3 + 1] = t.y + 0.03; pos[o * 3 + 2] = z;
      const dx = x - center.x, dz = z - center.z, ix = (dx * cy - dz * sy) / px, iy = (dx * sy + dz * cy) / px; // right along the screen, down toward the camera
      uv[o * 2] = (S.ox + ix) / S.w; uv[o * 2 + 1] = 1 - (S.oy + iy) / S.h;
    }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const m = new THREE.Mesh(g, mat); m.renderOrder = order; m.frustumCulled = false;
  m.onBeforeRender = () => { map.repeat.set(rx, ry); map.offset.set(ux, uy); };
  w.fxGroup.add(m);
  const show = (i) => { ux = (i % S.cols) / S.cols; uy = 1 - (Math.floor(i / S.cols) + 1) / S.rows; }; show(0);
  return tween(sheetMs(name), (_, k) => show(Math.min(S.n - 1, Math.floor(k * S.n))), Ease.linear)
    .then(() => { w.fxGroup.remove(m); g.dispose(); mat.dispose(); });
}
