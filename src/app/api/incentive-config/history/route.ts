import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { getAuditHistory } from "@/lib/incentives/policy-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const logs = await getAuditHistory(limit);
    return NextResponse.json({ success: true, count: logs.length, data: logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch audit history" }, { status: 500 });
  }
}
