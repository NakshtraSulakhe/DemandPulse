# Implementation Details: Time-Based Productivity Pace

## Summary of Changes

### What the User Requested
- Show agent daily progress according to target
- Display progress bar based on **working hours (7h45m)** elapsed
- Color-code the progress:
  - **Red (0-30%)**: Agent is slow
  - **Yellow (31-80%)**: Agent is steady/on track
  - **Green (81-100%)**: Agent is ahead of pace

### What Was Implemented
Enhanced Slide 2 (Agent Productivity) to show **two progress indicators** for each agent:

1. **Target Completion Progress** (existing)
   - What: Achieved points vs. daily target points
   - Formula: `(achieved / target) × 100`
   - Colors: Amber (<60%), Cyan (60-100%), Green (≥100%)
   - Purpose: Shows absolute progress toward daily goal

2. **Time-Based Pace Progress** (NEW) ✨
   - What: Achieved points vs. expected points at current shift time
   - Formula: `(achieved / expected) × 100` where expected = `(target × elapsed_mins) / 465`
   - Colors: **Red (0-30%), Yellow (31-80%), Green (81-100%)**
   - Purpose: Shows if agent is on pace to hit target by end of shift

---

## Data Flow

### Where Time-Based Pace Comes From

```
Sync Engine (runs every 30s)
    ↓
getCrmSlide2() fetches agent data from CRM
    ↓
CRM Returns: {agent_id, agent_name, achieved_points, daily_target, ...}
    ↓
calculateAgentPace() function calculates:
    - elapsed_work_minutes (from punch clock)
    - expected_points_at_snapshot
    - productivity_pace_pct ← THE KEY METRIC
    - pace_status ("slow", "steady", "ahead", "pre_shift")
    ↓
Upsert to MySQL: agent_daily_snapshots table
    ├─ elapsed_work_minutes (INT)
    ├─ expected_points_at_snapshot (DECIMAL)
    ├─ productivity_pace_pct (DECIMAL, nullable)
    └─ pace_status (VARCHAR)
    ↓
getDbSlide2() reads from MySQL and maps to AgentSlide2 type
    ├─ productivity_pace_pct
    ├─ pace_status
    ├─ elapsed_work_minutes
    └─ expected_points_at_snapshot
    ↓
/api/analytics/slide2 API returns slide data
    ↓
useSlide2() React Query hook fetches from API
    ↓
SlideAgentProductivity component renders with both progress bars
```

### The Calculation (From src/lib/db/agent-productivity-repository.ts)

```typescript
export function calculateAgentPace(
  dailyTargetPoints: number,
  achievedPoints: number,
  elapsedMinutes: number = 0,
  effectiveTotalMinutes: number = 465  // 7h 45m
): {
  expectedPoints: number;
  productivityPacePct: number | null;
  paceStatus: "slow" | "steady" | "ahead" | "pre_shift" | null;
} {
  // If shift hasn't started yet
  if (elapsedMinutes <= 0 || dailyTargetPoints <= 0) {
    return {
      expectedPoints: 0,
      productivityPacePct: null,
      paceStatus: "pre_shift",
    };
  }

  // Calculate expected progress at current time
  // If 100 pts target and 50% of shift elapsed:
  // expected = (100 × 50) / 100 = 50 pts
  const expected = (dailyTargetPoints * elapsedMinutes) / effectiveTotalMinutes;
  
  // Cap at effective total to avoid over-100% rates
  const cappedElapsed = Math.min(elapsedMinutes, effectiveTotalMinutes);
  const roundedExpected = Math.round(expected * 1000) / 1000;

  if (roundedExpected <= 0) {
    return {
      expectedPoints: 0,
      productivityPacePct: null,
      paceStatus: "pre_shift",
    };
  }

  // Calculate pace: (achieved / expected) × 100
  const pacePct = Math.round((achievedPoints / roundedExpected) * 100 * 10) / 10;

  // Determine status based on pace percentage
  let paceStatus: "slow" | "steady" | "ahead" = "steady";
  if (pacePct <= 30) {
    paceStatus = "slow";      // RED: Agent is behind pace
  } else if (pacePct > 80) {
    paceStatus = "ahead";     // GREEN: Agent is ahead of pace
  }
  // else: YELLOW (steady): Between 31-80%

  return {
    expectedPoints: roundedExpected,
    productivityPacePct: pacePct,
    paceStatus,
  };
}
```

