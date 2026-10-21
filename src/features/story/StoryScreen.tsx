import { Fragment, useState } from "react";
import { Clock } from "lucide-react";
import { DIFFICULTIES, activeEvents, eventStage, nextHoliday, timeLeft, type EventKind } from "@/core/events";
import type { IconName } from "@/art/GameIcon";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Pencil, Swords } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { GameIcon } from "@/art/GameIcon";
import { EnemySprite } from "@/art/EnemySprite";
import { ResourceIcon, Stars, ZoneFlag } from "@/art/icons";
import { beeById } from "@/core/data/bees";
import { enemyById } from "@/core/data/enemies";
import { ELEMENTS, ITEMS } from "@/core/data/meta";
import { CHAPTERS, JELLY_DROP_CHANCE, rewardRange, starRules, ticketDropChance, type Stage } from "@/core/data/story";
import type { ItemId, ResourceId } from "@/core/types";
import { chapterUnlocked, nextStage, stageUnlocked } from "@/core/unlocks";
import { teamLevel, useGame } from "@/store/game";
import { Modal, fmt, useNow } from "@/ui/common";
import { SynergyPanel } from "../bees/BeesScreen";

/** Section titles above the first chapter of each part of the story. */
const ACTS: Record<number, { title: string; icon: IconName }> = {
  0: { title: "Earth", icon: "globe" },
  9: { title: "Space", icon: "shadow" },
  14: { title: "Deep space", icon: "light" },
};

/** True for dark backgrounds that need light text. */
function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

const KIND_LABEL: Record<EventKind, string> = { daily: "Today", monthly: "This month", season: "Season", holiday: "Holiday" };

