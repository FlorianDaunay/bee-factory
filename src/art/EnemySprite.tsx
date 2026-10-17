import type { EnemyKind } from "@/core/types";

const INK = "#2A2233";
const EYE = "#C77DFF";

interface Props {
  kind: EnemyKind;
  tint: string;
  boss?: boolean;
  size?: number | string;
  animated?: boolean;
}

/** Wilted insects: greyish tint, glowing violet eyes. Drawn facing left (towards the bees). */
export function EnemySprite({ kind, tint, boss, size = 96, animated = true }: Props) {
  const dark = shadeHex(tint, -0.35);
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} className="overflow-visible" aria-hidden>
      <g className={animated ? "enemy-bob" : undefined}>
        <ellipse cx="70" cy="128" rx="30" ry="5" fill="#000" opacity="0.15" />
        {/* wilt fog */}
        <circle cx="70" cy="76" r="54" fill="#7D6E9A" opacity="0.12" className={animated ? "aura-pulse" : undefined} />
        {BODY[kind](tint, dark, animated)}
        {boss && (
          <g transform="translate(70 26)" stroke={INK} strokeWidth="2" strokeLinejoin="round">
            <path d="M-18 6 L-20 -12 L-10 -3 L0 -18 L10 -3 L20 -12 L18 6 Z" fill="#6E5A8C" />
            <circle cx="0" cy="-1" r="3.5" fill={EYE} className="eye-glow" />
          </g>
        )}
      </g>
    </svg>
  );
}

