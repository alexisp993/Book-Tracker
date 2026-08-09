import type { MetadataRoute } from "next";

// PWA manifest — lets the app be installed to a phone's home screen ("Add to
// Home Screen") and launched full-screen like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Book Tracker",
    short_name: "Books",
    description: "Your unlimited personal library and reading tracker.",
    start_url: "/",
    display: "standalone",
    // Kept in step with the light theme's --background and --primary in
    // app/globals.css. These can't read the CSS vars, so they're hand-derived
    // and drift silently — the previous theme_color was a blue that matched
    // nothing in the palette.
    background_color: "#edece8",
    theme_color: "#284780",
    icons: [
      {
        src: "/book-tracker-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/book-tracker-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
