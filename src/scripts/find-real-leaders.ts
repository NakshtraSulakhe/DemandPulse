import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  console.log("=== Connected to MySQL ===");

  // 1. Show all tables
  const [tables] = await conn.execute("SHOW TABLES");
  console.log("Tables in database:", (tables as any[]).map((t) => Object.values(t)[0]));

  // 2. Check users table
  try {
    const [users] = await conn.execute("SELECT id, name, email, role FROM users LIMIT 50");
    console.log("\nUsers in 'users' table:", users);
  } catch (e: any) {
    console.log("Could not query 'users':", e.message);
  }

  // 3. Check if there are other user / employee / lead tables
  try {
    const [emp] = await conn.execute("SELECT DISTINCT employee_id, employee_name, employee_role FROM employee_target_assignments LIMIT 50");
    console.log("\nUnique employees in 'employee_target_assignments':", emp);
  } catch (e: any) {
    console.log("Could not query employee_target_assignments:", e.message);
  }

  // 4. Check current operations_leadership_members
  const [leadMembers] = await conn.execute("SELECT * FROM operations_leadership_members");
  console.log("\nCurrent operations_leadership_members:", leadMembers);

  // 5. Check QA plans or qa tables
  try {
    const [qaPlans] = await conn.execute("SELECT * FROM qa_incentive_plans");
    console.log("\nQA Incentive Plans in DB:", qaPlans);
  } catch (e: any) {
    console.log("No qa_incentive_plans table or error:", e.message);
  }

  await conn.end();
}

main().catch(console.error);

