import { Lock } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { GameIcon } from "@/art/GameIcon";
import { EnemySprite } from "@/art/EnemySprite";
import { beeById } from "@/core/data/bees";

/** PvP arena: real-time duels between friends (peer-to-peer). Coming in a later milestone. */
export function ArenaScreen() {
  const a = beeById("jp-raiden");
  const b = beeById("fr-mousquetaire");
  return (
    <div className="card flex flex-col items-center gap-3 p-6 text-center">
      <div className="flex items-end gap-4">
        <BeeSprite look={a.look} rarity={a.rarity} size={110} />
        <span className="mb-10 text-4xl font-black">VS</span>
        <div style={{ transform: "scaleX(-1)" }}>
          <BeeSprite look={b.look} rarity={b.rarity} size={110} />
        </div>
      </div>
      <h2 className="flex items-center gap-2 text-2xl font-extrabold"><GameIcon name="arena" size={30} /> Arena</h2>
      <p className="max-w-sm text-text-secondary">Real-time duels against your friends. Share a room code, pick your six, and plan your turns at the same time.</p>
      <span className="badge bg-accent/20 text-base"><Lock size={14} /> Soon</span>
      <div className="opacity-30">
        <EnemySprite kind="hornet" tint="#7D6E9A" size={60} animated={false} />
      </div>
    </div>
  );
}
