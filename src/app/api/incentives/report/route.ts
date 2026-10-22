import { NextRequest, NextResponse } from "next/server";
import { fetchPayrollReport, fetchPayrollCsv } from "@/lib/incentives/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/report?month=YYYY-MM&export=json|csv
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const month = searchParams.get("month") || new Date().toISOString().substring(0, 7);
  const exportType = searchParams.get("export")?.toLowerCase() === "csv" ? "csv" : "json";

  if (exportType === "csv") {
    const csvResult = await fetchPayrollCsv(month);
    if (!csvResult.ok || !csvResult.csv) {
      return NextResponse.json(
        { success: false, error: csvResult.error || "Failed to generate CSV report" },
        { status: 502 }
      );
    }

    return new NextResponse(csvResult.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="incentive_payroll_reconciliation_${month}.csv"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  const result = await fetchPayrollReport(month, "json");

  return NextResponse.json(result, {
    status: result.success ? 200 : result.status || 500,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
