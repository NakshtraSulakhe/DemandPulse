import { z } from "zod";

// Slide 1 Schema
export const KpiCardsSchema = z.object({
  total_agents: z.number().default(0),
  present_today: z.number().default(0),
  absent_today: z.number().default(0),
  late_today: z.number().default(0),
});

export const CampaignSlide1Schema = z.object({
  campaign_id: z.number(),
  campaign_name: z.string(),
  campaign_code: z.string(),
  client_code: z.string().optional().nullable(),
  campaign_type: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  campaign_description: z.string().optional().nullable(),
  monthly_allocation: z.number().default(0),
  daily_target: z.number().default(0),
  generated_leads: z.number().default(0),
  qualified_leads: z.number().default(0),
  disqualified_leads: z.number().default(0),
  pending_qa: z.number().default(0),
  remaining_leads_to_qualify: z.number().default(0),
  completion_percentage: z.number().default(0),
  campaign_status: z.string().optional().nullable(),
  active: z.union([z.number(), z.boolean()]).optional().nullable(),
}).passthrough();

export const LateComerSchema = z.object({
  user_id: z.number(),
  full_name: z.string(),
  role: z.string().default("agent"),
  punch_in: z.string().default(""),
  shift_start_time: z.string().default(""),
  grace_minutes: z.number().default(0),
  late_minutes: z.number().default(0),
  status: z.string().default("Present"),
});

export const Slide1ResponseSchema = z.object({
  ok: z.boolean().default(true),
  sliders: z.any().optional(),
  slide1: z.object({
    kpi_cards: KpiCardsSchema,
    campaigns: z.array(CampaignSlide1Schema),
    late_comers: z.array(LateComerSchema),
    sliders: z.any().optional(),
    query_date: z.string().optional(),
  }).passthrough(),
}).passthrough();

// Slide 2 Schema
export const AgentSlide2Schema = z.object({
  agent_id: z.number(),
  agent_name: z.string(),
  role: z.string().default("agent"),
  profile_pic: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  daily_target_points: z.number().default(0),
  working_days: z.number().default(22),
  monthly_target_points: z.number().default(0),
  generated_leads: z.number().default(0),
  qualified_leads: z.number().default(0),
  disqualified_leads: z.number().default(0),
  pending_qa: z.number().default(0),
  achieved_points: z.number().default(0),
  remaining_points: z.number().default(0),
  completion_percentage: z.number().default(0),
  is_target_met: z.boolean().default(false),
  attendance_status: z.string().optional(),
  is_present: z.boolean().optional(),
});

export const CampaignPointBreakdownItemSchema = z.object({
  campaign_id: z.number(),
  campaign_name: z.string(),
  campaign_code: z.string().optional().nullable(),
  campaign_type: z.string().default("General"),
  daily_target: z.number().default(0),
  point_factor: z.number().default(1),
  target_points: z.number().default(0),
});

export const CampaignTargetPointsSummarySchema = z.object({
  total_target_points: z.number().default(0),
  total_campaigns: z.number().default(0),
  campaigns: z.array(CampaignPointBreakdownItemSchema).default([]),
});

export const FloorCapacitySummarySchema = z.object({
  total_capacity_points: z.number().default(0),
  total_agents: z.number().default(0),
  present_agents_count: z.number().default(0),
  absent_agents_count: z.number().default(0),
  capacity_gap: z.number().default(0),
  capacity_gap_label: z.string().default(""),
  capacity_gap_status: z.enum(["shortfall", "surplus", "balanced"]).default("balanced"),
});

export const Slide2ResponseSchema = z.object({
  ok: z.boolean().default(true),
  sliders: z.any().optional(),
  slide2: z.object({
    total_agents: z.number().default(0),
    page: z.number().default(1),
    limit: z.union([z.number(), z.string()]).default(10),
    total_pages: z.number().default(1),
    agents: z.array(AgentSlide2Schema),
    sliders: z.any().optional(),
    campaign_target_points: CampaignTargetPointsSummarySchema.optional(),
    floor_capacity: FloorCapacitySummarySchema.optional(),
    query_date: z.string().optional(),
  }).passthrough(),
}).passthrough();

