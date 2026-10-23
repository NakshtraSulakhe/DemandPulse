import { NextRequest, NextResponse } from "next/server";
import { getAllocationAuditHistory } from "@/lib/db/allocations";
import { getShiftBusinessDate } from "@/lib/shift/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/campaign-targets/history
 * Query params:
 *   ?date=YYYY-MM-DD
 *   &campaign_id=123
 *   &client_code=1020
 *   &from=YYYY-MM-DD
 *   &to=YYYY-MM-DD
 *   &limit=100
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const businessDate = searchParams.get("date") || undefined;
  const campaignIdStr = searchParams.get("campaign_id");
  const campaignId = campaignIdStr ? parseInt(campaignIdStr, 10) : undefined;
  const clientCode = searchParams.get("client_code") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const limitStr = searchParams.get("limit") || "100";
  const limit = parseInt(limitStr, 10) || 100;

  try {
    const history = getAllocationAuditHistory({
      business_date: businessDate,
      campaign_id: campaignId,
      client_code: clientCode,
      from,
      to,
      limit,
    });

    return NextResponse.json(
      {
        ok: true,
        success: true,
        total_records: history.length,
        records: history,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: "Failed to retrieve allocation audit history",
        details: msg,
      },
      { status: 500 }
    );
  }
}
