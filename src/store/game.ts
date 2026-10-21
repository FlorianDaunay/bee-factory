import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { beeById } from "@/core/data/bees";
import { JELLY_DROP_CHANCE, REWARD_SPREAD, STAGES, ticketDropChance, type Stage } from "@/core/data/story";
import { activeEvents, findEventStage, isEventStage } from "@/core/events";
import { RARITY } from "@/core/data/meta";
import { emptyPity, packById, pull, type Pity } from "@/core/gacha";
import {
  HIVE_TYPES,
  MAX_HIVES,
  START_HIVE_SLOTS,
  WORKERS_PER_HIVE,
  HIVE_RESOURCES,
  bestWorkers,
  hiveSellValue,
  income,
  legacyStored,
  slotCost,
  totalRates,
  upgradeCost,
  type Hive,
  type HiveRates,
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
export const MAX_TEAMS = 10;
/**
 * Bump when the shape of the save changes. Old saves are never dropped: `migrate` hands them to
 * normalizeSave, which fills every new field with a default.
 */
export const SAVE_VERSION = 2;
export const SAVE_KEY = "beefactory-save";
const BACKUP_KEY = "beefactory-save-backup";

export interface SavedTeam {
  name: string;
  members: (string | null)[];
}

export interface GameSave {
  resources: Resources;
  bees: Record<string, OwnedBee>;
  /** Bees of the active team (a copy of teams[activeTeam].members, kept in sync). */
  team: (string | null)[];
  teams: SavedTeam[];
  activeTeam: number;
  hives: Hive[];
  items: Record<ItemId, number>;
  cleared: Record<string, number>;
  pity: Pity;
  rng: number;
  /** Hive slots unlocked (3 at start, up to MAX_HIVES). */
  hiveSlots: number;
  /** Bees pulled but not yet looked at in the collection. */
  fresh: string[];
  /** Epoch ms of the last hive payout; hives pay straight into resources from there. */
  lastTick: number;
  /** Fractions of resources earned but not yet whole. */
  carry: Partial<HiveRates>;
  /** Best stars on timed event stages; keys hold the event period, so each new period starts fresh. */
  eventClears: Record<string, number>;
  /** Last game version whose update gift was received. */
  giftVersion: string;
}

/** What every player gets once per game update. */
export const UPDATE_GIFT: Partial<Resources> = { ticket: 25, honey: 3000, silver: 15000, pollen: 10000, jelly: 5 };

/** Compares "1.2.3"-style versions: negative, zero or positive like a sort function. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
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
  /** Gives the update gift once per new version. Returns it, or null if already received. */
  claimUpdateGift: (version: string) => Partial<Resources> | null;
  /** Pays the hives' income since the last tick. Returns what was paid. */
  tick: (now?: number) => Partial<Resources>;
  upgradeHive: (id: string) => boolean;
  buildHive: (type: HiveType) => boolean;
  sellHive: (id: string) => boolean;
  buyHiveSlot: () => boolean;
  setWorker: (hiveId: string, slot: number, beeId: string | null) => void;
  /** Fills every hive with the best workers for the chosen resources. */
  autoAssignWorkers: (focus?: (keyof HiveRates)[]) => void;
  clearWorkers: () => void;
  openPack: (packId: string, count: number, priceIndex: number) => PullOutcome | null;
  levelUp: (id: string) => boolean;
  rankUp: (id: string) => boolean;
  sellDupe: (id: string) => boolean;
  setTeamSlot: (slot: number, id: string | null) => void;
  /** Adds a bee to the first empty slot of the active team, or removes it if it is already in. */
  toggleTeamMember: (id: string) => void;
  selectTeam: (index: number) => void;
  addTeam: () => void;
  renameTeam: (index: number, name: string) => void;
  deleteTeam: (index: number) => void;
  craft: (item: ItemId) => boolean;
  finishBattle: (stageId: string, won: boolean, stars: number, itemsUsed: Partial<Record<ItemId, number>>) => BattleOutcome;
  markSeen: (id: string) => void;
  importSave: (json: string) => boolean;
  reset: () => void;
}

export const STARTING_TICKETS = 50;

const emptyTeam = (): (string | null)[] => Array.from({ length: TEAM_SIZE }, () => null);
export const defaultTeamName = (i: number) => `Team ${i + 1}`;

