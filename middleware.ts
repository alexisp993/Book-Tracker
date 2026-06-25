import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/session";

// Gate the whole app behind the single-password session. Auth endpoints and the
// login page are reachable while logged out; everything else requires the cookie.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth API must be reachable to log in/out.
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await isValidSessionToken(token);

  if (authed) {
    // Don't show the login page to an already-authenticated user.
    if (pathname === "/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === "/login") return NextResponse.next();

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
