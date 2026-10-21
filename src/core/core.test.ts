import { describe, expect, it } from "vitest";
import { autoBattle } from "./battle/autoplay";
import { act, createBattle, endPlayerTurn, type TeamMember } from "./battle/engine";
import { BEES, beeById } from "./data/bees";
import { CHAPTERS, STAGES } from "./data/story";
import { DEEP_ZONES, PACKS, PITY_LIMIT, SPACE_ZONES, TIER2_UNLOCK_STAGE, TIER3_UNLOCK_STAGE, emptyPity, packById, pull } from "./gacha";
import { bestWorkers, hiveRates, hiveSellValue, income, legacyStored, slotCost, totalRates, type Hive } from "./hive";
import { packUnlocked } from "./unlocks";
import { newOwnedBee } from "./progression";
import { UPDATE_GIFT, compareVersions, newSave, normalizeSave, teamLevel, useGame } from "@/store/game";
import { rewardRange, starRules, ticketDropChance } from "./data/story";
import { activeEvents, eventStage, findEventStage } from "./events";
import { computeSynergies } from "./synergy";

const team = (ids: string[], level = 1): TeamMember[] => ids.map((id) => ({ id, level, rank: 0 }));

describe("data", () => {
  it("has unique bee ids and every zone has bees of rarity 1..5", () => {
    expect(new Set(BEES.map((b) => b.id)).size).toBe(BEES.length);
    for (const z of ["fr", "de", "it", "jp", "in", "eg", "br", "us"]) {
      const rs = new Set(BEES.filter((b) => b.zone === z).map((b) => b.rarity));
      for (const r of [1, 2, 3, 4, 5]) expect(rs.has(r as never), `${z} r${r}`).toBe(true);
    }
  });
  it("every stage has waves and the last stage of a chapter has a boss", () => {
    for (const ch of CHAPTERS) {
      expect(ch.stages.at(-1)!.boss).toBe(true);
      for (const s of ch.stages) expect(s.waves.length).toBeGreaterThan(0);
    }
  });
});

describe("gacha", () => {
  it("only gives bees of the pack's zones", () => {
    const pack = packById("country-jp")!;
    const res = pull(pack, 50, emptyPity(), 42);
    expect(res.bees.every((b) => b.zone === "jp")).toBe(true);
  });
  it("multi-pull guarantees an Epic or better", () => {
    for (let seed = 0; seed < 50; seed++) {
      const res = pull(PACKS[0], 10, emptyPity(), seed);
      expect(res.bees.some((b) => b.rarity >= 4)).toBe(true);
    }
  });
  it("pity guarantees a Legendary", () => {
    const pity = { ...emptyPity(), country: PITY_LIMIT - 1 };
    const res = pull(PACKS[0], 1, pity, 1);
    expect(res.bees[0].rarity).toBeGreaterThanOrEqual(5);
    expect(res.pity.country).toBe(0);
  });
  it("is deterministic for a seed", () => {
    const a = pull(PACKS[1], 10, emptyPity(), 7).bees.map((b) => b.id);
    const b = pull(PACKS[1], 10, emptyPity(), 7).bees.map((b) => b.id);
    expect(a).toEqual(b);
  });
});

