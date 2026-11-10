// Procedural audio: every sound effect and music track is synthesized with WebAudio.

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null; this.sfxGain = null; this.musicGain = null;
    this.musicVol = 0.45; this.sfxVol = 0.7;
    this.track = null; this.trackTimer = null; this.trackName = null;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.8;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp); comp.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxVol; this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVol; this.musicGain.connect(this.master);
    // shared reverb
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.4, 2.5);
    this.revGain = this.ctx.createGain(); this.revGain.gain.value = 0.35;
    this.reverb.connect(this.revGain); this.revGain.connect(this.master);
    this.noiseBuf = this._noise(1.5);
    if (this.pendingTrack) { const t = this.pendingTrack; this.pendingTrack = null; this.music(t); }
  }

  setVolumes(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    if (this.musicGain) this.musicGain.gain.value = music;
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
  }

  _impulse(dur, decay) {
    const rate = this.ctx.sampleRate, len = rate * dur;
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  _noise(dur) {
    const len = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  tone({ freq = 440, to = null, type = 'sine', dur = 0.2, vol = 0.3, attack = 0.005, delay = 0, rev = 0.2, out = null, detune = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(out || this.sfxGain);
    if (rev) { const r = this.ctx.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.reverb); }
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.3, filter = 'bandpass', freq = 1200, to = null, q = 1, delay = 0, rev = 0.1 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = filter; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain);
    if (rev) { const r = this.ctx.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.reverb); }
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
  }

  sfx(name) {
    if (!this.ctx) return;
    const S = SFX[name];
    if (S) S(this);
  }

  // ---------- composed music ----------
  // A 16th-note sequencer. Each track is a short loop of bars; every bar has a chord and an
  // eighth-note melody line. Layers: lead melody, bass line, chord comping, sustained pad, drums.
  music(name) {
    if (!this.ctx) { this.pendingTrack = name; return; }
    if (this.trackName === name) return;
    this.stopMusic();
    this.trackName = name;
    const def = TRACKS[name];
    if (!def) return;
    const bus = this.ctx.createGain(); bus.gain.value = 0.0001; bus.connect(this.musicGain);
    const rv = this.ctx.createGain(); rv.gain.value = def.reverb ?? 0.45; bus.connect(rv); rv.connect(this.reverb);
    bus.gain.exponentialRampToValueAtTime(def.gain ?? 1, this.ctx.currentTime + 1.8);
    const bars = def.bars.map((b) => ({ chord: b[0], mel: b[1] ? b[1].trim().split(/\s+/) : [] }));
    this.track = { bus, step: 0, def, bars };
    const s16 = 60 / def.bpm / 4;
    let next = this.ctx.currentTime + 0.12;
    const tick = () => {
      if (!this.track || this.track.bus !== bus) return;
      while (next < this.ctx.currentTime + 0.5) {
        this._playStep(this.track, next, s16);
        this.track.step++;
        next += s16;
      }
      this.trackTimer = setTimeout(tick, 120);
    };
    tick();
  }

  _playStep(track, t, s16) {
    const { def, step, bus, bars } = track;
    const barNo = Math.floor(step / 16); const loop = Math.floor(barNo / bars.length);
    const bar = bars[barNo % bars.length]; const pos = step % 16; const chord = bar.chord;
    const hz = (semi) => def.root * Math.pow(2, semi / 12);
    // melody: one token per eighth note — number = semitone, '-' = hold, '.' = rest
    const leadOn = !(def.restEvery && loop % def.restEvery === def.restEvery - 1);
    if (pos % 2 === 0 && bar.mel.length) {
      const i = pos / 2; const tok = bar.mel[i];
      if (tok && tok !== '-' && tok !== '.') {
        let len = 1; while (bar.mel[i + len] === '-') len++;
        const f = hz(+tok + (def.melOct ?? 12));
        if (leadOn) this.voice(def.lead, f, t, len * s16 * 2 * 0.94, def.leadVol ?? 1, bus);
        else if (def.echo) this.voice(def.echo, f * 2, t, s16 * 3, 0.5, bus); // a soft bell echo keeps the tune present on rest loops
      }
    }
    // bass: pattern of 16 chars per bar, r = root, R = root up an octave, f = fifth, . = rest
    if (def.bass) {
      const c = def.bass.pat[pos];
      if (c && c !== '.') {
        const semi = chord[0] - 12 + (c === 'R' ? 12 : c === 'f' ? 7 : 0);
        this.voice(def.bass.inst, hz(semi), t, s16 * (def.bass.len ?? 1.8), def.bass.vol ?? 1, bus);
      }
    }
    // comping: arpeggio indexes (0-5 walk up the chord over two octaves) or 's' = strum the chord
    if (def.comp) {
      const c = def.comp.pat[pos];
      if (c === 's') chord.forEach((semi, k) => this.voice(def.comp.inst, hz(semi + 12), t + k * 0.018, s16 * 3, (def.comp.vol ?? 1) * 0.8, bus));
      else if (c && c !== '.') { const k = +c; this.voice(def.comp.inst, hz(chord[k % 3] + 12 * (1 + Math.floor(k / 3))), t, s16 * 2.5, def.comp.vol ?? 1, bus); }
    }
    // pad: sustained chord held for the whole bar
    if (def.pad && pos === 0) chord.forEach((semi, k) => this.voice(def.pad, hz(semi), t, s16 * 16.5, 1, bus, k));
    // drums: one 16-char lane per drum
    if (def.drums) for (const [d, pat] of Object.entries(def.drums)) {
      const c = pat[pos]; if (c && c !== '.') this.drum(d, t, c === 'X' ? 1.4 : 1, bus);
    }
    if (def.crash && pos === 0 && barNo % bars.length === 0 && barNo > 0) this.drum('crash', t, 1, bus);
  }

  // one musical note on an instrument; t is absolute AudioContext time
  voice(inst, f, t, dur, vel, out, k = 0) {
    const ac = this.ctx; const end = t + dur;
    const env = (g, peak, a, rel = 0.08) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, Math.max(t + a, end - rel)); g.gain.exponentialRampToValueAtTime(0.0001, end + rel); };
    const osc = (type, freq, det = 0) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det; return o; };
    const vib = (o, rate, cents, after) => { const l = ac.createOscillator(); const d = ac.createGain(); l.frequency.value = rate; d.gain.setValueAtTime(0, t); d.gain.linearRampToValueAtTime(cents, t + after); l.connect(d); d.connect(o.detune); l.start(t); l.stop(end + 0.2); };
    const lp = (freq, q = 0.7) => { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = freq; f2.Q.value = q; return f2; };
    const go = (nodes, g) => { nodes.forEach((o) => { o.start(t); o.stop(end + 0.25); }); g.connect(out); };
    switch (inst) {
      case 'lead': { // bright square lead with delayed vibrato — the classic RPG melody voice
        const o = osc('square', f); const o2 = osc('sawtooth', f, 7); vib(o, 5.5, 14, 0.18); vib(o2, 5.5, 14, 0.18);
        const fl = lp(2600, 1); const g = ac.createGain(); env(g, 0.045 * vel, 0.012, 0.1);
        o.connect(fl); o2.connect(fl); fl.connect(g); go([o, o2], g); break;
      }
      case 'flute': {
        const o = osc('triangle', f); const o2 = osc('sine', f * 2); vib(o, 5, 12, 0.25);
        const g = ac.createGain(); env(g, 0.11 * vel, 0.06, 0.12); const g2 = ac.createGain(); g2.gain.value = 0.18;
        o.connect(g); o2.connect(g2); g2.connect(g); go([o, o2], g);
        const n = ac.createBufferSource(); n.buffer = this.noiseBuf; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2;
        const ng = ac.createGain(); ng.gain.setValueAtTime(0.02 * vel, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t, Math.random()); n.stop(t + 0.15); break;
      }
      case 'brass': { // two detuned saws whose filter opens on the attack
        const o = osc('sawtooth', f, -6); const o2 = osc('sawtooth', f, 6); vib(o, 5, 10, 0.25);
        const fl = lp(500, 2); fl.frequency.setValueAtTime(500, t); fl.frequency.exponentialRampToValueAtTime(3200, t + 0.07); fl.frequency.exponentialRampToValueAtTime(1500, t + 0.35);
        const g = ac.createGain(); env(g, 0.05 * vel, 0.03, 0.09); o.connect(fl); o2.connect(fl); fl.connect(g); go([o, o2], g); break;
      }
      case 'pluck': case 'harp': { // short decaying string
        const o = osc('triangle', f); const o2 = osc(inst === 'harp' ? 'sine' : 'square', f * 2);
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((inst === 'harp' ? 0.07 : 0.045) * vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(1.2, dur + 0.5));
        const g2 = ac.createGain(); g2.gain.value = inst === 'harp' ? 0.25 : 0.12; const fl = lp(inst === 'harp' ? 4000 : 2200);
        o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); o.start(t); o2.start(t); o.stop(t + 1.3); o2.stop(t + 1.3); g.connect(out); break;
      }
      case 'bell': {
        [[1, 0.06], [2.76, 0.02], [5.4, 0.01]].forEach(([m, v]) => { const o = osc('sine', f * m); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 / m + 0.3); o.connect(g); g.connect(out); o.start(t); o.stop(t + 2); });
        break;
      }
      case 'strings': case 'choir': { // slow-attack ensemble pad; choir adds vowel-like formants
        const g = ac.createGain(); env(g, (inst === 'choir' ? 0.022 : 0.018) * vel, 0.35, 0.5);
        const sum = ac.createGain();
        [-9, 0, 8].forEach((d) => { const o = osc('sawtooth', f, d + (k - 1) * 3); o.connect(sum); o.start(t); o.stop(end + 0.6); });
        if (inst === 'choir') { [700, 1150].forEach((fq) => { const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 4; sum.connect(bp); bp.connect(g); }); }
        else { const fl = lp(1700); sum.connect(fl); fl.connect(g); }
        g.connect(out); break;
      }
      case 'bass': {
        const o = osc('sawtooth', f); const o2 = osc('sine', f / 2); const fl = lp(420, 3); fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(280, t + 0.18);
        const g = ac.createGain(); env(g, 0.11 * vel, 0.006, 0.05); const g2 = ac.createGain(); g2.gain.value = 0.6;
        o.connect(fl); fl.connect(g); o2.connect(g2); g2.connect(g); go([o, o2], g); break;
      }
      case 'softbass': {
        const o = osc('triangle', f); const g = ac.createGain(); env(g, 0.13 * vel, 0.02, 0.15); o.connect(g); go([o], g); break;
      }
      default: break;
    }
  }

  drum(kind, t, vel, out) {
    const ac = this.ctx;
    const nz = (dur, type, freq, vol, q = 0.7) => { const s = ac.createBufferSource(); s.buffer = this.noiseBuf; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ac.createGain(); g.gain.setValueAtTime(vol * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.02); };
    const tn = (f0, f1, dur, vol, type = 'sine') => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
      const g = ac.createGain(); g.gain.setValueAtTime(vol * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02); };
    switch (kind) {
      case 'k': tn(140, 42, 0.28, 0.32); nz(0.02, 'lowpass', 3000, 0.05); break;
      case 's': nz(0.16, 'highpass', 1400, 0.11); tn(220, 160, 0.08, 0.07, 'triangle'); break;
      case 'h': nz(0.035, 'highpass', 7500, 0.035); break;
      case 'o': nz(0.22, 'highpass', 6500, 0.03); break;
      case 't': tn(95, 68, 0.9, 0.3); nz(0.25, 'lowpass', 400, 0.06); break; // timpani
      case 'm': tn(160, 90, 0.3, 0.16); break; // tom
      case 'crash': nz(1.4, 'highpass', 4500, 0.05); break;
      default: break;
    }
  }
  noiseOn(out, delay, dur, vol, freq) {
    const t0 = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t0, Math.random()); s.stop(t0 + dur + 0.02);
  }

  stopMusic() {
    if (this.track) {
      const bus = this.track.bus;
      try { bus.gain.cancelScheduledValues(this.ctx.currentTime); bus.gain.setValueAtTime(bus.gain.value, this.ctx.currentTime); bus.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2); } catch (e) { /* ignore */ }
      setTimeout(() => bus.disconnect(), 1500);
    }
    clearTimeout(this.trackTimer);
    this.track = null; this.trackName = null;
  }
}

