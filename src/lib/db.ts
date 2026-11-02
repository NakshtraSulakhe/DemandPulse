import { PrismaClient } from "@prisma/client";

const DEFAULT_DB_NAME = "u449458970_demandpulse";

function sanitizeDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== "string") return undefined;
  let url = rawUrl.trim();
  if (!url) return undefined;

  // If running on Vercel or in production, discard localhost/127.0.0.1
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  if (isVercel && (url.includes("localhost") || url.includes("127.0.0.1"))) {
    console.warn("[db.ts] Discarding localhost database URL in Vercel environment.");
    return undefined;
  }

  // 1. Fix malformed patterns where port was duplicated or injected into path:
  // e.g. host:3306/:3306 -> host:3306
  url = url.replace(/(:[0-9]+)\/:(?:[0-9]+)(\/|$|\?)/, "$1$2");
  // e.g. host/:3306/db -> host:3306/db
  url = url.replace(/([^/:]+)\/:([0-9]+)\//, "$1:$2/");
  // e.g. host/:3306 -> host:3306
  url = url.replace(/([^/:]+)\/:([0-9]+)(\?|$)/, "$1:$2$3");

  try {
    const parsed = new URL(url);
    let dbName = parsed.pathname.replace(/^\/+/, "");

    // If dbName is missing, empty, or accidentally set to the port (e.g. "3306" or ":3306")
    if (!dbName || dbName === "3306" || dbName === ":3306") {
      const configuredName = process.env.DB_NAME?.replace(/^[:/]+/, "");
      dbName = (configuredName && configuredName !== "3306" && configuredName !== ":3306")
        ? configuredName
        : DEFAULT_DB_NAME;
    }

    parsed.pathname = `/${dbName}`;

    // Ensure serverless connection pooling parameters exist on the URL to prevent connection exhaustion
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "10");
    }
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "15");
    }

    return parsed.toString();
  } catch (err) {
    console.warn("[db.ts] Failed to parse URL with URL constructor, falling back to regex sanitized URL:", err);
    return url;
  }
}

function buildUrlFromDbCredentials(): string | undefined {
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD ?? "";
  let database = process.env.DB_NAME?.trim();
  const port = process.env.DB_PORT?.trim() || "3306";

  if (host && user) {
    const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
    if (isVercel && (host.includes("localhost") || host.includes("127.0.0.1"))) {
      console.warn("[db.ts] Discarding localhost DB_HOST in Vercel environment.");
      return undefined;
    }

    const cleanHost = host.replace(/:[0-9]+$/, "").trim();
    const cleanPort = (host.includes(":") ? host.split(":")[1] : port).replace(/[^0-9]/g, "") || "3306";
    let cleanDb = database ? database.replace(/^[:/]+/, "").trim() : "";
    if (!cleanDb || cleanDb === "3306" || cleanDb === ":3306") {
      cleanDb = DEFAULT_DB_NAME;
    }

    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    const builtUrl = `mysql://${encodedUser}:${encodedPassword}@${cleanHost}:${cleanPort}/${cleanDb}?connect_timeout=15&connection_limit=1&pool_timeout=10`;
    return builtUrl;
  }

  return undefined;
}

function resolveDatabaseUrl(): string | undefined {
  // 1. PRIORITY 1: Discrete DB credentials from environment (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT)
  const fromCredentials = buildUrlFromDbCredentials();
  if (fromCredentials) {
    process.env.SLIDES_DATABASE_URL = fromCredentials;
    return fromCredentials;
  }

  // 2. PRIORITY 2: Direct connection string fallback (SLIDES_DATABASE_URL or DATABASE_URL)
  const directUrl = process.env.SLIDES_DATABASE_URL || process.env.DATABASE_URL;
  const sanitized = sanitizeDatabaseUrl(directUrl);
  if (sanitized) {
    process.env.SLIDES_DATABASE_URL = sanitized;
    return sanitized;
  }

  return undefined;
}

const activeDbUrl = resolveDatabaseUrl();
if (activeDbUrl) {
  process.env.SLIDES_DATABASE_URL = activeDbUrl;
}

// Global singleton pattern for PrismaClient in Next.js development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: activeDbUrl ? { db: { url: activeDbUrl } } : undefined,
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