const eyes = (x1: number, y1: number, x2: number, y2: number, r = 5) => (
  <g>
    <ellipse cx={x1} cy={y1} rx={r} ry={r * 0.8} fill={EYE} className="eye-glow" />
    <ellipse cx={x2} cy={y2} rx={r} ry={r * 0.8} fill={EYE} className="eye-glow" />
    <path d={`M${x1 - 7} ${y1 - 7} L${x1 + 5} ${y1 - 3} M${x2 + 7} ${y2 - 7} L${x2 - 5} ${y2 - 3}`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
  </g>
);

const wings = (cx: number, cy: number, animated: boolean, big = 1) => (
  <g className={animated ? "bee-wings" : undefined} style={{ transformOrigin: `${cx}px ${cy + 16}px` }}>
    <ellipse cx={cx} cy={cy} rx={12 * big} ry={24 * big} transform={`rotate(25 ${cx} ${cy})`} fill="#D9D2E9" fillOpacity="0.7" stroke={INK} strokeWidth="2" />
    <ellipse cx={cx + 14} cy={cy + 4} rx={10 * big} ry={20 * big} transform={`rotate(45 ${cx + 14} ${cy + 4})`} fill="#D9D2E9" fillOpacity="0.6" stroke={INK} strokeWidth="2" />
  </g>
);

const BODY: Record<EnemyKind, (tint: string, dark: string, animated: boolean) => JSX.Element> = {
  wasp: (t, d, a) => (
    <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
      {wings(82, 42, a)}
      <ellipse cx="92" cy="84" rx="26" ry="18" fill={t} />
      <path d="M80 68 v32 M94 66 v36 M106 70 v28" stroke={d} strokeWidth="6" />
      <path d="M117 84 L132 88 L117 92 Z" fill={INK} />
      <ellipse cx="66" cy="78" rx="8" ry="7" fill={d} />
      <circle cx="46" cy="70" r="20" fill={t} />
      {eyes(38, 68, 52, 66)}
      <path d="M30 84 l-6 6 M38 88 l-4 8" />
      <path d="M44 52 Q40 38 32 34 M54 52 Q58 38 64 34" fill="none" />
    </g>
  ),
  hornet: (t, d, a) => (
    <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
      {wings(84, 38, a, 1.2)}
      <ellipse cx="94" cy="84" rx="30" ry="22" fill={t} />
      <path d="M78 64 v40 M94 62 v44 M110 66 v36" stroke={d} strokeWidth="8" />
      <path d="M122 84 L138 90 L122 96 Z" fill={INK} />
      <circle cx="46" cy="72" r="23" fill={d} />
      <circle cx="46" cy="72" r="18" fill={t} />
      {eyes(37, 70, 53, 67, 6)}
      <path d="M28 88 q-8 4 -6 12 q4 -6 10 -6 M42 92 q-2 8 4 12 q0 -8 4 -10" fill={d} />
    </g>
  ),
  ant: (t, d) => (
    <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
      <path d="M60 92 l-10 26 M78 92 l0 28 M96 92 l12 26" fill="none" strokeWidth="4" />
      <ellipse cx="104" cy="82" rx="22" ry="18" fill={d} />
      <circle cx="74" cy="84" r="11" fill={t} />
      <circle cx="46" cy="72" r="19" fill={t} />
      {eyes(38, 70, 52, 68)}
      <path d="M40 54 Q32 36 22 34 M52 54 Q58 36 68 32" fill="none" />
      <path d="M30 84 q-6 2 -8 8 M36 88 q-2 6 2 10" fill="none" />
    </g>
  ),
  beetle: (t, d) => (
    <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
      <path d="M62 104 l-8 16 M84 108 l0 14 M104 104 l10 14" fill="none" strokeWidth="4" />
      <path d="M50 96 Q50 46 88 46 Q126 46 126 96 Z" fill={t} />
      <path d="M88 48 V96" />
      <path d="M60 70 Q88 56 116 70" fill="none" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="4" />
      <ellipse cx="40" cy="86" rx="16" ry="13" fill={d} />
      <path d="M28 80 Q16 64 22 50 Q28 64 36 74" fill={d} />
      {eyes(34, 86, 46, 84, 4)}
    </g>
  ),
  moth: (t, d, a) => (
    <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
      <g className={a ? "moth-wings" : undefined} style={{ transformOrigin: "78px 72px" }}>
        <path d="M78 72 Q60 18 110 22 Q130 50 78 72 Z" fill={t} />
        <path d="M78 76 Q110 120 126 92 Q118 70 78 76 Z" fill={d} />
        <circle cx="104" cy="40" r="8" fill={d} />
        <circle cx="104" cy="40" r="3" fill={EYE} stroke="none" />
      </g>
      <ellipse cx="74" cy="82" rx="14" ry="24" fill={d} />
      <circle cx="58" cy="62" r="16" fill="#EDE6F5" />
      {eyes(51, 60, 63, 58, 4.5)}
      <path d="M52 48 Q40 30 30 34 M62 46 Q66 28 78 26" fill="none" />
    </g>
  ),
  spider: (t, d) => (
    <g stroke={INK} strokeWidth="3" strokeLinejoin="round" fill="none">
      {[-1, 1].map((side) =>
        [0, 1, 2, 3].map((i) => (
          <path key={`${side}${i}`} d={`M76 84 Q${76 + side * (20 + i * 6)} ${54 + i * 10} ${76 + side * (36 + i * 6)} ${100 + i * 6}`} />
        )),
      )}
      <circle cx="90" cy="80" r="24" fill={d} />
      <path d="M84 70 l6 8 l6 -8 M84 88 l6 -8 l6 8" stroke={t} strokeWidth="3" />
      <circle cx="56" cy="84" r="17" fill={t} />
      <g stroke="none">
        <circle cx="48" cy="80" r="4" fill={EYE} className="eye-glow" />
        <circle cx="60" cy="78" r="4" fill={EYE} className="eye-glow" />
        <circle cx="52" cy="72" r="2.5" fill={EYE} />
        <circle cx="60" cy="70" r="2.5" fill={EYE} />
      </g>
    </g>
  ),
  mantis: (t, d) => (
    <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
      <path d="M86 98 l-6 22 M104 98 l8 22" fill="none" strokeWidth="4" />
      <ellipse cx="100" cy="88" rx="28" ry="12" fill={t} transform="rotate(-10 100 88)" />
      <path d="M70 92 Q64 70 60 60" stroke={t} strokeWidth="12" fill="none" />
      <path d="M44 38 L66 46 L56 64 Z" fill={t} />
      {eyes(48, 42, 62, 46, 4.5)}
      <path d="M62 70 Q40 66 34 82 Q46 74 56 78" fill={d} />
      <path d="M66 76 Q48 80 44 98 Q54 88 62 88" fill={d} />
    </g>
  ),
};

function shadeHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c * amount : (255 - c) * amount))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
