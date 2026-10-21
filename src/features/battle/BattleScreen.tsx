import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Flag } from "lucide-react";
import { BeeSprite } from "@/art/BeeSprite";
import { GameIcon, type IconName } from "@/art/GameIcon";
import { music, useMusic, type Mood } from "@/audio/music";
import { sfx } from "@/audio/sfx";
import { autoStep } from "@/core/battle/autoplay";
import { act, battleStars, createBattle, endPlayerTurn, playerTurnDone, starChecks } from "@/core/battle/engine";
import type { BattleEvent, BattleState, PlayerAction, Unit } from "@/core/battle/types";
import { beeById } from "@/core/data/bees";
import { enemyById } from "@/core/data/enemies";
import { ELEMENTS, ITEMS, STATUSES } from "@/core/data/meta";
import { CHAPTERS, type Stage } from "@/core/data/story";
import { BATTLE_ITEM_LIMIT } from "@/core/kitchen";
import { randomSeed } from "@/core/rng";
import type { ItemId } from "@/core/types";
import { BACK_EVENT } from "@/native";
import { findStage, useGame } from "@/store/game";
import { useSettings } from "@/store/settings";
import { BattleResult } from "./BattleResult";
import {
  BattleStyles,
  BossAmbience,
  BossSkillBanner,
  BurstCutIn,
  FX_DURATION,
  FxView,
  Hills,
  Petals,
  TransitionView,
  type Fx,
  type FxKind,
  type Transition,
} from "./BattleFx";
import { BossBar, ComboMeter, EnemyView, FloatNum, ItemBar, PartyCard, TipBubble, TopBar, TurnStrip, type Floater } from "./BattleHud";

/** One engine call and the events it produced; enemy steps lock the controls while they play. */
interface Step {
  events: BattleEvent[];
  after: BattleState;
  kind: "player" | "enemy";
}

/** How long the queue waits after each event (ms, at 1× speed). */
const BASE_DUR: Partial<Record<BattleEvent["type"], number>> = {
  attack: 380,
  telegraph: 700,
  heal: 220,
  status: 90,
  dot: 260,
  faint: 380,
  revive: 400,
  item: 250,
  stunned: 400,
  lastStand: 500,
};

const TRANSITION_MS = { turn: 750, wave: 1000, boss: 1900, fight: 900 } as const;

let uiKey = 0;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function BattleScreen() {
  const { stageId = "" } = useParams();
  const location = useLocation();
  // Built once per visit: an event stage keeps its enemies even if progress changes mid-fight.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stage = useMemo(() => findStage(stageId, useGame.getState()), [stageId, location.key]);
  const hasTeam = useGame((s) => s.team.some(Boolean));
  if (!stage) return <Navigate to="/story" replace />;
  // An empty team (e.g. a freshly made preset) cannot fight: pick bees first.
  if (!hasTeam) return <Navigate to="/bees" replace />;
  // A new navigation (next stage, retry) always starts a fresh fight.
  return <Battle key={location.key} stageId={stageId} stage={stage} />;
}

