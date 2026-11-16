/**
 * Operations Leadership Incentive Types (Team Leaders & Managers)
 */

export type LeadershipRole = "team_leader" | "manager";
export type LeadershipFrequency = "daily" | "monthly";

export interface LeadershipMember {
  id: number;
  member_name: string;
  member_role: LeadershipRole;
  crm_user_id: number | null;
  email: string | null;
  phone: string | null;
  parent_manager_id: number | null;
  parent_manager_name?: string | null;
  is_active: boolean;
  notes: string | null;
  assigned_agents?: AssignedAgent[];
  assigned_agents_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AssignedAgent {
  id: number;
  leadership_id: number;
  agent_id: number;
  agent_name: string;
  is_active: boolean;
}

export interface LeadershipIncentiveTier {
  tier_order: number;
  tier_name: string;
  min_pct: number;
  max_pct: number | null; // null represents "+" (no upper limit, e.g. 130%+)
  amount: number; // in INR
}

export interface LeadershipIncentivePlan {
  id: number;
  plan_name: string;
  role_target: LeadershipRole;
  frequency: LeadershipFrequency;
  min_threshold_pct: number; // default 100.00%
  tiers: LeadershipIncentiveTier[];
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMemberDailyContribution {
  agent_id: number;
  agent_name: string;
  target_points: number;
  achieved_points: number;
  completion_pct: number;
  is_present: boolean;
  attendance_status: string;
  qualified_leads: number;
  disqualified_leads: number;
}

export interface LeadershipDailyCalculation {
  leader_id: number;
  leader_name: string;
  role: LeadershipRole;
  parent_manager_id: number | null;
  parent_manager_name?: string | null;
  work_date: string;
  team_size: number;
  team_present_count: number;
  team_target_points: number;
  team_achieved_points: number;
  team_achievement_pct: number;
  min_threshold_pct: number;
  is_eligible: boolean;
  unlocked_tier: LeadershipIncentiveTier | null;
  incentive_amount: number;
  plan_id: number;
  plan_name: string;
  team_members: TeamMemberDailyContribution[];
}

export interface TeamMemberMonthlyContribution {
  agent_id: number;
  agent_name: string;
  assigned_monthly_target: number;
  achieved_monthly_points: number;
  achievement_pct: number;
  working_days_present: number;
  working_days_assigned: number;
}

export interface LeadershipMonthlyCalculation {
  leader_id: number;
  leader_name: string;
  role: LeadershipRole;
  parent_manager_id: number | null;
  parent_manager_name?: string | null;
  month: number;
  year: number;
  team_size: number;
  team_target_points: number;
  team_achieved_points: number;
  team_achievement_pct: number;
  min_threshold_pct: number;
  is_eligible: boolean;
  unlocked_tier: LeadershipIncentiveTier | null;
  incentive_amount: number;
  plan_id: number;
  plan_name: string;
  team_members: TeamMemberMonthlyContribution[];
}

export interface AssignableAgent {
  agent_id: number;
  agent_name: string;
  role?: string;
  is_active: boolean;
  currently_assigned_to?: {
    leader_id: number;
    leader_name: string;
    role: LeadershipRole;
  } | null;
}