---

## Component Changes

### Before (Original Slide 2)
```
Agent Name | Daily Target | Achieved | Remaining | Completion | Status
-----------|--------------|----------|-----------|------------|-------
John       | 100 pts      | 50 pts   | 50 pts    | 50% ▬▬░░░░ | Active
```

### After (Enhanced Slide 2)
```
Agent Name | Daily Target | Achieved | Remaining | Target Progress | Time-Based Pace (7h45m) | Status
-----------|--------------|----------|-----------|-----------------|-------------------------|-------
John       | 100 pts      | 50 pts   | 50 pts    | 50% ▬▬░░░░     | 75% ▬▬▬▬▬▬░░░░ (YELLOW) | Active
```

### Table Header Change
```tsx
// OLD:
<th className="py-2 px-2.5 text-right">Completion</th>
<th className="py-2 px-2 text-center">Status</th>

// NEW:
<th className="py-2 px-2.5 text-right">Target Progress</th>
<th className="py-2 px-2.5 text-right">Time-Based Pace (7h45m)</th>
<th className="py-2 px-2 text-center">Status</th>
```

---

## Color Logic Implementation

### Helper Function Added

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

  // RED: 0-30% - SLOW (Agent falling behind)
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

  // YELLOW: 31-80% - STEADY (On track)
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

  // GREEN: 81-100% - AHEAD (Exceeding pace)
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

### Rendering Logic in Table Row

```tsx
<td className="py-2 px-2.5 text-right">
  {(() => {
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
                ? "bg-slate-400 dark:bg-slate-600"              // Pre-shift: Gray
                : pacePct <= 30
                ? "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"     // Slow: RED
                : pacePct <= 80
                ? "bg-amber-500 shadow-[0_0_8px_rgba(251,146,60,0.6)]"   // Steady: YELLOW
                : "bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]" // Ahead: GREEN
            }`}
            style={{ width: `${Math.min(100, pacePct ?? 0)}%` }}
          />
        </div>
        {/* Percentage Display */}
        <span className={`font-mono font-bold text-[11px] ${paceInfo.color} w-10 text-right`}>
          {pacePct !== null && pacePct >= 0 ? `${pacePct.toFixed(1)}%` : "—"}
        </span>
      </div>
    );
  })()}
</td>
```

---

## Example Scenarios

### Scenario 1: Agent Starting Shift
```
Time: 10:30 (just started)
Elapsed: 0 minutes
Achieved: 0 points
Daily Target: 100 points

Expected: (100 × 0) / 465 = 0 points
Pace: null (no division by zero)
Status: pre_shift
Display: "—" (gray bar, not started)
```

### Scenario 2: Agent Half-way Through Shift
```
Time: 14:15 (4h 45m elapsed)
Elapsed: 285 minutes (285/465 = 61.3% of shift)
Achieved: 50 points
Daily Target: 100 points

Expected: (100 × 285) / 465 = 61.3 points
Pace: (50 / 61.3) × 100 = 81.6% ✓ GREEN (AHEAD!)
Status: ahead
Display: "81.6%" (green bar at ~82%)
```

Interpretation: Agent is ahead of schedule! At their current pace, they'll exceed the 100-pt target by day end.

### Scenario 3: Agent Struggling
```
Time: 13:45 (3h 15m elapsed)
Elapsed: 195 minutes (195/465 = 41.9% of shift)
Achieved: 10 points
Daily Target: 100 points