export function newSave(now = Date.now()): GameSave {
  const team = ["pip", null, null, null, null, null];
  return {
    // New accounts start with 50 free pack tickets, usable on any pack.
    resources: { honey: 150, silver: 600, pollen: 200, jelly: 0, ticket: STARTING_TICKETS },
    bees: { pip: newOwnedBee("pip") },
    team,
    teams: [{ name: defaultTeamName(0), members: [...team] }],
    activeTeam: 0,
    hives: [{ id: "h1", type: "skep", level: 1, workers: ["pip"] }],
    items: { honeyDrop: 3, honeyJar: 1, mint: 1, royalJelly: 1, candy: 1 },
    cleared: {},
    pity: emptyPity(),
    rng: randomSeed(),
    hiveSlots: START_HIVE_SLOTS,
    fresh: [],
    lastTick: now,
    carry: {},
    eventClears: {},
    // New players start with their own welcome tickets; gifts start with the next update.
    giftVersion: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0",
  };
}

/** Average level of the bees in the active team (events scale to it). */
export function teamLevel(s: Pick<GameSave, "team" | "bees">): number {
  const levels = s.team.filter((id): id is string => !!id && !!s.bees[id]).map((id) => s.bees[id].level);
  return levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 1;
}

/** A story stage, or a timed event stage while its event runs. */
export function findStage(stageId: string, s: Pick<GameSave, "cleared" | "team" | "bees">): Stage | undefined {
  return STAGES[stageId] ?? findEventStage(stageId, s.cleared, teamLevel(s));
}

const knownBee = (id: string) => {
  try {
    beeById(id);
    return true;
  } catch {
    return false;
  }
};

/**
 * Turns any save (current, older, or partly broken) into a valid current save: fills defaults for
 * fields added since it was written, drops unknown bees, and converts old formats.
 */
export function normalizeSave(raw: Partial<GameSave>, now = Date.now()): GameSave {
  const base = newSave(now);
  const save: GameSave = { ...base, ...raw } as GameSave;
  save.resources = { ...base.resources, ...raw.resources };
  // Saves from before tickets existed get the same welcome tickets as a new account, once.
  if (raw.resources && raw.resources.ticket === undefined) save.resources.ticket = STARTING_TICKETS;
  for (const k of RESOURCE_IDS) if (!Number.isFinite(save.resources[k])) save.resources[k] = 0;
  save.items = { ...base.items, ...raw.items };
  save.pity = { ...base.pity, ...raw.pity };
  save.bees = Object.fromEntries(Object.entries(save.bees ?? {}).filter(([id]) => knownBee(id)));
  if (!save.bees.pip) save.bees.pip = newOwnedBee("pip");

  const cleanTeam = (t: (string | null)[] | undefined) => Array.from({ length: TEAM_SIZE }, (_, i) => (t?.[i] && save.bees[t[i]!] ? t[i] : null));
  // Saves from before team presets had one team: it becomes "Team 1".
  const teams = raw.teams?.length ? raw.teams : [{ name: defaultTeamName(0), members: raw.team ?? base.team }];
  save.teams = teams.slice(0, MAX_TEAMS).map((t, i) => ({ name: (t.name ?? "").trim() || defaultTeamName(i), members: cleanTeam(t.members) }));
  save.activeTeam = Math.min(Math.max(0, raw.activeTeam ?? 0), save.teams.length - 1);
  save.team = [...save.teams[save.activeTeam].members];

  save.hives = (save.hives?.length ? save.hives : base.hives).map((h) => ({ ...h, workers: h.workers.filter((w) => save.bees[w]) }));
  save.hiveSlots = Math.min(MAX_HIVES, Math.max(START_HIVE_SLOTS, raw.hiveSlots ?? 0, save.hives.length));

  // Saves from before direct income: pay what the hives held, then income runs from now.
  if (raw.lastTick === undefined) {
    save.resources.honey += save.hives.reduce((a, h) => a + legacyStored(h, now), 0);
    save.lastTick = now;
  }
  save.hives = save.hives.map(({ since: _since, ...h }) => h);
  save.carry = { ...raw.carry };
  // Saves from before update gifts get this update's gift.
  save.giftVersion = typeof raw.giftVersion === "string" ? raw.giftVersion : "0.0.0";
  // Only clears of events still running are kept.
  const live = new Set(activeEvents(now).map((e) => e.id));
  save.eventClears = Object.fromEntries(Object.entries(raw.eventClears ?? {}).filter(([id]) => live.has(id.split(":")[1])));
  delete (save as Partial<GameSave> & { freePack?: boolean }).freePack;
  return save;
}

const RESOURCE_IDS: ResourceId[] = ["honey", "silver", "pollen", "jelly", "ticket"];

const add = (r: Resources, d: Partial<Resources>, sign = 1): Resources =>
  Object.fromEntries(RESOURCE_IDS.map((k) => [k, (r[k] ?? 0) + sign * (d[k] ?? 0)])) as Resources;