describe("packs, tiers and tickets", () => {
  it("every space zone has bees from Rare to Celestial", () => {
    for (const z of SPACE_ZONES) {
      const rs = new Set(BEES.filter((b) => b.zone === z).map((b) => b.rarity));
      for (const r of [3, 4, 5, 6, 7]) expect(rs.has(r as never), `${z} r${r}`).toBe(true);
    }
  });
  it("every pack accepts one ticket per bee", () => {
    for (const p of PACKS) expect(p.prices.some((price) => price.ticket === 1 && Object.keys(price).length === 1), p.id).toBe(true);
  });
  it("tier 1 is always open, tier 2 opens after the Sakura Mountains boss", () => {
    const earth = PACKS.filter((p) => p.tier === 1);
    const space = PACKS.filter((p) => p.tier === 2);
    expect(space.length).toBeGreaterThan(0);
    for (const p of earth) expect(packUnlocked({}, p)).toBe(true);
    for (const p of space) {
      expect(packUnlocked({}, p)).toBe(false);
      expect(packUnlocked({ [TIER2_UNLOCK_STAGE]: 1 }, p)).toBe(true);
    }
    expect(STAGES[TIER2_UNLOCK_STAGE].boss).toBe(true);
  });
  it("tier 2 packs only give space bees, Rare or better", () => {
    const res = pull(packById("cosmic")!, 60, emptyPity(), 3);
    expect(res.bees.every((b) => SPACE_ZONES.includes(b.zone) && b.rarity >= 3)).toBe(true);
  });
  it("ticket drops grow with the chapter, more on bosses, but stay rare", () => {
    expect(ticketDropChance(0)).toBeLessThan(ticketDropChance(4));
    expect(ticketDropChance(3)).toBeLessThan(ticketDropChance(3, true));
    for (let ch = 0; ch < 30; ch++) expect(ticketDropChance(ch, true)).toBeLessThanOrEqual(0.35);
  });
  it("tier 3 opens after the last Earth boss, gives deep-space bees Epic or better, and costs what tier 2 used to", () => {
    const deep = PACKS.filter((p) => p.tier === 3);
    expect(deep.length).toBe(DEEP_ZONES.length + 1);
    for (const p of deep) {
      expect(packUnlocked({ [TIER2_UNLOCK_STAGE]: 1 }, p)).toBe(false);
      expect(packUnlocked({ [TIER3_UNLOCK_STAGE]: 1 }, p)).toBe(true);
    }
    expect(STAGES[TIER3_UNLOCK_STAGE].boss).toBe(true);
    const res = pull(packById("galactic")!, 60, emptyPity(), 9);
    expect(res.bees.every((b) => DEEP_ZONES.includes(b.zone) && b.rarity >= 4)).toBe(true);
    expect(packById("deep-orion")!.prices[1]).toEqual({ honey: 400, silver: 1200 });
    expect(packById("planet-moon")!.prices[1].honey!).toBeLessThan(400);
  });
  it("new accounts start with 50 tickets and 3 hive slots; old saves get the tickets once", () => {
    expect(newSave().resources.ticket).toBe(50);
    expect(newSave().hiveSlots).toBe(3);
    const old = normalizeSave({ resources: { honey: 1, silver: 2, pollen: 3, jelly: 4 } as never });
    expect(old.resources.ticket).toBe(50);
    const spent = normalizeSave({ resources: { honey: 1, silver: 2, pollen: 3, jelly: 4, ticket: 0 } });
    expect(spent.resources.ticket).toBe(0);
  });
});

describe("hive slots and selling", () => {
  it("3 extra slots, each more expensive, then none", () => {
    const a = slotCost(3)!.silver!;
    const b = slotCost(4)!.silver!;
    const c = slotCost(5)!.silver!;
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(slotCost(6)).toBeNull();
  });
  it("selling refunds half of build + upgrades", () => {
    const lv1: Hive = { id: "h", type: "box", level: 1, since: 0, workers: [] };
    expect(hiveSellValue(lv1)).toEqual({ silver: 750, honey: 150 });
    const lv3 = hiveSellValue({ ...lv1, level: 3 });
    expect(lv3.silver!).toBeGreaterThan(750);
  });
});

describe("synergy", () => {
  it("counts zone tiers and homeland", () => {
    const fr = BEES.filter((b) => b.zone === "fr").slice(0, 6);
    const s = computeSynergies(fr);
    expect(s.homeland).toBe("fr");
    expect(s.passives).toContain("fr");
    const mixed = computeSynergies([beeById("fr-bijou"), beeById("fr-chef"), beeById("jp-mochi"), beeById("jp-hachi")]);
    expect(mixed.zones.filter((z) => z.tier === 1).length).toBe(2);
    expect(mixed.bonus.rec).toBe(8);
    expect(mixed.bonus.spd).toBe(8);
  });
});

