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
import {
  getMockSlide1Data,
  getMockSlide2Data,
  getMockSlide3Data,
  getMockSlide4Data,
  getMockSlide5Data,
  getMockRecognitionData,
  getMockCampaignTargets,
} from "@/lib/crm-mock-data";

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

  // 1. Try dynamically configured path for Slide 1 with status=Live
  const configuredPath = config.endpoints?.slide1 || "slides/slide1.php";
  let res = await fetchFromCrm<unknown>(buildEndpointUrl(configuredPath, { date: effectiveDate, status: "Live" }));

  // 2. Fallback to configured fallback or slides_analytics.php?type=slide1
  if (!res.ok) {
    const fallbackPath =
      config.customEndpoints?.find((e) => e.id === "slide1")?.fallbackPath ||
      "slides_analytics.php?type=slide1";
    res = await fetchFromCrm<unknown>(buildEndpointUrl(fallbackPath, { date: effectiveDate, status: "Live" }));
  }

  // 3. Fallback to action=slide1 if needed
  if (!res.ok) {
    res = await fetchFromCrm<unknown>(buildEndpointUrl("slides_analytics.php?action=slide1", { date: effectiveDate, status: "Live" }));
  }

  if (res.ok && res.data) {
    const parsed = Slide1ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      // Enforce strict Live filter: c.active = 1 AND (d.status = 'Live' OR d.status IS NULL)
      // Paused, Completed, Draft, or Cancelled campaigns are excluded from Slide 1
      const liveOnlyCampaigns = parsed.data.slide1.campaigns.filter((c: any) => {
        if (c.active !== undefined && c.active !== null && Number(c.active) === 0) return false;
        const st = (c.campaign_status || c.status || "").trim();
        if (!st) return true; // (d.status IS NULL)
        return st.toLowerCase() === "live";
      });

      return {
        success: true,
        data: {
          ...parsed.data.slide1,
          campaigns: liveOnlyCampaigns,
        },
        sourceUrl: res.effectiveUrl,
        timestamp,
      };
    }
  }

  // If CRM fails and Mock Fallback is enabled
  if (config.crmMockFallback) {
    return {
      success: true,
      data: getMockSlide1Data(effectiveDate),
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
  limit: number | string = 10
): Promise<CrmFetchResult<Slide2Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const effectiveDate = dateStr || getShiftBusinessDate();

  const configuredPath = config.endpoints?.slide2 || "slides/slide2.php";
  let res = await fetchFromCrm<unknown>(
    buildEndpointUrl(configuredPath, { date: effectiveDate, page, limit })
  );

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
      // Sort agents by lead generated count descending (highest lead generators on top)
      const sortedAgents = [...parsed.data.slide2.agents].sort((a, b) => {
        const diff = (b.generated_leads ?? 0) - (a.generated_leads ?? 0);
        if (diff !== 0) return diff;
        const ptsDiff = (b.achieved_points ?? 0) - (a.achieved_points ?? 0);
        if (ptsDiff !== 0) return ptsDiff;
        return a.agent_name.localeCompare(b.agent_name);
      });

      return {
        success: true,
        data: {
          ...parsed.data.slide2,
          agents: sortedAgents,
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
      // Map UTC interval labels back to IST display labels ("12:00 - 12:10" -> "17:30 - 17:40")
      const mappedHeatmap = parsed.data.slide3.qa_heatmap.map((analyst) => ({
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
          const st = (c.campaign_status || c.status || "").trim();
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

  // 1. Dedicated or configured endpoint
  const configuredPath = config.endpoints?.recognition || "slides/recognition.php";
  let res = await fetchFromCrm<Record<string, any>>(buildEndpointUrl(configuredPath, { date: effectiveDate }));

  // 2. Fallback to unified master endpoint if 404
  if (!res.ok) {
    const fallbackPath =
      config.customEndpoints?.find((e) => e.id === "recognition")?.fallbackPath ||
      "slides_analytics.php?type=recognition";
    res = await fetchFromCrm<Record<string, any>>(buildEndpointUrl(fallbackPath, { date: effectiveDate }));
  }

  // 3. Fallback to slide1.php
  if (!res.ok) {
    res = await fetchFromCrm<Record<string, any>>(buildEndpointUrl("slides/slide1.php", { date: effectiveDate }));
  }

  if (res.ok && res.data) {
    const raw = res.data;
    // Extract candidate: sliders, recognition, data.sliders, or data.recognition
    const candidate =
      raw.sliders ||
      raw.recognition ||
      raw.data?.sliders ||
      raw.data?.recognition ||
      (raw.top_scorers ? raw : undefined);

    if (candidate) {
      const crmMediaHost = (res.baseUrl || config.crmApiBaseUrl).replace(/\/api\/v1\/?$/, "");

      const fixAvatar = (pic?: string | null): string | null => {
        if (!pic || typeof pic !== "string" || pic.trim() === "") return null;
        if (pic.startsWith("http://") || pic.startsWith("https://")) return pic;
        return `${crmMediaHost}/${pic.replace(/^\/+/, "")}`;
      };

      const targetDate = candidate.target_date || effectiveDate;
      const targetMonthDay = targetDate.slice(5, 10); // "MM-DD" e.g. "10-22"

      const isDateMatchingToday = (d?: string | null): boolean => {
        if (!d || typeof d !== "string") return false;
        const clean = d.trim();
        if (clean.length >= 10 && clean.slice(5, 10) === targetMonthDay) return true;
        if (clean.length === 5 && clean === targetMonthDay) return true;
        return false;
      };

      const scope = config.recognitionDisplayScope || "daily";

      const top_scorers = Array.isArray(candidate.top_scorers)
        ? candidate.top_scorers.map((s: any) => ({
            ...s,
            profile_pic: fixAvatar(s.profile_pic),
          }))
        : [];

      // Daily filter: only include birthdays that occur ON TODAY (MM-DD match or is_today flag)
      const birthdays = (Array.isArray(candidate.birthdays) ? candidate.birthdays : [])
        .map((b: any) => ({
          ...b,
          profile_pic: fixAvatar(b.profile_pic),
          is_today: isDateMatchingToday(b.date_of_birth) || b.is_today === true,
        }))
        .filter((b: any) => {
          if (scope === "daily") {
            return b.is_today === true;
          }
          return true;
        });

      // Daily filter: only include work anniversaries that occur ON TODAY
      const anniversaries = (Array.isArray(candidate.anniversaries) ? candidate.anniversaries : [])
        .map((a: any) => ({
          ...a,
          profile_pic: fixAvatar(a.profile_pic),
          is_today: isDateMatchingToday(a.date_of_joining) || a.is_today === true,
        }))
        .filter((a: any) => {
          if (scope === "daily") {
            return a.is_today === true;
          }
          return true;
        });

      // Filter precomputed ticker items or construct them dynamically from filtered daily data
      let ticker_items: any[] = [];

      if (Array.isArray(candidate.ticker_items) && candidate.ticker_items.length > 0) {
        ticker_items = candidate.ticker_items
          .map((t: any) => ({
            ...t,
            profile_pic: fixAvatar(t.profile_pic),
          }))
          .filter((t: any) => {
            if (t.type === "top_lead_scorer") return true;
            if (scope === "daily") {
              if (t.type === "birthday") {
                const bdayUser = candidate.birthdays?.find((b: any) => String(b.user_id) === String(t.user_id));
                return t.is_today === true || isDateMatchingToday(bdayUser?.date_of_birth);
              }
              if (t.type === "anniversary") {
                const anniUser = candidate.anniversaries?.find((a: any) => String(a.user_id) === String(t.user_id));
                return t.is_today === true || isDateMatchingToday(anniUser?.date_of_joining);
              }
            }
            return true;
          });
      }

      // If ticker_items is empty (or non-today items were filtered out), build them dynamically
      if (ticker_items.length === 0) {
        top_scorers.forEach((s: any, idx: number) => {
          ticker_items.push({
            id: `top-${s.user_id || idx}`,
            type: "top_lead_scorer",
            icon: "trophy",
            badge: idx === 0 ? "🥇 Rank #1 Top Scorer" : idx === 1 ? "🥈 Rank #2 Top Scorer" : idx === 2 ? "🥉 Rank #3 Top Scorer" : `⭐ Rank #${idx + 1} Top Scorer`,
            eyebrow: "Daily Top Leads Scored",
            title: s.full_name,
            subtitle: `${s.qualified_leads || 0} Qualified Leads • ${s.generated_leads || 0} Total Generated`,
            message: "High productivity milestone & quality qualification turnaround.",
            accent: "amber",
            user_id: Number(s.user_id) || undefined,
            profile_pic: s.profile_pic,
            score: Number(s.qualified_leads) || 0,
            rank: idx + 1,
          });
        });

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
      }

      const recognitionData: RecognitionData = {
        target_date: targetDate,
        total_items: ticker_items.length,
        top_scorers_count: top_scorers.length,
        birthdays_count: birthdays.length,
        anniversaries_count: anniversaries.length,
        top_scorers,
        birthdays,
        anniversaries,
        ticker_items,
      };

      return {
        success: true,
        data: recognitionData,
        sourceUrl: `${res.baseUrl}/slides/recognition.php`,
        timestamp,
      };
    }
  }

  // Strict: No hardcoded data returned
  return {
    success: false,
    error: res.error || "Failed to fetch live recognition sliders from CRM API",
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

