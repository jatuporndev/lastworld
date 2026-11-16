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

// ───── scenes: a picture of its own for every card that would otherwise share one ─────
// Small objects (MO) drawn round their own origin, and one scene per card (SCENE) that arranges them.
const use = (c, P, R, name, x = 300, y = 300, s = 1, rot = 0, card = {}) => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.translate(-300, -300); PIC[name](c, P, R, card); c.restore(); };
const dag = (c, P, R, x, y, s, theta) => use(c, P, R, 'dagger', x, y, s, theta + 0.78); // a dagger pointing along theta
const tonguePath = (c) => { c.moveTo(0, 0); c.bezierCurveTo(-150, 0, -170, -150, -70, -240); c.bezierCurveTo(-60, -180, -20, -170, -12, -200); c.bezierCurveTo(-40, -300, 30, -370, 70, -420); c.bezierCurveTo(56, -320, 170, -250, 160, -120); c.bezierCurveTo(152, -40, 90, 0, 0, 0); };
const heartPath = (c) => { c.moveTo(0, 190); c.bezierCurveTo(-300, -10, -210, -250, 0, -110); c.bezierCurveTo(210, -250, 300, -10, 0, 190); };
const INK = '#1a1410', IRON = '#1a2030';
const MO = {
  flame(c, P, x, y, s = 1) { nested(c, P, x, y, () => tonguePath(c), [1, 0.8, 0.58, 0.34].map((k) => k * s)); },
  heart(c, P, x, y, s = 1) { nested(c, P, x, y, () => heartPath(c), [1, 0.86, 0.66, 0.001].map((k) => k * s)); at(c, x, y, 0, () => { c.fillStyle = P.core; c.beginPath(); c.ellipse(-78, -70, 42, 26, -0.6, 0, TAU); c.fill(); }, s); },
  plus(c, P, x, y, s = 1) { nested(c, P, x, y, () => { c.rect(-62, -210, 124, 420); c.rect(-210, -62, 420, 124); }, [1, 0.86, 0.7, 0.5].map((k) => k * s)); },
  twinkle(c, x, y, s, col) { poly(c, [[x, y - s * 2.2], [x + s * 0.5, y - s * 0.5], [x + s * 2.2, y], [x + s * 0.5, y + s * 0.5], [x, y + s * 2.2], [x - s * 0.5, y + s * 0.5], [x - s * 2.2, y], [x - s * 0.5, y - s * 0.5]], col); },
  rings(c, P, x, y, rx, n = 3) { c.lineCap = 'round'; for (let i = 0; i < n; i++) { c.strokeStyle = [P.hot, P.mid, P.deep][i % 3]; c.globalAlpha = 0.9 - i * 0.2; c.lineWidth = 13 - i * 2; c.beginPath(); c.ellipse(x, y, rx * (1 - i * 0.26), rx * 0.3 * (1 - i * 0.26), 0, 0, TAU); c.stroke(); } c.globalAlpha = 1; },
  circles(c, P, x, y, r0, n = 3, gap = 50) { for (let i = 0; i < n; i++) { c.strokeStyle = [P.hot, P.mid, P.deep][i % 3]; c.lineWidth = 9 - i * 2; c.beginPath(); c.arc(x, y, r0 + i * gap, 0, TAU); c.stroke(); } },
  arcs(c, P, x, y, r0, a0, a1, n = 3, gap = 46) { c.lineCap = 'round'; for (let i = 0; i < n; i++) { c.strokeStyle = [P.hot, P.mid, P.deep][i % 3]; c.lineWidth = 15; c.beginPath(); c.arc(x, y, r0 + i * gap, a0, a1); c.stroke(); } },
  burst(c, P, R, x, y, r, n = 14) { const sp = []; for (let i = 0; i < n * 2; i++) sp.push(i % 2 ? 0.4 + R() * 0.12 : 0.75 + R() * 0.45); layers(P).forEach((col, k) => { const rr = r * [1, 0.78, 0.55, 0.3][k]; c.beginPath(); sp.forEach((m, i) => { const a = (i / sp.length) * TAU; c.lineTo(x + Math.cos(a) * rr * m, y + Math.sin(a) * rr * m); }); c.closePath(); c.fillStyle = col; c.fill(); }); },
  shards(c, R, x, y, r, n, cols, size = 1) { for (let i = 0; i < n; i++) { const a = (i / n) * TAU + R() * 0.5, d = r * (0.7 + R() * 0.5), s = (14 + R() * 26) * size; at(c, x + Math.cos(a) * d, y + Math.sin(a) * d, a + (R() - 0.5), () => { poly(c, [[-s, -s * 0.45], [s * 1.3, 0], [-s * 0.6, s * 0.55]], cols[i % cols.length]); }); } },
  speed(c, P, R, x, y, rot, n = 12, len = 300, spread = 240) { at(c, x, y, rot, () => { for (let i = 0; i < n; i++) { const yy = (R() - 0.5) * spread, xx = -R() * len * 0.5; line(c, xx - 90 - R() * len, yy, xx, yy, 4 + R() * 9, [P.deep, P.mid, P.hot][i % 3]); } }); },
  dart(c, P, R, x, y, rot, s = 1) { at(c, x, y, rot, () => { for (let i = 0; i < 12; i++) { const yy = (R() - 0.5) * 130; line(c, -480 + R() * 140, yy, -220 + R() * 120, yy, 4 + R() * 9, [P.deep, P.mid, P.hot][i % 3]); } layers(P).forEach((col, k) => { const w = [90, 64, 40, 18][k], l = [280, 250, 215, 170][k]; c.beginPath(); c.moveTo(l, 0); c.quadraticCurveTo(40, -w, -l * 1.1, -w * 0.3); c.lineTo(-l * 0.7, 0); c.lineTo(-l * 1.1, w * 0.3); c.quadraticCurveTo(40, w, l, 0); c.fillStyle = col; c.fill(); }); }, s); },
  flask(c, P, x, y, s = 1, rot = 0) { at(c, x, y, rot, () => { c.fillStyle = IRON; c.beginPath(); c.arc(0, 60, 152, 0, TAU); c.fill(); c.fillRect(-50, -172, 100, 130); c.fillStyle = lin(c, -140, -60, 140, 200, [P.hot, P.mid, P.deep]); c.beginPath(); c.arc(0, 60, 134, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-36, -160, 72, 120); c.fillStyle = '#b08a5a'; c.fillRect(-44, -206, 88, 46); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-58, 10, 24, 54, 0.5, 0, TAU); c.fill(); }, s); },
  pillar(c, P, x, y, w, h) { const g = c.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, `rgba(${P.rgb},0)`); g.addColorStop(0.3, P.mid); g.addColorStop(0.5, P.core); g.addColorStop(0.7, P.mid); g.addColorStop(1, `rgba(${P.rgb},0)`); c.fillStyle = g; c.fillRect(x - w, y - h, w * 2, h); c.fillStyle = P.core; c.fillRect(x - w * 0.16, y - h, w * 0.32, h); },
  boot(c, P, x, y, s = 1, rot = 0) { at(c, x, y, rot, () => { poly(c, [[-72, -212], [52, -212], [62, -32], [192, 28], [207, 104], [-92, 104], [-82, -20]], INK); c.fillStyle = lin(c, -80, -200, 180, 100, [P.hot, P.mid, P.deep]); c.beginPath(); [[-58, -198], [38, -198], [48, -22], [178, 40], [190, 84], [-76, 84], [-68, -16]].forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.fill(); poly(c, [[-76, 78], [190, 78], [192, 100], [-90, 100]], '#3c2a1c'); poly(c, [[-60, -198], [40, -198], [42, -160], [-62, -160]], P.core); }, s); },
  prints(c, P, pts) { pts.forEach(([x, y, a], i) => at(c, x, y, a, () => { c.fillStyle = i === pts.length - 1 ? P.core : [P.deep, P.mid, P.hot][Math.min(2, i)]; c.beginPath(); c.ellipse(0, -14, 27, 42, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, 46, 21, 18, 0, 0, TAU); c.fill(); })); },
  spike(c, P, x, y, h, w, lean = 0) { const tx = x + lean * h; poly(c, [[x - w, y], [tx, y - h], [x, y]], P.hot); poly(c, [[x + w, y], [tx, y - h], [x, y]], P.deep); poly(c, [[x - w * 0.4, y], [tx, y - h], [x - w, y]], P.core); },
  rock(c, P, x, y, s, rot = 0) { at(c, x, y, rot, () => { poly(c, [[-100, -30], [-40, -96], [56, -84], [108, -10], [70, 80], [-50, 92]], P.deep); poly(c, [[-100, -30], [-40, -96], [56, -84], [10, -20]], P.hot); poly(c, [[-100, -30], [10, -20], [-50, 92]], P.mid); poly(c, [[-40, -96], [56, -84], [0, -66]], P.core); }, s); },
  wave(c, P, R, x, y, s = 1) { at(c, x, y, 0, () => { layers(P).forEach((col, k) => { const o = k * 30; c.beginPath(); c.moveTo(-340, 260); c.bezierCurveTo(-270, -60 + o, -130, -270 + o, 90, -260 + o); c.bezierCurveTo(230, -250 + o, 290, -130 + o, 250, -30 + o * 0.5); c.bezierCurveTo(232, -120 + o, 130, -150 + o, 70, -90 + o); c.bezierCurveTo(10, -20 + o, 60, 130, 340, 260); c.closePath(); c.fillStyle = col; c.fill(); }); for (let i = 0; i < 30; i++) { const a = -2.7 + R() * 2.5, d = 260 + R() * 70; disc(c, 40 + Math.cos(a) * d * 0.9, 30 + Math.sin(a) * d, 5 + R() * 13, '#ffffff'); } }, s); },
  reticle(c, P, x, y, r, col = P.hot) { c.lineCap = 'butt'; c.strokeStyle = col; c.lineWidth = r * 0.075; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.lineWidth = r * 0.045; c.beginPath(); c.arc(x, y, r * 0.6, 0, TAU); c.stroke(); for (let i = 0; i < 4; i++) at(c, x, y, (i * TAU) / 4, () => poly(c, [[r * 0.78, -r * 0.05], [r * 1.28, -r * 0.05], [r * 1.28, r * 0.05], [r * 0.78, r * 0.05]], col)); disc(c, x, y, r * 0.09, P.core); },
  drop(c, P, x, y, s, rot = 0) { at(c, x, y, rot, () => { c.beginPath(); c.moveTo(0, -120); c.bezierCurveTo(90, 0, 80, 90, 0, 90); c.bezierCurveTo(-80, 90, -90, 0, 0, -120); c.fillStyle = lin(c, -60, -100, 60, 90, [P.hot, P.mid, P.deep]); c.fill(); c.fillStyle = P.core; c.beginPath(); c.ellipse(-26, 30, 12, 26, 0.3, 0, TAU); c.fill(); }, s); },
  clock(c, P, x, y, r, hand = 1) { disc(c, x, y, r * 1.13, IRON); disc(c, x, y, r, P.core); disc(c, x, y, r * 0.86, lin(c, x - r, y - r, x + r, y + r, [P.hot, P.mid])); for (let i = 0; i < 12; i++) at(c, x, y, (i / 12) * TAU, () => poly(c, [[r * 0.64, -r * 0.035], [r * 0.82, -r * 0.035], [r * 0.82, r * 0.035], [r * 0.64, r * 0.035]], P.bg)); line(c, x, y, x, y - r * 0.6, r * 0.08, P.bg); line(c, x, y, x + Math.cos(hand) * r * 0.42, y + Math.sin(hand) * r * 0.42, r * 0.1, P.bg); disc(c, x, y, r * 0.09, P.core); },
  magnet(c, P, x, y, s, rot = 0) { at(c, x, y, rot, () => { c.lineCap = 'butt'; c.strokeStyle = IRON; c.lineWidth = 118; c.beginPath(); c.moveTo(-130, 196); c.lineTo(-130, -20); c.arc(0, -20, 130, Math.PI, 0); c.lineTo(130, 196); c.stroke(); c.strokeStyle = '#d0482e'; c.lineWidth = 92; c.beginPath(); c.moveTo(-130, 110); c.lineTo(-130, -20); c.arc(0, -20, 130, Math.PI, 0); c.lineTo(130, 110); c.stroke(); c.fillStyle = '#e8eef8'; c.fillRect(-176, 100, 92, 86); c.fillRect(84, 100, 92, 86); c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 12; c.beginPath(); c.arc(0, -20, 152, 3.5, 4.6); c.stroke(); }, s); },
  blade(c, P, x, y, s, rot = 0) { at(c, x, y, rot, () => { poly(c, [[-40, 60], [-40, -252], [0, -336], [40, -252], [40, 60]], IRON); poly(c, [[-28, 60], [-28, -246], [0, -312], [0, 60]], '#ffffff'); poly(c, [[28, 60], [28, -246], [0, -312], [0, 60]], '#9aa8c4'); poly(c, [[-124, 50], [124, 50], [108, 96], [-108, 96]], INK); poly(c, [[-116, 56], [116, 56], [102, 90], [-102, 90]], P.hot); poly(c, [[-116, 56], [116, 56], [112, 66], [-112, 66]], P.core); poly(c, [[-18, 92], [18, 92], [18, 196], [-18, 196]], '#3c2a1c'); disc(c, 0, 214, 30, P.mid); }, s); },
  barricade(c, P, x, y, s) { at(c, x, y, 0, () => { for (const [px, a] of [[-156, -0.12], [-52, 0.06], [52, -0.05], [156, 0.1]]) at(c, px, 0, a, () => { poly(c, [[-48, -212], [0, -270], [48, -212], [48, 206], [-48, 206]], INK); poly(c, [[-38, -206], [0, -252], [38, -206], [38, 196], [-38, 196]], '#8a5a34'); poly(c, [[-38, -206], [0, -252], [0, 196], [-38, 196]], '#b88050'); line(c, -18, -150, -14, 150, 4, '#6a4426'); }); c.fillStyle = steel(c, -230, -110, 230, 130); c.fillRect(-240, -104, 480, 52); c.fillRect(-240, 70, 480, 52); for (const px of [-156, -52, 52, 156]) { disc(c, px, -78, 13, IRON); disc(c, px, 96, 13, IRON); } }, s); },
  shroom(c, P, x, y, s, rot = 0) { at(c, x, y, rot, () => { c.fillStyle = lin(c, -40, 0, 40, 0, ['#f4ecd4', '#a89878']); c.beginPath(); c.moveTo(-36, 0); c.quadraticCurveTo(-20, 80, -48, 172); c.lineTo(48, 172); c.quadraticCurveTo(20, 80, 36, 0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-176, 12); c.bezierCurveTo(-166, -176, 166, -176, 176, 12); c.quadraticCurveTo(0, 54, -176, 12); c.fillStyle = lin(c, -100, -140, 100, 30, [P.hot, P.mid, P.deep]); c.fill(); for (const [dx, dy, r] of [[-84, -50, 24], [10, -92, 30], [92, -40, 20], [-10, -22, 14]]) disc(c, dx, dy, r, P.core); }, s); },
  shuriken(c, P, x, y, s, rot = 0) { at(c, x, y, rot, () => { c.strokeStyle = P.hot; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, 216, 0.3, 1.3); c.stroke(); c.beginPath(); c.arc(0, 0, 216, 3.44, 4.44); c.stroke(); for (let i = 0; i < 4; i++) at(c, 0, 0, (i * TAU) / 4, () => { poly(c, [[-6, -52], [200, 0], [-6, 52]], IRON); poly(c, [[0, -40], [184, 0], [0, 0]], '#ffffff'); poly(c, [[0, 40], [184, 0], [0, 0]], '#7a88a8'); }); disc(c, 0, 0, 46, '#9aa8c4'); disc(c, 0, 0, 22, P.bg); }, s); },
  candle(c, P, x, y, s) { at(c, x, y, 0, () => { c.fillStyle = '#5a4630'; c.beginPath(); c.ellipse(0, 214, 116, 28, 0, 0, TAU); c.fill(); c.fillStyle = lin(c, -52, 0, 52, 0, ['#fff6dc', '#c8b48a']); c.fillRect(-52, -40, 104, 252); c.fillStyle = '#fff6dc'; c.beginPath(); c.ellipse(0, -40, 52, 16, 0, 0, TAU); c.fill(); poly(c, [[-52, 0], [-30, 64], [-52, 96]], '#fff6dc'); line(c, 0, -40, 0, -72, 6, INK); }, s); MO.flame(c, P, x - 8 * s, y - 60 * s, 0.44 * s); },
  quiver(c, P, R, x, y, s, rot = 0) { at(c, x, y, rot, () => { for (let i = 0; i < 5; i++) { const px = -70 + i * 35, top = -250 - (i % 2) * 44 - R() * 30; line(c, px, -60, px, top, 9, '#c49a64'); poly(c, [[px, top - 10], [px - 24, top + 30], [px - 24, top + 84], [px, top + 52]], i % 2 ? P.hot : P.core); poly(c, [[px, top - 10], [px + 24, top + 30], [px + 24, top + 84], [px, top + 52]], i % 2 ? P.mid : P.hot); } poly(c, [[-114, -84], [114, -84], [86, 254], [-86, 254]], INK); c.fillStyle = leather(c, -100, -70, 100, 240); c.beginPath(); c.moveTo(-100, -72); c.lineTo(100, -72); c.lineTo(74, 242); c.lineTo(-74, 242); c.closePath(); c.fill(); c.fillStyle = P.mid; c.fillRect(-102, -72, 204, 40); c.fillStyle = P.hot; c.fillRect(-86, 150, 172, 24); }, s); },
  fang(c, P, x, y, s, flip = 1) { at(c, x, y, 0, () => { c.scale(flip, 1); c.beginPath(); c.moveTo(-70, -210); c.quadraticCurveTo(80, -220, 90, -80); c.quadraticCurveTo(86, 100, -10, 230); c.quadraticCurveTo(14, 40, -70, -60); c.closePath(); c.fillStyle = INK; c.fill(); c.beginPath(); c.moveTo(-58, -198); c.quadraticCurveTo(68, -206, 78, -80); c.quadraticCurveTo(76, 80, -4, 196); c.quadraticCurveTo(24, 40, -58, -66); c.closePath(); c.fillStyle = lin(c, -60, -200, 80, 200, ['#ffffff', '#efe6cc', '#a09878']); c.fill(); }, s); },
  rift(c, P, R, x, y, h) { const pts = []; for (let i = 0; i <= 10; i++) pts.push([x + (i % 2 ? 44 : -44) * (0.4 + R()), y - h + (i / 10) * h * 2]); layers(P).forEach((col, k) => { const w = [130, 92, 56, 24][k]; const L = pts.map(([px, py], i) => [px - w * Math.sin((i / 10) * Math.PI), py]), Rr = pts.map(([px, py], i) => [px + w * Math.sin((i / 10) * Math.PI), py]).reverse(); poly(c, [...L, ...Rr], k === 3 ? '#000000' : col); }); },
  feather(c, P, x, y, s, rot = 0) { at(c, x, y, rot, () => { c.beginPath(); c.moveTo(0, 260); c.quadraticCurveTo(-140, 40, -20, -270); c.quadraticCurveTo(140, -40, 0, 260); c.fillStyle = lin(c, -80, -200, 80, 200, [P.core, P.hot, P.mid]); c.fill(); line(c, 4, 310, -14, -244, 8, P.deep); for (let i = 0; i < 7; i++) { const yy = 190 - i * 62; line(c, -2, yy, 62 - i * 5, yy - 52, 4, P.deep); line(c, -2, yy, -62 + i * 4, yy - 46, 4, P.deep); } }, s); },
  kit(c, P, x, y, s) { at(c, x, y, -0.08, () => { c.strokeStyle = INK; c.lineWidth = 26; c.beginPath(); c.arc(0, -126, 84, Math.PI, 0); c.stroke(); c.fillStyle = INK; c.beginPath(); c.roundRect(-222, -132, 444, 304, 32); c.fill(); c.fillStyle = leather(c, -200, -120, 200, 160); c.beginPath(); c.roundRect(-206, -116, 412, 272, 24); c.fill(); disc(c, 0, 20, 98, '#f4efe0'); c.fillStyle = '#c8452e'; c.fillRect(-23, -50, 46, 140); c.fillRect(-70, -3, 140, 46); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-196, -106, 392, 26); }, s); },
  flower(c, P, x, y, s) { at(c, x, y, 0, () => { for (let k = 0; k < 2; k++) for (let i = 0; i < 8; i++) at(c, 0, 0, (i / 8) * TAU + k * 0.39, () => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-96 + k * 30, -130 + k * 30, 0, -256 + k * 86); c.quadraticCurveTo(96 - k * 30, -130 + k * 30, 0, 0); c.fillStyle = k ? P.hot : i % 2 ? P.mid : P.deep; c.fill(); }); disc(c, 0, 0, 62, P.core); disc(c, 0, 0, 36, P.hot); }, s); },
  cards(c, P, x, y, s) { at(c, x, y, 0, () => { for (let i = 0; i < 5; i++) at(c, 0, 140, (i - 2) * 0.3, () => { c.fillStyle = INK; c.beginPath(); c.roundRect(-80, -332, 160, 234, 16); c.fill(); c.fillStyle = [P.deep, P.mid, P.hot, P.mid, P.deep][i]; c.beginPath(); c.roundRect(-68, -320, 136, 210, 12); c.fill(); poly(c, [[0, -262], [28, -215], [0, -168], [-28, -215]], P.core); }); }, s); },
  crack(c, R, x, y, len, rot, col = '#0a0708', w = 12) { at(c, x, y, rot, () => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'miter'; c.lineCap = 'butt'; c.beginPath(); c.moveTo(-len, 0); for (let i = 1; i <= 6; i++) c.lineTo(-len + (i / 6) * len * 2, i === 6 ? 0 : (i % 2 ? 1 : -1) * (14 + R() * 26)); c.stroke(); }); },
  gear(c, P, x, y, r, col, rot = 0) { at(c, x, y, rot, () => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 20; i++) { const rr = i % 2 ? r * 0.8 : r, a = (i / 20) * TAU; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); c.lineTo(Math.cos(a + 0.16) * rr, Math.sin(a + 0.16) * rr); } c.closePath(); c.fill(); disc(c, 0, 0, r * 0.62, 'rgba(255,255,255,0.14)'); disc(c, 0, 0, r * 0.32, P.bg); }); },
  zap(c, P, R, x1, y1, x2, y2, w = 10) { const n = 6, pts = [[x1, y1]], nx = -(y2 - y1), ny = x2 - x1; for (let i = 1; i < n; i++) { const k = (i % 2 ? 1 : -1) * (0.07 + R() * 0.09); pts.push([x1 + ((x2 - x1) * i) / n + nx * k, y1 + ((y2 - y1) * i) / n + ny * k]); } pts.push([x2, y2]); c.lineJoin = 'miter'; c.lineCap = 'round'; for (const [col, ww] of [[P.mid, w * 2.4], [P.hot, w * 1.4], [P.core, w * 0.6]]) { c.strokeStyle = col; c.lineWidth = ww; c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke(); } },
  kite(c, P, x, y, s, rot = 0) { at(c, x, y, rot, () => { const k = (m) => { c.beginPath(); c.moveTo(-150 * m, -200 * m); c.lineTo(150 * m, -200 * m); c.lineTo(150 * m, 10 * m); c.quadraticCurveTo(138 * m, 150 * m, 0, 245 * m); c.quadraticCurveTo(-138 * m, 150 * m, -150 * m, 10 * m); c.closePath(); }; k(1); c.fillStyle = INK; c.fill(); k(0.93); c.fillStyle = steel(c, -150, -200, 150, 240); c.fill(); k(0.74); c.fillStyle = lin(c, -100, -150, 100, 210, [P.mid, P.deep]); c.fill(); c.save(); k(0.93); c.clip(); poly(c, [[-160, -210], [10, -210], [-110, 250], [-160, 250]], 'rgba(255,255,255,0.26)'); c.restore(); }, s); },
  crescent(c, P, x, y, r, rot = 0) { at(c, x, y, rot, () => { layers(P).forEach((col, k) => { const o = [0, 22, 44, 62][k]; c.beginPath(); c.arc(0, 0, r - o * 0.3, -2.5, -0.64); c.arc(0, r * 0.62 - o, r * 1.06, -0.9, -2.24, true); c.closePath(); c.fillStyle = col; c.fill(); }); }); },
  figure(c, x, y, s, col, rim) { at(c, x, y, 0, () => { c.fillStyle = rim; c.beginPath(); c.arc(0, -150, 86, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-230, 330); c.quadraticCurveTo(-220, -40, -60, -60); c.lineTo(60, -60); c.quadraticCurveTo(220, -40, 230, 330); c.closePath(); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(0, -150, 74, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-216, 330); c.quadraticCurveTo(-206, -30, -56, -48); c.lineTo(56, -48); c.quadraticCurveTo(206, -30, 216, 330); c.closePath(); c.fill(); }, s); },
};
const SCENE = {
  // fire
  m_firebolt(c, P, R) { MO.dart(c, P, R, 330, 280, -0.72); halo(c, P, 480, 140, 240, 0.5); sparks(c, P, R, 470, 150, 22, 150); },
  b_molten(c, P, R) { for (const [x, y, k] of [[420, 330, 0.5], [330, 250, 0.36], [470, 240, 0.3]]) MO.flame(c, P, x, y, k); c.fillStyle = P.mid; c.beginPath(); c.ellipse(370, 440, 190, 34, 0, 0, TAU); c.fill(); c.fillStyle = P.hot; c.beginPath(); c.ellipse(370, 438, 130, 20, 0, 0, TAU); c.fill(); at(c, 280, 280, 0.72, () => { c.fillStyle = lin(c, 0, -20, 0, 20, ['#b08a5a', '#3c2a1c']); c.fillRect(-330, -18, 330, 36); poly(c, [[-20, -124], [136, -124], [136, 124], [-20, 124]], '#1a2030'); c.fillStyle = lin(c, 0, -110, 120, 110, [P.core, P.hot, P.mid]); c.fillRect(-8, -112, 132, 224); }); for (const [x, y, k] of [[300, 400, 0.3], [430, 396, 0.24]]) MO.drop(c, P, x, y, k); halo(c, P, 360, 360, 260, 0.5); },
  m_detonate(c, P, R) { rays(c, P, R, 300, 300, 20, 0.26); MO.burst(c, P, R, 300, 300, 270, 16); MO.shards(c, R, 300, 300, 250, 14, ['#1a1210', '#3a2018']); halo(c, P, 300, 300, 360, 0.55); sparks(c, P, R, 300, 300, 40, 330); },
  m_wildfire(c, P, R) { MO.rings(c, P, 300, 500, 280, 2); for (const [x, y, s] of [[70, 480, 0.32], [540, 500, 0.36], [170, 490, 0.58], [450, 500, 0.7], [305, 520, 1]]) MO.flame(c, P, x, y, s); halo(c, P, 300, 360, 340, 0.4); sparks(c, P, R, 300, 280, 30, 300); },
  m_flamewave(c, P, R) { c.fillStyle = lin(c, 40, 320, 560, 600, [P.deep, P.mid]); poly(c, [[20, 330], [70, 310], [600, 540], [560, 620]], P.deep); for (let i = 0; i < 7; i++) MO.flame(c, P, 62 + i * 80, 336 + i * 38, 0.36 + i * 0.105); halo(c, P, 380, 330, 360, 0.4); sparks(c, P, R, 360, 260, 30, 300); },
  b_oil(c, P, R) { MO.speed(c, P, R, 210, 400, -0.9, 8, 200, 150); MO.flask(c, P, 310, 320, 0.95, 0.38); MO.flame(c, P, 392, 150, 0.3); halo(c, P, 390, 120, 200, 0.5); },
  b_shrapnel(c, P, R) { MO.burst(c, P, R, 300, 310, 190, 12); MO.shards(c, R, 300, 310, 230, 16, ['#ffffff', '#9aa8c4', '#3c4866'], 1.3); halo(c, P, 300, 310, 320, 0.4); sparks(c, P, R, 300, 310, 26, 320); },
  r_eruption(c, P, R) { rays(c, P, R, 300, 250, 12, 0.2); MO.flame(c, P, 296, 330, 0.8); for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.27 + (R() - 0.5) * 0.1, l = 190 + R() * 130, x = 300 + Math.cos(a) * l, y = 300 + Math.sin(a) * l; line(c, 300, 300, x, y, 9, P.mid); MO.rock(c, { ...P, deep: '#1a1210', mid: '#5a2a18' }, x, y, 0.2 + R() * 0.18, R() * 6); } poly(c, [[20, 640], [220, 300], [380, 300], [580, 640]], '#140e0c'); poly(c, [[220, 300], [300, 300], [210, 640], [20, 640]], '#33221c'); for (const [x1, x2, w] of [[262, 200, 20], [300, 320, 26], [340, 430, 18]]) { line(c, x1, 306, x2, 600, w, P.mid); line(c, x1, 306, x2, 600, w * 0.4, P.hot); } c.fillStyle = P.hot; c.beginPath(); c.ellipse(300, 302, 82, 16, 0, 0, TAU); c.fill(); halo(c, P, 300, 240, 300, 0.5); },
  // holy light
  p_smite(c, P, R) { use(c, P, R, 'sun', 440, 140, 0.42); at(c, 440, 140, 0, () => { c.rotate(-Math.PI / 2 - 0.86); MO.pillar(c, P, 0, 0, 62, 440); }); MO.burst(c, P, R, 150, 480, 120, 10); halo(c, P, 150, 480, 220, 0.5); },
  p_light(c, P, R) { at(c, 90, 440, 0, () => { c.rotate(Math.PI / 2 - 0.5); MO.pillar(c, P, 0, 0, 96, 700); }); use(c, P, R, 'sun', 110, 430, 0.4); for (let i = 0; i < 10; i++) MO.twinkle(c, 190 + R() * 380, 60 + R() * 380, 5 + R() * 8, P.core); },
  p_judgment(c, P, R) { MO.pillar(c, P, 300, 620, 150, 640); MO.rings(c, P, 300, 520, 270); MO.blade(c, P, 300, 150, 0.9, Math.PI); halo(c, P, 300, 300, 340, 0.4); sparks(c, P, R, 300, 500, 22, 260); },
  p_flash(c, P, R) { rays(c, P, R, 300, 300, 26, 0.3); MO.circles(c, P, 300, 300, 200, 2, 60); MO.burst(c, P, R, 300, 300, 230, 18); halo(c, P, 300, 300, 380, 0.6); },
  p_rebuke(c, P, R) { MO.arcs(c, P, 150, 300, 170, -0.8, 0.8, 4, 62); use(c, P, R, 'sun', 150, 300, 0.5); MO.shards(c, R, 470, 300, 80, 6, [P.deep, P.mid]); },
  p_banish(c, P, R) { use(c, P, R, 'blink'); MO.circles(c, P, 300, 300, 268, 1); for (let i = 0; i < 8; i++) at(c, 300, 300, (i / 8) * TAU, () => poly(c, [[248, -16], [300, 0], [248, 16]], P.core)); },
  p_radiance(c, P, R) { MO.circles(c, P, 300, 300, 170, 3, 52); use(c, P, R, 'sun', 300, 300, 0.56); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.2; MO.twinkle(c, 300 + Math.cos(a) * 250, 300 + Math.sin(a) * 250, i % 2 ? 9 : 15, P.core); } },
  k_radiant(c, P, R) { use(c, P, R, 'sun', 300, 230, 0.7); MO.blade(c, P, 300, 330, 0.95); halo(c, P, 300, 200, 260, 0.35); },
  p_sanctuary(c, P, R) { c.fillStyle = `rgba(${P.rgb},0.2)`; c.beginPath(); c.arc(300, 470, 260, Math.PI, TAU); c.fill(); c.strokeStyle = P.hot; c.lineWidth = 12; c.beginPath(); c.arc(300, 470, 260, Math.PI, TAU); c.stroke(); c.strokeStyle = P.mid; c.lineWidth = 6; c.beginPath(); c.arc(300, 470, 214, Math.PI, TAU); c.stroke(); MO.rings(c, P, 300, 470, 262, 2); MO.plus(c, P, 300, 320, 0.5); halo(c, P, 300, 330, 300, 0.4); },
  p_ward(c, P, R) { use(c, P, R, 'sun', 300, 300, 0.34); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU - Math.PI / 2; MO.kite(c, P, 300 + Math.cos(a) * 205, 300 + Math.sin(a) * 205, 0.34, a + Math.PI / 2); } halo(c, P, 300, 300, 330, 0.3); },
  p_purify(c, P, R) { MO.circles(c, P, 300, 300, 230, 1); MO.plus(c, P, 300, 290, 0.62); for (const [x, y, s] of [[120, 170, 0.36], [480, 200, 0.44], [150, 440, 0.3], [470, 450, 0.36]]) MO.drop(c, { ...P, hot: '#bfe8ff', mid: '#5aa8e0', deep: '#1c4a84' }, x, y, s); halo(c, P, 300, 300, 320, 0.4); },
  n_firstaid(c, P, R) { MO.kit(c, P, 300, 320, 1); halo(c, P, 300, 320, 330, 0.3); },
  // movement
  k_advance(c, P, R) { MO.speed(c, P, R, 260, 310, -0.1, 14, 280, 360); MO.kite(c, P, 360, 300, 0.92, 0.2); poly(c, [[330, 190], [400, 300], [300, 410], [336, 300]], P.core); halo(c, P, 400, 280, 260, 0.3); },
  a_roll(c, P, R) { c.lineCap = 'round'; for (const [col, w] of [[P.deep, 54], [P.mid, 34], [P.hot, 14]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(300, 300, 200, -0.3, 4.3); c.stroke(); } at(c, 300 + Math.cos(4.3) * 200, 300 + Math.sin(4.3) * 200, 4.3 + Math.PI / 2, () => poly(c, [[-10, -78], [120, 0], [-10, 78]], P.core)); MO.boot(c, P, 290, 310, 0.55, -0.3); halo(c, P, 300, 300, 300, 0.3); },
  p_step(c, P, R) { MO.prints(c, P, [[120, 520, 0.6], [215, 430, 0.3], [270, 330, 0.75], [370, 250, 0.4], [420, 150, 0.8]]); MO.plus(c, P, 480, 110, 0.2); halo(c, P, 470, 120, 200, 0.5); },
  b_rush(c, P, R) { MO.speed(c, P, R, 250, 330, -0.5, 16, 300, 380); use(c, P, R, 'hammer', 340, 280, 0.8); },
  n_sprint(c, P, R) { MO.speed(c, P, R, 240, 330, -0.25, 16, 300, 360); MO.boot(c, P, 330, 300, 1.15, -0.25); for (let i = 0; i < 3; i++) at(c, 210, 190 + i * 50, -0.5, () => poly(c, [[0, 0], [-150 + i * 26, -26], [-110 + i * 20, 14]], P.core)); halo(c, P, 380, 280, 260, 0.3); },
  a_disengage(c, P, R, card) { PIC.arrow(c, P, R, card, 420, 190, 0.6, -0.25); MO.arcs(c, P, 250, 520, 150, -2.5, -1.2, 3, 40); MO.boot(c, P, 190, 360, 0.72, 0.5); },
  a_windstep(c, P, R) { use(c, P, R, 'wind', 280, 300, 1); MO.boot(c, P, 420, 330, 0.5, -0.3); },
  p_swift(c, P, R) { MO.speed(c, P, R, 300, 320, -0.5, 14, 300, 400); MO.feather(c, P, 320, 300, 1, 0.6); halo(c, P, 360, 240, 280, 0.35); },
  // earth
  b_slam(c, P, R) { MO.rings(c, P, 300, 500, 290); use(c, P, R, 'hammer', 300, 240, 0.78); for (const [x, y, s] of [[90, 380, 0.3], [520, 350, 0.36], [150, 220, 0.22]]) MO.rock(c, P, x, y, s, x); },
  b_quake(c, P, R) { use(c, P, R, 'quake', 300, 330, 1, 1.22); for (let i = 0; i < 6; i++) MO.spike(c, P, 50 + i * 100, 330 + i * 34, 90 + R() * 80, 26, (R() - 0.5) * 0.4); },
  k_stomp(c, P, R) { MO.rings(c, P, 300, 510, 290); MO.speed(c, P, R, 300, 150, Math.PI / 2, 8, 120, 200); MO.boot(c, P, 290, 330, 1.1); for (let i = 0; i < 8; i++) disc(c, 60 + R() * 480, 470 + R() * 60, 14 + R() * 26, i % 2 ? P.deep : P.mid); },
  m_stonespike(c, P, R) { for (const [x, h, w, l] of [[110, 180, 40, -0.3], [500, 210, 44, 0.3], [200, 300, 56, -0.14], [410, 330, 60, 0.12], [300, 470, 84, 0]]) MO.spike(c, P, x, 560, h, w, l); halo(c, P, 300, 250, 320, 0.4); for (let i = 0; i < 8; i++) MO.rock(c, P, 80 + R() * 440, 440 + R() * 80, 0.14 + R() * 0.12, R() * 6); },
  m_earthquake(c, P, R) { MO.rings(c, P, 300, 320, 290, 3); for (let i = 0; i < 7; i++) MO.crack(c, R, 300 + Math.cos(i * 0.9) * 150, 320 + Math.sin(i * 0.9) * 90, 130, i * 0.9, P.core, 10); for (const [x, y, s] of [[160, 190, 0.6], [440, 210, 0.8], [300, 420, 1], [110, 430, 0.4], [500, 440, 0.5]]) MO.rock(c, P, x, y, s, x * 0.01); halo(c, P, 300, 320, 330, 0.3); },
  n_stone(c, P, R) { MO.speed(c, P, R, 250, 370, -0.7, 12, 280, 200); MO.rock(c, P, 370, 250, 1.3, 0.4); halo(c, P, 380, 240, 240, 0.35); },
  b_anvildrop(c, P, R) { MO.rings(c, P, 300, 520, 280); MO.speed(c, P, R, 300, 120, Math.PI / 2, 10, 160, 300); use(c, P, R, 'anvil', 300, 260, 0.85); },
  // ice and water
  r_glacial(c, P, R) { poly(c, [[300, 40], [460, 160], [460, 480], [300, 580], [140, 480], [140, 160]], P.deep); poly(c, [[300, 40], [460, 160], [300, 250], [140, 160]], P.hot); poly(c, [[140, 160], [300, 250], [300, 580], [140, 480]], P.mid); MO.figure(c, 300, 370, 0.5, 'rgba(8,16,40,0.72)', 'rgba(8,16,40,0.2)'); poly(c, [[170, 190], [215, 214], [215, 440], [170, 420]], 'rgba(255,255,255,0.4)'); line(c, 300, 250, 300, 580, 5, P.core); line(c, 140, 160, 300, 250, 5, P.core); line(c, 460, 160, 300, 250, 5, P.core); halo(c, P, 300, 300, 330, 0.35); },
  r_tidal(c, P, R) { MO.wave(c, P, R, 300, 330, 1); halo(c, P, 330, 230, 300, 0.3); },
  m_shatter(c, P, R) { MO.burst(c, P, R, 300, 300, 160, 9); MO.shards(c, R, 300, 300, 215, 18, [P.core, P.hot, P.mid, P.deep], 1.5); for (let i = 0; i < 5; i++) MO.crack(c, R, 300, 300, 120, i * 1.25, '#ffffff', 5); halo(c, P, 300, 300, 330, 0.4); },
  m_deepfreeze(c, P, R) { use(c, P, R, 'snow', 300, 300, 0.66, 0, { shape: 'burst' }); c.strokeStyle = P.mid; c.lineWidth = 26; c.beginPath(); c.arc(300, 300, 246, 0, TAU); c.stroke(); c.strokeStyle = P.core; c.lineWidth = 7; c.beginPath(); c.arc(300, 300, 246, 0, TAU); c.stroke(); for (let i = 0; i < 12; i++) at(c, 300, 300, (i / 12) * TAU, () => MO.spike(c, P, 0, -236, -70 - (i % 2) * 30, 20)); },
  // shields
  k_shieldwall(c, P, R) { MO.kite(c, P, 150, 330, 0.66, -0.12); MO.kite(c, P, 450, 330, 0.66, 0.12); MO.kite(c, P, 300, 300, 0.86); poly(c, [[282, 180], [318, 180], [318, 420], [282, 420]], P.core); halo(c, P, 300, 300, 320, 0.25); },
  k_bash(c, P, R) { MO.speed(c, P, R, 150, 320, 0, 10, 160, 300); MO.kite(c, P, 260, 310, 0.86, 0.2); MO.burst(c, P, R, 470, 270, 120, 10); halo(c, P, 470, 270, 200, 0.5); },
  k_vow(c, P, R) { rays(c, P, R, 300, 260, 12, 0.18); MO.blade(c, P, 300, 200, 0.92); MO.kite(c, P, 300, 360, 0.72); MO.heart(c, P, 300, 350, 0.26); },
  b_forge(c, P, R) { use(c, P, R, 'anvil', 300, 400, 0.82); MO.kite(c, P, 310, 220, 0.6, 0.3); MO.twinkle(c, 430, 110, 14, P.core); },
  k_shieldslam(c, P, R) { MO.speed(c, P, R, 380, 110, 2.1, 12, 200, 260); MO.rings(c, P, 260, 520, 270, 2); MO.kite(c, P, 290, 300, 0.92, 0.55); MO.burst(c, P, R, 190, 470, 90, 9); },
  k_holdline(c, P, R) { use(c, P, R, 'banner', 300, 240, 0.72); MO.kite(c, P, 140, 450, 0.42, -0.1); MO.kite(c, P, 460, 450, 0.42, 0.1); MO.kite(c, P, 300, 470, 0.5); },
  // aim
  a_aimed(c, P, R, card) { PIC.arrow(c, P, R, card, 270, 330, 0.9); MO.reticle(c, P, 458, 152, 112); },
  a_mark(c, P, R) { MO.reticle(c, P, 300, 320, 196); poly(c, [[240, 50], [360, 50], [300, 150]], P.core); poly(c, [[262, 62], [338, 62], [300, 126]], P.mid); halo(c, P, 300, 320, 300, 0.35); },
  s_expose(c, P, R) { MO.kite(c, P, 300, 310, 1); use(c, P, R, 'eye', 300, 280, 0.36); MO.crack(c, R, 300, 310, 230, 1.1, '#0a0708', 16); MO.crack(c, R, 360, 390, 110, -0.4, '#0a0708', 10); },
  n_insight(c, P, R) { MO.cards(c, P, 300, 400, 0.8); use(c, P, R, 'eye', 300, 150, 0.46); },
  a_headshot(c, P, R) { use(c, P, R, 'skull', 300, 300, 0.74); MO.reticle(c, P, 300, 290, 220, P.core); },
  // daggers
  s_backstab(c, P, R) { MO.figure(c, 270, 400, 0.9, P.bg, P.mid); dag(c, P, R, 420, 250, 0.7, 2.5); halo(c, P, 330, 330, 200, 0.5); },
  s_throw(c, P, R) { for (const [x, y, s] of [[190, 430, 0.5], [320, 300, 0.62], [440, 150, 0.5]]) dag(c, P, R, x, y, s, -0.78); },
  s_dance(c, P, R) { MO.arcs(c, P, 300, 300, 200, 0.4, 2.2, 2, 44); MO.arcs(c, P, 300, 300, 200, 3.54, 5.34, 2, 44); dag(c, P, R, 300, 300, 0.82, -0.78); c.save(); c.translate(600, 0); c.scale(-1, 1); dag(c, P, R, 300, 300, 0.82, -0.78); c.restore(); },
  s_hamstring(c, P, R) { MO.boot(c, { ...P, hot: '#8a7a6a', mid: '#5a4a3e', deep: '#2a201a', core: '#b0a090' }, 300, 300, 1.2); use(c, P, R, 'sword', 300, 380, 0.62, 0.5); for (const [x, y, s] of [[200, 500, 0.3], [270, 540, 0.22]]) MO.drop(c, P, x, y, s); },
  s_rupture(c, P, R) { dag(c, P, R, 400, 150, 0.46, 2.3); for (const [x, y, s] of [[290, 340, 1.35], [150, 430, 0.6], [450, 420, 0.75], [190, 230, 0.4]]) MO.drop(c, P, x, y, s); halo(c, P, 290, 340, 280, 0.3); },
  s_fan(c, P, R) { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; dag(c, P, R, 300 + Math.cos(a) * 250, 560 + Math.sin(a) * 250, 0.5, a); } },
  s_shuriken(c, P, R) { MO.shuriken(c, P, 110, 140, 0.36, 1); MO.shuriken(c, P, 500, 470, 0.42, 2); MO.shuriken(c, P, 300, 290, 1, 0.35); },
  s_venom(c, P, R) { use(c, P, R, 'dagger'); for (const [x, y, s] of [[330, 420, 0.4], [250, 500, 0.28], [410, 330, 0.24]]) MO.drop(c, P, x, y, s); },
  s_fester(c, P, R) { c.fillStyle = P.deep; c.beginPath(); c.ellipse(300, 500, 250, 60, 0, 0, TAU); c.fill(); MO.drop(c, P, 300, 320, 1.7); use(c, P, R, 'skull', 300, 360, 0.26); for (let i = 0; i < 12; i++) { const x = 80 + R() * 440, y = 120 + R() * 400, r = 8 + R() * 22; c.strokeStyle = P.hot; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); } },
  s_twinfangs(c, P, R) { MO.fang(c, P, 205, 270, 1, 1); MO.fang(c, P, 395, 270, 1, -1); MO.drop(c, P, 196, 560, 0.34); MO.drop(c, P, 404, 540, 0.26); halo(c, P, 300, 300, 300, 0.35); },
  s_assassinate(c, P, R) { use(c, P, R, 'skull'); dag(c, P, R, 310, 300, 0.95, -0.4); },
  s_deathmark(c, P, R) { line(c, 110, 90, 490, 510, 46, P.deep); line(c, 490, 90, 110, 510, 46, P.deep); line(c, 110, 90, 490, 510, 20, P.hot); line(c, 490, 90, 110, 510, 20, P.hot); use(c, P, R, 'skull', 300, 300, 0.62); },
  // lightning
  r_overclock(c, P, R) { MO.clock(c, P, 300, 300, 200, 2.2); use(c, P, R, 'bolt', 330, 300, 0.62); },
  m_spark(c, P, R) { for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + 0.3; MO.zap(c, P, R, 300, 300, 300 + Math.cos(a) * (190 + R() * 80), 300 + Math.sin(a) * (190 + R() * 80), 6); } MO.burst(c, P, R, 300, 300, 110, 9); halo(c, P, 300, 300, 300, 0.5); },
  m_chain(c, P, R) { const pts = [[100, 440], [290, 170], [500, 400], [540, 130]]; for (let i = 0; i < 3; i++) MO.zap(c, P, R, ...pts[i], ...pts[i + 1], 9); pts.forEach(([x, y], i) => { ball(c, P, x, y, 54 - i * 8); halo(c, P, x, y, 130, 0.4); }); },
  b_magnet(c, P, R) { MO.magnet(c, P, 300, 230, 0.9); for (const x of [196, 404]) for (let i = 0; i < 3; i++) { c.strokeStyle = [P.core, P.hot, P.mid][i]; c.lineWidth = 8; c.beginPath(); c.arc(x, 440 + i * 4, 30 + i * 34, 0.5, Math.PI - 0.5); c.stroke(); } MO.shards(c, R, 300, 520, 90, 7, ['#ffffff', '#9aa8c4']); },
  // swords
  k_cleave(c, P, R) { MO.crescent(c, P, 300, 390, 300); MO.crescent(c, P, 300, 520, 200); sparks(c, P, R, 300, 200, 24, 300); },
  k_riposte(c, P, R) { MO.blade(c, P, 250, 340, 0.9, 0.62); MO.blade(c, P, 350, 340, 0.9, -0.62); MO.burst(c, P, R, 300, 250, 80, 8); halo(c, P, 300, 250, 220, 0.5); },
  k_laststand(c, P, R) { rays(c, P, R, 300, 200, 16, 0.24); MO.rings(c, P, 300, 530, 250, 2); MO.blade(c, P, 300, 210, 1, Math.PI); for (let i = 0; i < 5; i++) MO.flame(c, P, 80 + i * 110, 560 + (i % 2) * 20, 0.2 + (i % 2) * 0.1); halo(c, P, 300, 200, 300, 0.4); },
  r_worldrender(c, P, R) { MO.rift(c, P, R, 300, 310, 290); use(c, P, R, 'sword', 300, 300, 0.9); },
  // hearts and time
  k_ironwill(c, P, R) { MO.heart(c, P, 300, 300, 1); c.save(); c.translate(300, 300); c.beginPath(); heartPath(c); c.clip(); for (const y of [-80, 40]) { c.fillStyle = steel(c, -260, y, 260, y + 60); at(c, 0, y, -0.2, () => c.fillRect(-300, -28, 600, 56)); for (let i = -3; i <= 3; i++) at(c, 0, y, -0.2, () => disc(c, i * 70, 0, 9, IRON)); } c.restore(); halo(c, P, 300, 300, 320, 0.3); },
  s_adrenaline(c, P, R) { MO.heart(c, P, 300, 300, 0.95); c.strokeStyle = P.core; c.lineWidth = 14; c.lineJoin = 'miter'; c.lineCap = 'round'; c.beginPath(); [[20, 310], [190, 310], [230, 220], [290, 420], [340, 170], [380, 310], [580, 310]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); halo(c, P, 300, 300, 330, 0.4); },
  n_secondwind(c, P, R) { use(c, P, R, 'wind', 270, 300, 1); MO.heart(c, P, 430, 300, 0.42); },
  n_catchbreath(c, P, R) { MO.clock(c, P, 280, 280, 190, 0.6); MO.heart(c, P, 440, 430, 0.36); halo(c, P, 280, 280, 300, 0.3); },
  b_retool(c, P, R) { MO.clock(c, P, 380, 220, 150, 2.4); at(c, 280, 350, -0.78, () => { c.fillStyle = steel(c, -260, -40, 260, 40); c.beginPath(); c.roundRect(-250, -34, 400, 68, 30); c.fill(); c.beginPath(); c.arc(180, 0, 92, 0, TAU); c.fill(); poly(c, [[170, -34], [290, -34], [290, 34], [170, 34]], P.bg); line(c, -220, -18, 110, -18, 8, '#ffffff'); }); },
  b_salvage(c, P, R) { MO.gear(c, P, 210, 380, 150, P.mid, 0.2); MO.gear(c, P, 410, 240, 120, P.hot, 0.5); MO.gear(c, P, 440, 460, 80, P.deep, 0.1); c.strokeStyle = P.core; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.arc(300, 310, 262, 3.5, 4.9); c.stroke(); at(c, 300 + Math.cos(4.9) * 262, 310 + Math.sin(4.9) * 262, 4.9 + Math.PI / 2, () => poly(c, [[-6, -44], [70, 0], [-6, 44]], P.core)); },
  // arrows
  a_blank(c, P, R, card) { PIC.arrow(c, P, R, card, 230, 370, 0.8); MO.burst(c, P, R, 420, 180, 140, 11); MO.circles(c, P, 420, 180, 150, 2, 36); },
  a_longshot(c, P, R, card) { c.setLineDash([26, 22]); c.strokeStyle = P.hot; c.lineWidth = 9; c.beginPath(); c.moveTo(40, 560); c.quadraticCurveTo(210, 40, 430, 190); c.stroke(); c.setLineDash([]); poly(c, [[0, 600], [150, 470], [260, 560], [400, 440], [600, 600]], P.deep); PIC.arrow(c, P, R, card, 440, 196, 0.42, 0.55); MO.reticle(c, P, 520, 300, 60); },
  a_concuss(c, P, R, card) { PIC.arrow(c, P, R, card, 250, 350, 0.85); disc(c, 428, 170, 62, IRON); c.fillStyle = steel(c, 380, 120, 480, 220); c.beginPath(); c.arc(428, 170, 52, 0, TAU); c.fill(); MO.arcs(c, P, 428, 170, 100, -1.9, 0.3, 3, 40); },
  a_quiver(c, P, R) { MO.quiver(c, P, R, 300, 360, 1, 0.3); halo(c, P, 360, 150, 220, 0.4); },
  a_double(c, P, R, card) { PIC.arrow(c, P, R, card, 250, 350, 0.82); PIC.arrow(c, P, R, card, 350, 270, 0.82); halo(c, P, 460, 150, 220, 0.5); },
  // the forge
  b_mortar(c, P, R) { MO.speed(c, P, R, 436, 120, -1.05, 8, 170, 110); disc(c, 462, 84, 48, P.hot); disc(c, 462, 84, 24, P.core); halo(c, P, 462, 84, 230, 0.55);
    at(c, 280, 420, 0.42, () => { c.fillStyle = steel(c, -70, 0, 70, 0); c.beginPath(); c.roundRect(-72, -260, 144, 300, 44); c.fill(); c.fillStyle = '#2a3148'; c.fillRect(-88, -274, 176, 46); c.fillStyle = P.mid; c.fillRect(-88, -236, 176, 10); });
    poly(c, [[110, 450], [450, 450], [496, 530], [70, 530]], '#3c4866'); poly(c, [[110, 450], [450, 450], [456, 466], [104, 466]], P.mid);
    for (const x of [140, 430]) { disc(c, x, 530, 58, '#2a3148'); disc(c, x, 530, 22, P.mid); } },
  b_wall(c, P, R) { MO.barricade(c, P, 300, 310, 1); halo(c, P, 300, 300, 330, 0.25); },
  b_masterwork(c, P, R) { rays(c, P, R, 300, 190, 14, 0.24); use(c, P, R, 'anvil', 300, 420, 0.8); MO.blade(c, P, 300, 250, 0.72); MO.twinkle(c, 300, 30, 16, P.core); MO.twinkle(c, 440, 150, 9, P.core); MO.twinkle(c, 150, 190, 11, P.core); },
  b_whetstone(c, P, R) { disc(c, 240, 360, 196, IRON); disc(c, 240, 360, 180, lin(c, 80, 200, 400, 520, ['#b8b0a0', '#6a6258', '#3a342c'])); for (const r of [140, 100, 60]) { c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 5; c.beginPath(); c.arc(240, 360, r, 0, TAU); c.stroke(); } disc(c, 240, 360, 26, IRON); MO.blade(c, P, 430, 270, 0.72, -1.25); sparks(c, P, R, 350, 210, 34, 170); halo(c, P, 350, 210, 200, 0.6); },
  b_sunder(c, P, R) { MO.kite(c, P, 190, 380, 0.62, -0.3); MO.crack(c, R, 190, 380, 150, 1.3, '#0a0708', 18); use(c, P, R, 'hammer', 350, 260, 0.74); },
  // poison
  r_sporebloom(c, P, R) { MO.shroom(c, P, 150, 400, 0.6, -0.2); MO.shroom(c, P, 460, 420, 0.7, 0.2); MO.shroom(c, P, 300, 320, 1.15); for (let i = 0; i < 26; i++) disc(c, 40 + R() * 520, 40 + R() * 300, 4 + R() * 10, i % 2 ? P.core : P.hot); halo(c, P, 300, 250, 330, 0.35); },
  m_toxic(c, P, R) { use(c, P, R, 'smoke'); use(c, P, R, 'skull', 300, 320, 0.4); },
  s_contagion(c, P, R) { const pts = [[150, 420], [300, 170], [460, 410]]; for (let i = 0; i < 3; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 3]; for (let k = 1; k < 5; k++) disc(c, x1 + ((x2 - x1) * k) / 5, y1 + ((y2 - y1) * k) / 5, 14 - Math.abs(k - 2.5) * 2, P.hot); } pts.forEach(([x, y]) => use(c, P, R, 'skull', x, y, 0.36)); },
  // shadow
  r_rift(c, P, R) { rays(c, P, R, 300, 310, 14, 0.2); MO.rift(c, P, R, 300, 310, 290); for (let i = 0; i < 12; i++) MO.twinkle(c, 60 + R() * 480, 60 + R() * 480, 4 + R() * 7, P.core); halo(c, P, 300, 310, 320, 0.35); },
  s_vanish(c, P, R) { use(c, P, R, 'smoke'); c.setLineDash([22, 18]); c.strokeStyle = P.core; c.lineWidth = 8; c.beginPath(); c.arc(300, 210, 70, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(130, 560); c.quadraticCurveTo(140, 310, 250, 296); c.lineTo(350, 296); c.quadraticCurveTo(460, 310, 470, 560); c.stroke(); c.setLineDash([]); },
  // arcane
  m_barrier(c, P, R) { use(c, P, R, 'orb', 300, 320, 0.5); c.fillStyle = `rgba(${P.rgb},0.16)`; c.beginPath(); c.arc(300, 320, 262, 0, TAU); c.fill(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.26; at(c, 300 + Math.cos(a) * 200, 320 + Math.sin(a) * 200, a, () => { c.strokeStyle = i % 2 ? P.hot : P.core; c.lineWidth = 9; c.beginPath(); for (let k = 0; k < 6; k++) c.lineTo(Math.cos((k / 6) * TAU) * 74, Math.sin((k / 6) * TAU) * 74); c.closePath(); c.stroke(); }); } c.strokeStyle = P.hot; c.lineWidth = 12; c.beginPath(); c.arc(300, 320, 272, 0, TAU); c.stroke(); },
  m_missiles(c, P, R) { for (const [x, y, a, k] of [[200, 440, -0.5, 0.5], [330, 300, -0.75, 0.62], [450, 150, -1, 0.5]]) { MO.dart(c, P, R, x, y, a, k); const hx = x + Math.cos(a) * 250 * k, hy = y + Math.sin(a) * 250 * k; ball(c, P, hx, hy, 46 * k + 8); halo(c, P, hx, hy, 150 * k, 0.5); } },
  m_overload(c, P, R) { for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.4; MO.zap(c, P, R, 300, 300, 300 + Math.cos(a) * 290, 300 + Math.sin(a) * 290, 7); } ball(c, P, 300, 300, 150); for (let i = 0; i < 4; i++) MO.crack(c, R, 300, 300, 130, i * 0.8 + 0.3, P.bg, 9); halo(c, P, 300, 300, 330, 0.5); },
  p_prayer(c, P, R) { rays(c, P, R, 300, 130, 14, 0.24); MO.cards(c, P, 300, 420, 0.72); MO.plus(c, P, 300, 130, 0.24); halo(c, P, 300, 130, 220, 0.5); },
  p_vigil(c, P, R) { MO.candle(c, P, 300, 340, 1.05); for (let i = 0; i < 8; i++) MO.twinkle(c, 60 + R() * 480, 40 + R() * 300, 4 + R() * 7, P.core); halo(c, P, 292, 190, 260, 0.6); },
  // rally
  n_battlecry(c, P, R) { use(c, P, R, 'banner', 190, 300, 0.56); MO.arcs(c, P, 250, 300, 150, -0.75, 0.75, 4, 62); },
  // the same object in another colour is still the same picture: these get something of their own too
  k_valor(c, P, R) { rays(c, P, R, 470, 130, 14, 0.26); use(c, P, R, 'sword'); MO.plus(c, P, 150, 170, 0.16); for (let i = 0; i < 8; i++) MO.twinkle(c, 80 + R() * 440, 60 + R() * 420, 5 + R() * 8, P.core); },
  s_rush(c, P, R) { MO.figure(c, 130, 380, 0.42, `rgba(${P.rgb},0.2)`, 'rgba(0,0,0,0)'); MO.figure(c, 240, 350, 0.5, `rgba(${P.rgb},0.4)`, 'rgba(0,0,0,0)'); use(c, P, R, 'boot', 340, 280, 0.8); },
  s_step(c, P, R) { use(c, P, R, 'blink'); MO.figure(c, 300, 330, 0.44, '#000000', P.hot); MO.prints(c, P, [[110, 560, 0.5], [190, 500, 0.9]]); },
  b_overcharge(c, P, R) { MO.gear(c, P, 300, 300, 250, P.deep, 0.2); MO.gear(c, P, 300, 300, 170, P.mid, 0.5); use(c, P, R, 'bolt', 300, 300, 0.9); },
  m_meteor(c, P, R) { MO.rings(c, P, 190, 540, 240); for (let i = 0; i < 5; i++) MO.flame(c, P, 470 - i * 22, 70 + i * 26, 0.5 - i * 0.04); at(c, 330, 290, -0.9, () => { for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-120 + k * 30, 0); c.quadraticCurveTo(0, -150 + k * 40, 420, -60); c.lineTo(420, 60); c.quadraticCurveTo(0, 150 - k * 40, -120 + k * 30, 0); c.fillStyle = [P.deep, P.mid, P.hot][k]; c.fill(); } }); MO.rock(c, { ...P, deep: '#1a1210', mid: '#4a2418', hot: '#8a4a2a', core: P.hot }, 250, 370, 1.25, 0.5); halo(c, P, 250, 370, 280, 0.5); sparks(c, P, R, 250, 370, 26, 220); },
  r_starfall(c, P, R) { for (const [x, y, s] of [[150, 420, 0.3], [330, 300, 0.5], [470, 130, 0.3], [90, 180, 0.2], [500, 440, 0.22]]) { at(c, x, y, -1.05, () => { for (let k = 0; k < 3; k++) poly(c, [[0, -30 * s * (3 - k)], [700 * s, 0], [0, 30 * s * (3 - k)]], [P.deep, P.mid, P.hot][k]); }); use(c, P, R, 'star', x, y, s); } },
  a_pierce(c, P, R, card) { PIC.arrow(c, P, R, card); for (const [x, y, r] of [[250, 352, 78], [390, 216, 96]]) { c.strokeStyle = P.deep; c.lineWidth = 20; c.beginPath(); c.ellipse(x, y, r * 0.42, r, -0.75, 0, TAU); c.stroke(); c.strokeStyle = P.core; c.lineWidth = 8; c.beginPath(); c.ellipse(x, y, r * 0.42, r, -0.75, 0, TAU); c.stroke(); } },
  a_poison(c, P, R, card) { PIC.arrow(c, P, R, card, 300, 280); for (const [x, y, s] of [[440, 300, 0.42], [500, 420, 0.3], [380, 450, 0.24]]) MO.drop(c, P, x, y, s); use(c, P, R, 'skull', 130, 150, 0.2); },
  a_flame(c, P, R, card) { PIC.arrow(c, P, R, card, 280, 320, 0.9); MO.flame(c, P, 450, 215, 0.52); halo(c, P, 450, 130, 220, 0.5); sparks(c, P, R, 440, 140, 20, 150); },
  a_storm(c, P, R, card) { use(c, P, R, 'wind', 300, 300, 1.05); PIC.arrows(c, P, R, card); },
  a_firerain(c, P, R, card) { PIC.arrows(c, P, R, card); for (let i = 0; i < 6; i++) MO.flame(c, P, 50 + i * 100, 560 + (i % 2) * 16, 0.3 + (i % 3) * 0.08); halo(c, P, 300, 480, 320, 0.4); },
  s_ambush(c, P, R) { for (const sx of [-1, 1]) at(c, 300 + sx * 96, 150, sx * 0.2, () => { poly(c, [[-70, 0], [0, -30], [70, 0], [0, 22]], P.core); poly(c, [[-12, -22], [12, -22], [8, 18], [-8, 18]], P.bg); }); halo(c, P, 300, 150, 220, 0.5); dag(c, P, R, 300, 370, 0.8, -0.78); },
  k_bulwark(c, P, R) { for (let r = 0; r < 6; r++) for (let i = -1; i < 6; i++) { const x = i * 112 + (r % 2) * 56, y = 40 + r * 92; c.fillStyle = IRON; c.fillRect(x, y, 106, 86); c.fillStyle = [P.deep, '#2a3148', P.deep][(i + r + 3) % 3]; c.fillRect(x + 4, y + 4, 98, 78); } use(c, P, R, 'shield'); },
  p_faith(c, P, R) { rays(c, P, R, 390, 240, 18, 0.3); use(c, P, R, 'sun', 390, 240, 0.5); use(c, P, R, 'mace'); },
  b_meteorhammer(c, P, R) { for (let i = 0; i < 4; i++) MO.flame(c, P, 470 - i * 60, 250 - i * 50, 0.62 - i * 0.1); MO.speed(c, P, R, 250, 200, 0.72, 10, 200, 240); use(c, P, R, 'hammer'); },
  r_sandstorm(c, P, R) { use(c, P, R, 'wind', 300, 300, 1.2); for (let i = 0; i < 90; i++) disc(c, R() * 600, 40 + R() * 560, 2 + R() * 6, i % 3 ? P.hot : P.core); for (const [x, y, s] of [[120, 470, 0.34], [500, 130, 0.26], [470, 480, 0.2]]) MO.rock(c, P, x, y, s, x); },
  n_breath(c, P, R) { MO.figure(c, 400, 400, 0.6, P.deep, P.hot); use(c, P, R, 'wind', 210, 250, 0.72); MO.heart(c, P, 400, 420, 0.2); },
  k_executioner(c, P, R) { at(c, 300, 300, 0.5, () => { c.fillStyle = lin(c, -20, 0, 20, 0, ['#b08a5a', '#3c2a1c']); c.fillRect(-18, -250, 36, 560); c.beginPath(); c.moveTo(0, -230); c.quadraticCurveTo(190, -280, 250, -110); c.quadraticCurveTo(200, 60, 0, 0); c.closePath(); c.fillStyle = IRON; c.fill(); c.beginPath(); c.moveTo(10, -214); c.quadraticCurveTo(176, -256, 232, -110); c.quadraticCurveTo(186, 36, 10, -14); c.closePath(); c.fillStyle = steel(c, 0, -230, 240, 20); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.beginPath(); c.moveTo(196, -216); c.quadraticCurveTo(238, -150, 226, -60); c.stroke(); }); for (const [x, y, s] of [[170, 470, 0.4], [250, 540, 0.3]]) MO.drop(c, P, x, y, s); use(c, P, R, 'skull', 150, 170, 0.26); },
  s_miasma(c, P, R) { MO.rings(c, P, 300, 500, 280); for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; for (let k = 0; k < 4; k++) disc(c, 300 + Math.cos(a) * 215 + (R() - 0.5) * 60, 310 + Math.sin(a) * 190 + (R() - 0.5) * 60, 30 + R() * 34, [P.deep, P.mid, P.mid, P.hot][k]); } MO.figure(c, 300, 370, 0.5, P.bg, P.hot); },
  a_camo(c, P, R) { MO.figure(c, 300, 380, 0.7, P.bg, P.deep); disc(c, 276, 268, 9, P.core); disc(c, 324, 268, 9, P.core); for (const [x, y, s, r] of [[150, 200, 0.5, 0.8], [450, 220, 0.46, -0.9], [130, 460, 0.56, 2.2], [470, 470, 0.5, -2.3], [300, 520, 0.4, 3.1], [300, 90, 0.34, 0]]) use(c, P, R, 'leaf', x, y, s, r); },
  // growth
  r_verdant(c, P, R) { for (let i = 0; i < 6; i++) use(c, P, R, 'leaf', 300 + Math.cos(i * 1.05) * 230, 300 + Math.sin(i * 1.05) * 230, 0.22, i * 1.05 + 1.57); MO.flower(c, P, 300, 300, 0.9); halo(c, P, 300, 300, 330, 0.35); },
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
export const hasScene = (id) => !!SCENE[id];
/** The painted picture of a card, as an image URL. Painted once per card, then reused. */
export function cardArt(id) {
  let url = cache.get(id); if (url) return url;
  const card = CARDS[id]; const w = Math.round(W * OUT), h = Math.round(H * OUT);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d', { willReadFrequently: true });
  const P = PAL[card.el] || PAL[card.cat] || PAL.special; const seed = hash(id); const R = seeded(seed);
  c.save(); c.scale(OUT, OUT);
  backdrop(c, P, R);
  const scene = SCENE[id];
  if (!scene && seed % 2 && !['shield', 'heart', 'cross', 'skull', 'anvil', 'turret', 'trap', 'phoenix'].includes(card.icon)) { c.translate(W, 0); c.scale(-1, 1); } // same picture, other way round
  (scene || PIC[card.icon] || PIC.star)(c, P, R, card);
  c.restore(); finish(c, w, h);
  url = cv.toDataURL('image/jpeg', 0.86); cache.set(id, url); return url;
}

