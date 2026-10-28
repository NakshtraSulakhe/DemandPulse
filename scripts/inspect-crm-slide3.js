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
  console.log('--- Inspecting slide3.php ---');
  const slide3 = await fetchUrl('slides/slide3.php?date=2026-10-26&interval=10&shift_start=12:00:00&shift_end=21:00:00');
  console.log('Status:', slide3.status);
  if (slide3.data) {
    console.log('Keys in data:', Object.keys(slide3.data));
    if (slide3.data.slide3) {
      console.log('Keys in slide3.slide3:', Object.keys(slide3.data.slide3));
      const s3 = slide3.data.slide3;
      console.log('qa_heatmap length:', s3.qa_heatmap?.length);
      if (s3.qa_heatmap?.length > 0) {
        console.log('Analysts list:');
        s3.qa_heatmap.forEach((a) => {
          const { intervals, ...rest } = a;
          console.log(JSON.stringify(rest));
        });
      }
    }
  } else {
    console.log('Raw:', slide3.raw || slide3.error);
  }

  console.log('\n--- Inspecting other potential QA endpoints ---');
  const qaEndpoints = [
    'qa.php?date=2026-10-26',
    'slides_analytics.php?type=slide3&date=2026-10-26',
    'qa/audited.php?date=2026-10-26',
    'qa_audited.php?date=2026-10-26',
    'audits.php?date=2026-10-26'
  ];
  for (const ep of qaEndpoints) {
    const res = await fetchUrl(ep);
    console.log(ep, '-> status:', res.status, res.data ? Object.keys(res.data) : (res.raw ? res.raw.slice(0, 80) : res.error));
  }
}

run();
