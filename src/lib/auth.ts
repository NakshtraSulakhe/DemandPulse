import { NextRequest, NextResponse } from "next/server";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: "admin" | "operations";
}

const SESSION_COOKIE_NAME = "df_session";

// BUG-001 FIX: Require ADMIN_AUTH_TOKEN from environment — no hardcoded fallback.
// BUG-002 FIX: Session payload is HMAC-signed with SESSION_SECRET.
const ADMIN_SECRET = process.env.ADMIN_AUTH_TOKEN;
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_AUTH_TOKEN || "";

if (!ADMIN_SECRET && process.env.NODE_ENV === "production") {
  console.error(
    "[auth] CRITICAL: ADMIN_AUTH_TOKEN environment variable is not set. " +
    "API token authentication is disabled until the variable is configured."
  );
}

const VALID_TOKENS = new Set(
  [ADMIN_SECRET, process.env.CRM_API_TOKEN].filter(Boolean) as string[]
);

// --- HMAC signing helpers (BUG-002 fix) ---
function sign(payload: string, secret: string): string {
  const { createHmac } = require("crypto") as typeof import("crypto");
  return createHmac("sha256", secret || "fallback_insecure").update(payload).digest("hex");
}

function verifySignature(payload: string, sig: string, secret: string): boolean {
  const expected = sign(payload, secret);
  try {
    const { timingSafeEqual } = require("crypto") as typeof import("crypto");
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return expected === sig;
  }
}

function parseSessionUser(payloadB64: string): SessionUser | null {
  const decoded = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
  if (decoded && decoded.user && typeof decoded.exp === "number" && decoded.exp > Date.now()) {
    return {
      id: String(decoded.user.id),
      name: String(decoded.user.name || decoded.user.display_name || "User"),
      email: String(decoded.user.email || ""),
      username: decoded.user.username ? String(decoded.user.username) : undefined,
      role: decoded.user.role === "admin" ? "admin" : "operations",
    };
  }
  return null;
}

/**
 * Extracts and parses the current session user from request cookies or headers.
 * BUG-002 FIX: Session cookie is now HMAC-verified before trusting payload.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  // 1. Check HTTP-only session cookie (HMAC-verified)
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    try {
      // Format: base64(payload).<hex_signature>
      const lastDot = sessionCookie.lastIndexOf(".");
      if (lastDot === -1) {
        // Legacy unsigned cookie — reject immediately (do NOT parse)
        console.warn("[auth] Rejected unsigned/legacy session cookie.");
      } else {
        const payloadB64 = sessionCookie.slice(0, lastDot);
        const sig = sessionCookie.slice(lastDot + 1);
        if (SESSION_SECRET && verifySignature(payloadB64, sig, SESSION_SECRET)) {
          const parsed = parseSessionUser(payloadB64);
          if (parsed) return parsed;
        } else if (!SESSION_SECRET && process.env.NODE_ENV !== "production") {
          // Local dev fallback only when SESSION_SECRET is unset
          const parsed = parseSessionUser(payloadB64);
          if (parsed) return parsed;
        }
      }
    } catch {
      // Invalid cookie format — ignore
    }
  }

  // 2. Check Authorization Bearer header (env-configured tokens only)
  const authHeader = req.headers.get("authorization");
  if (authHeader && VALID_TOKENS.size > 0) {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : authHeader.trim();
    if (VALID_TOKENS.has(token)) {
      return { id: "admin-api", name: "System Admin", email: "admin@demandflow.io", role: "admin" };
    }
  }

  // 3. Check X-API-Key header (env-configured tokens only)
  const apiKey = req.headers.get("x-api-key")?.trim();
  if (apiKey && VALID_TOKENS.size > 0 && VALID_TOKENS.has(apiKey)) {
    return { id: "admin-api", name: "System Admin", email: "admin@demandflow.io", role: "admin" };
  }

  // BUG-004 FIX: Removed URL ?token= query param authentication.
  // Tokens in query strings are logged by proxies, CDNs, and browsers — never use for auth.

  return null;
}

/**
 * Validates request authorization for route handlers with role checking.
 * @param req NextRequest
 * @param allowedRoles array of allowed roles (defaults to ['admin'])
 */
export async function verifySession(
  req: NextRequest,
  allowedRoles: ("admin" | "operations")[] = ["admin"]
): Promise<{ authorized: boolean; user?: SessionUser; error?: string }> {
  const user = await getSessionUser(req);

  if (user) {
    if (allowedRoles.includes(user.role)) {
      return { authorized: true, user };
    }
    return {
      authorized: false,
      user,
      error: `Forbidden: User role '${user.role}' is not authorized for this resource.`,
    };
  }

  // BUG-003 FIX: Removed the same-origin no-credential fallback that granted
  // admin access to any request missing Origin/Referer headers (curl, Postman, proxies).
  // All requests now require explicit session cookie or API token.

  return { authorized: false, error: "Unauthorized: Active session required." };
}

/**
 * Validates admin request authorization for Next.js Route Handlers
 */
export async function verifyAdminSession(
  req: NextRequest
): Promise<{ authorized: boolean; user?: SessionUser; error?: string }> {
  return verifySession(req, ["admin"]);
}

/**
 * Validates session for operations or admin (e.g. Campaign Targets, Shift Management, Display Settings)
 */
export async function verifyOperationsSession(
  req: NextRequest
): Promise<{ authorized: boolean; user?: SessionUser; error?: string }> {
  return verifySession(req, ["admin", "operations"]);
}

/**
 * Validates request origin to protect against CSRF attacks on write operations
 */
export function verifyCsrf(req: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!origin || !host) return true;

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

/**
 * Sets an HTTP-only secure cookie for user session.
 * BUG-002 FIX: Cookie payload is now HMAC-signed with SESSION_SECRET.
 * Format: base64(payload).<hex_signature>
 */
export function createSessionCookie(response: NextResponse, user: SessionUser): void {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payloadObj = {
    user,
    role: user.role,
    exp: expiresAt,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64");
  const sig = SESSION_SECRET ? sign(payloadB64, SESSION_SECRET) : "unsigned";
  const cookieValue = `${payloadB64}.${sig}`;

  response.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
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
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
