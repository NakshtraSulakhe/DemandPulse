import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";
import { getDailyFinalization, setDailyFinalizationStatus, FinalizationStatus } from "@/lib/db/finalization-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/analytics/history
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD, status=...
 * Returns daily rollups of persisted analytics across dates.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const statusFilter = searchParams.get("status") || "all";

  try {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (from) {
      whereClauses.push("work_date >= ?");
      params.push(from);
    }
    if (to) {
      whereClauses.push("work_date <= ?");
      params.push(to);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const floorRows = await query<any>(
      `SELECT * FROM floor_daily_snapshots ${whereStr} ORDER BY work_date DESC LIMIT 60`,
      params
    );

    const finalizations = await query<any>(
      `SELECT * FROM analytics_daily_finalizations ${whereStr}`,
      params
    );

    const finalizationMap = new Map<string, any>();
    finalizations.forEach((f) => {
      const d = typeof f.work_date === "string" ? f.work_date.slice(0, 10) : new Date(f.work_date).toISOString().slice(0, 10);
      finalizationMap.set(d, f);
    });

    const datesList = floorRows.map((f) => {
      const dateStr = typeof f.work_date === "string" ? f.work_date.slice(0, 10) : new Date(f.work_date).toISOString().slice(0, 10);
      const fin = finalizationMap.get(dateStr);

      return {
        work_date: dateStr,
        total_agents: f.total_agents,
        present_agents: f.present_agents,
        absent_agents: f.absent_agents,
        late_agents: f.late_agents,
        campaign_target_points: Number(f.campaign_target_points),
        floor_capacity_points: Number(f.floor_capacity_points),
        capacity_gap_points: Number(f.capacity_gap_points),
        total_achieved_points: Number(f.total_achieved_points),
        finalization_status: fin?.finalization_status || "provisional",
        finalized_at: fin?.finalized_at ? String(fin.finalized_at) : null,
        revision_number: fin?.revision_number || 1,
        synced_at: String(f.synced_at),
      };
    });

    let filtered = datesList;
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((d) => d.finalization_status === statusFilter);
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
      history: filtered,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics history", details: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/analytics/history
 * Manually finalize or update status of a date
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { work_date, status, notes } = body;

    if (!work_date || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: work_date, status" },
        { status: 400 }
      );
    }

    const validStatuses: FinalizationStatus[] = [
      "provisional",
      "finalizing",
      "finalized",
      "correction_pending",
      "reconciliation_required",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const finalizedBy = auth.user?.id ? parseInt(String(auth.user.id), 10) : 1;
    const result = await setDailyFinalizationStatus(
      work_date,
      status as FinalizationStatus,
      finalizedBy,
      notes || `manual_update_by_user_${finalizedBy}`
    );

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status} for ${work_date}`,
      record: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Failed to update finalization status", details: errorMsg },
      { status: 500 }
    );
  }
}
