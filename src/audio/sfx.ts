import { audio, midiToHz } from "./context";

export type SfxName =
  | "tap" | "tick" | "pop" | "wobble" | "sparkle" | "fanfare" | "coin" | "hit" | "crit" | "heal"
  | "burst" | "faint" | "enemyHit" | "wave" | "win" | "lose" | "item" | "telegraph";

function tone(type: OscillatorType, freq: number, start: number, dur: number, vol: number, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(a.sfx);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noiseBurst(start: number, dur: number, vol: number, freq: number, q = 1) {
  const a = audio();
  if (!a) return;
  const src = a.ctx.createBufferSource();
  src.buffer = a.noise;
  const f = a.ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(a.sfx);
  src.start(start, Math.random() * 0.5);
  src.stop(start + dur + 0.05);
}

/** Tiny synthesized sound effects: no files to download, always in tune with the music. */
export function sfx(name: SfxName) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + 0.005;
  switch (name) {
    case "tap":
      tone("triangle", 520, t, 0.06, 0.15, 700);
      break;
    case "tick":
      tone("sine", 1200, t, 0.05, 0.12);
      break;
    case "pop":
      tone("sine", 300, t, 0.18, 0.4, 900);
      noiseBurst(t, 0.12, 0.25, 3000);
      break;
    case "wobble":
      for (let i = 0; i < 4; i++) tone("triangle", 180 + i * 30, t + i * 0.28, 0.2, 0.15, 260 + i * 30);
      break;
    case "sparkle":
      [84, 88, 91, 96].forEach((m, i) => tone("sine", midiToHz(m), t + i * 0.05, 0.25, 0.12));
      break;
    case "fanfare":
      [72, 76, 79, 84].forEach((m, i) => tone("square", midiToHz(m), t + i * 0.1, 0.35, 0.08));
      tone("sawtooth", midiToHz(48), t + 0.4, 0.8, 0.12);
      noiseBurst(t + 0.4, 0.6, 0.2, 6000, 0.5);
      break;
    case "coin":
      tone("square", midiToHz(88), t, 0.07, 0.08);
      tone("square", midiToHz(95), t + 0.07, 0.18, 0.08);
      break;
    case "hit":
      noiseBurst(t, 0.08, 0.35, 1800, 2);
      tone("triangle", 260, t, 0.08, 0.2, 120);
      break;
    case "crit":
      noiseBurst(t, 0.15, 0.5, 2500, 1.5);
      tone("square", 500, t, 0.15, 0.15, 1400);
      break;
    case "enemyHit":
      noiseBurst(t, 0.12, 0.4, 700, 1.5);
      tone("sawtooth", 160, t, 0.12, 0.15, 70);
      break;
    case "heal":
      [79, 83, 86].forEach((m, i) => tone("sine", midiToHz(m), t + i * 0.06, 0.4, 0.12));
      break;
    case "burst":
      tone("sawtooth", 110, t, 0.5, 0.18, 880);
      noiseBurst(t + 0.1, 0.5, 0.3, 4000, 0.7);
      break;
    case "faint":
      tone("triangle", 400, t, 0.4, 0.2, 90);
      break;
    case "wave":
      [67, 72].forEach((m, i) => tone("triangle", midiToHz(m), t + i * 0.12, 0.25, 0.15));
      break;
    case "win":
      [72, 76, 79, 84, 79, 84].forEach((m, i) => tone("square", midiToHz(m), t + i * 0.11, i === 5 ? 0.7 : 0.14, 0.09));
      break;
    case "lose":
      [64, 62, 60, 55].forEach((m, i) => tone("triangle", midiToHz(m), t + i * 0.22, 0.4, 0.15));
      break;
    case "item":
      tone("sine", 600, t, 0.15, 0.2, 1200);
      break;
    case "telegraph":
      tone("sawtooth", 90, t, 0.6, 0.15, 60);
      tone("sawtooth", 95, t, 0.6, 0.12, 63);
      break;
  }
}
