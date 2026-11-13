import { NextRequest, NextResponse } from "next/server";
import {
  getActiveMonthlyIncentivePlan,
  calculateMonthlyIncentive,
  getMonthlySettlements,
  saveMonthlySettlement,
  MonthlyIncentiveSlab,
} from "@/lib/db/agent-monthly-incentive-repository";
import { getEmployeeTargetAssignments } from "@/lib/db/employee-targets-repository";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/monthly?month=11&year=2026&mode=preview
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : now.getMonth() + 1;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : now.getFullYear();
    const mode = searchParams.get("mode") || "preview"; // "preview" or "settled"

    const plan = await getActiveMonthlyIncentivePlan();
    const settledRecords = await getMonthlySettlements(month, year);

    // If already finalized and requested settled mode, return settled records
    if (mode === "settled" && settledRecords.length > 0) {
      const totalIncentive = settledRecords.reduce((sum, r) => sum + r.incentive_earned, 0);
      const eligibleAgents = settledRecords.filter((r) => r.incentive_earned > 0).length;

      return NextResponse.json({
        success: true,
        mode: "settled",
        month,
        year,
        plan,
        summary: {
          total_agents: settledRecords.length,
          eligible_agents: eligibleAgents,
          total_incentive_amount: totalIncentive,
        },
        records: settledRecords,
        timestamp: new Date().toISOString(),
      });
    }

    // Otherwise calculate live preview using assigned targets and monthly snapshots
    const agentTargets = await getEmployeeTargetAssignments({
      role: "Agent",
      month,
      year,
      status: "active",
    });

    // Query aggregated actual monthly points for this month from agent_daily_snapshots
    const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
    const endOfMonth = `${year}-${String(month).padStart(2, "0")}-31`;

    const actualsRows = await query<any>(
      `SELECT crm_agent_id, 
              SUM(achieved_points) as total_achieved_points,
              COUNT(DISTINCT work_date) as days_present
       FROM agent_daily_snapshots
       WHERE work_date >= ? AND work_date <= ?
       GROUP BY crm_agent_id`,
      [startOfMonth, endOfMonth]
    );

    const actualsMap = new Map<number, { points: number; days: number }>();
    (actualsRows || []).forEach((row) => {
      actualsMap.set(Number(row.crm_agent_id), {
        points: Number(row.total_achieved_points) || 0,
        days: Number(row.days_present) || 0,
      });
    });

    // Map existing settled records by employee_id for status overlay
    const settledMap = new Map<number, any>();
    settledRecords.forEach((s) => settledMap.set(s.employee_id, s));

    // Map targets by employee_id
    const targetMap = new Map<number, (typeof agentTargets)[0]>();
    agentTargets.forEach((t) => targetMap.set(t.employee_id, t));

    // Discover agent names from MySQL snapshots
    const agentNamesRows = await query<any>(
      `SELECT DISTINCT crm_agent_id as id, agent_name_snapshot as name
       FROM agent_daily_snapshots
       WHERE crm_agent_id IS NOT NULL AND agent_name_snapshot IS NOT NULL`
    ).catch(() => []);

    const agentNamesMap = new Map<number, string>();
    (agentNamesRows || []).forEach((row: any) => {
      const id = Number(row.id);
      if (id && row.name) agentNamesMap.set(id, row.name.trim());
    });

    // Collect all unique agent IDs (assigned targets + actual monthly performers)
    const allAgentIds = new Set<number>([
      ...agentTargets.map((t) => t.employee_id),
      ...Array.from(actualsMap.keys()),
    ]);

    const agentPreviewItems = Array.from(allAgentIds).map((empId) => {
      const target = targetMap.get(empId);
      const actualData = actualsMap.get(empId) || { points: 0, days: 0 };

      const defaultDaily = 50;
      const defaultWorkingDays = 22;
      const effectiveTarget = target
        ? target.effective_monthly_target
        : defaultDaily * defaultWorkingDays;

      const actualPoints = actualData.points;
      const achievementPct = effectiveTarget > 0
        ? Math.round((actualPoints / effectiveTarget) * 100 * 10) / 10
        : 0;

      const calcResult = calculateMonthlyIncentive(achievementPct, plan.slabs);
      const settled = settledMap.get(empId);

      return {
        employee_id: empId,
        employee_name: target?.employee_name || agentNamesMap.get(empId) || `Agent #${empId}`,
        target_month: month,
        target_year: year,
        working_days_assigned: target ? target.working_days : defaultWorkingDays,
        working_days_present: actualData.days,
        daily_target: target ? target.daily_target : defaultDaily,
        assigned_monthly_target: effectiveTarget,
        is_manually_adjusted: target ? target.is_manually_adjusted : false,
        adjustment_reason: target?.adjustment_reason || null,
        achieved_monthly_points: actualPoints,
        achievement_pct: achievementPct,
        qualifying_threshold_pct: calcResult.qualifyingThresholdPct,
        incentive_earned: calcResult.incentiveAmount,
        qualifying_slab: calcResult.qualifyingSlab,
        approval_status: settled?.approval_status || "provisional",
        payment_status: settled?.payment_status || "unpaid",
        is_settled: Boolean(settled),
        is_default_target: !target,
      };
    });

    const totalIncentivePreview = agentPreviewItems.reduce((acc, a) => acc + a.incentive_earned, 0);
    const eligibleCount = agentPreviewItems.filter((a) => a.incentive_earned > 0).length;

    return NextResponse.json({
      success: true,
      mode: "preview",
      month,
      year,
      plan,
      summary: {
        total_agents: agentPreviewItems.length,
        eligible_agents: eligibleCount,
        total_incentive_amount: totalIncentivePreview,
        is_settled: settledRecords.length > 0,
      },
      records: agentPreviewItems,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Monthly incentive evaluation error: ${msg}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incentives/monthly
 * Finalizes monthly calculations into the settlement ledger
 */
export async function POST(req: NextRequest) {
  const auth = await verifySession(req, ["admin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || "Admin authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const month = Number(body.month);
    const year = Number(body.year);

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: "Month and year are required" },
        { status: 400 }
      );
    }

    const plan = await getActiveMonthlyIncentivePlan();
    const agentTargets = await getEmployeeTargetAssignments({
      role: "Agent",
      month,
      year,
      status: "active",
    });

    const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
    const endOfMonth = `${year}-${String(month).padStart(2, "0")}-31`;

    const actualsRows = await query<any>(
      `SELECT crm_agent_id, 
              SUM(achieved_points) as total_achieved_points,
              COUNT(DISTINCT work_date) as days_present
       FROM agent_daily_snapshots
       WHERE work_date >= ? AND work_date <= ?
       GROUP BY crm_agent_id`,
      [startOfMonth, endOfMonth]
    );

    const actualsMap = new Map<number, { points: number; days: number }>();
    (actualsRows || []).forEach((row) => {
      actualsMap.set(Number(row.crm_agent_id), {
        points: Number(row.total_achieved_points) || 0,
        days: Number(row.days_present) || 0,
      });
    });

    let finalizedCount = 0;

    for (const target of agentTargets) {
      const empId = target.employee_id;
      const actualData = actualsMap.get(empId) || { points: 0, days: 0 };
      const effectiveTarget = target.effective_monthly_target;
      const actualPoints = actualData.points;
      const achievementPct = effectiveTarget > 0
        ? Math.round((actualPoints / effectiveTarget) * 100 * 10) / 10
        : 0;

      const calcResult = calculateMonthlyIncentive(achievementPct, plan.slabs);

      await saveMonthlySettlement({
        employee_id: empId,
        employee_name: target.employee_name,
        settlement_month: month,
        settlement_year: year,
        assigned_monthly_target: effectiveTarget,
        achieved_monthly_points: actualPoints,
        achievement_pct: achievementPct,
        qualifying_threshold_pct: calcResult.qualifyingThresholdPct,
        incentive_earned: calcResult.incentiveAmount,
        working_days_present: actualData.days,
        working_days_assigned: target.working_days,
        approval_status: "pending_approval",
        payment_status: "unpaid",
        remarks: `Finalized by ${auth.user?.name || "Admin"}`,
      });

      finalizedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Finalized monthly settlement for ${finalizedCount} agents (${month}/${year}). Submitted for approval.`,
      finalizedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Settlement finalization error: ${msg}` },
      { status: 500 }
    );
  }
}

