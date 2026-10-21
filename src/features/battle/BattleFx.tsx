import { useMemo, type CSSProperties } from "react";
import { BeeSprite } from "@/art/BeeSprite";
import { EnemySprite } from "@/art/EnemySprite";
import { GameIcon, type IconName } from "@/art/GameIcon";
import { beeById } from "@/core/data/bees";
import { enemyById } from "@/core/data/enemies";
import type { Element } from "@/core/types";

/* ================================================================ effects layer */

export type FxKind = Element | "hit" | "crit" | "slash" | "heal" | "buff" | "charge";

export interface Fx {
  key: number;
  kind: FxKind;
  x: number;
  y: number;
  color: string;
}

/** How long each effect stays on screen (ms). */
export const FX_DURATION: Record<FxKind, number> = {
  hit: 360,
  crit: 520,
  slash: 460,
  flame: 950,
  leaf: 1050,
  storm: 900,
  wave: 950,
  light: 1000,
  shadow: 1050,
  heal: 900,
  buff: 700,
  charge: 520,
};

const ring = (n: number) => Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2);

/** One visual effect centred on a point of the battlefield. */
export function FxView({ fx }: { fx: Fx }) {
  const base: CSSProperties = { left: fx.x, top: fx.y };
  const c = fx.color;
  switch (fx.kind) {
    case "hit":
    case "crit": {
      const big = fx.kind === "crit";
      return (
        <div className="fx" style={base}>
          <svg width={big ? 150 : 90} height={big ? 150 : 90} viewBox="-50 -50 100 100" className="fx-pop">
            <path d="M0 -46 L10 -12 L44 -16 L16 4 L30 36 L0 16 L-30 36 L-16 4 L-44 -16 L-10 -12 Z" fill={big ? "#FFE066" : "#FFFFFF"} stroke={big ? "#C81D3A" : "#3A2410"} strokeWidth="4" strokeLinejoin="round" />
          </svg>
        </div>
      );
    }
    case "slash":
      return (
        <div className="fx" style={base}>
          <svg width="110" height="110" viewBox="-50 -50 100 100">
            {[-16, 0, 16].map((d) => (
              <path key={d} d={`M${-34 + d} -34 Q${d} 0 ${30 + d} 34`} fill="none" stroke="#FF5A5A" strokeWidth="7" strokeLinecap="round" className="fx-slash" />
            ))}
          </svg>
        </div>
      );
    case "flame":
      return (
        <div className="fx" style={base}>
          <div className="fx-flash" style={{ background: `radial-gradient(circle, #FFE066 0%, ${c} 40%, transparent 70%)` }} />
          {ring(7).map((a, i) => (
            <svg key={i} width="44" height="60" viewBox="0 0 32 44" className="fx-particle" style={{ "--dx": `${Math.cos(a) * 70}px`, "--dy": `${Math.sin(a) * 60 - 30}px`, animationDelay: `${i * 30}ms` } as CSSProperties}>
              <path d="M16 2 C22 12 30 18 28 28 C27 38 21 42 16 42 C10 42 4 37 4 29 C4 21 10 18 11 10 C13 13 14 16 14 19 C17 15 18 9 16 2 Z" fill={i % 2 ? "#FFB627" : c} stroke="#7A2E0B" strokeWidth="1.5" />
            </svg>
          ))}
        </div>
      );
    case "leaf":
      return (
        <div className="fx" style={base}>
          <div className="fx-swirl">
            {ring(9).map((a, i) => (
              <svg key={i} width="30" height="30" viewBox="0 0 32 32" className="fx-particle" style={{ "--dx": `${Math.cos(a) * 80}px`, "--dy": `${Math.sin(a) * 80}px`, animationDelay: `${i * 25}ms` } as CSSProperties}>
                <path d="M4 28 C4 14 12 4 28 4 C28 20 18 28 4 28 Z" fill={i % 2 ? "#7FD98F" : c} stroke="#1F7A3E" strokeWidth="2" />
              </svg>
            ))}
          </div>
        </div>
      );
    case "storm":
      return (
        <div className="fx" style={base}>
          <div className="fx-flash" style={{ background: `radial-gradient(circle, #FFFFFF 0%, ${c} 30%, ${c}55 50%, transparent 68%)` }} />
          <svg width="130" height="420" viewBox="0 0 60 210" className="fx-bolt" style={{ filter: `drop-shadow(0 0 10px ${c})` }}>
            <path d="M34 0 L18 90 L32 90 L14 210 L46 80 L30 80 L44 0 Z" fill="#FFE14D" stroke="#3A2410" strokeWidth="3" strokeLinejoin="round" />
            <path d="M36 10 L25 85 L35 85 L22 180" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="fx-ring" style={{ borderColor: c, borderWidth: 6 }} />
          {ring(8).map((a, i) => (
            <span key={i} className="fx-spark" style={{ "--dx": `${Math.cos(a) * 85}px`, "--dy": `${Math.sin(a) * 85}px`, background: "#FFE14D", border: "2px solid #3A2410" } as CSSProperties} />
          ))}
        </div>
      );
    case "wave":
      return (
        <div className="fx" style={base}>
          <div className="fx-ring" style={{ borderColor: c }} />
          <div className="fx-ring" style={{ borderColor: "#BFE6FF", animationDelay: "120ms" }} />
          {ring(8).map((a, i) => (
            <svg key={i} width="22" height="28" viewBox="0 0 32 40" className="fx-particle" style={{ "--dx": `${Math.cos(a) * 75}px`, "--dy": `${Math.sin(a) * 75}px` } as CSSProperties}>
              <path d="M16 2 C22 12 28 18 28 26 A12 12 0 0 1 4 26 C4 18 10 12 16 2 Z" fill={c} stroke="#0B4F8A" strokeWidth="2" />
            </svg>
          ))}
        </div>
      );
    case "light":
      return (
        <div className="fx" style={base}>
          <div className="fx-beam" style={{ background: `linear-gradient(90deg, transparent, #FFB627 25%, #FFFFFF 50%, #FFB627 75%, transparent)`, boxShadow: `0 0 30px #FFB627` }} />
          <div className="fx-flash" style={{ background: `radial-gradient(circle, #FFFFFF 0%, ${c} 35%, transparent 65%)` }} />
          {ring(6).map((a, i) => (
            <svg key={i} width="26" height="26" viewBox="-10 -10 20 20" className="fx-particle" style={{ "--dx": `${Math.cos(a) * 70}px`, "--dy": `${Math.sin(a) * 70}px` } as CSSProperties}>
              <path d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2 Z" fill="#FFFFFF" stroke={c} strokeWidth="1.2" />
            </svg>
          ))}
        </div>
      );
    case "shadow":
      return (
        <div className="fx" style={base}>
          <div className="fx-implode" style={{ background: `radial-gradient(circle, #1B0B2E 0%, ${c} 45%, transparent 70%)` }} />
          <div className="fx-ring" style={{ borderColor: c, animationDelay: "380ms" }} />
          <div className="fx-ring" style={{ borderColor: "#2B1747", animationDelay: "480ms" }} />
        </div>
      );
    case "heal":
      return (
        <div className="fx" style={base}>
          <div className="fx-glow" style={{ background: "radial-gradient(circle, #5BD38A88, transparent 65%)" }} />
          {[-28, -8, 12, 30].map((dx, i) => (
            <span key={i} className="fx-rise" style={{ marginLeft: dx, animationDelay: `${i * 90}ms` }}>
              <GameIcon name="heal" size={22} />
            </span>
          ))}
        </div>
      );
    case "buff":
      return (
        <div className="fx" style={base}>
          <div className="fx-ring" style={{ borderColor: c, borderWidth: 6 }} />
          <div className="fx-glow" style={{ background: `radial-gradient(circle, ${c}66, transparent 65%)` }} />
        </div>
      );
    case "charge":
      return (
        <div className="fx" style={base}>
          <div className="fx-converge" style={{ borderColor: c, boxShadow: `0 0 30px ${c}` }} />
          <div className="fx-converge" style={{ borderColor: "#FFFFFF", animationDelay: "120ms" }} />
          <div className="fx-glow" style={{ background: `radial-gradient(circle, ${c}AA, transparent 65%)` }} />
        </div>
      );
  }
}

