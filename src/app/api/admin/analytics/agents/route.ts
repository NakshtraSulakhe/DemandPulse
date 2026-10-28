import { NextRequest, NextResponse } from "next/server";
import { getAgentSnapshotsForDate } from "@/lib/db/agent-productivity-repository";
import { verifyAdminSession } from "@/lib/auth";
import { getShiftBusinessDate } from "@/lib/shift/engine";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const agentId = searchParams.get("agent_id") ? parseInt(searchParams.get("agent_id")!, 10) : undefined;
  const paceStatus = searchParams.get("pace_status") || undefined;
  const format = searchParams.get("format");

  try {
    let records: any[] = [];

    if (date) {
      records = await getAgentSnapshotsForDate(date, {
        agentId,
        paceStatus,
      });
    } else {
      const startDate = new Date(from || getShiftBusinessDate());
      const endDate = new Date(to || (from || getShiftBusinessDate()));

      const where: any = {
        workDate: {
          gte: startDate,
          lte: endDate,
        },
      };
      if (agentId) where.crmAgentId = BigInt(agentId);
      if (paceStatus && paceStatus !== "all") where.paceStatus = paceStatus;

      const rows = await prisma.agentDailySnapshot.findMany({
        where,
        orderBy: [{ workDate: "desc" }, { achievedPoints: "desc" }],
      });

      records = rows.map((r) => ({
        id: r.id.toString(),
        crm_agent_id: Number(r.crmAgentId),
        agent_name_snapshot: r.agentNameSnapshot,
        work_date: r.workDate.toISOString().slice(0, 10),
        daily_target_points: Number(r.dailyTargetPoints),
        achieved_points: Number(r.achievedPoints),
        qualified_leads: r.qualifiedLeads,
        disqualified_leads: r.disqualifiedLeads,
        generated_leads: r.generatedLeads,
        pending_qa_leads: r.pendingQaLeads,
        remaining_target_points: Number(r.remainingTargetPoints),
        target_completion_pct: Number(r.targetCompletionPct),
        attendance_status_snapshot: r.attendanceStatusSnapshot,
        effective_work_minutes: r.effectiveWorkMinutes,
        elapsed_work_minutes: r.elapsedWorkMinutes,
        expected_points_at_snapshot: Number(r.expectedPointsAtSnapshot),
        productivity_pace_pct: r.productivityPacePct !== null ? Number(r.productivityPacePct) : null,
        pace_status: r.paceStatus,
        synced_at: r.syncedAt.toISOString(),
        is_final: r.isFinal,
      }));
    }

    // CSV Export support
    if (format === "csv") {
      const headers = [
        "Work Date",
        "CRM Agent ID",
        "Agent Name",
        "Attendance Status",
        "Daily Target Points",
        "Achieved Points",
        "Remaining Points",
        "Target Completion %",
        "Elapsed Minutes",
        "Expected Points",
        "Productivity Pace %",
        "Pace Status",
        "Qualified Leads",
        "Generated Leads",
        "Disqualified Leads",
        "Pending QA",
        "Finalized",
      ];

      const csvRows = [headers.join(",")];
      records.forEach((r) => {
        const row = [
          `"${r.work_date}"`,
          r.crm_agent_id,
          `"${(r.agent_name_snapshot || "").replace(/"/g, '""')}"`,
          `"${r.attendance_status_snapshot || "Present"}"`,
          r.daily_target_points,
          r.achieved_points,
          r.remaining_target_points,
          r.target_completion_pct,
          r.elapsed_work_minutes,
          r.expected_points_at_snapshot,
          r.productivity_pace_pct !== null ? r.productivity_pace_pct : "N/A",
          `"${r.pace_status || "steady"}"`,
          r.qualified_leads,
          r.generated_leads,
          r.disqualified_leads,
          r.pending_qa_leads,
          r.is_final ? "YES" : "NO",
        ];
        csvRows.push(row.join(","));
      });

      return new NextResponse(csvRows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="agent_productivity_${date || from || "export"}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: records,
      total_records: records.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch agent analytics", details: errorMsg },
      { status: 500 }
    );
  }
}
