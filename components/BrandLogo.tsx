import { cn } from "@/lib/utils";

// The Book Tracker app mark — a cream squircle of shelved books. The asset has
// a cream (not white) field, so the chip reads as a deliberate app icon on
// every theme instead of showing a white halo on dark/forest. Decorative by
// default: it's shown beside the "Book Tracker" wordmark, so alt="" avoids a
// duplicate announcement. Pass an alt when it stands alone.
export function BrandLogo({
  className,
  alt = "",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    // Serves icon-128, not the 512px master: this renders at 32px in the app
    // shell and 56px on the auth screens, so 128 still covers the largest use
    // at 2x DPR while cutting the transfer from 117 KB to ~10 KB. The 512px
    // original stays in public/ as the source for regenerating the icon set.
    <img
      src="/icon-128.png"
      alt={alt}
      width={128}
      height={128}
      className={cn("object-cover", className)}
    />
  );
}
