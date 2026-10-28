import { NextRequest, NextResponse } from "next/server";
import { getQaDailySnapshotsForDate, getQaIntervalMetricsForDate } from "@/lib/db/qa-analytics-repository";
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
  const date = searchParams.get("date") || getShiftBusinessDate();
  const format = searchParams.get("format");
  const analystId = searchParams.get("analyst_id") ? parseInt(searchParams.get("analyst_id")!, 10) : undefined;

  try {
    const [rawDailyRecords, intervals] = await Promise.all([
      getQaDailySnapshotsForDate(date),
      getQaIntervalMetricsForDate(date, analystId),
    ]);

    // Omit unnecessary names with 0 audits and non-QA personnel (e.g. Sagar)
    const activeDailyRecords = rawDailyRecords.filter(
      (r) =>
        (r.total_audits > 0 || r.qualified_leads > 0) &&
        r.crm_qa_agent_id !== 99 &&
        !r.qa_agent_name_snapshot?.toLowerCase().includes("sagar") &&
        !r.qa_agent_name_snapshot?.toLowerCase().includes("mayur jadhav")
    );
    const dailyRecords = activeDailyRecords;

    if (format === "csv") {
      const headers = [
        "Work Date",
        "CRM QA Analyst ID",
        "Analyst Name",
        "Total Audits",
        "Unique Leads Audited",
        "Qualified Leads",
        "Disqualified Leads",
        "Rework Leads",
      ];

      const csvRows = [headers.join(",")];
      dailyRecords.forEach((r) => {
        const row = [
          `"${r.work_date}"`,
          r.crm_qa_agent_id,
          `"${(r.qa_agent_name_snapshot || "").replace(/"/g, '""')}"`,
          r.total_audits,
          r.unique_leads_audited,
          r.qualified_leads,
          r.disqualified_leads,
          r.rework_leads,
        ];
        csvRows.push(row.join(","));
      });

      return new NextResponse(csvRows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="qa_analytics_${date}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({
      success: true,
      work_date: date,
      daily_summaries: dailyRecords,
      interval_metrics: intervals,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch QA analytics", details: errorMsg },
      { status: 500 }
    );
  }
}
