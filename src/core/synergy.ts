import { ZONES } from "./data/meta";
import type { BeeSpecies, BonusKind, Continent, Element, ZoneId } from "./types";

export type TeamBonus = Record<BonusKind, number>;

export interface ZoneSynergy {
  zone: ZoneId;
  count: number;
  /** 0 = inactive, 1 = 2 bees, 2 = 3 bees, 3 = 4-5 bees (+ passive), 4 = 6 bees (homeland). */
  tier: number;
  pct: number;
  kind: BonusKind;
}

export interface Synergies {
  zones: ZoneSynergy[];
  continents: { continent: Continent; count: number; active: boolean }[];
  bonus: TeamBonus;
  /** Zones whose 4-bee passive is active. */
  passives: ZoneId[];
  homeland: ZoneId | null;
  /** Every bee of the team (3 or more) shares this element: bonus to attack, health and gauge. */
  unity: { element: Element; pct: number } | null;
}

/** Element unity bonus in %: +10% with 3-5 bees of one element, +20% with a full team of 6. */
export const unityPct = (count: number) => (count >= 6 ? 20 : count >= 3 ? 10 : 0);

export const emptyBonus = (): TeamBonus => ({ hp: 0, atk: 0, def: 0, rec: 0, spd: 0, crit: 0, gauge: 0, status: 0 });

export function tierFor(count: number): number {
  if (count >= 6) return 4;
  if (count >= 4) return 3;
  if (count === 3) return 2;
  if (count === 2) return 1;
  return 0;
}

const TIER_MULT = [0, 1, 2, 4, 4];

export function computeSynergies(team: BeeSpecies[]): Synergies {
  // A species only counts once (teams cannot hold duplicates anyway).
  const unique = [...new Map(team.map((b) => [b.id, b])).values()];
  const zoneCounts = new Map<ZoneId, number>();
  const contCounts = new Map<Continent, number>();
  for (const b of unique) {
    zoneCounts.set(b.zone, (zoneCounts.get(b.zone) ?? 0) + 1);
    const c = ZONES[b.zone].continent;
    contCounts.set(c, (contCounts.get(c) ?? 0) + 1);
  }

  const bonus = emptyBonus();
  const zones: ZoneSynergy[] = [];
  const passives: ZoneId[] = [];
  let homeland: ZoneId | null = null;

  for (const [zone, count] of zoneCounts) {
    const z = ZONES[zone];
    const tier = tierFor(count);
    const pct = z.bonus.pct * TIER_MULT[tier];
    bonus[z.bonus.kind] += pct;
    if (tier >= 3) passives.push(zone);
    if (tier === 4) {
      homeland = zone;
      for (const k of ["hp", "atk", "def", "rec"] as const) bonus[k] += 15;
    }
    zones.push({ zone, count, tier, pct, kind: z.bonus.kind });
  }

  const continents = [...contCounts].map(([continent, count]) => ({ continent, count, active: count >= 3 && continent !== "home" }));
  for (const c of continents) if (c.active) bonus.hp += 5;

  let unity: Synergies["unity"] = null;
  const elements = new Set(unique.map((b) => b.element));
  if (elements.size === 1 && unityPct(unique.length) > 0) {
    unity = { element: unique[0].element, pct: unityPct(unique.length) };
    bonus.atk += unity.pct;
    bonus.hp += unity.pct;
    bonus.gauge += unity.pct;
  }

  zones.sort((a, b) => b.count - a.count);
  return { zones, continents, bonus, passives, homeland, unity };
}
