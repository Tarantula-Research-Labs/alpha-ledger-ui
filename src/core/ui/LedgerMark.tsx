// The Alpha Ledger mark: a ledger page with ruled lines and a highlighted entry. Colours follow the theme.
export function LedgerMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ filter: "var(--mark-glow)" }}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="4" strokeWidth="1.5" style={{ fill: "var(--mark-fill)", stroke: "var(--mark-stroke)" }} />
      <line x1="7.5" y1="2.5" x2="7.5" y2="21.5" strokeWidth="1.5" style={{ stroke: "var(--mark-stroke)" }} />
      <line x1="10.5" y1="8" x2="18" y2="8" strokeWidth="1.5" strokeLinecap="round" style={{ stroke: "var(--mark-line)" }} />
      <line x1="10.5" y1="12" x2="18" y2="12" strokeWidth="1.5" strokeLinecap="round" style={{ stroke: "var(--mark-line)" }} />
      <line x1="10.5" y1="16" x2="15" y2="16" strokeWidth="2" strokeLinecap="round" style={{ stroke: "var(--mark-entry)" }} />
    </svg>
  );
}
