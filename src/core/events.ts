import { enemyId } from "./data/enemies";
import { CHAPTERS, stageLevel, type Stage, type WaveEnemy } from "./data/story";
import type { Element, EnemyKind, ItemId, ResourceId, Resources } from "./types";
import { highestChapter, type Cleared } from "./unlocks";

/**
 * Timed dungeons, worked out from the calendar (no server needed). The daily one changes at
 * midnight; every other kind lasts several days or more, so it is hard to miss.
 */
export type EventKind = "daily" | "monthly" | "season" | "holiday";

export interface EventTheme {
  name: string;
  element: Element;
  kinds: [EnemyKind, EnemyKind, EnemyKind];
  boss: string;
  scene: [string, string];
  /** Resource the event pays extra of. */
  focus: ResourceId;
}

export interface GameEvent extends EventTheme {
  /** Unique per period, e.g. "halloween-2026" or "daily-2026-10-21". */
  id: string;
  kind: EventKind;
  start: number;
  end: number;
}

export const DIFFICULTIES = ["Easy", "Normal", "Hard"] as const;

const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** One theme per weekday (Sunday first). */
const DAILY: EventTheme[] = [
  { name: "Sunday Swarm", element: "light", kinds: ["wasp", "hornet", "moth"], boss: "boss-sting", scene: ["#FFF3C4", "#F2C14E"], focus: "ticket" },
  { name: "Pollen Monday", element: "leaf", kinds: ["ant", "mantis", "spider"], boss: "boss-reaper", scene: ["#DFF5D0", "#7FB77E"], focus: "pollen" },
  { name: "Silver Tuesday", element: "storm", kinds: ["beetle", "hornet", "ant"], boss: "boss-oni", scene: ["#E3EAF2", "#9AA5B1"], focus: "silver" },
  { name: "Honey Wednesday", element: "flame", kinds: ["wasp", "moth", "ant"], boss: "boss-vesuvia", scene: ["#FFE8B0", "#F5B301"], focus: "honey" },
  { name: "Jelly Thursday", element: "wave", kinds: ["moth", "spider", "beetle"], boss: "boss-mante", scene: ["#FCE4F0", "#E07A9A"], focus: "jelly" },
  { name: "Pollen Friday", element: "shadow", kinds: ["spider", "mantis", "moth"], boss: "boss-shade", scene: ["#D9D4FF", "#5C4A8C"], focus: "pollen" },
  { name: "Saturday Raid", element: "storm", kinds: ["hornet", "beetle", "mantis"], boss: "boss-stag", scene: ["#CFE0FF", "#3A5A8C"], focus: "ticket" },
];

