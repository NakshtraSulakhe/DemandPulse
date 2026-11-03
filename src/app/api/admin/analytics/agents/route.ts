import { NextRequest, NextResponse } from "next/server";
import { getAgentSnapshotsForDate } from "@/lib/db/agent-productivity-repository";
import { verifyAdminSession } from "@/lib/auth";
import { getShiftBusinessDate } from "@/lib/shift/engine";
import { query } from "@/lib/db";

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
      const startDateStr = from || getShiftBusinessDate();
      const endDateStr = to || startDateStr;

      const whereClauses: string[] = ["work_date >= ?", "work_date <= ?"];
      const params: any[] = [startDateStr, endDateStr];

      if (agentId) {
        whereClauses.push("crm_agent_id = ?");
        params.push(agentId);
      }
      if (paceStatus && paceStatus !== "all") {
        whereClauses.push("pace_status = ?");
        params.push(paceStatus);
      }

      const rows = await query<any>(
        `SELECT * FROM agent_daily_snapshots
         WHERE ${whereClauses.join(" AND ")}
         ORDER BY work_date DESC, achieved_points DESC`,
        params
      );

      records = rows.map((r) => ({
        id: r.id.toString(),
        crm_agent_id: Number(r.crm_agent_id),
        agent_name_snapshot: r.agent_name_snapshot,
        work_date: typeof r.work_date === "string" ? r.work_date.slice(0, 10) : new Date(r.work_date).toISOString().slice(0, 10),
        daily_target_points: Number(r.daily_target_points),
        achieved_points: Number(r.achieved_points),
        qualified_leads: r.qualified_leads,
        disqualified_leads: r.disqualified_leads,
        generated_leads: r.generated_leads,
        pending_qa_leads: r.pending_qa_leads,
        remaining_target_points: Number(r.remaining_target_points),
        target_completion_pct: Number(r.target_completion_pct),
        attendance_status_snapshot: r.attendance_status_snapshot,
        effective_work_minutes: r.effective_work_minutes,
        elapsed_work_minutes: r.elapsed_work_minutes,
        expected_points_at_snapshot: Number(r.expected_points_at_snapshot),
        productivity_pace_pct: r.productivity_pace_pct !== null && r.productivity_pace_pct !== undefined ? Number(r.productivity_pace_pct) : null,
        pace_status: r.pace_status,
        synced_at: String(r.synced_at),
        is_final: Boolean(r.is_final),
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
