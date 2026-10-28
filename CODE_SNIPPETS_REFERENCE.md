# Code Snippets Reference: Time-Based Productivity Pace

Quick reference for all code changes and how they work together.

---

## 1. Type Definition (src/types/index.ts)

### What's New
```typescript
export interface AgentSlide2 {
  // ... existing fields ...
  
  // TIME-BASED PRODUCTIVITY PACE (NEW FIELDS)
  elapsed_work_minutes?: number;              // How long agent has been working
  expected_points_at_snapshot?: number;       // What they should achieve by now
  productivity_pace_pct?: number | null;      // Their current pace percentage
  pace_status?: "slow" | "steady" | "ahead" | "pre_shift" | null;  // Status
}
```

### Usage
```typescript
const agent: AgentSlide2 = {
  agent_id: 1,
  agent_name: "John Doe",
  daily_target_points: 100,
  achieved_points: 50,
  completion_percentage: 50,      // 50/100 * 100
  
  // NEW FIELDS:
  elapsed_work_minutes: 210,       // 3.5 hours into shift
  expected_points_at_snapshot: 45, // Should have 45 by now
  productivity_pace_pct: 111,      // 50/45 * 100 = 111%
  pace_status: "ahead"             // They're ahead!
};
```

---

## 2. Data Mapping (src/lib/slides/db-slide-reader.ts)

### getDbSlide2() Function
```typescript
export async function getDbSlide2(
  targetDate?: string,
  page: number = 1,
  limit: number = 100
): Promise<DbSlideReadResult<Slide2Data>> {
  const workDate = targetDate || getShiftBusinessDate();
  const [agents, floorSnap, campaigns, finalization] = await Promise.all([
    getAgentSnapshotsForDate(workDate),
    getFloorDailySnapshotForDate(workDate),
    getCampaignSnapshotsForDate(workDate),
    getDailyFinalization(workDate),
  ]);

  // ... validation code ...

  // MAPPING AGENTS WITH NEW FIELDS
  const mappedAgents: AgentSlide2[] = agents.map((a) => ({
    agent_id: a.crm_agent_id,
    agent_name: a.agent_name_snapshot,
    role: "SDR",
    daily_target_points: a.daily_target_points,
    working_days: 22,
    monthly_target_points: a.daily_target_points * 22,
    generated_leads: a.generated_leads,
    qualified_leads: a.qualified_leads,
    disqualified_leads: a.disqualified_leads,
    pending_qa: a.pending_qa_leads,
    achieved_points: a.achieved_points,
    remaining_points: a.remaining_target_points,
    completion_percentage: a.target_completion_pct,
    is_target_met: a.target_completion_pct >= 100,
    attendance_status: a.attendance_status_snapshot,
    is_present: a.attendance_status_snapshot.toLowerCase() !== "absent",
    
    // TIME-BASED PACE FIELDS (NEW)
    elapsed_work_minutes: a.elapsed_work_minutes || 0,
    expected_points_at_snapshot: a.expected_points_at_snapshot || 0,
    productivity_pace_pct: a.productivity_pace_pct !== null 
      ? a.productivity_pace_pct 
      : null,
    pace_status: a.pace_status,
  }));

  // ... rest of function ...
}
```

---

## 3. Component Logic (src/components/presentation/slide-agent-productivity.tsx)

