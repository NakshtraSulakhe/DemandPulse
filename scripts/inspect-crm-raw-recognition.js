const https = require('https');

const token = 'df_admin_secret_token_2026';
const baseUrl = 'https://app.tarajglobal.com/demandflowbridge/api/v1';

function fetchUrl(path) {
  return new Promise((resolve) => {
    const url = `${baseUrl}/${path}${path.includes('?') ? '&' : '?'}token=${token}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ path, status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ path, status: res.statusCode, raw: data.slice(0, 300) });
        }
      });
    }).on('error', (err) => resolve({ path, error: err.message }));
  });
}

async function run() {
  console.log('--- 1. incentives/preview.php ---');
  const preview = await fetchUrl('incentives/preview.php?date=2026-10-26');
  console.log('Status:', preview.status, 'Success:', preview.data?.success);
  if (preview.data?.data) {
    const d = preview.data.data;
    console.log('Preview keys:', Object.keys(d));
    if (d.agents && Array.isArray(d.agents)) {
      console.log('Total agents in preview:', d.agents.length);
      console.log('First 3 agents in preview:');
      d.agents.slice(0, 3).forEach((a) => console.log(JSON.stringify(a)));
      const eligible = d.agents.filter((a) => a.eligibility_status === 'eligible' || a.completion_pct >= 100);
      console.log('Total eligible / >=100% in preview:', eligible.length);
      eligible.forEach((a) => console.log('ELIGIBLE:', JSON.stringify(a)));
    }
  }

  console.log('\n--- 2. incentives/daily.php ---');
  const daily = await fetchUrl('incentives/daily.php?date=2026-10-26');
  console.log('Status:', daily.status, 'Success:', daily.data?.success);
  if (daily.data?.data) {
    console.log('Daily keys:', Object.keys(daily.data.data));
    if (Array.isArray(daily.data.data.records)) {
      console.log('Settled records count:', daily.data.data.records.length);
      daily.data.data.records.slice(0, 3).forEach((r) => console.log('RECORD:', JSON.stringify(r)));
    }
  }

  console.log('\n--- 3. slides/recognition.php ---');
  const recog = await fetchUrl('slides/recognition.php?date=2026-10-26');
  console.log('Status:', recog.status, 'Keys:', recog.data ? Object.keys(recog.data) : recog.raw);
  if (recog.data?.sliders) {
    console.log('recog.data.sliders keys:', Object.keys(recog.data.sliders));
    console.log('top_scorers:', recog.data.sliders.top_scorers);
    console.log('ticker_items:', recog.data.sliders.ticker_items);
  }

  console.log('\n--- 4. slides/slide1.php sliders ---');
  const s1 = await fetchUrl('slides/slide1.php?date=2026-10-26');
  if (s1.data?.data?.sliders) {
    console.log('s1 sliders keys:', Object.keys(s1.data.data.sliders));
    console.log('s1 top_scorers length:', s1.data.data.sliders.top_scorers?.length);
    console.log('s1 ticker_items length:', s1.data.data.sliders.ticker_items?.length);
    if (s1.data.data.sliders.ticker_items?.length) {
      s1.data.data.sliders.ticker_items.forEach((item, i) => {
        console.log(`s1 ticker [${i}]:`, JSON.stringify(item));
      });
    }
  }
}

run();
