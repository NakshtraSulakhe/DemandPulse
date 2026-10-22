/**
 * Centralized Shift Management Type Definitions
 * Primary Timezone: Asia/Kolkata
 * Reporting Timezone: America/New_York (Automatic EDT / EST recognition)
 */

export interface ShiftConfiguration {
  shiftName: string;
  shiftCode: string;
  timezone: string; // e.g. "Asia/Kolkata"
  startTime: string; // "17:30:00" (5:30 PM)
  endTime: string; // "02:30:00" (2:30 AM next day)
  crossesMidnight: boolean; // true
  durationMinutes: number; // 540 (9 hours)
  reportingTimezone: string; // "America/New_York"
  businessDateRule: "SHIFT_START_DATE";
  gracePeriodMinutes: number; // 15 minutes grace for punch-ins
  workingDays: number[]; // [1, 2, 3, 4, 5] (Mon - Fri)
  isActive: boolean;
  version: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface ShiftWindow {
  businessDate: string; // YYYY-MM-DD (Date shift started in IST)
  shiftStartIst: string; // YYYY-MM-DD 17:30:00
  shiftEndIst: string; // YYYY-MM-DD 02:30:00 (next day)
  shiftStartUtc: string; // ISO UTC string
  shiftEndUtc: string; // ISO UTC string
  shiftStartUs: string; // US Eastern time string
  shiftEndUs: string; // US Eastern time string
  usTimezoneAbbr: "EDT" | "EST";
  isOvernight: boolean;
}

export type ShiftOperationalStatus =
  | "active" // In active shift (17:30 - 02:30)
  | "grace_period" // Within grace period after shift start
  | "post_shift_audit" // Between 02:30 and audit cutoff
  | "pre_shift" // Prior to 17:30
  | "outside_shift";

export interface ShiftCurrentState {
  isShiftActive: boolean;
  status: ShiftOperationalStatus;
  businessDate: string;
  currentIstTime: string;
  currentIstFormatted: string;
  currentUsTime: string;
  currentUsFormatted: string;
  usTimezoneAbbr: "EDT" | "EST";
  usTimezoneOffset: string;
  minutesIntoShift: number;
  remainingMinutes: number;
  percentElapsed: number;
  currentWindow: ShiftWindow;
  nextShiftStartIst: string;
}

export interface ShiftTimeInterval {
  index: number;
  start: string; // "17:30"
  end: string; // "17:40"
  label: string; // "17:30 - 17:40"
  usLabel: string; // "08:00 - 08:10 EDT"
}

export type ShiftConfigUpdatePayload = Partial<
  Omit<ShiftConfiguration, "version" | "lastUpdated">
>;