### Helper Function: getTimeBasedPaceStatus()
```typescript
function getTimeBasedPaceStatus(
  pacePct: number | null | undefined
): {
  status: "slow" | "steady" | "ahead" | "pre_shift";
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  label: string;
} {
  // PRE-SHIFT: Not started yet
  if (pacePct === null || pacePct === undefined || pacePct < 0) {
    return {
      status: "pre_shift",
      color: "text-slate-500",
      bgColor: "bg-slate-200 dark:bg-slate-800",
      borderColor: "border-slate-300 dark:border-slate-700",
      glowColor: "shadow-[0_0_8px_rgba(100,116,139,0.4)]",
      label: "Not started",
    };
  }

  // RED: 0-30% - SLOW
  if (pacePct <= 30) {
    return {
      status: "slow",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/15",
      borderColor: "border-rose-500/30",
      glowColor: "shadow-[0_0_8px_rgba(239,68,68,0.6)]",
      label: "Slow",
    };
  }

  // YELLOW: 31-80% - STEADY
  if (pacePct <= 80) {
    return {
      status: "steady",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/15",
      borderColor: "border-amber-500/30",
      glowColor: "shadow-[0_0_8px_rgba(251,146,60,0.6)]",
      label: "Steady",
    };
  }

  // GREEN: 81-100%+ - AHEAD
  return {
    status: "ahead",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    glowColor: "shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    label: "Ahead",
  };
}
```

### Table Header Update
```typescript
// OLD:
<th className="py-2 px-2.5 text-right">Completion</th>
<th className="py-2 px-2 text-center">Status</th>

// NEW:
<th className="py-2 px-2.5 text-right">Target Progress</th>
<th className="py-2 px-2.5 text-right">Time-Based Pace (7h45m)</th>
<th className="py-2 px-2 text-center">Status</th>
```

### Table Cell Rendering
```typescript
{/* NEW COLUMN: Time-Based Pace */}
<td className="py-2 px-2.5 text-right">
  {(() => {
    // Get pace percentage and determine styling
    const pacePct = agent.productivity_pace_pct ?? null;
    const paceInfo = getTimeBasedPaceStatus(pacePct);
    
    return (
      <div className="flex items-center justify-end gap-2">
        {/* Progress Bar Container */}
        <div className={`w-16 lg:w-24 rounded-full h-2 overflow-hidden border transition-all ${paceInfo.bgColor} ${paceInfo.borderColor}`}>
          {/* Progress Bar Fill */}
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pacePct === null || pacePct < 0
                ? "bg-slate-400 dark:bg-slate-600"  // Gray for pre-shift
                : pacePct <= 30
                ? "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"  // Red for slow
                : pacePct <= 80
                ? "bg-amber-500 shadow-[0_0_8px_rgba(251,146,60,0.6)]"  // Yellow for steady
                : "bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]"  // Green for ahead
            }`}
            // Bar width represents pace percentage (capped at 100%)
            style={{ width: `${Math.min(100, pacePct ?? 0)}%` }}
          />
        </div>
        
        {/* Percentage Display */}
        <span className={`font-mono font-bold text-[11px] ${paceInfo.color} w-10 text-right`}>
          {/* Show X.X% or — for pre-shift */}
          {pacePct !== null && pacePct >= 0 ? `${pacePct.toFixed(1)}%` : "—"}
        </span>
      </div>
    );
  })()}
