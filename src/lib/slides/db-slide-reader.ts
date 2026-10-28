import { prisma } from "@/lib/db";
import { getShiftBusinessDate, getCurrentShiftState, generateShiftIntervals } from "@/lib/shift/engine";
import { getCampaignSnapshotsForDate } from "@/lib/db/campaign-analytics-repository";
import { getAgentSnapshotsForDate, getAgentIntervalMetricsForDate } from "@/lib/db/agent-productivity-repository";
import { getFloorDailySnapshotForDate, computeFloorCapacityGap } from "@/lib/db/floor-capacity-repository";
import { getQaDailySnapshotsForDate, getQaIntervalMetricsForDate } from "@/lib/db/qa-analytics-repository";
import { getAttendanceDailySnapshotForDate, getAgentAttendanceSnapshotsForDate } from "@/lib/db/attendance-repository";
import { getDailyFinalization } from "@/lib/db/finalization-repository";

function convertUtcToIstTime(timeStr: string): string {
  if (!timeStr) return timeStr;
  const parts = timeStr.trim().split(":");
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1] || "0", 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  minutes += 30;
  hours += 5;
  if (minutes >= 60) {
    minutes -= 60;
    hours += 1;
  }
  hours = hours % 24;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
import type {
  Slide1Data,
  Slide2Data,
  Slide3Data,
  Slide4Data,
  Slide5Data,
  AgentSlide2,
  QaHeatmapAnalyst,
  AgentHeatmapItem,
  Slide5ComparisonSlot,
} from "@/types";

export interface DbSlideReadResult<T> {
  success: boolean;
  data?: T;
  workDate: string;
  source: "mysql_database";
  finalizationStatus: string;
  lastSyncedAt?: string;
  isStale?: boolean;
  hasRecords: boolean;
}

/**
 * Reads Slide 1 from MySQL database snapshots.
 */
export async function getDbSlide1(targetDate?: string): Promise<DbSlideReadResult<Slide1Data>> {
  const workDate = targetDate || getShiftBusinessDate();
  const [campaigns, attendance, lateComers, finalization] = await Promise.all([
    getCampaignSnapshotsForDate(workDate),
    getAttendanceDailySnapshotForDate(workDate),
    getAgentAttendanceSnapshotsForDate(workDate),
    getDailyFinalization(workDate),
  ]);

  const hasRecords = campaigns.length > 0 || attendance !== null;

  if (!hasRecords) {
    return {
      success: false,
      workDate,
      source: "mysql_database",
      finalizationStatus: finalization.finalization_status,
      hasRecords: false,
    };
  }

  const mappedCampaigns = campaigns.map((c) => ({
    campaign_id: c.crm_campaign_id,
    campaign_name: c.campaign_name_snapshot,
    campaign_code: c.crm_campaign_code || `CAMP-${c.crm_campaign_id}`,
    client_code: c.client_code_snapshot,
    campaign_type: c.campaign_type_snapshot,
    monthly_allocation: c.monthly_allocation_snapshot,
    daily_target: c.daily_target_leads,
    generated_leads: c.generated_leads,
    qualified_leads: c.qualified_leads,
    disqualified_leads: c.disqualified_leads,
    pending_qa: c.pending_qa_leads,
    remaining_leads_to_qualify: c.remaining_target_leads,
    completion_percentage: c.completion_percentage,
    target_achieved: c.target_achieved,
  }));

  const mappedLate = lateComers
    .filter((l) => l.late_minutes > 0)
    .map((l) => ({
      user_id: l.crm_agent_id,
      full_name: l.agent_name_snapshot || `Agent #${l.crm_agent_id}`,
      role: "SDR",
      punch_in: l.punch_in_at || "",
      shift_start_time: "17:30:00",
      grace_minutes: 0,
      late_minutes: l.late_minutes,
      status: l.attendance_status,
    }));

  const kpiCards = {
    total_agents: attendance?.total_agents || 0,
    present_today: attendance?.present_count || 0,
    absent_today: attendance?.absent_count || 0,
    late_today: attendance?.late_count || mappedLate.length,
  };

  const lastSynced = campaigns[0]?.synced_at || attendance?.synced_at;

  return {
    success: true,
    workDate,
    source: "mysql_database",
    finalizationStatus: finalization.finalization_status,
    lastSyncedAt: lastSynced,
    hasRecords: true,
    data: {
      kpi_cards: kpiCards,
      campaigns: mappedCampaigns,
      late_comers: mappedLate,
      total_live_campaigns: mappedCampaigns.length,
      total_allocated_campaigns: mappedCampaigns.filter((c) => c.daily_target > 0).length,
    },
  };
}

