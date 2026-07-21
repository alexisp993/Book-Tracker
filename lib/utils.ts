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