const SFX = {
  click: (a) => { a.tone({ freq: 900, to: 600, type: 'triangle', dur: 0.06, vol: 0.12, rev: 0.05 }); },
  hover: (a) => { a.tone({ freq: 1400, type: 'sine', dur: 0.04, vol: 0.04, rev: 0 }); },
  open: (a) => { a.noise({ dur: 0.25, vol: 0.12, freq: 600, to: 2400, q: 2 }); a.tone({ freq: 520, to: 780, type: 'triangle', dur: 0.2, vol: 0.08 }); },
  close: (a) => { a.noise({ dur: 0.2, vol: 0.1, freq: 2000, to: 500, q: 2 }); },
  draw: (a) => { a.noise({ dur: 0.18, vol: 0.18, freq: 3000, to: 1200, q: 0.8, rev: 0 }); },
  place: (a) => { a.tone({ freq: 220, to: 160, type: 'triangle', dur: 0.12, vol: 0.2 }); a.noise({ dur: 0.08, vol: 0.12, freq: 900, q: 1 }); },
  step: (a) => { a.noise({ dur: 0.07, vol: 0.08, freq: 400 + Math.random() * 200, q: 2, rev: 0 }); },
  slash: (a) => { a.noise({ dur: 0.22, vol: 0.35, freq: 4000, to: 800, q: 1.5 }); },
  hit: (a) => { a.tone({ freq: 160, to: 60, type: 'square', dur: 0.15, vol: 0.18, rev: 0.05 }); a.noise({ dur: 0.15, vol: 0.3, freq: 1200, to: 300, q: 1 }); },
  crit: (a) => { a.tone({ freq: 1200, to: 300, type: 'sawtooth', dur: 0.25, vol: 0.15 }); a.noise({ dur: 0.35, vol: 0.4, freq: 2500, to: 200, q: 1 }); a.tone({ freq: 90, to: 40, type: 'sine', dur: 0.4, vol: 0.35 }); },
  block: (a) => { a.tone({ freq: 700, type: 'square', dur: 0.12, vol: 0.12 }); a.tone({ freq: 1050, type: 'triangle', dur: 0.3, vol: 0.1, delay: 0.02 }); },
  miss: (a) => { a.noise({ dur: 0.2, vol: 0.15, freq: 2500, to: 5000, q: 3 }); },
  arrow: (a) => { a.noise({ dur: 0.3, vol: 0.2, freq: 3000, to: 6000, q: 5 }); a.tone({ freq: 300, to: 200, type: 'triangle', dur: 0.08, vol: 0.1 }); },
  fire: (a) => { a.noise({ dur: 0.6, vol: 0.35, filter: 'lowpass', freq: 3000, to: 200, q: 0.7 }); a.tone({ freq: 200, to: 80, type: 'sawtooth', dur: 0.4, vol: 0.08 }); },
  ice: (a) => { [1800, 2400, 3100].forEach((f, i) => a.tone({ freq: f, type: 'sine', dur: 0.4, vol: 0.07, delay: i * 0.05, rev: 0.6 })); a.noise({ dur: 0.25, vol: 0.15, freq: 6000, q: 2 }); },
  wind: (a) => { a.noise({ dur: 0.5, vol: 0.25, freq: 800, to: 3000, q: 4 }); },
  earth: (a) => { a.tone({ freq: 70, to: 35, type: 'sine', dur: 0.6, vol: 0.45 }); a.noise({ dur: 0.5, vol: 0.35, filter: 'lowpass', freq: 600, to: 100 }); },
  holy: (a) => { [0, 4, 7, 12].forEach((s, i) => a.tone({ freq: 523 * Math.pow(2, s / 12), type: 'sine', dur: 0.9, vol: 0.07, delay: i * 0.06, rev: 0.8 })); },
  shadow: (a) => { a.tone({ freq: 110, to: 55, type: 'sawtooth', dur: 0.6, vol: 0.12 }); a.noise({ dur: 0.6, vol: 0.2, freq: 400, to: 150, q: 3 }); },
  poison: (a) => { for (let i = 0; i < 4; i++) a.tone({ freq: 300 + Math.random() * 300, to: 150, type: 'sine', dur: 0.12, vol: 0.08, delay: i * 0.07 }); },
  heal: (a) => { [0, 4, 7, 11, 14].forEach((s, i) => a.tone({ freq: 660 * Math.pow(2, s / 12), type: 'sine', dur: 0.5, vol: 0.06, delay: i * 0.05, rev: 0.7 })); },
  buff: (a) => { a.tone({ freq: 330, to: 660, type: 'triangle', dur: 0.35, vol: 0.12, rev: 0.4 }); a.tone({ freq: 495, to: 990, type: 'sine', dur: 0.35, vol: 0.08, delay: 0.05, rev: 0.4 }); },
  magic: (a) => { a.tone({ freq: 600, to: 1500, type: 'sine', dur: 0.3, vol: 0.1, rev: 0.6 }); a.tone({ freq: 900, to: 2200, type: 'triangle', dur: 0.25, vol: 0.06, delay: 0.04 }); },
  explosion: (a) => { a.noise({ dur: 0.9, vol: 0.55, filter: 'lowpass', freq: 2000, to: 80, q: 0.5 }); a.tone({ freq: 80, to: 30, type: 'sine', dur: 0.8, vol: 0.5 }); },
  death: (a) => { a.tone({ freq: 300, to: 60, type: 'sawtooth', dur: 0.7, vol: 0.12 }); a.noise({ dur: 0.6, vol: 0.18, freq: 800, to: 100 }); },
  roar: (a) => { a.tone({ freq: 90, to: 60, type: 'sawtooth', dur: 1.3, vol: 0.25, attack: 0.15 }); a.tone({ freq: 135, to: 80, type: 'square', dur: 1.2, vol: 0.08, attack: 0.2 }); a.noise({ dur: 1.3, vol: 0.3, filter: 'lowpass', freq: 900, to: 200 }); },
  coin: (a) => { a.tone({ freq: 1320, type: 'square', dur: 0.08, vol: 0.06 }); a.tone({ freq: 1760, type: 'square', dur: 0.2, vol: 0.06, delay: 0.07 }); },
  levelup: (a) => { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => a.tone({ freq: 392 * Math.pow(2, s / 12), type: 'triangle', dur: 0.4, vol: 0.1, delay: i * 0.07, rev: 0.6 })); },
  victory: (a) => { [[0, 0], [4, 0.15], [7, 0.3], [12, 0.45], [7, 0.75], [12, 0.9]].forEach(([s, d]) => a.tone({ freq: 392 * Math.pow(2, s / 12), type: 'square', dur: 0.35, vol: 0.06, delay: d, rev: 0.4 })); [0, 4, 7].forEach((s) => a.tone({ freq: 196 * Math.pow(2, s / 12), type: 'triangle', dur: 1.6, vol: 0.08, delay: 0.9, rev: 0.6 })); },
  defeat: (a) => { [0, -2, -5, -9].forEach((s, i) => a.tone({ freq: 330 * Math.pow(2, s / 12), type: 'triangle', dur: 0.7, vol: 0.1, delay: i * 0.35, rev: 0.7 })); },
  turn: (a) => { a.tone({ freq: 523, type: 'triangle', dur: 0.15, vol: 0.08 }); a.tone({ freq: 784, type: 'triangle', dur: 0.25, vol: 0.08, delay: 0.08 }); },
  error: (a) => { a.tone({ freq: 180, type: 'square', dur: 0.12, vol: 0.08 }); a.tone({ freq: 140, type: 'square', dur: 0.15, vol: 0.08, delay: 0.1 }); },
  chest: (a) => { a.tone({ freq: 200, to: 120, type: 'square', dur: 0.15, vol: 0.08 }); [0, 7, 12, 16, 19].forEach((s, i) => a.tone({ freq: 784 * Math.pow(2, s / 12), type: 'sine', dur: 0.4, vol: 0.06, delay: 0.15 + i * 0.05, rev: 0.6 })); },
  boss: (a) => { a.tone({ freq: 55, type: 'sawtooth', dur: 2.5, vol: 0.2, attack: 0.4 }); a.tone({ freq: 58, type: 'sawtooth', dur: 2.5, vol: 0.15, attack: 0.4 }); a.noise({ dur: 2.5, vol: 0.2, filter: 'lowpass', freq: 400, q: 1 }); },
  dice: (a) => { for (let i = 0; i < 6; i++) a.noise({ dur: 0.04, vol: 0.12, freq: 2500 + Math.random() * 1500, q: 4, delay: i * 0.05 + Math.random() * 0.02, rev: 0 }); },
  portal: (a) => { a.tone({ freq: 200, to: 1600, type: 'sine', dur: 0.8, vol: 0.1, rev: 0.8 }); a.noise({ dur: 0.8, vol: 0.15, freq: 500, to: 4000, q: 6 }); },
};

