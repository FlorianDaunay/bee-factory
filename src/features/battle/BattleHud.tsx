import { useRef, type ReactNode, type Ref } from "react";
import { Bot, ChevronsUp, FastForward, Play, RotateCw, SkipForward, X } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { EnemySprite } from "@/art/EnemySprite";
import { GameIcon, type IconName } from "@/art/GameIcon";
import type { Unit } from "@/core/battle/types";
import { beeById } from "@/core/data/bees";
import { enemyById } from "@/core/data/enemies";
import { ELEMENTS, ITEMS, RARITY, STATUSES, weaknessOf } from "@/core/data/meta";
import type { ItemId } from "@/core/types";

const fmt = (n: number) => Math.max(0, Math.round(n)).toLocaleString();

/* ================================================================ top bar */

export function TopBar(props: {
  wave: number;
  total: number;
  turn: number;
  stageId: string;
  fast: boolean;
  auto: boolean;
  onFast: () => void;
  onAuto: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="safe-top relative z-20 flex items-center gap-2 px-3 py-2 text-[#3A2410] md:px-6 md:py-3">
      <button className="btn btn-sm !min-h-0 !px-2.5 md:!px-3" onClick={props.onLeave} aria-label="Leave">
        <X size={18} strokeWidth={3} />
      </button>
      <span className="badge bg-white/85 text-sm num md:px-3 md:py-1 md:text-lg" title="Wave">
        <GameIcon name="waveMark" size={20} /> <span className="hidden md:inline">Wave</span> {props.wave + 1}/{props.total}
      </span>
      <span className="badge bg-white/85 text-sm num md:px-3 md:py-1 md:text-lg" title="Turn">
        <RotateCw size={16} /> <span className="hidden md:inline">Turn</span> {props.turn}
      </span>
      <span className="badge hidden bg-white/60 text-sm md:inline-flex md:px-3 md:py-1 md:text-lg">Stage {props.stageId}</span>
      <div className="flex-1" />
      <button className={`btn btn-sm !min-h-0 md:text-base ${props.fast ? "btn-primary" : ""}`} onClick={props.onFast}>
        {props.fast ? <FastForward size={18} /> : <Play size={18} />} {props.fast ? "2×" : "1×"}
      </button>
      <button className={`btn btn-sm !min-h-0 md:text-base ${props.auto ? "btn-primary" : ""}`} onClick={props.onAuto}>
        <Bot size={18} /> Auto
      </button>
    </div>
  );
}

/* ================================================================ boss bar */

