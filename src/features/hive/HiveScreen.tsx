import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpCircle, ChevronRight, Coins, Eraser, Hammer, Lock, Plus, Sparkles, Users, X } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { GameIcon, type IconName } from "@/art/GameIcon";
import { HiveArt } from "@/art/HiveArt";
import { ResourceIcon } from "@/art/icons";
import { beeById } from "@/core/data/bees";
import { ITEMS, ITEM_IDS } from "@/core/data/meta";
import {
  HIVE_ORDER,
  HIVE_RESOURCES,
  HIVE_TYPES,
  MAX_HIVES,
  WORKERS_PER_HIVE,
  beeWork,
  hiveRates,
  hiveSellValue,
  slotCost,
  totalRates,
  upgradeCost,
  type Hive,
  type HiveRates,
} from "@/core/hive";
import { RECIPES } from "@/core/kitchen";
import { nextStage } from "@/core/unlocks";
import { useGame } from "@/store/game";
import { PerkIcon, PERK_TEXT } from "@/ui/PerkIcon";
import { BeeTile, Cost, FloatText, Modal, fmt } from "@/ui/common";

/** A per-minute rate, readable at any size (slow ones like jelly are shown per hour). */
export function fmtRate(perMin: number): string {
  if (perMin <= 0) return "0/min";
  if (perMin < 1) return `${(perMin * 60).toFixed(perMin * 60 < 10 ? 1 : 0)}/h`;
  return `${perMin < 10 ? perMin.toFixed(1) : fmt(Math.round(perMin))}/min`;
}

function Rates({ rates, size = 16, all = false }: { rates: HiveRates; size?: number; all?: boolean }) {
  const keys = HIVE_RESOURCES.filter((k) => all || rates[k] > 0);
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
      {keys.map((k) => (
        <span key={k} className={`inline-flex items-center gap-0.5 font-bold num ${rates[k] > 0 ? "" : "opacity-40"}`} title={k}>
          <ResourceIcon id={k} size={size} />
          {fmtRate(rates[k])}
        </span>
      ))}
    </span>
  );
}

export function HiveScreen() {
  const hives = useGame((s) => s.hives);
  const bees = useGame((s) => s.bees);
  const hiveSlots = useGame((s) => s.hiveSlots);
  const [workers, setWorkers] = useState<{ hive: string; slot: number } | null>(null);
  const total = totalRates(hives, bees);

  return (
    <div className="space-y-4">
      <PipGreeting />

      <section className="card space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <GameIcon name="hive" size={26} /> Hives
            <span className="badge bg-accent/20 num" title="Used / unlocked slots">
              {hives.length}/{hiveSlots}
            </span>
          </h2>
          <button className="btn btn-primary" onClick={() => setWorkers({ hive: hives[0].id, slot: 0 })}>
            <Users size={18} /> Workers
          </button>
        </div>
        <div className="rounded-tile bg-canvas px-3 py-2">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-text-muted">Income, straight to your stock</div>
          <Rates rates={total} size={20} all />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hives.map((h) => (
          <HiveCard key={h.id} hive={h} canSell={hives.length > 1} onWorker={(slot) => setWorkers({ hive: h.id, slot })} />
        ))}
        {/* Open slots can take a new hive; the next locked slot can be bought (one at a time). */}
        {Array.from({ length: hiveSlots - hives.length }, (_, i) => (
          <BuildCard key={`free-${i}`} />
        ))}
        {hiveSlots < MAX_HIVES && <SlotCard />}
        {Array.from({ length: Math.max(0, MAX_HIVES - hiveSlots - 1) }, (_, i) => (
          <div key={`locked-${i}`} className="card flex min-h-[150px] items-center justify-center border-dashed p-3 text-text-muted opacity-50">
            <Lock size={28} />
          </div>
        ))}
      </div>

      <Kitchen />
      {workers && <WorkersModal initial={workers} onClose={() => setWorkers(null)} />}
    </div>
  );
}