// ───── a monster's move ─────
// The small card on a monster's slip: the same painters and finish as a skill card, on a wide strip with the
// subject at the left and dark ground to the right for the words. Chosen by the kind of move, coloured by the
// monster's element, so a new monster or move needs no art of its own. Painted once per look, then reused.
const MOVE_PIC = { strike: 'sword', shoot: 'arrow', aoe: 'meteor', guard: 'shield', buff: 'roar', heal: 'heart', summon: 'skull', wait: 'orb',
  burrow: 'quake', emerge: 'quake', gather: 'snow', zero: 'snow', ascend: 'wind', dive: 'meteor', charge: 'bolt', overload: 'bolt', stagger: 'smoke', erupt: 'flame', echo: 'eye', idle: 'eye' };
const AOE_PIC = { ice: 'snow', earth: 'quake', wind: 'whirl', holy: 'sun', shadow: 'orb', poison: 'smoke' };
const MOVE_PAL = { guard: 'defense', buff: 'buff', heal: 'holy', stagger: 'special', idle: 'special' };
export function moveArt(kind, el) {
  const pic = (kind === 'aoe' && AOE_PIC[el]) || MOVE_PIC[kind] || 'star'; const pal = MOVE_PAL[kind] || (PAL[el] ? el : 'attack');
  const key = 'move:' + pic + ':' + pal; let url = cache.get(key); if (url) return url;
  const w = 360, h = 120, k = 0.2; // the 600 × 860 painter space, drawn small at the left of the strip
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d', { willReadFrequently: true });
  const P = PAL[pal]; const R = seeded(hash(key));
  c.fillStyle = P.bg; c.fillRect(0, 0, w, h); glow(c, 62, 60, 190, P.rgb, 0.4);
  c.save(); c.beginPath(); c.rect(0, 0, 150, h); c.clip(); c.translate(2, 0); c.scale(k, k); PIC[pic](c, P, R, { shape: 'area' }); c.restore();
  const fade = c.createLinearGradient(96, 0, 156, 0); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, P.bg); c.fillStyle = fade; c.fillRect(96, 0, w - 96, h);
  finish(c, w, h);
  url = cv.toDataURL('image/jpeg', 0.86); cache.set(key, url); return url;
}

