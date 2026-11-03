import { execute } from "@/lib/db";
import fs from "fs";
import path from "path";

async function runMigration() {
  console.log("🚀 Starting One-Time Migration: Local Storage & JSON Files -> MySQL (demandflow_slides)...");

  const dataDir = path.join(process.cwd(), "data");
  const backupDir = path.join(process.cwd(), "data", "migration_backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Migrate CRM Config
  const crmConfigFile = path.join(dataDir, "crm-config.json");
  if (fs.existsSync(crmConfigFile)) {
    console.log("📦 Migrating data/crm-config.json to MySQL...");
    try {
      const raw = fs.readFileSync(crmConfigFile, "utf-8");
      const crmJson = JSON.parse(raw);

      await execute(
        `INSERT INTO slide_crm_connection_settings
           (id, connection_name, base_url, polling_interval_seconds, timeout_seconds, mock_fallback, auto_sync_enabled, is_active, updated_at)
         VALUES (1, 'Production Bridge CRM', ?, ?, ?, ?, ?, 1, NOW(6))
         ON DUPLICATE KEY UPDATE
           base_url = VALUES(base_url),
           polling_interval_seconds = VALUES(polling_interval_seconds),
           timeout_seconds = VALUES(timeout_seconds),
           mock_fallback = VALUES(mock_fallback),
           auto_sync_enabled = VALUES(auto_sync_enabled),
           updated_at = NOW(6)`,
        [
          crmJson.crmApiBaseUrl || "https://app.tarajglobal.com/demandflowbridge/api/v1",
          crmJson.analyticsSyncInterval || 30,
          Math.round((crmJson.crmApiTimeoutMs || 30000) / 1000),
          crmJson.crmMockFallback ? 1 : 0,
          crmJson.autoSyncEnabled !== false ? 1 : 0,
        ]
      );

      await execute(
        `INSERT INTO slide_system_settings (setting_key, setting_value, updated_at)
         VALUES ('crm_connection_config', ?, NOW(6))
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(6)`,
        [JSON.stringify(crmJson)]
      );

      console.log("✅ CRM Config successfully migrated to MySQL.");
    } catch (e) {
      console.error("Failed to migrate CRM config:", e);
    }
  }

  // 2. Migrate Shift Config
  const shiftConfigFile = path.join(dataDir, "shift-config.json");
  if (fs.existsSync(shiftConfigFile)) {
    console.log("📦 Migrating data/shift-config.json to MySQL...");
    try {
      const raw = fs.readFileSync(shiftConfigFile, "utf-8");
      const shiftJson = JSON.parse(raw);

      await execute(
        `INSERT INTO slide_business_calendars
           (calendar_name, shift_code, business_timezone, display_timezone, shift_start_local, shift_end_local,
            shift_timezone, schedule_mode, working_days_json, grace_period_minutes, version, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(6), NOW(6))
         ON DUPLICATE KEY UPDATE
           calendar_name = VALUES(calendar_name),
           shift_code = VALUES(shift_code),
           updated_at = NOW(6)`,
        [
          shiftJson.shiftName || "US Shift Operations",
          shiftJson.shiftCode || "US_SHIFT",
          shiftJson.reportingTimezone || "America/New_York",
          shiftJson.timezone || "Asia/Kolkata",
          shiftJson.startTime || "17:30:00",
          shiftJson.endTime || "02:30:00",
          shiftJson.timezone || "Asia/Kolkata",
          shiftJson.crossesMidnight ? "cross_midnight" : "same_day",
          JSON.stringify(shiftJson.workingDays || [1, 2, 3, 4, 5]),
          shiftJson.gracePeriodMinutes || 0,
        ]
      );

      console.log("✅ Shift Config successfully migrated to MySQL.");
    } catch (e) {
      console.error("Failed to migrate Shift config:", e);
    }
  }

  // 3. Migrate Incentive Rules
  const incentiveConfigFile = path.join(dataDir, "incentive-rules.json");
  if (fs.existsSync(incentiveConfigFile)) {
    console.log("📦 Migrating data/incentive-rules.json to MySQL...");
    try {
      const raw = fs.readFileSync(incentiveConfigFile, "utf-8");
      const incJson = JSON.parse(raw);

      await execute(
        `INSERT INTO slide_system_settings (setting_key, setting_value, updated_at)
         VALUES ('legacy_incentive_rules_config', ?, NOW(6))
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(6)`,
        [JSON.stringify(incJson)]
      );

      console.log("✅ Incentive rules successfully migrated to MySQL.");
    } catch (e) {
      console.error("Failed to migrate Incentive rules:", e);
    }
  }

  // 4. Default user and display preferences
  await execute(
    `INSERT INTO slide_user_preferences (user_id, theme, header_drawer_open, tv_mode_enabled, display_scaling, heatmap_interval_minutes, updated_at)
     VALUES (1, 'dark', 0, 0, 'normal', 10, NOW(6))
     ON DUPLICATE KEY UPDATE updated_at = NOW(6)`
  );

  await execute(
    `INSERT INTO slide_display_preferences (display_identifier, tv_mode_enabled, display_scaling, heatmap_interval_minutes, slide_interval_seconds, updated_at)
     VALUES ('default', 1, 'normal', 10, 30, NOW(6))
     ON DUPLICATE KEY UPDATE updated_at = NOW(6)`
  );

  console.log("✅ Default user & display preferences registered in MySQL.");

  const filesToBackup = ["crm-config.json", "shift-config.json", "incentive-rules.json"];
  for (const f of filesToBackup) {
    const src = path.join(dataDir, f);
    const dest = path.join(backupDir, `${f}.migrated_${Date.now()}`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`🔒 Created backup of ${f} at data/migration_backup/`);
    }
  }

  console.log("🎉 Complete One-Time Data Migration Finished Successfully!");
}

runMigration()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  });
