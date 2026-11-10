// Hex Engine — axial coordinates (q, r), pointy-top layout.
// Directions are ordered E, NE, NW, W, SW, SE (index 0..5). With the camera looking
// toward -z, NE/NW face away from the viewer and SW/SE face toward the viewer.

export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const DIR_NAMES = ['E', 'NE', 'NW', 'W', 'SW', 'SE'];
export const HEX_SIZE = 1; // outer radius in world units
const SQRT3 = Math.sqrt(3);

export const key = (q, r) => `${q},${r}`;
export const parseKey = (k) => { const [q, r] = k.split(',').map(Number); return { q, r }; };
export const hexEq = (a, b) => a.q === b.q && a.r === b.r;

export function distance(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}
export const add = (a, b) => ({ q: a.q + b.q, r: a.r + b.r });
export const neighbor = (h, d) => ({ q: h.q + DIRS[d][0], r: h.r + DIRS[d][1] });
export const neighbors = (h) => DIRS.map(([dq, dr]) => ({ q: h.q + dq, r: h.r + dr }));

export function toWorld(q, r, size = HEX_SIZE) {
  return { x: size * SQRT3 * (q + r / 2), z: size * 1.5 * r };
}
export function fromWorld(x, z, size = HEX_SIZE) {
  const q = (SQRT3 / 3 * x - 1 / 3 * z) / size;
  const r = (2 / 3 * z) / size;
  return round({ q, r });
}
export function round(h) {
  let x = h.q, z = h.r, y = -x - z;
  let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
  const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  return { q: rx + 0, r: rz + 0 };
}

export function ring(center, radius) {
  if (radius === 0) return [{ ...center }];
  const out = [];
  let h = { q: center.q + DIRS[4][0] * radius, r: center.r + DIRS[4][1] * radius };
  for (let d = 0; d < 6; d++) for (let i = 0; i < radius; i++) { out.push(h); h = neighbor(h, d); }
  return out;
}
export function spiral(center, radius) {
  const out = [];
  for (let k = 0; k <= radius; k++) out.push(...ring(center, k));
  return out;
}

export function lineDraw(a, b) {
  const n = distance(a, b);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    // nudge to avoid ambiguous edge cases
    out.push(round({ q: a.q + (b.q - a.q) * t + 1e-6, r: a.r + (b.r - a.r) * t + 1e-6 }));
  }
  return out;
}

// Direction index (0..5) from a to b, chosen by angle in world space.
export function directionTo(a, b) {
  const pa = toWorld(a.q, a.r), pb = toWorld(b.q, b.r);
  const ang = Math.atan2(-(pb.z - pa.z), pb.x - pa.x); // screen-up is +angle
  let deg = (ang * 180) / Math.PI; if (deg < 0) deg += 360;
  // E=0deg, NE=60, NW=120, W=180, SW=240, SE=300
  return Math.round(deg / 60) % 6;
}

// Straight line of `len` hexes from origin heading in direction d (excludes origin)
export function lineInDir(origin, d, len) {
  const out = []; let h = origin;
  for (let i = 0; i < len; i++) { h = neighbor(h, d); out.push(h); }
  return out;
}

// Cone: widening wedge in direction d
export function cone(origin, d, len) {
  const out = [];
  for (const h of spiral(origin, len)) {
    if (hexEq(h, origin)) continue;
    const dist = distance(origin, h);
    // angle test using world vectors
    const po = toWorld(origin.q, origin.r), ph = toWorld(h.q, h.r);
    const ang = Math.atan2(-(ph.z - po.z), ph.x - po.x);
    const dirAng = (d * 60 * Math.PI) / 180;
    let diff = Math.abs(ang - dirAng); if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff <= (Math.PI / 6) + 0.05 + (dist === 1 ? 0.0 : 0.35 / dist)) out.push(h);
  }
  return out;
}

// Dijkstra reachable set. cost(h) returns move cost (Infinity if impassable).
export function reachable(start, maxCost, cost) {
  const best = new Map([[key(start.q, start.r), 0]]);
  const prev = new Map();
  const frontier = [{ h: start, c: 0 }];
  while (frontier.length) {
    frontier.sort((a, b) => a.c - b.c);
    const { h, c } = frontier.shift();
    if (c > (best.get(key(h.q, h.r)) ?? Infinity)) continue;
    for (const n of neighbors(h)) {
      const step = cost(n);
      if (!isFinite(step)) continue;
      const nc = c + step;
      if (nc > maxCost) continue;
      const k = key(n.q, n.r);
      if (nc < (best.get(k) ?? Infinity)) {
        best.set(k, nc); prev.set(k, h); frontier.push({ h: n, c: nc });
      }
    }
  }
  return { costs: best, prev };
}

export function pathFromPrev(prev, start, goal) {
  const path = [goal];
  let k = key(goal.q, goal.r);
  while (prev.has(k)) {
    const p = prev.get(k);
    if (hexEq(p, start)) break;
    path.unshift(p); k = key(p.q, p.r);
  }
  return path; // excludes start
}

// A* pathfinding. Returns array of hexes (excluding start) or null.
export function findPath(start, goal, cost, { maxNodes = 4000, allowGoalBlocked = false } = {}) {
  const sk = key(start.q, start.r), gk = key(goal.q, goal.r);
  const open = [{ h: start, f: distance(start, goal), g: 0 }];
  const g = new Map([[sk, 0]]);
  const prev = new Map();
  let n = 0;
  while (open.length && n++ < maxNodes) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.h.q, cur.h.r);
    if (ck === gk) {
      const path = []; let k = gk; let h = cur.h;
      while (k !== sk) { path.unshift(h); h = prev.get(k); k = key(h.q, h.r); }
      return path;
    }
    if (cur.g > (g.get(ck) ?? Infinity)) continue;
    for (const nb of neighbors(cur.h)) {
      const nk = key(nb.q, nb.r);
      let step = cost(nb);
      if (!isFinite(step)) { if (allowGoalBlocked && nk === gk) step = 1; else continue; }
      const ng = cur.g + step;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng); prev.set(nk, cur.h);
        open.push({ h: nb, g: ng, f: ng + distance(nb, goal) });
      }
    }
  }
  return null;
}

// Line of sight: no intermediate hex blocks (endpoints excluded)
export function hasLOS(a, b, blocks) {
  const line = lineDraw(a, b);
  for (let i = 1; i < line.length - 1; i++) if (blocks(line[i])) return false;
  // Check the opposite nudge too so diagonals along hex edges are fair
  return true;
}
