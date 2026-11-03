import { NextRequest, NextResponse } from "next/server";
import { query, execute, serializeDbData } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/slides/displays
 * List active display sessions and preferences
 */
export async function GET() {
  try {
    const displays = await query<any>(
      `SELECT * FROM slide_display_sessions WHERE ended_at IS NULL ORDER BY last_seen_at DESC LIMIT 50`
    );

    const displayPrefs = await query<any>(
      `SELECT * FROM slide_display_preferences`
    );

    return NextResponse.json({
      success: true,
      data: {
        sessions: serializeDbData(displays),
        preferences: serializeDbData(displayPrefs),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load displays" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/slides/displays
 * Register or heartbeat a display session (backed by MySQL)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { displayName = "Operations Floor TV", presentationId = 1, sessionToken } = body;

    const tokenHash = sessionToken
      ? crypto.createHash("sha256").update(sessionToken).digest("hex")
      : crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex");

    const res = await execute(
      `INSERT INTO slide_display_sessions (presentation_id, display_name, session_token_hash, started_at, last_seen_at)
       VALUES (?, ?, ?, NOW(6), NOW(6))`,
      [Number(presentationId), displayName, tokenHash]
    );

    const session = {
      id: res.insertId.toString(),
      presentationId: String(presentationId),
      displayName,
      sessionTokenHash: tokenHash,
      startedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      endedAt: null,
    };

    return NextResponse.json({
      success: true,
      message: "Display session registered in MySQL",
      data: serializeDbData(session),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to register display" },
      { status: 400 }
    );
  }
}
