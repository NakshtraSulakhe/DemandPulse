import { NextRequest, NextResponse } from "next/server";
import { runDatabaseDiagnostic, getSafeDatabaseConfigSummary } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/db-diagnostic
 * Reusable diagnostic endpoint to safely test Hostinger MySQL database connectivity.
 * Verifies host, port, username, database name, and actual selected database.
 * Never logs or exposes passwords, auth tokens, or raw connection strings.
 */
export async function GET(req: NextRequest) {
  try {
    const diagnostic = await runDatabaseDiagnostic();

    const statusCode = diagnostic.ok ? 200 : 503;
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        ...diagnostic,
      },
      { status: statusCode }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        status: "UNEXPECTED_ERROR",
        timestamp: new Date().toISOString(),
        details: {
          config: getSafeDatabaseConfigSummary(),
          error: err?.message || String(err),
        },
      },
      { status: 500 }
    );
  }
}

