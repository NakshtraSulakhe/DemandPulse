import { NextRequest, NextResponse } from "next/server";
import { getCrmCustomApi } from "@/lib/crm-api";
import { verifyCsrf } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Universal CRM API Proxy Route
 * GET /api/crm/proxy?endpoint=[id]&...extraParams
 * POST /api/crm/proxy?endpoint=[id]
 *
 * Allows any newly created or custom upstream endpoint configured in the
 * Admin Panel to be queried seamlessly from client or server components.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const endpoint = searchParams.get("endpoint") || searchParams.get("path");

  if (!endpoint) {
    return NextResponse.json(
      { ok: false, error: "Missing required query parameter: 'endpoint' or 'path'" },
      { status: 400 }
    );
  }

  // Collect extra query params to forward
  const extraParams: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    if (key !== "endpoint" && key !== "path") {
      extraParams[key] = val;
    }
  });

  try {
    const result = await getCrmCustomApi(endpoint, extraParams);

    return NextResponse.json(result, {
      status: result.success ? 200 : 502,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Proxied-Endpoint": endpoint,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "CRM Proxy request failed", details: msg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { ok: false, error: "CSRF token/origin validation failed" },
      { status: 403 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const endpoint = searchParams.get("endpoint") || searchParams.get("path");

  if (!endpoint) {
    return NextResponse.json(
      { ok: false, error: "Missing required query parameter: 'endpoint' or 'path'" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json().catch(() => undefined);

    const result = await getCrmCustomApi(endpoint, undefined, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 502,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Proxied-Endpoint": endpoint,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "CRM Proxy POST request failed", details: msg },
      { status: 500 }
    );
  }
}
