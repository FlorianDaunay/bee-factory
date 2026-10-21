import { useMemo, useState } from "react";
import { BookOpen, Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { GameIcon } from "@/art/GameIcon";
import { ZoneFlag } from "@/art/icons";
import { BEES, beeById } from "@/core/data/bees";
import { ELEMENTS, RARITY, ZONES } from "@/core/data/meta";
import { powerScore, statsAt } from "@/core/progression";
import { computeSynergies } from "@/core/synergy";
import type { ZoneId } from "@/core/types";
import { MAX_TEAMS, TEAM_SIZE, useGame } from "@/store/game";
import { BeeTile, Modal, RedDot, fmt } from "@/ui/common";
import { BeeDetail } from "./BeeDetail";
import { StatsGuide } from "./StatsGuide";

export function BeesScreen() {
  const [tab, setTab] = useState<"team" | "all">("team");
  const fresh = useGame((s) => s.fresh.length);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button className={`btn flex-1 ${tab === "team" ? "btn-primary" : ""}`} onClick={() => setTab("team")}>
          <Users size={18} /> Team
        </button>
        <button className={`btn relative flex-1 ${tab === "all" ? "btn-primary" : ""}`} onClick={() => setTab("all")}>
          <BookOpen size={18} /> Collection
          {fresh > 0 && <RedDot />}
        </button>
      </div>
      {tab === "team" ? <TeamView /> : <CollectionView />}
    </div>
  );
}

const DOTS = [2, 3, 4, 6];

export function SynergyPanel({ ids }: { ids: string[] }) {
  const syn = computeSynergies(ids.map(beeById));
  if (!syn.zones.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {syn.zones.map((z) => (
        <div
          key={z.zone}
          className={`chip ${z.tier ? "" : "opacity-50"} ${syn.homeland === z.zone ? "animate-pop ring-2 ring-accent" : ""}`}
          title={`${ZONES[z.zone].name}: +${z.pct}% ${z.kind}`}
        >
          <ZoneFlag zone={z.zone} size={20} />
          <span className="flex gap-0.5">
            {DOTS.map((d) => (
              <span key={d} className={`h-2 w-2 rounded-full ${z.count >= d ? "bg-accent" : "bg-border"}`} />
            ))}
          </span>
          {z.tier > 0 && (
            <span className="flex items-center gap-0.5 text-xs num">
              <GameIcon name={z.kind} size={14} />+{z.pct}%{z.tier >= 3 && <GameIcon name="support" size={12} title="Zone passive active" />}
            </span>
          )}
        </div>
      ))}
      {syn.continents
        .filter((c) => c.active)
        .map((c) => (
          <span key={c.continent} className="chip capitalize">
            <GameIcon name="globe" size={18} /> {c.continent} <GameIcon name="hp" size={14} />+5%
          </span>
        ))}
      {syn.homeland && <span className="chip bg-accent/20"><GameIcon name="homeland" size={18} /> Homeland +15%</span>}
      {syn.unity && (
        <span className="chip animate-pop bg-accent/20" title={`Every bee is ${ELEMENTS[syn.unity.element].name}: +${syn.unity.pct}% attack, health and gauge`}>
          <GameIcon name={syn.unity.element} size={18} /> {ELEMENTS[syn.unity.element].name} unity <GameIcon name="atk" size={14} />
          <GameIcon name="hp" size={14} />
          <GameIcon name="gauge" size={14} />+{syn.unity.pct}%
        </span>
      )}
    </div>
  );
}

type SortKey = "power" | "rarity" | "level" | "element";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "power", label: "Power" },
  { key: "rarity", label: "Rarity" },
  { key: "level", label: "Level" },
  { key: "element", label: "Element" },
];
const ELEMENT_ORDER = ["flame", "leaf", "storm", "wave", "light", "shadow"];

