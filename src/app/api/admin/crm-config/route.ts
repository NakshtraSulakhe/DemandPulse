import { NextRequest, NextResponse } from "next/server";
import { getCrmConfig, saveCrmConfig, resetCrmConfig } from "@/lib/crm-config";
import { verifyCsrf } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/crm-config
 * Returns current CRM API configuration and polling intervals
 */
export async function GET() {
  try {
    const config = await getCrmConfig();
    return NextResponse.json({
      ok: true,
      data: config,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Failed to read CRM configuration", details: msg },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/crm-config
 * Updates CRM API and interval settings
 */
export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { ok: false, error: "CSRF token/origin validation failed" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    // Basic validation
    if (body.crmApiBaseUrl && typeof body.crmApiBaseUrl === "string") {
      const trimmed = body.crmApiBaseUrl.trim();
      if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        return NextResponse.json(
          { ok: false, error: "CRM API Base URL must begin with http:// or https://" },
          { status: 400 }
        );
      }
    }

    const updated = await saveCrmConfig(body, "Admin Console");

    return NextResponse.json({
      ok: true,
      message: "CRM API configuration and sync intervals updated successfully.",
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Failed to save CRM configuration", details: msg },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/crm-config
 * Resets configuration back to environment variable defaults
 */
export async function DELETE(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { ok: false, error: "CSRF token/origin validation failed" },
      { status: 403 }
    );
  }

  try {
    const reset = await resetCrmConfig();
    return NextResponse.json({
      ok: true,
      message: "Configuration successfully reset to environment defaults.",
      data: reset,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Failed to reset configuration", details: msg },
      { status: 500 }
    );
  }
}
