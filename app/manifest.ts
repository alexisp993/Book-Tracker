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
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
