// Card art — every skill card gets its own painted picture, drawn by code and cached as an image.
// The look is a gouache poster: flat painted shapes with a hot core and a darker rim on near-black,
// then one finishing pass (fewer tones, brush strokes in one direction, warm dark edges).
// A picture is chosen by the card's icon, coloured by its element (or its category when neutral),
// and varied by a seed taken from the card id — so a new card needs no art of its own.
import { CARDS } from '../data/cards.js';

const W = 600, H = 860;            // painters work in this space
const OUT = 0.6;                   // stored size = 360 × 516
const TAU = Math.PI * 2;

const PAL = {
  fire: { bg: '#0a070b', deep: '#5a1410', mid: '#c8401a', hot: '#ff9a2e', core: '#fff3c0', rgb: '255,110,40' },
  ice: { bg: '#06080d', deep: '#1c4a84', mid: '#3f9bd8', hot: '#9fdcf8', core: '#f0fbff', rgb: '70,150,220' },
  wind: { bg: '#060c0b', deep: '#145a48', mid: '#2fa878', hot: '#8ff0c0', core: '#f0fff6', rgb: '50,170,120' },
  earth: { bg: '#0b0806', deep: '#5a3414', mid: '#b0702c', hot: '#f0b860', core: '#fff0cc', rgb: '190,120,50' },
  holy: { bg: '#0b0906', deep: '#7a4a10', mid: '#e0a030', hot: '#ffe08a', core: '#fffbe6', rgb: '240,180,70' },
  shadow: { bg: '#08060d', deep: '#32186a', mid: '#7a44d8', hot: '#c09aff', core: '#f4eaff', rgb: '120,70,220' },
  poison: { bg: '#070b06', deep: '#2c5a12', mid: '#6ab02a', hot: '#c4f06a', core: '#f6ffd8', rgb: '110,180,50' },
  attack: { bg: '#0b0707', deep: '#5a1410', mid: '#c8452e', hot: '#ff9a6a', core: '#ffe6cc', rgb: '200,70,45' },
  defense: { bg: '#07080e', deep: '#1a2c66', mid: '#4a70c8', hot: '#a8c4ff', core: '#f2f6ff', rgb: '70,110,200' },
  movement: { bg: '#060b0b', deep: '#0f4a44', mid: '#1f8f86', hot: '#7fe0d0', core: '#eafffa', rgb: '40,150,140' },
  buff: { bg: '#0b0906', deep: '#6a4410', mid: '#d99a2a', hot: '#ffd870', core: '#fff8dc', rgb: '220,160,50' },
  special: { bg: '#09070d', deep: '#3a1c66', mid: '#8a4fc0', hot: '#d0a0ff', core: '#f6ecff', rgb: '140,80,200' },
};

const seeded = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hash = (s) => { let n = 7; for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 2147483646; return n + 1; };

