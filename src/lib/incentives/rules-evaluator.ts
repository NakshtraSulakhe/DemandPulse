import {
  IncentiveConfiguration,
  IncentiveTierSlab,
  IncentiveRuleOverride,
} from "@/types/incentive-config";

export const DEFAULT_INCENTIVE_CONFIG: IncentiveConfiguration = {
  baseDailyIncentive: 500,
  targetThresholdPct: 100,
  currency: "INR",
  currencySymbol: "₹",
  tieredSlabs: [
    {
      id: "slab-1",
      name: "Tier 1 (100% – 150%)",
      minPct: 100,
      maxPct: 150,
      ratePerPoint: 50,
      description: "Standard accelerator: ₹50 for each point earned above 100% up to 150%",
    },
    {
      id: "slab-2",
      name: "Tier 2 (150% – 200%)",
      minPct: 150,
      maxPct: 200,
      ratePerPoint: 75,
      description: "High performance accelerator: ₹75 for each point between 150% and 200%",
    },
    {
      id: "slab-3",
      name: "Tier 3 (> 200% Super-Achiever)",
      minPct: 200,
      maxPct: null,
      ratePerPoint: 100,
      description: "Super-achiever uncapped accelerator: ₹100 for each point exceeding 200%",
    },
  ],
  qaPolicy: {
    zeroOutIncentive: true,
    fixedDeductionPerEscalation: 0,
  },
  allowedAttendanceStatuses: ["Present", "Full Day", "Half Day", "In Progress"],
  disqualifyAbsent: true,
  overrides: [
    {
      id: "override-sr-sdr",
      targetType: "role",
      targetIdentifier: "Senior SDR",
      baseIncentiveOverride: 600,
      multiplier: 1.1,
      isActive: true,
      notes: "Senior SDR Tier Base Rate (₹600 + 10% accelerator bonus)",
    },
  ],
  effectiveDate: "2026-10-01",
  version: 1,
  lastUpdated: new Date().toISOString(),
  updatedBy: "System Default Rules",
};

export interface CalculationBreakdownResult {
  isEligible: boolean;
  eligibilityReason: string;
  completionPct: number;
  baseIncentive: number;
  slabIncentive: number;
  totalIncentive: number;
  qaDeduction: number;
  appliedSlabs: {
    slabId: string;
    slabName: string;
    extraPoints: number;
    ratePerPoint: number;
    subtotal: number;
  }[];
  appliedOverride?: IncentiveRuleOverride;
}

/**
 * Pure, browser-safe real-time simulator & evaluator applying configured incentive rules,
 * tiered slabs, QA policies, and role/department overrides.
 */
