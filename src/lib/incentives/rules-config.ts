import {
  IncentiveConfiguration,
  IncentiveConfigUpdatePayload,
} from "@/types/incentive-config";
import {
  DEFAULT_INCENTIVE_CONFIG,
  calculateIncentiveBreakdown,
  CalculationBreakdownResult,
} from "./rules-evaluator";
import { prisma, serializeDbData } from "@/lib/db";
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
    const record = await prisma.slideSystemSetting.findUnique({
      where: { settingKey: "legacy_incentive_rules_config" },
    });

    if (record) {
      const parsed: any = serializeDbData(record.settingValue);
      return {
        ...DEFAULT_INCENTIVE_CONFIG,
        ...parsed,
      };
    }

    // Fall back to the active incentive policy in MySQL if available
    const activePolicy = await prisma.incentivePolicy.findFirst({
      where: { status: { in: ["active", "approved", "draft"] } },
      include: { rules: true, slabs: { orderBy: { slabOrder: "asc" } } },
      orderBy: { version: "desc" },
    });

    if (activePolicy && activePolicy.rules) {
      const slabs = activePolicy.slabs.map((s) => ({
        id: `slab-${s.slabOrder}`,
        name: `Tier ${s.slabOrder}`,
        minPct: Number(s.minimumCompletionPct),
        maxPct: s.maximumCompletionPct ? Number(s.maximumCompletionPct) : null,
        ratePerPoint: Number(s.amountPerExtraPoint),
        description: `Tier ${s.slabOrder}: ₹${Number(s.amountPerExtraPoint)}/point`,
      }));

      return {
        ...DEFAULT_INCENTIVE_CONFIG,
        baseDailyIncentive: Number(activePolicy.rules.baseIncentiveAmount),
        targetThresholdPct: Number(activePolicy.rules.minimumTargetPct),
        currency: activePolicy.currency || "INR",
        tieredSlabs: slabs.length > 0 ? slabs : DEFAULT_INCENTIVE_CONFIG.tieredSlabs,
        version: activePolicy.version,
        lastUpdated: activePolicy.updatedAt.toISOString(),
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

  // Persist to slide_system_settings in MySQL
  await prisma.slideSystemSetting.upsert({
    where: { settingKey: "legacy_incentive_rules_config" },
    update: {
      settingValue: updated as any,
      updatedAt: new Date(),
    },
    create: {
      settingKey: "legacy_incentive_rules_config",
      settingValue: updated as any,
    },
  });

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