const SEASONS: (EventTheme & { months: number[] })[] = [
  { months: [2, 3, 4], name: "Spring Bloom", element: "leaf", kinds: ["mantis", "ant", "moth"], boss: "boss-spring", scene: ["#E8FFD6", "#9BD770"], focus: "pollen" },
  { months: [5, 6, 7], name: "Summer Blaze", element: "flame", kinds: ["wasp", "hornet", "ant"], boss: "boss-summer", scene: ["#FFE9B0", "#FF8A3D"], focus: "honey" },
  { months: [8, 9, 10], name: "Autumn Harvest", element: "shadow", kinds: ["spider", "beetle", "moth"], boss: "boss-autumn", scene: ["#FFE1C2", "#B5651D"], focus: "silver" },
  { months: [11, 0, 1], name: "Winter Frost", element: "wave", kinds: ["moth", "beetle", "spider"], boss: "boss-winter", scene: ["#E8F1F8", "#7FA7C9"], focus: "jelly" },
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_ELEMENTS: Element[] = ["wave", "light", "leaf", "storm", "leaf", "flame", "flame", "storm", "shadow", "shadow", "wave", "light"];
const MONTH_BOSSES = ["boss-mante", "boss-widow", "boss-reaper", "boss-oni", "boss-bullet", "boss-vesuvia", "boss-rust", "boss-tempest", "boss-stag", "boss-lunar", "boss-warden", "boss-shade"];

/** Holidays: [month, day] start and end, inclusive (end may be in the next year). */
const HOLIDAYS: (EventTheme & { key: string; from: [number, number]; to: [number, number] })[] = [
  { key: "valentine", from: [1, 7], to: [1, 21], name: "Sweetheart Garden", element: "light", kinds: ["moth", "wasp", "moth"], boss: "boss-heart", scene: ["#FFE1EA", "#FF8FAB"], focus: "jelly" },
  { key: "beeday", from: [4, 15], to: [4, 25], name: "World Bee Day", element: "leaf", kinds: ["wasp", "hornet", "ant"], boss: "boss-queenwasp", scene: ["#FFF3C4", "#9BD770"], focus: "ticket" },
  { key: "halloween", from: [9, 20], to: [10, 3], name: "Halloween Night", element: "shadow", kinds: ["spider", "moth", "beetle"], boss: "boss-pumpkin", scene: ["#2A1838", "#FF8A3D"], focus: "ticket" },
  { key: "christmas", from: [11, 15], to: [0, 6], name: "Winter Fest", element: "wave", kinds: ["beetle", "moth", "spider"], boss: "boss-frost", scene: ["#DDEBFF", "#F5F7FA"], focus: "ticket" },
];

function holidayRange(h: (typeof HOLIDAYS)[number], now: Date): { start: Date; end: Date; year: number } | null {
  // A holiday that wraps the new year started last year when we are early in January.
  for (const y of [now.getFullYear(), now.getFullYear() - 1]) {
    const start = new Date(y, h.from[0], h.from[1]);
    const endYear = h.to[0] < h.from[0] ? y + 1 : y;
    const end = new Date(endYear, h.to[0], h.to[1] + 1);
    if (now >= start && now < end) return { start, end, year: y };
  }
  return null;
}

/** Every event running at `at` (local time), daily first. */
export function activeEvents(at = Date.now()): GameEvent[] {
  const now = new Date(at);
  const today = day(now);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const events: GameEvent[] = [];

  events.push({ ...DAILY[now.getDay()], id: `daily-${dateKey(today)}`, kind: "daily", start: +today, end: +tomorrow });

  for (const h of HOLIDAYS) {
    const r = holidayRange(h, now);
    if (r) events.push({ ...h, id: `${h.key}-${r.year}`, kind: "holiday", start: +r.start, end: +r.end });
  }

  const m = now.getMonth();
  const season = SEASONS.find((s) => s.months.includes(m))!;
  // A season belongs to the year it started in (winter starting in December).
  const seasonYear = m < season.months[0] ? now.getFullYear() - 1 : now.getFullYear();
  const seasonStart = new Date(seasonYear, season.months[0], 1);
  events.push({ ...season, id: `season-${season.months[0]}-${seasonYear}`, kind: "season", start: +seasonStart, end: +new Date(seasonYear, season.months[0] + 3, 1) });

  const monthStart = new Date(now.getFullYear(), m, 1);
  events.push({
    id: `monthly-${now.getFullYear()}-${pad(m + 1)}`,
    kind: "monthly",
    name: `${MONTH_NAMES[m]} Trial`,
    element: MONTH_ELEMENTS[m],
    kinds: ["hornet", "mantis", "beetle"],
    boss: MONTH_BOSSES[m],
    scene: CHAPTERS[(m % (CHAPTERS.length - 1)) + 1].scene,
    focus: "silver",
    start: +monthStart,
    end: +new Date(now.getFullYear(), m + 1, 1),
  });
  return events;
}

/** The next holiday to come (to tease it), with its start date. */
export function nextHoliday(at = Date.now()): { name: string; start: number } | null {
  const now = new Date(at);
  let best: { name: string; start: number } | null = null;
  for (const h of HOLIDAYS) {
    for (const y of [now.getFullYear(), now.getFullYear() + 1]) {
      const start = +new Date(y, h.from[0], h.from[1]);
      if (start > at && (!best || start < best.start)) best = { name: h.name, start };
    }
  }
  return best;
}

/* ------------------------------------------------------------------ stages */

const EVENT_PREFIX = "ev:";
export const eventStageId = (eventId: string, difficulty: number) => `${EVENT_PREFIX}${eventId}:${difficulty}`;
export const isEventStage = (stageId: string) => stageId.startsWith(EVENT_PREFIX);

/** First-clear bonus of each difficulty, per event kind. Holidays and seasons pay the most tickets. */
const FIRST_CLEAR: Record<EventKind, { ticket: number; jelly: number }[]> = {
  daily: [{ ticket: 0, jelly: 0 }, { ticket: 1, jelly: 0 }, { ticket: 1, jelly: 1 }],
  monthly: [{ ticket: 2, jelly: 1 }, { ticket: 3, jelly: 1 }, { ticket: 5, jelly: 2 }],
  season: [{ ticket: 3, jelly: 1 }, { ticket: 5, jelly: 2 }, { ticket: 8, jelly: 3 }],
  holiday: [{ ticket: 5, jelly: 2 }, { ticket: 8, jelly: 3 }, { ticket: 12, jelly: 4 }],
};

/** Enemy level of each difficulty, relative to the team: bees win easily at their own level, so Hard goes well above. */
export const DIFFICULTY_OFFSET = [0, 6, 16];

/**
 * Builds one difficulty of an event. Enemies follow the team's average level (never above the
 * story progress), so events stay winnable at any point: Easy at team level, Hard well above.
 */
export function eventStage(ev: GameEvent, difficulty: number, cleared: Cleared, teamLevel = Infinity): Stage {
  const ch = highestChapter(cleared);
  const level = Math.max(1, Math.min(stageLevel(ch, 2), Math.round(teamLevel)) + DIFFICULTY_OFFSET[difficulty]);
  const waveCount = 2 + difficulty;
  const waves: WaveEnemy[][] = [];
  for (let w = 0; w < waveCount; w++) {
    const wave: WaveEnemy[] = [];
    for (let e = 0; e < Math.min(4, 2 + Math.floor((w + difficulty) / 2)); e++) wave.push({ id: enemyId(ev.kinds[(w + e) % 3], ev.element), level });
    waves.push(wave);
  }
  waves[waves.length - 1] = [{ id: enemyId(ev.kinds[0], ev.element), level }, { id: ev.boss, level: level + 1 }, { id: enemyId(ev.kinds[1], ev.element), level }];

  const mult = 1 + difficulty * 0.5;
  const rewards: Partial<Resources> = {
    silver: Math.round((90 + ch * 55) * mult),
    pollen: Math.round((90 + ch * 55) * mult),
    honey: Math.round((25 + ch * 14) * mult),
  };
  // The event's focus resource pays triple (tickets and jelly come from the first clear instead).
  if (ev.focus === "silver" || ev.focus === "pollen" || ev.focus === "honey") rewards[ev.focus] = rewards[ev.focus]! * 3;
  const fc = FIRST_CLEAR[ev.kind][difficulty];
  const items: Partial<Record<ItemId, number>> = difficulty === 2 ? { royalJelly: 1, candy: 1 } : { honeyDrop: 2 };
  return {
    id: eventStageId(ev.id, difficulty),
    chapter: ch,
    index: difficulty,
    waves,
    boss: true,
    rewards,
    firstClear: {
      silver: Math.round(200 * mult * (1 + ch * 0.3)),
      ...(fc.ticket || ev.focus === "ticket" ? { ticket: fc.ticket + (ev.focus === "ticket" ? 1 : 0) } : {}),
      ...(fc.jelly || ev.focus === "jelly" ? { jelly: fc.jelly + (ev.focus === "jelly" ? 1 : 0) } : {}),
      items,
    },
    event: { id: ev.id, name: `${ev.name} · ${DIFFICULTIES[difficulty]}`, scene: ev.scene, element: ev.element },
  };
}

/** Finds an event stage by id, only while its event is running. */
export function findEventStage(stageId: string, cleared: Cleared, teamLevel = Infinity, at = Date.now()): Stage | undefined {
  if (!isEventStage(stageId)) return undefined;
  const [, eventId, diff] = /^ev:(.+):(\d)$/.exec(stageId) ?? [];
  const ev = activeEvents(at).find((e) => e.id === eventId);
  const d = Number(diff);
  return ev && d >= 0 && d < DIFFICULTIES.length ? eventStage(ev, d, cleared, teamLevel) : undefined;
}

/** "2d 5h", "5h 12m", "12m": time left until `end`. */
export function timeLeft(end: number, at = Date.now()): string {
  const m = Math.max(0, Math.floor((end - at) / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m % 60}m`;
}