// ───── item pictures ─────
// Equipment, potions and materials are painted the same way as the cards, as a small square: the object in
// materials of its tier, lit by the colour of its rarity (or of the potion). Painted once per look, then reused.
const S = 600;
const mix = (hex, to, k) => { const n = parseInt(hex.slice(1), 16), a = [n >> 16, (n >> 8) & 255, n & 255]; return a.map((v, i) => Math.round(v + (to[i] - v) * k)); };
const css = (a) => `rgb(${a.join(',')})`;
function palOf(hex) { const m = mix(hex, [0, 0, 0], 0); return { bg: css(mix(hex, [8, 6, 10], 0.93)), deep: css(mix(hex, [10, 8, 14], 0.62)), mid: css(m), hot: css(mix(hex, [255, 255, 255], 0.45)), core: css(mix(hex, [255, 255, 255], 0.86)), rgb: m.join(',') }; }
const wood = (c, x1, y1, x2, y2) => lin(c, x1, y1, x2, y2, ['#c49a64', '#7a5230', '#3c2616']);
const leather = (c, x1, y1, x2, y2) => lin(c, x1, y1, x2, y2, ['#c89868', '#8a5a34', '#40281a']);
const gold = (c, x1, y1, x2, y2) => lin(c, x1, y1, x2, y2, ['#fff3c0', '#e0a834', '#6a4410']);
const shape = (c, col, draw) => { c.beginPath(); draw(); c.closePath(); c.fillStyle = col; c.fill(); };
// What a tier is made of. Every kind of equipment is painted in these: plain iron and wood, then steel and gold,
// then frost, grave-bone, starmetal and last the black iron of the abyss, each with its own mark and light.
const BONE = ['#fff8e0', '#d8c8a0', '#7a6848'], GOLD = ['#fff3c0', '#e0a834', '#6a4410'];
const TIER = [null,
  { n: 1, metal: ['#e4e8f0', '#8e96a4', '#3a4050'], trim: ['#a8aeb8', '#5a606c', '#2e323a'], band: ['#f0b890', '#b06a3a', '#4a2410'], cloth: ['#d8c8a0', '#9a8a64', '#40382a'] },
  { n: 2, metal: ['#f2f6ff', '#9aa8c4', '#3c4866'], trim: GOLD, band: ['#ffffff', '#b8c0d0', '#4a5266'], cloth: ['#f0c880', '#c07a30', '#5a3010'] },
  { n: 3, metal: ['#ffffff', '#8fdcff', '#2a6aa8'], trim: ['#e8f6ff', '#9ab8d8', '#3c5a80'], band: ['#ffffff', '#a8dcff', '#3a6a9a'], cloth: ['#f4fbff', '#a8cfe8', '#3a5a80'], gem: '#7fd4ff', rim: 'rgba(190,234,255,0.9)', deco: 'ice' },
  { n: 4, metal: ['#d8e0c8', '#74846a', '#1c281c'], trim: BONE, band: BONE, cloth: ['#9a8aaa', '#4a3c5c', '#1a1424'], gem: '#8fe060', rim: 'rgba(216,240,176,0.8)', deco: 'bone' },
  { n: 5, metal: ['#6a80e8', '#1e2a78', '#080a20'], trim: GOLD, band: GOLD, cloth: ['#9aacf8', '#3a4aa8', '#141c50'], gem: '#ffe08a', rim: 'rgba(255,233,160,0.9)', deco: 'star' },
  { n: 6, metal: ['#5a3848', '#1c0c14', '#000000'], trim: ['#ff7a3a', '#8a1c14', '#1a0608'], band: ['#6a4252', '#1c0c14', '#000000'], cloth: ['#6a2434', '#240a12', '#000000'], gem: '#ff3a1a', rim: 'rgba(255,110,50,0.95)', deco: 'fire' },
];
const cut = (c, pts) => { c.globalCompositeOperation = 'destination-out'; poly(c, pts, '#000'); c.globalCompositeOperation = 'source-over'; };
const star4 = (c, x, y, r, col) => poly(c, [[x, y - r], [x + r * 0.24, y - r * 0.24], [x + r, y], [x + r * 0.24, y + r * 0.24], [x, y + r], [x - r * 0.24, y + r * 0.24], [x - r, y], [x - r * 0.24, y - r * 0.24]], col);
const skull = (c, x, y, r) => { disc(c, x, y, r, '#fff8e0'); c.fillStyle = '#d8c8a0'; c.fillRect(x - r * 0.5, y + r * 0.45, r, r * 0.65); disc(c, x - r * 0.38, y - r * 0.05, r * 0.27, '#0c0a10'); disc(c, x + r * 0.38, y - r * 0.05, r * 0.27, '#0c0a10'); };
const tongue = (c, x, y, w, hgt, col) => shape(c, col, () => { c.moveTo(x, y - hgt); c.bezierCurveTo(x + w * 1.3, y - hgt * 0.35, x + w, y, x, y); c.bezierCurveTo(x - w, y, x - w * 0.5, y - hgt * 0.5, x, y - hgt); });
const fire = (c, x, y, w, hgt) => { tongue(c, x, y, w, hgt, '#ff3a1a'); tongue(c, x, y, w * 0.62, hgt * 0.7, '#ffb040'); tongue(c, x, y, w * 0.3, hgt * 0.42, '#fff0b0'); };
const heartAt = (c, x, y, k) => { c.moveTo(x, y + 210 * k); c.bezierCurveTo(x - 330 * k, y + 10 * k, x - 160 * k, y - 230 * k, x, y - 70 * k); c.bezierCurveTo(x + 160 * k, y - 230 * k, x + 330 * k, y + 10 * k, x, y + 210 * k); };
const leafAt = (c, x, y, rot, len, col, vein = 'rgba(255,255,255,0.5)') => at(c, x, y, rot, () => { shape(c, col, () => { c.moveTo(0, 0); c.bezierCurveTo(len * 0.5, -len * 0.3, len * 0.5, -len * 0.8, 0, -len); c.bezierCurveTo(-len * 0.5, -len * 0.8, -len * 0.5, -len * 0.3, 0, 0); }); line(c, 0, -len * 0.1, 0, -len * 0.85, len * 0.04, vein); });
// A wing of four slim gold feathers, fanned up and out from (x, y) to the side `sd`.
const wing = (c, x, y, sd, k = 1) => [[1.35, 150], [1.0, 210], [0.65, 250], [0.3, 230]].forEach(([a, len], i) => at(c, x, y, sd * a, () => { shape(c, '#6a4410', () => { c.moveTo(0, 0); c.quadraticCurveTo(46, -len * 0.5, 0, -len - 10); c.quadraticCurveTo(-46, -len * 0.5, 0, 0); }); shape(c, i % 2 ? '#e0a834' : '#fff3c0', () => { c.moveTo(0, -6); c.quadraticCurveTo(34, -len * 0.5, 0, -len); c.quadraticCurveTo(-34, -len * 0.5, 0, -6); }); }, k));
// The mark of a tier, set on an item at (x, y): a spray of rime, a skull, a star or a flame. Nothing for the plain tiers.
const mark = (c, T, x, y, k = 1) => at(c, x, y, 0, () => {
  if (T.deco === 'ice') for (const [a, hgt] of [[-0.62, 60], [0.62, 60], [0, 88]]) at(c, 0, 14, a, () => { poly(c, [[-16, 0], [0, -hgt], [16, 0], [0, 16]], '#8fdcff'); poly(c, [[-16, 0], [0, -hgt], [0, 16]], '#ffffff'); });
  else if (T.deco === 'bone') skull(c, 0, -4, 36);
  else if (T.deco === 'star') { star4(c, 0, 0, 52, '#ffe08a'); star4(c, 0, 0, 25, '#ffffff'); }
  else if (T.deco === 'fire') fire(c, 0, 40, 36, 100);
}, k);
// The light a tier gives off, and the motes in it.
const aura = (c, T, R, x, y, r = 230) => { if (!T.gem) return; const A = palOf(T.gem); halo(c, A, x, y, r, 0.5); sparks(c, A, R, x, y, 14, r * 0.8); };
const tm = (c, T, x1, y1, x2, y2) => lin(c, x1, y1, x2, y2, T.metal), tt = (c, T, x1, y1, x2, y2) => lin(c, x1, y1, x2, y2, T.trim);

