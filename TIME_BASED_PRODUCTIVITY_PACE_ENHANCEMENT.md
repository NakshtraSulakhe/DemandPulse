# Time-Based Productivity Pace Enhancement (Slide 2)

## Overview
Enhanced the Agent Productivity slide (Slide 2) to display both **target completion progress** and **time-based productivity pace** with color-coded indicators based on working hours (7 hours 45 minutes = 465 minutes).

## What Changed

### 1. **New Table Column: Time-Based Pace**
Added a new column to the agent table that shows how well each agent is tracking against their expected progress based on **elapsed working time**.

**Column Header**: "Time-Based Pace (7h45m)"

### 2. **Color-Coded Progress Indicators**
The time-based pace progress bar uses three colors to indicate agent performance:

| Progress % | Color | Meaning | Alert Level |
|-----------|-------|---------|------------|
| 0-30% | **Red** 🔴 | Agent is **slow** - falling behind pace | High Alert |
| 31-80% | **Yellow** 🟡 | Agent is **steady** - on track but not ahead | Caution |
| 81-100% | **Green** 🟢 | Agent is **ahead** - exceeding expected pace | Good |
| N/A | Gray | Agent hasn't started shift yet | Neutral |

### 3. **Side-by-Side Progress Bars**
The table now displays two progress indicators for each agent:

**Column 1: Target Progress**
- Shows completion percentage against daily target points
- Original colors: Amber (<60%), Cyan (60-100%), Emerald (≥100%)
- Formula: `(achieved_points / daily_target_points) × 100%`

**Column 2: Time-Based Pace (NEW)**
- Shows productivity pace based on hours elapsed
- New colors: Red (<30%), Yellow (31-80%), Green (81-100%), Gray (pre-shift)
- Formula: `(achieved_points / expected_points_at_elapsed_time) × 100%`
- Where: `expected_points = (daily_target × elapsed_minutes) / 465`

### 4. **Example Scenario**
```
Agent: John Doe
Daily Target: 100 points
Current Time: 14:00 (7 hours into shift, assuming 10:30 start + 7h45m shift)

Expected Points at 7 hours: (100 × 420) / 465 = 90 points
Achieved Points: 45 points

Time-Based Pace: (45 / 90) × 100 = 50% ✓ YELLOW (Steady)
Target Completion: (45 / 100) × 100 = 45% (On track for 45% target completion)
```

**Interpretation**: John is on pace to hit his target by day end but is currently running at 50% of expected pace. Not slow, but not ahead either.

---

## Technical Implementation

### Files Modified

#### 1. `src/types/index.ts`
Added new fields to `AgentSlide2` interface:
```typescript
// Time-based productivity pace
elapsed_work_minutes?: number;
expected_points_at_snapshot?: number;
productivity_pace_pct?: number | null;
pace_status?: "slow" | "steady" | "ahead" | "pre_shift" | null;
```

#### 2. `src/lib/slides/db-slide-reader.ts`
Updated `getDbSlide2()` function to include pace fields in the agent mapping:
```typescript
// Time-based productivity pace fields
elapsed_work_minutes: a.elapsed_work_minutes || 0,
expected_points_at_snapshot: a.expected_points_at_snapshot || 0,
productivity_pace_pct: a.productivity_pace_pct !== null ? a.productivity_pace_pct : null,
pace_status: a.pace_status,
```

#### 3. `src/components/presentation/slide-agent-productivity.tsx`
- Added `getTimeBasedPaceStatus()` helper function to determine color and status
- Added new table header column: "Time-Based Pace (7h45m)"
- Added new table data column with inline progress bar and percentage
- Renamed existing "Completion" column header to "Target Progress" for clarity

### Helper Function: `getTimeBasedPaceStatus()`
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
}
```

Returns styling and status based on pace percentage:
- Red styling for 0-30% (slow)
- Yellow styling for 31-80% (steady)
- Green styling for 81-100% (ahead)
- Gray styling for null/undefined (pre-shift)

---

## Data Source

The time-based pace metrics are already calculated and stored in the database by the sync engine:

- **Table**: `agent_daily_snapshots`
- **Source**: `src/lib/db/agent-productivity-repository.ts` → `calculateAgentPace()`
- **Calculation**: 
  - Expected points = `(daily_target_points × elapsed_work_minutes) / 465`
  - Pace % = `(achieved_points / expected_points) × 100`
  - Status determined by percentage bands (0-30%, 31-80%, 81-100%)

The enhancement just exposes these existing fields to the presentation layer.

---

## Benefits

1. **Real-time Awareness**: Agents can see how well they're tracking against time expectations, not just end-of-day targets
2. **Proactive Intervention**: Managers see who's falling behind pace (red) vs. on track (yellow/green)
3. **Motivation**: Visual progress bar with glow effects provides psychological feedback
4. **Dual Perspective**: Both target completion AND time-based pace help agents understand their performance holistically

---

## Shift Configuration

The working hours baseline remains:
- **Shift Duration**: 17:30 - 02:30 IST (crosses midnight)
- **Effective Work Minutes**: 465 (7 hours 45 minutes)
- **Timezone**: Asia/Kolkata (IST)
- **Business Date Rule**: SHIFT_START_DATE

This means expected progress is calculated as:
```
Expected = Daily Target × (Elapsed Minutes / 465)
```

At each point during the shift, agents should have achieved proportionally to time elapsed to stay on pace.

---

## Testing & Verification

To verify the enhancement is working:

1. **Live Data**:
   - Navigate to the presentation (`/presentation`)
   - Switch to Slide 2 (Agent Productivity)
   - Look for the new "Time-Based Pace (7h45m)" column
   - Observe the color-coded progress bars (Red/Yellow/Green/Gray)

2. **Benchmark Example**:
   - In Slide 2, click "Benchmark Example (50 / 15 pts)" button
   - View pre-calculated example data with realistic pace percentages

3. **API Verification**:
   - GET `/api/analytics/slide2?date=TODAY&limit=100`
   - Verify response includes `elapsed_work_minutes`, `expected_points_at_snapshot`, `productivity_pace_pct`, `pace_status`

---

## Future Enhancements

- [ ] Add tooltips showing expected vs. actual points on hover
- [ ] Add keyboard shortcut to toggle between target completion vs. pace view
- [ ] Add trend line showing pace throughout the day
- [ ] Add automated alerts when pace drops below 30% for extended periods
- [ ] Add "catch-up needed" calculations showing required hourly rate to meet target
