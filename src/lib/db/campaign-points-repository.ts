import { query, queryOne, execute, serializeDbData } from "@/lib/db";

export type ProductivityDepartment = "ALL" | "Agent" | "QA";

export interface ProductivityPointConfigItem {
  id: string;
  activity_type: string;
  display_name: string;
  department: ProductivityDepartment;
  points_factor: number;
  description: string | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  version: number;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductivityPointAuditItem {
  id: string;
  config_id: string | null;
  activity_type: string;
  department: ProductivityDepartment;
  previous_points: number | null;
  new_points: number;
  action: string;
  performed_by: string;
  remarks: string | null;
  created_at: string;
}

export const DEFAULT_PRODUCTIVITY_POINTS: Omit<ProductivityPointConfigItem, "id" | "created_at" | "updated_at">[] = [
  {
    activity_type: "email_marketing",
    display_name: "Email Marketing",
    department: "ALL",
    points_factor: 0.25,
    description: "Standard email marketing lead qualification: 0.25 points per lead",
    effective_from: "2026-01-01",
    effective_to: null,
    is_active: true,
    version: 1,
    updated_by: "System Reference",
  },
  {
    activity_type: "mql",
    display_name: "MQL",
    department: "ALL",
    points_factor: 1.0,
    description: "Marketing Qualified Lead: 1.0 point per lead",
    effective_from: "2026-01-01",
    effective_to: null,
    is_active: true,
    version: 1,
    updated_by: "System Reference",
  },
  {
    activity_type: "hql_callback",
    display_name: "HQL / Callback",
    department: "ALL",
    points_factor: 2.0,
    description: "High Quality Lead / Verified Callback: 2.0 points per lead",
    effective_from: "2026-01-01",
    effective_to: null,
    is_active: true,
    version: 1,
    updated_by: "System Reference",
  },
  {
    activity_type: "bant",
    display_name: "BANT",
    department: "ALL",
    points_factor: 3.0,
    description: "Budget, Authority, Need, Timeline Qualified Lead: 3.0 points per lead",
    effective_from: "2026-01-01",
    effective_to: null,
    is_active: true,
    version: 1,
    updated_by: "System Reference",
  },
  {
    activity_type: "appointment_generation",
    display_name: "Appointment Generation",
    department: "ALL",
    points_factor: 5.0,
    description: "Confirmed Client Appointment Generated: 5.0 points per lead",
    effective_from: "2026-01-01",
    effective_to: null,
    is_active: true,
    version: 1,
    updated_by: "System Reference",
  },
];

let tablesEnsured = false;

export async function ensureProductivityPointsTable(): Promise<boolean> {
  if (tablesEnsured) return true;
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS productivity_point_configs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        activity_type VARCHAR(100) NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        department VARCHAR(20) NOT NULL DEFAULT 'ALL',
        points_factor DECIMAL(8, 3) NOT NULL DEFAULT 1.000,
        description VARCHAR(255) NULL,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        version INT NOT NULL DEFAULT 1,
        updated_by VARCHAR(150) NOT NULL DEFAULT 'System Initialization',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uniq_activity_dept_version (activity_type, department, version),
        KEY idx_activity_active_dates (department, is_active, effective_from, effective_to)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Backwards-compatible column additions for existing installations
    try {
      await execute(`ALTER TABLE productivity_point_configs ADD COLUMN department VARCHAR(20) NOT NULL DEFAULT 'ALL' AFTER display_name`);
    } catch {
      // Column already exists
    }

    try {
      await execute(`ALTER TABLE productivity_point_configs DROP INDEX uniq_activity_version`);
    } catch {
      // Already dropped or doesn't exist
    }

    try {
      await execute(`ALTER TABLE productivity_point_configs ADD UNIQUE KEY uniq_activity_dept_version (activity_type, department, version)`);
    } catch {
      // Key already exists
    }

    await execute(`
      CREATE TABLE IF NOT EXISTS productivity_point_audit (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        config_id BIGINT NULL,
        activity_type VARCHAR(100) NOT NULL,
        department VARCHAR(20) NOT NULL DEFAULT 'ALL',
        previous_points DECIMAL(8, 3) NULL,
        new_points DECIMAL(8, 3) NOT NULL,
        action VARCHAR(50) NOT NULL,
        performed_by VARCHAR(150) NOT NULL,
        remarks TEXT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY idx_ppa_activity (activity_type, department, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await execute(`ALTER TABLE productivity_point_audit ADD COLUMN department VARCHAR(20) NOT NULL DEFAULT 'ALL' AFTER activity_type`);
    } catch {
      // Column already exists
    }

    // Check if initial seed is needed
    const existing = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM productivity_point_configs`
    );

    if (!existing || Number(existing.count) === 0) {
      for (const item of DEFAULT_PRODUCTIVITY_POINTS) {
        await execute(
          `INSERT INTO productivity_point_configs 
            (activity_type, display_name, department, points_factor, description, effective_from, is_active, version, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)`,
          [
            item.activity_type,
            item.display_name,
            item.department || "ALL",
            item.points_factor,
            item.description,
            item.effective_from,
            item.is_active ? 1 : 0,
            item.version,
            item.updated_by,
          ]
        );
      }
    }

    tablesEnsured = true;
    return true;
  } catch (err) {
    console.warn("Could not ensure productivity points tables in MySQL:", err);
    return false;
  }
}

