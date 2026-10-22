import { NextRequest, NextResponse } from "next/server";
import { getCrmCampaignTargets, saveCrmCampaignTargets } from "@/lib/crm-api";
import { SaveDailyTargetsPayloadSchema } from "@/lib/validations";
import { verifyCsrf } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/campaign-targets
 * Query params: ?date=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const status = req.nextUrl.searchParams.get("status") || "Live";
  const result = await getCrmCampaignTargets(date, status);

  return NextResponse.json(result, {
    status: result.success ? 200 : 502,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Data-Source": "live-crm-api",
      "X-Campaign-Filter": status,
    },
  });
}

/**
 * POST /api/campaign-targets
 * Body: { target_date: string, targets: Array<{ campaign_id: number, daily_target: number, notes?: string }> }
 */
export async function POST(req: NextRequest) {
  // CSRF validation
  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: "CSRF token/origin validation failed" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = SaveDailyTargetsPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request payload",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const saveResult = await saveCrmCampaignTargets(parsed.data);

    if (!saveResult.ok) {
      return NextResponse.json(saveResult, { status: 502 });
    }

    return NextResponse.json(saveResult, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Failed to process campaign targets request", details: errorMsg },
      { status: 500 }
    );
  }
}
