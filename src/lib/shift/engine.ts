import {
  ShiftConfiguration,
  ShiftWindow,
  ShiftCurrentState,
  ShiftOperationalStatus,
  ShiftTimeInterval,
} from "@/types/shift";
import { DEFAULT_SHIFT_CONFIG } from "./config";

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
function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().split("T")[0];
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
 * Calculates the authoritative business date for any instant in time
 * Shift: 5:30 PM (17:30) to 2:30 AM (02:30) IST next day
 */
export function getShiftBusinessDate(
  instant: Date | string = new Date(),
  config: ShiftConfiguration = DEFAULT_SHIFT_CONFIG
): string {
  const dt = typeof instant === "string" ? new Date(instant) : instant;
  const ist = getTimezoneParts(dt, config.timezone || "Asia/Kolkata");
  const minuteOfDay = ist.hour * 60 + ist.minute;

  // 17:30 = 1050 minutes
  // 02:30 = 150 minutes
  const shiftStartMinutes = 17 * 60 + 30; // 1050
  const shiftEndMinutes = 2 * 60 + 30; // 150

  // Case 1: Between 17:30 and 23:59:59 IST -> Today's shift start
  if (minuteOfDay >= shiftStartMinutes) {
    return ist.dateStr;
  }

  // Case 2: Between 00:00:00 and 02:29:59 IST -> Overnight extension of yesterday's shift!
  if (minuteOfDay < shiftEndMinutes) {
    return addDays(ist.dateStr, -1);
  }

  // Case 3: Outside shift hours (02:30 to 17:29:59 IST)
  // If between 02:30 and 12:00 PM: belongs to the shift that just concluded at 02:30 AM
  if (minuteOfDay < 12 * 60) {
    return addDays(ist.dateStr, -1);
  }

  // If after 12:00 PM: preparing for today's upcoming 17:30 shift
  return ist.dateStr;
}

/**
 * Returns the exact ShiftWindow (start/end in IST, UTC, and US Eastern) for a given business date
 */
export function getShiftWindowForBusinessDate(
  businessDate: string,
  config: ShiftConfiguration = DEFAULT_SHIFT_CONFIG
): ShiftWindow {
  // IST shift start: businessDate 17:30:00 IST (+05:30)
  // In UTC: 17:30 - 5:30 = 12:00:00 UTC on businessDate
  const [y, m, d] = businessDate.split("-").map(Number);
  const startUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // 17:30 IST

  // IST shift end: 9 hours later = 21:00:00 UTC (02:30 IST next day)
  const endUtc = new Date(startUtc.getTime() + 9 * 60 * 60 * 1000);

  const nextDayIst = addDays(businessDate, 1);
  const shiftStartIst = `${businessDate} ${config.startTime}`;
  const shiftEndIst = `${nextDayIst} ${config.endTime}`;

  const usStartInfo = getUsEasternTimeInfo(startUtc);
  const usEndInfo = getUsEasternTimeInfo(endUtc);

  return {
    businessDate,
    shiftStartIst,
    shiftEndIst,
    shiftStartUtc: startUtc.toISOString(),
    shiftEndUtc: endUtc.toISOString(),
    shiftStartUs: `${usStartInfo.timeStr} ${usStartInfo.abbr}`,
    shiftEndUs: `${usEndInfo.timeStr} ${usEndInfo.abbr}`,
    usTimezoneAbbr: usStartInfo.abbr,
    isOvernight: true,
  };
}

/**
 * Evaluates the full operational state of the current shift
 */
export function getCurrentShiftState(
  nowDate: Date = new Date(),
  config: ShiftConfiguration = DEFAULT_SHIFT_CONFIG
): ShiftCurrentState {
  const istParts = getTimezoneParts(nowDate, config.timezone || "Asia/Kolkata");
  const minuteOfDay = istParts.hour * 60 + istParts.minute;

  const shiftStartMinutes = 17 * 60 + 30; // 1050 (17:30 IST)
  const shiftEndMinutes = 2 * 60 + 30; // 150 (02:30 IST)

  const isShiftActive = minuteOfDay >= shiftStartMinutes || minuteOfDay < shiftEndMinutes;
  const businessDate = getShiftBusinessDate(nowDate, config);
  const window = getShiftWindowForBusinessDate(businessDate, config);

  const startUtcTime = new Date(window.shiftStartUtc).getTime();
  const endUtcTime = new Date(window.shiftEndUtc).getTime();
  const nowUtcTime = nowDate.getTime();

  let minutesIntoShift = 0;
  let remainingMinutes = 0;
  let percentElapsed = 0;

  if (isShiftActive) {
    const elapsedMs = Math.max(0, nowUtcTime - startUtcTime);
    minutesIntoShift = Math.floor(elapsedMs / 60000);
    remainingMinutes = Math.max(0, 540 - minutesIntoShift);
    percentElapsed = Math.min(100, Math.round((minutesIntoShift / 540) * 100));
  }

  let status: ShiftOperationalStatus = "outside_shift";
  if (isShiftActive) {
    if (minutesIntoShift <= (config.gracePeriodMinutes || 15)) {
      status = "grace_period";
    } else {
      status = "active";
    }
  } else if (minuteOfDay < 12 * 60) {
    status = "post_shift_audit";
  } else {
    status = "pre_shift";
  }

  const usInfo = getUsEasternTimeInfo(nowDate);

  // Next upcoming shift start in IST
  let nextShiftDate = istParts.dateStr;
  if (minuteOfDay >= shiftStartMinutes) {
    nextShiftDate = addDays(istParts.dateStr, 1);
  }
  const nextShiftStartIst = `${nextShiftDate} ${config.startTime} IST`;

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
 * Generates the discrete time intervals for Slide 3 (QA Heatmap) and Slide 4 (Agent Heatmap)
 * across the 17:30 to 02:30 shift window crossing midnight
 */
export function generateShiftIntervals(
  intervalMinutes: number = 10,
  config: ShiftConfiguration = DEFAULT_SHIFT_CONFIG
): ShiftTimeInterval[] {
  const intervals: ShiftTimeInterval[] = [];
  const totalSlots = Math.floor(540 / intervalMinutes); // e.g. 54 for 10-min, 36 for 15-min

  // Starting at 17:30 (1050 minutes into day)
  let currentMinutes = 17 * 60 + 30;

  for (let i = 0; i < totalSlots; i++) {
    const startHour = Math.floor(currentMinutes / 60) % 24;
    const startMin = currentMinutes % 60;

    const nextMinutes = currentMinutes + intervalMinutes;
    const endHour = Math.floor(nextMinutes / 60) % 24;
    const endMin = nextMinutes % 60;

    const startStr = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
    const endStr = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

    // US Eastern calculation for slot label (approx EDT 08:00 start)
    // 17:30 IST = 08:00 EDT (or 07:00 EST)
    const usStartMins = 8 * 60 + (i * intervalMinutes);
    const usStartH = Math.floor(usStartMins / 60) % 24;
    const usStartM = usStartMins % 60;
    const usEndMins = usStartMins + intervalMinutes;
    const usEndH = Math.floor(usEndMins / 60) % 24;
    const usEndM = usEndMins % 60;

    const usLabel = `${String(usStartH).padStart(2, "0")}:${String(usStartM).padStart(2, "0")} - ${String(usEndH).padStart(2, "0")}:${String(usEndM).padStart(2, "0")} US`;

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
