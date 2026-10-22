import { NextRequest, NextResponse } from "next/server";
import { getShiftConfig, saveShiftConfig } from "@/lib/shift/config";
import { verifyCsrf, verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/shifts/config
 * Returns current shift configuration
 */
export async function GET() {
  const config = await getShiftConfig();
  return NextResponse.json(
    { success: true, data: config },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    }
  );
}

/**
 * PUT /api/shifts/config
 * Updates shift configuration (Admin authorized)
 */
export async function PUT(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { success: false, error: "CSRF token/origin validation failed", error_code: "CSRF_FAILED" },
      { status: 403 }
    );
  }

  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error, error_code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const updated = await saveShiftConfig(body, auth.user?.name || "Admin User");

    return NextResponse.json(
      { success: true, data: updated, message: "Shift configuration updated successfully" },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: msg, error_code: "UPDATE_ERROR" },
      { status: 500 }
    );
  }
}
