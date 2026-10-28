/**
 * DemandFlow Slides - Historical Backfill Service
 *
 * Responsibilities:
 * 1. Identifies missing business dates in MySQL.
 * 2. Fetches historical operational data from CRM APIs for each date.
 * 3. Persists snapshots with source watermarks and version tracking.
 * 4. Transparently flags dates with partial or unavailable granular QA intervals.
 * 5. Guarantees zero fabricated data.
 */

import { prisma } from "@/lib/db";
import { runAnalyticsSync, SyncEngineResult } from "@/lib/sync/sync-engine";
import { setDailyFinalizationStatus } from "@/lib/db/finalization-repository";

export interface BackfillDateReport {
  date: string;
  status: "reconstructed" | "partially_reconstructed" | "already_persisted" | "failed";
  recordsProcessed: number;
  notes: string;
  error?: string;
}

export interface BackfillRunSummary {
  startDate: string;
  endDate: string;
  totalDays: number;
  reconstructedDays: number;
  partialDays: number;
  alreadyPersistedDays: number;
  failedDays: number;
  reports: BackfillDateReport[];
  durationMs: number;
}

/**
 * Generates an array of YYYY-MM-DD date strings between start and end inclusive.
 */
function getDateList(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDateStr);
  const end = new Date(endDateStr);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Executes a historical backfill for a date range.
 */
export async function runHistoricalBackfill(
  startDateStr: string,
  endDateStr: string,
  options?: {
    overwriteExisting?: boolean;
    markFinal?: boolean;
  }
): Promise<BackfillRunSummary> {
  const startMs = Date.now();
  const dateList = getDateList(startDateStr, endDateStr);
  const reports: BackfillDateReport[] = [];

  let reconstructedDays = 0;
  let partialDays = 0;
  let alreadyPersistedDays = 0;
  let failedDays = 0;

  for (const date of dateList) {
    try {
      // Check if date already has persisted records in MySQL
      const existingCampaignCount = await prisma.campaignDailySnapshot.count({
        where: { workDate: new Date(date) },
      });

      if (existingCampaignCount > 0 && !options?.overwriteExisting) {
        alreadyPersistedDays++;
        reports.push({
          date,
          status: "already_persisted",
          recordsProcessed: existingCampaignCount,
          notes: "Date already exists in database. Skipped (use overwriteExisting to re-sync).",
        });
        continue;
      }

      // Execute sync for this historical date
      const syncResult: SyncEngineResult = await runAnalyticsSync(date, {
        force: true,
        jobName: "historical_backfill",
        isFinal: options?.markFinal ?? true,
      });

      if (!syncResult.success && syncResult.processedCount === 0) {
        failedDays++;
        reports.push({
          date,
          status: "failed",
          recordsProcessed: 0,
          notes: "No data could be retrieved from CRM API for this date.",
          error: Object.values(syncResult.errors).join("; "),
        });
        continue;
      }

      // Check completeness: were intervals returned or only daily totals?
      const intervalCount = await prisma.qaIntervalMetric.count({
        where: { workDate: new Date(date) },
      });

      if (intervalCount === 0) {
        // CRM only had current status, no granular 10-minute intervals
        partialDays++;
        reports.push({
          date,
          status: "partially_reconstructed",
          recordsProcessed: syncResult.processedCount,
          notes: "Daily totals reconstructed. Granular 10-minute QA audit events unavailable in CRM for historical date (not fabricated).",
        });
      } else {
        reconstructedDays++;
        reports.push({
          date,
          status: "reconstructed",
          recordsProcessed: syncResult.processedCount,
          notes: "Fully reconstructed daily snapshots and interval metrics from CRM.",
        });
      }

      // Set finalization status for backfilled date
      if (options?.markFinal) {
        await setDailyFinalizationStatus(
          date,
          "finalized",
          1,
          `backfill_${Date.now()}`
        );
      }
    } catch (dateErr: any) {
      failedDays++;
      reports.push({
        date,
        status: "failed",
        recordsProcessed: 0,
        notes: "Exception during backfill.",
        error: dateErr.message || String(dateErr),
      });
    }
  }

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    totalDays: dateList.length,
    reconstructedDays,
    partialDays,
    alreadyPersistedDays,
    failedDays,
    reports,
    durationMs: Date.now() - startMs,
  };
}
