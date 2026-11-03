import { query, execute, withTransaction } from "@/lib/db";

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

  const sql = `
    INSERT INTO campaign_daily_snapshots (
      crm_campaign_id, crm_campaign_code, campaign_name_snapshot, client_code_snapshot, campaign_type_snapshot,
      work_date, monthly_allocation_snapshot, daily_target_leads, campaign_point_factor, daily_target_points,
      generated_leads, qualified_leads, disqualified_leads, pending_qa_leads, remaining_target_leads,
      completion_percentage, target_achieved, source_updated_at, synced_at, snapshot_version, is_final,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), ?, ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      crm_campaign_code = VALUES(crm_campaign_code),
      campaign_name_snapshot = VALUES(campaign_name_snapshot),
      client_code_snapshot = VALUES(client_code_snapshot),
      campaign_type_snapshot = VALUES(campaign_type_snapshot),
      monthly_allocation_snapshot = VALUES(monthly_allocation_snapshot),
      daily_target_leads = VALUES(daily_target_leads),
      campaign_point_factor = VALUES(campaign_point_factor),
      daily_target_points = VALUES(daily_target_points),
      generated_leads = VALUES(generated_leads),
      qualified_leads = VALUES(qualified_leads),
      disqualified_leads = VALUES(disqualified_leads),
      pending_qa_leads = VALUES(pending_qa_leads),
      remaining_target_leads = VALUES(remaining_target_leads),
      completion_percentage = VALUES(completion_percentage),
      target_achieved = VALUES(target_achieved),
      source_updated_at = VALUES(source_updated_at),
      synced_at = NOW(6),
      is_final = VALUES(is_final),
      updated_at = NOW(6)
  `;

  await withTransaction(async (conn) => {
    for (const c of campaigns) {
      const crmCampaignId = Number(c.crm_campaign_id);
      const factor = c.campaign_point_factor ?? 1.0;
      const metrics = calculateCampaignSnapshotMetrics(
        c.daily_target_leads,
        c.qualified_leads,
        factor
      );

      const sourceUpdatedAt = c.source_updated_at
        ? new Date(c.source_updated_at).toISOString().slice(0, 19).replace("T", " ")
        : null;

      await conn.execute(sql, [
        crmCampaignId,
        c.crm_campaign_code || null,
        c.campaign_name,
        c.client_code || null,
        c.campaign_type || "General",
        workDateStr,
        c.monthly_allocation || 0,
        c.daily_target_leads,
        factor,
        metrics.targetPoints,
        c.generated_leads,
        c.qualified_leads,
        c.disqualified_leads || 0,
        c.pending_qa_leads || 0,
        metrics.remaining,
        metrics.completionPct,
        metrics.targetAchieved ? 1 : 0,
        sourceUpdatedAt,
        snapshotVersion,
        isFinal ? 1 : 0,
      ]);
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
  const version = filters?.snapshotVersion ?? 1;
  const whereClauses = ["work_date = ?", "snapshot_version = ?"];
  const params: any[] = [workDateStr, version];

  if (filters?.clientCode && filters.clientCode !== "all") {
    whereClauses.push("client_code_snapshot = ?");
    params.push(filters.clientCode);
  }
  if (filters?.targetAchieved !== undefined) {
    whereClauses.push("target_achieved = ?");
    params.push(filters.targetAchieved ? 1 : 0);
  }

  const sql = `
    SELECT * FROM campaign_daily_snapshots
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY target_achieved DESC, qualified_leads DESC, campaign_name_snapshot ASC
  `;

  const rows = await query<any>(sql, params);

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_campaign_id: Number(r.crm_campaign_id),
    crm_campaign_code: r.crm_campaign_code,
    campaign_name_snapshot: r.campaign_name_snapshot,
    client_code_snapshot: r.client_code_snapshot,
    campaign_type_snapshot: r.campaign_type_snapshot || "General",
    work_date: workDateStr,
    monthly_allocation_snapshot: r.monthly_allocation_snapshot || 0,
    daily_target_leads: r.daily_target_leads,
    campaign_point_factor: Number(r.campaign_point_factor),
    daily_target_points: Number(r.daily_target_points),
    generated_leads: r.generated_leads,
    qualified_leads: r.qualified_leads,
    disqualified_leads: r.disqualified_leads,
    pending_qa_leads: r.pending_qa_leads,
    remaining_target_leads: r.remaining_target_leads,
    completion_percentage: Number(r.completion_percentage),
    target_achieved: Boolean(r.target_achieved),
    source_updated_at: r.source_updated_at ? String(r.source_updated_at) : null,
    synced_at: String(r.synced_at),
    snapshot_version: r.snapshot_version,
    is_final: Boolean(r.is_final),
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
  const whereClauses = ["work_date >= ?", "work_date <= ?"];
  const params: any[] = [startDateStr, endDateStr];

  if (filters?.campaignId) {
    whereClauses.push("crm_campaign_id = ?");
    params.push(filters.campaignId);
  }
  if (filters?.clientCode && filters.clientCode !== "all") {
    whereClauses.push("client_code_snapshot = ?");
    params.push(filters.clientCode);
  }
  if (filters?.search) {
    whereClauses.push("(campaign_name_snapshot LIKE ? OR crm_campaign_code LIKE ? OR client_code_snapshot LIKE ?)");
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  const sql = `
    SELECT * FROM campaign_daily_snapshots
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY work_date DESC, qualified_leads DESC
  `;

  const rows = await query<any>(sql, params);

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_campaign_id: Number(r.crm_campaign_id),
    crm_campaign_code: r.crm_campaign_code,
    campaign_name_snapshot: r.campaign_name_snapshot,
    client_code_snapshot: r.client_code_snapshot,
    campaign_type_snapshot: r.campaign_type_snapshot || "General",
    work_date: typeof r.work_date === "string" ? r.work_date.slice(0, 10) : new Date(r.work_date).toISOString().slice(0, 10),
    monthly_allocation_snapshot: r.monthly_allocation_snapshot || 0,
    daily_target_leads: r.daily_target_leads,
    campaign_point_factor: Number(r.campaign_point_factor),
    daily_target_points: Number(r.daily_target_points),
    generated_leads: r.generated_leads,
    qualified_leads: r.qualified_leads,
    disqualified_leads: r.disqualified_leads,
    pending_qa_leads: r.pending_qa_leads,
    remaining_target_leads: r.remaining_target_leads,
    completion_percentage: Number(r.completion_percentage),
    target_achieved: Boolean(r.target_achieved),
    source_updated_at: r.source_updated_at ? String(r.source_updated_at) : null,
    synced_at: String(r.synced_at),
    snapshot_version: r.snapshot_version,
    is_final: Boolean(r.is_final),
  }));
}
