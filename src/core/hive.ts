import { beeById } from "./data/bees";
import type { Resources } from "./types";

export type HiveType = "skep" | "box" | "clay" | "crystal";

export interface HiveTypeInfo {
  name: string;
  /** Honey per minute at level 1. */
  rate: number;
  /** Storage (in minutes of production) at level 1. */
  hours: number;
  maxLevel: number;
  buildCost: Partial<Resources>;
  color: string;
}

export const HIVE_TYPES: Record<HiveType, HiveTypeInfo> = {
  skep: { name: "Straw Skep", rate: 1, hours: 2, maxLevel: 10, buildCost: { silver: 200 }, color: "#E9C46A" },
  box: { name: "Wooden Box", rate: 2.5, hours: 3, maxLevel: 15, buildCost: { silver: 1500, honey: 300 }, color: "#B5793B" },
  clay: { name: "Clay Pot", rate: 5, hours: 4, maxLevel: 20, buildCost: { silver: 6000, honey: 1200 }, color: "#D0784C" },
  crystal: { name: "Crystal Comb", rate: 10, hours: 6, maxLevel: 25, buildCost: { silver: 25000, honey: 5000, jelly: 5 }, color: "#8FD3FF" },
};

export const HIVE_ORDER: HiveType[] = ["skep", "box", "clay", "crystal"];
export const MAX_HIVES = 6;
export const WORKERS_PER_HIVE = 3;

export interface Hive {
  id: string;
  type: HiveType;
  level: number;
  /** Epoch ms of the last collection. */
  since: number;
  workers: string[];
}

const PERK_BONUS = { honey: 0.2, storage: 0.25 };

/** Honey per minute, including worker bees. */
export function hiveRate(hive: Hive): number {
  const t = HIVE_TYPES[hive.type];
  const workBonus = hive.workers.reduce((acc, id) => {
    const b = beeById(id);
    return acc + b.work / 100 + (b.perk === "honey" ? PERK_BONUS.honey : 0);
  }, 0);
  return t.rate * (1 + (hive.level - 1) * 0.25) * (1 + workBonus);
}

/** Maximum honey stored before collection. */
export function hiveCapacity(hive: Hive): number {
  const t = HIVE_TYPES[hive.type];
  const storageBonus = hive.workers.filter((id) => beeById(id).perk === "storage").length * PERK_BONUS.storage;
  const baseRate = t.rate * (1 + (hive.level - 1) * 0.25);
  return Math.round(baseRate * 60 * t.hours * (1 + storageBonus));
}

export function hiveStored(hive: Hive, now: number): number {
  const minutes = Math.max(0, now - hive.since) / 60000;
  return Math.min(hiveCapacity(hive), Math.floor(minutes * hiveRate(hive)));
}

/** Extra resources produced by worker perks, proportional to honey collected. */
export function hiveExtras(hive: Hive, honey: number): Partial<Resources> {
  const extras: Partial<Resources> = {};
  for (const id of hive.workers) {
    const perk = beeById(id).perk;
    if (perk === "pollen") extras.pollen = (extras.pollen ?? 0) + Math.floor(honey * 0.5);
    if (perk === "silver") extras.silver = (extras.silver ?? 0) + Math.floor(honey * 0.4);
    if (perk === "jelly") extras.jelly = (extras.jelly ?? 0) + Math.floor(honey / 400);
  }
  return extras;
}

export function upgradeCost(hive: Hive): Partial<Resources> | null {
  const t = HIVE_TYPES[hive.type];
  if (hive.level >= t.maxLevel) return null;
  const base = (t.buildCost.silver ?? 200) * 0.5;
  return { silver: Math.round(base * hive.level ** 1.3), honey: Math.round(20 * t.rate * hive.level ** 1.2) };
}