describe("hive income", () => {
  const owned = (ids: string[], level = 1, rank = 0) => Object.fromEntries(ids.map((id) => [id, { ...newOwnedBee(id), level, rank }]));

  it("pays honey with no storage cap", () => {
    const hive: Hive = { id: "h", type: "skep", level: 1, workers: [] };
    const rates = hiveRates(hive, {});
    expect(rates.honey).toBe(1);
    expect(income(rates, 10, {}).paid.honey).toBe(10);
    expect(income(rates, 60 * 24 * 7, {}).paid.honey).toBe(60 * 24 * 7);
  });
  it("carries fractions so slow resources still add up", () => {
    const rates = { honey: 0.4, pollen: 0, silver: 0, jelly: 0 };
    let carry = {};
    let total = 0;
    for (let i = 0; i < 10; i++) {
      const r = income(rates, 1, carry);
      total += r.paid.honey ?? 0;
      carry = r.carry;
    }
    expect(total).toBe(4);
  });
  it("shows every resource a hive makes, and perks make their resource", () => {
    const hive: Hive = { id: "h", type: "box", level: 1, workers: ["fr-chef", "fr-mousquetaire", "fr-lumiere"] };
    const r = hiveRates(hive, owned(hive.workers));
    expect(r.honey).toBeGreaterThan(2.5);
    expect(r.pollen).toBeGreaterThan(0);
    expect(r.silver).toBeGreaterThan(0);
    expect(r.jelly).toBeGreaterThan(0);
  });
  it("levelled and starred workers make more", () => {
    const hive: Hive = { id: "h", type: "box", level: 1, workers: ["fr-chef", "fr-lavande"] };
    const low = hiveRates(hive, owned(hive.workers, 1));
    const high = hiveRates(hive, owned(hive.workers, 20, 2));
    expect(high.honey).toBeGreaterThan(low.honey);
    expect(high.pollen).toBeGreaterThan(low.pollen);
  });
  it("sums all hives", () => {
    const hives: Hive[] = [
      { id: "a", type: "skep", level: 1, workers: [] },
      { id: "b", type: "box", level: 1, workers: [] },
    ];
    expect(totalRates(hives, {}).honey).toBe(3.5);
  });
});

describe("saves survive updates", () => {
  const now = 1_700_000_000_000;
  // A save written by v0.3.0: one team, hives with stored honey, no income clock.
  const v1 = {
    resources: { honey: 100, silver: 200, pollen: 300, jelly: 1, ticket: 5 },
    bees: { pip: { id: "pip", level: 7, xp: 0, rank: 1, dupes: 0 }, "fr-chef": { id: "fr-chef", level: 3, xp: 0, rank: 0, dupes: 2 }, "gone-bee": { id: "gone-bee", level: 1, xp: 0, rank: 0, dupes: 0 } },
    team: ["fr-chef", "pip", null, null, null, null],
    hives: [{ id: "h1", type: "skep", level: 2, since: now - 30 * 60000, workers: ["pip"] }],
    items: { honeyDrop: 2, honeyJar: 0, mint: 0, royalJelly: 0, candy: 0 },
    cleared: { "0-1": 3, "0-2": 2 },
    pity: { country: 12, continent: 0, world: 0, planet: 0, cosmic: 0 },
    rng: 42,
    hiveSlots: 4,
    fresh: [],
  };

  it("keeps bees, levels, resources, progress and the team", () => {
    const s = normalizeSave(v1 as never, now);
    expect(s.bees.pip.level).toBe(7);
    expect(s.bees["fr-chef"].dupes).toBe(2);
    expect(s.bees["gone-bee"]).toBeUndefined();
    expect(s.cleared).toEqual(v1.cleared);
    expect(s.pity.country).toBe(12);
    expect(s.hiveSlots).toBe(4);
    expect(s.resources.silver).toBe(200);
    expect(s.teams).toEqual([{ name: "Team 1", members: v1.team }]);
    expect(s.team).toEqual(v1.team);
  });
  it("pays the honey that was waiting in the hives", () => {
    const s = normalizeSave(v1 as never, now);
    const waiting = legacyStored(v1.hives[0] as Hive, now);
    expect(waiting).toBeGreaterThan(0);
    expect(s.resources.honey).toBe(100 + waiting);
    expect(s.lastTick).toBe(now);
    expect(s.hives[0].since).toBeUndefined();
  });
  it("is stable: a current save loads unchanged", () => {
    const once = normalizeSave(v1 as never, now);
    const twice = normalizeSave(JSON.parse(JSON.stringify(once)), now + 5000);
    expect(twice).toEqual(once);
  });
  it("new accounts get one team", () => {
    const s = newSave();
    expect(s.teams.length).toBe(1);
    expect(s.team).toEqual(s.teams[0].members);
  });
});

