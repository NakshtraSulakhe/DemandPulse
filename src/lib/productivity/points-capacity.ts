/**
 * DemandFlow Slides - Slide 2 Points & Floor Capacity Analytics Engine
 *
 * Implements two independent planning metrics:
 * 1. Campaign Daily Target Points: SUM(Daily Campaign Lead Target * Campaign Type Point Factor)
 * 2. Floor Capacity Points: SUM(Daily Target Points of Present Agents)
 * 3. Capacity Gap: Floor Capacity Points - Campaign Target Points
 */

import type { Slide2Data, AgentSlide2 } from "@/types";

export interface CampaignPointBreakdownItem {
  campaign_id: number;
  campaign_name: string;
  campaign_code?: string;
  campaign_type: string;
  daily_target: number;
  point_factor: number;
  target_points: number;
}

export interface CampaignTargetPointsSummary {
  total_target_points: number;
  total_campaigns: number;
  campaigns: CampaignPointBreakdownItem[];
}

export interface FloorCapacitySummary {
  total_capacity_points: number;
  total_agents: number;
  present_agents_count: number;
  absent_agents_count: number;
  capacity_gap: number;
  capacity_gap_label: string;
  capacity_gap_status: "shortfall" | "surplus" | "balanced";
}

/**
 * Authoritative CRM Point Factors
 * Derived from DemandFlow CRM's QA & Incentive audit engine (preview.php & settle.php):
 * - MQL / Marketing Qualified Leads: 1 point per lead
 * - HQL / Callback: 2 points per lead
 * - BANT: 3 points per lead
 * - Appointment Generation: 5 points per lead
 * - Email Marketing: 1 point per lead
 * - Default: 1 point per lead
 */
export const VERIFIED_CRM_POINT_FACTORS: Record<string, number> = {
  mql: 1,
  "marketing qualified leads": 1,
  "marketing qualified lead": 1,
  "hql/callback": 2,
  "hql / callback": 2,
  hql: 2,
  callback: 2,
  bant: 3,
  "appointment generation": 5,
  "appointment setting": 5,
  appointment: 5,
  "email marketing": 1,
  email: 1,
  outbound: 1,
  "outbound b2b": 1,
  inbound: 1,
  "inbound qualified": 1,
};

/**
 * Normalizes campaign type and retrieves verified CRM points factor.
 * Avoids hardcoding inside display components; allows dynamic resolution.
 */
export function getVerifiedPointFactor(
  campaignType?: string | null,
  customFactors?: Record<string, number>
): number {
  if (!campaignType) return 1;
  const clean = campaignType.trim().toLowerCase();

  if (customFactors && clean in customFactors) {
    const custom = customFactors[clean];
    if (typeof custom === "number" && !isNaN(custom) && custom > 0) {
      return custom;
    }
  }

  if (clean in VERIFIED_CRM_POINT_FACTORS) {
    return VERIFIED_CRM_POINT_FACTORS[clean];
  }

  // Check partial key matching
  for (const [key, factor] of Object.entries(VERIFIED_CRM_POINT_FACTORS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return factor;
    }
  }

  return 1;
}

/**
 * Evaluates whether an agent is considered present for floor capacity calculation.
 * Respects CRM business rules:
 * - Allowed Present statuses: "Present", "Full Day", "Half Day", "In Progress", "Late"
 * - Disqualified / Absent statuses: "Absent", "Approved Leave", "Leave", "Sick Leave", "Off"
 */
export function isAgentPresentForFloorCapacity(
  attendanceStatus?: string | null,
  isPresentFlag?: boolean | null
): boolean {
  if (isPresentFlag === true) return true;
  if (isPresentFlag === false) {
    // If flag is explicitly false, verify status string isn't an in-progress shift
    if (!attendanceStatus) return false;
  }

  if (!attendanceStatus) return true; // Default to present if in active shift roster

  const clean = attendanceStatus.trim().toLowerCase();

  // Explicit absent statuses
  if (
    clean === "absent" ||
    clean === "leave" ||
    clean === "approved leave" ||
    clean === "sick leave" ||
    clean === "casual leave" ||
    clean === "weekly off" ||
    clean === "off" ||
    clean === "holiday" ||
    clean === "disqualified"
  ) {
    return false;
  }

  // Explicit present/active statuses
  if (
    clean === "present" ||
    clean === "full day" ||
    clean === "half day" ||
    clean === "in progress" ||
    clean === "late" ||
    clean === "punched in" ||
    clean === "active"
  ) {
    return true;
  }

  // Any non-absent status is treated as present according to CRM rules
  return true;
}

/**
 * Calculates Campaign Target Points:
 * SUM(Daily Campaign Lead Target * Campaign Type Point Factor)
 * Excludes inactive campaigns and prevents duplicate counting.
 */
