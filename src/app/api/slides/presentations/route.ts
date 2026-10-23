import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { getActivePresentation, updatePresentation, UpdatePresentationSchema } from "@/lib/slides/presentation-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") || "executive-presentation";

  try {
    const presentation = await getActivePresentation(slug);
    if (!presentation) {
      return NextResponse.json({ success: false, error: "Presentation not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: presentation });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch presentation" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing required field: id" }, { status: 400 });
    }

    const validated = UpdatePresentationSchema.safeParse(data);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const updated = await updatePresentation(id, validated.data, BigInt(1));
    return NextResponse.json({ success: true, message: "Presentation profile updated successfully", data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to update presentation" }, { status: 400 });
  }
}