/* ================================================================ banners */

export type Transition =
  | { key: number; kind: "turn"; side: "player" | "enemy" }
  | { key: number; kind: "wave"; wave: number; total: number }
  | { key: number; kind: "boss"; ref: string }
  | { key: number; kind: "fight" };

/** Full-width bands that announce whose turn it is, a new wave, or a boss. Input is locked meanwhile. */
export function TransitionView({ t }: { t: Transition }) {
  if (t.kind === "boss") return <BossIntro refId={t.ref} key={t.key} />;
  const style =
    t.kind === "turn" && t.side === "enemy"
      ? { band: "linear-gradient(90deg, transparent, #3B2257 12%, #5B3C88 50%, #3B2257 88%, transparent)", color: "#FFFFFF", text: "ENEMY TURN", icon: "arena" as IconName }
      : t.kind === "turn"
        ? { band: "linear-gradient(90deg, transparent, #E89A00 12%, #FFD23F 50%, #E89A00 88%, transparent)", color: "#3A2410", text: "YOUR TURN", icon: "bees" as IconName }
        : t.kind === "wave"
          ? { band: "linear-gradient(90deg, transparent, #1F5FA8 12%, #2F9BFF 50%, #1F5FA8 88%, transparent)", color: "#FFFFFF", text: `WAVE ${t.wave + 1} / ${t.total}`, icon: "waveMark" as IconName }
          : { band: "linear-gradient(90deg, transparent, #B5179E 12%, #FF4F79 50%, #B5179E 88%, transparent)", color: "#FFFFFF", text: "FIGHT!", icon: "arena" as IconName };
  return (
    <div key={t.key} className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/25">
      <div className="band-in flex w-full items-center justify-center gap-4 py-4 md:py-6" style={{ background: style.band }}>
        <GameIcon name={style.icon} size={56} className="hidden sm:inline-block" />
        <span className="text-4xl font-black italic tracking-wide md:text-7xl" style={{ color: style.color, WebkitTextStroke: style.color === "#FFFFFF" ? "2px #1A0F2B" : "0", textShadow: "0 4px 0 rgba(0,0,0,.35)" }}>
          {style.text}
        </span>
        <GameIcon name={style.icon} size={56} className="hidden sm:inline-block" />
      </div>
    </div>
  );
}

