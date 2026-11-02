const { PrismaClient } = require("@prisma/client");

const DEFAULT_DB_NAME = "u449458970_demandpulse";
const DEFAULT_HOST = "auth-db1274.hstgr.io";
const DEFAULT_USER = "u449458970_demandpulse";
const DEFAULT_PASS = "TaRajGlobal@2026#";
const DEFAULT_PORT = "3306";

function cleanEnvVal(raw, isSecret = false) {
  if (raw === undefined || raw === null) return "";
  let val = String(raw).trim();
  const quoteMatch = val.match(/^(['"])(.*)\1(?:\s*(?:#|\/\/).*)?$/);
  if (quoteMatch) {
    return quoteMatch[2].trim();
  }
  if (!isSecret) {
    val = val.replace(/\s+(?:#|\/\/).*$/, "").trim();
  }
  val = val.replace(/^["']+|["']+$/g, "").trim();
  return val;
}

function buildUrlFromDbCredentials() {
  let rawHost = cleanEnvVal(
    process.env.DB_HOST ||
    process.env.MYSQL_HOST ||
    process.env.DATABASE_HOST ||
    process.env.DBHOST ||
    process.env.DB_HOSTNAME ||
    ""
  );

  const host = rawHost || DEFAULT_HOST;

  let rawPort = cleanEnvVal(
    process.env.DB_PORT ||
    process.env.MYSQL_PORT ||
    process.env.DATABASE_PORT ||
    process.env.PORT ||
    ""
  );

  let cleanHost = host;
  let cleanPort = rawPort || DEFAULT_PORT;
  if (cleanHost.includes(":")) {
    const parts = cleanHost.split(":");
    cleanHost = parts[0];
    cleanPort = parts[1].replace(/[^0-9]/g, "") || cleanPort;
  }
  cleanPort = cleanPort.replace(/[^0-9]/g, "") || DEFAULT_PORT;

  let user = cleanEnvVal(
    process.env.DB_USER ||
    process.env.MYSQL_USER ||
    process.env.DATABASE_USER ||
    process.env.DB_USERNAME ||
    process.env.MYSQLUSER ||
    ""
  ) || DEFAULT_USER;

  let password = cleanEnvVal(
    process.env.DB_PASSWORD ||
    process.env.MYSQL_PASSWORD ||
    process.env.DATABASE_PASSWORD ||
    process.env.DB_PASS ||
    process.env.MYSQLPASSWORD ||
    "",
    true
  ) || DEFAULT_PASS;

  let rawDb = cleanEnvVal(
    process.env.DB_NAME ||
    process.env.MYSQL_DATABASE ||
    process.env.DATABASE_NAME ||
    process.env.DB_DATABASE ||
    process.env.MYSQLDATABASE ||
    ""
  );
  let cleanDb = rawDb.replace(/^[:/]+/, "").trim();
  if (!cleanDb || cleanDb === "3306" || cleanDb === ":3306") {
    cleanDb = DEFAULT_DB_NAME;
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);

  const url = `mysql://${encodedUser}:${encodedPassword}@${cleanHost}:${cleanPort}/${cleanDb}?connect_timeout=15&connection_limit=1&pool_timeout=10`;
  return url;
}

async function testSnapshots() {
  const url = buildUrlFromDbCredentials();
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    const campaigns = await prisma.campaignDailySnapshot.findMany({
      where: { workDate: new Date("2026-10-29T00:00:00.000Z") },
    });
    console.log("Campaign snapshots for 2026-10-29:", campaigns.length);

    const agents = await prisma.agentDailySnapshot.findMany({
      where: { workDate: new Date("2026-10-29T00:00:00.000Z") },
    });
    console.log("Agent snapshots for 2026-10-29:", agents.length);

    // List all distinct snapshot dates in the DB
    const allDates = await prisma.campaignDailySnapshot.findMany({
      select: { workDate: true },
      distinct: ["workDate"],
    });
    console.log("Available dates in campaign_daily_snapshots:", allDates.map(d => d.workDate.toISOString().slice(0, 10)));
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testSnapshots();
