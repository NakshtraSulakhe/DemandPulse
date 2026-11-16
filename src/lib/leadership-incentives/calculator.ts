import {
  getLeadershipMembers,
  getActiveLeadershipPlan,
} from "@/lib/db/leadership-incentive-repository";
import { fetchIncentivePreview } from "@/lib/incentives/api";
import { query } from "@/lib/db";
import { getEmployeeTargetAssignments } from "@/lib/db/employee-targets-repository";
import {
  LeadershipDailyCalculation,
  LeadershipMonthlyCalculation,
  LeadershipIncentiveTier,
  LeadershipMember,
  TeamMemberDailyContribution,
  TeamMemberMonthlyContribution,
} from "@/types/leadership-incentives";

/**
 * Match achievement percentage against leadership plan tiers
 */
export function matchLeadershipTier(
  achievementPct: number,
  tiers: LeadershipIncentiveTier[],
  minThresholdPct: number
): LeadershipIncentiveTier | null {
  if (achievementPct < minThresholdPct || !tiers || tiers.length === 0) {
    return null;
  }

  // Sort tiers by min_pct ascending
  const sortedTiers = [...tiers].sort((a, b) => a.min_pct - b.min_pct);

  // Exact bracket match
  for (const tier of sortedTiers) {
    const min = tier.min_pct;
    const max =
      tier.max_pct !== null && tier.max_pct !== undefined ? Number(tier.max_pct) : Infinity;
    if (achievementPct >= min && achievementPct <= max) {
      return tier;
    }
  }

  // If achievement exceeds the highest tier
  const highestTier = sortedTiers[sortedTiers.length - 1];
  if (achievementPct >= highestTier.min_pct) {
    return highestTier;
  }

  return null;
}

/**
 * Resolve effective agents for a leader:
 * - If Team Leader: directly assigned agents.
 * - If Manager: directly assigned agents PLUS all agents under subordinate Team Leaders.
 */
function resolveLeaderTeamAgents(
  leader: LeadershipMember,
  allLeaders: LeadershipMember[]
): { agent_id: number; agent_name: string }[] {
  const directAgents = leader.assigned_agents || [];

  if (leader.member_role === "team_leader") {
    return directAgents.map((a) => ({ agent_id: a.agent_id, agent_name: a.agent_name }));
  }

  // For manager: direct agents + subordinate TL agents
  const subordinateTLs = allLeaders.filter(
    (l) => l.member_role === "team_leader" && l.parent_manager_id === leader.id
  );

  const agentMap = new Map<number, string>();
  directAgents.forEach((a) => agentMap.set(a.agent_id, a.agent_name));

  subordinateTLs.forEach((tl) => {
    (tl.assigned_agents || []).forEach((a) => {
      if (!agentMap.has(a.agent_id)) {
        agentMap.set(a.agent_id, a.agent_name);
      }
    });
  });

  return Array.from(agentMap.entries()).map(([agent_id, agent_name]) => ({
    agent_id,
    agent_name,
  }));
}

/**
 * Calculate Daily Leadership Incentives for all active leaders on a specific date
 */
