// Renderer — Three.js 2.5D tabletop diorama: textured 3D hex terrain pieces, soft shadows, fog,
// billboarded sprite-sheet units, highlights, particles, camera.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as Hex from './hex.js';
import { getSheet, DIR_VIEW, ANIMS, FRAMES, VIEWS, iconCanvas } from './sprites.js';
import { terrainOf } from '../data/terrain.js';
import { tween, updateTweens, Ease, sleep, clamp } from '../core/util.js';
import { audio } from '../core/audio.js';
import { topTexture, sideTexture, waterTexture, waterfallTexture, tableTexture, blobShadowTexture, styleOf } from './terrainArt.js';
import { PropKit, THEMES } from './props.js';

const COLS = VIEWS.length * FRAMES, ROWS = ANIMS.length;
const ANIM_FPS = { idle: 5, walk: 10, attack: 12, hurt: 10, cast: 8 };
const EL_COLOR = { neutral: 0xfff0d0, fire: 0xff7a2a, ice: 0x8fe0ff, wind: 0x9affc0, earth: 0xd0a060, holy: 0xfff0a0, shadow: 0xb070ff, poison: 0xa0f050, arcane: 0xc0a0ff };
export const elColor = (el) => EL_COLOR[el] ?? EL_COLOR.neutral;
const BASE_Y = -1.25;  // every terrain piece rests on the table at this height
const LIP = 0.08;      // bevelled rim on top of each piece
const SUN_OFFSET = new THREE.Vector3(-10, 17, 8);

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// The pieces every boat is built from (made once): a hull with a pointed bow toward +x, its pale rim, the dark well, a seat.
function boatParts() {
  const outline = (k) => { const s = new THREE.Shape(); s.moveTo(-0.95 * k, 0); s.quadraticCurveTo(-0.5 * k, 0.5 * k, 0.3 * k, 0.46 * k); s.quadraticCurveTo(0.85 * k, 0.3 * k, 1.15 * k, 0); s.quadraticCurveTo(0.85 * k, -0.3 * k, 0.3 * k, -0.46 * k); s.quadraticCurveTo(-0.5 * k, -0.5 * k, -0.95 * k, 0); return s; };
  return {
    hull: new THREE.ExtrudeGeometry(outline(0.9), { depth: 0.3, bevelEnabled: false }), rim: new THREE.ExtrudeGeometry(outline(0.94), { depth: 0.07, bevelEnabled: false }),
    deck: new THREE.ShapeGeometry(outline(0.74)).translate(0, 0, 0.065), seat: new THREE.BoxGeometry(0.12, 0.06, 0.62), ring: new THREE.RingGeometry(0.78, 1, 28),
    wood: new THREE.MeshLambertMaterial({ color: 0x7a4e2c }), pale: new THREE.MeshLambertMaterial({ color: 0xc89a62 }), dark: new THREE.MeshLambertMaterial({ color: 0x3e2616 }),
  };
}
const flatMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, fog: false });

