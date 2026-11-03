import { query, queryOne, execute } from "@/lib/db";

export interface FloorDailySnapshotRecord {
  id: string;
  work_date: string;
  total_agents: number;
  present_agents: number;
  absent_agents: number;
  late_agents: number;
  campaign_target_points: number;
  floor_capacity_points: number;
  capacity_gap_points: number;
  total_achieved_points: number;
  synced_at: string;
  snapshot_version: number;
}

export interface SaveFloorDailySnapshotInput {
  work_date: string;
  total_agents: number;
  present_agents: number;
  absent_agents: number;
  late_agents?: number;
  campaign_target_points: number;
  floor_capacity_points: number;
  total_achieved_points?: number;
  snapshot_version?: number;
}

/**
 * Computes capacity gap = floorCapacity - campaignTarget
 */
export function computeFloorCapacityGap(
  floorCapacity: number,
  campaignTarget: number
): {
  capacityGap: number;
  gapStatus: "shortfall" | "surplus" | "balanced";
  gapLabel: string;
} {
  const gap = Math.round((floorCapacity - campaignTarget) * 1000) / 1000;
  if (gap < 0) {
    const shortfall = Math.abs(gap);
    return {
      capacityGap: gap,
      gapStatus: "shortfall",
      gapLabel: `${shortfall}-point capacity shortfall`,
    };
  }
  if (gap > 0) {
    return {
      capacityGap: gap,
      gapStatus: "surplus",
      gapLabel: `${gap}-point capacity surplus`,
    };
  }
  return {
    capacityGap: 0,
    gapStatus: "balanced",
    gapLabel: "Capacity balanced",
  };
}

/**
 * Upserts a floor daily snapshot into MySQL.
 */
export async function upsertFloorDailySnapshot(
  data: SaveFloorDailySnapshotInput
): Promise<FloorDailySnapshotRecord> {
  const version = data.snapshot_version ?? 1;
  const gap = Math.round((data.floor_capacity_points - data.campaign_target_points) * 1000) / 1000;
  const totalAchieved = data.total_achieved_points || 0;
  const lateAgents = data.late_agents || 0;

  const sql = `
    INSERT INTO floor_daily_snapshots (
      work_date, total_agents, present_agents, absent_agents, late_agents,
      campaign_target_points, floor_capacity_points, capacity_gap_points, total_achieved_points,
      synced_at, snapshot_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      total_agents = VALUES(total_agents),
      present_agents = VALUES(present_agents),
      absent_agents = VALUES(absent_agents),
      late_agents = VALUES(late_agents),
      campaign_target_points = VALUES(campaign_target_points),
      floor_capacity_points = VALUES(floor_capacity_points),
      capacity_gap_points = VALUES(capacity_gap_points),
      total_achieved_points = VALUES(total_achieved_points),
      synced_at = NOW(6),
      updated_at = NOW(6)
  `;

  await execute(sql, [
    data.work_date,
    data.total_agents,
    data.present_agents,
    data.absent_agents,
    lateAgents,
    data.campaign_target_points,
    data.floor_capacity_points,
    gap,
    totalAchieved,
    version,
  ]);

  const record = await getFloorDailySnapshotForDate(data.work_date, version);
  if (!record) {
    throw new Error(`Failed to retrieve floor daily snapshot for date ${data.work_date}`);
  }
  return record;
}

/**
 * Retrieves the floor daily snapshot for a work date.
 */
export async function getFloorDailySnapshotForDate(
  workDateStr: string,
  snapshotVersion: number = 1
): Promise<FloorDailySnapshotRecord | null> {
  const sql = `
    SELECT * FROM floor_daily_snapshots
    WHERE work_date = ? AND snapshot_version = ?
    LIMIT 1
  `;

  const record = await queryOne<any>(sql, [workDateStr, snapshotVersion]);
  if (!record) return null;

  return {
    id: record.id.toString(),
    work_date: workDateStr,
    total_agents: record.total_agents,
    present_agents: record.present_agents,
    absent_agents: record.absent_agents,
    late_agents: record.late_agents,
    campaign_target_points: Number(record.campaign_target_points),
    floor_capacity_points: Number(record.floor_capacity_points),
    capacity_gap_points: Number(record.capacity_gap_points),
    total_achieved_points: Number(record.total_achieved_points),
    synced_at: String(record.synced_at),
    snapshot_version: record.snapshot_version,
  };
}

/**
 * Retrieves floor daily snapshots across a date range.
 */
export async function getFloorDailySnapshotsDateRange(
  startDateStr: string,
  endDateStr: string
): Promise<FloorDailySnapshotRecord[]> {
  const sql = `
    SELECT * FROM floor_daily_snapshots
    WHERE work_date >= ? AND work_date <= ?
    ORDER BY work_date DESC
  `;

  const rows = await query<any>(sql, [startDateStr, endDateStr]);

  return rows.map((r) => ({
    id: r.id.toString(),
    work_date: typeof r.work_date === "string" ? r.work_date.slice(0, 10) : new Date(r.work_date).toISOString().slice(0, 10),
    total_agents: r.total_agents,
    present_agents: r.present_agents,
    absent_agents: r.absent_agents,
    late_agents: r.late_agents,
    campaign_target_points: Number(r.campaign_target_points),
    floor_capacity_points: Number(r.floor_capacity_points),
    capacity_gap_points: Number(r.capacity_gap_points),
    total_achieved_points: Number(r.total_achieved_points),
    synced_at: String(r.synced_at),
    snapshot_version: r.snapshot_version,
  }));
}