</td>
```

---

## 4. Pace Calculation Logic (src/lib/db/agent-productivity-repository.ts)

### calculateAgentPace() Function
```typescript
export function calculateAgentPace(
  dailyTargetPoints: number,
  achievedPoints: number,
  elapsedMinutes: number = 0,
  effectiveTotalMinutes: number = 465  // 7h 45m standard
): {
  expectedPoints: number;
  productivityPacePct: number | null;
  paceStatus: "slow" | "steady" | "ahead" | "pre_shift" | null;
} {
  const target = Math.max(0, dailyTargetPoints);
  const achieved = Math.max(0, achievedPoints);

  // PRE-SHIFT: If no time elapsed or no target
  if (elapsedMinutes <= 0 || target <= 0) {
    return {
      expectedPoints: 0,
      productivityPacePct: null,
      paceStatus: "pre_shift",
    };
  }

  // CALCULATE EXPECTED PROGRESS
  // Formula: Expected = (Daily Target) × (Elapsed Time / Total Time)
  // Example: 100 pts target, 50% of shift elapsed = expect 50 pts
  const expected = (target * elapsedMinutes) / effectiveTotalMinutes;
  const cappedElapsed = Math.min(elapsedMinutes, effectiveTotalMinutes);
  const roundedExpected = Math.round(expected * 1000) / 1000;

  if (roundedExpected <= 0) {
    return {
      expectedPoints: 0,
      productivityPacePct: null,
      paceStatus: "pre_shift",
    };
  }

  // CALCULATE PACE PERCENTAGE
  // Formula: Pace % = (Achieved / Expected) × 100
  // Example: Achieved 50, Expected 60 = 83% pace
  const pacePct = Math.round((achieved / roundedExpected) * 100 * 10) / 10;

  // DETERMINE STATUS BASED ON PACE RANGES
  let paceStatus: "slow" | "steady" | "ahead" = "steady";
  if (pacePct <= 30) {
    paceStatus = "slow";    // 0-30% = RED
  } else if (pacePct > 80) {
    paceStatus = "ahead";   // >80% = GREEN
  }
  // else: 31-80% = YELLOW (steady)

  return {
    expectedPoints: roundedExpected,
    productivityPacePct: pacePct,
    paceStatus,
  };
}
```

### Example Calculations
```typescript
// Example 1: Agent doing well
calculateAgentPace(
  dailyTargetPoints: 100,
  achievedPoints: 85,
  elapsedMinutes: 300,    // 5 hours into shift
  effectiveTotalMinutes: 465
)
// Expected: 100 × (300/465) = 64.5 pts
// Pace: (85/64.5) × 100 = 131.8% → AHEAD (GREEN)
// { expectedPoints: 64.5, productivityPacePct: 131.8, paceStatus: "ahead" }

// Example 2: Agent on track
calculateAgentPace(
  dailyTargetPoints: 100,
  achievedPoints: 45,
  elapsedMinutes: 180,    // 3 hours into shift
  effectiveTotalMinutes: 465
)
// Expected: 100 × (180/465) = 38.7 pts
// Pace: (45/38.7) × 100 = 116.3% → AHEAD (GREEN)
// { expectedPoints: 38.7, productivityPacePct: 116.3, paceStatus: "ahead" }

// Example 3: Agent behind pace
calculateAgentPace(
  dailyTargetPoints: 100,
  achievedPoints: 10,
  elapsedMinutes: 240,    // 4 hours into shift
  effectiveTotalMinutes: 465
)
// Expected: 100 × (240/465) = 51.6 pts
// Pace: (10/51.6) × 100 = 19.4% → SLOW (RED)
// { expectedPoints: 51.6, productivityPacePct: 19.4, paceStatus: "slow" }

