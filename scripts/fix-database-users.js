const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function run() {
  const host = (process.env.DB_HOST || 'srv1274.hstgr.io').replace(/:.*/, '').trim();
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = (process.env.DB_USER || 'u449458970_demandpulse').trim();
  const password = (process.env.DB_PASSWORD || '').replace(/^["']+|["']+$/g, '').trim();
  const database = (process.env.DB_NAME || 'u449458970_demandpulse').trim();

  console.log(`Connecting to MySQL at ${host}:${port} (${database}) as ${user}...`);

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    connectTimeout: 15000,
  });

  console.log('Connected successfully!');

  // Check current columns of slide_app_users
  const [cols] = await conn.query('SHOW COLUMNS FROM slide_app_users');
  console.log('Current columns in slide_app_users:', cols.map(c => c.Field));

  const hasUsername = cols.some(c => c.Field === 'username');
  const hasPasswordHash = cols.some(c => c.Field === 'password_hash');
  const hasRole = cols.some(c => c.Field === 'role');
  const idCol = cols.find(c => c.Field === 'id');
  const isVarcharId = idCol && idCol.Type.toLowerCase().includes('varchar');

  if (!hasUsername || !hasPasswordHash || !hasRole || !isVarcharId) {
    console.log('Table schema is outdated. Rebuilding slide_app_users and slide_user_roles...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('DROP TABLE IF EXISTS slide_user_roles');
    await conn.query('DROP TABLE IF EXISTS slide_user_sessions');
    await conn.query('DROP TABLE IF EXISTS slide_app_users');

    await conn.query(`
      CREATE TABLE \`slide_app_users\` (
        \`id\` VARCHAR(80) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL,
        \`username\` VARCHAR(100) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`display_name\` VARCHAR(150) NOT NULL,
        \`role\` ENUM('admin', 'operations') NOT NULL DEFAULT 'operations',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_app_user_email\` (\`email\`),
        UNIQUE KEY \`uniq_app_user_username\` (\`username\`),
        KEY \`idx_app_user_role_status\` (\`role\`, \`is_active\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`slide_user_roles\` (
        \`user_id\` VARCHAR(80) NOT NULL,
        \`role_id\` BIGINT NOT NULL,
        \`assigned_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`user_id\`, \`role_id\`),
        CONSTRAINT \`fk_user_roles_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`slide_app_users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Rebuilt slide_app_users and slide_user_roles successfully!');
  } else {
    console.log('slide_app_users schema already has the required columns.');
  }

  // Now sync users from data/slide-users.json into slide_app_users
  const jsonPath = path.join(__dirname, '..', 'data', 'slide-users.json');
  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const users = JSON.parse(raw);
    console.log(`Found ${users.length} users in local slide-users.json, syncing to MySQL database...`);

    for (const u of users) {
      await conn.query(
        `INSERT INTO slide_app_users (id, email, username, password_hash, display_name, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           username = VALUES(username),
           password_hash = VALUES(password_hash),
           display_name = VALUES(display_name),
           role = VALUES(role),
           is_active = VALUES(is_active),
           updated_at = NOW()`,
        [u.id, u.email, u.username, u.password_hash, u.display_name, u.role, u.is_active ? 1 : 0]
      );
      console.log(`Synced user: ${u.username} (${u.email}) [${u.role}]`);
    }
  }

  // Verify rows in slide_app_users
  const [dbUsers] = await conn.query('SELECT id, email, username, display_name, role, is_active, created_at FROM slide_app_users');
  console.log('Current users in MySQL database:', dbUsers);

  await conn.end();
  console.log('Database migration and sync completed successfully!');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

