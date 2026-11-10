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

  // ---------- generative music ----------
  music(name) {
    if (!this.ctx) { this.pendingTrack = name; return; }
    if (this.trackName === name) return;
    this.stopMusic();
    this.trackName = name;
    const def = TRACKS[name];
    if (!def) return;
    const bus = this.ctx.createGain(); bus.gain.value = 0.0001; bus.connect(this.musicGain);
    const rv = this.ctx.createGain(); rv.gain.value = 0.6; bus.connect(rv); rv.connect(this.reverb);
    bus.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 2.5);
    this.track = { bus, step: 0, def };
    const beat = 60 / def.bpm;
    let next = this.ctx.currentTime + 0.1;
    const tick = () => {
      if (!this.track || this.track.bus !== bus) return;
      while (next < this.ctx.currentTime + 0.6) {
        this._playStep(this.track, next, beat);
        this.track.step++;
        next += beat / 2;
      }
      this.trackTimer = setTimeout(tick, 150);
    };
    tick();
  }

  _playStep(track, t, beat) {
    const { def, step, bus } = track;
    const bar = Math.floor(step / 8) % def.chords.length;
    const chord = def.chords[bar];
    const root = def.root;
    const n = (semi) => root * Math.pow(2, semi / 12);
    const delay = Math.max(0, t - this.ctx.currentTime);
    if (step % 8 === 0) {
      // pad chord
      chord.forEach((s, i) => this.tone({ freq: n(s), type: def.pad, dur: beat * 4.2, vol: 0.05, attack: 0.6, delay, rev: 0.5, out: bus, detune: i * 4 - 4 }));
      this.tone({ freq: n(chord[0] - 12), type: 'triangle', dur: beat * 4, vol: 0.09, attack: 0.05, delay, rev: 0.1, out: bus });
    }
    if (def.arp && step % 1 === 0) {
      const pat = def.arp;
      const idx = pat[step % pat.length];
      if (idx != null) {
        const semi = chord[idx % chord.length] + 12 * (1 + Math.floor(idx / chord.length));
        this.tone({ freq: n(semi), type: def.lead || 'triangle', dur: beat * 0.9, vol: def.arpVol || 0.035, attack: 0.01, delay, rev: 0.6, out: bus });
      }
    }
    if (def.drum) {
      const d = def.drum[step % def.drum.length];
      if (d === 'k') { this.tone({ freq: 120, to: 40, type: 'sine', dur: 0.25, vol: 0.22, delay, rev: 0, out: bus }); }
      if (d === 's') { this.noiseOn(bus, delay, 0.12, 0.06, 1800); }
      if (d === 'h') { this.noiseOn(bus, delay, 0.04, 0.02, 7000); }
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
  portal: (a) => { a.tone({ freq: 200, to: 1600, type: 'sine', dur: 0.8, vol: 0.1, rev: 0.8 }); a.noise({ dur: 0.8, vol: 0.15, freq: 500, to: 4000, q: 6 }); },
};

const TRACKS = {
  title: { bpm: 64, root: 146.83, pad: 'sawtooth', lead: 'sine', chords: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]], arp: [0, 2, 1, 2, 3, 2, 1, null, 0, 2, 1, 2, 4, 2, 1, null], arpVol: 0.03 },
  world: { bpm: 76, root: 174.61, pad: 'triangle', lead: 'triangle', chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]], arp: [0, 1, 2, 3, 2, 1, null, null], arpVol: 0.03 },
  explore: { bpm: 80, root: 164.81, pad: 'triangle', lead: 'sine', chords: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [-2, 2, 5]], arp: [0, null, 2, 1, null, 2, 3, null], arpVol: 0.035 },
  battle: { bpm: 128, root: 110, pad: 'sawtooth', lead: 'square', chords: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]], arp: [0, 1, 2, 1, 3, 2, 1, 2], arpVol: 0.022, drum: ['k', 'h', 'h', 'h', 's', 'h', 'k', 'h', 'k', 'h', 'h', 'h', 's', 'h', 'h', 'h'] },
  boss: { bpm: 140, root: 98, pad: 'sawtooth', lead: 'sawtooth', chords: [[0, 3, 6], [0, 3, 7], [-1, 3, 6], [1, 4, 8]], arp: [0, 3, 1, 3, 2, 3, 1, 3], arpVol: 0.02, drum: ['k', 'h', 'k', 'h', 's', 'h', 'k', 'k', 'k', 'h', 'k', 'h', 's', 'h', 's', 's'] },
};

export const audio = new AudioSystem();
