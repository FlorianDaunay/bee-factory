import { useState } from "react";
import { Info, Lock } from "lucide-react";
import { GameIcon, type IconName } from "@/art/GameIcon";
import { Stars, ZoneFlag } from "@/art/icons";
import { RARITY, ZONES } from "@/core/data/meta";
import { MULTI_COUNT, PACKS, PITY_LIMIT, displayRates, packPool, type Pack } from "@/core/gacha";
import { packUnlocked } from "@/core/unlocks";
import { useGame, type PullOutcome } from "@/store/game";
import { BeeTile, Cost, Modal, RarityBadge } from "@/ui/common";
import { PackOpening } from "./PackOpening";

export function SummonScreen() {
  const cleared = useGame((s) => s.cleared);
  const [result, setResult] = useState<{ pack: Pack; outcome: PullOutcome } | null>(null);
  const families: { title: string; icon: IconName; packs: Pack[] }[] = [
    { title: "Countries", icon: "summon", packs: PACKS.filter((p) => p.family === "country") },
    { title: "Continents", icon: "globe", packs: PACKS.filter((p) => p.family === "continent") },
    { title: "World", icon: "support", packs: PACKS.filter((p) => p.family === "world") },
  ];

  return (
    <div className="space-y-5">
      {families.map((f) => (
        <section key={f.title} className="space-y-2">
          <h2 className="flex items-center gap-2 text-xl font-extrabold"><GameIcon name={f.icon} size={26} /> {f.title}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {f.packs.map((p) => (
              <PackCard key={p.id} pack={p} unlocked={packUnlocked(cleared, p)} onOpened={(outcome) => setResult({ pack: p, outcome })} />
            ))}
          </div>
        </section>
      ))}
      {result && <PackOpening pack={result.pack} outcome={result.outcome} onClose={() => setResult(null)} />}
    </div>
  );
}

function PackCard({ pack, unlocked, onOpened }: { pack: Pack; unlocked: boolean; onOpened: (o: PullOutcome) => void }) {
  const open = useGame((s) => s.openPack);
  const canAfford = useGame((s) => s.canAfford);
  const freePack = useGame((s) => s.freePack);
  const pity = useGame((s) => s.pity[pack.family]);
  const [info, setInfo] = useState(false);

  const colors = pack.zones.length === 1 ? ZONES[pack.zones[0]].colors : pack.family === "world" ? ["#FF4F79", "#FFB627", "#2F9BFF"] : ["#FFB627", "#3DBE6A", "#2F9BFF"];
  const isFree = freePack && pack.id === "country-fr";
  const go = (count: number, priceIndex: number | "free") => {
    const outcome = open(pack.id, count, priceIndex);
    if (outcome) onOpened(outcome);
  };

  return (
    <div className={`card relative overflow-hidden ${unlocked ? "" : "opacity-60 grayscale"}`}>
      <div className="relative flex h-24 items-center justify-center gap-1" style={{ background: `linear-gradient(120deg, ${colors[0]}, ${colors[1]} 55%, ${colors[2]})` }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #fff 0 6px, transparent 7px), radial-gradient(circle at 80% 60%, #fff 0 4px, transparent 5px)" }} />
        {pack.zones.slice(0, 8).map((z) => (
          <ZoneFlag key={z} zone={z} size={pack.zones.length > 3 ? 26 : 44} />
        ))}
        <button className="btn btn-sm absolute right-2 top-2 !min-h-0 !px-2 !py-0.5" onClick={() => setInfo(true)} aria-label="Rates">
          <Info size={16} />
        </button>
        {isFree && <span className="badge absolute left-2 top-2 animate-pop bg-danger text-white">FREE!</span>}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-extrabold">{pack.name}</span>
          <span className="flex items-center gap-1 text-xs text-text-muted num" title="Pulls until a guaranteed Legendary">
            <GameIcon name="pity" size={14} /> {pity}/{PITY_LIMIT}
          </span>
        </div>
        {!unlocked ? (
          <div className="flex items-center justify-center gap-2 py-2 font-bold text-text-muted"><Lock size={18} /> <GameIcon name="story" size={22} /> Unlock in story</div>
        ) : isFree ? (
          <button className="btn btn-primary w-full animate-pop" onClick={() => go(1, "free")}>
            <GameIcon name="summon" size={22} /> Open free!
          </button>
        ) : (
          pack.prices.map((price, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <button className="btn btn-sm" disabled={!canAfford(price)} onClick={() => go(1, i)}>
                ×1 <Cost cost={price} />
              </button>
              <button className="btn btn-sm btn-primary" disabled={!canAfford(Object.fromEntries(Object.entries(price).map(([k, v]) => [k, (v ?? 0) * MULTI_COUNT])))} onClick={() => go(MULTI_COUNT, i)}>
                ×10 <Cost cost={price} multiplier={MULTI_COUNT} />
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
          <span key={r.rarity} className="chip num" style={{ borderColor: RARITY[r.rarity].color }}>
            <RarityBadge rarity={r.rarity} /> {r.pct}%
          </span>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <span className="flex items-center gap-1">×10 = at least <Stars count={4} size={12} color="#9B5DE5" /></span>
        <span className="flex items-center gap-1"><GameIcon name="pity" size={14} /> {PITY_LIMIT} = <Stars count={5} size={12} color="#FF6B3D" /></span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {pool.map((b) => (
          <BeeTile key={b.id} id={b.id} owned={!!bees[b.id]} size={56} />
        ))}
      </div>
    </Modal>
  );
}
