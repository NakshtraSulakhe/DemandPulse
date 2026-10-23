import { NextRequest, NextResponse } from "next/server";
import { getCrmCampaignTargets, saveCrmCampaignTargets } from "@/lib/crm-api";
import { SaveDailyTargetsPayloadSchema } from "@/lib/validations";
import { verifyCsrf } from "@/lib/auth";
import {
  getAllocationsMapForDate,
  saveAllocationsBatch,
  getAllocationsForDate,
} from "@/lib/db/allocations";
import { getShiftBusinessDate } from "@/lib/shift/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/campaign-targets
 * Query params: ?date=YYYY-MM-DD&status=Live&client_code=...&search=...
 *
 * Merges CRM campaign lead performance data with permanent SQLite database daily allocations.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const targetDate = searchParams.get("date") || getShiftBusinessDate();
  const status = searchParams.get("status") || "Live";
  const clientFilter = searchParams.get("client_code") || "";
  const searchTerm = (searchParams.get("search") || "").trim().toLowerCase();

  // 1. Fetch live campaigns and actual lead counts from CRM API
  const crmResult = await getCrmCampaignTargets(targetDate, status);

  if (!crmResult.success || !crmResult.data) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: crmResult.error || "Failed to fetch live campaign data from CRM",
      },
      { status: 502 }
    );
  }

  // 2. Fetch permanently saved allocations from MySQL database for this business date
  const savedAllocationsMap = await getAllocationsMapForDate(targetDate);

  // 3. Extract distinct client codes from all live campaigns for the searchable dropdown filter
  const clientCodeSet = new Set<string>();

  const mergedCampaigns = crmResult.data.campaigns.map((camp) => {
    if (camp.client_code && camp.client_code.trim()) {
      clientCodeSet.add(camp.client_code.trim());
    }

    const savedRecord = savedAllocationsMap.get(camp.campaign_id);
    const hasSaved = Boolean(savedRecord);
    const dailyTarget = hasSaved ? savedRecord!.daily_target : (camp.daily_target || 0);
    const notes = hasSaved ? (savedRecord!.notes || camp.notes || "") : (camp.notes || "");

    // Calculate actual performance metrics from live CRM leads
    const qualifiedLeads = Number(camp.qualified_leads) || 0;
    const remainingToQualify = Math.max(0, dailyTarget - qualifiedLeads);
    const completionPct = dailyTarget > 0 ? Math.round((qualifiedLeads / dailyTarget) * 100 * 10) / 10 : 0;

    return {
      ...camp,
      daily_target: dailyTarget,
      remaining_leads_to_qualify: remainingToQualify,
      completion_percentage: completionPct,
      notes,
      has_saved_allocation: hasSaved,
      monthly_allocation: Number(camp.monthly_allocation) || 0,
      generated_leads: Number(camp.generated_leads) || 0,
      qualified_leads: qualifiedLeads,
      disqualified_leads: Number(camp.disqualified_leads) || 0,
      pending_qa: Number(camp.pending_qa) || 0,
    };
  });

  const distinctClientCodes = Array.from(clientCodeSet).sort();

  // 4. Apply optional query-level filters if requested (frontend also filters reactively)
  let resultList = mergedCampaigns;
  if (clientFilter && clientFilter !== "all") {
    resultList = resultList.filter(
      (c) => (c.client_code || "").trim().toLowerCase() === clientFilter.trim().toLowerCase()
    );
  }

  if (searchTerm) {
    resultList = resultList.filter((c) => {
      const name = (c.campaign_name || "").toLowerCase();
      const code = (c.campaign_code || "").toLowerCase();
      const client = (c.client_code || "").toLowerCase();
      const id = String(c.campaign_id);
      return (
        name.includes(searchTerm) ||
        code.includes(searchTerm) ||
        client.includes(searchTerm) ||
        id === searchTerm
      );
    });
  }

  return NextResponse.json(
    {
      ok: true,
      success: true,
      target_date: targetDate,
      total_campaigns: resultList.length,
      all_campaigns_count: mergedCampaigns.length,
      campaigns: resultList,
      client_codes: distinctClientCodes,
      source: "database_and_crm_live",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Data-Source": "demandpulse-mysql-and-crm",
      },
    }
  );
}

/**
 * POST /api/campaign-targets
 * Body: {
 *   target_date: string (YYYY-MM-DD),
 *   targets: Array<{ campaign_id: number, daily_target: number, notes?: string, campaign_name?: string, client_code?: string, monthly_allocation?: number }>,
 *   user?: string
 * }
 *
 * Saves daily campaign allocations atomically in SQLite database with audit trail,
 * and syncs to upstream CRM API.
 */
export async function POST(req: NextRequest) {
  // CSRF validation
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { ok: false, error: "CSRF token/origin validation failed", error_code: "CSRF_FAILED" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = SaveDailyTargetsPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid allocation parameters",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { target_date, targets, user } = parsed.data;
    const changedBy = user || "Admin User";

    // 1. Save allocations permanently in MySQL database within an atomic transaction
    const dbResult = await saveAllocationsBatch(target_date, targets, changedBy);

    // 2. Synchronize to upstream CRM API in parallel (non-blocking if upstream is temporarily slow)
    let crmSynced = false;
    let crmMessage = "";
    try {
      const crmResponse = await saveCrmCampaignTargets({
        target_date,
        targets: targets.map((t) => ({
          campaign_id: t.campaign_id,
          daily_target: t.daily_target,
          notes: t.notes || "",
        })),
      });
      crmSynced = crmResponse.ok;
      crmMessage = crmResponse.message || "";
    } catch {
      // Non-fatal: Local database transaction is already committed and authoritative
    }

    return NextResponse.json(
      {
        ok: true,
        success: true,
        message: "Daily campaign allocations saved successfully.",
        target_date,
        saved_count: dbResult.saved_count,
        allocations: dbResult.allocations,
        crm_synced: crmSynced,
        crm_message: crmMessage,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to persist daily campaign allocations",
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
