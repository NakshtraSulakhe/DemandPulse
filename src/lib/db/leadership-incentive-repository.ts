import { query, execute, serializeDbData } from "@/lib/db";
import { getRealCrmRoster } from "@/lib/crm-roster";
import {
  LeadershipMember,
  LeadershipRole,
  LeadershipFrequency,
  LeadershipIncentivePlan,
  LeadershipIncentiveTier,
  AssignedAgent,
  AssignableAgent,
} from "@/types/leadership-incentives";

/**
 * Get all leadership members (Team Leaders and Managers)
 */
export async function getLeadershipMembers(options?: {
  role?: LeadershipRole;
  includeInactive?: boolean;
}): Promise<LeadershipMember[]> {
  try {
    let sql = `
      SELECT 
        m.id,
        m.member_name,
        m.member_role,
        m.crm_user_id,
        m.email,
        m.phone,
        m.parent_manager_id,
        p.member_name AS parent_manager_name,
        m.is_active,
        m.notes,
        m.created_at,
        m.updated_at
      FROM operations_leadership_members m
      LEFT JOIN operations_leadership_members p ON m.parent_manager_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.role) {
      sql += " AND m.member_role = ?";
      params.push(options.role);
    }

    if (!options?.includeInactive) {
      sql += " AND m.is_active = 1";
    }

    sql += " ORDER BY m.member_role DESC, m.member_name ASC";

    const rows = await query<any>(sql, params);
    let members: LeadershipMember[] = (rows || []).map((row) => ({
      id: Number(row.id),
      member_name: row.member_name,
      member_role: row.member_role as LeadershipRole,
      crm_user_id: row.crm_user_id ? Number(row.crm_user_id) : null,
      email: row.email || null,
      phone: row.phone || null,
      parent_manager_id: row.parent_manager_id ? Number(row.parent_manager_id) : null,
      parent_manager_name: row.parent_manager_name || null,
      is_active: Boolean(row.is_active),
      notes: row.notes || null,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      assigned_agents: [],
      assigned_agents_count: 0,
    }));

    // If no members are configured yet in the DB, automatically sync real leadership from CRM
    if (members.length === 0 && !options?.role && !options?.includeInactive) {
      await syncLeadershipFromCrm();
      const refetched = await query<any>(sql, params);
      members = (refetched || []).map((row) => ({
        id: Number(row.id),
        member_name: row.member_name,
        member_role: row.member_role as LeadershipRole,
        crm_user_id: row.crm_user_id ? Number(row.crm_user_id) : null,
        email: row.email || null,
        phone: row.phone || null,
        parent_manager_id: row.parent_manager_id ? Number(row.parent_manager_id) : null,
        parent_manager_name: row.parent_manager_name || null,
        is_active: Boolean(row.is_active),
        notes: row.notes || null,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
        assigned_agents: [],
        assigned_agents_count: 0,
      }));
    }

    if (members.length === 0) return [];

    // Fetch assignments for all returned members
    const memberIds = members.map((m) => m.id);
    const placeholders = memberIds.map(() => "?").join(",");
    const assignmentRows = await query<any>(
      `SELECT id, leadership_id, agent_id, agent_name, is_active
       FROM operations_team_assignments
       WHERE leadership_id IN (${placeholders}) AND is_active = 1
       ORDER BY agent_name ASC`,
      memberIds
    );

    const assignmentMap = new Map<number, AssignedAgent[]>();
    (assignmentRows || []).forEach((row) => {
      const leadId = Number(row.leadership_id);
      if (!assignmentMap.has(leadId)) {
        assignmentMap.set(leadId, []);
      }
      assignmentMap.get(leadId)!.push({
        id: Number(row.id),
        leadership_id: leadId,
        agent_id: Number(row.agent_id),
        agent_name: row.agent_name,
        is_active: Boolean(row.is_active),
      });
    });

    members.forEach((m) => {
      const assigned = assignmentMap.get(m.id) || [];
      m.assigned_agents = assigned;
      m.assigned_agents_count = assigned.length;
    });

    return serializeDbData(members);
  } catch (error) {
    console.error("Error fetching leadership members:", error);
    return [];
  }
}

/**
 * Get leadership member by ID
 */
export async function getLeadershipMemberById(id: number): Promise<LeadershipMember | null> {
  const members = await getLeadershipMembers({ includeInactive: true });
  return members.find((m) => m.id === id) || null;
}

/**
 * Create a new leadership member
 */
export async function createLeadershipMember(data: {
  member_name: string;
  member_role: LeadershipRole;
  crm_user_id?: number | null;
  email?: string | null;
  phone?: string | null;
  parent_manager_id?: number | null;
  notes?: string | null;
}): Promise<number> {
  const res = await execute(
    `INSERT INTO operations_leadership_members 
     (member_name, member_role, crm_user_id, email, phone, parent_manager_id, is_active, notes)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      data.member_name.trim(),
      data.member_role,
      data.crm_user_id ?? null,
      data.email?.trim() ?? null,
      data.phone?.trim() ?? null,
      data.parent_manager_id ?? null,
      data.notes?.trim() ?? null,
    ]
  );
  return (res as any).insertId;
}

