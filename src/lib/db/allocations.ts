import { query, queryOne, execute, withTransaction, serializeDbData } from "@/lib/db";

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
 * Retrieves all saved allocations for a specific business date from MySQL.
 */
export async function getAllocationsForDate(businessDate: string): Promise<CampaignDailyAllocationRecord[]> {
  try {
    const sql = `
      SELECT id, crm_campaign_id, campaign_name, client_code, target_work_date, proposed_target,
             monthly_allocation, plan_status, notes, created_by, created_at, updated_at
      FROM slide_campaign_target_plans
      WHERE target_work_date = ?
      ORDER BY campaign_name ASC
    `;
    const plans = await query<any>(sql, [businessDate]);

    return plans.map((p) => ({
      allocation_id: Number(p.id),
      campaign_id: Number(p.crm_campaign_id),
      campaign_name: p.campaign_name || "",
      client_code: p.client_code || "",
      business_date: businessDate,
      daily_target: p.proposed_target,
      monthly_allocation: p.monthly_allocation || 0,
      created_by: String(p.created_by),
      created_at: String(p.created_at),
      updated_by: String(p.created_by),
      updated_at: String(p.updated_at),
      allocation_status: p.plan_status,
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

  let savedCount = 0;

  await withTransaction(async (conn) => {
    for (const t of targets) {
      const crmCampaignId = Number(t.campaign_id);

      const [existingRows] = await conn.query(
        `SELECT id, proposed_target, campaign_name, client_code, monthly_allocation, notes
         FROM slide_campaign_target_plans
         WHERE crm_campaign_id = ? AND target_work_date = ?
         LIMIT 1`,
        [crmCampaignId, businessDate]
      );
      const existing = (existingRows as any[])[0];

      if (existing) {
        const previousTarget = existing.proposed_target;
        const newTarget = t.daily_target;
        const campaignName = t.campaign_name || existing.campaign_name || null;
        const clientCode = t.client_code || existing.client_code || null;
        const monthlyAlloc = t.monthly_allocation !== undefined ? t.monthly_allocation : existing.monthly_allocation;
        const notes = t.notes !== undefined ? t.notes : existing.notes;

        await conn.execute(
          `UPDATE slide_campaign_target_plans
           SET proposed_target = ?, campaign_name = ?, client_code = ?, monthly_allocation = ?, notes = ?, plan_status = 'applied', submitted_at = NOW(6), updated_at = NOW(6)
           WHERE id = ?`,
          [newTarget, campaignName, clientCode, monthlyAlloc, notes, existing.id]
        );

        await conn.execute(
          `INSERT INTO slide_campaign_target_audit
             (plan_id, crm_campaign_id, campaign_name, client_code, target_work_date, previous_target, new_target, action, performed_by, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'UPDATE', 1, ?, NOW(6))`,
          [existing.id, crmCampaignId, campaignName, clientCode, businessDate, previousTarget, newTarget, notes || null]
        );

        savedCount++;
      } else {
        const newTarget = t.daily_target;
        const campaignName = t.campaign_name || null;
        const clientCode = t.client_code || null;
        const monthlyAlloc = t.monthly_allocation ?? null;
        const notes = t.notes || null;

        const [insertRes] = await conn.execute(
          `INSERT INTO slide_campaign_target_plans
             (crm_campaign_id, campaign_name, client_code, target_work_date, proposed_target, monthly_allocation, plan_status, notes, created_by, submitted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'applied', ?, 1, NOW(6), NOW(6), NOW(6))`,
          [crmCampaignId, campaignName, clientCode, businessDate, newTarget, monthlyAlloc, notes]
        );

        const newPlanId = (insertRes as any).insertId;

        await conn.execute(
          `INSERT INTO slide_campaign_target_audit
             (plan_id, crm_campaign_id, campaign_name, client_code, target_work_date, previous_target, new_target, action, performed_by, notes, created_at)
           VALUES (?, ?, ?, ?, ?, NULL, ?, 'INSERT', 1, ?, NOW(6))`,
          [newPlanId, crmCampaignId, campaignName, clientCode, businessDate, newTarget, notes || null]
        );

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
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters?.business_date) {
      whereClauses.push("target_work_date = ?");
      params.push(filters.business_date);
    }
    if (filters?.campaign_id) {
      whereClauses.push("crm_campaign_id = ?");
      params.push(filters.campaign_id);
    }
    if (filters?.client_code) {
      whereClauses.push("client_code = ?");
      params.push(filters.client_code);
    }
    if (filters?.from) {
      whereClauses.push("target_work_date >= ?");
      params.push(filters.from);
    }
    if (filters?.to) {
      whereClauses.push("target_work_date <= ?");
      params.push(filters.to);
    }

    const limitVal = filters?.limit || 100;
    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const sql = `
      SELECT id, plan_id, crm_campaign_id, campaign_name, client_code, target_work_date, previous_target, new_target, performed_by, created_at, action, notes
      FROM slide_campaign_target_audit
      ${whereStr}
      ORDER BY created_at DESC
      LIMIT ?
    `;
    params.push(limitVal);

    const records = await query<any>(sql, params);

    return records.map((r) => ({
      audit_id: Number(r.id),
      allocation_id: r.plan_id ? Number(r.plan_id) : null,
      campaign_id: Number(r.crm_campaign_id),
      campaign_name: r.campaign_name,
      client_code: r.client_code,
      business_date: typeof r.target_work_date === "string" ? r.target_work_date.slice(0, 10) : new Date(r.target_work_date).toISOString().slice(0, 10),
      previous_target: r.previous_target,
      new_target: r.new_target,
      changed_by: String(r.performed_by),
      change_timestamp: String(r.created_at),
      operation_type: r.action as "INSERT" | "UPDATE",
      relevant_audit_details: null,
      notes: r.notes || "",
    }));
  } catch (err) {
    console.error("Error fetching allocation audit history from MySQL:", err);
    return [];
  }
}
