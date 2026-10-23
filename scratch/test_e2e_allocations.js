import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

console.log("=================================================");
console.log(" DEMANDPULSE CAMPAIGN TARGETS ALLOCATION TEST SUITE");
console.log("=================================================\n");

// Use a temporary test database to test the SQLite schema and functions
const testDbPath = path.join(process.cwd(), "scratch", "test_allocations.db");
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const db = new DatabaseSync(testDbPath);

// Initialize schema exactly as defined in src/lib/db/allocations.ts
db.exec(`
  CREATE TABLE IF NOT EXISTS campaign_daily_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    allocation_id TEXT NOT NULL,
    campaign_id INTEGER NOT NULL,
    campaign_name TEXT,
    client_code TEXT,
    business_date TEXT NOT NULL,
    daily_target INTEGER NOT NULL DEFAULT 0,
    monthly_allocation INTEGER,
    created_by TEXT NOT NULL DEFAULT 'Admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by TEXT NOT NULL DEFAULT 'Admin',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    UNIQUE(campaign_id, business_date)
  );

  CREATE TABLE IF NOT EXISTS campaign_allocation_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    allocation_id TEXT NOT NULL,
    campaign_id INTEGER NOT NULL,
    campaign_name TEXT,
    client_code TEXT,
    business_date TEXT NOT NULL,
    previous_target INTEGER,
    new_target INTEGER NOT NULL,
    changed_by TEXT NOT NULL DEFAULT 'Admin',
    change_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    operation_type TEXT NOT NULL,
    notes TEXT
  );
`);

console.log("✓ Schema initialized successfully with UNIQUE(campaign_id, business_date).");

// TEST 1: Creation and unique constraint
console.log("\n[TEST 1] Creation, Upsert & Unique Constraint...");
const date1 = "2026-10-23";
const date2 = "2026-10-24";

