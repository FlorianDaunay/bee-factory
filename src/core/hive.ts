import { beeById } from "./data/bees";
import type { OwnedBee } from "./progression";
import type { ResourceId, Resources } from "./types";

export type HiveType = "skep" | "box" | "clay" | "crystal";

export interface HiveTypeInfo {
  name: string;
  /** Honey per minute at level 1. */
  rate: number;
  maxLevel: number;
  buildCost: Partial<Resources>;
  color: string;
}

export const HIVE_TYPES: Record<HiveType, HiveTypeInfo> = {
  skep: { name: "Straw Skep", rate: 1, maxLevel: 10, buildCost: { silver: 200 }, color: "#E9C46A" },
  box: { name: "Wooden Box", rate: 2.5, maxLevel: 15, buildCost: { silver: 1500, honey: 300 }, color: "#B5793B" },
  clay: { name: "Clay Pot", rate: 5, maxLevel: 20, buildCost: { silver: 6000, honey: 1200 }, color: "#D0784C" },
  crystal: { name: "Crystal Comb", rate: 10, maxLevel: 25, buildCost: { silver: 25000, honey: 5000, jelly: 5 }, color: "#8FD3FF" },
};

export const HIVE_ORDER: HiveType[] = ["skep", "box", "clay", "crystal"];
export const MAX_HIVES = 6;
export const WORKERS_PER_HIVE = 3;

export interface Hive {
  id: string;
  type: HiveType;
  level: number;
  /** Epoch ms of the last collection. Only read when migrating saves from before direct income. */
  since?: number;
  workers: string[];
}

/** What a hive makes per minute. Honey always, the rest only with the right worker perks. */
export type HiveRates = Record<Exclude<ResourceId, "ticket">, number>;
export const HIVE_RESOURCES: (keyof HiveRates)[] = ["honey", "pollen", "silver", "jelly"];
const zeroRates = (): HiveRates => ({ honey: 0, pollen: 0, silver: 0, jelly: 0 });

/** Perk strength at level 1, rank 0 (fractions of the hive's base honey rate). */
export const PERK_POWER = { honey: 0.2, pollen: 0.5, silver: 0.4, jelly: 1 / 400, boost: 0.15 };

/**
 * How much a worker's level and stars multiply its hive work and perk:
 * +4% per level and +15% per star, so training a bee pays off in the hive too.
 */
export function workMultiplier(owned: Pick<OwnedBee, "level" | "rank"> | undefined): number {
  if (!owned) return 1;
  return 1 + (owned.level - 1) * 0.04 + owned.rank * 0.15;
}

/** Honey/min of the hive alone, before workers. */
export const hiveBaseRate = (hive: Hive) => HIVE_TYPES[hive.type].rate * (1 + (hive.level - 1) * 0.25);

/** Work bonus of one bee in percent of the hive's honey, at its level and rank. */
export function beeWork(id: string, owned: Pick<OwnedBee, "level" | "rank"> | undefined): number {
  return Math.round(beeById(id).work * workMultiplier(owned) * 10) / 10;
}

/** Resources per minute made by a hive with its current workers. */
export function hiveRates(hive: Hive, bees: Record<string, Pick<OwnedBee, "level" | "rank">>): HiveRates {
  const base = hiveBaseRate(hive);
  const r = zeroRates();
  let honeyMult = 1;
  let boost = 1;
  for (const id of hive.workers) {
    const sp = beeById(id);
    const m = workMultiplier(bees[id]);
    honeyMult += (sp.work / 100) * m;
    switch (sp.perk) {
      case "honey":
        honeyMult += PERK_POWER.honey * m;
        break;
      case "pollen":
        r.pollen += base * PERK_POWER.pollen * m;
        break;
      case "silver":
        r.silver += base * PERK_POWER.silver * m;
        break;
      case "jelly":
        r.jelly += base * PERK_POWER.jelly * m;
        break;
      case "boost":
        boost += PERK_POWER.boost * m;
        break;
    }
  }
  r.honey = base * honeyMult;
  for (const k of HIVE_RESOURCES) r[k] *= boost;
  return r;
}

/** All hives together, per minute. */
export function totalRates(hives: Hive[], bees: Record<string, Pick<OwnedBee, "level" | "rank">>): HiveRates {
  const sum = zeroRates();
  for (const h of hives) {
    const r = hiveRates(h, bees);
    for (const k of HIVE_RESOURCES) sum[k] += r[k];
  }
  return sum;
}

/**
 * Income for `minutes` of work, split into whole units paid now and the fractions carried over
 * to the next tick (so slow resources like royal jelly still add up second by second).
 */
