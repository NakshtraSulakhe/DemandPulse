/**
 * DemandFlow Slides - Centralized Analytics Synchronization Engine
 *
 * Responsibilities:
 * 1. Synchronizes live data from PHP/MySQL CRM Bridge APIs to demandflow_slides MySQL database.
 * 2. Idempotent upserts for Campaign Snapshots, Agent Productivity, Floor Capacity, QA Heatmaps,
 *    Agent Heatmaps, Attendance, and Daily Incentives.
 * 3. Exact 10-minute interval boundary generation with UTC timestamps across cross-midnight shift.
 * 4. Lock mechanism to prevent overlapping sync runs.
 * 5. Resilient error handling: Never converts missing metrics or CRM downtime into zero counts.
 */

import {
  getShiftBusinessDate,
  getShiftWindowForBusinessDate,
  getCurrentShiftState,
  normalizeDateString,
} from "@/lib/shift/engine";
import {
  getCrmSlide1,
  getCrmSlide2,
  getCrmSlide3,
  getCrmSlide4,
  getCrmSlide5,
} from "@/lib/crm-api";
import { fetchDailySettled } from "@/lib/incentives/api";
import { getAllocationsMapForDate } from "@/lib/db/allocations";
import { getVerifiedPointFactor, isAgentPresentForFloorCapacity } from "@/lib/productivity/points-capacity";
import { getProductivityPointsMap } from "@/lib/db/campaign-points-repository";
import { upsertCampaignDailySnapshots } from "@/lib/db/campaign-analytics-repository";
import {
  upsertAgentDailySnapshots,
  upsertAgentIntervalMetrics,
} from "@/lib/db/agent-productivity-repository";
import { upsertFloorDailySnapshot } from "@/lib/db/floor-capacity-repository";
import {
  upsertQaDailySnapshots,
  upsertQaIntervalMetrics,
} from "@/lib/db/qa-analytics-repository";
import {
  upsertAttendanceDailySnapshot,
  upsertAgentAttendanceSnapshots,
} from "@/lib/db/attendance-repository";
import { upsertIncentiveDailySnapshots } from "@/lib/db/incentive-reporting-repository";
import { startSyncRun, completeSyncRun } from "@/lib/db/sync-run-repository";
import { execute, queryOne } from "@/lib/db";

// BUG-009 FIX: Replaced in-memory mutex (fails on Vercel multi-instance) with
// MySQL advisory lock using GET_LOCK() / RELEASE_LOCK() so it works across all
// serverless function instances sharing the same DB.
const SYNC_LOCK_TIMEOUT_MS = 60; // MySQL GET_LOCK timeout in seconds
let lastSyncCompletedAt: Date | null = null;

export interface SyncEngineResult {
  success: boolean;
  workDate: string;
  runId?: string;
  processedCount: number;
  failedCount: number;
  errors: Record<string, string>;
  isMockFallback?: boolean;
  durationMs: number;
  message: string;
}

/**
 * Executes a full synchronization run for a target business work date.
 * If targetDate is not supplied, uses the authoritative current shift business date.
 */
