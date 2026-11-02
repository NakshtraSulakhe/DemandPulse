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
    const tables = await prisma.$queryRawUnsafe("SHOW TABLES");
    console.log("Database connected successfully! Tables found:");
    console.log(JSON.stringify(tables, null, 2));
  } catch (err) {
    console.error("Database connection failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
