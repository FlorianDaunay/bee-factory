import type { Element, EnemyKind, ItemId, ResourceId, Resources, ZoneId } from "../types";
import { enemyId } from "./enemies";

export interface WaveEnemy {
  id: string;
  level: number;
}

export interface Stage {
  id: string;
  chapter: number;
  index: number;
  waves: WaveEnemy[][];
  boss: boolean;
  rewards: Partial<Resources>;
  firstClear: Partial<Resources> & { items?: Partial<Record<ItemId, number>> };
  /** Set on timed event stages (see core/events). */
  event?: { id: string; name: string; scene: [string, string]; element: Element };
}

export interface Chapter {
  index: number;
  zone: ZoneId;
  name: string;
  element: Element;
  /** Background colours (sky, ground). */
  scene: [string, string];
  stages: Stage[];
}

interface ChapterInput {
  zone: ZoneId;
  name: string;
  element: Element;
  kinds: [EnemyKind, EnemyKind, EnemyKind];
  boss: string;
  stages: number;
  scene: [string, string];
}

const INPUTS: ChapterInput[] = [
  { zone: "home", name: "Home Meadow", element: "leaf", kinds: ["ant", "wasp", "ant"], boss: "boss-sting", stages: 3, scene: ["#BFE9FF", "#9BD770"] },
  { zone: "fr", name: "Lavender Fields", element: "wave", kinds: ["moth", "wasp", "ant"], boss: "boss-mante", stages: 5, scene: ["#E6DBFF", "#B39DDB"] },
  { zone: "jp", name: "Sakura Mountains", element: "storm", kinds: ["hornet", "moth", "mantis"], boss: "boss-oni", stages: 5, scene: ["#FFE4EC", "#F4A7B9"] },
  { zone: "de", name: "Black Forest", element: "shadow", kinds: ["beetle", "spider", "moth"], boss: "boss-stag", stages: 5, scene: ["#C9DCC5", "#2F5233"] },
  { zone: "eg", name: "Nile Delta", element: "light", kinds: ["spider", "beetle", "wasp"], boss: "boss-widow", stages: 5, scene: ["#FFE8B0", "#E3B867"] },
  { zone: "it", name: "Lemon Coast", element: "flame", kinds: ["wasp", "hornet", "moth"], boss: "boss-vesuvia", stages: 5, scene: ["#BDE7FF", "#F2D16B"] },
  { zone: "in", name: "Lotus Valley", element: "leaf", kinds: ["mantis", "spider", "ant"], boss: "boss-reaper", stages: 5, scene: ["#FFE1C2", "#7FB77E"] },
  { zone: "br", name: "Amazon Canopy", element: "wave", kinds: ["ant", "spider", "beetle"], boss: "boss-bullet", stages: 5, scene: ["#C8F2D4", "#2E8B57"] },
  { zone: "us", name: "Prairie & Cape", element: "shadow", kinds: ["hornet", "mantis", "beetle"], boss: "boss-shade", stages: 5, scene: ["#CFE0FF", "#C9A66B"] },
  // Space: Vespero's comet trail, from the Moon to the Sun.
  { zone: "moon", name: "Sea of Tranquility", element: "shadow", kinds: ["moth", "beetle", "spider"], boss: "boss-lunar", stages: 5, scene: ["#2A3570", "#C7CEEA"] },
  { zone: "mars", name: "Red Canyons", element: "flame", kinds: ["ant", "mantis", "beetle"], boss: "boss-rust", stages: 5, scene: ["#F4C7A1", "#B5452A"] },
  { zone: "jupiter", name: "Storm Bands", element: "storm", kinds: ["hornet", "wasp", "moth"], boss: "boss-tempest", stages: 5, scene: ["#F4E3C1", "#C9A66B"] },
  { zone: "saturn", name: "The Great Rings", element: "wave", kinds: ["beetle", "spider", "ant"], boss: "boss-warden", stages: 5, scene: ["#D9D4FF", "#E3C878"] },
  { zone: "sun", name: "Corona Gate", element: "light", kinds: ["wasp", "hornet", "mantis"], boss: "boss-vespero", stages: 5, scene: ["#FFE9B0", "#FF8A3D"] },
  // Deep space: where the Wilt came from.
  { zone: "comet", name: "Comet Trail", element: "storm", kinds: ["moth", "wasp", "spider"], boss: "boss-weaver", stages: 5, scene: ["#1B2A5A", "#7FDBFF"] },
  { zone: "orion", name: "Orion Nebula", element: "light", kinds: ["mantis", "hornet", "beetle"], boss: "boss-stalker", stages: 5, scene: ["#4A1F6B", "#E05FD0"] },
  { zone: "andromeda", name: "Andromeda Core", element: "shadow", kinds: ["hornet", "mantis", "spider"], boss: "boss-void", stages: 5, scene: ["#1A1240", "#6C5CE7"] },
];

