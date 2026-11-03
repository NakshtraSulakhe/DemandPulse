import { query, queryOne, execute, serializeDbData } from "@/lib/db";

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
  const numericId = Number(userId);
  try {
    const row = await queryOne<{
      theme: string;
      header_drawer_open: number | boolean;
      tv_mode_enabled: number | boolean;
      display_scaling: string;
      heatmap_interval_minutes: number;
    }>(
      `SELECT theme, header_drawer_open, tv_mode_enabled, display_scaling, heatmap_interval_minutes
       FROM slide_user_preferences
       WHERE user_id = ? LIMIT 1`,
      [numericId]
    );

    if (!row) {
      return DEFAULT_USER_PREFS;
    }

    return {
      theme: (row.theme as "dark" | "light") || "dark",
      headerDrawerOpen: Boolean(row.header_drawer_open),
      tvModeEnabled: Boolean(row.tv_mode_enabled),
      displayScaling: row.display_scaling || "normal",
      heatmapIntervalMinutes: row.heatmap_interval_minutes || 10,
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
  const numericId = Number(userId);
  const current = await getUserPreferences(numericId);
  const updated: UserPreferencesDto = {
    ...current,
    ...prefs,
  };

  await execute(
    `INSERT INTO slide_user_preferences
       (user_id, theme, header_drawer_open, tv_mode_enabled, display_scaling, heatmap_interval_minutes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(6))
     ON DUPLICATE KEY UPDATE
       theme = VALUES(theme),
       header_drawer_open = VALUES(header_drawer_open),
       tv_mode_enabled = VALUES(tv_mode_enabled),
       display_scaling = VALUES(display_scaling),
       heatmap_interval_minutes = VALUES(heatmap_interval_minutes),
       updated_at = NOW(6)`,
    [
      numericId,
      updated.theme,
      updated.headerDrawerOpen ? 1 : 0,
      updated.tvModeEnabled ? 1 : 0,
      updated.displayScaling,
      updated.heatmapIntervalMinutes,
    ]
  );

  // Record change event in audit log
  await recordSettingChangeEvent(
    "USER_PREFERENCE",
    `user-${userId}`,
    current,
    updated,
    BigInt(numericId)
  );

  return updated;
}

/**
 * Get device/display-specific preferences (e.g. for Floor TV screens)
 */
export async function getDisplayPreferences(
  displayIdentifier: string = "default"
): Promise<DisplayPreferencesDto> {
  try {
    const row = await queryOne<{
      display_identifier: string;
      presentation_id: number | string | null;
      tv_mode_enabled: number | boolean;
      display_scaling: string;
      heatmap_interval_minutes: number;
      slide_interval_seconds: number;
    }>(
      `SELECT display_identifier, presentation_id, tv_mode_enabled, display_scaling, heatmap_interval_minutes, slide_interval_seconds
       FROM slide_display_preferences
       WHERE display_identifier = ? LIMIT 1`,
      [displayIdentifier]
    );

    if (!row) {
      return { ...DEFAULT_DISPLAY_PREFS, displayIdentifier };
    }

    return {
      displayIdentifier: row.display_identifier,
      presentationId: row.presentation_id !== null && row.presentation_id !== undefined ? String(row.presentation_id) : null,
      tvModeEnabled: Boolean(row.tv_mode_enabled),
      displayScaling: row.display_scaling || "normal",
      heatmapIntervalMinutes: row.heatmap_interval_minutes || 10,
      slideIntervalSeconds: row.slide_interval_seconds || 30,
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

  const presentationIdVal = updated.presentationId ? Number(updated.presentationId) : null;

  await execute(
    `INSERT INTO slide_display_preferences
       (display_identifier, presentation_id, tv_mode_enabled, display_scaling, heatmap_interval_minutes, slide_interval_seconds, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(6))
     ON DUPLICATE KEY UPDATE
       presentation_id = VALUES(presentation_id),
       tv_mode_enabled = VALUES(tv_mode_enabled),
       display_scaling = VALUES(display_scaling),
       heatmap_interval_minutes = VALUES(heatmap_interval_minutes),
       slide_interval_seconds = VALUES(slide_interval_seconds),
       updated_at = NOW(6)`,
    [
      displayIdentifier,
      presentationIdVal,
      updated.tvModeEnabled ? 1 : 0,
      updated.displayScaling,
      updated.heatmapIntervalMinutes,
      updated.slideIntervalSeconds,
    ]
  );

  await recordSettingChangeEvent(
    "DISPLAY_PREFERENCE",
    displayIdentifier,
    current,
    updated,
    actorId
  );

  return updated;
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
    const prevJson = previousValue ? JSON.stringify(serializeDbData(previousValue)) : null;
    const newJson = newValue ? JSON.stringify(serializeDbData(newValue)) : null;
    const entId = entityId !== null && entityId !== undefined ? Number(entityId) : null;

    await execute(
      `INSERT INTO slide_settings_change_events
         (setting_scope, setting_key, entity_id, changed_by, previous_value, new_value, changed_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(6))`,
      [settingScope, settingKey, entId, Number(changedBy), prevJson, newJson]
    );
  } catch (err) {
    console.error("Failed to record setting change event in MySQL:", err);
  }
}