describe("stage rewards and stars", () => {
  it("shows a range around each reward", () => {
    const [lo, hi] = rewardRange(100);
    expect(lo).toBe(75);
    expect(hi).toBe(125);
  });
  it("lists three star rules", () => {
    expect(starRules(STAGES["1-1"]).length).toBe(3);
  });
});

describe("battle engine", () => {
  const stage = STAGES["0-1"];

  it("does not mutate its input", () => {
    const s0 = createBattle(team(["pip", "fr-bijou"]), stage, {}, 1);
    const copy = structuredClone(s0);
    act(s0, { t: "attack", uid: "a0" });
    expect(s0).toEqual(copy);
  });

  it("refuses acting twice and bursting without gauge", () => {
    const s0 = createBattle(team(["pip"]), stage, {}, 1);
    const s1 = act(s0, { t: "attack", uid: "a0" }).state;
    expect(act(s1, { t: "attack", uid: "a0" }).error).toBe("cannotAct");
    expect(act(s0, { t: "burst", uid: "a0" }).error).toBe("gaugeNotFull");
  });

  it("runs an enemy phase then gives the turn back", () => {
    const s0 = createBattle(team(["pip", "fr-bijou"]), stage, {}, 3);
    const r = endPlayerTurn(s0);
    expect(["player", "lost"]).toContain(r.state.phase);
    expect(r.events.some((e) => e.type === "attack")).toBe(true);
  });

  it("bosses use their big skill exactly every `every` enemy turns", () => {
    const bossStage = STAGES["0-3"];
    let s = createBattle(team(["pip"]), { ...bossStage, waves: [bossStage.waves.at(-1)!] }, {}, 5);
    s.allies[0].hp = s.allies[0].maxHp = 1e9;
    const turns: number[] = [];
    for (let turn = 1; turn <= 9; turn++) {
      const r = endPlayerTurn(s);
      if (r.events.some((e) => e.type === "bossSkill")) turns.push(turn);
      s = r.state;
    }
    expect(turns).toEqual([3, 6, 9]);
  });

  it("revives with royal jelly", () => {
    const s0 = createBattle(team(["pip", "fr-bijou"]), stage, { royalJelly: 1 }, 1);
    s0.allies[1].hp = 0;
    const r = act(s0, { t: "item", item: "royalJelly", target: "a1" });
    expect(r.state.allies[1].hp).toBeGreaterThan(0);
    expect(r.state.items.royalJelly).toBe(0);
  });
});

describe("auto mode", () => {
  it("never spends items, even when bees faint", () => {
    const items = { honeyDrop: 3, honeyJar: 2, mint: 2, royalJelly: 2, candy: 2 };
    for (let seed = 1; seed <= 10; seed++) {
      // A hopeless fight, so allies get low and faint: the bot must still keep every item.
      const end = autoBattle(createBattle(team(["pip", "fr-bijou"], 1), STAGES["3-5"], items, seed));
      expect(end.items).toEqual(items);
    }
  });
});

