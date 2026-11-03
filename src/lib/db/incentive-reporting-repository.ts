import { query, queryOne, execute, withTransaction } from "@/lib/db";

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

  const sql = `
    INSERT INTO incentive_daily_snapshots (
      crm_payout_id, crm_agent_id, agent_name_snapshot, work_date, target_points, achieved_points,
      qualified_leads, base_incentive, slab_incentive, total_incentive, eligibility_status,
      approval_status, payment_status, policy_version_reference, crm_payment_reference,
      source_updated_at, synced_at, snapshot_version, is_final, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), ?, ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      crm_payout_id = VALUES(crm_payout_id),
      agent_name_snapshot = VALUES(agent_name_snapshot),
      target_points = VALUES(target_points),
      achieved_points = VALUES(achieved_points),
      qualified_leads = VALUES(qualified_leads),
      base_incentive = VALUES(base_incentive),
      slab_incentive = VALUES(slab_incentive),
      total_incentive = VALUES(total_incentive),
      eligibility_status = VALUES(eligibility_status),
      approval_status = VALUES(approval_status),
      payment_status = VALUES(payment_status),
      policy_version_reference = VALUES(policy_version_reference),
      crm_payment_reference = VALUES(crm_payment_reference),
      source_updated_at = VALUES(source_updated_at),
      synced_at = NOW(6),
      is_final = VALUES(is_final),
      updated_at = NOW(6)
  `;

  await withTransaction(async (conn) => {
    for (const r of records) {
      const crmAgentId = Number(r.crm_agent_id);
      const crmPayoutId = r.crm_payout_id ? Number(r.crm_payout_id) : null;
      const sourceUpdatedAt = r.source_updated_at
        ? new Date(r.source_updated_at).toISOString().slice(0, 19).replace("T", " ")
        : null;

      const [existingRows] = await conn.query(
        `SELECT payment_status, crm_payment_reference FROM incentive_daily_snapshots
         WHERE crm_agent_id = ? AND work_date = ? AND snapshot_version = ? LIMIT 1`,
        [crmAgentId, workDateStr, snapshotVersion]
      );
      const existing = (existingRows as any[])[0];

      const isAlreadyPaid = existing?.payment_status === "paid";
      const finalPaymentStatus = isAlreadyPaid ? "paid" : (r.payment_status || "unpaid");
      const finalPaymentRef = isAlreadyPaid
        ? (existing?.crm_payment_reference || r.crm_payment_reference || null)
        : (r.crm_payment_reference || null);

      await conn.execute(sql, [
        crmPayoutId,
        crmAgentId,
        r.agent_name || null,
        workDateStr,
        r.target_points,
        r.achieved_points,
        r.qualified_leads,
        r.base_incentive,
        r.slab_incentive,
        r.total_incentive,
        r.eligibility_status || "ineligible",
        r.approval_status || "pending_approval",
        finalPaymentStatus,
        r.policy_version_reference ?? null,
        finalPaymentRef,
        sourceUpdatedAt,
        snapshotVersion,
        isAlreadyPaid ? 1 : (isFinal ? 1 : 0),
      ]);
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
  const version = filters?.snapshotVersion ?? 1;
  const whereClauses = ["work_date = ?", "snapshot_version = ?"];
  const params: any[] = [workDateStr, version];

  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    whereClauses.push("payment_status = ?");
    params.push(filters.paymentStatus);
  }
  if (filters?.approvalStatus && filters.approvalStatus !== "all") {
    whereClauses.push("approval_status = ?");
    params.push(filters.approvalStatus);
  }
  if (filters?.agentId) {
    whereClauses.push("crm_agent_id = ?");
    params.push(filters.agentId);
  }

  const sql = `
    SELECT * FROM incentive_daily_snapshots
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY total_incentive DESC, achieved_points DESC
  `;

  const rows = await query<any>(sql, params);

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_payout_id: r.crm_payout_id ? Number(r.crm_payout_id) : null,
    crm_agent_id: Number(r.crm_agent_id),
    agent_name_snapshot: r.agent_name_snapshot,
    work_date: workDateStr,
    target_points: Number(r.target_points),
    achieved_points: Number(r.achieved_points),
    qualified_leads: r.qualified_leads,
    base_incentive: Number(r.base_incentive),
    slab_incentive: Number(r.slab_incentive),
    total_incentive: Number(r.total_incentive),
    eligibility_status: r.eligibility_status,
    approval_status: r.approval_status,
    payment_status: r.payment_status,
    policy_version_reference: r.policy_version_reference,
    crm_payment_reference: r.crm_payment_reference,
    source_updated_at: r.source_updated_at ? String(r.source_updated_at) : null,
    synced_at: String(r.synced_at),
    snapshot_version: r.snapshot_version,
    is_final: Boolean(r.is_final),
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
  const whereClauses = ["work_date >= ?", "work_date <= ?"];
  const params: any[] = [startDateStr, endDateStr];

  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    whereClauses.push("payment_status = ?");
    params.push(filters.paymentStatus);
  }
  if (filters?.agentId) {
    whereClauses.push("crm_agent_id = ?");
    params.push(filters.agentId);
  }

  const sql = `
    SELECT * FROM incentive_daily_snapshots
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY work_date DESC, total_incentive DESC
  `;

  const rows = await query<any>(sql, params);

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_payout_id: r.crm_payout_id ? Number(r.crm_payout_id) : null,
    crm_agent_id: Number(r.crm_agent_id),
    agent_name_snapshot: r.agent_name_snapshot,
    work_date: typeof r.work_date === "string" ? r.work_date.slice(0, 10) : new Date(r.work_date).toISOString().slice(0, 10),
    target_points: Number(r.target_points),
    achieved_points: Number(r.achieved_points),
    qualified_leads: r.qualified_leads,
    base_incentive: Number(r.base_incentive),
    slab_incentive: Number(r.slab_incentive),
    total_incentive: Number(r.total_incentive),
    eligibility_status: r.eligibility_status,
    approval_status: r.approval_status,
    payment_status: r.payment_status,
    policy_version_reference: r.policy_version_reference,
    crm_payment_reference: r.crm_payment_reference,
    source_updated_at: r.source_updated_at ? String(r.source_updated_at) : null,
    synced_at: String(r.synced_at),
    snapshot_version: r.snapshot_version,
    is_final: Boolean(r.is_final),
  }));
}
