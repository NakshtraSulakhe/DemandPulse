const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:@localhost:3306/leads"
    }
  }
});

async function main() {
  try {
    const dates = await prisma.$queryRawUnsafe(`
      SELECT DATE(qa_updated_at) as dt, COUNT(*) as cnt
      FROM leads
      WHERE qa_reviewed_by IS NOT NULL
      GROUP BY DATE(qa_updated_at)
      ORDER BY dt DESC
      LIMIT 10
    `);
    console.log('Dates with qa_reviewed_by in leads table:', dates);

    const logDates = await prisma.$queryRawUnsafe(`
      SELECT DATE(reviewed_at) as dt, COUNT(*) as cnt
      FROM qa_audit_logs
      GROUP BY DATE(reviewed_at)
      ORDER BY dt DESC
      LIMIT 10
    `);
    console.log('Dates in qa_audit_logs:', logDates);
  } catch (err) {
    console.error("Query failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
