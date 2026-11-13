import { NextRequest, NextResponse } from "next/server";
import { getEmployeeTargetAuditLog, EmployeeRole } from "@/lib/db/employee-targets-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/productivity/targets/history
 * Query params: ?employee_id=14&role=Agent&limit=50
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const roleParam = searchParams.get("role");
    const employeeIdParam = searchParams.get("employee_id");
    const limitParam = searchParams.get("limit");

    const role = roleParam === "Agent" || roleParam === "QA" ? (roleParam as EmployeeRole) : undefined;
    const employee_id = employeeIdParam ? parseInt(employeeIdParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const auditRecords = await getEmployeeTargetAuditLog({
      role,
      employee_id,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: auditRecords,
      total: auditRecords.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch target audit history: ${msg}` },
      { status: 500 }
    );
  }
}

