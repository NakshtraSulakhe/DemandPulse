import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { publishPolicyToCrm } from "@/lib/incentives/crm-publisher";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const result = await publishPolicyToCrm(params.id, BigInt(1));
    return NextResponse.json({
      success: result.success,
      status: result.status,
      message: result.message,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to publish policy to CRM" }, { status: 400 });
  }
}
