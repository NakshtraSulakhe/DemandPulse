import { prisma, serializeDbData } from "@/lib/db";
import { getCrmConfig } from "@/lib/crm-config";

export interface PublishResult {
  success: boolean;
  status: "published" | "awaiting_crm_integration" | "failed";
  policyId: string;
  policyCode: string;
  version: number;
  crmReference?: string;
  message: string;
  requiredCrmContract?: {
    endpoint: string;
    method: string;
    description: string;
    suggestedPayload: any;
    expectedResponse: any;
  };
}

/**
 * Publishes an approved incentive policy to the upstream DemandFlow Bridge CRM.
 * If the CRM does not currently provide an incentive configuration publishing endpoint,
 * safely flags the policy as `awaiting_crm_integration` and logs the required additive contract.
 */
export async function publishPolicyToCrm(
  policyId: bigint | number | string,
  actorId: bigint = BigInt(1)
): Promise<PublishResult> {
  const numericId = BigInt(policyId);
  const policy = await prisma.incentivePolicy.findUnique({
    where: { id: numericId },
    include: {
      rules: true,
      slabs: { orderBy: { slabOrder: "asc" } },
      assignments: true,
    },
  });

  if (!policy) {
    throw new Error(`Policy not found with id ${policyId}`);
  }

  if (policy.status !== "approved" && policy.status !== "awaiting_crm_integration") {
    throw new Error(
      `Cannot publish policy with status '${policy.status}'. Only policies in 'approved' or 'awaiting_crm_integration' status can be published.`
    );
  }

  const config = await getCrmConfig();
  const crmBase = (process.env.CRM_INCENTIVES_API_URL || `${config.crmApiBaseUrl}/incentives`).replace(/\/+$/, "");
  const publishEndpoint = `${crmBase}/publish_policy.php`;

  // Payload contract prepared for CRM
  const payload = {
    policy_code: policy.policyCode,
    policy_name: policy.policyName,
    version: policy.version,
    currency: policy.currency,
    valid_from: policy.validFrom.toISOString().slice(0, 10),
    valid_to: policy.validTo ? policy.validTo.toISOString().slice(0, 10) : null,
    rules: policy.rules
      ? {
          minimum_target_pct: Number(policy.rules.minimumTargetPct),
          base_incentive_amount: Number(policy.rules.baseIncentiveAmount),
          attendance_required: policy.rules.attendanceRequired,
          qa_escalation_action: policy.rules.qaEscalationAction,
          penalty_amount: Number(policy.rules.penaltyAmount),
          maximum_daily_incentive: policy.rules.maximumDailyIncentive
            ? Number(policy.rules.maximumDailyIncentive)
            : null,
          rounding_mode: policy.rules.roundingMode,
        }
      : null,
    slabs: policy.slabs.map((s) => ({
      slab_order: s.slabOrder,
      minimum_completion_pct: Number(s.minimumCompletionPct),
      maximum_completion_pct: s.maximumCompletionPct ? Number(s.maximumCompletionPct) : null,
      amount_per_extra_point: Number(s.amountPerExtraPoint),
    })),
    published_by: actorId.toString(),
  };

  const requiredContract = {
    endpoint: "POST /api/v1/incentives/publish_policy.php",
    method: "POST",
    description:
      "Authoritative CRM endpoint required to register and activate Next.js Slides-configured incentive policy rules and tiered slabs into the PHP incentive calculation engine.",
    suggestedPayload: payload,
    expectedResponse: {
      success: true,
      crm_policy_reference: "CRM-POL-2026-XXXX",
      version_applied: policy.version,
      activated_at: new Date().toISOString(),
    },
  };

  const startTime = Date.now();
  let httpStatus: number | null = null;
  let crmResponseJson: any = null;

  try {
    const token = config.crmApiToken || process.env.CRM_API_TOKEN || "df_admin_secret_token_2026";
    const res = await fetch(`${publishEndpoint}?token=${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    httpStatus = res.status;
    crmResponseJson = await res.json().catch(() => null);

    const durationMs = Date.now() - startTime;

    // Log the integration attempt
    await prisma.slideIntegrationLog.create({
      data: {
        service: "CRM_INCENTIVES_ENGINE",
        endpointName: "publish_policy.php",
        requestId: `pub-${policy.policyCode}-v${policy.version}-${Date.now()}`,
        httpStatus,
        durationMs,
        resultStatus: res.ok && crmResponseJson?.success ? "SUCCESS" : res.status === 404 ? "NOT_IMPLEMENTED" : "ERROR",
      },
    });

    if (res.ok && crmResponseJson?.success) {
      // CRM confirmed acceptance! Activate policy
      await prisma.$transaction(async (tx) => {
        await tx.incentivePolicy.update({
          where: { id: numericId },
          data: { status: "active" },
        });

        await tx.slideAuditLog.create({
          data: {
            actorId,
            action: "POLICY_PUBLISHED_TO_CRM",
            resourceType: "incentive_policy",
            resourceId: numericId.toString(),
            detailsJson: {
              policyCode: policy.policyCode,
              version: policy.version,
              crmReference: crmResponseJson.crm_policy_reference,
            },
          },
        });
      });

      return {
        success: true,
        status: "published",
        policyId: policy.id.toString(),
        policyCode: policy.policyCode,
        version: policy.version,
        crmReference: crmResponseJson.crm_policy_reference,
        message: `Policy ${policy.policyCode} v${policy.version} successfully published and activated in DemandFlow Bridge CRM!`,
      };
    }
  } catch (err) {
    // Network or fetch error
  }

  // CRM does not currently have publish_policy.php implemented.
  // Transition safely to 'awaiting_crm_integration' and do NOT falsely activate!
  await prisma.$transaction(async (tx) => {
    await tx.incentivePolicy.update({
      where: { id: numericId },
      data: { status: "awaiting_crm_integration" },
    });

    await tx.slideAuditLog.create({
      data: {
        actorId,
        action: "POLICY_AWAITING_CRM_INTEGRATION",
        resourceType: "incentive_policy",
        resourceId: numericId.toString(),
        detailsJson: {
          policyCode: policy.policyCode,
          version: policy.version,
          reason: "CRM configuration publishing API endpoint is not yet deployed upstream",
          requiredEndpoint: "POST /api/v1/incentives/publish_policy.php",
        },
      },
    });
  });

  return {
    success: false,
    status: "awaiting_crm_integration",
    policyId: policy.id.toString(),
    policyCode: policy.policyCode,
    version: policy.version,
    message: `Policy approved locally. CRM publishing endpoint (POST /api/v1/incentives/publish_policy.php) returned HTTP ${httpStatus || "404/Connection Error"}. In accordance with data integrity rules, the policy is held safely in 'awaiting_crm_integration' until upstream PHP CRM provides the publication handler.`,
    requiredCrmContract: requiredContract,
  };
}
