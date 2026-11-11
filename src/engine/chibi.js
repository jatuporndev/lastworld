// Chibi painter for every humanoid figure (heroes and humanoid monsters).
// Big head, small body, large two-tone eyes, hair in locks, cel shading and an outline in each
// shape's own darkened colour. It reads the same `look` fields the data files already use, so a new
// class or monster needs no art — only a look: colours, helm, weapon, offhand, cape, robe, female…
//
// Drawn in a 120 x 150 cell (feet on y = 128, centre x = 60) facing left, then mirrored and placed
// by the caller's frame: front and side views use the three-quarter front drawing, back views have
// their own drawing.

const tone = (col, a) => {
  let r, g, b; const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(col);
  if (m) { r = +m[1]; g = +m[2]; b = +m[3]; } else { const n = parseInt(col.slice(1), 16); r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255; }
  if (a >= 0) { r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; } else { r *= 1 + a; g *= 1 + a; b *= 1 + a; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
};

// closed curve through the midpoints of a control polygon; a point given as [x, y, 1] is a sharp tip
function trace(c, pts) {
  const n = pts.length; const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]); c.beginPath(); c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], m = mid(p, q); if (p[2]) { c.lineTo(p[0], p[1]); c.lineTo(m[0], m[1]); } else c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
  c.closePath();
}
// filled shape with a cel shadow on its far side and foot, an optional highlight, and an outline
function blob(c, pts, color, o = {}) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, dir = o.flip ? -1 : 1;
  trace(c, pts); c.fillStyle = color; c.fill();
  if (o.shade !== 0) {
    c.save(); trace(c, pts); c.clip();
    c.fillStyle = tone(color, o.shade ?? -0.2); c.beginPath();
    c.moveTo(cx + dir * w * (o.cut ?? 0.16), y0 - 2); c.lineTo(cx + dir * (w / 2 + 6), y0 - 2); c.lineTo(cx + dir * (w / 2 + 6), y1 + 4); c.lineTo(cx - dir * w * 0.12, y1 + 4); c.closePath(); c.fill();
    c.fillStyle = tone(color, (o.shade ?? -0.2) * 1.7); c.fillRect(x0 - 2, y1 - h * (o.foot ?? 0.12), w + 4, h);
    if (o.light) { c.fillStyle = tone(color, o.light); c.beginPath(); c.ellipse(cx - dir * w * 0.2, y0 + h * 0.24, w * 0.2, h * 0.1, -0.5 * dir, 0, 7); c.fill(); }
    c.restore();
  }
  if (o.line !== 0) { trace(c, pts); c.strokeStyle = o.lineColor || tone(color, -0.62); c.lineWidth = o.line ?? 1.5; c.lineJoin = 'round'; c.stroke(); }
}
const disc = (c, x, y, rx, ry, color, o) => blob(c, [[x - rx * 1.33, y - ry * 1.33], [x + rx * 1.33, y - ry * 1.33], [x + rx * 1.33, y + ry * 1.33], [x - rx * 1.33, y + ry * 1.33]], color, o);
function glow(c, x, y, r, color, alpha = 0.6) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.globalAlpha = alpha; c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore(); }

const EYES = ['#3a7fd8', '#2fa88a', '#b0662a', '#7a52c8', '#d0682e', '#3aa0c8'];
function palette(L) {
  const armoured = L.helm === 'knight' || L.helm === 'horned';
  let h = 0; for (const ch of (L.hair || L.armor)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    skin: L.skin, hair: L.hair || L.armor2, eye: L.glowEyes || EYES[h % EYES.length], male: !L.female, armoured,
    dress: L.armor, dress2: armoured ? tone(L.armor, 0.35) : tone(L.armor, 0.55), sleeve: tone(L.armor, armoured ? 0.12 : -0.06),
    trim: L.cloth || '#e9c46a', belt: tone(L.armor2, -0.25), sock: L.skeleton ? L.skin : tone(L.armor2, -0.05), boot: L.skeleton ? L.skin : '#4a3426', bootTrim: L.cloth || '#e9c46a',
  };
}

