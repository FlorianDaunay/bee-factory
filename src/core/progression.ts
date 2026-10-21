import { RARITY } from "./data/meta";
import type { BeeSpecies, Stats } from "./types";

/** What the player owns of one species. Duplicates become `dupes` (used to rank up). */
export interface OwnedBee {
  id: string;
  level: number;
  xp: number;
  /** Star rank 0..5 on top of rarity. */
  rank: number;
  dupes: number;
}

export const MAX_RANK = 5;
const GROWTH_PER_LEVEL = 0.06;
const RANK_BONUS = 0.08;

export function statsAt(species: BeeSpecies, level: number, rank: number): Stats {
  const m = (1 + (level - 1) * GROWTH_PER_LEVEL) * (1 + rank * RANK_BONUS);
  const b = species.base;
  return {
    hp: Math.round(b.hp * m),
    atk: Math.round(b.atk * m),
    def: Math.round(b.def * m),
    rec: Math.round(b.rec * m),
    // Speed grows slowly so turn order stays meaningful.
    spd: Math.round(b.spd * (1 + (level - 1) * 0.01 + rank * 0.02)),
  };
}

export const maxLevel = (species: BeeSpecies) => RARITY[species.rarity].maxLevel;

/** Pollen needed to go from `level` to `level + 1`. */
export const xpForLevel = (level: number) => Math.round(12 * level ** 1.35);

/** Silver cost of a level up. */
export const silverForLevel = (level: number) => 10 * level;

/** Duplicates needed to reach the next rank. */
export const dupesForRank = (rank: number) => rank + 1;

/** Silver cost of a rank up. */
export const silverForRank = (species: BeeSpecies, rank: number) => (rank + 1) * 150 * species.rarity;

export function newOwnedBee(id: string): OwnedBee {
  return { id, level: 1, xp: 0, rank: 0, dupes: 0 };
}

/** Power score used to sort and to show a single "strength" number. */
export function powerScore(s: Stats): number {
  return Math.round(s.hp / 5 + s.atk * 1.5 + s.def + s.rec * 0.8 + s.spd * 0.5);
}
