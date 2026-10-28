const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SLIDES_DATABASE_URL || "mysql://root:@localhost:3306/demandflow_slides",
    },
  },
});

const METRIC_DEFINITIONS = [
  {
    metricKey: "generated_leads",
    displayName: "Generated Leads",
    sourceSystem: "crm",
    sourceFieldMapping: "leads.created_at, slide4.agent_heatmap.intervals",
    aggregationDescription: "Total count of leads submitted by SDRs within the business work date shift window (17:30 to 02:30 IST next day).",
    eligibilityDescription: "Any lead generated during the operational shift, regardless of subsequent QA audit outcome.",
    effectiveFrom: new Date("2026-01-01"),
  },
  {
    metricKey: "qualified_leads",
    displayName: "Qualified Leads (Eligible MQL/BANT)",
    sourceSystem: "crm",
    sourceFieldMapping: "leads.qa_status = 'Qualified', slide1.campaigns.qualified_leads",
    aggregationDescription: "Count of leads that passed QA auditing and achieved Qualified status on or for the specified business work date.",
    eligibilityDescription: "Authoritative QA qualification according to CRM campaign validation rules. Basis for point achievement and incentive slabs.",
    effectiveFrom: new Date("2026-01-01"),
  },
  {
    metricKey: "pending_qa",
    displayName: "Pending QA Leads",
    sourceSystem: "crm",
    sourceFieldMapping: "leads.qa_status IN ('Pending', 'In Review', 'Rework Submitted')",
    aggregationDescription: "Point-in-time snapshot count of leads generated for the work date currently awaiting QA review.",
    eligibilityDescription: "Leads not yet marked as Qualified or Disqualified. May change across time as QA analysts audit leads.",
    effectiveFrom: new Date("2026-01-01"),
  },
  {
    metricKey: "daily_target_completion",
    displayName: "Daily Campaign Target Completion %",
    sourceSystem: "slides_and_crm",
    sourceFieldMapping: "slide_campaign_target_plans.proposed_target, campaign_daily_snapshots.completion_percentage",
    aggregationDescription: "Completion % = Qualified Leads / Daily Target Leads * 100. Returns N/A (0.000) when Daily Target is zero.",
    eligibilityDescription: "Tracks allocated target delivery per campaign. Supports overachievement (>100%).",
    effectiveFrom: new Date("2026-01-01"),
  },
  {
    metricKey: "agent_achieved_points",
    displayName: "Agent Achieved Points",
    sourceSystem: "crm",
    sourceFieldMapping: "agent_daily_snapshots.achieved_points, slide2.agents.achieved_points",
    aggregationDescription: "SUM(Qualified Leads * CRM Point Factor). Point factors: MQL=1, HQL/Callback=2, BANT=3, Appointment=5, Email=1.",
    eligibilityDescription: "Only qualified leads audited and approved contribute to agent achieved points.",
    effectiveFrom: new Date("2026-01-01"),
  },
  {
    metricKey: "qa_audited_leads",
    displayName: "QA Audited Leads",
    sourceSystem: "crm",
    sourceFieldMapping: "slide3.qa_heatmap, qa_interval_metrics.audited_events",
    aggregationDescription: "Total audit events logged by QA analysts, plus unique leads audited across 10-minute intervals during the shift.",
    eligibilityDescription: "Measures QA throughput. Prevents double-counting in unique lead metrics while tracking all audit events.",
    effectiveFrom: new Date("2026-01-01"),
  },
  {
    metricKey: "productivity_pace",
    displayName: "Productivity Pace %",
    sourceSystem: "slides_engine",
    sourceFieldMapping: "agent_daily_snapshots.productivity_pace_pct",
    aggregationDescription: "Expected Points = Daily Target Points * Elapsed Effective Work Minutes / 465. Pace % = Achieved Points / Expected Points * 100.",
    eligibilityDescription: "Evaluated during shift hours. Color bands: 0-30% Red, >30-80% Yellow, >80% Green. Pre-shift data is null (not 0).",
    effectiveFrom: new Date("2026-01-01"),
  },
  {
    metricKey: "floor_capacity",
    displayName: "Floor Capacity Points & Gap",
    sourceSystem: "slides_engine",
    sourceFieldMapping: "floor_daily_snapshots.floor_capacity_points, floor_daily_snapshots.capacity_gap_points",
    aggregationDescription: "Floor Capacity Points = SUM(Target Points of Eligible Present Agents). Capacity Gap = Floor Capacity - Campaign Target Points.",
    eligibilityDescription: "Absent/on-leave agents are excluded from floor capacity. Compares operational capacity to campaign demand.",
    effectiveFrom: new Date("2026-01-01"),
  },
  {
    metricKey: "incentive_earned",
    displayName: "Daily Incentive Earned",
    sourceSystem: "crm",
    sourceFieldMapping: "crm_incentive_preview, incentive_daily_snapshots.total_incentive",
    aggregationDescription: "Base Incentive (if achieved >= 100% target and present) + Slab Incentive for points exceeding target.",
    eligibilityDescription: "Calculated per approved policy rules. Subject to QA audit escalation and attendance eligibility checks.",
    effectiveFrom: new Date("2026-01-01"),
  },
  {
    metricKey: "incentive_paid",
    displayName: "Incentive Paid (Disbursed)",
    sourceSystem: "crm",
    sourceFieldMapping: "incentive_daily_snapshots.payment_status = 'paid', crm_payment_reference",
    aggregationDescription: "Total monetary incentive successfully settled and disbursed via CRM UPI/Bank API transfers.",
    eligibilityDescription: "Authoritative financial disbursement executed solely by DemandFlow Bridge CRM payment ledger.",
    effectiveFrom: new Date("2026-01-01"),
  },
];

async function seed() {
  console.log("Seeding metric definitions...");
  for (const def of METRIC_DEFINITIONS) {
    await prisma.analyticsMetricDefinition.upsert({
      where: { metricKey: def.metricKey },
      update: def,
      create: def,
    });
    console.log(`Seeded metric definition: ${def.metricKey}`);
  }
  const count = await prisma.analyticsMetricDefinition.count();
  console.log(`\nSuccessfully seeded ${count} metric definitions.`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
