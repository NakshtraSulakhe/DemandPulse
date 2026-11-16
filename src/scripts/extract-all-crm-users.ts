import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function extractAllUsers() {
  const baseUrl = "https://app.tarajglobal.com/demandflowbridge/api/v1";
  const token = process.env.CRM_API_TOKEN || "df_admin_secret_token_2026";

  const res = await fetch(`${baseUrl}/slides_analytics.php?token=${token}`);
  const json = await res.json();

  const allPersons = new Map<string, { id: any; name: string; role?: string; source: string }>();

  // 1. From form_submissions.by_submitter
  if (json.form_submissions?.by_submitter) {
    for (const sub of json.form_submissions.by_submitter) {
      if (sub.name) {
        allPersons.set(sub.name.trim().toLowerCase(), {
          id: sub.user_id,
          name: sub.name.trim(),
          role: sub.role,
          source: "form_submissions",
        });
      }
    }
  }

  // 2. From recognition
  if (json.recognition) {
    const recStr = JSON.stringify(json.recognition);
    // Find all names / roles
    console.log("Recognition keys:", Object.keys(json.recognition));
    if (json.recognition.top_scorers) {
      json.recognition.top_scorers.forEach((s: any) => {
        if (s.name) allPersons.set(s.name.trim().toLowerCase(), { id: s.id, name: s.name.trim(), role: s.role, source: "recognition_top_scorers" });
      });
    }
    if (json.recognition.birthdays) {
      json.recognition.birthdays.forEach((b: any) => {
        if (b.name) allPersons.set(b.name.trim().toLowerCase(), { id: b.id, name: b.name.trim(), role: b.designation || b.role, source: "recognition_birthdays" });
      });
    }
    if (json.recognition.work_anniversaries) {
      json.recognition.work_anniversaries.forEach((a: any) => {
        if (a.name) allPersons.set(a.name.trim().toLowerCase(), { id: a.id, name: a.name.trim(), role: a.designation || a.role, source: "recognition_anniversaries" });
      });
    }
  }

  // 3. From qa_audits
  if (json.qa_audits?.qa_analysts) {
    for (const qa of json.qa_audits.qa_analysts) {
      if (qa.qa_name || qa.name) {
        const name = (qa.qa_name || qa.name).trim();
        allPersons.set(name.toLowerCase(), {
          id: qa.user_id || qa.id,
          name,
          role: qa.role || "qa_analyst",
          source: "qa_audits",
        });
      }
    }
  }

  // 4. From slide1
  if (json.slide1) {
    console.log("Slide 1 keys:", Object.keys(json.slide1));
    const s1Str = JSON.stringify(json.slide1);
    // Print any person-like fields
  }

  // 5. From slide2
  if (json.slide2?.agents) {
    for (const ag of json.slide2.agents) {
      const name = (ag.agent_name || ag.name).trim();
      allPersons.set(name.toLowerCase(), {
        id: ag.agent_id || ag.id,
        name,
        role: ag.role || "operations_agent",
        source: "slide2_agents",
      });
    }
  }

  // 6. From slide3
  if (json.slide3?.qa_users) {
    for (const q of json.slide3.qa_users) {
      const name = (q.name || q.qa_name || `QA #${q.id}`).trim();
      allPersons.set(name.toLowerCase(), {
        id: q.id,
        name,
        role: "qa_user",
        source: "slide3_qa",
      });
    }
  }

  // 7. From slide4
  if (json.slide4) {
    console.log("Slide 4 keys:", Object.keys(json.slide4));
    if (json.slide4.agents) {
      json.slide4.agents.forEach((ag: any) => {
        const name = (ag.name || ag.agent_name).trim();
        allPersons.set(name.toLowerCase(), {
          id: ag.id || ag.agent_id,
          name,
          role: ag.role || "operations_agent",
          source: "slide4_agents",
        });
      });
    }
  }

  console.log(`\n=== TOTAL UNIQUE PERSONS DISCOVERED: ${allPersons.size} ===`);
  const list = Array.from(allPersons.values());
  console.log(
    list.map((p) => `${p.name} (ID: ${p.id}) [Role: ${p.role || "N/A"}] (Source: ${p.source})`)
  );
}

extractAllUsers().catch(console.error);

