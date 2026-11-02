const { PrismaClient } = require("@prisma/client");
const { buildUrlFromDbCredentials } = require("./db-credentials");

const dbUrl = buildUrlFromDbCredentials();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

async function main() {
  try {
    const dbs = await prisma.$queryRawUnsafe("SHOW DATABASES");
    console.log("Databases:", dbs);
    const tables = await prisma.$queryRawUnsafe("SHOW TABLES");
    console.log("Tables in database:", tables);
  } catch (err) {
    console.error("Database query failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
