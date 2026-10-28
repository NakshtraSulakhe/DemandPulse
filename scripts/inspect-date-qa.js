const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'mysql://root:@localhost:3306/leads' } } });

async function run() {
  console.log("--- Querying qa_audit_logs on 2026-10-27 ---");
  const logs = await prisma.$queryRawUnsafe(`
    SELECT q.id, q.lead_id, q.qa_status, q.qa_reviewed_by, q.reviewed_at, u.full_name, u.role, u.department
    FROM qa_audit_logs q
    LEFT JOIN users u ON u.id = q.qa_reviewed_by
    WHERE DATE(q.reviewed_at) = '2026-10-27'
    LIMIT 20
  `);
  console.log('qa_audit_logs for 2026-10-27:', logs.length);
  if (logs.length > 0) console.log(logs.slice(0, 5));

  console.log("\n--- Grouping qa_audit_logs by qa_reviewed_by on 2026-10-27 ---");
  const groupedLogs = await prisma.$queryRawUnsafe(`
    SELECT q.qa_reviewed_by, u.full_name, u.role, u.department, COUNT(*) as cnt
    FROM qa_audit_logs q
    LEFT JOIN users u ON u.id = q.qa_reviewed_by
    WHERE DATE(q.reviewed_at) = '2026-10-27'
    GROUP BY q.qa_reviewed_by, u.full_name, u.role, u.department
  `);
  console.log('Grouped qa_audit_logs 2026-10-27:', groupedLogs);

  console.log("\n--- Checking leads on 2026-10-27 ---");
  const groupedLeads = await prisma.$queryRawUnsafe(`
    SELECT l.qa_reviewed_by, u.full_name, u.role, u.department, COUNT(*) as cnt
    FROM leads l
    LEFT JOIN users u ON u.id = l.qa_reviewed_by
    WHERE DATE(l.qa_updated_at) = '2026-10-27'
    GROUP BY l.qa_reviewed_by, u.full_name, u.role, u.department
  `);
  console.log('Grouped leads by qa_updated_at on 2026-10-27:', groupedLeads);

  console.log("\n--- Checking recent dates with leads or audit logs ---");
  const recentLogs = await prisma.$queryRawUnsafe(`
    SELECT DATE(reviewed_at) as dt, q.qa_reviewed_by, u.full_name, u.role, u.department, COUNT(*) as cnt
    FROM qa_audit_logs q
    LEFT JOIN users u ON u.id = q.qa_reviewed_by
    GROUP BY DATE(reviewed_at), q.qa_reviewed_by, u.full_name, u.role, u.department
    ORDER BY dt DESC
    LIMIT 30
  `);
  console.log('Recent audit logs by date and reviewer:', recentLogs);

  await prisma.$disconnect();
}

run().catch(console.error);
