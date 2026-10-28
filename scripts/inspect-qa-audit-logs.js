const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'mysql://root:@localhost:3306/leads' } } });

async function run() {
  const qaAuditCols = await prisma.$queryRawUnsafe('DESCRIBE qa_audit_logs');
  console.log('qa_audit_logs columns:', qaAuditCols.map(c => c.Field));

  const allQaUsers = await prisma.$queryRawUnsafe(`
    SELECT id, full_name, email, role, department 
    FROM users 
    WHERE role LIKE 'qa%' OR role = 'quality_analyst' OR department LIKE '%Quality%' OR department LIKE '%QA%'
  `);
  console.log('Official QA Users from users table:', allQaUsers);

  // Check what Sagar did in qa_audit_logs vs leads
  const sagarAuditLogs = await prisma.$queryRawUnsafe(`
    SELECT * FROM qa_audit_logs WHERE reviewed_by = 99 OR user_id = 99 LIMIT 10
  `).catch(e => e.message);
  console.log('Sagar in qa_audit_logs:', sagarAuditLogs);

  // Check what Sagar did in leads
  const sagarReviewedInLeads = await prisma.$queryRawUnsafe(`
    SELECT id, qa_status, qa_reviewed_by, qa_updated_at FROM leads WHERE qa_reviewed_by = 99 LIMIT 10
  `);
  console.log('Sagar in leads (qa_reviewed_by = 99):', sagarReviewedInLeads);

  // Check all users who have qa_reviewed_by in leads
  const reviewedByDistinct = await prisma.$queryRawUnsafe(`
    SELECT l.qa_reviewed_by, u.full_name, u.role, u.department, COUNT(*) as cnt
    FROM leads l
    LEFT JOIN users u ON u.id = l.qa_reviewed_by
    WHERE l.qa_reviewed_by IS NOT NULL
    GROUP BY l.qa_reviewed_by, u.full_name, u.role, u.department
  `);
  console.log('Distinct qa_reviewed_by in leads table:', reviewedByDistinct);

  await prisma.$disconnect();
}

run().catch(console.error);
