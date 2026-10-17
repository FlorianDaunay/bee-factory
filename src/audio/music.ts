import { useEffect } from "react";
import { audio, midiToHz, onAudioReady } from "./context";

/**
 * Procedural adaptive music. One step sequencer plays a "mood" (tempo, chords, drum and
 * instrument patterns). Moods switch on the next bar, so changes always land on the beat:
 *  - chill: lo-fi garden groove for menus (soft keys, swing, gentle bells)
 *  - battle: driving minor groove with arpeggios
 *  - danger: faster, tenser harmony when the team is in trouble
 *  - boss: heavy drums, choir pad and a riff
 */
export type Mood = "chill" | "battle" | "danger" | "boss" | "silent";

interface MoodDef {
  bpm: number;
  swing: number;
  chords: number[][];
  kick: number[];
  snare: number[];
  hat: number[];
  hatVol: number;
  bassSteps: number[];
  bassType: OscillatorType;
  keys?: number[];
  arp?: { octave: number; every: number };
  pad?: number;
  bells?: number;
  riff?: number[];
}

const MOODS: Record<Exclude<Mood, "silent">, MoodDef> = {
  chill: {
    bpm: 78,
    swing: 0.18,
    chords: [
      [65, 69, 72, 76],
      [64, 67, 71, 74],
      [62, 65, 69, 72],
      [60, 64, 67, 71],
    ],
    kick: [0, 7, 10],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    hatVol: 0.035,
    bassSteps: [0, 8, 11],
    bassType: "sine",
    keys: [0, 6, 10],
    bells: 0.28,
  },
  battle: {
    bpm: 124,
    swing: 0,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [48, 52, 55],
      [55, 59, 62],
    ],
    kick: [0, 6, 8, 11],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    hatVol: 0.05,
    bassSteps: [0, 2, 4, 6, 8, 10, 12, 14],
    bassType: "sawtooth",
    arp: { octave: 12, every: 1 },
    pad: 0.03,
  },
  danger: {
    bpm: 140,
    swing: 0,
    chords: [
      [57, 60, 64],
      [58, 62, 65],
      [57, 60, 64],
      [56, 59, 64],
    ],
    kick: [0, 3, 6, 8, 11, 14],
    snare: [4, 12],
    hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    hatVol: 0.04,
    bassSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    bassType: "sawtooth",
    arp: { octave: 24, every: 1 },
    pad: 0.04,
  },
  boss: {
    bpm: 132,
    swing: 0,
    chords: [
      [50, 53, 57],
      [46, 50, 53],
      [43, 46, 50],
      [45, 49, 52],
    ],
    kick: [0, 2, 4, 6, 8, 10, 11, 12, 14],
    snare: [4, 12, 15],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    hatVol: 0.05,
    bassSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    bassType: "square",
    pad: 0.07,
    riff: [74, -1, 77, -1, 76, 74, 72, -1, 74, -1, 69, -1, 70, -1, 72, 73],
  },
};

class MusicEngine {
  private mood: Mood = "silent";
  private pending: Mood | null = null;
  private step = 0;
  private bar = 0;
  private nextTime = 0;
  private timer: number | null = null;

  setMood(mood: Mood) {
    if (mood === this.mood && !this.pending) return;
    if (this.mood === "silent" || mood === "silent") {
      this.mood = mood;
      this.pending = null;
      this.step = 0;
      this.bar = 0;
      const a = audio();
      if (a) this.nextTime = a.ctx.currentTime + 0.05;
      this.ensureRunning();
      return;
    }
    this.pending = mood;
  }

