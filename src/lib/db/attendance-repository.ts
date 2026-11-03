import { query, queryOne, execute, withTransaction } from "@/lib/db";

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
  const version = data.snapshot_version ?? 1;
  const jsonStatus = data.other_status_counts_json ? JSON.stringify(data.other_status_counts_json) : null;

  const sql = `
    INSERT INTO attendance_daily_snapshots (
      work_date, total_agents, present_count, absent_count, late_count, leave_count,
      other_status_counts_json, synced_at, snapshot_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(6), ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      total_agents = VALUES(total_agents),
      present_count = VALUES(present_count),
      absent_count = VALUES(absent_count),
      late_count = VALUES(late_count),
      leave_count = VALUES(leave_count),
      other_status_counts_json = VALUES(other_status_counts_json),
      synced_at = NOW(6),
      updated_at = NOW(6)
  `;

  await execute(sql, [
    data.work_date,
    data.total_agents,
    data.present_count,
    data.absent_count,
    data.late_count || 0,
    data.leave_count || 0,
    jsonStatus,
    version,
  ]);

  const record = await getAttendanceDailySnapshotForDate(data.work_date, version);
  if (!record) {
    throw new Error(`Failed to retrieve attendance daily snapshot for date ${data.work_date}`);
  }
  return record;
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

  const sql = `
    INSERT INTO agent_attendance_snapshots (
      crm_agent_id, agent_name_snapshot, work_date, attendance_status, punch_in_at, punch_out_at,
      late_minutes, effective_work_minutes, synced_at, snapshot_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6), ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      agent_name_snapshot = VALUES(agent_name_snapshot),
      attendance_status = VALUES(attendance_status),
      punch_in_at = VALUES(punch_in_at),
      punch_out_at = VALUES(punch_out_at),
      late_minutes = VALUES(late_minutes),
      effective_work_minutes = VALUES(effective_work_minutes),
      synced_at = NOW(6),
      updated_at = NOW(6)
  `;

  await withTransaction(async (conn) => {
    for (const a of records) {
      const crmAgentId = Number(a.crm_agent_id);
      const punchInAt = a.punch_in_at
        ? new Date(a.punch_in_at).toISOString().slice(0, 19).replace("T", " ")
        : null;
      const punchOutAt = a.punch_out_at
        ? new Date(a.punch_out_at).toISOString().slice(0, 19).replace("T", " ")
        : null;

      await conn.execute(sql, [
        crmAgentId,
        a.agent_name || null,
        workDateStr,
        a.attendance_status,
        punchInAt,
        punchOutAt,
        a.late_minutes || 0,
        a.effective_work_minutes || 465,
        snapshotVersion,
      ]);
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
  const sql = `
    SELECT * FROM attendance_daily_snapshots
    WHERE work_date = ? AND snapshot_version = ?
    LIMIT 1
  `;

  const record = await queryOne<any>(sql, [workDateStr, snapshotVersion]);
  if (!record) return null;

  return {
    id: record.id.toString(),
    work_date: workDateStr,
    total_agents: record.total_agents,
    present_count: record.present_count,
    absent_count: record.absent_count,
    late_count: record.late_count,
    leave_count: record.leave_count,
    other_status_counts_json: typeof record.other_status_counts_json === "string"
      ? JSON.parse(record.other_status_counts_json)
      : record.other_status_counts_json,
    synced_at: String(record.synced_at),
    snapshot_version: record.snapshot_version,
  };
}

/**
 * Retrieves individual agent attendance snapshots for a work date.
 */
export async function getAgentAttendanceSnapshotsForDate(
  workDateStr: string,
  snapshotVersion: number = 1
): Promise<AgentAttendanceSnapshotRecord[]> {
  const sql = `
    SELECT * FROM agent_attendance_snapshots
    WHERE work_date = ? AND snapshot_version = ?
    ORDER BY late_minutes DESC, attendance_status ASC
  `;

  const rows = await query<any>(sql, [workDateStr, snapshotVersion]);

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_agent_id: Number(r.crm_agent_id),
    agent_name_snapshot: r.agent_name_snapshot,
    work_date: workDateStr,
    attendance_status: r.attendance_status,
    punch_in_at: r.punch_in_at ? String(r.punch_in_at) : null,
    punch_out_at: r.punch_out_at ? String(r.punch_out_at) : null,
    late_minutes: r.late_minutes,
    effective_work_minutes: r.effective_work_minutes,
    synced_at: String(r.synced_at),
    snapshot_version: r.snapshot_version,
  }));
}
