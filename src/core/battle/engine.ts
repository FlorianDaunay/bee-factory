import { beeById } from "../data/bees";
import { enemyById } from "../data/enemies";
import { elementMultiplier } from "../data/meta";
import type { Stage } from "../data/story";
import { statsAt } from "../progression";
import { Rng } from "../rng";
import { computeSynergies } from "../synergy";
import type { Effect, ItemId, StatusId } from "../types";
import type { BattleEvent, BattleState, Hit, PlayerAction, StepResult, Unit, WaveSpec } from "./types";

export interface TeamMember {
  id: string;
  level: number;
  rank: number;
}

const GAUGE_PER_HIT = 3;
const GAUGE_ON_KILL = 4;
const GAUGE_WHEN_HIT = 1;
const BASE_CRIT = 0.08;
const COMBO_STEP = 0.1;
const COMBO_MAX = 1.6;

const alive = (u: Unit) => u.hp > 0;
const has = (u: Unit, s: StatusId) => u.statuses.some((x) => x.id === s);
const BAD: StatusId[] = ["poison", "burn", "stun", "weaken"];

/* ------------------------------------------------------------------ setup */

export function createBattle(team: TeamMember[], stage: Stage, items: Partial<Record<ItemId, number>>, seed: number): BattleState {
  const species = team.map((m) => beeById(m.id));
  const syn = computeSynergies(species);
  const b = syn.bonus;

  const allies: Unit[] = team.map((m, i) => {
    const sp = species[i];
    const s = statsAt(sp, m.level, m.rank);
    const maxHp = Math.round(s.hp * (1 + b.hp / 100));
    return {
      uid: `a${i}`,
      side: "ally",
      ref: sp.id,
      name: sp.name,
      element: sp.element,
      role: sp.role,
      rarity: sp.rarity,
      zone: sp.zone,
      level: m.level,
      maxHp,
      hp: maxHp,
      atk: Math.round(s.atk * (1 + b.atk / 100)),
      def: Math.round(s.def * (1 + b.def / 100)),
      rec: Math.round(s.rec * (1 + b.rec / 100)),
      spd: Math.round(s.spd * (1 + b.spd / 100)),
      gauge: syn.passives.includes("jp") ? Math.floor(sp.gaugeMax / 2) : 0,
      gaugeMax: sp.gaugeMax,
      statuses: [],
      acted: false,
      attack: sp.attack,
      burst: sp.burst,
      lastStand: syn.passives.includes("it"),
    };
  });

  const state: BattleState = {
    stageId: stage.id,
    rng: seed,
    turn: 1,
    phase: "player",
    wave: 0,
    waves: stage.waves,
    allies,
    enemies: [],
    combo: { target: null, count: 0 },
    items: { ...items },
    bonus: b,
    passives: syn.passives,
    faints: 0,
  };
  spawnWave(state, []);
  return state;
}

function spawnWave(state: BattleState, events: BattleEvent[]) {
  const specs: WaveSpec[] = state.waves[state.wave];
  state.enemies = specs.map((spec, i) => {
    const sp = enemyById(spec.id);
    const m = 1 + (spec.level - 1) * 0.12;
    const maxHp = Math.round(sp.base.hp * m);
    return {
      uid: `e${state.wave}-${i}`,
      side: "enemy",
      ref: sp.id,
      name: sp.name,
      element: sp.element,
      level: spec.level,
      maxHp,
      hp: maxHp,
      atk: Math.round(sp.base.atk * m),
      def: Math.round(sp.base.def * m),
      rec: 0,
      spd: sp.base.spd,
      gauge: 0,
      gaugeMax: 0,
      statuses: [],
      acted: false,
      attack: sp.attack,
      boss: sp.boss,
      bossTimer: sp.boss ? sp.boss.every - 1 : undefined,
    };
  });
  for (const a of state.allies) a.acted = !alive(a);
  state.combo = { target: null, count: 0 };
  if (state.passives.includes("de")) state.allies.filter(alive).forEach((a) => addStatus(a, "guard", 1, events));
  if (state.passives.includes("br")) state.allies.filter(alive).forEach((a) => addStatus(a, "fury", 1, events));
  events.push({ type: "wave", wave: state.wave });
}

/* ------------------------------------------------------------------ helpers */

function addStatus(u: Unit, id: StatusId, turns: number, events: BattleEvent[]) {
  const existing = u.statuses.find((s) => s.id === id);
  if (existing) existing.turns = Math.max(existing.turns, turns);
  else u.statuses.push({ id, turns });
  events.push({ type: "status", tgt: u.uid, status: id });
}

