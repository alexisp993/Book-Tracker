"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  CALENDAR_TEMPLATES,
  loadFirstUsableCover,
  readThemePalette,
  seededRandom,
  type CalendarTemplate,
} from "@/lib/calendarTemplates";
import { Band } from "@/components/ui/section";
import { cn, focusRing } from "@/lib/utils";

// Choose the background the downloaded calendar is printed on.
//
// The thumbnails are not artwork of the templates — they are the templates,
// run through the same paint function the export uses, at a smaller size. A
// hand-drawn preview would be free to flatter the result; this one can't. It
// also means a template can never be added without its preview updating.
export function CalendarTemplatePicker({
  value,
  onChange,
  coverCandidates,
}: {
  value: string;
  onChange: (id: string) => void;
  /** Cover-candidate chains from the current month, for the cover templates. */
  coverCandidates: string[][];
}) {
  const [covers, setCovers] = React.useState<HTMLImageElement[]>([]);

  // Resolved once and shared by every thumbnail, rather than each preview
  // fetching the same covers again.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded: HTMLImageElement[] = [];
      for (const chain of coverCandidates.slice(0, 4)) {
        const img = await loadFirstUsableCover(chain);
        if (img) loaded.push(img);
      }
      if (!cancelled) setCovers(loaded);
    })();
    return () => {
      cancelled = true;
    };
    // Keyed on the actual URLs so a month change refreshes the previews.
  }, [coverCandidates.map((c) => c[0]).join("|")]);

  return (
    <Band label="Download design">
      <p className="mb-4 max-w-prose text-sm text-muted-foreground">
        The background your calendar is printed on when you download it. Each
        one shows the same reading — only the paper changes.
      </p>
      <div
        role="radiogroup"
        aria-label="Calendar download design"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        {CALENDAR_TEMPLATES.map((template) => (
          <TemplateOption
            key={template.id}
            template={template}
            covers={covers}
            selected={template.id === value}
            onSelect={() => onChange(template.id)}
          />
        ))}
      </div>
    </Band>
  );
}

function TemplateOption({
  template,
  covers,
  selected,
  onSelect,
}: {
  template: CalendarTemplate;
  covers: HTMLImageElement[];
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const size = 180;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    // The same seed the export uses for this template, so the preview shows
    // the grain and blob placement the file will actually have.
    template.paint({
      ctx,
      size,
      palette: readThemePalette(),
      covers,
      rand: seededRandom(`${template.id}:preview`),
    });
  }, [template, covers]);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group flex flex-col gap-2 text-left transition-transform active:scale-[0.98]",
        focusRing,
      )}
    >
      <span
        className={cn(
          "relative block overflow-hidden rounded-xl border transition-[box-shadow,border-color]",
          selected
            ? "border-primary shadow-card-hover ring-2 ring-primary"
            : "border-border group-hover:shadow-card",
        )}
      >
        <canvas ref={ref} className="block aspect-square w-full" />
        {selected ? (
          <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{template.name}</span>
        <span className="block text-caption-sm leading-snug text-muted-foreground">
          {template.description}
        </span>
      </span>
    </button>
  );
}
