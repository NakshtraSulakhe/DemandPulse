const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'mysql://root:@localhost:3306/leads' } } });

async function run() {
  const users = await prisma.$queryRawUnsafe(`
    SELECT id, full_name, email, role, department 
    FROM users 
    WHERE id IN (99, 103, 120, 132, 134, 140, 178)
  `);
  console.log('Users detail:', users);
  await prisma.$disconnect();
}

run().catch(console.error);
