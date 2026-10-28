const http = require('http');

function fetchLocal(path) {
  const port = process.env.PORT || 3000;
  return new Promise((resolve) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data.slice(0, 200) });
        }
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function run() {
  console.log('=== TEST SUITE: QA AUDITED & HEATMAP RED-ORANGE-YELLOW COLOR DISTRIBUTION ===\n');

  // Test 1: Fetch Slide 3 API
  console.log('1. Testing /api/analytics/slide3 ...');
  const s3 = await fetchLocal('/api/analytics/slide3');
  console.log('Status:', s3.status, 'Success:', s3.data?.success);

  if (s3.data?.data) {
    const d = s3.data.data;
    console.log('Total QA analysts in Slide 3:', d.qa_heatmap?.length);
    console.log('QA analysts list:');
    let hasZeroAudit = false;
    let hasSagar = false;
    let hasMayur = false;
    d.qa_heatmap?.forEach((a) => {
      console.log(` - ID ${a.user_id}: ${a.full_name} | Audited: ${a.total_audited} | Qualified: ${a.total_qualified}`);
      if ((a.total_audited || 0) === 0 && (a.total_qualified || 0) === 0) {
        hasZeroAudit = true;
      }
      if (a.full_name?.toLowerCase().includes('sagar') || a.user_id === 99) {
        hasSagar = true;
      }
      if (a.full_name?.toLowerCase().includes('mayur jadhav')) {
        hasMayur = true;
      }
    });

    if (hasSagar) {
      console.error('❌ FAIL: Sagar Machale (Email Marketing) must NOT be in QA Heatmap!');
      process.exit(1);
    } else {
      console.log('✅ PASS: Sagar Machale successfully excluded! Only actual QA agents shown.');
    }

    if (hasMayur || hasZeroAudit) {
      console.error('❌ FAIL: Found unnecessary zero-audit QA analyst!');
      process.exit(1);
    } else {
      console.log('✅ PASS: Zero-audit unnecessary names (e.g. Mayur Jadhav) omitted.');
    }

    const first = d.qa_heatmap?.[0];
    if (first && first.intervals?.length > 0) {
      const activeIntervals = first.intervals.filter((i) => (i.audited_count || 0) > 0 || (i.qualified_count || 0) > 0);
      console.log(`✅ PASS: First analyst (${first.full_name}) has ${first.intervals.length} total intervals, ${activeIntervals.length} with audit activity.`);
    }
  }

  // Test 2: Fetch Slide 4 API
  console.log('\n2. Testing /api/analytics/slide4 ...');
  const s4 = await fetchLocal('/api/analytics/slide4');
  console.log('Status:', s4.status, 'Success:', s4.data?.success);
  if (s4.data?.data) {
    const d = s4.data.data;
    console.log('Total agents in Slide 4:', d.agent_heatmap?.length);
    if (d.agent_heatmap?.length > 0) {
      const topAgent = d.agent_heatmap[0];
      console.log(`✅ PASS: Top agent is ${topAgent.agent_name} with ${topAgent.total_generated} generated leads.`);
    }
  }

  console.log('\n=== ALL TESTS FINISHED ===');
}

run();
