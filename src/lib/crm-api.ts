import {
  Slide1Data,
  Slide2Data,
  Slide3Data,
  Slide4Data,
  Slide5Data,
  Slide6Data,
  FormSubmissionLead,
  FormSubmitterInterval,
  FormSubmitterHeatmapItem,
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
  Slide6ResponseSchema,
  CampaignDailyTargetsResponseSchema,
  RecognitionResponseSchema,
} from "@/lib/validations";
import { getCrmConfig } from "@/lib/crm-config";
import { getShiftBusinessDate, generateShiftIntervals } from "@/lib/shift/engine";
import { evaluateAgentLatePunch } from "@/lib/shift/late-punches";
import { getShiftConfig } from "@/lib/shift/config";
import { fetchIncentivePreview, fetchDailySettled } from "@/lib/incentives/api";
import {
  getIncentiveConfig,
  calculateIncentiveBreakdown,
  DEFAULT_INCENTIVE_CONFIG,
} from "@/lib/incentives/rules-config";
import { getAllocationsMapForDate } from "@/lib/db/allocations";
import { getAgentAttendanceSnapshotsForDate } from "@/lib/db/attendance-repository";
import { getAgentSnapshotsForDate } from "@/lib/db/agent-productivity-repository";
import {
  getMockSlide1Data,
  getMockSlide2Data,
  getMockSlide3Data,
  getMockSlide4Data,
  getMockSlide5Data,
  getMockSlide6Data,
  getMockRecognitionData,
  getMockCampaignTargets,
} from "@/lib/crm-mock-data";
import {
  QaAuditsApiResponse,
  QaAnalystAuditData,
} from "@/types/qa-incentives";
import {
  calculateCampaignTargetPoints,
  calculateFloorCapacityPoints,
  calculateCapacityGap,
  getExampleBenchmarkDataset,
  isAgentPresentForFloorCapacity,
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

  let cleanPath = endpointOrPath.replace(/^\/+/, "");
  if (cleanPath.startsWith("api/v1/") && baseUrl.endsWith("/api/v1")) {
    cleanPath = cleanPath.substring(7);
  }
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

      // Fetch active shift configuration (e.g. 17:30:00, grace period)
      const shiftConfig = await getShiftConfig();
      const defaultShiftStart = shiftConfig.startTime || "17:30:00";
      const defaultGrace = shiftConfig.gracePeriodMinutes ?? 0;

      // Evaluate late comers from CRM against their configured shift timing
      const evaluatedCrmLate: any[] = [];
      for (const l of parsed.data.slide1.late_comers || []) {
        const evalResult = evaluateAgentLatePunch(l, defaultShiftStart, defaultGrace);
        if (evalResult) {
          evaluatedCrmLate.push(evalResult);
        }
      }

      // Merge with MySQL attendance snapshots if available
      const dbLateSnapshots = await getAgentAttendanceSnapshotsForDate(effectiveDate).catch(() => []);
      const evaluatedDbLate: any[] = [];
      for (const s of dbLateSnapshots) {
        const evalResult = evaluateAgentLatePunch(
          {
            crm_agent_id: s.crm_agent_id,
            agent_name_snapshot: s.agent_name_snapshot,
            punch_in_at: s.punch_in_at,
            shift_start_time: defaultShiftStart,
            grace_minutes: defaultGrace,
            late_minutes: s.late_minutes,
            attendance_status: s.attendance_status,
          },
          defaultShiftStart,
          defaultGrace
        );
        if (evalResult) {
          evaluatedDbLate.push(evalResult);
        }
      }

      const seenLateIds = new Set<number>();
      const finalLateComers: any[] = [];
      for (const item of [...evaluatedCrmLate, ...evaluatedDbLate]) {
        if (!seenLateIds.has(item.user_id)) {
          seenLateIds.add(item.user_id);
          finalLateComers.push(item);
        }
      }

      finalLateComers.sort((a, b) => (b.late_minutes || 0) - (a.late_minutes || 0));

      const updatedKpiCards = {
        ...parsed.data.slide1.kpi_cards,
        late_today: finalLateComers.length,
      };

      return {
        success: true,
        data: {
          ...parsed.data.slide1,
          kpi_cards: updatedKpiCards,
          late_comers: finalLateComers,
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
    buildEndpointUrl(configuredPath, { date: effectiveDate, page: 1, limit: 100 })
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
      const attendanceMap = new Map<number | string, { attendance_status: string; is_present: boolean }>();
      if (incentiveRes?.success && Array.isArray(incentiveRes.data?.agents)) {
        for (const ag of incentiveRes.data.agents) {
          if (ag.agent_id != null) {
            const isPres = isAgentPresentForFloorCapacity(ag.attendance_status, ag.is_present);
            const entry = {
              attendance_status: ag.attendance_status || (isPres ? "Present" : "Absent"),
              is_present: isPres,
            };
            attendanceMap.set(Number(ag.agent_id), entry);
            if (ag.agent_name) {
              attendanceMap.set(ag.agent_name.toLowerCase().trim(), entry);
            }
          }
        }
      }

      // Fallback 1: Database agent snapshots if attendanceMap is empty
      if (attendanceMap.size === 0) {
        try {
          const dbSnaps = await getAgentSnapshotsForDate(effectiveDate).catch(() => []);
          for (const s of dbSnaps) {
            const isPres = isAgentPresentForFloorCapacity(s.attendance_status_snapshot);
            const entry = {
              attendance_status: s.attendance_status_snapshot || (isPres ? "Present" : "Absent"),
              is_present: isPres,
            };
            attendanceMap.set(s.crm_agent_id, entry);
            if (s.agent_name_snapshot) {
              attendanceMap.set(s.agent_name_snapshot.toLowerCase().trim(), entry);
            }
          }
        } catch {}
      }

      // Fallback 2: Database attendance snapshots if attendanceMap is still empty
      if (attendanceMap.size === 0) {
        try {
          const dbAtt = await getAgentAttendanceSnapshotsForDate(effectiveDate).catch(() => []);
          for (const a of dbAtt) {
            const isPres = isAgentPresentForFloorCapacity(a.attendance_status);
            const entry = {
              attendance_status: a.attendance_status || (isPres ? "Present" : "Absent"),
              is_present: isPres,
            };
            attendanceMap.set(a.crm_agent_id, entry);
            if (a.agent_name_snapshot) {
              attendanceMap.set(a.agent_name_snapshot.toLowerCase().trim(), entry);
            }
          }
        } catch {}
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

      const pageSize = limit === "all" ? sortedAgents.length : (Number(limit) || 10);
      const startIndex = (page - 1) * pageSize;
      const paginatedAgents = sortedAgents.slice(startIndex, startIndex + pageSize);

      return {
        success: true,
        data: {
          ...parsed.data.slide2,
          total_agents: floorCapacityResult.total_agents,
          page,
          limit: Number(limit) || 10,
          total_pages: Math.ceil(sortedAgents.length / pageSize) || 1,
          agents: paginatedAgents,
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

      // Synchronize with authoritative operational shift audit metrics from qa_audits.php
      // Ensures Slide 3 and the Incentive Calculation page (/admin/incentives) show identical counts
      const shiftStartUtcStr = `${effectiveDate} ${utcShiftStart}`;
      const shiftEndUtcStr = `${effectiveDate} ${utcShiftEnd}`;

      const qaAuditsRes = await getCrmQaAudits({ date: effectiveDate, include_leads: 1 }).catch(() => ({
        success: false,
        data: undefined,
      }));

      const rawQa =
        (qaAuditsRes?.data as any)?.qa_audits ||
        (qaAuditsRes?.data as any)?.data ||
        qaAuditsRes?.data;
      const qaAnalystsList = rawQa?.qa_analysts || rawQa?.qa_users || [];
      const qaMetricsMap = new Map<number, { totalAudited: number; qualified: number; disqualified: number }>();

      if (Array.isArray(qaAnalystsList) && qaAnalystsList.length > 0) {
        for (const a of qaAnalystsList) {
          const id = Number(a.user_id || a.qa_id || a.id);
          if (!id || id === 151 || id === 99) continue;
          let leads = (a.audited_leads || []).filter((l: any) => {
            const t = l.reviewed_at || l.created_at || "";
            return t >= shiftStartUtcStr && t <= shiftEndUtcStr;
          });

          // Sort ascending chronologically so newest action defines final state
          leads.sort((x: any, y: any) =>
            (x.reviewed_at || x.created_at || "").localeCompare(y.reviewed_at || y.created_at || "")
          );

          const uniqueMap = new Map<number | string, any>();
          leads.forEach((l: any) => {
            const leadKey = l.lead_id || l.lead_code || l.id;
            if (leadKey) uniqueMap.set(leadKey, l);
          });

          const uniqueList = Array.from(uniqueMap.values());
          const qual = uniqueList.filter((l: any) => String(l.qa_status).toLowerCase() === "qualified").length;
          const disq = uniqueList.filter((l: any) => String(l.qa_status).toLowerCase() === "disqualified").length;

          qaMetricsMap.set(id, {
            totalAudited: uniqueMap.size,
            qualified: qual,
            disqualified: disq,
          });
        }
      }

      // Map UTC interval labels back to IST display labels ("12:00 - 12:10" -> "17:30 - 17:40")
      // and attach verified shift audit counts
      const mappedHeatmap = targetHeatmap.map((analyst) => {
        const stats = qaMetricsMap.get(Number(analyst.user_id));
        const totalAudited = stats ? stats.totalAudited : (analyst.total_audited || 0);
        const totalQualified = stats ? stats.qualified : (analyst.total_qualified || 0);

        return {
          ...analyst,
          total_audited: totalAudited,
          total_qualified: totalQualified,
          intervals: analyst.intervals.map((inv) => ({
            ...inv,
            time_label: convertUtcIntervalLabelToIst(inv.time_label),
          })),
        };
      });

      // Sort analysts by verified shift total audited descending
      mappedHeatmap.sort((a, b) => (b.total_audited || 0) - (a.total_audited || 0));

      const floorTotalAudited = mappedHeatmap.reduce((sum, a) => sum + (a.total_audited || 0), 0);
      const floorTotalQualified = mappedHeatmap.reduce((sum, a) => sum + (a.total_qualified || 0), 0);
      const floorTotalDisqualified = Array.from(qaMetricsMap.values()).reduce((sum, v) => sum + v.disqualified, 0);

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
          today_audited: floorTotalAudited > 0 ? floorTotalAudited : todayAudited,
          today_qualified: floorTotalQualified > 0 ? floorTotalQualified : todayQualified,
          today_disqualified: floorTotalDisqualified > 0 ? floorTotalDisqualified : todayDisqualified,
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

      const rawAny = res.data as any;
      const formSubmissions = rawAny?.form_submissions || (parsed.data as any)?.form_submissions;

      return {
        success: true,
        data: {
          ...parsed.data.slide5,
          comparison_timeline: mappedTimeline,
          form_submissions: formSubmissions,
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
 * Slide 6: Form Submissions Productivity Heatmap
 * Connects to slides/forms.php, slides_analytics.php?action=forms, or slide5 fallback.
 * Generates exact intervals across the 9-hour shift and normalizes submitter heatmap data.
 */
export async function getCrmSlide6(
  dateStr?: string,
  interval = 10,
  shiftStart = "17:30:00",
  shiftEnd = "02:30:00"
): Promise<CrmFetchResult<Slide6Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const effectiveDate = dateStr || getShiftBusinessDate();

  const utcShiftStart = convertIstToUtcTime(shiftStart);
  const utcShiftEnd = convertIstToUtcTime(shiftEnd);

  const configuredPath = config.endpoints?.slide6 || "slides/forms.php";
  let res = await fetchFromCrm<unknown>(
    buildEndpointUrl(configuredPath, { date: effectiveDate, interval, shift_start: utcShiftStart, shift_end: utcShiftEnd })
  );

  if (!res.ok) {
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl("slides_analytics.php?action=forms", { date: effectiveDate, interval, shift_start: utcShiftStart, shift_end: utcShiftEnd })
    );
  }

  if (!res.ok) {
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl("slides_analytics.php?action=form_submissions", { date: effectiveDate, interval, shift_start: utcShiftStart, shift_end: utcShiftEnd })
    );
  }

  if (!res.ok) {
    // Fallback to Slide 5 which contains form_submissions and comparison_timeline
    const slide5Path = config.endpoints?.slide5 || "slides/slide5.php";
    res = await fetchFromCrm<unknown>(
      buildEndpointUrl(slide5Path, { date: effectiveDate, shift_start: utcShiftStart, shift_end: utcShiftEnd })
    );
  }

  if (res.ok && res.data) {
    const rawData = res.data as any;
    const formSubmissions = rawData.form_submissions || rawData.slide6 || rawData.forms || rawData;

    // Generate intervals for this interval granularity
    const shiftIntervals = generateShiftIntervals(interval);
    const slotCount = shiftIntervals.length;

    // Extract submitters list
    const rawSubmitters =
      formSubmissions.by_submitter ||
      formSubmissions.submitter_heatmap ||
      formSubmissions.forms_submitted_by ||
      rawData.by_submitter ||
      [];

    // Filter submitters strictly to Department Email Marketing
    const emailMarketingSubmitters = rawSubmitters.filter((sub: any) => {
      const dept = String(sub.department || sub.dept || "").toLowerCase();
      const role = String(sub.role || "").toLowerCase();
      const name = String(sub.name || sub.full_name || sub.submitter_name || "").toLowerCase();

      // If department is specified and not email marketing, exclude
      if (dept && !dept.includes("email") && !dept.includes("marketing")) {
        return false;
      }
      // If role indicates operations calling / QA / SDR without email, exclude
      if (role && (role.includes("qa") || role.includes("sdr") || role.includes("operations") || role.includes("telemarketer"))) {
        if (!role.includes("email")) return false;
      }
      return true;
    });

    const recentSubmissions: FormSubmissionLead[] = (
      formSubmissions.recent_submissions ||
      rawData.recent_submissions ||
      []
    )
      .filter((lead: any) => {
        const dept = String(lead.department || lead.submitter_department || "").toLowerCase();
        const role = String(lead.role || lead.submitter_role || "").toLowerCase();
        if (dept && !dept.includes("email") && !dept.includes("marketing")) return false;
        if (role && (role.includes("qa") || role.includes("sdr") || role.includes("operations"))) {
          if (!role.includes("email")) return false;
        }
        return true;
      })
      .map((lead: any) => ({
        lead_id: String(lead.lead_id || lead.id || ""),
        campaign_name: lead.campaign_name || "",
        form_done: lead.form_done || "Yes",
        submitted_at: lead.submitted_at || "",
        submitted_by: lead.submitted_by ? Number(lead.submitted_by) : undefined,
        submitter_name: lead.submitter_name || "",
        department: lead.department || "Email Marketing",
      }));

    // Build or normalize submitter intervals for Email Marketing agents
    const submitterHeatmap: FormSubmitterHeatmapItem[] = emailMarketingSubmitters.map((sub: any) => {
      const userId = Number(sub.user_id || sub.id || 0);
      const name = String(sub.name || sub.full_name || sub.submitter_name || `Agent ${userId}`);
      const role = String(sub.role || "email_marketing_agent");
      const department = String(sub.department || "Email Marketing");
      const totalSubmitted = Number(sub.forms_submitted_count || sub.total_submitted || sub.count || 0);
      const leads: FormSubmissionLead[] = Array.isArray(sub.leads) ? sub.leads : [];

      let intervals: FormSubmitterInterval[] = [];

      if (Array.isArray(sub.intervals) && sub.intervals.length > 0) {
        // Map existing intervals
        intervals = sub.intervals.map((inv: any) => ({
          slot_index: Number(inv.slot_index ?? inv.index ?? 0),
          time_label: convertUtcIntervalLabelToIst(inv.time_label || inv.label || ""),
          submitted_count: Number(inv.submitted_count ?? inv.count ?? 0),
        }));
      } else {
        // Compute intervals dynamically by bucketing leads[].submitted_at into slot buckets
        const slotCounts = new Array(slotCount).fill(0);
        const [startH, startM] = shiftStart.split(":").map(Number);
        const shiftStartMins = (startH || 17) * 60 + (startM || 30);

        leads.forEach((lead) => {
          if (!lead.submitted_at) return;
          const dateObj = new Date(lead.submitted_at.includes("T") ? lead.submitted_at : lead.submitted_at.replace(" ", "T") + "Z");
          if (!isNaN(dateObj.getTime())) {
            // IST time: UTC + 5h 30m
            const istDate = new Date(dateObj.getTime() + 5.5 * 3600 * 1000);
            const hour = istDate.getUTCHours();
            const min = istDate.getUTCMinutes();
            let leadMins = hour * 60 + min;
            if (leadMins < (shiftStartMins > 720 ? shiftStartMins - 720 : 360)) {
              leadMins += 1440;
            }
            const offsetMins = leadMins - shiftStartMins;
            if (offsetMins >= 0 && offsetMins < 540) {
              const slotIdx = Math.floor(offsetMins / interval);
              if (slotIdx >= 0 && slotIdx < slotCount) {
                slotCounts[slotIdx] += 1;
              }
            }
          }
        });

        intervals = shiftIntervals.map((slot, idx) => ({
          slot_index: idx,
          time_label: slot.label,
          submitted_count: slotCounts[idx] || 0,
        }));
      }

      return {
        user_id: userId,
        name,
        role,
        department,
        total_submitted: totalSubmitted || intervals.reduce((acc, i) => acc + i.submitted_count, 0),
        intervals,
        leads,
      };
    });

    const totalFormsSubmitted =
      submitterHeatmap.reduce((acc, s) => acc + s.total_submitted, 0) ||
      (formSubmissions.total_forms_submitted ?? 0);

    const totalSubmitters = submitterHeatmap.length;

    // Sort submitters descending by total submitted
    submitterHeatmap.sort((a, b) => b.total_submitted - a.total_submitted);

    // Timeline summary from comparison_timeline if available
    let timelineSummary: any[] | undefined = undefined;
    if (Array.isArray(rawData.slide5?.comparison_timeline)) {
      timelineSummary = rawData.slide5.comparison_timeline.map((slot: any) => ({
        slot_index: slot.slot_index,
        time_label: convertUtcIntervalLabelToIst(slot.time_label),
        forms_submitted: Number(slot.forms_submitted || 0),
        cumulative_forms_submitted: Number(slot.cumulative_forms_submitted || 0),
      }));
    }

    return {
      success: true,
      data: {
        date: effectiveDate,
        interval_minutes: interval,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        total_intervals: slotCount,
        total_submitters: totalSubmitters,
        total_forms_submitted: totalFormsSubmitted || submitterHeatmap.reduce((acc, s) => acc + s.total_submitted, 0),
        submitter_heatmap: submitterHeatmap,
        recent_submissions: recentSubmissions,
        timeline_summary: timelineSummary,
        query_date: effectiveDate,
      },
      sourceUrl: res.effectiveUrl,
      timestamp,
    };
  }

  if (config.crmMockFallback) {
    return {
      success: true,
      data: getMockSlide6Data(interval),
      sourceUrl: "[Mock Fallback Mode]",
      timestamp,
      isMockFallback: true,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to fetch form submissions heatmap data from CRM API",
    sourceUrl: res.effectiveUrl,
    timestamp,
  };
}

export const getCrmComparativeAnalytics = getCrmSlide5;
export const getCrmFormsHeatmap = getCrmSlide6;
export const getCrmFormsSlide = getCrmSlide6;

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
    const raw: any = res.data;
    const unwrapped = raw.qa_audits || raw.data || raw;
    const analysts =
      unwrapped.qa_analysts ||
      unwrapped.qa_users ||
      raw.qa_analysts ||
      raw.qa_users ||
      [];

    const normalizedData = {
      ...unwrapped,
      ok: unwrapped.ok ?? raw.ok,
      action: unwrapped.action ?? raw.action,
      frequency: unwrapped.frequency ?? raw.frequency ?? "daily",
      date: unwrapped.date ?? raw.query_date ?? (extraParams?.date ? String(extraParams.date) : ""),
      summary: unwrapped.summary ?? raw.summary,
      qa_analysts: analysts,
      total_qa_analysts: analysts.length || unwrapped.total_qa_analysts || raw.total_qa_analysts || 0,
    };

    return {
      success: true,
      data: normalizedData,
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

export interface CrmQaAuditsParams {
  date?: string;
  date_from?: string;
  date_to?: string;
  frequency?: "daily" | "monthly" | "custom";
  qa_id?: number;
  client_code?: string;
  campaign_id?: number;
  status?: string;
  include_leads?: number;
  plan_id?: number;
  base_target?: number;
  base_reward?: number;
  tiers?: string | Array<{ min: number; max?: number | null; rate: number }>;
}

/**
 * Fetches live QA Audits & Incentive calculation stream from upstream CRM API.
 * Primary: /api/v1/slides/qa_audits.php
 * Fallbacks:
 *  - /api/v1/slides_analytics.php?action=qa_audits
 *  - /api/v1/slides/qa_incentives.php
 *  - /api/v1/qa_audits.php
 */
export async function getCrmQaAudits(
  params?: CrmQaAuditsParams
): Promise<CrmFetchResult<QaAuditsApiResponse>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const effectiveDate = params?.date || getShiftBusinessDate();

  // Strict operational shift bounds: 17:30 IST (12:00:00 UTC) -> 02:30 IST (21:00:00 UTC)
  const shiftStartUtc = "12:00:00";
  const shiftEndUtc = "21:00:00";

  const queryParams: Record<string, string | number | undefined> = {
    date: effectiveDate,
    frequency: params?.frequency || "daily",
    shift_start: shiftStartUtc,
    shift_end: shiftEndUtc,
    date_from: params?.date_from || `${effectiveDate} ${shiftStartUtc}`,
    date_to: params?.date_to || `${effectiveDate} ${shiftEndUtc}`,
  };

  if (params?.qa_id) queryParams.qa_id = params.qa_id;
  if (params?.client_code) queryParams.client_code = params.client_code;
  if (params?.campaign_id) queryParams.campaign_id = params.campaign_id;
  if (params?.status) queryParams.status = params.status;
  if (params?.include_leads !== undefined) queryParams.include_leads = params.include_leads;
  if (params?.plan_id) queryParams.plan_id = params.plan_id;
  if (params?.base_target !== undefined) queryParams.base_target = params.base_target;
  if (params?.base_reward !== undefined) queryParams.base_reward = params.base_reward;
  if (params?.tiers) {
    queryParams.tiers = typeof params.tiers === "string" ? params.tiers : JSON.stringify(params.tiers);
  }

  const primaryPath = config.endpoints?.qa_audits || "slides/qa_audits.php";
  let res = await fetchFromCrm<QaAuditsApiResponse>(buildEndpointUrl(primaryPath, queryParams));

  // Fallback 1: slides_analytics.php?action=qa_audits
  if (!res.ok) {
    res = await fetchFromCrm<QaAuditsApiResponse>(
      buildEndpointUrl("slides_analytics.php?action=qa_audits", queryParams)
    );
  }

  // Fallback 2: slides/qa_incentives.php
  if (!res.ok) {
    res = await fetchFromCrm<QaAuditsApiResponse>(
      buildEndpointUrl("slides/qa_incentives.php", queryParams)
    );
  }

  // Fallback 3: qa_audits.php
  if (!res.ok) {
    res = await fetchFromCrm<QaAuditsApiResponse>(
      buildEndpointUrl("qa_audits.php", queryParams)
    );
  }

  if (res.ok && res.data) {
    const raw: any = res.data;
    const unwrapped = raw.qa_audits || raw.data || raw;
    const analysts =
      unwrapped.qa_analysts ||
      unwrapped.qa_users ||
      raw.qa_analysts ||
      raw.qa_users ||
      [];

    const normalizedData = {
      ...unwrapped,
      ok: unwrapped.ok ?? raw.ok,
      action: unwrapped.action ?? raw.action,
      frequency: unwrapped.frequency ?? raw.frequency ?? "daily",
      date: unwrapped.date ?? raw.query_date ?? (queryParams?.date ? String(queryParams.date) : ""),
      summary: unwrapped.summary ?? raw.summary,
      qa_analysts: analysts,
      total_qa_analysts: analysts.length || unwrapped.total_qa_analysts || raw.total_qa_analysts || 0,
    };

    return {
      success: true,
      data: normalizedData,
      sourceUrl: res.effectiveUrl,
      timestamp,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to fetch QA audits feed from CRM API",
    sourceUrl: res.effectiveUrl,
    timestamp,
  };
}

/**
 * Fetches all active QA incentive plans from CRM API (qa-incentives/plans.php)
 */
export async function getCrmQaPlans(): Promise<CrmFetchResult<any[]>> {
  const timestamp = new Date().toISOString();
  let res = await fetchFromCrm<any>("qa-incentives/plans.php");

  if (!res.ok) {
    res = await fetchFromCrm<any>("slides_analytics.php?action=qa_plans");
  }

  if (res.ok && res.data) {
    const raw = res.data;
    const plansList = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.plans)
      ? raw.plans
      : Array.isArray(raw.data)
      ? raw.data
      : [];
    return {
      success: true,
      data: plansList,
      sourceUrl: res.effectiveUrl,
      timestamp,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to fetch QA plans from CRM API",
    timestamp,
  };
}

/**
 * Creates a new QA incentive plan on the CRM API (POST /api/v1/qa-incentives/plans.php)
 */
export async function createCrmQaPlan(payload: any): Promise<CrmFetchResult<any>> {
  const timestamp = new Date().toISOString();
  const res = await fetchFromCrm<any>("qa-incentives/plans.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok && res.data) {
    return {
      success: true,
      data: res.data.plan || res.data,
      sourceUrl: res.effectiveUrl,
      timestamp,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to create QA plan on CRM API",
    timestamp,
  };
}

/**
 * Updates a QA incentive plan on the CRM API (PUT /api/v1/qa-incentives/plans.php?id=...)
 */
export async function updateCrmQaPlan(id: string | number, payload: any): Promise<CrmFetchResult<any>> {
  const timestamp = new Date().toISOString();
  const res = await fetchFromCrm<any>(`qa-incentives/plans.php?id=${encodeURIComponent(String(id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok && res.data) {
    return {
      success: true,
      data: res.data.plan || res.data,
      sourceUrl: res.effectiveUrl,
      timestamp,
    };
  }

  return {
    success: false,
    error: res.error || `Failed to update QA plan #${id} on CRM API`,
    timestamp,
  };
}

/**
 * Deactivates/deletes a QA incentive plan on the CRM API (DELETE /api/v1/qa-incentives/plans.php?id=...)
 */
export async function deleteCrmQaPlan(id: string | number): Promise<CrmFetchResult<any>> {
  const timestamp = new Date().toISOString();
  const res = await fetchFromCrm<any>(`qa-incentives/plans.php?id=${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });

  if (res.ok) {
    return {
      success: true,
      data: res.data,
      sourceUrl: res.effectiveUrl,
      timestamp,
    };
  }

  return {
    success: false,
    error: res.error || `Failed to delete QA plan #${id} on CRM API`,
    timestamp,
  };
}

/**
 * Invokes live QA calculation engine on CRM API (/api/v1/qa-incentives/calculate.php)
 */
export async function calculateCrmQaIncentives(params?: {
  date?: string;
  frequency?: string;
  plan_id?: string | number;
  base_target?: number;
  base_reward?: number;
  tiers?: any;
}): Promise<CrmFetchResult<any>> {
  const timestamp = new Date().toISOString();
  const queryParams: Record<string, string | number | undefined> = {
    date: params?.date || getShiftBusinessDate(),
    frequency: params?.frequency || "daily",
  };
  if (params?.plan_id) queryParams.plan_id = params.plan_id;
  if (params?.base_target !== undefined) queryParams.base_target = params.base_target;
  if (params?.base_reward !== undefined) queryParams.base_reward = params.base_reward;
  if (params?.tiers) {
    queryParams.tiers = typeof params.tiers === "string" ? params.tiers : JSON.stringify(params.tiers);
  }

  const res = await fetchFromCrm<any>(buildEndpointUrl("qa-incentives/calculate.php", queryParams));

  if (res.ok && res.data) {
    const raw: any = res.data;
    const unwrapped = raw.qa_audits || raw.data || raw;
    const analysts =
      unwrapped.qa_analysts ||
      unwrapped.qa_users ||
      raw.qa_analysts ||
      raw.qa_users ||
      [];

    const normalizedData = {
      ...unwrapped,
      ok: unwrapped.ok ?? raw.ok,
      action: unwrapped.action ?? raw.action,
      frequency: unwrapped.frequency ?? raw.frequency ?? "daily",
      date: unwrapped.date ?? raw.query_date ?? (queryParams?.date ? String(queryParams.date) : ""),
      summary: unwrapped.summary ?? raw.summary,
      qa_analysts: analysts,
      total_qa_analysts: analysts.length || unwrapped.total_qa_analysts || raw.total_qa_analysts || 0,
    };

    return {
      success: true,
      data: normalizedData,
      sourceUrl: res.effectiveUrl,
      timestamp,
    };
  }

  return {
    success: false,
    error: res.error || "Failed to calculate QA incentives via CRM API",
    timestamp,
  };
}