function BossIntro({ refId }: { refId: string }) {
  const sp = enemyById(refId);
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-black/60">
      <div className="hazard absolute inset-x-0 top-[18%] h-10 md:h-14" />
      <div className="hazard hazard-rev absolute inset-x-0 bottom-[18%] h-10 md:h-14" />
      <div className="boss-zoom">
        <EnemySprite kind={sp.kind} tint={sp.tint} boss size="clamp(160px, 40vw, 280px)" />
      </div>
      <div className="boss-title mt-2 text-center">
        <div className="flex items-center justify-center gap-2 text-2xl font-black tracking-[0.3em] text-[#FF4F4F] md:text-4xl">
          <GameIcon name="warning" size={34} /> BOSS <GameIcon name="warning" size={34} />
        </div>
        <div className="text-4xl font-black text-white md:text-6xl" style={{ WebkitTextStroke: "2px #2A0A12", textShadow: "0 0 24px #B5179E" }}>
          {sp.name}
        </div>
      </div>
    </div>
  );
}

/** Burst cut-in: every rarity gets one, rarer bees get a bigger and longer one. */
export function BurstCutIn({ beeRef, name, color }: { beeRef: string; name: string; color: string }) {
  const bee = beeById(beeRef);
  const big = bee.rarity >= 5;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 animate-fade" style={{ background: `radial-gradient(circle, ${color}55, rgba(0,0,0,${big ? 0.55 : 0.3}) 75%)` }} />
      <div className={`cutin absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center ${big ? "h-56 md:h-72" : "h-40 md:h-52"}`} style={{ background: `linear-gradient(90deg, transparent, ${color}EE 25%, ${color}EE 75%, transparent)` }}>
        <div className="speedlines absolute inset-0" />
        <BeeSprite look={bee.look} rarity={bee.rarity} size={big ? "clamp(180px, 30vw, 300px)" : "clamp(130px, 22vw, 210px)"} />
        <div className="relative ml-2 text-left">
          <div className="text-lg font-extrabold text-white drop-shadow md:text-2xl">{bee.name}</div>
          <div className="text-3xl font-black italic text-white md:text-6xl" style={{ WebkitTextStroke: "2px #2A1A08", textShadow: "0 4px 0 #2A1A08" }}>
            {name}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BossSkillBanner({ name }: { name: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 animate-fade bg-[#3A0A1A]/50" />
      <div className="band-in flex w-full items-center justify-center gap-3 py-4" style={{ background: "linear-gradient(90deg, transparent, #7A0F2E 15%, #B5179E 50%, #7A0F2E 85%, transparent)" }}>
        <GameIcon name="warning" size={44} />
        <span className="text-3xl font-black italic text-white md:text-5xl" style={{ WebkitTextStroke: "2px #2A0A12" }}>
          {name}
        </span>
        <GameIcon name="warning" size={44} />
      </div>
    </div>
  );
}

/* ================================================================ scenery */

/** Rolling hills and a few flowers so the field feels like a meadow. */
export function Hills({ ground, dark }: { ground: string; dark: boolean }) {
  const flowers = [6, 18, 31, 47, 58, 72, 86, 94];
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full transition-[filter] duration-1000" style={{ filter: dark ? "brightness(.45) saturate(.6) hue-rotate(-20deg)" : "none" }} viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
      <path d="M0 80 Q60 40 130 70 T260 60 T400 70 V200 H0 Z" fill={ground} opacity="0.55" />
      <path d="M0 120 Q90 80 190 110 T400 100 V200 H0 Z" fill={ground} opacity="0.8" />
      <path d="M0 160 Q120 130 240 150 T400 145 V200 H0 Z" fill={ground} />
      {flowers.map((x, i) => (
        <g key={x} transform={`translate(${x * 4} ${150 + (i % 3) * 14})`}>
          <path d="M0 0 V10" stroke="#3E8E41" strokeWidth="1.5" />
          <circle r="3.2" fill={dark ? "#9A8FA8" : ["#FFFFFF", "#FFB7C5", "#FFE066"][i % 3]} />
          <circle r="1.2" fill="#F5B301" />
        </g>
      ))}
    </svg>
  );
}

/** Falling petals; during a boss fight they turn into ash from the Wilt. */
export function Petals({ ash, lite }: { ash: boolean; lite?: boolean }) {
  const petals = useMemo(() => Array.from({ length: lite ? 5 : 14 }, (_, i) => ({ left: (i * 37) % 100, delay: (i * 1.3) % 8, dur: 7 + (i % 4) * 2 })), [lite]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {petals.map((p, i) => (
        <svg key={i} viewBox="0 0 10 10" width={ash ? 8 : 12} height={ash ? 8 : 12} className="petal absolute -top-4" style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${ash ? p.dur * 0.8 : p.dur}s`, opacity: ash ? 0.8 : 0.7 }}>
          {ash ? <circle cx="5" cy="5" r="4" fill={i % 2 ? "#6E5A8C" : "#4A4458"} /> : <path d="M5 0 C9 3 9 7 5 10 C1 7 1 3 5 0 Z" fill="#FFB7C5" />}
        </svg>
      ))}
    </div>
  );
}

/** The Wilt rolls in when a boss is on the field: dark sky, purple fog, lightning, vignette. */
export function BossAmbience({ on, lite }: { on: boolean; lite?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 transition-opacity duration-1000" style={{ opacity: on ? 1 : 0 }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #1A0B2E 0%, #3B1640 45%, #5A1A2A88 75%, transparent 100%)" }} />
      <div className={`boss-clouds absolute inset-x-0 top-0 h-1/2 opacity-60 ${lite ? "!animate-none" : ""}`} />
      <div className={`absolute inset-0 ${lite ? "opacity-80" : "vignette-pulse"}`} style={{ background: "radial-gradient(circle at 50% 45%, transparent 45%, #12051F 100%)" }} />
      {on && !lite && <div className="lightning absolute inset-0 bg-white" />}
    </div>
  );
}

/* ================================================================ styles */

export function BattleStyles() {
  return (
    <style>{`
      @keyframes dash-up { 0%{transform:none} 40%{transform:translate(18px,-46px) scale(1.15)} 100%{transform:none} }
      @keyframes lunge-down { 0%{transform:none} 40%{transform:translate(-14px,40px) scale(1.1)} 100%{transform:none} }
      @keyframes hit { 0%,100%{transform:none; filter:none} 20%{transform:translateX(-7px); filter:brightness(1.5) sepia(.6) hue-rotate(-30deg) saturate(3)} 60%{transform:translateX(6px)} }
      @keyframes faint { 0%{transform:none; opacity:1; filter:none} 100%{transform:scale(.4) translateY(30px); opacity:0; filter:grayscale(1) blur(2px)} }
      @keyframes burst-charge { 0%{transform:none; filter:none} 60%{transform:scale(1.25) translateY(-10px); filter:brightness(1.6) drop-shadow(0 0 22px #FFD23F)} 100%{transform:scale(1.1); filter:brightness(1.3) drop-shadow(0 0 14px #FFD23F)} }
      @keyframes dmg-float { 0%{transform:translate(-50%,0) scale(.6); opacity:0} 15%{transform:translate(-50%,-14px) scale(1.3); opacity:1} 100%{transform:translate(-50%,-78px) scale(1); opacity:0} }
      @keyframes screen-shake { 0%,100%{transform:none} 20%{transform:translate(-7px,3px)} 40%{transform:translate(6px,-4px)} 60%{transform:translate(-4px,2px)} 80%{transform:translate(3px,-2px)} }
      @keyframes ready-pulse { 0%,100%{box-shadow:0 0 0 0 #FFD23F99} 50%{box-shadow:0 0 18px 4px #FFD23FDD} }
      @keyframes target-spin { to { transform: rotate(360deg) } }
      @keyframes telegraph { 0%,100%{filter:drop-shadow(0 0 4px #FF2E63)} 50%{filter:drop-shadow(0 0 20px #FF2E63)} }
      @keyframes petal { 0%{transform:translate(0,0) rotate(0)} 100%{transform:translate(-60px,110vh) rotate(540deg)} }
      @keyframes cutin { 0%{transform:translate(-100%,-50%); opacity:0} 18%{transform:translate(0,-50%); opacity:1} 82%{transform:translate(0,-50%); opacity:1} 100%{transform:translate(100%,-50%); opacity:0} }
      @keyframes band-in { 0%{transform:translateX(-100%) skewX(-12deg); opacity:0} 20%{transform:none; opacity:1} 80%{transform:none; opacity:1} 100%{transform:translateX(100%) skewX(-12deg); opacity:0} }
      @keyframes boss-zoom { 0%{transform:scale(2.2); opacity:0; filter:brightness(0)} 30%{transform:scale(1); opacity:1; filter:brightness(0)} 55%{filter:brightness(1)} 100%{transform:scale(1.05)} }
      @keyframes boss-title { 0%{transform:scale(2.4); opacity:0} 100%{transform:none; opacity:1} }
      @keyframes hazard { from{background-position:0 0} to{background-position:120px 0} }
      @keyframes speedlines { from{background-position:0 0} to{background-position:-400px 0} }
      @keyframes lightning { 0%,91%,95%,100%{opacity:0} 92%,94%{opacity:.3} 93%{opacity:.08} }
      @keyframes vignette { 0%,100%{opacity:.75} 50%{opacity:1} }
      @keyframes clouds { from{background-position:0 0} to{background-position:800px 0} }
      @keyframes combo-pop { 0%{transform:scale(2.2) rotate(-8deg); opacity:0} 40%{transform:scale(.9) rotate(2deg); opacity:1} 100%{transform:scale(1) rotate(-4deg)} }

      @keyframes fx-pop { 0%{transform:scale(.2) rotate(0); opacity:1} 100%{transform:scale(1.3) rotate(25deg); opacity:0} }
      @keyframes fx-slash { 0%{stroke-dasharray:0 200; opacity:1} 60%{stroke-dasharray:200 0; opacity:1} 100%{stroke-dasharray:200 0; opacity:0} }
      @keyframes fx-scale-out { 0%{transform:scale(.2); opacity:1} 100%{transform:scale(1.6); opacity:0} }
      @keyframes fx-particle { 0%{transform:scale(.3); opacity:1} 70%{opacity:1} 100%{transform:translate(var(--dx), var(--dy)) scale(1.1) rotate(160deg); opacity:0} }
      @keyframes fx-swirl { to{transform:rotate(220deg)} }
      @keyframes fx-bolt { 0%{opacity:0; transform:scaleY(.2)} 25%{opacity:1; transform:scaleY(1)} 70%{opacity:1} 100%{opacity:0} }
      @keyframes fx-ring { 0%{transform:scale(.2); opacity:1} 100%{transform:scale(1.8); opacity:0} }
      @keyframes fx-beam { 0%{transform:scaleX(.1); opacity:0} 30%{transform:scaleX(1); opacity:1} 100%{transform:scaleX(.3); opacity:0} }
      @keyframes fx-implode { 0%{transform:scale(1.8); opacity:0} 50%{transform:scale(.6); opacity:1} 100%{transform:scale(.1); opacity:0} }
      @keyframes fx-rise { 0%{transform:translateY(10px) scale(.5); opacity:0} 30%{opacity:1} 100%{transform:translateY(-70px) scale(1); opacity:0} }
      @keyframes fx-glow { 0%,100%{opacity:0} 40%{opacity:1} }
      @keyframes fx-converge { 0%{transform:scale(2.4); opacity:0} 40%{opacity:1} 100%{transform:scale(.3); opacity:0} }
      @keyframes screen-tint { 0%{opacity:0} 20%{opacity:.35} 100%{opacity:0} }
      @keyframes fx-spark { 0%{transform:none; opacity:1} 100%{transform:translate(var(--dx), var(--dy)); opacity:0} }

      .dash-up{animation:dash-up .3s ease-out}
      .lunge-down{animation:lunge-down .3s ease-out}
      .hit{animation:hit .26s ease-out}
      .faint{animation:faint .6s ease-in forwards}
      .fainted{filter:grayscale(1); opacity:.45; transform:rotate(-20deg) translateY(10px)}
      .burst-charge{animation:burst-charge .5s ease-out forwards}
      .dmg-float{animation:dmg-float 1s ease-out forwards}
      .screen-shake{animation:screen-shake .35s ease-in-out}
      .burst-ready{animation:ready-pulse 1s ease-in-out infinite}
      .telegraph{animation:telegraph .8s ease-in-out infinite}
      .target-ring{border:3px dashed #FF4F4F; border-radius:9999px; animation:target-spin 4s linear infinite; margin:12%}
      .petal{animation:petal linear infinite}
      .cutin{animation:cutin 1.15s ease-in-out forwards}
      .band-in{animation:band-in .8s cubic-bezier(.2,.9,.3,1) forwards}
      .boss-zoom{animation:boss-zoom 1.6s ease-out forwards}
      .boss-title{animation:boss-title .9s .35s cubic-bezier(.2,1.4,.4,1) both}
      .hazard{background:repeating-linear-gradient(-45deg,#FF4F4F 0 30px,#1A0A10 30px 60px); animation:hazard .8s linear infinite; opacity:.9}
      .hazard-rev{animation-direction:reverse}
      .speedlines{background:repeating-linear-gradient(90deg, rgba(255,255,255,.35) 0 2px, transparent 2px 40px); animation:speedlines .4s linear infinite; mask-image:linear-gradient(90deg,transparent,#000 30%,#000 70%,transparent)}
      .lightning{animation:lightning 7s linear infinite; opacity:0}
      .vignette-pulse{animation:vignette 3s ease-in-out infinite}
      .boss-clouds{background:radial-gradient(ellipse 120px 40px at 60px 40px,#2A1838 60%,transparent 62%),radial-gradient(ellipse 160px 50px at 300px 70px,#2A1838 60%,transparent 62%),radial-gradient(ellipse 140px 45px at 560px 30px,#331C44 60%,transparent 62%); background-size:800px 160px; animation:clouds 40s linear infinite}
      .combo-pop{animation:combo-pop .35s cubic-bezier(.2,1.4,.4,1) forwards}

      /* Effects: every piece is centred on the effect point with the translate property; animations only use transform. */
      .fx{position:absolute; width:0; height:0; pointer-events:none; z-index:25}
      .fx > *{position:absolute; left:0; top:0; translate:-50% -50%}
      .fx-pop{animation:fx-pop .36s ease-out forwards}
      .fx-slash{animation:fx-slash .42s ease-out forwards}
      .fx-flash{width:220px; height:220px; border-radius:9999px; animation:fx-scale-out .75s ease-out forwards}
      .fx-particle{animation:fx-particle .9s ease-out forwards}
      .fx-swirl{width:0; height:0; animation:fx-swirl 1s ease-out forwards}
      .fx-swirl > *{position:absolute; left:0; top:0; translate:-50% -50%}
      .fx > .fx-bolt{translate:-50% -96%; transform-origin:top; animation:fx-bolt .85s ease-out forwards}
      .fx-ring{width:150px; height:150px; border:5px solid; border-radius:9999px; animation:fx-ring .85s ease-out forwards; opacity:0}
      .fx > .fx-beam{width:110px; height:520px; translate:-50% -94%; border-radius:60px; animation:fx-beam .95s ease-out forwards}
      .fx-implode{width:240px; height:240px; border-radius:9999px; animation:fx-implode .7s ease-in forwards}
      .fx-rise{animation:fx-rise .9s ease-out forwards; opacity:0}
      .fx-glow{width:180px; height:180px; border-radius:9999px; animation:fx-glow .8s ease-out forwards}
      .fx-converge{width:140px; height:140px; border:4px solid; border-radius:9999px; animation:fx-converge .5s ease-in forwards; opacity:0}
      .fx-spark{width:12px; height:12px; border-radius:9999px; animation:fx-spark .6s ease-out forwards}

      .screen-tint{position:absolute; inset:0; pointer-events:none; z-index:24; animation:screen-tint .6s ease-out forwards}
      .kbd-hint{display:none}
      @media (hover:hover) and (pointer:fine){ .kbd-hint{display:inline-flex} }
      @media (prefers-reduced-motion: reduce){ .lightning,.boss-clouds,.speedlines,.hazard{animation:none} }
    `}</style>
  );
}