export async function calculateDailyLeadershipIncentives(
  dateStr: string
): Promise<LeadershipDailyCalculation[]> {
  const leaders = await getLeadershipMembers({ includeInactive: false });
  if (leaders.length === 0) return [];

  const tlPlan = await getActiveLeadershipPlan("team_leader", "daily");
  const managerPlan = await getActiveLeadershipPlan("manager", "daily");

  // Fetch daily preview items from CRM or local calculation
  const previewRes = await fetchIncentivePreview(dateStr).catch(() => null);
  const previewAgents = previewRes?.success && previewRes.data?.agents ? previewRes.data.agents : [];

  const previewMap = new Map<number, (typeof previewAgents)[0]>();
  previewAgents.forEach((a) => previewMap.set(Number(a.agent_id), a));

  // Fallback / complement from agent_daily_snapshots
  const snapshotRows = await query<any>(
    `SELECT crm_agent_id, agent_name_snapshot, target_points, achieved_points, qualified_leads, disqualified_leads
     FROM agent_daily_snapshots
     WHERE work_date = ?`,
    [dateStr]
  ).catch(() => []);

  const snapshotMap = new Map<number, any>();
  (snapshotRows || []).forEach((row) => {
    snapshotMap.set(Number(row.crm_agent_id), row);
  });

  const calculations: LeadershipDailyCalculation[] = [];

  for (const leader of leaders) {
    const isManager = leader.member_role === "manager";
    const plan = isManager ? managerPlan : tlPlan;
    const teamAgents = resolveLeaderTeamAgents(leader, leaders);

    let teamTargetPoints = 0;
    let teamAchievedPoints = 0;
    let teamPresentCount = 0;

    const teamMemberDetails: TeamMemberDailyContribution[] = teamAgents.map((member) => {
      const pItem = previewMap.get(member.agent_id);
      const sItem = snapshotMap.get(member.agent_id);

      const targetPoints = pItem?.target_points ?? (sItem?.target_points ? Number(sItem.target_points) : 50);
      const achievedPoints = pItem?.achieved_points ?? (sItem?.achieved_points ? Number(sItem.achieved_points) : 0);
      const isPresent = pItem ? Boolean(pItem.is_present) : (sItem ? true : false);
      const attendanceStatus = pItem?.attendance_status || (isPresent ? "Present" : "Absent");
      const completionPct = targetPoints > 0 ? Math.round((achievedPoints / targetPoints) * 1000) / 10 : 0;

      if (isPresent) {
        teamPresentCount += 1;
      }
      teamTargetPoints += targetPoints;
      teamAchievedPoints += achievedPoints;

      return {
        agent_id: member.agent_id,
        agent_name: member.agent_name,
        target_points: targetPoints,
        achieved_points: achievedPoints,
        completion_pct: completionPct,
        is_present: isPresent,
        attendance_status: attendanceStatus,
        qualified_leads: pItem?.qualified_leads_count ?? Number(sItem?.qualified_leads || 0),
        disqualified_leads: pItem?.disqualified_leads_count ?? Number(sItem?.disqualified_leads || 0),
      };
    });

    const teamAchievementPct =
      teamTargetPoints > 0
        ? Math.round((teamAchievedPoints / teamTargetPoints) * 1000) / 10
        : 0;

    const minThreshold = plan?.min_threshold_pct ?? 100.0;
    const isEligible = teamAchievementPct >= minThreshold && teamAgents.length > 0;
    const unlockedTier = isEligible && plan ? matchLeadershipTier(teamAchievementPct, plan.tiers, minThreshold) : null;
    const incentiveAmount = unlockedTier ? unlockedTier.amount : 0;

    calculations.push({
      leader_id: leader.id,
      leader_name: leader.member_name,
      role: leader.member_role,
      parent_manager_id: leader.parent_manager_id,
      parent_manager_name: leader.parent_manager_name,
      work_date: dateStr,
      team_size: teamAgents.length,
      team_present_count: teamPresentCount,
      team_target_points: teamTargetPoints,
      team_achieved_points: teamAchievedPoints,
      team_achievement_pct: teamAchievementPct,
      min_threshold_pct: minThreshold,
      is_eligible: isEligible,
      unlocked_tier: unlockedTier,
      incentive_amount: incentiveAmount,
      plan_id: plan?.id || 0,
      plan_name: plan?.plan_name || (isManager ? "Manager Daily Plan" : "Team Leader Daily Plan"),
      team_members: teamMemberDetails,
    });
  }

  return calculations;
}

/**
 * Calculate Monthly Leadership Incentives for all active leaders for a given month & year
 */
