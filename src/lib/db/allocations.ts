import { prisma, serializeDbData } from "@/lib/db";

export interface CampaignDailyAllocationRecord {
  allocation_id: number;
  campaign_id: number;
  campaign_name: string;
  client_code: string;
  business_date: string; // YYYY-MM-DD (US Eastern)
  daily_target: number;
  monthly_allocation: number;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  allocation_status: string;
  notes: string;
}

export interface CampaignAllocationAuditRecord {
  audit_id: number;
  allocation_id: number | null;
  campaign_id: number;
  campaign_name: string | null;
  client_code: string | null;
  business_date: string;
  previous_target: number | null;
  new_target: number;
  changed_by: string;
  change_timestamp: string;
  operation_type: "INSERT" | "UPDATE" | "BULK_UPDATE";
  relevant_audit_details: string | null;
  notes: string;
}

export interface SaveAllocationInput {
  campaign_id: number;
  daily_target: number;
  campaign_name?: string | null;
  client_code?: string | null;
  monthly_allocation?: number | null;
  notes?: string | null;
}

/**
 * Retrieves all saved allocations for a specific business date from MySQL (demandflow_slides).
 */
export async function getAllocationsForDate(businessDate: string): Promise<CampaignDailyAllocationRecord[]> {
  try {
    const targetDate = new Date(businessDate);
    const plans = await prisma.slideCampaignTargetPlan.findMany({
      where: { targetWorkDate: targetDate },
      orderBy: { campaignName: "asc" },
    });

    return plans.map((p) => ({
      allocation_id: Number(p.id),
      campaign_id: Number(p.crmCampaignId),
      campaign_name: p.campaignName || "",
      client_code: p.clientCode || "",
      business_date: businessDate,
      daily_target: p.proposedTarget,
      monthly_allocation: p.monthlyAllocation || 0,
      created_by: p.createdBy.toString(),
      created_at: p.createdAt.toISOString(),
      updated_by: p.createdBy.toString(),
      updated_at: p.updatedAt.toISOString(),
      allocation_status: p.planStatus,
      notes: p.notes || "",
    }));
  } catch (err) {
    console.error("Error reading campaign target allocations from MySQL:", err);
    return [];
  }
}

/**
 * Retrieves a map of saved daily targets keyed by campaign_id for a given business date.
 */
export async function getAllocationsMapForDate(businessDate: string): Promise<Map<number, CampaignDailyAllocationRecord>> {
  const list = await getAllocationsForDate(businessDate);
  const map = new Map<number, CampaignDailyAllocationRecord>();
  for (const item of list) {
    map.set(item.campaign_id, item);
  }
  return map;
}

/**
 * Retrieves only positive allocations (daily_target > 0) for a given business date.
 */
export async function getPositiveAllocationsForDate(businessDate: string): Promise<CampaignDailyAllocationRecord[]> {
  const all = await getAllocationsForDate(businessDate);
  return all.filter((a) => a.daily_target > 0);
}

/**
 * Saves a batch of campaign daily target allocations within a single MySQL transaction.
 * Creates audit records in slide_campaign_target_audit.
 */
