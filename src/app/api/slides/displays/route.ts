import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDbData } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/slides/displays
 * List active display sessions and preferences
 */
export async function GET() {
  try {
    const displays = await prisma.slideDisplaySession.findMany({
      where: { endedAt: null },
      orderBy: { lastSeenAt: "desc" },
      take: 50,
    });

    const displayPrefs = await prisma.slideDisplayPreference.findMany();

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

    const session = await prisma.slideDisplaySession.create({
      data: {
        presentationId: BigInt(presentationId),
        displayName,
        sessionTokenHash: tokenHash,
      },
    });

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
