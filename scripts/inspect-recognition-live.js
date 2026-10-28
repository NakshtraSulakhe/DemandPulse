const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error(`HTTP Status: ${res.statusCode}`);
          console.error(`Raw output (first 300 chars):`, data.slice(0, 300));
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const dates = ['2026-10-26', '2026-10-27'];
  for (const d of dates) {
    console.log(`\n--- Fetching /api/recognition?date=${d} ---`);
    const res = await fetchJson(`http://localhost:3001/api/recognition?date=${d}`);
    console.log('Success:', res.success);
    console.log('Total items:', res.data?.total_items);
    console.log('Top scorers count:', res.data?.top_scorers_count);
    console.log('Birthdays count:', res.data?.birthdays_count);
    console.log('Anniversaries count:', res.data?.anniversaries_count);
    console.log('Ticker items summary:', (res.data?.ticker_items || []).map(i => ({
      id: i.id,
      type: i.type,
      title: i.title,
      badge: i.badge
    })));
  }
}

main().catch(console.error);
