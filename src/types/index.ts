// Core API & Analytics Data Types for DemandFlow Live Analytics

export interface KpiCardsData {
  total_agents: number;
  present_today: number;
  absent_today: number;
  late_today: number;
}

export interface CampaignSlide1 {
  campaign_id: number;
  campaign_name: string;
  campaign_code: string;
  client_code?: string | null;
  campaign_type?: string | null;
  description?: string | null;
  campaign_description?: string | null;
  monthly_allocation: number;
  daily_target: number;
  generated_leads: number;
  qualified_leads: number;
  disqualified_leads: number;
  pending_qa: number;
  remaining_leads_to_qualify: number;
  completion_percentage: number;
  campaign_status?: string | null;
  active?: number | boolean | null;
}

export interface LateComer {
  user_id: number;
  full_name: string;
  role: string;
  punch_in: string;
  shift_start_time: string;
  grace_minutes: number;
  late_minutes: number;
  status: string;
}

export interface Slide1Data {
  kpi_cards: KpiCardsData;
  campaigns: CampaignSlide1[];
  late_comers: LateComer[];
  sliders?: RecognitionData;
}

export interface AgentSlide2 {
  agent_id: number;
  agent_name: string;
  role: string;
  daily_target_points: number;
  working_days: number;
  monthly_target_points: number;
  generated_leads: number;
  qualified_leads: number;
  disqualified_leads: number;
  pending_qa: number;
  achieved_points: number;
  remaining_points: number;
  completion_percentage: number;
  is_target_met: boolean;
}

export interface Slide2Data {
  total_agents: number;
  page: number;
  limit: number | string;
  total_pages: number;
  agents: AgentSlide2[];
  sliders?: RecognitionData;
}

export interface QaHeatmapInterval {
  slot_index: number;
  time_label: string;
  qualified_count: number;
  audited_count: number;
}

export interface QaHeatmapAnalyst {
  user_id: number;
  full_name: string;
  total_qualified: number;
  total_audited: number;
  intervals: QaHeatmapInterval[];
}

export interface Slide3Data {
  date: string;
  shift_start: string;
  shift_end: string;
  interval_minutes: number;
  total_intervals: number;
  total_qa_analysts: number;
  qa_heatmap: QaHeatmapAnalyst[];
  sliders?: RecognitionData;
  today_audited?: number;
  today_qualified?: number;
  today_disqualified?: number;
  today_pending_qa?: number;
}

export interface AgentHeatmapInterval {
  slot_index: number;
  time_label: string;
  generated_count: number;
}

export interface AgentHeatmapItem {
  agent_id: number;
  agent_name: string;
  total_generated: number;
  intervals: AgentHeatmapInterval[];
}

export interface Slide4Data {
  date: string;
  interval_minutes?: number;
  shift_start?: string;
  shift_end?: string;
  total_intervals: number;
  total_agents: number;
  agent_heatmap: AgentHeatmapItem[];
  sliders?: RecognitionData;
}

export interface Slide5Summary {
  total_leads_generated: number;
  total_leads_audited: number;
  total_leads_qualified: number;
  total_leads_disqualified: number;
  pending_audit_gap: number;
  audit_turnaround_rate: number;
  qualification_approval_rate: number;
}

export interface Slide5ComparisonSlot {
  slot_index: number;
  time_label: string;
  leads_generated: number;
  leads_audited: number;
  leads_qualified: number;
  leads_disqualified: number;
  pending_backlog_delta: number;
  cumulative_generated: number;
  cumulative_audited: number;
  cumulative_qualified: number;
}

export interface Slide5Data {
  summary: Slide5Summary;
  comparison_timeline: Slide5ComparisonSlot[];
  sliders?: RecognitionData;
}

export interface AllSlidesData {
  slide1: Slide1Data;
  slide2: Slide2Data;
  slide3: Slide3Data;
  slide4: Slide4Data;
  slide5: Slide5Data;
  sliders?: RecognitionData;
}

// Campaign Daily Targets Admin Types
export interface AdminCampaignTargetItem {
  campaign_id: number;
  campaign_name: string;
  campaign_code: string;
  client_code?: string | null;
  campaign_type?: string | null;
  description?: string | null;
  campaign_description?: string | null;
  monthly_allocation: number;
  daily_target: number;
  generated_leads: number;
  qualified_leads: number;
  disqualified_leads: number;
  pending_qa: number;
  remaining_leads_to_qualify: number;
  remaining_leads_to_generate: number;
  completion_percentage: number;
  campaign_status?: string | null;
  active?: number | boolean | null;
  start_date?: string | null;
  end_date?: string | null;
  pacing_type?: string | null;
  pacing_count?: number;
  notes?: string | null;
}

export interface CampaignDailyTargetsResponse {
  ok: boolean;
  target_date: string;
  total_campaigns: number;
  campaigns: AdminCampaignTargetItem[];
}

export interface TargetAllocationInput {
  campaign_id: number;
  daily_target: number;
  notes?: string | null;
}

export interface SaveDailyTargetsPayload {
  target_date: string;
  targets: TargetAllocationInput[];
}

export interface PresentationSettings {
  autoRotate: boolean;
  slideIntervalSeconds: number; // e.g. 15, 20, 30
  activeSlide: number; // 1 to 5
  enabledSlides: number[]; // e.g. [1, 2, 3, 4, 5]
  theme: "dark" | "light";
  fitToScreen: boolean;
}

// Live Recognition & Announcements Scroller Types
export interface RecognitionTickerItem {
  id: string;
  type: "top_lead_scorer" | "birthday" | "anniversary" | "announcement";
  icon: string;
  badge: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  message: string;
  accent: "amber" | "rose" | "cyan" | "emerald" | "purple";
  user_id?: number;
  profile_pic?: string | null;
  score?: number;
  rank?: number;
  years?: number;
  is_today?: boolean;
  completion_percentage?: number;
  incentive_amount?: number;
  base_incentive?: number;
  slab_incentive?: number;
}

export interface RecognitionData {
  target_date: string;
  total_items: number;
  top_scorers_count: number;
  birthdays_count: number;
  anniversaries_count: number;
  top_scorers: Array<{
    user_id: number | string;
    full_name: string;
    role?: string | null;
    department?: string | null;
    profile_pic?: string | null;
    generated_leads: number | string;
    qualified_leads: number | string;
  }>;
  birthdays: Array<{
    user_id: number | string;
    full_name: string;
    role?: string | null;
    department?: string | null;
    profile_pic?: string | null;
    date_of_birth?: string | null;
  }>;
  anniversaries: Array<{
    user_id: number | string;
    full_name: string;
    role?: string | null;
    department?: string | null;
    profile_pic?: string | null;
    date_of_joining?: string | null;
    years_completed?: number | string | null;
  }>;
  ticker_items: RecognitionTickerItem[];
}

