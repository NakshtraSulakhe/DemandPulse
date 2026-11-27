/**
 * DemandPulse Productivity & Target Calculation Engine
 * Strictly separates:
 * 1. Productivity points
 * 2. Assigned target
 * 3. Target achievement percentage
 * 4. Eligibility status
 * 5. Incentive amount
 */

export interface ProductivityMetricResult {
  target: number;
  actual: number;
  achievementPct: number;
  remaining: number;
  isAchieved: boolean;
}

export interface AgentProductivitySummary {
  employeeId: number;
  employeeName: string;
  role: string;
  // Daily metrics
  daily: ProductivityMetricResult;
  // Monthly metrics
  monthly: ProductivityMetricResult & {
    workingDays: number;
    isManuallyAdjusted: boolean;
    calculatedMonthlyTarget: number;
    adjustmentReason?: string | null;
  };
  campaignBreakdown: Record<string, { count: number; points: number }>;
  attendanceStatus: string;
  isEligibleDaily: boolean;
  isEligibleMonthly: boolean;
}

export interface QaProductivitySummary {
  qaAgentId: number;
  qaAgentName: string;
  // Daily metrics
  daily: ProductivityMetricResult;
  // Monthly metrics
  monthly: ProductivityMetricResult & {
    workingDays: number;
  };
  campaignBreakdown?: Record<string, { count: number; points: number }>;
  qualityScorePct: number;
  reworkPct: number;
  uniqueLeadsAudited: number;
  totalAudits: number;
  qualifiedLeads: number;
  disqualifiedLeads: number;
  reworkLeads: number;
  qualityThresholdPct: number;
  isQualityEligible: boolean;
}

/**
 * Calculates productivity metrics from actual vs target.
 * BUG-008 FIX: When target is 0 (unassigned agent), return zeroed result instead of
 * Math.max(0.001) which caused absurd 100,000%+ completion percentages.
 */
export function calculateProductivityMetrics(
  actual: number,
  target: number
): ProductivityMetricResult {
  const safeActual = Math.max(0, Number(actual) || 0);
  const rawTarget = Number(target) || 0;

  // BUG-008 FIX: If target is 0 (unassigned), return zeroed metrics rather than
  // dividing by a near-zero epsilon that produces astronomical percentages.
  if (rawTarget <= 0) {
    return {
      target: 0,
      actual: Math.round(safeActual * 100) / 100,
      achievementPct: 0,
      remaining: 0,
      isAchieved: false,
    };
  }

  const safeTarget = rawTarget;
  const achievementPct = Math.round((safeActual / safeTarget) * 100 * 10) / 10;
  const remaining = Math.max(0, Math.round((safeTarget - safeActual) * 100) / 100);
  const isAchieved = safeActual >= safeTarget;

  return {
    target: Math.round(safeTarget * 100) / 100,
    actual: Math.round(safeActual * 100) / 100,
    achievementPct,
    remaining,
    isAchieved,
  };
}

/**
 * Derives monthly target from daily target and working days.
 */
export function calculateMonthlyTargetFromDaily(
  dailyTarget: number,
  workingDays: number
): number {
  const safeDaily = Math.max(0, Number(dailyTarget) || 0);
  const safeDays = Math.max(1, Number(workingDays) || 22);
  return Math.round(safeDaily * safeDays * 100) / 100;
}

/**
 * Calculates campaign-wise productivity points from quantities and point factors.
 * Formula: Total Points = Sum(Eligible Quantity * Points Factor)
 */
export function calculateTotalCampaignPoints(
  activities: Array<{ activityType: string; quantity: number }>,
  pointsMap: Record<string, number>
): {
  totalPoints: number;
  breakdown: Array<{ activityType: string; quantity: number; pointFactor: number; points: number }>;
} {
  let totalPoints = 0;
  const breakdown: Array<{ activityType: string; quantity: number; pointFactor: number; points: number }> = [];

  for (const act of activities) {
    const qty = Math.max(0, Number(act.quantity) || 0);
    const key = act.activityType.toLowerCase().trim();
    const factor = pointsMap[key] !== undefined ? pointsMap[key] : 1.0;
    const points = Math.round(qty * factor * 100) / 100;

    totalPoints += points;
    breakdown.push({
      activityType: act.activityType,
      quantity: qty,
      pointFactor: factor,
      points,
    });
  }

  return {
    totalPoints: Math.round(totalPoints * 100) / 100,
    breakdown,
  };
}

