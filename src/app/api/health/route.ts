import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Lightweight health check endpoint for Docker container orchestration and load balancers.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "demandpulse-analytics",
      databaseConfigured: isDatabaseConfigured(),
      uptime: process.uptime(),
    },
    { status: 200 }
  );
}

