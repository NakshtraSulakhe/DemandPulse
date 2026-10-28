import { prisma, serializeDbData } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface QaDailySnapshotRecord {
  id: string;
  crm_qa_agent_id: number;
  qa_agent_name_snapshot: string | null;
  work_date: string;
  total_audits: number;
  unique_leads_audited: number;
  qualified_leads: number;
  disqualified_leads: number;
  rework_leads: number;
  other_qa_status_counts_json: any;
  synced_at: string;
  snapshot_version: number;
}

export interface QaIntervalMetricRecord {
  id: string;
  crm_qa_agent_id: number;
  qa_agent_name_snapshot: string | null;
  work_date: string;
  interval_start_at: string;
  interval_end_at: string;
  audited_events: number;
  qualified_events: number;
  disqualified_events: number;
  unique_leads_qualified: number;
  synced_at: string;
}

export interface UpsertQaDailySnapshotInput {
  crm_qa_agent_id: number;
  qa_agent_name?: string | null;
  total_audits: number;
  unique_leads_audited?: number;
  qualified_leads: number;
  disqualified_leads?: number;
  rework_leads?: number;
  other_qa_status_counts_json?: any;
}

/**
 * Upserts QA daily analyst performance records into MySQL.
 */
export async function upsertQaDailySnapshots(
  workDateStr: string,
  analysts: UpsertQaDailySnapshotInput[],
  snapshotVersion: number = 1
): Promise<{ success: boolean; count: number }> {
  if (!analysts || analysts.length === 0) {
    return { success: true, count: 0 };
  }

  const workDate = new Date(workDateStr);

  await prisma.$transaction(async (tx) => {
    for (const a of analysts) {
      const crmQaAgentId = BigInt(a.crm_qa_agent_id);
      const uniqueAudits = a.unique_leads_audited ?? a.total_audits;

      await tx.qaDailySnapshot.upsert({
        where: {
          crmQaAgentId_workDate_snapshotVersion: {
            crmQaAgentId,
            workDate,
            snapshotVersion,
          },
        },
        update: {
          qaAgentNameSnapshot: a.qa_agent_name || null,
          totalAudits: a.total_audits,
          uniqueLeadsAudited: uniqueAudits,
          qualifiedLeads: a.qualified_leads,
          disqualifiedLeads: a.disqualified_leads || 0,
          reworkLeads: a.rework_leads || 0,
          otherQaStatusCountsJson: a.other_qa_status_counts_json ?? Prisma.DbNull,
          syncedAt: new Date(),
        },
        create: {
          crmQaAgentId,
          qaAgentNameSnapshot: a.qa_agent_name || null,
          workDate,
          totalAudits: a.total_audits,
          uniqueLeadsAudited: uniqueAudits,
          qualifiedLeads: a.qualified_leads,
          disqualifiedLeads: a.disqualified_leads || 0,
          reworkLeads: a.rework_leads || 0,
          otherQaStatusCountsJson: a.other_qa_status_counts_json ?? Prisma.DbNull,
          syncedAt: new Date(),
          snapshotVersion,
        },
      });
    }
  });

  return { success: true, count: analysts.length };
}

/**
 * Retrieves QA daily snapshots for a work date.
 */
export async function getQaDailySnapshotsForDate(
  workDateStr: string,
  snapshotVersion: number = 1
): Promise<QaDailySnapshotRecord[]> {
  const workDate = new Date(workDateStr);

  const rows = await prisma.qaDailySnapshot.findMany({
    where: {
      workDate,
      snapshotVersion,
    },
    orderBy: [{ qualifiedLeads: "desc" }, { totalAudits: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_qa_agent_id: Number(r.crmQaAgentId),
    qa_agent_name_snapshot: r.qaAgentNameSnapshot,
    work_date: workDateStr,
    total_audits: r.totalAudits,
    unique_leads_audited: r.uniqueLeadsAudited,
    qualified_leads: r.qualifiedLeads,
    disqualified_leads: r.disqualifiedLeads,
    rework_leads: r.reworkLeads,
    other_qa_status_counts_json: r.otherQaStatusCountsJson,
    synced_at: r.syncedAt.toISOString(),
    snapshot_version: r.snapshotVersion,
  }));
}

/**
 * Upserts 10-minute QA interval metrics across shift into MySQL.
 */
export async function upsertQaIntervalMetrics(
  workDateStr: string,
  intervals: Array<{
    crm_qa_agent_id: number;
    qa_agent_name?: string | null;
    interval_start_at: Date | string;
    interval_end_at: Date | string;
    audited_events: number;
    qualified_events: number;
    disqualified_events?: number;
    unique_leads_qualified?: number;
  }>
): Promise<{ success: boolean; count: number }> {
  if (!intervals || intervals.length === 0) {
    return { success: true, count: 0 };
  }

  const workDate = new Date(workDateStr);

  await prisma.$transaction(async (tx) => {
    for (const item of intervals) {
      const crmQaAgentId = BigInt(item.crm_qa_agent_id);
      const intervalStartAt = new Date(item.interval_start_at);
      const intervalEndAt = new Date(item.interval_end_at);
      const uniqueQualified = item.unique_leads_qualified ?? item.qualified_events;

      await tx.qaIntervalMetric.upsert({
        where: {
          crmQaAgentId_intervalStartAt: {
            crmQaAgentId,
            intervalStartAt,
          },
        },
        update: {
          qaAgentNameSnapshot: item.qa_agent_name || null,
          workDate,
          intervalEndAt,
          auditedEvents: item.audited_events,
          qualifiedEvents: item.qualified_events,
          disqualifiedEvents: item.disqualified_events || 0,
          uniqueLeadsQualified: uniqueQualified,
          syncedAt: new Date(),
        },
        create: {
          crmQaAgentId,
          qaAgentNameSnapshot: item.qa_agent_name || null,
          workDate,
          intervalStartAt,
          intervalEndAt,
          auditedEvents: item.audited_events,
          qualifiedEvents: item.qualified_events,
          disqualifiedEvents: item.disqualified_events || 0,
          uniqueLeadsQualified: uniqueQualified,
          syncedAt: new Date(),
        },
      });
    }
  });

  return { success: true, count: intervals.length };
}

/**
 * Retrieves QA interval metrics for a work date.
 */
export async function getQaIntervalMetricsForDate(
  workDateStr: string,
  analystId?: number
): Promise<QaIntervalMetricRecord[]> {
  const workDate = new Date(workDateStr);
  const where: Prisma.QaIntervalMetricWhereInput = { workDate };
  if (analystId) {
    where.crmQaAgentId = BigInt(analystId);
  }

  const rows = await prisma.qaIntervalMetric.findMany({
    where,
    orderBy: [{ intervalStartAt: "asc" }, { auditedEvents: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id.toString(),
    crm_qa_agent_id: Number(r.crmQaAgentId),
    qa_agent_name_snapshot: r.qaAgentNameSnapshot,
    work_date: workDateStr,
    interval_start_at: r.intervalStartAt.toISOString(),
    interval_end_at: r.intervalEndAt.toISOString(),
    audited_events: r.auditedEvents,
    qualified_events: r.qualifiedEvents,
    disqualified_events: r.disqualifiedEvents,
    unique_leads_qualified: r.uniqueLeadsQualified,
    synced_at: r.syncedAt.toISOString(),
  }));
}
