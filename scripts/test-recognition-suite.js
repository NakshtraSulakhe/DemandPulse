const assert = require('assert');

// Test the filtering logic according to Section 2 and Section 5
function filterEligibleAchievers(agents) {
  return agents.filter((agent) => {
    const target = Number(agent.target_points);
    const achieved = Number(agent.achieved_points);
    const amount = Number(agent.total_incentive);

    return (
      Number.isFinite(target) &&
      Number.isFinite(achieved) &&
      Number.isFinite(amount) &&
      target > 0 &&
      achieved >= target &&
      agent.eligibility_status === 'eligible' &&
      amount > 0
    );
  });
}

function formatIncentiveLabel(item) {
  const amount = Number(item.incentive_amount) || 0;
  if (amount <= 0) return 'Daily Target Achiever';
  if (item.is_settled && item.payment_status === 'paid') {
    return `₹${amount.toLocaleString('en-IN')} Paid Incentive`;
  }
  if (item.is_settled) {
    return `₹${amount.toLocaleString('en-IN')} Earned Incentive`;
  }
  return `₹${amount.toLocaleString('en-IN')} Provisional Earnings`;
}

console.log('Running Recognition & Incentive Integration Test Suite...\n');

// 1. Agent below 100% target -> NOT displayed
const belowTarget = filterEligibleAchievers([{
  agent_id: 1,
  agent_name: 'Below Target SDR',
  target_points: 10,
  achieved_points: 8,
  total_incentive: 0,
  eligibility_status: 'ineligible'
}]);
assert.strictEqual(belowTarget.length, 0, 'Agent below 100% must not be displayed');
console.log('✓ Test 1: Agent below 100% target excluded');

// 2. Agent exactly at 100% and CRM eligible -> DISPLAYED
const exact100 = filterEligibleAchievers([{
  agent_id: 2,
  agent_name: 'Exact 100 SDR',
  target_points: 10,
  achieved_points: 10,
  total_incentive: 500,
  eligibility_status: 'eligible'
}]);
assert.strictEqual(exact100.length, 1, 'Agent exactly at 100% must be displayed');
assert.strictEqual(exact100[0].total_incentive, 500);
console.log('✓ Test 2: Agent exactly at 100% displayed with CRM total incentive');

// 3. Agent above 100% -> DISPLAYED with slab-adjusted amount
const above100 = filterEligibleAchievers([{
  agent_id: 3,
  agent_name: 'Super Achiever SDR',
  target_points: 8,
  achieved_points: 12,
  total_incentive: 900,
  base_incentive: 500,
  slab_incentive: 400,
  eligibility_status: 'eligible'
}]);
assert.strictEqual(above100.length, 1);
assert.strictEqual(above100[0].total_incentive, 900);
console.log('✓ Test 3: Agent above 100% displayed with slab-adjusted amount (₹900)');

// 4. Agent has scored leads but remains below target -> NOT displayed
const scoredLeadsBelowTarget = filterEligibleAchievers([{
  agent_id: 4,
  agent_name: 'Scored Some Leads',
  target_points: 8,
  achieved_points: 3,
  qualified_leads: 3,
  total_incentive: 0,
  eligibility_status: 'ineligible'
}]);
assert.strictEqual(scoredLeadsBelowTarget.length, 0);
console.log('✓ Test 4: Agent with scored leads below target excluded');

// 5. Agent meets target points but is absent and CRM ineligible -> NOT displayed
const absentIneligible = filterEligibleAchievers([{
  agent_id: 5,
  agent_name: 'Absent SDR',
  target_points: 8,
  achieved_points: 8,
  total_incentive: 0,
  eligibility_status: 'ineligible',
  eligibility_reason: 'Agent marked absent'
}]);
assert.strictEqual(absentIneligible.length, 0);
console.log('✓ Test 5: Agent meeting points but absent/ineligible excluded');

// 6. Agent meets target but has blocking QA escalation -> NOT displayed
const escalatedIneligible = filterEligibleAchievers([{
  agent_id: 6,
  agent_name: 'Escalated SDR',
  target_points: 8,
  achieved_points: 10,
  total_incentive: 0,
  eligibility_status: 'ineligible',
  eligibility_reason: 'QA audit escalation pending'
}]);
assert.strictEqual(escalatedIneligible.length, 0);
console.log('✓ Test 6: Agent meeting points with QA escalation excluded');

// 7. Agent has zero target -> NOT displayed
const zeroTarget = filterEligibleAchievers([{
  agent_id: 7,
  agent_name: 'Zero Target SDR',
  target_points: 0,
  achieved_points: 5,
  total_incentive: 0,
  eligibility_status: 'eligible'
}]);
assert.strictEqual(zeroTarget.length, 0);
console.log('✓ Test 7: Zero target SDR excluded (no divide-by-zero)');

// 8. Agent has invalid/null target -> NOT displayed
const nullTarget = filterEligibleAchievers([{
  agent_id: 8,
  agent_name: 'Null Target SDR',
  target_points: null,
  achieved_points: 5,
  total_incentive: 500,
  eligibility_status: 'eligible'
}]);
assert.strictEqual(nullTarget.length, 0);
console.log('✓ Test 8: Null target SDR excluded');

// 9. Actual amount above ₹500
const highEarner = filterEligibleAchievers([{
  agent_id: 9,
  agent_name: 'High Earner',
  target_points: 8,
  achieved_points: 27,
  total_incentive: 5000,
  eligibility_status: 'eligible'
}]);
assert.strictEqual(highEarner[0].total_incentive, 5000);
console.log('✓ Test 9: Display actual high earner amount (₹5,000 > ₹500)');

