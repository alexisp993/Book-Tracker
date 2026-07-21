"use client";

import * as React from "react";

// Walks a cover-candidate fallback chain (stored URL -> Open Library ->
// Amazon), advancing on load error and skipping tiny placeholder images —
// the exact pattern BookCover.tsx already uses for library covers. Shared by
// the full calendar page and the Home tab's calendar preview so a null/broken
// Book.coverUrl doesn't leave a cell blank when an ISBN-based cover would
// have worked, in either place.
export function FallbackCoverImg({
  candidates,
  alt,
  className,
}: {
  candidates: string[];
  alt: string;
  className?: string;
}) {
  const [idx, setIdx] = React.useState(0);
  const src = candidates[idx];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      className={className ?? "h-full w-full object-cover"}
      loading="lazy"
      decoding="async"
      onError={() => setIdx((i) => i + 1)}
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth <= 2) setIdx((i) => i + 1);
      }}
    />
  );
}

// The <span> wrapper (not the <button> a cover cell usually sits in) owns
// overflow:hidden + border-radius, avoiding a long-standing iOS Safari bug
// where absolutely-positioned children aren't clipped by their button parent.
export function CellCover({
  candidates,
  className,
}: {
  candidates: string[];
  className?: string;
}) {
  return (
    <span
      className={className ?? "absolute inset-0 block overflow-hidden rounded-xl"}
      style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
    >
      <FallbackCoverImg candidates={candidates} alt="" />
    </span>
  );
}