/**
 * Update a leadership member
 */
export async function updateLeadershipMember(
  id: number,
  data: Partial<LeadershipMember>
): Promise<boolean> {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.member_name !== undefined) {
    fields.push("member_name = ?");
    params.push(data.member_name.trim());
  }
  if (data.member_role !== undefined) {
    fields.push("member_role = ?");
    params.push(data.member_role);
  }
  if (data.crm_user_id !== undefined) {
    fields.push("crm_user_id = ?");
    params.push(data.crm_user_id);
  }
  if (data.email !== undefined) {
    fields.push("email = ?");
    params.push(data.email?.trim() || null);
  }
  if (data.phone !== undefined) {
    fields.push("phone = ?");
    params.push(data.phone?.trim() || null);
  }
  if (data.parent_manager_id !== undefined) {
    fields.push("parent_manager_id = ?");
    params.push(data.parent_manager_id || null);
  }
  if (data.is_active !== undefined) {
    fields.push("is_active = ?");
    params.push(data.is_active ? 1 : 0);
  }
  if (data.notes !== undefined) {
    fields.push("notes = ?");
    params.push(data.notes?.trim() || null);
  }

  if (fields.length === 0) return true;

  params.push(id);
  await execute(
    `UPDATE operations_leadership_members SET ${fields.join(", ")} WHERE id = ?`,
    params
  );
  return true;
}

/**
 * Delete or deactivate leadership member
 */
export async function deleteLeadershipMember(id: number, permanent = false): Promise<boolean> {
  if (permanent) {
    await execute("DELETE FROM operations_team_assignments WHERE leadership_id = ?", [id]);
    await execute("DELETE FROM operations_leadership_members WHERE id = ?", [id]);
  } else {
    await execute("UPDATE operations_leadership_members SET is_active = 0 WHERE id = ?", [id]);
    await execute("UPDATE operations_team_assignments SET is_active = 0 WHERE leadership_id = ?", [id]);
  }
  return true;
}

/**
 * Set assigned agents for a leadership member (replaces existing assignments)
 */
export async function setLeadershipAssignments(
  leadershipId: number,
  agents: { agent_id: number; agent_name: string }[]
): Promise<boolean> {
  // Deactivate or remove existing
  await execute("DELETE FROM operations_team_assignments WHERE leadership_id = ?", [leadershipId]);

  if (!agents || agents.length === 0) return true;

  for (const agent of agents) {
    await execute(
      `INSERT INTO operations_team_assignments (leadership_id, agent_id, agent_name, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE is_active = 1, agent_name = VALUES(agent_name)`,
      [leadershipId, agent.agent_id, agent.agent_name.trim()]
    );
  }

  return true;
}

