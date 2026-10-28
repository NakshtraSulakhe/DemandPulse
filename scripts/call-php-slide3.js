const http = require('http');

http.get('http://localhost/demandflowbridge/api/v1/slides_analytics.php?type=slide3&date=2026-10-27&interval=10', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Status:', res.statusCode);
      console.log('Success:', json.success);
      console.log('Total QA analysts in PHP:', json.data?.total_qa_analysts);
      (json.data?.qa_analysts || []).forEach(qa => {
        console.log(`- ID: ${qa.user_id}, Name: ${qa.full_name}, Audited: ${qa.total_audited}, Qualified: ${qa.total_qualified}`);
      });
    } catch (e) {
      console.error('Error parsing PHP response:', e.message);
      console.log(data.slice(0, 500));
    }
  });
}).on('error', err => console.error('PHP API error:', err));
