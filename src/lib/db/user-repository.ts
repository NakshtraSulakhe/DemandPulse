import fs from "fs";
import path from "path";
import crypto from "crypto";
import { query, queryOne, execute, isDatabaseConfigured } from "@/lib/db";

export type UserRole = "admin" | "operations";

export interface AppUser {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SafeAppUser = Omit<AppUser, "password_hash">;

const BACKUP_USERS_FILE = path.join(process.cwd(), "data", "slide-users.json");

/**
 * Deterministic salted SHA-256 password hash.
 * Salt format matches MySQL SHA2(CONCAT('df_salt_2026_pulse:', password), 256),
 * allowing direct server-side database updates using native MySQL SQL statements.
 */
export function hashPassword(password: string): string {
  const salt = "df_salt_2026_pulse:";
  const hash = crypto.createHash("sha256").update(salt + password).digest("hex");
  return `sha256:${hash}`;
}

/**
 * Verifies a password against stored database hash.
 * Checks both standard salted SHA-256 and HMAC-SHA256.
 * Zero hardcoded fallback credentials.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;

  const cleanStored = storedHash.trim();
  const salt = "df_salt_2026_pulse:";

  // Check 1: Salted SHA-256 (matches MySQL SHA2(CONCAT('df_salt_2026_pulse:', password), 256))
  const computedSha256 = crypto.createHash("sha256").update(salt + password).digest("hex");
  if (cleanStored === `sha256:${computedSha256}` || cleanStored === computedSha256) {
    return true;
  }

  // Check 2: Salted HMAC-SHA256 (for previous hashes)
  const hmacSalt = "df_salt_2026_pulse";
  const computedHmac = crypto.createHmac("sha256", hmacSalt).update(password).digest("hex");
  if (cleanStored === `sha256:${computedHmac}` || cleanStored === computedHmac) {
    return true;
  }

  return false;
}

function sanitizeUser(user: AppUser): SafeAppUser {
  const { password_hash, ...safe } = user;
  return safe;
}

function readUsersFromFile(): AppUser[] {
  try {
    if (fs.existsSync(BACKUP_USERS_FILE)) {
      const data = fs.readFileSync(BACKUP_USERS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[user-repository] Failed to read users from backup file:", err);
  }
  return [];
}

function writeUsersToFile(users: AppUser[]): void {
  try {
    const dir = path.dirname(BACKUP_USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BACKUP_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.warn("[user-repository] Failed to persist users to backup file:", err);
  }
}

let schemaChecked = false;

export async function ensureUserSchema(): Promise<void> {
  if (schemaChecked) return;
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS \`slide_app_users\` (
        \`id\` VARCHAR(80) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL,
        \`username\` VARCHAR(100) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`display_name\` VARCHAR(150) NOT NULL,
        \`role\` ENUM('admin', 'operations') NOT NULL DEFAULT 'operations',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_app_user_email\` (\`email\`),
        UNIQUE KEY \`uniq_app_user_username\` (\`username\`),
        KEY \`idx_app_user_role_status\` (\`role\`, \`is_active\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Verify existing columns in case table was created with older schema
    const cols = await query<any>("SHOW COLUMNS FROM `slide_app_users`");
    const colNames = cols.map((c) => String(c.Field || "").toLowerCase());

    if (!colNames.includes("username")) {
      await execute("ALTER TABLE `slide_app_users` ADD COLUMN `username` VARCHAR(100) NOT NULL UNIQUE AFTER `email`");
    }
    if (!colNames.includes("password_hash")) {
      await execute("ALTER TABLE `slide_app_users` ADD COLUMN `password_hash` VARCHAR(255) NOT NULL AFTER `username`");
    }
    if (!colNames.includes("role")) {
      await execute("ALTER TABLE `slide_app_users` ADD COLUMN `role` ENUM('admin', 'operations') NOT NULL DEFAULT 'operations' AFTER `display_name`");
    }

    schemaChecked = true;
  } catch (err) {
    console.warn("[user-repository] Database schema initialization deferred, using file fallback:", err);
  }
}

/**
 * Retrieve all users (without password hashes)
 */
export async function getAllUsers(): Promise<SafeAppUser[]> {
  try {
    await ensureUserSchema();
    const rows = await query<any>(
      `SELECT id, email, username, display_name, role, is_active, created_at, updated_at 
       FROM slide_app_users ORDER BY created_at ASC`
    );
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: String(r.id),
        email: String(r.email),
        username: String(r.username),
        display_name: String(r.display_name),
        role: (r.role as UserRole) || "operations",
        is_active: Boolean(r.is_active),
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      }));
    }
  } catch (err) {
    console.warn("[user-repository] getAllUsers DB query failed, using file fallback:", err);
  }

  const fileUsers = readUsersFromFile();
  return fileUsers.map(sanitizeUser);
}

/**
 * Find user by email or username (includes password_hash for authentication)
 */
