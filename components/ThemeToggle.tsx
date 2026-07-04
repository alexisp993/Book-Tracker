"use client";

import * as React from "react";
import { Leaf, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";

// Compat re-exports: theme logic now lives in lib/theme.ts (single source of
// truth shared with the Profile appearance picker).
export { applyTheme } from "@/lib/theme";
export type { Theme } from "@/lib/theme";

const CYCLE: Theme[] = ["light", "dark", "forest"];

const ICON: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  forest: <Leaf className="h-4 w-4" />,
};

const LABEL: Record<Theme, string> = {
  light: "Switch to dark mode",
  dark: "Switch to forest mode",
  forest: "Switch to light mode",
};

// Cycles through Light → Dark → Forest → Light. The current theme comes from
// useTheme() (backed by the <html> classes set pre-paint in layout.tsx), so
// the icon always matches the applied theme — including the OS fallback —
// and stays in sync when the theme is changed from the Profile picker.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function cycle() {
    setTheme(CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      aria-label={LABEL[theme]}
      title={LABEL[theme]}
    >
      {ICON[theme]}
    </button>
  );
}
