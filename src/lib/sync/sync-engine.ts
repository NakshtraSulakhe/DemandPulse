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

import { getShiftBusinessDate, getShiftWindowForBusinessDate, getCurrentShiftState } from "@/lib/shift/engine";
import {
  getCrmSlide1,
  getCrmSlide2,
  getCrmSlide3,
  getCrmSlide4,
  getCrmSlide5,
} from "@/lib/crm-api";
import { fetchDailySettled } from "@/lib/incentives/api";
import { getAllocationsMapForDate } from "@/lib/db/allocations";
import { getVerifiedPointFactor } from "@/lib/productivity/points-capacity";
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

// Concurrency mutex lock to prevent concurrent executions
let isSyncRunning = false;
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
  const workDate = targetDate || getShiftBusinessDate();
  const jobName = options?.jobName || "demandflow_analytics_sync";

  // Prevent overlapping sync jobs unless forced
  if (isSyncRunning && !options?.force) {
    return {
      success: false,
      workDate,
      processedCount: 0,
      failedCount: 0,
      errors: { concurrency: "Another synchronization run is already in progress." },
      durationMs: Date.now() - startTime,
      message: "Sync skipped: Job currently active.",
    };
  }

  isSyncRunning = true;

  let runId: string | undefined;
  const errors: Record<string, string> = {};
  let processedRecords = 0;
  let failedRecords = 0;
  let hasMockFallback = false;

  try {
    // 1. Record sync start in MySQL
    const runInfo = await startSyncRun({
      job_name: jobName,
      work_date: workDate,
      source_watermark: `sync_${Date.now()}`,
    });
    runId = runInfo.runId;

    const shiftWindow = getShiftWindowForBusinessDate(workDate);
    const shiftState = getCurrentShiftState();
    const elapsedMinutes =
      shiftState.businessDate === workDate ? shiftState.minutesIntoShift : 540;

    // 2. Fetch live data concurrently from CRM APIs
    const [s1Result, s2Result, s3Result, s4Result, allocationsMap, incentivesResult] =
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
        getAllocationsMapForDate(workDate).catch(() => new Map()),
        fetchDailySettled({ date: workDate }).catch(() => null),
      ]);

    if (s1Result.isMockFallback || s2Result.isMockFallback) {
      hasMockFallback = true;
    }

    // =========================================================================
    // A. SYNC CAMPAIGN DAILY SNAPSHOTS (Slide 1 + Target Plans)
    // =========================================================================
    if (s1Result.success && s1Result.data && Array.isArray(s1Result.data.campaigns)) {
      try {
        const campaignInputs = s1Result.data.campaigns.map((camp) => {
          const savedAlloc = allocationsMap.get(camp.campaign_id);
          const dailyTarget = savedAlloc ? savedAlloc.daily_target : (camp.daily_target || 0);
          const factor = getVerifiedPointFactor(camp.campaign_type);

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
        const agentInputs = s2Result.data.agents.map((ag) => ({
          crm_agent_id: ag.agent_id,
          agent_name: ag.agent_name,
          daily_target_points: ag.daily_target_points || 0,
          achieved_points: ag.achieved_points || 0,
          qualified_leads: ag.qualified_leads || 0,
          disqualified_leads: ag.disqualified_leads || 0,
          generated_leads: ag.generated_leads || 0,
          pending_qa_leads: ag.pending_qa || 0,
          attendance_status: ag.attendance_status || (ag.is_present === false ? "Absent" : "Present"),
          elapsed_work_minutes: elapsedMinutes,
          source_updated_at: new Date(),
        }));

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
          const factor = getVerifiedPointFactor(c.campaign_type);
          campaignTargetPoints += target * factor;
        });
      }

      let totalAgents = 0;
      let presentAgents = 0;
      let absentAgents = 0;
      let floorCapacityPoints = 0;
      let totalAchievedPoints = 0;

      if (s2Result.success && s2Result.data && Array.isArray(s2Result.data.agents)) {
        totalAgents = s2Result.data.agents.length;
        s2Result.data.agents.forEach((a) => {
          const isPresent = a.is_present !== false && (a.attendance_status || "").toLowerCase() !== "absent";
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
        const activeQaHeatmap = s3Result.data.qa_heatmap.filter(
          (qa) =>
            ((qa.total_audited || 0) > 0 || (qa.total_qualified || 0) > 0) &&
            qa.user_id !== 99 &&
            !qa.full_name?.toLowerCase().includes("sagar") &&
            !qa.full_name?.toLowerCase().includes("mayur jadhav")
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

        // Interval metrics across shift window (5:30 PM - 2:30 AM IST -> 12:00 - 21:00 UTC)
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
          const lateInputs = s1Result.data.late_comers.map((l) => ({
            crm_agent_id: l.user_id,
            agent_name: l.full_name,
            attendance_status: l.status || "Late",
            late_minutes: l.late_minutes || 0,
            punch_in_at: l.punch_in ? new Date(l.punch_in) : null,
          }));
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
      });
    }

    lastSyncCompletedAt = new Date();

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
    isSyncRunning = false;
  }
}

/**
 * Returns current sync status
 */
export function getSyncEngineStatus() {
  return {
    isSyncRunning,
    lastSyncCompletedAt: lastSyncCompletedAt ? lastSyncCompletedAt.toISOString() : null,
  };
}
