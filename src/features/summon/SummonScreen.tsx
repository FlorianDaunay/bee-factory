import { useState } from "react";
import { Info, Lock } from "lucide-react";
import { GameIcon, type IconName } from "@/art/GameIcon";
import { ResourceIcon, Stars, ZoneFlag } from "@/art/icons";
import { RARITY, ZONES } from "@/core/data/meta";
import { STAGES, CHAPTERS } from "@/core/data/story";
import { MULTI_COUNT, PACKS, PITY_LIMIT, TIER2_UNLOCK_STAGE, displayRates, packPool, type Pack, type PackTier } from "@/core/gacha";
import { packUnlocked, tier2Unlocked } from "@/core/unlocks";
import type { Resources } from "@/core/types";
import { useGame, type PullOutcome } from "@/store/game";
import { BeeTile, Cost, Modal, RarityBadge, fmt } from "@/ui/common";
import { PackOpening } from "./PackOpening";

const TIERS: { tier: PackTier; title: string; sub: string; groups: { title: string; icon: IconName; packs: Pack[] }[] }[] = [
  {
    tier: 1,
    title: "Tier 1 · Earth",
    sub: "Bees from every country",
    groups: [
      { title: "Countries", icon: "summon", packs: PACKS.filter((p) => p.family === "country") },
      { title: "Continents", icon: "globe", packs: PACKS.filter((p) => p.family === "continent") },
      { title: "World", icon: "support", packs: PACKS.filter((p) => p.family === "world") },
    ],
  },
  {
    tier: 2,
    title: "Tier 2 · Space",
    sub: "Moon, planets and Sun: Rare to Celestial bees",
    groups: [
      { title: "Planets", icon: "shadow", packs: PACKS.filter((p) => p.family === "planet") },
      { title: "Cosmic", icon: "light", packs: PACKS.filter((p) => p.family === "cosmic") },
    ],
  },
];

