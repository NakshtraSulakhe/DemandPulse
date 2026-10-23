import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { listPolicies, createPolicy, CreatePolicyInputSchema } from "@/lib/incentives/policy-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/incentive-config/policies
 * List all policies or filter by status
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  try {
    const policies = await listPolicies({ status, search });
    return NextResponse.json({ success: true, count: policies.length, data: policies });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to list policies" }, { status: 500 });
  }
}

/**
 * POST /api/incentive-config/policies
 * Create a new draft policy
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = CreatePolicyInputSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const policy = await createPolicy(validated.data, BigInt(auth.user?.id === "admin-api" ? 1 : 1));
    return NextResponse.json({ success: true, message: "Policy draft created successfully", data: policy }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to create policy" }, { status: 400 });
  }
}
