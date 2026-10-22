"use client";

import { useQuery } from "@tanstack/react-query";
import { CrmApiResponse, IncentivePreviewData } from "@/lib/incentives/types";

export function useIncentivePreview(date?: string, pollInterval?: number | false) {
  const targetDate = date || new Date().toISOString().split("T")[0];

  return useQuery<CrmApiResponse<IncentivePreviewData>>({
    queryKey: ["incentives", "preview", targetDate],
    queryFn: async () => {
      const res = await fetch(`/api/incentives/preview?date=${encodeURIComponent(targetDate)}`);
      if (!res.ok) {
        throw new Error(`Failed to load provisional preview (HTTP ${res.status})`);
      }
      return res.json();
    },
    refetchInterval: pollInterval !== undefined ? pollInterval : 30000,
    staleTime: 10000,
  });
}
