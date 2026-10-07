/** Üretilmiş ses: kopuz esintili pentatonik ezgi, davul, höömey benzeri bordo, efekt sesleri. Dış dosya yok. */
export class Audio {
  ctx: AudioContext | null = null; master!: GainNode; analyser: AnalyserNode | null = null; sfxBus!: GainNode; musicBus!: GainNode; muted = false; started = false; vol = 0.6;
  private step = 0; private nextT = 0; tension = 0;
  constructor() { try { this.muted = localStorage.getItem('kut.mute') === '1'; } catch { /* */ } }
  start() {
    if (this.started) { if (this.ctx?.state === 'suspended') void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : this.vol; this.master.connect(c.destination);
    this.analyser = c.createAnalyser(); this.analyser.fftSize = 1024; this.master.connect(this.analyser);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.34; this.musicBus.connect(this.master);
    this.started = true; this.nextT = c.currentTime + 0.2; this.drone(); if (c.state === 'suspended') void c.resume();
    window.setInterval(() => this.sched(), 120);
  }
  /** Tanılama: ana çıkıştaki ses enerjisi (0 = sessiz) */
  level(): number { if (!this.analyser) return 0; const d = new Uint8Array(this.analyser.fftSize); this.analyser.getByteTimeDomainData(d); let s = 0; for (const v of d) s += Math.abs(v - 128); return s / d.length; }
  setMuted(m: boolean) { this.muted = m; try { localStorage.setItem('kut.mute', m ? '1' : '0'); } catch { /* */ } if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.vol, this.ctx.currentTime, 0.05); }
  private noise(dur: number) { const c = this.ctx!; const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; return s; }
  private drone() {
    const c = this.ctx!; const g = c.createGain(); g.gain.value = 0.05; g.connect(this.musicBus);
    for (const [f, d] of [[73.4, 0], [73.4, 6], [110, -4]] as const) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; o.connect(lp); lp.connect(g); o.start(); }
    // höömey benzeri: formant süzgeçli yükselen bordo
    const th = c.createOscillator(); th.type = 'sawtooth'; th.frequency.value = 146.8; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 9; bp.frequency.value = 900;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.11; const lg = c.createGain(); lg.gain.value = 520; lfo.connect(lg); lg.connect(bp.frequency);
    const tg = c.createGain(); tg.gain.value = 0.035; th.connect(bp); bp.connect(tg); tg.connect(this.musicBus); th.start(); lfo.start();
  }
  private pluck(f: number, t: number, v = 0.5) {
    const c = this.ctx!; const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f * 1.012, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f * 2; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3600, t); lp.frequency.exponentialRampToValueAtTime(420, t + 0.5);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.28, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.1);
    const g2 = c.createGain(); g2.gain.value = 0.25; o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(this.musicBus); o.start(t); o2.start(t); o.stop(t + 1.2); o2.stop(t + 1.2);
  }
  private drum(t: number, v: number, high = false) {
    const c = this.ctx!; const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(high ? 190 : 120, t); o.frequency.exponentialRampToValueAtTime(high ? 90 : 48, t + 0.18);
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.34); o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.4);
    const n = this.noise(0.08); const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 900; const ng = c.createGain(); ng.gain.setValueAtTime(v * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07); n.connect(bf); bf.connect(ng); ng.connect(this.musicBus); n.start(t);
  }
  private sched() {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') { if (this.ctx) this.nextT = Math.max(this.nextT, this.ctx.currentTime); return; }
    const sc = [146.8, 174.6, 196, 220, 261.6, 293.7, 349.2, 392]; // D minör pentatonik (iki oktav)
    const bpm = 92 + this.tension * 30; const beat = 60 / bpm / 2;
    while (this.nextT < this.ctx.currentTime + 0.4) {
      const s = this.step++; const t = this.nextT; const bar = Math.floor(s / 16) % 4;
      if (s % 8 === 0) this.drum(t, 0.55 + this.tension * 0.2); if (s % 8 === 4 + (bar % 2)) this.drum(t, 0.22, true); if (this.tension > 0.4 && s % 2 === 1) this.drum(t, 0.14, true);
      const pat = [[0, 2, 4, 2, 3, 2, 1, 2], [0, 1, 2, 4, 5, 4, 2, 1], [2, 3, 4, 6, 5, 4, 3, 2], [0, 2, 1, 0, 4, 3, 2, 0]][bar];
      if (s % 2 === 0 && (s / 2) % 8 < 8) { const n = pat[(s / 2) % 8]; if (Math.random() > 0.18) this.pluck(sc[n], t, 0.5 + (s % 8 === 0 ? 0.25 : 0)); }
      this.nextT += beat;
    }
  }
  /** Efekt sesleri */
  sfx(name: string, vol = 1) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return; const c = this.ctx; const t = c.currentTime;
    const tone = (type: OscillatorType, f0: number, f1: number, dur: number, v: number, delay = 0) => {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t + delay); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + delay + dur);
      const g = c.createGain(); g.gain.setValueAtTime(v * vol, t + delay); g.gain.exponentialRampToValueAtTime(0.0005, t + delay + dur); o.connect(g); g.connect(this.sfxBus); o.start(t + delay); o.stop(t + delay + dur + 0.02);
    };
    const burst = (dur: number, f: number, q: number, v: number, delay = 0, type: BiquadFilterType = 'bandpass') => {
      const n = this.noise(dur); const bf = c.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(v * vol, t + delay); g.gain.exponentialRampToValueAtTime(0.0005, t + delay + dur); n.connect(bf); bf.connect(g); g.connect(this.sfxBus); n.start(t + delay);
    };
    switch (name) {
      case 'swing': burst(0.16, 1800, 1.2, 0.22); tone('sawtooth', 320, 140, 0.14, 0.05); break;
      case 'hit': tone('square', 200, 60, 0.12, 0.16); burst(0.1, 1200, 0.8, 0.22); break;
      case 'crit': tone('square', 380, 90, 0.18, 0.2); burst(0.16, 2400, 0.7, 0.3); tone('triangle', 900, 1500, 0.12, 0.08, 0.03); break;
      case 'hurt': tone('sawtooth', 160, 70, 0.22, 0.2); burst(0.12, 400, 0.6, 0.2); break;
      case 'skill': tone('sawtooth', 220, 880, 0.3, 0.1); burst(0.3, 900, 0.6, 0.2); break;
      case 'quake': tone('sine', 90, 34, 0.5, 0.45); burst(0.4, 220, 0.5, 0.35); break;
      case 'roar': tone('sawtooth', 110, 70, 0.55, 0.16); tone('sawtooth', 165, 100, 0.55, 0.1); burst(0.4, 500, 0.4, 0.12); break;
      case 'shield': tone('triangle', 520, 1040, 0.35, 0.14); tone('triangle', 780, 1560, 0.35, 0.1, 0.06); break;
      case 'poison': tone('sine', 300, 120, 0.4, 0.14); burst(0.35, 2600, 2, 0.1); break;
      case 'wrath': tone('sawtooth', 70, 30, 0.9, 0.45); burst(0.7, 300, 0.3, 0.5); tone('square', 1200, 100, 0.5, 0.1, 0.05); break;
      case 'coin': tone('triangle', 1320, 1760, 0.12, 0.1); tone('triangle', 1760, 2100, 0.2, 0.08, 0.07); break;
      case 'loot': tone('triangle', 660, 990, 0.2, 0.12); tone('triangle', 990, 1320, 0.3, 0.1, 0.09); break;
      case 'rare': [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.35, 0.12, i * 0.08)); break;
      case 'levelup': [392, 494, 587, 784, 988].forEach((f, i) => tone('triangle', f, f * 1.01, 0.5, 0.14, i * 0.09)); break;
      case 'die': tone('sawtooth', 300, 40, 0.8, 0.22); break;
      case 'kill': tone('sine', 500, 900, 0.1, 0.07); break;
      case 'ui': tone('triangle', 700, 900, 0.07, 0.07); break;
      case 'upok': [523, 659, 784, 1046, 1318].forEach((f, i) => tone('triangle', f, f, 0.4, 0.13, i * 0.07)); burst(0.3, 3000, 3, 0.1, 0.1); break;
      case 'upfail': tone('sawtooth', 200, 70, 0.5, 0.2); burst(0.3, 500, 1, 0.2); break;
      case 'destroy': tone('sawtooth', 160, 30, 0.9, 0.3); burst(0.8, 800, 0.4, 0.4); break;
      case 'anvil': tone('square', 1600, 1500, 0.12, 0.1); burst(0.1, 5000, 3, 0.2); break;
      case 'rift': tone('sawtooth', 55, 40, 1.4, 0.35); tone('sine', 880, 220, 1.2, 0.1); break;
      case 'guard': tone('square', 900, 1800, 0.1, 0.08); break;
      case 'err': tone('square', 140, 120, 0.15, 0.1); break;
    }
  }
}
