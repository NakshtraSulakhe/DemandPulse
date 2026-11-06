import { ShiftConfiguration, ShiftConfigUpdatePayload } from "@/types/shift";
import { DEFAULT_SHIFT_CONFIG } from "./constants";
import { queryOne, execute, serializeDbData } from "@/lib/db";
import { recordSettingChangeEvent } from "@/lib/db/preferences-repository";

export { DEFAULT_SHIFT_CONFIG };

/**
 * Reads shift configuration directly from MySQL slide_business_calendars (zero file reads)
 */
export async function getShiftConfig(): Promise<ShiftConfiguration> {
  try {
    const calendar = await queryOne<{
      id: number | string;
      calendar_name: string;
      shift_code: string;
      business_timezone: string;
      display_timezone: string;
      shift_start_local: string;
      shift_end_local: string;
      shift_timezone: string;
      schedule_mode: string;
      working_days_json: any;
      grace_period_minutes: number;
      version: number;
      is_active: number | boolean;
      updated_at: string;
    }>(
      `SELECT * FROM slide_business_calendars WHERE is_active = 1 ORDER BY id ASC LIMIT 1`
    );

    if (!calendar) {
      return DEFAULT_SHIFT_CONFIG;
    }

    const workingDaysRaw = typeof calendar.working_days_json === "string"
      ? JSON.parse(calendar.working_days_json)
      : calendar.working_days_json;

    const workingDays = Array.isArray(workingDaysRaw) ? workingDaysRaw : DEFAULT_SHIFT_CONFIG.workingDays;

    return {
      shiftName: calendar.calendar_name,
      shiftCode: calendar.shift_code || "US_SHIFT",
      timezone: calendar.display_timezone || calendar.shift_timezone || "Asia/Kolkata",
      startTime: calendar.shift_start_local || "17:30:00",
      endTime: calendar.shift_end_local || "02:30:00",
      crossesMidnight: calendar.schedule_mode === "cross_midnight",
      durationMinutes: 540,
      reportingTimezone: calendar.business_timezone || "America/New_York",
      businessDateRule: "SHIFT_START_DATE",
      gracePeriodMinutes: calendar.grace_period_minutes ?? 1,
      workingDays,
      isActive: Boolean(calendar.is_active),
      version: calendar.version || 1,
      lastUpdated: String(calendar.updated_at),
      updatedBy: "MySQL Business Calendar",
    };
  } catch (err) {
    console.error("Error reading shift config from MySQL:", err);
    return DEFAULT_SHIFT_CONFIG;
  }
}

/**
 * Saves updated shift configuration directly to MySQL slide_business_calendars (zero filesystem writes)
 */
export async function saveShiftConfig(
  updates: ShiftConfigUpdatePayload,
  updatedBy: string = "Admin User"
): Promise<ShiftConfiguration> {
  const current = await getShiftConfig();

  const nextVersion = (current.version || 1) + 1;
  const merged: ShiftConfiguration = {
    ...current,
    ...updates,
    version: nextVersion,
    lastUpdated: new Date().toISOString(),
    updatedBy,
  };

  const existing = await queryOne<{ id: number | string }>(
    `SELECT id FROM slide_business_calendars WHERE is_active = 1 ORDER BY id ASC LIMIT 1`
  );

  const workingDaysJson = JSON.stringify(merged.workingDays);
  const scheduleMode = merged.crossesMidnight ? "cross_midnight" : "same_day";

  if (existing) {
    await execute(
      `UPDATE slide_business_calendars
       SET calendar_name = ?,
           shift_code = ?,
           business_timezone = ?,
           display_timezone = ?,
           shift_start_local = ?,
           shift_end_local = ?,
           shift_timezone = ?,
           schedule_mode = ?,
           working_days_json = ?,
           grace_period_minutes = ?,
           version = ?,
           is_active = ?,
           updated_at = NOW(6)
       WHERE id = ?`,
      [
        merged.shiftName,
        merged.shiftCode,
        merged.reportingTimezone,
        merged.timezone,
        merged.startTime,
        merged.endTime,
        merged.timezone,
        scheduleMode,
        workingDaysJson,
        merged.gracePeriodMinutes,
        nextVersion,
        merged.isActive ? 1 : 0,
        existing.id,
      ]
    );
  } else {
    await execute(
      `INSERT INTO slide_business_calendars
         (calendar_name, shift_code, business_timezone, display_timezone, shift_start_local, shift_end_local,
          shift_timezone, schedule_mode, working_days_json, grace_period_minutes, version, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))`,
      [
        merged.shiftName,
        merged.shiftCode,
        merged.reportingTimezone,
        merged.timezone,
        merged.startTime,
        merged.endTime,
        merged.timezone,
        scheduleMode,
        workingDaysJson,
        merged.gracePeriodMinutes,
        nextVersion,
        merged.isActive ? 1 : 0,
      ]
    );
  }

  // Record change event in audit log
  await recordSettingChangeEvent(
    "BUSINESS_CALENDAR",
    "shift_config",
    current,
    merged,
    BigInt(1)
  );

  return merged;
}
