import { prisma, serializeDbData } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface IncentiveDailySnapshotRecord {
  id: string;
  crm_payout_id: number | null;
  crm_agent_id: number;
  agent_name_snapshot: string | null;
  work_date: string;
  target_points: number;
  achieved_points: number;
  qualified_leads: number;
  base_incentive: number;
  slab_incentive: number;
  total_incentive: number;
  eligibility_status: string;
  approval_status: string;
  payment_status: string;
  policy_version_reference: number | null;
  crm_payment_reference: string | null;
  source_updated_at: string | null;
  synced_at: string;
  snapshot_version: number;
  is_final: boolean;
}

export interface UpsertIncentiveSnapshotInput {
  crm_payout_id?: number | null;
  crm_agent_id: number;
  agent_name?: string | null;
  target_points: number;
  achieved_points: number;
  qualified_leads: number;
  base_incentive: number;
  slab_incentive: number;
  total_incentive: number;
  eligibility_status?: string;
  approval_status?: string;
  payment_status?: string;
  policy_version_reference?: number | null;
  crm_payment_reference?: string | null;
  source_updated_at?: Date | string | null;
}

/**
 * Upserts incentive daily snapshots as reporting copies from the CRM payout ledger.
 * Respects authoritative CRM state: will never overwrite an already 'paid' status with 'unpaid'.
 */
export async function upsertIncentiveDailySnapshots(
  workDateStr: string,
  records: UpsertIncentiveSnapshotInput[],
  isFinal: boolean = false,
  snapshotVersion: number = 1
): Promise<{ success: boolean; count: number }> {
  if (!records || records.length === 0) {
    return { success: true, count: 0 };
  }

  const workDate = new Date(workDateStr);

  await prisma.$transaction(async (tx) => {
    for (const r of records) {
      const crmAgentId = BigInt(r.crm_agent_id);
      const crmPayoutId = r.crm_payout_id ? BigInt(r.crm_payout_id) : null;
      const sourceUpdatedAt = r.source_updated_at ? new Date(r.source_updated_at) : null;

      // Check existing record to avoid regressing paid amounts
      const existing = await tx.incentiveDailySnapshot.findUnique({
        where: {
          crmAgentId_workDate_snapshotVersion: {
            crmAgentId,
            workDate,
            snapshotVersion,
          },
        },
      });

      // If existing was already paid and final, preserve payment status and reference
      const isAlreadyPaid = existing?.paymentStatus === "paid";
      const finalPaymentStatus = isAlreadyPaid ? "paid" : (r.payment_status || "unpaid");
      const finalPaymentRef = isAlreadyPaid
        ? (existing?.crmPaymentReference || r.crm_payment_reference || null)
        : (r.crm_payment_reference || null);

      await tx.incentiveDailySnapshot.upsert({
        where: {
          crmAgentId_workDate_snapshotVersion: {
            crmAgentId,
            workDate,
            snapshotVersion,
          },
        },
        update: {
          crmPayoutId,
          agentNameSnapshot: r.agent_name || null,
          targetPoints: new Prisma.Decimal(r.target_points),
          achievedPoints: new Prisma.Decimal(r.achieved_points),
          qualifiedLeads: r.qualified_leads,
          baseIncentive: new Prisma.Decimal(r.base_incentive),
          slabIncentive: new Prisma.Decimal(r.slab_incentive),
          totalIncentive: new Prisma.Decimal(r.total_incentive),
          eligibilityStatus: r.eligibility_status || "ineligible",
          approvalStatus: r.approval_status || "pending_approval",
          paymentStatus: finalPaymentStatus,
          policyVersionReference: r.policy_version_reference ?? null,
          crmPaymentReference: finalPaymentRef,
          sourceUpdatedAt,
          syncedAt: new Date(),
          isFinal: isAlreadyPaid ? true : isFinal,
        },
        create: {
          crmPayoutId,
          crmAgentId,
          agentNameSnapshot: r.agent_name || null,
          workDate,
          targetPoints: new Prisma.Decimal(r.target_points),
          achievedPoints: new Prisma.Decimal(r.achieved_points),
          qualifiedLeads: r.qualified_leads,
          baseIncentive: new Prisma.Decimal(r.base_incentive),
          slabIncentive: new Prisma.Decimal(r.slab_incentive),
          totalIncentive: new Prisma.Decimal(r.total_incentive),
          eligibilityStatus: r.eligibility_status || "ineligible",
          approvalStatus: r.approval_status || "pending_approval",
          paymentStatus: finalPaymentStatus,
          policyVersionReference: r.policy_version_reference ?? null,
          crmPaymentReference: finalPaymentRef,
          sourceUpdatedAt,
          syncedAt: new Date(),
          snapshotVersion,
          isFinal: isAlreadyPaid ? true : isFinal,
        },
      });
    }
  });

  return { success: true, count: records.length };
}

