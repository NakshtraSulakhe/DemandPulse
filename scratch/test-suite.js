const http = require("http");

function fetchJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== 1. TESTING INCENTIVES CONFIG API WITH SIMULATION ===");
  const configRes = await fetchJson(
    "http://localhost:3000/api/incentives/config?achieved=14&target=10&status=Present&escalation=0&role=Senior%20SDR"
  );
  console.log("Status:", configRes.status);
  console.log("Success:", configRes.body.success);
  console.log("Version:", configRes.body.data?.version);
  console.log("Simulation Result:", configRes.body.simulation);

  console.log("\n=== 2. TESTING SLIDE 3 (QA HEATMAP) SHIFT WINDOW ===");
  const s3Res = await fetchJson("http://localhost:3000/api/analytics/slide3");
  console.log("Status:", s3Res.status);
  console.log("Success:", s3Res.body.success);
  console.log("Shift Start:", s3Res.body.data?.shift_start);
  console.log("Shift End:", s3Res.body.data?.shift_end);
  console.log("Total Intervals:", s3Res.body.data?.total_intervals);

  console.log("\n=== 3. TESTING SLIDE 4 (AGENT HEATMAP) SHIFT WINDOW ===");
  const s4Res = await fetchJson("http://localhost:3000/api/analytics/slide4");
  console.log("Status:", s4Res.status);
  console.log("Success:", s4Res.body.success);
  console.log("Shift Start:", s4Res.body.data?.shift_start);
  console.log("Shift End:", s4Res.body.data?.shift_end);

  console.log("\n=== 4. TESTING SHIFT CLOSURE GUARD ON SETTLE API ===");
  // Attempt finalization without override on active shift
  const settleGuardRes = await fetchJson(
    "http://localhost:3000/api/incentives/settle",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer df_admin_secret_token_2026",
      },
    },
    {
      work_date: "2026-10-22",
      mode: "finalize",
    }
  );
  console.log("Guard Test Status (Expected 409 when shift is active):", settleGuardRes.status);
  console.log("Guard Error Code:", settleGuardRes.body.error_code);
  console.log("Guard Error Message:", settleGuardRes.body.error);
  console.log("Guard Requires Override:", settleGuardRes.body.requires_override);

  console.log("\n=== 5. TESTING DRY RUN SETTLEMENT ===");
  const dryRunRes = await fetchJson(
    "http://localhost:3000/api/incentives/settle",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer df_admin_secret_token_2026",
      },
    },
    {
      work_date: "2026-10-22",
      mode: "dry_run",
    }
  );
  console.log("Dry Run Status:", dryRunRes.status);
  console.log("Dry Run Success:", dryRunRes.body.success);
  console.log("Dry Run Mode:", dryRunRes.body.data?.mode);
  console.log("Total Processed:", dryRunRes.body.data?.total_agents_processed);

  console.log("\n=== 6. TESTING SHIFT CURRENT API ===");
  const shiftRes = await fetchJson("http://localhost:3000/api/shifts/current");
  console.log("Shift Active:", shiftRes.body.data?.isShiftActive);
  console.log("Business Date:", shiftRes.body.data?.businessDate);
  console.log("IST Time:", shiftRes.body.data?.currentIstFormatted);
  console.log("US Time:", shiftRes.body.data?.currentUsFormatted);
  console.log("US Timezone Abbr:", shiftRes.body.data?.usTimezoneAbbr);
}

runTests().catch(console.error);