function TeamView() {
  const team = useGame((s) => s.team);
  const teams = useGame((s) => s.teams);
  const activeTeam = useGame((s) => s.activeTeam);
  const bees = useGame((s) => s.bees);
  const setSlot = useGame((s) => s.setTeamSlot);
  const toggle = useGame((s) => s.toggleTeamMember);
  const selectTeam = useGame((s) => s.selectTeam);
  const addTeam = useGame((s) => s.addTeam);
  const renameTeam = useGame((s) => s.renameTeam);
  const deleteTeam = useGame((s) => s.deleteTeam);
  const [slot, setSlotSel] = useState<number | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sort, setSort] = useState<SortKey>("power");

  const power = (id: string) => powerScore(statsAt(beeById(id), bees[id].level, bees[id].rank));
  const ids = team.filter((t): t is string => !!t);
  const teamPower = ids.reduce((a, id) => a + power(id), 0);
  const owned = Object.values(bees).sort((a, b) => {
    const A = beeById(a.id);
    const B = beeById(b.id);
    if (sort === "rarity") return B.rarity - A.rarity || b.level - a.level;
    if (sort === "level") return b.level - a.level || B.rarity - A.rarity;
    if (sort === "element") return ELEMENT_ORDER.indexOf(A.element) - ELEMENT_ORDER.indexOf(B.element) || power(b.id) - power(a.id);
    return power(b.id) - power(a.id);
  });

  const pick = (id: string) => {
    // With a slot picked, the bee goes there; otherwise a tap adds or removes it.
    if (slot !== null) {
      setSlot(slot, id);
      const next = useGame.getState().team.findIndex((t) => !t);
      setSlotSel(next >= 0 ? next : null);
    } else toggle(id);
  };

  return (
    <div className="space-y-3">
      {/* saved teams */}
      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
        {teams.map((t, i) => (
          <button
            key={i}
            className={`chip shrink-0 font-bold ${i === activeTeam ? "bg-accent text-accent-foreground" : ""}`}
            onClick={() => {
              selectTeam(i);
              setSlotSel(null);
              setRenaming(null);
            }}
          >
            <Users size={14} /> {t.name}
            <span className="text-xs opacity-75 num">{t.members.filter(Boolean).length}</span>
          </button>
        ))}
        {teams.length < MAX_TEAMS && (
          <button className="chip shrink-0" onClick={addTeam} aria-label="New team" title="New team">
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="card p-3">
        <div className="mb-2 flex items-center gap-2">
          {renaming !== null ? (
            <form
              className="flex flex-1 gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                renameTeam(activeTeam, renaming);
                setRenaming(null);
              }}
            >
              <input
                autoFocus
                className="min-w-0 flex-1 rounded-tile border border-border bg-canvas px-2 py-1 font-bold"
                value={renaming}
                maxLength={20}
                onChange={(e) => setRenaming(e.target.value)}
              />
              <button className="btn btn-sm btn-primary" type="submit" aria-label="Save name">
                <Check size={16} />
              </button>
            </form>
          ) : (
            <>
              <span className="truncate text-lg font-extrabold">{teams[activeTeam]?.name}</span>
              <button className="btn btn-sm !min-h-0 !px-1.5 !py-0.5" onClick={() => setRenaming(teams[activeTeam]?.name ?? "")} aria-label="Rename team" title="Rename">
                <Pencil size={14} />
              </button>
              {teams.length > 1 && (
                <button className="btn btn-sm !min-h-0 !px-1.5 !py-0.5" onClick={() => setConfirmDelete(true)} aria-label="Delete team" title="Delete team">
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1 font-bold text-text-secondary num" title="Team power">
            <Users size={16} /> {ids.length}/{TEAM_SIZE}
            <GameIcon name="power" size={16} /> {fmt(teamPower)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {Array.from({ length: TEAM_SIZE }, (_, i) => {
            const id = team[i];
            const sp = id ? beeById(id) : null;
            return (
              <div key={i} className="relative">
                <button
                  onClick={() => setSlotSel(slot === i ? null : i)}
                  className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-tile border-2 bg-canvas transition-transform active:scale-95 ${
                    slot === i ? "border-accent ring-4 ring-accent/30" : "border-dashed border-border"
                  }`}
                  style={sp ? { borderStyle: "solid", background: `radial-gradient(circle, ${RARITY[sp.rarity].color}33, transparent 70%)` } : undefined}
                  aria-label={sp ? `${sp.name}, slot ${i + 1}` : `Empty slot ${i + 1}`}
                >
                  {sp ? (
                    <>
                      <BeeSprite look={sp.look} rarity={sp.rarity} size="78%" />
                      <span className="absolute bottom-1 text-xs font-bold num">Lv{bees[sp.id].level}</span>
                      <span className="absolute left-1 top-1">
                        <ZoneFlag zone={sp.zone} size={18} />
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl text-text-muted">+</span>
                  )}
                </button>
                {sp && (
                  <>
                    <button className="absolute -right-1.5 -top-1.5 rounded-full bg-danger p-1 text-white shadow-control" onClick={() => setSlot(i, null)} aria-label={`Remove ${sp.name}`}>
                      <X size={12} strokeWidth={3} />
                    </button>
                    <button className="absolute bottom-1 right-1 rounded-full bg-surface shadow-control" onClick={() => setDetail(sp.id)} aria-label={`${sp.name} details`}>
                      <GameIcon name="info" size={22} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-center text-xs text-text-muted">
          {slot !== null ? `Pick a bee for slot ${slot + 1}` : "Tap a bee below to add or remove it. Tap a slot first to choose where it goes."}
        </div>
        <div className="mt-3">
          <SynergyPanel ids={ids} />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
          {SORTS.map((o) => (
            <button key={o.key} className={`chip shrink-0 ${sort === o.key ? "bg-accent text-accent-foreground" : ""}`} onClick={() => setSort(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
        <button className="btn btn-sm shrink-0" onClick={() => setGuide(true)}>
          <GameIcon name="info" size={18} /> Guide
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {owned.map((b) => (
          <BeeTile key={b.id} id={b.id} level={b.level} rank={b.rank} selected={team.includes(b.id)} onClick={() => pick(b.id)} onInfo={() => setDetail(b.id)} />
        ))}
      </div>
      {detail && <BeeDetail id={detail} onClose={() => setDetail(null)} />}
      {guide && <StatsGuide onClose={() => setGuide(false)} />}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)}>
          <h3 className="mb-3 text-lg font-extrabold">Delete {teams[activeTeam]?.name}?</h3>
          <div className="mb-4 text-sm text-text-secondary">Your bees stay in your collection; only this team list goes away.</div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                deleteTeam(activeTeam);
                setConfirmDelete(false);
              }}
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CollectionView() {
  const bees = useGame((s) => s.bees);
  const fresh = useGame((s) => s.fresh);
  const [zone, setZone] = useState<ZoneId | "all">("all");
  const [detail, setDetail] = useState<string | null>(null);
  const list = useMemo(() => BEES.filter((b) => zone === "all" || b.zone === zone), [zone]);
  const count = Object.keys(bees).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-extrabold num">
          <BookOpen size={18} /> {count}/{BEES.length}
        </span>
      </div>
      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
        <button className={`chip shrink-0 ${zone === "all" ? "bg-accent text-accent-foreground" : ""}`} onClick={() => setZone("all")} aria-label="All zones">
          <GameIcon name="globe" size={20} />
        </button>
        {(Object.keys(ZONES) as ZoneId[]).map((z) => {
          const total = BEES.filter((b) => b.zone === z).length;
          const have = BEES.filter((b) => b.zone === z && bees[b.id]).length;
          return (
            <button key={z} className={`chip shrink-0 num ${zone === z ? "bg-accent text-accent-foreground" : ""}`} onClick={() => setZone(z)}>
              <ZoneFlag zone={z} size={20} /> {have}/{total}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {list.map((b) => (
          <BeeTile
            key={b.id}
            id={b.id}
            owned={!!bees[b.id]}
            level={bees[b.id]?.level}
            rank={bees[b.id]?.rank}
            badge={fresh.includes(b.id) ? <span className="badge bg-danger text-white">NEW</span> : undefined}
            onClick={() => bees[b.id] && setDetail(b.id)}
          />
        ))}
      </div>
      {detail && <BeeDetail id={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
