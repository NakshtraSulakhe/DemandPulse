import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl(): string | undefined {
  let url = process.env.SLIDES_DATABASE_URL?.trim();

  if (url) {
    // Auto-fix accidental typo: mysql://user:pass@host/:3306/db -> mysql://user:pass@host:3306/db
    url = url.replace(/\/(:[0-9]+)(\/|$)/, "$1$2");
    process.env.SLIDES_DATABASE_URL = url;
    return url;
  }

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD ?? "";
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT || "3306";

  if (host && user && database) {
    const cleanHost = host.replace(/:[0-9]+$/, "");
    const cleanPort = host.includes(":") ? host.split(":")[1] : port;
    const cleanDb = database.replace(/^[:/]+/, "");

    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    const builtUrl = `mysql://${encodedUser}:${encodedPassword}@${cleanHost}:${cleanPort}/${cleanDb}?connect_timeout=15&connection_limit=1&pool_timeout=10`;
    process.env.SLIDES_DATABASE_URL = builtUrl;
    return builtUrl;
  }

  return undefined;
}

const activeDbUrl = resolveDatabaseUrl();
if (activeDbUrl && !process.env.SLIDES_DATABASE_URL) {
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
