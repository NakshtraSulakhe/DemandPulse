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

  console.log("Connected to MySQL. Creating leadership incentive tables...");

  // 1. Leadership Members (Managers & Team Leaders)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS operations_leadership_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      member_name VARCHAR(150) NOT NULL,
      member_role ENUM('manager', 'team_leader') NOT NULL,
      crm_user_id BIGINT NULL,
      email VARCHAR(150) NULL,
      phone VARCHAR(50) NULL,
      parent_manager_id INT NULL,
      is_active TINYINT(1) DEFAULT 1,
      notes TEXT NULL,
      created_at DATETIME(6) DEFAULT NOW(6),
      updated_at DATETIME(6) DEFAULT NOW(6) ON UPDATE NOW(6),
      INDEX idx_role_active (member_role, is_active),
      INDEX idx_parent (parent_manager_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Team Member Assignments (Agents assigned to Team Leaders or Managers)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS operations_team_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      leadership_id INT NOT NULL,
      agent_id BIGINT NOT NULL,
      agent_name VARCHAR(150) NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME(6) DEFAULT NOW(6),
      updated_at DATETIME(6) DEFAULT NOW(6) ON UPDATE NOW(6),
      UNIQUE KEY uq_leadership_agent (leadership_id, agent_id),
      INDEX idx_lead_active (leadership_id, is_active),
      INDEX idx_agent_active (agent_id, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Leadership Incentive Plans (Daily & Monthly Slabs/Tiers for TL & Manager)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS operations_leadership_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plan_name VARCHAR(150) NOT NULL,
      role_target ENUM('team_leader', 'manager') NOT NULL,
      frequency ENUM('daily', 'monthly') NOT NULL,
      min_threshold_pct DECIMAL(5,2) DEFAULT 100.00,
      tiers_json JSON NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      notes TEXT NULL,
      created_at DATETIME(6) DEFAULT NOW(6),
      updated_at DATETIME(6) DEFAULT NOW(6) ON UPDATE NOW(6),
      INDEX idx_role_freq_active (role_target, frequency, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seed default plans if table is empty
  const [existingPlans] = await conn.execute("SELECT COUNT(*) as count FROM operations_leadership_plans");
  const count = (existingPlans as any)[0]?.count || 0;

  if (count === 0) {
    console.log("Seeding default leadership incentive plans...");

    // TL Daily
    const tlDailyTiers = [
      { tier_order: 1, tier_name: "Tier 1 (100% Target Met)", min_pct: 100, max_pct: 109.99, amount: 500 },
      { tier_order: 2, tier_name: "Tier 2 (110% Accelerator)", min_pct: 110, max_pct: 119.99, amount: 800 },
      { tier_order: 3, tier_name: "Tier 3 (120% Accelerator)", min_pct: 120, max_pct: 129.99, amount: 1200 },
      { tier_order: 4, tier_name: "Tier 4 (130%+ Peak Burst)", min_pct: 130, max_pct: null, amount: 1600 },
    ];
    await conn.execute(
      `INSERT INTO operations_leadership_plans (plan_name, role_target, frequency, min_threshold_pct, tiers_json, is_active)
       VALUES (?, 'team_leader', 'daily', 100.00, ?, 1)`,
      ["Team Leader Daily Points Incentive Plan", JSON.stringify(tlDailyTiers)]
    );

    // TL Monthly
    const tlMonthlyTiers = [
      { tier_order: 1, tier_name: "Tier 1 (100% Monthly Target)", min_pct: 100, max_pct: 109.99, amount: 10000 },
      { tier_order: 2, tier_name: "Tier 2 (110% Monthly)", min_pct: 110, max_pct: 119.99, amount: 15000 },
      { tier_order: 3, tier_name: "Tier 3 (120% Monthly)", min_pct: 120, max_pct: 129.99, amount: 20000 },
      { tier_order: 4, tier_name: "Tier 4 (130%+ Monthly Peak)", min_pct: 130, max_pct: null, amount: 25000 },
    ];
    await conn.execute(
      `INSERT INTO operations_leadership_plans (plan_name, role_target, frequency, min_threshold_pct, tiers_json, is_active)
       VALUES (?, 'team_leader', 'monthly', 100.00, ?, 1)`,
      ["Team Leader Monthly Target Incentive Plan", JSON.stringify(tlMonthlyTiers)]
    );

    // Manager Daily
    const mgrDailyTiers = [
      { tier_order: 1, tier_name: "Tier 1 (100% Ops Target Met)", min_pct: 100, max_pct: 109.99, amount: 1000 },
      { tier_order: 2, tier_name: "Tier 2 (110% Ops Target)", min_pct: 110, max_pct: 119.99, amount: 1500 },
      { tier_order: 3, tier_name: "Tier 3 (120% Ops Target)", min_pct: 120, max_pct: 129.99, amount: 2200 },
      { tier_order: 4, tier_name: "Tier 4 (130%+ Ops Super-Achievement)", min_pct: 130, max_pct: null, amount: 3000 },
    ];
    await conn.execute(
      `INSERT INTO operations_leadership_plans (plan_name, role_target, frequency, min_threshold_pct, tiers_json, is_active)
       VALUES (?, 'manager', 'daily', 100.00, ?, 1)`,
      ["Operations Manager Daily Quota Incentive Plan", JSON.stringify(mgrDailyTiers)]
    );

    // Manager Monthly
    const mgrMonthlyTiers = [
      { tier_order: 1, tier_name: "Tier 1 (100% Monthly Target)", min_pct: 100, max_pct: 109.99, amount: 20000 },
      { tier_order: 2, tier_name: "Tier 2 (110% Monthly)", min_pct: 110, max_pct: 119.99, amount: 30000 },
      { tier_order: 3, tier_name: "Tier 3 (120% Monthly)", min_pct: 120, max_pct: 129.99, amount: 40000 },
      { tier_order: 4, tier_name: "Tier 4 (130%+ Monthly Peak)", min_pct: 130, max_pct: null, amount: 50000 },
    ];
    await conn.execute(
      `INSERT INTO operations_leadership_plans (plan_name, role_target, frequency, min_threshold_pct, tiers_json, is_active)
       VALUES (?, 'manager', 'monthly', 100.00, ?, 1)`,
      ["Operations Manager Monthly Quota Incentive Plan", JSON.stringify(mgrMonthlyTiers)]
    );
  }

  console.log("Migration and seeding completed successfully!");
  await conn.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