// Insert Campaign 101 on date1 with target 25
db.prepare(`
  INSERT INTO campaign_daily_allocations 
    (allocation_id, campaign_id, campaign_name, client_code, business_date, daily_target, created_by, updated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run("alloc_101_d1", 101, "HRIS Campaign A", "TG-1020", date1, 25, "TestAdmin", "TestAdmin");

// Insert Audit
db.prepare(`
  INSERT INTO campaign_allocation_audit
    (allocation_id, campaign_id, campaign_name, client_code, business_date, previous_target, new_target, changed_by, operation_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run("alloc_101_d1", 101, "HRIS Campaign A", "TG-1020", date1, null, 25, "TestAdmin", "INSERT");

const count1 = db.prepare("SELECT count(*) as count FROM campaign_daily_allocations").get().count;
assert.strictEqual(count1, 1, "Should have 1 record");

// Update same campaign on same date (upsert)
db.prepare(`
  INSERT INTO campaign_daily_allocations 
    (allocation_id, campaign_id, campaign_name, client_code, business_date, daily_target, created_by, updated_by, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(campaign_id, business_date) DO UPDATE SET
    daily_target = excluded.daily_target,
    updated_by = excluded.updated_by,
    updated_at = datetime('now')
`).run("alloc_101_d1", 101, "HRIS Campaign A", "TG-1020", date1, 40, "TestAdmin", "TestAdmin");

// Insert Audit update
db.prepare(`
  INSERT INTO campaign_allocation_audit
    (allocation_id, campaign_id, campaign_name, client_code, business_date, previous_target, new_target, changed_by, operation_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run("alloc_101_d1", 101, "HRIS Campaign A", "TG-1020", date1, 25, 40, "TestAdmin", "UPDATE");

const recDate1 = db.prepare("SELECT * FROM campaign_daily_allocations WHERE campaign_id = 101 AND business_date = ?").get(date1);
assert.strictEqual(recDate1.daily_target, 40, "Target should be updated to 40");
const countAfterUpsert = db.prepare("SELECT count(*) as count FROM campaign_daily_allocations").get().count;
assert.strictEqual(countAfterUpsert, 1, "Count should still be 1 (no duplicate rows!)");
console.log("✓ Upsert and unique constraint on (campaign_id, business_date) verified.");

// TEST 2: Historical Dates Independence
console.log("\n[TEST 2] Historical Dates Independence...");
// Insert Campaign 101 on date2 with target 15
db.prepare(`
  INSERT INTO campaign_daily_allocations 
    (allocation_id, campaign_id, campaign_name, client_code, business_date, daily_target, created_by, updated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run("alloc_101_d2", 101, "HRIS Campaign A", "TG-1020", date2, 15, "TestAdmin", "TestAdmin");

const checkDate1Again = db.prepare("SELECT daily_target FROM campaign_daily_allocations WHERE campaign_id = 101 AND business_date = ?").get(date1);
const checkDate2 = db.prepare("SELECT daily_target FROM campaign_daily_allocations WHERE campaign_id = 101 AND business_date = ?").get(date2);
assert.strictEqual(checkDate1Again.daily_target, 40, "Date1 target must remain 40");
assert.strictEqual(checkDate2.daily_target, 15, "Date2 target must be 15");
console.log("✓ Dates remain completely independent.");

// TEST 3: Zero-target storage & preservation
console.log("\n[TEST 3] Zero Target Handling...");
// Insert Campaign 102 on date1 with target 0
db.prepare(`
  INSERT INTO campaign_daily_allocations 
    (allocation_id, campaign_id, campaign_name, client_code, business_date, daily_target, created_by, updated_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run("alloc_102_d1", 102, "Fintech Campaign B", "TG-1020", date1, 0, "TestAdmin", "TestAdmin");

const zeroRec = db.prepare("SELECT * FROM campaign_daily_allocations WHERE campaign_id = 102 AND business_date = ?").get(date1);
assert.ok(zeroRec !== undefined, "Zero target allocation must be saved in database");
assert.strictEqual(zeroRec.daily_target, 0, "Target should be 0");
console.log("✓ Zero target permanently stored in DB.");

// TEST 4: Audit Trail Preservation
console.log("\n[TEST 4] Audit Trail Integrity...");
const auditRows = db.prepare("SELECT * FROM campaign_allocation_audit WHERE campaign_id = 101 ORDER BY id ASC").all();
assert.strictEqual(auditRows.length, 2, "Should have 2 audit rows for Campaign 101");
assert.strictEqual(auditRows[0].previous_target, null);
assert.strictEqual(auditRows[0].new_target, 25);
assert.strictEqual(auditRows[0].operation_type, "INSERT");
assert.strictEqual(auditRows[1].previous_target, 25);
assert.strictEqual(auditRows[1].new_target, 40);
assert.strictEqual(auditRows[1].operation_type, "UPDATE");
console.log("✓ Audit trail preserves full history including previous and new targets.");

// TEST 5: Calculations Verification
console.log("\n[TEST 5] Calculations Verification...");
function calcRemaining(target, qualified) {
  return Math.max(0, target - qualified);
}
function calcProgress(target, qualified) {
  return target > 0 ? (qualified / target) * 100 : 0;
}

// Normal case: Target 20, Qualified 12 => Remaining 8, Progress 60%
assert.strictEqual(calcRemaining(20, 12), 8);
assert.strictEqual(calcProgress(20, 12), 60);

// Zero target: Target 0, Qualified 5 => Remaining 0, Progress 0% (avoid div by 0)
assert.strictEqual(calcRemaining(0, 5), 0);
assert.strictEqual(calcProgress(0, 5), 0);

// Over-fulfillment: Target 10, Qualified 15 => Remaining 0 (never negative), Progress 150%
assert.strictEqual(calcRemaining(10, 15), 0);
assert.strictEqual(calcProgress(10, 15), 150);

// Zero qualified: Target 30, Qualified 0 => Remaining 30, Progress 0%
assert.strictEqual(calcRemaining(30, 0), 30);
assert.strictEqual(calcProgress(30, 0), 0);
console.log("✓ Calculations (Remaining, Progress, Division-by-Zero safety) verified.");

// TEST 6: Slide 1 Presentation Dashboard Filter Logic
console.log("\n[TEST 6] Slide 1 Dashboard Filter Logic...");
// Query only campaigns with saved positive allocations for date1
const positiveAllocations = db.prepare(`
  SELECT * FROM campaign_daily_allocations 
  WHERE business_date = ? AND daily_target > 0
`).all(date1);

assert.strictEqual(positiveAllocations.length, 1, "Only Campaign 101 should match (102 has target 0)");
assert.strictEqual(positiveAllocations[0].campaign_id, 101);

// Simulated live CRM campaign list with 4 campaigns:
const mockCrmCampaigns = [
  { campaign_id: 101, campaign_name: "HRIS A", active: 1, campaign_status: "Live", qualified_leads: 18, monthly_allocation: 500 },
  { campaign_id: 102, campaign_name: "Fintech B", active: 1, campaign_status: "Live", qualified_leads: 4, monthly_allocation: 300 }, // target is 0 in DB
  { campaign_id: 103, campaign_name: "Health C", active: 1, campaign_status: "Live", qualified_leads: 0, monthly_allocation: 200 }, // no allocation in DB
  { campaign_id: 104, campaign_name: "Inactive D", active: 0, campaign_status: "Live", qualified_leads: 0, monthly_allocation: 100 }, // inactive
];

const savedAllocMap = new Map();
db.prepare("SELECT * FROM campaign_daily_allocations WHERE business_date = ?").all(date1).forEach(r => {
  savedAllocMap.set(r.campaign_id, r);
});

const slide1Filtered = mockCrmCampaigns.filter(c => {
  if (c.active === 0) return false;
  const statusStr = (c.campaign_status || "Live").toLowerCase();
  if (statusStr !== "live") return false;
  const saved = savedAllocMap.get(c.campaign_id);
  if (!saved || saved.daily_target <= 0) return false;
  return true;
}).map(c => {
  const saved = savedAllocMap.get(c.campaign_id);
  const target = saved.daily_target;
  const remaining = calcRemaining(target, c.qualified_leads);
  const progress = calcProgress(target, c.qualified_leads);
  return { ...c, daily_target: target, remaining, progress };
});

assert.strictEqual(slide1Filtered.length, 1, "Only Campaign 101 should appear on Slide 1");
assert.strictEqual(slide1Filtered[0].campaign_id, 101);
assert.strictEqual(slide1Filtered[0].daily_target, 40);
assert.strictEqual(slide1Filtered[0].remaining, 22); // 40 - 18 = 22
assert.strictEqual(slide1Filtered[0].progress, 45); // 18 / 40 * 100 = 45%
console.log("✓ Slide 1 filtering strictly isolates active, live, positive-allocation campaigns for the selected business date.");

// TEST 7: Totals Calculation for Visible Campaigns
console.log("\n[TEST 7] Totals Calculation for Visible Campaigns...");
const totalMonthly = slide1Filtered.reduce((sum, c) => sum + c.monthly_allocation, 0);
const totalDaily = slide1Filtered.reduce((sum, c) => sum + c.daily_target, 0);
const totalQualified = slide1Filtered.reduce((sum, c) => sum + c.qualified_leads, 0);
const totalRemaining = calcRemaining(totalDaily, totalQualified);
const overallPct = calcProgress(totalDaily, totalQualified);

assert.strictEqual(totalMonthly, 500);
assert.strictEqual(totalDaily, 40);
assert.strictEqual(totalQualified, 18);
assert.strictEqual(totalRemaining, 22);
assert.strictEqual(overallPct, 45);
console.log("✓ Visible totals calculate correctly.");

// TEST 8: Timezone US Eastern Business Date
console.log("\n[TEST 8] US Eastern Timezone Verification...");
const testDate = new Date("2026-10-23T23:30:00Z"); // 23:30 UTC
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const easternDate = formatter.format(testDate);
assert.strictEqual(easternDate, "2026-10-23", "23:30 UTC is 19:30 EDT on 2026-10-23");
console.log(`✓ US Eastern time (America/New_York) correctly resolved: ${easternDate}`);

// Cleanup test db
db.close();
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

console.log("\n=================================================");
console.log(" ALL 8 INTEGRATION AND UNIT TESTS PASSED (100%)");
console.log("=================================================");
