import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth";
import { getUserByEmailOrUsername, verifyPassword } from "@/lib/db/user-repository";

// MED-009 FIX: Sliding-window rate limiter for login attempts per client IP
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function checkRateLimit(ip: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
    return { limited: false, retryAfterSec: 0 };
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfterSec = Math.ceil((LOGIN_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { limited: true, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  return { limited: false, retryAfterSec: 0 };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(ip);
    if (rate.limited) {
      return NextResponse.json(
        { ok: false, error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const identifier = String(body.email || body.username || "").trim();
    const password = String(body.password || "").trim();

    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, error: "Username/Email and Password are required." },
        { status: 400 }
      );
    }

    // 1. Authenticate against database records (slide_app_users)
    const user = await getUserByEmailOrUsername(identifier);

    if (user) {
      if (!user.is_active) {
        return NextResponse.json(
          { ok: false, error: "This account has been deactivated. Please contact an Administrator." },
          { status: 403 }
        );
      }

      const isValidPassword = verifyPassword(password, user.password_hash);

      if (isValidPassword) {
        loginAttempts.delete(ip);
        const sessionUser = {
          id: user.id,
          name: user.display_name,
          email: user.email,
          username: user.username,
          role: user.role,
        };

        const response = NextResponse.json({
          ok: true,
          message: `Logged in successfully as ${user.role.toUpperCase()}`,
          user: sessionUser,
        });

        createSessionCookie(response, sessionUser);
        return response;
      }
    }

    recordFailedAttempt(ip);
    return NextResponse.json(
      { ok: false, error: "Invalid username/email or password" },
      { status: 401 }
    );
  } catch (err: unknown) {
    console.error("[auth/login] Login processing error:", err);
    return NextResponse.json(
      { ok: false, error: "Authentication processing failed" },
      { status: 500 }
    );
  }
}
