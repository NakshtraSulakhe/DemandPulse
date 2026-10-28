const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'mysql://root:@localhost:3306/leads' } } });

async function run() {
  const sagarLogs = await prisma.$queryRawUnsafe(`
    SELECT q.id, q.lead_id, q.qa_status, q.qa_reviewed_by, q.reviewed_at, DATE(q.reviewed_at) as dt
    FROM qa_audit_logs q
    WHERE q.qa_reviewed_by = 99
    ORDER BY q.reviewed_at DESC
    LIMIT 20
  `);
  console.log('Sagar logs in qa_audit_logs count:', sagarLogs.length);
  console.log(sagarLogs);

  // Check leads for Sagar
  const sagarLeads = await prisma.$queryRawUnsafe(`
    SELECT l.id, l.qa_status, l.qa_reviewed_by, l.qa_updated_at, DATE(l.qa_updated_at) as dt
    FROM leads l
    WHERE l.qa_reviewed_by = 99
    ORDER BY l.qa_updated_at DESC
    LIMIT 20
  `);
  console.log('Sagar leads in leads table count:', sagarLeads.length);
  console.log(sagarLeads);

  // Check what tables have "qa_updated" or similar in leads DB
  const tables = await prisma.$queryRawUnsafe(`SHOW TABLES`);
  console.log('Tables in DB:', tables);

  await prisma.$disconnect();
}

run().catch(console.error);
