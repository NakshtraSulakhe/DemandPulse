/**
 * Evaluation engine for late agent punch-ins against configured CRM shift timings.
 */

export interface EvaluatedLateAgent {
  user_id: number;
  full_name: string;
  role: string;
  punch_in: string;
  shift_start_time: string;
  grace_minutes: number;
  late_minutes: number;
  status: string;
}

export interface AgentPunchInput {
  user_id?: number | string;
  crm_agent_id?: number | string;
  full_name?: string | null;
  agent_name?: string | null;
  agent_name_snapshot?: string | null;
  role?: string | null;
  punch_in?: string | null;
  punch_in_at?: Date | string | null;
  punch_in_time?: string | null;
  shift_start_time?: string | null;
  grace_minutes?: number | null;
  late_minutes?: number | null;
  status?: string | null;
  attendance_status?: string | null;
}

/**
 * Evaluates whether an agent's punch-in is late relative to their configured shift start time.
 * If late, returns an EvaluatedLateAgent object with normalized punch and shift times.
 * If on-time or early, returns null.
 */
export function evaluateAgentLatePunch(
  agent: AgentPunchInput,
  defaultShiftStart: string = "17:30:00",
  defaultGraceMinutes: number = 1
): EvaluatedLateAgent | null {
  const userId = Number(agent.user_id ?? agent.crm_agent_id ?? 0);
  if (!userId) return null;

  const fullName =
    agent.full_name || agent.agent_name || agent.agent_name_snapshot || `Agent #${userId}`;
  const role = agent.role || "operations_agent";
  const status = agent.status || agent.attendance_status || "Late";

  // 1. Resolve shift start time from agent's CRM configuration, falling back to calendar default
  let shiftStart = (agent.shift_start_time || "").trim();
  if (!shiftStart || shiftStart === "00:00:00" || shiftStart === "00:00") {
    shiftStart = defaultShiftStart || "17:30:00";
  }

  const shiftMatch = shiftStart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  let shiftHours = 17;
  let shiftMinutes = 30;
  if (shiftMatch) {
    shiftHours = parseInt(shiftMatch[1], 10);
    shiftMinutes = parseInt(shiftMatch[2], 10);
  }
  const shiftStartFormatted = `${String(shiftHours).padStart(2, "0")}:${String(shiftMinutes).padStart(2, "0")}:00`;
  const shiftStartMinutesOfDay = shiftHours * 60 + shiftMinutes;

  // 2. Resolve grace window
  const graceMinutes =
    typeof agent.grace_minutes === "number" && !isNaN(agent.grace_minutes) && agent.grace_minutes >= 0
      ? agent.grace_minutes
      : defaultGraceMinutes;

  // 3. Resolve punch-in time
  let rawPunch = agent.punch_in || agent.punch_in_time || (agent.punch_in_at ? String(agent.punch_in_at) : "");
  rawPunch = rawPunch.trim();

  if (!rawPunch) {
    // If agent is explicitly flagged with positive late minutes in records
    const existingLate = Number(agent.late_minutes) || 0;
    if (existingLate > 0 || status.toLowerCase().includes("late")) {
      return {
        user_id: userId,
        full_name: fullName,
        role,
        punch_in: "Logged Late",
        shift_start_time: shiftStartFormatted,
        grace_minutes: graceMinutes,
        late_minutes: Math.max(1, existingLate),
        status,
      };
    }
    return null;
  }

  // Parse punch-in time
  let punchHours: number;
  let punchMinutes: number;
  let punchSeconds = 0;

  // Check if ISO string format
  if (rawPunch.includes("T") && (rawPunch.endsWith("Z") || rawPunch.includes("+"))) {
    const d = new Date(rawPunch);
    if (!isNaN(d.getTime())) {
      // Convert UTC timestamp to IST (+05:30)
      const istDate = new Date(d.getTime() + 5.5 * 3600 * 1000);
      punchHours = istDate.getUTCHours();
      punchMinutes = istDate.getUTCMinutes();
      punchSeconds = istDate.getUTCSeconds();
    } else {
      const match = rawPunch.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      punchHours = match ? parseInt(match[1], 10) : 0;
      punchMinutes = match ? parseInt(match[2], 10) : 0;
      punchSeconds = match && match[3] ? parseInt(match[3], 10) : 0;
    }
  } else {
    // Standard format e.g. "2026-11-04 18:25:34" or "18:25:34"
    const match = rawPunch.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) {
      const existingLate = Number(agent.late_minutes) || 0;
      if (existingLate > 0) {
        return {
          user_id: userId,
          full_name: fullName,
          role,
          punch_in: rawPunch,
          shift_start_time: shiftStartFormatted,
          grace_minutes: graceMinutes,
          late_minutes: existingLate,
          status,
        };
      }
      return null;
    }
    punchHours = parseInt(match[1], 10);
    punchMinutes = parseInt(match[2], 10);
    punchSeconds = match[3] ? parseInt(match[3], 10) : 0;
  }

  const punchInFormatted = `${String(punchHours).padStart(2, "0")}:${String(punchMinutes).padStart(2, "0")}:${String(punchSeconds).padStart(2, "0")}`;

  // 4. Calculate minute offset
  let punchMinutesOfDay = punchHours * 60 + punchMinutes;

  // Handle post-midnight punch for evening shifts crossing midnight
  if (shiftHours >= 12 && punchHours < 12) {
    punchMinutesOfDay += 24 * 60;
  }

  const diffMinutes = punchMinutesOfDay - shiftStartMinutesOfDay;

  // 5. Evaluate if punch-in exceeds shift start time + grace window
  if (diffMinutes > graceMinutes) {
    const existingLate = Number(agent.late_minutes) || 0;
    const calculatedLate = diffMinutes;
    const finalLate = existingLate > 0 ? existingLate : calculatedLate;

    return {
      user_id: userId,
      full_name: fullName,
      role,
      punch_in: punchInFormatted,
      shift_start_time: shiftStartFormatted,
      grace_minutes: graceMinutes,
      late_minutes: Math.max(1, finalLate),
      status,
    };
  }

  // Not late: punched in before shift start or within grace window
  return null;
}

