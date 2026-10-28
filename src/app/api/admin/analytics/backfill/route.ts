import { NextRequest, NextResponse } from "next/server";
import { runHistoricalBackfill } from "@/lib/sync/backfill-service";
import { verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { start_date, end_date, overwrite_existing, mark_final } = body;

    if (!start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: "Missing start_date or end_date (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const summary = await runHistoricalBackfill(start_date, end_date, {
      overwriteExisting: Boolean(overwrite_existing),
      markFinal: mark_final !== false,
    });

    return NextResponse.json({
      success: true,
      data: summary,
      message: `Historical backfill completed across ${summary.totalDays} day(s).`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: "Backfill execution failed", details: errorMsg },
      { status: 500 }
    );
  }
}
