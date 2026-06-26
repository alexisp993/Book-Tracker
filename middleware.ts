import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Public (unauthenticated-reachable) pages, beyond the auth API itself.
const PUBLIC_PAGES = ["/login", "/register", "/migrate"];

// Gate the whole app behind a real per-user session. Auth endpoints and the
// login/register/migrate pages are reachable while logged out; everything
// else requires a valid session cookie. Middleware only decides "redirect or
// not" — it does not resolve or pass along identity; route handlers and
// server components re-derive the user from the cookie themselves via
// `getCurrentUser()` (see lib/user.ts), since middleware (Edge) and route
// handlers (Node) are different runtimes that shouldn't blindly share trust.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth API must be reachable to register/log in/out/migrate.
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (session) {
    // Don't show login/register/migrate to an already-authenticated user.
    if (PUBLIC_PAGES.includes(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (PUBLIC_PAGES.includes(pathname)) return NextResponse.next();

  // API calls get a 401; page navigations get redirected to the login screen.
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and public assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|apple-icon.png|robots.txt).*)",
  ],
};
