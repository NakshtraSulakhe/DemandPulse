export interface CrmConfig {
  crmApiBaseUrl: string;
  crmApiToken: string;
  crmApiTimeoutMs: number;
  crmMockFallback: boolean;
  autoSyncEnabled: boolean;
  analyticsSyncInterval: number; // in seconds (e.g. 10, 15, 30, 60)
  recognitionSyncInterval: number; // in seconds (e.g. 10, 20, 30)
  campaignTargetsSyncInterval: number; // in seconds (e.g. 15, 30, 60)
  slideRotationInterval: number; // in seconds (e.g. 15, 20, 25, 30)
  heatmapGranularity: number; // in minutes (5, 10, 15, 30, 60)
  recognitionDisplayScope?: "daily" | "weekly" | "monthly"; // default "daily"
  lastUpdated?: string;
  updatedBy?: string;
}

export interface CrmEndpointTestResult {
  name: string;
  endpoint: string;
  url: string;
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
}

export interface CrmConnectionTestReport {
  ok: boolean;
  baseUrl: string;
  averageLatencyMs: number;
  testedAt: string;
  endpoints: CrmEndpointTestResult[];
  overallStatus: "healthy" | "degraded" | "unreachable";
  message: string;
}
