// Monsters that share a body (four-legged beasts, golems, floating spirits) each get a shape of their own here, so
// that no two of them are the same figure in another colour. A monster's look names its `kind`; the painters in
// sprites.js hand over to these. Everything is painted by code, once, into the monster's sprite sheet.
// Coordinates: the monster stands on y = 0 and faces right (+x) in the side view; up is negative y.

let H; // the drawing helpers of sprites.js (path, ellipse, rrect, grad, rgrad, glowCircle, shade, OUT)
export function useHelpers(h) { H = h; }

const line = (ctx, pts, color, w) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); H.path(ctx, null, color, w); };
const poly = (ctx, pts, fill, stroke = H.OUT, lw = 2) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); H.path(ctx, fill, stroke, lw); };
// a stroke with an ink outline: the outline first, then the colour on top
const limb = (ctx, draw, color, w) => { ctx.beginPath(); draw(); H.path(ctx, null, H.OUT, w + 4); ctx.beginPath(); draw(); H.path(ctx, null, color, w); };
const eye = (ctx, x, y, r, color, glow = 0.7) => { H.ellipse(ctx, x, y, r, r * 1.1, color, null); H.glowCircle(ctx, x, y, r * 2.4, color, glow); };

// ───────────────────────── four-legged beasts ─────────────────────────
// Each kind: the body (rx, ry), the legs (leg: length, lw: width), and what it has on it.
const BEAST = {
  // Sand Tyrant: a great lizard, low and long, a sail down its back and a frill behind its head
  lizard: { rx: 32, ry: 12, leg: 14, lw: 9, splay: true },
  // Rime Behemoth: a mammoth on pillars of legs, shaggy, a trunk and two long tusks
  mammoth: { rx: 33, ry: 23, leg: 24, lw: 14 },
  // Astral Lynx: a slender cat with tufted ears and a long curling tail
  cat: { rx: 27, ry: 11, leg: 25, lw: 6 },
  // Abyss Hound: a lean hound with a spiked collar, three eyes and jaws that never close
  hound: { rx: 30, ry: 14, leg: 25, lw: 8 },
  // Steam Hound: a dog of riveted plates with pipes on its back that let off steam
  mech: { rx: 29, ry: 14, leg: 23, lw: 8, box: true },
  // Rift Stalker: tall, thin legs, an arched back of long spines and a tail that ends in a blade
  stalker: { rx: 23, ry: 12, leg: 36, lw: 5 },
};
export const hasBeastKind = (L) => !!BEAST[L.kind];

export function beast(ctx, L, view, p, f, anim) {
  const K = BEAST[L.kind]; const cast = anim === 'cast', cs = Math.sin(p.t || 0);
  ctx.translate(p.dx, p.bob * 0.6); ctx.rotate(p.lean * 0.5);
  if (cast) { ctx.translate(Math.cos((p.t || 0) * 2) * 1.3, 0); ctx.scale(1.05, 0.92 + cs * 0.02); }
  const by = -(K.leg + K.ry * 0.55); // the middle of the body
  const body = H.grad(ctx, by - K.ry, by + K.ry, H.shade(L.c1, 0.2), L.c2), legC = H.shade(L.c2, -0.1);
  const bite = (anim === 'attack' && f >= 2) || cast;
  const legAt = (x, a, c) => { ctx.save(); ctx.translate(x, by + K.ry * 0.35); ctx.rotate(a * 0.7 + (K.splay ? 0.25 * Math.sign(x || 1) : 0)); const n = -(by + K.ry * 0.35);
    if (L.kind === 'mech') { H.rrect(ctx, -K.lw / 2, 0, K.lw, n * 0.5, 2, c); H.ellipse(ctx, 0, n * 0.5, K.lw * 0.45, K.lw * 0.45, '#8a8a90', H.OUT, 1.5); H.rrect(ctx, -K.lw / 2 + 1, n * 0.5, K.lw - 2, n * 0.5, 2, c); }
    else H.rrect(ctx, -K.lw / 2, 0, K.lw, n + 1, K.lw * 0.4, c);
    H.ellipse(ctx, 1.5, n, K.lw * 0.65, 3, '#2a1a10'); ctx.restore(); };
  const torso = (x, rx, ry) => { if (K.box) H.rrect(ctx, x - rx, by - ry, rx * 2, ry * 2, 7, body); else H.ellipse(ctx, x, by, rx, ry, body); };
  if (view === 'side') {
    tail(ctx, L, K, by, p, f, 'side');
    [[-K.rx * 0.55, p.leg], [K.rx * 0.55, -p.leg]].forEach(([x, a]) => legAt(x - 4, a, H.shade(legC, -0.2)));
    torso(0, K.rx, K.ry);
    back(ctx, L, K, by, 'side', cast, cs, f);
    [[-K.rx * 0.55, -p.leg], [K.rx * 0.55, p.leg]].forEach(([x, a]) => legAt(x, a, legC));
    ctx.save(); ctx.translate(K.rx * 0.88, by - K.ry * 0.55 + (anim === 'attack' ? 5 : 0)); if (anim === 'attack' && f === 2) ctx.rotate(0.25);
    headSide(ctx, L, K, bite, cast, cs, f); ctx.restore();
  } else {
    const front = view === 'front';
    if (!front) tail(ctx, L, K, by, p, f, 'back');
    [-1, 1].forEach((s, i) => { const lift = (i ? 1 : -1) * p.leg * 5; ctx.save(); ctx.translate(0, -Math.max(0, lift)); legAt(s * K.rx * 0.36, 0, legC); ctx.restore(); });
    torso(0, K.rx * 0.62, K.ry * 1.08);
    back(ctx, L, K, by, front ? 'front' : 'back', cast, cs, f);
    ctx.save(); ctx.translate(0, by - K.ry * 0.85); headFront(ctx, L, K, front, bite, cast, cs, f); ctx.restore();
  }
  if (L.stars) for (let i = 0; i < 6; i++) H.glowCircle(ctx, -20 + ((i * 37) % 40), by - 4 + ((i * 23) % 14) - 8, 4, '#ffffff', 0.9);
  if (p.glow) H.glowCircle(ctx, 0, by, 30 * p.glow, L.accent || L.c1, 0.5);
}

