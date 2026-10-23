import { PrismaClient } from "@prisma/client";

// Global singleton pattern for PrismaClient in Next.js development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
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
