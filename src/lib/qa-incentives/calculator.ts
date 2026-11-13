import {
  QaIncentivePlan,
  QaIncentiveTier,
  QaTierBreakdownItem,
  QaIncentiveCalculationItem,
  QaAdditionalRule,
  QaAdditionalIncentiveBreakdownItem,
} from "@/types/qa-incentives";

/**
 * Enriches tiers with cumulative thresholds and reward amounts.
 * Example:
 * Base: 50 leads -> ₹500
 * Tier 1: +10 leads @ ₹15 -> Cumulative 60 leads, +₹150, Total: ₹650
 * Tier 2: +10 leads @ ₹20 -> Cumulative 70 leads, +₹200, Total: ₹850
 */
export function enrichPlanTiers(
  baseTargetLeads: number,
  baseIncentiveAmount: number,
  tiers: QaIncentiveTier[]
): QaIncentiveTier[] {
  let runningLeads = Number(baseTargetLeads) || 0;
  let runningReward = Number(baseIncentiveAmount) || 0;

  const sorted = [...tiers].sort((a, b) => a.tier_order - b.tier_order);

  return sorted.map((tier, idx) => {
    const extraLeads = Math.max(0, Number(tier.extra_leads) || 0);
    const ratePerLead = Math.max(0, Number(tier.rate_per_lead) || 0);
    const tierReward = extraLeads * ratePerLead;

    runningLeads += extraLeads;
    runningReward += tierReward;

    return {
      ...tier,
      tier_order: idx + 1,
      tier_name: tier.tier_name || `Tier ${idx + 1} (+${extraLeads} leads)`,
      extra_leads: extraLeads,
      rate_per_lead: ratePerLead,
      cumulative_leads: runningLeads,
      tier_reward: tierReward,
      total_cumulative_reward: runningReward,
    };
  });
}

export interface QaIncentiveCalculationOptions {
  actualPoints?: number;
  baseTargetPoints?: number;
  actualLeadsAudited?: number;
  rectifiedCount?: number;
  statusCounts?: Record<string, number>;
  campaignBreakdown?: Array<{
    activity_type: string;
    campaign_name: string;
    lead_count: number;
    point_factor: number;
    total_points: number;
  }>;
}

/**
 * Evaluates the incentive earned by a QA analyst based on points or leads.
 * Rules:
 * 1. Base Target: If actual_points >= base_target_points, base_incentive_amount is unlocked.
 * 2. Tiered Slabs:
 *    Any points beyond base_target_points cascade into the configured tiers in sequential order.
 *    For each tier, (points_in_tier * rate_per_point) is added.
 * 3. Additional Status Rules (e.g. Rectified Leads Daily Bonus):
 *    If analyst's count of leads with specified status (e.g. 'Rectified') >= min_count,
 *    additional reward (per-lead or flat bonus) is earned for that day.
 */