// Slide 3 Schema
export const QaHeatmapIntervalSchema = z.object({
  slot_index: z.number(),
  time_label: z.string(),
  qualified_count: z.number().default(0),
  audited_count: z.number().default(0),
});

export const QaHeatmapAnalystSchema = z.object({
  user_id: z.number(),
  full_name: z.string(),
  total_qualified: z.number().default(0),
  total_audited: z.number().default(0),
  intervals: z.array(QaHeatmapIntervalSchema),
});

export const Slide3ResponseSchema = z.object({
  ok: z.boolean().default(true),
  sliders: z.any().optional(),
  slide3: z.object({
    date: z.string(),
    shift_start: z.string().default("17:30:00"),
    shift_end: z.string().default("02:30:00"),
    interval_minutes: z.number().default(10),
    total_intervals: z.number().default(54),
    total_qa_analysts: z.number().default(0),
    qa_heatmap: z.array(QaHeatmapAnalystSchema),
    sliders: z.any().optional(),
    query_date: z.string().optional(),
  }).passthrough(),
}).passthrough();

// Slide 4 Schema
export const AgentHeatmapIntervalSchema = z.object({
  slot_index: z.number(),
  time_label: z.string(),
  generated_count: z.number().default(0),
});

export const AgentHeatmapItemSchema = z.object({
  agent_id: z.number(),
  agent_name: z.string(),
  total_generated: z.number().default(0),
  intervals: z.array(AgentHeatmapIntervalSchema),
});

export const Slide4ResponseSchema = z.object({
  ok: z.boolean().default(true),
  sliders: z.any().optional(),
  slide4: z.object({
    date: z.string(),
    interval_minutes: z.number().optional(),
    shift_start: z.string().optional(),
    shift_end: z.string().optional(),
    total_intervals: z.number().default(54),
    total_agents: z.number().default(0),
    agent_heatmap: z.array(AgentHeatmapItemSchema),
    sliders: z.any().optional(),
    query_date: z.string().optional(),
  }).passthrough(),
}).passthrough();

// Slide 5 Schema
export const Slide5SummarySchema = z.object({
  total_leads_generated: z.number().default(0),
  total_leads_audited: z.number().default(0),
  total_leads_qualified: z.number().default(0),
  total_leads_disqualified: z.number().default(0),
  pending_audit_gap: z.number().default(0),
  audit_turnaround_rate: z.number().default(0),
  qualification_approval_rate: z.number().default(0),
});

export const Slide5ComparisonSlotSchema = z.object({
  slot_index: z.number(),
  time_label: z.string(),
  leads_generated: z.number().default(0),
  leads_audited: z.number().default(0),
  leads_qualified: z.number().default(0),
  leads_disqualified: z.number().default(0),
  pending_backlog_delta: z.number().default(0),
  cumulative_generated: z.number().default(0),
  cumulative_audited: z.number().default(0),
  cumulative_qualified: z.number().default(0),
});

export const Slide5ResponseSchema = z.object({
  ok: z.boolean().default(true),
  sliders: z.any().optional(),
  slide5: z.object({
    summary: Slide5SummarySchema,
    comparison_timeline: z.array(Slide5ComparisonSlotSchema),
    sliders: z.any().optional(),
    query_date: z.string().optional(),
  }).passthrough(),
}).passthrough();

// Admin Campaign Daily Targets Schema
export const AdminCampaignTargetItemSchema = z.object({
  campaign_id: z.number(),
  campaign_name: z.string(),
  campaign_code: z.string(),
  client_code: z.string().optional().nullable(),
  campaign_type: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  campaign_description: z.string().optional().nullable(),
  monthly_allocation: z.number().default(0),
  daily_target: z.number().default(0),
  generated_leads: z.number().default(0),
  qualified_leads: z.number().default(0),
  disqualified_leads: z.number().default(0),
  pending_qa: z.number().default(0),
  remaining_leads_to_qualify: z.number().default(0),
  remaining_leads_to_generate: z.number().default(0),
  completion_percentage: z.number().default(0),
  campaign_status: z.string().optional().nullable(),
  active: z.union([z.number(), z.boolean()]).optional().nullable(),
  notes: z.string().optional().nullable(),
}).passthrough();