// Example 4: Shift not started
calculateAgentPace(
  dailyTargetPoints: 100,
  achievedPoints: 0,
  elapsedMinutes: 0,      // No time elapsed
  effectiveTotalMinutes: 465
)
// { expectedPoints: 0, productivityPacePct: null, paceStatus: "pre_shift" }
```

---

## 5. API Response Structure

### Endpoint: GET /api/analytics/slide2

```json
{
  "success": true,
  "data": {
    "total_agents": 50,
    "page": 1,
    "limit": 10,
    "total_pages": 5,
    "agents": [
      {
        "agent_id": 101,
        "agent_name": "John Doe",
        "role": "SDR",
        "daily_target_points": 100,
        "working_days": 22,
        "monthly_target_points": 2200,
        "generated_leads": 25,
        "qualified_leads": 18,
        "disqualified_leads": 7,
        "pending_qa": 2,
        "achieved_points": 85,
        "remaining_points": 15,
        "completion_percentage": 85,
        "is_target_met": false,
        "attendance_status": "Present",
        "is_present": true,
        
        // NEW FIELDS:
        "elapsed_work_minutes": 300,
        "expected_points_at_snapshot": 64.5,
        "productivity_pace_pct": 131.8,  // 85/64.5 * 100
        "pace_status": "ahead"
      },
      {
        "agent_id": 102,
        "agent_name": "Jane Smith",
        "role": "SDR",
        "daily_target_points": 100,
        "working_days": 22,
        "monthly_target_points": 2200,
        "generated_leads": 12,
        "qualified_leads": 8,
        "disqualified_leads": 4,
        "pending_qa": 1,
        "achieved_points": 30,
        "remaining_points": 70,
        "completion_percentage": 30,
        "is_target_met": false,
        "attendance_status": "Present",
        "is_present": true,
        
        // NEW FIELDS:
        "elapsed_work_minutes": 300,
        "expected_points_at_snapshot": 64.5,
        "productivity_pace_pct": 46.5,   // 30/64.5 * 100
        "pace_status": "slow"
      }
    ],
    "campaign_target_points": {
      "total_target_points": 500,
      "total_campaigns": 5,
      "campaigns": [...]
    },
    "floor_capacity": {
      "total_capacity_points": 4800,
      "total_agents": 50,
      "present_agents_count": 48,
      "absent_agents_count": 2,
      "capacity_gap": 4300,
      "capacity_gap_label": "4300-point capacity surplus",
      "capacity_gap_status": "surplus"
    },
    "query_date": "2026-10-28"
  }
}
```

---

## 6. Configuration Points

### Shift Configuration (data/shift-config.json)
```json
{
  "shiftName": "US Business Shift",
  "shiftCode": "US_SHIFT",
  "timezone": "Asia/Kolkata",
  "startTime": "17:30:00",
  "endTime": "02:30:00",
  "crossesMidnight": true,
  "durationMinutes": 540,              // Total shift (9 hours)
  "reportingTimezone": "America/New_York",
  "businessDateRule": "SHIFT_START_DATE",
  "gracePeriodMinutes": 0,
  "workingDays": [1, 2, 3, 4, 5],
  "isActive": true,
  "version": 2,
  "lastUpdated": "2026-10-22T16:13:52.876Z"
  
  // Note: effectiveTotalMinutes (465) is configured in db schema,
  // not in shift-config.json
}
```

### Color Thresholds (in component)
```typescript
// In getTimeBasedPaceStatus() function, line ~60:
if (pacePct <= 30) {          // ← Customize this number
  paceStatus = "slow";        // RED threshold
} else if (pacePct <= 80) {   // ← Customize this number
  paceStatus = "steady";      // YELLOW threshold
} else {
  paceStatus = "ahead";       // GREEN threshold
}
```

---

## 7. Testing Code Snippets

### Test 1: Verify API Returns Pace Fields
```bash
curl -X GET "http://localhost:3000/api/analytics/slide2?limit=1" \
  -H "Content-Type: application/json" | jq '.data.agents[0] | {
    agent_id,
    agent_name,
    productivity_pace_pct,
    pace_status,
    elapsed_work_minutes,
    expected_points_at_snapshot
  }'

# Expected output:
# {
#   "agent_id": 101,
#   "agent_name": "John Doe",
#   "productivity_pace_pct": 75.5,
#   "pace_status": "ahead",
#   "elapsed_work_minutes": 300,
#   "expected_points_at_snapshot": 64.5
# }
```

### Test 2: Verify Database Has Data
```sql
SELECT 
  agent_name_snapshot,
  daily_target_points,
  achieved_points,
  elapsed_work_minutes,
  expected_points_at_snapshot,
  productivity_pace_pct,
  pace_status,
  ROUND((productivity_pace_pct / 100), 2) as pace_multiplier
FROM agent_daily_snapshots
WHERE work_date = CURDATE()
  AND productivity_pace_pct IS NOT NULL
ORDER BY productivity_pace_pct DESC
LIMIT 10;
```

### Test 3: Component Rendering Check
```typescript
// In browser console:
const agents = document.querySelectorAll('tbody tr');
agents.forEach((row, idx) => {
  const paceBars = row.querySelectorAll('[class*="shadow"]');
  if (paceBars.length > 0) {
    console.log(`Agent ${idx}: Has time-based pace bar ✓`);
  }
});
```

---

## 8. Debug Queries

### Find All Agents with Pace Data
```sql
SELECT 
  agent_name_snapshot,
  daily_target_points,
  achieved_points,
  productivity_pace_pct,
  pace_status