// ── body ──
function legs(c, P, back, p) {
  [-1, 1].forEach((s) => {
    const sw = s * p.leg * 5, lift = Math.max(0, s * p.leg) * 4, x = 60 + s * 5.5 + sw, far = (s > 0) !== back;
    blob(c, [[60 + s * 5.5 - 3.8, 98], [60 + s * 5.5 + 3.8, 98], [x + 3.2, 122 - lift], [x - 3.2, 122 - lift]], far ? tone(P.sock, -0.16) : P.sock, { line: 1.3, shade: 0 });
    blob(c, [[x - 4.6, 117 - lift], [x + 4.6, 117 - lift], [x + 5.4, 127.5 - lift], [x - 5.6, 127.5 - lift]], far ? tone(P.boot, -0.16) : P.boot, { line: 1.3, shade: 0 });
    c.fillStyle = P.bootTrim; c.fillRect(x - 4.2, 117 - lift, 8.4, 1.8);
  });
}
function body(c, L, P, back, p) {
  const long = L.robe || L.gown, wide = L.gown ? 5 : L.bulky ? 3 : 0, sway = p.leg * 2;
  const shape = long ? [[49.5 - wide * 0.4, 79], [70.5 + wide * 0.4, 79], [79 + wide + sway, 114], [70, 122], [60, 120], [50, 122], [41 - wide + sway, 114]]
    : P.male ? [[50 - wide, 79], [70 + wide, 79], [73.5 + wide, 97], [67, 102], [60, 100.5], [53, 102], [46.5 - wide, 97]]
      : [[49.5, 79], [70.5, 79], [78, 100], [69.5, 107], [60, 105], [50.5, 107], [42, 100]];
  const hem = long ? 113 : P.male ? 93.5 : 97.5;
  blob(c, shape, P.dress, { flip: back, light: 0.18, foot: 0.08 });
  c.save(); trace(c, shape); c.clip();
  c.strokeStyle = P.trim; c.lineWidth = 2.4; c.beginPath(); c.moveTo(38, hem); c.quadraticCurveTo(50, hem + 6.5, 60, hem + 4); c.quadraticCurveTo(70, hem + 6.5, 82, hem); c.stroke();
  if (!back) { // front panel: a breastplate on armour, a placket with buttons on cloth
    c.fillStyle = P.dress2; c.beginPath(); c.moveTo(53.5, 79); c.lineTo(66.5, 79); c.lineTo(64, long ? 110 : 99); c.lineTo(56, long ? 110 : 99); c.closePath(); c.fill();
    if (!P.armoured) { c.fillStyle = P.trim; for (const y of [84, 90, 96]) { c.beginPath(); c.arc(60, y, 1.1, 0, 7); c.fill(); } }
    else { c.strokeStyle = tone(L.armor, -0.35); c.lineWidth = 1; c.beginPath(); c.moveTo(60, 80); c.lineTo(60, 98); c.stroke(); }
  }
  c.restore();
  c.fillStyle = P.belt; c.fillRect(49.5 - wide, 88.2, 21 + wide * 2, 2.6); c.fillStyle = P.trim; c.fillRect(58.4, 87.6, 3.2, 3.8);
  if (L.apron && !back) blob(c, [[53, 81], [67, 81], [68.5, 101], [51.5, 101]], L.apron, { line: 1.2 });
  if (L.skeleton && !back) { c.strokeStyle = L.skin; c.lineWidth = 1.6; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(54, 82 + i * 4); c.quadraticCurveTo(60, 84.5 + i * 4, 66, 82 + i * 4); c.stroke(); } }
}
function sleeve(c, L, P, sx, sy, hx, hy, o = {}) {
  const dx = hx - sx, dy = hy - sy, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, w0 = 3.6, w1 = L.bulky ? 6 : 5.2;
  blob(c, [[sx + nx * w0, sy + ny * w0], [hx + nx * w1 - dx * 0.12, hy + ny * w1 - dy * 0.12], [hx + dx * 0.02, hy + dy * 0.02], [hx - nx * w1 - dx * 0.12, hy - ny * w1 - dy * 0.12], [sx - nx * w0, sy - ny * w0]], P.sleeve, { line: 1.3, flip: o.flip });
  c.strokeStyle = P.trim; c.lineWidth = 1.7; c.beginPath(); c.moveTo(hx + nx * w1 * 0.8 - dx * 0.14, hy + ny * w1 * 0.8 - dy * 0.14); c.lineTo(hx - nx * w1 * 0.8 - dx * 0.14, hy - ny * w1 * 0.8 - dy * 0.14); c.stroke();
  disc(c, hx + dx * 0.05, hy + dy * 0.05, 2.6, 2.6, P.skin, { line: 1.1, shade: -0.12 });
}
function cape(c, L, back, p) {
  const s = p.leg * 3;
  if (back) blob(c, [[47, 77], [73, 77], [84 + s, 104], [79 + s, 117, 1], [72 + s, 108], [66 + s, 120, 1], [60 + s, 110], [54 + s, 120, 1], [48 + s, 108], [41 + s, 117, 1], [36 + s, 104]], L.cape, { flip: 1, light: 0.15 });
  else blob(c, [[46, 78], [74, 78], [84 + s, 103], [79 + s, 116, 1], [72, 106], [48, 106], [41 + s, 116, 1], [36 + s, 103]], tone(L.cape, -0.22), { shade: -0.15 });
}
function wings(c, L, p) {
  [-1, 1].forEach((s) => { c.save(); c.translate(60 + s * 8, 76); c.scale(s, 1); c.rotate(-0.25 + p.flap * 0.15);
    blob(c, [[0, 0], [16, -30], [44, -26, 1], [37, -12], [42, 0, 1], [31, 2], [32, 14, 1], [14, 9], [0, 8]], L.wings, { line: 1.4, light: 0.15 }); c.restore(); });
}

