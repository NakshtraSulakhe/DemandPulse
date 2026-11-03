import { query, queryOne, execute, withTransaction, serializeDbData } from "@/lib/db";
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
      if (i !== sorted.length - 1) {
        return {
          valid: false,
          error: `Only the final slab (#${sorted.length}) may have an open-ended (null) maximum threshold. Slab #${curr.slabOrder} cannot be open-ended.`,
        };
      }
    }

    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      if (curr.maximumCompletionPct === null || curr.maximumCompletionPct === undefined) {
        return {
          valid: false,
          error: `Slab #${curr.slabOrder} has no upper bound, but slab #${next.slabOrder} is defined after it.`,
        };
      }
      if (curr.maximumCompletionPct !== next.minimumCompletionPct) {
        return {
          valid: false,
          error: `Gap or overlap between slab #${curr.slabOrder} (max ${curr.maximumCompletionPct}%) and slab #${next.slabOrder} (min ${next.minimumCompletionPct}%). Tier intervals must be contiguous.`,
        };
      }
    }
  }

  return { valid: true };
}

async function attachPolicyRelations(policyRows: any[]): Promise<any[]> {
  if (!policyRows || policyRows.length === 0) return [];
  const policyIds = policyRows.map((p) => p.id);

  const placeholders = policyIds.map(() => "?").join(",");
  const [rules, slabs, approvals, assignments] = await Promise.all([
    query<any>(`SELECT * FROM incentive_policy_rules WHERE policy_id IN (${placeholders})`, policyIds),
    query<any>(`SELECT * FROM incentive_policy_slabs WHERE policy_id IN (${placeholders}) ORDER BY slab_order ASC`, policyIds),
    query<any>(`SELECT * FROM incentive_policy_approvals WHERE policy_id IN (${placeholders}) ORDER BY reviewed_at DESC`, policyIds),
    query<any>(`SELECT * FROM incentive_policy_assignments WHERE policy_id IN (${placeholders})`, policyIds),
  ]);

  const rulesMap = new Map<string, any>();
  rules.forEach((r) => rulesMap.set(String(r.policy_id), {
    id: r.id.toString(),
    policyId: r.policy_id.toString(),
    minimumTargetPct: Number(r.minimum_target_pct),
    baseIncentiveAmount: Number(r.base_incentive_amount),
    attendanceRequired: Boolean(r.attendance_required),
    qaEscalationAction: r.qa_escalation_action,
    penaltyAmount: Number(r.penalty_amount),
    maximumDailyIncentive: r.maximum_daily_incentive ? Number(r.maximum_daily_incentive) : null,
    roundingMode: r.rounding_mode,
    createdAt: String(r.created_at),
  }));

  const slabsMap = new Map<string, any[]>();
  slabs.forEach((s) => {
    const pId = String(s.policy_id);
    if (!slabsMap.has(pId)) slabsMap.set(pId, []);
    slabsMap.get(pId)!.push({
      id: s.id.toString(),
      policyId: s.policy_id.toString(),
      slabOrder: s.slab_order,
      minimumCompletionPct: Number(s.minimum_completion_pct),
      maximumCompletionPct: s.maximum_completion_pct ? Number(s.maximum_completion_pct) : null,
      amountPerExtraPoint: Number(s.amount_per_extra_point),
      createdAt: String(s.created_at),
    });
  });

  const approvalsMap = new Map<string, any[]>();
  approvals.forEach((a) => {
    const pId = String(a.policy_id);
    if (!approvalsMap.has(pId)) approvalsMap.set(pId, []);
    approvalsMap.get(pId)!.push({
      id: a.id.toString(),
      policyId: a.policy_id.toString(),
      action: a.action,
      reviewedBy: a.reviewed_by ? a.reviewed_by.toString() : null,
      remarks: a.remarks,
      reviewedAt: String(a.reviewed_at),
    });
  });

  const assignmentsMap = new Map<string, any[]>();
  assignments.forEach((asg) => {
    const pId = String(asg.policy_id);
    if (!assignmentsMap.has(pId)) assignmentsMap.set(pId, []);
    assignmentsMap.get(pId)!.push({
      id: asg.id.toString(),
      policyId: asg.policy_id.toString(),
      scopeType: asg.scope_type,
      scopeCrmId: asg.scope_crm_id ? asg.scope_crm_id.toString() : null,
      priority: asg.priority,
      validFrom: String(asg.valid_from),
      validTo: asg.valid_to ? String(asg.valid_to) : null,
      createdBy: asg.created_by.toString(),
      createdAt: String(asg.created_at),
    });
  });

  return policyRows.map((p) => {
    const pId = String(p.id);
    return {
      id: p.id.toString(),
      policyCode: p.policy_code,
      policyName: p.policy_name,
      version: p.version,
      status: p.status,
      currency: p.currency,
      validFrom: typeof p.valid_from === "string" ? p.valid_from.slice(0, 10) : new Date(p.valid_from).toISOString().slice(0, 10),
      validTo: p.valid_to ? (typeof p.valid_to === "string" ? p.valid_to.slice(0, 10) : new Date(p.valid_to).toISOString().slice(0, 10)) : null,
      createdBy: p.created_by.toString(),
      createdAt: String(p.created_at),
      updatedAt: String(p.updated_at),
      rules: rulesMap.get(pId) || null,
      slabs: slabsMap.get(pId) || [],
      approvals: approvalsMap.get(pId) || [],
      assignments: assignmentsMap.get(pId) || [],
    };
  });
}

