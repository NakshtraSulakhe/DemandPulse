import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function inspectCRM() {
  const baseUrl = "https://app.tarajglobal.com/demandflowbridge/api/v1";
  const token = process.env.CRM_API_TOKEN || "df_admin_secret_token_2026";

  // 1. Check QA Audits Analysts
  const qaRes = await fetch(`${baseUrl}/qa_audits.php?token=${token}`);
  const qaJson = await qaRes.json();
  console.log("=== QA AUDITS API ===");
  console.log("total_qa_analysts:", qaJson?.data?.total_qa_analysts);
  console.log("qa_analysts:", qaJson?.data?.qa_analysts);
  console.log("qa_users:", qaJson?.data?.qa_users);
  console.log("plans:", qaJson?.data?.plans);

  // 2. Check Slide 1
  const s1Res = await fetch(`${baseUrl}/slides/slide1.php?token=${token}`);
  const s1Json = await s1Res.json();
  console.log("\n=== SLIDE 1 ===");
  if (s1Json?.slide1) {
    console.log("slide1 keys:", Object.keys(s1Json.slide1));
    console.log("late_comers sample:", s1Json.slide1.late_comers?.slice(0, 5));
    console.log("on_break sample:", s1Json.slide1.on_break?.slice(0, 5));
    console.log("absent sample:", s1Json.slide1.absent?.slice(0, 5));
  }

  // 3. Check Slide 2
  const s2Res = await fetch(`${baseUrl}/slides/slide2.php?token=${token}`);
  const s2Json = await s2Res.json();
  console.log("\n=== SLIDE 2 ===");
  if (s2Json?.slide2?.agents) {
    console.log("Slide 2 agents count:", s2Json.slide2.agents.length);
    console.log("Sample agents (first 10):", s2Json.slide2.agents.slice(0, 10).map((a: any) => ({
      id: a.agent_id || a.id,
      name: a.agent_name || a.name,
      role: a.role,
      designation: a.designation,
      title: a.title,
      team: a.team || a.team_name,
      manager: a.manager || a.manager_name,
      team_leader: a.team_leader || a.tl_name,
    })));
  }

  // 4. Check Preview API
  const prevRes = await fetch(`${baseUrl}/incentives/preview.php?token=${token}`);
  const prevJson = await prevRes.json();
  console.log("\n=== INCENTIVES PREVIEW ===");
  if (prevJson?.data?.agents) {
    console.log("Preview agents count:", prevJson.data.agents.length);
    console.log("Sample roles/designations:", prevJson.data.agents.slice(0, 10).map((a: any) => ({
      id: a.agent_id,
      name: a.agent_name,
      role: a.role,
    })));
    // Find any agent with role other than 'Agent' or check all unique roles
    const roles = new Set(prevJson.data.agents.map((a: any) => a.role));
    console.log("Unique roles in preview.php:", Array.from(roles));
  }
}

inspectCRM().catch(console.error);

