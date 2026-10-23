import { prisma, serializeDbData } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// Zod validation schemas
export const SlabInputSchema = z.object({
  id: z.union([z.string(), z.number(), z.bigint()]).optional(),
  slabOrder: z.number().int().min(1),
  minimumCompletionPct: z.number().min(0),
  maximumCompletionPct: z.number().min(0).nullable().optional(),
  amountPerExtraPoint: z.number().min(0),
});

export const PolicyRulesInputSchema = z.object({
  minimumTargetPct: z.number().min(0).default(100),
  baseIncentiveAmount: z.number().min(0).default(500),
  attendanceRequired: z.boolean().default(true),
  qaEscalationAction: z.enum(["zero_out", "disqualify", "penalty", "none"]).default("disqualify"),
  penaltyAmount: z.number().min(0).default(0),
  maximumDailyIncentive: z.number().min(0).nullable().optional().default(5000),
  roundingMode: z.enum(["floor", "round", "ceil", "none"]).default("floor"),
});

export const CreatePolicyInputSchema = z.object({
  policyCode: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[A-Z0-9_-]+$/, "Policy code must be alphanumeric with uppercase letters, underscores or dashes"),
  policyName: z.string().min(3).max(150),
  currency: z.string().length(3).default("INR"),
  validFrom: z.string().or(z.date()),
  validTo: z.string().or(z.date()).nullable().optional(),
  rules: PolicyRulesInputSchema,
  slabs: z.array(SlabInputSchema).default([]),
});

export const UpdatePolicyInputSchema = z.object({
  policyName: z.string().min(3).max(150).optional(),
  currency: z.string().length(3).optional(),
  validFrom: z.string().or(z.date()).optional(),
  validTo: z.string().or(z.date()).nullable().optional(),
  rules: PolicyRulesInputSchema.optional(),
  slabs: z.array(SlabInputSchema).optional(),
});

export const PolicyAssignmentInputSchema = z.object({
  policyId: z.union([z.string(), z.number(), z.bigint()]),
  scopeType: z.enum(["global", "campaign", "team", "agent"]),
  scopeCrmId: z.union([z.string(), z.number(), z.bigint()]).nullable().optional(),
  priority: z.number().int().min(0).default(0),
  validFrom: z.string().or(z.date()),
  validTo: z.string().or(z.date()).nullable().optional(),
});

export type CreatePolicyInput = z.infer<typeof CreatePolicyInputSchema>;
export type UpdatePolicyInput = z.infer<typeof UpdatePolicyInputSchema>;
export type PolicyAssignmentInput = z.infer<typeof PolicyAssignmentInputSchema>;
export type SlabInput = z.infer<typeof SlabInputSchema>;

/**
 * Validates slab progression, non-overlap, and open-ended termination
 */
