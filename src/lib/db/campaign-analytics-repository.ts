import { prisma, serializeDbData } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface CampaignDailySnapshotRecord {
  id: string;
  crm_campaign_id: number;
  crm_campaign_code: string | null;
  campaign_name_snapshot: string;
  client_code_snapshot: string | null;
  campaign_type_snapshot: string;
  work_date: string;
  monthly_allocation_snapshot: number;
  daily_target_leads: number;
  campaign_point_factor: number;
  daily_target_points: number;
  generated_leads: number;
  qualified_leads: number;
  disqualified_leads: number;
  pending_qa_leads: number;
  remaining_target_leads: number;
  completion_percentage: number;
  target_achieved: boolean;
  source_updated_at: string | null;
  synced_at: string;
  snapshot_version: number;
  is_final: boolean;
}

export interface UpsertCampaignSnapshotInput {
  crm_campaign_id: number;
  crm_campaign_code?: string | null;
  campaign_name: string;
  client_code?: string | null;
  campaign_type?: string | null;
  monthly_allocation?: number | null;
  daily_target_leads: number;
  campaign_point_factor?: number;
  generated_leads: number;
  qualified_leads: number;
  disqualified_leads?: number;
  pending_qa_leads?: number;
  source_updated_at?: Date | string | null;
}

/**
 * Calculates campaign target points: daily_target_leads * point_factor
 * Remaining target: max(0, daily_target - qualified_leads)
 * Completion percentage: qualified_leads / daily_target * 100 (0 if target == 0)
 */
export function calculateCampaignSnapshotMetrics(
  dailyTarget: number,
  qualifiedLeads: number,
  pointFactor: number = 1.0
) {
  const target = Math.max(0, dailyTarget);
  const factor = pointFactor > 0 ? pointFactor : 1.0;
  const targetPoints = Math.round(target * factor * 1000) / 1000;
  const remaining = Math.max(0, target - qualifiedLeads);
  const completionPct =
    target > 0
      ? Math.round((qualifiedLeads / target) * 100 * 1000) / 1000
      : 0;
  const targetAchieved = target > 0 && qualifiedLeads >= target;

  return {
    targetPoints,
    remaining,
    completionPct,
    targetAchieved,
  };
}

/**
 * Upserts a batch of campaign daily snapshots idempotently into MySQL.
 */
export async function upsertCampaignDailySnapshots(
  workDateStr: string,
  campaigns: UpsertCampaignSnapshotInput[],
  isFinal: boolean = false,
  snapshotVersion: number = 1
): Promise<{ success: boolean; count: number }> {
  if (!campaigns || campaigns.length === 0) {
    return { success: true, count: 0 };
  }

  const workDate = new Date(workDateStr);

  await prisma.$transaction(async (tx) => {
    for (const c of campaigns) {
      const crmCampaignId = BigInt(c.crm_campaign_id);
      const factor = c.campaign_point_factor ?? 1.0;
      const metrics = calculateCampaignSnapshotMetrics(
        c.daily_target_leads,
        c.qualified_leads,
        factor
      );

      const sourceUpdatedAt = c.source_updated_at
        ? new Date(c.source_updated_at)
        : null;

      await tx.campaignDailySnapshot.upsert({
        where: {
          crmCampaignId_workDate_snapshotVersion: {
            crmCampaignId,
            workDate,
            snapshotVersion,
          },
        },
        update: {
          crmCampaignCode: c.crm_campaign_code || null,
          campaignNameSnapshot: c.campaign_name,
          clientCodeSnapshot: c.client_code || null,
          campaignTypeSnapshot: c.campaign_type || "General",
          monthlyAllocationSnapshot: c.monthly_allocation || 0,
          dailyTargetLeads: c.daily_target_leads,
          campaignPointFactor: new Prisma.Decimal(factor),
          dailyTargetPoints: new Prisma.Decimal(metrics.targetPoints),
          generatedLeads: c.generated_leads,
          qualifiedLeads: c.qualified_leads,
          disqualifiedLeads: c.disqualified_leads || 0,
          pendingQaLeads: c.pending_qa_leads || 0,
          remainingTargetLeads: metrics.remaining,
          completionPercentage: new Prisma.Decimal(metrics.completionPct),
          targetAchieved: metrics.targetAchieved,
          sourceUpdatedAt,
          syncedAt: new Date(),
          isFinal,
        },
        create: {
          crmCampaignId,
          crmCampaignCode: c.crm_campaign_code || null,
          campaignNameSnapshot: c.campaign_name,
          clientCodeSnapshot: c.client_code || null,
          campaignTypeSnapshot: c.campaign_type || "General",
          workDate,
          monthlyAllocationSnapshot: c.monthly_allocation || 0,
          dailyTargetLeads: c.daily_target_leads,
          campaignPointFactor: new Prisma.Decimal(factor),
          dailyTargetPoints: new Prisma.Decimal(metrics.targetPoints),
          generatedLeads: c.generated_leads,
          qualifiedLeads: c.qualified_leads,
          disqualifiedLeads: c.disqualified_leads || 0,
          pendingQaLeads: c.pending_qa_leads || 0,
          remainingTargetLeads: metrics.remaining,
          completionPercentage: new Prisma.Decimal(metrics.completionPct),
          targetAchieved: metrics.targetAchieved,
          sourceUpdatedAt,
          syncedAt: new Date(),
          snapshotVersion,
          isFinal,
        },
      });
    }
  });

  return { success: true, count: campaigns.length };
}

