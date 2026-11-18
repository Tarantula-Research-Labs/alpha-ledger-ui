// The Alpha Ledger logo. LedgerMark = the α icon alone (small places).
// LedgerLogo = icon + "Alpha-Ledger" name (white text: both app themes are dark). Images live in public/brand.
import m from "./ledger-logo.module.css";

export function LedgerMark({ size = 24 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/icon.webp" width={size} height={size} alt="" aria-hidden="true" className={m.mark} />;
}

/** Full logo, `height` px tall (width follows the image: about 4.5 × height). */
export function LedgerLogo({ height = 40, className }: { height?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/logo.webp" width={Math.round(height * 4.5)} height={height} alt="Alpha-Ledger" className={`${m.logo} ${className ?? ""}`} />;
}
