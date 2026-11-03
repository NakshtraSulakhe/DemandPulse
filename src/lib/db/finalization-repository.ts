import { query, queryOne, execute, withTransaction } from "@/lib/db";

export type FinalizationStatus =
  | "provisional"
  | "finalizing"
  | "finalized"
  | "correction_pending"
  | "reconciliation_required";

export interface AnalyticsDailyFinalizationRecord {
  id: string;
  work_date: string;
  finalization_status: FinalizationStatus;
  finalized_at: string | null;
  finalized_by: number | null;
  source_watermark: string | null;
  revision_number: number;
  last_reconciled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieves the finalization status record for a work date, defaulting to 'provisional' if none exists.
 */
export async function getDailyFinalization(
  workDateStr: string
): Promise<AnalyticsDailyFinalizationRecord> {
  const sql = `
    SELECT id, work_date, finalization_status, finalized_at, finalized_by, source_watermark, revision_number, last_reconciled_at, created_at, updated_at
    FROM analytics_daily_finalizations
    WHERE work_date = ?
    LIMIT 1
  `;

  const existing = await queryOne<any>(sql, [workDateStr]);

  if (existing) {
    return {
      id: existing.id.toString(),
      work_date: workDateStr,
      finalization_status: existing.finalization_status as FinalizationStatus,
      finalized_at: existing.finalized_at ? String(existing.finalized_at) : null,
      finalized_by: existing.finalized_by ? Number(existing.finalized_by) : null,
      source_watermark: existing.source_watermark,
      revision_number: existing.revision_number,
      last_reconciled_at: existing.last_reconciled_at ? String(existing.last_reconciled_at) : null,
      created_at: String(existing.created_at),
      updated_at: String(existing.updated_at),
    };
  }

  return {
    id: "0",
    work_date: workDateStr,
    finalization_status: "provisional",
    finalized_at: null,
    finalized_by: null,
    source_watermark: null,
    revision_number: 1,
    last_reconciled_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Sets or updates the daily finalization status in MySQL.
 */
export async function setDailyFinalizationStatus(
  workDateStr: string,
  status: FinalizationStatus,
  finalizedBy: number = 1,
  sourceWatermark?: string | null
): Promise<AnalyticsDailyFinalizationRecord> {
  const isFinal = status === "finalized";
  const finalizedAtStr = isFinal ? new Date().toISOString().slice(0, 19).replace("T", " ") : null;

  const sql = `
    INSERT INTO analytics_daily_finalizations (
      work_date, finalization_status, finalized_at, finalized_by, source_watermark, revision_number, last_reconciled_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, NOW(6), NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      finalization_status = VALUES(finalization_status),
      finalized_at = VALUES(finalized_at),
      finalized_by = VALUES(finalized_by),
      source_watermark = COALESCE(VALUES(source_watermark), source_watermark),
      last_reconciled_at = NOW(6),
      updated_at = NOW(6)
  `;

  await withTransaction(async (conn) => {
    await conn.execute(sql, [
      workDateStr,
      status,
      finalizedAtStr,
      finalizedBy,
      sourceWatermark || null,
    ]);

    if (isFinal) {
      await conn.execute(`UPDATE campaign_daily_snapshots SET is_final = 1, updated_at = NOW(6) WHERE work_date = ?`, [workDateStr]);
      await conn.execute(`UPDATE agent_daily_snapshots SET is_final = 1, updated_at = NOW(6) WHERE work_date = ?`, [workDateStr]);
      await conn.execute(`UPDATE incentive_daily_snapshots SET is_final = 1, updated_at = NOW(6) WHERE work_date = ?`, [workDateStr]);
    }
  });

  return await getDailyFinalization(workDateStr);
}