/**
 * Get all plans (TL Daily, TL Monthly, Manager Daily, Manager Monthly)
 */
export async function getAllLeadershipPlans(): Promise<LeadershipIncentivePlan[]> {
  try {
    const rows = await query<any>(
      `SELECT id, plan_name, role_target, frequency, min_threshold_pct, tiers_json, is_active, notes, created_at, updated_at
       FROM operations_leadership_plans
       ORDER BY role_target ASC, frequency ASC`
    );

    return (rows || []).map((row) => {
      let tiers: LeadershipIncentiveTier[] = [];
      try {
        tiers = typeof row.tiers_json === "string" ? JSON.parse(row.tiers_json) : row.tiers_json;
      } catch (e) {
        tiers = [];
      }

      return {
        id: Number(row.id),
        plan_name: row.plan_name,
        role_target: row.role_target as LeadershipRole,
        frequency: row.frequency as LeadershipFrequency,
        min_threshold_pct: Number(row.min_threshold_pct) || 100.0,
        tiers: Array.isArray(tiers) ? tiers : [],
        is_active: Boolean(row.is_active),
        notes: row.notes || null,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      };
    });
  } catch (error) {
    console.error("Error fetching leadership plans:", error);
    return [];
  }
}

/**
 * Get active plan for a specific role and frequency
 */
export async function getActiveLeadershipPlan(
  role: LeadershipRole,
  frequency: LeadershipFrequency
): Promise<LeadershipIncentivePlan | null> {
  const plans = await getAllLeadershipPlans();
  return plans.find((p) => p.role_target === role && p.frequency === frequency && p.is_active) || null;
}

/**
 * Save or update leadership plan
 */