/** Big boss health bar with the countdown to its special attack. */
export function BossBar({ boss, telegraphed }: { boss: Unit; telegraphed: boolean }) {
  const sp = enemyById(boss.ref);
  const pct = Math.max(0, boss.hp / boss.maxHp);
  const every = sp.boss?.every ?? 3;
  const left = boss.bossTimer ?? every;
  return (
    <div className="relative z-20 mx-auto w-full max-w-3xl px-3 animate-slide-up">
      <div className="rounded-tile border-2 border-[#B5179E] bg-[#1A0B2E]/85 px-3 py-2 text-white shadow-overlay">
        <div className="flex items-center gap-2">
          <GameIcon name="crown" size={22} />
          <span className="font-black md:text-lg">{sp.name}</span>
          <GameIcon name={boss.element} size={18} />
          <span className="text-xs opacity-70">Lv {boss.level}</span>
          <span className="ml-auto text-sm font-bold num md:text-base">
            {fmt(boss.hp)} / {fmt(boss.maxHp)}
          </span>
        </div>
        <div className="mt-1 h-3.5 overflow-hidden rounded-pill border border-black/50 bg-black/50 md:h-4">
          <div className="h-full transition-[width] duration-500" style={{ width: `${pct * 100}%`, background: "linear-gradient(90deg,#FF2E63,#B5179E)" }} />
        </div>
        <div className={`mt-1.5 flex items-center gap-2 text-xs font-bold md:text-sm ${telegraphed ? "text-[#FF4F4F]" : "text-white/80"}`}>
          <GameIcon name="warning" size={16} />
          <span>{sp.boss?.name}</span>
          <span className="flex gap-1">
            {Array.from({ length: every }, (_, i) => (
              <span key={i} className={`h-2.5 w-2.5 rounded-full border border-white/60 ${i < every - left ? "bg-[#FF4F4F]" : "bg-transparent"}`} />
            ))}
          </span>
          <span className={telegraphed ? "animate-pulse" : ""}>{telegraphed ? "NEXT TURN! Guard or heal" : `in ${left + 1} turns`}</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ combo */

export function ComboMeter({ count, tick }: { count: number; tick: number }) {
  if (count < 1) return null;
  const hits = count + 1;
  const bonus = Math.min(60, count * 10);
  const color = hits >= 6 ? "#FF4F4F" : hits >= 4 ? "#FF8A3D" : "#FFD23F";
  return (
    <div className="pointer-events-none absolute left-1/2 top-[38%] z-20 -translate-x-1/2 -translate-y-1/2 text-center md:top-[30%]">
      <div key={tick} className="combo-pop">
        <div className="text-6xl font-black italic leading-none md:text-8xl" style={{ color, WebkitTextStroke: "3px #2A1A08", textShadow: `0 5px 0 #2A1A08, 0 0 30px ${color}` }}>
          {hits}
        </div>
        <div className="text-2xl font-black italic tracking-widest md:text-4xl" style={{ color: "#FFFFFF", WebkitTextStroke: "2px #2A1A08" }}>
          COMBO
        </div>
        <div className="mt-1 inline-block rounded-pill bg-[#2A1A08]/80 px-3 py-0.5 text-sm font-bold text-[#FFD23F] md:text-lg">+{bonus}% damage</div>
      </div>
    </div>
  );
}

/* ================================================================ turn strip */

export function TurnStrip({
  side,
  allies,
  onEnd,
  canEnd,
}: {
  side: "player" | "enemy" | "wait";
  allies: Unit[];
  onEnd: () => void;
  canEnd: boolean;
}) {
  const left = allies.filter((a) => a.hp > 0 && !a.acted).length;
  const player = side === "player";
  return (
    <div className={`mx-auto flex max-w-6xl items-center gap-3 rounded-tile px-3 py-1.5 transition-colors md:py-2 ${side === "enemy" ? "bg-[#5B3C88]/60" : "bg-[#FFD23F]/20"}`}>
      <span className={`text-lg font-black italic md:text-2xl ${player ? "text-[#FFD23F]" : side === "enemy" ? "text-[#D9C7FF]" : "text-[#FFD23F]/60"}`}>{side === "enemy" ? "ENEMY TURN" : "YOUR TURN"}</span>
      {player && (
        <span className="hidden text-sm font-bold text-white/80 sm:inline md:text-base">
          {left > 0 ? `${left} bee${left > 1 ? "s" : ""} left to act` : "All bees acted"}
        </span>
      )}
      <span className="flex gap-1.5" aria-label="Bees">
        {allies.map((a) => {
          const ready = a.gauge >= a.gaugeMax && a.hp > 0;
          const cls = a.hp <= 0 ? "bg-black/40" : a.acted ? "bg-white/25" : ready ? "bg-[#FF8A3D] ring-2 ring-[#FFD23F]" : "bg-[#FFD23F]";
          return <span key={a.uid} className={`h-3 w-3 rounded-full md:h-4 md:w-4 ${cls}`} title={a.name} />;
        })}
      </span>
      <div className="flex-1" />
      <button className="btn btn-sm !min-h-0 text-[#3A2410] md:text-base" disabled={!canEnd} onClick={onEnd} title="End turn (E)">
        <SkipForward size={16} /> End turn <Kbd>E</Kbd>
      </button>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd-hint items-center rounded border border-current/40 bg-black/20 px-1 text-[10px] font-bold leading-4 opacity-80">{children}</kbd>;
}

/* ================================================================ party card */

export function PartyCard({
  index,
  unit,
  logical,
  canAct,
  locked,
  itemMode,
  onAttack,
  onBurst,
}: {
  index: number;
  unit: Unit;
  logical: Unit;
  canAct: boolean;
  locked: boolean;
  itemMode: ItemId | null;
  onAttack: () => void;
  onBurst: () => void;
}) {
  const sp = beeById(unit.ref);
  const ready = logical.gauge >= logical.gaugeMax && logical.hp > 0;
  const startY = useRef<number | null>(null);
  const dead = unit.hp <= 0;
  const itemTarget = itemMode ? (ITEMS[itemMode].target === "fainted" ? dead : !dead) : false;
  const color = RARITY[sp.rarity].color;
  const hpPct = Math.max(0, unit.hp / unit.maxHp);
  const showBurst = ready && canAct && !itemMode;
  const active = (canAct && !locked) || itemTarget;

  return (
    <div
      className={`relative overflow-hidden rounded-tile border-2 transition-[opacity,transform] ${
        itemTarget ? "border-[#FFD23F] ring-2 ring-[#FFD23F]" : showBurst && !locked ? "burst-ready border-[#FFD23F]" : "border-white/25"
      } ${active ? "" : "opacity-55 saturate-50"}`}
      style={{ background: `linear-gradient(90deg, ${color}55, #00000066)` }}
    >
      <button
        className="flex w-full items-center gap-1.5 p-1 text-left active:scale-[0.97] md:gap-2.5 md:p-2"
        onPointerDown={(e) => (startY.current = e.clientY)}
        onPointerUp={(e) => {
          const dy = startY.current === null ? 0 : e.clientY - startY.current;
          startY.current = null;
          // Swipe up = Buzz Burst (Brave Frontier style); tap = normal attack.
          if (dy < -25 && ready) onBurst();
          else onAttack();
        }}
      >
        <span className={`relative shrink-0 ${dead ? "grayscale" : ""}`}>
          <span className="md:hidden">
            <BeeSprite look={sp.look} rarity={sp.rarity} size={40} animated={false} aura={false} />
          </span>
          <span className="hidden md:block">
            <BeeSprite look={sp.look} rarity={sp.rarity} size={64} animated={false} aura={false} />
          </span>
          <span className="absolute -bottom-1 -right-1">
            <GameIcon name={sp.element} size={16} />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-xs font-extrabold leading-tight md:text-base">{sp.name}</span>
            <span className="hidden shrink-0 text-xs font-bold text-white/70 md:inline">Lv {unit.level}</span>
            <span className="ml-auto">
              <Kbd>{index + 1}</Kbd>
            </span>
          </span>
          {/* HP */}
          <span className="relative mt-0.5 block h-2.5 overflow-hidden rounded-pill bg-black/55 md:h-4">
            <span className="block h-full transition-[width] duration-300" style={{ width: `${hpPct * 100}%`, background: hpPct > 0.5 ? "#5BD38A" : hpPct > 0.25 ? "#FFB627" : "#FF5A5A" }} />
            <span className="absolute inset-0 hidden items-center justify-center text-[11px] font-extrabold leading-none text-white md:flex" style={{ textShadow: "0 1px 2px #000" }}>
              {fmt(unit.hp)} / {fmt(unit.maxHp)}
            </span>
          </span>
          {/* Burst gauge */}
          <span className="relative mt-0.5 block h-1.5 overflow-hidden rounded-pill bg-black/55 md:mt-1 md:h-3">
            <span
              className="block h-full transition-[width] duration-300"
              style={{ width: `${(logical.gauge / logical.gaugeMax) * 100}%`, background: ready ? "linear-gradient(90deg,#FFD23F,#FF6B3D)" : "#4FC3F7" }}
            />
            <span className="absolute inset-0 hidden items-center justify-center text-[10px] font-extrabold leading-none text-white md:flex" style={{ textShadow: "0 1px 2px #000" }}>
              {ready ? "BURST READY" : `${Math.floor(logical.gauge)} / ${logical.gaugeMax}`}
            </span>
          </span>
          <span className="mt-0.5 flex min-h-[12px] gap-0.5">
            {unit.statuses.map((s) => (
              <GameIcon key={s.id} name={s.id} size={14} title={STATUSES[s.id].name} />
            ))}
          </span>
        </span>
      </button>

      {showBurst && (
        <button
          title={sp.burst.name}
          className="absolute inset-y-0 right-0 z-10 flex w-[46%] flex-col items-center justify-center gap-0 overflow-hidden whitespace-nowrap border-l-2 border-[#FFD23F] px-1 text-xs font-black italic tracking-wide text-[#3A2410] active:scale-[0.97] disabled:opacity-50 md:static md:w-full md:flex-row md:gap-1 md:border-l-0 md:border-t-2 md:py-1.5 md:text-base"
          style={{ background: "linear-gradient(90deg,#FFD23F,#FF8A3D,#FFD23F)", backgroundSize: "200% 100%", animation: "speedlines 1.2s linear infinite" }}
          disabled={locked}
          onClick={onBurst}
        >
          <ChevronsUp size={18} strokeWidth={3} className="shrink-0" /> BURST
          <span className="hidden min-w-0 truncate text-xs font-bold not-italic md:inline">{sp.burst.name}</span>
          <Kbd>⇧{index + 1}</Kbd>
        </button>
      )}

      {logical.acted && !dead && !itemTarget && (
        <span className="pointer-events-none absolute right-1 top-1 rounded-pill bg-black/60 px-1.5 text-[10px] font-bold text-white/80 md:text-xs">done</span>
      )}
      {dead && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <GameIcon name="sleep" size={28} />
        </span>
      )}
    </div>
  );
}

/* ================================================================ items */

export function ItemBar({ items, itemMode, disabled, onUse }: { items: Partial<Record<ItemId, number>>; itemMode: ItemId | null; disabled: boolean; onUse: (id: ItemId) => void }) {
  return (
    <div className="mx-auto mt-1.5 flex max-w-6xl gap-1.5 overflow-x-auto pb-1">
      {(Object.keys(ITEMS) as ItemId[]).map((id) => {
        const n = items[id] ?? 0;
        return (
          <button
            key={id}
            disabled={n <= 0 || disabled}
            onClick={() => onUse(id)}
            className={`relative flex min-w-[52px] flex-1 items-center justify-center gap-1.5 rounded-tile border-2 bg-black/30 px-2 py-1 transition-transform active:scale-90 disabled:opacity-35 md:py-1.5 ${
              itemMode === id ? "border-[#FFD23F] bg-[#FFD23F]/30" : "border-white/20"
            }`}
            title={`${ITEMS[id].name}: ${ITEMS[id].desc}`}
          >
            <GameIcon name={id} size={26} />
            <span className="hidden text-left leading-tight md:block">
              <span className="block text-sm font-bold">{ITEMS[id].name}</span>
              <span className="block text-[11px] text-white/70">{ITEMS[id].desc}</span>
            </span>
            <span className="text-xs font-bold num md:ml-auto md:text-sm">×{n}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================ enemies */

export interface Floater {
  key: number;
  uid: string;
  text: string;
  color: string;
  big?: boolean;
  icon?: IconName;
}

export function FloatNum({ f, index }: { f: Floater; index: number }) {
  return (
    <span
      className="dmg-float pointer-events-none absolute left-1/2 top-1/4 z-30 flex items-center whitespace-nowrap font-black"
      style={{
        color: f.color,
        fontSize: f.big ? "clamp(1.9rem, 3vw, 2.6rem)" : "clamp(1.35rem, 2.2vw, 1.9rem)",
        marginLeft: `${((index % 3) - 1) * 20}px`,
        WebkitTextStroke: "1.5px #2A1A08",
        textShadow: "0 3px 0 #2A1A08",
      }}
    >
      {f.icon && <GameIcon name={f.icon} size={f.big ? 34 : 24} />}
      {f.text}
    </span>
  );
}

export function EnemyView({
  unit,
  isTarget,
  anim,
  telegraphed,
  floaters,
  onTarget,
  spriteRef,
}: {
  unit: Unit;
  isTarget: boolean;
  anim: string;
  telegraphed: boolean;
  floaters: Floater[];
  onTarget: () => void;
  spriteRef: Ref<HTMLDivElement>;
}) {
  const sp = enemyById(unit.ref);
  const dead = unit.hp <= 0;
  const pct = Math.max(0, unit.hp / unit.maxHp);
  const weak = weaknessOf(unit.element);
  return (
    <button
      className={`relative flex flex-col items-center transition-opacity ${dead ? "pointer-events-none" : ""}`}
      onClick={onTarget}
      style={{ opacity: dead && anim !== "faint" ? 0 : 1 }}
      title={sp.name}
    >
      <div ref={spriteRef} className={`relative ${anim} ${telegraphed ? "telegraph" : ""}`}>
        <EnemySprite kind={sp.kind} tint={sp.tint} boss={!!sp.boss} size={sp.boss ? "clamp(72px, min(30vw, 20dvh), 240px)" : "clamp(44px, min(20vw, 12dvh), 160px)"} />
        {isTarget && !dead && <span className="target-ring pointer-events-none absolute inset-0" />}
        <span className="absolute -top-1 left-0 drop-shadow">
          <GameIcon name={unit.element} size={20} title={ELEMENTS[unit.element].name} />
        </span>
        {/* Phones: the weakness sits on the sprite so the field keeps its height. */}
        {isTarget && !dead && (
          <span className="absolute -top-1 right-0 flex items-center rounded-pill bg-black/60 px-1 md:hidden" title={`Weak to ${ELEMENTS[weak].name}`}>
            <GameIcon name="target" size={12} />
            <GameIcon name={weak} size={14} />
          </span>
        )}
      </div>
      <span className="hidden max-w-[180px] truncate text-xs font-bold text-white md:block" style={{ textShadow: "0 1px 3px #000" }}>
        {sp.name} <span className="opacity-75">Lv {unit.level}</span>
      </span>
      <div className="relative mt-0.5 h-2.5 w-20 overflow-hidden rounded-pill border border-black/40 bg-black/45 md:h-3.5 md:w-32">
        <div className="h-full transition-[width] duration-300" style={{ width: `${pct * 100}%`, background: pct > 0.5 ? "#5BD38A" : pct > 0.25 ? "#FFB627" : "#FF5A5A" }} />
        <span className="absolute inset-0 hidden items-center justify-center text-[10px] font-extrabold leading-none text-white md:flex" style={{ textShadow: "0 1px 2px #000" }}>
          {fmt(unit.hp)}
        </span>
      </div>
      <div className="mt-0.5 flex min-h-[14px] gap-0.5">
        {unit.statuses.map((s) => (
          <GameIcon key={s.id} name={s.id} size={14} title={STATUSES[s.id].name} />
        ))}
      </div>
      {isTarget && !dead && (
        <span className="mt-0.5 hidden items-center gap-1 rounded-pill bg-black/55 px-2 py-0.5 text-xs font-bold text-white md:flex">
          Weak to <GameIcon name={weak} size={14} /> {ELEMENTS[weak].name}
        </span>
      )}
      {floaters.map((f, i) => (
        <FloatNum key={f.key} f={f} index={i} />
      ))}
    </button>
  );
}

/* ================================================================ tips */

export function TipBubble({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const pip = beeById("pip");
  return (
    <div className="mx-auto mb-1.5 flex max-w-6xl items-center gap-2 rounded-tile border-2 border-[#FFD23F] bg-[#FFF7E3] px-2 py-1.5 text-[#3A2410] shadow-overlay animate-slide-up">
      <BeeSprite look={pip.look} rarity={1} size={40} animated={false} aura={false} />
      <span className="flex-1 text-sm font-bold md:text-base">{children}</span>
      <button className="btn btn-sm btn-primary !min-h-0" onClick={onClose}>
        Got it
      </button>
    </div>
  );
}
