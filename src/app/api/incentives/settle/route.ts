import { NextRequest, NextResponse } from "next/server";
import { settleIncentives } from "@/lib/incentives/api";
import { SettlePayloadSchema } from "@/lib/incentives/schemas";
import { verifyCsrf } from "@/lib/auth";
import { requireIncentiveAuth } from "@/lib/incentives/permissions";
import { getCurrentShiftState } from "@/lib/shift/engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/incentives/settle
 * Body: { work_date: "YYYY-MM-DD", mode: "dry_run" | "finalize" | "recalculate_unpaid", manager_override?: boolean, override_reason?: string }
 */
export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { success: false, error: "CSRF token/origin validation failed", error_code: "CSRF_FAILED" },
      { status: 403 }
    );
  }

  const auth = await requireIncentiveAuth(req, "manager");
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error, error_code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const parsed = SettlePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid settlement parameters",
          error_code: "VALIDATION_ERROR",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    // Phase 6: Shift Closure Guard
    // If finalizing the currently active shift before 02:30 AM IST closure, require explicit manager override
    if (parsed.data.mode === "finalize") {
      const shiftState = getCurrentShiftState();
      if (
        parsed.data.work_date === shiftState.businessDate &&
        shiftState.status === "active" &&
        !parsed.data.manager_override
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Shift for ${parsed.data.work_date} is currently ACTIVE (${shiftState.currentIstTime} IST). Final settlement should be executed after shift closure at 02:30 AM IST when all dialing and QA scorecard audits have concluded.`,
            error_code: "SHIFT_IN_PROGRESS",
            requires_override: true,
            shift_state: {
              business_date: shiftState.businessDate,
              ist_time: shiftState.currentIstTime,
              status: shiftState.status,
            },
          },
          { status: 409 }
        );
      }
    }

    const result = await settleIncentives(parsed.data);

    return NextResponse.json(result, {
      status: result.success ? 200 : result.status || 500,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: msg, error_code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
