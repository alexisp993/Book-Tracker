"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { MOOD_EMOJI, MOOD_LABELS } from "@/lib/constants";
import { useCalendar } from "@/lib/queries";
import { FallbackCoverImg, CellCover } from "@/components/FallbackCoverImg";
import type { CalendarDay } from "@/lib/api";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Minutes -> intensity bucket 0-4
function bucket(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 20) return 1;
  if (minutes <= 45) return 2;
  if (minutes <= 90) return 3;
  return 4;
}

const BUCKET_BG = [
  "",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/65",
  "bg-primary",
];

// Hardcoded canvas colors — independent of CSS variables so the share card
// always looks great regardless of the user's chosen theme.
const CANVAS_BUCKET_FILL = [
  "#1a2e1e", // 0 — empty cell
  "#1e4d2b", // 1 — light
  "#2d7a47", // 2 — medium
  "#3aaa60", // 3 — strong
  "#4eca78", // 4 — full
];

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Canvas-based social share card (1080×1080, no external dependencies)
// ---------------------------------------------------------------------------
async function downloadCalendarImage(
  year: number,
  month: number,
  calData: CalendarDay[],
  daysInMonth: number,
  startDow: number,
) {
  const W = 1080;
  const PAD = 72;
  const CELL = 116;
  const GAP = 10;
  const HEADER_H = 160;
  const LABEL_H = 48;
  const FOOTER_H = 100;

  // How many rows needed
  const totalCells = startDow + daysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const gridH = rows * CELL + (rows - 1) * GAP;
  const H = HEADER_H + LABEL_H + gridH + FOOTER_H + PAD * 2;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const byDay = new Map(calData.map((d) => [d.date, d]));

  // Background
  ctx.fillStyle = "#0b1a10";
  ctx.fillRect(0, 0, W, H);

  // Subtle grid texture (very faint)
  ctx.strokeStyle = "#ffffff08";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Card rect
  const CARD_PAD = 40;
  ctx.fillStyle = "#102018";
  roundRect(ctx, CARD_PAD, CARD_PAD, W - CARD_PAD * 2, H - CARD_PAD * 2, 32);
  ctx.fill();

  // "Book Tracker" brand
  ctx.font = "600 28px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "#4eca78";
  ctx.textAlign = "left";
  ctx.fillText("📚 Book Tracker", PAD, PAD + 52);

  // Month + Year
  ctx.font = `700 64px -apple-system, system-ui, sans-serif`;
  ctx.fillStyle = "#eaf5ed";
  ctx.textAlign = "center";
  ctx.fillText(`${MONTH_NAMES[month - 1]} ${year}`, W / 2, PAD + 136);

  // Day-of-week labels
  const labelY = PAD + HEADER_H + 28;
  ctx.font = "600 24px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "#6bbd8a";
  ctx.textAlign = "center";
  for (let d = 0; d < 7; d++) {
    const x = PAD + d * (CELL + GAP) + CELL / 2;
    ctx.fillText(DAY_LABELS[d], x, labelY);
  }

  // Calendar grid
  const gridY = PAD + HEADER_H + LABEL_H;
  for (let i = 0; i < rows * 7; i++) {
    const col = i % 7;
    const row = Math.floor(i / 7);
    const day = i - startDow + 1;
    const x = PAD + col * (CELL + GAP);
    const y = gridY + row * (CELL + GAP);

    if (i < startDow || day > daysInMonth) {
      // Empty cell
      ctx.fillStyle = "#0d1f14";
      roundRect(ctx, x, y, CELL, CELL, 16);
      ctx.fill();
      continue;
    }

    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const data = byDay.get(key);
    const b = bucket(data?.totalMinutes ?? 0);

    // Cell background
    ctx.fillStyle = CANVAS_BUCKET_FILL[b];
    roundRect(ctx, x, y, CELL, CELL, 16);
    ctx.fill();

    // Draw the most-recently-read book's cover — same fallback-chain walk
    // used live, so a missing/dead first candidate doesn't leave the cell
    // blank when a later candidate would have worked.
    const candidates = data?.primary?.coverCandidates ?? [];
    let coverLoaded = false;
    for (const candidate of candidates) {
      try {
        const img = await loadImage(candidate);
        if (img.naturalWidth <= 2) continue; // Amazon 1x1 placeholder
        ctx.save();
        roundRect(ctx, x, y, CELL, CELL, 16);
        ctx.clip();
        // Full opacity + top scrim, matching the live day-cell treatment —
        // this is what makes the export actually look like the live grid.
        ctx.drawImage(img, x, y, CELL, CELL);
        const scrim = ctx.createLinearGradient(x, y, x, y + 36);
        scrim.addColorStop(0, "rgba(0,0,0,0.6)");
        scrim.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = scrim;
        ctx.fillRect(x, y, CELL, 36);
        ctx.restore();
        coverLoaded = true;
        break;
      } catch {
        // Try the next candidate.
      }
    }

    // Day number
    ctx.font = `${b >= 3 || coverLoaded ? "700" : "500"} 30px -apple-system, system-ui, sans-serif`;
    ctx.fillStyle = coverLoaded ? "#ffffff" : b >= 2 ? "#ffffff" : "#a8c9b0";
    ctx.textAlign = "center";
    ctx.fillText(String(day), x + CELL / 2, y + CELL / 2 + 10);

    // "+N" badge for extra books read that day
    if (data && data.extraBookCount > 0) {
      const badgeR = 18;
      const bx = x + CELL - badgeR - 6;
      const by = y + CELL - badgeR - 6;
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = "#0b1a10cc";
      ctx.fill();
      ctx.font = "700 18px -apple-system, system-ui, sans-serif";
      ctx.fillStyle = "#eaf5ed";
      ctx.fillText(`+${data.extraBookCount}`, bx, by + 6);
    } else if (!coverLoaded && data && data.sessions.length > 0) {
      // Activity dot only when there's no cover taking its place.
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + CELL - 16, 4, 0, Math.PI * 2);
      ctx.fillStyle = b >= 3 ? "#ffffff99" : "#4eca78";
      ctx.fill();
    }
  }

  // Stats footer
  const totalDays = calData.length;
  const totalMinutes = calData.reduce((s, d) => s + d.totalMinutes, 0);
  const totalPages = calData.reduce((s, d) => s + d.totalPages, 0);

  const statsY = gridY + gridH + 48;
  ctx.font = "500 26px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "#a8c9b0";
  ctx.textAlign = "center";
  const parts = [
    `${totalDays} day${totalDays === 1 ? "" : "s"} read`,
    totalMinutes > 0 ? formatDuration(totalMinutes) : null,
    totalPages > 0 ? `${totalPages} pages` : null,
  ].filter(Boolean);
  ctx.fillText(parts.join("  ·  "), W / 2, statsY);

  // Download
  const a = document.createElement("a");
  a.download = `reading-calendar-${year}-${String(month).padStart(2, "0")}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
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

  const byDay = new Map(calData.map((d) => [d.date, d]));

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }
  function canGoNext() {
    return year < today.getFullYear() ||
      (year === today.getFullYear() && month < today.getMonth() + 1);
  }

  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = firstOfMonth.getDay();

  const cells: (number | null)[] = [
    ...Array.from({ length: startDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function dateKey(day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const selectedDay = selectedDate ? byDay.get(selectedDate) : null;

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadCalendarImage(year, month, calData, daysInMonth, startDow);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Month navigation + download */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <p className="font-display text-base font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </p>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || calData.length === 0}
            className="flex h-8 w-8 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary disabled:opacity-40"
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
            className="flex h-8 w-8 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary disabled:opacity-40"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {DAY_LABELS.map((d) => (
          <p key={d} className="pb-1 text-[11px] font-medium text-muted-foreground">
            {d}
          </p>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} />;
            }
            const key = dateKey(day);
            const data = byDay.get(key);
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() + 1 &&
              year === today.getFullYear();
            const isSelected = selectedDate === key;
            const b = bucket(data?.totalMinutes ?? 0);
            const hasData = (data?.sessions.length ?? 0) > 0;

            const candidates = data?.primary?.coverCandidates ?? [];
            const hasCover = candidates.length > 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : key)}
                className={[
                  "relative flex aspect-[2/3] w-full flex-col rounded-xl border transition-all",
                  isSelected
                    ? "border-primary ring-2 ring-primary"
                    : hasData
                    ? "border-border/40 hover:border-border"
                    : "border-transparent hover:border-border/40",
                  !hasCover && b > 0 ? BUCKET_BG[b] : !hasData ? "bg-muted/20" : "",
                ].join(" ")}
                aria-label={`${key}${data ? `, ${data.totalMinutes} min` : ""}`}
              >
                {/* Cover image — clipped by <span>, not by the button, to avoid
                    the iOS Safari overflow:hidden+border-radius button bug.
                    Walks the full ISBN fallback chain, so a book with no
                    stored Book.coverUrl still shows art here. */}
                {hasCover ? <CellCover candidates={candidates} /> : null}

                {/* Gradient so the day number stays readable over any cover */}
                {hasCover ? (
                  <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 rounded-t-xl bg-gradient-to-b from-black/60 to-transparent" />
                ) : null}

                {/* Day number */}
                <span
                  className={[
                    "relative z-20 px-1 pt-0.5 text-[10px] font-semibold leading-none self-start",
                    hasCover ? "text-white drop-shadow-sm" : isToday ? "text-primary" : "text-foreground",
                  ].join(" ")}
                >
                  {day}
                </span>

                {/* "+N" badge when multiple books were read that day */}
                {data && data.extraBookCount > 0 ? (
                  <span className="absolute bottom-1 right-1 z-20 rounded-full bg-black/60 px-1 text-[9px] font-semibold leading-[14px] text-white">
                    +{data.extraBookCount}
                  </span>
                ) : !hasCover && hasData ? (
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
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{day.date}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {day.totalMinutes > 0 ? (
            <span>⏱ {formatDuration(day.totalMinutes)}</span>
          ) : null}
          {day.totalPages > 0 ? (
            <span>📖 {day.totalPages} pages</span>
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
    </div>
  );
}
