import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { submitPolicyForApproval } from "@/lib/incentives/policy-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const updated = await submitPolicyForApproval(params.id, BigInt(1));
    return NextResponse.json({
      success: true,
      message: `Policy ${updated.policyCode} (v${updated.version}) submitted for operations manager review and approval.`,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to submit policy for approval" }, { status: 400 });
  }
}
