import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/incentives/disburse
 * The automatic incentive payment / disbursement feature has been removed.
 */
export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Automatic incentive payment and disbursement feature has been removed from this project.",
      error_code: "FEATURE_REMOVED",
    },
    { status: 410 }
  );
}
