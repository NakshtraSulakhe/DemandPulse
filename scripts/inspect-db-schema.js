const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'mysql://root:@localhost:3306/leads' } } });

async function run() {
  const usersCols = await prisma.$queryRawUnsafe('DESCRIBE users');
  console.log('users columns:', usersCols.map(c => c.Field));
  
  const leadsCols = await prisma.$queryRawUnsafe('DESCRIBE leads');
  console.log('leads QA columns:', leadsCols.map(c => c.Field).filter(f => f.includes('qa')));

  const users = await prisma.$queryRawUnsafe("SELECT * FROM users WHERE full_name LIKE '%Sagar%' LIMIT 5");
  console.log('Sagar user record:', users);

  if (users.length > 0) {
    const sId = users[0].id;
    const leadsReviewed = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM leads WHERE qa_reviewed_by = ${sId}`);
    const leadsUpdated = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM leads WHERE qa_updated_by = ${sId}`);
    console.log(`Leads for Sagar (${sId}): reviewed =`, leadsReviewed, `, updated =`, leadsUpdated);

    const sampleReviewed = await prisma.$queryRawUnsafe(`SELECT id, qa_reviewed_by, qa_updated_by, qa_status, qa_updated_at FROM leads WHERE qa_reviewed_by = ${sId} LIMIT 5`);
    console.log('Sample reviewed:', sampleReviewed);

    const sampleUpdated = await prisma.$queryRawUnsafe(`SELECT id, qa_reviewed_by, qa_updated_by, qa_status, qa_updated_at FROM leads WHERE qa_updated_by = ${sId} LIMIT 5`);
    console.log('Sample updated:', sampleUpdated);
  }

  await prisma.$disconnect();
}

run().catch(console.error);
