import { CHAPTERS, type Stage } from "./data/story";
import { TIER2_UNLOCK_STAGE, type Pack } from "./gacha";

export type Cleared = Record<string, number>;

export function chapterUnlocked(cleared: Cleared, index: number): boolean {
  if (index === 0) return true;
  const prev = CHAPTERS[index - 1];
  return prev ? cleared[prev.stages[prev.stages.length - 1].id] !== undefined : false;
}

export function stageUnlocked(cleared: Cleared, stage: Stage): boolean {
  if (!chapterUnlocked(cleared, stage.chapter)) return false;
  if (stage.index === 0) return true;
  return cleared[CHAPTERS[stage.chapter].stages[stage.index - 1].id] !== undefined;
}

export function highestChapter(cleared: Cleared): number {
  let i = 0;
  while (i + 1 < CHAPTERS.length && chapterUnlocked(cleared, i + 1)) i++;
  return i;
}

/** Tier 1 (Earth) packs are always open; tier 2 (space) opens after the Sakura Mountains boss. */
export function packUnlocked(cleared: Cleared, pack: Pack): boolean {
  return pack.tier === 1 || tier2Unlocked(cleared);
}

export const tier2Unlocked = (cleared: Cleared) => cleared[TIER2_UNLOCK_STAGE] !== undefined;

/** The next stage to play: the first unlocked stage not yet cleared. */
export function nextStage(cleared: Cleared): Stage | undefined {
  for (const ch of CHAPTERS) for (const s of ch.stages) if (cleared[s.id] === undefined && stageUnlocked(cleared, s)) return s;
  return undefined;
}
