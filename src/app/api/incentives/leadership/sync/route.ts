import { NextResponse } from "next/server";
import { syncLeadershipFromCrm } from "@/lib/db/leadership-incentive-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/incentives/leadership/sync
 * Syncs real operations managers and team leaders from CRM
 */
export async function POST() {
  try {
    const updated = await syncLeadershipFromCrm();
    return NextResponse.json({
      success: true,
      message: `Synced ${updated.length} leadership members from CRM`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Error in POST /api/incentives/leadership/sync:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync leadership from CRM" },
      { status: 500 }
    );
  }
}

