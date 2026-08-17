// Background designs for the downloadable reading calendar.
//
// Every template here is drawn procedurally — colour, texture, geometry and
// rules — with no image assets. That is a deliberate constraint, not a
// shortcut: the reference set this was scoped against is an illustration pack
// (watercolour eucalyptus, a painted mug on a book stack, a lit candle), and
// approximating painted artwork with canvas vectors looks markedly worse than
// the real thing. So the ones that survive the constraint are the ones whose
// character is material and structure rather than a drawn vignette, and the
// personal warmth comes from the reader's own covers instead of stock art.
//
// A template owns two things: how the ground is painted, and any ink overrides
// the content drawn on top must respect. Dark Academia has a near-black green
// ground, so the day numbers and labels can't keep using the theme's ink — the
// template hands back the ink that works against its own surface.

import { BUCKET_VARS } from "@/lib/calendarViewModel";

export interface CanvasPalette {
  background: string;
  card: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  bucketFill: string[];
  emptyCell: string;
  texture: string;
  badgeBg: string;
}

export interface TemplatePaintArgs {
  ctx: CanvasRenderingContext2D;
  /** Logical square size; the context is already scaled for device pixels. */
  size: number;
  palette: CanvasPalette;
  /** Cover images already resolved by the caller, best-first. May be empty. */
  covers: HTMLImageElement[];
  /** Stable per-month seed so a template's texture doesn't reshuffle between exports. */
  rand: () => number;
}

export interface CalendarTemplate {
  id: string;
  name: string;
  description: string;
  paint: (args: TemplatePaintArgs) => void;
  /** Merged over the theme palette for everything drawn after the ground. */
  ink?: (palette: CanvasPalette) => Partial<CanvasPalette>;
}

// Canvas palette read from the active theme's CSS variables, so an export
// mirrors whatever theme is live instead of a fixed palette. A <canvas> can't
// consume CSS variables directly, so they're resolved to concrete hsla()
// strings here. Client-only; both the exporter and the template previews use
// it, which is why it lives here rather than inside either of them.
export function readThemePalette(): CanvasPalette {
  const cs = getComputedStyle(document.documentElement);
  // CSS vars are stored as an "H S% L%" triple (e.g. "36 28% 97%").
  const hsl = (name: string, alpha = 1): string => {
    const triple = cs.getPropertyValue(name).trim();
    const [h, s, l] = triple.split(/\s+/);
    // hsla(H, S%, L%, A) — the most cross-browser-safe canvas color form.
    return `hsla(${h}, ${s}, ${l}, ${alpha})`;
  };
  // The heat vars are plain hex, usable directly as a canvas fillStyle.
  const raw = (name: string): string => cs.getPropertyValue(name).trim();
  return {
    background: hsl("--background"),
    card: hsl("--card"),
    border: hsl("--border"),
    foreground: hsl("--foreground"),
    mutedForeground: hsl("--muted-foreground"),
    primary: hsl("--primary"),
    bucketFill: BUCKET_VARS.map(raw),
    emptyCell: raw("--heat-0"),
    texture: hsl("--foreground", 0.03),
    badgeBg: hsl("--background", 0.8),
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Walks a cover-candidate chain and returns the first image that actually
// loads and isn't a 1x1 placeholder, or null.
//
// This exists because the walk used to be copy-pasted per draw site, and one
// copy took only candidates[0]. When the first candidate was dead the grid
// still found a cover further down the chain while that copy silently drew
// nothing.
export async function loadFirstUsableCover(
  candidates: string[],
): Promise<HTMLImageElement | null> {
  for (const candidate of candidates) {
    try {
      const img = await loadImage(candidate);
      if (img.naturalWidth <= 2) continue; // Amazon 1x1 placeholder
      return img;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

// Deterministic PRNG. Without this the grain and blob placement would land
// differently on every export of the same month, so re-downloading a calendar
// would quietly produce a different picture.
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Low-alpha specks. The cheapest convincing paper tooth on a canvas. */
function grain(
  ctx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
  count: number,
  color: string,
  maxAlpha: number,
) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = rand() * maxAlpha;
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillRect(x, y, 1 + rand() * 1.6, 1 + rand() * 1.6);
  }
  ctx.restore();
}

/** A soft darkening at the edges, so a flat fill stops reading as flat. */
function vignette(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  strength: number,
) {
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.32,
    size / 2,
    size / 2,
    size * 0.78,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, color);
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
}

/** Blurred cover wash. Falls back to nothing if the browser lacks ctx.filter. */
function coverWash(
  ctx: CanvasRenderingContext2D,
  size: number,
  covers: HTMLImageElement[],
  spots: [number, number, number][],
  alpha: number,
  blur: number,
) {
  if (covers.length === 0 || !("filter" in ctx)) return;
  spots.forEach((spot, i) => {
    const img = covers[i % covers.length];
    if (!img) return;
    const [x, y, w] = spot;
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, w, w * 1.4);
    ctx.restore();
  });
}

// --- Templates --------------------------------------------------------------

const paper: CalendarTemplate = {
  id: "paper",
  name: "Paper",
  description: "The app's own stock, with a wash of colour from your covers.",
  paint: ({ ctx, size, palette, covers }) => {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, size, size);
    coverWash(
      ctx,
      size,
      covers,
      [
        [-40, size - 300, 320],
        [size - 260, size - 240, 300],
      ],
      0.32,
      46,
    );
  },
};

