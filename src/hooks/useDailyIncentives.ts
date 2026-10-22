"use client";

import { useQuery } from "@tanstack/react-query";
import { CrmApiResponse, DailySettledData } from "@/lib/incentives/types";

export interface DailyIncentivesFilter {
  date?: string;
  approval_status?: string;
  payment_status?: string;
  agent_id?: number;
  page?: number;
  limit?: number | string;
}

export function useDailyIncentives(filter: DailyIncentivesFilter = {}, pollInterval?: number | false) {
  const targetDate = filter.date || new Date().toISOString().split("T")[0];

  return useQuery<CrmApiResponse<DailySettledData>>({
    queryKey: ["incentives", "daily", targetDate, filter.approval_status, filter.payment_status, filter.agent_id, filter.page, filter.limit],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("date", targetDate);
      if (filter.approval_status) sp.set("approval_status", filter.approval_status);
      if (filter.payment_status) sp.set("payment_status", filter.payment_status);
      if (filter.agent_id) sp.set("agent_id", String(filter.agent_id));
      if (filter.page) sp.set("page", String(filter.page));
      if (filter.limit) sp.set("limit", String(filter.limit));

      const res = await fetch(`/api/incentives/daily?${sp.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load settled records (HTTP ${res.status})`);
      }
      return res.json();
    },
    refetchInterval: pollInterval !== undefined ? pollInterval : 20000,
    staleTime: 10000,
  });
}
