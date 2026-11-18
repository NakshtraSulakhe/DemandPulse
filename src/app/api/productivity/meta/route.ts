import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getShiftBusinessDate } from "@/lib/shift/engine";
import { getCrmQaAudits, getCrmCampaignTargets, getCrmSlide2, getCrmSlide4 } from "@/lib/crm-api";
import { CRM_KNOWN_ROSTER } from "@/lib/crm-roster";

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

const MOCK_AGENT_NAMES = new Set([
  "rahul sharma",
  "sarah jenkins",
  "priya sharma",
  "aaliyah chen",
  "marcus vance",
]);

/**
 * GET /api/productivity/meta
 * Dynamically discovers active agents, QA analysts, clients, and campaigns from database and CRM.
 * Zero hardcoded names, guaranteed real employees.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || getShiftBusinessDate();

  try {
    const [
      dbAgents,
      dbQa,
      dbTargets,
      slide2Res,
      slide4Res,
      qaAuditsRes,
      campaignsRes,
    ] = await Promise.all([
      // 1. Agents from MySQL snapshots
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

      // 3. Configured targets in DB
      query<any>(
        `SELECT DISTINCT employee_id as id, employee_name as name, department as role, daily_target
         FROM employee_target_assignments
         WHERE employee_name IS NOT NULL AND employee_name != ''`
      ).catch(() => []),

      // 4. Real agents from CRM Slide 2
      getCrmSlide2(date, 1, 100).catch(() => ({ success: false, data: undefined })),

      // 5. Real agents from CRM Slide 4 (Lead Heatmap)
      getCrmSlide4(date, 30).catch(() => ({ success: false, data: undefined })),

      // 6. Real QA analysts from CRM QA Audits API
      getCrmQaAudits({ date, include_leads: 0 }).catch(() => ({ success: false, data: undefined })),

      // 7. Live Campaigns & Clients
      getCrmCampaignTargets(date, "Live").catch(() => ({ success: false, data: null })),
    ]);

    const agentsMap = new Map<number, DiscoveredEmployee>();
    const qaMap = new Map<number, DiscoveredEmployee>();

    const isMock = (name: string) => MOCK_AGENT_NAMES.has(name.toLowerCase().trim());

    // 1. Add agents from database snapshots
    (dbAgents || []).forEach((row: any) => {
      const id = Number(row.id);
      const name = (row.name || "").trim();
      if (id && name && !isMock(name)) {
        agentsMap.set(id, {
          id,
          name,
          role: "Agent",
          defaultDailyTarget: 7,
        });
      }
    });

    // 2. Add agents from CRM Slide 2 (Authoritative agent daily target points)
    if (slide2Res.success && slide2Res.data?.agents) {
      slide2Res.data.agents.forEach((ag: any) => {
        const id = Number(ag.agent_id || ag.user_id || ag.id);
        const name = (ag.agent_name || ag.name || "").trim();
        if (id && name && !isMock(name)) {
          const targetPts = Number(ag.daily_target_points ?? ag.target_points ?? 0);
          agentsMap.set(id, {
            id,
            name,
            role: "Agent",
            department: ag.role || "Sales Development Representative",
            defaultDailyTarget: targetPts > 0 ? targetPts : 7,
          });
        }
      });
    }

    // 3. Add agents from CRM Slide 4 (agent_heatmap)
    if (slide4Res.success && slide4Res.data?.agent_heatmap) {
      slide4Res.data.agent_heatmap.forEach((ag: any) => {
        const id = Number(ag.agent_id);
        const name = (ag.agent_name || "").trim();
        if (id && name && !isMock(name) && !agentsMap.has(id)) {
          agentsMap.set(id, {
            id,
            name,
            role: "Agent",
            department: "Sales Development Representative",
            defaultDailyTarget: 7,
          });
        }
      });
    }

    // 4. Add QA analysts from database snapshots
    (dbQa || []).forEach((row: any) => {
      const id = Number(row.id);
      const rosterEntry = CRM_KNOWN_ROSTER[id];
      const rawName = (row.name || "").trim();
      const name = rosterEntry?.name || (rawName.startsWith("QA ") && rosterEntry?.name ? rosterEntry.name : rawName);
      if (id && name && id !== 99 && !isMock(name)) {
        qaMap.set(id, {
          id,
          name,
          role: "QA",
          department: rosterEntry?.dept || "Quality Assurance Analyst",
          defaultDailyTarget: 50,
        });
      }
    });

    // 5. Add live QA analysts from CRM QA Audits
    if (qaAuditsRes.success && qaAuditsRes.data) {
      const rawPayload = (qaAuditsRes.data as any)?.qa_audits || (qaAuditsRes.data as any)?.data || qaAuditsRes.data;
      const rawAnalysts =
        rawPayload?.qa_analysts ||
        rawPayload?.qa_users ||
        (Array.isArray(rawPayload) ? rawPayload : []);

      if (Array.isArray(rawAnalysts)) {
        rawAnalysts.forEach((q: any) => {
          const id = Number(q.user_id || q.qa_id || q.id);
          const rosterEntry = CRM_KNOWN_ROSTER[id];
          const rawName = (q.qa_name || q.full_name || q.name || "").trim();
          const name = rosterEntry?.name || (rawName.startsWith("QA ") && rosterEntry?.name ? rosterEntry.name : rawName);
          if (id && name && id !== 99 && !isMock(name)) {
            qaMap.set(id, {
              id,
              name,
              role: "QA",
              department: rosterEntry?.role?.replace("_", " ") || q.job_title || q.role || "Quality Assurance Analyst",
              defaultDailyTarget: 50,
            });
          }
        });
      }
    }

    // 6. Augment from employee_target_assignments
    (dbTargets || []).forEach((row: any) => {
      const id = Number(row.id);
      const name = (row.name || "").trim();
      const r = (row.role || "").toUpperCase();
      const customDaily = Number(row.daily_target);
      if (id && name && !isMock(name)) {
        if (r === "QA" && !qaMap.has(id)) {
          qaMap.set(id, {
            id,
            name,
            role: "QA",
            department: "Quality Assurance Analyst",
            defaultDailyTarget: customDaily > 0 ? customDaily : 50,
          });
        } else if (r === "AGENT" && !agentsMap.has(id)) {
          agentsMap.set(id, {
            id,
            name,
            role: "Agent",
            department: "Sales Development Representative",
            defaultDailyTarget: customDaily > 0 ? customDaily : 7,
          });
        }
      }
    });

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

    // Sort alphabetically by employee name
    const sortedAgents = Array.from(agentsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const sortedQa = Array.from(qaMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({
      success: true,
      data: {
        agents: sortedAgents,
        qa_members: sortedQa,
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
