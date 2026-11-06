import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth";
import { getUserByEmailOrUsername, verifyPassword } from "@/lib/db/user-repository";

export async function POST(req: NextRequest) {
  try {
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
