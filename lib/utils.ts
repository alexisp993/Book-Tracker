import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Conditional className helper (clsx + tailwind-merge), the standard shadcn cn().
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on",
  "or", "the", "to", "up", "vs", "via",
]);

// Capitalizes a single already-lowercased/whole-word token. Handles the
// letter after an apostrophe for names (o'brien -> O'Brien) while leaving a
// trailing possessive 's lowercase (mcdonald's -> Mcdonald's, not Mcdonald'S),
// and the well-known "Mc" surname-prefix convention (mcdonald -> McDonald).
// ("Mac" is deliberately not special-cased — too many ordinary words start
// with it: machine, magic, macro.)
function capitalizeWord(word: string): string {
  if (!word) return word;
  const parts = word.toLowerCase().split("'");
  const cased = parts.map((part, i) => {
    if (i > 0 && part === "s") return part; // possessive 's stays lowercase
    let capped = part.charAt(0).toUpperCase() + part.slice(1);
    if (/^mc[a-z]/.test(part)) {
      capped = "Mc" + capped.charAt(2).toUpperCase() + capped.slice(3);
    }
    return capped;
  });
  return cased.join("'");
}

// Title-cases a string while leaving already-mixed-case words (iPhone,
// eBay, McDonald's) and short all-caps acronyms (NASA, UK) untouched, and
// lowercasing minor words (the, of, a, ...) except at the start/end or right
// after a colon. Used to normalize book titles/authors whose source data
// (mainly Open Library) is sometimes all-lowercase.
export function toTitleCase(value: string): string {
  if (!value) return value;
  const words = value.split(/\s+/);

  const cased = words.map((word) => {
    const hyphenParts = word.split("-");
    const casedParts = hyphenParts.map((part) => {
      const letters = part.replace(/[^a-zA-Z]/g, "");
      const hasInternalUpper = /[A-Z]/.test(part.slice(1));
      const isAllUpper = letters.length > 0 && letters === letters.toUpperCase();
      if (hasInternalUpper && !isAllUpper) return part; // e.g. iPhone, eBay
      if (isAllUpper && letters.length <= 4) return part; // e.g. NASA, UK
      return capitalizeWord(part);
    });
    return casedParts.join("-");
  });

  return cased
    .map((word, i) => {
      const isEdge = i === 0 || i === cased.length - 1;
      const afterColon = i > 0 && words[i - 1].endsWith(":");
      if (!isEdge && !afterColon && MINOR_WORDS.has(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word;
    })
    .join(" ");
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// THE keyboard focus treatment for the whole app.
//
// Every shared primitive (ui/button, ui/list, ui/tabs) already spells this
// out inline, which is exactly why a hand-written surface can silently ship
// without any focus ring at all — SuggestionSection did, and an audit caught
// it only by reading computed styles. Import this instead of retyping the
// classes, so "did you remember the ring?" stops being a per-file judgment
// call.
//
// `focusRing` sits outside the element (buttons, cards, standalone controls).
// `focusRingInset` draws inside the bounds, for rows and tiles that sit flush
// against a container edge where an outset ring would be clipped.
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const focusRingInset =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

// Expands a control's *tappable* region to the 44×44 minimum in MASTER.md
// §A3 without inflating how big it looks — the doc's own prescribed fix
// ("enlarge, or add invisible padding to hit-area"). A centred transparent
// pseudo-element does the work; `min-h-full`/`min-w-full` keep it from ever
// shrinking a control that's already larger.
//
// Only for controls with clear space around them. Do NOT put this on items
// in a dense row: neighbouring invisible regions would overlap and steal
// each other's taps, which is worse than the small target it fixes.
export const hitArea =
  "relative after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:min-h-full after:min-w-full after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";

// THE duration format for the whole app. Two components previously carried
// their own copies of this, so the same session read "45 min" on /sessions and
// "45m" on /calendar. Import this one; don't re-declare it.
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "In progress";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
