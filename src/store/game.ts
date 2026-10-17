import { create } from "zustand";
import { persist } from "zustand/middleware";
import { beeById } from "@/core/data/bees";
import { STAGES } from "@/core/data/story";
import { RARITY } from "@/core/data/meta";
import { emptyPity, packById, pull, type Pity } from "@/core/gacha";
import {
  HIVE_TYPES,
  MAX_HIVES,
  START_HIVE_SLOTS,
  WORKERS_PER_HIVE,
  hiveExtras,
  hiveSellValue,
  hiveStored,
  slotCost,
  upgradeCost,
  type Hive,
  type HiveType,
} from "@/core/hive";
import { RECIPES } from "@/core/kitchen";
import {
  MAX_RANK,
  dupesForRank,
  maxLevel,
  newOwnedBee,
  silverForLevel,
  silverForRank,
  xpForLevel,
  type OwnedBee,
} from "@/core/progression";
import { Rng, randomSeed } from "@/core/rng";
import type { BeeSpecies, ItemId, ResourceId, Resources } from "@/core/types";
import { packUnlocked } from "@/core/unlocks";

export const TEAM_SIZE = 6;
const SAVE_VERSION = 1;

export interface GameSave {
  resources: Resources;
  bees: Record<string, OwnedBee>;
  team: (string | null)[];
  hives: Hive[];
  items: Record<ItemId, number>;
  cleared: Record<string, number>;
  pity: Pity;
  rng: number;
  /** Hive slots unlocked (3 at start, up to MAX_HIVES). */
  hiveSlots: number;
  /** Bees pulled but not yet looked at in the collection. */
  fresh: string[];
}

export interface PullOutcome {
  bees: BeeSpecies[];
  /** Ids that were new to the collection. */
  firsts: string[];
}

export interface BattleOutcome {
  won: boolean;
  stars: number;
  rewards: Partial<Resources>;
  firstClear: boolean;
  items: Partial<Record<ItemId, number>>;
}

interface Actions {
  canAfford: (cost: Partial<Resources>) => boolean;
  collectHive: (id: string) => number;
  collectAll: () => number;
  upgradeHive: (id: string) => boolean;
  buildHive: (type: HiveType) => boolean;
  sellHive: (id: string) => boolean;
  buyHiveSlot: () => boolean;
  setWorker: (hiveId: string, slot: number, beeId: string | null) => void;
  openPack: (packId: string, count: number, priceIndex: number) => PullOutcome | null;
  levelUp: (id: string) => boolean;
  rankUp: (id: string) => boolean;
  sellDupe: (id: string) => boolean;
  setTeamSlot: (slot: number, id: string | null) => void;
  craft: (item: ItemId) => boolean;
  finishBattle: (stageId: string, won: boolean, stars: number, itemsUsed: Partial<Record<ItemId, number>>) => BattleOutcome;
  markSeen: (id: string) => void;
  importSave: (json: string) => boolean;
  reset: () => void;
}

export const STARTING_TICKETS = 50;

export function newSave(now = Date.now()): GameSave {
  return {
    // New accounts start with 50 free pack tickets, usable on any pack.
    resources: { honey: 150, silver: 600, pollen: 200, jelly: 0, ticket: STARTING_TICKETS },
    bees: { pip: newOwnedBee("pip") },
    team: ["pip", null, null, null, null, null],
    hives: [{ id: "h1", type: "skep", level: 1, since: now - 30 * 60000, workers: ["pip"] }],
    items: { honeyDrop: 3, honeyJar: 1, mint: 1, royalJelly: 1, candy: 1 },
    cleared: {},
    pity: emptyPity(),
    rng: randomSeed(),
    hiveSlots: START_HIVE_SLOTS,
    fresh: [],
  };
}

/** Fills defaults for fields added after a save was written, and drops unknown bees. */
export function normalizeSave(raw: Partial<GameSave>): GameSave {
  const base = newSave();
  const save: GameSave = { ...base, ...raw } as GameSave;
  save.resources = { ...base.resources, ...raw.resources };
  // Saves from before tickets existed get the same welcome tickets as a new account, once.
  if (raw.resources && raw.resources.ticket === undefined) save.resources.ticket = STARTING_TICKETS;
  save.items = { ...base.items, ...raw.items };
  save.pity = { ...base.pity, ...raw.pity };
  save.bees = Object.fromEntries(
    Object.entries(save.bees ?? {}).filter(([id]) => {
      try {
        beeById(id);
        return true;
      } catch {
        return false;
      }
    }),
  );
  if (!save.bees.pip) save.bees.pip = newOwnedBee("pip");
  save.team = Array.from({ length: TEAM_SIZE }, (_, i) => (save.team?.[i] && save.bees[save.team[i]!] ? save.team[i] : null));
  save.hives = (save.hives?.length ? save.hives : base.hives).map((h) => ({ ...h, workers: h.workers.filter((w) => save.bees[w]) }));
  save.hiveSlots = Math.min(MAX_HIVES, Math.max(START_HIVE_SLOTS, raw.hiveSlots ?? 0, save.hives.length));
  delete (save as Partial<GameSave> & { freePack?: boolean }).freePack;
  return save;
}