export function calculateIncentiveBreakdown(
  achievedPoints: number,
  targetPoints: number,
  attendanceStatus: string,
  hasEscalation: boolean,
  config: IncentiveConfiguration,
  role?: string,
  department?: string,
  agentId?: number | string
): CalculationBreakdownResult {
  const safeTarget = Math.max(0.1, targetPoints);
  const completionPct = (achievedPoints / safeTarget) * 100;

  // 1. Attendance Check
  const isPresent = config.allowedAttendanceStatuses.some(
    (status) => status.toLowerCase() === (attendanceStatus || "").toLowerCase().trim()
  );

  if (config.disqualifyAbsent && !isPresent) {
    return {
      isEligible: false,
      eligibilityReason: `Disqualified due to attendance status: "${attendanceStatus || "Absent"}"`,
      completionPct,
      baseIncentive: 0,
      slabIncentive: 0,
      totalIncentive: 0,
      qaDeduction: 0,
      appliedSlabs: [],
    };
  }

  // 2. Minimum Threshold Check
  if (completionPct < config.targetThresholdPct) {
    return {
      isEligible: false,
      eligibilityReason: `Target not achieved: ${completionPct.toFixed(1)}% (Threshold: ${config.targetThresholdPct}%)`,
      completionPct,
      baseIncentive: 0,
      slabIncentive: 0,
      totalIncentive: 0,
      qaDeduction: 0,
      appliedSlabs: [],
    };
  }

  // 3. Find Overrides
  let matchedOverride: IncentiveRuleOverride | undefined;
  if (config.overrides && config.overrides.length > 0) {
    matchedOverride = config.overrides.find((o) => {
      if (!o.isActive) return false;
      if (o.targetType === "agent" && agentId !== undefined) {
        return String(o.targetIdentifier).toLowerCase() === String(agentId).toLowerCase();
      }
      if (o.targetType === "role" && role) {
        return o.targetIdentifier.toLowerCase() === role.toLowerCase();
      }
      if (o.targetType === "department" && department) {
        return o.targetIdentifier.toLowerCase() === department.toLowerCase();
      }
      return false;
    });
  }

  // Base Incentive
  let base = matchedOverride?.baseIncentiveOverride !== undefined
    ? matchedOverride.baseIncentiveOverride
    : config.baseDailyIncentive;

  // 4. Calculate Tiered Slabs
  let slabIncentive = 0;
  const appliedSlabs: CalculationBreakdownResult["appliedSlabs"] = [];

  // Sort slabs by minPct ascending
  const sortedSlabs = [...(config.tieredSlabs || [])].sort((a, b) => a.minPct - b.minPct);

  for (const slab of sortedSlabs) {
    if (completionPct > slab.minPct) {
      // Calculate how many points fall into this slab's range
      const slabMinPoints = (slab.minPct / 100) * safeTarget;
      const slabMaxPoints = slab.maxPct !== null ? (slab.maxPct / 100) * safeTarget : Infinity;

      const slabEffectiveEndPoints = Math.min(achievedPoints, slabMaxPoints);
      const extraPointsInSlab = Math.max(0, slabEffectiveEndPoints - slabMinPoints);

      if (extraPointsInSlab > 0) {
        const rate = matchedOverride?.customSlabRate !== undefined ? matchedOverride.customSlabRate : slab.ratePerPoint;
        const subtotal = Math.round(extraPointsInSlab * rate * 100) / 100;
        slabIncentive += subtotal;

        appliedSlabs.push({
          slabId: slab.id,
          slabName: slab.name,
          extraPoints: Math.round(extraPointsInSlab * 100) / 100,
          ratePerPoint: rate,
          subtotal,
        });
      }
    }
  }

  // Multiplier if configured
  if (matchedOverride?.multiplier && matchedOverride.multiplier > 0) {
    slabIncentive = Math.round(slabIncentive * matchedOverride.multiplier * 100) / 100;
  }

  let totalBeforePenalty = base + slabIncentive;
  let qaDeduction = 0;

  // 5. QA Escalation Policy
  if (hasEscalation) {
    if (config.qaPolicy.zeroOutIncentive) {
      return {
        isEligible: false,
        eligibilityReason: "Zeroed out due to active QA Escalation penalty policy",
        completionPct,
        baseIncentive: base,
        slabIncentive,
        totalIncentive: 0,
        qaDeduction: totalBeforePenalty,
        appliedSlabs,
        appliedOverride: matchedOverride,
      };
    } else if (config.qaPolicy.fixedDeductionPerEscalation > 0) {
      qaDeduction = config.qaPolicy.fixedDeductionPerEscalation;
    }
  }

  const finalTotal = Math.max(0, totalBeforePenalty - qaDeduction);

  return {
    isEligible: true,
    eligibilityReason: `Qualified: Achieved ${completionPct.toFixed(1)}% points with verified attendance & QA compliance`,
    completionPct,
    baseIncentive: base,
    slabIncentive,
    totalIncentive: Math.round(finalTotal * 100) / 100,
    qaDeduction,
    appliedSlabs,
    appliedOverride: matchedOverride,
  };
}