/**
 * Reads Slide 2 from MySQL database snapshots.
 */
export async function getDbSlide2(
  targetDate?: string,
  page: number = 1,
  limit: number = 100
): Promise<DbSlideReadResult<Slide2Data>> {
  const workDate = targetDate || getShiftBusinessDate();
  const [agents, floorSnap, campaigns, finalization] = await Promise.all([
    getAgentSnapshotsForDate(workDate),
    getFloorDailySnapshotForDate(workDate),
    getCampaignSnapshotsForDate(workDate),
    getDailyFinalization(workDate),
  ]);

  const hasRecords = agents.length > 0 || floorSnap !== null;

  if (!hasRecords) {
    return {
      success: false,
      workDate,
      source: "mysql_database",
      finalizationStatus: finalization.finalization_status,
      hasRecords: false,
    };
  }

  const mappedAgents: AgentSlide2[] = agents.map((a) => ({
    agent_id: a.crm_agent_id,
    agent_name: a.agent_name_snapshot,
    role: "SDR",
    daily_target_points: a.daily_target_points,
    working_days: 22,
    monthly_target_points: a.daily_target_points * 22,
    generated_leads: a.generated_leads,
    qualified_leads: a.qualified_leads,
    disqualified_leads: a.disqualified_leads,
    pending_qa: a.pending_qa_leads,
    achieved_points: a.achieved_points,
    remaining_points: a.remaining_target_points,
    completion_percentage: a.target_completion_pct,
    is_target_met: a.target_completion_pct >= 100,
    attendance_status: a.attendance_status_snapshot,
    is_present: a.attendance_status_snapshot.toLowerCase() !== "absent",
    // Time-based productivity pace fields
    elapsed_work_minutes: a.elapsed_work_minutes || 0,
    expected_points_at_snapshot: a.expected_points_at_snapshot || 0,
    productivity_pace_pct: a.productivity_pace_pct !== null ? a.productivity_pace_pct : null,
    pace_status: a.pace_status,
  }));

  const campaignBreakdown = campaigns.map((c) => ({
    campaign_id: c.crm_campaign_id,
    campaign_name: c.campaign_name_snapshot,
    campaign_code: c.crm_campaign_code || undefined,
    campaign_type: c.campaign_type_snapshot,
    daily_target: c.daily_target_leads,
    point_factor: c.campaign_point_factor,
    target_points: c.daily_target_points,
  }));

  const totalCampPoints =
    floorSnap?.campaign_target_points ??
    campaignBreakdown.reduce((sum, c) => sum + c.target_points, 0);

  const floorCapPoints =
    floorSnap?.floor_capacity_points ??
    mappedAgents
      .filter((a) => a.is_present)
      .reduce((sum, a) => sum + a.daily_target_points, 0);

  const gapInfo = computeFloorCapacityGap(floorCapPoints, totalCampPoints);

  const campaignTargetSummary = {
    total_target_points: totalCampPoints,
    total_campaigns: campaignBreakdown.length,
    campaigns: campaignBreakdown,
  };

  const floorCapSummary = {
    total_capacity_points: floorCapPoints,
    total_agents: floorSnap?.total_agents || mappedAgents.length,
    present_agents_count: floorSnap?.present_agents || mappedAgents.filter((a) => a.is_present).length,
    absent_agents_count: floorSnap?.absent_agents || mappedAgents.filter((a) => !a.is_present).length,
    capacity_gap: gapInfo.capacityGap,
    capacity_gap_label: gapInfo.gapLabel,
    capacity_gap_status: gapInfo.gapStatus,
  };

  const pageSize = limit > 0 ? limit : 100;
  const startIndex = (page - 1) * pageSize;
  const paginatedAgents = mappedAgents.slice(startIndex, startIndex + pageSize);

  return {
    success: true,
    workDate,
    source: "mysql_database",
    finalizationStatus: finalization.finalization_status,
    lastSyncedAt: agents[0]?.synced_at || floorSnap?.synced_at,
    hasRecords: true,
    data: {
      total_agents: mappedAgents.length,
      page,
      limit,
      total_pages: Math.ceil(mappedAgents.length / pageSize) || 1,
      agents: paginatedAgents,
      campaign_target_points: campaignTargetSummary,
      floor_capacity: floorCapSummary,
      query_date: workDate,
    },
  };
}