export function calculateQaIncentive(
  actualValue: number,
  plan: QaIncentivePlan,
  analystInfo?: { id: number; name: string },
  options?: QaIncentiveCalculationOptions
): QaIncentiveCalculationItem {
  // Use points if provided in options or as actualValue
  const actual = options?.actualPoints !== undefined
    ? Math.round(Number(options.actualPoints) * 100) / 100
    : Math.max(0, Math.round(Number(actualValue) * 100) / 100);

  const baseTarget = options?.baseTargetPoints !== undefined
    ? Number(options.baseTargetPoints)
    : Math.max(1, Math.round(Number(plan.base_target_points || plan.base_target_leads || 50) * 100) / 100);

  const baseAmount = Math.max(0, Number(plan.base_incentive_amount) || 500);

  const baseAchieved = actual >= baseTarget;
  const baseEarned = baseAchieved ? baseAmount : 0;

  let extraPoints = baseAchieved ? Math.round((actual - baseTarget) * 100) / 100 : 0;
  let totalTierIncentive = 0;
  const tierBreakdown: QaTierBreakdownItem[] = [];

  const enrichedTiers = enrichPlanTiers(baseTarget, baseAmount, plan.tiers || []);
  let tierRangeStart = baseTarget + 1;

  for (const tier of enrichedTiers) {
    const capacity = tier.extra_leads;
    const rate = tier.rate_per_lead;
    const tierRangeEnd = capacity > 0 ? tierRangeStart + capacity - 1 : Infinity;

    let pointsInTier = 0;
    if (extraPoints > 0) {
      if (capacity > 0) {
        pointsInTier = Math.min(extraPoints, capacity);
        extraPoints = Math.round((extraPoints - pointsInTier) * 100) / 100;
      } else {
        // Open-ended tier
        pointsInTier = extraPoints;
        extraPoints = 0;
      }
    }

    const earned = Math.round(pointsInTier * rate * 100) / 100;
    totalTierIncentive += earned;

    tierBreakdown.push({
      tier_order: tier.tier_order,
      tier_name: tier.tier_name,
      extra_leads: capacity,
      rate_per_lead: rate,
      leads_in_tier: pointsInTier,
      tier_incentive_earned: earned,
      tier_range_start: tierRangeStart,
      tier_range_end: capacity > 0 ? tierRangeEnd : 999999,
    });

    tierRangeStart += capacity;
  }

  // 3. Additional Rules: Strictly consider only Rectified Leads for additional incentive
  const additionalRulesBreakdown: QaAdditionalIncentiveBreakdownItem[] = [];
  let totalAdditionalIncentive = 0;
  const statusCounts = options?.statusCounts || {};
  const rectifiedCount = options?.rectifiedCount ?? (statusCounts["Rectified"] || statusCounts["rectified"] || 0);

  if (Array.isArray(plan.additional_rules) && plan.additional_rules.length > 0) {
    for (const rule of plan.additional_rules) {
      if (rule.is_active === false) continue;
      // Strictly consider only rectified leads for additional incentive
      const matchingCount = rectifiedCount;

      const minRequired = Math.max(0, Number(rule.min_count) || 0);
      const isQualified = matchingCount >= minRequired && matchingCount > 0;
      let earned = 0;
      let pointsEarned = 0;

      if (isQualified) {
        if (rule.rule_type === "FLAT_BONUS") {
          earned = Number(rule.reward_amount) || 0;
        } else if (rule.rule_type === "POINTS_PER_LEAD") {
          pointsEarned = Math.round(matchingCount * (Number(rule.point_factor) || 1) * 100) / 100;
        } else {
          // Default: PER_LEAD
          earned = Math.round(matchingCount * (Number(rule.reward_amount) || 0) * 100) / 100;
          if (rule.point_factor) {
            pointsEarned = Math.round(matchingCount * Number(rule.point_factor) * 100) / 100;
          }
        }
      }

      totalAdditionalIncentive += earned;

      additionalRulesBreakdown.push({
        rule_id: rule.id,
        rule_name: rule.rule_name || "Rectified Leads Incentive",
        status_name: "Rectified",
        rule_type: rule.rule_type,
        matching_count: matchingCount,
        min_count: minRequired,
        is_qualified: isQualified,
        reward_amount: Number(rule.reward_amount) || 0,
        incentive_earned: earned,
        points_earned: pointsEarned,
      });
    }
  }

  const grandTotalIncentive = Math.round((baseEarned + totalTierIncentive + totalAdditionalIncentive) * 100) / 100;
  const rawLeadsAudited = options?.actualLeadsAudited !== undefined
    ? Number(options.actualLeadsAudited)
    : Math.round(actualValue);

  return {
    qa_agent_id: analystInfo?.id ?? (plan.qa_agent_id ? Number(plan.qa_agent_id) : 0),
    qa_agent_name: analystInfo?.name ?? plan.qa_agent_name,
    client_code: plan.client_code,
    campaign_name: plan.campaign_name,
    frequency: plan.frequency,
    period_label: plan.frequency === "DAILY" ? "Daily Target" : "Monthly Target",
    actual_leads_audited: rawLeadsAudited,
    actual_points: actual,
    target_points: baseTarget,
    achievement_pct: baseTarget > 0 ? Math.round((actual / baseTarget) * 100 * 10) / 10 : 0,
    remaining_points: Math.max(0, Math.round((baseTarget - actual) * 10) / 10),
    campaign_breakdown: options?.campaignBreakdown || [],
    qualified_leads: Math.round(rawLeadsAudited * 0.82),
    disqualified_leads: Math.round(rawLeadsAudited * 0.18),
    rectified_count: rectifiedCount,
    base_target_leads: baseTarget,
    base_target_achieved: baseAchieved,
    base_incentive_amount: baseAmount,
    base_incentive_earned: baseEarned,
    tier_breakdown: tierBreakdown,
    total_tier_incentive: totalTierIncentive,
    additional_rules_breakdown: additionalRulesBreakdown,
    total_additional_incentive: totalAdditionalIncentive,
    total_incentive: grandTotalIncentive,
    plan_id: String(plan.id),
    plan_name: plan.plan_name,
  };
}

