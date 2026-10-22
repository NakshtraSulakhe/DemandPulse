/**
 * DemandFlow Bridge CRM — Daily Agent Incentive Types
 * Strictly aligned with /api/v1/incentives/* endpoints
 */

export type EligibilityStatus = "eligible" | "ineligible";
export type ApprovalStatus = "pending_approval" | "approved" | "rejected";
export type PaymentStatus = "unpaid" | "processing" | "paid" | "failed";
export type PaymentMethod = "bank_transfer" | "upi";
export type SettlementMode = "dry_run" | "finalize" | "recalculate_unpaid";

export interface IncentivePointsBreakdown {
  [key: string]: {
    count?: number;
    points?: number;
  } | number | undefined;
}

export interface PreviewAgentItem {
  agent_id: number;
  agent_name: string;
  role: string;
  work_date: string;
  target_points: number;
  achieved_points: number;
  completion_pct: number;
  points_breakdown: IncentivePointsBreakdown;
  qualified_leads_count: number;
  disqualified_leads_count: number;
  total_scored_leads: number;
  base_incentive: number;
  slab_incentive: number;
  total_incentive: number;
  attendance_status: string;
  is_present: boolean;
  has_escalation: boolean;
  eligibility_status: EligibilityStatus;
  eligibility_reason: string;
}

export interface IncentivePreviewData {
  work_date: string;
  total_agents: number;
  eligible_agents: number;
  total_incentive: number;
  agents: PreviewAgentItem[];
}

export interface SettlementSummary {
  total_agents: number;
  eligible_agents: number;
  total_incentive: number;
  pending_approval_amount: number;
  approved_unpaid_amount: number;
  paid_amount: number;
}

export interface SettledAgentItem {
  payout_id: number;
  agent_id: number;
  agent_name: string;
  employee_id: string;
  department: string;
  work_date: string;
  target_points: number;
  achieved_points: number;
  completion_pct: number;
  qualified_leads_count: number;
  disqualified_leads_count: number;
  base_incentive: number;
  slab_incentive: number;
  total_incentive: number;
  eligibility_status: EligibilityStatus;
  eligibility_reason: string;
  approval_status: ApprovalStatus;
  approved_by: number | null;
  approved_by_name: string;
  approved_at: string | null;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  payment_reference: string;
  failure_reason: string;
  beneficiary: {
    masked_account?: string | null;
    masked_upi?: string | null;
    method?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface DailySettledData {
  work_date: string;
  summary: SettlementSummary;
  agents: SettledAgentItem[];
}

export interface SettleResponseData {
  work_date: string;
  mode: SettlementMode;
  total_agents_processed: number;
  eligible_agents_count: number;
  total_incentive_amount: number;
  records?: SettledAgentItem[] | PreviewAgentItem[];
  agents?: PreviewAgentItem[] | SettledAgentItem[];
  inserted_count?: number;
  updated_count?: number;
  skipped_count?: number;
}

export interface ApprovalActionPayload {
  payout_ids: number[];
  action: "approve" | "reject";
  remarks?: string;
}

export interface ApprovalActionResult {
  action: "approve" | "reject";
  processed_count: number;
  successful_payout_ids: number[];
  failed_payout_ids?: number[];
  remarks?: string;
}

export interface DisbursePayload {
  payout_id: number;
  payment_method?: PaymentMethod;
}

export interface DisburseResult {
  payout_id: number;
  payment_status: PaymentStatus;
  provider: string;
  provider_reference?: string;
  amount: number;
  beneficiary?: string;
  payment_method: PaymentMethod;
  initiated_at: string;
  completed_at?: string | null;
  failure_reason?: string | null;
}

export interface BeneficiaryBankDetails {
  name?: string;
  bank_name?: string;
  masked_account?: string;
  ifsc?: string;
  source?: string;
}

export interface BeneficiaryUpiDetails {
  name?: string;
  masked_upi?: string;
  source?: string;
}

export interface BeneficiaryData {
  agent_id: number;
  agent_name?: string;
  bank_transfer: BeneficiaryBankDetails | null;
  upi: BeneficiaryUpiDetails | null;
}

export interface SaveBeneficiaryPayload {
  agent_id: number;
  payment_method: PaymentMethod;
  account_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
}

export interface PayoutApprovalRecord {
  id: number;
  manager_id: number;
  manager_name: string;
  action: "approve" | "reject";
  reason: string;
  created_at: string;
}

export interface PayoutPaymentAttempt {
  attempt_number: number;
  provider: string;
  provider_reference: string;
  status: string;
  amount: number;
  failure_reason: string;
  initiated_at: string;
  completed_at: string | null;
}

export interface PayoutAuditEvent {
  event_type: string;
  source: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface PayoutStatusDetails {
  payout: SettledAgentItem;
  approvals: PayoutApprovalRecord[];
  attempts: PayoutPaymentAttempt[];
  events: PayoutAuditEvent[];
  beneficiary: {
    masked_account?: string;
    masked_upi?: string;
    method?: string;
  } | null;
}

export interface IncentiveHistorySummary {
  total_records: number;
  total_incentive: number;
  paid_total: number;
  approved_unpaid_total: number;
}

export interface IncentiveHistoryData {
  range: {
    from: string;
    to: string;
  };
  summary: IncentiveHistorySummary;
  records: SettledAgentItem[];
}

export interface PayrollReconciliationAgentItem {
  agent_id: number;
  agent_name: string;
  employee_id: string;
  department: string;
  settled_days_count: number;
  paid_days_count: number;
  total_settled_incentives: number;
  daily_disbursed_total: number;
  daily_processing_total: number;
  approved_unpaid_total: number;
  pending_approval_total: number;
  recommended_payroll_deduction: number;
}

export interface PayrollReconciliationSummary {
  total_agents_with_incentives: number;
  total_settled_amount: number;
  total_already_disbursed_daily: number;
  reconciliation_rule: string;
}

export interface PayrollReconciliationData {
  period: string;
  start_date: string;
  end_date: string;
  summary: PayrollReconciliationSummary;
  agents: PayrollReconciliationAgentItem[];
}

export interface CrmApiResponse<T> {
  success: boolean;
  status: number;
  message?: string;
  error?: string;
  error_code?: string;
  timestamp: string;
  data?: T;
  meta?: Record<string, unknown>;
}
