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
    background_color: "#fdfdfc",
    theme_color: "#1f3b52",
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