/**
 * Reads Slide 3 (QA Heatmap) from MySQL interval metrics.
 */
export async function getDbSlide3(
  targetDate?: string,
  intervalMinutes: number = 10
): Promise<DbSlideReadResult<Slide3Data>> {
  const workDate = targetDate || getShiftBusinessDate();
  const [qaDaily, intervals, finalization] = await Promise.all([
    getQaDailySnapshotsForDate(workDate),
    getQaIntervalMetricsForDate(workDate),
    getDailyFinalization(workDate),
  ]);

  const hasRecords = qaDaily.length > 0 || intervals.length > 0;
  if (!hasRecords) {
    return {
      success: false,
      workDate,
      source: "mysql_database",
      finalizationStatus: finalization.finalization_status,
      hasRecords: false,
    };
  }

  // Group interval records by analyst
  const analystMap = new Map<number, QaHeatmapAnalyst>();
  qaDaily.forEach((qa) => {
    analystMap.set(qa.crm_qa_agent_id, {
      user_id: qa.crm_qa_agent_id,
      full_name: qa.qa_agent_name_snapshot || `QA #${qa.crm_qa_agent_id}`,
      total_audited: qa.total_audits,
      total_qualified: qa.qualified_leads,
      intervals: [],
    });
  });

  // Attach intervals
  intervals.forEach((inv) => {
    let analyst = analystMap.get(inv.crm_qa_agent_id);
    if (!analyst) {
      analyst = {
        user_id: inv.crm_qa_agent_id,
        full_name: inv.qa_agent_name_snapshot || `QA #${inv.crm_qa_agent_id}`,
        total_audited: 0,
        total_qualified: 0,
        intervals: [],
      };
      analystMap.set(inv.crm_qa_agent_id, analyst);
    }

    const startUtc = new Date(inv.interval_start_at);
    const endUtc = new Date(inv.interval_end_at);
    const startIst = convertUtcToIstTime(startUtc.toISOString().slice(11, 19));
    const endIst = convertUtcToIstTime(endUtc.toISOString().slice(11, 19));

    analyst.intervals.push({
      slot_index: analyst.intervals.length,
      time_label: `${startIst} - ${endIst}`,
      qualified_count: inv.qualified_events,
      audited_count: inv.audited_events,
    });
  });

  const allHeatmapAnalysts = Array.from(analystMap.values());
  const activeHeatmapAnalysts = allHeatmapAnalysts.filter(
    (a) =>
      ((a.total_audited || 0) > 0 || (a.total_qualified || 0) > 0) &&
      a.user_id !== 99 &&
      !a.full_name?.toLowerCase().includes("sagar") &&
      !a.full_name?.toLowerCase().includes("mayur jadhav")
  );
  const heatmapAnalysts = activeHeatmapAnalysts;
  heatmapAnalysts.sort((a, b) => b.total_audited - a.total_audited);

  const totalAudited = heatmapAnalysts.reduce((sum, a) => sum + a.total_audited, 0);
  const totalQualified = heatmapAnalysts.reduce((sum, a) => sum + a.total_qualified, 0);

  return {
    success: true,
    workDate,
    source: "mysql_database",
    finalizationStatus: finalization.finalization_status,
    lastSyncedAt: intervals[0]?.synced_at || qaDaily[0]?.synced_at,
    hasRecords: true,
    data: {
      date: workDate,
      shift_start: "17:30:00",
      shift_end: "02:30:00",
      interval_minutes: intervalMinutes,
      total_intervals: heatmapAnalysts[0]?.intervals.length || 54,
      total_qa_analysts: heatmapAnalysts.length,
      qa_heatmap: heatmapAnalysts,
      today_audited: totalAudited,
      today_qualified: totalQualified,
      today_disqualified: Math.max(0, totalAudited - totalQualified),
      today_pending_qa: 0,
    },
  };
}

