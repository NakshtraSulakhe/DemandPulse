const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SLIDES_DATABASE_URL || "mysql://root:@localhost:3306/demandflow_slides"
    }
  }
});

async function run() {
  console.log("Starting additive table migration...");
  const sqlFile = path.join(__dirname, "..", "sql", "001_additive_analytics_tables.sql");
  const rawSql = fs.readFileSync(sqlFile, "utf-8");

  // Remove full line comments and multi-line comments
  const cleanedSql = rawSql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith("--"))
    .join("\n");

  const statements = cleanedSql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 5);

  console.log(`Found ${statements.length} SQL statement(s) to execute.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await prisma.$executeRawUnsafe(stmt);
      const firstLine = stmt.split("\n")[0].slice(0, 50);
      console.log(`[${i + 1}/${statements.length}] Executed: ${firstLine}...`);
    } catch (err) {
      console.error(`[${i + 1}/${statements.length}] Error executing:`, err.message);
      throw err;
    }
  }

  const tables = await prisma.$queryRawUnsafe("SHOW TABLES");
  console.log(`\nMigration completed successfully! Total tables in demandflow_slides: ${tables.length}`);
  console.log(JSON.stringify(tables, null, 2));
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