export async function saveLeadershipPlan(plan: {
  id?: number;
  plan_name: string;
  role_target: LeadershipRole;
  frequency: LeadershipFrequency;
  min_threshold_pct: number;
  tiers: LeadershipIncentiveTier[];
  is_active?: boolean;
  notes?: string | null;
}): Promise<number> {
  const tiersJson = JSON.stringify(plan.tiers);
  const isActive = plan.is_active !== undefined ? (plan.is_active ? 1 : 0) : 1;

  if (plan.id) {
    await execute(
      `UPDATE operations_leadership_plans
       SET plan_name = ?, role_target = ?, frequency = ?, min_threshold_pct = ?, tiers_json = ?, is_active = ?, notes = ?
       WHERE id = ?`,
      [
        plan.plan_name.trim(),
        plan.role_target,
        plan.frequency,
        plan.min_threshold_pct,
        tiersJson,
        isActive,
        plan.notes?.trim() || null,
        plan.id,
      ]
    );
    return plan.id;
  } else {
    const res = await execute(
      `INSERT INTO operations_leadership_plans
       (plan_name, role_target, frequency, min_threshold_pct, tiers_json, is_active, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        plan.plan_name.trim(),
        plan.role_target,
        plan.frequency,
        plan.min_threshold_pct,
        tiersJson,
        isActive,
        plan.notes?.trim() || null,
      ]
    );
    return (res as any).insertId;
  }
}

/**
 * Get all available operations agents in the organization
 * (from MySQL daily snapshots, target assignments, and current leadership assignments)
 */
export async function getAllAssignableAgents(): Promise<AssignableAgent[]> {
  try {
    // 1. Get current active assignments with leader info
    const assignedRows = await query<any>(
      `SELECT a.agent_id, a.agent_name, a.leadership_id, m.member_name, m.member_role
       FROM operations_team_assignments a
       JOIN operations_leadership_members m ON a.leadership_id = m.id
       WHERE a.is_active = 1 AND m.is_active = 1`
    );

    const assignmentMap = new Map<
      number,
      { leader_id: number; leader_name: string; role: LeadershipRole }
    >();
    (assignedRows || []).forEach((row) => {
      assignmentMap.set(Number(row.agent_id), {
        leader_id: Number(row.leadership_id),
        leader_name: row.member_name,
        role: row.member_role as LeadershipRole,
      });
    });

    // 2. Discover agents from snapshots
    const snapshotAgents = await query<any>(
      `SELECT DISTINCT crm_agent_id as agent_id, agent_name_snapshot as agent_name
       FROM agent_daily_snapshots
       WHERE crm_agent_id IS NOT NULL AND agent_name_snapshot IS NOT NULL AND agent_name_snapshot != ''
       ORDER BY agent_name_snapshot ASC`
    );

    // 3. Discover agents from employee targets
    const targetAgents = await query<any>(
      `SELECT DISTINCT employee_id as agent_id, employee_name as agent_name
       FROM employee_target_assignments
       WHERE employee_role = 'Agent' AND employee_name IS NOT NULL
       ORDER BY employee_name ASC`
    ).catch(() => []);

    const agentMap = new Map<number, string>();

    (snapshotAgents || []).forEach((r) => {
      const id = Number(r.agent_id);
      if (id && r.agent_name) agentMap.set(id, r.agent_name.trim());
    });

    (targetAgents || []).forEach((r) => {
      const id = Number(r.agent_id);
      if (id && r.agent_name && !agentMap.has(id)) agentMap.set(id, r.agent_name.trim());
    });

    (assignedRows || []).forEach((r) => {
      const id = Number(r.agent_id);
      if (id && r.agent_name && !agentMap.has(id)) agentMap.set(id, r.agent_name.trim());
    });

    const result: AssignableAgent[] = Array.from(agentMap.entries()).map(([id, name]) => ({
      agent_id: id,
      agent_name: name,
      role: "Agent",
      is_active: true,
      currently_assigned_to: assignmentMap.get(id) || null,
    }));

    result.sort((a, b) => a.agent_name.localeCompare(b.agent_name));
    return serializeDbData(result);
  } catch (error) {
    console.error("Error fetching assignable agents:", error);
    return [];
  }
}

/**
 * Synchronize real Operations Managers and Team Leaders from live CRM
 */
export async function syncLeadershipFromCrm(): Promise<LeadershipMember[]> {
  try {
    const roster = await getRealCrmRoster();

    // Identify operations managers and team leaders from CRM
    const crmLeaders = roster.filter(
      (e) =>
        e.normalized_role === "manager" ||
        e.normalized_role === "team_leader" ||
        e.role.toLowerCase().includes("operations_manager") ||
        e.role.toLowerCase().includes("team_leader")
    );

    for (const leader of crmLeaders) {
      const isMgr =
        leader.normalized_role === "manager" ||
        leader.role.toLowerCase().includes("operations_manager");
      const role: LeadershipRole = isMgr ? "manager" : "team_leader";

      const existing = await query<any>(
        `SELECT id FROM operations_leadership_members WHERE crm_user_id = ? OR member_name = ?`,
        [leader.id, leader.name]
      );

      if (!existing || existing.length === 0) {
        await execute(
          `INSERT INTO operations_leadership_members 
           (member_name, member_role, crm_user_id, email, is_active, notes)
           VALUES (?, ?, ?, ?, 1, ?)`,
          [
            leader.name,
            role,
            leader.id,
            `${leader.name.toLowerCase().replace(/\s+/g, ".")}@demandflow.io`,
            `Synced from CRM (${leader.department} - Role: ${leader.role})`,
          ]
        );
      } else {
        const id = existing[0].id;
        await execute(
          `UPDATE operations_leadership_members 
           SET member_name = ?, member_role = ?, crm_user_id = ?, is_active = 1
           WHERE id = ?`,
          [leader.name, role, leader.id, id]
        );
      }
    }

    return await getLeadershipMembers();
  } catch (error) {
    console.error("Error syncing leadership from CRM:", error);
    return [];
  }
}
