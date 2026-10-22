import { NextRequest, NextResponse } from "next/server";
import { disburseIncentive } from "@/lib/incentives/api";
import { DisbursePayloadSchema } from "@/lib/incentives/schemas";
import { verifyCsrf } from "@/lib/auth";
import { requireIncentiveAuth } from "@/lib/incentives/permissions";

export const dynamic = "force-dynamic";

/**
 * POST /api/incentives/disburse
 * Body: { payout_id: number, payment_method?: "bank_transfer" | "upi" }
 */
export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { success: false, error: "CSRF token/origin validation failed", error_code: "CSRF_FAILED" },
      { status: 403 }
    );
  }

  const auth = await requireIncentiveAuth(req, "finance");
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error, error_code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const parsed = DisbursePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid disbursement payload",
          error_code: "VALIDATION_ERROR",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const result = await disburseIncentive(parsed.data);

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
