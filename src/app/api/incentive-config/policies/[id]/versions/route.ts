import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { getPolicyVersions, getPolicyById, updatePolicy } from "@/lib/incentives/policy-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const current = await getPolicyById(params.id);
    if (!current) {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }

    const versions = await getPolicyVersions(current.policyCode);
    return NextResponse.json({ success: true, count: versions.length, data: versions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch policy versions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const current = await getPolicyById(params.id);
    if (!current) {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }

    // Force create new version by calling update with existing data
    const newVersion = await updatePolicy(
      params.id,
      {
        policyName: current.policyName,
        currency: current.currency,
        rules: {
          minimumTargetPct: Number(current.rules?.minimumTargetPct ?? 100),
          baseIncentiveAmount: Number(current.rules?.baseIncentiveAmount ?? 500),
          attendanceRequired: current.rules?.attendanceRequired ?? true,
          qaEscalationAction: current.rules?.qaEscalationAction ?? "disqualify",
          penaltyAmount: Number(current.rules?.penaltyAmount ?? 0),
          maximumDailyIncentive: current.rules?.maximumDailyIncentive ? Number(current.rules.maximumDailyIncentive) : null,
          roundingMode: current.rules?.roundingMode ?? "floor",
        },
        slabs: current.slabs.map((s: any) => ({
          slabOrder: s.slabOrder,
          minimumCompletionPct: Number(s.minimumCompletionPct),
          maximumCompletionPct: s.maximumCompletionPct ? Number(s.maximumCompletionPct) : null,
          amountPerExtraPoint: Number(s.amountPerExtraPoint),
        })),
      },
      BigInt(1)
    );

    return NextResponse.json({
      success: true,
      message: `New version (v${newVersion.version}) draft created successfully`,
      data: newVersion,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to create new version" }, { status: 400 });
  }
}