const abstract: CalendarTemplate = {
  id: "abstract",
  name: "Modern Abstract",
  description: "Soft shapes and scattered dots in muted blocks of colour.",
  paint: ({ ctx, size, palette, rand }) => {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, size, size);

    // Organic blobs, each a closed bezier loop rather than a circle so they
    // read as cut paper instead of as bubbles.
    const blobs: { x: number; y: number; r: number; color: string }[] = [
      { x: size * 0.06, y: size * 0.1, r: 150, color: "#8FA6C4" },
      { x: size * 0.97, y: size * 0.08, r: 130, color: "#C98A6B" },
      { x: size * 0.02, y: size * 0.92, r: 190, color: "#2B3A55" },
      { x: size * 0.96, y: size * 0.95, r: 165, color: "#9DAE9B" },
    ];
    for (const b of blobs) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      const points = 7;
      for (let i = 0; i <= points; i++) {
        const a = (i / points) * Math.PI * 2;
        const rad = b.r * (0.78 + rand() * 0.42);
        const px = b.x + Math.cos(a) * rad;
        const py = b.y + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else {
          const pa = ((i - 0.5) / points) * Math.PI * 2;
          const cr = b.r * 1.05;
          ctx.quadraticCurveTo(
            b.x + Math.cos(pa) * cr,
            b.y + Math.sin(pa) * cr,
            px,
            py,
          );
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Two dot fields, the counterweight to the blobs.
    ctx.save();
    ctx.fillStyle = "#2B3A55";
    ctx.globalAlpha = 0.2;
    for (const [ox, oy] of [
      [size * 0.86, size * 0.72],
      [size * 0.1, size * 0.63],
    ]) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.beginPath();
          ctx.arc(ox + c * 11, oy + r * 11, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  },
};

const paperTexture: CalendarTemplate = {
  id: "paper-texture",
  name: "Paper Texture",
  description: "Aged stock with a torn deckle edge and a fine tooth.",
  paint: ({ ctx, size, rand }) => {
    ctx.fillStyle = "#D9CDB4";
    ctx.fillRect(0, 0, size, size);

    // The sheet, inset, with an irregular edge. Each side walks in small
    // random steps so the boundary reads as torn rather than cut.
    const m = 26;
    ctx.beginPath();
    const step = 26;
    const jitter = () => (rand() - 0.5) * 13;
    ctx.moveTo(m + jitter(), m + jitter());
    for (let x = m; x <= size - m; x += step) ctx.lineTo(x, m + jitter());
    for (let y = m; y <= size - m; y += step) ctx.lineTo(size - m + jitter(), y);
    for (let x = size - m; x >= m; x -= step) ctx.lineTo(x, size - m + jitter());
    for (let y = size - m; y >= m; y -= step) ctx.lineTo(m + jitter(), y);
    ctx.closePath();
    ctx.save();
    ctx.shadowColor = "rgba(90,70,40,0.28)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#F2E9D6";
    ctx.fill();
    ctx.restore();

    grain(ctx, size, rand, 5200, "#7A6440", 0.14);
    vignette(ctx, size, "rgba(120,96,58,0.5)", 0.4);
  },
  ink: () => ({
    background: "#F2E9D6",
    card: "rgba(255,252,244,0.86)",
    border: "rgba(122,100,64,0.28)",
    foreground: "#3B2F1E",
    mutedForeground: "#6E5C42",
    emptyCell: "#E7DCC4",
  }),
};

const darkAcademia: CalendarTemplate = {
  id: "dark-academia",
  name: "Dark Academia",
  description: "Bottle-green board with a gold rule and a soft candle glow.",
  paint: ({ ctx, size, rand }) => {
    ctx.fillStyle = "#1B2A22";
    ctx.fillRect(0, 0, size, size);

    // A warm off-centre glow, the one thing that stops a dark ground reading
    // as a flat black rectangle.
    const glow = ctx.createRadialGradient(
      size * 0.24,
      size * 0.78,
      10,
      size * 0.24,
      size * 0.78,
      size * 0.62,
    );
    glow.addColorStop(0, "rgba(214,168,90,0.20)");
    glow.addColorStop(1, "rgba(214,168,90,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    grain(ctx, size, rand, 3800, "#000000", 0.2);

    // Gold double rule.
    ctx.strokeStyle = "rgba(198,163,92,0.75)";
    ctx.lineWidth = 2;
    rr(ctx, 30, 30, size - 60, size - 60, 6);
    ctx.stroke();
    ctx.strokeStyle = "rgba(198,163,92,0.4)";
    ctx.lineWidth = 1;
    rr(ctx, 38, 38, size - 76, size - 76, 4);
    ctx.stroke();
  },
  ink: () => ({
    background: "#1B2A22",
    card: "rgba(37,55,45,0.92)",
    border: "rgba(198,163,92,0.32)",
    foreground: "#F0E7D2",
    mutedForeground: "#B9AE93",
    primary: "hsla(41, 47%, 62%, 1)",
    emptyCell: "#243528",
  }),
};

const vintageLibrary: CalendarTemplate = {
  id: "vintage-library",
  name: "Vintage Library",
  description: "Sepia stock inside a ruled frame with scrolled corners.",
  paint: ({ ctx, size, rand }) => {
    ctx.fillStyle = "#EFE3CB";
    ctx.fillRect(0, 0, size, size);
    grain(ctx, size, rand, 4200, "#8A6E42", 0.12);
    vignette(ctx, size, "rgba(120,92,52,0.55)", 0.42);

    const sepia = "rgba(122,92,52,0.62)";
    ctx.strokeStyle = sepia;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(30, 30, size - 60, size - 60);
    ctx.lineWidth = 1;
    ctx.strokeRect(39, 39, size - 78, size - 78);

    // Corner scrollwork. Drawn once and mirrored into the other three corners
    // by transform, so the four corners are guaranteed to match.
    const corner = (flipX: number, flipY: number) => {
      ctx.save();
      ctx.translate(flipX > 0 ? 30 : size - 30, flipY > 0 ? 30 : size - 30);
      ctx.scale(flipX, flipY);
      ctx.strokeStyle = sepia;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 54);
      ctx.quadraticCurveTo(0, 16, 22, 10);
      ctx.quadraticCurveTo(40, 6, 54, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(14, 30);
      ctx.quadraticCurveTo(20, 20, 30, 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(20, 20, 3.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    corner(1, 1);
    corner(-1, 1);
    corner(1, -1);
    corner(-1, -1);
  },
  ink: () => ({
    background: "#EFE3CB",
    card: "rgba(252,246,233,0.9)",
    border: "rgba(122,92,52,0.3)",
    foreground: "#3E301C",
    mutedForeground: "#6F5B3C",
    emptyCell: "#E4D6B9",
  }),
};

const coverCollage: CalendarTemplate = {
  id: "cover-collage",
  name: "Your Covers",
  description: "Built from the books you actually read this month.",
  paint: ({ ctx, size, palette, covers }) => {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, size, size);
    coverWash(
      ctx,
      size,
      covers,
      [
        [-120, -80, 480],
        [size - 340, -120, 460],
        [-160, size - 420, 500],
        [size - 300, size - 360, 470],
      ],
      0.55,
      64,
    );
    // A scrim so the wash never fights the grid it sits behind.
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  },
};

const linen: CalendarTemplate = {
  id: "linen",
  name: "Linen",
  description: "Warm cream and forest green, with a woven tooth.",
  paint: ({ ctx, size, rand }) => {
    ctx.fillStyle = "#F5F2EA";
    ctx.fillRect(0, 0, size, size);

    // A woven tooth rather than random specks: faint threads crossing both
    // ways, which is what separates linen from paper at this scale.
    ctx.save();
    ctx.strokeStyle = "#9A9377";
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 3) {
      ctx.globalAlpha = 0.012 + rand() * 0.022;
      ctx.beginPath();
      ctx.moveTo(i + rand() * 2, 0);
      ctx.lineTo(i + rand() * 2, size);
      ctx.stroke();
      ctx.globalAlpha = 0.01 + rand() * 0.018;
      ctx.beginPath();
      ctx.moveTo(0, i + rand() * 2);
      ctx.lineTo(size, i + rand() * 2);
      ctx.stroke();
    }
    ctx.restore();

    grain(ctx, size, rand, 2600, "#6E7A5E", 0.06);
    vignette(ctx, size, "rgba(110,122,94,0.32)", 0.34);
  },
  ink: () => ({
    background: "#F5F2EA",
    card: "#FDFCF9",
    border: "rgba(70,88,64,0.16)",
    foreground: "#2F4032",
    mutedForeground: "#6B6F5E",
    primary: "hsla(128, 15%, 28%, 1)",
    emptyCell: "#EFEDE3",
  }),
};

export const CALENDAR_TEMPLATES: CalendarTemplate[] = [
  paper,
  linen,
  coverCollage,
  paperTexture,
  vintageLibrary,
  darkAcademia,
  abstract,
];

export const DEFAULT_TEMPLATE_ID = "paper";

export function getTemplate(id: string | null | undefined): CalendarTemplate {
  return (
    CALENDAR_TEMPLATES.find((t) => t.id === id) ?? CALENDAR_TEMPLATES[0]
  );
}
