const { runAnalyticsSync } = require("../src/lib/sync/sync-engine");

async function main() {
  console.log("Triggering live analytics synchronization with CRM API...");
  try {
    const result = await runAnalyticsSync(undefined, { force: true, jobName: "initial_verification_sync" });
    console.log("Sync Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Sync error:", err);
  }
}

main();