describe("balance (auto-battle)", () => {
  const winRate = (ids: string[], level: number, stageId: string, runs = 30) => {
    let wins = 0;
    for (let seed = 1; seed <= runs; seed++) {
      const end = autoBattle(createBattle(team(ids, level), STAGES[stageId], { honeyDrop: 2 }, seed));
      if (end.phase === "won") wins++;
    }
    return wins / runs;
  };

  it("a fresh starter team clears the tutorial", () => {
    expect(winRate(["pip", "fr-bijou", "fr-lavande"], 1, "0-1")).toBeGreaterThan(0.9);
  });
  it("the tutorial boss is beatable with a few levels", () => {
    expect(winRate(["pip", "fr-bijou", "fr-lavande", "fr-chef"], 4, "0-3")).toBeGreaterThan(0.6);
  });
  it("level 1 commons cannot steamroll late chapters", () => {
    expect(winRate(["pip", "fr-bijou", "jp-mochi"], 1, "5-5")).toBeLessThan(0.1);
  });
  it("every chapter has a boss and space chapters exist", () => {
    expect(CHAPTERS.length).toBeGreaterThanOrEqual(17);
    expect(CHAPTERS.some((c) => c.zone === "sun")).toBe(true);
    expect(CHAPTERS.some((c) => c.zone === "andromeda")).toBe(true);
  });
  it("a levelled epic team can clear chapter 3's boss", () => {
    expect(winRate(["fr-mousquetaire", "jp-sakura", "de-ritter", "it-maschera", "in-kamala", "pip"], 22, "3-5")).toBeGreaterThan(0.5);
  });
});

describe("timed events", () => {
  const at = (y: number, m: number, d: number, h = 12) => +new Date(y, m - 1, d, h);
  it("always has a daily, a monthly and a seasonal event", () => {
    const kinds = activeEvents(at(2026, 3, 10)).map((e) => e.kind);
    expect(kinds).toEqual(expect.arrayContaining(["daily", "monthly", "season"]));
  });
  it("only the daily event lasts a single day; the others last much longer", () => {
    for (const t of [at(2026, 10, 25), at(2026, 12, 31), at(2027, 1, 3), at(2026, 5, 20)]) {
      for (const e of activeEvents(t)) {
        const hours = (e.end - e.start) / 3600000;
        if (e.kind === "daily") expect(hours).toBeLessThanOrEqual(25);
        else expect(hours, e.id).toBeGreaterThanOrEqual(24 * 7);
        expect(t >= e.start && t < e.end).toBe(true);
      }
    }
  });
  it("runs Halloween at the end of October and Christmas across the new year", () => {
    expect(activeEvents(at(2026, 10, 25)).some((e) => e.id === "halloween-2026")).toBe(true);
    expect(activeEvents(at(2026, 12, 24)).some((e) => e.id === "christmas-2026")).toBe(true);
    expect(activeEvents(at(2027, 1, 3)).some((e) => e.id === "christmas-2026")).toBe(true);
    expect(activeEvents(at(2026, 7, 1)).some((e) => e.kind === "holiday")).toBe(false);
  });
  it("event stages can be found only while the event runs, and scale with progress", () => {
    const t = at(2026, 10, 25);
    const ev = activeEvents(t).find((e) => e.kind === "holiday")!;
    const st = eventStage(ev, 2, {});
    expect(findEventStage(st.id, {}, Infinity, t)?.id).toBe(st.id);
    expect(findEventStage(st.id, {}, Infinity, at(2026, 12, 1))).toBeUndefined();
    const later = eventStage(ev, 2, Object.fromEntries(CHAPTERS.slice(0, 6).flatMap((c) => c.stages.map((s) => [s.id, 3]))));
    expect(later.waves[0][0].level).toBeGreaterThan(st.waves[0][0].level);
    expect(st.firstClear.ticket).toBeGreaterThan(0);
  });
});