FROM agent_daily_snapshots
WHERE work_date = CURDATE()
  AND productivity_pace_pct IS NOT NULL
  AND elapsed_work_minutes > 0
ORDER BY productivity_pace_pct ASC;
```

### Find Agents with RED Status (Slow)
```sql
SELECT 
  agent_name_snapshot,
  daily_target_points,
  achieved_points,
  elapsed_work_minutes,
  expected_points_at_snapshot,
  productivity_pace_pct,
  pace_status
FROM agent_daily_snapshots
WHERE work_date = CURDATE()
  AND pace_status = 'slow'  -- RED
ORDER BY productivity_pace_pct ASC;
```

### Verify Pace Calculation
```sql
SELECT 
  agent_name_snapshot,
  daily_target_points,
  achieved_points,
  elapsed_work_minutes,
  expected_points_at_snapshot,
  ROUND((achieved_points / expected_points_at_snapshot * 100), 1) as calculated_pace,
  productivity_pace_pct as stored_pace,
  CASE 
    WHEN ROUND((achieved_points / expected_points_at_snapshot * 100), 1) <= 30 
      THEN 'RED (SLOW)'
    WHEN ROUND((achieved_points / expected_points_at_snapshot * 100), 1) <= 80 
      THEN 'YELLOW (STEADY)'
    ELSE 'GREEN (AHEAD)'
  END as expected_color
FROM agent_daily_snapshots
WHERE work_date = CURDATE()
  AND expected_points_at_snapshot > 0
ORDER BY calculated_pace ASC;
```

---

## 9. Common Mistakes & Fixes

### Mistake 1: Forgetting to update types
```typescript
// WRONG: Using undefined field
const pace = agent.productivity_pace_pct;  // TypeScript error if not in interface

// RIGHT: Updated interface includes field
export interface AgentSlide2 {
  // ...
  productivity_pace_pct?: number | null;  // ✓
}
```

### Mistake 2: Incorrect threshold comparison
```typescript
// WRONG: Overlapping ranges
if (pace <= 30) slow
else if (pace <= 80) steady  // includes 30-80
else ahead               // includes 80+
// Result: pace=80 is STEADY, not AHEAD

// RIGHT: Clear boundaries
if (pace <= 30) slow     // 0-30
else if (pace <= 80) steady   // 31-80
else ahead               // 81-100
```

### Mistake 3: Division by zero
```typescript
// WRONG:
const pace = (achieved / expected) * 100;  // Error if expected=0

// RIGHT:
if (expected <= 0) {
  return null;  // or "pre_shift"
}
const pace = (achieved / expected) * 100;
```

### Mistake 4: Not handling null values
```typescript
// WRONG:
const color = pacePct <= 30 ? 'red' : 'blue';  // Error if pacePct is null

// RIGHT:
const color = pacePct === null 
  ? 'gray' 
  : pacePct <= 30 
  ? 'red' 
  : 'blue';
```

---

## 10. Performance Optimization

### Query Optimization
```sql
-- SLOW: Not indexed
SELECT * FROM agent_daily_snapshots 
WHERE productivity_pace_pct IS NOT NULL;

-- FAST: Uses index
SELECT * FROM agent_daily_snapshots 
WHERE work_date = CURDATE()  -- ← Indexed column
  AND productivity_pace_pct IS NOT NULL;  -- ← Filtered early
```

### Component Optimization
```typescript
// SLOW: Recalculates on every render
const color = getTimeBasedPaceStatus(agent.productivity_pace_pct);

// FAST: Memoize if used multiple times
const memoizedColor = useMemo(
  () => getTimeBasedPaceStatus(agent.productivity_pace_pct),
  [agent.productivity_pace_pct]
);
```

---

*Last Updated: 2026-10-28*
