<?php
/**
 * Removes historical CV/CC ledger from linked Log services that MOS has not
 * approved. The approved IDs are an explicit, read-only CRM snapshot passed
 * from MOS at execution time; this worker never treats an absent decision as
 * approval.
 *
 * Default: dry-run (read-only).
 * Usage: php backfill-log-unapproved-ledger.php --approved-ids=ID[,ID...] [--from=YYYY-MM-DD] [--to=YYYY-MM-DD] [--apply]
 */

define('DISABLE_PUSH_NOTIFICATIONS', true);
include __DIR__ . '/../../Server/src/api/1/tool/cli-bootstrap.php';

foreach ([
    __DIR__ . '/../../Server/src/api/1/tool/generate-report-order.php',
    __DIR__ . '/../../Server/src/api/1/tool/generate-report-staff-client-consultant.php',
] as $file) {
    if (!file_exists($file)) continue;
    $content = file_get_contents($file);
    $content = preg_replace('/^include.*cli-bootstrap\\.php.*$/m', '', $content);
    $content = preg_replace('/if \\(basename\\(__FILE__\\).*?\\n\\}/s', '', $content);
    eval('?>' . $content);
}
include __DIR__ . '/OrderRegenerationService.php';

$from = '2026-07-01';
$to = date('Y-m-d');
$apply = in_array('--apply', $argv, true);
$approvedIdsArg = null;
foreach ($argv as $arg) {
    if (strpos($arg, '--from=') === 0) $from = substr($arg, 7);
    if (strpos($arg, '--to=') === 0) $to = substr($arg, 5);
    if (strpos($arg, '--approved-ids=') === 0) $approvedIdsArg = substr($arg, 15);
}
if ($approvedIdsArg === null) {
    die("Refusing to run: --approved-ids from the MOS CRM snapshot is required.\\n");
}
if (!preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $from) || !preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $to)) {
    die("Dates must use YYYY-MM-DD.\\n");
}

$approvedIds = array_values(array_unique(array_filter(array_map('intval', preg_split('/\\s*,\\s*/', trim($approvedIdsArg))), static fn($id) => $id > 0)));
$approvedSql = $approvedIds ? implode(',', $approvedIds) : '0';
$db = $di->get('db');

// A multi-service order is reported but never auto-applied: its unrelated
// services deserve a separate reviewed batch.
$sql = "
    SELECT
      parent_os.id AS origin_order_service_id,
      child_os.id AS log_order_service_id,
      child_o.id AS log_order_id,
      child_ro.actual_booking_date_start AS log_checkin,
      child_ros.servicing_minute + child_ros.cleaning_minute AS duration_minutes,
      (SELECT COUNT(*) FROM order_service same_order WHERE same_order.order_id = child_o.id) AS services_in_order,
      COALESCE(cv.full_name, CONCAT('CV #', child_os.assigned_staff_id)) AS cv_name,
      COALESCE(cc_in.full_name, CONCAT('CC #', child_os.check_in_staff_id)) AS cc_in_name,
      COALESCE(cc_out.full_name, CONCAT('CC #', child_os.check_out_staff_id)) AS cc_out_name,
      COALESCE(SUM(CASE WHEN sb.bonus_type = 'Credit' THEN sb.bonus_amount ELSE 0 END), 0) AS credit,
      COALESCE(SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END), 0) AS bonus_points,
      COALESCE(SUM(CASE WHEN sb.bonus_type = 'Cash' THEN sb.bonus_amount ELSE 0 END), 0) AS cash,
      COALESCE(SUM(CASE WHEN sb.bonus_type = 'Banana' THEN sb.bonus_amount ELSE 0 END), 0) AS banana
    FROM order_service parent_os
    JOIN order_service child_os ON child_os.id = parent_os.next_log_order_service_id
    JOIN `order` child_o ON child_o.id = child_os.order_id AND child_o.order_state = 'Completed'
    JOIN report_order child_ro ON child_ro.order_id = child_o.id
    JOIN report_order_service child_ros ON child_ros.order_service_id = child_os.id
    LEFT JOIN user_profile cv ON cv.user_id = child_os.assigned_staff_id
    LEFT JOIN user_profile cc_in ON cc_in.user_id = child_os.check_in_staff_id
    LEFT JOIN user_profile cc_out ON cc_out.user_id = child_os.check_out_staff_id
    LEFT JOIN staff_bonus sb ON sb.order_service_id = child_os.id
      AND sb.user_id IN (child_os.assigned_staff_id, child_os.check_in_staff_id, child_os.check_out_staff_id)
    WHERE child_ro.actual_booking_date_start >= :from_date
      AND child_ro.actual_booking_date_start < DATE_ADD(:to_date, INTERVAL 1 DAY)
      AND child_os.id NOT IN ($approvedSql)
    GROUP BY parent_os.id, child_os.id, child_o.id, child_ro.actual_booking_date_start,
      child_ros.servicing_minute, child_ros.cleaning_minute, cv.full_name, cc_in.full_name, cc_out.full_name,
      child_os.assigned_staff_id, child_os.check_in_staff_id, child_os.check_out_staff_id
    HAVING credit <> 0 OR bonus_points <> 0 OR cash <> 0 OR banana <> 0
    ORDER BY child_ro.actual_booking_date_start ASC
