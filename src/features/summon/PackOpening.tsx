import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BeeSprite } from "@/art/BeeSprite";
import { ZoneFlag } from "@/art/icons";
import { GameIcon } from "@/art/GameIcon";
import { ELEMENTS, RARITY, ROLES } from "@/core/data/meta";
import type { Pack } from "@/core/gacha";
import type { PullOutcome } from "@/store/game";
import { RarityBadge } from "@/ui/common";
import { sfx } from "@/audio/sfx";

type Phase = "wobble" | "crack" | "reveal";

/**
 * Honeycomb cell wobbles, glowing in the colour of the best bee inside (that's the tension),
 * cracks with a flash, then the bees pop out one by one. Tap anywhere to skip ahead.
 */
export function PackOpening({ pack, outcome, onClose }: { pack: Pack; outcome: PullOutcome; onClose: () => void }) {
  const best = Math.max(...outcome.bees.map((b) => b.rarity)) as keyof typeof RARITY;
  const glow = RARITY[best].color;
  const [phase, setPhase] = useState<Phase>("wobble");
  const [shown, setShown] = useState(0);
  const epic = best >= 5;

  useEffect(() => {
    sfx("wobble");
    const t1 = setTimeout(() => {
      setPhase("crack");
      sfx(epic ? "fanfare" : "pop");
    }, epic ? 1900 : 1300);
    const t2 = setTimeout(() => setPhase("reveal"), epic ? 2500 : 1650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [epic]);

  useEffect(() => {
    if (phase !== "reveal" || shown >= outcome.bees.length) return;
    const t = setTimeout(() => {
      setShown((n) => n + 1);
      sfx(outcome.bees[shown].rarity >= 4 ? "sparkle" : "tick");
    }, shown === 0 ? 50 : 160);
    return () => clearTimeout(t);
  }, [phase, shown, outcome.bees]);

  const skip = () => {
    if (phase !== "reveal") setPhase("reveal");
    else if (shown < outcome.bees.length) setShown(outcome.bees.length);
  };

  const single = outcome.bees.length === 1;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden animate-fade" style={{ background: "radial-gradient(circle at 50% 45%, #3a2a12, #120b04 75%)" }} onClick={skip}>
      {/* light rays */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[200vmax] w-[200vmax] -translate-x-1/2 -translate-y-1/2 opacity-40"
        style={{ background: `repeating-conic-gradient(from 0deg, ${glow}55 0deg 8deg, transparent 8deg 22deg)`, animation: "spin 18s linear infinite" }}
      />

      {phase !== "reveal" && (
        <div className={phase === "wobble" ? "pack-wobble" : "pack-crack"} style={{ filter: `drop-shadow(0 0 ${phase === "crack" ? 60 : 24}px ${glow})` }}>
          <svg viewBox="0 0 120 120" width="200" height="200">
            <path d="M60 6 L108 33 V87 L60 114 L12 87 V33 Z" fill="#F5B301" stroke="#3A2410" strokeWidth="5" strokeLinejoin="round" />
            <path d="M60 22 L94 41 V79 L60 98 L26 79 V41 Z" fill={glow} opacity="0.85" />
            <path d="M40 40 Q50 30 62 34" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
            {phase === "crack" && <path d="M60 22 L54 48 L66 58 L56 80 L62 98" stroke="#fff" strokeWidth="5" fill="none" />}
          </svg>
          <div className="mt-2 flex justify-center gap-1">
            {pack.zones.slice(0, 4).map((z) => (
              <ZoneFlag key={z} zone={z} size={22} />
            ))}
          </div>
        </div>
      )}
      {phase === "crack" && <div className="pointer-events-none absolute inset-0 bg-white" style={{ animation: "fade-in 0.15s reverse forwards" }} />}

      {phase === "reveal" && single && (
        <div className="relative flex flex-col items-center text-center text-white">
          <div className="animate-pop">
            <BeeSprite look={outcome.bees[0].look} rarity={outcome.bees[0].rarity} size={240} />
          </div>
          {outcome.firsts.includes(outcome.bees[0].id) && <span className="badge mt-1 animate-pop bg-danger text-white">NEW!</span>}
          <div className="mt-2 text-3xl font-extrabold" style={{ textShadow: `0 0 16px ${glow}` }}>
            {outcome.bees[0].name}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <RarityBadge rarity={outcome.bees[0].rarity} />
            <ZoneFlag zone={outcome.bees[0].zone} size={22} />
            <GameIcon name={outcome.bees[0].element} size={24} title={ELEMENTS[outcome.bees[0].element].name} />
            <GameIcon name={outcome.bees[0].role} size={24} title={ROLES[outcome.bees[0].role].name} />
          </div>
        </div>
      )}

      {phase === "reveal" && !single && (
        <div className="relative grid max-w-2xl grid-cols-5 gap-2 px-3 text-white">
          {outcome.bees.slice(0, shown).map((b, i) => (
            <div key={i} className="animate-pop flex flex-col items-center rounded-tile p-1" style={{ background: `radial-gradient(circle, ${RARITY[b.rarity].color}66, transparent 70%)` }}>
              <BeeSprite look={b.look} rarity={b.rarity} size={72} animated={b.rarity >= 4} />
              <span className="max-w-full truncate text-xs font-bold">{b.name}</span>
              <RarityBadge rarity={b.rarity} />
              {outcome.firsts.includes(b.id) && outcome.bees.findIndex((x) => x.id === b.id) === i && <span className="badge mt-0.5 bg-danger text-[10px] text-white">NEW</span>}
            </div>
          ))}
        </div>
      )}

      {phase === "reveal" && shown >= outcome.bees.length && (
        <button
          className="btn btn-primary relative mt-6 animate-pop px-10 text-lg"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          OK
        </button>
      )}
      <style>{`
        @keyframes pack-wobble { 0%,100%{transform:rotate(0) scale(1)} 20%{transform:rotate(-8deg) scale(1.03)} 40%{transform:rotate(7deg)} 60%{transform:rotate(-5deg) scale(1.06)} 80%{transform:rotate(4deg)} }
        @keyframes pack-crack { 0%{transform:scale(1.1)} 100%{transform:scale(1.6); opacity:0} }
        .pack-wobble{animation:pack-wobble .55s ease-in-out infinite}
        .pack-crack{animation:pack-crack .35s ease-in forwards}
      `}</style>
    </div>,
    document.body,
  );
}
