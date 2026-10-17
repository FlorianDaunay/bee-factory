import { useId } from "react";
import { RARITY } from "@/core/data/meta";
import type { BeeLook, Rarity } from "@/core/types";
import { Hat, Held } from "./accessories";

const INK = "#3A2410";

interface Props {
  look: BeeLook;
  rarity: Rarity;
  size?: number | string;
  /** Mirror horizontally (for the other side of the arena). */
  flip?: boolean;
  /** Grey silhouette for bees not yet owned. */
  silhouette?: boolean;
  /** Idle animation (bob + wings). */
  animated?: boolean;
  /** Draw the rarity aura behind the bee. */
  aura?: boolean;
  className?: string;
}

/**
 * The one bee shape every species shares: a round body facing right, face on the right half,
 * stripes on the back, wings on top, a hat at the top of the head and an item in hand.
 * Rarity adds an aura behind (glow → sparkles → motes → flames → rainbow → stars).
 */
export function BeeSprite({ look, rarity, size = 96, flip, silhouette, animated = true, aura = true, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const clip = `body-${uid}`;
  const shade = `shade-${uid}`;
  const sil = silhouette ? "#6B6B7B" : undefined;
  const body = sil ?? look.body;
  const stripe = sil ?? look.stripe;
  const wing = sil ? "#9A9AAA" : (look.wing ?? "#EAF6FF");
  const eyes = look.eyes ?? "round";

  return (
    <svg
      viewBox="0 0 140 140"
      width={size}
      height={size}
      className={`${className ?? ""} overflow-visible`}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      aria-hidden
    >
      <defs>
        <clipPath id={clip}>
          <ellipse cx="62" cy="78" rx="36" ry="32" />
        </clipPath>
        <radialGradient id={shade} cx="0.65" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </radialGradient>
      </defs>

      {aura && !silhouette && <Aura rarity={rarity} uid={uid} />}

      <g className={animated ? "bee-bob" : undefined}>
        {/* shadow */}
        <ellipse cx="62" cy="128" rx="28" ry="5" fill="#000" opacity="0.12" className={animated ? "bee-shadow" : undefined} />

        {/* wings (behind) */}
        <g className={animated ? "bee-wings" : undefined} style={{ transformOrigin: "52px 52px" }}>
          <ellipse cx="38" cy="36" rx="17" ry="24" transform="rotate(-30 38 36)" fill={wing} fillOpacity="0.85" stroke={INK} strokeWidth="2" />
          <ellipse cx="58" cy="30" rx="14" ry="22" transform="rotate(10 58 30)" fill={wing} fillOpacity="0.9" stroke={INK} strokeWidth="2" />
          {!sil && <path d="M34 26 q4 10 2 22 M56 16 q2 10 0 20" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.8" />}
        </g>

        {/* stinger */}
        <path d="M27 82 L14 88 L28 92 Z" fill={sil ?? INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />

        {/* legs */}
        <path d="M50 108 l-3 9 M66 110 l0 9" stroke={sil ?? INK} strokeWidth="4" strokeLinecap="round" />

        {/* body */}
        <ellipse cx="62" cy="78" rx="36" ry="32" fill={body} />
        <g clipPath={`url(#${clip})`}>
          {look.pattern === "spots" ? (
            <>
              <circle cx="40" cy="66" r="7" fill={stripe} />
              <circle cx="46" cy="94" r="6" fill={stripe} />
              <circle cx="32" cy="84" r="4" fill={stripe} />
            </>
          ) : look.pattern === "plain" ? null : (
            <>
              <path d="M30 40 Q22 78 30 116 L40 116 Q32 78 40 40 Z" fill={stripe} />
              <path d="M46 40 Q38 78 46 116 L57 116 Q49 78 57 40 Z" fill={stripe} />
            </>
          )}
          <ellipse cx="62" cy="78" rx="36" ry="32" fill={`url(#${shade})`} />
        </g>
        <ellipse cx="62" cy="78" rx="36" ry="32" fill="none" stroke={INK} strokeWidth="2.5" />

        {/* antennae */}
        <path d="M74 50 Q70 36 64 30 M86 52 Q92 38 98 34" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="64" cy="30" r="4" fill={sil ?? INK} />
        <circle cx="98" cy="34" r="4" fill={sil ?? INK} />

        {/* face */}
        {!silhouette && <Face kind={eyes} />}

        {/* arm + held item */}
        <g transform="translate(100 92)">
          <Held kind={look.held} c={sil ?? look.heldColor} />
          <ellipse cx="0" cy="2" rx="6" ry="5" fill={body} stroke={INK} strokeWidth="2" />
        </g>

        {/* hat, rotated a little to follow the head */}
        <g transform="translate(80 50) rotate(8)">
          <Hat kind={look.hat} c1={sil ?? look.hatColor} c2={sil ?? look.hatColor2} />
        </g>
      </g>
    </svg>
  );
}

function Face({ kind }: { kind: NonNullable<BeeLook["eyes"]> }) {
  const eye = (cx: number, cy: number) => {
    switch (kind) {
      case "happy":
        return <path d={`M${cx - 5} ${cy + 1} Q${cx} ${cy - 6} ${cx + 5} ${cy + 1}`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />;
      case "sleepy":
        return (
          <>
            <path d={`M${cx - 5} ${cy} Q${cx} ${cy + 5} ${cx + 5} ${cy}`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        );
      default:
        return (
          <>
            <ellipse cx={cx} cy={cy} rx="5" ry="6.5" fill={INK} />
            <circle cx={cx + 1.8} cy={cy - 2.5} r="2" fill="#FFFFFF" />
          </>
        );
    }
  };
  return (
    <g className="bee-blink" style={{ transformOrigin: "84px 72px" }}>
      {eye(76, 72)}
      {eye(92, 70)}
      {kind === "fierce" && <path d="M70 62 L81 66 M98 61 L88 64" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
      <ellipse cx="72" cy="83" rx="5" ry="3" fill="#FF8FA3" opacity="0.6" />
      <ellipse cx="96" cy="81" rx="4.5" ry="3" fill="#FF8FA3" opacity="0.6" />
      <path d="M81 82 Q85 87 89 81" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Aura({ rarity, uid }: { rarity: Rarity; uid: string }) {
  if (rarity <= 1) return null;
  const color = RARITY[rarity].color;
  const glow = `glow-${uid}`;
  return (
    <g>
      <defs>
        <radialGradient id={glow}>
          <stop offset="0.35" stopColor={color} stopOpacity={rarity >= 4 ? 0.55 : 0.35} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        {rarity === 6 && (
          <linearGradient id={`rb-${uid}`} x1="0" x2="1" y1="0" y2="1">
            {["#FF4F79", "#FFB627", "#FFE066", "#3DBE6A", "#2F9BFF", "#9B5DE5"].map((c, i) => (
              <stop key={c} offset={i / 5} stopColor={c} />
            ))}
          </linearGradient>
        )}
      </defs>
      <circle cx="66" cy="72" r="64" fill={`url(#${glow})`} className={rarity >= 4 ? "aura-pulse" : undefined} />
      {rarity === 3 && <Sparkles color="#FFFFFF" />}
      {rarity === 4 && (
        <g className="orbit" style={{ transformOrigin: "66px 72px" }}>
          {[0, 120, 240].map((a) => (
            <circle key={a} cx={66 + 58 * Math.cos((a * Math.PI) / 180)} cy={72 + 58 * Math.sin((a * Math.PI) / 180)} r="4" fill={color} />
          ))}
        </g>
      )}
      {rarity === 5 && (
        <g className="flame-halo" style={{ transformOrigin: "66px 72px" }}>
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            const x = 66 + 56 * Math.cos(a);
            const y = 72 + 56 * Math.sin(a);
            return <path key={i} d={`M${x} ${y} q-5 -10 0 -18 q5 8 0 18`} fill={i % 2 ? "#FFB627" : color} opacity="0.85" transform={`rotate(${(a * 180) / Math.PI + 90} ${x} ${y})`} />;
          })}
        </g>
      )}
      {rarity === 6 && (
        <circle cx="66" cy="72" r="60" fill="none" stroke={`url(#rb-${uid})`} strokeWidth="5" strokeDasharray="10 8" className="orbit" style={{ transformOrigin: "66px 72px" }} />
      )}
      {rarity >= 6 && <Sparkles color={rarity === 7 ? "#BFD3FF" : "#FFFFFF"} many />}
    </g>
  );
}

function Sparkles({ color, many }: { color: string; many?: boolean }) {
  const pts = many
    ? [[14, 30], [118, 24], [126, 96], [10, 104], [64, 4], [100, 128]]
    : [[18, 34], [116, 28], [120, 100]];
  return (
    <g>
      {pts.map(([x, y], i) => (
        <path
          key={i}
          d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`}
          fill={color}
          className="twinkle"
          style={{ animationDelay: `${i * 0.37}s`, transformOrigin: `${x}px ${y}px` }}
        />
      ))}
    </g>
  );
}
