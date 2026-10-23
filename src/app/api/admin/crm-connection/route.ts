import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeDbData } from "@/lib/db";
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
    let setting = await prisma.slideCrmConnectionSetting.findFirst();
    if (!setting) {
      setting = await prisma.slideCrmConnectionSetting.create({
        data: {
          connectionName: "DemandFlow Bridge Primary",
          baseUrl: process.env.CRM_API_BASE_URL || "http://127.0.0.1:8000/api",
          pollingIntervalSeconds: 15,
          timeoutSeconds: 8,
          isActive: true,
          mockFallback: false,
          updatedBy: BigInt(1),
        },
      });
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

    const current = await prisma.slideCrmConnectionSetting.findFirst();
    const id = current?.id || BigInt(1);
    const parsedUserId = Number(auth.user?.id);
    const actorId = !isNaN(parsedUserId) && parsedUserId > 0 ? BigInt(parsedUserId) : BigInt(1);

    const updated = await prisma.slideCrmConnectionSetting.upsert({
      where: { id },
      update: {
        ...validated.data,
        updatedBy: actorId,
      },
      create: {
        connectionName: validated.data.connectionName || "DemandFlow Bridge Primary",
        baseUrl: validated.data.baseUrl || "http://127.0.0.1:8000/api",
        pollingIntervalSeconds: validated.data.pollingIntervalSeconds || 15,
        timeoutSeconds: validated.data.timeoutSeconds || 8,
        isActive: validated.data.isActive ?? true,
        mockFallback: validated.data.mockFallback ?? false,
        updatedBy: actorId,
      },
    });

    await recordSettingChangeEvent(
      "CRM_CONNECTION",
      "connection_settings",
      serializeDbData(current),
      serializeDbData(updated),
      actorId
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
