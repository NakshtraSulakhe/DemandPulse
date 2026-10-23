import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

export interface CampaignDailyAllocationRecord {
  allocation_id: number;
  campaign_id: number;
  campaign_name: string;
  client_code: string;
  business_date: string; // YYYY-MM-DD (US Eastern)
  daily_target: number;
  monthly_allocation: number;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  allocation_status: string;
  notes: string;
}

export interface CampaignAllocationAuditRecord {
  audit_id: number;
  allocation_id: number | null;
  campaign_id: number;
  campaign_name: string | null;
  client_code: string | null;
  business_date: string;
  previous_target: number | null;
  new_target: number;
  changed_by: string;
  change_timestamp: string;
  operation_type: "INSERT" | "UPDATE" | "BULK_UPDATE";
  relevant_audit_details: string | null;
  notes: string;
}

export interface SaveAllocationInput {
  campaign_id: number;
  daily_target: number;
  campaign_name?: string | null;
  client_code?: string | null;
  monthly_allocation?: number | null;
  notes?: string | null;
}

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join("/tmp", "demandpulse-data");
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch {}
    }
    return tmpDir;
  }
  const localDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {}
  }
  return localDir;
}

function getDbPath(): string {
  const dir = getDataDir();
  const dbPath = path.join(dir, "demandpulse.db");
  if ((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) && !fs.existsSync(dbPath)) {
    const bundledDb = path.join(process.cwd(), "data", "demandpulse.db");
    if (fs.existsSync(bundledDb)) {
      try {
        fs.copyFileSync(bundledDb, dbPath);
      } catch {}
    }
  }
  return dbPath;
}

function getBackupJsonPath(): string {
  return path.join(getDataDir(), "campaign-allocations-backup.json");
}

let dbInstance: DatabaseSync | null = null;

/**
 * Initializes and returns the SQLite database singleton with tables and indexes.
 */
