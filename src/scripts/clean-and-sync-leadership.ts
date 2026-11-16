import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function cleanAndSyncRealLeadership() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  console.log("=== Removing dummy hardcoded leadership members and assignments ===");
  // Remove dummy members
  await conn.execute(
    "DELETE FROM operations_team_assignments WHERE leadership_id IN (SELECT id FROM operations_leadership_members WHERE member_name IN ('Rajesh Sharma', 'Amit Patel', 'Sneha Reddy'))"
  );
  await conn.execute(
    "DELETE FROM operations_leadership_members WHERE member_name IN ('Rajesh Sharma', 'Amit Patel', 'Sneha Reddy')"
  );

  console.log("Dummy records deleted.");

  // Now insert the REAL Operations Managers from CRM
  console.log("=== Inserting REAL Operations Managers from CRM ===");

  const realManagers = [
    {
      name: "Prathamesh Kamble",
      crm_id: 150,
      role: "manager",
      email: "prathamesh.kamble@demandflow.io",
      notes: "Operations Manager (CRM ID: 150)",
    },
    {
      name: "Maroof Shaikh",
      crm_id: 162,
      role: "manager",
      email: "maroof.shaikh@demandflow.io",
      notes: "Operations Manager (CRM ID: 162)",
    },
  ];

  for (const mgr of realManagers) {
    const [existing] = await conn.execute(
      "SELECT id FROM operations_leadership_members WHERE crm_user_id = ? OR member_name = ?",
      [mgr.crm_id, mgr.name]
    );

    if ((existing as any[]).length === 0) {
      await conn.execute(
        `INSERT INTO operations_leadership_members (member_name, member_role, crm_user_id, email, is_active, notes)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [mgr.name, mgr.role, mgr.crm_id, mgr.email, mgr.notes]
      );
      console.log(`Inserted real manager: ${mgr.name} (CRM ID: ${mgr.crm_id})`);
    } else {
      const existingId = (existing as any[])[0].id;
      await conn.execute(
        `UPDATE operations_leadership_members 
         SET member_name = ?, member_role = ?, crm_user_id = ?, is_active = 1, notes = ?
         WHERE id = ?`,
        [mgr.name, mgr.role, mgr.crm_id, mgr.notes, existingId]
      );
      console.log(`Updated real manager: ${mgr.name} (CRM ID: ${mgr.crm_id})`);
    }
  }

  // Also check if any dummy plans exist or if plans are clean
  const [plans] = await conn.execute("SELECT id, plan_name, role_target, frequency FROM operations_leadership_plans");
  console.log("Current plans:", plans);

  // Check current leadership members
  const [members] = await conn.execute("SELECT id, member_name, member_role, crm_user_id FROM operations_leadership_members");
  console.log("Current operations_leadership_members:", members);

  // Check assignments (should be 0 so user can assign)
  const [assignments] = await conn.execute("SELECT COUNT(*) as count FROM operations_team_assignments");
  console.log("Current team assignments count:", (assignments as any)[0].count);

  await conn.end();
  console.log("Cleanup and sync completed successfully!");
}

cleanAndSyncRealLeadership().catch(console.error);

