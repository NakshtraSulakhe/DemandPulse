import { NextRequest, NextResponse } from "next/server";
import { fetchIncentivePreview } from "@/lib/incentives/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/preview?date=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || undefined;
  const result = await fetchIncentivePreview(date);

  return NextResponse.json(result, {
    status: result.success ? 200 : result.status || 500,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Incentive-Mode": "preview",
    },
  });
}
