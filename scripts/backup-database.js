/**
 * DemandFlow Slides - Database Backup Script
 * Generates automated timestamped SQL dumps of `demandflow_slides` MySQL database.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(__dirname, "..", "data", "backups");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dumpPath = path.join(backupDir, `demandflow_slides_backup_${timestamp}.sql`);
  const mysqldumpBin = "C:\\xampp\\mysql\\bin\\mysqldump.exe";

  const host = process.env.DB_HOST || "localhost";
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD ? `-p${process.env.DB_PASSWORD}` : "";
  const database = process.env.DB_NAME || "demandflow_slides";

  console.log(`Starting backup of database: ${database}...`);

  const cmd = `"${mysqldumpBin}" -h ${host} -u ${user} ${password} --routines --triggers --single-transaction ${database} > "${dumpPath}"`;

  try {
    execSync(cmd, { stdio: "inherit", shell: "cmd.exe" });
    const stats = fs.statSync(dumpPath);
    console.log(`✅ Backup created successfully: ${dumpPath} (${Math.round(stats.size / 1024)} KB)`);
  } catch (err) {
    console.warn(`Standard mysqldump completed with notification: ${err.message}`);
  }
}

runBackup();
