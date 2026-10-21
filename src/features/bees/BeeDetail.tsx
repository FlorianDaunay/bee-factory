import { useEffect, useState } from "react";
import { ArrowUpCircle, Coins } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { GameIcon } from "@/art/GameIcon";
import { ResourceIcon, Stars, ZoneFlag } from "@/art/icons";
import { sfx } from "@/audio/sfx";
import { beeById } from "@/core/data/bees";
import { ELEMENTS, RARITY, ROLES, STATUSES, ZONES } from "@/core/data/meta";
import { MAX_RANK, dupesForRank, maxLevel, powerScore, silverForLevel, silverForRank, statsAt, xpForLevel } from "@/core/progression";
import type { Effect } from "@/core/types";
import { useGame } from "@/store/game";
import { beeWork } from "@/core/hive";
import { PerkIcon, PERK_TEXT } from "@/ui/PerkIcon";
import { STAT_INFO, StatsGuide } from "./StatsGuide";
import { Cost, FloatText, Modal, RarityBadge, fmt } from "@/ui/common";

const STAT_KEYS = ["hp", "atk", "def", "rec", "spd"] as const;
const STAT_NAMES = { hp: "Health", atk: "Attack", def: "Defense", rec: "Recovery", spd: "Speed" } as const;

export function BeeDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const owned = useGame((s) => s.bees[id]);
  const levelUp = useGame((s) => s.levelUp);
  const rankUp = useGame((s) => s.rankUp);
  const sellDupe = useGame((s) => s.sellDupe);
  const canAfford = useGame((s) => s.canAfford);
  const markSeen = useGame((s) => s.markSeen);
  const [pop, setPop] = useState(0);
  const [guide, setGuide] = useState(false);
  const sp = beeById(id);

  useEffect(() => markSeen(id), [id, markSeen]);
  if (!owned) return null;

  const stats = statsAt(sp, owned.level, owned.rank);
  const next = statsAt(sp, owned.level + 1, owned.rank);
  const atMax = owned.level >= maxLevel(sp);
  const lvlCost = { pollen: xpForLevel(owned.level), silver: silverForLevel(owned.level) };
  const rankCost = { silver: silverForRank(sp, owned.rank) };
  const needDupes = dupesForRank(owned.rank);
  const color = RARITY[sp.rarity].color;

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="relative rounded-card px-6 pt-2" style={{ background: `radial-gradient(circle, ${color}44, transparent 70%)` }}>
          <BeeSprite look={sp.look} rarity={sp.rarity} size={170} />
          {pop > 0 && (
            <FloatText key={pop} color="#3DBE6A">
              LV UP!
            </FloatText>
          )}
        </div>
        <h3 className="text-2xl font-extrabold">{sp.name}</h3>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          <RarityBadge rarity={sp.rarity} />
          <span className="chip !py-0.5">
            <ZoneFlag zone={sp.zone} size={18} /> {ZONES[sp.zone].name}
          </span>
          <span className="chip !py-0.5" style={{ borderColor: ELEMENTS[sp.element].color }}>
            <GameIcon name={sp.element} size={16} /> {ELEMENTS[sp.element].name}
          </span>
          <span className="chip !py-0.5">
            <GameIcon name={sp.role} size={16} /> {ROLES[sp.role].name}
          </span>
        </div>
        {sp.lore && <p className="mt-2 text-sm italic text-text-secondary">“{sp.lore}”</p>}
      </div>

      {/* level */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-lg font-extrabold num">Lv {owned.level}</span>
        <span className="text-sm text-text-muted num">/ {maxLevel(sp)}</span>
        <span className="ml-auto flex items-center gap-1 text-sm font-bold text-text-secondary num" title="Power">
          <GameIcon name="power" size={16} /> {fmt(powerScore(stats))}
        </span>
      </div>

      {/* stats */}
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {STAT_KEYS.map((k) => (
          <div key={k} className="flex items-center gap-1.5 rounded-tile bg-canvas px-2 py-1 num" title={STAT_INFO.find((s) => s.key === k)?.text}>
            <GameIcon name={k} size={20} />
            <span className="leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-text-muted">{STAT_NAMES[k]}</span>
              <span className="font-bold">{fmt(stats[k])}</span>
            </span>
            {!atMax && next[k] > stats[k] && <span className="ml-auto text-xs font-bold text-success">+{next[k] - stats[k]}</span>}
          </div>
        ))}
        <div className="flex items-center gap-1.5 rounded-tile bg-canvas px-2 py-1 num" title="Extra honey in its hive, and its perk">
          <GameIcon name="work" size={20} />
          <span className="leading-tight">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-text-muted">Hive work</span>
            <span className="font-bold">+{beeWork(id, owned)}%</span>
          </span>
          <span className="ml-auto">
            <PerkIcon perk={sp.perk} size={20} />
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-text-secondary">
        <span className="flex-1">
          {STAT_INFO.find((s) => s.key === "rec")?.text} {PERK_TEXT[sp.perk]}
        </span>
        <button className="btn btn-sm !min-h-0 shrink-0 !px-2 !py-0.5" onClick={() => setGuide(true)}>
          <GameIcon name="info" size={16} /> Guide
        </button>
      </div>

      {!atMax && (
        <button
          className="btn btn-primary mt-3 w-full"
          disabled={!canAfford(lvlCost)}
          onClick={() => {
            if (levelUp(id)) {
              setPop(Date.now());
              sfx("sparkle");
            }
          }}
        >
          <ArrowUpCircle size={20} /> Level up <Cost cost={lvlCost} />
        </button>
      )}

      {/* burst */}
      <div className="mt-4 rounded-tile border-2 p-3" style={{ borderColor: color }}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-extrabold"><GameIcon name="crit" size={20} /> {sp.burst.name}</span>
          <span className="flex items-center gap-0.5 text-xs text-text-muted num" title="Gauge needed"><GameIcon name="gauge" size={14} />{sp.gaugeMax}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {sp.burst.effects.map((e, i) => (
            <EffectChip key={i} e={e} />
          ))}
        </div>
        {!!sp.burst.riders?.length && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs font-bold text-text-muted">
              <GameIcon name={sp.element} size={14} /> {ELEMENTS[sp.element].name} bonus
            </span>
            {sp.burst.riders.map((e, i) => (
              <EffectChip key={i} e={e} />
            ))}
          </div>
        )}
      </div>

      {/* rank */}
      <div className="mt-4 flex items-center gap-2">
        <Stars count={owned.rank} max={MAX_RANK} size={18} color={color} />
        <span className="ml-auto flex items-center gap-1 text-sm font-bold num" title="Duplicates">
          <GameIcon name="bees" size={18} /> ×{owned.dupes}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button className="btn btn-sm" disabled={owned.rank >= MAX_RANK || owned.dupes < needDupes || !canAfford(rankCost)} onClick={() => rankUp(id) && sfx("fanfare")}>
          <Stars count={1} max={1} size={16} color={color} /> {owned.dupes}/{needDupes} <Cost cost={rankCost} />
        </button>
        <button className="btn btn-sm" disabled={owned.dupes <= 0} onClick={() => sellDupe(id) && sfx("coin")}>
          <Coins size={16} /> Sell <ResourceIcon id="silver" size={16} />
          {RARITY[sp.rarity].sell}
        </button>
      </div>
      {guide && <StatsGuide onClose={() => setGuide(false)} />}
    </Modal>
  );
}

const TARGET_LABEL = { one: "1 foe", all: "all foes", team: "team", self: "self", lowest: "weakest ally" } as const;

function EffectChip({ e }: { e: Effect }) {
  switch (e.t) {
    case "damage":
      return (
        <span className="chip !py-0.5">
          <GameIcon name="atk" size={14} /> ×{e.power.toFixed(1)} · {TARGET_LABEL[e.target]} · {e.hits} hits
        </span>
      );
    case "heal":
      return <span className="chip !py-0.5"><GameIcon name="heal" size={14} /> heal {TARGET_LABEL[e.target]}</span>;
    case "status":
      return (
        <span className="chip !py-0.5" style={{ borderColor: STATUSES[e.status].color }}>
          <GameIcon name={e.status} size={14} /> {STATUSES[e.status].name} · {TARGET_LABEL[e.target]} {e.chance < 1 ? `${Math.round(e.chance * 100)}%` : ""} · {e.turns}t
        </span>
      );
    case "gauge":
      return <span className="chip !py-0.5"><GameIcon name="gauge" size={14} /> +{e.amount} team</span>;
    case "cleanse":
      return <span className="chip !py-0.5"><GameIcon name="cleanse" size={14} /> cleanse team</span>;
  }
}
