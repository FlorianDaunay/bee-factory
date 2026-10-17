import { useMemo, useState } from "react";
import { BookOpen, Users, X } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { GameIcon } from "@/art/GameIcon";
import { ZoneFlag } from "@/art/icons";
import { BEES, beeById } from "@/core/data/bees";
import { RARITY, ZONES } from "@/core/data/meta";
import { powerScore, statsAt } from "@/core/progression";
import { computeSynergies } from "@/core/synergy";
import type { ZoneId } from "@/core/types";
import { TEAM_SIZE, useGame } from "@/store/game";
import { BeeTile, RedDot, fmt } from "@/ui/common";
import { BeeDetail } from "./BeeDetail";

export function BeesScreen() {
  const [tab, setTab] = useState<"team" | "all">("team");
  const fresh = useGame((s) => s.fresh.length);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button className={`btn flex-1 ${tab === "team" ? "btn-primary" : ""}`} onClick={() => setTab("team")}>
          <Users size={18} /> Team
        </button>
        <button className={`btn relative flex-1 ${tab === "all" ? "btn-primary" : ""}`} onClick={() => setTab("all")}>
          <BookOpen size={18} /> Collection
          {fresh > 0 && <RedDot />}
        </button>
      </div>
      {tab === "team" ? <TeamView /> : <CollectionView />}
    </div>
  );
}

const DOTS = [2, 3, 4, 6];

export function SynergyPanel({ ids }: { ids: string[] }) {
  const syn = computeSynergies(ids.map(beeById));
  if (!syn.zones.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {syn.zones.map((z) => (
        <div
          key={z.zone}
          className={`chip ${z.tier ? "" : "opacity-50"} ${syn.homeland === z.zone ? "animate-pop ring-2 ring-accent" : ""}`}
          title={`${ZONES[z.zone].name}: +${z.pct}% ${z.kind}`}
        >
          <ZoneFlag zone={z.zone} size={20} />
          <span className="flex gap-0.5">
            {DOTS.map((d) => (
              <span key={d} className={`h-2 w-2 rounded-full ${z.count >= d ? "bg-accent" : "bg-border"}`} />
            ))}
          </span>
          {z.tier > 0 && (
            <span className="flex items-center gap-0.5 text-xs num">
              <GameIcon name={z.kind} size={14} />+{z.pct}%{z.tier >= 3 && <GameIcon name="support" size={12} title="Zone passive active" />}
            </span>
          )}
        </div>
      ))}
      {syn.continents
        .filter((c) => c.active)
        .map((c) => (
          <span key={c.continent} className="chip capitalize">
            <GameIcon name="globe" size={18} /> {c.continent} <GameIcon name="hp" size={14} />+5%
          </span>
        ))}
      {syn.homeland && <span className="chip bg-accent/20"><GameIcon name="homeland" size={18} /> Homeland +15%</span>}
    </div>
  );
}

function TeamView() {
  const team = useGame((s) => s.team);
  const bees = useGame((s) => s.bees);
  const setSlot = useGame((s) => s.setTeamSlot);
  const [slot, setSlotSel] = useState<number>(() => Math.max(0, team.indexOf(null)));
  const [detail, setDetail] = useState<string | null>(null);

  const ids = team.filter((t): t is string => !!t);
  const power = ids.reduce((a, id) => a + powerScore(statsAt(beeById(id), bees[id].level, bees[id].rank)), 0);
  const owned = Object.values(bees).sort((a, b) => beeById(b.id).rarity - beeById(a.id).rarity || b.level - a.level);

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-extrabold"><Users size={18} /> {ids.length}/{TEAM_SIZE}</span>
          <span className="flex items-center gap-1 font-bold text-text-secondary num" title="Team power"><GameIcon name="power" size={16} /> {fmt(power)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {Array.from({ length: TEAM_SIZE }, (_, i) => {
            const id = team[i];
            const sp = id ? beeById(id) : null;
            return (
              <button
                key={i}
                onClick={() => (slot === i && id ? setDetail(id) : setSlotSel(i))}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-tile border-2 bg-canvas transition-transform active:scale-95 ${
                  slot === i ? "border-accent ring-4 ring-accent/30" : "border-dashed border-border"
                }`}
                style={sp ? { borderStyle: "solid", background: `radial-gradient(circle, ${RARITY[sp.rarity].color}33, transparent 70%)` } : undefined}
              >
                {sp ? (
                  <>
                    <BeeSprite look={sp.look} rarity={sp.rarity} size="80%" />
                    <span className="absolute bottom-1 text-xs font-bold num">Lv{bees[sp.id].level}</span>
                    <span className="absolute left-1 top-1">
                      <ZoneFlag zone={sp.zone} size={18} />
                    </span>
                  </>
                ) : (
                  <span className="text-3xl text-text-muted">+</span>
                )}
              </button>
            );
          })}
        </div>
        {team[slot] && (
          <button className="btn btn-sm mt-2 w-full" onClick={() => setSlot(slot, null)}>
            <X size={16} /> Remove
          </button>
        )}
        <div className="mt-3">
          <SynergyPanel ids={ids} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {owned.map((b) => (
          <BeeTile
            key={b.id}
            id={b.id}
            level={b.level}
            rank={b.rank}
            selected={team.includes(b.id)}
            onClick={() => {
              setSlot(slot, b.id);
              const next = team.findIndex((t, i) => !t && i !== slot);
              if (next >= 0) setSlotSel(next);
            }}
          />
        ))}
      </div>
      {detail && <BeeDetail id={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function CollectionView() {
  const bees = useGame((s) => s.bees);
  const fresh = useGame((s) => s.fresh);
  const [zone, setZone] = useState<ZoneId | "all">("all");
  const [detail, setDetail] = useState<string | null>(null);
  const list = useMemo(() => BEES.filter((b) => zone === "all" || b.zone === zone), [zone]);
  const count = Object.keys(bees).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-extrabold num">
          <BookOpen size={18} /> {count}/{BEES.length}
        </span>
      </div>
      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
        <button className={`chip shrink-0 ${zone === "all" ? "bg-accent text-accent-foreground" : ""}`} onClick={() => setZone("all")} aria-label="All zones">
          <GameIcon name="globe" size={20} />
        </button>
        {(Object.keys(ZONES) as ZoneId[]).map((z) => {
          const total = BEES.filter((b) => b.zone === z).length;
          const have = BEES.filter((b) => b.zone === z && bees[b.id]).length;
          return (
            <button key={z} className={`chip shrink-0 num ${zone === z ? "bg-accent text-accent-foreground" : ""}`} onClick={() => setZone(z)}>
              <ZoneFlag zone={z} size={20} /> {have}/{total}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {list.map((b) => (
          <BeeTile
            key={b.id}
            id={b.id}
            owned={!!bees[b.id]}
            level={bees[b.id]?.level}
            rank={bees[b.id]?.rank}
            badge={fresh.includes(b.id) ? <span className="badge bg-danger text-white">NEW</span> : undefined}
            onClick={() => bees[b.id] && setDetail(b.id)}
          />
        ))}
      </div>
      {detail && <BeeDetail id={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
