import { NextRequest, NextResponse } from "next/server";
import {
  getEmployeeTargetAssignments,
  saveEmployeeTargetAssignment,
  copyPreviousMonthTargets,
  EmployeeRole,
} from "@/lib/db/employee-targets-repository";
import { verifySession } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TargetAssignmentSchema = z.object({
  employee_id: z.number().int().positive(),
  employee_name: z.string().min(1).max(150),
  employee_role: z.enum(["Agent", "QA"]),
  target_month: z.number().int().min(1).max(12),
  target_year: z.number().int().min(2020).max(2050),
  working_days: z.number().int().min(1).max(31).default(22),
  daily_target: z.number().positive(),
  adjusted_monthly_target: z.number().positive().nullable().optional(),
  adjustment_reason: z.string().nullable().optional(),
  quality_threshold_pct: z.number().min(0).max(100).optional(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  remarks: z.string().nullable().optional(),
});

const CopyTargetsSchema = z.object({
  from_month: z.number().int().min(1).max(12),
  from_year: z.number().int().min(2020).max(2050),
  to_month: z.number().int().min(1).max(12),
  to_year: z.number().int().min(2020).max(2050),
  role: z.enum(["Agent", "QA"]).optional(),
});

/**
 * GET /api/productivity/targets
 * Query params: ?role=Agent&month=11&year=2026&employee_id=14
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const roleParam = searchParams.get("role");
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const employeeIdParam = searchParams.get("employee_id");

    const role = roleParam === "Agent" || roleParam === "QA" ? (roleParam as EmployeeRole) : undefined;
    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const employee_id = employeeIdParam ? parseInt(employeeIdParam, 10) : undefined;

    const targets = await getEmployeeTargetAssignments({
      role,
      month,
      year,
      employee_id,
    });

    return NextResponse.json({
      success: true,
      data: targets,
      total: targets.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch employee targets: ${msg}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/productivity/targets
 * Assigns target or copies previous month targets
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

    // Check if copy action requested
    if (body.action === "copy_previous") {
      const parsedCopy = CopyTargetsSchema.parse(body);
      const result = await copyPreviousMonthTargets({
        fromMonth: parsedCopy.from_month,
        fromYear: parsedCopy.from_year,
        toMonth: parsedCopy.to_month,
        toYear: parsedCopy.to_year,
        role: parsedCopy.role,
        performedBy: auth.user?.name || "Admin User",
      });

      return NextResponse.json({
        success: true,
        data: result,
        message: `Successfully copied ${result.copiedCount} targets to ${parsedCopy.to_month}/${parsedCopy.to_year}. (Skipped ${result.skippedCount} existing)`,
      });
    }

    // Standard single target assignment
    const parsed = TargetAssignmentSchema.parse(body);

    const saved = await saveEmployeeTargetAssignment({
      employee_id: parsed.employee_id,
      employee_name: parsed.employee_name,
      employee_role: parsed.employee_role,
      target_month: parsed.target_month,
      target_year: parsed.target_year,
      working_days: parsed.working_days,
      daily_target: parsed.daily_target,
      adjusted_monthly_target: parsed.adjusted_monthly_target,
      adjustment_reason: parsed.adjustment_reason,
      quality_threshold_pct: parsed.quality_threshold_pct,
      effective_date: parsed.effective_date,
      status: parsed.status,
      remarks: parsed.remarks,
      assigned_by: auth.user?.name || "Admin User",
    });

    return NextResponse.json({
      success: true,
      data: saved,
      message: `Target for ${saved.employee_name} (${saved.employee_role}) assigned successfully.`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Validation or assignment error: ${msg}` },
      { status: 400 }
    );
  }
}