/**
 * Retrieves campaign snapshots for a specific business work date.
 */
export async function getCampaignSnapshotsForDate(
  workDateStr: string,
  filters?: {
    clientCode?: string;
    targetAchieved?: boolean;
    snapshotVersion?: number;
  }
): Promise<CampaignDailySnapshotRecord[]> {
  const workDate = new Date(workDateStr);
  const where: Prisma.CampaignDailySnapshotWhereInput = {
    workDate,
    snapshotVersion: filters?.snapshotVersion ?? 1,
  };

  if (filters?.clientCode && filters.clientCode !== "all") {
    where.clientCodeSnapshot = filters.clientCode;
  }
  if (filters?.targetAchieved !== undefined) {
    where.targetAchieved = filters.targetAchieved;
  }

  const rows = await prisma.campaignDailySnapshot.findMany({
    where,
    orderBy: [
      { targetAchieved: "desc" },
      { qualifiedLeads: "desc" },
      { campaignNameSnapshot: "asc" },
    ],
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_campaign_id: Number(r.crmCampaignId),
    crm_campaign_code: r.crmCampaignCode,
    campaign_name_snapshot: r.campaignNameSnapshot,
    client_code_snapshot: r.clientCodeSnapshot,
    campaign_type_snapshot: r.campaignTypeSnapshot || "General",
    work_date: workDateStr,
    monthly_allocation_snapshot: r.monthlyAllocationSnapshot || 0,
    daily_target_leads: r.dailyTargetLeads,
    campaign_point_factor: Number(r.campaignPointFactor),
    daily_target_points: Number(r.dailyTargetPoints),
    generated_leads: r.generatedLeads,
    qualified_leads: r.qualifiedLeads,
    disqualified_leads: r.disqualifiedLeads,
    pending_qa_leads: r.pendingQaLeads,
    remaining_target_leads: r.remainingTargetLeads,
    completion_percentage: Number(r.completionPercentage),
    target_achieved: r.targetAchieved,
    source_updated_at: r.sourceUpdatedAt ? r.sourceUpdatedAt.toISOString() : null,
    synced_at: r.syncedAt.toISOString(),
    snapshot_version: r.snapshotVersion,
    is_final: r.isFinal,
  }));
}

/**
 * Retrieves campaign snapshots across a historical date range.
 */
export async function getCampaignSnapshotsDateRange(
  startDateStr: string,
  endDateStr: string,
  filters?: {
    campaignId?: number;
    clientCode?: string;
    search?: string;
  }
): Promise<CampaignDailySnapshotRecord[]> {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const where: Prisma.CampaignDailySnapshotWhereInput = {
    workDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.campaignId) {
    where.crmCampaignId = BigInt(filters.campaignId);
  }
  if (filters?.clientCode && filters.clientCode !== "all") {
    where.clientCodeSnapshot = filters.clientCode;
  }
  if (filters?.search) {
    where.OR = [
      { campaignNameSnapshot: { contains: filters.search } },
      { crmCampaignCode: { contains: filters.search } },
      { clientCodeSnapshot: { contains: filters.search } },
    ];
  }

  const rows = await prisma.campaignDailySnapshot.findMany({
    where,
    orderBy: [{ workDate: "desc" }, { qualifiedLeads: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_campaign_id: Number(r.crmCampaignId),
    crm_campaign_code: r.crmCampaignCode,
    campaign_name_snapshot: r.campaignNameSnapshot,
    client_code_snapshot: r.clientCodeSnapshot,
    campaign_type_snapshot: r.campaignTypeSnapshot || "General",
    work_date: r.workDate.toISOString().slice(0, 10),
    monthly_allocation_snapshot: r.monthlyAllocationSnapshot || 0,
    daily_target_leads: r.dailyTargetLeads,
    campaign_point_factor: Number(r.campaignPointFactor),
    daily_target_points: Number(r.dailyTargetPoints),
    generated_leads: r.generatedLeads,
    qualified_leads: r.qualifiedLeads,
    disqualified_leads: r.disqualifiedLeads,
    pending_qa_leads: r.pendingQaLeads,
    remaining_target_leads: r.remainingTargetLeads,
    completion_percentage: Number(r.completionPercentage),
    target_achieved: r.targetAchieved,
    source_updated_at: r.sourceUpdatedAt ? r.sourceUpdatedAt.toISOString() : null,
    synced_at: r.syncedAt.toISOString(),
    snapshot_version: r.snapshotVersion,
    is_final: r.isFinal,
  }));
}