describe("player feedback 2", () => {
  // The store saves to localStorage, which Node does not have.
  const mem = new Map<string, string>();
  globalThis.localStorage ??= { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as Storage;
  const owned = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { ...newOwnedBee(id), level: 10 }]));
  it("best workers follow the chosen resources", () => {
    const bees = owned(["fr-chef", "jp-kitsu", "fr-mousquetaire", "jp-hachi", "fr-bijou", "jp-mochi"]);
    const hives: Hive[] = [{ id: "a", type: "box", level: 1, workers: [] }];
    const perk = (id: string) => BEES.find((b) => b.id === id)!.perk;
    // Bees making the chosen resource come first; slots nobody can help with get all-round bees.
    const pollen = bestWorkers(hives, bees, ["pollen"]).a;
    expect(pollen.map(perk).slice(0, 2)).toEqual(["pollen", "pollen"]);
    const silver = bestWorkers(hives, bees, ["silver"]).a;
    expect(silver.map(perk).slice(0, 2)).toEqual(["silver", "silver"]);
    expect(pollen.length).toBe(3);
    expect(bestWorkers(hives, bees, ["honey", "pollen", "silver", "jelly"]).a.length).toBe(3);
  });
  it("no line is dominated by one element, and healers are not mostly light", () => {
    for (const z of new Set(BEES.map((b) => b.zone))) {
      const line = BEES.filter((b) => b.zone === z);
      const counts: Record<string, number> = {};
      line.forEach((b) => (counts[b.element] = (counts[b.element] ?? 0) + 1));
      expect(Math.max(...Object.values(counts)), z).toBeLessThanOrEqual(3);
    }
    const healers = BEES.filter((b) => b.role === "healer");
    expect(healers.filter((b) => b.element === "light").length / healers.length).toBeLessThan(0.35);
  });
  it("a team of one element gets the unity bonus", () => {
    const flame = BEES.filter((b) => b.element === "flame").slice(0, 3);
    expect(computeSynergies(flame).unity).toEqual({ element: "flame", pct: 10 });
    expect(computeSynergies([...flame.slice(0, 2), BEES.find((b) => b.element === "wave")!]).unity).toBeNull();
  });
  it("events follow the team level", () => {
    const ev = activeEvents(+new Date(2026, 9, 25))[0];
    const deep = Object.fromEntries(CHAPTERS.slice(0, 9).flatMap((c) => c.stages.map((s) => [s.id, 3])));
    expect(eventStage(ev, 0, deep, 12).waves[0][0].level).toBe(12);
    expect(teamLevel({ team: ["pip", "fr-chef", null, null, null, null], bees: { pip: { ...newOwnedBee("pip"), level: 10 }, "fr-chef": { ...newOwnedBee("fr-chef"), level: 20 } } })).toBe(15);
  });
  it("gives the update gift once per version, and old saves get it", () => {
    expect(compareVersions("0.5.0", "0.4.9")).toBeGreaterThan(0);
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    useGame.setState(normalizeSave({ resources: { honey: 0, silver: 0, pollen: 0, jelly: 0, ticket: 0 } }));
    const before = useGame.getState().resources.ticket;
    expect(useGame.getState().claimUpdateGift("0.5.0")).toEqual(UPDATE_GIFT);
    expect(useGame.getState().resources.ticket).toBe(before + UPDATE_GIFT.ticket!);
    expect(useGame.getState().claimUpdateGift("0.5.0")).toBeNull();
  });
  it("a save code loads back the same save", async () => {
    const { saveCode } = await import("@/store/game");
    useGame.setState({ resources: { honey: 123, silver: 4, pollen: 5, jelly: 6, ticket: 7 } });
    const code = saveCode();
    useGame.setState({ resources: { honey: 0, silver: 0, pollen: 0, jelly: 0, ticket: 0 } });
    expect(useGame.getState().importSave(code)).toBe(true);
    expect(useGame.getState().resources.honey).toBe(123);
  });
});
