// Props — low-poly diorama scenery: trees, rocks, ruins, mushrooms, crystals and the small
// decorations scattered over plain tiles. Each stage has its own theme (palette + asset set).
import * as THREE from 'three';

export const THEMES = {
  0: { name: 'title', foliage: [0x2f7a44, 0x3f8f4a, 0x58a85a, 0x6ab070], trunk: 0x4f3622, stone: 0x8a8690, moss: 0x5f8a4a, decor: ['tuft', 'mushroom', 'pebble', 'flower', 'fern', 'tuft'], ruin: 0.35,
    table: ['wood', 0x3a2618], key: [0xffdfb0, 2.7], fill: [0x7a8cff, 0.9], hemi: [0xb8c4ff, 0x2a2238, 0.95], fog: [0x1a1838, 62, 120], tint: 0xfff4e6, exposure: 1.08 },
  1: { name: 'forest', foliage: [0x2f7a34, 0x3f8f3a, 0x58a84a, 0x79b84e, 0x8fbf4a], trunk: 0x5a3a20, stone: 0x8a8478, moss: 0x5f8a3a, decor: ['tuft', 'mushroom', 'pebble', 'flower', 'fern', 'log', 'tuft', 'flower'], ruin: 0.3,
    table: ['wood', 0x4a301c], key: [0xfff0cc, 2.9], fill: [0x9ad0ff, 0.7], hemi: [0xe8f6ff, 0x3c4a2c, 1.0], fog: [0x86b49a, 64, 125], tint: 0xfffaf0, exposure: 1.05 },
  2: { name: 'desert', foliage: [0x7a8a3a, 0x9a9a4a, 0x6a7a34], trunk: 0x7a5a34, stone: 0xb89468, moss: 0xc8a060, decor: ['pebble', 'bone', 'shrub', 'cactusball', 'pebble', 'skull', 'shrub'], ruin: 0.4,
    table: ['wood', 0x6a4a2a], key: [0xffe2a8, 3.2], fill: [0xffb070, 0.6], hemi: [0xfff0d0, 0x8a5a2a, 1.0], fog: [0xe0b070, 64, 120], tint: 0xfff2dc, exposure: 1.05 },
  3: { name: 'frost', foliage: [0x2a5a4a, 0x3a7a62, 0x4a8a72], trunk: 0x4a3424, stone: 0x8a96a6, moss: 0xe8f2fa, decor: ['mound', 'shard', 'pebble', 'frostshrub', 'mound', 'shard'], ruin: 0.3,
    table: ['wood', 0x3a4250], key: [0xeaf4ff, 2.7], fill: [0x8ab8ff, 0.9], hemi: [0xf0f8ff, 0x5a6a86, 1.1], fog: [0xb4cce4, 62, 118], tint: 0xeef4ff, exposure: 1.0 },
  4: { name: 'crypt', foliage: [0x3a4a3a, 0x4a5a44], trunk: 0x2a2224, stone: 0x6a6474, moss: 0x4a6a3a, decor: ['skull', 'candle', 'rubble', 'bone', 'candle', 'rubble', 'web'], ruin: 0.5,
    table: ['stone', 0x16131a], key: [0xe0d8ff, 3.3], fill: [0x40d8a0, 0.9], hemi: [0xb8aee0, 0x2a2238, 1.25], fog: [0x1c1628, 62, 118], tint: 0xe4dcf8, exposure: 1.2 },
  5: { name: 'celestial', foliage: [0x8a7ad8, 0xa89af0], trunk: 0xd8d0f0, stone: 0xcfc8ea, moss: 0xffe9a0, decor: ['rune', 'minicrystal', 'mote', 'rubble', 'minicrystal', 'rune'], ruin: 0.55,
    float: true, table: ['cosmic', 0x0e0c2a], key: [0xfff4e0, 2.7], fill: [0x70a8ff, 0.8], hemi: [0xb8b8f0, 0x2a2a66, 0.8], fog: [0x23235e, 62, 118], tint: 0xf0ecff, exposure: 1.05 },
  6: { name: 'abyss', foliage: [0x3a1a2a], trunk: 0x1a1014, stone: 0x3a2e38, moss: 0xff6a1a, decor: ['spike', 'ember', 'skull', 'bone', 'ember', 'spike', 'chain'], ruin: 0.3,
    table: ['char', 0x140c0e], key: [0xffd8b8, 3.4], fill: [0xff5a28, 1.1], hemi: [0xd0a8b0, 0x40101a, 1.2], fog: [0x2a0810, 62, 116], tint: 0xffe6dc, exposure: 1.2 },
};

