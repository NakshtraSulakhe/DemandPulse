/**
 * DemandFlow Analytics Business Logic & Calculations
 *
 * Rule:
 * Daily Remaining = MAX(0, Allocated Daily Target - Eligible Qualified Leads)
 * Never decrement the stored daily allocation itself.
 */

export function calculateDailyRemaining(allocatedDailyTarget: number, eligibleQualifiedLeads: number): number {
  const target = Math.max(0, allocatedDailyTarget || 0);
  const qualified = Math.max(0, eligibleQualifiedLeads || 0);
  return Math.max(0, target - qualified);
}

export function calculateCompletionPercentage(achieved: number, target: number): number {
  if (!target || target <= 0) return 0;
  const pct = (achieved / target) * 100;
  return Math.min(100, Math.round(pct * 10) / 10);
}

export function calculateRemainingPoints(targetPoints: number, achievedPoints: number): number {
  const target = Math.max(0, targetPoints || 0);
  const achieved = Math.max(0, achievedPoints || 0);
  return Math.max(0, Math.round((target - achieved) * 10) / 10);
}

export function calculateAuditTurnaroundRate(audited: number, generated: number): number {
  if (!generated || generated <= 0) return 0;
  return Math.min(100, Math.round((audited / generated) * 1000) / 10);
}

export function calculateQualificationRate(qualified: number, audited: number): number {
  if (!audited || audited <= 0) return 0;
  return Math.min(100, Math.round((qualified / audited) * 1000) / 10);
}
