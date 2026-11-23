import { NextRequest, NextResponse } from "next/server";
import { getQaIncentivePlans } from "@/lib/db/qa-incentive-repository";
import { getQaDailySnapshotsForDate } from "@/lib/db/qa-analytics-repository";
import { getCrmSlide3, getCrmQaAudits, getCrmCampaignTargets } from "@/lib/crm-api";
import { calculateQaIncentive } from "@/lib/qa-incentives/calculator";
import { getShiftBusinessDate, addDays } from "@/lib/shift/engine";
import { QaIncentivePlan, QaIncentiveCalculationItem } from "@/types/qa-incentives";
import { getProductivityPointsMap } from "@/lib/db/campaign-points-repository";
import { getVerifiedPointFactor } from "@/lib/productivity/points-capacity";
import { getEmployeeTargetForMonth } from "@/lib/db/employee-targets-repository";
import { CRM_KNOWN_ROSTER } from "@/lib/crm-roster";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/qa-incentives/calculate
 * Evaluates QA team incentives based on actual leads audited fetched from live CRM QA Audits API (/api/v1/slides/qa_audits.php).
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const rawDate = searchParams.get("date") || getShiftBusinessDate();
  const frequency = (searchParams.get("frequency") || "DAILY").toUpperCase() as "DAILY" | "MONTHLY";
  const planIdFilter = searchParams.get("plan_id");

  // Determine target month and year
  const parts = rawDate.split("-");
  const targetYear = parseInt(parts[0], 10) || new Date().getFullYear();
  const targetMonth = parseInt(parts[1], 10) || new Date().getMonth() + 1;
  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const monthStartStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01 00:00:00`;
  const monthEndStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")} 23:59:59`;
  const date = frequency === "MONTHLY" ? `${targetYear}-${String(targetMonth).padStart(2, "0")}` : rawDate;

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

    // Authoritative campaign point multipliers from database (QA Department specific with global fallback)
    const pointsMap: Record<string, number> = (await getProductivityPointsMap("QA").catch(() => ({}))) as any;
    const targetMonth = parseInt(date.split("-")[1], 10) || new Date().getMonth() + 1;
    const targetYear = parseInt(date.split("-")[0], 10) || new Date().getFullYear();

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

    // 2. Fetch live QA Audits & full CRM campaign metadata concurrently so every audited lead
    // resolves its authoritative CRM campaign_type (Voice Mail, Email Marketing, MQL, HQL/Callback, BANT, AG)
    const [qaAuditsRes, crmCampaignsRes] = await Promise.all([
      getCrmQaAudits({
        date: rawDate,
        date_from: frequency === "MONTHLY" ? monthStartStr : undefined,
        date_to: frequency === "MONTHLY" ? monthEndStr : undefined,
        frequency: frequency.toLowerCase() as "daily" | "monthly",
        base_target: defaultPlan.base_target_leads,
        base_reward: defaultPlan.base_incentive_amount,
        tiers: tierSlabsPayload,
        include_leads: frequency === "MONTHLY" ? 0 : 1,
      }).catch(() => ({ success: false, data: undefined })),
      getCrmCampaignTargets(rawDate, "all").catch(() => ({ success: false, data: undefined })),
    ]);

    // Build authoritative CRM campaign_type lookup indexes (by campaign_id, campaign_code, and campaign_name)
    const campaignTypeById = new Map<number, string>();
    const campaignTypeByCode = new Map<string, string>();
    const campaignTypeByName = new Map<string, string>();

    const crmCampaignList: any[] = Array.isArray(crmCampaignsRes?.data)
      ? crmCampaignsRes.data
      : Array.isArray((crmCampaignsRes?.data as any)?.campaigns)
      ? (crmCampaignsRes.data as any).campaigns
      : [];

    for (const c of crmCampaignList) {
      const cType = String(c.campaign_type || "").trim();
      if (!cType) continue;
      if (c.campaign_id) campaignTypeById.set(Number(c.campaign_id), cType);
      if (c.campaign_code) campaignTypeByCode.set(String(c.campaign_code).trim().toLowerCase(), cType);
      if (c.campaign_name) campaignTypeByName.set(String(c.campaign_name).trim().toLowerCase(), cType);
    }

    const resolveLeadCampaignType = (leadOrCamp: any, fallbackName: string): string => {
      const explicitType = String(leadOrCamp?.campaign_type || "").trim();
      if (explicitType) return explicitType;
      const cid = Number(leadOrCamp?.campaign_id || 0);
      if (cid && campaignTypeById.has(cid)) return campaignTypeById.get(cid)!;
      const cCode = String(leadOrCamp?.campaign_code || "").trim().toLowerCase();
      if (cCode && campaignTypeByCode.has(cCode)) return campaignTypeByCode.get(cCode)!;
      const cNameKey = fallbackName.trim().toLowerCase();
      if (cNameKey && campaignTypeByName.has(cNameKey)) return campaignTypeByName.get(cNameKey)!;
      return fallbackName;
    };

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

      const creditedLeadsByAnalyst = new Map<number, any[]>();

      // Authoritative QA Counting Engine for Daily Shift:
      if (frequency === "DAILY") {
        // Step 1: For each analyst, determine their unique finalized leads within the operational shift window
        // (12:00:00 UTC date -> 03:30:00 UTC nextDate)
        const nextDate = addDays(rawDate, 1);
        const startUtcMs = new Date(`${rawDate}T12:00:00.000Z`).getTime();
        const endUtcMs = new Date(`${nextDate}T03:30:00.000Z`).getTime();

        const perAnalystFinalized = new Map<number, any[]>();

        for (const a of analystsList) {
          const aId = Number(a.user_id || a.qa_id || a.id);
          if (!aId || aId === 99 || aId === 151) continue;

          const shiftLeads = (a.audited_leads || []).filter((l: any) => {
            const t = l.reviewed_at || l.created_at || "";
            if (!t) return false;
            const tMs = new Date(t.includes("T") ? t : t.replace(" ", "T") + "Z").getTime();
            return !isNaN(tMs) && tMs >= startUtcMs && tMs <= endUtcMs;
          });

          // Sort ascending chronologically so newest action defines the analyst's final status on the lead
          shiftLeads.sort((x: any, y: any) =>
            (x.reviewed_at || x.created_at || "").localeCompare(y.reviewed_at || y.created_at || "")
          );

          const uniqueMap = new Map<number | string, any>();
          shiftLeads.forEach((l: any) => {
            const leadKey = l.lead_id || l.lead_code || l.id;
            if (leadKey) uniqueMap.set(leadKey, l);
          });

          // Filter strictly to finalized review events: 'qualified' or 'disqualified' (unfinalized 'In Progress' / 'Pending' are not counted)
          const finalized = Array.from(uniqueMap.values()).filter((l: any) => {
            const s = String(l.qa_status || "").toLowerCase();
            return s === "qualified" || s === "disqualified";
          });

          perAnalystFinalized.set(aId, finalized);
        }

        // Step 2: Cross-analyst de-duplication across the QA floor:
        // When multiple QA analysts review the same lead, credit initial finalization to primary reviewer
        const allFinalizedEvents: {
          analystId: number;
          leadId: string | number;
          status: string;
          time: string;
          lead: any;
        }[] = [];

        perAnalystFinalized.forEach((leads, analystId) => {
          leads.forEach((l: any) => {
            const leadKey = l.lead_id || l.lead_code || l.id;
            allFinalizedEvents.push({
              analystId,
              leadId: leadKey,
              status: String(l.qa_status || "").toLowerCase(),
              time: l.reviewed_at || l.created_at || "",
              lead: l,
            });
          });
        });

        allFinalizedEvents.sort((x, y) => x.time.localeCompare(y.time));

        const seenFloorLeads = new Set<string | number>();

        for (const ev of allFinalizedEvents) {
          if (!seenFloorLeads.has(ev.leadId)) {
            seenFloorLeads.add(ev.leadId);
            if (!creditedLeadsByAnalyst.has(ev.analystId)) {
              creditedLeadsByAnalyst.set(ev.analystId, []);
            }
            creditedLeadsByAnalyst.get(ev.analystId)!.push(ev.lead);
          }
        }
      }

      // Filter and map upstream live QA analysts from qa_audits.php
      for (const a of analystsList) {
        const analystId = Number(a.user_id || a.qa_id || a.id);
        if (!analystId || analystId === 99 || analystId === 151) continue;

        const rosterEntry = CRM_KNOWN_ROSTER[analystId];
        const resolvedName =
          rosterEntry?.name ||
          QA_NAME_MAP[analystId] ||
          (a.qa_name && !a.qa_name.includes("#") ? a.qa_name : "") ||
          (a.full_name && !a.full_name.includes("#") ? a.full_name : "") ||
          (a.name && !a.name.includes("#") ? a.name : "") ||
          `QA Analyst #${analystId}`;

        if (resolvedName.toLowerCase().includes("sagar")) continue;

        let totalAudited = 0;
        let qualifiedCount = 0;
        let disqualifiedCount = 0;
        let rectifiedCount = 0;

        let filteredShiftLeads: any[] = [];
        const campaignGroupMap = new Map<
          string,
          { count: number; factor: number; totalPoints: number; campaignType: string }
        >();

        if (frequency === "DAILY" && Array.isArray(a.audited_leads) && a.audited_leads.length > 0) {
          const uniqueList = creditedLeadsByAnalyst.get(analystId) || [];
          totalAudited = uniqueList.length;
          filteredShiftLeads = uniqueList;
          qualifiedCount = uniqueList.filter(
            (l: any) => String(l.qa_status).toLowerCase() === "qualified"
          ).length;
          disqualifiedCount = uniqueList.filter(
            (l: any) => String(l.qa_status).toLowerCase() === "disqualified"
          ).length;

          // Strictly detect only rectified leads (status or prev_status is 'Rectified')
          const isRectified = (l: any) => {
            const s = String(l.qa_status || "").trim().toLowerCase();
            const p = String(l.prev_status || "").trim().toLowerCase();
            return s === "rectified" || p === "rectified";
          };
          rectifiedCount = uniqueList.filter(isRectified).length;

          // Compute campaign type points for each lead using authoritative CRM campaign_type
          uniqueList.forEach((l: any) => {
            const campaignName = (l.campaign_name || l.campaign_code || "General").trim();
            const resolvedCampaignType = resolveLeadCampaignType(l, campaignName);
            const factor = getVerifiedPointFactor(resolvedCampaignType, pointsMap);
            l.point_factor = factor;
            l.points_earned = factor;
            l.campaign_type = resolvedCampaignType;

            const existing = campaignGroupMap.get(campaignName) || {
              count: 0,
              factor,
              totalPoints: 0,
              campaignType: resolvedCampaignType,
            };
            existing.count += 1;
            existing.totalPoints = Math.round((existing.totalPoints + factor) * 100) / 100;
            campaignGroupMap.set(campaignName, existing);
          });
        } else {
          totalAudited = Number(a.total_audited ?? a.unique_leads_audited ?? a.audited_count ?? 0);
          qualifiedCount = Number(a.qualified_count ?? a.qualified_leads ?? a.qualified ?? 0);
          disqualifiedCount = Number(a.disqualified_count ?? a.disqualified_leads ?? a.disqualified ?? 0);
          rectifiedCount = Number(a.status_breakdown?.Rectified ?? a.rectified_count ?? 0);

          if (Array.isArray(a.campaigns_breakdown) && a.campaigns_breakdown.length > 0) {
            a.campaigns_breakdown.forEach((cb: any) => {
              const cName = cb.campaign_name || cb.campaign_code || `Campaign #${cb.campaign_id}`;
              const resolvedCampaignType = resolveLeadCampaignType(cb, cName);
              const factor = getVerifiedPointFactor(resolvedCampaignType, pointsMap);
              const count = Number(cb.total_audited ?? cb.qualified ?? 0);
              const points = Math.round(count * factor * 100) / 100;
              campaignGroupMap.set(cName, {
                count,
                factor,
                totalPoints: points,
                campaignType: resolvedCampaignType,
              });
            });
          }
        }

        let totalAnalystPoints = Math.round(
          Array.from(campaignGroupMap.values()).reduce((sum, g) => sum + g.totalPoints, 0) * 100
        ) / 100;

        // If no lead records but campaign breakdown exists from CRM
        if (totalAnalystPoints === 0 && Array.isArray(a.campaigns_breakdown) && a.campaigns_breakdown.length > 0) {
          a.campaigns_breakdown.forEach((cb: any) => {
            const cName = cb.campaign_name || `Campaign #${cb.campaign_id}`;
            const resolvedCampaignType = resolveLeadCampaignType(cb, cName);
            const factor = getVerifiedPointFactor(resolvedCampaignType, pointsMap);
            const count = Number(cb.total_audited || cb.qualified || 0);
            const points = Math.round(count * factor * 100) / 100;
            campaignGroupMap.set(cName, {
              count,
              factor,
              totalPoints: points,
              campaignType: resolvedCampaignType,
            });
            totalAnalystPoints = Math.round((totalAnalystPoints + points) * 100) / 100;
          });
        }

        // Benchmark fallback distribution if audits exist but zero lead detail
        if (totalAnalystPoints === 0 && totalAudited > 0) {
          const eQty = Math.floor(totalAudited * 0.3);
          const mQty = Math.floor(totalAudited * 0.3);
          const hQty = Math.floor(totalAudited * 0.2);
          const bQty = Math.floor(totalAudited * 0.1);
          const aQty = Math.floor(totalAudited * 0.1);

          const eFactor = pointsMap["email_marketing"] || 0.5;
          const mFactor = pointsMap["mql"] || 1.0;
          const hFactor = pointsMap["hql_callback"] || 2.0;
          const bFactor = pointsMap["bant"] || 3.0;
          const aFactor = pointsMap["appointment_generation"] || 5.0;

          campaignGroupMap.set("Email Marketing", { count: eQty, factor: eFactor, totalPoints: Math.round(eQty * eFactor * 100) / 100, campaignType: "Email Marketing" });
          campaignGroupMap.set("MQL", { count: mQty, factor: mFactor, totalPoints: Math.round(mQty * mFactor * 100) / 100, campaignType: "MQL" });
          campaignGroupMap.set("HQL / Callback", { count: hQty, factor: hFactor, totalPoints: Math.round(hQty * hFactor * 100) / 100, campaignType: "HQL / Callback" });
          campaignGroupMap.set("BANT", { count: bQty, factor: bFactor, totalPoints: Math.round(bQty * bFactor * 100) / 100, campaignType: "BANT" });
          campaignGroupMap.set("Appointment Generation", { count: aQty, factor: aFactor, totalPoints: Math.round(aQty * aFactor * 100) / 100, campaignType: "Appointment Generation" });

          totalAnalystPoints = Math.round(
            Array.from(campaignGroupMap.values()).reduce((sum, g) => sum + g.totalPoints, 0) * 100
          ) / 100;
        }

        const campaignBreakdownList = Array.from(campaignGroupMap.entries()).map(([cName, g]) => ({
          activity_type: g.campaignType || cName,
          campaign_name: cName,
          campaign_type: g.campaignType,
          lead_count: g.count,
          point_factor: g.factor,
          total_points: g.totalPoints,
        }));

        // Find matching plan (agent-specific plan, or fallback to defaultPlan)
        const matchingPlan =
          activePlans.find((p) => p.qa_agent_id && Number(p.qa_agent_id) === analystId) || defaultPlan;

        // Assigned target from Target Management in points
        const assignedTarget = await getEmployeeTargetForMonth(
          analystId,
          "QA",
          targetMonth,
          targetYear
        ).catch(() => null);

        const baseTargetPoints = frequency === "MONTHLY"
          ? Number(matchingPlan.base_target_points || matchingPlan.base_target_leads || (assignedTarget?.effective_monthly_target ? Number(assignedTarget.effective_monthly_target) : 500))
          : (assignedTarget?.daily_target
              ? Number(assignedTarget.daily_target)
              : Number(matchingPlan.base_target_points || matchingPlan.base_target_leads || 50));

        // Compute points-based incentive calculation
        const result = calculateQaIncentive(
          totalAnalystPoints,
          matchingPlan,
          { id: analystId, name: resolvedName },
          {
            actualPoints: totalAnalystPoints,
            baseTargetPoints,
            actualLeadsAudited: totalAudited,
            rectifiedCount,
            statusCounts: {
              Qualified: qualifiedCount,
              Disqualified: disqualifiedCount,
              Rectified: rectifiedCount,
            },
            campaignBreakdown: campaignBreakdownList,
          }
        );

        const isQaManager = analystId === 178 || analystId === 132;
        result.email = a.email || "";
        result.role = isQaManager ? "QA Manager" : a.role || a.job_title || "QA Analyst";
        result.department = a.department || "Quality Assurance";
        result.job_title = isQaManager ? "QA Manager" : a.job_title || "QA Analyst";
        result.client_code = matchingPlan.client_code || "ALL";
        result.campaign_name = matchingPlan.campaign_name || "All Campaigns";
        result.period_label = frequency === "DAILY" ? `Daily Shift (${rawDate})` : `Monthly Cumulative (${rawDate.substring(0, 7)})`;
        result.unique_leads_audited = totalAudited;
        result.total_audit_actions = Number(a.total_audit_actions || totalAudited);
        result.qualified_leads = qualifiedCount;
        result.disqualified_leads = disqualifiedCount;
        result.rectified_count = rectifiedCount;
        result.pending_count = Number(a.pending_count || 0);
        result.rework_count = Number(a.rework_count || 0);
        result.qualification_rate_pct =
          totalAudited > 0 ? Math.round((qualifiedCount / totalAudited) * 1000) / 10 : 0;
        result.disqualification_rate_pct =
          totalAudited > 0 ? Math.round((disqualifiedCount / totalAudited) * 1000) / 10 : 0;
        result.status_breakdown = {
          Qualified: qualifiedCount,
          Disqualified: disqualifiedCount,
          Rectified: rectifiedCount,
        };
        result.campaigns_breakdown = a.campaigns_breakdown || [];
        result.clients_breakdown = a.clients_breakdown || [];
        result.audited_leads = filteredShiftLeads.length > 0 ? filteredShiftLeads : (a.audited_leads || []);

        calculations.push(result);
      }
    } else {
      // 3. Fallback to MySQL DB snapshots or live Slide 3 if CRM custom endpoint is unreachable
      let dbSnapshots: any[] = [];
      if (frequency === "MONTHLY") {
        const monthStart = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
        const monthEnd = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        dbSnapshots = await query<any>(
          `SELECT crm_qa_agent_id, 
                  MAX(qa_agent_name_snapshot) as qa_agent_name_snapshot,
                  SUM(total_audits) as total_audits,
                  SUM(qualified_leads) as qualified_leads,
                  SUM(disqualified_leads) as disqualified_leads,
                  SUM(achieved_points) as achieved_points
           FROM qa_daily_snapshots
           WHERE work_date >= ? AND work_date <= ?
           GROUP BY crm_qa_agent_id`,
          [monthStart, monthEnd]
        ).catch(() => []);
      } else {
        dbSnapshots = await getQaDailySnapshotsForDate(date).catch(() => []);
      }

      const slide3Res = await getCrmSlide3(date, 10).catch(() => ({ success: false, data: null }));

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

      // Ensure all active QA team members are present on the roster even when shift has just started (0 audits)
      Object.entries(QA_NAME_MAP).forEach(([idStr, name]) => {
        const id = Number(idStr);
        if (!analystMap.has(id)) {
          analystMap.set(id, {
            id,
            name,
            totalAudits: 0,
            qualified: 0,
            disqualified: 0,
          });
        }
      });

      const multiplier = frequency === "MONTHLY" ? 1 : 1;

      analystMap.forEach((analyst) => {
        const matchingPlan =
          activePlans.find((p) => p.qa_agent_id && Number(p.qa_agent_id) === analyst.id) || defaultPlan;

        const effectiveAudits = analyst.totalAudits * multiplier;
        const effectivePoints = Math.round(effectiveAudits * 1.45 * 100) / 100;
        const baseTargetPoints = Number(matchingPlan.base_target_points || matchingPlan.base_target_leads || (frequency === "MONTHLY" ? 500 : 50));

        const result = calculateQaIncentive(
          effectivePoints,
          matchingPlan,
          { id: analyst.id, name: analyst.name },
          {
            actualPoints: effectivePoints,
            baseTargetPoints,
            actualLeadsAudited: effectiveAudits,
          }
        );

        result.qa_agent_name = analyst.name;
        result.qa_name = analyst.name;
        result.qa_agent_id = analyst.id;
        result.qualified_leads = analyst.qualified * multiplier;
        result.disqualified_leads = analyst.disqualified * multiplier;
        result.qualification_rate_pct =
          effectiveAudits > 0 ? Math.round((result.qualified_leads / effectiveAudits) * 1000) / 10 : 0;

        calculations.push(result);
      });
    }

    // Sort by total incentive descending, then actual points descending
    calculations.sort(
      (a, b) => b.total_incentive - a.total_incentive || (b.actual_points || 0) - (a.actual_points || 0)
    );

    const totalAudits = calculations.reduce((sum, c) => sum + c.actual_leads_audited, 0);
    const totalPointsAchieved = Math.round(
      calculations.reduce((sum, c) => sum + (c.actual_points || 0), 0) * 100
    ) / 100;
    const totalTargetPoints = calculations.reduce((sum, c) => sum + (c.target_points || 0), 0);
    const totalIncentive = calculations.reduce((sum, c) => sum + c.total_incentive, 0);
    const totalAdditionalIncentive = calculations.reduce((sum, c) => sum + (c.total_additional_incentive || 0), 0);
    const totalQualified = calculations.reduce((sum, c) => sum + c.qualified_leads, 0);
    const totalDisqualified = calculations.reduce((sum, c) => sum + c.disqualified_leads, 0);
    const totalRectified = calculations.reduce((sum, c) => sum + (c.rectified_count || 0), 0);
    const eligibleCount = calculations.filter((c) => c.base_target_achieved).length;

    const mergedSummary = {
      total_qa_analysts: calculations.length,
      active_qa_auditors: calculations.filter((c) => (c.actual_points || 0) > 0 || c.actual_leads_audited > 0).length,
      total_audits: totalAudits,
      total_points_achieved: totalPointsAchieved,
      total_target_points: totalTargetPoints,
      total_incentive: totalIncentive,
      total_additional_incentive: totalAdditionalIncentive,
      eligible_count: eligibleCount,
      average_incentive: calculations.length > 0 ? Math.round(totalIncentive / calculations.length) : 0,
      total_qualified: totalQualified,
      total_disqualified: totalDisqualified,
      total_rectified: totalRectified,
      overall_qualification_rate_pct:
        totalAudits > 0 ? Math.round((totalQualified / totalAudits) * 1000) / 10 : 0,
      overall_disqualification_rate_pct:
        totalAudits > 0 ? Math.round((totalDisqualified / totalAudits) * 1000) / 10 : 0,
      status_totals: {
        Qualified: totalQualified,
        Disqualified: totalDisqualified,
        Rectified: totalRectified,
      },
      top_performer: calculations[0]
        ? {
            user_id: calculations[0].qa_agent_id,
            qa_id: calculations[0].qa_agent_id,
            qa_name: calculations[0].qa_agent_name,
            full_name: calculations[0].qa_agent_name,
            total_audited: calculations[0].actual_leads_audited,
            total_points: calculations[0].actual_points || 0,
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

