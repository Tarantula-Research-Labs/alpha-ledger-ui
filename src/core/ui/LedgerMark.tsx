// The Alpha Ledger mark: a ledger page with ruled lines and a highlighted entry.
export function LedgerMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ filter: "drop-shadow(0 0 6px rgba(91,139,255,0.7))" }}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="rgba(59,108,246,0.15)" stroke="#6f97ff" strokeWidth="1.5" />
      <line x1="7.5" y1="2.5" x2="7.5" y2="21.5" stroke="#6f97ff" strokeWidth="1.5" />
      <line x1="10.5" y1="8" x2="18" y2="8" stroke="#8a95ab" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="12" x2="18" y2="12" stroke="#8a95ab" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="16" x2="15" y2="16" stroke="#e8edf7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
