"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useTheme } from "@/core/theme";
import { AppHeader } from "./AppHeader";
import { AppStrip } from "./AppStrip";
import s from "./shell.module.css";

// Frame for pages outside any one experiment (experiments list, Drive, research records, server status):
// the header on top, the page strip on the left, content on the right.
// The Study page uses the full width, for reading.
export function HubShell({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const wide = usePathname().startsWith("/study");
  return (
    <div className={s.hub} data-theme={theme}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <AppHeader />
      <div className={s.hubBody}>
        <AppStrip />
        <main id="main" className={wide ? `${s.hubMain} ${s.hubMainWide}` : s.hubMain}>
          {children}
        </main>
      </div>
    </div>
  );
}
