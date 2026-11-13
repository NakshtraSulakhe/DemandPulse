import { query, queryOne, execute, serializeDbData } from "@/lib/db";

export interface MonthlyIncentiveSlab {
  minPct: number;
  amount: number;
  label?: string;
}

export interface AgentMonthlyIncentivePlanRecord {
  id: string;
  plan_name: string;
  slabs: MonthlyIncentiveSlab[];
  currency: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AgentMonthlySettlementRecord {
  id: string;
  employee_id: number;
  employee_name: string;
  settlement_month: number;
  settlement_year: number;
  assigned_monthly_target: number;
  achieved_monthly_points: number;
  achievement_pct: number;
  qualifying_threshold_pct: number | null;
  incentive_earned: number;
  working_days_present: number;
  working_days_assigned: number;
  eligibility_status: string;
  eligibility_reason: string | null;
  approval_status: "provisional" | "pending_approval" | "approved" | "rejected";
  payment_status: "unpaid" | "processing" | "paid" | "failed";
  approved_by: string | null;
  approved_at: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_MONTHLY_SLABS: MonthlyIncentiveSlab[] = [
  { minPct: 90, amount: 3000, label: "90% Target Achieved (₹3,000)" },
  { minPct: 95, amount: 5000, label: "95% Target Achieved (₹5,000)" },
  { minPct: 100, amount: 15000, label: "100% Target Base (₹15,000)" },
  { minPct: 125, amount: 20000, label: "125% Accelerator (₹20,000)" },
  { minPct: 150, amount: 30000, label: "150% Accelerator (₹30,000)" },
  { minPct: 175, amount: 40000, label: "175% Accelerator (₹40,000)" },
  { minPct: 200, amount: 50000, label: "200% Accelerator (₹50,000)" },
  { minPct: 225, amount: 60000, label: "225% Accelerator (₹60,000)" },
  { minPct: 250, amount: 70000, label: "250% Accelerator (₹70,000)" },
  { minPct: 275, amount: 80000, label: "275% Accelerator (₹80,000)" },
  { minPct: 300, amount: 100000, label: "300% Super-Achiever (₹1,00,000)" },
];

let tablesEnsured = false;

export async function ensureMonthlyIncentiveTables(): Promise<boolean> {
  if (tablesEnsured) return true;
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS agent_monthly_incentive_plans (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        plan_name VARCHAR(150) NOT NULL,
        slabs_json JSON NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        version INT NOT NULL DEFAULT 1,
        created_by VARCHAR(150) NOT NULL DEFAULT 'Admin',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY idx_monthly_plan_active (is_active, effective_from)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS agent_monthly_settlements (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        employee_id BIGINT NOT NULL,
        employee_name VARCHAR(150) NOT NULL,
        settlement_month INT NOT NULL,
        settlement_year INT NOT NULL,
        assigned_monthly_target DECIMAL(12, 2) NOT NULL,
        achieved_monthly_points DECIMAL(12, 2) NOT NULL,
        achievement_pct DECIMAL(8, 3) NOT NULL,
        qualifying_threshold_pct DECIMAL(8, 3) NULL,
        incentive_earned DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        working_days_present INT NOT NULL DEFAULT 0,
        working_days_assigned INT NOT NULL DEFAULT 22,
        eligibility_status VARCHAR(30) NOT NULL DEFAULT 'eligible',
        eligibility_reason VARCHAR(255) NULL,
        approval_status ENUM('provisional', 'pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'provisional',
        payment_status ENUM('unpaid', 'processing', 'paid', 'failed') NOT NULL DEFAULT 'unpaid',
        approved_by VARCHAR(150) NULL,
        approved_at DATETIME(6) NULL,
        remarks TEXT NULL,
        plan_version_reference INT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uniq_monthly_settlement_emp (employee_id, settlement_month, settlement_year),
        KEY idx_monthly_settle_period (settlement_year, settlement_month, approval_status, payment_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check seed
    const existing = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM agent_monthly_incentive_plans`
    );

    if (!existing || Number(existing.count) === 0) {
      await execute(
        `INSERT INTO agent_monthly_incentive_plans 
          (plan_name, slabs_json, currency, is_active, effective_from, version, created_by)
         VALUES (?, ?, 'INR', 1, '2026-01-01', 1, 'System Seed')`,
        [
          "Standard Monthly Agent Productivity Incentive Plan",
          JSON.stringify(DEFAULT_MONTHLY_SLABS),
        ]
      );
    }

    tablesEnsured = true;
    return true;
  } catch (err) {
    console.warn("Could not ensure agent monthly incentive tables in MySQL:", err);
    return false;
  }
}

/**
 * Retrieves the currently active monthly incentive plan.
 */
export async function getActiveMonthlyIncentivePlan(): Promise<AgentMonthlyIncentivePlanRecord> {
  await ensureMonthlyIncentiveTables();
  try {
    const row = await queryOne<any>(
      `SELECT * FROM agent_monthly_incentive_plans WHERE is_active = 1 ORDER BY version DESC, id DESC LIMIT 1`
    );

    if (row) {
      let slabs: MonthlyIncentiveSlab[] = [];
      try {
        slabs = typeof row.slabs_json === "string" ? JSON.parse(row.slabs_json) : row.slabs_json;
      } catch {
        slabs = DEFAULT_MONTHLY_SLABS;
      }

      return {
        id: String(row.id),
        plan_name: row.plan_name,
        slabs: Array.isArray(slabs) && slabs.length > 0 ? slabs : DEFAULT_MONTHLY_SLABS,
        currency: row.currency || "INR",
        is_active: Boolean(row.is_active),
        effective_from: String(row.effective_from).split("T")[0],
        effective_to: row.effective_to ? String(row.effective_to).split("T")[0] : null,
        version: Number(row.version),
        created_by: row.created_by,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
      };
    }
  } catch (err) {
    console.error("Error querying active monthly incentive plan from MySQL:", err);
  }

  return {
    id: "default-monthly-1",
    plan_name: "Standard Monthly Agent Productivity Incentive Plan",
    slabs: DEFAULT_MONTHLY_SLABS,
    currency: "INR",
    is_active: true,
    effective_from: "2026-01-01",
    effective_to: null,
    version: 1,
    created_by: "System Default",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Evaluates monthly incentive earned for a given monthly achievement percentage.
 * Uses highest qualifying minimum-achievement threshold.
 */
export function calculateMonthlyIncentive(
  achievementPct: number,
  slabs: MonthlyIncentiveSlab[]
): {
  incentiveAmount: number;
  qualifyingThresholdPct: number | null;
  qualifyingSlab: MonthlyIncentiveSlab | null;
} {
  const sorted = [...slabs].sort((a, b) => b.minPct - a.minPct); // Descending

  for (const slab of sorted) {
    if (achievementPct >= slab.minPct) {
      return {
        incentiveAmount: slab.amount,
        qualifyingThresholdPct: slab.minPct,
        qualifyingSlab: slab,
      };
    }
  }

  return {
    incentiveAmount: 0,
    qualifyingThresholdPct: null,
    qualifyingSlab: null,
  };
}

/**
 * Saves or updates monthly settlement record.
 */
export async function saveMonthlySettlement(payload: {
  employee_id: number;
  employee_name: string;
  settlement_month: number;
  settlement_year: number;
  assigned_monthly_target: number;
  achieved_monthly_points: number;
  achievement_pct: number;
  qualifying_threshold_pct?: number | null;
  incentive_earned: number;
  working_days_present?: number;
  working_days_assigned?: number;
  eligibility_status?: string;
  eligibility_reason?: string | null;
  approval_status?: "provisional" | "pending_approval" | "approved" | "rejected";
  payment_status?: "unpaid" | "processing" | "paid" | "failed";
  approved_by?: string | null;
  remarks?: string | null;
}): Promise<AgentMonthlySettlementRecord> {
  await ensureMonthlyIncentiveTables();

  const sql = `
    INSERT INTO agent_monthly_settlements (
      employee_id, employee_name, settlement_month, settlement_year,
      assigned_monthly_target, achieved_monthly_points, achievement_pct,
      qualifying_threshold_pct, incentive_earned, working_days_present,
      working_days_assigned, eligibility_status, eligibility_reason,
      approval_status, payment_status, approved_by, approved_at, remarks,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      employee_name = VALUES(employee_name),
      assigned_monthly_target = VALUES(assigned_monthly_target),
      achieved_monthly_points = VALUES(achieved_monthly_points),
      achievement_pct = VALUES(achievement_pct),
      qualifying_threshold_pct = VALUES(qualifying_threshold_pct),
      incentive_earned = VALUES(incentive_earned),
      working_days_present = VALUES(working_days_present),
      working_days_assigned = VALUES(working_days_assigned),
      eligibility_status = VALUES(eligibility_status),
      eligibility_reason = VALUES(eligibility_reason),
      approval_status = VALUES(approval_status),
      payment_status = VALUES(payment_status),
      remarks = VALUES(remarks),
      updated_at = NOW(6)
  `;

  await execute(sql, [
    payload.employee_id,
    payload.employee_name,
    payload.settlement_month,
    payload.settlement_year,
    payload.assigned_monthly_target,
    payload.achieved_monthly_points,
    payload.achievement_pct,
    payload.qualifying_threshold_pct || null,
    payload.incentive_earned,
    payload.working_days_present || 0,
    payload.working_days_assigned || 22,
    payload.eligibility_status || "eligible",
    payload.eligibility_reason || null,
    payload.approval_status || "provisional",
    payload.payment_status || "unpaid",
    payload.approved_by || null,
    payload.approved_by ? new Date() : null,
    payload.remarks || null,
  ]);

  const record = await queryOne<any>(
    `SELECT * FROM agent_monthly_settlements 
     WHERE employee_id = ? AND settlement_month = ? AND settlement_year = ? LIMIT 1`,
    [payload.employee_id, payload.settlement_month, payload.settlement_year]
  );

  return {
    id: String(record?.id ?? 1),
    employee_id: payload.employee_id,
    employee_name: payload.employee_name,
    settlement_month: payload.settlement_month,
    settlement_year: payload.settlement_year,
    assigned_monthly_target: payload.assigned_monthly_target,
    achieved_monthly_points: payload.achieved_monthly_points,
    achievement_pct: payload.achievement_pct,
    qualifying_threshold_pct: payload.qualifying_threshold_pct ?? null,
    incentive_earned: payload.incentive_earned,
    working_days_present: payload.working_days_present || 0,
    working_days_assigned: payload.working_days_assigned || 22,
    eligibility_status: payload.eligibility_status || "eligible",
    eligibility_reason: payload.eligibility_reason || null,
    approval_status: payload.approval_status || "provisional",
    payment_status: payload.payment_status || "unpaid",
    approved_by: payload.approved_by || null,
    approved_at: payload.approved_by ? new Date().toISOString() : null,
    remarks: payload.remarks || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Lists monthly settlements for a month/year.
 */
export async function getMonthlySettlements(
  month: number,
  year: number
): Promise<AgentMonthlySettlementRecord[]> {
  await ensureMonthlyIncentiveTables();
  try {
    const rows = await query<any>(
      `SELECT * FROM agent_monthly_settlements WHERE settlement_month = ? AND settlement_year = ? ORDER BY achievement_pct DESC, incentive_earned DESC`,
      [month, year]
    );

    return (rows || []).map((r) => ({
      id: String(r.id),
      employee_id: Number(r.employee_id),
      employee_name: r.employee_name,
      settlement_month: Number(r.settlement_month),
      settlement_year: Number(r.settlement_year),
      assigned_monthly_target: Number(r.assigned_monthly_target),
      achieved_monthly_points: Number(r.achieved_monthly_points),
      achievement_pct: Number(r.achievement_pct),
      qualifying_threshold_pct: r.qualifying_threshold_pct !== null ? Number(r.qualifying_threshold_pct) : null,
      incentive_earned: Number(r.incentive_earned),
      working_days_present: Number(r.working_days_present),
      working_days_assigned: Number(r.working_days_assigned),
      eligibility_status: r.eligibility_status,
      eligibility_reason: r.eligibility_reason,
      approval_status: r.approval_status,
      payment_status: r.payment_status,
      approved_by: r.approved_by,
      approved_at: r.approved_at ? String(r.approved_at) : null,
      remarks: r.remarks,
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    }));
  } catch (err) {
    console.error("Error querying monthly settlements from MySQL:", err);
    return [];
  }
}

