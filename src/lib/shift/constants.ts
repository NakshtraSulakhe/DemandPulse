import { ShiftConfiguration } from "@/types/shift";

export const DEFAULT_SHIFT_CONFIG: ShiftConfiguration = {
  shiftName: "US Shift Operations (India Delivery)",
  shiftCode: "US_SHIFT",
  timezone: "Asia/Kolkata",
  startTime: "18:00:00",
  endTime: "03:00:00",
  crossesMidnight: true,
  durationMinutes: 540, // 9 hours (18:00 to 03:00 next day)
  reportingTimezone: "America/New_York",
  businessDateRule: "SHIFT_START_DATE",
  gracePeriodMinutes: 0,
  workingDays: [1, 2, 3, 4, 5], // Monday through Friday
  isActive: true,
  version: 2,
  lastUpdated: new Date().toISOString(),
  updatedBy: "System Shift Config (6 PM IST Shift)",
};

