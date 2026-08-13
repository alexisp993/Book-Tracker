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
import {
  CALENDAR_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  loadFirstUsableCover,
  loadImage,
  readThemePalette,
  seededRandom,
  type CanvasPalette,
} from "@/lib/calendarTemplates";
import { CalendarTemplatePicker } from "@/components/CalendarTemplatePicker";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { withCalendarTransition } from "@/lib/viewTransition";
import type { CalendarDay } from "@/lib/api";

// ---------------------------------------------------------------------------
// Canvas-based social share card (1080×1080, no external dependencies).
// Consumes the exact same MonthCalendarViewModel the live grid below
// renders from — same cell-to-day mapping, same intensity buckets, same
// cover-candidate resolution, same summary totals. No separate calculation
// path exists here anymore.
// ---------------------------------------------------------------------------
// The exported card is square and built for sharing.
//
// It used to be a 1080x1630 portrait sheet — a picture of the calendar, and
// nothing else. Feed platforms crop tall images, and a bare grid gives a
// viewer who doesn't use the app no way to read what they're looking at. This
// is a 1:1 composition instead: an editorial column that explains the grid,
// the month itself as the focal object, the reader's own totals, and one
// highlighted day.
//
// Rendered at 2x and downscaled by the platform, so the type stays crisp.
async function downloadCalendarImage(
  viewModel: MonthCalendarViewModel,
  streakDays: number,
  templateId: string,
) {
  const { monthLabel, weekdayLabels, cells, summary } = viewModel;

  // Canvas silently substitutes a different family if the webfont hasn't
  // loaded, which would ship the export in Georgia while the screen shows
  // Literata.
  try {
    await document.fonts.ready;
  } catch {
    // Font Loading API unavailable — the stacks below fall back to Georgia.
  }

  const S = 1080; // logical square; everything below is in these units
  const DPR = 2;

  const canvas = document.createElement("canvas");
  canvas.width = S * DPR;
  canvas.height = S * DPR;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(DPR, DPR);

  const serif = `"Literata", Georgia, "Times New Roman", serif`;
  const sans = `-apple-system, "Segoe UI", system-ui, sans-serif`;

  // --- Ground -------------------------------------------------------------

  // The chosen template paints the ground and then hands back the ink that
  // works against it. Without that second half a dark template would keep the
  // theme's near-black day numbers and render them invisible on its own
  // surface.
  const template = getTemplate(templateId);
  const themePalette = readThemePalette();

  // Resolved up front because several templates build their ground from the
  // reader's covers, and a painter can't await.
  const monthCovers: HTMLImageElement[] = [];
  for (const cell of cells) {
    if (monthCovers.length >= 4) break;
    if (!cell.hasCover || cell.coverCandidates.length === 0) continue;
    const img = await loadFirstUsableCover(cell.coverCandidates);
    if (img) monthCovers.push(img);
  }

  const seedKey = cells.find((c) => c.dateKey)?.dateKey?.slice(0, 7) ?? monthLabel;
  template.paint({
    ctx,
    size: S,
    palette: themePalette,
    covers: monthCovers,
    rand: seededRandom(`${template.id}:${seedKey}`),
  });

  const palette: CanvasPalette = { ...themePalette, ...(template.ink?.(themePalette) ?? {}) };

  // --- Left column --------------------------------------------------------

  const LX = 52; // left column origin

  drawBookGlyph(ctx, LX + 13, 78, 26, palette.primary);
  ctx.font = `700 25px ${sans}`;
  ctx.fillStyle = palette.foreground;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Book Tracker", LX + 36, 87);

  // The one display moment. Two lines, the second in the accent, italic —
  // the same serif the app titles everything else with.
  // 46px, not the 52 this started at: at 52 the first line measured to within
  // 4px of the calendar card's left edge, so the two columns read as colliding
  // rather than as a composition.
  ctx.font = `600 46px ${serif}`;
  ctx.fillStyle = palette.foreground;
  ctx.fillText("Your reading", LX, 208);
  ctx.font = `italic 600 46px ${serif}`;
  ctx.fillStyle = palette.primary;
  ctx.fillText("calendar.", LX, 264);

  ctx.font = `400 19px ${sans}`;
  ctx.fillStyle = palette.mutedForeground;
  ctx.fillText("See your reading.", LX, 326);
  ctx.fillText("Celebrate every day.", LX, 354);

  // Three notes that make the grid readable to someone who has never used the
  // app. The reference's third item is "Hover for details", which is nothing
  // in a still image; the dots are the thing actually left unexplained, so
  // they take that slot.
  const notes: { glyph: Glyph; title: string; body: string[] }[] = [
    {
      glyph: "book",
      title: "Covers mark the days",
      body: ["The book you read that day,", "shown on the day itself."],
    },
    {
      glyph: "bars",
      title: "Darker means longer",
      body: ["The deeper the colour, the more", "time you spent reading."],
    },
    {
      glyph: "dots",
      title: "A dot for every sitting",
      body: ["One dot per session logged", "on that day."],
    },
  ];

  let ny = 424;
  for (const note of notes) {
    ctx.beginPath();
    ctx.arc(LX + 22, ny + 6, 22, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(palette.primary, 0.12);
    ctx.fill();
    drawStatGlyph(ctx, note.glyph, LX + 22, ny + 6, palette.primary);

    ctx.font = `600 17px ${sans}`;
    ctx.fillStyle = palette.foreground;
    ctx.fillText(note.title, LX + 58, ny + 1);
    ctx.font = `400 14px ${sans}`;
    ctx.fillStyle = palette.mutedForeground;
    ctx.fillText(note.body[0], LX + 58, ny + 23);
    ctx.fillText(note.body[1], LX + 58, ny + 42);
    ny += 96;
  }

  // The reference's handwritten flourish. No script face is guaranteed on a
  // canvas, so this is the serif in italic at a slight angle rather than a
  // webfont the export can't rely on.
  ctx.save();
  ctx.translate(LX + 34, 748);
  ctx.rotate(-0.045);
  ctx.font = `italic 600 27px ${serif}`;
  ctx.fillStyle = palette.primary;
  ctx.fillText("Every day counts.", 0, 0);
  const swooshW = ctx.measureText("Every day counts.").width;
  ctx.beginPath();
  ctx.moveTo(2, 13);
  ctx.quadraticCurveTo(swooshW / 2, 22, swooshW - 4, 11);
  ctx.strokeStyle = withAlpha(palette.primary, 0.55);
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();

  // --- Stats card (floating, bottom-left) ---------------------------------

  const SC_X = 36;
  const SC_Y = 892;
  const SC_W = 320;
  const SC_H = 118;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.13)";
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, SC_X, SC_Y, SC_W, SC_H, 22);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.restore();

  const stats: { glyph: Glyph; value: string; label: string }[] = [
    {
      glyph: "book",
      value: String(summary.daysRead),
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
      value: streakDays > 0 ? `${streakDays}d` : "—",
      label: "Streak",
    },
  ];

  const statColW = SC_W / stats.length;
  ctx.textAlign = "center";
  for (let i = 0; i < stats.length; i++) {
    const cx = SC_X + statColW * (i + 0.5);
    ctx.beginPath();
    ctx.arc(cx, SC_Y + 34, 17, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(palette.primary, 0.12);
    ctx.fill();
    drawStatGlyph(ctx, stats[i].glyph, cx, SC_Y + 34, palette.primary);

    ctx.font = `600 21px ${serif}`;
    ctx.fillStyle = palette.foreground;
    ctx.fillText(stats[i].value, cx, SC_Y + 82);
    ctx.font = `400 11px ${sans}`;
    ctx.fillStyle = palette.mutedForeground;
    ctx.fillText(stats[i].label, cx, SC_Y + 100);
  }
  ctx.textAlign = "left";

  // --- Calendar card ------------------------------------------------------

  const CD_X = 372;
  const CD_Y = 52;
  const CD_W = S - CD_X - 44;
  const CD_H = 918;
  const CD_PAD = 30;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, CD_X, CD_Y, CD_W, CD_H, 28);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.restore();

  // Month. Centred, and without the prev/next/"Month" controls the reference
  // shows — they're interactive chrome and do nothing in a downloaded image.
  ctx.font = `600 42px ${serif}`;
  ctx.fillStyle = palette.foreground;
  ctx.textAlign = "center";
  ctx.fillText(monthLabel, CD_X + CD_W / 2, CD_Y + 92);

  const GRID_X = CD_X + CD_PAD;
  const GRID_W = CD_W - CD_PAD * 2;
  const GAP = 7;
  const CELL_W = Math.floor((GRID_W - GAP * 6) / 7);
  const rows = cells.length / 7;

  ctx.font = `500 14px ${sans}`;
  ctx.fillStyle = palette.mutedForeground;
  const wdY = CD_Y + 138;
  for (let d = 0; d < 7; d++) {
    ctx.fillText(weekdayLabels[d], GRID_X + d * (CELL_W + GAP) + CELL_W / 2, wdY);
  }

  const GRID_Y = CD_Y + 158;
  const LEGEND_H = 52;
  const gridAvail = CD_Y + CD_H - CD_PAD - LEGEND_H - GRID_Y;
  const CELL_H = Math.floor((gridAvail - GAP * (rows - 1)) / rows);

  // The best day, for the callout below. Real data: the in-month day with the
  // most minutes, if any day has any.
  let best: (typeof cells)[number] | null = null;
  for (const c of cells) {
    if (c.day === null || !c.data) continue;
    if (!best || (c.data.totalMinutes ?? 0) > (best.data?.totalMinutes ?? 0)) best = c;
  }
  if (best && (best.data?.totalMinutes ?? 0) <= 0) best = null;
  let bestRect: { x: number; y: number } | null = null;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const col = i % 7;
    const row = Math.floor(i / 7);
    const x = GRID_X + col * (CELL_W + GAP);
    const y = GRID_Y + row * (CELL_H + GAP);
    if (cell === best) bestRect = { x, y };

    const outside = cell.day === null;
    ctx.save();
    if (outside) ctx.globalAlpha = 0.5;

    roundRect(ctx, x, y, CELL_W, CELL_H, 12);
    ctx.fillStyle = palette.emptyCell;
    ctx.fill();

    if (outside) {
      ctx.restore();
      continue;
    }

    ctx.font = `600 14px ${sans}`;
    ctx.fillStyle = palette.foreground;
    ctx.textAlign = "left";
    ctx.fillText(String(cell.day), x + 9, y + 21);

    const centreX = x + CELL_W / 2;
    const sessionCount = cell.data?.sessions.length ?? 0;
    const dotsH = sessionCount > 0 ? 12 : 0;
    const contentTop = y + 26;
    const contentMid = contentTop + (CELL_H - 26 - 10 - dotsH) / 2;

    let coverLoaded = false;
    if (cell.hasCover) {
      const img = await loadFirstUsableCover(cell.coverCandidates);
      if (img) {
        const cw = Math.min(CELL_W - 22, 52);
        const ch = Math.round(cw * 1.45);
        const cx = centreX - cw / 2;
        const cy = contentMid - ch / 2;

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.24)";
        ctx.shadowBlur = 7;
        ctx.shadowOffsetY = 3;
        roundRect(ctx, cx, cy, cw, ch, 4);
        ctx.fillStyle = palette.card;
        ctx.fill();
        ctx.restore();

        ctx.save();
        roundRect(ctx, cx, cy, cw, ch, 4);
        ctx.clip();
        drawCoverFit(ctx, img, cx, cy, cw, ch);
        ctx.restore();
        coverLoaded = true;
      }
    }

    if (!coverLoaded && cell.bucket > 0) {
      const sw = 26;
      roundRect(ctx, centreX - sw / 2, contentMid - sw / 2, sw, sw, 7);
      ctx.fillStyle = palette.bucketFill[cell.bucket];
      ctx.fill();
    }

    if (sessionCount > 0) {
      const shown = Math.min(sessionCount, 4);
      const step = 9;
      let dx = centreX - ((shown - 1) * step) / 2;
      const dy = y + CELL_H - 13;
      ctx.fillStyle = palette.primary;
      for (let d = 0; d < shown; d++) {
        ctx.beginPath();
        ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fill();
        dx += step;
      }
    }
    ctx.restore();
  }

  // Legend. Less -> More, light -> dark: the reference labels its palest
  // swatch "More time", which reads backwards against its own ramp.
  const ramp = [palette.emptyCell, ...palette.bucketFill];
  const LSW = 20;
  const LGAP = 7;
  const rampW = ramp.length * LSW + (ramp.length - 1) * LGAP;
  ctx.font = `500 14px ${sans}`;
  const lessW = ctx.measureText("Less time").width;
  const moreW = ctx.measureText("More time").width;
  const totalLegend = lessW + 12 + rampW + 12 + moreW;
  let lx = CD_X + CD_W / 2 - totalLegend / 2;
  const ly = CD_Y + CD_H - CD_PAD - 12;
  ctx.textAlign = "left";
  ctx.fillStyle = palette.mutedForeground;
  ctx.fillText("Less time", lx, ly);
  lx += lessW + 12;
  for (let i = 0; i < ramp.length; i++) {
    roundRect(ctx, lx + i * (LSW + LGAP), ly - 15, LSW, LSW, 6);
    ctx.fillStyle = ramp[i];
    ctx.fill();
  }
  lx += rampW + 12;
  ctx.fillStyle = palette.mutedForeground;
  ctx.fillText("More time", lx, ly);

  // --- Best-day callout ---------------------------------------------------

  // The reference floats a hover tooltip over the grid. A still image has no
  // hover, so the same shape carries something a still image *can* say: the
  // month's biggest reading day, from real session data.
  if (best && bestRect && best.data) {
    const CO_W = 246;
    const CO_H = best.data.primary ? 116 : 74;
    let coX = bestRect.x + CELL_W + 14;
    if (coX + CO_W > CD_X + CD_W - 12) coX = bestRect.x - CO_W - 14;
    coX = Math.max(CD_X + 12, coX);
    let coY = bestRect.y + CELL_H / 2 - CO_H / 2;
    coY = Math.min(Math.max(coY, CD_Y + 120), CD_Y + CD_H - CO_H - 70);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, coX, coY, CO_W, CO_H, 16);
    ctx.fillStyle = palette.card;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, coX, coY, CO_W, CO_H, 16);
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = `600 14px ${sans}`;
    ctx.fillStyle = palette.primary;
    ctx.fillText("Your longest day", coX + 16, coY + 28);

    drawStatGlyph(ctx, "clock", coX + 24, coY + 48, palette.mutedForeground);
    ctx.font = `500 15px ${sans}`;
    ctx.fillStyle = palette.foreground;
    ctx.fillText(`${formatDuration(best.data.totalMinutes)} read`, coX + 40, coY + 53);

    if (best.data.primary) {
      const tw = 40;
      const th = 56;
      const tx = coX + 16;
      const ty = coY + 68 + 20 - th / 2;
      const thumb = await loadFirstUsableCover(best.data.primary.coverCandidates);
      if (thumb) {
        ctx.save();
        roundRect(ctx, tx, ty, tw, th, 3);
        ctx.clip();
        drawCoverFit(ctx, thumb, tx, ty, tw, th);
        ctx.restore();
      } else {
        roundRect(ctx, tx, ty, tw, th, 3);
        ctx.fillStyle = palette.emptyCell;
        ctx.fill();
      }
      ctx.font = `600 14px ${sans}`;
      ctx.fillStyle = palette.foreground;
      wrapText(ctx, best.data.primary.bookTitle, tx + tw + 12, ty + 20, CO_W - tw - 42, 18, 2);
    }
  }

  // --- Tagline ------------------------------------------------------------

  ctx.beginPath();
  ctx.arc(CD_X + 26, S - 52, 22, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(palette.primary, 0.12);
  ctx.fill();
  drawStatGlyph(ctx, "book", CD_X + 26, S - 52, palette.primary);
  ctx.textAlign = "left";
  ctx.font = `600 18px ${sans}`;
  ctx.fillStyle = palette.foreground;
  ctx.fillText("Track your journey.", CD_X + 62, S - 58);
  ctx.font = `400 18px ${sans}`;
  ctx.fillStyle = palette.mutedForeground;
  ctx.fillText("Build your story.", CD_X + 62, S - 34);

  // Download
  const yearMonth = cells.find((c) => c.dateKey)?.dateKey?.slice(0, 7) ?? "";
  const a = document.createElement("a");
  a.download = `reading-calendar-${yearMonth}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

// Word-wraps into at most `maxLines`, ellipsing the last one. Book titles are
// arbitrary length and the callout is a fixed width.
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth) {
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}

type Glyph = "book" | "clock" | "pages" | "flame" | "bars" | "dots";

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

  if (glyph === "bars") {
    // Three rising bars — "more colour means more time".
    ctx.fillRect(cx - 8, cy + 1, 4, 8);
    ctx.fillRect(cx - 2, cy - 4, 4, 13);
    ctx.fillRect(cx + 4, cy - 9, 4, 18);
  } else if (glyph === "dots") {
    // Three dots in a row, matching the session markers under a day.
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(cx + i * 7, cy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (glyph === "clock") {
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

  // Which background the download uses. localStorage rather than a column on
  // User, matching how bt_view and bt_theme already persist — it's a display
  // preference, not data. The tradeoff is that it's per-device; a column would
  // be a migration away if it should follow the reader everywhere.
  const [templateId, setTemplateId] = React.useState<string>(DEFAULT_TEMPLATE_ID);
  React.useEffect(() => {
    const saved = localStorage.getItem("bt_calendar_template");
    if (saved && CALENDAR_TEMPLATES.some((t) => t.id === saved)) {
      setTemplateId(saved);
    }
  }, []);
  function chooseTemplate(id: string) {
    setTemplateId(id);
    localStorage.setItem("bt_calendar_template", id);
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadCalendarImage(
        viewModel,
        sessionStats?.streakDays ?? 0,
        templateId,
      );
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

      {/* Sits below the calendar, not above it: the month is what the page is
          for, and the download design is a setting you visit occasionally. */}
      <CalendarTemplatePicker
        value={templateId}
        onChange={chooseTemplate}
        coverCandidates={viewModel.cells
          .filter((c) => c.hasCover && c.coverCandidates.length > 0)
          .map((c) => c.coverCandidates)}
      />
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
