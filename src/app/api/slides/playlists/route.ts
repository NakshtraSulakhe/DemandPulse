import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { getActivePresentation, updatePlaylist, PlaylistItemUpdateSchema } from "@/lib/slides/presentation-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const presentation = await getActivePresentation("executive-presentation");
    if (!presentation) {
      return NextResponse.json({ success: false, error: "Presentation not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: presentation.playlistItems,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch playlist" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = z.array(PlaylistItemUpdateSchema).safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const updated = await updatePlaylist(validated.data, BigInt(1));
    return NextResponse.json({ success: true, message: "Playlist updated successfully", data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to update playlist" }, { status: 400 });
  }
}
