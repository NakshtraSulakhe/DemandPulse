import { NextRequest, NextResponse } from "next/server";
import { getShiftConfig, saveShiftConfig } from "@/lib/shift/config";
import { verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/shift-config
 * Read authoritative shift settings from MySQL slide_business_calendars
 */
export async function GET() {
  try {
    const config = await getShiftConfig();
    return NextResponse.json(
      { success: true, data: config },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load shift config from database" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/shift-config
 * Update shift configuration in MySQL slide_business_calendars
 */
export async function PUT(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access", error_code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const updated = await saveShiftConfig(body, auth.user?.name || "Admin User");

    return NextResponse.json(
      { success: true, data: updated, message: "Shift configuration saved to MySQL successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update shift config in database" },
      { status: 500 }
    );
  }
}
