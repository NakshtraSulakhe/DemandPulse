export interface CrmCustomEndpoint {
  id: string;
  name: string;
  path: string;
  fallbackPath?: string;
  method?: "GET" | "POST";
  category?: "presentation" | "operations" | "targets" | "custom";
  description?: string;
  isBuiltIn?: boolean;
  enabled?: boolean;
}

export const DEFAULT_CRM_ENDPOINTS: CrmCustomEndpoint[] = [
  {
    id: "slide1",
    name: "Slide 1: Operations Overview",
    path: "slides/slide1.php",
    fallbackPath: "slides_analytics.php?type=slide1",
    method: "GET",
    category: "presentation",
    description: "Daily KPIs, hourly lead generation velocity, and campaign allocation tables",
    isBuiltIn: true,
    enabled: true,
  },
  {
    id: "slide2",
    name: "Slide 2: Agent Productivity",
    path: "slides/slide2.php",
    fallbackPath: "slides_analytics.php?type=slide2",
    method: "GET",
    category: "presentation",
    description: "SDR leaderboard, points distribution, and agent performance targets",
    isBuiltIn: true,
    enabled: true,
  },
  {
    id: "slide3",
    name: "Slide 3: QA 10m Heatmap",
    path: "slides/slide3.php",
    fallbackPath: "slides_analytics.php?type=slide3",
    method: "GET",
    category: "presentation",
    description: "10-minute quality assurance acceptance and inspection distribution heatmap",
    isBuiltIn: true,
    enabled: true,
  },
  {
    id: "slide4",
    name: "Slide 4: Agent 10m Heatmap",
    path: "slides/slide4.php",
    fallbackPath: "slides_analytics.php?type=slide4",
    method: "GET",
    category: "presentation",
    description: "10-minute agent shift activity, call volume, and lead production heatmap",
    isBuiltIn: true,
    enabled: true,
  },
  {
    id: "slide5",
    name: "Slide 5: Comparative Analysis",
    path: "slides/slide5.php",
    fallbackPath: "slides_analytics.php?type=slide5",
    method: "GET",
    category: "presentation",
    description: "Day-over-day operations comparison, client fulfillment, and conversion delta",
    isBuiltIn: true,
    enabled: true,
  },
  {
    id: "campaign_targets",
    name: "Campaign Daily Targets",
    path: "campaign_daily_targets.php",
    fallbackPath: "campaign_daily_targets.php",
    method: "GET",
    category: "targets",
    description: "Database table allocation for campaign targets, qualified counts, and daily remaining",
    isBuiltIn: true,
    enabled: true,
  },
  {
    id: "recognition",
    name: "Live Recognition & Celebrations",
    path: "slides/recognition.php",
    fallbackPath: "slides_analytics.php?type=recognition",
    method: "GET",
    category: "presentation",
    description: "Top lead scorers, employee birthdays, and company work anniversaries",
    isBuiltIn: true,
    enabled: true,
  },
  {
    id: "slides_analytics_master",
    name: "Master Consolidated Analytics",
    path: "slides_analytics.php?type=slide1",
    fallbackPath: "slides_analytics.php",
    method: "GET",
    category: "operations",
    description: "Consolidated upstream PHP script serving unified slide data and celebration streams",
    isBuiltIn: true,
    enabled: true,
  },
];

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
  endpoints?: Record<string, string>;
  customEndpoints?: CrmCustomEndpoint[];
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
