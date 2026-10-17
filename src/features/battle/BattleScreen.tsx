import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Bot, ChevronsUp, FastForward, Flag, Play, RotateCw, X } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { GameIcon, type IconName } from "@/art/GameIcon";
import { EnemySprite } from "@/art/EnemySprite";
import { music, useMusic, type Mood } from "@/audio/music";
import { sfx } from "@/audio/sfx";
import { autoStep } from "@/core/battle/autoplay";
import { act, battleStars, createBattle, endPlayerTurn, playerTurnDone } from "@/core/battle/engine";
import type { BattleEvent, BattleState, PlayerAction, Unit } from "@/core/battle/types";
import { beeById } from "@/core/data/bees";
import { enemyById } from "@/core/data/enemies";
import { ELEMENTS, ITEMS, RARITY, STATUSES } from "@/core/data/meta";
import { CHAPTERS, STAGES } from "@/core/data/story";
import { BATTLE_ITEM_LIMIT } from "@/core/kitchen";
import { randomSeed } from "@/core/rng";
import type { ItemId } from "@/core/types";
import { BACK_EVENT } from "@/native";
import { useGame } from "@/store/game";
import { BattleResult } from "./BattleResult";

interface Step {
  events: BattleEvent[];
  after: BattleState;
}

interface Floater {
  key: number;
  uid: string;
  text: string;
  color: string;
  big?: boolean;
  icon?: IconName;
}

interface Banner {
  key: number;
  text: string;
  sub?: string;
  icon?: IconName;
  color: string;
  rarity?: number;
  beeRef?: string;
}

const BASE_DUR: Partial<Record<BattleEvent["type"], number>> = {
  attack: 380,
  burst: 900,
  bossSkill: 1100,
  telegraph: 700,
  heal: 220,
  status: 90,
  dot: 260,
  faint: 380,
  revive: 400,
  wave: 1200,
  phase: 450,
  item: 250,
  stunned: 350,
  lastStand: 500,
};

let floaterKey = 0;

export function BattleScreen() {
  const { stageId = "" } = useParams();
  const location = useLocation();
  const stage = STAGES[stageId];
  if (!stage) return <Navigate to="/story" replace />;
  // A new navigation (next stage, retry) always starts a fresh fight.
  return <Battle key={location.key} stageId={stageId} />;
}

