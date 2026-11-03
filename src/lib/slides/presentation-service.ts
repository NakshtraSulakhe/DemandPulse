import { query, queryOne, execute, withTransaction, serializeDbData } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";

export const UpdatePresentationSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  defaultSlideSeconds: z.number().int().min(5).max(300).optional(),
  refreshIntervalSeconds: z.number().int().min(10).max(600).optional(),
  isActive: z.boolean().optional(),
  themeConfig: z.record(z.any()).optional(),
});

export const PlaylistItemUpdateSchema = z.object({
  id: z.union([z.string(), z.number(), z.bigint()]),
  displayOrder: z.number().int().min(1),
  durationSeconds: z.number().int().min(5).max(300).nullable().optional(),
  isEnabled: z.boolean().optional(),
});

/**
 * Get active presentation configuration with ordered playlist items
 */
export async function getActivePresentation(slug: string = "executive-presentation") {
  const presRow = await queryOne<{
    id: number | string;
    name: string;
    slug: string;
    is_active: number | boolean;
    default_slide_seconds: number;
    refresh_interval_seconds: number;
    theme_config: any;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, name, slug, is_active, default_slide_seconds, refresh_interval_seconds, theme_config, created_at, updated_at
     FROM slide_presentations WHERE slug = ? LIMIT 1`,
    [slug]
  );

  if (!presRow) return null;

  const items = await query<{
    id: number | string;
    presentation_id: number | string;
    slide_definition_id: number | string;
    display_order: number;
    duration_seconds: number | null;
    is_enabled: number | boolean;
    config_json: any;
    created_at: string;
    updated_at: string;
    def_id: number | string;
    slide_key: string;
    title: string;
    description: string | null;
    component_key: string;
    config_schema_version: number;
    def_is_enabled: number | boolean;
  }>(
    `SELECT p.id, p.presentation_id, p.slide_definition_id, p.display_order, p.duration_seconds, p.is_enabled, p.config_json, p.created_at, p.updated_at,
            d.id AS def_id, d.slide_key, d.title, d.description, d.component_key, d.config_schema_version, d.is_enabled AS def_is_enabled
     FROM slide_playlist_items p
     JOIN slide_definitions d ON p.slide_definition_id = d.id
     WHERE p.presentation_id = ?
     ORDER BY p.display_order ASC`,
    [presRow.id]
  );

  const playlistItems = items.map((item) => ({
    id: item.id.toString(),
    presentationId: item.presentation_id.toString(),
    slideDefinitionId: item.slide_definition_id.toString(),
    displayOrder: item.display_order,
    durationSeconds: item.duration_seconds,
    isEnabled: Boolean(item.is_enabled),
    configJson: typeof item.config_json === "string" ? JSON.parse(item.config_json) : item.config_json,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    slideDefinition: {
      id: item.def_id.toString(),
      slideKey: item.slide_key,
      title: item.title,
      description: item.description,
      componentKey: item.component_key,
      configSchemaVersion: item.config_schema_version,
      isEnabled: Boolean(item.def_is_enabled),
    },
  }));

  return serializeDbData({
    id: presRow.id.toString(),
    name: presRow.name,
    slug: presRow.slug,
    isActive: Boolean(presRow.is_active),
    defaultSlideSeconds: presRow.default_slide_seconds,
    refreshIntervalSeconds: presRow.refresh_interval_seconds,
    themeConfig: typeof presRow.theme_config === "string" ? JSON.parse(presRow.theme_config) : presRow.theme_config,
    createdAt: presRow.created_at,
    updatedAt: presRow.updated_at,
    playlistItems,
  });
}

/**
 * Update presentation profile
 */
export async function updatePresentation(
  id: bigint | number | string,
  input: z.infer<typeof UpdatePresentationSchema>,
  actorId: bigint = BigInt(1)
) {
  const numericId = Number(id);
  const validated = UpdatePresentationSchema.parse(input);

  const setClauses: string[] = [];
  const params: any[] = [];

  if (validated.name !== undefined) {
    setClauses.push("name = ?");
    params.push(validated.name);
  }
  if (validated.defaultSlideSeconds !== undefined) {
    setClauses.push("default_slide_seconds = ?");
    params.push(validated.defaultSlideSeconds);
  }
  if (validated.refreshIntervalSeconds !== undefined) {
    setClauses.push("refresh_interval_seconds = ?");
    params.push(validated.refreshIntervalSeconds);
  }
  if (validated.isActive !== undefined) {
    setClauses.push("is_active = ?");
    params.push(validated.isActive ? 1 : 0);
  }
  if (validated.themeConfig !== undefined) {
    setClauses.push("theme_config = ?");
    params.push(JSON.stringify(validated.themeConfig));
  }

  setClauses.push("updated_at = NOW(6)");
  params.push(numericId);

  await execute(
    `UPDATE slide_presentations SET ${setClauses.join(", ")} WHERE id = ?`,
    params
  );

  // Audit log
  await execute(
    `INSERT INTO slide_audit_logs (actor_id, action, resource_type, resource_id, details_json, created_at)
     VALUES (?, 'PRESENTATION_PROFILE_UPDATED', 'slide_presentation', ?, ?, NOW(6))`,
    [Number(actorId), String(numericId), JSON.stringify(validated)]
  );

  const updated = await queryOne(
    `SELECT * FROM slide_presentations WHERE id = ? LIMIT 1`,
    [numericId]
  );

  return serializeDbData(updated);
}

/**
 * Update slide playlist ordering and display durations
 */
export async function updatePlaylist(
  items: z.infer<typeof PlaylistItemUpdateSchema>[],
  actorId: bigint = BigInt(1)
) {
  return await withTransaction(async (conn) => {
    const results: any[] = [];
    for (const item of items) {
      const itemId = Number(item.id);
      const setClauses = ["display_order = ?", "updated_at = NOW(6)"];
      const params: any[] = [item.displayOrder];

      if (item.durationSeconds !== undefined) {
        setClauses.push("duration_seconds = ?");
        params.push(item.durationSeconds);
      }
      if (item.isEnabled !== undefined) {
        setClauses.push("is_enabled = ?");
        params.push(item.isEnabled ? 1 : 0);
      }
      params.push(itemId);

      await conn.execute(
        `UPDATE slide_playlist_items SET ${setClauses.join(", ")} WHERE id = ?`,
        params
      );

      const [row] = await conn.query(
        `SELECT * FROM slide_playlist_items WHERE id = ? LIMIT 1`,
        [itemId]
      );
      results.push((row as any[])[0]);
    }

    await conn.execute(
      `INSERT INTO slide_audit_logs (actor_id, action, resource_type, resource_id, details_json, created_at)
       VALUES (?, 'PLAYLIST_REORDERED', 'slide_playlist', 'reorder', ?, NOW(6))`,
      [Number(actorId), JSON.stringify({ count: items.length })]
    );

    return serializeDbData(results);
  });
}

/**
 * Get slide definitions
 */
export async function getSlideDefinitions() {
  const defs = await query<{
    id: number | string;
    slide_key: string;
    title: string;
    description: string | null;
    component_key: string;
    config_schema_version: number;
    is_enabled: number | boolean;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM slide_definitions ORDER BY id ASC`);

  return serializeDbData(
    defs.map((d) => ({
      id: d.id.toString(),
      slideKey: d.slide_key,
      title: d.title,
      description: d.description,
      componentKey: d.component_key,
      configSchemaVersion: d.config_schema_version,
      isEnabled: Boolean(d.is_enabled),
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  );
}

/**
 * Get or update system settings
 */
export async function getSystemSettings(key?: string) {
  if (key) {
    const row = await queryOne<{
      setting_key: string;
      setting_value: any;
    }>(
      `SELECT setting_key, setting_value FROM slide_system_settings WHERE setting_key = ? LIMIT 1`,
      [key]
    );
    if (!row) return null;
    const parsed = typeof row.setting_value === "string" ? JSON.parse(row.setting_value) : row.setting_value;
    return serializeDbData(parsed);
  }

  const all = await query<{
    setting_key: string;
    setting_value: any;
  }>(`SELECT setting_key, setting_value FROM slide_system_settings`);

  const map: Record<string, any> = {};
  for (const s of all) {
    map[s.setting_key] = typeof s.setting_value === "string" ? JSON.parse(s.setting_value) : s.setting_value;
  }
  return serializeDbData(map);
}

export async function setSystemSetting(key: string, value: any, actorId: bigint = BigInt(1)) {
  const jsonValue = JSON.stringify(serializeDbData(value));
  const actId = Number(actorId);

  await execute(
    `INSERT INTO slide_system_settings (setting_key, setting_value, updated_by, updated_at)
     VALUES (?, ?, ?, NOW(6))
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       updated_by = VALUES(updated_by),
       updated_at = NOW(6)`,
    [key, jsonValue, actId]
  );

  return serializeDbData({
    settingKey: key,
    settingValue: value,
    updatedBy: actId,
  });
}

/**
 * Record display session heartbeat without saving raw token
 */
export async function recordDisplaySessionHeartbeat(
  presentationId: bigint | number | string,
  displayName: string,
  sessionToken: string
) {
  const pId = Number(presentationId);
  const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");

  const existing = await queryOne<{
    id: number | string;
  }>(
    `SELECT id FROM slide_display_sessions
     WHERE presentation_id = ? AND session_token_hash = ? AND ended_at IS NULL
     LIMIT 1`,
    [pId, tokenHash]
  );

  if (existing) {
    await execute(
      `UPDATE slide_display_sessions SET last_seen_at = NOW(6) WHERE id = ?`,
      [existing.id]
    );
    const updated = await queryOne(`SELECT * FROM slide_display_sessions WHERE id = ? LIMIT 1`, [existing.id]);
    return serializeDbData(updated);
  }

  const res = await execute(
    `INSERT INTO slide_display_sessions (presentation_id, display_name, session_token_hash, started_at, last_seen_at)
     VALUES (?, ?, ?, NOW(6), NOW(6))`,
    [pId, displayName, tokenHash]
  );

  const created = await queryOne(`SELECT * FROM slide_display_sessions WHERE id = ? LIMIT 1`, [res.insertId]);
  return serializeDbData(created);
}
