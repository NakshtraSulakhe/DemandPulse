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

/**
 * Low-level HTTP requester to DemandFlow CRM PHP API
 * Dynamically resolves URL, timeout, and authentication from Admin Config
 */
async function fetchFromCrm<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs?: number
): Promise<{ ok: boolean; status: number; data?: T; error?: string; baseUrl: string }> {
  const config = await getCrmConfig();
  const baseUrl = config.crmApiBaseUrl.replace(/\/+$/, "");
  const effectiveTimeout = timeoutMs || config.crmApiTimeoutMs || 30000;
  const url = `${baseUrl}/${endpoint.replace(/^\/+/, "")}`;

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
    const res = await fetch(url, {
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
      };
    }

    const json = await res.json();
    return { ok: true, status: res.status, data: json as T, baseUrl };
  } catch (err: unknown) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.toLowerCase().includes("aborted");
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      error: isTimeout
        ? `CRM request timed out after ${effectiveTimeout}ms at ${url}`
        : `Failed to connect to CRM API at ${url} (${message})`,
      baseUrl,
    };
  }
}

/**
 * Slide 1: Operations Overview (KPIs, Campaigns Table, Late Comers)
 */
export async function getCrmSlide1(dateStr?: string): Promise<CrmFetchResult<Slide1Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const query = dateStr ? `?date=${encodeURIComponent(dateStr)}` : "";

  // 1. Try direct endpoint slides/slide1.php
  let res = await fetchFromCrm<unknown>(`slides/slide1.php${query}`);

  // 2. Fallback to unified master endpoint if direct endpoint returns 404
  if (!res.ok && res.status === 404) {
    const actionQuery = dateStr ? `?action=slide1&date=${encodeURIComponent(dateStr)}` : "?action=slide1";
    res = await fetchFromCrm<unknown>(`slides_analytics.php${actionQuery}`);
  }

  if (res.ok && res.data) {
    const parsed = Slide1ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      return {
        success: true,
        data: parsed.data.slide1,
        sourceUrl: `${res.baseUrl}/slides/slide1.php`,
        timestamp,
      };
    }
  }

  // If CRM fails and Mock Fallback is enabled
  if (config.crmMockFallback) {
    return {
      success: true,
      data: getMockSlide1Data(dateStr),
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
 */
export async function getCrmSlide2(
  dateStr?: string,
  page: number = 1,
  limit: number | string = 10
): Promise<CrmFetchResult<Slide2Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const params = new URLSearchParams();
  if (dateStr) params.set("date", dateStr);
  params.set("page", String(page));
  params.set("limit", String(limit));

  let res = await fetchFromCrm<unknown>(`slides/slide2.php?${params.toString()}`);

  if (!res.ok && res.status === 404) {
    params.set("action", "slide2");
    res = await fetchFromCrm<unknown>(`slides_analytics.php?${params.toString()}`);
  }

  if (res.ok && res.data) {
    const parsed = Slide2ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      return {
        success: true,
        data: parsed.data.slide2,
        sourceUrl: `${res.baseUrl}/slides/slide2.php`,
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
 */
export async function getCrmSlide3(
  dateStr?: string,
  interval = 10,
  shiftStart = "09:30:00",
  shiftEnd = "18:30:00"
): Promise<CrmFetchResult<Slide3Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const params = new URLSearchParams();
  if (dateStr) params.set("date", dateStr);
  params.set("interval", String(interval));
  params.set("shift_start", shiftStart);
  params.set("shift_end", shiftEnd);

  let res = await fetchFromCrm<unknown>(`slides/slide3.php?${params.toString()}`);

  if (!res.ok && res.status === 404) {
    params.set("action", "slide3");
    res = await fetchFromCrm<unknown>(`slides_analytics.php?${params.toString()}`);
  }

  if (res.ok && res.data) {
    const parsed = Slide3ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      return {
        success: true,
        data: parsed.data.slide3,
        sourceUrl: `${res.baseUrl}/slides/slide3.php`,
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
 */
export async function getCrmSlide4(
  dateStr?: string,
  interval = 10,
  shiftStart = "09:30:00",
  shiftEnd = "18:30:00"
): Promise<CrmFetchResult<Slide4Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const params = new URLSearchParams();
  if (dateStr) params.set("date", dateStr);
  params.set("interval", String(interval));
  params.set("shift_start", shiftStart);
  params.set("shift_end", shiftEnd);

  let res = await fetchFromCrm<unknown>(`slides/slide4.php?${params.toString()}`);

  if (!res.ok && res.status === 404) {
    params.set("action", "slide4");
    res = await fetchFromCrm<unknown>(`slides_analytics.php?${params.toString()}`);
  }

  if (res.ok && res.data) {
    const parsed = Slide4ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      return {
        success: true,
        data: parsed.data.slide4,
        sourceUrl: `${res.baseUrl}/slides/slide4.php`,
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
 */
export async function getCrmSlide5(dateStr?: string): Promise<CrmFetchResult<Slide5Data>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const query = dateStr ? `?date=${encodeURIComponent(dateStr)}` : "";

  let res = await fetchFromCrm<unknown>(`slides/slide5.php${query}`);

  if (!res.ok && res.status === 404) {
    const actionQuery = dateStr ? `?action=slide5&date=${encodeURIComponent(dateStr)}` : "?action=slide5";
    res = await fetchFromCrm<unknown>(`slides_analytics.php${actionQuery}`);
  }

  if (res.ok && res.data) {
    const parsed = Slide5ResponseSchema.safeParse(res.data);
    if (parsed.success) {
      return {
        success: true,
        data: parsed.data.slide5,
        sourceUrl: `${res.baseUrl}/slides/slide5.php`,
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
  dateStr?: string
): Promise<CrmFetchResult<{ target_date: string; total_campaigns: number; campaigns: AdminCampaignTargetItem[] }>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const targetDate = dateStr || new Date().toISOString().split("T")[0];
  const res = await fetchFromCrm<unknown>(`campaign_daily_targets.php?date=${encodeURIComponent(targetDate)}`);

  if (res.ok && res.data) {
    const parsed = CampaignDailyTargetsResponseSchema.safeParse(res.data);
    if (parsed.success) {
      return {
        success: true,
        data: {
          target_date: parsed.data.target_date,
          total_campaigns: parsed.data.total_campaigns,
          campaigns: parsed.data.campaigns,
        },
        sourceUrl: `${res.baseUrl}/campaign_daily_targets.php`,
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
  const res = await fetchFromCrm<{ ok: boolean; message?: string }>("campaign_daily_targets.php", {
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
 * Live Recognition & Celebrations Scroller
/**
 * Live Recognition & Celebrations Scroller:
 * Fetches real-time Top Leads Scored, Birthdays, and Work Anniversaries from CRM API.
 * Never serves hardcoded mock data.
 */
export async function getCrmRecognition(
  dateStr?: string
): Promise<CrmFetchResult<RecognitionData>> {
  const config = await getCrmConfig();
  const timestamp = new Date().toISOString();
  const query = dateStr ? `?date=${encodeURIComponent(dateStr)}` : "";

  // 1. Dedicated endpoint slides/recognition.php
  let res = await fetchFromCrm<Record<string, any>>(`slides/recognition.php${query}`);

  // 2. Fallback to unified master endpoint if 404
  if (!res.ok && res.status === 404) {
    const actionQuery = dateStr
      ? `?action=recognition&date=${encodeURIComponent(dateStr)}`
      : "?action=recognition";
    res = await fetchFromCrm<Record<string, any>>(`slides_analytics.php${actionQuery}`);
  }

  // 3. Fallback to slides/slide1.php which also includes the sliders payload
  if (!res.ok) {
    res = await fetchFromCrm<Record<string, any>>(`slides/slide1.php${query}`);
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

      const targetDate = candidate.target_date || dateStr || new Date().toISOString().split("T")[0];
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
