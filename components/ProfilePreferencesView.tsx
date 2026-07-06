"use client";

import type * as React from "react";
import { Leaf, Moon, Sun } from "lucide-react";
import { ProfileSubpageHeader } from "@/components/ProfileSubpageHeader";
import { useTheme, type Theme } from "@/lib/theme";

const THEMES: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "light",
    label: "Light",
    icon: <Sun className="h-4 w-4" />,
    description: "Warm parchment",
  },
  {
    value: "dark",
    label: "Dark",
    icon: <Moon className="h-4 w-4" />,
    description: "Midnight ink",
  },
  {
    value: "forest",
    label: "Forest",
    icon: <Leaf className="h-4 w-4" />,
    description: "Deep woodland green",
  },
];

export function ProfilePreferencesView() {
  // Shared reactive theme (lib/theme.ts): always matches the applied theme
  // and updates live if another tab changes it.
  const { theme: current, setTheme: select } = useTheme();

  return (
    <div className="space-y-6">
      <ProfileSubpageHeader title="Reading Preferences" />

      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Appearance
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => select(t.value)}
              className={[
                "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
                current === t.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-secondary",
              ].join(" ")}
              aria-pressed={current === t.value}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm">
                {t.icon}
              </span>
              <div>
                <p className="text-xs font-semibold">{t.label}</p>
                <p className="text-[10px] text-muted-foreground">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
