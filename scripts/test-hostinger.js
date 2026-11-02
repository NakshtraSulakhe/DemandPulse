const { PrismaClient } = require("@prisma/client");
const { buildUrlFromDbCredentials } = require("./db-credentials");

// Read from .env.local if available
try {
  require("dotenv").config({ path: ".env.local" });
} catch {}

async function testHostingerConnection() {
  const url = buildUrlFromDbCredentials();
  console.log("Synthesized DB URL (safely masked):", url.replace(/:[^:@]+@/, ":****@"));

  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    const rawResult = await prisma.$queryRawUnsafe("SELECT DATABASE() AS databaseName, VERSION() AS version");
    console.log("Connected successfully! Server details:", rawResult);

    const pref = await prisma.slideUserPreference.findFirst();
    console.log("slideUserPreference.findFirst() result ID:", pref ? pref.id.toString() : "null (no rows)");

    const campaigns = await prisma.campaignDailySnapshot.findMany({
      where: { workDate: new Date("2026-10-29T00:00:00.000Z") },
    });
    console.log("Campaign snapshots for 2026-10-29:", campaigns.length);

    const agents = await prisma.agentDailySnapshot.findMany({
      where: { workDate: new Date("2026-10-29T00:00:00.000Z") },
    });
    console.log("Agent snapshots for 2026-10-29:", agents.length);
  } catch (err) {
    console.error("Test failed:", err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

testHostingerConnection();
