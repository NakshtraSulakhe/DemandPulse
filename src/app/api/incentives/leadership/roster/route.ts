import { NextResponse } from "next/server";
import { getRealCrmRoster } from "@/lib/crm-roster";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/leadership/roster
 * Returns all real CRM employees/roster members for quick selection
 */
export async function GET() {
  try {
    const roster = await getRealCrmRoster();
    return NextResponse.json({
      success: true,
      data: roster,
      count: roster.length,
    });
  } catch (error: any) {
    console.error("Error in GET /api/incentives/leadership/roster:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch CRM roster" },
      { status: 500 }
    );
  }
}

