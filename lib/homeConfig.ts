// Home dashboard section registry.
// HomeSection defines the order and visibility for a user's home layout.
// Stored as JSON in User.homeConfig; merged with defaults on read.

export type HomeSectionKey =
  | "streak"
  | "continueReading"
  | "todayProgress"
  | "readingGoal"
  | "currentlyReading"
  | "wantToRead"
  | "recentlyAdded"
  | "myShelves"
  | "calendar"
  | "quickActions";

export interface HomeSection {
  key: HomeSectionKey;
  visible: boolean;
  order: number;
}

export const SECTION_LABELS: Record<HomeSectionKey, string> = {
  streak: "Reading Streak",
  continueReading: "Continue Reading",
  todayProgress: "Today's Progress",
  readingGoal: "Reading Goal",
  currentlyReading: "Currently Reading",
  wantToRead: "Want to Read",
  recentlyAdded: "Recently Added",
  myShelves: "My Shelves",
  calendar: "Reading Calendar",
  quickActions: "Quick Actions",
};

export const ALL_SECTION_KEYS: HomeSectionKey[] = [
  "streak",
  "continueReading",
  "todayProgress",
  "readingGoal",
  "currentlyReading",
  "wantToRead",
  "recentlyAdded",
  "myShelves",
  "calendar",
  "quickActions",
];

export const DEFAULT_HOME_CONFIG: HomeSection[] = ALL_SECTION_KEYS.map(
  (key, i) => ({ key, visible: true, order: i }),
);

// Validates and normalises a raw parsed value into a HomeSection[].
// Merges with defaults so any missing keys are always present.
export function validateHomeConfig(raw: unknown): HomeSection[] {
  if (!Array.isArray(raw)) return DEFAULT_HOME_CONFIG;

  const seen = new Set<HomeSectionKey>();
  const valid: HomeSection[] = [];

  for (const item of raw) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as Record<string, unknown>).key !== "string" ||
      typeof (item as Record<string, unknown>).visible !== "boolean" ||
      typeof (item as Record<string, unknown>).order !== "number"
    ) {
      continue;
    }
    const key = (item as Record<string, unknown>).key as HomeSectionKey;
    if (!ALL_SECTION_KEYS.includes(key) || seen.has(key)) continue;
    seen.add(key);
    valid.push({
      key,
      visible: (item as HomeSection).visible,
      order: (item as HomeSection).order,
    });
  }

  // Merge in any missing sections (from DEFAULT_HOME_CONFIG) at the end
  for (const def of DEFAULT_HOME_CONFIG) {
    if (!seen.has(def.key)) {
      valid.push({ ...def, order: valid.length });
    }
  }

  return valid.sort((a, b) => a.order - b.order);
}
