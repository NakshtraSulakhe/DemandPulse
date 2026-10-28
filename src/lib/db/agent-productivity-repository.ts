import { prisma, serializeDbData } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface AgentDailySnapshotRecord {
  id: string;
  crm_agent_id: number;
  agent_name_snapshot: string;
  work_date: string;
  daily_target_points: number;
  achieved_points: number;
  qualified_leads: number;
  disqualified_leads: number;
  generated_leads: number;
  pending_qa_leads: number;
  remaining_target_points: number;
  target_completion_pct: number;
  attendance_status_snapshot: string;
  effective_work_minutes: number;
  elapsed_work_minutes: number;
  expected_points_at_snapshot: number;
  productivity_pace_pct: number | null;
  pace_status: "slow" | "steady" | "ahead" | "pre_shift" | null;
  source_updated_at: string | null;
  synced_at: string;
  snapshot_version: number;
  is_final: boolean;
}

export interface AgentIntervalMetricRecord {
  id: string;
  crm_agent_id: number;
  agent_name_snapshot: string | null;
  work_date: string;
  interval_start_at: string;
  interval_end_at: string;
  generated_leads: number;
  synced_at: string;
}

export interface UpsertAgentSnapshotInput {
  crm_agent_id: number;
  agent_name: string;
  daily_target_points: number;
  achieved_points: number;
  qualified_leads: number;
  disqualified_leads?: number;
  generated_leads: number;
  pending_qa_leads?: number;
  attendance_status?: string;
  elapsed_work_minutes?: number;
  source_updated_at?: Date | string | null;
}

/**
 * Calculates agent productivity progress and pace.
 * - Effective working duration: 465 minutes (7h 45m).
 * - Expected Points = Daily Target Points * Elapsed / 465
 * - Productivity Pace % = Achieved Points / Expected Points * 100
 * - Color indicators:
 *   - 0-30% "slow" (red)
 *   - >30-80% "steady" (yellow)
 *   - >80% "ahead" (green)
 * - If elapsed minutes is 0 or before shift, pace is null (not 0).
 */
export function calculateAgentPace(
  dailyTargetPoints: number,
  achievedPoints: number,
  elapsedMinutes: number = 0,
  effectiveTotalMinutes: number = 465
): {
  expectedPoints: number;
  productivityPacePct: number | null;
  paceStatus: "slow" | "steady" | "ahead" | "pre_shift" | null;
} {
  const target = Math.max(0, dailyTargetPoints);
  const achieved = Math.max(0, achievedPoints);

  if (elapsedMinutes <= 0 || target <= 0) {
    return {
      expectedPoints: 0,
      productivityPacePct: null,
      paceStatus: "pre_shift",
    };
  }

  const cappedElapsed = Math.min(elapsedMinutes, effectiveTotalMinutes);
  const expected = (target * cappedElapsed) / effectiveTotalMinutes;
  const roundedExpected = Math.round(expected * 1000) / 1000;

  if (roundedExpected <= 0) {
    return {
      expectedPoints: 0,
      productivityPacePct: null,
      paceStatus: "pre_shift",
    };
  }

  const pacePct = Math.round((achieved / roundedExpected) * 100 * 10) / 10;

  let paceStatus: "slow" | "steady" | "ahead" = "steady";
  if (pacePct <= 30) {
    paceStatus = "slow";
  } else if (pacePct > 80) {
    paceStatus = "ahead";
  }

  return {
    expectedPoints: roundedExpected,
    productivityPacePct: pacePct,
    paceStatus,
  };
}

/**
 * Upserts a batch of agent daily productivity snapshots.
 */
export async function upsertAgentDailySnapshots(
  workDateStr: string,
  agents: UpsertAgentSnapshotInput[],
  isFinal: boolean = false,
  snapshotVersion: number = 1
): Promise<{ success: boolean; count: number }> {
  if (!agents || agents.length === 0) {
    return { success: true, count: 0 };
  }

  const workDate = new Date(workDateStr);

  await prisma.$transaction(async (tx) => {
    for (const a of agents) {
      const crmAgentId = BigInt(a.crm_agent_id);
      const targetPts = Math.max(0, a.daily_target_points);
      const achievedPts = Math.max(0, a.achieved_points);
      const remainingPts = Math.max(0, targetPts - achievedPts);
      const completionPct =
        targetPts > 0
          ? Math.round((achievedPts / targetPts) * 100 * 1000) / 1000
          : 0;

      const elapsed = a.elapsed_work_minutes ?? 0;
      const paceInfo = calculateAgentPace(targetPts, achievedPts, elapsed, 465);

      const sourceUpdatedAt = a.source_updated_at
        ? new Date(a.source_updated_at)
        : null;

      await tx.agentDailySnapshot.upsert({
        where: {
          crmAgentId_workDate_snapshotVersion: {
            crmAgentId,
            workDate,
            snapshotVersion,
          },
        },
        update: {
          agentNameSnapshot: a.agent_name,
          dailyTargetPoints: new Prisma.Decimal(targetPts),
          achievedPoints: new Prisma.Decimal(achievedPts),
          qualifiedLeads: a.qualified_leads,
          disqualifiedLeads: a.disqualified_leads || 0,
          generatedLeads: a.generated_leads,
          pendingQaLeads: a.pending_qa_leads || 0,
          remainingTargetPoints: new Prisma.Decimal(remainingPts),
          targetCompletionPct: new Prisma.Decimal(completionPct),
          attendanceStatusSnapshot: a.attendance_status || "Present",
          effectiveWorkMinutes: 465,
          elapsedWorkMinutes: elapsed,
          expectedPointsAtSnapshot: new Prisma.Decimal(paceInfo.expectedPoints),
          productivityPacePct:
            paceInfo.productivityPacePct !== null
              ? new Prisma.Decimal(paceInfo.productivityPacePct)
              : null,
          paceStatus: paceInfo.paceStatus,
          sourceUpdatedAt,
          syncedAt: new Date(),
          isFinal,
        },
        create: {
          crmAgentId,
          agentNameSnapshot: a.agent_name,
          workDate,
          dailyTargetPoints: new Prisma.Decimal(targetPts),
          achievedPoints: new Prisma.Decimal(achievedPts),
          qualifiedLeads: a.qualified_leads,
          disqualifiedLeads: a.disqualified_leads || 0,
          generatedLeads: a.generated_leads,
          pendingQaLeads: a.pending_qa_leads || 0,
          remainingTargetPoints: new Prisma.Decimal(remainingPts),
          targetCompletionPct: new Prisma.Decimal(completionPct),
          attendanceStatusSnapshot: a.attendance_status || "Present",
          effectiveWorkMinutes: 465,
          elapsedWorkMinutes: elapsed,
          expectedPointsAtSnapshot: new Prisma.Decimal(paceInfo.expectedPoints),
          productivityPacePct:
            paceInfo.productivityPacePct !== null
              ? new Prisma.Decimal(paceInfo.productivityPacePct)
              : null,
          paceStatus: paceInfo.paceStatus,
          sourceUpdatedAt,
          syncedAt: new Date(),
          snapshotVersion,
          isFinal,
        },
      });
    }
  });

  return { success: true, count: agents.length };
}