export class World {
  constructor(canvas, labelsEl) {
    this.canvas = canvas; this.labelsEl = labelsEl;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x101020, 62, 120);
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -100, 300);
    this.cam = { target: new THREE.Vector3(), size: 16, yaw: 0, elev: 0.86, shake: 0, shakeT: 0, offY: 0, zoom: 1, pan: new THREE.Vector3() };
    // cinematic three-point lighting: warm key with soft shadows, cool fill, sky/ground bounce
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x404060, 1.0); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d0, 2.8); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); const sc = this.sun.shadow.camera; sc.left = -19; sc.right = 19; sc.top = 19; sc.bottom = -19; sc.near = 1; sc.far = 70;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.035; this.sun.shadow.radius = 5;
    this.scene.add(this.sun, this.sun.target);
    this.fill = new THREE.DirectionalLight(0x8ab8ff, 0.7); this.fill.position.set(12, 6, 10); this.scene.add(this.fill);
    // the table the diorama stands on
    this.tableMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.02 });
    this.table = new THREE.Mesh(new THREE.PlaneGeometry(320, 320).rotateX(-Math.PI / 2), this.tableMat); this.table.position.y = BASE_Y - 0.01; this.table.receiveShadow = true; this.scene.add(this.table);
    this.boardGroup = new THREE.Group(); this.hlGroup = new THREE.Group(); this.unitGroup = new THREE.Group(); this.fxGroup = new THREE.Group(); this.markerGroup = new THREE.Group();
    this.scene.add(this.boardGroup, this.hlGroup, this.unitGroup, this.markerGroup, this.fxGroup);
    this.tiles = new Map(); this.units = new Map(); this.markers = new Map(); this.layers = new Map();
    this.anchors = new Set(); this.particles = []; this.animated = []; this.liveProps = []; this.falls = []; this.frameHooks = new Set();
    this.texCache = new Map(); this.matCache = new Map(); this.tileMatCache = new Map();
    this.glowTex = glowTexture();
    this.kit = new PropKit((color, opts) => this.mat(color, opts)); this.theme = THEMES[0]; this.spriteTint = new THREE.Color(0xffffff);
    this.raycaster = new THREE.Raycaster(); this.bindOrbit(); this.time = 0; this.ambient = null; this.ambientAcc = 0; this.mistAcc = 0;
    this.tileGeo = new THREE.CylinderGeometry(0.985, 0.985, 1, 6);
    this.lipGeo = new THREE.CylinderGeometry(0.925, 0.985, LIP, 6);
    this.fallGeo = new THREE.PlaneGeometry(0.985, 2.4);
    this.underGeo = new THREE.ConeGeometry(0.985, 1.1, 6).rotateX(Math.PI);
    this.hlGeo = new THREE.CircleGeometry(0.88, 6); this.hlGeo.rotateZ(Math.PI / 6); this.hlGeo.rotateX(-Math.PI / 2);
    this.ringGeo = new THREE.RingGeometry(0.76, 0.92, 6); this.ringGeo.rotateZ(Math.PI / 6); this.ringGeo.rotateX(-Math.PI / 2);
    this.shadowGeo = new THREE.PlaneGeometry(1.7, 1.25).rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false });
    this.hover = new THREE.Mesh(this.ringGeo, flatMat(0xffffff, 0.9)); this.hover.visible = false; this.hover.renderOrder = 6; this.hlGroup.add(this.hover);
    this.turnRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 32).rotateX(-Math.PI / 2), flatMat(0xffd76a, 0.95)); this.turnRing.visible = false; this.turnRing.renderOrder = 7; this.hlGroup.add(this.turnRing);
    this.setEnvironment(null);
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.last = performance.now();
    const loop = (now) => { const dt = Math.min(50, now - this.last); this.last = now; this.update(dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.applyCamera();
  }

  applyCamera() {
    const c = this.cam; const aspect = this.w / this.h;
    // keep boards readable on narrow screens: fit width too
    const fit = Math.max(c.size, (c.minWidth || 0) / aspect);
    // the player's own zoom sits on top of the framing a scene asked for; zoomed in, the view may slide off-centre
    const lim = fit * Math.max(0, 1 - c.zoom) * 0.5 * Math.max(1, aspect); if (c.pan.length() > lim) c.pan.setLength(lim);
    const size = fit * c.zoom; this.viewSize = size;
    this.camera.top = size / 2; this.camera.bottom = -size / 2; this.camera.left = -size * aspect / 2; this.camera.right = size * aspect / 2;
    const d = 60; const ce = Math.cos(c.elev), se = Math.sin(c.elev);
    const sx = c.shake ? (Math.random() - 0.5) * c.shake : 0, sy = c.shake ? (Math.random() - 0.5) * c.shake : 0;
    const t = c.target.clone().add(c.pan);
    this.camera.position.set(t.x + Math.sin(c.yaw) * ce * d + sx, t.y + se * d + sy, t.z + Math.cos(c.yaw) * ce * d);
    this.camera.lookAt(t.x + sx, t.y + sy, t.z);
    // shift view so the board sits above the bottom HUD
    this.camera.position.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion), -c.offY * size);
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
  }

  // Each stage gets its own palette, lighting, fog, table surface and scenery set.
  setEnvironment(stage) {
    const th = THEMES[stage?.id] || THEMES[0];
    this.theme = th; this.kit.theme = th;
    this.afloat = !!stage?.afloat; // a stage of open water: see floatUnit()
    const root = document.getElementById('game');
    const sky = new THREE.Color(stage?.sky ?? 0x2d2a5c), fogCss = new THREE.Color(th.fog[0]);
    root.style.setProperty('--sky', '#' + sky.getHexString()); root.style.setProperty('--fog', '#' + fogCss.getHexString());
    this.sun.color.set(th.key[0]); this.sun.intensity = th.key[1];
    this.fill.color.set(th.fill[0]); this.fill.intensity = th.fill[1];
    this.hemi.color.set(th.hemi[0]); this.hemi.groundColor.set(th.hemi[1]); this.hemi.intensity = th.hemi[2];
    this.scene.fog.color.set(th.fog[0]); this.scene.fog.near = th.fog[1]; this.scene.fog.far = th.fog[2];
    this.renderer.toneMappingExposure = th.exposure;
    const tex = tableTexture(th.table[0], th.table[1]); tex.repeat.set(th.table[0] === 'wood' ? 40 : 34, th.table[0] === 'wood' ? 40 : 34); this.tableMat.color.setScalar(th.table[0] === 'wood' ? 0.72 : 1);
    this.tableMat.map = tex; this.tableMat.roughness = th.table[0] === 'wood' ? 0.62 : 0.9; this.tableMat.needsUpdate = true;
    this.table.position.y = th.float ? -9 : BASE_Y - 0.01;
    this.spriteTint.set(th.tint);
    this.ambient = stage?.ambient || 'motes';
  }

  // ───────── board ─────────
  clearBoard() {
    for (const g of [this.boardGroup, this.unitGroup, this.markerGroup]) { while (g.children.length) g.remove(g.children[0]); }
    for (const l of this.layers.values()) l.meshes.forEach((m) => this.hlGroup.remove(m));
    for (const u of this.units.values()) { u.tex.dispose(); u.sprite.material.dispose(); }
    this.layers.clear(); this.tiles.clear(); this.units.clear(); this.markers.clear(); this.animated = []; this.liveProps = []; this.falls = [];
    this.hover.visible = false; this.turnRing.visible = false; this.turnUid = null;
    this.particles.forEach((p) => this.fxGroup.remove(p.s)); this.particles = [];
    while (this.fxGroup.children.length) this.fxGroup.remove(this.fxGroup.children[0]);
    clearTimeout(this._bakeT); (this.baked || []).forEach((m) => m.geometry.dispose()); this.baked = [];
    this.orbitOn = false; this.orbitFit = false; this.cam.yaw = 0; this.cam.baseSize = null; this.cam.zoom = 1; this.cam.pan.set(0, 0, 0);
  }

  // Draw-call batching. A board is hundreds of small meshes (each terrain piece is a body, a lip and a
  // few props, every one its own draw call, and again in the shadow pass). Once pieces are in place
  // and standing still, their geometry is merged into one mesh per material; the originals stay in the
  // scene, hidden, so picking and later reveals work exactly as before. Pieces that move (water,
  // flames, floating props, a tile still rising into view) are left alone.
  scheduleBake(ms = 0) { clearTimeout(this._bakeT); this._bakeT = setTimeout(() => this.bakeBoard(), ms); }
  bakeBoard() {
    (this.baked || []).forEach((m) => { this.boardGroup.remove(m); m.geometry.dispose(); }); this.baked = [];
    const live = new Set(this.liveProps.map((l) => l.o));
    const hidden = this.mat(0x0a0808); // undersides are never seen from the table camera
    const buckets = new Map();
    const take = (o) => {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.some((m) => m.transparent || !m.isMeshStandardMaterial)) return false;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      o.updateWorldMatrix(true, false); g.applyMatrix4(o.matrixWorld);
      const groups = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
      for (const gr of groups) {
        const m = mats[gr.materialIndex] || mats[0]; if (m === hidden) continue;
        const part = new THREE.BufferGeometry();
        for (const name of ['position', 'normal', 'uv']) { const a = g.attributes[name]; part.setAttribute(name, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize)); }
        const key = m.uuid + (o.castShadow ? 'c' : '-') + (o.receiveShadow ? 'r' : '-');
        let b = buckets.get(key); if (!b) { b = { m, cast: o.castShadow, recv: o.receiveShadow, parts: [] }; buckets.set(key, b); }
        b.parts.push(part);
      }
      g.dispose();
      return true;
    };
    for (const tile of this.tiles.values()) {
      const still = tile.group.visible && tile.group.position.y === 0;
      const liquid = !!terrainOf(tile.t).liquid && !terrainOf(tile.t).calm; // (a whole sea of separate rippling tiles is too much to draw: calm water is baked like ground)
      const visit = (o, skip) => {
        skip = skip || live.has(o);
        if (o.isMesh && !o.isInstancedMesh && !o.children.length) {
          const moving = liquid && (o === tile.mesh || o.parent === tile.group);
          if (o.userData.baked) { o.visible = true; o.userData.baked = false; } // put back what the last bake hid
          if (still && !skip && !moving && o.visible && take(o)) { o.visible = false; o.userData.baked = true; }
        }
        for (const c of o.children) visit(c, skip);
      };
      visit(tile.group, false);
    }
    for (const b of buckets.values()) {
      const geo = mergeGeometries(b.parts, false); b.parts.forEach((p) => p.dispose()); if (!geo) continue;
      const mesh = new THREE.Mesh(geo, b.m); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.matrixAutoUpdate = false;
      this.boardGroup.add(mesh); this.baked.push(mesh);
    }
  }

  // Shared prop material (cached). opts: flat, roughness, emissive, emissiveIntensity, transparent, opacity
  mat(color, opts = {}) {
    const k = color + JSON.stringify(opts);
    let m = this.matCache.get(k);
    if (!m) {
      const { flat, ...rest } = opts;
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, flatShading: !!flat, ...rest });
      this.matCache.set(k, m);
    }
    return m;
  }

  // Materials for one terrain piece: painted top (with baked occlusion), bevelled lip, layered strata sides.
  tileMats(t, T, variant) {
    const k = t + ':' + variant; let M = this.tileMatCache.get(k);
    if (M) return M;
    const [topStyle] = styleOf(t);
    let top;
    if (topStyle === 'water') {
      top = new THREE.MeshStandardMaterial({ color: 0x3a86b4, map: waterTexture(), roughness: 0.08, metalness: 0.3, transparent: !T.calm, opacity: T.calm ? 1 : 0.92, emissive: 0x0a3050, emissiveIntensity: 0.3 }); // (calm sea is opaque so the whole board can be drawn as one piece)
    } else {
      const map = topTexture(t, T, variant);
      top = new THREE.MeshStandardMaterial({ map, roughness: T.glossy ? 0.22 : topStyle === 'obsidian' ? 0.4 : topStyle === 'marble' || topStyle === 'glyph' ? 0.5 : 0.92, metalness: T.glossy ? 0.15 : 0 });
      if (T.emissive) { top.emissive = new THREE.Color(topStyle === 'lava' ? 0xff6a20 : T.emissive); top.emissiveMap = map; top.emissiveIntensity = topStyle === 'lava' ? 1.5 : 1.0; }
    }
    const lipColor = new THREE.Color(topStyle === 'water' ? 0x2a6a9a : T.top).multiplyScalar(0.8);
    const lip = new THREE.MeshStandardMaterial({ color: lipColor, roughness: 0.9, emissive: T.emissive ? new THREE.Color(T.emissive) : new THREE.Color(0), emissiveIntensity: T.emissive ? 0.5 : 0 });
    const side = new THREE.MeshStandardMaterial({ map: sideTexture(t, T), roughness: 0.95 });
    const bottom = this.mat(0x0a0808);
    M = { top, lip, side, bottom }; this.tileMatCache.set(k, M);
    return M;
  }

  buildBoard(cells) {
    for (const c of cells) this.addTile(c.q, c.r, c.t);
    this.finishBoard();
  }

  // dense = scenery piece that nothing walks on (the centre can be filled with large props)
  addTile(q, r, t, visible = true, dense = false) {
    const T = terrainOf(t); const p = Hex.toWorld(q, r); const k = Hex.key(q, r);
    const hash = Math.abs(Math.sin(q * 12.9898 + r * 78.233) * 43758.5453) % 1;
    const walk = isFinite(T.cost) && !T.liquid;
    // subtle per-piece elevation so the board reads as hand-laid terrain, not a flat sheet
    const topY = T.h + (T.chasm || T.liquid ? 0 : walk ? (hash - 0.4) * 0.11 : hash * 0.12) + (dense && !T.liquid && !T.chasm ? 0.1 + hash * 0.25 : 0);
    const M = this.tileMats(t, T, hash < 0.5 ? 0 : 1);
    const bodyTop = topY - LIP;
    // bridges are thin decks; floating-island stages use slabs that hang in the air; everything else stands on the table
    const float = !!this.theme.float;
    const baseY = T.thin ? bodyTop - 0.16 : float ? bodyTop - 0.7 : BASE_Y; const depth = bodyTop - baseY;
    const mesh = new THREE.Mesh(this.tileGeo, [M.side, M.top, M.bottom]);
    mesh.scale.y = depth; mesh.position.set(p.x, (bodyTop + baseY) / 2, p.z);
    mesh.castShadow = !T.chasm; mesh.receiveShadow = true;
    mesh.userData = { q, r, top: topY, t };
    const lip = new THREE.Mesh(this.lipGeo, [M.lip, M.top, M.bottom]);
    lip.position.set(p.x, topY - LIP / 2, p.z); lip.rotation.y = Math.floor(hash * 6) * Math.PI / 3; lip.receiveShadow = true;
    const group = new THREE.Group(); group.add(mesh, lip);
    if (float && !T.thin && !T.chasm) { // the underside of a floating island piece
      const under = new THREE.Mesh(this.underGeo, this.mat(0x6a64a0, { flat: true })); under.position.set(p.x, baseY - 0.55 - hash * 0.5, p.z); under.scale.y = 1 + hash; under.rotation.y = hash * 6; under.castShadow = true; group.add(under);
    }
    if (T.under) { // what flows beneath a bridge
      const U = terrainOf(T.under); const UM = this.tileMats(T.under, U, 0);
      const um = new THREE.Mesh(this.tileGeo, [UM.side, UM.top, UM.bottom]); um.scale.y = U.h - BASE_Y; um.position.set(p.x, (U.h + BASE_Y) / 2, p.z); um.receiveShadow = true; group.add(um);
      if (U.emissive && !this.animated.some((a2) => a2.mat === UM.top)) this.animated.push({ mat: UM.top, baseI: UM.top.emissiveIntensity, phase: 1, emissive: true });
    }
    let deco = null;
    if (T.prop) deco = this.kit.prop(T.prop, q, r, dense);
    else if (!T.chasm && !T.liquid && !T.onEnd && isFinite(T.cost)) deco = this.kit.decor(q, r);
    if (deco) {
      deco.position.set(p.x, topY, p.z); group.add(deco);
      deco.traverse((o) => { const u = o.userData; if (u.pulse || u.flame || u.float != null) this.liveProps.push({ o, kind: u.flame ? 'flame' : u.pulse ? 'pulse' : 'float', phase: hash * 6.28 + this.liveProps.length, y: o.position.y, sx: o.scale.x, sy: o.scale.y, sz: o.scale.z }); });
    }
    if (T.liquid && !T.calm) this.animated.push({ parts: [mesh, lip], base: [mesh.position.y, lip.position.y], phase: q * 0.7 + r * 1.3, liquid: true });
    if (T.emissive && !this.animated.some((a) => a.mat === M.top)) this.animated.push({ mat: M.top, baseI: M.top.emissiveIntensity, phase: hash * 6, emissive: true });
    group.visible = visible;
    this.boardGroup.add(group);
    this.tiles.set(k, { mesh, group, top: topY, q, r, t });
    return group;
  }

  // After all pieces are placed: water (and lava) on the rim of the board pours off the edge.
  finishBoard() {
    for (const tile of this.tiles.values()) {
      const T = terrainOf(tile.t); if (!T.liquid) continue;
      const p = Hex.toWorld(tile.q, tile.r); const lava = tile.t === 'lava';
      for (let d = 0; d < 6; d++) {
        const n = Hex.neighbor(tile, d); if (this.tiles.has(Hex.key(n.q, n.r))) continue;
        const np = Hex.toWorld(n.q, n.r); const dx = np.x - p.x, dz = np.z - p.z; const len = Math.hypot(dx, dz);
        const tex = waterfallTexture();
        const mat = new THREE.MeshBasicMaterial({ map: tex, color: lava ? 0xff8a30 : 0xcfeeff, transparent: true, opacity: lava ? 0.95 : 0.8, depthWrite: false, side: THREE.DoubleSide, toneMapped: !lava });
        const fall = new THREE.Mesh(this.fallGeo, mat);
        fall.position.set(p.x + (dx / len) * 0.87, tile.top - 1.2 - 0.02, p.z + (dz / len) * 0.87); fall.rotation.y = Math.atan2(dx, dz); fall.renderOrder = 2;
        const back = new THREE.Mesh(this.fallGeo, this.mat(lava ? 0xc03a10 : 0x2f7ab0, lava ? { emissive: 0xff4a10, emissiveIntensity: 1.2 } : { roughness: 0.2 }));
        back.position.set(p.x + (dx / len) * 0.858, tile.top - 1.2 - 0.02, p.z + (dz / len) * 0.858); back.rotation.y = fall.rotation.y;
        tile.group.add(back, fall);
        if (!T.calm) this.falls.push({ tile, pos: new THREE.Vector3(p.x + (dx / len) * 1.0, BASE_Y + 0.1, p.z + (dz / len) * 1.0), lava, acc: Math.random() * 200 });
      }
    }
    this.scheduleBake();
  }

  revealTile(k) {
    const t = this.tiles.get(k); if (!t || t.group.visible) return;
    t.group.visible = true; t.group.position.y = -1.2;
    tween(450 + Math.random() * 250, (e) => { t.group.position.y = -1.2 * (1 - e); }, Ease.outBack).then(() => { t.group.position.y = 0; this.scheduleBake(250); });
  }

  tileTop(q, r) { return this.tiles.get(Hex.key(q, r))?.top ?? 0.3; }
  cellPos(q, r) { const p = Hex.toWorld(q, r); return new THREE.Vector3(p.x, this.tileTop(q, r), p.z); }
  footPos(cells) {
    const v = new THREE.Vector3(); let top = 0;
    for (const c of cells) { const p = Hex.toWorld(c.q, c.r); v.x += p.x; v.z += p.z; top = Math.max(top, this.tileTop(c.q, c.r)); }
    v.x /= cells.length; v.z /= cells.length; v.y = top; return v;
  }

  // ───────── highlight layers ─────────
  setLayer(name, cells, { color = 0xffffff, opacity = 0.4, pulse = 0, y = 0.02, order = 2 } = {}) {
    let L = this.layers.get(name);
    if (!L) { L = { meshes: [], mat: flatMat(color, opacity), pulse, opacity }; this.layers.set(name, L); }
    L.mat.color.set(color); L.mat.opacity = opacity; L.opacity = opacity; L.pulse = pulse;
    cells = cells || [];
    while (L.meshes.length < cells.length) { const m = new THREE.Mesh(this.hlGeo, L.mat); m.renderOrder = order; this.hlGroup.add(m); L.meshes.push(m); }
    L.meshes.forEach((m, i) => {
      const c = cells[i]; m.visible = !!c && this.tiles.has(Hex.key(c.q, c.r));
      if (m.visible) { const p = this.cellPos(c.q, c.r); m.position.set(p.x, p.y + y, p.z); }
    });
  }
  clearLayer(name) { const L = this.layers.get(name); if (L) L.meshes.forEach((m) => { m.visible = false; }); }
  clearLayers(except = []) { for (const k of this.layers.keys()) if (!except.includes(k)) this.clearLayer(k); }
  setHover(c, color = 0xffffff) {
    if (!c || !this.tiles.has(Hex.key(c.q, c.r))) { this.hover.visible = false; return; }
    const p = this.cellPos(c.q, c.r); this.hover.position.set(p.x, p.y + 0.05, p.z); this.hover.material.color.set(color); this.hover.visible = true;
  }
  async flashCells(cells, color, ms = 450) {
    const name = 'flash' + Math.random();
    this.setLayer(name, cells, { color, opacity: 0.85, y: 0.06, order: 5 });
    const L = this.layers.get(name);
    await tween(ms, (e) => { L.mat.opacity = 0.85 * (1 - e); L.opacity = L.mat.opacity; });
    L.meshes.forEach((m) => this.hlGroup.remove(m)); this.layers.delete(name);
  }

  // ───────── units ─────────
  addUnit(u, cells) {
    const fs = u.scale > 1.6 ? 192 : 128; // the same sheet the UI portraits use, so each figure is painted once
    const sheet = getSheet(u.spriteKey, u.look, fs);
    let base = this.texCache.get(u.spriteKey + fs);
    if (!base) { base = new THREE.CanvasTexture(sheet.canvas); base.colorSpace = THREE.SRGBColorSpace; base.anisotropy = 4; this.texCache.set(u.spriteKey + fs, base); }
    const tex = base.clone(); tex.needsUpdate = true; tex.repeat.set(1 / COLS, 1 / ROWS);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.02, toneMapped: false, color: this.spriteTint });
    const sprite = new THREE.Sprite(mat); sprite.center.set(0.5, 0.04);
    const size = 2.35 * (u.scale || 1); sprite.scale.set(size, size, 1); sprite.renderOrder = 10;
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat); shadow.scale.setScalar((u.scale || 1) * (u.size > 1 ? 1.35 : 1)); shadow.renderOrder = 3;
    const group = new THREE.Group(); group.add(shadow, sprite);
    const pos = this.footPos(cells); group.position.copy(pos); shadow.position.set(0.12, 0.035, -0.05);
    this.unitGroup.add(group);
    const U = { uid: u.uid, group, sprite, shadow, tex, mat, anim: 'idle', frame: Math.floor(Math.random() * 4), t: Math.random() * 200, dir: u.facing ?? 0, once: null, size, scale: u.scale || 1 };
    this.units.set(u.uid, U); this.applyFrame(U);
    if (this.afloat) this.floatUnit(U, u);
    return U;
  }
  // On open water: the heroes' side (heroes, turrets, barricades, the party token) sits in a small boat that turns the
  // way it faces and rocks on the swell; monsters stand half under the surface inside a spreading ripple. Fliers stay dry.
  floatUnit(U, u) {
    const hero = u.side === 'hero' || String(u.uid).startsWith('party'); const body = u.look?.body || u.def?.look?.body;
    U.shadow.visible = false; U.bob = Math.random() * 6;
    if (hero) {
      const G = (this.boatParts ||= boatParts());
      const boat = new THREE.Group(); boat.add(new THREE.Mesh(G.hull, G.wood), new THREE.Mesh(G.rim, G.pale), new THREE.Mesh(G.deck, G.dark), new THREE.Mesh(G.seat, G.pale));
      boat.children[0].rotation.x = boat.children[1].rotation.x = boat.children[2].rotation.x = -Math.PI / 2; boat.children[0].position.y = -0.1; boat.children[1].position.y = 0.2; boat.children[2].position.y = 0.21; boat.children[3].position.set(0.05, 0.25, 0);
      const wake = new THREE.Mesh(G.ring, flatMat(0xdff4ff, 0.3)); wake.rotation.x = -Math.PI / 2; wake.scale.set(1.5, 0.85, 1); wake.position.y = -0.08; wake.renderOrder = 4;
      boat.scale.setScalar(1.15 * U.scale); U.group.add(wake, boat); U.boat = boat; U.sprite.position.y = 0.34 * U.scale; boat.rotation.y = this.headingOf(U.dir);
    } else if (!['floating', 'bat', 'imp', 'bird', 'drone', 'eye', 'flame'].includes(body)) {
      // deep enough to be in the water, not so deep that a small one disappears
      const sink = (u.size >= 7 ? 0.5 : u.size > 1 ? 0.38 : 0.2) * U.scale; U.sprite.position.y = -sink; const big = u.size > 1 ? 1.5 : 1;
      U.ripples = [0, 1].map((i) => { const m = new THREE.Mesh((this.boatParts ||= boatParts()).ring, flatMat(0xdff4ff, 0.4)); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 4; m.userData.r = 0.5 * U.scale * big; m.userData.ph = i * 0.5; U.group.add(m); return m; });
    }
  }
  headingOf(dir) { const v = Hex.toWorld(Hex.DIRS[((dir % 6) + 6) % 6][0], Hex.DIRS[((dir % 6) + 6) % 6][1]); return Math.atan2(-v.z, v.x); }
  removeUnit(uid) { const U = this.units.get(uid); if (!U) return; this.unitGroup.remove(U.group); U.tex.dispose(); U.mat.dispose(); this.units.delete(uid); if (this.turnUid === uid) this.setTurnRing(null); }
  unitPos(uid, up = 0) { const U = this.units.get(uid); if (!U) return new THREE.Vector3(); return U.group.position.clone().add(new THREE.Vector3(0, up * U.scale, 0)); }
  placeUnit(uid, cells) { const U = this.units.get(uid); if (U) U.group.position.copy(this.footPos(cells)); }
  setFacing(uid, dir) { const U = this.units.get(uid); if (U && dir != null) { U.dir = dir; this.applyFrame(U); } }
  // Camera rotation. The board turns in 60° steps (one hex side) so pieces always line up; figures pick
  // the sprite view that matches where they face on screen.
  rotateBy(step) {
    const c = this.cam; const S = Math.PI / 3; const from = c.yaw; const to = (Math.round(from / S) + step) * S;
    // a wide battle board turned on its side needs more room: pull the camera back while it is turned
    const zoom = (yaw) => 1 + 0.55 * Math.abs(Math.sin(yaw));
    if (this.orbitFit && c.baseSize == null) c.baseSize = c.size / zoom(from);
    const s0 = c.size, s1 = this.orbitFit ? c.baseSize * zoom(to) : c.size;
    return tween(260, (e) => { c.yaw = from + (to - from) * e; c.size = s0 + (s1 - s0) * e; }, Ease.inOutQuad).then(() => { c.yaw = to; c.size = s1; this.refreshFrames(); });
  }
  refreshFrames() { for (const U of this.units.values()) this.applyFrame(U); }
  // The two turn buttons for a HUD; also switches on right-button drag to turn the board.
  camControls({ fit = false } = {}) {
    this.orbitOn = true; this.orbitFit = fit;
    const mk = (label, step, tip) => { const b = document.createElement('button'); b.className = 'cam-btn'; b.textContent = label; b.dataset.tip = tip; b.onclick = () => { audio.sfx('click'); this.rotateBy(step); }; return b; };
    const zm = (label, f) => { const b = document.createElement('button'); b.className = 'cam-btn'; b.textContent = label; b.onclick = () => { this.zoomBy(f); audio.sfx('click'); }; return b; };
    const el = document.createElement('div'); el.className = 'cam-ctl'; el.append(mk('⟲', -1, '←'), mk('⟳', 1, '→'), zm('+', 0.8), zm('−', 1.25));
    return el;
  }
  // Zoom: in a long way, out only a little past the scene's own framing. With a pointer position, the
  // ground under the pointer stays put (mouse wheel); without one the view zooms about its centre (buttons).
  groundAt(x, y) {
    this.raycaster.setFromCamera(new THREE.Vector2((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1), this.camera);
    return this.raycaster.ray.intersectPlane(this._ground ||= new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  }
  zoomBy(f, at = null) {
    const c = this.cam; const z = clamp(c.zoom * f, 0.5, 1.2); if (z === c.zoom) return;
    if (!at) { const z0 = c.zoom; tween(160, (e) => { c.zoom = z0 + (z - z0) * e; }, Ease.outQuad); return; }
    const before = this.groundAt(at.x, at.y); c.zoom = z; this.applyCamera();
    const after = this.groundAt(at.x, at.y); if (before && after) { c.pan.add(before.sub(after)); this.applyCamera(); }
  }
  bindOrbit() {
    const cv = this.canvas; let drag = null;
    cv.addEventListener('pointerdown', (e) => { this.orbitMoved = false; if (e.button === 2 && this.orbitOn) drag = { x: e.clientX, yaw: this.cam.yaw }; });
    window.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) this.orbitMoved = true; if (this.orbitMoved) { this.cam.yaw = drag.yaw - dx * 0.006; this.refreshFrames(); } });
    window.addEventListener('pointerup', () => { if (!drag) return; drag = null; if (this.orbitMoved) this.rotateBy(0); });
    cv.addEventListener('contextmenu', (e) => { if (this.orbitOn) e.preventDefault(); });
    cv.addEventListener('wheel', (e) => { if (!this.orbitOn) return; e.preventDefault(); const r = cv.getBoundingClientRect(); this.zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12, { x: e.clientX - r.left, y: e.clientY - r.top }); }, { passive: false });
  }

  applyFrame(U) {
    const ys = Math.round(this.cam.yaw / (Math.PI / 3));
    const [view, flip] = DIR_VIEW[(((U.dir - ys) % 6) + 6) % 6]; const col = view * FRAMES + (U.frame % FRAMES); const row = ANIMS.indexOf(U.anim);
    if (flip) { U.tex.repeat.x = -1 / COLS; U.tex.offset.x = (col + 1) / COLS; } else { U.tex.repeat.x = 1 / COLS; U.tex.offset.x = col / COLS; }
    U.tex.offset.y = 1 - (row + 1) / ROWS;
  }
  setAnim(uid, anim) { const U = this.units.get(uid); if (!U || U.anim === anim) return; U.anim = anim; U.frame = 0; U.t = 0; U.once = null; this.applyFrame(U); }
  playOnce(uid, anim) {
    const U = this.units.get(uid); if (!U) return Promise.resolve();
    return new Promise((res) => { if (U.once) U.once(); U.anim = anim; U.frame = 0; U.t = 0; U.once = res; this.applyFrame(U); });
  }
  setTurnRing(uid) {
    this.turnUid = uid; const U = uid && this.units.get(uid);
    this.turnRing.visible = !!U; if (U) this.turnRing.scale.setScalar(Math.max(1, U.scale * 0.9));
  }

  async moveUnit(uid, path, { stepMs = 190, hop = 0.18 } = {}) {
    const U = this.units.get(uid); if (!U) return;
    this.setAnim(uid, 'walk');
    for (const step of path) {
      const from = U.group.position.clone(); const to = step.pos;
      if (step.dir != null) this.setFacing(uid, step.dir);
      audio.sfx('step');
      await tween(stepMs, (e, k) => { U.group.position.lerpVectors(from, to, e); U.group.position.y += Math.sin(k * Math.PI) * hop; }, Ease.linear);
      if (step.onArrive) step.onArrive();
    }
    this.setAnim(uid, 'idle');
  }
  async leapUnit(uid, to, ms = 260, height = 1.2) {
    const U = this.units.get(uid); if (!U) return; const from = U.group.position.clone();
    await tween(ms, (e, k) => { U.group.position.lerpVectors(from, to, e); U.group.position.y += Math.sin(k * Math.PI) * height; }, Ease.inOutQuad);
  }
  async lunge(uid, toward, dist = 0.45) {
    const U = this.units.get(uid); if (!U) return; const from = U.group.position.clone();
    const dir = toward.clone().sub(from); dir.y = 0; if (dir.lengthSq() < 0.001) return; dir.normalize().multiplyScalar(dist * Math.min(1.6, U.scale));
    await tween(110, (e) => { U.group.position.copy(from).addScaledVector(dir, e); }, Ease.outQuad);
    tween(200, (e) => { U.group.position.copy(from).addScaledVector(dir, 1 - e); }, Ease.inOutQuad);
  }
  // ───────── acting ─────────
  // A blow is told in beats, like a stage fight: the body gathers itself, snaps out, and settles back.
  // strike(): pull back and squash, then snap at the target and stretch. Resolves on contact; the recovery
  // plays on by itself, so the hit and its hit-stop land while the attacker is still at full reach.
  async strike(uid, toward, { dist = 0.5, wind = 150, heavy = false } = {}) {
    const U = this.units.get(uid); if (!U) return; const from = U.group.position.clone();
    const dir = toward.clone().sub(from); dir.y = 0; if (dir.lengthSq() < 0.001) return; dir.normalize();
    const k = Math.min(1.6, U.scale), back = (heavy ? 0.36 : 0.22) * k, fwd = dist * k, sq = heavy ? 0.17 : 0.1, S = U.size;
    await tween(wind, (e) => { U.group.position.copy(from).addScaledVector(dir, -back * e); U.sprite.scale.set(S * (1 + sq * e), S * (1 - sq * e), 1); }, Ease.outQuad);
    if (heavy) await tween(70, () => {}); // a heavy blow hangs for a beat at the top
    await tween(75, (e) => { U.group.position.copy(from).addScaledVector(dir, -back + (back + fwd) * e); const a = sq - sq * 1.7 * e; U.sprite.scale.set(S * (1 + a), S * (1 - a), 1); }, Ease.inQuad);
    tween(heavy ? 150 : 90, () => {}).then(() => tween(260, (e) => { U.group.position.copy(from).addScaledVector(dir, fwd * (1 - e)); const a = -sq * 0.7 * (1 - e); U.sprite.scale.set(S * (1 + a), S * (1 - a), 1); }, Ease.inOutQuad))
      .then(() => { if (this.units.has(uid)) { U.group.position.copy(from); U.sprite.scale.set(S, S, 1); } });
  }
  // gather(): a caster sinks into the spell while it charges.  release(): pops up and is kicked back by it.
  gather(uid, ms = 380) {
    const U = this.units.get(uid); if (!U) return Promise.resolve(); const S = U.size;
    return tween(ms, (e) => { U.sprite.scale.set(S * (1 + 0.07 * e), S * (1 - 0.09 * e), 1); }, Ease.outQuad);
  }
  release(uid, toward = null) {
    const U = this.units.get(uid); if (!U) return; const S = U.size; const from = U.group.position.clone();
    const dir = toward ? toward.clone().sub(from).setY(0) : new THREE.Vector3(); if (dir.lengthSq() > 0.001) dir.normalize(); else dir.set(0, 0, 0);
    const kick = 0.16 * Math.min(1.6, U.scale);
    tween(90, (e) => { U.sprite.scale.set(S * (1.07 - 0.15 * e), S * (0.91 + 0.19 * e), 1); U.group.position.copy(from).addScaledVector(dir, -kick * e); }, Ease.outQuad)
      .then(() => tween(300, (e) => { U.sprite.scale.set(S * (0.92 + 0.08 * e), S * (1.1 - 0.1 * e), 1); U.group.position.copy(from).addScaledVector(dir, -kick * (1 - e)); }, Ease.inOutQuad))
      .then(() => { if (this.units.has(uid)) { U.group.position.copy(from); U.sprite.scale.set(S, S, 1); } });
  }
  hitFlash(uid, strong = false, from = null) {
    const U = this.units.get(uid); if (!U) return;
    const dir = from ? U.group.position.clone().sub(from).setY(0) : new THREE.Vector3();
    if (dir.lengthSq() > 0.001) dir.normalize(); else dir.set(0, 0, 0);
    const kb = (strong ? 0.42 : 0.2) * (U.size > 1.5 ? 0.35 : 1), sq = strong ? 0.22 : 0.12;
    if (!U.once) this.playOnce(uid, 'hurt').then(() => { if (this.units.has(uid)) this.setAnim(uid, 'idle'); });
    const tn = this.spriteTint; tween(260, (e, k) => { U.mat.color.setRGB(tn.r, tn.g * (0.35 + 0.65 * e), tn.b * (0.35 + 0.65 * e)); const a = Math.sin(Math.min(1, k) * Math.PI); U.sprite.position.x = Math.sin(k * 30) * (strong ? 0.16 : 0.08) * (1 - k) + dir.x * kb * a; U.sprite.position.z = dir.z * kb * a; U.sprite.scale.set(U.size * (1 + sq * a), U.size * (1 - sq * a), 1); }).then(() => { if (this.units.has(uid)) { U.sprite.position.x = 0; U.sprite.position.z = 0; U.sprite.scale.set(U.size, U.size, 1); } });
  }
  async fadeOut(uid, ms = 600) {
    const U = this.units.get(uid); if (!U) return;
    await tween(ms, (e) => { U.mat.opacity = 1 - e; U.sprite.position.y = -0.4 * e; U.shadow.scale.setScalar(Math.max(0.001, U.scale * (1 - e))); U.mat.color.setRGB(1 - e * 0.6, 1 - e * 0.6, 1 - e * 0.4); });
    this.removeUnit(uid);
  }
  async fadeIn(uid, ms = 400) {
    const U = this.units.get(uid); if (!U) return; U.mat.opacity = 0;
    await tween(ms, (e) => { U.mat.opacity = e; U.sprite.scale.set(U.size * (0.6 + 0.4 * e), U.size * (1.4 - 0.4 * e), 1); }, Ease.outBack);
    U.sprite.scale.set(U.size, U.size, 1);
  }
  setGhost(uid, on) { const U = this.units.get(uid); if (U) U.mat.opacity = on ? 0.45 : 1; }

  // ───────── exploration markers ─────────
  addMarker(key, cell, icon, color, big = false) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, color); gr.addColorStop(0.62, color); gr.addColorStop(0.64, '#1a1420'); gr.addColorStop(0.8, '#1a1420'); gr.addColorStop(0.82, color); gr.addColorStop(0.9, color); gr.addColorStop(0.92, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(64, 64, 40, 0, 7); g.fill();
    const img = new Image(); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    img.onload = () => { g.drawImage(img, 30, 30, 68, 68); tex.needsUpdate = true; }; img.src = iconCanvas(icon, '#ffffff', 96);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false })); s.renderOrder = 20;
    const size = big ? 1.7 : 1.15; s.scale.set(size, size, 1);
    const p = this.cellPos(cell.q, cell.r); s.position.set(p.x, p.y + (big ? 1.5 : 1.1), p.z);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: new THREE.Color(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); glow.scale.set(size * 2.2, size * 2.2, 1); glow.position.copy(s.position); glow.renderOrder = 19;
    const grp = new THREE.Group(); grp.add(glow, s); grp.visible = this.tiles.get(key)?.group.visible ?? true;
    this.markerGroup.add(grp);
    this.markers.set(key, { grp, s, glow, baseY: s.position.y, phase: Math.random() * 6, big });
  }
  showMarker(key) { const m = this.markers.get(key); if (m) m.grp.visible = true; }
  removeMarker(key) {
    const m = this.markers.get(key); if (!m) return; this.markers.delete(key);
    tween(350, (e) => { m.s.material.opacity = 1 - e; m.glow.material.opacity = 0.55 * (1 - e); m.grp.position.y = e * 0.8; }).then(() => this.markerGroup.remove(m.grp));
  }

  // ───────── fx ─────────
  particle(pos, { color = 0xffffff, size = 0.3, life = 600, vel = new THREE.Vector3(), gravity = 0, drag = 0.98, fade = true, grow = 0, add = true, opacity = 1, swell = false, tex = null, rot = 0, spin = 0 } = {}) {
    if (this.particles.length > 700) return;
    const m = new THREE.SpriteMaterial({ map: tex || this.glowTex, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: swell ? 0 : opacity, fog: !add && !tex, toneMapped: !tex, rotation: rot });
    const s = new THREE.Sprite(m); s.position.copy(pos); s.scale.setScalar(size); s.renderOrder = 30;
    this.fxGroup.add(s);
    this.particles.push({ s, m, vel: vel.clone(), life, age: 0, gravity, drag, fade, grow, size, opacity, swell, spin });
  }
  burst(pos, { color = 0xffffff, count = 14, speed = 3, size = 0.35, life = 500, gravity = 4, up = 1.5, spread = 1 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (0.3 + Math.random() * 0.7);
      this.particle(pos, { color, size: size * (0.5 + Math.random()), life: life * (0.6 + Math.random() * 0.6), vel: new THREE.Vector3(Math.cos(a) * sp * spread, up * (0.4 + Math.random()), Math.sin(a) * sp * spread), gravity });
    }
  }
  rise(pos, { color = 0xffffff, count = 12, radius = 0.5, speed = 1.6, size = 0.28, life = 800 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * radius;
      this.particle(pos.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.random() * 0.3, Math.sin(a) * r)), { color, size: size * (0.6 + Math.random() * 0.8), life: life * (0.6 + Math.random() * 0.7), vel: new THREE.Vector3(0, speed * (0.5 + Math.random()), 0), gravity: -0.5 });
    }
  }
  async ring(pos, color = 0xffffff, radius = 1.5, ms = 420) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2), mat); mesh.position.copy(pos); mesh.position.y += 0.08; mesh.renderOrder = 8;
    this.fxGroup.add(mesh);
    await tween(ms, (e) => { mesh.scale.setScalar(0.2 + radius * e); mat.opacity = 0.9 * (1 - e); }, Ease.outCubic);
    this.fxGroup.remove(mesh); mesh.geometry.dispose(); mat.dispose();
  }
  async slash(pos, color = 0xffffff, scale = 1) {
    const mat = new THREE.SpriteMaterial({ map: this.slashTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, rotation: Math.random() * Math.PI });
    const s = new THREE.Sprite(mat); s.position.copy(pos); s.renderOrder = 31; this.fxGroup.add(s);
    await tween(220, (e) => { s.scale.set((0.6 + e * 1.8) * scale, (0.6 + e * 1.8) * scale, 1); mat.opacity = 1 - e * e; }, Ease.outCubic);
    this.fxGroup.remove(s); mat.dispose();
  }
  slashTex() {
    if (this._slash) return this._slash;
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.translate(64, 64); g.rotate(-0.6);
    const gr = g.createLinearGradient(-60, 0, 60, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-60, 0); g.quadraticCurveTo(0, -16, 60, 0); g.quadraticCurveTo(0, 5, -60, 0); g.fill();
    this._slash = new THREE.CanvasTexture(c); return this._slash;
  }
  async projectile(from, to, { color = 0xffffff, ms = null, arc = 0.6, size = 0.6, trail = true } = {}) {
    const dist = from.distanceTo(to); ms = ms ?? clamp(dist * 55, 160, 520);
    const mat = new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const s = new THREE.Sprite(mat); s.scale.setScalar(size); s.renderOrder = 32; this.fxGroup.add(s);
    await tween(ms, (e, k) => {
      s.position.lerpVectors(from, to, k); s.position.y += Math.sin(k * Math.PI) * arc * Math.min(2, dist / 3);
      if (trail) this.particle(s.position, { color, size: size * 0.6, life: 260, vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4) });
    }, Ease.linear);
    this.fxGroup.remove(s); mat.dispose();
  }
  async beam(from, to, color = 0xffffff, ms = 320) {
    const n = Math.ceil(from.distanceTo(to) * 3);
    for (let i = 0; i <= n; i++) this.particle(new THREE.Vector3().lerpVectors(from, to, i / n), { color, size: 0.7, life: ms + i * 12, vel: new THREE.Vector3(0, 0.3, 0) });
    await sleep(ms * 0.6);
  }
  async meteor(to, color = 0xff7a2a) {
    const from = to.clone().add(new THREE.Vector3(-4, 11, -2));
    await this.projectile(from, to, { color, ms: 420, arc: 0, size: 1.6 });
  }
  shake(mag = 0.25, ms = 280) { this.cam.shake = Math.max(this.cam.shake, mag); this.cam.shakeT = Math.max(this.cam.shakeT, ms); this.cam.shakeMag = this.cam.shake; this.cam.shakeDur = this.cam.shakeT; }
  focus({ x, z, size, yaw, offY, minWidth }, ms = 700) {
    const c = this.cam; const f = { x: c.target.x, z: c.target.z, size: c.size, yaw: c.yaw, offY: c.offY };
    if (minWidth != null) c.minWidth = minWidth;
    if (!ms) { if (x != null) c.target.set(x, 0, z); if (size) c.size = size; if (yaw != null) c.yaw = yaw; if (offY != null) c.offY = offY; return Promise.resolve(); }
    return tween(ms, (e) => {
      if (x != null) { c.target.x = f.x + (x - f.x) * e; c.target.z = f.z + (z - f.z) * e; }
      if (size) c.size = f.size + (size - f.size) * e;
      if (yaw != null) c.yaw = f.yaw + (yaw - f.yaw) * e;
      if (offY != null) c.offY = f.offY + (offY - f.offY) * e;
    }, Ease.inOutQuad);
  }

  // ───────── DOM anchors / picking ─────────
  project(v) { const p = v.clone().project(this.camera); return { x: (p.x * 0.5 + 0.5) * this.w, y: (-p.y * 0.5 + 0.5) * this.h }; }
  attach(el, getPos) { const a = { el, getPos }; this.anchors.add(a); this.labelsEl.appendChild(el); return a; }
  detach(a) { if (!a) return; this.anchors.delete(a); a.el.remove(); }
  floatText(pos, text, cls = '') {
    const el = document.createElement('div'); el.className = 'float-text ' + cls; el.textContent = text;
    const p = this.project(pos); el.style.left = p.x + (Math.random() - 0.5) * 30 + 'px'; el.style.top = p.y + 'px';
    this.labelsEl.appendChild(el); setTimeout(() => el.remove(), 1300);
    return el;
  }
  pick(clientX, clientY, { units = null } = {}) {
    const rect = this.canvas.getBoundingClientRect(); const x = clientX - rect.left, y = clientY - rect.top;
    if (units) {
      let best = null, bd = Infinity;
      for (const u of units) { const U = this.units.get(u.uid); if (!U) continue; const p = this.project(this.unitPos(u.uid, 0.75)); const d = Math.hypot(p.x - x, p.y - y); const rad = 30 * U.scale * (this.h / ((this.viewSize || this.cam.size) * 55)); if (d < rad && d < bd) { bd = d; best = u; } }
      if (best) return { q: best.q, r: best.r, unit: best };
    }
    const ndc = new THREE.Vector2((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = []; for (const t of this.tiles.values()) if (t.group.visible) meshes.push(t.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    return hit ? { q: hit.object.userData.q, r: hit.object.userData.r } : null;
  }

  // ───────── frame ─────────
  // Impact frames: the world holds still for a moment when a blow lands (the camera may still shake).
  hitStop(ms) { this.freezeT = Math.max(this.freezeT || 0, ms); return new Promise((res) => setTimeout(res, ms)); }
  slowMo(scale = 0.35, ms = 600) { this.timeScale = scale; clearTimeout(this._slow); this._slow = setTimeout(() => { this.timeScale = 1; }, ms); }
  // Camera punch: a quick push-in that eases back out.
  punch(amount = 0.06, ms = 280) {
    const c = this.cam; if (c.punching) return; c.punching = true; const base = c.size;
    tween(ms, (e) => { c.size = base * (1 - amount * (1 - e)); }, Ease.outQuad).then(() => { c.size = base; c.punching = false; });
  }

  update(dt) {
    if (this.freezeT > 0) { this.freezeT -= dt; dt = 0; } else dt *= this.timeScale ?? 1;
    this.time += dt; const T = this.time / 1000;
    // slow machine guard: if the first seconds average under ~28 fps, drop real-time shadows and retina scaling
    if (!this.perfChecked) { this.perfN = (this.perfN || 0) + 1; this.perfT = (this.perfT || 0) + dt; if (this.perfN >= 150) { this.perfChecked = true; if (this.perfT / this.perfN > 36) { this.sun.castShadow = false; this.renderer.setPixelRatio(1); this.resize(); } } }
    updateTweens(dt);
    for (const U of this.units.values()) {
      if (U.boat) { // rock on the swell, and come round to the way the rider faces
        const want = this.headingOf(U.dir); let d = want - U.boat.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); U.boat.rotation.y += d * Math.min(1, dt / 160);
        U.boat.rotation.z = Math.sin(T * 2 + U.bob) * 0.05; U.boat.position.y = Math.sin(T * 1.6 + U.bob) * 0.03; U.sprite.position.y = 0.34 * U.scale + U.boat.position.y;
      } else if (U.ripples) for (const m of U.ripples) { const k = (T * 0.45 + m.userData.ph) % 1; const s = m.userData.r * (0.8 + k * 1.1); m.scale.set(s, s, 1); m.material.opacity = 0.45 * (1 - k); }
      U.t += dt; const fd = 1000 / ANIM_FPS[U.anim];
      if (U.t >= fd) {
        U.t -= fd; U.frame++;
        if (U.once && U.frame >= FRAMES) { const res = U.once; U.once = null; U.anim = 'idle'; U.frame = 0; res(); }
        this.applyFrame(U);
      }
    }
    if (this.turnUid) { const U = this.units.get(this.turnUid); if (U) { this.turnRing.position.copy(U.group.position); this.turnRing.position.y += 0.06; this.turnRing.rotation.y = T * 1.5; this.turnRing.material.opacity = 0.65 + Math.sin(T * 5) * 0.3; } }
    for (const L of this.layers.values()) if (L.pulse) L.mat.opacity = L.opacity * (0.72 + 0.28 * Math.sin(T * L.pulse));
    for (const a of this.animated) {
      if (a.liquid) { const dy = Math.sin(T * 1.6 + a.phase) * 0.03; a.parts[0].position.y = a.base[0] + dy; a.parts[1].position.y = a.base[1] + dy; }
      if (a.emissive) a.mat.emissiveIntensity = a.baseI * (0.8 + Math.sin(T * 2 + a.phase) * 0.3);
    }
    for (const lp of this.liveProps) {
      if (lp.kind === 'flame') { const f = 0.8 + Math.sin(T * 17 + lp.phase) * 0.14 + Math.sin(T * 31 + lp.phase * 2) * 0.1; lp.o.scale.set(lp.sx * (1.1 - f * 0.1), lp.sy * f, lp.sz * (1.1 - f * 0.1)); }
      else if (lp.kind === 'pulse') { const f = 1 + Math.sin(T * 2.2 + lp.phase) * 0.07; lp.o.scale.set(lp.sx * f, lp.sy * f, lp.sz * f); }
      else lp.o.position.y = lp.y + Math.sin(T * 1.3 + lp.phase) * 0.08;
    }
    const wt = waterTexture(); wt.offset.x = T * 0.035; wt.offset.y = T * 0.06;
    waterfallTexture().offset.y = T * 0.9;
    for (const f of this.falls) {
      if (!f.tile.group.visible) continue; f.acc += dt;
      if (f.acc > 110) { f.acc = 0; this.particle(f.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.5)), f.lava ? { color: 0xff7a20, size: 0.35, life: 900, vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.2, 0), gravity: 1.5 } : { color: 0xe8f6ff, size: 0.7, life: 1300, vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.5, 0.2), add: false, opacity: 0.4, grow: 1.2 }); }
    }
    this.sun.position.copy(this.cam.target).add(SUN_OFFSET); this.sun.target.position.copy(this.cam.target); this.sun.target.updateMatrixWorld();
    this.table.position.x = Math.round(this.cam.target.x / 12) * 12; this.table.position.z = Math.round(this.cam.target.z / 12) * 12;
    for (const m of this.markers.values()) { const y = m.baseY + Math.sin(T * 2 + m.phase) * 0.12; m.s.position.y = y; m.glow.position.y = y; m.glow.material.opacity = 0.4 + Math.sin(T * 3 + m.phase) * 0.2; }
    // particles
    const dts = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.age += dt;
      if (p.age >= p.life) { this.fxGroup.remove(p.s); p.m.dispose(); this.particles.splice(i, 1); continue; }
      p.vel.y -= p.gravity * dts; p.vel.multiplyScalar(Math.pow(p.drag, dt / 16));
      p.s.position.addScaledVector(p.vel, dts); if (p.spin) p.m.rotation += p.spin * dts;
      const k = p.age / p.life; if (p.swell) { p.m.opacity = p.opacity * Math.sin(k * Math.PI); p.s.scale.setScalar(p.size * (1 + p.grow * k)); } else { if (p.fade) p.m.opacity = p.opacity * (1 - k); p.s.scale.setScalar(p.size * (1 + p.grow * k) * (1 - k * 0.4)); }
    }
    this.spawnAmbient(dt);
    const c = this.cam;
    if (c.shakeT > 0) { c.shakeT -= dt; c.shake = c.shakeMag * Math.max(0, c.shakeT / c.shakeDur); if (c.shakeT <= 0) c.shake = 0; }
    this.applyCamera();
    for (const h of this.frameHooks) h(dt, T);
    for (const a of this.anchors) { const v = a.getPos(); if (!v) { a.el.style.display = 'none'; continue; } const p = this.project(v); a.el.style.display = ''; a.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`; }
    this.renderer.render(this.scene, this.camera);
  }

  spawnAmbient(dt) {
    this.mistAcc += dt;
    if (this.mistAcc > 650 && this.tiles.size) {
      this.mistAcc = 0; const c = this.cam; const span = Math.max(c.size, 12);
      const col = new THREE.Color(this.theme.fog[0]).lerp(new THREE.Color(0xffffff), 0.45);
      this.particle(new THREE.Vector3(c.target.x + (Math.random() - 0.5) * span * 1.9, 0.5 + Math.random() * 0.7, c.target.z + (Math.random() - 0.5) * span * 1.1), { color: col, size: 5 + Math.random() * 5, life: 9000 + Math.random() * 4000, vel: new THREE.Vector3(0.25 + Math.random() * 0.3, 0, 0.05), drag: 1, add: false, opacity: 0.11, swell: true, grow: 0.3 });
    }
    if (!this.ambient) return;
    this.ambientAcc += dt; const every = { leaves: 160, sand: 60, snow: 45, souls: 220, stars: 150, embers: 70, motes: 170 }[this.ambient] || 200;
    while (this.ambientAcc > every) {
      this.ambientAcc -= every; const c = this.cam; const span = c.size * 1.1;
      const pos = new THREE.Vector3(c.target.x + (Math.random() - 0.5) * span * 1.8, 0.2 + Math.random() * 5, c.target.z + (Math.random() - 0.5) * span);
      switch (this.ambient) {
        case 'leaves': this.particle(pos, { color: [0x9be070, 0xd8e060, 0x70c060][Math.floor(Math.random() * 3)], size: 0.16, life: 4200, vel: new THREE.Vector3(0.6 + Math.random() * 0.6, -0.35, 0.3), gravity: 0.02, add: false, opacity: 0.9 }); break;
        case 'sand': this.particle(pos, { color: 0xf0d090, size: 0.12, life: 2200, vel: new THREE.Vector3(3 + Math.random() * 2, 0.1, 0.5), opacity: 0.5 }); break;
        case 'snow': pos.y += 4; this.particle(pos, { color: 0xffffff, size: 0.16, life: 5200, vel: new THREE.Vector3(0.3 + Math.random() * 0.3, -1.1, 0.2), opacity: 0.9 }); break;
        case 'souls': this.particle(pos, { color: [0x9a80ff, 0x60ffc0][Math.floor(Math.random() * 2)], size: 0.3, life: 3800, vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.5, 0), opacity: 0.6 }); break;
        case 'stars': this.particle(pos, { color: [0xffffff, 0xfff0a0, 0xa0c0ff][Math.floor(Math.random() * 3)], size: 0.22, life: 3200, vel: new THREE.Vector3(0, 0.15, 0), opacity: 0.9 }); break;
        case 'embers': pos.y = 0.3; this.particle(pos, { color: [0xff6a1a, 0xffb040, 0xff3010][Math.floor(Math.random() * 3)], size: 0.2, life: 3000, vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.2 + Math.random(), 0), gravity: -0.2 }); break;
        default: this.particle(pos, { color: 0xffe8b0, size: 0.18, life: 4000, vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.25, 0), opacity: 0.6 });
      }
    }
  }
}
