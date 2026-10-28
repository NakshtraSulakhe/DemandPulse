const fs = require('fs');

const filePath = 'C:\\xampp\\htdocs\\demandflowbridge\\api\\v1\\slides_analytics.php';
let content = fs.readFileSync(filePath, 'utf8');

const targetFunction = `function getSlide3Data(mysqli $conn, string $date, int $intervalMinutes = 10, ?string $shiftStart = null, ?string $shiftEnd = null): array {
    [$sStart, $sEnd] = resolveShiftTimes($conn, $shiftStart, $shiftEnd);
    $intervals = generateTimeIntervals($sStart, $sEnd, $intervalMinutes);

    // Find all active QA analysts
    $qaUsers = [];
    $rs = $conn->query("
        SELECT id, full_name, email, role 
        FROM users 
        WHERE is_active = 1 AND (role LIKE 'qa%' OR role = 'quality_analyst')
        ORDER BY full_name ASC
    ");
    if ($rs) {
        while ($r = $rs->fetch_assoc()) {
            $qaUsers[(int)$r['id']] = [
                'user_id' => (int)$r['id'],
                'full_name' => (string)$r['full_name'],
                'email' => (string)$r['email'],
                'total_qualified' => 0,
                'total_audited' => 0,
                'timeline' => array_fill(0, count($intervals), ['qualified_count' => 0, 'audited_count' => 0])
            ];
        }
    }

    // Also include any user who reviewed leads today (e.g. leads audited by admin/team lead)
    $stmtExtra = $conn->prepare("
        SELECT DISTINCT u.id, u.full_name, u.email, u.role
        FROM qa_audit_logs q
        JOIN users u ON u.id = q.qa_reviewed_by
        WHERE DATE(q.reviewed_at) = ?
    ");
    if ($stmtExtra) {
        $stmtExtra->bind_param('s', $date);
        $stmtExtra->execute();
        $resExtra = $stmtExtra->get_result();
        while ($r = $resExtra->fetch_assoc()) {
            $uid = (int)$r['id'];
            if (!isset($qaUsers[$uid])) {
                $qaUsers[$uid] = [
                    'user_id' => $uid,
                    'full_name' => (string)$r['full_name'],
                    'email' => (string)$r['email'],
                    'total_qualified' => 0,
                    'total_audited' => 0,
                    'timeline' => array_fill(0, count($intervals), ['qualified_count' => 0, 'audited_count' => 0])
                ];
            }
        }
        $stmtExtra->close();
    }

    // Query QA audit logs for the selected date
    $stmtLogs = $conn->prepare("
        SELECT qa_reviewed_by, qa_status, reviewed_at
        FROM qa_audit_logs
        WHERE DATE(reviewed_at) = ? AND qa_reviewed_by IS NOT NULL
        ORDER BY reviewed_at ASC
    ");
    if ($stmtLogs) {
        $stmtLogs->bind_param('s', $date);
        $stmtLogs->execute();
        $resLogs = $stmtLogs->get_result();

        while ($log = $resLogs->fetch_assoc()) {
            $revId = (int)$log['qa_reviewed_by'];
            if (!isset($qaUsers[$revId])) continue;

            $revAt = (string)$log['reviewed_at'];
            $slotIdx = findSlotIndex($revAt, $intervals);

            $isQual = ($log['qa_status'] === 'Qualified');
            $qaUsers[$revId]['total_audited']++;
            if ($isQual) {
                $qaUsers[$revId]['total_qualified']++;
            }

            if ($slotIdx !== null && isset($qaUsers[$revId]['timeline'][$slotIdx])) {
                $qaUsers[$revId]['timeline'][$slotIdx]['audited_count']++;
                if ($isQual) {
                    $qaUsers[$revId]['timeline'][$slotIdx]['qualified_count']++;
                }
            }
        }
        $stmtLogs->close();
    }

    // Flatten timeline array with interval keys for easy rendering
    $formattedQaList = [];
    foreach ($qaUsers as $qa) {
        $slots = [];
        foreach ($intervals as $slot) {
            $idx = $slot['slot_index'];
            $stats = $qa['timeline'][$idx] ?? ['qualified_count' => 0, 'audited_count' => 0];
            $slots[] = [
                'slot_index' => $idx,
                'time_label' => $slot['label'],
                'start_time' => $slot['start_time'],
                'qualified_count' => $stats['qualified_count'],
                'audited_count' => $stats['audited_count']
            ];
        }
        $qa['intervals'] = $slots;
        unset($qa['timeline']);
        $formattedQaList[] = $qa;
    }

    return [
        'date' => $date,
        'shift_start' => $sStart,
        'shift_end' => $sEnd,
        'interval_minutes' => $intervalMinutes,
        'total_intervals' => count($intervals),
        'intervals_meta' => array_map(fn($i) => ['slot_index' => $i['slot_index'], 'label' => $i['label'], 'start_time' => $i['start_time'], 'end_time' => $i['end_time']], $intervals),
        'total_qa_analysts' => count($formattedQaList),
        'qa_heatmap' => $formattedQaList
    ];
}`;

