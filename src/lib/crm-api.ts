import {
  Slide1Data,
  Slide2Data,
  Slide3Data,
  Slide4Data,
  Slide5Data,
  AdminCampaignTargetItem,
  SaveDailyTargetsPayload,
  RecognitionData,
} from "@/types";
import {
  Slide1ResponseSchema,
  Slide2ResponseSchema,
  Slide3ResponseSchema,
  Slide4ResponseSchema,
  Slide5ResponseSchema,
  CampaignDailyTargetsResponseSchema,
  RecognitionResponseSchema,
} from "@/lib/validations";
import { getCrmConfig } from "@/lib/crm-config";
import { getShiftBusinessDate } from "@/lib/shift/engine";
import { fetchIncentivePreview, fetchDailySettled } from "@/lib/incentives/api";
import {
  getIncentiveConfig,
  calculateIncentiveBreakdown,
  DEFAULT_INCENTIVE_CONFIG,
} from "@/lib/incentives/rules-config";
import { getAllocationsMapForDate } from "@/lib/db/allocations";
import {
  getMockSlide1Data,
  getMockSlide2Data,
  getMockSlide3Data,
  getMockSlide4Data,
  getMockSlide5Data,
  getMockRecognitionData,
  getMockCampaignTargets,
} from "@/lib/crm-mock-data";
import {
  calculateCampaignTargetPoints,
  calculateFloorCapacityPoints,
  calculateCapacityGap,
  getExampleBenchmarkDataset,
} from "@/lib/productivity/points-capacity";

export interface CrmFetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  sourceUrl?: string;
  timestamp: string;
  isMockFallback?: boolean;
}

function buildEndpointUrl(basePath: string, extraParams?: Record<string, string | number | undefined>): string {
  let path = basePath;
  if (!extraParams) return path;

  const validEntries = Object.entries(extraParams).filter(([_, v]) => v !== undefined && v !== "");
  if (validEntries.length === 0) return path;

  const separator = path.includes("?") ? "&" : "?";
  const qs = new URLSearchParams(validEntries.map(([k, v]) => [k, String(v)])).toString();

  return `${path}${separator}${qs}`;
}

/**
 * Converts an IST time string ("17:30:00" or "17:30") to UTC ("12:00:00") by subtracting 5h 30m.
 * Ensures queries to the UTC-backed DemandFlow CRM database capture the full India working shift.
 */
