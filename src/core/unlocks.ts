import { CHAPTERS, type Stage } from "./data/story";
import type { Pack } from "./gacha";

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

/** France is the starter pack; other countries open with their chapter. */
export function packUnlocked(cleared: Cleared, pack: Pack): boolean {
  const zoneOpen = (z: string) => z === "fr" || CHAPTERS.some((c) => c.zone === z && chapterUnlocked(cleared, c.index));
  if (pack.family === "country") return zoneOpen(pack.zones[0]);
  if (pack.family === "continent") return highestChapter(cleared) >= 2 && pack.zones.some(zoneOpen);
  return highestChapter(cleared) >= 4;
}

/** The next stage to play: the first unlocked stage not yet cleared. */
export function nextStage(cleared: Cleared): Stage | undefined {
  for (const ch of CHAPTERS) for (const s of ch.stages) if (cleared[s.id] === undefined && stageUnlocked(cleared, s)) return s;
  return undefined;
}