  private ensureRunning() {
    if (this.timer !== null) return;
    onAudioReady(() => {
      const a = audio();
      if (!a || this.timer !== null) return;
      this.nextTime = a.ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.tick(), 25);
    });
  }

  private tick() {
    const a = audio();
    if (!a || this.mood === "silent") return;
    while (this.nextTime < a.ctx.currentTime + 0.12) {
      if (this.step === 0 && this.pending) {
        this.mood = this.pending;
        this.pending = null;
        if (this.mood === "silent") return;
      }
      const def = MOODS[this.mood as Exclude<Mood, "silent">];
      this.playStep(def, this.step, this.nextTime);
      const sixteenth = 60 / def.bpm / 4;
      const swing = this.step % 2 === 0 ? 1 + def.swing : 1 - def.swing;
      this.nextTime += sixteenth * swing;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar++;
    }
  }

  private playStep(def: MoodDef, step: number, t: number) {
    const chord = def.chords[this.bar % def.chords.length];
    const beat = 60 / def.bpm;
    if (def.kick.includes(step)) this.kick(t, this.mood === "chill" ? 0.35 : 0.7);
    if (def.snare.includes(step)) this.snare(t, this.mood === "chill" ? 0.12 : 0.3);
    if (def.hat.includes(step)) this.hat(t, def.hatVol * (step % 4 === 2 ? 1.4 : 1));
    if (def.bassSteps.includes(step)) this.bass(t, chord[0] - 24, def.bassType, beat * (this.mood === "chill" ? 1.5 : 0.24));
    if (def.keys?.includes(step)) for (const n of chord) this.keys(t, n, beat * 2.2);
    if (def.pad && step === 0) for (const n of chord) this.pad(t, n, beat * 4, def.pad);
    if (def.arp && step % def.arp.every === 0) {
      const n = chord[step % chord.length] + def.arp.octave - (step % 8 >= 4 ? 0 : 12);
      this.pluck(t, n, beat * 0.22, this.mood === "danger" ? 0.05 : 0.045);
    }
    if (def.bells && step % 2 === 0) {
      // Deterministic "random" melody so a bar sounds like a phrase, not noise.
      const r = Math.abs(Math.sin((this.bar * 16 + step) * 12.9898) * 43758.5453) % 1;
      if (r < def.bells) {
        const scale = [72, 74, 76, 79, 81, 84];
        this.bell(t, scale[Math.floor(r * 100) % scale.length], beat * 1.5);
      }
    }
    if (def.riff && this.bar % 2 === 0) {
      const n = def.riff[step];
      if (n > 0) this.lead(t, n + (chord[0] - 50), beat * 0.45);
    }
  }

  /* ------------------------------------------------------------ instruments */
  private env(g: GainNode, t: number, peak: number, attack: number, dur: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, peak: number, attack = 0.005, filter?: number, detune = 0) {
    const a = audio()!;
    const o = a.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = a.ctx.createGain();
    this.env(g, t, peak, attack, dur);
    let node: AudioNode = o;
    if (filter) {
      const f = a.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filter;
      node = node.connect(f);
    }
    node.connect(g).connect(a.music);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number, vol: number) {
    const a = audio()!;
    const o = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, vol, 0.003, 0.3);
    o.connect(g).connect(a.music);
    o.start(t);
    o.stop(t + 0.35);
  }

  private noise(t: number, dur: number, vol: number, type: BiquadFilterType, freq: number) {
    const a = audio()!;
    const src = a.ctx.createBufferSource();
    src.buffer = a.noise;
    const f = a.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = a.ctx.createGain();
    this.env(g, t, vol, 0.002, dur);
    src.connect(f).connect(g).connect(a.music);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  private snare(t: number, vol: number) {
    this.noise(t, 0.16, vol, "bandpass", 1800);
    this.osc("triangle", 190, t, 0.1, vol * 0.5);
  }

  private hat(t: number, vol: number) {
    this.noise(t, 0.04, vol, "highpass", 7000);
  }

  private bass(t: number, midi: number, type: OscillatorType, dur: number) {
    this.osc(type, midiToHz(midi), t, dur, type === "sine" ? 0.28 : 0.12, 0.005, type === "sine" ? undefined : 600);
  }

  private keys(t: number, midi: number, dur: number) {
    this.osc("sine", midiToHz(midi), t, dur, 0.05, 0.02);
    this.osc("triangle", midiToHz(midi), t, dur * 0.5, 0.025, 0.01, 1500);
  }

  private pad(t: number, midi: number, dur: number, vol: number) {
    this.osc("sawtooth", midiToHz(midi), t, dur, vol, dur * 0.25, 1400, -8);
    this.osc("sawtooth", midiToHz(midi), t, dur, vol, dur * 0.25, 1400, 8);
  }

  private pluck(t: number, midi: number, dur: number, vol: number) {
    this.osc("square", midiToHz(midi), t, dur, vol, 0.003, 2400);
  }

  private bell(t: number, midi: number, dur: number) {
    this.osc("sine", midiToHz(midi), t, dur, 0.06, 0.003);
    this.osc("sine", midiToHz(midi + 12), t, dur * 0.4, 0.015, 0.003);
  }

  private lead(t: number, midi: number, dur: number) {
    this.osc("sawtooth", midiToHz(midi), t, dur, 0.06, 0.01, 2600);
    this.osc("square", midiToHz(midi - 12), t, dur, 0.03, 0.01, 1200);
  }
}

export const music = new MusicEngine();

/** Declares the mood a screen wants; the engine switches on the next bar. */
export function useMusic(mood: Mood) {
  useEffect(() => {
    music.setMood(mood);
  }, [mood]);
}
