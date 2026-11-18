"use client";

import type { ReactNode } from "react";
import { useTheme } from "@/core/theme";
import { AppStrip } from "./AppStrip";
import s from "./shell.module.css";

// Frame for pages outside any one experiment (experiments list, Drive, research records, server status):
// the shared strip on the left, content on the right.
export function HubShell({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className={`${s.hub} ${s.hubStrip}`} data-theme={theme}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>
      <AppStrip />
      <main id="main" className={s.hubMain}>
        {children}
      </main>
    </div>
  );
}
