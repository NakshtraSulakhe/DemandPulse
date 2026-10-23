import { prisma, serializeDbData } from "@/lib/db";

export interface UserPreferencesDto {
  theme: "dark" | "light";
  headerDrawerOpen: boolean;
  tvModeEnabled: boolean;
  displayScaling: string;
  heatmapIntervalMinutes: number;
}

export interface DisplayPreferencesDto {
  displayIdentifier: string;
  presentationId?: string | null;
  tvModeEnabled: boolean;
  displayScaling: string;
  heatmapIntervalMinutes: number;
  slideIntervalSeconds: number;
}

const DEFAULT_USER_PREFS: UserPreferencesDto = {
  theme: "dark",
  headerDrawerOpen: false,
  tvModeEnabled: false,
  displayScaling: "normal",
  heatmapIntervalMinutes: 10,
};

const DEFAULT_DISPLAY_PREFS: DisplayPreferencesDto = {
  displayIdentifier: "default",
  tvModeEnabled: true,
  displayScaling: "normal",
  heatmapIntervalMinutes: 10,
  slideIntervalSeconds: 30,
};

/**
 * Get preferences for a specific user ID or default user (ID 1)
 */
export async function getUserPreferences(userId: bigint | number = 1): Promise<UserPreferencesDto> {
  const numericId = BigInt(userId);
  try {
    const record = await prisma.slideUserPreference.findUnique({
      where: { userId: numericId },
    });

    if (!record) {
      return DEFAULT_USER_PREFS;
    }

    return {
      theme: (record.theme as "dark" | "light") || "dark",
      headerDrawerOpen: record.headerDrawerOpen,
      tvModeEnabled: record.tvModeEnabled,
      displayScaling: record.displayScaling || "normal",
      heatmapIntervalMinutes: record.heatmapIntervalMinutes || 10,
    };
  } catch (err) {
    console.error("Error fetching user preferences from MySQL:", err);
    return DEFAULT_USER_PREFS;
  }
}

/**
 * Save preferences for a specific user in MySQL (no localStorage)
 */
export async function saveUserPreferences(
  userId: bigint | number = 1,
  prefs: Partial<UserPreferencesDto>
): Promise<UserPreferencesDto> {
  const numericId = BigInt(userId);
  const current = await getUserPreferences(numericId);
  const updated: UserPreferencesDto = {
    ...current,
    ...prefs,
  };

  const record = await prisma.slideUserPreference.upsert({
    where: { userId: numericId },
    update: {
      theme: updated.theme,
      headerDrawerOpen: updated.headerDrawerOpen,
      tvModeEnabled: updated.tvModeEnabled,
      displayScaling: updated.displayScaling,
      heatmapIntervalMinutes: updated.heatmapIntervalMinutes,
    },
    create: {
      userId: numericId,
      theme: updated.theme,
      headerDrawerOpen: updated.headerDrawerOpen,
      tvModeEnabled: updated.tvModeEnabled,
      displayScaling: updated.displayScaling,
      heatmapIntervalMinutes: updated.heatmapIntervalMinutes,
    },
  });

  // Record change event in audit log
  await recordSettingChangeEvent(
    "USER_PREFERENCE",
    `user-${userId}`,
    current,
    updated,
    numericId
  );

  return {
    theme: (record.theme as "dark" | "light") || "dark",
    headerDrawerOpen: record.headerDrawerOpen,
    tvModeEnabled: record.tvModeEnabled,
    displayScaling: record.displayScaling,
    heatmapIntervalMinutes: record.heatmapIntervalMinutes,
  };
}

/**
 * Get device/display-specific preferences (e.g. for Floor TV screens)
 */
export async function getDisplayPreferences(
  displayIdentifier: string = "default"
): Promise<DisplayPreferencesDto> {
  try {
    const record = await prisma.slideDisplayPreference.findUnique({
      where: { displayIdentifier },
    });

    if (!record) {
      return { ...DEFAULT_DISPLAY_PREFS, displayIdentifier };
    }

    return {
      displayIdentifier: record.displayIdentifier,
      presentationId: record.presentationId?.toString() ?? null,
      tvModeEnabled: record.tvModeEnabled,
      displayScaling: record.displayScaling || "normal",
      heatmapIntervalMinutes: record.heatmapIntervalMinutes || 10,
      slideIntervalSeconds: record.slideIntervalSeconds || 30,
    };
  } catch (err) {
    console.error("Error fetching display preferences from MySQL:", err);
    return { ...DEFAULT_DISPLAY_PREFS, displayIdentifier };
  }
}

/**
 * Save device/display-specific preferences in MySQL
 */
export async function saveDisplayPreferences(
  displayIdentifier: string = "default",
  prefs: Partial<DisplayPreferencesDto>,
  actorId: bigint = BigInt(1)
): Promise<DisplayPreferencesDto> {
  const current = await getDisplayPreferences(displayIdentifier);
  const updated: DisplayPreferencesDto = {
    ...current,
    ...prefs,
  };

  const record = await prisma.slideDisplayPreference.upsert({
    where: { displayIdentifier },
    update: {
      presentationId: updated.presentationId ? BigInt(updated.presentationId) : undefined,
      tvModeEnabled: updated.tvModeEnabled,
      displayScaling: updated.displayScaling,
      heatmapIntervalMinutes: updated.heatmapIntervalMinutes,
      slideIntervalSeconds: updated.slideIntervalSeconds,
    },
    create: {
      displayIdentifier,
      presentationId: updated.presentationId ? BigInt(updated.presentationId) : undefined,
      tvModeEnabled: updated.tvModeEnabled,
      displayScaling: updated.displayScaling,
      heatmapIntervalMinutes: updated.heatmapIntervalMinutes,
      slideIntervalSeconds: updated.slideIntervalSeconds,
    },
  });

  await recordSettingChangeEvent(
    "DISPLAY_PREFERENCE",
    displayIdentifier,
    current,
    updated,
    actorId
  );

  return {
    displayIdentifier: record.displayIdentifier,
    presentationId: record.presentationId?.toString() ?? null,
    tvModeEnabled: record.tvModeEnabled,
    displayScaling: record.displayScaling,
    heatmapIntervalMinutes: record.heatmapIntervalMinutes,
    slideIntervalSeconds: record.slideIntervalSeconds,
  };
}

/**
 * Record configuration modification in slide_settings_change_events
 */
export async function recordSettingChangeEvent(
  settingScope: string,
  settingKey: string,
  previousValue: any,
  newValue: any,
  changedBy: bigint = BigInt(1),
  entityId?: bigint | null
) {
  try {
    await prisma.slideSettingsChangeEvent.create({
      data: {
        settingScope,
        settingKey,
        entityId: entityId ?? null,
        changedBy,
        previousValue: previousValue ? serializeDbData(previousValue) : null,
        newValue: newValue ? serializeDbData(newValue) : null,
      },
    });
  } catch (err) {
    console.error("Failed to record setting change event in MySQL:", err);
  }
}