const GEO = new Map();
const geo = (k, f) => { let g = GEO.get(k); if (!g) { g = f(); GEO.set(k, g); } return g; };
const cyl = (rt, rb, h, s = 7) => geo(`cy${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const cone = (r, h, s = 7) => geo(`co${r}|${h}|${s}`, () => new THREE.ConeGeometry(r, h, s));
const ico = (r, d = 0) => geo(`ic${r}|${d}`, () => new THREE.IcosahedronGeometry(r, d));
const dod = (r) => geo(`do${r}`, () => new THREE.DodecahedronGeometry(r, 0));
const oct = (r) => geo(`oc${r}`, () => new THREE.OctahedronGeometry(r, 0));
const box = (x, y, z) => geo(`bx${x}|${y}|${z}`, () => new THREE.BoxGeometry(x, y, z));
const torus = (r, t) => geo(`to${r}|${t}`, () => new THREE.TorusGeometry(r, t, 5, 10));

export class PropKit {
  constructor(matFn) { this.mat = matFn; this.theme = THEMES[1]; }

  rnd(q, r) { let i = 0; return () => { const x = Math.sin(q * 127.1 + r * 311.7 + (i++) * 74.7) * 43758.5453; return x - Math.floor(x); }; }

  add(g, geometry, color, x, y, z, o = {}) {
    const m = new THREE.Mesh(geometry, this.mat(color, o.mat || {}));
    m.position.set(x, y, z);
    if (o.s != null) m.scale.setScalar(o.s);
    if (o.sc) m.scale.set(o.sc[0], o.sc[1], o.sc[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    m.castShadow = !o.noShadow; m.receiveShadow = true;
    g.add(m); return m;
  }
  glow(color, i = 1) { return { emissive: color, emissiveIntensity: i }; }

  // ───── big pieces ─────
  tree(g, R, x, z, s = 1) {
    const T = this.theme; const f = T.foliage; const pick = () => f[Math.floor(R() * f.length)];
    const lean = (R() - 0.5) * 0.14;
    this.add(g, cyl(0.07, 0.13, 0.8), T.trunk, x, 0.4 * s, z, { s, rot: [lean, 0, lean] });
    this.add(g, cyl(0.03, 0.05, 0.36, 5), T.trunk, x + 0.14 * s, 0.6 * s, z, { s, rot: [0, 0, -0.9] });
    const blobs = [[0, 0.98, 0, 0.44], [0.2, 1.22, 0.06, 0.31], [-0.19, 1.27, -0.05, 0.3], [0.02, 1.52, 0, 0.27], [0.05, 0.86, 0.22, 0.24]];
    for (const [bx, by, bz, br] of blobs) this.add(g, ico(br, 1), pick(), x + bx * s, by * s, z + bz * s, { s: s * (0.9 + R() * 0.25), rot: [R() * 3, R() * 3, 0], mat: { flat: true } });
  }
  pine(g, R, x, z, s = 1) {
    const T = this.theme;
    this.add(g, cyl(0.06, 0.1, 0.5), T.trunk, x, 0.25 * s, z, { s });
    const layers = [[0.48, 0.62, 0.62], [0.38, 0.56, 1.0], [0.27, 0.5, 1.36], [0.16, 0.42, 1.68]];
    layers.forEach(([r, hgt, y], i) => {
      this.add(g, cone(r, hgt, 8), T.foliage[i % T.foliage.length], x, y * s, z, { s, rot: [0, R() * 3, 0], mat: { flat: true } });
      this.add(g, cone(r * 0.7, hgt * 0.5, 8), 0xf4faff, x, (y + hgt * 0.27) * s, z, { s, rot: [0, R() * 3, 0], mat: { flat: true } });
    });
  }
  deadTree(g, R, x, z, s = 1, color = this.theme.trunk) {
    this.add(g, cyl(0.05, 0.12, 1.0, 6), color, x, 0.5 * s, z, { s, rot: [(R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3] });
    for (let i = 0; i < 4; i++) this.add(g, cyl(0.015, 0.045, 0.5, 5), color, x + (R() - 0.5) * 0.3 * s, (0.75 + R() * 0.4) * s, z + (R() - 0.5) * 0.2 * s, { s, rot: [(R() - 0.5) * 1.6, 0, (R() - 0.5) * 2.2] });
  }
  boulders(g, R, s = 1, moss = true) {
    const T = this.theme; const c = T.stone;
    const shade = (k) => new THREE.Color(c).offsetHSL(0, 0, k).getHex();
    this.add(g, dod(0.5), shade(0), 0, 0.3 * s, 0, { sc: [1.1 * s, 0.85 * s, 0.95 * s], rot: [R(), R() * 3, R()], mat: { flat: true } });
    this.add(g, dod(0.3), shade(-0.06), 0.42 * s, 0.17 * s, 0.26 * s, { s, rot: [R() * 3, R() * 3, 0], mat: { flat: true } });
    this.add(g, dod(0.22), shade(0.05), -0.4 * s, 0.12 * s, 0.3 * s, { s, rot: [R() * 3, R() * 3, 0], mat: { flat: true } });
    if (moss) { this.add(g, ico(0.3, 1), T.moss, -0.08 * s, 0.58 * s, -0.04 * s, { sc: [1.25 * s, 0.4 * s, 1.1 * s], mat: { flat: true } }); this.add(g, ico(0.16, 1), T.moss, 0.42 * s, 0.33 * s, 0.24 * s, { sc: [1.2 * s, 0.45 * s, 1.1 * s], mat: { flat: true } }); }
  }
  ruin(g, R) {
    const T = this.theme; const c = new THREE.Color(T.stone).offsetHSL(0, -0.05, 0.08).getHex(); const d = new THREE.Color(T.stone).offsetHSL(0, 0, -0.08).getHex();
    const kind = R();
    this.add(g, box(1.05, 0.14, 0.9), d, 0, 0.07, 0, { rot: [0, R() * 0.6, 0] });
    if (kind < 0.45) { // broken colonnade
      this.add(g, cyl(0.19, 0.21, 1.25, 10), c, -0.26, 0.76, -0.1); this.add(g, box(0.52, 0.12, 0.52), c, -0.26, 1.44, -0.1);
      this.add(g, cyl(0.19, 0.21, 0.55, 10), c, 0.32, 0.4, 0.08, { rot: [0.05, 0, 0.08] });
      this.add(g, cyl(0.19, 0.19, 0.5, 10), d, 0.2, 0.2, 0.46, { rot: [1.5708, 0, 0.5] });
    } else if (kind < 0.8) { // archway
      this.add(g, box(0.26, 1.3, 0.3), c, -0.42, 0.78, 0); this.add(g, box(0.26, 1.05, 0.3), c, 0.42, 0.66, 0);
      this.add(g, box(1.1, 0.24, 0.34), c, -0.02, 1.52, 0, { rot: [0, 0, -0.07] }); this.add(g, box(0.3, 0.22, 0.3), d, 0.5, 0.22, 0.4, { rot: [0.3, 0.6, 0.2] });
    } else { // toppled statue / obelisk
      this.add(g, box(0.5, 0.36, 0.5), c, 0, 0.3, 0); this.add(g, cyl(0.1, 0.2, 1.1, 4), c, 0, 1.0, 0, { rot: [0, 0.785, 0] }); this.add(g, oct(0.14), this.theme.moss, 0, 1.66, 0, { mat: this.glow(this.theme.moss, 0.7) });
    }
    this.add(g, ico(0.2, 1), T.moss, -0.3, 0.2, 0.36, { sc: [1.3, 0.45, 1.1], mat: { flat: true } });
    this.add(g, dod(0.14), d, 0.1, 0.2, -0.38, { rot: [R() * 3, R() * 3, 0], mat: { flat: true } });
  }
  mushroom(g, R, x, z, s = 1, cap = 0xc8402e) {
    this.add(g, cyl(0.045, 0.065, 0.2, 6), 0xf0e6cc, x, 0.1 * s, z, { s });
    const m = this.add(g, ico(0.15, 1), cap, x, 0.21 * s, z, { sc: [s, 0.6 * s, s], mat: { flat: true } });
    this.add(g, ico(0.035, 0), 0xfff6e0, x + 0.06 * s, 0.29 * s, z + 0.05 * s, { s, noShadow: true }); this.add(g, ico(0.03, 0), 0xfff6e0, x - 0.07 * s, 0.27 * s, z + 0.02 * s, { s, noShadow: true });
    return m;
  }
  crystals(g, R, n, color, glowColor, spread = 0.35, s = 1) {
    for (let i = 0; i < n; i++) {
      const m = this.add(g, oct(0.26), color, (R() - 0.5) * 2 * spread, (0.3 + R() * 0.25) * s, (R() - 0.5) * 2 * spread, { sc: [(0.5 + R() * 0.5) * s, (1.4 + R() * 1.4) * s, (0.5 + R() * 0.5) * s], rot: [(R() - 0.5) * 0.6, R() * 3, (R() - 0.5) * 0.6], mat: { flat: true, ...this.glow(glowColor, 0.75), roughness: 0.25 } });
      m.userData.pulse = true;
    }
  }

  // ───── terrain props (kind comes from terrain.prop) ─────
  prop(kind, q, r, dense = false) {
    const g = new THREE.Group(); const R = this.rnd(q, r); const T = this.theme;
    const back = [[-0.5, -0.4], [0.48, -0.36], [0.02, -0.64]];
    switch (kind) {
      case 'tree':
        if (T.name === 'crypt' || T.name === 'abyss') { this.deadTree(g, R, -0.4, -0.4, 1.2); this.deadTree(g, R, 0.44, -0.3, 0.9); break; }
        this.tree(g, R, back[0][0], back[0][1], 0.95 + R() * 0.25); this.tree(g, R, back[1][0], back[1][1], 0.75 + R() * 0.3);
        if (dense) this.tree(g, R, 0.05, 0.05, 1.0 + R() * 0.25);
        this.add(g, ico(0.2, 1), T.foliage[1], -0.62, 0.14, 0.34, { sc: [1.2, 0.8, 1], mat: { flat: true } }); this.add(g, ico(0.15, 1), T.foliage[2 % T.foliage.length], 0.64, 0.11, 0.28, { mat: { flat: true } });
        if (R() < 0.6) this.mushroom(g, R, 0.3 + R() * 0.3, 0.5, 0.8 + R() * 0.5, R() < 0.5 ? 0xc8402e : 0xd89a3a);
        break;
      case 'pine':
        this.pine(g, R, back[0][0], back[0][1], 0.95 + R() * 0.2); this.pine(g, R, back[1][0], back[1][1], 0.75 + R() * 0.25);
        if (dense) this.pine(g, R, 0, 0.05, 1.0 + R() * 0.25);
        this.add(g, ico(0.24, 1), 0xf4faff, -0.6, 0.06, 0.36, { sc: [1.3, 0.5, 1], mat: { flat: true } }); this.add(g, ico(0.18, 1), 0xf4faff, 0.6, 0.05, 0.3, { sc: [1.2, 0.5, 1], mat: { flat: true } });
        break;
      case 'rock':
        if (R() < T.ruin) this.ruin(g, R); else { this.boulders(g, R, 1, T.name !== 'desert'); if (T.name === 'forest' || T.name === 'title') { this.add(g, ico(0.16, 1), T.foliage[1], -0.55, 0.1, -0.3, { mat: { flat: true } }); if (R() < 0.5) this.mushroom(g, R, 0.55, -0.35, 1.2); } }
        break;
      case 'mountain': {
        const c = T.stone; const sh = (k) => new THREE.Color(c).offsetHSL(0, 0, k).getHex();
        this.add(g, cone(0.82, 1.9, 6), sh(0), 0, 0.95, -0.05, { rot: [0, R() * 3, 0], mat: { flat: true } }); this.add(g, cone(0.36, 0.78, 6), 0xf6fbff, 0, 1.52, -0.05, { rot: [0, R() * 3, 0], mat: { flat: true } });
        this.add(g, cone(0.46, 1.05, 5), sh(-0.07), 0.46, 0.52, 0.3, { mat: { flat: true } }); this.add(g, cone(0.2, 0.42, 5), 0xf6fbff, 0.46, 0.86, 0.3, { mat: { flat: true } });
        this.add(g, cone(0.36, 0.8, 5), sh(0.05), -0.5, 0.4, 0.26, { mat: { flat: true } }); this.add(g, dod(0.2), sh(-0.1), 0.05, 0.14, 0.62, { mat: { flat: true } });
        break;
      }
      case 'cactus': {
        const c = 0x4f9a4a, d = 0x3f8040;
        const sag = (x, z, s) => { this.add(g, cyl(0.12, 0.14, 1.0, 8), c, x, 0.5 * s, z, { s }); this.add(g, ico(0.12, 1), c, x, 1.0 * s, z, { s, mat: { flat: true } }); this.add(g, cyl(0.07, 0.07, 0.3, 6), d, x + 0.2 * s, 0.56 * s, z, { s, rot: [0, 0, 1.5708] }); this.add(g, cyl(0.07, 0.07, 0.36, 6), d, x + 0.32 * s, 0.76 * s, z, { s }); this.add(g, cyl(0.06, 0.06, 0.24, 6), d, x - 0.18 * s, 0.4 * s, z, { s, rot: [0, 0, 1.5708] }); this.add(g, cyl(0.06, 0.06, 0.26, 6), d, x - 0.27 * s, 0.55 * s, z, { s }); this.add(g, ico(0.06, 0), 0xff70a0, x, 1.12 * s, z, { s }); };
        sag(back[0][0], back[0][1], 1 + R() * 0.2); sag(back[1][0] + 0.05, back[1][1], 0.7 + R() * 0.2);
        this.add(g, ico(0.15, 1), c, 0.55, 0.12, 0.36, { sc: [1, 0.85, 1], mat: { flat: true } }); this.add(g, ico(0.05, 0), 0xffd040, 0.55, 0.27, 0.36);
        this.add(g, dod(0.14), T.stone, -0.58, 0.08, 0.34, { mat: { flat: true } });
        break;
      }
      case 'flower': {
        for (let i = 0; i < 9; i++) { const a = R() * 6.28, d = 0.45 + R() * 0.3, x = Math.cos(a) * d, z = Math.sin(a) * d; this.add(g, cyl(0.012, 0.012, 0.2, 4), 0x4a8a3a, x, 0.1, z, { noShadow: true }); this.add(g, ico(0.07, 0), [0xff9ad0, 0xfff0a0, 0xa0e0ff, 0xffffff][i % 4], x, 0.22, z, { mat: this.glow(0x504030, 0.6) }); }
        this.add(g, cyl(0.1, 0.14, 0.5, 6), T.stone, 0, 0.25, -0.62, { rot: [0.08, 0, 0.05], mat: { flat: true } }); this.add(g, oct(0.09), 0x9affc0, 0, 0.62, -0.62, { mat: this.glow(0x7affb0, 1.2) }).userData.pulse = true;
        break;
      }
      case 'grave': {
        const c = T.stone;
        this.add(g, box(0.42, 0.56, 0.12), c, back[0][0] + 0.1, 0.28, back[0][1], { rot: [-0.08, 0.2, 0.05] }); this.add(g, cyl(0.21, 0.21, 0.12, 12), c, back[0][0] + 0.1, 0.55, back[0][1], { rot: [1.5708 - 0.08, 0, 0.2] });
        this.add(g, box(0.1, 0.7, 0.1), c, back[1][0], 0.35, back[1][1], { rot: [0, 0, -0.1] }); this.add(g, box(0.4, 0.1, 0.1), c, back[1][0] + 0.02, 0.5, back[1][1], { rot: [0, 0, -0.1] });
        this.add(g, ico(0.3, 1), 0x4a3a2c, -0.3, 0.02, 0.05, { sc: [1.1, 0.3, 1.6], mat: { flat: true } });
        this.decorItem(g, R, 'candle', 0.55, 0.3); if (R() < 0.6) this.decorItem(g, R, 'skull', -0.6, 0.4);
        break;
      }
      case 'pillar': {
        const c = new THREE.Color(T.stone).offsetHSL(0, 0, 0.06).getHex(); const broken = R() < 0.45; const hgt = broken ? 0.9 + R() * 0.4 : 1.9;
        this.add(g, box(0.86, 0.16, 0.86), T.stone, 0, 0.08, 0); this.add(g, cyl(0.34, 0.36, 0.12, 10), c, 0, 0.22, 0);
        this.add(g, cyl(0.27, 0.3, hgt, 10), c, 0, 0.28 + hgt / 2, 0, { mat: { flat: true } });
        if (broken) { this.add(g, cyl(0.27, 0.27, 0.5, 10), T.stone, 0.42, 0.28, 0.4, { rot: [1.5708, 0, 0.7], mat: { flat: true } }); this.add(g, dod(0.14), T.stone, -0.45, 0.1, 0.3, { mat: { flat: true } }); }
        else { this.add(g, cyl(0.36, 0.28, 0.14, 10), c, 0, 2.25, 0); this.add(g, box(0.82, 0.14, 0.82), T.stone, 0, 2.38, 0); if (T.name === 'crypt') { this.add(g, cone(0.12, 0.34, 6), 0x20c080, 0, 2.66, 0, { mat: this.glow(0x20e090, 0.9), noShadow: true }).userData.flame = true; } else this.add(g, oct(0.16), 0xfff0a0, 0, 2.7, 0, { mat: this.glow(0xffe070, 1.3) }).userData.pulse = true; }
        break;
      }
      case 'crystal':
        this.add(g, dod(0.34), T.stone, 0, 0.14, 0, { sc: [1.5, 0.5, 1.4], mat: { flat: true } });
        this.crystals(g, R, 5, 0xb9a8ff, 0x7a5aff, 0.32, 1.15);
        break;
      case 'spire': {
        this.add(g, cone(0.44, 2.3, 5), 0x2a1a30, 0, 1.15, 0, { rot: [0, R() * 3, 0.05], mat: { flat: true } }); this.add(g, cone(0.24, 1.2, 5), 0x3a2040, 0.42, 0.6, 0.22, { rot: [0.1, 0, -0.2], mat: { flat: true } }); this.add(g, cone(0.2, 0.9, 5), 0x241428, -0.4, 0.45, 0.2, { rot: [0.1, 0, 0.25], mat: { flat: true } });
        this.add(g, oct(0.16), 0xff3060, 0, 2.42, 0, { mat: this.glow(0xff2040, 1.6) }).userData.pulse = true;
        this.add(g, torus(0.3, 0.035), 0x1a1014, 0, 1.25, 0, { rot: [1.5708, 0, 0] }); this.decorItem(g, R, 'ember', -0.55, 0.42);
        break;
      }
      // ── stage-specific pieces ──
      case 'giant': { // elder tree: a huge trunk with buttress roots and a layered crown
        const bark = 0x4a321e, f = T.foliage;
        this.add(g, cyl(0.3, 0.52, 1.9, 9), bark, 0, 0.95, -0.05, { rot: [0.03, R() * 3, -0.03], mat: { flat: true } });
        for (let i = 0; i < 5; i++) { const an = i * 1.257 + R(); this.add(g, cone(0.17, 0.75, 5), bark, Math.cos(an) * 0.5, 0.2, Math.sin(an) * 0.5 - 0.05, { rot: [Math.sin(an) * 0.9, 0, -Math.cos(an) * 0.9], mat: { flat: true } }); }
        this.add(g, cyl(0.07, 0.12, 0.7, 5), bark, 0.42, 1.55, 0, { rot: [0, 0, -1.0] }); this.add(g, cyl(0.07, 0.12, 0.7, 5), bark, -0.42, 1.65, -0.1, { rot: [0, 0, 1.0] });
        for (const [x, y, z, r] of [[0, 2.3, -0.05, 0.85], [0.62, 2.05, 0.1, 0.56], [-0.62, 2.12, -0.1, 0.58], [0.2, 2.82, -0.1, 0.56], [-0.3, 2.7, 0.2, 0.46], [0.05, 1.95, 0.5, 0.42]]) this.add(g, ico(r, 1), f[Math.floor(R() * f.length)], x, y, z, { rot: [R() * 3, R() * 3, 0], mat: { flat: true } });
        this.mushroom(g, R, 0.62, 0.45, 1.5, 0xd89a3a); this.mushroom(g, R, -0.6, 0.5, 1.2);
        this.add(g, ico(0.05, 0), 0xd8ffb0, 0.5, 1.2, 0.4, { mat: this.glow(0xb0ff80, 2), noShadow: true }).userData.float = R() * 6;
        break;
      }
      case 'ruinwall': {
        const c = new THREE.Color(T.stone).offsetHSL(0, -0.04, 0.06).getHex(), d = new THREE.Color(T.stone).offsetHSL(0, 0, -0.1).getHex();
        const hs = [1.25 + R() * 0.4, 0.75 + R() * 0.3, 0.45 + R() * 0.2];
        this.add(g, box(0.5, hs[0], 0.5), c, -0.38, hs[0] / 2, -0.12, { rot: [0, 0.1, 0] }); this.add(g, box(0.5, hs[1], 0.5), d, 0.12, hs[1] / 2, -0.06, { rot: [0, -0.08, 0.03] }); this.add(g, box(0.42, hs[2], 0.46), c, 0.56, hs[2] / 2, 0.05, { rot: [0, 0.2, -0.05] });
        this.add(g, box(0.56, 0.12, 0.56), d, -0.38, hs[0] + 0.05, -0.12, { rot: [0, 0.1, 0.06] });
        this.add(g, box(0.26, 0.2, 0.3), d, 0.3, 0.1, 0.52, { rot: [0.3, 0.7, 0.1] }); this.add(g, ico(0.22, 1), T.moss, -0.36, hs[0] + 0.1, -0.1, { sc: [1.3, 0.4, 1.2], mat: { flat: true } }); this.add(g, ico(0.16, 1), T.foliage[0], 0.5, 0.1, 0.5, { mat: { flat: true } });
        for (let i = 0; i < 3; i++) this.add(g, cyl(0.012, 0.012, 0.5 + R() * 0.4, 4), T.foliage[1], -0.14 + i * 0.03, hs[0] - 0.3, 0.14, { noShadow: true });
        break;
      }
      case 'bridge': { // rope posts on the corners, deck stays clear
        for (let k = 0; k < 6; k++) { const an = k * 1.0472; const x = Math.sin(an) * 0.82, z = Math.cos(an) * 0.82; if (k % 3 === 0) continue; this.add(g, cyl(0.045, 0.055, 0.5, 6), 0x5a3a1e, x, 0.25, z); this.add(g, ico(0.06, 0), 0x6a4626, x, 0.52, z); }
        for (const sx of [-1, 1]) this.add(g, cyl(0.016, 0.016, 0.84, 4), 0xc9b48a, sx * 0.71, 0.4, 0, { rot: [1.5708, 0, 0], noShadow: true });
        break;
      }
      case 'mesa': { // layered canyon rock crowning a tall sandstone block
        const c = 0xb9814a, d = 0x9a6634, l = 0xd09a5c;
        this.add(g, cyl(0.78, 0.9, 0.34, 6), d, 0, 0.17, 0, { rot: [0, R(), 0], mat: { flat: true } }); this.add(g, cyl(0.6, 0.74, 0.3, 6), c, 0.05, 0.49, -0.04, { rot: [0, R() * 2, 0], mat: { flat: true } });
        if (R() < 0.6) this.add(g, cyl(0.36, 0.52, 0.34, 6), l, -0.1, 0.8, 0, { rot: [0, R() * 2, 0], mat: { flat: true } });
        this.add(g, dod(0.2), d, 0.55, 0.12, 0.45, { rot: [R() * 3, R() * 3, 0], mat: { flat: true } }); if (R() < 0.4) this.decorItem(g, R, 'shrub', -0.5, 0.5);
        break;
      }
      case 'palm': {
        const palm = (x, z, s, lean) => {
          let px = x, py = 0; for (let i = 0; i < 4; i++) { this.add(g, cyl(0.05, 0.065, 0.4, 6), 0x8a6a3a, px, py + 0.2 * s, z, { s, rot: [0, 0, -lean * (i + 1) * 0.5] }); px += lean * 0.11 * (i + 1) * s; py += 0.36 * s; }
          for (let k = 0; k < 7; k++) { const an = k * 0.8976 + R(); this.add(g, cone(0.11, 0.8, 4), k % 2 ? 0x5fa040 : 0x4a8a36, px + Math.cos(an) * 0.3 * s, py - 0.04, z + Math.sin(an) * 0.3 * s, { s, sc: [s, s, s * 0.35], rot: [Math.sin(an) * 1.25, -an, -Math.cos(an) * 1.25], mat: { flat: true } }); }
          this.add(g, ico(0.05, 0), 0x6a4a22, px + 0.05, py - 0.08, z + 0.04); this.add(g, ico(0.05, 0), 0x6a4a22, px - 0.05, py - 0.1, z);
        };
        palm(-0.45, -0.42, 1.15, 0.5); palm(0.5, -0.36, 0.9, -0.4);
        this.add(g, ico(0.16, 1), 0x5a9a3a, -0.6, 0.1, 0.34, { sc: [1.2, 0.7, 1], mat: { flat: true } });
        break;
      }
      case 'reeds': {
        for (let i = 0; i < 9; i++) { const an = 2.4 + R() * 4.4, d = 0.6 + R() * 0.18; this.add(g, cyl(0.012, 0.016, 0.34 + R() * 0.2, 4), 0x6a9a3a, Math.cos(an) * d, 0.2, Math.sin(an) * d * 0.9, { rot: [(R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3], noShadow: true }); }
        this.decorItem(g, R, 'flower', -0.55, -0.4);
        break;
      }
      case 'glacier': {
        for (let i = 0; i < 6; i++) { const x = (R() - 0.5) * 1.0, z = (R() - 0.5) * 0.8 - 0.05, hgt = 0.9 + R() * 1.3; this.add(g, oct(0.3), i % 2 ? 0xbfe8ff : 0x9fd4f4, x, hgt * 0.3, z, { sc: [0.7 + R() * 0.5, hgt, 0.7 + R() * 0.5], rot: [(R() - 0.5) * 0.35, R() * 3, (R() - 0.5) * 0.35], mat: { flat: true, roughness: 0.15, ...this.glow(0x3a8ad0, 0.3) } }); }
        this.add(g, ico(0.28, 1), 0xf4faff, 0.45, 0.06, 0.5, { sc: [1.3, 0.4, 1], mat: { flat: true } });
        break;
      }
      case 'icebridge': {
        for (let k = 0; k < 6; k++) { if (k % 3 === 0) continue; const an = k * 1.0472; this.add(g, oct(0.09), 0xd0f2ff, Math.sin(an) * 0.82, 0.14, Math.cos(an) * 0.82, { sc: [0.7, 2.2, 0.7], mat: { flat: true, roughness: 0.15, ...this.glow(0x4a9ae0, 0.4) } }); }
        for (let k = 0; k < 5; k++) this.add(g, cone(0.035, 0.24 + R() * 0.2, 4), 0xd8f4ff, (R() - 0.5) * 1.3, -0.3, 0.8 * (k % 2 ? 1 : -1), { rot: [Math.PI, 0, 0], noShadow: true });
        break;
      }
      case 'wallcap': { // crenellated crypt wall with the odd torch or skull niche
        const c = 0x4a4454, d = 0x35303e;
        for (const [x, z] of [[-0.45, -0.3], [0.45, -0.3], [0, 0.42], [-0.45, 0.3], [0.45, 0.3], [0, -0.5]]) this.add(g, box(0.34, 0.2 + R() * 0.1, 0.3), R() < 0.5 ? 0x2e2a36 : 0x24202a, x, 0.1, z, { rot: [0, R() * 0.3, 0] });
        const roll = R() * 2;
        if (roll < 0.3) { this.add(g, cyl(0.03, 0.04, 0.5, 5), 0x3a2a1a, 0, 0.45, 0.1); this.add(g, cone(0.08, 0.24, 6), 0x60ffb0, 0, 0.82, 0.1, { mat: this.glow(0x30e090, 1.1), noShadow: true }).userData.flame = true; }
        else if (roll < 0.5) this.decorItem(g, R, 'skull', 0, 0.05);
        else if (roll < 0.62) this.add(g, cyl(0.2, 0.2, 0.004, 8), 0xd8d8e8, 0, 0.3, 0, { noShadow: true, mat: { transparent: true, opacity: 0.3 } });
        break;
      }
      case 'secret': { // a crumbling gap: broken wall stubs either side, rubble underfoot
        const c = 0x4a4454;
        this.add(g, box(0.36, 0.95, 0.5), c, -0.62, 0.47, -0.2, { rot: [0, 0.1, 0.05] }); this.add(g, box(0.36, 0.7, 0.5), c, 0.62, 0.35, -0.2, { rot: [0, -0.1, -0.06] });
        this.add(g, box(0.9, 0.2, 0.4), 0x35303e, 0, 1.0, -0.3, { rot: [0, 0, 0.12] });
        this.decorItem(g, R, 'rubble', -0.5, 0.5); this.decorItem(g, R, 'rubble', 0.5, 0.45);
        this.add(g, cyl(0.3, 0.3, 0.004, 8), 0xe0e0f0, 0.35, 0.8, -0.28, { rot: [1.5708, 0, 0], noShadow: true, mat: { transparent: true, opacity: 0.28 } });
        break;
      }
      case 'tomb': {
        const c = 0x8a8494, d = 0x5e586a;
        this.add(g, box(0.72, 0.16, 1.2), d, 0, 0.08, 0, { rot: [0, 0.5236, 0] }); this.add(g, box(0.58, 0.4, 1.05), c, 0, 0.34, 0, { rot: [0, 0.5236, 0] }); this.add(g, box(0.66, 0.1, 1.14), d, 0.03, 0.59, 0.02, { rot: [0, 0.56 + R() * 0.2, 0.03] });
        this.add(g, box(0.07, 0.04, 0.5), 0xc9a040, 0.03, 0.66, 0.02, { rot: [0, 0.56, 0] }); this.add(g, box(0.07, 0.04, 0.26), 0xc9a040, 0.03, 0.66, -0.06, { rot: [0, 0.56 + 1.5708, 0] });
        this.decorItem(g, R, 'candle', -0.6, 0.45); if (R() < 0.5) this.decorItem(g, R, 'bone', 0.6, 0.4);
        break;
      }
      case 'skybridge': {
        for (let k = 0; k < 6; k++) { if (k % 3 === 0) continue; const an = k * 1.0472; const m = this.add(g, oct(0.08), 0xfff0a0, Math.sin(an) * 0.82, 0.32, Math.cos(an) * 0.82, { sc: [0.8, 1.8, 0.8], mat: this.glow(0xffd060, 1.6), noShadow: true }); m.userData.float = k; }
        break;
      }
      case 'stonebridge': {
        for (let k = 0; k < 6; k++) { if (k % 3 === 0) continue; const an = k * 1.0472; const x = Math.sin(an) * 0.82, z = Math.cos(an) * 0.82; this.add(g, box(0.16, 0.42, 0.16), 0x2a2028, x, 0.21, z); this.add(g, dod(0.06), 0xff7a20, x, 0.48, z, { mat: this.glow(0xff5a10, 1.8), noShadow: true }).userData.pulse = true; }
        for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) this.add(g, torus(0.05, 0.014), 0x3a3238, sx * 0.71, 0.3, -0.4 + i * 0.2, { rot: [0, i % 2 ? 1.5708 : 0, 0], noShadow: true });
        break;
      }
      case 'ritual': { // braziers on the rim; the platform itself glows
        for (let k = 0; k < 6; k += 2) { const an = k * 1.0472 + 0.5236; const x = Math.sin(an) * 0.74, z = Math.cos(an) * 0.74; this.add(g, cyl(0.035, 0.07, 0.36, 6), 0x2a2028, x, 0.18, z); this.add(g, cyl(0.1, 0.05, 0.08, 7), 0x3a2a30, x, 0.4, z); this.add(g, cone(0.07, 0.24, 6), 0xff8a30, x, 0.56, z, { mat: this.glow(0xff5a10, 2), noShadow: true }).userData.flame = true; }
        break;
      }
      case 'rampart': {
        const c = 0x3a2e38, d = 0x241a22;
        for (let k = 0; k < 6; k++) { const an = k * 1.0472 + 0.5236; this.add(g, box(0.3, 0.36, 0.24), k % 2 ? c : d, Math.sin(an) * 0.62, 0.18, Math.cos(an) * 0.62, { rot: [0, an, 0] }); }
        const roll = R();
        if (roll < 0.35) { this.add(g, cyl(0.025, 0.03, 1.3, 5), 0x1a1014, 0, 0.65, 0); this.add(g, box(0.5, 0.34, 0.02), 0x8a1420, 0.26, 1.08, 0, { mat: this.glow(0x500810, 0.6) }); }
        else if (roll < 0.7) { this.add(g, cone(0.1, 0.7, 5), d, 0.12, 0.35, -0.1, { rot: [0.1, 0, -0.15], mat: { flat: true } }); this.add(g, cone(0.08, 0.5, 5), c, -0.2, 0.25, 0.1, { rot: [-0.1, 0, 0.2], mat: { flat: true } }); }
        else this.decorItem(g, R, 'ember', 0, 0);
        break;
      }
      case 'portal': { // a broken summoning arch behind the rift
        this.add(g, box(0.16, 0.9, 0.16), 0x2a1a30, -0.48, 0.45, -0.5, { rot: [0, 0, 0.08] }); this.add(g, box(0.16, 0.7, 0.16), 0x2a1a30, 0.48, 0.35, -0.5, { rot: [0, 0, -0.1] });
        this.add(g, torus(0.46, 0.05), 0xc060ff, 0, 0.62, -0.5, { mat: this.glow(0xa030ff, 1.6), noShadow: true }).userData.pulse = true;
        this.add(g, oct(0.07), 0xe0a0ff, 0, 1.2, -0.5, { mat: this.glow(0xc060ff, 2), noShadow: true }).userData.float = R() * 6;
        break;
      }
      default: break;
    }
    return g;
  }

  // ───── small scatter decorations ─────
  decorItem(g, R, kind, x, z) {
    const T = this.theme; const s = 0.8 + R() * 0.5;
    switch (kind) {
      case 'tuft': for (let i = 0; i < 4; i++) this.add(g, cone(0.035, 0.22, 4), T.foliage[i % T.foliage.length], x + (R() - 0.5) * 0.16, 0.1 * s, z + (R() - 0.5) * 0.16, { s, rot: [(R() - 0.5) * 0.5, 0, (R() - 0.5) * 0.5], noShadow: true }); break;
      case 'mushroom': this.mushroom(g, R, x, z, s, R() < 0.6 ? 0xc8402e : 0xe0a040); if (R() < 0.6) this.mushroom(g, R, x + 0.14, z + 0.08, s * 0.6, 0xc8402e); break;
      case 'pebble': for (let i = 0; i < 3; i++) this.add(g, dod(0.07), T.stone, x + (R() - 0.5) * 0.26, 0.03, z + (R() - 0.5) * 0.26, { s: 0.6 + R(), rot: [R() * 3, R() * 3, 0], mat: { flat: true } }); break;
      case 'flower': for (let i = 0; i < 3; i++) { const fx = x + (R() - 0.5) * 0.24, fz = z + (R() - 0.5) * 0.24; this.add(g, cyl(0.01, 0.01, 0.14, 4), 0x4a8a3a, fx, 0.07, fz, { noShadow: true }); this.add(g, ico(0.045, 0), [0xff9ad0, 0xfff0a0, 0xa0d8ff, 0xffffff][Math.floor(R() * 4)], fx, 0.16, fz, { noShadow: true }); } break;
      case 'fern': this.add(g, ico(0.17, 1), T.foliage[Math.floor(R() * T.foliage.length)], x, 0.1 * s, z, { sc: [1.2 * s, 0.8 * s, 1.1 * s], rot: [0, R() * 3, 0], mat: { flat: true } }); this.add(g, ico(0.1, 1), T.foliage[0], x + 0.16, 0.07, z + 0.06, { mat: { flat: true } }); break;
      case 'log': this.add(g, cyl(0.08, 0.09, 0.5, 7), T.trunk, x, 0.08, z, { rot: [1.5708, 0, R() * 3] }); this.add(g, ico(0.07, 1), T.moss, x, 0.16, z, { sc: [1.6, 0.5, 1], mat: { flat: true } }); break;
      case 'bone': this.add(g, cyl(0.018, 0.018, 0.3, 5), 0xe8e0c8, x, 0.03, z, { rot: [1.5708, 0, R() * 3] }); this.add(g, cyl(0.018, 0.018, 0.24, 5), 0xe8e0c8, x + 0.05, 0.04, z + 0.04, { rot: [1.5708, 0, R() * 3] }); break;
      case 'skull': this.add(g, ico(0.085, 1), 0xe8e0c8, x, 0.08, z, { sc: [1, 0.9, 1.1], mat: { flat: true } }); this.add(g, box(0.09, 0.05, 0.08), 0xd8d0b8, x, 0.02, z + 0.05); this.add(g, ico(0.022, 0), 0x140c10, x - 0.035, 0.09, z + 0.08, { noShadow: true }); this.add(g, ico(0.022, 0), 0x140c10, x + 0.035, 0.09, z + 0.08, { noShadow: true }); break;
      case 'shrub': for (let i = 0; i < 5; i++) this.add(g, cyl(0.008, 0.016, 0.3, 4), 0x8a6a3a, x, 0.13, z, { rot: [(R() - 0.5) * 1.4, 0, (R() - 0.5) * 1.4], noShadow: true }); break;
      case 'cactusball': this.add(g, ico(0.12, 1), 0x4f9a4a, x, 0.09, z, { sc: [1, 0.85, 1], mat: { flat: true } }); this.add(g, ico(0.04, 0), 0xff70a0, x, 0.21, z, { noShadow: true }); break;
      case 'mound': this.add(g, ico(0.2, 1), 0xf4faff, x, 0.02, z, { sc: [1.3 * s, 0.45 * s, 1.1 * s], mat: { flat: true } }); break;
      case 'shard': for (let i = 0; i < 3; i++) this.add(g, oct(0.08), 0xc0ecff, x + (R() - 0.5) * 0.2, 0.1, z + (R() - 0.5) * 0.2, { sc: [0.6, 1.5 + R(), 0.6], rot: [(R() - 0.5) * 0.7, R() * 3, (R() - 0.5) * 0.7], mat: { flat: true, ...this.glow(0x4090d0, 0.35), roughness: 0.2 } }); break;
      case 'frostshrub': for (let i = 0; i < 5; i++) this.add(g, cyl(0.008, 0.016, 0.28, 4), 0xd8e8f8, x, 0.12, z, { rot: [(R() - 0.5) * 1.4, 0, (R() - 0.5) * 1.4], noShadow: true }); break;
      case 'candle': { this.add(g, cyl(0.03, 0.035, 0.14, 6), 0xe8dcc0, x, 0.07, z); const f = this.add(g, cone(0.025, 0.08, 5), 0xffd060, x, 0.19, z, { mat: this.glow(0xffb030, 2), noShadow: true }); f.userData.flame = true; if (R() < 0.6) { this.add(g, cyl(0.03, 0.035, 0.09, 6), 0xe8dcc0, x + 0.09, 0.045, z + 0.03); this.add(g, cone(0.022, 0.07, 5), 0xffd060, x + 0.09, 0.13, z + 0.03, { mat: this.glow(0xffb030, 2), noShadow: true }).userData.flame = true; } break; }
      case 'rubble': for (let i = 0; i < 3; i++) this.add(g, box(0.12, 0.08, 0.1), T.stone, x + (R() - 0.5) * 0.26, 0.04, z + (R() - 0.5) * 0.26, { s: 0.7 + R() * 0.8, rot: [R(), R() * 3, R()] }); break;
      case 'web': this.add(g, cyl(0.16, 0.16, 0.004, 8), 0xd8d8e8, x, 0.012, z, { noShadow: true, mat: { transparent: true, opacity: 0.35 } }); break;
      case 'rune': this.add(g, box(0.16, 0.2, 0.1), T.stone, x, 0.1, z, { rot: [0, R() * 3, 0.1] }); this.add(g, box(0.08, 0.08, 0.02), 0xffe9a0, x, 0.13, z + 0.055, { mat: this.glow(0xffd060, 1.4), noShadow: true }).userData.pulse = true; break;
      case 'minicrystal': for (let i = 0; i < 2; i++) this.add(g, oct(0.07), 0xb9a8ff, x + (R() - 0.5) * 0.16, 0.1, z + (R() - 0.5) * 0.16, { sc: [0.6, 1.6 + R(), 0.6], rot: [(R() - 0.5) * 0.6, R() * 3, (R() - 0.5) * 0.6], mat: { flat: true, ...this.glow(0x7a5aff, 0.8) } }).userData.pulse = true; break;
      case 'mote': this.add(g, ico(0.03, 0), 0xfff6c0, x, 0.3 + R() * 0.2, z, { mat: this.glow(0xfff0a0, 2), noShadow: true }).userData.float = R() * 6; break;
      case 'spike': this.add(g, cone(0.06, 0.34, 5), 0x2a1a24, x, 0.17, z, { rot: [(R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4], mat: { flat: true } }); this.add(g, cone(0.04, 0.2, 5), 0x3a2430, x + 0.1, 0.1, z + 0.05, { rot: [(R() - 0.5) * 0.5, 0, (R() - 0.5) * 0.5], mat: { flat: true } }); break;
      case 'ember': this.add(g, dod(0.09), 0x2a1a1a, x, 0.05, z, { rot: [R() * 3, R() * 3, 0], mat: { flat: true } }); this.add(g, dod(0.05), 0xff7a20, x + 0.07, 0.04, z + 0.05, { mat: this.glow(0xff5a10, 1.8), noShadow: true }).userData.pulse = true; break;
      case 'chain': for (let i = 0; i < 4; i++) this.add(g, torus(0.035, 0.012), 0x3a3238, x + i * 0.06, 0.02, z + Math.sin(i) * 0.03, { rot: [1.5708, 0, i % 2 ? 0.8 : 0], noShadow: true }); break;
      default: break;
    }
  }

  decor(q, r) {
    const R = this.rnd(q + 31, r - 17); const roll = R();
    if (roll > 0.62) return null;
    const g = new THREE.Group(); const list = this.theme.decor;
    const n = roll < 0.2 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, d = 0.55 + R() * 0.2;
      this.decorItem(g, R, list[Math.floor(R() * list.length)], Math.cos(a) * d, Math.sin(a) * d * 0.9);
    }
    return g;
  }
}
