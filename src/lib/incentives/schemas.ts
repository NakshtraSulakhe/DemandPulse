import { z } from "zod";

export const EligibilityStatusSchema = z.enum(["eligible", "ineligible"]);
export const ApprovalStatusSchema = z.enum(["pending_approval", "approved", "rejected"]);
export const PaymentStatusSchema = z.enum(["unpaid", "processing", "paid", "failed"]);
export const PaymentMethodSchema = z.enum(["bank_transfer", "upi"]);
export const SettlementModeSchema = z.enum(["dry_run", "finalize", "recalculate_unpaid"]);

export const PreviewAgentItemSchema = z.object({
  agent_id: z.number(),
  agent_name: z.string(),
  role: z.string(),
  work_date: z.string(),
  target_points: z.number(),
  achieved_points: z.number(),
  completion_pct: z.number(),
  points_breakdown: z.record(z.any()).optional().default({}),
  qualified_leads_count: z.number(),
  disqualified_leads_count: z.number(),
  total_scored_leads: z.number(),
  base_incentive: z.number(),
  slab_incentive: z.number(),
  total_incentive: z.number(),
  attendance_status: z.string(),
  is_present: z.boolean(),
  has_escalation: z.boolean(),
  eligibility_status: EligibilityStatusSchema,
  eligibility_reason: z.string(),
}).passthrough();

export const IncentivePreviewDataSchema = z.object({
  work_date: z.string(),
  total_agents: z.number(),
  eligible_agents: z.number(),
  total_incentive: z.number(),
  agents: z.array(PreviewAgentItemSchema),
}).passthrough();

export const SettlementSummarySchema = z.object({
  total_agents: z.number().default(0),
  eligible_agents: z.number().default(0),
  total_incentive: z.number().default(0),
  pending_approval_amount: z.number().default(0),
  approved_unpaid_amount: z.number().default(0),
  paid_amount: z.number().default(0),
}).passthrough();

export const SettledAgentItemSchema = z.object({
  payout_id: z.number(),
  agent_id: z.number(),
  agent_name: z.string(),
  employee_id: z.string().optional().default(""),
  department: z.string().optional().default(""),
  work_date: z.string(),
  target_points: z.number(),
  achieved_points: z.number(),
  completion_pct: z.number(),
  qualified_leads_count: z.number(),
  disqualified_leads_count: z.number(),
  base_incentive: z.number(),
  slab_incentive: z.number(),
  total_incentive: z.number(),
  eligibility_status: EligibilityStatusSchema,
  eligibility_reason: z.string(),
  approval_status: ApprovalStatusSchema,
  approved_by: z.number().nullable().optional(),
  approved_by_name: z.string().optional().default(""),
  approved_at: z.string().nullable().optional(),
  payment_status: PaymentStatusSchema,
  payment_method: PaymentMethodSchema,
  payment_reference: z.string().optional().default(""),
  failure_reason: z.string().optional().default(""),
  beneficiary: z.object({
    masked_account: z.string().nullable().optional(),
    masked_upi: z.string().nullable().optional(),
    method: z.string().optional(),
  }).nullable().optional(),
  created_at: z.string().optional().default(""),
  updated_at: z.string().optional().default(""),
}).passthrough();

export const DailySettledDataSchema = z.object({
  work_date: z.string(),
  summary: SettlementSummarySchema,
  agents: z.array(SettledAgentItemSchema),
}).passthrough();

export const SettlePayloadSchema = z.object({
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD."),
  mode: SettlementModeSchema.default("dry_run"),
  manager_override: z.boolean().optional(),
  override_reason: z.string().optional(),
});

export const ApprovePayloadSchema = z.object({
  payout_ids: z.array(z.number().positive()).min(1, "At least one payout ID must be selected"),
  action: z.enum(["approve", "reject"]),
  remarks: z.string().optional().default(""),
});

export const DisbursePayloadSchema = z.object({
  payout_id: z.number().positive("Payout ID is required"),
  payment_method: PaymentMethodSchema.optional(),
});

export const SaveBeneficiaryPayloadSchema = z.object({
  agent_id: z.number().positive("Valid agent_id is required"),
  payment_method: PaymentMethodSchema,
  account_holder_name: z.string().optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc_code: z.string().optional(),
  upi_id: z.string().optional(),
});
