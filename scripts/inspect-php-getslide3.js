const fs = require('fs');

const path = 'C:\\xampp\\htdocs\\demandflowbridge\\api\\v1\\slides_analytics.php';
const content = fs.readFileSync(path, 'utf8');

const s3Start = content.indexOf('function getSlide3Data');
const s4Start = content.indexOf('function getSlide4Data');

if (s3Start !== -1 && s4Start !== -1) {
  console.log(content.slice(s3Start, s4Start));
} else {
  console.log('Not found');
}
