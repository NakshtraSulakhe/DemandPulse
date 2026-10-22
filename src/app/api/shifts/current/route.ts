import { NextRequest, NextResponse } from "next/server";
import { getShiftConfig } from "@/lib/shift/config";
import { getCurrentShiftState, getShiftBusinessDate, getShiftWindowForBusinessDate } from "@/lib/shift/engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/shifts/current
 * Query params: ?timestamp=ISO_STRING (optional for testing/simulation)
 */
export async function GET(req: NextRequest) {
  const tsParam = req.nextUrl.searchParams.get("timestamp");
  const testDate = tsParam ? new Date(tsParam) : new Date();

  const config = await getShiftConfig();
  const state = getCurrentShiftState(testDate, config);

  return NextResponse.json(
    {
      success: true,
      data: state,
      meta: {
        queriedInstant: testDate.toISOString(),
        shiftCode: config.shiftCode,
        durationMinutes: config.durationMinutes,
      },
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    }
  );
}
