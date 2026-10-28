const fs = require('fs');

const path = 'C:\\xampp\\htdocs\\demandflowbridge\\api\\v1\\slides_analytics.php';
let content = fs.readFileSync(path, 'utf8');

// Replace stmtExtra in getSlide3Data
content = content.replace(
  `        SELECT DISTINCT u.id, u.full_name, u.email, u.role
        FROM qa_audit_logs q
        JOIN users u ON u.id = q.qa_reviewed_by
        WHERE DATE(q.reviewed_at) = ? AND q.qa_reviewed_by IS NOT NULL AND q.qa_reviewed_by > 0`,
  `        SELECT DISTINCT u.id, u.full_name, u.email, u.role
        FROM qa_audit_logs q
        JOIN users u ON u.id = q.qa_reviewed_by
        WHERE DATE(q.reviewed_at) = ? 
          AND q.qa_reviewed_by IS NOT NULL 
          AND q.qa_reviewed_by > 0
          AND (u.department LIKE '%Quality%' OR u.department LIKE '%QA%' OR u.role LIKE 'qa%' OR u.role = 'quality_analyst')
          AND u.id != 99 
          AND u.full_name NOT LIKE '%Sagar%'`
);

// Replace stmtLeads in getSlide3Data
content = content.replace(
  `        SELECT DISTINCT u.id, u.full_name, u.email, u.role
        FROM leads l
        JOIN users u ON u.id = l.qa_reviewed_by
        WHERE (DATE(l.qa_updated_at) = ? OR (l.qa_updated_at IS NULL AND DATE(l.updated_at) = ?))
          AND l.qa_reviewed_by IS NOT NULL AND l.qa_reviewed_by > 0`,
  `        SELECT DISTINCT u.id, u.full_name, u.email, u.role
        FROM leads l
        JOIN users u ON u.id = l.qa_reviewed_by
        WHERE (DATE(l.qa_updated_at) = ? OR (l.qa_updated_at IS NULL AND DATE(l.updated_at) = ?))
          AND l.qa_reviewed_by IS NOT NULL 
          AND l.qa_reviewed_by > 0
          AND (u.department LIKE '%Quality%' OR u.department LIKE '%QA%' OR u.role LIKE 'qa%' OR u.role = 'quality_analyst')
          AND u.id != 99 
          AND u.full_name NOT LIKE '%Sagar%'`
);

// Also filter out any non-QA or Sagar in final array
content = content.replace(
  `    $formattedQaList = array_values(array_filter($formattedQaList, fn($qa) => ($qa['total_audited'] ?? 0) > 0));`,
  `    $formattedQaList = array_values(array_filter($formattedQaList, function($qa) {
        if (($qa['total_audited'] ?? 0) <= 0) return false;
        if (($qa['user_id'] ?? 0) == 99) return false;
        if (stripos($qa['full_name'] ?? '', 'sagar') !== false) return false;
        return true;
    }));`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated slides_analytics.php with strict QA department validation & Sagar exclusion!');
