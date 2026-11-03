import { query, execute, withTransaction } from "@/lib/db";

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
 * Upserts a batch of agent daily productivity snapshots into MySQL.
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

  const sql = `
    INSERT INTO agent_daily_snapshots (
      crm_agent_id, agent_name_snapshot, work_date, daily_target_points, achieved_points,
      qualified_leads, disqualified_leads, generated_leads, pending_qa_leads, remaining_target_points,
      target_completion_pct, attendance_status_snapshot, effective_work_minutes, elapsed_work_minutes,
      expected_points_at_snapshot, productivity_pace_pct, pace_status, source_updated_at, synced_at,
      snapshot_version, is_final, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), ?, ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      agent_name_snapshot = VALUES(agent_name_snapshot),
      daily_target_points = VALUES(daily_target_points),
      achieved_points = VALUES(achieved_points),
      qualified_leads = VALUES(qualified_leads),
      disqualified_leads = VALUES(disqualified_leads),
      generated_leads = VALUES(generated_leads),
      pending_qa_leads = VALUES(pending_qa_leads),
      remaining_target_points = VALUES(remaining_target_points),
      target_completion_pct = VALUES(target_completion_pct),
      attendance_status_snapshot = VALUES(attendance_status_snapshot),
      effective_work_minutes = VALUES(effective_work_minutes),
      elapsed_work_minutes = VALUES(elapsed_work_minutes),
      expected_points_at_snapshot = VALUES(expected_points_at_snapshot),
      productivity_pace_pct = VALUES(productivity_pace_pct),
      pace_status = VALUES(pace_status),
      source_updated_at = VALUES(source_updated_at),
      synced_at = NOW(6),
      is_final = VALUES(is_final),
      updated_at = NOW(6)
  `;

  await withTransaction(async (conn) => {
    for (const a of agents) {
      const crmAgentId = Number(a.crm_agent_id);
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
        ? new Date(a.source_updated_at).toISOString().slice(0, 19).replace("T", " ")
        : null;

      await conn.execute(sql, [
        crmAgentId,
        a.agent_name,
        workDateStr,
        targetPts,
        achievedPts,
        a.qualified_leads,
        a.disqualified_leads || 0,
        a.generated_leads,
        a.pending_qa_leads || 0,
        remainingPts,
        completionPct,
        a.attendance_status || "Present",
        465,
        elapsed,
        paceInfo.expectedPoints,
        paceInfo.productivityPacePct,
        paceInfo.paceStatus,
        sourceUpdatedAt,
        snapshotVersion,
        isFinal ? 1 : 0,
      ]);
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
  const version = filters?.snapshotVersion ?? 1;
  const whereClauses = ["work_date = ?", "snapshot_version = ?"];
  const params: any[] = [workDateStr, version];

  if (filters?.agentId) {
    whereClauses.push("crm_agent_id = ?");
    params.push(filters.agentId);
  }
  if (filters?.paceStatus && filters.paceStatus !== "all") {
    whereClauses.push("pace_status = ?");
    params.push(filters.paceStatus);
  }

  const sql = `
    SELECT * FROM agent_daily_snapshots
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY achieved_points DESC, agent_name_snapshot ASC
  `;

  const rows = await query<any>(sql, params);

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_agent_id: Number(r.crm_agent_id),
    agent_name_snapshot: r.agent_name_snapshot,
    work_date: workDateStr,
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
    productivity_pace_pct:
      r.productivity_pace_pct !== null && r.productivity_pace_pct !== undefined
        ? Number(r.productivity_pace_pct)
        : null,
    pace_status: (r.pace_status as any) ?? null,
    source_updated_at: r.source_updated_at ? String(r.source_updated_at) : null,
    synced_at: String(r.synced_at),
    snapshot_version: r.snapshot_version,
    is_final: Boolean(r.is_final),
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

  const sql = `
    INSERT INTO agent_interval_metrics (
      crm_agent_id, agent_name_snapshot, work_date, interval_start_at, interval_end_at, generated_leads, synced_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      agent_name_snapshot = VALUES(agent_name_snapshot),
      work_date = VALUES(work_date),
      interval_end_at = VALUES(interval_end_at),
      generated_leads = VALUES(generated_leads),
      synced_at = NOW(6)
  `;

  const BATCH_SIZE = 50;
  for (let i = 0; i < intervals.length; i += BATCH_SIZE) {
    const chunk = intervals.slice(i, i + BATCH_SIZE);
    await withTransaction(async (conn) => {
      for (const item of chunk) {
        const crmAgentId = Number(item.crm_agent_id);
        const start = new Date(item.interval_start_at).toISOString().slice(0, 19).replace("T", " ");
        const end = new Date(item.interval_end_at).toISOString().slice(0, 19).replace("T", " ");

        await conn.execute(sql, [
          crmAgentId,
          item.agent_name || null,
          workDateStr,
          start,
          end,
          item.generated_leads,
        ]);
      }
    });
  }

  return { success: true, count: intervals.length };
}

/**
 * Retrieves agent interval metrics for a given work date.
 */
export async function getAgentIntervalMetricsForDate(
  workDateStr: string,
  agentId?: number
): Promise<AgentIntervalMetricRecord[]> {
  const whereClauses = ["work_date = ?"];
  const params: any[] = [workDateStr];

  if (agentId) {
    whereClauses.push("crm_agent_id = ?");
    params.push(agentId);
  }

  const sql = `
    SELECT * FROM agent_interval_metrics
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY interval_start_at ASC, generated_leads DESC
  `;

  const rows = await query<any>(sql, params);

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_agent_id: Number(r.crm_agent_id),
    agent_name_snapshot: r.agent_name_snapshot,
    work_date: workDateStr,
    interval_start_at: String(r.interval_start_at),
    interval_end_at: String(r.interval_end_at),
    generated_leads: r.generated_leads,
    synced_at: String(r.synced_at),
  }));
}
