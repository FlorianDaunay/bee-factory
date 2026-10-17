import type { ItemId, Resources } from "./types";

/** Consumables are crafted from hive honey and silver. */
export const RECIPES: Record<ItemId, Partial<Resources>> = {
  honeyDrop: { honey: 30, silver: 40 },
  honeyJar: { honey: 120, silver: 150 },
  mint: { honey: 20, silver: 60 },
  candy: { honey: 80, silver: 200 },
  royalJelly: { honey: 200, jelly: 1 },
};

/** Max of each item the player can bring into one battle. */
export const BATTLE_ITEM_LIMIT = 5;
