import {
  CrmConfig,
  CrmConnectionTestReport,
  CrmEndpointTestResult,
  CrmCustomEndpoint,
  DEFAULT_CRM_ENDPOINTS,
} from "@/types/crm-config";
import { prisma, serializeDbData } from "@/lib/db";
import { recordSettingChangeEvent } from "@/lib/db/preferences-repository";

export { DEFAULT_CRM_ENDPOINTS };

// Fast in-memory cache to prevent database saturation on rapid polling
let cachedConfig: CrmConfig | null = null;
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 5000;

export function getDefaultCrmConfig(): CrmConfig {
  const envRefreshMs = parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || "30000", 10);
  const analyticsSec = Math.max(5, Math.round(envRefreshMs / 1000)) || 30;

  const defaultEndpointsMap: Record<string, string> = {};
  DEFAULT_CRM_ENDPOINTS.forEach((ep) => {
    defaultEndpointsMap[ep.id] = ep.path;
  });

  return {
    crmApiBaseUrl: process.env.CRM_API_BASE_URL || "https://app.tarajglobal.com/demandflowbridge/api/v1",
    crmApiToken: process.env.CRM_API_TOKEN || "df_admin_secret_token_2026",
    crmApiTimeoutMs: 30000,
    crmMockFallback: false,
    autoSyncEnabled: true,
    analyticsSyncInterval: analyticsSec,
    recognitionSyncInterval: 20,
    campaignTargetsSyncInterval: 30,
    slideRotationInterval: 25,
    heatmapGranularity: 30,
    recognitionDisplayScope: "daily",
    endpoints: defaultEndpointsMap,
    customEndpoints: DEFAULT_CRM_ENDPOINTS,
    lastUpdated: new Date().toISOString(),
    updatedBy: "System Default (Live Production)",
  };
}

/**
 * Loads current CRM and sync configuration directly from MySQL (demandflow_slides),
 * falling back to .env environment variables. (Zero local file access)
 */
