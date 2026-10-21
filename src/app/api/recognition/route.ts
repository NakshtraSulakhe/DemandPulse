import { NextRequest, NextResponse } from "next/server";
import { getCrmRecognition } from "@/lib/crm-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || undefined;
  const result = await getCrmRecognition(date);

  return NextResponse.json(result, {
    status: result.success ? 200 : 502,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Data-Source": "live-crm-api",
    },
  });
}