/**
 * Retrieves agent daily snapshots for a specific business date.
 */
export async function getAgentSnapshotsForDate(
  workDateStr: string,
  filters?: {
    snapshotVersion?: number;
    agentId?: number;
    paceStatus?: string;
  }
): Promise<AgentDailySnapshotRecord[]> {
  const workDate = new Date(workDateStr);
  const where: Prisma.AgentDailySnapshotWhereInput = {
    workDate,
    snapshotVersion: filters?.snapshotVersion ?? 1,
  };

  if (filters?.agentId) {
    where.crmAgentId = BigInt(filters.agentId);
  }
  if (filters?.paceStatus && filters.paceStatus !== "all") {
    where.paceStatus = filters.paceStatus;
  }

  const rows = await prisma.agentDailySnapshot.findMany({
    where,
    orderBy: [{ achievedPoints: "desc" }, { agentNameSnapshot: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_agent_id: Number(r.crmAgentId),
    agent_name_snapshot: r.agentNameSnapshot,
    work_date: workDateStr,
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
    productivity_pace_pct:
      r.productivityPacePct !== null ? Number(r.productivityPacePct) : null,
    paceStatus: r.paceStatus as any,
    source_updated_at: r.sourceUpdatedAt ? r.sourceUpdatedAt.toISOString() : null,
    synced_at: r.syncedAt.toISOString(),
    snapshot_version: r.snapshotVersion,
    is_final: r.isFinal,
  }));
}

/**
 * Upserts 10-minute agent generation heatmap interval metrics into MySQL.
 */
export async function upsertAgentIntervalMetrics(
  workDateStr: string,
  intervals: Array<{
    crm_agent_id: number;
    agent_name?: string | null;
    interval_start_at: Date | string;
    interval_end_at: Date | string;
    generated_leads: number;
  }>
): Promise<{ success: boolean; count: number }> {
  if (!intervals || intervals.length === 0) {
    return { success: true, count: 0 };
  }

  const workDate = new Date(workDateStr);

  await prisma.$transaction(async (tx) => {
    for (const item of intervals) {
      const crmAgentId = BigInt(item.crm_agent_id);
      const intervalStartAt = new Date(item.interval_start_at);
      const intervalEndAt = new Date(item.interval_end_at);

      await tx.agentIntervalMetric.upsert({
        where: {
          crmAgentId_intervalStartAt: {
            crmAgentId,
            intervalStartAt,
          },
        },
        update: {
          agentNameSnapshot: item.agent_name || null,
          workDate,
          intervalEndAt,
          generatedLeads: item.generated_leads,
          syncedAt: new Date(),
        },
        create: {
          crmAgentId,
          agentNameSnapshot: item.agent_name || null,
          workDate,
          intervalStartAt,
          intervalEndAt,
          generatedLeads: item.generated_leads,
          syncedAt: new Date(),
        },
      });
    }
  });

  return { success: true, count: intervals.length };
}

/**
 * Retrieves agent interval metrics for a given work date.
 */
export async function getAgentIntervalMetricsForDate(
  workDateStr: string,
  agentId?: number
): Promise<AgentIntervalMetricRecord[]> {
  const workDate = new Date(workDateStr);
  const where: Prisma.AgentIntervalMetricWhereInput = { workDate };
  if (agentId) {
    where.crmAgentId = BigInt(agentId);
  }

  const rows = await prisma.agentIntervalMetric.findMany({
    where,
    orderBy: [{ intervalStartAt: "asc" }, { generatedLeads: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_agent_id: Number(r.crmAgentId),
    agent_name_snapshot: r.agentNameSnapshot,
    work_date: workDateStr,
    interval_start_at: r.intervalStartAt.toISOString(),
    interval_end_at: r.intervalEndAt.toISOString(),
    generated_leads: r.generatedLeads,
    synced_at: r.syncedAt.toISOString(),
  }));
}
