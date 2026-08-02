import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      // Two roles the type ramp never named, found by /impeccable typeset:
      // both sit in the gap between two documented sizes, and both were
      // independently re-invented as the same arbitrary pixel value at
      // enough call sites (8 and 26) to prove they're real roles, not
      // one-offs. Naming them turns "copy-pasted magic number" into "system
      // token" with zero rendered change.
      fontSize: {
        "title-sm": "15px", // list/card-row title — between text-sm (14px) and text-lg (18px)
        "caption-sm": "11px", // dense secondary text — between text-[10px] micro floor and text-xs (12px)
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warm: {
          DEFAULT: "hsl(var(--warm))",
          foreground: "hsl(var(--warm-foreground))",
        },
      },
      // All of these derive from --radius so a theme can actually change the
      // app's roundness. xl/2xl previously fell through to stock Tailwind
      // constants, which meant Forest's `--radius: 1rem` override reached
      // almost nothing. The offsets below are chosen so light/dark render
      // byte-identically to the old stock values (xl 0.75rem, 2xl 1rem) —
      // only Forest gets the rounder corners it was always asking for.
      borderRadius: {
        "2xl": "calc(var(--radius) + 0.15rem)",
        xl: "calc(var(--radius) - 0.1rem)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Elevation, defined per theme in globals.css so dark/forest can use
      // much stronger alphas than the light parchment palette.
      boxShadow: {
        card: "var(--shadow-1)",
        "card-hover": "var(--shadow-2)",
        cover: "var(--shadow-3)",
      },
    },
  },
  plugins: [],
};

export default config;
