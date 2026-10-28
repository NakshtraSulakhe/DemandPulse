import { prisma, serializeDbData } from "@/lib/db";
import { Prisma } from "@prisma/client";

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
  const workDate = new Date(workDateStr);

  const existing = await prisma.analyticsDailyFinalization.findUnique({
    where: { workDate },
  });

  if (existing) {
    return {
      id: existing.id.toString(),
      work_date: workDateStr,
      finalization_status: existing.finalizationStatus as FinalizationStatus,
      finalized_at: existing.finalizedAt ? existing.finalizedAt.toISOString() : null,
      finalized_by: existing.finalizedBy ? Number(existing.finalizedBy) : null,
      source_watermark: existing.sourceWatermark,
      revision_number: existing.revisionNumber,
      last_reconciled_at: existing.lastReconciledAt ? existing.lastReconciledAt.toISOString() : null,
      created_at: existing.createdAt.toISOString(),
      updated_at: existing.updatedAt.toISOString(),
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
  const workDate = new Date(workDateStr);
  const isFinal = status === "finalized";
  const finalizedAt = isFinal ? new Date() : null;

  const record = await prisma.analyticsDailyFinalization.upsert({
    where: { workDate },
    update: {
      finalizationStatus: status,
      finalizedAt,
      finalizedBy: BigInt(finalizedBy),
      sourceWatermark: sourceWatermark || undefined,
      lastReconciledAt: new Date(),
    },
    create: {
      workDate,
      finalizationStatus: status,
      finalizedAt,
      finalizedBy: BigInt(finalizedBy),
      sourceWatermark: sourceWatermark || null,
      revisionNumber: 1,
      lastReconciledAt: new Date(),
    },
  });

  // If finalized, mark daily snapshots as final
  if (isFinal) {
    await prisma.$transaction([
      prisma.campaignDailySnapshot.updateMany({
        where: { workDate },
        data: { isFinal: true },
      }),
      prisma.agentDailySnapshot.updateMany({
        where: { workDate },
        data: { isFinal: true },
      }),
      prisma.incentiveDailySnapshot.updateMany({
        where: { workDate },
        data: { isFinal: true },
      }),
    ]);
  }

  return {
    id: record.id.toString(),
    work_date: workDateStr,
    finalization_status: record.finalizationStatus as FinalizationStatus,
    finalized_at: record.finalizedAt ? record.finalizedAt.toISOString() : null,
    finalized_by: record.finalizedBy ? Number(record.finalizedBy) : null,
    source_watermark: record.sourceWatermark,
    revision_number: record.revisionNumber,
    last_reconciled_at: record.lastReconciledAt ? record.lastReconciledAt.toISOString() : null,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  };
}
