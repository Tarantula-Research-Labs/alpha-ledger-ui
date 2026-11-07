"use client";

// Light / dark theme for the app pages (the landing page has its own fixed look).
// "light" is the graphite design; "dark" is the black design with contour lines and steel-blue accents.
// The choice is remembered in this browser only.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
const KEY = "alpha-ledger-theme";
const DEFAULT_THEME: Theme = "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: DEFAULT_THEME, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      // Storage can be unavailable (private windows, blocked site data): keep the default.
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(KEY, next);
      } catch {
        // Not remembered, but the switch still works for this visit.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
