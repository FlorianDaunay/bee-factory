import type { HiveType } from "@/core/hive";

const INK = "#3A2410";

/** A hive drawing with its honey level (0..1) shown as honey dripping from the entrance. */
export function HiveArt({ type, fill, size = 110 }: { type: HiveType; fill: number; size?: number }) {
  const full = fill >= 1;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden className="overflow-visible">
      <ellipse cx="60" cy="112" rx="40" ry="6" fill="#000" opacity="0.12" />
      {type === "skep" && (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          {[0, 1, 2, 3, 4].map((i) => {
            const w = 30 + i * 9;
            const y = 22 + i * 17;
            return <rect key={i} x={60 - w} y={y} width={w * 2} height="18" rx="9" fill={i % 2 ? "#E2B85C" : "#EBC874"} />;
          })}
          <path d="M44 106 Q60 86 76 106 Z" fill="#5B3A1A" />
        </g>
      )}
      {type === "box" && (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M16 34 L60 12 L104 34 Z" fill="#8B5A2B" />
          <rect x="22" y="34" width="76" height="72" rx="4" fill="#C68642" />
          <path d="M22 58 H98 M22 82 H98" />
          <rect x="48" y="96" width="24" height="8" rx="3" fill="#5B3A1A" />
        </g>
      )}
      {type === "clay" && (
        <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M40 18 H80 L76 30 Q108 46 100 80 Q94 108 60 108 Q26 108 20 80 Q12 46 44 30 Z" fill="#D0784C" />
          <path d="M26 62 Q60 74 94 62" fill="none" stroke="#F4D3B5" strokeWidth="4" />
          <ellipse cx="60" cy="92" rx="10" ry="8" fill="#5B3A1A" />
        </g>
      )}
      {type === "crystal" && (
        <g stroke="#2B5A7A" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M60 8 L100 30 V80 L60 104 L20 80 V30 Z" fill="#8FD3FF" />
          <path d="M60 8 V104 M20 30 L100 80 M100 30 L20 80" stroke="#FFFFFF" strokeOpacity="0.5" />
          <path d="M60 30 L80 42 V66 L60 78 L40 66 V42 Z" fill="#F5B301" fillOpacity={0.3 + fill * 0.7} />
        </g>
      )}
      {/* honey drip, grows with the stored amount */}
      <g>
        <path
          d={`M54 104 Q54 ${104 + 4 + fill * 10} 60 ${106 + fill * 12} Q66 ${104 + 4 + fill * 10} 66 104 Z`}
          fill="#F5B301"
          stroke={INK}
          strokeWidth="1.5"
          opacity={fill > 0.02 ? 1 : 0}
        />
      </g>
      {full && (
        <g className="twinkle" style={{ transformOrigin: "98px 20px" }}>
          <circle cx="98" cy="20" r="11" fill="#FFB627" stroke={INK} strokeWidth="2" />
          <text x="98" y="25" textAnchor="middle" fontSize="15" fontWeight="800" fill={INK}>
            !
          </text>
        </g>
      )}
    </svg>
  );
}
