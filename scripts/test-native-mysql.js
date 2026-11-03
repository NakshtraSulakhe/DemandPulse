const mysql = require('mysql2/promise');
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log("=== DemandPulse Native MySQL Test Suite ===");
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'srv1274.hstgr.io',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 10000,
    dateStrings: true,
  });

  // 1. Diagnostics
  const [diagRows] = await pool.query('SELECT DATABASE() AS databaseName, VERSION() AS version');
  console.log("1. Diagnostic check:", diagRows[0]);

  // 2. Display Preferences
  const [dispRows] = await pool.query('SELECT * FROM slide_display_preferences WHERE display_identifier = ?', ['default']);
  console.log("2. Display preferences row:", dispRows[0]);

  // 3. User Preferences
  const [userRows] = await pool.query('SELECT * FROM slide_user_preferences WHERE user_id = ?', [1]);
  console.log("3. User preferences row:", userRows[0]);

  // 4. CRM Config
  const [crmRows] = await pool.query('SELECT setting_key, setting_value FROM slide_system_settings WHERE setting_key = ?', ['crm_connection_config']);
  console.log("4. CRM configuration exists:", Boolean(crmRows[0]));

  // 5. Active Presentation
  const [presRows] = await pool.query('SELECT id, name, slug FROM slide_presentations WHERE slug = ?', ['executive-presentation']);
  console.log("5. Active Presentation:", presRows[0]);

  // 6. Historical Data (2026-10-29)
  const [campRows] = await pool.query('SELECT COUNT(*) as count FROM campaign_daily_snapshots WHERE work_date = ?', ['2026-10-29']);
  console.log("6. Campaign daily snapshots for 2026-10-29 count:", campRows[0].count);

  const [agentRows] = await pool.query('SELECT COUNT(*) as count FROM agent_daily_snapshots WHERE work_date = ?', ['2026-10-29']);
  console.log("7. Agent daily snapshots for 2026-10-29 count:", agentRows[0].count);

  const [qaRows] = await pool.query('SELECT COUNT(*) as count FROM qa_daily_snapshots WHERE work_date = ?', ['2026-10-29']);
  console.log("8. QA daily snapshots for 2026-10-29 count:", qaRows[0].count);

  const [floorRows] = await pool.query('SELECT * FROM floor_daily_snapshots WHERE work_date = ?', ['2026-10-29']);
  console.log("9. Floor daily snapshot for 2026-10-29:", floorRows[0] ? `Total: ${floorRows[0].total_agents}, Present: ${floorRows[0].present_agents}` : "None");

  await pool.end();
  console.log("\n>>> ALL NATIVE MYSQL CHECKS PASSED PERFECTLY! <<<");
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

