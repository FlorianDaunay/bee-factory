export type Rarity = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Element = "flame" | "leaf" | "storm" | "wave" | "light" | "shadow";
export type Role = "guardian" | "striker" | "healer" | "support" | "trickster";
export type ZoneId =
  | "home" | "fr" | "de" | "it" | "jp" | "in" | "eg" | "br" | "us"
  | "moon" | "mars" | "jupiter" | "saturn" | "sun"
  | "comet" | "orion" | "andromeda";
export type Continent = "home" | "europe" | "asia" | "africa" | "americas" | "space" | "deep";

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  rec: number;
  spd: number;
}
export type StatKey = keyof Stats;

export type StatusId = "poison" | "burn" | "stun" | "weaken" | "guard" | "fury" | "regen" | "taunt";

export type EffectTarget = "one" | "all" | "team" | "self" | "lowest";

export type Effect =
  | { t: "damage"; target: "one" | "all"; power: number; hits: number }
  | { t: "heal"; target: "team" | "lowest" | "self"; power: number }
  | { t: "status"; target: EffectTarget; status: StatusId; turns: number; chance: number }
  | { t: "gauge"; target: "team"; amount: number }
  | { t: "cleanse"; target: "team" };

export interface Burst {
  name: string;
  effects: Effect[];
  /** Bonus effects from the bee's element (see elementRider), applied after the main ones. */
  riders?: Effect[];
}

export type HatKind =
  | "none" | "hardhat" | "beret" | "musketeer" | "chef" | "headband" | "kitsune" | "kabuto" | "sakura"
  | "tyrolean" | "goggles" | "knight" | "straw" | "venetian" | "centurion" | "nemes" | "crown"
  | "lotus" | "feathers" | "cap" | "cowboy" | "astronaut" | "garland" | "laurel" | "crescent" | "ring" | "sunrays";

export type HeldKind =
  | "none" | "dipper" | "baguette" | "whisk" | "pretzel" | "wrench" | "sword" | "fan" | "umbrella"
  | "tea" | "ankh" | "papyrus" | "ball" | "pizza" | "lemon" | "maraca" | "lantern" | "shield"
  | "flower" | "torch" | "feather" | "bat" | "harp" | "lasso" | "staff" | "orb";

export interface BeeLook {
  body: string;
  stripe: string;
  wing?: string;
  hat: HatKind;
  hatColor: string;
  hatColor2?: string;
  held: HeldKind;
  heldColor?: string;
  eyes?: "round" | "happy" | "fierce" | "sleepy";
  /** Stripe pattern override, e.g. Breton stripes for France. */
  pattern?: "stripes" | "spots" | "plain";
}

export type PerkId = "honey" | "boost" | "jelly" | "pollen" | "silver";

export interface BeeSpecies {
  id: string;
  name: string;
  zone: ZoneId;
  rarity: Rarity;
  element: Element;
  role: Role;
  base: Stats;
  /** Hive work power (adds % honey to the hive it is assigned to). */
  work: number;
  perk: PerkId;
  attack: { hits: number; power: number };
  burst: Burst;
  gaugeMax: number;
  look: BeeLook;
  /** Not obtainable from packs (Pip). */
  unpullable?: boolean;
  lore?: string;
}

export interface Zone {
  id: ZoneId;
  name: string;
  continent: Continent;
  colors: [string, string, string];
  /** Team bonus with 2 bees (doubled at 3, plus passive at 4, homeland at 6). */
  bonus: { kind: BonusKind; pct: number };
}

export type BonusKind = "hp" | "atk" | "def" | "rec" | "spd" | "crit" | "gauge" | "status";

export type EnemyKind = "wasp" | "hornet" | "beetle" | "moth" | "spider" | "mantis" | "ant";

export interface BossSkill {
  name: string;
  every: number;
  effects: Effect[];
}

export interface EnemySpecies {
  id: string;
  name: string;
  kind: EnemyKind;
  element: Element;
  base: Stats;
  attack: { hits: number; power: number; status?: { id: StatusId; chance: number; turns: number } };
  boss?: BossSkill;
  tint: string;
}

export type ItemId = "honeyDrop" | "honeyJar" | "mint" | "royalJelly" | "candy";

/** `ticket` = free pack ticket: one ticket opens one bee from any pack. */
export type ResourceId = "honey" | "silver" | "pollen" | "jelly" | "ticket";
export type Resources = Record<ResourceId, number>;
