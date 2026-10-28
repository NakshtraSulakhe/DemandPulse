import { NextRequest, NextResponse } from "next/server";
import { runAnalyticsSync, getSyncEngineStatus } from "@/lib/sync/sync-engine";
import { verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/analytics/sync
 * Returns sync engine status and last completed timestamp
 */
export async function GET() {
  const status = getSyncEngineStatus();
  return NextResponse.json(
    {
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

/**
 * POST /api/analytics/sync
 * Body: { date?: string, force?: boolean, isFinal?: boolean }
 * Triggers server-side synchronization of CRM operational metrics into MySQL database.
 */
export async function POST(req: NextRequest) {
  // Authorization check (Bearer token, API key, admin session or internal admin portal)
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access to analytics sync engine." },
      { status: 401 }
    );
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body allowed
    }

    const targetDate = body.date || undefined;
    const force = Boolean(body.force);
    const isFinal = Boolean(body.isFinal);

    const result = await runAnalyticsSync(targetDate, {
      force,
      isFinal,
      jobName: "manual_or_api_sync",
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 502,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Sync-Engine": "demandflow-mysql-sync",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Failed to execute sync", details: errorMsg },
      { status: 500 }
    );
  }
}