// Tracks. bars: [chord (semitones from root), melody (8 eighth-note tokens: semitone | '-' hold | '.' rest)].
// All melodies are original compositions for LAST WORLD.
const TRACKS = {
  // Title — D minor, a slow heroic lament on brass over strings and harp.
  title: { bpm: 84, root: 146.83, lead: 'brass', leadVol: 0.9, pad: 'strings', restEvery: 3, echo: 'bell', crash: true,
    comp: { inst: 'harp', pat: '0.1.2.3.4.3.2.1.', vol: 0.8 },
    bass: { inst: 'softbass', pat: 'r.......f.......', len: 7 },
    drums: { t: 't...............' },
    bars: [
      [[0, 3, 7], '7 - - 10 12 - 10 7'], [[-4, 0, 3], '5 - 3 - 2 - - .'], [[3, 7, 10], '0 - 3 5 7 - 5 3'], [[-2, 2, 5], '2 - - - - - . .'],
      [[5, 8, 12], '8 - 10 12 15 - 14 12'], [[0, 3, 7], '14 - 12 10 12 - - .'], [[-4, 0, 3], '15 - 14 12 10 - 8 -'], [[7, 11, 14], '7 - - - 11 - - .'],
    ] },
  // World map — F major march: flute melody, snare rolls, walking bass.
  world: { bpm: 108, root: 174.61, lead: 'flute', pad: 'strings', restEvery: 4, echo: 'bell', crash: true,
    comp: { inst: 'pluck', pat: 's...s.s.s...s.s.', vol: 0.7 },
    bass: { inst: 'bass', pat: 'r...f...r...f.R.', vol: 0.8 },
    drums: { k: 'x.......x.......', s: '....x..x....x.xx', h: 'x.x.x.x.x.x.x.x.' },
    bars: [
      [[0, 4, 7], '0 - 4 7 12 - 11 9'], [[-5, -1, 2], '7 - - - 4 - 2 -'], [[-3, 0, 4], '9 - 7 - 5 4 2 -'], [[5, 9, 12], '5 - - - . . 7 9'],
      [[0, 4, 7], '12 - 11 12 14 - 12 9'], [[-5, -1, 2], '11 - 9 7 9 - - .'], [[5, 9, 12], '9 - 7 5 4 - 5 7'], [[-5, -1, 2], '7 - - - - - . .'],
    ] },
  // Exploration — E dorian, gentle flute and harp, light hand percussion.
  explore: { bpm: 92, root: 164.81, lead: 'flute', leadVol: 0.85, pad: 'strings', restEvery: 3, echo: 'harp',
    comp: { inst: 'harp', pat: '0..2..1.3..2..1.', vol: 0.75 },
    bass: { inst: 'softbass', pat: 'r.......r...f...', len: 5 },
    drums: { h: '..x...x...x...x.', m: 'x.........x.....' },
    bars: [
      [[0, 3, 7], '7 - - 9 10 - 9 7'], [[5, 9, 12], '9 - - - 5 - . .'], [[-4, 0, 3], '7 - 5 3 0 - 3 -'], [[-2, 2, 5], '2 - - - . . . .'],
      [[0, 3, 7], '12 - 10 - 9 - 7 -'], [[5, 9, 12], '9 - 10 9 7 - 5 -'], [[-4, 0, 3], '3 - 5 7 10 - 9 -'], [[-2, 2, 5], '7 - - - . . . .'],
    ] },
  // Battle — A minor, driving 16th-note bass, square lead, full kit.
  battle: { bpm: 150, root: 110, lead: 'lead', pad: 'strings', restEvery: 4, echo: 'bell', crash: true, reverb: 0.3,
    comp: { inst: 'pluck', pat: '..s...s...s...s.', vol: 0.6 },
    bass: { inst: 'bass', pat: 'rrRrrrRrrrRrrrRf', len: 0.9 },
    drums: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx' },
    bars: [
      [[0, 3, 7], '12 - 12 15 14 - 12 10'], [[0, 3, 7], '12 - - - 7 - 10 -'], [[-4, 0, 3], '8 - 7 8 10 - 12 -'], [[-2, 2, 5], '14 - - - 10 - 14 -'],
      [[0, 3, 7], '15 - 14 12 14 - 15 17'], [[0, 3, 7], '19 - - - 15 - 12 -'], [[-4, 0, 3], '17 - 15 14 15 - 12 -'], [[-5, -1, 2], '11 - - - 14 - 11 -'],
    ] },
  // MVP boss — C# phrygian, brass over a choir, timpani and double kick.
  boss: { bpm: 162, root: 138.59, lead: 'brass', melOct: 0, pad: 'choir', restEvery: 4, echo: 'bell', crash: true, reverb: 0.35,
    comp: { inst: 'pluck', pat: '0.0.1.0.2.0.1.0.', vol: 0.5 },
    bass: { inst: 'bass', pat: 'rrrrRrrrrrrrRrff', len: 0.9 },
    drums: { k: 'x.x...x.x.x...x.', s: '....X.......X...', h: 'x.xxx.xxx.xxx.xx', t: 'x.......x.......' },
    bars: [
      [[0, 3, 7], '12 - - 13 12 - 7 -'], [[1, 5, 8], '13 - - 12 13 - 17 -'], [[3, 7, 10], '15 - 13 12 10 - 12 -'], [[1, 5, 8], '13 - - - 6 - 7 -'],
      [[0, 3, 7], '19 - - 20 19 - 15 -'], [[1, 5, 8], '20 - 19 17 15 - 13 -'], [[3, 7, 10], '15 - 17 19 22 - 19 -'], [[1, 5, 8], '18 - - - 19 - - -'],
    ] },
};

export const audio = new AudioSystem();
