import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { QueryProvider } from "@/components/QueryProvider";

// Clean sans for UI/body (Apple-like clarity) + elegant serif for titles (literary).
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#16140f" },
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
