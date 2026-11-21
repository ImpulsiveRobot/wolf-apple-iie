// Apple IIe 1-Bit Speaker Audio & Lo-Fi Guard Speech Engine
// Zero external audio assets — 100% procedural Web Audio API synthesis.

export class AppleIIAudio {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.voiceEnabled = true;
    this.masterGain = null;
    this.voiceBuffers = new Map();
    this.lastStepTime = 0;
    this.lastBumpTime = 0;
    this.lastVoiceTime = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.28;
      this.masterGain.connect(this.ctx.destination);
      this._buildVoiceBank();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setSettings({ sfxEnabled, voiceEnabled }) {
    if (typeof sfxEnabled === 'boolean') this.sfxEnabled = sfxEnabled;
    if (typeof voiceEnabled === 'boolean') this.voiceEnabled = voiceEnabled;
  }

  // Low-level Apple II square-wave pulse helper
  _beep(freq, duration, volume = 0.35, startOffset = 0, type = 'square') {
    if (!this.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime + startOffset;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // Low-level 1-bit quantized noise burst
  _noise(duration, volume = 0.45, lowpassHz = 2800, startOffset = 0, downsample = 4) {
    if (!this.sfxEnabled || !this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(64, Math.floor(sampleRate * duration));
    const buf = this.ctx.createBuffer(1, length, sampleRate);
    const data = buf.getChannelData(0);
    let held = 0;
    for (let i = 0; i < length; i++) {
      if (i % downsample === 0) {
        held = Math.random() > 0.5 ? 1 : -1; // 1-bit Apple II speaker click
      }
      const env = Math.pow(1 - i / length, 1.4);
      data[i] = held * env;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpassHz;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(this.ctx.currentTime + startOffset);
  }

  playFootstep() {
    if (!this.sfxEnabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastStepTime < 165) return;
    this.lastStepTime = now;
    // Crisp Apple II single-click footstep
    this._beep(115 + Math.random() * 25, 0.022, 0.14);
  }

  playWallBump() {
    if (!this.sfxEnabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastBumpTime < 220) return;
    this.lastBumpTime = now;
    // Classic hollow low thud
    this._beep(78, 0.06, 0.25);
    this._beep(55, 0.05, 0.2, 0.03);
  }

  playGunshot(isEnemy = false) {
    if (!this.sfxEnabled || !this.ctx) return;
    this._noise(0.13, isEnemy ? 0.42 : 0.52, isEnemy ? 2200 : 3200, 0, 5);
    this._beep(isEnemy ? 210 : 280, 0.05, 0.3);
  }

  playEmptyClick() {
    if (!this.sfxEnabled || !this.ctx) return;
    this._beep(920, 0.02, 0.22);
    this._beep(640, 0.02, 0.18, 0.03);
  }

  playRicochet() {
    if (!this.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1450, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playGrenadeThrow() {
    if (!this.sfxEnabled || !this.ctx) return;
    this._beep(320, 0.04, 0.2);
    this._beep(480, 0.04, 0.18, 0.045);
  }

  playExplosion() {
    if (!this.sfxEnabled || !this.ctx) return;
    this._noise(0.55, 0.72, 1100, 0, 12);
    this._noise(0.32, 0.48, 2600, 0.02, 6);
    this._beep(62, 0.28, 0.45);
  }

  playChestTick() {
    if (!this.sfxEnabled || !this.ctx) return;
    this._beep(760 + Math.random() * 140, 0.025, 0.16);
  }

  playPickup(isPlans = false) {
    if (!this.sfxEnabled || !this.ctx) return;
    if (isPlans) {
      const notes = [440, 554, 659, 880, 659, 880];
      notes.forEach((n, i) => this._beep(n, 0.09, 0.34, i * 0.08));
    } else {
      this._beep(523, 0.055, 0.26, 0);
      this._beep(659, 0.055, 0.26, 0.055);
      this._beep(784, 0.085, 0.28, 0.11);
    }
  }

  playUnlock() {
    if (!this.sfxEnabled || !this.ctx) return;
    this._beep(392, 0.05, 0.26, 0);
    this._beep(587, 0.08, 0.28, 0.06);
  }

  playStairs(goingUp) {
    if (!this.sfxEnabled || !this.ctx) return;
    const notes = goingUp ? [220, 294, 370, 440] : [440, 370, 294, 220];
    notes.forEach((n, i) => this._beep(n, 0.05, 0.24, i * 0.055));
  }

  playPlayerHit(vestBlocked = false) {
    if (!this.sfxEnabled || !this.ctx) return;
    if (vestBlocked) {
      this.playRicochet();
      this._beep(180, 0.07, 0.3, 0.02);
    } else {
      this._noise(0.18, 0.55, 1600, 0, 8);
      this._beep(150, 0.12, 0.38, 0);
      this._beep(95, 0.15, 0.35, 0.08);
    }
  }

  playAlarm() {
    if (!this.sfxEnabled || !this.ctx) return;
    for (let i = 0; i < 3; i++) {
      this._beep(660, 0.12, 0.28, i * 0.24);
      this._beep(490, 0.12, 0.28, i * 0.24 + 0.12);
    }
  }

  playDeath() {
    if (!this.sfxEnabled || !this.ctx) return;
    const notes = [330, 294, 262, 220, 175, 131];
    notes.forEach((n, i) => this._beep(n, 0.11, 0.35, i * 0.1));
  }

  playVictory() {
    if (!this.sfxEnabled || !this.ctx) return;
    const notes = [392, 523, 659, 784, 659, 784, 1046];
    const times = [0, 0.1, 0.2, 0.3, 0.44, 0.54, 0.66];
    notes.forEach((n, i) => this._beep(n, i === notes.length - 1 ? 0.35 : 0.1, 0.35, times[i]));
  }

  // ------------------------------------------------------------------
  // Authentic Apple II 1-Bit Formant Guard Speech ("HALT!", "SS!", etc.)
  // Synthesizes vowel formants + fricatives/plosives and quantizes to
  // crunchy 6 kHz 1.5-bit Apple II speaker pulse audio!
  // ------------------------------------------------------------------
  _buildVoiceBank() {
    // Each phoneme: { dur (s), type: 'v'|'f'|'p'|'s', f0, f1, f2, f3, amp }
    // v = voiced vowel/consonant, f = fricative noise, p = plosive burst, s = silence
    const words = {
      HALT: [
        { dur: 0.065, type: 'f', f1: 1200, f2: 2400, amp: 0.75 },           // H
        { dur: 0.16, type: 'v', f0: 118, f1: 720, f2: 1120, f3: 2450, amp: 1.0 }, // AA
        { dur: 0.085, type: 'v', f0: 112, f1: 360, f2: 1050, f3: 2500, amp: 0.72 }, // L
        { dur: 0.035, type: 's', amp: 0 },
        { dur: 0.055, type: 'p', f1: 2800, f2: 4200, amp: 0.95 },           // T
      ],
      ACHTUNG: [
        { dur: 0.11, type: 'v', f0: 124, f1: 740, f2: 1180, f3: 2500, amp: 1.0 }, // AA
        { dur: 0.085, type: 'f', f1: 1450, f2: 2600, amp: 0.85 },           // KH
        { dur: 0.03, type: 's', amp: 0 },
        { dur: 0.045, type: 'p', f1: 2600, f2: 4000, amp: 0.9 },            // T
        { dur: 0.13, type: 'v', f0: 112, f1: 350, f2: 800, f3: 2250, amp: 0.95 }, // UH
        { dur: 0.12, type: 'v', f0: 104, f1: 270, f2: 1150, f3: 2100, amp: 0.75 }, // NG
      ],
      SS: [
        { dur: 0.075, type: 'v', f0: 132, f1: 540, f2: 1850, f3: 2500, amp: 0.9 }, // EH
        { dur: 0.145, type: 'f', f1: 3600, f2: 5200, amp: 1.0 },            // S
        { dur: 0.04, type: 's', amp: 0 },
        { dur: 0.075, type: 'v', f0: 128, f1: 540, f2: 1850, f3: 2500, amp: 0.9 }, // EH
        { dur: 0.165, type: 'f', f1: 3600, f2: 5200, amp: 1.0 },            // S
      ],
      KAPUT: [
        { dur: 0.045, type: 'p', f1: 1800, f2: 3100, amp: 0.95 },           // K
        { dur: 0.095, type: 'v', f0: 110, f1: 710, f2: 1150, f3: 2450, amp: 0.9 }, // AA
        { dur: 0.04, type: 's', amp: 0 },
        { dur: 0.045, type: 'p', f1: 1100, f2: 2200, amp: 0.9 },            // P
        { dur: 0.13, type: 'v', f0: 94, f1: 330, f2: 760, f3: 2200, amp: 0.95 },  // OO
        { dur: 0.03, type: 's', amp: 0 },
        { dur: 0.05, type: 'p', f1: 2900, f2: 4300, amp: 0.95 },            // T
      ],
      NEIN: [
        { dur: 0.07, type: 'v', f0: 125, f1: 290, f2: 1400, f3: 2200, amp: 0.72 }, // N
        { dur: 0.11, type: 'v', f0: 130, f1: 730, f2: 1220, f3: 2450, amp: 1.0 },  // AA
        { dur: 0.09, type: 'v', f0: 138, f1: 370, f2: 2150, f3: 2700, amp: 0.92 }, // EE
        { dur: 0.075, type: 'v', f0: 122, f1: 290, f2: 1400, f3: 2200, amp: 0.68 }, // N
      ],
      ALARM: [
        { dur: 0.1, type: 'v', f0: 135, f1: 730, f2: 1180, f3: 2450, amp: 0.95 },
        { dur: 0.07, type: 'v', f0: 135, f1: 370, f2: 1080, f3: 2450, amp: 0.75 },
        { dur: 0.15, type: 'v', f0: 142, f1: 720, f2: 1150, f3: 2400, amp: 1.0 },
        { dur: 0.09, type: 'v', f0: 128, f1: 320, f2: 1100, f3: 2100, amp: 0.75 },
      ],
    };

    for (const [key, phonemes] of Object.entries(words)) {
      this.voiceBuffers.set(key, this._synthAppleIIWord(phonemes));
    }
  }

  _synthAppleIIWord(phonemes) {
    const sr = 11025; // Low retro sampling rate
    const totalDur = phonemes.reduce((s, p) => s + p.dur, 0);
    const totalSamples = Math.floor(sr * totalDur);
    const buf = this.ctx.createBuffer(1, totalSamples, sr);
    const out = buf.getChannelData(0);

    // Simple 2-pole resonator helper
    const makeResonator = (freq, bw) => {
      const r = Math.exp(-Math.PI * bw / sr);
      const a1 = -2 * r * Math.cos((2 * Math.PI * freq) / sr);
      const a2 = r * r;
      const gain = (1 - r) * Math.sin((2 * Math.PI * freq) / sr);
      return { a1, a2, gain, y1: 0, y2: 0 };
    };

    const stepRes = (res, x) => {
      const y = res.gain * x - res.a1 * res.y1 - res.a2 * res.y2;
      res.y2 = res.y1;
      res.y1 = y;
      return y;
    };

    let idx = 0;
    let phase = 0;

    for (const ph of phonemes) {
      const len = Math.floor(ph.dur * sr);
      const r1 = ph.f1 ? makeResonator(ph.f1, ph.type === 'v' ? 90 : 320) : null;
      const r2 = ph.f2 ? makeResonator(ph.f2, ph.type === 'v' ? 140 : 480) : null;
      const r3 = ph.f3 ? makeResonator(ph.f3, 210) : null;

      for (let i = 0; i < len && idx < totalSamples; i++, idx++) {
        const t = i / len;
        const env = Math.sin(Math.min(1, t * 5) * (Math.PI / 2)) *
                    Math.sin(Math.min(1, (1 - t) * 5) * (Math.PI / 2));
        let sample = 0;

        if (ph.type === 'v') {
          // Glottal buzz (sawtooth + slight pitch droop)
          const f0 = ph.f0 * (1 - 0.08 * t);
          phase += f0 / sr;
          if (phase >= 1) phase -= 1;
          const glottal = (2 * phase - 1) + (Math.random() - 0.5) * 0.08;
          sample =
            (r1 ? stepRes(r1, glottal) * 1.15 : 0) +
            (r2 ? stepRes(r2, glottal) * 0.85 : 0) +
            (r3 ? stepRes(r3, glottal) * 0.45 : 0);
        } else if (ph.type === 'f' || ph.type === 'p') {
          const n = Math.random() * 2 - 1;
          const decay = ph.type === 'p' ? Math.pow(1 - t, 2.2) : 1;
          sample =
            ((r1 ? stepRes(r1, n) : 0) + (r2 ? stepRes(r2, n) : 0)) * decay;
        }

        sample *= env * (ph.amp ?? 0.8);

        // Authentic Apple II 1-bit/2-bit speaker quantization + crunch!
        const clipped = Math.max(-1, Math.min(1, sample * 4.5));
        const quant = Math.round(clipped * 2) / 2; // 5-level crunchy pulse DAC
        out[idx] = quant * 0.72;
      }
    }

    // Slight sample-and-hold decimation for authentic 5.5 kHz grit
    for (let i = 0; i < totalSamples; i += 2) {
      if (i + 1 < totalSamples) out[i + 1] = out[i];
    }

    return buf;
  }

  playVoice(word, pitchScale = 1.0) {
    if (!this.voiceEnabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastVoiceTime < 220) return;
    this.lastVoiceTime = now;

    const buf = this.voiceBuffers.get(word);
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = pitchScale * (0.94 + Math.random() * 0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1450;
    filter.Q.value = 0.7;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.88;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start();
  }
}
