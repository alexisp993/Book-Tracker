"use client";

import * as React from "react";
import { BookOpen, ChevronLeft, ChevronRight, Clock, Download } from "lucide-react";
import { MOOD_EMOJI, MOOD_LABELS } from "@/lib/constants";
import { useCalendar } from "@/lib/queries";
import { FallbackCoverImg, CellCover } from "@/components/FallbackCoverImg";
import {
  buildMonthCalendarViewModel,
  BUCKET_VARS,
  BUCKET_CLASS,
  type MonthCalendarViewModel,
} from "@/lib/calendarViewModel";
import { formatDuration } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { withCalendarTransition } from "@/lib/viewTransition";
import type { CalendarDay } from "@/lib/api";

// Canvas palette read from the active theme's CSS variables at export time,
// so the downloaded image mirrors whatever theme is live (default / dark /
// forest / any future theme) instead of a fixed palette. A <canvas> can't
// consume CSS variables directly, so we resolve them to concrete hsla()
// strings here. Runs client-side only (downloadCalendarImage is click-driven).
interface CanvasPalette {
  background: string;
  card: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  bucketFill: string[]; // [0..4], mirroring the shared BUCKET_CLASS ramp
  emptyCell: string;
  texture: string;
  badgeBg: string;
}

function readThemePalette(): CanvasPalette {
  const cs = getComputedStyle(document.documentElement);
  // CSS vars are stored as an "H S% L%" triple (e.g. "36 28% 97%").
  const hsl = (name: string, alpha = 1): string => {
    const triple = cs.getPropertyValue(name).trim();
    const [h, s, l] = triple.split(/\s+/);
    // hsla(H, S%, L%, A) — the most cross-browser-safe canvas color form.
    return `hsla(${h}, ${s}, ${l}, ${alpha})`;
  };
  // The green heat vars are stored as plain hex, usable directly as canvas
  // fillStyle (no HSL conversion needed).
  const raw = (name: string): string => cs.getPropertyValue(name).trim();
  return {
    background: hsl("--background"),
    card: hsl("--card"),
    border: hsl("--border"),
    foreground: hsl("--foreground"),
    mutedForeground: hsl("--muted-foreground"),
    primary: hsl("--primary"),
    // The shared green intensity ramp (lib/calendarViewModel.ts) read straight
    // from its CSS vars, so the exported image matches the on-screen heatmap.
    bucketFill: BUCKET_VARS.map(raw),
    // --heat-0, the same var the live grid paints an empty day with
    // (BUCKET_CLASS[0] in lib/calendarViewModel.ts). This was `--muted` at
    // 20%, so the exported PNG quietly disagreed with the screen on every
    // zero-reading day.
    emptyCell: raw("--heat-0"),
    texture: hsl("--foreground", 0.03),
    badgeBg: hsl("--background", 0.8),
  };
}