export function income(rates: HiveRates, minutes: number, carry: Partial<HiveRates>): { paid: Partial<Resources>; carry: HiveRates } {
  const paid: Partial<Resources> = {};
  const next = zeroRates();
  for (const k of HIVE_RESOURCES) {
    const exact = (carry[k] ?? 0) + rates[k] * Math.max(0, minutes);
    const whole = Math.floor(exact);
    if (whole > 0) paid[k] = whole;
    next[k] = exact - whole;
  }
  return { paid, carry: next };
}

export function upgradeCost(hive: Hive): Partial<Resources> | null {
  const t = HIVE_TYPES[hive.type];
  if (hive.level >= t.maxLevel) return null;
  const base = (t.buildCost.silver ?? 200) * 0.5;
  return { silver: Math.round(base * hive.level ** 1.3), honey: Math.round(20 * t.rate * hive.level ** 1.2) };
}

/** Hive slots: 3 to start with, 3 more can be bought one by one. */
export const START_HIVE_SLOTS = 3;

/** Price of the next hive slot, or null when all slots are open. */
export function slotCost(currentSlots: number): Partial<Resources> | null {
  const costs: Partial<Resources>[] = [{ silver: 2000 }, { silver: 8000, honey: 1000 }, { silver: 25000, honey: 4000, jelly: 3 }];
  return costs[currentSlots - START_HIVE_SLOTS] ?? null;
}

/** Selling gives back half of what the hive cost (building + upgrades). */
export function hiveSellValue(hive: Hive): Partial<Resources> {
  const total: Partial<Resources> = { ...HIVE_TYPES[hive.type].buildCost };
  for (let level = 1; level < hive.level; level++) {
    const c = upgradeCost({ ...hive, level }) ?? {};
    for (const [k, v] of Object.entries(c) as [keyof Resources, number][]) total[k] = (total[k] ?? 0) + v;
  }
  return Object.fromEntries(Object.entries(total).map(([k, v]) => [k, Math.floor((v ?? 0) / 2)]).filter(([, v]) => (v as number) > 0));
}

/**
 * Honey a hive held when saves still had storage (old rules: base rate with workers, capped at
 * a few hours). Paid once when such a save is loaded, so nothing waiting in a hive is lost.
 */
export function legacyStored(hive: Hive, now: number): number {
  if (!hive.since) return 0;
  const hours = { skep: 2, box: 3, clay: 4, crystal: 6 }[hive.type];
  const minutes = Math.min(Math.max(0, now - hive.since) / 60000, hours * 60);
  const work = hive.workers.reduce((a, id) => a + beeById(id).work / 100, 0);
  return Math.floor(minutes * hiveBaseRate(hive) * (1 + work));
}

/** How much one unit of each resource counts when comparing workers (scaled to its rate vs honey). */
const RESOURCE_WEIGHT: HiveRates = { honey: 1, pollen: 1 / PERK_POWER.pollen, silver: 1 / PERK_POWER.silver, jelly: 1 / PERK_POWER.jelly };

/** Value of a hive's output for the chosen resources only. */
export function focusScore(rates: HiveRates, focus: (keyof HiveRates)[]): number {
  return focus.reduce((a, k) => a + rates[k] * RESOURCE_WEIGHT[k], 0);
}

/**
 * Best workers for the resources the player cares about. Biggest hives are filled first; each
 * slot takes the free bee that adds the most of the chosen resources to that hive. Slots no bee
 * can help with are then filled with the best all-round workers, so no slot stays idle.
 */
export function bestWorkers(hives: Hive[], bees: Record<string, Pick<OwnedBee, "level" | "rank">>, focus: (keyof HiveRates)[]): Record<string, string[]> {
  const free = new Set(Object.keys(bees));
  const out = fillWorkers(hives, bees, focus, free, {});
  return focus.length < HIVE_RESOURCES.length ? fillWorkers(hives, bees, HIVE_RESOURCES, free, out) : out;
}

function fillWorkers(
  hives: Hive[],
  bees: Record<string, Pick<OwnedBee, "level" | "rank">>,
  focus: (keyof HiveRates)[],
  free: Set<string>,
  start: Record<string, string[]>,
): Record<string, string[]> {
  const order = [...hives].sort((a, b) => hiveBaseRate(b) - hiveBaseRate(a));
  const out: Record<string, string[]> = { ...start };
  for (const h of order) {
    const workers: string[] = [...(start[h.id] ?? [])];
    for (let slot = workers.length; slot < WORKERS_PER_HIVE && free.size; slot++) {
      const base = focusScore(hiveRates({ ...h, workers }, bees), focus);
      let best: string | null = null;
      let bestGain = 0;
      for (const id of free) {
        const gain = focusScore(hiveRates({ ...h, workers: [...workers, id] }, bees), focus) - base;
        if (gain > bestGain) {
          best = id;
          bestGain = gain;
        }
      }
      // No bee adds anything to the chosen resources: leave the slot empty.
      if (!best) break;
      workers.push(best);
      free.delete(best);
    }
    out[h.id] = workers;
  }
  return out;
}
