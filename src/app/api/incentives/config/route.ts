import { NextRequest, NextResponse } from "next/server";
import {
  getIncentiveConfig,
  saveIncentiveConfig,
  calculateIncentiveBreakdown,
} from "@/lib/incentives/rules-config";
import { verifyCsrf } from "@/lib/auth";
import { requireIncentiveAuth } from "@/lib/incentives/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/incentives/config
 * Optionally supports query simulation: ?achieved=14&target=10&status=Present&escalation=0
 */
export async function GET(req: NextRequest) {
  try {
    const config = await getIncentiveConfig();

    const searchParams = req.nextUrl.searchParams;
    const achieved = searchParams.get("achieved");
    const target = searchParams.get("target");

    let simulation = undefined;
    if (achieved !== null && target !== null) {
      const achievedNum = parseFloat(achieved) || 0;
      const targetNum = parseFloat(target) || 10;
      const status = searchParams.get("status") || "Present";
      const escalation = searchParams.get("escalation") === "1" || searchParams.get("escalation") === "true";
      const role = searchParams.get("role") || undefined;
      const department = searchParams.get("department") || undefined;

      simulation = calculateIncentiveBreakdown(
        achievedNum,
        targetNum,
        status,
        escalation,
        config,
        role,
        department
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
      simulation,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: msg, error_code: "CONFIG_FETCH_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/incentives/config
 * Updates the incentive rules configuration
 */
export async function PUT(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { success: false, error: "CSRF token/origin validation failed", error_code: "CSRF_FAILED" },
      { status: 403 }
    );
  }

  const auth = await requireIncentiveAuth(req, "admin");
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error, error_code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    // Basic payload sanity checks
    if (body.baseDailyIncentive !== undefined && (typeof body.baseDailyIncentive !== "number" || body.baseDailyIncentive < 0)) {
      return NextResponse.json(
        { success: false, error: "Base daily incentive must be a non-negative number", error_code: "INVALID_VALUE" },
        { status: 400 }
      );
    }

    if (body.targetThresholdPct !== undefined && (typeof body.targetThresholdPct !== "number" || body.targetThresholdPct < 0)) {
      return NextResponse.json(
        { success: false, error: "Target threshold percentage must be a non-negative number", error_code: "INVALID_VALUE" },
        { status: 400 }
      );
    }

    const updated = await saveIncentiveConfig(body, auth.caller?.name || "Admin User");

    return NextResponse.json({
      success: true,
      message: `Incentive rules updated successfully (v${updated.version})`,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: msg, error_code: "CONFIG_SAVE_ERROR" },
      { status: 500 }
    );
  }
}
