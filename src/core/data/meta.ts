import type { Element, ItemId, Rarity, Role, StatusId, Zone, ZoneId } from "../types";

export interface RarityInfo {
  name: string;
  color: string;
  /** Multiplier on base stats. */
  power: number;
  maxLevel: number;
  /** Silver received when selling a duplicate. */
  sell: number;
}

export const RARITY: Record<Rarity, RarityInfo> = {
  1: { name: "Common", color: "#9AA5B1", power: 1, maxLevel: 20, sell: 20 },
  2: { name: "Uncommon", color: "#3DBE6A", power: 1.15, maxLevel: 30, sell: 50 },
  3: { name: "Rare", color: "#3B8BF0", power: 1.35, maxLevel: 40, sell: 150 },
  4: { name: "Epic", color: "#9B5DE5", power: 1.6, maxLevel: 55, sell: 400 },
  5: { name: "Legendary", color: "#FF6B3D", power: 1.9, maxLevel: 70, sell: 1200 },
  6: { name: "Mythic", color: "#FF4FD8", power: 2.25, maxLevel: 85, sell: 3000 },
  7: { name: "Celestial", color: "#2D4BD8", power: 2.6, maxLevel: 100, sell: 6000 },
};

export const ELEMENTS: Record<Element, { name: string; color: string }> = {
  flame: { name: "Flame", color: "#FF6A3D" },
  leaf: { name: "Leaf", color: "#3DBE6A" },
  storm: { name: "Storm", color: "#F2C500" },
  wave: { name: "Wave", color: "#2F9BFF" },
  light: { name: "Light", color: "#FFD86B" },
  shadow: { name: "Shadow", color: "#8A5CF6" },
};

const STRONG_AGAINST: Record<Element, Element> = {
  flame: "leaf",
  leaf: "storm",
  storm: "wave",
  wave: "flame",
  light: "shadow",
  shadow: "light",
};

/** Damage multiplier for an attack of element `a` on a defender of element `d`. */
export function elementMultiplier(a: Element, d: Element): number {
  if (STRONG_AGAINST[a] === d) return 1.5;
  if (STRONG_AGAINST[d] === a && a !== "light" && a !== "shadow") return 0.75;
  return 1;
}

/** The element that deals bonus damage to `defender` (shown as "weak to" in battle). */
export function weaknessOf(defender: Element): Element {
  return (Object.keys(STRONG_AGAINST) as Element[]).find((a) => STRONG_AGAINST[a] === defender)!;
}

export const ROLES: Record<Role, { name: string }> = {
  guardian: { name: "Guardian" },
  striker: { name: "Striker" },
  healer: { name: "Healer" },
  support: { name: "Support" },
  trickster: { name: "Trickster" },
};

export const STATUSES: Record<StatusId, { name: string; good: boolean; color: string }> = {
  poison: { name: "Poison", good: false, color: "#7BC74D" },
  burn: { name: "Burn", good: false, color: "#FF6A3D" },
  stun: { name: "Stun", good: false, color: "#F2C500" },
  weaken: { name: "Weaken", good: false, color: "#9AA5B1" },
  guard: { name: "Guard", good: true, color: "#2F9BFF" },
  fury: { name: "Fury", good: true, color: "#FF4F4F" },
  regen: { name: "Regen", good: true, color: "#3DBE6A" },
  taunt: { name: "Taunt", good: true, color: "#FFB627" },
};

export const ZONES: Record<ZoneId, Zone> = {
  home: { id: "home", name: "Home Meadow", continent: "home", colors: ["#FFB627", "#5B3A1A", "#FFF3D6"], bonus: { kind: "hp", pct: 5 } },
  fr: { id: "fr", name: "France", continent: "europe", colors: ["#2B59C3", "#FFFFFF", "#E63946"], bonus: { kind: "rec", pct: 8 } },
  de: { id: "de", name: "Germany", continent: "europe", colors: ["#1A1A1A", "#DD0000", "#FFCE00"], bonus: { kind: "def", pct: 8 } },
  it: { id: "it", name: "Italy", continent: "europe", colors: ["#009246", "#FFFFFF", "#CE2B37"], bonus: { kind: "hp", pct: 8 } },
  jp: { id: "jp", name: "Japan", continent: "asia", colors: ["#FFFFFF", "#D7263D", "#FFC0D3"], bonus: { kind: "spd", pct: 8 } },
  in: { id: "in", name: "India", continent: "asia", colors: ["#FF9933", "#FFFFFF", "#138808"], bonus: { kind: "status", pct: 8 } },
  eg: { id: "eg", name: "Egypt", continent: "africa", colors: ["#CE1126", "#FFFFFF", "#1A1A1A"], bonus: { kind: "crit", pct: 8 } },
  br: { id: "br", name: "Brazil", continent: "americas", colors: ["#009C3B", "#FFDF00", "#002776"], bonus: { kind: "atk", pct: 8 } },
  us: { id: "us", name: "USA", continent: "americas", colors: ["#B22234", "#FFFFFF", "#3C3B6E"], bonus: { kind: "gauge", pct: 8 } },
  moon: { id: "moon", name: "Moon", continent: "space", colors: ["#1B2A6B", "#C7CEEA", "#F5F7FA"], bonus: { kind: "rec", pct: 10 } },
  mars: { id: "mars", name: "Mars", continent: "space", colors: ["#7A1E12", "#D9482B", "#F4A261"], bonus: { kind: "atk", pct: 10 } },
  jupiter: { id: "jupiter", name: "Jupiter", continent: "space", colors: ["#8B5E34", "#E9C46A", "#F4E3C1"], bonus: { kind: "hp", pct: 10 } },
  saturn: { id: "saturn", name: "Saturn", continent: "space", colors: ["#3D3A66", "#E3C878", "#F7EBC6"], bonus: { kind: "def", pct: 10 } },
  sun: { id: "sun", name: "Sun", continent: "space", colors: ["#FF6B3D", "#FFB627", "#FFF3B0"], bonus: { kind: "crit", pct: 10 } },
};


export const ITEMS: Record<ItemId, { name: string; desc: string; target: "ally" | "fainted" | "team" }> = {
  honeyDrop: { name: "Honey Drop", desc: "+40% HP", target: "ally" },
  honeyJar: { name: "Honey Jar", desc: "Team +25% HP", target: "team" },
  mint: { name: "Mint Leaf", desc: "Cure", target: "ally" },
  royalJelly: { name: "Royal Jelly", desc: "Revive 50%", target: "fainted" },
  candy: { name: "Buzz Candy", desc: "Full gauge", target: "ally" },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
