import { NextRequest, NextResponse } from "next/server";
import {
  getProductivityPointConfigs,
  saveProductivityPointConfig,
  getPointsAuditLog,
  getProductivityPointsMap,
  ProductivityDepartment,
} from "@/lib/db/campaign-points-repository";
import { verifySession } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PointConfigSchema = z.object({
  activity_type: z.string().min(2).max(100),
  display_name: z.string().min(2).max(150),
  department: z.enum(["ALL", "Agent", "QA"]).default("ALL"),
  points_factor: z.number().positive(),
  description: z.string().nullable().optional(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_active: z.boolean().optional(),
  remarks: z.string().optional(),
});

/**
 * GET /api/productivity/points
 * Returns configured campaign point factors (optionally filtered by department) and optional audit trail
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const includeAudit = searchParams.get("include_audit") === "true";
    const includeInactive = searchParams.get("include_inactive") === "true";
    const departmentParam = searchParams.get("department");
    const department = (departmentParam === "QA" || departmentParam === "Agent" || departmentParam === "ALL"
      ? departmentParam
      : undefined) as ProductivityDepartment | undefined;

    const [configs, pointsMap, auditLogs] = await Promise.all([
      getProductivityPointConfigs(includeInactive, department),
      getProductivityPointsMap(department === "QA" || department === "Agent" ? department : undefined),
      includeAudit ? getPointsAuditLog(50) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        configs,
        pointsMap,
        auditLogs,
        department: department || "ALL",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch productivity point configs: ${msg}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/productivity/points
 * Creates or updates a campaign productivity point factor with versioning, department scope, and audit record
 */
export async function POST(req: NextRequest) {
  const auth = await verifySession(req, ["admin"]);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || "Admin authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const parsed = PointConfigSchema.parse(body);

    const saved = await saveProductivityPointConfig({
      activity_type: parsed.activity_type,
      display_name: parsed.display_name,
      department: parsed.department,
      points_factor: parsed.points_factor,
      description: parsed.description,
      effective_from: parsed.effective_from,
      is_active: parsed.is_active,
      performed_by: auth.user?.name || "Admin User",
      remarks: parsed.remarks,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      message: `Productivity points for '${saved.display_name}' [${saved.department}] updated to ${saved.points_factor} pts`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Validation or save error: ${msg}` },
      { status: 400 }
    );
  }
}

