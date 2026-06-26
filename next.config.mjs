import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Exposed client-side as process.env.NEXT_PUBLIC_APP_VERSION (build-time
  // constant) — auto-captured on feedback submissions, never user-entered.
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  images: {
    // Cover images from public book metadata providers (used in later phases).
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "http", hostname: "books.google.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
