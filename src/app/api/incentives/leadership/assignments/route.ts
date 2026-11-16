import { NextRequest, NextResponse } from "next/server";
import { setLeadershipAssignments } from "@/lib/db/leadership-incentive-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/incentives/leadership/assignments
 * Body: { leadership_id: number, agents: { agent_id: number, agent_name: string }[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const leadershipId = Number(body.leadership_id);
    const agents = body.agents || [];

    if (!leadershipId) {
      return NextResponse.json(
        { success: false, error: "leadership_id is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(agents)) {
      return NextResponse.json(
        { success: false, error: "agents must be an array of { agent_id, agent_name }." },
        { status: 400 }
      );
    }

    await setLeadershipAssignments(leadershipId, agents);

    return NextResponse.json({
      success: true,
      message: `Assigned ${agents.length} agent(s) successfully`,
      assigned_count: agents.length,
    });
  } catch (error: any) {
    console.error("Error in POST /api/incentives/leadership/assignments:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update assignments" },
      { status: 500 }
    );
  }
}

