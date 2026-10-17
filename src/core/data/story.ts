import type { Element, EnemyKind, ItemId, Resources, ZoneId } from "../types";
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
];

/** Level of the enemies on a stage. Exported for balance tests. */
export const stageLevel = (chapter: number, index: number) => 1 + chapter * 6 + index * 2;

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
      silver: 60 + chapter * 40 + index * 10,
      pollen: 50 + chapter * 30 + index * 10,
      honey: 15 + chapter * 10,
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
