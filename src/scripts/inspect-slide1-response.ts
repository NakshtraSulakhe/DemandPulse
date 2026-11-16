import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function inspectSlide1() {
  const baseUrl = "https://app.tarajglobal.com/demandflowbridge/api/v1";
  const token = process.env.CRM_API_TOKEN || "df_admin_secret_token_2026";

  const url = `${baseUrl}/slides/slide1.php?token=${token}`;
  console.log("Fetching:", url);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const json = await res.json();

  console.log("Top-level keys:", Object.keys(json));
  if (json.slide1) {
    console.log("slide1 keys:", Object.keys(json.slide1));
  }

  const attendance = json.slide1?.agent_attendance || json.agent_attendance || json.slide1?.present_agents || [];
  console.log(`Total attendance records: ${attendance.length}`);
  if (attendance.length > 0) {
    console.log("Sample record 0:", JSON.stringify(attendance[0], null, 2));
    console.log("Sample record with punch in:", JSON.stringify(attendance.find((a: any) => a.has_punched_in || a.punch_in), null, 2));
  }
}

inspectSlide1().catch(console.error);
