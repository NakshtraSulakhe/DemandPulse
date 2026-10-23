import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function runMigration() {
  console.log("🚀 Starting One-Time Migration: Local Storage & JSON Files -> MySQL (demandflow_slides)...");

  const dataDir = path.join(process.cwd(), "data");
  const backupDir = path.join(process.cwd(), "data", "migration_backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Migrate CRM Config (data/crm-config.json -> slide_crm_connection_settings & slide_system_settings)
  const crmConfigFile = path.join(dataDir, "crm-config.json");
  if (fs.existsSync(crmConfigFile)) {
    console.log("📦 Migrating data/crm-config.json to MySQL...");
    try {
      const raw = fs.readFileSync(crmConfigFile, "utf-8");
      const crmJson = JSON.parse(raw);

      // Save to slide_crm_connection_settings
      await prisma.slideCrmConnectionSetting.upsert({
        where: { id: BigInt(1) },
        update: {
          connectionName: "Production Bridge CRM",
          baseUrl: crmJson.crmApiBaseUrl || "https://app.tarajglobal.com/demandflowbridge/api/v1",
          pollingIntervalSeconds: crmJson.analyticsSyncInterval || 30,
          timeoutSeconds: Math.round((crmJson.crmApiTimeoutMs || 30000) / 1000),
          mockFallback: Boolean(crmJson.crmMockFallback),
          autoSyncEnabled: crmJson.autoSyncEnabled !== false,
          isActive: true,
        },
        create: {
          id: BigInt(1),
          connectionName: "Production Bridge CRM",
          baseUrl: crmJson.crmApiBaseUrl || "https://app.tarajglobal.com/demandflowbridge/api/v1",
          pollingIntervalSeconds: crmJson.analyticsSyncInterval || 30,
          timeoutSeconds: Math.round((crmJson.crmApiTimeoutMs || 30000) / 1000),
          mockFallback: Boolean(crmJson.crmMockFallback),
          autoSyncEnabled: crmJson.autoSyncEnabled !== false,
          isActive: true,
        },
      });

      // Save full config to slide_system_settings
      await prisma.slideSystemSetting.upsert({
        where: { settingKey: "crm_connection_config" },
        update: { settingValue: crmJson },
        create: { settingKey: "crm_connection_config", settingValue: crmJson },
      });

      // Also ensure presentation defaultSlideSeconds is updated
      if (crmJson.slideRotationInterval) {
        await prisma.slidePresentation.updateMany({
          where: { slug: "executive-presentation" },
          data: { defaultSlideSeconds: crmJson.slideRotationInterval },
        });
      }

      console.log("✅ CRM connection settings migrated successfully to MySQL.");
    } catch (err) {
      console.error("⚠️ Failed to parse/migrate crm-config.json:", err);
    }
  }

  // 2. Migrate Shift Config (data/shift-config.json -> slide_business_calendars)
  const shiftConfigFile = path.join(dataDir, "shift-config.json");
  if (fs.existsSync(shiftConfigFile)) {
    console.log("📦 Migrating data/shift-config.json to MySQL...");
    try {
      const raw = fs.readFileSync(shiftConfigFile, "utf-8");
      const shiftJson = JSON.parse(raw);

      await prisma.slideBusinessCalendar.upsert({
        where: { id: BigInt(1) },
        update: {
          calendarName: shiftJson.shiftName || "US Shift Operations (India Delivery)",
          shiftCode: shiftJson.shiftCode || "US_SHIFT",
          businessTimezone: shiftJson.reportingTimezone || "America/New_York",
          displayTimezone: shiftJson.timezone || "Asia/Kolkata",
          shiftStartLocal: shiftJson.startTime || "17:30:00",
          shiftEndLocal: shiftJson.endTime || "02:30:00",
          shiftTimezone: shiftJson.timezone || "Asia/Kolkata",
          qaCutoffMinutes: 60,
          settlementDelayMinutes: 30,
          scheduleMode: shiftJson.crossesMidnight ? "cross_midnight" : "same_day",
          workingDaysJson: shiftJson.workingDays || [1, 2, 3, 4, 5],
          gracePeriodMinutes: shiftJson.gracePeriodMinutes || 0,
          version: shiftJson.version || 2,
          isActive: shiftJson.isActive !== false,
        },
        create: {
          id: BigInt(1),
          calendarName: shiftJson.shiftName || "US Shift Operations (India Delivery)",
          shiftCode: shiftJson.shiftCode || "US_SHIFT",
          businessTimezone: shiftJson.reportingTimezone || "America/New_York",
          displayTimezone: shiftJson.timezone || "Asia/Kolkata",
          shiftStartLocal: shiftJson.startTime || "17:30:00",
          shiftEndLocal: shiftJson.endTime || "02:30:00",
          shiftTimezone: shiftJson.timezone || "Asia/Kolkata",
          qaCutoffMinutes: 60,
          settlementDelayMinutes: 30,
          scheduleMode: shiftJson.crossesMidnight ? "cross_midnight" : "same_day",
          workingDaysJson: shiftJson.workingDays || [1, 2, 3, 4, 5],
          gracePeriodMinutes: shiftJson.gracePeriodMinutes || 0,
          version: shiftJson.version || 2,
          isActive: shiftJson.isActive !== false,
        },
      });

      console.log("✅ Shift business calendar migrated successfully to MySQL.");
    } catch (err) {
      console.error("⚠️ Failed to parse/migrate shift-config.json:", err);
    }
  }

  // 3. Migrate Incentive Rules Config (data/incentive-rules.json -> slide_system_settings & incentive_policies)
  const incentiveConfigFile = path.join(dataDir, "incentive-rules.json");
  if (fs.existsSync(incentiveConfigFile)) {
    console.log("📦 Migrating data/incentive-rules.json to MySQL...");
    try {
      const raw = fs.readFileSync(incentiveConfigFile, "utf-8");
      const incJson = JSON.parse(raw);

      await prisma.slideSystemSetting.upsert({
        where: { settingKey: "legacy_incentive_rules_config" },
        update: { settingValue: incJson },
        create: { settingKey: "legacy_incentive_rules_config", settingValue: incJson },
      });

      console.log("✅ Legacy incentive rules configuration backed up into slide_system_settings.");
    } catch (err) {
      console.error("⚠️ Failed to parse/migrate incentive-rules.json:", err);
    }
  }

  // 4. Initialize User & Display Default Preferences in MySQL
  console.log("📦 Initializing slide_user_preferences and slide_display_preferences in MySQL...");
  await prisma.slideUserPreference.upsert({
    where: { userId: BigInt(1) },
    update: {
      theme: "dark",
      headerDrawerOpen: false,
      tvModeEnabled: false,
      displayScaling: "normal",
      heatmapIntervalMinutes: 10,
    },
    create: {
      userId: BigInt(1),
      theme: "dark",
      headerDrawerOpen: false,
      tvModeEnabled: false,
      displayScaling: "normal",
      heatmapIntervalMinutes: 10,
    },
  });

  await prisma.slideDisplayPreference.upsert({
    where: { displayIdentifier: "default" },
    update: {
      tvModeEnabled: true,
      displayScaling: "normal",
      heatmapIntervalMinutes: 10,
      slideIntervalSeconds: 30,
    },
    create: {
      displayIdentifier: "default",
      tvModeEnabled: true,
      displayScaling: "normal",
      heatmapIntervalMinutes: 10,
      slideIntervalSeconds: 30,
    },
  });

  console.log("✅ Default user & display preferences registered in MySQL.");

  // 5. Create backup copies of JSON files into data/migration_backup/
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
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
