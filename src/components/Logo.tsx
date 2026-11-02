/** A plain basketball mark (no team or league marks). */
export function BallMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className}>
      <circle cx="16" cy="16" r="15" fill="#f26b1d" stroke="#0a2240" strokeWidth="1.5" />
      <g fill="none" stroke="#0a2240" strokeWidth="1.4">
        <line x1="1" y1="16" x2="31" y2="16" />
        <line x1="16" y1="1" x2="16" y2="31" />
        <path d="M6 4.5c4.5 3.6 6.8 7.4 6.8 11.5S10.5 23.9 6 27.5" />
        <path d="M26 4.5c-4.5 3.6-6.8 7.4-6.8 11.5s2.3 7.9 6.8 11.5" />
      </g>
    </svg>
  );
}