/**
 * List all incentive policies with latest version and status filtering
 */
export async function listPolicies(filters?: {
  status?: string;
  search?: string;
}) {
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (filters?.status && filters.status !== "all") {
    whereClauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.search) {
    whereClauses.push("(policy_code LIKE ? OR policy_name LIKE ?)");
    const s = `%${filters.search}%`;
    params.push(s, s);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const sql = `SELECT * FROM incentive_policies ${whereStr} ORDER BY policy_code ASC, version DESC`;

  const rows = await query<any>(sql, params);
  const populated = await attachPolicyRelations(rows);
  return serializeDbData(populated);
}

/**
 * Get single policy by ID with all rules, slabs, assignments, and approvals
 */
export async function getPolicyById(id: bigint | number | string) {
  const numericId = Number(id);
  const rows = await query<any>(`SELECT * FROM incentive_policies WHERE id = ? LIMIT 1`, [numericId]);
  if (!rows || rows.length === 0) return null;

  const populated = await attachPolicyRelations(rows);
  return serializeDbData(populated[0]);
}

/**
 * Get all versions of a policy code
 */
export async function getPolicyVersions(policyCode: string) {
  const rows = await query<any>(
    `SELECT * FROM incentive_policies WHERE policy_code = ? ORDER BY version DESC`,
    [policyCode]
  );
  const populated = await attachPolicyRelations(rows);
  return serializeDbData(populated);
}

/**
 * Create a new policy draft
 */
export async function createPolicy(input: CreatePolicyInput, actorId: bigint = BigInt(1)) {
  const validated = CreatePolicyInputSchema.parse(input);

  const slabValidation = validateSlabs(validated.slabs);
  if (!slabValidation.valid) {
    throw new Error(slabValidation.error);
  }

  const latestPolicy = await queryOne<{ version: number }>(
    `SELECT version FROM incentive_policies WHERE policy_code = ? ORDER BY version DESC LIMIT 1`,
    [validated.policyCode]
  );

  const nextVersion = latestPolicy ? latestPolicy.version + 1 : 1;
  const validFromDate = typeof validated.validFrom === "string" ? validated.validFrom.slice(0, 10) : new Date(validated.validFrom).toISOString().slice(0, 10);
  const validToDate = validated.validTo
    ? (typeof validated.validTo === "string" ? validated.validTo.slice(0, 10) : new Date(validated.validTo).toISOString().slice(0, 10))
    : null;

  return await withTransaction(async (conn) => {
    const [res] = await conn.execute(
      `INSERT INTO incentive_policies
         (policy_code, policy_name, version, status, currency, valid_from, valid_to, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, NOW(6), NOW(6))`,
      [validated.policyCode, validated.policyName, nextVersion, validated.currency, validFromDate, validToDate, Number(actorId)]
    );
    const policyId = (res as any).insertId;

    await conn.execute(
      `INSERT INTO incentive_policy_rules
         (policy_id, minimum_target_pct, base_incentive_amount, attendance_required, qa_escalation_action, penalty_amount, maximum_daily_incentive, rounding_mode, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
      [
        policyId,
        validated.rules.minimumTargetPct,
        validated.rules.baseIncentiveAmount,
        validated.rules.attendanceRequired ? 1 : 0,
        validated.rules.qaEscalationAction,
        validated.rules.penaltyAmount,
        validated.rules.maximumDailyIncentive ?? null,
        validated.rules.roundingMode,
      ]
    );

    if (validated.slabs.length > 0) {
      for (let idx = 0; idx < validated.slabs.length; idx++) {
        const s = validated.slabs[idx];
        await conn.execute(
          `INSERT INTO incentive_policy_slabs
             (policy_id, slab_order, minimum_completion_pct, maximum_completion_pct, amount_per_extra_point, created_at)
           VALUES (?, ?, ?, ?, ?, NOW(6))`,
          [policyId, idx + 1, s.minimumCompletionPct, s.maximumCompletionPct ?? null, s.amountPerExtraPoint]
        );
      }
    }

    await conn.execute(
      `INSERT INTO slide_audit_logs (actor_id, action, resource_type, resource_id, details_json, created_at)
       VALUES (?, 'POLICY_CREATED', 'incentive_policy', ?, ?, NOW(6))`,
      [
        Number(actorId),
        String(policyId),
        JSON.stringify({
          policyCode: validated.policyCode,
          version: nextVersion,
          status: "draft",
        }),
      ]
    );

    const [createdRows] = await conn.query(`SELECT * FROM incentive_policies WHERE id = ?`, [policyId]);
    return serializeDbData((createdRows as any[])[0]);
  });
}

/**
 * Update an existing policy.
 * If active or approved, automatically fork into a new version.
 */
export async function updatePolicy(id: bigint | number | string, input: UpdatePolicyInput, actorId: bigint = BigInt(1)) {
  const numericId = Number(id);
  const existing = await getPolicyById(numericId);

  if (!existing) {
    throw new Error(`Policy not found with id ${id}`);
  }

  if (input.slabs) {
    const slabValidation = validateSlabs(input.slabs);
    if (!slabValidation.valid) {
      throw new Error(slabValidation.error);
    }
  }

  if (existing.status === "active" || existing.status === "approved" || existing.status === "awaiting_crm_integration") {
    const maxVerRow = await queryOne<{ version: number }>(
      `SELECT version FROM incentive_policies WHERE policy_code = ? ORDER BY version DESC LIMIT 1`,
      [existing.policyCode]
    );
    const nextVersion = (maxVerRow?.version || existing.version) + 1;

    return await withTransaction(async (conn) => {
      const validFromDate = input.validFrom
        ? (typeof input.validFrom === "string" ? input.validFrom.slice(0, 10) : new Date(input.validFrom).toISOString().slice(0, 10))
        : existing.validFrom;
      const validToDate = input.validTo
        ? (typeof input.validTo === "string" ? input.validTo.slice(0, 10) : new Date(input.validTo).toISOString().slice(0, 10))
        : (existing.validTo || null);

      const [res] = await conn.execute(
        `INSERT INTO incentive_policies
           (policy_code, policy_name, version, status, currency, valid_from, valid_to, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, NOW(6), NOW(6))`,
        [
          existing.policyCode,
          input.policyName ?? existing.policyName,
          nextVersion,
          input.currency ?? existing.currency,
          validFromDate,
          validToDate,
          Number(actorId),
        ]
      );
      const newPolicyId = (res as any).insertId;

      const rulesData = input.rules ?? {
        minimumTargetPct: Number(existing.rules?.minimumTargetPct ?? 100),
        baseIncentiveAmount: Number(existing.rules?.baseIncentiveAmount ?? 500),
        attendanceRequired: existing.rules?.attendanceRequired ?? true,
        qaEscalationAction: (existing.rules?.qaEscalationAction as any) ?? "disqualify",
        penaltyAmount: Number(existing.rules?.penaltyAmount ?? 0),
        maximumDailyIncentive: existing.rules?.maximumDailyIncentive ? Number(existing.rules.maximumDailyIncentive) : null,
        roundingMode: (existing.rules?.roundingMode as any) ?? "floor",
      };

      await conn.execute(
        `INSERT INTO incentive_policy_rules
           (policy_id, minimum_target_pct, base_incentive_amount, attendance_required, qa_escalation_action, penalty_amount, maximum_daily_incentive, rounding_mode, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
        [
          newPolicyId,
          rulesData.minimumTargetPct,
          rulesData.baseIncentiveAmount,
          rulesData.attendanceRequired ? 1 : 0,
          rulesData.qaEscalationAction,
          rulesData.penaltyAmount,
          rulesData.maximumDailyIncentive ?? null,
          rulesData.roundingMode,
        ]
      );

      const slabsData = input.slabs ?? (existing.slabs || []).map((s: any) => ({
        slabOrder: s.slabOrder,
        minimumCompletionPct: Number(s.minimumCompletionPct),
        maximumCompletionPct: s.maximumCompletionPct ? Number(s.maximumCompletionPct) : null,
        amountPerExtraPoint: Number(s.amountPerExtraPoint),
      }));

      for (let idx = 0; idx < slabsData.length; idx++) {
        const s = slabsData[idx];
        await conn.execute(
          `INSERT INTO incentive_policy_slabs
             (policy_id, slab_order, minimum_completion_pct, maximum_completion_pct, amount_per_extra_point, created_at)
           VALUES (?, ?, ?, ?, ?, NOW(6))`,
          [newPolicyId, idx + 1, s.minimumCompletionPct, s.maximumCompletionPct ?? null, s.amountPerExtraPoint]
        );
      }

      await conn.execute(
        `INSERT INTO slide_audit_logs (actor_id, action, resource_type, resource_id, details_json, created_at)
         VALUES (?, 'POLICY_VERSION_FORKED', 'incentive_policy', ?, ?, NOW(6))`,
        [
          Number(actorId),
          String(newPolicyId),
          JSON.stringify({
            policyCode: existing.policyCode,
            fromVersion: existing.version,
            toVersion: nextVersion,
            reason: "Active/Approved policy updated - new version draft created",
          }),
        ]
      );

      const [newPolicyRows] = await conn.query(`SELECT * FROM incentive_policies WHERE id = ?`, [newPolicyId]);
      return {
        ...serializeDbData((newPolicyRows as any[])[0]),
        isNewVersion: true,
        previousVersion: existing.version,
      };
    });
  }

  // Update in place for draft/rejected
  return await withTransaction(async (conn) => {
    const setClauses: string[] = ["updated_at = NOW(6)"];
    const params: any[] = [];

    if (input.policyName) {
      setClauses.push("policy_name = ?");
      params.push(input.policyName);
    }
    if (input.currency) {
      setClauses.push("currency = ?");
      params.push(input.currency);
    }
    if (input.validFrom) {
      setClauses.push("valid_from = ?");
      params.push(typeof input.validFrom === "string" ? input.validFrom.slice(0, 10) : new Date(input.validFrom).toISOString().slice(0, 10));
    }
    if (input.validTo !== undefined) {
      setClauses.push("valid_to = ?");
      params.push(input.validTo ? (typeof input.validTo === "string" ? input.validTo.slice(0, 10) : new Date(input.validTo).toISOString().slice(0, 10)) : null);
    }
    params.push(numericId);

    await conn.execute(
      `UPDATE incentive_policies SET ${setClauses.join(", ")} WHERE id = ?`,
      params
    );

    if (input.rules) {
      await conn.execute(
        `INSERT INTO incentive_policy_rules
           (policy_id, minimum_target_pct, base_incentive_amount, attendance_required, qa_escalation_action, penalty_amount, maximum_daily_incentive, rounding_mode, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))
         ON DUPLICATE KEY UPDATE
           minimum_target_pct = VALUES(minimum_target_pct),
           base_incentive_amount = VALUES(base_incentive_amount),
           attendance_required = VALUES(attendance_required),
           qa_escalation_action = VALUES(qa_escalation_action),
           penalty_amount = VALUES(penalty_amount),
           maximum_daily_incentive = VALUES(maximum_daily_incentive),
           rounding_mode = VALUES(rounding_mode)`,
        [
          numericId,
          input.rules.minimumTargetPct,
          input.rules.baseIncentiveAmount,
          input.rules.attendanceRequired ? 1 : 0,
          input.rules.qaEscalationAction,
          input.rules.penaltyAmount,
          input.rules.maximumDailyIncentive ?? null,
          input.rules.roundingMode,
        ]
      );
    }

    if (input.slabs) {
      await conn.execute(`DELETE FROM incentive_policy_slabs WHERE policy_id = ?`, [numericId]);
      for (let idx = 0; idx < input.slabs.length; idx++) {
        const s = input.slabs[idx];
        await conn.execute(
          `INSERT INTO incentive_policy_slabs
             (policy_id, slab_order, minimum_completion_pct, maximum_completion_pct, amount_per_extra_point, created_at)
           VALUES (?, ?, ?, ?, ?, NOW(6))`,
          [numericId, idx + 1, s.minimumCompletionPct, s.maximumCompletionPct ?? null, s.amountPerExtraPoint]
        );
      }
    }

    await conn.execute(
      `INSERT INTO slide_audit_logs (actor_id, action, resource_type, resource_id, details_json, created_at)
       VALUES (?, 'POLICY_DRAFT_UPDATED', 'incentive_policy', ?, ?, NOW(6))`,
      [Number(actorId), String(numericId), JSON.stringify({ policyCode: existing.policyCode, version: existing.version })]
    );

    const [updatedRows] = await conn.query(`SELECT * FROM incentive_policies WHERE id = ?`, [numericId]);
    return serializeDbData((updatedRows as any[])[0]);
  });
}

/**
 * Submit policy draft for review & approval
 */
export async function submitPolicyForApproval(id: bigint | number | string, actorId: bigint = BigInt(1)) {
  const numericId = Number(id);
  const policy = await getPolicyById(numericId);

  if (!policy) {
    throw new Error(`Policy not found with id ${id}`);
  }

  if (policy.status !== "draft" && policy.status !== "rejected") {
    throw new Error(`Only policies in 'draft' or 'rejected' status can be submitted for approval (current status: ${policy.status})`);
  }

  if (!policy.rules) {
    throw new Error("Cannot submit policy without defined financial rules.");
  }

  await execute(`UPDATE incentive_policies SET status = 'pending_approval', updated_at = NOW(6) WHERE id = ?`, [numericId]);

  await execute(
    `INSERT INTO slide_audit_logs (actor_id, action, resource_type, resource_id, details_json, created_at)
     VALUES (?, 'POLICY_SUBMITTED_FOR_APPROVAL', 'incentive_policy', ?, ?, NOW(6))`,
    [Number(actorId), String(numericId), JSON.stringify({ policyCode: policy.policyCode, version: policy.version })]
  );

  return await getPolicyById(numericId);
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
  const numericId = Number(id);
  const policy = await getPolicyById(numericId);

  if (!policy) {
    throw new Error(`Policy not found with id ${id}`);
  }

  if (policy.status !== "pending_approval") {
    throw new Error(`Policy is not pending approval (current status: ${policy.status})`);
  }

  const nextStatus = action === "approve" ? "approved" : "rejected";

  await withTransaction(async (conn) => {
    await conn.execute(`UPDATE incentive_policies SET status = ?, updated_at = NOW(6) WHERE id = ?`, [nextStatus, numericId]);

    await conn.execute(
      `INSERT INTO incentive_policy_approvals (policy_id, action, reviewed_by, remarks, reviewed_at)
       VALUES (?, ?, ?, ?, NOW(6))`,
      [
        numericId,
        action === "approve" ? "APPROVED" : "REJECTED",
        Number(actorId),
        remarks || (action === "approve" ? "Approved by operations management." : "Rejected during review."),
      ]
    );

    await conn.execute(
      `INSERT INTO slide_audit_logs (actor_id, action, resource_type, resource_id, details_json, created_at)
       VALUES (?, ?, 'incentive_policy', ?, ?, NOW(6))`,
      [
        Number(actorId),
        `POLICY_${action.toUpperCase()}D`,
        String(numericId),
        JSON.stringify({ policyCode: policy.policyCode, version: policy.version, remarks, nextStatus }),
      ]
    );
  });

  return await getPolicyById(numericId);
}

/**
 * Retire a policy
 */
export async function retirePolicy(id: bigint | number | string, actorId: bigint = BigInt(1), remarks?: string) {
  const numericId = Number(id);
  const policy = await getPolicyById(numericId);

  if (!policy) {
    throw new Error(`Policy not found with id ${id}`);
  }

  await withTransaction(async (conn) => {
    await conn.execute(`UPDATE incentive_policies SET status = 'retired', updated_at = NOW(6) WHERE id = ?`, [numericId]);

    await conn.execute(
      `INSERT INTO slide_audit_logs (actor_id, action, resource_type, resource_id, details_json, created_at)
       VALUES (?, 'POLICY_RETIRED', 'incentive_policy', ?, ?, NOW(6))`,
      [Number(actorId), String(numericId), JSON.stringify({ policyCode: policy.policyCode, version: policy.version, remarks })]
    );
  });

  return await getPolicyById(numericId);
}

/**
 * Assign an approved policy to CRM scope (global, campaign, team, or agent)
 */
export async function assignPolicy(input: PolicyAssignmentInput, actorId: bigint = BigInt(1)) {
  const validated = PolicyAssignmentInputSchema.parse(input);
  const policyId = Number(validated.policyId);

  const policy = await queryOne<any>(`SELECT * FROM incentive_policies WHERE id = ? LIMIT 1`, [policyId]);

  if (!policy) {
    throw new Error(`Policy not found with id ${policyId}`);
  }

  if (policy.status !== "approved" && policy.status !== "active" && policy.status !== "awaiting_crm_integration") {
    throw new Error(`Cannot assign policy in '${policy.status}' status. Only approved or active policies can be assigned.`);
  }

  const validFromDate = typeof validated.validFrom === "string" ? validated.validFrom.slice(0, 10) : new Date(validated.validFrom).toISOString().slice(0, 10);
  const validToDate = validated.validTo
    ? (typeof validated.validTo === "string" ? validated.validTo.slice(0, 10) : new Date(validated.validTo).toISOString().slice(0, 10))
    : null;
  const scopeCrmId = validated.scopeCrmId !== undefined && validated.scopeCrmId !== null ? Number(validated.scopeCrmId) : null;

  const existingAssignments = await query<any>(
    `SELECT * FROM incentive_policy_assignments WHERE scope_type = ? AND ${scopeCrmId !== null ? "scope_crm_id = ?" : "scope_crm_id IS NULL"}`,
    scopeCrmId !== null ? [validated.scopeType, scopeCrmId] : [validated.scopeType]
  );

  for (const existing of existingAssignments) {
    const existingFrom = new Date(existing.valid_from);
    const existingTo = existing.valid_to ? new Date(existing.valid_to) : new Date("9999-12-31");
    const newFrom = new Date(validFromDate);
    const newTo = validToDate ? new Date(validToDate) : new Date("9999-12-31");

    if (newFrom <= existingTo && newTo >= existingFrom) {
      throw new Error(
        `Assignment conflict: Overlaps with existing policy assignment #${existing.id}. Please adjust dates or remove conflicting assignment first.`
      );
    }
  }

  const res = await execute(
    `INSERT INTO incentive_policy_assignments (policy_id, scope_type, scope_crm_id, priority, valid_from, valid_to, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [policyId, validated.scopeType, scopeCrmId, validated.priority, validFromDate, validToDate, Number(actorId)]
  );

  const assignmentId = res.insertId;

  await execute(
    `INSERT INTO slide_audit_logs (actor_id, action, resource_type, resource_id, details_json, created_at)
     VALUES (?, 'POLICY_ASSIGNED', 'incentive_policy_assignment', ?, ?, NOW(6))`,
    [
      Number(actorId),
      String(assignmentId),
      JSON.stringify({
        policyId: String(policyId),
        scopeType: validated.scopeType,
        scopeCrmId: scopeCrmId !== null ? String(scopeCrmId) : null,
        priority: validated.priority,
      }),
    ]
  );

  const row = await queryOne<any>(`SELECT * FROM incentive_policy_assignments WHERE id = ? LIMIT 1`, [assignmentId]);
  return serializeDbData({
    ...row,
    id: row.id.toString(),
    policyId: row.policy_id.toString(),
    scopeCrmId: row.scope_crm_id ? row.scope_crm_id.toString() : null,
    validFrom: String(row.valid_from),
    validTo: row.valid_to ? String(row.valid_to) : null,
    createdBy: row.created_by.toString(),
    createdAt: String(row.created_at),
  });
}

/**
 * List assignments with optional scope filter
 */
export async function listAssignments(scopeType?: string) {
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (scopeType && scopeType !== "all") {
    whereClauses.push("a.scope_type = ?");
    params.push(scopeType);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const sql = `
    SELECT a.*, p.policy_code, p.policy_name, p.version, p.status, p.currency
    FROM incentive_policy_assignments a
    JOIN incentive_policies p ON a.policy_id = p.id
    ${whereStr}
    ORDER BY a.priority DESC, a.valid_from DESC
  `;

  const rows = await query<any>(sql, params);

  return serializeDbData(
    rows.map((r) => ({
      id: r.id.toString(),
      policyId: r.policy_id.toString(),
      scopeType: r.scope_type,
      scopeCrmId: r.scope_crm_id ? r.scope_crm_id.toString() : null,
      priority: r.priority,
      validFrom: typeof r.valid_from === "string" ? r.valid_from.slice(0, 10) : new Date(r.valid_from).toISOString().slice(0, 10),
      validTo: r.valid_to ? (typeof r.valid_to === "string" ? r.valid_to.slice(0, 10) : new Date(r.valid_to).toISOString().slice(0, 10)) : null,
      createdBy: r.created_by.toString(),
      createdAt: String(r.created_at),
      policy: {
        id: r.policy_id.toString(),
        policyCode: r.policy_code,
        policyName: r.policy_name,
        version: r.version,
        status: r.status,
        currency: r.currency,
      },
    }))
  );
}

/**
 * Delete an assignment
 */
export async function deleteAssignment(id: bigint | number | string, actorId: bigint = BigInt(1)) {
  const numericId = Number(id);
  const existing = await queryOne<any>(`SELECT * FROM incentive_policy_assignments WHERE id = ? LIMIT 1`, [numericId]);

  if (!existing) {
    throw new Error(`Assignment not found with id ${id}`);
  }

  await execute(`DELETE FROM incentive_policy_assignments WHERE id = ?`, [numericId]);

  await execute(
    `INSERT INTO slide_audit_logs (actor_id, action, resource_type, resource_id, details_json, created_at)
     VALUES (?, 'POLICY_ASSIGNMENT_REMOVED', 'incentive_policy_assignment', ?, ?, NOW(6))`,
    [
      Number(actorId),
      String(numericId),
      JSON.stringify({ policyId: existing.policy_id.toString(), scopeType: existing.scope_type }),
    ]
  );

  return serializeDbData(existing);
}

/**
 * Get audit logs for configuration and policy actions
 */
export async function getAuditHistory(limit: number = 50) {
  const logs = await query<any>(
    `SELECT * FROM slide_audit_logs ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );

  return serializeDbData(
    logs.map((l) => ({
      id: l.id.toString(),
      actorId: l.actor_id ? l.actor_id.toString() : null,
      action: l.action,
      resourceType: l.resource_type,
      resourceId: l.resource_id,
      detailsJson: typeof l.details_json === "string" ? JSON.parse(l.details_json) : l.details_json,
      createdAt: String(l.created_at),
    }))
  );
}