function Battle({ stageId, stage }: { stageId: string; stage: Stage }) {
  const scene = stage.event?.scene ?? CHAPTERS[stage.chapter].scene;
  const navigate = useNavigate();
  const team = useGame((s) => s.team);
  const owned = useGame((s) => s.bees);
  const storeItems = useGame((s) => s.items);
  const finishBattle = useGame((s) => s.finishBattle);
  const tipsSeen = useSettings((s) => s.tipsSeen);
  const seeTip = useSettings((s) => s.seeTip);

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
  const [pendingEnemy, setPendingEnemy] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [burstShow, setBurstShow] = useState<{ beeRef: string; name: string; color: string } | null>(null);
  const [bossSkill, setBossSkill] = useState<string | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);
  const [anim, setAnim] = useState<Record<string, string>>({});
  const [shaking, setShaking] = useState(false);
  const [tint, setTint] = useState<{ key: number; color: string } | null>(null);
  const [telegraphed, setTelegraphed] = useState<Set<string>>(new Set());
  const [combo, setCombo] = useState({ count: 0, tick: 0 });
  const [target, setTarget] = useState<string | undefined>();
  const [itemMode, setItemMode] = useState<ItemId | null>(null);
  // Auto and speed are remembered between fights (next stage, retry, next session).
  const auto = useSettings((s) => s.battleAuto);
  const fast = useSettings((s) => s.battleFast);
  const setSettings = useSettings((s) => s.set);
  const [result, setResult] = useState<ReturnType<typeof finishBattle> | null>(null);
  const [confirmFlee, setConfirmFlee] = useState(false);
  const speed = fast ? 0.5 : 1;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  /** Fast or auto play keeps the essential effects only (one number per attack, no shake), so phones keep up. */
  const lite = fast || auto;
  const liteRef = useRef(lite);
  liteRef.current = lite;

  const fieldRef = useRef<HTMLDivElement>(null);
  const unitEls = useRef<Record<string, HTMLDivElement | null>>({});

  /* ------------------------------------------------------------ derived */
  const bossUnit = view.enemies.find((e) => enemyById(e.ref).boss && e.hp > 0);
  const locked = !introDone || !!transition || !!burstShow || pendingEnemy > 0 || logic.wave !== view.wave || logic.phase !== "player";
  const side: "player" | "enemy" | "wait" = !locked ? "player" : view.phase === "enemy" || pendingEnemy > 0 ? "enemy" : "wait";

  /* ------------------------------------------------------------ music */
  const mood: Mood = useMemo(() => {
    if (view.phase === "won" || view.phase === "lost") return "silent";
    if (bossUnit) return "boss";
    const alive = view.allies.filter((a) => a.hp > 0);
    const ratio = alive.reduce((a, u) => a + u.hp / u.maxHp, 0) / Math.max(1, view.allies.length);
    return ratio < 0.35 ? "danger" : "battle";
  }, [view, bossUnit]);
  useMusic(mood);
  useEffect(() => () => music.setMood("chill"), []);

  /* ------------------------------------------------------------ visual helpers */
  const float = (uid: string, text: string, color: string, big?: boolean, icon?: IconName) => {
    const key = ++uiKey;
    setFloaters((f) => [...f, { key, uid, text, color, big, icon }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.key !== key)), 1100);
  };
  const flash = (uid: string, cls: string, ms: number) => {
    setAnim((a) => ({ ...a, [uid]: cls }));
    setTimeout(() => setAnim((a) => (a[uid] === cls ? { ...a, [uid]: "" } : a)), ms);
  };
  const shake = () => {
    if (liteRef.current) return;
    setShaking(true);
    setTimeout(() => setShaking(false), 360);
  };
  /** Centre of a unit's sprite, relative to the battlefield. */
  const posOf = (uid: string) => {
    const el = unitEls.current[uid];
    const field = fieldRef.current;
    if (!el || !field) return null;
    const a = el.getBoundingClientRect();
    const f = field.getBoundingClientRect();
    return { x: a.left + a.width / 2 - f.left, y: a.top + a.height / 2 - f.top };
  };
  const spawnFx = (kind: FxKind, uid: string, color = "#FFFFFF", delay = 0) => {
    setTimeout(() => {
      const p = posOf(uid);
      if (!p) return;
      const key = ++uiKey;
      setFx((list) => [...list, { key, kind, x: p.x, y: p.y, color }]);
      setTimeout(() => setFx((list) => list.filter((x) => x.key !== key)), FX_DURATION[kind] + 50);
    }, delay);
  };
  const runTransition = async (t: Transition, ms: number) => {
    setTransition(t);
    if (t.kind === "turn") sfx(t.side === "player" ? "wave" : "telegraph");
    if (t.kind === "boss") sfx("telegraph");
    await wait(ms * speedRef.current);
    setTransition(null);
  };

  /* ------------------------------------------------------------ intro */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await wait(250);
      if (cancelled) return;
      await runTransition({ key: ++uiKey, kind: "fight" }, TRANSITION_MS.fight);
      if (initial.waves.length > 1) await runTransition({ key: ++uiKey, kind: "wave", wave: 0, total: initial.waves.length }, TRANSITION_MS.wave);
      const boss = initial.enemies.find((e) => enemyById(e.ref).boss);
      if (boss) await runTransition({ key: ++uiKey, kind: "boss", ref: boss.ref }, TRANSITION_MS.boss);
      await runTransition({ key: ++uiKey, kind: "turn", side: "player" }, TRANSITION_MS.turn);
      if (!cancelled) setIntroDone(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------ queue */
  const push = useCallback((step: Step) => {
    logicRef.current = step.after;
    setLogic(step.after);
    queue.current.push(step);
    if (step.kind === "enemy") setPendingEnemy((n) => n + 1);
    setBusy(true);
  }, []);

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
          await playEvent(ev, v);
          if (cancelled) return;
        }
        viewRef.current = step.after;
        setView(step.after);
        if (step.kind === "enemy") setPendingEnemy((n) => Math.max(0, n - 1));
      }
      if (!cancelled) setBusy(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  /** Plays one event's visuals and resolves when the next one may start. */
  const playEvent = async (ev: BattleEvent, v: BattleState) => {
    const sp = speedRef.current;
    const unit = (uid: string) => [...v.allies, ...v.enemies].find((u) => u.uid === uid);
    switch (ev.type) {
      case "attack": {
        const src = unit(ev.src);
        const tgt = unit(ev.tgt);
        const ally = src?.side === "ally";
        const total = ev.hits.reduce((a, h) => a + h.dmg, 0);
        const anyCrit = ev.hits.some((h) => h.crit);
        if (!ev.burst) flash(ev.src, ally ? "dash-up" : "lunge-down", 300);
        setTimeout(() => flash(ev.tgt, "hit", 260), 120 * sp);
        const lite = liteRef.current;
        if (ev.burst && src) {
          spawnFx(src.element, ev.tgt, ELEMENTS[src.element].color, 60 * sp);
          if (!lite) setTint({ key: ++uiKey, color: ELEMENTS[src.element].color });
        }
        else if (!lite || anyCrit) spawnFx(ally ? (anyCrit ? "crit" : "hit") : "slash", ev.tgt, "#FFFFFF", 120 * sp);
        if (lite) {
          // One number for the whole attack instead of one per hit.
          setTimeout(() => {
            float(ev.tgt, `${total}${anyCrit ? "!" : ""}`, anyCrit ? "#FF4F4F" : ally ? "#FFFFFF" : "#FFB0B0", anyCrit);
            sfx(ally ? (anyCrit ? "crit" : "hit") : "enemyHit");
          }, 140 * sp);
        } else
          ev.hits.forEach((h, i) =>
            setTimeout(() => {
              float(ev.tgt, `${h.dmg}${h.crit ? "!" : ""}`, h.crit ? "#FF4F4F" : ally ? "#FFFFFF" : "#FFB0B0", h.crit);
              sfx(ally ? (h.crit ? "crit" : "hit") : "enemyHit");
            }, (140 + i * 70) * sp),
          );
        if (ev.elem > 1) setTimeout(() => float(ev.tgt, "WEAK!", "#FFD23F", true), 60);
        if (ally && !ev.burst) setCombo((c) => ({ count: ev.combo, tick: c.tick + 1 }));
        if (tgt && total > tgt.maxHp * 0.3) shake();
        await wait((ev.burst ? 560 : BASE_DUR.attack!) * sp);
        return;
      }
      case "burst": {
        const src = unit(ev.src);
        const bee = src ? beeById(src.ref) : null;
        const color = bee ? ELEMENTS[bee.element].color : "#FFB627";
        // 1. charge-up on the bee, 2. cut-in with the move's name, 3. the hits follow as their own events.
        sfx("burst");
        flash(ev.src, "burst-charge", 700);
        spawnFx("charge", ev.src, color);
        await wait(450 * sp);
        if (bee) setBurstShow({ beeRef: bee.id, name: ev.name, color });
        if ((bee?.rarity ?? 0) >= 4) shake();
        await wait((bee && bee.rarity >= 5 ? 1150 : 900) * sp);
        setBurstShow(null);
        return;
      }
      case "bossSkill":
        sfx("telegraph");
        setBossSkill(ev.name);
        shake();
        setTelegraphed((t) => {
          const n = new Set(t);
          n.delete(ev.src);
          return n;
        });
        await wait(1100 * sp);
        setBossSkill(null);
        return;
      case "telegraph":
        sfx("telegraph");
        setTelegraphed((t) => new Set(t).add(ev.src));
        float(ev.src, "", "#FF4F4F", true, "warning");
        break;
      case "heal":
        if (ev.amount > 0) {
          float(ev.tgt, `+${ev.amount}`, "#5BD38A");
          spawnFx("heal", ev.tgt);
          sfx("heal");
        }
        break;
      case "status": {
        float(ev.tgt, "", STATUSES[ev.status].color, false, ev.status);
        if (STATUSES[ev.status].good && !liteRef.current) spawnFx("buff", ev.tgt, STATUSES[ev.status].color);
        break;
      }
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
        spawnFx("light", ev.uid, "#FFD23F");
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
        if (!liteRef.current) spawnFx("buff", ev.tgt, "#4FC3F7");
        break;
      case "stunned":
        float(ev.uid, "", "#F2C500", true, "stun");
        break;
      case "wave": {
        setTarget(undefined);
        setCombo((c) => ({ count: 0, tick: c.tick }));
        if (ev.wave === 0) return;
        await wait(350 * sp);
        await runTransition({ key: ++uiKey, kind: "wave", wave: ev.wave, total: v.waves.length }, TRANSITION_MS.wave);
        const boss = v.enemies.find((e) => enemyById(e.ref).boss);
        if (boss) await runTransition({ key: ++uiKey, kind: "boss", ref: boss.ref }, TRANSITION_MS.boss);
        await runTransition({ key: ++uiKey, kind: "turn", side: "player" }, TRANSITION_MS.turn);
        return;
      }
      case "phase":
        setCombo((c) => ({ count: 0, tick: c.tick }));
        // Turn banners are shorter in fast/auto play.
        if (ev.phase === "enemy" || ev.phase === "player") await runTransition({ key: ++uiKey, kind: "turn", side: ev.phase }, TRANSITION_MS.turn * (liteRef.current ? 0.5 : 1));
        return;
      case "end":
        sfx(ev.result === "won" ? "win" : "lose");
        break;
    }
    const d = (BASE_DUR[ev.type] ?? 0) * sp;
    if (d) await wait(d);
  };

  /* ------------------------------------------------------------ actions */
  const doAction = useCallback(
    (action: PlayerAction) => {
      const r = act(logicRef.current, action);
      if (r.error) return false;
      push({ events: r.events, after: r.state, kind: "player" });
      return true;
    },
    [push],
  );

  const endTurn = useCallback(() => {
    const r = endPlayerTurn(logicRef.current);
    if (!r.error) push({ events: r.events, after: r.state, kind: "enemy" });
  }, [push]);

  // End the turn automatically once every bee has acted and the animations caught up.
  useEffect(() => {
    if (busy || result || !introDone || pendingEnemy > 0) return;
    if (playerTurnDone(logic)) {
      const t = setTimeout(endTurn, 350 * speed);
      return () => clearTimeout(t);
    }
  }, [busy, logic, endTurn, result, speed, introDone, pendingEnemy]);

  // Auto battle.
  useEffect(() => {
    if (!auto || busy || locked || result) return;
    const t = setTimeout(() => {
      const { action } = autoStep(logicRef.current);
      if (action === "end") endTurn();
      else doAction(action);
    }, 150 * speed);
    return () => clearTimeout(t);
  }, [auto, busy, locked, logic, doAction, endTurn, result, speed]);

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

  const onBee = (index: number, burst: boolean) => {
    const lu = logic.allies[index];
    if (!lu) return;
    if (itemMode) {
      if (doAction({ t: "item", item: itemMode, target: lu.uid })) setItemMode(null);
      return;
    }
    if (locked || lu.acted || lu.hp <= 0) return;
    const wantBurst = burst && lu.gauge >= lu.gaugeMax;
    doAction({ t: wantBurst ? "burst" : "attack", uid: lu.uid, target });
  };

  const applyItem = (id: ItemId) => {
    if (locked) return;
    if (ITEMS[id].target === "team") doAction({ t: "item", item: id });
    else setItemMode((m) => (m === id ? null : id));
  };

  // PC controls: 1-6 attack, Shift+1-6 Burst, E end turn, Esc cancel item.
  const keyRef = useRef({ onBee, endTurn, locked, side, pendingEnemy });
  keyRef.current = { onBee, endTurn, locked, side, pendingEnemy };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keyRef.current;
      const digit = /^Digit([1-6])$/.exec(e.code);
      if (digit) {
        e.preventDefault();
        k.onBee(Number(digit[1]) - 1, e.shiftKey);
      } else if (e.code === "KeyE" && !k.locked && k.pendingEnemy === 0) k.endTurn();
      else if (e.code === "Escape") setItemMode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ------------------------------------------------------------ tips */
  const tip = (() => {
    if (!introDone || result || transition) return null;
    if (!tipsSeen.includes("battle-basics"))
      return { id: "battle-basics", text: "Tap a bee card to attack (keys 1-6 on PC). Tap an enemy to pick the target. Hit the same enemy several times in a turn for a combo!" };
    if (side === "player" && logic.allies.some((a) => a.hp > 0 && !a.acted && a.gauge >= a.gaugeMax) && !tipsSeen.includes("battle-burst"))
      return { id: "battle-burst", text: "A gauge is full! Press BURST under that bee (or swipe its card up, Shift+number on PC) for its special move." };
    if (bossUnit && !tipsSeen.includes("battle-boss"))
      return { id: "battle-boss", text: "Bosses warn you before their big attack: watch the bar at the top and heal or guard in time." };
    return null;
  })();

  /* ------------------------------------------------------------ render */
  const firstAlive = view.enemies.find((x) => x.hp > 0)?.uid;
  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden text-white"
      style={{ background: `linear-gradient(180deg, ${scene[0]} 0%, ${scene[0]} 45%, ${scene[1]} 100%)` }}
    >
      <BossAmbience on={!!bossUnit} lite={lite} />
      <Hills ground={scene[1]} dark={!!bossUnit} />
      <Petals ash={!!bossUnit} lite={lite} />

      <TopBar
        wave={view.wave}
        total={view.waves.length}
        turn={view.turn}
        stageId={stageId}
        fast={fast}
        auto={auto}
        onFast={() => setSettings({ battleFast: !fast })}
        onAuto={() => setSettings({ battleAuto: !auto })}
        onLeave={() => setConfirmFlee(true)}
      />
      {bossUnit && <BossBar boss={bossUnit} telegraphed={telegraphed.has(bossUnit.uid)} />}

      {/* field */}
      <div ref={fieldRef} className={`relative z-10 flex min-h-0 flex-1 flex-col md:flex-row-reverse ${shaking ? "screen-shake" : ""}`}>
        <div className="flex min-h-0 flex-1 flex-wrap content-center items-end justify-center gap-x-3 gap-y-1 px-2 md:gap-x-6">
          {view.enemies.map((e) => (
            <EnemyView
              key={e.uid}
              unit={e}
              isTarget={(target ?? firstAlive) === e.uid}
              anim={anim[e.uid] ?? ""}
              telegraphed={telegraphed.has(e.uid)}
              floaters={floaters.filter((f) => f.uid === e.uid)}
              spriteRef={(el) => {
                unitEls.current[e.uid] = el;
              }}
              onTarget={() => {
                setTarget(e.uid);
                sfx("tap");
              }}
            />
          ))}
        </div>

        <div className="mx-auto grid min-h-0 flex-1 grid-cols-3 content-center items-end justify-items-center gap-x-2 px-2 md:flex md:flex-wrap md:justify-center md:gap-x-3 md:gap-y-4">
          {view.allies.map((a) => {
            const sp = beeById(a.ref);
            const dead = a.hp <= 0;
            return (
              <div key={a.uid} className={`relative ${dead ? "fainted" : ""}`}>
                <div
                  ref={(el) => {
                    unitEls.current[a.uid] = el;
                  }}
                  className={anim[a.uid] ?? ""}
                >
                  <BeeSprite look={sp.look} rarity={sp.rarity} size="clamp(44px, min(18vw, 10dvh), 140px)" animated={!dead && !lite} />
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

        {tint && <div key={tint.key} className="screen-tint" style={{ background: tint.color }} />}
        {fx.map((f) => (
          <FxView key={f.key} fx={f} />
        ))}
        <ComboMeter count={combo.count} tick={combo.tick} />
        {burstShow && <BurstCutIn {...burstShow} />}
        {bossSkill && <BossSkillBanner name={bossSkill} />}
      </div>

      {/* HUD */}
      <div className="safe-bottom relative z-20 shrink-0 bg-[#2B2012]/95 px-2 pt-2 md:px-6 md:pt-3">
        {tip && (
          <TipBubble onClose={() => seeTip(tip.id)}>{tip.text}</TipBubble>
        )}
        <TurnStrip side={side} allies={logic.allies} canEnd={side === "player" && pendingEnemy === 0} onEnd={endTurn} />
        <div className="mx-auto mt-1.5 grid max-w-6xl grid-cols-3 gap-1.5 md:mt-2 md:gap-2 xl:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ "--n": Math.max(3, view.allies.length) } as CSSProperties}>
          {view.allies.map((a, i) => (
            <PartyCard
              key={a.uid}
              index={i}
              unit={a}
              logical={logic.allies[i]}
              canAct={logic.phase === "player" && !logic.allies[i].acted && logic.allies[i].hp > 0}
              locked={locked}
              itemMode={itemMode}
              onAttack={() => onBee(i, false)}
              onBurst={() => onBee(i, true)}
            />
          ))}
        </div>
        <ItemBar items={logic.items} itemMode={itemMode} disabled={locked} onUse={applyItem} />
        {itemMode && (
          <div className="flex items-center justify-center gap-1.5 pb-1 text-sm font-bold text-[#FFD23F] md:text-base">
            <GameIcon name={itemMode} size={18} /> {ITEMS[itemMode].name}: tap a bee (Esc to cancel)
          </div>
        )}
      </div>

      {transition && <TransitionView t={transition} />}

      {confirmFlee && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmFlee(false)}>
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

      {result && <BattleResult stageId={stageId} stage={stage} outcome={result} stars={battleStars(logic)} checks={starChecks(logic)} />}
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
      const a = after.allies.find((u: Unit) => u.uid === ev.uid);
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
