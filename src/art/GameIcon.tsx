import type { ReactNode } from "react";

/**
 * Game icon set, drawn in the same style as the bees (thick brown outline, warm fills).
 * Generic UI icons (close, settings, arrows...) come from Lucide instead; these are the
 * game-specific ones: elements, statuses, stats, roles, items, perks, navigation, battle marks.
 */
const INK = "#3A2410";
const s = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const flame = (outer: string, inner: string) => (
  <g {...s}>
    <path d="M16 3 C20 9 26 12 25 19 C24.5 25 20.5 29 16 29 C11.5 29 7.5 25.5 7.5 20 C7.5 15 11 13 11.5 8.5 C13.5 10.5 14 12 14 14 C16.5 11.5 17 7 16 3 Z" fill={outer} />
    <path d="M16 15 C18.5 18 20.5 20 20 23.5 C19.6 26 18 27 16 27 C13.8 27 12 25.6 12 23 C12 20.5 14.5 19 16 15 Z" fill={inner} strokeWidth="1.5" />
  </g>
);
const shield = (fill: string) => (
  <g {...s}>
    <path d="M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z" fill={fill} />
    <path d="M16 7 V25 M10 13 H22" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="2.5" />
  </g>
);
const bolt = (fill: string) => <path {...s} d="M18 2 L7 18 H15 L13 30 L25 13 H17 Z" fill={fill} />;
const spiral = (color: string) => (
  <g {...s}>
    <circle cx="16" cy="16" r="13" fill={color} />
    <path d="M16 16 m0 -2 a2 2 0 1 1 -2 2 a4.5 4.5 0 1 1 4.5 4.5 a7 7 0 1 1 7 -7" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
  </g>
);
const heart = (fill: string) => <path {...s} d="M16 28 C6 21 3 16 3 11 C3 7 6 4 9.5 4 C12.5 4 14.5 6 16 8 C17.5 6 19.5 4 22.5 4 C26 4 29 7 29 11 C29 16 26 21 16 28 Z" fill={fill} />;
const sparkle = (fill: string) => <path {...s} d="M16 2 L19 13 L30 16 L19 19 L16 30 L13 19 L2 16 L13 13 Z" fill={fill} />;
const arrowCircle = (fill: string, up: boolean) => (
  <g {...s}>
    <circle cx="16" cy="16" r="13" fill={fill} />
    <path d={up ? "M16 23 V9 M10 15 L16 9 L22 15" : "M16 9 V23 M10 17 L16 23 L22 17"} fill="none" stroke="#FFFFFF" strokeWidth="3.2" />
  </g>
);

