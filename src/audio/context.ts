import { useSettings } from "@/store/settings";

/**
 * One shared AudioContext with a music bus and an effects bus. Browsers only allow audio after a
 * user gesture, so the context is created lazily and resumed on the first tap anywhere.
 */
let ctx: AudioContext | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
const readyListeners: (() => void)[] = [];

export function audio(): { ctx: AudioContext; music: GainNode; sfx: GainNode; noise: AudioBuffer } | null {
  if (!ctx || !musicBus || !sfxBus || !noise) return null;
  if (ctx.state !== "running") return null;
  return { ctx, music: musicBus, sfx: sfxBus, noise };
}

export function onAudioReady(fn: () => void) {
  if (audio()) fn();
  else readyListeners.push(fn);
}

function applyVolumes() {
  if (!ctx || !musicBus || !sfxBus) return;
  const s = useSettings.getState();
  const t = ctx.currentTime;
  musicBus.gain.setTargetAtTime(s.muted ? 0 : s.music * 0.6, t, 0.1);
  sfxBus.gain.setTargetAtTime(s.muted ? 0 : s.sfx * 0.8, t, 0.05);
}

function init() {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -14;
  master.ratio.value = 4;
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus.connect(master);
  sfxBus.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  applyVolumes();
  const fire = () => {
    while (readyListeners.length) readyListeners.shift()!();
  };
  if (ctx.state === "running") fire();
  else void ctx.resume().then(fire);
}

if (typeof window !== "undefined") {
  const unlock = () => init();
  window.addEventListener("pointerdown", unlock, { capture: true });
  window.addEventListener("keydown", unlock, { capture: true });
  useSettings.subscribe(applyVolumes);
  // Pause audio when the app is hidden (phone lock, tab switch).
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });
}

export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