const RESOURCE_IDS: ResourceId[] = ["honey", "silver", "pollen", "jelly", "ticket"];

const add = (r: Resources, d: Partial<Resources>, sign = 1): Resources =>
  Object.fromEntries(RESOURCE_IDS.map((k) => [k, (r[k] ?? 0) + sign * (d[k] ?? 0)])) as Resources;

/** Chance that a won fight drops a pack ticket: grows with the chapter, capped so tickets stay special. */
export const ticketDropChance = (chapter: number) => Math.min(0.25, 0.04 + chapter * 0.025);

const affordable = (r: Resources, cost: Partial<Resources>) =>
  (Object.keys(cost) as (keyof Resources)[]).every((k) => r[k] >= (cost[k] ?? 0));

export const useGame = create<GameSave & Actions>()(
  persist(
    (set, get) => ({
      ...newSave(),

      canAfford: (cost) => affordable(get().resources, cost),

      collectHive: (id) => {
        const now = Date.now();
        const s = get();
        const hive = s.hives.find((h) => h.id === id);
        if (!hive) return 0;
        const honey = hiveStored(hive, now);
        if (honey <= 0) return 0;
        const extras = hiveExtras(hive, honey);
        set({
          resources: add(s.resources, { ...extras, honey: honey + (extras.honey ?? 0) }),
          hives: s.hives.map((h) => (h.id === id ? { ...h, since: now } : h)),
        });
        return honey;
      },

      collectAll: () => get().hives.reduce((sum, h) => sum + get().collectHive(h.id), 0),

      upgradeHive: (id) => {
        const s = get();
        const hive = s.hives.find((h) => h.id === id);
        const cost = hive && upgradeCost(hive);
        if (!hive || !cost || !affordable(s.resources, cost)) return false;
        get().collectHive(id);
        set((st) => ({
          resources: add(st.resources, cost, -1),
          hives: st.hives.map((h) => (h.id === id ? { ...h, level: h.level + 1 } : h)),
        }));
        return true;
      },

      buildHive: (type) => {
        const s = get();
        const cost = HIVE_TYPES[type].buildCost;
        if (s.hives.length >= s.hiveSlots || !affordable(s.resources, cost)) return false;
        const id = `h${Date.now().toString(36)}`;
        set({ resources: add(s.resources, cost, -1), hives: [...s.hives, { id, type, level: 1, since: Date.now(), workers: [] }] });
        return true;
      },

      sellHive: (id) => {
        const s = get();
        const hive = s.hives.find((h) => h.id === id);
        // The last hive can never be sold.
        if (!hive || s.hives.length <= 1) return false;
        get().collectHive(id);
        set((st) => ({ resources: add(st.resources, hiveSellValue(hive)), hives: st.hives.filter((h) => h.id !== id) }));
        return true;
      },

      buyHiveSlot: () => {
        const s = get();
        const cost = slotCost(s.hiveSlots);
        if (!cost || !affordable(s.resources, cost)) return false;
        set({ resources: add(s.resources, cost, -1), hiveSlots: s.hiveSlots + 1 });
        return true;
      },

      setWorker: (hiveId, slot, beeId) => {
        get().collectHive(hiveId);
        set((s) => ({
          hives: s.hives.map((h) => {
            if (h.id !== hiveId) return beeId ? { ...h, workers: h.workers.filter((w) => w !== beeId) } : h;
            const workers = [...h.workers];
            if (!beeId) workers.splice(slot, 1);
            else {
              const was = workers.indexOf(beeId);
              if (was >= 0) workers.splice(was, 1);
              if (slot < workers.length) workers[slot] = beeId;
              else workers.push(beeId);
            }
            return { ...h, workers: workers.slice(0, WORKERS_PER_HIVE) };
          }),
        }));
      },

      openPack: (packId, count, priceIndex) => {
        const s = get();
        const pack = packById(packId);
        if (!pack || !packUnlocked(s.cleared, pack)) return null;
        const unit = pack.prices[priceIndex];
        if (!unit) return null;
        const cost = Object.fromEntries(Object.entries(unit).map(([k, v]) => [k, (v ?? 0) * count])) as Partial<Resources>;
        if (!affordable(s.resources, cost)) return null;
        const resources = add(s.resources, cost, -1);
        const res = pull(pack, count, s.pity, s.rng);
        const bees = { ...s.bees };
        const firsts: string[] = [];
        for (const b of res.bees) {
          if (bees[b.id]) bees[b.id] = { ...bees[b.id], dupes: bees[b.id].dupes + 1 };
          else {
            bees[b.id] = newOwnedBee(b.id);
            firsts.push(b.id);
          }
        }
        // Fill empty team slots with newcomers so a new player gets going without menus.
        const team = [...s.team];
        for (const id of firsts) {
          const empty = team.indexOf(null);
          if (empty >= 0) team[empty] = id;
        }
        set({
          resources,
          bees,
          team,
          pity: res.pity,
          rng: res.rngState,
          fresh: [...new Set([...s.fresh, ...firsts])],
        });
        return { bees: res.bees, firsts };
      },

      levelUp: (id) => {
        const s = get();
        const owned = s.bees[id];
        if (!owned) return false;
        const sp = beeById(id);
        if (owned.level >= maxLevel(sp)) return false;
        const cost = { pollen: xpForLevel(owned.level), silver: silverForLevel(owned.level) };
        if (!affordable(s.resources, cost)) return false;
        set({ resources: add(s.resources, cost, -1), bees: { ...s.bees, [id]: { ...owned, level: owned.level + 1 } } });
        return true;
      },

      rankUp: (id) => {
        const s = get();
        const owned = s.bees[id];
        if (!owned || owned.rank >= MAX_RANK) return false;
        const sp = beeById(id);
        const need = dupesForRank(owned.rank);
        const cost = { silver: silverForRank(sp, owned.rank) };
        if (owned.dupes < need || !affordable(s.resources, cost)) return false;
        set({
          resources: add(s.resources, cost, -1),
          bees: { ...s.bees, [id]: { ...owned, rank: owned.rank + 1, dupes: owned.dupes - need } },
        });
        return true;
      },

      sellDupe: (id) => {
        const s = get();
        const owned = s.bees[id];
        if (!owned || owned.dupes <= 0) return false;
        const sp = beeById(id);
        set({
          resources: add(s.resources, { silver: RARITY[sp.rarity].sell }),
          bees: { ...s.bees, [id]: { ...owned, dupes: owned.dupes - 1 } },
        });
        return true;
      },

      setTeamSlot: (slot, id) => {
        const team = get().team.map((t) => (t === id ? null : t));
        team[slot] = id;
        set({ team });
      },

      craft: (item) => {
        const s = get();
        const cost = RECIPES[item];
        if (!affordable(s.resources, cost)) return false;
        set({ resources: add(s.resources, cost, -1), items: { ...s.items, [item]: (s.items[item] ?? 0) + 1 } });
        return true;
      },

      finishBattle: (stageId, won, stars, itemsUsed) => {
        const s = get();
        const stage = STAGES[stageId];
        const items = { ...s.items };
        for (const [k, v] of Object.entries(itemsUsed)) items[k as ItemId] = Math.max(0, (items[k as ItemId] ?? 0) - (v ?? 0));
        if (!won || !stage) {
          // A lost fight still gives a little pollen, so trying is never wasted.
          const consolation = { pollen: Math.round((stage?.rewards.pollen ?? 0) * 0.3) };
          set({ items, resources: add(s.resources, consolation) });
          return { won: false, stars: 0, rewards: consolation, firstClear: false, items: {} };
        }
        const firstClear = s.cleared[stageId] === undefined;
        const rewards: Partial<Resources> = { ...stage.rewards };
        const gotItems: Partial<Record<ItemId, number>> = {};
        if (firstClear) {
          for (const k of RESOURCE_IDS) {
            if (stage.firstClear[k]) rewards[k] = (rewards[k] ?? 0) + stage.firstClear[k]!;
          }
          for (const [k, v] of Object.entries(stage.firstClear.items ?? {})) {
            items[k as ItemId] = (items[k as ItemId] ?? 0) + (v ?? 0);
            gotItems[k as ItemId] = v;
          }
        }
        // Sometimes a ticket drops: a little more often in later chapters, never too often.
        const rng = new Rng(s.rng);
        if (rng.chance(ticketDropChance(stage.chapter))) rewards.ticket = (rewards.ticket ?? 0) + 1;
        set({
          items,
          rng: rng.state,
          resources: add(s.resources, rewards),
          cleared: { ...s.cleared, [stageId]: Math.max(stars, s.cleared[stageId] ?? 0) },
        });
        return { won: true, stars, rewards, firstClear, items: gotItems };
      },

      markSeen: (id) => set((s) => ({ fresh: s.fresh.filter((f) => f !== id) })),

      importSave: (json) => {
        try {
          const parsed = JSON.parse(json) as { v?: number; save?: Partial<GameSave> };
          if (!parsed.save) return false;
          set(normalizeSave(parsed.save));
          return true;
        } catch {
          return false;
        }
      },

      reset: () => set(newSave()),
    }),
    {
      name: "beefactory-save",
      version: SAVE_VERSION,
      partialize: (s) => {
        const { resources, bees, team, hives, items, cleared, pity, rng, hiveSlots, fresh } = s;
        return { resources, bees, team, hives, items, cleared, pity, rng, hiveSlots, fresh };
      },
      merge: (persisted, current) => ({ ...current, ...normalizeSave((persisted ?? {}) as Partial<GameSave>) }),
    },
  ),
);

export function exportSave(): string {
  const s = useGame.getState();
  const { resources, bees, team, hives, items, cleared, pity, rng, hiveSlots, fresh } = s;
  return JSON.stringify({ v: SAVE_VERSION, save: { resources, bees, team, hives, items, cleared, pity, rng, hiveSlots, fresh } });
}
