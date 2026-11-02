import { PrismaClient } from "@prisma/client";

/**
 * Safely cleans environment variable values:
 * 1. Preserves secret characters (like '#', '@', '$') inside passwords while safely stripping surrounding quotes.
 * 2. Removes trailing comments (# or //) only when outside quotes and not a secret.
 * 3. Trims whitespace and quotes.
 */
function cleanEnvVal(raw?: string | null, isSecret = false): string {
  if (raw === undefined || raw === null) return "";
  let val = String(raw).trim();
  if (!val) return "";

  // If value is wrapped in quotes, extract inner content safely without altering special characters
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

export interface DatabaseConfig {
  isValid: boolean;
  url: string;
  host: string;
  port: number;
  user: string;
  database: string;
  hasPassword: boolean;
  missingVariables: string[];
  error?: string;
}

/**
 * Validates discrete environment variables and constructs the internal MySQL connection URL.
 * NEVER uses hardcoded credentials or passwords.
 * Guarantees that the database name is valid and cannot become ':3306', '3306', or empty.
 */
export function getDatabaseConfig(): DatabaseConfig {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

  // 1. Host resolution
  let rawHost = cleanEnvVal(
    process.env.DB_HOST ||
    process.env.MYSQL_HOST ||
    process.env.DATABASE_HOST ||
    process.env.DB_HOSTNAME ||
    ""
  );

  // 2. Port resolution
  let rawPort = cleanEnvVal(
    process.env.DB_PORT ||
    process.env.MYSQL_PORT ||
    process.env.DATABASE_PORT ||
    ""
  );

  // Split port if mistakenly attached to host (e.g. "srv1274.hstgr.io:3306")
  let cleanHost = rawHost;
  let cleanPortStr = rawPort;
  if (cleanHost.includes(":")) {
    const parts = cleanHost.split(":");
    cleanHost = parts[0].trim();
    if (!cleanPortStr && parts[1]) {
      cleanPortStr = parts[1].replace(/[^0-9]/g, "");
    }
  }

  const port = parseInt(cleanPortStr || "3306", 10) || 3306;

  // 3. User resolution
  const user = cleanEnvVal(
    process.env.DB_USER ||
    process.env.MYSQL_USER ||
    process.env.DATABASE_USER ||
    process.env.DB_USERNAME ||
    ""
  );

  // 4. Password resolution (preserves special characters like '#' and '@')
  const password = cleanEnvVal(
    process.env.DB_PASSWORD ||
    process.env.MYSQL_PASSWORD ||
    process.env.DATABASE_PASSWORD ||
    process.env.DB_PASS ||
    "",
    true
  );

  // 5. Database name resolution
  let rawDb = cleanEnvVal(
    process.env.DB_NAME ||
    process.env.MYSQL_DATABASE ||
    process.env.DATABASE_NAME ||
    process.env.DB_DATABASE ||
    ""
  );
  let cleanDb = rawDb.replace(/^[:/]+/, "").trim();

  // Missing variable checks
  const missingVariables: string[] = [];
  if (!cleanHost) missingVariables.push("DB_HOST");
  if (!user) missingVariables.push("DB_USER");
  if (!password) missingVariables.push("DB_PASSWORD");
  if (!cleanDb) missingVariables.push("DB_NAME");

  // Validation rules
  if (missingVariables.length > 0) {
    return {
      isValid: false,
      url: "",
      host: cleanHost,
      port,
      user,
      database: cleanDb,
      hasPassword: Boolean(password),
      missingVariables,
      error: `Missing required database environment variable(s): ${missingVariables.join(", ")}. Please configure them in your environment settings.`,
    };
  }

  // Reject invalid database names (e.g. if mistakenly set to port ":3306" or "3306")
  if (cleanDb === "3306" || cleanDb === ":3306" || cleanDb.length === 0) {
    return {
      isValid: false,
      url: "",
      host: cleanHost,
      port,
      user,
      database: cleanDb,
      hasPassword: Boolean(password),
      missingVariables: ["DB_NAME"],
      error: `Invalid database name: '${cleanDb}'. A port number cannot be used as a database name. Expected database name (e.g. 'u449458970_demandpulse').`,
    };
  }

  // Guard against localhost in Vercel serverless environment
  if (isVercel && (cleanHost === "localhost" || cleanHost === "127.0.0.1")) {
    return {
      isValid: false,
      url: "",
      host: cleanHost,
      port,
      user,
      database: cleanDb,
      hasPassword: Boolean(password),
      missingVariables: ["DB_HOST"],
      error: `Invalid DB_HOST: '${cleanHost}'. Localhost cannot be reached from Vercel serverless functions. Please configure your remote Hostinger database host (e.g. 'srv1274.hstgr.io').`,
    };
  }

  // Encode credentials safely to preserve special characters in URL
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);

  // Serverless pooling limits: connection_limit=1 to prevent exhausting Hostinger MySQL max connections
  const url = `mysql://${encodedUser}:${encodedPassword}@${cleanHost}:${port}/${cleanDb}?connect_timeout=15&connection_limit=1&pool_timeout=10`;

  return {
    isValid: true,
    url,
    host: cleanHost,
    port,
    user,
    database: cleanDb,
    hasPassword: true,
    missingVariables: [],
  };
}

