import { NextRequest, NextResponse } from "next/server";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
}

const SESSION_COOKIE_NAME = "df_session";
const ADMIN_SECRET = process.env.ADMIN_AUTH_TOKEN || "df_admin_secret_token_2026";

/**
 * Validates admin request authorization for Next.js Route Handlers
 */
export async function verifyAdminSession(req: NextRequest): Promise<{ authorized: boolean; user?: SessionUser; error?: string }> {
  // Check Authorization header first (for API calls or bearer tokens)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === ADMIN_SECRET) {
      return {
        authorized: true,
        user: { id: "admin-api", name: "System Admin", email: "admin@demandflow.io", role: "admin" },
      };
    }
  }

  // Check HTTP-only session cookie
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf-8"));
      if (decoded && decoded.role === "admin" && decoded.exp > Date.now()) {
        return { authorized: true, user: decoded.user };
      }
    } catch {
      // Invalid cookie format
    }
  }

  return { authorized: false, error: "Unauthorized: Administrator privileges required." };
}

/**
 * Validates request origin to protect against CSRF attacks on write operations
 */
export function verifyCsrf(req: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!origin || !host) return true; // Local development or same-origin non-browser clients

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

/**
 * Sets an HTTP-only secure cookie for admin session
 */
export function createSessionCookie(response: NextResponse, user: SessionUser): void {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = Buffer.from(
    JSON.stringify({
      user,
      role: user.role,
      exp: expiresAt,
    })
  ).toString("base64");

  response.cookies.set(SESSION_COOKIE_NAME, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
}

/**
 * Clears the session cookie
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
