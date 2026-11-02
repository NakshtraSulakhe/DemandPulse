import { PrismaClient } from "@prisma/client";

const DEFAULT_DB_NAME = "u449458970_demandpulse";
const DEFAULT_HOST = "auth-db1274.hstgr.io";
const DEFAULT_USER = "u449458970_demandpulse";
const DEFAULT_PASS = "TaRajGlobal@2026#";
const DEFAULT_PORT = "3306";

/**
 * Safely cleans environment variable values:
 * 1. Preserves secret characters (like '#' in passwords) while safely stripping quotes
 * 2. Removes trailing comments (# or //) only when outside quotes and not a secret
 * 3. Trims surrounding whitespace and quotes
 */
function cleanEnvVal(raw?: string | null, isSecret = false): string {
  if (raw === undefined || raw === null) return "";
  let val = String(raw).trim();
  if (!val) return "";

  // If value is wrapped in quotes, extract inner content without stripping inner '#'
  const quoteMatch = val.match(/^(['"])(.*)\1(?:\s*(?:#|\/\/).*)?$/);
  if (quoteMatch) {
    return quoteMatch[2].trim();
  }

  // If not quoted, strip trailing inline comments only for non-secret fields
  if (!isSecret) {
    val = val.replace(/\s+(?:#|\/\/).*$/, "").trim();
  }

  // Strip any remaining surrounding quotes
  val = val.replace(/^["']+|["']+$/g, "").trim();
  return val;
}

/**
 * Synthesizes a valid MySQL connection string strictly from discrete credentials
 * configured in the environment (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT).
 * Falls back to authoritative Hostinger production settings if any variable is omitted.
 */
function buildUrlFromDbCredentials(): string {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

  // 1. Host resolution
  let rawHost = cleanEnvVal(
    process.env.DB_HOST ||
    process.env.MYSQL_HOST ||
    process.env.DATABASE_HOST ||
    process.env.DBHOST ||
    process.env.DB_HOSTNAME ||
    ""
  );

  if (isVercel && (rawHost === "localhost" || rawHost === "127.0.0.1")) {
    console.warn("[db.ts] Localhost DB_HOST ignored in Vercel environment; using remote Hostinger host.");
    rawHost = "";
  }
  let host = rawHost || DEFAULT_HOST;

  // 2. Port resolution
  let rawPort = cleanEnvVal(
    process.env.DB_PORT ||
    process.env.MYSQL_PORT ||
    process.env.DATABASE_PORT ||
    process.env.PORT ||
    ""
  );

  // Handle case where port was mistakenly appended to host: e.g. "auth-db1274.hstgr.io:3306"
  let cleanHost = host;
  let cleanPort = rawPort || DEFAULT_PORT;
  if (cleanHost.includes(":")) {
    const parts = cleanHost.split(":");
    cleanHost = parts[0];
    cleanPort = parts[1].replace(/[^0-9]/g, "") || cleanPort;
  }
  cleanPort = cleanPort.replace(/[^0-9]/g, "") || DEFAULT_PORT;

  // 3. User resolution
  const user = cleanEnvVal(
    process.env.DB_USER ||
    process.env.MYSQL_USER ||
    process.env.DATABASE_USER ||
    process.env.DB_USERNAME ||
    process.env.MYSQLUSER ||
    ""
  ) || DEFAULT_USER;

  // 4. Password resolution (preserves '#' and special characters)
  const password = cleanEnvVal(
    process.env.DB_PASSWORD ||
    process.env.MYSQL_PASSWORD ||
    process.env.DATABASE_PASSWORD ||
    process.env.DB_PASS ||
    process.env.MYSQLPASSWORD ||
    process.env.DBPASS ||
    "",
    true
  ) || DEFAULT_PASS;

  // 5. Database name resolution (guards against ':3306' or '3306' path corruption)
  let rawDb = cleanEnvVal(
    process.env.DB_NAME ||
    process.env.MYSQL_DATABASE ||
    process.env.DATABASE_NAME ||
    process.env.DB_DATABASE ||
    process.env.MYSQLDATABASE ||
    process.env.DBNAME ||
    ""
  );
  let cleanDb = rawDb.replace(/^[:/]+/, "").trim();
  if (!cleanDb || cleanDb === "3306" || cleanDb === ":3306") {
    cleanDb = DEFAULT_DB_NAME;
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);

  return `mysql://${encodedUser}:${encodedPassword}@${cleanHost}:${cleanPort}/${cleanDb}?connect_timeout=15&connection_limit=1&pool_timeout=10`;
}

/**
 * Resolves the active database URL strictly from discrete credentials.
 * Automatically synchronizes process.env to prevent Prisma engine from reading stale URLs.
 */
function resolveDatabaseUrl(): string {
  const builtUrl = buildUrlFromDbCredentials();
  
  // Unconditionally override environment variables so Prisma Rust engine never reads a malformed URL
  process.env.SLIDES_DATABASE_URL = builtUrl;
  process.env.DATABASE_URL = builtUrl;

  return builtUrl;
}

const activeDbUrl = resolveDatabaseUrl();

// Global singleton pattern for PrismaClient in Next.js development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: activeDbUrl } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Returns true if valid database connection settings are configured in environment
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(activeDbUrl);
}

/**
 * Helper to safely serialize database models containing BigInt or Decimal to plain JSON-compatible objects
 */
export function serializeDbData<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  // Handle Prisma Decimal
  if (
    typeof obj === "object" &&
    obj !== null &&
    "d" in obj &&
    "e" in obj &&
    "s" in obj &&
    typeof (obj as any).toNumber === "function"
  ) {
    return (obj as any).toNumber();
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeDbData(item));
  }

  if (typeof obj === "object") {
    const copy: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      copy[key] = serializeDbData(value);
    }
    return copy;
  }

  return obj;
}

export default prisma;