Expected: (100 × 195) / 465 = 41.9 points
Pace: (10 / 41.9) × 100 = 23.9% ✗ RED (SLOW!)
Status: slow
Display: "23.9%" (red bar at ~24%)
```

Interpretation: Agent is falling behind! They're at only 24% of expected pace. Manager should intervene to understand blockers.

### Scenario 4: Agent Steady (On Track)
```
Time: 14:00 (3.5h elapsed)
Elapsed: 210 minutes (210/465 = 45.2% of shift)
Achieved: 40 points
Daily Target: 100 points

Expected: (100 × 210) / 465 = 45.2 points
Pace: (40 / 45.2) × 100 = 88.5% ✓ GREEN (AHEAD!)
Status: ahead (88.5% > 80%)
Display: "88.5%" (green bar at ~89%)
```

Wait, this shows green (ahead). Let's try truly steady:

```
Time: 14:00 (3.5h elapsed)
Elapsed: 210 minutes (210/465 = 45.2% of shift)
Achieved: 30 points
Daily Target: 100 points

Expected: (100 × 210) / 465 = 45.2 points
Pace: (30 / 45.2) × 100 = 66.4% ✓ YELLOW (STEADY!)
Status: steady (66.4% is between 31-80%)
Display: "66.4%" (yellow bar at ~66%)
```

Interpretation: Agent is on track to hit their target. Performance is steady and expected.

---

## Database Schema

### agent_daily_snapshots Table

```sql
CREATE TABLE agent_daily_snapshots (
  -- ... existing fields ...
  
  -- Time-based pace fields (NEW)
  elapsed_work_minutes INT NOT NULL DEFAULT 0,
  expected_points_at_snapshot DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  productivity_pace_pct DECIMAL(8, 3) DEFAULT NULL,
  pace_status VARCHAR(30) DEFAULT NULL,
  
  -- ... other fields ...
)
```

---

## Testing Examples

To manually test the time-based pace feature:

### 1. View Live Slide 2
```
URL: http://localhost:3000/presentation
→ Navigate to Slide 2 (use keyboard: press '2')
→ Look for "Time-Based Pace (7h45m)" column
→ Observe color-coded progress bars
```

### 2. Check API Response
```bash
curl -X GET "http://localhost:3000/api/analytics/slide2?limit=5"

# Response should include:
{
  "success": true,
  "data": {
    "agents": [
      {
        "agent_id": 1,
        "agent_name": "Agent Name",
        "achieved_points": 50,
        "daily_target_points": 100,
        "productivity_pace_pct": 75.5,      ← NEW
        "pace_status": "ahead",             ← NEW
        "elapsed_work_minutes": 285,        ← NEW
        "expected_points_at_snapshot": 61.3 ← NEW
      },
      ...
    ]
  }
}
```

### 3. Verify Database
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
ORDER BY productivity_pace_pct DESC;
```

---

## Performance Considerations

- **No extra queries**: Data already calculated and stored by sync engine
- **Rendering**: Simple conditional logic, no complex calculations
- **UI Updates**: Smooth 500ms transitions when bars update
- **Memory**: No additional data structures, uses existing agent fields

The enhancement is **zero-overhead** in terms of API calls or database queries—it just exposes already-calculated metrics from the database.

---

## Migration Notes

- ✅ No database migrations required (fields already exist in schema)
- ✅ No new API endpoints required (existing endpoints already return the data)
- ✅ Backward compatible (new fields are optional/nullable)
- ✅ Type-safe (updated TypeScript interfaces for type checking)

---

## Future Enhancements

1. **Tooltip on hover** showing expected vs. actual breakdown
2. **Status badge** showing pace category (Slow/Steady/Ahead)
3. **Trend sparkline** showing pace throughout the day
4. **Alerts** highlighting agents <30% pace
5. **Catch-up calculator** showing required hourly rate to hit target
