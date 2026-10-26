"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Slide1Data,
  Slide2Data,
  Slide3Data,
  Slide4Data,
  Slide5Data,
  AdminCampaignTargetItem,
  CampaignDailyTargetsResponse,
  SaveDailyTargetsPayload,
  RecognitionData,
} from "@/types";
import { useCrmConfig } from "@/hooks/use-crm-config";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  sourceUrl?: string;
  timestamp: string;
  isMockFallback?: boolean;
}

// Slide 1 Hook
export function useSlide1(date?: string, customPollInterval?: number | false) {
  const { config } = useCrmConfig();
  const refetchInterval =
    customPollInterval !== undefined
      ? customPollInterval
      : config.autoSyncEnabled
      ? config.analyticsSyncInterval * 1000
      : false;

  return useQuery<ApiResponse<Slide1Data>>({
    queryKey: ["slide1", date || "today"],
    queryFn: async () => {
      const q = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`/api/analytics/slide1${q}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || `CRM API error ${res.status}`);
      }
      return json;
    },
    refetchInterval,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}

// Slide 2 Hook
export function useSlide2(
  date?: string,
  page = 1,
  limit: number | string = 10,
  customPollInterval?: number | false,
  dataset?: string
) {
  const { config } = useCrmConfig();
  const refetchInterval =
    customPollInterval !== undefined
      ? customPollInterval
      : config.autoSyncEnabled
      ? config.analyticsSyncInterval * 1000
      : false;

  return useQuery<ApiResponse<Slide2Data>>({
    queryKey: ["slide2", date || "today", page, limit, dataset || "live"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (dataset) params.set("dataset", dataset);
      const res = await fetch(`/api/analytics/slide2?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || `CRM API error ${res.status}`);
      }
      return json;
    },
    refetchInterval,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}

// Slide 3 Hook (QA Heatmap)
export function useSlide3(
  date?: string,
  interval?: number,
  customPollInterval?: number | false
) {
  const { config } = useCrmConfig();
  const bucketInterval = interval || config.heatmapGranularity || 10;
  const refetchInterval =
    customPollInterval !== undefined
      ? customPollInterval
      : config.autoSyncEnabled
      ? config.analyticsSyncInterval * 1000
      : false;

  return useQuery<ApiResponse<Slide3Data>>({
    queryKey: ["slide3", date || "today", bucketInterval],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      params.set("interval", String(bucketInterval));
      const res = await fetch(`/api/analytics/slide3?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || `CRM API error ${res.status}`);
      }
      return json;
    },
    refetchInterval,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}

// Slide 4 Hook (Agent Heatmap)
export function useSlide4(
  date?: string,
  interval?: number,
  customPollInterval?: number | false
) {
  const { config } = useCrmConfig();
  const bucketInterval = interval || config.heatmapGranularity || 10;
  const refetchInterval =
    customPollInterval !== undefined
      ? customPollInterval
      : config.autoSyncEnabled
      ? config.analyticsSyncInterval * 1000
      : false;

  return useQuery<ApiResponse<Slide4Data>>({
    queryKey: ["slide4", date || "today", bucketInterval],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      params.set("interval", String(bucketInterval));
      const res = await fetch(`/api/analytics/slide4?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || `CRM API error ${res.status}`);
      }
      return json;
    },
    refetchInterval,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}

// Slide 5 Hook (Comparative Analytics)
export function useSlide5(date?: string, customPollInterval?: number | false) {
  const { config } = useCrmConfig();
  const refetchInterval =
    customPollInterval !== undefined
      ? customPollInterval
      : config.autoSyncEnabled
      ? config.analyticsSyncInterval * 1000
      : false;

  return useQuery<ApiResponse<Slide5Data>>({
    queryKey: ["slide5", date || "today"],
    queryFn: async () => {
      const q = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`/api/analytics/slide5${q}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || `CRM API error ${res.status}`);
      }
      return json;
    },
    refetchInterval,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}

// Campaign Targets Hook
export function useCampaignTargets(date?: string, status: string = "Live", customPollInterval?: number | false) {
  const { config } = useCrmConfig();
  const targetDate = date || new Date().toISOString().split("T")[0];
  const refetchInterval =
    customPollInterval !== undefined
      ? customPollInterval
      : config.autoSyncEnabled
      ? config.campaignTargetsSyncInterval * 1000
      : false;

  return useQuery<ApiResponse<CampaignDailyTargetsResponse>>({
    queryKey: ["campaign-targets", targetDate, status],
    queryFn: async () => {
      const res = await fetch(
        `/api/campaign-targets?date=${encodeURIComponent(targetDate)}&status=${encodeURIComponent(status)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || (!json.success && !json.ok)) {
        throw new Error(json.error || `CRM API error ${res.status}`);
      }
      if (json.data && Array.isArray(json.data.campaigns)) {
        return json;
      }
      return {
        success: true,
        ...json,
        data: {
          target_date: json.target_date || targetDate,
          total_campaigns: json.total_campaigns || (Array.isArray(json.campaigns) ? json.campaigns.length : 0),
          campaigns: json.campaigns || [],
          client_codes: json.client_codes || [],
        },
      };
    },
    refetchInterval,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}

// Allocation Audit History Hook
export function useAllocationHistory(params?: {
  date?: string;
  campaign_id?: number;
  client_code?: string;
  limit?: number;
}) {
  return useQuery<{
    ok: boolean;
    success: boolean;
    total_records: number;
    records: Array<{
      id: number;
      allocation_id: string;
      campaign_id: number;
      campaign_name?: string;
      client_code?: string;
      business_date: string;
      previous_target: number | null;
      new_target: number;
      changed_by: string;
      change_timestamp: string;
      operation_type: string;
      notes?: string;
    }>;
  }>({
    queryKey: ["allocation-history", params],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params?.date) q.set("date", params.date);
      if (params?.campaign_id) q.set("campaign_id", String(params.campaign_id));
      if (params?.client_code) q.set("client_code", params.client_code);
      if (params?.limit) q.set("limit", String(params.limit));
      const res = await fetch(`/api/campaign-targets/history?${q.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to fetch allocation audit history");
      }
      return json;
    },
    staleTime: 5000,
  });
}

// Save Campaign Targets Mutation
export function useSaveCampaignTargets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SaveDailyTargetsPayload) => {
      const res = await fetch("/api/campaign-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save daily targets in CRM database");
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-targets", variables.target_date] });
      queryClient.invalidateQueries({ queryKey: ["allocation-history"] });
      queryClient.invalidateQueries({ queryKey: ["slide1"] });
    },
  });
}

// Live Recognition & Announcements Hook
export function useRecognitionFeed(date?: string, customPollInterval?: number | false) {
  const { config } = useCrmConfig();
  const refetchInterval =
    customPollInterval !== undefined
      ? customPollInterval
      : config.autoSyncEnabled
      ? config.recognitionSyncInterval * 1000
      : false;

  return useQuery<ApiResponse<RecognitionData>>({
    queryKey: ["recognition", date || "today"],
    queryFn: async () => {
      const q = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`/api/analytics/recognition${q}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || `CRM Recognition API error ${res.status}`);
      }
      return json;
    },
    refetchInterval,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}
