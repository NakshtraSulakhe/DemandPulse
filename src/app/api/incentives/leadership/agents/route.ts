import { NextResponse } from "next/server";
import { getAllAssignableAgents } from "@/lib/db/leadership-incentive-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/leadership/agents
 */
export async function GET() {
  try {
    const agents = await getAllAssignableAgents();
    return NextResponse.json({
      success: true,
      data: agents,
      count: agents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in GET /api/incentives/leadership/agents:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

