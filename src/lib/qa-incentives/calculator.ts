import {
  QaIncentivePlan,
  QaIncentiveTier,
  QaTierBreakdownItem,
  QaIncentiveCalculationItem,
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

/**
 * Evaluates the incentive earned by a QA analyst for a given count of audited leads.
 * Rules:
 * 1. Base Target: If actual_leads >= base_target_leads, base_incentive_amount is unlocked.
 * 2. Tiered Slabs:
 *    Any leads beyond base_target_leads cascade into the configured tiers in sequential order.
 *    For each tier, (leads_in_tier * rate_per_lead) is added.
 */
export function calculateQaIncentive(
  actualLeadsAudited: number,
  plan: QaIncentivePlan,
  analystInfo?: { id: number; name: string }
): QaIncentiveCalculationItem {
  const actual = Math.max(0, Math.floor(Number(actualLeadsAudited) || 0));
  const baseTarget = Math.max(1, Math.floor(Number(plan.base_target_leads) || 50));
  const baseAmount = Math.max(0, Number(plan.base_incentive_amount) || 500);

  const baseAchieved = actual >= baseTarget;
  const baseEarned = baseAchieved ? baseAmount : 0;

  let extraLeads = baseAchieved ? actual - baseTarget : 0;
  let totalTierIncentive = 0;
  const tierBreakdown: QaTierBreakdownItem[] = [];

  const enrichedTiers = enrichPlanTiers(baseTarget, baseAmount, plan.tiers || []);
  let tierRangeStart = baseTarget + 1;

  for (const tier of enrichedTiers) {
    const capacity = tier.extra_leads;
    const rate = tier.rate_per_lead;
    const tierRangeEnd = capacity > 0 ? tierRangeStart + capacity - 1 : Infinity;

    let leadsInTier = 0;
    if (extraLeads > 0) {
      if (capacity > 0) {
        leadsInTier = Math.min(extraLeads, capacity);
        extraLeads -= leadsInTier;
      } else {
        // Open-ended tier
        leadsInTier = extraLeads;
        extraLeads = 0;
      }
    }

    const earned = leadsInTier * rate;
    totalTierIncentive += earned;

    tierBreakdown.push({
      tier_order: tier.tier_order,
      tier_name: tier.tier_name,
      extra_leads: capacity,
      rate_per_lead: rate,
      leads_in_tier: leadsInTier,
      tier_incentive_earned: earned,
      tier_range_start: tierRangeStart,
      tier_range_end: capacity > 0 ? tierRangeEnd : 999999,
    });

    tierRangeStart += capacity;
  }

  const totalIncentive = baseEarned + totalTierIncentive;

  return {
    qa_agent_id: analystInfo?.id ?? (plan.qa_agent_id ? Number(plan.qa_agent_id) : 0),
    qa_agent_name: analystInfo?.name ?? plan.qa_agent_name,
    client_code: plan.client_code,
    campaign_name: plan.campaign_name,
    frequency: plan.frequency,
    period_label: plan.frequency === "DAILY" ? "Daily Target" : "Monthly Target",
    actual_leads_audited: actual,
    qualified_leads: Math.round(actual * 0.82), // representative estimate if breakdown not provided
    disqualified_leads: Math.round(actual * 0.18),
    base_target_leads: baseTarget,
    base_target_achieved: baseAchieved,
    base_incentive_amount: baseAmount,
    base_incentive_earned: baseEarned,
    tier_breakdown: tierBreakdown,
    total_tier_incentive: totalTierIncentive,
    total_incentive: totalIncentive,
    plan_id: String(plan.id),
    plan_name: plan.plan_name,
  };
}

