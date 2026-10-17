import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Settings, X } from "lucide-react";
import { GameIcon } from "@/art/GameIcon";
import { BeeSprite } from "@/art/BeeSprite";
import { ResourceIcon, Stars, ZoneFlag } from "@/art/icons";
import { beeById } from "@/core/data/bees";
import { ELEMENTS, RARITY, ROLES } from "@/core/data/meta";
import type { Resources, ResourceId } from "@/core/types";
import { BACK_EVENT } from "@/native";
import { useGame } from "@/store/game";

export const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : Math.floor(n).toLocaleString();

export function Modal({ onClose, children, wide }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    // Android back button closes the modal instead of leaving the screen.
    const onBack = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(BACK_EVENT, onBack);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(BACK_EVENT, onBack);
    };
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4 animate-fade" onClick={onClose}>
      <div
        className={`card relative max-h-[92vh] w-full overflow-y-auto rounded-b-none p-4 shadow-overlay sm:rounded-b-card animate-slide-up ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="btn btn-sm absolute right-3 top-3 z-10 !min-h-0 !px-2.5" onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={3} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Shows a cost as icons; red when the player cannot afford it. */
export function Cost({ cost, multiplier = 1, className = "" }: { cost: Partial<Resources>; multiplier?: number; className?: string }) {
  const resources = useGame((s) => s.resources);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {(Object.keys(cost) as ResourceId[]).map((k) => {
        const v = (cost[k] ?? 0) * multiplier;
        const ok = resources[k] >= v;
        return (
          <span key={k} className={`inline-flex items-center gap-0.5 num ${ok ? "" : "text-danger"}`}>
            <ResourceIcon id={k} size={18} />
            {fmt(v)}
          </span>
        );
      })}
    </span>
  );
}

export function ResourceBar({ onSettings }: { onSettings: () => void }) {
  const r = useGame((s) => s.resources);
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-1.5 px-3 py-1.5">
        <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto">
          {(["ticket", "honey", "silver", "pollen", "jelly"] as const).map((k) => (
            <span key={k} className="chip num shrink-0" title={k}>
              <ResourceIcon id={k} size={20} />
              {fmt(r[k])}
            </span>
          ))}
        </div>
        <button className="btn btn-sm !px-2.5" onClick={onSettings} aria-label="Settings">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}

export function RarityBadge({ rarity }: { rarity: keyof typeof RARITY }) {
  return (
    <span className="badge" style={{ background: rarity === 6 ? "linear-gradient(90deg,#FF4F79,#FFB627,#3DBE6A,#2F9BFF,#9B5DE5)" : RARITY[rarity].color }} title={RARITY[rarity].name}>
      <Stars count={Math.min(rarity, 6)} size={12} color="#FFFFFF" />
    </span>
  );
}

/** Square bee tile used in grids (collection, team picker, pack results). */
export function BeeTile({
  id,
  owned = true,
  level,
  rank,
  selected,
  onClick,
  size = 76,
  badge,
}: {
  id: string;
  owned?: boolean;
  level?: number;
  rank?: number;
  selected?: boolean;
  onClick?: () => void;
  size?: number;
  badge?: ReactNode;
}) {
  const sp = beeById(id);
  const color = RARITY[sp.rarity].color;
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center rounded-tile border-2 bg-surface p-1 pb-1.5 transition-transform active:scale-95 ${selected ? "ring-4 ring-accent" : ""}`}
      style={{ borderColor: owned ? color : "rgb(var(--color-border))", background: owned ? `linear-gradient(180deg, ${color}22, transparent 70%)` : undefined }}
    >
      <span className="absolute left-1 top-1 z-10">
        <ZoneFlag zone={sp.zone} size={18} />
      </span>
      <span className="absolute right-1 top-1 z-10" title={ELEMENTS[sp.element].name}>
        <GameIcon name={sp.element} size={16} />
      </span>
      {badge && <span className="absolute -right-1 -top-2 z-20">{badge}</span>}
      <BeeSprite look={sp.look} rarity={sp.rarity} size={size} silhouette={!owned} animated={false} />
      <span className="mt-0.5 max-w-full truncate text-xs font-bold leading-tight">{owned ? sp.name : "???"}</span>
      <span className="flex items-center gap-1 text-[10px] leading-none">
        <Stars count={Math.min(sp.rarity, 6)} size={9} color={color} />
      </span>
      {owned && level !== undefined && (
        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-text-secondary num">
          Lv{level}
          {rank ? <span className="text-accent">+{rank}</span> : null}
        </span>
      )}
      <span className="sr-only">{ROLES[sp.role].name}</span>
    </button>
  );
}

/** A "+N" that floats up and fades, positioned by its parent (relative). */
export function FloatText({ children, color = "#E89A00" }: { children: ReactNode; color?: string }) {
  return (
    <span className="float-text pointer-events-none absolute left-1/2 top-0 z-20 whitespace-nowrap text-xl font-extrabold" style={{ color, textShadow: "0 2px 0 #fff, 0 0 6px #fff" }}>
      {children}
    </span>
  );
}

/** Re-renders every `ms` (live hive fill, timers). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function RedDot() {
  return <span className="red-dot absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-danger" />;
}
