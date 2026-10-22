import fs from "fs/promises";
import path from "path";
import {
  IncentiveConfiguration,
  IncentiveConfigUpdatePayload,
} from "@/types/incentive-config";
import {
  DEFAULT_INCENTIVE_CONFIG,
  calculateIncentiveBreakdown,
  CalculationBreakdownResult,
} from "./rules-evaluator";

export {
  DEFAULT_INCENTIVE_CONFIG,
  calculateIncentiveBreakdown,
  type CalculationBreakdownResult,
};

const INCENTIVE_RULES_FILE = path.join(process.cwd(), "data", "incentive-rules.json");

/**
 * Reads incentive rules configuration from persistent store, initializing with defaults if missing
 */
export async function getIncentiveConfig(): Promise<IncentiveConfiguration> {
  try {
    const raw = await fs.readFile(INCENTIVE_RULES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_INCENTIVE_CONFIG,
      ...parsed,
    };
  } catch {
    await saveIncentiveConfig(DEFAULT_INCENTIVE_CONFIG, "System Initialization").catch(() => {});
    return DEFAULT_INCENTIVE_CONFIG;
  }
}

/**
 * Saves updated incentive rules with version increment and audit logging
 */
export async function saveIncentiveConfig(
  updates: IncentiveConfigUpdatePayload,
  updatedBy: string = "Admin User"
): Promise<IncentiveConfiguration> {
  let current: IncentiveConfiguration;
  try {
    const raw = await fs.readFile(INCENTIVE_RULES_FILE, "utf-8");
    current = JSON.parse(raw);
  } catch {
    current = DEFAULT_INCENTIVE_CONFIG;
  }

  const updated: IncentiveConfiguration = {
    ...current,
    ...updates,
    version: (current.version || 1) + 1,
    lastUpdated: new Date().toISOString(),
    updatedBy,
  };

  const dataDir = path.dirname(INCENTIVE_RULES_FILE);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(INCENTIVE_RULES_FILE, JSON.stringify(updated, null, 2), "utf-8");

  return updated;
}