// ── head ──
function face(c, L, P) {
  blob(c, [[40.5, 62], [41.5, 49], [52, 43], [66, 43], [77, 49.5], [78.5, 62], [74, 74.5], [61, 79.5], [49, 76.5]], P.skin, { shade: -0.1, cut: 0.3, foot: 0.06, lineColor: tone(P.skin, -0.5) });
  if (L.skeleton) { // skull: hollow sockets, a nose notch and a row of teeth
    for (const [x, rx] of [[47.5, 3.6], [62.5, 4.6]]) { c.fillStyle = '#1a1014'; c.beginPath(); c.ellipse(x, 64, rx, 5, 0, 0, 7); c.fill(); if (L.glowEyes) { glow(c, x, 64, 7, L.glowEyes, 0.9); c.fillStyle = L.glowEyes; c.beginPath(); c.arc(x, 64, 1.5, 0, 7); c.fill(); } }
    c.fillStyle = '#1a1014'; c.beginPath(); c.moveTo(54.5, 69); c.lineTo(56.6, 72.5); c.lineTo(52.6, 72.5); c.closePath(); c.fill();
    c.strokeStyle = '#1a1014'; c.lineWidth = 1; c.beginPath(); c.moveTo(47, 75); c.lineTo(63, 75); for (let x = 49; x <= 61; x += 3) { c.moveTo(x, 73.6); c.lineTo(x, 76.4); } c.stroke();
    return;
  }
  const ry = P.male ? 4.3 : 5.5;
  for (const [x, rx] of [[47.5, 3.3], [62.5, 4.6]]) { // big eyes: lash, two-tone iris, pupil, highlights
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, 64.8, rx + 0.5, ry + 0.6, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(0, 59, 0, 71); g.addColorStop(0, tone(P.eye, -0.55)); g.addColorStop(0.55, P.eye); g.addColorStop(1, tone(P.eye, 0.45));
    c.fillStyle = g; c.beginPath(); c.ellipse(x, 65.4, rx, ry, 0, 0, 7); c.fill();
    c.fillStyle = tone(P.eye, -0.75); c.beginPath(); c.ellipse(x, 65.2, rx * 0.5, ry * 0.52, 0, 0, 7); c.fill();
    c.strokeStyle = '#2a1c2a'; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - rx - 1.2, 66.2 - ry); c.quadraticCurveTo(x, 62.4 - ry + (P.male ? 1.2 : 0), x + rx + 1.4, 65.8 - ry); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x - rx * 0.4, 66.6 - ry * 0.7, 1.4, 0, 7); c.fill(); c.beginPath(); c.arc(x + rx * 0.45, 65.6 + ry * 0.4, 0.8, 0, 7); c.fill();
    if (L.glowEyes) glow(c, x, 65, 8, L.glowEyes, 0.8);
  }
  c.strokeStyle = tone(P.hair, -0.45); c.lineWidth = P.male ? 1.6 : 1.1; c.beginPath(); c.moveTo(43.5, 57.2); c.lineTo(50, P.male ? 58.2 : 56.6); c.moveTo(58.5, P.male ? 58.2 : 56.4); c.lineTo(66.5, 57.2); c.stroke();
  c.fillStyle = P.male ? 'rgba(255,120,130,0.2)' : 'rgba(255,120,130,0.45)'; c.beginPath(); c.ellipse(44.5, 71, 2.8, 1.5, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(68, 71, 3.4, 1.7, 0, 0, 7); c.fill();
  if (L.beard) blob(c, [[44, 69], [53, 72], [66, 72], [74, 68], [72, 80], [61, 87], [49, 81]], L.beard, { line: 1.2, light: 0.2 });
  else if (P.male) { c.strokeStyle = '#9a4a4a'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(52.6, 73.6); c.quadraticCurveTo(54.6, 74.6, 56.8, 73.4); c.stroke(); }
  else { c.fillStyle = '#9a3a4a'; c.beginPath(); c.moveTo(52.8, 72.6); c.quadraticCurveTo(54.9, 75.8, 57, 72.6); c.closePath(); c.fill(); }
}
function hairBack(c, P, len) {
  blob(c, [[36, 60], [38, 45], [51, 38], [67, 38], [81, 45], [84, 62], [85.5, len - 14], [82, len - 1, 1], [77, len - 10], [72, len + 3, 1], [66, len - 9], [60, len + 1, 1], [54, len - 9], [48, len + 3, 1], [43, len - 10], [38, len - 2, 1], [34.5, len - 14]], tone(P.hair, -0.12), { light: 0.1 });
}
function bangs(c, P) {
  blob(c, [[38.5, 61], [40, 47], [51, 39.5], [66, 39], [79, 46], [81, 61], [80, 67, 1], [76.5, 57], [72, 62.5, 1], [67, 53.5], [60.5, 60, 1], [55, 52.5], [50, 60.5, 1], [45.5, 54], [41.5, 66, 1]], P.hair, { light: 0.3, foot: 0 });
  c.strokeStyle = tone(P.hair, 0.5); c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(47, 47); c.quadraticCurveTo(58, 42.5, 70, 46.5); c.stroke();
  const sl = P.male ? 74 : 88;
  blob(c, [[38.5, 60], [42, 62], [41.5, sl - 6], [38.6, sl - 1, 1], [36.5, sl - 12]], P.hair, { line: 1.2 }); blob(c, [[78, 62], [81.5, 60], [83.5, sl - 12], [81.5, sl, 1], [78.5, sl - 6]], P.hair, { line: 1.2, flip: 1 });
}
function hairRear(c, P, len) {
  blob(c, [[35.5, 62], [37.5, 46], [51, 38], [68, 38], [82, 46], [85, 62], [86, len - 13], [82.5, len - 1, 1], [77.5, len - 11], [72.5, len + 4, 1], [66.5, len - 9], [60, len + 2, 1], [54, len - 10], [48, len + 4, 1], [43, len - 10], [37.5, len - 1, 1], [34.5, len - 13]], P.hair, { light: 0.25, flip: 1, foot: 0.08 });
  c.strokeStyle = tone(P.hair, -0.35); c.lineWidth = 1; c.lineCap = 'round';
  for (const [x, b] of [[49, 4], [57, -2], [65, 3], [73, -3]]) { c.beginPath(); c.moveTo(x, 58); c.quadraticCurveTo(x + b, 74, x + b * 0.4, len - 12); c.stroke(); }
  c.strokeStyle = tone(P.hair, 0.5); c.lineWidth = 1.6; c.beginPath(); c.moveTo(46, 50); c.quadraticCurveTo(60, 44.5, 74, 50); c.stroke();
}
const SKULL = [[37.5, 62], [39, 45.5], [51.5, 37.5], [67.5, 37.5], [80.5, 45.5], [82, 62], [78.5, 75], [61, 81], [43.5, 76]];
function headgear(c, L, P, back) {
  const m = back ? -1 : 1, X = (x) => (back ? 120 - x : x), pt = (pts) => pts.map(([x, y, s]) => [X(x), y, s]);
  switch (L.helm) {
    case 'knight': case 'horned': {
      blob(c, pt(SKULL), tone(L.armor, 0.22), { flip: back, light: 0.35 });
      if (!back) { c.fillStyle = '#17121a'; c.beginPath(); c.roundRect(42.5, 61, 30, 6.4, 2.4); c.fill(); c.fillStyle = L.glowEyes || '#f4f1ea'; for (const x of [49, 63]) { c.beginPath(); c.arc(x, 64.2, 1.3, 0, 7); c.fill(); if (L.glowEyes) glow(c, x, 64.2, 7, L.glowEyes, 0.9); }
        c.strokeStyle = tone(L.armor, -0.4); c.lineWidth = 1; c.beginPath(); c.moveTo(57, 68); c.lineTo(57, 78); c.stroke(); }
      if (L.helm === 'knight') blob(c, pt([[58, 40], [70, 29], [84, 33, 1], [80, 44], [86, 56, 1], [72, 47], [64, 40]]), L.cloth, { line: 1.2, flip: back, light: 0.2 });
      else for (const s of [-1, 1]) blob(c, [[60 + s * 17, 46], [60 + s * 30, 40], [60 + s * 27, 20, 1], [60 + s * 21, 36], [60 + s * 12, 42]], '#e6dcc4', { line: 1.2, flip: s < 0 });
      break;
    }
    case 'wizard': {
      const tip = back ? [44, 9, 1] : [77, 9, 1];
      const cone = back ? [[80, 44], [70, 22], tip, [50, 25], [41, 44]] : [[40, 44], [50, 22], tip, [70, 25], [79, 44]];
      blob(c, cone, L.armor, { flip: back, light: 0.2 });
      blob(c, [[31, 46], [44, 39.5], [60, 37.5], [76, 39.5], [89, 46], [77, 51], [60, 52.5], [43, 51]], L.armor, { flip: back, shade: -0.28, cut: -0.1 });
      c.save(); trace(c, cone); c.clip(); c.fillStyle = L.cloth; c.fillRect(36, 36.5, 48, 4.2); c.restore();
      break;
    }
    case 'hood': case 'mask': {
      const hc = L.hoodColor || L.armor;
      if (back) { blob(c, [[35.5, 63], [37, 44], [51, 35.5], [69, 35.5], [83, 44], [84.5, 63], [80, 78], [60, 84], [40, 78]], hc, { flip: 1, light: 0.2 }); c.strokeStyle = tone(hc, -0.4); c.lineWidth = 1.1; c.beginPath(); c.moveTo(60, 36); c.quadraticCurveTo(63, 60, 60, 83); c.stroke(); }
      else {
        blob(c, [[36, 62], [37.5, 44.5], [51, 36], [68, 36], [82.5, 44.5], [84, 62], [81.5, 71, 1], [79, 56], [70, 47.5], [58, 46], [47, 48], [41.5, 57], [39, 71, 1]], hc, { light: 0.25, foot: 0 });
        if (L.helm === 'mask') blob(c, [[42, 68.5], [52, 71], [66, 71], [76.5, 68], [74.5, 78], [61, 81.5], [47, 78.5]], L.scarf || '#333333', { line: 1.2 });
      }
      break;
    }
    case 'crown': { const cc = L.crownColor || '#e0b040'; blob(c, [[44, 47], [44, 35, 1], [50, 42], [55, 31, 1], [60, 41], [65, 31, 1], [70, 42], [76, 35, 1], [76, 47], [60, 49.5]], cc, { line: 1.2, light: 0.5 }); glow(c, 60, 38, 9, cc, 0.5); break; }
    case 'turban': blob(c, [[37, 57], [39, 43], [52, 35.5], [68, 35.5], [81, 43], [83, 57], [60, 60.5]], L.cloth, { light: 0.25 }); disc(c, X(57), 47, 2.2, 2.2, '#d03838', { line: 0.9, light: 0.5 }); break;
    case 'circlet': c.strokeStyle = '#e8c040'; c.lineWidth = 2; c.beginPath(); c.moveTo(41.5, 53); c.quadraticCurveTo(60, 47, 78.5, 53); c.stroke(); if (!back) disc(c, 55, 50.5, 2, 2, '#60c0ff', { line: 0.8, light: 0.6 }); break;
    case 'goggles': c.fillStyle = '#4a3a2a'; c.fillRect(40, 50, 40, 4); if (!back) for (const x of [48, 62]) disc(c, x, 51.5, 3.6, 3, '#f0b040', { line: 1, light: 0.6 }); break;
    default: break;
  }
  void m;
}