";
$candidates = $db->fetchAll($sql, \Phalcon\Db\Enum::FETCH_ASSOC, ['from_date' => $from, 'to_date' => $to]);
$autoCandidates = array_values(array_filter($candidates, static fn($item) => (int)$item['services_in_order'] === 1));
$manualCandidates = array_values(array_filter($candidates, static fn($item) => (int)$item['services_in_order'] !== 1));

echo "=== Unapproved Log Ledger Backfill ===\\n";
echo "Mode: " . ($apply ? 'APPLY (approved batch)' : 'DRY-RUN (read-only)') . "\\n";
echo "Window: $from to $to\\n";
echo "MOS Approved IDs excluded: " . ($approvedIds ? implode(', ', $approvedIds) : '(none)') . "\\n";
echo "Auto candidates: " . count($autoCandidates) . " | Manual review: " . count($manualCandidates) . "\\n\\n";
foreach ($candidates as $candidate) {
    $scope = (int)$candidate['services_in_order'] === 1 ? 'AUTO' : 'MANUAL';
    echo sprintf(
        "[%s] Log OS #%s (from #%s) | %sm | order services=%s | Credit %s, Point %s, Cash %s, Banana %s | CV %s | CC %s / %s\\n",
        $scope,
        $candidate['log_order_service_id'],
        $candidate['origin_order_service_id'],
        $candidate['duration_minutes'],
        $candidate['services_in_order'],
        $candidate['credit'],
        $candidate['bonus_points'],
        $candidate['cash'],
        $candidate['banana'],
        $candidate['cv_name'],
        $candidate['cc_in_name'],
        $candidate['cc_out_name']
    );
}

if (!$apply) {
    echo "\\nNo ledger changes made. Re-run with --apply only for an approved batch.\\n";
    exit(0);
}
if ($manualCandidates) {
    throw new \RuntimeException('Refusing apply: one or more Log orders have multiple services and require manual review.');
}

$service = new OrderRegenerationService($di);
$datesToAggregate = [];
foreach ($autoCandidates as $candidate) {
    echo "\\n--- Regenerating unapproved Log order #{$candidate['log_order_id']} (OS #{$candidate['log_order_service_id']}) ---\\n";
    if (!$service->regenerate((int)$candidate['log_order_id'], false, true, $candidate['log_checkin'], false)) {
        throw new \RuntimeException("Log regeneration failed for order #{$candidate['log_order_id']}");
    }
    $datesToAggregate[date('Y-m-d', strtotime($candidate['log_checkin']))] = true;
}
foreach (array_keys($datesToAggregate) as $date) {
    echo "\\n--- Refreshing CC aggregates for $date ---\\n";
    new StaffClientConsultantRunner($di, $date, '');
}
echo "\\nBackfill complete. Re-run dry-run with the same CRM approval snapshot to verify no candidates remain.\\n";
