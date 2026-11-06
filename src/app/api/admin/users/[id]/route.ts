import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { updateUser, deleteUser } from "@/lib/db/user-repository";

/**
 * PATCH /api/admin/users/[id]
 * Updates user attributes (role, active status, display name, password) (Admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error || "Admin privileges required" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "User ID required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const updates: any = {};

    if (body.display_name !== undefined) updates.display_name = String(body.display_name);
    if (body.role !== undefined) updates.role = body.role === "admin" ? "admin" : "operations";
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
    if (body.password !== undefined && String(body.password).trim().length > 0) {
      if (String(body.password).trim().length < 6) {
        return NextResponse.json({ ok: false, error: "New password must be at least 6 characters." }, { status: 400 });
      }
      updates.password = String(body.password).trim();
    }

    const updated = await updateUser(id, updates);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: "User updated successfully",
      user: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update user";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Deletes user (Admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error || "Admin privileges required" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "User ID required" }, { status: 400 });
  }

  try {
    await deleteUser(id);
    return NextResponse.json({
      ok: true,
      message: "User deleted successfully",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete user";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

