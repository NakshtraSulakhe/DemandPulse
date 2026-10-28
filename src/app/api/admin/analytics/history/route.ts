import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
    const whereDate: any = {};
    if (from) whereDate.gte = new Date(from);
    if (to) whereDate.lte = new Date(to);

    // Fetch distinct work dates from campaign snapshots or floor snapshots
    const floorRows = await prisma.floorDailySnapshot.findMany({
      where: Object.keys(whereDate).length > 0 ? { workDate: whereDate } : undefined,
      orderBy: { workDate: "desc" },
      take: 60,
    });

    // Also fetch finalization records
    const finalizations = await prisma.analyticsDailyFinalization.findMany({
      where: Object.keys(whereDate).length > 0 ? { workDate: whereDate } : undefined,
    });
    const finalizationMap = new Map<string, any>();
    finalizations.forEach((f) => {
      finalizationMap.set(f.workDate.toISOString().slice(0, 10), f);
    });

    const datesList = floorRows.map((f) => {
      const dateStr = f.workDate.toISOString().slice(0, 10);
      const fin = finalizationMap.get(dateStr);

      return {
        work_date: dateStr,
        total_agents: f.totalAgents,
        present_agents: f.presentAgents,
        absent_agents: f.absentAgents,
        late_agents: f.lateAgents,
        campaign_target_points: Number(f.campaignTargetPoints),
        floor_capacity_points: Number(f.floorCapacityPoints),
        capacity_gap_points: Number(f.capacityGapPoints),
        total_achieved_points: Number(f.totalAchievedPoints),
        finalization_status: fin?.finalizationStatus || "provisional",
        finalized_at: fin?.finalizedAt ? fin.finalizedAt.toISOString() : null,
        revision_number: fin?.revisionNumber || 1,
        synced_at: f.syncedAt.toISOString(),
      };
    });

    let filtered = datesList;
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((d) => d.finalization_status === statusFilter);
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      total_days: filtered.length,
      timestamp: new Date().toISOString(),
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
 * Body: { work_date: string, status: FinalizationStatus }
 * Updates finalization state (provisional -> finalizing -> finalized -> correction_pending)
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { work_date, status } = body;

    if (!work_date || !status) {
      return NextResponse.json(
        { success: false, error: "Missing work_date or status" },
        { status: 400 }
      );
    }

    const updated = await setDailyFinalizationStatus(
      work_date,
      status as FinalizationStatus,
      1,
      `admin_manual_${Date.now()}`
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Daily report for ${work_date} marked as ${status}.`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Failed to update finalization status", details: errorMsg },
      { status: 500 }
    );
  }
}