export async function saveAllocationsBatch(
  businessDate: string,
  targets: SaveAllocationInput[],
  changedBy: string = "Admin User"
): Promise<{
  ok: boolean;
  saved_count: number;
  allocations: CampaignDailyAllocationRecord[];
  message: string;
}> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    throw new Error(`Invalid business date format: "${businessDate}". Must be YYYY-MM-DD.`);
  }

  for (const t of targets) {
    if (!Number.isInteger(t.campaign_id) || t.campaign_id <= 0) {
      throw new Error(`Invalid campaign_id: ${t.campaign_id}`);
    }
    if (!Number.isInteger(t.daily_target) || t.daily_target < 0) {
      throw new Error(
        `Invalid daily_target for campaign #${t.campaign_id}: ${t.daily_target}. Target must be an integer >= 0.`
      );
    }
  }

  const targetDate = new Date(businessDate);
  let savedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const t of targets) {
      const crmCampaignId = BigInt(t.campaign_id);

      const existing = await tx.slideCampaignTargetPlan.findFirst({
        where: {
          crmCampaignId,
          targetWorkDate: targetDate,
        },
      });

      if (existing) {
        const previousTarget = existing.proposedTarget;
        const newTarget = t.daily_target;
        const campaignName = t.campaign_name || existing.campaignName || null;
        const clientCode = t.client_code || existing.clientCode || null;
        const monthlyAlloc = t.monthly_allocation !== undefined ? t.monthly_allocation : existing.monthlyAllocation;
        const notes = t.notes !== undefined ? t.notes : existing.notes;

        const updated = await tx.slideCampaignTargetPlan.update({
          where: { id: existing.id },
          data: {
            proposedTarget: newTarget,
            campaignName,
            clientCode,
            monthlyAllocation: monthlyAlloc,
            notes,
            planStatus: "applied",
            submittedAt: new Date(),
          },
        });

        await tx.slideCampaignTargetAudit.create({
          data: {
            planId: updated.id,
            crmCampaignId,
            campaignName,
            clientCode,
            targetWorkDate: targetDate,
            previousTarget,
            newTarget,
            action: "UPDATE",
            performedBy: BigInt(1),
            notes: notes || undefined,
          },
        });

        savedCount++;
      } else {
        const newTarget = t.daily_target;
        const campaignName = t.campaign_name || null;
        const clientCode = t.client_code || null;
        const monthlyAlloc = t.monthly_allocation ?? null;
        const notes = t.notes || null;

        const created = await tx.slideCampaignTargetPlan.create({
          data: {
            crmCampaignId,
            campaignName,
            clientCode,
            targetWorkDate: targetDate,
            proposedTarget: newTarget,
            monthlyAllocation: monthlyAlloc,
            planStatus: "applied",
            notes,
            createdBy: BigInt(1),
            submittedAt: new Date(),
          },
        });

        await tx.slideCampaignTargetAudit.create({
          data: {
            planId: created.id,
            crmCampaignId,
            campaignName,
            clientCode,
            targetWorkDate: targetDate,
            previousTarget: null,
            newTarget,
            action: "INSERT",
            performedBy: BigInt(1),
            notes: notes || undefined,
          },
        });

        savedCount++;
      }
    }
  });

  const updatedAllocations = await getAllocationsForDate(businessDate);

  return {
    ok: true,
    saved_count: savedCount,
    allocations: updatedAllocations,
    message: `Daily campaign allocations saved successfully to MySQL. (${savedCount} target(s) persisted for ${businessDate})`,
  };
}

/**
 * Retrieves audit history records for allocations from MySQL.
 */
export async function getAllocationAuditHistory(filters?: {
  business_date?: string;
  campaign_id?: number;
  client_code?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<CampaignAllocationAuditRecord[]> {
  try {
    const where: any = {};

    if (filters?.business_date) {
      where.targetWorkDate = new Date(filters.business_date);
    }
    if (filters?.campaign_id) {
      where.crmCampaignId = BigInt(filters.campaign_id);
    }
    if (filters?.client_code) {
      where.clientCode = filters.client_code;
    }
    if (filters?.from || filters?.to) {
      where.targetWorkDate = {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined,
      };
    }

    const records = await prisma.slideCampaignTargetAudit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100,
    });

    return records.map((r) => ({
      audit_id: Number(r.id),
      allocation_id: r.planId ? Number(r.planId) : null,
      campaign_id: Number(r.crmCampaignId),
      campaign_name: r.campaignName,
      client_code: r.clientCode,
      business_date: r.targetWorkDate.toISOString().slice(0, 10),
      previous_target: r.previousTarget,
      new_target: r.newTarget,
      changed_by: r.performedBy.toString(),
      change_timestamp: r.createdAt.toISOString(),
      operation_type: r.action as "INSERT" | "UPDATE",
      relevant_audit_details: null,
      notes: r.notes || "",
    }));
  } catch (err) {
    console.error("Error fetching allocation audit history from MySQL:", err);
    return [];
  }
}
