import { NextRequest, NextResponse } from "next/server";
import { getCampaignSnapshotsDateRange, getCampaignSnapshotsForDate } from "@/lib/db/campaign-analytics-repository";
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
  const clientCode = searchParams.get("client_code") || undefined;
  const campaignId = searchParams.get("campaign_id") ? parseInt(searchParams.get("campaign_id")!, 10) : undefined;
  const search = searchParams.get("search") || undefined;
  const format = searchParams.get("format");

  try {
    let records: any[] = [];

    if (date) {
      records = await getCampaignSnapshotsForDate(date, {
        clientCode,
      });
    } else {
      const startDate = from || getShiftBusinessDate();
      const endDate = to || startDate;
      records = await getCampaignSnapshotsDateRange(startDate, endDate, {
        campaignId,
        clientCode,
        search,
      });
    }

    // CSV Export support
    if (format === "csv") {
      const headers = [
        "Work Date",
        "CRM Campaign ID",
        "Campaign Code",
        "Campaign Name",
        "Client Code",
        "Campaign Type",
        "Daily Target",
        "Point Factor",
        "Daily Target Points",
        "Generated Leads",
        "Qualified Leads",
        "Disqualified Leads",
        "Pending QA",
        "Remaining Leads",
        "Completion %",
        "Target Achieved",
        "Finalized",
      ];

      const csvRows = [headers.join(",")];
      records.forEach((r) => {
        const row = [
          `"${r.work_date}"`,
          r.crm_campaign_id,
          `"${r.crm_campaign_code || ""}"`,
          `"${(r.campaign_name_snapshot || "").replace(/"/g, '""')}"`,
          `"${r.client_code_snapshot || ""}"`,
          `"${r.campaign_type_snapshot || ""}"`,
          r.daily_target_leads,
          r.campaign_point_factor,
          r.daily_target_points,
          r.generated_leads,
          r.qualified_leads,
          r.disqualified_leads,
          r.pending_qa_leads,
          r.remaining_target_leads,
          r.completion_percentage,
          r.target_achieved ? "YES" : "NO",
          r.is_final ? "YES" : "NO",
        ];
        csvRows.push(row.join(","));
      });

      return new NextResponse(csvRows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="campaign_analytics_${date || from || "export"}.csv"`,
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
      { success: false, error: "Failed to fetch campaign analytics", details: errorMsg },
      { status: 500 }
    );
  }
}
