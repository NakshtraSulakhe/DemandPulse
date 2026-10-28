import { NextRequest, NextResponse } from "next/server";
import { getIncentiveSnapshotsDateRange, getIncentiveSnapshotsForDate } from "@/lib/db/incentive-reporting-repository";
import { verifyAdminSession } from "@/lib/auth";
import { getShiftBusinessDate } from "@/lib/shift/engine";

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
  const paymentStatus = searchParams.get("payment_status") || undefined;
  const format = searchParams.get("format");

  try {
    let records: any[] = [];
    if (date) {
      records = await getIncentiveSnapshotsForDate(date, {
        agentId,
        paymentStatus,
      });
    } else {
      const startDate = from || getShiftBusinessDate();
      const endDate = to || startDate;
      records = await getIncentiveSnapshotsDateRange(startDate, endDate, {
        agentId,
        paymentStatus,
      });
    }

    if (format === "csv") {
      const headers = [
        "Work Date",
        "CRM Agent ID",
        "Agent Name",
        "Target Points",
        "Achieved Points",
        "Qualified Leads",
        "Base Incentive (INR)",
        "Slab Incentive (INR)",
        "Total Incentive (INR)",
        "Eligibility Status",
        "Approval Status",
        "Payment Status",
        "Payment Reference",
        "Finalized",
      ];

      const csvRows = [headers.join(",")];
      records.forEach((r) => {
        const row = [
          `"${r.work_date}"`,
          r.crm_agent_id,
          `"${(r.agent_name_snapshot || "").replace(/"/g, '""')}"`,
          r.target_points,
          r.achieved_points,
          r.qualified_leads,
          r.base_incentive,
          r.slab_incentive,
          r.total_incentive,
          `"${r.eligibility_status}"`,
          `"${r.approval_status}"`,
          `"${r.payment_status}"`,
          `"${r.crm_payment_reference || ""}"`,
          r.is_final ? "YES" : "NO",
        ];
        csvRows.push(row.join(","));
      });

      return new NextResponse(csvRows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="incentive_reports_${date || from}.csv"`,
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
      { success: false, error: "Failed to fetch incentive reporting archive", details: errorMsg },
      { status: 500 }
    );
  }
}
