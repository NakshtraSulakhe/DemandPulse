import { NextRequest, NextResponse } from "next/server";
import { getCrmCampaignTargets, getCrmSlide3, getCrmQaAudits } from "@/lib/crm-api";
import { getQaDailySnapshotsForDate } from "@/lib/db/qa-analytics-repository";
import { getShiftBusinessDate } from "@/lib/shift/engine";
import { QaIncentiveMetaResponse, QaMemberMeta, ClientMeta, CampaignMeta } from "@/types/qa-incentives";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/qa-incentives/meta
 * Returns dynamically discovered QA team members, clients, and campaigns from live CRM endpoints.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || getShiftBusinessDate();

  try {
    const [qaAuditsRes, campaignsRes, slide3Res, dbSnapshots] = await Promise.all([
      getCrmQaAudits({ date, include_leads: 0 }).catch(() => ({ success: false, data: undefined })),
      getCrmCampaignTargets(date, "Live").catch(() => ({ success: false, data: null })),
      getCrmSlide3(date, 10).catch(() => ({ success: false, data: null })),
      getQaDailySnapshotsForDate(date).catch(() => []),
    ]);

    // 1. Discover QA team members from live CRM QA Audits API (/api/v1/slides/qa_audits.php)
    const qaMembersMap = new Map<number, QaMemberMeta>();

    if (qaAuditsRes.success && qaAuditsRes.data?.qa_analysts) {
      qaAuditsRes.data.qa_analysts.forEach((a: any) => {
        const id = Number(a.user_id || a.qa_id);
        const name = (a.qa_name || a.full_name || "").trim();
        if (id && name) {
          qaMembersMap.set(id, {
            user_id: id,
            full_name: name,
            role: a.job_title || a.role || a.department || "QA Analyst",
            avatar: a.avatar || null,
          });
        }
      });
    }

    // Also augment with live CRM QA heatmap reviewers if available
    if (slide3Res.success && slide3Res.data?.qa_heatmap) {
      slide3Res.data.qa_heatmap.forEach((analyst: any) => {
        const id = Number(analyst.user_id);
        const name = (analyst.full_name || "").trim();
        if (id && name && !name.toLowerCase().includes("sagar") && id !== 99) {
          if (!qaMembersMap.has(id)) {
            qaMembersMap.set(id, {
              user_id: id,
              full_name: name,
              role: "QA Analyst",
            });
          }
        }
      });
    }

    // Also augment from MySQL QA snapshots
    if (dbSnapshots && dbSnapshots.length > 0) {
      dbSnapshots.forEach((s) => {
        const id = Number(s.crm_qa_agent_id);
        const name = (s.qa_agent_name_snapshot || "").trim();
        if (id && name && !name.toLowerCase().includes("sagar") && id !== 99) {
          if (!qaMembersMap.has(id)) {
            qaMembersMap.set(id, {
              user_id: id,
              full_name: name,
              role: "QA Analyst",
            });
          }
        }
      });
    }

    // 2. Discover Campaigns & Clients dynamically from CRM
    const campaignsList: CampaignMeta[] = [];
    const clientCodeMap = new Map<string, { count: number; name?: string }>();

    // From Live CRM Campaign Targets
    if (campaignsRes.success && campaignsRes.data?.campaigns?.length) {
      campaignsRes.data.campaigns.forEach((c: any) => {
        const cId = Number(c.campaign_id);
        const cName = c.campaign_name || `Campaign #${cId}`;
        const clCode = (c.client_code || "GEN").trim();

        campaignsList.push({
          campaign_id: cId,
          campaign_name: cName,
          campaign_code: c.campaign_code,
          client_code: clCode,
        });

        if (!clientCodeMap.has(clCode)) {
          clientCodeMap.set(clCode, { count: 0, name: `${clCode} Client Group` });
        }
        clientCodeMap.get(clCode)!.count += 1;
      });
    }

    // Also augment campaigns & clients from QA audits breakdowns
    if (qaAuditsRes.success && qaAuditsRes.data?.qa_analysts) {
      qaAuditsRes.data.qa_analysts.forEach((analyst: any) => {
        if (Array.isArray(analyst.campaigns_breakdown)) {
          analyst.campaigns_breakdown.forEach((cb: any) => {
            const cbId = Number(cb.campaign_id);
            if (cbId && !campaignsList.some((c) => c.campaign_id === cbId)) {
              campaignsList.push({
                campaign_id: cbId,
                campaign_name: cb.campaign_name || `Campaign #${cbId}`,
                campaign_code: cb.campaign_code,
                client_code: cb.client_code || "GEN",
              });
            }
          });
        }
        if (Array.isArray(analyst.clients_breakdown)) {
          analyst.clients_breakdown.forEach((clb: any) => {
            const code = (clb.client_code || "").trim();
            if (code && !clientCodeMap.has(code)) {
              clientCodeMap.set(code, {
                count: 1,
                name: clb.client_name || `${code} Client Group`,
              });
            }
          });
        }
      });
    }

    const clientsList: ClientMeta[] = Array.from(clientCodeMap.entries()).map(([code, meta]) => ({
      client_code: code,
      client_name: meta.name || code,
      campaign_count: meta.count,
    }));

    const response: QaIncentiveMetaResponse = {
      qa_members: Array.from(qaMembersMap.values()),
      clients: clientsList,
      campaigns: campaignsList,
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to load QA metadata: ${errorMsg}` },
      { status: 500 }
    );
  }
}

