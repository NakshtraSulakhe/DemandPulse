import { NextRequest, NextResponse } from "next/server";
import {
  getLeadershipMembers,
  createLeadershipMember,
  updateLeadershipMember,
  deleteLeadershipMember,
} from "@/lib/db/leadership-incentive-repository";
import { LeadershipRole } from "@/types/leadership-incentives";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/incentives/leadership/members?role=manager|team_leader&includeInactive=1
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const roleParam = searchParams.get("role") as LeadershipRole | null;
    const includeInactive = searchParams.get("includeInactive") === "1";

    const members = await getLeadershipMembers({
      role: roleParam || undefined,
      includeInactive,
    });

    return NextResponse.json({
      success: true,
      data: members,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in GET /api/incentives/leadership/members:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leadership members" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incentives/leadership/members
 * Body: { member_name, member_role, crm_user_id?, email?, phone?, parent_manager_id?, notes? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.member_name || !body.member_role) {
      return NextResponse.json(
        { success: false, error: "member_name and member_role are required." },
        { status: 400 }
      );
    }

    if (!["team_leader", "manager"].includes(body.member_role)) {
      return NextResponse.json(
        { success: false, error: "member_role must be 'team_leader' or 'manager'." },
        { status: 400 }
      );
    }

    const insertId = await createLeadershipMember({
      member_name: body.member_name,
      member_role: body.member_role,
      crm_user_id: body.crm_user_id ? Number(body.crm_user_id) : null,
      email: body.email || null,
      phone: body.phone || null,
      parent_manager_id: body.parent_manager_id ? Number(body.parent_manager_id) : null,
      notes: body.notes || null,
    });

    return NextResponse.json({
      success: true,
      message: "Leadership member created successfully",
      id: insertId,
    });
  } catch (error: any) {
    console.error("Error in POST /api/incentives/leadership/members:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create leadership member" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/incentives/leadership/members
 * Body: { id, member_name?, member_role?, ... }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Valid id is required for update." },
        { status: 400 }
      );
    }

    await updateLeadershipMember(id, body);

    return NextResponse.json({
      success: true,
      message: "Leadership member updated successfully",
    });
  } catch (error: any) {
    console.error("Error in PUT /api/incentives/leadership/members:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update leadership member" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/incentives/leadership/members?id=123&permanent=0
 */
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = Number(searchParams.get("id"));
    const permanent = searchParams.get("permanent") === "1";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Valid member id is required" },
        { status: 400 }
      );
    }

    await deleteLeadershipMember(id, permanent);

    return NextResponse.json({
      success: true,
      message: permanent
        ? "Leadership member permanently removed"
        : "Leadership member deactivated successfully",
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/incentives/leadership/members:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete leadership member" },
      { status: 500 }
    );
  }
}

