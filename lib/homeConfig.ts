// Home dashboard section registry.
// HomeSection defines the order and visibility for a user's home layout.
// Stored as JSON in User.homeConfig; merged with defaults on read, so adding a
// new key here automatically appears for existing users (customizer included).

export type HomeSectionKey =
  | "todayProgress"
  | "quickActions"
  | "continueReading"
  | "readingGoal"
  | "calendar"
  | "insights"
  | "currentlyReading"
  | "wantToRead"
  | "recentNotes"
  | "recentlyAdded"
  | "myShelves"
  | "streak";

export interface HomeSection {
  key: HomeSectionKey;
  visible: boolean;
  order: number;
}

export const SECTION_LABELS: Record<HomeSectionKey, string> = {
  todayProgress: "Overview",
  quickActions: "Quick Actions",
  continueReading: "Continue Reading",
  readingGoal: "Reading Goal",
  calendar: "Reading Calendar",
  insights: "Reading Insights",
  currentlyReading: "Currently Reading",
  wantToRead: "Want to Read",
  recentNotes: "Recent Notes",
  recentlyAdded: "Recently Added",
  myShelves: "My Shelves",
  streak: "Reading Streak",
};

// Desktop column span (out of a 6-col grid) per section — the default order +
// these spans reproduce the mockup's composition. On mobile everything is a
// single stacked column, so the spans only apply at `lg:`.
export const SECTION_SPAN: Record<HomeSectionKey, string> = {
  todayProgress: "lg:col-span-4",
  quickActions: "lg:col-span-2",
  continueReading: "lg:col-span-4",
  readingGoal: "lg:col-span-2",
  calendar: "lg:col-span-4",
  insights: "lg:col-span-2",
  currentlyReading: "lg:col-span-2",
  wantToRead: "lg:col-span-2",
  recentNotes: "lg:col-span-2",
  recentlyAdded: "lg:col-span-6",
  myShelves: "lg:col-span-6",
  streak: "lg:col-span-6",
};

// Order matches the mockup; the streak banner is off by default (redundant with
// the streak KPI in the Overview row) but remains available in the customizer.
export const DEFAULT_HOME_CONFIG: HomeSection[] = [
  { key: "todayProgress", visible: true, order: 0 },
  { key: "quickActions", visible: true, order: 1 },
  { key: "continueReading", visible: true, order: 2 },
  { key: "readingGoal", visible: true, order: 3 },
  { key: "calendar", visible: true, order: 4 },
  { key: "insights", visible: true, order: 5 },
  { key: "currentlyReading", visible: true, order: 6 },
  { key: "wantToRead", visible: true, order: 7 },
  { key: "recentNotes", visible: true, order: 8 },
  { key: "recentlyAdded", visible: true, order: 9 },
  { key: "myShelves", visible: true, order: 10 },
  { key: "streak", visible: false, order: 11 },
];

export const ALL_SECTION_KEYS: HomeSectionKey[] = DEFAULT_HOME_CONFIG.map(
  (s) => s.key,
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

  // Merge in any missing sections (from DEFAULT_HOME_CONFIG) at the end —
  // this is what surfaces newly-added keys for existing users.
  for (const def of DEFAULT_HOME_CONFIG) {
    if (!seen.has(def.key)) {
      valid.push({ ...def, order: valid.length });
    }
  }

  return valid.sort((a, b) => a.order - b.order);
}
