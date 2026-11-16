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
  agent_id?: number | string;
  crm_agent_id?: number | string;
  full_name?: string | null;
  agent_name?: string | null;
  name?: string | null;
  agent_name_snapshot?: string | null;
  role?: string | null;
  has_punched_in?: boolean | number | null;
  is_present?: boolean | number | null;
  punch_in?: string | null;
  punch_in_at?: Date | string | null;
  punch_in_time?: string | null;
  punch_in_timestamp?: number | null;
  punch_out?: string | null;
  punch_out_time?: string | null;
  shift_start_time?: string | null;
  grace_minutes?: number | null;
  late_minutes?: number | null;
  status?: string | null;
  attendance_status?: string | null;
}

/**
 * Robust timezone conversion from business timezone (e.g. America/New_York)
 * to display timezone (Asia/Kolkata / IST).
 */
export function convertBusinessTimeToDisplayTime(
  rawTime: string | Date | null | undefined,
  businessTz: string = "America/New_York",
  displayTz: string = "Asia/Kolkata"
): { hours: number; minutes: number; seconds: number; formattedTime: string; isConverted: boolean } {
  if (!rawTime) {
    return { hours: 0, minutes: 0, seconds: 0, formattedTime: "", isConverted: false };
  }

  const str = typeof rawTime === "string" ? rawTime.trim() : rawTime.toISOString();

  // If already full ISO or contains timezone offset (e.g. 2026-11-16T12:48:15.000Z or +05:30)
  if (str.includes("T") && (str.endsWith("Z") || str.includes("+") || (str.includes("-") && str.lastIndexOf("-") > 10))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: displayTz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(d);
      const m: Record<string, string> = {};
      for (const p of parts) m[p.type] = p.value;
      const h = parseInt(m.hour, 10);
      const min = parseInt(m.minute, 10);
      const s = parseInt(m.second, 10);
      return {
        hours: h,
        minutes: min,
        seconds: s,
        formattedTime: `${m.hour}:${m.minute}:${m.second}`,
        isConverted: true,
      };
    }
  }

  // Format "YYYY-MM-DD HH:mm:ss"
  const dateMatch = str.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (dateMatch) {
    const [, y, mon, day, h, min, s] = dateMatch;
    const rawH = parseInt(h, 10);
    const rawMin = parseInt(min, 10);
    const rawS = s ? parseInt(s, 10) : 0;

    // If already in IST evening shift range (>= 15), keep as is
    if (rawH >= 15) {
      return {
        hours: rawH,
        minutes: rawMin,
        seconds: rawS,
        formattedTime: `${String(rawH).padStart(2, "0")}:${String(rawMin).padStart(2, "0")}:${String(rawS).padStart(2, "0")}`,
        isConverted: false,
      };
    }

    // Convert from businessTz (e.g. America/New_York) to displayTz (e.g. Asia/Kolkata)
    try {
      const testUtc = new Date(Date.UTC(parseInt(y, 10), parseInt(mon, 10) - 1, parseInt(day, 10), rawH, rawMin, rawS));
      const nyParts = new Intl.DateTimeFormat("en-US", {
        timeZone: businessTz,
        timeZoneName: "shortOffset",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).formatToParts(testUtc);

      const tzName = nyParts.find((p) => p.type === "timeZoneName")?.value || "-05:00";
      let offsetStr = "-05:00";
      const gmtMatch = tzName.match(/GMT([+-]\d+)(?::(\d+))?/);
      if (gmtMatch) {
        const sign = gmtMatch[1].startsWith("-") ? "-" : "+";
        const hoursPart = Math.abs(parseInt(gmtMatch[1], 10)).toString().padStart(2, "0");
        const minsPart = (gmtMatch[2] || "00").padStart(2, "0");
        offsetStr = `${sign}${hoursPart}:${minsPart}`;
      }

      const nyIso = `${y}-${mon}-${day}T${String(rawH).padStart(2, "0")}:${String(rawMin).padStart(2, "0")}:${String(rawS).padStart(2, "0")}${offsetStr}`;
      const d = new Date(nyIso);

      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: displayTz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(d);
      const m: Record<string, string> = {};
      for (const p of parts) m[p.type] = p.value;
      const istH = parseInt(m.hour, 10);
      const istMin = parseInt(m.minute, 10);
      const istS = parseInt(m.second, 10);
      return {
        hours: istH,
        minutes: istMin,
        seconds: istS,
        formattedTime: `${m.hour}:${m.minute}:${m.second}`,
        isConverted: true,
      };
    } catch {
      let istH = rawH + 10;
      let istMin = rawMin + 30;
      if (istMin >= 60) {
        istH += 1;
        istMin -= 60;
      }
      if (istH >= 24) istH -= 24;
      return {
        hours: istH,
        minutes: istMin,
        seconds: rawS,
        formattedTime: `${String(istH).padStart(2, "0")}:${String(istMin).padStart(2, "0")}:${String(rawS).padStart(2, "0")}`,
        isConverted: true,
      };
    }
  }

  // Format "HH:mm:ss" or "HH:mm"
  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    let min = parseInt(timeMatch[2], 10);
    let s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

    // If between 04:00 and 12:00, it's businessTz (EST)
    if (h >= 4 && h <= 12) {
      min += 30;
      if (min >= 60) {
        h += 1;
        min -= 60;
      }
      h += 10;
      if (h >= 24) h -= 24;
      return {
        hours: h,
        minutes: min,
        seconds: s,
        formattedTime: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
        isConverted: true,
      };
    }

    return {
      hours: h,
      minutes: min,
      seconds: s,
      formattedTime: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      isConverted: false,
    };
  }

  return { hours: 0, minutes: 0, seconds: 0, formattedTime: "", isConverted: false };
}

