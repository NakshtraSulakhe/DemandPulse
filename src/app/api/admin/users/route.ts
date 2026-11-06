import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { getAllUsers, createUser, getUserByEmailOrUsername } from "@/lib/db/user-repository";

/**
 * GET /api/admin/users
 * Lists all users (Admin only)
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error || "Admin privileges required" }, { status: 403 });
  }

  try {
    const users = await getAllUsers();
    return NextResponse.json({
      ok: true,
      users,
      total: users.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load users";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Creates a new user (Operations or Admin) (Admin only)
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error || "Admin privileges required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const username = String(body.username || "").trim().toLowerCase();
    const displayName = String(body.display_name || body.name || "").trim();
    const password = String(body.password || "").trim();
    const role = body.role === "admin" ? "admin" : "operations";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
    }
    if (!username || username.length < 3) {
      return NextResponse.json({ ok: false, error: "Username must be at least 3 characters." }, { status: 400 });
    }
    if (!displayName) {
      return NextResponse.json({ ok: false, error: "Display Name is required." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ ok: false, error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    // Check if user already exists
    const existingEmail = await getUserByEmailOrUsername(email);
    if (existingEmail) {
      return NextResponse.json({ ok: false, error: `A user with email '${email}' already exists.` }, { status: 409 });
    }

    const existingUsername = await getUserByEmailOrUsername(username);
    if (existingUsername) {
      return NextResponse.json({ ok: false, error: `Username '${username}' is already taken.` }, { status: 409 });
    }

    const created = await createUser({
      email,
      username,
      display_name: displayName,
      password,
      role,
    });

    return NextResponse.json(
      {
        ok: true,
        message: `User '${created.display_name}' created successfully with role ${created.role.toUpperCase()}`,
        user: created,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create user";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