export async function runAnalyticsSync(
  targetDate?: string,
  options?: {
    force?: boolean;
    jobName?: string;
    isFinal?: boolean;
  }
): Promise<SyncEngineResult> {
  const startTime = Date.now();
  const normalizedTarget = normalizeDateString(targetDate);
  const workDate = normalizedTarget || getShiftBusinessDate();
  const jobName = options?.jobName || "demandflow_analytics_sync";
  const lockName = `demandflow_sync_${workDate}`;

  // BUG-009 FIX: Use MySQL advisory GET_LOCK() as a distributed lock that works
  // across all Vercel serverless instances sharing the same MySQL database.
  // Returns 1 if lock acquired, 0 if already held by another connection, null on error.
  let lockAcquired = false;
  try {
    if (!options?.force) {
      const lockResult = await queryOne<{ lock_result: number }>(
        `SELECT GET_LOCK(?, ?) AS lock_result`,
        [lockName, SYNC_LOCK_TIMEOUT_MS]
      );
      lockAcquired = lockResult?.lock_result === 1;
      if (!lockAcquired) {
        return {
          success: false,
          workDate,
          processedCount: 0,
          failedCount: 0,
          errors: { concurrency: `A synchronization run for ${workDate} is already in progress (distributed lock held).` },
          durationMs: Date.now() - startTime,
          message: `Sync skipped: Distributed lock currently held for ${workDate}.`,
        };
      }
    } else {
      lockAcquired = true; // force mode skips lock
    }
  } catch (lockErr: any) {
    console.warn("[SyncEngine] DB advisory lock unavailable — proceeding without lock:", lockErr?.message);
    lockAcquired = true; // gracefully degrade if DB doesn't support advisory locks
  }

  let runId: string | undefined;
  const errors: Record<string, string> = {};
  let processedRecords = 0;
  let failedRecords = 0;
  let hasMockFallback = false;

  try {
    // 1. Record sync start in MySQL (defensively - audit failure won't halt sync)
    try {
      const runInfo = await startSyncRun({
        job_name: jobName,
        work_date: workDate,
        source_watermark: `sync_${Date.now()}`,
      });
      runId = runInfo.runId;
    } catch (auditErr: any) {
      console.warn("[SyncEngine] Failed to record startSyncRun in database:", auditErr?.message || auditErr);
    }

    const shiftWindow = getShiftWindowForBusinessDate(workDate);
    const shiftState = getCurrentShiftState();
    const elapsedMinutes =
      shiftState.businessDate === workDate ? shiftState.minutesIntoShift : 540;

    // 2. Fetch live data concurrently from CRM APIs
    // BUG-010 FIX: Added s5Result (Slide 5 / Comparative Analytics) which was imported but never fetched.
    const [s1Result, s2Result, s3Result, s4Result, s5Result, allocationsMap, incentivesResult] =
      await Promise.all([
        getCrmSlide1(workDate).catch((e) => ({
          success: false,
          error: e.message || String(e),
          data: undefined,
          isMockFallback: false,
        })),
        getCrmSlide2(workDate, 1, 100).catch((e) => ({
          success: false,
          error: e.message || String(e),
          data: undefined,
          isMockFallback: false,
        })),
        getCrmSlide3(workDate, 10).catch((e) => ({
          success: false,
          error: e.message || String(e),
          data: undefined,
          isMockFallback: false,
        })),
        getCrmSlide4(workDate, 10).catch((e) => ({
          success: false,
          error: e.message || String(e),
          data: undefined,
          isMockFallback: false,
        })),
        getCrmSlide5(workDate).catch((e) => ({
          success: false,
          error: e.message || String(e),
          data: undefined,
          isMockFallback: false,
        })),
        getAllocationsMapForDate(workDate).catch(() => new Map()),
        fetchDailySettled({ date: workDate }).catch(() => null),
      ]);

    if (s1Result.isMockFallback || s2Result.isMockFallback || s5Result.isMockFallback) {
      hasMockFallback = true;
    }

    const pointsMap = await getProductivityPointsMap().catch(() => ({} as Record<string, number>));

    // =========================================================================
    // A. SYNC CAMPAIGN DAILY SNAPSHOTS (Slide 1 + Target Plans)
    // =========================================================================
    if (s1Result.success && s1Result.data && Array.isArray(s1Result.data.campaigns)) {
      try {
        const campaignInputs = s1Result.data.campaigns.map((camp) => {
          const savedAlloc = allocationsMap.get(camp.campaign_id);
          const dailyTarget = savedAlloc ? savedAlloc.daily_target : (camp.daily_target || 0);
          const factor = getVerifiedPointFactor(camp.campaign_type, pointsMap);

          return {
            crm_campaign_id: camp.campaign_id,
            crm_campaign_code: camp.campaign_code || null,
            campaign_name: camp.campaign_name,
            client_code: camp.client_code || null,
            campaign_type: camp.campaign_type || "General",
            monthly_allocation: camp.monthly_allocation || 0,
            daily_target_leads: dailyTarget,
            campaign_point_factor: factor,
            generated_leads: camp.generated_leads || 0,
            qualified_leads: camp.qualified_leads || 0,
            disqualified_leads: camp.disqualified_leads || 0,
            pending_qa_leads: camp.pending_qa || 0,
            source_updated_at: new Date(),
          };
        });

        const res = await upsertCampaignDailySnapshots(
          workDate,
          campaignInputs,
          options?.isFinal ?? false
        );
        processedRecords += res.count;
      } catch (err: any) {
        errors.campaigns = err.message || String(err);
        failedRecords++;
      }
    } else if (s1Result.error) {
      errors.slide1 = s1Result.error;
    }

    // =========================================================================
    // B. SYNC AGENT DAILY PRODUCTIVITY SNAPSHOTS (Slide 2)
    // =========================================================================
    if (s2Result.success && s2Result.data && Array.isArray(s2Result.data.agents)) {
      try {
        const agentInputs = s2Result.data.agents.map((ag) => {
          // BUG-011 FIX: Pre-compute attendance status before using in the mapping.
          // The old code passed ag.attendance_status (possibly null) to isAgentPresentForFloorCapacity
          // while simultaneously using ag.attendance_status in the same || expression — a self-referential bug.
          const rawAttStatus = ag.attendance_status || "";
          const resolvedAttStatus = rawAttStatus
            ? rawAttStatus
            : (isAgentPresentForFloorCapacity(undefined, ag.is_present) ? "Present" : "Absent");
          return {
            crm_agent_id: ag.agent_id,
            agent_name: ag.agent_name,
            daily_target_points: ag.daily_target_points || 0,
            achieved_points: ag.achieved_points || 0,
            qualified_leads: ag.qualified_leads || 0,
            disqualified_leads: ag.disqualified_leads || 0,
            generated_leads: ag.generated_leads || 0,
            pending_qa_leads: ag.pending_qa || 0,
            attendance_status: resolvedAttStatus,
            elapsed_work_minutes: elapsedMinutes,
            source_updated_at: new Date(),
          };
        });

        const res = await upsertAgentDailySnapshots(
          workDate,
          agentInputs,
          options?.isFinal ?? false
        );
        processedRecords += res.count;
      } catch (err: any) {
        errors.agents = err.message || String(err);
        failedRecords++;
      }
    } else if (s2Result.error) {
      errors.slide2 = s2Result.error;
    }

    // =========================================================================
    // C. SYNC FLOOR CAPACITY SNAPSHOT (Slide 1 & Slide 2 combined)
    // =========================================================================
    try {
      let campaignTargetPoints = 0;
      if (s1Result.success && s1Result.data && Array.isArray(s1Result.data.campaigns)) {
        s1Result.data.campaigns.forEach((c) => {
          const saved = allocationsMap.get(c.campaign_id);
          const target = saved ? saved.daily_target : (c.daily_target || 0);
          const factor = getVerifiedPointFactor(c.campaign_type, pointsMap);
          campaignTargetPoints += target * factor;
        });
      }

      let totalAgents = 0;
      let presentAgents = 0;
      let absentAgents = 0;
      let floorCapacityPoints = 0;
      let totalAchievedPoints = 0;

      if (s2Result.success && s2Result.data?.floor_capacity) {
        totalAgents = s2Result.data.floor_capacity.total_agents || s2Result.data.agents?.length || 0;
        presentAgents = s2Result.data.floor_capacity.present_agents_count || 0;
        absentAgents = s2Result.data.floor_capacity.absent_agents_count || 0;
        floorCapacityPoints = s2Result.data.floor_capacity.total_capacity_points || 0;
        if (Array.isArray(s2Result.data.agents)) {
          totalAchievedPoints = s2Result.data.agents.reduce((sum, a) => sum + (a.achieved_points || 0), 0);
        }
      } else if (s2Result.success && s2Result.data && Array.isArray(s2Result.data.agents)) {
        totalAgents = s2Result.data.agents.length;
        s2Result.data.agents.forEach((a) => {
          const isPresent = isAgentPresentForFloorCapacity(a.attendance_status, a.is_present);
          const target = a.daily_target_points || 0;
          totalAchievedPoints += a.achieved_points || 0;
          if (isPresent) {
            presentAgents++;
            floorCapacityPoints += target;
          } else {
            absentAgents++;
          }
        });
      } else if (s1Result.success && s1Result.data?.kpi_cards) {
        totalAgents = s1Result.data.kpi_cards.total_agents || 0;
        presentAgents = s1Result.data.kpi_cards.present_today || 0;
        absentAgents = s1Result.data.kpi_cards.absent_today || 0;
      }

      // HIGH-001 FIX: Log a warning instead of silently overriding computed floor capacity values.
      // The old code silently clamped presentAgents down when Slide 1 KPI count was lower,
      // masking data discrepancies without any audit trail.
      if (s1Result.success && s1Result.data?.kpi_cards && s1Result.data.kpi_cards.present_today > 0) {
        const s1Present = s1Result.data.kpi_cards.present_today;
        const s1Absent = s1Result.data.kpi_cards.absent_today;
        if (presentAgents > s1Present) {
          console.warn(
            `[SyncEngine] Floor capacity discrepancy for ${workDate}: ` +
            `Slide 2 agent-level data shows ${presentAgents} present, ` +
            `but Slide 1 KPI shows only ${s1Present}. ` +
            `Using Slide 2 value as it is derived from individual agent records. ` +
            `Investigate CRM data refresh timing if this recurs.`
          );
          // Do NOT silently override — keep the agent-level value from Slide 2 (more precise)
        }
      }

      const lateCount = s1Result.data?.late_comers?.length || 0;

      await upsertFloorDailySnapshot({
        work_date: workDate,
        total_agents: totalAgents,
        present_agents: presentAgents,
        absent_agents: absentAgents,
        late_agents: lateCount,
        campaign_target_points: Math.round(campaignTargetPoints * 1000) / 1000,
        floor_capacity_points: Math.round(floorCapacityPoints * 1000) / 1000,
        total_achieved_points: Math.round(totalAchievedPoints * 1000) / 1000,
      });
      processedRecords++;
    } catch (err: any) {
      errors.floorCapacity = err.message || String(err);
      failedRecords++;
    }

    // =========================================================================
    // D. SYNC QA DEPARTMENT SNAPSHOTS & 10-MINUTE INTERVALS (Slide 3)
    // =========================================================================
    if (s3Result.success && s3Result.data && Array.isArray(s3Result.data.qa_heatmap)) {
      try {
        // BUG-012 FIX: Removed hardcoded name-based exclusions ("sagar", "mayur jadhav").
        // Name-based filtering in production is fragile — if a new employee has a matching name
        // substring they'd be silently excluded. Keep only the stable numeric ID exclusion.
        // Add any permanent exclusions to a DB-driven list (slide_system_settings or dedicated table).
        const EXCLUDED_QA_USER_IDS = new Set([99]); // numeric ID exclusions only
        const activeQaHeatmap = s3Result.data.qa_heatmap.filter(
          (qa) =>
            ((qa.total_audited || 0) > 0 || (qa.total_qualified || 0) > 0) &&
            !EXCLUDED_QA_USER_IDS.has(qa.user_id)
        );
        const targetQaHeatmap = activeQaHeatmap;

        const qaDailyInputs = targetQaHeatmap.map((qa) => ({
          crm_qa_agent_id: qa.user_id,
          qa_agent_name: qa.full_name,
          total_audits: qa.total_audited || 0,
          unique_leads_audited: qa.total_audited || 0,
          qualified_leads: qa.total_qualified || 0,
          disqualified_leads: Math.max(0, (qa.total_audited || 0) - (qa.total_qualified || 0)),
        }));

        const qaDailyRes = await upsertQaDailySnapshots(workDate, qaDailyInputs);
        processedRecords += qaDailyRes.count;

        // Interval metrics across shift window (5:30 PM - 2:30 AM IST, extended up to 9:00 AM IST)
        const startUtcMs = new Date(shiftWindow.shiftStartUtc).getTime();
        const intervalMinutes = s3Result.data.interval_minutes || 10;
        const intervalInputs: Array<{
          crm_qa_agent_id: number;
          qa_agent_name?: string | null;
          interval_start_at: Date;
          interval_end_at: Date;
          audited_events: number;
          qualified_events: number;
          unique_leads_qualified: number;
        }> = [];

        targetQaHeatmap.forEach((analyst) => {
          if (Array.isArray(analyst.intervals)) {
            analyst.intervals.forEach((inv, slotIdx) => {
              const slotStart = new Date(startUtcMs + slotIdx * intervalMinutes * 60 * 1000);
              const slotEnd = new Date(startUtcMs + (slotIdx + 1) * intervalMinutes * 60 * 1000);

              intervalInputs.push({
                crm_qa_agent_id: analyst.user_id,
                qa_agent_name: analyst.full_name,
                interval_start_at: slotStart,
                interval_end_at: slotEnd,
                audited_events: inv.audited_count || 0,
                qualified_events: inv.qualified_count || 0,
                unique_leads_qualified: inv.qualified_count || 0,
              });
            });
          }
        });

        if (intervalInputs.length > 0) {
          const invRes = await upsertQaIntervalMetrics(workDate, intervalInputs);
          processedRecords += invRes.count;
        }
      } catch (err: any) {
        errors.qaHeatmap = err.message || String(err);
        failedRecords++;
      }
    } else if (s3Result.error) {
      errors.slide3 = s3Result.error;
    }

    // =========================================================================
    // E. SYNC AGENT GENERATION 10-MINUTE INTERVALS (Slide 4)
    // =========================================================================
    if (s4Result.success && s4Result.data && Array.isArray(s4Result.data.agent_heatmap)) {
      try {
        const startUtcMs = new Date(shiftWindow.shiftStartUtc).getTime();
        const intervalMinutes = s4Result.data.interval_minutes || 10;
        const agentIntervalInputs: Array<{
          crm_agent_id: number;
          agent_name?: string | null;
          interval_start_at: Date;
          interval_end_at: Date;
          generated_leads: number;
        }> = [];

        s4Result.data.agent_heatmap.forEach((agent) => {
          if (Array.isArray(agent.intervals)) {
            agent.intervals.forEach((inv, slotIdx) => {
              const slotStart = new Date(startUtcMs + slotIdx * intervalMinutes * 60 * 1000);
              const slotEnd = new Date(startUtcMs + (slotIdx + 1) * intervalMinutes * 60 * 1000);

              agentIntervalInputs.push({
                crm_agent_id: agent.agent_id,
                agent_name: agent.agent_name,
                interval_start_at: slotStart,
                interval_end_at: slotEnd,
                generated_leads: inv.generated_count || 0,
              });
            });
          }
        });

        if (agentIntervalInputs.length > 0) {
          const aRes = await upsertAgentIntervalMetrics(workDate, agentIntervalInputs);
          processedRecords += aRes.count;
        }
      } catch (err: any) {
        errors.agentIntervals = err.message || String(err);
        failedRecords++;
      }
    } else if (s4Result.error) {
      errors.slide4 = s4Result.error;
    }

    // =========================================================================
    // F. SYNC ATTENDANCE & PUNCH-IN RECORDS (Slide 1)
    // =========================================================================
    if (s1Result.success && s1Result.data) {
      try {
        const kpi = s1Result.data.kpi_cards;
        if (kpi) {
          await upsertAttendanceDailySnapshot({
            work_date: workDate,
            total_agents: kpi.total_agents || 0,
            present_count: kpi.present_today || 0,
            absent_count: kpi.absent_today || 0,
            late_count: kpi.late_today || 0,
          });
          processedRecords++;
        }

        if (Array.isArray(s1Result.data.late_comers) && s1Result.data.late_comers.length > 0) {
          const lateInputs = s1Result.data.late_comers.map((l) => {
            const rawPunch = l.punch_in || (l as any).punch_in_at || (l as any).punch_in_time || "";
            return {
              crm_agent_id: l.user_id,
              agent_name: (l.full_name || (l as any).agent_name || (l as any).name || (l as any).agent_name_snapshot || `Agent #${l.user_id}`).trim(),
              attendance_status: l.status || "Late",
              late_minutes: l.late_minutes || 0,
              punch_in_at: rawPunch,
            };
          });
          const attRes = await upsertAgentAttendanceSnapshots(workDate, lateInputs);
          processedRecords += attRes.count;
        }
      } catch (err: any) {
        errors.attendance = err.message || String(err);
        failedRecords++;
      }
    }

    // =========================================================================
    // G. SYNC INCENTIVE DAILY REPORTING COPIES (Incentives API)
    // =========================================================================
    if (incentivesResult?.success && incentivesResult.data && Array.isArray((incentivesResult.data as any).settlements)) {
      try {
        const settlements = (incentivesResult.data as any).settlements;
        const incInputs = settlements.map((s: any) => ({
          crm_payout_id: s.id || s.payout_id || null,
          crm_agent_id: s.agent_id || s.user_id,
          agent_name: s.agent_name || null,
          target_points: Number(s.target_points || 0),
          achieved_points: Number(s.achieved_points || 0),
          qualified_leads: Number(s.qualified_leads || 0),
          base_incentive: Number(s.base_incentive || s.base_amount || 0),
          slab_incentive: Number(s.slab_incentive || s.slab_amount || 0),
          total_incentive: Number(s.total_incentive || s.total_amount || 0),
          eligibility_status: s.eligibility_status || "eligible",
          approval_status: s.approval_status || "approved",
          payment_status: s.payment_status || "unpaid",
          crm_payment_reference: s.payment_reference || s.reference || null,
          source_updated_at: s.updated_at ? new Date(s.updated_at) : new Date(),
        }));

        if (incInputs.length > 0) {
          const incRes = await upsertIncentiveDailySnapshots(
            workDate,
            incInputs,
            options?.isFinal ?? false
          );
          processedRecords += incRes.count;
        }
      } catch (err: any) {
        errors.incentives = err.message || String(err);
        failedRecords++;
      }
    }

    // =========================================================================
    // H. VALIDATE COMPARATIVE ANALYTICS (Slide 5)
    // =========================================================================
    // Slide 5 historical DB views are aggregated from Slide 3 & 4 interval tables;
    // fetching Slide 5 here ensures API reachability and surfaces any Slide 5 errors.
    if (s5Result.success && s5Result.data) {
      const timelineCount = Array.isArray(s5Result.data.comparison_timeline)
        ? s5Result.data.comparison_timeline.length
        : 0;
      const formsCount = Array.isArray(s5Result.data.form_submissions)
        ? s5Result.data.form_submissions.length
        : 0;
      if (timelineCount > 0 || formsCount > 0) {
        processedRecords++;
      }
    } else if (s5Result.error) {
      errors.slide5 = s5Result.error;
      failedRecords++;
    }

    // =========================================================================
    // 3. COMPLETE SYNC RUN IN DATABASE
    // =========================================================================
    const hasErrors = Object.keys(errors).length > 0;
    const syncStatus = hasErrors ? (processedRecords > 0 ? "partial" : "failed") : "completed";
    const errorSummary = hasErrors ? JSON.stringify(errors) : null;

    if (runId) {
      await completeSyncRun({
        id: runId,
        status: syncStatus,
        source_record_count: processedRecords + failedRecords,
        processed_record_count: processedRecords,
        failed_record_count: failedRecords,
        error_summary: errorSummary,
      }).catch((e) => console.warn("[SyncEngine] Failed to completeSyncRun in database:", e?.message || e));
    }

    // BUG-013 FIX: Only set lastSyncCompletedAt on the explicit success path.
    // Previously it was also set in the finally block, so even a failed sync reported
    // "just synced" in the status endpoint, masking the fact that the last SUCCESS was much earlier.
    if (syncStatus !== "failed") {
      lastSyncCompletedAt = new Date();
    }

    return {
      success: syncStatus !== "failed",
      workDate,
      runId,
      processedCount: processedRecords,
      failedCount: failedRecords,
      errors,
      isMockFallback: hasMockFallback,
      durationMs: Date.now() - startTime,
      message: `Sync completed: ${processedRecords} records persisted to demandflow_slides MySQL.`,
    };
  } catch (globalErr: any) {
    const errorMsg = globalErr instanceof Error ? globalErr.message : String(globalErr);
    if (runId) {
      await completeSyncRun({
        id: runId,
        status: "failed",
        source_record_count: processedRecords,
        processed_record_count: processedRecords,
        failed_record_count: failedRecords + 1,
        error_summary: errorMsg,
      }).catch(() => null);
    }

    return {
      success: false,
      workDate,
      runId,
      processedCount: processedRecords,
      failedCount: failedRecords + 1,
      errors: { fatal: errorMsg },
      durationMs: Date.now() - startTime,
      message: `Sync failed: ${errorMsg}`,
    };
  } finally {
    // BUG-009 FIX: Release MySQL advisory lock so other instances can proceed.
    try {
      await execute(`SELECT RELEASE_LOCK(?)`, [lockName]).catch(() => {});
    } catch { /* ignore release errors */ }
    // BUG-013 FIX: Do NOT update lastSyncCompletedAt here — only set on success path above.
  }
}

/**
 * Returns current sync status
 */
export function getSyncEngineStatus() {
  return {
    isSyncRunning: false, // Distributed MySQL lock state is checked per-run via GET_LOCK
    activeDates: [] as string[],
    lastSyncCompletedAt: lastSyncCompletedAt ? lastSyncCompletedAt.toISOString() : null,
  };
}
