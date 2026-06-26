// Signed session cookie carrying a real userId. The cookie value is
// `<base64url(JSON payload)>.<base64url(HMAC signature)>` — a minimal
// hand-rolled JWT-shaped token (not the JWT library/format itself; no new
// dependency, same Web Crypto primitives as before) so it works unmodified in
// both Edge middleware and Node Route Handlers.
//
// Replaces the old constant-payload "is this the right shared password"
// token now that the app has real per-user accounts (see ADR for the
// migration from single shared APP_PASSWORD to per-user login).

export const SESSION_COOKIE = "bt_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, matches the cookie's maxAge

interface SessionPayload {
  userId: string;
  exp: number; // unix seconds
}

function getSecret(): string {
  return process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
}

function base64urlEncode(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
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
  return base64urlEncode(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Issue a signed token for this user, valid for SESSION_MAX_AGE_SECONDS.
export async function createSessionToken(userId: string): Promise<string> {
  const payload: SessionPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(payloadB64);
  return `${payloadB64}.${signature}`;
}

// Verify a token's signature and expiry, returning the carried userId or null.
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<{ userId: string } | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expectedSignature = await hmac(payloadB64);
  if (!timingSafeEqual(signature, expectedSignature)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch {
    return null;
  }
  if (typeof payload.userId !== "string" || typeof payload.exp !== "number") {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expired

  return { userId: payload.userId };
}