/**
 * Retrieves productivity point configurations, optionally filtered by department.
 */
export async function getProductivityPointConfigs(
  includeInactive = false,
  department?: ProductivityDepartment
): Promise<ProductivityPointConfigItem[]> {
  await ensureProductivityPointsTable();
  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (!includeInactive) {
      conditions.push("is_active = 1");
    }

    if (department && department !== "ALL") {
      conditions.push("(department = ? OR department = 'ALL')");
      params.push(department);
    } else if (department === "ALL") {
      conditions.push("department = 'ALL'");
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await query<any>(
      `SELECT * FROM productivity_point_configs ${whereClause} ORDER BY department ASC, points_factor ASC, id ASC`,
      params
    );

    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: String(r.id),
        activity_type: r.activity_type,
        display_name: r.display_name,
        department: (r.department || "ALL") as ProductivityDepartment,
        points_factor: Number(r.points_factor),
        description: r.description,
        effective_from: String(r.effective_from).split("T")[0],
        effective_to: r.effective_to ? String(r.effective_to).split("T")[0] : null,
        is_active: Boolean(r.is_active),
        version: Number(r.version),
        updated_by: r.updated_by,
        created_at: String(r.created_at),
        updated_at: String(r.updated_at),
      }));
    }
  } catch (err) {
    console.error("Error fetching productivity points from MySQL:", err);
  }

  // Fallback to defaults
  return DEFAULT_PRODUCTIVITY_POINTS.map((d, idx) => ({
    ...d,
    id: `default-${idx + 1}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

/**
 * Returns a normalized key-value mapping of activity names and variants to their points.
 * If department ('QA' or 'Agent') is specified, department-specific rules override 'ALL' (global) defaults.
 */
export async function getProductivityPointsMap(
  department?: "Agent" | "QA"
): Promise<Record<string, number>> {
  await ensureProductivityPointsTable();
  const map: Record<string, number> = {};

  try {
    let rows: any[] = [];
    if (department) {
      // Order 'ALL' first so department-specific rules override global ones
      rows = await query<any>(
        `SELECT * FROM productivity_point_configs 
         WHERE is_active = 1 AND department IN ('ALL', ?)
         ORDER BY CASE WHEN department = 'ALL' THEN 1 ELSE 2 END ASC, id ASC`,
        [department]
      );
    } else {
      rows = await query<any>(
        `SELECT * FROM productivity_point_configs 
         WHERE is_active = 1 
         ORDER BY CASE WHEN department = 'ALL' THEN 1 ELSE 2 END ASC, id ASC`
      );
    }

    if (rows && rows.length > 0) {
      for (const c of rows) {
        const factor = Number(c.points_factor);
        const actType = (c.activity_type || "").trim().toLowerCase();
        const dispName = (c.display_name || "").trim().toLowerCase();

        if (actType) {
          map[actType] = factor;
          map[actType.replace(/_/g, " ")] = factor;
        }
        if (dispName) {
          map[dispName] = factor;
          map[dispName.replace(/\s+/g, "_")] = factor;
        }

        // Normalizations
        if (actType === "voice_mail" || dispName === "voice mail" || dispName === "voicemail") {
          map["voice_mail"] = factor;
          map["voice mail"] = factor;
          map["voice-mail"] = factor;
          map["voicemail"] = factor;
        }
        if (actType === "email_marketing" || dispName === "email marketing") {
          map["email_marketing"] = factor;
          map["email marketing"] = factor;
          map["email"] = factor;
        }
        if (actType === "mql") {
          map["marketing qualified lead"] = factor;
          map["marketing qualified leads"] = factor;
        }
        if (actType === "hql_callback") {
          map["hql / callback"] = factor;
          map["hql/callback"] = factor;
          map["hql"] = factor;
          map["callback"] = factor;
        }
        if (actType === "appointment_generation") {
          map["appointment generation"] = factor;
          map["appointment setting"] = factor;
          map["appointment"] = factor;
        }
      }
      return map;
    }
  } catch (err) {
    console.error("Error generating productivity points map:", err);
  }

  // Fallback defaults
  for (const c of DEFAULT_PRODUCTIVITY_POINTS) {
    map[c.activity_type.toLowerCase()] = c.points_factor;
    map[c.display_name.toLowerCase()] = c.points_factor;
  }
  return map;
}

/**
 * Creates or updates an activity point configuration with full versioning and audit record.
 * Scoped to specific department ('ALL', 'Agent', or 'QA').
 */
export async function saveProductivityPointConfig(payload: {
  activity_type: string;
  display_name: string;
  department?: ProductivityDepartment;
  points_factor: number;
  description?: string | null;
  effective_from?: string;
  is_active?: boolean;
  performed_by: string;
  remarks?: string;
}): Promise<ProductivityPointConfigItem> {
  await ensureProductivityPointsTable();

  const activityType = payload.activity_type.trim().toLowerCase().replace(/\s+/g, "_");
  const displayName = payload.display_name.trim();
  const department = payload.department || "ALL";
  const pointsFactor = Number(payload.points_factor);
  const effectiveFrom = payload.effective_from || new Date().toISOString().split("T")[0];
  const isActive = payload.is_active !== undefined ? payload.is_active : true;

  // Find previous active record for this activity_type and department
  const existing = await queryOne<any>(
    `SELECT * FROM productivity_point_configs 
     WHERE activity_type = ? AND department = ? AND is_active = 1 
     ORDER BY version DESC LIMIT 1`,
    [activityType, department]
  );

  let newVersion = 1;
  let previousPoints: number | null = null;

  if (existing) {
    newVersion = Number(existing.version) + 1;
    previousPoints = Number(existing.points_factor);

    // Deactivate previous version to maintain immutability of historical periods
    await execute(
      `UPDATE productivity_point_configs SET is_active = 0, effective_to = ? WHERE id = ?`,
      [effectiveFrom, existing.id]
    );
  }

  const insertSql = `
    INSERT INTO productivity_point_configs
      (activity_type, display_name, department, points_factor, description, effective_from, is_active, version, updated_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))
  `;

  const res = await execute(insertSql, [
    activityType,
    displayName,
    department,
    pointsFactor,
    payload.description || null,
    effectiveFrom,
    isActive ? 1 : 0,
    newVersion,
    payload.performed_by,
  ]);

  const insertedId = (res as any)?.insertId || (existing?.id ?? 1);

  // Write Audit Log
  await execute(
    `INSERT INTO productivity_point_audit 
      (config_id, activity_type, department, previous_points, new_points, action, performed_by, remarks, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
    [
      insertedId,
      activityType,
      department,
      previousPoints,
      pointsFactor,
      existing ? "UPDATED" : "CREATED",
      payload.performed_by,
      payload.remarks || `[${department}] Point factor set to ${pointsFactor}`,
    ]
  );

  return {
    id: String(insertedId),
    activity_type: activityType,
    display_name: displayName,
    department,
    points_factor: pointsFactor,
    description: payload.description || null,
    effective_from: effectiveFrom,
    effective_to: null,
    is_active: isActive,
    version: newVersion,
    updated_by: payload.performed_by,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Retrieves point configuration audit trail.
 */
export async function getPointsAuditLog(limit = 100): Promise<ProductivityPointAuditItem[]> {
  await ensureProductivityPointsTable();
  try {
    const rows = await query<any>(
      `SELECT * FROM productivity_point_audit ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return (rows || []).map((r) => ({
      id: String(r.id),
      config_id: r.config_id ? String(r.config_id) : null,
      activity_type: r.activity_type,
      department: (r.department || "ALL") as ProductivityDepartment,
      previous_points: r.previous_points !== null ? Number(r.previous_points) : null,
      new_points: Number(r.new_points),
      action: r.action,
      performed_by: r.performed_by,
      remarks: r.remarks,
      created_at: String(r.created_at),
    }));
  } catch (err) {
    console.error("Error fetching productivity points audit log:", err);
    return [];
  }
}

