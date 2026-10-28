import { prisma, serializeDbData } from "@/lib/db";
import { Prisma } from "@prisma/client";

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
  const workDate = new Date(input.work_date);

  const run = await prisma.analyticsSyncRun.create({
    data: {
      jobName: input.job_name,
      workDate,
      startedAt: new Date(),
      status: "running",
      sourceWatermark: input.source_watermark || null,
    },
  });

  return {
    runId: run.id.toString(),
    record: {
      id: run.id.toString(),
      job_name: run.jobName,
      work_date: input.work_date,
      started_at: run.startedAt.toISOString(),
      finished_at: null,
      status: "running",
      source_record_count: 0,
      processed_record_count: 0,
      failed_record_count: 0,
      error_summary: null,
      source_watermark: run.sourceWatermark,
      created_at: run.createdAt.toISOString(),
    },
  };
}

/**
 * Marks a synchronization job run as completed or failed.
 */
export async function completeSyncRun(
  input: CompleteSyncRunInput
): Promise<AnalyticsSyncRunRecord> {
  const id = BigInt(input.id);

  const updated = await prisma.analyticsSyncRun.update({
    where: { id },
    data: {
      finishedAt: new Date(),
      status: input.status,
      sourceRecordCount: input.source_record_count,
      processedRecordCount: input.processed_record_count,
      failedRecordCount: input.failed_record_count || 0,
      errorSummary: input.error_summary || null,
    },
  });

  return {
    id: updated.id.toString(),
    job_name: updated.jobName,
    work_date: updated.workDate.toISOString().slice(0, 10),
    started_at: updated.startedAt.toISOString(),
    finished_at: updated.finishedAt ? updated.finishedAt.toISOString() : null,
    status: updated.status as any,
    source_record_count: updated.sourceRecordCount,
    processed_record_count: updated.processedRecordCount,
    failed_record_count: updated.failedRecordCount,
    error_summary: updated.errorSummary,
    source_watermark: updated.sourceWatermark,
    created_at: updated.createdAt.toISOString(),
  };
}

/**
 * Retrieves the most recent sync runs.
 */
export async function getRecentSyncRuns(limit: number = 20): Promise<AnalyticsSyncRunRecord[]> {
  const runs = await prisma.analyticsSyncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return runs.map((r) => ({
    id: r.id.toString(),
    job_name: r.jobName,
    work_date: r.workDate.toISOString().slice(0, 10),
    started_at: r.startedAt.toISOString(),
    finished_at: r.finishedAt ? r.finishedAt.toISOString() : null,
    status: r.status as any,
    source_record_count: r.sourceRecordCount,
    processed_record_count: r.processedRecordCount,
    failed_record_count: r.failedRecordCount,
    error_summary: r.errorSummary,
    source_watermark: r.sourceWatermark,
    created_at: r.createdAt.toISOString(),
  }));
}