const dbConfig = getDatabaseConfig();

// Overwrite environment variables so Prisma Rust engine never falls back to an unparsed or malformed URL
if (dbConfig.isValid) {
  process.env.SLIDES_DATABASE_URL = dbConfig.url;
  process.env.DATABASE_URL = dbConfig.url;
}

// Global singleton pattern for PrismaClient in Next.js development and serverless invocations
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbConfig.isValid ? { db: { url: dbConfig.url } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Returns true if valid database connection settings are configured in environment
 */
export function isDatabaseConfigured(): boolean {
  return dbConfig.isValid;
}

/**
 * Returns sanitized, non-sensitive database configuration details for diagnostics
 */
export function getSafeDatabaseConfigSummary() {
  return {
    isConfigured: dbConfig.isValid,
    host: dbConfig.host || null,
    port: dbConfig.port || null,
    user: dbConfig.user || null,
    database: dbConfig.database || null,
    hasPassword: dbConfig.hasPassword,
    missingVariables: dbConfig.missingVariables,
    error: dbConfig.error || null,
  };
}

/**
 * Reusable database diagnostic function to test actual connectivity and verify selected database.
 * Never logs passwords or sensitive connection strings.
 */
export async function runDatabaseDiagnostic() {
  const config = getDatabaseConfig();
  const environment = process.env.VERCEL ? "vercel-production" : (process.env.NODE_ENV || "development");

  if (!config.isValid) {
    return {
      ok: false,
      status: "CONFIGURATION_ERROR" as const,
      details: {
        host: config.host || undefined,
        port: config.port,
        user: config.user || undefined,
        database: config.database || undefined,
        passwordConfigured: config.hasPassword,
        environment,
        missingVariables: config.missingVariables,
        error: config.error,
      },
    };
  }

  const startTime = Date.now();
  try {
    const rawResult = await prisma.$queryRaw<Array<{ databaseName: string; version?: string }>>`
      SELECT DATABASE() AS databaseName, VERSION() AS version
    `;
    const latencyMs = Date.now() - startTime;
    const selectedDatabase = rawResult?.[0]?.databaseName || null;
    const serverVersion = rawResult?.[0]?.version || null;

    if (selectedDatabase !== config.database) {
      return {
        ok: false,
        status: "DATABASE_SELECTION_FAILED" as const,
        details: {
          host: config.host,
          port: config.port,
          user: config.user,
          expectedDatabase: config.database,
          actualSelectedDatabase: selectedDatabase,
          serverVersion,
          passwordConfigured: true,
          environment,
          latencyMs,
          error: `Connected to MySQL, but active database is '${selectedDatabase}' instead of expected '${config.database}'.`,
        },
      };
    }

    return {
      ok: true,
      status: "CONNECTED" as const,
      details: {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
        actualSelectedDatabase: selectedDatabase,
        serverVersion,
        passwordConfigured: true,
        environment,
        latencyMs,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errMsg = err?.message || String(err);

    let status: "AUTHENTICATION_FAILED" | "DATABASE_SELECTION_FAILED" | "NETWORK_ERROR" = "NETWORK_ERROR";
    if (errMsg.includes("1045") || errMsg.includes("Access denied for user")) {
      status = "AUTHENTICATION_FAILED";
    } else if (errMsg.includes("1044") || errMsg.includes("denied access on the database")) {
      status = "DATABASE_SELECTION_FAILED";
    }

    return {
      ok: false,
      status,
      details: {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
        passwordConfigured: true,
        environment,
        latencyMs,
        error: errMsg,
      },
    };
  }
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
