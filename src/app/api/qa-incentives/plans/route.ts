import { NextRequest, NextResponse } from "next/server";
import { getQaIncentivePlans, createQaIncentivePlan } from "@/lib/db/qa-incentive-repository";
import { getCrmQaPlans, createCrmQaPlan } from "@/lib/crm-api";
import { verifyAdminSession } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TierSchema = z.object({
  tier_order: z.number().int().min(1),
  tier_name: z.string().min(1),
  extra_leads: z.number().min(1),
  rate_per_lead: z.number().min(0),
});

const CreatePlanSchema = z.object({
  plan_name: z.string().min(2).max(150),
  qa_agent_id: z.number().nullable().optional(),
  qa_agent_name: z.string().default("All QA Members"),
  client_code: z.string().default("ALL"),
  campaign_id: z.number().nullable().optional(),
  campaign_name: z.string().default("All Campaigns"),
  frequency: z.enum(["DAILY", "MONTHLY"]).default("DAILY"),
  base_target_leads: z.number().min(1),
  base_incentive_amount: z.number().min(0),
  tiers: z.array(TierSchema).default([]),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

/**
 * GET /api/qa-incentives/plans
 */
export async function GET() {
  try {
    const [localPlans, crmPlansRes] = await Promise.all([
      getQaIncentivePlans(),
      getCrmQaPlans().catch(() => ({ success: false, data: [] })),
    ]);

    // If upstream CRM API returned plans, merge / map any plans from upstream
    const planMap = new Map<string, any>();
    localPlans.forEach((p) => planMap.set(String(p.id), p));

    if (crmPlansRes.success && Array.isArray(crmPlansRes.data)) {
      crmPlansRes.data.forEach((cp: any) => {
        const id = String(cp.id || cp.plan_id);
        if (id) {
          const mappedTiers = (cp.tiers || []).map((t: any, idx: number) => ({
            id: `t_${idx + 1}`,
            tier_order: idx + 1,
            tier_name: t.tier_label || `Tier ${idx + 1} (${t.min}-${t.max || "above"})`,
            extra_leads: t.extra_leads || (t.max ? Math.max(1, t.max - t.min + 1) : 10),
            rate_per_lead: Number(t.rate ?? t.rate_per_lead ?? 15),
          }));

          const crmPlan = {
            id,
            plan_name: cp.name || cp.plan_name || `CRM Plan #${id}`,
            qa_agent_id: Array.isArray(cp.qa_user_ids) && cp.qa_user_ids.length > 0 ? cp.qa_user_ids[0] : null,
            qa_agent_name: cp.qa_agent_name || (cp.qa_user_ids?.length ? `QA IDs [${cp.qa_user_ids.join(", ")}]` : "All QA Members"),
            client_code: cp.client_code || "ALL",
            campaign_id: Array.isArray(cp.campaign_ids) && cp.campaign_ids.length > 0 ? cp.campaign_ids[0] : null,
            campaign_name: cp.campaign_name || "All Campaigns",
            frequency: (cp.frequency || "daily").toUpperCase() === "MONTHLY" ? "MONTHLY" : "DAILY",
            base_target_leads: Number(cp.base_target ?? 50),
            base_incentive_amount: Number(cp.base_reward ?? 500),
            tiers: mappedTiers.length > 0 ? mappedTiers : (planMap.get(id)?.tiers || []),
            is_active: Boolean(cp.is_active ?? true),
            notes: cp.notes || "Synced from upstream CRM /api/v1/qa-incentives/plans.php",
            created_at: cp.created_at || new Date().toISOString(),
            updated_at: cp.updated_at || new Date().toISOString(),
          };

          planMap.set(id, crmPlan);
        }
      });
    }

    const mergedPlans = Array.from(planMap.values());

    return NextResponse.json({
      success: true,
      data: mergedPlans,
      total: mergedPlans.length,
      source: crmPlansRes.success ? "upstream-crm-and-local" : "local-database",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch QA plans: ${errorMsg}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/qa-incentives/plans
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = CreatePlanSchema.parse(body);

    const created = await createQaIncentivePlan({
      ...validated,
      qa_agent_id: validated.qa_agent_id ?? null,
      campaign_id: validated.campaign_id ?? null,
    });

    // Also sync to upstream CRM API /api/v1/qa-incentives/plans.php
    let accumulated = validated.base_target_leads;
    const upstreamTiers = validated.tiers.map((t) => {
      const min = accumulated + 1;
      const max = min + t.extra_leads - 1;
      accumulated = max;
      return { min, max, rate: t.rate_per_lead };
    });

    createCrmQaPlan({
      name: validated.plan_name,
      qa_user_ids: validated.qa_agent_id ? [validated.qa_agent_id] : [],
      client_code: validated.client_code,
      campaign_ids: validated.campaign_id ? [validated.campaign_id] : [],
      apply_all_campaigns: validated.campaign_id ? 0 : 1,
      frequency: validated.frequency.toLowerCase(),
      base_target: validated.base_target_leads,
      base_reward: validated.base_incentive_amount,
      tiers: upstreamTiers,
      is_active: validated.is_active ? 1 : 0,
    }).catch((err) => console.warn("[qa-plans] Upstream CRM plan sync skipped:", err.message));

    return NextResponse.json(
      {
        success: true,
        message: "QA incentive plan created successfully",
        data: created,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: err.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 }
      );
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to create plan: ${errorMsg}` },
      { status: 500 }
    );
  }
}

