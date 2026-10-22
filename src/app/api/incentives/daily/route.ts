import { NextRequest, NextResponse } from "next/server";
import { fetchDailySettled } from "@/lib/incentives/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/daily
 * Query: date, approval_status, payment_status, agent_id, page, limit
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get("date") || undefined;
  const approval_status = searchParams.get("approval_status") || undefined;
  const payment_status = searchParams.get("payment_status") || undefined;
  const agent_id = searchParams.get("agent_id") ? parseInt(searchParams.get("agent_id")!, 10) : undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
  const limit = searchParams.get("limit") || undefined;

  const result = await fetchDailySettled({
    date,
    approval_status,
    payment_status,
    agent_id,
    page,
    limit,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : result.status || 500,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
