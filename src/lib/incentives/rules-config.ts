import {
  IncentiveConfiguration,
  IncentiveConfigUpdatePayload,
} from "@/types/incentive-config";
import {
  DEFAULT_INCENTIVE_CONFIG,
  calculateIncentiveBreakdown,
  CalculationBreakdownResult,
} from "./rules-evaluator";
import { query, queryOne, execute, serializeDbData } from "@/lib/db";
import { recordSettingChangeEvent } from "@/lib/db/preferences-repository";

export {
  DEFAULT_INCENTIVE_CONFIG,
  calculateIncentiveBreakdown,
  type CalculationBreakdownResult,
};

/**
 * Reads incentive rules configuration directly from MySQL (zero filesystem reads)
 */
export async function getIncentiveConfig(): Promise<IncentiveConfiguration> {
  try {
    const record = await queryOne<{
      setting_key: string;
      setting_value: any;
    }>(
      `SELECT setting_key, setting_value FROM slide_system_settings WHERE setting_key = ? LIMIT 1`,
      ["legacy_incentive_rules_config"]
    );

    if (record) {
      const parsed: any = typeof record.setting_value === "string" ? JSON.parse(record.setting_value) : record.setting_value;
      return {
        ...DEFAULT_INCENTIVE_CONFIG,
        ...parsed,
      };
    }

    // Fall back to the active incentive policy in MySQL if available
    const activePolicy = await queryOne<{
      id: number | string;
      policy_code: string;
      policy_name: string;
      version: number;
      currency: string;
      updated_at: string;
      base_incentive_amount: number;
      minimum_target_pct: number;
    }>(
      `SELECT p.id, p.policy_code, p.policy_name, p.version, p.currency, p.updated_at,
              r.base_incentive_amount, r.minimum_target_pct
       FROM incentive_policies p
       JOIN incentive_policy_rules r ON p.id = r.policy_id
       WHERE p.status IN ('active', 'approved', 'draft')
       ORDER BY p.version DESC LIMIT 1`
    );

    if (activePolicy) {
      const slabsRows = await query<{
        slab_order: number;
        minimum_completion_pct: number;
        maximum_completion_pct: number | null;
        amount_per_extra_point: number;
      }>(
        `SELECT slab_order, minimum_completion_pct, maximum_completion_pct, amount_per_extra_point
         FROM incentive_policy_slabs
         WHERE policy_id = ?
         ORDER BY slab_order ASC`,
        [activePolicy.id]
      );

      const slabs = slabsRows.map((s) => ({
        id: `slab-${s.slab_order}`,
        name: `Tier ${s.slab_order}`,
        minPct: Number(s.minimum_completion_pct),
        maxPct: s.maximum_completion_pct ? Number(s.maximum_completion_pct) : null,
        ratePerPoint: Number(s.amount_per_extra_point),
        description: `Tier ${s.slab_order}: ₹${Number(s.amount_per_extra_point)}/point`,
      }));

      return {
        ...DEFAULT_INCENTIVE_CONFIG,
        baseDailyIncentive: Number(activePolicy.base_incentive_amount),
        targetThresholdPct: Number(activePolicy.minimum_target_pct),
        currency: activePolicy.currency || "INR",
        tieredSlabs: slabs.length > 0 ? slabs : DEFAULT_INCENTIVE_CONFIG.tieredSlabs,
        version: activePolicy.version,
        lastUpdated: String(activePolicy.updated_at),
      };
    }

    return DEFAULT_INCENTIVE_CONFIG;
  } catch (err) {
    console.error("Error reading incentive config from MySQL:", err);
    return DEFAULT_INCENTIVE_CONFIG;
  }
}

/**
 * Saves updated incentive rules directly to MySQL (zero filesystem writes)
 */
export async function saveIncentiveConfig(
  updates: IncentiveConfigUpdatePayload,
  updatedBy: string = "Admin User"
): Promise<IncentiveConfiguration> {
  const current = await getIncentiveConfig();

  const nextVersion = (current.version || 1) + 1;
  const updated: IncentiveConfiguration = {
    ...current,
    ...updates,
    version: nextVersion,
    lastUpdated: new Date().toISOString(),
    updatedBy,
  };

  const jsonVal = JSON.stringify(serializeDbData(updated));

  // Persist to slide_system_settings in MySQL
  await execute(
    `INSERT INTO slide_system_settings (setting_key, setting_value, updated_at)
     VALUES ('legacy_incentive_rules_config', ?, NOW(6))
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       updated_at = NOW(6)`,
    [jsonVal]
  );

  // Record change event in audit log
  await recordSettingChangeEvent(
    "INCENTIVE_RULES",
    "legacy_rules_config",
    current,
    updated,
    BigInt(1)
  );

  return updated;
}
