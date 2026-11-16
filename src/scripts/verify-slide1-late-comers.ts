import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getCrmSlide1 } from "../lib/crm-api";
import { getShiftConfig } from "../lib/shift/config";

async function verify() {
  const shiftCfg = await getShiftConfig();
  console.log("Current Project Shift Config:");
  console.log(`- Start Time: ${shiftCfg.startTime}`);
  console.log(`- Grace Minutes: ${shiftCfg.gracePeriodMinutes}`);
  console.log(`- Timezone: ${shiftCfg.timezone}`);

  console.log("\nCalling getCrmSlide1()...");
  const result = await getCrmSlide1();

  if (!result.success || !result.data) {
    console.error("Failed to fetch Slide 1 data:", result);
    return;
  }

  const s1 = result.data;
  console.log("\nSlide 1 Fetched Successfully!");
  console.log("KPI Cards:");
  console.log(`- Total Agents: ${s1.kpi_cards.total_agents}`);
  console.log(`- Present Today: ${s1.kpi_cards.present_today}`);
  console.log(`- Absent Today: ${s1.kpi_cards.absent_today}`);
  console.log(`- Late Today: ${s1.kpi_cards.late_today}`);

  console.log(`\nLate Comers List (${s1.late_comers.length} agents):`);
  s1.late_comers.forEach((agent, i) => {
    console.log(
      `${i + 1}. ${agent.full_name} (ID: ${agent.user_id}) | Punch In (IST): ${agent.punch_in} | Shift: ${agent.shift_start_time} | Late: +${agent.late_minutes}m`
    );
  });
}

verify().catch(console.error);