export const CampaignDailyTargetsResponseSchema = z.object({
  ok: z.boolean().default(true),
  target_date: z.string(),
  total_campaigns: z.number().default(0),
  campaigns: z.array(AdminCampaignTargetItemSchema),
  client_codes: z.array(z.string()).optional(),
});

export const TargetAllocationInputSchema = z.object({
  campaign_id: z.number().int(),
  daily_target: z.number().int("Daily target must be an integer").min(0, "Daily target cannot be negative"),
  notes: z.string().optional().nullable(),
  campaign_name: z.string().optional().nullable(),
  client_code: z.string().optional().nullable(),
  monthly_allocation: z.number().optional().nullable(),
});

export const SaveDailyTargetsPayloadSchema = z.object({
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Target date must be YYYY-MM-DD"),
  targets: z.array(TargetAllocationInputSchema).min(1, "At least one target is required"),
  user: z.string().optional(),
});

// Live Recognition & Announcements Schema
export const RecognitionTickerItemSchema = z.object({
  id: z.string(),
  type: z.enum(["top_lead_scorer", "birthday", "anniversary", "announcement"]).default("top_lead_scorer"),
  icon: z.string().default("trophy"),
  badge: z.string().default(""),
  eyebrow: z.string().default(""),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  message: z.string().default(""),
  accent: z.enum(["amber", "rose", "cyan", "emerald", "purple"]).default("amber"),
  user_id: z.coerce.number().optional(),
  profile_pic: z.string().optional().nullable(),
  score: z.coerce.number().optional(),
  rank: z.coerce.number().optional(),
  years: z.coerce.number().optional(),
  is_today: z.boolean().optional(),
  completion_percentage: z.coerce.number().optional(),
  incentive_amount: z.coerce.number().optional(),
  base_incentive: z.coerce.number().optional(),
  slab_incentive: z.coerce.number().optional(),
  target_points: z.coerce.number().optional(),
  achieved_points: z.coerce.number().optional(),
  is_target_met: z.boolean().optional(),
  is_settled: z.boolean().optional(),
  is_provisional: z.boolean().optional(),
  payment_status: z.string().optional(),
  eligibility_status: z.string().optional(),
  eligibility_reason: z.string().optional(),
}).passthrough();

export const RecognitionDataSchema = z.object({
  target_date: z.string().optional().default(() => new Date().toISOString().split("T")[0]),
  total_items: z.coerce.number().default(0),
  top_scorers_count: z.coerce.number().default(0),
  birthdays_count: z.coerce.number().default(0),
  anniversaries_count: z.coerce.number().default(0),
  top_scorers: z.array(
    z.object({
      user_id: z.union([z.number(), z.string()]),
      full_name: z.string(),
      role: z.string().optional().nullable(),
      department: z.string().optional().nullable(),
      profile_pic: z.string().optional().nullable(),
      generated_leads: z.union([z.number(), z.string()]).default(0),
      qualified_leads: z.union([z.number(), z.string()]).default(0),
    }).passthrough()
  ).default([]),
  birthdays: z.array(
    z.object({
      user_id: z.union([z.number(), z.string()]),
      full_name: z.string(),
      role: z.string().optional().nullable(),
      department: z.string().optional().nullable(),
      profile_pic: z.string().optional().nullable(),
      date_of_birth: z.string().optional().nullable(),
    }).passthrough()
  ).default([]),
  anniversaries: z.array(
    z.object({
      user_id: z.union([z.number(), z.string()]),
      full_name: z.string(),
      role: z.string().optional().nullable(),
      department: z.string().optional().nullable(),
      profile_pic: z.string().optional().nullable(),
      date_of_joining: z.string().optional().nullable(),
      years_completed: z.union([z.number(), z.string()]).optional().nullable(),
    }).passthrough()
  ).default([]),
  ticker_items: z.array(RecognitionTickerItemSchema).default([]),
}).passthrough();

export const RecognitionResponseSchema = z.object({
  ok: z.boolean().default(true),
  action: z.string().optional(),
  query_date: z.string().optional(),
  generated_at: z.string().optional(),
  sliders: RecognitionDataSchema.optional(),
  recognition: RecognitionDataSchema.optional(),
  data: z.object({
    sliders: RecognitionDataSchema.optional(),
    recognition: RecognitionDataSchema.optional(),
  }).passthrough().optional(),
}).passthrough();

