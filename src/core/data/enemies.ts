import type { BossSkill, Element, EnemyKind, EnemySpecies, Stats, StatusId } from "../types";

const KIND_BASE: Record<EnemyKind, { name: string; stats: Stats; hits: number; status?: { id: StatusId; chance: number; turns: number } }> = {
  ant: { name: "Ant", stats: { hp: 120, atk: 30, def: 26, rec: 0, spd: 48 }, hits: 2 },
  wasp: { name: "Wasp", stats: { hp: 140, atk: 38, def: 16, rec: 0, spd: 58 }, hits: 2, status: { id: "poison", chance: 0.15, turns: 2 } },
  hornet: { name: "Hornet", stats: { hp: 210, atk: 48, def: 24, rec: 0, spd: 52 }, hits: 3 },
  beetle: { name: "Beetle", stats: { hp: 290, atk: 34, def: 48, rec: 0, spd: 30 }, hits: 1 },
  moth: { name: "Moth", stats: { hp: 160, atk: 32, def: 18, rec: 0, spd: 44 }, hits: 2, status: { id: "weaken", chance: 0.2, turns: 2 } },
  spider: { name: "Spider", stats: { hp: 180, atk: 40, def: 22, rec: 0, spd: 62 }, hits: 2, status: { id: "poison", chance: 0.25, turns: 3 } },
  mantis: { name: "Mantis", stats: { hp: 200, atk: 56, def: 20, rec: 0, spd: 66 }, hits: 2 },
};

/** Wilted tints: desaturated versions of the element colour. */
const TINT: Record<Element, string> = {
  flame: "#B7826F",
  leaf: "#7E9C7A",
  storm: "#AFA46B",
  wave: "#6F8FAF",
  light: "#BDB08C",
  shadow: "#7D6E9A",
};

const ELEMENT_ADJ: Record<Element, string> = {
  flame: "Ember",
  leaf: "Moss",
  storm: "Static",
  wave: "Damp",
  light: "Pale",
  shadow: "Hollow",
};

export function enemyId(kind: EnemyKind, element: Element): string {
  return `${kind}-${element}`;
}

const ENEMIES: Record<string, EnemySpecies> = {};

for (const kind of Object.keys(KIND_BASE) as EnemyKind[]) {
  for (const element of Object.keys(TINT) as Element[]) {
    const k = KIND_BASE[kind];
    ENEMIES[enemyId(kind, element)] = {
      id: enemyId(kind, element),
      name: `${ELEMENT_ADJ[element]} ${k.name}`,
      kind,
      element,
      base: k.stats,
      attack: { hits: k.hits, power: 1, status: k.status },
      tint: TINT[element],
    };
  }
}

function boss(id: string, name: string, kind: EnemyKind, element: Element, hpMul: number, skill: BossSkill): EnemySpecies {
  const k = KIND_BASE[kind];
  return {
    id,
    name,
    kind,
    element,
    base: { hp: Math.round(k.stats.hp * hpMul), atk: Math.round(k.stats.atk * 1.3), def: Math.round(k.stats.def * 1.2), rec: 0, spd: k.stats.spd },
    attack: { hits: k.hits + 1, power: 1, status: k.status },
    boss: skill,
    tint: TINT[element],
  };
}

const BOSSES: EnemySpecies[] = [
  boss("boss-sting", "Sergeant Sting", "wasp", "leaf", 5, {
    name: "Drill Formation", every: 3,
    effects: [{ t: "damage", target: "all", power: 1.3, hits: 3 }],
  }),
  boss("boss-mante", "Madame Mante", "mantis", "wave", 6, {
    name: "Guillotine Waltz", every: 3,
    effects: [{ t: "damage", target: "all", power: 1.5, hits: 4 }, { t: "status", target: "all", status: "weaken", turns: 2, chance: 0.5 }],
  }),
  boss("boss-oni", "Oni Hornet", "hornet", "storm", 6, {
    name: "Thunder Drum", every: 3,
    effects: [{ t: "damage", target: "all", power: 1.6, hits: 5 }, { t: "status", target: "all", status: "stun", turns: 1, chance: 0.3 }],
  }),
  boss("boss-stag", "Iron Stag", "beetle", "shadow", 7, {
    name: "Horn Quake", every: 3,
    effects: [{ t: "damage", target: "all", power: 1.7, hits: 2 }, { t: "status", target: "self", status: "guard", turns: 2, chance: 1 }],
  }),
  boss("boss-widow", "Sand Widow", "spider", "light", 6.5, {
    name: "Sandstorm Web", every: 3,
    effects: [{ t: "damage", target: "all", power: 1.5, hits: 4 }, { t: "status", target: "all", status: "poison", turns: 3, chance: 0.7 }],
  }),
  boss("boss-vesuvia", "Vesuvia", "moth", "flame", 7, {
    name: "Ash Eruption", every: 3,
    effects: [{ t: "damage", target: "all", power: 1.8, hits: 5 }, { t: "status", target: "all", status: "burn", turns: 3, chance: 0.6 }],
  }),
  boss("boss-reaper", "Jungle Reaper", "mantis", "leaf", 7, {
    name: "Twin Scythe", every: 2,
    effects: [{ t: "damage", target: "all", power: 1.4, hits: 6 }],
  }),
  boss("boss-bullet", "Bullet Queen", "ant", "wave", 9, {
    name: "Swarm Call", every: 3,
    effects: [{ t: "damage", target: "all", power: 1.6, hits: 8 }, { t: "status", target: "self", status: "fury", turns: 2, chance: 1 }],
  }),
  boss("boss-shade", "Vespero's Shadow", "hornet", "shadow", 8, {
    name: "Hollow Crown", every: 3,
    effects: [{ t: "damage", target: "all", power: 2, hits: 6 }, { t: "status", target: "all", status: "weaken", turns: 2, chance: 0.6 }],
  }),
];
for (const b of BOSSES) ENEMIES[b.id] = b;

export const enemyById = (id: string): EnemySpecies => {
  const e = ENEMIES[id];
  if (!e) throw new Error(`Unknown enemy ${id}`);
  return e;
};