/**
 * Evaluates whether an agent's punch-in is late relative to their configured shift start time.
 * If late, returns an EvaluatedLateAgent object with normalized punch and shift times.
 * If on-time or early, returns null.
 */
export function evaluateAgentLatePunch(
  agent: AgentPunchInput,
  defaultShiftStart: string = "18:30:00",
  defaultGraceMinutes: number = 0
): EvaluatedLateAgent | null {
  const userId = Number(agent.user_id ?? agent.agent_id ?? agent.crm_agent_id ?? 0);
  if (!userId) return null;

  const rawName =
    agent.full_name || agent.agent_name || agent.name || agent.agent_name_snapshot;
  const fullName = rawName && rawName.trim().length > 0 ? rawName.trim() : `Agent #${userId}`;
  const role = agent.role || "operations_agent";
  const status = agent.status || agent.attendance_status || "Late";

  // Check if agent is absent without any punch record
  if (
    (agent.has_punched_in === false || agent.is_present === false || String(status).toLowerCase() === "absent") &&
    !agent.punch_in &&
    !agent.punch_in_time &&
    !agent.punch_in_at
  ) {
    return null;
  }

  // 1. Resolve shift start time according to current project shift timing (e.g. 18:30:00)
  const shiftStart = (defaultShiftStart || agent.shift_start_time || "18:30:00").trim();
  const shiftMatch = shiftStart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  let shiftHours = 18;
  let shiftMinutes = 30;
  if (shiftMatch) {
    shiftHours = parseInt(shiftMatch[1], 10);
    shiftMinutes = parseInt(shiftMatch[2], 10);
  }
  const shiftStartFormatted = `${String(shiftHours).padStart(2, "0")}:${String(shiftMinutes).padStart(2, "0")}:00`;
  const shiftStartMinutesOfDay = shiftHours * 60 + shiftMinutes;

  // 2. Strict Zero Grace: zero grace period enforced
  const graceMinutes = 0;

  // 3. Resolve punch-in time
  let rawPunch = agent.punch_in || agent.punch_in_time || (agent.punch_in_at ? String(agent.punch_in_at) : "");
  rawPunch = rawPunch.trim();

  if (!rawPunch) {
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

  const converted = convertBusinessTimeToDisplayTime(rawPunch);
  if (!converted.formattedTime) return null;

  const punchHours = converted.hours;
  const punchMinutes = converted.minutes;
  const punchSeconds = converted.seconds;
  const punchInFormatted = converted.formattedTime;

  // 4. Calculate minute offset
  let punchMinutesOfDay = punchHours * 60 + punchMinutes;
  if (shiftHours >= 12 && punchHours < 12) {
    punchMinutesOfDay += 24 * 60;
  }

  const totalPunchSeconds = punchMinutesOfDay * 60 + punchSeconds;
  const totalShiftSeconds = shiftStartMinutesOfDay * 60;
  const diffSeconds = totalPunchSeconds - totalShiftSeconds;

  // 5. Evaluate if punch-in exceeds shift start time (Zero Grace)
  const existingLate = Number(agent.late_minutes) || 0;
  if (diffSeconds > 0 || existingLate > 0 || status.toLowerCase().includes("late")) {
    const calculatedLate = diffSeconds > 0 ? Math.max(1, Math.floor(diffSeconds / 60)) : 0;
    const finalLate = existingLate > 0 ? existingLate : calculatedLate;

    return {
      user_id: userId,
      full_name: fullName,
      role,
      punch_in: punchInFormatted,
      shift_start_time: shiftStartFormatted,
      grace_minutes: graceMinutes,
      late_minutes: Math.max(1, finalLate),
      status: "Late",
    };
  }

  // Not late: punched in before shift start
  return null;
}
