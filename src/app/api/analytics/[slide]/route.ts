import { NextRequest, NextResponse } from "next/server";
import {
  getCrmSlide1,
  getCrmSlide2,
  getCrmSlide3,
  getCrmSlide4,
  getCrmSlide5,
  getCrmRecognition,
} from "@/lib/crm-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { slide: string } }
) {
  const slide = params.slide.toLowerCase();
  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get("date") || undefined;

  try {
    switch (slide) {
      case "slide1": {
        const result = await getCrmSlide1(date);
        return NextResponse.json(result, {
          status: result.success ? 200 : 502,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Data-Source": "live-crm-api",
          },
        });
      }

      case "slide2": {
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limitParam = searchParams.get("limit") || "10";
        const limit = limitParam === "all" ? 100 : parseInt(limitParam, 10);
        const result = await getCrmSlide2(date, page, limit);
        return NextResponse.json(result, {
          status: result.success ? 200 : 502,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Data-Source": "live-crm-api",
          },
        });
      }

      case "slide3": {
        const interval = parseInt(searchParams.get("interval") || "10", 10);
        const shiftStart = searchParams.get("shift_start") || "17:30:00";
        const shiftEnd = searchParams.get("shift_end") || "02:30:00";
        const result = await getCrmSlide3(date, interval, shiftStart, shiftEnd);
        return NextResponse.json(result, {
          status: result.success ? 200 : 502,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Data-Source": "live-crm-api",
          },
        });
      }

      case "slide4": {
        const interval = parseInt(searchParams.get("interval") || "10", 10);
        const shiftStart = searchParams.get("shift_start") || "17:30:00";
        const shiftEnd = searchParams.get("shift_end") || "02:30:00";
        const result = await getCrmSlide4(date, interval, shiftStart, shiftEnd);
        return NextResponse.json(result, {
          status: result.success ? 200 : 502,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Data-Source": "live-crm-api",
          },
        });
      }

      case "slide5": {
        const shiftStart = searchParams.get("shift_start") || "17:30:00";
        const shiftEnd = searchParams.get("shift_end") || "02:30:00";
        const result = await getCrmSlide5(date, shiftStart, shiftEnd);
        return NextResponse.json(result, {
          status: result.success ? 200 : 502,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Data-Source": "live-crm-api",
          },
        });
      }

      case "recognition": {
        const result = await getCrmRecognition(date);
        return NextResponse.json(result, {
          status: result.success ? 200 : 502,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Data-Source": "live-crm-api",
          },
        });
      }

      case "all": {
        const [s1, s2, s3, s4, s5] = await Promise.all([
          getCrmSlide1(date),
          getCrmSlide2(date, 1, 10),
          getCrmSlide3(date),
          getCrmSlide4(date),
          getCrmSlide5(date),
        ]);

        const allSuccess = s1.success && s2.success && s3.success && s4.success && s5.success;

        return NextResponse.json(
          {
            success: allSuccess,
            data: {
              slide1: s1.data,
              slide2: s2.data,
              slide3: s3.data,
              slide4: s4.data,
              slide5: s5.data,
            },
            errors: {
              slide1: s1.error,
              slide2: s2.error,
              slide3: s3.error,
              slide4: s4.error,
              slide5: s5.error,
            },
            timestamp: new Date().toISOString(),
          },
          {
            status: allSuccess ? 200 : 207,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          }
        );
      }

      default:
        return NextResponse.json(
          { error: `Unknown slide action: ${slide}. Expected slide1, slide2, slide3, slide4, slide5, or all.` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Internal analytics server error", details: errorMsg },
      { status: 500 }
    );
  }
}
