import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { getPolicyById, updatePolicy, UpdatePolicyInputSchema } from "@/lib/incentives/policy-service";
import { queryOne, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const policy = await getPolicyById(params.id);
    if (!policy) {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: policy });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch policy" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = UpdatePolicyInputSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const updated = await updatePolicy(params.id, validated.data, BigInt(1));
    return NextResponse.json({
      success: true,
      message: updated.isNewVersion
        ? `Existing policy was active/approved. Created new version draft (v${updated.version}) to protect financial audit history.`
        : "Policy updated successfully",
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to update policy" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const numericId = Number(params.id);
    const policy = await queryOne<{ id: number; status: string }>(
      `SELECT id, status FROM incentive_policies WHERE id = ? LIMIT 1`,
      [numericId]
    );

    if (!policy) {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }

    if (policy.status === "active" || policy.status === "approved") {
      return NextResponse.json(
        { success: false, error: `Cannot delete policy in '${policy.status}' status. Historical financial policies must be retired, not deleted.` },
        { status: 400 }
      );
    }

    await execute(`DELETE FROM incentive_policies WHERE id = ?`, [numericId]);

    return NextResponse.json({ success: true, message: "Draft policy deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to delete policy" }, { status: 400 });
  }
}