function tail(ctx, L, K, by, p, f, view) {
  const sway = Math.sin(p.t || 0) * 4, x0 = view === 'side' ? -K.rx * 0.92 : 0, y0 = by - (view === 'side' ? 2 : 4);
  switch (L.kind) {
    case 'lizard': // thick at the root, down to a point on the ground behind
      if (view === 'side') poly(ctx, [[x0 + 6, y0 - 9], [x0 - 20, -8 + sway * 0.3], [x0 - 30, -3], [x0 - 16, -2], [x0 + 6, y0 + 9]], H.grad(ctx, y0 - 9, 0, H.shade(L.c1, 0.1), L.c2));
      else poly(ctx, [[-8, y0], [sway, y0 - 26], [8, y0]], L.c2); break;
    case 'mammoth': limb(ctx, () => { ctx.moveTo(x0, y0 - 6); ctx.quadraticCurveTo(x0 - 8, y0, x0 - 6, y0 + 14); }, L.c2, 3); break;
    case 'cat': limb(ctx, () => { ctx.moveTo(x0, y0); if (view === 'side') ctx.bezierCurveTo(x0 - 26, y0 + 4, x0 - 30, y0 - 30 + sway, x0 - 14, y0 - 36); else ctx.bezierCurveTo(14, y0 - 14, -14 + sway, y0 - 30, 6, y0 - 44); }, L.c1, 4.5); break;
    case 'hound': limb(ctx, () => { ctx.moveTo(x0, y0); if (view === 'side') ctx.quadraticCurveTo(x0 - 24, y0 - 4, x0 - 34, y0 - 18 + sway); else ctx.quadraticCurveTo(10 + sway, y0 - 20, 2, y0 - 34); }, L.c1, 3.5);
      { const tx = view === 'side' ? x0 - 34 : 2, ty = view === 'side' ? y0 - 18 + sway : y0 - 34; poly(ctx, [[tx - 4, ty + 2], [tx - 3, ty - 9], [tx + 4, ty + 1]], L.accent); } break;
    case 'mech': H.rrect(ctx, x0 - 16, y0 - 4, 16, 5, 2, '#8a8a90'); H.ellipse(ctx, x0 - 17, y0 - 1.5, 3, 3, L.accent, H.OUT, 1.5); break;
    case 'stalker': { // segments rising over the back, a curved blade at the end
      const pts = view === 'side' ? [[x0, y0], [x0 - 14, y0 - 12], [x0 - 14, y0 - 28], [x0 - 4, y0 - 38 + sway * 0.5]] : [[0, y0], [4, y0 - 16], [2, y0 - 32], [0, y0 - 44]];
      pts.forEach(([x, y], i) => H.ellipse(ctx, x, y, 6 - i, 5 - i * 0.8, H.shade(L.c1, -0.05 * i)));
      const [bx, bb] = pts[3]; ctx.beginPath(); ctx.moveTo(bx - 2, bb); ctx.quadraticCurveTo(bx + 18, bb - 10, bx + 22, bb + 6); ctx.quadraticCurveTo(bx + 12, bb - 2, bx + 2, bb + 4); ctx.closePath(); H.path(ctx, H.grad(ctx, bb - 10, bb + 6, '#f4f0ff', L.accent)); break;
    }
  }
}

function back(ctx, L, K, by, view, cast, cs, f) {
  const top = by - K.ry, up = cast ? 8 + cs * 2 : 0;
  switch (L.kind) {
    case 'lizard': if (view !== 'front') for (let i = 0; i < 6; i++) { const x = view === 'side' ? -26 + i * 10 : (i - 2.5) * 5, h = 9 + Math.sin(i / 5 * Math.PI) * 12 + up; poly(ctx, [[x - 5, top + 3], [x - 1, top - h], [x + 5, top + 3]], H.grad(ctx, top - h, top, H.shade(L.accent, 0.3), L.accent), H.OUT, 1.5); } break;
    case 'mammoth': { // a hump of fur, and fur hanging along the belly
      if (view === 'side') H.ellipse(ctx, -6, top + 4, 20, 10, H.shade(L.c1, 0.15), H.OUT, 2);
      ctx.strokeStyle = H.shade(L.c2, -0.25); ctx.lineWidth = 2.4; const w = view === 'side' ? K.rx : K.rx * 0.6;
      for (let i = 0; i <= 10; i++) { const x = -w * 0.85 + (i / 10) * w * 1.7; ctx.beginPath(); ctx.moveTo(x, by + K.ry * 0.45); ctx.lineTo(x + 1.5, by + K.ry * 0.9 + (i % 3) * 3); ctx.stroke(); }
      if (L.horns && view === 'back') [-1, 1].forEach((s) => H.ellipse(ctx, s * 15, top + 2, 6, 4, '#e8dcc0'));
      break;
    }
    case 'cat': // a few stripes
      ctx.strokeStyle = H.shade(L.c2, -0.3); ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const x = (view === 'side' ? -14 : -9) + i * (view === 'side' ? 9 : 6); ctx.beginPath(); ctx.moveTo(x, top + 2); ctx.lineTo(x + 3, top + 9); ctx.stroke(); } break;
    case 'hound': if (view !== 'front') for (let i = 0; i < 5; i++) { const x = view === 'side' ? -20 + i * 8 : (i - 2) * 6; poly(ctx, [[x - 3, top + 3], [x + 2, top - 10 - (i % 2) * 5 - up], [x + 4, top + 3]], L.accent, H.OUT, 1.4); } break;
    case 'mech': {
      ctx.fillStyle = H.shade(L.c2, -0.35); const w = view === 'side' ? K.rx : K.rx * 0.6;
      for (let i = 0; i < 5; i++) { const x = -w + 6 + i * ((w * 2 - 12) / 4); ctx.beginPath(); ctx.arc(x, by - K.ry + 5, 1.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x, by + K.ry - 5, 1.6, 0, 7); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-w + 4, by); ctx.lineTo(w - 4, by); H.path(ctx, null, H.shade(L.c2, -0.3), 1.5);
      if (view !== 'front') [-8, 6].forEach((x, i) => { const px = view === 'side' ? x : x * 0.8; H.rrect(ctx, px - 3.5, top - 14 - i * 4, 7, 16 + i * 4, 2, '#b08a50'); H.rrect(ctx, px - 4.5, top - 16 - i * 4, 9, 4, 1.5, '#7a5a30');
        ctx.save(); ctx.globalAlpha = 0.55; for (let k = 0; k < 3; k++) H.ellipse(ctx, px + k * 3 - 2, top - 22 - i * 4 - k * 6 - ((f * 3) % 6), 4 + k * 1.5, 3.5 + k, '#f4f4f4', null); ctx.restore(); });
      break;
    }
    case 'stalker': if (view !== 'front') for (let i = 0; i < 5; i++) { const x = view === 'side' ? -16 + i * 8 : (i - 2) * 5; line(ctx, [[x, top + 3], [x - 3, top - 16 - (i % 2) * 6 - up]], H.OUT, 4); line(ctx, [[x, top + 3], [x - 3, top - 16 - (i % 2) * 6 - up]], L.accent, 2); } break;
  }
}

