import type { BossSkill, Burst, Element, ItemId, Rarity, Role, StatusId, ZoneId } from "../types";
import type { TeamBonus } from "../synergy";

export type Side = "ally" | "enemy";

export interface StatusInst {
  id: StatusId;
  turns: number;
}

export interface Unit {
  uid: string;
  side: Side;
  /** Species id (bee or enemy). */
  ref: string;
  name: string;
  element: Element;
  role?: Role;
  rarity?: Rarity;
  zone?: ZoneId;
  level: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  rec: number;
  spd: number;
  gauge: number;
  gaugeMax: number;
  statuses: StatusInst[];
  acted: boolean;
  attack: { hits: number; power: number; status?: { id: StatusId; chance: number; turns: number } };
  burst?: Burst;
  boss?: BossSkill;
  /** Boss turns until its big skill. */
  bossTimer?: number;
  /** Italy passive: survives one fatal hit. */
  lastStand?: boolean;
}

export interface Hit {
  dmg: number;
  crit: boolean;
}

export type BattleEvent =
  | { type: "attack"; src: string; tgt: string; hits: Hit[]; elem: number; combo: number; burst?: boolean }
  | { type: "burst"; src: string; name: string }
  | { type: "bossSkill"; src: string; name: string }
  | { type: "telegraph"; src: string; name: string }
  | { type: "heal"; tgt: string; amount: number }
  | { type: "status"; tgt: string; status: StatusId }
  | { type: "cleanse"; tgt: string }
  | { type: "dot"; tgt: string; dmg: number; status: StatusId }
  | { type: "faint"; uid: string }
  | { type: "revive"; uid: string }
  | { type: "lastStand"; uid: string }
  | { type: "gauge"; tgt: string }
  | { type: "item"; item: ItemId; tgt?: string }
  | { type: "stunned"; uid: string }
  | { type: "wave"; wave: number }
  | { type: "phase"; phase: Phase }
  | { type: "end"; result: "won" | "lost" };

export type Phase = "player" | "enemy" | "won" | "lost";

export interface WaveSpec {
  id: string;
  level: number;
}

export interface BattleState {
  stageId: string;
  rng: number;
  turn: number;
  phase: Phase;
  wave: number;
  waves: WaveSpec[][];
  allies: Unit[];
  enemies: Unit[];
  /** Consecutive hits on the same target this turn. */
  combo: { target: string | null; count: number };
  items: Partial<Record<ItemId, number>>;
  bonus: TeamBonus;
  passives: ZoneId[];
  faints: number;
}

export type PlayerAction =
  | { t: "attack"; uid: string; target?: string }
  | { t: "burst"; uid: string; target?: string }
  | { t: "item"; item: ItemId; target?: string };

export interface StepResult {
  state: BattleState;
  events: BattleEvent[];
  error?: string;
}
