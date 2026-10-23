import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { getSystemSettings, setSystemSetting } from "@/lib/slides/presentation-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || undefined;

  try {
    const settings = await getSystemSettings(key);
    return NextResponse.json({ success: true, data: settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ success: false, error: "Missing required field: key" }, { status: 400 });
    }

    const updated = await setSystemSetting(key, value, BigInt(1));
    return NextResponse.json({ success: true, message: "Setting saved successfully", data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to save setting" }, { status: 400 });
  }
}
