import { NextRequest, NextResponse } from "next/server";
import { updateQaIncentivePlan, deleteQaIncentivePlan } from "@/lib/db/qa-incentive-repository";
import { updateCrmQaPlan, deleteCrmQaPlan } from "@/lib/crm-api";
import { verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * PUT /api/qa-incentives/plans/[id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: 403 });
  }

  try {
    const id = params.id;
    const body = await req.json();

    const updated = await updateQaIncentivePlan(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    // Sync to CRM API if reachable
    updateCrmQaPlan(id, body).catch((err) =>
      console.warn(`[qa-plans] Upstream update for plan #${id} skipped:`, err.message)
    );

    return NextResponse.json({
      success: true,
      message: "Plan updated successfully",
      data: updated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to update plan: ${errorMsg}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/qa-incentives/plans/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: 403 });
  }

  try {
    const id = params.id;
    await deleteQaIncentivePlan(id);

    // Sync to CRM API if reachable
    deleteCrmQaPlan(id).catch((err) =>
      console.warn(`[qa-plans] Upstream delete for plan #${id} skipped:`, err.message)
    );

    return NextResponse.json({
      success: true,
      message: "Plan deleted successfully",
      id,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to delete plan: ${errorMsg}` },
      { status: 500 }
    );
  }
}