function gainGauge(state: BattleState, u: Unit, amount: number) {
  if (u.side !== "ally" || !alive(u)) return;
  u.gauge = Math.min(u.gaugeMax, u.gauge + amount * (1 + state.bonus.gauge / 100));
}

function healUnit(u: Unit, amount: number, events: BattleEvent[]) {
  if (!alive(u)) return;
  const real = Math.min(u.maxHp - u.hp, Math.round(amount));
  u.hp += real;
  events.push({ type: "heal", tgt: u.uid, amount: real });
}

/** Applies damage; returns true if the unit fainted. */
function hurt(state: BattleState, u: Unit, dmg: number, events: BattleEvent[]): boolean {
  if (!alive(u)) return false;
  u.hp = Math.max(0, u.hp - dmg);
  if (u.hp === 0 && u.lastStand) {
    u.hp = 1;
    u.lastStand = false;
    events.push({ type: "lastStand", uid: u.uid });
    return false;
  }
  if (u.hp === 0) {
    u.statuses = [];
    u.gauge = 0;
    events.push({ type: "faint", uid: u.uid });
    if (u.side === "ally") state.faints++;
    return true;
  }
  return false;
}

function attackStat(u: Unit): number {
  return u.atk * (has(u, "fury") ? 1.3 : 1) * (has(u, "weaken") ? 0.7 : 1);
}

function computeHits(state: BattleState, rng: Rng, src: Unit, tgt: Unit, power: number, hits: number, comboMult: number): { hits: Hit[]; elem: number } {
  const elem = elementMultiplier(src.element, tgt.element);
  const mitigation = 120 / (120 + tgt.def);
  const guard = has(tgt, "guard") ? 0.6 : 1;
  const total = attackStat(src) * power * comboMult * elem * mitigation * guard * rng.range(0.92, 1.08);
  const critChance = BASE_CRIT + (src.side === "ally" ? state.bonus.crit / 100 : 0);
  const critMult = src.side === "ally" && state.passives.includes("eg") ? 2 : 1.5;
  const per = total / hits;
  const out: Hit[] = [];
  for (let i = 0; i < hits; i++) {
    const crit = rng.chance(critChance);
    out.push({ dmg: Math.max(1, Math.round(per * (crit ? critMult : 1))), crit });
  }
  return { hits: out, elem };
}

/** Deals hits to a target, handles gauge and faint. Returns whether the target fainted. */
function strike(state: BattleState, rng: Rng, src: Unit, tgt: Unit, power: number, hits: number, comboMult: number, events: BattleEvent[], burst: boolean): boolean {
  const res = computeHits(state, rng, src, tgt, power, hits, comboMult);
  events.push({ type: "attack", src: src.uid, tgt: tgt.uid, hits: res.hits, elem: res.elem, combo: state.combo.count, burst });
  const total = res.hits.reduce((a, h) => a + h.dmg, 0);
  gainGauge(state, src, GAUGE_PER_HIT * hits * (burst ? 0 : 1));
  gainGauge(state, tgt, GAUGE_WHEN_HIT * hits);
  const fainted = hurt(state, tgt, total, events);
  if (fainted) gainGauge(state, src, GAUGE_ON_KILL + (state.passives.includes("us") ? 6 : 0));
  return fainted;
}

function pickEnemyTarget(state: BattleState, wanted?: string): Unit | undefined {
  const foes = state.enemies.filter(alive);
  return foes.find((e) => e.uid === wanted) ?? foes.find((e) => e.uid === state.combo.target) ?? foes[0];
}

function statusChance(state: BattleState, src: Unit, base: number): number {
  return src.side === "ally" ? base * (1 + state.bonus.status / 100) : base;
}

