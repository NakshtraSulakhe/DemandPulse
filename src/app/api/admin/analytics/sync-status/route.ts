import { NextRequest, NextResponse } from "next/server";
import { getRecentSyncRuns } from "@/lib/db/sync-run-repository";
import { getSyncEngineStatus } from "@/lib/sync/sync-engine";
import { verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit") || "30";
  const limit = parseInt(limitParam, 10);

  try {
    const [recentRuns, engineStatus] = await Promise.all([
      getRecentSyncRuns(limit),
      Promise.resolve(getSyncEngineStatus()),
    ]);

    return NextResponse.json({
      success: true,
      engine: engineStatus,
      runs: recentRuns,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sync status", details: errorMsg },
      { status: 500 }
    );
  }
}
