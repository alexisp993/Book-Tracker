"use client";

import * as React from "react";
import { BookOpen, ChevronLeft, ChevronRight, Clock, Download } from "lucide-react";
import { MOOD_EMOJI, MOOD_LABELS } from "@/lib/constants";
import { useCalendar, useSessionStats } from "@/lib/queries";
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
async function downloadCalendarImage(
  viewModel: MonthCalendarViewModel,
  streakDays: number,
) {
  const { monthLabel, weekdayLabels, cells, summary } = viewModel;

  // The month title is set in the app's serif, which only resolves on canvas
  // once the webfont has actually loaded — otherwise the browser silently
  // substitutes and the export gets a different typeface from the screen.
  try {
    await document.fonts.ready;
  } catch {
    // Font loading API unavailable: the stack below falls back to Georgia.
  }

  const W = 1080;
  const PAGE_PAD = 28; // paper visible around the card
  const PAD = 56; // content inset inside the card
  const GAP = 10;

  const CARD_X = PAGE_PAD;
  const CARD_W = W - PAGE_PAD * 2;
  const CONTENT_X = CARD_X + PAD;
  const CONTENT_W = CARD_W - PAD * 2;

  // Portrait cells, close to the reference's 1:1.42 — tall enough to seat a
  // book cover, short enough that six rows don't run off the card.
  const CELL_W = Math.floor((CONTENT_W - GAP * 6) / 7);
  const CELL_H = Math.round(CELL_W * 1.42);

  const HEADER_H = 214; // brand + month + subtitle/legend row
  const LABEL_H = 44; // weekday row
  const FOOTER_H = 104; // stats panel
  const FOOTER_GAP = 34;

  const rows = cells.length / 7;
  const gridH = rows * CELL_H + (rows - 1) * GAP;
  const H =
    PAGE_PAD * 2 + PAD * 2 + HEADER_H + LABEL_H + gridH + FOOTER_GAP + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const palette = readThemePalette();
  const serif = `"Literata", Georgia, "Times New Roman", serif`;
  const sans = `-apple-system, "Segoe UI", system-ui, sans-serif`;

  // Paper ground
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, W, H);

  // The card. A soft drop shadow lifts it off the paper the way the live
  // surfaces do; the hairline keeps it delineated on light themes where card
  // and background are only a few percent apart.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.10)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, CARD_X, CARD_X, CARD_W, H - CARD_X * 2, 32);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, CARD_X, CARD_X, CARD_W, H - CARD_X * 2, 32);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // --- Header -------------------------------------------------------------

  const brandY = CARD_X + PAD;
  const BADGE = 44;

  // Tinted badge behind the mark, matching the reference's soft square chip.
  roundRect(ctx, CONTENT_X, brandY, BADGE, BADGE, 14);
  ctx.fillStyle = withAlpha(palette.primary, 0.12);
  ctx.fill();
  drawBookGlyph(ctx, CONTENT_X + BADGE / 2, brandY + BADGE / 2, 20, palette.primary);

  ctx.font = `700 22px ${sans}`;
  ctx.fillStyle = palette.primary;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Book Tracker", CONTENT_X + BADGE + 16, brandY + BADGE / 2 + 1);

  // Month — the one display moment, set in the serif like every other title
  // in the app.
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 52px ${serif}`;
  ctx.fillStyle = palette.foreground;
  const titleBaseline = brandY + BADGE + 74;
  ctx.fillText(monthLabel, CONTENT_X, titleBaseline);

  // Caption. The on-screen version says "Hover a day to see details", which is
  // nonsense in a downloaded image — it says what the picture is instead.
  ctx.font = `400 15px ${sans}`;
  ctx.fillStyle = palette.mutedForeground;
  const captionY = titleBaseline + 32;
  ctx.fillText("A calendar of your reading days.", CONTENT_X, captionY);

  // Legend, right-aligned on the caption line. Ordered Less -> More, light ->
  // dark: the reference art has "More" beside its palest swatch, which reads
  // backwards against its own ramp.
  const SW = 18;
  const SW_GAP = 6;
  const ramp = [palette.emptyCell, ...palette.bucketFill];
  const rampW = ramp.length * SW + (ramp.length - 1) * SW_GAP;
  ctx.font = `500 14px ${sans}`;
  const moreW = ctx.measureText("More").width;
  const legendRight = CONTENT_X + CONTENT_W;
  const rampX = legendRight - moreW - 10 - rampW;

  ctx.textAlign = "right";
  ctx.fillStyle = palette.mutedForeground;
  ctx.fillText("Less", rampX - 10, captionY);
  ctx.textAlign = "left";
  ctx.fillText("More", legendRight - moreW, captionY);

  for (let i = 0; i < ramp.length; i++) {
    roundRect(ctx, rampX + i * (SW + SW_GAP), captionY - 14, SW, SW, 5);
    ctx.fillStyle = ramp[i];
    ctx.fill();
  }

  // --- Weekday labels -----------------------------------------------------

  const labelY = CARD_X + PAD + HEADER_H + 20;
  ctx.font = `500 15px ${sans}`;
  ctx.fillStyle = palette.mutedForeground;
  ctx.textAlign = "center";
  for (let d = 0; d < 7; d++) {
    ctx.fillText(weekdayLabels[d], CONTENT_X + d * (CELL_W + GAP) + CELL_W / 2, labelY);
  }

  // --- Grid ---------------------------------------------------------------

  // The structural change from the previous export: the cell is a calm light
  // tile and the reading intensity is a small swatch *inside* it, rather than
  // the intensity colouring the whole cell and a cover bleeding edge to edge
  // under a dark scrim. Covers read as objects sitting on the calendar, the
  // day numbers stay dark on light at every intensity, and a quiet month no
  // longer looks like a wall of colour blocks.
  const gridY = CARD_X + PAD + HEADER_H + LABEL_H;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const col = i % 7;
    const row = Math.floor(i / 7);
    const x = CONTENT_X + col * (CELL_W + GAP);
    const y = gridY + row * (CELL_H + GAP);

    const outside = cell.day === null;

    ctx.save();
    if (outside) ctx.globalAlpha = 0.45;

    roundRect(ctx, x, y, CELL_W, CELL_H, 16);
    ctx.fillStyle = palette.emptyCell;
    ctx.fill();

    if (outside) {
      ctx.restore();
      continue;
    }

    // Day number, top-left. Always dark on light now, so there's no
    // white-over-scrim special case to get wrong.
    ctx.font = `600 16px ${sans}`;
    ctx.fillStyle = palette.foreground;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(String(cell.day), x + 12, y + 26);

    const centreX = x + CELL_W / 2;
    const sessionCount = cell.data?.sessions.length ?? 0;
    const dotsH = sessionCount > 0 ? 14 : 0;
    // Content sits in the space below the day number, centred in what's left.
    const contentTop = y + 34;
    const contentH = CELL_H - 34 - 12 - dotsH;
    const contentMid = contentTop + contentH / 2;

    let coverLoaded = false;
    if (cell.hasCover) {
      for (const candidate of cell.coverCandidates) {
        try {
          const img = await loadImage(candidate);
          if (img.naturalWidth <= 2) continue; // Amazon 1x1 placeholder
          const cw = Math.min(CELL_W - 34, 64);
          const ch = Math.round(cw * 1.45);
          const cx = centreX - cw / 2;
          const cy = contentMid - ch / 2;

          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.22)";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 3;
          roundRect(ctx, cx, cy, cw, ch, 5);
          ctx.fillStyle = palette.card;
          ctx.fill();
          ctx.restore();

          ctx.save();
          roundRect(ctx, cx, cy, cw, ch, 5);
          ctx.clip();
          drawCoverFit(ctx, img, cx, cy, cw, ch);
          ctx.restore();

          coverLoaded = true;
          break;
        } catch {
          // Try the next candidate.
        }
      }
    }

    // No cover: the intensity swatch stands in for it, which is what gives a
    // month without cover art a readable shape at a glance.
    if (!coverLoaded && cell.bucket > 0) {
      const s = 30;
      roundRect(ctx, centreX - s / 2, contentMid - s / 2, s, s, 8);
      ctx.fillStyle = palette.bucketFill[cell.bucket];
      ctx.fill();
    }

    // One dot per session, capped so a heavy day doesn't overflow the cell.
    if (sessionCount > 0) {
      const shown = Math.min(sessionCount, 4);
      const dotR = 3.5;
      // Centre-to-centre, so it has to exceed the diameter or the dots touch
      // and four sessions render as one solid bar.
      const step = 11;
      let dx = centreX - ((shown - 1) * step) / 2;
      const dy = y + CELL_H - 16;
      ctx.fillStyle = palette.primary;
      for (let d = 0; d < shown; d++) {
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fill();
        dx += step;
      }
    }

    ctx.restore();
  }

  // --- Stats footer -------------------------------------------------------

  const footY = gridY + gridH + FOOTER_GAP;
  roundRect(ctx, CONTENT_X, footY, CONTENT_W, FOOTER_H, 20);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const stats: { glyph: Glyph; value: string; label: string }[] = [
    {
      glyph: "book",
      value: `${summary.daysRead} day${summary.daysRead === 1 ? "" : "s"}`,
      label: "Days read",
    },
    {
      glyph: "clock",
      value: summary.totalMinutes > 0 ? formatDuration(summary.totalMinutes) : "—",
      label: "Time read",
    },
    {
      glyph: "pages",
      value: summary.totalPages > 0 ? String(summary.totalPages) : "—",
      label: "Pages read",
    },
    {
      glyph: "flame",
      value: streakDays > 0 ? `${streakDays} day${streakDays === 1 ? "" : "s"}` : "—",
      label: "Current streak",
    },
  ];

  const colW = CONTENT_W / stats.length;
  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const cx = CONTENT_X + i * colW;

    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, footY + 22);
      ctx.lineTo(cx, footY + FOOTER_H - 22);
      ctx.strokeStyle = palette.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const badgeR = 21;
    const bx = cx + 30 + badgeR;
    const by = footY + FOOTER_H / 2;
    ctx.beginPath();
    ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(palette.primary, 0.12);
    ctx.fill();
    drawStatGlyph(ctx, s.glyph, bx, by, palette.primary);

    const textX = bx + badgeR + 16;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 24px ${serif}`;
    ctx.fillStyle = palette.foreground;
    ctx.fillText(s.value, textX, by - 2);
    ctx.font = `400 13px ${sans}`;
    ctx.fillStyle = palette.mutedForeground;
    ctx.fillText(s.label, textX, by + 18);
  }

  // Download
  const yearMonth = cells.find((c) => c.dateKey)?.dateKey?.slice(0, 7) ?? "";
  const a = document.createElement("a");
  a.download = `reading-calendar-${yearMonth}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

type Glyph = "book" | "clock" | "pages" | "flame";

// Canvas can't render a Lucide component, so the footer marks are drawn by
// hand — the same reason the brand mark already was. Deliberately simple:
// at 20px a stroked outline reads better than a detailed silhouette.
function drawStatGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: Glyph,
  cx: number,
  cy: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (glyph === "clock") {
    ctx.beginPath();
    ctx.arc(cx, cy, 8.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 4, cy + 2.5);
    ctx.stroke();
  } else if (glyph === "flame") {
    // Asymmetric, with an inner lick. A symmetric teardrop reads as a water
    // drop, which is what the first version of this drew.
    ctx.beginPath();
    ctx.moveTo(cx, cy + 9);
    ctx.bezierCurveTo(cx - 7, cy + 6, cx - 6, cy - 2, cx - 2, cy - 9);
    ctx.bezierCurveTo(cx - 1, cy - 4, cx + 2, cy - 3, cx + 3, cy - 6);
    ctx.bezierCurveTo(cx + 7, cy - 1, cx + 7, cy + 6, cx, cy + 9);
    ctx.stroke();
  } else if (glyph === "pages") {
    // A sheet with a folded corner. Two offset rectangles read as a
    // duplicate/copy icon instead of paper.
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 9);
    ctx.lineTo(cx + 2, cy - 9);
    ctx.lineTo(cx + 7, cy - 4);
    ctx.lineTo(cx + 7, cy + 9);
    ctx.lineTo(cx - 6, cy + 9);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 9);
    ctx.lineTo(cx + 2, cy - 4);
    ctx.lineTo(cx + 7, cy - 4);
    ctx.stroke();
  } else {
    drawBookGlyph(ctx, cx, cy, 18, color);
  }

  ctx.restore();
}

// An open book: two facing pages with a spine between them.
function drawBookGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const w = size;
  const h = size * 0.78;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  // Left page
  ctx.moveTo(cx, cy + h / 2 - 1);
  ctx.lineTo(cx - w / 2, cy + h / 2 - 3);
  ctx.lineTo(cx - w / 2, cy - h / 2);
  ctx.lineTo(cx, cy - h / 2 + 2);
  // Right page
  ctx.lineTo(cx + w / 2, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy + h / 2 - 3);
  ctx.lineTo(cx, cy + h / 2 - 1);
  ctx.stroke();
  // Spine
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2 + 2);
  ctx.lineTo(cx, cy + h / 2 - 1);
  ctx.stroke();
  ctx.restore();
}

// readThemePalette hands back `hsla(H, S%, L%, A)` strings; this swaps the
// alpha so tinted chips can be derived from the theme's own primary rather
// than hard-coding a second colour that wouldn't follow the theme.
function withAlpha(hsla: string, alpha: number): string {
  return hsla.replace(/,\s*[\d.]+\s*\)$/, `, ${alpha})`);
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
  // The exported card reports the current streak alongside the month totals.
  // It is not derivable from the calendar range, so it comes from the same
  // session stats the rest of the app reads rather than being approximated.
  const { data: sessionStats } = useSessionStats();

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
      await downloadCalendarImage(viewModel, sessionStats?.streakDays ?? 0);
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
