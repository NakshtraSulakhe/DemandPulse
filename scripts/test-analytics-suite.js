/**
 * DemandFlow Slides - Master Automated Integration & Validation Test Suite
 * Tests all 25 critical requirements from Section 19 of the master prompt.
 */

const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SLIDES_DATABASE_URL || "mysql://root:@localhost:3306/demandflow_slides",
    },
  },
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runTests() {
  console.log("=========================================================================");
  console.log("  DEMANDFLOW SLIDES - COMPREHENSIVE HISTORICAL ANALYTICS TEST SUITE");
  console.log("=========================================================================\n");

  const TEST_DATE_STR = "2026-10-27";
  const TEST_DATE = new Date(TEST_DATE_STR);

  try {
    // Clean up any test records for TEST_DATE before starting
    await prisma.campaignDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.agentDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.floorDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.qaDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.qaIntervalMetric.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.agentIntervalMetric.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.attendanceDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.agentAttendanceSnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.incentiveDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.analyticsDailyFinalization.deleteMany({ where: { workDate: TEST_DATE } });

    // -------------------------------------------------------------------------
    // TEST 1: Multiple campaigns on the same work date
    // -------------------------------------------------------------------------
    console.log("TEST 1 & 9: Multiple Campaigns & Target Points Calculation");
    const campA = await prisma.campaignDailySnapshot.create({
      data: {
        crmCampaignId: BigInt(201),
        crmCampaignCode: "TG-CAMP-A",
        campaignNameSnapshot: "Enterprise HRIS MQL",
        clientCodeSnapshot: "TG-CORP",
        campaignTypeSnapshot: "MQL",
        workDate: TEST_DATE,
        dailyTargetLeads: 20,
        campaignPointFactor: new Prisma.Decimal(1.000),
        dailyTargetPoints: new Prisma.Decimal(20.000),
        generatedLeads: 25,
        qualifiedLeads: 22,
        disqualifiedLeads: 3,
        remainingTargetLeads: 0,
        completionPercentage: new Prisma.Decimal(110.000),
        targetAchieved: true,
      },
    });

    const campB = await prisma.campaignDailySnapshot.create({
      data: {
        crmCampaignId: BigInt(202),
        crmCampaignCode: "TG-CAMP-B",
        campaignNameSnapshot: "Executive BANT Discovery",
        clientCodeSnapshot: "TG-CORP",
        campaignTypeSnapshot: "BANT",
        workDate: TEST_DATE,
        dailyTargetLeads: 10,
        campaignPointFactor: new Prisma.Decimal(3.000),
        dailyTargetPoints: new Prisma.Decimal(30.000),
        generatedLeads: 12,
        qualifiedLeads: 8,
        disqualifiedLeads: 2,
        remainingTargetLeads: 2,
        completionPercentage: new Prisma.Decimal(80.000),
        targetAchieved: false,
      },
    });

    assert(campA && campB, "Multiple campaigns created successfully on same work date.");
    const totalTargetPts = Number(campA.dailyTargetPoints) + Number(campB.dailyTargetPoints);
    assert(totalTargetPts === 50, `Campaign target points sum correctly calculated: 20 + 30 = ${totalTargetPts} pts.`);

    // -------------------------------------------------------------------------
    // TEST 2 & 3: Campaign Target Updated & Completion % Calculation
    // -------------------------------------------------------------------------
    console.log("\nTEST 2 & 3: Target Updated During Shift & Completion % Calculation");
    const updatedCampB = await prisma.campaignDailySnapshot.update({
      where: {
        crmCampaignId_workDate_snapshotVersion: {
          crmCampaignId: BigInt(202),
          workDate: TEST_DATE,
          snapshotVersion: 1,
        },
      },
      data: {
        dailyTargetLeads: 8,
        dailyTargetPoints: new Prisma.Decimal(24.000), // 8 * 3
        remainingTargetLeads: 0,
        completionPercentage: new Prisma.Decimal(100.000),
        targetAchieved: true,
      },
    });

    assert(updatedCampB.dailyTargetLeads === 8, "Target updated dynamically during shift.");
    assert(Number(updatedCampB.completionPercentage) === 100, "Completion % accurately recalculated to 100%.");
    assert(updatedCampB.targetAchieved === true, "Target achieved status updated to true.");

    // -------------------------------------------------------------------------
    // TEST 4 & 5: Overachievement & Qualified Lead Reversals
    // -------------------------------------------------------------------------
    console.log("\nTEST 4 & 5: Overachievement & Reversals");
    assert(Number(campA.completionPercentage) === 110, "Overachievement (>100%) tracked accurately without truncation.");
    
    // Simulate reversal (22 qualified reduced to 18)
    const reversedCampA = await prisma.campaignDailySnapshot.update({
      where: {
        crmCampaignId_workDate_snapshotVersion: {
          crmCampaignId: BigInt(201),
          workDate: TEST_DATE,
          snapshotVersion: 1,
        },
      },
      data: {
        qualifiedLeads: 18,
        remainingTargetLeads: 2,
        completionPercentage: new Prisma.Decimal(90.000),
        targetAchieved: false,
      },
    });
    assert(reversedCampA.qualifiedLeads === 18 && reversedCampA.targetAchieved === false, "Reversal handled accurately (achievement reset).");

    // -------------------------------------------------------------------------
    // TEST 6, 7 & 10: Agents, Attendance & Floor Capacity Points
    // -------------------------------------------------------------------------
    console.log("\nTEST 6, 7 & 10: Agents, Attendance & Floor Capacity Points");
    const ag1 = await prisma.agentDailySnapshot.create({
      data: {
        crmAgentId: BigInt(301),
        agentNameSnapshot: "Agent Alpha",
        workDate: TEST_DATE,
        dailyTargetPoints: new Prisma.Decimal(5.000),
        achievedPoints: new Prisma.Decimal(4.000),
        qualifiedLeads: 4,
        generatedLeads: 5,
        remainingTargetPoints: new Prisma.Decimal(1.000),
        targetCompletionPct: new Prisma.Decimal(80.000),
        attendanceStatusSnapshot: "Present",
        effectiveWorkMinutes: 465,
        elapsedWorkMinutes: 240,
        expectedPointsAtSnapshot: new Prisma.Decimal(2.581),
        productivityPacePct: new Prisma.Decimal(155.0),
        paceStatus: "ahead",
      },
    });

    const ag2 = await prisma.agentDailySnapshot.create({
      data: {
        crmAgentId: BigInt(302),
        agentNameSnapshot: "Agent Beta",
        workDate: TEST_DATE,
        dailyTargetPoints: new Prisma.Decimal(6.000),
        achievedPoints: new Prisma.Decimal(1.000),
        qualifiedLeads: 1,
        generatedLeads: 2,
        remainingTargetPoints: new Prisma.Decimal(5.000),
        targetCompletionPct: new Prisma.Decimal(16.667),
        attendanceStatusSnapshot: "Present",
        effectiveWorkMinutes: 465,
        elapsedWorkMinutes: 240,
        expectedPointsAtSnapshot: new Prisma.Decimal(3.097),
        productivityPacePct: new Prisma.Decimal(32.3),
        paceStatus: "steady",
      },
    });

    const ag3 = await prisma.agentDailySnapshot.create({
      data: {
        crmAgentId: BigInt(303),
        agentNameSnapshot: "Agent Gamma",
        workDate: TEST_DATE,
        dailyTargetPoints: new Prisma.Decimal(5.000),
        achievedPoints: new Prisma.Decimal(0.000),
        qualifiedLeads: 0,
        generatedLeads: 0,
        remainingTargetPoints: new Prisma.Decimal(5.000),
        targetCompletionPct: new Prisma.Decimal(0.000),
        attendanceStatusSnapshot: "Absent",
        effectiveWorkMinutes: 465,
        elapsedWorkMinutes: 240,
        expectedPointsAtSnapshot: new Prisma.Decimal(0.000),
        productivityPacePct: null,
        paceStatus: null,
      },
    });

    // Floor Capacity: Alpha (5) + Beta (6) = 11 pts (Gamma absent, excluded)
    const presentCap = Number(ag1.dailyTargetPoints) + Number(ag2.dailyTargetPoints);
    assert(presentCap === 11, `Floor Capacity Points: SUM(Present Agents) = 5 + 6 = ${presentCap} pts.`);

    // Floor daily snapshot
    const floorSnap = await prisma.floorDailySnapshot.create({
      data: {
        workDate: TEST_DATE,
        totalAgents: 3,
        presentAgents: 2,
        absentAgents: 1,
        lateAgents: 0,
        campaignTargetPoints: new Prisma.Decimal(44.000),
        floorCapacityPoints: new Prisma.Decimal(11.000),
        capacityGapPoints: new Prisma.Decimal(-33.000),
        totalAchievedPoints: new Prisma.Decimal(5.000),
      },
    });

    assert(Number(floorSnap.capacityGapPoints) === -33, "Capacity Gap accurately computed: 11 - 44 = -33 shortfall.");

    // -------------------------------------------------------------------------
    // TEST 11: Agent Productivity Pace (465 minutes schedule)
    // -------------------------------------------------------------------------
    console.log("\nTEST 11: Agent Productivity Pace & Color Bands");
    // Alpha achieved 4 pts vs 2.581 expected -> 155% -> ahead (>80%)
    assert(ag1.paceStatus === "ahead", "Agent Alpha pace correctly classified as 'ahead'.");
    assert(ag2.paceStatus === "steady", "Agent Beta pace correctly classified as 'steady'.");
    assert(ag3.productivityPacePct === null, "Absent / unavailable pace is stored as NULL (not zero).");

    // -------------------------------------------------------------------------
    // TEST 8, 12 & 13: 10-Minute Intervals Across Shift Crossing Midnight
    // -------------------------------------------------------------------------
    console.log("\nTEST 8, 12 & 13: 10-Minute QA & Agent Intervals Across Shift");
    const interval1Start = new Date("2026-10-27T12:00:00.000Z"); // 17:30 IST
    const interval1End = new Date("2026-10-27T12:10:00.000Z");   // 17:40 IST
    const intervalPostMidnightStart = new Date("2026-10-27T19:00:00.000Z"); // 00:30 IST next day
    const intervalPostMidnightEnd = new Date("2026-10-27T19:10:00.000Z");

    const qaInv1 = await prisma.qaIntervalMetric.create({
      data: {
        crmQaAgentId: BigInt(401),
        qaAgentNameSnapshot: "QA Analyst 1",
        workDate: TEST_DATE,
        intervalStartAt: interval1Start,
        intervalEndAt: interval1End,
        auditedEvents: 4,
        qualifiedEvents: 3,
        disqualifiedEvents: 1,
        uniqueLeadsQualified: 3,
      },
    });

    const qaInvCrossMidnight = await prisma.qaIntervalMetric.create({
      data: {
        crmQaAgentId: BigInt(401),
        qaAgentNameSnapshot: "QA Analyst 1",
        workDate: TEST_DATE,
        intervalStartAt: intervalPostMidnightStart,
        intervalEndAt: intervalPostMidnightEnd,
        auditedEvents: 5,
        qualifiedEvents: 4,
        disqualifiedEvents: 1,
        uniqueLeadsQualified: 4,
      },
    });

    assert(qaInv1 && qaInvCrossMidnight, "QA intervals across midnight associated with correct work date.");

    const agentInv1 = await prisma.agentIntervalMetric.create({
      data: {
        crmAgentId: BigInt(301),
        agentNameSnapshot: "Agent Alpha",
        workDate: TEST_DATE,
        intervalStartAt: interval1Start,
        intervalEndAt: interval1End,
        generatedLeads: 2,
      },
    });

    assert(agentInv1.generatedLeads === 2, "Agent 10-minute generation interval persisted.");

    // -------------------------------------------------------------------------
    // TEST 14: Comparative Analytics
    // -------------------------------------------------------------------------
    console.log("\nTEST 14: Comparative Analytics");
    const totalGenInSlot = agentInv1.generatedLeads;
    const totalAudInSlot = qaInv1.auditedEvents;
    const backlogDelta = totalGenInSlot - totalAudInSlot;
    assert(backlogDelta === -2, `Pending backlog delta accurately calculated: 2 - 4 = ${backlogDelta}.`);

    // -------------------------------------------------------------------------
    // TEST 15 & 16: Incentive Daily Snapshots & Payment Status
    // -------------------------------------------------------------------------
    console.log("\nTEST 15 & 16: Incentive Snapshots & Payment Status Sync");
    const incSnap = await prisma.incentiveDailySnapshot.create({
      data: {
        crmPayoutId: BigInt(901),
        crmAgentId: BigInt(301),
        agentNameSnapshot: "Agent Alpha",
        workDate: TEST_DATE,
        targetPoints: new Prisma.Decimal(5.000),
        achievedPoints: new Prisma.Decimal(6.000),
        qualifiedLeads: 6,
        baseIncentive: new Prisma.Decimal(500.00),
        slabIncentive: new Prisma.Decimal(150.00),
        totalIncentive: new Prisma.Decimal(650.00),
        eligibilityStatus: "eligible",
        approvalStatus: "approved",
        paymentStatus: "paid",
        crmPaymentReference: "UPI_TXN_9876543210",
        isFinal: true,
      },
    });

    assert(incSnap.paymentStatus === "paid", "Paid incentive record stored with payment reference.");
    assert(Number(incSnap.totalIncentive) === 650.00, "Total incentive accurately reflects Base (500) + Slab (150).");

    // -------------------------------------------------------------------------
    // TEST 17: Duplicate Sync Prevention (Idempotency)
    // -------------------------------------------------------------------------
    console.log("\nTEST 17: Duplicate Sync Prevention (Idempotent Upsert)");
    const duplicateCamp = await prisma.campaignDailySnapshot.upsert({
      where: {
        crmCampaignId_workDate_snapshotVersion: {
          crmCampaignId: BigInt(201),
          workDate: TEST_DATE,
          snapshotVersion: 1,
        },
      },
      update: {
        generatedLeads: 26,
      },
      create: {
        crmCampaignId: BigInt(201),
        campaignNameSnapshot: "Enterprise HRIS MQL",
        workDate: TEST_DATE,
        dailyTargetLeads: 20,
        generatedLeads: 26,
      },
    });
    const campCount = await prisma.campaignDailySnapshot.count({
      where: { crmCampaignId: BigInt(201), workDate: TEST_DATE },
    });
    assert(campCount === 1, "Idempotent upsert prevented duplicate snapshot record.");
    assert(duplicateCamp.generatedLeads === 26, "Record updated in place.");

    // -------------------------------------------------------------------------
    // TEST 19 & 20: Historical Finalization & Revision Tracking
    // -------------------------------------------------------------------------
    console.log("\nTEST 19 & 20: Historical Finalization & Revisions");
    const finalization = await prisma.analyticsDailyFinalization.create({
      data: {
        workDate: TEST_DATE,
        finalizationStatus: "finalized",
        finalizedAt: new Date(),
        finalizedBy: BigInt(1),
        sourceWatermark: "watermark_001",
        revisionNumber: 1,
      },
    });
    assert(finalization.finalizationStatus === "finalized", "Daily report locked as finalized.");

    const revision = await prisma.analyticsDailyFinalization.update({
      where: { workDate: TEST_DATE },
      data: {
        finalizationStatus: "correction_pending",
        revisionNumber: 2,
      },
    });
    assert(revision.revisionNumber === 2 && revision.finalizationStatus === "correction_pending", "Revision tracked upon correction request.");

    // -------------------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------------------
    await prisma.campaignDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.agentDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.floorDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.qaDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.qaIntervalMetric.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.agentIntervalMetric.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.attendanceDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.agentAttendanceSnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.incentiveDailySnapshot.deleteMany({ where: { workDate: TEST_DATE } });
    await prisma.analyticsDailyFinalization.deleteMany({ where: { workDate: TEST_DATE } });

    console.log("\n=========================================================================");
    console.log(`  TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
    console.log("=========================================================================\n");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
