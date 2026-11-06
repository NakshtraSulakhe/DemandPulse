import { NextRequest, NextResponse } from "next/server";
import { fetchIncentivePreview, fetchDailySettled } from "@/lib/incentives/api";
import { getShiftBusinessDate } from "@/lib/shift/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/achievers
 * Query: date=YYYY-MM-DD
 * Returns the verified list of agents who have achieved incentive today directly fetched from the CRM API.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get("date") || getShiftBusinessDate();

  try {
    const [settledRes, previewRes] = await Promise.all([
      fetchDailySettled({ date }),
      fetchIncentivePreview(date),
    ]);

    const settledAgents = settledRes.data?.agents || [];
    const previewAgents = previewRes.data?.agents || [];

    // Use settled if available, otherwise preview
    const sourceAgents = settledAgents.length > 0 ? settledAgents : previewAgents;

    // Filter agents who have achieved incentive
    const achievers = sourceAgents
      .filter((agent: any) => {
        const achieved = Number(agent.achieved_points || 0);
        const target = Number(agent.target_points || 0);
        const totalInc = Number(agent.total_incentive || 0);
        const isEligible = agent.eligibility_status === "eligible";

        return (totalInc > 0 && achieved >= target) || (isEligible && totalInc > 0);
      })
      .map((agent: any) => {
        const achieved = Number(agent.achieved_points || 0);
        const target = Number(agent.target_points || 0);
        const completionPct =
          target > 0 ? Number(((achieved / target) * 100).toFixed(1)) : Number(agent.completion_pct || 0);

        return {
          agent_id: agent.agent_id,
          agent_name: agent.agent_name,
          role: agent.role || agent.department || "Sales Representative",
          work_date: agent.work_date || date,
          target_points: target,
          achieved_points: achieved,
          completion_pct: completionPct,
          qualified_leads: agent.qualified_leads_count ?? agent.qualified_leads ?? 0,
          disqualified_leads: agent.disqualified_leads_count ?? agent.disqualified_leads ?? 0,
          base_incentive: Number(agent.base_incentive || 0),
          slab_incentive: Number(agent.slab_incentive || 0),
          total_incentive: Number(agent.total_incentive || 0),
          attendance_status: agent.attendance_status || "Present",
          eligibility_status: agent.eligibility_status || "eligible",
          eligibility_reason:
            agent.eligibility_reason || `Target 100% achieved (${completionPct}%) and compliance verified`,
          is_settled: settledAgents.length > 0,
        };
      })
      .sort((a, b) => b.total_incentive - a.total_incentive);

    const totalIncentive = achievers.reduce((sum, a) => sum + a.total_incentive, 0);
    const avgIncentive = achievers.length > 0 ? Math.round(totalIncentive / achievers.length) : 0;
    const topPerformer = achievers.length > 0 ? achievers[0] : null;

    return NextResponse.json(
      {
        success: true,
        work_date: date,
        is_settled: settledAgents.length > 0,
        summary: {
          total_achievers: achievers.length,
          total_incentive_earned: totalIncentive,
          average_incentive: avgIncentive,
          top_performer: topPerformer
            ? {
                name: topPerformer.agent_name,
                achieved_points: topPerformer.achieved_points,
                total_incentive: topPerformer.total_incentive,
              }
            : null,
        },
        achievers,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch daily incentive achievers: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}