function headSide(ctx, L, K, bite, cast, cs, f) {
  const c = H.rgrad(ctx, 0, -2, 16, H.shade(L.c1, 0.3), L.c1), glow = cast ? 0.95 : 0.6;
  switch (L.kind) {
    case 'lizard': {
      for (let i = 0; i < 5; i++) { const a = -2.0 + i * 0.32; poly(ctx, [[-2, -2], [-2 + Math.cos(a) * 22, -2 + Math.sin(a) * 22], [-2 + Math.cos(a + 0.2) * 14, -2 + Math.sin(a + 0.2) * 14]], H.shade(L.accent, 0.1), H.OUT, 1.4); } // the frill
      ctx.save(); ctx.translate(4, 4); ctx.rotate(bite ? 0.35 : 0.05); H.rrect(ctx, 0, -2, 24, 6, 3, H.shade(L.c2, 0.1)); ctx.restore(); // the lower jaw
      H.ellipse(ctx, 10, -1, 20, 8, c);
      if (bite) { ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(14 + i * 4, 6); ctx.lineTo(16 + i * 4, 11); ctx.lineTo(18 + i * 4, 6); ctx.fill(); } }
      if (L.horns) poly(ctx, [[22, -6], [27, -14], [26, -5]], '#e8dcc0', H.OUT, 1.4);
      H.ellipse(ctx, 6, -4, 3.4, 2, L.eye, null); H.glowCircle(ctx, 6, -4, cast ? 13 + cs * 3 : 7, L.eye, glow); break;
    }
    case 'mammoth': {
      H.ellipse(ctx, -8, 2, 9, 13, H.shade(L.c2, 0.05)); // the ear
      H.ellipse(ctx, 2, -2, 17, 17, c);
      limb(ctx, () => { ctx.moveTo(13, 4); ctx.quadraticCurveTo(22 + (bite ? 10 : 0), 18, 16 + (bite ? 14 : 0), bite ? 6 : 34); ctx.quadraticCurveTo(14 + (bite ? 14 : 0), bite ? 2 : 40, 20 + (bite ? 14 : 0), bite ? -2 : 40); }, L.c1, 7); // the trunk
      if (L.horns) limb(ctx, () => { ctx.moveTo(10, 10); ctx.quadraticCurveTo(30, 22, 36, 2); }, '#f2ead6', 4.5); // a tusk
      H.ellipse(ctx, 9, -6, 2.6, 2.6, L.eye, null); H.glowCircle(ctx, 9, -6, cast ? 12 + cs * 3 : 6, L.eye, glow); break;
    }
    case 'cat': {
      [[-6, -6], [3, -8]].forEach(([x, y], i) => { poly(ctx, [[x - 4, y + 2], [x + 1, y - 15], [x + 6, y + 2]], i ? L.c1 : H.shade(L.c1, -0.15), H.OUT, 1.8); line(ctx, [[x + 1, y - 15], [x + 1, y - 21]], H.OUT, 1.6); }); // ears with tufts
      H.ellipse(ctx, 0, 0, 12, 11, c); H.ellipse(ctx, 10, 3, 7, 5, H.shade(L.c1, 0.35));
      ellipseNose(ctx, 16, 1.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.9; for (const d of [-2, 1, 4]) { ctx.beginPath(); ctx.moveTo(12, 4); ctx.lineTo(26, 3 + d); ctx.stroke(); }
      if (bite) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(11, 7); ctx.lineTo(12.5, 12); ctx.lineTo(14, 7); ctx.fill(); }
      H.ellipse(ctx, 5, -3, 3.4, 2.2, L.eye, null, 0, -0.2); H.glowCircle(ctx, 5, -3, cast ? 12 + cs * 3 : 6, L.eye, glow); break;
    }
    case 'hound': {
      [-8, -2, 4].forEach((x, i) => poly(ctx, [[x - 3, -4], [x + 1, -13 - i], [x + 4, -4]], L.accent, H.OUT, 1.3)); // the spiked collar
      ctx.save(); ctx.translate(2, 5); ctx.rotate(bite ? 0.45 : 0.22); H.rrect(ctx, 0, -2, 22, 6, 2, H.shade(L.c2, 0.05)); ctx.restore(); // the lower jaw, always hanging open
      poly(ctx, [[-8, -10], [10, -10], [26, -2], [24, 4], [-6, 6]], c);
      ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 4, 4); ctx.lineTo(12 + i * 4, 9); ctx.lineTo(14 + i * 4, 4); ctx.fill(); }
      if (L.horns) { ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-8, -24, 4, -28); ctx.quadraticCurveTo(-1, -18, 3, -9); H.path(ctx, '#e8dcc0'); }
      [[2, -5], [8, -6], [14, -4]].forEach(([x, y]) => eye(ctx, x, y, 2, L.eye, glow)); break;
    }
    case 'mech': {
      line(ctx, [[-4, -10], [-6, -22]], '#8a8a90', 2.4); H.ellipse(ctx, -6, -23, 2.4, 2.4, L.accent, H.OUT, 1.2); // an aerial
      ctx.save(); ctx.translate(2, 4); ctx.rotate(bite ? 0.35 : 0); H.rrect(ctx, 0, -1, 20, 6, 2, H.shade(L.c2, 0.1)); ctx.restore();
      H.rrect(ctx, -9, -11, 30, 16, 5, H.grad(ctx, -11, 5, H.shade(L.c1, 0.3), L.c1));
      H.rrect(ctx, 2, -7, 15, 4.5, 2, L.eye, H.OUT, 1.2); H.glowCircle(ctx, 9, -5, cast ? 14 + cs * 3 : 7, L.eye, glow);
      ctx.fillStyle = H.shade(L.c2, -0.35); for (const x of [-5, 17]) { ctx.beginPath(); ctx.arc(x, 1, 1.5, 0, 7); ctx.fill(); } break;
    }
    case 'stalker': {
      if (L.horns) [[-2, -4], [4, -5]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 12, y - 14, x + 24, y - 10); ctx.quadraticCurveTo(x + 12, y - 9, x + 4, y + 2); H.path(ctx, '#d8d0e8'); });
      H.ellipse(ctx, 8, 0, 15, 7, c);
      if (bite) { [[12, 4], [18, 4]].forEach(([x, y]) => poly(ctx, [[x, y], [x + 8, y + 8], [x + 2, y + 2]], '#e8e0f0', H.OUT, 1.2)); }
      [[6, -3], [11, -3.5], [16, -2.5]].forEach(([x, y]) => eye(ctx, x, y, 1.8, L.eye, glow)); break;
    }
  }
}
const ellipseNose = (ctx, x, y) => H.ellipse(ctx, x, y, 2.2, 1.6, '#2a1a1a', null);

