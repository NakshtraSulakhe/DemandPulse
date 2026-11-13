import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getShiftBusinessDate } from "@/lib/shift/engine";
import { fetchIncentivePreview } from "@/lib/incentives/api";
import { getCrmQaAudits, getCrmCampaignTargets } from "@/lib/crm-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface DiscoveredEmployee {
  id: number;
  name: string;
  role: "Agent" | "QA";
  department?: string;
  email?: string;
  defaultDailyTarget: number;
}

/**
 * GET /api/productivity/meta
 * Dynamically discovers active agents, QA analysts, clients, and campaigns from database and CRM.
 * Zero hardcoded names.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || getShiftBusinessDate();

  try {
    const [dbAgents, dbQa, incentiveRes, qaAuditsRes, campaignsRes] = await Promise.all([
      // 1. Agents from MySQL snapshots & app users
      query<any>(
        `SELECT DISTINCT crm_agent_id as id, agent_name_snapshot as name
         FROM agent_daily_snapshots
         WHERE agent_name_snapshot IS NOT NULL AND agent_name_snapshot != ''
         ORDER BY id ASC`
      ).catch(() => []),

      // 2. QA analysts from MySQL snapshots
      query<any>(
        `SELECT DISTINCT crm_qa_agent_id as id, qa_agent_name_snapshot as name
         FROM qa_daily_snapshots
         WHERE qa_agent_name_snapshot IS NOT NULL AND qa_agent_name_snapshot != ''
         ORDER BY id ASC`
      ).catch(() => []),

      // 3. Live agents from CRM Incentives Preview
      fetchIncentivePreview(date).catch(() => ({ success: false, data: undefined })),

      // 4. Live QA analysts from CRM QA Audits API
      getCrmQaAudits({ date, include_leads: 0 }).catch(() => ({ success: false, data: undefined })),

      // 5. Live Campaigns & Clients
      getCrmCampaignTargets(date, "Live").catch(() => ({ success: false, data: null })),
    ]);

    const agentsMap = new Map<number, DiscoveredEmployee>();
    const qaMap = new Map<number, DiscoveredEmployee>();

    // Add agents from database snapshots
    (dbAgents || []).forEach((row: any) => {
      const id = Number(row.id);
      const name = (row.name || "").trim();
      if (id && name) {
        agentsMap.set(id, {
          id,
          name,
          role: "Agent",
          defaultDailyTarget: 50,
        });
      }
    });

    // Augment with agents from CRM live incentive preview
    if (incentiveRes.success && incentiveRes.data?.agents) {
      incentiveRes.data.agents.forEach((a) => {
        const id = Number(a.agent_id);
        const name = (a.agent_name || "").trim();
        if (id && name) {
          agentsMap.set(id, {
            id,
            name,
            role: "Agent",
            department: a.role,
            defaultDailyTarget: a.target_points > 0 ? a.target_points : 50,
          });
        }
      });
    }

    // Add QA analysts from database snapshots
    (dbQa || []).forEach((row: any) => {
      const id = Number(row.id);
      const name = (row.name || "").trim();
      if (id && name && id !== 99) {
        qaMap.set(id, {
          id,
          name,
          role: "QA",
          defaultDailyTarget: 50,
        });
      }
    });

    // Augment with live QA analysts from CRM
    if (qaAuditsRes.success && qaAuditsRes.data?.qa_analysts) {
      qaAuditsRes.data.qa_analysts.forEach((q: any) => {
        const id = Number(q.user_id || q.qa_id || q.id);
        const name = (q.qa_name || q.full_name || "").trim();
        if (id && name && id !== 99) {
          qaMap.set(id, {
            id,
            name,
            role: "QA",
            department: q.job_title || q.role || "QA Analyst",
            defaultDailyTarget: 50,
          });
        }
      });
    }

    // Dynamic Campaigns & Clients
    const campaigns: Array<{ id: number; name: string; code?: string; clientCode: string }> = [];
    const clientCodes = new Set<string>();

    if (campaignsRes.success && campaignsRes.data?.campaigns) {
      campaignsRes.data.campaigns.forEach((c) => {
        const id = Number(c.campaign_id);
        const name = c.campaign_name || `Campaign #${id}`;
        const clientCode = (c.client_code || "ALL").trim();
        campaigns.push({
          id,
          name,
          code: c.campaign_code,
          clientCode,
        });
        if (clientCode) clientCodes.add(clientCode);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        agents: Array.from(agentsMap.values()),
        qa_members: Array.from(qaMap.values()),
        campaigns,
        clients: Array.from(clientCodes).sort(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to discover employee metadata: ${msg}` },
      { status: 500 }
    );
  }
}

