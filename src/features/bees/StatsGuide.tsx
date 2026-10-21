import { GameIcon, type IconName } from "@/art/GameIcon";
import { ELEMENTS, ROLES, weaknessOf } from "@/core/data/meta";
import type { Element, Role } from "@/core/types";
import { PerkIcon, PERK_TEXT } from "@/ui/PerkIcon";
import { Modal } from "@/ui/common";

export const STAT_INFO: { key: IconName; name: string; text: string }[] = [
  { key: "hp", name: "Health", text: "How much damage the bee takes before fainting." },
  { key: "atk", name: "Attack", text: "Damage of its attacks and Bursts." },
  { key: "def", name: "Defense", text: "Lowers the damage it takes." },
  { key: "rec", name: "Recovery", text: "The flower: how much it heals with healing Bursts (and how well it is healed)." },
  { key: "spd", name: "Speed", text: "Above 50, every 5 speed adds +1% critical hit chance (up to +12%)." },
  { key: "power", name: "Power", text: "One number summing up all stats, to compare bees quickly." },
  { key: "gauge", name: "Burst gauge", text: "Fills when the bee hits or is hit. When full, the bee can use its Burst." },
  { key: "work", name: "Hive work", text: "Extra % honey the bee makes when it works in a hive. Grows with level and stars." },
];

const ROLE_TEXT: Record<Role, string> = {
  guardian: "Lots of health and defense; Bursts guard the team and draw enemy hits.",
  striker: "High attack; Bursts deal big damage to one foe or all of them.",
  healer: "High recovery; Bursts heal the whole team.",
  support: "Balanced; Bursts boost attack and fill the team's gauges.",
  trickster: "Fast; Bursts hit many times and inflict statuses.",
};

const RIDER_TEXT: Record<Element, string> = {
  flame: "Bursts may burn",
  leaf: "Bursts may poison (or give regen)",
  storm: "Bursts may stun (or charge gauges)",
  wave: "Bursts cleanse the team",
  light: "Bursts heal the weakest ally",
  shadow: "Bursts may weaken (or give fury)",
};

/** Explains what every number and icon on a bee means. */
export function StatsGuide({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide>
      <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
        <GameIcon name="info" size={24} /> Bee guide
      </h3>

      <h4 className="mb-1 font-extrabold">Stats</h4>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {STAT_INFO.map((s) => (
          <div key={s.key} className="flex items-start gap-2 rounded-tile bg-canvas p-2 text-sm">
            <GameIcon name={s.key} size={22} />
            <span>
              <span className="font-extrabold">{s.name}</span>: {s.text}
            </span>
          </div>
        ))}
      </div>

      <h4 className="mb-1 mt-4 font-extrabold">Elements</h4>
      <div className="mb-1 text-sm text-text-secondary">Hitting the element a foe is weak to deals ×1.5 damage; the reverse deals ×0.75. Light and Shadow are weak to each other.</div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {(Object.keys(ELEMENTS) as Element[]).map((e) => {
          const beats = (Object.keys(ELEMENTS) as Element[]).find((d) => weaknessOf(d) === e)!;
          return (
            <div key={e} className="flex items-center gap-1.5 rounded-tile bg-canvas p-2 text-sm">
              <GameIcon name={e} size={20} />
              <span className="font-extrabold">{ELEMENTS[e].name}</span>
              <span className="text-text-muted">beats</span>
              <GameIcon name={beats} size={16} />
              <span className="ml-auto text-right text-xs text-text-secondary">{RIDER_TEXT[e]}</span>
            </div>
          );
        })}
      </div>

      <h4 className="mb-1 mt-4 font-extrabold">Roles</h4>
      <div className="grid gap-1.5">
        {(Object.keys(ROLES) as Role[]).map((r) => (
          <div key={r} className="flex items-start gap-2 rounded-tile bg-canvas p-2 text-sm">
            <GameIcon name={r} size={20} />
            <span>
              <span className="font-extrabold">{ROLES[r].name}</span>: {ROLE_TEXT[r]}
            </span>
          </div>
        ))}
      </div>

      <h4 className="mb-1 mt-4 font-extrabold">Hive perks</h4>
      <div className="grid gap-1.5">
        {(Object.keys(PERK_TEXT) as (keyof typeof PERK_TEXT)[]).map((p) => (
          <div key={p} className="flex items-center gap-2 rounded-tile bg-canvas p-2 text-sm">
            <PerkIcon perk={p} size={20} /> {PERK_TEXT[p]}
          </div>
        ))}
      </div>
    </Modal>
  );
}
