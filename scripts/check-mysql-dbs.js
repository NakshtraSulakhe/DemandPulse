const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SLIDES_DATABASE_URL || "mysql://root:@localhost:3306/demandflow_slides"
    }
  }
});

async function main() {
  try {
    const dbs = await prisma.$queryRawUnsafe("SHOW DATABASES");
    console.log("Databases:", dbs);
    const tables = await prisma.$queryRawUnsafe("SHOW TABLES");
    console.log("Tables in demandflow_slides:", tables);
  } catch (err) {
    console.error("Database query failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
