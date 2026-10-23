import { ShiftConfiguration, ShiftConfigUpdatePayload } from "@/types/shift";
import { prisma, serializeDbData } from "@/lib/db";
import { recordSettingChangeEvent } from "@/lib/db/preferences-repository";

export const DEFAULT_SHIFT_CONFIG: ShiftConfiguration = {
  shiftName: "US Shift Operations (India Delivery)",
  shiftCode: "US_SHIFT",
  timezone: "Asia/Kolkata",
  startTime: "17:30:00",
  endTime: "02:30:00",
  crossesMidnight: true,
  durationMinutes: 540, // 9 hours
  reportingTimezone: "America/New_York",
  businessDateRule: "SHIFT_START_DATE",
  gracePeriodMinutes: 0,
  workingDays: [1, 2, 3, 4, 5], // Monday through Friday
  isActive: true,
  version: 1,
  lastUpdated: new Date().toISOString(),
  updatedBy: "System Default (US Fixed Shift)",
};

/**
 * Reads shift configuration directly from MySQL slide_business_calendars (zero file reads)
 */
export async function getShiftConfig(): Promise<ShiftConfiguration> {
  try {
    const calendar = await prisma.slideBusinessCalendar.findFirst({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });

    if (!calendar) {
      return DEFAULT_SHIFT_CONFIG;
    }

    const workingDays = Array.isArray(calendar.workingDaysJson)
      ? (calendar.workingDaysJson as number[])
      : DEFAULT_SHIFT_CONFIG.workingDays;

    return {
      shiftName: calendar.calendarName,
      shiftCode: calendar.shiftCode || "US_SHIFT",
      timezone: calendar.displayTimezone || calendar.shiftTimezone || "Asia/Kolkata",
      startTime: calendar.shiftStartLocal || "17:30:00",
      endTime: calendar.shiftEndLocal || "02:30:00",
      crossesMidnight: calendar.scheduleMode === "cross_midnight",
      durationMinutes: 540,
      reportingTimezone: calendar.businessTimezone || "America/New_York",
      businessDateRule: "SHIFT_START_DATE",
      gracePeriodMinutes: calendar.gracePeriodMinutes ?? 0,
      workingDays,
      isActive: calendar.isActive,
      version: calendar.version || 1,
      lastUpdated: calendar.updatedAt.toISOString(),
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

  const existing = await prisma.slideBusinessCalendar.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  if (existing) {
    await prisma.slideBusinessCalendar.update({
      where: { id: existing.id },
      data: {
        calendarName: merged.shiftName,
        shiftCode: merged.shiftCode,
        businessTimezone: merged.reportingTimezone,
        displayTimezone: merged.timezone,
        shiftStartLocal: merged.startTime,
        shiftEndLocal: merged.endTime,
        shiftTimezone: merged.timezone,
        scheduleMode: merged.crossesMidnight ? "cross_midnight" : "same_day",
        workingDaysJson: merged.workingDays,
        gracePeriodMinutes: merged.gracePeriodMinutes,
        version: nextVersion,
        isActive: merged.isActive,
      },
    });
  } else {
    await prisma.slideBusinessCalendar.create({
      data: {
        calendarName: merged.shiftName,
        shiftCode: merged.shiftCode,
        businessTimezone: merged.reportingTimezone,
        displayTimezone: merged.timezone,
        shiftStartLocal: merged.startTime,
        shiftEndLocal: merged.endTime,
        shiftTimezone: merged.timezone,
        scheduleMode: merged.crossesMidnight ? "cross_midnight" : "same_day",
        workingDaysJson: merged.workingDays,
        gracePeriodMinutes: merged.gracePeriodMinutes,
        version: nextVersion,
        isActive: merged.isActive,
      },
    });
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
