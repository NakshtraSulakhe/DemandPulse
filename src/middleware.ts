import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "df_session";

/**
 * MED-005 FIX: Edge middleware guard for protected portal pages (/admin/*, /employee/*).
 * Redirects unauthenticated visitors to /login immediately before client hydration.
 * Full HMAC signature verification is performed in Node.js route handlers via getSessionUser().
 */
export function middleware(req: NextRequest) {
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie || !sessionCookie.includes(".")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Lightweight expiry check on the base64 payload (Edge-safe, no Node crypto needed)
  try {
    const payloadB64 = sessionCookie.slice(0, sessionCookie.lastIndexOf("."));
    const decodedJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const decoded = JSON.parse(decodedJson);
    if (!decoded?.user || typeof decoded.exp !== "number" || decoded.exp <= Date.now()) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/employee/:path*"],
};
