import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function inspectMore() {
  const baseUrl = "https://app.tarajglobal.com/demandflowbridge/api/v1";
  const token = process.env.CRM_API_TOKEN || "df_admin_secret_token_2026";

  // Recognition
  try {
    const res = await fetch(`${baseUrl}/slides/recognition.php?token=${token}`);
    const json = await res.json();
    console.log("=== RECOGNITION.PHP ===");
    console.log(JSON.stringify(json, null, 2).slice(0, 1500));
  } catch (e: any) {
    console.log("recognition error:", e.message);
  }

  // slides_analytics.php
  try {
    const res = await fetch(`${baseUrl}/slides_analytics.php?token=${token}`);
    const json = await res.json();
    console.log("=== SLIDES_ANALYTICS.PHP ===");
    console.log("Keys:", Object.keys(json));
    if (json.team || json.teams || json.leaders || json.managers || json.users) {
      console.log("Leaders/Teams found in slides_analytics:", {
        team: json.team,
        teams: json.teams,
        leaders: json.leaders,
        managers: json.managers,
        users: json.users,
      });
    }
  } catch (e: any) {
    console.log("slides_analytics error:", e.message);
  }

  // Also check if there is an endpoint like 'qa-incentives/plans.php' or 'incentives/policies.php' or 'employees/all'
  const otherEps = [
    "qa-incentives/plans.php",
    "qa-incentives/calculate.php",
    "incentives/history.php",
    "incentives/agents.php",
    "incentives/users.php",
    "agents.php",
  ];
  for (const ep of otherEps) {
    try {
      const res = await fetch(`${baseUrl}/${ep}?token=${token}`);
      console.log(`Checking ${ep}: Status ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`  Preview of ${ep}:`, text.slice(0, 200));
      }
    } catch (e: any) {
      console.log(`  Failed ${ep}:`, e.message);
    }
  }
}

inspectMore().catch(console.error);

