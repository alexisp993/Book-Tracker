"use client";

import * as React from "react";
import { Leaf, Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark" | "forest";

export function applyTheme(theme: Theme) {
  const el = document.documentElement;
  el.classList.toggle("dark", theme === "dark");
  el.classList.toggle("forest", theme === "forest");
  localStorage.setItem("bt_theme", theme);
}

function readCurrentTheme(): Theme {
  try {
    const stored = localStorage.getItem("bt_theme") as Theme | null;
    if (stored === "dark" || stored === "forest") return stored;
    return "light";
  } catch {
    return "light";
  }
}

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

// Cycles through Light → Dark → Forest → Light.
// Initial theme is read from localStorage (set by the blocking script in
// layout.tsx), so the icon matches instantly with no flash.
export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    setTheme(readCurrentTheme());
  }, []);

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    applyTheme(next);
    setTheme(next);
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
