"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CrmConfig, CrmConnectionTestReport } from "@/types/crm-config";

const DEFAULT_CONFIG: CrmConfig = {
  crmApiBaseUrl: "https://app.tarajglobal.com/demandflowbridge/api/v1",
  crmApiToken: "df_admin_secret_token_2026",
  crmApiTimeoutMs: 30000,
  crmMockFallback: false,
  autoSyncEnabled: true,
  analyticsSyncInterval: 30,
  recognitionSyncInterval: 20,
  campaignTargetsSyncInterval: 30,
  slideRotationInterval: 25,
  heatmapGranularity: 30,
  lastUpdated: "",
  updatedBy: "Default",
};

export function useCrmConfig() {
  const queryClient = useQueryClient();

  const configQuery = useQuery<{ ok: boolean; data: CrmConfig }>({
    queryKey: ["crm-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/crm-config", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load CRM configuration");
      }
      return json;
    },
    staleTime: 60000, // 1 min stale time
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<CrmConfig>) => {
      const res = await fetch("/api/admin/crm-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to save CRM settings");
      }
      return json.data as CrmConfig;
    },
    onSuccess: (savedData) => {
      queryClient.setQueryData(["crm-config"], { ok: true, data: savedData });
      // Invalidate queries so new intervals or endpoints take effect
      queryClient.invalidateQueries({ queryKey: ["slide1"] });
      queryClient.invalidateQueries({ queryKey: ["slide2"] });
      queryClient.invalidateQueries({ queryKey: ["slide3"] });
      queryClient.invalidateQueries({ queryKey: ["slide4"] });
      queryClient.invalidateQueries({ queryKey: ["slide5"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-targets"] });
      queryClient.invalidateQueries({ queryKey: ["recognition"] });
    },
  });

  const testConnectionMutation = useMutation<
    CrmConnectionTestReport,
    Error,
    { baseUrl?: string; token?: string; timeoutMs?: number; endpoints?: any[] } | undefined
  >({
    mutationFn: async (params) => {
      const res = await fetch("/api/admin/crm-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params || {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.report) {
        throw new Error(json.error || "Connection test failed");
      }
      return json.report as CrmConnectionTestReport;
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/crm-config", {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to reset settings");
      }
      return json.data as CrmConfig;
    },
    onSuccess: (resetData) => {
      queryClient.setQueryData(["crm-config"], { ok: true, data: resetData });
      queryClient.invalidateQueries({ queryKey: ["slide1"] });
      queryClient.invalidateQueries({ queryKey: ["slide2"] });
      queryClient.invalidateQueries({ queryKey: ["slide3"] });
      queryClient.invalidateQueries({ queryKey: ["slide4"] });
      queryClient.invalidateQueries({ queryKey: ["slide5"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-targets"] });
      queryClient.invalidateQueries({ queryKey: ["recognition"] });
    },
  });

  const triggerInstantSync = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["slide1"] }),
      queryClient.invalidateQueries({ queryKey: ["slide2"] }),
      queryClient.invalidateQueries({ queryKey: ["slide3"] }),
      queryClient.invalidateQueries({ queryKey: ["slide4"] }),
      queryClient.invalidateQueries({ queryKey: ["slide5"] }),
      queryClient.invalidateQueries({ queryKey: ["campaign-targets"] }),
      queryClient.invalidateQueries({ queryKey: ["recognition"] }),
    ]);
  };

  const config = configQuery.data?.data || DEFAULT_CONFIG;

  return {
    config,
    isLoading: configQuery.isLoading,
    isSaving: updateMutation.isPending,
    isTesting: testConnectionMutation.isPending,
    isResetting: resetMutation.isPending,
    testReport: testConnectionMutation.data,
    testError: testConnectionMutation.error,
    updateConfig: updateMutation.mutateAsync,
    testConnection: testConnectionMutation.mutateAsync,
    resetConfig: resetMutation.mutateAsync,
    triggerInstantSync,
    refetchConfig: configQuery.refetch,
  };
}
