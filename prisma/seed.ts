import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting DemandFlow Slides database seed...");

  // 1. Seed Slide Definitions (5 Existing Core Slides)
  const slides = [
    {
      slideKey: "operations_overview",
      title: "Operations Overview",
      description: "Executive live metrics, total lead generation, qualification ratios, and campaign KPIs.",
      componentKey: "operations-overview",
      configSchemaVersion: 1,
      isEnabled: true,
    },
    {
      slideKey: "agent_productivity",
      title: "Agent Productivity",
      description: "Live agent dials, qualified leads, productivity scorecards, and ranking.",
      componentKey: "agent-productivity",
      configSchemaVersion: 1,
      isEnabled: true,
    },
    {
      slideKey: "qa_heatmap",
      title: "QA Audit Heatmap",
      description: "Hourly QA audit distribution, fatal error tracking, and compliance rates.",
      componentKey: "qa-heatmap",
      configSchemaVersion: 1,
      isEnabled: true,
    },
    {
      slideKey: "agent_heatmap",
      title: "Agent Activity Heatmap",
      description: "Hourly lead production breakdown across shifts and active campaign queues.",
      componentKey: "agent-heatmap",
      configSchemaVersion: 1,
      isEnabled: true,
    },
    {
      slideKey: "comparative_analytics",
      title: "Comparative Analytics",
      description: "Multi-campaign pacing, target achievement percentages, and comparative trends.",
      componentKey: "comparative-analytics",
      configSchemaVersion: 1,
      isEnabled: true,
    },
  ];

  console.log("Seeding slide definitions...");
  const createdDefinitions: Record<string, bigint> = {};

  for (const slide of slides) {
    const record = await prisma.slideDefinition.upsert({
      where: { slideKey: slide.slideKey },
      update: {
        title: slide.title,
        description: slide.description,
        componentKey: slide.componentKey,
        configSchemaVersion: slide.configSchemaVersion,
        isEnabled: slide.isEnabled,
      },
      create: slide,
    });
    createdDefinitions[slide.slideKey] = record.id;
  }

  // 2. Seed Default Slide Presentation Profile
  console.log("Seeding default presentation profile...");
  const presentation = await prisma.slidePresentation.upsert({
    where: { slug: "executive-presentation" },
    update: {
      name: "DemandFlow Executive Live Presentation",
      isActive: true,
      defaultSlideSeconds: 30,
      refreshIntervalSeconds: 30,
      themeConfig: {
        theme: "dark",
        primaryColor: "#3b82f6",
        background: "#090d16",
        showTicker: true,
      },
    },
    create: {
      name: "DemandFlow Executive Live Presentation",
      slug: "executive-presentation",
      isActive: true,
      defaultSlideSeconds: 30,
      refreshIntervalSeconds: 30,
      themeConfig: {
        theme: "dark",
        primaryColor: "#3b82f6",
        background: "#090d16",
        showTicker: true,
      },
    },
  });

  // 3. Seed Playlist Items
  console.log("Seeding presentation playlist items...");
  const playlistItems = [
    "operations_overview",
    "agent_productivity",
    "qa_heatmap",
    "agent_heatmap",
    "comparative_analytics",
  ];

  let order = 1;
  for (const key of playlistItems) {
    const defId = createdDefinitions[key];
    if (defId) {
      const existing = await prisma.slidePlaylistItem.findFirst({
        where: {
          presentationId: presentation.id,
          slideDefinitionId: defId,
        },
      });

      if (!existing) {
        await prisma.slidePlaylistItem.create({
          data: {
            presentationId: presentation.id,
            slideDefinitionId: defId,
            displayOrder: order,
            durationSeconds: 30,
            isEnabled: true,
            configJson: {},
          },
        });
      }
      order++;
    }
  }

  // 4. Seed Business Calendar (Cross-Midnight US Shift: 5:30 PM to 2:30 AM IST)
  console.log("Seeding business calendar for US Shift...");
  const existingCalendar = await prisma.slideBusinessCalendar.findFirst({
    where: { calendarName: "US Shift Operations (India Delivery)" },
  });

  if (!existingCalendar) {
    await prisma.slideBusinessCalendar.create({
      data: {
        calendarName: "US Shift Operations (India Delivery)",
        businessTimezone: "America/New_York",
        displayTimezone: "Asia/Kolkata",
        shiftStartLocal: "17:30:00",
        shiftEndLocal: "02:30:00",
        shiftTimezone: "Asia/Kolkata",
        qaCutoffMinutes: 60,
        settlementDelayMinutes: 30,
        scheduleMode: "cross_midnight",
        isActive: true,
      },
    });
  }

  // 5. Seed Roles
  console.log("Seeding system roles...");
  const roles = [
    { roleKey: "admin", roleName: "System Administrator" },
    { roleKey: "manager", roleName: "Operations Manager" },
    { roleKey: "finance", roleName: "Finance & Settlements Manager" },
    { roleKey: "viewer", roleName: "Live Slide Viewer" },
  ];

  for (const role of roles) {
    await prisma.slideRole.upsert({
      where: { roleKey: role.roleKey },
      update: { roleName: role.roleName },
      create: role,
    });
  }

  // 6. Seed System Settings
  console.log("Seeding system settings...");
  const defaultSettings = [
    {
      settingKey: "app_branding",
      settingValue: {
        appName: "DemandFlow Live Analytics",
        headerSubtitle: "Executive Operations & Real-Time Production Radar",
        logoUrl: "/icons/demandflow-logo.svg",
      },
    },
    {
      settingKey: "incentive_engine_metadata",
      settingValue: {
        authoritativeSource: "DemandFlow Bridge CRM PHP Engine",
        crmPublishSupported: false,
        lastReconciliationCheck: new Date().toISOString(),
      },
    },
    {
      settingKey: "slide_ticker_config",
      settingValue: {
        enabled: true,
        scrollSpeed: 45,
        displayMode: "earned_amount",
      },
    },
  ];

  for (const s of defaultSettings) {
    await prisma.slideSystemSetting.upsert({
      where: { settingKey: s.settingKey },
      update: { settingValue: s.settingValue },
      create: s,
    });
  }

  // 7. Seed Default Incentive Policy (v1)
  console.log("Seeding default baseline incentive policy...");
  const existingPolicy = await prisma.incentivePolicy.findUnique({
    where: {
      policyCode_version: {
        policyCode: "POL-DEFAULT-DAILY",
        version: 1,
      },
    },
  });

  if (!existingPolicy) {
    const policy = await prisma.incentivePolicy.create({
      data: {
        policyCode: "POL-DEFAULT-DAILY",
        policyName: "Standard Production Daily Incentive Policy",
        version: 1,
        status: "draft",
        currency: "INR",
        validFrom: new Date("2026-01-01"),
        createdBy: BigInt(1),
      },
    });

    await prisma.incentivePolicyRules.create({
      data: {
        policyId: policy.id,
        minimumTargetPct: new Prisma.Decimal(100.0),
        baseIncentiveAmount: new Prisma.Decimal(500.0),
        attendanceRequired: true,
        qaEscalationAction: "disqualify",
        penaltyAmount: new Prisma.Decimal(0.0),
        maximumDailyIncentive: new Prisma.Decimal(5000.0),
        roundingMode: "floor",
      },
    });

    await prisma.incentivePolicySlab.createMany({
      data: [
        {
          policyId: policy.id,
          slabOrder: 1,
          minimumCompletionPct: new Prisma.Decimal(100.0),
          maximumCompletionPct: new Prisma.Decimal(120.0),
          amountPerExtraPoint: new Prisma.Decimal(50.0),
        },
        {
          policyId: policy.id,
          slabOrder: 2,
          minimumCompletionPct: new Prisma.Decimal(120.001),
          maximumCompletionPct: new Prisma.Decimal(150.0),
          amountPerExtraPoint: new Prisma.Decimal(75.0),
        },
        {
          policyId: policy.id,
          slabOrder: 3,
          minimumCompletionPct: new Prisma.Decimal(150.001),
          maximumCompletionPct: null, // open-ended
          amountPerExtraPoint: new Prisma.Decimal(100.0),
        },
      ],
    });
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
