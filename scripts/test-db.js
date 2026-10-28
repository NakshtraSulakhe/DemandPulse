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
