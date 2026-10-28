const http = require('http');

http.get('http://localhost:3000/api/analytics/slide3', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Status:', res.statusCode);
      console.log('Success:', json.success);
      console.log('Source:', json.source);
      console.log('Total QA analysts:', json.data?.total_qa_analysts);
      console.log('QA analysts:');
      const list = json.data?.qa_heatmap || json.data?.qa_analysts || [];
      console.log('List length:', list.length);
      list.forEach(qa => {
        console.log(`- ID: ${qa.user_id}, Name: ${qa.full_name}, Audited: ${qa.total_audited}, Qualified: ${qa.total_qualified}`);
      });
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
      console.log('Raw output:', data.slice(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});
