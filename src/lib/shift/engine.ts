import {
  ShiftConfiguration,
  ShiftWindow,
  ShiftCurrentState,
  ShiftOperationalStatus,
  ShiftTimeInterval,
} from "@/types/shift";
import { DEFAULT_SHIFT_CONFIG } from "./constants";

/**
 * Extracts year, month, day, hours, minutes, seconds for an instant in a specific IANA timezone
 */
function getTimezoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  const hour = parseInt(map.hour, 10) % 24; // ensure 0-23
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;

  return { year, month, day, hour, minute, second, dateStr, timeStr };
}

/**
 * Formats a Date object as YYYY-MM-DD
 */
function formatDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Adds days to a YYYY-MM-DD string
 */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().split("T")[0];
}

/**
 * Normalizes user-input or URL date strings (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY) into canonical YYYY-MM-DD
 */
export function normalizeDateString(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Case 1: Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Case 2: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Case 3: YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return undefined;
}

/**
 * Returns whether US Eastern is currently in EDT or EST, and its abbreviation
 */
export function getUsEasternTimeInfo(date: Date = new Date()): {
  formatted: string;
  timeStr: string;
  abbr: "EDT" | "EST";
  offsetStr: string;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  const formatted = formatter.format(date);
  const isEdt = formatted.includes("EDT");
  const abbr: "EDT" | "EST" = isEdt ? "EDT" : "EST";
  const offsetStr = isEdt ? "UTC-04:00" : "UTC-05:00";

  const parts = getTimezoneParts(date, "America/New_York");

  return {
    formatted,
    timeStr: parts.timeStr,
    abbr,
    offsetStr,
  };
}

/**
 * Calculates the authoritative business date for any instant in time.
 * Standard Shift: 5:30 PM (17:30) to 2:30 AM (02:30) IST next day.
 * Work Continuation & Extended Hours: If shift continues past 2:30 AM due to emergencies or extended work,
 * all data remains attributed to this shift business date until morning refresh at 9:00 AM IST.
 * Morning Refresh: Exactly at 9:00 AM IST (09:00:00), the application refreshes to the new date cycle.
 */
export function getShiftBusinessDate(
  instant: Date | string = new Date(),
  config: ShiftConfiguration = DEFAULT_SHIFT_CONFIG
): string {
  const dt = typeof instant === "string" ? new Date(instant) : instant;
  const ist = getTimezoneParts(dt, config.timezone || "Asia/Kolkata");
  const minuteOfDay = ist.hour * 60 + ist.minute;

  const [startH, startM] = (config.startTime || "17:30:00").split(":").map(Number);
  const shiftStartMinutes = (startH ?? 17) * 60 + (startM ?? 30);

  // Authoritative refresh cutoff: 9:00 AM IST (09:00 = 540 minutes of day)
  const [refH, refM] = (config.refreshTime || "09:00:00").split(":").map(Number);
  const refreshMinutes = (refH ?? 9) * 60 + (refM ?? 0);

  // Case 1: Between shift start (e.g. 17:30) and 23:59:59 IST -> Today's shift start
  if (minuteOfDay >= shiftStartMinutes) {
    return ist.dateStr;
  }

  // Case 2: Between midnight 00:00:00 and morning refresh cutoff (09:00 AM IST) ->
  // Continues the overnight shift from yesterday (covering normal 02:30 and extended shift work)!
  if (minuteOfDay < refreshMinutes) {
    return addDays(ist.dateStr, -1);
  }

  // Case 3: Outside shift hours after 9:00 AM refresh and before next shift start (09:00 to 17:29:59 IST) ->
  // Shift has refreshed for today's upcoming shift cycle!
  return ist.dateStr;
}

/**
 * Calculates duration in minutes from shift start to shift end crossing midnight
 */
export function calculateShiftDurationMinutes(
  startTime: string = "17:30:00",
  endTime: string = "02:30:00"
): number {
  const [sH, sM] = startTime.split(":").map(Number);
  const [eH, eM] = endTime.split(":").map(Number);
  const startMins = (sH ?? 17) * 60 + (sM ?? 30);
  let endMins = (eH ?? 2) * 60 + (eM ?? 30);
  if (endMins <= startMins) {
    endMins += 1440;
  }
  return endMins - startMins;
}

/**
 * Returns the exact ShiftWindow (start/end in IST, UTC, and US Eastern) for a given business date
 */
