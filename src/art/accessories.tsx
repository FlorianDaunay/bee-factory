import type { HatKind, HeldKind } from "@/core/types";

const INK = "#3A2410";

/** Hats are drawn around (0,0) = top centre of the head. */
export function Hat({ kind, c1, c2 }: { kind: HatKind; c1: string; c2?: string }) {
  const s = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const };
  switch (kind) {
    case "none":
      return null;
    case "hardhat":
      return (
        <g {...s}>
          <path d="M-19 2 A19 18 0 0 1 19 2 Z" fill={c1} />
          <rect x="-24" y="0" width="48" height="6" rx="3" fill={c1} />
          <path d="M0 -15 V1" stroke={INK} strokeOpacity="0.35" fill="none" />
          <circle cx="13" cy="-7" r="5" fill="#FFF8D0" />
          <circle cx="13" cy="-7" r="9" fill="#FFF3A0" opacity="0.35" stroke="none" className="lamp-glow" />
        </g>
      );
    case "beret":
      return (
        <g {...s}>
          <ellipse cx="-2" cy="-4" rx="22" ry="9" fill={c1} />
          <path d="M-2 -13 q1 -5 4 -6" fill="none" strokeWidth="2.5" stroke={c1} />
        </g>
      );
    case "musketeer":
      return (
        <g {...s}>
          <path d="M-12 -2 Q-10 -18 2 -18 Q14 -18 14 -2 Z" fill={c1} />
          <ellipse cx="0" cy="0" rx="27" ry="6" fill={c1} />
          <path d="M-6 -16 Q-30 -36 -38 -10 Q-26 -22 -10 -12" fill={c2 ?? "#FFFFFF"} />
        </g>
      );
    case "chef":
      return (
        <g {...s}>
          <circle cx="-10" cy="-16" r="9" fill={c1} />
          <circle cx="2" cy="-21" r="10" fill={c1} />
          <circle cx="12" cy="-15" r="8" fill={c1} />
          <rect x="-14" y="-12" width="28" height="13" rx="3" fill={c1} />
        </g>
      );
    case "headband":
      return (
        <g {...s}>
          <path d="M-22 8 Q0 -2 22 6 L22 13 Q0 5 -22 15 Z" fill={c1} />
          <circle cx="4" cy="6" r="4" fill={c2 ?? "#D7263D"} stroke="none" />
          <path d="M-22 10 q-10 2 -14 10 M-22 12 q-6 8 -6 14" fill="none" stroke={c1} strokeWidth="4" />
        </g>
      );
    case "kitsune":
      return (
        <g {...s} transform="translate(-12 -4) rotate(-20)">
          <path d="M-12 -2 L-10 -18 L-3 -8 L3 -8 L10 -18 L12 -2 Q12 12 0 14 Q-12 12 -12 -2 Z" fill={c1} />
          <path d="M-7 1 q3 -3 6 0 M2 1 q3 -3 6 0" fill="none" stroke={c2} strokeWidth="2" />
          <path d="M-8 -12 L-6 -4 M8 -12 L6 -4" stroke={c2} strokeWidth="2" />
          <circle cx="0" cy="9" r="1.6" fill={c2} stroke="none" />
        </g>
      );
    case "kabuto":
      return (
        <g {...s}>
          <path d="M-22 4 Q-22 -20 0 -20 Q22 -20 22 4 Z" fill={c1} />
          <path d="M-26 4 L-30 12 L-18 6 M26 4 L30 12 L18 6" fill={c1} />
          <path d="M-14 -16 Q-20 -40 -6 -34 Q0 -24 0 -19 Q0 -24 6 -34 Q20 -40 14 -16" fill={c2} />
        </g>
      );
    case "sakura":
      return (
        <g transform="translate(14 -2)" stroke={INK} strokeWidth="1.5">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-6" rx="4.5" ry="6.5" fill={c1} transform={`rotate(${r})`} />
          ))}
          <circle r="2.6" fill="#FFE066" />
        </g>
      );
    case "tyrolean":
      return (
        <g {...s}>
          <ellipse cx="0" cy="0" rx="25" ry="6" fill={c1} />
          <path d="M-14 -1 Q-12 -20 0 -20 Q12 -20 14 -1 Z" fill={c1} />
          <path d="M-14 -5 H14" stroke={c2} strokeWidth="4" />
          <path d="M10 -7 Q22 -30 30 -32 Q20 -20 14 -6" fill="#EDE6D6" />
        </g>
      );
    case "goggles":
      return (
        <g {...s}>
          <path d="M-24 8 Q0 -4 24 6" fill="none" stroke={c1} strokeWidth="6" />
          <circle cx="-6" cy="3" r="8" fill="#9ED8FF" />
          <circle cx="12" cy="2" r="8" fill="#9ED8FF" />
          <circle cx="-8" cy="1" r="2.5" fill="#FFFFFF" stroke="none" />
          <circle cx="10" cy="0" r="2.5" fill="#FFFFFF" stroke="none" />
        </g>
      );
    case "knight":
      return (
        <g {...s}>
          <path d="M-22 8 Q-22 -20 0 -20 Q22 -20 22 8 L16 8 Q14 -6 0 -6 Q-14 -6 -16 8 Z" fill={c1} />
          <path d="M-2 -20 Q-8 -40 -26 -36 Q-14 -30 -10 -18" fill={c2 ?? "#DD0000"} />
          <path d="M-18 -4 H18" stroke={INK} strokeOpacity="0.3" />
        </g>
      );
    case "straw":
      return (
        <g {...s}>
          <ellipse cx="0" cy="0" rx="27" ry="6" fill={c1} />
          <rect x="-14" y="-15" width="28" height="15" rx="3" fill={c1} />
          <rect x="-14" y="-7" width="28" height="5" fill={c2 ?? "#1D3557"} />
          <path d="M-24 0 h48" stroke={INK} strokeOpacity="0.25" />
        </g>
      );
    case "venetian":
      return (
        <g {...s}>
          <path
            fillRule="evenodd"
            d="M-14 12 Q-4 8 4 14 Q12 8 22 10 Q26 18 18 26 Q8 28 4 22 Q-2 28 -12 26 Q-20 18 -14 12 Z M-4 19 a5 5 0 1 0 0.1 0 Z M10 18 a5 5 0 1 0 0.1 0 Z"
            fill={c1}
          />
          <path d="M22 10 Q34 0 30 -12 Q36 2 26 14" fill={c2} />
        </g>
      );
    case "centurion":
      return (
        <g {...s}>
          <path d="M-21 6 Q-21 -18 0 -18 Q21 -18 21 6 Z" fill={c1} />
          <path d="M-18 -14 Q0 -40 18 -14 Q0 -26 -18 -14 Z" fill={c2} />
          <path d="M-21 6 L-24 14 L-14 8" fill={c1} />
        </g>
      );
    case "nemes":
      return (
        <g {...s}>
          <path d="M-24 14 Q-26 -18 0 -18 Q26 -18 24 14 L32 34 L18 30 L16 6 Q0 -2 -16 6 L-18 30 L-32 34 Z" fill={c1} />
          {[-10, -2, 6].map((y) => (
            <path key={y} d={`M-22 ${y + 4} Q0 ${y - 6} 22 ${y + 4}`} fill="none" stroke={c2} strokeWidth="3" />
          ))}
          <circle cx="2" cy="-12" r="3.5" fill={c2} />
        </g>
      );
    case "crown":
      return (
        <g {...s}>
          <path d="M-16 2 L-18 -16 L-9 -7 L0 -20 L9 -7 L18 -16 L16 2 Z" fill={c1} />
          <circle cx="0" cy="-4" r="3" fill={c2 ?? "#FF4F79"} />
          <circle cx="-10" cy="-3" r="2" fill="#FFFFFF" stroke="none" />
          <circle cx="10" cy="-3" r="2" fill="#FFFFFF" stroke="none" />
        </g>
      );
    case "lotus":
      return (
        <g {...s} strokeWidth={1.5}>
          <path d="M0 0 Q-20 -6 -18 -16 Q-6 -12 0 0" fill={c1} />
          <path d="M0 0 Q20 -6 18 -16 Q6 -12 0 0" fill={c1} />
          <path d="M0 0 Q-10 -14 0 -26 Q10 -14 0 0" fill="#FFD1DC" />
        </g>
      );
    case "feathers":
      return (
        <g {...s} strokeWidth={1.5}>
          {[-50, -25, 0, 25, 50].map((r, i) => (
            <ellipse key={r} cx="0" cy="-22" rx="6" ry="16" fill={i % 2 ? (c2 ?? c1) : c1} transform={`rotate(${r} 0 2)`} />
          ))}
          <path d="M-20 4 Q0 -6 20 4 L20 9 Q0 0 -20 9 Z" fill="#FFDF00" />
        </g>
      );
    case "cap":
      return (
        <g {...s}>
          <path d="M-18 4 Q-18 -16 2 -16 Q20 -16 20 4 Z" fill={c1} />
          <path d="M14 2 Q30 -2 36 6 Q24 8 12 6 Z" fill={c2 ?? c1} />
          <circle cx="2" cy="-16" r="2" fill={c2 ?? c1} />
        </g>
      );
    case "cowboy":
      return (
        <g {...s}>
          <path d="M-30 -2 Q-26 6 0 6 Q26 6 30 -2 Q20 2 0 2 Q-20 2 -30 -2 Z" fill={c1} />
          <path d="M-14 2 Q-16 -20 -6 -18 Q0 -12 6 -18 Q16 -20 14 2 Z" fill={c1} />
          <path d="M-14 -3 H14" stroke={c2 ?? "#3A2410"} strokeWidth="3" />
        </g>
      );
    case "astronaut":
      return (
        <g>
          <circle cx="-4" cy="22" r="36" fill="#CFE6FF" fillOpacity="0.25" stroke={c2 ?? "#7FB3FF"} strokeWidth="3" />
          <path d="M-26 6 Q-22 -6 -10 -10" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.8" />
          <rect x="-26" y="52" width="44" height="7" rx="3.5" fill={c1} stroke={INK} strokeWidth="2" />
        </g>
      );
    case "garland":
      return (
        <g transform="translate(-6 44)" stroke={INK} strokeWidth="1">
          {[-22, -14, -6, 2, 10, 18].map((x, i) => (
            <circle key={x} cx={x} cy={Math.abs(x + 2) * -0.25 + 6} r="4.5" fill={i % 2 ? (c2 ?? c1) : c1} />
          ))}
        </g>
      );
    case "laurel":
      return (
        <g stroke={INK} strokeWidth="1.2">
          {[-20, -13, -6, 6, 13, 20].map((x) => (
            <ellipse key={x} cx={x} cy={Math.abs(x) * 0.25 - 3} rx="5" ry="3" fill={c1} transform={`rotate(${x > 0 ? -25 : 25} ${x} 0)`} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** Held items are drawn around (0,0) = the bee's hand. */
export function Held({ kind, c }: { kind: HeldKind; c?: string }) {
  const s = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const col = c ?? "#C98B2B";
  switch (kind) {
    case "none":
      return null;
    case "dipper":
      return (
        <g {...s}>
          <path d="M0 4 L-6 -22" fill="none" strokeWidth="4" stroke="#8B5A2B" />
          <ellipse cx="-8" cy="-28" rx="7" ry="9" fill={col} />
          <path d="M-14 -31 h12 M-14 -26 h12" stroke={INK} strokeOpacity="0.4" />
          <path d="M-9 -19 q-1 6 1 8" stroke="#F5B301" strokeWidth="3" fill="none" />
        </g>
      );
    case "baguette":
      return (
        <g {...s}>
          <rect x="-6" y="-36" width="12" height="44" rx="6" fill={col} transform="rotate(20)" />
          <path d="M-4 -24 l6 -3 M-1 -14 l6 -3 M2 -4 l6 -3" transform="rotate(20)" stroke="#8B5A2B" />
        </g>
      );
    case "whisk":
      return (
        <g {...s}>
          <path d="M0 6 V-8" strokeWidth="4" stroke="#8B5A2B" />
          <path d="M0 -8 Q-10 -24 0 -34 Q10 -24 0 -8 M0 -8 Q-4 -24 0 -34 Q4 -24 0 -8" fill="none" stroke={col} />
        </g>
      );
    case "pretzel":
      return (
        <path
          {...s}
          d="M-12 -6 Q-16 -22 -4 -22 Q4 -22 0 -12 Q-4 -2 -10 2 M12 -6 Q16 -22 4 -22 Q-4 -22 0 -12 Q4 -2 10 2"
          fill="none"
          stroke={col}
          strokeWidth="6"
        />
      );
    case "wrench":
      return (
        <g {...s}>
          <path d="M0 6 L0 -18" stroke={col} strokeWidth="6" />
          <path d="M-8 -20 a9 9 0 1 1 16 0 l-4 -6 h-8 z" fill={col} />
        </g>
      );
    case "sword":
      return (
        <g {...s}>
          <path d="M-2 0 L-2 -34 L0 -40 L2 -34 L2 0 Z" fill={col} />
          <rect x="-8" y="-2" width="16" height="4" rx="2" fill="#8B5A2B" />
          <rect x="-2" y="2" width="4" height="8" rx="2" fill="#5B3A1A" />
        </g>
      );
    case "fan":
      return (
        <g {...s}>
          <path d="M0 4 L-20 -18 A28 28 0 0 1 20 -18 Z" fill={col} />
          <path d="M0 4 L-10 -22 M0 4 L0 -24 M0 4 L10 -22" stroke="#FFFFFF" strokeOpacity="0.6" />
        </g>
      );
    case "umbrella":
      return (
        <g {...s}>
          <path d="M0 8 V-24" strokeWidth="3" stroke="#8B5A2B" />
          <path d="M-24 -20 Q0 -46 24 -20 Z" fill={col} />
          <path d="M0 -38 L-14 -20 M0 -38 L14 -20 M0 -38 V-20" stroke="#FFFFFF" strokeOpacity="0.6" />
        </g>
      );
    case "tea":
      return (
        <g {...s}>
          <path d="M-10 -14 h20 l-3 16 h-14 z" fill={col} />
          <path d="M-4 -20 q-3 -5 0 -10 M3 -20 q-3 -5 0 -10" fill="none" stroke="#FFFFFF" strokeOpacity="0.9" className="steam" />
        </g>
      );
    case "ankh":
      return (
        <g {...s} fill="none" stroke={col} strokeWidth="5">
          <ellipse cx="0" cy="-26" rx="5" ry="7" />
          <path d="M0 -19 V6 M-9 -16 H9" />
        </g>
      );
    case "papyrus":
      return (
        <g {...s}>
          <rect x="-12" y="-26" width="24" height="26" fill={col} />
          <rect x="-14" y="-30" width="28" height="6" rx="3" fill="#C9A66B" />
          <rect x="-14" y="-2" width="28" height="6" rx="3" fill="#C9A66B" />
          <path d="M-6 -18 h12 M-6 -12 h8" stroke={INK} strokeOpacity="0.4" />
        </g>
      );
    case "ball":
      return (
        <g {...s}>
          <circle cx="0" cy="-10" r="12" fill={col} />
          <path d="M0 -15 l5 3 -2 6 h-6 l-2 -6 z" fill={INK} />
        </g>
      );
    case "pizza":
      return (
        <g {...s}>
          <path d="M-12 -24 Q0 -30 12 -24 L0 6 Z" fill="#FFD166" />
          <path d="M-12 -24 Q0 -30 12 -24" stroke={col} strokeWidth="5" fill="none" />
          <circle cx="-3" cy="-14" r="3" fill="#D62828" stroke="none" />
          <circle cx="4" cy="-8" r="2.5" fill="#D62828" stroke="none" />
        </g>
      );
    case "lemon":
      return (
        <g {...s}>
          <ellipse cx="0" cy="-10" rx="12" ry="9" fill={col} />
          <path d="M6 -18 q8 -8 12 -2 q-6 4 -12 2" fill="#3E8E41" />
        </g>
      );
    case "maraca":
      return (
        <g {...s} className="shake">
          <path d="M0 6 V-10" strokeWidth="4" stroke="#8B5A2B" />
          <ellipse cx="0" cy="-20" rx="9" ry="12" fill={col} />
          <path d="M-8 -22 h16" stroke="#FFDF00" strokeWidth="3" />
        </g>
      );
    case "lantern":
      return (
        <g {...s}>
          <path d="M0 6 V-6" />
          <ellipse cx="0" cy="-18" rx="10" ry="13" fill={col} />
          <ellipse cx="0" cy="-18" rx="16" ry="18" fill={col} opacity="0.25" stroke="none" className="lamp-glow" />
          <path d="M-6 -30 h12 M-6 -6 h12" />
        </g>
      );
    case "shield":
      return (
        <g {...s}>
          <path d="M-14 -24 H14 V-8 Q14 6 0 12 Q-14 6 -14 -8 Z" fill={col} />
          <path d="M0 -20 V8 M-10 -10 H10" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="3" />
        </g>
      );
    case "flower":
      return (
        <g {...s}>
          <path d="M0 6 Q-2 -10 0 -18" stroke="#3E8E41" strokeWidth="3" fill="none" />
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-26" rx="4" ry="6" fill={col} transform={`rotate(${r} 0 -20)`} strokeWidth="1.2" />
          ))}
          <circle cx="0" cy="-20" r="3" fill="#FFE066" strokeWidth="1.2" />
        </g>
      );
    case "torch":
      return (
        <g {...s}>
          <path d="M-4 -12 L4 -12 L2 8 L-2 8 Z" fill="#8B5A2B" />
          <path d="M0 -14 Q-12 -26 0 -42 Q12 -26 0 -14 Z" fill={col} className="flicker" />
          <path d="M0 -16 Q-5 -24 0 -32 Q5 -24 0 -16 Z" fill="#FFF3A0" stroke="none" className="flicker" />
        </g>
      );
    case "feather":
      return (
        <g {...s}>
          <path d="M0 6 Q-4 -20 10 -38 Q18 -18 0 6 Z" fill={col} />
          <path d="M0 6 Q4 -16 10 -38" fill="none" stroke={INK} strokeOpacity="0.5" />
          <circle cx="7" cy="-26" r="3" fill="#0F5C8C" stroke="none" />
        </g>
      );
    case "bat":
      return <path {...s} d="M-2 8 L-4 -6 Q-8 -36 0 -38 Q8 -36 4 -6 L2 8 Z" fill={col} transform="rotate(20)" />;
    case "harp":
      return <path {...s} d="M-8 6 Q-14 -20 0 -30 Q14 -20 8 6 Z M-4 0 V-20 M0 0 V-24 M4 0 V-20" fill={col} />;
    case "lasso":
      return (
        <g {...s} fill="none" stroke={col} strokeWidth="3">
          <ellipse cx="2" cy="-22" rx="12" ry="8" className="spin-slow" />
          <path d="M0 6 Q-6 -6 -6 -16" />
        </g>
      );
    case "staff":
      return (
        <g {...s}>
          <path d="M0 10 V-36" strokeWidth="4" stroke="#6D4C41" />
          <circle cx="0" cy="-40" r="6" fill={col} />
          <circle cx="0" cy="-40" r="11" fill={col} opacity="0.3" stroke="none" className="lamp-glow" />
        </g>
      );
    default:
      return null;
  }
}
