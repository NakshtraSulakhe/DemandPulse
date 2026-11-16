import { NextRequest, NextResponse } from "next/server";
import {
  calculateDailyLeadershipIncentives,
  calculateMonthlyLeadershipIncentives,
} from "@/lib/leadership-incentives/calculator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/leadership/calculate?frequency=daily&date=YYYY-MM-DD
 * OR
 * GET /api/incentives/leadership/calculate?frequency=monthly&month=11&year=2026
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const frequency = searchParams.get("frequency") || "daily";

    if (frequency === "monthly") {
      const now = new Date();
      const month = searchParams.get("month")
        ? parseInt(searchParams.get("month")!, 10)
        : now.getMonth() + 1;
      const year = searchParams.get("year")
        ? parseInt(searchParams.get("year")!, 10)
        : now.getFullYear();

      const calculations = await calculateMonthlyLeadershipIncentives(month, year);
      const totalIncentive = calculations.reduce((sum, c) => sum + c.incentive_amount, 0);
      const eligibleLeaders = calculations.filter((c) => c.is_eligible && c.incentive_amount > 0).length;

      return NextResponse.json({
        success: true,
        frequency: "monthly",
        month,
        year,
        summary: {
          total_leaders: calculations.length,
          eligible_leaders: eligibleLeaders,
          total_incentive_amount: totalIncentive,
        },
        data: calculations,
        timestamp: new Date().toISOString(),
      });
    }

    // Default: daily
    const today = new Date().toISOString().split("T")[0];
    const dateStr = searchParams.get("date") || today;

    const calculations = await calculateDailyLeadershipIncentives(dateStr);
    const totalIncentive = calculations.reduce((sum, c) => sum + c.incentive_amount, 0);
    const eligibleLeaders = calculations.filter((c) => c.is_eligible && c.incentive_amount > 0).length;

    return NextResponse.json({
      success: true,
      frequency: "daily",
      date: dateStr,
      summary: {
        total_leaders: calculations.length,
        eligible_leaders: eligibleLeaders,
        total_incentive_amount: totalIncentive,
      },
      data: calculations,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in GET /api/incentives/leadership/calculate:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate leadership incentives" },
      { status: 500 }
    );
  }
}