export function getShiftWindowForBusinessDate(
  businessDate: string,
  config: ShiftConfiguration = DEFAULT_SHIFT_CONFIG
): ShiftWindow {
  const [startH, startM] = (config.startTime || "17:30:00").split(":").map(Number);
  // IST shift start in UTC: (startH:startM) - 5:30
  // e.g. 17:30 IST - 5:30 = 12:00:00 UTC on businessDate
  const [y, m, d] = businessDate.split("-").map(Number);
  let utcMinutes = (startH * 60 + (startM ?? 30)) - 330;
  let dayOffset = 0;
  if (utcMinutes < 0) {
    utcMinutes += 1440;
    dayOffset = -1;
  }
  const utcH = Math.floor(utcMinutes / 60);
  const utcM = utcMinutes % 60;

  const startUtc = new Date(Date.UTC(y, m - 1, d + dayOffset, utcH, utcM, 0));
  const scheduledDurationMs = (config.durationMinutes || 540) * 60 * 1000;
  const scheduledEndUtc = new Date(startUtc.getTime() + scheduledDurationMs);

  // Extended window up to 9:00 AM IST (15.5 hours = 930 minutes from 17:30 IST)
  // 17:30 IST is 12:00:00 UTC. Next day 09:00 IST is 03:30:00 UTC.
  const maxDurationMs = (config.maxDurationMinutes || 930) * 60 * 1000;
  const extendedEndUtc = new Date(startUtc.getTime() + maxDurationMs);

  const nextDayIst = addDays(businessDate, 1);
  const shiftStartIst = `${businessDate} ${config.startTime || "17:30:00"}`;
  const shiftEndIst = `${nextDayIst} ${config.endTime || "02:30:00"}`;
  const extendedEndIst = `${nextDayIst} ${config.refreshTime || "09:00:00"}`;
  const refreshTimeIst = `${nextDayIst} ${config.refreshTime || "09:00:00"}`;

  const usStartInfo = getUsEasternTimeInfo(startUtc);
  const usEndInfo = getUsEasternTimeInfo(scheduledEndUtc);

  return {
    businessDate,
    shiftStartIst,
    shiftEndIst,
    extendedEndIst,
    refreshTimeIst,
    shiftStartUtc: startUtc.toISOString(),
    shiftEndUtc: scheduledEndUtc.toISOString(),
    extendedEndUtc: extendedEndUtc.toISOString(),
    shiftStartUs: `${usStartInfo.timeStr} ${usStartInfo.abbr}`,
    shiftEndUs: `${usEndInfo.timeStr} ${usEndInfo.abbr}`,
    usTimezoneAbbr: usStartInfo.abbr,
    isOvernight: true,
  };
}

/**
 * Evaluates the full operational state of the current shift,
 * supporting work continuation past 2:30 AM until morning refresh at 9:00 AM IST.
 */