function PipGreeting() {
  const tickets = useGame((s) => s.resources.ticket);
  const cleared = useGame((s) => s.cleared);
  const team = useGame((s) => s.team.filter(Boolean).length);
  const next = nextStage(cleared);
  const pip = beeById("pip");

  // Pip points at the most useful next thing, with icons more than words.
  const hint: { to: string; icon: IconName; text: string } = tickets > 0
    ? { to: "/summon", icon: "summon", text: `You have ${fmt(tickets)} free pack tickets!` }
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

function HiveCard({ hive, canSell, onWorker }: { hive: Hive; canSell: boolean; onWorker: (slot: number) => void }) {
  const bees = useGame((s) => s.bees);
  const upgrade = useGame((s) => s.upgradeHive);
  const canAfford = useGame((s) => s.canAfford);
  const [pop, setPop] = useState(0);
  const [selling, setSelling] = useState(false);

  const t = HIVE_TYPES[hive.type];
  const cost = upgradeCost(hive);
  const rates = hiveRates(hive, bees);

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        <span className="relative">
          <HiveArt type={hive.type} fill={0.6} size={88} />
          {pop > 0 && <FloatText key={pop}>Lv {hive.level}!</FloatText>}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-extrabold">{t.name}</span>
            <span className="flex items-center gap-1">
              <span className="badge bg-accent/20">Lv {hive.level}</span>
              {canSell && (
                <button className="btn btn-sm !min-h-0 !px-1.5 !py-0.5" onClick={() => setSelling(true)} title="Sell this hive" aria-label="Sell this hive">
                  <Coins size={14} />
                </button>
              )}
            </span>
          </div>
          <div className="rounded-tile bg-canvas px-2 py-1 text-sm">
            <Rates rates={rates} />
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
                onClick={() => onWorker(i)}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border bg-canvas transition-transform active:scale-90"
              >
                {id ? <BeeSprite look={beeById(id).look} rarity={beeById(id).rarity} size={44} animated={false} aura={false} /> : <span className="text-xl text-text-muted">+</span>}
              </button>
            );
          })}
        </div>
        {cost ? (
          <button
            className="btn btn-sm"
            disabled={!canAfford(cost)}
            onClick={() => {
              if (upgrade(hive.id)) setPop(Date.now());
            }}
            title="Upgrade: +25% base honey"
          >
            <ArrowUpCircle size={18} className="text-success" /> <Cost cost={cost} />
          </button>
        ) : (
          <span className="badge bg-success/20">MAX</span>
        )}
      </div>
      {selling && <SellHive hive={hive} onClose={() => setSelling(false)} />}
    </div>
  );
}

/**
 * Every hive's workers in one place: pick a slot, then a bee. The bee list shows what each bee
 * adds at its current level, and where it already works.
 */