export async function getUserByEmailOrUsername(identifier: string): Promise<AppUser | null> {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  try {
    await ensureUserSchema();
    const row = await queryOne<any>(
      `SELECT id, email, username, password_hash, display_name, role, is_active, created_at, updated_at 
       FROM slide_app_users 
       WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1`,
      [clean, clean]
    );

    if (row) {
      return {
        id: String(row.id),
        email: String(row.email),
        username: String(row.username),
        password_hash: String(row.password_hash),
        display_name: String(row.display_name),
        role: (row.role as UserRole) || "operations",
        is_active: Boolean(row.is_active),
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString(),
      };
    }
  } catch (err) {
    console.warn("[user-repository] getUserByEmailOrUsername DB query failed, using file fallback:", err);
  }

  // Fallback to file users
  const fileUsers = readUsersFromFile();
  const match = fileUsers.find(
    (u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
  );
  if (match) return match;

  return null;
}

/**
 * Create a new application user (Admin only)
 */
export async function createUser(data: {
  email: string;
  username: string;
  password: string;
  display_name: string;
  role: UserRole;
}): Promise<SafeAppUser> {
  const emailClean = data.email.trim().toLowerCase();
  const usernameClean = data.username.trim().toLowerCase();
  const now = new Date().toISOString();
  const id = `usr-${data.role}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = hashPassword(data.password);

  const newUser: AppUser = {
    id,
    email: emailClean,
    username: usernameClean,
    password_hash: passwordHash,
    display_name: data.display_name.trim(),
    role: data.role === "admin" ? "admin" : "operations",
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  // 1. Try DB
  let dbSuccess = false;
  try {
    await ensureUserSchema();
    await execute(
      `INSERT INTO slide_app_users (id, email, username, password_hash, display_name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [newUser.id, newUser.email, newUser.username, newUser.password_hash, newUser.display_name, newUser.role]
    );
    dbSuccess = true;
  } catch (err: any) {
    console.error("[user-repository] createUser DB insert failed:", err?.message || err);
    if (isDatabaseConfigured()) {
      throw new Error(`Database error saving user: ${err?.message || "Insert failed"}`);
    }
  }

  // 2. Sync to file
  const fileUsers = readUsersFromFile();
  // Check if duplicate in file
  const filtered = fileUsers.filter(
    (u) => u.email.toLowerCase() !== emailClean && u.username.toLowerCase() !== usernameClean
  );
  filtered.push(newUser);
  writeUsersToFile(filtered);

  return sanitizeUser(newUser);
}

/**
 * Toggle or update an application user (Admin only)
 */
export async function updateUser(
  id: string,
  updates: Partial<Pick<AppUser, "display_name" | "role" | "is_active">> & { password?: string }
): Promise<SafeAppUser | null> {
  const now = new Date().toISOString();
  let updatedRecord: AppUser | null = null;

  // 1. Try DB
  try {
    await ensureUserSchema();
    const setClauses: string[] = ["updated_at = NOW()"];
    const params: any[] = [];

    if (updates.display_name !== undefined) {
      setClauses.push("display_name = ?");
      params.push(updates.display_name.trim());
    }
    if (updates.role !== undefined) {
      setClauses.push("role = ?");
      params.push(updates.role);
    }
    if (updates.is_active !== undefined) {
      setClauses.push("is_active = ?");
      params.push(updates.is_active ? 1 : 0);
    }
    if (updates.password && updates.password.trim().length > 0) {
      setClauses.push("password_hash = ?");
      params.push(hashPassword(updates.password));
    }

    params.push(id);
    await execute(`UPDATE slide_app_users SET ${setClauses.join(", ")} WHERE id = ?`, params);
  } catch (err: any) {
    console.error("[user-repository] updateUser DB update failed:", err?.message || err);
    if (isDatabaseConfigured()) {
      throw new Error(`Database error updating user: ${err?.message || "Update failed"}`);
    }
  }

  // 2. Sync to file
  const fileUsers = readUsersFromFile();
  const index = fileUsers.findIndex((u) => u.id === id);
  if (index !== -1) {
    const existing = fileUsers[index];
    fileUsers[index] = {
      ...existing,
      display_name: updates.display_name !== undefined ? updates.display_name.trim() : existing.display_name,
      role: updates.role !== undefined ? updates.role : existing.role,
      is_active: updates.is_active !== undefined ? updates.is_active : existing.is_active,
      password_hash: updates.password ? hashPassword(updates.password) : existing.password_hash,
      updated_at: now,
    };
    writeUsersToFile(fileUsers);
    updatedRecord = fileUsers[index];
  }

  if (updatedRecord) {
    return sanitizeUser(updatedRecord);
  }

  // If not found in file, try refetching
  const refreshed = await getUserByEmailOrUsername(id);
  return refreshed ? sanitizeUser(refreshed) : null;
}

/**
 * Delete an application user (cannot delete default admin)
 */
export async function deleteUser(id: string): Promise<boolean> {
  if (id === "usr-admin-1" || id === "admin" || id === "usr-admin-master") {
    throw new Error("Default System Administrator cannot be deleted.");
  }

  try {
    await ensureUserSchema();
    await execute("DELETE FROM slide_app_users WHERE id = ?", [id]);
  } catch (err: any) {
    console.error("[user-repository] deleteUser DB delete failed:", err?.message || err);
    if (isDatabaseConfigured()) {
      throw new Error(`Database error deleting user: ${err?.message || "Delete failed"}`);
    }
  }

  const fileUsers = readUsersFromFile();
  const filtered = fileUsers.filter((u) => u.id !== id && u.username !== id);
  writeUsersToFile(filtered);

  return true;
}

