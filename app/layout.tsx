import type { Metadata, Viewport } from "next";
import { Inter, Literata } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { QueryProvider } from "@/components/QueryProvider";

// Inter for UI/body; Literata for titles and book names.
//
// Literata replaces Cormorant Garamond. Cormorant is a display face — it has a
// small x-height and hairline strokes that go weak and generic at the 13-15px
// sizes most of this app's titles actually render at. Literata was drawn for
// long-form book reading (it is Google Play Books' text face), so it holds
// weight at small sizes and reads as a printed object rather than as a
// wedding invitation.
//
// No explicit `weight`: this pulls the variable axis, which covers the full
// 200-900 range in one file — smaller than the four static cuts it replaces.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const serif = Literata({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Book Tracker",
  description:
    "Your unlimited personal library and reading tracker — BookBuddy + Goodreads + StoryGraph, reimagined.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Book Tracker",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/book-tracker-logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Hand-derived from --background in app/globals.css (light 40 14% 92%,
  // dark 220 20% 8%). Browser chrome can't read CSS vars, so these drift
  // silently — update them whenever the ground moves.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edece8" },
    { media: "(prefers-color-scheme: dark)", color: "#101318" },
  ],
  viewportFit: "cover",
};

// Set the correct theme class before paint (from a saved preference, falling
// back to the OS color-scheme) so there's no flash of the wrong theme on load.
// Supported values in localStorage["bt_theme"]: "light" | "dark" | "forest"
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("bt_theme");
    var dark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var forest = stored === "forest";
    document.documentElement.classList.toggle("dark", dark && !forest);
    document.documentElement.classList.toggle("forest", forest);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning is required: THEME_INIT_SCRIPT mutates the
    // <html> class list before React hydrates, and without it React 19
    // treats the className mismatch as a hydration error and recovers by
    // re-rendering with the server value — wiping the saved theme class
    // right after paint (the intermittent "loads in light mode" bug).
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