function Battle({ stageId }: { stageId: string }) {
  const stage = STAGES[stageId];
  const chapter = CHAPTERS[stage.chapter];
  const navigate = useNavigate();
  const team = useGame((s) => s.team);
  const owned = useGame((s) => s.bees);
  const storeItems = useGame((s) => s.items);
  const finishBattle = useGame((s) => s.finishBattle);

  const startItems = useMemo(
    () => Object.fromEntries((Object.keys(storeItems) as ItemId[]).map((k) => [k, Math.min(BATTLE_ITEM_LIMIT, storeItems[k] ?? 0)])) as Record<ItemId, number>,
    // Only the items at the start of the fight matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const initial = useMemo(() => {
    const members = team.filter((t): t is string => !!t).map((id) => ({ id, level: owned[id]?.level ?? 1, rank: owned[id]?.rank ?? 0 }));
    return createBattle(members, stage, startItems, randomSeed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Logical state: always up to date. */
  const [logic, setLogic] = useState<BattleState>(initial);
  const logicRef = useRef(initial);
  /** What is on screen: follows the animation queue. */
  const [view, setView] = useState<BattleState>(initial);
  const viewRef = useRef(view);
  const queue = useRef<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [anim, setAnim] = useState<Record<string, string>>({});
  const [shaking, setShaking] = useState(false);
  const shake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 360);
  };
  const [telegraphed, setTelegraphed] = useState<Set<string>>(new Set());
  const [combo, setCombo] = useState(0);
  const [target, setTarget] = useState<string | undefined>();
  const [itemMode, setItemMode] = useState<ItemId | null>(null);
  const [auto, setAuto] = useState(false);
  const [fast, setFast] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof finishBattle> | null>(null);
  const [confirmFlee, setConfirmFlee] = useState(false);
  const speed = fast ? 0.5 : 1;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  /* ------------------------------------------------------------ music */
  const mood: Mood = useMemo(() => {
    if (view.phase === "won" || view.phase === "lost") return "silent";
    if (view.enemies.some((e) => enemyById(e.ref).boss && e.hp > 0)) return "boss";
    const alive = view.allies.filter((a) => a.hp > 0);
    const ratio = alive.reduce((a, u) => a + u.hp / u.maxHp, 0) / Math.max(1, view.allies.length);
    return ratio < 0.35 ? "danger" : "battle";
  }, [view]);
  useMusic(mood);
  useEffect(() => () => music.setMood("chill"), []);

  /* ------------------------------------------------------------ queue */
  const push = useCallback((step: Step) => {
    logicRef.current = step.after;
    setLogic(step.after);
    queue.current.push(step);
    setBusy(true);
  }, []);

  const float = (uid: string, text: string, color: string, big?: boolean, icon?: IconName) => {
    const key = ++floaterKey;
    setFloaters((f) => [...f, { key, uid, text, color, big, icon }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.key !== key)), 1100);
  };
  const flash = (uid: string, cls: string, ms: number) => {
    setAnim((a) => ({ ...a, [uid]: cls }));
    setTimeout(() => setAnim((a) => (a[uid] === cls ? { ...a, [uid]: "" } : a)), ms);
  };

  useEffect(() => {
    if (!busy) return;
    let cancelled = false;
    const run = async () => {
      while (queue.current.length && !cancelled) {
        const step = queue.current.shift()!;
        let v = structuredClone(viewRef.current);
        for (const ev of step.events) {
          v = applyEvent(v, ev, step.after);
          setView(v);
          viewRef.current = v;
          playEvent(ev, v);
          const d = (BASE_DUR[ev.type] ?? 0) * speedRef.current;
          if (d) await wait(d);
          if (cancelled) return;
        }
        viewRef.current = step.after;
        setView(step.after);
      }
      if (!cancelled) setBusy(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const playEvent = (ev: BattleEvent, v: BattleState) => {
    const unit = (uid: string) => [...v.allies, ...v.enemies].find((u) => u.uid === uid);
    switch (ev.type) {
      case "attack": {
        const src = unit(ev.src);
        const total = ev.hits.reduce((a, h) => a + h.dmg, 0);
        if (!ev.burst) flash(ev.src, src?.side === "ally" ? "dash-up" : "lunge-down", 300);
        setTimeout(() => flash(ev.tgt, "hit", 260), 120 * speedRef.current);
        ev.hits.forEach((h, i) =>
          setTimeout(() => {
            float(ev.tgt, `${h.dmg}${h.crit ? "!" : ""}`, h.crit ? "#FF4F4F" : src?.side === "ally" ? "#FFFFFF" : "#FFB0B0", h.crit);
            sfx(src?.side === "ally" ? (h.crit ? "crit" : "hit") : "enemyHit");
          }, (120 + i * 70) * speedRef.current),
        );
        if (ev.elem > 1) setTimeout(() => float(ev.tgt, "WEAK!", "#FFD23F"), 60);
        if (src?.side === "ally" && !ev.burst) setCombo(ev.combo);
        if (total > (unit(ev.tgt)?.maxHp ?? 1) * 0.3) shake();
        break;
      }
      case "burst": {
        const src = unit(ev.src);
        const sp = src ? beeById(src.ref) : null;
        sfx("burst");
        setBanner({ key: Date.now(), text: ev.name, sub: src?.name, color: sp ? ELEMENTS[sp.element].color : "#FFB627", rarity: sp?.rarity, beeRef: sp?.id });
        flash(ev.src, "burst-glow", 900);
        setTimeout(() => setBanner(null), 1000 * speedRef.current);
        if ((sp?.rarity ?? 0) >= 4) shake();
        break;
      }
      case "bossSkill":
        sfx("telegraph");
        setBanner({ key: Date.now(), text: ev.name, icon: "warning", color: "#B5179E" });
        shake();
        setTelegraphed((t) => {
          const n = new Set(t);
          n.delete(ev.src);
          return n;
        });
        setTimeout(() => setBanner(null), 1000 * speedRef.current);
        break;
      case "telegraph":
        sfx("telegraph");
        setTelegraphed((t) => new Set(t).add(ev.src));
        float(ev.src, "", "#FF4F4F", true, "warning");
        break;
      case "heal":
        if (ev.amount > 0) {
          float(ev.tgt, `+${ev.amount}`, "#5BD38A");
          sfx("heal");
        }
        break;
      case "status":
        float(ev.tgt, "", STATUSES[ev.status].color, false, ev.status);
        break;
      case "dot":
        float(ev.tgt, `${ev.dmg}`, STATUSES[ev.status].color);
        flash(ev.tgt, "hit", 200);
        break;
      case "faint":
        sfx("faint");
        flash(ev.uid, "faint", 600);
        break;
      case "revive":
        sfx("heal");
        float(ev.uid, "", "#FFB627", true, "royalJelly");
        break;
      case "lastStand":
        float(ev.uid, "1 HP!", "#FFB627", true);
        break;
      case "item":
        sfx("item");
        break;
      case "gauge":
        float(ev.tgt, "", "#FFD23F", false, "gauge");
        break;
      case "stunned":
        float(ev.uid, "", "#F2C500", true, "stun");
        break;
      case "wave":
        if (ev.wave > 0) {
          sfx("wave");
          setBanner({ key: Date.now(), text: `WAVE ${ev.wave + 1}/${v.waves.length}`, color: "#FFB627" });
          setTimeout(() => setBanner(null), 1100 * speedRef.current);
        }
        setTarget(undefined);
        setCombo(0);
        break;
      case "phase":
        if (ev.phase === "enemy") {
          setBanner({ key: Date.now(), text: "Enemy turn", color: "#7D6E9A" });
          setTimeout(() => setBanner(null), 420 * speedRef.current);
        }
        setCombo(0);
        break;
      case "end":
        sfx(ev.result === "won" ? "win" : "lose");
        break;
    }
  };

  /* ------------------------------------------------------------ actions */
  const doAction = useCallback(
    (action: PlayerAction) => {
      const r = act(logicRef.current, action);
      if (r.error) return false;
      push({ events: r.events, after: r.state });
      return true;
    },
    [push],
  );

  // End the turn automatically once every bee has acted and the animations caught up.
  useEffect(() => {
    if (busy || result) return;
    if (playerTurnDone(logic)) {
      const t = setTimeout(() => {
        const r = endPlayerTurn(logicRef.current);
        if (!r.error) push({ events: r.events, after: r.state });
      }, 250 * speed);
      return () => clearTimeout(t);
    }
  }, [busy, logic, push, result, speed]);

  // Auto battle.
  useEffect(() => {
    if (!auto || busy || logic.phase !== "player" || result) return;
    const t = setTimeout(() => {
      const { action } = autoStep(logicRef.current);
      if (action === "end") {
        const r = endPlayerTurn(logicRef.current);
        if (!r.error) push({ events: r.events, after: r.state });
      } else doAction(action);
    }, 120 * speed);
    return () => clearTimeout(t);
  }, [auto, busy, logic, doAction, push, result, speed]);

  // Battle over once the last animation has played.
  useEffect(() => {
    if (busy || result) return;
    if (logic.phase === "won" || logic.phase === "lost") {
      const used = Object.fromEntries((Object.keys(startItems) as ItemId[]).map((k) => [k, startItems[k] - (logic.items[k] ?? 0)]));
      const t = setTimeout(() => setResult(finishBattle(stageId, logic.phase === "won", battleStars(logic), used)), 500);
      return () => clearTimeout(t);
    }
  }, [busy, logic, finishBattle, result, stageId, startItems]);

  // Android back button during a fight asks before leaving (once the fight is over it just goes back).
  useEffect(() => {
    const onBack = (e: Event) => {
      if (result) return;
      e.preventDefault();
      setConfirmFlee((c) => !c);
    };
    window.addEventListener(BACK_EVENT, onBack);
    return () => window.removeEventListener(BACK_EVENT, onBack);
  }, [result]);

  const flee = () => {
    const used = Object.fromEntries((Object.keys(startItems) as ItemId[]).map((k) => [k, startItems[k] - (logic.items[k] ?? 0)]));
    finishBattle(stageId, false, 0, used);
    navigate("/story");
  };

  const onBee = (u: Unit, burst: boolean) => {
    if (itemMode) {
      if (doAction({ t: "item", item: itemMode, target: u.uid })) setItemMode(null);
      return;
    }
    if (logic.phase !== "player") return;
    const lu = logic.allies.find((a) => a.uid === u.uid)!;
    if (lu.acted || lu.hp <= 0) return;
    const wantBurst = burst && lu.gauge >= lu.gaugeMax;
    doAction({ t: wantBurst ? "burst" : "attack", uid: u.uid, target });
  };

  const applyItem = (id: ItemId) => {
    if (ITEMS[id].target === "team") doAction({ t: "item", item: id });
    else setItemMode((m) => (m === id ? null : id));
  };

  /* ------------------------------------------------------------ render */
  const aliveEnemies = view.enemies;
  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden text-white"
      style={{ background: `linear-gradient(180deg, ${chapter.scene[0]} 0%, ${chapter.scene[0]} 45%, ${chapter.scene[1]} 100%)` }}
    >
      <Hills ground={chapter.scene[1]} />
      <Petals />
      {/* top bar */}
      <div className="safe-top relative z-20 flex items-center gap-2 px-3 py-2 text-[#3A2410]">
        <button className="btn btn-sm !min-h-0 !px-2.5" onClick={() => setConfirmFlee(true)} aria-label="Leave">
          <X size={18} strokeWidth={3} />
        </button>
        <span className="badge bg-white/80 text-sm num" title="Wave">
          <GameIcon name="waveMark" size={16} /> {view.wave + 1}/{view.waves.length}
        </span>
        <span className="badge bg-white/80 text-sm num" title="Turn"><RotateCw size={14} /> {view.turn}</span>
        <div className="flex-1" />
        <button className={`btn btn-sm !min-h-0 ${fast ? "btn-primary" : ""}`} onClick={() => setFast((f) => !f)}>
          {fast ? <><FastForward size={16} /> 2×</> : <><Play size={16} /> 1×</>}
        </button>
        <button className={`btn btn-sm !min-h-0 ${auto ? "btn-primary" : ""}`} onClick={() => setAuto((a) => !a)}>
          <Bot size={16} /> Auto
        </button>
      </div>

      {/* field */}
      <div className={`relative z-10 flex flex-1 flex-col md:flex-row-reverse ${shaking ? "screen-shake" : ""}`}>
        {/* enemies */}
        <div className="flex flex-1 flex-wrap content-center items-end justify-center gap-x-2 gap-y-1 px-2">
          {aliveEnemies.map((e) => {
            const sp = enemyById(e.ref);
            const dead = e.hp <= 0;
            const tele = telegraphed.has(e.uid);
            const isTarget = target === e.uid || (!target && aliveEnemies.find((x) => x.hp > 0)?.uid === e.uid);
            return (
              <button
                key={e.uid}
                className={`relative flex flex-col items-center transition-opacity ${dead ? "pointer-events-none" : ""}`}
                onClick={() => {
                  setTarget(e.uid);
                  sfx("tap");
                }}
                style={{ opacity: dead && anim[e.uid] !== "faint" ? 0 : 1 }}
              >
                <div className={`relative ${anim[e.uid] ?? ""} ${tele ? "telegraph" : ""}`}>
                  <EnemySprite kind={sp.kind} tint={sp.tint} boss={!!sp.boss} size={sp.boss ? "clamp(120px, 34vw, 230px)" : "clamp(72px, 22vw, 150px)"} />
                  {isTarget && !dead && <span className="target-ring pointer-events-none absolute inset-0" />}
                </div>
                <HpBar unit={e} />
                <StatusRow unit={e} />
                <span className="absolute -top-1 left-0 drop-shadow"><GameIcon name={e.element} size={18} title={ELEMENTS[e.element].name} /></span>
                {floaters
                  .filter((f) => f.uid === e.uid)
                  .map((f, i) => (
                    <FloatNum key={f.key} f={f} index={i} />
                  ))}
              </button>
            );
          })}
        </div>

        {/* bees on the field */}
        <div className="flex flex-1 flex-wrap content-center items-end justify-center gap-x-1 px-2 md:gap-y-3">
          {view.allies.map((a) => {
            const sp = beeById(a.ref);
            const dead = a.hp <= 0;
            return (
              <div key={a.uid} className={`relative ${dead ? "fainted" : ""}`}>
                <div className={anim[a.uid] ?? ""}>
                  <BeeSprite look={sp.look} rarity={sp.rarity} size="clamp(64px, 18vw, 130px)" animated={!dead} />
                </div>
                {floaters
                  .filter((f) => f.uid === a.uid)
                  .map((f, i) => (
                    <FloatNum key={f.key} f={f} index={i} />
                  ))}
              </div>
            );
          })}
        </div>

        {combo >= 1 && (
          <div key={combo} className="pointer-events-none absolute left-3 top-1/2 animate-pop text-3xl font-black italic" style={{ color: "#FFD23F", textShadow: "0 3px 0 #3A2410" }}>
            {combo + 1} COMBO!
          </div>
        )}
        {banner && <BannerView b={banner} />}
      </div>

      {/* party cards */}
      <div className="safe-bottom relative z-20 bg-[#2B2012]/85 px-2 pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-1.5 md:grid-cols-6">
          {view.allies.map((a) => {
            const lu = logic.allies.find((x) => x.uid === a.uid)!;
            return (
              <PartyCard
                key={a.uid}
                unit={a}
                logical={lu}
                canAct={logic.phase === "player" && !lu.acted && lu.hp > 0}
                itemMode={itemMode}
                onTap={(burst) => onBee(a, burst)}
              />
            );
          })}
        </div>
        <div className="mx-auto mt-1.5 flex max-w-4xl gap-1.5 overflow-x-auto pb-1">
          {(Object.keys(ITEMS) as ItemId[]).map((id) => {
            const n = logic.items[id] ?? 0;
            return (
              <button
                key={id}
                disabled={n <= 0 || logic.phase !== "player"}
                onClick={() => applyItem(id)}
                className={`relative flex min-w-[52px] flex-1 items-center justify-center gap-1 rounded-tile border-2 bg-black/30 px-2 py-1 text-xl transition-transform active:scale-90 disabled:opacity-35 ${
                  itemMode === id ? "border-[#FFD23F] bg-[#FFD23F]/30" : "border-white/20"
                }`}
                title={`${ITEMS[id].name}: ${ITEMS[id].desc}`}
              >
                <GameIcon name={id} size={26} />
                <span className="text-xs font-bold num">×{n}</span>
              </button>
            );
          })}
        </div>
        {itemMode && <div className="flex items-center justify-center gap-1.5 pb-1 text-sm font-bold text-[#FFD23F]"><GameIcon name={itemMode} size={18} /> {ITEMS[itemMode].name}: tap a bee</div>}
      </div>

      {confirmFlee && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50" onClick={() => setConfirmFlee(false)}>
          <div className="card p-4 text-center text-text-primary" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-lg font-extrabold">Leave the fight?</div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => setConfirmFlee(false)}>
                Stay
              </button>
              <button className="btn btn-primary" onClick={flee}>
                <Flag size={16} /> Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {result && <BattleResult stageId={stageId} outcome={result} stars={battleStars(logic)} />}
      <BattleStyles />
    </div>
  );
}

/* ------------------------------------------------------------ view model */
function applyEvent(v: BattleState, ev: BattleEvent, after: BattleState): BattleState {
  const find = (uid: string) => [...v.allies, ...v.enemies].find((u) => u.uid === uid);
  switch (ev.type) {
    case "attack": {
      const t = find(ev.tgt);
      if (t) t.hp = Math.max(0, t.hp - ev.hits.reduce((a, h) => a + h.dmg, 0));
      break;
    }
    case "heal": {
      const t = find(ev.tgt);
      if (t) t.hp = Math.min(t.maxHp, t.hp + ev.amount);
      break;
    }
    case "dot": {
      const t = find(ev.tgt);
      if (t) t.hp = Math.max(0, t.hp - ev.dmg);
      break;
    }
    case "faint": {
      const t = find(ev.uid);
      if (t) t.hp = 0;
      break;
    }
    case "lastStand": {
      const t = find(ev.uid);
      if (t) t.hp = 1;
      break;
    }
    case "revive": {
      const t = find(ev.uid);
      const a = after.allies.find((u) => u.uid === ev.uid);
      if (t && a) t.hp = a.hp;
      break;
    }
    case "wave":
      if (ev.wave !== v.wave) {
        v.wave = ev.wave;
        v.enemies = structuredClone(after.enemies.filter((e) => e.uid.startsWith(`e${ev.wave}-`)));
      }
      break;
    case "status": {
      const t = find(ev.tgt);
      if (t && !t.statuses.some((s) => s.id === ev.status)) t.statuses.push({ id: ev.status, turns: 1 });
      break;
    }
    case "cleanse": {
      const t = find(ev.tgt);
      if (t) t.statuses = t.statuses.filter((s) => STATUSES[s.id].good);
      break;
    }
    case "phase":
      v.phase = ev.phase;
      v.turn = after.turn;
      break;
  }
  return v;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------ pieces */
function HpBar({ unit }: { unit: Unit }) {
  const pct = Math.max(0, unit.hp / unit.maxHp);
  const color = pct > 0.5 ? "#5BD38A" : pct > 0.25 ? "#FFB627" : "#FF5A5A";
  return (
    <div className="mt-0.5 h-2 w-16 overflow-hidden rounded-pill border border-black/40 bg-black/40">
      <div className="h-full transition-[width] duration-300" style={{ width: `${pct * 100}%`, background: color }} />
    </div>
  );
}

function StatusRow({ unit }: { unit: Unit }) {
  if (!unit.statuses.length) return null;
  return (
    <div className="mt-0.5 flex gap-0.5 text-xs leading-none">
      {unit.statuses.map((s) => (
        <GameIcon key={s.id} name={s.id} size={14} title={STATUSES[s.id].name} />
      ))}
    </div>
  );
}

function FloatNum({ f, index }: { f: Floater; index: number }) {
  return (
    <span
      className="dmg-float pointer-events-none absolute left-1/2 top-1/4 z-30 whitespace-nowrap font-black"
      style={{
        color: f.color,
        fontSize: f.big ? "1.9rem" : "1.35rem",
        marginLeft: `${((index % 3) - 1) * 18}px`,
        WebkitTextStroke: "1.5px #2A1A08",
        textShadow: "0 3px 0 #2A1A08",
      }}
    >
      {f.icon && <GameIcon name={f.icon} size={f.big ? 34 : 24} />}
      {f.text}
    </span>
  );
}

function PartyCard({
  unit,
  logical,
  canAct,
  itemMode,
  onTap,
}: {
  unit: Unit;
  logical: Unit;
  canAct: boolean;
  itemMode: ItemId | null;
  onTap: (burst: boolean) => void;
}) {
  const sp = beeById(unit.ref);
  const ready = logical.gauge >= logical.gaugeMax && logical.hp > 0;
  const startY = useRef<number | null>(null);
  const dead = unit.hp <= 0;
  const itemTarget = itemMode ? (ITEMS[itemMode].target === "fainted" ? dead : !dead) : false;
  const color = RARITY[sp.rarity].color;

  return (
    <button
      className={`relative flex items-center gap-1 overflow-hidden rounded-tile border-2 p-1 text-left transition-transform active:scale-95 ${
        itemTarget ? "border-[#FFD23F] ring-2 ring-[#FFD23F]" : ready && canAct ? "burst-ready border-[#FFD23F]" : "border-white/25"
      } ${canAct || itemTarget ? "" : "opacity-60"}`}
      style={{ background: `linear-gradient(90deg, ${color}55, #00000055)` }}
      onPointerDown={(e) => {
        startY.current = e.clientY;
      }}
      onPointerUp={(e) => {
        const dy = startY.current === null ? 0 : e.clientY - startY.current;
        startY.current = null;
        // Swipe up = Buzz Burst (Brave Frontier style); tap = normal attack.
        onTap(dy < -25);
      }}
    >
      <span className={`shrink-0 ${dead ? "grayscale" : ""}`}>
        <BeeSprite look={sp.look} rarity={sp.rarity} size={40} animated={false} aura={false} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-xs font-extrabold leading-tight ${ready && canAct ? "pr-14" : ""}`}>{sp.name}</span>
        <span className="mt-0.5 block h-2 overflow-hidden rounded-pill bg-black/50">
          <span className="block h-full transition-[width] duration-300" style={{ width: `${(unit.hp / unit.maxHp) * 100}%`, background: unit.hp / unit.maxHp > 0.25 ? "#5BD38A" : "#FF5A5A" }} />
        </span>
        <span className="mt-0.5 block h-1.5 overflow-hidden rounded-pill bg-black/50">
          <span
            className="block h-full transition-[width] duration-300"
            style={{ width: `${(logical.gauge / logical.gaugeMax) * 100}%`, background: ready ? "linear-gradient(90deg,#FFD23F,#FF6B3D)" : "#4FC3F7" }}
          />
        </span>
        <span className="mt-0.5 flex gap-0.5 text-[10px] leading-none">
          {unit.statuses.map((s) => (
            <GameIcon key={s.id} name={s.id} size={12} />
          ))}
        </span>
      </span>
      {ready && canAct && (
        <span
          role="button"
          aria-label="Burst"
          className="absolute right-0.5 top-0.5 rounded-pill bg-[#FFD23F] px-1 text-[10px] font-black text-[#3A2410]"
          onPointerUp={(e) => {
            e.stopPropagation();
            startY.current = null;
            onTap(true);
          }}
        >
          <ChevronsUp size={12} strokeWidth={3} className="inline" />BURST
        </span>
      )}
      {dead && <span className="absolute inset-0 flex items-center justify-center"><GameIcon name="sleep" size={28} /></span>}
    </button>
  );
}

function BannerView({ b }: { b: Banner }) {
  const bee = b.beeRef ? beeById(b.beeRef) : null;
  const big = (b.rarity ?? 0) >= 5;
  return (
    <div key={b.key} className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle, ${b.color}55, transparent 70%)`, animation: "fade-in .15s ease-out" }} />
      {big && bee && (
        <div className="cutin absolute left-0 right-0 top-1/2 flex h-40 -translate-y-1/2 items-center justify-center" style={{ background: `linear-gradient(90deg, transparent, ${b.color}cc, transparent)` }}>
          <BeeSprite look={bee.look} rarity={bee.rarity} size={180} />
        </div>
      )}
      <div className="relative animate-pop text-center">
        {b.icon && <GameIcon name={b.icon} size={44} className="mb-1" />}
        {b.sub && <div className="text-lg font-extrabold drop-shadow">{b.sub}</div>}
        <div className="text-3xl font-black italic md:text-5xl" style={{ color: "#FFF", WebkitTextStroke: "2px #2A1A08", textShadow: `0 4px 0 #2A1A08, 0 0 20px ${b.color}` }}>
          {b.text}
        </div>
      </div>
    </div>
  );
}

/** Rolling hills and a few flowers so the field feels like a meadow. */
function Hills({ ground }: { ground: string }) {
  const flowers = [6, 18, 31, 47, 58, 72, 86, 94];
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
      <path d="M0 80 Q60 40 130 70 T260 60 T400 70 V200 H0 Z" fill={ground} opacity="0.55" />
      <path d="M0 120 Q90 80 190 110 T400 100 V200 H0 Z" fill={ground} opacity="0.8" />
      <path d="M0 160 Q120 130 240 150 T400 145 V200 H0 Z" fill={ground} />
      {flowers.map((x, i) => (
        <g key={x} transform={`translate(${x * 4} ${150 + (i % 3) * 14})`}>
          <path d="M0 0 V10" stroke="#3E8E41" strokeWidth="1.5" />
          <circle r="3.2" fill={["#FFFFFF", "#FFB7C5", "#FFE066"][i % 3]} />
          <circle r="1.2" fill="#F5B301" />
        </g>
      ))}
    </svg>
  );
}

function Petals() {
  const petals = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ left: (i * 37) % 100, delay: (i * 1.3) % 8, dur: 8 + (i % 4) * 2 })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {petals.map((p, i) => (
        <svg key={i} viewBox="0 0 10 10" width="12" height="12" className="petal absolute -top-4 opacity-70" style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}>
          <path d="M5 0 C9 3 9 7 5 10 C1 7 1 3 5 0 Z" fill="#FFB7C5" />
        </svg>
      ))}
    </div>
  );
}