function headFront(ctx, L, K, front, bite, cast, cs, f) {
  const c = H.rgrad(ctx, 0, -4, 18, H.shade(L.c1, 0.3), L.c1), glow = cast ? 0.95 : 0.6;
  if (!front) { // seen from behind: the back of the head and what sticks out of it
    if (L.kind === 'lizard') for (let i = 0; i < 7; i++) { const a = Math.PI + 0.25 + i * 0.44; poly(ctx, [[0, 0], [Math.cos(a) * 24, Math.sin(a) * 18], [Math.cos(a + 0.22) * 15, Math.sin(a + 0.22) * 12]], L.accent, H.OUT, 1.3); }
    if (L.kind === 'mammoth') [-1, 1].forEach((s) => H.ellipse(ctx, s * 15, 2, 9, 13, H.shade(L.c2, 0.05)));
    if (L.kind === 'cat') [-1, 1].forEach((s) => poly(ctx, [[s * 4, -6], [s * 9, -22], [s * 13, -4]], L.c1, H.OUT, 1.8));
    if (L.kind === 'mech') line(ctx, [[0, -10], [-2, -22]], '#8a8a90', 2.4);
    if ((L.kind === 'hound' || L.kind === 'stalker') && L.horns) [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 6, -6); ctx.quadraticCurveTo(s * 18, -14, s * 16, -26); ctx.quadraticCurveTo(s * 12, -14, s * 2, -8); H.path(ctx, '#e8dcc0'); });
    if (K.box) H.rrect(ctx, -12, -10, 24, 18, 5, L.c1); else H.ellipse(ctx, 0, 0, L.kind === 'mammoth' ? 16 : 13, L.kind === 'lizard' ? 9 : 11, L.c1);
    return;
  }
  switch (L.kind) {
    case 'lizard':
      for (let i = 0; i < 7; i++) { const a = Math.PI + 0.25 + i * 0.44; poly(ctx, [[0, -2], [Math.cos(a) * 28, -2 + Math.sin(a) * 22], [Math.cos(a + 0.22) * 18, -2 + Math.sin(a + 0.22) * 14]], H.shade(L.accent, 0.1), H.OUT, 1.4); }
      H.ellipse(ctx, 0, 2, 18, 11, c); H.rrect(ctx, -12, 6 + (bite ? 3 : 0), 24, 6, 3, H.shade(L.c2, 0.1));
      if (bite) { ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-9 + i * 4.5, 8); ctx.lineTo(-7 + i * 4.5, 12); ctx.lineTo(-5 + i * 4.5, 8); ctx.fill(); } }
      [-12, 12].forEach((x) => { H.ellipse(ctx, x, -1, 3.4, 2, L.eye, null); H.glowCircle(ctx, x, -1, 7, L.eye, glow); });
      [-3, 3].forEach((x) => H.ellipse(ctx, x, 6, 1.2, 0.9, '#2a1a1a', null)); break;
    case 'mammoth':
      [-1, 1].forEach((s) => H.ellipse(ctx, s * 19, 2, 10, 15, H.shade(L.c2, 0.05)));
      H.ellipse(ctx, 0, 0, 18, 17, c);
      if (L.horns) [-1, 1].forEach((s) => limb(ctx, () => { ctx.moveTo(s * 7, 10); ctx.quadraticCurveTo(s * 20, 24, s * 24, 6); }, '#f2ead6', 4.5));
      limb(ctx, () => { ctx.moveTo(0, 6); ctx.quadraticCurveTo(bite ? 8 : 2, bite ? -6 : 24, bite ? 4 : -2, bite ? -16 : 34); }, L.c1, 7);
      [-8, 8].forEach((x) => { H.ellipse(ctx, x, -4, 2.6, 2.6, L.eye, null); H.glowCircle(ctx, x, -4, cast ? 12 : 6, L.eye, glow); }); break;
    case 'cat':
      [-1, 1].forEach((s) => { poly(ctx, [[s * 4, -6], [s * 9, -24], [s * 14, -4]], L.c1, H.OUT, 1.8); line(ctx, [[s * 9, -24], [s * 9, -30]], H.OUT, 1.6); });
      H.ellipse(ctx, 0, 0, 14, 12, c); H.ellipse(ctx, 0, 5, 7, 4.5, H.shade(L.c1, 0.35)); ellipseNose(ctx, 0, 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.9; [-1, 1].forEach((s) => { for (const d of [-2, 1, 4]) { ctx.beginPath(); ctx.moveTo(s * 5, 5); ctx.lineTo(s * 20, 4 + d); ctx.stroke(); } });
      [-6, 6].forEach((x) => { H.ellipse(ctx, x, -3, 3.4, 2.2, L.eye, null, 0, x > 0 ? 0.2 : -0.2); H.glowCircle(ctx, x, -3, cast ? 12 : 6, L.eye, glow); }); break;
    case 'hound':
      for (let i = -3; i <= 3; i++) poly(ctx, [[i * 5 - 2.5, 10], [i * 5, 16], [i * 5 + 2.5, 10]], L.accent, H.OUT, 1.2); // the collar
      if (L.horns) [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 8, -8); ctx.quadraticCurveTo(s * 22, -14, s * 20, -30); ctx.quadraticCurveTo(s * 16, -16, s * 4, -10); H.path(ctx, '#e8dcc0'); });
      H.ellipse(ctx, 0, 0, 15, 13, c); H.rrect(ctx, -9, 4, 18, 9 + (bite ? 4 : 2), 4, '#2a0a10');
      ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-7 + i * 4.5, 4); ctx.lineTo(-5 + i * 4.5, 8); ctx.lineTo(-3 + i * 4.5, 4); ctx.fill(); }
      [[-6, -2], [6, -2], [0, -8]].forEach(([x, y]) => eye(ctx, x, y, 2.2, L.eye, glow)); break;
    case 'mech':
      [-1, 1].forEach((s) => line(ctx, [[s * 7, -9], [s * 10, -22]], '#8a8a90', 2.2));
      H.rrect(ctx, -13, -10, 26, 22, 5, H.grad(ctx, -10, 12, H.shade(L.c1, 0.3), L.c1));
      H.rrect(ctx, -9, -5, 18, 5, 2, L.eye, H.OUT, 1.2); H.glowCircle(ctx, 0, -3, cast ? 16 : 8, L.eye, glow);
      H.rrect(ctx, -7, 4, 14, 5 + (bite ? 3 : 0), 2, H.shade(L.c2, -0.1)); break;
    case 'stalker':
      if (L.horns) [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 5, 2); ctx.quadraticCurveTo(s * 16, 10, s * 12, 22); ctx.quadraticCurveTo(s * 10, 12, s * 2, 6); H.path(ctx, '#d8d0e8'); }); // mandibles
      H.ellipse(ctx, 0, 0, 10, 12, c);
      [[0, -6], [-4, -1], [4, -1]].forEach(([x, y]) => eye(ctx, x, y, 2, L.eye, glow)); break;
  }
}