export function validateSlabs(slabs: SlabInput[]): { valid: boolean; error?: string } {
  if (!slabs || slabs.length === 0) {
    return { valid: true };
  }

  // Sort by order
  const sorted = [...slabs].sort((a, b) => a.slabOrder - b.slabOrder);

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];

    if (curr.slabOrder !== i + 1) {
      return { valid: false, error: `Slab orders must be sequential starting at 1. Found order ${curr.slabOrder} at position ${i + 1}.` };
    }

    if (curr.amountPerExtraPoint < 0) {
      return { valid: false, error: `Slab #${curr.slabOrder} cannot have negative incentive amount.` };
    }

    if (curr.maximumCompletionPct !== null && curr.maximumCompletionPct !== undefined) {
      if (curr.maximumCompletionPct <= curr.minimumCompletionPct) {
        return {
          valid: false,
          error: `Slab #${curr.slabOrder} maximum threshold (${curr.maximumCompletionPct}%) must be greater than minimum threshold (${curr.minimumCompletionPct}%).`,
        };
      }
    } else {
      // Open-ended slab can only be the last slab
      if (i !== sorted.length - 1) {
        return {
          valid: false,
          error: `Only the final slab (#${sorted.length}) may have an open-ended (null) maximum threshold. Slab #${curr.slabOrder} cannot be open-ended.`,
        };
      }
    }

    // Check overlap with next slab
    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      if (curr.maximumCompletionPct !== null && curr.maximumCompletionPct !== undefined) {
        if (next.minimumCompletionPct < curr.maximumCompletionPct) {
          return {
            valid: false,
            error: `Overlapping slabs detected: Slab #${curr.slabOrder} max (${curr.maximumCompletionPct}%) overlaps with Slab #${next.slabOrder} min (${next.minimumCompletionPct}%).`,
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * List policies with statistics and filter options
 */
export async function listPolicies(filters?: { status?: string; search?: string }) {
  const where: Prisma.IncentivePolicyWhereInput = {};

  if (filters?.status && filters.status !== "all") {
    where.status = filters.status;
  }

  if (filters?.search) {
    where.OR = [
      { policyCode: { contains: filters.search } },
      { policyName: { contains: filters.search } },
    ];
  }

  const policies = await prisma.incentivePolicy.findMany({
    where,
    include: {
      rules: true,
      slabs: { orderBy: { slabOrder: "asc" } },
      assignments: true,
      approvals: { orderBy: { reviewedAt: "desc" }, take: 1 },
    },
    orderBy: [{ policyCode: "asc" }, { version: "desc" }],
  });

  return serializeDbData(policies);
}

/**
 * Get single policy by ID with all rules, slabs, assignments, and approvals
 */
export async function getPolicyById(id: bigint | number | string) {
  const numericId = BigInt(id);
  const policy = await prisma.incentivePolicy.findUnique({
    where: { id: numericId },
    include: {
      rules: true,
      slabs: { orderBy: { slabOrder: "asc" } },
      assignments: true,
      approvals: { orderBy: { reviewedAt: "desc" } },
    },
  });

  if (!policy) return null;
  return serializeDbData(policy);
}

/**
 * Get all versions of a policy code
 */
export async function getPolicyVersions(policyCode: string) {
  const versions = await prisma.incentivePolicy.findMany({
    where: { policyCode },
    include: {
      rules: true,
      slabs: { orderBy: { slabOrder: "asc" } },
      approvals: { orderBy: { reviewedAt: "desc" } },
    },
    orderBy: { version: "desc" },
  });

  return serializeDbData(versions);
}

/**
 * Create a new policy draft
 */
export async function createPolicy(input: CreatePolicyInput, actorId: bigint = BigInt(1)) {
  const validated = CreatePolicyInputSchema.parse(input);

  // Validate slabs
  const slabValidation = validateSlabs(validated.slabs);
  if (!slabValidation.valid) {
    throw new Error(slabValidation.error);
  }

  // Determine initial version
  const latestPolicy = await prisma.incentivePolicy.findFirst({
    where: { policyCode: validated.policyCode },
    orderBy: { version: "desc" },
  });

  const nextVersion = latestPolicy ? latestPolicy.version + 1 : 1;

  const validFromDate = new Date(validated.validFrom);
  const validToDate = validated.validTo ? new Date(validated.validTo) : null;

  return await prisma.$transaction(async (tx) => {
    const policy = await tx.incentivePolicy.create({
      data: {
        policyCode: validated.policyCode,
        policyName: validated.policyName,
        version: nextVersion,
        status: "draft",
        currency: validated.currency,
        validFrom: validFromDate,
        validTo: validToDate,
        createdBy: actorId,
      },
    });

    // Create rules
    await tx.incentivePolicyRules.create({
      data: {
        policyId: policy.id,
        minimumTargetPct: new Prisma.Decimal(validated.rules.minimumTargetPct),
        baseIncentiveAmount: new Prisma.Decimal(validated.rules.baseIncentiveAmount),
        attendanceRequired: validated.rules.attendanceRequired,
        qaEscalationAction: validated.rules.qaEscalationAction,
        penaltyAmount: new Prisma.Decimal(validated.rules.penaltyAmount),
        maximumDailyIncentive:
          validated.rules.maximumDailyIncentive !== null && validated.rules.maximumDailyIncentive !== undefined
            ? new Prisma.Decimal(validated.rules.maximumDailyIncentive)
            : null,
        roundingMode: validated.rules.roundingMode,
      },
    });

    // Create slabs
    if (validated.slabs.length > 0) {
      await tx.incentivePolicySlab.createMany({
        data: validated.slabs.map((s, idx) => ({
          policyId: policy.id,
          slabOrder: idx + 1,
          minimumCompletionPct: new Prisma.Decimal(s.minimumCompletionPct),
          maximumCompletionPct:
            s.maximumCompletionPct !== null && s.maximumCompletionPct !== undefined
              ? new Prisma.Decimal(s.maximumCompletionPct)
              : null,
          amountPerExtraPoint: new Prisma.Decimal(s.amountPerExtraPoint),
        })),
      });
    }

    // Audit log
    await tx.slideAuditLog.create({
      data: {
        actorId,
        action: "POLICY_CREATED",
        resourceType: "incentive_policy",
        resourceId: policy.id.toString(),
        detailsJson: {
          policyCode: policy.policyCode,
          version: policy.version,
          status: "draft",
        },
      },
    });

    return serializeDbData(policy);
  });
}

/**
 * Update an existing policy.
 * CRITICAL RULE: If the policy is already 'active' or 'approved',
 * do NOT mutate historical financial rules! Instead, automatically create a new draft version.
 */
export async function updatePolicy(id: bigint | number | string, input: UpdatePolicyInput, actorId: bigint = BigInt(1)) {
  const numericId = BigInt(id);
  const existing = await prisma.incentivePolicy.findUnique({
    where: { id: numericId },
    include: { rules: true, slabs: true },
  });

  if (!existing) {
    throw new Error(`Policy not found with id ${id}`);
  }

  // Validate slabs if provided
  if (input.slabs) {
    const slabValidation = validateSlabs(input.slabs);
    if (!slabValidation.valid) {
      throw new Error(slabValidation.error);
    }
  }

  // If already active or approved, fork into a new version!
  if (existing.status === "active" || existing.status === "approved" || existing.status === "awaiting_crm_integration") {
    // Find highest version
    const maxVer = await prisma.incentivePolicy.findFirst({
      where: { policyCode: existing.policyCode },
      orderBy: { version: "desc" },
    });
    const nextVersion = (maxVer?.version || existing.version) + 1;

    return await prisma.$transaction(async (tx) => {
      const newPolicy = await tx.incentivePolicy.create({
        data: {
          policyCode: existing.policyCode,
          policyName: input.policyName ?? existing.policyName,
          version: nextVersion,
          status: "draft",
          currency: input.currency ?? existing.currency,
          validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
          validTo: input.validTo ? new Date(input.validTo) : null,
          createdBy: actorId,
        },
      });

      const rulesData = input.rules ?? {
        minimumTargetPct: Number(existing.rules?.minimumTargetPct ?? 100),
        baseIncentiveAmount: Number(existing.rules?.baseIncentiveAmount ?? 500),
        attendanceRequired: existing.rules?.attendanceRequired ?? true,
        qaEscalationAction: (existing.rules?.qaEscalationAction as any) ?? "disqualify",
        penaltyAmount: Number(existing.rules?.penaltyAmount ?? 0),
        maximumDailyIncentive: existing.rules?.maximumDailyIncentive ? Number(existing.rules.maximumDailyIncentive) : null,
        roundingMode: (existing.rules?.roundingMode as any) ?? "floor",
      };

      await tx.incentivePolicyRules.create({
        data: {
          policyId: newPolicy.id,
          minimumTargetPct: new Prisma.Decimal(rulesData.minimumTargetPct),
          baseIncentiveAmount: new Prisma.Decimal(rulesData.baseIncentiveAmount),
          attendanceRequired: rulesData.attendanceRequired,
          qaEscalationAction: rulesData.qaEscalationAction,
          penaltyAmount: new Prisma.Decimal(rulesData.penaltyAmount),
          maximumDailyIncentive:
            rulesData.maximumDailyIncentive !== null && rulesData.maximumDailyIncentive !== undefined
              ? new Prisma.Decimal(rulesData.maximumDailyIncentive)
              : null,
          roundingMode: rulesData.roundingMode,
        },
      });

      const slabsData = input.slabs ?? existing.slabs.map((s) => ({
        slabOrder: s.slabOrder,
        minimumCompletionPct: Number(s.minimumCompletionPct),
        maximumCompletionPct: s.maximumCompletionPct ? Number(s.maximumCompletionPct) : null,
        amountPerExtraPoint: Number(s.amountPerExtraPoint),
      }));

      if (slabsData.length > 0) {
        await tx.incentivePolicySlab.createMany({
          data: slabsData.map((s, idx) => ({
            policyId: newPolicy.id,
            slabOrder: idx + 1,
            minimumCompletionPct: new Prisma.Decimal(s.minimumCompletionPct),
            maximumCompletionPct:
              s.maximumCompletionPct !== null && s.maximumCompletionPct !== undefined
                ? new Prisma.Decimal(s.maximumCompletionPct)
                : null,
            amountPerExtraPoint: new Prisma.Decimal(s.amountPerExtraPoint),
          })),
        });
      }

      await tx.slideAuditLog.create({
        data: {
          actorId,
          action: "POLICY_VERSION_FORKED",
          resourceType: "incentive_policy",
          resourceId: newPolicy.id.toString(),
          detailsJson: {
            policyCode: existing.policyCode,
            fromVersion: existing.version,
            toVersion: nextVersion,
            reason: "Active/Approved policy updated - new version draft created",
          },
        },
      });

      return {
        ...serializeDbData(newPolicy),
        isNewVersion: true,
        previousVersion: existing.version,
      };
    });
  }

  // Otherwise, it is still draft/rejected/pending_approval, we can update in place
  return await prisma.$transaction(async (tx) => {
    const updated = await tx.incentivePolicy.update({
      where: { id: numericId },
      data: {
        policyName: input.policyName,
        currency: input.currency,
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validTo: input.validTo ? new Date(input.validTo) : undefined,
      },
    });

    if (input.rules) {
      await tx.incentivePolicyRules.upsert({
        where: { policyId: numericId },
        update: {
          minimumTargetPct: new Prisma.Decimal(input.rules.minimumTargetPct),
          baseIncentiveAmount: new Prisma.Decimal(input.rules.baseIncentiveAmount),
          attendanceRequired: input.rules.attendanceRequired,
          qaEscalationAction: input.rules.qaEscalationAction,
          penaltyAmount: new Prisma.Decimal(input.rules.penaltyAmount),
          maximumDailyIncentive:
            input.rules.maximumDailyIncentive !== null && input.rules.maximumDailyIncentive !== undefined
              ? new Prisma.Decimal(input.rules.maximumDailyIncentive)
              : null,
          roundingMode: input.rules.roundingMode,
        },
        create: {
          policyId: numericId,
          minimumTargetPct: new Prisma.Decimal(input.rules.minimumTargetPct),
          baseIncentiveAmount: new Prisma.Decimal(input.rules.baseIncentiveAmount),
          attendanceRequired: input.rules.attendanceRequired,
          qaEscalationAction: input.rules.qaEscalationAction,
          penaltyAmount: new Prisma.Decimal(input.rules.penaltyAmount),
          maximumDailyIncentive:
            input.rules.maximumDailyIncentive !== null && input.rules.maximumDailyIncentive !== undefined
              ? new Prisma.Decimal(input.rules.maximumDailyIncentive)
              : null,
          roundingMode: input.rules.roundingMode,
        },
      });
    }

    if (input.slabs) {
      await tx.incentivePolicySlab.deleteMany({ where: { policyId: numericId } });
      if (input.slabs.length > 0) {
        await tx.incentivePolicySlab.createMany({
          data: input.slabs.map((s, idx) => ({
            policyId: numericId,
            slabOrder: idx + 1,
            minimumCompletionPct: new Prisma.Decimal(s.minimumCompletionPct),
            maximumCompletionPct:
              s.maximumCompletionPct !== null && s.maximumCompletionPct !== undefined
                ? new Prisma.Decimal(s.maximumCompletionPct)
                : null,
            amountPerExtraPoint: new Prisma.Decimal(s.amountPerExtraPoint),
          })),
        });
      }
    }

    await tx.slideAuditLog.create({
      data: {
        actorId,
        action: "POLICY_DRAFT_UPDATED",
        resourceType: "incentive_policy",
        resourceId: numericId.toString(),
        detailsJson: { policyCode: updated.policyCode, version: updated.version },
      },
    });

    return serializeDbData(updated);
  });
}

/**
 * Submit policy draft for manager review & approval
 */
export async function submitPolicyForApproval(id: bigint | number | string, actorId: bigint = BigInt(1)) {
  const numericId = BigInt(id);
  const policy = await prisma.incentivePolicy.findUnique({
    where: { id: numericId },
    include: { rules: true, slabs: true },
  });

  if (!policy) {
    throw new Error(`Policy not found with id ${id}`);
  }

  if (policy.status !== "draft" && policy.status !== "rejected") {
    throw new Error(`Only policies in 'draft' or 'rejected' status can be submitted for approval (current status: ${policy.status})`);
  }

  if (!policy.rules) {
    throw new Error("Cannot submit policy without defined financial rules.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.incentivePolicy.update({
      where: { id: numericId },
      data: { status: "pending_approval" },
    });

    await tx.slideAuditLog.create({
      data: {
        actorId,
        action: "POLICY_SUBMITTED_FOR_APPROVAL",
        resourceType: "incentive_policy",
        resourceId: numericId.toString(),
        detailsJson: {
          policyCode: policy.policyCode,
          version: policy.version,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    return serializeDbData(updated);
  });
}

/**
 * Review policy approval or rejection
 */
export async function reviewPolicyApproval(
  id: bigint | number | string,
  action: "approve" | "reject",
  actorId: bigint = BigInt(1),
  remarks?: string
) {
  const numericId = BigInt(id);
  const policy = await prisma.incentivePolicy.findUnique({
    where: { id: numericId },
    include: { rules: true, slabs: true },
  });

  if (!policy) {
    throw new Error(`Policy not found with id ${id}`);
  }

  if (policy.status !== "pending_approval") {
    throw new Error(`Policy is not pending approval (current status: ${policy.status})`);
  }

  const nextStatus = action === "approve" ? "approved" : "rejected";

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.incentivePolicy.update({
      where: { id: numericId },
      data: { status: nextStatus },
    });

    await tx.incentivePolicyApproval.create({
      data: {
        policyId: numericId,
        action: action === "approve" ? "APPROVED" : "REJECTED",
        reviewedBy: actorId,
        remarks: remarks || (action === "approve" ? "Approved by operations management." : "Rejected during review."),
      },
    });

    await tx.slideAuditLog.create({
      data: {
        actorId,
        action: `POLICY_${action.toUpperCase()}D`,
        resourceType: "incentive_policy",
        resourceId: numericId.toString(),
        detailsJson: {
          policyCode: policy.policyCode,
          version: policy.version,
          remarks,
          nextStatus,
        },
      },
    });

    return serializeDbData(updated);
  });
}

/**
 * Assign an approved policy to CRM scope (global, campaign, team, or agent)
 */
export async function assignPolicy(input: PolicyAssignmentInput, actorId: bigint = BigInt(1)) {
  const validated = PolicyAssignmentInputSchema.parse(input);
  const policyId = BigInt(validated.policyId);

  const policy = await prisma.incentivePolicy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    throw new Error(`Policy not found with id ${policyId}`);
  }

  if (policy.status !== "approved" && policy.status !== "active" && policy.status !== "awaiting_crm_integration") {
    throw new Error(`Cannot assign policy in '${policy.status}' status. Only approved or active policies can be assigned.`);
  }

  const validFromDate = new Date(validated.validFrom);
  const validToDate = validated.validTo ? new Date(validated.validTo) : null;
  const scopeCrmId = validated.scopeCrmId !== undefined && validated.scopeCrmId !== null ? BigInt(validated.scopeCrmId) : null;

  // Conflict validation: Check for overlapping assignments of the same scope
  const existingAssignments = await prisma.incentivePolicyAssignment.findMany({
    where: {
      scopeType: validated.scopeType,
      scopeCrmId: scopeCrmId,
    },
  });

  for (const existing of existingAssignments) {
    const existingFrom = new Date(existing.validFrom);
    const existingTo = existing.validTo ? new Date(existing.validTo) : new Date("9999-12-31");
    const newTo = validToDate ?? new Date("9999-12-31");

    // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
    if (validFromDate <= existingTo && newTo >= existingFrom) {
      throw new Error(
        `Assignment conflict: Overlaps with existing policy assignment #${existing.id} (valid from ${existing.validFrom.toISOString().slice(0, 10)} to ${existing.validTo ? existing.validTo.toISOString().slice(0, 10) : "indefinite"}). Please adjust dates or remove conflicting assignment first.`
      );
    }
  }

  const assignment = await prisma.incentivePolicyAssignment.create({
    data: {
      policyId,
      scopeType: validated.scopeType,
      scopeCrmId,
      priority: validated.priority,
      validFrom: validFromDate,
      validTo: validToDate,
      createdBy: actorId,
    },
    include: {
      policy: true,
    },
  });

  await prisma.slideAuditLog.create({
    data: {
      actorId,
      action: "POLICY_ASSIGNED",
      resourceType: "incentive_policy_assignment",
      resourceId: assignment.id.toString(),
      detailsJson: {
        policyId: policyId.toString(),
        scopeType: validated.scopeType,
        scopeCrmId: scopeCrmId?.toString() ?? null,
        priority: validated.priority,
      },
    },
  });

  return serializeDbData(assignment);
}

/**
 * List assignments with optional scope filter
 */
export async function listAssignments(scopeType?: string) {
  const where: Prisma.IncentivePolicyAssignmentWhereInput = {};
  if (scopeType && scopeType !== "all") {
    where.scopeType = scopeType;
  }

  const assignments = await prisma.incentivePolicyAssignment.findMany({
    where,
    include: {
      policy: {
        include: {
          rules: true,
          slabs: { orderBy: { slabOrder: "asc" } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { validFrom: "desc" }],
  });

  return serializeDbData(assignments);
}

/**
 * Delete an assignment
 */
export async function deleteAssignment(id: bigint | number | string, actorId: bigint = BigInt(1)) {
  const numericId = BigInt(id);
  const deleted = await prisma.incentivePolicyAssignment.delete({
    where: { id: numericId },
  });

  await prisma.slideAuditLog.create({
    data: {
      actorId,
      action: "POLICY_ASSIGNMENT_REMOVED",
      resourceType: "incentive_policy_assignment",
      resourceId: numericId.toString(),
      detailsJson: {
        policyId: deleted.policyId.toString(),
        scopeType: deleted.scopeType,
      },
    },
  });

  return serializeDbData(deleted);
}

/**
 * Get audit logs for configuration and policy actions
 */
export async function getAuditHistory(limit: number = 50) {
  const logs = await prisma.slideAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return serializeDbData(logs);
}
