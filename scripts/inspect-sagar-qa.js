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
    console.log("--- Checking Sagar Machale in users table ---");
    const users = await prisma.$queryRawUnsafe(`
      SELECT id, full_name, username, role, department, status
      FROM users
      WHERE full_name LIKE '%Sagar%' OR username LIKE '%sagar%'
    `);
    console.log("Users matching Sagar:", users);

    if (users.length > 0) {
      const sagarId = users[0].id;

      console.log(`\n--- Checking leads where qa_reviewed_by = ${sagarId} ---`);
      const reviewedLeads = await prisma.$queryRawUnsafe(`
        SELECT id, lead_id, qa_reviewed_by, qa_updated_by, qa_status, qa_updated_at, DATE(qa_updated_at) as dt
        FROM leads
        WHERE qa_reviewed_by = ${sagarId}
        LIMIT 10
      `);
      console.log(`Count of leads with qa_reviewed_by = ${sagarId}:`, reviewedLeads.length);
      console.log(reviewedLeads);

      console.log(`\n--- Checking leads where qa_updated_by = ${sagarId} ---`);
      const updatedLeads = await prisma.$queryRawUnsafe(`
        SELECT id, lead_id, qa_reviewed_by, qa_updated_by, qa_status, qa_updated_at, DATE(qa_updated_at) as dt
        FROM leads
        WHERE qa_updated_by = ${sagarId}
        LIMIT 10
      `);
      console.log(`Count of leads with qa_updated_by = ${sagarId}:`, updatedLeads.length);
      console.log(updatedLeads);

      console.log(`\n--- Checking qa_audit_logs for ${sagarId} ---`);
      const auditLogs = await prisma.$queryRawUnsafe(`
        SELECT id, lead_id, reviewed_by, action, decision, reviewed_at
        FROM qa_audit_logs
        WHERE reviewed_by = ${sagarId}
        LIMIT 10
      `);
      console.log(`Count of qa_audit_logs for ${sagarId}:`, auditLogs.length);
      console.log(auditLogs);
    }

    console.log("\n--- Checking department of all QA reviewers in users table ---");
    const qaDeptUsers = await prisma.$queryRawUnsafe(`
      SELECT id, full_name, role, department
      FROM users
      WHERE department LIKE '%QA%' OR department LIKE '%Quality%' OR role LIKE '%qa%'
    `);
    console.log("QA department users:", qaDeptUsers);

  } catch (err) {
    console.error("Error inspecting DB:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
