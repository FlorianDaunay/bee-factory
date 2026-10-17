import { act, endPlayerTurn, playerTurnDone } from "./engine";
import type { BattleState } from "./types";

/**
 * A simple player bot: Burst when ready, otherwise attack the weakest enemy, heal with items when
 * someone is low. Used by balance tests and by the "Auto" button.
 */
export function autoStep(state: BattleState): { action: Parameters<typeof act>[1] | "end" } {
  const allies = state.allies.filter((a) => a.hp > 0);
  const fainted = state.allies.find((a) => a.hp <= 0);
  if (fainted && (state.items.royalJelly ?? 0) > 0) return { action: { t: "item", item: "royalJelly", target: fainted.uid } };
  const low = allies.find((a) => a.hp / a.maxHp < 0.3);
  if (low && (state.items.honeyDrop ?? 0) > 0) return { action: { t: "item", item: "honeyDrop", target: low.uid } };

  const foes = state.enemies.filter((e) => e.hp > 0).sort((a, b) => a.hp - b.hp);
  const ready = allies.find((a) => !a.acted && a.gauge >= a.gaugeMax);
  if (ready) return { action: { t: "burst", uid: ready.uid, target: foes[0]?.uid } };
  const next = allies.find((a) => !a.acted);
  if (next) return { action: { t: "attack", uid: next.uid, target: foes[0]?.uid } };
  return { action: "end" };
}

export function autoBattle(initial: BattleState, maxSteps = 2000): BattleState {
  let state = initial;
  for (let i = 0; i < maxSteps && (state.phase === "player" || state.phase === "enemy"); i++) {
    const { action } = autoStep(state);
    if (action === "end" || playerTurnDone(state)) state = endPlayerTurn(state).state;
    else {
      const r = act(state, action);
      if (r.error) state = endPlayerTurn(state).state;
      else state = r.state;
    }
  }
  return state;
}
