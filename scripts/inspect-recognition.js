const http = require('http');

const date = process.argv[2] || '2026-10-26';
http.get(`http://localhost:3001/api/analytics/recognition?date=${date}`, (res) => {
  let d = '';
  res.on('data', (c) => (d += c));
  res.on('end', () => {
    try {
      const j = JSON.parse(d);
      console.log('HTTP Status:', res.statusCode);
      console.log('Success:', j.success);
      console.log('Target date:', j.data?.target_date);
      console.log('Top scorers count:', j.data?.top_scorers_count);
      console.log('Ticker items count:', j.data?.ticker_items?.length);
      if (j.data?.ticker_items) {
        j.data.ticker_items.forEach((item, i) => {
          console.log(`[Item ${i}]`, {
            type: item.type,
            title: item.title,
            badge: item.badge,
            eyebrow: item.eyebrow,
            subtitle: item.subtitle,
            message: item.message,
            incentive_amount: item.incentive_amount,
            score: item.score,
            target_points: item.target_points,
            achieved_points: item.achieved_points,
            completion_percentage: item.completion_percentage,
            is_target_met: item.is_target_met,
          });
        });
      }
    } catch (e) {
      console.error('Error parsing JSON:', e, d.slice(0, 300));
    }
  });
}).on('error', console.error);
