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
    <img
      src="/book-tracker-logo.png"
      alt={alt}
      width={512}
      height={512}
      className={cn("object-cover", className)}
    />
  );
}
