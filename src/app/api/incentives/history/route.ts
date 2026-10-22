import { NextRequest, NextResponse } from "next/server";
import { fetchIncentiveHistory } from "@/lib/incentives/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/history
 * Query: from, to, agent_id, approval_status, payment_status, page, limit
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];
  const agent_id = searchParams.get("agent_id") ? parseInt(searchParams.get("agent_id")!, 10) : undefined;
  const approval_status = searchParams.get("approval_status") || undefined;
  const payment_status = searchParams.get("payment_status") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
  const limit = searchParams.get("limit") || undefined;

  const result = await fetchIncentiveHistory({
    from,
    to,
    agent_id,
    approval_status,
    payment_status,
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
