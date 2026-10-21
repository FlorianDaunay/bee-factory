import { CHAPTERS, type Stage } from "./data/story";
import { UNLOCK_STAGE, type Pack, type PackTier } from "./gacha";

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

/** Tier 1 (Earth) packs are always open; tiers 2 and 3 open when their story boss is beaten. */
export function packUnlocked(cleared: Cleared, pack: Pack): boolean {
  return tierUnlocked(cleared, pack.tier);
}

export function tierUnlocked(cleared: Cleared, tier: PackTier): boolean {
  const stage = UNLOCK_STAGE[tier];
  return stage === null || cleared[stage] !== undefined;
}

export const tier2Unlocked = (cleared: Cleared) => tierUnlocked(cleared, 2);

/** The next stage to play: the first unlocked stage not yet cleared. */
export function nextStage(cleared: Cleared): Stage | undefined {
  for (const ch of CHAPTERS) for (const s of ch.stages) if (cleared[s.id] === undefined && stageUnlocked(cleared, s)) return s;
  return undefined;
}