export function getCurrentShiftState(
  nowDate: Date = new Date(),
  config: ShiftConfiguration = DEFAULT_SHIFT_CONFIG
): ShiftCurrentState {
  const istParts = getTimezoneParts(nowDate, config.timezone || "Asia/Kolkata");
  const minuteOfDay = istParts.hour * 60 + istParts.minute;

  const [startH, startM] = (config.startTime || "17:30:00").split(":").map(Number);
  const shiftStartMinutes = (startH ?? 17) * 60 + (startM ?? 30);

  const [endH, endM] = (config.endTime || "02:30:00").split(":").map(Number);
  const scheduledEndMinutes = (endH ?? 2) * 60 + (endM ?? 30);

  const [refH, refM] = (config.refreshTime || "09:00:00").split(":").map(Number);
  const refreshMinutes = (refH ?? 9) * 60 + (refM ?? 0);

  // Shift is active during regular scheduled hours OR extended overnight work hours until 9:00 AM refresh!
  const isInScheduledShift = minuteOfDay >= shiftStartMinutes || minuteOfDay < scheduledEndMinutes;
  const isInExtendedShift = minuteOfDay >= scheduledEndMinutes && minuteOfDay < refreshMinutes;
  const isShiftActive = isInScheduledShift || isInExtendedShift;

  const businessDate = getShiftBusinessDate(nowDate, config);
  const window = getShiftWindowForBusinessDate(businessDate, config);

  const startUtcTime = new Date(window.shiftStartUtc).getTime();
  const nowUtcTime = nowDate.getTime();

  let minutesIntoShift = 0;
  let remainingMinutes = 0;
  let percentElapsed = 0;

  if (isShiftActive) {
    const elapsedMs = Math.max(0, nowUtcTime - startUtcTime);
    minutesIntoShift = Math.floor(elapsedMs / 60000);

    if (isInScheduledShift) {
      remainingMinutes = Math.max(0, (config.durationMinutes || 540) - minutesIntoShift);
      percentElapsed = Math.min(100, Math.round((minutesIntoShift / (config.durationMinutes || 540)) * 100));
    } else {
      // Extended shift: remaining minutes until 9:00 AM IST refresh
      const maxMins = config.maxDurationMinutes || 930;
      remainingMinutes = Math.max(0, maxMins - minutesIntoShift);
      percentElapsed = Math.min(100, Math.round((minutesIntoShift / maxMins) * 100));
    }
  }

  let status: ShiftOperationalStatus = "outside_shift";
  if (isShiftActive) {
    if (isInExtendedShift) {
      status = "extended";
    } else if (minutesIntoShift <= (config.gracePeriodMinutes || 15)) {
      status = "grace_period";
    } else {
      status = "active";
    }
  } else {
    // Between 9:00 AM and 17:30 PM: refreshed, preparing for upcoming evening shift
    status = "pre_shift";
  }

  const usInfo = getUsEasternTimeInfo(nowDate);

  // Next upcoming shift start in IST
  let nextShiftDate = istParts.dateStr;
  if (minuteOfDay >= shiftStartMinutes) {
    nextShiftDate = addDays(istParts.dateStr, 1);
  }
  const nextShiftStartIst = `${nextShiftDate} ${config.startTime || "17:30:00"} IST`;

  return {
    isShiftActive,
    status,
    businessDate,
    currentIstTime: istParts.timeStr,
    currentIstFormatted: `${istParts.timeStr} IST`,
    currentUsTime: usInfo.timeStr,
    currentUsFormatted: `${usInfo.timeStr} ${usInfo.abbr}`,
    usTimezoneAbbr: usInfo.abbr,
    usTimezoneOffset: usInfo.offsetStr,
    minutesIntoShift,
    remainingMinutes,
    percentElapsed,
    currentWindow: window,
    nextShiftStartIst,
  };
}

/**
 * Generates the discrete time intervals for Slide 3 (QA Heatmap), Slide 4 (Agent Heatmap),
 * and Slide 5 (Form Submissions) across the shift window, supporting extended shifts up to 9:00 AM IST.
 */
export function generateShiftIntervals(
  intervalMinutes: number = 10,
  config: ShiftConfiguration = DEFAULT_SHIFT_CONFIG,
  targetDurationMinutes?: number
): ShiftTimeInterval[] {
  const intervals: ShiftTimeInterval[] = [];
  const duration = targetDurationMinutes || config.durationMinutes || 540;
  const totalSlots = Math.floor(duration / intervalMinutes); // 18 for 30-min, 36 for 15-min, 54 for 10-min, up to 93 for 10-min (9:00 AM)

  // Starting at config.startTime (default 17:30 = 1050 minutes into day)
  const [startH, startM] = (config.startTime || "17:30:00").split(":").map(Number);
  let currentMinutes = (startH ?? 17) * 60 + (startM ?? 30);

  // 17:30 IST is 12:00:00 UTC
  // In US Eastern (EST UTC-5 / EDT UTC-4), 12:00 UTC corresponds to 07:00 EST / 08:00 EDT
  const usInfo = getUsEasternTimeInfo();
  const usBaseStartMinutes = usInfo.abbr === "EDT" ? 8 * 60 : 7 * 60;

  for (let i = 0; i < totalSlots; i++) {
    const startHour = Math.floor(currentMinutes / 60) % 24;
    const startMin = currentMinutes % 60;

    const nextMinutes = currentMinutes + intervalMinutes;
    const endHour = Math.floor(nextMinutes / 60) % 24;
    const endMin = nextMinutes % 60;

    const startStr = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
    const endStr = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

    const usStartMins = usBaseStartMinutes + (i * intervalMinutes);
    const usStartH = Math.floor(usStartMins / 60) % 24;
    const usStartM = usStartMins % 60;
    const usEndMins = usStartMins + intervalMinutes;
    const usEndH = Math.floor(usEndMins / 60) % 24;
    const usEndM = usEndMins % 60;

    const usLabel = `${String(usStartH).padStart(2, "0")}:${String(usStartM).padStart(2, "0")} - ${String(usEndH).padStart(2, "0")}:${String(usEndM).padStart(2, "0")} ${usInfo.abbr}`;

    intervals.push({
      index: i,
      start: startStr,
      end: endStr,
      label: `${startStr} - ${endStr}`,
      usLabel,
    });

    currentMinutes = nextMinutes;
  }

  return intervals;
}
