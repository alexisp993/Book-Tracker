"use client";

import * as React from "react";

// Single source of truth for the app theme.
//
// The theme is *applied* as classes on <html> by the pre-paint script in
// app/layout.tsx (so there is no flash), persisted in localStorage under
// "bt_theme", and read back here. Every theme UI (header toggle, Profile
// appearance picker) consumes useTheme() so they always agree with the
// actually-applied theme — including the OS dark-mode fallback used when
// nothing is stored yet.

export type Theme = "light" | "dark" | "forest";

const STORAGE_KEY = "bt_theme";
const CHANGE_EVENT = "bt:themechange";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "forest";
}

function setClasses(theme: Theme) {
  const el = document.documentElement;
  el.classList.toggle("dark", theme === "dark");
  el.classList.toggle("forest", theme === "forest");
}

/**
 * The theme currently applied to the document. Reads the <html> classes —
 * the source of truth after the boot script — so the OS-preference fallback
 * is reflected correctly even when nothing is stored.
 */
export function getResolvedTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const el = document.documentElement;
  if (el.classList.contains("forest")) return "forest";
  if (el.classList.contains("dark")) return "dark";
  return "light";
}

/** Apply + persist a theme and notify every mounted theme UI. */
export function applyTheme(theme: Theme) {
  setClasses(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Persisting is best-effort (private mode etc.); the class still applies.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: theme }));
}

function subscribe(onStoreChange: () => void) {
  const onChange = () => onStoreChange();
  // Cross-tab sync: another tab changed the theme — mirror it here too.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    if (isTheme(e.newValue)) setClasses(e.newValue);
    onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = (): Theme => "light";

/** Reactive current theme + setter, synced across components and tabs. */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const theme = React.useSyncExternalStore(
    subscribe,
    getResolvedTheme,
    getServerSnapshot,
  );
  return { theme, setTheme: applyTheme };
}