export function calculateCampaignTargetPoints(
  campaigns: Array<{
    campaign_id: number;
    campaign_name?: string | null;
    campaign_code?: string | null;
    campaign_type?: string | null;
    daily_target?: number | null;
    campaign_status?: string | null;
    active?: number | boolean | null;
  }>,
  savedAllocationsMap?: Map<number, { daily_target: number }>,
  customFactors?: Record<string, number>
): CampaignTargetPointsSummary {
  const seenIds = new Set<number>();
  const breakdown: CampaignPointBreakdownItem[] = [];
  let totalPoints = 0;

  for (const c of campaigns) {
    if (!c.campaign_id || seenIds.has(c.campaign_id)) continue;
    seenIds.add(c.campaign_id);

    // Filter active/live campaigns
    if (c.active !== undefined && c.active !== null && Number(c.active) === 0) continue;
    const status = (c.campaign_status || "").trim().toLowerCase();
    if (status && !["live", "active", "in_progress", "in progress"].includes(status)) {
      continue;
    }

    // Determine authoritative daily target (MySQL saved allocation takes precedence if present)
    const saved = savedAllocationsMap?.get(c.campaign_id);
    const dailyTarget = saved ? saved.daily_target : Number(c.daily_target) || 0;

    if (dailyTarget <= 0) continue;

    const campaignType = (c.campaign_type || "General").trim();
    const factor = getVerifiedPointFactor(campaignType, customFactors);
    const pts = Math.round(dailyTarget * factor * 100) / 100;

    totalPoints += pts;
    breakdown.push({
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name || `Campaign #${c.campaign_id}`,
      campaign_code: c.campaign_code || undefined,
      campaign_type: campaignType,
      daily_target: dailyTarget,
      point_factor: factor,
      target_points: pts,
    });
  }

  // Sort breakdown descending by target points
  breakdown.sort((a, b) => b.target_points - a.target_points);

  return {
    total_target_points: Math.round(totalPoints * 100) / 100,
    total_campaigns: breakdown.length,
    campaigns: breakdown,
  };
}

/**
 * Calculates Floor Capacity Points:
 * SUM(Daily Target Points of Present Agents)
 * Excludes absent agents and prevents double-counting agents.
 */
export function calculateFloorCapacityPoints<
  T extends {
    agent_id: number;
    agent_name?: string | null;
    daily_target_points?: number | null;
    target_points?: number | null;
    attendance_status?: string | null;
    is_present?: boolean | null;
  }
>(
  agents: T[],
  attendanceMap?: Map<number, { attendance_status: string; is_present: boolean }>
): {
  total_capacity_points: number;
  total_agents: number;
  present_agents_count: number;
  absent_agents_count: number;
  annotated_agents: Array<T & { daily_target_points: number; is_present: boolean; attendance_status: string }>;
} {
  const seenIds = new Set<number>();
  let totalCapacity = 0;
  let presentCount = 0;
  let absentCount = 0;

  const annotated: Array<any> = [];

  for (const a of agents) {
    if (!a.agent_id || seenIds.has(a.agent_id)) continue;
    seenIds.add(a.agent_id);

    const attInfo = attendanceMap?.get(a.agent_id);
    const attendanceStatus = attInfo?.attendance_status || a.attendance_status || "Present";
    const isPresent = isAgentPresentForFloorCapacity(
      attendanceStatus,
      attInfo?.is_present !== undefined ? attInfo.is_present : a.is_present
    );

    const target = Number(a.daily_target_points ?? a.target_points ?? 0);

    if (isPresent) {
      presentCount++;
      totalCapacity += target;
    } else {
      absentCount++;
    }

    annotated.push({
      ...a,
      daily_target_points: target,
      is_present: isPresent,
      attendance_status: attendanceStatus,
    });
  }

  return {
    total_capacity_points: Math.round(totalCapacity * 100) / 100,
    total_agents: seenIds.size,
    present_agents_count: presentCount,
    absent_agents_count: absentCount,
    annotated_agents: annotated,
  };
}

/**
 * Computes the Capacity Gap:
 * Capacity Gap = Floor Capacity Points - Campaign Target Points
 */
export function calculateCapacityGap(
  floorCapacity: number,
  campaignTarget: number
): {
  capacity_gap: number;
  capacity_gap_label: string;
  capacity_gap_status: "shortfall" | "surplus" | "balanced";
} {
  const gap = Math.round((floorCapacity - campaignTarget) * 100) / 100;

  if (gap < 0) {
    const diff = Math.abs(gap);
    return {
      capacity_gap: gap,
      capacity_gap_label: `${diff}-point capacity shortfall`,
      capacity_gap_status: "shortfall",
    };
  }

  if (gap > 0) {
    return {
      capacity_gap: gap,
      capacity_gap_label: `${gap}-point capacity surplus`,
      capacity_gap_status: "surplus",
    };
  }

  return {
    capacity_gap: 0,
    capacity_gap_label: "Capacity balanced",
    capacity_gap_status: "balanced",
  };
}

