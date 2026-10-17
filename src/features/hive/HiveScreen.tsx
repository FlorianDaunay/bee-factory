import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpCircle, ChevronRight, Hammer, Plus, X } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { GameIcon, type IconName } from "@/art/GameIcon";
import { HiveArt } from "@/art/HiveArt";
import { ResourceIcon } from "@/art/icons";
import { beeById } from "@/core/data/bees";
import { ITEMS, ITEM_IDS } from "@/core/data/meta";
import { HIVE_ORDER, HIVE_TYPES, MAX_HIVES, WORKERS_PER_HIVE, hiveCapacity, hiveRate, hiveStored, upgradeCost, type Hive } from "@/core/hive";
import { RECIPES } from "@/core/kitchen";
import { nextStage } from "@/core/unlocks";
import { useGame } from "@/store/game";
import { PerkIcon } from "@/ui/PerkIcon";
import { BeeTile, Cost, FloatText, Modal, fmt, useNow } from "@/ui/common";

export function HiveScreen() {
  const hives = useGame((s) => s.hives);
  const collectAll = useGame((s) => s.collectAll);
  const now = useNow(1000);
  const [pop, setPop] = useState<{ key: number; amount: number } | null>(null);
  const total = hives.reduce((a, h) => a + hiveStored(h, now), 0);

  return (
    <div className="space-y-4">
      <PipGreeting />

      <section className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-extrabold"><GameIcon name="hive" size={26} /> Hives</h2>
        <div className="relative">
          <button
            className="btn btn-primary"
            disabled={total <= 0}
            onClick={() => {
              const got = collectAll();
              if (got > 0) setPop({ key: Date.now(), amount: got });
            }}
          >
            <ResourceIcon id="honey" /> Collect all <span className="num">{fmt(total)}</span>
          </button>
          {pop && (
            <FloatText key={pop.key}>
              +{fmt(pop.amount)}
            </FloatText>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hives.map((h) => (
          <HiveCard key={h.id} hive={h} now={now} />
        ))}
        {hives.length < MAX_HIVES && <BuildCard />}
      </div>

      <Kitchen />
    </div>
  );
}

function PipGreeting() {
  const freePack = useGame((s) => s.freePack);
  const cleared = useGame((s) => s.cleared);
  const team = useGame((s) => s.team.filter(Boolean).length);
  const next = nextStage(cleared);
  const pip = beeById("pip");

  // Pip points at the most useful next thing, with icons more than words.
  const hint: { to: string; icon: IconName; text: string } = freePack
    ? { to: "/summon", icon: "summon", text: "A free pack is waiting!" }
    : team < 3
      ? { to: "/summon", icon: "summon", text: "Recruit more bees!" }
      : next
        ? { to: "/story", icon: "story", text: `Stage ${next.id} awaits!` }
        : { to: "/bees", icon: "bees", text: "Train your bees!" };

  return (
    <Link to={hint.to} className="card flex items-center gap-3 p-3 transition-transform active:scale-[0.98]">
      <BeeSprite look={pip.look} rarity={1} size={72} />
      <div className="relative flex flex-1 items-center gap-2 rounded-tile bg-accent/15 px-3 py-2 font-bold">
        <span className="absolute -left-2 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-accent/15" />
        <GameIcon name={hint.icon} size={26} />
        {hint.text}
      </div>
      <ChevronRight className="text-text-muted" size={28} />
    </Link>
  );
}

function HiveCard({ hive, now }: { hive: Hive; now: number }) {
  const collect = useGame((s) => s.collectHive);
  const upgrade = useGame((s) => s.upgradeHive);
  const canAfford = useGame((s) => s.canAfford);
  const [pop, setPop] = useState<{ key: number; amount: number } | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [squish, setSquish] = useState(0);

  const t = HIVE_TYPES[hive.type];
  const stored = hiveStored(hive, now);
  const cap = hiveCapacity(hive);
  const fill = cap ? stored / cap : 0;
  const cost = upgradeCost(hive);

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        <button
          key={squish}
          className="relative animate-squish"
          onClick={() => {
            const got = collect(hive.id);
            setSquish((n) => n + 1);
            if (got > 0) setPop({ key: Date.now(), amount: got });
          }}
          aria-label="Collect honey"
        >
          <HiveArt type={hive.type} fill={fill} size={96} />
          {pop && <FloatText key={pop.key}>+{fmt(pop.amount)}</FloatText>}
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-extrabold">{t.name}</span>
            <span className="badge bg-accent/20">Lv {hive.level}</span>
          </div>
          <div className="relative h-5 overflow-hidden rounded-pill border border-border bg-canvas">
            <div className="h-full rounded-pill transition-[width] duration-700" style={{ width: `${fill * 100}%`, background: "linear-gradient(90deg,#F5B301,#FFD86B)" }} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold num">
              {fmt(stored)} / {fmt(cap)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-text-secondary num">
            <ResourceIcon id="honey" size={16} />
            {hiveRate(hive).toFixed(1)}/min
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-1.5" aria-label="Worker bees">
          {Array.from({ length: WORKERS_PER_HIVE }, (_, i) => {
            const id = hive.workers[i];
            return (
              <button
                key={i}
                onClick={() => setPicking(i)}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border bg-canvas transition-transform active:scale-90"
              >
                {id ? <BeeSprite look={beeById(id).look} rarity={beeById(id).rarity} size={44} animated={false} aura={false} /> : <span className="text-xl text-text-muted">+</span>}
              </button>
            );
          })}
        </div>
        {cost ? (
          <button className="btn btn-sm" disabled={!canAfford(cost)} onClick={() => upgrade(hive.id)} title="Upgrade">
            <ArrowUpCircle size={18} className="text-success" /> <Cost cost={cost} />
          </button>
        ) : (
          <span className="badge bg-success/20">MAX</span>
        )}
      </div>

      {picking !== null && <WorkerPicker hive={hive} slot={picking} onClose={() => setPicking(null)} />}
    </div>
  );
}

function WorkerPicker({ hive, slot, onClose }: { hive: Hive; slot: number; onClose: () => void }) {
  const bees = useGame((s) => s.bees);
  const hives = useGame((s) => s.hives);
  const setWorker = useGame((s) => s.setWorker);
  const current = hive.workers[slot];
  const busy = new Map(hives.flatMap((h) => h.workers.map((w) => [w, h.id] as const)));
  const list = Object.values(bees).sort((a, b) => beeById(b.id).work - beeById(a.id).work);

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><GameIcon name="work" size={24} /> Worker</h3>
      {current && (
        <button
          className="btn btn-sm mb-3"
          onClick={() => {
            setWorker(hive.id, slot, null);
            onClose();
          }}
        >
          <X size={16} /> Remove
        </button>
      )}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {list.map((b) => {
          const sp = beeById(b.id);
          return (
            <BeeTile
              key={b.id}
              id={b.id}
              level={b.level}
              selected={b.id === current}
              size={60}
              badge={
                <span className="badge bg-surface shadow-control num">
                  <GameIcon name="work" size={13} />
                  {sp.work}
                  <PerkIcon perk={sp.perk} size={13} />
                  {busy.has(b.id) && busy.get(b.id) !== hive.id && <GameIcon name="sleep" size={13} title="Works in another hive" />}
                </span>
              }
              onClick={() => {
                setWorker(hive.id, slot, b.id);
                onClose();
              }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-text-muted">
        <span className="flex items-center gap-1"><GameIcon name="work" size={14} /> = +% <ResourceIcon id="honey" size={14} /></span>
        <span className="flex items-center gap-1"><PerkIcon perk="storage" size={14} /> storage</span>
        <span className="flex items-center gap-1"><PerkIcon perk="pollen" size={14} /> pollen</span>
        <span className="flex items-center gap-1"><PerkIcon perk="silver" size={14} /> silver</span>
        <span className="flex items-center gap-1"><PerkIcon perk="jelly" size={14} /> jelly</span>
      </div>
    </Modal>
  );
}

function BuildCard() {
  const build = useGame((s) => s.buildHive);
  const canAfford = useGame((s) => s.canAfford);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="card flex min-h-[150px] flex-col items-center justify-center gap-1 border-dashed p-3 text-text-muted transition-transform active:scale-[0.98]" onClick={() => setOpen(true)}>
        <Plus size={40} strokeWidth={2.5} />
        <span className="font-bold">New hive</span>
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><Hammer size={22} /> Build</h3>
          <div className="space-y-2">
            {HIVE_ORDER.map((type) => {
              const t = HIVE_TYPES[type];
              return (
                <div key={type} className="flex items-center gap-3 rounded-tile border border-border p-2">
                  <HiveArt type={type} fill={0.5} size={64} />
                  <div className="flex-1">
                    <div className="font-extrabold">{t.name}</div>
                    <div className="flex items-center gap-1 text-sm text-text-secondary">
                      <ResourceIcon id="honey" size={14} /> {t.rate}/min
                    </div>
                  </div>
                  <button
                    className="btn btn-sm"
                    disabled={!canAfford(t.buildCost)}
                    onClick={() => {
                      if (build(type)) setOpen(false);
                    }}
                  >
                    <Cost cost={t.buildCost} />
                  </button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}

function Kitchen() {
  const items = useGame((s) => s.items);
  const craft = useGame((s) => s.craft);
  const canAfford = useGame((s) => s.canAfford);
  const [pop, setPop] = useState<{ key: number; id: string } | null>(null);
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-xl font-extrabold"><GameIcon name="honeyJar" size={26} /> Kitchen</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ITEM_IDS.map((id) => (
          <div key={id} className="card relative flex flex-col items-center gap-1 p-2">
            <GameIcon name={id} size={40} />
            <span className="text-sm font-bold">{ITEMS[id].name}</span>
            <span className="text-xs text-text-muted">{ITEMS[id].desc}</span>
            <span className="badge bg-accent/20 num">×{items[id] ?? 0}</span>
            <button
              className="btn btn-sm w-full"
              disabled={!canAfford(RECIPES[id])}
              onClick={() => {
                if (craft(id)) setPop({ key: Date.now(), id });
              }}
            >
              <Cost cost={RECIPES[id]} />
            </button>
            {pop?.id === id && <FloatText key={pop.key}>+1</FloatText>}
          </div>
        ))}
      </div>
    </section>
  );
}