/**
 * Reads Slide 4 (Agent Heatmap) from MySQL interval metrics.
 */
export async function getDbSlide4(
  targetDate?: string,
  intervalMinutes: number = 10
): Promise<DbSlideReadResult<Slide4Data>> {
  const workDate = targetDate || getShiftBusinessDate();
  const [intervals, finalization] = await Promise.all([
    getAgentIntervalMetricsForDate(workDate),
    getDailyFinalization(workDate),
  ]);

  if (intervals.length === 0) {
    return {
      success: false,
      workDate,
      source: "mysql_database",
      finalizationStatus: finalization.finalization_status,
      hasRecords: false,
    };
  }

  const agentMap = new Map<number, AgentHeatmapItem>();
  intervals.forEach((inv) => {
    let item = agentMap.get(inv.crm_agent_id);
    if (!item) {
      item = {
        agent_id: inv.crm_agent_id,
        agent_name: inv.agent_name_snapshot || `Agent #${inv.crm_agent_id}`,
        total_generated: 0,
        intervals: [],
      };
      agentMap.set(inv.crm_agent_id, item);
    }

    item.total_generated += inv.generated_leads;

    const startUtc = new Date(inv.interval_start_at);
    const endUtc = new Date(inv.interval_end_at);
    const startIst = convertUtcToIstTime(startUtc.toISOString().slice(11, 19));
    const endIst = convertUtcToIstTime(endUtc.toISOString().slice(11, 19));

    item.intervals.push({
      slot_index: item.intervals.length,
      time_label: `${startIst} - ${endIst}`,
      generated_count: inv.generated_leads,
    });
  });

  const heatmapAgents = Array.from(agentMap.values());
  heatmapAgents.sort((a, b) => b.total_generated - a.total_generated);

  return {
    success: true,
    workDate,
    source: "mysql_database",
    finalizationStatus: finalization.finalization_status,
    lastSyncedAt: intervals[0]?.synced_at,
    hasRecords: true,
    data: {
      date: workDate,
      interval_minutes: intervalMinutes,
      shift_start: "17:30:00",
      shift_end: "02:30:00",
      total_intervals: heatmapAgents[0]?.intervals.length || 54,
      total_agents: heatmapAgents.length,
      agent_heatmap: heatmapAgents,
    },
  };
}

/**
 * Reads Slide 5 (Comparative Analytics) from MySQL interval metrics.
 */
