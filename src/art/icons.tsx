import type { ResourceId, ZoneId } from "@/core/types";

const INK = "#3A2410";

export function ResourceIcon({ id, size = 22 }: { id: ResourceId; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className="shrink-0">
      {id === "honey" && (
        <g stroke={INK} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M16 3 Q26 15 26 20 A10 10 0 0 1 6 20 Q6 15 16 3 Z" fill="#F5B301" />
          <path d="M11 18 Q11 24 16 25" stroke="#FFF3B0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      )}
      {id === "silver" && (
        <g stroke="#5E6B78" strokeWidth="1.8">
          <circle cx="16" cy="16" r="13" fill="#D7DFE7" />
          <circle cx="16" cy="16" r="9.5" fill="#C2CDD8" />
          {/* tiny bee embossing */}
          <ellipse cx="16" cy="17" rx="5" ry="4" fill="#E9EEF3" strokeWidth="1.2" />
          <path d="M14 13.5 v7 M17.5 13.5 v7" strokeWidth="1.2" />
          <ellipse cx="13" cy="12" rx="2.5" ry="3" fill="#FFFFFF" strokeWidth="1" />
          <path d="M9 8 L11 10 M7 15 L9 15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {id === "pollen" && (
        <g stroke={INK} strokeWidth="1.6">
          <circle cx="16" cy="17" r="11" fill="#C7E04A" />
          {[[12, 13], [19, 12], [21, 19], [13, 21], [16, 17]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill="#8DAA1E" stroke="none" />
          ))}
          <circle cx="12" cy="11" r="2.5" fill="#F0FFB0" stroke="none" />
        </g>
      )}
      {id === "jelly" && (
        <g stroke={INK} strokeWidth="1.8" strokeLinejoin="round">
          <rect x="7" y="10" width="18" height="18" rx="5" fill="#F7C9E0" />
          <rect x="6" y="6" width="20" height="6" rx="2" fill="#E07A9A" />
          <path d="M11 16 q2 -2 4 0" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M12 21 l2 -3 l2 3 l2 -3 l2 3" fill="none" stroke="#FFB627" strokeWidth="1.6" />
        </g>
      )}
    </svg>
  );
}

/** Simplified flag emblem for each zone (round badge). */
export function ZoneFlag({ zone, size = 28 }: { zone: ZoneId; size?: number }) {
  return (
    <svg viewBox="0 0 30 30" width={size} height={size} aria-hidden className="shrink-0 rounded-full">
      <defs>
        <clipPath id={`flag-${zone}`}>
          <circle cx="15" cy="15" r="14" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-${zone})`}>{FLAGS[zone]}</g>
      <circle cx="15" cy="15" r="14" fill="none" stroke={INK} strokeWidth="1.6" />
    </svg>
  );
}

const vTri = (a: string, b: string, c: string) => (
  <>
    <rect x="0" y="0" width="10" height="30" fill={a} />
    <rect x="10" y="0" width="10" height="30" fill={b} />
    <rect x="20" y="0" width="10" height="30" fill={c} />
  </>
);
const hTri = (a: string, b: string, c: string) => (
  <>
    <rect x="0" y="0" width="30" height="10" fill={a} />
    <rect x="0" y="10" width="30" height="10" fill={b} />
    <rect x="0" y="20" width="30" height="10" fill={c} />
  </>
);

const FLAGS: Record<ZoneId, JSX.Element> = {
  home: (
    <>
      <rect width="30" height="30" fill="#9BD770" />
      <path d="M15 6 l7 4 v8 l-7 4 l-7 -4 v-8 z" fill="#FFB627" stroke="#3A2410" strokeWidth="1.2" />
    </>
  ),
  fr: vTri("#2B59C3", "#FFFFFF", "#E63946"),
  it: vTri("#009246", "#FFFFFF", "#CE2B37"),
  de: hTri("#1A1A1A", "#DD0000", "#FFCE00"),
  eg: (
    <>
      {hTri("#CE1126", "#FFFFFF", "#1A1A1A")}
      <circle cx="15" cy="15" r="2.6" fill="#C09300" />
    </>
  ),
  in: (
    <>
      {hTri("#FF9933", "#FFFFFF", "#138808")}
      <circle cx="15" cy="15" r="3.2" fill="none" stroke="#000080" strokeWidth="1" />
    </>
  ),
  jp: (
    <>
      <rect width="30" height="30" fill="#FFFFFF" />
      <circle cx="15" cy="15" r="7" fill="#D7263D" />
    </>
  ),
  br: (
    <>
      <rect width="30" height="30" fill="#009C3B" />
      <path d="M15 4 L28 15 L15 26 L2 15 Z" fill="#FFDF00" />
      <circle cx="15" cy="15" r="6" fill="#002776" />
    </>
  ),
  us: (
    <>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x="0" y={i * 4.3} width="30" height="2.15" fill="#B22234" />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={`w${i}`} x="0" y={i * 4.3 + 2.15} width="30" height="2.15" fill="#FFFFFF" />
      ))}
      <rect x="0" y="0" width="14" height="15" fill="#3C3B6E" />
      <circle cx="5" cy="5" r="1" fill="#FFF" />
      <circle cx="10" cy="5" r="1" fill="#FFF" />
      <circle cx="7.5" cy="9.5" r="1" fill="#FFF" />
    </>
  ),
};

export function Stars({ count, max, size = 14, color = "#FFB627" }: { count: number; max?: number; size?: number; color?: string }) {
  const total = max ?? count;
  return (
    <span className="inline-flex gap-[1px]" aria-label={`${count} stars`}>
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" width={size} height={size}>
          <path
            d="M10 1.5 L12.6 7 L18.5 7.6 L14 11.6 L15.3 17.6 L10 14.5 L4.7 17.6 L6 11.6 L1.5 7.6 L7.4 7 Z"
            fill={i < count ? color : "#00000022"}
            stroke={i < count ? "#3A2410" : "none"}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}
