import { ShiftConfiguration } from "@/types/shift";

export const DEFAULT_SHIFT_CONFIG: ShiftConfiguration = {
  shiftName: "US Shift Operations (India Delivery)",
  shiftCode: "US_SHIFT",
  timezone: "Asia/Kolkata",
  startTime: "17:30:00",
  endTime: "02:30:00",
  crossesMidnight: true,
  durationMinutes: 540, // 9 hours (17:30 to 02:30 next day; 12:00:00 UTC to 21:00:00 UTC)
  reportingTimezone: "America/New_York",
  businessDateRule: "SHIFT_START_DATE",
  gracePeriodMinutes: 1,
  workingDays: [1, 2, 3, 4, 5], // Monday through Friday
  isActive: true,
  version: 3,
  lastUpdated: new Date().toISOString(),
  updatedBy: "System Shift Config (17:30 IST / 12:00 UTC Shift)",
};