export function SummonScreen() {
  const cleared = useGame((s) => s.cleared);
  const tickets = useGame((s) => s.resources.ticket);
  const [result, setResult] = useState<{ pack: Pack; outcome: PullOutcome } | null>(null);
  const unlockStage = STAGES[TIER2_UNLOCK_STAGE];

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-3 p-3">
        <ResourceIcon id="ticket" size={40} />
        <div className="flex-1">
          <div className="text-lg font-extrabold num">{fmt(tickets)} tickets</div>
          <div className="text-sm text-text-secondary">1 ticket = 1 bee from any pack. Fights sometimes drop more.</div>
        </div>
      </div>

      {TIERS.map((t) => {
        const open = t.tier === 1 || tier2Unlocked(cleared);
        return (
          <section key={t.tier} className="space-y-4">
            <div className="flex items-end justify-between gap-2 border-b-2 border-border pb-1">
              <div>
                <h2 className="text-2xl font-black">{t.title}</h2>
                <div className="text-sm text-text-secondary">{t.sub}</div>
              </div>
              {!open && (
                <span className="badge bg-surface-hover text-sm">
                  <Lock size={14} /> Clear stage {TIER2_UNLOCK_STAGE} ({CHAPTERS[unlockStage.chapter].name} boss)
                </span>
              )}
            </div>
            {t.groups.map((g) => (
              <div key={g.title} className="space-y-2">
                <h3 className="flex items-center gap-2 text-lg font-extrabold">
                  <GameIcon name={g.icon} size={24} /> {g.title}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.packs.map((p) => (
                    <PackCard key={p.id} pack={p} unlocked={packUnlocked(cleared, p)} onOpened={(outcome) => setResult({ pack: p, outcome })} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}
      {result && <PackOpening pack={result.pack} outcome={result.outcome} onClose={() => setResult(null)} />}
    </div>
  );
}

const times = (price: Partial<Resources>, n: number) => Object.fromEntries(Object.entries(price).map(([k, v]) => [k, (v ?? 0) * n])) as Partial<Resources>;

function PackCard({ pack, unlocked, onOpened }: { pack: Pack; unlocked: boolean; onOpened: (o: PullOutcome) => void }) {
  const open = useGame((s) => s.openPack);
  const canAfford = useGame((s) => s.canAfford);
  const pity = useGame((s) => s.pity[pack.family]);
  const [info, setInfo] = useState(false);

  const colors =
    pack.zones.length === 1
      ? ZONES[pack.zones[0]].colors
      : pack.family === "world"
        ? ["#FF4F79", "#FFB627", "#2F9BFF"]
        : pack.family === "cosmic"
          ? ["#0B1033", "#3A2C7A", "#FF8A3D"]
          : ["#FFB627", "#3DBE6A", "#2F9BFF"];
  const go = (count: number, priceIndex: number) => {
    const outcome = open(pack.id, count, priceIndex);
    if (outcome) onOpened(outcome);
  };

  return (
    <div className={`card relative overflow-hidden ${unlocked ? "" : "opacity-60 grayscale"}`}>
      <div className="relative flex h-24 items-center justify-center gap-1" style={{ background: `linear-gradient(120deg, ${colors[0]}, ${colors[1]} 55%, ${colors[2]})` }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #fff 0 6px, transparent 7px), radial-gradient(circle at 80% 60%, #fff 0 4px, transparent 5px)" }} />
        {pack.zones.slice(0, 8).map((z) => (
          <ZoneFlag key={z} zone={z} size={pack.zones.length > 3 ? 30 : 44} />
        ))}
        <button className="btn btn-sm absolute right-2 top-2 !min-h-0 !px-2 !py-0.5" onClick={() => setInfo(true)} aria-label="Rates">
          <Info size={16} />
        </button>
        {pack.tier === 2 && <span className="badge absolute left-2 top-2 bg-[#1B2A6B] text-white">Tier 2</span>}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-extrabold">{pack.name}</span>
          <span className="flex items-center gap-1 text-xs text-text-muted num" title="Pulls until a guaranteed Legendary">
            <GameIcon name="pity" size={14} /> {pity}/{PITY_LIMIT}
          </span>
        </div>
        {!unlocked ? (
          <div className="flex items-center justify-center gap-2 py-2 font-bold text-text-muted">
            <Lock size={18} /> Clear stage {TIER2_UNLOCK_STAGE}
          </div>
        ) : (
          // One row per way of paying: the price of one bee, then ×1 / ×10 buttons.
          pack.prices.map((price, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-tile px-2 py-1 ${price.ticket ? "bg-accent/15" : "bg-canvas"}`}>
              <Cost cost={price} className="flex-1 flex-wrap text-sm font-bold" />
              <button className="btn btn-sm !px-3" disabled={!canAfford(price)} onClick={() => go(1, i)} title={`1 bee`}>
                ×1
              </button>
              <button className="btn btn-sm btn-primary !px-3" disabled={!canAfford(times(price, MULTI_COUNT))} onClick={() => go(MULTI_COUNT, i)} title={`10 bees (at least one Epic)`}>
                ×10
              </button>
            </div>
          ))
        )}
      </div>
      {info && <PackInfo pack={pack} onClose={() => setInfo(false)} />}
    </div>
  );
}

function PackInfo({ pack, onClose }: { pack: Pack; onClose: () => void }) {
  const bees = useGame((s) => s.bees);
  const pool = packPool(pack).sort((a, b) => b.rarity - a.rarity);
  return (
    <Modal onClose={onClose} wide>
      <h3 className="mb-3 text-lg font-extrabold">{pack.name}</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {displayRates(pack).map((r) => (
          <span key={r.rarity} className="chip num" style={{ borderColor: RARITY[r.rarity].color }} title={RARITY[r.rarity].name}>
            <RarityBadge rarity={r.rarity} /> {r.pct}%
          </span>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <span className="flex items-center gap-1">
          ×10 = at least <Stars count={4} size={12} color="#9B5DE5" />
        </span>
        <span className="flex items-center gap-1">
          <GameIcon name="pity" size={14} /> {PITY_LIMIT} = <Stars count={5} size={12} color="#FF6B3D" />
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {pool.map((b) => (
          <BeeTile key={b.id} id={b.id} owned={!!bees[b.id]} size={56} />
        ))}
      </div>
    </Modal>
  );
}