const affordable = (r: Resources, cost: Partial<Resources>) =>
  (Object.keys(cost) as (keyof Resources)[]).every((k) => r[k] >= (cost[k] ?? 0));

/** A random amount within the stage's reward range. */
const roll = (rng: Rng, v: number) => Math.round(v * rng.range(1 - REWARD_SPREAD, 1 + REWARD_SPREAD));

const SAVE_FIELDS = ["resources", "bees", "team", "teams", "activeTeam", "hives", "items", "cleared", "pity", "rng", "hiveSlots", "fresh", "lastTick", "carry", "eventClears", "giftVersion"] as const;
const pickSave = (s: GameSave): GameSave => Object.fromEntries(SAVE_FIELDS.map((k) => [k, s[k]])) as unknown as GameSave;

/**
 * localStorage with a second copy: every write also goes to a backup key, and a missing or broken
 * main save is read back from the backup. Keeps progress through updates and interrupted writes.
 */
const safeStorage: StateStorage = {
  getItem: (name) => {
    const main = localStorage.getItem(name);
    try {
      if (main && JSON.parse(main)) return main;
    } catch {
      // Unreadable main save: fall through to the backup.
    }
    return localStorage.getItem(BACKUP_KEY) ?? main;
  },
  setItem: (name, value) => {
    localStorage.setItem(name, value);
    try {
      localStorage.setItem(BACKUP_KEY, value);
    } catch {
      // Storage full: the main save is what matters.
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
};

export const useGame = create<GameSave & Actions>()(
  persist(
    (set, get) => {
      /** Updates the active team and its saved copy together. */
      const writeTeam = (team: (string | null)[]) =>
        set((s) => ({ team, teams: s.teams.map((t, i) => (i === s.activeTeam ? { ...t, members: team } : t)) }));

      return {
        ...newSave(),

        canAfford: (cost) => affordable(get().resources, cost),

        claimUpdateGift: (version) => {
          const s = get();
          if (compareVersions(version, s.giftVersion) <= 0) return null;
          set({ resources: add(s.resources, UPDATE_GIFT), giftVersion: version });
          return UPDATE_GIFT;
        },

        tick: (now = Date.now()) => {
          const s = get();
          const minutes = (now - s.lastTick) / 60000;
          if (minutes <= 0) {
            if (minutes < 0) set({ lastTick: now });
            return {};
          }
          const { paid, carry } = income(totalRates(s.hives, s.bees), minutes, s.carry);
          set({ resources: add(s.resources, paid), carry, lastTick: now });
          return paid;
        },

        upgradeHive: (id) => {
          const s = get();
          const hive = s.hives.find((h) => h.id === id);
          const cost = hive && upgradeCost(hive);
          if (!hive || !cost || !affordable(s.resources, cost)) return false;
          get().tick();
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
          get().tick();
          const id = `h${Date.now().toString(36)}`;
          set((st) => ({ resources: add(st.resources, cost, -1), hives: [...st.hives, { id, type, level: 1, workers: [] }] }));
          return true;
        },

        sellHive: (id) => {
          const s = get();
          const hive = s.hives.find((h) => h.id === id);
          // The last hive can never be sold.
          if (!hive || s.hives.length <= 1) return false;
          get().tick();
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
          // Pay at the old rates first, so the change only counts from now on.
          get().tick();
          set((s) => ({
            hives: s.hives.map((h) => {
              if (h.id !== hiveId) return beeId ? { ...h, workers: h.workers.filter((w) => w !== beeId) } : h;
              const workers: (string | undefined)[] = [...h.workers];
              const was = beeId ? workers.indexOf(beeId) : -1;
              if (was >= 0) workers[was] = undefined;
              if (!beeId) workers[slot] = undefined;
              else workers[Math.min(slot, workers.length)] = beeId;
              return { ...h, workers: workers.filter((w): w is string => !!w).slice(0, WORKERS_PER_HIVE) };
            }),
          }));
        },

        autoAssignWorkers: (focus = HIVE_RESOURCES) => {
          get().tick();
          const s = get();
          const assigned = bestWorkers(s.hives, s.bees, focus);
          set({ hives: s.hives.map((h) => ({ ...h, workers: assigned[h.id] ?? [] })) });
        },

        clearWorkers: () => {
          get().tick();
          set((s) => ({ hives: s.hives.map((h) => ({ ...h, workers: [] })) }));
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
            pity: res.pity,
            rng: res.rngState,
            fresh: [...new Set([...s.fresh, ...firsts])],
          });
          writeTeam(team);
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
          // A levelled worker makes more: pay the old rates up to now first.
          get().tick();
          set((st) => ({ resources: add(st.resources, cost, -1), bees: { ...st.bees, [id]: { ...owned, level: owned.level + 1 } } }));
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
          get().tick();
          set((st) => ({
            resources: add(st.resources, cost, -1),
            bees: { ...st.bees, [id]: { ...owned, rank: owned.rank + 1, dupes: owned.dupes - need } },
          }));
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
          writeTeam(team);
        },

        toggleTeamMember: (id) => {
          const team = [...get().team];
          const at = team.indexOf(id);
          if (at >= 0) team[at] = null;
          else {
            const empty = team.indexOf(null);
            if (empty < 0) return;
            team[empty] = id;
          }
          writeTeam(team);
        },

        selectTeam: (index) => {
          const t = get().teams[index];
          if (t) set({ activeTeam: index, team: [...t.members] });
        },

        addTeam: () => {
          const s = get();
          if (s.teams.length >= MAX_TEAMS) return;
          const index = s.teams.length;
          set({ teams: [...s.teams, { name: defaultTeamName(index), members: emptyTeam() }], activeTeam: index, team: emptyTeam() });
        },

        renameTeam: (index, name) =>
          set((s) => ({ teams: s.teams.map((t, i) => (i === index ? { ...t, name: name.trim().slice(0, 20) || defaultTeamName(i) } : t)) })),

        deleteTeam: (index) => {
          const s = get();
          if (s.teams.length <= 1) return;
          const teams = s.teams.filter((_, i) => i !== index);
          const active = s.activeTeam === index ? 0 : s.activeTeam > index ? s.activeTeam - 1 : s.activeTeam;
          set({ teams, activeTeam: active, team: [...teams[active].members] });
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
          const stage = findStage(stageId, s);
          const event = isEventStage(stageId);
          const record = event ? s.eventClears : s.cleared;
          const items = { ...s.items };
          for (const [k, v] of Object.entries(itemsUsed)) items[k as ItemId] = Math.max(0, (items[k as ItemId] ?? 0) - (v ?? 0));
          if (!won || !stage) {
            // A lost fight still gives a little pollen, so trying is never wasted.
            const consolation = { pollen: Math.round((stage?.rewards.pollen ?? 0) * 0.3) };
            set({ items, resources: add(s.resources, consolation) });
            return { won: false, stars: 0, rewards: consolation, firstClear: false, items: {} };
          }
          const rng = new Rng(s.rng);
          const firstClear = record[stageId] === undefined;
          const rewards: Partial<Resources> = {};
          for (const [k, v] of Object.entries(stage.rewards) as [ResourceId, number][]) rewards[k] = roll(rng, v);
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
          // Sometimes a ticket drops (more often in later chapters and on bosses); bosses may drop jelly.
          if (rng.chance(ticketDropChance(stage.chapter, stage.boss))) rewards.ticket = (rewards.ticket ?? 0) + 1;
          if (stage.boss && rng.chance(JELLY_DROP_CHANCE)) rewards.jelly = (rewards.jelly ?? 0) + 1;
          set({
            items,
            rng: rng.state,
            resources: add(s.resources, rewards),
            ...(event
              ? { eventClears: { ...s.eventClears, [stageId]: Math.max(stars, s.eventClears[stageId] ?? 0) } }
              : { cleared: { ...s.cleared, [stageId]: Math.max(stars, s.cleared[stageId] ?? 0) } }),
          });
          return { won: true, stars, rewards, firstClear, items: gotItems };
        },

        markSeen: (id) => set((s) => ({ fresh: s.fresh.filter((f) => f !== id) })),

        importSave: (json) => {
          try {
            // A save file holds JSON; a save code is the same JSON in base64.
            const text = json.trim().startsWith("{") ? json : decodeURIComponent(escape(atob(json.trim())));
            const parsed = JSON.parse(text) as { v?: number; save?: Partial<GameSave> };
            if (!parsed.save) return false;
            set(normalizeSave(parsed.save));
            return true;
          } catch {
            return false;
          }
        },

        reset: () => set(newSave()),
      };
    },
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => pickSave(s),
      // Every older version is upgraded field by field in normalizeSave (via merge below).
      migrate: (persisted) => persisted as GameSave,
      merge: (persisted, current) => ({ ...current, ...normalizeSave((persisted ?? {}) as Partial<GameSave>) }),
    },
  ),
);

export function exportSave(): string {
  return JSON.stringify({ v: SAVE_VERSION, save: pickSave(useGame.getState()) });
}

/** The save as one line of text to copy and paste (base64 of exportSave). */
export function saveCode(): string {
  return btoa(unescape(encodeURIComponent(exportSave())));
}