export async function getDbSlide5(targetDate?: string): Promise<DbSlideReadResult<Slide5Data>> {
  const workDate = targetDate || getShiftBusinessDate();
  const [qaIntervals, agentIntervals, finalization] = await Promise.all([
    getQaIntervalMetricsForDate(workDate),
    getAgentIntervalMetricsForDate(workDate),
    getDailyFinalization(workDate),
  ]);

  if (qaIntervals.length === 0 && agentIntervals.length === 0) {
    return {
      success: false,
      workDate,
      source: "mysql_database",
      finalizationStatus: finalization.finalization_status,
      hasRecords: false,
    };
  }

  // Aggregate intervals by time slot
  const slotMap = new Map<
    string,
    {
      time_label: string;
      leads_generated: number;
      leads_audited: number;
      leads_qualified: number;
      leads_disqualified: number;
    }
  >();

  agentIntervals.forEach((inv) => {
    const startUtc = new Date(inv.interval_start_at);
    const endUtc = new Date(inv.interval_end_at);
    const key = inv.interval_start_at;
    const startIst = convertUtcToIstTime(startUtc.toISOString().slice(11, 19));
    const endIst = convertUtcToIstTime(endUtc.toISOString().slice(11, 19));

    const slot = slotMap.get(key) || {
      time_label: `${startIst} - ${endIst}`,
      leads_generated: 0,
      leads_audited: 0,
      leads_qualified: 0,
      leads_disqualified: 0,
    };
    slot.leads_generated += inv.generated_leads;
    slotMap.set(key, slot);
  });

  qaIntervals.forEach((inv) => {
    const startUtc = new Date(inv.interval_start_at);
    const endUtc = new Date(inv.interval_end_at);
    const key = inv.interval_start_at;
    const startIst = convertUtcToIstTime(startUtc.toISOString().slice(11, 19));
    const endIst = convertUtcToIstTime(endUtc.toISOString().slice(11, 19));

    const slot = slotMap.get(key) || {
      time_label: `${startIst} - ${endIst}`,
      leads_generated: 0,
      leads_audited: 0,
      leads_qualified: 0,
      leads_disqualified: 0,
    };
    slot.leads_audited += inv.audited_events;
    slot.leads_qualified += inv.qualified_events;
    slot.leads_disqualified += inv.disqualified_events;
    slotMap.set(key, slot);
  });

  // Sort slots chronologically
  const sortedKeys = Array.from(slotMap.keys()).sort();
  let cumulativeGenerated = 0;
  let cumulativeAudited = 0;
  let cumulativeQualified = 0;

  const comparisonTimeline: Slide5ComparisonSlot[] = sortedKeys.map((k, idx) => {
    const s = slotMap.get(k)!;
    cumulativeGenerated += s.leads_generated;
    cumulativeAudited += s.leads_audited;
    cumulativeQualified += s.leads_qualified;

    return {
      slot_index: idx,
      time_label: s.time_label,
      leads_generated: s.leads_generated,
      leads_audited: s.leads_audited,
      leads_qualified: s.leads_qualified,
      leads_disqualified: s.leads_disqualified,
      pending_backlog_delta: s.leads_generated - s.leads_audited,
      cumulative_generated: cumulativeGenerated,
      cumulative_audited: cumulativeAudited,
      cumulative_qualified: cumulativeQualified,
    };
  });

  const totalGenerated = cumulativeGenerated;
  const totalAudited = cumulativeAudited;
  const totalQualified = cumulativeQualified;
  const totalDisqualified = comparisonTimeline.reduce((sum, s) => sum + s.leads_disqualified, 0);
  const auditTurnaround = totalGenerated > 0 ? Math.round((totalAudited / totalGenerated) * 100 * 10) / 10 : 0;
  const qualRate = totalAudited > 0 ? Math.round((totalQualified / totalAudited) * 100 * 10) / 10 : 0;

  return {
    success: true,
    workDate,
    source: "mysql_database",
    finalizationStatus: finalization.finalization_status,
    lastSyncedAt: qaIntervals[0]?.synced_at || agentIntervals[0]?.synced_at,
    hasRecords: true,
    data: {
      summary: {
        total_leads_generated: totalGenerated,
        total_leads_audited: totalAudited,
        total_leads_qualified: totalQualified,
        total_leads_disqualified: totalDisqualified,
        pending_audit_gap: Math.max(0, totalGenerated - totalAudited),
        audit_turnaround_rate: auditTurnaround,
        qualification_approval_rate: qualRate,
      },
      comparison_timeline: comparisonTimeline,
    },
  };
}
