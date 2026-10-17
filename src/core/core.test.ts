import { describe, expect, it } from "vitest";
import { autoBattle } from "./battle/autoplay";
import { act, createBattle, endPlayerTurn, type TeamMember } from "./battle/engine";
import { BEES, beeById } from "./data/bees";
import { CHAPTERS, STAGES } from "./data/story";
import { PACKS, PITY_LIMIT, SPACE_ZONES, TIER2_UNLOCK_STAGE, emptyPity, packById, pull } from "./gacha";
import { hiveCapacity, hiveSellValue, hiveStored, slotCost, type Hive } from "./hive";
import { packUnlocked } from "./unlocks";
import { newSave, normalizeSave, ticketDropChance } from "@/store/game";
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
  it("ticket drops grow with the chapter but stay rare", () => {
    expect(ticketDropChance(0)).toBeLessThan(ticketDropChance(4));
    for (let ch = 0; ch < 20; ch++) expect(ticketDropChance(ch)).toBeLessThanOrEqual(0.25);
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

describe("hive", () => {
  it("fills over time up to capacity", () => {
    const hive: Hive = { id: "h", type: "skep", level: 1, since: 0, workers: [] };
    expect(hiveStored(hive, 10 * 60000)).toBe(10);
    expect(hiveStored(hive, 1e10)).toBe(hiveCapacity(hive));
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
  it("a levelled epic team can clear chapter 3's boss", () => {
    expect(winRate(["fr-mousquetaire", "jp-sakura", "de-ritter", "it-maschera", "in-kamala", "pip"], 22, "3-5")).toBeGreaterThan(0.5);
  });
});