/**
 * Returns the exact verified Example Benchmark Dataset specified in Section 1, 2, and 3:
 * - Campaign A: MQL, 20 leads * 1 pt = 20 pts
 * - Campaign B: BANT, 10 leads * 3 pts = 30 pts
 * Total Campaign Target Points = 50 pts
 * - Agent 1: Present, 5 pts
 * - Agent 2: Present, 4 pts
 * - Agent 3: Present, 6 pts
 * - Agent 4: Absent, 8 pts
 * - Agent 5: Absent, 7 pts
 * Total Floor Capacity Points = 15 pts (3 present agents)
 * Capacity Gap = 15 - 50 = -35 ("35-point capacity shortfall")
 */
export function getExampleBenchmarkDataset(): Slide2Data {
  const campaigns: CampaignPointBreakdownItem[] = [
    {
      campaign_id: 101,
      campaign_name: "Campaign A (Enterprise HRIS MQL)",
      campaign_code: "TG-EXP-MQL",
      campaign_type: "MQL",
      daily_target: 20,
      point_factor: 1,
      target_points: 20,
    },
    {
      campaign_id: 102,
      campaign_name: "Campaign B (Executive BANT Discovery)",
      campaign_code: "TG-EXP-BANT",
      campaign_type: "BANT",
      daily_target: 10,
      point_factor: 3,
      target_points: 30,
    },
  ];

  const agents: AgentSlide2[] = [
    {
      agent_id: 1,
      agent_name: "Agent 1",
      role: "SDR",
      daily_target_points: 5,
      working_days: 22,
      monthly_target_points: 110,
      generated_leads: 3,
      qualified_leads: 3,
      disqualified_leads: 0,
      pending_qa: 0,
      achieved_points: 3,
      remaining_points: 2,
      completion_percentage: 60,
      is_target_met: false,
      attendance_status: "Present",
      is_present: true,
    },
    {
      agent_id: 2,
      agent_name: "Agent 2",
      role: "SDR",
      daily_target_points: 4,
      working_days: 22,
      monthly_target_points: 88,
      generated_leads: 4,
      qualified_leads: 4,
      disqualified_leads: 0,
      pending_qa: 0,
      achieved_points: 4,
      remaining_points: 0,
      completion_percentage: 100,
      is_target_met: true,
      attendance_status: "Present",
      is_present: true,
    },
    {
      agent_id: 3,
      agent_name: "Agent 3",
      role: "Senior SDR",
      daily_target_points: 6,
      working_days: 22,
      monthly_target_points: 132,
      generated_leads: 6,
      qualified_leads: 6,
      disqualified_leads: 0,
      pending_qa: 0,
      achieved_points: 6,
      remaining_points: 0,
      completion_percentage: 100,
      is_target_met: true,
      attendance_status: "Present",
      is_present: true,
    },
    {
      agent_id: 4,
      agent_name: "Agent 4",
      role: "SDR",
      daily_target_points: 8,
      working_days: 22,
      monthly_target_points: 176,
      generated_leads: 0,
      qualified_leads: 0,
      disqualified_leads: 0,
      pending_qa: 0,
      achieved_points: 0,
      remaining_points: 8,
      completion_percentage: 0,
      is_target_met: false,
      attendance_status: "Absent",
      is_present: false,
    },
    {
      agent_id: 5,
      agent_name: "Agent 5",
      role: "SDR",
      daily_target_points: 7,
      working_days: 22,
      monthly_target_points: 154,
      generated_leads: 0,
      qualified_leads: 0,
      disqualified_leads: 0,
      pending_qa: 0,
      achieved_points: 0,
      remaining_points: 7,
      completion_percentage: 0,
      is_target_met: false,
      attendance_status: "Absent",
      is_present: false,
    },
  ];

  const campaignTargetPoints: CampaignTargetPointsSummary = {
    total_target_points: 50,
    total_campaigns: 2,
    campaigns,
  };

  const floorCapacity: FloorCapacitySummary = {
    total_capacity_points: 15,
    total_agents: 5,
    present_agents_count: 3,
    absent_agents_count: 2,
    capacity_gap: -35,
    capacity_gap_label: "35-point capacity shortfall",
    capacity_gap_status: "shortfall",
  };

  return {
    total_agents: agents.length,
    page: 1,
    limit: 10,
    total_pages: 1,
    agents,
    campaign_target_points: campaignTargetPoints,
    floor_capacity: floorCapacity,
    query_date: "2026-10-26",
  };
}
