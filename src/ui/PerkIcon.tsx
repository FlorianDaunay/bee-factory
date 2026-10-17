import { GameIcon } from "@/art/GameIcon";
import { ResourceIcon } from "@/art/icons";
import type { PerkId } from "@/core/types";

const TITLES: Record<PerkId, string> = {
  honey: "More honey",
  storage: "Bigger storage",
  pollen: "Makes pollen",
  silver: "Makes silver",
  jelly: "Royal jelly chance",
};

/** The hive perk of a bee, shown with the resource it boosts. */
export function PerkIcon({ perk, size = 16 }: { perk: PerkId; size?: number }) {
  return <span title={TITLES[perk]} className="inline-flex">{perk === "storage" ? <GameIcon name="storage" size={size} /> : <ResourceIcon id={perk} size={size} />}</span>;
}
