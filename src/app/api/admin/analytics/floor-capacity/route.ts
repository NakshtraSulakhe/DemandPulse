import { NextRequest, NextResponse } from "next/server";
import { getFloorDailySnapshotsDateRange, getFloorDailySnapshotForDate } from "@/lib/db/floor-capacity-repository";
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
  const from = searchParams.get("from") || getShiftBusinessDate();
  const to = searchParams.get("to") || from;
  const format = searchParams.get("format");

  try {
    let records: any[] = [];
    if (date) {
      const snap = await getFloorDailySnapshotForDate(date);
      if (snap) records = [snap];
    } else {
      records = await getFloorDailySnapshotsDateRange(from, to);
    }

    if (format === "csv") {
      const headers = [
        "Work Date",
        "Total Agents",
        "Present Agents",
        "Absent Agents",
        "Late Agents",
        "Campaign Target Points",
        "Floor Capacity Points",
        "Capacity Gap Points",
        "Total Achieved Points",
        "Synced At",
      ];

      const csvRows = [headers.join(",")];
      records.forEach((r) => {
        const row = [
          `"${r.work_date}"`,
          r.total_agents,
          r.present_agents,
          r.absent_agents,
          r.late_agents,
          r.campaign_target_points,
          r.floor_capacity_points,
          r.capacity_gap_points,
          r.total_achieved_points,
          `"${r.synced_at}"`,
        ];
        csvRows.push(row.join(","));
      });

      return new NextResponse(csvRows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="floor_capacity_${date || from}.csv"`,
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
      { success: false, error: "Failed to fetch floor capacity history", details: errorMsg },
      { status: 500 }
    );
  }
}
