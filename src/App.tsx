import { useEffect, useState } from "react";
import { music } from "@/audio/music";
import { GameIcon, type IconName } from "@/art/GameIcon";
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { nextStage } from "@/core/unlocks";
import { activeEvents } from "@/core/events";
import { ArenaScreen } from "@/features/arena/ArenaScreen";
import { BattleScreen } from "@/features/battle/BattleScreen";
import { BeesScreen } from "@/features/bees/BeesScreen";
import { HiveScreen } from "@/features/hive/HiveScreen";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { StoryScreen } from "@/features/story/StoryScreen";
import { SummonScreen } from "@/features/summon/SummonScreen";
import { useGame } from "@/store/game";
import { Cost, Modal, RedDot, ResourceBar } from "@/ui/common";
import type { Resources } from "@/core/types";
import { AppBanner } from "@/features/settings/AppBanner";

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

/** Hives pay every second; time spent away is paid on start (shown once if it is worth it). */
function useHiveIncome() {
  const tick = useGame((s) => s.tick);
  const [away, setAway] = useState<Partial<Resources> | null>(null);
  useEffect(() => {
    const lastTick = useGame.getState().lastTick;
    const paid = tick();
    if (Date.now() - lastTick > 2 * 60000 && Object.values(paid).some((v) => (v ?? 0) > 0)) setAway(paid);
    const id = setInterval(() => tick(), 1000);
    // Coming back to a backgrounded tab or app pays the time away at once.
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tick]);
  return { away, closeAway: () => setAway(null) };
}

function Shell() {
  const [settings, setSettings] = useState(false);
  const { away, closeAway } = useHiveIncome();
  const inBattle = useLocation().pathname.startsWith("/battle");
  useEffect(() => {
    if (!inBattle) music.setMood("chill");
  }, [inBattle]);

  return (
    <div className="flex min-h-full flex-col">
      {!inBattle && <ResourceBar onSettings={() => setSettings(true)} />}
      {!inBattle && <AppBanner />}
      <main className={inBattle ? "flex-1" : "mx-auto w-full max-w-5xl flex-1 px-3 pb-28 pt-3"}>
        <Routes>
          <Route path="/" element={<HiveScreen />} />
          <Route path="/summon" element={<SummonScreen />} />
          <Route path="/bees" element={<BeesScreen />} />
          <Route path="/story" element={<StoryScreen />} />
          <Route path="/arena" element={<ArenaScreen />} />
          <Route path="/battle/:stageId" element={<BattleScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!inBattle && <BottomNav />}
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
      {away && (
        <Modal onClose={closeAway}>
          <div className="flex flex-col items-center gap-3 text-center">
            <GameIcon name="hive" size={56} />
            <div className="text-xl font-extrabold">Your hives kept working!</div>
            <Cost cost={away} className="flex-wrap justify-center text-lg font-bold" plain />
            <button className="btn btn-primary w-full" onClick={closeAway}>
              Collect
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BottomNav() {
  const tickets = useGame((s) => s.resources.ticket);
  const fresh = useGame((s) => s.fresh.length);
  const cleared = useGame((s) => s.cleared);
  const team = useGame((s) => s.team);
  const eventClears = useGame((s) => s.eventClears);
  // A long event nobody has tried yet also lights the Story tab.
  const newEvent = activeEvents().some((e) => e.kind !== "daily" && !Object.keys(eventClears).some((k) => k.startsWith(`ev:${e.id}:`)));
  const storyReady = (!!nextStage(cleared) || newEvent) && team.some(Boolean);

  const tabs: { to: string; icon: IconName; label: string; dot: boolean }[] = [
    { to: "/", icon: "hive", label: "Hive", dot: false },
    { to: "/summon", icon: "summon", label: "Summon", dot: tickets > 0 },
    { to: "/bees", icon: "bees", label: "Bees", dot: fresh > 0 },
    { to: "/story", icon: "story", label: "Story", dot: storyReady },
    { to: "/arena", icon: "arena", label: "Arena", dot: false },
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl justify-around px-2 pt-1.5">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              `relative flex min-w-[60px] flex-col items-center rounded-tile px-2 py-1 text-xs font-bold transition-transform active:scale-90 ${
                isActive ? "bg-accent/15 text-text-primary" : "text-text-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`relative leading-none ${isActive ? "animate-pop" : ""}`}>
                  <GameIcon name={t.icon} size={28} />
                  {t.dot && <RedDot />}
                </span>
                <span className="mt-0.5">{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