// 10. CRM returns 0 incentive -> NOT displayed
const zeroIncentive = filterEligibleAchievers([{
  agent_id: 10,
  agent_name: 'No Incentive SDR',
  target_points: 8,
  achieved_points: 8,
  total_incentive: 0,
  eligibility_status: 'eligible'
}]);
assert.strictEqual(zeroIncentive.length, 0);
console.log('✓ Test 10: Zero incentive amount excluded');

// 11. Provisional label during shift
const provLabel = formatIncentiveLabel({
  incentive_amount: 800,
  is_settled: false,
  payment_status: 'unpaid'
});
assert.strictEqual(provLabel, '₹800 Provisional Earnings');
console.log('✓ Test 11: Provisional label formatted as "₹800 Provisional Earnings"');

// 12. Settled label after settlement
const settledLabel = formatIncentiveLabel({
  incentive_amount: 800,
  is_settled: true,
  payment_status: 'unpaid'
});
assert.strictEqual(settledLabel, '₹800 Earned Incentive');
console.log('✓ Test 12: Settled label formatted as "₹800 Earned Incentive"');

// 13. Paid label after disbursement
const paidLabel = formatIncentiveLabel({
  incentive_amount: 800,
  is_settled: true,
  payment_status: 'paid'
});
assert.strictEqual(paidLabel, '₹800 Paid Incentive');
console.log('✓ Test 13: Paid label formatted as "₹800 Paid Incentive"');

// 14. When 0 agents achieved target and 0 celebrations exist, ticker_items is empty
function filterRawItems(ticker_items) {
  return (ticker_items || []).filter((item) => {
    if (item.type === "top_lead_scorer") {
      const target = Number(item.target_points);
      const achieved = Number(item.achieved_points ?? item.score);
      const amount = Number(item.incentive_amount);
      if (!Number.isFinite(target) || target <= 0) return false;
      if (!Number.isFinite(achieved) || achieved < target) return false;
      if (!Number.isFinite(amount) || amount <= 0) return false;
      if (item.is_target_met === false) return false;
      if (item.completion_percentage != null && item.completion_percentage < 100) return false;
      if (item.eligibility_status && item.eligibility_status !== "eligible") return false;
      return true;
    }
    if (item.type === "birthday" || item.type === "anniversary") {
      return true;
    }
    return false;
  });
}

const emptyScrollerItems = filterRawItems([]);
assert.strictEqual(emptyScrollerItems.length, 0, '0 items should result in 0 active cards (scroller returns null)');
console.log('✓ Test 14: 0 achievers and 0 celebrations -> 0 raw items (scroller returns null)');

// 15. No announcement card injected when 0 agents achieve target
const itemsWithAnnouncementAttempt = filterRawItems([{
  id: "no-daily-achievers-announcement",
  type: "announcement",
  title: "No agents have achieved their daily incentive target yet."
}]);
assert.strictEqual(itemsWithAnnouncementAttempt.length, 0, 'Announcement items must be excluded');
console.log('✓ Test 15: Announcement items strictly excluded from recognition scroller');

// 16. Birthday displayed even when 0 agents achieved target
const birthdayOnly = filterRawItems([
  { id: "bday-1", type: "birthday", title: "John Doe", badge: "🎂 Celebrating Birthday Today!" }
]);
assert.strictEqual(birthdayOnly.length, 1);
assert.strictEqual(birthdayOnly[0].type, 'birthday');
assert.strictEqual(birthdayOnly.filter(i => i.type === 'top_lead_scorer').length, 0);
console.log('✓ Test 16: Birthday displays properly when 0 agents achieved target');

// 17. Anniversary displayed even when 0 agents achieved target
const anniversaryOnly = filterRawItems([
  { id: "anni-1", type: "anniversary", title: "Jane Smith", badge: "🌟 3 Years Work Anniversary!" }
]);
assert.strictEqual(anniversaryOnly.length, 1);
assert.strictEqual(anniversaryOnly[0].type, 'anniversary');
console.log('✓ Test 17: Work anniversary displays properly when 0 agents achieved target');

// 18. Filter pills visibility logic: Top pill hidden when topScorersCount is 0
function getVisiblePills(items) {
  const topCount = items.filter(i => i.type === 'top_lead_scorer').length;
  const bdayCount = items.filter(i => i.type === 'birthday').length;
  const annivCount = items.filter(i => i.type === 'anniversary').length;
  const distinctCats = (topCount > 0 ? 1 : 0) + (bdayCount > 0 ? 1 : 0) + (annivCount > 0 ? 1 : 0);

  if (distinctCats <= 1) return []; // No category pills needed if 1 or 0 categories
  const pills = ['all'];
  if (topCount > 0) pills.push('top_lead_scorer');
  if (bdayCount > 0) pills.push('birthday');
  if (annivCount > 0) pills.push('anniversary');
  return pills;
}

const pillsForBirthdayOnly = getVisiblePills(birthdayOnly);
assert.deepStrictEqual(pillsForBirthdayOnly, [], 'No category pills needed when only birthdays exist');

const mixedItems = filterRawItems([
  { id: "bday-1", type: "birthday", title: "John Doe" },
  { id: "achiever-1", type: "top_lead_scorer", target_points: 10, achieved_points: 12, incentive_amount: 500, is_target_met: true, eligibility_status: "eligible" }
]);
const mixedPills = getVisiblePills(mixedItems);
assert.deepStrictEqual(mixedPills, ['all', 'top_lead_scorer', 'birthday']);
console.log('✓ Test 18: Filter pills dynamically show only active categories and never "Top (0)"');

console.log('\n======================================');
console.log('ALL RECOGNITION TESTS PASSED (18/18)!');
console.log('======================================');

