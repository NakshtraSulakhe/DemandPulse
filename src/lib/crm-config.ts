import fs from "fs/promises";
import path from "path";
import { CrmConfig, CrmConnectionTestReport, CrmEndpointTestResult } from "@/types/crm-config";

const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "crm-config.json");

export function getDefaultCrmConfig(): CrmConfig {
  const envRefreshMs = parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL || "30000", 10);
  const analyticsSec = Math.max(5, Math.round(envRefreshMs / 1000)) || 30;

  return {
    crmApiBaseUrl: process.env.CRM_API_BASE_URL || "http://localhost/demandflowbridge/api/v1",
    crmApiToken: process.env.CRM_API_TOKEN || "",
    crmApiTimeoutMs: 30000,
    crmMockFallback: false,
    autoSyncEnabled: true,
    analyticsSyncInterval: analyticsSec,
    recognitionSyncInterval: 20,
    campaignTargetsSyncInterval: 30,
    slideRotationInterval: 25,
    heatmapGranularity: 10,
    recognitionDisplayScope: "daily",
    lastUpdated: new Date().toISOString(),
    updatedBy: "System Default (.env)",
  };
}

/**
 * Loads current CRM and sync configuration from persistent JSON store,
 * falling back to .env environment variables.
 */
export async function getCrmConfig(): Promise<CrmConfig> {
  const defaults = getDefaultCrmConfig();

  try {
    const raw = await fs.readFile(CONFIG_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      // Ensure positive integers for intervals
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
    };
  } catch {
    return defaults;
  }
}

/**
 * Persists updated CRM and sync settings to disk
 */
export async function saveCrmConfig(updates: Partial<CrmConfig>, updatedBy = "Admin Console"): Promise<CrmConfig> {
  const current = await getCrmConfig();
  const merged: CrmConfig = {
    ...current,
    ...updates,
    lastUpdated: new Date().toISOString(),
    updatedBy,
  };

  // Ensure data/ directory exists
  const dir = path.dirname(CONFIG_FILE_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(merged, null, 2), "utf-8");

  return merged;
}

/**
 * Resets CRM settings back to defaults
 */
export async function resetCrmConfig(): Promise<CrmConfig> {
  const defaults = getDefaultCrmConfig();
  const dir = path.dirname(CONFIG_FILE_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(defaults, null, 2), "utf-8");
  return defaults;
}

/**
 * Probes the upstream CRM API to verify network reachability, latency, and endpoints
 */
export async function testCrmConnection(
  customBaseUrl?: string,
  customToken?: string,
  timeoutMs = 15000
): Promise<CrmConnectionTestReport> {
  const activeConfig = await getCrmConfig();
  const baseUrl = (customBaseUrl || activeConfig.crmApiBaseUrl).trim().replace(/\/+$/, "");
  const token = customToken !== undefined ? customToken.trim() : activeConfig.crmApiToken;

  const endpointsToTest = [
    { name: "Slide 1 Operations Overview", path: "slides/slide1.php" },
    { name: "Slide 2 Agent Productivity", path: "slides/slide2.php" },
    { name: "Slide 3 QA Heatmap", path: "slides/slide3.php" },
    { name: "Campaign Daily Targets", path: "campaign_daily_targets.php" },
    { name: "Live Recognition Ticker", path: "slides/recognition.php" },
  ];

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const results: CrmEndpointTestResult[] = [];

  for (const ep of endpointsToTest) {
    const fullUrl = `${baseUrl}/${ep.path}`;
    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(fullUrl, {
        method: "GET",
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
    results.length > 0
      ? Math.round(results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length)
      : 0;

  let overallStatus: "healthy" | "degraded" | "unreachable" = "unreachable";
  let message = "";

  if (okCount === results.length) {
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
