// Deterministically maps a name (e.g. a shelf/collection name) to one of a
// small fixed set of color tints, so the same name always renders the same
// color without needing to persist anything on the model. Mirrors the shape
// of StatsView's TINTS palette, but kept standalone since this is used for
// decorative badges/icons, not stat cards.
export const GROUP_TINTS = {
  blue: {
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    solid: "bg-blue-500",
  },
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    solid: "bg-emerald-500",
  },
  amber: {
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    solid: "bg-amber-500",
  },
  violet: {
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    solid: "bg-violet-500",
  },
  rose: {
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    solid: "bg-rose-500",
  },
  teal: {
    badge: "bg-teal-500/15 text-teal-600 dark:text-teal-300",
    solid: "bg-teal-500",
  },
} as const;

export type GroupTintKey = keyof typeof GROUP_TINTS;

const TINT_KEYS = Object.keys(GROUP_TINTS) as GroupTintKey[];

// Simple, stable string hash (sum of char codes, weighted by position so
// anagram-ish names don't collide as often) mod palette length.
export function colorForName(name: string): GroupTintKey {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % TINT_KEYS.length;
  return TINT_KEYS[idx];
}