function BattleStyles() {
  return (
    <style>{`
      @keyframes dash-up { 0%{transform:none} 40%{transform:translate(18px,-40px) scale(1.12)} 100%{transform:none} }
      @keyframes lunge-down { 0%{transform:none} 40%{transform:translate(-14px,36px) scale(1.08)} 100%{transform:none} }
      @keyframes hit { 0%,100%{transform:none; filter:none} 20%{transform:translateX(-6px); filter:brightness(3)} 60%{transform:translateX(5px)} }
      @keyframes faint { 0%{transform:none; opacity:1; filter:none} 100%{transform:scale(.4) translateY(30px); opacity:0; filter:grayscale(1) blur(2px)} }
      @keyframes burst-glow { 0%,100%{filter:none} 50%{filter:drop-shadow(0 0 18px #FFD23F) brightness(1.4)} }
      @keyframes dmg-float { 0%{transform:translate(-50%,0) scale(.6); opacity:0} 15%{transform:translate(-50%,-14px) scale(1.25); opacity:1} 100%{transform:translate(-50%,-70px) scale(1); opacity:0} }
      @keyframes screen-shake { 0%,100%{transform:none} 20%{transform:translate(-6px,3px)} 40%{transform:translate(5px,-4px)} 60%{transform:translate(-4px,2px)} 80%{transform:translate(3px,-2px)} }
      @keyframes ready-pulse { 0%,100%{box-shadow:0 0 0 0 #FFD23F99} 50%{box-shadow:0 0 14px 3px #FFD23FCC} }
      @keyframes target-spin { to { transform: rotate(360deg) } }
      @keyframes telegraph { 0%,100%{filter:drop-shadow(0 0 4px #FF2E63)} 50%{filter:drop-shadow(0 0 16px #FF2E63)} }
      @keyframes petal { 0%{transform:translate(0,0) rotate(0)} 100%{transform:translate(-60px,110vh) rotate(540deg)} }
      @keyframes cutin { 0%{transform:translate(-100%,-50%); opacity:0} 20%{transform:translate(0,-50%); opacity:1} 80%{transform:translate(0,-50%); opacity:1} 100%{transform:translate(100%,-50%); opacity:0} }
      .dash-up{animation:dash-up .3s ease-out}
      .lunge-down{animation:lunge-down .3s ease-out}
      .hit{animation:hit .26s ease-out}
      .faint{animation:faint .6s ease-in forwards}
      .fainted{filter:grayscale(1); opacity:.45; transform:rotate(-20deg) translateY(10px)}
      .burst-glow{animation:burst-glow .9s ease-in-out}
      .dmg-float{animation:dmg-float 1s ease-out forwards}
      .screen-shake{animation:screen-shake .35s ease-in-out}
      .burst-ready{animation:ready-pulse 1s ease-in-out infinite}
      .telegraph{animation:telegraph .8s ease-in-out infinite}
      .target-ring{border:3px dashed #FF4F4F; border-radius:9999px; animation:target-spin 4s linear infinite; margin:12%}
      .petal{animation:petal linear infinite}
      .cutin{animation:cutin .95s ease-in-out forwards}
    `}</style>
  );
}