function applyEffects(state: BattleState, rng: Rng, src: Unit, effects: Effect[], chosen: Unit | undefined, events: BattleEvent[]) {
  const foesOf = (u: Unit) => (u.side === "ally" ? state.enemies : state.allies).filter(alive);
  const friendsOf = (u: Unit) => (u.side === "ally" ? state.allies : state.enemies).filter(alive);

  for (const e of effects) {
    switch (e.t) {
      case "damage": {
        const targets = e.target === "all" ? foesOf(src) : chosen && alive(chosen) ? [chosen] : foesOf(src).slice(0, 1);
        for (const t of targets) strike(state, rng, src, t, e.power, e.hits, 1, events, true);
        break;
      }
      case "heal": {
        const team = friendsOf(src);
        const targets =
          e.target === "team" ? team : e.target === "self" ? [src] : [team.reduce((lo, u) => (u.hp / u.maxHp < lo.hp / lo.maxHp ? u : lo), team[0])];
        for (const t of targets) healUnit(t, src.rec * e.power * 0.55 + t.maxHp * 0.06, events);
        break;
      }
      case "status": {
        const pool =
          e.target === "self" ? [src]
          : e.target === "team" ? friendsOf(src)
          : e.target === "all" ? foesOf(src)
          : e.target === "lowest" ? friendsOf(src).slice(0, 1)
          : chosen && alive(chosen) ? [chosen] : foesOf(src).slice(0, 1);
        for (const t of pool) {
          const good = ["guard", "fury", "regen", "taunt"].includes(e.status);
          // Bosses resist stun half of the time.
          const resist = e.status === "stun" && t.boss ? 0.5 : 1;
          if (good || rng.chance(statusChance(state, src, e.chance) * resist)) addStatus(t, e.status, e.turns, events);
        }
        break;
      }
      case "gauge":
        for (const t of friendsOf(src)) {
          if (t === src) continue;
          gainGauge(state, t, e.amount);
          events.push({ type: "gauge", tgt: t.uid });
        }
        break;
      case "cleanse":
        for (const t of friendsOf(src)) {
          t.statuses = t.statuses.filter((s) => !BAD.includes(s.id));
          events.push({ type: "cleanse", tgt: t.uid });
        }
        break;
    }
  }
}

/* ------------------------------------------------------------------ flow */

function checkOutcome(state: BattleState, events: BattleEvent[]): void {
  if (!state.allies.some(alive)) {
    state.phase = "lost";
    events.push({ type: "end", result: "lost" });
    return;
  }
  if (!state.enemies.some(alive)) {
    if (state.wave + 1 < state.waves.length) {
      state.wave++;
      spawnWave(state, events);
      state.phase = "player";
    } else {
      state.phase = "won";
      events.push({ type: "end", result: "won" });
    }
  }
}

/** Start-of-phase upkeep for one side: damage over time, regen, stun check, durations. */
function upkeep(state: BattleState, side: "ally" | "enemy", events: BattleEvent[]): Set<string> {
  const stunned = new Set<string>();
  const units = side === "ally" ? state.allies : state.enemies;
  for (const u of units.filter(alive)) {
    for (const s of u.statuses) {
      if (s.id === "poison" || s.id === "burn") {
        const pct = (s.id === "poison" ? 0.06 : 0.08) * (u.boss ? 0.35 : 1);
        const dmg = Math.max(1, Math.round(u.maxHp * pct));
        events.push({ type: "dot", tgt: u.uid, dmg, status: s.id });
        hurt(state, u, dmg, events);
      }
      if (s.id === "regen" && alive(u)) healUnit(u, u.maxHp * 0.08, events);
    }
    if (side === "ally" && state.passives.includes("fr") && alive(u) && u.hp < u.maxHp) healUnit(u, u.maxHp * 0.03, events);
    if (has(u, "stun") && alive(u)) {
      stunned.add(u.uid);
      events.push({ type: "stunned", uid: u.uid });
    }
    u.statuses = u.statuses.map((s) => ({ ...s, turns: s.turns - 1 })).filter((s) => s.turns > 0);
  }
  return stunned;
}

function startPlayerPhase(state: BattleState, events: BattleEvent[]) {
  state.turn++;
  state.phase = "player";
  state.combo = { target: null, count: 0 };
  events.push({ type: "phase", phase: "player" });
  const stunned = upkeep(state, "ally", events);
  for (const a of state.allies) a.acted = !alive(a) || stunned.has(a.uid);
  checkOutcome(state, events);
}

/** True when no ally can still act this turn. */
export function playerTurnDone(state: BattleState): boolean {
  return state.phase === "player" && state.allies.every((a) => a.acted || !alive(a));
}

