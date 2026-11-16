import { NextRequest, NextResponse } from "next/server";
import {
  getAllLeadershipPlans,
  saveLeadershipPlan,
} from "@/lib/db/leadership-incentive-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/leadership/plans
 */
export async function GET() {
  try {
    const plans = await getAllLeadershipPlans();
    return NextResponse.json({
      success: true,
      data: plans,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in GET /api/incentives/leadership/plans:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leadership plans" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incentives/leadership/plans
 * Body: { id?, plan_name, role_target, frequency, min_threshold_pct, tiers, is_active?, notes? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.plan_name || !body.role_target || !body.frequency) {
      return NextResponse.json(
        { success: false, error: "plan_name, role_target, and frequency are required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.tiers)) {
      return NextResponse.json(
        { success: false, error: "tiers must be an array." },
        { status: 400 }
      );
    }

    const planId = await saveLeadershipPlan({
      id: body.id ? Number(body.id) : undefined,
      plan_name: body.plan_name,
      role_target: body.role_target,
      frequency: body.frequency,
      min_threshold_pct: Number(body.min_threshold_pct) || 100.0,
      tiers: body.tiers,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      notes: body.notes || null,
    });

    return NextResponse.json({
      success: true,
      message: "Leadership incentive plan saved successfully",
      id: planId,
    });
  } catch (error: any) {
    console.error("Error in POST /api/incentives/leadership/plans:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save leadership plan" },
      { status: 500 }
    );
  }
}

