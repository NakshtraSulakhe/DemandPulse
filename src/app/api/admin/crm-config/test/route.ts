import { NextRequest, NextResponse } from "next/server";
import { testCrmConnection } from "@/lib/crm-config";
import { verifyCsrf } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/admin/crm-config/test
 * Probes the target CRM API endpoints to test connectivity and measure latency
 */
export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { ok: false, error: "CSRF token/origin validation failed" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { baseUrl, token, timeoutMs } = body;

    const report = await testCrmConnection(baseUrl, token, timeoutMs);

    return NextResponse.json({
      ok: report.ok,
      report,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to execute CRM connectivity test",
        details: msg,
      },
      { status: 500 }
    );
  }
}
