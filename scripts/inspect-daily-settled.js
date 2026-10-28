const https = require('https');
const token = 'df_admin_secret_token_2026';
const url = `https://app.tarajglobal.com/demandflowbridge/api/v1/incentives/daily.php?date=2026-10-26&token=${token}`;

https.get(url, (res) => {
  let d = '';
  res.on('data', (c) => (d += c));
  res.on('end', () => {
    try {
      const j = JSON.parse(d);
      console.log('Daily status:', res.statusCode, 'success:', j.success);
      console.log('Daily summary:', j.data?.summary);
      console.log('Daily agents count:', j.data?.agents?.length);
      if (j.data?.agents?.length) {
        console.log('First 2 daily agents:', JSON.stringify(j.data.agents.slice(0, 2), null, 2));
      }
    } catch (e) {
      console.error('Error:', e, d.slice(0, 300));
    }
  });
}).on('error', console.error);
