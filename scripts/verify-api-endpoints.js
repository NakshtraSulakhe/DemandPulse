const http = require('http');

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            path,
            status: res.statusCode,
            success: json.success !== false,
            source: json.source || res.headers['x-data-source'],
            dataPreview: json.data ? Object.keys(json.data) : (Array.isArray(json) ? `Array(${json.length})` : Object.keys(json)),
          });
        } catch (e) {
          resolve({ path, status: res.statusCode, error: 'Non-JSON response: ' + data.slice(0, 100) });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ path, status: 0, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing Slides API (Database & Live) on port 3001...\n');
  
  const endpoints = [
    // Live / DB slide endpoints
    '/api/analytics/slide1?date=2026-10-26',
    '/api/analytics/slide2?date=2026-10-26',
    '/api/analytics/slide3?date=2026-10-26',
    '/api/analytics/slide4?date=2026-10-26',
    '/api/analytics/slide5?date=2026-10-26',
    
    // Historical admin analytics endpoints
    '/api/admin/analytics/history?start_date=2026-10-20&end_date=2026-10-26',
    '/api/admin/analytics/campaigns?date=2026-10-26',
    '/api/admin/analytics/agents?date=2026-10-26',
    '/api/admin/analytics/qa?date=2026-10-26',
    '/api/admin/analytics/floor-capacity?start_date=2026-10-20&end_date=2026-10-26',
    '/api/admin/analytics/incentives?date=2026-10-26',
    '/api/admin/analytics/sync-status',
  ];

  for (const ep of endpoints) {
    const res = await testEndpoint(ep);
    console.log(`[${res.status}] ${res.path}`);
    if (res.error) {
      console.log(`    ERROR: ${res.error}`);
    } else {
      console.log(`    Source/Keys: ${res.source || 'ok'} | Keys: ${JSON.stringify(res.dataPreview)}`);
    }
  }
}

run();
