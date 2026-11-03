import { query, execute, withTransaction } from "@/lib/db";

export interface QaDailySnapshotRecord {
  id: string;
  crm_qa_agent_id: number;
  qa_agent_name_snapshot: string | null;
  work_date: string;
  total_audits: number;
  unique_leads_audited: number;
  qualified_leads: number;
  disqualified_leads: number;
  rework_leads: number;
  other_qa_status_counts_json: any;
  synced_at: string;
  snapshot_version: number;
}

export interface QaIntervalMetricRecord {
  id: string;
  crm_qa_agent_id: number;
  qa_agent_name_snapshot: string | null;
  work_date: string;
  interval_start_at: string;
  interval_end_at: string;
  audited_events: number;
  qualified_events: number;
  disqualified_events: number;
  unique_leads_qualified: number;
  synced_at: string;
}

export interface UpsertQaDailySnapshotInput {
  crm_qa_agent_id: number;
  qa_agent_name?: string | null;
  total_audits: number;
  unique_leads_audited?: number;
  qualified_leads: number;
  disqualified_leads?: number;
  rework_leads?: number;
  other_qa_status_counts_json?: any;
}

/**
 * Upserts QA daily analyst performance records into MySQL.
 */
export async function upsertQaDailySnapshots(
  workDateStr: string,
  analysts: UpsertQaDailySnapshotInput[],
  snapshotVersion: number = 1
): Promise<{ success: boolean; count: number }> {
  if (!analysts || analysts.length === 0) {
    return { success: true, count: 0 };
  }

  const sql = `
    INSERT INTO qa_daily_snapshots (
      crm_qa_agent_id, qa_agent_name_snapshot, work_date, total_audits, unique_leads_audited,
      qualified_leads, disqualified_leads, rework_leads, other_qa_status_counts_json, synced_at,
      snapshot_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      qa_agent_name_snapshot = VALUES(qa_agent_name_snapshot),
      total_audits = VALUES(total_audits),
      unique_leads_audited = VALUES(unique_leads_audited),
      qualified_leads = VALUES(qualified_leads),
      disqualified_leads = VALUES(disqualified_leads),
      rework_leads = VALUES(rework_leads),
      other_qa_status_counts_json = VALUES(other_qa_status_counts_json),
      synced_at = NOW(6),
      updated_at = NOW(6)
  `;

  await withTransaction(async (conn) => {
    for (const a of analysts) {
      const crmQaAgentId = Number(a.crm_qa_agent_id);
      const uniqueAudits = a.unique_leads_audited ?? a.total_audits;
      const jsonStatus = a.other_qa_status_counts_json ? JSON.stringify(a.other_qa_status_counts_json) : null;

      await conn.execute(sql, [
        crmQaAgentId,
        a.qa_agent_name || null,
        workDateStr,
        a.total_audits,
        uniqueAudits,
        a.qualified_leads,
        a.disqualified_leads || 0,
        a.rework_leads || 0,
        jsonStatus,
        snapshotVersion,
      ]);
    }
  });

  return { success: true, count: analysts.length };
}

/**
 * Retrieves QA daily snapshots for a work date.
 */
export async function getQaDailySnapshotsForDate(
  workDateStr: string,
  snapshotVersion: number = 1
): Promise<QaDailySnapshotRecord[]> {
  const sql = `
    SELECT * FROM qa_daily_snapshots
    WHERE work_date = ? AND snapshot_version = ?
    ORDER BY qualified_leads DESC, total_audits DESC
  `;

  const rows = await query<any>(sql, [workDateStr, snapshotVersion]);

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_qa_agent_id: Number(r.crm_qa_agent_id),
    qa_agent_name_snapshot: r.qa_agent_name_snapshot,
    work_date: workDateStr,
    total_audits: r.total_audits,
    unique_leads_audited: r.unique_leads_audited,
    qualified_leads: r.qualified_leads,
    disqualified_leads: r.disqualified_leads,
    rework_leads: r.rework_leads,
    other_qa_status_counts_json: typeof r.other_qa_status_counts_json === "string"
      ? JSON.parse(r.other_qa_status_counts_json)
      : r.other_qa_status_counts_json,
    synced_at: String(r.synced_at),
    snapshot_version: r.snapshot_version,
  }));
}

/**
 * Upserts 10-minute QA interval metrics across shift into MySQL.
 */
export async function upsertQaIntervalMetrics(
  workDateStr: string,
  intervals: Array<{
    crm_qa_agent_id: number;
    qa_agent_name?: string | null;
    interval_start_at: Date | string;
    interval_end_at: Date | string;
    audited_events: number;
    qualified_events: number;
    disqualified_events?: number;
    unique_leads_qualified?: number;
  }>
): Promise<{ success: boolean; count: number }> {
  if (!intervals || intervals.length === 0) {
    return { success: true, count: 0 };
  }

  const sql = `
    INSERT INTO qa_interval_metrics (
      crm_qa_agent_id, qa_agent_name_snapshot, work_date, interval_start_at, interval_end_at,
      audited_events, qualified_events, disqualified_events, unique_leads_qualified, synced_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      qa_agent_name_snapshot = VALUES(qa_agent_name_snapshot),
      work_date = VALUES(work_date),
      interval_end_at = VALUES(interval_end_at),
      audited_events = VALUES(audited_events),
      qualified_events = VALUES(qualified_events),
      disqualified_events = VALUES(disqualified_events),
      unique_leads_qualified = VALUES(unique_leads_qualified),
      synced_at = NOW(6)
  `;

  const BATCH_SIZE = 50;
  for (let i = 0; i < intervals.length; i += BATCH_SIZE) {
    const chunk = intervals.slice(i, i + BATCH_SIZE);
    await withTransaction(async (conn) => {
      for (const item of chunk) {
        const crmQaAgentId = Number(item.crm_qa_agent_id);
        const start = new Date(item.interval_start_at).toISOString().slice(0, 19).replace("T", " ");
        const end = new Date(item.interval_end_at).toISOString().slice(0, 19).replace("T", " ");
        const uniqueQualified = item.unique_leads_qualified ?? item.qualified_events;

        await conn.execute(sql, [
          crmQaAgentId,
          item.qa_agent_name || null,
          workDateStr,
          start,
          end,
          item.audited_events,
          item.qualified_events,
          item.disqualified_events || 0,
          uniqueQualified,
        ]);
      }
    });
  }

  return { success: true, count: intervals.length };
}

/**
 * Retrieves QA interval metrics for a work date.
 */
export async function getQaIntervalMetricsForDate(
  workDateStr: string,
  analystId?: number
): Promise<QaIntervalMetricRecord[]> {
  const whereClauses = ["work_date = ?"];
  const params: any[] = [workDateStr];

  if (analystId) {
    whereClauses.push("crm_qa_agent_id = ?");
    params.push(analystId);
  }

  const sql = `
    SELECT * FROM qa_interval_metrics
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY interval_start_at ASC, audited_events DESC
  `;

  const rows = await query<any>(sql, params);

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_qa_agent_id: Number(r.crm_qa_agent_id),
    qa_agent_name_snapshot: r.qa_agent_name_snapshot,
    work_date: workDateStr,
    interval_start_at: String(r.interval_start_at),
    interval_end_at: String(r.interval_end_at),
    audited_events: r.audited_events,
    qualified_events: r.qualified_events,
    disqualified_events: r.disqualified_events,
    unique_leads_qualified: r.unique_leads_qualified,
    synced_at: String(r.synced_at),
  }));
}
