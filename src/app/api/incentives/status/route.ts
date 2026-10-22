import { NextRequest, NextResponse } from "next/server";
import { fetchPayoutStatus } from "@/lib/incentives/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/status?payout_id=14
 */
export async function GET(req: NextRequest) {
  const payoutIdStr = req.nextUrl.searchParams.get("payout_id");
  const payoutId = payoutIdStr ? parseInt(payoutIdStr, 10) : 0;

  if (payoutId <= 0) {
    return NextResponse.json(
      { success: false, error: "Valid payout_id parameter is required", error_code: "INVALID_PAYOUT_ID" },
      { status: 400 }
    );
  }

  const result = await fetchPayoutStatus(payoutId);

  return NextResponse.json(result, {
    status: result.success ? 200 : result.status || 500,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