export async function calculateMonthlyLeadershipIncentives(
  month: number,
  year: number
): Promise<LeadershipMonthlyCalculation[]> {
  const leaders = await getLeadershipMembers({ includeInactive: false });
  if (leaders.length === 0) return [];

  const tlPlan = await getActiveLeadershipPlan("team_leader", "monthly");
  const managerPlan = await getActiveLeadershipPlan("manager", "monthly");

  // Fetch agent targets for the given month
  const agentTargets = await getEmployeeTargetAssignments({
    role: "Agent",
    month,
    year,
    status: "active",
  }).catch(() => []);

  const targetMap = new Map<number, (typeof agentTargets)[0]>();
  agentTargets.forEach((t) => targetMap.set(t.employee_id, t));

  // Query actual aggregated monthly points from agent_daily_snapshots
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const endOfMonth = `${year}-${String(month).padStart(2, "0")}-31`;

  const actualsRows = await query<any>(
    `SELECT crm_agent_id, 
            SUM(achieved_points) as total_achieved_points,
            COUNT(DISTINCT work_date) as days_present
     FROM agent_daily_snapshots
     WHERE work_date >= ? AND work_date <= ?
     GROUP BY crm_agent_id`,
    [startOfMonth, endOfMonth]
  ).catch(() => []);

  const actualsMap = new Map<number, { points: number; days: number }>();
  (actualsRows || []).forEach((row) => {
    actualsMap.set(Number(row.crm_agent_id), {
      points: Number(row.total_achieved_points) || 0,
      days: Number(row.days_present) || 0,
    });
  });

  const calculations: LeadershipMonthlyCalculation[] = [];

  for (const leader of leaders) {
    const isManager = leader.member_role === "manager";
    const plan = isManager ? managerPlan : tlPlan;
    const teamAgents = resolveLeaderTeamAgents(leader, leaders);

    let teamTargetPoints = 0;
    let teamAchievedPoints = 0;

    const teamMemberDetails: TeamMemberMonthlyContribution[] = teamAgents.map((member) => {
      const target = targetMap.get(member.agent_id);
      const actualData = actualsMap.get(member.agent_id) || { points: 0, days: 0 };

      const defaultDaily = 50;
      const defaultWorkingDays = 22;
      const effectiveTarget = target
        ? target.effective_monthly_target
        : defaultDaily * defaultWorkingDays;

      const actualPoints = actualData.points;
      const achievementPct =
        effectiveTarget > 0 ? Math.round((actualPoints / effectiveTarget) * 1000) / 10 : 0;

      teamTargetPoints += effectiveTarget;
      teamAchievedPoints += actualPoints;

      return {
        agent_id: member.agent_id,
        agent_name: member.agent_name,
        assigned_monthly_target: effectiveTarget,
        achieved_monthly_points: actualPoints,
        achievement_pct: achievementPct,
        working_days_present: actualData.days,
        working_days_assigned: target ? target.working_days : defaultWorkingDays,
      };
    });

    const teamAchievementPct =
      teamTargetPoints > 0
        ? Math.round((teamAchievedPoints / teamTargetPoints) * 1000) / 10
        : 0;

    const minThreshold = plan?.min_threshold_pct ?? 100.0;
    const isEligible = teamAchievementPct >= minThreshold && teamAgents.length > 0;
    const unlockedTier = isEligible && plan ? matchLeadershipTier(teamAchievementPct, plan.tiers, minThreshold) : null;
    const incentiveAmount = unlockedTier ? unlockedTier.amount : 0;

    calculations.push({
      leader_id: leader.id,
      leader_name: leader.member_name,
      role: leader.member_role,
      parent_manager_id: leader.parent_manager_id,
      parent_manager_name: leader.parent_manager_name,
      month,
      year,
      team_size: teamAgents.length,
      team_target_points: teamTargetPoints,
      team_achieved_points: teamAchievedPoints,
      team_achievement_pct: teamAchievementPct,
      min_threshold_pct: minThreshold,
      is_eligible: isEligible,
      unlocked_tier: unlockedTier,
      incentive_amount: incentiveAmount,
      plan_id: plan?.id || 0,
      plan_name: plan?.plan_name || (isManager ? "Manager Monthly Plan" : "Team Leader Monthly Plan"),
      team_members: teamMemberDetails,
    });
  }

  return calculations;
}

