import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute, serializeDbData } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";
import { recordSettingChangeEvent } from "@/lib/db/preferences-repository";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateCrmConnectionSchema = z.object({
  connectionName: z.string().max(100).optional(),
  baseUrl: z.string().url().max(500).optional(),
  pollingIntervalSeconds: z.number().int().min(5).max(300).optional(),
  timeoutSeconds: z.number().int().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
  mockFallback: z.boolean().optional(),
});

/**
 * GET /api/admin/crm-connection
 * Read non-secret CRM connection settings from MySQL
 */
export async function GET() {
  try {
    let setting = await queryOne<any>(
      `SELECT * FROM slide_crm_connection_settings LIMIT 1`
    );

    if (!setting) {
      const defaultUrl = process.env.CRM_API_BASE_URL || "https://app.tarajglobal.com/demandflowbridge/api/v1";
      await execute(
        `INSERT INTO slide_crm_connection_settings
           (id, connection_name, base_url, polling_interval_seconds, timeout_seconds, is_active, mock_fallback, updated_by, created_at, updated_at)
         VALUES (1, 'DemandFlow Bridge Primary', ?, 15, 8, 1, 0, 1, NOW(6), NOW(6))`,
        [defaultUrl]
      );
      setting = await queryOne<any>(`SELECT * FROM slide_crm_connection_settings WHERE id = 1 LIMIT 1`);
    }

    return NextResponse.json({
      success: true,
      data: serializeDbData(setting),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch CRM connection settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/crm-connection
 * Update CRM connection configuration in MySQL
 */
export async function PUT(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = UpdateCrmConnectionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const current = await queryOne<any>(`SELECT * FROM slide_crm_connection_settings LIMIT 1`);
    const id = current?.id || 1;
    const parsedUserId = Number(auth.user?.id);
    const actorId = !isNaN(parsedUserId) && parsedUserId > 0 ? parsedUserId : 1;

    const data = validated.data;
    const connName = data.connectionName || current?.connection_name || "DemandFlow Bridge Primary";
    const baseUrl = data.baseUrl || current?.base_url || process.env.CRM_API_BASE_URL || "https://app.tarajglobal.com/demandflowbridge/api/v1";
    const pollInterval = data.pollingIntervalSeconds ?? current?.polling_interval_seconds ?? 15;
    const timeoutSec = data.timeoutSeconds ?? current?.timeout_seconds ?? 8;
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : (current?.is_active ?? 1);
    const mockFallback = data.mockFallback !== undefined ? (data.mockFallback ? 1 : 0) : (current?.mock_fallback ?? 0);

    await execute(
      `INSERT INTO slide_crm_connection_settings
         (id, connection_name, base_url, polling_interval_seconds, timeout_seconds, is_active, mock_fallback, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))
       ON DUPLICATE KEY UPDATE
         connection_name = VALUES(connection_name),
         base_url = VALUES(base_url),
         polling_interval_seconds = VALUES(polling_interval_seconds),
         timeout_seconds = VALUES(timeout_seconds),
         is_active = VALUES(is_active),
         mock_fallback = VALUES(mock_fallback),
         updated_by = VALUES(updated_by),
         updated_at = NOW(6)`,
      [id, connName, baseUrl, pollInterval, timeoutSec, isActive, mockFallback, actorId]
    );

    const updated = await queryOne<any>(`SELECT * FROM slide_crm_connection_settings WHERE id = ? LIMIT 1`, [id]);

    await recordSettingChangeEvent(
      "CRM_CONNECTION",
      "connection_settings",
      serializeDbData(current),
      serializeDbData(updated),
      BigInt(actorId)
    );

    return NextResponse.json({
      success: true,
      message: "CRM connection configuration updated in MySQL",
      data: serializeDbData(updated),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update CRM connection settings" },
      { status: 400 }
    );
  }
}