// ── the figure ──
// `kit` supplies the weapon and offhand drawings shared with the rest of the sprite factory.
export function paintChibi(c, L, view, p, anim, kit) {
  const back = view === 'back'; const P = palette(L);
  c.translate(p.dx, p.bob); c.rotate(p.lean); c.scale(2 - p.squash, p.squash);
  const big = L.demon ? 1.1 : 1; c.scale(big * 1.13, big * 0.98);
  if (!back) c.scale(-1, 1); // drawn facing left; the game's frames face right
  c.translate(-60, -128 + (L.hunch ? 3 : 0));
  const helmed = L.helm === 'knight' || L.helm === 'horned';
  const hairy = !!L.hair && !L.skeleton && !helmed;
  const len = L.female ? 104 : 80;
  // hands follow the pose: 0 = hanging, larger = raised forward and up
  const a = p.arm, o = p.off;
  const wHand = back ? [71 + Math.sin(a) * 14, 83 + Math.cos(a) * 14] : [49 - Math.sin(a) * 15, 83 + Math.cos(a) * 14];
  const oHand = back ? [49 - Math.sin(o) * 11, 83 + Math.cos(o) * 14] : [71 + Math.sin(o) * 11, 83 + Math.cos(o) * 14];
  const hold = (item, hand, ang, off) => { if (!item) return; c.save(); c.translate(hand[0], hand[1]); const w = item === 'bow' ? ang : ang + 0.9; const rot = item === 'staff' || item === 'spear' ? 0.14 + (ang - 0.35) * 0.4 : Math.PI - w; c.rotate(back ? rot : -rot); c.scale(back ? 0.82 : -0.82, 0.82); if (off) kit.offhand(c, item, L); else kit.weapon(c, item, L, p.glow); c.restore(); };

  if (L.wings) wings(c, L, p);
  if (back) {
    hold(L.weapon, wHand, a, false);
    legs(c, P, true, p); body(c, L, P, true, p);
    sleeve(c, L, P, 70, 82, wHand[0], wHand[1], { flip: 1 }); sleeve(c, L, P, 50, 82, oHand[0], oHand[1]);
    if (P.armoured || L.bulky) { disc(c, 48, 81, 5, 4, tone(L.armor, 0.2), { line: 1.2 }); disc(c, 72, 81, 5, 4, tone(L.armor, 0.2), { line: 1.2, flip: 1 }); }
    if (L.cape) cape(c, L, true, p);
    if (hairy && L.helm !== 'hood' && L.helm !== 'mask') hairRear(c, P, len + 2);
    else if (!hairy) blob(c, SKULL, L.skeleton ? L.skin : P.skin, { flip: 1, shade: -0.12 });
    if (L.female && helmed && L.hair) blob(c, [[55, 70], [65, 70], [68, 96], [62, 106, 1], [56, 97]], L.hair, { line: 1.2, light: 0.3 }); // ponytail under the helm
    headgear(c, L, P, true);
  } else {
    if (L.cape) cape(c, L, false, p);
    if (hairy) hairBack(c, P, len);
    if (L.female && helmed && L.hair) blob(c, [[72, 66], [82, 70], [85, 94], [80, 104, 1], [76, 92]], L.hair, { line: 1.2, flip: 1, light: 0.3 });
    legs(c, P, false, p); body(c, L, P, false, p);
    sleeve(c, L, P, 70, 82, oHand[0], oHand[1], { flip: 1 }); hold(L.offhand, oHand, o, true);
    if (P.armoured || L.bulky) { disc(c, 48, 81, 5, 4, tone(L.armor, 0.3), { line: 1.2, light: 0.4 }); disc(c, 72, 81, 5.5, 4.4, tone(L.armor, 0.2), { line: 1.2, flip: 1 }); }
    else if (L.robe || L.gown) { blob(c, [[54, 78], [66, 78], [63, 84], [60, 86.5, 1], [57, 84]], tone(L.armor, 0.6), { line: 1 }); disc(c, 60, 82, 1.8, 1.8, L.cloth || '#ff5c8a', { line: 0.8, light: 0.6 }); }
    if (L.scarf) { blob(c, [[50, 77], [70, 77], [72, 83], [60, 87], [48, 83]], L.scarf, { line: 1.1 }); blob(c, [[66, 82], [71, 82], [73, 96, 1], [68, 92]], L.scarf, { line: 1.1, flip: 1 }); }
    if (!helmed) face(c, L, P);
    if (hairy) bangs(c, P);
    headgear(c, L, P, false);
    hold(L.weapon, wHand, a, false); sleeve(c, L, P, 50, 82, wHand[0], wHand[1]);
  }
  if (p.glow > 0) glow(c, wHand[0], wHand[1] - 10, 20 * p.glow, L.crownColor || '#a0d0ff', 0.6);
  if (p.swing) { c.save(); c.globalAlpha = 0.7; c.beginPath(); c.arc(back ? 66 : 54, 80, 36, back ? -1.4 : Math.PI - 0.9, back ? 0.9 : Math.PI + 1.4); c.strokeStyle = '#ffffff'; c.lineWidth = 4.5; c.stroke(); c.globalAlpha = 0.3; c.lineWidth = 11; c.stroke(); c.restore(); }
}
