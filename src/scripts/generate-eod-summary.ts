import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getShiftBusinessDate, getCurrentShiftState } from "../lib/shift/engine";
import { getCrmSlide1, getCrmSlide2 } from "../lib/crm-api";

async function generateEod() {
  const shiftDate = getShiftBusinessDate();
  const shiftState = getCurrentShiftState();

  console.log("=== Shift Info ===");
  console.log("Shift Business Date:", shiftDate);
  console.log("Shift State:", JSON.stringify(shiftState, null, 2));

  console.log("\n=== Slide 1 Data ===");
  const s1 = await getCrmSlide1(shiftDate);
  if (s1.success && s1.data) {
    console.log("KPIs:", JSON.stringify(s1.data.kpi_cards, null, 2));
    console.log(`Campaigns (${s1.data.campaigns.length}):`);
    for (const c of s1.data.campaigns) {
      console.log(
        `- ${c.campaign_name} | Daily Target: ${c.daily_target} | Qualified: ${c.qualified_leads} | Generated: ${c.generated_leads} | Disqual: ${c.disqualified_leads} | Pending QA: ${c.pending_qa} | Progress: ${c.completion_percentage}%`
      );
    }
    console.log(`\nLate Comers (${s1.data.late_comers.length}):`);
    for (const l of s1.data.late_comers) {
      console.log(`- ${l.full_name} | Punch: ${l.punch_in} | Late: +${l.late_minutes}m`);
    }
  } else {
    console.log("Failed to fetch Slide 1:", s1.error);
  }

  console.log("\n=== Slide 2 Data ===");
  const s2 = await getCrmSlide2(shiftDate, 1, 100);
  if (s2.success && s2.data) {
    console.log("Slide 2 Summary:", JSON.stringify(s2.data.summary, null, 2));
    console.log(`Agents Count: ${s2.data.agents?.length || 0}`);
    const sorted = [...(s2.data.agents || [])].sort(
      (a: any, b: any) => (Number(b.daily_points_achieved) || 0) - (Number(a.daily_points_achieved) || 0)
    );
    console.log("\nTop 15 Agents by Points Achieved:");
    for (const ag of sorted.slice(0, 15)) {
      console.log(
        `- ${ag.agent_name} | Target Points: ${ag.daily_target_points} | Achieved Points: ${ag.daily_points_achieved} | Qualified Leads: ${ag.qualified_leads || 0} | Completion: ${ag.completion_percentage || 0}%`
      );
    }
  } else {
    console.log("Failed to fetch Slide 2:", s2.error);
  }
}

generateEod().catch(console.error);
