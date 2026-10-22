import fs from "fs/promises";
import path from "path";
import { ShiftConfiguration, ShiftConfigUpdatePayload } from "@/types/shift";

const SHIFT_CONFIG_FILE = path.join(process.cwd(), "data", "shift-config.json");

export const DEFAULT_SHIFT_CONFIG: ShiftConfiguration = {
  shiftName: "US Business Shift",
  shiftCode: "US_SHIFT",
  timezone: "Asia/Kolkata",
  startTime: "17:30:00",
  endTime: "02:30:00",
  crossesMidnight: true,
  durationMinutes: 540, // 9 hours
  reportingTimezone: "America/New_York",
  businessDateRule: "SHIFT_START_DATE",
  gracePeriodMinutes: 15,
  workingDays: [1, 2, 3, 4, 5], // Monday through Friday
  isActive: true,
  version: 1,
  lastUpdated: new Date().toISOString(),
  updatedBy: "System Default (US Fixed Shift)",
};

/**
 * Reads shift configuration from persistent store, falling back to default configuration
 */
export async function getShiftConfig(): Promise<ShiftConfiguration> {
  try {
    const raw = await fs.readFile(SHIFT_CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SHIFT_CONFIG,
      ...parsed,
    };
  } catch {
    // If file does not exist, initialize it
    await saveShiftConfig(DEFAULT_SHIFT_CONFIG, "System Initialization").catch(() => {});
    return DEFAULT_SHIFT_CONFIG;
  }
}

/**
 * Saves updated shift configuration with version increment and audit timestamp
 */
export async function saveShiftConfig(
  updates: ShiftConfigUpdatePayload,
  updatedBy: string = "Admin User"
): Promise<ShiftConfiguration> {
  let current: ShiftConfiguration;
  try {
    const raw = await fs.readFile(SHIFT_CONFIG_FILE, "utf-8");
    current = JSON.parse(raw);
  } catch {
    current = DEFAULT_SHIFT_CONFIG;
  }

  const updated: ShiftConfiguration = {
    ...current,
    ...updates,
    version: (current.version || 1) + 1,
    lastUpdated: new Date().toISOString(),
    updatedBy,
  };

  await fs.mkdir(path.dirname(SHIFT_CONFIG_FILE), { recursive: true });
  await fs.writeFile(SHIFT_CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");

  return updated;
}
