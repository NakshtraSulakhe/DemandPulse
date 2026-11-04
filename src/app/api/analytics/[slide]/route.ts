import { NextRequest, NextResponse } from "next/server";
import {
  getCrmSlide1,
  getCrmSlide2,
  getCrmSlide3,
  getCrmSlide4,
  getCrmSlide5,
  getCrmSlide6,
  getCrmRecognition,
} from "@/lib/crm-api";
import {
  getDbSlide1,
  getDbSlide2,
  getDbSlide3,
  getDbSlide4,
  getDbSlide5,
} from "@/lib/slides/db-slide-reader";
import { getShiftBusinessDate } from "@/lib/shift/engine";
import { runAnalyticsSync } from "@/lib/sync/sync-engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Normalizes input date strings (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY) into canonical YYYY-MM-DD
 */
function normalizeDateParam(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Case 1: Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Case 2: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Case 3: YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return undefined;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slide: string } }
) {
  const slide = params.slide.toLowerCase();
  const searchParams = req.nextUrl.searchParams;
  const rawDate = searchParams.get("date");
  const dateParam = normalizeDateParam(rawDate);
  const currentShiftDate = getShiftBusinessDate();
  const targetDate = dateParam || currentShiftDate;
  const isHistoricalDate = Boolean(dateParam && dateParam < currentShiftDate);
  const forceLive = searchParams.get("force_live") === "true";

  try {
    switch (slide) {
      case "slide1": {
        // If historical date, prefer MySQL database snapshots
        if (isHistoricalDate && !forceLive) {
          const dbResult = await getDbSlide1(targetDate);
          if (dbResult.hasRecords && dbResult.data) {
            return NextResponse.json(
              {
                success: true,
                data: dbResult.data,
                source: "demandflow_slides_mysql",
                finalizationStatus: dbResult.finalizationStatus,
                lastSyncedAt: dbResult.lastSyncedAt,
                workDate: targetDate,
                timestamp: new Date().toISOString(),
              },
              {
                status: 200,
                headers: {
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                  "X-Data-Source": "mysql-database-snapshot",
                },
              }
            );
          }
        }

        // Query CRM API for slide 1 (live shift or backdated date missing from database)
        const crmResult = await getCrmSlide1(targetDate);

        if (crmResult.success && crmResult.data) {
          // Asynchronously persist to MySQL only for historical backfills missing from DB
          if (isHistoricalDate) {
            runAnalyticsSync(targetDate, {
              force: false,
              jobName: "backdated_on_demand_sync",
              isFinal: true,
            }).catch((syncErr) => {
              console.warn(`[auto-persist] Failed to persist Slide 1 for ${targetDate}:`, syncErr?.message || syncErr);
            });
          }

          return NextResponse.json(crmResult, {
            status: 200,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "X-Data-Source": isHistoricalDate ? "crm-api-backfill" : "live-crm-api",
            },
          });
        }

        // CRM API failure fallback: Read last known database snapshot from MySQL
        const fallbackDb = await getDbSlide1(targetDate);
        if (fallbackDb.hasRecords && fallbackDb.data) {
          return NextResponse.json(
            {
              success: true,
              data: fallbackDb.data,
              isStale: true,
              isDatabaseFallback: true,
              source: "demandflow_slides_mysql_fallback",
              warning: "CRM API unreachable. Displaying last verified database snapshot.",
              timestamp: new Date().toISOString(),
            },
            {
              status: 200,
              headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "X-Data-Source": "mysql-stale-fallback",
              },
            }
          );
        }

        return NextResponse.json(crmResult, {
          status: 502,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        });
      }

      case "slide2": {
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limitParam = searchParams.get("limit") || "10";
        const limit = limitParam === "all" ? 100 : parseInt(limitParam, 10);
        const dataset = searchParams.get("dataset") || undefined;

        if (isHistoricalDate && !forceLive && dataset !== "example") {
          const dbResult = await getDbSlide2(targetDate, page, limit);
          if (dbResult.hasRecords && dbResult.data) {
            return NextResponse.json(
              {
                success: true,
                data: dbResult.data,
                source: "demandflow_slides_mysql",
                finalizationStatus: dbResult.finalizationStatus,
                lastSyncedAt: dbResult.lastSyncedAt,
                workDate: targetDate,
                timestamp: new Date().toISOString(),
              },
              {
                status: 200,
                headers: {
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                  "X-Data-Source": "mysql-database-snapshot",
                },
              }
            );
          }
        }

        const crmResult = await getCrmSlide2(targetDate, page, limit, dataset);

        if (crmResult.success && crmResult.data && dataset !== "example") {
          // Asynchronously persist to MySQL only for historical backfills missing from DB
          if (isHistoricalDate) {
            runAnalyticsSync(targetDate, {
              force: false,
              jobName: "backdated_on_demand_sync",
              isFinal: true,
            }).catch((syncErr) => {
              console.warn(`[auto-persist] Failed to persist Slide 2 for ${targetDate}:`, syncErr?.message || syncErr);
            });
          }

          return NextResponse.json(crmResult, {
            status: 200,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "X-Data-Source": isHistoricalDate ? "crm-api-backfill" : "live-crm-api",
            },
          });
        }

        if (!crmResult.success) {
          const fallbackDb = await getDbSlide2(targetDate, page, limit);
          if (fallbackDb.hasRecords && fallbackDb.data) {
            return NextResponse.json(
              {
                success: true,
                data: fallbackDb.data,
                isStale: true,
                isDatabaseFallback: true,
                source: "demandflow_slides_mysql_fallback",
                warning: "CRM API unreachable. Displaying last verified database snapshot.",
                timestamp: new Date().toISOString(),
              },
              {
                status: 200,
                headers: {
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                  "X-Data-Source": "mysql-stale-fallback",
                },
              }
            );
          }
        }

        return NextResponse.json(crmResult, {
          status: crmResult.success ? 200 : 502,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        });
      }

      case "slide3": {
        const interval = parseInt(searchParams.get("interval") || "10", 10);
        const shiftStart = searchParams.get("shift_start") || "17:30:00";
        const shiftEnd = searchParams.get("shift_end") || "02:30:00";

        if (isHistoricalDate && !forceLive) {
          const dbResult = await getDbSlide3(targetDate, interval);
          if (dbResult.hasRecords && dbResult.data) {
            return NextResponse.json(
              {
                success: true,
                data: dbResult.data,
                source: "demandflow_slides_mysql",
                finalizationStatus: dbResult.finalizationStatus,
                lastSyncedAt: dbResult.lastSyncedAt,
                workDate: targetDate,
                timestamp: new Date().toISOString(),
              },
              {
                status: 200,
                headers: {
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                  "X-Data-Source": "mysql-database-snapshot",
                },
              }
            );
          }
        }

        const crmResult = await getCrmSlide3(targetDate, interval, shiftStart, shiftEnd);

        if (crmResult.success && crmResult.data) {
          if (isHistoricalDate) {
            runAnalyticsSync(targetDate, {
              force: false,
              jobName: "backdated_on_demand_sync",
              isFinal: true,
            }).catch((syncErr) => {
              console.warn(`[auto-persist] Failed to persist Slide 3 for ${targetDate}:`, syncErr?.message || syncErr);
            });
          }

          return NextResponse.json(crmResult, {
            status: 200,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "X-Data-Source": isHistoricalDate ? "crm-api-backfill" : "live-crm-api",
            },
          });
        }

        if (!crmResult.success) {
          const fallbackDb = await getDbSlide3(targetDate, interval);
          if (fallbackDb.hasRecords && fallbackDb.data) {
            return NextResponse.json(
              {
                success: true,
                data: fallbackDb.data,
                isStale: true,
                isDatabaseFallback: true,
                source: "demandflow_slides_mysql_fallback",
                warning: "CRM API unreachable. Displaying last verified database snapshot.",
                timestamp: new Date().toISOString(),
              },
              {
                status: 200,
                headers: {
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                  "X-Data-Source": "mysql-stale-fallback",
                },
              }
            );
          }
        }

        return NextResponse.json(crmResult, {
          status: crmResult.success ? 200 : 502,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        });
      }

      case "slide4": {
        const interval = parseInt(searchParams.get("interval") || "10", 10);
        const shiftStart = searchParams.get("shift_start") || "17:30:00";
        const shiftEnd = searchParams.get("shift_end") || "02:30:00";

        if (isHistoricalDate && !forceLive) {
          const dbResult = await getDbSlide4(targetDate, interval);
          if (dbResult.hasRecords && dbResult.data) {
            return NextResponse.json(
              {
                success: true,
                data: dbResult.data,
                source: "demandflow_slides_mysql",
                finalizationStatus: dbResult.finalizationStatus,
                lastSyncedAt: dbResult.lastSyncedAt,
                workDate: targetDate,
                timestamp: new Date().toISOString(),
              },
              {
                status: 200,
                headers: {
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                  "X-Data-Source": "mysql-database-snapshot",
                },
              }
            );
          }
        }

        const crmResult = await getCrmSlide4(targetDate, interval, shiftStart, shiftEnd);

        if (crmResult.success && crmResult.data) {
          if (isHistoricalDate) {
            runAnalyticsSync(targetDate, {
              force: false,
              jobName: "backdated_on_demand_sync",
              isFinal: true,
            }).catch((syncErr) => {
              console.warn(`[auto-persist] Failed to persist Slide 4 for ${targetDate}:`, syncErr?.message || syncErr);
            });
          }

          return NextResponse.json(crmResult, {
            status: 200,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "X-Data-Source": isHistoricalDate ? "crm-api-backfill" : "live-crm-api",
            },
          });
        }

        if (!crmResult.success) {
          const fallbackDb = await getDbSlide4(targetDate, interval);
          if (fallbackDb.hasRecords && fallbackDb.data) {
            return NextResponse.json(
              {
                success: true,
                data: fallbackDb.data,
                isStale: true,
                isDatabaseFallback: true,
                source: "demandflow_slides_mysql_fallback",
                warning: "CRM API unreachable. Displaying last verified database snapshot.",
                timestamp: new Date().toISOString(),
              },
              {
                status: 200,
                headers: {
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                  "X-Data-Source": "mysql-stale-fallback",
                },
              }
            );
          }
        }

        return NextResponse.json(crmResult, {
          status: crmResult.success ? 200 : 502,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        });
      }

      // Slide 5: Form Submissions Productivity Heatmap
      case "slide5":
      case "forms":
      case "form_submissions": {
        const interval = parseInt(searchParams.get("interval") || "10", 10);
        const shiftStart = searchParams.get("shift_start") || "17:30:00";
        const shiftEnd = searchParams.get("shift_end") || "02:30:00";

        const crmResult = await getCrmSlide6(targetDate, interval, shiftStart, shiftEnd);

        return NextResponse.json(crmResult, {
          status: crmResult.success ? 200 : 502,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Data-Source": "crm-forms-heatmap",
          },
        });
      }

      // Slide 6: Comparative Analytics (Yesterday vs Today & Client Conversion)
      case "slide6":
      case "comparison":
      case "comparative": {
        const shiftStart = searchParams.get("shift_start") || "17:30:00";
        const shiftEnd = searchParams.get("shift_end") || "02:30:00";

        if (isHistoricalDate && !forceLive) {
          const dbResult = await getDbSlide5(targetDate);
          if (dbResult.hasRecords && dbResult.data) {
            return NextResponse.json(
              {
                success: true,
                data: dbResult.data,
                source: "demandflow_slides_mysql",
                finalizationStatus: dbResult.finalizationStatus,
                lastSyncedAt: dbResult.lastSyncedAt,
                workDate: targetDate,
                timestamp: new Date().toISOString(),
              },
              {
                status: 200,
                headers: {
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                  "X-Data-Source": "mysql-database-snapshot",
                },
              }
            );
          }
        }

        const crmResult = await getCrmSlide5(targetDate, shiftStart, shiftEnd);

        if (crmResult.success && crmResult.data) {
          if (isHistoricalDate) {
            runAnalyticsSync(targetDate, {
              force: false,
              jobName: "backdated_on_demand_sync",
              isFinal: true,
            }).catch((syncErr) => {
              console.warn(`[auto-persist] Failed to persist Slide 6 for ${targetDate}:`, syncErr?.message || syncErr);
            });
          }

          return NextResponse.json(crmResult, {
            status: 200,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "X-Data-Source": isHistoricalDate ? "crm-api-backfill" : "live-crm-api",
            },
          });
        }

        if (!crmResult.success) {
          const fallbackDb = await getDbSlide5(targetDate);
          if (fallbackDb.hasRecords && fallbackDb.data) {
            return NextResponse.json(
              {
                success: true,
                data: fallbackDb.data,
                isStale: true,
                isDatabaseFallback: true,
                source: "demandflow_slides_mysql_fallback",
                warning: "CRM API unreachable. Displaying last verified database snapshot.",
                timestamp: new Date().toISOString(),
              },
              {
                status: 200,
                headers: {
                  "Cache-Control": "no-store, no-cache, must-revalidate",
                  "X-Data-Source": "mysql-stale-fallback",
                },
              }
            );
          }
        }

        return NextResponse.json(crmResult, {
          status: crmResult.success ? 200 : 502,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        });
      }

      case "recognition": {
        const result = await getCrmRecognition(targetDate);
        return NextResponse.json(result, {
          status: result.success ? 200 : 502,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Data-Source": "live-crm-api",
          },
        });
      }

      case "all": {
        const [s1, s2, s3, s4, s5Forms, s6Comp] = await Promise.all([
          getCrmSlide1(targetDate),
          getCrmSlide2(targetDate, 1, 10),
          getCrmSlide3(targetDate),
          getCrmSlide4(targetDate),
          getCrmSlide6(targetDate), // Slide 5: Forms Heatmap
          getCrmSlide5(targetDate), // Slide 6: Comparative Analytics
        ]);

        const allSuccess = s1.success && s2.success && s3.success && s4.success && s5Forms.success && s6Comp.success;

        return NextResponse.json(
          {
            success: allSuccess,
            data: {
              slide1: s1.data,
              slide2: s2.data,
              slide3: s3.data,
              slide4: s4.data,
              slide5: s5Forms.data,
              slide6: s6Comp.data,
            },
            errors: {
              slide1: s1.error,
              slide2: s2.error,
              slide3: s3.error,
              slide4: s4.error,
              slide5: s5Forms.error,
              slide6: s6Comp.error,
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
          {
            error: `Unknown slide action: ${slide}. Expected slide1, slide2, slide3, slide4, slide5, slide6, or all.`,
          },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[analytics-route] Uncaught error in GET /api/analytics/${slide}:`, err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal analytics server error",
        details: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
