import { useNavigate } from "react-router-dom";
import { ArrowUpCircle, Map as MapIcon, Play, RotateCcw } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { GameIcon } from "@/art/GameIcon";
import { ResourceIcon, Stars } from "@/art/icons";
import { beeById } from "@/core/data/bees";
import { ITEMS } from "@/core/data/meta";
import { starRules, type Stage } from "@/core/data/story";
import type { ItemId, ResourceId } from "@/core/types";
import { nextStage } from "@/core/unlocks";
import { useGame, type BattleOutcome } from "@/store/game";
import { fmt } from "@/ui/common";

export function BattleResult({ stageId, stage, outcome, stars, checks }: { stageId: string; stage: Stage; outcome: BattleOutcome; stars: number; checks: boolean[] }) {
  const navigate = useNavigate();
  const cleared = useGame((s) => s.cleared);
  const next = nextStage(cleared);
  const pip = beeById("pip");

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade">
      <div className="card w-full max-w-sm p-5 text-center text-text-primary animate-pop">
        <div className="-mt-16 flex justify-center">
          <BeeSprite look={{ ...pip.look, eyes: outcome.won ? "happy" : "sleepy" }} rarity={outcome.won ? 5 : 1} size={130} />
        </div>
        <div className="text-3xl font-black">{outcome.won ? "VICTORY!" : "Defeat…"}</div>
        {outcome.won && (
          <>
            <div className="mt-1 flex justify-center">
              <Stars count={stars} max={3} size={34} />
            </div>
            <ul className="mx-auto mt-1 inline-block space-y-0.5 text-left text-sm">
              {starRules(stage).map((rule, i) => (
                <li key={i} className={`flex items-center gap-1.5 ${checks[i] ? "font-bold" : "text-text-muted line-through"}`}>
                  <Stars count={checks[i] ? 1 : 0} max={1} size={14} /> {rule}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* the chest */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {(Object.entries(outcome.rewards) as [ResourceId, number][])
            .filter(([, v]) => v > 0)
            .map(([k, v], i) => (
              <span key={k} className="chip animate-pop text-lg num" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                <ResourceIcon id={k} size={22} />+{fmt(v)}
              </span>
            ))}
          {Object.entries(outcome.items).map(([k, v], i) => (
            <span key={k} className="chip animate-pop text-lg num" style={{ animationDelay: `${0.6 + i * 0.12}s` }}>
              <GameIcon name={k as ItemId} size={22} title={ITEMS[k as ItemId].name} />+{v}
            </span>
          ))}
        </div>
        {outcome.firstClear && <div className="mt-2 flex items-center justify-center gap-1 text-sm font-bold text-accent"><GameIcon name="chest" size={18} /> First clear bonus!</div>}

        <div className="mt-5 grid gap-2">
          {outcome.won && !stage.event && next && next.id !== stageId && (
            <button className="btn btn-primary text-lg" onClick={() => navigate(`/battle/${next.id}`)}>
              <Play size={20} fill="currentColor" /> {next.id}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={() => navigate(`/battle/${stageId}`)}>
              <RotateCcw size={18} /> Retry
            </button>
            <button className="btn" onClick={() => navigate(outcome.won ? "/story" : "/bees")}>
              {outcome.won ? (
                <>
                  <MapIcon size={18} /> Map
                </>
              ) : (
                <>
                  <ArrowUpCircle size={18} /> Train
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