/**
 * Retrieves incentive reporting snapshots for a specific business work date.
 */
export async function getIncentiveSnapshotsForDate(
  workDateStr: string,
  filters?: {
    paymentStatus?: string;
    approvalStatus?: string;
    agentId?: number;
    snapshotVersion?: number;
  }
): Promise<IncentiveDailySnapshotRecord[]> {
  const workDate = new Date(workDateStr);
  const where: Prisma.IncentiveDailySnapshotWhereInput = {
    workDate,
    snapshotVersion: filters?.snapshotVersion ?? 1,
  };

  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    where.paymentStatus = filters.paymentStatus;
  }
  if (filters?.approvalStatus && filters.approvalStatus !== "all") {
    where.approvalStatus = filters.approvalStatus;
  }
  if (filters?.agentId) {
    where.crmAgentId = BigInt(filters.agentId);
  }

  const rows = await prisma.incentiveDailySnapshot.findMany({
    where,
    orderBy: [{ totalIncentive: "desc" }, { achievedPoints: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_payout_id: r.crmPayoutId ? Number(r.crmPayoutId) : null,
    crm_agent_id: Number(r.crmAgentId),
    agent_name_snapshot: r.agentNameSnapshot,
    work_date: workDateStr,
    target_points: Number(r.targetPoints),
    achieved_points: Number(r.achievedPoints),
    qualified_leads: r.qualifiedLeads,
    base_incentive: Number(r.baseIncentive),
    slab_incentive: Number(r.slabIncentive),
    total_incentive: Number(r.totalIncentive),
    eligibility_status: r.eligibilityStatus,
    approval_status: r.approvalStatus,
    payment_status: r.paymentStatus,
    policy_version_reference: r.policyVersionReference,
    crm_payment_reference: r.crmPaymentReference,
    source_updated_at: r.sourceUpdatedAt ? r.sourceUpdatedAt.toISOString() : null,
    synced_at: r.syncedAt.toISOString(),
    snapshot_version: r.snapshotVersion,
    is_final: r.isFinal,
  }));
}

/**
 * Retrieves incentive snapshots across a date range.
 */
export async function getIncentiveSnapshotsDateRange(
  startDateStr: string,
  endDateStr: string,
  filters?: {
    paymentStatus?: string;
    agentId?: number;
  }
): Promise<IncentiveDailySnapshotRecord[]> {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const where: Prisma.IncentiveDailySnapshotWhereInput = {
    workDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    where.paymentStatus = filters.paymentStatus;
  }
  if (filters?.agentId) {
    where.crmAgentId = BigInt(filters.agentId);
  }

  const rows = await prisma.incentiveDailySnapshot.findMany({
    where,
    orderBy: [{ workDate: "desc" }, { totalIncentive: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_payout_id: r.crmPayoutId ? Number(r.crmPayoutId) : null,
    crm_agent_id: Number(r.crmAgentId),
    agent_name_snapshot: r.agentNameSnapshot,
    work_date: r.workDate.toISOString().slice(0, 10),
    target_points: Number(r.targetPoints),
    achieved_points: Number(r.achievedPoints),
    qualified_leads: r.qualifiedLeads,
    base_incentive: Number(r.baseIncentive),
    slab_incentive: Number(r.slabIncentive),
    total_incentive: Number(r.totalIncentive),
    eligibility_status: r.eligibilityStatus,
    approval_status: r.approvalStatus,
    payment_status: r.paymentStatus,
    policy_version_reference: r.policyVersionReference,
    crm_payment_reference: r.crmPaymentReference,
    source_updated_at: r.sourceUpdatedAt ? r.sourceUpdatedAt.toISOString() : null,
    synced_at: r.syncedAt.toISOString(),
    snapshot_version: r.snapshotVersion,
    is_final: r.isFinal,
  }));
}