const ICONS = {
  /* elements */
  flame: flame("#FF6A3D", "#FFD23F"),
  leaf: (
    <g {...s}>
      <path d="M5 27 C5 14 12 5 28 4 C28 19 20 27 5 27 Z" fill="#3DBE6A" />
      <path d="M5 27 C11 20 16 15 22 10" fill="none" stroke="#1F7A3E" />
    </g>
  ),
  storm: bolt("#FFD23F"),
  wave: (
    <g {...s}>
      <path d="M16 3 C21 10 26 15 26 20 A10 10 0 0 1 6 20 C6 15 11 10 16 3 Z" fill="#2F9BFF" />
      <path d="M11 19 C11 23 13 25 16 25.5" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
    </g>
  ),
  light: (
    <g {...s}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <path key={a} d="M16 1.5 V6" transform={`rotate(${a} 16 16)`} stroke="#E8A600" strokeWidth="2.5" />
      ))}
      <circle cx="16" cy="16" r="8" fill="#FFD86B" />
    </g>
  ),
  shadow: <path {...s} d="M21 3 A13 13 0 1 0 29 22 A10 10 0 1 1 21 3 Z" fill="#8A5CF6" />,

  /* statuses */
  poison: (
    <g {...s} fill="#7BC74D">
      <circle cx="12" cy="19" r="8" />
      <circle cx="22" cy="12" r="5.5" />
      <circle cx="23" cy="24" r="3.5" />
      <circle cx="10" cy="16" r="2" fill="#FFFFFF" stroke="none" />
    </g>
  ),
  burn: flame("#FF4F4F", "#FFB627"),
  stun: (
    <g {...s}>
      <ellipse cx="16" cy="17" rx="13" ry="6" fill="none" stroke="#F2C500" strokeWidth="2.5" />
      <path d="M16 6 L18 11 L23 11.5 L19 15 L20.5 20 L16 17 L11.5 20 L13 15 L9 11.5 L14 11 Z" fill="#FFE066" />
    </g>
  ),
  weaken: arrowCircle("#8C96A3", false),
  guard: shield("#2F9BFF"),
  fury: arrowCircle("#FF4F4F", true),
  regen: (
    <g {...s}>
      <path d="M16 29 V14" fill="none" stroke="#2E7D32" strokeWidth="2.5" />
      <path d="M16 16 C10 16 5 12 5 6 C11 6 16 9 16 16 Z" fill="#3DBE6A" />
      <path d="M16 13 C16 7 21 3 27 3 C27 9 22 13 16 13 Z" fill="#7FD98F" />
    </g>
  ),
  taunt: (
    <g {...s}>
      <circle cx="16" cy="16" r="13" fill="#FF4F4F" />
      <circle cx="16" cy="16" r="8.5" fill="#FFFFFF" />
      <circle cx="16" cy="16" r="4" fill="#FF4F4F" />
    </g>
  ),

  /* stats */
  hp: heart("#FF4F6D"),
  atk: (
    <g {...s}>
      <path d="M24 3 L29 3 L29 8 L13 24 L8 19 Z" fill="#DDE3EA" />
      <path d="M6 17 L15 26 M8 24 L4 28" fill="none" strokeWidth="3" />
      <circle cx="4.5" cy="27.5" r="2" fill="#C98B2B" />
    </g>
  ),
  def: shield("#5B8DEF"),
  rec: (
    <g {...s} strokeWidth="1.6">
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="16" cy="8.5" rx="5" ry="7" fill="#FF8FAB" transform={`rotate(${r} 16 16)`} />
      ))}
      <circle cx="16" cy="16" r="4" fill="#FFE066" />
    </g>
  ),
  spd: (
    <g {...s}>
      <path d="M4 26 C6 14 14 5 29 4 C27 9 24 12 20 13 C23 14 24 16 23 18 C20 19 17 19 15 19 C16 21 15 23 12 24 C9 25 6 25.5 4 26 Z" fill="#DFF3FF" />
      <path d="M8 22 C13 16 18 11 25 7" fill="none" stroke="#7FB3FF" />
    </g>
  ),
  work: (
    <g {...s}>
      <path d="M17 13 L6 26 L9 29 L20 16" fill="#C98B2B" />
      <path d="M12 6 L20 3 L29 12 L25 16 L19 10 L15 12 Z" fill="#9AA5B1" />
    </g>
  ),
  power: bolt("#FFB627"),
  crit: sparkle("#FF6B3D"),
  gauge: bolt("#4FC3F7"),
  status: spiral("#9B5DE5"),

  /* roles */
  guardian: shield("#2F9BFF"),
  striker: (
    <g {...s}>
      <path d="M4 4 L9 4 L24 19 L19 24 Z" fill="#DDE3EA" />
      <path d="M28 4 L23 4 L8 19 L13 24 Z" fill="#DDE3EA" />
      <path d="M17 26 L26 17 M6 17 L15 26" fill="none" strokeWidth="3" />
    </g>
  ),
  healer: (
    <g>
      {heart("#FF8FAB")}
      <path d="M16 10 V20 M11 15 H21" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  support: sparkle("#FFD23F"),
  trickster: spiral("#9B5DE5"),

  /* items */
  honeyDrop: (
    <g {...s}>
      <path d="M7 12 H25 L23 27 Q16 30 9 27 Z" fill="#E9A23B" />
      <path d="M6 9 H26 V13 H6 Z" fill="#B5793B" />
      <path d="M12 13 V18 Q12 20 14 20 Q16 20 16 18 V13" fill="#F5B301" />
      <path d="M8 19 H24" stroke="#8B5A2B" strokeOpacity="0.5" />
    </g>
  ),
  honeyJar: (
    <g {...s}>
      <rect x="7" y="9" width="18" height="20" rx="5" fill="#E8F6FF" />
      <rect x="8.5" y="15" width="15" height="12.5" rx="4" fill="#F5B301" stroke="none" />
      <rect x="6" y="4" width="20" height="6" rx="2" fill="#C98B2B" />
      <path d="M11 13 V19" stroke="#FFFFFF" strokeWidth="2.5" />
    </g>
  ),
  mint: (
    <g {...s}>
      <path d="M15 28 C6 25 3 16 8 6 C15 9 19 18 15 28 Z" fill="#3DBE6A" />
      <path d="M17 26 C17 17 21 11 29 9 C30 18 25 25 17 26 Z" fill="#7FD98F" />
      <path d="M15 28 C12 21 10 15 9 9 M17 26 C20 20 23 15 27 12" fill="none" stroke="#1F7A3E" strokeWidth="1.5" />
    </g>
  ),
  royalJelly: (
    <g {...s}>
      <rect x="7" y="13" width="18" height="16" rx="5" fill="#F7C9E0" />
      <path d="M8 11 L9 4 L13 8 L16 3 L19 8 L23 4 L24 11 Z" fill="#FFD23F" />
      <path d="M12 18 Q14 16 16 18" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
    </g>
  ),
  candy: (
    <g {...s}>
      <path d="M9 16 L3 10 L4 22 Z M23 16 L29 10 L28 22 Z" fill="#FF8FAB" />
      <circle cx="16" cy="16" r="8" fill="#FF4F79" />
      <path d="M11 12 Q16 16 12 21 M16 9 Q21 14 17 22" fill="none" stroke="#FFFFFF" strokeWidth="2" />
    </g>
  ),

  /* hive perks */
  boost: (
    <g {...s}>
      <path d="M16 3 L28 10 V22 L16 29 L4 22 V10 Z" fill="#FFB627" />
      <path d="M16 9 L23 17 H19 V24 H13 V17 H9 Z" fill="#FFFFFF" />
    </g>
  ),
  info: (
    <g {...s}>
      <circle cx="16" cy="16" r="13" fill="#4FC3F7" />
      <circle cx="16" cy="9.5" r="2.2" fill="#FFFFFF" stroke="none" />
      <path d="M13 14 H17 V23 H19" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  star: (
    <g {...s}>
      <path d="M16 3 L19.8 11.6 L29 12.4 L22 18.6 L24.2 27.8 L16 23 L7.8 27.8 L10 18.6 L3 12.4 L12.2 11.6 Z" fill="#FFD23F" />
    </g>
  ),

  /* navigation */
  hive: (
    <g {...s}>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={16 - (6 + i * 3)} y={5 + i * 6} width={(6 + i * 3) * 2} height="7" rx="3.5" fill={i % 2 ? "#E2B85C" : "#EBC874"} />
      ))}
      <path d="M12.5 29 Q16 23 19.5 29 Z" fill="#5B3A1A" />
    </g>
  ),
  summon: (
    <g {...s}>
      <path d="M16 2 L28 9 V23 L16 30 L4 23 V9 Z" fill="#F5B301" />
      <path d="M16 8 L23 12 V20 L16 24 L9 20 V12 Z" fill="#FFF3B0" />
      <path d="M16 11 L17.2 14.8 L21 16 L17.2 17.2 L16 21 L14.8 17.2 L11 16 L14.8 14.8 Z" fill="#FF6B3D" strokeWidth="1.2" />
    </g>
  ),
  bees: (
    <g {...s}>
      <ellipse cx="11" cy="9" rx="5" ry="6.5" fill="#EAF6FF" transform="rotate(-25 11 9)" />
      <circle cx="17" cy="18" r="11" fill="#FFD23F" />
      <path d="M9 10 Q6 18 9 26 L12.5 27.5 Q9.5 18 13 9 Z" fill={INK} strokeWidth="1" />
      <circle cx="19" cy="17" r="1.8" fill={INK} stroke="none" />
      <circle cx="24.5" cy="16.5" r="1.8" fill={INK} stroke="none" />
      <path d="M20 22 Q22 24 24 21.5" fill="none" strokeWidth="1.6" />
    </g>
  ),
  story: (
    <g {...s}>
      <path d="M3 7 L11 4 L21 7 L29 4 V25 L21 28 L11 25 L3 28 Z" fill="#FFF0C7" />
      <path d="M11 4 V25 M21 7 V28" fill="none" />
      <path d="M6 20 Q10 14 15 17 T25 11" fill="none" stroke="#FF4F4F" strokeDasharray="2 2.5" />
      <path d="M23 9 L27 13 M27 9 L23 13" stroke="#FF4F4F" />
    </g>
  ),
  arena: (
    <g {...s}>
      <path d="M3 3 L8 3 L22 17 L17 22 Z" fill="#FFD23F" />
      <path d="M29 3 L24 3 L10 17 L15 22 Z" fill="#B49EF0" />
      <path d="M15 25 L24 16 M8 16 L17 25" fill="none" strokeWidth="3" />
      <path d="M6 23 L3 27 M26 23 L29 27" strokeWidth="3" />
    </g>
  ),

  /* battle & map marks */
  crown: (
    <g {...s}>
      <path d="M4 25 L3 9 L10 15 L16 5 L22 15 L29 9 L28 25 Z" fill="#FFD23F" />
      <circle cx="16" cy="19" r="2.5" fill="#FF4F79" />
    </g>
  ),
  warning: (
    <g {...s}>
      <path d="M16 3 L30 28 H2 Z" fill="#FF4F4F" />
      <path d="M16 11 V19" stroke="#FFFFFF" strokeWidth="3.5" />
      <circle cx="16" cy="23.5" r="1.8" fill="#FFFFFF" stroke="none" />
    </g>
  ),
  waveMark: (
    <g {...s} fill="none" stroke="#2F9BFF" strokeWidth="3">
      <path d="M3 12 Q7.5 7 12 12 T21 12 T30 12" />
      <path d="M3 21 Q7.5 16 12 21 T21 21 T30 21" />
    </g>
  ),
  chest: (
    <g {...s}>
      <path d="M4 14 H28 V27 H4 Z" fill="#C68642" />
      <path d="M4 14 Q4 5 16 5 Q28 5 28 14 Z" fill="#E09F5A" />
      <path d="M4 14 H28 M16 5 V27" fill="none" stroke="#FFD23F" strokeWidth="2.5" />
      <rect x="13" y="12" width="6" height="6" rx="1.5" fill="#FFD23F" />
    </g>
  ),
  sleep: (
    <g {...s} fill="none" stroke="#B49EF0" strokeWidth="2.6">
      <path d="M5 13 H13 L5 23 H13" />
      <path d="M18 5 H25 L18 13 H25" />
    </g>
  ),
  pity: flame("#FF6B3D", "#FFD23F"),
  heal: (
    <g {...s}>
      <circle cx="16" cy="16" r="13" fill="#5BD38A" />
      <path d="M16 9 V23 M9 16 H23" stroke="#FFFFFF" strokeWidth="4" />
    </g>
  ),
  cleanse: (
    <g {...s}>
      <circle cx="12" cy="18" r="8" fill="#BFF0FF" />
      <circle cx="22" cy="11" r="6" fill="#DFF8FF" />
      <path d="M9 15 Q11 13 13 14" fill="none" stroke="#FFFFFF" strokeWidth="2" />
    </g>
  ),
  target: (
    <g {...s} fill="none" stroke="#FF4F4F" strokeWidth="2.4">
      <circle cx="16" cy="16" r="11" />
      <circle cx="16" cy="16" r="4" fill="#FF4F4F" />
      <path d="M16 1 V7 M16 25 V31 M1 16 H7 M25 16 H31" />
    </g>
  ),
  globe: (
    <g {...s}>
      <circle cx="16" cy="16" r="13" fill="#7FC8F8" />
      <path d="M8 9 Q12 8 13 12 Q11 16 14 18 Q12 22 9 21 Q6 16 8 9 Z M19 6 Q24 8 26 13 Q22 14 20 12 Q18 9 19 6 Z M19 19 Q24 18 25 21 Q22 26 18 26 Q17 22 19 19 Z" fill="#3DBE6A" strokeWidth="1.4" />
    </g>
  ),
  homeland: (
    <g {...s}>
      <path d="M4 15 L16 4 L28 15" fill="none" />
      <path d="M7 13 V28 H25 V13 L16 5 Z" fill="#FFD23F" />
      <path d="M13 28 V20 H19 V28" fill="#C68642" />
    </g>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function GameIcon({ name, size = 20, className = "", title }: { name: IconName; size?: number | string; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`inline-block shrink-0 overflow-visible align-middle ${className}`} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {ICONS[name]}
    </svg>
  );
}
