import { GameIcon } from "@/art/GameIcon";
import { ResourceIcon } from "@/art/icons";
import type { PerkId } from "@/core/types";

const TITLES: Record<PerkId, string> = {
  honey: "More honey",
  boost: "Hive boost",
  pollen: "Makes pollen",
  silver: "Makes silver",
  jelly: "Makes royal jelly",
};

/** What each hive perk does, at level 1 and no stars. */
export const PERK_TEXT: Record<PerkId, string> = {
  honey: "Honey: +20% more honey in its hive.",
  pollen: "Pollen: makes pollen, half as fast as the hive's base honey.",
  silver: "Silver: makes silver, 40% as fast as the hive's base honey.",
  jelly: "Royal jelly: slowly makes jelly (faster in big hives).",
  boost: "Boost: +15% to everything its hive makes.",
};

/** The hive perk of a bee, shown with the resource it boosts. */
export function PerkIcon({ perk, size = 16 }: { perk: PerkId; size?: number }) {
  return <span title={TITLES[perk]} className="inline-flex">{perk === "boost" ? <GameIcon name="boost" size={size} /> : <ResourceIcon id={perk} size={size} />}</span>;
}
