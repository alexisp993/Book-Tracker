import {
  BookMarked,
  BookOpen,
  Clock,
  Coffee,
  Compass,
  Feather,
  Flame,
  GraduationCap,
  Heart,
  Leaf,
  Library,
  Moon,
  Mountain,
  Sparkles,
  Star,
  Sun,
  type LucideIcon,
} from "lucide-react";

// Curated set a user can pick from for a collection/shelf badge. Stored as a
// stable string key on the model (Collection.icon / Shelf.icon), so the icon
// survives even if this map is reordered. `library` is the default fallback.
export const COLLECTION_ICONS = {
  library: Library,
  bookmark: BookMarked,
  heart: Heart,
  star: Star,
  mountain: Mountain,
  compass: Compass,
  moon: Moon,
  sun: Sun,
  clock: Clock,
  flame: Flame,
  coffee: Coffee,
  feather: Feather,
  sparkles: Sparkles,
  leaf: Leaf,
  graduationCap: GraduationCap,
  bookOpen: BookOpen,
} as const satisfies Record<string, LucideIcon>;

export type CollectionIconKey = keyof typeof COLLECTION_ICONS;

export const COLLECTION_ICON_KEYS = Object.keys(
  COLLECTION_ICONS,
) as CollectionIconKey[];

// Resolve a stored key to its component, falling back to the library icon for
// an unset or unknown key.
export function iconComponent(key: string | null | undefined): LucideIcon {
  if (key && key in COLLECTION_ICONS) {
    return COLLECTION_ICONS[key as CollectionIconKey];
  }
  return Library;
}
