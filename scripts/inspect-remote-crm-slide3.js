const https = require('https');

const token = 'df_admin_secret_token_2026';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': token,
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  const urls = [
    'https://app.tarajglobal.com/demandflowbridge/api/v1/slides/slide3.php?date=2026-10-27&interval=10',
    'https://app.tarajglobal.com/demandflowbridge/api/v1/slides_analytics.php?type=slide3&date=2026-10-27&interval=10',
    'https://app.tarajglobal.com/demandflowbridge/api/v1/slides/slide3.php?interval=10',
  ];

  for (const u of urls) {
    console.log(`\n--- Fetching: ${u} ---`);
    try {
      const res = await fetchUrl(u);
      console.log('Status:', res.status);
      if (res.data && res.data.slide3) {
        console.log('total_qa_analysts:', res.data.slide3.total_qa_analysts);
        const analysts = res.data.slide3.qa_analysts || res.data.slide3.qa_heatmap || [];
        console.log(`Found ${analysts.length} analysts:`);
        analysts.forEach(a => {
          console.log(`- ID: ${a.user_id}, Name: ${a.full_name}, Audited: ${a.total_audited}, Qualified: ${a.total_qualified}`);
        });
      } else {
        console.log('Raw text:', res.raw?.slice(0, 300));
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

main();
