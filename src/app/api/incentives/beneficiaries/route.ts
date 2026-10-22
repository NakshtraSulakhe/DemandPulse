import { NextRequest, NextResponse } from "next/server";
import { fetchBeneficiary, saveBeneficiary } from "@/lib/incentives/api";
import { SaveBeneficiaryPayloadSchema } from "@/lib/incentives/schemas";
import { verifyCsrf } from "@/lib/auth";
import { requireIncentiveAuth } from "@/lib/incentives/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/incentives/beneficiaries?agent_id=14
 */
export async function GET(req: NextRequest) {
  const agentIdStr = req.nextUrl.searchParams.get("agent_id");
  const agentId = agentIdStr ? parseInt(agentIdStr, 10) : 0;

  if (agentId <= 0) {
    return NextResponse.json(
      { success: false, error: "Valid agent_id parameter is required", error_code: "INVALID_AGENT_ID" },
      { status: 400 }
    );
  }

  const result = await fetchBeneficiary(agentId);

  return NextResponse.json(result, {
    status: result.success ? 200 : result.status || 500,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

/**
 * POST /api/incentives/beneficiaries
 * Body: { agent_id: number, payment_method: "bank_transfer"|"upi", ... }
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
    const parsed = SaveBeneficiaryPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid beneficiary configuration payload",
          error_code: "VALIDATION_ERROR",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const result = await saveBeneficiary(parsed.data);

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
