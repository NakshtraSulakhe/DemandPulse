import { getCrmConfig } from "@/lib/crm-config";

export interface CrmEmployee {
  id: number;
  name: string;
  role: string;
  normalized_role: "manager" | "team_leader" | "qa_manager" | "qa_analyst" | "agent";
  department: string;
  source: string;
}

// In-memory cache for fast lookups
let cachedRoster: CrmEmployee[] | null = null;
let lastRosterFetch = 0;
const ROSTER_CACHE_TTL = 30000; // 30 seconds

// Static fallback map for critical CRM leadership & QA IDs
export const CRM_KNOWN_ROSTER: Record<number, { name: string; role: string; dept: string }> = {
  150: { name: "Prathamesh Kamble", role: "operations_manager", dept: "Operations" },
  162: { name: "Maroof Shaikh", role: "operations_manager", dept: "Operations" },
  178: { name: "Shalmon Waghmare", role: "qa_manager", dept: "Quality Assurance" },
  132: { name: "Shreejit Raju", role: "qa_manager", dept: "Quality Assurance" },
  134: { name: "Pratibha Ghode", role: "quality_analyst", dept: "Quality Assurance" },
  103: { name: "Sanket Tanpure", role: "quality_analyst", dept: "Quality Assurance" },
  151: { name: "Om Patil", role: "email_marketing_manager", dept: "Marketing" },
  99: { name: "Sagar Machale", role: "email_marketing_manager", dept: "Marketing" },
};

/**
 * Fetches real employees from live CRM endpoints (slides_analytics.php, form_submissions, and preview.php)
 */
export async function getRealCrmRoster(): Promise<CrmEmployee[]> {
  const now = Date.now();
  if (cachedRoster && now - lastRosterFetch < ROSTER_CACHE_TTL) {
    return cachedRoster;
  }

  const config = await getCrmConfig();
  const baseUrl = config.crmApiBaseUrl.replace(/\/+$/, "");
  const token = config.crmApiToken || "df_admin_secret_token_2026";

  const employeeMap = new Map<number, CrmEmployee>();

  // Initialize with known roster as baseline
  Object.entries(CRM_KNOWN_ROSTER).forEach(([idStr, info]) => {
    const id = Number(idStr);
    let normRole: CrmEmployee["normalized_role"] = "agent";
    if (info.role.includes("operations_manager")) normRole = "manager";
    else if (info.role.includes("team_leader")) normRole = "team_leader";
    else if (info.role.includes("qa_manager")) normRole = "qa_manager";
    else if (info.role.includes("quality") || info.role.includes("qa")) normRole = "qa_analyst";

    employeeMap.set(id, {
      id,
      name: info.name,
      role: info.role,
      normalized_role: normRole,
      department: info.dept,
      source: "crm_roster_baseline",
    });
  });

  try {
    // 1. Fetch live slides_analytics which includes form_submissions.by_submitter
    const saRes = await fetch(`${baseUrl}/slides_analytics.php?token=${token}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (saRes.ok) {
      const saJson = await saRes.json();

      // Submitters (contains real names & real roles like operations_manager, qa_manager, etc.)
      if (saJson?.form_submissions?.by_submitter) {
        for (const sub of saJson.form_submissions.by_submitter) {
          const id = Number(sub.user_id);
          const name = (sub.name || "").trim();
          const rawRole = (sub.role || "").trim().toLowerCase();

          if (id && name) {
            let normRole: CrmEmployee["normalized_role"] = "agent";
            let dept = "Operations";

            if (rawRole.includes("operations_manager")) {
              normRole = "manager";
              dept = "Operations Leadership";
            } else if (rawRole.includes("team_lead") || rawRole.includes("team_leader")) {
              normRole = "team_leader";
              dept = "Operations Leadership";
            } else if (rawRole.includes("qa_manager")) {
              normRole = "qa_manager";
              dept = "Quality Assurance";
            } else if (rawRole.includes("qa") || rawRole.includes("quality")) {
              normRole = "qa_analyst";
              dept = "Quality Assurance";
            }

            employeeMap.set(id, {
              id,
              name,
              role: sub.role || "operations_agent",
              normalized_role: normRole,
              department: dept,
              source: "form_submissions",
            });
          }
        }
      }

      // 2. Augment from slide2 agents
      if (saJson?.slide2?.agents) {
        for (const ag of saJson.slide2.agents) {
          const id = Number(ag.agent_id || ag.id);
          const name = (ag.agent_name || ag.name || "").trim();
          if (id && name && !employeeMap.has(id)) {
            employeeMap.set(id, {
              id,
              name,
              role: ag.role || "operations_agent",
              normalized_role: "agent",
              department: "Operations Floor",
              source: "slide2_agents",
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed fetching live CRM roster from slides_analytics.php:", err);
  }

  try {
    // 3. Augment with incentives preview to capture all floor agents
    const prevRes = await fetch(`${baseUrl}/incentives/preview.php?token=${token}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (prevRes.ok) {
      const prevJson = await prevRes.json();
      if (prevJson?.data?.agents) {
        for (const ag of prevJson.data.agents) {
          const id = Number(ag.agent_id);
          const name = (ag.agent_name || "").trim();
          if (id && name && !employeeMap.has(id)) {
            employeeMap.set(id, {
              id,
              name,
              role: ag.role || "operations_agent",
              normalized_role: "agent",
              department: "Operations Floor",
              source: "incentives_preview",
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed fetching incentives preview in roster:", err);
  }

  const result = Array.from(employeeMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  cachedRoster = result;
  lastRosterFetch = now;
  return result;
}

/**
 * Resolves a real human name for a given user ID
 */
export async function resolveRealUserName(userId: number, fallback?: string): Promise<string> {
  if (CRM_KNOWN_ROSTER[userId]) {
    return CRM_KNOWN_ROSTER[userId].name;
  }
  const roster = await getRealCrmRoster();
  const found = roster.find((e) => e.id === userId);
  return found?.name || fallback || `User #${userId}`;
}