export function getAllocationsDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new DatabaseSync(getDbPath());

  // Enable WAL mode for concurrent performance & safety
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  // Create campaign_daily_allocations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_daily_allocations (
      allocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      campaign_name TEXT NOT NULL,
      client_code TEXT NOT NULL,
      business_date TEXT NOT NULL,
      daily_target INTEGER NOT NULL DEFAULT 0,
      monthly_allocation INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL DEFAULT 'Admin User',
      created_at TEXT NOT NULL,
      updated_by TEXT NOT NULL DEFAULT 'Admin User',
      updated_at TEXT NOT NULL,
      allocation_status TEXT NOT NULL DEFAULT 'active',
      notes TEXT DEFAULT '',
      CONSTRAINT uq_campaign_business_date UNIQUE (campaign_id, business_date)
    );

    CREATE INDEX IF NOT EXISTS idx_allocations_business_date ON campaign_daily_allocations(business_date);
    CREATE INDEX IF NOT EXISTS idx_allocations_campaign_date ON campaign_daily_allocations(campaign_id, business_date);
    CREATE INDEX IF NOT EXISTS idx_allocations_client_code ON campaign_daily_allocations(client_code);

    CREATE TABLE IF NOT EXISTS campaign_allocation_audit (
      audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      allocation_id INTEGER,
      campaign_id INTEGER NOT NULL,
      campaign_name TEXT,
      client_code TEXT,
      business_date TEXT NOT NULL,
      previous_target INTEGER,
      new_target INTEGER NOT NULL,
      changed_by TEXT NOT NULL DEFAULT 'Admin User',
      change_timestamp TEXT NOT NULL,
      operation_type TEXT NOT NULL DEFAULT 'UPDATE',
      relevant_audit_details TEXT,
      notes TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_audit_campaign ON campaign_allocation_audit(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_audit_date ON campaign_allocation_audit(business_date);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON campaign_allocation_audit(change_timestamp);
  `);

  dbInstance = db;
  return dbInstance;
}

/**
 * Backs up all allocations to JSON for high-durability persistence across builds.
 */
function backupToJson(allocations: CampaignDailyAllocationRecord[]) {
  try {
    fs.writeFileSync(getBackupJsonPath(), JSON.stringify(allocations, null, 2), "utf-8");
  } catch {
    // Non-fatal backup warning
  }
}

/**
 * Retrieves all saved allocations for a specific US Eastern business date.
 */
export function getAllocationsForDate(businessDate: string): CampaignDailyAllocationRecord[] {
  const db = getAllocationsDb();
  const stmt = db.prepare(`
    SELECT * FROM campaign_daily_allocations
    WHERE business_date = ?
    ORDER BY campaign_name ASC
  `);
  const rows = stmt.all(businessDate) as unknown as CampaignDailyAllocationRecord[];
  return rows;
}

/**
 * Retrieves a map of saved daily targets keyed by campaign_id for a given business date.
 */
export function getAllocationsMapForDate(businessDate: string): Map<number, CampaignDailyAllocationRecord> {
  const list = getAllocationsForDate(businessDate);
  const map = new Map<number, CampaignDailyAllocationRecord>();
  for (const item of list) {
    map.set(item.campaign_id, item);
  }
  return map;
}

/**
 * Retrieves only positive allocations (daily_target > 0) for a given business date.
 * Used to filter campaigns for the Live Presentation Dashboard.
 */
export function getPositiveAllocationsForDate(businessDate: string): CampaignDailyAllocationRecord[] {
  const db = getAllocationsDb();
  const stmt = db.prepare(`
    SELECT * FROM campaign_daily_allocations
    WHERE business_date = ? AND daily_target > 0
    ORDER BY campaign_name ASC
  `);
  return stmt.all(businessDate) as unknown as CampaignDailyAllocationRecord[];
}

/**
 * Saves a batch of campaign daily target allocations within a single database transaction.
 * Creates audit records for each changed allocation.
 * Enforces UNIQUE (campaign_id, business_date).
 */
export function saveAllocationsBatch(
  businessDate: string,
  targets: SaveAllocationInput[],
  changedBy: string = "Admin User"
): {
  ok: boolean;
  saved_count: number;
  allocations: CampaignDailyAllocationRecord[];
  message: string;
} {
  const db = getAllocationsDb();
  const now = new Date().toISOString();

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    throw new Error(`Invalid business date format: "${businessDate}". Must be YYYY-MM-DD.`);
  }

  // Validate all inputs before beginning transaction
  for (const t of targets) {
    if (!Number.isInteger(t.campaign_id) || t.campaign_id <= 0) {
      throw new Error(`Invalid campaign_id: ${t.campaign_id}`);
    }
    if (!Number.isInteger(t.daily_target) || t.daily_target < 0) {
      throw new Error(
        `Invalid daily_target for campaign #${t.campaign_id}: ${t.daily_target}. Target must be an integer >= 0.`
      );
    }
  }

  // Execute in an atomic transaction
  db.exec("BEGIN TRANSACTION;");

  try {
    const selectStmt = db.prepare(`
      SELECT * FROM campaign_daily_allocations
      WHERE campaign_id = ? AND business_date = ?
    `);

    const insertStmt = db.prepare(`
      INSERT INTO campaign_daily_allocations (
        campaign_id, campaign_name, client_code, business_date,
        daily_target, monthly_allocation, created_by, created_at,
        updated_by, updated_at, allocation_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE campaign_daily_allocations
      SET daily_target = ?,
          campaign_name = COALESCE(NULLIF(?, ''), campaign_name),
          client_code = COALESCE(NULLIF(?, ''), client_code),
          monthly_allocation = CASE WHEN ? > 0 THEN ? ELSE monthly_allocation END,
          updated_by = ?,
          updated_at = ?,
          notes = COALESCE(?, notes)
      WHERE allocation_id = ?
    `);

    const auditStmt = db.prepare(`
      INSERT INTO campaign_allocation_audit (
        allocation_id, campaign_id, campaign_name, client_code,
        business_date, previous_target, new_target, changed_by,
        change_timestamp, operation_type, relevant_audit_details, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let savedCount = 0;

    for (const t of targets) {
      const existing = selectStmt.get(t.campaign_id, businessDate) as unknown as CampaignDailyAllocationRecord | undefined;
      const campaignName = t.campaign_name || existing?.campaign_name || `Campaign #${t.campaign_id}`;
      const clientCode = t.client_code || existing?.client_code || "N/A";
      const monthlyAlloc = t.monthly_allocation ?? existing?.monthly_allocation ?? 0;
      const notes = t.notes !== undefined ? (t.notes || "") : (existing?.notes || "");

      if (existing) {
        // Update existing record
        const previousTarget = existing.daily_target;
        const newTarget = t.daily_target;

        updateStmt.run(
          newTarget,
          campaignName,
          clientCode,
          monthlyAlloc,
          monthlyAlloc,
          changedBy,
          now,
          notes,
          existing.allocation_id
        );

        auditStmt.run(
          existing.allocation_id,
          t.campaign_id,
          campaignName,
          clientCode,
          businessDate,
          previousTarget,
          newTarget,
          changedBy,
          now,
          "UPDATE",
          JSON.stringify({
            previous_target: previousTarget,
            new_target: newTarget,
            monthly_allocation: monthlyAlloc,
          }),
          notes
        );

        savedCount++;
      } else {
        // Insert new record
        const res = insertStmt.run(
          t.campaign_id,
          campaignName,
          clientCode,
          businessDate,
          t.daily_target,
          monthlyAlloc,
          changedBy,
          now,
          changedBy,
          now,
          notes
        );

        const allocationId = Number(res.lastInsertRowid);

        auditStmt.run(
          allocationId,
          t.campaign_id,
          campaignName,
          clientCode,
          businessDate,
          null,
          t.daily_target,
          changedBy,
          now,
          "INSERT",
          JSON.stringify({
            previous_target: null,
            new_target: t.daily_target,
            monthly_allocation: monthlyAlloc,
          }),
          notes
        );

        savedCount++;
      }
    }

    db.exec("COMMIT;");

    // Fetch refreshed records for this business date
    const updatedAllocations = getAllocationsForDate(businessDate);
    backupToJson(updatedAllocations);

    return {
      ok: true,
      saved_count: savedCount,
      allocations: updatedAllocations,
      message: `Daily campaign allocations saved successfully. (${savedCount} target(s) persisted for ${businessDate})`,
    };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

/**
 * Retrieves audit history records for allocations.
 */
export function getAllocationAuditHistory(filters?: {
  business_date?: string;
  campaign_id?: number;
  client_code?: string;
  from?: string;
  to?: string;
  limit?: number;
}): CampaignAllocationAuditRecord[] {
  const db = getAllocationsDb();
  let query = "SELECT * FROM campaign_allocation_audit WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.business_date) {
    query += " AND business_date = ?";
    params.push(filters.business_date);
  }
  if (filters?.campaign_id) {
    query += " AND campaign_id = ?";
    params.push(filters.campaign_id);
  }
  if (filters?.client_code) {
    query += " AND client_code = ?";
    params.push(filters.client_code);
  }
  if (filters?.from) {
    query += " AND business_date >= ?";
    params.push(filters.from);
  }
  if (filters?.to) {
    query += " AND business_date <= ?";
    params.push(filters.to);
  }

  query += " ORDER BY change_timestamp DESC, audit_id DESC";

  if (filters?.limit && filters.limit > 0) {
    query += " LIMIT ?";
    params.push(filters.limit);
  } else {
    query += " LIMIT 200";
  }

  const stmt = db.prepare(query);
  return stmt.all(...params) as unknown as CampaignAllocationAuditRecord[];
}
