import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-sans/300.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { LedgerProvider } from "@/data/LedgerProvider";

export const metadata: Metadata = {
  title: { default: "Alpha Ledger", template: "%s – Alpha Ledger" },
  description: "Every version of your research, and what it was built from.",
};

export const viewport: Viewport = {
  themeColor: "#141b29",
  colorScheme: "dark",
};

// app/ only composes pages from features and sections; it holds no logic of its own.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LedgerProvider>{children}</LedgerProvider>
      </body>
    </html>
  );
}
