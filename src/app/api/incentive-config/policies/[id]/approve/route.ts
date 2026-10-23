import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { reviewPolicyApproval } from "@/lib/incentives/policy-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ApproveInputSchema = z.object({
  action: z.enum(["approve", "reject"]),
  remarks: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = ApproveInputSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'approve' or 'reject'.", details: validated.error.format() },
        { status: 400 }
      );
    }

    const updated = await reviewPolicyApproval(
      params.id,
      validated.data.action,
      BigInt(1),
      validated.data.remarks
    );

    return NextResponse.json({
      success: true,
      message: `Policy ${updated.policyCode} (v${updated.version}) ${validated.data.action === "approve" ? "approved" : "rejected"} successfully.`,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to process policy review" }, { status: 400 });
  }
}
