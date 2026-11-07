import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/core/clerkAppearance";
import { ThemeProvider } from "@/core/theme";
import { LedgerProvider } from "@/data/LedgerProvider";

export const metadata: Metadata = {
  title: { default: "Alpha Ledger", template: "%s – Alpha Ledger" },
  description: "Every version of your research, and what it was built from.",
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  colorScheme: "dark",
};

// app/ only composes pages from features and sections; it holds no logic of its own.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider appearance={clerkAppearance} afterSignOutUrl="/">
          <ThemeProvider>
            <LedgerProvider>{children}</LedgerProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
