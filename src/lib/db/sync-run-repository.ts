import { query, queryOne, execute } from "@/lib/db";

export interface AnalyticsSyncRunRecord {
  id: string;
  job_name: string;
  work_date: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "completed" | "failed" | "partial";
  source_record_count: number;
  processed_record_count: number;
  failed_record_count: number;
  error_summary: string | null;
  source_watermark: string | null;
  created_at: string;
}

export interface StartSyncRunInput {
  job_name: string;
  work_date: string;
  source_watermark?: string | null;
}

export interface CompleteSyncRunInput {
  id: string | bigint;
  status: "completed" | "failed" | "partial";
  source_record_count: number;
  processed_record_count: number;
  failed_record_count?: number;
  error_summary?: string | null;
}

/**
 * Records the start of a synchronization job run.
 */
export async function startSyncRun(
  input: StartSyncRunInput
): Promise<{ runId: string; record: AnalyticsSyncRunRecord }> {
  const res = await execute(
    `INSERT INTO analytics_sync_runs (job_name, work_date, started_at, status, source_watermark, created_at)
     VALUES (?, ?, NOW(6), 'running', ?, NOW(6))`,
    [input.job_name, input.work_date, input.source_watermark || null]
  );

  const runId = res.insertId.toString();

  const record = await queryOne<any>(
    `SELECT * FROM analytics_sync_runs WHERE id = ? LIMIT 1`,
    [res.insertId]
  );

  return {
    runId,
    record: {
      id: runId,
      job_name: record?.job_name || input.job_name,
      work_date: input.work_date,
      started_at: String(record?.started_at || new Date().toISOString()),
      finished_at: null,
      status: "running",
      source_record_count: 0,
      processed_record_count: 0,
      failed_record_count: 0,
      error_summary: null,
      source_watermark: record?.source_watermark || input.source_watermark || null,
      created_at: String(record?.created_at || new Date().toISOString()),
    },
  };
}

/**
 * Marks a synchronization job run as completed or failed.
 */
export async function completeSyncRun(
  input: CompleteSyncRunInput
): Promise<AnalyticsSyncRunRecord> {
  const numericId = Number(input.id);

  await execute(
    `UPDATE analytics_sync_runs
     SET finished_at = NOW(6),
         status = ?,
         source_record_count = ?,
         processed_record_count = ?,
         failed_record_count = ?,
         error_summary = ?
     WHERE id = ?`,
    [
      input.status,
      input.source_record_count,
      input.processed_record_count,
      input.failed_record_count || 0,
      input.error_summary || null,
      numericId,
    ]
  );

  const updated = await queryOne<any>(
    `SELECT * FROM analytics_sync_runs WHERE id = ? LIMIT 1`,
    [numericId]
  );

  return {
    id: String(numericId),
    job_name: updated.job_name,
    work_date: typeof updated.work_date === "string" ? updated.work_date.slice(0, 10) : new Date(updated.work_date).toISOString().slice(0, 10),
    started_at: String(updated.started_at),
    finished_at: updated.finished_at ? String(updated.finished_at) : null,
    status: updated.status,
    source_record_count: updated.source_record_count,
    processed_record_count: updated.processed_record_count,
    failed_record_count: updated.failed_record_count,
    error_summary: updated.error_summary,
    source_watermark: updated.source_watermark,
    created_at: String(updated.created_at),
  };
}

/**
 * Retrieves the most recent sync runs.
 */
export async function getRecentSyncRuns(limit: number = 20): Promise<AnalyticsSyncRunRecord[]> {
  const runs = await query<any>(
    `SELECT * FROM analytics_sync_runs ORDER BY started_at DESC LIMIT ?`,
    [limit]
  );

  return runs.map((r) => ({
    id: r.id.toString(),
    job_name: r.job_name,
    work_date: typeof r.work_date === "string" ? r.work_date.slice(0, 10) : new Date(r.work_date).toISOString().slice(0, 10),
    started_at: String(r.started_at),
    finished_at: r.finished_at ? String(r.finished_at) : null,
    status: r.status,
    source_record_count: r.source_record_count,
    processed_record_count: r.processed_record_count,
    failed_record_count: r.failed_record_count,
    error_summary: r.error_summary,
    source_watermark: r.source_watermark,
    created_at: String(r.created_at),
  }));
}
