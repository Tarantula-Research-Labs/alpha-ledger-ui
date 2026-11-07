"use client";

import { useTheme } from "@/core/theme";
import { MoonIcon, SunIcon } from "@/core/ui/icons";
import s from "./shell.module.css";

// Switches the app between the light (graphite) and dark themes.
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "light" ? "dark" : "light";
  return (
    <button type="button" className={s.themeToggle} onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      <span className={s.themeOption} data-on={theme === "light"}>
        <SunIcon />
      </span>
      <span className={s.themeOption} data-on={theme === "dark"}>
        <MoonIcon />
      </span>
    </button>
  );
}