// ───── brushes ─────
const poly = (c, pts, col) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = col; c.fill(); };
const disc = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const line = (c, x1, y1, x2, y2, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
const glow = (c, x, y, r, rgb, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.5, `rgba(${rgb},${a * 0.4})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const halo = (c, P, x, y, r, a = 0.45) => { c.globalCompositeOperation = 'lighter'; glow(c, x, y, r, P.rgb, a); c.globalCompositeOperation = 'source-over'; };
const ball = (c, P, x, y, r) => { const g = c.createRadialGradient(x - r * 0.25, y - r * 0.28, r * 0.08, x, y, r); g.addColorStop(0, P.core); g.addColorStop(0.35, P.hot); g.addColorStop(0.75, P.mid); g.addColorStop(1, P.deep); disc(c, x, y, r, g); };
const lin = (c, x1, y1, x2, y2, cols) => { const g = c.createLinearGradient(x1, y1, x2, y2); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; };
const steel = (c, x1, y1, x2, y2) => lin(c, x1, y1, x2, y2, ['#f2f6ff', '#9aa8c4', '#3c4866']);
function backdrop(c, P, R, cx = 300, cy = 300) {
  c.fillStyle = P.bg; c.fillRect(0, 0, W, H); glow(c, cx, cy, 560, P.rgb, 0.42);
  for (let i = 0; i < 130; i++) { c.fillStyle = `rgba(255,240,220,${(0.12 + R() * 0.5).toFixed(2)})`; c.beginPath(); c.arc(R() * W, R() * H, 0.8 + R() * 1.8, 0, TAU); c.fill(); }
}
function rays(c, P, R, cx, cy, n = 16, a = 0.2) {
  c.save(); c.translate(cx, cy); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const ang = (i / n) * TAU + R() * 0.2, w = 0.04 + R() * 0.05; const g = c.createLinearGradient(0, 0, Math.cos(ang) * 520, Math.sin(ang) * 520); g.addColorStop(0, `rgba(${P.rgb},${a})`); g.addColorStop(1, `rgba(${P.rgb},0)`); c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 520, ang - w, ang + w); c.closePath(); c.fill(); }
  c.restore();
}
function sparks(c, P, R, cx, cy, n = 30, spread = 260) {
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const a = R() * TAU, d = 40 + R() * spread, l = 8 + R() * 26; const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; line(c, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 1.5 + R() * 4, `rgba(${P.rgb},${0.35 + R() * 0.5})`); }
  c.globalCompositeOperation = 'source-over';
}
const layers = (P) => [P.deep, P.mid, P.hot, P.core];
// the same shape painted four times, each smaller and hotter: draw(scale) builds the path
function nested(c, P, x, y, draw, scales = [1, 0.8, 0.58, 0.34]) { layers(P).forEach((col, i) => { c.save(); c.translate(x, y); c.scale(scales[i], scales[i]); c.beginPath(); draw(); c.fillStyle = col; c.fill(); c.restore(); }); }
const at = (c, x, y, rot, fn, s = 1) => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); fn(); c.restore(); };

// ───── pictures, one per card icon ─────
function comet(c, P, R) { // a burning ball and its trail
  const cx = 345, cy = 300, r = 150; rays(c, P, R, cx, cy, 18, 0.22);
  const ribbon = (w, col, off) => { c.beginPath(); c.moveTo(-40, 800 + off); c.bezierCurveTo(90, 640 - w, 190, 500 - w, cx - 90 - w * 0.3, cy + 40 - w * 0.5); c.lineTo(cx + 40 + w * 0.4, cy + 120 + w * 0.5); c.bezierCurveTo(270, 600 + w, 150, 760 + w, -40, 800 + off); c.fillStyle = col; c.fill(); };
  ribbon(110, P.deep, 60); ribbon(78, P.mid, 30); ribbon(46, P.hot, 10); ribbon(14, P.core, -2);
  for (let i = 0; i < 26; i++) { const a = 1.7 + (i / 26) * 2.9 + (R() - 0.5) * 0.25, len = 70 + R() * 130, wd = 22 + R() * 26;
    at(c, cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14), a + Math.PI / 2 + 0.55, () => { c.beginPath(); c.moveTo(-wd, 0); c.bezierCurveTo(-wd * 0.7, -len * 0.45, wd * 0.25, -len * 0.6, wd * 0.55, -len); c.bezierCurveTo(wd * 0.9, -len * 0.5, wd, -len * 0.2, wd, 0); c.closePath(); c.fillStyle = [P.deep, P.mid, P.hot][i % 3]; c.fill(); }); }
  ball(c, P, cx, cy, r);
  c.save(); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip(); c.globalAlpha = 0.28;
  for (let i = 0; i < 80; i++) { const a = R() * TAU, d = Math.sqrt(R()) * r, s = 8 + R() * 22; c.fillStyle = R() > 0.5 ? P.core : P.deep; c.beginPath(); c.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, s * 0.62, a, 0, TAU); c.fill(); }
  c.restore(); c.strokeStyle = P.core; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.arc(cx, cy, r - 6, -2.5, -0.9); c.stroke();
  halo(c, P, cx, cy, 330, 0.5); sparks(c, P, R, cx, cy, 50, 380);
}
const PIC = {
  flame(c, P, R, card) {
    if (card.shape !== 'single') return comet(c, P, R);
    rays(c, P, R, 300, 360, 12, 0.14);
    nested(c, P, 300, 500, () => { c.moveTo(0, 0); c.bezierCurveTo(-150, 0, -170, -150, -70, -240); c.bezierCurveTo(-60, -180, -20, -170, -12, -200); c.bezierCurveTo(-40, -300, 30, -370, 70, -420); c.bezierCurveTo(56, -320, 170, -250, 160, -120); c.bezierCurveTo(152, -40, 90, 0, 0, 0); });
    halo(c, P, 300, 360, 300); sparks(c, P, R, 300, 330, 34, 300);
  },
  meteor(c, P, R) { c.save(); c.translate(W, 600); c.scale(-1, -1); comet(c, P, R); c.restore(); },
  sword(c, P, R) {
    const arc = (w, col) => { c.beginPath(); c.moveTo(40, 600); c.quadraticCurveTo(250 - w, 170 - w, 570, 70); c.quadraticCurveTo(330 + w, 280 + w, 40, 600); c.fillStyle = col; c.fill(); };
    arc(120, P.deep); arc(84, P.mid); arc(52, P.hot); arc(24, P.core); arc(7, '#ffffff');
    c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { const t = R(); disc(c, 40 + t * 530 + (R() - 0.5) * 140, 600 - t * 530 + (R() - 0.5) * 150, 2 + R() * 6, `rgba(${P.rgb},${0.3 + R() * 0.5})`); } c.globalCompositeOperation = 'source-over';
  },
  shield(c, P, R) {
    c.lineCap = 'round'; for (const [r, a] of [[250, 0.5], [300, 0.34], [350, 0.2]]) { c.strokeStyle = P.hot; c.globalAlpha = a; c.lineWidth = 14; c.beginPath(); c.arc(300, 310, r, -2.45, -0.7); c.stroke(); c.beginPath(); c.arc(300, 310, r, 0.7, 2.45); c.stroke(); } c.globalAlpha = 1;
    const kite = (s) => { c.beginPath(); c.moveTo(300 - 150 * s, 310 - 200 * s); c.lineTo(300 + 150 * s, 310 - 200 * s); c.lineTo(300 + 150 * s, 310 + 10 * s); c.quadraticCurveTo(300 + 138 * s, 310 + 150 * s, 300, 310 + 245 * s); c.quadraticCurveTo(300 - 138 * s, 310 + 150 * s, 300 - 150 * s, 310 + 10 * s); c.closePath(); };
    kite(1); c.fillStyle = P.bg; c.fill(); kite(0.93); c.fillStyle = steel(c, 150, 100, 450, 550); c.fill();
    kite(0.74); c.fillStyle = lin(c, 200, 150, 400, 520, [P.mid, P.deep]); c.fill(); c.fillStyle = P.core; c.fillRect(281, 170, 38, 262); c.fillRect(196, 252, 208, 38);
    c.save(); kite(0.93); c.clip(); c.fillStyle = 'rgba(255,255,255,0.3)'; poly(c, [[140, 90], [330, 90], [200, 570], [140, 570]], 'rgba(255,255,255,0.28)'); c.restore();
  },
  boot(c, P, R) { // a dash: chevrons racing up and to the right
    at(c, 300, 320, -0.62, () => {
      for (let i = 0; i < 16; i++) { const y = (R() - 0.5) * 300, x = -420 + R() * 200; line(c, x, y, x + 160 + R() * 240, y, 4 + R() * 12, [P.deep, P.mid, P.hot][i % 3]); }
      [[-170, 0.62, P.deep], [-40, 0.8, P.mid], [110, 1, P.hot]].forEach(([x, s, col]) => poly(c, [[x - 70 * s, -150 * s], [x + 20 * s, -150 * s], [x + 130 * s, 0], [x + 20 * s, 150 * s], [x - 70 * s, 150 * s], [x + 40 * s, 0]], col));
      poly(c, [[150, -110], [185, -110], [262, 0], [185, 110], [150, 110], [226, 0]], P.core);
    }); halo(c, P, 380, 240, 260, 0.35);
  },
  eye(c, P, R) {
    c.strokeStyle = P.mid; c.lineWidth = 10; c.beginPath(); c.arc(300, 300, 215, 0, TAU); c.stroke(); c.strokeStyle = P.deep; c.lineWidth = 22; c.beginPath(); c.arc(300, 300, 262, 0, TAU); c.stroke();
    for (let i = 0; i < 4; i++) at(c, 300, 300, (i * TAU) / 4, () => poly(c, [[190, -9], [290, -9], [290, 9], [190, 9]], P.hot));
    c.beginPath(); c.moveTo(95, 300); c.quadraticCurveTo(300, 130, 505, 300); c.quadraticCurveTo(300, 470, 95, 300); c.closePath(); c.fillStyle = P.core; c.fill();
    ball(c, { ...P, core: P.hot, hot: P.mid, mid: P.deep, deep: P.bg }, 300, 300, 84); disc(c, 300, 300, 38, P.bg); disc(c, 276, 276, 15, '#ffffff'); halo(c, P, 300, 300, 280, 0.3);
  },
  dagger(c, P, R) {
    at(c, 300, 300, -0.78, () => {
      for (let i = 0; i < 12; i++) { const y = (R() - 0.5) * 150; line(c, -430 + R() * 120, y, -150 + R() * 120, y, 4 + R() * 10, [P.deep, P.mid, P.hot][i % 3]); }
      poly(c, [[-30, -34], [250, 0], [-30, 0]], '#ffffff'); poly(c, [[-30, 34], [250, 0], [-30, 0]], '#9aa8c4'); poly(c, [[-50, -70], [-26, -70], [-26, 70], [-50, 70]], P.hot);
      poly(c, [[-170, -20], [-50, -20], [-50, 20], [-170, 20]], P.deep); disc(c, -182, 0, 28, P.mid);
    }); sparks(c, P, R, 470, 130, 16, 110); halo(c, P, 470, 130, 170, 0.5);
  },
  sun(c, P, R) {
    for (let i = 0; i < 16; i++) at(c, 300, 300, (i / 16) * TAU, () => poly(c, [[150, -34], [i % 2 ? 300 : 380, 0], [150, 34]], i % 2 ? P.mid : P.hot));
    disc(c, 300, 300, 168, P.deep); ball(c, P, 300, 300, 150); halo(c, P, 300, 300, 360, 0.5);
  },
  snow(c, P, R, card) {
    const shard = (x, y, len, w, a) => at(c, x, y, a, () => { poly(c, [[0, -len], [w, -len * 0.15], [0, len * 0.55]], P.core); poly(c, [[0, -len], [-w, -len * 0.15], [0, len * 0.55]], P.mid); poly(c, [[w, -len * 0.15], [w * 0.45, len * 0.55], [0, len * 0.55]], P.hot); poly(c, [[-w, -len * 0.15], [-w * 0.45, len * 0.55], [0, len * 0.55]], P.deep); line(c, 0, -len, w, -len * 0.15, 5, '#ffffff'); });
    if (card.shape === 'single') {
      c.globalAlpha = 0.5; for (let i = 0; i < 12; i++) { const x = 20 + R() * 260, y = 430 + R() * 280; line(c, x, y, x + 190, y - 250, 4 + R() * 10, P.hot); } c.globalAlpha = 1;
      shard(210, 460, 110, 40, 0.65); shard(340, 290, 190, 66, 0.65); shard(480, 140, 90, 32, 0.65);
    } else if (card.shape === 'area') { for (let i = 0; i < 7; i++) shard(90 + i * 72 + R() * 30, 150 + R() * 330, 70 + R() * 90, 24 + R() * 26, 3.5 + (R() - 0.5) * 0.3); }
    else { for (let i = 0; i < 6; i++) at(c, 300, 300, (i / 6) * TAU, () => { line(c, 0, 0, 0, -250, 22, P.mid); line(c, 0, 0, 0, -250, 9, P.core); for (const d of [-100, -170]) { line(c, 0, d, 58, d - 58, 14, P.hot); line(c, 0, d, -58, d - 58, 14, P.hot); } }); for (let i = 0; i < 6; i++) shard(300 + Math.cos(i * 1.047 + 0.52) * 150, 300 + Math.sin(i * 1.047 + 0.52) * 150, 46, 17, i * 1.047 + 2.09); disc(c, 300, 300, 34, P.core); }
    halo(c, P, 320, 290, 300, 0.4);
  },
  arrow(c, P, R, card, x = 300, y = 300, s = 1, rot = -0.75) {
    at(c, x, y, rot, () => {
      poly(c, [[-470, 0], [110, -58], [110, 58]], P.deep); poly(c, [[-380, 0], [120, -36], [120, 36]], P.mid); poly(c, [[-250, 0], [130, -17], [130, 17]], P.hot);
      line(c, -210, 0, 150, 0, 11, P.core); poly(c, [[140, -46], [250, 0], [140, 46], [164, 0]], '#ffffff');
      poly(c, [[-240, 0], [-200, -40], [-140, -40], [-170, 0]], P.hot); poly(c, [[-240, 0], [-200, 40], [-140, 40], [-170, 0]], P.mid);
    }, s);
    if (s === 1) halo(c, P, 470, 150, 190, 0.5);
  },
  arrows(c, P, R, card) { for (let i = 0; i < 7; i++) PIC.arrow(c, P, R, card, 70 + i * 78 + R() * 30, 130 + R() * 380, 0.36 + R() * 0.26, 2.1 + (R() - 0.5) * 0.12); halo(c, P, 300, 300, 320, 0.25); },
  quake(c, P, R) {
    const pts = []; for (let i = 0; i <= 12; i++) pts.push([300 + (i % 2 ? 46 : -46) * (0.4 + R()) + (i - 6) * 9, 60 + i * 52]);
    const crack = (w, col) => { const L = pts.map(([x, y], i) => [x - w * Math.sin((i / 12) * Math.PI), y]), Rr = pts.map(([x, y], i) => [x + w * Math.sin((i / 12) * Math.PI), y]).reverse(); poly(c, [...L, ...Rr], col); };
    crack(150, P.deep); crack(104, P.mid); crack(62, P.hot); crack(24, P.core); halo(c, P, 300, 340, 330, 0.4);
    for (let i = 0; i < 14; i++) { const x = 60 + R() * 480, y = 80 + R() * 480, s = 16 + R() * 34, a = R() * TAU; at(c, x, y, a, () => { poly(c, [[-s, -s * 0.6], [s * 0.7, -s], [s, s * 0.5], [-s * 0.5, s]], '#2a1c12'); poly(c, [[-s, -s * 0.6], [s * 0.7, -s], [0, 0]], P.hot); }); }
  },
  heart(c, P, R) {
    const heart = () => { c.moveTo(0, 190); c.bezierCurveTo(-300, -10, -210, -250, 0, -110); c.bezierCurveTo(210, -250, 300, -10, 0, 190); };
    for (const [s, a] of [[1.5, 0.18], [1.25, 0.34]]) at(c, 300, 300, 0, () => { c.beginPath(); heart(); c.strokeStyle = P.hot; c.globalAlpha = a; c.lineWidth = 9; c.stroke(); c.globalAlpha = 1; }, s);
    nested(c, P, 300, 300, heart, [1, 0.86, 0.66, 0.0]); c.save(); c.translate(300, 300); c.beginPath(); c.ellipse(-78, -70, 42, 26, -0.6, 0, TAU); c.fillStyle = P.core; c.fill(); c.restore(); halo(c, P, 300, 300, 320, 0.4);
  },
  cross(c, P, R) {
    rays(c, P, R, 300, 300, 14, 0.2); const plus = (w, l) => { c.rect(-w, -l, w * 2, l * 2); c.rect(-l, -w, l * 2, w * 2); };
    nested(c, P, 300, 300, () => plus(62, 210), [1, 0.86, 0.7, 0.5]);
    for (let i = 0; i < 22; i++) { const x = 60 + R() * 480, y = 60 + R() * 520, s = 5 + R() * 9; poly(c, [[x, y - s * 2], [x + s, y], [x, y + s * 2], [x - s, y]], i % 2 ? P.core : P.hot); } halo(c, P, 300, 300, 340, 0.45);
  },
  blink(c, P, R) {
    c.lineCap = 'round'; for (let i = 0; i < 26; i++) { const r = 40 + i * 9.5, a = i * 0.74 + R(); c.strokeStyle = [P.deep, P.mid, P.hot, P.mid][i % 4]; c.lineWidth = 9 + R() * 16; c.beginPath(); c.arc(300, 300, r, a, a + 1.5 + R() * 1.5); c.stroke(); }
    ball(c, P, 300, 300, 70); halo(c, P, 300, 300, 300, 0.5);
    for (let i = 0; i < 16; i++) { const a = R() * TAU, d = 120 + R() * 190, s = 6 + R() * 11, x = 300 + Math.cos(a) * d, y = 300 + Math.sin(a) * d; poly(c, [[x, y - s * 2], [x + s, y], [x, y + s * 2], [x - s, y]], P.core); }
  },
  anvil(c, P, R) {
    poly(c, [[110, 270], [470, 270], [470, 330], [380, 350], [350, 420], [400, 470], [400, 520], [170, 520], [170, 470], [220, 420], [200, 350], [60, 318]], P.bg);
    c.fillStyle = steel(c, 100, 260, 420, 540); c.beginPath(); [[120, 280], [460, 280], [460, 322], [372, 342], [340, 420], [390, 474], [390, 510], [180, 510], [180, 474], [230, 420], [210, 342], [80, 314]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
    poly(c, [[120, 280], [460, 280], [460, 296], [120, 296]], '#ffffff'); poly(c, [[220, 236], [400, 236], [400, 280], [220, 280]], P.hot); poly(c, [[236, 246], [384, 246], [384, 266], [236, 266]], P.core);
    halo(c, P, 310, 250, 260, 0.6); sparks(c, P, R, 310, 240, 46, 260);
  },
  wind(c, P, R) {
    c.lineCap = 'round'; const curl = (x, y, len, r, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x - len, y + r); c.bezierCurveTo(x - len * 0.5, y + r + 26, x - 60, y + r, x, y + r); c.arc(x, y, r, Math.PI / 2, -Math.PI * 0.95, true); c.stroke(); };
    [[400, 170, 330, 62, 30, P.deep], [330, 300, 300, 78, 34, P.mid], [450, 420, 380, 56, 26, P.deep], [400, 170, 330, 62, 13, P.hot], [330, 300, 300, 78, 15, P.core], [450, 420, 380, 56, 11, P.hot]].forEach((a) => curl(...a));
    for (let i = 0; i < 12; i++) { const x = 40 + R() * 300, y = 90 + R() * 440; line(c, x, y, x + 60 + R() * 120, y - 6, 3 + R() * 6, P.hot); } halo(c, P, 360, 290, 300, 0.3);
  },
  whirl(c, P, R) {
    const blade = (r) => { c.moveTo(r, 0); c.arc(0, 0, r, 0, 1.75); c.quadraticCurveTo(r * 0.5, r * 0.62, r * 0.42, 0); c.closePath(); };
    for (let i = 0; i < 3; i++) layers(P).forEach((col, k) => at(c, 300, 300, (i / 3) * TAU + k * 0.16, () => { c.beginPath(); blade(250 - k * 26); c.fillStyle = col; c.fill(); }));
    disc(c, 300, 300, 46, P.bg); disc(c, 300, 300, 26, P.core); sparks(c, P, R, 300, 300, 30, 270); halo(c, P, 300, 300, 300, 0.3);
  },
  star(c, P, R) {
    rays(c, P, R, 300, 300, 12, 0.16); const star = (r) => { for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.2 : r, a = (i / 8) * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); };
    nested(c, P, 300, 300, () => star(270), [1, 0.82, 0.62, 0.4]);
    for (let i = 0; i < 9; i++) at(c, 70 + R() * 460, 70 + R() * 480, 0, () => { c.beginPath(); star(18 + R() * 30); c.fillStyle = i % 2 ? P.core : P.hot; c.fill(); }); halo(c, P, 300, 300, 320, 0.5);
  },
  skull(c, P, R) {
    for (let i = 0; i < 9; i++) { const a = -2.6 + i * 0.5; c.strokeStyle = i % 2 ? P.mid : P.deep; c.lineWidth = 26; c.lineCap = 'round'; c.beginPath(); c.moveTo(300 + Math.cos(a) * 150, 280 + Math.sin(a) * 150); c.quadraticCurveTo(300 + Math.cos(a + 0.5) * 260, 280 + Math.sin(a + 0.5) * 260, 300 + Math.cos(a + 0.2) * 330, 280 + Math.sin(a + 0.2) * 330); c.stroke(); }
    c.fillStyle = lin(c, 170, 130, 430, 480, [P.core, P.hot, P.mid]); c.beginPath(); c.arc(300, 260, 150, 0, TAU); c.fill(); c.beginPath(); c.roundRect(215, 330, 170, 130, 26); c.fill();
    c.fillStyle = P.bg; c.beginPath(); c.ellipse(238, 280, 44, 52, 0.2, 0, TAU); c.fill(); c.beginPath(); c.ellipse(362, 280, 44, 52, -0.2, 0, TAU); c.fill(); poly(c, [[300, 322], [322, 372], [278, 372]], P.bg);
    for (const x of [252, 284, 316, 348]) line(c, x, 406, x, 456, 7, P.bg); disc(c, 238, 284, 14, P.hot); disc(c, 362, 284, 14, P.hot); halo(c, P, 300, 290, 320, 0.3);
  },
  orb(c, P, R) {
    c.lineCap = 'round'; const ring = (rot, col, w, half) => at(c, 300, 300, rot, () => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.ellipse(0, 0, 250, 78, 0, half ? 0 : Math.PI, half ? Math.PI : TAU); c.stroke(); });
    ring(-0.5, P.deep, 16, false); ring(0.6, P.deep, 16, false); ball(c, P, 300, 300, 138); ring(-0.5, P.hot, 12, true); ring(0.6, P.mid, 12, true);
    for (const [x, y, r] of [[92, 420, 22], [520, 190, 18], [468, 470, 14]]) ball(c, P, x, y, r); halo(c, P, 300, 300, 320, 0.45);
  },
  bolt(c, P, R) {
    const z = [[470, 30], [300, 250], [390, 270], [190, 500], [250, 320], [160, 300], [330, 30]];
    layers(P).forEach((col, i) => { const k = [26, 13, 4, -8][i]; poly(c, z.map(([x, y], j) => [x + (j < 4 ? k : -k) * (j === 0 || j === 6 ? 0.4 : 1), y + (j === 3 ? k : 0)]), col); });
    c.lineJoin = 'round'; for (const [x, y, dx] of [[380, 265, 120], [215, 330, -110], [300, 160, 130]]) { c.strokeStyle = P.hot; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx * 0.4, y + 50); c.lineTo(x + dx * 0.55, y + 30); c.lineTo(x + dx, y + 110); c.stroke(); }
    halo(c, P, 300, 280, 330, 0.5); sparks(c, P, R, 200, 500, 22, 130);
  },
  banner(c, P, R) {
    rays(c, P, R, 330, 260, 12, 0.16); line(c, 150, 60, 150, 640, 18, '#3c2a1c'); line(c, 146, 60, 146, 640, 6, '#b08a5a'); disc(c, 150, 56, 22, P.hot);
    const flag = (o, col) => { c.beginPath(); c.moveTo(160, 90 + o); c.bezierCurveTo(260, 40 + o, 360, 150 + o, 520, 96 + o); c.lineTo(486 - o, 250); c.lineTo(520, 400 - o); c.bezierCurveTo(360, 450 - o, 260, 350 - o, 160, 410 - o); c.closePath(); c.fillStyle = col; c.fill(); };
    flag(0, P.deep); flag(16, lin(c, 160, 100, 500, 400, [P.hot, P.mid, P.deep])); at(c, 320, 250, 0, () => { c.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? 30 : 74, a = (i / 10) * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fillStyle = P.core; c.fill(); });
  },
  wrench(c, P, R) {
    at(c, 380, 220, 0.3, () => { c.fillStyle = P.deep; c.beginPath(); for (let i = 0; i < 24; i++) { const rr = i % 2 ? 150 : 186, a = (i / 24) * TAU; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); c.lineTo(Math.cos(a + 0.13) * rr, Math.sin(a + 0.13) * rr); } c.closePath(); c.fill(); disc(c, 0, 0, 120, P.mid); disc(c, 0, 0, 52, P.bg); });
    at(c, 300, 320, -0.78, () => { c.fillStyle = steel(c, -260, -40, 260, 40); c.beginPath(); c.roundRect(-250, -34, 400, 68, 30); c.fill(); c.beginPath(); c.arc(180, 0, 92, 0, TAU); c.fill(); poly(c, [[170, -34], [290, -34], [290, 34], [170, 34]], P.bg); line(c, -220, -18, 110, -18, 8, '#ffffff'); });
    sparks(c, P, R, 300, 320, 26, 280); halo(c, P, 380, 220, 250, 0.3);
  },
  turret(c, P, R) {
    at(c, 430, 170, 0, () => { c.beginPath(); for (let i = 0; i < 16; i++) { const rr = i % 2 ? 34 : 120, a = (i / 16) * TAU; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fillStyle = P.hot; c.fill(); disc(c, 0, 0, 40, P.core); }); halo(c, P, 430, 170, 240, 0.6);
    at(c, 270, 330, -0.78, () => { c.fillStyle = steel(c, 0, -40, 0, 40); c.fillRect(0, -30, 210, 60); c.fillStyle = '#2a3148'; c.fillRect(190, -40, 34, 80); });
    c.fillStyle = steel(c, 150, 240, 390, 430); c.beginPath(); c.arc(270, 350, 110, Math.PI, TAU); c.fill(); poly(c, [[130, 350], [410, 350], [440, 440], [100, 440]], '#3c4866'); poly(c, [[130, 350], [410, 350], [414, 366], [126, 366]], P.mid);
    line(c, 150, 440, 100, 560, 22, '#2a3148'); line(c, 390, 440, 440, 560, 22, '#2a3148'); line(c, 270, 440, 270, 560, 22, '#3c4866');
  },
  trap(c, P, R) {
    c.fillStyle = '#2a3148'; c.beginPath(); c.ellipse(300, 430, 240, 60, 0, 0, TAU); c.fill(); c.fillStyle = P.deep; c.beginPath(); c.ellipse(300, 424, 150, 34, 0, 0, TAU); c.fill();
    const jaw = (side) => at(c, 300, 420, 0, () => { c.scale(side, 1); c.fillStyle = steel(c, 0, -330, 240, 0); c.beginPath(); c.moveTo(20, -10); c.quadraticCurveTo(250, -40, 240, -290); c.lineTo(205, -280); c.quadraticCurveTo(205, -70, 20, -44); c.closePath(); c.fill(); for (let i = 0; i < 6; i++) { const t = i / 5, x = 60 + t * 150, y = -50 - t * t * 210; poly(c, [[x - 4, y - 18], [x - 62, y - 6 - t * 30], [x + 4, y + 22]], '#ffffff'); } });
    jaw(1); jaw(-1); disc(c, 300, 424, 30, P.hot); halo(c, P, 300, 300, 300, 0.35); sparks(c, P, R, 300, 150, 16, 120);
  },
  smoke(c, P, R) {
    for (let i = 0; i < 46; i++) { const t = i / 46, a = R() * TAU, d = R() * 210 * (1 - t * 0.4), r = 96 - t * 56 + R() * 30; disc(c, 300 + Math.cos(a) * d - t * 50, 330 + Math.sin(a) * d * 0.8 - t * 80, r, [P.deep, P.deep, P.mid, P.hot][Math.min(3, Math.floor(t * 4.4))]); }
    for (let i = 0; i < 6; i++) disc(c, 170 + R() * 160, 150 + R() * 130, 22 + R() * 30, P.core); halo(c, P, 260, 260, 320, 0.25);
  },
  roar(c, P, R) {
    c.lineCap = 'round'; for (let i = 0; i < 6; i++) { c.strokeStyle = [P.core, P.hot, P.hot, P.mid, P.mid, P.deep][i]; c.lineWidth = 16 + i * 7; c.beginPath(); c.arc(110, 320, 90 + i * 74, -0.72, 0.72); c.stroke(); }
    at(c, 110, 320, 0, () => { c.beginPath(); for (let i = 0; i < 14; i++) { const rr = i % 2 ? 26 : 70, a = (i / 14) * TAU; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fillStyle = P.core; c.fill(); }); halo(c, P, 130, 320, 280, 0.5);
  },
  phoenix(c, P, R) {
    rays(c, P, R, 300, 300, 14, 0.2);
    const wing = (side) => layers(P).forEach((col, k) => { for (let i = 0; i < 7; i++) at(c, 300, 330, 0, () => { c.scale(side, 1); c.rotate(-1.25 + i * 0.27); const l = (250 - k * 44) * (1 - Math.abs(i - 2) * 0.07); poly(c, [[20, -16], [l, -34 + k * 6], [l + 34, 0], [l - 30, 22 - k * 4], [20, 16]], col); }); });
    wing(1); wing(-1);
    nested(c, P, 300, 420, () => { c.moveTo(0, 190); c.bezierCurveTo(-70, 60, -60, -90, 0, -170); c.bezierCurveTo(60, -90, 70, 60, 0, 190); }, [1, 0.84, 0.66, 0.44]);
    disc(c, 300, 222, 40, P.hot); poly(c, [[300, 150], [318, 196], [282, 196]], P.core); poly(c, [[326, 222], [372, 236], [326, 244]], P.core); halo(c, P, 300, 320, 340, 0.5); sparks(c, P, R, 300, 300, 30, 300);
  },
  mace(c, P, R) {
    at(c, 300, 320, -0.78, () => { c.fillStyle = lin(c, 0, -20, 0, 20, ['#b08a5a', '#3c2a1c']); c.fillRect(-300, -17, 330, 34); for (let i = 0; i < 10; i++) at(c, 110, 0, (i / 10) * TAU, () => poly(c, [[70, -30], [158, 0], [70, 30]], i % 2 ? '#9aa8c4' : '#ffffff')); c.fillStyle = steel(c, 20, -90, 200, 90); c.beginPath(); c.arc(110, 0, 92, 0, TAU); c.fill(); disc(c, 84, -30, 22, '#ffffff'); });
    c.lineCap = 'round'; for (let i = 0; i < 3; i++) { c.strokeStyle = [P.hot, P.mid, P.deep][i]; c.lineWidth = 14; c.beginPath(); c.arc(378, 242, 150 + i * 46, -1.9, 0.35); c.stroke(); } halo(c, P, 400, 230, 260, 0.4);
  },
  leaf(c, P, R) {
    const leaf = (x, y, s, rot) => at(c, x, y, rot, () => { c.beginPath(); c.moveTo(0, 250); c.quadraticCurveTo(-210, 20, 0, -250); c.quadraticCurveTo(210, 20, 0, 250); c.fillStyle = lin(c, -120, -200, 120, 200, [P.hot, P.mid, P.deep]); c.fill(); line(c, 0, 240, 0, -220, 9, P.core); for (let i = 0; i < 5; i++) { const yy = 150 - i * 76; line(c, 0, yy, 78 - i * 9, yy - 62, 5, P.core); line(c, 0, yy, -78 + i * 9, yy - 62, 5, P.core); } }, s);
    for (let i = 0; i < 7; i++) leaf(60 + R() * 480, 70 + R() * 500, 0.14 + R() * 0.14, R() * TAU); leaf(300, 310, 1, 0.5); halo(c, P, 300, 300, 320, 0.35);
  },
  hammer(c, P, R) {
    at(c, 370, 420, 0, () => { c.beginPath(); for (let i = 0; i < 18; i++) { const rr = i % 2 ? 50 : 170 + (i % 4) * 22, a = (i / 18) * TAU; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fillStyle = P.mid; c.fill(); c.scale(0.6, 0.6); c.beginPath(); for (let i = 0; i < 18; i++) { const rr = i % 2 ? 50 : 170, a = (i / 18) * TAU + 0.2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fillStyle = P.core; c.fill(); });
    at(c, 280, 280, 0.72, () => { c.fillStyle = lin(c, 0, -20, 0, 20, ['#b08a5a', '#3c2a1c']); c.fillRect(-330, -18, 330, 36); poly(c, [[-20, -124], [136, -124], [136, 124], [-20, 124]], '#1a2030'); c.fillStyle = steel(c, 0, -110, 120, 110); c.fillRect(-8, -112, 132, 224); poly(c, [[-8, -112], [124, -112], [124, -84], [-8, -84]], '#ffffff'); });
    halo(c, P, 370, 420, 280, 0.45); sparks(c, P, R, 370, 420, 30, 240);
  },
};

// ───── finishing pass ─────
let strokes = null;
function brushStrokes(w, h) {
  if (strokes) return strokes;
  strokes = document.createElement('canvas'); strokes.width = w; strokes.height = h; const b = strokes.getContext('2d'); const R = seeded(99);
  b.fillStyle = '#808080'; b.fillRect(0, 0, w, h); b.globalAlpha = 0.5; b.lineCap = 'round';
  for (let i = 0; i < 1800; i++) { const x = R() * w, y = R() * h, len = 9 + R() * 28, a = -0.35 + (R() - 0.5) * 0.3, v = 100 + R() * 56; b.strokeStyle = `rgb(${v},${v},${v})`; b.lineWidth = 1.4 + R() * 3; b.beginPath(); b.moveTo(x, y); b.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); b.stroke(); }
  return strokes;
}
function finish(c, w, h) {
  const im = c.getImageData(0, 0, w, h), d = im.data, st = 255 / 5;
  for (let i = 0; i < d.length; i += 4) { d[i] = Math.round(d[i] / st) * st * 0.6 + d[i] * 0.4; d[i + 1] = Math.round(d[i + 1] / st) * st * 0.6 + d[i + 1] * 0.4; d[i + 2] = Math.round(d[i + 2] / st) * st * 0.6 + d[i + 2] * 0.4; }
  c.putImageData(im, 0, 0);
  c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.55; c.drawImage(brushStrokes(w, h), 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const v = c.createRadialGradient(w / 2, h * 0.4, w * 0.36, w / 2, h * 0.4, w * 1.03); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,20,10,0.5)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
}

// ───── public ─────
const cache = new Map();
/** The painted picture of a card, as an image URL. Painted once per card, then reused. */
export function cardArt(id) {
  let url = cache.get(id); if (url) return url;
  const card = CARDS[id]; const w = Math.round(W * OUT), h = Math.round(H * OUT);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d', { willReadFrequently: true });
  const P = PAL[card.el] || PAL[card.cat] || PAL.special; const seed = hash(id); const R = seeded(seed);
  c.save(); c.scale(OUT, OUT);
  backdrop(c, P, R);
  if (seed % 2 && !['shield', 'heart', 'cross', 'skull', 'anvil', 'turret', 'trap', 'phoenix'].includes(card.icon)) { c.translate(W, 0); c.scale(-1, 1); } // same picture, other way round
  (PIC[card.icon] || PIC.star)(c, P, R, card);
  c.restore(); finish(c, w, h);
  url = cv.toDataURL('image/jpeg', 0.86); cache.set(id, url); return url;
}

// ───── item pictures ─────
// Equipment, potions and materials are painted the same way as the cards, as a small square: the object in
// steel, wood or leather, lit by the colour of its rarity (or of the potion). Painted once per look, then reused.
const S = 600;
const mix = (hex, to, k) => { const n = parseInt(hex.slice(1), 16), a = [n >> 16, (n >> 8) & 255, n & 255]; return a.map((v, i) => Math.round(v + (to[i] - v) * k)); };
const css = (a) => `rgb(${a.join(',')})`;
function palOf(hex) { const m = mix(hex, [0, 0, 0], 0); return { bg: css(mix(hex, [8, 6, 10], 0.93)), deep: css(mix(hex, [10, 8, 14], 0.62)), mid: css(m), hot: css(mix(hex, [255, 255, 255], 0.45)), core: css(mix(hex, [255, 255, 255], 0.86)), rgb: m.join(',') }; }
const wood = (c, x1, y1, x2, y2) => lin(c, x1, y1, x2, y2, ['#c49a64', '#7a5230', '#3c2616']);
const leather = (c, x1, y1, x2, y2) => lin(c, x1, y1, x2, y2, ['#c89868', '#8a5a34', '#40281a']);
const gold = (c, x1, y1, x2, y2) => lin(c, x1, y1, x2, y2, ['#fff3c0', '#e0a834', '#6a4410']);
const shape = (c, col, draw) => { c.beginPath(); draw(); c.closePath(); c.fillStyle = col; c.fill(); };
const ITEM = {
  sword(c, P) {
    at(c, 300, 310, 0.72, () => {
      poly(c, [[-30, 110], [30, 110], [24, -200], [0, -262], [-24, -200]], steel(c, -30, 0, 30, 0)); poly(c, [[0, 110], [30, 110], [24, -200], [0, -262]], 'rgba(16,24,52,0.4)'); line(c, -8, 90, -8, -190, 5, 'rgba(255,255,255,0.7)');
      shape(c, gold(c, 0, 104, 0, 140), () => { c.moveTo(-96, 104); c.lineTo(96, 104); c.lineTo(84, 138); c.lineTo(-84, 138); }); c.fillStyle = leather(c, -16, 0, 16, 0); c.fillRect(-15, 138, 30, 88); ball(c, P, 0, 246, 28);
    });
  },
  dagger(c, P) {
    at(c, 300, 300, -0.75, () => {
      shape(c, steel(c, -30, 0, 34, 0), () => { c.moveTo(-26, 60); c.lineTo(30, 60); c.quadraticCurveTo(40, -110, -6, -230); c.quadraticCurveTo(-30, -90, -26, 60); }); line(c, -8, 40, -4, -150, 5, 'rgba(255,255,255,0.7)');
      shape(c, gold(c, 0, 56, 0, 86), () => { c.moveTo(-70, 56); c.lineTo(70, 56); c.lineTo(56, 86); c.lineTo(-56, 86); }); c.fillStyle = leather(c, -14, 0, 14, 0); c.fillRect(-14, 86, 28, 96); ball(c, P, 0, 200, 24);
    });
  },
  mace(c, P) {
    at(c, 300, 300, 0.7, () => {
      c.fillStyle = wood(c, -16, 0, 16, 0); c.fillRect(-15, -40, 30, 290); ball(c, P, 0, 250, 22);
      for (let i = 0; i < 8; i++) at(c, 0, -130, (i / 8) * TAU, () => poly(c, [[-26, -70], [0, -150], [26, -70]], i % 2 ? '#9aa8c4' : '#eef2ff'));
      c.fillStyle = steel(c, -80, -210, 80, -50); c.beginPath(); c.arc(0, -130, 92, 0, TAU); c.fill(); disc(c, -30, -160, 20, '#ffffff'); c.strokeStyle = P.mid; c.lineWidth = 12; c.beginPath(); c.arc(0, -130, 60, 0, TAU); c.stroke();
    });
  },
  hammer(c, P) {
    at(c, 300, 300, 0.7, () => {
      c.fillStyle = wood(c, -16, 0, 16, 0); c.fillRect(-16, -60, 32, 310); ball(c, P, 0, 250, 22);
      poly(c, [[-150, -210], [150, -210], [150, -60], [-150, -60]], '#1a2030'); c.fillStyle = steel(c, 0, -200, 0, -70); c.fillRect(-140, -200, 280, 130); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(-140, -200, 280, 22);
      c.fillStyle = P.mid; c.fillRect(-36, -206, 72, 142); c.fillStyle = P.hot; c.fillRect(-36, -206, 72, 20);
    });
  },
  staff(c, P, R) {
    at(c, 300, 300, 0.5, () => {
      c.fillStyle = wood(c, -12, 0, 12, 0); c.fillRect(-12, -150, 24, 410);
      for (const sd of [-1, 1]) shape(c, gold(c, 0, -260, 0, -140), () => { c.moveTo(sd * 10, -140); c.quadraticCurveTo(sd * 96, -180, sd * 70, -290); c.quadraticCurveTo(sd * 60, -210, sd * 10, -170); });
      ball(c, P, 0, -226, 54); disc(c, -18, -246, 12, '#ffffff');
    });
    halo(c, P, 410, 100, 220, 0.6); sparks(c, P, R, 410, 100, 14, 120);
  },
  bow(c, P) {
    c.lineCap = 'round'; c.strokeStyle = '#2a180e'; c.lineWidth = 40; c.beginPath(); c.arc(130, 300, 290, -0.98, 0.98); c.stroke();
    c.strokeStyle = wood(c, 250, 60, 430, 540); c.lineWidth = 28; c.beginPath(); c.arc(130, 300, 290, -0.98, 0.98); c.stroke();
    const ex = 130 + Math.cos(0.98) * 290, ey = Math.sin(0.98) * 290; line(c, ex, 300 - ey, 200, 300, 4, '#f4ecd8'); line(c, ex, 300 + ey, 200, 300, 4, '#f4ecd8');
    c.strokeStyle = P.mid; c.lineWidth = 32; c.beginPath(); c.arc(130, 300, 290, -0.12, 0.12); c.stroke();
    line(c, 200, 300, 520, 300, 9, '#d8c090'); poly(c, [[560, 300], [506, 274], [518, 300], [506, 326]], steel(c, 500, 270, 560, 330)); poly(c, [[200, 300], [168, 276], [226, 290]], P.hot); poly(c, [[200, 300], [168, 324], [226, 310]], P.mid);
  },
  armor(c, P) {
    shape(c, '#141a28', () => { c.moveTo(150, 130); c.lineTo(450, 130); c.lineTo(486, 250); c.lineTo(430, 290); c.lineTo(420, 500); c.lineTo(180, 500); c.lineTo(170, 290); c.lineTo(114, 250); });
    shape(c, steel(c, 160, 120, 440, 500), () => { c.moveTo(164, 142); c.lineTo(250, 142); c.quadraticCurveTo(300, 200, 350, 142); c.lineTo(436, 142); c.lineTo(470, 244); c.lineTo(418, 280); c.lineTo(408, 488); c.lineTo(192, 488); c.lineTo(182, 280); c.lineTo(130, 244); });
    poly(c, [[300, 190], [408, 300], [408, 488], [300, 488]], 'rgba(16,24,52,0.3)'); line(c, 300, 196, 300, 480, 8, 'rgba(20,28,52,0.6)');
    c.fillStyle = P.mid; c.fillRect(192, 400, 216, 26); c.fillStyle = P.hot; c.fillRect(192, 400, 216, 8); ball(c, P, 300, 290, 34);
    for (const x of [150, 450]) { disc(c, x, 180, 62, '#141a28'); c.fillStyle = steel(c, x - 50, 130, x + 50, 230); c.beginPath(); c.arc(x, 180, 52, 0, TAU); c.fill(); disc(c, x - 16, 162, 12, '#ffffff'); }
  },
  vest(c, P) {
    shape(c, '#20140c', () => { c.moveTo(170, 120); c.lineTo(430, 120); c.lineTo(470, 230); c.lineTo(424, 262); c.lineTo(432, 500); c.lineTo(168, 500); c.lineTo(176, 262); c.lineTo(130, 230); });
    shape(c, leather(c, 170, 120, 430, 500), () => { c.moveTo(182, 134); c.lineTo(258, 134); c.lineTo(300, 220); c.lineTo(342, 134); c.lineTo(418, 134); c.lineTo(454, 224); c.lineTo(410, 254); c.lineTo(418, 486); c.lineTo(182, 486); c.lineTo(190, 254); c.lineTo(146, 224); });
    line(c, 300, 224, 300, 480, 7, '#2a180e'); for (let i = 0; i < 5; i++) { line(c, 276, 250 + i * 46, 324, 272 + i * 46, 6, '#f0e0c0'); line(c, 324, 250 + i * 46, 276, 272 + i * 46, 6, '#f0e0c0'); }
    c.fillStyle = P.mid; c.fillRect(182, 440, 236, 22); poly(c, [[182, 134], [258, 134], [246, 160], [190, 160]], P.hot); poly(c, [[418, 134], [342, 134], [354, 160], [410, 160]], P.mid);
  },
  robe(c, P) {
    shape(c, '#0e0a14', () => { c.moveTo(214, 96); c.lineTo(386, 96); c.lineTo(500, 250); c.lineTo(440, 300); c.lineTo(470, 530); c.lineTo(130, 530); c.lineTo(160, 300); c.lineTo(100, 250); });
    shape(c, lin(c, 160, 100, 440, 520, [P.hot, P.mid, P.deep]), () => { c.moveTo(222, 110); c.lineTo(378, 110); c.lineTo(482, 246); c.lineTo(424, 290); c.lineTo(454, 516); c.lineTo(146, 516); c.lineTo(176, 290); c.lineTo(118, 246); });
    shape(c, 'rgba(10,6,16,0.75)', () => { c.moveTo(250, 110); c.lineTo(350, 110); c.lineTo(300, 230); }); c.fillStyle = gold(c, 0, 300, 0, 330); c.fillRect(190, 304, 220, 24);
    line(c, 300, 328, 286, 500, 9, 'rgba(255,255,255,0.35)'); line(c, 240, 330, 206, 510, 7, 'rgba(0,0,0,0.3)'); line(c, 360, 330, 394, 510, 7, 'rgba(0,0,0,0.3)');
  },
  ring(c, P) {
    c.lineWidth = 62; c.strokeStyle = '#2a1a08'; c.beginPath(); c.arc(300, 350, 140, 0, TAU); c.stroke(); c.lineWidth = 48; c.strokeStyle = gold(c, 160, 210, 440, 490); c.beginPath(); c.arc(300, 350, 140, 0, TAU); c.stroke();
    c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(300, 350, 152, 3.5, 4.6); c.stroke();
    poly(c, [[300, 96], [372, 168], [300, 250], [228, 168]], '#2a1a08'); poly(c, [[300, 110], [360, 168], [300, 236], [240, 168]], P.mid); poly(c, [[300, 110], [360, 168], [300, 168]], P.hot); poly(c, [[300, 110], [240, 168], [300, 168]], P.core); halo(c, P, 300, 168, 170, 0.6);
  },
  amulet(c, P) {
    c.lineWidth = 12; c.strokeStyle = gold(c, 120, 60, 480, 300); c.setLineDash([22, 12]); c.beginPath(); c.moveTo(110, 60); c.quadraticCurveTo(300, 380, 490, 60); c.stroke(); c.setLineDash([]);
    poly(c, [[300, 210], [404, 360], [300, 520], [196, 360]], '#2a1a08'); poly(c, [[300, 228], [388, 360], [300, 500], [212, 360]], gold(c, 212, 228, 388, 500));
    poly(c, [[300, 268], [360, 360], [300, 456], [240, 360]], P.mid); poly(c, [[300, 268], [360, 360], [300, 360]], P.hot); poly(c, [[300, 268], [240, 360], [300, 360]], P.core); halo(c, P, 300, 360, 200, 0.6);
  },
  boots(c, P) {
    const boot = (ox, oy, s) => at(c, ox, oy, 0, () => {
      shape(c, '#20140c', () => { c.moveTo(-90, -200); c.lineTo(50, -200); c.lineTo(56, 20); c.quadraticCurveTo(190, 50, 200, 130); c.lineTo(200, 170); c.lineTo(-96, 170); });
      shape(c, leather(c, -90, -200, 190, 160), () => { c.moveTo(-78, -188); c.lineTo(38, -188); c.lineTo(44, 30); c.quadraticCurveTo(176, 58, 188, 130); c.lineTo(-84, 130); });
      c.fillStyle = '#1a100a'; c.fillRect(-90, 130, 284, 32); c.fillStyle = P.mid; c.fillRect(-84, -188, 128, 36); c.fillStyle = P.hot; c.fillRect(-84, -188, 128, 12); line(c, -50, -120, -46, 100, 8, 'rgba(255,255,255,0.3)');
    }, s);
    boot(210, 300, 0.9); boot(330, 350, 1.05);
  },
  potion(c, P) {
    c.fillStyle = wood(c, 268, 60, 332, 60); c.fillRect(266, 62, 68, 60); c.fillStyle = 'rgba(220,235,255,0.5)'; c.fillRect(256, 116, 88, 100); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(244, 108, 112, 20);
    disc(c, 300, 370, 176, 'rgba(210,228,255,0.35)'); c.save(); c.beginPath(); c.arc(300, 370, 160, 0, TAU); c.clip(); c.fillStyle = lin(c, 0, 280, 0, 540, [P.hot, P.mid, P.deep]); c.fillRect(100, 290, 400, 300); c.fillStyle = P.core; c.fillRect(100, 290, 400, 12);
    for (const [x, y, r] of [[250, 400, 16], [340, 450, 22], [300, 350, 10], [370, 380, 12]]) disc(c, x, y, r, 'rgba(255,255,255,0.35)'); c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.arc(300, 370, 140, 3.5, 4.4); c.stroke(); halo(c, P, 300, 400, 230, 0.5);
  },
  bomb(c, P, R) {
    disc(c, 290, 370, 176, '#06070a'); c.fillStyle = lin(c, 150, 220, 430, 520, ['#5a6274', '#1c2030', '#06070a']); c.beginPath(); c.arc(290, 370, 164, 0, TAU); c.fill(); disc(c, 232, 306, 30, 'rgba(255,255,255,0.55)');
    c.fillStyle = '#3a4050'; c.fillRect(256, 180, 68, 44); c.strokeStyle = '#c8a070'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(290, 184); c.quadraticCurveTo(330, 100, 420, 110); c.stroke();
    for (let i = 0; i < 10; i++) at(c, 430, 108, (i / 10) * TAU, () => poly(c, [[-12, 0], [0, -(40 + (i % 2) * 34)], [12, 0]], i % 2 ? P.hot : P.core)); disc(c, 430, 108, 20, P.core); halo(c, P, 430, 108, 200, 0.8); sparks(c, P, R, 430, 108, 16, 110);
  },
  gem(c, P) { // a raw material
    poly(c, [[300, 110], [470, 250], [400, 500], [200, 500], [130, 250]], P.deep); poly(c, [[300, 130], [448, 254], [300, 300]], P.hot); poly(c, [[300, 130], [152, 254], [300, 300]], P.core); poly(c, [[152, 254], [300, 300], [210, 486]], P.mid); poly(c, [[448, 254], [300, 300], [390, 486]], P.mid); poly(c, [[300, 300], [390, 486], [210, 486]], P.hot);
    line(c, 300, 130, 300, 300, 4, 'rgba(255,255,255,0.6)'); halo(c, P, 300, 300, 260, 0.45);
  },
};
const itemCache = new Map();
/** The painted picture of an item, as an image URL: `icon` picks the object, `color` its light. */
export function itemArt(icon, color = '#c8c0b0') {
  const key = icon + color; let url = itemCache.get(key); if (url) return url;
  const w = 132; const cv = document.createElement('canvas'); cv.width = w; cv.height = w; const c = cv.getContext('2d', { willReadFrequently: true });
  const P = palOf(/^#[0-9a-f]{6}$/i.test(color) ? color : '#c8c0b0'); const R = seeded(hash(key));
  c.save(); c.scale(w / S, w / S); c.fillStyle = P.bg; c.fillRect(0, 0, S, S); glow(c, 300, 300, 420, P.rgb, 0.5);
  (ITEM[icon] || ITEM.gem)(c, P, R); c.restore(); finish(c, w, w);
  url = cv.toDataURL('image/jpeg', 0.88); itemCache.set(key, url); return url;
}
