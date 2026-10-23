import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { listAssignments, assignPolicy, deleteAssignment, PolicyAssignmentInputSchema } from "@/lib/incentives/policy-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scopeType = searchParams.get("scopeType") || undefined;

  try {
    const assignments = await listAssignments(scopeType);
    return NextResponse.json({ success: true, count: assignments.length, data: assignments });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to list assignments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = PolicyAssignmentInputSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const assignment = await assignPolicy(validated.data, BigInt(1));
    return NextResponse.json({
      success: true,
      message: "Policy assigned successfully",
      data: assignment,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to assign policy" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing required query parameter: id" }, { status: 400 });
    }

    const deleted = await deleteAssignment(id, BigInt(1));
    return NextResponse.json({ success: true, message: "Assignment deleted successfully", data: deleted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to delete assignment" }, { status: 400 });
  }
}