/** Level of the enemies on a stage. Earth chapters climb 6 levels each, space chapters 5. Exported for balance tests. */
export const stageLevel = (chapter: number, index: number) => 1 + Math.min(chapter, 9) * 6 + Math.max(0, chapter - 9) * 5 + index * 2;

/** Rewards are rolled between -25% and +25% of the listed value. */
export const REWARD_SPREAD = 0.25;
export const rewardRange = (v: number): [number, number] => [Math.round(v * (1 - REWARD_SPREAD)), Math.round(v * (1 + REWARD_SPREAD))];

/** Chance that a won fight drops a pack ticket: grows with the chapter, higher on bosses, capped so tickets stay special. */
export const ticketDropChance = (chapter: number, boss = false) => Math.min(0.35, 0.06 + chapter * 0.02 + (boss ? 0.1 : 0));
/** Chance that a won boss fight drops a royal jelly (first clears always give some). */
export const JELLY_DROP_CHANCE = 0.3;

/** The three stars of a stage, in order. Shown before and after the fight. */
export const starTurnLimit = (stage: Pick<Stage, "waves">) => stage.waves.length * 3;
export function starRules(stage: Pick<Stage, "waves">): string[] {
  return ["Win the fight", "No bee faints", `Win in ${starTurnLimit(stage)} turns or less`];
}

export const REWARD_KEYS: ResourceId[] = ["silver", "pollen", "honey"];

function buildStage(ch: ChapterInput, chapter: number, index: number): Stage {
  const last = index === ch.stages - 1;
  const level = stageLevel(chapter, index);
  const waveCount = chapter === 0 ? 2 : index < 2 ? 2 : 3;
  const waves: WaveEnemy[][] = [];
  for (let w = 0; w < waveCount; w++) {
    const count = Math.min(4, 2 + Math.floor((index + w + (chapter > 0 ? 1 : 0)) / 2));
    const wave: WaveEnemy[] = [];
    for (let e = 0; e < count; e++) {
      // Rotating kinds keeps waves varied but deterministic.
      const kind = ch.kinds[(index + w + e) % 3];
      // Mix in a few enemies of another element so element choice matters but is not everything.
      const element = (w + e) % 4 === 3 ? (ch.element === "leaf" ? "flame" : "leaf") : ch.element;
      wave.push({ id: enemyId(kind, element), level });
    }
    waves.push(wave);
  }
  if (last) {
    // Boss wave: the boss plus two minions.
    waves[waves.length - 1] = [
      { id: enemyId(ch.kinds[0], ch.element), level },
      { id: ch.boss, level: level + 1 },
      { id: enemyId(ch.kinds[1], ch.element), level },
    ];
  }
  return {
    id: `${chapter}-${index + 1}`,
    chapter,
    index,
    waves,
    boss: last,
    rewards: {
      silver: 80 + chapter * 55 + index * 15,
      pollen: 65 + chapter * 40 + index * 12,
      honey: 20 + chapter * 14,
    },
    firstClear: last
      ? { silver: 300 + chapter * 200, jelly: 2, ticket: Math.min(3, 1 + Math.floor(chapter / 3)), items: { royalJelly: 1, honeyJar: 1 } }
      : { silver: 100 + chapter * 50, honey: 50 + chapter * 20, items: index % 2 === 0 ? { honeyDrop: 2 } : { candy: 1 } },
  };
}

export const CHAPTERS: Chapter[] = INPUTS.map((ch, chapter) => ({
  index: chapter,
  zone: ch.zone,
  name: ch.name,
  element: ch.element,
  scene: ch.scene,
  stages: Array.from({ length: ch.stages }, (_, i) => buildStage(ch, chapter, i)),
}));

export const STAGES: Record<string, Stage> = Object.fromEntries(CHAPTERS.flatMap((c) => c.stages).map((s) => [s.id, s]));
