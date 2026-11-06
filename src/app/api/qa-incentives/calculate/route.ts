import { NextRequest, NextResponse } from "next/server";
import { getQaIncentivePlans } from "@/lib/db/qa-incentive-repository";
import { getQaDailySnapshotsForDate } from "@/lib/db/qa-analytics-repository";
import { getCrmSlide3, getCrmQaAudits } from "@/lib/crm-api";
import { calculateQaIncentive } from "@/lib/qa-incentives/calculator";
import { getShiftBusinessDate } from "@/lib/shift/engine";
import { QaIncentivePlan, QaIncentiveCalculationItem } from "@/types/qa-incentives";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/qa-incentives/calculate
 * Evaluates QA team incentives based on actual leads audited fetched from live CRM QA Audits API (/api/v1/slides/qa_audits.php).
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get("date") || getShiftBusinessDate();
  const frequency = (searchParams.get("frequency") || "DAILY").toUpperCase() as "DAILY" | "MONTHLY";
  const planIdFilter = searchParams.get("plan_id");

  try {
    // 1. Fetch configured plans
    const allPlans = await getQaIncentivePlans();
    const activePlans = allPlans.filter((p) => p.is_active && p.frequency === frequency);

    if (activePlans.length === 0) {
      return NextResponse.json({
        success: true,
        work_date: date,
        frequency,
        summary: {
          total_qa_analysts: 0,
          total_audits: 0,
          total_incentive: 0,
          eligible_count: 0,
        },
        calculations: [],
        message: `No active ${frequency} QA incentive plans configured.`,
      });
    }

    const defaultPlan = planIdFilter
      ? activePlans.find((p) => p.id === planIdFilter) || activePlans[0]
      : activePlans[0];

    // Format tiers for upstream API: [{"min": 51, "max": 60, "rate": 15}, ...]
    let accumulatedLeads = defaultPlan.base_target_leads;
    const tierSlabsPayload = (defaultPlan.tiers || []).map((t) => {
      const min = accumulatedLeads + 1;
      const max = min + t.extra_leads - 1;
      accumulatedLeads = max;
      return {
        min,
        max,
        rate: t.rate_per_lead,
      };
    });

    // 2. Fetch live QA Audits & Incentive feed from the newly provided CRM API endpoint
    // Primary: /api/v1/slides/qa_audits.php
    const qaAuditsRes = await getCrmQaAudits({
      date,
      frequency: frequency.toLowerCase() as "daily" | "monthly",
      base_target: defaultPlan.base_target_leads,
      base_reward: defaultPlan.base_incentive_amount,
      tiers: tierSlabsPayload,
      include_leads: 1,
    }).catch(() => ({ success: false, data: undefined }));

    const calculations: QaIncentiveCalculationItem[] = [];
    let apiSummary: any = null;

    const rawData = qaAuditsRes.data as any;
    const qaAuditsPayload = rawData?.qa_audits || rawData?.data || rawData;
    const analystsList: any[] =
      qaAuditsPayload?.qa_analysts ||
      qaAuditsPayload?.qa_users ||
      rawData?.qa_analysts ||
      rawData?.qa_users ||
      [];

    const QA_NAME_MAP: Record<number, string> = {
      132: "Shreejit Raju",
      178: "Shalmon Waghmare",
      103: "Sanket Tanpure",
      134: "Pratibha Ghode",
    };

    if (qaAuditsRes.success && Array.isArray(analystsList) && analystsList.length > 0) {
      apiSummary = qaAuditsPayload?.summary || rawData?.summary || null;

      // Filter and map upstream live QA analysts from qa_audits.php
      for (const a of analystsList) {
        const analystId = Number(a.user_id || a.qa_id || a.id);
        if (!analystId || analystId === 99 || analystId === 151) continue;

        const resolvedName =
          QA_NAME_MAP[analystId] ||
          (a.qa_name && !a.qa_name.includes("#") ? a.qa_name : "") ||
          (a.full_name && !a.full_name.includes("#") ? a.full_name : "") ||
          (a.name && !a.name.includes("#") ? a.name : "") ||
          `QA Analyst #${analystId}`;

        if (resolvedName.toLowerCase().includes("sagar")) continue;

        const shiftStartUtc = `${date} 12:00:00`;
        const shiftEndUtc = `${date} 21:00:00`;

        let totalAudited = Number(a.total_audited ?? a.unique_leads_audited ?? a.audited_count ?? 0);
        let qualifiedCount = Number(a.qualified_count ?? a.qualified_leads ?? a.qualified ?? 0);
        let disqualifiedCount = Number(a.disqualified_count ?? a.disqualified_leads ?? a.disqualified ?? 0);

        // Strictly evaluate audits completed within the operational shift window:
        // 17:30 IST (12:00:00 UTC) -> 02:30 IST (21:00:00 UTC)
        let filteredShiftLeads: any[] = [];
        if (Array.isArray(a.audited_leads) && a.audited_leads.length > 0) {
          const shiftLeads = a.audited_leads.filter((l: any) => {
            const t = l.reviewed_at || l.created_at || "";
            return t >= shiftStartUtc && t <= shiftEndUtc;
          });

          // Sort ascending chronologically so newest action defines final state
          shiftLeads.sort((x: any, y: any) =>
            (x.reviewed_at || x.created_at || "").localeCompare(y.reviewed_at || y.created_at || "")
          );

          if (shiftLeads.length > 0) {
            const uniqueMap = new Map<number | string, any>();
            shiftLeads.forEach((l: any) => {
              const leadKey = l.lead_id || l.lead_code || l.id;
              if (leadKey) {
                uniqueMap.set(leadKey, l);
              }
            });

            totalAudited = uniqueMap.size;
            const uniqueList = Array.from(uniqueMap.values());
            filteredShiftLeads = uniqueList;
            qualifiedCount = uniqueList.filter(
              (l: any) => String(l.qa_status).toLowerCase() === "qualified"
            ).length;
            disqualifiedCount = uniqueList.filter(
              (l: any) => String(l.qa_status).toLowerCase() === "disqualified"
            ).length;
          }
        }

        // Find matching plan (agent-specific plan, or fallback to defaultPlan)
        const matchingPlan =
          activePlans.find((p) => p.qa_agent_id && Number(p.qa_agent_id) === analystId) || defaultPlan;

        // Compute locally using calculator engine with active plan and verified shift audits
        const result = calculateQaIncentive(totalAudited, matchingPlan, {
          id: analystId,
          name: resolvedName,
        });

        result.email = a.email || "";
        result.role = a.role || a.job_title || "QA Analyst";
        result.department = a.department || "Quality Assurance";
        result.job_title = a.job_title || "Quality Analyst";
        result.client_code = matchingPlan.client_code || "ALL";
        result.campaign_name = matchingPlan.campaign_name || "All Campaigns";
        result.period_label = frequency === "DAILY" ? `Daily Shift (${date})` : `Monthly (${date.substring(0, 7)})`;
        result.unique_leads_audited = totalAudited;
        result.total_audit_actions = Number(a.total_audit_actions || totalAudited);
        result.qualified_leads = qualifiedCount;
        result.disqualified_leads = disqualifiedCount;
        result.pending_count = Number(a.pending_count || 0);
        result.rework_count = Number(a.rework_count || 0);
        result.qualification_rate_pct =
          totalAudited > 0 ? Math.round((qualifiedCount / totalAudited) * 1000) / 10 : 0;
        result.disqualification_rate_pct =
          totalAudited > 0 ? Math.round((disqualifiedCount / totalAudited) * 1000) / 10 : 0;
        result.status_breakdown = {
          Qualified: qualifiedCount,
          Disqualified: disqualifiedCount,
        };
        result.campaigns_breakdown = a.campaigns_breakdown || [];
        result.clients_breakdown = a.clients_breakdown || [];
        result.audited_leads = filteredShiftLeads.length > 0 ? filteredShiftLeads : (a.audited_leads || []);

        calculations.push(result);
      }
    } else {
      // 3. Fallback to MySQL DB snapshots or live Slide 3 if CRM custom endpoint is unreachable
      const [dbSnapshots, slide3Res] = await Promise.all([
        getQaDailySnapshotsForDate(date).catch(() => []),
        getCrmSlide3(date, 10).catch(() => ({ success: false, data: null })),
      ]);

      const analystMap = new Map<
        number,
        { id: number; name: string; totalAudits: number; qualified: number; disqualified: number }
      >();

      if (dbSnapshots && dbSnapshots.length > 0) {
        dbSnapshots.forEach((s) => {
          const id = Number(s.crm_qa_agent_id);
          const name = (s.qa_agent_name_snapshot || `QA Analyst #${id}`).trim();
          if (id && id !== 99 && !name.toLowerCase().includes("sagar")) {
            const audits = Number(s.total_audits) || Number(s.unique_leads_audited) || 0;
            if (audits > 0) {
              analystMap.set(id, {
                id,
                name,
                totalAudits: audits,
                qualified: Number(s.qualified_leads) || 0,
                disqualified: Number(s.disqualified_leads) || 0,
              });
            }
          }
        });
      }

      if (slide3Res.success && slide3Res.data?.qa_heatmap) {
        slide3Res.data.qa_heatmap.forEach((a: any) => {
          const id = Number(a.user_id);
          const name = (a.full_name || "").trim();
          if (id && id !== 99 && !name.toLowerCase().includes("sagar")) {
            const audits = Number(a.total_audited) || Number(a.total_qualified) || 0;
            if (audits > 0) {
              analystMap.set(id, {
                id,
                name,
                totalAudits: audits,
                qualified: Number(a.total_qualified) || 0,
                disqualified: Math.max(0, audits - Number(a.total_qualified || 0)),
              });
            }
          }
        });
      }

      const multiplier = frequency === "MONTHLY" ? 22 : 1;

      analystMap.forEach((analyst) => {
        const matchingPlan =
          activePlans.find((p) => p.qa_agent_id && Number(p.qa_agent_id) === analyst.id) || defaultPlan;

        const effectiveAudits = analyst.totalAudits * multiplier;
        const result = calculateQaIncentive(effectiveAudits, matchingPlan, {
          id: analyst.id,
          name: analyst.name,
        });

        result.qualified_leads = analyst.qualified * multiplier;
        result.disqualified_leads = analyst.disqualified * multiplier;
        result.qualification_rate_pct =
          effectiveAudits > 0 ? Math.round((result.qualified_leads / effectiveAudits) * 1000) / 10 : 0;

        calculations.push(result);
      });
    }

    // Sort by total incentive descending, then actual leads descending
    calculations.sort(
      (a, b) => b.total_incentive - a.total_incentive || b.actual_leads_audited - a.actual_leads_audited
    );

    const totalAudits = calculations.reduce((sum, c) => sum + c.actual_leads_audited, 0);
    const totalIncentive = calculations.reduce((sum, c) => sum + c.total_incentive, 0);
    const totalQualified = calculations.reduce((sum, c) => sum + c.qualified_leads, 0);
    const totalDisqualified = calculations.reduce((sum, c) => sum + c.disqualified_leads, 0);
    const eligibleCount = calculations.filter((c) => c.base_target_achieved).length;

    const mergedSummary = {
      total_qa_analysts: calculations.length,
      active_qa_auditors: calculations.filter((c) => c.actual_leads_audited > 0).length,
      total_audits: totalAudits,
      total_incentive: totalIncentive,
      eligible_count: eligibleCount,
      average_incentive: calculations.length > 0 ? Math.round(totalIncentive / calculations.length) : 0,
      total_qualified: totalQualified,
      total_disqualified: totalDisqualified,
      overall_qualification_rate_pct:
        totalAudits > 0 ? Math.round((totalQualified / totalAudits) * 1000) / 10 : 0,
      overall_disqualification_rate_pct:
        totalAudits > 0 ? Math.round((totalDisqualified / totalAudits) * 1000) / 10 : 0,
      status_totals: {
        Qualified: totalQualified,
        Disqualified: totalDisqualified,
      },
      top_performer: calculations[0]
        ? {
            user_id: calculations[0].qa_agent_id,
            qa_id: calculations[0].qa_agent_id,
            qa_name: calculations[0].qa_agent_name,
            full_name: calculations[0].qa_agent_name,
            total_audited: calculations[0].actual_leads_audited,
            qualified: calculations[0].qualified_leads,
            disqualified: calculations[0].disqualified_leads,
            qualification_rate_pct: calculations[0].qualification_rate_pct || 0,
            total_incentive: calculations[0].total_incentive || 0,
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      ok: true,
      work_date: date,
      frequency,
      active_plans_count: activePlans.length,
      summary: mergedSummary,
      calculations,
      applied_plan: defaultPlan,
      source: qaAuditsRes.success ? "upstream-crm-qa-audits-api" : "local-db-and-slide3",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to calculate QA incentives: ${errorMsg}` },
      { status: 500 }
    );
  }
}

