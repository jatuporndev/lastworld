// Advanced-class cards: a staging of their own for every card of the twelve jobs (the last card and the one each
// class is known for live in vfx.js with the base classes' signatures). Built from the same pieces vfx.js uses,
// handed in by makeJobSigns(), so nothing here is drawn at run time that vfx.js would not draw.
//
// How big each one is goes by rarity, so a turn never waits on a small card:
//   common  a beat of its own, done in about 0.3-0.45 s, no shake or a tiny one;
//   rare    one more beat: a flash on the struck hexes and a light shake;
//   epic    a full staging in 0.7-0.9 s that leaves something behind. Never a darkened board: that is the last card's.
// A helpful card still plays its own sign (P.main) over whoever gets it, and adds a beat round it.

export function makeJobSigns(h) {
  const { spr, decal, bit, shot, fly, stroke, spike, scar, beat, after, V, R, sideways, screenDir, screenAngle, play, audio, Ease, CHEST } = h;
  const at = (x) => x.aim || x.chest(x.target);
  const left = (w, x) => (x.aim ? w.project(x.aim).x < w.project(x.from).x : false);
  const units = (w, x) => (x.targets.length ? x.targets : [x.u]).filter((t) => w.units.has(t.uid));
  // whoever a helpful card lands on: [chest, feet, size]
  const spots = (w, x) => units(w, x).map((t) => [w.unitPos(t.uid, 0.9), w.unitPos(t.uid, 0.04), Math.max(1, Math.min(1.8, (t.scale || 1) * 0.8))]);
  const sign = (w, x, o = {}) => { if (x.P?.main) for (const [p, g, s] of spots(w, x)) play(w, x.P.main, CHEST.has(x.P.main) ? p : g,{ s, fadeIn: 0.15, order: 34, ...o }); };
  const rise = (w, g, color, n = 8, spread = 0.8, ms = 60) => { for (let i = 0; i < n; i++) after(i * ms, () => bit(w, 'spark', g.clone().add(V(R(spread), 0.2 + Math.random() * 0.4, R(spread * 0.6))), { color: i % 3 ? color : 0xffffff, size: 0.06 + Math.random() * 0.06, life: 700, vel: V(R(0.3), 1 + Math.random() * 0.9, R(0.3)), gravity: -0.3, spin: R(3) })); };
  const burstBits = (w, p, color, n = 8, name = 'spark', sp = 2.4) => { for (let i = 0; i < n; i++) bit(w, name, p.clone(), { color: i % 2 ? color : 0xffffff, size: 0.07 + Math.random() * 0.07, life: 480, vel: V(R(sp), 0.6 + Math.random() * 1.6, R(sp)), gravity: 4, spin: R(8), add: name === 'spark' }); };
  const rocks = (w, g, color, n = 6) => { for (let k = 0; k < n; k++) bit(w, 'rock', g.clone().add(V(R(0.5), 0.2, R(0.4))), { color: k % 2 ? color : 0x6a5238, size: 0.1 + Math.random() * 0.1, life: 600, vel: V(R(3.2), 2.6 + Math.random() * 2.4, R(3.2)), gravity: 11, spin: R(9), add: false }); };
  const smoke = (w, g, color, n = 8, ms = 70, op = 0.5) => { for (let i = 0; i < n; i++) after(i * ms, () => bit(w, 'smoke', g.clone().add(V(R(1), 0.2 + Math.random() * 0.4, R(0.6))), { color, size: 0.5, life: 900, vel: V(R(0.4), 0.5, R(0.4)), add: false, opacity: op, grow: 1 })); };
  const souls = (w, x, color, each = 2) => units(w, x).filter((t) => t.uid !== x.u.uid).forEach((t, i) => { const p = w.unitPos(t.uid, 0.6); for (let k = 0; k < each; k++) after(i * 50 + k * 80, () => shot(w, p, x.from, color, { name: 'spark', size: 0.24, arc: 0.7, ms: 380 })); });
  const near = (x, o) => (a, b) => x.floor(a).distanceToSquared(o) - x.floor(b).distanceToSquared(o);
  const struckSet = (x) => new Set(x.targets.map((t) => t.q + ',' + t.r));
  // a volley: one arrow per hex comes down out of the sky, one after another
  const volley = (w, x, cells, gap = 40, impact = 'hit_spark') => cells.forEach((c, i) => after(i * gap, () => { const p = x.chest(c); fly(w, 'arrow', p.clone().add(V(-1.4 + R(0.6), 6.5, -0.5)), p, { ms: 210 }).then(() => { x.land(impact, c, { s: 0.75 }); w.particle(x.floor(c).add(V(0, 0.15, 0)), { color: 0xd8c8a8, size: 0.4, life: 300 }); }); }));
  const melee = async (w, x, heavy = false) => { await w.strike(x.u.uid, at(x), { heavy }); return left(w, x); };

  const JOB = {
    // ───────── LORD KNIGHT: the lance and the charge; red and steel ─────────
    // Lance Thrust: the lance goes out its whole length in one white line and bites at the end.
    async lk_thrust(w, x) {
      const a = at(x); await melee(w, x); audio.sfx('slash');
      stroke(w, x.from, a, { color: 0xffffff, wd: 0.22, ms: 180, name: 'pillar' });
      x.land('thrust', x.target, { s: 1, flipX: left(w, x) }); x.land('x_ring_steel', x.target, { s: 0.8 });
      burstBits(w, a, 0xdcdad8, 6); await beat(160);
    },
    // Spur Charge: the knight arrives at full gallop; the blow carries the run's speed through the foe.
    async lk_spur(w, x) {
      const a = at(x); const ang = screenAngle(w, x.from, a); audio.sfx('slash');
      for (let i = 0; i < 4; i++) bit(w, 'shard', a.clone().add(screenDir(w, ang, -0.6 + i * 0.3)), { color: 0xffffff, size: 0.8, life: 200, rot: ang, opacity: 0.8, vel: screenDir(w, ang, 3) });
      x.land('thrust', x.target, { s: 1, flipX: left(w, x) }); x.land('b_streaks_fire', x.u, { s: 0.8 }); w.shake(0.16, 140);
      await beat(200);
    },
    // Impale: the lance goes through and is driven down into the ground, pinning the foe where it stands.
    async lk_impale(w, x) {
      const a = at(x), g = x.floor(x.target); await melee(w, x); audio.sfx('slash');
      x.land('thrust', x.target, { s: 1.05, flipX: left(w, x) });
      spike(w, g.clone().add(V(0.15, 0, 0.1)), { color: 0xdcdad8, h: 1.25, wd: 0.22, tilt: -0.35, up: 90, hold: 380 });
      decal(w, 'crack', g, { color: 0x2a1410, size: 0.6, to: 1, ms: 1200, hold: 0.7, opacity: 0.8 });
      const d = a.clone().sub(x.from).setY(0); if (d.lengthSq() > 1e-4) w.spray(a, d.normalize(), { color: 0xc0392b, count: 9, speed: 4, fan: 0.6 });
      x.land('x_claw_blood', x.target, { s: 0.8 }); w.shake(0.14, 120); await beat(200);
    },
    // War Banner: the banner is planted; its colour runs out over the ground to every ally in reach.
    async lk_banner(w, x) {
      audio.sfx('buff'); spr(w, 'pillar', x.feet.clone().add(V(0, 1.6, 0)), { color: 0xb8343c, size: 0.25, to: 0.32, sy: 7, ms: 700, add: true, hold: 0.6 });
      decal(w, 'shock', x.feet, { color: 0xe86a5a, size: 0.6, to: 4, ms: 520, opacity: 0.75, add: true });
      sign(w, x); spots(w, x).forEach(([p], i) => after(80 + i * 60, () => spr(w, 'chevron', p.clone().add(V(0, 0.4, 0)), { color: 0xffd0c8, size: 0.25, to: 0.4, ms: 520, rise: 0.6, add: true, hold: 0.4 })));
      await beat(300);
    },
    // Halberd Sweep: one wide arc of the halberd across the cone; whoever it meets is thrown back on the dust.
    async lk_sweep(w, x) {
      const a = at(x); await melee(w, x); audio.sfx('slash');
      const ang = screenAngle(w, x.from, a);
      spr(w, 'slash', x.from.clone().add(screenDir(w, ang, 0.9)), { color: 0xffffff, size: 1.6, to: 2.5, ms: 300, rot: ang - Math.PI / 2, spin: -1.4, add: true, hold: 0.3 });
      const order = x.cells.slice(0, 8).sort(near(x, x.feet));
      order.forEach((c, i) => after(30 + i * 30, () => { x.land('slash', c, { s: 0.85, flipX: i % 2 === 1 }); w.particle(x.floor(c).add(V(0, 0.2, 0)), { color: 0xd8c8a8, size: 0.6, life: 360 }); }));
      w.shake(0.2, 160); await beat(260);
    },
    // Trample: the charge has run the line; hoofprints crack behind it and everyone it went through is thrown down.
    async lk_trample(w, x) {
      const struck = struckSet(x); const order = x.cells.slice(0, 8).sort(near(x, x.feet)).reverse(); audio.sfx('earth');
      order.forEach((c, i) => after(i * 45, () => { const g = x.floor(c);
        decal(w, 'crack', g, { color: 0x3a2a1a, size: 0.5, to: 0.8, ms: 1400, hold: 0.7, opacity: 0.8 });
        bit(w, 'smoke', g.clone().add(V(0, 0.2, 0)), { color: 0xc8b490, size: 0.6, life: 600, vel: V(R(0.6), 0.6, R(0.6)), add: false, opacity: 0.55, grow: 1 });
        if (struck.has(c.q + ',' + c.r)) { x.land('hit_blunt', c, { s: 1 }); rocks(w, g, 0xa88458, 4); w.shake(0.18, 120); audio.sfx('hit'); } }));
      await beat(order.length * 45 + 140); w.flashCells(x.cells, 0xb8343c, 360);
    },
    // Brace the Spear: the spears are set in a ring, points out.
    async lk_brace(w, x) {
      audio.sfx('block'); sign(w, x);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; after(i * 30, () => spike(w, x.feet.clone().add(V(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.38)), { color: 0xdcdad8, h: 0.75, wd: 0.16, tilt: Math.cos(a) * 1.1, up: 90, hold: 420 })); }
      await beat(300);
    },
    // Skewer: the lance runs both foes on the line through, the near one and then the far one.
    async lk_skewer(w, x) {
      const order = x.cells.slice(0, 4).sort(near(x, x.feet)); if (!order.length) return; const far = x.chest(order[order.length - 1]);
      await melee(w, x); audio.sfx('slash');
      stroke(w, x.from, far, { color: 0xffffff, wd: 0.28, ms: 240, name: 'pillar' }); stroke(w, x.from, far, { color: 0xb8343c, wd: 0.5, ms: 200, name: 'pillar' });
      order.forEach((c, i) => after(i * 70, () => { x.land('thrust', c, { s: 0.95, flipX: left(w, x) }); x.land('x_bloom_steel', c, { s: 0.7 }); }));
      w.flashCells(x.cells, 0xb8343c, 320); w.shake(0.22, 180); await beat(order.length * 70 + 120);
    },
    // Momentum: the knight leans into the run; streaks of speed and a red glint on the lance.
    async lk_momentum(w, x) {
      audio.sfx('wind'); sign(w, x);
      for (let i = 0; i < 6; i++) after(i * 35, () => bit(w, 'shard', x.feet.clone().add(V(R(1), 0.3 + Math.random() * 1.2, R(0.4))), { color: i % 2 ? 0xffffff : 0xe86a5a, size: 0.7, life: 260, rot: 0, opacity: 0.85, vel: screenDir(w, Math.PI, 3) }));
      spr(w, 'spark', x.from.clone().add(V(0, 0.4, 0)), { color: 0xffffff, size: 0.3, to: 0.9, ms: 260, add: true }); await beat(220);
    },
    // Unbroken Line: towers of steel rise round the knight, a red ring runs out and every ally in it raises a shield.
    async lk_line(w, x) {
      audio.sfx('block'); x.land('w_tower_steel', x.u, { s: x.sc });
      decal(w, 'circle', x.feet, { color: 0xe86a5a, size: 1, to: 4.4, ms: 900, opacity: 0.8, add: true, spin: 1.2, hold: 0.6 });
      await beat(220); audio.sfx('buff'); w.shake(0.25, 200);
      decal(w, 'shock', x.feet, { color: 0xffd0c8, size: 0.6, to: 5, ms: 460, opacity: 0.8, add: true });
      spots(w, x).forEach(([p, g, s], i) => after(i * 70, () => { spr(w, 'shield', p, { color: 0xffe0d8, size: 0.4, to: 0.75, ms: 620, add: true, hold: 0.55 }); spr(w, 'chevron', p.clone().add(V(0, 0.6, 0)), { color: 0xb8343c, size: 0.3, to: 0.45, ms: 560, rise: 0.6, hold: 0.4 }); if (g.distanceToSquared(x.feet) > 0.05) play(w, 'st_fortify', g, { s, order: 34 }); }));
      w.flashCells(x.cells, 0xb8343c, 420); await beat(360);
    },

    // ───────── PALADIN: sunlight and the shield; gold ─────────
    // Sacred Blade: a cut that leaves a small burning cross, and the paladin's own guard glints.
    async pa_blade(w, x) {
      const a = at(x); const l = await melee(w, x); audio.sfx('slash');
      x.land('slash', x.target, { s: 1.05, flipX: l }); spr(w, 'cross', a, { color: 0xffe9a0, size: 0.25, to: 0.7, ms: 360, add: true, hold: 0.3 });
      x.land('x_shards_fire', x.target, { s: 0.7 }); spr(w, 'shield', x.from, { color: 0xfff0c0, size: 0.35, to: 0.55, ms: 380, add: true, hold: 0.4, opacity: 0.8 });
      await beat(180);
    },
    // Shield of Faith: a thin ray falls from above onto the friend and opens into wings of light round them.
    async pa_faith(w, x) {
      audio.sfx('holy'); spots(w, x).forEach(([p, g]) => { stroke(w, g.clone().add(V(-0.3, 5, 0)), g.clone().add(V(0, 0.2, 0)), { color: 0xffe9a0, wd: 0.35, ms: 220, name: 'pillar' }); decal(w, 'shock', g, { color: 0xfff0c0, size: 0.4, to: 1.8, ms: 320, opacity: 0.8, add: true }); });
      await beat(90); sign(w, x); spots(w, x).forEach(([p]) => spr(w, 'shield', p, { color: 0xffe9a0, size: 0.4, to: 0.7, ms: 520, add: true, hold: 0.5 }));
      await beat(220);
    },
    // Consecrate: a circle burns itself into the ground round the paladin and gold flame stands up out of every hex.
    async pa_consecrate(w, x) {
      audio.sfx('holy'); decal(w, 'circle', x.feet, { color: 0xffe9a0, size: 0.8, to: 2.8, ms: 760, spin: 2.4, hold: 0.6, opacity: 0.9, add: true });
      x.cells.slice(0, 7).forEach((c, i) => after(60 + i * 30, () => spr(w, 'flame', x.floor(c).add(V(0, 0.5, 0)), { color: 0xffd060, size: 0.4, to: 0.8, sy: 1.6, ms: 440, add: true, rise: 0.4, hold: 0.3 })));
      await beat(200); x.targets.forEach((t) => x.land('hit_holy', t, { s: 0.8 })); x.targets.forEach((t) => x.land('x_crescent_holy', t, { s: 0.7 }));
      w.flashCells(x.cells, 0xe8c25a, 360); w.shake(0.14, 140); await beat(160);
    },
    // Lay on Hands: light gathers in the paladin's hands and flows to the friend; it settles on them as warm motes.
    async pa_hands(w, x) {
      audio.sfx('heal'); spr(w, 'spark', x.from, { color: 0xffe9a0, size: 0.3, to: 0.8, ms: 300, add: true, hold: 0.5 });
      spots(w, x).forEach(([p]) => { if (p.distanceToSquared(x.from) > 0.2) for (let k = 0; k < 4; k++) after(k * 50, () => shot(w, x.from, p, 0xffe9a0, { name: 'spark', size: 0.2, arc: 0.6, ms: 300 })); });
      await beat(260); sign(w, x); spots(w, x).forEach(([p, g, s]) => { play(w, 'heal', g, { s, order: 34 }); spr(w, 'cross', p.clone().add(V(0, 0.5, 0)), { color: 0xffffff, size: 0.2, to: 0.45, ms: 520, rise: 0.6, add: true, hold: 0.4 }); });
      await beat(200);
    },
    // Oath of Light: the paladin raises the blade; a column of sunlight falls on them and burns every taint off.
    async pa_oath(w, x) {
      audio.sfx('holy'); spr(w, 'pillar', x.feet.clone().add(V(0, 2.4, 0)), { color: 0xffe9a0, size: 0.5, to: 0.8, sy: 6, ms: 700, add: true, hold: 0.5, opacity: 0.85 });
      sign(w, x); for (let k = 0; k < 6; k++) bit(w, 'smoke', x.from.clone().add(V(R(0.6), R(0.6), R(0.3))), { color: 0x3a2a40, size: 0.25, life: 520, vel: V(R(2), 1.5, R(1)), add: false, opacity: 0.5 });
      rise(w, x.feet, 0xffe9a0, 8, 0.6, 40); await beat(320);
    },
    // Aegis Bond: a thread of light ties the paladin to the friend; plates close round both.
    async pa_bond(w, x) {
      audio.sfx('block'); spots(w, x).forEach(([p]) => { if (p.distanceToSquared(x.from) > 0.2) stroke(w, x.from, p, { color: 0xffe9a0, wd: 0.25, ms: 520, name: 'pillar' }); });
      sign(w, x); x.land('w_plates_holy', x.u, { s: x.sc * 0.8 });
      spots(w, x).forEach(([p]) => spr(w, 'shield', p, { color: 0xfff0c0, size: 0.35, to: 0.6, ms: 500, add: true, hold: 0.5 }));
      await beat(320);
    },
    // Hammer of Dawn: a small sun rises behind the hammer; it comes down with the sun's weight and the foe is left seeing stars.
    async pa_dawn(w, x) {
      const a = at(x), g = x.floor(x.target); audio.sfx('holy');
      spr(w, 'smoke', x.from.clone().add(V(0, 1.3, 0)), { color: 0xffd060, size: 0.4, to: 1.1, ms: 380, add: true, hold: 0.6 });
      const l = await melee(w, x, true); audio.sfx('smash');
      x.land('smash', x.target, { s: 1.1, flipX: l }); x.land('x_nova_holy', x.target, { s: 0.8 });
      decal(w, 'shock', g, { color: 0xfff0c0, size: 0.6, to: 3, ms: 380, opacity: 0.85, add: true }); w.shake(0.3, 220); w.flashCells(x.cells, 0xe8c25a, 320);
      for (let k = 0; k < 5; k++) after(80 + k * 30, () => bit(w, 'spark', a.clone().add(V(Math.cos(k * 1.26) * 0.4, 0.55, Math.sin(k * 1.26) * 0.3)), { color: 0xffe9a0, size: 0.09, life: 520, spin: 4 }));
      await beat(260);
    },
    // Holy Ground: runes spread over the ground round the paladin and every ally on them breathes in the light.
    async pa_ground(w, x) {
      audio.sfx('heal'); decal(w, 'circle', x.feet, { color: 0xffe9a0, size: 1, to: 4.2, ms: 1100, spin: 1, hold: 0.7, opacity: 0.85, add: true });
      x.land('w_runes_earth', x.u, { s: x.sc });
      x.cells.slice(0, 19).forEach((c, i) => after(i * 20, () => w.particle(x.floor(c).add(V(R(0.4), 0.3, R(0.3))), { color: 0xffe9a0, size: 0.3, life: 600, vel: V(0, 0.8, 0) })));
      await beat(260); spots(w, x).forEach(([p, g, s]) => { play(w, 'regen', g, { s, order: 34 }); spr(w, 'cross', p.clone().add(V(0, 0.5, 0)), { color: 0xffffff, size: 0.18, to: 0.4, ms: 520, rise: 0.6, add: true, hold: 0.4 }); });
      w.flashCells(x.cells, 0xe8c25a, 420); await beat(220);
    },
    // Retribution Aura: rings of light pulse out from the paladin, and points of light stand out of them like thorns.
    async pa_aura(w, x) {
      audio.sfx('buff'); sign(w, x);
      for (let k = 0; k < 2; k++) after(k * 180, () => decal(w, 'shock', x.feet, { color: 0xffd060, size: 0.5, to: 2.8, ms: 440, opacity: 0.85, add: true }));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; after(120 + i * 20, () => spike(w, x.feet.clone().add(V(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.35)), { color: 0xffe9a0, h: 0.45, wd: 0.12, tilt: Math.cos(a) * 1.2, up: 70, hold: 300, add: true })); }
      await beat(380);
    },
    // Divine Shield: a column of light falls on the paladin and spreads as a dome of gold over every ally in reach.
    async pa_divine(w, x) {
      audio.sfx('holy'); spr(w, 'pillar', x.feet.clone().add(V(0, 2.6, 0)), { color: 0xffffff, size: 0.3, to: 0.6, sy: 9, ms: 520, add: true, hold: 0.4 });
      spr(w, 'pillar', x.feet.clone().add(V(0, 2.4, 0)), { color: 0xffe9a0, size: 0.6, to: 1.1, sy: 5, ms: 700, add: true, hold: 0.5, opacity: 0.85 });
      await beat(200); w.shake(0.25, 200); decal(w, 'shock', x.feet, { color: 0xfff0c0, size: 0.6, to: 5, ms: 460, opacity: 0.85, add: true });
      sign(w, x); spots(w, x).forEach(([p], i) => after(i * 60, () => { spr(w, 'bubble', p, { color: 0xffe9a0, size: 0.5, to: 0.9, ms: 700, add: true, hold: 0.6 }); spr(w, 'spark', p, { color: 0xffffff, size: 0.4, to: 1.2, ms: 220, add: true }); }));
      w.flashCells(x.cells, 0xe8c25a, 460); rise(w, x.feet, 0xffe9a0, 12, 1.6, 50); await beat(360);
    },

    // ───────── SORCERER: fire and ice; the element's own colour ─────────
    // Flame Lash: a whip of fire cracks out of the hand in three quick lengths and wraps the foe.
    async so_lash(w, x) {
      const a = at(x); audio.sfx('fire'); const side = sideways(x.from, a);
      for (let i = 1; i <= 5; i++) { const t = i / 6; const p = x.from.clone().lerp(a, t).add(side.clone().multiplyScalar(Math.sin(t * Math.PI) * 0.6)); p.y += Math.sin(t * Math.PI) * 0.4;
        after(i * 26, () => spr(w, 'flame', p, { color: i % 2 ? 0xff7a2a : 0xffc050, size: 0.45, to: 0.7, ms: 240, add: true, rot: screenAngle(w, x.from, a) - Math.PI / 2, hold: 0.2 })); }
      await beat(170); x.land('hit_fire', x.target, { s: 0.9 }); x.land('x_spiral_blood', x.target, { s: 0.7 }); audio.sfx('burn');
      burstBits(w, a, 0xff9a3a, 6, 'flame', 1.8); await beat(160);
    },
    // Rime Spear: a spear of ice; where it strikes the frost creeps out over the ground.
    async so_rime(w, x) {
      const a = at(x), g = x.floor(x.target); audio.sfx('ice'); await fly(w, 'icelance', x.from, a, { arc: 0.3, trail: 0x8fe0ff });
      x.land('hit_ice', x.target, { s: 0.9 }); decal(w, 'crack', g, { color: 0xbfeaff, size: 0.6, to: 1.6, ms: 1100, hold: 0.7, opacity: 0.85 });
      for (let k = 0; k < 6; k++) bit(w, 'shard', a.clone(), { color: 0xdff4ff, size: 0.1, life: 500, vel: V(R(3), 1 + Math.random() * 2, R(2)), gravity: 9, spin: R(10), add: false });
      await beat(160);
    },
    // Steam Burst: the cold on the foe flashes to steam in a white blast.
    async so_steam(w, x) {
      const a = at(x); audio.sfx('fire'); spr(w, 'spark', a, { color: 0xffffff, size: 0.3, to: 1.2, ms: 200, add: true });
      x.land('hit_fire', x.target, { s: 0.7 }); x.land('x_eye_fire', x.target, { s: 0.7 });
      for (let i = 0; i < 12; i++) bit(w, 'smoke', a.clone().add(V(R(0.3), R(0.3), R(0.2))), { color: 0xf4f0ff, size: 0.45, life: 800, vel: V(R(2.4), 0.8 + Math.random() * 1.4, R(1.6)), add: false, opacity: 0.7, grow: 1.2 });
      w.shake(0.14, 120); await beat(220);
    },
    // Mana Ward: runes of frost close round the sorcerer and the mana runs back into the hands.
    async so_ward(w, x) {
      audio.sfx('magic'); sign(w, x); decal(w, 'circle', x.feet, { color: 0x8fe0ff, size: 0.6, to: 1.8, ms: 700, spin: -2, hold: 0.6, opacity: 0.85, add: true });
      for (let k = 0; k < 10; k++) after(k * 22, () => { const a = Math.random() * 6.28, st = x.from.clone().add(V(Math.cos(a) * 1.2, R(0.8), Math.sin(a) * 0.8)); bit(w, 'spark', st, { color: 0x9ab8ff, size: 0.08, life: 280, vel: x.from.clone().sub(st).multiplyScalar(3), drag: 1 }); });
      await beat(300);
    },
    // Ember Field: embers drift down on the area and every hex they touch starts to smoulder.
    async so_embers(w, x) {
      audio.sfx('fire'); const cells = x.cells.slice(0, 7);
      for (let i = 0; i < 18; i++) after(i * 22, () => { const c = cells[i % cells.length], g = x.floor(c); bit(w, 'flame', g.clone().add(V(R(0.6), 2.4 + Math.random(), R(0.4))), { color: i % 2 ? 0xff7a2a : 0xffc050, size: 0.09, life: 520, vel: V(R(0.4), -4, R(0.3)) }); });
      await beat(320); cells.forEach((c, i) => after(i * 25, () => decal(w, 'crack', x.floor(c), { color: 0xff8a2a, size: 0.5, to: 0.9, ms: 1200, hold: 0.7, opacity: 0.85, add: true })));
      w.flashCells(x.cells, 0xff7a2a, 360); await beat(200);
    },
    // Firestorm: a ring of fire turns over the place, faster and faster, and caves in on the middle.
    async so_firestorm(w, x) {
      const g = x.floor(x.target); audio.sfx('fire');
      decal(w, 'swirl', g, { color: 0xff7a2a, size: 1, to: 2.6, ms: 620, spin: 7, opacity: 0.9, add: true, hold: 0.6 });
      for (let i = 0; i < 10; i++) { const a0 = (i / 10) * Math.PI * 2; after(i * 30, () => { const p = g.clone().add(V(Math.cos(a0) * 1.1, 0.6, Math.sin(a0) * 0.75)); spr(w, 'flame', p, { color: i % 2 ? 0xff5a1a : 0xffc050, size: 0.5, to: 0.9, sy: 1.8, ms: 420, add: true, rise: 0.5, hold: 0.3 }); }); }
      await beat(360); x.land('blast', x.target, { s: 0.8 }); audio.sfx('explosion'); w.shake(0.3, 240); w.flashCells(x.cells, 0xff7a2a, 420);
      x.targets.forEach((t) => x.land('hit_fire', t, { s: 0.85 })); x.cells.slice(0, 6).forEach((c, i) => after(i * 40, () => x.land('x_ring_fire', c, { s: 0.7 })));
      await beat(200);
    },
    // Glacier: a wall of ice spikes runs down the line, bigger the further it goes, and holds the foes in it.
    async so_glacier(w, x) {
      const order = x.cells.slice(0, 8).sort(near(x, x.feet)); const struck = struckSet(x); audio.sfx('ice');
      order.forEach((c, i) => after(i * 55, () => { const g = x.floor(c), t = (i + 1) / order.length;
        spike(w, g, { color: i % 2 ? 0x8fe0ff : 0xdff4ff, h: 0.7 + t * 0.8, wd: 0.45, tilt: R(0.3), up: 100, hold: 420 + (order.length - i) * 40, bits: 0x8fe0ff });
        decal(w, 'crack', g, { color: 0xbfeaff, size: 0.6, to: 1.1, ms: 1300, hold: 0.7, opacity: 0.8 });
        if (struck.has(c.q + ',' + c.r)) { x.land('hit_ice', c, { s: 0.9 }); x.land('x_cross_ice', c, { s: 0.7 }); w.shake(0.14, 100); } }));
      await beat(order.length * 55 + 140); w.flashCells(x.cells, 0x8fe0ff, 360);
    },
    // Attunement: a mote of fire and a mote of ice circle the sorcerer and sink into the hands.
    async so_attune(w, x) {
      audio.sfx('magic'); sign(w, x);
      for (let i = 0; i < 12; i++) after(i * 30, () => { const a = (i / 12) * Math.PI * 3; for (const [d, c] of [[0, 0xff7a2a], [Math.PI, 0x8fe0ff]]) bit(w, 'spark', x.from.clone().add(V(Math.cos(a + d) * 0.7 * (1 - i / 14), 0.2 + i * 0.03, Math.sin(a + d) * 0.45 * (1 - i / 14))), { color: c, size: 0.12, life: 160, add: true }); });
      await beat(360); spr(w, 'spark', x.from, { color: 0xffffff, size: 0.3, to: 1, ms: 220, add: true });
    },
    // Inferno: fire rolls out from the sorcerer ring by ring; the ground behind it is left burning.
    async so_inferno(w, x) {
      audio.sfx('fire'); x.land('blast', x.u, { s: 0.7 });
      const order = x.cells.slice(0, 19).map((c) => ({ c, g: x.floor(c) })).filter((o) => o.g.distanceToSquared(x.feet) > 0.05).sort((a, b) => a.g.distanceToSquared(x.feet) - b.g.distanceToSquared(x.feet));
      const struck = struckSet(x);
      order.forEach(({ c, g }) => after(Math.min(520, g.distanceTo(x.feet) * 130), () => { spr(w, 'flame', g.clone().add(V(0, 0.6, 0)), { color: 0xff6a1a, size: 0.55, to: 1, sy: 2, ms: 520, add: true, rise: 0.6, hold: 0.35 }); spr(w, 'flame', g.clone().add(V(0, 0.5, 0)), { color: 0xfff0b0, size: 0.25, to: 0.5, sy: 1.6, ms: 380, add: true, rise: 0.4, hold: 0.2 });
        decal(w, 'crack', g, { color: 0x1a0c06, size: 0.8, to: 1.2, ms: 1800, hold: 0.75, opacity: 0.8 }); if (struck.has(c.q + ',' + c.r)) { x.land('hit_fire', c, { s: 0.9 }); x.land('x_bloom_fire', c, { s: 0.7 }); } }));
      w.shake(0.35, 300); await beat(560); audio.sfx('explosion'); w.flashCells(x.cells, 0xff7a2a, 480); scar(w, 'af_fire', x.feet, 1);
      smoke(w, x.feet, 0x3a2a26, 8, 70);
    },
    // Absolute Zero: the air over the place goes white, the ground cracks with frost, and ice locks round every foe.
    async so_zero(w, x) {
      const g = x.floor(x.target); audio.sfx('ice');
      decal(w, 'circle', g, { color: 0xdff4ff, size: 2.8, to: 1.2, ms: 520, spin: -2, opacity: 0.85, add: true, ease: Ease.inQuad });
      for (let i = 0; i < 16; i++) after(i * 20, () => bit(w, 'spark', g.clone().add(V(R(3), 1.5 + Math.random(), R(2))), { color: 0xffffff, size: 0.08, life: 500, vel: V(0, -1.6, 0), spin: R(4) }));
      await beat(420); x.land('frostnova', x.target, { s: 0.85 }); audio.sfx('ice'); w.shake(0.42, 320);
      x.cells.slice(0, 19).forEach((c, i) => after(i * 15, () => { const q = x.floor(c); decal(w, 'crack', q, { color: 0xbfeaff, size: 0.8, to: 1.2, ms: 1600, hold: 0.7, opacity: 0.85 }); spike(w, q.clone().add(V(R(0.3), 0, R(0.2))), { color: i % 2 ? 0x8fe0ff : 0xdff4ff, h: 0.5 + Math.random() * 0.4, wd: 0.3, tilt: R(0.8), up: 80, hold: 460, bits: 0x8fe0ff }); }));
      x.targets.forEach((t) => { x.land('freeze', t, { s: 0.6 }); x.land('x_ring_ice', t, { s: 0.7 }); }); w.flashCells(x.cells, 0xffffff, 460);
      scar(w, 'af_ice', g, 1); await beat(300);
    },

    // ───────── WARLOCK: curses and stolen life; violet and blood ─────────
    // Hex Bolt: a bolt of shadow, and a small rune of the curse stays turning on the foe.
    async wl_hex(w, x) {
      const a = at(x); audio.sfx('shadow'); await fly(w, 'orb_shadow', x.from, a, { arc: 0.4, trail: 0x8a4ad0 });
      x.land('hit_shadow', x.target, { s: 0.85 }); decal(w, 'circle', x.floor(x.target), { color: 0xb07aff, size: 0.6, to: 1.2, ms: 900, spin: 3, hold: 0.7, opacity: 0.85, add: true });
      x.land('curse', x.target, { s: 0.8 }); await beat(180);
    },
    // Siphon: a dark thread from the foe to the warlock; red motes run back along it.
    async wl_siphon(w, x) {
      const a = at(x); audio.sfx('shadow'); stroke(w, a, x.from, { color: 0x8a4ad0, wd: 0.4, ms: 520, name: 'pillar' });
      x.land('hit_shadow', x.target, { s: 0.85 });
      for (let k = 0; k < 6; k++) after(60 + k * 45, () => shot(w, a.clone().add(V(R(0.3), R(0.3), 0)), x.from, 0xd02a3a, { name: 'spark', size: 0.2, arc: 0.3, ms: 300 }));
      await beat(360); spr(w, 'spark', x.from, { color: 0xff6070, size: 0.3, to: 0.9, ms: 240, add: true });
    },
    // Dark Pact: a circle of blood opens under the warlock; it takes its price, and the power climbs up into them.
    async wl_pact(w, x) {
      audio.sfx('shadow'); decal(w, 'circle', x.feet, { color: 0xc02a3a, size: 0.5, to: 1.9, ms: 800, spin: -3, hold: 0.6, opacity: 0.9, add: true }); sign(w, x);
      for (let k = 0; k < 12; k++) after(k * 25, () => bit(w, 'spark', x.feet.clone().add(V(R(1.2), 0.1, R(0.8))), { color: k % 2 ? 0xc02a3a : 0x8a4ad0, size: 0.08, life: 520, vel: V(0, 2.2, 0), add: true }));
      await beat(340);
    },
    // Wither: the life goes out of the foe; dark smoke rises off it and the ground under it dies.
    async wl_wither(w, x) {
      const a = at(x), g = x.floor(x.target); audio.sfx('shadow'); x.land('curse', x.target, { s: 0.9 }); x.land('x_claw_shadow', x.target, { s: 0.7 });
      decal(w, 'crack', g, { color: 0x1a0a20, size: 0.7, to: 1.4, ms: 1500, hold: 0.7, opacity: 0.85 });
      for (let k = 0; k < 8; k++) after(k * 40, () => bit(w, 'smoke', a.clone().add(V(R(0.5), R(0.4), R(0.3))), { color: k % 2 ? 0x2a1640 : 0x5a3a70, size: 0.35, life: 800, vel: V(R(0.3), 0.9, R(0.3)), add: false, opacity: 0.6 }));
      await beat(320);
    },
    // Shadow Grasp: hands of shadow come up round the foe and drag it in toward the warlock.
    async wl_grasp(w, x) {
      const a = at(x), g = x.floor(x.target); audio.sfx('shadow');
      for (let i = 0; i < 4; i++) { const k = (i / 4) * Math.PI * 2; spike(w, g.clone().add(V(Math.cos(k) * 0.45, 0, Math.sin(k) * 0.3)), { color: 0x2a1640, h: 0.85, wd: 0.22, tilt: -Math.cos(k) * 0.8, up: 140, hold: 360 }); }
      stroke(w, a, x.from, { color: 0x8a4ad0, wd: 0.3, ms: 420, name: 'pillar' }); x.land('x_bloom_arcane', x.target, { s: 0.7 });
      await beat(280);
    },
    // Agony: every curse on the foe flares at once; violet spikes close on it and it buckles.
    async wl_agony(w, x) {
      const a = at(x); audio.sfx('shadow');
      for (let k = 0; k < 6; k++) { const ang = (k / 6) * 6.28; const st = a.clone().add(V(Math.cos(ang) * 1.3, Math.sin(ang) * 0.9, 0)); after(k * 25, () => shot(w, st, a, 0xb07aff, { name: 'shard', size: 0.4, arc: 0, ms: 160, orient: true, trail: null })); }
      await beat(200); x.land('hit_shadow', x.target, { s: 1 }); x.land('x_rune_shadow', x.target, { s: 0.8 });
      for (let k = 0; k < 3; k++) after(k * 90, () => spr(w, 'shock', a, { color: 0xb07aff, size: 0.3, to: 1.4, ms: 260, add: true }));
      w.shake(0.2, 160); w.flashCells(x.cells, 0x8a4ad0, 320); await beat(240);
    },
    // Spreading Curse: the curse takes the foe, and dark ripples run out from it to find the next.
    async wl_spread(w, x) {
      const g = x.floor(x.target); audio.sfx('shadow'); x.land('curse', x.target, { s: 0.9 }); x.land('x_cross_arcane', x.target, { s: 0.7 });
      for (let k = 0; k < 3; k++) after(80 + k * 140, () => decal(w, 'shock', g, { color: 0x8a4ad0, size: 0.5, to: 3.6, ms: 520, opacity: 0.8, add: true }));
      await beat(420);
    },
    // Blood Ritual: the warlock cuts the price; blood rises in a column and the sign burns red.
    async wl_ritual(w, x) {
      audio.sfx('shadow'); sign(w, x); spr(w, 'pillar', x.feet.clone().add(V(0, 1.6, 0)), { color: 0xc02a3a, size: 0.35, to: 0.6, sy: 5, ms: 560, add: true, hold: 0.5 });
      w.spray(x.from, V(0, 1, 0), { color: 0xc0392b, count: 10, speed: 3, fan: 1.2 }); await beat(320);
    },
    // Soul Leech: the dark bursts round the warlock and each foe's life comes away in red motes.
    async wl_leech(w, x) {
      audio.sfx('shadow'); x.land('darkblast', x.u, { s: 0.6 }); decal(w, 'swirl', x.feet, { color: 0x8a4ad0, size: 2.4, to: 0.8, ms: 420, spin: -6, opacity: 0.85, add: true });
      x.targets.forEach((t) => { x.land('hit_shadow', t, { s: 0.85 }); x.land('x_bubbles_shadow', t, { s: 0.7 }); }); souls(w, x, 0xd02a3a, 3);
      w.shake(0.16, 140); await beat(380);
    },
    // Abyssal Chains: rings open in the ground, chains of shadow lash out of them onto every foe, and the middle caves in.
    async wl_chains(w, x) {
      const g = x.floor(x.target); audio.sfx('shadow');
      decal(w, 'circle', g, { color: 0x8a4ad0, size: 0.6, to: 2.6, ms: 900, spin: -2.5, hold: 0.65, opacity: 0.9, add: true });
      const anchors = [0, 1, 2, 3, 4].map((k) => g.clone().add(V(Math.cos(k * 1.256) * 1.6, 0.1, Math.sin(k * 1.256) * 1.1)));
      await beat(220);
      (x.targets.length ? x.targets : [x.target]).forEach((t, i) => after(i * 50, () => { const p = t.uid ? w.unitPos(t.uid, 0.5) : x.chest(t); anchors.slice(0, 3).forEach((s, k) => after(k * 40, () => stroke(w, anchors[(i + k * 2) % 5], p, { color: k ? 0x5a3a70 : 0xb07aff, wd: 0.22, ms: 520, name: 'pillar' }))); if (t.uid) { x.land('snare', t, { s: 0.65 }); x.land('hit_shadow', t, { s: 0.8 }); } }));
      await beat(260); x.land('darkblast', x.target, { s: 0.85 }); audio.sfx('explosion'); w.shake(0.38, 300); w.flashCells(x.cells, 0x8a4ad0, 460);
      scar(w, 'af_shadow', g, 0.9); await beat(200);
    },

    // ───────── MARKSMAN: one arrow, placed; brown and white ─────────
    // Spotter's Mark: a glint off the spyglass, and a red ring closes on the foe and holds it.
    async mk_spot(w, x) {
      const a = at(x); audio.sfx('dice'); spr(w, 'spark', x.from.clone().add(V(0.1, 0.35, 0)), { color: 0xffffff, size: 0.2, to: 0.7, ms: 260, add: true });
      stroke(w, x.from, a, { color: 0xff6070, wd: 0.06, ms: 300, name: 'pillar' });
      decal(w, 'circle', x.floor(x.target), { color: 0xff4030, size: 1.6, to: 0.7, ms: 420, spin: 3, opacity: 0.85, add: true, ease: Ease.inQuad });
      await beat(300); x.land('mark', x.target, { s: 0.9 }); x.land('x_crack_smoke', x.target, { s: 0.6 }); await beat(140);
    },
    // Steady Shot: the bow is held a breath longer; a thin white line, then the arrow along it.
    async mk_steady(w, x) {
      const a = at(x); stroke(w, x.from, a, { color: 0xffffff, wd: 0.08, ms: 200, name: 'pillar' }); audio.sfx('arrow');
      await fly(w, 'arrow', x.from, a, { arc: 0.2, ms: 160, trail: 0xdcdad8 }); x.land('hit_spark', x.target, { s: 0.9 }); x.land('x_cross_blood', x.target, { s: 0.6 }); await beat(140);
    },
    // Ricochet: the arrow strikes, glances off high, and comes back down on the same foe.
    async mk_ricochet(w, x) {
      const a = at(x); audio.sfx('arrow'); await fly(w, 'arrow', x.from, a, { arc: 0.3, ms: 200, trail: 0xdcdad8 });
      x.land('hit_spark', x.target, { s: 0.8 }); const top = a.clone().add(V(0.8, 1.6, 0.2));
      await fly(w, 'arrow', a, top, { ms: 160 }); audio.sfx('arrow'); await fly(w, 'arrow', top, a, { ms: 140 });
      x.land('hit_spark', x.target, { s: 0.9 }); x.land('x_ring_smoke', x.target, { s: 0.6 }); w.shake(0.1, 90); await beat(120);
    },
    // Reposition: a quick roll to the new spot; dust where they land, and a fresh arrow nocked.
    async mk_reposition(w, x) {
      audio.sfx('wind'); sign(w, x); bit(w, 'smoke', x.feet, { color: 0xd8c8a8, size: 0.7, life: 520, opacity: 0.55, grow: 1.4, vel: V(0, 0.4, 0), add: false });
      spr(w, 'arrow', x.from.clone().add(V(0, 0.4, 0)), { color: 0xffffff, size: 0.35, to: 0.45, ms: 360, hold: 0.6, rise: 0.2 }); await beat(220);
    },
    // Crippling Shot: aimed low; it takes the foe in the leg and pins its foot to the ground.
    async mk_cripple(w, x) {
      const g = x.floor(x.target).add(V(0, 0.25, 0)); audio.sfx('arrow'); await fly(w, 'arrow', x.from, g, { arc: 0.15, ms: 200, trail: 0xdcdad8 });
      x.land('x_claw_steel', x.target, { s: 0.7 }); x.land('snare', x.target, { s: 0.65 }); burstBits(w, g, 0xd8c8a8, 5); await beat(220);
    },
    // Piercing Bolt: a crack of wind, then the bolt goes the whole line through, everyone on it in turn.
    async mk_pierce(w, x) {
      const order = x.cells.slice(0, 8).sort(near(x, x.feet)); if (!order.length) return; const far = x.chest(order[order.length - 1]); const struck = struckSet(x);
      audio.sfx('wind'); stroke(w, x.from, far, { color: 0xbfe8d8, wd: 0.35, ms: 260, name: 'pillar' });
      audio.sfx('arrow'); fly(w, 'arrow', x.from, far, { ms: 220, s: 1.2, trail: 0xffffff });
      order.forEach((c, i) => after(i * 28, () => { w.particle(x.chest(c), { color: 0xffffff, size: 0.4, life: 200 }); if (struck.has(c.q + ',' + c.r)) { x.land('hit_wind', c, { s: 0.8 }); x.land('x_spiral_wind', c, { s: 0.7 }); } }));
      w.flashCells(x.cells, 0xffffff, 300); w.shake(0.2, 160); await beat(order.length * 28 + 160);
    },
    // Deadeye: the marksman's eye narrows; a glint, and the world slows for a heartbeat.
    async mk_deadeye(w, x) {
      audio.sfx('dice'); sign(w, x); spr(w, 'spark', x.from.clone().add(V(0.1, 0.35, 0)), { color: 0xff6070, size: 0.2, to: 0.9, ms: 420, add: true, spin: 3, hold: 0.4 });
      decal(w, 'circle', x.feet, { color: 0xc02a3a, size: 1.4, to: 0.8, ms: 500, spin: 2, opacity: 0.75, add: true, ease: Ease.inQuad }); await beat(320);
    },
    // Kill Shot: the sight snaps onto the weak point; the arrow is there before the eye can follow.
    async mk_kill(w, x) {
      const a = at(x); play(w, 'u_reticle', a, { s: 0.7, ms: 420, order: 35 }); audio.sfx('dice'); await beat(300);
      audio.sfx('arrow'); stroke(w, x.from, a, { color: 0xffffff, wd: 0.14, ms: 160, name: 'pillar' }); await fly(w, 'arrow', x.from, a, { ms: 100 });
      x.land('hit_crit', x.target, { s: 1 }); x.land('x_bloom_blood', x.target, { s: 0.7 }); w.shake(0.24, 180); await beat(160);
    },
    // Suppressing Fire: a quick rain of arrows on every hex, kicking up dust so nobody there can stand straight.
    async mk_suppress(w, x) {
      audio.sfx('arrow'); const order = x.cells.slice(0, 7).sort(() => Math.random() - 0.5); volley(w, x, order, 35);
      await beat(order.length * 35 + 240); smoke(w, x.floor(x.target), 0xc8b490, 6, 40); x.cells.slice(0, 4).forEach((c, i) => after(i * 30, () => x.land('x_shards_steel', c, { s: 0.6 }))); w.flashCells(x.cells, 0xdcdad8, 300);
    },
    // Barrage: two whole volleys, the second right on the first; the ground is stitched with arrows.
    async mk_barrage(w, x) {
      audio.sfx('arrow'); decal(w, 'circle', x.floor(x.target), { color: 0xdcdad8, size: 1.8, to: 1.2, ms: 600, opacity: 0.7, add: true, spin: 1 });
      const order = x.cells.slice(0, 7);
      for (let v = 0; v < 2; v++) { volley(w, x, [...order, ...order].sort(() => Math.random() - 0.5).slice(0, 10), 26); await beat(260); audio.sfx('arrow'); w.shake(0.18, 140); }
      await beat(160); x.targets.forEach((t) => x.land('x_fang_blood', t, { s: 0.75 })); smoke(w, x.floor(x.target), 0xc8b490, 8, 50); w.flashCells(x.cells, 0xffffff, 380);
    },

    // ───────── RANGER: the wild, the hawk and the trap; green ─────────
    // Call Hawk: a whistle; feathers whirl up where the hawk comes down out of the sky.
    async rg_hawk(w, x) {
      audio.sfx('wind'); const g = x.floor(x.target);
      fly(w, 'orb_wind', g.clone().add(V(-2.4, 5, 0.6)), g.clone().add(V(0, 0.8, 0)), { ms: 320, trail: 0x9be0b0 });
      await beat(300); play(w, x.P.main || 'portal', g, { s: 0.8, order: 34 });
      for (let i = 0; i < 10; i++) bit(w, 'shard', g.clone().add(V(0, 0.6, 0)), { color: i % 2 ? 0xf4ecd8 : 0x8a6a48, size: 0.14, life: 900, vel: V(R(2.4), 1 + Math.random() * 2, R(1.6)), gravity: 1.5, spin: R(8), add: false });
      decal(w, 'shock', g, { color: 0x9be0b0, size: 0.4, to: 2.2, ms: 360, opacity: 0.7, add: true }); await beat(240);
    },
    // Barbed Arrow: the barbs catch and tear on the way out.
    async rg_barbed(w, x) {
      const a = at(x); audio.sfx('arrow'); await fly(w, 'arrow', x.from, a, { arc: 0.4, ms: 220, trail: 0xdcdad8 });
      x.land('hit_spark', x.target, { s: 0.8 }); x.land('x_splat_blood', x.target, { s: 0.7 });
      const d = a.clone().sub(x.from).setY(0); if (d.lengthSq() > 1e-4) w.spray(a, d.normalize(), { color: 0xc0392b, count: 10, speed: 4.2, fan: 0.6 }); await beat(160);
    },
    // Bear Trap: iron jaws snap shut on the foe from both sides.
    async rg_beartrap(w, x) {
      const g = x.floor(x.target); audio.sfx('block');
      [-1, 1].forEach((sg) => spike(w, g.clone().add(V(sg * 0.42, 0, 0)), { color: 0x8a8490, h: 0.75, wd: 0.32, tilt: -sg * 1.25, up: 70, hold: 380, bits: 0xdcdad8 }));
      await beat(70); x.land('hit_blunt', x.target, { s: 0.8 }); x.land('x_star_steel', x.target, { s: 0.7 }); audio.sfx('hit'); w.shake(0.2, 160);
      decal(w, 'circle', g, { color: 0x6a5a48, size: 0.9, to: 1, ms: 1000, opacity: 0.6, hold: 0.8 }); await beat(260);
    },
    // Thornshot: a green-tipped arrow; thorns break out of the wound.
    async rg_thorn(w, x) {
      const a = at(x); audio.sfx('arrow'); await fly(w, 'arrow', x.from, a, { arc: 0.4, ms: 220, trail: 0x9be04a });
      x.land('hit_poison', x.target, { s: 0.8 });
      for (let k = 0; k < 5; k++) { const ang = (k / 5) * 6.28; spr(w, 'shard', a.clone().add(V(Math.cos(ang) * 0.2, Math.sin(ang) * 0.2, 0)), { color: 0x6aa82a, size: 0.25, to: 0.45, ms: 360, rot: ang, hold: 0.5 }); }
      await beat(200);
    },
    // Fleet Step: leaves whirl up behind the ranger as they slip to the new spot.
    async rg_fleet(w, x) {
      audio.sfx('wind'); sign(w, x);
      for (let i = 0; i < 10; i++) after(i * 25, () => bit(w, 'shard', x.feet.clone().add(V(R(0.8), 0.3, R(0.5))), { color: i % 2 ? 0x6aa82a : 0xa8d070, size: 0.12, life: 700, vel: V(R(1.6), 1.6 + Math.random(), R(1)), gravity: 1, spin: R(8), add: false }));
      await beat(260);
    },
    // Net Trap: a net is flung over the place and drops on everyone under it.
    async rg_net(w, x) {
      const g = x.floor(x.target); audio.sfx('wind');
      await shot(w, x.from, g.clone().add(V(0, 1.2, 0)), 0xb09870, { name: 'circle', size: 0.6, arc: 1, spin: 4, ms: 300, trail: null });
      decal(w, 'circle', g, { color: 0x8a6a48, size: 2.6, to: 1.9, ms: 1000, opacity: 0.85, hold: 0.75, ease: Ease.outQuad }); audio.sfx('hit');
      x.targets.forEach((t) => x.land('snare', t, { s: 0.65 })); w.flashCells(x.cells, 0x8a6a48, 320); await beat(260);
    },
    // Pack Tactics: a call goes out in green rings; every ally in reach answers it, claws bared.
    async rg_pack(w, x) {
      audio.sfx('roar'); for (let k = 0; k < 2; k++) after(k * 160, () => decal(w, 'shock', x.feet, { color: 0x6aa82a, size: 0.5, to: 4, ms: 520, opacity: 0.75, add: true }));
      sign(w, x); spots(w, x).forEach(([p], i) => after(120 + i * 60, () => play(w, 'claw', p, { s: 0.5, order: 35 }))); await beat(360);
    },
    // Poison Spikes: green spikes spring out of every hex of the place.
    async rg_spikes(w, x) {
      audio.sfx('poison'); const struck = struckSet(x);
      x.cells.slice(0, 7).forEach((c, i) => after(i * 35, () => { const g = x.floor(c);
        for (let k = 0; k < 3; k++) spike(w, g.clone().add(V(R(0.5), 0, R(0.35))), { color: k % 2 ? 0x6aa82a : 0x9be04a, h: 0.45 + Math.random() * 0.3, wd: 0.15, tilt: R(0.6), up: 80, hold: 340 });
        if (struck.has(c.q + ',' + c.r)) { x.land('hit_poison', c, { s: 0.8 }); x.land('x_eye_poison', c, { s: 0.6 }); } }));
      await beat(7 * 35 + 160); w.flashCells(x.cells, 0x7ac03a, 320); w.shake(0.14, 120);
    },
    // Wild Hunt: three arrows, each running with a spirit of the wind, come at the foe from three sides.
    async rg_wildhunt(w, x) {
      const a = at(x); const side = sideways(x.from, a); audio.sfx('wind');
      const shots = [-1, 0, 1].map((k, i) => after(i * 90, () => { audio.sfx('arrow'); const st = x.from.clone().add(side.clone().multiplyScalar(k * 0.5)).add(V(0, 0.3, 0));
        return Promise.all([fly(w, 'arrow', st, a, { arc: 0.9 + Math.abs(k) * 0.5, ms: 280 }), fly(w, 'orb_wind', st, a, { s: 0.6, arc: 0.9 + Math.abs(k) * 0.5, ms: 280, trail: 0x9be0b0 })]).then(() => { x.land('claw', x.target, { s: 0.9, flipX: k > 0 }); x.land('hit_wind', x.target, { s: 0.7 }); w.shake(0.14, 100); }); }));
      await Promise.all(shots); x.land('x_splat_wind', x.target, { s: 0.8 }); x.land('mark', x.target, { s: 0.7 });
      for (let i = 0; i < 8; i++) bit(w, 'shard', a.clone(), { color: i % 2 ? 0xf4ecd8 : 0x6aa82a, size: 0.14, life: 800, vel: V(R(2.4), 1 + Math.random() * 2, R(1.6)), gravity: 2, spin: R(8), add: false });
      w.flashCells(x.cells, 0x4a8a3a, 360); await beat(200);
    },
    // Snare Field: roots break out of the ground ring by ring from the middle; poison puffs out of them.
    async rg_snarefield(w, x) {
      const g = x.floor(x.target); const struck = struckSet(x); audio.sfx('earth');
      const order = x.cells.slice(0, 19).sort(near(x, g));
      order.forEach((c, i) => after(Math.min(500, x.floor(c).distanceTo(g) * 140), () => { const q = x.floor(c);
        for (let k = 0; k < 2; k++) spike(w, q.clone().add(V(R(0.5), 0, R(0.35))), { color: k ? 0x4f9434 : 0x6a5238, h: 0.55 + Math.random() * 0.35, wd: 0.18, tilt: R(1), up: 120, hold: 520 });
        bit(w, 'smoke', q.clone().add(V(0, 0.3, 0)), { color: 0x7ac03a, size: 0.4, life: 700, vel: V(R(0.3), 0.6, R(0.3)), add: false, opacity: 0.5, grow: 1 });
        if (struck.has(c.q + ',' + c.r)) { x.land('snare', c, { s: 0.65 }); x.land('hit_poison', c, { s: 0.7 }); } }));
      await beat(560); w.shake(0.3, 260); w.flashCells(x.cells, 0x4a8a3a, 460); scar(w, 'af_poison', g, 0.9); await beat(160);
    },

    // ───────── REAPER: the scythe and the soul; bone and shadow ─────────
    // Scythe Sweep: one long reaping arc across the cone.
    async rp_sweep(w, x) {
      const a = at(x); await melee(w, x); audio.sfx('slash'); const ang = screenAngle(w, x.from, a);
      spr(w, 'slash', x.from.clone().add(screenDir(w, ang, 0.9)), { color: 0xf0e8d8, size: 1.7, to: 2.6, ms: 320, rot: ang - Math.PI / 2, spin: -1.6, add: true, hold: 0.35 });
      x.cells.slice(0, 6).sort(near(x, x.feet)).forEach((c, i) => after(30 + i * 30, () => x.land('reap', c, { s: 0.8, flipX: i % 2 === 1 })));
      x.targets.forEach((t) => x.land('hit_shadow', t, { s: 0.6 })); await beat(260);
    },
    // Harvest: the scythe takes the foe low; if it is near its end the blade glows for it.
    async rp_harvest(w, x) {
      const a = at(x); const l = await melee(w, x); audio.sfx('slash'); x.land('reap', x.target, { s: 1, flipX: l }); x.land('x_rune_blood', x.target, { s: 0.7 });
      spr(w, 'slash', a, { color: 0xf0e8d8, size: 0.6, to: 1.2, ms: 260, rot: 0.6, add: true }); await beat(200);
    },
    // Grave Step: the reaper comes up out of the dark beside the foe and the blade is already falling.
    async rp_gravestep(w, x) {
      audio.sfx('shadow'); decal(w, 'swirl', x.feet, { color: 0x5c2ea0, size: 1.6, to: 0.6, ms: 360, spin: 6, opacity: 0.85, add: true, ease: Ease.inQuad });
      smoke(w, x.feet, 0x2a1640, 5, 30, 0.6); const l = left(w, x); x.land('reap', x.target, { s: 0.95, flipX: l }); x.land('hit_shadow', x.target, { s: 0.7 }); await beat(220);
    },
    // Soul Tithe: the cut, and a pale soul-light drawn out of the foe into the reaper.
    async rp_tithe(w, x) {
      const l = await melee(w, x); audio.sfx('slash'); x.land('reap', x.target, { s: 0.95, flipX: l }); souls(w, x, 0x9be0ff, 3); await beat(340);
      spr(w, 'spark', x.from, { color: 0x9be0ff, size: 0.3, to: 0.9, ms: 240, add: true });
    },
    // Omen: a black feather falls on the foe and an eye opens over it.
    async rp_omen(w, x) {
      const a = at(x); audio.sfx('shadow'); shot(w, a.clone().add(V(0.4, 1.8, 0)), a.clone().add(V(0, 0.6, 0)), 0x1a1020, { name: 'shard', size: 0.3, arc: 0.3, spin: 6, ms: 380, trail: null });
      await beat(300); x.land('mark', x.target, { s: 0.9 }); x.land('x_fang_arcane', x.target, { s: 0.7 }); spr(w, 'spark', a.clone().add(V(0, 0.9, 0)), { color: 0xb07aff, size: 0.3, to: 0.8, ms: 420, add: true, hold: 0.5 }); await beat(200);
    },
    // Reap: a full overhead stroke of the scythe; a crescent of bone light hangs where it passed.
    async rp_reap(w, x) {
      const a = at(x); const l = await melee(w, x, true); audio.sfx('slash');
      spr(w, 'slash', a.clone().add(V(0, 0.3, 0)), { color: 0xf0e8d8, size: 1, to: 1.8, ms: 340, rot: Math.PI / 2 + (l ? 0.4 : -0.4), add: true, hold: 0.35 });
      x.land('reap', x.target, { s: 1.15, flipX: l }); x.land('hit_shadow', x.target, { s: 0.8 }); x.land('x_eye_shadow', x.target, { s: 0.6 }); w.shake(0.24, 180); w.flashCells(x.cells, 0x8a4ad0, 280); await beat(220);
    },
    // Wailing Scythe: the blade turns once round the reaper and wails; pale rings go out with the sound.
    async rp_wail(w, x) {
      audio.sfx('shadow'); x.land('spin', x.u, { s: x.sc }); for (let k = 0; k < 3; k++) after(k * 110, () => decal(w, 'shock', x.feet, { color: 0xd8d0f0, size: 0.5, to: 3, ms: 420, opacity: 0.7, add: true }));
      x.targets.forEach((t, i) => after(80 + i * 30, () => { x.land('reap', t, { s: 0.8 }); x.land('x_nova_arcane', t, { s: 0.6 }); })); w.shake(0.18, 160); w.flashCells(x.cells, 0xd8d0bc, 300); await beat(320);
    },
    // Soul Shroud: shadow wraps the reaper like a cloak and they fade into it.
    async rp_shroud(w, x) {
      audio.sfx('shadow'); sign(w, x); decal(w, 'swirl', x.feet, { color: 0x5c2ea0, size: 0.6, to: 1.8, ms: 600, spin: -5, opacity: 0.8, add: true });
      x.land('b_motes_arcane', x.u, { s: x.sc }); smoke(w, x.feet, 0x2a1640, 10, 30, 0.6); await beat(320);
    },
    // Gravecall: a pale hand reaches from the reaper to the foe and drags it close.
    async rp_gravecall(w, x) {
      const a = at(x); audio.sfx('shadow'); stroke(w, x.from, a, { color: 0xd8d0f0, wd: 0.3, ms: 380, name: 'pillar' });
      x.land('claw', x.target, { s: 0.8 }); x.land('x_crack_shadow', x.target, { s: 0.7 }); for (let k = 0; k < 6; k++) after(k * 30, () => bit(w, 'spark', a.clone().lerp(x.from, k / 6), { color: 0xd8d0f0, size: 0.08, life: 260, add: true }));
      await beat(260);
    },
    // Final Rites: the scythe goes up into the dark; a giant blade of bone light comes down out of it.
    async rp_rites(w, x) {
      const a = at(x), g = x.floor(x.target); audio.sfx('shadow');
      decal(w, 'circle', g, { color: 0x5c2ea0, size: 1.8, to: 0.8, ms: 520, opacity: 0.8, spin: -3, add: true, ease: Ease.inQuad });
      spr(w, 'slash', a.clone().add(V(0, 2.2, 0)), { color: 0xf0e8d8, size: 1.4, to: 1.8, ms: 380, rot: Math.PI, add: true, hold: 0.7, opacity: 0.7 });
      await beat(320); const l = await melee(w, x, true); audio.sfx('crit');
      spr(w, 'slash', a, { color: 0xffffff, size: 1.2, to: 2.6, ms: 300, rot: Math.PI / 2 + 0.2, add: true, hold: 0.3 });
      x.land('reap', x.target, { s: 1.3, flipX: l }); x.land('hit_crit', x.target, { s: 0.9 }); x.land('x_shards_arcane', x.target, { s: 0.8 });
      w.shake(0.42, 300); w.flashCells(x.cells, 0xd8d0bc, 360); scar(w, 'af_shadow', g, 0.8);
      for (let k = 0; k < 8; k++) bit(w, 'shard', a.clone(), { color: 0xf0e8d8, size: 0.12, life: 600, vel: V(R(4), 1 + Math.random() * 2.5, R(3)), gravity: 9, spin: R(10), add: false });
      await beat(220);
    },

    // ───────── VENOMANCER: poison and the knife from the dark; green ─────────
    // Venom Fang: a quick stab; the blade leaves green drops behind it.
    async vm_dart(w, x) {
      const a = at(x); const l = await melee(w, x); audio.sfx('slash'); x.land('flurry', x.target, { s: 0.85, flipX: l }); x.land('x_star_poison', x.target, { s: 0.6 });
      for (let k = 0; k < 6; k++) w.particle(a.clone().add(V(R(0.4), R(0.3), R(0.2))), { color: 0x9be04a, size: 0.25, life: 520, vel: V(R(0.6), -0.4, R(0.4)), gravity: 8 }); await beat(160);
    },
    // Fume Veil: green fumes roll out from the venomancer and swallow them.
    async vm_cloud(w, x) {
      audio.sfx('poison'); sign(w, x); x.cells.slice(0, 7).forEach((c, i) => after(i * 30, () => spr(w, 'smoke', x.floor(c).add(V(0, 0.5, 0)), { color: i % 2 ? 0x7ac03a : 0x4a7a1a, size: 0.5, to: 1.5, ms: 800, hold: 0.5, opacity: 0.7 })));
      x.targets.filter((t) => t.uid !== x.u.uid).forEach((t) => x.land('hit_poison', t, { s: 0.7 })); await beat(320);
    },
    // Rupture: every bubble of poison in the foe bursts at once.
    async vm_corrode(w, x) {
      const a = at(x), g = x.floor(x.target); const l = await melee(w, x); audio.sfx('poison'); x.land('flurry', x.target, { s: 0.8, flipX: l });
      for (let k = 0; k < 7; k++) after(k * 30, () => spr(w, 'bubble', a.clone().add(V(R(0.6), R(0.6), R(0.3))), { color: 0x9be04a, size: 0.15, to: 0.4, ms: 220 }));
      await beat(200); x.land('hit_poison', x.target, { s: 0.9 }); x.land('x_splat_leaf', x.target, { s: 0.7 }); decal(w, 'smoke', g, { color: 0x6aa82a, size: 0.8, to: 1.6, ms: 1400, hold: 0.7, opacity: 0.7 }); await beat(160);
    },
    // Stalk: the venomancer melts into shadow and comes out of it somewhere else.
    async vm_stalk(w, x) { audio.sfx('shadow'); sign(w, x); smoke(w, x.feet, 0x2a2a20, 8, 25, 0.55); await beat(260); },
    // Virulence: the poison in the foe wakes and reaches out in green ripples for the next host.
    async vm_virulence(w, x) {
      const g = x.floor(x.target); audio.sfx('poison'); x.land('hit_poison', x.target, { s: 0.85 });
      for (let k = 0; k < 3; k++) after(60 + k * 130, () => decal(w, 'shock', g, { color: 0x9be04a, size: 0.5, to: 3.4, ms: 500, opacity: 0.75, add: true }));
      for (let i = 0; i < 8; i++) after(i * 40, () => bit(w, 'bubble', g.clone().add(V(R(1), 0.2, R(0.6))), { color: 0x9be04a, size: 0.1, life: 600, vel: V(0, 0.8, 0), add: false, grow: 0.5 })); await beat(400);
    },
    // Mithridate: the venomancer drinks it; the bad drops out of them, and a skin of green closes over.
    async vm_mithridate(w, x) {
      audio.sfx('heal'); sign(w, x); for (let k = 0; k < 8; k++) bit(w, 'smoke', x.from.clone().add(V(R(0.4), R(0.5), R(0.3))), { color: 0x3a2a30, size: 0.25, life: 520, vel: V(R(2), 1.4, R(1)), add: false, opacity: 0.5 });
      rise(w, x.feet, 0x9be04a, 6, 0.5, 40); await beat(300);
    },
    // Ambush: out of the smoke in one stab, and the poison goes in deep.
    async vm_blight(w, x) {
      const a = at(x); smoke(w, x.feet, 0x2a2a20, 4, 20, 0.6); await melee(w, x); audio.sfx('slash');
      x.land('ambush', x.target, { s: 0.9 }); x.land('hit_poison', x.target, { s: 0.9 }); x.land('x_spiral_poison', x.target, { s: 0.7 }); spr(w, 'spark', a, { color: 0x9be04a, size: 0.4, to: 1.3, ms: 220, add: true }); w.shake(0.18, 140); await beat(220);
    },
    // Paralytic Sting: the sting goes in and a twitch of green lightning runs through the foe.
    async vm_paralytic(w, x) {
      const a = at(x); const l = await melee(w, x); audio.sfx('slash'); x.land('thrust', x.target, { s: 0.9, flipX: l }); x.land('x_pierce_leaf', x.target, { s: 0.6 });
      await beat(80); audio.sfx('zap'); for (let k = 0; k < 3; k++) after(k * 60, () => spr(w, 'bolt', a.clone().add(V(R(0.4), R(0.3), 0)), { color: 0x9be04a, size: 0.35, to: 0.5, sy: 1.2, ms: 140, add: true, rot: R(1.2) })); x.land('hit_poison', x.target, { s: 0.7 }); await beat(220);
    },
    // Fester Bloom: pustules swell on every hex of the place and burst.
    async vm_fester(w, x) {
      audio.sfx('poison'); const cells = x.cells.slice(0, 7);
      cells.forEach((c, i) => after(i * 30, () => { const g = x.floor(c).add(V(R(0.3), 0.3, R(0.2))); spr(w, 'bubble', g, { color: i % 2 ? 0x9be04a : 0xd9488f, size: 0.2, to: 0.7, ms: 380, hold: 0.85 }); }));
      await beat(400); audio.sfx('poison'); cells.forEach((c) => { const g = x.floor(c); spr(w, 'smoke', g.clone().add(V(0, 0.5, 0)), { color: 0x7ac03a, size: 0.5, to: 1.4, ms: 600, opacity: 0.75, hold: 0.3 }); });
      x.targets.forEach((t) => { x.land('hit_poison', t, { s: 0.8 }); x.land('x_fang_poison', t, { s: 0.6 }); }); w.flashCells(x.cells, 0x7ac03a, 360); w.shake(0.16, 140); await beat(200);
    },
    // Toxic Blood: the venomancer's veins glow green; red and green motes circle them.
    async vm_blood(w, x) {
      audio.sfx('buff'); sign(w, x);
      for (let i = 0; i < 14; i++) after(i * 25, () => { const a = (i / 14) * Math.PI * 4; bit(w, 'spark', x.from.clone().add(V(Math.cos(a) * 0.6, -0.4 + i * 0.06, Math.sin(a) * 0.4)), { color: i % 2 ? 0x9be04a : 0xc02a3a, size: 0.09, life: 260, add: true }); });
      await beat(380);
    },
    // Pandemic: a cloud breaks out of the foe and rolls on, ring by ring, to everyone near it.
    async vm_pandemic(w, x) {
      const g = x.floor(x.target); audio.sfx('poison'); x.land('spores', x.target, { s: 0.9 }); x.land('x_claw_poison', x.target, { s: 0.8 });
      for (let k = 0; k < 4; k++) after(k * 120, () => { decal(w, 'shock', g, { color: k % 2 ? 0x6aa82a : 0x9be04a, size: 0.5 + k * 0.6, to: 1.8 + k * 1.2, ms: 480, opacity: 0.8, add: true });
        for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 + k; spr(w, 'smoke', g.clone().add(V(Math.cos(a) * (0.6 + k * 0.5), 0.5, Math.sin(a) * (0.4 + k * 0.35))), { color: (i + k) % 3 ? 0x3f6a1a : 0x7a3fa0, size: 0.4, to: 1.1, ms: 700, opacity: 0.8, hold: 0.4 }); } }); // (dark green and violet: it still reads on grass)
      await beat(560); w.shake(0.3, 260); w.flashCells(x.cells, 0x7ac03a, 460); scar(w, 'af_poison', g, 0.9);
      for (let i = 0; i < 10; i++) after(i * 60, () => bit(w, 'bubble', g.clone().add(V(R(2), 0.2, R(1.3))), { color: i % 2 ? 0x9be04a : 0xa24fd0, size: 0.1, life: 700, vel: V(0, 0.8, 0), add: false, grow: 0.5 }));
    },

    // ───────── BISHOP: heaven's light on friends and on foes; cream and gold ─────────
    // Greater Heal: a soft column of light settles on the friend and leaves petals of light rising.
    async bi_heal(w, x) {
      audio.sfx('heal'); spots(w, x).forEach(([p, g, s]) => { spr(w, 'pillar', g.clone().add(V(0, 1.8, 0)), { color: 0xfff0c0, size: 0.4, to: 0.6, sy: 4.5, ms: 640, add: true, hold: 0.5, opacity: 0.8 }); play(w, 'heal', g, { s, order: 34 }); rise(w, g, 0xffe9a0, 6, 0.5, 40); });
      sign(w, x); await beat(320);
    },
    // Holy Word: one spoken word, a sphere of light, and the foe staggers back from it.
    async bi_word(w, x) {
      const a = at(x); audio.sfx('holy'); await fly(w, 'orb_holy', x.from, a, { arc: 0.3, trail: 0xffe9a0 });
      x.land('hit_holy', x.target, { s: 0.8 }); x.land('x_spiral_fire', x.target, { s: 0.6 }); spr(w, 'cross', a, { color: 0xffffff, size: 0.3, to: 0.8, ms: 340, add: true, hold: 0.3 }); await beat(160);
    },
    // Sacred Ward: leaves of light close round the friend and a slow ring turns under them.
    async bi_ward(w, x) {
      audio.sfx('block'); sign(w, x); spots(w, x).forEach(([p, g]) => { decal(w, 'circle', g, { color: 0xffe9a0, size: 0.5, to: 1.4, ms: 900, spin: 1.5, opacity: 0.8, add: true, hold: 0.6 }); spr(w, 'shield', p, { color: 0xfff0c0, size: 0.35, to: 0.6, ms: 520, add: true, hold: 0.5 }); });
      await beat(320);
    },
    // Benediction: the bishop's hand is raised; gold chevrons rise off the friend and a star turns over them.
    async bi_bene(w, x) {
      audio.sfx('buff'); sign(w, x); spots(w, x).forEach(([p]) => { spr(w, 'spark', p.clone().add(V(0, 0.8, 0)), { color: 0xffe9a0, size: 0.3, to: 0.7, ms: 620, add: true, spin: 2, hold: 0.6 }); for (let k = 0; k < 2; k++) after(k * 120, () => spr(w, 'chevron', p, { color: 0xffe9a0, size: 0.25, to: 0.38, ms: 480, rise: 0.7, add: true, hold: 0.3 })); });
      await beat(340);
    },
    // Absolution: the dark is lifted off the friend and blown away in a breath of white.
    async bi_absolve(w, x) {
      audio.sfx('holy'); sign(w, x); spots(w, x).forEach(([p]) => { for (let k = 0; k < 8; k++) bit(w, 'smoke', p.clone().add(V(R(0.4), R(0.5), R(0.3))), { color: 0x2a2030, size: 0.25, life: 520, vel: V(R(2.4), 1.2, R(1.2)), add: false, opacity: 0.55 }); spr(w, 'spark', p, { color: 0xffffff, size: 0.4, to: 1.4, ms: 260, add: true }); });
      await beat(300);
    },
    // Prayer of Mending: a ring opens under the bishop and threads of light run from it to each ally.
    async bi_mending(w, x) {
      audio.sfx('heal'); decal(w, 'circle', x.feet, { color: 0xfff0c0, size: 0.8, to: 3.6, ms: 900, spin: 1.2, opacity: 0.85, add: true, hold: 0.6 });
      x.land('b_petals_fire', x.u, { s: x.sc * 0.8 });
      spots(w, x).forEach(([p, g, s], i) => after(120 + i * 60, () => { if (p.distanceToSquared(x.from) > 0.2) stroke(w, x.from, p, { color: 0xffe9a0, wd: 0.2, ms: 360, name: 'pillar' }); play(w, 'heal', g, { s, order: 34 }); }));
      w.flashCells(x.cells, 0xf0d890, 380); await beat(380);
    },
    // Censure: a beam of judgement falls straight down on the foe and brands it.
    async bi_censure(w, x) {
      const g = x.floor(x.target); audio.sfx('holy'); decal(w, 'circle', g, { color: 0xffe9a0, size: 0.4, to: 1.4, ms: 600, spin: 3, opacity: 0.9, add: true, hold: 0.6 });
      await beat(160); stroke(w, g.clone().add(V(-0.3, 6, 0)), g.clone().add(V(0, 0.2, 0)), { color: 0xffe9a0, wd: 0.6, ms: 280, name: 'pillar' });
      x.land('hit_holy', x.target, { s: 0.9 }); x.land('x_bloom_holy', x.target, { s: 0.7 }); w.shake(0.18, 140); w.flashCells(x.cells, 0xffffff, 280); await beat(200);
    },
    // Sanctify: runes ring the bishop and every ally in reach is given a shield of light.
    async bi_sanctify(w, x) {
      audio.sfx('block'); x.land('w_runes_holy', x.u, { s: x.sc }); decal(w, 'shock', x.feet, { color: 0xfff0c0, size: 0.5, to: 4, ms: 500, opacity: 0.75, add: true });
      spots(w, x).forEach(([p], i) => after(100 + i * 60, () => spr(w, 'shield', p, { color: 0xfff0c0, size: 0.35, to: 0.65, ms: 560, add: true, hold: 0.5 }))); w.flashCells(x.cells, 0xf0d890, 360); await beat(360);
    },
    // Mass Resurrection: a great circle opens under the bishop and a column of light stands on every fallen friend.
    async bi_massres(w, x) {
      audio.sfx('holy'); decal(w, 'circle', x.feet, { color: 0xfff0c0, size: 1, to: 4.6, ms: 1100, spin: 1, opacity: 0.9, add: true, hold: 0.6 }); x.land('b_spiral_holy', x.u, { s: x.sc });
      await beat(260); const fr = units(w, x);
      fr.forEach((t, i) => after(i * 80, () => { const g = w.unitPos(t.uid, 0.02); spr(w, 'pillar', g.clone().add(V(0, 2.2, 0)), { color: 0xffe9a0, size: 0.5, to: 0.9, sy: 5, ms: 900, add: true, hold: 0.55, opacity: 0.9 }); play(w, t.alive === false ? 'revive' : 'heal', g, { s: 1 }); }));
      await beat(fr.length * 80 + 300); audio.sfx('heal'); w.flashCells(x.cells, 0xfff0c0, 460);
      for (let i = 0; i < 14; i++) after(i * 60, () => bit(w, 'shard', x.feet.clone().add(V(R(3), 2.5 + Math.random(), R(2))), { color: i % 3 ? 0xffffff : 0xffe27a, size: 0.13, life: 1400, vel: V(R(0.4), -1.1, R(0.3)), spin: R(4), add: false }));
    },
    // Divine Intervention: the sky opens over the friend; a great pillar of light comes down and wings close round them.
    async bi_intervene(w, x) {
      audio.sfx('holy'); spots(w, x).forEach(([p, g]) => { decal(w, 'circle', g, { color: 0xffe9a0, size: 0.6, to: 2.2, ms: 800, spin: 2, opacity: 0.9, add: true, hold: 0.6 }); for (let k = 0; k < 8; k++) after(k * 25, () => { const a = Math.random() * 6.28, st = g.clone().add(V(Math.cos(a) * 1.3, 0.15, Math.sin(a) * 0.9)); bit(w, 'spark', st, { color: 0xffe9a0, size: 0.09, life: 300, vel: p.clone().sub(st).multiplyScalar(2.6), drag: 1 }); }); });
      await beat(260); spots(w, x).forEach(([p, g]) => { spr(w, 'pillar', g.clone().add(V(0, 3, 0)), { color: 0xffffff, size: 0.3, to: 0.7, sy: 9, ms: 520, add: true, hold: 0.4 }); spr(w, 'pillar', g.clone().add(V(0, 2.6, 0)), { color: 0xffe9a0, size: 0.6, to: 1.2, sy: 5, ms: 760, add: true, hold: 0.5, opacity: 0.85 }); decal(w, 'shock', g, { color: 0xfff0c0, size: 0.6, to: 3.4, ms: 440, opacity: 0.85, add: true }); });
      audio.sfx('block'); w.shake(0.28, 220); sign(w, x); spots(w, x).forEach(([p]) => spr(w, 'shield', p, { color: 0xffffff, size: 0.5, to: 0.9, ms: 700, add: true, hold: 0.55 }));
      await beat(380);
    },

    // ───────── MONK: the open hand and the breath; blue ─────────
    // Palm Strike: the open palm lands and a ring of force throws the foe back.
    async mo_palm(w, x) {
      const a = at(x); const l = await melee(w, x); audio.sfx('hit'); x.land('hit_blunt', x.target, { s: 0.9, flipX: l }); x.land('x_crack_fire', x.target, { s: 0.6 });
      spr(w, 'shock', a, { color: 0xbfe0ff, size: 0.3, to: 1.6, ms: 280, add: true }); const ang = screenAngle(w, x.from, a);
      for (let i = 0; i < 3; i++) bit(w, 'shard', a.clone().add(screenDir(w, ang, 0.3 + i * 0.2)), { color: 0xffffff, size: 0.6, life: 220, rot: ang, opacity: 0.8, vel: screenDir(w, ang, 3) }); w.shake(0.14, 120); await beat(180);
    },
    // Flurry: three blows too fast to count, each in its own place.
    async mo_flurry(w, x) {
      const a = at(x); await melee(w, x);
      for (let i = 0; i < 3; i++) { play(w, 'hit_blunt', a.clone().add(screenDir(w, 0, R(0.8))).add(V(0, R(0.6), 0)), { s: 0.6, order: 35 }); audio.sfx('hit'); w.shake(0.08, 50); await beat(60); }
      x.land('x_bubbles_smoke', x.target, { s: 0.6 }); await beat(120);
    },
    // Centering: a still ring of water under the monk; the breath is drawn in.
    async mo_center(w, x) {
      audio.sfx('magic'); sign(w, x); decal(w, 'circle', x.feet, { color: 0x8fd0ff, size: 1.8, to: 0.9, ms: 700, spin: -1, opacity: 0.8, add: true, ease: Ease.inQuad });
      for (let k = 0; k < 10; k++) after(k * 25, () => { const a = Math.random() * 6.28, st = x.from.clone().add(V(Math.cos(a) * 1.2, R(0.6), Math.sin(a) * 0.8)); bit(w, 'spark', st, { color: 0xbfe0ff, size: 0.08, life: 280, vel: x.from.clone().sub(st).multiplyScalar(3), drag: 1 }); });
      await beat(320);
    },
    // Rising Kick: the kick comes up from below and lifts the foe off its feet.
    async mo_kick(w, x) {
      const a = at(x); const l = await melee(w, x); audio.sfx('hit'); x.land('hit_blunt', x.target, { s: 0.9, flipX: l });
      spr(w, 'slash', a.clone().add(V(0, -0.2, 0)), { color: 0xbfe0ff, size: 0.8, to: 1.4, ms: 260, rot: l ? 2.3 : 0.8, add: true }); spr(w, 'chevron', a.clone().add(V(0, 0.3, 0)), { color: 0xffffff, size: 0.25, to: 0.4, ms: 360, rise: 0.6, add: true }); w.shake(0.12, 100); await beat(180);
    },
    // Flowing Step: the monk moves like water; ripples where they step.
    async mo_flow(w, x) {
      audio.sfx('wind'); sign(w, x); for (let k = 0; k < 2; k++) after(k * 120, () => decal(w, 'shock', x.feet, { color: 0x8fd0ff, size: 0.3, to: 1.8, ms: 420, opacity: 0.7, add: true })); await beat(260);
    },
    // Chi Burst: the chi of every card played this turn gathers in the monk and bursts out round them.
    async mo_chi(w, x) {
      audio.sfx('magic'); spr(w, 'smoke', x.from, { color: 0x8fd0ff, size: 0.4, to: 1.1, ms: 360, add: true, hold: 0.7 });
      for (let k = 0; k < 10; k++) after(k * 20, () => { const a = Math.random() * 6.28, st = x.from.clone().add(V(Math.cos(a) * 1.4, R(1), Math.sin(a) * 0.9)); bit(w, 'spark', st, { color: k % 2 ? 0xffe9a0 : 0x8fd0ff, size: 0.1, life: 240, vel: x.from.clone().sub(st).multiplyScalar(4), drag: 1 }); });
      await beat(300); audio.sfx('holy'); decal(w, 'shock', x.feet, { color: 0xbfe0ff, size: 0.5, to: 3.2, ms: 400, opacity: 0.85, add: true }); spr(w, 'spark', x.from, { color: 0xffffff, size: 0.6, to: 2, ms: 240, add: true });
      x.targets.forEach((t) => { x.land('hit_holy', t, { s: 0.8 }); x.land('x_star_fire', t, { s: 0.6 }); }); w.shake(0.18, 160); w.flashCells(x.cells, 0x5aa8d8, 320); await beat(200);
    },
    // Iron Body: the monk's skin rings like a bell; a sheen of steel runs over them.
    async mo_ironbody(w, x) {
      audio.sfx('block'); sign(w, x); spr(w, 'pillar', x.feet.clone().add(V(0, 1, 0)), { color: 0xdcdad8, size: 0.5, to: 0.7, sy: 2.6, ms: 420, add: true, hold: 0.3 });
      decal(w, 'shock', x.feet, { color: 0xdcdad8, size: 0.4, to: 2.2, ms: 380, opacity: 0.75, add: true }); w.shake(0.1, 100); await beat(300);
    },
    // Pressure Point: three precise touches, joined by a thin line of light; the foe's guard goes slack.
    async mo_pressure(w, x) {
      const a = at(x); await melee(w, x); const pts = [[-0.3, 0.3], [0.25, 0.1], [-0.05, -0.25]].map(([u, v]) => a.clone().add(screenDir(w, 0, u)).add(V(0, v, 0)));
      for (let i = 0; i < 3; i++) { spr(w, 'spark', pts[i], { color: 0xffffff, size: 0.15, to: 0.5, ms: 520, add: true, hold: 0.6 }); if (i) stroke(w, pts[i - 1], pts[i], { color: 0x8fd0ff, wd: 0.08, ms: 500, name: 'pillar' }); audio.sfx('hit'); await beat(70); }
      x.land('x_crescent_steel', x.target, { s: 0.7 }); x.land('hit_crit', x.target, { s: 0.6 }); await beat(160);
    },
    // Dragon's Ascent: the monk sinks low; the blow goes up from the ground and a dragon of light climbs with it,
    // coiling round the foe and throwing it back.
    async mo_dragon(w, x) {
      const g = x.floor(x.target); audio.sfx('holy');
      decal(w, 'circle', x.feet, { color: 0x8fd0ff, size: 1.4, to: 0.7, ms: 320, spin: 4, opacity: 0.8, add: true, ease: Ease.inQuad });
      await beat(200); const l = await melee(w, x, true); audio.sfx('smash');
      x.land('hit_blunt', x.target, { s: 1.1, flipX: l }); x.land('x_bubbles_holy', x.target, { s: 0.7 });
      for (let i = 0; i < 16; i++) after(i * 22, () => { const t = i / 16, ang = t * Math.PI * 4; const p = g.clone().add(V(Math.cos(ang) * 0.55 * (1 - t * 0.4), 0.3 + t * 3, Math.sin(ang) * 0.38 * (1 - t * 0.4)));
        spr(w, 'flame', p, { color: i % 2 ? 0xe8a020 : 0x2f78c0, size: 0.5 - t * 0.2, to: 0.7 - t * 0.25, ms: 420, hold: 0.4 }); // the dragon's body is flat colour, so it reads on bright ground
        spr(w, 'flame', p, { color: 0xffffff, size: 0.22 - t * 0.08, to: 0.32 - t * 0.1, ms: 300, add: true, hold: 0.3 }); });
      spr(w, 'pillar', g.clone().add(V(0, 2.4, 0)), { color: 0xfff0c0, size: 0.4, to: 0.8, sy: 6, ms: 560, add: true, hold: 0.4, opacity: 0.85 });
      decal(w, 'shock', g, { color: 0xbfe0ff, size: 0.6, to: 3.2, ms: 400, opacity: 0.85, add: true }); w.shake(0.4, 300); w.flashCells(x.cells, 0x5aa8d8, 360);
      await beat(380); spr(w, 'spark', g.clone().add(V(0, 3.3, 0)), { color: 0xffffff, size: 0.4, to: 1.4, ms: 260, add: true }); scar(w, 'af_holy', g, 0.7);
    },
    // Inner Fire: a fire with no smoke wakes in the monk and stands round them.
    async mo_innerfire(w, x) {
      audio.sfx('fire'); sign(w, x); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; after(i * 25, () => spr(w, 'flame', x.feet.clone().add(V(Math.cos(a) * 0.45, 0.5, Math.sin(a) * 0.3)), { color: i % 2 ? 0xffd060 : 0x8fd0ff, size: 0.35, to: 0.6, sy: 1.8, ms: 460, add: true, rise: 0.4, hold: 0.3 })); }
      await beat(340);
    },

    // ───────── ENGINEER: gears, powder and sparks; brass ─────────
    // Deploy Cannon: the frame goes up with a shower of sparks and a puff of steam.
    async en_cannon(w, x) { audio.sfx('place'); const g = x.floor(x.target); play(w, 'build', g, { s: 1, order: 34 }); for (let k = 0; k < 3; k++) after(300 + k * 250, () => { burstBits(w, g.clone().add(V(R(0.4), 0.5, 0)), 0xffd060, 6); audio.sfx('hit'); }); after(900, () => smoke(w, g, 0xe8e8f0, 4, 40, 0.5)); await beat(1200); },
    // Rivet Gun: two rivets, hammered in one after the other.
    async en_rivet(w, x) {
      const a = at(x);
      for (let i = 0; i < 2; i++) { audio.sfx('hit'); await shot(w, x.from, a.clone().add(V(R(0.3), R(0.3), 0)), 0xdcdad8, { name: 'shard', size: 0.3, sy: 0.5, arc: 0.05, ms: 120, orient: true, trail: { color: 0xffffff, size: 0.1, life: 100 } }); x.land('hit_spark', x.target, { s: 0.6 }); burstBits(w, a, 0xffd060, 4); }
      x.land('x_bubbles_steel', x.target, { s: 0.6 }); await beat(120);
    },
    // Patch Up: a few quick turns of the wrench on the friend, sparks, and they stand straighter.
    async en_patch(w, x) {
      audio.sfx('hit'); spots(w, x).forEach(([p, g, s]) => { for (let k = 0; k < 3; k++) after(k * 90, () => burstBits(w, p.clone().add(V(R(0.4), R(0.4), 0)), 0xffd060, 4)); after(280, () => play(w, 'heal', g, { s, order: 34 })); });
      sign(w, x); await beat(360);
    },
    // Smoke Charge: a canister lobbed onto the place; it bursts and the smoke spreads over every hex.
    async en_smoke(w, x) {
      const g = x.floor(x.target); await shot(w, x.from, g.clone().add(V(0, 0.3, 0)), 0x8a8490, { name: 'rock', size: 0.22, arc: 1.2, spin: 8, ms: 320, trail: null });
      audio.sfx('wind'); x.cells.slice(0, 7).forEach((c, i) => after(i * 25, () => spr(w, 'smoke', x.floor(c).add(V(0, 0.5, 0)), { color: 0xc8c8d0, size: 0.5, to: 1.6, ms: 900, opacity: 0.75, hold: 0.5 })));
      x.targets.forEach((t) => x.land('x_cross_smoke', t, { s: 0.6 })); await beat(320);
    },
    // Calibrate: gears turn over the engineer's head, a click, and everything is set right.
    async en_calibrate(w, x) {
      audio.sfx('dice'); sign(w, x); decal(w, 'circle', x.feet, { color: 0xc8a050, size: 0.7, to: 1.4, ms: 700, spin: 4, opacity: 0.85, add: true, hold: 0.6 });
      spr(w, 'circle', x.from.clone().add(V(0, 0.8, 0)), { color: 0xffd060, size: 0.3, to: 0.45, ms: 600, spin: 6, add: true, hold: 0.6 }); await beat(300);
    },
    // Shield Pylon: the pylon goes up and blue arcs crawl over it.
    async en_pylon(w, x) {
      audio.sfx('place'); const g = x.floor(x.target); play(w, 'build', g, { s: 1, order: 34 });
      for (let k = 0; k < 4; k++) after(400 + k * 180, () => { stroke(w, g.clone().add(V(R(0.4), 0.3, 0)), g.clone().add(V(R(0.4), 1.4, 0)), { color: 0x8fd0ff, wd: 0.2, ms: 120 }); if (k % 2 === 0) audio.sfx('zap'); });
      after(1000, () => decal(w, 'shock', g, { color: 0x8fd0ff, size: 0.4, to: 2.4, ms: 420, opacity: 0.75, add: true })); await beat(1200);
    },
    // Grenade: lobbed, it lands, it ticks once, and it goes off.
    async en_grenade(w, x) {
      const g = x.floor(x.target); audio.sfx('wind'); await shot(w, x.from, g.clone().add(V(0, 0.3, 0)), 0x6a6a5a, { name: 'rock', size: 0.22, arc: 1.3, spin: 9, ms: 340, trail: { color: 0xaaaaaa, size: 0.15, life: 200 } });
      spr(w, 'spark', g.clone().add(V(0, 0.35, 0)), { color: 0xff3020, size: 0.15, to: 0.3, ms: 120, add: true }); await beat(120);
      x.land('blast', x.target, { s: 0.7 }); audio.sfx('explosion'); w.shake(0.3, 240); decal(w, 'crack', g, { color: 0x1a0c06, size: 1.2, to: 1.8, ms: 2000, hold: 0.75, opacity: 0.85 });
      x.targets.forEach((t) => x.land('hit_fire', t, { s: 0.8 })); x.land('x_eye_blood', x.target, { s: 0.6 }); rocks(w, g, 0xff8a2a, 6); w.flashCells(x.cells, 0xff7a2a, 360); await beat(200);
    },
    // Tesla Coil: the charge jumps from hex to hex down the line and stuns what it finds.
    async en_tesla(w, x) {
      const order = x.cells.slice(0, 8).sort(near(x, x.feet)); if (!order.length) return; const struck = struckSet(x); const pts = [x.from, ...order.map((c) => x.chest(c))];
      audio.sfx('zap'); for (let i = 0; i < order.length; i++) { stroke(w, pts[i], pts[i + 1], { color: 0x8fd0ff, wd: 0.5 }); w.flashCells([order[i]], 0xffffff, 160); if (struck.has(order[i].q + ',' + order[i].r)) { x.land('zap', order[i], { s: 0.85 }); w.shake(0.1, 80); } await beat(45); }
      for (let i = 0; i < order.length; i++) stroke(w, pts[i], pts[i + 1], { color: 0xffffff, wd: 0.3, ms: 140 }); audio.sfx('zap'); await beat(140);
    },
    // Bulwark Plate: the plate is hammered on: three clangs, and sparks off each.
    async en_plate(w, x) {
      sign(w, x); spots(w, x).forEach(([p]) => { for (let k = 0; k < 3; k++) after(k * 100, () => { burstBits(w, p.clone().add(V(R(0.4), R(0.4), 0)), 0xffd060, 5); audio.sfx('block'); }); }); await beat(340);
    },
    // Mech Suit: the suit closes round the engineer plate by plate; steam vents and the ground shakes as it stands.
    async en_mech(w, x) {
      audio.sfx('place'); x.land('build', x.u, { s: x.sc * 0.9 }); sign(w, x);
      for (let k = 0; k < 4; k++) after(200 + k * 160, () => { burstBits(w, x.from.clone().add(V(R(0.6), R(0.6), 0)), 0xffd060, 6); audio.sfx('block'); });
      await beat(860); smoke(w, x.feet, 0xe8e8f0, 8, 30, 0.6); decal(w, 'shock', x.feet, { color: 0xc8a050, size: 0.5, to: 3, ms: 420, opacity: 0.8, add: true }); audio.sfx('smash'); w.shake(0.36, 280);
      spr(w, 'shield', x.from, { color: 0xfff0c0, size: 0.5, to: 0.85, ms: 560, add: true, hold: 0.5 }); await beat(260);
    },

    // ───────── FORGEMASTER: hammer, anvil and the fire of the forge; orange ─────────
    // Molten Hammer: the hammer glows; it rings on the foe and throws sparks like an anvil.
    async fm_molten(w, x) {
      const a = at(x); spr(w, 'flame', x.from.clone().add(V(0, 0.9, 0)), { color: 0xff7a2a, size: 0.25, to: 0.5, sy: 1.4, ms: 260, add: true, hold: 0.6 });
      const l = await melee(w, x, true); audio.sfx('smash'); x.land('smash', x.target, { s: 1, flipX: l }); x.land('hit_fire', x.target, { s: 0.7 }); x.land('x_nova_fire', x.target, { s: 0.6 });
      for (let k = 0; k < 10; k++) bit(w, 'spark', a.clone(), { color: k % 2 ? 0xffd060 : 0xff7a2a, size: 0.07, life: 520, vel: V(R(4), 1.5 + Math.random() * 2, R(3)), gravity: 9, add: true }); w.shake(0.2, 160); await beat(180);
    },
    // Anvil Guard: plates of the forge close on the smith with a ring of iron.
    async fm_guard(w, x) { audio.sfx('block'); sign(w, x); burstBits(w, x.from, 0xffd060, 8); decal(w, 'shock', x.feet, { color: 0xff9a3a, size: 0.4, to: 2, ms: 360, opacity: 0.75, add: true }); await beat(300); },
    // Heat the Steel: the steel goes red, then white; the heat shimmers off it.
    async fm_heat(w, x) {
      audio.sfx('fire'); sign(w, x); spr(w, 'flame', x.from.clone().add(V(0, 0.6, 0)), { color: 0xff7a2a, size: 0.35, to: 0.7, sy: 1.8, ms: 480, add: true, hold: 0.6, rise: 0.3 });
      after(200, () => spr(w, 'flame', x.from.clone().add(V(0, 0.6, 0)), { color: 0xfff0b0, size: 0.2, to: 0.45, sy: 1.6, ms: 360, add: true, hold: 0.5, rise: 0.3 })); rise(w, x.feet, 0xffb060, 8, 0.6, 35); await beat(340);
    },
    // Crushing Blow: the hammer comes down through the guard; the guard breaks like a shell.
    async fm_crush(w, x) {
      const a = at(x), g = x.floor(x.target); const l = await melee(w, x, true); audio.sfx('smash');
      x.land('smash', x.target, { s: 1.05, flipX: l }); x.land('shatter', x.target, { s: 0.8 }); decal(w, 'crack', g, { color: 0x2a1a10, size: 0.8, to: 1.3, ms: 1400, hold: 0.7, opacity: 0.85 });
      for (let i = 0; i < 8; i++) bit(w, 'shard', a.clone(), { color: i % 2 ? 0xdcdad8 : 0x8a8490, size: 0.11, life: 560, vel: V(R(4), 1 + Math.random() * 2.5, R(3)), gravity: 10, spin: R(12), add: false }); w.shake(0.26, 200); await beat(200);
    },
    // Slag Throw: a gob of molten slag lobbed high; it splashes and the ground under it glows.
    async fm_slag(w, x) {
      const a = at(x), g = x.floor(x.target); audio.sfx('fire'); await fly(w, 'fireball', x.from, a, { s: 0.6, arc: 1, trail: 0xff7a2a });
      x.land('hit_fire', x.target, { s: 0.8 }); x.land('x_nova_blood', x.target, { s: 0.6 }); decal(w, 'crack', g, { color: 0xff8a2a, size: 0.6, to: 1.2, ms: 1300, hold: 0.7, opacity: 0.9, add: true });
      for (let k = 0; k < 6; k++) bit(w, 'rock', a.clone(), { color: k % 2 ? 0xff8a2a : 0xffe9a0, size: 0.08, life: 500, vel: V(R(3), 1.5 + Math.random() * 1.6, R(2)), gravity: 9, add: false }); audio.sfx('burn'); await beat(180);
    },
    // Seismic Hammer: the hammer hits the ground and a shock runs down the line, throwing up rock under each foe.
    async fm_seismic(w, x) {
      const order = x.cells.slice(0, 8).sort(near(x, x.feet)); if (!order.length) return; const struck = struckSet(x);
      await w.strike(x.u.uid, at(x), { heavy: true }); x.land('smash', order[0], { s: 0.8 }); audio.sfx('earth'); w.shake(0.3, 200);
      order.forEach((c, i) => after(i * 55, () => { const g = x.floor(c); decal(w, 'crack', g, { color: 0x2a1a10, size: 0.8, to: 1.2, ms: 1500, hold: 0.7, opacity: 0.85 }); decal(w, 'shock', g, { color: 0xd0a060, size: 0.3, to: 1.4, ms: 260, opacity: 0.7 });
        spike(w, g.clone().add(V(R(0.3), 0, R(0.2))), { color: 0x8a6a48, h: 0.5 + (i / order.length) * 0.5, wd: 0.45, tilt: R(0.8), up: 80, hold: 320, bits: 0xb08a5a });
        if (struck.has(c.q + ',' + c.r)) { x.land('hit_earth', c, { s: 0.85 }); x.land('x_rune_earth', c, { s: 0.6 }); w.shake(0.14, 100); } }));
      await beat(order.length * 55 + 160); w.flashCells(x.cells, 0xb08a5a, 320);
    },
    // Quench: the smith plunges into the cold; a great hiss of steam, and the iron sets hard.
    async fm_quench(w, x) {
      audio.sfx('ice'); sign(w, x); for (let i = 0; i < 14; i++) bit(w, 'smoke', x.from.clone().add(V(R(0.5), R(0.6), R(0.3))), { color: 0xf4f0ff, size: 0.45, life: 900, vel: V(R(2), 1 + Math.random() * 1.4, R(1.4)), add: false, opacity: 0.65, grow: 1.2 });
      decal(w, 'shock', x.feet, { color: 0x8fe0ff, size: 0.4, to: 2.2, ms: 380, opacity: 0.7, add: true }); await beat(320);
    },
    // Tempered Edge: the smith's hammer rings once and every ally's weapon takes the heat.
    async fm_tempered(w, x) {
      audio.sfx('block'); decal(w, 'shock', x.feet, { color: 0xff9a3a, size: 0.5, to: 4, ms: 480, opacity: 0.75, add: true }); burstBits(w, x.from, 0xffd060, 10);
      sign(w, x); spots(w, x).forEach(([p], i) => after(100 + i * 60, () => spr(w, 'flame', p.clone().add(V(0.2, 0.1, 0)), { color: 0xff9a3a, size: 0.25, to: 0.45, sy: 1.6, ms: 520, add: true, hold: 0.5, rise: 0.3 }))); await beat(360);
    },
    // Bellows Blast: the bellows heave and a roll of fire is driven out across the cone.
    async fm_bellows(w, x) {
      const order = x.cells.slice(0, 9).sort(near(x, x.feet)); if (!order.length) return; const struck = struckSet(x);
      audio.sfx('wind'); after(80, () => audio.sfx('fire'));
      order.forEach((c, i) => after(i * 32, () => { const g = x.floor(c); spr(w, 'flame', g.clone().add(V(0, 0.55, 0)), { color: i % 2 ? 0xff6a1a : 0xffc050, size: 0.55, to: 1, sy: 1.6, ms: 440, add: true, rise: 0.4, hold: 0.3 });
        if (struck.has(c.q + ',' + c.r)) { x.land('hit_fire', c, { s: 0.85 }); audio.sfx('burn'); } }));
      w.shake(0.2, 200); await beat(order.length * 32 + 200); w.flashCells(x.cells, 0xff7a2a, 380);
    },
    // Shatter Armor: the hammer comes down from overhead; the armour bursts off the foe in plates and the ground breaks with it.
    async fm_shatter(w, x) {
      const a = at(x), g = x.floor(x.target); spr(w, 'flame', x.from.clone().add(V(0, 1.1, 0)), { color: 0xff7a2a, size: 0.3, to: 0.7, sy: 1.6, ms: 360, add: true, hold: 0.7 }); audio.sfx('fire');
      await beat(160); const l = await melee(w, x, true); audio.sfx('smash');
      x.land('smash', x.target, { s: 1.25, flipX: l }); x.land('sunder', x.target, { s: 1 }); x.land('shatter', x.target, { s: 1 }); x.land('x_pierce_earth', x.target, { s: 0.7 });
      decal(w, 'crack', g, { color: 0x1a0c06, size: 1.3, to: 2, ms: 2200, hold: 0.78, opacity: 0.9 }); decal(w, 'shock', g, { color: 0xffc070, size: 0.6, to: 3.2, ms: 380, opacity: 0.85, add: true });
      for (let i = 0; i < 12; i++) bit(w, 'shard', a.clone(), { color: i % 2 ? 0xdcdad8 : 0x8a8490, size: 0.14, life: 700, vel: V(R(5), 1 + Math.random() * 3, R(3.5)), gravity: 10, spin: R(12), add: false });
      rocks(w, g, 0xff8a2a, 6); w.shake(0.48, 340); w.flashCells(x.cells, 0xff7a2a, 400); scar(w, 'af_earth', g, 0.8); await beat(240);
    },
  };

  // what each staging plays, for loading before a fight
  const SHEETS = {
    lk_thrust: ['thrust', 'x_ring_steel'], lk_spur: ['thrust', 'b_streaks_fire'], lk_impale: ['thrust', 'x_claw_blood'], lk_banner: [], lk_sweep: ['slash'], lk_trample: ['hit_blunt'], lk_brace: [],
    lk_skewer: ['thrust', 'x_bloom_steel'], lk_momentum: [], lk_line: ['w_tower_steel', 'st_fortify'],
    pa_blade: ['slash', 'x_shards_fire'], pa_faith: [], pa_consecrate: ['hit_holy', 'x_crescent_holy'], pa_hands: ['heal'], pa_oath: [], pa_bond: ['w_plates_holy'], pa_dawn: ['smash', 'x_nova_holy'],
    pa_ground: ['w_runes_earth', 'regen'], pa_aura: [], pa_divine: [],
    so_lash: ['hit_fire', 'x_spiral_blood'], so_rime: ['icelance', 'hit_ice'], so_steam: ['hit_fire', 'x_eye_fire'], so_ward: [], so_embers: [], so_firestorm: ['blast', 'hit_fire', 'x_ring_fire'],
    so_glacier: ['hit_ice', 'x_cross_ice'], so_attune: [], so_inferno: ['blast', 'hit_fire', 'x_bloom_fire', 'af_fire', 'af_fire_g'], so_zero: ['frostnova', 'freeze', 'x_ring_ice', 'af_ice', 'af_ice_g'],
    wl_hex: ['orb_shadow', 'hit_shadow', 'curse'], wl_siphon: ['hit_shadow'], wl_pact: [], wl_wither: ['curse', 'x_claw_shadow'], wl_grasp: ['x_bloom_arcane'], wl_agony: ['hit_shadow', 'x_rune_shadow'],
    wl_spread: ['curse', 'x_cross_arcane'], wl_ritual: [], wl_leech: ['darkblast', 'hit_shadow', 'x_bubbles_shadow'], wl_chains: ['snare', 'hit_shadow', 'darkblast', 'af_shadow', 'af_shadow_g'],
    mk_spot: ['mark', 'x_crack_smoke'], mo_dragon: ['hit_blunt', 'x_bubbles_holy', 'af_holy', 'af_holy_g'],
    mk_steady: ['arrow','hit_spark', 'x_cross_blood'], mk_ricochet: ['arrow', 'hit_spark', 'x_ring_smoke'], mk_reposition: [], mk_cripple: ['arrow', 'x_claw_steel', 'snare'],
    mk_pierce: ['arrow', 'hit_wind', 'x_spiral_wind'], mk_deadeye: [], mk_kill: ['u_reticle', 'arrow', 'hit_crit', 'x_bloom_blood'], mk_suppress: ['arrow', 'hit_spark', 'x_shards_steel'], mk_barrage: ['arrow', 'hit_spark', 'x_fang_blood'],
    rg_hawk: ['orb_wind', 'portal'], rg_barbed: ['arrow', 'hit_spark', 'x_splat_blood'], rg_beartrap: ['hit_blunt', 'x_star_steel'], rg_thorn: ['arrow', 'hit_poison'], rg_fleet: [], rg_net: ['snare'],
    rg_pack: ['claw'], rg_spikes: ['hit_poison', 'x_eye_poison'], rg_wildhunt: ['arrow', 'orb_wind', 'claw', 'hit_wind', 'x_splat_wind', 'mark'], rg_snarefield: ['snare', 'hit_poison', 'af_poison', 'af_poison_g'],
    rp_sweep: ['reap', 'hit_shadow'], rp_harvest: ['reap', 'x_rune_blood'], rp_gravestep: ['reap', 'hit_shadow'], rp_tithe: ['reap'], rp_omen: ['mark', 'x_fang_arcane'], rp_reap: ['reap', 'hit_shadow', 'x_eye_shadow'],
    rp_wail: ['spin', 'reap', 'x_nova_arcane'], rp_shroud: ['b_motes_arcane'], rp_gravecall: ['claw', 'x_crack_shadow'], rp_rites: ['reap', 'hit_crit', 'x_shards_arcane', 'af_shadow', 'af_shadow_g'],
    vm_dart: ['flurry', 'x_star_poison'], vm_cloud: ['hit_poison'], vm_corrode: ['flurry', 'hit_poison', 'x_splat_leaf'], vm_stalk: [], vm_virulence: ['hit_poison'], vm_mithridate: [],
    vm_blight: ['ambush', 'hit_poison', 'x_spiral_poison'], vm_paralytic: ['thrust', 'hit_poison', 'x_pierce_leaf'], vm_fester: ['hit_poison', 'x_fang_poison'], vm_blood: [],
    vm_pandemic: ['spores', 'x_claw_poison', 'af_poison', 'af_poison_g'],
    bi_heal: ['heal'], bi_word: ['orb_holy', 'hit_holy', 'x_spiral_fire'], bi_ward: [], bi_bene: [], bi_absolve: [], bi_mending: ['b_petals_fire', 'heal'], bi_censure: ['hit_holy', 'x_bloom_holy'],
    bi_sanctify: ['w_runes_holy'], bi_massres: ['b_spiral_holy', 'heal', 'revive'], bi_intervene: [],
    mo_palm: ['hit_blunt', 'x_crack_fire'], mo_flurry: ['hit_blunt', 'x_bubbles_smoke'], mo_center: [], mo_kick: ['hit_blunt'], mo_flow: [], mo_chi: ['hit_holy', 'x_star_fire'], mo_ironbody: [],
    mo_pressure: ['x_crescent_steel', 'hit_crit'], mo_innerfire: [],
    en_cannon: ['build'], en_rivet: ['hit_spark', 'x_bubbles_steel'], en_patch: ['heal'], en_smoke: ['x_cross_smoke'], en_calibrate: [], en_pylon: ['build'], en_grenade: ['blast', 'hit_fire', 'x_eye_blood'],
    en_tesla: ['zap'], en_plate: [], en_mech: ['build'],
    fm_molten: ['smash', 'hit_fire', 'x_nova_fire'], fm_guard: [], fm_heat: [], fm_crush: ['smash', 'shatter'], fm_slag: ['fireball', 'hit_fire', 'x_nova_blood'], fm_seismic: ['smash', 'hit_earth', 'x_rune_earth'],
    fm_quench: [], fm_tempered: [], fm_bellows: ['hit_fire'], fm_shatter: ['smash', 'sunder', 'shatter', 'x_pierce_earth', 'af_earth', 'af_earth_g'],
  };
  return { JOB, SHEETS };
}
