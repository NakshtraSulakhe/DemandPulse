import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getLeadershipMembers, getAllAssignableAgents } from "../lib/db/leadership-incentive-repository";
import { getRealCrmRoster } from "../lib/crm-roster";

async function verifyState() {
  console.log("=== 1. Leadership Members in Database ===");
  const members = await getLeadershipMembers({ includeInactive: true });
  console.log(`Found ${members.length} members:`);
  members.forEach((m) => {
    console.log(` - ID: ${m.id} | Name: ${m.member_name} | Role: ${m.member_role.toUpperCase()} | CRM ID: ${m.crm_user_id} | Assigned Agents: ${m.assigned_agents?.length || 0}`);
  });

  console.log("\n=== 2. Assignable Agents Count ===");
  const agents = await getAllAssignableAgents();
  console.log(`Total assignable operations agents: ${agents.length}`);
  const assigned = agents.filter((a) => a.currently_assigned_to);
  console.log(`Currently assigned to any leader: ${assigned.length}`);

  console.log("\n=== 3. Real CRM Roster Sample ===");
  const roster = await getRealCrmRoster();
  console.log(`Total CRM roster members discovered: ${roster.length}`);
  const leadership = roster.filter((r) => r.normalized_role === "manager" || r.normalized_role === "team_leader" || r.normalized_role === "qa_manager");
  console.log("Discovered CRM Leaders & QA Managers:");
  leadership.forEach((l) => {
    console.log(` * ${l.name} (CRM ID: ${l.id}) - Role: ${l.role} (${l.department})`);
  });

  process.exit(0);
}

verifyState().catch(console.error);

