/**
 * DemandFlow Bridge CRM — Daily Agent Incentive Rules Configuration Types
 */

export interface IncentiveTierSlab {
  id: string;
  name: string;
  minPct: number; // e.g. 100
  maxPct: number | null; // e.g. 150, or null for uncapped tier (>200%)
  ratePerPoint: number; // extra INR earned per point in this tier
  description?: string;
}

export interface IncentiveRuleOverride {
  id: string;
  targetType: "role" | "department" | "agent";
  targetIdentifier: string; // e.g., "Senior SDR", "Enterprise B2B", "14"
  baseIncentiveOverride?: number;
  multiplier?: number; // e.g., 1.25x for strategic campaigns
  customSlabRate?: number;
  isActive: boolean;
  notes?: string;
}

export interface IncentiveQaEscalationPolicy {
  zeroOutIncentive: boolean; // if true, any active QA escalation sets total incentive to 0
  fixedDeductionPerEscalation: number; // penalty deduction if not completely zeroed
}

export interface IncentiveConfiguration {
  baseDailyIncentive: number; // Base payout when reaching threshold (default: 500)
  targetThresholdPct: number; // Minimum target achievement percentage required (default: 100)
  currency: string; // "INR"
  currencySymbol: string; // "₹"
  tieredSlabs: IncentiveTierSlab[];
  qaPolicy: IncentiveQaEscalationPolicy;
  allowedAttendanceStatuses: string[]; // ["Present", "Full Day", "Half Day", "In Progress"]
  disqualifyAbsent: boolean;
  overrides: IncentiveRuleOverride[];
  effectiveDate: string; // YYYY-MM-DD (rules only apply on or after this business date)
  version: number;
  lastUpdated: string;
  updatedBy: string;
}

export type IncentiveConfigUpdatePayload = Partial<
  Omit<IncentiveConfiguration, "version" | "lastUpdated">
>;