export async function getCrmConfig(): Promise<CrmConfig> {
  const now = Date.now();
  if (cachedConfig && now - lastCacheFetchTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  const defaults = getDefaultCrmConfig();

  try {
    const settingRecord = await prisma.slideSystemSetting.findUnique({
      where: { settingKey: "crm_connection_config" },
    });

    const parsed: any = settingRecord ? serializeDbData(settingRecord.settingValue) : null;

    if (!parsed) {
      cachedConfig = defaults;
      lastCacheFetchTime = now;
      return defaults;
    }

    const savedCustom: CrmCustomEndpoint[] = Array.isArray(parsed.customEndpoints) ? parsed.customEndpoints : [];
    const mergedEndpointsMap: Record<string, string> = { ...defaults.endpoints, ...(parsed.endpoints || {}) };

    const mergedCustomEndpoints: CrmCustomEndpoint[] = [...DEFAULT_CRM_ENDPOINTS];
    savedCustom.forEach((ep) => {
      const idx = mergedCustomEndpoints.findIndex((d) => d.id === ep.id);
      if (idx >= 0) {
        mergedCustomEndpoints[idx] = { ...mergedCustomEndpoints[idx], ...ep };
      } else {
        mergedCustomEndpoints.push(ep);
      }
    });

    const resolved: CrmConfig = {
      ...defaults,
      ...parsed,
      endpoints: mergedEndpointsMap,
      customEndpoints: mergedCustomEndpoints,
      analyticsSyncInterval: Number(parsed.analyticsSyncInterval) || defaults.analyticsSyncInterval,
      recognitionSyncInterval: Number(parsed.recognitionSyncInterval) || defaults.recognitionSyncInterval,
      campaignTargetsSyncInterval: Number(parsed.campaignTargetsSyncInterval) || defaults.campaignTargetsSyncInterval,
      slideRotationInterval: Number(parsed.slideRotationInterval) || defaults.slideRotationInterval,
      heatmapGranularity: Number(parsed.heatmapGranularity) || defaults.heatmapGranularity,
      recognitionDisplayScope: ["daily", "weekly", "monthly"].includes(parsed.recognitionDisplayScope)
        ? parsed.recognitionDisplayScope
        : "daily",
      crmApiTimeoutMs: Number(parsed.crmApiTimeoutMs) || defaults.crmApiTimeoutMs,
      crmMockFallback: typeof parsed.crmMockFallback === "boolean" ? parsed.crmMockFallback : defaults.crmMockFallback,
      autoSyncEnabled: typeof parsed.autoSyncEnabled === "boolean" ? parsed.autoSyncEnabled : defaults.autoSyncEnabled,
      // Enforce token from environment variable if present for security
      crmApiToken: process.env.CRM_API_TOKEN || parsed.crmApiToken || defaults.crmApiToken,
    };

    cachedConfig = resolved;
    lastCacheFetchTime = now;
    return resolved;
  } catch (err) {
    console.error("Error reading CRM config from MySQL:", err);
    return defaults;
  }
}

/**
 * Persists updated CRM and sync settings directly to MySQL (zero filesystem writes)
 */
export async function saveCrmConfig(updates: Partial<CrmConfig>, updatedBy = "Admin Console"): Promise<CrmConfig> {
  const current = await getCrmConfig();

  let updatedEndpoints = updates.endpoints || current.endpoints || {};
  if (updates.customEndpoints && Array.isArray(updates.customEndpoints)) {
    updatedEndpoints = { ...updatedEndpoints };
    updates.customEndpoints.forEach((ep) => {
      updatedEndpoints[ep.id] = ep.path;
    });
  }

  const merged: CrmConfig = {
    ...current,
    ...updates,
    endpoints: updatedEndpoints,
    lastUpdated: new Date().toISOString(),
    updatedBy,
  };

  // 1. Update slide_system_settings in MySQL
  await prisma.slideSystemSetting.upsert({
    where: { settingKey: "crm_connection_config" },
    update: {
      settingValue: merged as any,
      updatedAt: new Date(),
    },
    create: {
      settingKey: "crm_connection_config",
      settingValue: merged as any,
    },
  });

  // 2. Update slide_crm_connection_settings in MySQL
  await prisma.slideCrmConnectionSetting.upsert({
    where: { id: BigInt(1) },
    update: {
      baseUrl: merged.crmApiBaseUrl,
      pollingIntervalSeconds: merged.analyticsSyncInterval,
      timeoutSeconds: Math.round(merged.crmApiTimeoutMs / 1000),
      mockFallback: merged.crmMockFallback,
      autoSyncEnabled: merged.autoSyncEnabled,
      updatedAt: new Date(),
    },
    create: {
      id: BigInt(1),
      connectionName: "Production Bridge CRM",
      baseUrl: merged.crmApiBaseUrl,
      pollingIntervalSeconds: merged.analyticsSyncInterval,
      timeoutSeconds: Math.round(merged.crmApiTimeoutMs / 1000),
      mockFallback: merged.crmMockFallback,
      autoSyncEnabled: merged.autoSyncEnabled,
      isActive: true,
    },
  });

  // 3. Record configuration modification event
  await recordSettingChangeEvent(
    "CRM_CONFIG",
    "crm_connection_config",
    current,
    merged,
    BigInt(1)
  );

  // Invalidate in-memory cache
  cachedConfig = merged;
  lastCacheFetchTime = Date.now();

  return merged;
}

/**
 * Resets CRM settings back to defaults in MySQL
 */
export async function resetCrmConfig(): Promise<CrmConfig> {
  const defaults = getDefaultCrmConfig();
  await saveCrmConfig(defaults, "Admin Reset to Default");
  return defaults;
}

/**
 * Probes the upstream CRM API to verify network reachability, latency, and endpoints
 */
export async function testCrmConnection(
  customBaseUrl?: string,
  customToken?: string,
  timeoutMs = 15000,
  endpointsToProbe?: CrmCustomEndpoint[]
): Promise<CrmConnectionTestReport> {
  const activeConfig = await getCrmConfig();
  const baseUrl = (customBaseUrl || activeConfig.crmApiBaseUrl).trim().replace(/\/+$/, "");
  const token = customToken !== undefined ? customToken.trim() : activeConfig.crmApiToken;

  const endpointsList =
    endpointsToProbe && endpointsToProbe.length > 0
      ? endpointsToProbe
      : activeConfig.customEndpoints || DEFAULT_CRM_ENDPOINTS;

  const results: CrmEndpointTestResult[] = [];

  for (const ep of endpointsList) {
    if (ep.enabled === false) continue;

    let fullUrl = ep.path.startsWith("http://") || ep.path.startsWith("https://")
      ? ep.path
      : `${baseUrl}/${ep.path.replace(/^\/+/, "")}`;

    if (token) {
      try {
        const u = new URL(fullUrl);
        if (!u.searchParams.has("token")) {
          u.searchParams.set("token", token);
          fullUrl = u.toString();
        }
      } catch {}
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(fullUrl, {
        method: ep.method || "GET",
        headers,
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      results.push({
        name: ep.name,
        endpoint: ep.path,
        url: fullUrl,
        ok: res.ok,
        status: res.status,
        latencyMs,
        error: !res.ok ? `HTTP ${res.status}: ${res.statusText}` : undefined,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        name: ep.name,
        endpoint: ep.path,
        url: fullUrl,
        ok: false,
        status: 0,
        latencyMs,
        error: msg.includes("aborted") ? "Connection timed out" : msg,
      });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  const avgLatency =
    results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length) : 0;

  let overallStatus: "healthy" | "degraded" | "unreachable" = "unreachable";
  let message = "";

  if (okCount === results.length && results.length > 0) {
    overallStatus = "healthy";
    message = `All ${okCount} upstream CRM endpoints responded successfully with ${avgLatency}ms average latency.`;
  } else if (okCount > 0) {
    overallStatus = "degraded";
    message = `${okCount}/${results.length} CRM endpoints responded. Some endpoints returned errors or 404s.`;
  } else {
    overallStatus = "unreachable";
    message = `Unable to connect to CRM upstream at ${baseUrl}. Ensure Apache/PHP CRM server is active or enable Mock Fallback Mode.`;
  }

  return {
    ok: okCount > 0,
    baseUrl,
    averageLatencyMs: avgLatency,
    testedAt: new Date().toISOString(),
    endpoints: results,
    overallStatus,
    message,
  };
}
