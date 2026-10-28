import { prisma, serializeDbData } from "@/lib/db";
import { Prisma } from "@prisma/client";

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
  const workDate = new Date(data.work_date);
  const version = data.snapshot_version ?? 1;
  const gap = Math.round((data.floor_capacity_points - data.campaign_target_points) * 1000) / 1000;

  const record = await prisma.floorDailySnapshot.upsert({
    where: {
      workDate_snapshotVersion: {
        workDate,
        snapshotVersion: version,
      },
    },
    update: {
      totalAgents: data.total_agents,
      presentAgents: data.present_agents,
      absentAgents: data.absent_agents,
      lateAgents: data.late_agents || 0,
      campaignTargetPoints: new Prisma.Decimal(data.campaign_target_points),
      floorCapacityPoints: new Prisma.Decimal(data.floor_capacity_points),
      capacityGapPoints: new Prisma.Decimal(gap),
      totalAchievedPoints: new Prisma.Decimal(data.total_achieved_points || 0),
      syncedAt: new Date(),
    },
    create: {
      workDate,
      totalAgents: data.total_agents,
      presentAgents: data.present_agents,
      absentAgents: data.absent_agents,
      lateAgents: data.late_agents || 0,
      campaignTargetPoints: new Prisma.Decimal(data.campaign_target_points),
      floorCapacityPoints: new Prisma.Decimal(data.floor_capacity_points),
      capacityGapPoints: new Prisma.Decimal(gap),
      totalAchievedPoints: new Prisma.Decimal(data.total_achieved_points || 0),
      syncedAt: new Date(),
      snapshotVersion: version,
    },
  });

  return {
    id: record.id.toString(),
    work_date: data.work_date,
    total_agents: record.totalAgents,
    present_agents: record.presentAgents,
    absent_agents: record.absentAgents,
    late_agents: record.lateAgents,
    campaign_target_points: Number(record.campaignTargetPoints),
    floor_capacity_points: Number(record.floorCapacityPoints),
    capacity_gap_points: Number(record.capacityGapPoints),
    total_achieved_points: Number(record.totalAchievedPoints),
    synced_at: record.syncedAt.toISOString(),
    snapshot_version: record.snapshotVersion,
  };
}

/**
 * Retrieves the floor daily snapshot for a work date.
 */
export async function getFloorDailySnapshotForDate(
  workDateStr: string,
  snapshotVersion: number = 1
): Promise<FloorDailySnapshotRecord | null> {
  const workDate = new Date(workDateStr);
  const record = await prisma.floorDailySnapshot.findUnique({
    where: {
      workDate_snapshotVersion: {
        workDate,
        snapshotVersion,
      },
    },
  });

  if (!record) return null;

  return {
    id: record.id.toString(),
    work_date: workDateStr,
    total_agents: record.totalAgents,
    present_agents: record.presentAgents,
    absent_agents: record.absentAgents,
    late_agents: record.lateAgents,
    campaign_target_points: Number(record.campaignTargetPoints),
    floor_capacity_points: Number(record.floorCapacityPoints),
    capacity_gap_points: Number(record.capacityGapPoints),
    total_achieved_points: Number(record.totalAchievedPoints),
    synced_at: record.syncedAt.toISOString(),
    snapshot_version: record.snapshotVersion,
  };
}

/**
 * Retrieves floor daily snapshots across a date range.
 */
export async function getFloorDailySnapshotsDateRange(
  startDateStr: string,
  endDateStr: string
): Promise<FloorDailySnapshotRecord[]> {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const rows = await prisma.floorDailySnapshot.findMany({
    where: {
      workDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { workDate: "desc" },
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    work_date: r.workDate.toISOString().slice(0, 10),
    total_agents: r.totalAgents,
    present_agents: r.presentAgents,
    absent_agents: r.absentAgents,
    late_agents: r.lateAgents,
    campaign_target_points: Number(r.campaignTargetPoints),
    floor_capacity_points: Number(r.floorCapacityPoints),
    capacity_gap_points: Number(r.capacityGapPoints),
    total_achieved_points: Number(r.totalAchievedPoints),
    synced_at: r.syncedAt.toISOString(),
    snapshot_version: r.snapshotVersion,
  }));
}
