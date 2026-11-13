import { query, queryOne, execute, withTransaction } from "@/lib/db";

export type EmployeeRole = "Agent" | "QA";

export interface EmployeeTargetAssignmentRecord {
  id: string;
  employee_id: number;
  employee_name: string;
  employee_role: EmployeeRole;
  target_month: number;
  target_year: number;
  working_days: number;
  daily_target: number;
  calculated_monthly_target: number;
  adjusted_monthly_target: number | null;
  effective_monthly_target: number; // adjusted if available, else calculated
  adjustment_reason: string | null;
  is_manually_adjusted: boolean;
  quality_threshold_pct: number;
  effective_date: string;
  status: "active" | "inactive" | "archived";
  remarks: string | null;
  assigned_by: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeTargetAuditRecord {
  id: string;
  assignment_id: string | null;
  employee_id: number;
  employee_name: string;
  employee_role: EmployeeRole;
  target_month: number;
  target_year: number;
  previous_daily_target: number | null;
  new_daily_target: number;
  previous_monthly_target: number | null;
  new_monthly_target: number;
  working_days: number;
  action: string;
  adjustment_reason: string | null;
  performed_by: string;
  created_at: string;
}

export interface SaveEmployeeTargetInput {
  employee_id: number;
  employee_name: string;
  employee_role: EmployeeRole;
  target_month: number;
  target_year: number;
  working_days?: number;
  daily_target: number;
  adjusted_monthly_target?: number | null;
  adjustment_reason?: string | null;
  quality_threshold_pct?: number;
  effective_date?: string;
  status?: "active" | "inactive" | "archived";
  remarks?: string | null;
  assigned_by: string;
}

let tableEnsured = false;

export async function ensureEmployeeTargetsTable(): Promise<boolean> {
  if (tableEnsured) return true;
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS employee_target_assignments (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        employee_id BIGINT NOT NULL,
        employee_name VARCHAR(150) NOT NULL,
        employee_role ENUM('Agent', 'QA') NOT NULL,
        target_month INT NOT NULL,
        target_year INT NOT NULL,
        working_days INT NOT NULL DEFAULT 22,
        daily_target DECIMAL(10, 2) NOT NULL,
        calculated_monthly_target DECIMAL(12, 2) NOT NULL,
        adjusted_monthly_target DECIMAL(12, 2) NULL,
        adjustment_reason TEXT NULL,
        is_manually_adjusted TINYINT(1) NOT NULL DEFAULT 0,
        quality_threshold_pct DECIMAL(5, 2) NULL DEFAULT 95.00,
        effective_date DATE NOT NULL,
        status ENUM('active', 'inactive', 'archived') NOT NULL DEFAULT 'active',
        remarks TEXT NULL,
        assigned_by VARCHAR(150) NOT NULL DEFAULT 'Admin',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uniq_emp_role_month_year (employee_id, employee_role, target_month, target_year),
        KEY idx_target_lookup (employee_role, target_year, target_month, status),
        KEY idx_target_emp_date (employee_id, effective_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await execute(`
      CREATE TABLE IF NOT EXISTS employee_target_audit (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        assignment_id BIGINT NULL,
        employee_id BIGINT NOT NULL,
        employee_name VARCHAR(150) NOT NULL,
        employee_role VARCHAR(20) NOT NULL,
        target_month INT NOT NULL,
        target_year INT NOT NULL,
        previous_daily_target DECIMAL(10, 2) NULL,
        new_daily_target DECIMAL(10, 2) NOT NULL,
        previous_monthly_target DECIMAL(12, 2) NULL,
        new_monthly_target DECIMAL(12, 2) NOT NULL,
        working_days INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        adjustment_reason TEXT NULL,
        performed_by VARCHAR(150) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY idx_target_audit_emp (employee_id, target_year, target_month)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    tableEnsured = true;
    return true;
  } catch (err) {
    console.warn("Could not ensure employee target tables in MySQL:", err);
    return false;
  }
}

/**
 * Retrieves employee target assignments with flexible filtering.
 */
export async function getEmployeeTargetAssignments(filters?: {
  role?: EmployeeRole;
  month?: number;
  year?: number;
  employee_id?: number;
  status?: string;
}): Promise<EmployeeTargetAssignmentRecord[]> {
  await ensureEmployeeTargetsTable();

  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.role) {
      conditions.push("employee_role = ?");
      params.push(filters.role);
    }
    if (filters?.month !== undefined) {
      conditions.push("target_month = ?");
      params.push(filters.month);
    }
    if (filters?.year !== undefined) {
      conditions.push("target_year = ?");
      params.push(filters.year);
    }
    if (filters?.employee_id !== undefined) {
      conditions.push("employee_id = ?");
      params.push(filters.employee_id);
    }
    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM employee_target_assignments ${whereSql} ORDER BY employee_name ASC, target_year DESC, target_month DESC`;

    const rows = await query<any>(sql, params);

    return (rows || []).map((r) => {
      const daily = Number(r.daily_target);
      const calculated = Number(r.calculated_monthly_target);
      const adjusted = r.adjusted_monthly_target !== null ? Number(r.adjusted_monthly_target) : null;
      const isAdjusted = Boolean(r.is_manually_adjusted);

      return {
        id: String(r.id),
        employee_id: Number(r.employee_id),
        employee_name: r.employee_name,
        employee_role: r.employee_role as EmployeeRole,
        target_month: Number(r.target_month),
        target_year: Number(r.target_year),
        working_days: Number(r.working_days),
        daily_target: daily,
        calculated_monthly_target: calculated,
        adjusted_monthly_target: adjusted,
        effective_monthly_target: isAdjusted && adjusted !== null ? adjusted : calculated,
        adjustment_reason: r.adjustment_reason,
        is_manually_adjusted: isAdjusted,
        quality_threshold_pct: Number(r.quality_threshold_pct ?? 95),
        effective_date: String(r.effective_date).split("T")[0],
        status: r.status,
        remarks: r.remarks,
        assigned_by: r.assigned_by,
        created_at: String(r.created_at),
        updated_at: String(r.updated_at),
      };
    });
  } catch (err) {
    console.error("Error querying employee target assignments from MySQL:", err);
    return [];
  }
}

/**
 * Gets specific target for an employee for given month and year.
 */
export async function getEmployeeTargetForMonth(
  employeeId: number,
  role: EmployeeRole,
  month: number,
  year: number
): Promise<EmployeeTargetAssignmentRecord | null> {
  const list = await getEmployeeTargetAssignments({ employee_id: employeeId, role, month, year });
  return list.length > 0 ? list[0] : null;
}

/**
 * Saves or updates an individual target assignment with calculations and audit trail.
 */
export async function saveEmployeeTargetAssignment(
  payload: SaveEmployeeTargetInput
): Promise<EmployeeTargetAssignmentRecord> {
  await ensureEmployeeTargetsTable();

  const workingDays = Math.max(1, payload.working_days || 22);
  const dailyTarget = Math.max(0.1, Number(payload.daily_target));
  const calculatedMonthly = Math.round(dailyTarget * workingDays * 100) / 100;

  const isAdjusted =
    payload.adjusted_monthly_target !== undefined &&
    payload.adjusted_monthly_target !== null &&
    payload.adjusted_monthly_target !== calculatedMonthly;

  const adjustedMonthly = isAdjusted ? Number(payload.adjusted_monthly_target) : null;
  const effectiveDate =
    payload.effective_date ||
    `${payload.target_year}-${String(payload.target_month).padStart(2, "0")}-01`;

  // Fetch previous target if existing
  const existing = await queryOne<any>(
    `SELECT * FROM employee_target_assignments 
     WHERE employee_id = ? AND employee_role = ? AND target_month = ? AND target_year = ? LIMIT 1`,
    [payload.employee_id, payload.employee_role, payload.target_month, payload.target_year]
  );

  const prevDaily = existing ? Number(existing.daily_target) : null;
  const prevMonthly = existing
    ? (existing.is_manually_adjusted && existing.adjusted_monthly_target !== null
        ? Number(existing.adjusted_monthly_target)
        : Number(existing.calculated_monthly_target))
    : null;

  const sql = `
    INSERT INTO employee_target_assignments (
      employee_id, employee_name, employee_role, target_month, target_year,
      working_days, daily_target, calculated_monthly_target, adjusted_monthly_target,
      adjustment_reason, is_manually_adjusted, quality_threshold_pct, effective_date,
      status, remarks, assigned_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))
    ON DUPLICATE KEY UPDATE
      employee_name = VALUES(employee_name),
      working_days = VALUES(working_days),
      daily_target = VALUES(daily_target),
      calculated_monthly_target = VALUES(calculated_monthly_target),
      adjusted_monthly_target = VALUES(adjusted_monthly_target),
      adjustment_reason = VALUES(adjustment_reason),
      is_manually_adjusted = VALUES(is_manually_adjusted),
      quality_threshold_pct = VALUES(quality_threshold_pct),
      effective_date = VALUES(effective_date),
      status = VALUES(status),
      remarks = VALUES(remarks),
      assigned_by = VALUES(assigned_by),
      updated_at = NOW(6)
  `;

  await execute(sql, [
    payload.employee_id,
    payload.employee_name,
    payload.employee_role,
    payload.target_month,
    payload.target_year,
    workingDays,
    dailyTarget,
    calculatedMonthly,
    adjustedMonthly,
    payload.adjustment_reason || null,
    isAdjusted ? 1 : 0,
    payload.quality_threshold_pct !== undefined ? Number(payload.quality_threshold_pct) : 95.0,
    effectiveDate,
    payload.status || "active",
    payload.remarks || null,
    payload.assigned_by,
  ]);

  const savedRecord = await queryOne<any>(
    `SELECT * FROM employee_target_assignments 
     WHERE employee_id = ? AND employee_role = ? AND target_month = ? AND target_year = ? LIMIT 1`,
    [payload.employee_id, payload.employee_role, payload.target_month, payload.target_year]
  );

  const finalEffectiveMonthly = isAdjusted && adjustedMonthly !== null ? adjustedMonthly : calculatedMonthly;

  // Insert Audit Record
  await execute(
    `INSERT INTO employee_target_audit (
      assignment_id, employee_id, employee_name, employee_role, target_month, target_year,
      previous_daily_target, new_daily_target, previous_monthly_target, new_monthly_target,
      working_days, action, adjustment_reason, performed_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [
      savedRecord?.id || null,
      payload.employee_id,
      payload.employee_name,
      payload.employee_role,
      payload.target_month,
      payload.target_year,
      prevDaily,
      dailyTarget,
      prevMonthly,
      finalEffectiveMonthly,
      workingDays,
      existing ? (isAdjusted ? "MANUAL_OVERRIDE" : "UPDATED") : "ASSIGNED",
      payload.adjustment_reason || (existing ? "Target updated" : "Initial target assignment"),
      payload.assigned_by,
    ]
  );

  return {
    id: String(savedRecord?.id ?? 1),
    employee_id: payload.employee_id,
    employee_name: payload.employee_name,
    employee_role: payload.employee_role,
    target_month: payload.target_month,
    target_year: payload.target_year,
    working_days: workingDays,
    daily_target: dailyTarget,
    calculated_monthly_target: calculatedMonthly,
    adjusted_monthly_target: adjustedMonthly,
    effective_monthly_target: finalEffectiveMonthly,
    adjustment_reason: payload.adjustment_reason || null,
    is_manually_adjusted: isAdjusted,
    quality_threshold_pct: payload.quality_threshold_pct !== undefined ? Number(payload.quality_threshold_pct) : 95.0,
    effective_date: effectiveDate,
    status: payload.status || "active",
    remarks: payload.remarks || null,
    assigned_by: payload.assigned_by,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Copies targets from previous month to target month for all employees of given role.
 */
export async function copyPreviousMonthTargets(params: {
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
  role?: EmployeeRole;
  performedBy: string;
}): Promise<{ copiedCount: number; skippedCount: number; errors: string[] }> {
  await ensureEmployeeTargetsTable();

  const sourceTargets = await getEmployeeTargetAssignments({
    month: params.fromMonth,
    year: params.fromYear,
    role: params.role,
    status: "active",
  });

  let copied = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const src of sourceTargets) {
    try {
      // Check if target for destination month already exists
      const existing = await getEmployeeTargetForMonth(
        src.employee_id,
        src.employee_role,
        params.toMonth,
        params.toYear
      );

      if (existing) {
        skipped++;
        continue;
      }

      await saveEmployeeTargetAssignment({
        employee_id: src.employee_id,
        employee_name: src.employee_name,
        employee_role: src.employee_role,
        target_month: params.toMonth,
        target_year: params.toYear,
        working_days: src.working_days,
        daily_target: src.daily_target,
        adjusted_monthly_target: null, // Reset manual adjustments for new month
        adjustment_reason: null,
        quality_threshold_pct: src.quality_threshold_pct,
        assigned_by: params.performedBy,
        remarks: `Copied from ${params.fromMonth}/${params.fromYear}`,
      });
      copied++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed copying target for ${src.employee_name}: ${msg}`);
    }
  }

  return { copiedCount: copied, skippedCount: skipped, errors };
}

/**
 * Retrieves audit log of employee target changes.
 */
export async function getEmployeeTargetAuditLog(filters?: {
  employee_id?: number;
  role?: EmployeeRole;
  limit?: number;
}): Promise<EmployeeTargetAuditRecord[]> {
  await ensureEmployeeTargetsTable();
  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.employee_id !== undefined) {
      conditions.push("employee_id = ?");
      params.push(filters.employee_id);
    }
    if (filters?.role) {
      conditions.push("employee_role = ?");
      params.push(filters.role);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters?.limit || 100;
    params.push(limit);

    const rows = await query<any>(
      `SELECT * FROM employee_target_audit ${whereSql} ORDER BY created_at DESC LIMIT ?`,
      params
    );

    return (rows || []).map((r) => ({
      id: String(r.id),
      assignment_id: r.assignment_id ? String(r.assignment_id) : null,
      employee_id: Number(r.employee_id),
      employee_name: r.employee_name,
      employee_role: r.employee_role as EmployeeRole,
      target_month: Number(r.target_month),
      target_year: Number(r.target_year),
      previous_daily_target: r.previous_daily_target !== null ? Number(r.previous_daily_target) : null,
      new_daily_target: Number(r.new_daily_target),
      previous_monthly_target: r.previous_monthly_target !== null ? Number(r.previous_monthly_target) : null,
      new_monthly_target: Number(r.new_monthly_target),
      working_days: Number(r.working_days),
      action: r.action,
      adjustment_reason: r.adjustment_reason,
      performed_by: r.performed_by,
      created_at: String(r.created_at),
    }));
  } catch (err) {
    console.error("Error fetching employee target audit log:", err);
    return [];
  }
}

