import type { BeeLook, BeeSpecies, Burst, Element, PerkId, Rarity, Role, Stats, StatusId, ZoneId } from "../types";
import { RARITY } from "./meta";

const REFERENCE: Stats = { hp: 300, atk: 60, def: 30, rec: 40, spd: 50 };

const ROLE_PROFILE: Record<Role, Stats> = {
  guardian: { hp: 1.35, atk: 0.8, def: 1.6, rec: 0.9, spd: 0.85 },
  striker: { hp: 0.95, atk: 1.35, def: 0.85, rec: 0.8, spd: 1.1 },
  healer: { hp: 1.0, atk: 0.75, def: 1.0, rec: 1.7, spd: 1.0 },
  support: { hp: 1.05, atk: 0.95, def: 1.05, rec: 1.2, spd: 1.15 },
  trickster: { hp: 0.95, atk: 1.1, def: 0.9, rec: 0.9, spd: 1.3 },
};

const ATTACK_HITS: Record<Role, number> = { guardian: 2, striker: 4, healer: 2, support: 3, trickster: 4 };

function baseStats(role: Role, rarity: Rarity): Stats {
  const p = RARITY[rarity].power;
  const r = ROLE_PROFILE[role];
  return {
    hp: Math.round(REFERENCE.hp * r.hp * p),
    atk: Math.round(REFERENCE.atk * r.atk * p),
    def: Math.round(REFERENCE.def * r.def * p),
    rec: Math.round(REFERENCE.rec * r.rec * p),
    spd: Math.round(REFERENCE.spd * r.spd * (1 + (p - 1) * 0.3)),
  };
}

/* ---------- Burst builders: power grows with rarity ---------- */
const scale = (r: Rarity) => 1 + (r - 1) * 0.35;

const strike = (name: string, r: Rarity, target: "one" | "all" = "one", status?: [StatusId, number]): Burst => ({
  name,
  effects: [
    { t: "damage", target, power: (target === "one" ? 2.6 : 1.7) * scale(r), hits: 3 + Math.min(r, 6) },
    ...(status ? [{ t: "status" as const, target, status: status[0], turns: 2, chance: status[1] }] : []),
  ],
});

const heal = (name: string, r: Rarity, extra?: "regen" | "cleanse"): Burst => ({
  name,
  effects: [
    { t: "heal", target: "team", power: 2.2 * scale(r) },
    ...(extra === "regen" ? [{ t: "status" as const, target: "team" as const, status: "regen" as const, turns: 3, chance: 1 }] : []),
    ...(extra === "cleanse" ? [{ t: "cleanse" as const, target: "team" as const }] : []),
  ],
});

const guard = (name: string, r: Rarity, withDamage = false): Burst => ({
  name,
  effects: [
    ...(withDamage ? [{ t: "damage" as const, target: "all" as const, power: 1.1 * scale(r), hits: 3 }] : []),
    { t: "status", target: "team", status: "guard", turns: 2 + (r >= 4 ? 1 : 0), chance: 1 },
    { t: "status", target: "self", status: "taunt", turns: 2, chance: 1 },
  ],
});

const rally = (name: string, r: Rarity, withHeal = false): Burst => ({
  name,
  effects: [
    { t: "status", target: "team", status: "fury", turns: 2 + (r >= 4 ? 1 : 0), chance: 1 },
    { t: "gauge", target: "team", amount: 4 + r * 2 },
    ...(withHeal ? [{ t: "heal" as const, target: "team" as const, power: 1.2 * scale(r) }] : []),
  ],
});

const trick = (name: string, r: Rarity, status: StatusId, target: "one" | "all" = "all"): Burst => ({
  name,
  effects: [
    { t: "damage", target, power: (target === "one" ? 2.2 : 1.4) * scale(r), hits: 4 + Math.min(r, 5) },
    { t: "status", target, status, turns: status === "stun" ? 1 : 3, chance: 0.45 + r * 0.07 },
  ],
});

