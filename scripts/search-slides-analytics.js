const fs = require('fs');
const content = fs.readFileSync('C:\\xampp\\htdocs\\demandflowbridge\\api\\v1\\slides_analytics.php', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(425, 545).join('\n'));