// ---------------------------------------------------------------------------
// Canvas-based social share card (1080×1080, no external dependencies).
// Consumes the exact same MonthCalendarViewModel the live grid below
// renders from — same cell-to-day mapping, same intensity buckets, same
// cover-candidate resolution, same summary totals. No separate calculation
// path exists here anymore.
// ---------------------------------------------------------------------------
async function downloadCalendarImage(viewModel: MonthCalendarViewModel) {
  const { monthLabel, weekdayLabels, cells, summary } = viewModel;

  const W = 1080;
  const PAD = 72;
  const GAP = 10;
  const HEADER_H = 160;
  const LABEL_H = 48;
  const FOOTER_H = 100;

  // Portrait cells (2:3), matching the live grid's aspect-[2/3] day cells.
  const CELL_W = Math.floor((W - PAD * 2 - GAP * 6) / 7);
  const CELL_H = Math.round(CELL_W * 1.5);

  const rows = cells.length / 7;
  const gridH = rows * CELL_H + (rows - 1) * GAP;
  const H = HEADER_H + LABEL_H + gridH + FOOTER_H + PAD * 2;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Resolve the active theme's colors so the export matches the live UI.
  const palette = readThemePalette();

  // Background
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid texture (very faint)
  ctx.strokeStyle = palette.texture;
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Card rect — filled + a subtle border so it stays delineated even on
  // light themes where the card color is close to the background.
  const CARD_PAD = 40;
  roundRect(ctx, CARD_PAD, CARD_PAD, W - CARD_PAD * 2, H - CARD_PAD * 2, 32);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  // "Book Tracker" brand — a small vector book mark (a canvas can't render a
  // Lucide component, so the glyph is drawn by hand) instead of an emoji, which
  // renders inconsistently across platforms and reads as a UI icon.
  const markY = PAD + 30;
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  roundRect(ctx, PAD, markY, 26, 30, 4);
  ctx.fill();
  ctx.strokeStyle = palette.card;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD + 13, markY + 4);
  ctx.lineTo(PAD + 13, markY + 26);
  ctx.stroke();
  ctx.font = "600 28px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = palette.primary;
  ctx.textAlign = "left";
  ctx.fillText("Book Tracker", PAD + 40, PAD + 52);

  // Month + Year — same monthLabel string the live header shows
  ctx.font = `700 64px -apple-system, system-ui, sans-serif`;
  ctx.fillStyle = palette.foreground;
  ctx.textAlign = "center";
  ctx.fillText(monthLabel, W / 2, PAD + 136);

  // Day-of-week labels — same order as the live grid's WEEKDAY_LABELS
  const labelY = PAD + HEADER_H + 28;
  ctx.font = "600 24px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = palette.mutedForeground;
  ctx.textAlign = "center";
  for (let d = 0; d < 7; d++) {
    const x = PAD + d * (CELL_W + GAP) + CELL_W / 2;
    ctx.fillText(weekdayLabels[d], x, labelY);
  }

  // Calendar grid — iterates the same cells[] the live grid maps over
  const gridY = PAD + HEADER_H + LABEL_H;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const col = i % 7;
    const row = Math.floor(i / 7);
    const x = PAD + col * (CELL_W + GAP);
    const y = gridY + row * (CELL_H + GAP);

    if (cell.day === null) {
      // Empty leading/trailing cell
      ctx.fillStyle = palette.emptyCell;
      roundRect(ctx, x, y, CELL_W, CELL_H, 14);
      ctx.fill();
      continue;
    }

    // Cell background
    ctx.fillStyle = palette.bucketFill[cell.bucket];
    roundRect(ctx, x, y, CELL_W, CELL_H, 14);
    ctx.fill();

    // Draw the most-recently-read book's cover — same fallback-chain walk
    // used live, so a missing/dead first candidate doesn't leave the cell
    // blank when a later candidate would have worked.
    let coverLoaded = false;
    for (const candidate of cell.coverCandidates) {
      try {
        const img = await loadImage(candidate);
        if (img.naturalWidth <= 2) continue; // Amazon 1x1 placeholder
        ctx.save();
        roundRect(ctx, x, y, CELL_W, CELL_H, 14);
        ctx.clip();
        // Cropped-to-fill (matches CSS object-cover on the live grid),
        // full opacity + top scrim.
        drawCoverFit(ctx, img, x, y, CELL_W, CELL_H);
        const scrim = ctx.createLinearGradient(x, y, x, y + 44);
        scrim.addColorStop(0, "rgba(0,0,0,0.6)");
        scrim.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = scrim;
        ctx.fillRect(x, y, CELL_W, 44);
        ctx.restore();
        coverLoaded = true;
        break;
      } catch {
        // Try the next candidate.
      }
    }

    // Day number — small, top-left, matching the live cell's self-start
    // placement instead of a large centered digit. Over a cover the dark
    // scrim is theme-independent so white always reads; otherwise use the
    // theme's foreground (and white on the strongest bucket for contrast
    // against the near-solid primary fill).
    ctx.font = `700 22px -apple-system, system-ui, sans-serif`;
    ctx.fillStyle = coverLoaded || cell.bucket >= 4 ? "#ffffff" : palette.foreground;
    ctx.textAlign = "left";
    ctx.fillText(String(cell.day), x + 14, y + 28);
    ctx.textAlign = "center"; // restore default used elsewhere in this function

    // "+N" badge for extra books read that day
    if (cell.extraBookCount > 0) {
      const badgeR = 18;
      const bx = x + CELL_W - badgeR - 6;
      const by = y + CELL_H - badgeR - 6;
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = palette.badgeBg;
      ctx.fill();
      ctx.font = "700 18px -apple-system, system-ui, sans-serif";
      ctx.fillStyle = palette.foreground;
      ctx.textAlign = "center";
      ctx.fillText(`+${cell.extraBookCount}`, bx, by + 6);
    } else if (!coverLoaded && cell.hasData) {
      // Activity dot only when there's no cover taking its place.
      ctx.beginPath();
      ctx.arc(x + CELL_W / 2, y + CELL_H - 16, 4, 0, Math.PI * 2);
      ctx.fillStyle = palette.primary;
      ctx.fill();
    }
  }

  // Stats footer — from the same summary the view model computes
  const statsY = gridY + gridH + 48;
  ctx.font = "500 26px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = palette.mutedForeground;
  ctx.textAlign = "center";
  const parts = [
    `${summary.daysRead} day${summary.daysRead === 1 ? "" : "s"} read`,
    summary.totalMinutes > 0 ? formatDuration(summary.totalMinutes) : null,
    summary.totalPages > 0 ? `${summary.totalPages} pages` : null,
  ].filter(Boolean);
  ctx.fillText(parts.join("  ·  "), W / 2, statsY);

  // Download
  const yearMonth = cells.find((c) => c.dateKey)?.dateKey?.slice(0, 7) ?? "";
  const a = document.createElement("a");
  a.download = `reading-calendar-${yearMonth}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

// CSS object-cover equivalent: crops the wider or taller side of the source
// image so it fills the destination rect without distorting its aspect
// ratio, instead of ctx.drawImage's default stretch-to-fill.
function drawCoverFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / img.height;
  const destRatio = w / h;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgRatio > destRatio) {
    sh = img.height;
    sw = sh * destRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / destRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CalendarView() {
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const { data: calData = [], isLoading } = useCalendar(year, month);

  // Single source of truth for this month's grid — the live JSX below and
  // downloadCalendarImage() both render from this same view model, so they
  // can never disagree on day placement, cover choice, or summary totals.
  const viewModel = React.useMemo(
    () => buildMonthCalendarViewModel(year, month, calData, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, month, calData],
  );

  // /impeccable overdrive: the month label slides the way you're navigating
  // (native View Transitions, no library — see lib/viewTransition.ts). No-op
  // on browsers without support, so this can never regress the plain instant
  // swap the calendar has always had.
  function prevMonth() {
    withCalendarTransition("prev", () => {
      if (month === 1) { setYear(y => y - 1); setMonth(12); }
      else setMonth(m => m - 1);
      setSelectedDate(null);
    });
  }
  function nextMonth() {
    withCalendarTransition("next", () => {
      if (month === 12) { setYear(y => y + 1); setMonth(1); }
      else setMonth(m => m + 1);
      setSelectedDate(null);
    });
  }
  function canGoNext() {
    return year < today.getFullYear() ||
      (year === today.getFullYear() && month < today.getMonth() + 1);
  }

  const selectedDay = selectedDate
    ? viewModel.cells.find((c) => c.dateKey === selectedDate)?.data ?? null
    : null;

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadCalendarImage(viewModel);
    } finally {
      setDownloading(false);
    }
  }

  return (
    // Width is capped by the page wrapper (app/calendar/page.tsx) so the
    // heading and the grid share one left edge; the cells are aspect-[2/3] and
    // stretched to ~178x265px when the shell went full-width.
    <div className="space-y-4">
      {/* Month navigation + download */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <p
          className="font-display text-base font-semibold"
          style={{ viewTransitionName: "calendar-month-label" } as React.CSSProperties}
        >
          {viewModel.monthLabel}
        </p>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || calData.length === 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary disabled:opacity-40"
            aria-label="Download calendar image"
            title="Download as image"
          >
            {downloading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={nextMonth}
            disabled={!canGoNext()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary disabled:opacity-40"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {viewModel.weekdayLabels.map((d) => (
          <p key={d} className="pb-1 text-caption-sm font-medium text-muted-foreground">
            {d}
          </p>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <Loading label="Loading your calendar…" />
      ) : (
        <div
          className="grid grid-cols-7 gap-1"
          style={{ viewTransitionName: "calendar-month-grid" } as React.CSSProperties}
        >
          {viewModel.cells.map((cell, i) => {
            if (cell.day === null || cell.dateKey === null) {
              return <div key={`empty-${i}`} />;
            }
            const isSelected = selectedDate === cell.dateKey;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : cell.dateKey)}
                className={[
                  "relative flex aspect-[2/3] w-full flex-col rounded-xl border transition-all",
                  isSelected
                    ? "border-primary ring-2 ring-primary"
                    : cell.hasData
                    ? "border-border/40 hover:border-border"
                    : "border-transparent hover:border-border/40",
                  !cell.hasCover && cell.bucket > 0
                    ? BUCKET_CLASS[cell.bucket]
                    : !cell.hasData
                    ? "bg-muted/20"
                    : "",
                ].join(" ")}
                aria-label={`${cell.dateKey}${cell.data ? `, ${cell.data.totalMinutes} min` : ""}`}
              >
                {/* Cover image — clipped by <span>, not by the button, to avoid
                    the iOS Safari overflow:hidden+border-radius button bug.
                    Walks the full ISBN fallback chain, so a book with no
                    stored Book.coverUrl still shows art here. */}
                {cell.hasCover ? <CellCover candidates={cell.coverCandidates} /> : null}

                {/* Day number. Over a cover it sits in a translucent chip
                    rather than relying on a top gradient + white text: every
                    cover candidate can still fail to load (CellCover then
                    renders nothing), which left a dark bar and invisible white
                    text on an otherwise empty cell. A chip reads correctly
                    whether or not artwork actually painted. */}
                <span
                  className={[
                    "relative z-20 text-[10px] font-semibold leading-none self-start",
                    cell.hasCover
                      ? "m-1 rounded-md bg-background/85 px-1 py-0.5 text-foreground backdrop-blur-sm"
                      : cell.isToday
                      ? "px-1 pt-0.5 text-primary"
                      : "px-1 pt-0.5 text-foreground",
                  ].join(" ")}
                >
                  {cell.day}
                </span>

                {/* "+N" badge when multiple books were read that day.
                    text-[10px] is the design system's documented micro floor
                    (MASTER.md §12 A2) — this badge was the one place still
                    under it (text-[9px]), found via /impeccable typeset. */}
                {cell.extraBookCount > 0 ? (
                  <span className="absolute bottom-1 right-1 z-20 rounded-full bg-black/60 px-1 text-[10px] font-semibold leading-[14px] text-white">
                    +{cell.extraBookCount}
                  </span>
                ) : !cell.hasCover && cell.hasData ? (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Day detail panel */}
      {selectedDay ? (
        <DayDetail day={selectedDay} />
      ) : null}
    </div>
  );
}

function DayDetail({ day }: { day: CalendarDay }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{day.date}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {day.totalMinutes > 0 ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
              {formatDuration(day.totalMinutes)}
            </span>
          ) : null}
          {day.totalPages > 0 ? (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
              {day.totalPages} pages
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {day.sessions.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-12 w-8 shrink-0 overflow-hidden rounded-lg border bg-muted">
              <FallbackCoverImg candidates={s.coverCandidates} alt={s.bookTitle} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-medium">{s.bookTitle}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  s.minutes ? formatDuration(s.minutes) : null,
                  s.pagesRead ? `${s.pagesRead} pages` : null,
                  s.mood
                    ? `${MOOD_EMOJI[s.mood as keyof typeof MOOD_EMOJI] ?? ""} ${MOOD_LABELS[s.mood as keyof typeof MOOD_LABELS] ?? s.mood}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {s.note ? (
                <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground/80">
                  “{s.note}”
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