/** Timed dungeons: today's, this month's, the season's and any holiday running now. */
function EventsPanel({ onPick }: { onPick: (s: Stage) => void }) {
  const now = useNow(30000);
  const cleared = useGame((s) => s.cleared);
  const eventClears = useGame((s) => s.eventClears);
  const level = useGame(teamLevel);
  const events = activeEvents(now);
  const soon = nextHoliday(now);
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-xl font-black">
        <GameIcon name="chest" size={24} /> Events
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {events.map((ev) => {
          const dark = isDark(ev.scene[0]);
          return (
            <div
              key={ev.id}
              className={`card overflow-hidden p-2.5 ${dark ? "text-white" : "text-[#3A2410]"}`}
              style={{ background: `linear-gradient(135deg, ${ev.scene[0]}, ${ev.scene[1]})` }}
            >
              <div className="flex items-center gap-2">
                <GameIcon name={ev.element} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold uppercase tracking-wide opacity-75">{KIND_LABEL[ev.kind]}</div>
                  <div className="truncate font-extrabold leading-tight">{ev.name}</div>
                </div>
                <span className="badge shrink-0 bg-black/30 text-white num" title="Time left">
                  <Clock size={13} /> {timeLeft(ev.end, now)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1 text-xs font-bold opacity-90">
                Bonus <ResourceIcon id={ev.focus} size={14} />
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {DIFFICULTIES.map((d, i) => {
                  const st = eventStage(ev, i, cleared, level);
                  const best = eventClears[st.id];
                  return (
                    <button
                      key={d}
                      className="flex flex-col items-center rounded-tile border-2 border-white/80 bg-white px-1 py-1 text-[#3A2410] shadow-control transition-transform active:scale-95"
                      onClick={() => onPick(st)}
                    >
                      <span className="text-sm font-extrabold">{d}</span>
                      <span className="text-[10px] font-bold text-[#7A5A2E] num">Lv {st.waves[0][0].level}</span>
                      {best !== undefined ? <Stars count={best} max={3} size={10} /> : <span className="flex items-center gap-0.5 text-[10px] num"><ResourceIcon id="ticket" size={12} />{st.firstClear.ticket ? `+${st.firstClear.ticket}` : "1st"}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {soon && (
        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Clock size={14} /> Next holiday: <span className="font-bold">{soon.name}</span> in {timeLeft(soon.start, now)}
        </div>
      )}
    </section>
  );
}

export function StoryScreen() {
  const cleared = useGame((s) => s.cleared);
  const [stage, setStage] = useState<Stage | null>(null);
  const next = nextStage(cleared);

  return (
    <div className="space-y-4">
      <EventsPanel onPick={setStage} />
      {CHAPTERS.map((ch) => {
        const open = chapterUnlocked(cleared, ch.index);
        const stars = ch.stages.reduce((a, s) => a + (cleared[s.id] ?? 0), 0);
        const dark = isDark(ch.scene[0]);
        return (
          <Fragment key={ch.index}>
          {ACTS[ch.index] && <h2 className="flex items-center gap-2 pt-2 text-xl font-black"><GameIcon name={ACTS[ch.index].icon} size={24} /> {ACTS[ch.index].title}</h2>}
          <section
            className={`card relative overflow-hidden ${open ? "" : "opacity-55 grayscale"}`}
            style={{ background: `linear-gradient(180deg, ${ch.scene[0]} 0%, ${ch.scene[0]} 55%, ${ch.scene[1]} 100%)` }}
          >
            <div className={`flex items-center gap-2 px-3 pt-3 ${dark ? "text-white" : "text-[#3A2410]"}`}>
              <ZoneFlag zone={ch.zone} size={30} />
              <div className="flex-1">
                <div className="text-xs font-bold opacity-70">Ch. {ch.index}</div>
                <div className="text-lg font-extrabold leading-tight">{ch.name}</div>
              </div>
              <span className="badge bg-white/70 num">
                <Stars count={1} max={1} size={12} /> {stars}/{ch.stages.length * 3}
              </span>
              <GameIcon name={ch.element} size={26} title={ELEMENTS[ch.element].name} />
            </div>
            <div className="relative flex items-center justify-around px-3 pb-5 pt-4">
              {/* path line */}
              <div className="absolute left-8 right-8 top-1/2 h-1.5 -translate-y-1/2 rounded-pill bg-white/70" style={{ backgroundImage: "repeating-linear-gradient(90deg, #3A241033 0 8px, transparent 8px 16px)" }} />
              {ch.stages.map((s, i) => {
                const can = open && stageUnlocked(cleared, s);
                const done = cleared[s.id] !== undefined;
                const isNext = next?.id === s.id;
                return (
                  <button
                    key={s.id}
                    disabled={!can}
                    onClick={() => setStage(s)}
                    className={`relative flex flex-col items-center transition-transform active:scale-90 disabled:cursor-not-allowed ${i % 2 ? "translate-y-3" : "-translate-y-3"}`}
                  >
                    <span
                      className={`flex items-center justify-center rounded-full border-[3px] border-[#3A2410] font-extrabold text-[#3A2410] shadow-control ${
                        s.boss ? "h-14 w-14 text-2xl" : "h-11 w-11"
                      } ${isNext ? "animate-pop ring-4 ring-white" : ""}`}
                      style={{ background: done ? "#FFB627" : can ? "#FFFFFF" : "#BBBBBB" }}
                    >
                      {s.boss ? <GameIcon name="crown" size={30} /> : can ? s.index + 1 : <Lock size={18} />}
                    </span>
                    {done && (
                      <span className="mt-0.5 rounded-pill bg-white/80 px-1">
                        <Stars count={cleared[s.id]} max={3} size={10} />
                      </span>
                    )}
                    {isNext && <span className="absolute -top-7 animate-bounce"><GameIcon name="bees" size={24} /></span>}
                  </button>
                );
              })}
            </div>
          </section>
          </Fragment>
        );
      })}
      {stage && <StagePreview stage={stage} onClose={() => setStage(null)} />}
    </div>
  );
}

function StagePreview({ stage, onClose }: { stage: Stage; onClose: () => void }) {
  const team = useGame((s) => s.team);
  const bees = useGame((s) => s.bees);
  const items = useGame((s) => s.items);
  const cleared = useGame((s) => s.cleared);
  const navigate = useNavigate();
  const ids = team.filter((t): t is string => !!t);
  const eventClears = useGame((s) => s.eventClears);
  const record = stage.event ? eventClears : cleared;
  const first = record[stage.id] === undefined;
  const best = record[stage.id] ?? 0;
  const ch = CHAPTERS[stage.chapter];

  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center gap-2 pr-12">
        {stage.event ? <GameIcon name={stage.event.element} size={28} /> : <ZoneFlag zone={ch.zone} size={28} />}
        <h3 className="flex items-center gap-1.5 text-xl font-extrabold">
          {stage.event?.name ?? stage.id} {stage.boss && <GameIcon name="crown" size={24} />}
        </h3>
        <span className="badge bg-accent/20 num">Lv {stage.waves[0][0].level}</span>
      </div>

      <div className="mt-3 space-y-2">
        {stage.waves.map((w, i) => (
          <div key={i} className="flex items-center gap-2 rounded-tile bg-canvas p-1.5">
            <span className="flex w-12 items-center justify-center gap-0.5 text-sm font-extrabold text-text-muted"><GameIcon name="waveMark" size={18} />{i + 1}</span>
            <div className="flex flex-1 flex-wrap items-end gap-1">
              {w.map((e, j) => {
                const sp = enemyById(e.id);
                return (
                  <span key={j} className="relative" title={sp.name}>
                    <EnemySprite kind={sp.kind} tint={sp.tint} boss={!!sp.boss} size={sp.boss ? 64 : 44} animated={false} />
                    <span className="absolute -bottom-1 right-0"><GameIcon name={sp.element} size={14} /></span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* rewards: every win rolls within the range shown */}
      <div className="mt-3 rounded-tile bg-canvas p-2">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-extrabold">
          <GameIcon name="chest" size={20} /> Rewards per win
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.entries(stage.rewards) as [ResourceId, number][]).map(([k, v]) => {
            const [lo, hi] = rewardRange(v);
            return (
              <span key={k} className="chip num">
                <ResourceIcon id={k} size={16} />
                {fmt(lo)}-{fmt(hi)}
              </span>
            );
          })}
          <span className="chip num" title="Chance to get a pack ticket">
            <ResourceIcon id="ticket" size={16} /> {Math.round(ticketDropChance(stage.chapter, stage.boss) * 100)}%
          </span>
          {stage.boss && (
            <span className="chip num" title="Chance to get a royal jelly">
              <ResourceIcon id="jelly" size={16} /> {Math.round(JELLY_DROP_CHANCE * 100)}%
            </span>
          )}
        </div>
        {first && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="badge bg-danger text-white">1st clear bonus</span>
            {(["ticket", "silver", "honey", "jelly"] as const)
              .filter((k) => stage.firstClear[k])
              .map((k) => (
                <span key={k} className="chip num">
                  <ResourceIcon id={k} size={16} />
                  {fmt(stage.firstClear[k]!)}
                </span>
              ))}
            {Object.entries(stage.firstClear.items ?? {}).map(([k, v]) => (
              <span key={k} className="chip num">
                <GameIcon name={k as ItemId} size={18} />×{v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* how to get the three stars */}
      <div className="mt-2 rounded-tile bg-canvas p-2">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-extrabold">
          <Stars count={3} max={3} size={14} /> Three stars
          {best > 0 && <span className="ml-auto text-xs font-bold text-text-muted">Best: {best}/3</span>}
        </div>
        <ol className="space-y-0.5 text-sm">
          {starRules(stage).map((rule, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <Stars count={i < best ? 1 : 0} max={1} size={14} />
              {rule}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 rounded-tile border border-border p-2">
        <div className="flex flex-wrap items-center gap-1">
          {ids.map((id) => (
            <span key={id} className="flex flex-col items-center">
              <BeeSprite look={beeById(id).look} rarity={beeById(id).rarity} size={48} animated={false} />
              <span className="text-[10px] font-bold num">Lv{bees[id].level}</span>
            </span>
          ))}
          <Link to="/bees" className="btn btn-sm ml-auto">
            <Pencil size={16} /> Team
          </Link>
        </div>
        <div className="mt-2">
          <SynergyPanel ids={ids} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-sm">
          {(Object.keys(items) as ItemId[])
            .filter((k) => items[k] > 0)
            .map((k) => (
              <span key={k} className="chip !py-0.5 num">
                <GameIcon name={k} size={18} title={ITEMS[k].name} />×{Math.min(items[k], 5)}
              </span>
            ))}
        </div>
      </div>

      <button className="btn btn-primary mt-4 w-full text-lg" disabled={!ids.length} onClick={() => navigate(`/battle/${stage.id}`)}>
        <Swords size={22} /> Fight!
      </button>
    </Modal>
  );
}
