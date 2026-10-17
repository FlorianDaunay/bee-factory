import { create } from "zustand";
import { persist } from "zustand/middleware";
import { beeById } from "@/core/data/bees";
import { STAGES } from "@/core/data/story";
import { RARITY } from "@/core/data/meta";
import { emptyPity, packById, pull, type Pity } from "@/core/gacha";
import { HIVE_TYPES, MAX_HIVES, WORKERS_PER_HIVE, hiveExtras, hiveStored, upgradeCost, type Hive, type HiveType } from "@/core/hive";
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
import { randomSeed } from "@/core/rng";
import type { BeeSpecies, ItemId, Resources } from "@/core/types";
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
  freePack: boolean;
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
  setWorker: (hiveId: string, slot: number, beeId: string | null) => void;
  openPack: (packId: string, count: number, priceIndex: number | "free") => PullOutcome | null;
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

export function newSave(now = Date.now()): GameSave {
  return {
    resources: { honey: 150, silver: 600, pollen: 200, jelly: 0 },
    bees: { pip: newOwnedBee("pip") },
    team: ["pip", null, null, null, null, null],
    hives: [{ id: "h1", type: "skep", level: 1, since: now - 30 * 60000, workers: ["pip"] }],
    items: { honeyDrop: 3, honeyJar: 1, mint: 1, royalJelly: 1, candy: 1 },
    cleared: {},
    pity: emptyPity(),
    rng: randomSeed(),
    freePack: true,
    fresh: [],
  };
}

/** Fills defaults for fields added after a save was written, and drops unknown bees. */
export function normalizeSave(raw: Partial<GameSave>): GameSave {
  const base = newSave();
  const save: GameSave = { ...base, ...raw } as GameSave;
  save.resources = { ...base.resources, ...raw.resources };
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
  return save;
}

const add = (r: Resources, d: Partial<Resources>, sign = 1): Resources => ({
  honey: r.honey + sign * (d.honey ?? 0),
  silver: r.silver + sign * (d.silver ?? 0),
  pollen: r.pollen + sign * (d.pollen ?? 0),
  jelly: r.jelly + sign * (d.jelly ?? 0),
});

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
        if (s.hives.length >= MAX_HIVES || !affordable(s.resources, cost)) return false;
        const id = `h${Date.now().toString(36)}`;
        set({ resources: add(s.resources, cost, -1), hives: [...s.hives, { id, type, level: 1, since: Date.now(), workers: [] }] });
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
        let resources = s.resources;
        if (priceIndex === "free") {
          if (!s.freePack || count !== 1) return null;
        } else {
          const unit = pack.prices[priceIndex];
          if (!unit) return null;
          const cost = Object.fromEntries(Object.entries(unit).map(([k, v]) => [k, (v ?? 0) * count])) as Partial<Resources>;
          if (!affordable(resources, cost)) return null;
          resources = add(resources, cost, -1);
        }
        // The very first pack is a guaranteed Rare from France, to start with a real team.
        const res = priceIndex === "free" ? pull({ ...pack, floor: 3 }, 1, s.pity, s.rng) : pull(pack, count, s.pity, s.rng);
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
          freePack: priceIndex === "free" ? false : s.freePack,
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
          for (const k of ["honey", "silver", "pollen", "jelly"] as const) {
            if (stage.firstClear[k]) rewards[k] = (rewards[k] ?? 0) + stage.firstClear[k]!;
          }
          for (const [k, v] of Object.entries(stage.firstClear.items ?? {})) {
            items[k as ItemId] = (items[k as ItemId] ?? 0) + (v ?? 0);
            gotItems[k as ItemId] = v;
          }
        }
        set({
          items,
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
        const { resources, bees, team, hives, items, cleared, pity, rng, freePack, fresh } = s;
        return { resources, bees, team, hives, items, cleared, pity, rng, freePack, fresh };
      },
      merge: (persisted, current) => ({ ...current, ...normalizeSave((persisted ?? {}) as Partial<GameSave>) }),
    },
  ),
);

export function exportSave(): string {
  const s = useGame.getState();
  const { resources, bees, team, hives, items, cleared, pity, rng, freePack, fresh } = s;
  return JSON.stringify({ v: SAVE_VERSION, save: { resources, bees, team, hives, items, cleared, pity, rng, freePack, fresh } });
}
