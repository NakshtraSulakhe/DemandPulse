"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CrmApiResponse,
  SettleResponseData,
  ApprovalActionResult,
  DisburseResult,
  BeneficiaryData,
  SettlementMode,
  PaymentMethod,
  SaveBeneficiaryPayload,
} from "@/lib/incentives/types";

export function useIncentiveMutations() {
  const queryClient = useQueryClient();

  // 1. Settle Mutation (dry_run, finalize, recalculate_unpaid)
  const settleMutation = useMutation<
    CrmApiResponse<SettleResponseData>,
    Error,
    { work_date: string; mode: SettlementMode; manager_override?: boolean; override_reason?: string }
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/incentives/settle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Portal": "true",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Settlement failed (HTTP ${res.status})`);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.mode !== "dry_run") {
        queryClient.invalidateQueries({ queryKey: ["incentives", "daily"] });
        queryClient.invalidateQueries({ queryKey: ["incentives", "history"] });
        queryClient.invalidateQueries({ queryKey: ["incentives", "preview"] });
      }
    },
  });

  // 2. Manager Approval & Rejection Mutation
  const approveMutation = useMutation<
    CrmApiResponse<ApprovalActionResult>,
    Error,
    { payout_ids: number[]; action: "approve" | "reject"; remarks?: string }
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/incentives/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Portal": "true",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Approval action failed (HTTP ${res.status})`);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incentives", "daily"] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "status"] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "history"] });
    },
  });

  // 3. Disbursement Mutation (Bank / UPI)
  const disburseMutation = useMutation<
    CrmApiResponse<DisburseResult>,
    Error,
    { payout_id: number; payment_method?: PaymentMethod }
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/incentives/disburse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Portal": "true",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Disbursement failed (HTTP ${res.status})`);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["incentives", "daily"] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "status", variables.payout_id] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "history"] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "report"] });
    },
  });

  // 4. Beneficiary Save Mutation
  const saveBeneficiaryMutation = useMutation<
    CrmApiResponse<BeneficiaryData>,
    Error,
    SaveBeneficiaryPayload
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/incentives/beneficiaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Portal": "true",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to save beneficiary (HTTP ${res.status})`);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["incentives", "beneficiary", variables.agent_id] });
    },
  });

  return {
    settleMutation,
    approveMutation,
    disburseMutation,
    saveBeneficiaryMutation,
  };
}
