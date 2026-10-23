import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { getPolicyById, updatePolicy, UpdatePolicyInputSchema } from "@/lib/incentives/policy-service";
import { prisma } from "@/lib/db";

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
    const policy = await prisma.incentivePolicy.findUnique({
      where: { id: BigInt(params.id) },
    });

    if (!policy) {
      return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 });
    }

    if (policy.status === "active" || policy.status === "approved") {
      return NextResponse.json(
        { success: false, error: `Cannot delete policy in '${policy.status}' status. Historical financial policies must be retired, not deleted.` },
        { status: 400 }
      );
    }

    await prisma.incentivePolicy.delete({
      where: { id: BigInt(params.id) },
    });

    return NextResponse.json({ success: true, message: "Draft policy deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to delete policy" }, { status: 400 });
  }
}