const replacementFunction = `function getSlide3Data(mysqli $conn, string $date, int $intervalMinutes = 10, ?string $shiftStart = null, ?string $shiftEnd = null): array {
    [$sStart, $sEnd] = resolveShiftTimes($conn, $shiftStart, $shiftEnd);
    $intervals = generateTimeIntervals($sStart, $sEnd, $intervalMinutes);

    $qaUsers = [];

    // 1. Gather all actual QA reviewers who performed audits for this date from qa_audit_logs via qa_reviewed_by
    $stmtExtra = $conn->prepare("
        SELECT DISTINCT u.id, u.full_name, u.email, u.role
        FROM qa_audit_logs q
        JOIN users u ON u.id = q.qa_reviewed_by
        WHERE DATE(q.reviewed_at) = ? AND q.qa_reviewed_by IS NOT NULL AND q.qa_reviewed_by > 0
    ");
    if ($stmtExtra) {
        $stmtExtra->bind_param('s', $date);
        $stmtExtra->execute();
        $resExtra = $stmtExtra->get_result();
        while ($r = $resExtra->fetch_assoc()) {
            $uid = (int)$r['id'];
            $qaUsers[$uid] = [
                'user_id' => $uid,
                'full_name' => (string)$r['full_name'],
                'email' => (string)$r['email'],
                'total_qualified' => 0,
                'total_audited' => 0,
                'timeline' => array_fill(0, count($intervals), ['qualified_count' => 0, 'audited_count' => 0])
            ];
        }
        $stmtExtra->close();
    }

    // 2. Also gather actual QA reviewers from leads table where qa_reviewed_by is recorded
    $stmtLeads = $conn->prepare("
        SELECT DISTINCT u.id, u.full_name, u.email, u.role
        FROM leads l
        JOIN users u ON u.id = l.qa_reviewed_by
        WHERE (DATE(l.qa_updated_at) = ? OR (l.qa_updated_at IS NULL AND DATE(l.updated_at) = ?))
          AND l.qa_reviewed_by IS NOT NULL AND l.qa_reviewed_by > 0
    ");
    if ($stmtLeads) {
        $stmtLeads->bind_param('ss', $date, $date);
        $stmtLeads->execute();
        $resLeads = $stmtLeads->get_result();
        while ($r = $resLeads->fetch_assoc()) {
            $uid = (int)$r['id'];
            if (!isset($qaUsers[$uid])) {
                $qaUsers[$uid] = [
                    'user_id' => $uid,
                    'full_name' => (string)$r['full_name'],
                    'email' => (string)$r['email'],
                    'total_qualified' => 0,
                    'total_audited' => 0,
                    'timeline' => array_fill(0, count($intervals), ['qualified_count' => 0, 'audited_count' => 0])
                ];
            }
        }
        $stmtLeads->close();
    }

    // 3. Query QA audit logs for the selected date to populate intervals
    $stmtLogs = $conn->prepare("
        SELECT qa_reviewed_by, qa_status, reviewed_at
        FROM qa_audit_logs
        WHERE DATE(reviewed_at) = ? AND qa_reviewed_by IS NOT NULL AND qa_reviewed_by > 0
        ORDER BY reviewed_at ASC
    ");
    if ($stmtLogs) {
        $stmtLogs->bind_param('s', $date);
        $stmtLogs->execute();
        $resLogs = $stmtLogs->get_result();

        while ($log = $resLogs->fetch_assoc()) {
            $revId = (int)$log['qa_reviewed_by'];
            if (!isset($qaUsers[$revId])) continue;

            $revAt = (string)$log['reviewed_at'];
            $slotIdx = findSlotIndex($revAt, $intervals);

            $isQual = ($log['qa_status'] === 'Qualified');
            $qaUsers[$revId]['total_audited']++;
            if ($isQual) {
                $qaUsers[$revId]['total_qualified']++;
            }

            if ($slotIdx !== null && isset($qaUsers[$revId]['timeline'][$slotIdx])) {
                $qaUsers[$revId]['timeline'][$slotIdx]['audited_count']++;
                if ($isQual) {
                    $qaUsers[$revId]['timeline'][$slotIdx]['qualified_count']++;
                }
            }
        }
        $stmtLogs->close();
    }

    // 4. Also check leads table for any reviews if audit logs had no records for today
    $totalAuditsFromLogs = array_sum(array_column($qaUsers, 'total_audited'));
    if ($totalAuditsFromLogs === 0 && !empty($qaUsers)) {
        $stmtLeadsLogs = $conn->prepare("
            SELECT qa_reviewed_by, qa_status, COALESCE(qa_updated_at, updated_at) AS reviewed_at
            FROM leads
            WHERE (DATE(qa_updated_at) = ? OR (qa_updated_at IS NULL AND DATE(updated_at) = ?))
              AND qa_reviewed_by IS NOT NULL AND qa_reviewed_by > 0
            ORDER BY reviewed_at ASC
        ");
        if ($stmtLeadsLogs) {
            $stmtLeadsLogs->bind_param('ss', $date, $date);
            $stmtLeadsLogs->execute();
            $resLeadsLogs = $stmtLeadsLogs->get_result();
            while ($leadRow = $resLeadsLogs->fetch_assoc()) {
                $revId = (int)$leadRow['qa_reviewed_by'];
                if (!isset($qaUsers[$revId])) continue;

                $revAt = (string)$leadRow['reviewed_at'];
                $slotIdx = findSlotIndex($revAt, $intervals);

                $isQual = ($leadRow['qa_status'] === 'Qualified');
                $qaUsers[$revId]['total_audited']++;
                if ($isQual) {
                    $qaUsers[$revId]['total_qualified']++;
                }

                if ($slotIdx !== null && isset($qaUsers[$revId]['timeline'][$slotIdx])) {
                    $qaUsers[$revId]['timeline'][$slotIdx]['audited_count']++;
                    if ($isQual) {
                        $qaUsers[$revId]['timeline'][$slotIdx]['qualified_count']++;
                    }
                }
            }
            $stmtLeadsLogs->close();
        }
    }

    // Flatten timeline array with interval keys for easy rendering
    $formattedQaList = [];
    foreach ($qaUsers as $qa) {
        $slots = [];
        foreach ($intervals as $slot) {
            $idx = $slot['slot_index'];
            $stats = $qa['timeline'][$idx] ?? ['qualified_count' => 0, 'audited_count' => 0];
            $slots[] = [
                'slot_index' => $idx,
                'time_label' => $slot['label'],
                'start_time' => $slot['start_time'],
                'qualified_count' => $stats['qualified_count'],
                'audited_count' => $stats['audited_count']
            ];
        }
        $qa['intervals'] = $slots;
        unset($qa['timeline']);
        $formattedQaList[] = $qa;
    }

    // Filter out any analyst with 0 audits so unnecessary names are omitted
    $formattedQaList = array_values(array_filter($formattedQaList, fn($qa) => ($qa['total_audited'] ?? 0) > 0));
    // Sort descending by total audited
    usort($formattedQaList, fn($a, $b) => ($b['total_audited'] ?? 0) <=> ($a['total_audited'] ?? 0));

    return [
        'date' => $date,
        'shift_start' => $sStart,
        'shift_end' => $sEnd,
        'interval_minutes' => $intervalMinutes,
        'total_intervals' => count($intervals),
        'intervals_meta' => array_map(fn($i) => ['slot_index' => $i['slot_index'], 'label' => $i['label'], 'start_time' => $i['start_time'], 'end_time' => $i['end_time']], $intervals),
        'total_qa_analysts' => count($formattedQaList),
        'qa_heatmap' => $formattedQaList
    ];
}`;

// Normalize line endings
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = targetFunction.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const updated = normContent.replace(normTarget, replacementFunction.replace(/\r\n/g, '\n'));
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully updated getSlide3Data in slides_analytics.php');
} else {
  console.error('Target function not found for replacement!');
}