function WorkersModal({ initial, onClose }: { initial: { hive: string; slot: number }; onClose: () => void }) {
  const hives = useGame((s) => s.hives);
  const bees = useGame((s) => s.bees);
  const setWorker = useGame((s) => s.setWorker);
  const autoAssign = useGame((s) => s.autoAssignWorkers);
  const clearAll = useGame((s) => s.clearWorkers);
  const [sel, setSel] = useState(initial);
  const where = new Map(hives.flatMap((h, hi) => h.workers.map((w) => [w, hi] as const)));
  const list = Object.values(bees).sort((a, b) => beeWork(b.id, b) - beeWork(a.id, a));
  const total = totalRates(hives, bees);

  const advance = (hiveIndex: number, slot: number) => {
    // After filling a slot, jump to the next empty one so filling all hives is quick.
    const hs = useGame.getState().hives;
    for (let n = 1; n <= hs.length * WORKERS_PER_HIVE; n++) {
      const flat = hiveIndex * WORKERS_PER_HIVE + slot + n;
      const h = hs[Math.floor(flat / WORKERS_PER_HIVE) % hs.length];
      const sl = flat % WORKERS_PER_HIVE;
      if (!h.workers[sl]) return setSel({ hive: h.id, slot: sl });
    }
  };

  return (
    <Modal onClose={onClose} wide>
      <h3 className="mb-1 flex items-center gap-2 text-lg font-extrabold">
        <GameIcon name="work" size={24} /> Workers
      </h3>
      <div className="mb-2 text-sm text-text-secondary">Pick a slot, then a bee. Levels and stars make a bee work better.</div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button className="btn btn-sm btn-primary" onClick={autoAssign}>
          <Sparkles size={16} /> Best team
        </button>
        <button className="btn btn-sm" onClick={clearAll}>
          <Eraser size={16} /> Clear all
        </button>
        <span className="ml-auto self-center text-sm">
          <Rates rates={total} />
        </span>
      </div>

      <div className="space-y-1.5">
        {hives.map((h, hi) => (
          <div key={h.id} className="flex items-center gap-2 rounded-tile bg-canvas p-1.5">
            <HiveArt type={h.type} fill={0.6} size={40} />
            <div className="w-20 shrink-0 leading-tight sm:w-28">
              <div className="truncate text-sm font-extrabold">{HIVE_TYPES[h.type].name}</div>
              <div className="text-xs text-text-muted">Lv {h.level}</div>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: WORKERS_PER_HIVE }, (_, i) => {
                const id = h.workers[i];
                const active = sel.hive === h.id && sel.slot === i;
                return (
                  <span key={i} className="relative">
                    <button
                      onClick={() => setSel({ hive: h.id, slot: i })}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 bg-surface transition-transform active:scale-90 ${
                        active ? "border-accent ring-4 ring-accent/30" : "border-dashed border-border"
                      }`}
                      aria-label={`Hive ${hi + 1} slot ${i + 1}`}
                    >
                      {id ? <BeeSprite look={beeById(id).look} rarity={beeById(id).rarity} size={40} animated={false} aura={false} /> : <span className="text-lg text-text-muted">+</span>}
                    </button>
                    {id && active && (
                      <button className="absolute -right-1 -top-1 rounded-full bg-danger p-0.5 text-white" onClick={() => setWorker(h.id, i, null)} aria-label="Remove">
                        <X size={12} strokeWidth={3} />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
            <div className="hidden min-w-0 flex-1 text-xs sm:block">
              <Rates rates={hiveRates(h, bees)} size={14} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {list.map((b) => {
          const sp = beeById(b.id);
          const at = where.get(b.id);
          return (
            <BeeTile
              key={b.id}
              id={b.id}
              level={b.level}
              rank={b.rank}
              size={52}
              selected={at !== undefined}
              badge={
                <span className="badge bg-surface shadow-control num">
                  <GameIcon name="work" size={13} />+{beeWork(b.id, b)}%
                  <PerkIcon perk={sp.perk} size={13} />
                  {at !== undefined && <span className="text-accent">H{at + 1}</span>}
                </span>
              }
              onClick={() => {
                setWorker(sel.hive, sel.slot, b.id);
                advance(hives.findIndex((h) => h.id === sel.hive), sel.slot);
              }}
            />
          );
        })}
      </div>
      <PerkLegend />
    </Modal>
  );
}

function PerkLegend() {
  return (
    <div className="mt-3 space-y-1 rounded-tile bg-canvas p-2 text-xs text-text-secondary">
      <div className="flex items-center gap-1">
        <GameIcon name="work" size={14} /> Work: + that % of the hive's honey. Each perk below also grows with the bee's level (+4%/level) and stars (+15%/star).
      </div>
      {(Object.keys(PERK_TEXT) as (keyof typeof PERK_TEXT)[]).map((p) => (
        <div key={p} className="flex items-center gap-1">
          <PerkIcon perk={p} size={14} /> {PERK_TEXT[p]}
        </div>
      ))}
    </div>
  );
}

function SellHive({ hive, onClose }: { hive: Hive; onClose: () => void }) {
  const sell = useGame((s) => s.sellHive);
  const value = hiveSellValue(hive);
  return (
    <Modal onClose={onClose}>
      <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
        <Coins size={22} /> Sell {HIVE_TYPES[hive.type].name} (Lv {hive.level})?
      </h3>
      <div className="flex items-center gap-3">
        <HiveArt type={hive.type} fill={0} size={72} />
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 font-bold">
            You get back <Cost cost={value} />
          </div>
          <div className="text-text-secondary">Its worker bees go back to rest.</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="btn" onClick={onClose}>
          Keep it
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (sell(hive.id)) onClose();
          }}
        >
          <Coins size={16} /> Sell
        </button>
      </div>
    </Modal>
  );
}

/** The next hive slot, bought one at a time; each one costs more. */
function SlotCard() {
  const hiveSlots = useGame((s) => s.hiveSlots);
  const buy = useGame((s) => s.buyHiveSlot);
  const canAfford = useGame((s) => s.canAfford);
  const cost = slotCost(hiveSlots);
  if (!cost) return null;
  return (
    <div className="card flex min-h-[150px] flex-col items-center justify-center gap-2 border-dashed p-3 text-text-muted">
      <Lock size={30} />
      <span className="font-bold">Hive slot {hiveSlots + 1}</span>
      <button className="btn btn-sm" disabled={!canAfford(cost)} onClick={buy}>
        Unlock <Cost cost={cost} />
      </button>
    </div>
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
                      <ResourceIcon id="honey" size={14} /> {t.rate}/min · max Lv {t.maxLevel}
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