export function convertIstToUtcTime(timeStr: string): string {
  if (!timeStr) return timeStr;
  const parts = timeStr.trim().split(":");
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1] || "0", 10);
  const seconds = parts[2] || "00";
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  minutes -= 30;
  hours -= 5;
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${seconds}`;
}

/**
 * Converts a UTC time string ("12:00" or "12:00:00") to IST ("17:30") by adding 5h 30m.
 */
export function convertUtcToIstTime(timeStr: string): string {
  if (!timeStr) return timeStr;
  const parts = timeStr.trim().split(":");
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1] || "0", 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  minutes += 30;
  hours += 5;
  if (minutes >= 60) {
    minutes -= 60;
    hours += 1;
  }
  hours = hours % 24;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Converts a UTC interval label (e.g. "12:00 - 12:10") to IST display ("17:30 - 17:40").
 */
export function convertUtcIntervalLabelToIst(label: string): string {
  if (!label) return label;
  const parts = label.split("-").map((s) => s.trim());
  if (parts.length === 2) {
    return `${convertUtcToIstTime(parts[0])} - ${convertUtcToIstTime(parts[1])}`;
  }
  return convertUtcToIstTime(label);
}

/**
 * Low-level HTTP requester to DemandFlow CRM PHP API
 * Dynamically resolves URL, timeout, query authentication, and bearer headers
 */
async function fetchFromCrm<T>(
  endpointOrPath: string,
  options: RequestInit = {},
  timeoutMs?: number
): Promise<{ ok: boolean; status: number; data?: T; error?: string; baseUrl: string; effectiveUrl: string }> {
  const config = await getCrmConfig();
  const baseUrl = config.crmApiBaseUrl.replace(/\/+$/, "");
  const effectiveTimeout = timeoutMs || config.crmApiTimeoutMs || 30000;

  const cleanPath = endpointOrPath.replace(/^\/+/, "");
  let fullUrl = cleanPath.startsWith("http://") || cleanPath.startsWith("https://")
    ? cleanPath
    : `${baseUrl}/${cleanPath}`;

  // Automatically attach token to query string if token is configured and not already present
  if (config.crmApiToken && config.crmApiToken.trim().length > 0) {
    try {
      const u = new URL(fullUrl);
      if (!u.searchParams.has("token")) {
        u.searchParams.set("token", config.crmApiToken.trim());
        fullUrl = u.toString();
      }
    } catch {}
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (config.crmApiToken && config.crmApiToken.trim().length > 0) {
    headers["Authorization"] = `Bearer ${config.crmApiToken.trim()}`;
  }

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `CRM upstream returned HTTP ${res.status}: ${res.statusText}`,
        baseUrl,
        effectiveUrl: fullUrl,
      };
    }

    const json = await res.json();
    return { ok: true, status: res.status, data: json as T, baseUrl, effectiveUrl: fullUrl };
  } catch (err: unknown) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.toLowerCase().includes("aborted");
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      error: isTimeout
        ? `CRM request timed out after ${effectiveTimeout}ms at ${fullUrl}`
        : `Failed to connect to CRM API at ${fullUrl} (${message})`,
      baseUrl,
      effectiveUrl: fullUrl,
    };
  }
}

/**
 * Slide 1: Operations Overview (KPIs, Campaigns Table, Late Comers)
 */
export async function getCrmSlide1(dateStr?: string): Promise<CrmFetchResult<Slide1Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const effectiveDate = dateStr || getShiftBusinessDate();

  // 1. Fetch Slide 1 data (KPI cards, all live campaigns, late comers)
  const configuredPath = config.endpoints?.slide1 || "slides/slide1.php";
  const slide1Promise = fetchFromCrm<unknown>(buildEndpointUrl(configuredPath, { date: effectiveDate, status: "Live" }));

  // 2. Concurrently fetch daily targets from CRM API to ensure synchronization across serverless containers
  const targetsPath = config.endpoints?.campaign_targets || "campaign_daily_targets.php";
  const targetsPromise = fetchFromCrm<unknown>(buildEndpointUrl(targetsPath, { date: effectiveDate, status: "Live" }));

  let [res, targetsRes] = await Promise.all([slide1Promise, targetsPromise]);

  // Fallback to configured fallback or slides_analytics.php?type=slide1 if needed
  if (!res.ok) {
    const fallbackPath =
      config.customEndpoints?.find((e) => e.id === "slide1")?.fallbackPath ||
      "slides_analytics.php?type=slide1";
    res = await fetchFromCrm<unknown>(buildEndpointUrl(fallbackPath, { date: effectiveDate, status: "Live" }));
  }

  if (!res.ok) {
    res = await fetchFromCrm<unknown>(buildEndpointUrl("slides_analytics.php?action=slide1", { date: effectiveDate, status: "Live" }));
  }

  // Retrieve saved allocations from MySQL database for this business date
  const savedAllocationsMap = await getAllocationsMapForDate(effectiveDate);

  // Also build map of positive targets from CRM's campaign_daily_targets.php
  const crmTargetsMap = new Map<number, number>();
  if (targetsRes.ok && targetsRes.data) {
    const parsedTargets = CampaignDailyTargetsResponseSchema.safeParse(targetsRes.data);
    if (parsedTargets.success) {
      for (const t of parsedTargets.data.campaigns) {
        if (typeof t.daily_target === "number" && t.daily_target > 0) {
          crmTargetsMap.set(t.campaign_id, t.daily_target);
        }
      }
    }
  }

  if (res.ok && res.data) {
    const parsed = Slide1ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      // Find all live active campaigns for today
      const allLiveCampaigns = parsed.data.slide1.campaigns.filter((c: any) => {
        if (c.active !== undefined && c.active !== null && Number(c.active) === 0) return false;
        const rawStatus = String((c as any).campaign_status || (c as any).status || "");
        const st = rawStatus.trim().toLowerCase();
        if (st && st !== "live") return false;
        return true;
      });

      // Build unified live campaigns index across slide1 and campaign_daily_targets endpoints
      const liveCampaignMap = new Map<number, any>();
      for (const c of allLiveCampaigns) {
        liveCampaignMap.set(c.campaign_id, { ...c });
      }

      if (targetsRes.ok && targetsRes.data) {
        const parsedTargets = CampaignDailyTargetsResponseSchema.safeParse(targetsRes.data);
        if (parsedTargets.success) {
          for (const tc of parsedTargets.data.campaigns) {
            const existing = liveCampaignMap.get(tc.campaign_id);
            if (!existing) {
              const rawStatus = String((tc as any).campaign_status || (tc as any).status || "");
              const st = rawStatus.trim().toLowerCase();
              if (!st || st === "live") {
                liveCampaignMap.set(tc.campaign_id, { ...tc });
              }
            } else if (tc.daily_target && tc.daily_target > 0 && (!existing.daily_target || existing.daily_target === 0)) {
              existing.daily_target = tc.daily_target;
            }
          }
        }
      }

      const combinedLiveCampaigns = Array.from(liveCampaignMap.values());
      const totalLiveCampaignsCount = combinedLiveCampaigns.length;

      // Filter: Show ONLY campaigns for which a positive daily target (> 0) is entered for today
      const allocatedLiveCampaigns = combinedLiveCampaigns
        .filter((c: any) => {
          const targetInDb = savedAllocationsMap.get(c.campaign_id)?.daily_target || 0;
          const targetInCrm = crmTargetsMap.get(c.campaign_id) || c.daily_target || 0;
          const effectiveDailyTarget = targetInDb > 0 ? targetInDb : targetInCrm;
          return effectiveDailyTarget > 0;
        })
        .map((c: any) => {
          const targetInDb = savedAllocationsMap.get(c.campaign_id)?.daily_target || 0;
          const targetInCrm = crmTargetsMap.get(c.campaign_id) || c.daily_target || 0;
          const dailyTarget = targetInDb > 0 ? targetInDb : targetInCrm;

          const qualifiedLeads = Number(c.qualified_leads) || 0;
          const remaining = Math.max(0, dailyTarget - qualifiedLeads);
          const completionPct = dailyTarget > 0 ? Math.round((qualifiedLeads / dailyTarget) * 100 * 10) / 10 : 0;

          return {
            ...c,
            daily_target: dailyTarget,
            remaining_leads_to_qualify: remaining,
            completion_percentage: completionPct,
            monthly_allocation: Number(c.monthly_allocation) || 0,
            generated_leads: Number(c.generated_leads) || 0,
            qualified_leads: qualifiedLeads,
            disqualified_leads: Number(c.disqualified_leads) || 0,
            pending_qa: Number(c.pending_qa) || 0,
          };
        });

      return {
        success: true,
        data: {
          ...parsed.data.slide1,
          total_live_campaigns: totalLiveCampaignsCount,
          total_allocated_campaigns: allocatedLiveCampaigns.length,
          campaigns: allocatedLiveCampaigns,
        },
        sourceUrl: res.effectiveUrl,
        timestamp,
      };
    }
  }

  // If CRM fails and Mock Fallback is enabled
  if (config.crmMockFallback) {
    const mockData = getMockSlide1Data(effectiveDate);
    const mockFiltered = mockData.campaigns
      .filter((c: any) => {
        const saved = savedAllocationsMap.get(c.campaign_id);
        return Boolean(saved && saved.daily_target > 0);
      })
      .map((c: any) => {
        const saved = savedAllocationsMap.get(c.campaign_id)!;
        const dailyTarget = saved.daily_target;
        const qualifiedLeads = Number(c.qualified_leads) || 0;
        return {
          ...c,
          daily_target: dailyTarget,
          remaining_leads_to_qualify: Math.max(0, dailyTarget - qualifiedLeads),
          completion_percentage: dailyTarget > 0 ? Math.round((qualifiedLeads / dailyTarget) * 100 * 10) / 10 : 0,
        };
      });

    return {
      success: true,
      data: {
        ...mockData,
        campaigns: mockFiltered,
      },
      sourceUrl: "[Mock Fallback Mode]",
      timestamp,
      isMockFallback: true,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to fetch Slide 1 data from CRM API",
    timestamp,
  };
}

/**
 * Slide 2: Agent Productivity & Points Distribution
 * Sorts agents by lead generated count descending (highest first)
 */
export async function getCrmSlide2(
  dateStr?: string,
  page: number = 1,
  limit: number | string = 10,
  dataset?: string
): Promise<CrmFetchResult<Slide2Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const effectiveDate = dateStr || getShiftBusinessDate();

  if (dataset === "example") {
    return {
      success: true,
      data: getMockSlide2Data(page, limit),
      sourceUrl: "[Example Benchmark Dataset]",
      timestamp,
      isMockFallback: true,
    };
  }

  const configuredPath = config.endpoints?.slide2 || "slides/slide2.php";
  const slide2Promise = fetchFromCrm<unknown>(
    buildEndpointUrl(configuredPath, { date: effectiveDate, page, limit })
  );

  // Concurrently fetch daily campaign targets from CRM
  const targetsPath = config.endpoints?.campaign_targets || "campaign_daily_targets.php";
  const targetsPromise = fetchFromCrm<unknown>(
    buildEndpointUrl(targetsPath, { date: effectiveDate, status: "Live" })
  );

  // Concurrently retrieve saved daily allocations from MySQL
  const savedAllocationsPromise = getAllocationsMapForDate(effectiveDate).catch(() => new Map());

  // Concurrently retrieve attendance from CRM incentives preview
  const incentivePreviewPromise = fetchIncentivePreview(effectiveDate).catch(() => null);

  let [res, targetsRes, savedAllocationsMap, incentiveRes] = await Promise.all([
    slide2Promise,
    targetsPromise,
    savedAllocationsPromise,
    incentivePreviewPromise,
  ]);

  if (!res.ok) {
    const fallbackPath =
      config.customEndpoints?.find((e) => e.id === "slide2")?.fallbackPath ||
      "slides_analytics.php?type=slide2";
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl(fallbackPath, { date: effectiveDate, page, limit })
    );
  }

  if (!res.ok) {
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl("slides_analytics.php?action=slide2", { date: effectiveDate, page, limit })
    );
  }

  if (res.ok && res.data) {
    const parsed = Slide2ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      // 1. Process Campaign Daily Target Points:
      // SUM(Daily Campaign Lead Target * Campaign Type Point Factor)
      let rawCampaigns: any[] = [];
      if (targetsRes.ok && targetsRes.data) {
        const parsedTargets = CampaignDailyTargetsResponseSchema.safeParse(targetsRes.data);
        if (parsedTargets.success && Array.isArray(parsedTargets.data.campaigns)) {
          rawCampaigns = parsedTargets.data.campaigns;
        }
      }

      const campaignTargetPoints = calculateCampaignTargetPoints(
        rawCampaigns,
        savedAllocationsMap
      );

      // 2. Process Floor Capacity Points:
      // SUM(Daily Target Points of Present Agents)
      const attendanceMap = new Map<number, { attendance_status: string; is_present: boolean }>();
      if (incentiveRes?.success && Array.isArray(incentiveRes.data?.agents)) {
        for (const ag of incentiveRes.data.agents) {
          if (ag.agent_id != null) {
            attendanceMap.set(Number(ag.agent_id), {
              attendance_status: ag.attendance_status || (ag.is_present ? "Present" : "Absent"),
              is_present: ag.is_present ?? true,
            });
          }
        }
      }

      const floorCapacityResult = calculateFloorCapacityPoints(
        parsed.data.slide2.agents,
        attendanceMap
      );

      // 3. Process Capacity Gap:
      // Capacity Gap = Floor Capacity Points - Campaign Target Points
      const capacityGapResult = calculateCapacityGap(
        floorCapacityResult.total_capacity_points,
        campaignTargetPoints.total_target_points
      );

      // Sort agents by lead generated count descending (highest lead generators on top)
      const sortedAgents = [...floorCapacityResult.annotated_agents].sort((a, b) => {
        const diff = (b.generated_leads ?? 0) - (a.generated_leads ?? 0);
        if (diff !== 0) return diff;
        const ptsDiff = (b.achieved_points ?? 0) - (a.achieved_points ?? 0);
        if (ptsDiff !== 0) return ptsDiff;
        return (a.agent_name || "").localeCompare(b.agent_name || "");
      });

      return {
        success: true,
        data: {
          ...parsed.data.slide2,
          agents: sortedAgents,
          campaign_target_points: campaignTargetPoints,
          floor_capacity: {
            total_capacity_points: floorCapacityResult.total_capacity_points,
            total_agents: floorCapacityResult.total_agents,
            present_agents_count: floorCapacityResult.present_agents_count,
            absent_agents_count: floorCapacityResult.absent_agents_count,
            capacity_gap: capacityGapResult.capacity_gap,
            capacity_gap_label: capacityGapResult.capacity_gap_label,
            capacity_gap_status: capacityGapResult.capacity_gap_status,
          },
          query_date: effectiveDate,
        },
        sourceUrl: res.effectiveUrl,
        timestamp,
      };
    }
  }

  if (config.crmMockFallback) {
    return {
      success: true,
      data: getMockSlide2Data(page, limit),
      sourceUrl: "[Mock Fallback Mode]",
      timestamp,
      isMockFallback: true,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to fetch Slide 2 data from CRM API",
    timestamp,
  };
}

/**
 * Slide 3: Quality Team Heatmap
 * Translates shift bounds to UTC for the CRM database query, and maps interval labels to IST
 */
export async function getCrmSlide3(
  dateStr?: string,
  interval = 10,
  shiftStart = "17:30:00",
  shiftEnd = "02:30:00"
): Promise<CrmFetchResult<Slide3Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const effectiveDate = dateStr || getShiftBusinessDate();

  // The CRM MySQL database stores created_at / audited_at in UTC.
  // Converting IST shift hours (17:30:00 - 02:30:00) -> UTC (12:00:00 - 21:00:00)
  // ensures the CRM returns audits across the entire 9-hour shift.
  const utcShiftStart = convertIstToUtcTime(shiftStart);
  const utcShiftEnd = convertIstToUtcTime(shiftEnd);

  const configuredPath = config.endpoints?.slide3 || "slides/slide3.php";
  let res = await fetchFromCrm<unknown>(
    buildEndpointUrl(configuredPath, { date: effectiveDate, interval, shift_start: utcShiftStart, shift_end: utcShiftEnd })
  );

  if (!res.ok) {
    const fallbackPath =
      config.customEndpoints?.find((e) => e.id === "slide3")?.fallbackPath ||
      "slides_analytics.php?type=slide3";
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl(fallbackPath, { date: effectiveDate, interval, shift_start: utcShiftStart, shift_end: utcShiftEnd })
    );
  }

  if (!res.ok) {
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl("slides_analytics.php?action=slide3", { date: effectiveDate, interval, shift_start: utcShiftStart, shift_end: utcShiftEnd })
    );
  }

  if (res.ok && res.data) {
    const parsed = Slide3ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      // Ensure only actual QA reviewers from qa_reviewed_by with audits are included
      // Strictly omit unnecessary names (0 audits, e.g. Mayur Jadhav) and non-QA personnel (e.g. Sagar Machale)
      const isActualQaReviewer = (analyst: any) => {
        const total = (analyst.total_audited || 0) + (analyst.total_qualified || 0);
        if (total <= 0) return false;
        if (Number(analyst.user_id) === 99) return false;
        const name = (analyst.full_name || "").toLowerCase().trim();
        if (name.includes("sagar")) return false;
        if (name.includes("mayur jadhav")) return false;
        return true;
      };

      const activeAnalysts = parsed.data.slide3.qa_heatmap.filter(isActualQaReviewer);
      const targetHeatmap = activeAnalysts;

      // Map UTC interval labels back to IST display labels ("12:00 - 12:10" -> "17:30 - 17:40")
      const mappedHeatmap = targetHeatmap.map((analyst) => ({
        ...analyst,
        intervals: analyst.intervals.map((inv) => ({
          ...inv,
          time_label: convertUtcIntervalLabelToIst(inv.time_label),
        })),
      }));

      // Sort analysts by total audited / qualified descending
      mappedHeatmap.sort((a, b) => (b.total_audited || 0) - (a.total_audited || 0));

      // Extract today's floor audited metrics if slide1 campaigns was returned in payload
      let todayAudited: number | undefined;
      let todayQualified: number | undefined;
      let todayDisqualified: number | undefined;
      let todayPendingQa: number | undefined;

      const rawSlide1 = (res.data as any)?.slide1;
      if (rawSlide1 && Array.isArray(rawSlide1.campaigns)) {
        let q = 0, d = 0, p = 0;
        for (const c of rawSlide1.campaigns) {
          q += Number(c.qualified_leads || 0);
          d += Number(c.disqualified_leads || 0);
          p += Number(c.pending_qa || 0);
        }
        todayQualified = q;
        todayDisqualified = d;
        todayAudited = q + d;
        todayPendingQa = p;
      }

      return {
        success: true,
        data: {
          ...parsed.data.slide3,
          shift_start: shiftStart,
          shift_end: shiftEnd,
          total_intervals: mappedHeatmap[0]?.intervals.length || parsed.data.slide3.total_intervals,
          total_qa_analysts: mappedHeatmap.length,
          qa_heatmap: mappedHeatmap,
          today_audited: todayAudited,
          today_qualified: todayQualified,
          today_disqualified: todayDisqualified,
          today_pending_qa: todayPendingQa,
        },
        sourceUrl: res.effectiveUrl,
        timestamp,
      };
    }
  }

  if (config.crmMockFallback) {
    return {
      success: true,
      data: getMockSlide3Data(interval),
      sourceUrl: "[Mock Fallback Mode]",
      timestamp,
      isMockFallback: true,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to fetch Slide 3 data from CRM API",
    timestamp,
  };
}

/**
 * Slide 4: Agent Lead Generation Heatmap
 * Queries with UTC shift hours to capture entire shift, maps labels to IST, sorts top generators on top
 */
export async function getCrmSlide4(
  dateStr?: string,
  interval = 10,
  shiftStart = "17:30:00",
  shiftEnd = "02:30:00"
): Promise<CrmFetchResult<Slide4Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const effectiveDate = dateStr || getShiftBusinessDate();

  // Convert IST shift hours to UTC bounds for CRM database query
  const utcShiftStart = convertIstToUtcTime(shiftStart);
  const utcShiftEnd = convertIstToUtcTime(shiftEnd);

  const configuredPath = config.endpoints?.slide4 || "slides/slide4.php";
  let res = await fetchFromCrm<unknown>(
    buildEndpointUrl(configuredPath, { date: effectiveDate, interval, shift_start: utcShiftStart, shift_end: utcShiftEnd })
  );

  if (!res.ok) {
    const fallbackPath =
      config.customEndpoints?.find((e) => e.id === "slide4")?.fallbackPath ||
      "slides_analytics.php?type=slide4";
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl(fallbackPath, { date: effectiveDate, interval, shift_start: utcShiftStart, shift_end: utcShiftEnd })
    );
  }

  if (!res.ok) {
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl("slides_analytics.php?action=slide4", { date: effectiveDate, interval, shift_start: utcShiftStart, shift_end: utcShiftEnd })
    );
  }

  if (res.ok && res.data) {
    const parsed = Slide4ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      // Map UTC interval labels back to IST display labels ("12:00 - 12:10" -> "17:30 - 17:40")
      const mappedHeatmap = parsed.data.slide4.agent_heatmap.map((agent) => ({
        ...agent,
        intervals: agent.intervals.map((inv) => ({
          ...inv,
          time_label: convertUtcIntervalLabelToIst(inv.time_label),
        })),
      }));

      // Sort heatmap agents by total generated count descending (highest lead generators on top)
      mappedHeatmap.sort((a, b) => (b.total_generated || 0) - (a.total_generated || 0));

      return {
        success: true,
        data: {
          ...parsed.data.slide4,
          shift_start: shiftStart,
          shift_end: shiftEnd,
          total_intervals: mappedHeatmap[0]?.intervals.length || parsed.data.slide4.total_intervals,
          agent_heatmap: mappedHeatmap,
        },
        sourceUrl: res.effectiveUrl,
        timestamp,
      };
    }
  }

  if (config.crmMockFallback) {
    return {
      success: true,
      data: getMockSlide4Data(interval),
      sourceUrl: "[Mock Fallback Mode]",
      timestamp,
      isMockFallback: true,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to fetch Slide 4 data from CRM API",
    timestamp,
  };
}

/**
 * Slide 5: Comparative Analytics
 * Queries with UTC shift hours to populate 9-hour timeline, maps slot labels to IST
 */
export async function getCrmSlide5(
  dateStr?: string,
  shiftStart = "17:30:00",
  shiftEnd = "02:30:00"
): Promise<CrmFetchResult<Slide5Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const effectiveDate = dateStr || getShiftBusinessDate();

  // Convert IST shift hours to UTC bounds for CRM database query
  const utcShiftStart = convertIstToUtcTime(shiftStart);
  const utcShiftEnd = convertIstToUtcTime(shiftEnd);

  const configuredPath = config.endpoints?.slide5 || "slides/slide5.php";
  let res = await fetchFromCrm<unknown>(
    buildEndpointUrl(configuredPath, { date: effectiveDate, shift_start: utcShiftStart, shift_end: utcShiftEnd })
  );

  if (!res.ok) {
    const fallbackPath =
      config.customEndpoints?.find((e) => e.id === "slide5")?.fallbackPath ||
      "slides_analytics.php?type=slide5";
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl(fallbackPath, { date: effectiveDate, shift_start: utcShiftStart, shift_end: utcShiftEnd })
    );
  }

  if (!res.ok) {
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl("slides_analytics.php?action=slide5", { date: effectiveDate, shift_start: utcShiftStart, shift_end: utcShiftEnd })
    );
  }

  if (res.ok && res.data) {
    const parsed = Slide5ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      // Map UTC timeline slot labels back to IST display labels ("12:00 - 12:10" -> "17:30 - 17:40")
      const mappedTimeline = parsed.data.slide5.comparison_timeline.map((slot) => ({
        ...slot,
        time_label: convertUtcIntervalLabelToIst(slot.time_label),
        start_time: (slot as any).start_time ? convertUtcToIstTime((slot as any).start_time) : undefined,
        end_time: (slot as any).end_time ? convertUtcToIstTime((slot as any).end_time) : undefined,
      }));

      return {
        success: true,
        data: {
          ...parsed.data.slide5,
          comparison_timeline: mappedTimeline,
        },
        sourceUrl: res.effectiveUrl,
        timestamp,
      };
    }
  }

  if (config.crmMockFallback) {
    return {
      success: true,
      data: getMockSlide5Data(),
      sourceUrl: "[Mock Fallback Mode]",
      timestamp,
      isMockFallback: true,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to fetch Slide 5 data from CRM API",
    timestamp,
  };
}

/**
 * Campaign Daily Targets: GET from CRM API
 */
export async function getCrmCampaignTargets(
  dateStr?: string,
  status: string = "Live"
): Promise<CrmFetchResult<{ target_date: string; total_campaigns: number; campaigns: AdminCampaignTargetItem[] }>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const targetDate = dateStr || getShiftBusinessDate();

  const configuredPath = config.endpoints?.campaign_targets || "campaign_daily_targets.php";
  const queryParams: Record<string, string> = { date: targetDate };
  if (status) {
    queryParams.status = status;
  }
  const res = await fetchFromCrm<unknown>(buildEndpointUrl(configuredPath, queryParams));

  if (res.ok && res.data) {
    const parsed = CampaignDailyTargetsResponseSchema.safeParse(res.data);
    if (parsed.success) {
      let filteredCampaigns = parsed.data.campaigns;

      // Specifically filter for Live Campaigns when status = 'Live' (default):
      // WHERE c.active = 1 AND (d.status = 'Live' OR d.status IS NULL)
      // Excludes Paused, Completed, Draft, Cancelled, or Inactive
      if (status === "Live") {
        filteredCampaigns = filteredCampaigns.filter((c: any) => {
          if (c.active !== undefined && c.active !== null && Number(c.active) === 0) return false;
          const rawStatus = String((c as any).campaign_status || (c as any).status || "");
          const st = rawStatus.trim();
          if (!st) return true; // (d.status IS NULL)
          return st.toLowerCase() === "live";
        });
      }

      return {
        success: true,
        data: {
          target_date: parsed.data.target_date,
          total_campaigns: filteredCampaigns.length,
          campaigns: filteredCampaigns,
        },
        sourceUrl: res.effectiveUrl,
        timestamp,
      };
    }
  }

  if (config.crmMockFallback) {
    return {
      success: true,
      data: getMockCampaignTargets(),
      sourceUrl: "[Mock Fallback Mode]",
      timestamp,
      isMockFallback: true,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to fetch campaign targets from CRM API",
    timestamp,
  };
}

/**
 * Campaign Daily Targets: POST (Save / Allocate) to CRM API
 */
export async function saveCrmCampaignTargets(
  payload: SaveDailyTargetsPayload
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const config = await getCrmConfig();
  const configuredPath = config.endpoints?.campaign_targets || "campaign_daily_targets.php";
  const res = await fetchFromCrm<{ ok: boolean; message?: string }>(configuredPath, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (res.ok && res.data && res.data.ok) {
    return {
      ok: true,
      message: res.data.message || "Campaign daily targets saved successfully in CRM database.",
    };
  }

  if (config.crmMockFallback) {
    return {
      ok: true,
      message: "Daily targets simulated and saved in Mock Fallback mode.",
    };
  }

  return {
    ok: false,
    error: res.error || "Failed to save daily targets to CRM database.",
    message: res.error,
  };
}

/**
 * Live Recognition & Celebrations Scroller:
 * Fetches real-time Top Leads Scored, Birthdays, and Work Anniversaries from CRM API.
 */
export async function getCrmRecognition(
  dateStr?: string
): Promise<CrmFetchResult<RecognitionData>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const effectiveDate = dateStr || getShiftBusinessDate();

  // 1. Dedicated or configured endpoint for celebratory events (birthdays, anniversaries, avatars)
  const configuredPath = config.endpoints?.recognition || "slides/recognition.php";

  // Concurrently fetch:
  // - CRM Settled Incentives (daily.php) -> Authoritative settlement records if shift has ended
  // - CRM Incentive Preview (preview.php) -> Authoritative live provisional calculations for ongoing shift
  // - Recognition endpoint (recognition.php / slide1.php) -> Birthdays, anniversaries, profile photos
  // - Slide 2 endpoint (slide2.php) -> Supplemental agent profiles and avatars
  const [dailySettledRes, incentivePreviewRes, recognitionRes, slide2Res] = await Promise.all([
    fetchDailySettled({ date: effectiveDate }).catch(() => null),
    fetchIncentivePreview(effectiveDate).catch(() => null),
    fetchFromCrm<Record<string, any>>(buildEndpointUrl(configuredPath, { date: effectiveDate })).catch(() => ({ ok: false } as any)),
    fetchFromCrm<Record<string, any>>(buildEndpointUrl("slides/slide2.php", { date: effectiveDate, page: 1, limit: 100 })).catch(() => null),
  ]);

  let res = recognitionRes;
  // Fallbacks for celebratory events endpoint if recognition.php 404s
  if (!res.ok) {
    const fallbackPath =
      config.customEndpoints?.find((e) => e.id === "recognition")?.fallbackPath ||
      "slides_analytics.php?type=recognition";
    res = await fetchFromCrm<Record<string, any>>(buildEndpointUrl(fallbackPath, { date: effectiveDate })).catch(() => ({ ok: false } as any));
  }
  if (!res.ok) {
    res = await fetchFromCrm<Record<string, any>>(buildEndpointUrl("slides/slide1.php", { date: effectiveDate })).catch(() => ({ ok: false } as any));
  }

  const raw = res.ok && res.data ? res.data : {};
  const candidate =
    raw.sliders ||
    raw.recognition ||
    raw.data?.sliders ||
    raw.data?.recognition ||
    (raw.top_scorers ? raw : undefined);

  const crmMediaHost = (res.baseUrl || config.crmApiBaseUrl).replace(/\/api\/v1\/?$/, "");

  const fixAvatar = (pic?: string | null): string | null => {
    if (!pic || typeof pic !== "string" || pic.trim() === "") return null;
    if (pic.startsWith("http://") || pic.startsWith("https://")) return pic;
    return `${crmMediaHost}/${pic.replace(/^\/+/, "")}`;
  };

  // Build avatar lookup map across all available endpoints
  const avatarMap = new Map<number | string, string>();

  if (candidate) {
    if (Array.isArray(candidate.top_scorers)) {
      for (const s of candidate.top_scorers) {
        if (s.profile_pic) {
          const pic = fixAvatar(s.profile_pic);
          if (pic) {
            if (s.user_id != null) avatarMap.set(Number(s.user_id), pic);
            if (s.full_name) avatarMap.set(String(s.full_name).toLowerCase().trim(), pic);
          }
        }
      }
    }
    if (Array.isArray(candidate.ticker_items)) {
      for (const t of candidate.ticker_items) {
        if (t.profile_pic) {
          const pic = fixAvatar(t.profile_pic);
          if (pic) {
            if (t.user_id != null) avatarMap.set(Number(t.user_id), pic);
            if (t.title) avatarMap.set(String(t.title).toLowerCase().trim(), pic);
          }
        }
      }
    }
  }

  if (slide2Res?.ok && slide2Res?.data) {
    const parsedS2 = Slide2ResponseSchema.safeParse(slide2Res.data);
    if (parsedS2.success && Array.isArray(parsedS2.data.slide2?.agents)) {
      for (const s2 of parsedS2.data.slide2.agents) {
        const picRaw = s2.profile_pic || (s2 as any).avatar;
        if (picRaw) {
          const pic = fixAvatar(picRaw);
          if (pic) {
            avatarMap.set(s2.agent_id, pic);
            if (s2.agent_name) avatarMap.set(s2.agent_name.toLowerCase().trim(), pic);
          }
        }
      }
    }
  }

  // Determine authoritative source: Settled records (daily.php) vs. Live Preview (preview.php)
  const hasSettledRecords = Boolean(
    dailySettledRes?.success &&
    Array.isArray(dailySettledRes.data?.agents) &&
    dailySettledRes.data.agents.length > 0
  );

  const isSettled = hasSettledRecords;
  const isProvisional = !isSettled;

  const rawCandidateAgents: any[] = isSettled
    ? (dailySettledRes?.data?.agents || [])
    : (incentivePreviewRes?.success && Array.isArray(incentivePreviewRes.data?.agents)
        ? incentivePreviewRes.data.agents
        : []);

  interface QualifyingAchiever {
    agent_id: number;
    agent_name: string;
    role?: string;
    department?: string;
    profile_pic?: string | null;
    target_points: number;
    achieved_points: number;
    completion_percentage: number;
    total_incentive: number;
    base_incentive: number;
    slab_incentive: number;
    eligibility_status: string;
    eligibility_reason: string;
    payment_status?: string;
    is_settled: boolean;
    is_provisional: boolean;
  }

  const qualifyingAchievers: QualifyingAchiever[] = [];
  const seenAgentIds = new Set<number>();

  // Filter ONLY agents satisfying ALL 5 conditions (Section 2 & 5):
  // 1. Target points is a valid finite number
  // 2. Target points > 0
  // 3. Achieved points >= target points
  // 4. CRM eligibility status is strictly "eligible"
  // 5. Positive total incentive amount > 0
  for (const rawAg of rawCandidateAgents) {
    const target = Number(rawAg.target_points);
    const achieved = Number(rawAg.achieved_points);
    const amount = Number(rawAg.total_incentive);

    if (
      Number.isFinite(target) &&
      Number.isFinite(achieved) &&
      Number.isFinite(amount) &&
      target > 0 &&
      achieved >= target &&
      rawAg.eligibility_status === "eligible" &&
      amount > 0
    ) {
      const aId = Number(rawAg.agent_id);
      if (seenAgentIds.has(aId)) continue;
      seenAgentIds.add(aId);

      const compPct = Number(rawAg.completion_pct) || (target > 0 ? (achieved / target) * 100 : 100);
      const pic =
        avatarMap.get(aId) ||
        avatarMap.get(String(rawAg.agent_name || "").toLowerCase().trim()) ||
        rawAg.profile_pic ||
        null;

      const base = Number(rawAg.base_incentive) || 0;
      const slab = Number(rawAg.slab_incentive) || Math.max(0, amount - base);

      qualifyingAchievers.push({
        agent_id: aId,
        agent_name: rawAg.agent_name || `Agent ${aId}`,
        role: rawAg.role || "operations_agent",
        department: rawAg.department || "Operations",
        profile_pic: fixAvatar(pic),
        target_points: target,
        achieved_points: achieved,
        completion_percentage: compPct,
        total_incentive: amount,
        base_incentive: base,
        slab_incentive: slab,
        eligibility_status: "eligible",
        eligibility_reason: rawAg.eligibility_reason || "Target achieved and compliance verified",
        payment_status: rawAg.payment_status,
        is_settled: isSettled,
        is_provisional: isProvisional,
      });
    }
  }

  // Sort qualifying achievers: Highest achieved points first, then completion percentage
  qualifyingAchievers.sort((a, b) => {
    if (b.achieved_points !== a.achieved_points) {
      return b.achieved_points - a.achieved_points;
    }
    return b.completion_percentage - a.completion_percentage;
  });

  const ticker_items: any[] = [];

  // Generate standardized ticker cards for qualifying achievers
  qualifyingAchievers.forEach((ag, idx) => {
    const isSuper = ag.slab_incentive > 0;
    const rankNum = idx + 1;
    const rankMedal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "⭐";
    const badge = isSuper
      ? `${rankMedal} Rank #${rankNum} • Super-Achiever (${ag.completion_percentage.toFixed(0)}%)`
      : `${rankMedal} Rank #${rankNum} • Target Achiever (100%)`;

    let eyebrow = "";
    if (ag.is_settled && ag.payment_status === "paid") {
      eyebrow = `₹${ag.total_incentive.toLocaleString("en-IN")} Paid Incentive`;
    } else if (ag.is_settled) {
      eyebrow = `₹${ag.total_incentive.toLocaleString("en-IN")} Earned Incentive`;
    } else {
      eyebrow = `₹${ag.total_incentive.toLocaleString("en-IN")} Provisional Earnings`;
    }

    const subtitle = isSuper
      ? `${ag.completion_percentage.toFixed(0)}% Quota Achieved (${ag.achieved_points} / ${ag.target_points} Pts) • ₹${ag.slab_incentive.toLocaleString("en-IN")} Slab Accelerator`
      : `${ag.completion_percentage.toFixed(0)}% Quota Achieved (${ag.achieved_points} / ${ag.target_points} Pts)`;

    const message = isSuper
      ? `Daily quota target exceeded by ${(ag.achieved_points - ag.target_points).toFixed(1)} points! Outstanding execution.`
      : `Daily quota target successfully achieved today! Outstanding execution.`;

    ticker_items.push({
      id: `achiever-${ag.agent_id}`,
      type: "top_lead_scorer",
      icon: "trophy",
      badge,
      eyebrow,
      title: ag.agent_name,
      subtitle,
      message,
      accent: isSuper ? "emerald" : "amber",
      user_id: ag.agent_id,
      profile_pic: ag.profile_pic,
      score: ag.achieved_points,
      rank: rankNum,
      incentive_amount: ag.total_incentive,
      base_incentive: ag.base_incentive,
      slab_incentive: ag.slab_incentive,
      target_points: ag.target_points,
      achieved_points: ag.achieved_points,
      completion_percentage: ag.completion_percentage,
      is_target_met: true,
      is_settled: ag.is_settled,
      is_provisional: ag.is_provisional,
      payment_status: ag.payment_status,
      eligibility_status: ag.eligibility_status,
      eligibility_reason: ag.eligibility_reason,
    });
  });

  const targetDate = candidate?.target_date || effectiveDate;
  const targetMonthDay = targetDate.slice(5, 10); // "MM-DD"

  const isDateMatchingToday = (d?: string | null): boolean => {
    if (!d || typeof d !== "string") return false;
    const clean = d.trim();
    if (clean.length >= 10 && clean.slice(5, 10) === targetMonthDay) return true;
    if (clean.length === 5 && clean === targetMonthDay) return true;
    return false;
  };

  const scope = config.recognitionDisplayScope || "daily";

  const birthdays = (Array.isArray(candidate?.birthdays) ? candidate.birthdays : [])
    .map((b: any) => ({
      ...b,
      profile_pic: fixAvatar(b.profile_pic),
      is_today: isDateMatchingToday(b.date_of_birth) || b.is_today === true,
    }))
    .filter((b: any) => (scope === "daily" ? b.is_today === true : true));

  const anniversaries = (Array.isArray(candidate?.anniversaries) ? candidate.anniversaries : [])
    .map((a: any) => ({
      ...a,
      profile_pic: fixAvatar(a.profile_pic),
      is_today: isDateMatchingToday(a.date_of_joining) || a.is_today === true,
    }))
    .filter((a: any) => (scope === "daily" ? a.is_today === true : true));

  // Add authentic birthdays
  birthdays.forEach((b: any, idx: number) => {
    ticker_items.push({
      id: `bday-${b.user_id || idx}`,
      type: "birthday",
      icon: "cake",
      badge: "🎂 Celebrating Birthday Today!",
      eyebrow: "Birthday Celebration",
      title: `Happy Birthday, ${b.full_name}!`,
      subtitle: b.department || b.role || "Operations Team",
      message: "Wishing you a joyful celebration and a year full of achievements!",
      accent: "rose",
      user_id: Number(b.user_id) || undefined,
      profile_pic: b.profile_pic,
      is_today: true,
    });
  });

  // Add authentic work anniversaries
  anniversaries.forEach((a: any, idx: number) => {
    const yrs = Number(a.years_completed) || 1;
    ticker_items.push({
      id: `anni-${a.user_id || idx}`,
      type: "anniversary",
      icon: "award",
      badge: `🌟 ${yrs} Year${yrs > 1 ? "s" : ""} Work Anniversary!`,
      eyebrow: "Work Anniversary Today",
      title: `Happy Work Anniversary, ${a.full_name}!`,
      subtitle: `${yrs} Year${yrs > 1 ? "s" : ""} of Excellence & Dedication`,
      message: "Thank you for your valuable dedication, consistency, and hard work.",
      accent: "cyan",
      user_id: Number(a.user_id) || undefined,
      profile_pic: a.profile_pic,
      years: yrs,
      is_today: true,
    });
  });



  // Top scorers list strictly maps qualifying achievers
  const finalTopScorers = qualifyingAchievers.map((ag) => ({
    user_id: ag.agent_id,
    full_name: ag.agent_name,
    role: ag.role || null,
    department: ag.department || null,
    profile_pic: ag.profile_pic || null,
    generated_leads: ag.achieved_points,
    qualified_leads: ag.achieved_points,
  }));

  const recognitionData: RecognitionData = {
    target_date: targetDate,
    total_items: ticker_items.length,
    top_scorers_count: qualifyingAchievers.length,
    birthdays_count: birthdays.length,
    anniversaries_count: anniversaries.length,
    top_scorers: finalTopScorers,
    birthdays,
    anniversaries,
    ticker_items,
  };

  return {
    success: true,
    data: recognitionData,
    sourceUrl: `${res.baseUrl || config.crmApiBaseUrl}/slides/recognition.php`,
    timestamp,
  };
}

/**
 * Universal dynamic API dispatcher for any newly created or custom upstream endpoint
 */
export async function getCrmCustomApi<T = unknown>(
  endpointIdOrPath: string,
  extraParams?: Record<string, string | number | undefined>,
  options?: RequestInit
): Promise<CrmFetchResult<T>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();

  const configured = config.customEndpoints?.find((e) => e.id === endpointIdOrPath);
  let targetPath = configured ? configured.path : endpointIdOrPath;
  targetPath = buildEndpointUrl(targetPath, extraParams);

  let res = await fetchFromCrm<T>(targetPath, options);

  if (!res.ok && configured?.fallbackPath) {
    const fallbackPath = buildEndpointUrl(configured.fallbackPath, extraParams);
    res = await fetchFromCrm<T>(fallbackPath, options);
  }

  if (res.ok && res.data) {
    return {
      success: true,
      data: res.data,
      sourceUrl: res.effectiveUrl,
      timestamp,
    };
  }

  return {
    success: false,
    error: res.error || `Failed to fetch API from CRM: ${targetPath}`,
    timestamp,
  };
}

