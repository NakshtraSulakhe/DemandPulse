import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Beneficiary payment accounts endpoint.
 * The automatic incentive payment / beneficiary disbursement feature has been removed.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Beneficiary payment feature has been removed from this project.",
      error_code: "FEATURE_REMOVED",
    },
    { status: 410 }
  );
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Beneficiary payment feature has been removed from this project.",
      error_code: "FEATURE_REMOVED",
    },
    { status: 410 }
  );
}