interface BeeInput {
  id: string;
  name: string;
  zone: ZoneId;
  rarity: Rarity;
  element: Element;
  role: Role;
  perk: PerkId;
  burst: Burst;
  look: BeeLook;
  lore?: string;
  unpullable?: boolean;
}

function bee(input: BeeInput): BeeSpecies {
  const { rarity, role } = input;
  return {
    ...input,
    base: baseStats(role, rarity),
    work: 8 + rarity * 3 + (role === "support" ? 4 : 0),
    attack: { hits: ATTACK_HITS[role], power: 1 },
    gaugeMax: 20 + rarity * 5,
  };
}

const Y = "#FFD23F"; // classic bee yellow
const B = "#4A2E12"; // classic stripe brown

export const BEES: BeeSpecies[] = [
  /* ----- Home ----- */
  bee({
    id: "pip", name: "Pip", zone: "home", rarity: 1, element: "light", role: "support", perk: "honey", unpullable: true,
    burst: rally("Hard Hat Hustle", 2, true),
    look: { body: Y, stripe: B, hat: "hardhat", hatColor: "#FFC400", held: "dipper", heldColor: "#C98B2B", eyes: "happy" },
    lore: "The Factory's first worker. Clumsy, brave, always busy.",
  }),

  /* ----- France ----- */
  bee({ id: "fr-bijou", name: "Bijou", zone: "fr", rarity: 1, element: "leaf", role: "healer", perk: "honey",
    burst: heal("Picnic Break", 1),
    look: { body: Y, stripe: "#2B3A67", hat: "beret", hatColor: "#2B3A67", held: "baguette", heldColor: "#E0A458", eyes: "happy" } }),
  bee({ id: "fr-lavande", name: "Lavande", zone: "fr", rarity: 2, element: "wave", role: "support", perk: "storage",
    burst: rally("Lavender Breeze", 2, true),
    look: { body: "#FFE27A", stripe: "#7B5EA7", wing: "#E6DBFF", hat: "beret", hatColor: "#9B7EDE", held: "flower", heldColor: "#9B7EDE" } }),
  bee({ id: "fr-chef", name: "Chef Miel", zone: "fr", rarity: 3, element: "flame", role: "striker", perk: "pollen",
    burst: strike("Flambé!", 3, "one", ["burn", 0.6]),
    look: { body: Y, stripe: B, hat: "chef", hatColor: "#FFFFFF", held: "whisk", heldColor: "#B8C4CF", eyes: "happy" } }),
  bee({ id: "fr-mousquetaire", name: "Mousquetaire", zone: "fr", rarity: 4, element: "storm", role: "striker", perk: "silver",
    burst: strike("One for All", 4, "all"),
    look: { body: Y, stripe: "#1D3557", hat: "musketeer", hatColor: "#1D3557", hatColor2: "#E63946", held: "sword", heldColor: "#DDE3EA", eyes: "fierce" } }),
  bee({ id: "fr-lumiere", name: "Lumière", zone: "fr", rarity: 5, element: "light", role: "healer", perk: "jelly",
    burst: heal("Ville Lumière", 5, "regen"),
    look: { body: "#FFE9A8", stripe: "#C9A227", wing: "#FFF6D6", hat: "crown", hatColor: "#FFD54A", held: "torch", heldColor: "#FFB627" } }),
  bee({ id: "fr-etoile", name: "Étoile", zone: "fr", rarity: 6, element: "light", role: "support", perk: "jelly",
    burst: rally("Starlit Ballet", 6, true),
    look: { body: "#FFF1C1", stripe: "#3A4BA8", wing: "#E8ECFF", hat: "crown", hatColor: "#BFD3FF", hatColor2: "#FFFFFF", held: "staff", heldColor: "#BFD3FF", eyes: "happy" } }),

  /* ----- Germany ----- */
  bee({ id: "de-brezel", name: "Brezel", zone: "de", rarity: 1, element: "flame", role: "guardian", perk: "honey",
    burst: guard("Pretzel Knot", 1),
    look: { body: Y, stripe: "#1A1A1A", hat: "tyrolean", hatColor: "#3B6E3B", hatColor2: "#DD0000", held: "pretzel", heldColor: "#B5651D" } }),
  bee({ id: "de-uhrwerk", name: "Uhrwerk", zone: "de", rarity: 2, element: "storm", role: "support", perk: "silver",
    burst: rally("Clockwork Tune-up", 2),
    look: { body: "#FFCE00", stripe: "#3A3A3A", hat: "goggles", hatColor: "#8B5A2B", held: "wrench", heldColor: "#9AA5B1" } }),
  bee({ id: "de-ritter", name: "Ritter", zone: "de", rarity: 3, element: "leaf", role: "guardian", perk: "storage",
    burst: guard("Iron Wall", 3, true),
    look: { body: Y, stripe: B, hat: "knight", hatColor: "#AEB8C2", held: "shield", heldColor: "#DD0000", eyes: "fierce" } }),
  bee({ id: "de-schwarzwald", name: "Schwarzwald", zone: "de", rarity: 4, element: "shadow", role: "trickster", perk: "pollen",
    burst: trick("Cuckoo Clock Curse", 4, "stun"),
    look: { body: "#E8B923", stripe: "#1F2A1F", wing: "#C9E0C9", hat: "tyrolean", hatColor: "#1F3D1F", hatColor2: "#FFCE00", held: "lantern", heldColor: "#FFCE00", eyes: "sleepy" } }),
  bee({ id: "de-donner", name: "Donner", zone: "de", rarity: 5, element: "storm", role: "striker", perk: "silver",
    burst: strike("Thunder Anvil", 5, "all", ["stun", 0.35]),
    look: { body: "#FFCE00", stripe: "#1A1A1A", wing: "#FFF4B0", hat: "knight", hatColor: "#FFCE00", hatColor2: "#DD0000", held: "sword", heldColor: "#FFF4B0", eyes: "fierce" } }),

  /* ----- Italy ----- */
  bee({ id: "it-pizzetta", name: "Pizzetta", zone: "it", rarity: 1, element: "flame", role: "striker", perk: "honey",
    burst: strike("Wood-fired Sting", 1),
    look: { body: Y, stripe: B, hat: "chef", hatColor: "#FFFFFF", held: "pizza", heldColor: "#F4A261", eyes: "happy" } }),
  bee({ id: "it-limoncella", name: "Limoncella", zone: "it", rarity: 2, element: "leaf", role: "healer", perk: "pollen",
    burst: heal("Lemon Zest", 2, "cleanse"),
    look: { body: "#FFF07A", stripe: "#3E8E41", hat: "straw", hatColor: "#E9C46A", hatColor2: "#3E8E41", held: "lemon", heldColor: "#FFE135" } }),
  bee({ id: "it-gondola", name: "Gondola", zone: "it", rarity: 3, element: "wave", role: "support", perk: "storage",
    burst: rally("Canal Serenade", 3, true),
    look: { body: Y, stripe: "#1D3557", hat: "straw", hatColor: "#F1D58A", hatColor2: "#CE2B37", held: "staff", heldColor: "#8B5A2B" } }),
  bee({ id: "it-maschera", name: "Maschera", zone: "it", rarity: 4, element: "shadow", role: "trickster", perk: "jelly",
    burst: trick("Masquerade", 4, "weaken"),
    look: { body: "#F2C14E", stripe: "#3D1E3D", wing: "#F3D9FF", hat: "venetian", hatColor: "#FFFFFF", hatColor2: "#C9A227", held: "fan", heldColor: "#7B2D7B" } }),
  bee({ id: "it-centurio", name: "Centurio", zone: "it", rarity: 5, element: "flame", role: "guardian", perk: "silver",
    burst: guard("Testudo", 5, true),
    look: { body: Y, stripe: "#7A1E1E", hat: "centurion", hatColor: "#C9A227", hatColor2: "#CE2B37", held: "shield", heldColor: "#CE2B37", eyes: "fierce" } }),

  /* ----- Japan ----- */
  bee({ id: "jp-mochi", name: "Mochi", zone: "jp", rarity: 1, element: "leaf", role: "healer", perk: "honey",
    burst: heal("Tea Ceremony", 1),
    look: { body: "#FFE6A0", stripe: "#7A5230", hat: "sakura", hatColor: "#FFB7C5", held: "tea", heldColor: "#7FB069", eyes: "sleepy" } }),
  bee({ id: "jp-hachi", name: "Hachi", zone: "jp", rarity: 2, element: "flame", role: "striker", perk: "silver",
    burst: strike("Dojo Dash", 2),
    look: { body: Y, stripe: B, hat: "headband", hatColor: "#FFFFFF", hatColor2: "#D7263D", held: "sword", heldColor: "#C8A27A", eyes: "fierce" } }),
  bee({ id: "jp-kitsu", name: "Kitsu", zone: "jp", rarity: 3, element: "shadow", role: "trickster", perk: "pollen",
    burst: trick("Foxfire Trick", 3, "burn"),
    look: { body: "#FFD8A8", stripe: "#D9480F", hat: "kitsune", hatColor: "#FFFFFF", hatColor2: "#D7263D", held: "fan", heldColor: "#D7263D" } }),
  bee({ id: "jp-sakura", name: "Sakura", zone: "jp", rarity: 4, element: "light", role: "healer", perk: "storage",
    burst: heal("Petal Rain", 4, "regen"),
    look: { body: "#FFE1EA", stripe: "#E07A9A", wing: "#FFE8F0", hat: "sakura", hatColor: "#FF8FAB", held: "umbrella", heldColor: "#FF8FAB", eyes: "happy" } }),
  bee({ id: "jp-raiden", name: "Raiden", zone: "jp", rarity: 5, element: "storm", role: "striker", perk: "silver",
    burst: strike("Raijin Slash", 5, "one", ["stun", 0.5]),
    look: { body: Y, stripe: "#1A1A2E", wing: "#E0F0FF", hat: "kabuto", hatColor: "#2B2D42", hatColor2: "#FFC300", held: "sword", heldColor: "#E0F0FF", eyes: "fierce" } }),
  bee({ id: "jp-tsukuyomi", name: "Tsukuyomi", zone: "jp", rarity: 6, element: "shadow", role: "trickster", perk: "jelly",
    burst: trick("Moonlit Veil", 6, "weaken"),
    look: { body: "#E8E4FF", stripe: "#2E2A5A", wing: "#D9D4FF", hat: "crown", hatColor: "#C7CEEA", hatColor2: "#2E2A5A", held: "lantern", heldColor: "#C7CEEA", eyes: "sleepy" } }),

  /* ----- India ----- */
  bee({ id: "in-chai", name: "Chai", zone: "in", rarity: 1, element: "wave", role: "healer", perk: "honey",
    burst: heal("Masala Chai", 1),
    look: { body: Y, stripe: "#8B4513", hat: "garland", hatColor: "#FF9933", held: "tea", heldColor: "#C68642", eyes: "happy" } }),
  bee({ id: "in-genda", name: "Genda", zone: "in", rarity: 2, element: "leaf", role: "support", perk: "pollen",
    burst: rally("Marigold Festival", 2),
    look: { body: "#FFC75F", stripe: "#138808", hat: "garland", hatColor: "#FFA500", hatColor2: "#FF6F00", held: "flower", heldColor: "#FF9933" } }),
  bee({ id: "in-mayura", name: "Mayura", zone: "in", rarity: 3, element: "wave", role: "trickster", perk: "storage",
    burst: trick("Peacock Dance", 3, "weaken"),
    look: { body: "#FFD23F", stripe: "#0F5C8C", wing: "#B8F2E6", hat: "feathers", hatColor: "#1B9AAA", hatColor2: "#2E5EAA", held: "feather", heldColor: "#1B9AAA" } }),
  bee({ id: "in-kamala", name: "Kamala", zone: "in", rarity: 4, element: "light", role: "healer", perk: "jelly",
    burst: heal("Lotus Bloom", 4, "cleanse"),
    look: { body: "#FFF0D1", stripe: "#E07A9A", wing: "#FFF0F5", hat: "lotus", hatColor: "#FF8FAB", held: "flower", heldColor: "#FF8FAB", eyes: "sleepy" } }),
  bee({ id: "in-bagha", name: "Bagha", zone: "in", rarity: 5, element: "flame", role: "striker", perk: "silver",
    burst: strike("Tiger Pounce", 5, "one", ["burn", 0.7]),
    look: { body: "#FF9933", stripe: "#1A1A1A", hat: "none", hatColor: "#000000", held: "staff", heldColor: "#C9A227", eyes: "fierce" } }),

  /* ----- Egypt ----- */
  bee({ id: "eg-papyra", name: "Papyra", zone: "eg", rarity: 1, element: "leaf", role: "support", perk: "honey",
    burst: rally("Scroll of Courage", 1),
    look: { body: Y, stripe: B, hat: "none", hatColor: "#000000", held: "papyrus", heldColor: "#EAD9A6", eyes: "happy" } }),
  bee({ id: "eg-kheper", name: "Kheper", zone: "eg", rarity: 2, element: "storm", role: "guardian", perk: "storage",
    burst: guard("Scarab Shell", 2),
    look: { body: "#F4C430", stripe: "#1F4E5F", hat: "nemes", hatColor: "#1F8A8A", hatColor2: "#F4C430", held: "shield", heldColor: "#1F8A8A" } }),
  bee({ id: "eg-nilo", name: "Nilo", zone: "eg", rarity: 3, element: "wave", role: "healer", perk: "pollen",
    burst: heal("Flood of the Nile", 3, "regen"),
    look: { body: Y, stripe: "#1E5AA8", hat: "nemes", hatColor: "#2F80ED", hatColor2: "#FFFFFF", held: "ankh", heldColor: "#F4C430" } }),
  bee({ id: "eg-anubee", name: "Anubee", zone: "eg", rarity: 4, element: "shadow", role: "striker", perk: "silver",
    burst: strike("Judgment Scale", 4, "one", ["weaken", 0.6]),
    look: { body: "#2B2B2B", stripe: "#D4AF37", wing: "#E5D7FF", hat: "nemes", hatColor: "#1A1A1A", hatColor2: "#D4AF37", held: "staff", heldColor: "#D4AF37", eyes: "fierce" } }),
  bee({ id: "eg-ramessa", name: "Ramessa", zone: "eg", rarity: 5, element: "light", role: "support", perk: "jelly",
    burst: rally("Sun Barge", 5, true),
    look: { body: "#FFD700", stripe: "#1F4E9C", wing: "#FFF8DC", hat: "nemes", hatColor: "#FFD700", hatColor2: "#1F4E9C", held: "ankh", heldColor: "#FFD700" } }),
  bee({ id: "eg-sphinxa", name: "Sphinxa", zone: "eg", rarity: 6, element: "light", role: "guardian", perk: "jelly",
    burst: guard("Riddle of Ages", 6, true),
    look: { body: "#E9C46A", stripe: "#8B5E34", wing: "#FFF4D6", hat: "nemes", hatColor: "#F4D35E", hatColor2: "#1F4E9C", held: "shield", heldColor: "#F4D35E", eyes: "sleepy" } }),

  /* ----- Brazil ----- */
  bee({ id: "br-bola", name: "Bola", zone: "br", rarity: 1, element: "leaf", role: "striker", perk: "honey",
    burst: strike("Bicycle Kick", 1),
    look: { body: "#FFDF00", stripe: "#009C3B", hat: "cap", hatColor: "#009C3B", hatColor2: "#FFDF00", held: "ball", heldColor: "#FFFFFF", eyes: "happy" } }),
  bee({ id: "br-samba", name: "Samba", zone: "br", rarity: 2, element: "flame", role: "support", perk: "silver",
    burst: rally("Samba Beat", 2),
    look: { body: Y, stripe: B, hat: "feathers", hatColor: "#FF4F79", hatColor2: "#FFDF00", held: "maraca", heldColor: "#FF4F79", eyes: "happy" } }),
  bee({ id: "br-tucano", name: "Tucano", zone: "br", rarity: 3, element: "leaf", role: "trickster", perk: "pollen",
    burst: trick("Canopy Ambush", 3, "poison"),
    look: { body: "#FFC300", stripe: "#1A1A1A", hat: "none", hatColor: "#000000", held: "feather", heldColor: "#FF7B00" } }),
  bee({ id: "br-carnaval", name: "Carnaval", zone: "br", rarity: 4, element: "light", role: "support", perk: "storage",
    burst: rally("Grand Parade", 4, true),
    look: { body: "#FFE066", stripe: "#7B2CBF", wing: "#FFD6FF", hat: "feathers", hatColor: "#7B2CBF", hatColor2: "#00C2A8", held: "maraca", heldColor: "#00C2A8", eyes: "happy" } }),
  bee({ id: "br-amazonia", name: "Amazônia", zone: "br", rarity: 5, element: "leaf", role: "healer", perk: "jelly",
    burst: heal("Rainforest Breath", 5, "regen"),
    look: { body: "#C5E86C", stripe: "#1B5E20", wing: "#E8FFD6", hat: "laurel", hatColor: "#2E7D32", held: "staff", heldColor: "#6D4C41", eyes: "sleepy" } }),

  /* ----- USA ----- */
  bee({ id: "us-slugger", name: "Slugger", zone: "us", rarity: 1, element: "storm", role: "striker", perk: "honey",
    burst: strike("Home Run", 1),
    look: { body: Y, stripe: B, hat: "cap", hatColor: "#B22234", hatColor2: "#FFFFFF", held: "bat", heldColor: "#C68642", eyes: "fierce" } }),
  bee({ id: "us-dusty", name: "Dusty", zone: "us", rarity: 2, element: "flame", role: "guardian", perk: "storage",
    burst: guard("Stand Your Ground", 2),
    look: { body: "#F4C430", stripe: "#6B4226", hat: "cowboy", hatColor: "#8B5A2B", held: "lasso", heldColor: "#D2B48C" } }),
  bee({ id: "us-liberty", name: "Liberty", zone: "us", rarity: 3, element: "light", role: "healer", perk: "pollen",
    burst: heal("Torch of Hope", 3, "cleanse"),
    look: { body: "#BFE3D0", stripe: "#3E8E7E", hat: "crown", hatColor: "#7FC8A9", held: "torch", heldColor: "#FFB627", eyes: "happy" } }),
  bee({ id: "us-rocket", name: "Rocket", zone: "us", rarity: 4, element: "flame", role: "striker", perk: "silver",
    burst: strike("Afterburner", 4, "all", ["burn", 0.5]),
    look: { body: Y, stripe: "#3C3B6E", hat: "goggles", hatColor: "#B22234", held: "torch", heldColor: "#FF6A3D", eyes: "fierce" } }),
  bee({ id: "us-ranger", name: "Ranger", zone: "us", rarity: 5, element: "wave", role: "guardian", perk: "jelly",
    burst: guard("Canyon Stand", 5, true),
    look: { body: "#F4C430", stripe: "#3C3B6E", hat: "cowboy", hatColor: "#3C3B6E", hatColor2: "#B22234", held: "lasso", heldColor: "#FFFFFF", eyes: "fierce" } }),
  bee({ id: "us-apollo", name: "Apollo", zone: "us", rarity: 6, element: "storm", role: "striker", perk: "jelly",
    burst: strike("Moonshot", 6, "all", ["stun", 0.4]),
    look: { body: "#FFFFFF", stripe: "#3C3B6E", wing: "#DDEBFF", hat: "astronaut", hatColor: "#F5F7FA", hatColor2: "#7FB3FF", held: "none", eyes: "happy" } }),
];

export const BEE_BY_ID: Record<string, BeeSpecies> = Object.fromEntries(BEES.map((b) => [b.id, b]));
export const beeById = (id: string): BeeSpecies => {
  const b = BEE_BY_ID[id];
  if (!b) throw new Error(`Unknown bee ${id}`);
  return b;
};
