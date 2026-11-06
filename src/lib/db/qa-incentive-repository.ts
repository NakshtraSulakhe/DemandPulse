import fs from "fs";
import path from "path";
import { query, execute, serializeDbData } from "@/lib/db";
import { QaIncentivePlan, QaIncentiveTier } from "@/types/qa-incentives";
import { enrichPlanTiers } from "@/lib/qa-incentives/calculator";

const BACKUP_FILE_PATH = path.join(process.cwd(), "data", "qa-incentive-plans.json");

/**
 * Default starter plans including the user's exact configuration
 */
export const DEFAULT_QA_PLANS: QaIncentivePlan[] = [
  {
    id: "plan-default-standard",
    plan_name: "Standard QA Lead Audit Daily Incentive (50 Base + Tier 1 & 2 Accelerators)",
    qa_agent_id: null,
    qa_agent_name: "All QA Members",
    client_code: "ALL",
    campaign_id: null,
    campaign_name: "All Campaigns",
    frequency: "DAILY",
    base_target_leads: 50,
    base_incentive_amount: 500,
    tiers: [
      {
        id: "t1",
        tier_order: 1,
        tier_name: "Tier 1 (+10 Leads Beyond Base)",
        extra_leads: 10,
        rate_per_lead: 15,
        cumulative_leads: 60,
        tier_reward: 150,
        total_cumulative_reward: 650,
      },
      {
        id: "t2",
        tier_order: 2,
        tier_name: "Tier 2 (+10 Leads Beyond Tier 1)",
        extra_leads: 10,
        rate_per_lead: 20,
        cumulative_leads: 70,
        tier_reward: 200,
        total_cumulative_reward: 850,
      },
    ],
    is_active: true,
    notes: "Default daily QA tier rule: 50 leads audited = ₹500, +10 leads @ ₹15 = ₹650, +10 leads @ ₹20 = ₹850.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "plan-monthly-enterprise",
    plan_name: "Monthly QA Master Target Plan (1000 Base Audits + Accelerators)",
    qa_agent_id: null,
    qa_agent_name: "All QA Members",
    client_code: "ALL",
    campaign_id: null,
    campaign_name: "All Campaigns",
    frequency: "MONTHLY",
    base_target_leads: 1000,
    base_incentive_amount: 10000,
    tiers: [
      {
        id: "mt1",
        tier_order: 1,
        tier_name: "Tier 1 (+200 Audits Above 1000)",
        extra_leads: 200,
        rate_per_lead: 20,
        cumulative_leads: 1200,
        tier_reward: 4000,
        total_cumulative_reward: 14000,
      },
      {
        id: "mt2",
        tier_order: 2,
        tier_name: "Tier 2 (+200 Audits Above 1200)",
        extra_leads: 200,
        rate_per_lead: 25,
        cumulative_leads: 1400,
        tier_reward: 5000,
        total_cumulative_reward: 19000,
      },
    ],
    is_active: true,
    notes: "Monthly cumulative auditing target for QA specialists with volume incentives.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * Local filesystem helper for fallback / caching
 */
function readLocalPlans(): QaIncentivePlan[] {
  try {
    if (fs.existsSync(BACKUP_FILE_PATH)) {
      const content = fs.readFileSync(BACKUP_FILE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed reading local QA incentive plans JSON:", err);
  }
  return DEFAULT_QA_PLANS;
}

function writeLocalPlans(plans: QaIncentivePlan[]): void {
  try {
    const dir = path.dirname(BACKUP_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BACKUP_FILE_PATH, JSON.stringify(plans, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed writing local QA incentive plans JSON:", err);
  }
}

let tableEnsured = false;
async function ensureQaTable(): Promise<boolean> {
  if (tableEnsured) return true;
  try {
    const createSql = `
      CREATE TABLE IF NOT EXISTS qa_incentive_plans (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        plan_name VARCHAR(150) NOT NULL,
        qa_agent_id BIGINT NULL,
        qa_agent_name VARCHAR(150) NOT NULL DEFAULT 'All QA Members',
        client_code VARCHAR(80) NOT NULL DEFAULT 'ALL',
        campaign_id BIGINT NULL,
        campaign_name VARCHAR(150) NOT NULL DEFAULT 'All Campaigns',
        frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY',
        base_target_leads INT NOT NULL DEFAULT 50,
        base_incentive_amount DECIMAL(12, 2) NOT NULL DEFAULT 500.00,
        tiers_json JSON NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        notes TEXT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await execute(createSql);
    tableEnsured = true;
    return true;
  } catch (err) {
    console.warn("Could not ensure qa_incentive_plans table in MySQL:", err);
    return false;
  }
}

/**
 * List all QA incentive plans
 */
export async function getQaIncentivePlans(filter?: {
  frequency?: string;
  client_code?: string;
  is_active?: boolean;
}): Promise<QaIncentivePlan[]> {
  const dbOk = await ensureQaTable();
  if (dbOk) {
    try {
      const rows = await query<any>(
        `SELECT * FROM qa_incentive_plans ORDER BY is_active DESC, updated_at DESC, id DESC`
      );

      if (rows && rows.length > 0) {
        const mapped: QaIncentivePlan[] = rows.map((r) => {
          let tiers: QaIncentiveTier[] = [];
          try {
            tiers = typeof r.tiers_json === "string" ? JSON.parse(r.tiers_json) : r.tiers_json;
          } catch {
            tiers = [];
          }

          const baseLeads = Number(r.base_target_leads) || 50;
          const baseAmount = Number(r.base_incentive_amount) || 500;

          return {
            id: String(r.id),
            plan_name: r.plan_name,
            qa_agent_id: r.qa_agent_id ? Number(r.qa_agent_id) : null,
            qa_agent_name: r.qa_agent_name || "All QA Members",
            client_code: r.client_code || "ALL",
            campaign_id: r.campaign_id ? Number(r.campaign_id) : null,
            campaign_name: r.campaign_name || "All Campaigns",
            frequency: (r.frequency || "DAILY") as "DAILY" | "MONTHLY",
            base_target_leads: baseLeads,
            base_incentive_amount: baseAmount,
            tiers: enrichPlanTiers(baseLeads, baseAmount, tiers),
            is_active: Boolean(r.is_active),
            notes: r.notes || "",
            created_at: String(r.created_at),
            updated_at: String(r.updated_at),
          };
        });

        // Sync backup file
        writeLocalPlans(mapped);
        return serializeDbData(mapped);
      }
    } catch (err) {
      console.warn("MySQL query failed for QA plans, falling back to local file:", err);
    }
  }

  // Fallback to local file or default templates
  const local = readLocalPlans();
  return local;
}

/**
 * Save a new QA incentive plan
 */
export async function createQaIncentivePlan(
  input: Omit<QaIncentivePlan, "id" | "created_at" | "updated_at">
): Promise<QaIncentivePlan> {
  const enrichedTiers = enrichPlanTiers(input.base_target_leads, input.base_incentive_amount, input.tiers);
  const jsonTiers = JSON.stringify(enrichedTiers);

  const dbOk = await ensureQaTable();
  if (dbOk) {
    try {
      const insertSql = `
        INSERT INTO qa_incentive_plans (
          plan_name, qa_agent_id, qa_agent_name, client_code, campaign_id, campaign_name,
          frequency, base_target_leads, base_incentive_amount, tiers_json, is_active, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))
      `;

      const res = await execute(insertSql, [
        input.plan_name,
        input.qa_agent_id ? Number(input.qa_agent_id) : null,
        input.qa_agent_name || "All QA Members",
        input.client_code || "ALL",
        input.campaign_id ? Number(input.campaign_id) : null,
        input.campaign_name || "All Campaigns",
        input.frequency || "DAILY",
        Number(input.base_target_leads) || 50,
        Number(input.base_incentive_amount) || 500,
        jsonTiers,
        input.is_active !== false ? 1 : 0,
        input.notes || null,
      ]);

      const newId = String(res.insertId || Date.now());
      const newPlan: QaIncentivePlan = {
        id: newId,
        ...input,
        tiers: enrichedTiers,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const current = readLocalPlans();
      writeLocalPlans([newPlan, ...current]);
      return newPlan;
    } catch (err) {
      console.warn("Failed creating QA plan in MySQL, persisting to local store:", err);
    }
  }

  // Fallback local save
  const newId = `plan-${Date.now()}`;
  const newPlan: QaIncentivePlan = {
    id: newId,
    ...input,
    tiers: enrichedTiers,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = readLocalPlans();
  const updated = [newPlan, ...current];
  writeLocalPlans(updated);
  return newPlan;
}

/**
 * Update an existing QA incentive plan
 */
export async function updateQaIncentivePlan(
  id: string,
  input: Partial<QaIncentivePlan>
): Promise<QaIncentivePlan | null> {
  const currentPlans = await getQaIncentivePlans();
  const existing = currentPlans.find((p) => p.id === id);
  if (!existing) {
    throw new Error(`QA Incentive Plan with ID ${id} not found.`);
  }

  const merged: QaIncentivePlan = {
    ...existing,
    ...input,
    updated_at: new Date().toISOString(),
  };

  merged.tiers = enrichPlanTiers(merged.base_target_leads, merged.base_incentive_amount, merged.tiers || []);
  const jsonTiers = JSON.stringify(merged.tiers);

  const dbOk = await ensureQaTable();
  if (dbOk && /^\d+$/.test(id)) {
    try {
      const updateSql = `
        UPDATE qa_incentive_plans SET
          plan_name = ?,
          qa_agent_id = ?,
          qa_agent_name = ?,
          client_code = ?,
          campaign_id = ?,
          campaign_name = ?,
          frequency = ?,
          base_target_leads = ?,
          base_incentive_amount = ?,
          tiers_json = ?,
          is_active = ?,
          notes = ?,
          updated_at = NOW(6)
        WHERE id = ?
      `;

      await execute(updateSql, [
        merged.plan_name,
        merged.qa_agent_id ? Number(merged.qa_agent_id) : null,
        merged.qa_agent_name,
        merged.client_code,
        merged.campaign_id ? Number(merged.campaign_id) : null,
        merged.campaign_name,
        merged.frequency,
        Number(merged.base_target_leads),
        Number(merged.base_incentive_amount),
        jsonTiers,
        merged.is_active ? 1 : 0,
        merged.notes || null,
        Number(id),
      ]);
    } catch (err) {
      console.warn("Failed updating plan in MySQL, updating local store:", err);
    }
  }

  const local = readLocalPlans();
  const idx = local.findIndex((p) => p.id === id);
  if (idx !== -1) {
    local[idx] = merged;
  } else {
    local.unshift(merged);
  }
  writeLocalPlans(local);

  return merged;
}

/**
 * Delete a QA incentive plan
 */
export async function deleteQaIncentivePlan(id: string): Promise<boolean> {
  const dbOk = await ensureQaTable();
  if (dbOk && /^\d+$/.test(id)) {
    try {
      await execute(`DELETE FROM qa_incentive_plans WHERE id = ?`, [Number(id)]);
    } catch (err) {
      console.warn("Failed deleting plan from MySQL:", err);
    }
  }

  const local = readLocalPlans();
  const filtered = local.filter((p) => p.id !== id);
  writeLocalPlans(filtered);
  return true;
}

