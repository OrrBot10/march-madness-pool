/**
 * Basketball court markings drawn to scale (94 × 50 ft), for decorating dark banner areas.
 * Purely decorative: sits behind content, ignores pointer events, hidden from screen readers.
 */
export function CourtLines({ className = "", variant = "full" }: { className?: string; variant?: "full" | "half" }) {
  const lane = (x: number, dir: 1 | -1) => (
    <g>
      {/* Lane (16 ft wide, 19 ft deep), free-throw circle, restricted arc, backboard and rim */}
      <rect x={dir === 1 ? x : x - 19} y={17} width={19} height={16} />
      <circle cx={x + dir * 19} cy={25} r={6} />
      <path d={`M ${x + dir * 4} 21 A 4 4 0 0 ${dir === 1 ? 1 : 0} ${x + dir * 4} 29`} />
      <line x1={x + dir * 4} y1={22} x2={x + dir * 4} y2={28} />
      <circle cx={x + dir * 5.25} cy={25} r={0.75} />
      {/* Three-point line: straight in the corners, 22.15 ft arc around the rim */}
      <path
        d={`M ${x} 3 L ${x + dir * 14} 3 A 22.15 22.15 0 0 ${dir === 1 ? 1 : 0} ${x + dir * 14} 47 L ${x} 47`}
      />
    </g>
  );
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full [&_*]:[vector-effect:non-scaling-stroke] ${className}`}
      viewBox={variant === "full" ? "0 0 94 50" : "0 0 47 50"}
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x={0.5} y={0.5} width={variant === "full" ? 93 : 46} height={49} />
      {lane(0.5, 1)}
      {variant === "full" && (
        <>
          <line x1={47} y1={0.5} x2={47} y2={49.5} />
          <circle cx={47} cy={25} r={6} />
          <circle cx={47} cy={25} r={2} />
          {lane(93.5, -1)}
        </>
      )}
    </svg>
  );
}
