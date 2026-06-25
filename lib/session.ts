// Lightweight single-password session for a personal, single-user deployment.
// The session cookie holds an HMAC of a constant payload keyed by AUTH_SECRET, so
// it can't be forged without the secret. This is intentionally simpler than full
// multi-user auth (NextAuth) — appropriate while the app has one owner.
// Uses Web Crypto so it runs in both the Edge middleware and Node route handlers.

export const SESSION_COOKIE = "bt_session";
const SESSION_PAYLOAD = "book-tracker-authenticated-v1";

function getSecret(): string {
  return process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
}

function base64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return base64url(sig);
}

export async function createSessionToken(): Promise<string> {
  return hmac(SESSION_PAYLOAD);
}

export async function isValidSessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const expected = await createSessionToken();
  // Length-then-value compare (tokens are fixed length here).
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
