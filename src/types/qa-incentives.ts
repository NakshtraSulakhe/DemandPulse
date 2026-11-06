export type TargetFrequency = "DAILY" | "MONTHLY";

export interface QaIncentiveTier {
  id?: string;
  tier_order: number;
  tier_name: string;
  extra_leads: number; // incremental leads for this tier (e.g. 10)
  rate_per_lead: number; // INR per lead (e.g. 15 or 20)
  cumulative_leads?: number; // total leads at end of this tier (e.g. 60, 70)
  tier_reward?: number; // extra_leads * rate_per_lead (e.g. 150, 200)
  total_cumulative_reward?: number; // base + all prior tiers + this tier (e.g. 650, 850)
}

export interface QaIncentivePlan {
  id: string;
  plan_name: string;
  qa_agent_id: number | null; // null or 0 = "All QA Members"
  qa_agent_name: string; // "All QA Members" or specific member name
  client_code: string; // "ALL" or specific client code (e.g. "CL-FIN")
  campaign_id: number | null; // null or 0 = "All Campaigns"
  campaign_name: string; // "All Campaigns" or specific campaign name
  frequency: TargetFrequency; // "DAILY" | "MONTHLY"
  base_target_leads: number; // e.g. 50 leads audited
  base_incentive_amount: number; // e.g. ₹500
  tiers: QaIncentiveTier[];
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QaMemberMeta {
  user_id: number;
  full_name: string;
  role: string;
  avatar?: string | null;
}

export interface ClientMeta {
  client_code: string;
  client_name: string;
  campaign_count: number;
}

export interface CampaignMeta {
  campaign_id: number;
  campaign_name: string;
  campaign_code?: string;
  client_code: string;
}

export interface QaIncentiveMetaResponse {
  qa_members: QaMemberMeta[];
  clients: ClientMeta[];
  campaigns: CampaignMeta[];
}

export interface QaTierBreakdownItem {
  tier_order: number;
  tier_name: string;
  extra_leads: number;
  rate_per_lead: number;
  leads_in_tier: number;
  tier_incentive_earned: number;
  tier_range_start: number;
  tier_range_end: number;
}

export interface QaIncentiveCalculationItem {
  qa_agent_id: number;
  qa_agent_name: string;
  email?: string;
  role?: string;
  department?: string;
  job_title?: string;
  client_code: string;
  campaign_name: string;
  frequency: TargetFrequency;
  period_label: string;
  actual_leads_audited: number;
  unique_leads_audited?: number;
  total_audit_actions?: number;
  qualified_leads: number;
  disqualified_leads: number;
  pending_count?: number;
  rework_count?: number;
  qualification_rate_pct?: number;
  disqualification_rate_pct?: number;
  status_breakdown?: Record<string, number>;
  campaigns_breakdown?: Array<{
    campaign_id: number;
    campaign_name: string;
    campaign_code?: string;
    client_code: string;
    total_audited: number;
    qualified: number;
    disqualified: number;
    status_breakdown?: Record<string, number>;
  }>;
  clients_breakdown?: Array<{
    client_code: string;
    client_id?: number;
    client_name?: string;
    total_audited: number;
    qualified: number;
    disqualified: number;
  }>;
  base_target_leads: number;
  base_target_achieved: boolean;
  base_incentive_amount: number;
  base_incentive_earned: number;
  tier_breakdown: QaTierBreakdownItem[];
  total_tier_incentive: number;
  total_incentive: number;
  plan_id: string;
  plan_name: string;
  audited_leads?: QaAuditLead[];
}

export interface QaAuditLead {
  lead_id: number;
  lead_code: string;
  campaign_id: number;
  campaign_name: string;
  campaign_code?: string;
  client_code: string;
  agent_id?: number;
  agent_name?: string;
  qa_status: string;
  prev_status?: string;
  reviewed_at: string;
  qa_comment?: string;
  qa_client_comment?: string;
  client_delivery_status?: string;
}

export interface QaAuditsApiSummary {
  frequency: string;
  date: string;
  total_qa_members: number;
  active_qa_auditors: number;
  total_leads_audited: number;
  total_audit_actions: number;
  total_qualified: number;
  total_disqualified: number;
  overall_qualification_rate_pct: number;
  overall_disqualification_rate_pct: number;
  status_totals: Record<string, number>;
  top_performer?: {
    user_id: number;
    qa_name: string;
    total_audited: number;
    qualified: number;
    disqualified: number;
    qualification_rate_pct: number;
  };
}

export interface QaAnalystAuditData {
  user_id: number;
  qa_id: number;
  qa_name: string;
  full_name: string;
  email?: string;
  role?: string;
  department?: string;
  job_title?: string;
  avatar?: string | null;
  is_active?: boolean;
  total_audited: number;
  unique_leads_audited?: number;
  total_audit_actions?: number;
  qualified_count: number;
  qualified?: number;
  disqualified_count: number;
  disqualified?: number;
  pending_count?: number;
  rework_count?: number;
  other_count?: number;
  qualification_rate_pct?: number;
  disqualification_rate_pct?: number;
  status_breakdown?: Record<string, number>;
  campaigns_breakdown?: any[];
  clients_breakdown?: any[];
  incentive_calculation?: any;
  audited_leads?: QaAuditLead[];
}

export interface QaAuditsApiResponse {
  ok: boolean;
  action: string;
  frequency: string;
  date: string;
  date_from?: string;
  date_to?: string;
  summary: QaAuditsApiSummary;
  total_qa_analysts: number;
  qa_analysts: QaAnalystAuditData[];
  plans?: any[];
}