// ───────────────────────── golems ─────────────────────────
// The golem's own painter draws the legs, the torso and the arms; a kind changes the torso and the head and adds
// what grows on it. Called twice: 'body' (after the torso, before the head) and 'head' (in place of the plain head).
export const GOLEM_KINDS = new Set(['ogre', 'ice', 'skull', 'sentinel', 'fungus', 'scrap', 'obsidian', 'pyre', 'warden']);
export function golemTorso(ctx, L, body) {
  switch (L.kind) {
    case 'ogre': H.ellipse(ctx, 0, -56, 31, 30, body); H.ellipse(ctx, 0, -46, 20, 17, H.shade(L.c1, 0.2), null); return true; // a great round belly
    case 'sentinel': poly(ctx, [[-22, -92], [22, -92], [16, -28], [-16, -28]], body); return true; // tall and narrow
    case 'obsidian': poly(ctx, [[-32, -86], [-12, -94], [14, -90], [34, -84], [26, -52], [22, -28], [-22, -28], [-28, -56]], body); // cut glass
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-12, -94); ctx.lineTo(-4, -60); ctx.lineTo(-22, -28); ctx.moveTo(14, -90); ctx.lineTo(6, -56); ctx.stroke(); return true;
    default: return false;
  }
}
export function golemBody(ctx, L, view, cast, cs, f) {
  const sh = (s) => [s * 28, -86]; // a shoulder
  switch (L.kind) {
    case 'ogre': // thorny vines across the belly
      ctx.strokeStyle = H.shade(L.accent || '#7ac04a', -0.1); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, -70); ctx.quadraticCurveTo(0, -50, 26, -66); ctx.moveTo(-28, -44); ctx.quadraticCurveTo(0, -60, 26, -40); ctx.stroke();
      for (const [x, y] of [[-14, -60], [8, -58], [-6, -50], [16, -48]]) poly(ctx, [[x - 2, y], [x, y - 6], [x + 2, y]], '#e8dcc0', H.OUT, 1); break;
    case 'ice': [-1, 1].forEach((s) => { const [x, y] = sh(s); [[0, 0, 18], [s * 8, 4, 12], [-s * 6, 2, 10]].forEach(([dx, dy, h]) => poly(ctx, [[x + dx - 4, y + dy], [x + dx + s * 3, y + dy - h - (cast ? 4 : 0)], [x + dx + 4, y + dy]], H.grad(ctx, y - h, y, '#ffffff', L.accent), H.OUT, 1.6)); });
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-24, -86); ctx.lineTo(0, -60); ctx.lineTo(24, -86); ctx.moveTo(0, -60); ctx.lineTo(0, -30); ctx.stroke(); break;
    case 'skull': [-1, 1].forEach((s) => { const [x, y] = sh(s); for (let i = 0; i < 3; i++) poly(ctx, [[x - 3 + s * i * 6, y + 2], [x + s * (4 + i * 6), y - 12 + i * 3], [x + 3 + s * i * 6, y + 2]], '#efe6d0', H.OUT, 1.4); }); break;
    case 'sentinel': for (let i = 0; i < 3; i++) { const a = (f / 4) * Math.PI * 2 + i * 2.1, x = Math.cos(a) * 40, y = -64 + Math.sin(a) * 12; poly(ctx, [[x, y - 6], [x + 4, y], [x, y + 6], [x - 4, y]], H.shade(L.accent, 0.3), H.OUT, 1.2); H.glowCircle(ctx, x, y, 9, L.accent, 0.7); }
      ctx.strokeStyle = L.accent; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-10, -80); ctx.lineTo(0, -70); ctx.lineTo(10, -80); ctx.moveTo(0, -70); ctx.lineTo(0, -40); ctx.stroke(); break;
    case 'fungus': [-1, 1].forEach((s) => { const [x, y] = sh(s); [[0, 0, 9], [s * 9, 5, 6]].forEach(([dx, dy, r]) => { H.rrect(ctx, x + dx - 2, y + dy - r, 4, r, 1, '#e8dcc0', H.OUT, 1.2); ctx.beginPath(); ctx.ellipse(x + dx, y + dy - r, r, r * 0.7, 0, Math.PI, 0); H.path(ctx, L.accent, H.OUT, 1.5); }); });
      for (let i = 0; i < 4; i++) H.glowCircle(ctx, -20 + i * 13, -100 - ((i * 11 + f * 7) % 20), 4, L.accent, 0.7); break;
    case 'scrap': { // patches, rivets, a smoking stack on one shoulder
      H.rrect(ctx, -20, -76, 16, 14, 2, H.shade(L.c1, -0.2), H.OUT, 1.5); H.rrect(ctx, 6, -58, 14, 18, 2, '#8a6a4a', H.OUT, 1.5);
      ctx.fillStyle = '#2a2420'; for (const [x, y] of [[-18, -74], [-6, -74], [-18, -64], [-6, -64], [8, -56], [18, -42]]) { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, 7); ctx.fill(); }
      H.rrect(ctx, 14, -112, 9, 26, 2, '#6a6a70'); H.rrect(ctx, 12, -114, 13, 5, 2, '#4a4a50');
      ctx.save(); ctx.globalAlpha = 0.5; for (let k = 0; k < 3; k++) H.ellipse(ctx, 19 + k * 4, -120 - k * 7 - ((f * 3) % 6), 4 + k * 2, 4 + k * 1.5, '#cfcfcf', null); ctx.restore(); break;
    }
    case 'obsidian': [-1, 1].forEach((s) => { const [x, y] = sh(s); [[0, 0, 20], [s * 9, 6, 13]].forEach(([dx, dy, h]) => poly(ctx, [[x + dx - 5, y + dy], [x + dx + s * 5, y + dy - h], [x + dx + 5, y + dy]], H.grad(ctx, y - h, y, '#6a5a7a', '#1a1420'), H.OUT, 1.6)); }); break;
    case 'warden': [-1, 1].forEach((s) => { const [x, y] = sh(s); H.ellipse(ctx, x, y + 2, 14, 10, H.shade(L.c2, -0.1)); for (let i = 0; i < 3; i++) poly(ctx, [[x + s * (i * 7 - 9), y - 4], [x + s * (i * 7 - 6), y - 18], [x + s * (i * 7 - 3), y - 4]], '#3a3030', H.OUT, 1.4); });
      ctx.strokeStyle = '#8a8a90'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(-30, -50); ctx.quadraticCurveTo(0, -30, 30, -50); ctx.stroke(); ctx.setLineDash([]); break;
    case 'pyre': break;
  }
}
// returns true if it drew the head
export function golemHead(ctx, L, view, cast, cs, f) {
  const back = view === 'back', side = view === 'side', eyes = (xs, y, w = 7, h = 4) => { if (back) return; xs.forEach((x) => { H.rrect(ctx, x - w / 2, y - h / 2, w, h, 1, L.eye, null); H.glowCircle(ctx, x, y, 8, L.eye, 0.9); }); };
  const hx = side ? 4 : 0;
  switch (L.kind) {
    case 'ogre': // a small head sunk between the shoulders, tusks up from the jaw
      H.rrect(ctx, -11 + hx, -98, 22, 18, 7, H.grad(ctx, -98, -80, H.shade(L.c1, 0.3), L.c1));
      if (!back) { (side ? [10] : [-5, 5]).forEach((x) => poly(ctx, [[x + hx - 2, -82], [x + hx, -89], [x + hx + 2, -82]], '#f0e8d0', H.OUT, 1)); }
      eyes(side ? [8] : [-5, 5], -92, 5, 3); return true;
    case 'ice': H.rrect(ctx, -14, -106, 28, 20, 5, H.grad(ctx, -106, -86, '#ffffff', L.c1)); [[-8, 14], [0, 20], [8, 14]].forEach(([x, h]) => poly(ctx, [[x - 4, -104], [x, -104 - h - (cast ? 4 : 0)], [x + 4, -104]], H.grad(ctx, -124, -104, '#ffffff', L.accent), H.OUT, 1.5)); eyes(side ? [6] : [-6, 6], -97); return true;
    case 'skull': H.ellipse(ctx, hx, -100, 15, 14, '#efe6d0'); H.rrect(ctx, -9 + hx, -92, 18, 8, 3, '#d8ccb0');
      if (!back) { ctx.fillStyle = '#2a1a1a'; for (let i = -2; i <= 2; i++) ctx.fillRect(hx + i * 3.4 - 0.6, -91, 1.2, 6); (side ? [8] : [-5.5, 5.5]).forEach((x) => { H.ellipse(ctx, x + hx * 0.3, -102, 4, 4.5, '#1a1010', null); H.glowCircle(ctx, x + hx * 0.3, -102, 8, L.eye, 0.9); }); } return true;
    case 'sentinel': // a dome with one eye, a ring of light behind it
      ctx.save(); ctx.globalAlpha = 0.9; H.ellipse(ctx, 0, -100, 19, 19, null, L.accent, 3); ctx.restore(); H.glowCircle(ctx, 0, -100, 24, L.accent, cast ? 0.6 : 0.3);
      ctx.beginPath(); ctx.ellipse(hx, -96, 13, 15, 0, Math.PI, 0); ctx.lineTo(hx + 13, -92); ctx.lineTo(hx - 13, -92); ctx.closePath(); H.path(ctx, H.grad(ctx, -111, -92, H.shade(L.c1, 0.35), L.c1));
      if (!back) { H.ellipse(ctx, hx + (side ? 4 : 0), -100, 4.5, 4.5, L.eye, null); H.glowCircle(ctx, hx + (side ? 4 : 0), -100, cast ? 18 : 11, L.eye, 1); } return true;
    case 'fungus': // a great mushroom cap for a head
      H.rrect(ctx, -10 + hx, -100, 20, 14, 5, '#e8dcc0'); eyes(side ? [7] : [-4.5, 4.5], -93, 4, 3);
      ctx.beginPath(); ctx.ellipse(hx, -100, 30, 20, 0, Math.PI, 0); ctx.quadraticCurveTo(hx, -94, hx - 30, -100); H.path(ctx, H.rgrad(ctx, hx - 6, -112, 30, H.shade(L.accent, 0.35), L.accent));
      [[-16, -106, 4], [2, -114, 5], [16, -104, 3.5], [-4, -103, 3]].forEach(([x, y, r]) => H.ellipse(ctx, x + hx, y, r, r * 0.8, '#f4eede', null)); return true;
    case 'scrap': H.rrect(ctx, -13 + hx, -106, 26, 20, 3, H.grad(ctx, -106, -86, H.shade(L.c1, 0.3), L.c1));
      if (!back) { const ex = side ? [8] : [-5, 6]; H.ellipse(ctx, ex[0] + hx, -97, 5, 5, '#2a2a30', H.OUT, 1.5); H.glowCircle(ctx, ex[0] + hx, -97, 8, L.eye, 0.9); H.ellipse(ctx, ex[0] + hx, -97, 2.4, 2.4, L.eye, null); if (ex[1]) { H.ellipse(ctx, ex[1], -96, 2, 2, L.eye, null); } }
      line(ctx, [[-8 + hx, -106], [-12 + hx, -118]], '#8a8a90', 2); H.ellipse(ctx, -12 + hx, -119, 2, 2, '#ff6040', H.OUT, 1); return true;
    case 'obsidian': poly(ctx, [[-14 + hx, -88], [-12 + hx, -104], [0 + hx, -112], [12 + hx, -104], [14 + hx, -88]], H.grad(ctx, -112, -88, '#5a4a6a', '#1a1420')); eyes(side ? [7] : [-5, 5], -98, 6, 3); return true;
    case 'pyre': { // a crown of fire
      const fl = [[-10, 10], [-4, 15], [3, 17], [9, 13], [14, 9]];
      fl.forEach(([x, h], i) => { const hh = h + Math.sin(f * 1.6 + i) * 2.5 + (cast ? 3 : 0); ctx.beginPath(); ctx.moveTo(x - 5 + hx, -104); ctx.quadraticCurveTo(x - 5 + hx, -104 - hh * 0.6, x + hx, -104 - hh); ctx.quadraticCurveTo(x + 5 + hx, -104 - hh * 0.6, x + 5 + hx, -104); H.path(ctx, H.grad(ctx, -104 - hh, -104, '#fff4a0', '#ff6010'), null); });
      H.glowCircle(ctx, hx, -112, cast ? 30 : 22, '#ff8020', 0.7);
      H.rrect(ctx, -14 + hx, -108, 28, 22, 6, H.grad(ctx, -108, -86, H.shade(L.c1, 0.35), L.c1));
      if (L.horns) [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * 10 + hx, -104); ctx.quadraticCurveTo(s * 26 + hx, -110, s * 24 + hx, -128); ctx.quadraticCurveTo(s * 18 + hx, -112, s * 4 + hx, -106); H.path(ctx, '#2a1a1a'); });
      eyes(side ? [6 + hx] : [-6, 6], -98); return true;
    }
    default: return false;
  }
}

