import bcrypt from "bcryptjs";

// Pure-JS bcrypt (no native bindings) — safe on Vercel's Node runtime with no
// build-step surprises, unlike the native `bcrypt` package.
const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