export function act(input: BattleState, action: PlayerAction): StepResult {
  if (input.phase !== "player") return { state: input, events: [], error: "notYourTurn" };
  const state = structuredClone(input);
  const rng = new Rng(state.rng);
  const events: BattleEvent[] = [];

  if (action.t === "item") {
    const count = state.items[action.item] ?? 0;
    if (count <= 0) return { state: input, events: [], error: "noItem" };
    const tgt = state.allies.find((a) => a.uid === action.target);
    switch (action.item) {
      case "honeyDrop":
        if (!tgt || !alive(tgt)) return { state: input, events: [], error: "badTarget" };
        healUnit(tgt, tgt.maxHp * 0.4, events);
        break;
      case "honeyJar":
        for (const a of state.allies.filter(alive)) healUnit(a, a.maxHp * 0.25, events);
        break;
      case "mint":
        if (!tgt || !alive(tgt)) return { state: input, events: [], error: "badTarget" };
        tgt.statuses = tgt.statuses.filter((s) => !BAD.includes(s.id));
        events.push({ type: "cleanse", tgt: tgt.uid });
        break;
      case "royalJelly":
        if (!tgt || alive(tgt)) return { state: input, events: [], error: "badTarget" };
        tgt.hp = Math.round(tgt.maxHp * 0.5);
        tgt.acted = false;
        events.push({ type: "revive", uid: tgt.uid });
        break;
      case "candy":
        if (!tgt || !alive(tgt)) return { state: input, events: [], error: "badTarget" };
        tgt.gauge = tgt.gaugeMax;
        events.push({ type: "gauge", tgt: tgt.uid });
        break;
    }
    state.items[action.item] = count - 1;
    events.unshift({ type: "item", item: action.item, tgt: action.target });
    state.rng = rng.state;
    return { state, events };
  }

  const src = state.allies.find((a) => a.uid === action.uid);
  if (!src || !alive(src) || src.acted) return { state: input, events: [], error: "cannotAct" };

  const target = pickEnemyTarget(state, action.target);
  if (!target) return { state: input, events: [], error: "noTarget" };

  if (action.t === "burst") {
    if (src.gauge < src.gaugeMax || !src.burst) return { state: input, events: [], error: "gaugeNotFull" };
    src.gauge = 0;
    events.push({ type: "burst", src: src.uid, name: src.burst.name });
    applyEffects(state, rng, src, src.burst.effects, target, events);
  } else {
    if (state.combo.target === target.uid) state.combo.count++;
    else state.combo = { target: target.uid, count: 0 };
    const comboMult = Math.min(COMBO_MAX, 1 + state.combo.count * COMBO_STEP);
    strike(state, rng, src, target, src.attack.power, src.attack.hits, comboMult, events, false);
  }
  src.acted = true;
  state.rng = rng.state;
  checkOutcome(state, events);
  return { state, events };
}

/** Lets the player skip the remaining actions and start the enemy phase. */
export function endPlayerTurn(input: BattleState): StepResult {
  if (input.phase !== "player") return { state: input, events: [], error: "notYourTurn" };
  const state = structuredClone(input);
  const rng = new Rng(state.rng);
  const events: BattleEvent[] = [];
  enemyPhase(state, rng, events);
  state.rng = rng.state;
  return { state, events };
}

function enemyPhase(state: BattleState, rng: Rng, events: BattleEvent[]) {
  state.phase = "enemy";
  events.push({ type: "phase", phase: "enemy" });
  const stunned = upkeep(state, "enemy", events);
  checkOutcome(state, events);
  if (state.phase !== "enemy") return;

  const order = state.enemies.filter(alive).sort((a, b) => b.spd - a.spd);
  for (const e of order) {
    if (!alive(e) || stunned.has(e.uid)) continue;
    const targets = state.allies.filter(alive);
    if (!targets.length) break;

    if (e.boss && e.bossTimer !== undefined) {
      if (e.bossTimer <= 0) {
        events.push({ type: "bossSkill", src: e.uid, name: e.boss.name });
        applyEffects(state, rng, e, e.boss.effects, undefined, events);
        e.bossTimer = e.boss.every;
        checkOutcome(state, events);
        if (state.phase !== "enemy") return;
        continue;
      }
      e.bossTimer--;
      if (e.bossTimer === 0) events.push({ type: "telegraph", src: e.uid, name: e.boss.name });
    }

    const taunters = targets.filter((t) => has(t, "taunt"));
    const tgt = taunters.length ? rng.pick(taunters) : pickWeighted(rng, targets);
    strike(state, rng, e, tgt, e.attack.power, e.attack.hits, 1, events, false);
    const st = e.attack.status;
    if (st && alive(tgt) && rng.chance(st.chance)) addStatus(tgt, st.id, st.turns, events);
    checkOutcome(state, events);
    if (state.phase !== "enemy") return;
  }
  startPlayerPhase(state, events);
}

/** Enemies slightly prefer wounded bees, so focus fire feels threatening but fair. */
function pickWeighted(rng: Rng, targets: Unit[]): Unit {
  const weights = targets.map((t) => 1 + (1 - t.hp / t.maxHp));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < targets.length; i++) {
    roll -= weights[i];
    if (roll < 0) return targets[i];
  }
  return targets[targets.length - 1];
}

/** Stars earned for a won battle: win, nobody fainted, quick. */
export function battleStars(state: BattleState): number {
  if (state.phase !== "won") return 0;
  let stars = 1;
  if (state.faints === 0) stars++;
  if (state.turn <= state.waves.length * 3) stars++;
  return stars;
}