// ───────────────────────── floating spirits ─────────────────────────
export const FLOAT_KINDS = new Set(['sprite', 'wraith', 'flake', 'wail', 'lantern', 'siren', 'seraph']);
export function floating(ctx, L, view, p, f, anim) {
  const hover = Math.sin((f / 4) * Math.PI * 2) * 4, back = view === 'back', side = view === 'side', fx = side ? 5 : 0, atk = anim === 'attack';
  ctx.translate(p.dx, -24 + hover);
  H.glowCircle(ctx, 0, -34, 44, L.glow, 0.45 + p.glow * 0.4);
  const face = (y, r = 1, mouth = 'small') => { if (back) return; (side ? [fx + 4] : [-5 * r, 5 * r]).forEach((x) => { H.ellipse(ctx, x, y, 2.6 * r, 3.6 * r, L.c2, null); H.glowCircle(ctx, x, y, 5, '#ffffff', 0.4); });
    if (mouth === 'small') { ctx.beginPath(); ctx.arc(fx, y + 6 * r, 2.5 * r, 0.2, Math.PI - 0.2); H.path(ctx, null, L.c2, 1.6); } };
  switch (L.kind) {
    case 'sprite': { // a small fairy of the briars: leaf wings, a flower on its head, a curling vine below
      limb(ctx, () => { ctx.moveTo(0, -24); ctx.bezierCurveTo(-10, -10, 12, -4, 2, 8 + hover); }, L.c2, 2.5);
      [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]].forEach(([s, k]) => { if (side && s < 0) return; ctx.save(); ctx.translate(s * 6, -40 + k * 10); ctx.rotate(s * (0.9 + k * 0.8) + p.flap * 0.25 * s); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -10, 24 - Math.abs(k) * 8, 0); ctx.quadraticCurveTo(10, 8, 0, 0); H.path(ctx, H.grad(ctx, -10, 8, H.shade(L.c1, 0.3), L.c1), H.OUT, 1.5); ctx.restore(); });
      H.ellipse(ctx, 0, -36, 12, 13, H.rgrad(ctx, -2, -40, 13, '#ffffff', L.glow));
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; H.ellipse(ctx, Math.cos(a) * 4, -51 + Math.sin(a) * 3, 3.6, 2.6, '#ff9ad0', H.OUT, 1, a); } H.ellipse(ctx, 0, -51, 2, 2, '#ffe060', null);
      face(-36, 0.8); break;
    }
    case 'wraith': { // a hooded cloak with nothing in it but two eyes, its hem turning into blown sand
      ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = L.c1; ctx.lineWidth = 2.4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(Math.sin(f + i) * 3, -6 + i * 4, 6 + i * 4, 0.3 + f * 0.6 + i, 2.6 + f * 0.6 + i); ctx.stroke(); } ctx.restore();
      [-1, 1].forEach((s) => { if (side && s < 0) return; ctx.save(); ctx.translate(s * 13, -38); ctx.rotate(s * (atk ? -0.9 : 0.4)); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(7, 22); ctx.lineTo(2, 18); ctx.lineTo(-1, 23); ctx.lineTo(-6, 18); ctx.closePath(); H.path(ctx, H.shade(L.c2, 0.1), H.OUT, 1.6); ctx.restore(); });
      ctx.beginPath(); ctx.moveTo(-16, -40); ctx.quadraticCurveTo(-8, -72, 4, -70); ctx.quadraticCurveTo(18, -62, 16, -40); ctx.lineTo(18, -12); ctx.lineTo(10, -18); ctx.lineTo(4, -8); ctx.lineTo(-3, -16); ctx.lineTo(-10, -8); ctx.lineTo(-18, -14); ctx.closePath(); H.path(ctx, H.grad(ctx, -70, -8, H.shade(L.c1, 0.1), L.c2));
      if (!back) { H.ellipse(ctx, fx + 1, -50, 9, 10, '#120c08', null); (side ? [fx + 5] : [-3.5, 4.5]).forEach((x) => { H.ellipse(ctx, x, -51, 1.8, 1.8, L.glow, null); H.glowCircle(ctx, x, -51, 6, '#ffb040', 0.9); }); }
      break;
    }
    case 'flake': { // a turning snowflake with a small face in the middle
      ctx.save(); ctx.translate(0, -40); ctx.rotate((f / 4) * Math.PI / 3);
      for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate((i / 6) * Math.PI * 2); line(ctx, [[0, 0], [0, -30]], H.OUT, 6); line(ctx, [[0, 0], [0, -30]], '#ffffff', 3); for (const y of [-14, -22]) { line(ctx, [[0, y], [-7, y - 6]], '#dff4ff', 2.2); line(ctx, [[0, y], [7, y - 6]], '#dff4ff', 2.2); } ctx.restore(); }
      ctx.restore(); H.ellipse(ctx, 0, -40, 11, 11, H.rgrad(ctx, -2, -43, 11, '#ffffff', L.c1)); face(-41, 0.7); break;
    }
    case 'wail': { // a long face with a mouth open in a scream, arms reaching out
      [-1, 1].forEach((s) => { if (side && s < 0) return; limb(ctx, () => { ctx.moveTo(s * 10, -40); ctx.quadraticCurveTo(s * 22 + (side ? 10 : 0), -34, s * 30 + (side ? 14 : 0), atk ? -50 : -24); }, H.shade(L.c1, 0.2), 4); });
      ctx.beginPath(); ctx.moveTo(-15, -40); ctx.quadraticCurveTo(-18, -78, 0, -78); ctx.quadraticCurveTo(18, -78, 15, -40); for (let i = 0; i < 4; i++) { const x = 15 - i * 10; ctx.quadraticCurveTo(x - 3, -10 + Math.sin(f + i) * 5, x - 7.5, -2 - (i % 2) * 10); } ctx.closePath(); ctx.globalAlpha = 0.9; H.path(ctx, H.rgrad(ctx, -4, -58, 30, '#ffffff', L.c1), H.shade(L.c2, -0.3)); ctx.globalAlpha = 1;
      if (!back) { (side ? [fx + 4] : [-5.5, 5.5]).forEach((x) => H.ellipse(ctx, x, -62, 3.4, 5, '#1a1020', null)); H.ellipse(ctx, fx, -44, 5, atk ? 11 : 8, '#1a1020', null); }
      line(ctx, [[-14, -30], [-20, -18], [-16, -8]], '#8a8a90', 2); break;
    }
    case 'lantern': { // a lantern with a face of flame inside the glass
      line(ctx, [[0, -78], [0, -70]], H.OUT, 2); ctx.beginPath(); ctx.arc(0, -82, 5, 0, Math.PI * 2); H.path(ctx, null, '#3a3a40', 2);
      poly(ctx, [[-12, -62], [12, -62], [8, -72], [-8, -72]], '#3a3a44');
      H.rrect(ctx, -12, -62, 24, 30, 3, 'rgba(220,255,240,0.25)', '#3a3a44', 2.4);
      const fl = 6 + Math.sin(f * 1.7) * 1.5; ctx.beginPath(); ctx.moveTo(-7, -36); ctx.quadraticCurveTo(-9, -48, 0, -48 - fl); ctx.quadraticCurveTo(9, -48, 7, -36); ctx.closePath(); H.path(ctx, H.grad(ctx, -58, -36, '#ffffff', L.c1), null); H.glowCircle(ctx, 0, -44, 24, L.glow, 0.9);
      line(ctx, [[-4, -62], [-4, -32]], '#3a3a44', 1.8); line(ctx, [[4, -62], [4, -32]], '#3a3a44', 1.8);
      if (!back) { (side ? [fx] : [-3, 3]).forEach((x) => H.ellipse(ctx, x, -43, 1.4, 2, L.c2, null)); }
      poly(ctx, [[-13, -32], [13, -32], [9, -26], [-9, -26]], '#3a3a44');
      ctx.save(); ctx.globalAlpha = 0.6; for (let i = 0; i < 3; i++) H.ellipse(ctx, Math.sin(f + i) * 4, -18 + i * 6, 4 - i, 3 - i * 0.6, L.c1, null); ctx.restore(); break;
    }
    case 'siren': { // a maiden of mist: long hair blown out behind, a tail that ends in fins
      limb(ctx, () => { ctx.moveTo(0, -30); ctx.bezierCurveTo(8, -14, -10, -6, 2 + hover, 6); }, H.shade(L.c1, 0.1), 7);
      poly(ctx, [[2 + hover, 6], [-10 + hover, 14], [2 + hover, 10], [12 + hover, 16]], H.shade(L.c1, 0.2), H.OUT, 1.5);
      ctx.beginPath(); ctx.moveTo(-8, -46); ctx.bezierCurveTo(-30, -50, -26, -20, -36 + Math.sin(f) * 4, -10); ctx.bezierCurveTo(-20, -24, -18, -40, -6, -40); H.path(ctx, H.shade(L.c2, 0.2), H.OUT, 1.6);
      ctx.beginPath(); ctx.moveTo(-10, -34); ctx.quadraticCurveTo(0, -42, 10, -34); ctx.lineTo(6, -26); ctx.lineTo(-6, -26); ctx.closePath(); H.path(ctx, H.grad(ctx, -42, -26, '#ffffff', L.c1));
      H.ellipse(ctx, 0, -50, 10, 11, H.rgrad(ctx, -2, -53, 11, '#ffffff', L.c1));
      ctx.beginPath(); ctx.moveTo(-11, -52); ctx.quadraticCurveTo(0, -66, 11, -52); ctx.quadraticCurveTo(14, -40, 12, -34); ctx.quadraticCurveTo(6, -46, -2, -58); H.path(ctx, H.shade(L.c2, 0.25), H.OUT, 1.4);
      if (!back) { (side ? [fx + 2] : [-3.5, 3.5]).forEach((x) => H.ellipse(ctx, x, -50, 1.5, 2.2, L.c2, null)); ctx.beginPath(); ctx.arc(fx * 0.6, -45, atk ? 3 : 1.6, 0, Math.PI); H.path(ctx, null, L.c2, 1.2); }
      break;
    }
    case 'seraph': { // two pairs of wings and a ring of light
      [[-0.3, 0], [0.5, 12]].forEach(([r, dy], k) => [-1, 1].forEach((s) => { ctx.save(); ctx.translate(s * 8, -36 + dy); ctx.scale(s * (k ? 0.7 : 1), k ? 0.7 : 1); ctx.rotate(r + p.flap * 0.3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, -30, 40, -16); ctx.quadraticCurveTo(24, -8, 30, 2); ctx.quadraticCurveTo(14, 0, 0, 6); H.path(ctx, 'rgba(255,250,230,0.95)'); ctx.restore(); }));
      ctx.beginPath(); ctx.moveTo(-16, -30); ctx.quadraticCurveTo(-20, -60, 0, -62); ctx.quadraticCurveTo(20, -60, 16, -30); ctx.quadraticCurveTo(8, -14, 0, -6); ctx.quadraticCurveTo(-8, -14, -16, -30); H.path(ctx, H.rgrad(ctx, -4, -46, 28, '#ffffff', L.c1), H.shade(L.c2, -0.3));
      ctx.save(); ctx.translate(0, -70); ctx.scale(1, 0.35); H.ellipse(ctx, 0, 0, 14, 14, null, '#ffe080', 3.5); ctx.restore(); H.glowCircle(ctx, 0, -70, 18, '#ffe080', 0.8);
      face(-44, 0.9); break;
    }
  }
  for (let i = 0; i < 3; i++) H.glowCircle(ctx, Math.sin(f * 1.7 + i * 2) * 26, -40 + Math.cos(f + i * 2) * 24, 4, L.glow, 0.9);
}
