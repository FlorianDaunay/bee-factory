import { BEES } from "./data/bees";
import { ZONES } from "./data/meta";
import { Rng } from "./rng";
import type { BeeSpecies, Continent, Rarity, Resources, ZoneId } from "./types";

export type PackFamily = "country" | "continent" | "world";

export interface Pack {
  id: string;
  family: PackFamily;
  name: string;
  zones: ZoneId[];
  /** Alternative prices: the player pays one of them. */
  prices: Partial<Resources>[];
  /** Minimum rarity guaranteed for a single pull. */
  floor: Rarity;
  /** Rarity weights in percent (index 0 = Common). */
  rates: number[];
}

const EARTH_RATES = [50, 28, 15, 5.5, 1.3, 0.2];
const CONTINENT_RATES = [40, 30, 19, 8.5, 2.1, 0.4];
const WORLD_RATES = [0, 0, 75, 19, 5, 1];

export const PITY_LIMIT = 80;
export const MULTI_COUNT = 10;

const EARTH_ZONES: ZoneId[] = ["fr", "jp", "de", "eg", "it", "in", "br", "us"];

const CONTINENT_NAMES: Record<Exclude<Continent, "home" | "space">, string> = {
  europe: "Europe",
  asia: "Asia",
  africa: "Africa",
  americas: "Americas",
};

export const PACKS: Pack[] = [
  ...EARTH_ZONES.map<Pack>((z) => ({
    id: `country-${z}`,
    family: "country",
    name: ZONES[z].name,
    zones: [z],
    prices: [{ honey: 100 }, { silver: 400 }],
    floor: 1,
    rates: EARTH_RATES,
  })),
  ...(Object.keys(CONTINENT_NAMES) as (keyof typeof CONTINENT_NAMES)[]).map<Pack>((c) => ({
    id: `continent-${c}`,
    family: "continent",
    name: CONTINENT_NAMES[c],
    zones: EARTH_ZONES.filter((z) => ZONES[z].continent === c),
    prices: [{ honey: 120, silver: 300 }],
    floor: 1,
    rates: CONTINENT_RATES,
  })),
  {
    id: "world",
    family: "world",
    name: "World",
    zones: EARTH_ZONES,
    prices: [{ honey: 300, silver: 800, jelly: 1 }],
    floor: 3,
    rates: WORLD_RATES,
  },
];

export const packById = (id: string) => PACKS.find((p) => p.id === id);

export function packPool(pack: Pack): BeeSpecies[] {
  return BEES.filter((b) => !b.unpullable && pack.zones.includes(b.zone));
}

export type Pity = Record<PackFamily, number>;
export const emptyPity = (): Pity => ({ country: 0, continent: 0, world: 0 });

function rollRarity(rng: Rng, rates: number[], available: Set<Rarity>, floor: Rarity): Rarity {
  const weights = rates.map((w, i) => ((i + 1) >= floor && available.has((i + 1) as Rarity) ? w : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) return (i + 1) as Rarity;
  }
  // Fallback: highest available at or above floor.
  return [...available].filter((r) => r >= floor).sort((a, b) => b - a)[0] ?? 1;
}

export interface PullResult {
  bees: BeeSpecies[];
  pity: Pity;
  rngState: number;
}

/**
 * Pulls `count` bees from a pack. A multi-pull guarantees at least one Epic; the pity counter
 * guarantees a Legendary or better after PITY_LIMIT pulls without one (per pack family).
 */
export function pull(pack: Pack, count: number, pity: Pity, rngState: number): PullResult {
  const rng = new Rng(rngState);
  const pool = packPool(pack);
  const available = new Set(pool.map((b) => b.rarity));
  const nextPity = { ...pity };
  const bees: BeeSpecies[] = [];

  for (let i = 0; i < count; i++) {
    let floor = pack.floor;
    const pityHit = nextPity[pack.family] + 1 >= PITY_LIMIT;
    if (pityHit) floor = Math.max(floor, 5) as Rarity;
    const lastOfMulti = count >= MULTI_COUNT && i === count - 1 && !bees.some((b) => b.rarity >= 4);
    if (lastOfMulti) floor = Math.max(floor, 4) as Rarity;
    if (![...available].some((r) => r >= floor)) floor = Math.max(...available) as Rarity;

    const rarity = rollRarity(rng, pack.rates, available, floor);
    const candidates = pool.filter((b) => b.rarity === rarity);
    bees.push(rng.pick(candidates));
    nextPity[pack.family] = rarity >= 5 ? 0 : nextPity[pack.family] + 1;
  }
  return { bees, pity: nextPity, rngState: rng.state };
}

/** Effective drop rates of a pack, only counting rarities it actually contains. */
export function displayRates(pack: Pack): { rarity: Rarity; pct: number }[] {
  const available = new Set(packPool(pack).map((b) => b.rarity));
  const entries = pack.rates
    .map((w, i) => ({ rarity: (i + 1) as Rarity, w: available.has((i + 1) as Rarity) && i + 1 >= pack.floor ? w : 0 }))
    .filter((e) => e.w > 0);
  const total = entries.reduce((a, e) => a + e.w, 0);
  return entries.map((e) => ({ rarity: e.rarity, pct: Math.round((e.w / total) * 1000) / 10 }));
}