const ITEM = {
  // ── the six swords, each made of what its name says ──
  sword1(c) { // Iron Sword: short, broad and dull, with a plain iron hilt
    at(c, 300, 300, 0.72, () => {
      poly(c, [[-36, 110], [36, 110], [32, -150], [0, -206], [-32, -150]], lin(c, -36, 0, 36, 0, ['#eef2f8', '#9aa2b0', '#444a5a'])); poly(c, [[0, 110], [36, 110], [32, -150], [0, -206]], 'rgba(10,12,20,0.3)');
      cut(c, [[40, -20], [16, -36], [40, -52]]); line(c, -14, 90, -12, -140, 5, 'rgba(255,255,255,0.6)');
      c.fillStyle = lin(c, 0, 100, 0, 134, ['#b0b6c2', '#4a505c']); c.fillRect(-76, 102, 152, 30);
      c.fillStyle = leather(c, -16, 0, 16, 0); c.fillRect(-16, 132, 32, 86); for (let i = 0; i < 4; i++) line(c, -16, 146 + i * 20, 16, 156 + i * 20, 5, '#2a180e');
      disc(c, 0, 238, 27, '#4a505c'); disc(c, -4, 234, 17, '#b0b6c2');
    });
  },
  sword2(c, P) { // Steel Longsword: long and slender, bright, with a gilded guard
    at(c, 300, 316, 0.72, () => {
      poly(c, [[-24, 110], [24, 110], [18, -226], [0, -282], [-18, -226]], steel(c, -24, 0, 24, 0)); poly(c, [[0, 110], [24, 110], [18, -226], [0, -282]], 'rgba(16,24,52,0.4)');
      line(c, 0, 96, 0, -200, 7, 'rgba(20,28,60,0.55)'); line(c, -11, 90, -9, -214, 4, 'rgba(255,255,255,0.8)');
      shape(c, gold(c, 0, 96, 0, 144), () => { c.moveTo(-112, 92); c.quadraticCurveTo(-60, 112, 0, 104); c.quadraticCurveTo(60, 112, 112, 92); c.lineTo(104, 128); c.quadraticCurveTo(0, 150, -104, 128); });
      c.fillStyle = leather(c, -14, 0, 14, 0); c.fillRect(-14, 138, 28, 92); ball(c, P, 0, 250, 28);
    });
  },
  sword3(c, P, R, T) { // Frostbrand: a blade of clear ice, rimed at the guard
    const I = palOf('#7fd4ff');
    at(c, 300, 316, 0.72, () => {
      poly(c, [[-30, 110], [30, 110], [42, -60], [22, -206], [0, -280], [-22, -206], [-42, -60]], lin(c, -40, 0, 40, 0, T.metal));
      poly(c, [[0, 110], [30, 110], [42, -60], [0, -40]], 'rgba(20,70,140,0.45)'); poly(c, [[0, -40], [42, -60], [22, -206], [0, -280]], 'rgba(255,255,255,0.35)'); poly(c, [[-42, -60], [0, -40], [-22, -206]], 'rgba(255,255,255,0.6)');
      for (const sd of [-1, 1]) for (const [x, hgt, k] of [[38, 96, 0.5], [78, 70, 0.9], [112, 44, 1.3]]) at(c, sd * x, 118, sd * k, () => poly(c, [[-18, 0], [0, -hgt], [18, 0], [0, 22]], sd < 0 ? '#ffffff' : '#8fdcff'));
      c.fillStyle = lin(c, -14, 0, 14, 0, ['#e8f6ff', '#5a8ab8', '#1c3a60']); c.fillRect(-14, 126, 28, 98); ball(c, I, 0, 246, 30);
    });
    aura(c, T, R, 380, 190, 250);
  },
  sword4(c, P, R, T) { // Gravecleaver: a notched butcher's blade with a hilt of bone
    at(c, 286, 310, 0.72, () => {
      poly(c, [[-30, 110], [44, 110], [96, -50], [102, -190], [34, -270], [-30, -206]], lin(c, -30, 0, 100, 0, T.metal));
      poly(c, [[34, 110], [44, 110], [96, -50], [102, -190], [34, -270], [74, -190], [70, -50]], '#e8f4d0');
      for (const y of [40, -40, -120]) cut(c, [[112, y + 26], [66, y], [112, y - 26]]);
      c.globalCompositeOperation = 'destination-out'; disc(c, 30, -196, 17, '#000'); c.globalCompositeOperation = 'source-over'; line(c, -14, 90, -14, -170, 6, 'rgba(10,20,10,0.55)');
      c.fillStyle = lin(c, 0, 104, 0, 164, BONE); c.fillRect(-84, 104, 176, 30); disc(c, -88, 119, 22, '#fff8e0'); disc(c, 96, 119, 22, '#d8c8a0');
      c.fillStyle = lin(c, -14, 0, 14, 0, ['#5a4a3a', '#20160e']); c.fillRect(-14, 134, 28, 80); skull(c, 0, 244, 40);
    });
    aura(c, T, R, 360, 200, 230);
  },
  sword5(c, P, R, T) { // Starforged Blade: night-blue metal edged in gold, with stars caught in it
    at(c, 300, 316, 0.72, () => {
      poly(c, [[-42, 110], [42, 110], [36, -206], [0, -290], [-36, -206]], gold(c, -42, 0, 42, 0));
      poly(c, [[-29, 104], [29, 104], [24, -200], [0, -256], [-24, -200]], lin(c, -29, 0, 29, 0, T.metal));
      for (const [x, y, r] of [[0, 40, 24], [0, -70, 30], [0, -176, 20]]) star4(c, x, y, r, '#ffffff');
      for (const sd of [-1, 1]) shape(c, gold(c, 0, 60, 0, 140), () => { c.moveTo(0, 100); c.quadraticCurveTo(sd * 70, 128, sd * 124, 56); c.quadraticCurveTo(sd * 96, 150, 0, 140); });
      c.fillStyle = lin(c, -14, 0, 14, 0, ['#5a70d8', '#141c50']); c.fillRect(-14, 138, 28, 84); star4(c, 0, 250, 42, '#ffe08a'); star4(c, 0, 250, 20, '#ffffff');
    });
    aura(c, T, R, 390, 180, 260);
  },
  sword6(c, P, R, T) { // Doomedge: black and wave-edged, red-hot along the edge, horned at the guard
    const F = palOf('#ff3a1a');
    const wave = (k) => [[-30 * k, 110], [30 * k, 110], [46 * k, 40], [24 * k, -30], [44 * k, -100], [20 * k, -170], [32 * k, -226], [0, -290 - (k - 1) * 60], [-32 * k, -226], [-20 * k, -170], [-44 * k, -100], [-24 * k, -30], [-46 * k, 40]];
    at(c, 300, 320, 0.72, () => {
      poly(c, wave(1.34), '#ffb040'); poly(c, wave(1.16), '#ff3a1a'); poly(c, wave(0.84), lin(c, -40, 0, 40, 0, T.metal));
      line(c, 0, 90, 0, -230, 7, '#ff6a2a'); line(c, 0, 20, 14, -30, 5, '#ff6a2a'); line(c, 0, -90, -14, -140, 5, '#ff6a2a');
      for (const sd of [-1, 1]) shape(c, lin(c, 0, 20, 0, 140, ['#ff6a2a', '#5a1818', '#1a0608']), () => { c.moveTo(0, 104); c.quadraticCurveTo(sd * 120, 120, sd * 132, 10); c.quadraticCurveTo(sd * 96, 104, 0, 142); });
      c.fillStyle = '#2a141c'; c.fillRect(-15, 136, 30, 88); for (let i = 0; i < 4; i++) line(c, -15, 150 + i * 20, 15, 160 + i * 20, 4, '#ff3a1a');
      ball(c, F, 0, 248, 32); c.fillStyle = '#000000'; c.beginPath(); c.ellipse(0, 248, 6, 22, 0, 0, TAU); c.fill(); // an eye for a pommel
    });
    aura(c, T, R, 370, 210, 280);
  },
  sword(c, P, R, T) { return ITEM['sword' + T.n](c, P, R, T); },

  // ── the other weapons: one shape each, grown and re-made tier by tier ──
  dagger(c, P, R, T) {
    at(c, 300, 300, -0.75, () => {
      const L = 0.8 + T.n * 0.05;
      shape(c, tm(c, T, -30, 0, 34, 0), () => { c.moveTo(-26, 60); c.lineTo(30, 60);
        if (T.n === 2) { c.bezierCurveTo(76, 0, -14, -70, 36, -130); c.quadraticCurveTo(30, -200, -6, -246); c.bezierCurveTo(-56, -160, 14, -100, -40, -20); c.quadraticCurveTo(-34, 30, -26, 60); } // a kris, waved
        else { c.quadraticCurveTo(42, -110 * L, -6, -236 * L); c.quadraticCurveTo(-32, -90 * L, -26, 60); } });
      line(c, -8, 40, -4, -150 * L, 5, T.n === 6 ? '#ff6a2a' : 'rgba(255,255,255,0.7)');
      if (T.n >= 4) for (const y of [-10, -60, -110]) cut(c, [[48, y + 16], [16, y], [48, y - 16]]);
      shape(c, tt(c, T, 0, 56, 0, 86), () => { c.moveTo(-70, 56); c.lineTo(70, 56); c.lineTo(56, 86); c.lineTo(-56, 86); });
      c.fillStyle = T.n === 6 ? '#2a141c' : leather(c, -14, 0, 14, 0); c.fillRect(-14, 86, 28, 96); ball(c, P, 0, 200, 24);
      mark(c, T, 0, 70, 0.5);
    });
    aura(c, T, R, 190, 190, 210);
  },
  mace(c, P, R, T) {
    at(c, 300, 300, 0.7, () => {
      c.fillStyle = T.n >= 3 ? tt(c, T, -16, 0, 16, 0) : wood(c, -16, 0, 16, 0); c.fillRect(-15, -40, 30, 290); ball(c, P, 0, 250, 22);
      const r = 72 + T.n * 5;
      if (T.n === 1) { // an oak club, studded
        disc(c, 0, -130, r + 9, '#2a180e'); c.fillStyle = wood(c, -80, -210, 80, -50); c.beginPath(); c.arc(0, -130, r, 0, TAU); c.fill();
        for (let i = 0; i < 6; i++) at(c, 0, -130, (i / 6) * TAU, () => { disc(c, 0, -r * 0.62, 15, '#3a4050'); disc(c, -3, -r * 0.62 - 3, 9, '#e4e8f0'); }); disc(c, 0, -130, 15, '#3a4050'); disc(c, -3, -133, 9, '#e4e8f0'); return;
      }
      for (let i = 0; i < 8; i++) at(c, 0, -130, (i / 8) * TAU, () => poly(c, [[-26, -r + 22], [0, -r - 40 - T.n * 9], [26, -r + 22]], T.metal[i % 2]));
      c.fillStyle = tm(c, T, -80, -210, 80, -50); c.beginPath(); c.arc(0, -130, r, 0, TAU); c.fill(); disc(c, -r * 0.36, -130 - r * 0.36, r * 0.2, 'rgba(255,255,255,0.8)');
      c.strokeStyle = P.mid; c.lineWidth = 12; c.beginPath(); c.arc(0, -130, r * 0.66, 0, TAU); c.stroke();
      mark(c, T, 0, -130, 0.72);
    });
    aura(c, T, R, 384, 200, 230);
  },
  hammer(c, P, R, T) {
    at(c, 300, 300, 0.7, () => {
      c.fillStyle = T.n >= 3 ? tt(c, T, -16, 0, 16, 0) : wood(c, -16, 0, 16, 0); c.fillRect(-16, -60, 32, 310); ball(c, P, 0, 250, 22);
      const hw = 92 + T.n * 9, hh = T.n === 1 ? 50 : 68, y = -135;
      c.fillStyle = '#10141e'; c.fillRect(-hw - 9, y - hh - 9, hw * 2 + 18, hh * 2 + 18);
      if (T.n >= 5) for (const sd of [-1, 1]) poly(c, [[sd * hw, y - hh - 9], [sd * (hw + 70), y], [sd * hw, y + hh + 9]], T.metal[1]);
      c.fillStyle = tm(c, T, 0, y - hh, 0, y + hh); c.fillRect(-hw, y - hh, hw * 2, hh * 2); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(-hw, y - hh, hw * 2, 18);
      if (T.deco) mark(c, T, 0, y + 4, 0.95); else { c.fillStyle = P.mid; c.fillRect(-36, y - hh - 6, 72, hh * 2 + 12); c.fillStyle = P.hot; c.fillRect(-36, y - hh - 6, 72, 20); }
    });
    aura(c, T, R, 388, 196, 240);
  },
  staff(c, P, R, T) {
    const A = T.gem ? palOf(T.gem) : P;
    at(c, 300, 300, 0.5, () => {
      c.fillStyle = T.n >= 3 ? tt(c, T, -12, 0, 12, 0) : wood(c, -12, 0, 12, 0); c.fillRect(-12, -150, 24, 410);
      if (T.n === 1) { disc(c, 0, -160, 36, '#3c2616'); disc(c, -6, -166, 24, '#a87a48'); poly(c, [[-24, -180], [0, -276], [24, -180], [0, -160]], P.mid); poly(c, [[-24, -180], [0, -276], [0, -160]], P.core); return; } // a knot of ash with a chip of crystal
      for (const sd of [-1, 1]) shape(c, tt(c, T, 0, -260, 0, -140), () => { c.moveTo(sd * 10, -140); c.quadraticCurveTo(sd * 96, -180, sd * 70, -290); c.quadraticCurveTo(sd * 60, -210, sd * 10, -170); });
      if (T.n === 2) { fire(c, 0, -190, 50, 150); ball(c, P, 0, -206, 34); } // an ember rod
      else { disc(c, 0, -226, 58, 'rgba(8,6,14,0.55)'); mark(c, T, 0, -226, 1.35); }
    });
    halo(c, A, 410, 100, 220, 0.6); sparks(c, A, R, 410, 100, 14, 120);
  },
  bow(c, P, R, T) {
    const limb = T.n >= 3 ? tm(c, T, 250, 60, 430, 540) : wood(c, 250, 60, 430, 540), a = 0.98, wd = 18 + Math.min(T.n, 3) * 4;
    c.lineCap = 'round'; c.strokeStyle = '#1a1010'; c.lineWidth = wd + 12; c.beginPath(); c.arc(130, 300, 290, -a, a); c.stroke();
    c.strokeStyle = limb; c.lineWidth = wd; c.beginPath(); c.arc(130, 300, 290, -a, a); c.stroke();
    const ex = 130 + Math.cos(a) * 290, ey = Math.sin(a) * 290;
    if (T.n >= 2) for (const sd of [-1, 1]) line(c, ex, 300 + sd * ey, ex + 44, 300 + sd * (ey + 26), wd * 0.7, T.n >= 3 ? T.metal[1] : '#7a5230'); // recurved tips
    line(c, ex, 300 - ey, 200, 300, 4, '#f4ecd8'); line(c, ex, 300 + ey, 200, 300, 4, '#f4ecd8');
    c.strokeStyle = P.mid; c.lineWidth = wd + 4; c.beginPath(); c.arc(130, 300, 290, -0.12, 0.12); c.stroke();
    line(c, 200, 300, 520, 300, 9, '#d8c090'); poly(c, [[566, 300], [506, 270], [518, 300], [506, 330]], tm(c, T, 500, 270, 560, 330)); poly(c, [[200, 300], [168, 276], [226, 290]], P.hot); poly(c, [[200, 300], [168, 324], [226, 310]], P.mid);
    if (T.deco) { mark(c, T, ex + 16, 300 - ey - 4, 0.6); mark(c, T, ex + 16, 300 + ey + 30, 0.6); }
    aura(c, T, R, 430, 300, 230);
  },

  // ── armour ──
  armor(c, P, R, T) {
    shape(c, '#141a28', () => { c.moveTo(150, 130); c.lineTo(450, 130); c.lineTo(486, 250); c.lineTo(430, 290); c.lineTo(420, 500); c.lineTo(180, 500); c.lineTo(170, 290); c.lineTo(114, 250); });
    shape(c, tm(c, T, 160, 120, 440, 500), () => { c.moveTo(164, 142); c.lineTo(250, 142); c.quadraticCurveTo(300, 200, 350, 142); c.lineTo(436, 142); c.lineTo(470, 244); c.lineTo(418, 280); c.lineTo(408, 488); c.lineTo(192, 488); c.lineTo(182, 280); c.lineTo(130, 244); });
    poly(c, [[300, 190], [408, 300], [408, 488], [300, 488]], 'rgba(16,24,52,0.3)');
    if (T.n === 1) { for (let i = 0; i < 9; i++) { line(c, 196, 214 + i * 30, 404, 214 + i * 30, 3, 'rgba(20,28,52,0.5)'); line(c, 200 + i * 25, 200, 200 + i * 25, 480, 3, 'rgba(20,28,52,0.35)'); } } // chain links
    else line(c, 300, 196, 300, 480, 8, 'rgba(20,28,52,0.6)');
    c.fillStyle = P.mid; c.fillRect(192, 400, 216, 26); c.fillStyle = P.hot; c.fillRect(192, 400, 216, 8);
    for (const x of [150, 450]) { if (T.n >= 4) poly(c, [[x - 34, 150], [x + (x < 300 ? -30 : 30), 50], [x + 34, 150]], T.metal[1]); disc(c, x, 180, 62, '#141a28'); c.fillStyle = tm(c, T, x - 50, 130, x + 50, 230); c.beginPath(); c.arc(x, 180, 52, 0, TAU); c.fill(); disc(c, x - 16, 162, 12, 'rgba(255,255,255,0.85)'); }
    if (T.deco) mark(c, T, 300, 296, 0.95); else ball(c, P, 300, 290, 34);
    aura(c, T, R, 300, 290, 250);
  },
  vest(c, P, R, T) {
    shape(c, '#20140c', () => { c.moveTo(170, 120); c.lineTo(430, 120); c.lineTo(470, 230); c.lineTo(424, 262); c.lineTo(432, 500); c.lineTo(168, 500); c.lineTo(176, 262); c.lineTo(130, 230); });
    shape(c, T.n >= 3 ? lin(c, 170, 120, 430, 500, T.cloth) : leather(c, 170, 120, 430, 500), () => { c.moveTo(182, 134); c.lineTo(258, 134); c.lineTo(300, 220); c.lineTo(342, 134); c.lineTo(418, 134); c.lineTo(454, 224); c.lineTo(410, 254); c.lineTo(418, 486); c.lineTo(182, 486); c.lineTo(190, 254); c.lineTo(146, 224); });
    line(c, 300, 224, 300, 480, 7, 'rgba(20,12,8,0.7)');
    if (T.deco) mark(c, T, 300, 350, 0.95); else for (let i = 0; i < 5; i++) { line(c, 276, 250 + i * 46, 324, 272 + i * 46, 6, '#f0e0c0'); line(c, 324, 250 + i * 46, 276, 272 + i * 46, 6, '#f0e0c0'); }
    c.fillStyle = P.mid; c.fillRect(182, 440, 236, 22); poly(c, [[182, 134], [258, 134], [246, 160], [190, 160]], P.hot); poly(c, [[418, 134], [342, 134], [354, 160], [410, 160]], P.mid);
    if (T.n === 2) for (const x of [164, 436]) poly(c, [[x - 30, 232], [x, 300], [x + 30, 232]], '#4f7a3a'); // a ranger's green at the shoulder
    if (T.n === 3) for (let i = 0; i < 7; i++) disc(c, 188 + i * 37, 146 - Math.abs(3 - i) * 4, 24, '#ffffff'); // a fur collar
    aura(c, T, R, 300, 320, 250);
  },
  robe(c, P, R, T) {
    shape(c, '#0e0a14', () => { c.moveTo(214, 96); c.lineTo(386, 96); c.lineTo(500, 250); c.lineTo(440, 300); c.lineTo(470, 530); c.lineTo(130, 530); c.lineTo(160, 300); c.lineTo(100, 250); });
    shape(c, lin(c, 160, 100, 440, 520, T.cloth), () => { c.moveTo(222, 110); c.lineTo(378, 110); c.lineTo(482, 246); c.lineTo(424, 290); c.lineTo(454, 516); c.lineTo(146, 516); c.lineTo(176, 290); c.lineTo(118, 246); });
    shape(c, 'rgba(10,6,16,0.75)', () => { c.moveTo(250, 110); c.lineTo(350, 110); c.lineTo(300, 230); }); c.fillStyle = tt(c, T, 0, 300, 0, 330); c.fillRect(190, 304, 220, 24);
    line(c, 300, 328, 286, 500, 9, 'rgba(255,255,255,0.3)'); line(c, 240, 330, 206, 510, 7, 'rgba(0,0,0,0.3)'); line(c, 360, 330, 394, 510, 7, 'rgba(0,0,0,0.3)');
    poly(c, [[150, 484], [450, 484], [454, 516], [146, 516]], P.mid); poly(c, [[150, 484], [450, 484], [451, 492], [149, 492]], P.hot);
    if (T.deco) mark(c, T, 300, 410, 0.95); else ball(c, P, 300, 316, 22);
    aura(c, T, R, 300, 380, 250);
  },

  // ── trinkets ──
  ring(c, P, R, T) {
    c.lineWidth = 62; c.strokeStyle = '#1a1010'; c.beginPath(); c.arc(300, 350, 140, 0, TAU); c.stroke(); c.lineWidth = 48; c.strokeStyle = lin(c, 160, 210, 440, 490, T.band); c.beginPath(); c.arc(300, 350, 140, 0, TAU); c.stroke();
    c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(300, 350, 152, 3.5, 4.6); c.stroke();
    if (T.deco) { mark(c, T, 300, 170, 1.7); for (const sd of [-1, 1]) ball(c, P, 300 + sd * 96, 250, 16); }
    else { poly(c, [[300, 96], [372, 168], [300, 250], [228, 168]], '#1a1010'); poly(c, [[300, 110], [360, 168], [300, 236], [240, 168]], P.mid); poly(c, [[300, 110], [360, 168], [300, 168]], P.hot); poly(c, [[300, 110], [240, 168], [300, 168]], P.core); }
    if (T.gem) aura(c, T, R, 300, 176, 200); else halo(c, P, 300, 168, 170, 0.6);
  },
  amulet(c, P, R, T) {
    c.lineWidth = 12; c.strokeStyle = lin(c, 120, 60, 480, 300, T.n === 1 ? ['#c89868', '#8a5a34', '#40281a'] : T.band); c.setLineDash(T.n === 1 ? [] : [22, 12]); c.beginPath(); c.moveTo(110, 60); c.quadraticCurveTo(300, 380, 490, 60); c.stroke(); c.setLineDash([]);
    if (T.n === 1) { disc(c, 300, 370, 122, '#2a180e'); c.fillStyle = wood(c, 200, 270, 400, 470); c.beginPath(); c.arc(300, 370, 108, 0, TAU); c.fill(); c.strokeStyle = '#3c2616'; c.lineWidth = 9; c.beginPath(); c.arc(300, 370, 76, 0, TAU); c.stroke(); ball(c, P, 300, 370, 30); } // a carved charm
    else if (T.n === 2) { for (let i = 0; i < 12; i++) at(c, 300, 370, (i / 12) * TAU, () => poly(c, [[-24, -90], [0, -(140 + (i % 2) * 30)], [24, -90]], i % 2 ? '#fff3c0' : '#e0a834')); disc(c, 300, 370, 100, '#6a4410'); c.fillStyle = gold(c, 220, 290, 380, 450); c.beginPath(); c.arc(300, 370, 90, 0, TAU); c.fill(); ball(c, P, 300, 370, 44); } // a sun
    else { poly(c, [[300, 210], [404, 360], [300, 520], [196, 360]], '#1a1010'); poly(c, [[300, 228], [388, 360], [300, 500], [212, 360]], lin(c, 212, 228, 388, 500, T.band)); poly(c, [[300, 268], [360, 360], [300, 456], [240, 360]], 'rgba(8,6,14,0.7)'); mark(c, T, 300, 364, 1.05); ball(c, P, 300, 470, 14); }
    if (T.gem) aura(c, T, R, 300, 360, 220); else halo(c, P, 300, 360, 200, 0.6);
  },
  boots(c, P, R, T) {
    const boot = (ox, oy, s) => at(c, ox, oy, 0, () => {
      shape(c, '#20140c', () => { c.moveTo(-90, -200); c.lineTo(50, -200); c.lineTo(56, 20); c.quadraticCurveTo(190, 50, 200, 130); c.lineTo(200, 170); c.lineTo(-96, 170); });
      shape(c, T.n >= 3 ? lin(c, -90, -200, 190, 160, T.cloth) : leather(c, -90, -200, 190, 160), () => { c.moveTo(-78, -188); c.lineTo(38, -188); c.lineTo(44, 30); c.quadraticCurveTo(176, 58, 188, 130); c.lineTo(-84, 130); });
      c.fillStyle = '#1a100a'; c.fillRect(-90, 130, 284, 32); c.fillStyle = P.mid; c.fillRect(-84, -188, 128, 36); c.fillStyle = P.hot; c.fillRect(-84, -188, 128, 12); line(c, -50, -120, -46, 100, 8, 'rgba(255,255,255,0.3)');
      if (T.n === 2) for (let i = 0; i < 3; i++) line(c, -70, -110 + i * 50, 30, -96 + i * 50, 9, '#f0c880'); // wrapped against the sand
      if (T.n === 3) for (let i = 0; i < 5; i++) disc(c, -76 + i * 30, -176, 24, '#ffffff'); // fur at the cuff
      if (T.deco) mark(c, T, -20, -40, 0.62);
    }, s);
    boot(210, 300, 0.9); boot(330, 350, 1.05); aura(c, T, R, 300, 300, 250);
  },

  // ── what the great bosses leave behind: each its own object, not the stock ring or amulet ──
  u_guardian_heart(c, P, R) { // Guardian's Heartwood: a heart carved by no hand, still putting out leaves
    const G = palOf('#6fd06f');
    shape(c, '#2a180e', () => heartAt(c, 300, 350, 1.02)); shape(c, wood(c, 180, 190, 440, 560), () => heartAt(c, 300, 350, 0.92));
    c.lineCap = 'round'; for (const [r, w] of [[40, 8], [84, 7], [128, 6]]) { c.strokeStyle = 'rgba(40,22,10,0.55)'; c.lineWidth = w; c.beginPath(); c.arc(300, 370, r, 0.3, 2.9); c.stroke(); }
    line(c, 236, 280, 222, 360, 10, 'rgba(255,230,180,0.5)');
    line(c, 300, 286, 306, 180, 12, '#4f7a3a'); leafAt(c, 306, 190, 0.9, 130, '#6fd06f'); leafAt(c, 306, 210, -0.8, 110, '#4f9a4a'); leafAt(c, 306, 180, 0.05, 90, '#a8e88a');
    halo(c, G, 300, 330, 300, 0.4); sparks(c, G, R, 300, 300, 14, 260);
  },
  u_tyrant_fang(c) { // Tyrant Fang Ring: a band of dark bronze set with the beast's tooth
    const B = palOf('#e0301a');
    c.lineWidth = 64; c.strokeStyle = '#140c08'; c.beginPath(); c.arc(300, 400, 124, 0, TAU); c.stroke();
    c.lineWidth = 48; c.strokeStyle = lin(c, 170, 280, 430, 520, ['#e0a060', '#7a4420', '#2a1408']); c.beginPath(); c.arc(300, 400, 124, 0, TAU); c.stroke();
    c.lineWidth = 7; c.strokeStyle = 'rgba(255,230,190,0.75)'; c.beginPath(); c.arc(300, 400, 136, 3.5, 4.5); c.stroke();
    shape(c, '#140c08', () => { c.moveTo(214, 300); c.quadraticCurveTo(230, 120, 396, 44); c.quadraticCurveTo(378, 210, 386, 300); });
    shape(c, lin(c, 220, 60, 390, 300, ['#fffdf0', '#ead8a8', '#8a7040']), () => { c.moveTo(230, 292); c.quadraticCurveTo(246, 136, 380, 66); c.quadraticCurveTo(360, 210, 370, 292); });
    shape(c, 'rgba(90,60,20,0.4)', () => { c.moveTo(320, 292); c.quadraticCurveTo(326, 170, 380, 66); c.quadraticCurveTo(360, 210, 370, 292); });
    line(c, 258, 260, 300, 150, 6, 'rgba(255,255,255,0.8)');
    c.fillStyle = '#140c08'; c.fillRect(206, 284, 188, 34); c.fillStyle = lin(c, 0, 288, 0, 314, ['#e0a060', '#7a4420']); c.fillRect(214, 290, 172, 22);
    for (const x of [240, 300, 360]) ball(c, B, x, 301, 13);
    shape(c, B.mid, () => { c.moveTo(380, 66); c.quadraticCurveTo(404, 120, 384, 138); c.quadraticCurveTo(364, 120, 380, 66); }); halo(c, B, 330, 200, 240, 0.4); // blood still on the point
  },
  u_queen_tiara(c, P, R) { // Tiara of Endless Winter: a silver circlet grown over with spires of ice
    const I = palOf('#7fd4ff'); const ice = (x, base, hgt, w) => { poly(c, [[x - w, base], [x, base - hgt], [x + w, base]], lin(c, x - w, 0, x + w, 0, ['#ffffff', '#8fdcff', '#2a6aa8'])); poly(c, [[x, base], [x, base - hgt], [x + w, base]], 'rgba(20,70,140,0.4)'); };
    for (const [x, hgt, w] of [[120, 120, 30], [196, 200, 36], [404, 200, 36], [480, 120, 30]]) ice(x, 400 + Math.abs(x - 300) * 0.16, hgt, w);
    ice(300, 386, 320, 46);
    c.lineCap = 'round'; c.lineWidth = 62; c.strokeStyle = '#141a28'; c.beginPath(); c.moveTo(84, 456); c.quadraticCurveTo(300, 356, 516, 456); c.stroke();
    c.lineWidth = 46; c.strokeStyle = steel(c, 0, 380, 0, 470); c.beginPath(); c.moveTo(84, 456); c.quadraticCurveTo(300, 356, 516, 456); c.stroke();
    c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.moveTo(100, 440); c.quadraticCurveTo(300, 344, 500, 440); c.stroke();
    poly(c, [[300, 356], [344, 406], [300, 460], [256, 406]], '#141a28'); poly(c, [[300, 368], [334, 406], [300, 448], [266, 406]], I.mid); poly(c, [[300, 368], [334, 406], [300, 406]], I.hot); poly(c, [[300, 368], [266, 406], [300, 406]], I.core);
    for (const x of [170, 430]) ball(c, I, x, 428, 15);
    halo(c, I, 300, 240, 300, 0.5); sparks(c, I, R, 300, 220, 22, 260);
  },
  u_lich_phylactery(c, P, R) { // Shattered Phylactery: a soul-jar broken open, and what was in it getting out
    const V = palOf('#a070ff'), S = palOf('#8fe0c0');
    for (const [x, w, hgt, col] of [[300, 70, 300, 'rgba(143,224,192,0.55)'], [270, 40, 220, 'rgba(160,112,255,0.7)'], [326, 30, 170, '#ffffff']]) tongue(c, x, 300, w, hgt, col);
    shape(c, '#140c1c', () => { c.moveTo(196, 250); c.bezierCurveTo(110, 330, 150, 520, 240, 548); c.lineTo(360, 548); c.bezierCurveTo(450, 520, 490, 330, 404, 250); });
    shape(c, lin(c, 170, 250, 430, 540, [V.hot, V.mid, V.deep]), () => { c.moveTo(206, 262); c.bezierCurveTo(132, 336, 166, 506, 246, 534); c.lineTo(354, 534); c.bezierCurveTo(434, 506, 468, 336, 394, 262); });
    cut(c, [[190, 240], [236, 300], [270, 262], [304, 322], [340, 268], [372, 304], [412, 240]]); // the broken rim
    c.fillStyle = gold(c, 0, 420, 0, 450); c.fillRect(170, 420, 260, 24); skull(c, 300, 372, 34);
    for (const [pts] of [[[[236, 300], [220, 372], [250, 420]]], [[[372, 304], [392, 380]]]]) { c.strokeStyle = '#140c1c'; c.lineWidth = 7; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
    line(c, 196, 330, 190, 450, 9, 'rgba(255,255,255,0.4)'); halo(c, S, 300, 180, 260, 0.5); sparks(c, S, R, 300, 160, 18, 220);
  },
  u_dragon_scale(c, P, R) { // Aurelion Scale Treads: boots scaled in dragon-gold, winged at the heel
    const Y = palOf('#ffe08a');
    wing(c, 220, 330, -1, 0.9);
    at(c, 290, 330, 0, () => {
      shape(c, '#2a1a08', () => { c.moveTo(-90, -200); c.lineTo(50, -200); c.lineTo(56, 20); c.quadraticCurveTo(190, 50, 200, 130); c.lineTo(200, 170); c.lineTo(-96, 170); });
      c.save(); c.beginPath(); c.moveTo(-78, -188); c.lineTo(38, -188); c.lineTo(44, 30); c.quadraticCurveTo(176, 58, 188, 130); c.lineTo(-84, 130); c.closePath(); c.clip();
      c.fillStyle = '#8a5a14'; c.fillRect(-100, -200, 320, 360);
      for (let r = 0; r < 9; r++) for (let i = 0; i < 9; i++) { const x = -90 + i * 36 + (r % 2) * 18, y = -180 + r * 38; c.fillStyle = gold(c, x - 20, y - 20, x + 20, y + 24); c.beginPath(); c.arc(x, y, 22, 0, Math.PI); c.fill(); }
      c.restore(); c.fillStyle = '#1a100a'; c.fillRect(-90, 130, 284, 32); c.fillStyle = '#fff3c0'; c.fillRect(-84, -188, 128, 14); line(c, -54, -150, -50, 90, 9, 'rgba(255,255,255,0.45)');
    }, 1.1);
    halo(c, Y, 300, 320, 300, 0.4); sparks(c, Y, R, 300, 300, 18, 260);
  },
  u_overlord_crown(c, P, R) { // Crown of the Last World: black iron, five spikes, and a red stone that watches
    const F = palOf('#ff3a1a'); const spike = (x, base, hgt, w) => { poly(c, [[x - w - 8, base], [x, base - hgt - 16], [x + w + 8, base]], '#ff3a1a'); poly(c, [[x - w, base], [x, base - hgt], [x + w, base]], lin(c, x - w, 0, x + w, 0, ['#6a4a5a', '#1c0c14', '#000000'])); };
    for (const [x, hgt, w] of [[130, 150, 30], [214, 220, 34], [386, 220, 34], [470, 150, 30]]) spike(x, 380, hgt, w);
    spike(300, 380, 300, 40);
    c.fillStyle = '#ff3a1a'; c.fillRect(82, 364, 436, 128); c.fillStyle = lin(c, 0, 372, 0, 484, ['#6a4a5a', '#1c0c14', '#000000']); c.fillRect(90, 372, 420, 112); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(90, 372, 420, 12);
    for (const x of [160, 440]) ball(c, F, x, 428, 22); ball(c, F, 300, 428, 40); c.fillStyle = '#000000'; c.beginPath(); c.ellipse(300, 428, 8, 28, 0, 0, TAU); c.fill();
    halo(c, F, 300, 300, 320, 0.45); sparks(c, F, R, 300, 240, 18, 260);
  },
  u_mother_cap(c, P, R) { // Sporemother's Cap: a toadstool the size of a helm, still shedding
    const V = palOf('#c060e0'), G = palOf('#8fe060');
    shape(c, '#1a1010', () => { c.moveTo(232, 330); c.quadraticCurveTo(210, 470, 190, 540); c.lineTo(410, 540); c.quadraticCurveTo(390, 470, 368, 330); });
    shape(c, lin(c, 220, 0, 390, 0, ['#fff8e0', '#d8c8a0', '#8a7858']), () => { c.moveTo(244, 330); c.quadraticCurveTo(224, 470, 208, 528); c.lineTo(392, 528); c.quadraticCurveTo(376, 470, 356, 330); });
    shape(c, '#1a0c20', () => { c.moveTo(60, 352); c.bezierCurveTo(70, 60, 530, 60, 540, 352); c.quadraticCurveTo(300, 400, 60, 352); });
    shape(c, lin(c, 120, 90, 480, 360, [V.core, V.mid, V.deep]), () => { c.moveTo(76, 340); c.bezierCurveTo(90, 84, 510, 84, 524, 340); c.quadraticCurveTo(300, 384, 76, 340); });
    for (const [x, y, r] of [[200, 200, 34], [330, 150, 44], [430, 250, 28], [270, 290, 22], [130, 290, 20], [380, 320, 16]]) { c.fillStyle = '#fff8e0'; c.beginPath(); c.ellipse(x, y, r, r * 0.72, 0, 0, TAU); c.fill(); }
    for (let i = 0; i < 9; i++) line(c, 120 + i * 45, 356, 250 + i * 12.5, 334, 4, 'rgba(20,10,24,0.5)');
    halo(c, G, 300, 440, 240, 0.4); sparks(c, G, R, 300, 460, 20, 220);
  },
  u_regent_gear(c, P, R) { // Regent's Mainspring: a brass wheel, and the coiled spring that drives it
    const B = palOf('#8fd0ff'); const brass = lin(c, 120, 120, 480, 480, ['#fff0b0', '#c89030', '#5a3a10']);
    for (let i = 0; i < 12; i++) at(c, 300, 300, (i / 12) * TAU, () => { poly(c, [[-40, -180], [-28, -256], [28, -256], [40, -180]], '#2a1a08'); poly(c, [[-30, -180], [-20, -244], [20, -244], [30, -180]], i % 2 ? '#c89030' : '#fff0b0'); });
    disc(c, 300, 300, 206, '#2a1a08'); c.fillStyle = brass; c.beginPath(); c.arc(300, 300, 194, 0, TAU); c.fill(); disc(c, 300, 300, 138, '#1a1408');
    c.strokeStyle = steel(c, 180, 180, 420, 420); c.lineWidth = 20; c.lineCap = 'round'; c.beginPath(); for (let a = 0; a < TAU * 2.6; a += 0.15) { const r = 14 + a * 7; c.lineTo(300 + Math.cos(a) * r, 300 + Math.sin(a) * r); } c.stroke();
    disc(c, 300, 300, 22, '#fff0b0'); c.lineWidth = 9; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(300, 300, 176, 3.5, 4.5); c.stroke();
    halo(c, B, 300, 300, 240, 0.3); sparks(c, B, R, 300, 300, 14, 260);
  },
  u_leviathan_pearl(c, P, R) { // Leviathan Pearl: the great shell open, and the moon-white thing inside it
    const W = palOf('#7fe0e0'); const fan = (y, sd, hgt, cols, rib) => { shape(c, '#0a2028', () => { c.moveTo(60, y); c.bezierCurveTo(70, y + sd * (hgt + 24), 530, y + sd * (hgt + 24), 540, y); }); shape(c, lin(c, 0, y, 0, y + sd * hgt * 0.75, cols), () => { c.moveTo(78, y); c.bezierCurveTo(92, y + sd * hgt, 508, y + sd * hgt, 522, y); });
      for (let i = -4; i <= 4; i++) line(c, 300 + i * 10, y, 300 + i * 50, y + sd * hgt * (0.7 - Math.abs(i) * 0.075), 7, rib); };
    fan(350, -1, 400, ['#2a8088', '#7fe0e0', '#e8ffff'], 'rgba(10,50,60,0.5)'); fan(380, 1, 200, ['#2a8088', '#1a5a66', '#0a2a34'], 'rgba(127,224,224,0.35)');
    disc(c, 300, 366, 92, '#0a2028'); const g = c.createRadialGradient(274, 336, 8, 300, 366, 84); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#f4e8f4'); g.addColorStop(1, '#a898c8'); disc(c, 300, 366, 82, g); disc(c, 270, 334, 14, '#ffffff');
    halo(c, W, 300, 360, 280, 0.5); sparks(c, W, R, 300, 300, 18, 260);
  },
  u_pyre_heart(c, P, R) { // Heart of the Pyre: a heart of black cinder, still burning from inside
    const F = palOf('#ff7a1a');
    for (const [x, hgt, w] of [[210, 200, 60], [390, 180, 56], [300, 260, 74]]) fire(c, x, 250, w, hgt);
    shape(c, '#ffb040', () => heartAt(c, 300, 330, 1.06)); shape(c, lin(c, 180, 180, 420, 540, ['#6a3830', '#1c0c0c', '#000000']), () => heartAt(c, 300, 330, 0.96));
    c.lineJoin = 'round'; c.lineCap = 'round'; for (const [pts, w] of [[[[300, 250], [270, 320], [318, 370], [286, 440], [300, 520]], 15], [[[270, 320], [200, 340], [176, 300]], 11], [[[318, 370], [392, 350], [420, 300]], 11], [[[286, 440], [230, 450]], 9]]) {
      for (const [col, k] of [['#ff3a1a', 1], ['#fff0b0', 0.4]]) { c.strokeStyle = col; c.lineWidth = w * k; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); } }
    halo(c, F, 300, 330, 320, 0.45); sparks(c, F, R, 300, 200, 24, 260);
  },
  u_unmaker_sigil(c, P, R) { // Sigil of Making: the sign the world was drawn with, on a disc of night
    const V = palOf('#b9a8ff');
    disc(c, 300, 300, 232, '#fff3c0'); disc(c, 300, 300, 218, '#0c0a1c'); c.lineCap = 'round'; c.lineJoin = 'round';
    const draw = (col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(300, 300, 170, 0, TAU); c.stroke();
      c.beginPath(); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i / 3) * TAU; c.lineTo(300 + Math.cos(a) * 170, 300 + Math.sin(a) * 170); } c.closePath(); c.stroke();
      c.beginPath(); for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i / 3) * TAU; c.lineTo(300 + Math.cos(a) * 170, 300 + Math.sin(a) * 170); } c.closePath(); c.stroke(); };
    draw(V.mid, 20); draw('#ffffff', 7); star4(c, 300, 300, 74, '#ffe08a'); star4(c, 300, 300, 36, '#ffffff');
    halo(c, V, 300, 300, 300, 0.55); sparks(c, V, R, 300, 300, 22, 260);
  },

  // ── potions and the like: a different vessel for each, so they are told apart without reading ──
  potion(c, P) {
    c.fillStyle = wood(c, 268, 60, 332, 60); c.fillRect(266, 62, 68, 60); c.fillStyle = 'rgba(220,235,255,0.5)'; c.fillRect(256, 116, 88, 100); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(244, 108, 112, 20);
    disc(c, 300, 370, 176, 'rgba(210,228,255,0.35)'); c.save(); c.beginPath(); c.arc(300, 370, 160, 0, TAU); c.clip(); c.fillStyle = lin(c, 0, 280, 0, 540, [P.hot, P.mid, P.deep]); c.fillRect(100, 290, 400, 300); c.fillStyle = P.core; c.fillRect(100, 290, 400, 12);
    for (const [x, y, r] of [[250, 400, 16], [340, 450, 22], [300, 350, 10], [370, 380, 12]]) disc(c, x, y, r, 'rgba(255,255,255,0.35)'); c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.arc(300, 370, 140, 3.5, 4.4); c.stroke(); halo(c, P, 300, 400, 230, 0.5);
  },
  hipotion(c, P) { // the greater potion: a heart-shaped flask, stoppered in gold
    c.fillStyle = gold(c, 0, 60, 0, 130); c.fillRect(262, 56, 76, 50); c.fillStyle = 'rgba(220,235,255,0.5)'; c.fillRect(260, 104, 80, 110); c.fillStyle = gold(c, 0, 100, 0, 124); c.fillRect(244, 100, 112, 22);
    shape(c, 'rgba(210,228,255,0.4)', () => heartAt(c, 300, 360, 1.02)); c.save(); c.beginPath(); heartAt(c, 300, 360, 0.93); c.closePath(); c.clip();
    c.fillStyle = lin(c, 0, 250, 0, 560, [P.hot, P.mid, P.deep]); c.fillRect(60, 262, 480, 320); c.fillStyle = P.core; c.fillRect(60, 262, 480, 12);
    for (const [x, y, r] of [[230, 340, 18], [360, 400, 24], [300, 460, 14], [400, 320, 12]]) disc(c, x, y, r, 'rgba(255,255,255,0.35)'); c.restore();
    line(c, 176, 300, 200, 400, 13, 'rgba(255,255,255,0.8)'); halo(c, P, 300, 380, 260, 0.55);
  },
  ether(c, P, R) { // ether: a tall narrow cone, with stars turning in it
    c.fillStyle = wood(c, 272, 30, 328, 30); c.fillRect(272, 34, 56, 50); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(250, 78, 100, 18);
    const body = () => { c.moveTo(266, 92); c.lineTo(334, 92); c.lineTo(340, 230); c.lineTo(470, 520); c.quadraticCurveTo(476, 546, 446, 548); c.lineTo(154, 548); c.quadraticCurveTo(124, 546, 130, 520); c.lineTo(260, 230); };
    shape(c, 'rgba(210,228,255,0.4)', body); c.save(); c.beginPath(); body(); c.closePath(); c.clip();
    c.fillStyle = lin(c, 0, 290, 0, 550, [P.hot, P.mid, P.deep]); c.fillRect(100, 300, 400, 260); c.fillStyle = P.core; c.fillRect(100, 300, 400, 10);
    for (const [x, y, r] of [[300, 380, 30], [230, 470, 20], [380, 480, 24]]) star4(c, x, y, r, 'rgba(255,255,255,0.85)'); c.restore();
    line(c, 244, 300, 176, 470, 11, 'rgba(255,255,255,0.8)'); halo(c, P, 300, 420, 240, 0.5); sparks(c, P, R, 300, 380, 10, 220);
  },
  antidote(c, P) { // panacea: a square apothecary's bottle with a paper label
    c.fillStyle = wood(c, 262, 50, 338, 50); c.fillRect(262, 50, 76, 56); c.fillStyle = 'rgba(220,235,255,0.5)'; c.fillRect(250, 100, 100, 70);
    c.fillStyle = 'rgba(210,228,255,0.4)'; c.beginPath(); c.roundRect(130, 160, 340, 390, 34); c.fill(); c.save(); c.beginPath(); c.roundRect(146, 176, 308, 358, 22); c.clip();
    c.fillStyle = lin(c, 0, 220, 0, 540, [P.hot, P.mid, P.deep]); c.fillRect(140, 232, 320, 310); c.fillStyle = P.core; c.fillRect(140, 232, 320, 10); c.restore();
    c.fillStyle = '#f1e4c5'; c.fillRect(196, 300, 208, 170); c.fillStyle = '#3a2a20'; c.fillRect(196, 300, 208, 8); c.fillRect(196, 462, 208, 8);
    c.fillStyle = P.mid; c.fillRect(280, 326, 40, 118); c.fillRect(241, 365, 118, 40); line(c, 166, 210, 166, 500, 11, 'rgba(255,255,255,0.75)'); halo(c, P, 300, 380, 240, 0.4);
  },
  elixir(c, P, R) { // the phoenix elixir: a round flask borne up on wings of gold, burning at the mouth
    for (const sd of [-1, 1]) wing(c, 300 + sd * 96, 400, sd, 0.95);
    fire(c, 300, 170, 50, 150); c.fillStyle = gold(c, 0, 150, 0, 220); c.fillRect(260, 160, 80, 70);
    disc(c, 300, 370, 150, '#6a4410'); disc(c, 300, 370, 138, 'rgba(255,244,214,0.5)'); c.save(); c.beginPath(); c.arc(300, 370, 126, 0, TAU); c.clip(); c.fillStyle = lin(c, 0, 290, 0, 500, [P.core, P.hot, P.mid]); c.fillRect(160, 300, 280, 220); c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.arc(300, 370, 108, 3.5, 4.4); c.stroke(); halo(c, P, 300, 360, 280, 0.6); sparks(c, P, R, 300, 300, 16, 260);
  },
  bomb(c, P, R) {
    disc(c, 290, 370, 176, '#06070a'); c.fillStyle = lin(c, 150, 220, 430, 520, ['#5a6274', '#1c2030', '#06070a']); c.beginPath(); c.arc(290, 370, 164, 0, TAU); c.fill(); disc(c, 232, 306, 30, 'rgba(255,255,255,0.55)');
    c.fillStyle = '#3a4050'; c.fillRect(256, 180, 68, 44); c.strokeStyle = '#c8a070'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(290, 184); c.quadraticCurveTo(330, 100, 420, 110); c.stroke();
    for (let i = 0; i < 10; i++) at(c, 430, 108, (i / 10) * TAU, () => poly(c, [[-12, 0], [0, -(40 + (i % 2) * 34)], [12, 0]], i % 2 ? P.hot : P.core)); disc(c, 430, 108, 20, P.core); halo(c, P, 430, 108, 200, 0.8); sparks(c, P, R, 430, 108, 16, 110);
  },
  leaf(c, P) { // one broad leaf, lit from within
    shape(c, '#0e1a0c', () => { c.moveTo(300, 80); c.bezierCurveTo(520, 180, 500, 430, 300, 540); c.bezierCurveTo(100, 430, 80, 180, 300, 80); });
    shape(c, lin(c, 140, 100, 460, 520, [P.core, P.hot, P.mid, P.deep]), () => { c.moveTo(300, 104); c.bezierCurveTo(492, 196, 476, 418, 300, 516); c.bezierCurveTo(124, 418, 108, 196, 300, 104); });
    line(c, 300, 124, 300, 580, 10, 'rgba(255,255,255,0.75)');
    for (const y of [230, 310, 390]) { line(c, 300, y, 212, y - 62, 6, 'rgba(255,255,255,0.5)'); line(c, 300, y, 388, y - 62, 6, 'rgba(255,255,255,0.5)'); }
    halo(c, P, 300, 300, 260, 0.6);
  },

  // ── materials: the thing itself, in its own colour ──
  gem(c, P) { // (anything without a picture of its own)
    poly(c, [[300, 110], [470, 250], [400, 500], [200, 500], [130, 250]], P.deep); poly(c, [[300, 130], [448, 254], [300, 300]], P.hot); poly(c, [[300, 130], [152, 254], [300, 300]], P.core); poly(c, [[152, 254], [300, 300], [210, 486]], P.mid); poly(c, [[448, 254], [300, 300], [390, 486]], P.mid); poly(c, [[300, 300], [390, 486], [210, 486]], P.hot);
    line(c, 300, 130, 300, 300, 4, 'rgba(255,255,255,0.6)'); halo(c, P, 300, 300, 260, 0.45);
  },
  m_heartwood(c) { // a billet of heartwood, sawn across
    shape(c, '#2a180e', () => { c.moveTo(120, 250); c.lineTo(420, 150); c.lineTo(510, 330); c.lineTo(210, 470); });
    shape(c, lin(c, 200, 180, 400, 440, ['#8a5a34', '#5a3a20', '#2a180e']), () => { c.moveTo(150, 260); c.lineTo(412, 172); c.lineTo(486, 322); c.lineTo(224, 440); });
    for (let i = 0; i < 4; i++) line(c, 230 + i * 50, 250 - i * 16, 290 + i * 50, 380 - i * 22, 5, 'rgba(20,10,4,0.5)');
    at(c, 186, 356, -0.42, () => { c.fillStyle = '#2a180e'; c.beginPath(); c.ellipse(0, 0, 92, 124, 0, 0, TAU); c.fill(); c.fillStyle = '#e8c890'; c.beginPath(); c.ellipse(0, 0, 78, 110, 0, 0, TAU); c.fill();
      for (const [k, col] of [[0.74, '#c08a50'], [0.48, '#d8623a'], [0.22, '#8a2a1a']]) { c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 78 * k, 110 * k, 0, 0, TAU); c.fill(); } });
  },
  m_spiritmoss(c, P, R) { // a clump of moss that glows
    for (const [x, y, r, col] of [[220, 380, 110, P.deep], [380, 390, 120, P.deep], [300, 300, 130, P.deep], [230, 360, 86, P.mid], [372, 372, 96, P.mid], [300, 290, 104, P.mid], [262, 270, 50, P.hot], [350, 320, 44, P.hot], [220, 330, 30, P.hot], [300, 240, 24, P.core]]) disc(c, x, y, r, col);
    for (let i = 0; i < 16; i++) disc(c, 180 + R() * 240, 220 + R() * 220, 6 + R() * 8, 'rgba(255,255,255,0.7)');
    halo(c, P, 300, 320, 280, 0.6); sparks(c, P, R, 300, 280, 16, 240);
  },
  m_sunstone(c, P, R) { // a stone with a small sun shut inside it
    for (let i = 0; i < 12; i++) at(c, 300, 300, (i / 12) * TAU, () => poly(c, [[-22, -150], [0, -(220 + (i % 2) * 40)], [22, -150]], i % 2 ? P.hot : P.mid));
    const hex = (r) => Array.from({ length: 6 }, (_, i) => [300 + Math.cos((i / 6) * TAU) * r, 300 + Math.sin((i / 6) * TAU) * r]);
    poly(c, hex(170), '#3a1c06'); poly(c, hex(152), P.mid); const h = hex(152); poly(c, [h[3], h[4], h[5], [300, 300]], P.hot); poly(c, [h[4], h[5], [300, 300]], P.core); poly(c, [h[0], h[1], h[2], [300, 300]], P.deep);
    disc(c, 300, 300, 50, '#fff8d0'); halo(c, P, 300, 300, 300, 0.6); sparks(c, P, R, 300, 300, 12, 260);
  },
  m_chitin(c, P) { // a scorpion's claw, shell and all
    const sh = lin(c, 120, 80, 480, 520, [P.core, P.mid, P.deep]);
    shape(c, '#2a1206', () => { c.moveTo(60, 470); c.lineTo(190, 340); c.lineTo(300, 440); c.lineTo(170, 570); }); shape(c, sh, () => { c.moveTo(84, 470); c.lineTo(190, 364); c.lineTo(276, 440); c.lineTo(170, 546); });
    shape(c, '#2a1206', () => { c.moveTo(150, 330); c.bezierCurveTo(150, 60, 420, 20, 540, 90); c.bezierCurveTo(400, 130, 360, 200, 372, 300); c.bezierCurveTo(470, 300, 520, 250, 548, 190); c.bezierCurveTo(580, 380, 420, 500, 290, 470); });
    shape(c, sh, () => { c.moveTo(172, 330); c.bezierCurveTo(176, 90, 400, 50, 486, 86); c.bezierCurveTo(380, 130, 336, 210, 350, 322); c.bezierCurveTo(450, 330, 510, 290, 536, 250); c.bezierCurveTo(540, 380, 410, 470, 296, 448); });
    for (let i = 0; i < 4; i++) cut(c, [[392 - i * 34, 196 + i * 30], [370 - i * 34, 170 + i * 30], [352 - i * 30, 206 + i * 30]]);
    c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,0.65)'; c.lineWidth = 11; c.beginPath(); c.moveTo(214, 280); c.quadraticCurveTo(230, 140, 360, 100); c.stroke(); line(c, 112, 466, 186, 392, 9, 'rgba(255,255,255,0.5)');
  },
  m_frostcrystal(c, P, R) { // a cluster of ice that does not melt
    const ice = (x, base, hgt, w, a) => at(c, x, base, a, () => { poly(c, [[-w - 8, 0], [-w - 8, -hgt * 0.7], [0, -hgt - 12], [w + 8, -hgt * 0.7], [w + 8, 0]], '#12304a'); poly(c, [[-w, 0], [-w, -hgt * 0.7], [0, -hgt], [w, -hgt * 0.7], [w, 0]], P.mid); poly(c, [[-w, 0], [-w, -hgt * 0.7], [0, -hgt], [0, 0]], P.core); poly(c, [[0, 0], [0, -hgt], [w, -hgt * 0.7], [w, 0]], 'rgba(20,70,140,0.35)'); });
    ice(190, 500, 250, 44, -0.5); ice(410, 500, 270, 46, 0.45); ice(250, 510, 190, 36, -0.15); ice(300, 520, 400, 60, 0.04); ice(360, 520, 170, 34, 0.2);
    halo(c, P, 300, 300, 300, 0.5); sparks(c, P, R, 300, 260, 16, 250);
  },
  m_rimesilk(c, P) { // a spool of thread spun from frost
    c.fillStyle = '#2a180e'; c.fillRect(130, 96, 340, 66); c.fillRect(130, 438, 340, 66); c.fillStyle = wood(c, 140, 0, 460, 0); c.fillRect(140, 104, 320, 50); c.fillRect(140, 446, 320, 50);
    c.fillStyle = '#5a6a80'; c.fillRect(168, 154, 264, 292); c.fillStyle = lin(c, 176, 0, 424, 0, ['#ffffff', P.mid, '#7a90b0']); c.fillRect(176, 154, 248, 292);
    for (let i = 0; i < 11; i++) line(c, 180, 170 + i * 26, 420, 184 + i * 26, 5, 'rgba(60,80,120,0.4)');
    c.strokeStyle = '#ffffff'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(420, 300); c.bezierCurveTo(520, 320, 470, 420, 540, 470); c.stroke(); halo(c, P, 300, 300, 260, 0.35);
  },
  m_bonedust(c, P) { // old bone, and the powder it is ground to
    c.fillStyle = '#3a3020'; c.beginPath(); c.ellipse(300, 446, 230, 96, 0, 0, TAU); c.fill(); c.fillStyle = lin(c, 0, 360, 0, 540, ['#fff8e0', P.mid, '#8a7c60']); c.beginPath(); c.ellipse(300, 440, 214, 82, 0, Math.PI, TAU); c.fill(); c.beginPath(); c.ellipse(300, 440, 214, 50, 0, 0, Math.PI); c.fill();
    at(c, 300, 260, -0.5, () => { for (const [w, col] of [[0, '#3a3020'], [1, null]]) { const k = w ? 0 : 10; c.fillStyle = col || lin(c, 0, -40, 0, 40, BONE); c.fillRect(-150, -24 - k, 300, 48 + k * 2); for (const [x, y] of [[-160, -30], [-160, 30], [160, -30], [160, 30]]) { c.beginPath(); c.arc(x, y, 40 + k, 0, TAU); c.fill(); } } line(c, -130, -8, 120, -8, 7, 'rgba(255,255,255,0.7)'); });
    for (const [x, y] of [[180, 420], [420, 430], [330, 470], [240, 480]]) disc(c, x, y, 9, '#ffffff');
  },
  m_soulshard(c, P, R) { // a splinter of someone, still looking out
    const pts = [[300, 60], [392, 220], [356, 330], [430, 480], [290, 548], [196, 420], [240, 300], [186, 200]];
    poly(c, pts.map(([x, y]) => [300 + (x - 300) * 1.1, 304 + (y - 304) * 1.06]), '#140c24'); poly(c, pts, P.mid);
    poly(c, [[300, 60], [392, 220], [356, 330], [300, 300]], P.hot); poly(c, [[300, 60], [186, 200], [240, 300], [300, 300]], P.core); poly(c, [[300, 300], [356, 330], [430, 480], [290, 548]], P.deep);
    for (const x of [262, 338]) { c.fillStyle = '#140c24'; c.beginPath(); c.ellipse(x, 300, 20, 30, 0, 0, TAU); c.fill(); disc(c, x, 292, 7, '#ffffff'); }
    halo(c, P, 300, 300, 300, 0.55); sparks(c, P, R, 300, 300, 18, 260);
  },
  m_starfragment(c, P, R) { // a piece broken off a star
    const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 104 : 238 - (i % 4) * 14; return [300 + Math.cos(a) * r, 310 + Math.sin(a) * r]; });
    poly(c, pts.map(([x, y]) => [300 + (x - 300) * 1.09, 310 + (y - 310) * 1.09]), '#4a3a08'); poly(c, pts, P.mid);
    for (let i = 0; i < 10; i += 2) { poly(c, [pts[i], pts[i + 1], [300, 310]], P.core); poly(c, [pts[i], pts[(i + 9) % 10], [300, 310]], P.hot); }
    star4(c, 300, 310, 60, '#ffffff'); halo(c, P, 300, 310, 320, 0.6); sparks(c, P, R, 300, 310, 24, 270);
  },
  m_aetherfeather(c, P, R) { // a feather too light to fall
    at(c, 300, 310, 0.6, () => {
      shape(c, '#1a2040', () => { c.moveTo(0, 230); c.bezierCurveTo(150, 120, 130, -160, 0, -270); c.bezierCurveTo(-130, -160, -150, 120, 0, 230); });
      shape(c, lin(c, -120, 0, 120, 0, ['#ffffff', P.hot, P.mid]), () => { c.moveTo(0, 214); c.bezierCurveTo(132, 112, 114, -150, 0, -250); c.bezierCurveTo(-114, -150, -132, 112, 0, 214); });
      for (let i = 0; i < 9; i++) { const y = 160 - i * 46; line(c, 0, y, 96 - Math.abs(i - 4) * 12, y - 50, 5, 'rgba(40,60,120,0.4)'); line(c, 0, y, -96 + Math.abs(i - 4) * 12, y - 50, 5, 'rgba(40,60,120,0.4)'); }
      cut(c, [[70, 60], [140, 40], [120, 100]]); line(c, 0, 290, 0, -240, 9, '#fff8e0');
    });
    halo(c, P, 300, 300, 300, 0.5); sparks(c, P, R, 300, 300, 14, 260);
  },
  m_voidichor(c, P) { // a drop of the dark between the realms; it does not sit still
    shape(c, P.hot, () => { c.moveTo(300, 50); c.bezierCurveTo(330, 200, 490, 290, 490, 400); c.bezierCurveTo(490, 600, 110, 600, 110, 400); c.bezierCurveTo(110, 290, 270, 200, 300, 50); });
    shape(c, lin(c, 180, 120, 420, 540, ['#3a1450', '#12061c', '#000000']), () => { c.moveTo(300, 96); c.bezierCurveTo(326, 220, 468, 300, 468, 400); c.bezierCurveTo(468, 576, 132, 576, 132, 400); c.bezierCurveTo(132, 300, 274, 220, 300, 96); });
    c.strokeStyle = P.mid; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); for (let a = 0; a < TAU * 1.7; a += 0.2) { const r = 10 + a * 11; c.lineTo(300 + Math.cos(a) * r, 410 + Math.sin(a) * r); } c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 12; c.beginPath(); c.arc(300, 400, 140, 3.4, 4.2); c.stroke(); halo(c, P, 300, 400, 280, 0.45);
  },
  m_abyssiron(c) { // an ingot from the forges below, never quite cooled
    const F = palOf('#ff3a1a');
    poly(c, [[70, 330], [190, 200], [450, 200], [530, 330], [530, 440], [70, 440]], '#ff3a1a');
    poly(c, [[190, 212], [444, 212], [514, 328], [86, 328]], '#6a4a5a'); poly(c, [[86, 328], [514, 328], [514, 428], [86, 428]], lin(c, 0, 328, 0, 428, ['#3a2430', '#0c0408']));
    c.lineCap = 'round'; c.lineJoin = 'round'; for (const pts of [[[230, 220], [260, 280], [220, 328], [250, 420]], [[380, 216], [350, 290], [400, 328], [370, 420]], [[260, 280], [350, 290]]]) for (const [col, w] of [['#ff3a1a', 12], ['#ffd080', 4]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
    line(c, 210, 228, 420, 228, 7, 'rgba(255,255,255,0.4)'); halo(c, F, 300, 320, 280, 0.4);
  },
};
// Which painter an item gets: a material or a boss's relic has its own; the rest share the picture of their kind,
// re-made for the tier.
const lookOf = (icon, it) => (it && it.mat && ITEM['m_' + it.mat] ? 'm_' + it.mat : it && it.uniqueId && ITEM['u_' + it.uniqueId] ? 'u_' + it.uniqueId : ITEM[icon] ? icon : 'gem');
const itemCache = new Map();
/** The painted picture of an item, as an image URL: `icon` picks the object and `color` its light (its rarity, or
 *  the potion's own colour); `item` gives the tier it is made in, or names the relic or the material. */
export function itemArt(icon, color = '#c8c0b0', item = null) {
  const look = lookOf(icon, item), n = item && item.tier && look === icon ? Math.max(1, Math.min(6, item.tier)) : 0;
  const key = look + color + n; let url = itemCache.get(key); if (url) return url;
  const w = 132; const mk = () => { const cv = document.createElement('canvas'); cv.width = w; cv.height = w; return cv; };
  const P = palOf(/^#[0-9a-f]{6}$/i.test(color) ? color : '#c8c0b0'); const R = seeded(hash(key)); const T = TIER[n || 2];
  // the object is painted on a sheet of its own, then laid on the ground with a thin light round it, so that a dark
  // thing still stands clear of the dark
  const lay = mk(), l = lay.getContext('2d'); l.scale(w / S, w / S); ITEM[look](l, P, R, T);
  const cv = mk(), c = cv.getContext('2d', { willReadFrequently: true });
  c.save(); c.scale(w / S, w / S); c.fillStyle = P.bg; c.fillRect(0, 0, S, S); glow(c, 300, 300, 420, P.rgb, 0.5); c.restore();
  c.shadowColor = (n && T.rim) || 'rgba(255,244,214,0.7)'; c.shadowBlur = 4; c.drawImage(lay, 0, 0); c.shadowColor = 'transparent'; c.shadowBlur = 0;
  finish(c, w, w);
  url = cv.toDataURL('image/jpeg', 0.88); itemCache.set(key, url); return url;
}

// ───── the world map ─────
// The sundered realms as a painted chart: every stage is an island adrift in a dark sky, in its own ground colour
// with a few of its landmarks. Painted once (islands sit at each stage's mapPos), then reused as one picture.
const LAND = { 1: '#5d8a3a', 2: '#d9b26f', 3: '#e4edf5', 4: '#5c5566', 5: '#c9c3e6', 6: '#3a2530', 7: '#3f6f6a', 8: '#8a7a5a', 9: '#e2c98a', 10: '#5a3026', 11: '#b9a8e6' };
const lite = (hex, k) => css(mix(hex, [255, 255, 255], k)), dark = (hex, k) => css(mix(hex, [0, 0, 0], k));
const tri = (c, x, y, w, hh, col) => poly(c, [[x - w, y], [x, y - hh], [x + w, y]], col);
const LANDMARK = {
  1: (c, x, y, R) => { c.fillStyle = '#4a3524'; c.fillRect(x - 2, y - 8, 4, 10); disc(c, x, y - 16, 11, '#2f5a26'); disc(c, x - 4, y - 19, 7, '#4f8a3a'); }, // trees
  2: (c, x, y, R) => { c.strokeStyle = '#a97a3a'; c.lineWidth = 3; c.beginPath(); c.arc(x, y + 6, 15, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.strokeStyle = '#f2d9a0'; c.beginPath(); c.arc(x, y + 9, 15, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }, // dunes
  3: (c, x, y, R) => { tri(c, x, y, 9, 24, '#7f9ab8'); tri(c, x, y - 8, 7, 18, '#b8cee0'); tri(c, x, y - 15, 5, 12, '#ffffff'); }, // snowy pines
  4: (c, x, y, R) => { c.fillStyle = '#2c2832'; c.fillRect(x - 6, y - 14, 12, 14); disc(c, x, y - 14, 6, '#2c2832'); c.fillStyle = '#8a8496'; c.fillRect(x - 4, y - 13, 8, 12); disc(c, x, y - 13, 4, '#8a8496'); }, // gravestones
  5: (c, x, y, R) => { poly(c, [[x, y - 26], [x + 8, y - 8], [x, y], [x - 8, y - 8]], '#6f6a9a'); poly(c, [[x, y - 26], [x + 8, y - 8], [x, y - 8]], '#f0ecff'); }, // crystals
  6: (c, x, y, R) => { if (R() < 0.4) { c.fillStyle = '#ff6a1a'; c.beginPath(); c.ellipse(x, y, 11, 5, 0, 0, TAU); c.fill(); c.fillStyle = '#ffd070'; c.beginPath(); c.ellipse(x, y, 6, 2.5, 0, 0, TAU); c.fill(); } else { tri(c, x, y, 6, 26, '#120a16'); tri(c, x + 2, y, 3, 20, '#4a3046'); } }, // spires and lava
  7: (c, x, y, R) => { c.fillStyle = '#d8e8e0'; c.fillRect(x - 2, y - 12, 4, 13); c.fillStyle = '#6a3a9a'; c.beginPath(); c.ellipse(x, y - 13, 12, 7, 0, Math.PI, TAU); c.fill(); disc(c, x - 4, y - 16, 2, '#80ffd0'); disc(c, x + 4, y - 15, 1.6, '#80ffd0'); }, // glowing mushrooms
  8: (c, x, y, R) => { c.fillStyle = '#3a3028'; c.fillRect(x - 5, y - 22, 10, 22); c.fillStyle = '#c09a50'; c.fillRect(x - 5, y - 22, 10, 4); disc(c, x + 10, y - 6, 7, '#c09a50'); disc(c, x + 10, y - 6, 3, '#3a3028'); }, // chimneys and gears
  9: (c, x, y, R) => { c.strokeStyle = '#6a4a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4, y - 12, x + 1, y - 22); c.stroke(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.7; line(c, x + 1, y - 22, x + 1 + Math.cos(a) * 12, y - 22 + Math.sin(a) * 9 + 5, 3, '#3f8a4a'); } }, // palms
  10: (c, x, y, R) => { tri(c, x, y, 16, 26, '#2a1410'); tri(c, x, y - 14, 6, 12, '#ff6a1a'); disc(c, x, y - 27, 4, '#ffd070'); }, // small volcanoes
  11: (c, x, y, R) => { poly(c, [[x - 5, y], [x - 3, y - 22], [x + 3, y - 22], [x + 5, y]], '#6f6a9a'); poly(c, [[x, y - 34], [x + 5, y - 28], [x, y - 22], [x - 5, y - 28]], '#fff0b0'); }, // pillars under floating shards
};
function island(c, R, x, y, r, col, id) {
  const pts = [...Array(16)].map((_, i) => { const a = (i / 16) * TAU, rr = r * (0.8 + R() * 0.28); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.58]; });
  const shape = (dy = 0, s = 1) => { c.beginPath(); pts.forEach(([px, py], i) => { const X = x + (px - x) * s, Y = y + (py - y) * s + dy; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath(); };
  const glo = c.createRadialGradient(x, y + r * 0.9, 0, x, y + r * 0.9, r * 1.2); glo.addColorStop(0, 'rgba(0,0,0,0.45)'); glo.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = glo; c.beginPath(); c.ellipse(x, y + r * 0.95, r * 1.1, r * 0.3, 0, 0, TAU); c.fill(); // its shadow on the clouds below
  // the rock it hangs from
  const left = Math.min(...pts.map((p) => p[0])), right = Math.max(...pts.map((p) => p[0]));
  c.fillStyle = lin(c, x, y, x, y + r * 0.95, ['#5a4636', '#2a1e1a', '#0e0a0c']); c.beginPath(); c.moveTo(left + 6, y + 6); c.quadraticCurveTo(x - r * 0.55, y + r * 0.55, x - r * 0.12 + R() * 16, y + r * 0.9); c.quadraticCurveTo(x + r * 0.3, y + r * 0.5, right - 6, y + 6); c.closePath(); c.fill();
  for (let i = 0; i < 4; i++) { const px = x + (R() - 0.5) * r * 1.3; tri(c, px, y + r * 0.22 + R() * 14, 7 + R() * 8, -(22 + R() * 30), '#1a1214'); }
  shape(14); c.fillStyle = dark(col, 0.5); c.fill(); shape(7); c.fillStyle = dark(col, 0.3); c.fill(); // the cliff edge
  shape(0); c.fillStyle = col; c.fill(); c.save(); shape(0); c.clip();
  const lg = c.createRadialGradient(x - r * 0.3, y - r * 0.25, 0, x, y, r); lg.addColorStop(0, lite(col, 0.32)); lg.addColorStop(0.6, col); lg.addColorStop(1, dark(col, 0.28)); c.fillStyle = lg; c.fillRect(x - r * 1.2, y - r, r * 2.4, r * 2);
  for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? lite(col, 0.14) : dark(col, 0.12); c.beginPath(); c.ellipse(x + (R() - 0.5) * r * 1.5, y + (R() - 0.5) * r * 0.8, 14 + R() * 26, 6 + R() * 10, R() * 0.6, 0, TAU); c.fill(); } // patches of ground
  if (id === 9) { c.strokeStyle = '#5ab0d0'; c.lineWidth = 9; shape(0, 0.97); c.stroke(); c.strokeStyle = '#d8f4ff'; c.lineWidth = 2.5; shape(0, 0.9); c.stroke(); } // surf round the beach
  c.restore();
  const mark = LANDMARK[id] || LANDMARK[1]; const spots = [...Array(11)].map(() => { const a = R() * TAU, d = 0.34 + R() * 0.5; return [x + Math.cos(a) * r * d, y + Math.sin(a) * r * d * 0.52 + 4]; }).sort((a, b) => a[1] - b[1]);
  for (const [px, py] of spots) mark(c, px, py, R);
}
function compass(c, x, y, r) {
  c.save(); c.translate(x, y); c.globalAlpha = 0.85; c.strokeStyle = '#e9d8b0'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, r * 0.78, 0, TAU); c.stroke();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, l = i % 2 ? r * 0.55 : r * 1.05, wd = i % 2 ? 6 : 10; c.save(); c.rotate(a); poly(c, [[0, -l], [wd, 0], [0, 0]], '#e9d8b0'); poly(c, [[0, -l], [-wd, 0], [0, 0]], '#8a7450'); c.restore(); }
  disc(c, 0, 0, 5, '#f2b632'); c.restore();
}
let mapUrl = null;
/** The painted world map as an image URL; `stages` gives each island its place and its number. */
export function worldMapArt(stages) {
  if (mapUrl) return mapUrl;
  const w = 1500, hgt = 900; const cv = document.createElement('canvas'); cv.width = w; cv.height = hgt; const c = cv.getContext('2d', { willReadFrequently: true }); const R = seeded(4242);
  const g = c.createRadialGradient(w * 0.5, hgt * 0.45, 60, w * 0.5, hgt * 0.5, w * 0.75); g.addColorStop(0, '#2f5068'); g.addColorStop(0.55, '#172a40'); g.addColorStop(1, '#0a1220'); c.fillStyle = g; c.fillRect(0, 0, w, hgt);
  for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,244,220,${(0.08 + R() * 0.4).toFixed(2)})`; c.beginPath(); c.arc(R() * w, R() * hgt, 0.6 + R() * 1.6, 0, TAU); c.fill(); } // stars in the gap between worlds
  for (let i = 0; i < 30; i++) { const x = R() * w, y = R() * hgt, s = 60 + R() * 150; const cg = c.createRadialGradient(x, y, 0, x, y, s); cg.addColorStop(0, 'rgba(200,222,240,0.13)'); cg.addColorStop(1, 'rgba(200,222,240,0)'); c.fillStyle = cg; c.save(); c.translate(x, y); c.scale(1.9, 0.5); c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill(); c.restore(); } // cloud bands
  const order = stages.map((_, i) => i).sort((a, b) => stages[a].mapPos[1] - stages[b].mapPos[1]);
  for (const i of order) { const s = stages[i]; island(c, seeded(100 + s.id * 37), s.mapPos[0] * w, s.mapPos[1] * hgt, 112, LAND[s.id] || '#7a7a7a', s.id); }
  compass(c, 110, hgt - 105, 58);
  finish(c, w, hgt); mapUrl = cv.toDataURL('image/jpeg', 0.9); return mapUrl;
}
