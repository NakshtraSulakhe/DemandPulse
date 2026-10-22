"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CrmApiResponse,
  IncentiveHistoryData,
  PayrollReconciliationData,
  PayoutStatusDetails,
  BeneficiaryData,
} from "@/lib/incentives/types";

export interface HistoryFilter {
  from: string;
  to: string;
  agent_id?: number;
  approval_status?: string;
  payment_status?: string;
  page?: number;
  limit?: number | string;
}

export function useIncentiveHistory(filter: HistoryFilter) {
  return useQuery<CrmApiResponse<IncentiveHistoryData>>({
    queryKey: ["incentives", "history", filter.from, filter.to, filter.agent_id, filter.approval_status, filter.payment_status, filter.page, filter.limit],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("from", filter.from);
      sp.set("to", filter.to);
      if (filter.agent_id) sp.set("agent_id", String(filter.agent_id));
      if (filter.approval_status) sp.set("approval_status", filter.approval_status);
      if (filter.payment_status) sp.set("payment_status", filter.payment_status);
      if (filter.page) sp.set("page", String(filter.page));
      if (filter.limit) sp.set("limit", String(filter.limit));

      const res = await fetch(`/api/incentives/history?${sp.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load incentive history (HTTP ${res.status})`);
      }
      return res.json();
    },
    staleTime: 30000,
  });
}

export function usePayoutStatus(payoutId?: number | null) {
  return useQuery<CrmApiResponse<PayoutStatusDetails>>({
    queryKey: ["incentives", "status", payoutId],
    queryFn: async () => {
      if (!payoutId) throw new Error("Payout ID required");
      const res = await fetch(`/api/incentives/status?payout_id=${payoutId}`);
      if (!res.ok) {
        throw new Error(`Failed to load payout status (HTTP ${res.status})`);
      }
      return res.json();
    },
    enabled: !!payoutId && payoutId > 0,
    staleTime: 5000,
  });
}

export function useBeneficiary(agentId?: number | null) {
  return useQuery<CrmApiResponse<BeneficiaryData>>({
    queryKey: ["incentives", "beneficiary", agentId],
    queryFn: async () => {
      if (!agentId) throw new Error("Agent ID required");
      const res = await fetch(`/api/incentives/beneficiaries?agent_id=${agentId}`);
      if (!res.ok) {
        throw new Error(`Failed to load beneficiary (HTTP ${res.status})`);
      }
      return res.json();
    },
    enabled: !!agentId && agentId > 0,
    staleTime: 15000,
  });
}

export function usePayrollReport(month: string) {
  return useQuery<CrmApiResponse<PayrollReconciliationData>>({
    queryKey: ["incentives", "report", month],
    queryFn: async () => {
      const res = await fetch(`/api/incentives/report?month=${encodeURIComponent(month)}&export=json`);
      if (!res.ok) {
        throw new Error(`Failed to load payroll report (HTTP ${res.status})`);
      }
      return res.json();
    },
    staleTime: 30000,
  });
}
