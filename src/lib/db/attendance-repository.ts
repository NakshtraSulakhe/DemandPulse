import { prisma, serializeDbData } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface AttendanceDailySnapshotRecord {
  id: string;
  work_date: string;
  total_agents: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
  other_status_counts_json: any;
  synced_at: string;
  snapshot_version: number;
}

export interface AgentAttendanceSnapshotRecord {
  id: string;
  crm_agent_id: number;
  agent_name_snapshot: string | null;
  work_date: string;
  attendance_status: string;
  punch_in_at: string | null;
  punch_out_at: string | null;
  late_minutes: number;
  effective_work_minutes: number;
  synced_at: string;
  snapshot_version: number;
}

export interface UpsertAttendanceDailyInput {
  work_date: string;
  total_agents: number;
  present_count: number;
  absent_count: number;
  late_count?: number;
  leave_count?: number;
  other_status_counts_json?: any;
  snapshot_version?: number;
}

export interface UpsertAgentAttendanceInput {
  crm_agent_id: number;
  agent_name?: string | null;
  attendance_status: string;
  punch_in_at?: Date | string | null;
  punch_out_at?: Date | string | null;
  late_minutes?: number;
  effective_work_minutes?: number;
}

/**
 * Upserts the floor daily attendance summary snapshot.
 */
export async function upsertAttendanceDailySnapshot(
  data: UpsertAttendanceDailyInput
): Promise<AttendanceDailySnapshotRecord> {
  const workDate = new Date(data.work_date);
  const version = data.snapshot_version ?? 1;

  const record = await prisma.attendanceDailySnapshot.upsert({
    where: {
      workDate_snapshotVersion: {
        workDate,
        snapshotVersion: version,
      },
    },
    update: {
      totalAgents: data.total_agents,
      presentCount: data.present_count,
      absentCount: data.absent_count,
      lateCount: data.late_count || 0,
      leaveCount: data.leave_count || 0,
      otherStatusCountsJson: data.other_status_counts_json ?? Prisma.DbNull,
      syncedAt: new Date(),
    },
    create: {
      workDate,
      totalAgents: data.total_agents,
      presentCount: data.present_count,
      absentCount: data.absent_count,
      lateCount: data.late_count || 0,
      leaveCount: data.leave_count || 0,
      otherStatusCountsJson: data.other_status_counts_json ?? Prisma.DbNull,
      syncedAt: new Date(),
      snapshotVersion: version,
    },
  });

  return {
    id: record.id.toString(),
    work_date: data.work_date,
    total_agents: record.totalAgents,
    present_count: record.presentCount,
    absent_count: record.absentCount,
    late_count: record.lateCount,
    leave_count: record.leaveCount,
    other_status_counts_json: record.otherStatusCountsJson,
    synced_at: record.syncedAt.toISOString(),
    snapshot_version: record.snapshotVersion,
  };
}

/**
 * Upserts individual agent attendance snapshots for a work date.
 */
export async function upsertAgentAttendanceSnapshots(
  workDateStr: string,
  records: UpsertAgentAttendanceInput[],
  snapshotVersion: number = 1
): Promise<{ success: boolean; count: number }> {
  if (!records || records.length === 0) {
    return { success: true, count: 0 };
  }

  const workDate = new Date(workDateStr);

  await prisma.$transaction(async (tx) => {
    for (const a of records) {
      const crmAgentId = BigInt(a.crm_agent_id);
      const punchInAt = a.punch_in_at ? new Date(a.punch_in_at) : null;
      const punchOutAt = a.punch_out_at ? new Date(a.punch_out_at) : null;

      await tx.agentAttendanceSnapshot.upsert({
        where: {
          crmAgentId_workDate_snapshotVersion: {
            crmAgentId,
            workDate,
            snapshotVersion,
          },
        },
        update: {
          agentNameSnapshot: a.agent_name || null,
          attendanceStatus: a.attendance_status,
          punchInAt,
          punchOutAt,
          lateMinutes: a.late_minutes || 0,
          effectiveWorkMinutes: a.effective_work_minutes || 465,
          syncedAt: new Date(),
        },
        create: {
          crmAgentId,
          agentNameSnapshot: a.agent_name || null,
          workDate,
          attendanceStatus: a.attendance_status,
          punchInAt,
          punchOutAt,
          lateMinutes: a.late_minutes || 0,
          effectiveWorkMinutes: a.effective_work_minutes || 465,
          syncedAt: new Date(),
          snapshotVersion,
        },
      });
    }
  });

  return { success: true, count: records.length };
}

/**
 * Retrieves the daily attendance summary for a work date.
 */
export async function getAttendanceDailySnapshotForDate(
  workDateStr: string,
  snapshotVersion: number = 1
): Promise<AttendanceDailySnapshotRecord | null> {
  const workDate = new Date(workDateStr);
  const record = await prisma.attendanceDailySnapshot.findUnique({
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
    present_count: record.presentCount,
    absent_count: record.absentCount,
    late_count: record.lateCount,
    leave_count: record.leaveCount,
    other_status_counts_json: record.otherStatusCountsJson,
    synced_at: record.syncedAt.toISOString(),
    snapshot_version: record.snapshotVersion,
  };
}

/**
 * Retrieves individual agent attendance snapshots for a work date.
 */
export async function getAgentAttendanceSnapshotsForDate(
  workDateStr: string,
  snapshotVersion: number = 1
): Promise<AgentAttendanceSnapshotRecord[]> {
  const workDate = new Date(workDateStr);

  const rows = await prisma.agentAttendanceSnapshot.findMany({
    where: {
      workDate,
      snapshotVersion,
    },
    orderBy: [{ lateMinutes: "desc" }, { attendanceStatus: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_agent_id: Number(r.crmAgentId),
    agent_name_snapshot: r.agentNameSnapshot,
    work_date: workDateStr,
    attendance_status: r.attendanceStatus,
    punch_in_at: r.punchInAt ? r.punchInAt.toISOString() : null,
    punch_out_at: r.punchOutAt ? r.punchOutAt.toISOString() : null,
    late_minutes: r.lateMinutes,
    effective_work_minutes: r.effectiveWorkMinutes,
    synced_at: r.syncedAt.toISOString(),
    snapshot_version: r.snapshotVersion,
  }));
}
