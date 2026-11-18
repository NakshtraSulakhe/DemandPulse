import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getShiftBusinessDate } from "@/lib/shift/engine";
import { getEmployeeTargetForMonth } from "@/lib/db/employee-targets-repository";
import { getIncentiveConfig, calculateIncentiveBreakdown } from "@/lib/incentives/rules-config";
import { getActiveMonthlyIncentivePlan, calculateMonthlyIncentive } from "@/lib/db/agent-monthly-incentive-repository";
import { getQaIncentivePlans } from "@/lib/db/qa-incentive-repository";
import { calculateQaIncentive } from "@/lib/qa-incentives/calculator";
import { getProductivityPointsMap } from "@/lib/db/campaign-points-repository";
import { getCrmSlide2, getCrmSlide4, getCrmQaAudits, getCrmCampaignTargets } from "@/lib/crm-api";
import { getVerifiedPointFactor } from "@/lib/productivity/points-capacity";
import { CRM_KNOWN_ROSTER } from "@/lib/crm-roster";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Normalizes input date strings into canonical YYYY-MM-DD
 */
function normalizeDate(raw?: string | null): string {
  if (!raw) return getShiftBusinessDate();
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return getShiftBusinessDate();
}

/**
 * GET /api/productivity/employee-performance?employee_id=14&role=Agent&month=11&year=2026&date=YYYY-MM-DD
 * Dynamically computes employee performance using live CRM API feeds with resilient MySQL historical snapshots.
 * Accurately isolates Agent quota (5-10 pts daily) vs QA audit quota (50 pts daily).
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const employeeId = parseInt(searchParams.get("employee_id") || "0", 10);
  const role = (searchParams.get("role") || "Agent").toUpperCase() === "QA" ? "QA" : "Agent";
  const now = new Date();
  const currentShiftDate = getShiftBusinessDate();
  const workDate = normalizeDate(searchParams.get("date") || currentShiftDate);
  const month = parseInt(searchParams.get("month") || workDate.split("-")[1] || String(now.getMonth() + 1), 10);
  const year = parseInt(searchParams.get("year") || workDate.split("-")[0] || String(now.getFullYear()), 10);

  if (!employeeId) {
    return NextResponse.json(
      { success: false, error: "Valid employee_id is required" },
      { status: 400 }
    );
  }

  try {
    // 1. Department-specific points map (QA or Agent with global fallback)
    const pointsMap = await getProductivityPointsMap(role);

    // 2. Fetch assigned targets from MySQL
    const targetAssignment = await getEmployeeTargetForMonth(employeeId, role, month, year);

    const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

    if (role === "Agent") {
      // ------------------------------------------------------------------------
      // AGENT METRICS EVALUATION (LIVE CRM + MYSQL SNAPSHOTS)
      // ------------------------------------------------------------------------

      // Query live CRM Slide 2, Slide 4, and targets concurrently
      const [slide2Res, slide4Res, crmCampaignsRes, todaySnap, monthlyAgg] = await Promise.all([
        getCrmSlide2(workDate, 1, 100).catch(() => ({ success: false, data: undefined })),
        getCrmSlide4(workDate, 30).catch(() => ({ success: false, data: undefined })),
        getCrmCampaignTargets(workDate, "all").catch(() => ({ success: false, data: undefined })),
        queryOne<any>(
          `SELECT * FROM agent_daily_snapshots 
           WHERE crm_agent_id = ? AND work_date = ? 
           ORDER BY snapshot_version DESC LIMIT 1`,
          [employeeId, workDate]
        ).catch(() => null),
        queryOne<any>(
          `SELECT SUM(achieved_points) as total_points, 
                  COUNT(DISTINCT work_date) as days_present,
                  SUM(qualified_leads) as total_qualified,
                  SUM(generated_leads) as total_generated
           FROM agent_daily_snapshots 
           WHERE crm_agent_id = ? AND work_date >= ? AND work_date <= ?`,
          [employeeId, startOfMonth, endOfMonth]
        ).catch(() => null),
      ]);

      // Resolve live agent record from CRM Slide 2 / Slide 4
      const liveSlide2Agent = slide2Res.success && slide2Res.data?.agents
        ? slide2Res.data.agents.find((a: any) => Number(a.agent_id || a.user_id || a.id) === employeeId)
        : null;

      const liveSlide4Agent = slide4Res.success && slide4Res.data?.agent_heatmap
        ? slide4Res.data.agent_heatmap.find((a: any) => Number(a.agent_id) === employeeId)
        : null;

      // Campaign catalog lookup indexes
      const campaignTypeById = new Map<number, string>();
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
        if (c.campaign_name) campaignTypeByName.set(String(c.campaign_name).trim().toLowerCase(), cType);
      }

      // Determine employee name
      const employeeName =
        liveSlide2Agent?.agent_name ||
        liveSlide4Agent?.agent_name ||
        todaySnap?.agent_name_snapshot ||
        targetAssignment?.employee_name ||
        `Agent #${employeeId}`;

      // Target Resolution for Agent:
      // Priority 1: Manager custom target override in MySQL (employee_target_assignments)
      // Priority 2: Authoritative agent target from live CRM Slide 2 (daily_target_points & monthly_target_points)
      // Priority 3: Historical MySQL daily snapshot (daily_target_points)
      // Priority 4: Default SDR agent quota (7 pts/day, 19 working days = 133 pts/month)
      const rawDailyTarget = targetAssignment
        ? Number(targetAssignment.daily_target)
        : Number(liveSlide2Agent?.daily_target_points ?? (liveSlide2Agent as any)?.target_points ?? todaySnap?.daily_target_points ?? 0);

      const dailyTarget = rawDailyTarget > 0 ? rawDailyTarget : 7;

      const workingDays = targetAssignment
        ? Number(targetAssignment.working_days)
        : Number(liveSlide2Agent?.working_days ?? 19);

      const effectiveMonthlyTarget = targetAssignment
        ? Number(targetAssignment.effective_monthly_target)
        : Number(liveSlide2Agent?.monthly_target_points ?? Math.round(dailyTarget * workingDays * 100) / 100);

      // Calculate shift daily numbers
      let actualDailyPoints = 0;
      let qualifiedLeadsCount = 0;
      let generatedLeadsCount = 0;
      let campaignBreakdown: Array<{
        name: string;
        qty: number;
        pointsPerUnit: number;
        totalPoints: number;
      }> = [];

      if (liveSlide2Agent) {
        qualifiedLeadsCount = Number(liveSlide2Agent.qualified_leads || 0);
        generatedLeadsCount = Number(liveSlide2Agent.generated_leads || liveSlide4Agent?.total_generated || 0);
        actualDailyPoints = Number(liveSlide2Agent.achieved_points || 0);

        // Process real campaigns from Slide 2 agent details if available
        const agentCamps = (liveSlide2Agent as any).campaigns;
        if (Array.isArray(agentCamps) && agentCamps.length > 0) {
          campaignBreakdown = agentCamps.map((c: any) => {
            const cid = Number(c.campaign_id || 0);
            const cName = String(c.campaign_name || `Campaign #${cid}`).trim();
            const cType = c.campaign_type || campaignTypeById.get(cid) || campaignTypeByName.get(cName.toLowerCase()) || "MQL";
            const qty = Number(c.qualified_leads ?? c.generated_leads ?? c.leads_count ?? 1);
            const factor = getVerifiedPointFactor(cType, pointsMap);
            const pts = Number(c.points) > 0 ? Number(c.points) : Math.round(qty * factor * 100) / 100;
            return {
              name: cName,
              qty,
              pointsPerUnit: factor,
              totalPoints: pts,
            };
          });
        }
      } else if (liveSlide4Agent) {
        generatedLeadsCount = Number(liveSlide4Agent.total_generated || 0);
        qualifiedLeadsCount = generatedLeadsCount;
        actualDailyPoints = generatedLeadsCount * (pointsMap["mql"] || 1.0);
      } else if (todaySnap) {
        actualDailyPoints = Number(todaySnap.achieved_points || 0);
        qualifiedLeadsCount = Number(todaySnap.qualified_leads || 0);
        generatedLeadsCount = Number(todaySnap.generated_leads || qualifiedLeadsCount);
      }

      // If no granular campaign breakdown was found but we have leads, construct from point configurations
      if (campaignBreakdown.length === 0 && (qualifiedLeadsCount > 0 || actualDailyPoints > 0)) {
        const leadCount = qualifiedLeadsCount > 0 ? qualifiedLeadsCount : Math.max(1, Math.round(actualDailyPoints));
        campaignBreakdown = [
          {
            name: "Outbound Qualified Leads",
            qty: leadCount,
            pointsPerUnit: leadCount > 0 ? Math.round((actualDailyPoints / leadCount) * 100) / 100 : 1.0,
            totalPoints: actualDailyPoints > 0 ? actualDailyPoints : leadCount * 1.0,
          },
        ];
      }

      if (actualDailyPoints === 0 && campaignBreakdown.length > 0) {
        actualDailyPoints = Math.round(
          campaignBreakdown.reduce((sum, item) => sum + item.totalPoints, 0) * 100
        ) / 100;
      }

      // Monthly points aggregation
      const dbMonthlyPoints = monthlyAgg && monthlyAgg.total_points ? Number(monthlyAgg.total_points) : 0;
      const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear();

      // If viewing current month, ensure live shift points delta is included cleanly
      const todaySnapPoints = todaySnap ? Number(todaySnap.achieved_points || 0) : 0;
      const todayDelta = Math.max(0, actualDailyPoints - todaySnapPoints);
      const actualMonthlyPoints = isCurrentMonth
        ? Math.round((dbMonthlyPoints + (todaySnap ? todayDelta : actualDailyPoints)) * 100) / 100
        : Math.round(dbMonthlyPoints * 100) / 100;

      const daysPresent = monthlyAgg && monthlyAgg.days_present
        ? Number(monthlyAgg.days_present) + (isCurrentMonth && !todaySnap && actualDailyPoints > 0 ? 1 : 0)
        : (actualDailyPoints > 0 ? 1 : 0);

      const dailyAchievementPct = dailyTarget > 0
        ? Math.round((actualDailyPoints / dailyTarget) * 100 * 10) / 10
        : 0;
      const remainingDailyPoints = Math.max(0, Math.round((dailyTarget - actualDailyPoints) * 100) / 100);

      const monthlyAchievementPct = effectiveMonthlyTarget > 0
        ? Math.round((actualMonthlyPoints / effectiveMonthlyTarget) * 100 * 10) / 10
        : 0;
      const remainingMonthlyPoints = Math.max(0, Math.round((effectiveMonthlyTarget - actualMonthlyPoints) * 100) / 100);

      // Evaluate daily incentive
      const dailyConfig = await getIncentiveConfig();
      const dailyBreakdown = calculateIncentiveBreakdown(
        actualDailyPoints,
        dailyTarget,
        todaySnap?.attendance_status_snapshot || (liveSlide2Agent?.is_present ? "Present" : "Present"),
        false,
        dailyConfig,
        undefined,
        undefined,
        employeeId
      );

      // Evaluate monthly incentive
      const monthlyPlan = await getActiveMonthlyIncentivePlan();
      const monthlyBreakdown = calculateMonthlyIncentive(monthlyAchievementPct, monthlyPlan.slabs);

      return NextResponse.json({
        success: true,
        role: "Agent",
        employeeId,
        employeeName,
        workDate,
        month,
        year,
        metrics: {
          dailyTarget,
          actualDailyPoints,
          dailyAchievementPct,
          remainingDailyPoints,
          dailyIncentiveEarned: dailyBreakdown.totalIncentive,
          workingDays,
          daysPresent,
          monthlyTarget: effectiveMonthlyTarget,
          isManuallyAdjusted: targetAssignment?.is_manually_adjusted || false,
          adjustmentReason: targetAssignment?.adjustment_reason || null,
          actualMonthlyPoints,
          monthlyAchievementPct,
          remainingMonthlyPoints,
          monthlyIncentive: monthlyBreakdown.incentiveAmount,
          currentSlab: monthlyBreakdown.qualifyingSlab?.label || "Below 90% threshold (₹0)",
          generatedLeadsCount,
          qualifiedLeadsCount,
          campaignBreakdown,
        },
      });
    } else {
      // ------------------------------------------------------------------------
      // QA SPECIALIST METRICS EVALUATION (LIVE CRM QA AUDITS + MYSQL)
      // ------------------------------------------------------------------------

      // Query live CRM QA Audits, campaigns, and DB snapshots concurrently
      const [qaAuditsRes, crmCampaignsRes, todaySnap, monthlyAgg, qaPlans] = await Promise.all([
        getCrmQaAudits({ date: workDate, include_leads: 1 }).catch(() => ({ success: false, data: undefined })),
        getCrmCampaignTargets(workDate, "all").catch(() => ({ success: false, data: undefined })),
        queryOne<any>(
          `SELECT * FROM qa_daily_snapshots 
           WHERE crm_qa_agent_id = ? AND work_date = ? 
           ORDER BY snapshot_version DESC LIMIT 1`,
          [employeeId, workDate]
        ).catch(() => null),
        queryOne<any>(
          `SELECT SUM(total_audits) as total_audits,
                  SUM(rework_leads) as total_rework,
                  SUM(qualified_leads) as total_qualified,
                  SUM(disqualified_leads) as total_disqualified,
                  SUM(achieved_points) as total_points,
                  COUNT(DISTINCT work_date) as days_active
           FROM qa_daily_snapshots 
           WHERE crm_qa_agent_id = ? AND work_date >= ? AND work_date <= ?`,
          [employeeId, startOfMonth, endOfMonth]
        ).catch(() => null),
        getQaIncentivePlans().catch(() => []),
      ]);

      // Campaign lookup indexes for type resolution
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

      const resolveLeadCampaignType = (lead: any, fallbackName: string): string => {
        const explicitType = String(lead?.campaign_type || "").trim();
        if (explicitType) return explicitType;
        const cid = Number(lead?.campaign_id || 0);
        if (cid && campaignTypeById.has(cid)) return campaignTypeById.get(cid)!;
        const cCode = String(lead?.campaign_code || "").trim().toLowerCase();
        if (cCode && campaignTypeByCode.has(cCode)) return campaignTypeByCode.get(cCode)!;
        const cNameKey = fallbackName.trim().toLowerCase();
        if (cNameKey && campaignTypeByName.has(cNameKey)) return campaignTypeByName.get(cNameKey)!;
        return fallbackName;
      };

      // Find QA analyst in live CRM payload
      const rawPayload = (qaAuditsRes.data as any)?.qa_audits || (qaAuditsRes.data as any)?.data || qaAuditsRes.data;
      const rawAnalysts: any[] =
        rawPayload?.qa_analysts ||
        rawPayload?.qa_users ||
        (Array.isArray(rawPayload) ? rawPayload : []);

      const liveQaAnalyst = Array.isArray(rawAnalysts)
        ? rawAnalysts.find((q: any) => Number(q.user_id || q.qa_id || q.id) === employeeId)
        : null;

      const rosterEntry = CRM_KNOWN_ROSTER[employeeId];
      const rawQaName =
        liveQaAnalyst?.qa_name ||
        liveQaAnalyst?.full_name ||
        liveQaAnalyst?.name ||
        liveQaAnalyst?.user_name ||
        todaySnap?.qa_agent_name_snapshot ||
        targetAssignment?.employee_name ||
        "";

      const employeeName =
        rosterEntry?.name ||
        (rawQaName && !rawQaName.startsWith("QA ") ? rawQaName : null) ||
        rosterEntry?.name ||
        rawQaName ||
        `QA Specialist #${employeeId}`;

      // QA Target Resolution:
      // QA Analyst daily target is 50 points/audits, 22 working days = 1,100 points
      const rawDailyTarget = targetAssignment
        ? Number(targetAssignment.daily_target)
        : Number(liveQaAnalyst?.target_points ?? todaySnap?.daily_target_points ?? 50);

      const dailyTarget = rawDailyTarget > 0 ? rawDailyTarget : 50;

      const workingDays = targetAssignment
        ? Number(targetAssignment.working_days)
        : 22;

      const effectiveMonthlyTarget = targetAssignment
        ? Number(targetAssignment.effective_monthly_target)
        : Number(dailyTarget * workingDays);

      let actualDailyAudits = 0;
      let reworkDaily = 0;
      let qualifiedDaily = 0;
      let actualDailyPoints = 0;
      let campaignBreakdown: Array<{
        name: string;
        qty: number;
        pointsPerUnit: number;
        totalPoints: number;
      }> = [];

      if (liveQaAnalyst) {
        // Group actual audited leads by campaign and campaign_type
        const rawLeads: any[] = Array.isArray(liveQaAnalyst.leads)
          ? liveQaAnalyst.leads
          : Array.isArray(liveQaAnalyst.audits)
          ? liveQaAnalyst.audits
          : [];

        actualDailyAudits = Number(liveQaAnalyst.total_audits || liveQaAnalyst.audited_leads || rawLeads.length || 0);
        reworkDaily = Number(liveQaAnalyst.rework_leads || 0);
        qualifiedDaily = Number(liveQaAnalyst.qualified_leads || 0);

        if (reworkDaily === 0 && rawLeads.length > 0) {
          reworkDaily = rawLeads.filter((l: any) => l.is_rework || l.audit_status === "Rework").length;
        }
        if (qualifiedDaily === 0 && rawLeads.length > 0) {
          qualifiedDaily = rawLeads.filter((l: any) => l.is_qualified || l.audit_status === "Qualified").length;
        }

        if (rawLeads.length > 0) {
          const groupMap = new Map<string, { name: string; type: string; qty: number }>();

          for (const lead of rawLeads) {
            const fallbackCampaign = String(lead.campaign_name || lead.campaign || "Standard Campaign").trim();
            const resolvedType = resolveLeadCampaignType(lead, fallbackCampaign);
            const groupKey = `${fallbackCampaign}:::${resolvedType}`;

            const existing = groupMap.get(groupKey);
            if (existing) {
              existing.qty += 1;
            } else {
              groupMap.set(groupKey, {
                name: fallbackCampaign,
                type: resolvedType,
                qty: 1,
              });
            }
          }

          campaignBreakdown = Array.from(groupMap.values()).map((item) => {
            const factor = getVerifiedPointFactor(item.type, pointsMap);
            const totalPoints = Math.round(item.qty * factor * 100) / 100;
            return {
              name: item.name !== item.type ? `${item.name} (${item.type})` : item.name,
              qty: item.qty,
              pointsPerUnit: factor,
              totalPoints,
            };
          });

          actualDailyPoints = Math.round(
            campaignBreakdown.reduce((sum, item) => sum + item.totalPoints, 0) * 100
          ) / 100;
        } else if (actualDailyAudits > 0) {
          // If CRM gave aggregate count without individual lead array, resolve using point factor
          const factor = pointsMap["mql"] || 1.0;
          actualDailyPoints = Math.round(actualDailyAudits * factor * 100) / 100;
          campaignBreakdown = [
            {
              name: "Verified Campaign Audits",
              qty: actualDailyAudits,
              pointsPerUnit: factor,
              totalPoints: actualDailyPoints,
            },
          ];
        }
      } else if (todaySnap) {
        actualDailyAudits = Number(todaySnap.total_audits || 0);
        reworkDaily = Number(todaySnap.rework_leads || 0);
        qualifiedDaily = Number(todaySnap.qualified_leads || 0);
        actualDailyPoints = Number(todaySnap.achieved_points || 0);

        if (actualDailyPoints === 0 && actualDailyAudits > 0) {
          actualDailyPoints = Math.round(actualDailyAudits * 1.0 * 100) / 100;
        }

        if (actualDailyAudits > 0) {
          campaignBreakdown = [
            {
              name: "Verified Audits (Archived)",
              qty: actualDailyAudits,
              pointsPerUnit: actualDailyAudits > 0 ? Math.round((actualDailyPoints / actualDailyAudits) * 100) / 100 : 1.0,
              totalPoints: actualDailyPoints,
            },
          ];
        }
      }

      // Monthly aggregation
      const dbMonthlyAudits = monthlyAgg && monthlyAgg.total_audits ? Number(monthlyAgg.total_audits) : 0;
      const dbMonthlyRework = monthlyAgg && monthlyAgg.total_rework ? Number(monthlyAgg.total_rework) : 0;
      const dbMonthlyPoints = monthlyAgg && monthlyAgg.total_points ? Number(monthlyAgg.total_points) : 0;

      const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear();
      const actualMonthlyAudits = isCurrentMonth
        ? Math.max(actualDailyAudits, dbMonthlyAudits + (todaySnap ? 0 : actualDailyAudits))
        : dbMonthlyAudits;

      const totalMonthlyRework = isCurrentMonth
        ? dbMonthlyRework + (todaySnap ? 0 : reworkDaily)
        : dbMonthlyRework;

      const todayQaSnapPoints = todaySnap ? Number(todaySnap.achieved_points || 0) : 0;
      const todayQaDelta = Math.max(0, actualDailyPoints - todayQaSnapPoints);
      const actualMonthlyPoints = isCurrentMonth
        ? Math.round((dbMonthlyPoints + (todaySnap ? todayQaDelta : actualDailyPoints)) * 100) / 100
        : Math.round(dbMonthlyPoints * 100) / 100;

      const dailyAchievementPct = dailyTarget > 0
        ? Math.round((actualDailyPoints / dailyTarget) * 100 * 10) / 10
        : 0;
      const remainingDailyPoints = Math.max(0, Math.round((dailyTarget - actualDailyPoints) * 10) / 10);

      const monthlyAchievementPct = effectiveMonthlyTarget > 0
        ? Math.round((actualMonthlyPoints / effectiveMonthlyTarget) * 100 * 10) / 10
        : 0;
      const remainingMonthlyPoints = Math.max(0, Math.round((effectiveMonthlyTarget - actualMonthlyPoints) * 10) / 10);

      // Audit accuracy & rework rate
      const qualityScore = actualMonthlyAudits > 0
        ? Math.round(((actualMonthlyAudits - totalMonthlyRework) / actualMonthlyAudits) * 100 * 10) / 10
        : 100.0;
      const reworkPct = actualMonthlyAudits > 0
        ? Math.round((totalMonthlyRework / actualMonthlyAudits) * 100 * 10) / 10
        : 0.0;

      // QA Incentives calculation
      const activeDailyPlan = qaPlans.find((p) => p.is_active && p.frequency === "DAILY") || qaPlans[0];
      let dailyIncentiveEarned = 0;
      if (activeDailyPlan) {
        const calculationBase = actualDailyPoints > 0 ? actualDailyPoints : actualDailyAudits;
        const res = calculateQaIncentive(calculationBase, activeDailyPlan);
        dailyIncentiveEarned = res.total_incentive;
      } else if (dailyAchievementPct >= 100) {
        dailyIncentiveEarned = 500;
      }

      const activeMonthlyPlan = qaPlans.find((p) => p.is_active && p.frequency === "MONTHLY");
      let monthlyIncentive = 0;
      let currentSlab = "Below 90% threshold (₹0)";

      if (activeMonthlyPlan) {
        const calculationBase = actualMonthlyPoints > 0 ? actualMonthlyPoints : actualMonthlyAudits;
        const res = calculateQaIncentive(calculationBase, activeMonthlyPlan);
        monthlyIncentive = res.total_incentive;
        currentSlab = res.tier_breakdown?.find((t) => t.leads_in_tier > 0)?.tier_name || "Base Target Achieved";
      } else {
        if (monthlyAchievementPct >= 110) {
          monthlyIncentive = 12000;
          currentSlab = "Exceeded 110% Points Target (₹12,000)";
        } else if (monthlyAchievementPct >= 100) {
          monthlyIncentive = 8000;
          currentSlab = "100% Points Target Base (₹8,000)";
        } else if (monthlyAchievementPct >= 90) {
          monthlyIncentive = 4000;
          currentSlab = "90% Points Target Achieved (₹4,000)";
        }
      }

      return NextResponse.json({
        success: true,
        role: "QA",
        employeeId,
        employeeName,
        workDate,
        month,
        year,
        metrics: {
          dailyTarget,
          actualDailyPoints,
          dailyAchievementPct,
          remainingDailyPoints,
          dailyIncentiveEarned,
          workingDays,
          monthlyTarget: effectiveMonthlyTarget,
          isManuallyAdjusted: targetAssignment?.is_manually_adjusted || false,
          adjustmentReason: targetAssignment?.adjustment_reason || null,
          actualMonthlyPoints,
          monthlyAchievementPct,
          remainingMonthlyPoints,
          monthlyIncentive,
          currentSlab,
          qualityScore,
          reworkPct,
          actualDailyAudits: actualDailyAudits || campaignBreakdown.reduce((sum, item) => sum + item.qty, 0),
          actualMonthlyAudits: actualMonthlyAudits || actualDailyAudits || campaignBreakdown.reduce((sum, item) => sum + item.qty, 0),
          qualifiedDaily,
          reworkDaily,
          campaignBreakdown,
        },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Error calculating employee performance: ${msg}` },
      { status: 500 }
    );
  }
}
